'use client';

import React from 'react';
import { ArrowRight, Layers, LayoutTemplate, Cpu, Network, ShieldAlert } from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  nodesCount: number;
  sectionsCount: number;
  icon: React.ReactNode;
  accentColor: string;
}

const FEATURED_TEMPLATES: TemplateItem[] = [
  {
    id: 'nextjs-16-architecture',
    name: 'Next.js 16 App Router & Server Actions',
    category: 'Fullstack Web',
    description:
      'Server Components (RSC), Client Components, Server Actions, Hydration boundaries, and optimistic mutations.',
    tags: ['Next.js 16', 'React 19', 'Server Actions'],
    nodesCount: 8,
    sectionsCount: 2,
    icon: <LayoutTemplate size={20} />,
    accentColor: '#3B82F6'
  },
  {
    id: 'microservices-event-mesh',
    name: 'Microservices & Kafka Event Mesh',
    category: 'Cloud & Distributed',
    description:
      'Decoupled microservices architecture with Apache Kafka event streams, Redis cache tier, and worker pools.',
    tags: ['Kafka', 'Microservices', 'Redis'],
    nodesCount: 9,
    sectionsCount: 3,
    icon: <Network size={20} />,
    accentColor: '#06B6D4'
  },
  {
    id: 'ai-agent-rag-pipeline',
    name: 'Autonomous AI Agent RAG Pipeline',
    category: 'AI & Machine Learning',
    description:
      'Vector database embeddings retrieval, LLM prompt synthesis, persistent agent memory, and tool execution orchestration.',
    tags: ['RAG', 'Vector DB', 'LLM Agent'],
    nodesCount: 7,
    sectionsCount: 2,
    icon: <Cpu size={20} />,
    accentColor: '#8B5CF6'
  },
  {
    id: 'auth-jwt-lifecycle',
    name: 'OAuth2 & JWT Token Lifecycle',
    category: 'Security & Auth',
    description:
      'Token issuance, refresh rotation, asymmetric RSA verification, Redis revocation blacklists, and edge authorization.',
    tags: ['JWT', 'OAuth2', 'Zero-Trust'],
    nodesCount: 6,
    sectionsCount: 2,
    icon: <ShieldAlert size={20} />,
    accentColor: '#F43F5E'
  }
];

export const TemplateShowcase: React.FC = () => {
  return (
    <section className="lp-section" id="templates">
      <div className="lp-section-header">
        <div className="lp-section-pill">
          <Layers size={12} />
          <span>Production-Ready Blueprints</span>
        </div>
        <h2 className="lp-section-title">
          Jumpstart your architectural diagrams in seconds.
        </h2>
        <p className="lp-section-desc">
          Choose from meticulously designed architecture blueprints. Each template comes with
          configured orthogonal routing, swimlanes, and step simulation sequences.
        </p>
      </div>

      <div className="lp-templates-grid">
        {FEATURED_TEMPLATES.map((tmpl) => (
          <div key={tmpl.id} className="lp-template-card">
            {/* Visual Mini Header */}
            <div className="lp-template-preview">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  background: 'rgba(15, 20, 30, 0.9)',
                  border: `1px solid ${tmpl.accentColor}40`,
                  borderRadius: '10px',
                  boxShadow: `0 8px 24px ${tmpl.accentColor}20`
                }}
              >
                <div style={{ color: tmpl.accentColor }}>{tmpl.icon}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                    {tmpl.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      fontFamily: 'var(--lp-font-mono)'
                    }}
                  >
                    {tmpl.nodesCount} nodes • {tmpl.sectionsCount} sections
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lp-template-content">
              <div className="lp-template-tags">
                {tmpl.tags.map((tag) => (
                  <span key={tag} className="lp-template-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <h3 className="lp-template-title">{tmpl.name}</h3>
              <p className="lp-template-desc">{tmpl.description}</p>

              <a
                href={`/studio?template=${tmpl.id}`}
                className="lp-template-launch-btn"
              >
                <span>Launch Template</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
