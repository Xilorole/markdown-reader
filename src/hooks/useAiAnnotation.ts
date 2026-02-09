import { useState, useCallback, useRef } from 'react';
import type { AiAnnotation } from '@/types';
import type { AiProvider } from '@/services/ai-provider';
import { getContext } from '@/services/markdown-parser';

/**
 * AI注釈の追加/削除/状態管理。
 * footnotes Mapの更新と、本文へのsup挿入を担う。
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

      // API呼び出し
      try {
        const ctx = getContext(plainText, selectedText);
        const res = await provider.complete({
          context: ctx.full,
          selectedText: ctx.selected,
        });

        footnotesRef.current.set(id, res.text);
        setAnnotations((prev) => {
          const next = new Map(prev);
          next.set(id, { ...annotation, text: res.text, loading: false });
          return next;
        });
      } catch {
        const errText = '注釈の取得に失敗しました';
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

  return { annotations, addAnnotation, removeAnnotation, reset } as const;
}
