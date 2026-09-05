/**
 * Markdown → HTML, für das, was auf dem Bildschirm steht.
 *
 * Die Ausgabewege benutzen dieses Modul *nicht*: sie setzen aus dem Tokenstrom
 * (`lexMarkdown`), damit im SVG und im PDF echter Vektortext steht und kein
 * Bildschirmfoto. Beide Wege lesen dieselbe Typo-Leiter der CI und stimmen
 * deshalb überein.
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

/** Markdown in Token zerlegen — so liest der Setzer für SVG und PDF. */
export function lexMarkdown(source: string): TokensList {
  return marked.lexer(source ?? '');
}

/** Ein Stück Text mit Auszeichnungen zerlegen: fett, kursiv, Code, Verweise. */
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
 * Markdown zu gereinigtem HTML. Das Reinigen zählt auch bei einem Werkzeug,
 * das nur lokal läuft: Decks sind Dateien, die herumgereicht werden, und eine
 * `.md` darf nichts ausführen dürfen, bloß weil jemand sie geöffnet hat.
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

/** Markdown auf reinen Text bringen — für Kacheln, Titel, Alternativtext. */
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
