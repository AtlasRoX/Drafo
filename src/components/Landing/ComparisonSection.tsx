'use client';

import React from 'react';
import { Check, X, Shield, Split } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  drafo: boolean | string;
  cloudTools: boolean | string; // Miro, Lucidchart
  whiteboards: boolean | string; // Excalidraw
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: 'Embedded PostgreSQL 16 WASM Storage',
    drafo: true,
    cloudTools: false,
    whiteboards: false
  },
  {
    feature: 'Local-First (Zero Cloud Lock-In / Air-Gapped)',
    drafo: true,
    cloudTools: false,
    whiteboards: 'Partial'
  },
  {
    feature: 'Step-by-Step Traffic Simulation & Packet Playback',
    drafo: true,
    cloudTools: false,
    whiteboards: false
  },
  {
    feature: 'Serverless P2P Multiplayer (WebRTC + CRDT)',
    drafo: true,
    cloudTools: 'Central Server',
    whiteboards: 'Central Relay'
  },
  {
    feature: 'Military-Grade AES-256-GCM Encrypted Vaults',
    drafo: true,
    cloudTools: false,
    whiteboards: false
  },
  {
    feature: 'Intelligent Orthogonal 90° Obstacle Avoidance',
    drafo: true,
    cloudTools: true,
    whiteboards: false
  },
  {
    feature: '1-Click PostgreSQL DDL/DML Schema Export',
    drafo: true,
    cloudTools: false,
    whiteboards: false
  },
  {
    feature: 'Pricing & Account Friction',
    drafo: '100% Free • No Account',
    cloudTools: '$12–$24/user/mo',
    whiteboards: 'Free / Freemium'
  }
];

export const ComparisonSection: React.FC = () => {
  return (
    <section className="lp-section" id="comparison">
      <div className="lp-section-header">
        <div className="lp-section-pill">
          <Split size={12} />
          <span>Architectural Comparison</span>
        </div>
        <h2 className="lp-section-title">
          Why systems engineers are switching to Drafo.
        </h2>
        <p className="lp-section-desc">
          Compare Drafo's local-first embedded database approach with traditional centralized cloud
          services and basic whiteboard tools.
        </p>
      </div>

      <div className="lp-comparison-wrapper">
        <table className="lp-comparison-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th className="drafo-col">Drafo Studio 📐</th>
              <th>Cloud Platforms (Miro / Lucid)</th>
              <th>Canvas Tools (Excalidraw)</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_DATA.map((row, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600, color: '#F1F5F9' }}>{row.feature}</td>

                {/* Drafo Column */}
                <td className="drafo-col">
                  {typeof row.drafo === 'boolean' ? (
                    row.drafo ? (
                      <span className="lp-badge-check">
                        <Check size={16} /> Yes (Built-in)
                      </span>
                    ) : (
                      <span className="lp-badge-cross">
                        <X size={16} /> No
                      </span>
                    )
                  ) : (
                    <span style={{ color: '#34D399', fontWeight: 700 }}>{row.drafo}</span>
                  )}
                </td>

                {/* Cloud Tools Column */}
                <td>
                  {typeof row.cloudTools === 'boolean' ? (
                    row.cloudTools ? (
                      <span className="lp-badge-check">
                        <Check size={16} /> Yes
                      </span>
                    ) : (
                      <span className="lp-badge-cross">
                        <X size={16} /> No
                      </span>
                    )
                  ) : (
                    <span>{row.cloudTools}</span>
                  )}
                </td>

                {/* Canvas Tools Column */}
                <td>
                  {typeof row.whiteboards === 'boolean' ? (
                    row.whiteboards ? (
                      <span className="lp-badge-check">
                        <Check size={16} /> Yes
                      </span>
                    ) : (
                      <span className="lp-badge-cross">
                        <X size={16} /> No
                      </span>
                    )
                  ) : (
                    <span>{row.whiteboards}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
