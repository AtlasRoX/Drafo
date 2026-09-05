import { FlowNode, FlowEdge, FlowProject, NodeType, LineStyle } from '../../types/flow';
import { layoutGraph } from './layoutEngine';
import { NODE_COLOR_PALETTES } from '../../data/colorPalettes';

/**
 * Robust, zero-dependency Mermaid Parser supporting:
 * 1. Flowchart & Graph (LR, TD, TB, subgraphs, all node shapes & edge styles)
 * 2. Sequence Diagrams (participants, actors, ordered calls, return replies)
 * 3. Class Diagrams (classes, attributes, methods, inheritance, composition)
 * 4. ER Diagrams (entities, fields, keys, cardinalities)
 * 5. State Diagrams (states, transitions)
 */
export function parseMermaid(
  code: string,
  preferredDirection: 'LR' | 'TB' = 'LR'
): FlowProject {
  const clean = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('%%')); // ignore comments

  const firstLine = clean[0] || '';

  if (firstLine.startsWith('sequenceDiagram')) {
    return parseMermaidSequence(clean);
  } else if (firstLine.startsWith('classDiagram')) {
    return parseMermaidClass(clean, preferredDirection);
  } else if (firstLine.startsWith('erDiagram')) {
    return parseMermaidER(clean, preferredDirection);
  } else if (firstLine.startsWith('stateDiagram')) {
    return parseMermaidState(clean, preferredDirection);
  } else {
    return parseMermaidFlowchart(clean, preferredDirection);
  }
}

// ----------------------------------------------------
// 1. FLOWCHART & GRAPH PARSER
// ----------------------------------------------------
function parseMermaidFlowchart(
  lines: string[],
  fallbackDirection: 'LR' | 'TB'
): FlowProject {
  let direction: 'LR' | 'TB' = fallbackDirection;
  const first = lines[0] || '';
  if (first.includes('LR') || first.includes('RL')) {
    direction = 'LR';
  } else if (first.includes('TD') || first.includes('TB') || first.includes('BT')) {
    direction = 'TB';
  }

  const nodesMap = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const containerSubgraphs: Array<{ id: string; title: string; childIds: string[] }> = [];

  let currentSubgraph: { id: string; title: string; childIds: string[] } | null = null;
  let edgeCounter = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Subgraph Start: subgraph ID ["Title"] or subgraph "Title"
    const subMatch = line.match(/^subgraph\s+([a-zA-Z0-9_-]+)(?:\s+\["?(.*?)"?\])?/i);
    if (subMatch) {
      const sId = subMatch[1];
      const sTitle = subMatch[2] || sId;
      currentSubgraph = { id: `sg-${sId}`, title: sTitle, childIds: [] };
      continue;
    }

    // Subgraph End
    if (line.match(/^end$/i)) {
      if (currentSubgraph) {
        containerSubgraphs.push(currentSubgraph);
        currentSubgraph = null;
      }
      continue;
    }

    // Parse Edge line: e.g. A["Text"] -->|label| B[("DB")] or A --> B
    // Regex for edge connector: -->, ---, -.->, ==>, with optional labels
    const edgeMatch = line.match(
      /^(.*?)\s*(-->|---|==>|-\.->|--\s+(?:".*?"|.*?)\s+-->|-\.\s+(?:".*?"|.*?)\s+\.->|==\s+(?:".*?"|.*?)\s+==>)\s*(?:\|("?.*?"?)\|)?\s*(.*)$/
    );

    if (edgeMatch) {
      const leftPart = edgeMatch[1].trim();
      const connector = edgeMatch[2].trim();
      let label = edgeMatch[3] ? edgeMatch[3].replace(/^"|"$/g, '').trim() : '';
      const rightPart = edgeMatch[4].trim();

      // Check for inline labels inside connectors like -- label -->
      if (!label) {
        const inlineLabelMatch = connector.match(/(?:--|-\.|==)\s+"?(.*?)"?\s+(?:-->|\.->|==>)/);
        if (inlineLabelMatch) {
          label = inlineLabelMatch[1].trim();
        }
      }

      const leftNode = parseOrGetNode(leftPart, nodesMap);
      const rightNode = parseOrGetNode(rightPart, nodesMap);

      if (currentSubgraph) {
        if (leftNode) currentSubgraph.childIds.push(leftNode.id);
        if (rightNode) currentSubgraph.childIds.push(rightNode.id);
      }

      if (leftNode && rightNode) {
        let lineStyle: LineStyle = 'solid';
        let width = 1.5;
        let isAnimated = false;

        if (connector.includes('-.')) {
          lineStyle = 'dashed';
          isAnimated = true;
        } else if (connector.includes('==')) {
          width = 2.5;
        }

        edges.push({
          id: `edge-${edgeCounter++}`,
          fromNodeId: leftNode.id,
          toNodeId: rightNode.id,
          fromPort: direction === 'LR' ? 'right' : 'bottom',
          toPort: direction === 'LR' ? 'left' : 'top',
          label,
          lineStyle,
          routeType: 'orthogonal',
          color: '#2563EB',
          width,
          arrowhead: 'arrow',
          isAnimated
        });
      }
      continue;
    }

    // Standalone node line: e.g. A["Title"]
    const singleNode = parseOrGetNode(line, nodesMap);
    if (singleNode && currentSubgraph) {
      currentSubgraph.childIds.push(singleNode.id);
    }
  }

  // Convert nodesMap to array
  const rawNodes = Array.from(nodesMap.values());

  // Layout the raw nodes
  const { nodes: positionedNodes, edges: routedEdges } = layoutGraph(rawNodes, edges, {
    direction,
    startX: 100,
    startY: 120
  });

  // Calculate container boundaries for subgraphs
  const containerNodes: FlowNode[] = [];
  containerSubgraphs.forEach((sg) => {
    const children = positionedNodes.filter((n) => sg.childIds.includes(n.id));
    if (children.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      children.forEach((c) => {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x + c.width);
        maxY = Math.max(maxY, c.y + c.height);
      });

      const padding = 32;
      containerNodes.push({
        id: sg.id,
        type: 'container',
        x: Math.max(20, minX - padding),
        y: Math.max(20, minY - padding - 20),
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2 + 20,
        title: sg.title,
        subtitle: `${children.length} services`,
        style: {
          bg: '#F8FAFC',
          borderColor: '#94A3B8',
          borderWidth: 1.5,
          borderRadius: 14,
          borderStyle: 'dashed',
          textColor: '#0F172A',
          subtextColor: '#64748B'
        },
        customData: {
          isContainer: true,
          containerLabel: sg.title,
          childNodeIds: children.map((c) => c.id)
        }
      });
    }
  });

  return {
    id: `project-mermaid-${Date.now()}`,
    name: 'Mermaid Flowchart Architecture',
    description: 'Auto-parsed from Mermaid source code with Drafo layout engine',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Mermaid', 'Architecture'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [],
    nodes: [...containerNodes, ...positionedNodes],
    edges: routedEdges
  };
}

// Node shape parsing helper
function parseOrGetNode(
  snippet: string,
  nodesMap: Map<string, FlowNode>
): FlowNode | null {
  const trimmed = snippet.trim();
  if (!trimmed) return null;

  // Shapes:
  // Cylinder: id[("Label")]
  // Stadium: id(["Label"])
  // Subroutine: id[["Label"]]
  // Hexagon: id{{"Label"}}
  // Decision: id{"Label"}
  // Circle: id(("Label"))
  // Rounded: id("Label")
  // Rectangular: id["Label"]
  // Plain: id

  let id = '';
  let label = '';
  let nodeType: NodeType = 'server';
  let colorPalette = 'blue';

  const cylinderMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[\(\s*"?(.*?)"?\s*\)\]$/);
  const stadiumMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\(\[\s*"?(.*?)"?\s*\]\)$/);
  const hexagonMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\{\{\s*"?(.*?)"?\s*\}\}$/);
  const decisionMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\{\s*"?(.*?)"?\s*\}$/);
  const circleMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\(\(\s*"?(.*?)"?\s*\)\)$/);
  const roundedMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\(\s*"?(.*?)"?\s*\)$/);
  const rectMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[\s*"?(.*?)"?\s*\]$/);

  if (cylinderMatch) {
    id = cylinderMatch[1];
    label = cylinderMatch[2];
    nodeType = 'database';
    colorPalette = 'purple';
  } else if (stadiumMatch) {
    id = stadiumMatch[1];
    label = stadiumMatch[2];
    nodeType = 'queue';
    colorPalette = 'amber';
  } else if (hexagonMatch) {
    id = hexagonMatch[1];
    label = hexagonMatch[2];
    nodeType = 'serverless';
    colorPalette = 'orange';
  } else if (decisionMatch) {
    id = decisionMatch[1];
    label = decisionMatch[2];
    nodeType = 'decision';
    colorPalette = 'yellow';
  } else if (circleMatch) {
    id = circleMatch[1];
    label = circleMatch[2];
    nodeType = 'auth';
    colorPalette = 'red';
  } else if (roundedMatch) {
    id = roundedMatch[1];
    label = roundedMatch[2];
    nodeType = 'client';
    colorPalette = 'blue';
  } else if (rectMatch) {
    id = rectMatch[1];
    label = rectMatch[2];
    // Check keyword hints in label
    const lower = label.toLowerCase();
    if (lower.includes('api') || lower.includes('gateway')) {
      nodeType = 'gateway';
      colorPalette = 'purple';
    } else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('oauth')) {
      nodeType = 'auth';
      colorPalette = 'red';
    } else if (lower.includes('db') || lower.includes('sql') || lower.includes('mongo')) {
      nodeType = 'database';
      colorPalette = 'purple';
    } else if (lower.includes('web') || lower.includes('browser') || lower.includes('react') || lower.includes('client')) {
      nodeType = 'browser';
      colorPalette = 'blue';
    } else if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android')) {
      nodeType = 'mobile';
      colorPalette = 'slate';
    } else if (lower.includes('kafka') || lower.includes('queue') || lower.includes('rabbit') || lower.includes('pubsub')) {
      nodeType = 'queue';
      colorPalette = 'orange';
    } else {
      nodeType = 'server';
      colorPalette = 'blue';
    }
  } else {
    // Plain ID without brackets: e.g. NodeA
    id = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
    label = id;
    nodeType = 'server';
    colorPalette = 'blue';
  }

  if (nodesMap.has(id)) {
    const existing = nodesMap.get(id)!;
    // If existing had no label and this one does, update label
    if (existing.title === existing.id && label !== id) {
      existing.title = label.replace(/<br\s*\/?>/gi, ' ');
    }
    return existing;
  }

  // Format subtitle if contains <br/>
  let title = label || id;
  let subtitle: string | undefined = undefined;
  if (title.includes('<br/>') || title.includes('<br>')) {
    const parts = title.split(/<br\s*\/?>/i);
    title = parts[0].trim();
    subtitle = parts.slice(1).join(' ').trim();
  }

  const palette = NODE_COLOR_PALETTES[colorPalette] || NODE_COLOR_PALETTES.blue;

  const nodeWidth = nodeType === 'decision' ? 140 : nodeType === 'mobile' ? 130 : 160;
  const nodeHeight = nodeType === 'decision' ? 100 : nodeType === 'mobile' ? 140 : 96;

  const newNode: FlowNode = {
    id,
    type: nodeType,
    x: 0,
    y: 0,
    width: nodeWidth,
    height: nodeHeight,
    title,
    subtitle,
    status: 'online',
    style: {
      bg: palette.bg,
      borderColor: palette.border,
      textColor: palette.text,
      subtextColor: '#64748B',
      borderRadius: nodeType === 'decision' ? 4 : 10,
      borderWidth: 1.5,
      colorPalette
    }
  };

  nodesMap.set(id, newNode);
  return newNode;
}

// ----------------------------------------------------
// 2. SEQUENCE DIAGRAM PARSER
// ----------------------------------------------------
function parseMermaidSequence(lines: string[]): FlowProject {
  const participantsMap = new Map<string, { id: string; label: string; isActor: boolean }>();
  const calls: Array<{ from: string; to: string; message: string; isReply: boolean; isAsync: boolean }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // participant A as "Client" or actor User as "Customer"
    const partMatch = line.match(/^(participant|actor)\s+([a-zA-Z0-9_-]+)(?:\s+as\s+"?(.*?)"?)?$/i);
    if (partMatch) {
      const isActor = partMatch[1].toLowerCase() === 'actor';
      const id = partMatch[2];
      const label = partMatch[3] || id;
      participantsMap.set(id, { id, label, isActor });
      continue;
    }

    // Call arrows: A->>B: message, A-->>B: reply, A->B: sync call
    const callMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(->>|-->>|->|-->)\s*([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (callMatch) {
      const from = callMatch[1];
      const arrow = callMatch[2];
      const to = callMatch[3];
      const message = callMatch[4].trim();

      if (!participantsMap.has(from)) {
        participantsMap.set(from, { id: from, label: from, isActor: false });
      }
      if (!participantsMap.has(to)) {
        participantsMap.set(to, { id: to, label: to, isActor: false });
      }

      calls.push({
        from,
        to,
        message,
        isReply: arrow.includes('--'),
        isAsync: arrow.includes('>>')
      });
    }
  }

  // Layout participants along top X axis
  const nodes: FlowNode[] = [];
  const partList = Array.from(participantsMap.values());
  const spacingX = 220;
  const startX = 100;
  const startY = 80;

  partList.forEach((p, idx) => {
    const x = startX + idx * spacingX;
    const isActor = p.isActor;
    nodes.push({
      id: p.id,
      type: isActor ? 'client' : 'server',
      x,
      y: startY,
      width: 160,
      height: 90,
      title: p.label,
      subtitle: isActor ? 'User Actor' : 'Lifeline Service',
      status: 'online',
      style: {
        bg: isActor ? '#EFF6FF' : '#F8FAFC',
        borderColor: isActor ? '#2563EB' : '#64748B',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B'
      }
    });
  });

  // Create sequential step edges
  const edges: FlowEdge[] = calls.map((c, idx) => {
    return {
      id: `seq-edge-${idx + 1}`,
      fromNodeId: c.from,
      toNodeId: c.to,
      fromPort: 'bottom',
      toPort: 'bottom',
      label: c.message,
      stepNumber: idx + 1,
      lineStyle: c.isReply ? 'dashed' : 'solid',
      routeType: 'curved',
      color: c.isReply ? '#64748B' : '#2563EB',
      width: 2.5,
      arrowhead: 'arrow',
      isAnimated: !c.isReply
    };
  });

  return {
    id: `project-seq-${Date.now()}`,
    name: 'Sequence Flow Diagram',
    description: 'Sequence interactions converted to interactive flow presentation',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Sequence', 'UML', 'Interaction'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}

// ----------------------------------------------------
// 3. CLASS DIAGRAM PARSER
// ----------------------------------------------------
function parseMermaidClass(lines: string[], preferredDirection: 'LR' | 'TB'): FlowProject {
  const classesMap = new Map<
    string,
    { id: string; name: string; attributes: string[]; methods: string[] }
  >();
  const relations: Array<{ from: string; to: string; label: string; type: string }> = [];

  let currentClass: { id: string; name: string; attributes: string[]; methods: string[] } | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // class Name { ... }
    const classStartMatch = line.match(/^class\s+([a-zA-Z0-9_-]+)(?:\s*\{)?$/);
    if (classStartMatch) {
      const name = classStartMatch[1];
      currentClass = { id: name, name, attributes: [], methods: [] };
      classesMap.set(name, currentClass);
      continue;
    }

    if (line === '}') {
      currentClass = null;
      continue;
    }

    if (currentClass) {
      if (line.includes('(') && line.includes(')')) {
        currentClass.methods.push(line.trim());
      } else {
        currentClass.attributes.push(line.trim());
      }
      continue;
    }

    // Relations: ClassA <|-- ClassB : label
    const relMatch = line.match(
      /^([a-zA-Z0-9_-]+)\s*(?:(".*?")\s*)?(<\|--|\*--|o--|-->|\.\.>)\s*(?:(".*?")\s*)?([a-zA-Z0-9_-]+)(?:\s*:\s*(.*))?$/
    );
    if (relMatch) {
      const from = relMatch[1];
      const relType = relMatch[3];
      const to = relMatch[5];
      const label = relMatch[6] ? relMatch[6].trim() : '';

      if (!classesMap.has(from)) classesMap.set(from, { id: from, name: from, attributes: [], methods: [] });
      if (!classesMap.has(to)) classesMap.set(to, { id: to, name: to, attributes: [], methods: [] });

      relations.push({ from, to, label, type: relType });
    }
  }

  // Convert classes to 'uml-class' FlowNodes
  const rawNodes: FlowNode[] = Array.from(classesMap.values()).map((c) => {
    const members = [
      ...c.attributes.map((attr) => {
        let vis: '+' | '-' | '#' | '~' = '+';
        let cleanAttr = attr;
        if (['+', '-', '#', '~'].includes(attr[0])) {
          vis = attr[0] as any;
          cleanAttr = attr.slice(1).trim();
        }
        return { name: cleanAttr, visibility: vis, isMethod: false };
      }),
      ...c.methods.map((m) => {
        let vis: '+' | '-' | '#' | '~' = '+';
        let cleanM = m;
        if (['+', '-', '#', '~'].includes(m[0])) {
          vis = m[0] as any;
          cleanM = m.slice(1).trim();
        }
        return { name: cleanM, visibility: vis, isMethod: true };
      })
    ];

    const height = Math.max(120, 70 + members.length * 24);

    return {
      id: c.id,
      type: 'uml-class',
      x: 0,
      y: 0,
      width: 220,
      height,
      title: c.name,
      subtitle: `<<class>> (${members.length} members)`,
      style: {
        bg: '#FFFFFF',
        borderColor: '#4F46E5',
        borderWidth: 1.5,
        borderRadius: 8,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        colorPalette: 'indigo'
      },
      customData: {
        umlMembers: members
      }
    };
  });

  const rawEdges: FlowEdge[] = relations.map((r, idx) => ({
    id: `class-rel-${idx + 1}`,
    fromNodeId: r.from,
    toNodeId: r.to,
    fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
    toPort: preferredDirection === 'LR' ? 'left' : 'top',
    label: r.label || (r.type === '<|--' ? 'extends' : r.type === '*--' ? 'contains' : 'references'),
    lineStyle: r.type === '..>' ? 'dashed' : 'solid',
    routeType: 'orthogonal',
    color: '#4F46E5',
    width: 2.5,
    arrowhead: r.type === '<|--' ? 'open' : 'arrow'
  }));

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, { direction: preferredDirection });

  return {
    id: `project-class-${Date.now()}`,
    name: 'Class Diagram Model',
    description: 'Object-oriented UML class hierarchy and relationships',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['UML', 'Class', 'OOP'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}

// ----------------------------------------------------
// 4. ER DIAGRAM PARSER
// ----------------------------------------------------
function parseMermaidER(lines: string[], preferredDirection: 'LR' | 'TB'): FlowProject {
  const entitiesMap = new Map<string, { id: string; fields: Array<{ type: string; name: string; isPk: boolean; isFk: boolean }> }>();
  const relations: Array<{ from: string; to: string; label: string; cardinality: string }> = [];

  let currentEntity: { id: string; fields: Array<{ type: string; name: string; isPk: boolean; isFk: boolean }> } | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // ENTITY { type name PK }
    const entStartMatch = line.match(/^([a-zA-Z0-9_-]+)\s*\{$/);
    if (entStartMatch) {
      const id = entStartMatch[1];
      currentEntity = { id, fields: [] };
      entitiesMap.set(id, currentEntity);
      continue;
    }

    if (line === '}') {
      currentEntity = null;
      continue;
    }

    if (currentEntity) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const type = parts[0];
        const name = parts[1];
        const isPk = line.toUpperCase().includes('PK');
        const isFk = line.toUpperCase().includes('FK');
        currentEntity.fields.push({ type, name, isPk, isFk });
      }
      continue;
    }

    // Relation: CUSTOMER ||--o{ ORDER : places
    const relMatch = line.match(/^([a-zA-Z0-9_-]+)\s*([|o}{]{4,6})\s*([a-zA-Z0-9_-]+)\s*(?::\s*"(.*?)"|:\s*(.*))?$/);
    if (relMatch) {
      const from = relMatch[1];
      const card = relMatch[2];
      const to = relMatch[3];
      const label = (relMatch[4] || relMatch[5] || '').trim();

      if (!entitiesMap.has(from)) entitiesMap.set(from, { id: from, fields: [] });
      if (!entitiesMap.has(to)) entitiesMap.set(to, { id: to, fields: [] });

      relations.push({ from, to, label, cardinality: card });
    }
  }

  const rawNodes: FlowNode[] = Array.from(entitiesMap.values()).map((e) => {
    const height = Math.max(120, 60 + e.fields.length * 28);
    return {
      id: e.id,
      type: 'sql-table',
      x: 0,
      y: 0,
      width: 230,
      height,
      title: e.id,
      subtitle: `${e.fields.length} columns`,
      style: {
        bg: '#FFFFFF',
        borderColor: '#7C3AED',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        colorPalette: 'purple'
      },
      customData: {
        sqlColumns: e.fields.map((f) => ({
          name: f.name,
          type: f.type,
          isPk: f.isPk,
          isFk: f.isFk
        }))
      }
    };
  });

  const rawEdges: FlowEdge[] = relations.map((r, idx) => ({
    id: `er-edge-${idx + 1}`,
    fromNodeId: r.from,
    toNodeId: r.to,
    fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
    toPort: preferredDirection === 'LR' ? 'left' : 'top',
    label: r.label ? `${r.label} (${r.cardinality})` : r.cardinality,
    lineStyle: 'solid',
    routeType: 'orthogonal',
    color: '#7C3AED',
    width: 2.5,
    arrowhead: 'arrow'
  }));

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, { direction: preferredDirection });

  return {
    id: `project-er-${Date.now()}`,
    name: 'Entity Relationship Diagram',
    description: 'Relational data model converted to interactive schema tables',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['ERD', 'Database', 'SQL'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}

// ----------------------------------------------------
// 5. STATE DIAGRAM PARSER
// ----------------------------------------------------
function parseMermaidState(lines: string[], preferredDirection: 'LR' | 'TB'): FlowProject {
  const statesSet = new Set<string>();
  const transitions: Array<{ from: string; to: string; label: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const transMatch = line.match(/^([a-zA-Z0-9_\*\[\]]+)\s*-->\s*([a-zA-Z0-9_\*\[\]]+)(?:\s*:\s*(.*))?$/);
    if (transMatch) {
      let from = transMatch[1];
      let to = transMatch[2];
      const label = (transMatch[3] || '').trim();

      if (from === '[*]') from = 'InitialState';
      if (to === '[*]') to = 'TerminalState';

      statesSet.add(from);
      statesSet.add(to);

      transitions.push({ from, to, label });
    }
  }

  const rawNodes: FlowNode[] = Array.from(statesSet).map((s) => {
    const isSpecial = s === 'InitialState' || s === 'TerminalState';
    return {
      id: s,
      type: isSpecial ? 'decision' : 'server',
      x: 0,
      y: 0,
      width: isSpecial ? 130 : 160,
      height: isSpecial ? 80 : 90,
      title: s === 'InitialState' ? 'Start [*]' : s === 'TerminalState' ? 'End [*]' : s,
      subtitle: 'State Node',
      style: {
        bg: isSpecial ? '#FEF3C7' : '#FFFFFF',
        borderColor: isSpecial ? '#D97706' : '#2563EB',
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B'
      }
    };
  });

  const rawEdges: FlowEdge[] = transitions.map((t, idx) => ({
    id: `state-edge-${idx + 1}`,
    fromNodeId: t.from,
    toNodeId: t.to,
    fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
    toPort: preferredDirection === 'LR' ? 'left' : 'top',
    label: t.label,
    lineStyle: 'solid',
    routeType: 'orthogonal',
    color: '#2563EB',
    width: 2.5,
    arrowhead: 'arrow'
  }));

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, { direction: preferredDirection });

  return {
    id: `project-state-${Date.now()}`,
    name: 'State Machine Diagram',
    description: 'State transition lifecycle model',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['State', 'Automata', 'Flow'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}
