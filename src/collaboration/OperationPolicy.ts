/**
 * Drafo Operation Policy
 *
 * Categorizes mutations and message envelopes into explicit operational classes
 * before queuing to ensure strict CRDT convergence invariants:
 *
 * 1. Durable operations (node/edge mutations, deletions, property edits) CAN NEVER BE DROPPED.
 * 2. Coalescible operations (transient drag movements) can be coalesced into the latest vector.
 *    (Coalescing is an optimization of transport, never permission to discard state transitions).
 * 3. Ephemeral operations (presence, cursors, hover) are non-blocking and drop-eligible.
 */

export type OperationClass = 'EPHEMERAL' | 'COALESCIBLE' | 'DURABLE';

export interface OperationDescriptor {
  type: string;
  entityType?: 'node' | 'edge' | 'section' | 'metadata' | 'cursor' | 'selection';
  entityId?: string;
  isTransientDrag?: boolean;
}

export function classifyOperation(desc: OperationDescriptor): OperationClass {
  // 1. Ephemeral Presence
  if (
    desc.type === 'cursor' ||
    desc.type === 'hover' ||
    desc.type === 'selection' ||
    desc.entityType === 'cursor' ||
    desc.entityType === 'selection'
  ) {
    return 'EPHEMERAL';
  }

  // 2. Coalescible Transient Position Updates (during active mouse dragging)
  if (desc.isTransientDrag === true || desc.type === 'node-drag-move') {
    return 'COALESCIBLE';
  }

  // 3. Durable Structural Mutations (Create, delete, rename, edge change, property edit)
  return 'DURABLE';
}

export function isDropEligible(opClass: OperationClass): boolean {
  return opClass === 'EPHEMERAL';
}

export function isCoalescible(opClass: OperationClass): boolean {
  return opClass === 'COALESCIBLE';
}

export function isDurable(opClass: OperationClass): boolean {
  return opClass === 'DURABLE';
}
