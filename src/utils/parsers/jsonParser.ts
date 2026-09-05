import { FlowNode, FlowEdge, FlowProject } from '../../types/flow';
import { layoutGraph } from './layoutEngine';

/**
 * Arbitrary JSON & JSON Schema Parser
 * Supports:
 * 1. JSON Schema Contracts (properties, types, required flags)
 * 2. Nested Relational Entities (API payloads, Stripe responses, configs)
 * 3. Hierarchical Object Trees
 */
export function parseJSON(
  jsonText: string,
  preferredDirection: 'LR' | 'TB' = 'LR'
): FlowProject {
  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }

  // 1. Detect if it's a JSON Schema
  if (data && typeof data === 'object' && (data.$schema || (data.properties && data.type === 'object'))) {
    return parseJsonSchema(data, preferredDirection);
  }

  // 2. Parse as arbitrary JSON Data (Entity / Tree Graph)
  return parseJsonData(data, preferredDirection);
}

// ----------------------------------------------------
// JSON SCHEMA PARSER
// ----------------------------------------------------
function parseJsonSchema(schema: any, preferredDirection: 'LR' | 'TB'): FlowProject {
  const title = schema.title || 'JsonSchemaRoot';
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  let nodeCounter = 1;

  function traverseSchema(obj: any, name: string, parentId?: string) {
    const currentId = `schema-node-${nodeCounter++}`;
    const props = obj.properties || {};
    const requiredKeys = new Set<string>(Array.isArray(obj.required) ? obj.required : []);

    const schemaProperties = Object.keys(props).map((key) => {
      const propDef = props[key];
      let type = propDef.type || 'any';
      if (propDef.enum) type = propDef.enum.map((e: any) => JSON.stringify(e)).join(' | ');
      if (propDef.format) type = `${type} (${propDef.format})`;

      return {
        name: key,
        type,
        required: requiredKeys.has(key),
        description: propDef.description
      };
    });

    const height = Math.ceil(Math.max(120, 70 + schemaProperties.length * 26) / 40) * 40;

    nodes.push({
      id: currentId,
      type: 'type-schema',
      x: 0,
      y: 0,
      width: 240,
      height,
      title: name,
      subtitle: `JSON Schema (${schemaProperties.length} fields)`,
      style: {
        bg: '#FFFFFF',
        borderColor: '#0284C7',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        headerBg: '#0284C7',
        headerColor: '#FFFFFF',
        colorPalette: 'cyan'
      },
      customData: {
        schemaProperties,
        schemaKind: 'jsonschema',
        jsonData: obj
      }
    });

    if (parentId) {
      edges.push({
        id: `schema-edge-${edges.length + 1}`,
        fromNodeId: parentId,
        toNodeId: currentId,
        fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
        toPort: preferredDirection === 'LR' ? 'left' : 'top',
        label: name,
        lineStyle: 'solid',
        routeType: 'orthogonal',
        color: '#0284C7',
        width: 2.5,
        arrowhead: 'arrow'
      });
    }

    // Traverse nested objects
    Object.keys(props).forEach((key) => {
      const propDef = props[key];
      if (propDef.type === 'object' && propDef.properties) {
        traverseSchema(propDef, `${name}.${key}`, currentId);
      }
    });
  }

  traverseSchema(schema, title);

  const { nodes: positionedNodes, edges: routedEdges } = layoutGraph(nodes, edges, {
    direction: preferredDirection
  });

  return {
    id: `project-json-schema-${Date.now()}`,
    name: `${title} Schema Visualizer`,
    description: 'Interactive JSON Schema contract and validation visualizer',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['JSON Schema', 'Types', 'Contract'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes: positionedNodes,
    edges: routedEdges
  };
}

// ----------------------------------------------------
// ARBITRARY JSON DATA PARSER
// ----------------------------------------------------
function parseJsonData(rootData: any, preferredDirection: 'LR' | 'TB'): FlowProject {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let nodeCounter = 1;

  function processEntity(
    value: any,
    label: string,
    parentId?: string,
    edgeLabel?: string
  ): string {
    const nodeId = `json-node-${nodeCounter++}`;

    if (value === null || typeof value !== 'object') {
      // Primitive node
      nodes.push({
        id: nodeId,
        type: 'json-viewer',
        x: 0,
        y: 0,
        width: 200,
        height: 80,
        title: label,
        subtitle: String(value),
        style: {
          bg: '#FFFFFF',
          borderColor: '#10B981',
          borderWidth: 1.5,
          borderRadius: 8,
          textColor: '#0F172A',
          subtextColor: '#10B981',
          colorPalette: 'green'
        },
        customData: {
          jsonData: value
        }
      });
    } else if (Array.isArray(value)) {
      // Array node
      const height = Math.ceil(Math.min(280, Math.max(120, 60 + value.length * 24)) / 40) * 40;
      nodes.push({
        id: nodeId,
        type: 'json-viewer',
        x: 0,
        y: 0,
        width: 240,
        height,
        title: `${label} [Array]`,
        subtitle: `${value.length} items`,
        style: {
          bg: '#FFFFFF',
          borderColor: '#F59E0B',
          borderWidth: 1.5,
          borderRadius: 8,
          textColor: '#0F172A',
          subtextColor: '#64748B',
          colorPalette: 'amber'
        },
        customData: {
          jsonData: value
        }
      });

      // If array items are objects, link up to 5 items
      value.slice(0, 5).forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          processEntity(item, `${label}[${idx}]`, nodeId, `[${idx}]`);
        }
      });
    } else {
      // Object node: extract primitive key-values for the card, and recurse on nested objects/arrays
      const keys = Object.keys(value);
      const primitiveEntries: Array<{ key: string; val: any }> = [];
      const complexEntries: Array<{ key: string; val: any }> = [];

      keys.forEach((k) => {
        const v = value[k];
        if (v !== null && typeof v === 'object') {
          complexEntries.push({ key: k, val: v });
        } else {
          primitiveEntries.push({ key: k, val: v });
        }
      });

      const height = Math.ceil(Math.min(320, Math.max(120, 60 + primitiveEntries.length * 24)) / 40) * 40;

      nodes.push({
        id: nodeId,
        type: 'json-viewer',
        x: 0,
        y: 0,
        width: 240,
        height,
        title: label || '{ } Object',
        subtitle: `${keys.length} keys`,
        style: {
          bg: '#FFFFFF',
          borderColor: '#6366F1',
          borderWidth: 1.5,
          borderRadius: 10,
          textColor: '#0F172A',
          subtextColor: '#64748B',
          colorPalette: 'indigo'
        },
        customData: {
          jsonData: value,
          jsonRaw: JSON.stringify(value, null, 2)
        }
      });

      // Recurse on complex properties
      complexEntries.forEach(({ key, val }) => {
        processEntity(val, key, nodeId, key);
      });
    }

    if (parentId) {
      edges.push({
        id: `json-edge-${edges.length + 1}`,
        fromNodeId: parentId,
        toNodeId: nodeId,
        fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
        toPort: preferredDirection === 'LR' ? 'left' : 'top',
        label: edgeLabel || '',
        lineStyle: 'solid',
        routeType: 'orthogonal',
        color: '#6366F1',
        width: 2.5,
        arrowhead: 'arrow'
      });
    }

    return nodeId;
  }

  processEntity(rootData, 'Root');

  const { nodes: positionedNodes, edges: routedEdges } = layoutGraph(nodes, edges, {
    direction: preferredDirection,
    nodeSpacingX: 140,
    nodeSpacingY: 60
  });

  return {
    id: `project-json-${Date.now()}`,
    name: 'JSON Data Visualizer',
    description: 'Hierarchical entity and data tree graph',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['JSON', 'API', 'Data Tree'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes: positionedNodes,
    edges: routedEdges
  };
}
