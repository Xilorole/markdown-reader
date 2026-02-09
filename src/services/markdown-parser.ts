import type { ParsedMarkdown } from '@/types';
import { marked } from 'marked';

/**
 * 脚注定義を分離してからmarked.jsでレンダリングする。
 * [^N] を <sup> に変換するカスタム拡張を追加。
 */
export function parseMarkdown(source: string): ParsedMarkdown {
  const lines = source.split('\n');
  const mainLines: string[] = [];
  const footnotes = new Map<string, string>();
  let inFootnoteSection = false;

  for (const line of lines) {
    if (/^##?\s*脚注/.test(line.trim())) {
      inFootnoteSection = true;
      continue;
    }
    if (inFootnoteSection) {
      const m = line.match(/^\[\^(\d+)\]:\s*(.+)$/);
      if (m) footnotes.set(m[1], m[2]);
    } else {
      mainLines.push(line);
    }
  }

  const content = mainLines.join('\n');

  // プレーンテキスト（コンテキスト取得用）
  const plainText = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[\^(\d+)\]/g, '')
    .replace(/^---$/gm, '');

  // [^N] → <sup> に置換してからmarkedに渡す
  const preprocessed = content.replace(
    /\[\^(\d+)\]/g,
    '<sup class="footnote-ref" data-footnote="$1">[$1]</sup>',
  );

  const html = marked.parse(preprocessed, { async: false }) as string;

  return { html, footnotes, plainText };
}

/**
 * 選択テキストの前後200文字を取得する。
 */
export function getContext(
  plainText: string,
  selectedText: string,
): { full: string; selected: string } {
  const idx = plainText.indexOf(selectedText);
  if (idx === -1) return { full: selectedText, selected: selectedText };

  const start = Math.max(0, idx - 200);
  const end = Math.min(plainText.length, idx + selectedText.length + 200);
  return {
    full: plainText.substring(start, end),
    selected: selectedText,
  };
}
