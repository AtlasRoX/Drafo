import { FlowProject, FlowNode, FlowEdge, FlowSection } from '../types/flow';
import { NODE_COLOR_PALETTES } from '../data/colorPalettes';

export function generateFlowFromPrompt(promptText: string): FlowProject {
  const query = promptText.toLowerCase();
  const isBengali = /[\u0980-\u09FF]/.test(promptText);

  // Check categories
  const isAuth = query.includes('auth') || query.includes('login') || query.includes('লগইন') || query.includes('সাইনইন') || query.includes('otp');
  const isPayment = query.includes('payment') || query.includes('পেমেন্ট') || query.includes('stripe') || query.includes('bkash') || query.includes('বিকাশ') || query.includes('checkout');
  const isAI = query.includes('ai') || query.includes('rag') || query.includes('llm') || query.includes('gpt') || query.includes('চ্যাটবট') || query.includes('এআই');

  if (isAuth) {
    return generateAuthFlow(isBengali, promptText);
  } else if (isPayment) {
    return generatePaymentFlow(isBengali, promptText);
  } else if (isAI) {
    return generateAIFlow(isBengali, promptText);
  } else {
    return generateGenericCrudFlow(isBengali, promptText);
  }
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
