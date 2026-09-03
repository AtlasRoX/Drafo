'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FlowProject, FlowNode as FlowNodeType, FlowSection } from './types/flow';
import { TEMPLATES } from './data/templates';
import { ProjectDashboard } from './components/Dashboard/ProjectDashboard';
import { Navbar } from './components/Navbar/Navbar';
import { ComponentPalette } from './components/Sidebar/ComponentPalette';
import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { PropertyInspector } from './components/Inspector/PropertyInspector';
import { FlowPlayer } from './components/Simulation/FlowPlayer';
import { TemplateModal } from './components/Modals/TemplateModal';
import { AIFlowModal } from './components/Modals/AIFlowModal';
import { KeyboardShortcutsModal } from './components/Modals/KeyboardShortcutsModal';
import { ExportShareModal } from './components/Modals/ExportShareModal';
import { CollaborationModal } from './components/Modals/CollaborationModal';
import { Users, X } from 'lucide-react';
import { collabEngine, PeerPresence } from './crdt/yjsProvider';
import {
  exportDiagramAsPng,
  exportDiagramAsSvg,
  exportDiagramAsJson,
  parseUploadedJson,
  copyDiagramToClipboard
} from './utils/exportUtils';
import {
  saveProject,
  loadAllProjects,
  deleteProject as deleteProjectFromDb,
  renameProject as renameProjectInDb,
  getDatabaseDiagnostics
} from './db/pgliteStore';
import './App.css';

const PROJECTS_STORAGE_KEY = 'drafo_projects_store';
const ACTIVE_PROJECT_STORAGE_KEY = 'drafo_active_project_id';

const DEFAULT_BLANK_PROJECT: FlowProject = {
  id: 'project-default',
  name: 'Untitled Diagram',
  description: 'Visual Architecture Flowchart',
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  tags: ['Architecture'],
  canvasSettings: {
    showGrid: true,
    gridType: 'dots',
    bgColor: '#FFFFFF',
    snapToGrid: true,
    gridSize: 20,
    theme: 'light'
  },
  sections: [],
  nodes: [],
  edges: []
};

export const App: React.FC = () => {
  // View Router: 'dashboard' | 'editor'
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');

  // Multi-Project Database State (Starts empty if user has no saved projects)
  const [projects, setProjects] = useState<FlowProject[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const userOnly = parsed.filter(
            (p) =>
              p.id !== 'nextjs-16-architecture' &&
              p.id !== 'microservices-event-mesh' &&
              p.id !== 'auth-jwt-lifecycle' &&
              p.id !== 'ai-agent-rag-pipeline' &&
              p.id !== 'blank-canvas' &&
              p.id !== 'nextjs-api-flows-bengali' &&
              p.id !== 'nextjs-api-flows-english' &&
              p.id !== 'project-default'
          );
          if (userOnly.length > 0) return userOnly;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Active Project for the Studio Editor
  const [project, setProject] = useState<FlowProject>(() => {
    return projects[0] || DEFAULT_BLANK_PROJECT;
  });

  // Collaboration Session State & Live Indicators
  const [collabRoomId, setCollabRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#room=')) {
      return decodeURIComponent(window.location.hash.replace('#room=', ''));
    }
    return collabEngine.getRoomId();
  });
  const [collabPeers, setCollabPeers] = useState<PeerPresence[]>(() => collabEngine.getRemotePeers());
  const [collabToast, setCollabToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false
  });

  const showCollabToast = (message: string) => {
    setCollabToast({ message, visible: true });
    setTimeout(() => {
      setCollabToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  // PGlite Embedded PostgreSQL Database Diagnostics State
  const [dbStatus, setDbStatus] = useState<{
    isReady: boolean;
    engine: string;
    projectCount: number;
    nodeCount: number;
    edgeCount: number;
    version: string;
  }>({
    isReady: false,
    engine: 'Initializing PostgreSQL 16 WASM...',
    projectCount: 0,
    nodeCount: 0,
    edgeCount: 0,
    version: 'PostgreSQL 16'
  });

  // History for Undo / Redo inside Studio
  const [history, setHistory] = useState<FlowProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<
    'node' | 'edge' | 'section' | 'canvas' | null
  >(null);

  // Viewport (Canvas Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 40 });

  // Sidebar Collapsibility
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Presentation / Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimStep, setActiveSimStep] = useState<number | null>(null);

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);

  // Clipboard for nodes
  const [copiedNode, setCopiedNode] = useState<FlowNodeType | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Save projects to localStorage fallback & load from PGlite on mount
  useEffect(() => {
    let isMounted = true;
    const initDb = async () => {
      try {
        const pgs = await loadAllProjects();
        if (isMounted) {
          const userOnly = pgs.filter(
            (p) =>
              p.id !== 'nextjs-16-architecture' &&
              p.id !== 'microservices-event-mesh' &&
              p.id !== 'auth-jwt-lifecycle' &&
              p.id !== 'ai-agent-rag-pipeline' &&
              p.id !== 'blank-canvas' &&
              p.id !== 'nextjs-api-flows-bengali' &&
              p.id !== 'nextjs-api-flows-english' &&
              p.id !== 'project-default'
          );
          if (userOnly.length > 0) {
            setProjects(userOnly);
            setProject((curr) => {
              const match = userOnly.find((p) => p.id === curr.id);
              return match || userOnly[0];
            });
          } else {
            setProjects([]);
          }
        }
        const diag = await getDatabaseDiagnostics();
        if (isMounted) setDbStatus(diag);

        // Check for URL room hash (e.g. #room=room-12345)
        if (typeof window !== 'undefined' && window.location.hash.startsWith('#room=')) {
          const roomParam = decodeURIComponent(window.location.hash.replace('#room=', ''));
          if (roomParam) {
            setCollabRoomId(roomParam);
            collabEngine.joinRoom(roomParam);
            setCurrentView('editor'); // Instantly open canvas editor for collaborators!
            showCollabToast(`Connecting to room: ${roomParam}...`);
          }
        }
      } catch (err) {
        console.error('PGlite database load error:', err);
      }
    };
    initDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for live peer awareness changes & new joiners
  useEffect(() => {
    let lastPeerKeys = new Set<string>();
    let isInitial = true;
    const unsub = collabEngine.onPeersChange((peers) => {
      setCollabPeers(peers);
      setCollabRoomId(collabEngine.getRoomId());
      if (!isInitial) {
        peers.forEach((p) => {
          const key = `${p.name}-${p.color}`;
          if (!lastPeerKeys.has(key)) {
            showCollabToast(`👋 ${p.name} joined the live session!`);
          }
        });
      }
      isInitial = false;
      lastPeerKeys = new Set(peers.map((p) => `${p.name}-${p.color}`));
    });
    return unsub;
  }, []);

  // Listen to hash changes in browser URL
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#room=')) {
        const roomParam = decodeURIComponent(window.location.hash.replace('#room=', ''));
        if (roomParam) {
          setCollabRoomId(roomParam);
          collabEngine.joinRoom(roomParam);
          setCurrentView('editor');
          showCollabToast(`Joined room: ${roomParam}`);
        }
      } else {
        setCollabRoomId(collabEngine.getRoomId());
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to remote CRDT project changes (via WebRTC or multi-tab BroadcastChannel)
  useEffect(() => {
    const unsub = collabEngine.onProjectSync((remoteProject) => {
      if (remoteProject) {
        setProject(remoteProject);
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === remoteProject.id);
          if (exists) {
            return prev.map((p) => (p.id === remoteProject.id ? remoteProject : p));
          }
          return [remoteProject, ...prev];
        });
        // Persist remote changes to local PGlite PostgreSQL
        saveProject(remoteProject).catch(() => {});
      }
    });
    return unsub;
  }, []);

  // Sync active project modifications back to the global projects array, PGlite, and Yjs CRDT
  const saveProjectToStore = useCallback((updated: FlowProject) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (exists) {
        return prev.map((p) => (p.id === updated.id ? updated : p));
      }
      return [updated, ...prev];
    });

    // Broadcast change to collaborative peers & other tabs
    collabEngine.updateProjectFromLocal(updated);

    // Transactional persist to PGlite PostgreSQL
    saveProject(updated)
      .then(() => {
        getDatabaseDiagnostics().then(setDbStatus).catch(() => {});
      })
      .catch((err) => console.error('PGlite save error:', err));
  }, []);

  // Push new state to editor history
  const updateProjectWithHistory = useCallback(
    (newProject: FlowProject) => {
      const timestamped = {
        ...newProject,
        updatedAt: new Date().toISOString()
      };
      setProject(timestamped);
      saveProjectToStore(timestamped);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(timestamped);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex, saveProjectToStore]
  );

  const liveBroadcastRef = useRef<number>(0);
  // Live update without pushing to history on every frame; throttles live drag sync to ~30 FPS for buttery smooth real-time motion
  const updateProjectLive = useCallback((updatedProject: FlowProject) => {
    setProject(updatedProject);
    const now = Date.now();
    if (now - liveBroadcastRef.current > 35) {
      liveBroadcastRef.current = now;
      collabEngine.updateProjectFromLocal(updatedProject);
    }
  }, []);

  // --- PROJECT MANAGEMENT HANDLERS (DASHBOARD & NAVBAR) ---

  const handleOpenProject = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setProject(found);
      setHistory([found]);
      setHistoryIndex(0);
      setSelectedId(null);
      setSelectedType(null);
      setCurrentView('editor');
    }
  };

  const handleCreateProject = (templateId?: string) => {
    let baseProject: FlowProject;
    if (templateId) {
      const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
      baseProject = JSON.parse(JSON.stringify(template));
      baseProject.id = `project-${Date.now()}`;
      baseProject.name = `${template.name}`;
      baseProject.updatedAt = new Date().toISOString();
    } else {
      baseProject = {
        id: `project-${Date.now()}`,
        name: 'Untitled Diagram',
        description: 'Custom interactive flowchart & architecture model',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        tags: ['Architecture'],
        canvasSettings: {
          showGrid: true,
          gridType: 'dots',
          bgColor: '#FFFFFF',
          snapToGrid: true,
          gridSize: 20,
          theme: 'light'
        },
        sections: [],
        nodes: [],
        edges: []
      };
    }

    setProjects((prev) => [baseProject, ...prev]);
    setProject(baseProject);
    saveProjectToStore(baseProject);
    setHistory([baseProject]);
    setHistoryIndex(0);
    setSelectedId(null);
    setSelectedType(null);
    setCurrentView('editor');
  };

  const handleDuplicateProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    const cloned: FlowProject = JSON.parse(JSON.stringify(target));
    cloned.id = `project-${Date.now()}`;
    cloned.name = `${target.name} (Copy)`;
    cloned.updatedAt = new Date().toISOString();

    setProjects((prev) => [cloned, ...prev]);
    saveProjectToStore(cloned);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectFromDb(projectId)
      .then(() => getDatabaseDiagnostics().then(setDbStatus).catch(() => {}))
      .catch((err) => console.error('PGlite delete error:', err));
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    renameProjectInDb(projectId, newName)
      .then(() => getDatabaseDiagnostics().then(setDbStatus).catch(() => {}))
      .catch((err) => console.error('PGlite rename error:', err));
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p))
    );
    if (project.id === projectId) {
      setProject((prev) => ({ ...prev, name: newName }));
    }
  };

  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = parseUploadedJson(content);
        imported.id = `project-${Date.now()}`;
        imported.updatedAt = new Date().toISOString();
        setProjects((prev) => [imported, ...prev]);
        setProject(imported);
        saveProjectToStore(imported);
        setHistory([imported]);
        setHistoryIndex(0);
        setCurrentView('editor');
      } catch (err) {
        alert('Invalid Drafo project JSON format.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportProjectJson = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId) || project;
    exportDiagramAsJson(target);
  };

  // --- STUDIO EDITING HANDLERS ---

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(prev);
      saveProjectToStore(prev);
      setSelectedId(null);
      setSelectedIds([]);
      setSelectedType(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(next);
      saveProjectToStore(next);
      setSelectedId(null);
      setSelectedIds([]);
      setSelectedType(null);
    }
  };

  // Multi-Node and Single-Node Selection
  const handleSelect = (
    id: string | null,
    type: 'node' | 'edge' | 'section' | 'canvas',
    isMulti: boolean = false
  ) => {
    if (type === 'node' && id) {
      if (isMulti) {
        setSelectedIds((prev) => {
          if (prev.includes(id)) {
            const next = prev.filter((item) => item !== id);
            setSelectedId(next[0] || null);
            if (next.length === 0) setSelectedType(null);
            return next;
          } else {
            const next = [...prev, id];
            setSelectedId(id);
            setSelectedType('node');
            return next;
          }
        });
      } else {
        setSelectedIds([id]);
        setSelectedId(id);
        setSelectedType('node');
      }
    } else {
      setSelectedIds(id ? [id] : []);
      setSelectedId(id);
      setSelectedType(type === 'canvas' ? null : type);
    }
  };

  // Select All Nodes (Ctrl + A)
  const handleSelectAllNodes = useCallback(() => {
    if (project.nodes.length === 0) return;
    const allIds = project.nodes.map((n) => n.id);
    setSelectedIds(allIds);
    setSelectedId(allIds[0]);
    setSelectedType('node');
  }, [project.nodes]);

  // Add Node from Palette
  const handleAddNode = (preset: Partial<FlowNodeType>) => {
    const centerScreenX = (window.innerWidth / 2 - pan.x) / zoom;
    const centerScreenY = (window.innerHeight / 2 - 60 - pan.y) / zoom;

    const newNode: FlowNodeType = {
      id: `node-${Date.now()}`,
      type: preset.type || 'server',
      x: Math.round(centerScreenX - (preset.width || 150) / 2),
      y: Math.round(centerScreenY - (preset.height || 110) / 2),
      width: preset.width || 150,
      height: preset.height || 110,
      title: preset.title || 'New Component',
      subtitle: preset.subtitle || '',
      status: preset.status || 'online',
      metric: preset.metric,
      customData: preset.customData,
      style: preset.style || {
        bg: '#FFFFFF',
        borderColor: '#2563EB',
        headerBg: '#2563EB',
        borderRadius: 8,
        borderStyle: 'solid',
        borderWidth: 1.5,
        colorPalette: 'blue'
      }
    };

    updateProjectWithHistory({
      ...project,
      nodes: [...project.nodes, newNode]
    });
    setSelectedId(newNode.id);
    setSelectedIds([newNode.id]);
    setSelectedType('node');
  };

  // Add Section Pill
  const handleAddSection = () => {
    const centerScreenY = (window.innerHeight / 2 - 120 - pan.y) / zoom;
    const centerScreenX = (window.innerWidth / 2 - 250 - pan.x) / zoom;

    // Stagger position if a section already exists nearby
    let targetY = Math.max(20, Math.round(centerScreenY));
    while (project.sections.some((s) => Math.abs(s.y - targetY) < 40)) {
      targetY += 60;
    }

    const newSection: FlowSection = {
      id: `section-${Date.now()}`,
      number: `${project.sections.length + 1}`,
      title: 'New Architecture Layer',
      subtitle: 'Component Layer Grouping',
      color: '#2563EB',
      x: Math.max(40, Math.round(centerScreenX)),
      y: targetY,
      pillBg: '#DCF0DC',
      pillTextColor: '#1F5E21',
      pillBorderColor: '#81C784',
      hasDivider: true
    };

    updateProjectWithHistory({
      ...project,
      sections: [...project.sections, newSection]
    });
    setSelectedId(newSection.id);
    setSelectedIds([newSection.id]);
    setSelectedType('section');
  };

  // Delete Selected (Supports Multi-Node Delete)
  const handleDeleteSelected = useCallback(() => {
    if (!selectedType) return;

    if (selectedType === 'node') {
      const idsToDelete = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
      if (idsToDelete.length === 0) return;
      const deleteSet = new Set(idsToDelete);

      const updatedNodes = project.nodes.filter((n) => !deleteSet.has(n.id));
      const updatedEdges = project.edges.filter(
        (e) => !deleteSet.has(e.fromNodeId) && !deleteSet.has(e.toNodeId)
      );
      updateProjectWithHistory({
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges
      });
    } else if (selectedType === 'edge' && selectedId) {
      const updatedEdges = project.edges.filter((e) => e.id !== selectedId);
      updateProjectWithHistory({
        ...project,
        edges: updatedEdges
      });
    } else if (selectedType === 'section' && selectedId) {
      const updatedSections = project.sections.filter((s) => s.id !== selectedId);
      updateProjectWithHistory({
        ...project,
        sections: updatedSections
      });
    }

    setSelectedId(null);
    setSelectedIds([]);
    setSelectedType(null);
  }, [selectedId, selectedIds, selectedType, project, updateProjectWithHistory]);

  // Duplicate Selected Node(s)
  const handleDuplicateSelected = useCallback(() => {
    if (selectedType !== 'node') return;
    const idsToDup = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (idsToDup.length === 0) return;

    const dupIdMap = new Map<string, string>();
    const newNodes: FlowNodeType[] = [];

    idsToDup.forEach((id, idx) => {
      const orig = project.nodes.find((n) => n.id === id);
      if (orig) {
        const newId = `node-${Date.now()}-${idx}`;
        dupIdMap.set(id, newId);
        newNodes.push({
          ...orig,
          id: newId,
          title: idsToDup.length === 1 ? `${orig.title} (Copy)` : orig.title,
          x: orig.x + 30,
          y: orig.y + 30
        });
      }
    });

    if (newNodes.length === 0) return;

    // Also duplicate any internal edges between the duplicated nodes
    const newEdges: any[] = [];
    project.edges.forEach((edge, idx) => {
      if (dupIdMap.has(edge.fromNodeId) && dupIdMap.has(edge.toNodeId)) {
        newEdges.push({
          ...edge,
          id: `edge-${Date.now()}-${idx}`,
          fromNodeId: dupIdMap.get(edge.fromNodeId)!,
          toNodeId: dupIdMap.get(edge.toNodeId)!
        });
      }
    });

    updateProjectWithHistory({
      ...project,
      nodes: [...project.nodes, ...newNodes],
      edges: [...project.edges, ...newEdges]
    });

    const newIds = newNodes.map((n) => n.id);
    setSelectedIds(newIds);
    setSelectedId(newIds[0] || null);
    setSelectedType('node');
  }, [selectedType, selectedId, selectedIds, project, updateProjectWithHistory]);

  // Multiple selection helper (used by Marquee selection)
  const handleSelectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setSelectedId(ids[0] || null);
    setSelectedType(ids.length > 0 ? 'node' : null);
  }, []);

  // Multi-Node Alignment
  const handleAlign = useCallback(
    (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const activeIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
      if (activeIds.length <= 1) return;
      const targetSet = new Set(activeIds);
      const targetNodes = project.nodes.filter((n) => targetSet.has(n.id));
      if (targetNodes.length <= 1) return;

      let minX = Math.min(...targetNodes.map((n) => n.x));
      let maxX = Math.max(...targetNodes.map((n) => n.x + n.width));
      let minY = Math.min(...targetNodes.map((n) => n.y));
      let maxY = Math.max(...targetNodes.map((n) => n.y + n.height));

      const updatedNodes = project.nodes.map((node) => {
        if (!targetSet.has(node.id)) return node;
        let newX = node.x;
        let newY = node.y;

        switch (direction) {
          case 'left':
            newX = minX;
            break;
          case 'center':
            newX = Math.round((minX + maxX) / 2 - node.width / 2);
            break;
          case 'right':
            newX = maxX - node.width;
            break;
          case 'top':
            newY = minY;
            break;
          case 'middle':
            newY = Math.round((minY + maxY) / 2 - node.height / 2);
            break;
          case 'bottom':
            newY = maxY - node.height;
            break;
        }
        return { ...node, x: newX, y: newY };
      });

      updateProjectWithHistory({ ...project, nodes: updatedNodes });
    },
    [selectedIds, selectedId, project, updateProjectWithHistory]
  );

  // Multi-Node Distribution
  const handleDistribute = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const activeIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
      if (activeIds.length < 3) return;
      const targetSet = new Set(activeIds);
      const targetNodes = project.nodes.filter((n) => targetSet.has(n.id));
      if (targetNodes.length < 3) return;

      if (direction === 'horizontal') {
        const sorted = [...targetNodes].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalWidths = sorted.slice(0, sorted.length - 1).reduce((acc, n) => acc + n.width, 0);
        const totalSpan = last.x - first.x;
        const availableGap = (totalSpan - totalWidths) / (sorted.length - 1);

        let currentX = first.x;
        const posMap = new Map<string, number>();
        sorted.forEach((n, idx) => {
          if (idx === 0) {
            posMap.set(n.id, n.x);
            currentX = n.x + n.width + Math.max(10, availableGap);
          } else if (idx === sorted.length - 1) {
            posMap.set(n.id, n.x);
          } else {
            posMap.set(n.id, Math.round(currentX));
            currentX += n.width + Math.max(10, availableGap);
          }
        });

        const updatedNodes = project.nodes.map((n) =>
          posMap.has(n.id) ? { ...n, x: posMap.get(n.id)! } : n
        );
        updateProjectWithHistory({ ...project, nodes: updatedNodes });
      } else {
        const sorted = [...targetNodes].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalHeights = sorted.slice(0, sorted.length - 1).reduce((acc, n) => acc + n.height, 0);
        const totalSpan = last.y - first.y;
        const availableGap = (totalSpan - totalHeights) / (sorted.length - 1);

        let currentY = first.y;
        const posMap = new Map<string, number>();
        sorted.forEach((n, idx) => {
          if (idx === 0) {
            posMap.set(n.id, n.y);
            currentY = n.y + n.height + Math.max(10, availableGap);
          } else if (idx === sorted.length - 1) {
            posMap.set(n.id, n.y);
          } else {
            posMap.set(n.id, Math.round(currentY));
            currentY += n.height + Math.max(10, availableGap);
          }
        });

        const updatedNodes = project.nodes.map((n) =>
          posMap.has(n.id) ? { ...n, y: posMap.get(n.id)! } : n
        );
        updateProjectWithHistory({ ...project, nodes: updatedNodes });
      }
    },
    [selectedIds, selectedId, project, updateProjectWithHistory]
  );

  // Group Selected Nodes into Container
  const handleGroupSelected = useCallback(() => {
    const activeIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (activeIds.length === 0) return;
    const targetSet = new Set(activeIds);
    const targetNodes = project.nodes.filter((n) => targetSet.has(n.id));
    if (targetNodes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    targetNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const pad = 28;
    const containerNode: FlowNodeType = {
      id: `container-${Date.now()}`,
      type: 'container',
      x: Math.round(minX - pad),
      y: Math.round(minY - pad - 24),
      width: Math.round(maxX - minX + pad * 2),
      height: Math.round(maxY - minY + pad * 2 + 24),
      title: 'AWS VPC / Subsystem Zone',
      subtitle: `${targetNodes.length} Components`,
      status: 'online',
      style: {
        bg: 'rgba(37, 99, 235, 0.03)',
        borderColor: '#2563EB',
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderRadius: 14,
        headerBg: 'rgba(37, 99, 235, 0.08)',
        headerColor: '#1D4ED8',
        colorPalette: 'blue'
      },
      customData: {
        isContainer: true,
        childNodeIds: targetNodes.map((n) => n.id)
      }
    };

    updateProjectWithHistory({
      ...project,
      nodes: [containerNode, ...project.nodes]
    });
    setSelectedId(containerNode.id);
    setSelectedIds([containerNode.id]);
    setSelectedType('node');
  }, [selectedIds, selectedId, project, updateProjectWithHistory]);

  // Ungroup / Dissolve Container
  const handleUngroupSelected = useCallback(() => {
    if (!selectedId) return;
    const target = project.nodes.find((n) => n.id === selectedId);
    if (target && (target.type === 'container' || target.type === 'group')) {
      const updatedNodes = project.nodes.filter((n) => n.id !== selectedId);
      updateProjectWithHistory({ ...project, nodes: updatedNodes });
      setSelectedId(null);
      setSelectedIds([]);
      setSelectedType(null);
    }
  }, [selectedId, project, updateProjectWithHistory]);

  // Auto-fit diagram
  const handleFitView = () => {
    if (project.nodes.length === 0) {
      setZoom(1);
      setPan({ x: 60, y: 40 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    project.nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    project.sections.forEach((s) => {
      minY = Math.min(minY, s.y);
      maxY = Math.max(maxY, s.y + 40);
    });

    const padding = 80;
    const diagramWidth = maxX - minX + padding * 2;
    const diagramHeight = maxY - minY + padding * 2;

    const viewportWidth = canvasContainerRef.current
      ? canvasContainerRef.current.clientWidth
      : window.innerWidth - (isLeftSidebarOpen ? 310 : 0) - (isRightSidebarOpen ? 290 : 0);
    const viewportHeight = canvasContainerRef.current
      ? canvasContainerRef.current.clientHeight
      : window.innerHeight - 56;

    const scaleX = viewportWidth / diagramWidth;
    const scaleY = viewportHeight / diagramHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.6);

    const newPanX = (viewportWidth - (maxX - minX) * newZoom) / 2 - minX * newZoom;
    const newPanY = (viewportHeight - (maxY - minY) * newZoom) / 2 - minY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Center-anchored zoom for keyboard shortcuts and buttons
  const handleZoomAtCenter = useCallback(
    (factor: number) => {
      const containerW = canvasContainerRef.current
        ? canvasContainerRef.current.clientWidth
        : window.innerWidth - (isLeftSidebarOpen ? 310 : 0) - (isRightSidebarOpen ? 290 : 0);
      const containerH = canvasContainerRef.current
        ? canvasContainerRef.current.clientHeight
        : window.innerHeight - 56;

      const centerX = containerW / 2;
      const centerY = containerH / 2;

      setZoom((currentZoom) => {
        const newZoom = Math.min(Math.max(Number((currentZoom * factor).toFixed(3)), 0.25), 3.0);
        setPan((currentPan) => {
          const newPanX = centerX - ((centerX - currentPan.x) / currentZoom) * newZoom;
          const newPanY = centerY - ((centerY - currentPan.y) / currentZoom) * newZoom;
          return { x: Math.round(newPanX), y: Math.round(newPanY) };
        });
        return newZoom;
      });
    },
    [isLeftSidebarOpen, isRightSidebarOpen]
  );

  const handleResetZoom = useCallback(() => {
    const containerW = canvasContainerRef.current
      ? canvasContainerRef.current.clientWidth
      : window.innerWidth - 600;
    const containerH = canvasContainerRef.current
      ? canvasContainerRef.current.clientHeight
      : window.innerHeight - 56;

    setZoom(1);
    setPan({
      x: Math.round(containerW / 2 - 300),
      y: Math.round(containerH / 2 - 200)
    });
  }, []);

  // Keyboard Shortcuts (Delete, Undo, Redo, Copy, Paste, Duplicate)
  useEffect(() => {
    if (currentView !== 'editor') return;

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

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAllNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsExportModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedType === 'node' && selectedId) {
          const node = project.nodes.find((n) => n.id === selectedId);
          if (node) setCopiedNode(node);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedNode) {
          const pasted: FlowNodeType = {
            ...copiedNode,
            id: `node-${Date.now()}`,
            x: copiedNode.x + 30,
            y: copiedNode.y + 30
          };
          updateProjectWithHistory({
            ...project,
            nodes: [...project.nodes, pasted]
          });
          setSelectedId(pasted.id);
          setSelectedIds([pasted.id]);
          setSelectedType('node');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomAtCenter(1.18);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomAtCenter(1 / 1.18);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.shiftKey && (e.key === '!' || e.key === '1')) {
        e.preventDefault();
        handleFitView();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        setIsLeftSidebarOpen((o) => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        setIsRightSidebarOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedType(null);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedType === 'node') {
          const idsToMove = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
          if (idsToMove.length > 0) {
            e.preventDefault();
            const moveSet = new Set(idsToMove);
            const step = e.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;

            const updatedNodes = project.nodes.map((node) => {
              if (!moveSet.has(node.id)) return node;
              return { ...node, x: node.x + dx, y: node.y + dy };
            });
            updateProjectWithHistory({ ...project, nodes: updatedNodes });
            return;
          }
        }
      } else if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleAddNode({
            type: 'note',
            width: 140,
            height: 110,
            title: 'Architecture Note',
            subtitle: 'Double click to edit...',
            style: {
              bg: '#FEFCE8',
              borderColor: '#FDE047',
              textColor: '#713F12',
              subtextColor: '#854D0E',
              borderRadius: 6,
              borderWidth: 1,
              shadow: true
            }
          });
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleAddNode({
            type: 'server',
            width: 160,
            height: 96,
            title: 'Service Node',
            subtitle: 'Backend Process',
            status: 'online',
            style: {
              bg: '#FFFFFF',
              borderColor: '#2563EB',
              textColor: '#0F172A',
              subtextColor: '#475569',
              borderRadius: 10,
              borderWidth: 1.5,
              colorPalette: 'blue'
            }
          });
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleAddNode({
            type: 'database',
            width: 140,
            height: 110,
            title: 'Database',
            subtitle: 'Storage Engine',
            status: 'online',
            style: {
              bg: '#FAF5FF',
              borderColor: '#A855F7',
              borderRadius: 12,
              borderWidth: 1.5,
              colorPalette: 'purple'
            }
          });
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          handleAddNode({
            type: 'terminal',
            width: 150,
            height: 110,
            title: 'CLI Client',
            subtitle: 'Console Tool',
            status: 'online',
            style: {
              bg: '#FFFFFF',
              borderColor: '#0F172A',
              headerBg: '#0F172A',
              borderRadius: 10,
              borderWidth: 1.5,
              colorPalette: 'dark'
            }
          });
        } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentView,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleSelectAllNodes,
    handleGroupSelected,
    handleUngroupSelected,
    handleAddNode,
    copiedNode,
    project,
    selectedId,
    selectedIds,
    selectedType,
    historyIndex,
    history,
    updateProjectWithHistory
  ]);

  const handleExportPng = async (scale: number = 2) => {
    const el = document.getElementById('drafo-export-target');
    if (!el) return;
    await exportDiagramAsPng(el, `${project.name.replace(/\s+/g, '-').toLowerCase()}.png`, scale);
  };

  const handleExportSvg = async () => {
    const el = document.getElementById('drafo-export-target');
    if (!el) return;
    await exportDiagramAsSvg(el, `${project.name.replace(/\s+/g, '-').toLowerCase()}.svg`);
  };

  const handleExportJson = () => {
    exportDiagramAsJson(project);
  };

  const handleCopyClipboard = async () => {
    const el = document.getElementById('drafo-export-target');
    if (!el) return;
    await copyDiagramToClipboard(el);
  };

  return (
    <div className="drafo-app-root">
      {/* 1. PROJECT DASHBOARD VIEW (ENTRY POINT) */}
      {currentView === 'dashboard' ? (
        <ProjectDashboard
          projects={projects}
          onOpenProject={handleOpenProject}
          onCreateProject={handleCreateProject}
          onOpenAIGenerator={() => setIsAIModalOpen(true)}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          onImportProject={handleImportProject}
          onExportProjectJson={handleExportProjectJson}
        />
      ) : (
        /* 2. STUDIO DIAGRAM CANVAS EDITOR VIEW */
        <>
          {/* Top Universal Navbar */}
          <Navbar
            projectName={project.name}
            onUpdateProjectName={(name) => updateProjectWithHistory({ ...project, name })}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onOpenTemplates={() => setIsTemplateModalOpen(true)}
            onOpenAIGenerator={() => setIsAIModalOpen(true)}
            onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
            onOpenExportStudio={() => setIsExportModalOpen(true)}
            onOpenCollaboration={() => setIsCollabModalOpen(true)}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportJson={handleExportJson}
            onImportJson={handleImportProject}
            onCopyClipboard={handleCopyClipboard}
          />

          {/* Main Studio Body (Left Palette + Infinite Canvas + Right Inspector) */}
          <div className="drafo-studio-layout">
            {/* Collapsible Left Component Palette */}
            <ComponentPalette
              isOpen={isLeftSidebarOpen}
              onToggleCollapse={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              onAddNode={handleAddNode}
              onAddSection={handleAddSection}
              onOpenTemplates={() => setIsTemplateModalOpen(true)}
              onOpenAIGenerator={() => setIsAIModalOpen(true)}
            />

            {/* Center Infinite Interactive Canvas */}
            <main className="drafo-canvas-viewport">
              <FlowCanvas
                project={project}
                selectedId={selectedId}
                selectedIds={selectedIds}
                selectedType={selectedType}
                activeSimStep={activeSimStep}
                onSelect={handleSelect}
                onSelectMultiple={handleSelectMultiple}
                onUpdateProject={updateProjectWithHistory}
                onUpdateProjectLive={updateProjectLive}
                canvasRef={canvasContainerRef}
                zoom={zoom}
                pan={pan}
                onPanChange={setPan}
                onZoomChange={setZoom}
                onFitView={handleFitView}
                onResetZoom={handleResetZoom}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                isSimulating={isSimulating}
                onToggleSimulation={() => {
                  setIsSimulating(!isSimulating);
                  setActiveSimStep(isSimulating ? null : 0);
                }}
              />

              {/* Interactive Step Simulation Bar when active */}
              {isSimulating && (
                <FlowPlayer
                  edges={project.edges}
                  nodes={project.nodes}
                  activeStep={activeSimStep}
                  onStepChange={setActiveSimStep}
                  onClose={() => {
                    setIsSimulating(false);
                    setActiveSimStep(null);
                  }}
                />
              )}

              {/* Floating Live Collaboration Header Banner */}
              {collabRoomId && (
                <div className="drafo-viewport-live-banner">
                  <div className="drafo-viewport-banner-left">
                    <span className="drafo-collab-pulse-dot" />
                    <span className="drafo-viewport-room-tag">LIVE: {collabRoomId}</span>
                    <span className="drafo-viewport-peer-count">
                      {collabPeers.length > 0
                        ? `${collabPeers.length + 1} collaborators active`
                        : 'Waiting for collaborators to open link...'}
                    </span>
                  </div>
                  <div className="drafo-viewport-banner-right">
                    <button
                      className="drafo-viewport-invite-btn"
                      onClick={() => setIsCollabModalOpen(true)}
                    >
                      <Users size={12} />
                      <span>Invite</span>
                    </button>
                    <button
                      className="drafo-viewport-leave-btn"
                      onClick={() => {
                        collabEngine.leaveRoom();
                        setCollabRoomId(null);
                        setCollabPeers([]);
                      }}
                      title="Leave collaboration room"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Toast when collaborators join or status updates */}
              {collabToast.visible && (
                <div className="drafo-collab-viewport-toast">
                  <Users size={14} color="#10B981" />
                  <span>{collabToast.message}</span>
                </div>
              )}
            </main>

            {/* Collapsible Right Property Inspector */}
            <PropertyInspector
              isOpen={isRightSidebarOpen}
              onToggleCollapse={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              project={project}
              selectedId={selectedId}
              selectedIds={selectedIds}
              selectedType={selectedType}
              onUpdateProject={updateProjectWithHistory}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              onAlignSelected={handleAlign}
              onDistributeSelected={handleDistribute}
              onGroupSelected={handleGroupSelected}
              onUngroupSelected={handleUngroupSelected}
            />
          </div>
        </>
      )}

      {/* Templates Modal */}
      {isTemplateModalOpen && (
        <TemplateModal
          currentTemplateId={project.id}
          onSelectTemplate={(tmpl) => {
            const cloned: FlowProject = JSON.parse(JSON.stringify(tmpl));
            cloned.id = `project-${Date.now()}`;
            cloned.updatedAt = new Date().toISOString();
            updateProjectWithHistory(cloned);
            setIsTemplateModalOpen(false);
          }}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}

      {/* AI Flow Generator Modal */}
      {isAIModalOpen && (
        <AIFlowModal
          onFlowGenerated={(generated) => {
            const timestamped = {
              ...generated,
              id: `project-${Date.now()}`,
              updatedAt: new Date().toISOString()
            };
            setProjects((prev) => [timestamped, ...prev]);
            setProject(timestamped);
            setHistory([timestamped]);
            setHistoryIndex(0);
            setCurrentView('editor');
            setIsAIModalOpen(false);
          }}
          onClose={() => setIsAIModalOpen(false)}
        />
      )}

      {/* Visual Export & Snippet Studio Modal */}
      {isExportModalOpen && (
        <ExportShareModal
          project={project}
          selectedIds={selectedIds}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* P2P Live Collaboration & WebCrypto Vault Modal */}
      {isCollabModalOpen && (
        <CollaborationModal
          project={project}
          onImportProject={(imported) => {
            updateProjectWithHistory(imported);
            collabEngine.updateProjectFromLocal(imported);
          }}
          onClose={() => setIsCollabModalOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default App;
