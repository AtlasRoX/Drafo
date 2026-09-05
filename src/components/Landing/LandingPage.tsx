'use client';

import React from 'react';
import {
  ArrowRight,
  Sparkles,
  ExternalLink,
  Zap,
  Shield,
  Layers,
  CheckCircle,
  Database,
  Users,
  Code
} from 'lucide-react';
import { DrafoLogo } from '../../assets/DrafoLogo';
import { HeroCanvasSimulator } from './HeroCanvasSimulator';
import { BentoFeatures } from './BentoFeatures';
import { TemplateShowcase } from './TemplateShowcase';
import { PresetsGallery } from './PresetsGallery';
import { ComparisonSection } from './ComparisonSection';
import { FaqSection } from './FaqSection';
import './LandingPage.css';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const LandingPage: React.FC = () => {
  return (
    <div className="lp-container">
      {/* Floating Glass Navigation Header */}
      <header className="lp-nav-wrapper">
        <nav className="lp-nav">
          <a href="/" className="lp-nav-brand">
            <DrafoLogo size={28} showWordmark={true} />
            <span className="lp-nav-version-badge">PGlite 16 WASM</span>
          </a>

          <ul className="lp-nav-links">
            <li>
              <a href="#features" className="lp-nav-link">
                Features
              </a>
            </li>
            <li>
              <a href="#templates" className="lp-nav-link">
                Templates
              </a>
            </li>
            <li>
              <a href="#presets" className="lp-nav-link">
                Components
              </a>
            </li>
            <li>
              <a href="#comparison" className="lp-nav-link">
                Comparison
              </a>
            </li>
            <li>
              <a href="#faq" className="lp-nav-link">
                FAQ
              </a>
            </li>
          </ul>

          <div className="lp-nav-actions">
            <a
              href="https://github.com/AtlasRoX/Drafo"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn-ghost"
              title="GitHub Repository"
            >
              <GithubIcon size={15} />
              <span>GitHub</span>
            </a>

            <a href="/studio" className="lp-btn-primary">
              <span>Launch Studio</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="lp-hero lp-section">
        {/* Release / Mission Pill */}
        <div className="lp-hero-pill">
          <Sparkles size={14} style={{ color: '#60A5FA' }} />
          <span>Local-First Architecture Studio • Zero Server Dependency</span>
        </div>

        {/* Main Title */}
        <h1 className="lp-hero-title">
          System diagrams crafted for engineers,{' '}
          <span className="lp-hero-title-gradient">
            stored in PostgreSQL in your browser.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="lp-hero-subtitle">
          Design complex microservices, event meshes, and distributed cloud architectures at
          120 FPS. Powered by embedded PostgreSQL 16 (PGlite), serverless WebRTC collaboration, and
          Figma-grade precision.
        </p>

        {/* Call to Actions */}
        <div className="lp-hero-actions">
          <a href="/studio" className="lp-hero-btn-main">
            <span>Launch Studio — 100% Free</span>
            <ArrowRight size={18} />
          </a>

          <a href="#live-simulator" className="lp-hero-btn-secondary">
            <Zap size={16} style={{ color: '#FBBF24' }} />
            <span>Try Interactive Sandbox</span>
          </a>
        </div>

        {/* Tech Stack Highlights */}
        <div className="lp-hero-tech-row">
          <div className="lp-hero-tech-tag">
            <Database size={13} style={{ color: '#38BDF8' }} />
            <span>PostgreSQL 16 WASM</span>
          </div>
          <div className="lp-hero-tech-tag">
            <Users size={13} style={{ color: '#34D399' }} />
            <span>Serverless WebRTC Mesh</span>
          </div>
          <div className="lp-hero-tech-tag">
            <Shield size={13} style={{ color: '#A78BFA' }} />
            <span>AES-256-GCM Vault</span>
          </div>
          <div className="lp-hero-tech-tag">
            <Code size={13} style={{ color: '#F43F5E' }} />
            <span>Next.js 16 + React 19</span>
          </div>
        </div>

        {/* Interactive Architecture Simulator */}
        <HeroCanvasSimulator />

        {/* Metrics Proof Bar */}
        <div className="lp-metrics-grid">
          <div className="lp-metric-card">
            <div className="lp-metric-val">0ms</div>
            <div className="lp-metric-label">Server Latency</div>
            <div className="lp-metric-desc">
              All database transactions and CRDT synchronizations execute client-side.
            </div>
          </div>

          <div className="lp-metric-card">
            <div className="lp-metric-val">100%</div>
            <div className="lp-metric-label">Air-Gapped & Private</div>
            <div className="lp-metric-desc">
              Confidential system topologies remain in your browser with zero cloud tracking.
            </div>
          </div>

          <div className="lp-metric-card">
            <div className="lp-metric-val">55+</div>
            <div className="lp-metric-label">Production Presets</div>
            <div className="lp-metric-desc">
              Realistic browser frames, terminal shells, 3D databases, and cloud lambdas.
            </div>
          </div>

          <div className="lp-metric-card">
            <div className="lp-metric-val">120 FPS</div>
            <div className="lp-metric-label">Smooth Canvas Engine</div>
            <div className="lp-metric-desc">
              Adaptive LOD dot grid scaling from 5% to 500% with zero Moiré distortion.
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid: Core Technical Innovations */}
      <BentoFeatures />

      {/* Production Blueprints / Templates Showcase */}
      <TemplateShowcase />

      {/* Specialized Engineering Presets Gallery */}
      <PresetsGallery />

      {/* Deep Technical Comparison Table */}
      <ComparisonSection />

      {/* Frequently Asked Questions */}
      <FaqSection />

      {/* Grand Bottom CTA Box */}
      <section className="lp-section">
        <div className="lp-cta-box">
          <div className="lp-cta-glow" />
          <h2 className="lp-cta-title">
            Ready to design architectures at the speed of thought?
          </h2>
          <p className="lp-cta-desc">
            No signup forms. No cloud dependencies. No paywalls. Open the studio and begin mapping
            scalable technical systems in seconds.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/studio" className="lp-hero-btn-main">
              <span>Launch Studio Now</span>
              <ArrowRight size={18} />
            </a>

            <a
              href="https://github.com/AtlasRoX/Drafo"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-hero-btn-secondary"
            >
              <GithubIcon size={16} />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Technical Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div>
            <DrafoLogo size={28} showWordmark={true} />
            <p className="lp-footer-brand-desc">
              Next-generation local-first system architecture & visual diagramming studio. Built with
              Next.js 16, React 19, PGlite (PostgreSQL 16 in WebAssembly), and Yjs WebRTC mesh.
            </p>
          </div>

          <div className="lp-footer-links-group">
            <div>
              <div className="lp-footer-col-title">Studio</div>
              <ul className="lp-footer-links-list">
                <li>
                  <a href="/studio">Launch Studio</a>
                </li>
                <li>
                  <a href="/studio?template=nextjs-16-architecture">Next.js 16 Template</a>
                </li>
                <li>
                  <a href="/studio?template=microservices-event-mesh">Microservices Template</a>
                </li>
                <li>
                  <a href="/studio?template=ai-agent-rag-pipeline">AI RAG Template</a>
                </li>
              </ul>
            </div>

            <div>
              <div className="lp-footer-col-title">Engine</div>
              <ul className="lp-footer-links-list">
                <li>
                  <a href="https://electric-sql.com/docs/intro" target="_blank" rel="noopener noreferrer">
                    ElectricSQL PGlite
                  </a>
                </li>
                <li>
                  <a href="https://yjs.dev/" target="_blank" rel="noopener noreferrer">
                    Yjs CRDT
                  </a>
                </li>
                <li>
                  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API" target="_blank" rel="noopener noreferrer">
                    WebCrypto AES-GCM
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="lp-footer-col-title">Project</div>
              <ul className="lp-footer-links-list">
                <li>
                  <a href="https://github.com/AtlasRoX/Drafo" target="_blank" rel="noopener noreferrer">
                    GitHub Repo
                  </a>
                </li>
                <li>
                  <a href="https://github.com/AtlasRoX/Drafo/issues" target="_blank" rel="noopener noreferrer">
                    Issue Tracker
                  </a>
                </li>
                <li>
                  <a href="https://github.com/AtlasRoX/Drafo/blob/main/README.md" target="_blank" rel="noopener noreferrer">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div>© {new Date().getFullYear()} Drafo Studio. Open-source under MIT license.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
            <span>PostgreSQL 16 WASM Ready • WebRTC Mesh Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
