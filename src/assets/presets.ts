/**
 * The CI asset palette.
 *
 * These are the only things an author can place on a canvas. Each preset is a
 * partial element that is merged over the CI defaults in `createElement`, so
 * "inherits default CI styles automatically" is structural rather than a
 * convention someone has to remember.
 */
import { elementDefaults, radius, typeScale } from '@/theme';
import type { CanvasElement, ElementKind } from '@/model/types';

export const presetGroups = [
  'text',
  'cards',
  'badges',
  'shapes',
  'connectors',
  'media',
] as const;
export type PresetGroup = (typeof presetGroups)[number];

export interface AssetPreset {
  id: string;
  label: string;
  group: PresetGroup;
  kind: ElementKind;
  /** Merged over the CI defaults for the kind. */
  patch: Partial<CanvasElement>;
  hint?: string;
}

export const presetGroupLabels: Record<PresetGroup, string> = {
  text: 'Type',
  cards: 'Cards',
  badges: 'Badges',
  shapes: 'Shapes & frames',
  connectors: 'Connectors',
  media: 'Media',
};

/* -------------------------------------------------------------------------- */

const preset = <K extends ElementKind>(
  id: string,
  label: string,
  group: PresetGroup,
  kind: K,
  patch: Partial<Extract<CanvasElement, { kind: K }>>,
  hint?: string,
): AssetPreset => ({ id, label, group, kind, patch: patch as Partial<CanvasElement>, hint });

export const assetPresets: AssetPreset[] = [
  /* ------------------------------------------------------------------ type */
  preset('text-display', 'Display', 'text', 'text', {
    text: 'Display headline',
    typeStyle: 'display',
    w: 760,
    h: 90,
  }),
  preset('text-h1', 'Heading 1', 'text', 'text', {
    text: 'Heading one',
    typeStyle: 'h1',
    w: 620,
    h: 68,
  }),
  preset('text-h2', 'Heading 2', 'text', 'text', {
    text: 'Heading two',
    typeStyle: 'h2',
    w: 520,
    h: 52,
  }),
  preset('text-h3', 'Heading 3', 'text', 'text', {
    text: 'Heading three',
    typeStyle: 'h3',
    w: 420,
    h: 40,
  }),
  preset('text-lead', 'Lead', 'text', 'text', {
    text: 'A short lead paragraph that introduces the point.',
    typeStyle: 'lead',
    w: 520,
    h: 96,
  }),
  preset('text-body', 'Body', 'text', 'text', {
    text: 'Body copy for supporting detail.',
    typeStyle: 'body',
    w: 420,
    h: 84,
  }),
  preset('text-caption', 'Caption', 'text', 'text', {
    text: 'Caption or source note',
    typeStyle: 'caption',
    tone: 'neutral',
    w: 320,
    h: 24,
  }),
  preset('text-overline', 'Overline', 'text', 'text', {
    text: 'SECTION LABEL',
    typeStyle: 'overline',
    w: 280,
    h: 20,
  }),
  preset(
    'markdown-block',
    'Markdown block',
    'text',
    'markdown',
    {
      markdown: '### Sub-heading\n\n- First point\n- Second point\n- Third point',
      w: 460,
      h: 220,
    },
    'Full Markdown, typeset with the CI scale',
  ),
  preset('markdown-panel', 'Markdown panel', 'text', 'markdown', {
    markdown: '**Panel**\n\nMarkdown inside a CI surface.\n\n```ts\nconst ci = true;\n```',
    fill: 'soft',
    tone: 'neutral',
    w: 460,
    h: 260,
    radius: radius.lg,
  }),

  /* ----------------------------------------------------------------- cards */
  preset('card-feature', 'Feature card', 'cards', 'card', {
    variant: 'feature',
    icon: 'sparkle',
    title: 'Feature title',
    body: 'One sentence describing what this does for the reader.',
    w: 320,
    h: 216,
  }),
  preset('card-stat', 'Stat card', 'cards', 'card', {
    variant: 'stat',
    eyebrow: 'Growth',
    title: '38%',
    body: 'Quarter over quarter',
    tone: 'support',
    w: 260,
    h: 180,
  }),
  preset('card-step', 'Step card', 'cards', 'card', {
    variant: 'step',
    eyebrow: '1',
    title: 'Discover',
    body: 'What happens in this stage.',
    w: 280,
    h: 200,
  }),
  preset('card-quote', 'Quote card', 'cards', 'card', {
    variant: 'quote',
    title: 'The whole point of a deck is to make one idea land.',
    body: '— Nozilla design team',
    tone: 'neutral',
    fill: 'soft',
    w: 420,
    h: 220,
  }),
  preset('card-callout', 'Callout', 'cards', 'card', {
    variant: 'callout',
    icon: 'info',
    title: 'Worth knowing',
    body: 'A short aside that should not be missed.',
    tone: 'accent',
    w: 400,
    h: 150,
  }),
  preset('card-solid', 'Solid card', 'cards', 'card', {
    variant: 'feature',
    icon: 'rocket',
    title: 'Emphasis card',
    body: 'Reach for this when one card has to carry the slide.',
    fill: 'solid',
    tone: 'primary',
    w: 320,
    h: 216,
  }),

  /* ---------------------------------------------------------------- badges */
  preset('badge-solid', 'Solid badge', 'badges', 'badge', {
    text: 'New',
    fill: 'solid',
    tone: 'primary',
    w: 108,
    h: 36,
  }),
  preset('badge-soft', 'Soft badge', 'badges', 'badge', {
    text: 'In progress',
    fill: 'soft',
    tone: 'support',
    w: 148,
    h: 36,
  }),
  preset('badge-outline', 'Outline badge', 'badges', 'badge', {
    text: 'Draft',
    fill: 'outline',
    tone: 'neutral',
    w: 116,
    h: 36,
  }),
  preset('badge-icon', 'Icon badge', 'badges', 'badge', {
    text: 'Shipped',
    icon: 'check',
    fill: 'soft',
    tone: 'support',
    w: 156,
    h: 38,
  }),

  /* ---------------------------------------------------------------- shapes */
  preset('shape-rounded', 'Container', 'shapes', 'shape', { shape: 'rounded', w: 280, h: 180 }),
  preset('shape-rectangle', 'Rectangle', 'shapes', 'shape', { shape: 'rectangle', w: 240, h: 150 }),
  preset('shape-pill', 'Pill', 'shapes', 'shape', { shape: 'pill', w: 220, h: 72 }),
  preset('shape-ellipse', 'Ellipse', 'shapes', 'shape', { shape: 'ellipse', w: 200, h: 200 }),
  preset('shape-diamond', 'Diamond', 'shapes', 'shape', { shape: 'diamond', w: 190, h: 190 }),
  preset('shape-triangle', 'Triangle', 'shapes', 'shape', { shape: 'triangle', w: 190, h: 165 }),
  preset('shape-hexagon', 'Hexagon', 'shapes', 'shape', { shape: 'hexagon', w: 210, h: 185 }),
  preset('shape-chevron', 'Chevron', 'shapes', 'shape', {
    shape: 'chevron',
    label: 'Stage',
    w: 240,
    h: 84,
  }),
  preset('shape-banner', 'Banner', 'shapes', 'shape', {
    shape: 'banner',
    label: 'Banner',
    fill: 'solid',
    w: 260,
    h: 64,
  }),
  preset('shape-callout', 'Speech bubble', 'shapes', 'shape', {
    shape: 'callout',
    label: 'Quick note',
    w: 260,
    h: 160,
  }),
  preset('shape-frame', 'Corner frame', 'shapes', 'shape', {
    shape: 'frame',
    fill: 'outline',
    strokeWeight: 'bold',
    w: 320,
    h: 220,
  }),
  preset('shape-bracket', 'Bracket', 'shapes', 'shape', {
    shape: 'bracket',
    fill: 'outline',
    strokeWeight: 'medium',
    w: 44,
    h: 220,
  }),
  preset('shape-outline', 'Outline container', 'shapes', 'shape', {
    shape: 'rounded',
    fill: 'outline',
    strokeWeight: 'medium',
    w: 280,
    h: 180,
  }),

  /* ------------------------------------------------------------ connectors */
  preset('connector-arrow', 'Arrow', 'connectors', 'connector', {
    connector: 'arrow',
    w: 220,
    h: 0,
  }),
  preset('connector-line', 'Line', 'connectors', 'connector', {
    connector: 'line',
    w: 220,
    h: 0,
  }),
  preset('connector-double', 'Double arrow', 'connectors', 'connector', {
    connector: 'double-arrow',
    w: 240,
    h: 0,
  }),
  preset('connector-elbow', 'Elbow', 'connectors', 'connector', {
    connector: 'elbow',
    w: 220,
    h: 120,
  }),
  preset('connector-dashed', 'Dashed arrow', 'connectors', 'connector', {
    connector: 'arrow',
    dashed: true,
    w: 220,
    h: 0,
  }),

  /* ----------------------------------------------------------------- media */
  preset(
    'image-placeholder',
    'Image',
    'media',
    'image',
    { w: elementDefaults.image.width, h: elementDefaults.image.height },
    'Drop a file onto the canvas, or set a path in the inspector',
  ),
];

export function presetsByGroup(group: PresetGroup): AssetPreset[] {
  return assetPresets.filter((entry) => entry.group === group);
}

/** Type styles offered in the inspector, in CI ramp order. */
export const typeStyleOptions = Object.keys(typeScale) as Array<keyof typeof typeScale>;
