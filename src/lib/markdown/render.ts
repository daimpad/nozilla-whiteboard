/**
 * Markdown lesen — als Token, nicht als HTML.
 *
 * Der Kopf dieser Datei stand lange auf „Markdown → HTML, für das, was auf dem
 * Bildschirm steht", und darunter stand, die Ausgabewege benutzten das Modul
 * *nicht*. Beides zusammen beschrieb etwas, das es nicht mehr gab: die Fläche
 * zeichnet über dieselbe Zeichenstrecke wie der SVG-Export, es gibt kein HTML
 * mehr, das jemand einsetzt.
 *
 * Übrig ist damit genau das, was zwei Kunden wirklich rufen: `lexMarkdown()`
 * für den Setzer und `lexInline()` für den PPTX-Weg. Was daneben stand —
 * `renderMarkdown()` samt seiner Reinigung und `markdownToPlainText()` —
 * hatte keinen einzigen Aufrufer; was das gekostet hat, steht in
 * `vite.config.ts` beim Alias auf `dompurify`.
 */
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
