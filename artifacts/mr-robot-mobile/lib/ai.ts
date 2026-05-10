import { Message, AIProvider, AppSettings, Skill } from '@/types';

interface RuntimeContext {
  skills?: Skill[];
}

/** Default timeout for API requests (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;
/** Maximum retries for transient failures */
const MAX_RETRIES = 2;
/** Retry delay in ms (doubles each attempt) */
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Determines if an HTTP status code is retryable (transient server errors).
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Creates an AbortSignal that fires after the specified timeout.
 */
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Sends a message to the configured AI provider with streaming support.
 */
export async function sendMessage(
  messages: Message[],
  provider: AIProvider,
  settings: AppSettings,
  onChunk?: (chunk: string) => void,
  runtimeContext: RuntimeContext = {}
): Promise<string> {
  const apiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(settings, runtimeContext.skills ?? []);

  if (provider.type === 'anthropic') {
    return sendAnthropicMessage(apiMessages, systemPrompt, provider, settings, onChunk);
  } else if (provider.type === 'gemini') {
    return sendGeminiMessage(apiMessages, systemPrompt, provider, settings, onChunk);
  } else {
    // Both 'openai-compatible' and 'openrouter' use the OpenAI chat completions format
    return sendOpenAICompatibleMessage(apiMessages, systemPrompt, provider, settings, onChunk);
  }
}

/**
 * Pings the provider to verify the API key and connectivity.
 */
export async function pingProvider(provider: AIProvider): Promise<{ ok: boolean; error?: string }> {
  try {
    const signal = createTimeoutSignal(15_000);

    if (provider.type === 'openrouter') {
      // OpenRouter: test with models endpoint
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'HTTP-Referer': 'https://mrrobot.mobile',
          'X-Title': 'Mr. Robot AI',
        },
        signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
      }
      return { ok: true };
    } else if (provider.type === 'openai-compatible') {
      const res = await fetch(`${provider.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${provider.apiKey}` },
        signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
      }
      return { ok: true };
    } else if (provider.type === 'anthropic') {
      const res = await fetch(
        `${provider.baseUrl || 'https://api.anthropic.com'}/v1/models`,
        {
          method: 'GET',
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
      }
      return { ok: true };
    } else if (provider.type === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`,
        { signal }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
      }
      return { ok: true };
    }
    return { ok: false, error: 'Unknown provider type' };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out' };
    }
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, error: msg };
  }
}

function buildSystemPrompt(settings: AppSettings, skills: Skill[] = []): string {
  const name = settings.agentName || 'Mr. Robot';
  const style = settings.responseStyle || 'balanced';
  const styleGuide = style === 'concise'
    ? 'Be extremely concise. Short, direct answers only.'
    : style === 'detailed'
    ? 'Be thorough and comprehensive in your explanations.'
    : 'Balance brevity with clarity.';

  const activeSkills = skills.filter(skill => skill.active).slice(0, 6);
  const skillBlock = activeSkills.length
    ? `\n\nActive Hermes-style skills you may use when relevant:\n${activeSkills
        .map(skill => `- ${skill.title} v${skill.version}: ${skill.summary}\n  Instructions: ${skill.instructions}`)
        .join('\n')}`
    : '';

  return `You are ${name}, an advanced AI operating system. You are highly capable, direct, and precise. ${styleGuide}

You have deep knowledge of systems, security, programming, and technology. You speak with authority and clarity. Avoid unnecessary pleasantries.${skillBlock}`;
}

/**
 * Builds the appropriate headers for OpenAI-compatible and OpenRouter requests.
 */
function buildOpenAIHeaders(provider: AIProvider): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`,
  };

  // OpenRouter requires additional headers for proper attribution and rate limiting
  if (provider.type === 'openrouter') {
    headers['HTTP-Referer'] = 'https://mrrobot.mobile';
    headers['X-Title'] = 'Mr. Robot AI';
  }

  return headers;
}

/**
 * Gets the effective base URL for a provider.
 */
function getBaseUrl(provider: AIProvider): string {
  if (provider.type === 'openrouter') {
    return provider.baseUrl || 'https://openrouter.ai/api/v1';
  }
  return provider.baseUrl || DEFAULT_BASE_URLS[provider.type] || 'https://api.openai.com/v1';
}

async function sendOpenAICompatibleMessage(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  provider: AIProvider,
  settings: AppSettings,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const shouldStream = settings.streamingEnabled && !!onChunk;
  const baseUrl = getBaseUrl(provider);
  const defaultModel = provider.type === 'openrouter'
    ? 'openai/gpt-4o-mini'
    : 'gpt-4o-mini';

  const body = {
    model: provider.selectedModel || defaultModel,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: shouldStream,
  };

  const headers = buildOpenAIHeaders(provider);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const signal = createTimeoutSignal(shouldStream ? REQUEST_TIMEOUT_MS * 3 : REQUEST_TIMEOUT_MS);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);

        // Parse OpenRouter-specific error format
        let errorMessage = `API error ${response.status}: ${errText}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) {
            errorMessage = `${errJson.error.message} (${response.status})`;
          }
        } catch {
          // Use raw error text
        }

        if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
          lastError = new Error(errorMessage);
          await delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        throw new Error(errorMessage);
      }

      if (shouldStream && onChunk) {
        return readOpenAIStream(response, onChunk);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        await delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

async function sendAnthropicMessage(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  provider: AIProvider,
  settings: AppSettings,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const shouldStream = settings.streamingEnabled && !!onChunk;
  const body = {
    model: provider.selectedModel || 'claude-3-5-sonnet-latest',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    stream: shouldStream,
  };

  const signal = createTimeoutSignal(shouldStream ? REQUEST_TIMEOUT_MS * 3 : REQUEST_TIMEOUT_MS);

  const response = await fetch(`${provider.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    let errorMessage = `Anthropic error ${response.status}: ${err}`;
    try {
      const errJson = JSON.parse(err);
      if (errJson.error?.message) {
        errorMessage = `${errJson.error.message} (${response.status})`;
      }
    } catch {
      // Use raw error text
    }
    throw new Error(errorMessage);
  }

  if (shouldStream && onChunk) {
    return readAnthropicStream(response, onChunk);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function sendGeminiMessage(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  provider: AIProvider,
  settings: AppSettings,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const model = provider.selectedModel || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiMessages,
    generationConfig: { maxOutputTokens: 2048 },
  };

  const signal = createTimeoutSignal(REQUEST_TIMEOUT_MS);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    let errorMessage = `Gemini error ${response.status}: ${err}`;
    try {
      const errJson = JSON.parse(err);
      if (errJson.error?.message) {
        errorMessage = `${errJson.error.message} (${response.status})`;
      }
    } catch {
      // Use raw error text
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (onChunk) onChunk(text);
  return text;
}

async function readOpenAIStream(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append to buffer to handle chunks split across reads
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      if (data !== '[DONE]') {
        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

async function readAnthropicStream(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        try {
          const json = JSON.parse(data);
          if (json.type === 'content_block_delta') {
            const chunk = json.delta?.text ?? '';
            if (chunk) {
              fullText += chunk;
              onChunk(chunk);
            }
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Checks if an error is a transient network error worth retrying.
 */
function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const DEFAULT_MODELS: Record<string, string[]> = {
  'openrouter': [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-70b-instruct',
    'mistralai/mistral-large',
    'deepseek/deepseek-chat',
  ],
  'openai-compatible': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
};

export const DEFAULT_BASE_URLS: Record<string, string> = {
  'openrouter': 'https://openrouter.ai/api/v1',
  'openai-compatible': 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: '',
};
