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
  ArrowDown
} from 'lucide-react';
import './Inspector.css';

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

          {/* Batch Color Palettes Dropdown */}
          <div className="drafo-form-field" style={{ padding: '0 14px' }}>
            <label className="drafo-field-label">Batch Color Palette</label>
            <select
              className="drafo-input"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  applyBatchColorTheme(e.target.value);
                }
              }}
            >
              <option value="" disabled>Apply color theme to all selected...</option>
              {Object.keys(NODE_COLOR_PALETTES).map((key) => {
                const p = NODE_COLOR_PALETTES[key];
                return (
                  <option key={key} value={key}>
                    {p.name} — {p.description}
                  </option>
                );
              })}
            </select>
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
            <select
              className="drafo-input"
              value={selectedNode.type}
              onChange={(e) => updateNodeProps({ type: e.target.value as NodeType })}
            >
              <option value="container">Architecture Container (VPC / Subnet)</option>
              <option value="group">Subsystem Grouping Zone</option>
              <option value="standard">Standard Service Card</option>
              <option value="browser">Web Browser Window</option>
              <option value="mobile">Mobile Client App</option>
              <option value="desktop">Desktop App Window</option>
              <option value="terminal">Terminal CLI</option>
              <option value="server">Next.js Server Component</option>
              <option value="api">REST / GraphQL API</option>
              <option value="microservice">Microservice</option>
              <option value="serverless">Serverless Function</option>
              <option value="gateway">API Gateway</option>
              <option value="database">SQL Database (3D Cylinder)</option>
              <option value="cache">Redis Cache</option>
              <option value="queue">Message Queue</option>
              <option value="cloud">Cloud VPC / Region</option>
              <option value="auth">OAuth2 / IAM Auth</option>
              <option value="decision">Decision Diamond</option>
              <option value="note">Sticky Note</option>
            </select>
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
              <select
                className="drafo-input"
                value={selectedNode.status || 'online'}
                onChange={(e) => updateNodeProps({ status: e.target.value as NodeStatus })}
              >
                <option value="online">Online (Active & Healthy)</option>
                <option value="idle">Idle (Standby)</option>
                <option value="busy">Busy (Processing / Queued)</option>
                <option value="error">Error (Degraded / Failed)</option>
              </select>
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
              <select
                className="drafo-input"
                value={selectedNode.customData?.deviceType || 'iphone'}
                onChange={(e) =>
                  updateNodeProps({
                    customData: {
                      ...selectedNode.customData,
                      deviceType: e.target.value as 'iphone' | 'android' | 'tablet'
                    }
                  })
                }
              >
                <option value="iphone">Apple iPhone (Dynamic Island)</option>
                <option value="android">Android Phone</option>
                <option value="tablet">iPad / Tablet</option>
              </select>
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
