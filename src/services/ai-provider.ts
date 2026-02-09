import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderConfig,
  AiProviderType,
} from '@/types';

const SYSTEM_PROMPT = `あなたは文学作品の注釈を作成する専門家です。
選択された部分について、簡潔で分かりやすい注釈を作成してください。
注釈は100文字以内で、用語の意味、歴史的背景、文脈上の重要性などを説明してください。`;

function buildUserPrompt(req: AiCompletionRequest): string {
  return `【文脈（前後400文字）】\n${req.context}\n\n【選択された部分】\n${req.selectedText}\n\n注釈を作成してください（100文字以内）：`;
}

async function callAnthropic(req: AiCompletionRequest): Promise<AiCompletionResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(req)}` }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');

  if (!text) throw new Error('Anthropic API: 空のレスポンス');
  return { text };
}

async function callAoai(
  config: AiProviderConfig,
  req: AiCompletionRequest,
  signal?: AbortSignal,
): Promise<AiCompletionResponse> {
  if (!config.endpoint || !config.apiKey || !config.deploymentName) {
    throw new Error('Azure OpenAI の設定が不完全です');
  }

  const base = config.endpoint.replace(/\/+$/, '');
  const url = `${base}/openai/deployments/${config.deploymentName}/chat/completions?api-version=2024-10-21`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(req) },
      ],
      max_completion_tokens: 1000,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure OpenAI error ${res.status}: ${body.slice(0, 200)}`);
  }

  if (!res.body) {
    throw new Error('Azure OpenAI: レスポンスボディがありません');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line === 'data: [DONE]') continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(line.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            req.onStream?.(delta);
          }
        } catch (e) {
          // JSON parse error - skip this chunk
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullText) throw new Error('Azure OpenAI: 空のレスポンス');
  return { text: fullText };
}

export function createAiProvider(config: AiProviderConfig) {
  return {
    get type(): AiProviderType {
      return config.type;
    },
    get config(): AiProviderConfig {
      return config;
    },
    async complete(req: AiCompletionRequest, signal?: AbortSignal): Promise<AiCompletionResponse> {
      switch (config.type) {
        case 'anthropic':
          return callAnthropic(req);
        case 'aoai':
          return callAoai(config, req, signal);
        case 'none':
          throw new Error('AIプロバイダーが設定されていません');
      }
    },
  };
}

export type AiProvider = ReturnType<typeof createAiProvider>;
