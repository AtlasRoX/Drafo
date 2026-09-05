import { FlowProject } from '../types/flow';
import { NODE_COLOR_PALETTES } from './colorPalettes';

export const TEMPLATES: FlowProject[] = [
  // 1. Next.js 16 App Router Architecture
  {
    id: 'nextjs-16-architecture',
    name: 'Next.js 16 App Router & Server Actions',
    description: 'Server Components (RSC), Client Components, Server Actions & DB Hydration',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Next.js', 'React 19', 'Fullstack'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [
      {
        id: 'sec-get',
        number: '1',
        title: '1. GET Request & Server Component Rendering',
        y: 35,
        pillBg: '#DCF0DC',
        pillTextColor: '#1F5E21',
        pillBorderColor: '#81C784',
        hasDivider: true
      },
      {
        id: 'sec-post',
        number: '2',
        title: '2. POST Mutation via Server Action',
        y: 440,
        pillBg: '#DCF0DC',
        pillTextColor: '#1F5E21',
        pillBorderColor: '#81C784',
        hasDivider: false
      }
    ],
    nodes: [
      {
        id: 'n-browser-1',
        type: 'browser',
        x: 80,
        y: 110,
        width: 140,
        height: 110,
        title: 'Web Browser',
        subtitle: 'Client Device',
        status: 'online',
        style: { bg: '#FFFFFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' },
        sectionId: 'sec-get',
        customData: { browserDots: true, urlBarText: 'https://app.io/dashboard' }
      },
      {
        id: 'n-rsc-1',
        type: 'server',
        x: 380,
        y: 110,
        width: 160,
        height: 110,
        title: 'Next.js Server',
        subtitle: 'app/page.tsx (RSC)',
        status: 'online',
        metric: '18ms',
        style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 12, textColor: '#000', colorPalette: 'green' },
        sectionId: 'sec-get'
      },
      {
        id: 'n-api-1',
        type: 'api',
        x: 690,
        y: 110,
        width: 155,
        height: 110,
        title: 'Backend API',
        subtitle: 'REST / GraphQL',
        status: 'online',
        metric: '12ms',
        style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 12, textColor: '#000', colorPalette: 'blue' },
        sectionId: 'sec-get'
      },
      {
        id: 'n-db-1',
        type: 'database',
        x: 960,
        y: 110,
        width: 130,
        height: 110,
        title: 'PostgreSQL DB',
        subtitle: 'Prisma / Drizzle',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-get'
      },
      {
        id: 'n-client-props',
        type: 'client',
        x: 370,
        y: 300,
        width: 180,
        height: 90,
        title: 'Interactive UI Component',
        subtitle: "'use client' (Props passed from Server)",
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.yellow.bg, borderColor: NODE_COLOR_PALETTES.yellow.border, borderRadius: 12, textColor: '#000', colorPalette: 'yellow' },
        sectionId: 'sec-get'
      },
      // Section 2
      {
        id: 'n-browser-2',
        type: 'browser',
        x: 80,
        y: 520,
        width: 140,
        height: 110,
        title: 'Web Browser',
        subtitle: 'Form Interaction',
        status: 'online',
        style: { bg: '#FFFFFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' },
        sectionId: 'sec-post',
        customData: { browserDots: true, urlBarText: 'https://app.io/submit' }
      },
      {
        id: 'n-action-form',
        type: 'client-form',
        x: 370,
        y: 520,
        width: 160,
        height: 110,
        title: 'Client Form',
        subtitle: 'Form Action Trigger',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.pink.bg, borderColor: NODE_COLOR_PALETTES.pink.border, borderRadius: 12, textColor: '#000', colorPalette: 'pink' },
        sectionId: 'sec-post'
      },
      {
        id: 'n-server-action',
        type: 'action',
        x: 650,
        y: 520,
        width: 160,
        height: 110,
        title: 'Server Action',
        subtitle: "'use server' Mutation",
        status: 'online',
        metric: '32ms',
        style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 12, textColor: '#000', colorPalette: 'green' },
        sectionId: 'sec-post'
      },
      {
        id: 'n-db-2',
        type: 'database',
        x: 960,
        y: 520,
        width: 130,
        height: 110,
        title: 'PostgreSQL DB',
        subtitle: 'Write Mutation',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-post'
      }
    ],
    edges: [
      {
        id: 'e1',
        fromNodeId: 'n-browser-1',
        toNodeId: 'n-rsc-1',
        fromPort: 'right',
        toPort: 'left',
        label: '1. HTTP GET /dashboard',
        stepNumber: 1,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e2',
        fromNodeId: 'n-rsc-1',
        toNodeId: 'n-api-1',
        fromPort: 'right',
        toPort: 'left',
        label: '2. fetch(apiUrl, { cache })',
        stepNumber: 2,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e3',
        fromNodeId: 'n-api-1',
        toNodeId: 'n-db-1',
        fromPort: 'right',
        toPort: 'left',
        label: '3. SQL Query',
        stepNumber: 3,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e4',
        fromNodeId: 'n-rsc-1',
        toNodeId: 'n-client-props',
        fromPort: 'bottom',
        toPort: 'top',
        label: '4. Pass Serialized Props',
        stepNumber: 4,
        lineStyle: 'dashed',
        routeType: 'straight',
        color: '#2563EB',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e5',
        fromNodeId: 'n-client-props',
        toNodeId: 'n-browser-1',
        fromPort: 'left',
        toPort: 'bottom',
        label: '5. Hydrated HTML Stream',
        stepNumber: 5,
        lineStyle: 'solid',
        routeType: 'orthogonal',
        color: '#16A34A',
        width: 1.5,
        arrowhead: 'arrow'
      },
      // Section 2 edges
      {
        id: 'e6',
        fromNodeId: 'n-browser-2',
        toNodeId: 'n-action-form',
        fromPort: 'right',
        toPort: 'left',
        label: '6. User submits form',
        stepNumber: 6,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e7',
        fromNodeId: 'n-action-form',
        toNodeId: 'n-server-action',
        fromPort: 'right',
        toPort: 'left',
        label: '7. RPC Server Action call',
        stepNumber: 7,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'e8',
        fromNodeId: 'n-server-action',
        toNodeId: 'n-db-2',
        fromPort: 'right',
        toPort: 'left',
        label: '8. DB write & revalidatePath()',
        stepNumber: 8,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      }
    ]
  },

  // 2. Microservices & Event-Driven Architecture
  {
    id: 'microservices-event-mesh',
    name: 'Event-Driven Microservices & Kafka Mesh',
    description: 'API Gateway, Auth, Order Service, Kafka Event Stream, Payment Service & DBs',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Microservices', 'Kafka', 'Backend'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [
      {
        id: 'sec-ms-1',
        number: '1',
        title: 'Distributed Microservices Order & Payment Pipeline',
        y: 40,
        pillBg: '#EDE9FE',
        pillTextColor: '#5B21B6',
        pillBorderColor: '#A78BFA',
        hasDivider: true
      }
    ],
    nodes: [
      {
        id: 'ms-client',
        type: 'mobile',
        x: 60,
        y: 130,
        width: 130,
        height: 130,
        title: 'Mobile Client',
        subtitle: 'iOS / Android App',
        status: 'online',
        style: { bg: '#FFFFFF', borderColor: '#4F46E5', headerBg: '#4F46E5', borderRadius: 16, textColor: '#000', colorPalette: 'indigo' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-gw',
        type: 'gateway',
        x: 270,
        y: 135,
        width: 150,
        height: 110,
        title: 'API Gateway',
        subtitle: 'Rate Limiting & Auth',
        status: 'online',
        metric: '5ms',
        style: { bg: NODE_COLOR_PALETTES.cyan.bg, borderColor: NODE_COLOR_PALETTES.cyan.border, borderRadius: 10, textColor: '#000', colorPalette: 'cyan' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-order',
        type: 'microservice',
        x: 500,
        y: 135,
        width: 155,
        height: 110,
        title: 'Order Service',
        subtitle: 'Go Microservice',
        status: 'online',
        metric: '14ms',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 10, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-kafka',
        type: 'queue',
        x: 740,
        y: 135,
        width: 150,
        height: 110,
        title: 'Kafka Topic',
        subtitle: 'orders.created',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.teal.bg, borderColor: NODE_COLOR_PALETTES.teal.border, borderRadius: 10, textColor: '#000', colorPalette: 'teal' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-payment',
        type: 'microservice',
        x: 970,
        y: 135,
        width: 155,
        height: 110,
        title: 'Payment Service',
        subtitle: 'Stripe Consumer',
        status: 'online',
        metric: '40ms',
        style: { bg: NODE_COLOR_PALETTES.green.bg, borderColor: NODE_COLOR_PALETTES.green.border, borderRadius: 10, textColor: '#000', colorPalette: 'green' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-db-order',
        type: 'database',
        x: 510,
        y: 310,
        width: 135,
        height: 110,
        title: 'Order DB',
        subtitle: 'PostgreSQL',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-ms-1'
      },
      {
        id: 'ms-redis',
        type: 'cache',
        x: 275,
        y: 310,
        width: 140,
        height: 100,
        title: 'Redis Cluster',
        subtitle: 'JWT Session Cache',
        status: 'online',
        metric: '1ms',
        style: { bg: NODE_COLOR_PALETTES.amber.bg, borderColor: NODE_COLOR_PALETTES.amber.border, borderRadius: 10, textColor: '#000', colorPalette: 'amber' },
        sectionId: 'sec-ms-1'
      }
    ],
    edges: [
      {
        id: 'mse-1',
        fromNodeId: 'ms-client',
        toNodeId: 'ms-gw',
        fromPort: 'right',
        toPort: 'left',
        label: '1. POST /api/v1/orders',
        stepNumber: 1,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'mse-2',
        fromNodeId: 'ms-gw',
        toNodeId: 'ms-redis',
        fromPort: 'bottom',
        toPort: 'top',
        label: '2. Verify Token Cache',
        stepNumber: 2,
        lineStyle: 'dashed',
        routeType: 'straight',
        color: '#D97706',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'mse-3',
        fromNodeId: 'ms-gw',
        toNodeId: 'ms-order',
        fromPort: 'right',
        toPort: 'left',
        label: '3. gRPC Forward',
        stepNumber: 3,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'mse-4',
        fromNodeId: 'ms-order',
        toNodeId: 'ms-db-order',
        fromPort: 'bottom',
        toPort: 'top',
        label: '4. Save PENDING Order',
        stepNumber: 4,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#9333EA',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'mse-5',
        fromNodeId: 'ms-order',
        toNodeId: 'ms-kafka',
        fromPort: 'right',
        toPort: 'left',
        label: '5. Emit OrderCreated Event',
        stepNumber: 5,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#0D9488',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'mse-6',
        fromNodeId: 'ms-kafka',
        toNodeId: 'ms-payment',
        fromPort: 'right',
        toPort: 'left',
        label: '6. Consume & Charge Card',
        stepNumber: 6,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#16A34A',
        width: 1.5,
        arrowhead: 'arrow'
      }
    ]
  },

  // 3. Modern Auth & OAuth2 JWT Flow
  {
    id: 'auth-jwt-lifecycle',
    name: 'OAuth2 & JWT Authentication Flow',
    description: 'Login, Refresh Tokens, Session Storage & Protected API Gateway',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Auth', 'Security', 'OAuth2'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [
      {
        id: 'sec-auth-main',
        number: '1',
        title: 'OAuth2 Token Grant & Secure Route Verification',
        y: 40,
        pillBg: '#FFE4E6',
        pillTextColor: '#9F1239',
        pillBorderColor: '#FDA4AF',
        hasDivider: true
      }
    ],
    nodes: [
      {
        id: 'auth-browser',
        type: 'browser',
        x: 80,
        y: 135,
        width: 140,
        height: 110,
        title: 'Client Web App',
        subtitle: 'Login Form',
        status: 'online',
        style: { bg: '#FFFFFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' },
        sectionId: 'sec-auth-main',
        customData: { browserDots: true, urlBarText: 'https://auth.app.com/login' }
      },
      {
        id: 'auth-server',
        type: 'auth',
        x: 360,
        y: 135,
        width: 155,
        height: 110,
        title: 'Auth Service',
        subtitle: 'OAuth2 / PKCE Server',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.rose.bg, borderColor: NODE_COLOR_PALETTES.rose.border, borderRadius: 10, textColor: '#000', colorPalette: 'rose' },
        sectionId: 'sec-auth-main'
      },
      {
        id: 'auth-db',
        type: 'database',
        x: 630,
        y: 135,
        width: 130,
        height: 110,
        title: 'Users DB',
        subtitle: 'Bcrypt Passwords & Roles',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-auth-main'
      },
      {
        id: 'auth-api',
        type: 'api',
        x: 890,
        y: 135,
        width: 155,
        height: 110,
        title: 'Protected API',
        subtitle: 'JWT Claims Validation',
        status: 'online',
        style: { bg: NODE_COLOR_PALETTES.blue.bg, borderColor: NODE_COLOR_PALETTES.blue.border, borderRadius: 10, textColor: '#000', colorPalette: 'blue' },
        sectionId: 'sec-auth-main'
      }
    ],
    edges: [
      {
        id: 'ae-1',
        fromNodeId: 'auth-browser',
        toNodeId: 'auth-server',
        fromPort: 'right',
        toPort: 'left',
        label: '1. POST /oauth/token (Credentials)',
        stepNumber: 1,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'ae-2',
        fromNodeId: 'auth-server',
        toNodeId: 'auth-db',
        fromPort: 'right',
        toPort: 'left',
        label: '2. Verify Credentials',
        stepNumber: 2,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#9333EA',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'ae-3',
        fromNodeId: 'auth-server',
        toNodeId: 'auth-browser',
        fromPort: 'bottom',
        toPort: 'bottom',
        label: '3. Set HttpOnly JWT & Refresh Cookie',
        stepNumber: 3,
        lineStyle: 'solid',
        routeType: 'curved',
        color: '#16A34A',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 'ae-4',
        fromNodeId: 'auth-browser',
        toNodeId: 'auth-api',
        fromPort: 'top',
        toPort: 'top',
        label: '4. GET /api/user/profile (Bearer JWT)',
        stepNumber: 4,
        lineStyle: 'solid',
        routeType: 'curved',
        color: '#2563EB',
        width: 1.5,
        arrowhead: 'arrow'
      }
    ]
  },

  // 4. AI Agent & RAG Pipeline
  {
    id: 'ai-agent-rag-pipeline',
    name: 'AI Agent & RAG Vector Pipeline',
    description: 'User Query, Embeddings, Vector Database Retrieval, Context Injection & LLM Stream',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['AI', 'LLM', 'RAG'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [
      {
        id: 'sec-rag',
        number: '1',
        title: 'Retrieval Augmented Generation (RAG) Architecture',
        y: 40,
        pillBg: '#EEF2FF',
        pillTextColor: '#3730A3',
        pillBorderColor: '#A5B4FC',
        hasDivider: true
      }
    ],
    nodes: [
      {
        id: 'rag-user',
        type: 'browser',
        x: 80,
        y: 130,
        width: 140,
        height: 115,
        title: 'AI Chat Interface',
        subtitle: 'Streaming UI',
        status: 'online',
        style: { bg: '#FFFFFF', borderColor: '#2563EB', headerBg: '#2563EB', borderRadius: 10, textColor: '#0F172A' },
        sectionId: 'sec-rag',
        customData: { browserDots: true, urlBarText: 'https://chat.ai.com' }
      },
      {
        id: 'rag-agent',
        type: 'microservice',
        x: 350,
        y: 135,
        width: 160,
        height: 110,
        title: 'AI Agent Controller',
        subtitle: 'LangChain / Vercel AI SDK',
        status: 'online',
        metric: '15ms',
        style: { bg: NODE_COLOR_PALETTES.indigo.bg, borderColor: NODE_COLOR_PALETTES.indigo.border, borderRadius: 10, textColor: '#000', colorPalette: 'indigo' },
        sectionId: 'sec-rag'
      },
      {
        id: 'rag-vector',
        type: 'database',
        x: 640,
        y: 135,
        width: 145,
        height: 115,
        title: 'Vector Database',
        subtitle: 'Pinecone / pgvector (HNSW)',
        status: 'online',
        metric: '12ms',
        style: { bg: NODE_COLOR_PALETTES.purple.bg, borderColor: NODE_COLOR_PALETTES.purple.border, borderRadius: 12, textColor: '#000', colorPalette: 'purple' },
        sectionId: 'sec-rag'
      },
      {
        id: 'rag-llm',
        type: 'cloud',
        x: 920,
        y: 135,
        width: 155,
        height: 110,
        title: 'LLM Foundation Model',
        subtitle: 'Claude / GPT-4o API',
        status: 'online',
        metric: '180ms',
        style: { bg: NODE_COLOR_PALETTES.amber.bg, borderColor: NODE_COLOR_PALETTES.amber.border, borderRadius: 12, textColor: '#000', colorPalette: 'amber' },
        sectionId: 'sec-rag'
      }
    ],
    edges: [
      {
        id: 're-1',
        fromNodeId: 'rag-user',
        toNodeId: 'rag-agent',
        fromPort: 'right',
        toPort: 'left',
        label: '1. Send User Prompt',
        stepNumber: 1,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#000000',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 're-2',
        fromNodeId: 'rag-agent',
        toNodeId: 'rag-vector',
        fromPort: 'right',
        toPort: 'left',
        label: '2. Query Top-K Similar Chunks',
        stepNumber: 2,
        lineStyle: 'solid',
        routeType: 'straight',
        color: '#9333EA',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 're-3',
        fromNodeId: 'rag-agent',
        toNodeId: 'rag-llm',
        fromPort: 'top',
        toPort: 'top',
        label: '3. Prompt + Injected Context',
        stepNumber: 3,
        lineStyle: 'solid',
        routeType: 'curved',
        color: '#D97706',
        width: 1.5,
        arrowhead: 'arrow'
      },
      {
        id: 're-4',
        fromNodeId: 'rag-llm',
        toNodeId: 'rag-user',
        fromPort: 'bottom',
        toPort: 'bottom',
        label: '4. Stream SSE Token Response',
        stepNumber: 4,
        lineStyle: 'solid',
        routeType: 'curved',
        color: '#16A34A',
        width: 1.5,
        arrowhead: 'arrow'
      }
    ]
  },

  // 5. Blank Canvas Template
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    description: 'Empty infinite canvas to build custom architecture diagrams from scratch',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['Blank', 'Custom'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [],
    nodes: [],
    edges: []
  }
];
