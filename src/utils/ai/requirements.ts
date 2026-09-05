import { FlowProject, NodeType } from '../../types/flow';
import {
  normalizeEntities,
  isConstraintText,
  isZoneGroup
} from './semanticNormalizer';

export type GraphIntent =
  | 'CREATE'
  | 'ADD'
  | 'UPDATE'
  | 'REMOVE'
  | 'REARRANGE'
  | 'CONNECT'
  | 'DISCONNECT'
  | 'STYLE'
  | 'GROUP'
  | 'UNGROUP'
  | 'REFACTOR'
  | 'EXPLAIN';

export type ArchitectureTier =
  | 'frontend'
  | 'gateway'
  | 'service'
  | 'queue'
  | 'cache'
  | 'database'
  | 'storage'
  | 'external';

export interface GraphRequirement {
  id: string; // e.g. "REQ-001"
  kind: 'node' | 'edge' | 'group' | 'constraint';
  text: string;
  normalizedName: string;
  explicit: boolean;
  tier: ArchitectureTier;
  suggestedNodeType: NodeType;
  sourceReference?: string;
  targetReference?: string;
  edgeLabel?: string;
}

export interface IntentClassification {
  primaryIntent: GraphIntent;
  isMutation: boolean;
  preserveExisting: boolean;
  reasons: string[];
}

/**
 * Classifies the user prompt into precise graph operations intents.
 */
export function classifyIntent(
  prompt: string,
  currentGraph?: FlowProject
): IntentClassification {
  const q = prompt.toLowerCase();
  const reasons: string[] = [];

  const hasNodes = Boolean(currentGraph && currentGraph.nodes && currentGraph.nodes.length > 0);

  // Check explicit preservation flags
  const preserveExisting =
    q.includes('do not remove') ||
    q.includes('dont remove') ||
    q.includes("don't remove") ||
    q.includes('preserve') ||
    q.includes('keep existing') ||
    q.includes('without removing') ||
    q.includes('do not replace') ||
    q.includes('dont replace') ||
    q.includes("don't replace");

  if (preserveExisting) {
    reasons.push('Prompt explicitly requests preserving existing components.');
  }

  // Check for explicit deletion
  const isRemove =
    q.includes('remove') ||
    q.includes('delete') ||
    q.includes('drop') ||
    q.includes('strip');

  // Check for explicit connection / edge manipulation
  const isConnect =
    q.includes('connect') ||
    q.includes('link') ||
    q.includes('arrow from') ||
    q.includes('pipe to');

  // Check for rearrangement / layout
  const isRearrange =
    q.includes('rearrange') ||
    q.includes('realign') ||
    q.includes('re-layout') ||
    q.includes('relayout') ||
    q.includes('organize') ||
    q.includes('move');

  // Check for grouping
  const isGroup =
    q.includes('group') ||
    q.includes('container') ||
    q.includes('cluster');

  // Check for refactoring / cleaning
  const isRefactor =
    q.includes('clean up') ||
    q.includes('refactor') ||
    q.includes('simplify') ||
    q.includes('beautify');

  // Check for add / append
  const isAdd =
    q.includes('add ') ||
    q.includes('insert ') ||
    q.includes('append ') ||
    q.includes('include ') ||
    q.includes('also add') ||
    q.includes('plus ') ||
    q.includes('introduce');

  // Check for brand new diagram intent
  const isExplicitCreate =
    q.includes('create new') ||
    q.includes('start over') ||
    q.includes('scratch') ||
    q.includes('replace all') ||
    q.includes('from zero') ||
    q.includes('brand new');

  if (!hasNodes || isExplicitCreate) {
    return {
      primaryIntent: 'CREATE',
      isMutation: false,
      preserveExisting: false,
      reasons: [hasNodes ? 'Explicit new diagram creation requested' : 'Canvas is empty, creating initial diagram']
    };
  }

  if (isRemove) {
    return { primaryIntent: 'REMOVE', isMutation: true, preserveExisting, reasons: ['Detected removal/deletion keywords'] };
  }

  if (isGroup) {
    return { primaryIntent: 'GROUP', isMutation: true, preserveExisting, reasons: ['Detected grouping/container keywords'] };
  }

  if (isRearrange) {
    return { primaryIntent: 'REARRANGE', isMutation: true, preserveExisting, reasons: ['Detected rearrangement/move keywords'] };
  }

  if (isConnect) {
    return { primaryIntent: 'CONNECT', isMutation: true, preserveExisting, reasons: ['Detected connection/edge wiring keywords'] };
  }

  if (isRefactor) {
    return { primaryIntent: 'REFACTOR', isMutation: true, preserveExisting, reasons: ['Detected architecture refactoring keywords'] };
  }

  if (isAdd || preserveExisting) {
    return { primaryIntent: 'ADD', isMutation: true, preserveExisting, reasons: ['Detected addition or component preservation keywords'] };
  }

  return {
    primaryIntent: 'ADD',
    isMutation: true,
    preserveExisting: true,
    reasons: ['Canvas has existing components; default to incremental delta modification']
  };
}

/**
 * Normalizes an architectural component name for reliable comparison and matching.
 */
export function normalizeComponentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+(service|server|component|microservice|cluster|db|database|replica|store|instance|node)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Maps a keyword or entity name to its architectural tier and suggested NodeType.
 */
export function inferTierAndType(name: string): { tier: ArchitectureTier; nodeType: NodeType } {
  const n = name.toLowerCase();

  // Frontend / Client
  if (n.includes('client') || n.includes('browser') || n.includes('ui') || n.includes('frontend') || n.includes('web app') || n.includes('mobile') || n.includes('app')) {
    return { tier: 'frontend', nodeType: 'browser' };
  }

  // Gateway / Ingress / Proxy
  if (n.includes('gateway') || n.includes('ingress') || n.includes('proxy') || n.includes('load balancer') || n.includes('cdn') || n.includes('envoy') || n.includes('nginx') || n.includes('rate limit') || n.includes('limiter') || n.includes('waf') || n.includes('firewall')) {
    return { tier: 'gateway', nodeType: 'gateway' };
  }

  // External APIs & Third-Party Providers
  if (n.includes('provider') || n.includes('stripe') || n.includes('bkash') || n.includes('third party') || n.includes('external') || n.includes('sendgrid') || n.includes('twilio') || n.includes('oauth')) {
    return { tier: 'external', nodeType: 'cloud' };
  }

  // Queues / Workers / Asynchronous Eventing
  if (n.includes('queue') || n.includes('kafka') || n.includes('rabbit') || n.includes('sqs') || n.includes('worker') || n.includes('pubsub') || n.includes('event')) {
    return { tier: 'queue', nodeType: 'queue' };
  }

  // Caching
  if (n.includes('cache') || n.includes('redis') || n.includes('memcache')) {
    return { tier: 'cache', nodeType: 'cache' };
  }

  // Databases & Persistence
  if (n.includes('database') || n.includes('db') || n.includes('postgres') || n.includes('mysql') || n.includes('mongo') || n.includes('replica') || n.includes('dynamo') || n.includes('cockroach') || n.includes('cassandra') || n.includes('search index') || n.includes('analytics db')) {
    return { tier: 'database', nodeType: 'database' };
  }

  // Storage
  if (n.includes('storage') || n.includes('s3') || n.includes('blob') || n.includes('bucket') || n.includes('minio')) {
    return { tier: 'storage', nodeType: 'storage' };
  }

  // Specific backend services
  if (n.includes('auth') || n.includes('jwt') || n.includes('login') || n.includes('identity')) {
    return { tier: 'service', nodeType: 'auth' };
  }

  // Default core backend service
  return { tier: 'service', nodeType: 'server' };
}

/**
 * Extracts traceable architectural requirements from the prompt.
 * Strictly separates:
 * 1. NODES: Actual deployable services and components
 * 2. GROUPS: Architectural zones / containers (Frontend, Backend, Infrastructure, Data)
 * 3. CONSTRAINTS: Layout & styling rules (e.g. "Keep left-to-right", "Use consistent node sizes")
 * 4. EDGES: Explicit communication relationships
 */
export function extractRequirements(
  prompt: string,
  _currentGraph?: FlowProject
): {
  requirements: GraphRequirement[];
  tiers: Record<ArchitectureTier, GraphRequirement[]>;
  summary: string;
} {
  const reqs: GraphRequirement[] = [];
  let reqCounter = 1;

  const nextReqId = () => `REQ-${String(reqCounter++).padStart(3, '0')}`;

  const cleanPrompt = prompt.replace(/\r\n/g, '\n');

  // Candidate component words to search for
  const candidateKeywords = [
    'Client Browser', 'Web App', 'Mobile App',
    'API Gateway', 'Reverse Proxy', 'Load Balancer', 'CDN', 'Rate Limiter', 'WAF',
    'Auth Service', 'Authentication Service', 'Authentication', 'Identity Provider',
    'RBAC Service', 'RBAC', 'Role-Based Access Control', 'Permission Service',
    'User Service', 'Users Service', 'User Management', 'Tenant Service', 'Tenancy Service',
    'Project Service', 'Projects Service', 'Task Service', 'Tasks Service',
    'Comment Service', 'File Service', 'Files Service', 'Upload Service',
    'Notification Service', 'Notifications', 'Realtime Service', 'Websocket Service',
    'Billing Service', 'Payment Service', 'Checkout Service',
    'Search Service', 'Search Index', 'Elasticsearch', 'Meilisearch',
    'Analytics Service', 'Analytics DB', 'Analytics Database',
    'Audit Log Service', 'Audit Logs',
    'Redis Cache', 'Redis', 'Session Store', 'Memcached',
    'Message Queue', 'Queue', 'Kafka', 'RabbitMQ', 'Event Broker',
    'Background Worker', 'Notification Worker', 'Job Consumer',
    'PostgreSQL Primary', 'PostgreSQL Read Replica', 'PostgreSQL Replica', 'Users DB', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Object Storage', 'S3 Storage', 'S3 Bucket',
    'OAuth Provider', 'Payment Provider', 'Email Provider', 'Push Notification Provider'
  ];

  const rawMatches: string[] = [];

  // Check explicit phrases
  for (const candidate of candidateKeywords) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanPrompt)) {
      rawMatches.push(candidate);
    }
  }

  // Also parse bullet lists (e.g. "- RBAC", "* User Service")
  const bulletLines = cleanPrompt.match(/^[\s*•\-–+]+\s*([A-Za-z0-9_\- ]{2,40})/gm);
  if (bulletLines) {
    for (const line of bulletLines) {
      const trimmed = line.replace(/^[\s*•\-–+]+\s*/, '').trim();
      if (trimmed.length > 2 && trimmed.length < 40 && !trimmed.toLowerCase().startsWith('http')) {
        rawMatches.push(trimmed);
      }
    }
  }

  // Also parse colon-separated category headers and their list items (e.g. "Edge/API: API Gateway, Rate Limiter")
  const lines = cleanPrompt.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if line is an instruction / constraint
    if (isConstraintText(trimmedLine)) {
      reqs.push({
        id: nextReqId(),
        kind: 'constraint',
        text: trimmedLine,
        normalizedName: normalizeComponentName(trimmedLine),
        explicit: true,
        tier: 'service',
        suggestedNodeType: 'server'
      });
      continue;
    }

    // Check if line has a category header with colon: "Category: Item 1, Item 2, Item 3"
    const colonIdx = trimmedLine.indexOf(':');
    if (colonIdx > 0) {
      const headerPart = trimmedLine.slice(0, colonIdx).trim();
      const bodyPart = trimmedLine.slice(colonIdx + 1).trim();

      if (isZoneGroup(headerPart)) {
        rawMatches.push(headerPart);
      }

      if (bodyPart && !isConstraintText(bodyPart)) {
        const items = bodyPart
          .split(',')
          .map((it) => it.trim())
          .filter((it) => it.length > 1 && !isConstraintText(it));
        rawMatches.push(...items);
      }
    }
  }

  // Run Semantic Normalization Layer to deduplicate substrings and separate groups
  const norm = normalizeEntities(rawMatches);

  // Add Zone Groups as 'group' requirements
  for (const groupName of norm.groups) {
    reqs.push({
      id: nextReqId(),
      kind: 'group',
      text: groupName,
      normalizedName: normalizeComponentName(groupName),
      explicit: true,
      tier: 'service',
      suggestedNodeType: 'group'
    });
  }

  // Add Deduplicated Nodes
  for (const nodeName of norm.nodes) {
    const normName = normalizeComponentName(nodeName);
    const { tier, nodeType } = inferTierAndType(nodeName);
    reqs.push({
      id: nextReqId(),
      kind: 'node',
      text: nodeName,
      normalizedName: normName,
      explicit: true,
      tier,
      suggestedNodeType: nodeType
    });
  }

  // Parse explicit connection requirements (e.g. "Connect Auth Service to RBAC Service" or "Auth Service -> RBAC Service")
  const connectionRegex = /(?:and\s+|also\s+|then\s+)?(?:connect|link|wire|pipe)?\s*([A-Za-z0-9_\- ]{2,30})\s*(?:to|->|→)\s*([A-Za-z0-9_\- ]{2,30})/gi;
  let match;
  while ((match = connectionRegex.exec(cleanPrompt)) !== null) {
    const sourceRef = match[1].replace(/^(?:and\s+|also\s+|then\s+)*(?:connect|link|wire|pipe|route|add)\s+/i, '').trim();
    const targetRef = match[2].trim();
    if (sourceRef && targetRef && sourceRef.toLowerCase() !== targetRef.toLowerCase()) {
      reqs.push({
        id: nextReqId(),
        kind: 'edge',
        text: `${sourceRef} → ${targetRef}`,
        normalizedName: `${normalizeComponentName(sourceRef)}->${normalizeComponentName(targetRef)}`,
        explicit: true,
        tier: 'service',
        suggestedNodeType: 'server',
        sourceReference: sourceRef,
        targetReference: targetRef
      });
    }
  }

  const tiers: Record<ArchitectureTier, GraphRequirement[]> = {
    frontend: [],
    gateway: [],
    service: [],
    queue: [],
    cache: [],
    database: [],
    storage: [],
    external: []
  };

  reqs.forEach((r) => {
    tiers[r.tier]?.push(r);
  });

  return {
    requirements: reqs,
    tiers,
    summary: `Extracted ${reqs.length} traceable requirements (${reqs.filter((r) => r.kind === 'node').length} nodes, ${reqs.filter((r) => r.kind === 'edge').length} edges).`
  };
}
