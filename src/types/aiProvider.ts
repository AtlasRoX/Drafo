export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'ollama'
  | 'openrouter'
  | 'custom'
  | 'builtin';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isActive?: boolean;
  createdAt: string;
}

export interface ProviderPreset {
  type: AIProviderType;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  docUrl: string;
}

export const PROVIDER_PRESETS: Record<AIProviderType, ProviderPreset> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    suggestedModels: [],
    docUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    type: 'anthropic',
    name: 'Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet-20250219',
    suggestedModels: [],
    docUrl: 'https://console.anthropic.com/settings/keys'
  },
  gemini: {
    type: 'gemini',
    name: 'Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    suggestedModels: [],
    docUrl: 'https://aistudio.google.com/app/apikey'
  },
  groq: {
    type: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: [],
    docUrl: 'https://console.groq.com/keys'
  },
  ollama: {
    type: 'ollama',
    name: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    suggestedModels: [],
    docUrl: 'https://ollama.com/'
  },
  openrouter: {
    type: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    suggestedModels: [],
    docUrl: 'https://openrouter.ai/keys'
  },
  custom: {
    type: 'custom',
    name: 'Custom API',
    defaultBaseUrl: 'https://api.example.com/v1',
    defaultModel: 'custom-model',
    suggestedModels: [],
    docUrl: ''
  },
  builtin: {
    type: 'builtin',
    name: 'Drafo Built-in Engine',
    defaultBaseUrl: '',
    defaultModel: 'drafo-wasm-v1',
    suggestedModels: [],
    docUrl: ''
  }
};
