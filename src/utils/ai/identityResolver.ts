import { FlowNode } from '../../types/flow';

export interface IdentityResolutionResult {
  status: 'EXACT_ID' | 'NORMALIZED_TITLE' | 'CASE_INSENSITIVE' | 'AMBIGUOUS_REFERENCE' | 'NOT_FOUND';
  node?: FlowNode;
  candidates?: FlowNode[];
  method?: string;
}

/**
 * Normalizes a title for robust architectural identity comparison.
 * e.g., "  Auth Service  " -> "auth service"
 */
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves a reference string (ID, label, or title) to an authoritative FlowNode in the graph.
 * Follows a strict hierarchy:
 * 1. Exact node ID
 * 2. Exact normalized title
 * 3. Unique case-insensitive match
 * 4. Multiple matches -> AMBIGUOUS_REFERENCE (never silently guess)
 * 5. Zero matches -> NOT_FOUND
 */
export function resolveNodeId(
  reference: string,
  nodes: FlowNode[]
): IdentityResolutionResult {
  if (!reference || !reference.trim()) {
    return { status: 'NOT_FOUND' };
  }

  const cleanRef = reference.trim();
  const lowerRef = cleanRef.toLowerCase();
  const normRef = normalizeTitle(cleanRef);

  // 1. Exact Node ID match
  const exactId = nodes.find((n) => n.id === cleanRef);
  if (exactId) {
    return { status: 'EXACT_ID', node: exactId, method: 'exact_id' };
  }

  // 2. Exact Case-Insensitive ID match
  const lowerId = nodes.find((n) => n.id.toLowerCase() === lowerRef);
  if (lowerId) {
    return { status: 'EXACT_ID', node: lowerId, method: 'case_insensitive_id' };
  }

  // 3. Exact Normalized Title match
  const normalizedMatches = nodes.filter((n) => normalizeTitle(n.title) === normRef);
  if (normalizedMatches.length === 1) {
    return { status: 'NORMALIZED_TITLE', node: normalizedMatches[0], method: 'normalized_title' };
  }
  if (normalizedMatches.length > 1) {
    return { status: 'AMBIGUOUS_REFERENCE', candidates: normalizedMatches };
  }

  // 4. Case-Insensitive Title match
  const titleMatches = nodes.filter((n) => n.title.trim().toLowerCase() === lowerRef);
  if (titleMatches.length === 1) {
    return { status: 'CASE_INSENSITIVE', node: titleMatches[0], method: 'case_insensitive_title' };
  }
  if (titleMatches.length > 1) {
    return { status: 'AMBIGUOUS_REFERENCE', candidates: titleMatches };
  }

  // 5. Subtitle or normalized prefix match if unique
  const subtitleMatches = nodes.filter((n) => n.subtitle && normalizeTitle(n.subtitle) === normRef);
  if (subtitleMatches.length === 1) {
    return { status: 'NORMALIZED_TITLE', node: subtitleMatches[0], method: 'normalized_subtitle' };
  }
  if (subtitleMatches.length > 1) {
    return { status: 'AMBIGUOUS_REFERENCE', candidates: subtitleMatches };
  }

  return { status: 'NOT_FOUND' };
}
