/**
 * The export/import pipeline.
 *
 * Three destinations, one source of truth:
 *   • Markdown — the deck itself, positions and all (lossless, re-importable).
 *   • SVG      — one slide, or the whole deck as a contact sheet, as vectors.
 *   • PDF      — the deck as vector pages with selectable text.
 */
import { serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import { buildSlideScene, type Scene, type SceneOptions } from './scene';
import { resolveDeckImages, sizeResolver, inlineImageHrefs, type ImageMap } from './images';
import { downloadBlob, saveText, slugify, type SaveResult } from './download';
import { scenesToPdf, type PdfOptions } from './pdf';
import { sceneToSvg, scenesToContactSheet } from './svg';

export * from './scene';
export * from './svg';
export * from './pdf';
export * from './images';
export * from './download';

export const MARKDOWN_MIME = 'text/markdown';
export const SVG_MIME = 'image/svg+xml';
export const PDF_MIME = 'application/pdf';

/* -------------------------------------------------------------------------- */
/* Markdown                                                                    */
/* -------------------------------------------------------------------------- */

export function deckToMarkdown(deck: Deck): string {
  return serializeDeck(deck);
}

export async function exportMarkdown(
  deck: Deck,
  options: { filename?: string; handle?: FileSystemFileHandle } = {},
): Promise<SaveResult> {
  const filename = options.filename ?? `${slugify(deck.meta.title)}.md`;
  return saveText(serializeDeck(deck), filename, MARKDOWN_MIME, options.handle);
}

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

export interface DeckSceneOptions extends Omit<SceneOptions, 'slideNumber' | 'totalSlides'> {
  images?: ImageMap;
}

export function buildDeckScenes(deck: Deck, options: DeckSceneOptions = {}): Scene[] {
  const resolveImageSize = options.images ? sizeResolver(options.images) : options.resolveImageSize;
  return deck.slides.map((slide, index) =>
    buildSlideScene(slide, deck, {
      ...options,
      resolveImageSize,
      slideNumber: index + 1,
      totalSlides: deck.slides.length,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* SVG                                                                         */
/* -------------------------------------------------------------------------- */

export interface SvgExportOptions {
  /** Slide index to export; omit for the whole deck as a contact sheet. */
  slideIndex?: number;
  filename?: string;
  /** Skip the footer and slide number. */
  bare?: boolean;
}

export async function exportSvg(deck: Deck, options: SvgExportOptions = {}): Promise<SaveResult> {
  const { svg, filename } = await renderSvg(deck, options);
  return saveText(svg, filename, SVG_MIME);
}

export async function renderSvg(
  deck: Deck,
  options: SvgExportOptions = {},
): Promise<{ svg: string; filename: string }> {
  const images = await resolveDeckImages(deck);
  const scenes = buildDeckScenes(deck, { images, chrome: !options.bare });

  if (typeof options.slideIndex === 'number') {
    const index = Math.max(0, Math.min(options.slideIndex, scenes.length - 1));
    const svg = inlineImageHrefs(sceneToSvg(scenes[index]), images);
    return {
      svg,
      filename: options.filename ?? `${slugify(deck.meta.title)}-slide-${index + 1}.svg`,
    };
  }

  const svg = inlineImageHrefs(scenesToContactSheet(scenes), images);
  return { svg, filename: options.filename ?? `${slugify(deck.meta.title)}-deck.svg` };
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

export interface PdfExportOptions extends Omit<PdfOptions, 'images'> {
  /** Export a single slide instead of the whole deck. */
  slideIndex?: number;
  filename?: string;
  bare?: boolean;
}

export async function exportPdf(deck: Deck, options: PdfExportOptions = {}): Promise<SaveResult> {
  const { blob, filename } = await renderPdf(deck, options);
  return { via: (downloadBlob(blob, filename), 'download') };
}

export async function renderPdf(
  deck: Deck,
  options: PdfExportOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const images = await resolveDeckImages(deck);
  const all = buildDeckScenes(deck, { images, chrome: !options.bare });
  const scenes =
    typeof options.slideIndex === 'number'
      ? [all[Math.max(0, Math.min(options.slideIndex, all.length - 1))]]
      : all;

  const doc = await scenesToPdf(scenes, {
    ...options,
    title: options.title ?? deck.meta.title,
    author: options.author ?? deck.meta.author,
    images: new Map(
      [...images.values()].map((image) => [
        image.src,
        { dataUrl: image.dataUrl, format: image.format },
      ]),
    ),
  });

  const suffix = typeof options.slideIndex === 'number' ? `-slide-${options.slideIndex + 1}` : '';
  return {
    blob: doc.output('blob'),
    filename: options.filename ?? `${slugify(deck.meta.title)}${suffix}.pdf`,
  };
}
