'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FlowNode as FlowNodeType, PortPosition, NodeType } from '../../types/flow';
import { NODE_COLOR_PALETTES } from '../../data/colorPalettes';
import {
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  Database,
  Server,
  Zap,
  Box,
  Layers,
  HardDrive,
  Cloud,
  ShieldCheck,
  StickyNote,
  GitFork,
  Radio,
  Wifi,
  Battery,
  Clock,
  Split,
  Cpu,
  ExternalLink,
  Lock
} from 'lucide-react';

export type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const getNodeAccentColor = (node: FlowNodeType): string => {
  if (node.style?.accentColor) {
    return node.style.accentColor;
  }
  if (node.style?.colorPalette && NODE_COLOR_PALETTES[node.style.colorPalette]) {
    return NODE_COLOR_PALETTES[node.style.colorPalette].headerBg || '#2563EB';
  }
  switch (node.type) {
    case 'server':
      return '#2563EB';
    case 'kubernetes':
      return '#326CE5';
    case 'microservice':
      return '#0284C7';
    case 'serverless':
      return '#D97706';
    case 'worker':
      return '#475569';
    case 'database':
    case 'nosql':
      return '#9333EA';
    case 'cache':
      return '#EA580C';
    case 'queue':
      return '#F97316';
    case 'gateway':
      return '#7C3AED';
    case 'loadbalancer':
      return '#059669';
    case 'cdn':
      return '#10B981';
    case 'auth':
      return '#DC2626';
    case 'cloud':
      return '#6366F1';
    case 'container':
    case 'group':
      return '#2563EB';
    case 'api':
      return '#0284C7';
    case 'middleware':
      return '#64748B';
    default:
      return '#2563EB';
  }
};

const getNodeIcon = (type: NodeType) => {
  switch (type) {
    case 'container':
    case 'group':
      return <Layers size={13} />;
    case 'server':
      return <Server size={13} />;
    case 'api':
      return <ExternalLink size={13} />;
    case 'client':
      return <Globe size={13} />;
    case 'serverless':
    case 'action':
      return <Zap size={13} />;
    case 'worker':
      return <Clock size={13} />;
    case 'microservice':
      return <Box size={13} />;
    case 'kubernetes':
      return <Cpu size={13} />;
    case 'loadbalancer':
      return <Split size={13} />;
    case 'gateway':
      return <Radio size={13} />;
    case 'middleware':
      return <Layers size={13} />;
    case 'auth':
      return <ShieldCheck size={13} />;
    case 'storage':
      return <HardDrive size={13} />;
    case 'cache':
      return <Zap size={13} />;
    case 'queue':
      return <Layers size={13} />;
    case 'cloud':
      return <Cloud size={13} />;
    case 'cdn':
      return <Wifi size={13} />;
    case 'nosql':
      return <Database size={13} />;
    default:
      return <Box size={13} />;
  }
};

interface FlowNodeProps {
  node: FlowNodeType;
  isSelected: boolean;
  isSimActive?: boolean;
  isSimTarget?: boolean;
  onSelect: (nodeId: string, e: React.MouseEvent) => void;
  onUpdate: (updatedNode: FlowNodeType) => void;
  onStartConnect: (nodeId: string, port: PortPosition, e: React.MouseEvent) => void;
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onResizeStart?: (nodeId: string, handle: ResizeHandleType, e: React.MouseEvent) => void;
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  node,
  isSelected,
  isSimActive,
  isSimTarget,
  onSelect,
  onUpdate,
  onStartConnect,
  onDragStart,
  onResizeStart
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(node.title);
  const [tempSubtitle, setTempSubtitle] = useState(node.subtitle || '');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempTitle(node.title);
    setTempSubtitle(node.subtitle || '');
  }, [node.title, node.subtitle]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingSubtitle && subtitleInputRef.current) {
      subtitleInputRef.current.focus();
      subtitleInputRef.current.select();
    }
  }, [isEditingSubtitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    onUpdate({ ...node, title: tempTitle });
  };

  const handleSubtitleSubmit = () => {
    setIsEditingSubtitle(false);
    onUpdate({ ...node, subtitle: tempSubtitle });
  };

  const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
  // 4 Corner Resize Handles - prevents overlapping and blocking the 4 edge connection ports!
  const resizeHandles: ResizeHandleType[] = ['nw', 'ne', 'se', 'sw'];

  // Render specific node shapes
  const renderContent = () => {
    switch (node.type) {
      // 0. Boundary Container & Subnet Group (VPC, K8s, Subnets)
      case 'container':
      case 'group':
        return (
          <div className="drafo-node-container-inner">
            <div
              className="drafo-container-header"
              style={{
                backgroundColor: node.style.headerBg || 'rgba(37, 99, 235, 0.08)',
                borderBottom: `1px ${node.style.borderStyle || 'dashed'} ${node.style.borderColor || '#3B82F6'}`
              }}
            >
              <div className="drafo-container-badge">
                <Layers size={13} color={node.style.headerColor || node.style.borderColor || '#2563EB'} />
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    className="drafo-inline-input"
                    style={{ fontWeight: 700 }}
                  />
                ) : (
                  <span
                    className="drafo-container-title"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                    }}
                    title="Double click to edit container name"
                  >
                    {node.title || 'VPC Container'}
                  </span>
                )}
              </div>
              {node.subtitle && (
                <span className="drafo-container-tag">{node.subtitle}</span>
              )}
            </div>
          </div>
        );

      // 1. Web Browser Window
      case 'browser':
        return (
          <div className="drafo-node-browser-inner">
            <div
              className="drafo-browser-header"
              style={{ backgroundColor: node.style.headerBg || '#2563EB' }}
            >
              <div className="drafo-browser-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div className="drafo-browser-body">
              <div className="drafo-browser-sidebar-preview" />
              <div className="drafo-browser-content-preview">
                <div className="drafo-preview-line line-wide" />
                <div className="drafo-preview-line line-mid" />
                <div className="drafo-preview-line line-short" />
              </div>
            </div>

            <div className="drafo-browser-caption">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                />
              ) : (
                <span
                  className="drafo-node-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title}
                </span>
              )}
            </div>
          </div>
        );

      // 2. Modern Smartphone Mobile App
      case 'mobile':
        return (
          <div
            className="drafo-node-mobile-inner"
            style={{ borderColor: node.style.borderColor || '#1E293B' }}
          >
            {/* Top Status Bar with Dynamic Island */}
            <div className="drafo-mobile-top-bar">
              <span>9:41</span>
              <div className="drafo-mobile-island">
                <div className="drafo-mobile-island-lens" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Wifi size={9} />
                <Battery size={10} />
              </div>
            </div>

            {/* Mobile Screen Content */}
            <div className="drafo-mobile-screen">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ fontSize: '13px', fontWeight: 700 }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title}
                </span>
              )}

              {isEditingSubtitle ? (
                <textarea
                  ref={subtitleInputRef}
                  value={tempSubtitle}
                  onChange={(e) => setTempSubtitle(e.target.value)}
                  onBlur={handleSubtitleSubmit}
                  className="drafo-inline-textarea"
                  rows={2}
                />
              ) : (
                <span
                  className="drafo-node-subtitle"
                  style={{ fontSize: '10.5px', marginTop: 3 }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSubtitle(true);
                  }}
                  title="Double click to edit subtitle"
                >
                  {node.subtitle || 'iOS / Android'}
                </span>
              )}

              <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <div className="drafo-preview-line line-wide" style={{ backgroundColor: '#E2E8F0', height: 3 }} />
                <div className="drafo-preview-line line-mid" style={{ backgroundColor: '#E2E8F0', height: 3 }} />
              </div>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="drafo-mobile-home-bar" />
          </div>
        );

      // 3. Desktop App Window (Vector-wireframe aesthetic)
      case 'desktop':
        return (
          <div
            className="drafo-node-desktop-inner"
            style={{ borderColor: node.style.borderColor || '#475569' }}
          >
            <div
              className="drafo-desktop-header"
              style={{ backgroundColor: node.style.headerBg || '#475569' }}
            >
              <div className="drafo-desktop-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div className="drafo-desktop-body">
              <div className="drafo-desktop-sidebar-preview" />
              <div className="drafo-desktop-content-preview">
                <div className="drafo-preview-line line-wide" style={{ backgroundColor: '#94A3B8' }} />
                <div className="drafo-preview-line line-mid" style={{ backgroundColor: '#CBD5E1' }} />
                <div className="drafo-preview-line line-short" style={{ backgroundColor: '#E2E8F0' }} />
              </div>
            </div>

            <div className="drafo-browser-caption">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                />
              ) : (
                <span
                  className="drafo-node-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title || 'Desktop App'}
                </span>
              )}
            </div>
          </div>
        );

      // 4. Developer Terminal / CLI Window (Vector-wireframe aesthetic matching Web Client)
      case 'terminal':
        return (
          <div
            className="drafo-node-terminal-inner"
            style={{ borderColor: node.style.borderColor || '#0F172A' }}
          >
            <div
              className="drafo-terminal-header"
              style={{ backgroundColor: node.style.headerBg || '#0F172A' }}
            >
              <div className="drafo-terminal-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div className="drafo-terminal-body">
              <div className="drafo-terminal-content-preview">
                <div className="drafo-terminal-prompt-preview">
                  <span className="drafo-terminal-icon-prompt">&gt;_</span>
                  <div className="drafo-preview-line line-wide" style={{ backgroundColor: '#64748B', height: 6, borderRadius: 3 }} />
                </div>
                <div className="drafo-preview-line line-mid" style={{ backgroundColor: '#94A3B8', height: 4, borderRadius: 2 }} />
                <div className="drafo-preview-line line-short" style={{ backgroundColor: '#CBD5E1', height: 4, borderRadius: 2 }} />
              </div>
            </div>

            <div className="drafo-browser-caption">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                />
              ) : (
                <span
                  className="drafo-node-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title || 'Terminal CLI'}
                </span>
              )}
            </div>
          </div>
        );

      // 5. 3D Cylinder Database (Mathematically Perfect SVG Vector Cylinder)
      case 'database':
      case 'nosql': {
        const w = node.width;
        const h = node.height;
        const strokeColor = node.style.borderColor || '#9333EA';
        const bodyFill = node.style.bg || '#FAF5FF';
        const capFill =
          node.customData?.cylinderCapColor ||
          (node.style.colorPalette === 'purple' ? '#E9D5FF' : '#E0E7FF');
        const borderWidth = node.style.borderWidth || 1.5;
        const ry = Math.min(22, Math.max(10, Math.round(h * 0.13)));
        const rx = Math.max(10, (w - 2) / 2);
        const cx = w / 2;
        const cy = ry + 1;
        const bottomCy = h - ry - 1;

        return (
          <div className="drafo-node-db-perfect-container">
            <svg
              className="drafo-db-perfect-svg"
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
            >
              {/* Cylinder Body with True Curved Elliptical Bottom */}
              <path
                d={`M 1,${cy} 
                    L 1,${bottomCy} 
                    A ${rx},${ry} 0 0,0 ${w - 1},${bottomCy} 
                    L ${w - 1},${cy} 
                    A ${rx},${ry} 0 0,1 1,${cy} Z`}
                fill={bodyFill}
                stroke={strokeColor}
                strokeWidth={borderWidth}
                strokeLinejoin="round"
              />

              {/* Stacked Disk Grooves (Authentic Enterprise 3D Storage Disks) */}
              <path
                d={`M 1,${h * 0.38} A ${rx},${ry} 0 0,0 ${w - 1},${h * 0.38}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={borderWidth}
                opacity={0.3}
              />
              <path
                d={`M 1,${h * 0.65} A ${rx},${ry} 0 0,0 ${w - 1},${h * 0.65}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={borderWidth}
                opacity={0.3}
              />

              {/* Top Cap Ellipse with Seamless Tangents */}
              <ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={capFill}
                stroke={strokeColor}
                strokeWidth={borderWidth}
              />
            </svg>

            {/* Centered Database Content */}
            <div
              className="drafo-db-perfect-content"
              style={{ paddingTop: `${Math.round(ry * 0.8)}px` }}
            >
              <div className="drafo-db-icon-pill">
                <Database size={13} color={strokeColor} />
              </div>
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                  style={{ textAlign: 'center', fontWeight: 700, color: node.style.textColor }}
                />
              ) : (
                <div
                  className="drafo-node-title db-title"
                  style={{ color: node.style.textColor || '#0F172A' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit"
                >
                  {node.title}
                </div>
              )}

              {node.subtitle && (
                <div
                  className="drafo-node-subtitle"
                  style={{ color: node.style.subtextColor || '#64748B' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSubtitle(true);
                  }}
                >
                  {node.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      }

      // 6. Cloud VPC / Region Component (Harmonious Organic Architecture Cloud)
      case 'cloud': {
        const strokeColor = node.style.borderColor || '#4F46E5';
        const fillColor = node.style.bg || '#EEF2FF';
        const borderWidth = node.style.borderWidth || 1.5;

        return (
          <div className="drafo-node-cloud-inner">
            <svg
              className="drafo-cloud-perfect-svg"
              viewBox="0 0 200 130"
              preserveAspectRatio="none"
            >
              <path
                d="M 45,115
                   C 22,115 8,96 8,74
                   C 8,54 24,38 46,36
                   C 54,16 78,8 104,8
                   C 128,8 150,18 158,36
                   C 178,38 196,54 196,74
                   C 196,96 180,115 155,115
                   C 130,118 70,118 45,115 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={borderWidth}
                strokeLinejoin="round"
              />
            </svg>

            <div className="drafo-cloud-content">
              <div
                className="drafo-cloud-badge"
                style={{
                  color: strokeColor,
                  borderColor: strokeColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }}
              >
                <Cloud size={12} strokeWidth={2.2} />
                <span>CLOUD VPC</span>
              </div>
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                  style={{ textAlign: 'center', fontWeight: 700, color: node.style.textColor || '#1E1B4B' }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ fontSize: '13.5px', fontWeight: 700, color: node.style.textColor || '#1E1B4B' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title}
                </span>
              )}

              {node.subtitle && (
                <span
                  className="drafo-node-subtitle"
                  style={{ fontSize: '11px', marginTop: 2, color: node.style.subtextColor || '#4338CA' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSubtitle(true);
                  }}
                  title="Double click to edit subtitle"
                >
                  {node.subtitle}
                </span>
              )}
            </div>
          </div>
        );
      }

      // 7. Decision Diamond
      case 'decision':
        return (
          <div className="drafo-node-decision-inner">
            <GitFork size={18} color={node.style.textColor || '#D97706'} style={{ marginBottom: 4 }} />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="drafo-inline-input"
              />
            ) : (
              <span
                className="drafo-node-title"
                style={{ fontSize: '13px', color: node.style.textColor }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
              >
                {node.title}
              </span>
            )}
          </div>
        );

      // 8. Sticky Note
      case 'note':
        return (
          <div className="drafo-node-note-inner">
            <div className="drafo-note-pin" />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                className="drafo-inline-input"
                style={{ fontSize: '12px', marginTop: 4, padding: '2px 4px' }}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setTempTitle(node.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                className="drafo-node-title"
                style={{ fontSize: '13px', marginTop: 4, cursor: 'text' }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                title="Double click to edit title"
              >
                {node.title}
              </div>
            )}
            {isEditingSubtitle ? (
              <textarea
                ref={subtitleInputRef}
                value={tempSubtitle}
                className="drafo-inline-textarea"
                rows={2}
                style={{ fontSize: '11px', marginTop: 4, padding: '2px 4px' }}
                onChange={(e) => setTempSubtitle(e.target.value)}
                onBlur={handleSubtitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubtitleSubmit();
                  }
                  if (e.key === 'Escape') {
                    setTempSubtitle(node.subtitle || '');
                    setIsEditingSubtitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                className="drafo-node-subtitle"
                style={{ fontSize: '11.5px', marginTop: 4, cursor: 'text' }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingSubtitle(true);
                }}
                title="Double click to edit text"
              >
                {node.subtitle}
              </div>
            )}
          </div>
        );

      // 9. Enhanced Universal Architecture Service Cards
      default: {
        const accentColor = getNodeAccentColor(node);
        const iconElement = getNodeIcon(node.type);

        // Display clean type name
        const displayType =
          node.type === 'server'
            ? node.title.toLowerCase().includes('service')
              ? 'SERVICE'
              : 'SERVER'
            : node.type.toUpperCase();

        return (
          <div className="drafo-node-standard-inner">
            {/* Header with Type Icon, Label, Status and Metric */}
            <div className="drafo-node-card-header">
              <div className="drafo-node-header-left">
                <div
                  className="drafo-node-icon-box"
                  style={{
                    backgroundColor: `${accentColor}12`,
                    color: accentColor,
                    borderColor: `${accentColor}25`
                  }}
                >
                  {iconElement}
                </div>
                <div className="drafo-node-type-label">
                  {node.status && node.status !== 'none' && (
                    <span className={`drafo-status-dot ${node.status}`} />
                  )}
                  <span>{displayType}</span>
                </div>
              </div>

              {node.metric && (
                <div className="drafo-node-metric-badge">
                  {node.metric}
                </div>
              )}
            </div>

            {/* Content Area with Structured Title and Route/Subtitle */}
            <div className="drafo-node-card-body">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input title-input"
                />
              ) : (
                <div
                  className="drafo-node-title"
                  style={{ color: node.style.textColor || '#0F172A' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title}
                </div>
              )}

              {isEditingSubtitle ? (
                <textarea
                  ref={subtitleInputRef}
                  value={tempSubtitle}
                  onChange={(e) => setTempSubtitle(e.target.value)}
                  onBlur={handleSubtitleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubtitleSubmit();
                    }
                  }}
                  className="drafo-inline-textarea"
                  rows={2}
                />
              ) : (
                (node.subtitle !== undefined || isSelected) && (
                  <div
                    className="drafo-node-subtitle-pill"
                    style={{ color: node.style.subtextColor || '#475569' }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingSubtitle(true);
                    }}
                    title="Double click to edit subtitle"
                  >
                    {node.subtitle || (isSelected ? '<add route / path>' : '')}
                  </div>
                )
              )}

              {/* Node Tags */}
              {node.tags && node.tags.length > 0 && (
                <div className="drafo-node-tags-wrap">
                  {node.tags.map((tag) => (
                    <span key={tag} className="drafo-node-tag-chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  };

  const isCustomShape =
    node.type === 'browser' ||
    node.type === 'mobile' ||
    node.type === 'desktop' ||
    node.type === 'terminal' ||
    node.type === 'database' ||
    node.type === 'nosql' ||
    node.type === 'cloud' ||
    node.type === 'decision' ||
    node.type === 'note';

  const isOldPastelBg =
    node.style.bg === '#EFF6FF' ||
    node.style.bg === '#EEF2FF' ||
    node.style.bg === '#F0FDF4' ||
    node.style.bg === '#F0F9FF' ||
    node.style.bg === '#FFFBEB' ||
    node.style.bg === '#F5F3FF' ||
    node.style.bg === '#ECFDF5' ||
    node.style.bg === '#FEF2F2';

  const isContainer = node.type === 'container' || node.type === 'group';
  const accentColor = getNodeAccentColor(node);
  const tint = node.style.tint || (node.style.accentColor ? 'subtle' : 'none');

  const cardBg = isCustomShape
    ? 'transparent'
    : isContainer
    ? (node.style.bg && node.style.bg !== 'transparent'
        ? node.style.bg
        : tint === 'medium'
        ? `${accentColor}0F`
        : tint === 'strong'
        ? `${accentColor}1A`
        : `${accentColor}06`)
    : node.style.bg && !isOldPastelBg && node.style.bg !== '#FFFFFF'
    ? node.style.bg
    : tint === 'subtle'
    ? `${accentColor}09`
    : tint === 'medium'
    ? `${accentColor}16`
    : tint === 'strong'
    ? `${accentColor}28`
    : '#FFFFFF';

  // Preserve the sharp, distinctive colored border
  const cardBorder = isCustomShape
    ? 'transparent'
    : (node.style.borderColor && node.style.borderColor !== '#E2E8F0'
        ? node.style.borderColor
        : accentColor);

  return (
    <div
      id={`node-${node.id}`}
      className={`drafo-flow-node type-${node.type} ${isContainer ? 'is-container-node' : ''} ${
        isSelected ? 'selected' : ''
      } ${isSimActive ? 'sim-pulse' : ''} ${isSimTarget ? 'sim-target-pulse' : ''} ${
        node.isLocked ? 'is-locked' : ''
      }`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        backgroundColor: cardBg,
        borderColor: cardBorder,
        borderWidth: isCustomShape ? 0 : `${node.style.borderWidth || 1.5}px`,
        borderRadius: `${node.style.borderRadius || (isContainer ? 14 : 10)}px`,
        borderStyle: node.style.borderStyle || (isContainer || node.style.isDashed ? 'dashed' : 'solid'),
        boxShadow: isCustomShape || isContainer
          ? 'none'
          : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        zIndex: isContainer ? 1 : (isSelected ? 10 : 2)
      }}
      onClick={(e) => onSelect(node.id, e)}
      onMouseDown={(e) => {
        if (!isEditingTitle && !isEditingSubtitle) {
          onDragStart(node.id, e);
        }
      }}
    >
      {renderContent()}

      {/* Locked Badge */}
      {node.isLocked && (
        <div className="drafo-lock-indicator-badge" title="Locked (Cannot be moved)">
          <Lock size={10} />
        </div>
      )}

      {/* 4 Corner Interactive Resize Handles (Available on selected nodes) */}
      {isSelected && onResizeStart && (
        <>
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              className={`drafo-node-resize-handle handle-${handle}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, handle, e);
              }}
              title={`Resize node (${handle.toUpperCase()})`}
            />
          ))}
        </>
      )}

      {/* Interactive Connection Ports (Top, Right, Bottom, Left) - Always clickable! */}
      <div className="drafo-node-ports">
        {ports.map((port) => (
          <div
            key={port}
            className={`drafo-port port-${port}`}
            title={`Drag to connect from ${port}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartConnect(node.id, port, e);
            }}
          />
        ))}
      </div>
    </div>
  );
};
