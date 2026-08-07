/**
 * Laufzeit-Zugriff auf die CI. Alles hier ist ein dünner, typisierter
 * Re-Export von `theme.config.ts` plus abgeleitete Helfer. Komponenten
 * importieren von hier — oder benutzen die Tailwind-Klassen, die aus derselben
 * Datei generiert werden.
 */
export {
  brand,
  palette,
  inkAlpha,
  paperAlpha,
  color,
  elementTones,
  toneNames,
  ui,
  uiRadius,
  uiShadow,
  fontFamily,
  webfont,
  pdfFontFamily,
  fontWeight,
  typeScale,
  uiType,
  RADIUS,
  stroke,
  strokeNames,
  shadowOffset,
  shadowNames,
  space,
  shadow,
  motion,
  canvas,
  elementDefaults,
  slideTransitions,
  revealAnimations,
  slideLayouts,
  forbiddenWords,
  MAX_MARKERS_PER_PARAGRAPH,
  theme,
} from '@theme';

export type {
  ToneName,
  StrokeName,
  ShadowName,
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
  RADIUS,
  shadow,
  shadowOffset,
  space,
  stroke,
  typeScale,
  ui,
  uiRadius,
  uiShadow,
  canvas as canvasTokens,
  type ShadowName,
  type StrokeName,
  type ToneName,
  type TypeStyleName,
} from '@theme';

/** Eine Flächenrolle auflösen; ohne Angabe gilt Papier. */
export function tone(name: ToneName | undefined) {
  return elementTones[name ?? 'paper'] ?? elementTones.paper;
}

/** Einen Eintrag der Typo-Hierarchie auflösen; ohne Angabe gilt Fließtext. */
export function typeStyle(name: TypeStyleName | undefined) {
  return typeScale[name ?? 'body'] ?? typeScale.body;
}

/** Eine benannte CI-Strichstärke in Pixel. */
export function strokeWidth(name: StrokeName | undefined): number {
  return stroke[name ?? 'rule'] ?? stroke.rule;
}

/** Den Versatz eines harten Schattens in Pixel. */
export function shadowSize(name: ShadowName | undefined): number {
  return shadowOffset[name ?? 'none'] ?? 0;
}

/** Der konkrete Schriftstapel zu einer Familien-Rolle. */
export function familyStack(family: 'display' | 'body' | 'mono'): string {
  return fontFamily[family];
}

/**
 * CSS-Custom-Properties, einmal beim Start auf `:root` gesetzt. Damit bleiben
 * reines CSS (`src/index.css`) und Inline-Styles im Gleichtakt mit der CI,
 * ohne einen Wert zu doppeln.
 */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(color)) {
    vars[`--nz-color-${kebab(key)}`] = value;
  }
  // Die Oberfläche bekommt ein eigenes Präfix. Wer `--nz-ui-*` in einer
  // Export-Datei sieht, sieht sofort, dass dort etwas falsch abgebogen ist.
  for (const [key, value] of Object.entries(ui)) {
    vars[`--nz-ui-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(uiRadius)) {
    vars[`--nz-ui-radius-${kebab(key)}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(uiShadow)) {
    vars[`--nz-ui-shadow-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(stroke)) {
    vars[`--nz-stroke-${kebab(key)}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(space)) {
    vars[`--nz-space-${key}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(shadow)) {
    vars[`--nz-shadow-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(motion.duration)) {
    vars[`--nz-dur-${kebab(key)}`] = `${value}ms`;
  }
  for (const [key, value] of Object.entries(motion.easing)) {
    vars[`--nz-ease-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(fontFamily)) {
    vars[`--nz-font-${kebab(key)}`] = value;
  }
  for (const [key, style] of Object.entries(typeScale)) {
    vars[`--nz-type-${kebab(key)}-size`] = `${style.size}px`;
    vars[`--nz-type-${kebab(key)}-lh`] = String(style.lineHeight);
    vars[`--nz-type-${kebab(key)}-weight`] = String(style.weight);
    vars[`--nz-type-${kebab(key)}-tracking`] = `${style.tracking}em`;
  }

  // Der Radius steht als Variable da, damit auch fremdes CSS ihn zieht — und
  // damit sichtbar ist, dass er 0 ist und bleibt.
  vars['--nz-radius'] = `${RADIUS}`;
  vars['--nz-canvas-w'] = `${canvasTokens.width}px`;
  vars['--nz-canvas-h'] = `${canvasTokens.height}px`;
  vars['--nz-grid'] = `${canvasTokens.gridSize}px`;
  vars['--nz-stagger'] = `${motion.stagger}ms`;

  return vars;
}

/** Die CI-Variablen auf ein Dokument setzen. Mehrfach aufrufbar. */
export function applyThemeVariables(root: HTMLElement = document.documentElement): void {
  const vars = cssVariables();
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function kebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
