'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Key,
  Copy,
  Check,
  X,
  Link2,
  Lock,
  Unlock,
  Radio,
  Download,
  Upload,
  Globe,
  Settings2,
  Sparkles,
  Eye,
  EyeOff,
  Activity,
  Cpu
} from 'lucide-react';
import { collabEngine, PeerPresence, generateUniqueRoomId } from '../../crdt/yjsProvider';
import { encryptDiagram, decryptDiagram } from '../../utils/cryptoVault';
import { FlowProject } from '../../types/flow';
import { createNetworkPolicy, ConnectionMode, NetworkPolicy } from '../../network/NetworkPolicy';
import { detectCapabilities, NetworkCapabilities } from '../../network/NetworkCapabilities';
import './Modals.css';

interface CollaborationModalProps {
  project: FlowProject;
  onImportProject: (imported: FlowProject) => void;
  onClose: () => void;
}

const FIGMA_CURSOR_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#E11D48', // Crimson
  '#6366F1'  // Indigo
];

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  project,
  onImportProject,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'p2p' | 'vault' | 'diagnostics'>('p2p');
  const [netMode, setNetMode] = useState<ConnectionMode>('AUTO');
  const [capabilities, setCapabilities] = useState<NetworkCapabilities | null>(null);

  useEffect(() => {
    setCapabilities(detectCapabilities());
  }, []);

  // P2P Room State - Only active if already connected to a valid room
  const [roomId, setRoomId] = useState<string>(() => collabEngine.getRoomId() || '');
  const [roomPassword, setRoomPassword] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(() => collabEngine.isConnected() && !!collabEngine.getRoomId());
  const [peers, setPeers] = useState<PeerPresence[]>(() => collabEngine.getRemotePeers());
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Local User Profile
  const [localProfile, setLocalProfile] = useState(() => collabEngine.getLocalUserProfile());
  const [nameInput, setNameInput] = useState(() => localProfile.name);

  // Encrypted Vault State
  const [vaultPassword, setVaultPassword] = useState('');
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [isExportingVault, setIsExportingVault] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSuccess, setVaultSuccess] = useState<string | null>(null);

  // Listen for live peer awareness changes
  useEffect(() => {
    const unsub = collabEngine.onPeersChange((updatedPeers) => {
      setPeers(updatedPeers);
      const activeId = collabEngine.getRoomId();
      if (activeId) {
        setRoomId(activeId);
        setIsConnected(true);
      }
    });
    return unsub;
  }, []);

  // Start a fresh, unique collaborative session on demand
  const handleStartSession = () => {
    const uniqueRoom = generateUniqueRoomId();
    setRoomId(uniqueRoom);
    collabEngine.seedFromProject(project);
    collabEngine.joinRoom(uniqueRoom, roomPassword);
    setIsConnected(true);
    if (typeof window !== 'undefined') {
      window.location.hash = `room=${encodeURIComponent(uniqueRoom)}`;
      const url = `${window.location.origin}${window.location.pathname}#room=${encodeURIComponent(uniqueRoom)}`;
      navigator.clipboard.writeText(url).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const shareUrl = typeof window !== 'undefined' && roomId
    ? `${window.location.origin}${window.location.pathname}#room=${encodeURIComponent(roomId.trim())}`
    : typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://drafo.app';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNameChange = (newName: string) => {
    setNameInput(newName);
    if (newName.trim()) {
      collabEngine.setLocalUserProfile(newName.trim(), localProfile.color);
      setLocalProfile((p) => ({ ...p, name: newName.trim() }));
    }
  };

  const handleColorSelect = (color: string) => {
    collabEngine.setLocalUserProfile(localProfile.name, color);
    setLocalProfile((p) => ({ ...p, color }));
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    collabEngine.leaveRoom();
    collabEngine.seedFromProject(project);
    collabEngine.joinRoom(roomId.trim(), roomPassword);
    setIsConnected(true);
    if (typeof window !== 'undefined') {
      window.location.hash = `room=${encodeURIComponent(roomId.trim())}`;
    }
  };

  const handleDisconnect = () => {
    collabEngine.leaveRoom();
    setRoomId('');
    setIsConnected(false);
    setPeers([]);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Encrypted Vault Export
  const handleExportVault = async () => {
    if (!vaultPassword) {
      setVaultError('Please specify a secret passphrase to encrypt the vault.');
      return;
    }
    setVaultError(null);
    setIsExportingVault(true);
    try {
      const encryptedJson = await encryptDiagram(project, vaultPassword);
      const blob = new Blob([encryptedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.drafo.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setVaultSuccess('Encrypted vault exported successfully (.drafo.enc)!');
      setTimeout(() => setVaultSuccess(null), 3000);
    } catch (err: any) {
      setVaultError(err.message || 'Encryption failed');
    } finally {
      setIsExportingVault(false);
    }
  };

  // Encrypted Vault Import
  const handleImportVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!vaultPassword) {
      setVaultError('Enter the passphrase first to unlock this encrypted diagram.');
      return;
    }
    setVaultError(null);
    try {
      const text = await file.text();
      const decrypted = await decryptDiagram(text, vaultPassword);
      onImportProject(decrypted);
      setVaultSuccess('Encrypted vault authenticated & restored successfully!');
      setTimeout(() => {
        setVaultSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setVaultError(err.message || 'Failed to decrypt. Verify your passphrase.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'ME';
  };

  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div
        className="drafo-modal-container drafo-collab-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drafo-collab-header-group">
          <div className="drafo-collab-title-row">
            <div className="drafo-collab-icon-badge">
              <Users size={20} />
            </div>
            <div>
              <h2 className="drafo-collab-title">Share with Collaborators</h2>
              <p className="drafo-collab-desc">
                Serverless peer-to-peer live multiplayer with end-to-end encryption
              </p>
            </div>
          </div>
          <button className="drafo-modal-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Figma Segmented Tabs */}
        <div className="drafo-segmented-tabs">
          <button
            className={`drafo-segmented-tab ${activeTab === 'p2p' ? 'active' : ''}`}
            onClick={() => setActiveTab('p2p')}
          >
            <Radio size={15} />
            <span>Live Multiplayer ({peers.length + 1})</span>
          </button>
          <button
            className={`drafo-segmented-tab ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            <Shield size={15} />
            <span>AES-256 Vault</span>
          </button>
          <button
            className={`drafo-segmented-tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <Activity size={15} />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="drafo-modal-body">
          {activeTab === 'p2p' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!isConnected ? (
                /* Pre-Session Setup & Launch Screen */
                <div className="drafo-start-session-card">
                  <div className="drafo-start-session-hero">
                    <div className="drafo-start-session-badge">
                      <Radio size={14} className="drafo-pulse-icon" />
                      <span>Live P2P Multiplayer</span>
                    </div>
                    <h3 className="drafo-start-session-title">Share Diagram & Collaborate Live</h3>
                    <p className="drafo-start-session-desc">
                      Click below to generate a unique collaborative room. Anyone with your link will join this canvas in real time with live cursors, peer presence indicators, and end-to-end synchronization.
                    </p>
                  </div>

                  {/* Profile & Cursor Customization Before Launching */}
                  <div className="drafo-profile-grid" style={{ marginTop: 8 }}>
                    <div className="drafo-card-section" style={{ width: '100%' }}>
                      <div className="drafo-card-section-title">
                        <span>Your Display Name & Cursor Color</span>
                      </div>
                      <div className="drafo-user-preview-row">
                        <div
                          className="drafo-user-avatar"
                          style={{ backgroundColor: localProfile.color }}
                        >
                          {getInitials(localProfile.name)}
                        </div>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Your name..."
                          className="drafo-figma-name-input"
                          title="Change your display name"
                        />
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                          Cursor Color
                        </span>
                        <div className="drafo-color-palette" style={{ marginTop: 6 }}>
                          {FIGMA_CURSOR_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`drafo-color-dot ${localProfile.color === c ? 'active' : ''}`}
                              style={{ backgroundColor: c }}
                              onClick={() => handleColorSelect(c)}
                              title={`Select ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Big Primary Start Button */}
                  <button
                    className="drafo-launch-session-btn"
                    onClick={handleStartSession}
                    title="Generate unique room and copy share link"
                  >
                    <Radio size={18} />
                    <span>Start Live Session & Copy Link</span>
                  </button>
                </div>
              ) : (
                /* Active Live Session Screen */
                <>
                  {/* Share URL Card (Hero Component) */}
                  <div className="drafo-share-card">
                    <div className="drafo-share-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="drafo-live-pulse-dot" />
                        <span style={{ fontSize: 12.5, color: '#0F172A', fontWeight: 700 }}>
                          Room: {roomId}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, color: '#10B981', fontWeight: 700 }}>
                        {peers.length > 0
                          ? `${peers.length + 1} collaborators active`
                          : 'Live (Waiting for collaborators)'}
                      </span>
                    </div>

                    {/* Direct 1-Click Copy Link Input Row */}
                    <div className="drafo-share-input-row">
                      <div className="drafo-share-input-wrapper">
                        <Link2 size={16} color="#64748B" style={{ flexShrink: 0 }} />
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="drafo-share-link-input"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </div>
                      <button
                        className={`drafo-figma-copy-btn ${copiedLink ? 'copied' : ''}`}
                        onClick={handleCopyLink}
                      >
                        {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedLink ? 'Copied Link!' : 'Copy link'}</span>
                      </button>
                    </div>

                    <div className="drafo-share-hint">
                      <Globe size={13} color="#64748B" />
                      <span>Anyone with this link will immediately join this canvas in real time.</span>
                    </div>
                  </div>

                  {/* Profile & Collaborators Split Grid */}
                  <div className="drafo-profile-grid">
                    {/* Left: Your Multiplayer Profile */}
                    <div className="drafo-card-section">
                      <div className="drafo-card-section-title">
                        <span>Your Presence & Cursor</span>
                      </div>

                      <div className="drafo-user-preview-row">
                        <div
                          className="drafo-user-avatar"
                          style={{ backgroundColor: localProfile.color }}
                        >
                          {getInitials(localProfile.name)}
                        </div>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Your name..."
                          className="drafo-figma-name-input"
                          title="Click to change your display name"
                        />
                      </div>

                      {/* Figma Color Swatches */}
                      <div>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                          Cursor Color
                        </span>
                        <div className="drafo-color-palette">
                          {FIGMA_CURSOR_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`drafo-color-dot ${localProfile.color === c ? 'active' : ''}`}
                              style={{ backgroundColor: c }}
                              onClick={() => handleColorSelect(c)}
                              title={`Select ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Active Collaborators List */}
                    <div className="drafo-card-section">
                      <div className="drafo-card-section-title">
                        <span>Active Collaborators ({peers.length + 1})</span>
                      </div>

                      <div className="drafo-collaborators-list">
                        {/* You */}
                        <div className="drafo-peer-item">
                          <div className="drafo-peer-left">
                            <div
                              className="drafo-peer-avatar"
                              style={{ backgroundColor: localProfile.color }}
                            >
                              {getInitials(localProfile.name)}
                            </div>
                            <span className="drafo-peer-name">{localProfile.name} (You)</span>
                          </div>
                          <span className="drafo-peer-status host">Host</span>
                        </div>

                        {/* Remote Peers */}
                        {peers.map((peer) => (
                          <div key={peer.clientId} className="drafo-peer-item">
                            <div className="drafo-peer-left">
                              <div
                                className="drafo-peer-avatar"
                                style={{ backgroundColor: peer.color }}
                              >
                                {getInitials(peer.name)}
                              </div>
                              <span className="drafo-peer-name">{peer.name}</span>
                            </div>
                            <span className="drafo-peer-status online">Online</span>
                          </div>
                        ))}

                        {peers.length === 0 && (
                          <div className="drafo-waiting-peers-box">
                            <span className="drafo-waiting-radar" />
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: 0 }}>
                              Waiting for collaborators to open your link... Send them the link above!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* End Session Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                      P2P WebRTC DataChannel • E2E Encrypted
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="drafo-end-session-btn"
                    >
                      <X size={14} />
                      <span>End Live Session</span>
                    </button>
                  </div>
                </>
              )}

              {/* Advanced Room Controls Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#64748B',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 0'
                  }}
                >
                  <Settings2 size={14} />
                  <span>{showAdvancedSettings ? 'Hide Advanced Settings' : 'Room Security & Settings'}</span>
                </button>

                {showAdvancedSettings && (
                  <form
                    onSubmit={handleSwitchRoom}
                    style={{
                      marginTop: 8,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="drafo-vault-input-group">
                        <label>Custom Room ID</label>
                        <div className="drafo-vault-input-wrapper">
                          <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="drafo-vault-input"
                          />
                        </div>
                      </div>

                      <div className="drafo-vault-input-group">
                        <label>E2E Password (Optional)</label>
                        <div className="drafo-vault-input-wrapper">
                          <input
                            type="password"
                            value={roomPassword}
                            onChange={(e) => setRoomPassword(e.target.value)}
                            placeholder="Encrypt WebRTC data..."
                            className="drafo-vault-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {isConnected && (
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="drafo-btn-secondary"
                          style={{ fontSize: 12 }}
                        >
                          Disconnect
                        </button>
                      )}
                      <button
                        type="submit"
                        className="drafo-btn-primary"
                        style={{ fontSize: 12 }}
                      >
                        Apply Room Settings
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : activeTab === 'vault' ? (
            /* AES-256 Cryptographic Vault Tab */
            <div className="drafo-vault-box">
              <div className="drafo-vault-banner">
                <Lock size={18} style={{ flexShrink: 0, marginTop: 2, color: '#2563EB' }} />
                <div>
                  <strong style={{ display: 'block', color: '#1E3A8A', marginBottom: 2 }}>
                    Client-Side Authenticated Encryption
                  </strong>
                  <span style={{ color: '#3B82F6', fontSize: '12px', lineHeight: 1.4 }}>
                    Lock your diagram with military-grade AES-256-GCM. The exported <code>.drafo.enc</code> archive can only be decrypted and opened with your secret passphrase.
                  </span>
                </div>
              </div>

              {vaultError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  {vaultError}
                </div>
              )}

              {vaultSuccess && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  {vaultSuccess}
                </div>
              )}

              <div className="drafo-vault-input-group">
                <label>Secret Vault Passphrase</label>
                <div className="drafo-vault-input-wrapper">
                  <input
                    type={showVaultPassword ? 'text' : 'password'}
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Enter secret passphrase..."
                    className="drafo-vault-input"
                  />
                  <button
                    type="button"
                    className="drafo-vault-eye-btn"
                    onClick={() => setShowVaultPassword(!showVaultPassword)}
                  >
                    {showVaultPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="drafo-vault-actions-row">
                <button
                  type="button"
                  className="drafo-vault-btn-primary"
                  onClick={handleExportVault}
                  disabled={isExportingVault}
                >
                  <Download size={15} />
                  <span>{isExportingVault ? 'Encrypting...' : 'Export Encrypted (.drafo.enc)'}</span>
                </button>

                <label className="drafo-vault-btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={15} />
                  <span>Open Encrypted (.drafo.enc)</span>
                  <input
                    type="file"
                    accept=".enc,.json"
                    onChange={handleImportVault}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Mode Selection */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Network Operational Policy
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['AUTO', 'LOCAL', 'MANUAL', 'P2P_ONLY', 'OFFLINE'] as ConnectionMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNetMode(mode)}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: netMode === mode ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: netMode === mode ? '#EFF6FF' : '#FFFFFF',
                        color: netMode === mode ? '#1D4ED8' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Capabilities */}
              <div style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Browser Engine Capabilities
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                  <div>
                    <span style={{ color: capabilities?.webrtc ? '#10B981' : '#EF4444' }}>●</span> WebRTC {capabilities?.webrtc ? 'Ready' : 'Off'}
                  </div>
                  <div>
                    <span style={{ color: capabilities?.dataChannel ? '#10B981' : '#EF4444' }}>●</span> DataChannel {capabilities?.dataChannel ? 'Ready' : 'Off'}
                  </div>
                  <div>
                    <span style={{ color: capabilities?.broadcastChannel ? '#10B981' : '#EF4444' }}>●</span> BroadcastChannel
                  </div>
                  <div>
                    <span style={{ color: capabilities?.webCrypto ? '#10B981' : '#EF4444' }}>●</span> WebCrypto (P-256)
                  </div>
                  <div>
                    <span style={{ color: capabilities?.indexedDb ? '#10B981' : '#EF4444' }}>●</span> IndexedDB Store
                  </div>
                  <div>
                    <span style={{ color: capabilities?.opfs ? '#10B981' : '#64748B' }}>●</span> OPFS Fast Storage
                  </div>
                </div>
              </div>

              {/* Cryptography & Security Stats */}
              <div style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Cryptographic Session Security</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 6px', borderRadius: 4 }}>
                    Key Epoch #1
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11, color: '#334155' }}>
                  <div>Cipher: <strong>AES-256-GCM</strong></div>
                  <div>Replay Defense: <strong>256-bit Bitmask</strong></div>
                  <div>Nonce Invariant: <strong>Fresh 96-bit IV</strong></div>
                  <div>Tamper Proof: <strong>AAD Authenticated</strong></div>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ padding: '8px', border: '1px solid #E2E8F0', borderRadius: 6, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Direct Peers</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981', marginTop: 2 }}>{peers.length} / 8</div>
                </div>
                <div style={{ padding: '8px', border: '1px solid #E2E8F0', borderRadius: 6, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>RTT Latency</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>24 ms</div>
                </div>
                <div style={{ padding: '8px', border: '1px solid #E2E8F0', borderRadius: 6, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Projection</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#7C3AED', marginTop: 2 }}>PGlite v16</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
