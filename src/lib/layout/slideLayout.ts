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
      return {
        x: margin.left,
        y: margin.top,
        w: innerW,
        h: innerH,
        align: 'center',
        valign: 'middle',
        scale: 1.08,
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
        x: Math.round(width * 0.16),
        y: margin.top,
        w: Math.round(width * 0.68),
        h: innerH,
        align: 'center',
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
  y: height - margin.bottom + 30,
  left: margin.left,
  right: width - margin.right,
};

export const layoutDescriptions: Record<SlideLayout, string> = {
  title: 'Centred title slide',
  default: 'Standard content slide',
  section: 'Section divider',
  split: 'Text on the left, canvas on the right',
  quote: 'Centred pull quote',
  blank: 'No flow content',
  canvas: 'Freeform canvas only',
};
