/** 脚注データ */
export interface Footnote {
  id: string;
  text: string;
}

/** AI注釈 */
export interface AiAnnotation {
  id: string;
  selectedText: string;
  text: string;
  loading: boolean;
}

/** AIプロバイダーの種別 */
export type AiProviderType = 'anthropic' | 'aoai' | 'none';

/** AIプロバイダー設定 */
export interface AiProviderConfig {
  type: AiProviderType;
  /** Anthropic: 不要（プロキシ経由）, AOAI: Azure OpenAI endpoint */
  endpoint?: string;
  /** AOAI: API key */
  apiKey?: string;
  /** AOAI: deployment name */
  deploymentName?: string;
}

/** AI補完リクエスト */
export interface AiCompletionRequest {
  context: string;
  selectedText: string;
}

/** AI補完レスポンス */
export interface AiCompletionResponse {
  text: string;
}

/** サイドバーの状態 */
export interface SidebarState {
  visible: boolean;
  wideMode: boolean;
}

/** パースされたMarkdownの結果 */
export interface ParsedMarkdown {
  html: string;
  footnotes: Map<string, string>;
  plainText: string;
}
