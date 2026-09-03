export interface ColorTheme {
  id: string;
  name: string;
  bg: string;
  border: string;
  text: string;
  subtext: string;
  headerBg?: string;
  description: string;
}

export const NODE_COLOR_PALETTES: Record<string, ColorTheme> = {
  blue: {
    id: 'blue',
    name: 'API Blue',
    bg: '#FFFFFF',
    border: '#3B82F6',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#2563EB',
    description: 'For REST / GraphQL API, Backend Servers, Microservices'
  },
  green: {
    id: 'green',
    name: 'Server Green',
    bg: '#FFFFFF',
    border: '#22C55E',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#16A34A',
    description: 'For Server Actions, Next.js Server Components, Handlers'
  },
  purple: {
    id: 'purple',
    name: 'DB Purple',
    bg: '#FFFFFF',
    border: '#A855F7',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#9333EA',
    description: 'For PostgreSQL, MongoDB, Database & Storage'
  },
  indigo: {
    id: 'indigo',
    name: 'AI Indigo',
    bg: '#FFFFFF',
    border: '#6366F1',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#4F46E5',
    description: 'AI Models, LLM Agents, Vector Search & Embeddings'
  },
  amber: {
    id: 'amber',
    name: 'Cache Amber',
    bg: '#FFFFFF',
    border: '#F59E0B',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#D97706',
    description: 'For Redis Cache, Memory Store, Session Cache'
  },
  pink: {
    id: 'pink',
    name: 'Client Pink',
    bg: '#FFFFFF',
    border: '#EC4899',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#DB2777',
    description: 'For Client Forms, User Inputs, UI Actions'
  },
  yellow: {
    id: 'yellow',
    name: 'State Yellow',
    bg: '#FFFFFF',
    border: '#EAB308',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#CA8A04',
    description: 'For UI State, Notifications, Props'
  },
  teal: {
    id: 'teal',
    name: 'Queue Teal',
    bg: '#FFFFFF',
    border: '#14B8A6',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#0D9488',
    description: 'For Message Queues, Kafka, Event Bus, Pub/Sub'
  },
  rose: {
    id: 'rose',
    name: 'Auth Rose',
    bg: '#FFFFFF',
    border: '#F43F5E',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#E11D48',
    description: 'For Auth Guards, OAuth2, JWT, Firewalls'
  },
  cyan: {
    id: 'cyan',
    name: 'Cloud Cyan',
    bg: '#FFFFFF',
    border: '#06B6D4',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#0891B2',
    description: 'For CDN, Gateway, Load Balancers, Cloud VPC'
  },
  slate: {
    id: 'slate',
    name: 'Slate Gray',
    bg: '#FFFFFF',
    border: '#64748B',
    text: '#0F172A',
    subtext: '#64748B',
    headerBg: '#475569',
    description: 'General purpose service, Terminal, Custom nodes'
  },
  dark: {
    id: 'dark',
    name: 'Dark Obsidian',
    bg: '#0F172A',
    border: '#334155',
    text: '#F8FAFC',
    subtext: '#94A3B8',
    headerBg: '#38BDF8',
    description: 'High contrast dark theme cards'
  }
};
