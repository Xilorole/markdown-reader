import type {
  AiProviderConfig,
  AiProviderType,
  AiCompletionRequest,
  AiCompletionResponse,
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
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
  return { text };
}

async function callAoai(
  config: AiProviderConfig,
  req: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  if (!config.endpoint || !config.apiKey || !config.deploymentName) {
    throw new Error('Azure OpenAI の設定が不完全です');
  }
  const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=2024-06-01`;
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
      max_tokens: 1000,
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return { text };
}

export function createAiProvider(config: AiProviderConfig) {
  return {
    get type(): AiProviderType {
      return config.type;
    },
    async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
      switch (config.type) {
        case 'anthropic':
          return callAnthropic(req);
        case 'aoai':
          return callAoai(config, req);
        case 'none':
          throw new Error('AIプロバイダーが設定されていません');
      }
    },
  };
}

export type AiProvider = ReturnType<typeof createAiProvider>;
