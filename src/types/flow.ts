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
  | 'group'
  | 'sql-table'
  | 'uml-class'
  | 'json-viewer'
  | 'type-schema'
  | 'text'
  | 'image'
  | 'link-embed';

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

export interface SqlColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

export interface UmlMember {
  name: string;
  type?: string;
  visibility?: '+' | '-' | '#' | '~';
  isMethod?: boolean;
  parameters?: string;
  returnType?: string;
}

export interface SchemaProperty {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
}

export interface FlowNodeCustomData {
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
  // Visual schema and model fields
  sqlColumns?: SqlColumn[];
  sqlTableName?: string;
  sqlSchemaName?: string;
  umlStereotype?: string;
  umlMembers?: UmlMember[];
  jsonData?: any;
  jsonRaw?: string;
  schemaProperties?: SchemaProperty[];
  schemaKind?: 'typescript' | 'graphql' | 'jsonschema' | 'protobuf';
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkFavicon?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textHighlight?: string;
  stickyColor?: string;
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
  customData?: FlowNodeCustomData;
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
  arrowheadStart?: ArrowheadType;
  bidirectional?: boolean;
  isAnimated?: boolean;
  latency?: string;
  controlPoint?: { x: number; y: number };
  waypoints?: { x: number; y: number }[];
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
