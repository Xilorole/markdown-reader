import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type { AiAnnotation } from '@/types';
import { ShimmerPlaceholder } from '@/components/ShimmerPlaceholder/ShimmerPlaceholder';
import { PaneDivider } from '@/components/PaneDivider/PaneDivider';
import { IconClose } from '@/components/icons';
import styles from './FootnotePane.module.css';

export interface FootnotePaneHandle {
  reposition: () => void;
}

interface FootnotePaneProps {
  visible: boolean;
  visibleIds: Set<string>;
  footnotes: Map<string, string>;
  aiAnnotations: Map<string, AiAnnotation>;
  highlightId: string | null;
  onRemoveAi: (id: string) => void;
  onHoverFootnote: (id: string | null) => void;
  onClose: () => void;
}

export const FootnotePane = forwardRef<FootnotePaneHandle, FootnotePaneProps>(
  function FootnotePane(
    { visible, visibleIds, footnotes, aiAnnotations, highlightId, onRemoveAi, onHoverFootnote, onClose },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<HTMLDivElement>(null);

    const reposition = useCallback(() => {
      const container = containerRef.current;
      if (!visible || !container) return;

      const items = container.querySelectorAll<HTMLDivElement>(`.${styles.footnoteItem}`);
      if (items.length === 0) return;

      const containerRect = container.getBoundingClientRect();

      const positioned: { el: HTMLDivElement; idealY: number }[] = [];

      items.forEach((el) => {
        const id = el.dataset.footnote;
        if (!id) return;
        const refEl = document.querySelector<HTMLElement>(`.footnote-ref[data-footnote="${id}"]`);
        if (!refEl) return;
        const refRect = refEl.getBoundingClientRect();
        const numEl = el.querySelector<HTMLElement>(`.${styles.footnoteNum}`);
        const numOffset = numEl ? numEl.offsetTop : 0;
        positioned.push({ el, idealY: refRect.top - containerRect.top - numOffset });
      });

      positioned.sort((a, b) => a.idealY - b.idealY);

      const gap = 4;
      let prevBottom = 0;

      for (const item of positioned) {
        const h = item.el.offsetHeight || 36;
        const top = Math.max(item.idealY, prevBottom);
        item.el.style.top = `${top}px`;
        prevBottom = top + h + gap;
      }

      container.style.height = `${prevBottom}px`;
    }, [visible]);

    useImperativeHandle(ref, () => ({ reposition }), [reposition]);

    // スクロールとリサイズで再配置
    useEffect(() => {
      if (!visible) return;
      let raf = 0;
      const handler = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(reposition);
      };
      window.addEventListener('scroll', handler);
      window.addEventListener('resize', handler);
      reposition();
      return () => {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
        cancelAnimationFrame(raf);
      };
    }, [visible, reposition, visibleIds]);

    const ids = Array.from(visibleIds);

    return (
      <div
        ref={paneRef}
        className={styles.pane}
        data-visible={visible}
      >
        <PaneDivider visible={visible} onClick={onClose} />
        <div ref={containerRef} className={styles.container}>
          {ids.length === 0 && (
            <div className={styles.placeholder}>
              本文をスクロールすると<br />該当する注釈が表示されます
            </div>
          )}
          {ids.map((id) => {
            const ai = aiAnnotations.get(id);
            const isAi = !!ai;
            const isLoading = ai?.loading ?? false;
            const text = footnotes.get(id) ?? '';

            return (
              <div
                key={id}
                className={styles.footnoteItem}
                data-footnote={id}
                data-ai={isAi || undefined}
                data-highlight={id === highlightId || undefined}
                onMouseEnter={() => onHoverFootnote(id)}
                onMouseLeave={() => onHoverFootnote(null)}
              >
                <div className={styles.footnoteNum}>
                  [{isAi ? '*' : id}]
                  {isAi && !isLoading && (
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); onRemoveAi(id); }}
                      aria-label="注釈を削除"
                    >
                      <IconClose size={10} />
                    </button>
                  )}
                </div>
                <div className={styles.footnoteText}>
                  {isLoading ? <ShimmerPlaceholder /> : text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
