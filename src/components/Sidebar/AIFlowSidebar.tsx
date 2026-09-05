'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MoreVertical,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Wand2,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ArrowUp,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  FolderPlus,
  PlusCircle,
  RefreshCw,
  Check,
  Cpu,
  Layers,
  Send,
  Zap,
  Bot,
  Brain,
  SquarePen
} from 'lucide-react';
import { FlowProject } from '../../types/flow';
import {
  generateFlowFromPrompt,
  insertFlowIntoCanvas
} from '../../utils/aiGenerator';
import { DrafoLogo } from '../../assets/DrafoLogo';
import { AIProvidersModal } from '../Modals/AIProvidersModal';
import {
  loadProviders,
  getActiveProvider,
  setActiveProviderId,
  BUILTIN_PROVIDER
} from '../../utils/aiProviderService';
import { AIProviderConfig } from '../../types/aiProvider';
import { ProviderLogo } from '../Common/ProviderLogo';
import './AIFlowSidebar.css';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  generatedProject?: FlowProject;
  appliedMode?: 'append' | 'replace' | 'new';
  thinking?: string;
  analysis?: string;
}

interface AIFlowSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'inspector' | 'ai';
  onTabChange?: (tab: 'inspector' | 'ai') => void;
  currentProject: FlowProject;
  onFlowGenerated: (project: FlowProject) => void;
  onInsertFlow: (project: FlowProject) => void;
  onReplaceFlow: (project: FlowProject) => void;
}

const CHAT_STORAGE_KEY = 'drafo_gemini_chat_history';

export const AIFlowSidebar: React.FC<AIFlowSidebarProps> = ({
  isOpen,
  onClose,
  activeTab = 'ai',
  onTabChange,
  currentProject,
  onFlowGenerated,
  onInsertFlow,
  onReplaceFlow
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState('');
  const [isWide, setIsWide] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProviderConfig>(BUILTIN_PROVIDER);
  const [selectedStyle] = useState<'auto' | 'vibrant' | 'emerald' | 'cyber' | 'minimal'>('auto');
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleThought = (msgId: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === undefined ? false : !prev[msgId]
    }));
  };

  // Load chat history & active provider on mount
  useEffect(() => {
    try {
      setActiveProvider(getActiveProvider());
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save chat history
  const persistMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
    } catch {
      // ignore
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Focus input on mount/open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Dynamically auto-expand textarea height as user enters multi-line queries
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, 28), 180);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [inputText]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, userMsg];
    persistMessages(updated);
    setInputText('');
    setIsGenerating(true);

    const isBengali = /[\u0980-\u09FF]/.test(text);

    // Multi-stage progressive feedback: Think -> Analyze -> Make
    setGeneratingStep(isBengali ? '🧠 কী তৈরি করতে হবে তা চিন্তা করছি...' : '🧠 Thinking what to make...');

    const timer1 = setTimeout(() => {
      setGeneratingStep(isBengali ? '🔍 আর্কিটেকচার ও ডাটা ফ্লো অ্যানালাইসিস করছি...' : '🔍 Analyzing architecture & data flows...');
    }, 700);

    const timer2 = setTimeout(() => {
      setGeneratingStep(isBengali ? '🛠️ ডায়াগ্রাম নোড এবং কানেক্টর তৈরি করছি...' : '🛠️ Synthesizing diagram nodes & connectors...');
    }, 1400);

    try {
      const activeProv = getActiveProvider();
      const currentGraphPayload = currentProject.nodes.length > 0 ? {
        nodes: currentProject.nodes.map((n) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          subtitle: n.subtitle,
          x: n.x,
          y: n.y
        })),
        edges: currentProject.edges.map((e) => ({
          id: e.id,
          from: e.fromNodeId,
          to: e.toNodeId,
          label: e.label
        }))
      } : undefined;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          currentGraph: currentGraphPayload,
          provider: {
            type: activeProv.type,
            apiKey: activeProv.apiKey,
            baseUrl: activeProv.baseUrl,
            model: activeProv.model,
            name: activeProv.name,
          },
          themeStyle: selectedStyle
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      let generatedProject: FlowProject;
      let thinking = '';
      let analysis = '';
      let summary = '';
      let isDelta = false;

      if (response.ok) {
        const data = await response.json();
        if (data.project && Array.isArray(data.project.nodes) && data.project.nodes.length > 0) {
          generatedProject = data.project;
          thinking = data.thinking || '';
          analysis = data.analysis || '';
          summary = data.summary || '';
          isDelta = Boolean(data.isDelta);
        } else {
          generatedProject = generateFlowFromPrompt(text, { themeStyle: selectedStyle });
        }
      } else {
        generatedProject = generateFlowFromPrompt(text, { themeStyle: selectedStyle });
      }

      // Automatically apply to canvas:
      // If delta mutation: atomic commit replacing canvas with preserved & mutated state
      // If canvas was empty: initialize new project
      // Otherwise: append
      let appliedMode: 'append' | 'replace' | 'new' = 'append';
      if (currentProject.nodes.length === 0) {
        appliedMode = 'new';
        onFlowGenerated(generatedProject);
      } else if (isDelta) {
        appliedMode = 'replace';
        onReplaceFlow(generatedProject);
      } else {
        appliedMode = 'append';
        onInsertFlow(generatedProject);
      }

      const prov = getActiveProvider();
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: summary || (isBengali
          ? `আমি ${prov.name}-এর মাধ্যমে আপনার বর্ণনানুযায়ী "${generatedProject.name}" আর্কিটেকচার তৈরি করে ক্যানভাসে যুক্ত করেছি।`
          : `I've synthesized the "${generatedProject.name}" architecture flow using ${prov.name} and inserted it onto your canvas. You can inspect, adjust, or replace below:`),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        generatedProject,
        appliedMode,
        thinking,
        analysis
      };

      persistMessages([...updated, assistantMsg]);
    } catch (err) {
      console.error('AI Generation error:', err);
      clearTimeout(timer1);
      clearTimeout(timer2);
      const fallbackProject = generateFlowFromPrompt(text, { themeStyle: selectedStyle });
      if (currentProject.nodes.length === 0) {
        onFlowGenerated(fallbackProject);
      } else {
        onInsertFlow(fallbackProject);
      }
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `Synthesized "${fallbackProject.name}" architecture and inserted onto your canvas.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        generatedProject: fallbackProject,
        appliedMode: currentProject.nodes.length === 0 ? 'new' : 'append'
      };
      persistMessages([...updated, assistantMsg]);
    } finally {
      setIsGenerating(false);
      setGeneratingStep('');
    }
  };

  const handleApplyMode = (msgId: string, project: FlowProject, mode: 'append' | 'replace' | 'new') => {
    if (mode === 'append') {
      onInsertFlow(project);
    } else if (mode === 'replace') {
      onReplaceFlow(project);
    } else {
      onFlowGenerated(project);
    }

    const updated = messages.map((m) =>
      m.id === msgId ? { ...m, appliedMode: mode } : m
    );
    persistMessages(updated);
  };

  const handleStartNewChat = () => {
    persistMessages([]);
    setInputText('');
    setIsGenerating(false);
    setGeneratingStep('');
    setShowOptionsMenu(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleClearChat = () => {
    handleStartNewChat();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <aside className={`drafo-gemini-sidepane ${isWide ? 'wide' : ''}`}>
      {/* Top Header Bar */}
      <div className="drafo-gemini-header">
        <div className="drafo-gemini-header-left">
          <DrafoLogo size={20} showWordmark={true} />
          <span className="drafo-gemini-ai-badge">AI</span>
        </div>

        <div className="drafo-gemini-header-actions">
          {/* New Chat Button */}
          <button
            type="button"
            className="drafo-gemini-new-chat-btn"
            onClick={handleStartNewChat}
            title="Start New Chat"
          >
            <SquarePen size={13} />
            <span>New Chat</span>
          </button>

          {/* Options Menu Button (Three Dots) */}
          <div className="drafo-gemini-dropdown-wrapper">
            <button
              type="button"
              className="drafo-gemini-icon-btn"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              title="More options"
            >
              <MoreVertical size={16} />
            </button>

            {showOptionsMenu && (
              <div className="drafo-gemini-menu-popover">
                <button
                  type="button"
                  className="drafo-gemini-menu-item"
                  onClick={handleStartNewChat}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SquarePen size={14} style={{ color: '#2563EB' }} />
                    <span style={{ fontWeight: 600 }}>Start New Chat</span>
                  </div>
                </button>
                <div className="drafo-gemini-menu-divider" />
                <button
                  type="button"
                  className="drafo-gemini-menu-item"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowProvidersModal(true);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={14} style={{ color: '#2563EB' }} />
                    <span style={{ fontWeight: 600 }}>AI Providers</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748B', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>Add Custom</span>
                </button>
                <div className="drafo-gemini-menu-divider" />
                {onTabChange && (
                  <button
                    type="button"
                    className="drafo-gemini-menu-item"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onTabChange('inspector');
                    }}
                  >
                    <span>Switch to Properties Inspector</span>
                  </button>
                )}
                <button
                  type="button"
                  className="drafo-gemini-menu-item"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setInputText('বাংলায় ইউজার লগইন এবং ওটিপি ভেরিফিকেশন ফ্লো আর্কিটেকচার তৈরি করো');
                    textareaRef.current?.focus();
                  }}
                >
                  <span>বাংলা মোড (Bengali Prompts)</span>
                </button>
                <div className="drafo-gemini-menu-divider" />
                <button
                  type="button"
                  className="drafo-gemini-menu-item danger"
                  onClick={handleClearChat}
                >
                  <span>Clear Conversation</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle Wide/Dock Window Button */}
          <button
            type="button"
            className="drafo-gemini-icon-btn"
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Standard view' : 'Expand view'}
          >
            {isWide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            className="drafo-gemini-icon-btn close-btn"
            onClick={onClose}
            title="Close AI pane"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat Messages Feed Area */}
      <div className="drafo-gemini-chat-area">
        {messages.length === 0 ? (
          /* Clean Empty State */
          <div className="drafo-gemini-empty-state">
            <div className="drafo-gemini-greeting-group">
              <h1 className="drafo-gemini-hello">Design with AI</h1>
              <h2 className="drafo-gemini-sub">What would you like to build?</h2>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="drafo-gemini-pills-list">
              <button
                type="button"
                className="drafo-gemini-pill"
                onClick={() =>
                  handleSendMessage(
                    'User login with OAuth2, Redis rate limiter, JWT session manager, and PostgreSQL replica'
                  )
                }
              >
                <Sparkles size={14} className="drafo-pill-icon" />
                <span>User Authentication & JWT Flow</span>
              </button>

              <button
                type="button"
                className="drafo-gemini-pill"
                onClick={() =>
                  handleSendMessage(
                    'E-commerce checkout with Stripe payment intent, webhook verification, order queue, and confirmation email'
                  )
                }
              >
                <Lightbulb size={14} className="drafo-pill-icon" />
                <span>E-Commerce Checkout & Webhooks</span>
              </button>

              <button
                type="button"
                className="drafo-gemini-pill"
                onClick={() =>
                  handleSendMessage(
                    'Microservices architecture with API Gateway, Apache Kafka event bus, Order Service, and Notification Worker'
                  )
                }
              >
                <Layers size={14} className="drafo-pill-icon" />
                <span>Microservices with Kafka Event Mesh</span>
              </button>

              <button
                type="button"
                className="drafo-gemini-pill"
                onClick={() =>
                  handleSendMessage(
                    'Next.js 16 architecture with React Server Components, Server Actions, Edge Middleware, and Prisma DB'
                  )
                }
              >
                <Zap size={14} className="drafo-pill-icon" />
                <span>Next.js 16 Fullstack App Router</span>
              </button>

              <button
                type="button"
                className="drafo-gemini-pill"
                onClick={() =>
                  handleSendMessage(
                    'AI Agent RAG pipeline with Vector Database, Semantic Search, Context Ingestion, and LLM Streaming response'
                  )
                }
              >
                <Bot size={14} className="drafo-pill-icon" />
                <span>AI Agent RAG Pipeline & Vector DB</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Feed */
          <div className="drafo-gemini-messages-feed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`drafo-gemini-message-row ${msg.sender === 'user' ? 'user' : 'assistant'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="drafo-gemini-avatar">
                    <img src="/icon.png" alt="Drafo AI" className="drafo-gemini-avatar-img" />
                  </div>
                )}

                <div className="drafo-gemini-message-body">
                  <div className="drafo-gemini-bubble">
                    <p className="drafo-gemini-bubble-text">{msg.text}</p>
                  </div>

                  {/* Interactive Thought & Architecture Analysis Card */}
                  {(msg.thinking || msg.analysis) && (
                    <div className="drafo-thought-card">
                      <button
                        type="button"
                        className="drafo-thought-header-btn"
                        onClick={() => toggleThought(msg.id)}
                        title={expandedThoughts[msg.id] !== false ? 'Collapse analysis' : 'Expand analysis'}
                      >
                        <div className="drafo-thought-header-title">
                          <Brain size={14} className="drafo-thought-brain-icon" />
                          <span className="drafo-thought-label">Thought & Architecture Analysis</span>
                          <span className="drafo-thought-badge">Think ➔ Analyze ➔ Make</span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`drafo-thought-chevron ${expandedThoughts[msg.id] !== false ? 'expanded' : ''}`}
                        />
                      </button>

                      {expandedThoughts[msg.id] !== false && (
                        <div className="drafo-thought-body">
                          {msg.thinking && (
                            <div className="drafo-thought-section">
                              <div className="drafo-thought-sec-title">
                                <span className="drafo-step-num">1</span>
                                <span>What to Make (Planning & Components)</span>
                              </div>
                              <div className="drafo-thought-text">{msg.thinking}</div>
                            </div>
                          )}

                          {msg.analysis && (
                            <div className="drafo-thought-section">
                              <div className="drafo-thought-sec-title">
                                <span className="drafo-step-num sec-analysis">2</span>
                                <span>Architecture Analysis (Protocols, Security & Scale)</span>
                              </div>
                              <div className="drafo-thought-text">{msg.analysis}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Architecture Diagram Interactive Action Card */}
                  {msg.generatedProject && (
                    <div className="drafo-gemini-diagram-card">
                      <div className="drafo-gemini-diagram-header">
                        <div className="drafo-gemini-diagram-title-group">
                          <span className="drafo-gemini-diagram-badge">Architecture Flow</span>
                          <h4 className="drafo-gemini-diagram-title">{msg.generatedProject.name}</h4>
                        </div>
                        <div className="drafo-gemini-diagram-stats">
                          <span>{msg.generatedProject.nodes.length} nodes</span>
                          <span>•</span>
                          <span>{msg.generatedProject.edges.length} edges</span>
                        </div>
                      </div>

                      <div className="drafo-gemini-diagram-actions">
                        <button
                          type="button"
                          className={`drafo-gemini-action-btn ${msg.appliedMode === 'append' ? 'active' : ''}`}
                          onClick={() => handleApplyMode(msg.id, msg.generatedProject!, 'append')}
                          title="Append nodes to current canvas"
                        >
                          <PlusCircle size={13} />
                          <span>{msg.appliedMode === 'append' ? 'Inserted to Canvas' : 'Insert to Canvas'}</span>
                        </button>
                        <button
                          type="button"
                          className={`drafo-gemini-action-btn ${msg.appliedMode === 'replace' ? 'active' : ''}`}
                          onClick={() => handleApplyMode(msg.id, msg.generatedProject!, 'replace')}
                          title="Replace canvas diagram"
                        >
                          <RefreshCw size={13} />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          className={`drafo-gemini-action-btn ${msg.appliedMode === 'new' ? 'active' : ''}`}
                          onClick={() => handleApplyMode(msg.id, msg.generatedProject!, 'new')}
                          title="Open as fresh diagram"
                        >
                          <FolderPlus size={13} />
                          <span>New Diagram</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <span className="drafo-gemini-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {/* In-Flight Thinking Indicator */}
            {isGenerating && (
              <div className="drafo-gemini-message-row assistant thinking">
                <div className="drafo-gemini-avatar pulsing">
                  <img src="/icon.png" alt="Drafo AI" className="drafo-gemini-avatar-img" />
                </div>
                <div className="drafo-gemini-bubble thinking-bubble">
                  <div className="drafo-gemini-typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="drafo-gemini-thinking-text">{generatingStep}</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Box (Styled EXACTLY like Image 2!) */}
      <div className="drafo-gemini-bottom-wrapper">
        <div className="drafo-gemini-input-card">
          <textarea
            ref={textareaRef}
            className="drafo-gemini-textarea"
            placeholder="Describe any system architecture, API flow, or workflow..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isGenerating}
          />

          <div className="drafo-gemini-input-bottom-bar">
            {/* AI Provider & Model Selector */}
            <div className="drafo-gemini-dropdown-wrapper">
              <button
                type="button"
                className="drafo-gemini-model-badge"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                title={`Active AI Provider: ${activeProvider.name} (${activeProvider.model})`}
              >
                <ProviderLogo type={activeProvider.type} size={14} />
                <span className="provider-name-text">{activeProvider.name}</span>
                <ChevronDown size={12} style={{ flexShrink: 0 }} />
              </button>

              {showModelDropdown && (
                <div className="drafo-gemini-menu-popover model-menu">
                  <div className="drafo-gemini-popover-header">Active AI Provider</div>
                  {loadProviders().map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`drafo-gemini-menu-item ${activeProvider.id === p.id ? 'active' : ''}`}
                      onClick={() => {
                        const updated = setActiveProviderId(p.id);
                        setActiveProvider(updated);
                        setShowModelDropdown(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                        <ProviderLogo type={p.type} size={16} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <div className="model-name">{p.name}</div>
                          <div className="model-desc">{p.model}</div>
                        </div>
                      </div>
                      {activeProvider.id === p.id && <Check size={13} style={{ color: '#2563EB' }} />}
                    </button>
                  ))}
                  <div className="drafo-gemini-menu-divider" />
                  <button
                    type="button"
                    className="drafo-gemini-menu-item"
                    style={{ color: '#2563EB', fontWeight: 600 }}
                    onClick={() => {
                      setShowModelDropdown(false);
                      setShowProvidersModal(true);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={13} />
                      <span>Add / Manage AI Providers...</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Clean Send Action Button (Arrow only, no voice options) */}
            <button
              type="button"
              className={`drafo-gemini-send-btn ${inputText.trim() ? 'has-text' : ''}`}
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputText.trim()}
              title="Send / Synthesize architecture"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Providers Modal */}
      <AIProvidersModal
        isOpen={showProvidersModal}
        onClose={() => {
          setShowProvidersModal(false);
          setActiveProvider(getActiveProvider());
        }}
        onActiveProviderChange={(p) => setActiveProvider(p)}
      />
    </aside>
  );
};
