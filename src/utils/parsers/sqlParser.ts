import { FlowNode, FlowEdge, FlowProject, SqlColumn } from '../../types/flow';
import { layoutGraph } from './layoutEngine';

interface ParsedTable {
  name: string;
  schema?: string;
  columns: SqlColumn[];
  primaryKeys: string[];
}

interface ParsedForeignKey {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn?: string;
  constraintName?: string;
}

/**
 * Enterprise SQL DDL Parser (PostgreSQL, MySQL, SQLite, ANSI SQL)
 * Parses CREATE TABLE and ALTER TABLE statements into relational schema tables and foreign key edges.
 */
export function parseSQL(
  sqlText: string,
  preferredDirection: 'LR' | 'TB' = 'LR'
): FlowProject {
  // 1. Clean SQL comments: single-line -- and multi-line /* ... */
  const cleaned = sqlText
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // 2. Extract CREATE TABLE blocks: CREATE TABLE [IF NOT EXISTS] name (...)
  const tablesMap = new Map<string, ParsedTable>();
  const foreignKeys: ParsedForeignKey[] = [];

  // Regex to match CREATE TABLE [IF NOT EXISTS] table_name ( body );
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([a-zA-Z0-9_"`]+)\.)?([a-zA-Z0-9_"`]+)\s*\(([\s\S]*?)\)\s*(?:;|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(cleaned)) !== null) {
    const schema = match[1] ? match[1].replace(/["`]/g, '') : undefined;
    const tableName = match[2].replace(/["`]/g, '');
    const tableBody = match[3];

    const parsedTable = parseTableColumnsAndConstraints(tableName, tableBody, schema);
    tablesMap.set(tableName.toLowerCase(), parsedTable);

    // Extract inline references from columns
    parsedTable.columns.forEach((col) => {
      if (col.isFk && col.fkTarget) {
        const [targetTable, targetCol] = col.fkTarget.split('.');
        foreignKeys.push({
          fromTable: tableName,
          fromColumn: col.name,
          toTable: targetTable,
          toColumn: targetCol
        });
      }
    });
  }

  // 3. Extract ALTER TABLE ... ADD [CONSTRAINT ...] FOREIGN KEY (col) REFERENCES target(col)
  const alterFkRegex = /ALTER\s+TABLE\s+(?:[a-zA-Z0-9_"`]+\.)?([a-zA-Z0-9_"`]+)\s+ADD\s+(?:CONSTRAINT\s+([a-zA-Z0-9_"`]+)\s+)?FOREIGN\s+KEY\s*\(\s*([a-zA-Z0-9_"`]+)\s*\)\s*REFERENCES\s+([a-zA-Z0-9_"`]+)\s*(?:\(\s*([a-zA-Z0-9_"`]+)\s*\))?/gi;

  while ((match = alterFkRegex.exec(cleaned)) !== null) {
    const fromTable = match[1].replace(/["`]/g, '');
    const constraintName = match[2] ? match[2].replace(/["`]/g, '') : undefined;
    const fromCol = match[3].replace(/["`]/g, '');
    const toTable = match[4].replace(/["`]/g, '');
    const toCol = match[5] ? match[5].replace(/["`]/g, '') : 'id';

    foreignKeys.push({
      fromTable,
      fromColumn: fromCol,
      toTable,
      toColumn: toCol,
      constraintName
    });

    // Mark column as FK in table
    const tbl = tablesMap.get(fromTable.toLowerCase());
    if (tbl) {
      const col = tbl.columns.find((c) => c.name.toLowerCase() === fromCol.toLowerCase());
      if (col) {
        col.isFk = true;
        col.fkTarget = `${toTable}.${toCol}`;
      }
    }
  }

  // 4. Convert Parsed Tables to FlowNode objects
  const rawNodes: FlowNode[] = Array.from(tablesMap.values()).map((tbl) => {
    // Dynamic height based on column count
    const baseHeight = 70;
    const rowHeight = 28;
    const height = Math.ceil(Math.max(120, baseHeight + tbl.columns.length * rowHeight) / 40) * 40;

    return {
      id: tbl.name,
      type: 'sql-table',
      x: 0,
      y: 0,
      width: 240,
      height,
      title: tbl.name,
      subtitle: `${tbl.columns.length} columns`,
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: '#7C3AED',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        headerBg: '#7C3AED',
        headerColor: '#FFFFFF',
        colorPalette: 'purple'
      },
      customData: {
        sqlTableName: tbl.name,
        sqlSchemaName: tbl.schema || 'public',
        sqlColumns: tbl.columns
      }
    };
  });

  // 5. Convert Foreign Keys to FlowEdges
  const rawEdges: FlowEdge[] = foreignKeys.map((fk, idx) => {
    const label = `1:N (${fk.fromColumn} → ${fk.toColumn || 'id'})`;
    return {
      id: `fk-edge-${idx + 1}`,
      fromNodeId: fk.fromTable,
      toNodeId: fk.toTable,
      fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
      toPort: preferredDirection === 'LR' ? 'left' : 'top',
      label,
      lineStyle: 'solid',
      routeType: 'orthogonal',
      color: '#7C3AED',
      width: 2.5,
      arrowhead: 'arrow'
    };
  });

  // 6. Automatically layout the tables and route foreign key edges
  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, {
    direction: preferredDirection,
    nodeSpacingX: 160,
    nodeSpacingY: 70
  });

  return {
    id: `project-sql-${Date.now()}`,
    name: 'Relational Database Schema (ERD)',
    description: 'PostgreSQL / SQL DDL tables, primary keys, and foreign key relationships',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['SQL', 'Database', 'ERD', 'PostgreSQL'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [],
    nodes,
    edges
  };
}

/**
 * Parses the internal body of a CREATE TABLE statement
 */
function parseTableColumnsAndConstraints(
  tableName: string,
  body: string,
  schema?: string
): ParsedTable {
  const columns: SqlColumn[] = [];
  const primaryKeys: string[] = [];

  // Split lines while preserving parenthesis in types like VARCHAR(255), NUMERIC(10,2)
  const lines: string[] = [];
  let currentLine = '';
  let parenDepth = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (char === ',' && parenDepth === 0) {
      lines.push(currentLine.trim());
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Parse each line as column or table constraint
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const upper = line.toUpperCase();

    // Table-level PRIMARY KEY (col1, col2)
    const pkTableMatch = line.match(/^PRIMARY\s+KEY\s*\(\s*(.*?)\s*\)/i);
    if (pkTableMatch) {
      const pks = pkTableMatch[1].split(',').map((p) => p.trim().replace(/["`]/g, ''));
      primaryKeys.push(...pks);
      continue;
    }

    // Table-level FOREIGN KEY (col) REFERENCES target(col)
    const fkTableMatch = line.match(
      /^(?:CONSTRAINT\s+[a-zA-Z0-9_"`]+\s+)?FOREIGN\s+KEY\s*\(\s*([a-zA-Z0-9_"`]+)\s*\)\s*REFERENCES\s+([a-zA-Z0-9_"`]+)\s*(?:\(\s*([a-zA-Z0-9_"`]+)\s*\))?/i
    );
    if (fkTableMatch) {
      const colName = fkTableMatch[1].replace(/["`]/g, '');
      const targetTable = fkTableMatch[2].replace(/["`]/g, '');
      const targetCol = fkTableMatch[3] ? fkTableMatch[3].replace(/["`]/g, '') : 'id';

      const existingCol = columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
      if (existingCol) {
        existingCol.isFk = true;
        existingCol.fkTarget = `${targetTable}.${targetCol}`;
      }
      continue;
    }

    // Table-level UNIQUE or CHECK or CONSTRAINT skip
    if (upper.startsWith('CONSTRAINT') && !upper.includes('FOREIGN KEY') && !upper.includes('PRIMARY KEY')) {
      continue;
    }

    // Column definition: col_name DATA_TYPE [CONSTRAINTS]
    const colTokens = line.split(/\s+/);
    if (colTokens.length < 2) continue;

    const colName = colTokens[0].replace(/["`]/g, '');
    const colType = colTokens[1];

    const isPk = upper.includes('PRIMARY KEY') || colType.toUpperCase() === 'SERIAL' || colType.toUpperCase() === 'BIGSERIAL';
    const isNullable = !upper.includes('NOT NULL') && !isPk;
    const isUnique = upper.includes('UNIQUE');

    // Inline REFERENCES other_table(other_col)
    let isFk = false;
    let fkTarget: string | undefined = undefined;
    const inlineRefMatch = line.match(/REFERENCES\s+([a-zA-Z0-9_"`]+)(?:\s*\(\s*([a-zA-Z0-9_"`]+)\s*\))?/i);
    if (inlineRefMatch) {
      isFk = true;
      const targetTable = inlineRefMatch[1].replace(/["`]/g, '');
      const targetCol = inlineRefMatch[2] ? inlineRefMatch[2].replace(/["`]/g, '') : 'id';
      fkTarget = `${targetTable}.${targetCol}`;
    }

    columns.push({
      name: colName,
      type: colType,
      isPk,
      isFk,
      fkTarget,
      isNullable,
      isUnique
    });
  }

  // Apply table-level primary keys
  primaryKeys.forEach((pkName) => {
    const col = columns.find((c) => c.name.toLowerCase() === pkName.toLowerCase());
    if (col) {
      col.isPk = true;
      col.isNullable = false;
    }
  });

  return {
    name: tableName,
    schema,
    columns,
    primaryKeys
  };
}
