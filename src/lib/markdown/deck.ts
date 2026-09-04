/**
 * Deck ⇄ Markdown.
 *
 * File shape:
 *
 *   ---                       ← deck frontmatter (YAML), optional
 *   title: Quarterly Review
 *   author: Nozilla
 *   ---
 *
 *   <!-- nzl                  ← per-slide metadata (YAML), optional
 *   layout: title
 *   transition: rise
 *   elements:
 *     - id: badge-1
 *       kind: badge
 *       x: 88
 *       y: 96
 *       ...
 *   -->
 *
 *   # Slide one
 *
 *   ---                       ← slide delimiter
 *
 *   # Slide two
 *
 * The format is deliberately boring: a deck that has never been touched by the
 * canvas is just ordinary Markdown, and a deck saved from the canvas still
 * reads as ordinary Markdown with one metadata comment per slide.
 */
import yaml from 'js-yaml';
import { slideLayouts, slideTransitions } from '@/theme';
import type { SlideLayout, SlideTransition } from '@/theme';
import {
  slideBackgrounds,
  type CanvasElement,
  type Deck,
  type DeckMeta,
  type Slide,
  type SlideBackground,
  type SlideMeta,
} from '@/model/types';
import { createId, minimizeElement, normalizeElement } from '@/model/factory';

/** The keyword that opens a Nozilla metadata comment. */
export const META_TAG = 'nzl';

export const DEFAULT_SLIDE_META: SlideMeta = {
  layout: 'default',
  transition: 'fade',
  background: 'paper',
};

const DECK_META_KEYS = ['title', 'author', 'date', 'footer', 'theme', 'format'] as const;

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

export function parseDeck(source: string): Deck {
  const text = source.replace(/\r\n?/g, '\n');
  const { frontmatter, body } = splitFrontmatter(text);
  const meta = parseDeckMeta(frontmatter);
  const chunks = splitSlides(body);

  const slides = chunks.map((chunk) => parseSlide(chunk));

  // A completely empty file still yields one editable slide.
  if (slides.length === 0) {
    slides.push(createEmptySlide());
  }

  return { meta, slides };
}

export function splitFrontmatter(text: string): { frontmatter: string | null; body: string } {
  if (!/^---[ \t]*\n/.test(text)) return { frontmatter: null, body: text };
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i += 1) {
    if (/^---[ \t]*$/.test(lines[i])) {
      return {
        frontmatter: lines.slice(1, i).join('\n'),
        body: lines.slice(i + 1).join('\n'),
      };
    }
  }
  return { frontmatter: null, body: text };
}

/**
 * Split a deck body on `---` slide delimiters.
 *
 * A line of three-or-more dashes only counts as a delimiter when it is not
 * inside a fenced code block or an HTML comment, and when the line before it is
 * blank — which is exactly what keeps a Setext `Heading\n---` from silently
 * cutting a deck in half.
 */
/**
 * Den Text Zeile für Zeile durchgehen und sagen, was wo gilt.
 *
 * Eine Rechnung mit drei Kunden: `splitSlides()` teilt danach, `parseSlide()`
 * sucht den Metadatenblock danach, und `serializeSlide()` weiß danach, welche
 * Zeile beim nächsten Öffnen als Trenner gelesen würde. Vorher wusste es jeder
 * für sich — und `parseSlide()` wusste es gar nicht: es suchte den `nzl`-Block
 * über den ganzen Brocken und schnitt den Treffer heraus, also auch aus einem
 * Codeblock, der das Dateiformat *zeigt*. Genau das tut das Willkommens-Deck.
 */
function* zeilenlage(
  lines: readonly string[],
): Generator<{ index: number; line: string; imCode: boolean; imKommentar: boolean }> {
  let fence: string | null = null;
  let inComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const zaunVorher = fence;

    if (!inComment) {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        if (fence === null) fence = marker[0].repeat(marker.length);
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      }
    }

    const kommentarVorher = inComment;
    if (fence === null) {
      // Kommentare mitzählen, damit ein `---` im Metadatenblock nichts teilt.
      let scan = 0;
      while (scan < line.length) {
        if (!inComment) {
          const open = line.indexOf('<!--', scan);
          if (open === -1) break;
          inComment = true;
          scan = open + 4;
        } else {
          const close = line.indexOf('-->', scan);
          if (close === -1) {
            scan = line.length;
            break;
          }
          inComment = false;
          scan = close + 3;
        }
      }
    }

    // Die Zaunzeile selbst gehört zum Code, die öffnende Kommentarzeile zum
    // Kommentar: beide sind keine gewöhnlichen Textzeilen.
    yield {
      index: i,
      line,
      imCode: fence !== null || zaunVorher !== null,
      imKommentar: inComment || kommentarVorher,
    };
  }
}

/** Die Zeilen, die beim Einlesen als Folientrenner gelten. */
export function trennerZeilen(body: string): Set<number> {
  const lines = body.split('\n');
  const out = new Set<number>();
  for (const { index, line, imCode, imKommentar } of zeilenlage(lines)) {
    const trenner = !imCode && !imKommentar && /^[ \t]{0,3}-{3,}[ \t]*$/.test(line);
    const davorLeer = index === 0 || lines[index - 1].trim() === '';
    if (trenner && davorLeer) out.add(index);
  }
  return out;
}

export function splitSlides(body: string): string[] {
  const lines = body.split('\n');
  const trenner = trennerZeilen(body);
  const chunks: string[][] = [[]];

  for (let i = 0; i < lines.length; i += 1) {
    if (trenner.has(i)) {
      chunks.push([]);
      continue;
    }
    chunks[chunks.length - 1].push(lines[i]);
  }

  return chunks
    .map((chunk) => chunk.join('\n'))
    .filter((chunk, _index, all) => chunk.trim() !== '' || all.length === 1);
}

const META_COMMENT_RE = new RegExp(`<!--\\s*${META_TAG}\\b([\\s\\S]*?)-->`, 'i');

/**
 * Den Metadatenblock einer Folie finden — aber nicht in einem Codeblock.
 *
 * `splitSlides()` zählt Codezäune sorgfältig mit, damit ein `---` darin nichts
 * teilt; hier wurde über den ganzen Brocken gesucht. Eine Folie, die das
 * Dateiformat *zeigt* — ein ```markdown-Block mit einem `nzl`-Beispiel darin,
 * also genau das Willkommens-Deck — verlor damit beim Öffnen den halben
 * Codeblock aus ihrem Text, und die Beispielwerte wurden zu den echten
 * Metadaten der Folie. Öffnen und Sichern genügte.
 */
function findeMetaBlock(chunk: string): RegExpExecArray | null {
  const zeilen = chunk.split('\n');
  const codeZeilen = new Set<number>();
  for (const { index, imCode } of zeilenlage(zeilen)) {
    if (imCode) codeZeilen.add(index);
  }
  // Der Zeilenanfang jeder Zeile, um von einem Fundort auf seine Zeile zu
  // schließen.
  const anfaenge: number[] = [];
  let pos = 0;
  for (const zeile of zeilen) {
    anfaenge.push(pos);
    pos += zeile.length + 1;
  }
  const zeileVon = (at: number) => {
    let letzte = 0;
    for (let i = 0; i < anfaenge.length; i += 1) if (anfaenge[i] <= at) letzte = i;
    return letzte;
  };

  const global = new RegExp(META_COMMENT_RE.source, 'gi');
  let treffer: RegExpExecArray | null;
  while ((treffer = global.exec(chunk)) !== null) {
    if (!codeZeilen.has(zeileVon(treffer.index))) return treffer;
  }
  return null;
}

export function parseSlide(chunk: string): Slide {
  const match = findeMetaBlock(chunk);
  let meta: SlideMeta = { ...DEFAULT_SLIDE_META };
  let elements: CanvasElement[] = [];

  if (match) {
    const raw = unescapeCommentTerminators(match[1]);
    const data = safeLoadYaml(raw);
    if ((!data || typeof data !== 'object' || Array.isArray(data)) && raw.trim() !== '') {
      /*
         Der Block ist da, aber nicht lesbar.

         Ihn wie „kein Block" zu behandeln war der Fehler: Layout fiel auf die
         Vorgabe, die Elemente verschwanden, und der Rohtext wurde unten aus
         dem Markdown geschnitten. Beim nächsten Sichern stand er in keiner
         Datei mehr. Er bleibt jetzt hier liegen und wird beim Sichern
         wortgleich zurückgeschrieben.

         Ein *leerer* Block ist kein Fehler, sondern nur nichts — er sagt
         dasselbe wie gar kein Block und darf keine Warnung auslösen. Deshalb
         die Prüfung auf `raw.trim()`.
      */
      meta.unreadable = match[1];
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as Record<string, unknown>;
      meta = {
        layout: pick(record.layout, slideLayouts, DEFAULT_SLIDE_META.layout) as SlideLayout,
        transition: pick(
          record.transition,
          slideTransitions,
          DEFAULT_SLIDE_META.transition,
        ) as SlideTransition,
        background: pick(
          record.background,
          slideBackgrounds,
          DEFAULT_SLIDE_META.background,
        ) as SlideBackground,
      };
      if (typeof record.notes === 'string' && record.notes.trim()) meta.notes = record.notes;
      if (record.bare === true) meta.bare = true;

      if (Array.isArray(record.elements)) {
        /*
           Kennungen werden hier eindeutig gemacht und nicht in der Fabrik:
           `normalizeElement` sieht immer nur *ein* Element und kann von seinen
           Geschwistern nichts wissen. Hier stehen sie beieinander.

           Der Anlass ist der naheliegendste Handgriff überhaupt: einen
           Element-Block im `nzl`-Abschnitt kopieren, um eine zweite Karte
           anzulegen. Danach stand dieselbe `id` zweimal, und weil
           `updateElements()` im Store über ein `Set` der Kennungen filtert,
           bewegte ein Ziehen der linken Karte auch die rechte — bei einer
           Auswahl, die nur einen Eintrag zeigte. `snippetToElements()` und
           `duplicateSlide()` vergeben längst frische Kennungen; der Weg über
           die Datei war die eine Lücke.
        */
        const vergeben = new Set<string>();
        elements = record.elements
          .map((entry, index) => normalizeElement(entry, index))
          .filter((entry): entry is CanvasElement => entry !== null)
          .map((entry) => {
            if (!vergeben.has(entry.id)) {
              vergeben.add(entry.id);
              return entry;
            }
            const frisch = { ...entry, id: createId(entry.kind) };
            vergeben.add(frisch.id);
            return frisch;
          });
      }
    }
  }

  // Herausgeschnitten wird genau der gefundene Block — `replace()` mit dem
  // Muster träfe wieder den ersten Treffer, und der kann in einem Codeblock
  // stehen.
  const markdown = (
    match ? chunk.slice(0, match.index) + chunk.slice(match.index + match[0].length) : chunk
  )
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');

  return {
    id: createId('slide'),
    meta,
    markdown,
    elements: normalizeZOrder(elements),
  };
}

function parseDeckMeta(frontmatter: string | null): DeckMeta {
  const meta: DeckMeta = { title: 'Untitled deck' };
  if (!frontmatter) return meta;

  const data = safeLoadYaml(frontmatter);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return meta;

  const record = data as Record<string, unknown>;
  const extra: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if ((DECK_META_KEYS as readonly string[]).includes(key)) continue;
    extra[key] = value;
  }

  if (typeof record.title === 'string' && record.title.trim()) meta.title = record.title;
  if (typeof record.author === 'string') meta.author = record.author;
  if (record.date instanceof Date) meta.date = record.date.toISOString().slice(0, 10);
  else if (typeof record.date === 'string') meta.date = record.date;
  if (typeof record.footer === 'string') meta.footer = record.footer;
  if (typeof record.theme === 'string' && record.theme.trim()) meta.theme = record.theme.trim();
  /*
     Der Wert wird **nicht** gegen die bekannten Formate geprüft. Genauso wie
     beim Erscheinungsbild eine Zeile darüber: was hier steht, gehört der
     Datei, und ein unbekanntes Format stillschweigend zu `16-9` zu machen
     hieße, es beim ersten Speichern zu löschen. Wer es zeichnen muss, fragt
     `istFolienformat()`.
  */
  if (typeof record.format === 'string' && record.format.trim()) {
    meta.format = record.format.trim();
  }
  if (Object.keys(extra).length > 0) meta.extra = extra;

  return meta;
}

function safeLoadYaml(input: string): unknown {
  try {
    return yaml.load(input, { schema: yaml.JSON_SCHEMA });
  } catch {
    try {
      return yaml.load(input);
    } catch {
      return null;
    }
  }
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Re-pack z-indices to a dense 0..n-1 range, preserving relative order. */
export function normalizeZOrder(elements: readonly CanvasElement[]): CanvasElement[] {
  return elements
    .map((element, index) => ({ element, index }))
    .sort((a, b) => a.element.z - b.element.z || a.index - b.index)
    .map(({ element }, z) => (element.z === z ? element : ({ ...element, z } as CanvasElement)));
}

export function createEmptySlide(patch: Partial<Slide> = {}): Slide {
  return {
    id: createId('slide'),
    meta: { ...DEFAULT_SLIDE_META },
    markdown: '',
    elements: [],
    ...patch,
  };
}

/* -------------------------------------------------------------------------- */
/* Serialisation                                                               */
/* -------------------------------------------------------------------------- */

export function serializeDeck(deck: Deck): string {
  const parts: string[] = [];

  const frontmatter = buildDeckFrontmatter(deck.meta);
  if (frontmatter) parts.push(`---\n${frontmatter}---\n`);

  const slides = deck.slides.map((slide) => serializeSlide(slide));
  parts.push(slides.join('\n\n---\n\n'));

  return `${parts.join('\n').replace(/\n{3,}$/, '\n')}\n`;
}

export function serializeSlide(slide: Slide): string {
  const block = buildSlideMetaBlock(slide);
  /*
     Vorn nur Zeilenumbrüche wegnehmen, hinten den Weißraum.

     `trim()` schnitt auch die *Einrückung* der ersten Zeile ab, und beim
     Einlesen wird sie gebraucht: `parseSlide()` nimmt vorn nur `\n+` weg.
     Beginnt eine Folie mit einem eingerückten Codeblock — vier Leerzeichen,
     die Schreibweise aus CommonMark —, verlor genau seine erste Zeile die
     Einrückung, und aus einem Codeblock wurde ein Absatz mit einer
     eingerückten Zeile darunter.
  */
  const markdown = geschuetzterFliesstext(slide.markdown.replace(/^\n+/, '').replace(/\s+$/, ''));
  // A slide with neither content nor metadata still needs *something* on the
  // page, otherwise the delimiters would collapse and the slide would vanish
  // on the next load.
  if (!block) return markdown || `<!-- ${META_TAG} -->`;
  return markdown ? `${block}\n\n${markdown}` : block;
}

/**
 * Einen Querstrich im Fließtext so schreiben, dass er keine Folie teilt.
 *
 * `---` nach einer Leerzeile ist in Markdown ein Trennstrich — und in diesem
 * Dateiformat der Folientrenner. Geschrieben wurde der Fließtext wortgleich
 * hinaus: **eine Folie wurde beim Sichern zu zweien.** Der Weg dorthin ist
 * kein Sonderfall, sondern der Regelfall, denn `serializeDeck → parseDeck`
 * läuft bei jeder Selbstsicherung und bei jedem Wort, das der Vortragskanal
 * hinüberschickt. Im Vortrag sah der Referent danach eine andere Folie als das
 * Publikum, und ein Deck ohne Frontmatter verlor seine erste Folie ganz, weil
 * `splitFrontmatter()` den führenden Strich für den Beginn eines Frontmatters
 * hielt.
 *
 * Geschrieben wird `- - -`. Das ist derselbe Trennstrich nach CommonMark —
 * gezeichnet wird also dasselbe —, und der Trenner-Ausdruck sieht ihn nicht.
 * Der Text ändert sich damit, und das ist die kleinere Zumutung: die
 * Alternative ist eine Folie, die sich beim Sichern teilt.
 */
function geschuetzterFliesstext(markdown: string): string {
  const trenner = trennerZeilen(markdown);
  if (trenner.size === 0) return markdown;
  return markdown
    .split('\n')
    .map((zeile, index) => (trenner.has(index) ? zeile.replace(/-{3,}/, '- - -') : zeile))
    .join('\n');
}

function buildDeckFrontmatter(meta: DeckMeta): string | null {
  const data: Record<string, unknown> = {};
  if (meta.title && meta.title !== 'Untitled deck') data.title = meta.title;
  if (meta.author) data.author = meta.author;
  if (meta.date) data.date = meta.date;
  if (meta.footer) data.footer = meta.footer;
  if (meta.theme) data.theme = meta.theme;
  if (meta.format) data.format = meta.format;
  if (meta.extra) Object.assign(data, meta.extra);
  if (Object.keys(data).length === 0) return null;
  return dumpYaml(data);
}

function buildSlideMetaBlock(slide: Slide): string | null {
  /*
     Ein Block, der sich nicht lesen ließ, geht unverändert zurück.

     Nichts von dem, was er meinte, ist im Modell angekommen — ihn aus dem
     Modell neu zu bauen hieße, ihn durch einen leeren zu ersetzen. Wortgleich
     zurückgeschrieben bleibt die Arbeit erhalten, und wer den Tippfehler
     findet, hat sein Deck wieder.
  */
  if (slide.meta.unreadable !== undefined) {
    return `<!-- ${META_TAG}${slide.meta.unreadable}-->`;
  }

  const data: Record<string, unknown> = {};
  if (slide.meta.layout !== DEFAULT_SLIDE_META.layout) data.layout = slide.meta.layout;
  if (slide.meta.transition !== DEFAULT_SLIDE_META.transition)
    data.transition = slide.meta.transition;
  if (slide.meta.background !== DEFAULT_SLIDE_META.background)
    data.background = slide.meta.background;
  if (slide.meta.bare) data.bare = true;
  if (slide.meta.notes?.trim()) data.notes = slide.meta.notes;

  const elements = normalizeZOrder(slide.elements).map(minimizeElement);
  if (elements.length > 0) data.elements = elements;

  if (Object.keys(data).length === 0) return null;

  const body = escapeCommentTerminators(dumpYaml(data)).trimEnd();
  return `<!-- ${META_TAG}\n${body}\n-->`;
}

function dumpYaml(data: Record<string, unknown>): string {
  return yaml.dump(data, {
    indent: 2,
    lineWidth: 96,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
  });
}

/* -------------------------------------------------------------------------- */
/* HTML-comment safety                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Slide content can legitimately contain `-->`, which would otherwise close the
 * metadata comment early. The pair below is a bijection:
 *
 *   `-->`         ⇄ `--&gt;`
 *   `--&gt;`      ⇄ `--&&gt;`
 *   `--&&gt;`     ⇄ `--&&&gt;`   … and so on.
 */
export function escapeCommentTerminators(text: string): string {
  return text.replace(/--(&*)(?:gt;|>)/g, (_match, amps: string) => `--&${amps}gt;`);
}

export function unescapeCommentTerminators(text: string): string {
  return text.replace(/--(&+)gt;/g, (_match, amps: string) =>
    amps.length === 1 ? '-->' : `--${amps.slice(1)}gt;`,
  );
}
