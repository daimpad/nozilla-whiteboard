/**
 * Markdown → HTML for the on-screen renderer.
 *
 * The exporters do *not* use this module; they typeset from the token stream
 * (`lexMarkdown`) so that SVG and PDF output is real vector text rather than a
 * screenshot. Both paths share the same CI type scale, so they agree.
 */
import DOMPurify from 'dompurify';
import { Marked, type Token, type TokensList } from 'marked';

const marked = new Marked({
  gfm: true,
  breaks: false,
});

/** Tokenise Markdown. Used by the SVG/PDF typesetter. */
export function lexMarkdown(source: string): TokensList {
  return marked.lexer(source ?? '');
}

/** Tokenise a single run of inline Markdown (bold / italic / code / links). */
export function lexInline(source: string): Token[] {
  const text = source ?? '';
  if (!text) return [];
  const first = marked.lexer(text)[0] as (Token & { tokens?: Token[] }) | undefined;
  if (first?.tokens?.length) return first.tokens;
  return [{ type: 'text', raw: text, text } as Token];
}

let purifier: typeof DOMPurify | null = null;

function getPurifier(): typeof DOMPurify | null {
  if (typeof window === 'undefined') return null;
  if (!purifier) {
    purifier = DOMPurify;
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  return purifier;
}

/**
 * Render Markdown to sanitised HTML. Sanitising matters even though the app is
 * local-only: decks are files that get passed around, and a `.md` should never
 * be able to run script just because someone opened it.
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source ?? '', { async: false }) as string;
  const dom = getPurifier();
  if (!dom) return html;
  return dom.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

/** Strip Markdown to plain text — used for thumbnails, titles and alt text. */
export function markdownToPlainText(source: string): string {
  return (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
