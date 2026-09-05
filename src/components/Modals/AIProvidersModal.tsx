'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Server,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  RefreshCw,
  Edit3
} from 'lucide-react';
import {
  AIProviderConfig,
  AIProviderType,
  PROVIDER_PRESETS
} from '../../types/aiProvider';
import {
  loadProviders,
  saveProviders,
  setActiveProviderId,
  testProviderConnection,
  fetchProviderModels,
  AvailableModelItem,
  BUILTIN_PROVIDER
} from '../../utils/aiProviderService';
import { ProviderLogo } from '../Common/ProviderLogo';
import './AIProvidersModal.css';

interface AIProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActiveProviderChange?: (provider: AIProviderConfig) => void;
}

export const AIProvidersModal: React.FC<AIProvidersModalProps> = ({
  isOpen,
  onClose,
  onActiveProviderChange
}) => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([BUILTIN_PROVIDER]);
  const [activeId, setActiveId] = useState<string>('provider-builtin');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [showKey, setShowKey] = useState(false);
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [selectedType, setSelectedType] = useState<AIProviderType>('openai');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  // Dynamic Models State
  const [availableModels, setAvailableModels] = useState<AvailableModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if dropdown should open upward based on available space
  useEffect(() => {
    if (isModelDropdownOpen && modelDropdownRef.current) {
      const rect = modelDropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 280);
    }
  }, [isModelDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load providers on modal open
  useEffect(() => {
    if (isOpen) {
      const list = loadProviders();
      setProviders(list);
      const currentActive = list.find((p) => p.isActive)?.id || list[0]?.id || BUILTIN_PROVIDER.id;
      setActiveId(currentActive);
      setViewMode('list');
      setTestingStatus(null);
      setIsModelDropdownOpen(false);
      setModelSearch('');
      setIsCustomModelInput(false);
    }
  }, [isOpen]);

  // Fetch models from provider API
  const handleFetchModels = async (
    targetType = selectedType,
    targetKey = apiKey,
    targetBaseUrl = baseUrl
  ) => {
    if (targetType !== 'ollama' && !targetKey.trim() && targetType !== 'builtin') {
      setModelFetchError('Enter your API key to fetch available models from the provider.');
      return;
    }

    setIsLoadingModels(true);
    setModelFetchError(null);

    const res = await fetchProviderModels({
      type: targetType,
      apiKey: targetKey.trim(),
      baseUrl: targetBaseUrl.trim()
    });

    setIsLoadingModels(false);

    if (res.success && res.models.length > 0) {
      setAvailableModels(res.models);
      // If current model is empty or not in the fetched list, select the top model
      if (!model || !res.models.some((m) => m.id === model)) {
        setModel(res.models[0].id);
      }
    } else {
      setModelFetchError(res.error || 'No models returned from provider API.');
    }
  };

  // Update form defaults when provider platform changes
  // Update form defaults when provider platform changes
  const handleSelectType = (type: AIProviderType) => {
    setSelectedType(type);
    const preset = PROVIDER_PRESETS[type];
    setName(preset.name);
    setBaseUrl(preset.defaultBaseUrl);
    setModel(''); // Do not mention or hardcode model name before fetching from API
    setTestingStatus(null);
    setAvailableModels([]);
    setModelFetchError(null);
    setIsModelDropdownOpen(false);
    setModelSearch('');
    setIsCustomModelInput(false);

    // If local Ollama or API key already present, fetch models immediately
    if (type === 'ollama' || (apiKey.trim() && type !== 'builtin')) {
      handleFetchModels(type, apiKey, preset.defaultBaseUrl);
    }
  };

  const handleOpenAddForm = (type?: AIProviderType) => {
    const targetType = type || 'openai';
    handleSelectType(targetType);
    setApiKey('');
    setModel('');
    setViewMode('form');
  };

  // Debounced auto-fetch models when user pastes/types API key
  useEffect(() => {
    if (viewMode !== 'form') return;
    if (selectedType === 'builtin' || selectedType === 'ollama') return;
    if (!apiKey.trim() || apiKey.trim().length < 8) return;

    const timer = setTimeout(() => {
      handleFetchModels(selectedType, apiKey, baseUrl);
    }, 600);

    return () => clearTimeout(timer);
  }, [apiKey, baseUrl, selectedType, viewMode]);

  const handleSelectActive = (id: string) => {
    const updated = setActiveProviderId(id);
    setActiveId(id);
    setProviders(loadProviders());
    if (onActiveProviderChange) {
      onActiveProviderChange(updated);
    }
  };

  const handleDeleteProvider = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'provider-builtin') return; // protect default
    const filtered = providers.filter((p) => p.id !== id);
    saveProviders(filtered);
    setProviders(filtered);
    if (activeId === id) {
      handleSelectActive('provider-builtin');
    }
  };

  const handleTestConnection = async () => {
    setTestingStatus({ loading: true });
    const res = await testProviderConnection({
      type: selectedType,
      apiKey,
      baseUrl,
      model
    });
    setTestingStatus({ loading: false, success: res.success, message: res.message });
  };

  const handleSaveProvider = () => {
    if (!name.trim()) return;

    const newProvider: AIProviderConfig = {
      id: `provider-${Date.now()}`,
      name: name.trim(),
      type: selectedType,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      model: model.trim() || PROVIDER_PRESETS[selectedType].defaultModel,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const currentList = providers.map((p) => ({ ...p, isActive: false }));
    const updatedList = [newProvider, ...currentList];
    saveProviders(updatedList);
    setProviders(updatedList);
    setActiveId(newProvider.id);
    if (onActiveProviderChange) {
      onActiveProviderChange(newProvider);
    }

    setViewMode('list');
    setApiKey('');
    setTestingStatus(null);
  };

  // Filtered models for dropdown search
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return availableModels;
    const q = modelSearch.toLowerCase();
    return availableModels.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [availableModels, modelSearch]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div
        className="drafo-modal-container drafo-providers-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drafo-providers-header">
          <div className="drafo-providers-header-left">
            <div className="drafo-providers-badge-icon">
              <ProviderLogo type={viewMode === 'form' ? selectedType : 'builtin'} size={22} />
            </div>
            <div>
              <div className="drafo-providers-title-row">
                <h3 className="drafo-providers-title">
                  {viewMode === 'list' ? 'AI Model Providers' : 'Connect AI Provider'}
                </h3>
                {viewMode === 'list' && (
                  <span className="drafo-providers-count-pill">{providers.length} configured</span>
                )}
              </div>
              <p className="drafo-providers-subtitle">
                {viewMode === 'list'
                  ? 'Select an active AI provider for architecture synthesis, or connect custom endpoints.'
                  : 'Configure your credentials and select from live models. Keys remain 100% local.'}
              </p>
            </div>
          </div>
          <button className="drafo-modal-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="drafo-providers-body">
          {viewMode === 'list' ? (
            <>
              {/* Top Action Bar */}
              <div className="drafo-providers-action-strip">
                <span className="drafo-providers-section-label">Configured AI Engines</span>
                <button
                  type="button"
                  className="drafo-providers-add-trigger-btn"
                  onClick={() => handleOpenAddForm('openai')}
                >
                  <Plus size={14} />
                  <span>Add AI Provider</span>
                </button>
              </div>

              {/* Providers List */}
              <div className="drafo-providers-list">
                {providers.map((p) => {
                  const isCurActive = activeId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`drafo-provider-item-card ${isCurActive ? 'active' : ''}`}
                      onClick={() => handleSelectActive(p.id)}
                    >
                      <div className="drafo-provider-item-left">
                        <div className={`drafo-provider-avatar-box ${p.type}`}>
                          <ProviderLogo type={p.type} size={22} />
                        </div>

                        <div className="drafo-provider-info">
                          <div className="drafo-provider-name-row">
                            <span className="drafo-provider-name">{p.name}</span>
                            <span className={`drafo-provider-type-tag ${p.type}`}>
                              {p.type.toUpperCase()}
                            </span>
                            {isCurActive && (
                              <span className="drafo-active-badge">
                                <Check size={10} /> Active
                              </span>
                            )}
                          </div>
                          <div className="drafo-provider-details-row">
                            <span className="model-spec">Model: {p.model}</span>
                            {p.baseUrl && <span className="url-spec">• {p.baseUrl}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="drafo-provider-item-right" onClick={(e) => e.stopPropagation()}>
                        {!isCurActive ? (
                          <button
                            type="button"
                            className="drafo-activate-btn"
                            onClick={() => handleSelectActive(p.id)}
                          >
                            Set Active
                          </button>
                        ) : (
                          <div className="drafo-active-check-circle" title="Current Active Engine">
                            <Check size={14} />
                          </div>
                        )}

                        {p.id !== 'provider-builtin' && (
                          <button
                            type="button"
                            className="drafo-provider-delete-btn"
                            onClick={(e) => handleDeleteProvider(p.id, e)}
                            title="Delete provider"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Presets Bar */}
              <div className="drafo-quick-presets-section">
                <span className="drafo-quick-presets-label">Quickly Add Provider:</span>
                <div className="drafo-quick-presets-pills">
                  {(
                    [
                      { type: 'openai', label: 'OpenAI' },
                      { type: 'anthropic', label: 'Claude' },
                      { type: 'gemini', label: 'Gemini' },
                      { type: 'groq', label: 'Groq' },
                      { type: 'ollama', label: 'Ollama' },
                      { type: 'openrouter', label: 'OpenRouter' },
                      { type: 'custom', label: 'Custom API' }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className="drafo-quick-preset-chip"
                      onClick={() => handleOpenAddForm(item.type)}
                    >
                      <ProviderLogo type={item.type} size={14} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Add / Edit Form Mode */
            <div className="drafo-provider-form-container">
              {/* Back breadcrumb */}
              <div className="drafo-form-nav-back">
                <button
                  type="button"
                  className="drafo-back-btn"
                  onClick={() => setViewMode('list')}
                >
                  <ArrowLeft size={14} />
                  <span>Back to configured providers</span>
                </button>
              </div>

              {/* Provider Platform Selection Grid with Authentic Logos */}
              <div className="drafo-form-group">
                <label className="drafo-field-label">Select AI Platform</label>
                <div className="drafo-provider-types-grid">
                  {(
                    [
                      { id: 'openai', label: 'OpenAI' },
                      { id: 'anthropic', label: 'Claude' },
                      { id: 'gemini', label: 'Gemini' },
                      { id: 'groq', label: 'Groq' },
                      { id: 'ollama', label: 'Ollama' },
                      { id: 'openrouter', label: 'OpenRouter' }
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`drafo-type-btn ${selectedType === t.id ? 'active' : ''}`}
                      onClick={() => handleSelectType(t.id)}
                    >
                      <div className="drafo-type-btn-icon">
                        <ProviderLogo type={t.id} size={20} />
                      </div>
                      <div className="drafo-type-btn-info">
                        <span className="type-label">{t.label}</span>
                      </div>
                      {selectedType === t.id && (
                        <div className="type-check-dot">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`drafo-type-btn drafo-type-custom-btn ${selectedType === 'custom' ? 'active' : ''}`}
                    onClick={() => handleSelectType('custom')}
                  >
                    <div className="drafo-type-btn-icon">
                      <ProviderLogo type="custom" size={20} />
                    </div>
                    <div className="drafo-type-btn-info">
                      <div className="drafo-custom-label-row">
                        <span className="type-label">Custom API</span>
                        <span className="drafo-custom-compat-tag">OpenAI Compatible</span>
                      </div>
                      <span className="type-subtext">Self-hosted endpoints, vLLM, LM Studio, LiteLLM, or reverse proxies</span>
                    </div>
                    {selectedType === 'custom' && (
                      <div className="type-check-dot">
                        <Check size={10} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div className="drafo-form-group">
                <label className="drafo-field-label">Display Name</label>
                <input
                  type="text"
                  className="drafo-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI (Production)"
                />
              </div>

              {/* API Key */}
              {selectedType !== 'ollama' ? (
                <div className="drafo-form-group">
                  <div className="drafo-field-label-row">
                    <label className="drafo-field-label">API Key</label>
                    {PROVIDER_PRESETS[selectedType].docUrl && (
                      <a
                        href={PROVIDER_PRESETS[selectedType].docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="drafo-help-link"
                      >
                        <span>Get {PROVIDER_PRESETS[selectedType].name} API Key</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="drafo-key-input-wrapper">
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="drafo-input key-input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onBlur={() => {
                        if (apiKey.trim() && availableModels.length === 0) {
                          handleFetchModels(selectedType, apiKey, baseUrl);
                        }
                      }}
                      placeholder={`Paste your ${PROVIDER_PRESETS[selectedType].name} API key`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="drafo-key-eye-btn"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="drafo-ollama-notice">
                  <Server size={14} />
                  <span>Ollama runs locally on your machine. Ensure Ollama is running at the Base URL below (CORS enabled).</span>
                </div>
              )}

              {/* Base URL */}
              <div className="drafo-form-group">
                <label className="drafo-field-label">API Base URL</label>
                <input
                  type="text"
                  className="drafo-input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              {/* Dynamic Models Section (Fetched from Provider API & shown in Dropdown) */}
              <div className="drafo-form-group">
                <div className="drafo-field-label-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="drafo-field-label">Model</label>
                    {availableModels.length > 0 && (
                      <span className="drafo-models-count-badge">
                        {availableModels.length} models found
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCustomModelInput ? (
                      <button
                        type="button"
                        className="drafo-model-toggle-mode-btn"
                        onClick={() => setIsCustomModelInput(false)}
                      >
                        ← Switch to Dropdown
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="drafo-model-refresh-btn"
                        onClick={() => handleFetchModels(selectedType, apiKey, baseUrl)}
                        disabled={isLoadingModels}
                        title="Fetch available models from provider API"
                      >
                        <RefreshCw size={11} className={isLoadingModels ? 'spin-icon' : ''} />
                        <span>{isLoadingModels ? 'Fetching...' : 'Fetch Models'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {isCustomModelInput ? (
                  <div className="drafo-custom-model-input-wrapper">
                    <input
                      type="text"
                      className="drafo-input custom-model-input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Enter custom model identifier"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="drafo-model-dropdown-wrapper" ref={modelDropdownRef}>
                    <button
                      type="button"
                      className={`drafo-model-select-btn ${isModelDropdownOpen ? 'open' : ''}`}
                      onClick={() => {
                        if (
                          !isModelDropdownOpen &&
                          availableModels.length === 0 &&
                          !isLoadingModels &&
                          (apiKey.trim() || selectedType === 'ollama')
                        ) {
                          handleFetchModels(selectedType, apiKey, baseUrl);
                        }
                        setIsModelDropdownOpen(!isModelDropdownOpen);
                      }}
                    >
                      <div className="drafo-model-selected-value">
                        <span className={`model-id-text ${!model ? 'is-placeholder' : ''}`}>
                          {model || (isLoadingModels ? 'Fetching models from API...' : 'Select a model from API...')}
                        </span>
                        {availableModels.find((m) => m.id === model)?.name &&
                          availableModels.find((m) => m.id === model)?.name !== model && (
                            <span className="model-display-sub">
                              ({availableModels.find((m) => m.id === model)?.name})
                            </span>
                          )}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`dropdown-chevron ${isModelDropdownOpen ? 'rotated' : ''}`}
                      />
                    </button>

                    {/* Popover Dropdown */}
                    {isModelDropdownOpen && (
                      <div className={`drafo-model-popover ${openUpward ? 'dropup' : ''}`}>
                        {/* Search Input inside Dropdown */}
                        <div className="drafo-model-search-box">
                          <Search size={13} className="search-icon" />
                          <input
                            type="text"
                            className="drafo-model-search-input"
                            placeholder="Search models..."
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            autoFocus
                          />
                          {modelSearch && (
                            <button
                              type="button"
                              className="clear-search-btn"
                              onClick={() => setModelSearch('')}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Loading State */}
                        {isLoadingModels && (
                          <div className="drafo-model-loading-state">
                            <Loader2 size={16} className="spin-icon" />
                            <span>Loading models from {PROVIDER_PRESETS[selectedType].name} API...</span>
                          </div>
                        )}

                        {/* Error Notice */}
                        {!isLoadingModels && modelFetchError && (
                          <div className="drafo-model-error-state">
                            <AlertCircle size={14} />
                            <span>{modelFetchError}</span>
                          </div>
                        )}

                        {/* Model Items */}
                        {!isLoadingModels && (
                          <div className="drafo-model-items-list">
                            {filteredModels.length > 0 ? (
                              filteredModels.map((m) => {
                                const isSelected = model === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className={`drafo-model-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                      setModel(m.id);
                                      setIsModelDropdownOpen(false);
                                      setModelSearch('');
                                    }}
                                  >
                                    <div className="model-item-text">
                                      <span className="model-item-id">{m.id}</span>
                                      {m.name && m.name !== m.id && (
                                        <span className="model-item-name">{m.name}</span>
                                      )}
                                    </div>
                                    {isSelected && <Check size={14} className="selected-check" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="drafo-model-empty-state">
                                {availableModels.length === 0
                                  ? 'No models loaded yet. Paste your API key above and click "Fetch Models".'
                                  : 'No models match your search.'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer manual override */}
                        <div className="drafo-model-popover-footer">
                          <button
                            type="button"
                            className="drafo-manual-model-btn"
                            onClick={() => {
                              setIsModelDropdownOpen(false);
                              setIsCustomModelInput(true);
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Type custom model identifier manually</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Test Connection Feedback Banner */}
              {testingStatus && (
                <div className={`drafo-test-banner ${testingStatus.success ? 'success' : 'error'}`}>
                  {testingStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{testingStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="drafo-providers-footer">
          <div className="drafo-security-note">
            <ShieldCheck size={14} className="security-icon" />
            <span>Credentials remain 100% in your browser's local storage and are never sent to external servers.</span>
          </div>

          {viewMode === 'list' ? (
            <button type="button" className="drafo-btn-done" onClick={onClose}>
              Done
            </button>
          ) : (
            <div className="drafo-form-footer-actions">
              <button
                type="button"
                className="drafo-btn-cancel"
                onClick={() => setViewMode('list')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="drafo-btn-secondary"
                onClick={handleTestConnection}
                disabled={testingStatus?.loading}
              >
                {testingStatus?.loading ? (
                  <>
                    <Loader2 size={13} className="spin-icon" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </button>
              <button
                type="button"
                className="drafo-btn-primary"
                onClick={handleSaveProvider}
                disabled={!name.trim()}
              >
                <Check size={14} />
                <span>Save & Set Active</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
