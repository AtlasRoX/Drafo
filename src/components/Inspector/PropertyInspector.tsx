'use client';

import React from 'react';
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
  Paintbrush
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../UI/CustomSelect';
import { isColorDark } from '../../utils/colorUtils';
import './Inspector.css';

// Curated Luxury Accent Color Presets
const ACCENT_COLOR_PRESETS = [
  { name: 'Cobalt Blue', hex: '#2563EB' },
  { name: 'Indigo Brand', hex: '#4F46E5' },
  { name: 'Electric Sky', hex: '#0284C7' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Jade / Mint', hex: '#10B981' },
  { name: 'Amber Gold', hex: '#D97706' },
  { name: 'Sunset Orange', hex: '#EA580C' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Neon Rose', hex: '#E11D48' },
  { name: 'Royal Purple', hex: '#7C3AED' },
  { name: 'Slate Gray', hex: '#475569' },
  { name: 'Dark Onyx', hex: '#0F172A' }
];

// Curated Background Fill Presets (Light, Dark, Pastels, Transparent, and Auto)
const BG_COLOR_PRESETS = [
  { name: 'Auto (Tinted)', value: 'auto', hex: 'transparent', isAuto: true },
  { name: 'Pure White', value: '#FFFFFF', hex: '#FFFFFF' },
  { name: 'Frosted Slate', value: '#F8FAFC', hex: '#F8FAFC' },
  { name: 'Soft Zinc', value: '#F4F4F5', hex: '#F4F4F5' },
  { name: 'Soft Blue', value: '#EFF6FF', hex: '#EFF6FF' },
  { name: 'Soft Emerald', value: '#F0FDF4', hex: '#F0FDF4' },
  { name: 'Soft Purple', value: '#FAF5FF', hex: '#FAF5FF' },
  { name: 'Soft Amber', value: '#FFFBEB', hex: '#FFFBEB' },
  { name: 'Soft Rose', value: '#FFF1F2', hex: '#FFF1F2' },
  { name: 'Dark Obsidian', value: '#0F172A', hex: '#0F172A' },
  { name: 'Midnight Slate', value: '#1E293B', hex: '#1E293B' },
  { name: 'Deep Carbon', value: '#18181B', hex: '#18181B' },
  { name: 'Transparent', value: 'transparent', hex: 'transparent', isTransparent: true }
];

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

          {/* Batch Accent Color & Tint Matrix */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <label className="drafo-field-label">
              <Sparkles size={13} color="#2563EB" />
              <span>Batch Accent Color & Tint</span>
            </label>
            <div className="drafo-accent-swatch-matrix">
              {ACCENT_COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  className="drafo-accent-swatch-pill"
                  onClick={() => {
                    const targetSet = new Set(selectedIds);
                    const updatedNodes = project.nodes.map((n) =>
                      targetSet.has(n.id)
                        ? {
                            ...n,
                            style: {
                              ...n.style,
                              accentColor: p.hex,
                              borderColor: p.hex,
                              tint: n.style.tint || 'subtle'
                            }
                          }
                        : n
                    );
                    onUpdateProject({ ...project, nodes: updatedNodes });
                  }}
                  title={`Apply ${p.name} accent tint to all selected`}
                >
                  <span className="drafo-accent-swatch-circle" style={{ backgroundColor: p.hex }} />
                </button>
              ))}
            </div>
          </div>

          {/* Batch Background Fill Matrix */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="drafo-field-label">
                <Paintbrush size={13} color="#2563EB" />
                <span>Batch Background Fill</span>
              </label>
              <button
                type="button"
                className="drafo-reset-accent-btn"
                onClick={() => {
                  const targetSet = new Set(selectedIds);
                  const updatedNodes = project.nodes.map((n) =>
                    targetSet.has(n.id)
                      ? { ...n, style: { ...n.style, bg: 'auto' } }
                      : n
                  );
                  onUpdateProject({ ...project, nodes: updatedNodes });
                }}
                title="Reset all selected to auto tint background"
              >
                Reset to Auto
              </button>
            </div>
            <div className="drafo-accent-swatch-matrix">
              {BG_COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  className="drafo-accent-swatch-pill"
                  onClick={() => {
                    const targetSet = new Set(selectedIds);
                    const updatedNodes = project.nodes.map((n) =>
                      targetSet.has(n.id)
                        ? {
                            ...n,
                            style: {
                              ...n.style,
                              bg: p.value
                            }
                          }
                        : n
                    );
                    onUpdateProject({ ...project, nodes: updatedNodes });
                  }}
                  title={`Apply ${p.name} background to all selected`}
                >
                  <span
                    className="drafo-accent-swatch-circle"
                    style={{
                      backgroundColor: p.hex === 'transparent' ? 'transparent' : p.hex,
                      border:
                        p.hex === '#FFFFFF' || p.hex === '#F8FAFC' || p.hex === '#F4F4F5'
                          ? '1px solid #CBD5E1'
                          : undefined
                    }}
                  >
                    {p.isAuto && <Sparkles size={11} color="#64748B" />}
                    {p.isTransparent && <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>Ø</span>}
                  </span>
                </button>
              ))}

              {/* Batch Custom Color Picker */}
              <label className="drafo-accent-custom-btn" title="Choose custom background hex for all">
                <Pipette size={13} color="#475569" />
                <input
                  type="color"
                  defaultValue="#FFFFFF"
                  onChange={(e) => {
                    const val = e.target.value;
                    const targetSet = new Set(selectedIds);
                    const updatedNodes = project.nodes.map((n) =>
                      targetSet.has(n.id)
                        ? {
                            ...n,
                            style: {
                              ...n.style,
                              bg: val
                            }
                          }
                        : n
                    );
                    onUpdateProject({ ...project, nodes: updatedNodes });
                  }}
                  className="drafo-color-native-hidden"
                />
              </label>
            </div>
          </div>

          {/* Batch Color Palettes CustomSelect */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <label className="drafo-field-label">Batch Palette Theme</label>
            <CustomSelect
              value=""
              options={BATCH_PALETTE_OPTIONS}
              placeholder="Apply theme to all selected..."
              searchable
              onChange={(val) => {
                if (val) applyBatchColorTheme(val);
              }}
            />
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

          {/* Border Style */}
          <div className="drafo-form-field">
            <label className="drafo-field-label">Border Style</label>
            <div className="drafo-segmented-control">
              {(['solid', 'dashed', 'dotted'] as LineStyle[]).map((s) => (
                <button
                  key={s}
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

          {/* Accent Color & Surface Tint Section */}
          <div className="drafo-form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="drafo-field-label">
                <Sparkles size={13} color="#2563EB" />
                <span>Accent Color & Tint</span>
              </label>
              {selectedNode.style.accentColor && (
                <button
                  type="button"
                  className="drafo-reset-accent-btn"
                  onClick={() => updateNodeStyle({ accentColor: undefined, tint: 'none', borderColor: undefined })}
                  title="Reset to default type color"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Accent Swatches Matrix */}
            <div className="drafo-accent-swatch-matrix">
              {ACCENT_COLOR_PRESETS.map((p) => {
                const isSelected = selectedNode.style.accentColor === p.hex;
                return (
                  <button
                    key={p.hex}
                    type="button"
                    className={`drafo-accent-swatch-pill ${isSelected ? 'is-active' : ''}`}
                    onClick={() =>
                      updateNodeStyle({
                        accentColor: p.hex,
                        borderColor: p.hex,
                        tint: selectedNode.style.tint || 'subtle'
                      })
                    }
                    title={`${p.name} (${p.hex})`}
                  >
                    <span className="drafo-accent-swatch-circle" style={{ backgroundColor: p.hex }}>
                      {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <label className="drafo-accent-custom-btn" title="Choose custom hex color">
                <Pipette size={13} color="#475569" />
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

            {/* Surface Tint Intensity */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Surface Tint Intensity</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>
                  {selectedNode.style.tint || (selectedNode.style.accentColor ? 'subtle' : 'none')}
                </span>
              </div>
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
                      {t === 'none' ? 'None' : t === 'subtle' ? 'Subtle' : t === 'medium' ? 'Medium' : 'Bold'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card Background / Fill Section */}
          <div className="drafo-form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="drafo-field-label">
                <Paintbrush size={13} color="#2563EB" />
                <span>Background Fill</span>
              </label>
              {selectedNode.style.bg && selectedNode.style.bg !== 'auto' && (
                <button
                  type="button"
                  className="drafo-reset-accent-btn"
                  onClick={() => updateNodeStyle({ bg: 'auto' })}
                  title="Reset to Auto Tint background"
                >
                  Reset to Auto
                </button>
              )}
            </div>

            {/* Background Swatches Matrix */}
            <div className="drafo-accent-swatch-matrix">
              {BG_COLOR_PRESETS.map((p) => {
                const currentBg = selectedNode.style.bg || 'auto';
                const isSelected = currentBg === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`drafo-accent-swatch-pill ${isSelected ? 'is-active' : ''}`}
                    onClick={() => updateNodeStyle({ bg: p.value })}
                    title={`${p.name} (${p.value})`}
                  >
                    <span
                      className="drafo-accent-swatch-circle"
                      style={{
                        backgroundColor: p.hex === 'transparent' ? 'transparent' : p.hex,
                        border:
                          p.hex === '#FFFFFF' || p.hex === '#F8FAFC' || p.hex === '#F4F4F5'
                            ? '1px solid #CBD5E1'
                            : undefined
                      }}
                    >
                      {p.isAuto && <Sparkles size={11} color="#64748B" />}
                      {p.isTransparent && <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>Ø</span>}
                      {isSelected && !p.isAuto && !p.isTransparent && (
                        <Check
                          size={11}
                          color={isColorDark(p.hex) ? '#FFFFFF' : '#0F172A'}
                          strokeWidth={3}
                        />
                      )}
                    </span>
                  </button>
                );
              })}

              {/* Custom Hex Color Native Picker */}
              <label className="drafo-accent-custom-btn" title="Choose custom background hex">
                <Pipette size={13} color="#475569" />
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

            {/* Current Fill Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Current Fill:</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                {!selectedNode.style.bg || selectedNode.style.bg === 'auto'
                  ? 'Auto (Accent Tinted)'
                  : selectedNode.style.bg}
              </span>
            </div>
          </div>

          {/* Color Palettes Swatches (Without Center Dot) */}
          <div className="drafo-form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="drafo-field-label">Color Themes</label>
              {selectedNode.style.colorPalette && NODE_COLOR_PALETTES[selectedNode.style.colorPalette] && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>
                  {NODE_COLOR_PALETTES[selectedNode.style.colorPalette].name}
                </span>
              )}
            </div>
            <div className="drafo-swatch-grid">
              {Object.keys(NODE_COLOR_PALETTES).map((key) => {
                const p = NODE_COLOR_PALETTES[key];
                const isActive = selectedNode.style.colorPalette === key;
                return (
                  <button
                    key={key}
                    className={`drafo-swatch-btn ${isActive ? 'active' : ''}`}
                    onClick={() => applyColorTheme(key)}
                    title={`${p.name}: ${p.description}`}
                  >
                    <div
                      className="drafo-swatch-box"
                      style={{
                        backgroundColor: p.headerBg || p.border,
                        borderColor: p.border
                      }}
                    />
                  </button>
                );
              })}
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
