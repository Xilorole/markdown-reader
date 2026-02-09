import { useState, useCallback, useRef, useEffect } from 'react';

export interface SelectionInfo {
  text: string;
  /** 選択末尾行の右端座標 */
  menuX: number;
  menuY: number;
}

/**
 * 本文内のテキスト選択を追跡し、保存済みRangeを提供する。
 */
export function useTextSelection(contentRef: React.RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const rangeRef = useRef<Range | null>(null);

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (text && text.length > 0 && contentRef.current?.contains(e.target as Node)) {
        const range = sel!.getRangeAt(0).cloneRange();
        rangeRef.current = range;

        const rects = range.getClientRects();
        const last = rects[rects.length - 1];
        if (!last) return;

        let x = last.right + 4;
        if (x + 30 > window.innerWidth) x = last.left - 30;
        const y = last.top + last.height / 2 - 12;

        setSelection({ text, menuX: x, menuY: y });
      } else {
        setSelection(null);
        rangeRef.current = null;
      }
    },
    [contentRef],
  );

  const consumeRange = useCallback((): Range | null => {
    const r = rangeRef.current?.cloneRange() ?? null;
    rangeRef.current = null;
    setSelection(null);
    return r;
  }, []);

  const dismiss = useCallback(() => {
    setSelection(null);
    rangeRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // スクロールで非表示
  useEffect(() => {
    const handler = () => dismiss();
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [dismiss]);

  return { selection, consumeRange, dismiss } as const;
}
