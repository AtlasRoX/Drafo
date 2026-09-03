import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { PGlite } from '@electric-sql/pglite';
import { PGliteProjection } from '../../src/collaboration/PGliteProjection.ts';

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
`;

test('PGliteProjection: Unidirectional projection and 100% reconstruction from canonical Y.Doc', async () => {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(SCHEMA_SQL);

  const projection = new PGliteProjection(pg);
  const projectId = 'proj-recon-test';

  // 1. Populate canonical Y.Doc
  const ydoc = new Y.Doc();
  const metaMap = ydoc.getMap('meta');
  metaMap.set('name', 'Distributed Architecture');
  metaMap.set('description', 'Microservices blueprint');

  const nodesMap = ydoc.getMap('nodes');
  nodesMap.set('node-1', {
    id: 'node-1',
    type: 'service',
    title: 'API Gateway',
    x: 100,
    y: 150,
    width: 240,
    height: 120,
    style: { theme: 'blue' },
    isLocked: false
  });
  nodesMap.set('node-2', {
    id: 'node-2',
    type: 'database',
    title: 'User DB',
    x: 450,
    y: 150,
    width: 220,
    height: 110,
    style: { theme: 'green' },
    isLocked: false
  });

  const edgesMap = ydoc.getMap('edges');
  edgesMap.set('edge-1', {
    id: 'edge-1',
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    fromPort: 'right',
    toPort: 'left',
    label: 'gRPC calls',
    lineStyle: 'solid',
    routeType: 'curved',
    color: '#2563EB',
    width: 2,
    arrowhead: 'arrow',
    bidirectional: false,
    isAnimated: true
  });

  const sectionsArray = ydoc.getArray('sections');
  sectionsArray.push([
    {
      id: 'sec-1',
      number: '01',
      title: 'Ingress Tier',
      y: 80,
      pillBg: '#EFF6FF',
      pillTextColor: '#1D4ED8',
      pillBorderColor: '#BFDBFE',
      hasDivider: true,
      isLocked: false
    }
  ]);

  // 2. Project Y.Doc -> PGlite
  await projection.projectYDocToPGlite(projectId, ydoc);

  // 3. Verify projection in PGlite
  const pResult = await pg.query<{ name: string }>('SELECT name FROM projects WHERE id = $1;', [projectId]);
  assert.equal(pResult.rows[0].name, 'Distributed Architecture');

  const nResult = await pg.query<{ cnt: string | number }>('SELECT count(*) as cnt FROM nodes WHERE project_id = $1;', [projectId]);
  assert.equal(Number(nResult.rows[0].cnt), 2);

  const eResult = await pg.query<{ cnt: string | number }>('SELECT count(*) as cnt FROM edges WHERE project_id = $1;', [projectId]);
  assert.equal(Number(eResult.rows[0].cnt), 1);

  const sResult = await pg.query<{ cnt: string | number }>('SELECT count(*) as cnt FROM sections WHERE project_id = $1;', [projectId]);
  assert.equal(Number(sResult.rows[0].cnt), 1);

  // 4. SIMULATE DISASTER: Wipe all collaborative tables in PGlite!
  await pg.query('DELETE FROM nodes WHERE project_id = $1;', [projectId]);
  await pg.query('DELETE FROM edges WHERE project_id = $1;', [projectId]);
  await pg.query('DELETE FROM sections WHERE project_id = $1;', [projectId]);

  const wipeCheck = await pg.query<{ cnt: string | number }>('SELECT count(*) as cnt FROM nodes WHERE project_id = $1;', [projectId]);
  assert.equal(Number(wipeCheck.rows[0].cnt), 0, 'Nodes must be 0 after wipe');

  // 5. RECONSTRUCT: 100% reconstruction directly from canonical Y.Doc
  await projection.reconstructFromYDoc(projectId, ydoc);

  // 6. Assert all collaborative data is faithfully restored!
  const restoredNodes = await pg.query<{ id: string; title: string; x: string; y: string }>(
    'SELECT id, title, x, y FROM nodes WHERE project_id = $1 ORDER BY id;',
    [projectId]
  );
  assert.equal(restoredNodes.rows.length, 2);
  assert.equal(restoredNodes.rows[0].title, 'API Gateway');
  assert.equal(Number(restoredNodes.rows[0].x), 100);
  assert.equal(Number(restoredNodes.rows[0].y), 150);
  assert.equal(restoredNodes.rows[1].title, 'User DB');

  const restoredEdges = await pg.query<{ id: string; label: string }>(
    'SELECT id, label FROM edges WHERE project_id = $1;',
    [projectId]
  );
  assert.equal(restoredEdges.rows.length, 1);
  assert.equal(restoredEdges.rows[0].label, 'gRPC calls');

  const restoredSections = await pg.query<{ id: string; title: string }>(
    'SELECT id, title FROM sections WHERE project_id = $1;',
    [projectId]
  );
  assert.equal(restoredSections.rows.length, 1);
  assert.equal(restoredSections.rows[0].title, 'Ingress Tier');

  await pg.close();
});
