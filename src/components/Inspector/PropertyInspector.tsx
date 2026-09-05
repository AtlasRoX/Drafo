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
  PortPosition
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
  ArrowLeftRight,
  Move,
  RotateCcw,
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
  BookmarkPlus,
  Wand2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Type
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../UI/CustomSelect';
import {
  DEFAULT_STYLE_TEMPLATES,
  StyleTemplate,
  loadCustomTemplates
} from '../../data/styleTemplates';
import { isColorDark } from '../../utils/colorUtils';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_PRESETS,
  TEXT_HIGHLIGHT_PALETTE
} from '../../utils/typography';
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
  { value: 'sql-table', label: 'SQL Database Table', sublabel: 'Relational table with columns & PK/FK', icon: <Database size={14} color="#7C3AED" /> },
  { value: 'uml-class', label: 'UML Class Model', sublabel: 'Object class with members & methods', icon: <Box size={14} color="#4F46E5" /> },
  { value: 'json-viewer', label: 'JSON Data Viewer', sublabel: 'Interactive JSON payload card', icon: <Box size={14} color="#10B981" /> },
  { value: 'type-schema', label: 'TypeScript / Schema', sublabel: 'Data contract & type properties', icon: <Box size={14} color="#0284C7" /> },
  { value: 'decision', label: 'Decision Diamond', sublabel: 'Conditional branch diamond', icon: <GitFork size={14} color="#D97706" /> },
  { value: 'note', label: 'Sticky Note', sublabel: 'Annotation sticky documentation', icon: <StickyNote size={14} color="#F59E0B" /> },
  { value: 'text', label: 'Text Annotation', sublabel: 'Free-form canvas text label', icon: <Type size={14} color="#334155" /> }
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
  activeTab?: 'inspector' | 'ai';
  onTabChange?: (tab: 'inspector' | 'ai') => void;
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
  activeTab = 'inspector',
  onTabChange,
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
  const edgeSourceNode = selectedEdge ? project.nodes.find((n) => n.id === selectedEdge.fromNodeId) : null;
  const edgeTargetNode = selectedEdge ? project.nodes.find((n) => n.id === selectedEdge.toNodeId) : null;

  const isContainerSelected =
    selectedNode && (selectedNode.type === 'container' || selectedNode.type === 'group');

  // Style templates state
  const [customTemplates, setCustomTemplates] = useState<StyleTemplate[]>([]);

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
          width: 18,
          height: 18,
          borderRadius: 5,
          backgroundColor: t.bg === 'transparent' ? '#FFFFFF' : t.bg,
          border: `1.5px solid ${t.borderColor || t.accentColor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          flexShrink: 0
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: t.accentColor,
            boxShadow: '0 0 3px rgba(0,0,0,0.25)'
          }}
        />
      </span>
    )
  }));

  const applyStyleTemplate = (templateId: string) => {
    const template = allStyleTemplates.find((t) => t.id === templateId);
    if (!template || !selectedNode) return;
    const isDark = isColorDark(template.bg === 'transparent' ? '#FFFFFF' : template.bg);
    const resolvedText = template.textColor || (isDark ? '#F8FAFC' : '#0F172A');
    const resolvedSubtext = template.subtextColor || (isDark ? '#94A3B8' : '#64748B');
    updateNodeStyle({
      bg: template.bg,
      accentColor: template.accentColor,
      borderColor: template.borderColor || template.accentColor,
      tint: template.tint || 'subtle',
      textColor: resolvedText,
      subtextColor: resolvedSubtext,
      colorPalette: undefined
    });
  };

  const applyBatchStyleTemplate = (templateId: string) => {
    const template = allStyleTemplates.find((t) => t.id === templateId);
    if (!template || selectedIds.length === 0) return;
    const isDark = isColorDark(template.bg === 'transparent' ? '#FFFFFF' : template.bg);
    const resolvedText = template.textColor || (isDark ? '#F8FAFC' : '#0F172A');
    const resolvedSubtext = template.subtextColor || (isDark ? '#94A3B8' : '#64748B');
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
              textColor: resolvedText,
              subtextColor: resolvedSubtext,
              colorPalette: undefined
            }
          }
        : n
    );
    onUpdateProject({ ...project, nodes: updatedNodes });
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

  const updateNodeCustomData = (updates: Partial<NonNullable<FlowNodeType['customData']>>) => {
    if (!selectedNode) return;
    const updatedNodes = project.nodes.map((n) =>
      n.id === selectedNode.id
        ? {
            ...n,
            customData: {
              ...n.customData,
              ...updates
            }
          }
        : n
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
      {/* Top Dual-Tab Navigation Strip: Properties vs AI Flow */}
      {onTabChange && (
        <div className="drafo-inspector-nav-strip">
          <div className="drafo-inspector-nav-tabs">
            <button
              type="button"
              className={`drafo-inspector-nav-tab ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => onTabChange('inspector')}
            >
              <SlidersHorizontal size={13} />
              <span>Inspector</span>
            </button>
            <button
              type="button"
              className="drafo-inspector-nav-tab ai-tab"
              onClick={() => onTabChange('ai')}
              title="Open AI Flow Studio"
            >
              <Wand2 size={13} />
              <span>AI Studio</span>
              <span className="drafo-ai-tab-glow-pill">AI</span>
            </button>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="drafo-inspector-collapse-strip-btn"
              onClick={onToggleCollapse}
              title="Collapse Inspector"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

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

          {/* Unified Batch Colors & Presets */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <div className="drafo-colors-panel">
              <div className="drafo-colors-panel-header">
                <Palette size={13} color="#2563EB" />
                <span>Batch Colors & Theme</span>
              </div>

              {/* 1. Preset Selector */}
              <div className="drafo-colors-subfield">
                <label className="drafo-field-label">Preset Theme (All)</label>
                <CustomSelect
                  value=""
                  options={templateOptions}
                  placeholder="Apply preset to all selected..."
                  searchable
                  onChange={(val) => {
                    if (val) applyBatchStyleTemplate(val);
                  }}
                />
              </div>

              {/* 2. Direct Batch Color Inputs */}
              <div className="drafo-color-items-list">
                {/* Batch Background */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Background</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick batch background color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1' }}
                      />
                      <input
                        type="color"
                        defaultValue="#FFFFFF"
                        onChange={(e) => {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, bg: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      placeholder="Set Hex"
                      onChange={(e) => {
                        if (e.target.value.startsWith('#') && e.target.value.length >= 4) {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, bg: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Batch Border */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Border</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick batch border color">
                      <span className="drafo-color-chip-preview" style={{ backgroundColor: '#2563EB' }} />
                      <input
                        type="color"
                        defaultValue="#2563EB"
                        onChange={(e) => {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id)
                              ? {
                                  ...n,
                                  style: {
                                    ...n.style,
                                    borderColor: e.target.value,
                                    accentColor: e.target.value
                                  }
                                }
                              : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      placeholder="Set Hex"
                      onChange={(e) => {
                        if (e.target.value.startsWith('#') && e.target.value.length >= 4) {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id)
                              ? {
                                  ...n,
                                  style: {
                                    ...n.style,
                                    borderColor: e.target.value,
                                    accentColor: e.target.value
                                  }
                                }
                              : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Batch Text */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Text</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick batch text color">
                      <span className="drafo-color-chip-preview" style={{ backgroundColor: '#0F172A' }} />
                      <input
                        type="color"
                        defaultValue="#0F172A"
                        onChange={(e) => {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, textColor: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      placeholder="Set Hex"
                      onChange={(e) => {
                        if (e.target.value.startsWith('#') && e.target.value.length >= 4) {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, textColor: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Batch Subtext */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Subtext</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick batch subtext color">
                      <span className="drafo-color-chip-preview" style={{ backgroundColor: '#64748B' }} />
                      <input
                        type="color"
                        defaultValue="#64748B"
                        onChange={(e) => {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, subtextColor: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      placeholder="Set Hex"
                      onChange={(e) => {
                        if (e.target.value.startsWith('#') && e.target.value.length >= 4) {
                          const targetSet = new Set(selectedIds);
                          const updatedNodes = project.nodes.map((n) =>
                            targetSet.has(n.id) ? { ...n, style: { ...n.style, subtextColor: e.target.value } } : n
                          );
                          onUpdateProject({ ...project, nodes: updatedNodes });
                        }
                      }}
                    />
                  </div>
                </div>
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
          {selectedNode.type === 'text' ? (
            <div className="drafo-form-field">
              <label className="drafo-field-label">Text Content</label>
              <textarea
                className="drafo-input"
                style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
                value={selectedNode.title}
                onChange={(e) => updateNodeProps({ title: e.target.value })}
                placeholder="Type text annotation content here..."
              />
            </div>
          ) : (
            <>
              <div className="drafo-form-field">
                <label className="drafo-field-label">
                  {isContainerSelected
                    ? 'Container Name'
                    : selectedNode.type === 'note'
                    ? 'Note Title'
                    : 'Primary Title'}
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
                  {isContainerSelected
                    ? 'Zone / CIDR Tag'
                    : selectedNode.type === 'note'
                    ? 'Note Body'
                    : 'Subtitle / Route (Path)'}
                </label>
                {selectedNode.type === 'note' ? (
                  <textarea
                    className="drafo-input"
                    style={{ minHeight: 68, resize: 'vertical', fontFamily: 'inherit' }}
                    value={selectedNode.subtitle || ''}
                    onChange={(e) => updateNodeProps({ subtitle: e.target.value })}
                    placeholder="Write sticky note details..."
                  />
                ) : (
                  <input
                    type="text"
                    className="drafo-input"
                    value={selectedNode.subtitle || ''}
                    onChange={(e) => updateNodeProps({ subtitle: e.target.value })}
                    placeholder={
                      isContainerSelected ? 'e.g. 10.0.0.0/16 or us-east-1' : 'e.g. /api/auth/callback'
                    }
                  />
                )}
              </div>

              {/* Node Tags */}
              {selectedNode.type !== 'note' && (
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
              )}
            </>
          )}

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
              TYPOGRAPHY & TEXT FORMATTING
              ========================================================================= */}
          <div className="drafo-form-field">
            <div className="drafo-typography-panel">
              <div className="drafo-typography-panel-header">
                <Type size={13} color="#2563EB" />
                <span>Typography & Formatting</span>
                {selectedNode.type === 'text' && (
                  <span className="drafo-badge-pill" style={{ marginLeft: 'auto', fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: 4 }}>Text Node</span>
                )}
              </div>

              {/* 1. Font Family Selector */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Font Family</label>
                <CustomSelect<string>
                  value={selectedNode.customData?.fontFamily || 'sans'}
                  options={FONT_FAMILY_OPTIONS}
                  onChange={(val) => updateNodeCustomData({ fontFamily: val as any })}
                  placeholder="Select Font..."
                />
              </div>

              {/* 2. Font Size Stepper & Quick Presets */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Font Size</label>
                <div className="drafo-font-size-stepper-row">
                  <button
                    type="button"
                    className="drafo-font-stepper-btn"
                    onClick={() => {
                      const cur = Number(selectedNode.customData?.fontSize || 14);
                      updateNodeCustomData({ fontSize: Math.max(8, cur - 1) });
                    }}
                    title="Decrease font size"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={selectedNode.customData?.fontSize || 14}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        updateNodeCustomData({ fontSize: Math.min(120, Math.max(8, val)) });
                      }
                    }}
                    className="drafo-font-size-input"
                  />
                  <span className="drafo-font-size-unit">px</span>
                  <button
                    type="button"
                    className="drafo-font-stepper-btn"
                    onClick={() => {
                      const cur = Number(selectedNode.customData?.fontSize || 14);
                      updateNodeCustomData({ fontSize: Math.min(120, cur + 1) });
                    }}
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>
                {/* Quick Size Preset Chips */}
                <div className="drafo-font-presets-row">
                  {FONT_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`drafo-font-preset-chip ${(selectedNode.customData?.fontSize || 14) === preset ? 'active' : ''}`}
                      onClick={() => updateNodeCustomData({ fontSize: preset })}
                      title={`${preset}px`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Text Style & Decoration (Bold, Italic, Underline, Strikethrough) */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Style & Decoration</label>
                <div className="drafo-segmented-control">
                  <button
                    type="button"
                    className={`drafo-segment-btn ${
                      selectedNode.customData?.fontWeight === 'bold' ||
                      selectedNode.customData?.fontWeight === 700 ||
                      selectedNode.customData?.fontWeight === 600
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => {
                      const isBold =
                        selectedNode.customData?.fontWeight === 'bold' ||
                        selectedNode.customData?.fontWeight === 700 ||
                        selectedNode.customData?.fontWeight === 600;
                      updateNodeCustomData({ fontWeight: isBold ? 400 : 'bold' });
                    }}
                    title="Toggle Bold (Ctrl+B)"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${selectedNode.customData?.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={() => {
                      const isItalic = selectedNode.customData?.fontStyle === 'italic';
                      updateNodeCustomData({ fontStyle: isItalic ? 'normal' : 'italic' });
                    }}
                    title="Toggle Italic (Ctrl+I)"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${selectedNode.customData?.textDecoration === 'underline' ? 'active' : ''}`}
                    onClick={() => {
                      const isUnderline = selectedNode.customData?.textDecoration === 'underline';
                      updateNodeCustomData({ textDecoration: isUnderline ? 'none' : 'underline' });
                    }}
                    title="Toggle Underline (Ctrl+U)"
                  >
                    <Underline size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${selectedNode.customData?.textDecoration === 'line-through' ? 'active' : ''}`}
                    onClick={() => {
                      const isStrike = selectedNode.customData?.textDecoration === 'line-through';
                      updateNodeCustomData({ textDecoration: isStrike ? 'none' : 'line-through' });
                    }}
                    title="Toggle Strikethrough"
                  >
                    <Strikethrough size={13} />
                  </button>
                </div>
              </div>

              {/* 4. Text Alignment (Left, Center, Right, Justify) */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Alignment</label>
                <div className="drafo-segmented-control">
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textAlign || 'left') === 'left' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textAlign: 'left' })}
                    title="Align Left"
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textAlign || 'left') === 'center' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textAlign: 'center' })}
                    title="Align Center"
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textAlign || 'left') === 'right' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textAlign: 'right' })}
                    title="Align Right"
                  >
                    <AlignRight size={13} />
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textAlign || 'left') === 'justify' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textAlign: 'justify' })}
                    title="Justify"
                  >
                    <AlignJustify size={13} />
                  </button>
                </div>
              </div>

              {/* 5. Text Transformation (Case) */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Text Case</label>
                <div className="drafo-segmented-control">
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textTransform || 'none') === 'none' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textTransform: 'none' })}
                    title="Normal Case"
                    style={{ fontSize: 11, fontWeight: 500 }}
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textTransform || 'none') === 'uppercase' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textTransform: 'uppercase' })}
                    title="UPPERCASE"
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    AA
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textTransform || 'none') === 'lowercase' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textTransform: 'lowercase' })}
                    title="lowercase"
                    style={{ fontSize: 11 }}
                  >
                    aa
                  </button>
                  <button
                    type="button"
                    className={`drafo-segment-btn ${(selectedNode.customData?.textTransform || 'none') === 'capitalize' ? 'active' : ''}`}
                    onClick={() => updateNodeCustomData({ textTransform: 'capitalize' })}
                    title="Capitalize"
                    style={{ fontSize: 11, textTransform: 'capitalize' }}
                  >
                    Ab
                  </button>
                </div>
              </div>

              {/* 6. Text Color & Highlight Marker */}
              <div className="drafo-typography-subfield">
                <label className="drafo-field-label">Text Color</label>
                <div className="drafo-color-item-row">
                  <div className="drafo-color-item-picker-box" style={{ width: '100%' }}>
                    <label className="drafo-color-chip-btn" title="Pick text color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{
                          backgroundColor: selectedNode.style.textColor || '#0F172A',
                          border: '1px solid #CBD5E1'
                        }}
                      />
                      <input
                        type="color"
                        value={
                          selectedNode.style.textColor && selectedNode.style.textColor.startsWith('#')
                            ? selectedNode.style.textColor
                            : '#0F172A'
                        }
                        onChange={(e) => {
                          updateNodeStyle({ textColor: e.target.value });
                        }}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-input"
                      value={selectedNode.style.textColor || '#0F172A'}
                      onChange={(e) => {
                        updateNodeStyle({ textColor: e.target.value });
                      }}
                      placeholder="#0F172A"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Highlight Marker Color */}
              <div className="drafo-typography-subfield">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="drafo-field-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Highlighter size={12} color="#EAB308" />
                    Highlighter Marker
                  </label>
                  {selectedNode.customData?.textHighlight && selectedNode.customData.textHighlight !== 'transparent' && (
                    <button
                      type="button"
                      style={{ fontSize: 11, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => updateNodeCustomData({ textHighlight: 'transparent' })}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="drafo-highlight-swatches-row">
                  {TEXT_HIGHLIGHT_PALETTE.map((hp) => {
                    const isSelected = (selectedNode.customData?.textHighlight || 'transparent').toLowerCase() === hp.color.toLowerCase();
                    return (
                      <button
                        key={hp.name}
                        type="button"
                        className={`drafo-highlight-chip ${isSelected ? 'active' : ''}`}
                        style={{
                          backgroundColor: hp.color === 'transparent' ? '#FFFFFF' : hp.color,
                          borderColor: isSelected ? '#2563EB' : '#CBD5E1'
                        }}
                        onClick={() => updateNodeCustomData({ textHighlight: hp.color })}
                        title={hp.label}
                      >
                        {hp.color === 'transparent' && <span style={{ fontSize: 10, color: '#94A3B8' }}>None</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              COLORS & THEMES (PRESET + CUSTOM COLOR SELECTION)
              ========================================================================= */}
          <div className="drafo-form-field">
            <div className="drafo-colors-panel">
              <div className="drafo-colors-panel-header">
                <Palette size={13} color="#2563EB" />
                <span>Colors & Theme</span>
              </div>

              {/* 1. Preset Selector */}
              <div className="drafo-colors-subfield">
                <label className="drafo-field-label">Preset Theme</label>
                <CustomSelect
                  value={
                    allStyleTemplates.find(
                      (t) =>
                        t.bg.toLowerCase() === (selectedNode.style.bg || 'auto').toLowerCase() &&
                        t.accentColor.toLowerCase() === (selectedNode.style.accentColor || '#2563EB').toLowerCase()
                    )?.id || ''
                  }
                  onChange={(val) => applyStyleTemplate(val)}
                  options={templateOptions}
                  placeholder="Custom Colors (Select preset...)"
                  searchable
                />
              </div>

              {/* 2. Direct Custom Color Inputs */}
              <div className="drafo-color-items-list">
                {/* Background Color */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Background</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick background color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{
                          backgroundColor:
                            selectedNode.style.bg === 'transparent'
                              ? 'transparent'
                              : selectedNode.style.bg && selectedNode.style.bg !== 'auto'
                              ? selectedNode.style.bg
                              : '#FFFFFF',
                          border: '1px solid #CBD5E1'
                        }}
                      />
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
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      value={selectedNode.style.bg || '#FFFFFF'}
                      onChange={(e) => updateNodeStyle({ bg: e.target.value })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                {/* Border & Accent Color */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Border</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick border color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{
                          backgroundColor:
                            selectedNode.style.borderColor || selectedNode.style.accentColor || '#2563EB'
                        }}
                      />
                      <input
                        type="color"
                        value={
                          selectedNode.style.borderColor && selectedNode.style.borderColor.startsWith('#')
                            ? selectedNode.style.borderColor
                            : selectedNode.style.accentColor && selectedNode.style.accentColor.startsWith('#')
                            ? selectedNode.style.accentColor
                            : '#2563EB'
                        }
                        onChange={(e) =>
                          updateNodeStyle({ borderColor: e.target.value, accentColor: e.target.value })
                        }
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      value={selectedNode.style.borderColor || selectedNode.style.accentColor || '#2563EB'}
                      onChange={(e) =>
                        updateNodeStyle({ borderColor: e.target.value, accentColor: e.target.value })
                      }
                      placeholder="#2563EB"
                    />
                  </div>
                </div>

                {/* Title / Primary Text Color */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Text</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick text color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{
                          backgroundColor:
                            selectedNode.style.textColor || (isColorDark(selectedNode.style.bg || '#FFFFFF') ? '#F8FAFC' : '#0F172A')
                        }}
                      />
                      <input
                        type="color"
                        value={
                          selectedNode.style.textColor && selectedNode.style.textColor.startsWith('#')
                            ? selectedNode.style.textColor
                            : isColorDark(selectedNode.style.bg || '#FFFFFF')
                            ? '#F8FAFC'
                            : '#0F172A'
                        }
                        onChange={(e) => updateNodeStyle({ textColor: e.target.value })}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      value={
                        selectedNode.style.textColor ||
                        (isColorDark(selectedNode.style.bg || '#FFFFFF') ? '#F8FAFC' : '#0F172A')
                      }
                      onChange={(e) => updateNodeStyle({ textColor: e.target.value })}
                      placeholder="#0F172A"
                    />
                  </div>
                </div>

                {/* Subtitle / Details Color */}
                <div className="drafo-color-item-row">
                  <span className="drafo-color-item-label">Subtext</span>
                  <div className="drafo-color-item-picker-box">
                    <label className="drafo-color-chip-btn" title="Pick subtext color">
                      <span
                        className="drafo-color-chip-preview"
                        style={{
                          backgroundColor:
                            selectedNode.style.subtextColor || (isColorDark(selectedNode.style.bg || '#FFFFFF') ? '#94A3B8' : '#64748B')
                        }}
                      />
                      <input
                        type="color"
                        value={
                          selectedNode.style.subtextColor && selectedNode.style.subtextColor.startsWith('#')
                            ? selectedNode.style.subtextColor
                            : isColorDark(selectedNode.style.bg || '#FFFFFF')
                            ? '#94A3B8'
                            : '#64748B'
                        }
                        onChange={(e) => updateNodeStyle({ subtextColor: e.target.value })}
                        className="drafo-color-native-hidden"
                      />
                    </label>
                    <input
                      type="text"
                      className="drafo-color-hex-text-input"
                      value={
                        selectedNode.style.subtextColor ||
                        (isColorDark(selectedNode.style.bg || '#FFFFFF') ? '#94A3B8' : '#64748B')
                      }
                      onChange={(e) => updateNodeStyle({ subtextColor: e.target.value })}
                      placeholder="#64748B"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Border Stroke */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Border Stroke</label>
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

          {/* 1. Line Type (Canva: Straight, Elbow, Curved) */}
          <div className="drafo-form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="drafo-field-label" style={{ marginBottom: 0 }}>Line Type</label>
              {selectedEdge.controlPoint && (
                <button
                  className="canva-reset-btn"
                  onClick={() => updateEdgeProps({ controlPoint: undefined })}
                  title="Reset curve back to automatic path"
                >
                  <RotateCcw size={11} /> Reset curve
                </button>
              )}
            </div>
            <div className="canva-type-selector">
              <button
                className={`canva-type-btn ${selectedEdge.routeType === 'straight' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ routeType: 'straight', controlPoint: undefined })}
                title="Straight direct line"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span>Straight</span>
              </button>
              <button
                className={`canva-type-btn ${selectedEdge.routeType === 'orthogonal' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ routeType: 'orthogonal', controlPoint: undefined })}
                title="Elbow right-angle connector"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20 L4 8 Q4 4 8 4 L20 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span>Elbow</span>
              </button>
              <button
                className={`canva-type-btn ${(selectedEdge.routeType || 'curved') === 'curved' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ routeType: 'curved', controlPoint: undefined })}
                title="Smooth curved connector"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18 C10 18 12 6 20 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span>Curved</span>
              </button>
            </div>
            <div className="canva-tip-banner">
              💡 <strong>Pro Tip:</strong> Drag the handles at the ends to snap to any node port, or drag the center handle to bend the curve.
            </div>
          </div>

          {/* 2. Line Weight & Style (Custom Slider & Dash previews) */}
          <div className="drafo-form-field">
            <div className="canva-weight-header">
              <label className="drafo-field-label" style={{ marginBottom: 0 }}>Line Weight</label>
              <span className="canva-weight-badge">{selectedEdge.width || 1.5} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              className="drafo-slider"
              style={{
                '--slider-pct': `${(((selectedEdge.width || 1.5) - 1) / (8 - 1)) * 100}%`
              } as React.CSSProperties}
              value={selectedEdge.width || 1.5}
              onChange={(e) => updateEdgeProps({ width: Number(e.target.value) })}
            />
          </div>

          {/* 3. Line Pattern / Dash Style */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Line Style</label>
            <div className="canva-style-selector">
              <button
                className={`canva-style-btn ${selectedEdge.lineStyle === 'solid' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ lineStyle: 'solid' })}
                title="Solid line"
              >
                <svg width="100%" height="16" viewBox="0 0 60 16">
                  <line x1="4" y1="8" x2="56" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                className={`canva-style-btn ${selectedEdge.lineStyle === 'dashed' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ lineStyle: 'dashed' })}
                title="Dashed line"
              >
                <svg width="100%" height="16" viewBox="0 0 60 16">
                  <line x1="4" y1="8" x2="56" y2="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6,4" strokeLinecap="round" />
                </svg>
              </button>
              <button
                className={`canva-style-btn ${selectedEdge.lineStyle === 'dotted' ? 'active' : ''}`}
                onClick={() => updateEdgeProps({ lineStyle: 'dotted' })}
                title="Dotted line"
              >
                <svg width="100%" height="16" viewBox="0 0 60 16">
                  <line x1="4" y1="8" x2="56" y2="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* 4. Line Start & End Markers with Swap Button */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Line Start & End</label>
            <div className="canva-markers-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--drafo-text-secondary, #64748B)', marginBottom: 4, fontWeight: 600 }}>Start Tip</div>
                <select
                  className="drafo-input"
                  style={{ height: 32, fontSize: 11, padding: '2px 6px' }}
                  value={selectedEdge.arrowheadStart || (selectedEdge.bidirectional ? selectedEdge.arrowhead : 'none')}
                  onChange={(e) => {
                    const val = e.target.value as ArrowheadType;
                    updateEdgeProps({
                      arrowheadStart: val,
                      bidirectional: val !== 'none' && val === (selectedEdge.arrowhead || 'arrow')
                    });
                  }}
                >
                  <option value="none">— None</option>
                  <option value="arrow">◀ Arrow</option>
                  <option value="open">&lt; Open</option>
                  <option value="circle">● Dot</option>
                </select>
              </div>

              <button
                className="canva-swap-btn"
                title="Swap line ends and direction"
                onClick={() => {
                  updateEdgeProps({
                    fromNodeId: selectedEdge.toNodeId,
                    toNodeId: selectedEdge.fromNodeId,
                    fromPort: selectedEdge.toPort,
                    toPort: selectedEdge.fromPort,
                    arrowhead: selectedEdge.arrowheadStart || 'none',
                    arrowheadStart: selectedEdge.arrowhead || 'arrow'
                  });
                }}
              >
                <ArrowLeftRight size={14} />
              </button>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--drafo-text-secondary, #64748B)', marginBottom: 4, fontWeight: 600 }}>End Tip</div>
                <select
                  className="drafo-input"
                  style={{ height: 32, fontSize: 11, padding: '2px 6px' }}
                  value={selectedEdge.arrowhead || 'arrow'}
                  onChange={(e) => updateEdgeProps({ arrowhead: e.target.value as ArrowheadType })}
                >
                  <option value="none">— None</option>
                  <option value="arrow">▶ Arrow</option>
                  <option value="open">&gt; Open</option>
                  <option value="circle">● Dot</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. Anchor Ports */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Anchor Ports</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--drafo-text-secondary, #64748B)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  From: {edgeSourceNode?.title || 'Source'}
                </div>
                <div className="drafo-segmented-control" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {(['top', 'right', 'bottom', 'left'] as PortPosition[]).map((p) => (
                    <button
                      key={p}
                      className={`drafo-segment-btn ${selectedEdge.fromPort === p ? 'active' : ''}`}
                      onClick={() => updateEdgeProps({ fromPort: p })}
                      title={`From port: ${p}`}
                      style={{ padding: '4px 2px', fontSize: 10, textTransform: 'capitalize' }}
                    >
                      {p.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--drafo-text-secondary, #64748B)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  To: {edgeTargetNode?.title || 'Target'}
                </div>
                <div className="drafo-segmented-control" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {(['top', 'right', 'bottom', 'left'] as PortPosition[]).map((p) => (
                    <button
                      key={p}
                      className={`drafo-segment-btn ${selectedEdge.toPort === p ? 'active' : ''}`}
                      onClick={() => updateEdgeProps({ toPort: p })}
                      title={`To port: ${p}`}
                      style={{ padding: '4px 2px', fontSize: 10, textTransform: 'capitalize' }}
                    >
                      {p.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Line Color */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Line Color</label>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                type="color"
                value={selectedEdge.color || '#000000'}
                onChange={(e) => updateEdgeProps({ color: e.target.value })}
                style={{
                  width: 30,
                  height: 30,
                  padding: 1,
                  border: '1px solid var(--drafo-border, #CBD5E1)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'transparent'
                }}
                title="Pick custom connector color"
              />
              <input
                type="text"
                className="drafo-input"
                value={selectedEdge.color || ''}
                onChange={(e) => updateEdgeProps({ color: e.target.value })}
                placeholder="#2563EB"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
          </div>

          {/* 7. Flow Animation & Latency SLA */}
          <div className="drafo-form-field" style={{ display: 'flex', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedEdge.isAnimated || false}
                onChange={(e) => updateEdgeProps({ isAnimated: e.target.checked })}
              />
              <span>Animated Flow Pulse</span>
            </label>
          </div>

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

          {/* Quick AI Flow Launch Banner */}
          {onTabChange && (
            <div
              className="drafo-inspector-ai-banner"
              onClick={() => onTabChange('ai')}
              title="Open AI Flow Studio"
            >
              <div className="drafo-inspector-ai-banner-icon">
                <Wand2 size={16} />
              </div>
              <div className="drafo-inspector-ai-banner-text">
                <span className="drafo-inspector-ai-banner-title">AI Flow Generator</span>
                <span className="drafo-inspector-ai-banner-sub">Synthesize architecture with prompt</span>
              </div>
              <ChevronRight size={14} className="drafo-inspector-ai-banner-arrow" />
            </div>
          )}

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
