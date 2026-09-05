'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { FlowEdge as FlowEdgeType, FlowNode, RouteType, LineStyle } from '../../types/flow';
import { calculateEdgePath, formatFullLabel, wrapEdgeLabel, measureEdgeLabelWidth } from '../../utils/routing';
import { ArrowLeftRight, Trash2, Zap, RotateCcw } from 'lucide-react';

interface FlowEdgeProps {
  edge: FlowEdgeType;
  sourceNode: FlowNode;
  targetNode: FlowNode;
  isSelected: boolean;
  isSimActive?: boolean;
  dragEndpointPos?: { endpoint: 'source' | 'target'; point: { x: number; y: number } } | null;
  multiEdgeOffset?: number;
  labelOffset?: { x: number; y: number };
  onSelect: (edgeId: string, e: React.MouseEvent) => void;
  onUpdate: (updatedEdge: FlowEdgeType) => void;
  onDelete?: (edgeId: string) => void;
  onAddWaypoint?: (edgeId: string, point?: { x: number; y: number }, e?: React.MouseEvent) => void;
  onStartDragWaypoint?: (edgeId: string, waypointIndex?: number, e?: React.MouseEvent) => void;
  onStartDragEndpoint?: (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => void;
}

export const FlowEdge: React.FC<FlowEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  isSimActive,
  dragEndpointPos,
  multiEdgeOffset,
  labelOffset,
  onSelect,
  onUpdate,
  onDelete,
  onAddWaypoint,
  onStartDragWaypoint,
  onStartDragEndpoint
}) => {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(edge.label);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempLabel(edge.label);
  }, [edge.label]);

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleLabelSubmit = () => {
    setIsEditingLabel(false);
    onUpdate({ ...edge, label: tempLabel });
  };

  const sourceOverride =
    dragEndpointPos?.endpoint === 'source' ? dragEndpointPos.point : undefined;
  const targetOverride =
    dragEndpointPos?.endpoint === 'target' ? dragEndpointPos.point : undefined;

  const { path, labelPosition, sourcePoint, targetPoint } = calculateEdgePath(
    sourceNode,
    targetNode,
    edge.fromPort,
    edge.toPort,
    edge.routeType || 'curved',
    edge.controlPoint,
    sourceOverride,
    targetOverride,
    multiEdgeOffset,
    edge.waypoints
  );

  const finalLabelPosition = labelOffset
    ? { x: labelPosition.x + labelOffset.x, y: labelPosition.y + labelOffset.y }
    : labelPosition;

  const strokeColor = isSelected ? '#2563EB' : edge.color || '#000000';
  const colorKey = strokeColor.replace('#', '');
  const arrowheadType = edge.arrowhead || 'arrow';

  const markerEnd =
    arrowheadType === 'none'
      ? undefined
      : `url(#marker-${arrowheadType}-${colorKey})`;

  const startArrowhead = edge.arrowheadStart || (edge.bidirectional ? edge.arrowhead : 'none');
  const markerStart =
    startArrowhead && startArrowhead !== 'none'
      ? `url(#marker-${startArrowhead}-start-${colorKey})`
      : undefined;

  const strokeDash =
    edge.lineStyle === 'dashed'
      ? '7,5'
      : edge.lineStyle === 'dotted'
      ? '2.5,4.5'
      : edge.isAnimated
      ? '6,4'
      : 'none';

  const fullLabelText = formatFullLabel(
    edge.label || (isSelected ? '<add step label>' : ''),
    edge.stepNumber
  );
  const labelLines = wrapEdgeLabel(fullLabelText);
  const labelLineHeight = 14;
  const labelTotalHeight = (labelLines.length - 1) * labelLineHeight;
  const labelStartDy = -labelTotalHeight / 2;
  const latencyOffsetY = labelLines.length > 1 ? labelLines.length * 8 + 10 : 15;

  // Accurately measure text width using Canvas 2D / proportional metrics to guarantee text never spills outside white bg
  const maxLineWidth = labelLines.reduce(
    (max, line) => Math.max(max, measureEdgeLabelWidth(line, isSelected)),
    0
  );
  // Snug, crisp background pill: 8px padding on each side (+16px total) so text stays cleanly inside rounded corners
  const labelBgWidth = Math.max(28, Math.ceil(maxLineWidth) + 16);
  const labelBgHeight = labelLines.length * labelLineHeight + 6;


  return (
    <g
      className={`drafo-flow-edge ${isSelected ? 'selected' : ''} ${
        isSimActive ? 'sim-active' : ''
      } ${edge.isAnimated ? 'is-animated-edge' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(edge.id, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isSelected && onAddWaypoint) {
          onAddWaypoint(edge.id, undefined, e);
        } else {
          onSelect(edge.id, e);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider hit area for easy selection */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="drafo-edge-hitbox"
      />

      {/* Glowing Hover Aura Tube */}
      {(isHovered || isSelected) && (
        <path
          d={path}
          fill="none"
          stroke={isSelected ? 'rgba(37, 99, 235, 0.22)' : 'rgba(59, 130, 246, 0.16)'}
          strokeWidth={isSelected ? 10 : 8}
          strokeLinecap={markerEnd || markerStart ? 'butt' : 'round'}
          className="drafo-edge-glow-path"
        />
      )}

      {/* Main Connector Path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : Math.max(2.5, edge.width || 2.5)}
        strokeDasharray={strokeDash}
        markerStart={markerStart}
        markerEnd={markerEnd}
        strokeLinecap={markerEnd || markerStart ? 'butt' : 'round'}
        strokeLinejoin="round"
        className={`drafo-edge-path ${edge.isAnimated ? 'is-animated' : ''}`}
      />

      {/* Simulation Signal Pulse Dot OR Edge Live Animated Pulse */}
      {(isSimActive || edge.isAnimated) && (
        <circle r={4.5} fill={isSelected ? '#2563EB' : strokeColor} className="drafo-sim-pulse-dot">
          <animateMotion path={path} dur={edge.isAnimated ? '1.8s' : '1.2s'} repeatCount="indefinite" />
        </circle>
      )}

      {/* Step Label / Badge / Latency */}
      {(edge.label || edge.stepNumber !== undefined || edge.latency || isSelected || isEditingLabel) && (
        <g
          transform={`translate(${finalLabelPosition.x}, ${finalLabelPosition.y})`}
          className="drafo-edge-label-group"
        >
          {isEditingLabel ? (
            <foreignObject x={-110} y={-16} width={220} height={32}>
              <div className="drafo-edge-input-container">
                <input
                  ref={inputRef}
                  type="text"
                  value={tempLabel}
                  onChange={(e) => setTempLabel(e.target.value)}
                  onBlur={handleLabelSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleLabelSubmit()}
                  className="drafo-edge-inline-input"
                />
              </div>
            </foreignObject>
          ) : (
            <g
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingLabel(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <title>Double click to edit step label</title>
              {/* Background pill behind label */}
              {fullLabelText && (
                <rect
                  x={-labelBgWidth / 2}
                  y={-labelBgHeight / 2}
                  width={labelBgWidth}
                  height={labelBgHeight}
                  rx={labelLines.length > 1 ? 6 : 5}
                  fill="#FFFFFF"
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth={1}
                />
              )}
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                className="drafo-edge-label-text"
              >
                {labelLines.map((line, idx) => (
                  <tspan
                    key={idx}
                    x={0}
                    dy={idx === 0 ? labelStartDy : labelLineHeight}
                  >
                    {line}
                  </tspan>
                ))}
              </text>

              {/* Latency badge pill */}
              {edge.latency && (
                <g transform={`translate(0, ${latencyOffsetY})`}>
                  <rect
                    x={-24}
                    y={-7}
                    width={48}
                    height={14}
                    rx={7}
                    fill="#10B981"
                    opacity={0.9}
                  />
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="700"
                  >
                    ⚡ {edge.latency}
                  </text>
                </g>
              )}
            </g>
          )}


        </g>
      )}
    </g>
  );
};

export interface FlowEdgeHandlesProps {
  edge: FlowEdgeType;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
  labelPosition: { x: number; y: number };
  waypointPosition: { x: number; y: number };
  waypointPositions?: { x: number; y: number }[];
  onStartDragWaypoint?: (edgeId: string, waypointIndex: number, e: React.MouseEvent) => void;
  onStartDragEndpoint?: (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => void;
  onResetWaypoint?: (edgeId: string) => void;
  onDeleteWaypoint?: (edgeId: string, waypointIndex: number) => void;
  onAddWaypoint?: (edgeId: string, point?: { x: number; y: number }) => void;
  onUpdate?: (updatedEdge: FlowEdgeType) => void;
  onDelete?: (edgeId: string) => void;
}

export const FlowEdgeHandles: React.FC<FlowEdgeHandlesProps> = ({
  edge,
  sourcePoint,
  targetPoint,
  labelPosition,
  waypointPosition,
  waypointPositions,
  onStartDragWaypoint,
  onStartDragEndpoint,
  onResetWaypoint,
  onDeleteWaypoint,
  onAddWaypoint,
  onUpdate,
  onDelete
}) => {
  // Quick Action Helpers (Rendered in Overlay Layer at zIndex: 100 above all nodes)
  const handleCycleRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const routes: RouteType[] = ['curved', 'orthogonal', 'straight'];
    const currentRoute = edge.routeType || 'curved';
    const nextIdx = (routes.indexOf(currentRoute) + 1) % routes.length;
    onUpdate?.({ ...edge, routeType: routes[nextIdx], controlPoint: undefined, waypoints: undefined });
  };

  const handleCycleStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const styles: LineStyle[] = ['solid', 'dashed', 'dotted'];
    const currentStyle = edge.lineStyle || 'solid';
    const nextIdx = (styles.indexOf(currentStyle) + 1) % styles.length;
    onUpdate?.({ ...edge, lineStyle: styles[nextIdx] });
  };

  const handleToggleAnimated = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.({ ...edge, isAnimated: !edge.isAnimated });
  };

  const handleSwapDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.({
      ...edge,
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId,
      fromPort: edge.toPort,
      toPort: edge.fromPort,
      arrowhead: edge.arrowheadStart || 'none',
      arrowheadStart: edge.arrowhead || 'arrow',
      controlPoint: undefined,
      waypoints: edge.waypoints ? [...edge.waypoints].reverse() : undefined
    });
  };

  const handleResetCurve = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.({ ...edge, controlPoint: undefined, waypoints: undefined });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(edge.id);
  };

  const effectivePoints =
    waypointPositions && waypointPositions.length > 0
      ? waypointPositions
      : [waypointPosition];

  return (
    <g className="drafo-canva-edge-controls" style={{ pointerEvents: 'all' }}>
      {/* 1. Start Endpoint Handle (Drag to reconnect or snap start) */}
      <g className="drafo-canva-handle-group" style={{ pointerEvents: 'all' }}>
        <circle
          className="drafo-canva-handle-hitarea"
          cx={sourcePoint.x}
          cy={sourcePoint.y}
          r={20}
          fill="#FFFFFF"
          opacity={0.001}
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartDragEndpoint?.(edge.id, 'source', e);
          }}
        >
          <title>Drag to reconnect start port</title>
        </circle>
        <circle
          cx={sourcePoint.x}
          cy={sourcePoint.y}
          r={6}
          fill="#FFFFFF"
          stroke="#2563EB"
          strokeWidth={2.5}
          className="drafo-canva-endpoint-handle"
          style={{
            cursor: 'crosshair',
            pointerEvents: 'all',
            filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.45))'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartDragEndpoint?.(edge.id, 'source', e);
          }}
        />
      </g>

      {/* 2. End Endpoint Handle (Drag to reconnect or snap end) */}
      <g className="drafo-canva-handle-group" style={{ pointerEvents: 'all' }}>
        <circle
          className="drafo-canva-handle-hitarea"
          cx={targetPoint.x}
          cy={targetPoint.y}
          r={20}
          fill="#FFFFFF"
          opacity={0.001}
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartDragEndpoint?.(edge.id, 'target', e);
          }}
        >
          <title>Drag to reconnect end port</title>
        </circle>
        <circle
          cx={targetPoint.x}
          cy={targetPoint.y}
          r={6}
          fill="#FFFFFF"
          stroke="#2563EB"
          strokeWidth={2.5}
          className="drafo-canva-endpoint-handle"
          style={{
            cursor: 'crosshair',
            pointerEvents: 'all',
            filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.45))'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartDragEndpoint?.(edge.id, 'target', e);
          }}
        />
      </g>

      {/* 3. Multi-Waypoint Handles (Users can create as many points as they want, and move them in any direction) */}
      {effectivePoints.map((wp, idx) => (
        <g key={idx} className="drafo-canva-handle-group" style={{ pointerEvents: 'all' }}>
          <circle
            className="drafo-canva-handle-hitarea"
            cx={wp.x}
            cy={wp.y}
            r={20}
            fill="#FFFFFF"
            opacity={0.001}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartDragWaypoint?.(edge.id, idx, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onDeleteWaypoint && edge.waypoints && edge.waypoints.length > 0) {
                onDeleteWaypoint(edge.id, idx);
              } else {
                onResetWaypoint?.(edge.id);
              }
            }}
          >
            <title>Drag point to any side / Double-click to delete point</title>
          </circle>
          <circle
            cx={wp.x}
            cy={wp.y}
            r={6.5}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2.5}
            className="drafo-canva-waypoint-handle"
            style={{
              cursor: 'grab',
              pointerEvents: 'all',
              filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.5))'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartDragWaypoint?.(edge.id, idx, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onDeleteWaypoint && edge.waypoints && edge.waypoints.length > 0) {
                onDeleteWaypoint(edge.id, idx);
              } else {
                onResetWaypoint?.(edge.id);
              }
            }}
          />
        </g>
      ))}

      {/* 4. Quick Floating Action Toolbar (Rendered in Overlay Layer at zIndex: 100 - Always Stacks ABOVE Flow Nodes!) */}
      {onUpdate && (
        <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`} style={{ pointerEvents: 'all' }}>
          <foreignObject
            x={-185}
            y={24}
            width={370}
            height={44}
            className="drafo-edge-action-pill"
            style={{ pointerEvents: 'all', overflow: 'visible' }}
          >
            <div className="drafo-edge-actions-wrapper" style={{ pointerEvents: 'all' }}>
              <div className="drafo-edge-actions" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'all' }}>
                <button
                  type="button"
                  className="drafo-edge-action-btn"
                  onClick={handleCycleRoute}
                  title={`Route: ${edge.routeType || 'curved'} (Click to cycle)`}
                >
                  {edge.routeType === 'orthogonal' ? 'Elbow' : edge.routeType === 'straight' ? 'Direct' : 'Curve'}
                </button>
                <button
                  type="button"
                  className="drafo-edge-action-btn"
                  onClick={handleCycleStyle}
                  title={`Style: ${edge.lineStyle || 'solid'} (Click to cycle)`}
                >
                  {edge.lineStyle === 'dashed' ? 'Dashed' : edge.lineStyle === 'dotted' ? 'Dotted' : 'Solid'}
                </button>
                <button
                  type="button"
                  className="drafo-edge-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddWaypoint?.(edge.id, waypointPosition);
                  }}
                  title="Add another point to connector line"
                  style={{ fontWeight: 600, color: '#2563EB' }}
                >
                  + Point
                </button>
                <button
                  type="button"
                  className={`drafo-edge-action-btn ${edge.isAnimated ? 'active' : ''}`}
                  onClick={handleToggleAnimated}
                  title="Toggle animation pulse"
                >
                  <Zap size={11} color={edge.isAnimated ? '#2563EB' : '#64748B'} />
                </button>
                <button
                  type="button"
                  className="drafo-edge-action-btn"
                  onClick={handleSwapDirection}
                  title="Reverse line direction"
                >
                  <ArrowLeftRight size={11} />
                </button>
                {(edge.controlPoint || (edge.waypoints && edge.waypoints.length > 0)) && (
                  <button
                    type="button"
                    className="drafo-edge-action-btn reset"
                    onClick={handleResetCurve}
                    title="Reset bend points to auto"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="drafo-edge-action-btn delete"
                    onClick={handleDelete}
                    title="Delete connector"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
};

function flowEdgeAreEqual(prev: FlowEdgeProps, next: FlowEdgeProps): boolean {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isSimActive !== next.isSimActive) return false;
  if (prev.dragEndpointPos !== next.dragEndpointPos) return false;
  if (prev.multiEdgeOffset !== next.multiEdgeOffset) return false;
  if (
    prev.labelOffset?.x !== next.labelOffset?.x ||
    prev.labelOffset?.y !== next.labelOffset?.y
  ) return false;

  const sA = prev.sourceNode, sB = next.sourceNode;
  const tA = prev.targetNode, tB = next.targetNode;
  if (sA.x !== sB.x || sA.y !== sB.y || sA.width !== sB.width || sA.height !== sB.height) return false;
  if (tA.x !== tB.x || tA.y !== tB.y || tA.width !== tB.width || tA.height !== tB.height) return false;

  const a = prev.edge, b = next.edge;
  return (
    a.id === b.id &&
    a.fromNodeId === b.fromNodeId &&
    a.toNodeId === b.toNodeId &&
    a.fromPort === b.fromPort &&
    a.toPort === b.toPort &&
    a.label === b.label &&
    a.color === b.color &&
    a.width === b.width &&
    a.lineStyle === b.lineStyle &&
    a.routeType === b.routeType &&
    a.arrowhead === b.arrowhead &&
    a.arrowheadStart === b.arrowheadStart &&
    a.bidirectional === b.bidirectional &&
    a.isAnimated === b.isAnimated &&
    a.stepNumber === b.stepNumber &&
    a.latency === b.latency &&
    a.controlPoint?.x === b.controlPoint?.x &&
    a.controlPoint?.y === b.controlPoint?.y &&
    (a.waypoints === b.waypoints || JSON.stringify(a.waypoints) === JSON.stringify(b.waypoints))
  );
}

export const FlowEdgeMemo = memo(FlowEdge, flowEdgeAreEqual);
