import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * IntersectionObserverで本文中の .footnote-ref を監視し、
 * 画面に見えている脚注IDのSetを返す。
 */
export function useVisibleFootnotes(contentRef: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  /** AI注釈など、ローディング中は除去しない */
  const pinnedRef = useRef<Set<string>>(new Set());

  const pin = useCallback((id: string) => {
    pinnedRef.current.add(id);
  }, []);

  const unpin = useCallback((id: string) => {
    pinnedRef.current.delete(id);
  }, []);

  /** 新しく追加されたsup要素をobserverに登録 */
  const observe = useCallback((el: Element) => {
    observerRef.current?.observe(el);
  }, []);

  /** observer再構築（initialize時） */
  const rebuild = useCallback(() => {
    observerRef.current?.disconnect();

    const obs = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          let changed = false;

          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.footnote;
            if (!id) continue;

            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              if (!next.has(id)) { next.add(id); changed = true; }
            } else if (entry.intersectionRatio === 0) {
              if (next.has(id) && !pinnedRef.current.has(id)) {
                next.delete(id);
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      },
      { threshold: [0, 0.5, 1] },
    );

    observerRef.current = obs;
    contentRef.current
      ?.querySelectorAll('.footnote-ref')
      .forEach((el) => obs.observe(el));
  }, [contentRef]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { visible, rebuild, observe, pin, unpin } as const;
}
