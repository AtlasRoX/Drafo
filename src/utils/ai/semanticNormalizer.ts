export interface NormalizedEntity {
  name: string;
  category: 'node' | 'group' | 'constraint';
  tier?: 'frontend' | 'gateway' | 'service' | 'queue' | 'cache' | 'database' | 'storage' | 'external';
  isContainer?: boolean;
}

export interface NormalizationResult {
  nodes: string[];
  groups: string[];
  constraints: string[];
  duplicatesRemoved: string[];
}

// Patterns that represent layout or behavioral constraints, NOT graph nodes
const INSTRUCTION_PATTERNS = [
  /keep\s+(?:the\s+)?(?:architecture\s+)?(?:left-to-right|horizontal|vertical|top-to-bottom)/i,
  /use\s+consistent\s+node\s+sizes?/i,
  /include\s+(?:these\s+)?components?/i,
  /do\s+not\s+(?:remove|replace)\s+existing/i,
  /scale\s+to\s+\d+/i,
  /clean\s+(?:layout|design|look)/i,
  /make\s+(?:it\s+)?(?:clean|neat|readable)/i,
  /align\s+(?:nodes|components)/i,
  /avoid\s+(?:overlapping|crossings?)/i,
  /multi-tenant\s+saas/i,
  /architecture\s+(?:with|diagram)/i
];

// Architectural zones that represent containers/sections, NOT service cards
const ZONE_KEYWORDS = [
  'frontend',
  'clients',
  'client layer',
  'presentation',
  'presentation layer',
  'edge',
  'edge/api',
  'edge api',
  'edge / api',
  'api gateway layer',
  'api layer',
  'gateway layer',
  'ingress',
  'ingress layer',
  'backend services',
  'backend service',
  'backend',
  'microservices',
  'core services',
  'infrastructure',
  'infra',
  'data layer',
  'persistence',
  'persistence layer',
  'databases',
  'database layer',
  'datastores',
  'storage layer',
  'external services',
  'external service',
  'third-party services',
  'third party services',
  'external apis',
  'third parties'
];

/**
 * Checks whether a text string is an instruction or constraint rather than a node.
 */
export function isConstraintText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks whether a text string is an architectural zone / container name.
 */
export function isZoneGroup(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[:]/g, '').trim();
  const cleaned = normalized.replace(/[\/\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return ZONE_KEYWORDS.some((kw) => {
    const kwClean = kw.replace(/[\/\-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return kw === normalized || kw === cleaned || kwClean === cleaned;
  });
}

/**
 * Semantic Normalization Layer:
 * 1. Filters out layout constraints and instructions so they NEVER become nodes.
 * 2. Separates architectural zones (Clients, Backend Services, Data Layer) into containers.
 * 3. Deduplicates generic substrings (e.g. Redis + Redis Cache -> Redis Cache, Queue + Message Queue -> Message Queue).
 * 4. Strictly protects distinct architectural counterparts (Primary vs Replica, Service vs Database).
 */
export function normalizeEntities(rawEntities: string[]): NormalizationResult {
  const nodes: string[] = [];
  const groups: string[] = [];
  const constraints: string[] = [];
  const duplicatesRemoved: string[] = [];

  // Pass 1: Categorize raw strings
  const candidateNodeNames: string[] = [];

  for (const raw of rawEntities) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (isConstraintText(trimmed)) {
      constraints.push(trimmed);
      continue;
    }

    if (isZoneGroup(trimmed)) {
      if (!groups.includes(trimmed)) {
        groups.push(trimmed);
      }
      continue;
    }

    candidateNodeNames.push(trimmed);
  }

  // Pass 2: Semantic Deduplication & Disambiguation
  for (let i = 0; i < candidateNodeNames.length; i++) {
    const current = candidateNodeNames[i];
    const curLower = current.toLowerCase();

    // Check if this entity is a generic redundant substring of another entity in the list
    let isRedundantDuplicate = false;

    for (let j = 0; j < candidateNodeNames.length; j++) {
      if (i === j) continue;
      const other = candidateNodeNames[j];
      const otherLower = other.toLowerCase();

      // PROTECT DISTINCT COUNTERPARTS:
      // 1. Primary vs Replica
      const isOnePrimary = curLower.includes('primary') || otherLower.includes('primary');
      const isOneReplica = curLower.includes('replica') || otherLower.includes('replica');
      if (isOnePrimary && isOneReplica) {
        continue; // Keep both distinct!
      }

      // 2. Service vs Database / Storage
      const isOneService = curLower.includes('service') && !curLower.includes('database') && !curLower.includes('db');
      const isOneDb = (otherLower.includes('database') || otherLower.includes('db') || otherLower.includes('index')) && !otherLower.includes('service');
      if (isOneService && isOneDb && (curLower.includes('analytics') || curLower.includes('search'))) {
        continue; // Keep both distinct!
      }

      // 3. Distinct third-party providers
      const isProviderCurrent = curLower.includes('provider') || curLower.includes('oauth') || curLower.includes('payment') || curLower.includes('email') || curLower.includes('push');
      const isProviderOther = otherLower.includes('provider') || otherLower.includes('oauth') || otherLower.includes('payment') || otherLower.includes('email') || otherLower.includes('push');
      if (isProviderCurrent && isProviderOther && curLower !== otherLower) {
        continue; // Keep both distinct!
      }

      // GENERIC SUBSTRING DEDUPLICATION:
      // If current is "Redis" and other is "Redis Cache" -> "Redis" is redundant duplicate
      // If current is "Queue" and other is "Message Queue" -> "Queue" is redundant duplicate
      // If current is "PostgreSQL" and other is "PostgreSQL Primary" -> "PostgreSQL" is redundant duplicate
      if (
        otherLower.length > curLower.length &&
        otherLower.includes(curLower) &&
        (
          (curLower === 'redis' && otherLower.includes('redis cache')) ||
          (curLower === 'queue' && otherLower.includes('message queue')) ||
          (curLower === 'postgresql' && otherLower.includes('postgresql primary')) ||
          (curLower === 'postgres' && otherLower.includes('postgres')) ||
          (curLower === 'frontend' && (otherLower.includes('web app') || otherLower.includes('mobile app')))
        )
      ) {
        isRedundantDuplicate = true;
        duplicatesRemoved.push(current);
        break;
      }
    }

    if (!isRedundantDuplicate && !nodes.some((n) => n.toLowerCase() === curLower)) {
      nodes.push(current);
    }
  }

  return {
    nodes,
    groups,
    constraints,
    duplicatesRemoved
  };
}
