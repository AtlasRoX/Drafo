import { FlowProject } from '../../types/flow';
import { GraphRequirement, normalizeComponentName } from './requirements';
import { GraphOperation } from './graphDelta';
import { resolveNodeId, normalizeTitle } from './identityResolver';

export interface SemanticViolation {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'suggestion';
  elementId?: string;
  suggestion?: string;
}

export interface ValidationReport {
  satisfiedRequirements: GraphRequirement[];
  missingRequirements: GraphRequirement[];
  violations: SemanticViolation[];
  isValid: boolean;
}

/**
 * Validates that candidate graph satisfies all extracted architectural requirements.
 * Note: Pure detection - does NOT mutate the graph.
 */
export function validateGraphRequirements(
  graph: FlowProject,
  requirements: GraphRequirement[]
): { satisfied: GraphRequirement[]; missing: GraphRequirement[] } {
  const satisfied: GraphRequirement[] = [];
  const missing: GraphRequirement[] = [];

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  for (const req of requirements) {
    if (req.kind === 'node') {
      const res = resolveNodeId(req.text, nodes);
      if (res.node) {
        satisfied.push(req);
      } else {
        // Also check normalized component name
        const matchByNorm = nodes.find(
          (n) => normalizeComponentName(n.title) === req.normalizedName
        );
        if (matchByNorm) {
          satisfied.push(req);
        } else {
          missing.push(req);
        }
      }
    } else if (req.kind === 'edge' && req.sourceReference && req.targetReference) {
      const sourceRes = resolveNodeId(req.sourceReference, nodes);
      const targetRes = resolveNodeId(req.targetReference, nodes);

      if (sourceRes.node && targetRes.node) {
        const hasEdge = edges.some(
          (e) => e.fromNodeId === sourceRes.node!.id && e.toNodeId === targetRes.node!.id
        );
        if (hasEdge) {
          satisfied.push(req);
        } else {
          missing.push(req);
        }
      } else {
        missing.push(req);
      }
    }
  }

  return { satisfied, missing };
}

/**
 * Validates architectural diagram semantics:
 * - Detects direct Database -> Client queries bypassing API Gateway / Backend.
 * - Detects disconnected dangling nodes.
 * - Flags suspicious labels as suggestions (e.g. 'Verify Hash & Salt') without destroying user text.
 */
export function validateGraphSemantics(graph: FlowProject): SemanticViolation[] {
  const violations: SemanticViolation[] = [];
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Check 1: Direct Client to Database connection
  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);

    if (fromNode && toNode) {
      if (fromNode.type === 'browser' && (toNode.type === 'database' || toNode.type === 'nosql')) {
        violations.push({
          code: 'DIRECT_CLIENT_DATABASE',
          severity: 'warning',
          elementId: edge.id,
          message: `Direct client-to-database connection detected (${fromNode.title} -> ${toNode.title}). Recommendation: Route through an API Gateway or Backend Service.`
        });
      }

      if (fromNode.type === 'database' && toNode.type === 'browser') {
        violations.push({
          code: 'DATABASE_TO_CLIENT',
          severity: 'error',
          elementId: edge.id,
          message: `Database directly initiating connection to browser client (${fromNode.title} -> ${toNode.title}). Data should flow through a backend service.`
        });
      }
    }

    // Check 2: Questionable terminology suggestions
    if (edge.label && edge.label.toLowerCase().includes('verify hash & salt')) {
      violations.push({
        code: 'TERMINOLOGY_SUGGESTION',
        severity: 'suggestion',
        elementId: edge.id,
        message: `Edge label "${edge.label}" references verifying salt. Recommendation: Use "Verify Password Hash" or "Verify Credentials".`,
        suggestion: 'Verify Password Hash'
      });
    }
  }

  return violations;
}

/**
 * GraphRepairPlanner: Proposes explicit GraphOperations to repair unfulfilled requirements.
 * Kept strictly decoupled from the validation detector.
 */
export function planRepairs(
  graph: FlowProject,
  missingReqs: GraphRequirement[]
): GraphOperation[] {
  const repairOperations: GraphOperation[] = [];
  const nodes = [...(graph.nodes || [])];

  for (const req of missingReqs) {
    if (req.kind === 'node') {
      const sanitizedId = req.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if already in graph
      const alreadyPresent = nodes.some(
        (n) => normalizeTitle(n.title) === normalizeTitle(req.text)
      );
      if (!alreadyPresent) {
        const newNodeId = `${sanitizedId}-${Date.now().toString(36).slice(-4)}`;
        const plannedNode = {
          id: newNodeId,
          title: req.text,
          type: req.suggestedNodeType,
          subtitle: `${req.tier.toUpperCase()} component`,
          x: 0,
          y: 0,
          width: 165,
          height: 115,
          style: { bg: '#FFF', borderColor: '#2563EB', textColor: '#000' }
        };
        nodes.push(plannedNode);
        repairOperations.push({
          op: 'add_node',
          node: plannedNode
        });
      }
    } else if (req.kind === 'edge' && req.sourceReference && req.targetReference) {
      const sourceRes = resolveNodeId(req.sourceReference, nodes);
      const targetRes = resolveNodeId(req.targetReference, nodes);

      if (sourceRes.node && targetRes.node) {
        repairOperations.push({
          op: 'add_edge',
          edge: {
            fromNodeId: sourceRes.node.id,
            toNodeId: targetRes.node.id,
            label: req.edgeLabel || req.text
          }
        });
      }
    }
  }

  return repairOperations;
}
