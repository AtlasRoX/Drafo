'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlowProject,
  FlowNode as FlowNodeType,
  FlowEdge as FlowEdgeType,
  FlowSection,
  PortPosition
} from '../../types/flow';
import { FlowNode, FlowNodeMemo } from './FlowNode';
import { FlowEdge, FlowEdgeMemo, FlowEdgeHandles } from './FlowEdge';
import { SectionHeader } from './SectionHeader';
import { getPortCoordinates, getPortNormal, calculateEdgePath } from '../../utils/routing';
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
  Type,
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
  onDropFile?: (file: File) => void;
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
  onToggleSimulation,
  onDropFile
}) => {
  // Canvas Interaction Mode ('select' for marquee selection, 'hand' for direct canvas panning, 'text' for adding text)
  const [toolMode, setToolMode] = useState<'select' | 'hand' | 'text'>('select');

  // Mini-Map Radar state
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(true);

  // Marquee Selection Box
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Last mouse position on screen for accurate pasting
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

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
  const draggingNodeIdRef = useRef<string | null>(null);
  draggingNodeIdRef.current = draggingNodeId;

  const [containerChildrenIds, setContainerChildrenIds] = useState<string[]>([]);

  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const draggingSectionIdRef = useRef<string | null>(null);
  draggingSectionIdRef.current = draggingSectionId;

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // State for dragging edge waypoint / custom routing (supports arbitrary multiple waypoints)
  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    edgeId: string;
    waypointIndex?: number;
    startX: number;
    startY: number;
  } | null>(null);

  // State for Canva-style dragging edge endpoints (reconnect start or end)
  const [draggingEdgeEndpoint, setDraggingEdgeEndpoint] = useState<{
    edgeId: string;
    endpoint: 'source' | 'target';
  } | null>(null);

  const [dragEndpointPos, setDragEndpointPos] = useState<{
    edgeId: string;
    endpoint: 'source' | 'target';
    point: { x: number; y: number };
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

  const draggingEdgeEndpointRef = useRef(draggingEdgeEndpoint);
  draggingEdgeEndpointRef.current = draggingEdgeEndpoint;
  const magneticTargetRef = useRef(magneticTarget);
  magneticTargetRef.current = magneticTarget;
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;
  const draggingWaypointRef = useRef(draggingWaypoint);
  draggingWaypointRef.current = draggingWaypoint;

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  // O(1) Set for hot-path .has() checks in handleMouseMove
  const selectedSetRef = useRef<Set<string>>(new Set(selectedIds));
  selectedSetRef.current = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasDraggedNodeRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragNodeIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(isPanning);
  isPanningRef.current = isPanning;
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;
  const selectionBoxRef = useRef(selectionBox);
  selectionBoxRef.current = selectionBox;
  // Lightweight drag snapshot — only positions, no JSON.parse(JSON.stringify)
  const dragInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragInitialEdgeControlsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragInitialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Multi-edge offset calculation: cleanly separates multiple/bidirectional edges between the same two nodes
  const multiEdgeOffsets = useMemo(() => {
    const pairMap = new Map<string, FlowEdgeType[]>();
    for (const edge of project.edges) {
      const pairKey = [edge.fromNodeId, edge.toNodeId].sort().join(':::');
      const list = pairMap.get(pairKey) || [];
      list.push(edge);
      pairMap.set(pairKey, list);
    }

    const offsets = new Map<string, number>();

    pairMap.forEach((edges) => {
      if (edges.length <= 1) return;
      const total = edges.length;
      if (total === 2) {
        const [e1, e2] = edges;
        const isOpposite = e1.fromNodeId === e2.toNodeId && e1.toNodeId === e2.fromNodeId;
        if (isOpposite) {
          // Opposite direction: both having +34 in their local coordinate systems
          // naturally bows them in opposite directions in world coordinates!
          offsets.set(e1.id, 34);
          offsets.set(e2.id, 34);
        } else {
          // Same direction: one bows left (-34), one bows right (+34)
          offsets.set(e1.id, -34);
          offsets.set(e2.id, 34);
        }
      } else {
        const spacing = 32;
        const half = (total - 1) / 2;
        edges.forEach((e, idx) => {
          offsets.set(e.id, (idx - half) * spacing);
        });
      }
    });

    return offsets;
  }, [project.edges]);

  // Global label collision detector: ensures NO two edge labels ever overlap on canvas
  const labelCollisionAdjustments = useMemo(() => {
    const adjustments = new Map<string, { x: number; y: number }>();
    
    // First pass: compute preliminary label positions for all labeled edges
    const labeledEdges: { id: string; x: number; y: number }[] = [];
    for (const edge of project.edges) {
      if (!edge.label && edge.stepNumber === undefined) continue;
      const source = project.nodes.find((n) => n.id === edge.fromNodeId);
      const target = project.nodes.find((n) => n.id === edge.toNodeId);
      if (!source || !target) continue;

      const mOffset = multiEdgeOffsets.get(edge.id) || 0;
      const { labelPosition } = calculateEdgePath(
        source,
        target,
        edge.fromPort,
        edge.toPort,
        edge.routeType || 'curved',
        edge.controlPoint,
        undefined,
        undefined,
        mOffset
      );
      labeledEdges.push({ id: edge.id, x: labelPosition.x, y: labelPosition.y });
    }

    // Check pairwise collisions
    for (let i = 0; i < labeledEdges.length; i++) {
      for (let j = i + 1; j < labeledEdges.length; j++) {
        const a = labeledEdges[i];
        const b = labeledEdges[j];
        const adjA = adjustments.get(a.id) || { x: 0, y: 0 };
        const adjB = adjustments.get(b.id) || { x: 0, y: 0 };

        const posXA = a.x + adjA.x;
        const posYA = a.y + adjA.y;
        const posXB = b.x + adjB.x;
        const posYB = b.y + adjB.y;

        const dx = Math.abs(posXA - posXB);
        const dy = Math.abs(posYA - posYB);

        // Typical label pill is ~70-130px wide and ~22-30px high
        if (dx < 75 && dy < 28) {
          // They overlap! Push them apart vertically
          const shiftY = 16;
          adjustments.set(a.id, { x: adjA.x, y: adjA.y - shiftY });
          adjustments.set(b.id, { x: adjB.x, y: adjB.y + shiftY });
        }
      }
    }

    return adjustments;
  }, [project.edges, project.nodes, multiEdgeOffsets]);


  // Track space key for panning, V/H for tool mode, M for mini-map, Ctrl+A for select all
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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = project.nodes.map((n) => n.id);
        if (onSelectMultiple) {
          onSelectMultiple(allIds);
        } else if (allIds.length > 0) {
          onSelect(allIds[0], 'node');
        }
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
      } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        setToolMode((prev) => (prev === 'text' ? 'select' : 'text'));
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
      const x = (screenX - rect.left - panRef.current.x) / zoomRef.current;
      const y = (screenY - rect.top - panRef.current.y) / zoomRef.current;
      return { x, y };
    },
    [canvasRef]
  );

  // Snap to grid helper
  const snap = (val: number, size: number = project.canvasSettings.gridSize) => {
    if (!project.canvasSettings.snapToGrid) return Math.round(val);
    return Math.round(val / size) * size;
  };

  // Node Drag Start (Supports Single & Multi-Selection Dragging & Container Groups)
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    if (isSpacePressed || resizing) return;

    // Ignore interactive element clicks inside node (buttons, inputs, handles, ports)
    const targetEl = e.target as HTMLElement;
    if (
      targetEl &&
      targetEl.closest(
        'input, textarea, button, select, [contenteditable="true"], .drafo-node-resize-handle, .drafo-port'
      )
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const proj = projectRef.current;
    const targetNode = proj.nodes.find((n) => n.id === nodeId);
    if (!targetNode || targetNode.isLocked) return;

    hasDraggedNodeRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    const curSelected = selectedIdsRef.current || [];

    if (!curSelected.includes(nodeId)) {
      onSelect(nodeId, 'node', isMulti);
    } else if (isMulti) {
      onSelect(nodeId, 'node', true);
      return;
    }
    // If nodeId is already in curSelected and !isMulti, keep current selection for group dragging

    // Build the effective selected set (expand containers to include children)
    const activeSelectedIds = curSelected.includes(nodeId) ? curSelected : [nodeId];
    const selectedSet = new Set(activeSelectedIds);
    proj.nodes.forEach((node) => {
      if (selectedSet.has(node.id) && (node.type === 'container' || node.type === 'group')) {
        proj.nodes.forEach((child) => {
          if (
            child.id !== node.id &&
            child.x >= node.x &&
            child.y >= node.y &&
            child.x + child.width <= node.x + node.width &&
            child.y + child.height <= node.y + node.height
          ) {
            selectedSet.add(child.id);
          }
        });
      }
    });

    // Lightweight snapshot: store only positions (replaces JSON.parse(JSON.stringify(project)))
    const posMap = new Map<string, { x: number; y: number }>();
    proj.nodes.forEach((n) => {
      if (selectedSet.has(n.id)) posMap.set(n.id, { x: n.x, y: n.y });
    });
    dragInitialPositionsRef.current = posMap;

    // Snapshot edge control points for internal edges (both ends in selection)
    const edgeControlMap = new Map<string, { x: number; y: number }>();
    proj.edges.forEach((edge) => {
      if (edge.controlPoint && selectedSet.has(edge.fromNodeId) && selectedSet.has(edge.toNodeId)) {
        edgeControlMap.set(edge.id, { x: edge.controlPoint.x, y: edge.controlPoint.y });
      }
    });
    dragInitialEdgeControlsRef.current = edgeControlMap;

    // Store target node initial canvas position for delta computation
    dragInitialOffsetRef.current = { x: targetNode.x, y: targetNode.y };

    // If target is a container/group, locate all child nodes inside its bounds
    if (targetNode.type === 'container' || targetNode.type === 'group') {
      const innerChildren = proj.nodes.filter(
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
    const initialOffset = {
      x: canvasPos.x - targetNode.x,
      y: canvasPos.y - targetNode.y
    };
    dragOffsetRef.current = initialOffset;
    setDragOffset(initialOffset);

    // Record pending drag node; do NOT set draggingNodeId until cursor moves > 3px to avoid sticky clicks
    pendingDragNodeIdRef.current = nodeId;

    // Save full snapshot for undo/redo history and regression verification on release
    dragSnapshotRef.current = JSON.parse(JSON.stringify(proj));
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
    if (!targetNode || targetNode.type === 'container' || targetNode.type === 'group') return;

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

    // Left click in Text mode places a new Text Annotation Node at the clicked canvas coordinate
    if (e.button === 0 && toolMode === 'text') {
      e.preventDefault();
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      const newTextNode: FlowNodeType = {
        id: `node-${Date.now()}`,
        type: 'text',
        title: 'Text Annotation',
        subtitle: '',
        x: snap(canvasPos.x),
        y: snap(canvasPos.y),
        width: 200,
        height: 48,
        customData: {
          fontSize: 16,
          fontWeight: 'normal',
          textAlign: 'left'
        },
        style: {
          bg: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 0,
          colorPalette: 'slate'
        }
      };
      onUpdateProject({
        ...projectRef.current,
        nodes: [...projectRef.current.nodes, newTextNode]
      });
      onSelect(newTextNode.id, 'node');
      setToolMode('select');
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
      const ps = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      panStartRef.current = ps;
      setPanStart(ps);
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
      // Safety release: If no mouse button is held down (e.buttons === 0), cancel any drag immediately
      if (e.buttons === 0) {
        if (
          draggingNodeIdRef.current ||
          pendingDragNodeIdRef.current ||
          isPanning ||
          resizing ||
          draggingWaypointRef.current ||
          draggingEdgeEndpointRef.current
        ) {
          handleMouseUp(e);
          return;
        }
      }

      // Panning
      if (isPanning) {
        onPanChange({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y
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
        const dx = (e.clientX - resizing.startX) / zoomRef.current;
        const dy = (e.clientY - resizing.startY) / zoomRef.current;
        const minW = 80;
        const minH = 60;

        let newX = resizing.initX;
        let newY = resizing.initY;
        let newW = resizing.initWidth;
        let newH = resizing.initHeight;
        const dimGrid = (project.canvasSettings.gridSize || 20) * 2;

        if (resizing.handle.includes('e')) {
          newW = Math.max(minW, snap(resizing.initWidth + dx, dimGrid));
        }
        if (resizing.handle.includes('s')) {
          newH = Math.max(minH, snap(resizing.initHeight + dy, dimGrid));
        }
        if (resizing.handle.includes('w')) {
          const possibleW = resizing.initWidth - dx;
          if (possibleW >= minW) {
            newW = snap(possibleW, dimGrid);
            newX = snap(resizing.initX + dx);
          } else {
            newW = minW;
            newX = resizing.initX + (resizing.initWidth - minW);
          }
        }
        if (resizing.handle.includes('n')) {
          const possibleH = resizing.initHeight - dy;
          if (possibleH >= minH) {
            newH = snap(possibleH, dimGrid);
            newY = snap(resizing.initY + dy);
          } else {
            newH = minH;
            newY = resizing.initY + (resizing.initHeight - minH);
          }
        }

        const proj = projectRef.current;
        const updatedNodes = proj.nodes.map((node) =>
          node.id === resizing.nodeId
            ? { ...node, x: newX, y: newY, width: newW, height: newH }
            : node
        );
        onUpdateProject({ ...proj, nodes: updatedNodes });
        return;
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      const canvasPos = screenToCanvas(e.clientX, e.clientY);

      // Broadcast local cursor position to remote peers (throttled — skip during active node drag)
      if (!draggingNodeId) {
        collabEngine.setLocalCursor(canvasPos.x, canvasPos.y, selectedId);
      }

      // Dragging Edge Waypoint / Connector Bending with Smart Magnetic Snapping
      if (draggingWaypoint) {
        const proj = projectRef.current;
        const targetEdge = proj.edges.find((edge) => edge.id === draggingWaypoint.edgeId);
        let curX = Math.round(canvasPos.x);
        let curY = Math.round(canvasPos.y);

        if (targetEdge) {
          // If dragging a specific waypoint in the multi-waypoint list
          if (draggingWaypoint.waypointIndex !== undefined) {
            const currentWaypoints = targetEdge.waypoints
              ? [...targetEdge.waypoints]
              : targetEdge.controlPoint
              ? [targetEdge.controlPoint]
              : [];
            currentWaypoints[draggingWaypoint.waypointIndex] = { x: curX, y: curY };
            const updatedEdges = proj.edges.map((edge) =>
              edge.id === draggingWaypoint.edgeId
                ? {
                    ...edge,
                    waypoints: currentWaypoints,
                    controlPoint: currentWaypoints[0]
                  }
                : edge
            );
            const liveUpdate = onUpdateProjectLive || onUpdateProject;
            liveUpdate({ ...proj, edges: updatedEdges });
            return;
          }

          const waypointGuides: AlignmentGuide[] = [];
          const sNode = proj.nodes.find((n) => n.id === targetEdge.fromNodeId);
          const tNode = proj.nodes.find((n) => n.id === targetEdge.toNodeId);
          if (sNode && tNode) {
            const p1 = getPortCoordinates(sNode, targetEdge.fromPort);
            const p2 = getPortCoordinates(tNode, targetEdge.toPort);

            const isH =
              (targetEdge.fromPort === 'left' || targetEdge.fromPort === 'right') &&
              (targetEdge.toPort === 'left' || targetEdge.toPort === 'right');
            const isV =
              (targetEdge.fromPort === 'top' || targetEdge.fromPort === 'bottom') &&
              (targetEdge.toPort === 'top' || targetEdge.toPort === 'bottom');

            const baseY = Math.round((p1.y + p2.y) / 2);
            const baseX = Math.round((p1.x + p2.x) / 2);
            const SNAP_MAG = 18;

            if (isH) {
              // 1. Magnetic snap to horizontal baseline Y
              if (Math.abs(canvasPos.y - baseY) < SNAP_MAG) {
                curY = baseY;
                waypointGuides.push({
                  type: 'horizontal',
                  pos: baseY,
                  start: Math.min(p1.x, p2.x) - 40,
                  end: Math.max(p1.x, p2.x) + 40
                });
              } else if (Math.abs(canvasPos.y - p1.y) < SNAP_MAG) {
                curY = p1.y;
                waypointGuides.push({
                  type: 'horizontal',
                  pos: p1.y,
                  start: Math.min(p1.x, p2.x) - 40,
                  end: Math.max(p1.x, p2.x) + 40
                });
              } else if (Math.abs(canvasPos.y - p2.y) < SNAP_MAG) {
                curY = p2.y;
                waypointGuides.push({
                  type: 'horizontal',
                  pos: p2.y,
                  start: Math.min(p1.x, p2.x) - 40,
                  end: Math.max(p1.x, p2.x) + 40
                });
              }

              // 2. Magnetic snap to midpoint X between ports
              if (Math.abs(canvasPos.x - baseX) < SNAP_MAG) {
                curX = baseX;
                waypointGuides.push({
                  type: 'vertical',
                  pos: baseX,
                  start: Math.min(p1.y, p2.y) - 40,
                  end: Math.max(p1.y, p2.y) + 40
                });
              }
            } else if (isV) {
              // 1. Magnetic snap to vertical baseline X
              if (Math.abs(canvasPos.x - baseX) < SNAP_MAG) {
                curX = baseX;
                waypointGuides.push({
                  type: 'vertical',
                  pos: baseX,
                  start: Math.min(p1.y, p2.y) - 40,
                  end: Math.max(p1.y, p2.y) + 40
                });
              } else if (Math.abs(canvasPos.x - p1.x) < SNAP_MAG) {
                curX = p1.x;
                waypointGuides.push({
                  type: 'vertical',
                  pos: p1.x,
                  start: Math.min(p1.y, p2.y) - 40,
                  end: Math.max(p1.y, p2.y) + 40
                });
              } else if (Math.abs(canvasPos.x - p2.x) < SNAP_MAG) {
                curX = p2.x;
                waypointGuides.push({
                  type: 'vertical',
                  pos: p2.x,
                  start: Math.min(p1.y, p2.y) - 40,
                  end: Math.max(p1.y, p2.y) + 40
                });
              }

              // 2. Magnetic snap to midpoint Y between ports
              if (Math.abs(canvasPos.y - baseY) < SNAP_MAG) {
                curY = baseY;
                waypointGuides.push({
                  type: 'horizontal',
                  pos: baseY,
                  start: Math.min(p1.x, p2.x) - 40,
                  end: Math.max(p1.x, p2.x) + 40
                });
              }
            } else {
              // Diagonal or mixed port route
              const lineLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              if (lineLen > 1) {
                const t = Math.max(0, Math.min(1, ((canvasPos.x - p1.x) * (p2.x - p1.x) + (canvasPos.y - p1.y) * (p2.y - p1.y)) / (lineLen * lineLen)));
                const projX = p1.x + t * (p2.x - p1.x);
                const projY = p1.y + t * (p2.y - p1.y);
                if (Math.hypot(canvasPos.x - projX, canvasPos.y - projY) < SNAP_MAG) {
                  curX = Math.round(projX);
                  curY = Math.round(projY);
                }
              }
            }

            setAlignmentGuides(waypointGuides);
          }

          const updatedEdges = proj.edges.map((edge) => {
            if (edge.id !== draggingWaypoint.edgeId) return edge;
            if (edge.waypoints && edge.waypoints.length > 0) {
              const wps = [...edge.waypoints];
              wps[0] = { x: curX, y: curY };
              return { ...edge, waypoints: wps, controlPoint: { x: curX, y: curY } };
            }
            return { ...edge, controlPoint: { x: curX, y: curY } };
          });
          const liveUpdate = onUpdateProjectLive || onUpdateProject;
          liveUpdate({ ...proj, edges: updatedEdges });
          return;
        }
      }

      // Track drag movement distance to distinguish a click from a drag
      if (pendingDragNodeIdRef.current && dragStartPosRef.current) {
        const dist = Math.hypot(
          e.clientX - dragStartPosRef.current.x,
          e.clientY - dragStartPosRef.current.y
        );
        if (dist > 3) {
          hasDraggedNodeRef.current = true;
          if (draggingNodeIdRef.current !== pendingDragNodeIdRef.current) {
            draggingNodeIdRef.current = pendingDragNodeIdRef.current;
            setDraggingNodeId(pendingDragNodeIdRef.current);
          }
        }
      }

      // Node Dragging — only moves when actually dragged past threshold with button held down
      const activeDragNodeId = draggingNodeIdRef.current;
      if (activeDragNodeId && hasDraggedNodeRef.current) {
        const proj = projectRef.current;
        const initialPos = dragInitialPositionsRef.current.get(activeDragNodeId);
        if (!initialPos) return;

        const offset = dragOffsetRef.current;
        const rawX = canvasPos.x - offset.x;
        const rawY = canvasPos.y - offset.y;

        // Use the dragged node's current width/height from live project for snap calc
        const draggedNode = proj.nodes.find((n) => n.id === activeDragNodeId);
        const width = draggedNode?.width ?? 160;
        const height = draggedNode?.height ?? 96;

        // Default grid snap: locks node center & connection ports directly onto canvas dot grid
        const baseGrid = project.canvasSettings.gridSize || 20;
        const shouldGridSnap = project.canvasSettings.snapToGrid && !e.altKey;
        const centerGridX = Math.round((rawX + width / 2) / baseGrid) * baseGrid;
        const centerGridY = Math.round((rawY + height / 2) / baseGrid) * baseGrid;
        const defaultGridX = shouldGridSnap ? centerGridX - width / 2 : Math.round(rawX);
        const defaultGridY = shouldGridSnap ? centerGridY - height / 2 : Math.round(rawY);

        // Smart Magnetic Guides (subtle, Figma-grade: 6px threshold scaled by zoom)
        const SNAP_THRESHOLD = Math.max(4, Math.min(8, 6 / zoom));
        const activeSet = selectedSetRef.current.has(activeDragNodeId)
          ? selectedSetRef.current
          : new Set([activeDragNodeId]);

        const otherNodes = proj.nodes.filter((n) => !activeSet.has(n.id));

        const currMidX = rawX + width / 2;
        const currRight = rawX + width;
        const currMidY = rawY + height / 2;
        const currBottom = rawY + height;

        let bestSnapX: { val: number; dist: number; guide: AlignmentGuide } | null = null;
        let bestSnapY: { val: number; dist: number; guide: AlignmentGuide } | null = null;

        for (const other of otherNodes) {
          const otherMidX = other.x + other.width / 2;
          const otherRight = other.x + other.width;
          const otherMidY = other.y + other.height / 2;
          const otherBottom = other.y + other.height;

          // 1. Direct Port-to-Port collinear alignment (only on the relevant axis!)
          const connectedEdges = proj.edges.filter(
            (ed) =>
              (ed.fromNodeId === activeDragNodeId && ed.toNodeId === other.id) ||
              (ed.toNodeId === activeDragNodeId && ed.fromNodeId === other.id)
          );

          for (const edge of connectedEdges) {
            const isDragSource = edge.fromNodeId === activeDragNodeId;
            const dragPort = isDragSource ? edge.fromPort : edge.toPort;
            const otherPort = isDragSource ? edge.toPort : edge.fromPort;
            const otherPortCoord = getPortCoordinates(other, otherPort);

            // Horizontal connection: snap Y to make the connector line straight
            if (
              (dragPort === 'left' && otherPort === 'right') ||
              (dragPort === 'right' && otherPort === 'left')
            ) {
              const idealY = otherPortCoord.y - height / 2;
              const distY = Math.abs(rawY - idealY);
              if (distY <= SNAP_THRESHOLD && (!bestSnapY || distY < bestSnapY.dist)) {
                bestSnapY = {
                  val: idealY,
                  dist: distY,
                  guide: {
                    type: 'horizontal',
                    pos: otherPortCoord.y,
                    start: Math.min(rawX, other.x) - 30,
                    end: Math.max(currRight, otherRight) + 30
                  }
                };
              }
            }

            // Vertical connection: snap X to make the connector line straight
            if (
              (dragPort === 'top' && otherPort === 'bottom') ||
              (dragPort === 'bottom' && otherPort === 'top')
            ) {
              const idealX = otherPortCoord.x - width / 2;
              const distX = Math.abs(rawX - idealX);
              if (distX <= SNAP_THRESHOLD && (!bestSnapX || distX < bestSnapX.dist)) {
                bestSnapX = {
                  val: idealX,
                  dist: distX,
                  guide: {
                    type: 'vertical',
                    pos: otherPortCoord.x,
                    start: Math.min(rawY, other.y) - 30,
                    end: Math.max(currBottom, otherBottom) + 30
                  }
                };
              }
            }
          }

          // 2. Center-to-Center Alignment (Figma standard)
          const distMidX = Math.abs(currMidX - otherMidX);
          if (distMidX <= SNAP_THRESHOLD && (!bestSnapX || distMidX < bestSnapX.dist)) {
            bestSnapX = {
              val: otherMidX - width / 2,
              dist: distMidX,
              guide: {
                type: 'vertical',
                pos: otherMidX,
                start: Math.min(rawY, other.y) - 30,
                end: Math.max(currBottom, otherBottom) + 30
              }
            };
          }

          const distMidY = Math.abs(currMidY - otherMidY);
          if (distMidY <= SNAP_THRESHOLD && (!bestSnapY || distMidY < bestSnapY.dist)) {
            bestSnapY = {
              val: otherMidY - height / 2,
              dist: distMidY,
              guide: {
                type: 'horizontal',
                pos: otherMidY,
                start: Math.min(rawX, other.x) - 30,
                end: Math.max(currRight, otherRight) + 30
              }
            };
          }

          // 3. Left-to-Left / Right-to-Right Edge Alignments
          const distLeft = Math.abs(rawX - other.x);
          if (distLeft <= SNAP_THRESHOLD && (!bestSnapX || distLeft < bestSnapX.dist)) {
            bestSnapX = {
              val: other.x,
              dist: distLeft,
              guide: {
                type: 'vertical',
                pos: other.x,
                start: Math.min(rawY, other.y) - 30,
                end: Math.max(currBottom, otherBottom) + 30
              }
            };
          }

          const distRight = Math.abs(currRight - otherRight);
          if (distRight <= SNAP_THRESHOLD && (!bestSnapX || distRight < bestSnapX.dist)) {
            bestSnapX = {
              val: otherRight - width,
              dist: distRight,
              guide: {
                type: 'vertical',
                pos: otherRight,
                start: Math.min(rawY, other.y) - 30,
                end: Math.max(currBottom, otherBottom) + 30
              }
            };
          }

          // 4. Top-to-Top / Bottom-to-Bottom Edge Alignments
          const distTop = Math.abs(rawY - other.y);
          if (distTop <= SNAP_THRESHOLD && (!bestSnapY || distTop < bestSnapY.dist)) {
            bestSnapY = {
              val: other.y,
              dist: distTop,
              guide: {
                type: 'horizontal',
                pos: other.y,
                start: Math.min(rawX, other.x) - 30,
                end: Math.max(currRight, otherRight) + 30
              }
            };
          }

          const distBottom = Math.abs(currBottom - otherBottom);
          if (distBottom <= SNAP_THRESHOLD && (!bestSnapY || distBottom < bestSnapY.dist)) {
            bestSnapY = {
              val: otherBottom - height,
              dist: distBottom,
              guide: {
                type: 'horizontal',
                pos: otherBottom,
                start: Math.min(rawX, other.x) - 30,
                end: Math.max(currRight, otherRight) + 30
              }
            };
          }
        }

        const finalX = bestSnapX ? Math.round(bestSnapX.val) : defaultGridX;
        const finalY = bestSnapY ? Math.round(bestSnapY.val) : defaultGridY;

        const guides: AlignmentGuide[] = [];
        if (bestSnapX) guides.push(bestSnapX.guide);
        if (bestSnapY) guides.push(bestSnapY.guide);
        setAlignmentGuides(guides);

        const deltaX = Math.round(finalX - initialPos.x);
        const deltaY = Math.round(finalY - initialPos.y);

        if (deltaX === 0 && deltaY === 0) return;

        const liveUpdate = onUpdateProjectLive || onUpdateProject;

        const updatedNodes = proj.nodes.map((node) => {
          const initPos = dragInitialPositionsRef.current.get(node.id);
          if (initPos && !node.isLocked) {
            return { ...node, x: initPos.x + deltaX, y: initPos.y + deltaY };
          }
          return node;
        });

        const updatedEdges = proj.edges.map((edge) => {
          const initCP = dragInitialEdgeControlsRef.current.get(edge.id);
          if (initCP) {
            return {
              ...edge,
              controlPoint: { x: initCP.x + deltaX, y: initCP.y + deltaY }
            };
          }
          return edge;
        });

        liveUpdate({ ...proj, nodes: updatedNodes, edges: updatedEdges });
        return;
      }

      if (draggingSectionIdRef.current) {
        const proj = projectRef.current;
        const sOffset = dragOffsetRef.current;
        const newX = snap(canvasPos.x - sOffset.x);
        const newY = snap(canvasPos.y - sOffset.y);

        const updatedSections = proj.sections.map((section) =>
          section.id === draggingSectionIdRef.current ? { ...section, x: newX, y: newY } : section
        );
        const liveUpdate = onUpdateProjectLive || onUpdateProject;
        liveUpdate({ ...proj, sections: updatedSections });
      }

      if (connecting) {
        // Search for nearest port across all other nodes for magnetic suction
        type MagnetType = { nodeId: string; port: PortPosition; x: number; y: number };
        let foundMagnet: MagnetType | null = null;
        let minMagDist = 28; // 28px magnetic snap radius

        for (const node of projectRef.current.nodes) {
          if (node.id === connecting.fromNodeId) continue;
          if (node.type === 'container' || node.type === 'group') continue; // Never snap to container/group
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
        let minMagDist = 28;

        const currentEdge = projectRef.current.edges.find((e) => e.id === draggingEdgeEndpoint.edgeId);
        const prohibitedNodeId =
          draggingEdgeEndpoint.endpoint === 'source' ? currentEdge?.toNodeId : currentEdge?.fromNodeId;
        const originNodeId =
          draggingEdgeEndpoint.endpoint === 'source' ? currentEdge?.fromNodeId : currentEdge?.toNodeId;
        const originPort =
          draggingEdgeEndpoint.endpoint === 'source' ? currentEdge?.fromPort : currentEdge?.toPort;

        for (const node of projectRef.current.nodes) {
          if (node.id === prohibitedNodeId) continue;
          if (node.type === 'container' || node.type === 'group') continue; // Never snap to container/group
          const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
          for (const p of ports) {
            // Do not immediately snap back to the origin port we are pulling away from
            const isOriginPort = node.id === originNodeId && p === originPort;
            const pCoord = getPortCoordinates(node, p);
            const dist = Math.hypot(canvasPos.x - pCoord.x, canvasPos.y - pCoord.y);
            const threshold = isOriginPort ? 10 : minMagDist;
            if (dist < threshold && dist < minMagDist) {
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
        const activePoint = foundMagnet ? { x: foundMagnet.x, y: foundMagnet.y } : canvasPos;
        setDragEndpointPos({
          edgeId: draggingEdgeEndpoint.edgeId,
          endpoint: draggingEdgeEndpoint.endpoint,
          point: activePoint
        });
        return;
      }
    },
    [
      isPanning,
      selectionBox,
      resizing,
      screenToCanvas,
      onUpdateProject,
      onUpdateProjectLive,
      connecting,
      draggingWaypoint,
      draggingEdgeEndpoint,
      selectedId,
      onPanChange
    ]
  );

  // Canvas Mouse Up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(false);
      isPanningRef.current = false;

      const wasDraggingNode = hasDraggedNodeRef.current && (draggingNodeIdRef.current !== null || draggingNodeId !== null);
      const draggedNodeId = draggingNodeIdRef.current || draggingNodeId;

      pendingDragNodeIdRef.current = null;
      draggingNodeIdRef.current = null;
      setDraggingNodeId(null);
      setContainerChildrenIds([]);
      setDraggingSectionId(null);
      setAlignmentGuides([]);

      setTimeout(() => {
        hasDraggedNodeRef.current = false;
        dragStartPosRef.current = null;
      }, 50);

      if (resizing) {
        setResizing(null);
        resizingRef.current = null;
      }

      // 1. Commit dragged node state with collinear edge cleanups
      if (wasDraggingNode && draggedNodeId) {
        const proj = projectRef.current;
        const updatedEdges = proj.edges.map((edge) => {
          if (!edge.controlPoint) return edge;
          if (edge.fromNodeId !== draggedNodeId && edge.toNodeId !== draggedNodeId) return edge;
          const sNode = proj.nodes.find((n) => n.id === edge.fromNodeId);
          const tNode = proj.nodes.find((n) => n.id === edge.toNodeId);
          if (!sNode || !tNode) return edge;
          const p1 = getPortCoordinates(sNode, edge.fromPort);
          const p2 = getPortCoordinates(tNode, edge.toPort);
          const isCollinearH = Math.abs(p1.y - p2.y) <= 8;
          const isCollinearV = Math.abs(p1.x - p2.x) <= 8;
          if (isCollinearH && Math.abs(edge.controlPoint.y - p2.y) <= 12) {
            return { ...edge, controlPoint: undefined };
          }
          if (isCollinearV && Math.abs(edge.controlPoint.x - p2.x) <= 12) {
            return { ...edge, controlPoint: undefined };
          }
          return edge;
        });

        const finalProj = { ...proj, edges: updatedEdges };
        const snap = dragSnapshotRef.current;
        const hasChanged =
          !snap ||
          JSON.stringify(snap.nodes) !== JSON.stringify(finalProj.nodes) ||
          JSON.stringify(snap.edges) !== JSON.stringify(finalProj.edges);

        if (hasChanged) {
          onUpdateProject(finalProj);
        }
        dragSnapshotRef.current = null;
      }

      if (draggingWaypointRef.current) {
        const activeEdgeId = draggingWaypointRef.current.edgeId;
        const proj = projectRef.current;
        const edge = proj.edges.find((e) => e.id === activeEdgeId);
        if (edge?.controlPoint) {
          const sNode = proj.nodes.find((n) => n.id === edge.fromNodeId);
          const tNode = proj.nodes.find((n) => n.id === edge.toNodeId);
          if (sNode && tNode) {
            const p1 = getPortCoordinates(sNode, edge.fromPort);
            const p2 = getPortCoordinates(tNode, edge.toPort);
            const isH =
              (edge.fromPort === 'left' || edge.fromPort === 'right') &&
              (edge.toPort === 'left' || edge.toPort === 'right');
            const isV =
              (edge.fromPort === 'top' || edge.fromPort === 'bottom') &&
              (edge.toPort === 'top' || edge.toPort === 'bottom');
            const baseY = Math.round((p1.y + p2.y) / 2);
            const baseX = Math.round((p1.x + p2.x) / 2);

            let shouldReset = false;
            if (
              isH &&
              (Math.abs(edge.controlPoint.y - baseY) <= 14 ||
                Math.abs(edge.controlPoint.y - p2.y) <= 14 ||
                Math.abs(edge.controlPoint.y - p1.y) <= 14)
            ) {
              shouldReset = true;
            } else if (
              isV &&
              (Math.abs(edge.controlPoint.x - baseX) <= 14 ||
                Math.abs(edge.controlPoint.x - p2.x) <= 14 ||
                Math.abs(edge.controlPoint.x - p1.x) <= 14)
            ) {
              shouldReset = true;
            }
            if (shouldReset) {
              const updatedEdges = proj.edges.map((e) =>
                e.id === activeEdgeId ? { ...e, controlPoint: undefined } : e
              );
              onUpdateProject({ ...proj, edges: updatedEdges });
            }
          }
        }
        setDraggingWaypoint(null);
      }

      const activeEndpointDrag = draggingEdgeEndpointRef.current;
      const activeMagnet = magneticTargetRef.current;

      if (activeEndpointDrag) {
        if (activeMagnet) {
          const updatedEdges = projectRef.current.edges.map((e) => {
            if (e.id === activeEndpointDrag.edgeId) {
              if (activeEndpointDrag.endpoint === 'source') {
                return { ...e, fromNodeId: activeMagnet.nodeId, fromPort: activeMagnet.port, controlPoint: undefined };
              } else {
                return { ...e, toNodeId: activeMagnet.nodeId, toPort: activeMagnet.port, controlPoint: undefined };
              }
            }
            return e;
          });
          onUpdateProject({ ...projectRef.current, edges: updatedEdges });
        } else {
          // Check if released over a node's area (ignoring containers and groups)
          const canvasPos = screenToCanvas(e.clientX, e.clientY);
          const currentEdge = projectRef.current.edges.find((item) => item.id === activeEndpointDrag.edgeId);
          const prohibitedNodeId =
            activeEndpointDrag.endpoint === 'source' ? currentEdge?.toNodeId : currentEdge?.fromNodeId;

          const targetNode = projectRef.current.nodes.find(
            (node) =>
              node.id !== prohibitedNodeId &&
              node.type !== 'container' &&
              node.type !== 'group' &&
              canvasPos.x >= node.x - 12 &&
              canvasPos.x <= node.x + node.width + 12 &&
              canvasPos.y >= node.y - 12 &&
              canvasPos.y <= node.y + node.height + 12
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

            const updatedEdges = projectRef.current.edges.map((edgeItem) => {
              if (edgeItem.id === activeEndpointDrag.edgeId) {
                if (activeEndpointDrag.endpoint === 'source') {
                  return { ...edgeItem, fromNodeId: targetNode.id, fromPort: closestPort, controlPoint: undefined };
                } else {
                  return { ...edgeItem, toNodeId: targetNode.id, toPort: closestPort, controlPoint: undefined };
                }
              }
              return edgeItem;
            });
            onUpdateProject({ ...projectRef.current, edges: updatedEdges });
          }
        }
        setDraggingEdgeEndpoint(null);
        setDragEndpointPos(null);
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
          const intersecting = projectRef.current.nodes.filter(
            (n) => n.x < maxX && n.x + n.width > minX && n.y < maxY && n.y + n.height > minY
          );

          if (intersecting.length > 0) {
            const foundIds = intersecting.map((n) => n.id);
            const finalIds = e.shiftKey
              ? Array.from(new Set([...(selectedIdsRef.current || []), ...foundIds]))
              : foundIds;
            if (onSelectMultiple) {
              onSelectMultiple(finalIds);
            } else {
              onSelect(finalIds[0], 'node', false);
            }
          } else if (!e.shiftKey) {
            onSelect(null, 'canvas');
          }
        } else if (!e.shiftKey) {
          onSelect(null, 'canvas');
        }
        setSelectionBox(null);
      }

      // Finalize Port Connection with Magnetic Snap
      const activeConnecting = connectingRef.current;
      if (activeConnecting) {
        if (activeMagnet) {
          const newEdge: FlowEdgeType = {
            id: `edge-${Date.now()}`,
            fromNodeId: activeConnecting.fromNodeId,
            toNodeId: activeMagnet.nodeId,
            fromPort: activeConnecting.fromPort,
            toPort: activeMagnet.port,
            label: '',
            lineStyle: 'solid',
            routeType: 'curved',
            color: '#000000',
            width: 1.5,
            arrowhead: 'arrow'
          };

          onUpdateProject({
            ...projectRef.current,
            edges: [...projectRef.current.edges, newEdge]
          });
        } else {
          const canvasPos = screenToCanvas(e.clientX, e.clientY);
          const targetNode = projectRef.current.nodes.find(
            (node) =>
              node.id !== activeConnecting.fromNodeId &&
              node.type !== 'container' &&
              node.type !== 'group' &&
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
              fromNodeId: activeConnecting.fromNodeId,
              toNodeId: targetNode.id,
              fromPort: activeConnecting.fromPort,
              toPort: closestPort,
              label: '',
              lineStyle: 'solid',
              routeType: 'curved',
              color: '#000000',
              width: 1.5,
              arrowhead: 'arrow'
            };

            onUpdateProject({
              ...projectRef.current,
              edges: [...projectRef.current.edges, newEdge]
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
      screenToCanvas,
      onSelectMultiple,
      onSelect,
      onUpdateProject
    ]
  );

  const handleMouseMoveRef = useRef(handleMouseMove);
  handleMouseMoveRef.current = handleMouseMove;
  const handleMouseUpRef = useRef(handleMouseUp);
  handleMouseUpRef.current = handleMouseUp;

  // Global Window-Level Drag and Release Capture (Permanent event listener with capture: true & e.buttons safety)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // Safety net: if mouse buttons are 0 (no button pressed), we cannot be dragging!
      if (e.buttons === 0) {
        if (
          draggingNodeIdRef.current ||
          pendingDragNodeIdRef.current ||
          isPanningRef.current ||
          resizingRef.current ||
          draggingWaypointRef.current ||
          draggingEdgeEndpointRef.current ||
          connectingRef.current
        ) {
          handleMouseUpRef.current(e as unknown as React.MouseEvent);
          return;
        }
      }

      if (
        draggingNodeIdRef.current ||
        pendingDragNodeIdRef.current ||
        isPanningRef.current ||
        resizingRef.current ||
        draggingWaypointRef.current ||
        draggingEdgeEndpointRef.current ||
        connectingRef.current ||
        selectionBoxRef.current ||
        dragStartPosRef.current
      ) {
        handleMouseMoveRef.current(e as unknown as React.MouseEvent);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (
        draggingNodeIdRef.current ||
        pendingDragNodeIdRef.current ||
        isPanningRef.current ||
        resizingRef.current ||
        draggingWaypointRef.current ||
        draggingEdgeEndpointRef.current ||
        connectingRef.current ||
        selectionBoxRef.current ||
        dragStartPosRef.current
      ) {
        handleMouseUpRef.current(e as unknown as React.MouseEvent);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp, { capture: true });
    };
  }, []);

  // Drag over handler for HTML5 drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle dropped file (e.g. .sql, .json, .mmd, .puml, .ts)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDropFile) {
        onDropFile(e.dataTransfer.files[0]);
        return;
      }
    }

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

  const handleUpdateNode = useCallback((updatedNode: FlowNodeType) => {
    const proj = projectRef.current;
    const updated = proj.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
    onUpdateProject({ ...proj, nodes: updated });
  }, [onUpdateProject]);

  const handleUpdateEdge = useCallback((updatedEdge: FlowEdgeType) => {
    const proj = projectRef.current;
    const updated = proj.edges.map((e) => (e.id === updatedEdge.id ? updatedEdge : e));
    onUpdateProject({ ...proj, edges: updated });
  }, [onUpdateProject]);

  // Stable node-select handler — identity never changes, so FlowNodeMemo comparator stays effective
  const handleNodeSelectStable = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDraggedNodeRef.current) return;
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    const curSelected = selectedIdsRef.current || [];
    if (curSelected.length > 1 && curSelected.includes(nodeId) && !isMulti) {
      onSelect(nodeId, 'node', false);
      return;
    }
    onSelect(nodeId, 'node', isMulti);
  }, [onSelect]);
  const handleStartDragWaypoint = useCallback(
    (edgeId: string, waypointIndex?: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dragSnapshotRef.current = projectRef.current;
      const clientX = e ? e.clientX : window.innerWidth / 2;
      const clientY = e ? e.clientY : window.innerHeight / 2;
      const canvasPos = screenToCanvas(clientX, clientY);
      setDraggingWaypoint({
        edgeId,
        waypointIndex,
        startX: canvasPos.x,
        startY: canvasPos.y
      });
    },
    [screenToCanvas]
  );

  const handleAddWaypoint = useCallback(
    (edgeId: string, point?: { x: number; y: number }) => {
      const proj = projectRef.current;
      const edge = proj.edges.find((e) => e.id === edgeId);
      if (!edge) return;

      let insertPoint = point;
      if (!insertPoint) {
        const sourceNode = proj.nodes.find((n) => n.id === edge.fromNodeId);
        const targetNode = proj.nodes.find((n) => n.id === edge.toNodeId);
        if (sourceNode && targetNode) {
          const { labelPosition } = calculateEdgePath(
            sourceNode,
            targetNode,
            edge.fromPort,
            edge.toPort,
            edge.routeType,
            edge.controlPoint,
            undefined,
            undefined,
            undefined,
            edge.waypoints
          );
          insertPoint = { x: labelPosition.x, y: labelPosition.y };
        } else {
          insertPoint = { x: 0, y: 0 };
        }
      }

      const existing = edge.waypoints
        ? [...edge.waypoints]
        : edge.controlPoint
        ? [edge.controlPoint]
        : [];
      const newWaypoints = [
        ...existing,
        { x: Math.round(insertPoint.x), y: Math.round(insertPoint.y) }
      ];

      const updatedEdges = proj.edges.map((e) =>
        e.id === edgeId ? { ...e, waypoints: newWaypoints, controlPoint: newWaypoints[0] } : e
      );
      onUpdateProject({ ...proj, edges: updatedEdges });
    },
    [onUpdateProject]
  );

  const handleDeleteWaypoint = useCallback(
    (edgeId: string, waypointIndex: number) => {
      const proj = projectRef.current;
      const edge = proj.edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const existing = edge.waypoints
        ? [...edge.waypoints]
        : edge.controlPoint
        ? [edge.controlPoint]
        : [];
      const newWaypoints = existing.filter((_, idx) => idx !== waypointIndex);

      const updatedEdges = proj.edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              waypoints: newWaypoints.length > 0 ? newWaypoints : undefined,
              controlPoint: newWaypoints.length > 0 ? newWaypoints[0] : undefined
            }
          : e
      );
      onUpdateProject({ ...proj, edges: updatedEdges });
    },
    [onUpdateProject]
  );

  // Smart Universal Clipboard Paste Listener (Image, URL Link Preview, or Plain Text)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const canvasEl = canvasRef.current;
      const rect = canvasEl
        ? canvasEl.getBoundingClientRect()
        : { left: 0, top: 0, width: 1280, height: 800 };
      const clientX = lastMousePosRef.current ? lastMousePosRef.current.x : rect.left + rect.width / 2;
      const clientY = lastMousePosRef.current ? lastMousePosRef.current.y : rect.top + rect.height / 2;
      const canvasPos = screenToCanvas(clientX, clientY);

      // 1. Image in clipboard
      const items = Array.from(clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            const dataUrl = loadEvt.target?.result as string;
            if (dataUrl) {
              const img = new window.Image();
              img.onload = () => {
                const maxDim = 400;
                let w = img.width || 280;
                let h = img.height || 200;
                if (w > maxDim || h > maxDim) {
                  if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }

                const newImgNode: FlowNodeType = {
                  id: `node-${Date.now()}`,
                  type: 'image',
                  title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Pasted Image',
                  subtitle: '',
                  x: snap(canvasPos.x - w / 2),
                  y: snap(canvasPos.y - h / 2),
                  width: Math.max(w, 140),
                  height: Math.max(h, 100),
                  customData: {
                    imageUrl: dataUrl
                  },
                  style: {
                    bg: 'transparent',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 12,
                    colorPalette: 'slate'
                  }
                };

                const proj = projectRef.current;
                onUpdateProject({ ...proj, nodes: [...proj.nodes, newImgNode] });
                onSelect(newImgNode.id, 'node');
              };
              img.src = dataUrl;
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // 2. Text / URL in clipboard
      const text = clipboardData.getData('text/plain')?.trim();
      if (!text) return;

      const isUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(text);
      if (isUrl) {
        e.preventDefault();
        let domain = '';
        try {
          domain = new URL(text).hostname.replace(/^www\./, '');
        } catch {
          domain = text;
        }

        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        const newLinkNode: FlowNodeType = {
          id: `node-${Date.now()}`,
          type: 'link-embed',
          title: domain,
          subtitle: text,
          x: snap(canvasPos.x - 140),
          y: snap(canvasPos.y - 45),
          width: 280,
          height: 90,
          customData: {
            linkUrl: text,
            linkTitle: domain,
            linkDescription: text,
            linkFavicon: faviconUrl
          },
          style: {
            bg: '#FFFFFF',
            borderColor: '#E2E8F0',
            borderWidth: 1,
            borderRadius: 12,
            colorPalette: 'blue'
          }
        };

        const proj = projectRef.current;
        onUpdateProject({ ...proj, nodes: [...proj.nodes, newLinkNode] });
        onSelect(newLinkNode.id, 'node');
        return;
      }

      // 3. Plain text
      e.preventDefault();
      const newTextNode: FlowNodeType = {
        id: `node-${Date.now()}`,
        type: 'text',
        title: text,
        subtitle: '',
        x: snap(canvasPos.x - 100),
        y: snap(canvasPos.y - 25),
        width: Math.min(Math.max(text.length * 9, 160), 380),
        height: Math.max(Math.ceil(text.length / 30) * 24 + 20, 50),
        customData: {
          fontSize: 15,
          fontWeight: 'normal',
          textAlign: 'left'
        },
        style: {
          bg: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 0,
          colorPalette: 'slate'
        }
      };

      const proj = projectRef.current;
      onUpdateProject({ ...proj, nodes: [...proj.nodes, newTextNode] });
      onSelect(newTextNode.id, 'node');
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [screenToCanvas, onUpdateProject, onSelect]);

  const handleStartDragEndpoint = useCallback(
    (edgeId: string, endpoint: 'source' | 'target', e: React.MouseEvent) => {
      e.stopPropagation();
      dragSnapshotRef.current = projectRef.current;
      setDraggingEdgeEndpoint({ edgeId, endpoint });
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDragEndpointPos({ edgeId, endpoint, point: canvasPos });
    },
    [screenToCanvas]
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

            const activeDragPos =
              dragEndpointPos?.edgeId === edge.id ? dragEndpointPos : null;

            const multiOffset = multiEdgeOffsets.get(edge.id);
            const labelAdj = labelCollisionAdjustments.get(edge.id);

            return (
              <FlowEdgeMemo
                key={edge.id}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                isSelected={selectedType === 'edge' && selectedId === edge.id}
                isSimActive={isSimActive}
                dragEndpointPos={activeDragPos}
                multiEdgeOffset={multiOffset}
                labelOffset={labelAdj}
                onSelect={(id, e) => {
                  e.stopPropagation();
                  onSelect(id, 'edge');
                }}
                onUpdate={handleUpdateEdge}
                onStartDragWaypoint={handleStartDragWaypoint}
                onAddWaypoint={handleAddWaypoint}
                onStartDragEndpoint={handleStartDragEndpoint}
                onDelete={(edgeId) => {
                  const proj = projectRef.current;
                  onUpdateProject({
                    ...proj,
                    edges: proj.edges.filter((e) => e.id !== edgeId)
                  });
                }}
              />
            );
          })}

          {/* Render Active Connecting Line & Magnetic Target */}
          {connecting && (
            <g className="drafo-connecting-preview">
              {(() => {
                const sourceNode = project.nodes.find((n) => n.id === connecting.fromNodeId);
                if (!sourceNode) return null;
                const p1 = getPortCoordinates(sourceNode, connecting.fromPort);
                const p2 = connecting.currentPoint;
                const norm1 = getPortNormal(connecting.fromPort);
                const norm2 = magneticTarget ? getPortNormal(magneticTarget.port) : null;
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const stubLen = norm2 ? Math.max(0, Math.min(14, dist * 0.25)) : 0;
                const p2Entry = stubLen > 1 ? { x: p2.x + norm2!.x * stubLen, y: p2.y + norm2!.y * stubLen } : p2;
                const offset = Math.max(28, Math.min(dist * 0.45, 160));
                const cp1 = { x: p1.x + norm1.x * offset, y: p1.y + norm1.y * offset };
                const cp2 = norm2
                  ? { x: p2Entry.x + norm2.x * offset, y: p2Entry.y + norm2.y * offset }
                  : { x: p2.x - norm1.x * (offset * 0.4), y: p2.y - norm1.y * (offset * 0.4) };
                const previewPath = stubLen > 1
                  ? `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2Entry.x} ${p2Entry.y} L ${p2.x} ${p2.y}`
                  : `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;

                return (
                  <>
                    <path
                      d={previewPath}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth={2}
                      strokeDasharray="6,4"
                      markerEnd="url(#marker-arrow-2563EB)"
                      strokeLinecap="butt"
                      className="drafo-connecting-path"
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
                    {boxW > 50 && boxH > 25 && count > 0 && (() => {
                      const label = `${count} selected`;
                      // Approximate character width for 11px semi-bold font (6.4px per char)
                      const textWidth = Math.max(52, Math.ceil(label.length * 6.6));
                      const badgeW = textWidth + 20;
                      const badgeH = 22;

                      return (
                        <g transform={`translate(${minX + 8}, ${minY + 12})`}>
                          <rect
                            x={0}
                            y={0}
                            width={badgeW}
                            height={badgeH}
                            rx={badgeH / 2}
                            fill="#2563EB"
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))'
                            }}
                          />
                          <text
                            x={badgeW / 2}
                            y={badgeH / 2}
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="600"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fontFamily: 'var(--font-family-base), system-ui, -apple-system, sans-serif',
                              letterSpacing: '0.01em',
                              userSelect: 'none',
                              pointerEvents: 'none'
                            }}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })()}
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
          <FlowNodeMemo
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
            onSelect={handleNodeSelectStable}
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

        {/* INTERACTION & SELECTION HANDLES OVERLAY LAYER (zIndex: 100 - Always Stacks Above Flow Nodes & Ports) */}
        <svg
          className="drafo-canvas-handles-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          {/* Render Selected Edge Canva Handles */}
          {(() => {
            if (selectedType !== 'edge' || !selectedId) return null;
            const selectedEdge = project.edges.find((e) => e.id === selectedId);
            if (!selectedEdge) return null;
            const sourceNode = project.nodes.find((n) => n.id === selectedEdge.fromNodeId);
            const targetNode = project.nodes.find((n) => n.id === selectedEdge.toNodeId);
            if (!sourceNode || !targetNode) return null;

            const activeDragPos =
              dragEndpointPos?.edgeId === selectedEdge.id ? dragEndpointPos : null;
            const sourceOverride =
              activeDragPos?.endpoint === 'source' ? activeDragPos.point : undefined;
            const targetOverride =
              activeDragPos?.endpoint === 'target' ? activeDragPos.point : undefined;

            const { sourcePoint, targetPoint, labelPosition, waypointPosition, waypointPositions } = calculateEdgePath(
              sourceNode,
              targetNode,
              selectedEdge.fromPort,
              selectedEdge.toPort,
              selectedEdge.routeType,
              selectedEdge.controlPoint,
              sourceOverride,
              targetOverride,
              undefined,
              selectedEdge.waypoints
            );

            return (
              <FlowEdgeHandles
                edge={selectedEdge}
                sourcePoint={sourcePoint}
                targetPoint={targetPoint}
                labelPosition={labelPosition}
                waypointPosition={waypointPosition}
                waypointPositions={waypointPositions}
                onStartDragEndpoint={handleStartDragEndpoint}
                onStartDragWaypoint={handleStartDragWaypoint}
                onAddWaypoint={handleAddWaypoint}
                onDeleteWaypoint={handleDeleteWaypoint}
                onResetWaypoint={(edgeId) => {
                  const proj = projectRef.current;
                  const updated = proj.edges.map((e) =>
                    e.id === edgeId ? { ...e, controlPoint: undefined, waypoints: undefined } : e
                  );
                  onUpdateProject({ ...proj, edges: updated });
                }}
                onUpdate={handleUpdateEdge}
                onDelete={(edgeId) => {
                  const proj = projectRef.current;
                  onUpdateProject({
                    ...proj,
                    edges: proj.edges.filter((e) => e.id !== edgeId)
                  });
                }}
              />
            );
          })()}

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
        </svg>
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
        {/* Tool Mode Buttons: Select (V), Hand (H), Text Annotation (T) */}
        <button
          className={`drafo-hud-btn ${toolMode === 'select' ? 'active' : ''}`}
          onClick={() => setToolMode('select')}
          title="Cursor Select Tool (V)"
        >
          <MousePointer size={15} />
        </button>
        <button
          className={`drafo-hud-btn ${toolMode === 'hand' ? 'active' : ''}`}
          onClick={() => setToolMode('hand')}
          title="Hand Pan Tool (H)"
        >
          <Hand size={15} />
        </button>
        <button
          className={`drafo-hud-btn ${toolMode === 'text' ? 'active' : ''}`}
          onClick={() => setToolMode((prev) => (prev === 'text' ? 'select' : 'text'))}
          title="Text Annotation Tool (T) - Click anywhere on canvas to place text"
        >
          <Type size={15} />
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
