'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Where is my architecture data stored? Does Drafo have a central backend?',
    answer:
      'No. Drafo is completely local-first. All diagrams, relations, sections, and history snapshots are stored directly inside your browser in an embedded PostgreSQL 16 WebAssembly instance (PGlite) backed by IndexedDB. Your proprietary infrastructure architectures never touch any cloud server.'
  },
  {
    question: 'What is PGlite and how does PostgreSQL 16 run in the browser?',
    answer:
      'PGlite is a lightweight build of PostgreSQL packaged into WebAssembly by ElectricSQL. It allows Drafo to run a full ACID-compliant relational SQL engine inside the client without requiring Node.js or Docker. You can query your diagram relational schema, perform cascading deletions, and export raw PostgreSQL DDL/DML dumps.'
  },
  {
    question: 'How does real-time collaboration work without a central diagram server?',
    answer:
      'Drafo uses Yjs Conflict-Free Replicated Data Types (CRDTs) connected through a serverless WebRTC mesh and the browser BroadcastChannel API. When you share a room link, peers establish direct P2P data channels with each other. Edits across browser tabs synchronize in 0ms with zero server latency.'
  },
  {
    question: 'How does client-side AES-256-GCM encryption protect my files?',
    answer:
      'When exporting a diagram vault (.drafo.enc), Drafo uses the browser native WebCrypto API (window.crypto.subtle). It derives a 256-bit cryptographic key using PBKDF2 with 100,000 iterations of SHA-256 and a random cryptographic salt. The file cannot be read or decrypted without your passphrase.'
  },
  {
    question: 'Can I export diagrams to GitHub, Notion, or Obsidian?',
    answer:
      'Yes! Drafo provides 1-click Mermaid.js syntax generation for direct pasting into GitHub markdown PRs, Notion documentation, and Obsidian vaults. It also supports Retina PNG (1x, 2x, 4x), clean standalone SVG, JSON, and PostgreSQL SQL dumps.'
  },
  {
    question: 'Is Drafo free to use?',
    answer:
      'Yes. Drafo is 100% free and open-source. There is no account creation, no subscription tier, no watermark, and no artificial diagram size or project limit.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="lp-section" id="faq">
      <div className="lp-section-header">
        <div className="lp-section-pill">
          <HelpCircle size={12} />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="lp-section-title">Everything you need to know.</h2>
        <p className="lp-section-desc">
          Common architectural questions about Drafo, local-first storage, WebRTC collaboration, and
          cryptography.
        </p>
      </div>

      <div className="lp-faq-container">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="lp-faq-item">
              <button
                className="lp-faq-trigger"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                {isOpen ? (
                  <ChevronUp size={18} style={{ color: '#60A5FA', flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={18} style={{ color: '#94A3B8', flexShrink: 0 }} />
                )}
              </button>

              {isOpen && (
                <div className="lp-faq-answer">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
