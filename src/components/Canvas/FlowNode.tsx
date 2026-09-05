'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
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
  Lock,
  Key,
  Link,
  Code,
  FileCode,
  Table,
  Check,
  Copy,
  Type,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter
} from 'lucide-react';
import { isColorDark } from '../../utils/colorUtils';
import {
  FONT_FAMILY_MAP,
  FONT_FAMILY_OPTIONS,
  TEXT_HIGHLIGHT_PALETTE,
  TEXT_COLOR_PALETTE
} from '../../utils/typography';

export type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const STICKY_PALETTES = [
  { name: 'yellow', bg: '#FEF08A', border: '#FACC15', text: '#713F12', subtext: '#854D0E', dogear: '#EAB308' },
  { name: 'pink', bg: '#FECDD3', border: '#FDA4AF', text: '#881337', subtext: '#9F1239', dogear: '#FB7185' },
  { name: 'mint', bg: '#A7F3D0', border: '#6EE7B7', text: '#064E3B', subtext: '#065F46', dogear: '#34D399' },
  { name: 'sky', bg: '#BAE6FD', border: '#7DD3FC', text: '#0C4A6E', subtext: '#075985', dogear: '#38BDF8' },
  { name: 'purple', bg: '#DDD6FE', border: '#C4B5FD', text: '#4C1D95', subtext: '#5B21B6', dogear: '#A78BFA' },
  { name: 'orange', bg: '#FED7AA', border: '#FDBA74', text: '#7C2D12', subtext: '#9A3412', dogear: '#FB923C' }
];

const getNodeAccentColor = (node: FlowNodeType): string => {
  if (node.style?.accentColor) {
    return node.style.accentColor;
  }
  if (node.style?.colorPalette && NODE_COLOR_PALETTES[node.style.colorPalette]) {
    return NODE_COLOR_PALETTES[node.style.colorPalette].headerBg || '#2563EB';
  }
  switch (node.type) {
    case 'sql-table':
      return '#7C3AED';
    case 'uml-class':
      return '#4F46E5';
    case 'json-viewer':
      return '#6366F1';
    case 'type-schema':
      return '#0284C7';
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
    case 'sql-table':
      return <Database size={13} />;
    case 'uml-class':
      return <Code size={13} />;
    case 'json-viewer':
      return <FileCode size={13} />;
    case 'type-schema':
      return <Table size={13} />;
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
  const [copiedJson, setCopiedJson] = useState(false);

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

  const isCustomShape =
    node.type === 'browser' ||
    node.type === 'mobile' ||
    node.type === 'desktop' ||
    node.type === 'terminal' ||
    node.type === 'database' ||
    node.type === 'nosql' ||
    node.type === 'cloud' ||
    node.type === 'decision' ||
    node.type === 'note' ||
    node.type === 'text' ||
    node.type === 'image' ||
    node.type === 'link-embed';

  const isContainer = node.type === 'container' || node.type === 'group';
  const accentColor = getNodeAccentColor(node);
  const tint = node.style.tint || (node.style.accentColor ? 'subtle' : 'none');

  // Compute card background fill
  const cardBg = isCustomShape
    ? 'transparent'
    : isContainer
    ? (node.style.bg && node.style.bg !== 'transparent' && node.style.bg !== 'auto'
        ? node.style.bg
        : tint === 'medium'
        ? `${accentColor}0F`
        : tint === 'strong'
        ? `${accentColor}1A`
        : `${accentColor}06`)
    : node.style.bg && node.style.bg !== 'auto' && node.style.bg !== 'default'
    ? node.style.bg
    : tint === 'subtle'
    ? `${accentColor}09`
    : tint === 'medium'
    ? `${accentColor}16`
    : tint === 'strong'
    ? `${accentColor}28`
    : '#FFFFFF';

  const isDarkCard = isColorDark(cardBg);

  // Preserve the sharp, distinctive colored border
  const cardBorder = isCustomShape
    ? 'transparent'
    : (node.style.borderColor || (isDarkCard ? `${accentColor}90` : accentColor));

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
                    style={{ fontWeight: 700, color: node.style.textColor }}
                  />
                ) : (
                  <span
                    className="drafo-container-title"
                    style={{ color: node.style.textColor }}
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
                <span className="drafo-container-tag" style={{ color: node.style.subtextColor }}>{node.subtitle}</span>
              )}
            </div>
          </div>
        );

      // 1. Web Browser Window
      case 'browser':
        return (
          <div
            className="drafo-node-browser-inner"
            style={{
              backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined,
              borderColor: node.style.borderColor || node.style.accentColor
            }}
          >
            <div
              className="drafo-browser-header"
              style={{ backgroundColor: node.style.accentColor || node.style.headerBg || '#2563EB' }}
            >
              <div className="drafo-browser-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div
              className="drafo-browser-body"
              style={{ backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined }}
            >
              <div className="drafo-browser-sidebar-preview" style={{ backgroundColor: `${accentColor}30` }} />
              <div className="drafo-browser-content-preview">
                <div className="drafo-preview-line line-wide" style={{ backgroundColor: `${accentColor}40` }} />
                <div className="drafo-preview-line line-mid" style={{ backgroundColor: `${accentColor}25` }} />
                <div className="drafo-preview-line line-short" style={{ backgroundColor: `${accentColor}15` }} />
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
                  style={{ color: node.style.textColor }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ color: node.style.textColor }}
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
            style={{ borderColor: node.style.borderColor || node.style.accentColor || '#1E293B' }}
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
            <div
              className="drafo-mobile-screen"
              style={{ backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined }}
            >
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                  style={{ color: node.style.textColor }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ fontSize: '13px', fontWeight: 700, color: node.style.textColor }}
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
                  style={{ color: node.style.subtextColor }}
                />
              ) : (
                <span
                  className="drafo-node-subtitle"
                  style={{ fontSize: '10.5px', marginTop: 3, color: node.style.subtextColor }}
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
            style={{
              backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined,
              borderColor: node.style.borderColor || node.style.accentColor || '#475569'
            }}
          >
            <div
              className="drafo-desktop-header"
              style={{ backgroundColor: node.style.accentColor || node.style.headerBg || '#475569' }}
            >
              <div className="drafo-desktop-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div
              className="drafo-desktop-body"
              style={{ backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined }}
            >
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
                  style={{ color: node.style.textColor }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ color: node.style.textColor }}
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
            style={{
              backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined,
              borderColor: node.style.borderColor || node.style.accentColor || '#0F172A'
            }}
          >
            <div
              className="drafo-terminal-header"
              style={{ backgroundColor: node.style.accentColor || node.style.headerBg || '#0F172A' }}
            >
              <div className="drafo-terminal-dots">
                <span className="dot dot-white" />
                <span className="dot dot-white" />
                <span className="dot dot-white" />
              </div>
            </div>

            <div
              className="drafo-terminal-body"
              style={{ backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined }}
            >
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
                  style={{ color: node.style.textColor }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ color: node.style.textColor }}
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
        const strokeColor = node.style.borderColor || node.style.accentColor || '#2563EB';
        const bodyFill =
          node.style.bg && node.style.bg !== 'auto' && node.style.bg !== 'default'
            ? node.style.bg
            : '#FFFFFF';
        const isDarkDb = isColorDark(bodyFill);
        const capFill =
          node.customData?.cylinderCapColor ||
          (isDarkDb
            ? (bodyFill === '#0F172A' ? '#1E293B' : bodyFill)
            : (bodyFill === '#FFFFFF' ? '#F8FAFC' : bodyFill));
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
                opacity={isDarkDb ? 0.35 : 0.25}
              />
              <path
                d={`M 1,${h * 0.65} A ${rx},${ry} 0 0,0 ${w - 1},${h * 0.65}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={borderWidth}
                opacity={isDarkDb ? 0.35 : 0.25}
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
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                  style={{ textAlign: 'center', fontWeight: 700, color: node.style.textColor || (isDarkDb ? '#F8FAFC' : '#0F172A') }}
                />
              ) : (
                <div
                  className="drafo-node-title db-title"
                  style={{ color: node.style.textColor || (isDarkDb ? '#F8FAFC' : '#0F172A') }}
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
                  style={{ color: node.style.subtextColor || (isDarkDb ? '#94A3B8' : '#64748B') }}
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
        const strokeColor = node.style.borderColor || node.style.accentColor || '#2563EB';
        const fillColor =
          node.style.bg && node.style.bg !== 'auto' && node.style.bg !== 'default'
            ? node.style.bg
            : '#FFFFFF';
        const isDarkCloud = isColorDark(fillColor);
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
                  backgroundColor: isDarkCloud ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.9)'
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
                  style={{ textAlign: 'center', fontWeight: 700, color: node.style.textColor || (isDarkCloud ? '#F8FAFC' : '#0F172A') }}
                />
              ) : (
                <span
                  className="drafo-node-title"
                  style={{ fontSize: '13.5px', fontWeight: 700, color: node.style.textColor || (isDarkCloud ? '#F8FAFC' : '#0F172A') }}
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
                  style={{ fontSize: '11px', marginTop: 2, color: node.style.subtextColor || (isDarkCloud ? '#94A3B8' : '#64748B') }}
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
          <div
            className="drafo-node-decision-inner"
            style={{
              backgroundColor: node.style.bg && node.style.bg !== 'auto' ? node.style.bg : undefined,
              borderColor: node.style.borderColor || node.style.accentColor
            }}
          >
            <GitFork size={18} color={node.style.textColor || node.style.accentColor || '#D97706'} style={{ marginBottom: 4 }} />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="drafo-inline-input"
                style={{ color: node.style.textColor }}
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

      // 8. Redesigned Modern Tactile Sticky Note
      case 'note': {
        const activeBg = node.style.bg && node.style.bg !== 'auto' ? node.style.bg : '#FEF08A';
        const matchedPalette =
          STICKY_PALETTES.find((p) => p.bg.toLowerCase() === activeBg.toLowerCase()) ||
          STICKY_PALETTES[0];
        const noteBorder = node.style.borderColor || matchedPalette.border;
        const noteText = node.style.textColor || matchedPalette.text;
        const noteSubtext = node.style.subtextColor || matchedPalette.subtext;

        const noteFontFamilyKey = node.customData?.fontFamily;
        const noteFontFamilyCss = noteFontFamilyKey ? FONT_FAMILY_MAP[noteFontFamilyKey] : undefined;
        const noteFontSize = node.customData?.fontSize ? `${node.customData.fontSize}px` : undefined;
        const noteTextAlign = node.customData?.textAlign;
        const noteFontStyle = node.customData?.fontStyle;
        const noteTextDecoration = node.customData?.textDecoration;
        const noteFontWeight = node.customData?.fontWeight;

        return (
          <div
            className="drafo-node-note-inner"
            style={{
              backgroundColor: activeBg,
              borderColor: noteBorder,
              color: noteText
            }}
          >
            {/* Top Adhesive Tape / Glue Highlight Strip */}
            <div className="drafo-sticky-adhesive-strip" />

            {/* Note Content Area */}
            <div className="drafo-sticky-content">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  className="drafo-inline-input drafo-sticky-title-input"
                  style={{ color: noteText }}
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
                  className="drafo-node-title drafo-sticky-title"
                  style={{ color: noteText }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title || 'Note'}
                </div>
              )}

              {isEditingSubtitle ? (
                <textarea
                  ref={subtitleInputRef}
                  value={tempSubtitle}
                  className="drafo-inline-textarea drafo-sticky-body-input"
                  rows={3}
                  style={{
                    color: noteSubtext,
                    fontFamily: noteFontFamilyCss,
                    fontSize: noteFontSize,
                    textAlign: noteTextAlign,
                    fontStyle: noteFontStyle,
                    textDecoration: noteTextDecoration,
                    fontWeight: noteFontWeight
                  }}
                  placeholder="Write a note..."
                  onChange={(e) => setTempSubtitle(e.target.value)}
                  onBlur={handleSubtitleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setTempSubtitle(node.subtitle || '');
                      setIsEditingSubtitle(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div
                  className="drafo-node-subtitle drafo-sticky-body"
                  style={{
                    color: noteSubtext,
                    fontFamily: noteFontFamilyCss,
                    fontSize: noteFontSize,
                    textAlign: noteTextAlign,
                    fontStyle: noteFontStyle,
                    textDecoration: noteTextDecoration,
                    fontWeight: noteFontWeight
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSubtitle(true);
                  }}
                  title="Double click to edit note body"
                >
                  {node.subtitle || 'Double click to write notes...'}
                </div>
              )}
            </div>

            {/* Realistic 3D Folded Dog-Ear Paper Peel Corner */}
            <div className="drafo-sticky-dogear" style={{ pointerEvents: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" className="drafo-dogear-svg">
                <path d="M 0,24 L 24,0 L 24,24 Z" fill="rgba(0,0,0,0.14)" />
                <path d="M 0,24 L 24,0 L 0,0 Z" fill={matchedPalette.dogear} opacity="0.75" />
              </svg>
            </div>

            {/* Quick Color Picker Swatches (Visible on selection or hover) */}
            {isSelected && (
              <div className="drafo-sticky-swatches" onClick={(e) => e.stopPropagation()}>
                {STICKY_PALETTES.map((pal) => (
                  <button
                    key={pal.name}
                    type="button"
                    className={`drafo-sticky-swatch-dot ${
                      activeBg.toLowerCase() === pal.bg.toLowerCase() ? 'active' : ''
                    }`}
                    style={{ backgroundColor: pal.bg, borderColor: pal.border }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        ...node,
                        style: {
                          ...node.style,
                          bg: pal.bg,
                          borderColor: pal.border,
                          textColor: pal.text,
                          subtextColor: pal.subtext
                        }
                      });
                    }}
                    title={`Change note color to ${pal.name}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      // Standalone Floating Text Annotation
      case 'text': {
        const textColor = node.style.textColor || '#0F172A';
        const fontSize = node.customData?.fontSize || 16;
        const fontFamilyKey = node.customData?.fontFamily || 'sans';
        const fontFamilyCss = FONT_FAMILY_MAP[fontFamilyKey] || 'inherit';
        const fontWeight = node.customData?.fontWeight || 500;
        const fontStyle = node.customData?.fontStyle || 'normal';
        const textDecoration = node.customData?.textDecoration || 'none';
        const textTransform = node.customData?.textTransform || 'none';
        const textAlign = node.customData?.textAlign || 'left';
        const lineHeight = node.customData?.lineHeight || 1.4;
        const letterSpacing = node.customData?.letterSpacing || 'normal';
        const textHighlight =
          node.customData?.textHighlight && node.customData.textHighlight !== 'transparent'
            ? node.customData.textHighlight
            : undefined;

        const isBold = fontWeight === 'bold' || fontWeight === 700 || fontWeight === 600;
        const isItalic = fontStyle === 'italic';
        const isUnderline = textDecoration === 'underline';
        const isStrike = textDecoration === 'line-through';

        const updateCustom = (patch: Partial<NonNullable<FlowNodeType['customData']>>) => {
          onUpdate({
            ...node,
            customData: {
              ...node.customData,
              ...patch
            }
          });
        };

        const updateTextColor = (color: string) => {
          onUpdate({
            ...node,
            style: {
              ...node.style,
              textColor: color
            }
          });
        };

        return (
          <div
            className={`drafo-node-text-inner ${isSelected ? 'selected' : ''}`}
            style={{
              color: textColor,
              fontSize: `${fontSize}px`,
              fontFamily: fontFamilyCss,
              fontWeight: fontWeight,
              fontStyle: fontStyle,
              textDecoration: textDecoration,
              textTransform: textTransform,
              textAlign: textAlign,
              lineHeight: lineHeight,
              letterSpacing: letterSpacing,
              backgroundColor: textHighlight || 'transparent',
              borderRadius: textHighlight ? '4px' : undefined,
              padding: textHighlight ? '4px 8px' : undefined,
              transition: 'background-color 0.15s ease'
            }}
          >
            {/* Quick Floating Format Toolbar (Shown when node is selected) */}
            {isSelected && (
              <div
                className="drafo-text-floating-toolbar"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Font Family Quick Select */}
                <select
                  value={fontFamilyKey}
                  onChange={(e) => updateCustom({ fontFamily: e.target.value as any })}
                  className="drafo-text-tb-select"
                  title="Font Family"
                >
                  <option value="sans">Inter (Sans)</option>
                  <option value="display">Google Sans</option>
                  <option value="serif">Merriweather</option>
                  <option value="mono">JetBrains Mono</option>
                  <option value="hand">Caveat (Hand)</option>
                </select>

                {/* Font Size Stepper */}
                <div className="drafo-text-tb-size-stepper">
                  <button
                    type="button"
                    className="drafo-text-tb-btn"
                    onClick={() => updateCustom({ fontSize: Math.max(8, fontSize - 1) })}
                    title="Smaller"
                  >
                    -
                  </button>
                  <span className="drafo-text-tb-size-val">{fontSize}</span>
                  <button
                    type="button"
                    className="drafo-text-tb-btn"
                    onClick={() => updateCustom({ fontSize: Math.min(120, fontSize + 1) })}
                    title="Larger"
                  >
                    +
                  </button>
                </div>

                <div className="drafo-text-tb-divider" />

                {/* Bold */}
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${isBold ? 'active' : ''}`}
                  onClick={() => updateCustom({ fontWeight: isBold ? 400 : 'bold' })}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${isItalic ? 'active' : ''}`}
                  onClick={() => updateCustom({ fontStyle: isItalic ? 'normal' : 'italic' })}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${isUnderline ? 'active' : ''}`}
                  onClick={() => updateCustom({ textDecoration: isUnderline ? 'none' : 'underline' })}
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={13} />
                </button>

                {/* Strike */}
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${isStrike ? 'active' : ''}`}
                  onClick={() => updateCustom({ textDecoration: isStrike ? 'none' : 'line-through' })}
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>

                <div className="drafo-text-tb-divider" />

                {/* Alignments */}
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => updateCustom({ textAlign: 'left' })}
                  title="Align Left"
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => updateCustom({ textAlign: 'center' })}
                  title="Align Center"
                >
                  <AlignCenter size={13} />
                </button>
                <button
                  type="button"
                  className={`drafo-text-tb-btn ${textAlign === 'right' ? 'active' : ''}`}
                  onClick={() => updateCustom({ textAlign: 'right' })}
                  title="Align Right"
                >
                  <AlignRight size={13} />
                </button>

                <div className="drafo-text-tb-divider" />

                {/* Text Color Picker */}
                <label className="drafo-text-tb-color-picker" title="Text Color">
                  <span
                    className="drafo-text-tb-color-preview"
                    style={{ backgroundColor: textColor }}
                  />
                  <input
                    type="color"
                    value={textColor.startsWith('#') ? textColor : '#0F172A'}
                    onChange={(e) => updateTextColor(e.target.value)}
                    className="drafo-color-native-hidden"
                  />
                </label>

                {/* Highlighter Marker Toggle */}
                <div className="drafo-text-tb-highlight-group" title="Highlighter Marker">
                  <Highlighter size={13} color={textHighlight ? '#D97706' : '#64748B'} />
                  <div className="drafo-text-tb-highlight-pills">
                    {TEXT_HIGHLIGHT_PALETTE.slice(0, 5).map((hp) => (
                      <button
                        key={hp.name}
                        type="button"
                        className={`drafo-text-tb-hl-dot ${(textHighlight || 'transparent').toLowerCase() === hp.color.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: hp.color === 'transparent' ? '#E2E8F0' : hp.color }}
                        onClick={() => updateCustom({ textHighlight: hp.color })}
                        title={hp.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isEditingTitle ? (
              <textarea
                ref={subtitleInputRef}
                value={tempTitle}
                className="drafo-inline-textarea drafo-text-node-input"
                style={{
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamilyCss,
                  fontWeight: fontWeight,
                  fontStyle: fontStyle,
                  textDecoration: textDecoration,
                  textTransform: textTransform,
                  textAlign: textAlign,
                  lineHeight: lineHeight,
                  letterSpacing: letterSpacing
                }}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTempTitle(node.title);
                    setIsEditingTitle(false);
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    updateCustom({ fontWeight: isBold ? 400 : 'bold' });
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                    e.preventDefault();
                    updateCustom({ fontStyle: isItalic ? 'normal' : 'italic' });
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    updateCustom({ textDecoration: isUnderline ? 'none' : 'underline' });
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                className="drafo-text-node-content"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                title="Double click to edit text (Ctrl+B bold, Ctrl+I italic, Ctrl+U underline)"
              >
                {node.title || 'Type text here...'}
              </div>
            )}
          </div>
        );
      }

      // Image Node (Pasted or uploaded base64 / URL images)
      case 'image': {
        const imageUrl = node.customData?.imageUrl;
        return (
          <div className="drafo-node-image-inner">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={node.title || 'Pasted Image'}
                className="drafo-image-node-img"
                draggable={false}
              />
            ) : (
              <div className="drafo-image-node-placeholder">
                <ImageIcon size={24} color="#94A3B8" />
                <span>No Image Data</span>
              </div>
            )}
            {node.title && node.title !== 'Image' && (
              <div className="drafo-image-node-caption">{node.title}</div>
            )}
          </div>
        );
      }

      // Rich Link Embed Card (Automatic link preview & embedding)
      case 'link-embed': {
        const linkUrl = node.customData?.linkUrl || '';
        let domain = 'link';
        try {
          if (linkUrl) {
            domain = new URL(linkUrl).hostname.replace(/^www\./, '');
          }
        } catch {}

        const faviconUrl =
          node.customData?.linkFavicon ||
          `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        return (
          <div className="drafo-node-link-embed-inner">
            {/* Top Domain Header */}
            <div className="drafo-link-embed-header">
              <div className="drafo-link-embed-domain-pill">
                <img
                  src={faviconUrl}
                  alt=""
                  className="drafo-link-embed-favicon"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="drafo-link-domain-text">{domain}</span>
              </div>
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="drafo-link-external-btn"
                  onClick={(e) => e.stopPropagation()}
                  title={`Open ${linkUrl} in new tab`}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Title & Description */}
            <div className="drafo-link-embed-body">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  className="drafo-inline-input drafo-link-title-input"
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
                  className="drafo-link-embed-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit title"
                >
                  {node.title || domain}
                </div>
              )}

              {linkUrl && (
                <div className="drafo-link-embed-url" title={linkUrl}>
                  {linkUrl}
                </div>
              )}

              {node.subtitle && (
                <div
                  className="drafo-link-embed-notes"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSubtitle(true);
                  }}
                  title="Double click to edit description"
                >
                  {node.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      }

      // 9. Relational SQL Database Schema Table
      case 'sql-table': {
        const columns = node.customData?.sqlColumns || [];
        const tableName = node.title || node.customData?.sqlTableName || 'database_table';
        const schemaName = node.customData?.sqlSchemaName || 'public';
        const headerBg = node.style.headerBg || accentColor;
        const isDarkHeader = isColorDark(headerBg);

        return (
          <div className="drafo-sql-table-inner">
            {/* Table Header with DB Icon, Table Name, and Schema Tag */}
            <div
              className="drafo-sql-table-header"
              style={{
                backgroundColor: headerBg,
                color: isDarkHeader ? '#FFFFFF' : '#0F172A'
              }}
            >
              <div className="drafo-sql-table-header-left">
                <Database size={13} style={{ opacity: 0.9 }} />
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    className="drafo-inline-input"
                    style={{ color: isDarkHeader ? '#FFFFFF' : '#0F172A', fontWeight: 700 }}
                  />
                ) : (
                  <span
                    className="drafo-sql-table-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                    }}
                    title="Double-click to edit table name"
                  >
                    {tableName}
                  </span>
                )}
              </div>
              <span
                className="drafo-sql-schema-pill"
                style={{
                  backgroundColor: isDarkHeader ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                  color: isDarkHeader ? '#FFFFFF' : '#0F172A'
                }}
              >
                {schemaName}
              </span>
            </div>

            {/* Column Rows */}
            <div className="drafo-sql-columns-list">
              {columns.length === 0 ? (
                <div className="drafo-sql-empty-state">No columns defined</div>
              ) : (
                columns.map((col, idx) => (
                  <div key={`${col.name}-${idx}`} className="drafo-sql-column-row">
                    <div className="drafo-sql-col-left">
                      {col.isPk ? (
                        <span className="drafo-sql-key-badge pk" title="Primary Key">
                          <Key size={10} color="#D97706" />
                        </span>
                      ) : col.isFk ? (
                        <span className="drafo-sql-key-badge fk" title={`Foreign Key: ${col.fkTarget || ''}`}>
                          <Link size={10} color="#2563EB" />
                        </span>
                      ) : (
                        <span className="drafo-sql-key-spacer" />
                      )}
                      <span className={`drafo-sql-col-name ${col.isPk ? 'is-pk' : ''}`}>{col.name}</span>
                    </div>

                    <div className="drafo-sql-col-right">
                      <span className="drafo-sql-type-chip">{col.type}</span>
                      {!col.isNullable && !col.isPk && (
                        <span className="drafo-sql-nn-badge" title="NOT NULL">
                          NN
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Node Tags */}
            {node.tags && node.tags.length > 0 && (
              <div className="drafo-node-tags-wrap" style={{ padding: '4px 8px' }}>
                {node.tags.map((tag) => (
                  <span key={tag} className="drafo-node-tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }

      // 10. Object-Oriented UML Class Diagram Card
      case 'uml-class': {
        const members = node.customData?.umlMembers || [];
        const stereotype = node.customData?.umlStereotype || node.subtitle || '<<class>>';
        const attributes = members.filter((m) => !m.isMethod);
        const methods = members.filter((m) => m.isMethod);
        const headerBg = node.style.headerBg || (isDarkCard ? '#1E293B' : '#F8FAFC');

        return (
          <div className="drafo-uml-class-inner">
            {/* Header with Stereotype and Class Name */}
            <div
              className="drafo-uml-class-header"
              style={{
                backgroundColor: headerBg,
                borderBottom: `1px solid ${cardBorder}`
              }}
            >
              {stereotype && <span className="drafo-uml-stereotype">{stereotype}</span>}
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="drafo-inline-input"
                  style={{ color: node.style.textColor, fontWeight: 700, textAlign: 'center' }}
                />
              ) : (
                <span
                  className="drafo-uml-class-title"
                  style={{ color: node.style.textColor }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double-click to edit class name"
                >
                  {node.title}
                </span>
              )}
            </div>

            {/* Attributes Compartment */}
            {attributes.length > 0 && (
              <div className="drafo-uml-compartment attributes">
                {attributes.map((attr, idx) => (
                  <div key={`attr-${idx}`} className="drafo-uml-member-row">
                    <span className={`drafo-uml-vis-icon vis-${attr.visibility || '+'}`}>
                      {attr.visibility || '+'}
                    </span>
                    <span className="drafo-uml-member-name">{attr.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Methods Compartment */}
            {methods.length > 0 && (
              <div
                className="drafo-uml-compartment methods"
                style={{
                  borderTop: attributes.length > 0 ? `1px solid ${cardBorder}40` : undefined
                }}
              >
                {methods.map((method, idx) => (
                  <div key={`meth-${idx}`} className="drafo-uml-member-row">
                    <span className={`drafo-uml-vis-icon vis-${method.visibility || '+'}`}>
                      {method.visibility || '+'}
                    </span>
                    <span className="drafo-uml-member-name method">{method.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback if no members */}
            {members.length === 0 && (
              <div className="drafo-uml-empty-state">
                <span>(No members defined)</span>
              </div>
            )}

            {/* Tags */}
            {node.tags && node.tags.length > 0 && (
              <div className="drafo-node-tags-wrap" style={{ padding: '4px 8px' }}>
                {node.tags.map((tag) => (
                  <span key={tag} className="drafo-node-tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }

      // 11. Interactive JSON Data & Payload Viewer Card
      case 'json-viewer': {
        const jsonData = node.customData?.jsonData;
        const rawJson = node.customData?.jsonRaw || (jsonData ? JSON.stringify(jsonData, null, 2) : '');

        const handleCopyJson = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (rawJson) {
            navigator.clipboard.writeText(rawJson);
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
          }
        };

        const renderJsonBody = () => {
          if (!jsonData || typeof jsonData !== 'object') {
            return (
              <div className="drafo-json-primitive-val">
                <code>{String(jsonData)}</code>
              </div>
            );
          }

          if (Array.isArray(jsonData)) {
            return (
              <div className="drafo-json-array-preview">
                <span className="drafo-json-badge array">Array({jsonData.length})</span>
                {jsonData.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="drafo-json-array-item">
                    <span className="idx">[{idx}]</span>
                    <span className="val">
                      {typeof item === 'object' && item !== null
                        ? `{ ${Object.keys(item).slice(0, 3).join(', ')}... }`
                        : String(item)}
                    </span>
                  </div>
                ))}
                {jsonData.length > 6 && (
                  <div className="drafo-json-more">+{jsonData.length - 6} more items</div>
                )}
              </div>
            );
          }

          const entries = Object.entries(jsonData).slice(0, 10);
          return (
            <div className="drafo-json-entries-list">
              {entries.map(([k, v]) => {
                let valType: string = typeof v;
                let displayVal = String(v);
                let badgeClass = 'val-primitive';

                if (v === null) {
                  valType = 'null';
                  displayVal = 'null';
                  badgeClass = 'val-null';
                } else if (valType === 'string') {
                  displayVal = `"${v}"`;
                  badgeClass = 'val-string';
                } else if (valType === 'number') {
                  badgeClass = 'val-number';
                } else if (valType === 'boolean') {
                  badgeClass = 'val-boolean';
                } else if (Array.isArray(v)) {
                  displayVal = `[${v.length} items]`;
                  badgeClass = 'val-array';
                } else if (valType === 'object') {
                  displayVal = `{${Object.keys(v as object).length} keys}`;
                  badgeClass = 'val-object';
                }

                return (
                  <div key={k} className="drafo-json-entry-row">
                    <span className="drafo-json-key">{k}:</span>
                    <span className={`drafo-json-val ${badgeClass}`} title={displayVal}>
                      {displayVal}
                    </span>
                  </div>
                );
              })}
              {jsonData && typeof jsonData === 'object' && Object.keys(jsonData as object).length > 10 && (
                <div className="drafo-json-more">+{Object.keys(jsonData as object).length - 10} more keys</div>
              )}
            </div>
          );
        };

        return (
          <div className="drafo-json-viewer-inner">
            <div
              className="drafo-json-header"
              style={{
                backgroundColor: isDarkCard ? '#1E293B' : '#F1F5F9',
                borderBottom: `1px solid ${cardBorder}40`
              }}
            >
              <div className="drafo-json-header-left">
                <Code size={12} color="#6366F1" />
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    className="drafo-inline-input"
                    style={{ color: node.style.textColor, fontWeight: 600 }}
                  />
                ) : (
                  <span
                    className="drafo-json-title"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                    }}
                    title="Double-click to edit title"
                  >
                    {node.title || '{ } JSON Object'}
                  </span>
                )}
              </div>

              {rawJson && (
                <button
                  className="drafo-json-copy-btn"
                  onClick={handleCopyJson}
                  title="Copy raw JSON"
                >
                  {copiedJson ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                </button>
              )}
            </div>

            <div className="drafo-json-content-body">{renderJsonBody()}</div>

            {node.tags && node.tags.length > 0 && (
              <div className="drafo-node-tags-wrap" style={{ padding: '4px 8px' }}>
                {node.tags.map((tag) => (
                  <span key={tag} className="drafo-node-tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }

      // 12. Type & Contract Schema Card (TypeScript & GraphQL)
      case 'type-schema': {
        const properties = node.customData?.schemaProperties || [];
        const kind = node.customData?.schemaKind || 'typescript';
        const badgeLabel = kind === 'graphql' ? 'GraphQL' : kind === 'jsonschema' ? 'Schema' : 'TypeScript';
        const headerBg = node.style.headerBg || accentColor;
        const isDarkHeader = isColorDark(headerBg);

        return (
          <div className="drafo-type-schema-inner">
            {/* Header */}
            <div
              className="drafo-type-schema-header"
              style={{
                backgroundColor: headerBg,
                color: isDarkHeader ? '#FFFFFF' : '#0F172A'
              }}
            >
              <div className="drafo-type-schema-header-left">
                <Table size={12} />
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    className="drafo-inline-input"
                    style={{ color: isDarkHeader ? '#FFFFFF' : '#0F172A', fontWeight: 700 }}
                  />
                ) : (
                  <span
                    className="drafo-type-schema-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                    }}
                    title="Double-click to edit type name"
                  >
                    {node.title}
                  </span>
                )}
              </div>
              <span
                className="drafo-type-kind-pill"
                style={{
                  backgroundColor: isDarkHeader ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                  color: isDarkHeader ? '#FFFFFF' : '#0F172A'
                }}
              >
                {badgeLabel}
              </span>
            </div>

            {/* Properties List */}
            <div className="drafo-type-properties-list">
              {properties.length === 0 ? (
                <div className="drafo-type-empty-state">No properties defined</div>
              ) : (
                properties.map((prop, idx) => (
                  <div key={`${prop.name}-${idx}`} className="drafo-type-prop-row">
                    <div className="drafo-type-prop-left">
                      <span className="drafo-type-prop-name">{prop.name}</span>
                      {!prop.required && <span className="drafo-type-optional-tag">?</span>}
                    </div>
                    <div className="drafo-type-prop-right">
                      <span className="drafo-type-badge">{prop.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {node.tags && node.tags.length > 0 && (
              <div className="drafo-node-tags-wrap" style={{ padding: '4px 8px' }}>
                {node.tags.map((tag) => (
                  <span key={tag} className="drafo-node-tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }

      // 13. Enhanced Universal Architecture Service Cards
      default: {
        return (
          <div className="drafo-node-standard-inner">
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
                  style={{ color: isDarkCard ? '#F8FAFC' : '#0F172A' }}
                />
              ) : (
                <div
                  className="drafo-node-title"
                  style={{ color: node.style.textColor || (isDarkCard ? '#F8FAFC' : '#0F172A') }}
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
                  style={{ color: isDarkCard ? '#CBD5E1' : '#475569' }}
                  rows={2}
                />
              ) : (
                (node.subtitle !== undefined || isSelected) && (
                  <div
                    className="drafo-node-subtitle"
                    style={{
                      color: node.style.subtextColor || (isDarkCard ? '#94A3B8' : '#64748B'),
                      fontSize: '11.5px',
                      cursor: 'text'
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingSubtitle(true);
                    }}
                    title="Double click to edit subtitle"
                  >
                    {node.subtitle || (isSelected ? '<add subtitle>' : '')}
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

      {/* Interactive Connection Ports (Top, Right, Bottom, Left) - Only for regular nodes, never container/group zones */}
      {!isContainer && (
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
      )}
    </div>
  );
};

function flowNodeAreEqual(prev: FlowNodeProps, next: FlowNodeProps): boolean {
  // Re-render only when the node data or selection/sim status changes
  // Callback prop reference changes (from parent inline arrows) are intentionally ignored
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isSimActive !== next.isSimActive) return false;
  if (prev.isSimTarget !== next.isSimTarget) return false;
  const a = prev.node;
  const b = next.node;
  return (
    a.id === b.id &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.status === b.status &&
    a.isLocked === b.isLocked &&
    a.type === b.type &&
    a.metric === b.metric &&
    JSON.stringify(a.style) === JSON.stringify(b.style) &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    JSON.stringify(a.customData) === JSON.stringify(b.customData)
  );
}

export const FlowNodeMemo = memo(FlowNode, flowNodeAreEqual);
