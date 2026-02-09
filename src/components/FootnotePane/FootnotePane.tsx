import { PaneDivider } from '@/components/PaneDivider/PaneDivider';
import { ShimmerPlaceholder } from '@/components/ShimmerPlaceholder/ShimmerPlaceholder';
import { IconClose } from '@/components/icons';
import type { AiAnnotation } from '@/types';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
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
  mobileMode: boolean;
  onRemoveAi: (id: string) => void;
  onHoverFootnote: (id: string | null) => void;
  onClose: () => void;
}

export const FootnotePane = forwardRef<FootnotePaneHandle, FootnotePaneProps>(
  function FootnotePane(
    { visible, visibleIds, footnotes, aiAnnotations, highlightId, mobileMode, onRemoveAi, onHoverFootnote, onClose },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<HTMLDivElement>(null);

    const reposition = useCallback(() => {
      const container = containerRef.current;
      if (!visible || !container) return;

      const items = container.querySelectorAll<HTMLDivElement>(`.${styles.footnoteItem}`);

      // モバイル時は絶対配置をスキップ（順次表示）
      if (mobileMode) {
        container.style.height = '';
        // モバイル時は絶対配置のスタイルをクリア
        items.forEach((el) => {
          el.style.top = '';
        });
        return;
      }

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
    }, [visible, mobileMode]);

    useImperativeHandle(ref, () => ({ reposition }), [reposition]);

    // スクロールとリサイズで再配置（デスクトップのみ）
    useEffect(() => {
      if (!visible) return;
      let raf = 0;
      const handler = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(reposition);
      };
      // モバイル時はスクロールハンドラーを無効化（順次表示なので不要）
      if (!mobileMode) {
        window.addEventListener('scroll', handler);
      }
      window.addEventListener('resize', handler);
      reposition();
      return () => {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
        cancelAnimationFrame(raf);
      };
    }, [visible, reposition, visibleIds, mobileMode]);

    // モバイル時は番号順にソート、デスクトップ時はそのまま
    const ids = Array.from(visibleIds).sort((a, b) => {
      if (!mobileMode) return 0; // デスクトップは位置で配置されるのでソート不要

      // AI注釈（*で始まる）は後ろに
      const aIsAi = aiAnnotations.has(a);
      const bIsAi = aiAnnotations.has(b);
      if (aIsAi && !bIsAi) return 1;
      if (!aIsAi && bIsAi) return -1;

      // 両方が通常の注釈の場合、番号順にソート
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      return a.localeCompare(b);
    });

    return (
      <div
        ref={paneRef}
        className={styles.pane}
        data-visible={visible}
        data-mobile={mobileMode || undefined}
      >
        <PaneDivider visible={visible} mobileMode={mobileMode} onClick={onClose} />
        {mobileMode && (
          <button className={styles.mobileCloseBtn} onClick={onClose} aria-label="注釈を閉じる">
            <IconClose size={16} />
          </button>
        )}
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
                  {isLoading && !text ? <ShimmerPlaceholder /> : text}
                  {isLoading && text && <span className={styles.streamingCursor}>▋</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
