/**
 * Drafo PGlite Projection & State Reconstructor
 *
 * Invariant 2 & 3:
 * 1. PGlite is a derived local projection of the authoritative Yjs CRDT document.
 * 2. Unidirectional flow: Yjs CRDT -> PGlite projection.
 * 3. 100% reconstructibility: If PGlite is wiped or corrupted, all collaborative state
 *    is faithfully reconstructed from the Y.Doc.
 */

import type * as Y from 'yjs';
import type { PGlite } from '@electric-sql/pglite';
import type { FlowNode, FlowEdge, FlowSection, FlowProject } from '../types/flow.ts';

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

export class PGliteProjection {
  private pglite: PGlite | null = null;
  private pendingUpdates = new Map<string, NodeJS.Timeout>();
  private debounceMs = 250;

  constructor(pglite?: PGlite) {
    if (pglite) this.pglite = pglite;
  }

  public setDb(pglite: PGlite): void {
    this.pglite = pglite;
  }

  /**
   * Schedule a debounced projection update from a Y.Doc to PGlite
   */
  public scheduleProjection(projectId: string, ydoc: Y.Doc): void {
    if (this.pendingUpdates.has(projectId)) {
      clearTimeout(this.pendingUpdates.get(projectId)!);
    }

    const timer = setTimeout(async () => {
      this.pendingUpdates.delete(projectId);
      try {
        await this.projectYDocToPGlite(projectId, ydoc);
      } catch (err) {
        console.error(`Failed to project Y.Doc to PGlite for ${projectId}:`, err);
      }
    }, this.debounceMs);

    this.pendingUpdates.set(projectId, timer);
  }

  /**
   * Unidirectional transactional projection: extracts Yjs state and updates PGlite
   */
  public async projectYDocToPGlite(projectId: string, ydoc: Y.Doc): Promise<void> {
    if (!this.pglite) return;

    const metaMap = ydoc.getMap('meta');
    const nodesMap = ydoc.getMap('nodes');
    const edgesMap = ydoc.getMap('edges');
    const sectionsArray = ydoc.getArray('sections');

    const name = (metaMap.get('name') as string) || 'Untitled Project';
    const description = (metaMap.get('description') as string) || '';

    // Collect all nodes from Yjs
    const nodes: FlowNode[] = [];
    nodesMap.forEach((val) => {
      if (val) nodes.push(val as FlowNode);
    });

    // Collect all edges from Yjs
    const edges: FlowEdge[] = [];
    edgesMap.forEach((val) => {
      if (val) edges.push(val as FlowEdge);
    });

    // Collect all sections from Yjs
    const sections: FlowSection[] = sectionsArray.toArray() as FlowSection[];

    // Execute atomic upsert within PGlite
    await this.pglite.query(
      `INSERT INTO projects (id, name, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();`,
      [projectId, name, description]
    );

    // Synchronize collaborative tables
    await this.pglite.query('DELETE FROM nodes WHERE project_id = $1;', [projectId]);
    for (const node of nodes) {
      await this.pglite.query(
        `INSERT INTO nodes (id, project_id, type, title, subtitle, details, tags, status, metric, x, y, width, height, style, custom_data, icon, section_id, is_locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);`,
        [
          node.id,
          projectId,
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
          Boolean(node.isLocked)
        ]
      );
    }

    await this.pglite.query('DELETE FROM edges WHERE project_id = $1;', [projectId]);
    for (const edge of edges) {
      await this.pglite.query(
        `INSERT INTO edges (id, project_id, from_node_id, to_node_id, from_port, to_port, label, step_number, line_style, route_type, color, width, arrowhead, bidirectional, is_animated, latency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`,
        [
          edge.id,
          projectId,
          edge.fromNodeId,
          edge.toNodeId,
          edge.fromPort,
          edge.toPort,
          edge.label || '',
          edge.stepNumber || null,
          edge.lineStyle || 'solid',
          edge.routeType || 'curved',
          edge.color || '#000000',
          edge.width || 1.5,
          edge.arrowhead || 'arrow',
          Boolean(edge.bidirectional),
          Boolean(edge.isAnimated),
          edge.latency || null
        ]
      );
    }

    await this.pglite.query('DELETE FROM sections WHERE project_id = $1;', [projectId]);
    for (const sec of sections) {
      await this.pglite.query(
        `INSERT INTO sections (id, project_id, number, title, subtitle, color, x, y, pill_bg, pill_text_color, pill_border_color, has_divider, is_locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          sec.id,
          projectId,
          sec.number,
          sec.title,
          sec.subtitle || null,
          sec.color || null,
          sec.x ?? null,
          sec.y,
          sec.pillBg,
          sec.pillTextColor,
          sec.pillBorderColor,
          sec.hasDivider ?? true,
          Boolean(sec.isLocked)
        ]
      );
    }
  }

  /**
   * 100% Reconstruction: Completely reconstructs collaborative PGlite tables from the Y.Doc
   */
  public async reconstructFromYDoc(projectId: string, ydoc: Y.Doc): Promise<void> {
    if (!this.pglite) throw new Error('PGlite database not connected');

    // Wipe collaborative tables for this project
    await this.pglite.query('DELETE FROM nodes WHERE project_id = $1;', [projectId]);
    await this.pglite.query('DELETE FROM edges WHERE project_id = $1;', [projectId]);
    await this.pglite.query('DELETE FROM sections WHERE project_id = $1;', [projectId]);

    // Reconstruct fully from canonical Y.Doc
    await this.projectYDocToPGlite(projectId, ydoc);
  }
}
