/**
 * Der Weg aus dem Werkzeug heraus — und zurück.
 *
 * Drei Ziele, eine Quelle:
 *   • Markdown — das Deck selbst, samt Koordinaten. Verlustfrei und wieder
 *                einlesbar; es *ist* das Dateiformat.
 *   • SVG      — eine Folie oder das ganze Deck als Kontaktbogen, als Vektoren.
 *   • PDF      — das Deck als Vektorseiten mit markierbarem Text.
 *
 * Für SVG und PDF gibt es zwei Wege, wie die Schrift in die Datei kommt —
 * siehe `TextMode`. Beide erzeugen dasselbe Bild; sie unterscheiden sich
 * darin, was die Gegenseite können muss.
 */
import { serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import {
  aufBlatt,
  buildHandoutScenes,
  buildSlideScene,
  type Blattlage,
  type Scene,
  type SceneOptions,
} from './scene';
import { resolveDeckImages, sizeResolver, inlineImageHrefs, type ImageMap } from './images';
import { downloadBlob, saveText, slugify, type SaveResult } from './download';
import { scenesToPdf, type PdfOptions } from './pdf';
import { sceneToSvg, scenesToContactSheet } from './svg';
import { embeddedFontCss, facesFor } from './fontFiles';
import { meldeSchnittausfall } from './glyphCover';
import { outlineScenes } from './outline';
import { deckToPptx, type PptxOptions } from './pptx';

export * from './scene';
export * from './svg';
export * from './pdf';
export * from './images';
export * from './download';
export * from './fontFiles';
export * from './outline';
export * from './png';
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

/**
 * Wie groß die Seite eines PDF ist.
 *
 * `folie`     Die Seite *ist* die Folie: 1280 × 720 Einheiten, keine Ränder.
 *             Das Richtige zum Vorführen und für einen Anhang, den niemand
 *             ausdruckt. Die Vorgabe.
 *
 * `a4-hoch`   Ein Blatt A4 im Hochformat, die Folie mittig darauf.
 * `a4-quer`   Dasselbe im Querformat — auf einer 16:9-Folie das Format, das
 *             das Papier am besten ausnutzt.
 *
 * Die Folie wird dabei **nicht kleiner gerechnet**; das Blatt wächst um sie
 * herum, und der Massstab des ganzen Dokuments bringt es danach auf die Maße
 * eines echten A4-Bogens. Warum das der einzig gangbare Weg ist, steht im Kopf
 * von `aufBlatt()`.
 */
export type Seitenformat = 'folie' | 'a4-hoch' | 'a4-quer';

export const seitenformate: readonly Seitenformat[] = ['folie', 'a4-hoch', 'a4-quer'];

export const seitenformatLabels: Record<Seitenformat, string> = {
  folie: 'Folie',
  'a4-hoch': 'A4 hoch',
  'a4-quer': 'A4 quer',
};

export const seitenformatHints: Record<Seitenformat, string> = {
  folie: 'Die Seite ist die Folie, ohne Rand',
  'a4-hoch': 'Die Folie mittig auf A4, hochkant',
  'a4-quer': 'Die Folie mittig auf A4, quer',
};

/**
 * Die kurze Kante von A4 in Punkt — 210 mm bei 72 Punkt je Zoll.
 *
 * Ausgerechnet und nicht abgeschrieben, damit die Herkunft dasteht. Ohne
 * diesen Schritt wäre „A4" nur eine Proportion: die Seite käme mit 1092 × 1544
 * Punkt heraus, also im Verhältnis richtig und im Maß ein Bogen von 385 × 545
 * Millimetern. Jeder Betrachter druckte das klaglos auf A4 — nachdem er es
 * verkleinert hätte, mit einem Rand, den niemand gewählt hat. Ein Format, das
 * A4 heißt, ist A4.
 */
const A4_KURZ_PT = (210 / 25.4) * 72;

/** Wie das Blatt liegt — oder `null`, wenn die Seite die Folie ist. */
function blattlage(format: Seitenformat): Blattlage | null {
  if (format === 'a4-hoch') return 'hoch';
  if (format === 'a4-quer') return 'quer';
  return null;
}

/**
 * Der Massstab, der aus einer Blatt-Szene einen A4-Bogen macht.
 *
 * Gemessen an der **kurzen** Kante, denn die ist bei hoch wie quer dieselbe
 * — die lange folgt aus dem Wurzel-zwei-Verhältnis und muss nicht eigens
 * getroffen werden.
 */
function a4Massstab(szene: Scene | undefined): number | undefined {
  if (!szene) return undefined;
  return A4_KURZ_PT / Math.min(szene.width, szene.height);
}

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
  /** Welche Folie; ohne Angabe das ganze Deck als Kontaktbogen. */
  slideIndex?: number;
  filename?: string;
  /** Fußzeile und Foliennummer weglassen. */
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
    single ? sceneToSvg(scenes[0], { fontCss }) : scenesToContactSheet(scenes, undefined, fontCss),
    images,
  );

  const suffix = single ? `-slide-${(options.slideIndex ?? 0) + 1}` : '-deck';
  return { svg, filename: options.filename ?? `${slugify(deck.meta.title)}${suffix}.svg` };
}

/**
 * Die `@font-face`-Regeln für die Schnitte, die in diesen Szenen vorkommen.
 *
 * Hier stand „ein Fehlschlag bleibt folgenlos" und ein `console.warn`. Der
 * Satz stimmt für den *Export* — die Datei entsteht — und nicht für den, der
 * sie danach öffnet: ohne die eingebetteten Schnitte nennt das SVG seine
 * Schriften nur beim Namen, und auf einem fremden Rechner steht der Text in
 * irgendetwas anderem. Das sieht aus wie ein Fehler des Werkzeugs und ist eine
 * Datei, die nicht ankam.
 *
 * Dieselbe Stille wie beim leeren `catch` der Selbstsicherung und beim
 * fehlenden Bild, und dieselbe Antwort: gemeldet wird über den Melder, den es
 * für genau diese Auskunft schon gibt.
 */
async function fontCssFor(scenes: readonly Scene[]): Promise<string | undefined> {
  const specs = scenes.flatMap((scene) =>
    scene.prims.flatMap((prim) => (prim.t === 'text' ? prim.runs.map((run) => run.font) : [])),
  );
  const faces = facesFor(specs);
  if (faces.length === 0) return undefined;
  try {
    return (await embeddedFontCss(faces)) || undefined;
  } catch {
    // Genannt wird die **Kennung** und nicht Familie plus Gewicht: der
    // Umriss-Weg meldet über denselben Kanal, und zwei Schreibweisen für
    // denselben Schnitt in derselben Meldung wären eine Frage zu viel.
    meldeSchnittausfall(faces.map((face) => face.id));
    return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

export interface PdfExportOptions extends Omit<PdfOptions, 'images' | 'embedFonts'> {
  /** Nur eine Folie statt des ganzen Decks. */
  slideIndex?: number;
  filename?: string;
  bare?: boolean;
  /** Wie die Schrift in die Datei kommt. Vorgabe: einbetten. */
  text?: TextMode;
  /**
   * Wie groß die Seite ist. Vorgabe: so groß wie die Folie.
   *
   * Nur beim PDF und nicht beim SVG: ein Blatt ist Papier, und eine
   * SVG-Datei kommt nie auf welches. Dort wäre der Rand ringsum nichts als
   * Leerraum, den jemand wieder wegschneidet.
   */
  seite?: Seitenformat;
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

  /*
     Das Blatt kommt **zuletzt**, nach dem Wandeln in Konturen. Andersherum
     liefe der Umriss-Weg über das Beiwerk der Seite mit — über Papierfläche
     und Haarstrich, die keinen Text tragen —, und die Verschiebung stünde
     mitten in einer Kette, an deren Ende sie ohnehin gehört.
  */
  const lage = blattlage(options.seite ?? 'folie');
  const seiten = lage ? scenes.map((scene) => aufBlatt(scene, lage)) : scenes;

  const doc = await scenesToPdf(seiten, {
    ...options,
    // Ein von außen gesetzter Massstab gewinnt: wer ihn mitgibt, weiß, was er
    // will, und bekommt dann eben ein Blatt in DIN-Proportion und fremdem Maß.
    scale: options.scale ?? (lage ? a4Massstab(seiten[0]) : undefined),
    embedFonts: mode === 'embedded',
    title: options.title ?? deck.meta.title,
    author: options.author ?? deck.meta.author,
    images: new Map(
      [...images.values()].map((image) => [
        image.src,
        { dataUrl: image.dataUrl, format: image.format, w: image.w, h: image.h },
      ]),
    ),
  });

  const suffix = typeof options.slideIndex === 'number' ? `-slide-${options.slideIndex + 1}` : '';
  // Das Format gehört in den Namen: zwei Ausgaben desselben Decks im selben
  // Ordner unterscheiden sich sonst nur beim Öffnen.
  const blatt = lage ? `-a4-${lage}` : '';
  return {
    blob: doc.output('blob'),
    filename: options.filename ?? `${slugify(deck.meta.title)}${suffix}${blatt}.pdf`,
  };
}

/* -------------------------------------------------------------------------- */
/* Handout                                                                     */
/* -------------------------------------------------------------------------- */

export async function exportHandoutPdf(
  deck: Deck,
  options: PdfExportOptions = {},
): Promise<SaveResult> {
  const { blob, filename } = await renderHandoutPdf(deck, options);
  return { via: (downloadBlob(blob, filename), 'download') };
}

/**
 * Je Seite eine Folie und darunter ihre Notizen.
 *
 * Der Weg ist derselbe wie beim PDF, nur mit einer anderen Szene — und das ist
 * der Punkt: gezeichnet wird von `scenesToPdf`, wie alles andere auch. Ein
 * eigener Zeichner für das Handout wäre ein zweiter Weg zur selben Folie und
 * liefe früher oder später auseinander.
 *
 * Konturen gibt es hier nicht. Ein Handout ist zum Lesen und Vollkritzeln da;
 * markierbaren Text hineinzugeben und ihn dann in Kurven zu wandeln, hieße den
 * einen Vorteil wegzuwerfen, den ein Blatt Papier noch hat, wenn man es
 * einscannt.
 */
export async function renderHandoutPdf(
  deck: Deck,
  options: PdfExportOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const images = await resolveDeckImages(deck);
  // `flatMap`, weil eine Folie mit langen Notizen mehr als eine Seite füllt.
  const scenes = deck.slides.flatMap((slide, index) =>
    buildHandoutScenes(slide, deck, {
      resolveImageSize: sizeResolver(images),
      chrome: !options.bare,
      slideNumber: index + 1,
      totalSlides: deck.slides.length,
    }),
  );

  const doc = await scenesToPdf(scenes, {
    ...options,
    embedFonts: true,
    title: options.title ?? deck.meta.title,
    author: options.author ?? deck.meta.author,
    images: new Map(
      [...images.values()].map((image) => [
        image.src,
        { dataUrl: image.dataUrl, format: image.format, w: image.w, h: image.h },
      ]),
    ),
  });

  return {
    blob: doc.output('blob'),
    filename: options.filename ?? `${slugify(deck.meta.title)}-handout.pdf`,
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
