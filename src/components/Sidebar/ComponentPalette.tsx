'use client';

import React, { useState, useMemo } from 'react';
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
  Plus,
  PanelLeft,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Wand2,
  Box,
  Split,
  Workflow,
  Clock,
  Wifi,
  ExternalLink,
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
  Table,
  Type
} from 'lucide-react';
import { FlowNode as FlowNodeType, NodeType } from '../../types/flow';
import { NODE_COLOR_PALETTES } from '../../data/colorPalettes';
import { ARCHITECTURE_COMPONENTS, PaletteItem } from '../../data/architectureComponents';
import './Sidebar.css';

interface ComponentPaletteProps {
  isOpen?: boolean;
  onToggleCollapse?: () => void;
  onAddNode: (nodePreset: Partial<FlowNodeType>) => void;
  onAddSection: () => void;
  onOpenTemplates: () => void;
  onOpenAIGenerator: () => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  isOpen = true,
  onToggleCollapse,
  onAddNode,
  onAddSection,
  onOpenTemplates,
  onOpenAIGenerator
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'components'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Clients: true,
    Compute: true,
    Routing: true,
    Storage: true,
    'Messaging & Events': true,
    'AI & ML': true,
    'Security & Auth': true,
    'DevOps & Monitoring': true,
    Cloud: true,
    Annotations: true
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // 55 Comprehensive Production Architecture Components Catalog
  const paletteItems: PaletteItem[] = ARCHITECTURE_COMPONENTS;

  interface GeneralNodeItem {
    id: string;
    type: NodeType | 'section';
    name: string;
    description: string;
    category:
      | 'Compute & Services'
      | 'Databases & Storage'
      | 'Networking & Security'
      | 'Clients & Endpoints'
      | 'Flow & Structure';
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    preset?: Partial<FlowNodeType>;
    isSection?: boolean;
  }

  const generalItems: GeneralNodeItem[] = useMemo(
    () => [
      // 1. COMPUTE & SERVICES
      {
        id: 'gen-service',
        type: 'server',
        name: 'Process / Service',
        description: 'Universal service card',
        category: 'Compute & Services',
        icon: <Server size={15} />,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        preset: {
          type: 'server',
          width: 160,
          height: 96,
          title: 'Service Node',
          subtitle: 'Backend Process',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#2563EB',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'blue'
          }
        }
      },
      {
        id: 'gen-server',
        type: 'server',
        name: 'Server Host',
        description: 'Dedicated compute instance',
        category: 'Compute & Services',
        icon: <Cpu size={15} />,
        iconBg: '#F0FDF4',
        iconColor: '#16A34A',
        preset: {
          type: 'server',
          width: 160,
          height: 96,
          title: 'Server Host',
          subtitle: 'Backend Compute',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#16A34A',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'green'
          }
        }
      },
      {
        id: 'gen-microservice',
        type: 'microservice',
        name: 'Microservice',
        description: 'Containerized domain service',
        category: 'Compute & Services',
        icon: <Box size={15} />,
        iconBg: '#F0F9FF',
        iconColor: '#0284C7',
        preset: {
          type: 'microservice',
          width: 160,
          height: 96,
          title: 'Microservice',
          subtitle: 'Domain Worker',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#0284C7',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'cyan'
          }
        }
      },
      {
        id: 'gen-serverless',
        type: 'serverless',
        name: 'Serverless Function',
        description: 'Event-driven compute lambda',
        category: 'Compute & Services',
        icon: <Zap size={15} />,
        iconBg: '#FFFBEB',
        iconColor: '#D97706',
        preset: {
          type: 'serverless',
          width: 160,
          height: 96,
          title: 'Serverless Function',
          subtitle: 'Event-Driven Lambda',
          status: 'online',
          metric: '12ms',
          style: {
            bg: '#FFFFFF',
            borderColor: '#F59E0B',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'amber'
          }
        }
      },
      {
        id: 'gen-worker',
        type: 'worker',
        name: 'Background Worker',
        description: 'Async task & cron processor',
        category: 'Compute & Services',
        icon: <Clock size={15} />,
        iconBg: '#F8FAFC',
        iconColor: '#475569',
        preset: {
          type: 'worker',
          width: 160,
          height: 96,
          title: 'Async Worker',
          subtitle: 'Cron & Job Queue',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#64748B',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'slate'
          }
        }
      },
      {
        id: 'gen-kubernetes',
        type: 'kubernetes',
        name: 'Kubernetes Pod',
        description: 'K8s pod or cluster node',
        category: 'Compute & Services',
        icon: <Box size={15} />,
        iconBg: '#EEF2FF',
        iconColor: '#3B82F6',
        preset: {
          type: 'kubernetes',
          width: 160,
          height: 96,
          title: 'K8s Cluster Pod',
          subtitle: 'Container Pod',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#3B82F6',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'blue'
          }
        }
      },

      // 2. DATABASES & STORAGE
      {
        id: 'gen-sql-table',
        type: 'sql-table',
        name: 'SQL Table / Entity',
        description: 'Relational table with columns & PK/FK',
        category: 'Databases & Storage',
        icon: <Table size={15} />,
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
        preset: {
          type: 'sql-table',
          width: 240,
          height: 180,
          title: 'users',
          subtitle: '4 columns',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#7C3AED',
            headerBg: '#7C3AED',
            headerColor: '#FFFFFF',
            borderWidth: 1.5,
            borderRadius: 10,
            colorPalette: 'purple'
          },
          customData: {
            sqlTableName: 'users',
            sqlSchemaName: 'public',
            sqlColumns: [
              { name: 'id', type: 'UUID', isPk: true },
              { name: 'email', type: 'VARCHAR(255)', isNullable: false },
              { name: 'full_name', type: 'VARCHAR(100)' },
              { name: 'created_at', type: 'TIMESTAMP' }
            ]
          }
        }
      },
      {
        id: 'gen-uml-class',
        type: 'uml-class',
        name: 'UML Class Model',
        description: 'UML class with members & methods',
        category: 'Databases & Storage',
        icon: <FileText size={15} />,
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5',
        preset: {
          type: 'uml-class',
          width: 230,
          height: 170,
          title: 'UserAccount',
          subtitle: '<<entity>>',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#4F46E5',
            borderWidth: 1.5,
            borderRadius: 8,
            colorPalette: 'indigo'
          },
          customData: {
            umlStereotype: '<<entity>>',
            umlMembers: [
              { name: 'id: UUID', visibility: '+', isMethod: false },
              { name: 'passwordHash: string', visibility: '-', isMethod: false },
              { name: 'authenticate(): boolean', visibility: '+', isMethod: true },
              { name: 'getProfile(): Profile', visibility: '+', isMethod: true }
            ]
          }
        }
      },
      {
        id: 'gen-json-viewer',
        type: 'json-viewer',
        name: 'JSON Data Viewer',
        description: 'Formatted interactive JSON card',
        category: 'Databases & Storage',
        icon: <FileText size={15} />,
        iconBg: '#F0FDF4',
        iconColor: '#10B981',
        preset: {
          type: 'json-viewer',
          width: 250,
          height: 180,
          title: 'CustomerPayload',
          subtitle: 'JSON Object',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#10B981',
            borderWidth: 1.5,
            borderRadius: 10,
            colorPalette: 'green'
          },
          customData: {
            jsonData: {
              id: 'cus_9941',
              name: 'John Doe',
              plan: 'pro_tier',
              active: true
            }
          }
        }
      },
      {
        id: 'gen-type-schema',
        type: 'type-schema',
        name: 'TypeScript Schema',
        description: 'Contract interface with field types',
        category: 'Databases & Storage',
        icon: <Table size={15} />,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        preset: {
          type: 'type-schema',
          width: 240,
          height: 170,
          title: 'UserProfile',
          subtitle: 'TypeScript Interface',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#2563EB',
            headerBg: '#2563EB',
            headerColor: '#FFFFFF',
            borderWidth: 1.5,
            borderRadius: 10,
            colorPalette: 'blue'
          },
          customData: {
            schemaKind: 'typescript',
            schemaProperties: [
              { name: 'id', type: 'string', required: true },
              { name: 'email', type: 'string', required: true },
              { name: 'avatarUrl', type: 'string', required: false },
              { name: 'roles', type: 'string[]', required: true }
            ]
          }
        }
      },
      {
        id: 'gen-database',
        type: 'database',
        name: 'Database (3D)',
        description: '3D storage cylinder with tiers',
        category: 'Databases & Storage',
        icon: <Database size={15} />,
        iconBg: '#FAF5FF',
        iconColor: '#9333EA',
        preset: {
          type: 'database',
          width: 140,
          height: 110,
          title: 'Database',
          subtitle: 'Storage Engine',
          status: 'online',
          style: {
            bg: '#FAF5FF',
            borderColor: '#A855F7',
            borderRadius: 12,
            borderWidth: 1.5,
            colorPalette: 'purple'
          }
        }
      },
      {
        id: 'gen-nosql',
        type: 'nosql',
        name: 'NoSQL / Document',
        description: 'Flexible key-value document store',
        category: 'Databases & Storage',
        icon: <Database size={15} />,
        iconBg: '#FAF5FF',
        iconColor: '#7E22CE',
        preset: {
          type: 'nosql',
          width: 140,
          height: 110,
          title: 'NoSQL Store',
          subtitle: 'Document Collections',
          status: 'online',
          style: {
            bg: '#FAF5FF',
            borderColor: '#9333EA',
            borderRadius: 12,
            borderWidth: 1.5,
            colorPalette: 'purple'
          }
        }
      },
      {
        id: 'gen-cache',
        type: 'cache',
        name: 'In-Memory Cache',
        description: 'Fast key-value cache store',
        category: 'Databases & Storage',
        icon: <Zap size={15} />,
        iconBg: '#FFFBEB',
        iconColor: '#D97706',
        preset: {
          type: 'cache',
          width: 150,
          height: 96,
          title: 'Cache Store',
          subtitle: 'In-Memory Store',
          status: 'online',
          metric: '1ms',
          style: {
            bg: '#FFFFFF',
            borderColor: '#F59E0B',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'amber'
          }
        }
      },
      {
        id: 'gen-queue',
        type: 'queue',
        name: 'Message Queue',
        description: 'Async pub/sub message broker',
        category: 'Databases & Storage',
        icon: <Workflow size={15} />,
        iconBg: '#FFF7ED',
        iconColor: '#EA580C',
        preset: {
          type: 'queue',
          width: 160,
          height: 96,
          title: 'Message Queue',
          subtitle: 'Async Event Bus',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#F97316',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'orange'
          }
        }
      },
      {
        id: 'gen-storage',
        type: 'storage',
        name: 'Object Storage',
        description: 'S3 / Blob storage bucket',
        category: 'Databases & Storage',
        icon: <HardDrive size={15} />,
        iconBg: '#F8FAFC',
        iconColor: '#334155',
        preset: {
          type: 'storage',
          width: 160,
          height: 96,
          title: 'Storage Bucket',
          subtitle: 'Blob & Media Assets',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#475569',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'slate'
          }
        }
      },

      // 3. NETWORKING & SECURITY
      {
        id: 'gen-cloud',
        type: 'cloud',
        name: 'Cloud VPC',
        description: 'Cloud region & VPC boundary',
        category: 'Networking & Security',
        icon: <Cloud size={15} />,
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5',
        preset: {
          type: 'cloud',
          width: 165,
          height: 115,
          title: 'Cloud VPC',
          subtitle: 'Region / Network',
          status: 'online',
          style: {
            bg: '#EEF2FF',
            borderColor: '#6366F1',
            borderRadius: 12,
            borderWidth: 1.5,
            colorPalette: 'indigo'
          }
        }
      },
      {
        id: 'gen-gateway',
        type: 'gateway',
        name: 'API Gateway',
        description: 'Reverse proxy & router',
        category: 'Networking & Security',
        icon: <Radio size={15} />,
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
        preset: {
          type: 'gateway',
          width: 160,
          height: 96,
          title: 'API Gateway',
          subtitle: 'Routing & Proxy',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#8B5CF6',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'purple'
          }
        }
      },
      {
        id: 'gen-loadbalancer',
        type: 'loadbalancer',
        name: 'Load Balancer',
        description: 'Traffic distribution & SSL',
        category: 'Networking & Security',
        icon: <Split size={15} />,
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        preset: {
          type: 'loadbalancer',
          width: 160,
          height: 96,
          title: 'Load Balancer',
          subtitle: 'Traffic Distribution',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#10B981',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'green'
          }
        }
      },
      {
        id: 'gen-cdn',
        type: 'cdn',
        name: 'CDN Edge Cache',
        description: 'Global content delivery edge',
        category: 'Networking & Security',
        icon: <Wifi size={15} />,
        iconBg: '#F0FDF4',
        iconColor: '#16A34A',
        preset: {
          type: 'cdn',
          width: 160,
          height: 96,
          title: 'CDN Edge Network',
          subtitle: 'Global Edge Caching',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#22C55E',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'green'
          }
        }
      },
      {
        id: 'gen-auth',
        type: 'auth',
        name: 'Auth / Security',
        description: 'OAuth2 / IAM authentication',
        category: 'Networking & Security',
        icon: <ShieldCheck size={15} />,
        iconBg: '#FEF2F2',
        iconColor: '#DC2626',
        preset: {
          type: 'auth',
          width: 160,
          height: 96,
          title: 'Auth & IAM Service',
          subtitle: 'OAuth2 / JWT Guard',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#EF4444',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'red'
          }
        }
      },
      {
        id: 'gen-middleware',
        type: 'middleware',
        name: 'Middleware Layer',
        description: 'Request pipeline & filter',
        category: 'Networking & Security',
        icon: <Layers size={15} />,
        iconBg: '#F1F5F9',
        iconColor: '#475569',
        preset: {
          type: 'middleware',
          width: 160,
          height: 96,
          title: 'Middleware Layer',
          subtitle: 'Pipeline Interceptor',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#64748B',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'slate'
          }
        }
      },

      // 4. CLIENTS & ENDPOINTS
      {
        id: 'gen-browser',
        type: 'browser',
        name: 'Web Browser',
        description: 'Browser window mockup',
        category: 'Clients & Endpoints',
        icon: <Globe size={15} />,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        preset: {
          type: 'browser',
          width: 160,
          height: 120,
          title: 'Web Client',
          subtitle: 'React / Next.js',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#2563EB',
            headerBg: '#2563EB',
            borderRadius: 10,
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
        id: 'gen-mobile',
        type: 'mobile',
        name: 'Mobile App',
        description: 'Smartphone device frame',
        category: 'Clients & Endpoints',
        icon: <Smartphone size={15} />,
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5',
        preset: {
          type: 'mobile',
          width: 140,
          height: 200,
          title: 'Mobile App',
          subtitle: 'iOS / Android',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#1E293B',
            headerBg: '#1E293B',
            borderRadius: 22,
            borderWidth: 2,
            colorPalette: 'dark'
          }
        }
      },
      {
        id: 'gen-desktop',
        type: 'desktop',
        name: 'Desktop App',
        description: 'Native window frame',
        category: 'Clients & Endpoints',
        icon: <Monitor size={15} />,
        iconBg: '#F1F5F9',
        iconColor: '#334155',
        preset: {
          type: 'desktop',
          width: 160,
          height: 120,
          title: 'Desktop App',
          subtitle: 'Electron / Tauri',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#475569',
            headerBg: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'slate'
          }
        }
      },
      {
        id: 'gen-terminal',
        type: 'terminal',
        name: 'Terminal CLI',
        description: 'Developer command prompt',
        category: 'Clients & Endpoints',
        icon: <Terminal size={15} />,
        iconBg: '#F1F5F9',
        iconColor: '#0F172A',
        preset: {
          type: 'terminal',
          width: 150,
          height: 110,
          title: 'CLI Client',
          subtitle: 'Console Tool',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#0F172A',
            headerBg: '#0F172A',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'dark'
          }
        }
      },
      {
        id: 'gen-external-api',
        type: 'api',
        name: 'External API',
        description: '3rd-party webhook / API',
        category: 'Clients & Endpoints',
        icon: <ExternalLink size={15} />,
        iconBg: '#F8FAFC',
        iconColor: '#64748B',
        preset: {
          type: 'api',
          width: 160,
          height: 96,
          title: 'External API',
          subtitle: 'Webhook & Partner API',
          status: 'online',
          style: {
            bg: '#FFFFFF',
            borderColor: '#E2E8F0',
            textColor: '#0F172A',
            subtextColor: '#475569',
            borderRadius: 10,
            borderWidth: 1.5,
            colorPalette: 'slate'
          }
        }
      },

      // 5. FLOW & STRUCTURE
      {
        id: 'gen-decision',
        type: 'decision',
        name: 'Decision Diamond',
        description: 'Conditional routing branch',
        category: 'Flow & Structure',
        icon: <GitFork size={15} />,
        iconBg: '#FEF3C7',
        iconColor: '#B45309',
        preset: {
          type: 'decision',
          width: 120,
          height: 120,
          title: 'Condition?',
          status: 'none',
          style: {
            bg: '#FFFBEB',
            borderColor: '#F59E0B',
            textColor: '#B45309',
            borderRadius: 8,
            borderWidth: 1.5,
            colorPalette: 'amber'
          }
        }
      },
      {
        id: 'gen-text',
        type: 'text',
        name: 'Text Annotation',
        description: 'Free-form canvas text label',
        category: 'Flow & Structure',
        icon: <Type size={15} />,
        iconBg: '#F1F5F9',
        iconColor: '#334155',
        preset: {
          type: 'text',
          width: 180,
          height: 48,
          title: 'Text Annotation',
          subtitle: '',
          customData: {
            fontSize: 16,
            fontWeight: 'normal',
            textAlign: 'left'
          },
          style: {
            bg: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 0,
            colorPalette: 'slate'
          }
        }
      },
      {
        id: 'gen-note',
        type: 'note',
        name: 'Sticky Note',
        description: '3D Tactile sticky note with colors & fold',
        category: 'Flow & Structure',
        icon: <StickyNote size={15} />,
        iconBg: '#FEFCE8',
        iconColor: '#CA8A04',
        preset: {
          type: 'note',
          width: 170,
          height: 150,
          title: 'Sticky Note',
          subtitle: 'Double-click to write notes...',
          customData: {
            stickyColor: 'yellow'
          },
          style: {
            bg: '#FEF08A',
            borderColor: '#FACC15',
            textColor: '#713F12',
            subtextColor: '#854D0E',
            borderRadius: 8,
            borderWidth: 1,
            shadow: true,
            colorPalette: 'yellow'
          }
        }
      },
      {
        id: 'gen-vpc-container',
        type: 'container',
        name: 'VPC Boundary Container',
        description: 'Enclosing network/cloud zone',
        category: 'Flow & Structure',
        icon: <Layers size={15} />,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        preset: {
          type: 'container',
          width: 420,
          height: 260,
          title: 'AWS VPC (10.0.0.0/16)',
          subtitle: 'us-east-1 Region',
          style: {
            bg: 'rgba(37, 99, 235, 0.03)',
            borderColor: '#2563EB',
            borderStyle: 'dashed',
            borderWidth: 1.5,
            borderRadius: 14,
            headerBg: 'rgba(37, 99, 235, 0.08)',
            headerColor: '#1D4ED8'
          }
        }
      },
      {
        id: 'gen-k8s-cluster-zone',
        type: 'container',
        name: 'Kubernetes Cluster Zone',
        description: 'Cluster / namespace boundary',
        category: 'Flow & Structure',
        icon: <Box size={15} />,
        iconBg: '#EEF2FF',
        iconColor: '#326CE5',
        preset: {
          type: 'container',
          width: 380,
          height: 240,
          title: 'Kubernetes Cluster',
          subtitle: 'production-ns',
          style: {
            bg: 'rgba(50, 108, 229, 0.03)',
            borderColor: '#326CE5',
            borderStyle: 'dashed',
            borderWidth: 1.5,
            borderRadius: 14,
            headerBg: 'rgba(50, 108, 229, 0.08)',
            headerColor: '#1E40AF'
          }
        }
      },
      {
        id: 'gen-subnet-zone',
        type: 'container',
        name: 'Private Subnet Zone',
        description: 'Isolated subnet or tier',
        category: 'Flow & Structure',
        icon: <ShieldCheck size={15} />,
        iconBg: '#FAF5FF',
        iconColor: '#9333EA',
        preset: {
          type: 'container',
          width: 320,
          height: 200,
          title: 'Private Database Subnet',
          subtitle: '10.0.2.0/24',
          style: {
            bg: 'rgba(147, 51, 234, 0.03)',
            borderColor: '#9333EA',
            borderStyle: 'dotted',
            borderWidth: 1.5,
            borderRadius: 14,
            headerBg: 'rgba(147, 51, 234, 0.08)',
            headerColor: '#6B21A8'
          }
        }
      },
      {
        id: 'gen-section',
        type: 'section',
        name: 'Architecture Layer',
        description: 'Movable section divider line',
        category: 'Flow & Structure',
        icon: <Split size={15} />,
        iconBg: '#DCFCE7',
        iconColor: '#166534',
        isSection: true
      }
    ],
    []
  );

  const generalCategories: Array<
    | 'Compute & Services'
    | 'Databases & Storage'
    | 'Networking & Security'
    | 'Clients & Endpoints'
    | 'Flow & Structure'
  > = [
    'Compute & Services',
    'Databases & Storage',
    'Networking & Security',
    'Clients & Endpoints',
    'Flow & Structure'
  ];

  // Filter general items by search query
  const filteredGeneralItems = useMemo(() => {
    if (!searchQuery.trim()) return generalItems;
    const q = searchQuery.toLowerCase();
    return generalItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [generalItems, searchQuery]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return paletteItems;
    const q = searchQuery.toLowerCase();
    return paletteItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [paletteItems, searchQuery]);

  // Group items by category
  const categories: Array<
    | 'Clients'
    | 'Compute'
    | 'Routing'
    | 'Storage'
    | 'Messaging & Events'
    | 'AI & ML'
    | 'Security & Auth'
    | 'DevOps & Monitoring'
    | 'Cloud'
    | 'Annotations'
  > = [
    'Clients',
    'Compute',
    'Routing',
    'Storage',
    'Messaging & Events',
    'AI & ML',
    'Security & Auth',
    'DevOps & Monitoring',
    'Cloud',
    'Annotations'
  ];

  // Drag start handler
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/drafo-node', JSON.stringify(item.preset));
    e.dataTransfer.setData('application/drafo-node-type', item.preset.type || item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) {
    return (
      <div
        className="drafo-sidebar-collapsed-tab"
        onClick={onToggleCollapse}
        title="Open Component Palette"
      >
        <PanelLeft size={16} />
      </div>
    );
  }

  return (
    <aside className="drafo-sidebar-palette">
      {/* Header */}
      <div className="drafo-sidebar-header">
        <span className="drafo-sidebar-header-title">Palette</span>
        {onToggleCollapse && (
          <button
            className="drafo-sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title="Collapse sidebar (Ctrl+[)"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Primary Tab Switcher: General Nodes vs Components */}
      <div className="drafo-sidebar-tabs">
        <button
          className={`drafo-sidebar-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
          title="General Nodes"
        >
          <Box size={13} />
          <span>General</span>
          <span className="drafo-tab-badge">{generalItems.length}</span>
        </button>
        <button
          className={`drafo-sidebar-tab-btn ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
          title="Components"
        >
          <Layers size={13} />
          <span>Components</span>
          <span className="drafo-tab-badge">{paletteItems.length}</span>
        </button>
      </div>

      {/* Real-Time Search Bar */}
      <div className="drafo-sidebar-search">
        <Search size={14} className="drafo-sidebar-search-icon" />
        <input
          type="text"
          placeholder={activeTab === 'general' ? 'Search general nodes...' : 'Search components...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="drafo-sidebar-search-input"
        />
        {searchQuery && (
          <button
            className="drafo-sidebar-search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* TAB 1: GENERAL NODES (MAIN PRIMARY OPTION) */}
      {activeTab === 'general' && (
        <>
          {/* Quick Add Section Button */}
          <button className="drafo-add-section-btn" onClick={onAddSection}>
            <Plus size={14} />
            <span>Add Layer / Section Divider</span>
          </button>

          {/* Categorized General Nodes Grid */}
          {generalCategories.map((category) => {
            const items = filteredGeneralItems.filter((i) => i.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="drafo-general-group">
                <span className="drafo-general-group-title">{category}</span>
                <div className="drafo-general-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="drafo-general-node-card"
                      draggable={!item.isSection}
                      onDragStart={(e) => {
                        if (item.preset) {
                          e.dataTransfer.setData('application/drafo-node', JSON.stringify(item.preset));
                          e.dataTransfer.setData('application/drafo-node-type', item.preset.type || item.type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }
                      }}
                      onClick={() => {
                        if (item.isSection) {
                          onAddSection();
                        } else if (item.preset) {
                          onAddNode(item.preset);
                        }
                      }}
                      title={item.isSection ? 'Click to add layer divider' : 'Click to add or drag onto canvas'}
                    >
                      <div className="drafo-general-node-top">
                        <div
                          className="drafo-general-node-icon"
                          style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                        >
                          {item.icon}
                        </div>
                        <Plus size={12} className="drafo-card-add-hint" />
                      </div>
                      <span className="drafo-general-node-title">{item.name}</span>
                      <span className="drafo-general-node-desc">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* TAB 2: RICH ARCHITECTURE COMPONENTS */}
      {activeTab === 'components' && (
        <>
          {/* AI Generator Banner */}
          <div className="drafo-ai-banner" onClick={onOpenAIGenerator}>
            <div className="drafo-ai-banner-header">
              <Wand2 size={15} className="drafo-wand-icon" />
              <span>Generate with AI</span>
            </div>
            <p>Type any architecture description to synthesize flowcharts instantly.</p>
          </div>

          {/* Quick Add Section Button */}
          <button className="drafo-add-section-btn" onClick={onAddSection}>
            <Plus size={14} />
            <span>Add Layer / Section Divider</span>
          </button>

          {/* Categorized Accordion Groups */}
          {categories.map((category) => {
            const items = filteredItems.filter((i) => i.category === category);
            if (items.length === 0) return null;

            const isExpanded = expandedCategories[category] !== false || !!searchQuery;

            return (
              <div key={category} className="drafo-category-group">
                <div
                  className="drafo-category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="drafo-category-title-wrap">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{category}</span>
                  </div>
                  <span className="drafo-category-count">{items.length}</span>
                </div>

                {isExpanded && (
                  <div className="drafo-category-items">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="drafo-general-node-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => onAddNode(item.preset)}
                        title={`${item.name} — ${item.description}`}
                      >
                        <div className="drafo-general-node-top">
                          <div
                            className="drafo-general-node-icon"
                            style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                          >
                            {item.icon}
                          </div>
                          <Plus size={12} className="drafo-card-add-hint" />
                        </div>

                        <span className="drafo-general-node-title">{item.name}</span>
                        <span className="drafo-general-node-desc">{item.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Footer Shortcuts */}
      <div className="drafo-sidebar-footer">
        <div className="drafo-shortcut-row">
          <kbd>Space + Drag</kbd>
          <span>Pan canvas</span>
        </div>
        <div className="drafo-shortcut-row">
          <kbd>Ctrl + Wheel</kbd>
          <span>Zoom canvas</span>
        </div>
        <div className="drafo-shortcut-row">
          <kbd>Ctrl + F</kbd>
          <span>Find components</span>
        </div>
      </div>
    </aside>
  );
};
