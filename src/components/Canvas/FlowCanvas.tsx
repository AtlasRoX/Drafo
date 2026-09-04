'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  FlowProject,
  FlowNode as FlowNodeType,
  FlowEdge as FlowEdgeType,
  FlowSection,
  PortPosition
} from '../../types/flow';
import { FlowNode } from './FlowNode';
import { FlowEdge } from './FlowEdge';
import { SectionHeader } from './SectionHeader';
import { getPortCoordinates } from '../../utils/routing';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo,
  Redo,
  Play,
  Pause,
  MousePointer,
  Hand,
  Search,
  X
} from 'lucide-react';
import { MiniMap } from './MiniMap';
import { collabEngine, PeerPresence } from '../../crdt/yjsProvider';
import { MultiplayerCursors } from './MultiplayerCursors';
import './FlowCanvas.css';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  pos: number;
  start: number;
  end: number;
  distance?: number;
  labelPos?: { x: number; y: number };
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface FlowCanvasProps {
  project: FlowProject;
  selectedId: string | null;
  selectedIds?: string[];
  selectedType: 'node' | 'edge' | 'section' | 'canvas' | null;
  activeSimStep: number | null;
  onSelect: (
    id: string | null,
    type: 'node' | 'edge' | 'section' | 'canvas',
    isMulti?: boolean
  ) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onUpdateProject: (updatedProject: FlowProject) => void;
  onUpdateProjectLive?: (updatedProject: FlowProject) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange?: (newZoom: number) => void;
  onFitView?: () => void;
  onResetZoom?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  project,
  selectedId,
  selectedIds = [],
  selectedType,
  activeSimStep,
  onSelect,
  onSelectMultiple,
  onUpdateProject,
  onUpdateProjectLive,
  canvasRef,
  zoom,
  pan,
  onPanChange,
  onZoomChange,
  onFitView,
  onResetZoom,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSimulating = false,
  onToggleSimulation
}) => {
  // Canvas Interaction Mode ('select' for marquee selection, 'hand' for direct canvas panning)
  const [toolMode, setToolMode] = useState<'select' | 'hand'>('select');

  // Mini-Map Radar state
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(true);

  // Marquee Selection Box
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Collaborative Remote Peers Presence
  const [peers, setPeers] = useState<PeerPresence[]>(() => collabEngine.getRemotePeers());
  useEffect(() => {
    const unsub = collabEngine.onPeersChange((updated) => {
      setPeers(updated);
    });
    return unsub;
  }, []);

  // State for dragging nodes and sections
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [containerChildrenIds, setContainerChildrenIds] = useState<string[]>([]);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragSnapshotRef = useRef<FlowProject | null>(null);
  const projectRef = useRef<FlowProject>(project);
  projectRef.current = project;

  // State for canvas search & jump-to-node
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State for resizing nodes
  const [resizing, setResizing] = useState<{
    nodeId: string;
    handle: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initWidth: number;
    initHeight: number;
  } | null>(null);

  // State for connecting ports & magnetic suction preview
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    fromPort: PortPosition;
    currentPoint: { x: number; y: number };
  } | null>(null);

  const [magneticTarget, setMagneticTarget] = useState<{
    nodeId: string;
    port: PortPosition;
    x: number;
    y: number;
  } | null>(null);

  // State for canvas panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // State for dragging edge waypoint / custom routing
  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    edgeId: string;
    startX: number;
    startY: number;
  } | null>(null);

  // State for Canva-style dragging edge endpoints (reconnect start or end)
  const [draggingEdgeEndpoint, setDraggingEdgeEndpoint] = useState<{
    edgeId: string;
    endpoint: 'source' | 'target';
  } | null>(null);

  // State for Smart Magnetic Alignment Guides
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Refs for 120FPS RAF Physics loop without stale closure lag
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rafWheelIdRef = useRef<number | null>(null);
  const wheelAccRef = useRef({ dx: 0, dy: 0, pinch: 0, mouseX: 0, mouseY: 0 });

  // Track space key for panning, V/H for tool mode, M for mini-map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => {
          const next = !prev;
          if (next) setTimeout(() => searchInputRef.current?.focus(), 50);
          return next;
        });
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      } else if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        setToolMode('select');
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        setToolMode('hand');
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        setIsMiniMapOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Native non-passive Wheel & Trackpad Gesture Engine (120FPS RAF-Batched Physics)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Laptop Trackpad Pinch-to-Zoom or Ctrl+Wheel (High-precision continuous float)
        wheelAccRef.current.pinch += -e.deltaY * 0.006;
        wheelAccRef.current.mouseX = mouseX;
        wheelAccRef.current.mouseY = mouseY;
      } else {
        // 2-Finger Trackpad Pan or Mouse Wheel Scroll
        wheelAccRef.current.dx += e.deltaX;
        wheelAccRef.current.dy += e.deltaY;
      }

      if (!rafWheelIdRef.current) {
        rafWheelIdRef.current = requestAnimationFrame(() => {
          rafWheelIdRef.current = null;
          const acc = wheelAccRef.current;

          if (acc.pinch !== 0 && onZoomChange) {
            const zoomFactor = Math.exp(acc.pinch);
            const currentZ = zoomRef.current;
            const currentP = panRef.current;
            const newZoom = Math.min(Math.max(Number((currentZ * zoomFactor).toFixed(4)), 0.25), 3.0);

            const newPanX = acc.mouseX - ((acc.mouseX - currentP.x) / currentZ) * newZoom;
            const newPanY = acc.mouseY - ((acc.mouseY - currentP.y) / currentZ) * newZoom;

            panRef.current = { x: newPanX, y: newPanY };
            zoomRef.current = newZoom;

            onZoomChange(newZoom);
            onPanChange({ x: newPanX, y: newPanY });
            acc.pinch = 0;
          }

          if (acc.dx !== 0 || acc.dy !== 0) {
            const newPanX = panRef.current.x - acc.dx;
            const newPanY = panRef.current.y - acc.dy;
            panRef.current = { x: newPanX, y: newPanY };
            onPanChange({ x: newPanX, y: newPanY });
            acc.dx = 0;
            acc.dy = 0;
          }
        });
      }
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    el.addEventListener('gesturestart', preventGesture, { passive: false });
    el.addEventListener('gesturechange', preventGesture, { passive: false });
    el.addEventListener('gestureend', preventGesture, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
      el.removeEventListener('gesturestart', preventGesture);
      el.removeEventListener('gesturechange', preventGesture);
      el.removeEventListener('gestureend', preventGesture);
      if (rafWheelIdRef.current) {
        cancelAnimationFrame(rafWheelIdRef.current);
        rafWheelIdRef.current = null;
      }
    };
  }, [canvasRef, onZoomChange, onPanChange]);

  // Convert screen coordinates to canvas space (infinite space)
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [canvasRef, pan, zoom]
  );

  // Snap to grid helper
  const snap = (val: number, size: number = project.canvasSettings.gridSize) => {
    if (!project.canvasSettings.snapToGrid) return Math.round(val);
    return Math.round(val / size) * size;
  };

  // Node Drag Start (Supports Single & Multi-Selection Dragging & Container Groups)
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    if (isSpacePressed || resizing) return;
    e.stopPropagation();

    const targetNode = project.nodes.find((n) => n.id === nodeId);
    if (!targetNode || targetNode.isLocked) return;

    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelect(nodeId, 'node', isMulti);

    dragSnapshotRef.current = JSON.parse(JSON.stringify(project));

    // If target is a container/group, locate all child nodes inside its bounds
    if (targetNode.type === 'container' || targetNode.type === 'group') {
      const innerChildren = project.nodes.filter(
        (n) =>
          n.id !== targetNode.id &&
          n.x >= targetNode.x &&
          n.y >= targetNode.y &&
          n.x + n.width <= targetNode.x + targetNode.width &&
          n.y + n.height <= targetNode.y + targetNode.height
      );
      setContainerChildrenIds(innerChildren.map((c) => c.id));
    } else {
      setContainerChildrenIds([]);
    }

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDragOffset({
      x: canvasPos.x - targetNode.x,
      y: canvasPos.y - targetNode.y
    });
    setDraggingNodeId(nodeId);
  };

  // Section Drag Start
  const handleSectionDragStart = (sectionId: string, e: React.MouseEvent) => {
    if (isSpacePressed || resizing) return;
    e.stopPropagation();
    const targetSection = project.sections.find((s) => s.id === sectionId);
    if (!targetSection || targetSection.isLocked) return;

    onSelect(sectionId, 'section');
    dragSnapshotRef.current = JSON.parse(JSON.stringify(project));

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const currX = targetSection.x ?? 80;
    setDragOffset({
      x: canvasPos.x - currX,
      y: canvasPos.y - targetSection.y
    });
    setDraggingSectionId(sectionId);
  };

  // Node Resize Start
  const handleResizeStart = (nodeId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetNode = project.nodes.find((n) => n.id === nodeId);
    if (!targetNode || targetNode.isLocked) return;

    dragSnapshotRef.current = JSON.parse(JSON.stringify(project));

    setResizing({
      nodeId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initX: targetNode.x,
      initY: targetNode.y,
      initWidth: targetNode.width,
      initHeight: targetNode.height
    });
  };

  // Port Connect Start
  const handleStartConnect = (nodeId: string, port: PortPosition, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetNode = project.nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    const startPos = getPortCoordinates(targetNode, port);
    setConnecting({
      fromNodeId: nodeId,
      fromPort: port,
      currentPoint: startPos
    });
  };

  // Canvas Mouse Down (Panning or Marquee Area Selection on Empty Canvas)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicking on an element (node, port, edge, section, hud), do not start canvas pan/marquee
    const target = e.target as HTMLElement | SVGElement;
    if (
      target.closest('.drafo-flow-node') ||
      target.closest('.drafo-flow-edge') ||
      target.closest('.drafo-section-header') ||
      target.closest('.drafo-canvas-floating-hud')
    ) {
      return;
    }

    // Panning is activated if in Hand mode, holding Space, middle-click, or holding Alt
    if (
      toolMode === 'hand' ||
      isSpacePressed ||
      e.button === 1 ||
      e.altKey
    ) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0 && toolMode === 'select') {
      // Left click in Select mode activates Marquee Area Selection on empty canvas
      e.preventDefault();
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setSelectionBox({
        startX: canvasPos.x,
        startY: canvasPos.y,
        currentX: canvasPos.x,
        currentY: canvasPos.y
      });
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        onSelect(null, 'canvas');
      }
    }
  };

  // Canvas Mouse Move (Dragging, Resizing, Connecting, Panning, Marquee)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Panning
      if (isPanning) {
        onPanChange({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
        return;
      }

      // Marquee Area Dragging
      if (selectionBox) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setSelectionBox((prev) =>
          prev ? { ...prev, currentX: canvasPos.x, currentY: canvasPos.y } : null
        );
        return;
      }

      // Resizing
      if (resizing) {
        const dx = (e.clientX - resizing.startX) / zoom;
        const dy = (e.clientY - resizing.startY) / zoom;
        const minW = 80;
        const minH = 60;

        let newX = resizing.initX;
        let newY = resizing.initY;
        let newW = resizing.initWidth;
        let newH = resizing.initHeight;

        if (resizing.handle.includes('e')) {
          newW = Math.max(minW, snap(resizing.initWidth + dx));
        }
        if (resizing.handle.includes('s')) {
          newH = Math.max(minH, snap(resizing.initHeight + dy));
        }
        if (resizing.handle.includes('w')) {
          const possibleW = resizing.initWidth - dx;
          if (possibleW >= minW) {
            newW = snap(possibleW);
            newX = snap(resizing.initX + dx);
          } else {
            newW = minW;
            newX = resizing.initX + (resizing.initWidth - minW);
          }
        }
        if (resizing.handle.includes('n')) {
          const possibleH = resizing.initHeight - dy;
          if (possibleH >= minH) {
            newH = snap(possibleH);
            newY = snap(resizing.initY + dy);
          } else {
            newH = minH;
            newY = resizing.initY + (resizing.initHeight - minH);
          }
        }

        const updatedNodes = project.nodes.map((node) =>
          node.id === resizing.nodeId
            ? { ...node, x: newX, y: newY, width: newW, height: newH }
            : node
        );
        onUpdateProject({ ...project, nodes: updatedNodes });
        return;
      }

      const canvasPos = screenToCanvas(e.clientX, e.clientY);

      // Broadcast local cursor position to remote peers
      collabEngine.setLocalCursor(canvasPos.x, canvasPos.y, selectedId);

      // Dragging Edge Waypoint / Connector Bending
      if (draggingWaypoint) {
        const snappedX = snap(canvasPos.x);
        const snappedY = snap(canvasPos.y);
        const updatedEdges = project.edges.map((edge) =>
          edge.id === draggingWaypoint.edgeId
            ? { ...edge, controlPoint: { x: snappedX, y: snappedY } }
            : edge
        );
        onUpdateProject({ ...project, edges: updatedEdges });
        return;
      }

      // Node Dragging
      if (draggingNodeId) {
        const targetNode = project.nodes.find((n) => n.id === draggingNodeId);
        if (targetNode) {
          const rawX = canvasPos.x - dragOffset.x;
          const rawY = canvasPos.y - dragOffset.y;
          const width = targetNode.width;
          const height = targetNode.height;

          let snappedX = rawX;
          let snappedY = rawY;
          const guides: AlignmentGuide[] = [];

          // Group dragging: If dragging a node in selectedIds, move all selected nodes together!
          const activeSelectedIds = selectedIds.includes(draggingNodeId)
            ? selectedIds
            : [draggingNodeId];
          const selectedSet = new Set(activeSelectedIds);

          // If dragging a container, also include its contained child nodes
          if (
            (targetNode.type === 'container' || targetNode.type === 'group') &&
            containerChildrenIds.length > 0
          ) {
            containerChildrenIds.forEach((cId) => selectedSet.add(cId));
          }

          // Snapping guides test against nodes outside the selected group
          const otherNodes = project.nodes.filter((n) => !selectedSet.has(n.id));
          const SNAP_THRESHOLD = 8;

          let snappedH = false;
          let snappedV = false;

          for (const other of otherNodes) {
            const otherMidX = other.x + other.width / 2;
            const otherRight = other.x + other.width;
            const otherMidY = other.y + other.height / 2;
            const otherBottom = other.y + other.height;

            const currMidX = rawX + width / 2;
            const currRight = rawX + width;
            const currMidY = rawY + height / 2;
            const currBottom = rawY + height;

            // X-Axis Alignments (Vertical Guides)
            if (!snappedV) {
              if (Math.abs(currMidX - otherMidX) < SNAP_THRESHOLD) {
                snappedX = otherMidX - width / 2;
                snappedV = true;
                guides.push({
                  type: 'vertical',
                  pos: otherMidX,
                  start: Math.min(rawY, other.y) - 40,
                  end: Math.max(rawY + height, otherBottom) + 40
                });
              } else if (Math.abs(rawX - other.x) < SNAP_THRESHOLD) {
                snappedX = other.x;
                snappedV = true;
                guides.push({
                  type: 'vertical',
                  pos: other.x,
                  start: Math.min(rawY, other.y) - 40,
                  end: Math.max(rawY + height, otherBottom) + 40
                });
              } else if (Math.abs(currRight - otherRight) < SNAP_THRESHOLD) {
                snappedX = otherRight - width;
                snappedV = true;
                guides.push({
                  type: 'vertical',
                  pos: otherRight,
                  start: Math.min(rawY, other.y) - 40,
                  end: Math.max(rawY + height, otherBottom) + 40
                });
              }
            }

            // Y-Axis Alignments (Horizontal Guides)
            if (!snappedH) {
              if (Math.abs(currMidY - otherMidY) < SNAP_THRESHOLD) {
                snappedY = otherMidY - height / 2;
                snappedH = true;
                guides.push({
                  type: 'horizontal',
                  pos: otherMidY,
                  start: Math.min(rawX, other.x) - 40,
                  end: Math.max(rawX + width, otherRight) + 40
                });
              } else if (Math.abs(rawY - other.y) < SNAP_THRESHOLD) {
                snappedY = other.y;
                snappedH = true;
                guides.push({
                  type: 'horizontal',
                  pos: other.y,
                  start: Math.min(rawX, other.x) - 40,
                  end: Math.max(rawX + width, otherRight) + 40
                });
              } else if (Math.abs(currBottom - otherBottom) < SNAP_THRESHOLD) {
                snappedY = otherBottom - height;
                snappedH = true;
                guides.push({
                  type: 'horizontal',
                  pos: otherBottom,
                  start: Math.min(rawX, other.x) - 40,
                  end: Math.max(rawX + width, otherRight) + 40
                });
              }
            }
          }

          const finalX = snappedV ? Math.round(snappedX) : snap(snappedX);
          const finalY = snappedH ? Math.round(snappedY) : snap(snappedY);

          setAlignmentGuides(guides);

          const deltaX = finalX - targetNode.x;
          const deltaY = finalY - targetNode.y;

          const liveUpdate = onUpdateProjectLive || onUpdateProject;

          if (deltaX !== 0 || deltaY !== 0) {
            const updatedNodes = project.nodes.map((node) => {
              if (selectedSet.has(node.id)) {
                return { ...node, x: node.x + deltaX, y: node.y + deltaY };
              }
              return node;
            });
            liveUpdate({ ...project, nodes: updatedNodes });
          }
        }
      }

      if (draggingSectionId) {
        const newX = snap(canvasPos.x - dragOffset.x);
        const newY = snap(canvasPos.y - dragOffset.y);

        const updatedSections = project.sections.map((section) =>
          section.id === draggingSectionId ? { ...section, x: newX, y: newY } : section
        );
        const liveUpdate = onUpdateProjectLive || onUpdateProject;
        liveUpdate({ ...project, sections: updatedSections });
      }

      if (connecting) {
        // Search for nearest port across all other nodes for magnetic suction
        type MagnetType = { nodeId: string; port: PortPosition; x: number; y: number };
        let foundMagnet: MagnetType | null = null;
        let minMagDist = 28; // 28px magnetic snap radius

        for (const node of project.nodes) {
          if (node.id === connecting.fromNodeId) continue;
          const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
          for (const p of ports) {
            const pCoord = getPortCoordinates(node, p);
            const dist = Math.hypot(canvasPos.x - pCoord.x, canvasPos.y - pCoord.y);
            if (dist < minMagDist) {
              minMagDist = dist;
              foundMagnet = {
                nodeId: node.id,
                port: p,
                x: pCoord.x,
                y: pCoord.y
              };
            }
          }
        }

        setMagneticTarget(foundMagnet);
        const activePt = foundMagnet ? { x: foundMagnet.x, y: foundMagnet.y } : canvasPos;
        setConnecting((prev) => (prev ? { ...prev, currentPoint: activePt } : null));
      }

      // Canva-Style Endpoint Dragging (reconnecting source or target with magnetic snap)
      if (draggingEdgeEndpoint) {
        type MagnetType = { nodeId: string; port: PortPosition; x: number; y: number };
        let foundMagnet: MagnetType | null = null;
        let minMagDist = 32;

        for (const node of project.nodes) {
          const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
          for (const p of ports) {
            const pCoord = getPortCoordinates(node, p);
            const dist = Math.hypot(canvasPos.x - pCoord.x, canvasPos.y - pCoord.y);
            if (dist < minMagDist) {
              minMagDist = dist;
              foundMagnet = {
                nodeId: node.id,
                port: p,
                x: pCoord.x,
                y: pCoord.y
              };
            }
          }
        }

        setMagneticTarget(foundMagnet);

        if (foundMagnet) {
          const updatedEdges = project.edges.map((e) => {
            if (e.id === draggingEdgeEndpoint.edgeId) {
              if (draggingEdgeEndpoint.endpoint === 'source') {
                return { ...e, fromNodeId: foundMagnet.nodeId, fromPort: foundMagnet.port };
              } else {
                return { ...e, toNodeId: foundMagnet.nodeId, toPort: foundMagnet.port };
              }
            }
            return e;
          });
          const liveUpdate = onUpdateProjectLive || onUpdateProject;
          liveUpdate({ ...project, edges: updatedEdges });
        }
      }
    },
    [
      isPanning,
      panStart,
      onPanChange,
      selectionBox,
      resizing,
      zoom,
      screenToCanvas,
      draggingNodeId,
      selectedIds,
      containerChildrenIds,
      draggingSectionId,
      dragOffset,
      project,
      onUpdateProject,
      onUpdateProjectLive,
      connecting,
      draggingWaypoint,
      draggingEdgeEndpoint
    ]
  );

  // Canvas Mouse Up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(false);
      setDraggingNodeId(null);
      setContainerChildrenIds([]);
      setDraggingSectionId(null);
      setAlignmentGuides([]);

      if (resizing) {
        setResizing(null);
      }
      if (draggingWaypoint) {
        setDraggingWaypoint(null);
      }
      if (draggingEdgeEndpoint) {
        setDraggingEdgeEndpoint(null);
        setMagneticTarget(null);
      }

      // Commit dragged or resized project state to undo/redo history once on mouse release
      if (dragSnapshotRef.current) {
        const hasChanged =
          JSON.stringify(dragSnapshotRef.current.nodes) !== JSON.stringify(projectRef.current.nodes) ||
          JSON.stringify(dragSnapshotRef.current.sections) !== JSON.stringify(projectRef.current.sections) ||
          JSON.stringify(dragSnapshotRef.current.edges) !== JSON.stringify(projectRef.current.edges);
        if (hasChanged) {
          onUpdateProject(projectRef.current);
        }
        dragSnapshotRef.current = null;
      }

      // Finalize Marquee Selection Box
      if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.currentX);
        const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
        const minY = Math.min(selectionBox.startY, selectionBox.currentY);
        const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
        const width = maxX - minX;
        const height = maxY - minY;

        if (width > 6 || height > 6) {
          const intersecting = project.nodes.filter(
            (n) => n.x < maxX && n.x + n.width > minX && n.y < maxY && n.y + n.height > minY
          );

          if (intersecting.length > 0) {
            const foundIds = intersecting.map((n) => n.id);
            if (onSelectMultiple) {
              onSelectMultiple(foundIds);
            } else {
              onSelect(foundIds[0], 'node', false);
            }
          } else {
            onSelect(null, 'canvas');
          }
        } else {
          onSelect(null, 'canvas');
        }
        setSelectionBox(null);
      }

      // Finalize Port Connection with Magnetic Snap
      if (connecting) {
        if (magneticTarget) {
          const newEdge: FlowEdgeType = {
            id: `edge-${Date.now()}`,
            fromNodeId: connecting.fromNodeId,
            toNodeId: magneticTarget.nodeId,
            fromPort: connecting.fromPort,
            toPort: magneticTarget.port,
            label: '',
            lineStyle: 'solid',
            routeType: 'curved',
            color: '#000000',
            width: 1.5,
            arrowhead: 'arrow'
          };

          onUpdateProject({
            ...project,
            edges: [...project.edges, newEdge]
          });
        } else {
          const canvasPos = screenToCanvas(e.clientX, e.clientY);
          const targetNode = project.nodes.find(
            (node) =>
              node.id !== connecting.fromNodeId &&
              canvasPos.x >= node.x - 16 &&
              canvasPos.x <= node.x + node.width + 16 &&
              canvasPos.y >= node.y - 16 &&
              canvasPos.y <= node.y + node.height + 16
          );

          if (targetNode) {
            const targetPorts: PortPosition[] = ['top', 'right', 'bottom', 'left'];
            let closestPort: PortPosition = 'left';
            let minDistance = Infinity;

            for (const p of targetPorts) {
              const pCoords = getPortCoordinates(targetNode, p);
              const dist = Math.hypot(canvasPos.x - pCoords.x, canvasPos.y - pCoords.y);
              if (dist < minDistance) {
                minDistance = dist;
                closestPort = p;
              }
            }

            const newEdge: FlowEdgeType = {
              id: `edge-${Date.now()}`,
              fromNodeId: connecting.fromNodeId,
              toNodeId: targetNode.id,
              fromPort: connecting.fromPort,
              toPort: closestPort,
              label: '',
              lineStyle: 'solid',
              routeType: 'curved',
              color: '#000000',
              width: 1.5,
              arrowhead: 'arrow'
            };

            onUpdateProject({
              ...project,
              edges: [...project.edges, newEdge]
            });
          }
        }
        setConnecting(null);
        setMagneticTarget(null);
      }
    },
    [
      resizing,
      selectionBox,
      connecting,
      magneticTarget,
      project,
      onSelectMultiple,
      onSelect,
      screenToCanvas,
      onUpdateProject
    ]
  );

  // Drag over handler for HTML5 drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/drafo-node');
    const rawType = e.dataTransfer.getData('application/drafo-node-type');

    let preset: any = null;
    if (rawData) {
      try {
        preset = JSON.parse(rawData);
      } catch (err) {
        console.error('Failed to parse drafo-node preset', err);
      }
    }
    if (!preset && rawType) {
      preset = { type: rawType };
    }
    if (!preset) return;

    const nodeType = preset.type || 'server';
    const canvasPos = screenToCanvas(e.clientX, e.clientY);

    const isContainerType = nodeType === 'container' || nodeType === 'group';
    const width = preset.width || (isContainerType ? 500 : 160);
    const height = preset.height || (isContainerType ? 320 : 96);

    const newNode: FlowNodeType = {
      id: `node-${Date.now()}`,
      type: nodeType,
      title: preset.title || (isContainerType ? 'New Architecture Zone' : `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`),
      subtitle: preset.subtitle || (isContainerType ? '10.0.0.0/16' : ''),
      details: preset.details,
      tags: preset.tags || [],
      metric: preset.metric,
      status: preset.status || (isContainerType ? undefined : 'online'),
      icon: preset.icon,
      customData: preset.customData,
      x: snap(canvasPos.x - width / 2),
      y: snap(canvasPos.y - height / 2),
      width,
      height,
      style: preset.style || {
        bg: isContainerType ? 'transparent' : '#FFFFFF',
        borderColor: isContainerType ? '#94A3B8' : '#2563EB',
        borderWidth: 1.5,
        borderRadius: isContainerType ? 14 : 10,
        borderStyle: isContainerType ? 'dashed' : 'solid',
        colorPalette: isContainerType ? undefined : 'blue'
      }
    };

    onUpdateProject({
      ...project,
      nodes: [...project.nodes, newNode]
    });
    onSelect(newNode.id, 'node');
  };

  const handleUpdateNode = (updatedNode: FlowNodeType) => {
    const updated = project.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
    onUpdateProject({ ...project, nodes: updated });
  };

  const handleUpdateEdge = (updatedEdge: FlowEdgeType) => {
    const updated = project.edges.map((e) => (e.id === updatedEdge.id ? updatedEdge : e));
    onUpdateProject({ ...project, edges: updated });
  };

  const handleStartDragWaypoint = useCallback(
    (edgeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dragSnapshotRef.current = project;
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDraggingWaypoint({
        edgeId,
        startX: canvasPos.x,
        startY: canvasPos.y
      });
    },
    [project, screenToCanvas]
  );

  const handleStartDragEndpoint = useCallback(
    (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => {
      e.stopPropagation();
      dragSnapshotRef.current = project;
      setDraggingEdgeEndpoint({ edgeId, endpoint });
    },
    [project]
  );

  const handleUpdateSection = (updatedSection: FlowSection) => {
    const updated = project.sections.map((s) => (s.id === updatedSection.id ? updatedSection : s));
    onUpdateProject({ ...project, sections: updated });
  };

  // Unique edge colors for marker defs
  const uniqueColors = Array.from(
    new Set(
      project.edges
        .map((e) => e.color || '#000000')
        .concat(['#2563EB', '#64748B', '#10B981', '#EF4444'])
    )
  );

  // Adaptive Grid LOD Calculation (Figma-grade)
  const baseGrid = project.canvasSettings.gridSize || 20;

  // Compute adaptive step multiplier so visible screen dots/lines stay between 18px and 44px
  let stepMultiplier = 1;
  const targetMinSpacing = 18;
  while (baseGrid * zoom * stepMultiplier < targetMinSpacing) {
    stepMultiplier *= 2;
  }
  while (baseGrid * zoom * stepMultiplier > targetMinSpacing * 2.5 && stepMultiplier > 1) {
    stepMultiplier /= 2;
  }

  const effectiveGridSize = baseGrid * stepMultiplier * zoom;

  // Theme-aware dot & line color with opacity scaling
  const canvasTheme = project.canvasSettings.theme || 'light';
  const dotColor =
    canvasTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.22)'
      : canvasTheme === 'slate'
      ? 'rgba(148, 163, 184, 0.28)'
      : 'rgba(15, 23, 42, 0.18)';

  const lineColor =
    canvasTheme === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : canvasTheme === 'slate'
      ? 'rgba(148, 163, 184, 0.12)'
      : 'rgba(15, 23, 42, 0.07)';

  // Scale dot radius gently with zoom between 0.85px and 1.25px
  const dotRadius = Math.max(0.85, Math.min(1.25, 1.05 * Math.sqrt(Math.max(0.2, zoom))));

  const gridBackgroundStyle: React.CSSProperties = {
    backgroundPosition: `${pan.x}px ${pan.y}px`,
    backgroundSize: `${effectiveGridSize}px ${effectiveGridSize}px`,
    backgroundImage:
      project.canvasSettings.gridType === 'dots'
        ? `radial-gradient(circle, ${dotColor} ${dotRadius}px, transparent ${dotRadius}px)`
        : project.canvasSettings.gridType === 'lines'
        ? `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`
        : 'none'
  };

  const jumpToNode = (targetNode: FlowNodeType) => {
    const containerW = canvasRef.current?.clientWidth || 1280;
    const containerH = canvasRef.current?.clientHeight || 800;
    const targetPanX = containerW / 2 - (targetNode.x + targetNode.width / 2) * zoom;
    const targetPanY = containerH / 2 - (targetNode.y + targetNode.height / 2) * zoom;
    onPanChange({ x: Math.round(targetPanX), y: Math.round(targetPanY) });
    onSelect(targetNode.id, 'node');
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={canvasRef}
      className={`drafo-flow-canvas-container ${project.canvasSettings.theme} ${project.canvasSettings.gridType} ${
        isPanning ? 'panning' : ''
      } ${isSpacePressed ? 'space-grab' : ''} mode-${toolMode}`}
      style={{
        ...gridBackgroundStyle
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => collabEngine.setLocalCursor(null, null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Live Collaborative Peers Cursors Overlay */}
      <MultiplayerCursors peers={peers} zoom={zoom} pan={pan} />

      <div
        id="drafo-export-target"
        className="drafo-canvas-content"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* INFINITE SVG LAYER FOR CONNECTORS, ARROWS AND MARQUEE SELECTION */}
        <svg
          className="drafo-canvas-svg"
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
            {uniqueColors.map((color) => {
              const colorKey = color.replace('#', '');
              return (
                <React.Fragment key={colorKey}>
                  {/* Standard Filled Arrow End */}
                  <marker
                    id={`marker-arrow-${colorKey}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 L 1.8 5 Z" fill={color} />
                  </marker>

                  {/* Standard Filled Arrow Start (Bidirectional) */}
                  <marker
                    id={`marker-arrow-start-${colorKey}`}
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
                    id={`marker-open-${colorKey}`}
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

                  {/* Open Chevron Arrow Start (Bidirectional) */}
                  <marker
                    id={`marker-open-start-${colorKey}`}
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
                    id={`marker-circle-${colorKey}`}
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
                    id={`marker-circle-start-${colorKey}`}
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

          {/* Render Flow Edges */}
          {project.edges.map((edge, index) => {
            const sourceNode = project.nodes.find((n) => n.id === edge.fromNodeId);
            const targetNode = project.nodes.find((n) => n.id === edge.toNodeId);
            if (!sourceNode || !targetNode) return null;

            const isSimActive = activeSimStep !== null && activeSimStep === index;

            return (
              <FlowEdge
                key={edge.id}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                isSelected={selectedType === 'edge' && selectedId === edge.id}
                isSimActive={isSimActive}
                onSelect={(id, e) => {
                  e.stopPropagation();
                  onSelect(id, 'edge');
                }}
                onUpdate={handleUpdateEdge}
                onStartDragWaypoint={handleStartDragWaypoint}
                onStartDragEndpoint={handleStartDragEndpoint}
                onDelete={(edgeId) => {
                  onUpdateProject({
                    ...project,
                    edges: project.edges.filter((e) => e.id !== edgeId)
                  });
                }}
              />
            );
          })}

          {/* Canva-Style Endpoint Drag Magnetic Suction Marker */}
          {draggingEdgeEndpoint && magneticTarget && (
            <g className="drafo-port-suction-group" pointerEvents="none">
              <circle
                cx={magneticTarget.x}
                cy={magneticTarget.y}
                r={16}
                className="drafo-port-suction-outer"
              />
              <circle
                cx={magneticTarget.x}
                cy={magneticTarget.y}
                r={6}
                className="drafo-port-suction-inner"
              />
            </g>
          )}

          {/* Render Active Connecting Line & Magnetic Target */}
          {connecting && (
            <g className="drafo-connecting-preview">
              {(() => {
                const sourceNode = project.nodes.find((n) => n.id === connecting.fromNodeId);
                if (!sourceNode) return null;
                const p1 = getPortCoordinates(sourceNode, connecting.fromPort);
                const p2 = connecting.currentPoint;
                return (
                  <>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#2563EB"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      markerEnd="url(#marker-arrow-2563EB)"
                    />
                    {magneticTarget && (
                      <g className="drafo-port-suction-group">
                        <circle
                          cx={magneticTarget.x}
                          cy={magneticTarget.y}
                          r={14}
                          className="drafo-port-suction-outer"
                        />
                        <circle
                          cx={magneticTarget.x}
                          cy={magneticTarget.y}
                          r={6}
                          className="drafo-port-suction-inner"
                        />
                      </g>
                    )}
                  </>
                );
              })()}
            </g>
          )}

          {/* Smart Magnetic Alignment Guides */}
          {alignmentGuides.map((guide, idx) => (
            <g key={`guide-${idx}`}>
              <line
                x1={guide.type === 'vertical' ? guide.pos : guide.start}
                y1={guide.type === 'vertical' ? guide.start : guide.pos}
                x2={guide.type === 'vertical' ? guide.pos : guide.end}
                y2={guide.type === 'vertical' ? guide.end : guide.pos}
                stroke="#EC4899"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="drafo-smart-guide"
              />
            </g>
          ))}

          {/* Marquee Area Selection Bounding Box */}
          {selectionBox && (
            <g className="drafo-marquee-group no-export">
              {(() => {
                const minX = Math.min(selectionBox.startX, selectionBox.currentX);
                const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
                const minY = Math.min(selectionBox.startY, selectionBox.currentY);
                const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
                const boxW = maxX - minX;
                const boxH = maxY - minY;

                const count = project.nodes.filter(
                  (n) => n.x < maxX && n.x + n.width > minX && n.y < maxY && n.y + n.height > minY
                ).length;

                return (
                  <>
                    <rect
                      x={minX}
                      y={minY}
                      width={boxW}
                      height={boxH}
                      className="drafo-marquee-rect"
                    />
                    {boxW > 50 && boxH > 25 && count > 0 && (
                      <g transform={`translate(${minX + 8}, ${minY + 18})`}>
                        <rect
                          x={-4}
                          y={-12}
                          width={74}
                          height={18}
                          rx={4}
                          fill="#2563EB"
                        />
                        <text
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="700"
                          dominantBaseline="middle"
                        >
                          {count} selected
                        </text>
                      </g>
                    )}
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* SECTION HEADERS LAYER */}
        {project.sections.map((section) => (
          <SectionHeader
            key={section.id}
            section={section}
            isSelected={selectedType === 'section' && selectedId === section.id}
            onSelect={(id, e) => {
              e.stopPropagation();
              onSelect(id, 'section');
            }}
            onDragStart={handleSectionDragStart}
            onUpdate={handleUpdateSection}
          />
        ))}

        {/* FLOW NODES LAYER */}
        {project.nodes.map((node) => (
          <FlowNode
            key={node.id}
            node={node}
            isSelected={
              selectedType === 'node' &&
              (selectedId === node.id || selectedIds.includes(node.id))
            }
            isSimActive={
              activeSimStep !== null &&
              project.edges[activeSimStep]?.fromNodeId === node.id
            }
            isSimTarget={
              activeSimStep !== null &&
              project.edges[activeSimStep]?.toNodeId === node.id
            }
            onSelect={(id, e) => {
              e.stopPropagation();
              const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
              onSelect(id, 'node', isMulti);
            }}
            onDragStart={handleNodeDragStart}
            onResizeStart={handleResizeStart}
            onStartConnect={handleStartConnect}
            onUpdate={handleUpdateNode}
          />
        ))}

        {/* Live Coordinate & Dimension Micro-HUD */}
        {(draggingNodeId || resizing) && (() => {
          const activeNode = project.nodes.find((n) => n.id === (draggingNodeId || resizing?.nodeId));
          if (!activeNode) return null;
          return (
            <div
              className="drafo-live-coords-hud"
              style={{
                transform: `translate(${activeNode.x + activeNode.width / 2}px, ${activeNode.y - 24}px)`
              }}
            >
              <span>X: {Math.round(activeNode.x)}</span>
              <span>Y: {Math.round(activeNode.y)}</span>
              <span className="dim">{Math.round(activeNode.width)}×{Math.round(activeNode.height)}</span>
            </div>
          );
        })()}
      </div>

      {/* Radar Mini-Map in Bottom-Left */}
      <MiniMap
        project={project}
        pan={pan}
        zoom={zoom}
        viewportWidth={canvasRef.current?.clientWidth || 1280}
        viewportHeight={canvasRef.current?.clientHeight || 800}
        onPanChange={onPanChange}
        isOpen={isMiniMapOpen}
        onToggle={() => setIsMiniMapOpen((o) => !o)}
      />

      {/* FLOATING NAVIGATION HUD (Tools, Zoom, Undo/Redo & Simulation) */}
      <div className="drafo-canvas-floating-hud">
        {/* Single Smart Tool Mode Toggle: Cursor (Select) <-> Hand / Thumb (Pan) */}
        <button
          className="drafo-hud-btn"
          onClick={() => setToolMode((prev) => (prev === 'select' ? 'hand' : 'select'))}
          title={
            toolMode === 'select'
              ? 'Cursor Tool (Click or press H to switch to Hand Pan)'
              : 'Hand Pan Tool (Click or press V to switch to Cursor Select)'
          }
        >
          {toolMode === 'select' ? <MousePointer size={15} /> : <Hand size={15} />}
        </button>

        <div className="drafo-hud-divider" />

        {/* Undo / Redo */}
        {onUndo && (
          <button
            className="drafo-hud-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={15} />
          </button>
        )}
        {onRedo && (
          <button
            className="drafo-hud-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={15} />
          </button>
        )}

        {(onUndo || onRedo) && <div className="drafo-hud-divider" />}

        {/* Zoom Controls */}
        <button
          className="drafo-hud-btn"
          onClick={() => onZoomChange && onZoomChange(Math.max(Number((zoom - 0.1).toFixed(2)), 0.35))}
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut size={15} />
        </button>
        <span
          className="drafo-hud-zoom-text"
          onClick={onResetZoom}
          title="Click to reset zoom to 100% (Ctrl 0)"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="drafo-hud-btn"
          onClick={() => onZoomChange && onZoomChange(Math.min(Number((zoom + 0.1).toFixed(2)), 2.5))}
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="drafo-hud-btn"
          onClick={onFitView}
          title="Fit diagram to viewport (Shift+1)"
        >
          <Maximize2 size={15} />
        </button>

        {/* Play/Pause Simulation Icon Button */}
        {onToggleSimulation && (
          <>
            <div className="drafo-hud-divider" />
            <button
              className={`drafo-hud-btn drafo-hud-play-btn ${isSimulating ? 'active' : ''}`}
              onClick={onToggleSimulation}
              title={isSimulating ? 'Stop Flow Simulation' : 'Play Flow Simulation'}
            >
              {isSimulating ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </>
        )}
      </div>

      {/* Floating Canvas Quick Search (Ctrl+F) */}
      {isSearchOpen && (
        <div className="drafo-canvas-search-modal" onClick={(e) => e.stopPropagation()}>
          <div className="drafo-canvas-search-input-wrap">
            <Search size={15} className="drafo-canvas-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Jump to component... (Press Enter or click)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                } else if (e.key === 'Enter') {
                  const q = searchQuery.toLowerCase().trim();
                  const match = project.nodes.find(
                    (n) =>
                      n.title.toLowerCase().includes(q) ||
                      (n.subtitle && n.subtitle.toLowerCase().includes(q))
                  );
                  if (match) {
                    jumpToNode(match);
                  }
                }
              }}
              className="drafo-canvas-search-input"
            />
            <button
              className="drafo-canvas-search-close"
              onClick={() => setIsSearchOpen(false)}
            >
              <X size={14} />
            </button>
          </div>

          {searchQuery.trim() && (
            <div className="drafo-canvas-search-results">
              {project.nodes
                .filter(
                  (n) =>
                    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (n.subtitle && n.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .slice(0, 6)
                .map((match) => (
                  <button
                    key={match.id}
                    className="drafo-canvas-search-result-item"
                    onClick={() => jumpToNode(match)}
                  >
                    <div className="drafo-search-item-info">
                      <span className="drafo-search-item-title">{match.title}</span>
                      {match.subtitle && (
                        <span className="drafo-search-item-sub">{match.subtitle}</span>
                      )}
                    </div>
                    <span className="drafo-search-item-type">{match.type}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
