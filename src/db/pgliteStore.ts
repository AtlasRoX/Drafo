'use client';

import type { PGlite } from '@electric-sql/pglite';
import { FlowProject, FlowNode, FlowEdge, FlowSection } from '../types/flow';

const PGLITE_DB_NAME = 'idb://drafo-pglite-v1';
const LEGACY_STORAGE_KEY = 'drafo_projects_store';
const MIGRATED_BACKUP_KEY = 'drafo_projects_migrated_backup';

let dbInstance: PGlite | null = null;
let dbInitPromise: Promise<PGlite | null> | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  canvas_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  details TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT,
  metric TEXT,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_data JSONB,
  icon TEXT,
  section_id TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id, project_id)
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  from_port TEXT NOT NULL,
  to_port TEXT NOT NULL,
  label TEXT DEFAULT '',
  step_number TEXT,
  line_style TEXT NOT NULL DEFAULT 'solid',
  route_type TEXT NOT NULL DEFAULT 'curved',
  color TEXT NOT NULL DEFAULT '#000000',
  width NUMERIC NOT NULL DEFAULT 1.5,
  arrowhead TEXT NOT NULL DEFAULT 'arrow',
  bidirectional BOOLEAN DEFAULT FALSE,
  is_animated BOOLEAN DEFAULT FALSE,
  latency TEXT,
  control_point JSONB,
  PRIMARY KEY (id, project_id)
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  color TEXT,
  x NUMERIC,
  y NUMERIC NOT NULL,
  pill_bg TEXT NOT NULL,
  pill_text_color TEXT NOT NULL,
  pill_border_color TEXT NOT NULL,
  has_divider BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id, project_id)
);

CREATE TABLE IF NOT EXISTS project_history (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_ui_preferences (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS export_cache (
  project_id TEXT PRIMARY KEY,
  format TEXT NOT NULL,
  cached_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_edges_project ON edges(project_id);
CREATE INDEX IF NOT EXISTS idx_sections_project ON sections(project_id);
`;

export type TableClassification = 'COLLABORATIVE' | 'LOCAL' | 'DERIVED' | 'CACHE';

export const TABLE_CLASSIFICATIONS: Record<string, TableClassification> = {
  projects: 'COLLABORATIVE',
  nodes: 'COLLABORATIVE',
  edges: 'COLLABORATIVE',
  sections: 'COLLABORATIVE',
  project_history: 'DERIVED',
  local_ui_preferences: 'LOCAL',
  export_cache: 'CACHE'
};

let hasDbLock = false;

/**
 * Execute an operation under multi-tab mutual exclusion via Web Locks API
 */
export async function withDatabaseLock<T>(callback: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('drafo-pglite-lock', async () => {
      hasDbLock = true;
      try {
        return await callback();
      } finally {
        hasDbLock = false;
      }
    });
  }
  return callback();
}

/**
 * Initialize PGlite with IndexedDB persistence in the browser.
 * Falls back to in-memory mode if IndexedDB is blocked.
 */
export async function getPGlite(): Promise<PGlite | null> {
  if (typeof window === 'undefined') return null;
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const { PGlite } = await import('@electric-sql/pglite');
      let pg: PGlite;

      try {
        pg = new PGlite(PGLITE_DB_NAME);
        await pg.waitReady;
      } catch (idbErr) {
        console.warn('IndexedDB PGlite init failed, falling back to memory PGlite:', idbErr);
        pg = new PGlite();
        await pg.waitReady;
      }

      // Execute schema definition
      await pg.exec(SCHEMA_SQL);

      // Migration for existing local databases
      try {
        await pg.exec('ALTER TABLE edges ADD COLUMN IF NOT EXISTS control_point JSONB;');
      } catch {
        // column may already exist
      }

      dbInstance = pg;

      // Auto-migrate legacy localStorage projects if DB is empty
      await autoMigrateFromLocalStorage(pg);

      return pg;
    } catch (err) {
      console.error('Fatal error initializing PGlite:', err);
      return null;
    }
  })();

  return dbInitPromise;
}

/**
 * Detect existing projects in localStorage and migrate them into PostgreSQL.
 */
async function autoMigrateFromLocalStorage(pg: PGlite): Promise<void> {
  try {
    const existing = await pg.query<{ count: string }>('SELECT COUNT(*) as count FROM projects;');
    const count = parseInt(existing.rows[0]?.count || '0', 10);

    if (count === 0 && typeof window !== 'undefined') {
      const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (rawLegacy) {
        const parsed: FlowProject[] = JSON.parse(rawLegacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Migrating ${parsed.length} projects from localStorage to PGlite PostgreSQL...`);

          for (const project of parsed) {
            await saveProjectInternal(pg, project);
          }

          // Keep a backup of legacy storage before clearing
          window.localStorage.setItem(MIGRATED_BACKUP_KEY, rawLegacy);
          console.log('PGlite PostgreSQL migration completed successfully!');
        }
      }
    }
  } catch (err) {
    console.error('Auto-migration to PGlite failed:', err);
  }
}

/**
 * Internal transactional project save in PostgreSQL
 */
async function saveProjectInternal(pg: PGlite, project: FlowProject): Promise<void> {
  await pg.transaction(async (tx) => {
    // 1. Upsert project
    await tx.query(
      `INSERT INTO projects (id, name, description, version, updated_at, tags, canvas_settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         version = EXCLUDED.version,
         updated_at = EXCLUDED.updated_at,
         tags = EXCLUDED.tags,
         canvas_settings = EXCLUDED.canvas_settings;`,
      [
        project.id,
        project.name,
        project.description || '',
        project.version || '1.0.0',
        project.updatedAt || new Date().toISOString(),
        project.tags || [],
        JSON.stringify(project.canvasSettings || {})
      ]
    );

    // 2. Refresh nodes
    await tx.query('DELETE FROM nodes WHERE project_id = $1;', [project.id]);
    for (const node of project.nodes) {
      await tx.query(
        `INSERT INTO nodes (
           id, project_id, type, title, subtitle, details, tags, status, metric,
           x, y, width, height, style, custom_data, icon, section_id, is_locked
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17, $18);`,
        [
          node.id,
          project.id,
          node.type,
          node.title,
          node.subtitle || null,
          node.details || null,
          node.tags || [],
          node.status || null,
          node.metric || null,
          node.x,
          node.y,
          node.width,
          node.height,
          JSON.stringify(node.style || {}),
          node.customData ? JSON.stringify(node.customData) : null,
          node.icon || null,
          node.sectionId || null,
          node.isLocked || false
        ]
      );
    }

    // 3. Refresh edges
    await tx.query('DELETE FROM edges WHERE project_id = $1;', [project.id]);
    for (const edge of project.edges) {
      await tx.query(
        `INSERT INTO edges (
           id, project_id, from_node_id, to_node_id, from_port, to_port, label, step_number,
           line_style, route_type, color, width, arrowhead, bidirectional, is_animated, latency, control_point
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`,
        [
          edge.id,
          project.id,
          edge.fromNodeId,
          edge.toNodeId,
          edge.fromPort,
          edge.toPort,
          edge.label || '',
          edge.stepNumber ? String(edge.stepNumber) : null,
          edge.lineStyle || 'solid',
          edge.routeType || 'curved',
          edge.color || '#000000',
          edge.width || 1.5,
          edge.arrowhead || 'arrow',
          edge.bidirectional || false,
          edge.isAnimated || false,
          edge.latency || null,
          edge.controlPoint ? JSON.stringify(edge.controlPoint) : null
        ]
      );
    }

    // 4. Refresh sections
    await tx.query('DELETE FROM sections WHERE project_id = $1;', [project.id]);
    for (const section of project.sections) {
      await tx.query(
        `INSERT INTO sections (
           id, project_id, number, title, subtitle, color, x, y,
           pill_bg, pill_text_color, pill_border_color, has_divider, is_locked
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          section.id,
          project.id,
          section.number,
          section.title,
          section.subtitle || null,
          section.color || null,
          section.x ?? null,
          section.y,
          section.pillBg,
          section.pillTextColor,
          section.pillBorderColor,
          section.hasDivider ?? true,
          section.isLocked || false
        ]
      );
    }
  });
}

/**
 * Save a project to PGlite PostgreSQL.
 * Also keeps localStorage updated as a synchronous warm cache.
 */
export async function saveProject(project: FlowProject): Promise<void> {
  // Update localStorage warm cache
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const list: FlowProject[] = raw ? JSON.parse(raw) : [];
      const updated = list.some((p) => p.id === project.id)
        ? list.map((p) => (p.id === project.id ? project : p))
        : [project, ...list];
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }

  const pg = await getPGlite();
  if (!pg) return;

  await saveProjectInternal(pg, project);
}

/**
 * Load all projects from PGlite PostgreSQL.
 */
export async function loadAllProjects(): Promise<FlowProject[]> {
  const pg = await getPGlite();
  if (!pg) {
    // Fallback to localStorage if PGlite is unavailable
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
    return [];
  }

  try {
    const projResult = await pg.query<{
      id: string;
      name: string;
      description: string;
      version: string;
      updated_at: string;
      tags: string[];
      canvas_settings: any;
    }>('SELECT * FROM projects ORDER BY updated_at DESC;');

    const projects: FlowProject[] = [];

    for (const row of projResult.rows) {
      const nodesResult = await pg.query<any>(
        'SELECT * FROM nodes WHERE project_id = $1;',
        [row.id]
      );
      const edgesResult = await pg.query<any>(
        'SELECT * FROM edges WHERE project_id = $1;',
        [row.id]
      );
      const sectionsResult = await pg.query<any>(
        'SELECT * FROM sections WHERE project_id = $1;',
        [row.id]
      );

      const nodes: FlowNode[] = nodesResult.rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        subtitle: n.subtitle || undefined,
        details: n.details || undefined,
        tags: n.tags || [],
        status: n.status || undefined,
        metric: n.metric || undefined,
        x: parseFloat(n.x),
        y: parseFloat(n.y),
        width: parseFloat(n.width),
        height: parseFloat(n.height),
        style: typeof n.style === 'string' ? JSON.parse(n.style) : n.style,
        customData: n.custom_data
          ? typeof n.custom_data === 'string'
            ? JSON.parse(n.custom_data)
            : n.custom_data
          : undefined,
        icon: n.icon || undefined,
        sectionId: n.section_id || undefined,
        isLocked: !!n.is_locked
      }));

      const edges: FlowEdge[] = edgesResult.rows.map((e) => ({
        id: e.id,
        fromNodeId: e.from_node_id,
        toNodeId: e.to_node_id,
        fromPort: e.from_port,
        toPort: e.to_port,
        label: e.label || '',
        stepNumber: e.step_number || undefined,
        lineStyle: e.line_style,
        routeType: e.route_type,
        color: e.color,
        width: parseFloat(e.width),
        arrowhead: e.arrowhead,
        bidirectional: !!e.bidirectional,
        isAnimated: !!e.is_animated,
        latency: e.latency || undefined,
        controlPoint: e.control_point
          ? typeof e.control_point === 'string'
            ? JSON.parse(e.control_point)
            : e.control_point
          : undefined
      }));

      const sections: FlowSection[] = sectionsResult.rows.map((s) => ({
        id: s.id,
        number: s.number,
        title: s.title,
        subtitle: s.subtitle || undefined,
        color: s.color || undefined,
        x: s.x !== null ? parseFloat(s.x) : undefined,
        y: parseFloat(s.y),
        pillBg: s.pill_bg,
        pillTextColor: s.pill_text_color,
        pillBorderColor: s.pill_border_color,
        hasDivider: s.has_divider,
        isLocked: !!s.is_locked
      }));

      projects.push({
        id: row.id,
        name: row.name,
        description: row.description || '',
        version: row.version || '1.0.0',
        updatedAt: row.updated_at,
        tags: row.tags || [],
        canvasSettings:
          typeof row.canvas_settings === 'string'
            ? JSON.parse(row.canvas_settings)
            : row.canvas_settings || {},
        sections,
        nodes,
        edges
      });
    }

    return projects;
  } catch (err) {
    console.error('Failed to load projects from PGlite:', err);
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
    return [];
  }
}

/**
 * Delete a project and cascade delete all its child elements.
 */
export async function deleteProject(projectId: string): Promise<void> {
  const pg = await getPGlite();
  if (pg) {
    await pg.query('DELETE FROM projects WHERE id = $1;', [projectId]);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const list: FlowProject[] = JSON.parse(raw);
        const filtered = list.filter((p) => p.id !== projectId);
        window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Rename a project in PGlite.
 */
export async function renameProject(projectId: string, newName: string): Promise<void> {
  const pg = await getPGlite();
  if (pg) {
    await pg.query('UPDATE projects SET name = $1, updated_at = NOW() WHERE id = $2;', [
      newName,
      projectId
    ]);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const list: FlowProject[] = JSON.parse(raw);
        const updated = list.map((p) =>
          p.id === projectId ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
        );
        window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Retrieve database diagnostics and table counts.
 */
export async function getDatabaseDiagnostics(): Promise<{
  isReady: boolean;
  engine: string;
  projectCount: number;
  nodeCount: number;
  edgeCount: number;
  version: string;
}> {
  const pg = await getPGlite();
  if (!pg) {
    return {
      isReady: false,
      engine: 'localStorage Fallback',
      projectCount: 0,
      nodeCount: 0,
      edgeCount: 0,
      version: 'N/A'
    };
  }

  try {
    const pCount = await pg.query<{ count: string }>('SELECT COUNT(*) as count FROM projects;');
    const nCount = await pg.query<{ count: string }>('SELECT COUNT(*) as count FROM nodes;');
    const eCount = await pg.query<{ count: string }>('SELECT COUNT(*) as count FROM edges;');
    const ver = await pg.query<{ version: string }>('SELECT version();');

    return {
      isReady: true,
      engine: 'PGlite Embedded PostgreSQL (IndexedDB)',
      projectCount: parseInt(pCount.rows[0]?.count || '0', 10),
      nodeCount: parseInt(nCount.rows[0]?.count || '0', 10),
      edgeCount: parseInt(eCount.rows[0]?.count || '0', 10),
      version: ver.rows[0]?.version || 'PostgreSQL 16 WASM'
    };
  } catch (err) {
    console.error('Error fetching PGlite stats:', err);
    return {
      isReady: false,
      engine: 'PGlite Error',
      projectCount: 0,
      nodeCount: 0,
      edgeCount: 0,
      version: 'N/A'
    };
  }
}

/**
 * Export complete database as a PostgreSQL SQL dump file.
 */
export async function exportDatabaseToSql(): Promise<string> {
  const projects = await loadAllProjects();
  let sql = `-- Drafo Architecture Studio PostgreSQL Database Dump\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- Engine: PGlite Embedded PostgreSQL (WebAssembly)\n\n`;

  sql += SCHEMA_SQL + '\n\n';

  for (const p of projects) {
    const pName = p.name.replace(/'/g, "''");
    const pDesc = (p.description || '').replace(/'/g, "''");
    const pSettings = JSON.stringify(p.canvasSettings || {}).replace(/'/g, "''");
    const pTags = `{${(p.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;

    sql += `INSERT INTO projects (id, name, description, version, updated_at, tags, canvas_settings)\n`;
    sql += `VALUES ('${p.id}', '${pName}', '${pDesc}', '${p.version || '1.0.0'}', '${p.updatedAt}', '${pTags}', '${pSettings}'::jsonb)\n`;
    sql += `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n\n`;

    for (const n of p.nodes) {
      const title = n.title.replace(/'/g, "''");
      const sub = (n.subtitle || '').replace(/'/g, "''");
      const style = JSON.stringify(n.style || {}).replace(/'/g, "''");
      const customData = n.customData ? `'${JSON.stringify(n.customData).replace(/'/g, "''")}'::jsonb` : 'NULL';

      sql += `INSERT INTO nodes (id, project_id, type, title, subtitle, x, y, width, height, style, custom_data, is_locked)\n`;
      sql += `VALUES ('${n.id}', '${p.id}', '${n.type}', '${title}', '${sub}', ${n.x}, ${n.y}, ${n.width}, ${n.height}, '${style}'::jsonb, ${customData}, ${n.isLocked ? 'TRUE' : 'FALSE'});\n`;
    }

    for (const e of p.edges) {
      const label = (e.label || '').replace(/'/g, "''");
      sql += `INSERT INTO edges (id, project_id, from_node_id, to_node_id, from_port, to_port, label, line_style, route_type, color, width, arrowhead, bidirectional, is_animated)\n`;
      sql += `VALUES ('${e.id}', '${p.id}', '${e.fromNodeId}', '${e.toNodeId}', '${e.fromPort}', '${e.toPort}', '${label}', '${e.lineStyle}', '${e.routeType}', '${e.color}', ${e.width}, '${e.arrowhead}', ${e.bidirectional ? 'TRUE' : 'FALSE'}, ${e.isAnimated ? 'TRUE' : 'FALSE'});\n`;
    }

    for (const s of p.sections) {
      const title = s.title.replace(/'/g, "''");
      const sub = (s.subtitle || '').replace(/'/g, "''");
      sql += `INSERT INTO sections (id, project_id, number, title, subtitle, y, pill_bg, pill_text_color, pill_border_color, has_divider, is_locked)\n`;
      sql += `VALUES ('${s.id}', '${p.id}', '${s.number}', '${title}', '${sub}', ${s.y}, '${s.pillBg}', '${s.pillTextColor}', '${s.pillBorderColor}', ${s.hasDivider ? 'TRUE' : 'FALSE'}, ${s.isLocked ? 'TRUE' : 'FALSE'});\n`;
    }

    sql += '\n';
  }

  return sql;
}
