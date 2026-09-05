'use client';

import React from 'react';
import { OpenAI, Claude, Gemini, Groq, Ollama, OpenRouter } from '@lobehub/icons';
import { AIProviderType } from '../../types/aiProvider';

interface ProviderLogoProps {
  type: AIProviderType | string;
  size?: number;
  className?: string;
}

/**
 * Official vector brand logos for all supported AI providers using @lobehub/icons.
 */
export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  type,
  size = 20,
  className = ''
}) => {
  const s = size;

  switch (type) {
    case 'openai':
      return (
        <OpenAI
          size={s}
          className={`drafo-provider-brand-icon openai ${className}`}
          style={{ color: '#10A37F', flexShrink: 0 }}
        />
      );

    case 'anthropic':
      return (
        <Claude.Color
          size={s}
          className={`drafo-provider-brand-icon claude ${className}`}
          style={{ flexShrink: 0 }}
        />
      );

    case 'gemini':
      return (
        <Gemini.Color
          size={s}
          className={`drafo-provider-brand-icon gemini ${className}`}
          style={{ flexShrink: 0 }}
        />
      );

    case 'groq':
      return (
        <Groq
          size={s}
          className={`drafo-provider-brand-icon groq ${className}`}
          style={{ color: '#F55036', flexShrink: 0 }}
        />
      );

    case 'ollama':
      return (
        <Ollama
          size={s}
          className={`drafo-provider-brand-icon ollama ${className}`}
          style={{ color: '#0F172A', flexShrink: 0 }}
        />
      );

    case 'openrouter':
      return (
        <OpenRouter
          size={s}
          className={`drafo-provider-brand-icon openrouter ${className}`}
          style={{ color: '#6366F1', flexShrink: 0 }}
        />
      );

    case 'builtin':
      return (
        <img
          src="/icon.png"
          alt="Drafo"
          width={s}
          height={s}
          className={`drafo-provider-brand-img ${className}`}
          style={{ width: `${s}px`, height: `${s}px`, objectFit: 'contain', flexShrink: 0, borderRadius: '4px' }}
        />
      );

    case 'custom':
    default:
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`drafo-provider-brand-icon custom ${className}`}
          style={{ color: '#64748B', flexShrink: 0 }}
        >
          <rect x="2" y="3" width="20" height="7" rx="2" />
          <rect x="2" y="14" width="20" height="7" rx="2" />
          <line x1="6" y1="6.5" x2="6.01" y2="6.5" />
          <line x1="6" y1="17.5" x2="6.01" y2="17.5" />
        </svg>
      );
  }
};

