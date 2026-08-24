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
 * Wo ein neu eingefügtes Element landet.
 *
 * Es landete lange in der Mitte der Folie — und damit bei fast jedem Layout
 * mitten im Fließtext, denn der steht links und reicht bis in die Mitte. Wer
 * eine Karte einsetzte, musste sie als Erstes wegziehen.
 *
 * Jetzt wird **rechtsbündig am Satzspiegel** eingesetzt und untereinander
 * gestapelt: das ist die Spalte, die die Layouts für frei gelegtes Material
 * frei lassen. Gestapelt wird unter allem, was diese Spalte schon berührt —
 * geprüft wird die Überlappung und nicht die rechte Kante, sonst schöbe ein
 * breites Element, das quer bis in die Spalte reicht, den Stapel nicht.
 *
 * Ist die Spalte voll, sitzt das Element auf dem unteren Satzspiegel auf. Es
 * überdeckt dann etwas — aber es ist zu sehen und steht dort, wo man es
 * sucht. Oben wieder anzufangen hieße, es unter der Überschrift zu verstecken.
 */
export function insertFrame(
  existing: readonly { x: number; y: number; w: number; h: number }[],
  size: { w: number; h: number },
): { x: number; y: number } {
  const right = width - margin.right;
  const bottom = height - margin.bottom;
  const gap = canvas.gridSize * 3;

  // Wo in dieser Spalte der Stapel endet. Geprüft wird die Überlappung und
  // nicht die rechte Kante, sonst schöbe ein breites Element, das quer bis in
  // die Spalte reicht, den Stapel nicht.
  const untenIn = (spaltenX: number) =>
    existing
      .filter((rect) => rect.x < spaltenX + size.w && rect.x + rect.w > spaltenX)
      .reduce<number>((tiefstes, rect) => Math.max(tiefstes, rect.y + rect.h + gap), margin.top);

  const ersteSpalte = Math.max(margin.left, right - size.w);
  for (let x = ersteSpalte; x >= margin.left; x -= size.w + gap) {
    const y = untenIn(x);
    if (y + size.h <= bottom) return { x, y };
  }

  return { x: ersteSpalte, y: Math.max(margin.top, bottom - size.h) };
}

/**
 * Ob der Text eines eingesetzten Elements an der rechten Kante stehen soll.
 *
 * `insertFrame()` legt den *Kasten* an den Satzspiegel — der Text darin stand
 * aber weiter links, und ein Label ist nichts als sein Text. Vier Labels
 * untereinander sahen deshalb aus, als schwebten sie mitten auf der Folie,
 * obwohl jede Kante stimmte; wer eines einsetzte, zog es als Erstes nach
 * rechts. Genau diesen Griff nimmt das hier ab.
 *
 * Ein Element, das den ganzen Satzspiegel füllt, bleibt unberührt: ein
 * Kampagnensatz steht links, und das ist keine Einstellung, sondern die CI.
 * Erkennbar ist er daran, dass für ihn keine Spalte übrig blieb — sein Kasten
 * beginnt am linken Rand.
 */
export function insertAlign(x: number): 'left' | 'right' {
  return x > margin.left ? 'right' : 'left';
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
