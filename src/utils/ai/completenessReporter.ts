import { FlowProject } from '../../types/flow';
import { NormalizationResult } from './semanticNormalizer';
import { normalizeTitle } from './identityResolver';

export interface CompletenessReport {
  requested: string[];
  found: string[];
  missing: string[];
  duplicated: string[];
  invented: string[];
  groups: string[];
  isComplete: boolean;
}

/**
 * Compares the explicitly requested architectural entities against the final graph
 * and generates a transparent completeness and integrity audit report.
 */
export function generateCompletenessReport(
  requestedEntities: string[],
  graph: FlowProject,
  norm: NormalizationResult
): CompletenessReport {
  const nodes = graph.nodes || [];
  const found: string[] = [];
  const missing: string[] = [];
  const invented: string[] = [];

  const graphNodeTitles = nodes.map((n) => n.title);
  const graphNormalizedTitles = nodes.map((n) => normalizeTitle(n.title));

  // Check each normalized requested node
  for (const req of norm.nodes) {
    const normReq = normalizeTitle(req);
    const matchIndex = graphNormalizedTitles.findIndex((g) => g === normReq || g.includes(normReq) || normReq.includes(g));

    if (matchIndex !== -1) {
      found.push(req);
    } else {
      missing.push(req);
    }
  }

  // Check for invented/unrequested nodes
  for (const gTitle of graphNodeTitles) {
    const normG = normalizeTitle(gTitle);
    const isRequested = norm.nodes.some((r) => {
      const normR = normalizeTitle(r);
      return normR === normG || normG.includes(normR) || normR.includes(normG);
    });

    if (!isRequested) {
      invented.push(gTitle);
    }
  }

  return {
    requested: norm.nodes,
    found,
    missing,
    duplicated: norm.duplicatesRemoved,
    invented,
    groups: norm.groups,
    isComplete: missing.length === 0
  };
}
