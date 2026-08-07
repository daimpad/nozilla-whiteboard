/**
 * Markdown → HTML for the on-screen renderer.
 *
 * The exporters do *not* use this module; they typeset from the token stream
 * (`lexMarkdown`) so that SVG and PDF output is real vector text rather than a
 * screenshot. Both paths share the same CI type scale, so they agree.
 */
import DOMPurify from 'dompurify';
import { Marked, type Token, type TokensList } from 'marked';

/**
 * Der grüne Marker ist das Signature-Element der nozilla-CI: ein bis drei
 * Schlüsselwörter pro Absatz auf Signal-Grün. In Markdown schreibt man ihn
 * `==so==`; im HTML wird daraus `<mark class="g">`, im Satz eine grüne Fläche
 * hinter dem Wort.
 *
 * Bewusst eine eigene Erweiterung statt roher HTML-Tags: so kennt der
 * Typesetter den Marker als Token und kann ihn in SVG und PDF genauso zeichnen
 * wie auf dem Bildschirm.
 */
const markExtension = {
  name: 'mark',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('==');
  },
  tokenizer(this: { lexer: { inlineTokens: (src: string) => Token[] } }, src: string) {
    const match = /^==(?!\s)([\s\S]+?)(?<!\s)==/.exec(src);
    if (!match) return undefined;
    return {
      type: 'mark',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    };
  },
  renderer(this: { parser: { parseInline: (tokens: Token[]) => string } }, token: Token) {
    const withTokens = token as Token & { tokens?: Token[]; text?: string };
    const inner = withTokens.tokens
      ? this.parser.parseInline(withTokens.tokens)
      : (withTokens.text ?? '');
    return `<mark class="g">${inner}</mark>`;
  },
};

const marked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [markExtension as never],
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
    ADD_ATTR: ['target', 'rel', 'class'],
  });
}

/** Strip Markdown to plain text — used for thumbnails, titles and alt text. */
export function markdownToPlainText(source: string): string {
  return (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
