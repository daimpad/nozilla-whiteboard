/**
 * The deck data model.
 *
 * The whole application state is (deck + a little ephemeral UI state), and the
 * deck is losslessly serialisable to Markdown — see `src/lib/markdown`.
 */
import type {
  RevealAnimation,
  SlideLayout,
  SlideTransition,
  StrokeName,
  ToneName,
  TypeStyleName,
} from '@/theme';
import type { IconName } from '@/assets/icons';

/* -------------------------------------------------------------------------- */
/* Elements                                                                    */
/* -------------------------------------------------------------------------- */

export const elementKinds = [
  'text',
  'markdown',
  'card',
  'badge',
  'icon',
  'shape',
  'connector',
  'image',
] as const;
export type ElementKind = (typeof elementKinds)[number];

/** How an element's body is painted. */
export const fillStyles = ['none', 'soft', 'solid', 'outline'] as const;
export type FillStyle = (typeof fillStyles)[number];

export const shapeNames = [
  'rectangle',
  'rounded',
  'pill',
  'ellipse',
  'diamond',
  'triangle',
  'hexagon',
  'chevron',
  'banner',
  'callout',
  'frame',
  'bracket',
] as const;
export type ShapeName = (typeof shapeNames)[number];

export const connectorKinds = ['line', 'arrow', 'double-arrow', 'elbow'] as const;
export type ConnectorKind = (typeof connectorKinds)[number];

export const cardVariants = ['feature', 'stat', 'step', 'quote', 'callout'] as const;
export type CardVariant = (typeof cardVariants)[number];

export const iconFrames = ['none', 'square', 'circle'] as const;
export type IconFrame = (typeof iconFrames)[number];

export const horizontalAligns = ['left', 'center', 'right'] as const;
export type HorizontalAlign = (typeof horizontalAligns)[number];

export const verticalAligns = ['top', 'middle', 'bottom'] as const;
export type VerticalAlign = (typeof verticalAligns)[number];

/** Reveal choreography for an element inside its slide. */
export interface Reveal {
  /** 0 = visible immediately with the slide; 1..n = revealed on the nth advance. */
  step: number;
  animation: RevealAnimation;
}

/** Properties every canvas element shares. Coordinates are in slide units. */
export interface ElementBase {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, about the element centre. */
  rotation: number;
  /** Painting order within the slide; higher is nearer the viewer. */
  z: number;
  tone: ToneName;
  fill: FillStyle;
  strokeWeight: StrokeName;
  radius: number;
  padding: number;
  opacity: number;
  locked: boolean;
  reveal?: Reveal;
  /** Optional author-facing name, shown in the layers list. */
  name?: string;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  typeStyle: TypeStyleName;
  align: HorizontalAlign;
  valign: VerticalAlign;
}

export interface MarkdownElement extends ElementBase {
  kind: 'markdown';
  markdown: string;
  align: HorizontalAlign;
}

export interface CardElement extends ElementBase {
  kind: 'card';
  variant: CardVariant;
  eyebrow?: string;
  title: string;
  body: string;
  icon?: IconName;
}

export interface BadgeElement extends ElementBase {
  kind: 'badge';
  text: string;
  icon?: IconName;
}

export interface IconElement extends ElementBase {
  kind: 'icon';
  icon: IconName;
  frame: IconFrame;
}

export interface ShapeElement extends ElementBase {
  kind: 'shape';
  shape: ShapeName;
  label?: string;
  labelStyle?: TypeStyleName;
}

export interface ConnectorElement extends ElementBase {
  kind: 'connector';
  connector: ConnectorKind;
  dashed: boolean;
  label?: string;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  /** A relative path resolved against the deck, or a `data:` URI. */
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

export type CanvasElement =
  | TextElement
  | MarkdownElement
  | CardElement
  | BadgeElement
  | IconElement
  | ShapeElement
  | ConnectorElement
  | ImageElement;

/* -------------------------------------------------------------------------- */
/* Slides & deck                                                               */
/* -------------------------------------------------------------------------- */

export const slideBackgrounds = ['surface', 'subtle', 'inverse', 'brand', 'grid'] as const;
export type SlideBackground = (typeof slideBackgrounds)[number];

export interface SlideMeta {
  layout: SlideLayout;
  transition: SlideTransition;
  background: SlideBackground;
  /** Presenter notes. Never rendered on the slide itself. */
  notes?: string;
  /** Hide the deck footer/page number on this slide. */
  bare?: boolean;
}

export interface Slide {
  id: string;
  meta: SlideMeta;
  /** Flow content, rendered inside the layout frame. */
  markdown: string;
  /** Freeform, absolutely positioned CI elements. */
  elements: CanvasElement[];
}

export interface DeckMeta {
  title: string;
  author?: string;
  date?: string;
  footer?: string;
  /** Free-form extras preserved verbatim through a load/save round-trip. */
  extra?: Record<string, unknown>;
}

export interface Deck {
  meta: DeckMeta;
  slides: Slide[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function isTextual(
  el: CanvasElement,
): el is TextElement | MarkdownElement | CardElement | BadgeElement {
  return el.kind === 'text' || el.kind === 'markdown' || el.kind === 'card' || el.kind === 'badge';
}

export function maxRevealStep(slide: Slide): number {
  return slide.elements.reduce((max, el) => Math.max(max, el.reveal?.step ?? 0), 0);
}

/** The heading a slide is known by in the overview and outline. */
export function slideTitle(slide: Slide, index: number): string {
  const heading = slide.markdown.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m);
  if (heading?.[1]) return stripInline(heading[1]);

  const firstText = slide.elements
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .find(
      (el): el is TextElement | CardElement =>
        (el.kind === 'text' && Boolean(el.text.trim())) ||
        (el.kind === 'card' && Boolean(el.title.trim())),
    );
  if (firstText) {
    return stripInline(firstText.kind === 'text' ? firstText.text : firstText.title).slice(0, 60);
  }

  const firstLine = slide.markdown
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (firstLine) return stripInline(firstLine).slice(0, 60);

  return `Slide ${index + 1}`;
}

function stripInline(input: string): string {
  return input
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
