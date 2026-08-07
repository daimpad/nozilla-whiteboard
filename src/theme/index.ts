/**
 * Runtime access to the CI. Everything here is a thin, typed re-export of
 * `theme.config.ts` plus derived helpers. Components must never import raw
 * colour literals — they import from here (or use the Tailwind classes, which
 * are generated from the same file).
 */
export {
  brand,
  palette,
  color,
  elementTones,
  toneNames,
  fontFamily,
  webfont,
  pdfFontFamily,
  fontWeight,
  typeScale,
  uiType,
  radius,
  stroke,
  strokeNames,
  space,
  shadow,
  motion,
  canvas,
  elementDefaults,
  slideTransitions,
  revealAnimations,
  slideLayouts,
  theme,
} from '@theme';

export type {
  ToneName,
  StrokeName,
  TypeStyleName,
  SlideTransition,
  RevealAnimation,
  SlideLayout,
  Theme,
} from '@theme';

import {
  color,
  elementTones,
  fontFamily,
  motion,
  radius,
  shadow,
  space,
  stroke,
  typeScale,
  canvas as canvasTokens,
  type StrokeName,
  type ToneName,
  type TypeStyleName,
} from '@theme';

/** Resolve a tone name to its CI colour set, falling back to `neutral`. */
export function tone(name: ToneName | undefined) {
  return elementTones[name ?? 'neutral'] ?? elementTones.neutral;
}

/** Resolve a type-scale entry, falling back to `body`. */
export function typeStyle(name: TypeStyleName | undefined) {
  return typeScale[name ?? 'body'] ?? typeScale.body;
}

/** Resolve a named CI line weight to px. */
export function strokeWidth(name: StrokeName | undefined): number {
  return stroke[name ?? 'regular'] ?? stroke.regular;
}

/** The concrete font stack for a type-scale family key. */
export function familyStack(family: 'display' | 'body' | 'mono'): string {
  return fontFamily[family];
}

/**
 * CSS custom properties, injected once at boot on `:root`. This is what lets
 * plain CSS (`src/index.css`) and inline styles stay in lock-step with the CI
 * without duplicating any value.
 */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(color)) {
    vars[`--nzl-color-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(radius)) {
    vars[`--nzl-radius-${kebab(key)}`] = typeof value === 'number' ? `${value}px` : String(value);
  }
  for (const [key, value] of Object.entries(stroke)) {
    vars[`--nzl-stroke-${kebab(key)}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(space)) {
    vars[`--nzl-space-${key}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(shadow)) {
    vars[`--nzl-shadow-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(motion.duration)) {
    vars[`--nzl-duration-${kebab(key)}`] = `${value}ms`;
  }
  for (const [key, value] of Object.entries(motion.easing)) {
    vars[`--nzl-ease-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(fontFamily)) {
    vars[`--nzl-font-${kebab(key)}`] = value;
  }
  for (const [key, style] of Object.entries(typeScale)) {
    vars[`--nzl-type-${kebab(key)}-size`] = `${style.size}px`;
    vars[`--nzl-type-${kebab(key)}-lh`] = String(style.lineHeight);
    vars[`--nzl-type-${kebab(key)}-weight`] = String(style.weight);
    vars[`--nzl-type-${kebab(key)}-tracking`] = `${style.tracking}em`;
  }

  vars['--nzl-canvas-w'] = `${canvasTokens.width}px`;
  vars['--nzl-canvas-h'] = `${canvasTokens.height}px`;
  vars['--nzl-grid'] = `${canvasTokens.gridSize}px`;
  vars['--nzl-stagger'] = `${motion.stagger}ms`;

  return vars;
}

/** Apply the CI custom properties to a document root. Idempotent. */
export function applyThemeVariables(root: HTMLElement = document.documentElement): void {
  const vars = cssVariables();
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function kebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
