'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { FlowProject, FlowNode, FlowSection } from '@/types/flow';
import { Minimize2 } from 'lucide-react';
import './MiniMap.css';

interface MiniMapProps {
  project: FlowProject;
  pan: { x: number; y: number };
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  project,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  onPanChange,
  isOpen,
  onToggle
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoVisible, setIsAutoVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevZoomRef = useRef(zoom);

  // Auto-show radar mini-map ONLY when user zooms (fade out after 2.5s of idle)
  useEffect(() => {
    // Only trigger if zoom actually changed
    if (prevZoomRef.current !== zoom) {
      prevZoomRef.current = zoom;
      setIsAutoVisible(true);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      hideTimerRef.current = setTimeout(() => {
        setIsAutoVisible(false);
      }, 2500);
    }
  }, [zoom]);

  // Handle mouse hovering over MiniMap
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isDragging) {
      hideTimerRef.current = setTimeout(() => {
        setIsAutoVisible(false);
      }, 1800);
    }
  };

  // Determine if MiniMap should be shown
  const shouldShow = isOpen && (isAutoVisible || isHovered || isDragging);

  // Calculate diagram bounds in world space
  const bounds = React.useMemo(() => {
    if (project.nodes.length === 0) {
      return { minX: -500, minY: -500, maxX: 1500, maxY: 1000, width: 2000, height: 1500 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    project.nodes.forEach((n: FlowNode) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    // Also include sections
    project.sections.forEach((s: FlowSection) => {
      minX = Math.min(minX, s.x ?? 80);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, (s.x ?? 80) + 1200);
      maxY = Math.max(maxY, s.y + 400);
    });

    // Add comfort padding
    const pad = 400;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const width = Math.max(maxX - minX, 1000);
    const height = Math.max(maxY - minY, 800);

    return { minX, minY, maxX, maxY, width, height };
  }, [project.nodes, project.sections]);

  const mapWidth = 190;
  const mapHeight = 130;

  // Scale factors from world coordinates to minimap pixels
  const scaleX = mapWidth / bounds.width;
  const scaleY = mapHeight / bounds.height;
  const scale = Math.min(scaleX, scaleY);

  const worldToMap = useCallback(
    (wx: number, wy: number) => {
      const offsetX = (mapWidth - bounds.width * scale) / 2;
      const offsetY = (mapHeight - bounds.height * scale) / 2;
      return {
        x: (wx - bounds.minX) * scale + offsetX,
        y: (wy - bounds.minY) * scale + offsetY
      };
    },
    [bounds, scale]
  );

  const mapToWorld = useCallback(
    (mx: number, my: number) => {
      const offsetX = (mapWidth - bounds.width * scale) / 2;
      const offsetY = (mapHeight - bounds.height * scale) / 2;
      return {
        x: (mx - offsetX) / scale + bounds.minX,
        y: (my - offsetY) / scale + bounds.minY
      };
    },
    [bounds, scale]
  );

  // Viewport rectangle in world coordinates
  const worldViewportX = -pan.x / zoom;
  const worldViewportY = -pan.y / zoom;
  const worldViewportW = viewportWidth / zoom;
  const worldViewportH = viewportHeight / zoom;

  const vpPos = worldToMap(worldViewportX, worldViewportY);
  const vpW = Math.max(worldViewportW * scale, 16);
  const vpH = Math.max(worldViewportH * scale, 12);

  const handleMiniMapClickOrDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const targetWorldCenter = mapToWorld(clickX, clickY);

      // Pan canvas so that targetWorldCenter is in the center of the viewport
      const newPanX = viewportWidth / 2 - targetWorldCenter.x * zoom;
      const newPanY = viewportHeight / 2 - targetWorldCenter.y * zoom;

      onPanChange({
        x: Math.round(newPanX),
        y: Math.round(newPanY)
      });
    },
    [mapToWorld, viewportWidth, viewportHeight, zoom, onPanChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleMiniMapClickOrDrag(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      handleMiniMapClickOrDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (!isHovered) {
          hideTimerRef.current = setTimeout(() => {
            setIsAutoVisible(false);
          }, 1500);
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isHovered, handleMiniMapClickOrDrag]);

  return (
    <div
      className={`drafo-minimap-container ${shouldShow ? 'visible' : 'hidden'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={mapRef}
        className="drafo-minimap-canvas"
        style={{ width: mapWidth, height: mapHeight }}
        onMouseDown={handleMouseDown}
      >
        <button
          className="drafo-minimap-floating-close"
          onClick={(e) => {
            e.stopPropagation();
            setIsAutoVisible(false);
            onToggle();
          }}
          title="Dismiss Mini-Map"
        >
          <Minimize2 size={12} />
        </button>

        {/* Zoom Level Indicator */}
        <div className="drafo-minimap-zoom-pill">
          {Math.round(zoom * 100)}%
        </div>

        {/* Render Sections */}
        {project.sections.map((s: FlowSection) => {
          const sPos = worldToMap(s.x ?? 80, s.y);
          return (
            <div
              key={s.id}
              className="drafo-minimap-section"
              style={{
                left: `${sPos.x}px`,
                top: `${sPos.y}px`,
                width: `${1200 * scale}px`,
                height: `${400 * scale}px`
              }}
            />
          );
        })}

        {/* Render Node Miniatures */}
        {project.nodes.map((n: FlowNode) => {
          const nPos = worldToMap(n.x, n.y);
          const isContainer = n.type === 'container' || n.type === 'group';
          const nodeColor = n.style.borderColor || '#2563EB';

          return (
            <div
              key={n.id}
              className={`drafo-minimap-node ${isContainer ? 'is-container' : ''}`}
              style={{
                left: `${nPos.x}px`,
                top: `${nPos.y}px`,
                width: `${Math.max(n.width * scale, 3)}px`,
                height: `${Math.max(n.height * scale, 3)}px`,
                backgroundColor: isContainer ? 'rgba(241, 245, 249, 0.7)' : nodeColor,
                borderColor: nodeColor
              }}
            />
          );
        })}

        {/* Highlighted Viewport Indicator Box */}
        <div
          className="drafo-minimap-viewport-box"
          style={{
            transform: `translate(${vpPos.x}px, ${vpPos.y}px)`,
            width: `${vpW}px`,
            height: `${vpH}px`
          }}
        />
      </div>
    </div>
  );
};
