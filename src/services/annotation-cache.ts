/**
 * AI注釈のグローバルキャッシュ
 * 同じ選択テキストに対する重複リクエストを防止
 */

export type CacheStatus = 'fetching' | 'streaming' | 'complete' | 'error';

export interface CacheEntry {
    status: CacheStatus;
    chunks: string[];        // ストリーミング中のチャンクバッファ
    fullText: string;        // 完了時の全文
    error?: string;          // エラーメッセージ
    abortController?: AbortController;
    listeners: Set<(chunk: string) => void>;  // ストリーミング購読者
}

// グローバルキャッシュ（選択テキストをキーに）
const cache = new Map<string, CacheEntry>();

/**
 * キャッシュキーを生成（選択テキストのみ使用）
 */
export function getCacheKey(selectedText: string): string {
    return selectedText.trim();
}

/**
 * キャッシュエントリを取得
 */
export function getCache(key: string): CacheEntry | undefined {
    return cache.get(key);
}

/**
 * キャッシュが存在し、有効な状態か
 */
export function hasValidCache(key: string): boolean {
    const entry = cache.get(key);
    if (!entry) return false;
    return entry.status === 'complete' || entry.status === 'streaming' || entry.status === 'fetching';
}

/**
 * 新しいキャッシュエントリを作成（フェッチ開始時）
 */
export function createCache(key: string): CacheEntry {
    const entry: CacheEntry = {
        status: 'fetching',
        chunks: [],
        fullText: '',
        abortController: new AbortController(),
        listeners: new Set(),
    };
    cache.set(key, entry);
    return entry;
}

/**
 * ストリーミングチャンクを追加
 */
export function addChunk(key: string, chunk: string): void {
    const entry = cache.get(key);
    if (!entry) return;

    entry.status = 'streaming';
    entry.chunks.push(chunk);
    entry.fullText += chunk;

    // 全リスナーに通知
    entry.listeners.forEach(listener => listener(chunk));
}

/**
 * ストリーミング完了
 */
export function completeCache(key: string): void {
    const entry = cache.get(key);
    if (!entry) return;

    entry.status = 'complete';
    entry.abortController = undefined;
}

/**
 * エラー設定
 */
export function setCacheError(key: string, error: string): void {
    const entry = cache.get(key);
    if (!entry) return;

    entry.status = 'error';
    entry.error = error;
    entry.abortController = undefined;
}

/**
 * リスナー登録（ストリーミング購読）
 * 既に受信済みのチャンクも即座に通知
 */
export function subscribe(
    key: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void,
): () => void {
    const entry = cache.get(key);
    if (!entry) {
        onError('キャッシュが見つかりません');
        return () => { };
    }

    // 既に完了している場合は即座に全文を返す
    if (entry.status === 'complete') {
        onChunk(entry.fullText);
        onComplete(entry.fullText);
        return () => { };
    }

    // エラーの場合
    if (entry.status === 'error') {
        onError(entry.error || '不明なエラー');
        return () => { };
    }

    // 既に受信済みのチャンクを通知
    if (entry.chunks.length > 0) {
        onChunk(entry.chunks.join(''));
    }

    // リスナー登録
    const listener = (chunk: string) => {
        onChunk(chunk);
    };
    entry.listeners.add(listener);

    // 完了/エラー監視
    const checkComplete = () => {
        const current = cache.get(key);
        if (!current) return;

        if (current.status === 'complete') {
            onComplete(current.fullText);
            entry.listeners.delete(listener);
        } else if (current.status === 'error') {
            onError(current.error || '不明なエラー');
            entry.listeners.delete(listener);
        }
    };

    // ポーリングで完了チェック（シンプルな実装）
    const intervalId = setInterval(checkComplete, 50);

    // クリーンアップ
    return () => {
        entry.listeners.delete(listener);
        clearInterval(intervalId);
    };
}

/**
 * 進行中のリクエストをキャンセル
 */
export function cancelFetch(key: string): void {
    const entry = cache.get(key);
    if (entry?.abortController) {
        entry.abortController.abort();
        cache.delete(key);
    }
}

/**
 * キャッシュをクリア
 */
export function clearCache(): void {
    cache.forEach((entry) => {
        entry.abortController?.abort();
    });
    cache.clear();
}
