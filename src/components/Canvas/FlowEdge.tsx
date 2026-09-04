'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FlowEdge as FlowEdgeType, FlowNode } from '../../types/flow';
import { calculateEdgePath } from '../../utils/routing';

interface FlowEdgeProps {
  edge: FlowEdgeType;
  sourceNode: FlowNode;
  targetNode: FlowNode;
  isSelected: boolean;
  isSimActive?: boolean;
  onSelect: (edgeId: string, e: React.MouseEvent) => void;
  onUpdate: (updatedEdge: FlowEdgeType) => void;
  onDelete?: (edgeId: string) => void;
  onStartDragWaypoint?: (edgeId: string, e: React.MouseEvent) => void;
}

export const FlowEdge: React.FC<FlowEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  isSimActive,
  onSelect,
  onUpdate,
  onDelete,
  onStartDragWaypoint
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

  const cycleRouteType = (e: React.MouseEvent) => {
    e.stopPropagation();
    const types: FlowEdgeType['routeType'][] = ['curved', 'orthogonal', 'straight'];
    const currIdx = types.indexOf(edge.routeType || 'curved');
    const nextType = types[(currIdx + 1) % types.length];
    onUpdate({ ...edge, routeType: nextType });
  };

  const { path, labelPosition, sourcePoint, targetPoint } = calculateEdgePath(
    sourceNode,
    targetNode,
    edge.fromPort,
    edge.toPort,
    edge.routeType,
    edge.controlPoint
  );

  const strokeColor = isSelected ? '#2563EB' : edge.color || '#000000';
  const colorKey = strokeColor.replace('#', '');
  const arrowheadType = edge.arrowhead || 'arrow';

  const markerEnd =
    arrowheadType === 'none'
      ? undefined
      : `url(#marker-${arrowheadType}-${colorKey})`;

  const markerStart =
    edge.bidirectional && arrowheadType !== 'none'
      ? `url(#marker-${arrowheadType}-start-${colorKey})`
      : undefined;

  const strokeDash =
    edge.lineStyle === 'dashed'
      ? '6,5'
      : edge.lineStyle === 'dotted'
      ? '2,4'
      : edge.isAnimated
      ? '6,4'
      : 'none';

  return (
    <g
      className={`drafo-flow-edge ${isSelected ? 'selected' : ''} ${
        isSimActive ? 'sim-active' : ''
      } ${edge.isAnimated ? 'is-animated-edge' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={(e) => onSelect(edge.id, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider hit area for easy selection */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="drafo-edge-hitbox"
      />

      {/* Glowing Hover Aura Tube */}
      {(isHovered || isSelected) && (
        <path
          d={path}
          fill="none"
          stroke={isSelected ? 'rgba(37, 99, 235, 0.22)' : 'rgba(59, 130, 246, 0.16)'}
          strokeWidth={isSelected ? 10 : 8}
          strokeLinecap="round"
          className="drafo-edge-glow-path"
        />
      )}

      {/* Main Connector Path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : edge.width || 1.5}
        strokeDasharray={strokeDash}
        markerStart={markerStart}
        markerEnd={markerEnd}
        className={`drafo-edge-path ${edge.isAnimated ? 'is-animated' : ''}`}
      />

      {/* Simulation Signal Pulse Dot OR Edge Live Animated Pulse */}
      {(isSimActive || edge.isAnimated) && (
        <circle r={4.5} fill={isSelected ? '#2563EB' : strokeColor} className="drafo-sim-pulse-dot">
          <animateMotion path={path} dur={edge.isAnimated ? '1.8s' : '1.2s'} repeatCount="indefinite" />
        </circle>
      )}

      {/* Step Label / Badge */}
      {(edge.label || edge.latency || isSelected || isEditingLabel) && (
        <g
          transform={`translate(${labelPosition.x}, ${labelPosition.y})`}
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
              {/* Clean White Masking Background behind text for high legibility */}
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                className="drafo-edge-label-text-bg"
              >
                {edge.label || '<add step label>'}
              </text>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                className="drafo-edge-label-text"
              >
                {edge.label || '<add step label>'}
              </text>

              {/* Latency badge pill */}
              {edge.latency && (
                <g transform="translate(0, 15)">
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

      {/* Endpoint Connection Rings (Visible on Selected Edge) */}
      {isSelected && (
        <g className="drafo-edge-endpoints" pointerEvents="none">
          <circle
            cx={sourcePoint.x}
            cy={sourcePoint.y}
            r={4}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2}
          />
          <circle
            cx={targetPoint.x}
            cy={targetPoint.y}
            r={4}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2}
          />
        </g>
      )}

      {/* Draggable Waypoint / Bending Handle (Visible on Selected Edge) */}
      {isSelected && (
        <g className="drafo-edge-waypoint-group">
          {/* Subtle guideline if moved from auto label position */}
          {edge.controlPoint && (
            <line
              x1={labelPosition.x}
              y1={labelPosition.y}
              x2={edge.controlPoint.x}
              y2={edge.controlPoint.y}
              stroke="#93C5FD"
              strokeWidth={1}
              strokeDasharray="2,2"
              pointerEvents="none"
            />
          )}
          {/* Transparent large hit area */}
          <circle
            cx={edge.controlPoint ? edge.controlPoint.x : labelPosition.x}
            cy={edge.controlPoint ? edge.controlPoint.y : labelPosition.y + (edge.label ? 0 : 12)}
            r={14}
            fill="transparent"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDragWaypoint?.(edge.id, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...edge, controlPoint: undefined });
            }}
          />
          {/* Visual waypoint circle */}
          <circle
            cx={edge.controlPoint ? edge.controlPoint.x : labelPosition.x}
            cy={edge.controlPoint ? edge.controlPoint.y : labelPosition.y + (edge.label ? 0 : 12)}
            r={6.5}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2.5}
            className="drafo-edge-waypoint-handle"
            style={{
              cursor: 'grab',
              filter: 'drop-shadow(0 2px 5px rgba(37, 99, 235, 0.35))'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDragWaypoint?.(edge.id, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...edge, controlPoint: undefined });
            }}
          />
        </g>
      )}

      {/* Midpoint Quick Action Pill (Appears on Selected Edge) */}
      {isSelected && !isEditingLabel && (
        <foreignObject
          x={labelPosition.x - (edge.controlPoint ? 52 : (edge.label ? -25 : 35))}
          y={labelPosition.y - 32}
          width={edge.controlPoint ? 104 : 70}
          height={28}
          className="drafo-edge-action-pill"
        >
          <div className="drafo-edge-actions">
            <button
              className="drafo-edge-action-btn"
              onClick={cycleRouteType}
              title={`Switch Route Style (Current: ${edge.routeType || 'curved'})`}
            >
              ⤹
            </button>
            {edge.controlPoint && (
              <button
                className="drafo-edge-action-btn reset"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ ...edge, controlPoint: undefined });
                }}
                title="Reset Connector to Default Auto Path"
              >
                ↺
              </button>
            )}
            {onDelete && (
              <button
                className="drafo-edge-action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(edge.id);
                }}
                title="Delete Connection (Del)"
              >
                ×
              </button>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};
