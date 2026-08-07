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

const DECK_META_KEYS = ['title', 'author', 'date', 'footer'] as const;

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
export function splitSlides(body: string): string[] {
  const lines = body.split('\n');
  const chunks: string[][] = [[]];

  let fence: string | null = null;
  let inComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!inComment) {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        if (fence === null) fence = marker[0].repeat(marker.length);
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      }
    }

    if (fence === null) {
      // Track HTML comments so metadata blocks can contain `---` safely.
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

    const isDelimiter = fence === null && !inComment && /^[ \t]{0,3}-{3,}[ \t]*$/.test(line);
    const prevBlank = i === 0 || lines[i - 1].trim() === '';

    if (isDelimiter && prevBlank) {
      chunks.push([]);
      continue;
    }

    chunks[chunks.length - 1].push(line);
  }

  return chunks
    .map((chunk) => chunk.join('\n'))
    .filter((chunk, _index, all) => chunk.trim() !== '' || all.length === 1);
}

const META_COMMENT_RE = new RegExp(`<!--\\s*${META_TAG}\\b([\\s\\S]*?)-->`, 'i');

export function parseSlide(chunk: string): Slide {
  const match = chunk.match(META_COMMENT_RE);
  let meta: SlideMeta = { ...DEFAULT_SLIDE_META };
  let elements: CanvasElement[] = [];

  if (match) {
    const raw = unescapeCommentTerminators(match[1]);
    const data = safeLoadYaml(raw);
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
        elements = record.elements
          .map((entry, index) => normalizeElement(entry, index))
          .filter((entry): entry is CanvasElement => entry !== null);
      }
    }
  }

  const markdown = chunk.replace(META_COMMENT_RE, '').replace(/^\n+/, '').replace(/\s+$/, '');

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
  const markdown = slide.markdown.trim();
  // A slide with neither content nor metadata still needs *something* on the
  // page, otherwise the delimiters would collapse and the slide would vanish
  // on the next load.
  if (!block) return markdown || `<!-- ${META_TAG} -->`;
  return markdown ? `${block}\n\n${markdown}` : block;
}

function buildDeckFrontmatter(meta: DeckMeta): string | null {
  const data: Record<string, unknown> = {};
  if (meta.title && meta.title !== 'Untitled deck') data.title = meta.title;
  if (meta.author) data.author = meta.author;
  if (meta.date) data.date = meta.date;
  if (meta.footer) data.footer = meta.footer;
  if (meta.extra) Object.assign(data, meta.extra);
  if (Object.keys(data).length === 0) return null;
  return dumpYaml(data);
}

function buildSlideMetaBlock(slide: Slide): string | null {
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
