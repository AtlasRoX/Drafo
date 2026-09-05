'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FlowProject, FlowNode, FlowEdge } from '../../types/flow';
import { DrafoLogo } from '../../assets/DrafoLogo';
import {
  exportDiagramAsPng,
  exportDiagramAsJpg,
  exportDiagramAsSvg,
  exportDiagramAsPdf,
  copyDiagramToClipboard
} from '../../utils/exportUtils';
import { toSvg } from 'html-to-image';
import {
  Download,
  Copy,
  FileCode,
  X,
  Image as ImageIcon,
  FileText,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Crop,
  Sun,
  Moon,
  Grid,
  Circle,
  Square,
  Maximize2,
  Move
} from 'lucide-react';
import { FlowNode as FlowNodeComponent } from '../Canvas/FlowNode';
import { calculateEdgePath, formatFullLabel, wrapEdgeLabel, measureEdgeLabelWidth } from '../../utils/routing';
import './Modals.css';

interface ExportShareModalProps {
  project: FlowProject;
  selectedIds?: string[];
  onClose: () => void;
}

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf';
export type CropType = 'all' | 'selection' | '16:9' | '1:1' | 'custom';
export type BgPattern = 'plain' | 'dots' | 'lines';
export type CanvasTheme = 'light' | 'dark';

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  project,
  selectedIds = [],
  onClose
}) => {
  const hasSelection = selectedIds.length > 0;
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('png');
  const [cropType, setCropType] = useState<CropType>(hasSelection ? 'selection' : 'all');
  const [customCropBox, setCustomCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialBox: { x: number; y: number; width: number; height: number };
    action: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';
  } | null>(null);
  const [bgPattern, setBgPattern] = useState<BgPattern>('dots');
  const [bgTheme, setBgTheme] = useState<CanvasTheme>('light');
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [padding, setPadding] = useState<number>(32);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(2);
  const [zoomLevel, setZoomLevel] = useState<'fit' | number>('fit');
  const [previewMode, setPreviewMode] = useState<'canvas-crop' | 'framed'>('canvas-crop');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null);

  const captureFrameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState<{ w: number; h: number }>({ w: 840, h: 540 });

  // Responsive observation of the preview viewport
  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
      if (viewportRef.current) {
        setViewportDims({
          w: Math.max(300, viewportRef.current.clientWidth),
          h: Math.max(200, viewportRef.current.clientHeight)
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [activeFormat, previewMode]);

  // Compute bounding boxes of all nodes and selected nodes (including curved edge loops)
  const { allBounds, selectionBounds, allNodes, allEdges } = useMemo(() => {
    const nodes = project.nodes;
    const edges = project.edges;

    if (nodes.length === 0) {
      const defaultBounds = { minX: 0, minY: 0, maxX: 600, maxY: 400, width: 600, height: 400 };
      return { allBounds: defaultBounds, selectionBounds: defaultBounds, allNodes: [], allEdges: [] };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    if (project.sections && project.sections.length > 0) {
      project.sections.forEach((s) => {
        if (typeof s.x === 'number') {
          minX = Math.min(minX, s.x);
          maxX = Math.max(maxX, s.x + 200);
        }
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y + 40);
      });
    }

    // Encompass curved edge paths and control points so loops are never clipped
    edges.forEach((e) => {
      if (e.controlPoint) {
        minX = Math.min(minX, e.controlPoint.x);
        minY = Math.min(minY, e.controlPoint.y);
        maxX = Math.max(maxX, e.controlPoint.x);
        maxY = Math.max(maxY, e.controlPoint.y);
      }
      const from = nodes.find((n) => n.id === e.fromNodeId);
      const to = nodes.find((n) => n.id === e.toNodeId);
      if (from && to && (e.routeType === 'curved' || !e.routeType)) {
        if (e.fromPort === 'top' && e.toPort === 'top') {
          minY = Math.min(minY, Math.min(from.y, to.y) - 130);
        }
        if (e.fromPort === 'bottom' && e.toPort === 'bottom') {
          maxY = Math.max(maxY, Math.max(from.y + from.height, to.y + to.height) + 130);
        }
      }
    });

    const calculatedAll = {
      minX: Math.round(minX),
      minY: Math.round(minY),
      maxX: Math.round(maxX),
      maxY: Math.round(maxY),
      width: Math.max(200, Math.round(maxX - minX)),
      height: Math.max(160, Math.round(maxY - minY))
    };

    // Selection bounds
    const selectedSet = new Set(selectedIds);
    const selNodes = nodes.filter((n) => selectedSet.has(n.id));
    let selBounds = calculatedAll;
    if (selNodes.length > 0) {
      let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
      selNodes.forEach((n) => {
        sMinX = Math.min(sMinX, n.x);
        sMinY = Math.min(sMinY, n.y);
        sMaxX = Math.max(sMaxX, n.x + n.width);
        sMaxY = Math.max(sMaxY, n.y + n.height);
      });
      edges.forEach((e) => {
        if (selectedSet.has(e.fromNodeId) && selectedSet.has(e.toNodeId)) {
          if (e.controlPoint) {
            sMinX = Math.min(sMinX, e.controlPoint.x);
            sMinY = Math.min(sMinY, e.controlPoint.y);
            sMaxX = Math.max(sMaxX, e.controlPoint.x);
            sMaxY = Math.max(sMaxY, e.controlPoint.y);
          }
          const from = nodes.find((n) => n.id === e.fromNodeId);
          const to = nodes.find((n) => n.id === e.toNodeId);
          if (from && to && (e.routeType === 'curved' || !e.routeType)) {
            if (e.fromPort === 'top' && e.toPort === 'top') {
              sMinY = Math.min(sMinY, Math.min(from.y, to.y) - 130);
            }
            if (e.fromPort === 'bottom' && e.toPort === 'bottom') {
              sMaxY = Math.max(sMaxY, Math.max(from.y + from.height, to.y + to.height) + 130);
            }
          }
        }
      });
      selBounds = {
        minX: Math.round(sMinX),
        minY: Math.round(sMinY),
        maxX: Math.round(sMaxX),
        maxY: Math.round(sMaxY),
        width: Math.max(200, Math.round(sMaxX - sMinX)),
        height: Math.max(160, Math.round(sMaxY - sMinY))
      };
    }

    return {
      allBounds: calculatedAll,
      selectionBounds: selBounds,
      allNodes: nodes,
      allEdges: edges
    };
  }, [project, selectedIds]);

  // Compute default preset crop frame box based on cropType and padding
  const presetCropBox = useMemo(() => {
    const baseBounds = (cropType === 'selection' && hasSelection) ? selectionBounds : allBounds;
    let x = baseBounds.minX - padding;
    let y = baseBounds.minY - padding;
    let width = baseBounds.width + padding * 2;
    let height = baseBounds.height + padding * 2;

    if (cropType === '16:9') {
      const targetAspect = 16 / 9;
      const currentAspect = width / height;
      if (currentAspect < targetAspect) {
        const newWidth = Math.round(height * targetAspect);
        x -= Math.round((newWidth - width) / 2);
        width = newWidth;
      } else {
        const newHeight = Math.round(width / targetAspect);
        y -= Math.round((newHeight - height) / 2);
        height = newHeight;
      }
    } else if (cropType === '1:1') {
      const maxDim = Math.max(width, height);
      x -= Math.round((maxDim - width) / 2);
      y -= Math.round((maxDim - height) / 2);
      width = maxDim;
      height = maxDim;
    }

    return {
      x,
      y,
      width: Math.max(160, width),
      height: Math.max(120, height)
    };
  }, [cropType, hasSelection, selectionBounds, allBounds, padding]);

  // Active cropBox: uses customCropBox if custom framing is selected, otherwise presetCropBox
  const cropBox = (cropType === 'custom' && customCropBox) ? customCropBox : presetCropBox;

  // Nodes and edges that fall inside or touch the crop frame
  const framedNodes = useMemo(() => {
    if (cropType === 'selection' && hasSelection) {
      const selSet = new Set(selectedIds);
      return allNodes.filter((n) => selSet.has(n.id));
    }
    return allNodes.filter((n) => {
      return (
        n.x + n.width >= cropBox.x &&
        n.x <= cropBox.x + cropBox.width &&
        n.y + n.height >= cropBox.y &&
        n.y <= cropBox.y + cropBox.height
      );
    });
  }, [cropType, hasSelection, selectedIds, allNodes, cropBox]);

  const framedNodeIds = useMemo(() => new Set(framedNodes.map((n) => n.id)), [framedNodes]);
  const framedEdges = useMemo(() => {
    return allEdges.filter((e) => framedNodeIds.has(e.fromNodeId) && framedNodeIds.has(e.toNodeId));
  }, [allEdges, framedNodeIds]);

  const exportNodes = useMemo(() => {
    return (cropType === 'selection' && hasSelection) ? framedNodes : allNodes;
  }, [cropType, hasSelection, framedNodes, allNodes]);

  const exportEdges = useMemo(() => {
    return (cropType === 'selection' && hasSelection) ? framedEdges : allEdges;
  }, [cropType, hasSelection, framedEdges, allEdges]);

  // Final export dimensions in pixels
  const finalExportWidth = Math.round(cropBox.width * scale);
  const finalExportHeight = Math.round(cropBox.height * scale);

  // Center target area (diagram & crop frame) in the live preview viewport
  const targetBounds = useMemo(() => {
    const minX = Math.min(allBounds.minX, cropBox.x);
    const minY = Math.min(allBounds.minY, cropBox.y);
    const maxX = Math.max(allBounds.maxX, cropBox.x + cropBox.width);
    const maxY = Math.max(allBounds.maxY, cropBox.y + cropBox.height);
    return {
      minX,
      minY,
      width: Math.max(200, Math.round(maxX - minX)),
      height: Math.max(160, Math.round(maxY - minY))
    };
  }, [allBounds, cropBox]);

  const autoFitScale = useMemo(() => {
    const pad = 80;
    const availW = Math.max(100, viewportDims.w - pad);
    const availH = Math.max(100, viewportDims.h - pad);
    const scale = Math.min(1.05, Math.min(availW / targetBounds.width, availH / targetBounds.height));
    return Number(Math.max(0.2, scale).toFixed(2));
  }, [viewportDims, targetBounds]);

  const effectiveScale = zoomLevel === 'fit' ? autoFitScale : zoomLevel;

  const pan = useMemo(() => {
    const centerX = targetBounds.minX + targetBounds.width / 2;
    const centerY = targetBounds.minY + targetBounds.height / 2;
    const panX = viewportDims.w / 2 - centerX * effectiveScale;
    const panY = viewportDims.h / 2 - centerY * effectiveScale;
    return { x: Math.round(panX), y: Math.round(panY) };
  }, [targetBounds, viewportDims, effectiveScale]);

  // Background style computation identical to Drafo application canvas
  const isDark = bgTheme === 'dark';
  const baseColor = isDark ? '#0F172A' : '#FAFAFC';
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.14)';
  const lineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)';
  const dotRadius = Math.max(0.85, Math.min(1.25, 1.05 * Math.sqrt(Math.max(0.2, effectiveScale))));

  const gridBackgroundStyle: React.CSSProperties = {
    backgroundColor: baseColor,
    backgroundPosition: `${pan.x}px ${pan.y}px`,
    backgroundSize: `${20 * effectiveScale}px ${20 * effectiveScale}px`,
    backgroundImage:
      bgPattern === 'dots'
        ? `radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px)`
        : bgPattern === 'lines'
        ? `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`
        : 'none'
  };

  const getCanvasBackground = (forTransparent = false) => {
    if (forTransparent) return 'transparent';
    if (bgPattern === 'dots') {
      return `${baseColor} radial-gradient(circle, ${dotColor} 1.1px, transparent 1.1px) 0 0 / 20px 20px`;
    }
    if (bgPattern === 'lines') {
      return `${baseColor} linear-gradient(to right, ${lineColor} 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(to bottom, ${lineColor} 1px, transparent 1px) 0 0 / 20px 20px`;
    }
    return baseColor;
  };

  const getEffectiveBgColor = () => {
    if (isTransparent && (activeFormat === 'png' || activeFormat === 'svg')) return undefined;
    return bgTheme === 'dark' ? '#0F172A' : '#FAFAFC';
  };

  // Interactive Drag & Resize Handler for the Crop Frame in Live Canvas View
  const handleStartDrag = (
    e: React.PointerEvent,
    action: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
      action
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const { startX, startY, initialBox, action: act } = dragRef.current;
      const dx = (moveEv.clientX - startX) / Math.max(0.01, effectiveScale);
      const dy = (moveEv.clientY - startY) / Math.max(0.01, effectiveScale);

      let newBox = { ...initialBox };

      if (act === 'move') {
        newBox.x = Math.round(initialBox.x + dx);
        newBox.y = Math.round(initialBox.y + dy);
      } else if (act === 'se') {
        newBox.width = Math.max(100, Math.round(initialBox.width + dx));
        newBox.height = Math.max(80, Math.round(initialBox.height + dy));
      } else if (act === 'sw') {
        const newW = Math.max(100, Math.round(initialBox.width - dx));
        newBox.x = Math.round(initialBox.x + (initialBox.width - newW));
        newBox.width = newW;
        newBox.height = Math.max(80, Math.round(initialBox.height + dy));
      } else if (act === 'ne') {
        newBox.width = Math.max(100, Math.round(initialBox.width + dx));
        const newH = Math.max(80, Math.round(initialBox.height - dy));
        newBox.y = Math.round(initialBox.y + (initialBox.height - newH));
        newBox.height = newH;
      } else if (act === 'nw') {
        const newW = Math.max(100, Math.round(initialBox.width - dx));
        const newH = Math.max(80, Math.round(initialBox.height - dy));
        newBox.x = Math.round(initialBox.x + (initialBox.width - newW));
        newBox.y = Math.round(initialBox.y + (initialBox.height - newH));
        newBox.width = newW;
        newBox.height = newH;
      } else if (act === 'n') {
        const newH = Math.max(80, Math.round(initialBox.height - dy));
        newBox.y = Math.round(initialBox.y + (initialBox.height - newH));
        newBox.height = newH;
      } else if (act === 's') {
        newBox.height = Math.max(80, Math.round(initialBox.height + dy));
      } else if (act === 'w') {
        const newW = Math.max(100, Math.round(initialBox.width - dx));
        newBox.x = Math.round(initialBox.x + (initialBox.width - newW));
        newBox.width = newW;
      } else if (act === 'e') {
        newBox.width = Math.max(100, Math.round(initialBox.width + dx));
      }

      setCropType('custom');
      setCustomCropBox(newBox);
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Handlers for export
  const handleDownloadPng = async () => {
    if (!captureFrameRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-export.png`;
      await exportDiagramAsPng(captureFrameRef.current, fileName, scale, getEffectiveBgColor());
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJpg = async () => {
    if (!captureFrameRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-export.jpg`;
      await exportDiagramAsJpg(captureFrameRef.current, fileName, scale, getEffectiveBgColor() || '#FFFFFF');
    } catch (err) {
      console.error('JPG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!captureFrameRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-export.svg`;
      await exportDiagramAsSvg(captureFrameRef.current, fileName, getEffectiveBgColor());
    } catch (err) {
      console.error('SVG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!captureFrameRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const fileName = `${project.name.toLowerCase().replace(/\s+/g, '-')}-spec.pdf`;
      await exportDiagramAsPdf(captureFrameRef.current, fileName, project.name, getEffectiveBgColor() || '#FFFFFF');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!captureFrameRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
      const success = await copyDiagramToClipboard(captureFrameRef.current, scale, getEffectiveBgColor());
      if (success) {
        setCopiedSuccess('Copied image to clipboard!');
        setTimeout(() => setCopiedSuccess(null), 2500);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrimaryDownload = () => {
    switch (activeFormat) {
      case 'png':
        handleDownloadPng();
        break;
      case 'jpg':
        handleDownloadJpg();
        break;
      case 'svg':
        handleDownloadSvg();
        break;
      case 'pdf':
        handleDownloadPdf();
        break;
    }
  };

  // Helper to render diagram elements
  const renderDiagramElements = (originX: number, originY: number, nodesList: FlowNode[], edgesList: typeof allEdges) => {
    return (
      <>
        {/* Sections Layer */}
        {project.sections && project.sections.map((sec) => (
          <div
            key={sec.id}
            style={{
              position: 'absolute',
              left: `${(sec.x ?? allBounds.minX) - originX}px`,
              top: `${sec.y - originY}px`,
              width: `${allBounds.width}px`,
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
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <defs>
            {Array.from(
              new Set(
                edgesList
                  .map((e) => e.color || '#000000')
                  .concat(['#2563EB', '#64748B', '#10B981', '#EF4444', '#000000'])
              )
            ).map((color) => {
              const colorKey = color.replace('#', '');
              return (
                <React.Fragment key={colorKey}>
                  {/* Standard Filled Arrow End */}
                  <marker
                    id={`export-marker-arrow-${colorKey}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 1.8 5 Z" fill={color} />
                  </marker>

                  {/* Standard Filled Arrow Start */}
                  <marker
                    id={`export-marker-arrow-start-${colorKey}`}
                    viewBox="0 0 10 10"
                    refX="1"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M 9 1.5 L 0 5 L 9 8.5 L 7.2 5 Z" fill={color} />
                  </marker>

                  {/* Open Chevron Arrow End */}
                  <marker
                    id={`export-marker-open-${colorKey}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path
                      d="M 1 1.5 L 8 5 L 1 8.5"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>

                  {/* Open Chevron Arrow Start */}
                  <marker
                    id={`export-marker-open-start-${colorKey}`}
                    viewBox="0 0 10 10"
                    refX="2"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path
                      d="M 9 1.5 L 2 5 L 9 8.5"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>

                  {/* Circle Dot End */}
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

                  {/* Circle Dot Start */}
                  <marker
                    id={`export-marker-circle-start-${colorKey}`}
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

          {(() => {
            const pairMap = new Map<string, FlowEdge[]>();
            for (const edge of edgesList) {
              const pairKey = [edge.fromNodeId, edge.toNodeId].sort().join(':::');
              const list = pairMap.get(pairKey) || [];
              list.push(edge);
              pairMap.set(pairKey, list);
            }
            const exportOffsets = new Map<string, number>();
            pairMap.forEach((edges) => {
              if (edges.length <= 1) return;
              if (edges.length === 2) {
                const [e1, e2] = edges;
                const isOpposite = e1.fromNodeId === e2.toNodeId && e1.toNodeId === e2.fromNodeId;
                if (isOpposite) {
                  exportOffsets.set(e1.id, 34);
                  exportOffsets.set(e2.id, 34);
                } else {
                  exportOffsets.set(e1.id, -34);
                  exportOffsets.set(e2.id, 34);
                }
              } else {
                const half = (edges.length - 1) / 2;
                edges.forEach((e, idx) => exportOffsets.set(e.id, (idx - half) * 32));
              }
            });

            return edgesList.map((edge) => {
              const from = allNodes.find((n) => n.id === edge.fromNodeId);
              const to = allNodes.find((n) => n.id === edge.toNodeId);
              if (!from || !to) return null;

              const offsetFrom: FlowNode = { ...from, x: from.x - originX, y: from.y - originY };
              const offsetTo: FlowNode = { ...to, x: to.x - originX, y: to.y - originY };

              const { path, labelPosition } = calculateEdgePath(
                offsetFrom,
                offsetTo,
                edge.fromPort,
                edge.toPort,
                edge.routeType || 'curved',
                edge.controlPoint ? { x: edge.controlPoint.x - originX, y: edge.controlPoint.y - originY } : undefined,
                undefined,
                undefined,
                exportOffsets.get(edge.id)
              );

            const strokeColor = edge.color || '#2563EB';
            const colorKey = strokeColor.replace('#', '');
            const arrowheadType = edge.arrowhead || 'arrow';
            const markerEnd = arrowheadType === 'none' ? undefined : `url(#export-marker-${arrowheadType}-${colorKey})`;
            const startArrowhead = edge.arrowheadStart || (edge.bidirectional ? (edge.arrowhead || 'arrow') : 'none');
            const markerStart = startArrowhead && startArrowhead !== 'none' ? `url(#export-marker-${startArrowhead}-start-${colorKey})` : undefined;

            return (
              <g key={edge.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={edge.width || 1.5}
                  strokeDasharray={edge.lineStyle === 'dashed' ? '6,5' : edge.lineStyle === 'dotted' ? '2,4' : 'none'}
                  markerStart={markerStart}
                  markerEnd={markerEnd}
                  strokeLinecap={markerEnd || markerStart ? 'butt' : 'round'}
                  strokeLinejoin="round"
                />
                {(edge.label || edge.stepNumber !== undefined) && labelPosition && (() => {
                  const fullLabel = formatFullLabel(edge.label, edge.stepNumber);
                  const lines = wrapEdgeLabel(fullLabel);
                  const lineHeight = 13;
                  const totalHeight = (lines.length - 1) * lineHeight;
                  const maxLineWidth = lines.reduce((max, line) => Math.max(max, measureEdgeLabelWidth(line)), 0);
                  const bgWidth = Math.max(26, Math.ceil(maxLineWidth) + 14);
                  const bgHeight = lines.length * lineHeight + 6;

                  return (
                    <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
                      <rect
                        x={-bgWidth / 2}
                        y={-bgHeight / 2}
                        width={bgWidth}
                        height={bgHeight}
                        rx={lines.length > 1 ? 6 : 5}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.08)"
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#0F172A"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {lines.map((line, idx) => (
                          <tspan key={idx} x={0} dy={idx === 0 ? 0 : lineHeight}>{line}</tspan>
                        ))}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          });
        })()}
        </svg>

        {/* Nodes Layer */}
        {nodesList.map((node) => {
          const offsetNode: FlowNode = {
            ...node,
            x: node.x - originX,
            y: node.y - originY
          };
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 3
              }}
            >
              <FlowNodeComponent
                node={offsetNode}
                isSelected={false}
                onSelect={() => {}}
                onUpdate={() => {}}
                onStartConnect={() => {}}
                onDragStart={() => {}}
              />
            </div>
          );
        })}
      </>
    );
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
            <Crop size={20} className="drafo-wand-icon" />
            <div>
              <span style={{ display: 'block', lineHeight: 1.2 }}>Visual Export Studio</span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>
                Frame your canvas section and export high-res PNG, JPG, SVG, or PDF
              </span>
            </div>
          </div>
          <button className="drafo-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Format Selector Bar: PNG, JPG, SVG, PDF */}
        <div className="drafo-export-tabs">
          {[
            { id: 'png', label: 'PNG Image', icon: <ImageIcon size={14} /> },
            { id: 'jpg', label: 'JPG Image', icon: <ImageIcon size={14} /> },
            { id: 'svg', label: 'Vector SVG', icon: <FileCode size={14} /> },
            { id: 'pdf', label: 'PDF Document', icon: <FileText size={14} /> }
          ].map((fmt) => (
            <button
              key={fmt.id}
              className={`drafo-tab-btn ${activeFormat === fmt.id ? 'active' : ''}`}
              onClick={() => setActiveFormat(fmt.id as ExportFormat)}
            >
              {fmt.icon}
              <span style={{ fontWeight: 600 }}>{fmt.label}</span>
            </button>
          ))}
        </div>

        {/* Main Body */}
        <div className="drafo-export-body">
          {/* Left Controls Column (Streamlined & Exact) */}
          <div className="drafo-export-controls">
            {/* 1. Crop / Frame Type */}
            <div className="drafo-export-control-group">
              <label className="drafo-control-label">Export Frame / Crop Area</label>
              <div className="drafo-pill-selector">
                <button
                  className={`drafo-pill-option ${cropType === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setCropType('all');
                    setCustomCropBox(null);
                  }}
                  title="Fit all diagram components"
                >
                  <Maximize2 size={13} />
                  <span>All Elements</span>
                </button>
                <button
                  className={`drafo-pill-option ${cropType === 'selection' ? 'active' : ''} ${!hasSelection ? 'disabled' : ''}`}
                  onClick={() => {
                    if (hasSelection) {
                      setCropType('selection');
                      setCustomCropBox(null);
                    }
                  }}
                  disabled={!hasSelection}
                  title={!hasSelection ? 'No nodes currently selected' : 'Crop to selected nodes only'}
                >
                  <Square size={13} />
                  <span>Selection {hasSelection ? `(${selectedIds.length})` : ''}</span>
                </button>
              </div>

              {/* Aspect Ratio Framing Presets */}
              <div className="drafo-pill-selector small" style={{ marginTop: 4 }}>
                <button
                  className={`drafo-pill-option ${cropType === '16:9' ? 'active' : ''}`}
                  onClick={() => {
                    setCropType('16:9');
                    setCustomCropBox(null);
                  }}
                  title="16:9 Landscape Widescreen"
                >
                  16:9 Widescreen
                </button>
                <button
                  className={`drafo-pill-option ${cropType === '1:1' ? 'active' : ''}`}
                  onClick={() => {
                    setCropType('1:1');
                    setCustomCropBox(null);
                  }}
                  title="1:1 Square"
                >
                  1:1 Square
                </button>
                <button
                  className={`drafo-pill-option ${cropType === 'custom' ? 'active' : ''}`}
                  onClick={() => {
                    setCropType('custom');
                    if (!customCropBox) setCustomCropBox(cropBox);
                  }}
                  title="Adjust or drag custom frame section"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* 2. Resolution Scale (for PNG and JPG) */}
            {(activeFormat === 'png' || activeFormat === 'jpg') && (
              <div className="drafo-export-control-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="drafo-control-label">Resolution Scale</label>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    {finalExportWidth} × {finalExportHeight} px
                  </span>
                </div>
                <div className="drafo-pill-selector">
                  {[
                    { label: '1x Web', val: 1 },
                    { label: '2x Retina (HD)', val: 2 },
                    { label: '3x Print (4K)', val: 3 }
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
            )}

            {/* 3. Canvas Background: Plain, Dotted, Lined */}
            <div className="drafo-export-control-group">
              <label className="drafo-control-label">Canvas Background</label>
              <div className="drafo-pill-selector">
                <button
                  className={`drafo-pill-option ${bgPattern === 'plain' ? 'active' : ''}`}
                  onClick={() => setBgPattern('plain')}
                  title="Solid background"
                >
                  <Square size={13} />
                  <span>Plain</span>
                </button>
                <button
                  className={`drafo-pill-option ${bgPattern === 'dots' ? 'active' : ''}`}
                  onClick={() => setBgPattern('dots')}
                  title="Canvas dotted grid"
                >
                  <Circle size={13} />
                  <span>Dotted</span>
                </button>
                <button
                  className={`drafo-pill-option ${bgPattern === 'lines' ? 'active' : ''}`}
                  onClick={() => setBgPattern('lines')}
                  title="Canvas lined grid"
                >
                  <Grid size={13} />
                  <span>Lined</span>
                </button>
              </div>

              {/* Theme: Light vs Dark */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  className={`drafo-bg-option ${bgTheme === 'light' ? 'active' : ''}`}
                  onClick={() => setBgTheme('light')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Sun size={14} color="#D97706" />
                  <span className="drafo-bg-name">Light</span>
                </button>
                <button
                  className={`drafo-bg-option ${bgTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => setBgTheme('dark')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Moon size={14} color="#6366F1" />
                  <span className="drafo-bg-name">Dark</span>
                </button>
              </div>

              {/* Transparent Toggle (PNG & SVG only) */}
              {(activeFormat === 'png' || activeFormat === 'svg') && (
                <label className="drafo-checkbox-row" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={isTransparent}
                    onChange={(e) => setIsTransparent(e.target.checked)}
                  />
                  <span>Transparent Background (Alpha)</span>
                </label>
              )}
            </div>

            {/* 4. Frame Padding */}
            <div className="drafo-export-control-group">
              <label className="drafo-control-label">Frame Padding / Margins</label>
              <div className="drafo-pill-selector">
                {[
                  { label: '16px', val: 16 },
                  { label: '32px', val: 32 },
                  { label: '64px', val: 64 },
                  { label: '96px', val: 96 }
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

            {/* 5. Watermark with Drafo Logo */}
            <div className="drafo-export-toggles">
              <label className="drafo-checkbox-row">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Include Drafo Logo Watermark</span>
                </span>
              </label>
            </div>
          </div>

          {/* Right Live Preview Area (Exact Application Canvas with Crop Box) */}
          <div className={`drafo-export-preview-container theme-${bgTheme}`}>
            <div className="drafo-preview-header">
              {/* Left Group: Title & Metric Badge */}
              <div className="drafo-preview-left-group">
                <span className="drafo-preview-title">Live Canvas Preview</span>
                <div className="drafo-preview-badge">
                  <span className="drafo-preview-dim">{finalExportWidth} × {finalExportHeight}px</span>
                  <span className="drafo-preview-tag">{scale}x</span>
                  <span className="drafo-preview-sep">·</span>
                  <span className="drafo-preview-count">
                    {framedNodes.length} {framedNodes.length === 1 ? 'node' : 'nodes'}
                  </span>
                </div>
              </div>

              {/* Right Group: Unified View Switcher & Zoom Controls */}
              <div className="drafo-preview-toolbar-group">
                {/* Segmented View Switcher */}
                <div className="drafo-segmented-control">
                  <button
                    className={`drafo-segmented-btn ${previewMode === 'canvas-crop' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('canvas-crop')}
                    title="View full canvas with interactive crop section frame"
                  >
                    <Maximize2 size={12} />
                    <span>Canvas View</span>
                  </button>
                  <button
                    className={`drafo-segmented-btn ${previewMode === 'framed' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('framed')}
                    title="View exact cropped export boundary"
                  >
                    <Crop size={12} />
                    <span>Framed View</span>
                  </button>
                </div>

                <div className="drafo-toolbar-divider" />

                {/* Segmented Zoom Controls */}
                <div className="drafo-segmented-control">
                  <button
                    className="drafo-zoom-icon-btn"
                    onClick={() => {
                      const cur = zoomLevel === 'fit' ? autoFitScale : zoomLevel;
                      setZoomLevel(Math.max(0.2, Number((cur - 0.15).toFixed(2))));
                    }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    className={`drafo-zoom-label-btn ${zoomLevel === 'fit' ? 'active' : ''}`}
                    onClick={() => setZoomLevel('fit')}
                    title="Fit Diagram to Preview Viewport"
                  >
                    Fit
                  </button>
                  <button
                    className={`drafo-zoom-label-btn ${zoomLevel === 1 ? 'active' : ''}`}
                    onClick={() => setZoomLevel(1)}
                    title="100% 1:1 Scale"
                  >
                    100%
                  </button>
                  <button
                    className="drafo-zoom-icon-btn"
                    onClick={() => {
                      const cur = zoomLevel === 'fit' ? autoFitScale : zoomLevel;
                      setZoomLevel(Math.min(2.5, Number((cur + 0.15).toFixed(2))));
                    }}
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Canvas Viewport replicating the exact application canvas */}
            <div
              ref={viewportRef}
              className={`drafo-preview-viewport drafo-flow-canvas-container ${bgTheme} ${bgPattern}`}
              style={{
                ...gridBackgroundStyle,
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                userSelect: 'none'
              }}
            >
              {previewMode === 'canvas-crop' ? (
                /* Mode 1: Full Canvas replicating application canvas with interactive Crop Frame Overlay */
                <div
                  className="drafo-canvas-content"
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${effectiveScale})`,
                    transformOrigin: '0 0',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* If transparent export is active, render checkerboard BEHIND elements inside the crop frame */}
                  {isTransparent && (activeFormat === 'png' || activeFormat === 'svg') && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${cropBox.x}px`,
                        top: `${cropBox.y}px`,
                        width: `${cropBox.width}px`,
                        height: `${cropBox.height}px`,
                        borderRadius: '6px',
                        backgroundImage: 'repeating-conic-gradient(#cbd5e1 0% 25%, #f1f5f9 0% 50%)',
                        backgroundSize: '12px 12px',
                        backgroundPosition: '0 0',
                        zIndex: 0,
                        pointerEvents: 'none'
                      }}
                    />
                  )}

                  {/* Diagram Elements on Full Canvas in native coordinates */}
                  {renderDiagramElements(0, 0, allNodes, allEdges)}

                  {/* Translucent Dimmed Backdrop & Interactive Crop Frame Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.width}px`,
                      height: `${cropBox.height}px`,
                      boxShadow: isDark
                        ? '0 0 0 99999px rgba(0, 0, 0, 0.45)'
                        : '0 0 0 99999px rgba(15, 23, 42, 0.12)',
                      border: '2px dashed #4F46E5',
                      borderRadius: '6px',
                      zIndex: 20,
                      pointerEvents: 'none',
                      background: 'transparent'
                    }}
                  >
                    {/* Top Move / Badge Bar */}
                    <div
                      className="drafo-crop-badge"
                      onPointerDown={(e) => handleStartDrag(e, 'move')}
                      style={{
                        position: 'absolute',
                        top: '-28px',
                        left: '0px',
                        background: '#4F46E5',
                        color: '#FFFFFF',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'move',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'auto'
                      }}
                      title="Drag to reposition crop section across canvas"
                    >
                      <Move size={11} />
                      <span>Export Frame: {cropBox.width} × {cropBox.height}px</span>
                      <span style={{ fontSize: '9px', opacity: 0.85, fontWeight: 500 }}>
                        (Drag to move · Handles to resize)
                      </span>
                    </div>

                    {/* 4 Corner Resize Handles */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'nw')}
                      style={{ position: 'absolute', top: -6, left: -6, width: 12, height: 12, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'nwse-resize', zIndex: 25, pointerEvents: 'auto' }}
                      title="Resize Crop Area"
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'ne')}
                      style={{ position: 'absolute', top: -6, right: -6, width: 12, height: 12, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'nesw-resize', zIndex: 25, pointerEvents: 'auto' }}
                      title="Resize Crop Area"
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'sw')}
                      style={{ position: 'absolute', bottom: -6, left: -6, width: 12, height: 12, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'nesw-resize', zIndex: 25, pointerEvents: 'auto' }}
                      title="Resize Crop Area"
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'se')}
                      style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'nwse-resize', zIndex: 25, pointerEvents: 'auto' }}
                      title="Resize Crop Area"
                    />

                    {/* 4 Mid-edge Resize Handles */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'n')}
                      style={{ position: 'absolute', top: -5, left: 'calc(50% - 5px)', width: 10, height: 10, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'ns-resize', zIndex: 25, pointerEvents: 'auto' }}
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 's')}
                      style={{ position: 'absolute', bottom: -5, left: 'calc(50% - 5px)', width: 10, height: 10, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'ns-resize', zIndex: 25, pointerEvents: 'auto' }}
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'w')}
                      style={{ position: 'absolute', left: -5, top: 'calc(50% - 5px)', width: 10, height: 10, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'ew-resize', zIndex: 25, pointerEvents: 'auto' }}
                    />
                    <div
                      onPointerDown={(e) => handleStartDrag(e, 'e')}
                      style={{ position: 'absolute', right: -5, top: 'calc(50% - 5px)', width: 10, height: 10, background: '#FFFFFF', border: '2px solid #4F46E5', borderRadius: 2, cursor: 'ew-resize', zIndex: 25, pointerEvents: 'auto' }}
                    />

                    {/* Drafo Watermark inside the Crop Frame */}
                    {showWatermark && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          right: 14,
                          background: bgTheme === 'dark' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)',
                          border: bgTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.08)',
                          borderRadius: '8px',
                          padding: '5px 11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          pointerEvents: 'none'
                        }}
                      >
                        <DrafoLogo size={20} showWordmark={true} theme={bgTheme} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode 2: Framed Crop Output View (Exact export boundary) */
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto',
                    padding: '24px'
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(cropBox.width * effectiveScale)}px`,
                      height: `${Math.round(cropBox.height * effectiveScale)}px`,
                      position: 'relative',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: `${cropBox.width}px`,
                        height: `${cropBox.height}px`,
                        transform: `scale(${effectiveScale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        backgroundColor: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                          ? undefined
                          : baseColor,
                        backgroundImage: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                          ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #f1f5f9 0% 50%)'
                          : bgPattern === 'dots'
                          ? `radial-gradient(circle, ${dotColor} 1.1px, transparent 1.1px)`
                          : bgPattern === 'lines'
                          ? `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`
                          : 'none',
                        backgroundSize: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                          ? '10px 10px'
                          : '20px 20px',
                        backgroundPosition: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                          ? '50%'
                          : `${-(cropBox.x % 20)}px ${-(cropBox.y % 20)}px`,
                        borderRadius: '6px',
                        boxShadow: isDark
                          ? '0 20px 45px -10px rgba(0,0,0,0.7)'
                          : '0 20px 45px -10px rgba(15,23,42,0.18)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Elements offset to crop frame origin */}
                      {renderDiagramElements(cropBox.x, cropBox.y, exportNodes, exportEdges)}

                      {/* Watermark */}
                      {showWatermark && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 14,
                            background: bgTheme === 'dark' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            border: bgTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: '8px',
                            padding: '5px 11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            zIndex: 10
                          }}
                        >
                          <DrafoLogo size={20} showWordmark={true} theme={bgTheme} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Capture Node Wrapper (Off-screen, keeping captureFrameRef itself at 0,0 relative coordinates) */}
        <div
          style={{
            position: 'fixed',
            left: '-99999px',
            top: '-99999px',
            pointerEvents: 'none',
            zIndex: -9999
          }}
          aria-hidden="true"
        >
          <div
            ref={captureFrameRef}
            style={{
              position: 'relative',
              left: 0,
              top: 0,
              width: `${Math.round(cropBox.width)}px`,
              height: `${Math.round(cropBox.height)}px`,
              overflow: 'hidden',
              backgroundColor: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                ? 'transparent'
                : baseColor,
              backgroundImage: isTransparent && (activeFormat === 'png' || activeFormat === 'svg')
                ? 'none'
                : bgPattern === 'dots'
                ? `radial-gradient(circle, ${dotColor} 1.1px, transparent 1.1px)`
                : bgPattern === 'lines'
                ? `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: `${-(cropBox.x % 20)}px ${-(cropBox.y % 20)}px`,
              boxSizing: 'border-box'
            }}
          >
            {renderDiagramElements(cropBox.x, cropBox.y, exportNodes, exportEdges)}
            {showWatermark && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 14,
                  background: bgTheme === 'dark' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: bgTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '8px',
                  padding: '5px 11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  zIndex: 10
                }}
              >
                <DrafoLogo size={20} showWordmark={true} theme={bgTheme} />
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="drafo-modal-footer">
          <div className="drafo-footer-left">
            {copiedSuccess ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontWeight: 600, fontSize: 13 }}>
                <CheckCircle2 size={16} />
                <span>{copiedSuccess}</span>
              </span>
            ) : (
              <span className="drafo-footer-meta">
                Exporting {framedNodes.length} components · Frame: {cropBox.width}×{cropBox.height}px · Format: {activeFormat.toUpperCase()}
              </span>
            )}
          </div>

          <div className="drafo-footer-actions">
            {/* Copy Action */}
            <button
              className="drafo-btn-secondary"
              onClick={handleCopyImage}
              disabled={isExporting}
              title="Copy framed image to clipboard"
            >
              <Copy size={15} />
              <span>Copy Image</span>
            </button>

            {/* Primary Download Button */}
            <button
              className="drafo-btn-primary"
              onClick={handlePrimaryDownload}
              disabled={isExporting}
            >
              <Download size={15} />
              <span>
                {activeFormat === 'png' && `Download PNG (${scale}x)`}
                {activeFormat === 'jpg' && `Download JPG (${scale}x)`}
                {activeFormat === 'svg' && 'Download SVG'}
                {activeFormat === 'pdf' && 'Print / Save as PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
