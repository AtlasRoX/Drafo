import { FlowNode, FlowEdge, PortPosition } from '../../types/flow';

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeSpacingX?: number;
  nodeSpacingY?: number;
  startX?: number;
  startY?: number;
}

/**
 * Intelligent Layered Graph Layout (Sugiyama-style DAG Ranker)
 * Computes optimal (x, y) coordinates for nodes and routes edges with appropriate ports.
 */
export function layoutGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions = {}
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const direction = options.direction || 'LR';
  const startX = Math.round((options.startX ?? 80) / 40) * 40;
  const startY = Math.round((options.startY ?? 120) / 40) * 40;
  const spacingX = Math.round((options.nodeSpacingX ?? (direction === 'LR' ? 160 : 80)) / 40) * 40;
  const spacingY = Math.round((options.nodeSpacingY ?? (direction === 'LR' ? 80 : 120)) / 40) * 40;

  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n }));

  // Adjacency graph and in-degrees
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outEdges.set(n.id, []);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.fromNodeId) && nodeMap.has(e.toNodeId) && e.fromNodeId !== e.toNodeId) {
      inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) || 0) + 1);
      outEdges.get(e.fromNodeId)?.push(e.toNodeId);
    }
  });

  // Assign layers using Topological Sort / Longest Path
  const layers: string[][] = [];
  const nodeLayer = new Map<string, number>();
  const visited = new Set<string>();

  // Queue of root nodes (inDegree === 0)
  let currentLayer = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);

  // If graph is circular or has no clear root, pick the first node
  if (currentLayer.length === 0) {
    currentLayer = [nodes[0].id];
  }

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    currentLayer.forEach((id) => {
      nodeLayer.set(id, layers.length - 1);
      visited.add(id);
    });

    const nextLayerSet = new Set<string>();
    currentLayer.forEach((id) => {
      const neighbors = outEdges.get(id) || [];
      neighbors.forEach((nbr) => {
        if (!visited.has(nbr)) {
          nextLayerSet.add(nbr);
        }
      });
    });

    currentLayer = Array.from(nextLayerSet);
  }

  // Assign any unvisited nodes (disconnected components) to new or existing layers
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      if (layers.length === 0) layers.push([]);
      layers[layers.length - 1].push(n.id);
      nodeLayer.set(n.id, layers.length - 1);
      visited.add(n.id);
    }
  });

  // Position nodes layer by layer
  const positionedNodes: FlowNode[] = [];

  if (direction === 'LR') {
    // Horizontal Layout: Layers grow along X, nodes within a layer stack along Y
    let currentX = startX;

    layers.forEach((layer) => {
      let maxLayerWidth = 0;
      let totalHeight = 0;

      // First pass: measure sizes (quantized to multiples of 40)
      layer.forEach((nodeId) => {
        const node = nodeMap.get(nodeId)!;
        const nodeW = Math.ceil((node.width || 160) / 40) * 40;
        const nodeH = Math.ceil((node.height || 120) / 40) * 40;
        maxLayerWidth = Math.max(maxLayerWidth, nodeW);
        totalHeight += nodeH + spacingY;
      });
      totalHeight -= spacingY; // remove last spacing

      // Second pass: position nodes centered vertically on the grid
      let currentY = startY;
      layer.forEach((nodeId) => {
        const node = nodeMap.get(nodeId)!;
        const nodeW = Math.ceil((node.width || 160) / 40) * 40;
        const nodeH = Math.ceil((node.height || 120) / 40) * 40;
        const x = currentX;
        const y = currentY;

        positionedNodes.push({
          ...node,
          x,
          y,
          width: nodeW,
          height: nodeH
        });

        currentY += nodeH + spacingY;
      });

      currentX += Math.ceil(maxLayerWidth / 40) * 40 + spacingX;
    });
  } else {
    // Vertical Layout (TB): Layers grow along Y, nodes within a layer stack along X
    let currentY = startY;

    layers.forEach((layer) => {
      let maxLayerHeight = 0;
      let totalWidth = 0;

      layer.forEach((nodeId) => {
        const node = nodeMap.get(nodeId)!;
        const nodeW = Math.ceil((node.width || 160) / 40) * 40;
        const nodeH = Math.ceil((node.height || 120) / 40) * 40;
        maxLayerHeight = Math.max(maxLayerHeight, nodeH);
        totalWidth += nodeW + spacingX;
      });
      totalWidth -= spacingX;

      let currentX = startX;
      layer.forEach((nodeId) => {
        const node = nodeMap.get(nodeId)!;
        const nodeW = Math.ceil((node.width || 160) / 40) * 40;
        const nodeH = Math.ceil((node.height || 120) / 40) * 40;
        const x = currentX;
        const y = currentY;

        positionedNodes.push({
          ...node,
          x,
          y,
          width: nodeW,
          height: nodeH
        });

        currentX += nodeW + spacingX;
      });

      currentY += Math.ceil(maxLayerHeight / 40) * 40 + spacingY;
    });
  }

  // Create a quick lookup for positioned nodes
  const posMap = new Map<string, FlowNode>();
  positionedNodes.forEach((n) => posMap.set(n.id, n));

  // Route edges with logical ports based on relative positions
  const routedEdges: FlowEdge[] = edges.map((edge) => {
    const from = posMap.get(edge.fromNodeId);
    const to = posMap.get(edge.toNodeId);

    if (!from || !to) {
      return edge;
    }

    let fromPort: PortPosition = edge.fromPort || 'right';
    let toPort: PortPosition = edge.toPort || 'left';

    if (direction === 'LR') {
      if (from.x + from.width <= to.x) {
        fromPort = 'right';
        toPort = 'left';
      } else if (to.x + to.width <= from.x) {
        fromPort = 'left';
        toPort = 'right';
      } else if (from.y + from.height <= to.y) {
        fromPort = 'bottom';
        toPort = 'top';
      } else {
        fromPort = 'top';
        toPort = 'bottom';
      }
    } else {
      // TB Direction
      if (from.y + from.height <= to.y) {
        fromPort = 'bottom';
        toPort = 'top';
      } else if (to.y + to.height <= from.y) {
        fromPort = 'top';
        toPort = 'bottom';
      } else if (from.x + from.width <= to.x) {
        fromPort = 'right';
        toPort = 'left';
      } else {
        fromPort = 'left';
        toPort = 'right';
      }
    }

    return {
      ...edge,
      fromPort,
      toPort
    };
  });

  return { nodes: positionedNodes, edges: routedEdges };
}
