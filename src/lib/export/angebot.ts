/**
 * Was das Export-Menü anbietet — ohne die Wege, die es anbietet.
 *
 * Die Kopfleiste braucht die Namen der Textwege und Seitenformate, sobald sie
 * gezeichnet wird; die Rechnungen dahinter braucht sie erst beim Klick. Stünde
 * beides in einem Modul, käme mit der ersten Beschriftung der ganze
 * PowerPoint-Schreiber samt ZIP und Handout-Satz in den Start. Gemessen sind
 * das 45 kB von 730 (15 von 218 komprimiert) — weniger, als der Name
 * „PowerPoint" verspricht: der Rest des Starts sind die Zeichen, React, YAML,
 * marked und die Szene, und die braucht die Fläche vom ersten Bild an.
 *
 * Hier steht deshalb nur, was ohne diese Rechnungen auskommt: die Auswahl,
 * ihre Beschriftungen und der eine Weg, der keine Szene braucht — Markdown.
 * Er *ist* das Dateiformat, und das Sichern mit ⌘S nimmt ihn bei jedem
 * Anschlag; nachzuladen gäbe es an ihm nichts.
 */
import { serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import { saveText, slugify, type SaveResult } from './download';

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
