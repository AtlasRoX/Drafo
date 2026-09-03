'use client';

import React from 'react';
import { TEMPLATES } from '../../data/templates';
import { FlowProject } from '../../types/flow';
import { X, Bookmark, Check } from 'lucide-react';
import './Modals.css';

interface TemplateModalProps {
  currentTemplateId: string;
  onSelectTemplate: (template: FlowProject) => void;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  currentTemplateId,
  onSelectTemplate,
  onClose
}) => {
  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div className="drafo-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="drafo-modal-header">
          <div className="drafo-modal-title">
            <Bookmark size={20} className="text-blue-600" />
            <span>Preset Architecture Templates</span>
          </div>
          <button className="drafo-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="drafo-modal-desc">
          Select a pre-designed technical flow to load into the Drafo studio.
        </p>

        <div className="drafo-template-grid">
          {TEMPLATES.map((tmpl) => {
            const isCurrent = tmpl.id === currentTemplateId;
            return (
              <div
                key={tmpl.id}
                className={`drafo-template-card ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
              >
                <div className="drafo-template-header">
                  <h4>{tmpl.name}</h4>
                  {isCurrent && (
                    <span className="drafo-current-badge">
                      <Check size={12} /> Active
                    </span>
                  )}
                </div>
                <p className="drafo-template-desc">{tmpl.description}</p>
                <div className="drafo-template-meta">
                  <span>{tmpl.nodes.length} Nodes</span>
                  <span>•</span>
                  <span>{tmpl.edges.length} Connectors</span>
                  <span>•</span>
                  <span>{tmpl.sections.length} Sections</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
