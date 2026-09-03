import { toPng, toSvg } from 'html-to-image';
import { FlowProject, FlowNode } from '../types/flow';

export async function exportDiagramAsPng(
  element: HTMLElement,
  filename: string = 'drafo-diagram.png',
  scale: number = 2,
  bgColor?: string
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: scale,
      cacheBust: true,
      backgroundColor: bgColor || undefined,
      filter: (node) => {
        // filter out interactive selection boxes, resize handles, or guides during export
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

export async function exportDiagramAsSvg(
  element: HTMLElement,
  filename: string = 'drafo-diagram.svg',
  bgColor?: string
): Promise<void> {
  try {
    const dataUrl = await toSvg(element, {
      cacheBust: true,
      backgroundColor: bgColor || undefined,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export SVG:', error);
    throw error;
  }
}

export async function copyDiagramToClipboard(
  element: HTMLElement,
  scale: number = 2,
  bgColor?: string
): Promise<boolean> {
  try {
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: scale,
      cacheBust: true,
      backgroundColor: bgColor || undefined,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });

    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export function generateMermaidCode(
  project: FlowProject,
  selectedNodeIds?: string[]
): string {
  const isFiltered = selectedNodeIds && selectedNodeIds.length > 0;
  const targetNodeIds = isFiltered
    ? new Set(selectedNodeIds)
    : new Set(project.nodes.map((n) => n.id));

  const targetNodes = project.nodes.filter((n) => targetNodeIds.has(n.id));
  const targetEdges = project.edges.filter(
    (e) => targetNodeIds.has(e.fromNodeId) && targetNodeIds.has(e.toNodeId)
  );

  let output = 'flowchart TD\n';

  // Sanitize ID for Mermaid syntax
  const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_');
  const sanitizeText = (text: string) => text.replace(/["\n\r]/g, ' ');

  // Separate container/group nodes from regular nodes
  const containers = targetNodes.filter((n) => n.type === 'container' || n.type === 'group');
  const regularNodes = targetNodes.filter((n) => n.type !== 'container' && n.type !== 'group');

  // Check if nodes are geometrically inside any container
  const nodeToContainerMap = new Map<string, string>();
  for (const c of containers) {
    for (const n of regularNodes) {
      const isInside =
        n.x >= c.x &&
        n.y >= c.y &&
        n.x + n.width <= c.x + c.width &&
        n.y + n.height <= c.y + c.height;
      if (isInside) {
        nodeToContainerMap.set(n.id, c.id);
      }
    }
  }

  // Render subgraphs for containers
  for (const c of containers) {
    const cId = sanitizeId(c.id);
    const cTitle = sanitizeText(c.title || 'Container');
    output += `  subgraph ${cId} ["${cTitle}"]\n`;

    // Add child nodes
    const children = regularNodes.filter((n) => nodeToContainerMap.get(n.id) === c.id);
    for (const child of children) {
      output += renderMermaidNode(child, '    ');
    }
    output += '  end\n';
  }

  // Render top-level nodes that are NOT in any container
  const standaloneNodes = regularNodes.filter((n) => !nodeToContainerMap.has(n.id));
  for (const node of standaloneNodes) {
    output += renderMermaidNode(node, '  ');
  }

  output += '\n';

  // Render edges
  for (const edge of targetEdges) {
    const fromId = sanitizeId(edge.fromNodeId);
    const toId = sanitizeId(edge.toNodeId);
    const label = edge.label ? `|"${sanitizeText(edge.label)}"|` : '';

    let arrow = '-->';
    if (edge.lineStyle === 'dashed' || edge.lineStyle === 'dotted') {
      arrow = '-.->';
    } else if (edge.width && edge.width > 2) {
      arrow = '==>';
    }

    output += `  ${fromId} ${arrow}${label} ${toId}\n`;
  }

  return output;
}

function renderMermaidNode(node: FlowNode, indent: string = '  '): string {
  const sId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
  const title = (node.title || 'Component').replace(/["\n\r]/g, ' ');
  const sub = node.subtitle ? `<br/>${node.subtitle.replace(/["\n\r]/g, ' ')}` : '';

  switch (node.type) {
    case 'database':
    case 'nosql':
    case 'storage':
      return `${indent}${sId}[("${title}${sub}")]\n`;
    case 'decision':
      return `${indent}${sId}{"${title}"}\n`;
    case 'terminal':
    case 'action':
    case 'serverless':
      return `${indent}${sId}{{"${title}${sub}"}}\n`;
    case 'queue':
      return `${indent}${sId}(["${title}${sub}"])\n`;
    default:
      return `${indent}${sId}["${title}${sub}"]\n`;
  }
}

export function exportDiagramAsJson(project: FlowProject, filename?: string): void {
  const finalFilename = filename || `${project.name.toLowerCase().replace(/\s+/g, '-')}.drafo.json`;
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = finalFilename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseUploadedJson(jsonText: string): FlowProject {
  const data = JSON.parse(jsonText);
  if (!data.nodes || !data.edges) {
    throw new Error('Invalid Drafo project file');
  }
  return data as FlowProject;
}
