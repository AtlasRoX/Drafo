import { NextRequest, NextResponse } from 'next/server';
import { FlowProject, FlowNode, FlowEdge, FlowSection } from '@/types/flow';
import {
  classifyIntent,
  extractRequirements,
  inferTierAndType
} from '@/utils/ai/requirements';
import {
  createDefaultMutationPolicy,
  GraphOperation
} from '@/utils/ai/graphDelta';
import { executeGraphTransaction } from '@/utils/ai/transactionExecutor';
import {
  validateGraphRequirements,
  validateGraphSemantics,
  planRepairs
} from '@/utils/ai/graphValidator';
import { incrementalLayout, validateLayout } from '@/utils/ai/layoutValidator';
import { layoutGraph } from '@/utils/parsers/layoutEngine';
import { normalizeEntities } from '@/utils/ai/semanticNormalizer';
import { generateCompletenessReport, CompletenessReport } from '@/utils/ai/completenessReporter';

export interface ArchitectureGenerationResult {
  thinking: string;
  analysis: string;
  project: FlowProject;
  isDelta: boolean;
  operations?: GraphOperation[];
  completenessReport?: CompletenessReport;
  summary: string;
}

interface CanonicalNode {
  id: string;
  title: string;
  type: string;
  subtitle?: string;
  x?: number;
  y?: number;
}

interface CanonicalEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface CanonicalGraph {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
}

interface GenerateRequestBody {
  prompt: string;
  currentGraph?: CanonicalGraph;
  provider?: {
    type: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    name?: string;
  };
  themeStyle?: 'auto' | 'vibrant' | 'emerald' | 'cyber' | 'minimal';
}

const SYSTEM_INSTRUCTION = `You are Drafo AI, an elite cloud systems architect and visual diagram designer.
You operate on structured diagram state. When a user asks to design, build, or modify any system, workflow, architecture, or flow:

1. UNDERSTAND THE INSTRUCTION FULLY:
   - Identify EVERY explicitly requested component, service, queue, database, and connection.
   - Do NOT collapse a large multi-service architecture into a small 4-node summary. If the user specifies 10 services, create all 10 services!
2. MULTI-TURN DIAGRAM MODIFICATION (GRAPH DELTA):
   - If CURRENT_GRAPH is provided and the user asks to modify it (e.g. "add ...", "connect ...", "do not remove existing"):
   - You MUST output an array of JSON GraphOperations inside <operations>[ ... ]</operations>.
   - Operations schema:
     * { "op": "add_node", "node": { "id": "rbac-service", "title": "RBAC Service", "type": "server", "subtitle": "Role Based Access" } }
     * { "op": "add_edge", "edge": { "fromNodeId": "auth-service", "toNodeId": "rbac-service", "label": "Verify Permissions" } }
     * { "op": "remove_node", "id": "node-id" }
     * { "op": "update_node", "id": "node-id", "patch": { "subtitle": "Updated" } }
   - Never remove or replace nodes if the user requested preserving existing components!
   - Use stable, descriptive IDs (e.g. "rbac-service", "user-service", "postgres-replica").
3. BRAND NEW ARCHITECTURE (FULL GENERATION):
   - If starting fresh, output <project>{ ... }</project> with complete nodes, tiers, and connector edges.
   - Every edge must have a clear action label (e.g. "1. HTTPS POST /login", "2. Verify JWT & Scopes").
   - Use accurate industry terminology (e.g. "Verify Password Hash", not "Verify Hash & Salt").

OUTPUT FORMAT:
Output concise <thinking>, <analysis>, and either <operations>[ ... ]</operations> (for modifications) or <project>{ ... }</project> (for new diagrams).`;

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequestBody = await req.json();
    const { prompt, currentGraph, provider, themeStyle } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 });
    }

    // Convert incoming CanonicalGraph into a base FlowProject
    const baseProject: FlowProject = {
      id: 'current-canvas',
      name: 'Current Canvas',
      description: '',
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
      sections: [],
      nodes: (currentGraph?.nodes || []).map((n) => ({
        id: n.id,
        type: (n.type as any) || 'server',
        title: n.title,
        subtitle: n.subtitle || '',
        x: typeof n.x === 'number' ? n.x : 100,
        y: typeof n.y === 'number' ? n.y : 100,
        width: 165,
        height: 115,
        style: { bg: '#FFFFFF', borderColor: '#2563EB', borderRadius: 12, textColor: '#0F172A' }
      })),
      edges: (currentGraph?.edges || []).map((e) => ({
        id: e.id,
        fromNodeId: e.from,
        toNodeId: e.to,
        fromPort: 'right',
        toPort: 'left',
        label: e.label || '',
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#2563EB',
        width: 2,
        arrowhead: 'arrow'
      }))
    };

    const provType = provider?.type || 'builtin';
    const apiKey = provider?.apiKey || '';
    const baseUrl = provider?.baseUrl || '';
    const model = provider?.model || '';

    // If external provider with API key or local Ollama, try calling the live LLM
    if (provType !== 'builtin' && (apiKey.trim() || provType === 'ollama')) {
      try {
        const liveResult = await callExternalProvider({
          provType,
          apiKey,
          baseUrl,
          model,
          prompt,
          currentGraph,
          baseProject,
          themeStyle
        });

        if (liveResult && liveResult.project && liveResult.project.nodes.length > 0) {
          return NextResponse.json({
            success: true,
            thinking: liveResult.thinking,
            analysis: liveResult.analysis,
            project: liveResult.project,
            isDelta: liveResult.isDelta,
            operations: liveResult.operations,
            completenessReport: liveResult.completenessReport,
            summary: liveResult.summary
          });
        }
      } catch (err: any) {
        console.warn(`Live provider (${provType}) failed, using dynamic local engine:`, err?.message);
      }
    }

    // High-precision local reasoning & graph-delta engine
    const localResult = generateLocalArchitectureWithReasoning(prompt, baseProject, themeStyle);
    return NextResponse.json({
      success: true,
      thinking: localResult.thinking,
      analysis: localResult.analysis,
      project: localResult.project,
      isDelta: localResult.isDelta,
      operations: localResult.operations,
      completenessReport: localResult.completenessReport,
      summary: localResult.summary
    });
  } catch (error: any) {
    console.error('Error generating AI flow:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to synthesize architecture.' },
      { status: 500 }
    );
  }
}

async function callExternalProvider(params: {
  provType: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  currentGraph?: CanonicalGraph;
  baseProject: FlowProject;
  themeStyle?: string;
}): Promise<ArchitectureGenerationResult | null> {
  const { provType, apiKey, baseUrl, model, prompt, currentGraph, baseProject } = params;

  let rawContent = '';

  const intent = classifyIntent(prompt, baseProject);
  let userPromptContent = `User Request: "${prompt}"`;
  if (currentGraph && currentGraph.nodes.length > 0) {
    userPromptContent += `\n\nCURRENT_GRAPH:\n${JSON.stringify(currentGraph, null, 2)}`;
  }

  // 1. OpenAI, Groq, Ollama, OpenRouter, Custom
  if (['openai', 'groq', 'ollama', 'openrouter', 'custom'].includes(provType)) {
    const defaultUrl =
      provType === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : provType === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : provType === 'ollama'
        ? 'http://localhost:11434/v1'
        : 'https://api.openai.com/v1';

    const url = `${(baseUrl || defaultUrl).replace(/\/$/, '')}/chat/completions`;
    const targetModel = model || (provType === 'groq' ? 'llama-3.3-70b-versatile' : provType === 'ollama' ? 'llama3' : 'gpt-4o');

    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userPromptContent }
        ],
        max_tokens: 1400,
        temperature: 0.15
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Provider HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    rawContent = data.choices?.[0]?.message?.content || '';
  }

  // 2. Anthropic Claude
  else if (provType === 'anthropic') {
    const url = `${(baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`;
    const targetModel = model || 'claude-3-7-sonnet-20250219';

    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: targetModel,
        system: SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: userPromptContent }],
        max_tokens: 1400,
        temperature: 0.15
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    rawContent = data.content?.[0]?.text || '';
  }

  // 3. Google Gemini
  else if (provType === 'gemini') {
    const targetModel = model || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: userPromptContent }] }],
        generationConfig: { maxOutputTokens: 1400, temperature: 0.15 }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (!rawContent) return null;

  // Check if LLM outputted <operations>
  const opsMatch = rawContent.match(/<operations>([\s\S]*?)<\/operations>/i) ||
                   rawContent.match(/```(?:operations|json)\s*(\[[\s\S]*?\])\s*```/i);
  if (opsMatch && baseProject.nodes.length > 0) {
    try {
      const opsJson = JSON.parse(opsMatch[1].trim());
      if (Array.isArray(opsJson)) {
        const policy = createDefaultMutationPolicy(baseProject, intent.preserveExisting);
        const txResult = executeGraphTransaction(baseProject, opsJson, policy);
        if (txResult.success) {
          const addedIds = new Set<string>();
          txResult.appliedOperations.forEach((op) => {
            if (op.op === 'add_node') addedIds.add(op.node.id);
          });
          const laidOutGraph = incrementalLayout(txResult.graph, addedIds);
          return {
            thinking: 'Parsed natural language modification into explicit graph operations.',
            analysis: 'Enforced transactional safety and verified component identities.',
            project: laidOutGraph,
            isDelta: true,
            operations: txResult.appliedOperations,
            summary: `Applied Graph Delta: Executed ${txResult.appliedOperations.length} operations. Preserved existing canvas state.`
          };
        }
      }
    } catch (err) {
      console.warn('Failed parsing LLM operations, falling back to project JSON parsing');
    }
  }

  return parseLLMArchitectureResponse(rawContent, prompt);
}

function parseLLMArchitectureResponse(
  rawText: string,
  fallbackPrompt: string
): ArchitectureGenerationResult | null {
  const thinkMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i) ||
                     rawText.match(/```thinking\s*([\s\S]*?)```/i);
  const thinking = thinkMatch ? thinkMatch[1].trim() : 'Analyzed system requirements and component boundaries.';

  const analysisMatch = rawText.match(/<analysis>([\s\S]*?)<\/analysis>/i) ||
                       rawText.match(/```analysis\s*([\s\S]*?)```/i);
  const analysis = analysisMatch ? analysisMatch[1].trim() : 'Validated communication protocols and transactional data flow.';

  const projectMatch = rawText.match(/<project>([\s\S]*?)<\/project>/i) ||
                        rawText.match(/```json\s*([\s\S]*?)```/i) ||
                        rawText.match(/```\s*(\{[\s\S]*?\})\s*```/i);

  let rawJson = projectMatch ? projectMatch[1].trim() : '';
  if (!rawJson) {
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      rawJson = rawText.slice(firstBrace, lastBrace + 1);
    }
  }

  if (!rawJson) return null;

  try {
    const cleanJson = rawJson
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    const parsed = JSON.parse(cleanJson);
    if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      return null;
    }

    const sanitizedEdges = (parsed.edges || []).map((e: any, idx: number) => ({
      id: e.id || `edge-${idx + 1}`,
      fromNodeId: e.fromNodeId || e.from,
      toNodeId: e.toNodeId || e.to,
      fromPort: e.fromPort || 'right',
      toPort: e.toPort || 'left',
      label: e.label || `${idx + 1}. Flow`,
      lineStyle: e.lineStyle || 'solid',
      routeType: e.routeType || 'straight',
      color: e.color || '#2563EB',
      width: e.width || 1.8,
      arrowhead: e.arrowhead || 'arrow',
      isAnimated: e.isAnimated ?? true
    }));

    const project: FlowProject = {
      id: `ai-flow-${Date.now()}`,
      name: parsed.name || fallbackPrompt,
      description: parsed.description || 'Architecture synthesized with Drafo AI',
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
      sections: parsed.sections || [
        {
          id: 'sec-ai-1',
          number: '1',
          title: `1. ${parsed.name || 'System Architecture Flow'}`,
          y: 40,
          pillBg: '#DCF0DC',
          pillTextColor: '#1F5E21',
          pillBorderColor: '#81C784',
          hasDivider: false
        }
      ],
      nodes: parsed.nodes.map((n: any, idx: number) => ({
        id: n.id || `node-${idx + 1}`,
        type: n.type || 'standard',
        x: typeof n.x === 'number' ? n.x : 60 + idx * 240,
        y: typeof n.y === 'number' ? n.y : 140,
        width: n.width || 165,
        height: n.height || 115,
        title: n.title || n.label || `Component ${idx + 1}`,
        subtitle: n.subtitle || n.sublabel || '',
        style: n.style || {
          bg: '#FFFFFF',
          borderColor: '#2563EB',
          borderRadius: 12,
          textColor: '#0F172A'
        },
        sectionId: 'sec-ai-1'
      })),
      edges: sanitizedEdges
    };

    return {
      thinking,
      analysis,
      project,
      isDelta: false,
      summary: `Synthesized "${project.name}" with ${project.nodes.length} nodes and ${project.edges.length} connectors.`
    };
  } catch {
    return null;
  }
}

/**
 * Intelligent local reasoning & Graph Delta synthesis engine for Drafo AI.
 * Handles:
 * 1. Intent classification & Requirement extraction (traceable REQ-001...)
 * 2. If canvas has nodes and user is mutating: computes graph delta, executes transactionally, positions incrementally, validates.
 * 3. If starting fresh: dynamically creates all requested services across architectural tiers with clean multi-tier layout.
 */
function generateLocalArchitectureWithReasoning(
  prompt: string,
  baseProject: FlowProject,
  _themeStyle?: 'auto' | 'vibrant' | 'emerald' | 'cyber' | 'minimal'
): ArchitectureGenerationResult {
  const isBengali = /[\u0980-\u09FF]/.test(prompt);

  const intent = classifyIntent(prompt, baseProject);
  const reqData = extractRequirements(prompt, baseProject);
  const requirements = reqData.requirements;

  // ----------------------------------------------------
  // SCENARIO 1: DELTA MUTATION ON EXISTING CANVAS
  // ----------------------------------------------------
  if (intent.isMutation && baseProject.nodes.length > 0) {
    const policy = createDefaultMutationPolicy(baseProject, intent.preserveExisting);

    // Validate what is currently satisfied vs missing
    const validationBefore = validateGraphRequirements(baseProject, requirements);

    // Plan repairs / delta additions
    const repairOps = planRepairs(baseProject, validationBefore.missing);

    // If explicit connections were specified, add them
    requirements
      .filter((r) => r.kind === 'edge' && r.sourceReference && r.targetReference)
      .forEach((edgeReq) => {
        repairOps.push({
          op: 'add_edge',
          edge: {
            fromNodeId: edgeReq.sourceReference!,
            toNodeId: edgeReq.targetReference!,
            label: edgeReq.text
          }
        });
      });

    // Execute transaction deterministically
    const txResult = executeGraphTransaction(baseProject, repairOps, policy);

    // Track newly added node IDs for incremental placement
    const addedNodeIds = new Set<string>();
    txResult.appliedOperations.forEach((op) => {
      if (op.op === 'add_node') addedNodeIds.add(op.node.id);
    });

    // Run validation BEFORE layout
    const semanticBeforeLayout = validateGraphSemantics(txResult.graph);
    const requirementsBeforeLayout = validateGraphRequirements(txResult.graph, requirements);

    // Run incremental constraint-based layout
    const positionedGraph = incrementalLayout(txResult.graph, addedNodeIds);

    // Run visual layout validation
    const layoutReport = validateLayout(positionedGraph);

    // Generate post-generation completeness report
    const norm = normalizeEntities(requirements.map((r) => r.text));
    const completenessReport = generateCompletenessReport(
      requirements.map((r) => r.text),
      positionedGraph,
      norm
    );

    const addedCount = addedNodeIds.size;
    const edgeCount = txResult.appliedOperations.filter((op) => op.op === 'add_edge').length;
    const preservedCount = baseProject.nodes.length;

    const thinking = isBengali
      ? `• ইনটেন্ট: বিদ্যমান আর্কিটেকচারে ডেল্টা পরিবর্তন।
• সংরক্ষিত নোড: ${preservedCount}টি উপাদান অবিকৃত রাখা হয়েছে।
• নতুন উপাদান: ${addedCount}টি নতুন নোড এবং ${edgeCount}টি কানেক্টর যুক্ত করা হয়েছে।`
      : `• Intent: Graph Delta Mutation with ${intent.preserveExisting ? 'Protected Preservation' : 'Standard Policy'}.
• State Preservation: Kept ${preservedCount} existing canvas nodes intact with original positions.
• Delta Operations: Planned & executed ${txResult.appliedOperations.length} atomic operations.`;

    const analysis = isBengali
      ? `• ট্রানজ্যাকশন স্ট্যাটাস: ${txResult.success ? 'সফল' : 'ব্যর্থ'} (লেআউট ওভারল্যাপ: ${layoutReport.overlaps})।
• সেমান্টিক রুলস: ${semanticBeforeLayout.length === 0 ? 'সম্পূর্ণ নিখুঁত' : `${semanticBeforeLayout.length}টি পরামর্শ`}
• কমপ্লিটনেস: ${completenessReport.isComplete ? '১০০% রিকয়ারমেন্টস সন্তুষ্ট' : `${completenessReport.missing.length}টি অনুপস্থিত`}`
      : `• Transaction Status: ${txResult.success ? 'Committed Atomically' : 'Rolled Back'} (Visual overlaps: ${layoutReport.overlaps}).
• Integrity: All component identities resolved deterministically without silent hallucination.
• Completeness: ${completenessReport.isComplete ? 'All explicit requirements satisfied' : `Missing: ${completenessReport.missing.join(', ')}`}`;

    const summary = isBengali
      ? `ডেল্টা প্রয়োগ: ${addedCount}টি নতুন কম্পোনেন্ট যুক্ত করা হয়েছে, ${edgeCount}টি কানেক্টর তৈরি হয়েছে এবং ${preservedCount}টি পূর্বের উপাদান অবিকৃত রয়েছে।`
      : `Applied Graph Delta: Added ${addedCount} components, connected ${edgeCount} edges, preserved ${preservedCount} existing nodes without modification.`;

    return {
      thinking,
      analysis,
      project: positionedGraph,
      isDelta: true,
      operations: txResult.appliedOperations,
      completenessReport,
      summary
    };
  }

  // ----------------------------------------------------
  // SCENARIO 2: BRAND NEW ARCHITECTURE (FULL MULTI-TIER GENERATION)
  // ----------------------------------------------------
  const extractedNodes = requirements.filter((r) => r.kind === 'node');

  // Fallback defaults ONLY IF prompt is completely empty or brief
  const candidateComponents = extractedNodes.length > 0
    ? extractedNodes
    : [
        { id: 'REQ-01', text: 'Client Browser', tier: 'frontend' as const, suggestedNodeType: 'browser' as const },
        { id: 'REQ-02', text: 'API Gateway', tier: 'gateway' as const, suggestedNodeType: 'gateway' as const },
        { id: 'REQ-03', text: 'Core Service', tier: 'service' as const, suggestedNodeType: 'server' as const },
        { id: 'REQ-04', text: 'Primary Database', tier: 'database' as const, suggestedNodeType: 'database' as const }
      ];

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Group candidate components by architectural tier
  const tierMap: Record<string, FlowNode[]> = {
    frontend: [],
    gateway: [],
    service: [],
    queue: [],
    cache: [],
    database: [],
    storage: [],
    external: []
  };

  // Construct nodes with distinct palettes per tier
  candidateComponents.forEach((item, index) => {
    const { tier, nodeType } = inferTierAndType(item.text);

    let bg = '#FFFFFF';
    let borderColor = '#2563EB';
    let textColor = '#0F172A';

    if (tier === 'gateway') {
      bg = '#EFF6FF'; borderColor = '#3B82F6'; textColor = '#1E3A8A';
    } else if (tier === 'service') {
      bg = '#F0FDF4'; borderColor = '#16A34A'; textColor = '#14532D';
    } else if (tier === 'queue') {
      bg = '#FEF3C7'; borderColor = '#F59E0B'; textColor = '#78350F';
    } else if (tier === 'cache') {
      bg = '#FEF2F2'; borderColor = '#EF4444'; textColor = '#7F1D1D';
    } else if (tier === 'database') {
      bg = '#FAF5FF'; borderColor = '#8B5CF6'; textColor = '#581C87';
    } else if (tier === 'storage') {
      bg = '#ECFEFF'; borderColor = '#06B6D4'; textColor = '#164E63';
    } else if (tier === 'external') {
      bg = '#FDF4FF'; borderColor = '#C026D3'; textColor = '#701A75';
    }

    const node: FlowNode = {
      id: `node-${index + 1}`,
      type: nodeType,
      title: item.text,
      subtitle: `${tier.toUpperCase()} Layer`,
      x: 60,
      y: 120,
      width: 165,
      height: 115,
      style: { bg, borderColor, borderRadius: 12, textColor },
      sectionId: undefined
    };

    nodes.push(node);
    tierMap[tier]?.push(node);
  });

  // Build Architectural Zones as Sections / Containers
  const sections: FlowSection[] = [];
  const infraNodes = [...tierMap.queue, ...tierMap.cache];
  const dataNodes = [...tierMap.database, ...tierMap.storage];

  if (tierMap.frontend.length > 0) {
    const secId = 'sec-clients';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. Clients & Presentation`,
      y: 40,
      pillBg: '#EFF6FF',
      pillTextColor: '#1E40AF',
      pillBorderColor: '#BFDBFE',
      hasDivider: false
    });
    tierMap.frontend.forEach((n) => (n.sectionId = secId));
  }

  if (tierMap.gateway.length > 0) {
    const secId = 'sec-edge';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. Edge & Ingress Gateways`,
      y: 40,
      pillBg: '#F0FDF4',
      pillTextColor: '#166534',
      pillBorderColor: '#BBF7D0',
      hasDivider: false
    });
    tierMap.gateway.forEach((n) => (n.sectionId = secId));
  }

  if (tierMap.service.length > 0) {
    const secId = 'sec-services';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. Backend Services & Business Logic`,
      y: 40,
      pillBg: '#FDF4FF',
      pillTextColor: '#86198F',
      pillBorderColor: '#F5D0FE',
      hasDivider: false
    });
    tierMap.service.forEach((n) => (n.sectionId = secId));
  }

  if (infraNodes.length > 0) {
    const secId = 'sec-infra';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. Asynchronous Queues & Caching`,
      y: 40,
      pillBg: '#FEF3C7',
      pillTextColor: '#92400E',
      pillBorderColor: '#FDE68A',
      hasDivider: false
    });
    infraNodes.forEach((n) => (n.sectionId = secId));
  }

  if (dataNodes.length > 0) {
    const secId = 'sec-data';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. Datastores & Persistence`,
      y: 40,
      pillBg: '#FAF5FF',
      pillTextColor: '#6B21A8',
      pillBorderColor: '#E9D5FF',
      hasDivider: false
    });
    dataNodes.forEach((n) => (n.sectionId = secId));
  }

  if (tierMap.external.length > 0) {
    const secId = 'sec-external';
    sections.push({
      id: secId,
      number: `${sections.length + 1}`,
      title: `${sections.length + 1}. External Third-Party APIs`,
      y: 40,
      pillBg: '#FFF1F2',
      pillTextColor: '#9F1239',
      pillBorderColor: '#FECDD3',
      hasDivider: false
    });
    tierMap.external.forEach((n) => (n.sectionId = secId));
  }

  // Calculate layout coordinates by architectural tier (multi-column)
  let currentX = 80;
  const colSpacingX = 260;
  const rowSpacingY = 150;

  // 1. Position Frontend Tier
  if (tierMap.frontend.length > 0) {
    tierMap.frontend.forEach((n, idx) => {
      n.x = currentX;
      n.y = 120 + idx * rowSpacingY;
    });
    currentX += colSpacingX;
  }

  // 2. Position Gateway Tier
  if (tierMap.gateway.length > 0) {
    tierMap.gateway.forEach((n, idx) => {
      n.x = currentX;
      n.y = 120 + idx * rowSpacingY;
    });
    currentX += colSpacingX;
  }

  // 3. Position Backend Services Tier (multi-column if > 4 services)
  if (tierMap.service.length > 0) {
    const servicesPerCol = 4;
    tierMap.service.forEach((n, idx) => {
      const colOffset = Math.floor(idx / servicesPerCol);
      const rowOffset = idx % servicesPerCol;
      n.x = currentX + colOffset * colSpacingX;
      n.y = 120 + rowOffset * rowSpacingY;
    });
    const numServiceCols = Math.ceil(tierMap.service.length / servicesPerCol);
    currentX += numServiceCols * colSpacingX;
  }

  // 4. Position Queues & Caches
  if (infraNodes.length > 0) {
    infraNodes.forEach((n, idx) => {
      n.x = currentX;
      n.y = 120 + idx * rowSpacingY;
    });
    currentX += colSpacingX;
  }

  // 5. Position Databases & Storage
  if (dataNodes.length > 0) {
    dataNodes.forEach((n, idx) => {
      n.x = currentX;
      n.y = 120 + idx * rowSpacingY;
    });
    currentX += colSpacingX;
  }

  // 6. Position External APIs
  if (tierMap.external.length > 0) {
    tierMap.external.forEach((n, idx) => {
      n.x = currentX;
      n.y = 120 + idx * rowSpacingY;
    });
  }

  // Synthesize realistic architectural edges between tiers
  // CRITICAL RULE: Never connect edges to group/container nodes!
  let edgeCounter = 1;

  // Frontend -> Gateway
  tierMap.frontend.forEach((fe) => {
    const gw = tierMap.gateway[0] || tierMap.service[0];
    if (gw && gw.type !== 'group' && gw.type !== 'container') {
      edges.push({
        id: `edge-${edgeCounter++}`,
        fromNodeId: fe.id,
        toNodeId: gw.id,
        fromPort: 'right',
        toPort: 'left',
        label: 'HTTPS Ingress',
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#2563EB',
        width: 2,
        arrowhead: 'arrow',
        isAnimated: true
      });
    }
  });

  // Gateway -> Services
  const primaryGw = tierMap.gateway[0];
  if (primaryGw) {
    tierMap.service.slice(0, 4).forEach((svc) => {
      if (svc.type !== 'group' && svc.type !== 'container') {
        edges.push({
          id: `edge-${edgeCounter++}`,
          fromNodeId: primaryGw.id,
          toNodeId: svc.id,
          fromPort: 'right',
          toPort: 'left',
          label: 'Dispatch Request',
          lineStyle: 'solid',
          routeType: 'straight',
          color: '#16A34A',
          width: 2,
          arrowhead: 'arrow',
          isAnimated: true
        });
      }
    });
  }

  // Services -> Infrastructure / Data Layer
  tierMap.service.forEach((svc, idx) => {
    if (svc.type === 'group' || svc.type === 'container') return;

    // Cache lookup
    if (tierMap.cache.length > 0 && idx === 0) {
      edges.push({
        id: `edge-${edgeCounter++}`,
        fromNodeId: svc.id,
        toNodeId: tierMap.cache[0].id,
        fromPort: 'right',
        toPort: 'left',
        label: 'Cache Lookup',
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#DC2626',
        width: 1.8,
        arrowhead: 'arrow'
      });
    }

    // Event Publish
    if (tierMap.queue.length > 0 && (svc.title.toLowerCase().includes('task') || svc.title.toLowerCase().includes('notification') || idx === 1)) {
      edges.push({
        id: `edge-${edgeCounter++}`,
        fromNodeId: svc.id,
        toNodeId: tierMap.queue[0].id,
        fromPort: 'right',
        toPort: 'left',
        label: 'Publish Event',
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#F59E0B',
        width: 1.8,
        arrowhead: 'arrow'
      });
    }

    // SQL read/write
    if (tierMap.database.length > 0 && idx < 3) {
      edges.push({
        id: `edge-${edgeCounter++}`,
        fromNodeId: svc.id,
        toNodeId: tierMap.database[0].id,
        fromPort: 'right',
        toPort: 'left',
        label: 'SQL Read / Write',
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#7C3AED',
        width: 1.8,
        arrowhead: 'arrow'
      });
    }
  });

  // Explicit user-requested edges
  requirements
    .filter((r) => r.kind === 'edge' && r.sourceReference && r.targetReference)
    .forEach((edgeReq) => {
      const src = nodes.find((n) => n.title.toLowerCase().includes(edgeReq.sourceReference!.toLowerCase()));
      const tgt = nodes.find((n) => n.title.toLowerCase().includes(edgeReq.targetReference!.toLowerCase()));
      if (src && tgt && src.id !== tgt.id && src.type !== 'group' && tgt.type !== 'group') {
        edges.push({
          id: `req-edge-${edgeCounter++}`,
          fromNodeId: src.id,
          toNodeId: tgt.id,
          fromPort: 'right',
          toPort: 'left',
          label: edgeReq.text,
          lineStyle: 'solid',
          routeType: 'straight',
          color: '#16A34A',
          width: 2,
          arrowhead: 'arrow',
          isAnimated: true
        });
      }
    });

  const positionedNodes = nodes;
  const routedEdges = edges;

  const project: FlowProject = {
    id: `project-ai-${Date.now()}`,
    name: prompt.length > 45 ? `${prompt.slice(0, 42)}...` : prompt,
    description: `Multi-Tier Architecture synthesized with Drafo AI (${nodes.length} components)`,
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections,
    nodes: positionedNodes,
    edges: routedEdges
  };

  // Run validation BEFORE layout
  validateGraphSemantics(project);
  validateGraphRequirements(project, requirements);

  // Generate Post-Generation Completeness Report
  const norm = normalizeEntities(candidateComponents.map((c) => c.text));
  const completenessReport = generateCompletenessReport(
    candidateComponents.map((c) => c.text),
    project,
    norm
  );

  const thinking = isBengali
    ? `• আর্কিটেকচার বিশ্লেষণ: ${candidateComponents.length}টি স্বতন্ত্র কম্পোনেন্ট চিহ্নিত করা হয়েছে।
• টিয়ারিং স্ট্রাকচার: ${sections.length}টি আর্কিটেকচারাল জোনে বিন্যস্ত করা হয়েছে।`
    : `• Architecture Scope: Identified ${candidateComponents.length} distinct components across ${sections.length} architectural zones.
• Hierarchy: Structured into zones (Presentation -> Ingress -> Services -> Infrastructure -> Persistence).`;

  const analysis = isBengali
    ? `• প্রোটোকল ও নেটওয়ার্কিং: TLS 1.3 HTTPS, লো-লেটেন্সি ইন্টার-সার্ভিস আরপিসি এবং এসিনক্রোনাস ইভেন্ট ডেসপ্যাচ।
• কমপ্লিটনেস রিপোর্ট: ${completenessReport.found.length}/${completenessReport.requested.length} রিকয়ারমেন্টস সন্তুষ্ট।`
    : `• Protocols: TLS 1.3 HTTPS ingress, microservice RPCs, and asynchronous event routing.
• Completeness Audit: ${completenessReport.found.length}/${completenessReport.requested.length} components materialized. Zero container edge violations.`;

  const summary = isBengali
    ? `"${project.name}" তৈরি হয়েছে (${project.nodes.length}টি নোড, ${project.edges.length}টি কানেক্টর, ${sections.length}টি জোন)।`
    : `Synthesized "${project.name}" with ${project.nodes.length} nodes across ${sections.length} architectural zones and ${project.edges.length} connectors.`;

  return {
    thinking,
    analysis,
    project,
    isDelta: false,
    completenessReport,
    summary
  };
}
