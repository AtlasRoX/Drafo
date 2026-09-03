'use client';

import React from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  Server,
  Layers,
  Zap,
  Activity,
  GitFork,
  Database,
  HardDrive,
  Cpu,
  Radio,
  Cloud,
  ShieldCheck,
  StickyNote,
  Search,
  Box,
  Split,
  Wifi,
  Bot,
  Brain,
  Sparkles,
  Lock,
  Key,
  Sliders,
  BarChart2,
  GitBranch,
  Shield,
  FileText,
  Network,
  Share2,
  Repeat,
  Clock
} from 'lucide-react';
import { FlowNode as FlowNodeType, NodeType } from '../types/flow';

export interface PaletteItem {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  category:
    | 'Clients'
    | 'Compute'
    | 'Routing'
    | 'Storage'
    | 'Messaging & Events'
    | 'AI & ML'
    | 'Security & Auth'
    | 'DevOps & Monitoring'
    | 'Cloud'
    | 'Annotations';
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  preset: Partial<FlowNodeType>;
}

export const ARCHITECTURE_COMPONENTS: PaletteItem[] = [
  // ==========================================
  // 1. CLIENTS & ENDPOINTS (6)
  // ==========================================
  {
    id: 'comp-browser',
    type: 'browser',
    name: 'Web Browser',
    description: 'Client browser window with URL address bar',
    category: 'Clients',
    icon: <Globe size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'browser',
      width: 160,
      height: 120,
      title: 'Web Client',
      subtitle: 'React / Next.js SPA',
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: '#2563EB',
        headerBg: '#2563EB',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      },
      customData: {
        browserDots: true,
        urlBarText: 'https://app.domain.com'
      }
    }
  },
  {
    id: 'comp-mobile',
    type: 'mobile',
    name: 'Mobile App',
    description: 'iOS / Android client smartphone frame',
    category: 'Clients',
    icon: <Smartphone size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'mobile',
      width: 140,
      height: 190,
      title: 'Mobile App',
      subtitle: 'React Native / Swift',
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: '#1E293B',
        headerBg: '#1E293B',
        borderRadius: 20,
        borderStyle: 'solid',
        borderWidth: 2,
        colorPalette: 'dark'
      }
    }
  },
  {
    id: 'comp-desktop',
    type: 'desktop',
    name: 'Desktop App',
    description: 'macOS / Windows desktop client app',
    category: 'Clients',
    icon: <Monitor size={16} />,
    iconBg: '#F1F5F9',
    iconColor: '#334155',
    preset: {
      type: 'desktop',
      width: 160,
      height: 120,
      title: 'Desktop Client',
      subtitle: 'Electron / Tauri App',
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: '#475569',
        headerBg: '#475569',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'slate'
      }
    }
  },
  {
    id: 'comp-terminal',
    type: 'terminal',
    name: 'Terminal CLI',
    description: 'Developer command-line client or curl',
    category: 'Clients',
    icon: <Terminal size={16} />,
    iconBg: '#F1F5F9',
    iconColor: '#0F172A',
    preset: {
      type: 'terminal',
      width: 155,
      height: 115,
      title: 'Terminal CLI',
      subtitle: 'curl / drafo CLI',
      status: 'online',
      style: {
        bg: '#FFFFFF',
        borderColor: '#0F172A',
        headerBg: '#0F172A',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'dark'
      }
    }
  },
  {
    id: 'comp-iot',
    type: 'client',
    name: 'IoT / Edge Device',
    description: 'Embedded hardware sensor / Raspberry Pi',
    category: 'Clients',
    icon: <Cpu size={16} />,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    preset: {
      type: 'client',
      width: 150,
      height: 105,
      title: 'IoT Gateway',
      subtitle: 'Telemetry Sensor',
      status: 'online',
      style: {
        bg: '#FFFBEB',
        borderColor: '#F59E0B',
        headerBg: '#D97706',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'amber'
      }
    }
  },
  {
    id: 'comp-webhook',
    type: 'client',
    name: 'Webhook Sender',
    description: 'External webhook event source (Stripe/GitHub)',
    category: 'Clients',
    icon: <Share2 size={16} />,
    iconBg: '#F3E8FF',
    iconColor: '#7E22CE',
    preset: {
      type: 'client',
      width: 155,
      height: 105,
      title: 'Stripe Webhook',
      subtitle: 'POST /api/webhooks',
      status: 'online',
      style: {
        bg: '#FAF5FF',
        borderColor: '#A855F7',
        headerBg: '#7E22CE',
        borderRadius: 8,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        colorPalette: 'purple'
      }
    }
  },

  // ==========================================
  // 2. COMPUTE & FRAMEWORKS (8)
  // ==========================================
  {
    id: 'comp-server-rsc',
    type: 'server',
    name: 'Next.js RSC',
    description: 'React Server Component (SSR / Page)',
    category: 'Compute',
    icon: <Server size={16} />,
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    preset: {
      type: 'server',
      width: 160,
      height: 110,
      title: 'Next.js App Router',
      subtitle: 'app/dashboard/page.tsx',
      status: 'online',
      metric: '25ms',
      style: {
        bg: '#F0FDF4',
        borderColor: '#22C55E',
        headerBg: '#16A34A',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'green'
      }
    }
  },
  {
    id: 'comp-api-node',
    type: 'api',
    name: 'Node.js Express API',
    description: 'Backend REST API endpoint server',
    category: 'Compute',
    icon: <Zap size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'api',
      width: 155,
      height: 110,
      title: 'Node.js API',
      subtitle: 'Express / Fastify REST',
      status: 'online',
      metric: '14ms',
      style: {
        bg: '#EFF6FF',
        borderColor: '#3B82F6',
        headerBg: '#2563EB',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    }
  },
  {
    id: 'comp-api-fastapi',
    type: 'api',
    name: 'FastAPI Python Service',
    description: 'High-performance async Python backend',
    category: 'Compute',
    icon: <Zap size={16} />,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    preset: {
      type: 'api',
      width: 160,
      height: 110,
      title: 'FastAPI Service',
      subtitle: 'Python 3.12 / Uvicorn',
      status: 'online',
      metric: '18ms',
      style: {
        bg: '#ECFDF5',
        borderColor: '#10B981',
        headerBg: '#059669',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'emerald'
      }
    }
  },
  {
    id: 'comp-microservice-go',
    type: 'microservice',
    name: 'Go Microservice',
    description: 'Decoupled domain service container',
    category: 'Compute',
    icon: <Box size={16} />,
    iconBg: '#FAF5FF',
    iconColor: '#9333EA',
    preset: {
      type: 'microservice',
      width: 155,
      height: 110,
      title: 'Order Service',
      subtitle: 'Go / gRPC Microservice',
      status: 'online',
      metric: '4ms',
      style: {
        bg: '#FAF5FF',
        borderColor: '#A855F7',
        headerBg: '#9333EA',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'purple'
      }
    }
  },
  {
    id: 'comp-serverless-lambda',
    type: 'serverless',
    name: 'AWS Lambda',
    description: 'Event-driven serverless compute function',
    category: 'Compute',
    icon: <Zap size={16} />,
    iconBg: '#FEFCE8',
    iconColor: '#CA8A04',
    preset: {
      type: 'serverless',
      width: 150,
      height: 105,
      title: 'AWS Lambda',
      subtitle: 'Node.js 20.x Handler',
      status: 'online',
      style: {
        bg: '#FEFCE8',
        borderColor: '#EAB308',
        headerBg: '#CA8A04',
        borderRadius: 10,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        colorPalette: 'yellow'
      }
    }
  },
  {
    id: 'comp-edge-worker',
    type: 'serverless',
    name: 'Cloudflare Worker',
    description: 'Sub-millisecond V8 edge compute isolate',
    category: 'Compute',
    icon: <Globe size={16} />,
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    preset: {
      type: 'serverless',
      width: 155,
      height: 105,
      title: 'Edge Worker',
      subtitle: 'Cloudflare Workers / Deno',
      status: 'online',
      metric: '2ms',
      style: {
        bg: '#FFF7ED',
        borderColor: '#F97316',
        headerBg: '#EA580C',
        borderRadius: 10,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        colorPalette: 'orange'
      }
    }
  },
  {
    id: 'comp-graphql-federation',
    type: 'server',
    name: 'GraphQL Federation',
    description: 'Unified GraphQL gateway supergraph',
    category: 'Compute',
    icon: <Network size={16} />,
    iconBg: '#FDF2F8',
    iconColor: '#DB2777',
    preset: {
      type: 'server',
      width: 160,
      height: 110,
      title: 'GraphQL Gateway',
      subtitle: 'Apollo Router / Mesh',
      status: 'online',
      style: {
        bg: '#FDF2F8',
        borderColor: '#EC4899',
        headerBg: '#DB2777',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'pink'
      }
    }
  },
  {
    id: 'comp-job-worker',
    type: 'worker',
    name: 'Background Worker',
    description: 'Asynchronous task queue processor',
    category: 'Compute',
    icon: <Repeat size={16} />,
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    preset: {
      type: 'worker',
      width: 155,
      height: 105,
      title: 'Queue Worker',
      subtitle: 'BullMQ / Celery Daemon',
      status: 'online',
      metric: '120 jobs/s',
      style: {
        bg: '#F8FAFC',
        borderColor: '#64748B',
        headerBg: '#475569',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'slate'
      }
    }
  },

  // ==========================================
  // 3. ROUTING & NETWORKING (6)
  // ==========================================
  {
    id: 'comp-gateway',
    type: 'gateway',
    name: 'API Gateway',
    description: 'Reverse proxy, routing, SSL & rate limiting',
    category: 'Routing',
    icon: <Layers size={16} />,
    iconBg: '#ECFEFF',
    iconColor: '#0891B2',
    preset: {
      type: 'gateway',
      width: 155,
      height: 105,
      title: 'API Gateway',
      subtitle: 'Kong / Envoy / Traefik',
      status: 'online',
      style: {
        bg: '#ECFEFF',
        borderColor: '#06B6D4',
        headerBg: '#0891B2',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'cyan'
      }
    }
  },
  {
    id: 'comp-loadbalancer',
    type: 'loadbalancer',
    name: 'Load Balancer (ALB)',
    description: 'Traffic distribution across server clusters',
    category: 'Routing',
    icon: <Split size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'loadbalancer',
      width: 155,
      height: 105,
      title: 'AWS ALB / NLB',
      subtitle: 'Round-Robin Ingress',
      status: 'online',
      style: {
        bg: '#EFF6FF',
        borderColor: '#3B82F6',
        headerBg: '#2563EB',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    }
  },
  {
    id: 'comp-cdn',
    type: 'cdn',
    name: 'Global CDN',
    description: 'Edge caching & DDoS static asset delivery',
    category: 'Routing',
    icon: <Globe size={16} />,
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
    preset: {
      type: 'cdn',
      width: 150,
      height: 105,
      title: 'Cloudflare CDN',
      subtitle: 'Global Edge Cache',
      status: 'online',
      style: {
        bg: '#F0F9FF',
        borderColor: '#38BDF8',
        headerBg: '#0284C7',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'sky'
      }
    }
  },
  {
    id: 'comp-reverse-proxy',
    type: 'gateway',
    name: 'Nginx Reverse Proxy',
    description: 'TLS termination and URL path routing',
    category: 'Routing',
    icon: <Network size={16} />,
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    preset: {
      type: 'gateway',
      width: 155,
      height: 105,
      title: 'Nginx Ingress',
      subtitle: 'TLS Termination',
      status: 'online',
      style: {
        bg: '#F0FDF4',
        borderColor: '#22C55E',
        headerBg: '#16A34A',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'green'
      }
    }
  },
  {
    id: 'comp-decision',
    type: 'decision',
    name: 'Decision Diamond',
    description: 'Conditional logic (If / Else branch)',
    category: 'Routing',
    icon: <GitFork size={16} />,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    preset: {
      type: 'decision',
      width: 125,
      height: 125,
      title: 'Valid Request?',
      subtitle: 'Conditional Check',
      style: {
        bg: '#FFFBEB',
        borderColor: '#F59E0B',
        headerBg: '#D97706',
        borderRadius: 14,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'amber'
      }
    }
  },
  {
    id: 'comp-sidecar',
    type: 'middleware',
    name: 'Service Mesh Proxy',
    description: 'Envoy sidecar proxy with mTLS encryption',
    category: 'Routing',
    icon: <Sliders size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'middleware',
      width: 150,
      height: 105,
      title: 'Envoy Sidecar',
      subtitle: 'Istio / Linkerd mTLS',
      status: 'online',
      style: {
        bg: '#EEF2FF',
        borderColor: '#6366F1',
        headerBg: '#4F46E5',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'indigo'
      }
    }
  },

  // ==========================================
  // 4. STORAGE & DATABASES (8)
  // ==========================================
  {
    id: 'comp-db-postgres',
    type: 'database',
    name: 'PostgreSQL DB',
    description: 'ACID relational database with 3D cylinder',
    category: 'Storage',
    icon: <Database size={16} />,
    iconBg: '#FAF5FF',
    iconColor: '#9333EA',
    preset: {
      type: 'database',
      width: 135,
      height: 115,
      title: 'PostgreSQL',
      subtitle: 'Primary Master DB',
      status: 'online',
      style: {
        bg: '#FAF5FF',
        borderColor: '#A855F7',
        headerBg: '#9333EA',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'purple'
      }
    }
  },
  {
    id: 'comp-db-mysql',
    type: 'database',
    name: 'MySQL Database',
    description: 'Relational database with read replicas',
    category: 'Storage',
    icon: <Database size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'database',
      width: 135,
      height: 115,
      title: 'MySQL 8.0',
      subtitle: 'InnoDB Cluster',
      status: 'online',
      style: {
        bg: '#EFF6FF',
        borderColor: '#3B82F6',
        headerBg: '#2563EB',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    }
  },
  {
    id: 'comp-db-mongo',
    type: 'nosql',
    name: 'MongoDB NoSQL',
    description: 'Document database for flexible JSON schemas',
    category: 'Storage',
    icon: <Database size={16} />,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    preset: {
      type: 'nosql',
      width: 140,
      height: 110,
      title: 'MongoDB Atlas',
      subtitle: 'Document Collections',
      status: 'online',
      style: {
        bg: '#ECFDF5',
        borderColor: '#10B981',
        headerBg: '#059669',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'emerald'
      }
    }
  },
  {
    id: 'comp-cache-redis',
    type: 'cache',
    name: 'Redis Cache',
    description: 'Sub-millisecond in-memory cache & store',
    category: 'Storage',
    icon: <Zap size={16} />,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    preset: {
      type: 'cache',
      width: 140,
      height: 105,
      title: 'Redis Cluster',
      subtitle: 'Session & Data Cache',
      status: 'online',
      metric: '0.8ms',
      style: {
        bg: '#FFFBEB',
        borderColor: '#F59E0B',
        headerBg: '#D97706',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'amber'
      }
    }
  },
  {
    id: 'comp-cache-memcached',
    type: 'cache',
    name: 'Memcached Store',
    description: 'High-speed distributed memory caching',
    category: 'Storage',
    icon: <HardDrive size={16} />,
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    preset: {
      type: 'cache',
      width: 140,
      height: 105,
      title: 'Memcached',
      subtitle: 'LRU Object Cache',
      status: 'online',
      style: {
        bg: '#F8FAFC',
        borderColor: '#64748B',
        headerBg: '#475569',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'slate'
      }
    }
  },
  {
    id: 'comp-storage-s3',
    type: 'storage',
    name: 'Amazon S3 / R2',
    description: 'Cloud object blob storage for assets & backups',
    category: 'Storage',
    icon: <HardDrive size={16} />,
    iconBg: '#F8FAFC',
    iconColor: '#334155',
    preset: {
      type: 'storage',
      width: 145,
      height: 105,
      title: 'S3 Bucket',
      subtitle: 'Media & File Storage',
      status: 'online',
      style: {
        bg: '#F8FAFC',
        borderColor: '#64748B',
        headerBg: '#334155',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'slate'
      }
    }
  },
  {
    id: 'comp-db-elastic',
    type: 'database',
    name: 'Elasticsearch DB',
    description: 'Distributed search and analytics engine',
    category: 'Storage',
    icon: <Search size={16} />,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    preset: {
      type: 'database',
      width: 145,
      height: 110,
      title: 'Elasticsearch',
      subtitle: 'Search Index Cluster',
      status: 'online',
      style: {
        bg: '#FEF2F2',
        borderColor: '#EF4444',
        headerBg: '#DC2626',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'red'
      }
    }
  },
  {
    id: 'comp-db-cassandra',
    type: 'nosql',
    name: 'Cassandra / Scylla',
    description: 'Distributed wide-column database',
    category: 'Storage',
    icon: <Database size={16} />,
    iconBg: '#F0FDFA',
    iconColor: '#0D9488',
    preset: {
      type: 'nosql',
      width: 145,
      height: 110,
      title: 'Cassandra DB',
      subtitle: 'Time-Series Store',
      status: 'online',
      style: {
        bg: '#F0FDFA',
        borderColor: '#14B8A6',
        headerBg: '#0D9488',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'teal'
      }
    }
  },

  // ==========================================
  // 5. MESSAGING & EVENTS (5)
  // ==========================================
  {
    id: 'comp-msg-kafka',
    type: 'queue',
    name: 'Apache Kafka',
    description: 'High-throughput event streaming platform',
    category: 'Messaging & Events',
    icon: <Radio size={16} />,
    iconBg: '#F0FDFA',
    iconColor: '#0D9488',
    preset: {
      type: 'queue',
      width: 155,
      height: 105,
      title: 'Apache Kafka',
      subtitle: 'Topics & Event Stream',
      status: 'online',
      metric: '50k msg/s',
      style: {
        bg: '#F0FDFA',
        borderColor: '#14B8A6',
        headerBg: '#0D9488',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'teal'
      }
    }
  },
  {
    id: 'comp-msg-rabbitmq',
    type: 'queue',
    name: 'RabbitMQ Broker',
    description: 'AMQP exchange & message queue broker',
    category: 'Messaging & Events',
    icon: <Radio size={16} />,
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    preset: {
      type: 'queue',
      width: 155,
      height: 105,
      title: 'RabbitMQ',
      subtitle: 'Exchange & Routing Keys',
      status: 'online',
      style: {
        bg: '#FFF7ED',
        borderColor: '#F97316',
        headerBg: '#EA580C',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'orange'
      }
    }
  },
  {
    id: 'comp-msg-sqs',
    type: 'queue',
    name: 'AWS SQS / SNS',
    description: 'Managed pub/sub and dead-letter queue',
    category: 'Messaging & Events',
    icon: <Radio size={16} />,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    preset: {
      type: 'queue',
      width: 150,
      height: 105,
      title: 'AWS SQS Queue',
      subtitle: 'FIFO / Standard Queue',
      status: 'online',
      style: {
        bg: '#FFFBEB',
        borderColor: '#F59E0B',
        headerBg: '#D97706',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'amber'
      }
    }
  },
  {
    id: 'comp-msg-pubsub',
    type: 'queue',
    name: 'Redis Pub/Sub',
    description: 'Real-time broadcast publish/subscribe bus',
    category: 'Messaging & Events',
    icon: <Radio size={16} />,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    preset: {
      type: 'queue',
      width: 145,
      height: 105,
      title: 'Redis Pub/Sub',
      subtitle: 'Channel Broadcast',
      status: 'online',
      style: {
        bg: '#FEF2F2',
        borderColor: '#EF4444',
        headerBg: '#DC2626',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'red'
      }
    }
  },
  {
    id: 'comp-msg-websocket',
    type: 'server',
    name: 'WebSocket Server',
    description: 'Full-duplex real-time client connection',
    category: 'Messaging & Events',
    icon: <Wifi size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'server',
      width: 155,
      height: 105,
      title: 'WebSocket Node',
      subtitle: 'Socket.io / ws Server',
      status: 'online',
      metric: '10k conns',
      style: {
        bg: '#EEF2FF',
        borderColor: '#6366F1',
        headerBg: '#4F46E5',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'indigo'
      }
    }
  },

  // ==========================================
  // 6. AI & MACHINE LEARNING (6)
  // ==========================================
  {
    id: 'comp-ai-llm',
    type: 'api',
    name: 'LLM Inference API',
    description: 'OpenAI / Claude / vLLM inference provider',
    category: 'AI & ML',
    icon: <Bot size={16} />,
    iconBg: '#FAF5FF',
    iconColor: '#9333EA',
    preset: {
      type: 'api',
      width: 160,
      height: 110,
      title: 'LLM API',
      subtitle: 'GPT-4o / Claude 3.5 Sonnet',
      status: 'online',
      metric: '45 tps',
      style: {
        bg: '#FAF5FF',
        borderColor: '#A855F7',
        headerBg: '#9333EA',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'purple'
      }
    }
  },
  {
    id: 'comp-ai-vector-db',
    type: 'database',
    name: 'Vector Database',
    description: 'Pinecone / Qdrant / Weaviate vector store',
    category: 'AI & ML',
    icon: <Brain size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'database',
      width: 155,
      height: 115,
      title: 'Vector DB',
      subtitle: 'Pinecone / Weaviate Index',
      status: 'online',
      metric: '1536 dims',
      style: {
        bg: '#EFF6FF',
        borderColor: '#3B82F6',
        headerBg: '#2563EB',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    }
  },
  {
    id: 'comp-ai-embeddings',
    type: 'microservice',
    name: 'Embedding Service',
    description: 'Vector embeddings generation pipeline',
    category: 'AI & ML',
    icon: <Sparkles size={16} />,
    iconBg: '#ECFEFF',
    iconColor: '#0891B2',
    preset: {
      type: 'microservice',
      width: 155,
      height: 105,
      title: 'Embeddings Node',
      subtitle: 'text-embedding-3-small',
      status: 'online',
      style: {
        bg: '#ECFEFF',
        borderColor: '#06B6D4',
        headerBg: '#0891B2',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'cyan'
      }
    }
  },
  {
    id: 'comp-ai-agent',
    type: 'server',
    name: 'Agentic Orchestrator',
    description: 'Autonomous reasoning loop & tool executor',
    category: 'AI & ML',
    icon: <Bot size={16} />,
    iconBg: '#FDF2F8',
    iconColor: '#DB2777',
    preset: {
      type: 'server',
      width: 165,
      height: 110,
      title: 'AI Agent Loop',
      subtitle: 'ReAct / Tool Calling Engine',
      status: 'online',
      style: {
        bg: '#FDF2F8',
        borderColor: '#EC4899',
        headerBg: '#DB2777',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'pink'
      }
    }
  },
  {
    id: 'comp-ai-gpu',
    type: 'server',
    name: 'GPU Compute Cluster',
    description: 'NVIDIA H100 distributed PyTorch cluster',
    category: 'AI & ML',
    icon: <Cpu size={16} />,
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    preset: {
      type: 'server',
      width: 160,
      height: 110,
      title: 'GPU Cluster',
      subtitle: '8x NVIDIA H100 80GB',
      status: 'online',
      metric: '98% VRAM',
      style: {
        bg: '#F0FDF4',
        borderColor: '#22C55E',
        headerBg: '#16A34A',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'green'
      }
    }
  },
  {
    id: 'comp-ai-rag',
    type: 'worker',
    name: 'RAG Knowledge Pipeline',
    description: 'Document ingestion, chunking & indexing',
    category: 'AI & ML',
    icon: <Search size={16} />,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    preset: {
      type: 'worker',
      width: 160,
      height: 105,
      title: 'RAG Ingestion',
      subtitle: 'Chunking & Metadata Hybrid',
      status: 'online',
      style: {
        bg: '#FFFBEB',
        borderColor: '#F59E0B',
        headerBg: '#D97706',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'amber'
      }
    }
  },

  // ==========================================
  // 7. SECURITY, AUTH & IDENTITY (6)
  // ==========================================
  {
    id: 'comp-auth-oauth',
    type: 'auth',
    name: 'OAuth2 / OIDC Provider',
    description: 'Identity authentication (Clerk / Auth0)',
    category: 'Security & Auth',
    icon: <ShieldCheck size={16} />,
    iconBg: '#FFF1F2',
    iconColor: '#E11D48',
    preset: {
      type: 'auth',
      width: 155,
      height: 105,
      title: 'OAuth2 Provider',
      subtitle: 'Clerk / Auth0 / Supabase',
      status: 'online',
      style: {
        bg: '#FFF1F2',
        borderColor: '#F43F5E',
        headerBg: '#E11D48',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'rose'
      }
    }
  },
  {
    id: 'comp-auth-jwt',
    type: 'middleware',
    name: 'JWT Token Verifier',
    description: 'Cryptographic bearer signature verification',
    category: 'Security & Auth',
    icon: <Key size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'middleware',
      width: 150,
      height: 105,
      title: 'JWT Verifier',
      subtitle: 'RS256 Signature Check',
      status: 'online',
      style: {
        bg: '#EEF2FF',
        borderColor: '#6366F1',
        headerBg: '#4F46E5',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'indigo'
      }
    }
  },
  {
    id: 'comp-sec-waf',
    type: 'middleware',
    name: 'Cloud WAF Shield',
    description: 'Web Application Firewall & DDoS filtering',
    category: 'Security & Auth',
    icon: <Shield size={16} />,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    preset: {
      type: 'middleware',
      width: 155,
      height: 105,
      title: 'Cloud WAF',
      subtitle: 'OWASP Top 10 Rules',
      status: 'online',
      style: {
        bg: '#FEF2F2',
        borderColor: '#EF4444',
        headerBg: '#DC2626',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'red'
      }
    }
  },
  {
    id: 'comp-sec-vault',
    type: 'storage',
    name: 'Secrets Vault (KMS)',
    description: 'Encrypted secrets & API key store',
    category: 'Security & Auth',
    icon: <Lock size={16} />,
    iconBg: '#F8FAFC',
    iconColor: '#0F172A',
    preset: {
      type: 'storage',
      width: 150,
      height: 105,
      title: 'HashiCorp Vault',
      subtitle: 'Secrets & AWS KMS',
      status: 'online',
      style: {
        bg: '#F8FAFC',
        borderColor: '#475569',
        headerBg: '#0F172A',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'dark'
      }
    }
  },
  {
    id: 'comp-sec-ratelimit',
    type: 'middleware',
    name: 'API Rate Limiter',
    description: 'Sliding window & token bucket rate guard',
    category: 'Security & Auth',
    icon: <Clock size={16} />,
    iconBg: '#FEFCE8',
    iconColor: '#CA8A04',
    preset: {
      type: 'middleware',
      width: 150,
      height: 105,
      title: 'Rate Limiter',
      subtitle: 'Upstash / Redis Sliding Window',
      status: 'online',
      metric: '100 req/m',
      style: {
        bg: '#FEFCE8',
        borderColor: '#EAB308',
        headerBg: '#CA8A04',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'yellow'
      }
    }
  },
  {
    id: 'comp-sec-iam',
    type: 'auth',
    name: 'IAM RBAC Engine',
    description: 'Role-based authorization & permission check',
    category: 'Security & Auth',
    icon: <ShieldCheck size={16} />,
    iconBg: '#ECFEFF',
    iconColor: '#0891B2',
    preset: {
      type: 'auth',
      width: 155,
      height: 105,
      title: 'RBAC Policy',
      subtitle: 'Permissions & Roles',
      status: 'online',
      style: {
        bg: '#ECFEFF',
        borderColor: '#06B6D4',
        headerBg: '#0891B2',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'cyan'
      }
    }
  },

  // ==========================================
  // 8. DEVOPS & OBSERVABILITY (6)
  // ==========================================
  {
    id: 'comp-ops-k8s',
    type: 'kubernetes',
    name: 'Kubernetes Cluster',
    description: 'Container pod orchestration and autoscaling',
    category: 'DevOps & Monitoring',
    icon: <Layers size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'kubernetes',
      width: 160,
      height: 110,
      title: 'K8s Cluster',
      subtitle: 'Pods / Deployment Replica',
      status: 'online',
      metric: '12 Pods',
      style: {
        bg: '#EFF6FF',
        borderColor: '#3B82F6',
        headerBg: '#2563EB',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    }
  },
  {
    id: 'comp-ops-docker',
    type: 'microservice',
    name: 'Docker Container',
    description: 'Isolated OCI containerized microservice',
    category: 'DevOps & Monitoring',
    icon: <Box size={16} />,
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
    preset: {
      type: 'microservice',
      width: 150,
      height: 105,
      title: 'Docker Image',
      subtitle: 'alpine:3.19 Container',
      status: 'online',
      style: {
        bg: '#F0F9FF',
        borderColor: '#38BDF8',
        headerBg: '#0284C7',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'sky'
      }
    }
  },
  {
    id: 'comp-ops-grafana',
    type: 'server',
    name: 'Prometheus & Grafana',
    description: 'Real-time metrics time-series dashboard',
    category: 'DevOps & Monitoring',
    icon: <BarChart2 size={16} />,
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    preset: {
      type: 'server',
      width: 160,
      height: 110,
      title: 'Grafana Metrics',
      subtitle: 'Prometheus / Alertmanager',
      status: 'online',
      metric: '0.01% err',
      style: {
        bg: '#FFF7ED',
        borderColor: '#F97316',
        headerBg: '#EA580C',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'orange'
      }
    }
  },
  {
    id: 'comp-ops-otel',
    type: 'server',
    name: 'OpenTelemetry',
    description: 'Distributed tracing, metrics & Jaeger spans',
    category: 'DevOps & Monitoring',
    icon: <Activity size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'server',
      width: 155,
      height: 105,
      title: 'OTel Collector',
      subtitle: 'Jaeger / Tempo Tracing',
      status: 'online',
      style: {
        bg: '#EEF2FF',
        borderColor: '#6366F1',
        headerBg: '#4F46E5',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'indigo'
      }
    }
  },
  {
    id: 'comp-ops-logs',
    type: 'server',
    name: 'Log Aggregator (ELK)',
    description: 'Centralized log stream & indexing engine',
    category: 'DevOps & Monitoring',
    icon: <Server size={16} />,
    iconBg: '#FAF5FF',
    iconColor: '#9333EA',
    preset: {
      type: 'server',
      width: 155,
      height: 105,
      title: 'Log Ingestion',
      subtitle: 'Datadog / Fluentbit Logs',
      status: 'online',
      style: {
        bg: '#FAF5FF',
        borderColor: '#A855F7',
        headerBg: '#9333EA',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'purple'
      }
    }
  },
  {
    id: 'comp-ops-cicd',
    type: 'action',
    name: 'GitHub CI/CD Runner',
    description: 'Automated test, build and deployment pipeline',
    category: 'DevOps & Monitoring',
    icon: <GitBranch size={16} />,
    iconBg: '#F1F5F9',
    iconColor: '#0F172A',
    preset: {
      type: 'action',
      width: 160,
      height: 105,
      title: 'GitHub Actions',
      subtitle: 'Build, Test & Deploy',
      status: 'online',
      style: {
        bg: '#F8FAFC',
        borderColor: '#475569',
        headerBg: '#0F172A',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'dark'
      }
    }
  },

  // ==========================================
  // 9. CLOUD INFRASTRUCTURE (2)
  // ==========================================
  {
    id: 'comp-cloud-vpc',
    type: 'cloud',
    name: 'AWS Cloud VPC',
    description: 'Virtual Private Cloud isolated subnet',
    category: 'Cloud',
    icon: <Cloud size={16} />,
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    preset: {
      type: 'cloud',
      width: 165,
      height: 110,
      title: 'AWS Cloud VPC',
      subtitle: 'us-east-1 Region',
      status: 'online',
      style: {
        bg: '#EEF2FF',
        borderColor: '#6366F1',
        headerBg: '#4F46E5',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'indigo'
      }
    }
  },
  {
    id: 'comp-cloud-multi',
    type: 'cloud',
    name: 'Multi-Region Subnet',
    description: 'High-availability cross-region private network',
    category: 'Cloud',
    icon: <Cloud size={16} />,
    iconBg: '#F0FDFA',
    iconColor: '#0D9488',
    preset: {
      type: 'cloud',
      width: 165,
      height: 110,
      title: 'Global Mesh VPC',
      subtitle: 'Cross-Region WAN',
      status: 'online',
      style: {
        bg: '#F0FDFA',
        borderColor: '#14B8A6',
        headerBg: '#0D9488',
        borderRadius: 12,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'teal'
      }
    }
  },

  // ==========================================
  // 10. ANNOTATIONS & DOCUMENTATION (2)
  // ==========================================
  {
    id: 'comp-note-sticky',
    type: 'note',
    name: 'Sticky Note',
    description: 'Yellow sticky note for team documentation',
    category: 'Annotations',
    icon: <StickyNote size={16} />,
    iconBg: '#FEFCE8',
    iconColor: '#CA8A04',
    preset: {
      type: 'note',
      width: 145,
      height: 125,
      title: 'Architecture Note',
      subtitle: 'Double click to edit notes and team decisions.',
      style: {
        bg: '#FEFCE8',
        borderColor: '#FDE047',
        textColor: '#713F12',
        subtextColor: '#854D0E',
        borderRadius: 6,
        borderStyle: 'solid',
        borderWidth: 1,
        shadow: true,
        colorPalette: 'yellow'
      }
    }
  },
  {
    id: 'comp-note-spec',
    type: 'note',
    name: 'Architecture Spec Box',
    description: 'Formal specification and SLA callout card',
    category: 'Annotations',
    icon: <FileText size={16} />,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    preset: {
      type: 'note',
      width: 165,
      height: 125,
      title: 'SLA & Specifications',
      subtitle: 'Target Latency: < 50ms\nAvailability: 99.99%',
      style: {
        bg: '#EFF6FF',
        borderColor: '#93C5FD',
        textColor: '#1E3A8A',
        subtextColor: '#1E40AF',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        shadow: true,
        colorPalette: 'blue'
      }
    }
  }
];
