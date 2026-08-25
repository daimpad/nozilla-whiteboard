/**
 * Eine Folie als Bild.
 *
 * Der Export konnte Markdown, SVG, PDF und PowerPoint — kein Bild. Für „schick
 * mir mal kurz die eine Folie" blieb das Bildschirmfoto, und damit die
 * Bildschirmauflösung, der Zoomfaktor und der Ausschnitt, den man gerade
 * getroffen hat.
 *
 * ## Warum über den Umriss-Weg
 *
 * Gerastert wird, indem das SVG in ein `<img>` gelegt und auf ein Canvas
 * gezeichnet wird. Ein so geladenes SVG ist ein **eigenes Dokument ohne
 * Zugriff auf die Seite**: es sieht die Schriften des Werkzeugs nicht, und
 * eine `@font-face`-Regel darin lädt nichts nach. Wer Textknoten hineinlegt,
 * bekommt ein Bild in der Ersatzschrift — und merkt es erst, wenn es beim
 * Empfänger liegt.
 *
 * Deshalb `text: 'outlines'`: jede Glyphe wird vorher zur Kontur, und dann
 * gibt es keinen Lauf mehr, für den eine Schrift fehlen könnte. Denselben Weg
 * geht der PDF-Export, wenn er „Text als Konturen" anbietet.
 *
 * ## Warum das Doppelte
 *
 * 1280 × 720 ist die Folie, aber kein Bild, das man herzeigt. Zweifach
 * gerastert sind es 2560 × 1440 — genug für einen Netzhautbildschirm und für
 * eine halbe Seite Papier, und klein genug, um es zu verschicken.
 */
import type { Deck } from '@/model/types';
import { canvas } from '@/theme';
import { saveBlob, slugify, type SaveResult } from './download';
import { renderSvg } from './index';

/** Wie viele Bildpunkte auf eine Folien-Einheit kommen. */
const SCHAERFE = 2;

const PNG_MIME = 'image/png';

export interface PngExportOptions {
  slideIndex: number;
  filename?: string;
  /** Fußzeile und Foliennummer weglassen. */
  bare?: boolean;
}

export async function exportPng(deck: Deck, options: PngExportOptions): Promise<SaveResult> {
  const blob = await renderPng(deck, options);
  const nummer = String(options.slideIndex + 1).padStart(2, '0');
  const filename = options.filename ?? `${slugify(deck.meta.title)}-${nummer}.png`;
  return saveBlob(blob, filename, { mimeType: PNG_MIME, extensions: ['.png'] });
}

export async function renderPng(deck: Deck, options: PngExportOptions): Promise<Blob> {
  const { svg } = await renderSvg(deck, {
    slideIndex: options.slideIndex,
    bare: options.bare,
    text: 'outlines',
  });

  const breite = canvas.width * SCHAERFE;
  const hoehe = canvas.height * SCHAERFE;

  const bild = await ladeBild(svg);
  const flaeche = document.createElement('canvas');
  flaeche.width = breite;
  flaeche.height = hoehe;
  const stift = flaeche.getContext('2d');
  if (!stift) throw new Error('Kein 2D-Kontext — das Bild lässt sich nicht rastern.');
  stift.drawImage(bild, 0, 0, breite, hoehe);

  return new Promise<Blob>((fertig, gescheitert) => {
    flaeche.toBlob(
      (blob) => (blob ? fertig(blob) : gescheitert(new Error('Das Rastern ergab kein Bild.'))),
      PNG_MIME,
    );
  });
}

/**
 * Das SVG als Bild laden.
 *
 * Über eine Blob-URL und nicht über eine `data:`-URL: ein Deck mit
 * eingebetteten Bildern wird schnell mehrere Megabyte groß, und als `data:`
 * müsste das alles erst nach Base64 — ein Drittel mehr Zeichen, einmal quer
 * durch den Speicher.
 */
function ladeBild(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  return new Promise<HTMLImageElement>((fertig, gescheitert) => {
    const bild = new Image();
    bild.onload = () => fertig(bild);
    bild.onerror = () => gescheitert(new Error('Das SVG ließ sich nicht als Bild laden.'));
    bild.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}
