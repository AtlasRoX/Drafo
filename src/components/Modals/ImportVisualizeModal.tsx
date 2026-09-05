'use client';

import React, { useState, useRef } from 'react';
import { FlowProject, FlowNode, FlowEdge } from '../../types/flow';
import {
  parseToFlowProject,
  autoDetectFormat,
  SupportedFormat
} from '../../utils/parsers';
import {
  X,
  FolderOpen,
  Upload,
  Copy,
  Clipboard,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Layers,
  Database,
  Code2,
  FileCode,
  Table,
  Zap
} from 'lucide-react';
import './Modals.css';
import './ImportVisualizeModal.css';

interface ImportVisualizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAsNewDiagram: (project: FlowProject) => void;
  onInsertIntoCanvas?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  initialFormat?: SupportedFormat | 'auto';
  initialCode?: string;
  isEditorMode?: boolean;
}

const FORMAT_TABS: Array<{ id: SupportedFormat | 'auto'; label: string; icon: React.ReactNode }> = [
  { id: 'auto', label: 'Auto-Detect', icon: <Zap size={12} color="#F59E0B" /> },
  { id: 'mermaid', label: 'Mermaid', icon: <Layers size={12} color="#06B6D4" /> },
  { id: 'uml', label: 'UML / PlantUML', icon: <Code2 size={12} color="#4F46E5" /> },
  { id: 'sql', label: 'SQL Schema (ERD)', icon: <Database size={12} color="#9333EA" /> },
  { id: 'json', label: 'JSON Data & Tree', icon: <FileCode size={12} color="#10B981" /> },
  { id: 'types', label: 'Types & Schemas', icon: <Table size={12} color="#3B82F6" /> }
];

export const ImportVisualizeModal: React.FC<ImportVisualizeModalProps> = ({
  isOpen,
  onClose,
  onOpenAsNewDiagram,
  onInsertIntoCanvas,
  initialFormat = 'auto',
  initialCode = '',
  isEditorMode = false
}) => {
  const [activeFormat, setActiveFormat] = useState<SupportedFormat | 'auto'>(initialFormat);
  const [code, setCode] = useState<string>(initialCode);
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  let parsedProject: FlowProject | null = null;
  let parseError: string | null = null;
  if (code.trim()) {
    try {
      parsedProject = parseToFlowProject(activeFormat, code, { direction });
    } catch (err: any) {
      parseError = err.message || 'Syntax error parsing input';
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'drafo' || ext === 'json') {
          try {
            const parsed = JSON.parse(content);
            if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
              onOpenAsNewDiagram(parsed);
              onClose();
              return;
            }
          } catch {}
        }
        setCode(content);
        if (ext === 'sql') setActiveFormat('sql');
        else if (ext === 'json') setActiveFormat('json');
        else if (ext === 'mmd' || ext === 'mermaid') setActiveFormat('mermaid');
        else if (ext === 'puml' || ext === 'uml') setActiveFormat('uml');
        else if (ext === 'ts' || ext === 'graphql') setActiveFormat('types');
        else setActiveFormat('auto');
      }
    };
    reader.readAsText(file);
  };

  const handlePasteClipboard = async () => {
    try { const text = await navigator.clipboard.readText(); if (text) { setCode(text); setActiveFormat('auto'); } } catch {}
  };

  const handleCopyCode = () => {
    if (code) { navigator.clipboard.writeText(code); setCopiedSuccess(true); setTimeout(() => setCopiedSuccess(false), 1800); }
  };

  const handleOpenNew = () => {
    if (!parsedProject) return;
    onOpenAsNewDiagram({ ...parsedProject, id: 'project-' + Date.now(), updatedAt: new Date().toISOString() });
    onClose();
  };

  const handleInsert = () => {
    if (!parsedProject || !onInsertIntoCanvas) return;
    onInsertIntoCanvas(parsedProject.nodes, parsedProject.edges); onClose();
  };

  const detectedFormat = code.trim() ? autoDetectFormat(code) : null;
  const nodeCount = parsedProject?.nodes.length || 0;
  const edgeCount = parsedProject?.edges.length || 0;

  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div className="drafo-modal-container import-visualize-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="import-visualize-header">
          <div className="import-visualize-title-group">
            <div className="import-visualize-icon-badge"><FolderOpen size={20} /></div>
            <div>
              <h2 className="import-visualize-title">Universal Import & Visualize Studio</h2>
              <p className="import-visualize-subtitle">Open .drafo projects, or visualize Mermaid, UML, SQL schemas, JSON payloads, and TypeScript/GraphQL contracts</p>
            </div>
          </div>
          <button className="drafo-modal-close" onClick={onClose} title="Close"><X size={18} /></button>
        </div>

        {/* Format Tabs */}
        <div className="import-format-tabs-bar">
          {FORMAT_TABS.map((tab) => (
            <button key={tab.id} className={'import-format-tab-btn' + (activeFormat === tab.id ? ' active' : '')}
              onClick={() => setActiveFormat(tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Action Tools Bar */}
        <div className="import-editor-subbar">
          <div className="import-editor-actions">
            <label className="import-tool-btn import-tool-btn--labeled cursor-pointer" title="Upload local code file or .drafo project">
              <Upload size={13} /><span>Upload / Load File</span>
              <input ref={fileInputRef} type="file" accept=".drafo,.json,.sql,.mmd,.mermaid,.puml,.uml,.ts,.d.ts,.graphql,.gql,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button className="import-tool-btn import-tool-btn--icon" onClick={handlePasteClipboard} title="Paste from clipboard"><Clipboard size={14} /></button>
            <button className="import-tool-btn import-tool-btn--icon" onClick={handleCopyCode} title={copiedSuccess ? 'Copied!' : 'Copy code'}>
              {copiedSuccess ? <CheckCircle2 size={14} color="#10B981" /> : <Copy size={14} />}
            </button>
            <button className="import-tool-btn import-tool-btn--icon import-tool-btn--danger" onClick={() => setCode('')} title="Clear editor"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Light Code Editor */}
        <div className="import-code-container">
          <textarea className="import-code-textarea" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder={'Paste your ' + (activeFormat === 'auto' ? 'Mermaid, UML, SQL, JSON, or TypeScript' : activeFormat.toUpperCase()) + ' code here\u2026'}
            spellCheck={false} />
        </div>

        {/* Status Banner */}
        {parsedProject ? (
          <div className="import-status-banner success">
            <div className="import-status-left"><CheckCircle2 size={15} color="#16A34A" /><span>Successfully parsed <strong>{detectedFormat ? detectedFormat.toUpperCase() : activeFormat.toUpperCase()}</strong> specification</span></div>
            <div className="import-stats-pills"><span className="import-stat-chip">{nodeCount} Nodes / Tables</span><span className="import-stat-chip">{edgeCount} Relations / Edges</span></div>
          </div>
        ) : parseError ? (
          <div className="import-status-banner error"><div className="import-status-left"><AlertCircle size={15} color="#DC2626" /><span>{parseError}</span></div></div>
        ) : (
          <div className="import-status-banner idle"><div className="import-status-left"><Code2 size={15} color="#94A3B8" /><span>Type or paste schema / code above to preview graph</span></div></div>
        )}

        {/* Layout Direction */}
        <div className="import-options-row">
          <div className="import-direction-toggle">
            <span>Layout Direction:</span>
            <div className="direction-buttons">
              <button className={'direction-btn' + (direction === 'LR' ? ' active' : '')} onClick={() => setDirection('LR')}>Left → Right</button>
              <button className={'direction-btn' + (direction === 'TB' ? ' active' : '')} onClick={() => setDirection('TB')}>Top ↓ Bottom</button>
            </div>
          </div>
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Supports all Drafo styles, palettes, 4 ports, and simulation</span>
        </div>

        {/* Footer */}
        <div className="import-footer-actions">
          <button className="import-cancel-btn" onClick={onClose}>Cancel</button>
          {isEditorMode && onInsertIntoCanvas && (
            <button className="import-insert-btn" onClick={handleInsert} disabled={!parsedProject}><Plus size={14} /><span>Insert into Canvas</span></button>
          )}
          <button className="import-submit-btn" onClick={handleOpenNew} disabled={!parsedProject}>
            <FolderOpen size={14} /><span>Open as New Diagram</span><ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
