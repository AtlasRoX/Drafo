import { FlowProject, FlowNode, FlowEdge } from '../../types/flow';
import { GraphOperation, MutationPolicy } from './graphDelta';
import { resolveNodeId, normalizeTitle } from './identityResolver';

export interface TransactionResult {
  success: boolean;
  graph: FlowProject;
  appliedOperations: GraphOperation[];
  rejectedOperations: Array<{ op: GraphOperation; reason: string }>;
  error?: string;
}

/**
 * Deterministically executes a series of GraphOperations against an immutable clone of baseGraph.
 * Enforces:
 * - Transactional rollback (all or nothing if a critical safety policy fails)
 * - Operation idempotency (preventing duplicate nodes or identical edges)
 * - Strict entity resolution (rejecting ambiguous references on destructive ops)
 * - Protected object policies (preventing deletion of protected nodes/edges)
 */
export function executeGraphTransaction(
  baseGraph: FlowProject,
  operations: GraphOperation[],
  policy: MutationPolicy
): TransactionResult {
  if (!operations || operations.length === 0) {
    return {
      success: true,
      graph: baseGraph,
      appliedOperations: [],
      rejectedOperations: []
    };
  }

  // Work on an immutable clone of the base graph
  const candidateNodes: FlowNode[] = (baseGraph.nodes || []).map((n) => ({ ...n, style: { ...n.style } }));
  const candidateEdges: FlowEdge[] = (baseGraph.edges || []).map((e) => ({ ...e }));

  const appliedOperations: GraphOperation[] = [];
  const rejectedOperations: Array<{ op: GraphOperation; reason: string }> = [];

  for (const op of operations) {
    switch (op.op) {
      case 'add_node': {
        if (!policy.allowAdd) {
          rejectedOperations.push({ op, reason: 'Policy rejects adding new nodes.' });
          continue;
        }

        const rawNode = op.node;
        const normTitle = normalizeTitle(rawNode.title);

        // Idempotency check 1: Exact ID already exists
        const existingById = candidateNodes.find((n) => n.id === rawNode.id);
        if (existingById) {
          // Idempotent no-op
          appliedOperations.push(op);
          continue;
        }

        // Idempotency check 2: Exact normalized title already exists
        const existingByTitle = candidateNodes.find((n) => normalizeTitle(n.title) === normTitle);
        if (existingByTitle) {
          // Idempotent: Component already present on canvas
          appliedOperations.push(op);
          continue;
        }

        // Create standard node with defaults
        const newNode: FlowNode = {
          id: rawNode.id || `node-${Date.now()}-${candidateNodes.length + 1}`,
          type: rawNode.type || 'server',
          title: rawNode.title,
          subtitle: rawNode.subtitle || '',
          x: typeof rawNode.x === 'number' ? rawNode.x : 100,
          y: typeof rawNode.y === 'number' ? rawNode.y : 100,
          width: rawNode.width || 165,
          height: rawNode.height || 115,
          style: rawNode.style || {
            bg: '#FFFFFF',
            borderColor: '#2563EB',
            borderRadius: 12,
            textColor: '#0F172A'
          },
          sectionId: rawNode.sectionId
        };

        candidateNodes.push(newNode);
        appliedOperations.push(op);
        break;
      }

      case 'update_node': {
        if (!policy.allowUpdate) {
          rejectedOperations.push({ op, reason: 'Policy rejects updating nodes.' });
          continue;
        }

        const resolution = resolveNodeId(op.id, candidateNodes);
        if (resolution.status === 'AMBIGUOUS_REFERENCE') {
          // Safety violation: ambiguous reference
          return {
            success: false,
            graph: baseGraph,
            appliedOperations: [],
            rejectedOperations: [...rejectedOperations, { op, reason: `Ambiguous node reference: '${op.id}' matches multiple nodes.` }],
            error: `Ambiguous node reference: '${op.id}' matches multiple nodes.`
          };
        }

        if (resolution.status === 'NOT_FOUND' || !resolution.node) {
          rejectedOperations.push({ op, reason: `Node '${op.id}' not found for update.` });
          continue;
        }

        const targetNode = resolution.node;
        Object.assign(targetNode, op.patch);
        appliedOperations.push(op);
        break;
      }

      case 'remove_node': {
        if (!policy.allowDelete) {
          return {
            success: false,
            graph: baseGraph,
            appliedOperations: [],
            rejectedOperations: [...rejectedOperations, { op, reason: 'Deletion is disabled by policy (preserve existing components).' }],
            error: `Policy violation: Deletion is disallowed by current mutation policy.`
          };
        }

        const resolution = resolveNodeId(op.id, candidateNodes);
        if (resolution.status === 'AMBIGUOUS_REFERENCE') {
          return {
            success: false,
            graph: baseGraph,
            appliedOperations: [],
            rejectedOperations: [...rejectedOperations, { op, reason: `Cannot delete ambiguous node reference '${op.id}'.` }],
            error: `Cannot delete ambiguous node reference: '${op.id}'.`
          };
        }

        if (resolution.status === 'NOT_FOUND' || !resolution.node) {
          rejectedOperations.push({ op, reason: `Node '${op.id}' not found for removal.` });
          continue;
        }

        const targetId = resolution.node.id;
        if (policy.protectedNodeIds.has(targetId)) {
          return {
            success: false,
            graph: baseGraph,
            appliedOperations: [],
            rejectedOperations: [...rejectedOperations, { op, reason: `Node '${resolution.node.title}' (${targetId}) is protected.` }],
            error: `Safety violation: Node '${resolution.node.title}' (${targetId}) is protected against deletion.`
          };
        }

        // Remove node
        const nodeIndex = candidateNodes.findIndex((n) => n.id === targetId);
        if (nodeIndex !== -1) {
          candidateNodes.splice(nodeIndex, 1);
        }

        // Clean up connected dangling edges
        for (let i = candidateEdges.length - 1; i >= 0; i--) {
          if (candidateEdges[i].fromNodeId === targetId || candidateEdges[i].toNodeId === targetId) {
            candidateEdges.splice(i, 1);
          }
        }

        appliedOperations.push(op);
        break;
      }

      case 'move_node': {
        if (!policy.allowMove) {
          rejectedOperations.push({ op, reason: 'Policy rejects moving nodes.' });
          continue;
        }

        const resolution = resolveNodeId(op.id, candidateNodes);
        if (resolution.node) {
          resolution.node.x = op.position.x;
          resolution.node.y = op.position.y;
          appliedOperations.push(op);
        } else {
          rejectedOperations.push({ op, reason: `Node '${op.id}' not found to move.` });
        }
        break;
      }

      case 'resize_node': {
        const resolution = resolveNodeId(op.id, candidateNodes);
        if (resolution.node) {
          resolution.node.width = op.size.width;
          resolution.node.height = op.size.height;
          appliedOperations.push(op);
        } else {
          rejectedOperations.push({ op, reason: `Node '${op.id}' not found to resize.` });
        }
        break;
      }

      case 'add_edge': {
        const fromRes = resolveNodeId(op.edge.fromNodeId, candidateNodes);
        const toRes = resolveNodeId(op.edge.toNodeId, candidateNodes);

        if (fromRes.status === 'AMBIGUOUS_REFERENCE' || toRes.status === 'AMBIGUOUS_REFERENCE') {
          rejectedOperations.push({ op, reason: `Cannot wire edge: ambiguous source or target reference (${op.edge.fromNodeId} -> ${op.edge.toNodeId}).` });
          continue;
        }

        if (!fromRes.node || !toRes.node) {
          rejectedOperations.push({ op, reason: `Cannot wire edge: node not found (${op.edge.fromNodeId} or ${op.edge.toNodeId}).` });
          continue;
        }

        const fromId = fromRes.node.id;
        const toId = toRes.node.id;

        // Idempotency check: identical edge already exists
        const existingEdge = candidateEdges.find(
          (e) => e.fromNodeId === fromId && e.toNodeId === toId
        );
        if (existingEdge) {
          // Edge already present; treat as idempotent
          appliedOperations.push(op);
          continue;
        }

        const newEdge: FlowEdge = {
          id: op.edge.id || `edge-${fromId}-${toId}-${candidateEdges.length + 1}`,
          fromNodeId: fromId,
          toNodeId: toId,
          fromPort: op.edge.fromPort || 'right',
          toPort: op.edge.toPort || 'left',
          label: op.edge.label || '',
          lineStyle: op.edge.lineStyle || 'solid',
          routeType: op.edge.routeType || 'straight',
          color: op.edge.color || '#2563EB',
          width: op.edge.width || 2,
          arrowhead: op.edge.arrowhead || 'arrow',
          isAnimated: op.edge.isAnimated ?? true
        };

        candidateEdges.push(newEdge);
        appliedOperations.push(op);
        break;
      }

      case 'update_edge': {
        const edge = candidateEdges.find((e) => e.id === op.id);
        if (edge) {
          Object.assign(edge, op.patch);
          appliedOperations.push(op);
        } else {
          rejectedOperations.push({ op, reason: `Edge '${op.id}' not found.` });
        }
        break;
      }

      case 'remove_edge': {
        const edgeIndex = candidateEdges.findIndex((e) => e.id === op.id);
        if (edgeIndex !== -1) {
          if (policy.protectedEdgeIds.has(op.id)) {
            rejectedOperations.push({ op, reason: `Edge '${op.id}' is protected against deletion.` });
            continue;
          }
          candidateEdges.splice(edgeIndex, 1);
          appliedOperations.push(op);
        } else {
          rejectedOperations.push({ op, reason: `Edge '${op.id}' not found for removal.` });
        }
        break;
      }

      case 'group_nodes': {
        // Resolve all member IDs
        const resolvedIds: string[] = [];
        for (const ref of op.nodeIds) {
          const res = resolveNodeId(ref, candidateNodes);
          if (res.node) resolvedIds.push(res.node.id);
        }

        if (resolvedIds.length > 0) {
          // Add section / container tag to each node
          resolvedIds.forEach((id) => {
            const n = candidateNodes.find((cand) => cand.id === id);
            if (n) n.sectionId = op.groupId;
          });
          appliedOperations.push(op);
        }
        break;
      }

      case 'ungroup_nodes': {
        candidateNodes.forEach((n) => {
          if (n.sectionId === op.groupId) {
            n.sectionId = undefined;
          }
        });
        appliedOperations.push(op);
        break;
      }
    }
  }

  const updatedGraph: FlowProject = {
    ...baseGraph,
    updatedAt: new Date().toISOString(),
    nodes: candidateNodes,
    edges: candidateEdges
  };

  return {
    success: true,
    graph: updatedGraph,
    appliedOperations,
    rejectedOperations
  };
}
