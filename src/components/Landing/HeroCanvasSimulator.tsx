'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
  ShieldCheck,
  Server,
  Globe,
  ExternalLink,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface SimulatedNode {
  id: string;
  title: string;
  subtitle: string;
  type: 'browser' | 'gateway' | 'worker' | 'database';
  badge: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  sqlRecord?: string;
  latency?: string;
}

const SIMULATED_NODES: SimulatedNode[] = [
  {
    id: 'node-client',
    title: 'Web Browser',
    subtitle: 'Client Application',
    type: 'browser',
    badge: 'HTTPS Client',
    x: 40,
    y: 150,
    width: 170,
    height: 120,
    color: '#3B82F6',
    sqlRecord: 'SELECT user_id, session_token FROM client_sessions;'
  },
  {
    id: 'node-gateway',
    title: 'Cloudflare / Envoy',
    subtitle: 'API Edge Gateway',
    type: 'gateway',
    badge: 'TLS 1.3 • Edge',
    x: 270,
    y: 140,
    width: 180,
    height: 130,
    color: '#06B6D4',
    latency: '⚡ 4ms',
    sqlRecord: 'INSERT INTO api_logs (path, ip) VALUES ("/checkout", "192.0.2.1");'
  },
  {
    id: 'node-auth',
    title: 'Auth & Session Worker',
    subtitle: 'JWT & In-Memory Redis',
    type: 'worker',
    badge: 'Auth Microservice',
    x: 510,
    y: 90,
    width: 190,
    height: 120,
    color: '#8B5CF6',
    latency: '⚡ 8ms',
    sqlRecord: 'UPDATE user_tokens SET last_active = NOW() WHERE uid = $1;'
  },
  {
    id: 'node-db',
    title: 'PGlite PostgreSQL 16',
    subtitle: 'WASM Relational Engine',
    type: 'database',
    badge: 'ACID • IndexedDB',
    x: 760,
    y: 150,
    width: 190,
    height: 130,
    color: '#10B981',
    latency: '⚡ 14ms',
    sqlRecord: 'BEGIN; INSERT INTO orders (id, amount) VALUES (101, 89.00); COMMIT;'
  }
];

export const HeroCanvasSimulator: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-db');

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const selectedNode = SIMULATED_NODES.find((n) => n.id === selectedNodeId) || SIMULATED_NODES[3];

  return (
    <div className="lp-simulator-wrapper" id="live-simulator">
      <div className="lp-simulator-glow" />
      <div className="lp-simulator-frame">
        {/* Top bar */}
        <div className="lp-simulator-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="lp-sim-window-dots">
              <span className="lp-sim-dot red" />
              <span className="lp-sim-dot yellow" />
              <span className="lp-sim-dot green" />
            </div>
            <div className="lp-sim-title-pill">
              <Activity size={13} style={{ color: '#3B82F6' }} />
              <span>drafo-studio://microservices-event-mesh.drafo</span>
            </div>
          </div>

          <div className="lp-sim-controls">
            <button
              className={`lp-sim-btn ${isPlaying ? 'lp-sim-btn-primary' : 'lp-sim-btn-secondary'}`}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              <Play size={12} fill={isPlaying ? '#FFFFFF' : 'currentColor'} />
              <span>{isPlaying ? 'Simulating Pulse' : 'Resume Flow'}</span>
            </button>

            <button
              className="lp-sim-btn lp-sim-btn-secondary"
              onClick={() => {
                setActiveStep(1);
                setIsPlaying(true);
              }}
              title="Reset Simulation"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <a
              href="/studio"
              className="lp-sim-btn lp-sim-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <span>Open in Studio</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lp-sim-canvas">
          {/* Orthogonal SVG Lines */}
          <svg className="lp-sim-svg">
            {/* Cable 1: Browser -> Gateway */}
            <path
              d="M 210 205 L 270 205"
              className={`lp-sim-wire ${activeStep >= 1 ? 'lp-sim-wire-active' : ''}`}
            />
            {/* Cable 2: Gateway -> Auth Worker */}
            <path
              d="M 450 180 L 480 180 L 480 150 L 510 150"
              className={`lp-sim-wire ${activeStep >= 2 ? 'lp-sim-wire-active' : ''}`}
            />
            {/* Cable 3: Gateway -> DB */}
            <path
              d="M 450 230 L 710 230 L 710 215 L 760 215"
              className={`lp-sim-wire ${activeStep >= 3 ? 'lp-sim-wire-active' : ''}`}
            />
            {/* Cable 4: Auth -> DB */}
            <path
              d="M 700 150 L 730 150 L 730 180 L 760 180"
              className={`lp-sim-wire ${activeStep >= 4 ? 'lp-sim-wire-active' : ''}`}
            />
          </svg>

          {/* Latency Badges on cables */}
          <div
            className="lp-sim-latency-badge"
            style={{ left: '220px', top: '185px' }}
          >
            ⚡ 2ms
          </div>
          <div
            className="lp-sim-latency-badge"
            style={{ left: '460px', top: '135px' }}
          >
            ⚡ 8ms
          </div>
          <div
            className="lp-sim-latency-badge"
            style={{ left: '710px', top: '165px' }}
          >
            ⚡ 14ms
          </div>

          {/* Interactive Nodes */}
          {SIMULATED_NODES.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const isStepActive = activeStep === index + 1;

            return (
              <div
                key={node.id}
                className={`lp-sim-node ${isSelected ? 'active-node' : ''}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                  borderColor: isStepActive ? node.color : undefined
                }}
                onClick={() => setSelectedNodeId(node.id)}
              >
                {/* Node Header */}
                <div
                  className="lp-sim-node-header"
                  style={{
                    backgroundColor: `${node.color}18`,
                    borderBottomColor: `${node.color}30`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {node.type === 'browser' && <Globe size={13} style={{ color: node.color }} />}
                    {node.type === 'gateway' && <Server size={13} style={{ color: node.color }} />}
                    {node.type === 'worker' && <ShieldCheck size={13} style={{ color: node.color }} />}
                    {node.type === 'database' && <Database size={13} style={{ color: node.color }} />}
                    <span style={{ color: node.color, fontWeight: 700 }}>{node.badge}</span>
                  </div>
                  {isStepActive && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: node.color,
                        boxShadow: `0 0 8px ${node.color}`
                      }}
                    />
                  )}
                </div>

                {/* Node Body */}
                <div className="lp-sim-node-body">
                  <div className="lp-sim-node-title">{node.title}</div>
                  <div className="lp-sim-node-sub">{node.subtitle}</div>
                </div>

                {/* Micro port indicators */}
                <span
                  style={{
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: node.color,
                    border: '1px solid #07090D'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#64748B',
                    border: '1px solid #07090D'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Live Relational Node Inspector & Telemetry Bar */}
        <div className="lp-simulator-bottombar">
          <div className="lp-sim-status-item">
            <span className="lp-sim-status-dot" />
            <span>
              <strong>PGlite Engine:</strong> Connected to in-memory PostgreSQL 16 WASM
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'var(--lp-font-mono)',
              fontSize: '11px',
              color: '#94A3B8'
            }}
          >
            <span style={{ color: '#38BDF8' }}>
              Selected: <strong>{selectedNode.title}</strong>
            </span>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#34D399' }}>ACID Transaction: OK</span>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#FBBF24' }}>
              {selectedNode.latency || '⚡ 1ms'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
