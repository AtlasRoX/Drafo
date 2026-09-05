import { AIProviderConfig, AIProviderType, PROVIDER_PRESETS } from '../types/aiProvider';

const PROVIDERS_STORAGE_KEY = 'drafo_ai_providers_list';
const ACTIVE_PROVIDER_STORAGE_KEY = 'drafo_ai_active_provider_id';

export const BUILTIN_PROVIDER: AIProviderConfig = {
  id: 'provider-builtin',
  name: 'Drafo Built-in (Local WASM)',
  type: 'builtin',
  apiKey: '',
  baseUrl: '',
  model: 'drafo-wasm-v1',
  isActive: true,
  createdAt: new Date().toISOString()
};

export function loadProviders(): AIProviderConfig[] {
  if (typeof window === 'undefined') return [BUILTIN_PROVIDER];
  try {
    const raw = localStorage.getItem(PROVIDERS_STORAGE_KEY);
    if (!raw) return [BUILTIN_PROVIDER];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [BUILTIN_PROVIDER];
    }
    return parsed;
  } catch {
    return [BUILTIN_PROVIDER];
  }
}

export function saveProviders(providers: AIProviderConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
  } catch (err) {
    console.error('Failed to save AI providers:', err);
  }
}

export function getActiveProvider(): AIProviderConfig {
  const providers = loadProviders();
  const activeId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROVIDER_STORAGE_KEY) : null;
  const match = providers.find((p) => p.id === activeId && p.isActive) || providers.find((p) => p.isActive);
  return match || providers[0] || BUILTIN_PROVIDER;
}

export function setActiveProviderId(providerId: string): AIProviderConfig {
  const providers = loadProviders();
  const updated = providers.map((p) => ({
    ...p,
    isActive: p.id === providerId
  }));
  saveProviders(updated);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_PROVIDER_STORAGE_KEY, providerId);
  }
  return updated.find((p) => p.id === providerId) || BUILTIN_PROVIDER;
}

export async function testProviderConnection(
  config: Partial<AIProviderConfig>
): Promise<{ success: boolean; message: string }> {
  if (!config.type || config.type === 'builtin') {
    return { success: true, message: 'Drafo Built-in Engine is active and ready.' };
  }

  const preset = PROVIDER_PRESETS[config.type];
  const baseUrl = (config.baseUrl || preset.defaultBaseUrl).replace(/\/$/, '');
  const apiKey = config.apiKey || '';
  const model = config.model || preset.defaultModel;

  try {
    // 1. OpenAI, Groq, Ollama, OpenRouter, Custom (OpenAI compatible format)
    if (['openai', 'groq', 'ollama', 'openrouter', 'custom'].includes(config.type)) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        return { success: true, message: `Connected to ${preset.name} (${model}) successfully!` };
      } else {
        const errorBody = await response.text();
        return { success: false, message: `HTTP ${response.status}: ${errorBody.slice(0, 150)}` };
      }
    }

    // 2. Anthropic Claude
    if (config.type === 'anthropic') {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        return { success: true, message: `Connected to Anthropic (${model}) successfully!` };
      } else {
        const errorBody = await response.text();
        return { success: false, message: `HTTP ${response.status}: ${errorBody.slice(0, 150)}` };
      }
    }

    // 3. Google Gemini
    if (config.type === 'gemini') {
      const endpoint = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }]
        })
      });

      if (response.ok) {
        return { success: true, message: `Connected to Google Gemini (${model}) successfully!` };
      } else {
        const errorBody = await response.text();
        return { success: false, message: `HTTP ${response.status}: ${errorBody.slice(0, 150)}` };
      }
    }

    return { success: true, message: 'Provider configuration verified.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error or CORS restriction.' };
  }
}

export interface AvailableModelItem {
  id: string;
  name: string;
}

/**
 * Fetches all models available on the provider using their API.
 */
export async function fetchProviderModels(config: {
  type: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
}): Promise<{ success: boolean; models: AvailableModelItem[]; error?: string }> {
  if (!config.type || config.type === 'builtin') {
    return {
      success: true,
      models: [{ id: 'drafo-wasm-v1', name: 'Drafo Built-in Engine' }]
    };
  }

  // 1. Call Next.js server route to bypass CORS
  try {
    const res = await fetch('/api/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: config.type,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        return { success: true, models: data.models };
      }
      if (data.error) {
        return { success: false, models: [], error: data.error };
      }
    }
  } catch {
    // Network error on server route, fallback to client fetch
  }

  // 2. Client-side fallback for Ollama
  if (config.type === 'ollama') {
    const base = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
        return { success: true, models };
      }
    } catch {
      // ignore
    }
  }

  return { success: false, models: [], error: 'Unable to fetch models from provider API.' };
}
