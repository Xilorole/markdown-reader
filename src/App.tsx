import { ContentArea } from '@/components/ContentArea/ContentArea';
import type { FootnotePaneHandle } from '@/components/FootnotePane/FootnotePane';
import { FootnotePane } from '@/components/FootnotePane/FootnotePane';
import { FootnoteTooltip } from '@/components/FootnoteTooltip/FootnoteTooltip';
import { Header } from '@/components/Header/Header';
import { SelectionMenu } from '@/components/SelectionMenu/SelectionMenu';
import { SettingsDialog } from '@/components/SettingsDialog/SettingsDialog';
import { useAiAnnotation } from '@/hooks/useAiAnnotation';
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTextSelection } from '@/hooks/useTextSelection';
import { useVisibleFootnotes } from '@/hooks/useVisibleFootnotes';
import { useWideMode } from '@/hooks/useWideMode';
import { sampleMarkdown } from '@/sample';
import { createAiProvider } from '@/services/ai-provider';
import { parseMarkdown } from '@/services/markdown-parser';
import type { AiProviderConfig } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  // ── AI Provider ──
  const [aiConfig, setAiConfig] = usePersistedState<AiProviderConfig>('ai-config', { type: 'anthropic' });
  const aiProvider = useMemo(() => createAiProvider(aiConfig), [aiConfig]);

  // ── Settings ──
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Parsed content ──
  const [html, setHtml] = useState('');
  const [plainText, setPlainText] = useState('');
  const footnotesRef = useRef<Map<string, string>>(new Map());

  // ── Sidebar ──
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const wideMode = useWideMode();
  const mobileMode = useMobileMode();

  // ── Refs ──
  const contentRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<FootnotePaneHandle>(null);

  // ── Footnote visibility ──
  const { visible: visibleIds, rebuild, observe, pin, unpin } =
    useVisibleFootnotes(contentRef);

  // ── Text selection ──
  const { selection, consumeRange } =
    useTextSelection(contentRef);

  // ── Tooltip ──
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; id: string; text: string;
  } | null>(null);

  // ── Sidebar highlight ──
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // ── AI Annotations (for pane rendering) ──
  const requestReposition = useCallback(() => {
    requestAnimationFrame(() => paneRef.current?.reposition());
  }, []);

  const addVisible = useCallback(
    (_id: string) => {
      requestReposition();
    },
    [requestReposition],
  );
  const removeVisible = useCallback(
    () => requestReposition(),
    [requestReposition],
  );

  const aiCallbacks = useMemo(
    () => ({ observe, pin, unpin, addVisible, removeVisible, requestReposition }),
    [observe, pin, unpin, addVisible, removeVisible, requestReposition],
  );

  const { annotations, addAnnotation, removeAnnotation, prefetch, reset: resetAi } =
    useAiAnnotation(aiProvider, plainText, footnotesRef, aiCallbacks);

  // ── Initialize content ──
  const initialize = useCallback(
    (md: string) => {
      const parsed = parseMarkdown(md);
      footnotesRef.current = parsed.footnotes;
      setHtml(parsed.html);
      setPlainText(parsed.plainText);
      resetAi();
    },
    [resetAi],
  );

  useEffect(() => {
    initialize(sampleMarkdown);
  }, [initialize]);

  // html変更後、DOMが更新されてからObserverを再構築
  useEffect(() => {
    if (html) rebuild();
  }, [html, rebuild]);

  // ── Attach footnote-ref events (delegation) ──
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleOver = (e: Event) => {
      const target = (e.target as HTMLElement).closest('.footnote-ref') as HTMLElement | null;
      if (!target) return;
      const id = target.dataset.footnote;
      if (!id) return;

      // Highlight pane
      setHighlightId(id);

      // Tooltip (when sidebar is closed)
      if (!sidebarVisible) {
        const text = footnotesRef.current.get(id) ?? '';
        if (!text) return;
        const rect = target.getBoundingClientRect();
        setTooltip({ x: rect.left, y: rect.bottom + 5, id, text });
      }
    };

    const handleOut = (e: Event) => {
      const target = (e.target as HTMLElement).closest('.footnote-ref');
      if (!target) return;
      setHighlightId(null);
      setTooltip(null);
    };

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest('.footnote-ref') as HTMLElement | null;
      if (!target) return;
      if (!sidebarVisible) setSidebarVisible(true);
    };

    el.addEventListener('mouseover', handleOver);
    el.addEventListener('mouseout', handleOut);
    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('mouseover', handleOver);
      el.removeEventListener('mouseout', handleOut);
      el.removeEventListener('click', handleClick);
    };
  }, [sidebarVisible]);

  // ── Pane position (wide mode) ──
  useEffect(() => {
    if (!sidebarVisible || mobileMode) return;
    const paneEl = document.querySelector<HTMLElement>('[data-visible="true"]');
    if (!paneEl) return;

    const apply = () => {
      if (wideMode && contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        paneEl.style.left = `${rect.right}px`;
        paneEl.style.right = 'auto';
      } else {
        paneEl.style.left = '';
        paneEl.style.right = '0';
      }
    };
    apply();

    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [sidebarVisible, wideMode, mobileMode]);

  // ── Narrow mode: push content ──
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (sidebarVisible && !wideMode && !mobileMode) {
      el.style.marginRight = 'var(--pane-width)';
      el.style.marginLeft = '0';
    } else {
      el.style.marginRight = '';
      el.style.marginLeft = '';
    }
  }, [sidebarVisible, wideMode, mobileMode]);

  // Hide tooltip on scroll
  useEffect(() => {
    const handler = () => setTooltip(null);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Selection menu click ──
  const handleAddAnnotation = useCallback(() => {
    if (!selection) return;
    const range = consumeRange();
    if (!range) return;

    if (!sidebarVisible) setSidebarVisible(true);

    addAnnotation(range, selection.text);
  }, [selection, consumeRange, sidebarVisible, addAnnotation]);

  // ── Selection menu hover (prefetch) ──
  const handlePrefetchStart = useCallback(() => {
    if (!selection) return;
    prefetch(selection.text);
  }, [selection, prefetch]);

  // ── Merge visible IDs with AI annotation IDs ──
  const mergedVisibleIds = useMemo(() => {
    const merged = new Set(visibleIds);
    for (const [id, a] of annotations) {
      if (a.loading) merged.add(id);
      // Completed AI annotations follow normal observer logic
    }
    return merged;
  }, [visibleIds, annotations]);

  return (
    <>
      <Header
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(true)}
        onCloseSidebar={() => setSidebarVisible(false)}
        onFileOpen={initialize}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main
        style={{ marginTop: 'var(--header-height)' }}
        data-mobile={mobileMode || undefined}
      >
        <ContentArea ref={contentRef} html={html} />

        {(sidebarVisible || !mobileMode) && (
          <FootnotePane
            ref={paneRef}
            visible={sidebarVisible}
            visibleIds={mergedVisibleIds}
            footnotes={footnotesRef.current}
            aiAnnotations={annotations}
            highlightId={highlightId}
            mobileMode={mobileMode}
            onRemoveAi={removeAnnotation}
            onClose={() => setSidebarVisible(false)}
            onHoverFootnote={(id) => {
              setHighlightId(id);
              document.querySelectorAll('.footnote-ref').forEach((el) =>
                el.classList.remove('highlight-source'),
              );
              if (id) {
                document.querySelectorAll(`.footnote-ref[data-footnote="${id}"]`).forEach((el) =>
                  el.classList.add('highlight-source'),
                );
              }
            }}
          />
        )}
      </main>

      <SelectionMenu
        x={selection?.menuX ?? 0}
        y={selection?.menuY ?? 0}
        visible={!!selection && aiConfig.type !== 'none'}
        onClick={handleAddAnnotation}
        onHoverStart={handlePrefetchStart}
      />

      <FootnoteTooltip
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        visible={!!tooltip && !sidebarVisible}
        id={tooltip?.id ?? ''}
        text={tooltip?.text ?? ''}
      />

      <SettingsDialog
        open={settingsOpen}
        config={aiConfig}
        onSave={setAiConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
