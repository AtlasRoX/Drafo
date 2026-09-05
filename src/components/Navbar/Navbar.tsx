import React, { useState } from 'react';
import { DrafoLogo } from '../../assets/DrafoLogo';
import {
  Download,
  Wand2,
  ArrowLeft,
  Keyboard,
  Users,
  Code2,
  Link2,
  Check
} from 'lucide-react';
import { collabEngine, PeerPresence } from '../../crdt/yjsProvider';
import './Navbar.css';

interface NavbarProps {
  projectId?: string;
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  onBackToDashboard?: () => void;
  onOpenTemplates?: () => void;
  onOpenAIGenerator: () => void;
  onOpenImportVisualize?: () => void;
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
  projectId,
  projectName,
  onUpdateProjectName,
  onBackToDashboard,
  onOpenTemplates,
  onOpenAIGenerator,
  onOpenImportVisualize,
  onOpenShortcuts,
  onOpenExportStudio,
  onOpenCollaboration,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImportJson,
  onCopyClipboard
}) => {
  const [peers, setPeers] = useState<PeerPresence[]>(() => collabEngine.getRemotePeers());
  const [currentRoom, setCurrentRoom] = useState<string | null>(() => collabEngine.getRoomId());
  const [localUser, setLocalUser] = useState(() => collabEngine.getLocalUserProfile());
  const [copiedProjectLink, setCopiedProjectLink] = useState(false);

  React.useEffect(() => {
    const unsub = collabEngine.onPeersChange((newPeers) => {
      setPeers(newPeers);
      setCurrentRoom(collabEngine.getRoomId());
      setLocalUser(collabEngine.getLocalUserProfile());
    });
    return unsub;
  }, []);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectName);

  const handleCopyProjectLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/studio?id=${projectId || ''}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedProjectLink(true);
      setTimeout(() => setCopiedProjectLink(false), 2400);
    });
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onUpdateProjectName(tempTitle.trim());
    } else {
      setTempTitle(projectName);
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

        {onBackToDashboard ? (
          <button
            type="button"
            onClick={onBackToDashboard}
            title="Back to Dashboard"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <DrafoLogo size={28} showWordmark={true} />
          </button>
        ) : (
          <a href="/studio" title="Back to Dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <DrafoLogo size={28} showWordmark={true} />
          </a>
        )}

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

        <button className="drafo-nav-btn ai-btn" onClick={onOpenAIGenerator}>
          <Wand2 size={15} />
          <span>AI Flow</span>
        </button>

        {onOpenImportVisualize && (
          <button
            className="drafo-nav-btn import-btn"
            onClick={onOpenImportVisualize}
            title="Import & Visualize Code/Schemas (Mermaid, UML, SQL, JSON, Types)"
            style={{
              background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
              borderColor: '#C7D2FE',
              color: '#4F46E5',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Code2 size={15} />
            <span>Import</span>
          </button>
        )}

        {/* Unique Shareable Project Link Button (32-digit Unique URL) */}
        <button
          className={`drafo-nav-btn drafo-nav-share-link-btn ${copiedProjectLink ? 'copied' : ''}`}
          onClick={handleCopyProjectLink}
          title={`Copy unique 32-digit project link (${projectId || ''})`}
          style={{
            background: copiedProjectLink ? '#ECFDF5' : '#F8FAFC',
            borderColor: copiedProjectLink ? '#A7F3D0' : '#E2E8F0',
            color: copiedProjectLink ? '#059669' : '#334155',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.18s ease'
          }}
        >
          {copiedProjectLink ? <Check size={14} color="#059669" /> : <Link2 size={14} />}
          <span>{copiedProjectLink ? 'Link Copied!' : 'Copy Link'}</span>
        </button>

        {/* Live P2P Collaboration, Avatars & Share Button */}
        {onOpenCollaboration && (
          <div className="drafo-nav-collab-group">
            {currentRoom && (
              <div
                className="drafo-nav-active-room-pill"
                onClick={onOpenCollaboration}
                title={`Live Room: ${currentRoom} (Click to view session & copy link)`}
              >
                <span className="drafo-collab-pulse-dot" />
                <span className="drafo-nav-room-text">{currentRoom}</span>
              </div>
            )}

            {/* Collaborator Avatars (Local User + Remote Peers) */}
            {currentRoom && (
              <div
                className="drafo-nav-avatar-stack"
                onClick={onOpenCollaboration}
                title="Active Collaborators in this diagram"
              >
                <div
                  className="drafo-nav-avatar-circle local"
                  style={{ backgroundColor: localUser.color }}
                  title={`${localUser.name} (You)`}
                >
                  {localUser.name.slice(0, 1).toUpperCase()}
                </div>
                {peers.map((peer) => (
                  <div
                    key={peer.clientId}
                    className="drafo-nav-avatar-circle"
                    style={{ backgroundColor: peer.color }}
                    title={`${peer.name} (Online)`}
                  >
                    {peer.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
            )}

            <button
              className={`drafo-nav-btn collab-nav-btn ${currentRoom ? 'is-live' : ''}`}
              onClick={onOpenCollaboration}
              title="P2P Multiplayer Collaboration"
            >
              <Users size={14} />
              <span>{currentRoom ? `Share (${peers.length + 1})` : 'Share Session'}</span>
            </button>
          </div>
        )}

        {/* Unified Visual Export Studio Button */}
        <button
          className="drafo-nav-btn export-primary-btn"
          onClick={() => {
            if (onOpenExportStudio) {
              onOpenExportStudio();
            } else {
              onExportPng(2);
            }
          }}
          title="Visual Export Studio (Ctrl+E)"
          aria-label="Visual Export Studio"
        >
          <Download size={15} />
          <span>Export</span>
          <span className="drafo-btn-badge">Ctrl+E</span>
        </button>
      </div>
    </header>
  );
};
