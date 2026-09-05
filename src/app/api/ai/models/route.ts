import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, apiKey, baseUrl } = body;

    if (!type || type === 'builtin') {
      return NextResponse.json({
        success: true,
        models: [
          { id: 'drafo-wasm-v1', name: 'Drafo Built-in Engine' }
        ]
      });
    }

    // 1. OpenAI
    if (type === 'openai') {
      const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/models`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `OpenAI returned HTTP ${res.status}: ${err.slice(0, 150)}` }, { status: res.status });
      }
      const data = await res.json();
      const rawList: { id: string }[] = data.data || [];
      const models = rawList
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => {
          const aChat = a.id.startsWith('gpt-4o') || a.id.startsWith('o3') || a.id.startsWith('o1') || a.id.startsWith('gpt-4');
          const bChat = b.id.startsWith('gpt-4o') || b.id.startsWith('o3') || b.id.startsWith('o1') || b.id.startsWith('gpt-4');
          if (aChat && !bChat) return -1;
          if (!aChat && bChat) return 1;
          return a.id.localeCompare(b.id);
        });
      return NextResponse.json({ success: true, models });
    }

    // 2. Anthropic Claude
    if (type === 'anthropic') {
      const url = `${(baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/models`;
      try {
        const res = await fetch(url, {
          headers: {
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01'
          }
        });
        if (res.ok) {
          const data = await res.json();
          const rawList: { id: string; display_name?: string }[] = data.data || [];
          if (rawList.length > 0) {
            const models = rawList.map((m) => ({ id: m.id, name: m.display_name ? `${m.display_name} (${m.id})` : m.id }));
            return NextResponse.json({ success: true, models });
          }
        }
      } catch {
        // fallback to standard models
      }
      // Anthropic current active models fallback
      return NextResponse.json({
        success: true,
        models: [
          { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
        ]
      });
    }

    // 3. Google Gemini
    if (type === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey || ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Gemini returned HTTP ${res.status}: ${err.slice(0, 150)}` }, { status: res.status });
      }
      const data = await res.json();
      const rawList: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] = data.models || [];
      const models = rawList
        .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => {
          const cleanId = m.name.replace(/^models\//, '');
          return { id: cleanId, name: m.displayName ? `${m.displayName} (${cleanId})` : cleanId };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      return NextResponse.json({ success: true, models });
    }

    // 4. Groq
    if (type === 'groq') {
      const url = `${(baseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '')}/models`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey || ''}`
        }
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Groq returned HTTP ${res.status}: ${err.slice(0, 150)}` }, { status: res.status });
      }
      const data = await res.json();
      const rawList: { id: string; active?: boolean }[] = data.data || [];
      const models = rawList
        .filter((m) => m.active !== false)
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return NextResponse.json({ success: true, models });
    }

    // 5. OpenRouter
    if (type === 'openrouter') {
      const url = `${(baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/models`;
      const res = await fetch(url, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `OpenRouter returned HTTP ${res.status}: ${err.slice(0, 150)}` }, { status: res.status });
      }
      const data = await res.json();
      const rawList: { id: string; name?: string }[] = data.data || [];
      const models = rawList.map((m) => ({ id: m.id, name: m.name ? `${m.name} (${m.id})` : m.id }));
      return NextResponse.json({ success: true, models });
    }

    // 6. Ollama
    if (type === 'ollama') {
      const base = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
      try {
        const res = await fetch(`${base}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          const rawList: { name: string }[] = data.models || [];
          const models = rawList.map((m) => ({ id: m.name, name: m.name }));
          return NextResponse.json({ success: true, models });
        }
      } catch {
        // ignore
      }
      try {
        const res = await fetch(`${base}/v1/models`);
        if (res.ok) {
          const data = await res.json();
          const rawList: { id: string }[] = data.data || [];
          const models = rawList.map((m) => ({ id: m.id, name: m.id }));
          return NextResponse.json({ success: true, models });
        }
      } catch {
        // ignore
      }
      return NextResponse.json({ success: false, error: `Could not reach Ollama at ${base}. Ensure Ollama is running.` });
    }

    // 7. Custom API (OpenAI compatible)
    if (type === 'custom') {
      if (!baseUrl) {
        return NextResponse.json({ success: false, error: 'Base URL is required to fetch models for Custom API' });
      }
      const url = `${baseUrl.replace(/\/$/, '')}/models`;
      const res = await fetch(url, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ success: false, error: `Custom API returned HTTP ${res.status}: ${err.slice(0, 150)}` }, { status: res.status });
      }
      const data = await res.json();
      const rawList: { id: string }[] = Array.isArray(data) ? data : data.data || [];
      const models = rawList.map((m) => ({ id: m.id, name: m.id }));
      return NextResponse.json({ success: true, models });
    }

    return NextResponse.json({ success: true, models: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error while fetching models' }, { status: 500 });
  }
}
