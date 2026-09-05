import { FlowNode, FlowEdge, FlowProject, LineStyle, ArrowheadType } from '../../types/flow';
import { layoutGraph } from './layoutEngine';

interface UmlClassDef {
  id: string;
  name: string;
  kind: 'class' | 'interface' | 'abstract' | 'enum';
  stereotype?: string;
  members: Array<{
    name: string;
    visibility: '+' | '-' | '#' | '~';
    isMethod: boolean;
    type?: string;
  }>;
}

interface UmlRelation {
  from: string;
  to: string;
  relationType: string;
  fromCardinality?: string;
  toCardinality?: string;
  label?: string;
}

/**
 * PlantUML & Standard UML Text Parser
 * Supports Class Diagrams, Component Diagrams, Packages, and Object Models.
 */
export function parseUML(
  code: string,
  preferredDirection: 'LR' | 'TB' = 'LR'
): FlowProject {
  const cleanLines = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("'") && !l.startsWith('note ') && !l.startsWith('title '));

  // Check if it's a component diagram (lots of brackets [Component])
  const isComponentDiagram = cleanLines.some((l) => /\[.*?\]/.test(l) || l.startsWith('package ') || l.startsWith('database '));

  if (isComponentDiagram) {
    return parseUmlComponentDiagram(cleanLines, preferredDirection);
  }

  return parseUmlClassDiagram(cleanLines, preferredDirection);
}

// ----------------------------------------------------
// UML CLASS DIAGRAM PARSER
// ----------------------------------------------------
function parseUmlClassDiagram(
  lines: string[],
  preferredDirection: 'LR' | 'TB'
): FlowProject {
  const classesMap = new Map<string, UmlClassDef>();
  const relations: UmlRelation[] = [];

  let currentClass: UmlClassDef | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('@startuml') || line.startsWith('@enduml')) {
      continue;
    }

    // Class/Interface/Enum declaration:
    // interface Authenticatable or abstract class BaseEntity or class User <<entity>> {
    const declMatch = line.match(
      /^(interface|abstract\s+class|class|enum)\s+([a-zA-Z0-9_-]+)(?:\s+<<\s*(.*?)\s*>>)?(?:\s*\{)?$/i
    );
    if (declMatch) {
      const rawKind = declMatch[1].toLowerCase();
      const kind: 'class' | 'interface' | 'abstract' | 'enum' = rawKind.includes('interface')
        ? 'interface'
        : rawKind.includes('abstract')
        ? 'abstract'
        : rawKind.includes('enum')
        ? 'enum'
        : 'class';
      const name = declMatch[2];
      const stereotype = declMatch[3] ? `<<${declMatch[3]}>>` : `<<${kind}>>`;

      currentClass = {
        id: name,
        name,
        kind,
        stereotype,
        members: []
      };
      classesMap.set(name, currentClass);

      if (!line.includes('{')) {
        currentClass = null; // single-line declaration
      }
      continue;
    }

    if (line === '}') {
      currentClass = null;
      continue;
    }

    // Member parsing inside a class block
    if (currentClass) {
      // Visibility symbol (+, -, #, ~)
      let vis: '+' | '-' | '#' | '~' = '+';
      let cleanMember = line;
      if (['+', '-', '#', '~'].includes(line[0])) {
        vis = line[0] as any;
        cleanMember = line.slice(1).trim();
      }

      const isMethod = cleanMember.includes('(') && cleanMember.includes(')');
      currentClass.members.push({
        name: cleanMember,
        visibility: vis,
        isMethod
      });
      continue;
    }

    // Relationships:
    // ClassA <|-- ClassB : label
    // User "1" *-- "*" OrderItem : contains
    // Payment ..|> Authenticatable
    const relMatch = line.match(
      /^([a-zA-Z0-9_-]+)\s*(?:"(.*?)"\s*)?(<\|--|<\|\.\.|\.\.\|>|\*--|o--|-->|\.\.>|--)\s*(?:"(.*?)"\s*)?([a-zA-Z0-9_-]+)(?:\s*:\s*(.*))?$/
    );
    if (relMatch) {
      const from = relMatch[1];
      const fromCard = relMatch[2];
      const relType = relMatch[3];
      const toCard = relMatch[4];
      const to = relMatch[5];
      const label = relMatch[6] ? relMatch[6].trim() : '';

      if (!classesMap.has(from)) {
        classesMap.set(from, { id: from, name: from, kind: 'class', members: [] });
      }
      if (!classesMap.has(to)) {
        classesMap.set(to, { id: to, name: to, kind: 'class', members: [] });
      }

      relations.push({
        from,
        to,
        relationType: relType,
        fromCardinality: fromCard,
        toCardinality: toCard,
        label
      });
    }
  }

  // Create FlowNode objects
  const rawNodes: FlowNode[] = Array.from(classesMap.values()).map((c) => {
    const isInterface = c.kind === 'interface';
    const isAbstract = c.kind === 'abstract';
    const isEnum = c.kind === 'enum';

    const borderColor = isInterface ? '#0284C7' : isAbstract ? '#D97706' : isEnum ? '#10B981' : '#4F46E5';
    const colorPalette = isInterface ? 'cyan' : isAbstract ? 'amber' : isEnum ? 'green' : 'indigo';

    const rawHeight = Math.max(120, 74 + c.members.length * 24);
    // Snap height to multiple of 40 so height / 2 is an exact multiple of 20 (baseGrid dots)
    const height = Math.ceil(rawHeight / 40) * 40;

    return {
      id: c.id,
      type: 'uml-class',
      x: 0,
      y: 0,
      width: 240,
      height,
      title: c.name,
      subtitle: c.stereotype || `<<${c.kind}>>`,
      style: {
        bg: '#FFFFFF',
        borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        colorPalette
      },
      customData: {
        umlStereotype: c.stereotype,
        umlMembers: c.members
      }
    };
  });

  // Create FlowEdges
  const rawEdges: FlowEdge[] = relations.map((r, idx) => {
    let lineStyle: LineStyle = 'solid';
    let arrowhead: ArrowheadType = 'arrow';
    let label = r.label || '';

    if (r.relationType === '<|--') {
      arrowhead = 'open';
      if (!label) label = 'extends';
    } else if (r.relationType === '..|>' || r.relationType === '<|..') {
      lineStyle = 'dashed';
      arrowhead = 'open';
      if (!label) label = 'implements';
    } else if (r.relationType === '*--') {
      arrowhead = 'circle';
      if (!label) label = 'composition';
    } else if (r.relationType === 'o--') {
      arrowhead = 'circle';
      if (!label) label = 'aggregation';
    } else if (r.relationType === '..>') {
      lineStyle = 'dashed';
      arrowhead = 'arrow';
    }

    if (r.fromCardinality && r.toCardinality) {
      label = `${r.fromCardinality} ${label} ${r.toCardinality}`.trim();
    }

    return {
      id: `uml-edge-${idx + 1}`,
      fromNodeId: r.from,
      toNodeId: r.to,
      fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
      toPort: preferredDirection === 'LR' ? 'left' : 'top',
      label,
      lineStyle,
      routeType: 'orthogonal',
      color: '#4F46E5',
      width: 2.5,
      arrowhead
    };
  });

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, { direction: preferredDirection });

  return {
    id: `project-uml-${Date.now()}`,
    name: 'PlantUML Domain Model',
    description: 'Object-oriented UML class and relationship architecture',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['UML', 'PlantUML', 'Classes'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}

// ----------------------------------------------------
// UML COMPONENT DIAGRAM PARSER
// ----------------------------------------------------
function parseUmlComponentDiagram(
  lines: string[],
  preferredDirection: 'LR' | 'TB'
): FlowProject {
  const componentsMap = new Map<string, { id: string; name: string; isDb: boolean; isPackage: boolean }>();
  const relations: Array<{ from: string; to: string; label: string; isDashed: boolean }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('@startuml') || line.startsWith('@enduml')) continue;

    // [Component Name] as Alias or [Component Name]
    const compMatch = line.match(/\[(.*?)\](?:\s+as\s+([a-zA-Z0-9_-]+))?/);
    if (compMatch) {
      const name = compMatch[1];
      const id = compMatch[2] || name.replace(/[^a-zA-Z0-9_-]/g, '_');
      componentsMap.set(id, { id, name, isDb: false, isPackage: false });
    }

    // database "Database Name" as DB
    const dbMatch = line.match(/^database\s+"?(.*?)"?(?:\s+as\s+([a-zA-Z0-9_-]+))?$/i);
    if (dbMatch) {
      const name = dbMatch[1];
      const id = dbMatch[2] || name.replace(/[^a-zA-Z0-9_-]/g, '_');
      componentsMap.set(id, { id, name, isDb: true, isPackage: false });
    }

    // Component relations: Web --> CDN : HTTPS or Order ..> Notif
    const relMatch = line.match(
      /^([a-zA-Z0-9_\[\]\-]+)\s*(-->|\.\.>|->)\s*([a-zA-Z0-9_\[\]\-]+)(?:\s*:\s*(.*))?$/
    );
    if (relMatch) {
      let from = relMatch[1].replace(/[\[\]]/g, '');
      const arrow = relMatch[2];
      let to = relMatch[3].replace(/[\[\]]/g, '');
      const label = (relMatch[4] || '').trim();

      if (!componentsMap.has(from)) componentsMap.set(from, { id: from, name: from, isDb: false, isPackage: false });
      if (!componentsMap.has(to)) componentsMap.set(to, { id: to, name: to, isDb: false, isPackage: false });

      relations.push({
        from,
        to,
        label,
        isDashed: arrow.includes('..')
      });
    }
  }

  const rawNodes: FlowNode[] = Array.from(componentsMap.values()).map((c) => {
    return {
      id: c.id,
      type: c.isDb ? 'database' : 'server',
      x: 0,
      y: 0,
      width: 200,
      height: 120,
      title: c.name,
      subtitle: c.isDb ? 'SQL Database' : 'UML Component',
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: c.isDb ? '#9333EA' : '#2563EB',
        borderWidth: 1.5,
        borderRadius: 10,
        textColor: '#0F172A',
        subtextColor: '#64748B',
        colorPalette: c.isDb ? 'purple' : 'blue'
      }
    };
  });

  const rawEdges: FlowEdge[] = relations.map((r, idx) => ({
    id: `comp-edge-${idx + 1}`,
    fromNodeId: r.from,
    toNodeId: r.to,
    fromPort: preferredDirection === 'LR' ? 'right' : 'bottom',
    toPort: preferredDirection === 'LR' ? 'left' : 'top',
    label: r.label,
    lineStyle: r.isDashed ? 'dashed' : 'solid',
    routeType: 'orthogonal',
    color: '#2563EB',
    width: 2.5,
    arrowhead: 'arrow'
  }));

  const { nodes, edges } = layoutGraph(rawNodes, rawEdges, { direction: preferredDirection });

  return {
    id: `project-uml-comp-${Date.now()}`,
    name: 'PlantUML Component Architecture',
    description: 'Component and service interface wiring',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['UML', 'Components', 'Architecture'],
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes,
    edges
  };
}
