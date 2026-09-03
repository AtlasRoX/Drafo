'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FlowProject } from '../../types/flow';
import { DrafoLogo } from '../../assets/DrafoLogo';
import {
  Plus,
  Search,
  Wand2,
  FolderOpen,
  Copy,
  Trash2,
  Download,
  Upload,
  Layers,
  MoreVertical,
  X,
  Edit2
} from 'lucide-react';
import { TelegramDoodleBanner } from './TelegramDoodleBanner';
import './ProjectDashboard.css';

interface ProjectDashboardProps {
  projects: FlowProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (templateId?: string) => void;
  onOpenAIGenerator: () => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onImportProject: (file: File) => void;
  onExportProjectJson: (projectId: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onOpenAIGenerator,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onImportProject,
  onExportProjectJson
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent'>('all');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenProjectId, setMenuOpenProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close 3-dot dropdown menu on outside click
  useEffect(() => {
    const handleCloseMenu = () => setMenuOpenProjectId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Filter and sort projects by search query and active filter
  const filteredProjects = projects
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    })
    .sort((a, b) => {
      if (activeFilter === 'recent') {
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        return timeB - timeA;
      }
      return 0;
    });

  const handleStartRename = (project: FlowProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingTitle(project.name);
  };

  const handleFinishRename = (projectId: string) => {
    if (editingTitle.trim()) {
      onRenameProject(projectId, editingTitle.trim());
    }
    setEditingProjectId(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="drafo-dashboard-root">
      {/* Top Universal Dashboard Bar */}
      <header className="drafo-dashboard-header">
        <div className="drafo-dash-left">
          <DrafoLogo size={28} showWordmark={true} />

          {/* Search Bar */}
          <div className="drafo-dash-search-box">
            <Search size={14} className="drafo-dash-search-icon" />
            <input
              type="text"
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="drafo-dash-search-input"
            />
            {searchQuery && (
              <button
                className="drafo-dash-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="drafo-dash-right">
          <label className="drafo-dash-btn secondary cursor-pointer">
            <Upload size={14} />
            <span>Import</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.drafo"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </label>

          <button className="drafo-dash-btn ai-special" onClick={onOpenAIGenerator}>
            <Wand2 size={14} />
            <span>AI Flow</span>
          </button>

          <button className="drafo-dash-btn primary" onClick={() => onCreateProject()}>
            <Plus size={15} />
            <span>New Diagram</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="drafo-dashboard-content">
        {/* Section Header Bar */}
        <div className="drafo-dash-main-bar">
          <div className="drafo-dash-section-left">
            <h1 className="drafo-dash-section-title">All Diagrams</h1>
            <span className="drafo-dash-count-badge">{filteredProjects.length}</span>
          </div>

          <div className="drafo-dash-filter-pills">
            <button
              className={`drafo-dash-pill ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              className={`drafo-dash-pill ${activeFilter === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveFilter('recent')}
            >
              Recent
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="drafo-dash-projects-grid">
          {/* New Blank Diagram Card */}
          <div
            className="drafo-new-project-card"
            onClick={() => onCreateProject()}
            title="Create a new diagram"
          >
            <div className="drafo-new-project-icon-wrap">
              <Plus size={22} />
            </div>
            <span className="drafo-new-project-label">New Diagram</span>
          </div>

          {/* Project Cards */}
          {filteredProjects.map((project) => {
            const nodeCount = project.nodes?.length || 0;
            const edgeCount = project.edges?.length || 0;

            return (
              <div
                key={project.id}
                className={`drafo-project-card ${menuOpenProjectId === project.id ? 'menu-open' : ''}`}
                onClick={() => onOpenProject(project.id)}
              >
                {/* Visual Header Preview with Doodle Illustration */}
                <div className="drafo-project-card-banner">
                  <TelegramDoodleBanner projectId={project.id} projectName={project.name} />
                </div>

                {/* Card Body */}
                <div className="drafo-project-card-body">
                  <div className="drafo-project-title-row">
                    {editingProjectId === project.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleFinishRename(project.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="drafo-nav-title-input"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <span
                        className="drafo-project-title"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(project, e);
                        }}
                      >
                        {project.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="drafo-project-card-footer">
                  <span className="drafo-project-updated-text">
                    {nodeCount > 0 ? `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'} • ` : ''}Updated {formatRelativeTime(project.updatedAt)}
                  </span>

                  {/* 3-Dot Options Menu */}
                  <div
                    className="drafo-card-options-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="drafo-card-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenProjectId((prev) => (prev === project.id ? null : project.id));
                      }}
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpenProjectId === project.id && (
                      <div
                        className="drafo-card-popover-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="drafo-card-popover-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenProjectId(null);
                            handleStartRename(project, e);
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Rename</span>
                        </button>

                        <button
                          className="drafo-card-popover-item"
                          onClick={() => {
                            onDuplicateProject(project.id);
                            setMenuOpenProjectId(null);
                          }}
                        >
                          <Copy size={13} />
                          <span>Duplicate</span>
                        </button>

                        <button
                          className="drafo-card-popover-item"
                          onClick={() => {
                            onExportProjectJson(project.id);
                            setMenuOpenProjectId(null);
                          }}
                        >
                          <Download size={13} />
                          <span>Download .drafo</span>
                        </button>

                        <div className="drafo-card-popover-divider" />

                        <button
                          className="drafo-card-popover-item danger"
                          onClick={() => {
                            onDeleteProject(project.id);
                            setMenuOpenProjectId(null);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty Search State */}
          {filteredProjects.length === 0 && (
            <div className="drafo-dash-empty-state">
              <FolderOpen size={36} color="#94A3B8" />
              <div className="drafo-empty-title">No diagrams found</div>
              <div className="drafo-empty-sub">
                No diagrams match &quot;{searchQuery}&quot;. Create a new diagram or clear search.
              </div>
              <button
                className="drafo-dash-btn primary"
                onClick={() => onCreateProject()}
              >
                <Plus size={14} />
                <span>Create Diagram</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
