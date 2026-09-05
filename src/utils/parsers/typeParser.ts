import { FlowNode, FlowEdge, FlowProject, SchemaProperty } from '../../types/flow';
import { layoutGraph } from './layoutEngine';

interface ParsedTypeEntity {
  name: string;
  kind: 'typescript' | 'graphql';
  properties: SchemaProperty[];
  referencedTypes: string[];
}

/**
 * TypeScript Interface/Type and GraphQL Schema Parser
 * Parses type contracts into interactive type-schema visual cards and cross-reference edges.
 */
export function parseTypeDefinitions(
  code: string,
  preferredDirection: 'LR' | 'TB' = 'LR'
): FlowProject {
  const clean = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .trim();

  // Check if it's GraphQL or TypeScript
  const isGraphQL = clean.includes('type Query') || clean.includes('type Mutation') || /type\s+[a-zA-Z0-9_]+\s*\{/.test(clean) && !clean.includes('interface');

  if (isGraphQL) {
    return parseGraphQLSchema(clean, preferredDirection);
  }

  return parseTypeScriptDefinitions(clean, preferredDirection);
}

// ----------------------------------------------------
// TYPESCRIPT PARSER
// ----------------------------------------------------
function parseTypeScriptDefinitions(
  code: string,
  preferredDirection: 'LR' | 'TB'
): FlowProject {
  const entitiesMap = new Map<string, ParsedTypeEntity>();

  // Match: (export )?(interface|type) Name (=)? { body }
  const typeRegex = /(?:export\s+)?(interface|type)\s+([a-zA-Z0-9_]+)(?:\s*=\s*)?\s*\{([\s\S]*?)\}/g;

  let match: RegExpExecArray | null;
  while ((match = typeRegex.exec(code)) !== null) {
    const typeName = match[2];
    const body = match[3];

    const properties: SchemaProperty[] = [];
    const referencedTypes: string[] = [];

    // Split properties by ; or newline
    const lines = body.split(/[;\n]/).map((l) => l.trim()).filter(Boolean);

    lines.forEach((line) => {
      // propName(?:)? : propType
      const propMatch = line.match(/^([a-zA-Z0-9_]+)(\?)?\s*:\s*(.*)$/);
      if (propMatch) {
        const propName = propMatch[1];
        const isOptional = !!propMatch[2];
        const propType = propMatch[3].trim();

        properties.push({
          name: propName,
          type: propType,
          required: !isOptional
        });

        // Extract possible type references (Capitalized words in type)
        const refMatches = propType.match(/\b([A-Z][a-zA-Z0-9_]+)\b/g);
        if (refMatches) {
          refMatches.forEach((ref) => {
            if (ref !== 'Date' && ref !== 'Record' && ref !== 'Array' && ref !== 'Promise' && ref !== 'Set' && ref !== 'Map') {
              referencedTypes.push(ref);
            }
          });
        }
      }
    });

    entitiesMap.set(typeName, {
      name: typeName,
      kind: 'typescript',
      properties,
      referencedTypes
    });
  }

  // Create FlowNodes
  const rawNodes: FlowNode[] = Array.from(entitiesMap.values()).map((ent) => {
    const height = Math.ceil(Math.max(120, 68 + ent.properties.length * 26) / 40) * 40;
    return {
      id: ent.name,
      type: 'type-schema',
      x: 0,
      y: 0,
      width: 240,
      height,
      title: ent.name,
      subtitle: `TypeScript Interface (${ent.properties.length} props)`,
      style: {
        bg: '#FFFFFF',
        borderColor: '#3B82F6',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        headerBg: '#3B82F6',
        headerColor: '#FFFFFF',
        colorPalette: 'blue'
      },
      customData: {
        schemaProperties: ent.properties,
        schemaKind: 'typescript'
      }
    };
  });

  // Create Cross-reference FlowEdges
  const rawEdges: FlowEdge[] = [];
  entitiesMap.forEach((ent) => {
    const uniqueRefs = Array.from(new Set(ent.referencedTypes));
    uniqueRefs.forEach((ref) => {
      if (entitiesMap.has(ref) && ref !== ent.name) {
        rawEdges.push({
          id: `ts-ref-${ent.name}-${ref}`,
          fromNodeId: ent.name,
          toNodeId: ref,
          fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
          toPort: preferredDirection === 'LR' ? 'left' : 'top',
          label: 'references',
          lineStyle: 'solid',
          routeType: 'orthogonal',
          color: '#3B82F6',
          width: 2.5,
          arrowhead: 'arrow'
        });
      }
    });
  });

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, {
    direction: preferredDirection,
    nodeSpacingX: 160,
    nodeSpacingY: 60
  });

  return {
    id: `project-types-${Date.now()}`,
    name: 'TypeScript Schema Architecture',
    description: 'Interface contracts, field types, and cross-model references',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['TypeScript', 'Interfaces', 'Types'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}

// ----------------------------------------------------
// GRAPHQL SDL PARSER
// ----------------------------------------------------
function parseGraphQLSchema(
  code: string,
  preferredDirection: 'LR' | 'TB'
): FlowProject {
  const entitiesMap = new Map<string, ParsedTypeEntity>();

  // Match: type|enum|interface Name { body }
  const gqlRegex = /(type|enum|interface)\s+([a-zA-Z0-9_]+)(?:\s+implements\s+[a-zA-Z0-9_,\s]+)?\s*\{([\s\S]*?)\}/g;

  let match: RegExpExecArray | null;
  while ((match = gqlRegex.exec(code)) !== null) {
    const kind = match[1];
    const name = match[2];
    const body = match[3];

    const properties: SchemaProperty[] = [];
    const referencedTypes: string[] = [];

    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);

    if (kind === 'enum') {
      lines.forEach((val) => {
        properties.push({
          name: val,
          type: 'enum value',
          required: true
        });
      });
    } else {
      lines.forEach((line) => {
        const fieldMatch = line.match(/^([a-zA-Z0-9_]+)(?:\(.*?\))?\s*:\s*(.*)$/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const rawType = fieldMatch[2].trim();
          const isRequired = rawType.endsWith('!');

          properties.push({
            name: fieldName,
            type: rawType,
            required: isRequired
          });

          // Check for references
          const cleanRef = rawType.replace(/[!\[\]]/g, '').trim();
          if (cleanRef && !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(cleanRef)) {
            referencedTypes.push(cleanRef);
          }
        }
      });
    }

    entitiesMap.set(name, {
      name,
      kind: 'graphql',
      properties,
      referencedTypes
    });
  }

  const rawNodes: FlowNode[] = Array.from(entitiesMap.values()).map((ent) => {
    const height = Math.ceil(Math.max(120, 68 + ent.properties.length * 26) / 40) * 40;
    return {
      id: ent.name,
      type: 'type-schema',
      x: 0,
      y: 0,
      width: 240,
      height,
      title: ent.name,
      subtitle: `GraphQL Type (${ent.properties.length} fields)`,
      style: {
        bg: '#FFFFFF',
        borderColor: '#EC4899',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        headerBg: '#EC4899',
        headerColor: '#FFFFFF',
        colorPalette: 'pink'
      },
      customData: {
        schemaProperties: ent.properties,
        schemaKind: 'graphql'
      }
    };
  });

  const rawEdges: FlowEdge[] = [];
  entitiesMap.forEach((ent) => {
    const uniqueRefs = Array.from(new Set(ent.referencedTypes));
    uniqueRefs.forEach((ref) => {
      if (entitiesMap.has(ref) && ref !== ent.name) {
        rawEdges.push({
          id: `gql-ref-${ent.name}-${ref}`,
          fromNodeId: ent.name,
          toNodeId: ref,
          fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
          toPort: preferredDirection === 'LR' ? 'left' : 'top',
          label: 'type link',
          lineStyle: 'solid',
          routeType: 'orthogonal',
          color: '#EC4899',
          width: 2.5,
          arrowhead: 'arrow'
        });
      }
    });
  });

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, {
    direction: preferredDirection,
    nodeSpacingX: 160,
    nodeSpacingY: 60
  });

  return {
    id: `project-graphql-${Date.now()}`,
    name: 'GraphQL Schema Architecture',
    description: 'Types, mutations, and query entity connections',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['GraphQL', 'SDL', 'Schema'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}
