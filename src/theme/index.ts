/**
 * Laufzeit-Zugriff auf die CI. Komponenten importieren von hier — oder
 * benutzen die Tailwind-Klassen, die aus derselben Quelle erzeugt werden.
 *
 * Die Fassade hat zwei Quellen, und der Unterschied ist der Kern des Aufbaus:
 *
 *   **Inhalt** kommt aus `runtime.ts`. Diese Werte gehören dem gerade
 *   gewählten Erscheinungsbild und wechseln mit ihm. Es sind lebendige
 *   Bindungen — wer sie beim Laden in eine Konstante schreibt, friert das
 *   Erscheinungsbild vom Start ein.
 *
 *   **Werkzeug** kommt weiter aus `theme.config.ts`. `ui`, `uiRadius`,
 *   `uiShadow`, `uiType` sind für jede Marke dieselben, und das ist
 *   Absicht: die Leiste soll nicht mitfärben.
 *
 * Was strukturell ist — Radius, Foliengröße, Raster, Layouts, Übergänge —
 * steht ebenfalls weiter in der Konfiguration. Warum, steht in `brandTheme.ts`.
 */
export {
  brand,
  wordmark,
  iconSet,
  palette,
  inkAlpha,
  paperAlpha,
  color,
  elementTones,
  toneNames,
  fontFamily,
  webfont,
  pdfFontFamily,
  textScale,
  typeScale,
  stroke,
  shadowOffset,
} from './runtime';

export {
  activeTheme,
  availableThemes,
  isThemeId,
  registerTheme,
  setActiveTheme,
  withTheme,
  subscribeTheme,
  themeVersion,
} from './runtime';

export {
  activeUi,
  activeUiShadow,
  isSurfaceMode,
  setSurfaceMode,
  subscribeSurface,
  surface,
  surfaceMode,
  surfaceModes,
  surfaceVersion,
  watchSystemSurface,
} from './surface';
export type { Surface, SurfaceMode } from './surface';

export { readPaths, readViewBox, ungeleseneAngaben, wordmarkFromSvg } from './wordmark';
export type { Wordmark } from './wordmark';

// Ein Icon-Set ist eine Belegung des Erscheinungsbilds wie die Palette. Der
// Typ steht bei den Zeichen, damit `brandTheme.ts` ein Blatt importiert und
// nicht die Fassade — sonst liefe der Import im Kreis.
export { nozillaIcons } from '@/assets/iconSet';
export type { IconDef, IconSet } from '@/assets/iconSet';

// Die Bausteine, aus denen eine Designdatei ein Erscheinungsbild
// zusammensetzt. Sie stehen in `brandTheme.ts`, weil dort auch die Grenze
// steht, die sie einhalten.
export {
  colorsFromPalette,
  nozillaTheme,
  toneLabels,
  tonesFromPalette,
  tonesOutsidePalette,
} from './brandTheme';

export type {
  AlphaSteps,
  BrandTheme,
  BrandInfo,
  ColorRole,
  ColorTokens,
  ElementTone,
  ElementTones,
  FamilyRole,
  FontFamilies,
  Palette,
  PaletteRole,
  PdfFontFamilies,
  ShadowRole,
  ShadowOffsets,
  StrokeRole,
  StrokeWidths,
  TextScale,
  TextStepRole,
  ToneRole,
  TypeScale,
  TypeStyle,
  TypeStyleRole,
  Webfont,
  WebfontFace,
} from './brandTheme';

export {
  ui,
  uiRadius,
  uiShadow,
  fontWeight,
  syntheticItalicDegrees,
  uiType,
  RADIUS,
  strokeNames,
  shadowNames,
  space,
  shadow,
  motion,
  elementDefaults,
  slideTransitions,
  revealAnimations,
  slideLayouts,
  forbiddenWords,
  MAX_MARKERS_PER_PARAGRAPH,
  /*
     `theme` und `Theme` standen hier und sind heraus.

     Der Sammel-Export von `theme.config.ts` trägt dieselben Namen wie die
     lebendigen Bindungen — nur eingefroren auf nozilla. Gemessen unter dem
     Musterkunden im selben Lauf: `palette.signal` ist #FF5A1F,
     `theme.palette.signal` #00FF9C; `typeScale.h1.size` ist 61 gegen 68. Wer
     ihn aus *dieser* Datei zieht, holt sich die Falle, gegen die die ganze
     Fassade gebaut ist, unter einem Namen, der wie die Laufzeit aussieht.

     Aufrufer hatte er keinen — und genau so ist die tote Fassung von
     `familyStack()` schon einmal aufgefallen: die tote ist die, die der
     Nächste findet und benutzt. Wer nozillas Werte wirklich als Wert braucht,
     nimmt `nozillaTheme`; dieser Name sagt, dass es nur nozilla ist.
  */
} from '@theme';

export type {
  ToneName,
  StrokeName,
  ShadowName,
  TypeStyleName,
  SlideTransition,
  RevealAnimation,
  SlideLayout,
} from '@theme';

import {
  motion,
  RADIUS,
  space,
  uiRadius,
  type ShadowName,
  type StrokeName,
  type ToneName,
  type TypeStyleName,
} from '@theme';
// Wechselnde Werte: aus der Laufzeit, nicht aus der Konfiguration. Die
// Helfer unten und `cssVariables()` lesen sie bei jedem Aufruf neu.
import {
  color,
  elementTones,
  fontFamily,
  palette,
  shadowOffset,
  stroke,
  typeScale,
} from './runtime';
/*
   Und das Folienmaß ebenso. Es steht zwar in der CI und ist strukturell — was
   hier wechselt, ist nicht die Marke, sondern das Blatt, auf dem *dieses Deck*
   liegt. Wer `canvas` weiterhin aus `@theme` zöge, bekäme die Höhe des
   Formats, das beim Start galt.
*/
import { canvas as canvasTokens } from './folienformat';

export {
  canvas,
  folienformate,
  folienhoehe,
  istFolienformat,
  aktivesFolienformat,
  setzeFolienformat,
  subscribeFolienformat,
  folienformatVersion,
  DIN_HOCH,
} from './folienformat';
export type { Folienformat, Folienmasse } from './folienformat';
// Die Erscheinung des Werkzeugs — hell oder dunkel. Sie wechselt unabhängig
// vom Erscheinungsbild der Folie; warum, steht in `surface.ts`.
import { activeUi, activeUiShadow, surface } from './surface';

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
 * Der Name der Schrift hinter einer Rolle — der erste Eintrag ihres Stapels,
 * entkleidet: `'Zilla Slab', Georgia, serif` → `Zilla Slab`.
 *
 * Alles außerhalb des Browsers braucht diesen Namen und nicht den Stapel: der
 * PDF-Export sucht damit die Datei, PowerPoint zeigt ihn in der
 * Schriftauswahl. Die Ersatzschriften dahinter sind eine Browser-Idee.
 *
 * Er wird bei jedem Aufruf gelesen. Als Tabelle auf Modulebene hat er schon
 * einmal Schaden angerichtet: `display` stand dort fest auf „Zilla Slab", und
 * ein Erscheinungsbild mit anderer Auszeichnungsschrift fand seine Datei nicht
 * — im PDF stand dann Helvetica, ohne dass jemand einen Fehler sah.
 */
export function familyName(family: 'display' | 'body' | 'mono'): string {
  const first = fontFamily[family].split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
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
  //
  // Neben dem Wert steht sein Kanal-Tripel: Tailwind braucht `r g b`, um
  // `bg-ui-surface/85` überhaupt rechnen zu können. Farben, die schon eine
  // Deckkraft tragen (`overlay`, `selectWash`), bekommen keins — ein zweites
  // Alpha darüber wäre keine sinnvolle Angabe.
  for (const [key, value] of Object.entries(activeUi())) {
    vars[`--nz-ui-${kebab(key)}`] = value;
    const channels = rgbChannels(value);
    if (channels) vars[`--nz-ui-${kebab(key)}-rgb`] = channels;
  }
  for (const [key, value] of Object.entries(uiRadius)) {
    vars[`--nz-ui-radius-${kebab(key)}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(activeUiShadow())) {
    vars[`--nz-ui-shadow-${kebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(stroke)) {
    vars[`--nz-stroke-${kebab(key)}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(space)) {
    vars[`--nz-space-${key}`] = `${value}px`;
  }
  /*
     Gerechnet, nicht durchgereicht.

     Hier stand `Object.entries(shadow)` — eine Tabelle, die `theme.config.ts`
     beim Laden aus nozillas `palette.ink`, `palette.signal` und `shadowOffset`
     zusammensetzt. Gemessen unter dem Musterkunden, dessen Tinte #1A1614 und
     dessen Signal #FF5A1F ist: `--nz-shadow-sm` blieb „3px 3px 0 0 #000000"
     und `--nz-shadow-signal` „6px 6px 0 0 #00FF9C". Die Farbvariablen daneben
     wechseln mit, diese fünf nicht — dieselbe Bauart wie die Folienhöhe, die
     einmal auf 720px stehen blieb, während die Folie 1810 hoch war.

     Gelesen hat sie bis heute niemand; `src/index.css` zieht nur `--nz-ui-*`
     und `--nz-font-*`. Das ist keine Entlastung, sondern die Beschreibung
     eines Werts, der auf den Nächsten wartet — und der Kopf dieser Funktion
     sagt, wofür er dasteht: „damit fremdes CSS sie ziehen kann".

     Die Tailwind-Klassen bleiben bauzeitlich und damit bei nozilla; sie
     gehören der Oberfläche, und die wechselt mit Absicht nicht mit.
  */
  const schatten: Record<string, string> = {
    none: 'none',
    sm: `${shadowOffset.sm}px ${shadowOffset.sm}px 0 0 ${palette.ink}`,
    md: `${shadowOffset.md}px ${shadowOffset.md}px 0 0 ${palette.ink}`,
    lg: `${shadowOffset.lg}px ${shadowOffset.lg}px 0 0 ${palette.ink}`,
    signal: `${shadowOffset.md}px ${shadowOffset.md}px 0 0 ${palette.signal}`,
    focus: `0 0 0 3px ${palette.signalStrong}`,
  };
  for (const [key, value] of Object.entries(schatten)) {
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

/**
 * Die CI-Variablen auf ein Dokument setzen. Mehrfach aufrufbar.
 *
 * Dazu `color-scheme`: daran hängen die Dinge, die nicht uns gehören —
 * Bildlaufleisten, Auswahlfelder, die Schrift in einem Datumsfeld. Ohne die
 * Angabe bleibt eine dunkle Oberfläche an genau diesen Stellen hell und sieht
 * halb fertig aus.
 */
export function applyThemeVariables(root: HTMLElement = document.documentElement): void {
  const vars = cssVariables();
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = surface();
}

/**
 * `#RRGGBB` → `255 254 229`. Nur Vollfarben; alles andere gibt `null`.
 *
 * Tailwind setzt daraus `rgb(var(--x) / <alpha-value>)` zusammen. Ohne diesen
 * Umweg verpufft jeder Deckkraft-Zusatz still — `bg-ui-surface/85` wäre dann
 * einfach volle Deckung, und die Leisten über der Folie verlören ihre
 * Durchsicht, ohne dass es einen Fehler gäbe.
 */
function rgbChannels(value: string): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function kebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
