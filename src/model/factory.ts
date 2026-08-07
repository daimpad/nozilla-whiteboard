/**
 * Element construction and normalisation.
 *
 * `createElement` is the *only* way an element enters the document, which is
 * what guarantees "every element placed on the canvas inherits default CI
 * styles automatically". `normalizeElement` is its forgiving twin: it repairs
 * hand-written YAML from a `.md` file back into a valid, fully-defaulted
 * element.
 */
import { canvas, elementDefaults, radius as radiusTokens, revealAnimations } from '@/theme';
import type { RevealAnimation, StrokeName, ToneName, TypeStyleName } from '@/theme';
import { typeScale } from '@/theme';
import { elementTones } from '@/theme';
import { iconNames, type IconName } from '@/assets/icons';
import {
  cardVariants,
  connectorKinds,
  elementKinds,
  fillStyles,
  horizontalAligns,
  iconFrames,
  shapeNames,
  verticalAligns,
  type CanvasElement,
  type ElementBase,
  type ElementKind,
  type FillStyle,
} from './types';

let idCounter = 0;

/** Short, stable, human-legible ids — they end up in the saved Markdown. */
export function createId(prefix = 'el'): string {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${idCounter.toString(36)}${random}`;
}

/** Reset the id counter — used by tests to get deterministic output. */
export function __resetIdCounter(value = 0): void {
  idCounter = value;
}

const defaultFill: Record<ElementKind, FillStyle> = {
  text: 'none',
  markdown: 'none',
  card: 'soft',
  badge: 'solid',
  icon: 'none',
  shape: 'soft',
  connector: 'none',
  image: 'none',
};

const defaultRadius: Record<ElementKind, number> = {
  text: radiusTokens.md,
  markdown: elementDefaults.markdown.radius,
  card: elementDefaults.card.radius,
  badge: elementDefaults.badge.radius,
  icon: radiusTokens.lg,
  shape: elementDefaults.shape.radius,
  connector: 0,
  image: elementDefaults.image.radius,
};

const defaultPadding: Record<ElementKind, number> = {
  text: elementDefaults.text.padding,
  markdown: elementDefaults.markdown.padding,
  card: elementDefaults.card.padding,
  badge: 16,
  icon: 12,
  shape: 16,
  connector: 0,
  image: 0,
};

const defaultStroke: Record<ElementKind, StrokeName> = {
  text: 'hairline',
  markdown: elementDefaults.markdown.strokeWeight,
  card: elementDefaults.card.strokeWeight,
  badge: elementDefaults.badge.strokeWeight,
  icon: elementDefaults.icon.strokeWeight,
  shape: elementDefaults.shape.strokeWeight,
  connector: elementDefaults.connector.strokeWeight,
  image: 'hairline',
};

const defaultSize: Record<ElementKind, { w: number; h: number }> = {
  text: { w: elementDefaults.text.width, h: elementDefaults.text.height },
  markdown: { w: elementDefaults.markdown.width, h: elementDefaults.markdown.height },
  card: { w: elementDefaults.card.width, h: elementDefaults.card.height },
  badge: { w: elementDefaults.badge.width, h: elementDefaults.badge.height },
  icon: { w: elementDefaults.icon.width, h: elementDefaults.icon.height },
  shape: { w: elementDefaults.shape.width, h: elementDefaults.shape.height },
  connector: { w: elementDefaults.connector.width, h: elementDefaults.connector.height },
  image: { w: elementDefaults.image.width, h: elementDefaults.image.height },
};

const defaultTone: Record<ElementKind, ToneName> = {
  text: elementDefaults.text.tone,
  markdown: elementDefaults.markdown.tone,
  card: elementDefaults.card.tone,
  badge: elementDefaults.badge.tone,
  icon: elementDefaults.icon.tone,
  shape: elementDefaults.shape.tone,
  connector: elementDefaults.connector.tone,
  image: elementDefaults.image.tone,
};

function baseFor(kind: ElementKind): ElementBase {
  const size = defaultSize[kind];
  return {
    id: createId(kind),
    kind,
    x: Math.round((canvas.width - size.w) / 2),
    y: Math.round((canvas.height - size.h) / 2),
    w: size.w,
    h: size.h,
    rotation: 0,
    z: 0,
    tone: defaultTone[kind],
    fill: defaultFill[kind],
    strokeWeight: defaultStroke[kind],
    radius: defaultRadius[kind],
    padding: defaultPadding[kind],
    opacity: 1,
    locked: false,
  };
}

type ElementOf<K extends ElementKind> = Extract<CanvasElement, { kind: K }>;

/**
 * Build a fully-formed, CI-defaulted element. `patch` may override anything,
 * but omitted properties always fall back to the CI defaults.
 */
export function createElement<K extends ElementKind>(
  kind: K,
  patch: Partial<ElementOf<K>> = {},
): ElementOf<K> {
  const base = baseFor(kind);
  let element: CanvasElement;

  switch (kind) {
    case 'text':
      element = {
        ...base,
        kind: 'text',
        text: 'Text',
        typeStyle: elementDefaults.text.typeStyle,
        align: elementDefaults.text.align,
        valign: 'top',
      };
      break;
    case 'markdown':
      element = { ...base, kind: 'markdown', markdown: '### Heading\n\nBody copy.', align: 'left' };
      break;
    case 'card':
      element = {
        ...base,
        kind: 'card',
        variant: 'feature',
        title: 'Card title',
        body: 'Short supporting sentence that explains the point.',
        icon: 'sparkle',
      };
      break;
    case 'badge':
      element = { ...base, kind: 'badge', text: 'Badge' };
      break;
    case 'icon':
      element = { ...base, kind: 'icon', icon: 'sparkle', frame: 'none' };
      break;
    case 'shape':
      element = { ...base, kind: 'shape', shape: 'rounded' };
      break;
    case 'connector':
      element = { ...base, kind: 'connector', connector: 'arrow', dashed: false };
      break;
    case 'image':
      element = { ...base, kind: 'image', src: '', alt: '', fit: 'contain' };
      break;
    default:
      throw new Error(`Unknown element kind: ${String(kind)}`);
  }

  return { ...element, ...patch } as ElementOf<K>;
}

/** Copy an element with a fresh id, nudged by `offset` slide units. */
export function duplicateElement(element: CanvasElement, offset = canvas.gridSize * 3): CanvasElement {
  return {
    ...element,
    id: createId(element.kind),
    x: element.x + offset,
    y: element.y + offset,
  } as CanvasElement;
}

/* -------------------------------------------------------------------------- */
/* Normalisation (parsing hand-written / saved YAML)                           */
/* -------------------------------------------------------------------------- */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function optionalIcon(value: unknown): IconName | undefined {
  return typeof value === 'string' && (iconNames as string[]).includes(value)
    ? (value as IconName)
    : undefined;
}

/**
 * Turn arbitrary parsed YAML into a valid element, or `null` if it is too
 * broken to be useful. Unknown keys are dropped; bad values fall back to CI
 * defaults rather than throwing, so a typo in a hand-edited deck degrades
 * gracefully instead of failing the whole file.
 */
export function normalizeElement(raw: unknown, index = 0): CanvasElement | null {
  if (!isRecord(raw)) return null;

  const kind = oneOf(raw.kind, elementKinds, 'shape');
  const size = defaultSize[kind];
  const base: ElementBase = {
    id: str(raw.id) || createId(kind),
    kind,
    x: num(raw.x, canvas.gridSize * 8),
    y: num(raw.y, canvas.gridSize * 8),
    w: Math.max(1, num(raw.w, size.w)),
    h: Math.max(kind === 'connector' ? 0 : 1, num(raw.h, size.h)),
    rotation: num(raw.rotation, 0),
    z: num(raw.z, index),
    tone: oneOf(raw.tone, Object.keys(elementTones) as ToneName[], defaultTone[kind]),
    fill: oneOf(raw.fill, fillStyles, defaultFill[kind]),
    strokeWeight: oneOf(
      raw.strokeWeight ?? raw.stroke,
      ['hairline', 'regular', 'medium', 'bold', 'heavy'] as const,
      defaultStroke[kind],
    ),
    radius: num(raw.radius, defaultRadius[kind]),
    padding: num(raw.padding, defaultPadding[kind]),
    opacity: Math.min(1, Math.max(0, num(raw.opacity, 1))),
    locked: bool(raw.locked, false),
  };

  if (typeof raw.name === 'string' && raw.name.trim()) base.name = raw.name;

  const reveal = normalizeReveal(raw.reveal);
  if (reveal) base.reveal = reveal;

  switch (kind) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        text: str(raw.text),
        typeStyle: oneOf(raw.typeStyle, Object.keys(typeScale) as TypeStyleName[], 'h3'),
        align: oneOf(raw.align, horizontalAligns, 'left'),
        valign: oneOf(raw.valign, verticalAligns, 'top'),
      };
    case 'markdown':
      return {
        ...base,
        kind: 'markdown',
        markdown: str(raw.markdown ?? raw.content ?? raw.text),
        align: oneOf(raw.align, horizontalAligns, 'left'),
      };
    case 'card':
      return {
        ...base,
        kind: 'card',
        variant: oneOf(raw.variant, cardVariants, 'feature'),
        eyebrow: typeof raw.eyebrow === 'string' ? raw.eyebrow : undefined,
        title: str(raw.title),
        body: str(raw.body),
        icon: optionalIcon(raw.icon),
      };
    case 'badge':
      return { ...base, kind: 'badge', text: str(raw.text), icon: optionalIcon(raw.icon) };
    case 'icon':
      return {
        ...base,
        kind: 'icon',
        icon: optionalIcon(raw.icon) ?? 'sparkle',
        frame: oneOf(raw.frame, iconFrames, 'none'),
      };
    case 'shape':
      return {
        ...base,
        kind: 'shape',
        shape: oneOf(raw.shape, shapeNames, 'rounded'),
        label: typeof raw.label === 'string' ? raw.label : undefined,
        labelStyle: typeof raw.labelStyle === 'string'
          ? oneOf(raw.labelStyle, Object.keys(typeScale) as TypeStyleName[], 'body')
          : undefined,
      };
    case 'connector':
      return {
        ...base,
        kind: 'connector',
        connector: oneOf(raw.connector, connectorKinds, 'arrow'),
        dashed: bool(raw.dashed, false),
        label: typeof raw.label === 'string' ? raw.label : undefined,
      };
    case 'image':
      return {
        ...base,
        kind: 'image',
        src: str(raw.src),
        alt: str(raw.alt),
        fit: oneOf(raw.fit, ['cover', 'contain'] as const, 'contain'),
      };
    default:
      return null;
  }
}

function normalizeReveal(raw: unknown): { step: number; animation: RevealAnimation } | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return { step: Math.floor(raw), animation: 'rise' };
  }
  if (!isRecord(raw)) return null;
  const step = Math.floor(num(raw.step, 0));
  if (step <= 0) return null;
  return { step, animation: oneOf(raw.animation, revealAnimations, 'rise') };
}

/* -------------------------------------------------------------------------- */
/* Serialisation support                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Strip every property that still equals its CI default, so saved Markdown
 * carries only what the author actually changed. Position and size are always
 * kept — they are the whole point of persisting the canvas.
 */
export function minimizeElement(element: CanvasElement): Record<string, unknown> {
  const kind = element.kind;
  const out: Record<string, unknown> = {
    id: element.id,
    kind,
    x: round2(element.x),
    y: round2(element.y),
    w: round2(element.w),
    h: round2(element.h),
  };

  const keepIfChanged = <T>(key: string, value: T, fallback: T) => {
    if (value !== fallback && value !== undefined) out[key] = value;
  };

  keepIfChanged('rotation', round2(element.rotation), 0);
  keepIfChanged('z', element.z, 0);
  keepIfChanged('tone', element.tone, defaultTone[kind]);
  keepIfChanged('fill', element.fill, defaultFill[kind]);
  keepIfChanged('strokeWeight', element.strokeWeight, defaultStroke[kind]);
  keepIfChanged('radius', round2(element.radius), defaultRadius[kind]);
  keepIfChanged('padding', round2(element.padding), defaultPadding[kind]);
  keepIfChanged('opacity', round2(element.opacity), 1);
  keepIfChanged('locked', element.locked, false);
  if (element.name) out.name = element.name;
  if (element.reveal && element.reveal.step > 0) {
    out.reveal = { step: element.reveal.step, animation: element.reveal.animation };
  }

  switch (element.kind) {
    case 'text':
      out.text = element.text;
      keepIfChanged('typeStyle', element.typeStyle, 'h3');
      keepIfChanged('align', element.align, 'left');
      keepIfChanged('valign', element.valign, 'top');
      break;
    case 'markdown':
      out.markdown = element.markdown;
      keepIfChanged('align', element.align, 'left');
      break;
    case 'card':
      keepIfChanged('variant', element.variant, 'feature');
      if (element.eyebrow) out.eyebrow = element.eyebrow;
      out.title = element.title;
      out.body = element.body;
      if (element.icon) out.icon = element.icon;
      break;
    case 'badge':
      out.text = element.text;
      if (element.icon) out.icon = element.icon;
      break;
    case 'icon':
      out.icon = element.icon;
      keepIfChanged('frame', element.frame, 'none');
      break;
    case 'shape':
      out.shape = element.shape;
      if (element.label) out.label = element.label;
      if (element.labelStyle) out.labelStyle = element.labelStyle;
      break;
    case 'connector':
      out.connector = element.connector;
      keepIfChanged('dashed', element.dashed, false);
      if (element.label) out.label = element.label;
      break;
    case 'image':
      out.src = element.src;
      if (element.alt) out.alt = element.alt;
      keepIfChanged('fit', element.fit, 'contain');
      break;
  }

  return out;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
