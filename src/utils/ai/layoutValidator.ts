import { FlowProject, FlowNode } from '../../types/flow';

export interface LayoutValidationResult {
  overlaps: number;
  crossingEdges: number;
  labelCollisions: number;
  issues: string[];
  isClean: boolean;
}

/**
 * Checks if two rectangular node bounding boxes overlap.
 */
function boxesOverlap(a: FlowNode, b: FlowNode, padding = 10): boolean {
  const aLeft = a.x - padding;
  const aRight = a.x + a.width + padding;
  const aTop = a.y - padding;
  const aBottom = a.y + a.height + padding;

  const bLeft = b.x;
  const bRight = b.x + b.width;
  const bTop = b.y;
  const bBottom = b.y + b.height;

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
}

/**
 * Incremental constraint-based layout engine.
 * Crucial rule: Preserves the exact positions of all existing nodes,
 * and positions newly added nodes adjacent to their connected neighbors or in an adjacent tier,
 * resolving any bounding box collisions.
 */
export function incrementalLayout(
  graph: FlowProject,
  addedNodeIds: Set<string>
): FlowProject {
  const nodes = (graph.nodes || []).map((n) => ({ ...n }));
  const edges = graph.edges || [];

  if (addedNodeIds.size === 0) {
    return graph;
  }

  const existingNodes = nodes.filter((n) => !addedNodeIds.has(n.id));
  const newNodes = nodes.filter((n) => addedNodeIds.has(n.id));

  // Determine current canvas bounds
  let maxX = 0;
  let maxY = 0;
  existingNodes.forEach((n) => {
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  // Position each newly added node
  newNodes.forEach((newNode) => {
    // Check if new node has an incoming edge from an existing node
    const incomingEdge = edges.find(
      (e) => e.toNodeId === newNode.id && !addedNodeIds.has(e.fromNodeId)
    );

    // Check if new node has an outgoing edge to an existing node
    const outgoingEdge = edges.find(
      (e) => e.fromNodeId === newNode.id && !addedNodeIds.has(e.toNodeId)
    );

    let targetX = 0;
    let targetY = 0;

    if (incomingEdge) {
      const sourceNode = existingNodes.find((n) => n.id === incomingEdge.fromNodeId);
      if (sourceNode) {
        targetX = Math.round((sourceNode.x + sourceNode.width + 80) / 40) * 40;
        targetY = sourceNode.y;
      }
    } else if (outgoingEdge) {
      const destNode = existingNodes.find((n) => n.id === outgoingEdge.toNodeId);
      if (destNode) {
        targetX = Math.max(60, Math.round((destNode.x - newNode.width - 80) / 40) * 40);
        targetY = destNode.y;
      }
    } else {
      // Disconnected or peer to another new node
      targetX = Math.round((maxX > 0 ? maxX + 80 : 80) / 40) * 40;
      targetY = 140;
    }

    newNode.x = targetX;
    newNode.y = targetY;

    // Resolve any collision with existing placed nodes by pushing downwards
    let hasCollision = true;
    let attempts = 0;
    while (hasCollision && attempts < 20) {
      hasCollision = false;
      for (const other of nodes) {
        if (other.id !== newNode.id && boxesOverlap(newNode, other)) {
          hasCollision = true;
          // Shift vertically below the collided node
          newNode.y = Math.round((other.y + other.height + 40) / 40) * 40;
          break;
        }
      }
      attempts++;
    }
  });

  return {
    ...graph,
    nodes
  };
}

/**
 * Visual & Layout Validator.
 * Analyzes layout cleanliness: overlaps, crossing lines, out of bounds.
 */
export function validateLayout(graph: FlowProject): LayoutValidationResult {
  const nodes = graph.nodes || [];
  const issues: string[] = [];
  let overlaps = 0;

  // Check 1: Node overlaps
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (boxesOverlap(nodes[i], nodes[j])) {
        overlaps++;
        issues.push(`Collision between "${nodes[i].title}" and "${nodes[j].title}"`);
      }
    }
  }

  // Check 2: Out of bounds (negative coordinates)
  nodes.forEach((n) => {
    if (n.x < 0 || n.y < 0) {
      issues.push(`Node "${n.title}" has negative coordinates (${n.x}, ${n.y})`);
    }
  });

  return {
    overlaps,
    crossingEdges: 0, // Placeholder for geometric segment intersection
    labelCollisions: 0,
    issues,
    isClean: overlaps === 0 && issues.length === 0
  };
}
