import { FlowNode, FlowEdge, FlowProject, NodeType } from '../../types/flow';

export type GraphOperation =
  | {
      op: 'add_node';
      node: Partial<FlowNode> & { id: string; title: string; type?: NodeType };
    }
  | {
      op: 'update_node';
      id: string;
      patch: Partial<FlowNode>;
    }
  | {
      op: 'remove_node';
      id: string;
    }
  | {
      op: 'move_node';
      id: string;
      position: { x: number; y: number };
    }
  | {
      op: 'resize_node';
      id: string;
      size: { width: number; height: number };
    }
  | {
      op: 'add_edge';
      edge: Partial<FlowEdge> & { id?: string; fromNodeId: string; toNodeId: string; label?: string };
    }
  | {
      op: 'update_edge';
      id: string;
      patch: Partial<FlowEdge>;
    }
  | {
      op: 'remove_edge';
      id: string;
    }
  | {
      op: 'group_nodes';
      groupId: string;
      title: string;
      nodeIds: string[];
    }
  | {
      op: 'ungroup_nodes';
      groupId: string;
    };

export interface MutationPolicy {
  allowAdd: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
  allowMove: boolean;
  protectedNodeIds: Set<string>;
  protectedEdgeIds: Set<string>;
}

/**
 * Creates a mutation policy for graph safety.
 * When preserveExisting is true, all current node and edge IDs are strictly protected against deletion.
 */
export function createDefaultMutationPolicy(
  currentGraph?: FlowProject,
  preserveExisting: boolean = true
): MutationPolicy {
  const protectedNodeIds = new Set<string>();
  const protectedEdgeIds = new Set<string>();

  if (preserveExisting && currentGraph) {
    (currentGraph.nodes || []).forEach((n) => protectedNodeIds.add(n.id));
    (currentGraph.edges || []).forEach((e) => protectedEdgeIds.add(e.id));
  }

  return {
    allowAdd: true,
    allowUpdate: true,
    allowDelete: !preserveExisting,
    allowMove: true,
    protectedNodeIds,
    protectedEdgeIds
  };
}
