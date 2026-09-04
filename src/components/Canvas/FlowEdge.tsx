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
  onStartDragEndpoint?: (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => void;
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

  const startArrowhead = edge.arrowheadStart || (edge.bidirectional ? edge.arrowhead : 'none');
  const markerStart =
    startArrowhead && startArrowhead !== 'none'
      ? `url(#marker-${startArrowhead}-start-${colorKey})`
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

      {/* Canva-Style Connection Control Handles (Visible when edge is selected) */}
      {isSelected && (
        <g className="drafo-canva-edge-controls">
          {/* 1. Start Endpoint Handle (Drag to reconnect or snap start) */}
          <g className="drafo-canva-handle-group">
            <circle
              cx={sourcePoint.x}
              cy={sourcePoint.y}
              r={14}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartDragEndpoint?.(edge.id, 'source', e);
              }}
            />
            <circle
              cx={sourcePoint.x}
              cy={sourcePoint.y}
              r={5.5}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={2.5}
              className="drafo-canva-endpoint-handle"
              style={{
                cursor: 'crosshair',
                filter: 'drop-shadow(0 2px 5px rgba(37, 99, 235, 0.35))'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartDragEndpoint?.(edge.id, 'source', e);
              }}
            />
          </g>

          {/* 2. End Endpoint Handle (Drag to reconnect or snap end) */}
          <g className="drafo-canva-handle-group">
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              r={14}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartDragEndpoint?.(edge.id, 'target', e);
              }}
            />
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              r={5.5}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={2.5}
              className="drafo-canva-endpoint-handle"
              style={{
                cursor: 'crosshair',
                filter: 'drop-shadow(0 2px 5px rgba(37, 99, 235, 0.35))'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartDragEndpoint?.(edge.id, 'target', e);
              }}
            />
          </g>

          {/* 3. Canva Curvature & Elbow Waypoint Handle */}
          <g className="drafo-canva-handle-group">
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
            <circle
              cx={edge.controlPoint ? edge.controlPoint.x : labelPosition.x}
              cy={edge.controlPoint ? edge.controlPoint.y : labelPosition.y + (edge.label ? 0 : 12)}
              r={16}
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
            <circle
              cx={edge.controlPoint ? edge.controlPoint.x : labelPosition.x}
              cy={edge.controlPoint ? edge.controlPoint.y : labelPosition.y + (edge.label ? 0 : 12)}
              r={6.5}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={2.5}
              className="drafo-canva-waypoint-handle"
              style={{
                cursor: 'grab',
                filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.4))'
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
        </g>
      )}
    </g>
  );
};
