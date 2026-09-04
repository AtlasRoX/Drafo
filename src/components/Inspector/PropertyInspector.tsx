'use client';

import React, { useState, useEffect } from 'react';
import {
  FlowProject,
  FlowNode as FlowNodeType,
  FlowEdge as FlowEdgeType,
  FlowSection,
  NodeType,
  RouteType,
  LineStyle,
  ArrowheadType,
  NodeStatus
} from '../../types/flow';
import { NODE_COLOR_PALETTES } from '../../data/colorPalettes';
import {
  Trash2,
  Copy,
  Settings,
  Palette,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  CornerDownRight,
  Activity,
  Box,
  Compass,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  FoldHorizontal,
  FoldVertical,
  Ungroup,
  Group,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  Server,
  ExternalLink,
  Zap,
  Clock,
  Radio,
  Database,
  Cloud,
  StickyNote,
  GitFork,
  Cpu,
  Split,
  Pipette,
  Check,
  Sparkles,
  BookmarkPlus
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../UI/CustomSelect';
import {
  DEFAULT_STYLE_TEMPLATES,
  StyleTemplate,
  loadCustomTemplates,
  saveCustomTemplate
} from '../../data/styleTemplates';
import './Inspector.css';


// Production-Grade Component Type Options with Rich Metadata
const COMPONENT_TYPE_OPTIONS: SelectOption<NodeType>[] = [
  { value: 'standard', label: 'Service / Microservice', sublabel: 'Universal API or backend service card', icon: <Box size={14} color="#2563EB" /> },
  { value: 'server', label: 'Server Host / Component', sublabel: 'Compute or SSR application node', icon: <Server size={14} color="#3B82F6" /> },
  { value: 'api', label: 'REST / GraphQL API', sublabel: 'Public or private endpoint gateway', icon: <ExternalLink size={14} color="#0284C7" /> },
  { value: 'gateway', label: 'API Gateway', sublabel: 'Ingress proxy & load balancer', icon: <Radio size={14} color="#7C3AED" /> },
  { value: 'auth', label: 'OAuth2 / IAM Auth', sublabel: 'Authentication & tokens server', icon: <Lock size={14} color="#DC2626" /> },
  { value: 'database', label: 'SQL Database', sublabel: '3D cylinder persistent relational DB', icon: <Database size={14} color="#9333EA" /> },
  { value: 'nosql', label: 'NoSQL / Document Store', sublabel: 'MongoDB / DynamoDB cylinder', icon: <Database size={14} color="#A855F7" /> },
  { value: 'cache', label: 'Redis / In-Memory Cache', sublabel: 'Ultra-low latency key-value cache', icon: <Zap size={14} color="#EA580C" /> },
  { value: 'queue', label: 'Message Queue / PubSub', sublabel: 'Kafka / RabbitMQ / SQS queue', icon: <Layers size={14} color="#F97316" /> },
  { value: 'serverless', label: 'Serverless Function', sublabel: 'Lambda / Edge compute runtime', icon: <Zap size={14} color="#D97706" /> },
  { value: 'worker', label: 'Background Worker', sublabel: 'Async batch / cron jobs runner', icon: <Clock size={14} color="#475569" /> },
  { value: 'container', label: 'Architecture Container', sublabel: 'VPC / Subnet / Cluster boundary', icon: <Layers size={14} color="#2563EB" /> },
  { value: 'group', label: 'Subsystem Group Zone', sublabel: 'Logical boundary perimeter', icon: <Group size={14} color="#6366F1" /> },
  { value: 'cloud', label: 'Cloud Region / VPC', sublabel: 'AWS / GCP / Azure infrastructure', icon: <Cloud size={14} color="#6366F1" /> },
  { value: 'kubernetes', label: 'Kubernetes Pod / Node', sublabel: 'K8s containerized orchestrator', icon: <Cpu size={14} color="#326CE5" /> },
  { value: 'loadbalancer', label: 'Load Balancer', sublabel: 'Traffic routing & distribution', icon: <Split size={14} color="#059669" /> },
  { value: 'browser', label: 'Web Browser Window', sublabel: 'Desktop web client preview window', icon: <Globe size={14} color="#2563EB" /> },
  { value: 'mobile', label: 'Mobile Client App', sublabel: 'iOS / Android dynamic shell', icon: <Smartphone size={14} color="#0F172A" /> },
  { value: 'desktop', label: 'Desktop App Window', sublabel: 'Electron / Native client frame', icon: <Monitor size={14} color="#475569" /> },
  { value: 'terminal', label: 'Developer Terminal CLI', sublabel: 'Shell command prompt preview', icon: <Terminal size={14} color="#0F172A" /> },
  { value: 'decision', label: 'Decision Diamond', sublabel: 'Conditional branch diamond', icon: <GitFork size={14} color="#D97706" /> },
  { value: 'note', label: 'Sticky Note', sublabel: 'Annotation sticky documentation', icon: <StickyNote size={14} color="#F59E0B" /> }
];

// Status & Health Options with Live Status Color Dots
const STATUS_OPTIONS: SelectOption<NodeStatus>[] = [
  { value: 'online', label: 'Online', sublabel: 'Active & Healthy (200 OK)', indicatorColor: '#10B981' },
  { value: 'idle', label: 'Idle', sublabel: 'Standby / Low Traffic', indicatorColor: '#F59E0B' },
  { value: 'busy', label: 'Busy', sublabel: 'Processing / High Queue', indicatorColor: '#3B82F6' },
  { value: 'error', label: 'Degraded / Error', sublabel: 'Elevated Error Rate / Failed', indicatorColor: '#EF4444' }
];

// Mobile Device Shell Options
const DEVICE_OPTIONS: SelectOption<'iphone' | 'android' | 'tablet'>[] = [
  { value: 'iphone', label: 'Apple iPhone', sublabel: 'Dynamic Island Frame', icon: <Smartphone size={14} /> },
  { value: 'android', label: 'Android Phone', sublabel: 'Standard Mobile Frame', icon: <Smartphone size={14} /> },
  { value: 'tablet', label: 'iPad / Tablet', sublabel: 'Wide Tablet Viewport', icon: <Monitor size={14} /> }
];

// Batch Palette Options with Color Swatches
const BATCH_PALETTE_OPTIONS: SelectOption<string>[] = Object.keys(NODE_COLOR_PALETTES).map((key) => {
  const p = NODE_COLOR_PALETTES[key];
  return {
    value: key,
    label: p.name,
    sublabel: p.description,
    indicatorColor: p.headerBg || p.border
  };
});

interface PropertyInspectorProps {
  isOpen?: boolean;
  onToggleCollapse?: () => void;
  project: FlowProject;
  selectedId: string | null;
  selectedIds?: string[];
  selectedType: 'node' | 'edge' | 'section' | 'canvas' | null;
  onUpdateProject: (updatedProject: FlowProject) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onAlignSelected?: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeSelected?: (direction: 'horizontal' | 'vertical') => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  isOpen = true,
  onToggleCollapse,
  project,
  selectedId,
  selectedIds = [],
  selectedType,
  onUpdateProject,
  onDeleteSelected,
  onDuplicateSelected,
  onAlignSelected,
  onDistributeSelected,
  onGroupSelected,
  onUngroupSelected
}) => {
  const selectedNode =
    selectedType === 'node' ? project.nodes.find((n) => n.id === selectedId) : null;
  const selectedEdge =
    selectedType === 'edge' ? project.edges.find((e) => e.id === selectedId) : null;
  const selectedSection =
    selectedType === 'section' ? project.sections.find((s) => s.id === selectedId) : null;

  const isContainerSelected =
    selectedNode && (selectedNode.type === 'container' || selectedNode.type === 'group');

  // User custom saved style templates state
  const [customTemplates, setCustomTemplates] = useState<StyleTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const allStyleTemplates = [...DEFAULT_STYLE_TEMPLATES, ...customTemplates];

  const templateOptions: SelectOption<string>[] = allStyleTemplates.map((t) => ({
    value: t.id,
    label: t.name,
    sublabel: t.description,
    icon: (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: 4,
          backgroundColor: t.bg === 'transparent' ? '#FFFFFF' : t.bg,
          border: '1px solid #CBD5E1',
          flexShrink: 0
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: t.accentColor
          }}
        />
      </span>
    )
  }));

  const applyStyleTemplate = (templateId: string) => {
    const template = allStyleTemplates.find((t) => t.id === templateId);
    if (!template || !selectedNode) return;
    updateNodeStyle({
      bg: template.bg,
      accentColor: template.accentColor,
      borderColor: template.borderColor || template.accentColor,
      tint: template.tint || 'subtle',
      textColor: template.textColor,
      subtextColor: template.subtextColor
    });
  };

  const applyBatchStyleTemplate = (templateId: string) => {
    const template = allStyleTemplates.find((t) => t.id === templateId);
    if (!template || selectedIds.length === 0) return;
    const targetSet = new Set(selectedIds);
    const updatedNodes = project.nodes.map((n) =>
      targetSet.has(n.id)
        ? {
            ...n,
            style: {
              ...n.style,
              bg: template.bg,
              accentColor: template.accentColor,
              borderColor: template.borderColor || template.accentColor,
              tint: template.tint || 'subtle',
              textColor: template.textColor,
              subtextColor: template.subtextColor
            }
          }
        : n
    );
    onUpdateProject({ ...project, nodes: updatedNodes });
  };

  const handleSaveCustomTemplate = () => {
    if (!selectedNode || !newTemplateName.trim()) return;
    saveCustomTemplate({
      name: newTemplateName.trim(),
      description: `Custom theme (${selectedNode.style.accentColor || '#2563EB'})`,
      bg: selectedNode.style.bg || 'auto',
      accentColor: selectedNode.style.accentColor || '#2563EB',
      borderColor: selectedNode.style.borderColor || selectedNode.style.accentColor,
      tint: (selectedNode.style.tint as any) || 'subtle',
      textColor: selectedNode.style.textColor,
      subtextColor: selectedNode.style.subtextColor
    });
    setCustomTemplates(loadCustomTemplates());
    setIsSavingTemplate(false);
    setNewTemplateName('');
  };

  // Node Property Updaters
  const updateNodeStyle = (updates: Partial<FlowNodeType['style']>) => {
    if (!selectedNode) return;
    const updatedNodes = project.nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, style: { ...n.style, ...updates } } : n
    );
    onUpdateProject({ ...project, nodes: updatedNodes });
  };

  const updateNodeProps = (updates: Partial<FlowNodeType>) => {
    if (!selectedNode) return;
    const updatedNodes = project.nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, ...updates } : n
    );
    onUpdateProject({ ...project, nodes: updatedNodes });
  };

  const bringToFront = () => {
    if (!selectedNode) return;
    const others = project.nodes.filter((n) => n.id !== selectedNode.id);
    onUpdateProject({ ...project, nodes: [...others, selectedNode] });
  };

  const sendToBack = () => {
    if (!selectedNode) return;
    const others = project.nodes.filter((n) => n.id !== selectedNode.id);
    onUpdateProject({ ...project, nodes: [selectedNode, ...others] });
  };

  // Edge Property Updaters
  const updateEdgeProps = (updates: Partial<FlowEdgeType>) => {
    if (!selectedEdge) return;
    const updatedEdges = project.edges.map((e) =>
      e.id === selectedEdge.id ? { ...e, ...updates } : e
    );
    onUpdateProject({ ...project, edges: updatedEdges });
  };

  // Section Property Updaters
  const updateSectionProps = (updates: Partial<FlowSection>) => {
    if (!selectedSection) return;
    const updatedSections = project.sections.map((s) =>
      s.id === selectedSection.id ? { ...s, ...updates } : s
    );
    onUpdateProject({ ...project, sections: updatedSections });
  };

  // Canvas Settings Updater
  const updateCanvasSettings = (updates: Partial<FlowProject['canvasSettings']>) => {
    onUpdateProject({
      ...project,
      canvasSettings: { ...project.canvasSettings, ...updates }
    });
  };

  // Color preset applicator for single node
  const applyColorTheme = (themeKey: string) => {
    const theme = NODE_COLOR_PALETTES[themeKey];
    if (!theme || !selectedNode) return;

    updateNodeStyle({
      bg: theme.bg,
      borderColor: theme.border,
      textColor: theme.text,
      subtextColor: theme.subtext,
      headerBg: theme.headerBg,
      colorPalette: themeKey
    });
  };

  // Batch color preset applicator for multi-selected nodes
  const applyBatchColorTheme = (themeKey: string) => {
    const theme = NODE_COLOR_PALETTES[themeKey];
    if (!theme || selectedIds.length === 0) return;

    const targetSet = new Set(selectedIds);
    const updatedNodes = project.nodes.map((n) =>
      targetSet.has(n.id)
        ? {
            ...n,
            style: {
              ...n.style,
              bg: theme.bg,
              borderColor: theme.border,
              textColor: theme.text,
              subtextColor: theme.subtext,
              headerBg: theme.headerBg,
              colorPalette: themeKey
            }
          }
        : n
    );
    onUpdateProject({ ...project, nodes: updatedNodes });
  };

  if (!isOpen) {
    return (
      <div
        className="drafo-inspector-collapsed-tab"
        onClick={onToggleCollapse}
        title="Open Inspector Panel"
      >
        <SlidersHorizontal size={16} />
      </div>
    );
  }

  return (
    <aside className="drafo-inspector-panel">
      {/* =========================================================================
          MULTI-NODE SELECTION & ALIGNMENT INSPECTOR
          ========================================================================= */}
      {selectedType === 'node' && selectedIds.length > 1 && (
        <div className="drafo-inspector-group">
          <div className="drafo-inspector-header">
            <div className="drafo-inspector-title">
              <Layers size={15} />
              <span>{selectedIds.length} Nodes Selected</span>
            </div>
            <div className="drafo-inspector-actions">
              {onGroupSelected && (
                <button
                  className="drafo-icon-btn"
                  onClick={onGroupSelected}
                  title="Group into Container (Ctrl+G)"
                >
                  <Group size={14} />
                </button>
              )}
              <button
                className="drafo-icon-btn"
                onClick={onDuplicateSelected}
                title="Duplicate All (Ctrl+D)"
              >
                <Copy size={13} />
              </button>
              <button
                className="drafo-icon-btn delete-btn"
                onClick={onDeleteSelected}
                title="Delete All (Del)"
              >
                <Trash2 size={13} />
              </button>
              {onToggleCollapse && (
                <button
                  className="drafo-icon-btn"
                  onClick={onToggleCollapse}
                  title="Collapse Inspector"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Group Action */}
          {onGroupSelected && (
            <div className="drafo-form-field" style={{ padding: '0 14px' }}>
              <button
                className="drafo-inspector-action-btn"
                onClick={onGroupSelected}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px',
                  borderRadius: 8,
                  border: '1px solid #C7D2FE',
                  backgroundColor: '#EEF2FF',
                  color: '#4338CA',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                <Group size={14} />
                <span>Group into Container (Ctrl+G)</span>
              </button>
            </div>
          )}

          {/* Alignment Tools */}
          {onAlignSelected && (
            <div className="drafo-form-field" style={{ padding: '0 14px' }}>
              <label className="drafo-field-label">Align Elements</label>
              <div className="drafo-align-grid">
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('left')}
                  title="Align Left"
                >
                  <AlignLeft size={15} />
                  <span>Left</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('center')}
                  title="Align Center (Horizontal)"
                >
                  <AlignCenter size={15} />
                  <span>Center</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('right')}
                  title="Align Right"
                >
                  <AlignRight size={15} />
                  <span>Right</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('top')}
                  title="Align Top"
                >
                  <AlignJustify size={15} style={{ transform: 'rotate(90deg)' }} />
                  <span>Top</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('middle')}
                  title="Align Middle (Vertical)"
                >
                  <AlignCenter size={15} style={{ transform: 'rotate(90deg)' }} />
                  <span>Middle</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onAlignSelected('bottom')}
                  title="Align Bottom"
                >
                  <AlignJustify size={15} style={{ transform: 'rotate(90deg) scaleX(-1)' }} />
                  <span>Bottom</span>
                </button>
              </div>
            </div>
          )}

          {/* Distribution Tools */}
          {onDistributeSelected && selectedIds.length > 2 && (
            <div className="drafo-form-field" style={{ padding: '0 14px' }}>
              <label className="drafo-field-label">Distribute Spacing</label>
              <div className="drafo-align-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <button
                  className="drafo-align-btn"
                  onClick={() => onDistributeSelected('horizontal')}
                  title="Distribute Evenly Horizontally"
                >
                  <FoldHorizontal size={15} />
                  <span>Horizontally</span>
                </button>
                <button
                  className="drafo-align-btn"
                  onClick={() => onDistributeSelected('vertical')}
                  title="Distribute Evenly Vertically"
                >
                  <FoldVertical size={15} />
                  <span>Vertically</span>
                </button>
              </div>
            </div>
          )}

          {/* Unified Batch Appearance */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <label className="drafo-field-label">
              <Palette size={13} color="#2563EB" />
              <span>Batch Style Template</span>
            </label>
            <CustomSelect
              value=""
              options={templateOptions}
              placeholder="Apply unified template to all selected..."
              searchable
              onChange={(val) => {
                if (val) applyBatchStyleTemplate(val);
              }}
            />

            {/* Quick Batch Background Presets */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Batch Background Fill
              </div>
              <div className="drafo-bg-shortcuts-grid">
                {[
                  { label: 'Auto', val: 'auto' },
                  { label: 'White', val: '#FFFFFF' },
                  { label: 'Dark', val: '#0F172A' },
                  { label: 'Clear', val: 'transparent' }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    className="drafo-bg-shortcut-btn"
                    onClick={() => {
                      const targetSet = new Set(selectedIds);
                      const updatedNodes = project.nodes.map((n) =>
                        targetSet.has(n.id) ? { ...n, style: { ...n.style, bg: item.val } } : n
                      );
                      onUpdateProject({ ...project, nodes: updatedNodes });
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SINGLE NODE OR CONTAINER INSPECTOR
          ========================================================================= */}
      {selectedNode && selectedIds.length <= 1 && (
        <div className="drafo-inspector-group">
          <div className="drafo-inspector-header">
            <div className="drafo-inspector-title">
              {isContainerSelected ? <Layers size={15} /> : <Box size={15} />}
              <span>{isContainerSelected ? 'Container Properties' : 'Node Properties'}</span>
            </div>
            <div className="drafo-inspector-actions">
              {isContainerSelected && onUngroupSelected && (
                <button
                  className="drafo-icon-btn"
                  onClick={onUngroupSelected}
                  title="Ungroup / Dissolve Container"
                >
                  <Ungroup size={14} />
                </button>
              )}
              <button
                className={`drafo-icon-btn ${selectedNode.isLocked ? 'active' : ''}`}
                onClick={() => updateNodeProps({ isLocked: !selectedNode.isLocked })}
                title={selectedNode.isLocked ? 'Unlock Element' : 'Lock Element'}
              >
                {selectedNode.isLocked ? <Lock size={13} color="#2563EB" /> : <Unlock size={13} />}
              </button>
              <button
                className="drafo-icon-btn"
                onClick={onDuplicateSelected}
                title="Duplicate (Ctrl+D)"
              >
                <Copy size={13} />
              </button>
              <button
                className="drafo-icon-btn delete-btn"
                onClick={onDeleteSelected}
                title="Delete (Del)"
              >
                <Trash2 size={13} />
              </button>
              {onToggleCollapse && (
                <button
                  className="drafo-icon-btn"
                  onClick={onToggleCollapse}
                  title="Collapse Inspector"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Node Shape / Type Selector */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Component Type</label>
            <CustomSelect<NodeType>
              value={selectedNode.type}
              options={COMPONENT_TYPE_OPTIONS}
              searchable
              onChange={(val) => updateNodeProps({ type: val })}
            />
          </div>

          {/* Node Text & Titles */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">
              {isContainerSelected ? 'Container Name' : 'Primary Title'}
            </label>
            <input
              type="text"
              className="drafo-input"
              value={selectedNode.title}
              onChange={(e) => updateNodeProps({ title: e.target.value })}
            />
          </div>

          <div className="drafo-form-field">
            <label className="drafo-field-label">
              {isContainerSelected ? 'Zone / CIDR Tag' : 'Subtitle / Route (Path)'}
            </label>
            <input
              type="text"
              className="drafo-input"
              value={selectedNode.subtitle || ''}
              onChange={(e) => updateNodeProps({ subtitle: e.target.value })}
              placeholder={isContainerSelected ? 'e.g. 10.0.0.0/16 or us-east-1' : 'e.g. /api/auth/callback'}
            />
          </div>

          {!isContainerSelected && (
            <div className="drafo-form-field">
              <label className="drafo-field-label">Status & Health</label>
              <CustomSelect<NodeStatus>
                value={selectedNode.status || 'online'}
                options={STATUS_OPTIONS}
                onChange={(val) => updateNodeProps({ status: val })}
              />
            </div>
          )}

          {/* Node Tags */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Component Tags (comma separated)</label>
            <input
              type="text"
              className="drafo-input"
              value={(selectedNode.tags || []).join(', ')}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map((t) => t.trim().replace(/^#/, ''))
                  .filter(Boolean);
                updateNodeProps({ tags });
              }}
              placeholder="e.g. frontend, auth, edge"
            />
          </div>

          {/* Custom Node Data Inspector */}
          {selectedNode.type === 'browser' && (
            <div className="drafo-form-field">
              <label className="drafo-field-label">Browser URL Address</label>
              <input
                type="text"
                className="drafo-input"
                value={selectedNode.customData?.urlBarText || ''}
                onChange={(e) =>
                  updateNodeProps({
                    customData: { ...selectedNode.customData, urlBarText: e.target.value }
                  })
                }
                placeholder="https://app.example.com"
              />
            </div>
          )}

          {selectedNode.type === 'terminal' && (
            <div className="drafo-form-field">
              <label className="drafo-field-label">Terminal Command Prompt</label>
              <input
                type="text"
                className="drafo-input"
                value={selectedNode.customData?.terminalCommand || ''}
                onChange={(e) =>
                  updateNodeProps({
                    customData: { ...selectedNode.customData, terminalCommand: e.target.value }
                  })
                }
                placeholder="pnpm dev --turbo"
              />
            </div>
          )}

          {selectedNode.type === 'mobile' && (
            <div className="drafo-form-field">
              <label className="drafo-field-label">Mobile Device Shell</label>
              <CustomSelect<'iphone' | 'android' | 'tablet'>
                value={selectedNode.customData?.deviceType || 'iphone'}
                options={DEVICE_OPTIONS}
                onChange={(val) =>
                  updateNodeProps({
                    customData: {
                      ...selectedNode.customData,
                      deviceType: val
                    }
                  })
                }
              />
            </div>
          )}

          {/* Layering & Z-Index Controls */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Layer Position</label>
            <div className="drafo-segmented-control">
              <button
                className="drafo-segment-btn"
                onClick={bringToFront}
                title="Bring to Front"
              >
                <ArrowUp size={12} style={{ display: 'inline', marginRight: 4 }} />
                To Front
              </button>
              <button
                className="drafo-segment-btn"
                onClick={sendToBack}
                title="Send to Back"
              >
                <ArrowDown size={12} style={{ display: 'inline', marginRight: 4 }} />
                To Back
              </button>
            </div>
          </div>

          {/* Dimensions */}
          <div className="drafo-form-row">
            <div className="drafo-form-field half">
              <label className="drafo-field-label">Width (px)</label>
              <input
                type="number"
                className="drafo-input"
                value={selectedNode.width}
                onChange={(e) => updateNodeProps({ width: Math.max(60, Number(e.target.value)) })}
              />
            </div>
            <div className="drafo-form-field half">
              <label className="drafo-field-label">Height (px)</label>
              <input
                type="number"
                className="drafo-input"
                value={selectedNode.height}
                onChange={(e) => updateNodeProps({ height: Math.max(40, Number(e.target.value)) })}
              />
            </div>
          </div>

          {/* =========================================================================
              UNIFIED STYLE & APPEARANCE (TEMPLATES, ACCENTS, BACKGROUND, STROKE)
              ========================================================================= */}
          <div className="drafo-form-field">
            <div className="drafo-style-section-card">
              {/* Card Header: Pure Title */}
              <div className="drafo-style-card-header">
                <div className="drafo-style-card-title">
                  <Palette size={13} color="#2563EB" />
                  <span>Style & Appearance</span>
                </div>
              </div>

              {/* 1. Theme / Preset Selector */}
              <div className="drafo-style-subgroup">
                <div className="drafo-style-subgroup-header">
                  <span className="drafo-style-sublabel">Theme / Preset</span>
                  {!isSavingTemplate && (
                    <button
                      type="button"
                      className="drafo-save-template-pill"
                      onClick={() => setIsSavingTemplate(true)}
                      title="Save current styling as a reusable template"
                    >
                      <BookmarkPlus size={11} />
                      <span>+ Save Preset</span>
                    </button>
                  )}
                </div>

                {/* Inline Save Template Form */}
                {isSavingTemplate && (
                  <div className="drafo-save-template-dialog">
                    <input
                      type="text"
                      className="drafo-save-template-input"
                      placeholder="Template name (e.g. Neon Cyber)"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomTemplate();
                        if (e.key === 'Escape') setIsSavingTemplate(false);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="drafo-save-template-confirm"
                      onClick={handleSaveCustomTemplate}
                      disabled={!newTemplateName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="drafo-save-template-cancel"
                      onClick={() => {
                        setIsSavingTemplate(false);
                        setNewTemplateName('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <CustomSelect
                  value={
                    allStyleTemplates.find(
                      (t) =>
                        t.bg === (selectedNode.style.bg || 'auto') &&
                        t.accentColor.toLowerCase() === (selectedNode.style.accentColor || '#2563EB').toLowerCase()
                    )?.id || ''
                  }
                  onChange={(val) => applyStyleTemplate(val)}
                  options={templateOptions}
                  placeholder={
                    selectedNode.style.accentColor || selectedNode.style.bg
                      ? "Custom Style (Pick to change)"
                      : "Choose a theme preset..."
                  }
                />
              </div>

              {/* 2. Accent Color & Tint */}
              <div className="drafo-style-subgroup">
                <div className="drafo-style-subgroup-header">
                  <span className="drafo-style-sublabel">Accent & Tone</span>
                  {selectedNode.style.accentColor && (
                    <button
                      type="button"
                      className="drafo-reset-accent-btn"
                      onClick={() => updateNodeStyle({ accentColor: undefined, tint: 'none', borderColor: undefined })}
                      title="Reset to component default accent"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Custom Hex Color Picker Pill (Row 1) */}
                <div className="drafo-color-control-row">
                  <label className="drafo-color-picker-pill" style={{ width: '100%', justifyContent: 'space-between' }} title="Click to choose custom accent hex">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        className="drafo-color-pill-dot"
                        style={{ backgroundColor: selectedNode.style.accentColor || '#2563EB' }}
                      />
                      <span className="drafo-color-pill-text">
                        {selectedNode.style.accentColor || '#2563EB'}
                      </span>
                    </div>
                    <Pipette size={12} color="#64748B" />
                    <input
                      type="color"
                      value={selectedNode.style.accentColor || '#2563EB'}
                      onChange={(e) =>
                        updateNodeStyle({
                          accentColor: e.target.value,
                          borderColor: e.target.value,
                          tint: selectedNode.style.tint || 'subtle'
                        })
                      }
                      className="drafo-color-native-hidden"
                    />
                  </label>
                </div>

                {/* 8 Curated Designer Dots (Row 2: Full Width) */}
                <div className="drafo-curated-dots-bar">
                  {[
                    { hex: '#2563EB', name: 'Cobalt Blue' },
                    { hex: '#0284C7', name: 'Cyan Sky' },
                    { hex: '#10B981', name: 'Emerald' },
                    { hex: '#8B5CF6', name: 'Violet' },
                    { hex: '#F59E0B', name: 'Amber' },
                    { hex: '#F43F5E', name: 'Rose' },
                    { hex: '#475569', name: 'Slate' },
                    { hex: '#0F172A', name: 'Obsidian' }
                  ].map((dot) => {
                    const currentAccent = (selectedNode.style.accentColor || '#2563EB').toLowerCase();
                    const isActive = currentAccent === dot.hex.toLowerCase() || (dot.hex === '#0284C7' && currentAccent === '#38bdf8');
                    return (
                      <button
                        key={dot.hex}
                        type="button"
                        className={`drafo-quick-dot-btn ${isActive ? 'active' : ''}`}
                        style={{ backgroundColor: dot.hex }}
                        onClick={() =>
                          updateNodeStyle({
                            accentColor: dot.hex,
                            borderColor: dot.hex,
                            tint: selectedNode.style.tint || 'subtle'
                          })
                        }
                        title={`${dot.name} (${dot.hex})`}
                      >
                        {isActive && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                {/* Surface Tint Switcher (Row 3) */}
                <div style={{ marginTop: 2 }}>
                  <div className="drafo-segmented-control">
                    {(['none', 'subtle', 'medium', 'strong'] as const).map((t) => {
                      const currentTint = selectedNode.style.tint || (selectedNode.style.accentColor ? 'subtle' : 'none');
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`drafo-segment-btn ${currentTint === t ? 'active' : ''}`}
                          onClick={() => updateNodeStyle({ tint: t })}
                        >
                          {t === 'none' ? 'Clean' : t === 'subtle' ? 'Subtle' : t === 'medium' ? 'Medium' : 'Bold'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Card Background Fill */}
              <div className="drafo-style-subgroup">
                <div className="drafo-style-subgroup-header">
                  <span className="drafo-style-sublabel">Background Fill</span>
                  {selectedNode.style.bg && selectedNode.style.bg !== 'auto' && (
                    <button
                      type="button"
                      className="drafo-reset-accent-btn"
                      onClick={() => updateNodeStyle({ bg: 'auto' })}
                      title="Reset to Auto Tint"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>

                {/* Custom Hex Color Picker Pill (Row 1) */}
                <div className="drafo-color-control-row">
                  <label className="drafo-color-picker-pill" style={{ width: '100%', justifyContent: 'space-between' }} title="Click to choose custom background hex">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        className="drafo-color-pill-dot"
                        style={{
                          backgroundColor:
                            !selectedNode.style.bg || selectedNode.style.bg === 'auto'
                              ? '#F8FAFC'
                              : selectedNode.style.bg === 'transparent'
                              ? 'transparent'
                              : selectedNode.style.bg,
                          border: '1px solid #CBD5E1'
                        }}
                      />
                      <span className="drafo-color-pill-text">
                        {!selectedNode.style.bg || selectedNode.style.bg === 'auto'
                          ? 'Auto Tint'
                          : selectedNode.style.bg === 'transparent'
                          ? 'Transparent / Clear'
                          : selectedNode.style.bg}
                      </span>
                    </div>
                    <Pipette size={12} color="#64748B" />
                    <input
                      type="color"
                      value={
                        selectedNode.style.bg && selectedNode.style.bg.startsWith('#')
                          ? selectedNode.style.bg
                          : '#FFFFFF'
                      }
                      onChange={(e) => updateNodeStyle({ bg: e.target.value })}
                      className="drafo-color-native-hidden"
                    />
                  </label>
                </div>

                {/* 4 Essential Quick Shortcuts (Row 2: 4 equal 25% columns) */}
                <div className="drafo-bg-shortcuts-grid">
                  {[
                    { label: 'Auto', value: 'auto' },
                    { label: 'White', value: '#FFFFFF' },
                    { label: 'Dark', value: '#0F172A' },
                    { label: 'Clear', value: 'transparent' }
                  ].map((sc) => {
                    const currentBg = selectedNode.style.bg || 'auto';
                    const isActive = currentBg.toLowerCase() === sc.value.toLowerCase();
                    return (
                      <button
                        key={sc.value}
                        type="button"
                        className={`drafo-bg-shortcut-btn ${isActive ? 'active' : ''}`}
                        onClick={() => updateNodeStyle({ bg: sc.value })}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Border Stroke */}
              <div className="drafo-style-subgroup">
                <span className="drafo-style-sublabel">Border Stroke</span>
                <div className="drafo-segmented-control">
                  {(['solid', 'dashed', 'dotted'] as LineStyle[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`drafo-segment-btn ${
                        (selectedNode.style.borderStyle || (isContainerSelected ? 'dashed' : 'solid')) === s
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => updateNodeStyle({ borderStyle: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDGE / CONNECTOR INSPECTOR
          ========================================================================= */}
      {selectedEdge && (
        <div className="drafo-inspector-group">
          <div className="drafo-inspector-header">
            <div className="drafo-inspector-title">
              <CornerDownRight size={15} />
              <span>Connector Settings</span>
            </div>
            <div className="drafo-inspector-actions">
              <button
                className="drafo-icon-btn delete-btn"
                onClick={onDeleteSelected}
                title="Delete Edge (Del)"
              >
                <Trash2 size={13} />
              </button>
              {onToggleCollapse && (
                <button
                  className="drafo-icon-btn"
                  onClick={onToggleCollapse}
                  title="Collapse Inspector"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Edge Label */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Connector Label</label>
            <input
              type="text"
              className="drafo-input"
              value={selectedEdge.label || ''}
              onChange={(e) => updateEdgeProps({ label: e.target.value })}
              placeholder="e.g. GET /api/v1/auth"
            />
          </div>

          {/* Step Number / Sequence Indicator */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Step Number / Badge</label>
            <input
              type="text"
              className="drafo-input"
              value={selectedEdge.stepNumber || ''}
              onChange={(e) => updateEdgeProps({ stepNumber: e.target.value })}
              placeholder="e.g. 1 or A"
            />
          </div>

          {/* Edge Route Type */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Routing Geometry</label>
            <div className="drafo-segmented-control">
              {(['curved', 'orthogonal', 'straight'] as RouteType[]).map((r) => (
                <button
                  key={r}
                  className={`drafo-segment-btn ${selectedEdge.routeType === r ? 'active' : ''}`}
                  onClick={() => updateEdgeProps({ routeType: r })}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Edge Line Style */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Line Style</label>
            <div className="drafo-segmented-control">
              {(['solid', 'dashed', 'dotted'] as LineStyle[]).map((s) => (
                <button
                  key={s}
                  className={`drafo-segment-btn ${selectedEdge.lineStyle === s ? 'active' : ''}`}
                  onClick={() => updateEdgeProps({ lineStyle: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Arrowhead Tip Style */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Arrowhead Tip</label>
            <div className="drafo-segmented-control">
              {(['arrow', 'open', 'circle', 'none'] as ArrowheadType[]).map((a) => (
                <button
                  key={a}
                  className={`drafo-segment-btn ${(selectedEdge.arrowhead || 'arrow') === a ? 'active' : ''}`}
                  onClick={() => updateEdgeProps({ arrowhead: a })}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Edge Flow & Bidirectional Toggles */}
          <div className="drafo-form-field" style={{ display: 'flex', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedEdge.bidirectional || false}
                onChange={(e) => updateEdgeProps({ bidirectional: e.target.checked })}
              />
              <span>Bidirectional</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedEdge.isAnimated || false}
                onChange={(e) => updateEdgeProps({ isAnimated: e.target.checked })}
              />
              <span>Animated Flow</span>
            </label>
          </div>

          {/* Latency / SLA */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Latency / Response Time (optional)</label>
            <input
              type="text"
              className="drafo-input"
              value={selectedEdge.latency || ''}
              onChange={(e) => updateEdgeProps({ latency: e.target.value })}
              placeholder="e.g. 15ms or 120ms"
            />
          </div>

          {/* Edge Color */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Connector Color</label>
            <div className="drafo-color-presets-grid">
              {['#000000', '#2563EB', '#16A34A', '#D97706', '#9333EA', '#DC2626', '#64748B'].map(
                (color) => (
                  <div
                    key={color}
                    className={`drafo-color-swatch ${selectedEdge.color === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateEdgeProps({ color })}
                  />
                )
              )}
            </div>
          </div>

          {/* Line Width */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Stroke Thickness ({selectedEdge.width}px)</label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              className="drafo-slider"
              value={selectedEdge.width}
              onChange={(e) => updateEdgeProps({ width: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION HEADER INSPECTOR
          ========================================================================= */}
      {selectedSection && (
        <div className="drafo-inspector-group">
          <div className="drafo-inspector-header">
            <div className="drafo-inspector-title">
              <Compass size={15} />
              <span>Layer Header</span>
            </div>
            <div className="drafo-inspector-actions">
              <button
                className="drafo-icon-btn delete-btn"
                onClick={onDeleteSelected}
                title="Delete Layer Header"
              >
                <Trash2 size={13} />
              </button>
              {onToggleCollapse && (
                <button
                  className="drafo-icon-btn"
                  onClick={onToggleCollapse}
                  title="Collapse Inspector"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="drafo-form-field">
            <label className="drafo-field-label">Section Title</label>
            <input
              type="text"
              className="drafo-input"
              value={selectedSection.title}
              onChange={(e) => updateSectionProps({ title: e.target.value })}
            />
          </div>

          <div className="drafo-form-field">
            <label className="drafo-field-label">Layer Color</label>
            <div className="drafo-color-presets-grid">
              {['#2563EB', '#16A34A', '#D97706', '#9333EA', '#DC2626', '#64748B'].map((color) => (
                <div
                  key={color}
                  className={`drafo-color-swatch ${selectedSection.color === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateSectionProps({ color, pillBorderColor: color })}
                />
              ))}
            </div>
          </div>

          <div className="drafo-form-field">
            <label className="drafo-toggle-label">
              <input
                type="checkbox"
                checked={selectedSection.hasDivider}
                onChange={(e) => updateSectionProps({ hasDivider: e.target.checked })}
              />
              <span>Show Horizontal Divider Line</span>
            </label>
          </div>
        </div>
      )}

      {/* =========================================================================
          CANVAS & GENERAL SETTINGS (DEFAULT VIEW)
          ========================================================================= */}
      {!selectedNode && !selectedEdge && !selectedSection && selectedIds.length <= 1 && (
        <div className="drafo-inspector-group">
          <div className="drafo-inspector-header">
            <div className="drafo-inspector-title">
              <Settings size={15} />
              <span>Diagram Settings</span>
            </div>
            {onToggleCollapse && (
              <button
                className="drafo-icon-btn"
                onClick={onToggleCollapse}
                title="Collapse Inspector"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Project Name */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Project Title</label>
            <input
              type="text"
              className="drafo-input"
              value={project.name}
              onChange={(e) => onUpdateProject({ ...project, name: e.target.value })}
            />
          </div>

          {/* Canvas Theme */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Canvas Theme</label>
            <div className="drafo-segmented-control">
              {(['light', 'dark', 'slate'] as const).map((t) => (
                <button
                  key={t}
                  className={`drafo-segment-btn ${project.canvasSettings.theme === t ? 'active' : ''}`}
                  onClick={() => updateCanvasSettings({ theme: t })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Background Style */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Canvas Grid</label>
            <div className="drafo-segmented-control">
              {(['dots', 'lines', 'none'] as const).map((type) => (
                <button
                  key={type}
                  className={`drafo-segment-btn ${project.canvasSettings.gridType === type ? 'active' : ''}`}
                  onClick={() => updateCanvasSettings({ gridType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Snap to Grid */}
          <div className="drafo-form-field">
            <label className="drafo-toggle-label">
              <input
                type="checkbox"
                checked={project.canvasSettings.snapToGrid}
                onChange={(e) => updateCanvasSettings({ snapToGrid: e.target.checked })}
              />
              <span>Snap Elements to Grid</span>
            </label>
          </div>

          {/* Grid Size */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Grid Spacing (px)</label>
            <input
              type="number"
              className="drafo-input"
              value={project.canvasSettings.gridSize}
              onChange={(e) =>
                updateCanvasSettings({ gridSize: Math.max(10, Number(e.target.value)) })
              }
            />
          </div>

          {/* Diagram Summary */}
          <div className="drafo-diagram-stats-box">
            <div className="drafo-stat-item">
              <span className="stat-count">{project.nodes.length}</span>
              <span className="stat-label">Components</span>
            </div>
            <div className="drafo-stat-item">
              <span className="stat-count">{project.edges.length}</span>
              <span className="stat-label">Connectors</span>
            </div>
            <div className="drafo-stat-item">
              <span className="stat-count">{project.sections.length}</span>
              <span className="stat-label">Layers</span>
            </div>
          </div>

          <div className="drafo-hint-box">
            <span>💡 Tip: Drag an area on the canvas to multi-select nodes, or press Ctrl+G to group them into a container.</span>
          </div>
        </div>
      )}
    </aside>
  );
};
