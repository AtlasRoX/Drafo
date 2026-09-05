import { FlowProject, FlowNode, FlowEdge, FlowSection } from '../types/flow';
import { NODE_COLOR_PALETTES } from '../data/colorPalettes';

export interface AIGeneratorOptions {
  themeStyle?: 'auto' | 'vibrant' | 'emerald' | 'cyber' | 'minimal';
}

export interface AIPresetPrompt {
  id: string;
  category: string;
  label: string;
  lang: 'en' | 'bn';
  prompt: string;
}

export const PRESET_AI_PROMPTS: AIPresetPrompt[] = [
  {
    id: 'auth-jwt',
    category: 'Auth & Security',
    label: 'OAuth2 & JWT Auth',
    lang: 'en',
    prompt: 'User login with OAuth2, Redis rate limiter, JWT session manager, and PostgreSQL replica'
  },
  {
    id: 'nextjs-fullstack',
    category: 'Fullstack',
    label: 'Next.js 16 App Router',
    lang: 'en',
    prompt: 'Next.js 16 architecture with React Server Components, Server Actions, Edge Middleware, and Prisma DB'
  },
  {
    id: 'checkout-pay',
    category: 'E-Commerce',
    label: 'Stripe & Webhook',
    lang: 'en',
    prompt: 'E-commerce checkout with Stripe payment intent, webhook verification, order queue, and confirmation email'
  },
  {
    id: 'ai-rag',
    category: 'AI / ML',
    label: 'LangChain & RAG',
    lang: 'en',
    prompt: 'AI Agent RAG pipeline with Vector Database, Semantic Search, Context Ingestion, and LLM Streaming response'
  },
  {
    id: 'microservices-mesh',
    category: 'Backend',
    label: 'Kafka Event Mesh',
    lang: 'en',
    prompt: 'Microservices architecture with API Gateway, Apache Kafka event bus, Order Service, and Notification Worker'
  },
  {
    id: 'bn-auth-otp',
    category: 'বাংলা',
    label: 'ওটিপি ও লগইন',
    lang: 'bn',
    prompt: 'ইউজার লগইন এবং মোবাইল ওটিপি ভেরিফিকেশন ফ্লো সাথে সিকিউর সেশন ম্যানেজমেন্ট'
  },
  {
    id: 'bn-payment',
    category: 'বাংলা',
    label: 'বিকাশ পেমেন্ট গেটওয়ে',
    lang: 'bn',
    prompt: 'বিকাশ ও নগদ পেমেন্ট গেটওয়ে চেকআউট, ইনস্ট্যান্ট ওয়েবহুক এবং অর্ডার কনফার্মেশন সিস্টেম'
  },
  {
    id: 'bn-ai-chat',
    category: 'বাংলা',
    label: 'এআই চ্যাটবট পাইপলাইন',
    lang: 'bn',
    prompt: 'এআই চ্যাটবট, ভেক্টর ডাটাবেস সার্চ এবং রিয়েলটাইম স্ট্রিমিং রেসপন্স আর্কিটেকচার'
  }
];

export function generateFlowFromPrompt(promptText: string, options?: AIGeneratorOptions): FlowProject {
  const query = promptText.toLowerCase();
  const isBengali = /[\u0980-\u09FF]/.test(promptText);

  // Check categories
  const isAuth = query.includes('auth') || query.includes('login') || query.includes('লগইন') || query.includes('সাইনইন') || query.includes('otp');
  const isPayment = query.includes('payment') || query.includes('পেমেন্ট') || query.includes('stripe') || query.includes('bkash') || query.includes('বিকাশ') || query.includes('checkout');
  const isAI = query.includes('ai') || query.includes('rag') || query.includes('llm') || query.includes('gpt') || query.includes('চ্যাটবট') || query.includes('এআই');
  const isMicroservices = query.includes('microservice') || query.includes('kafka') || query.includes('event') || query.includes('mesh') || query.includes('মাইক্রোসার্ভিস');
  const isNextjs = query.includes('next') || query.includes('react') || query.includes('server action') || query.includes('ssr') || query.includes('নেক্সট');

  let project: FlowProject;
  if (isAuth) {
    project = generateAuthFlow(isBengali, promptText);
  } else if (isPayment) {
    project = generatePaymentFlow(isBengali, promptText);
  } else if (isAI) {
    project = generateAIFlow(isBengali, promptText);
  } else if (isMicroservices) {
    project = generateMicroservicesFlow(isBengali, promptText);
  } else if (isNextjs) {
    project = generateNextjsFlow(isBengali, promptText);
  } else {
    project = generateGenericCrudFlow(isBengali, promptText);
  }

  // Apply optional theme style
  if (options?.themeStyle && options.themeStyle !== 'auto') {
    applyThemeStyleToProject(project, options.themeStyle);
  }

  return project;
}

function applyThemeStyleToProject(project: FlowProject, themeStyle: 'vibrant' | 'emerald' | 'cyber' | 'minimal') {
  if (themeStyle === 'emerald') {
    project.nodes.forEach((n) => {
      n.style.borderColor = '#10B981';
      n.style.bg = '#ECFDF5';
      n.style.textColor = '#064E3B';
    });
  } else if (themeStyle === 'cyber') {
    project.nodes.forEach((n) => {
      n.style.borderColor = '#8B5CF6';
      n.style.bg = '#F5F3FF';
      n.style.textColor = '#3B0764';
    });
  } else if (themeStyle === 'minimal') {
    project.nodes.forEach((n) => {
      n.style.borderColor = '#475569';
      n.style.bg = '#FFFFFF';
      n.style.textColor = '#0F172A';
    });
  }
}

export function insertFlowIntoCanvas(currentProject: FlowProject, newFlow: FlowProject): FlowProject {
  let maxY = 0;
  let minX = Infinity;
  if (currentProject.nodes.length > 0) {
    for (const node of currentProject.nodes) {
      const bottom = (node.y || 0) + (node.height || 115);
      if (bottom > maxY) maxY = bottom;
      if (node.x < minX) minX = node.x;
    }
  } else {
    maxY = 40;
    minX = 60;
  }
  const offsetY = maxY + 80;

  const idMap = new Map<string, string>();
  const idSuffix = Date.now().toString(36).slice(-4);
  const newNodes = newFlow.nodes.map((node, index) => {
    const newId = `${node.id}-${idSuffix}-${index}`;
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      y: (node.y || 0) + offsetY,
      sectionId: undefined
    };
  });

  const newEdges = newFlow.edges.map((edge, index) => ({
    ...edge,
    id: `${edge.id}-${idSuffix}-${index}`,
    fromNodeId: idMap.get(edge.fromNodeId) || edge.fromNodeId,
    toNodeId: idMap.get(edge.toNodeId) || edge.toNodeId
  }));

  return {
    ...currentProject,
    updatedAt: new Date().toISOString(),
    nodes: [...currentProject.nodes, ...newNodes],
    edges: [...currentProject.edges, ...newEdges]
  };
}

function generateAuthFlow(isBengali: boolean, title: string): FlowProject {
  const sections: FlowSection[] = [
    {
      id: 'sec-auth-1',
      number: '1',
      title: isBengali ? '১. লগইন এবং ওটিপি অথেনটিকেশন ফ্লো' : '1. User Authentication & JWT Flow',
      y: 40,
      pillBg: '#DCF0DC',
      pillTextColor: '#1F5E21',
      pillBorderColor: '#81C784',
      hasDivider: false
    }
  ];

  const nodes: FlowNode[] = [
    {
      id: 'n-auth-1',
      type: 'browser',
      x: 80,
      y: 120,
      width: 140,
      height: 115,
      title: isBengali ? 'ব্রাউজার' : 'Browser',
      subtitle: isBengali ? 'ক্লায়েন্ট অ্যাপ' : 'Client App',
      style: { bg: '#FFFFFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' },
      sectionId: 'sec-auth-1'
    },
    {
      id: 'n-auth-2',
      type: 'client-form',
      x: 320,
      y: 120,
      width: 150,
      height: 115,
      title: isBengali ? 'লগইন ফর্ম' : 'Login Component',
      subtitle: isBengali ? '(ইমেল ও পাসওয়ার্ড)' : '(Credentials)',
      style: { bg: NODE_COLOR_PALETTES.pink.bg, borderColor: NODE_COLOR_PALETTES.pink.border, borderRadius: 14, textColor: '#000' },
      sectionId: 'sec-auth-1'
    },
    {
      id: 'n-auth-3',
      type: 'server',
      x: 560,
      y: 120,
      width: 155,
      height: 115,
      title: isBengali ? 'Next.js' : 'Auth Service',
      subtitle: isBengali ? 'সার্ভার অ্যাকশন\n(Auth Handler)' : 'JWT & Session\nManager',
      style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' },
      sectionId: 'sec-auth-1'
    },
    {
      id: 'n-auth-4',
      type: 'database',
      x: 810,
      y: 120,
      width: 130,
      height: 110,
      title: isBengali ? 'ইউজার ডিবি' : 'Users DB',
      subtitle: 'Postgres / Redis',
      style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000' },
      sectionId: 'sec-auth-1'
    },
    {
      id: 'n-auth-5',
      type: 'client-props',
      x: 310,
      y: 310,
      width: 180,
      height: 85,
      title: isBengali ? 'ড্যাশবোর্ড রিডাইরেক্ট' : 'Dashboard Route',
      subtitle: isBengali ? '(সেশন কুকি সেট ও সফল রিডাইরেক্ট)' : '(Auth Cookie & Redirect)',
      style: { bg: NODE_COLOR_PALETTES.yellow.bg, borderColor: NODE_COLOR_PALETTES.yellow.border, borderRadius: 14, textColor: '#000' },
      sectionId: 'sec-auth-1'
    }
  ];

  const edges: FlowEdge[] = [
    { id: 'ae-1', fromNodeId: 'n-auth-1', toNodeId: 'n-auth-2', fromPort: 'right', toPort: 'left', label: isBengali ? '১. লগইন পেজ ওপেন' : '1. Open Login Form', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
    { id: 'ae-2', fromNodeId: 'n-auth-2', toNodeId: 'n-auth-3', fromPort: 'right', toPort: 'left', label: isBengali ? '২. ক্রেডেনশিয়াল সাবমিট' : '2. Submit Credentials', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
    { id: 'ae-3', fromNodeId: 'n-auth-3', toNodeId: 'n-auth-4', fromPort: 'right', toPort: 'left', label: isBengali ? '৩. পাসওয়ার্ড ও ওটিপি যাচাই' : '3. Verify Hash & OTP', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
    { id: 'ae-4', fromNodeId: 'n-auth-4', toNodeId: 'n-auth-3', fromPort: 'left', toPort: 'right', label: isBengali ? '৪. অথেনটিকেশন কনফার্ম' : '4. User Authenticated', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
    { id: 'ae-5', fromNodeId: 'n-auth-3', toNodeId: 'n-auth-5', fromPort: 'bottom', toPort: 'top', label: isBengali ? '৫. JWT সাইন এবং রেসপন্স' : '5. Set Secure HttpOnly Cookie', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
    { id: 'ae-6', fromNodeId: 'n-auth-5', toNodeId: 'n-auth-1', fromPort: 'left', toPort: 'bottom', label: isBengali ? '৬. ইউজার ড্যাশবোর্ড রেন্ডার' : '6. Render Protected Dashboard', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
  ];

  return {
    id: `generated-auth-${Date.now()}`,
    name: title || 'Authentication Architecture Flow',
    description: 'Auto-generated high-precision architecture flow with Drafo AI',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections,
    nodes,
    edges
  };
}

function generatePaymentFlow(isBengali: boolean, title: string): FlowProject {
  return {
    id: `generated-pay-${Date.now()}`,
    name: title || 'Payment Gateway Checkout Flow',
    description: 'Payment Intent, Webhooks, and Order Confirmation Architecture',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [
      {
        id: 'sec-p-1',
        number: '1',
        title: isBengali ? '১. পেমেন্ট ট্রানজ্যাকশন এবং ওয়েবহুক ফ্লো' : '1. Payment Checkout & Webhook Lifecycle',
        y: 40,
        pillBg: '#DCF0DC',
        pillTextColor: '#1F5E21',
        pillBorderColor: '#81C784',
        hasDivider: false
      }
    ],
    nodes: [
      { id: 'pn-1', type: 'browser', x: 80, y: 120, width: 140, height: 115, title: isBengali ? 'ব্রাউজার' : 'Browser', subtitle: isBengali ? 'চেকআউট পেজ' : 'Checkout Page', style: { bg: '#FFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' } },
      { id: 'pn-2', type: 'server', x: 340, y: 120, width: 155, height: 115, title: 'Next.js Server', subtitle: isBengali ? 'সার্ভার অ্যাকশন\n(Create Intent)' : 'Order API\nHandler', style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' } },
      { id: 'pn-3', type: 'api', x: 600, y: 120, width: 155, height: 115, title: isBengali ? 'পেমেন্ট গেটওয়ে' : 'Payment Gateway', subtitle: 'Stripe / bKash / SSL', style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 14, textColor: '#000' } },
      { id: 'pn-4', type: 'database', x: 860, y: 120, width: 130, height: 110, title: isBengali ? 'অর্ডার ডাটাবেজ' : 'Orders DB', subtitle: 'PostgreSQL', style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000' } },
      { id: 'pn-5', type: 'client-props', x: 330, y: 310, width: 190, height: 85, title: isBengali ? 'সফল পেমেন্ট রিসিট' : 'Receipt & Confirmation', subtitle: isBengali ? '(অর্ডার নিশ্চিতকরণ)' : '(Order Confirmed UI)', style: { bg: NODE_COLOR_PALETTES.yellow.bg, borderColor: NODE_COLOR_PALETTES.yellow.border, borderRadius: 14, textColor: '#000' } }
    ],
    edges: [
      { id: 'pe-1', fromNodeId: 'pn-1', toNodeId: 'pn-2', fromPort: 'right', toPort: 'left', label: isBengali ? '১. প্লেস অর্ডার' : '1. Place Order', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'pe-2', fromNodeId: 'pn-2', toNodeId: 'pn-3', fromPort: 'right', toPort: 'left', label: isBengali ? '২. পেমেন্ট সেশন ক্রিয়েট' : '2. Create Payment Intent', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'pe-3', fromNodeId: 'pn-3', toNodeId: 'pn-4', fromPort: 'right', toPort: 'left', label: isBengali ? '৩. ওয়েবহুক সফল ইভেন্ট' : '3. Webhook (charge.succeeded)', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'pe-4', fromNodeId: 'pn-4', toNodeId: 'pn-2', fromPort: 'bottom', toPort: 'bottom', label: isBengali ? '৪. অর্ডার স্ট্যাটাস পেইড' : '4. Update Order Status to Paid', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'pe-5', fromNodeId: 'pn-2', toNodeId: 'pn-5', fromPort: 'bottom', toPort: 'top', label: isBengali ? '৫. সাকসেস স্টেট' : '5. Trigger Order Confirmation', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'pe-6', fromNodeId: 'pn-5', toNodeId: 'pn-1', fromPort: 'left', toPort: 'bottom', label: isBengali ? '৬. থ্যাঙ্ক ইউ পেজ রেন্ডার' : '6. Render Invoice / Confirmation', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
    ]
  };
}

function generateAIFlow(isBengali: boolean, title: string): FlowProject {
  return {
    id: `generated-ai-${Date.now()}`,
    name: title || 'AI Inference & Streaming Architecture',
    description: 'AI Gateway, Context Embeddings, and Streaming Flow',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [
      {
        id: 'sec-ai-1',
        number: '1',
        title: isBengali ? '১. এআই চ্যাট এবং স্ট্রিমিং রেসপন্স ফ্লো' : '1. AI Chat & SSE Streaming Architecture',
        y: 40,
        pillBg: '#EEF2FF',
        pillTextColor: '#3730A3',
        pillBorderColor: '#818CF8',
        hasDivider: false
      }
    ],
    nodes: [
      { id: 'an-1', type: 'browser', x: 80, y: 120, width: 140, height: 115, title: isBengali ? 'চ্যাট ইউআই' : 'Chat UI', subtitle: isBengali ? 'ক্লায়েন্ট স্ক্রিন' : 'React Streaming Hook', style: { bg: '#FFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' } },
      { id: 'an-2', type: 'server', x: 340, y: 120, width: 155, height: 115, title: 'AI Gateway', subtitle: isBengali ? 'সার্ভার রাউট\n(Stream Route)' : 'FastAPI / Next.js\nRoute Handler', style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' } },
      { id: 'an-3', type: 'custom-card', x: 600, y: 120, width: 155, height: 115, title: 'Vector Store', subtitle: 'Pinecone / Milvus', style: { bg: NODE_COLOR_PALETTES.indigo.bg, borderColor: NODE_COLOR_PALETTES.indigo.border, borderRadius: 14, textColor: '#000' } },
      { id: 'an-4', type: 'api', x: 860, y: 120, width: 140, height: 115, title: 'LLM Engine', subtitle: 'Claude / GPT / Gemini', style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 14, textColor: '#000' } }
    ],
    edges: [
      { id: 'aie-1', fromNodeId: 'an-1', toNodeId: 'an-2', fromPort: 'right', toPort: 'left', label: isBengali ? '১. প্রম্পট পাঠানো' : '1. Send Prompt Stream', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'aie-2', fromNodeId: 'an-2', toNodeId: 'an-3', fromPort: 'right', toPort: 'left', label: isBengali ? '২. কনটেক্সট সার্চ' : '2. Retrieve Vector Context', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'aie-3', fromNodeId: 'an-3', toNodeId: 'an-4', fromPort: 'right', toPort: 'left', label: isBengali ? '৩. অগমেন্টেড প্রম্পট' : '3. Prompt + Injected RAG Chunks', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'aie-4', fromNodeId: 'an-4', toNodeId: 'an-1', fromPort: 'bottom', toPort: 'bottom', label: isBengali ? '৪. স্ট্রিমিং টোকেন রেসপন্স' : '4. Realtime Streamed Tokens (SSE)', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
    ]
  };
}

function generateGenericCrudFlow(isBengali: boolean, title: string): FlowProject {
  return {
    id: `generated-crud-${Date.now()}`,
    name: title || (isBengali ? 'সিস্টেম আর্কিটেকচার ফ্লো' : 'System Architecture Flow'),
    description: 'Auto-generated modular technical flowchart',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [
      {
        id: 'sec-gen-1',
        number: '1',
        title: isBengali ? '১. সার্ভিস প্রসেসিং এবং ডাটাবেজ ফ্লো' : '1. Service Request & Persistence Lifecycle',
        y: 40,
        pillBg: '#DCF0DC',
        pillTextColor: '#1F5E21',
        pillBorderColor: '#81C784',
        hasDivider: false
      }
    ],
    nodes: [
      { id: 'gn-1', type: 'browser', x: 80, y: 120, width: 140, height: 115, title: isBengali ? 'ব্রাউজার' : 'Browser', subtitle: isBengali ? 'ওয়েব ক্লায়েন্ট' : 'Web Client', style: { bg: '#FFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' } },
      { id: 'gn-2', type: 'server', x: 360, y: 120, width: 155, height: 115, title: 'App Server', subtitle: isBengali ? 'সার্ভার কম্পোনেন্ট\n(Business Logic)' : 'Controller /\nBusiness Logic', style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' } },
      { id: 'gn-3', type: 'api', x: 640, y: 120, width: 150, height: 115, title: 'API Gateway', subtitle: 'Microservice Router', style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 14, textColor: '#000' } },
      { id: 'gn-4', type: 'database', x: 900, y: 120, width: 130, height: 110, title: isBengali ? 'ডাটাবেজ' : 'Database', subtitle: 'PostgreSQL', style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000' } }
    ],
    edges: [
      { id: 'ge-1', fromNodeId: 'gn-1', toNodeId: 'gn-2', fromPort: 'right', toPort: 'left', label: isBengali ? '১. রিকোয়েস্ট ইনিশিয়েট' : '1. Initiate Request', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'ge-2', fromNodeId: 'gn-2', toNodeId: 'gn-3', fromPort: 'right', toPort: 'left', label: isBengali ? '২. সার্ভিস কল' : '2. Dispatch API Call', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'ge-3', fromNodeId: 'gn-3', toNodeId: 'gn-4', fromPort: 'right', toPort: 'left', label: isBengali ? '৩. ডাটাবেজ কোয়েরি' : '3. SQL Query / Mutation', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'ge-4', fromNodeId: 'gn-4', toNodeId: 'gn-1', fromPort: 'bottom', toPort: 'bottom', label: isBengali ? '৪. রেসপন্স এবং স্টেট রেন্ডার' : '4. State Updated & Rendered', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
    ]
  };
}

function generateMicroservicesFlow(isBengali: boolean, title: string): FlowProject {
  return {
    id: `generated-mesh-${Date.now()}`,
    name: title || (isBengali ? 'মাইক্রোসার্ভিস ইভেন্ট মেশ' : 'Microservices & Event Mesh Architecture'),
    description: 'API Gateway, Kafka Pub/Sub, Order & Notification Services',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [
      {
        id: 'sec-mesh-1',
        number: '1',
        title: isBengali ? '১. ইভেন্ট ড্রাইভেন মাইক্রোসার্ভিস ফ্লো' : '1. Event-Driven Microservices Mesh',
        y: 40,
        pillBg: '#F3E8FF',
        pillTextColor: '#6B21A8',
        pillBorderColor: '#C084FC',
        hasDivider: false
      }
    ],
    nodes: [
      { id: 'mn-1', type: 'browser', x: 60, y: 120, width: 135, height: 110, title: isBengali ? 'ওয়েব ক্লায়েন্ট' : 'Web / Mobile Client', subtitle: 'SPA / React', style: { bg: '#FFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' } },
      { id: 'mn-2', type: 'api', x: 260, y: 120, width: 145, height: 110, title: 'API Gateway', subtitle: 'Kong / Envoy', style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 12, textColor: '#000' } },
      { id: 'mn-3', type: 'server', x: 480, y: 120, width: 155, height: 110, title: 'Order Service', subtitle: 'Go / gRPC', style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' } },
      { id: 'mn-4', type: 'custom-card', x: 710, y: 120, width: 155, height: 110, title: 'Kafka Event Bus', subtitle: 'Topic: orders.v1', style: { bg: NODE_COLOR_PALETTES.orange.bg, borderColor: NODE_COLOR_PALETTES.orange.border, borderRadius: 14, textColor: '#000' } },
      { id: 'mn-5', type: 'server', x: 710, y: 310, width: 160, height: 105, title: 'Notification Worker', subtitle: 'Email & SMS Pusher', style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000' } },
      { id: 'mn-6', type: 'database', x: 480, y: 310, width: 140, height: 105, title: 'Order Store', subtitle: 'PostgreSQL DB', style: { bg: NODE_COLOR_PALETTES.indigo.bg, borderColor: NODE_COLOR_PALETTES.indigo.border, borderRadius: 12, textColor: '#000' } }
    ],
    edges: [
      { id: 'me-1', fromNodeId: 'mn-1', toNodeId: 'mn-2', fromPort: 'right', toPort: 'left', label: '1. HTTPS Request', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'me-2', fromNodeId: 'mn-2', toNodeId: 'mn-3', fromPort: 'right', toPort: 'left', label: '2. Route gRPC', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'me-3', fromNodeId: 'mn-3', toNodeId: 'mn-4', fromPort: 'right', toPort: 'left', label: '3. Publish Event', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'me-4', fromNodeId: 'mn-4', toNodeId: 'mn-5', fromPort: 'bottom', toPort: 'top', label: '4. Consume Event', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'me-5', fromNodeId: 'mn-3', toNodeId: 'mn-6', fromPort: 'bottom', toPort: 'top', label: '5. Persist State', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'me-6', fromNodeId: 'mn-3', toNodeId: 'mn-1', fromPort: 'bottom', toPort: 'bottom', label: '6. Order Response', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
    ]
  };
}

function generateNextjsFlow(isBengali: boolean, title: string): FlowProject {
  return {
    id: `generated-nextjs-${Date.now()}`,
    name: title || (isBengali ? 'নেক্সটজেএস ১৬ আর্কিটেকচার' : 'Next.js 16 Fullstack App Router'),
    description: 'Server Actions, RSC Streaming, Edge Middleware & Prisma ORM',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [
      {
        id: 'sec-nxt-1',
        number: '1',
        title: isBengali ? '১. নেক্সটজেএস রিকোয়েস্ট এবং রেন্ডারিং পাইপলাইন' : '1. Next.js Request & Rendering Pipeline',
        y: 40,
        pillBg: '#E0F2FE',
        pillTextColor: '#0369A1',
        pillBorderColor: '#38BDF8',
        hasDivider: false
      }
    ],
    nodes: [
      { id: 'nxt-1', type: 'browser', x: 60, y: 120, width: 140, height: 110, title: isBengali ? 'ইউজার ব্রাউজার' : 'User Browser', subtitle: 'Client Components', style: { bg: '#FFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' } },
      { id: 'nxt-2', type: 'server', x: 280, y: 120, width: 155, height: 110, title: 'Edge Middleware', subtitle: 'Auth & Geo Routing', style: { bg: NODE_COLOR_PALETTES.yellow.bg, borderColor: NODE_COLOR_PALETTES.yellow.border, borderRadius: 12, textColor: '#000' } },
      { id: 'nxt-3', type: 'server', x: 510, y: 120, width: 165, height: 110, title: 'Server Components', subtitle: 'RSC Stream & Actions', style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 14, textColor: '#000' } },
      { id: 'nxt-4', type: 'database', x: 750, y: 120, width: 140, height: 110, title: 'PostgreSQL DB', subtitle: 'Prisma / Drizzle ORM', style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000' } },
      { id: 'nxt-5', type: 'custom-card', x: 510, y: 310, width: 165, height: 95, title: 'Redis Cache', subtitle: 'Upstash / Unstable_cache', style: { bg: NODE_COLOR_PALETTES.pink.bg, borderColor: NODE_COLOR_PALETTES.pink.border, borderRadius: 12, textColor: '#000' } }
    ],
    edges: [
      { id: 'nxte-1', fromNodeId: 'nxt-1', toNodeId: 'nxt-2', fromPort: 'right', toPort: 'left', label: '1. HTTP Request', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'nxte-2', fromNodeId: 'nxt-2', toNodeId: 'nxt-3', fromPort: 'right', toPort: 'left', label: '2. Pass to RSC', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'nxte-3', fromNodeId: 'nxt-3', toNodeId: 'nxt-4', fromPort: 'right', toPort: 'left', label: '3. Query Data', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'nxte-4', fromNodeId: 'nxt-3', toNodeId: 'nxt-5', fromPort: 'bottom', toPort: 'top', label: '4. Check Cache', lineStyle: 'solid', routeType: 'straight', color: '#000', width: 1.5, arrowhead: 'arrow' },
      { id: 'nxte-5', fromNodeId: 'nxt-3', toNodeId: 'nxt-1', fromPort: 'bottom', toPort: 'bottom', label: '5. Stream HTML/RSC Payload', lineStyle: 'solid', routeType: 'orthogonal', color: '#000', width: 1.5, arrowhead: 'arrow' }
    ]
  };
}
