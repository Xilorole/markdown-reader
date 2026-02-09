import type { AiProvider } from '@/services/ai-provider';
import {
  addChunk,
  completeCache,
  createCache,
  getCache,
  getCacheKey,
  hasValidCache,
  setCacheError,
  subscribe,
} from '@/services/annotation-cache';
import { getContext } from '@/services/markdown-parser';
import type { AiAnnotation } from '@/types';
import { useCallback, useRef, useState } from 'react';

/**
 * AI注釈の追加/削除/状態管理。
 * footnotes Mapの更新と、本文へのsup挿入を担う。
 * プリフェッチ対応：キャッシュがあればそれを使用
 */
export function useAiAnnotation(
  provider: AiProvider | null,
  plainText: string,
  footnotesRef: React.MutableRefObject<Map<string, string>>,
  callbacks: {
    observe: (el: Element) => void;
    pin: (id: string) => void;
    unpin: (id: string) => void;
    addVisible: (id: string) => void;
    removeVisible: (id: string) => void;
    requestReposition: () => void;
  },
) {
  const [annotations, setAnnotations] = useState<Map<string, AiAnnotation>>(new Map());
  const counterRef = useRef(0);

  /**
   * プリフェッチ開始（ホバー時に呼ばれる）
   */
  const prefetch = useCallback(
    (selectedText: string) => {
      if (!provider || provider.type === 'none') return;

      const cacheKey = getCacheKey(selectedText);
      if (hasValidCache(cacheKey)) return; // 既にキャッシュあり

      const entry = createCache(cacheKey);
      const ctx = getContext(plainText, selectedText);

      provider
        .complete(
          {
            context: ctx.full,
            selectedText: ctx.selected,
            onStream: (chunk) => {
              addChunk(cacheKey, chunk);
            },
          },
          entry.abortController?.signal,
        )
        .then(() => {
          completeCache(cacheKey);
        })
        .catch((e) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          setCacheError(cacheKey, e instanceof Error ? e.message : '注釈の取得に失敗しました');
        });
    },
    [provider, plainText],
  );

  const addAnnotation = useCallback(
    async (range: Range, selectedText: string) => {
      if (!provider || provider.type === 'none') return;

      counterRef.current++;
      const id = `ai-${counterRef.current}`;

      // sup要素を作成して本文に挿入
      const sup = document.createElement('sup');
      sup.className = 'footnote-ref footnote-ref--ai';
      sup.dataset.footnote = id;
      sup.dataset.ai = 'true';
      sup.textContent = '[*]';

      range.collapse(false);
      range.insertNode(sup);
      window.getSelection()?.removeAllRanges();

      // 状態登録
      const annotation: AiAnnotation = {
        id,
        selectedText,
        text: '',
        loading: true,
      };
      setAnnotations((prev) => new Map(prev).set(id, annotation));
      footnotesRef.current.set(id, '');

      callbacks.pin(id);
      callbacks.observe(sup);
      callbacks.addVisible(id);

      // スクロール補正
      requestAnimationFrame(() => {
        sup.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        callbacks.requestReposition();
      });

      const cacheKey = getCacheKey(selectedText);
      const cachedEntry = getCache(cacheKey);

      // キャッシュがあればそれを使用
      if (cachedEntry) {
        const unsubscribe = subscribe(
          cacheKey,
          (chunk) => {
            footnotesRef.current.set(id, chunk);
            setAnnotations((prev) => {
              const next = new Map(prev);
              next.set(id, { ...annotation, text: chunk, loading: true });
              return next;
            });
            callbacks.requestReposition();
          },
          (fullText) => {
            footnotesRef.current.set(id, fullText);
            setAnnotations((prev) => {
              const next = new Map(prev);
              next.set(id, { ...annotation, text: fullText, loading: false });
              return next;
            });
            callbacks.unpin(id);
            callbacks.requestReposition();
          },
          (error) => {
            footnotesRef.current.set(id, error);
            setAnnotations((prev) => {
              const next = new Map(prev);
              next.set(id, { ...annotation, text: error, loading: false });
              return next;
            });
            callbacks.unpin(id);
            callbacks.requestReposition();
          },
        );

        // クリーンアップ用に保持（必要に応じて）
        return () => unsubscribe();
      }

      // キャッシュがない場合は新規リクエスト
      try {
        const ctx = getContext(plainText, selectedText);
        const entry = createCache(cacheKey);
        let streamingText = '';

        const res = await provider.complete(
          {
            context: ctx.full,
            selectedText: ctx.selected,
            onStream: (chunk) => {
              streamingText += chunk;
              addChunk(cacheKey, chunk);
              footnotesRef.current.set(id, streamingText);
              setAnnotations((prev) => {
                const next = new Map(prev);
                next.set(id, { ...annotation, text: streamingText, loading: true });
                return next;
              });
              callbacks.requestReposition();
            },
          },
          entry.abortController?.signal,
        );

        completeCache(cacheKey);
        footnotesRef.current.set(id, res.text);
        setAnnotations((prev) => {
          const next = new Map(prev);
          next.set(id, { ...annotation, text: res.text, loading: false });
          return next;
        });
      } catch (e) {
        const errText = e instanceof Error ? e.message : '注釈の取得に失敗しました';
        setCacheError(cacheKey, errText);
        footnotesRef.current.set(id, errText);
        setAnnotations((prev) => {
          const next = new Map(prev);
          next.set(id, { ...annotation, text: errText, loading: false });
          return next;
        });
      } finally {
        callbacks.unpin(id);
        callbacks.requestReposition();
      }
    },
    [provider, plainText, footnotesRef, callbacks],
  );

  const removeAnnotation = useCallback(
    (id: string) => {
      // 本文からsupを除去
      const sup = document.querySelector(`.footnote-ref[data-footnote="${id}"]`);
      sup?.remove();

      footnotesRef.current.delete(id);
      setAnnotations((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      callbacks.removeVisible(id);
      callbacks.unpin(id);
      callbacks.requestReposition();
    },
    [footnotesRef, callbacks],
  );

  const reset = useCallback(() => {
    setAnnotations(new Map());
    counterRef.current = 0;
  }, []);

  return { annotations, addAnnotation, removeAnnotation, prefetch, reset } as const;
}
