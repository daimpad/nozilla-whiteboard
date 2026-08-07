/**
 * theme.config.ts — Nozilla Corporate Identity (CI) single source of truth.
 * ---------------------------------------------------------------------------
 * Every colour, type size, radius, line weight, shadow and motion curve used by
 * the application is declared here. Nothing in `src/` is allowed to hard-code a
 * hex value, font stack, radius or stroke width — it must be read from this
 * file (directly, via the generated CSS custom properties, or via Tailwind,
 * which is itself generated from this file).
 *
 * The file is intentionally dependency-free and plain-data so it can be
 * consumed by:
 *   - `tailwind.config.ts`   (build-time, via sucrase/jiti)
 *   - `src/theme/cssVars.ts` (runtime, injected as CSS custom properties)
 *   - `src/lib/export/*`     (SVG / PDF renderers, which cannot read the DOM)
 *
 * If the brand evolves, change it *here* and the whole app follows.
 */

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

export const brand = {
  name: 'Nozilla',
  product: 'Nozilla Whiteboard',
  tagline: 'Markdown decks. Freeform canvas. One identity.',
  /** Logomark is drawn from primitives in `src/assets/logo.tsx` — no binary asset needed. */
  logoAspect: 1,
} as const;

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Palette ramps. Index 500 is the canonical brand step for each hue; lighter
 * steps are surfaces/washes, darker steps are text/press states.
 */
export const palette = {
  /** Nozilla Cobalt — the primary brand hue. */
  cobalt: {
    50: '#EEF2FE',
    100: '#DBE3FD',
    200: '#B8C6FB',
    300: '#8DA3F7',
    400: '#5C79F0',
    500: '#2A4BD8',
    600: '#1F3CB8',
    700: '#182F93',
    800: '#132672',
    900: '#0E1B52',
  },
  /** Nozilla Ember — the accent hue. Used sparingly for emphasis and CTAs. */
  ember: {
    50: '#FFF3EE',
    100: '#FFE2D6',
    200: '#FFC3AC',
    300: '#FF9E7A',
    400: '#FF7F4F',
    500: '#F2600F',
    600: '#CC4C09',
    700: '#A33C08',
    800: '#7A2D06',
    900: '#521E04',
  },
  /** Nozilla Verdigris — the supporting hue for data, success and "positive". */
  verdigris: {
    50: '#E9F8F5',
    100: '#CCEFE9',
    200: '#99DFD3',
    300: '#5FC9B7',
    400: '#26AE99',
    500: '#0E8F7C',
    600: '#0B7263',
    700: '#095A4E',
    800: '#06423A',
    900: '#042B26',
  },
  /** Signal hues — status only, never decorative. */
  amber: {
    50: '#FFF7E6',
    100: '#FFEBBF',
    200: '#FFD780',
    300: '#FFC340',
    400: '#F5A524',
    500: '#D6870D',
    600: '#AB6A0A',
    700: '#7F4F08',
    800: '#553505',
    900: '#2C1B02',
  },
  coral: {
    50: '#FEEDEE',
    100: '#FCD5D7',
    200: '#F8ABAF',
    300: '#F27F85',
    400: '#E5484D',
    500: '#C9282E',
    600: '#A31E23',
    700: '#7C171B',
    800: '#551013',
    900: '#2E080A',
  },
  /** Neutral ramp — "Graphite". Cool-leaning to sit correctly beside Cobalt. */
  graphite: {
    0: '#FFFFFF',
    25: '#FBFCFD',
    50: '#F5F7FA',
    100: '#ECEFF4',
    200: '#DDE2EA',
    300: '#C4CBD7',
    400: '#9AA4B5',
    500: '#6F7A8C',
    600: '#515B6B',
    700: '#3A4351',
    800: '#232B36',
    900: '#12161C',
    950: '#0A0D12',
  },
} as const;

/**
 * Semantic tokens. Components consume *these*, not raw ramp steps, so that a
 * palette change never requires touching a component.
 */
export const color = {
  /* Surfaces */
  canvas: palette.graphite[100],
  surface: palette.graphite[0],
  surfaceSubtle: palette.graphite[50],
  surfaceSunken: palette.graphite[100],
  surfaceInverse: palette.graphite[900],
  overlay: 'rgba(18, 22, 28, 0.62)',

  /* Text */
  ink: palette.graphite[900],
  inkMuted: palette.graphite[600],
  inkSubtle: palette.graphite[500],
  inkInverse: palette.graphite[0],
  inkOnBrand: palette.graphite[0],

  /* Lines */
  border: palette.graphite[200],
  borderStrong: palette.graphite[300],
  borderInverse: palette.graphite[700],
  grid: palette.graphite[200],
  gridStrong: palette.graphite[300],

  /* Brand */
  primary: palette.cobalt[500],
  primaryHover: palette.cobalt[600],
  primaryActive: palette.cobalt[700],
  primarySoft: palette.cobalt[50],
  primaryBorder: palette.cobalt[200],

  accent: palette.ember[500],
  accentHover: palette.ember[600],
  accentSoft: palette.ember[50],
  accentBorder: palette.ember[200],

  support: palette.verdigris[500],
  supportSoft: palette.verdigris[50],
  supportBorder: palette.verdigris[200],

  /* Status */
  info: palette.cobalt[500],
  infoSoft: palette.cobalt[50],
  success: palette.verdigris[500],
  successSoft: palette.verdigris[50],
  warning: palette.amber[400],
  warningSoft: palette.amber[50],
  danger: palette.coral[400],
  dangerSoft: palette.coral[50],

  /* Interaction */
  focusRing: palette.cobalt[400],
  selection: palette.cobalt[500],
  selectionWash: 'rgba(42, 75, 216, 0.10)',
  snapGuide: palette.ember[500],
} as const;

/**
 * The tones an on-canvas element may be tinted with. Every CI element inherits
 * one of these; there is no free-form colour picker by design.
 */
export const elementTones = {
  neutral: {
    label: 'Neutral',
    fill: palette.graphite[0],
    softFill: palette.graphite[50],
    border: palette.graphite[200],
    text: palette.graphite[900],
    accentText: palette.graphite[600],
    solidFill: palette.graphite[900],
    solidText: palette.graphite[0],
  },
  primary: {
    label: 'Cobalt',
    fill: palette.cobalt[50],
    softFill: palette.cobalt[50],
    border: palette.cobalt[200],
    text: palette.cobalt[900],
    accentText: palette.cobalt[600],
    solidFill: palette.cobalt[500],
    solidText: palette.graphite[0],
  },
  accent: {
    label: 'Ember',
    fill: palette.ember[50],
    softFill: palette.ember[50],
    border: palette.ember[200],
    text: palette.ember[900],
    accentText: palette.ember[600],
    solidFill: palette.ember[500],
    solidText: palette.graphite[0],
  },
  support: {
    label: 'Verdigris',
    fill: palette.verdigris[50],
    softFill: palette.verdigris[50],
    border: palette.verdigris[200],
    text: palette.verdigris[900],
    accentText: palette.verdigris[600],
    solidFill: palette.verdigris[500],
    solidText: palette.graphite[0],
  },
  warning: {
    label: 'Amber',
    fill: palette.amber[50],
    softFill: palette.amber[50],
    border: palette.amber[200],
    text: palette.amber[900],
    accentText: palette.amber[600],
    solidFill: palette.amber[400],
    solidText: palette.graphite[900],
  },
  danger: {
    label: 'Coral',
    fill: palette.coral[50],
    softFill: palette.coral[50],
    border: palette.coral[200],
    text: palette.coral[900],
    accentText: palette.coral[600],
    solidFill: palette.coral[400],
    solidText: palette.graphite[0],
  },
  inverse: {
    label: 'Graphite',
    fill: palette.graphite[900],
    softFill: palette.graphite[800],
    border: palette.graphite[700],
    text: palette.graphite[0],
    accentText: palette.graphite[300],
    solidFill: palette.graphite[900],
    solidText: palette.graphite[0],
  },
} as const;

export type ToneName = keyof typeof elementTones;
export const toneNames = Object.keys(elementTones) as ToneName[];

/* -------------------------------------------------------------------------- */
/* Typography                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Font stacks. The app is offline-only, so the stacks are built to degrade to
 * high-quality system faces when the licensed brand font is absent.
 *
 * To ship the licensed face, drop `NozillaSans-{400,500,600,700}.woff2` into
 * `public/fonts/` — `src/index.css` already declares the matching @font-face
 * rules and the family is first in the stack.
 */
export const fontFamily = {
  display:
    "'Nozilla Sans', 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  body:
    "'Nozilla Sans', 'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono:
    "'Nozilla Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

/**
 * The optional licensed brand face. Drop the listed files into `public/fonts/`
 * and they are picked up automatically at boot (`src/theme/fonts.ts`); when a
 * file is absent the browser simply falls through to the next family in the
 * stack, so the app never depends on a binary asset being present.
 */
export const webfont = {
  /**
   * Flip to `true` once the files below are present in `public/fonts/`.
   * Left off by default so a fresh checkout never requests a font that is not
   * there — the CI stack falls back to the system faces instead.
   */
  enabled: false,
  family: 'Nozilla Sans',
  directory: 'fonts',
  faces: [
    { weight: 400, style: 'normal', file: 'NozillaSans-Regular.woff2' },
    { weight: 500, style: 'normal', file: 'NozillaSans-Medium.woff2' },
    { weight: 600, style: 'normal', file: 'NozillaSans-SemiBold.woff2' },
    { weight: 700, style: 'normal', file: 'NozillaSans-Bold.woff2' },
    { weight: 400, style: 'italic', file: 'NozillaSans-Italic.woff2' },
  ],
} as const;

/** PDF has no web fonts; these are the metric-compatible core-14 substitutes. */
export const pdfFontFamily = {
  display: 'helvetica',
  body: 'helvetica',
  mono: 'courier',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Type scale — sizes are in *slide units* (the deck is authored at
 * `canvas.width` × `canvas.height` and scaled to fit), which keeps exported
 * SVG/PDF pixel-identical to the on-screen rendering.
 */
export const typeScale = {
  display: { size: 64, lineHeight: 1.06, weight: fontWeight.bold, tracking: -0.022, family: 'display' },
  h1: { size: 46, lineHeight: 1.1, weight: fontWeight.bold, tracking: -0.02, family: 'display' },
  h2: { size: 34, lineHeight: 1.16, weight: fontWeight.semibold, tracking: -0.015, family: 'display' },
  h3: { size: 25, lineHeight: 1.24, weight: fontWeight.semibold, tracking: -0.01, family: 'display' },
  h4: { size: 20, lineHeight: 1.3, weight: fontWeight.semibold, tracking: -0.005, family: 'display' },
  lead: { size: 22, lineHeight: 1.5, weight: fontWeight.regular, tracking: -0.005, family: 'body' },
  body: { size: 18, lineHeight: 1.55, weight: fontWeight.regular, tracking: 0, family: 'body' },
  small: { size: 15, lineHeight: 1.5, weight: fontWeight.regular, tracking: 0, family: 'body' },
  caption: { size: 13, lineHeight: 1.4, weight: fontWeight.medium, tracking: 0.005, family: 'body' },
  overline: { size: 12, lineHeight: 1.3, weight: fontWeight.bold, tracking: 0.09, family: 'body' },
  code: { size: 15, lineHeight: 1.6, weight: fontWeight.regular, tracking: 0, family: 'mono' },
  codeInline: { size: 15.5, lineHeight: 1.4, weight: fontWeight.medium, tracking: 0, family: 'mono' },
} as const;

export type TypeStyleName = keyof typeof typeScale;

/** Chrome (toolbars, panels) uses a compact, fixed UI scale — never the deck scale. */
export const uiType = {
  label: { size: 12, lineHeight: 1.35, weight: fontWeight.semibold, tracking: 0.02 },
  body: { size: 13, lineHeight: 1.45, weight: fontWeight.regular, tracking: 0 },
  title: { size: 15, lineHeight: 1.3, weight: fontWeight.semibold, tracking: -0.005 },
  mono: { size: 12, lineHeight: 1.5, weight: fontWeight.regular, tracking: 0 },
} as const;

/* -------------------------------------------------------------------------- */
/* Form: radii, strokes, spacing, elevation                                    */
/* -------------------------------------------------------------------------- */

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  '2xl': 32,
  pill: 999,
} as const;

/** CI line weights. Anything drawn on the canvas uses one of these. */
export const stroke = {
  hairline: 1,
  regular: 1.5,
  medium: 2,
  bold: 2.5,
  heavy: 4,
} as const;

export const strokeNames = ['hairline', 'regular', 'medium', 'bold', 'heavy'] as const;
export type StrokeName = (typeof strokeNames)[number];

/** 4px base grid. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(18, 22, 28, 0.06)',
  sm: '0 1px 3px rgba(18, 22, 28, 0.08), 0 1px 2px rgba(18, 22, 28, 0.04)',
  md: '0 4px 10px rgba(18, 22, 28, 0.08), 0 1px 3px rgba(18, 22, 28, 0.05)',
  lg: '0 12px 28px rgba(18, 22, 28, 0.12), 0 2px 6px rgba(18, 22, 28, 0.06)',
  xl: '0 24px 56px rgba(18, 22, 28, 0.16), 0 4px 10px rgba(18, 22, 28, 0.06)',
  focus: `0 0 0 3px rgba(42, 75, 216, 0.28)`,
} as const;

/* -------------------------------------------------------------------------- */
/* Motion                                                                      */
/* -------------------------------------------------------------------------- */

export const motion = {
  duration: {
    instant: 90,
    fast: 160,
    base: 240,
    slow: 380,
    slide: 460,
  },
  easing: {
    /** Standard CI ease — slightly overshoot-free, confident. */
    standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    entrance: 'cubic-bezier(0.16, 0.84, 0.44, 1)',
    exit: 'cubic-bezier(0.55, 0, 0.85, 0.35)',
    spring: 'cubic-bezier(0.34, 1.32, 0.64, 1)',
  },
  /** Delay between successive element reveals when a step contains many items. */
  stagger: 55,
} as const;

/* -------------------------------------------------------------------------- */
/* Canvas / deck geometry                                                      */
/* -------------------------------------------------------------------------- */

export const canvas = {
  /** Authoring resolution. 16:9. All element coordinates are in these units. */
  width: 1280,
  height: 720,
  /** Safe area inset for flow content. */
  margin: { top: 72, right: 88, bottom: 72, left: 88 },
  /** Snap-to-grid step, and the dot spacing drawn behind the slide. */
  gridSize: 8,
  gridMajorEvery: 5,
  /** Distance (in slide units) at which smart alignment guides engage. */
  snapThreshold: 6,
  minElementSize: 24,
  zoom: { min: 0.2, max: 3, step: 0.1 },
} as const;

/* -------------------------------------------------------------------------- */
/* Element defaults — every placed element inherits from here                  */
/* -------------------------------------------------------------------------- */

export const elementDefaults = {
  text: {
    width: 420,
    height: 90,
    tone: 'neutral' as ToneName,
    typeStyle: 'h3' as TypeStyleName,
    padding: space[3],
    align: 'left' as const,
  },
  markdown: {
    width: 520,
    height: 260,
    tone: 'neutral' as ToneName,
    padding: space[6],
    radius: radius.lg,
    strokeWeight: 'hairline' as StrokeName,
  },
  card: {
    width: 320,
    height: 200,
    tone: 'primary' as ToneName,
    padding: space[6],
    radius: radius.lg,
    strokeWeight: 'hairline' as StrokeName,
  },
  badge: {
    width: 148,
    height: 40,
    tone: 'primary' as ToneName,
    radius: radius.pill,
    strokeWeight: 'hairline' as StrokeName,
  },
  icon: {
    width: 72,
    height: 72,
    tone: 'primary' as ToneName,
    strokeWeight: 'regular' as StrokeName,
  },
  shape: {
    width: 240,
    height: 160,
    tone: 'primary' as ToneName,
    radius: radius.md,
    strokeWeight: 'regular' as StrokeName,
  },
  connector: {
    width: 220,
    height: 0,
    tone: 'neutral' as ToneName,
    strokeWeight: 'medium' as StrokeName,
  },
  image: {
    width: 360,
    height: 240,
    tone: 'neutral' as ToneName,
    radius: radius.md,
  },
} as const;

/** The transitions a slide may declare in its metadata. */
export const slideTransitions = ['none', 'fade', 'slide', 'push', 'zoom', 'rise'] as const;
export type SlideTransition = (typeof slideTransitions)[number];

/** The reveal animations an element may declare. */
export const revealAnimations = ['fade', 'rise', 'zoom', 'slide-left', 'slide-right', 'draw'] as const;
export type RevealAnimation = (typeof revealAnimations)[number];

/** Slide layout presets for flow (Markdown) content. */
export const slideLayouts = ['title', 'default', 'section', 'split', 'quote', 'blank', 'canvas'] as const;
export type SlideLayout = (typeof slideLayouts)[number];

/* -------------------------------------------------------------------------- */
/* Aggregate export                                                            */
/* -------------------------------------------------------------------------- */

export const theme = {
  brand,
  palette,
  color,
  elementTones,
  fontFamily,
  webfont,
  pdfFontFamily,
  fontWeight,
  typeScale,
  uiType,
  radius,
  stroke,
  space,
  shadow,
  motion,
  canvas,
  elementDefaults,
} as const;

export type Theme = typeof theme;
export default theme;
