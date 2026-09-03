'use client';

import React, { useState, useRef } from 'react';
import { DrafoLogo } from '../../assets/DrafoLogo';
import {
  Download,
  Copy,
  Wand2,
  Bookmark,
  FileCode,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ArrowLeft,
  Keyboard,
  Sparkles,
  Users
} from 'lucide-react';
import { collabEngine } from '../../crdt/yjsProvider';
import './Navbar.css';

interface NavbarProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  onBackToDashboard?: () => void;
  onOpenTemplates: () => void;
  onOpenAIGenerator: () => void;
  onOpenShortcuts?: () => void;
  onOpenExportStudio?: () => void;
  onOpenCollaboration?: () => void;
  onExportPng: (scale?: number) => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onCopyClipboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  onUpdateProjectName,
  onBackToDashboard,
  onOpenTemplates,
  onOpenAIGenerator,
  onOpenShortcuts,
  onOpenExportStudio,
  onOpenCollaboration,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImportJson,
  onCopyClipboard
}) => {
  const [peerCount, setPeerCount] = useState<number>(() => collabEngine.getRemotePeers().length);

  React.useEffect(() => {
    const unsub = collabEngine.onPeersChange((peers) => {
      setPeerCount(peers.length);
    });
    return unsub;
  }, []);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectName);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onUpdateProjectName(tempTitle.trim());
    } else {
      setTempTitle(projectName);
    }
  };

  const handleCopy = () => {
    onCopyClipboard();
    setCopiedNotification(true);
    setShowExportMenu(false);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      setShowExportMenu(false);
    }
  };

  return (
    <header className="drafo-navbar">
      {/* Brand, Back Arrow & Diagram Title */}
      <div className="drafo-nav-left">
        {onBackToDashboard && (
          <button
            className="drafo-nav-back-btn"
            onClick={onBackToDashboard}
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <DrafoLogo size={28} showWordmark={true} />

        <div className="drafo-title-editor">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="drafo-nav-title-input"
            />
          ) : (
            <span
              className="drafo-nav-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
            >
              {projectName}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Shortcuts, Presets, AI Flow, Export */}
      <div className="drafo-nav-right">
        {onOpenShortcuts && (
          <button
            className="drafo-nav-btn icon-only-btn"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard size={17} />
          </button>
        )}

        <button
          className="drafo-nav-btn icon-only-btn"
          onClick={onOpenTemplates}
          title="Architecture Presets & Templates"
          aria-label="Presets"
        >
          <Bookmark size={17} />
        </button>

        <button className="drafo-nav-btn ai-btn" onClick={onOpenAIGenerator}>
          <Wand2 size={15} />
          <span>AI Flow</span>
        </button>

        {/* Live P2P Collaboration & Vault Button */}
        {onOpenCollaboration && (
          <button
            className={`drafo-nav-btn collab-nav-btn ${peerCount > 0 ? 'is-live' : ''}`}
            onClick={onOpenCollaboration}
            title="P2P Multiplayer Collaboration & E2E Encrypted Vault"
          >
            <Users size={14} />
            <span>{peerCount > 0 ? `Collab (${peerCount + 1})` : 'Live Collab'}</span>
            {peerCount > 0 && <span className="drafo-collab-pulse-dot" />}
          </button>
        )}

        {/* Export Dropdown */}
        <div className="drafo-export-dropdown-wrapper">
          <button
            className="drafo-nav-btn export-primary-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={15} />
            <span>Export</span>
            <ChevronDown size={14} />
          </button>

          {showExportMenu && (
            <div className="drafo-export-menu">
              {onOpenExportStudio && (
                <>
                  <button
                    className="drafo-menu-item featured"
                    onClick={() => {
                      onOpenExportStudio();
                      setShowExportMenu(false);
                    }}
                    style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px' }}
                  >
                    <Sparkles size={16} color="#7C3AED" />
                    <div className="drafo-menu-item-info">
                      <span className="menu-title" style={{ color: '#6D28D9', fontWeight: 700 }}>
                        Visual Export Studio...
                      </span>
                      <span className="menu-sub">Custom background, snippet & SVG (Ctrl+E)</span>
                    </div>
                  </button>
                  <div className="drafo-menu-divider" />
                </>
              )}

              <button
                className="drafo-menu-item"
                onClick={() => {
                  onExportPng(2);
                  setShowExportMenu(false);
                }}
              >
                <ImageIcon size={16} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">PNG Image (High-Res 2x)</span>
                  <span className="menu-sub">Best for slides & sharing</span>
                </div>
              </button>

              <button
                className="drafo-menu-item"
                onClick={() => {
                  onExportPng(4);
                  setShowExportMenu(false);
                }}
              >
                <ImageIcon size={16} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">Ultra HD PNG (4x Print)</span>
                  <span className="menu-sub">Sharp lossless vector raster</span>
                </div>
              </button>

              <button
                className="drafo-menu-item"
                onClick={() => {
                  onExportSvg();
                  setShowExportMenu(false);
                }}
              >
                <FileCode size={16} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">Export Clean SVG</span>
                  <span className="menu-sub">Vector graphics format</span>
                </div>
              </button>

              <div className="drafo-menu-divider" />

              <button className="drafo-menu-item" onClick={handleCopy}>
                <Copy size={16} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">Copy to Clipboard</span>
                  <span className="menu-sub">Instant paste anywhere</span>
                </div>
              </button>

              <button
                className="drafo-menu-item"
                onClick={() => {
                  onExportJson();
                  setShowExportMenu(false);
                }}
              >
                <Download size={16} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">Save .drafo File</span>
                  <span className="menu-sub">JSON project backup</span>
                </div>
              </button>

              <label className="drafo-menu-item cursor-pointer">
                <Download size={16} style={{ transform: 'rotate(180deg)' }} />
                <div className="drafo-menu-item-info">
                  <span className="menu-title">Open .drafo Project</span>
                  <span className="menu-sub">Load a saved diagram file</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.drafo"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Copied Toast */}
        {copiedNotification && (
          <div className="drafo-toast">
            <Check size={14} />
            <span>Copied diagram to clipboard!</span>
          </div>
        )}
      </div>
    </header>
  );
};
