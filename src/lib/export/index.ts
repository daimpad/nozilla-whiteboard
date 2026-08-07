/**
 * The export/import pipeline.
 *
 * Three destinations, one source of truth:
 *   • Markdown — the deck itself, positions and all (lossless, re-importable).
 *   • SVG      — one slide, or the whole deck as a contact sheet, as vectors.
 *   • PDF      — the deck as vector pages with selectable text.
 *
 * Für SVG und PDF gibt es zwei Wege, wie die Schrift in die Datei kommt —
 * siehe `TextMode`. Beide erzeugen dasselbe Bild; sie unterscheiden sich
 * darin, was die Gegenseite können muss.
 */
import { serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import { buildSlideScene, type Scene, type SceneOptions } from './scene';
import { resolveDeckImages, sizeResolver, inlineImageHrefs, type ImageMap } from './images';
import { downloadBlob, saveText, slugify, type SaveResult } from './download';
import { scenesToPdf, type PdfOptions } from './pdf';
import { sceneToSvg, scenesToContactSheet } from './svg';
import { embeddedFontCss, facesFor } from './fontFiles';
import { outlineScenes } from './outline';
import { deckToPptx, type PptxOptions } from './pptx';

export * from './scene';
export * from './svg';
export * from './pdf';
export * from './images';
export * from './download';
export * from './fontFiles';
export * from './outline';
export * from './pptx';
export * from './zip';

/**
 * Wie die Schrift in eine exportierte Datei kommt.
 *
 * `embedded`  Der Text bleibt Text und die Datei trägt die Schnitte mit sich —
 *             im PDF als eingebettete Teilmenge, im SVG als `@font-face` mit
 *             Daten-URI. Markierbar, durchsuchbar, nachträglich redigierbar.
 *             Die Vorgabe.
 *
 * `outlines`  Jede Glyphe wird zur Kontur. Es gibt keine Schriftreferenz mehr,
 *             also auch nichts, was ein Betrachter falsch auflösen könnte —
 *             der Weg für Druckvorstufe, Illustrator und Inkscape, die
 *             eingebettete SVG-Schriften ignorieren. Preis: kein markierbarer
 *             Text mehr, und die Datei wird größer.
 */
export type TextMode = 'embedded' | 'outlines';

export const textModes: readonly TextMode[] = ['embedded', 'outlines'];

export const textModeLabels: Record<TextMode, string> = {
  embedded: 'Schrift einbetten',
  outlines: 'Text in Pfade',
};

export const textModeHints: Record<TextMode, string> = {
  embedded: 'Text bleibt markierbar und durchsuchbar',
  outlines: 'Überall gleich, auch ohne Schrift-Unterstützung',
};

export const MARKDOWN_MIME = 'text/markdown';
export const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
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
  /** Wie die Schrift in die Datei kommt. Vorgabe: einbetten. */
  text?: TextMode;
}

export async function exportSvg(deck: Deck, options: SvgExportOptions = {}): Promise<SaveResult> {
  const { svg, filename } = await renderSvg(deck, options);
  return saveText(svg, filename, SVG_MIME);
}

export async function renderSvg(
  deck: Deck,
  options: SvgExportOptions = {},
): Promise<{ svg: string; filename: string }> {
  const mode = options.text ?? 'embedded';
  const images = await resolveDeckImages(deck);
  const built = buildDeckScenes(deck, { images, chrome: !options.bare });

  const selected =
    typeof options.slideIndex === 'number'
      ? [built[Math.max(0, Math.min(options.slideIndex, built.length - 1))]]
      : built;

  // Erst wandeln, dann einbetten: nach dem Umriss-Weg gibt es keinen Lauf mehr,
  // für den eine `@font-face`-Regel noch etwas täte.
  const scenes = mode === 'outlines' ? await outlineScenes(selected) : selected;
  const fontCss = mode === 'embedded' ? await fontCssFor(scenes) : undefined;

  const single = typeof options.slideIndex === 'number';
  const svg = inlineImageHrefs(
    single ? sceneToSvg(scenes[0], { fontCss }) : scenesToContactSheet(scenes, 24, fontCss),
    images,
  );

  const suffix = single ? `-slide-${(options.slideIndex ?? 0) + 1}` : '-deck';
  return { svg, filename: options.filename ?? `${slugify(deck.meta.title)}${suffix}.svg` };
}

/**
 * Die `@font-face`-Regeln für die Schnitte, die in diesen Szenen vorkommen.
 *
 * Ein Fehlschlag bleibt folgenlos: die Datei nennt ihre Schriften dann nur
 * beim Namen, wie vor dieser Erweiterung auch.
 */
async function fontCssFor(scenes: readonly Scene[]): Promise<string | undefined> {
  const specs = scenes.flatMap((scene) =>
    scene.prims.flatMap((prim) => (prim.t === 'text' ? prim.runs.map((run) => run.font) : [])),
  );
  const faces = facesFor(specs);
  if (faces.length === 0) return undefined;
  try {
    return (await embeddedFontCss(faces)) || undefined;
  } catch (error) {
    console.warn('Schriften nicht einbettbar — das SVG nennt sie nur beim Namen.', error);
    return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

export interface PdfExportOptions extends Omit<PdfOptions, 'images' | 'embedFonts'> {
  /** Export a single slide instead of the whole deck. */
  slideIndex?: number;
  filename?: string;
  bare?: boolean;
  /** Wie die Schrift in die Datei kommt. Vorgabe: einbetten. */
  text?: TextMode;
}

export async function exportPdf(deck: Deck, options: PdfExportOptions = {}): Promise<SaveResult> {
  const { blob, filename } = await renderPdf(deck, options);
  return { via: (downloadBlob(blob, filename), 'download') };
}

export async function renderPdf(
  deck: Deck,
  options: PdfExportOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const mode = options.text ?? 'embedded';
  const images = await resolveDeckImages(deck);
  const all = buildDeckScenes(deck, { images, chrome: !options.bare });
  const selected =
    typeof options.slideIndex === 'number'
      ? [all[Math.max(0, Math.min(options.slideIndex, all.length - 1))]]
      : all;
  const scenes = mode === 'outlines' ? await outlineScenes(selected) : selected;

  const doc = await scenesToPdf(scenes, {
    ...options,
    embedFonts: mode === 'embedded',
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

/* -------------------------------------------------------------------------- */
/* PowerPoint                                                                  */
/* -------------------------------------------------------------------------- */

export interface PptxExportOptions extends Omit<PptxOptions, 'images'> {
  filename?: string;
  bare?: boolean;
}

/**
 * Anders als SVG und PDF kennt dieser Weg keinen `TextMode`.
 *
 * Eine `.pptx` ist zum Weiterarbeiten da; Text in Konturen zu wandeln würde ihr
 * genau das nehmen, wofür man sie öffnet. Wer ein unveränderliches Bild will,
 * nimmt PDF — dort steht die Wahl.
 */
export async function exportPptx(deck: Deck, options: PptxExportOptions = {}): Promise<SaveResult> {
  const { blob, filename } = await renderPptx(deck, options);
  return { via: (downloadBlob(blob, filename), 'download') };
}

export async function renderPptx(
  deck: Deck,
  options: PptxExportOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const images = await resolveDeckImages(deck);
  const blob = await deckToPptx(deck, {
    ...options,
    images,
    chrome: options.bare ? false : options.chrome,
    title: options.title ?? deck.meta.title,
    author: options.author ?? deck.meta.author,
  });
  return { blob, filename: options.filename ?? `${slugify(deck.meta.title)}.pptx` };
}
