export type NodeType =
  | 'standard'
  | 'browser'
  | 'mobile'
  | 'desktop'
  | 'terminal'
  | 'server'
  | 'client'
  | 'client-form'
  | 'client-props'
  | 'action'
  | 'api'
  | 'microservice'
  | 'serverless'
  | 'worker'
  | 'gateway'
  | 'loadbalancer'
  | 'middleware'
  | 'database'
  | 'nosql'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'cloud'
  | 'kubernetes'
  | 'auth'
  | 'cdn'
  | 'decision'
  | 'note'
  | 'custom-card'
  | 'section-header'
  | 'container'
  | 'group';

export type NodeStatus = 'online' | 'idle' | 'busy' | 'error' | 'none';

export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type RouteType = 'orthogonal' | 'curved' | 'straight';

export type ArrowheadType = 'arrow' | 'open' | 'circle' | 'none';

export interface NodeStyle {
  bg: string;
  borderColor: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: LineStyle;
  textColor?: string;
  subtextColor?: string;
  headerBg?: string;
  headerColor?: string;
  colorPalette?: string;
  accentColor?: string;
  tint?: 'none' | 'subtle' | 'medium' | 'strong' | string;
  isDashed?: boolean;
  shadow?: boolean;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  details?: string;
  tags?: string[];
  status?: NodeStatus;
  metric?: string;
  style: NodeStyle;
  icon?: string;
  sectionId?: string;
  customData?: {
    browserDots?: boolean;
    urlBarText?: string;
    cylinderCapColor?: string;
    pillNumber?: string;
    actionTag?: string;
    terminalCommand?: string;
    deviceType?: 'iphone' | 'android' | 'tablet';
    badgeColor?: string;
    isContainer?: boolean;
    containerLabel?: string;
    childNodeIds?: string[];
  };
  isLocked?: boolean;
}

export interface FlowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: PortPosition;
  toPort: PortPosition;
  label: string;
  stepNumber?: string | number;
  lineStyle: LineStyle;
  routeType: RouteType;
  color: string;
  width: number;
  arrowhead: ArrowheadType;
  bidirectional?: boolean;
  isAnimated?: boolean;
  latency?: string;
}

export interface FlowSection {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  color?: string;
  x?: number;
  y: number;
  pillBg: string;
  pillTextColor: string;
  pillBorderColor: string;
  hasDivider: boolean;
  isLocked?: boolean;
}

export interface CanvasSettings {
  showGrid: boolean;
  gridType: 'dots' | 'lines' | 'none';
  bgColor: string;
  snapToGrid: boolean;
  gridSize: number;
  theme: 'light' | 'dark' | 'slate';
}

export interface FlowProject {
  id: string;
  name: string;
  description?: string;
  version: string;
  updatedAt: string;
  tags?: string[];
  thumbnailColor?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  sections: FlowSection[];
  canvasSettings: CanvasSettings;
}
