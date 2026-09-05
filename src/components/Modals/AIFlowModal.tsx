'use client';

import React, { useState, useEffect } from 'react';
import { generateFlowFromPrompt } from '../../utils/aiGenerator';
import { FlowProject } from '../../types/flow';
import { Wand2, X, Sparkles, Cpu } from 'lucide-react';
import './Modals.css';

interface AIFlowModalProps {
  onFlowGenerated: (project: FlowProject) => void;
  onClose: () => void;
}

export const AIFlowModal: React.FC<AIFlowModalProps> = ({ onFlowGenerated, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  const steps = [
    '🧠 Thinking what to make based on your requirements...',
    '🔍 Analyzing architecture, protocols & security boundaries...',
    '🛠️ Synthesizing diagram nodes, coordinates & connectors...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep((s) => (s < steps.length - 1 ? s + 1 : s));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async (textToUse?: string) => {
    const finalPrompt = textToUse || prompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.project && Array.isArray(data.project.nodes) && data.project.nodes.length > 0) {
          onFlowGenerated(data.project);
          setIsGenerating(false);
          onClose();
          return;
        }
      }
      // Fallback
      const generatedProject = generateFlowFromPrompt(finalPrompt);
      onFlowGenerated(generatedProject);
    } catch {
      const generatedProject = generateFlowFromPrompt(finalPrompt);
      onFlowGenerated(generatedProject);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div className="drafo-modal-container ai-studio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="drafo-ai-header">
          <div className="drafo-ai-header-left">
            <div className="drafo-ai-badge-icon">
              <Wand2 size={18} />
            </div>
            <div>
              <div className="drafo-ai-title-row">
                <h3 className="drafo-ai-title">AI Flowchart Generator</h3>
              </div>
              <p className="drafo-ai-subtitle">
                Describe any architecture, API lifecycle, or user journey in plain English or Bengali.
              </p>
            </div>
          </div>
          <button className="drafo-modal-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Prompt Input Box */}
        <div className="drafo-ai-composer">
          <textarea
            className="drafo-ai-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'bn'
                ? 'উদাহরণ: ইউজার লগইন ও ওটিপি ভেরিফিকেশন ফ্লো, অথবা ই-কমার্স চেকআউট উইথ ডাটাবেস...'
                : 'e.g. User login with OAuth2, Redis rate limiter, GraphQL server, and Postgres replica...'
            }
            rows={4}
            autoFocus
          />

          <div className="drafo-ai-composer-footer">
            <div className="drafo-ai-lang-toggle">
              <button
                type="button"
                className={`drafo-lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`drafo-lang-btn ${language === 'bn' ? 'active' : ''}`}
                onClick={() => setLanguage('bn')}
              >
                বাংলা
              </button>
            </div>

            <div className="drafo-ai-shortcut-hint">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
            </div>
          </div>
        </div>

        {/* Generation Loading State Overlay */}
        {isGenerating && (
          <div className="drafo-ai-generating-overlay">
            <div className="drafo-ai-spinner">
              <Cpu size={24} className="drafo-spinning-icon" />
            </div>
            <div className="drafo-ai-step-text">{steps[generationStep]}</div>
            <div className="drafo-ai-progress-bar">
              <div
                className="drafo-ai-progress-fill"
                style={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="drafo-ai-footer">
          <button className="drafo-btn-secondary" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button
            className="drafo-btn-primary drafo-ai-submit-btn"
            disabled={!prompt.trim() || isGenerating}
            onClick={() => handleGenerate()}
          >
            <Wand2 size={15} />
            <span>{isGenerating ? 'Synthesizing Flow...' : 'Generate Flowchart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
