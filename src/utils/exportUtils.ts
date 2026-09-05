import { toPng, toJpeg, toSvg } from 'html-to-image';
import { FlowProject, FlowNode } from '../types/flow';

function getExportOptions(
  element: HTMLElement,
  options?: {
    scale?: number;
    bgColor?: string;
    quality?: number;
  }
) {
  const width = Math.round(
    element.offsetWidth ||
    element.clientWidth ||
    (element.style.width ? parseFloat(element.style.width) : 0)
  );
  const height = Math.round(
    element.offsetHeight ||
    element.clientHeight ||
    (element.style.height ? parseFloat(element.style.height) : 0)
  );

  return {
    quality: options?.quality ?? 0.98,
    pixelRatio: options?.scale ?? 2,
    cacheBust: true,
    backgroundColor: options?.bgColor || undefined,
    width: width > 0 ? width : undefined,
    height: height > 0 ? height : undefined,
    style: {
      position: 'relative',
      left: '0px',
      top: '0px',
      margin: '0px',
      transform: 'none'
    },
    filter: (node: Node) => {
      if (node instanceof HTMLElement && node.classList.contains('no-export')) {
        return false;
      }
      return true;
    }
  };
}

export async function exportDiagramAsPng(
  element: HTMLElement,
  filename: string = 'drafo-diagram.png',
  scale: number = 2,
  bgColor?: string
): Promise<void> {
  try {
    const opts = getExportOptions(element, { scale, bgColor, quality: 0.98 });
    const dataUrl = await toPng(element, opts);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

export async function exportDiagramAsJpg(
  element: HTMLElement,
  filename: string = 'drafo-diagram.jpg',
  scale: number = 2,
  bgColor: string = '#FFFFFF'
): Promise<void> {
  try {
    const opts = getExportOptions(element, { scale, bgColor, quality: 0.95 });
    const dataUrl = await toJpeg(element, opts);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export JPG:', error);
    throw error;
  }
}

export async function exportDiagramAsSvg(
  element: HTMLElement,
  filename: string = 'drafo-diagram.svg',
  bgColor?: string
): Promise<void> {
  try {
    const opts = getExportOptions(element, { bgColor });
    const dataUrl = await toSvg(element, opts);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export SVG:', error);
    throw error;
  }
}

export async function exportDiagramAsPdf(
  element: HTMLElement,
  filename: string = 'drafo-diagram.pdf',
  title: string = 'Drafo Architecture Diagram',
  bgColor?: string
): Promise<void> {
  try {
    const opts = getExportOptions(element, { scale: 3, bgColor: bgColor || '#FFFFFF', quality: 0.98 });
    const dataUrl = await toPng(element, opts);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback if popup blocker is active
      const link = document.createElement('a');
      link.download = filename.replace(/\.pdf$/i, '') + '.png';
      link.href = dataUrl;
      link.click();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background-color: #FFFFFF;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .header {
              width: 100%;
              max-width: 95%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #E2E8F0;
            }
            .title {
              font-size: 15px;
              font-weight: 700;
              color: #0F172A;
            }
            .meta {
              font-size: 11px;
              color: #64748B;
            }
            .img-container {
              max-width: 98%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            img {
              max-width: 100%;
              max-height: 85vh;
              object-fit: contain;
              border-radius: 8px;
            }
            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="title">${title}</span>
            <span class="meta">Drafo Studio · ${new Date().toLocaleDateString()}</span>
          </div>
          <div class="img-container">
            <img src="${dataUrl}" alt="${title}" />
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
}

export async function copyDiagramToClipboard(
  element: HTMLElement,
  scale: number = 2,
  bgColor?: string
): Promise<boolean> {
  try {
    const opts = getExportOptions(element, { scale, bgColor, quality: 0.98 });
    const dataUrl = await toPng(element, opts);

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
