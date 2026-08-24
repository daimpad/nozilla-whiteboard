/**
 * Slide layout presets.
 *
 * A layout decides where the *flow* (Markdown) content sits inside the slide
 * and how it is typeset. Freeform canvas elements ignore layouts entirely —
 * they are absolutely positioned — which is exactly the hybrid the tool is for.
 */
import { canvas } from '@/theme';
import type { SlideLayout, TypeStyleName } from '@/theme';

export interface FlowFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  /** Multiplies the CI type scale for this layout. */
  scale: number;
  baseStyle: TypeStyleName;
}

const { width, height, margin } = canvas;
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

/**
 * The frame for a layout, or `null` when the layout has no flow content at all
 * (`blank` and `canvas` hand the whole slide to the freeform elements).
 */
export function flowFrame(layout: SlideLayout): FlowFrame | null {
  switch (layout) {
    case 'title':
      // Titel stehen links, nicht mittig: die CI setzt Kampagnensätze am
      // Satzspiegel an, nicht in die Mitte.
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.86),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'statement':
      // Eine Aussage, groß. Für den einen Satz, der die Folie trägt.
      return {
        x: margin.left,
        y: margin.top,
        w: innerW,
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'section':
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.78),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'split':
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.48),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 0.94,
        baseStyle: 'body',
      };

    case 'quote':
      return {
        x: Math.round(width * 0.14),
        y: margin.top,
        w: Math.round(width * 0.72),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'blank':
    case 'canvas':
      return null;

    case 'default':
    default:
      return {
        x: margin.left,
        y: margin.top,
        w: innerW,
        h: innerH,
        align: 'left',
        valign: 'top',
        scale: 1,
        baseStyle: 'body',
      };
  }
}

/** Where the deck footer and slide number sit. */
export const footerFrame = {
  y: height - margin.bottom + 34,
  left: margin.left,
  right: width - margin.right,
};

/**
 * Die Spalte, in der Eingesetztes landet — und ihre Breite.
 *
 * Sie ist **fest** und nicht aus der Breite des Bausteins gerechnet. Das ist
 * der ganze Punkt: solange jeder Baustein seine eigene Breite mitbrachte,
 * bekam jeder auch seine eigene Kante — eine Überschrift begann bei 192, ein
 * Zwischentitel bei 552, ein Label bei 892. Untereinander ergab das keine
 * Linie, sondern eine Treppe, und man sah der Folie an, dass niemand sie
 * gelegt hatte.
 *
 * 48 % des Satzspiegels, rechts angeschlagen — dasselbe Verhältnis, das das
 * `split`-Layout seiner linken Spalte gibt. Die zweite Spalte liegt eine
 * Spaltenbreite weiter links und passt gerade noch in den Satzspiegel.
 */
export const insertColumnWidth = Math.round(innerW * 0.48);

export function insertColumns(): number[] {
  const gap = canvas.gridSize * 3;
  const out: number[] = [];
  for (
    let x = width - margin.right - insertColumnWidth;
    x >= margin.left;
    x -= insertColumnWidth + gap
  ) {
    out.push(x);
  }
  return out;
}

/**
 * Wo ein neu eingefügtes Element landet.
 *
 * Es landete lange in der Mitte der Folie — und damit bei fast jedem Layout
 * mitten im Fließtext, denn der steht links und reicht bis in die Mitte. Wer
 * eine Karte einsetzte, musste sie als Erstes wegziehen.
 *
 * Jetzt wird **in der rechten Spalte** eingesetzt und untereinander gestapelt.
 * Gestapelt wird unter allem, was die Spalte schon berührt — geprüft wird die
 * Überlappung und nicht eine Kante, sonst schöbe ein breites Element, das quer
 * bis in die Spalte reicht, den Stapel nicht.
 *
 * Ist die Spalte voll, geht es eine Spalte weiter nach links. Ist auch links
 * kein Platz, sitzt das Element auf dem unteren Satzspiegel auf: es überdeckt
 * dann etwas, aber es ist zu sehen und steht dort, wo man es sucht. Oben
 * wieder anzufangen hieße, es unter der Überschrift zu verstecken.
 */
export function insertFrame(
  existing: readonly { x: number; y: number; w: number; h: number }[],
  size: { w: number; h: number },
): { x: number; y: number } {
  const bottom = height - margin.bottom;
  const gap = canvas.gridSize * 3;

  const untenIn = (spaltenX: number) =>
    existing
      .filter((rect) => rect.x < spaltenX + insertColumnWidth && rect.x + rect.w > spaltenX)
      .reduce<number>((tiefstes, rect) => Math.max(tiefstes, rect.y + rect.h + gap), margin.top);

  const spalten = insertColumns();
  for (const x of spalten) {
    const y = untenIn(x);
    if (y + size.h <= bottom) return { x, y };
  }

  return { x: spalten[0], y: Math.max(margin.top, bottom - size.h) };
}

export const layoutDescriptions: Record<SlideLayout, string> = {
  title: 'Titelfolie — Kampagnensatz am Satzspiegel',
  default: 'Standardfolie — Fließtext im Satzspiegel',
  section: 'Kapiteltrenner',
  statement: 'Eine Aussage, groß',
  split: 'Text links, Fläche rechts',
  quote: 'Zitat',
  blank: 'Ohne Fließtext',
  canvas: 'Nur freie Fläche',
};
