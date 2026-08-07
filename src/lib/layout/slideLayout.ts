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
