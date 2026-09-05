'use client';

import React from 'react';
import {
  Database,
  Users,
  Grid,
  GitFork,
  ShieldCheck,
  Sparkles,
  Zap,
  Lock,
  Workflow,
  Laptop,
  CheckCircle,
  FileCode
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  return (
    <section className="lp-section" id="features">
      <div className="lp-section-header">
        <div className="lp-section-pill">
          <Zap size={12} />
          <span>Local-First Core Architecture</span>
        </div>
        <h2 className="lp-section-title">
          Engineered for systems architects who demand speed and privacy.
        </h2>
        <p className="lp-section-desc">
          Drafo runs completely on the client side with zero central diagram servers. Every
          node, connector, and history snapshot is stored in real PostgreSQL in WebAssembly.
        </p>
      </div>

      <div className="lp-bento-grid">
        {/* Card 1: PGlite Embedded PostgreSQL 16 (Span 8) */}
        <div className="lp-bento-card lp-bento-col-8">
          <div className="lp-bento-icon-box lp-bento-icon-blue">
            <Database size={22} />
          </div>
          <h3 className="lp-bento-title">Embedded PostgreSQL 16 WebAssembly Engine</h3>
          <p className="lp-bento-text">
            No mock database or fragile JSON blobs. Drafo embeds the full PostgreSQL 16 kernel
            directly in your browser with persistent IndexedDB backing. Benefit from relational ACID
            transactions, foreign keys with cascading deletions, and instant 1-click `.sql` schema
            dumps.
          </p>

          <div className="lp-bento-visual">
            <div className="lp-code-snippet">
              <span className="lp-code-kw">-- Full PostgreSQL 16 running inside client-side WASM</span><br />
              <span className="lp-code-kw">CREATE TABLE</span> nodes (<br />
              &nbsp;&nbsp;id <span className="lp-code-kw">TEXT PRIMARY KEY</span>,<br />
              &nbsp;&nbsp;project_id <span className="lp-code-kw">TEXT REFERENCES</span> projects(id) <span className="lp-code-kw">ON DELETE CASCADE</span>,<br />
              &nbsp;&nbsp;x <span className="lp-code-kw">DOUBLE PRECISION NOT NULL</span>,<br />
              &nbsp;&nbsp;custom_data <span className="lp-code-kw">JSONB DEFAULT</span> <span className="lp-code-str">'&#123;&#125;'</span><br />
              );<br />
              <span className="lp-code-kw">SELECT</span> count(*) <span className="lp-code-kw">FROM</span> nodes <span className="lp-code-kw">WHERE</span> project_id = <span className="lp-code-str">'drafo-core'</span>;
            </div>
          </div>
        </div>

        {/* Card 2: Serverless P2P WebRTC & Yjs (Span 4) */}
        <div className="lp-bento-card lp-bento-col-4">
          <div className="lp-bento-icon-box lp-bento-icon-emerald">
            <Users size={22} />
          </div>
          <h3 className="lp-bento-title">Serverless P2P Multiplayer</h3>
          <p className="lp-bento-text">
            Zero central diagram server. Peers connect directly over WebRTC DataChannels and
            BroadcastChannel using Yjs CRDTs. Instant multi-tab synchronization with live
            multi-colored cursors.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(6, 8, 12, 0.6)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '11px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
              <span>Multi-Tab BroadcastChannel: 0ms Latency</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60A5FA' }} />
              <span>WebRTC Mesh: Direct P2P Encryption</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FBBF24' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24' }} />
              <span>Conflict-Free Convergence (CRDT)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Adaptive LOD Infinite Grid (Span 4) */}
        <div className="lp-bento-card lp-bento-col-4">
          <div className="lp-bento-icon-box lp-bento-icon-cyan">
            <Grid size={22} />
          </div>
          <h3 className="lp-bento-title">Adaptive LOD Infinite Canvas</h3>
          <p className="lp-bento-text">
            Zoom fluidly from 5% bird's-eye architectural view to 500% microservice inspections.
            Dynamic level-of-detail dot grid multipliers prevent Moiré distortion at 120 FPS.
          </p>
          <div
            style={{
              padding: '12px',
              background: 'rgba(6, 8, 12, 0.6)',
              borderRadius: '8px',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '11px',
              color: '#38BDF8'
            }}
          >
            LOD Multipliers: 1x, 2x, 4x, 8x, 16x
          </div>
        </div>

        {/* Card 4: Intelligent Orthogonal Routing (Span 4) */}
        <div className="lp-bento-card lp-bento-col-4">
          <div className="lp-bento-icon-box lp-bento-icon-violet">
            <GitFork size={22} />
          </div>
          <h3 className="lp-bento-title">Smart Orthogonal Routing</h3>
          <p className="lp-bento-text">
            Connect ports with automatic 90-degree obstacle avoidance, bidirectional protocol arrows,
            custom latency badges (e.g. ⚡ 12ms), and animated particle flows.
          </p>
          <div
            style={{
              padding: '12px',
              background: 'rgba(6, 8, 12, 0.6)',
              borderRadius: '8px',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '11px',
              color: '#A78BFA'
            }}
          >
            All 16 Port Clearance Permutations
          </div>
        </div>

        {/* Card 5: WebCrypto AES-256-GCM Vault (Span 4) */}
        <div className="lp-bento-card lp-bento-col-4">
          <div className="lp-bento-icon-box lp-bento-icon-rose">
            <Lock size={22} />
          </div>
          <h3 className="lp-bento-title">AES-256-GCM Cryptographic Vault</h3>
          <p className="lp-bento-text">
            Export confidential enterprise diagrams as encrypted `.drafo.enc` archives. Protected
            with PBKDF2 100,000 rounds of SHA-256 using native WebCrypto API.
          </p>
          <div
            style={{
              padding: '12px',
              background: 'rgba(6, 8, 12, 0.6)',
              borderRadius: '8px',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '11px',
              color: '#FB7185'
            }}
          >
            Zero Knowledge • Client-Side Only
          </div>
        </div>

        {/* Card 6: Multilingual AI Flow Synthesizer (Span 12) */}
        <div className="lp-bento-card lp-bento-col-12" style={{ flexDirection: 'row', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div className="lp-bento-icon-box lp-bento-icon-amber">
              <Sparkles size={22} />
            </div>
            <h3 className="lp-bento-title">Natural Language AI Architecture Synthesizer</h3>
            <p className="lp-bento-text" style={{ marginBottom: 0 }}>
              Describe a system in plain English or Bengali (e.g. <em>"Create an event-driven payment system with Stripe, RabbitMQ, and Redis cache"</em>). Drafo instantly calculates port orientations, styles edges, creates swimlane sections, and connects the architecture automatically.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(6, 8, 12, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px 20px',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '12px',
              minWidth: '320px',
              flex: '1'
            }}
          >
            <div style={{ color: '#FBBF24', marginBottom: '8px', fontWeight: 600 }}>
              &gt; prompt (English / বাংলা):
            </div>
            <div style={{ color: '#E2E8F0', marginBottom: '12px', lineHeight: 1.5 }}>
              "Serverless Next.js 16 app with Kafka event streaming, Redis cache, and Postgres cluster"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '11px' }}>
              <CheckCircle size={13} />
              <span>Generated 6 nodes, 7 orthogonal edges & 2 swimlane sections</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
