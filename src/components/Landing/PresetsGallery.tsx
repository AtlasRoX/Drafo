'use client';

import React from 'react';
import {
  Globe,
  Terminal,
  Smartphone,
  Database,
  Cloud,
  Layers,
  Box,
  Cpu
} from 'lucide-react';

interface PresetItem {
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  previewSnippet: string;
}

const PRESET_LIST: PresetItem[] = [
  {
    title: 'Web Browser Frame',
    category: 'Client Device',
    description: 'Realistic browser window with URL address bar, navigation dots, and viewport card.',
    icon: <Globe size={18} />,
    color: '#3B82F6',
    previewSnippet: 'https://app.io/dashboard'
  },
  {
    title: 'Terminal CLI Shell',
    category: 'Developer CLI',
    description: 'Dark simulated command shell with bash prompt, cursor animation, and return status.',
    icon: <Terminal size={18} />,
    color: '#10B981',
    previewSnippet: '$ drafo migrate --db=pglite'
  },
  {
    title: 'Mobile App Device',
    category: 'Mobile Client',
    description: 'Smartphone mockup with notch, Wi-Fi/Battery status bar, and native mobile UI.',
    icon: <Smartphone size={18} />,
    color: '#8B5CF6',
    previewSnippet: 'iOS 18 / Android Native'
  },
  {
    title: '3D SQL Database',
    category: 'Data Tier',
    description: 'Multi-layer relational cylinder with ACID indicator, active table count, and ports.',
    icon: <Database size={18} />,
    color: '#06B6D4',
    previewSnippet: 'PostgreSQL 16 • 48 Tables'
  },
  {
    title: 'Serverless Functions',
    category: 'Compute Tier',
    description: 'Cloud lambdas with runtime badges, cold-start latency tags, and auto-scaling triggers.',
    icon: <Cloud size={18} />,
    color: '#F59E0B',
    previewSnippet: 'Node 22 • 128MB • 15ms'
  },
  {
    title: 'Kubernetes Pods',
    category: 'Orchestration',
    description: 'Containerized workloads with pod replica counters, namespace tags, and health checks.',
    icon: <Box size={18} />,
    color: '#3B82F6',
    previewSnippet: 'k8s://prod/api-worker:v2'
  },
  {
    title: 'In-Memory Caches',
    category: 'Fast Storage',
    description: 'Redis and Memcached key-value stores with eviction policy and TTL monitoring.',
    icon: <Cpu size={18} />,
    color: '#F43F5E',
    previewSnippet: 'Redis 7 • 100k ops/sec'
  },
  {
    title: 'Swimlane Sections',
    category: 'Grouping',
    description: 'Architectural tier boundaries and numbered sequence sections with customizable pill colors.',
    icon: <Layers size={18} />,
    color: '#10B981',
    previewSnippet: 'Tier 1: Client Edge Network'
  }
];

export const PresetsGallery: React.FC = () => {
  return (
    <section className="lp-section" id="presets">
      <div className="lp-section-header">
        <div className="lp-section-pill">
          <Box size={12} />
          <span>55+ Architectural Presets</span>
        </div>
        <h2 className="lp-section-title">
          Designed specifically for technical systems, not generic flowcharting.
        </h2>
        <p className="lp-section-desc">
          Drag and drop engineering components with realistic semantics, live status badges, and
          custom port positions.
        </p>
      </div>

      <div className="lp-presets-grid">
        {PRESET_LIST.map((preset) => (
          <div key={preset.title} className="lp-preset-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${preset.color}15`,
                  border: `1px solid ${preset.color}30`,
                  color: preset.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {preset.icon}
              </div>
              <div style={{ fontSize: '11px', color: preset.color, fontWeight: 700, textTransform: 'uppercase' }}>
                {preset.category}
              </div>
            </div>

            <h3 className="lp-preset-title">{preset.title}</h3>
            <p className="lp-preset-desc">{preset.description}</p>

            <div
              style={{
                background: 'rgba(6, 8, 12, 0.7)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontFamily: 'var(--lp-font-mono)',
                fontSize: '11px',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ color: preset.color }}>●</span>
              <span>{preset.previewSnippet}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
