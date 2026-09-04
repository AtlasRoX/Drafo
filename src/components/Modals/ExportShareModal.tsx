'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FlowProject, FlowNode, FlowEdge } from '../../types/flow';
import {
  exportDiagramAsPng,
  exportDiagramAsSvg,
  copyDiagramToClipboard,
  generateMermaidCode
} from '../../utils/exportUtils';
import {
  Download,
  Copy,
  FileCode,
  Check,
  X,
  Sparkles,
  Layers,
  Square,
  Maximize,
  Image as ImageIcon,
  Code,
  Pipette
} from 'lucide-react';
import { FlowNode as FlowNodeComponent } from '../Canvas/FlowNode';
import { calculateEdgePath } from '../../utils/routing';
import './Modals.css';

interface ExportShareModalProps {
  project: FlowProject;
  selectedIds?: string[];
  onClose: () => void;
}

export type ExportScope = 'all' | 'selection';
export type ExportBackground =
  | 'transparent'
  | 'white'
  | 'dark'
  | 'gradient-midnight'
  | 'gradient-sunset'
  | 'gradient-ocean'
  | 'gradient-cyber'
  | 'custom';

const BACKGROUND_CONFIGS: Record<
  ExportBackground,
  { label: string; bgStyle: string; previewBg: string; isDark: boolean }
> = {
  transparent: {
    label: 'Transparent',
    bgStyle: 'transparent',
    previewBg: 'repeating-conic-gradient(#cbd5e1 0% 25%, #f1f5f9 0% 50%) 50% / 12px 12px',
    isDark: false
  },
  white: {
    label: 'Clean White',
    bgStyle: '#FFFFFF',
    previewBg: '#FFFFFF',
    isDark: false
  },
  dark: {
    label: 'Dark Slate',
    bgStyle: '#0F172A',
    previewBg: '#0F172A',
    isDark: true
  },
  'gradient-midnight': {
    label: 'Vercel Midnight',
    bgStyle: 'radial-gradient(ellipse at top left, #1e293b, #0f172a 80%)',
    previewBg: 'radial-gradient(ellipse at top left, #1e293b, #0f172a 80%)',
    isDark: true
  },
  'gradient-sunset': {
    label: 'Sunset Glow',
    bgStyle: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
    previewBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
    isDark: true
  },
  'gradient-ocean': {
    label: 'Oceanic Teal',
    bgStyle: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
    previewBg: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
    isDark: true
  },
  'gradient-cyber': {
    label: 'Cyber Indigo',
    bgStyle: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    previewBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    isDark: true
  },
  custom: {
    label: 'Custom Color',
    bgStyle: '#4F46E5',
    previewBg: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    isDark: true
  }
};

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  project,
  selectedIds = [],
  onClose
}) => {
  const hasSelection = selectedIds.length > 0;
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [scope, setScope] = useState<ExportScope>(hasSelection ? 'selection' : 'all');
  const [background, setBackground] = useState<ExportBackground>('gradient-midnight');
  const [customBgColor, setCustomBgColor] = useState<string>('#4F46E5');
  const [padding, setPadding] = useState<number>(40);
  const [scale, setScale] = useState<number>(2);
  const [hasShadow, setHasShadow] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const previewFrameRef = useRef<HTMLDivElement>(null);

  // Compute target nodes and bounding box
  const { targetNodes, targetEdges, bounds } = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const nodesToExport =
      scope === 'selection' && hasSelection
        ? project.nodes.filter((n) => selectedSet.has(n.id))
        : project.nodes;

    const exportNodeIds = new Set(nodesToExport.map((n) => n.id));
    const edgesToExport = project.edges.filter(
      (e) => exportNodeIds.has(e.fromNodeId) && exportNodeIds.has(e.toNodeId)
    );

    if (nodesToExport.length === 0) {
      return {
        targetNodes: [],
        targetEdges: [],
        bounds: { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 }
      };
    }

    const SAFE_MARGIN = 48; // Generous breathing space so borders, shadows, and labels never touch the edge
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodesToExport.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      // Give 36px room below each node for labels, subtitles, and status metrics
      const effectiveBottom = n.y + n.height + 36;
      maxY = Math.max(maxY, effectiveBottom);
    });

    // Also include sections if any are present
    if (project.sections && project.sections.length > 0 && scope === 'all') {
      project.sections.forEach((s) => {
        if (typeof s.x === 'number') {
          minX = Math.min(minX, s.x);
          maxX = Math.max(maxX, s.x + 200);
        }
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y + 40);
      });
    }

    minX -= SAFE_MARGIN;
    minY -= SAFE_MARGIN;
    maxX += SAFE_MARGIN;
    maxY += SAFE_MARGIN;

    return {
      targetNodes: nodesToExport,
      targetEdges: edgesToExport,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(260, Math.round(maxX - minX)),
        height: Math.max(160, Math.round(maxY - minY))
      }
    };
  }, [project, scope, selectedIds, hasSelection]);

  const mermaidCode = useMemo(() => {
    const ids = scope === 'selection' && hasSelection ? selectedIds : undefined;
    return generateMermaidCode(project, ids);
  }, [project, scope, selectedIds, hasSelection]);

  const handleDownloadPng = async () => {
    if (!previewFrameRef.current) return;
    setIsExporting(true);
    const node = previewFrameRef.current;
    const prevTransform = node.style.transform;
    const prevPos = node.style.position;
    try {
      node.style.transform = 'none';
      node.style.position = 'relative';
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${scope === 'selection' ? 'selection' : 'diagram'}.png`;
      const bg = background === 'transparent' ? undefined : (background === 'custom' ? customBgColor : BACKGROUND_CONFIGS[background].bgStyle);
      await exportDiagramAsPng(node, fileName, scale, bg);
    } catch (err) {
      console.error(err);
    } finally {
      node.style.transform = prevTransform;
      node.style.position = prevPos;
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!previewFrameRef.current) return;
    setIsExporting(true);
    const node = previewFrameRef.current;
    const prevTransform = node.style.transform;
    const prevPos = node.style.position;
    try {
      node.style.transform = 'none';
      node.style.position = 'relative';
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${scope === 'selection' ? 'selection' : 'diagram'}.svg`;
      const bg = background === 'transparent' ? undefined : (background === 'custom' ? customBgColor : BACKGROUND_CONFIGS[background].bgStyle);
      await exportDiagramAsSvg(node, fileName, bg);
    } catch (err) {
      console.error(err);
    } finally {
      node.style.transform = prevTransform;
      node.style.position = prevPos;
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!previewFrameRef.current) return;
    setIsExporting(true);
    const node = previewFrameRef.current;
    const prevTransform = node.style.transform;
    const prevPos = node.style.position;
    try {
      node.style.transform = 'none';
      node.style.position = 'relative';
      const bg = background === 'transparent' ? undefined : (background === 'custom' ? customBgColor : BACKGROUND_CONFIGS[background].bgStyle);
      const success = await copyDiagramToClipboard(node, scale, bg);
      if (success) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      node.style.transform = prevTransform;
      node.style.position = prevPos;
      setIsExporting(false);
    }
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div
        className="drafo-modal-container visual-export-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drafo-modal-header">
          <div className="drafo-modal-title">
            <Sparkles size={20} className="drafo-wand-icon" />
            <span>Visual Export & Snippet Studio</span>
          </div>
          <button className="drafo-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation: Visual Card vs Mermaid Code */}
        <div className="drafo-export-tabs">
          <button
            className={`drafo-tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            <ImageIcon size={15} />
            <span>Image & Vector Card</span>
          </button>
          <button
            className={`drafo-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <Code size={15} />
            <span>Mermaid.js Markdown</span>
          </button>
        </div>

        {activeTab === 'visual' ? (
          <div className="drafo-export-body">
            {/* Left Controls Column */}
            <div className="drafo-export-controls">
              {/* Scope Selection */}
              <div className="drafo-export-control-group">
                <label className="drafo-control-label">Export Scope</label>
                <div className="drafo-pill-selector">
                  <button
                    className={`drafo-pill-option ${scope === 'all' ? 'active' : ''}`}
                    onClick={() => setScope('all')}
                  >
                    <Maximize size={14} />
                    <span>Entire Diagram ({project.nodes.length})</span>
                  </button>
                  <button
                    className={`drafo-pill-option ${scope === 'selection' ? 'active' : ''} ${
                      !hasSelection ? 'disabled' : ''
                    }`}
                    onClick={() => hasSelection && setScope('selection')}
                    disabled={!hasSelection}
                    title={!hasSelection ? 'No nodes currently selected on canvas' : ''}
                  >
                    <Square size={14} />
                    <span>
                      Selected Snippet {hasSelection ? `(${selectedIds.length})` : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Background Style Presets */}
              <div className="drafo-export-control-group">
                <label className="drafo-control-label">Card Background & Theme</label>
                <div className="drafo-bg-grid">
                  {(Object.keys(BACKGROUND_CONFIGS) as ExportBackground[]).map((bgKey) => {
                    const cfg = BACKGROUND_CONFIGS[bgKey];
                    return (
                      <button
                        key={bgKey}
                        className={`drafo-bg-option ${background === bgKey ? 'active' : ''}`}
                        onClick={() => setBackground(bgKey)}
                        title={cfg.label}
                      >
                        <span
                          className="drafo-bg-swatch"
                          style={{
                            background:
                              bgKey === 'custom' ? customBgColor : cfg.previewBg
                          }}
                        />
                        <span className="drafo-bg-name">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                {background === 'custom' && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      style={{
                        width: 34,
                        height: 30,
                        padding: 0,
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      className="drafo-input"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      style={{ width: 110, fontSize: 12, padding: '4px 8px' }}
                    />
                  </div>
                )}
              </div>

              {/* Framing Options: Padding & Quality */}
              <div className="drafo-export-row">
                <div className="drafo-export-control-group half">
                  <label className="drafo-control-label">Padding</label>
                  <div className="drafo-pill-selector small">
                    {[
                      { label: '0px', val: 0 },
                      { label: '24px', val: 24 },
                      { label: '40px', val: 40 },
                      { label: '64px', val: 64 }
                    ].map((p) => (
                      <button
                        key={p.val}
                        className={`drafo-pill-option ${padding === p.val ? 'active' : ''}`}
                        onClick={() => setPadding(p.val)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="drafo-export-control-group half">
                  <label className="drafo-control-label">PNG Resolution</label>
                  <div className="drafo-pill-selector small">
                    {[
                      { label: '1x Std', val: 1 },
                      { label: '2x HD', val: 2 },
                      { label: '4x Ultra', val: 4 }
                    ].map((s) => (
                      <button
                        key={s.val}
                        className={`drafo-pill-option ${scale === s.val ? 'active' : ''}`}
                        onClick={() => setScale(s.val)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles: Shadow & Watermark */}
              <div className="drafo-export-toggles">
                <label className="drafo-checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasShadow}
                    onChange={(e) => setHasShadow(e.target.checked)}
                  />
                  <span>Soft Card Drop Shadow</span>
                </label>
                <label className="drafo-checkbox-row">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                  />
                  <span>Show Drafo Badge</span>
                </label>
              </div>
            </div>

            {/* Right Live Preview Area */}
            <div className="drafo-export-preview-container">
              <div className="drafo-preview-header">
                <span>Live Card Preview</span>
                <span className="drafo-preview-meta">
                  {targetNodes.length} nodes · {bounds.width}×{bounds.height}px
                </span>
              </div>

              {(() => {
                const cardTotalWidth = bounds.width + padding * 2;
                const cardTotalHeight = bounds.height + padding * 2;
                const VIEWPORT_MAX_W = 540;
                const VIEWPORT_MAX_H = 340;
                const fitScale = Math.min(
                  1,
                  Math.min(
                    VIEWPORT_MAX_W / Math.max(1, cardTotalWidth),
                    VIEWPORT_MAX_H / Math.max(1, cardTotalHeight)
                  )
                );

                return (
                  <div
                    className="drafo-preview-viewport"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: '24px'
                    }}
                  >
                    {/* Scaled frame matching the fit-scale footprint */}
                    <div
                      style={{
                        width: `${Math.round(cardTotalWidth * fitScale)}px`,
                        height: `${Math.round(cardTotalHeight * fitScale)}px`,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'visible'
                      }}
                    >
                      {/* Visual Capture Wrapper */}
                      <div
                        ref={previewFrameRef}
                        className={`drafo-preview-card ${hasShadow ? 'has-shadow' : ''}`}
                        style={{
                          width: `${cardTotalWidth}px`,
                          height: `${cardTotalHeight}px`,
                          transform: `scale(${fitScale})`,
                          transformOrigin: 'top left',
                          background:
                            background === 'custom'
                              ? customBgColor
                              : BACKGROUND_CONFIGS[background].bgStyle,
                          padding: `${padding}px`,
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          borderRadius: background === 'transparent' ? '0px' : '16px',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Scaled Render of Nodes and Connections */}
                        <div
                          style={{
                            position: 'relative',
                            width: `${bounds.width}px`,
                            height: `${bounds.height}px`
                          }}
                        >
                          {/* Architectural Sections Layer */}
                          {project.sections && scope === 'all' && project.sections.map((sec) => (
                            <div
                              key={sec.id}
                              style={{
                                position: 'absolute',
                                left: `${(sec.x ?? bounds.minX) - bounds.minX}px`,
                                top: `${sec.y - bounds.minY}px`,
                                width: `${bounds.width}px`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            >
                              <div
                                style={{
                                  background: sec.pillBg || '#F1F5F9',
                                  color: sec.pillTextColor || '#0F172A',
                                  border: `1px solid ${sec.pillBorderColor || '#CBD5E1'}`,
                                  borderRadius: '20px',
                                  padding: '4px 12px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                {sec.number && <span style={{ opacity: 0.6, marginRight: 6 }}>{sec.number}</span>}
                                <span>{sec.title}</span>
                              </div>
                              {sec.hasDivider && (
                                <div style={{ flex: 1, height: 1, background: '#E2E8F0', borderTop: '1px dashed #CBD5E1' }} />
                              )}
                            </div>
                          ))}

                          {/* SVG Connector Layer */}
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: `${bounds.width}px`,
                              height: `${bounds.height}px`,
                              overflow: 'visible',
                              pointerEvents: 'none',
                              zIndex: 2
                            }}
                          >
                            <defs>
                              {Array.from(
                                new Set(
                                  targetEdges
                                    .map((e) => e.color || '#000000')
                                    .concat(['#2563EB', '#64748B', '#10B981', '#EF4444'])
                                )
                              ).map((color) => {
                                const colorKey = color.replace('#', '');
                                return (
                                  <React.Fragment key={colorKey}>
                                    <marker
                                      id={`export-marker-arrow-${colorKey}`}
                                      viewBox="0 0 10 10"
                                      refX="9"
                                      refY="5"
                                      markerWidth="8"
                                      markerHeight="8"
                                      orient="auto"
                                    >
                                      <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
                                    </marker>
                                    <marker
                                      id={`export-marker-arrow-start-${colorKey}`}
                                      viewBox="0 0 10 10"
                                      refX="1"
                                      refY="5"
                                      markerWidth="8"
                                      markerHeight="8"
                                      orient="auto"
                                    >
                                      <path d="M 10 1 L 0 5 L 10 9 z" fill={color} />
                                    </marker>
                                    <marker
                                      id={`export-marker-open-${colorKey}`}
                                      viewBox="0 0 10 10"
                                      refX="9"
                                      refY="5"
                                      markerWidth="8"
                                      markerHeight="8"
                                      orient="auto"
                                    >
                                      <path
                                        d="M 1 2 L 8 5 L 1 8"
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </marker>
                                    <marker
                                      id={`export-marker-open-start-${colorKey}`}
                                      viewBox="0 0 10 10"
                                      refX="1"
                                      refY="5"
                                      markerWidth="8"
                                      markerHeight="8"
                                      orient="auto"
                                    >
                                      <path
                                        d="M 9 2 L 2 5 L 9 8"
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </marker>
                                    <marker
                                      id={`export-marker-circle-${colorKey}`}
                                      viewBox="0 0 10 10"
                                      refX="5"
                                      refY="5"
                                      markerWidth="7"
                                      markerHeight="7"
                                      orient="auto"
                                    >
                                      <circle cx="5" cy="5" r="3.5" fill={color} />
                                    </marker>
                                  </React.Fragment>
                                );
                              })}
                            </defs>

                            {targetEdges.map((edge) => {
                              const from = targetNodes.find((n) => n.id === edge.fromNodeId);
                              const to = targetNodes.find((n) => n.id === edge.toNodeId);
                              if (!from || !to) return null;

                              const offsetFrom: FlowNode = {
                                ...from,
                                x: from.x - bounds.minX,
                                y: from.y - bounds.minY
                              };
                              const offsetTo: FlowNode = {
                                ...to,
                                x: to.x - bounds.minX,
                                y: to.y - bounds.minY
                              };

                              const { path, labelPosition } = calculateEdgePath(
                                offsetFrom,
                                offsetTo,
                                edge.fromPort,
                                edge.toPort,
                                edge.routeType,
                                edge.controlPoint
                                  ? {
                                      x: edge.controlPoint.x - bounds.minX,
                                      y: edge.controlPoint.y - bounds.minY
                                    }
                                  : undefined
                              );

                              const strokeColor = edge.color || '#2563EB';
                              const colorKey = strokeColor.replace('#', '');
                              const arrowheadType = edge.arrowhead || 'arrow';
                              const markerEnd =
                                arrowheadType === 'none'
                                  ? undefined
                                  : `url(#export-marker-${arrowheadType}-${colorKey})`;
                              const markerStart =
                                edge.bidirectional && arrowheadType !== 'none'
                                  ? `url(#export-marker-${arrowheadType}-start-${colorKey})`
                                  : undefined;

                              const strokeDash =
                                edge.lineStyle === 'dashed'
                                  ? '6,5'
                                  : edge.lineStyle === 'dotted'
                                  ? '2,4'
                                  : 'none';

                              return (
                                <g key={edge.id}>
                                  <path
                                    d={path}
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth={edge.width || 1.5}
                                    strokeDasharray={strokeDash}
                                    markerStart={markerStart}
                                    markerEnd={markerEnd}
                                  />
                                  {edge.label && labelPosition && (
                                    <g
                                      transform={`translate(${labelPosition.x}, ${labelPosition.y})`}
                                    >
                                      <text
                                        x={0}
                                        y={0}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="none"
                                        stroke="#FFFFFF"
                                        strokeWidth={5}
                                        strokeLinejoin="round"
                                        fontSize="10"
                                        fontWeight="600"
                                      >
                                        {edge.label}
                                      </text>
                                      <text
                                        x={0}
                                        y={0}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="#0F172A"
                                        fontSize="10"
                                        fontWeight="600"
                                      >
                                        {edge.label}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>

                          {/* Nodes Display with Authentic Custom Shapes */}
                          {targetNodes.map((node) => {
                            const offsetNode: FlowNode = {
                              ...node,
                              x: node.x - bounds.minX,
                              y: node.y - bounds.minY
                            };

                            return (
                              <FlowNodeComponent
                                key={node.id}
                                node={offsetNode}
                                isSelected={false}
                                onSelect={() => {}}
                                onUpdate={() => {}}
                                onStartConnect={() => {}}
                                onDragStart={() => {}}
                              />
                            );
                          })}
                        </div>

                        {/* Watermark badge */}
                        {showWatermark && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              right: '14px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: BACKGROUND_CONFIGS[background].isDark ? '#94A3B8' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: 0.8
                            }}
                          >
                            <Sparkles size={10} />
                            <span>Drafo Studio</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          /* Code Export Tab (Mermaid.js) */
          <div className="drafo-export-code-body">
            <div className="drafo-code-header">
              <div className="drafo-code-title">
                <FileCode size={16} />
                <span>Mermaid.js Flowchart Markdown</span>
              </div>
              <span className="drafo-code-hint">
                Paste directly into GitHub Markdown, Notion, Obsidian, or Confluence
              </span>
            </div>
            <textarea
              className="drafo-code-output"
              value={mermaidCode}
              readOnly
              rows={12}
            />
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="drafo-modal-footer">
          <div className="drafo-footer-left">
            <span className="drafo-footer-meta">
              Ready to export {targetNodes.length} components
            </span>
          </div>

          <div className="drafo-footer-actions">
            {activeTab === 'visual' ? (
              <>
                <button
                  className="drafo-btn-secondary"
                  onClick={handleCopyImage}
                  disabled={isExporting}
                >
                  {copiedImage ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                  <span>{copiedImage ? 'Copied Image!' : 'Copy to Clipboard'}</span>
                </button>

                <button
                  className="drafo-btn-secondary"
                  onClick={handleDownloadSvg}
                  disabled={isExporting}
                >
                  <FileCode size={15} />
                  <span>Download SVG</span>
                </button>

                <button
                  className="drafo-btn-primary"
                  onClick={handleDownloadPng}
                  disabled={isExporting}
                >
                  <Download size={15} />
                  <span>Download PNG ({scale}x)</span>
                </button>
              </>
            ) : (
              <button className="drafo-btn-primary" onClick={handleCopyMermaid}>
                {copiedCode ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                <span>{copiedCode ? 'Copied Mermaid Code!' : 'Copy Mermaid Markdown'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
