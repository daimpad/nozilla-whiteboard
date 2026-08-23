import type { Config } from 'tailwindcss';
import {
  color,
  fontFamily,
  inkAlpha,
  motion,
  palette,
  RADIUS,
  shadow,
  space,
  stroke,
  uiRadius,
  uiShadow,
  uiType,
} from './theme.config';

/**
 * Tailwind wird *aus* `theme.config.ts` erzeugt. Die Standard-Palette wird
 * ersetzt statt erweitert — ein versehentliches `bg-blue-500` ist damit ein
 * sichtbarer Fehler und kein stiller CI-Bruch.
 *
 * Zwei getrennte Namensräume, weil es zwei getrennte Dinge sind:
 *
 *   `bg-signal`, `text-ink`, `border-line`, `shadow-md`, `rounded-none`
 *       → die Marke. Gehört auf die Folie.
 *   `bg-ui-surface`, `text-ui-ink`, `border-ui`, `shadow-ui-md`, `rounded-md`
 *       → das Werkzeug. Gehört in Leisten, Paletten und Felder.
 *
 * Der Namensraum ist die Kontrolle: `bg-paper` in einer Werkzeugleiste sticht
 * beim Lesen sofort heraus, `bg-ui-surface` in einem Export-Pfad ebenso.
 */
const px = (n: number) => `${n}px`;

/**
 * Die Farben der Oberfläche stehen als CSS-Variable, nicht als Wert.
 *
 * Der Grund ist die Einstellung „Erscheinung" (`src/theme/surface.ts`): hell
 * und dunkel tauschen zur Laufzeit die Belegung, und ein zur Bauzeit
 * eingebackenes `#FFFFFF` ließe sich danach nicht mehr umstimmen. Geschrieben
 * werden die Variablen von `applyThemeVariables()`.
 *
 * Die Marke bleibt ein Wert. Sie wechselt zwar auch — aber nicht im DOM: die
 * Folie wird als SVG-Markup gezeichnet, und die zwei Marken-Klassen im ganzen
 * Komponentenbaum stehen an Stellen, die kein Erscheinungsbild anfasst.
 *
 * `rgb(var(--x) / <alpha-value>)` statt `var(--x)`, weil Tailwind sonst keinen
 * Deckkraft-Zusatz rechnen kann: `bg-ui-surface/85` verpuffte still, und die
 * Leisten über der Folie verlören ihre Durchsicht. Farben, die schon eine
 * Deckkraft tragen, gibt es als Kanal-Tripel nicht — die stehen direkt da.
 */
const uiVar = (name: string) => `rgb(var(--nz-ui-${name}-rgb) / <alpha-value>)`;
const uiRaw = (name: string) => `var(--nz-ui-${name})`;

/**
 * Das 4px-Raster der CI, in halben Schritten ausgerollt. Die benannten Stufen
 * bleiben das Vokabular für Design-Entscheidungen; das hier ist das Raster,
 * auf dem sie sitzen — und es verhindert, dass eine Utility still verpufft,
 * weil ihre Stufe zufällig keinen Namen hat.
 */
const GRID_BASE = 4;
const gridSpacing = Object.fromEntries(
  Array.from({ length: 193 }, (_, index) => index / 2).map((step) => [
    String(step),
    px(step * GRID_BASE),
  ]),
) as Record<string, string>;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      /* Die Marke — drei Rollen, mehr nicht. */
      signal: palette.signal,
      'signal-strong': palette.signalStrong,
      'signal-soft': palette.signalSoft,
      paper: palette.paper,
      'paper-alt': palette.paperAlt,
      'paper-deep': palette.paperDeep,
      white: palette.white,
      ink: palette.ink,
      'ink-900': palette.ink900,
      'ink-800': palette.ink800,
      'ink-700': palette.ink700,
      'ink-600': palette.ink600,
      'ink-70': inkAlpha[70],
      'ink-50': inkAlpha[50],
      'ink-20': inkAlpha[20],

      /* Status — nur Feedback, nie Dekoration. */
      warn: palette.warn,
      'warn-bg': color.warnBg,
      danger: palette.danger,
      'danger-bg': color.dangerBg,
      info: palette.info,
      'info-bg': color.infoBg,

      /* Semantische Aliase der Marke */
      canvas: color.canvas,
      surface: color.surface,
      'surface-alt': color.surfaceAlt,
      'surface-raised': color.surfaceRaised,
      'surface-inverse': color.surfaceInverse,
      'ink-muted': color.inkMuted,
      'ink-subtle': color.inkSubtle,
      'ink-inverse': color.inkInverse,
      line: color.line,
      'line-soft': color.lineSoft,

      /* Die Werkzeug-Oberfläche — neutral, nie auf einer Folie. */
      'ui-canvas': uiVar('canvas'),
      'ui-surface': uiVar('surface'),
      'ui-subtle': uiVar('surface-subtle'),
      'ui-sunken': uiVar('surface-sunken'),
      'ui-inverse': uiVar('surface-inverse'),
      'ui-overlay': uiRaw('overlay'),
      'ui-ink': uiVar('ink'),
      'ui-muted': uiVar('ink-muted'),
      'ui-faint': uiVar('ink-subtle'),
      'ui-on-inverse': uiVar('ink-inverse'),
      ui: uiVar('border'),
      'ui-strong': uiVar('border-strong'),
      'ui-accent': uiVar('accent'),
      'ui-accent-hover': uiVar('accent-hover'),
      'ui-accent-active': uiVar('accent-active'),
      'ui-accent-soft': uiVar('accent-soft'),
      'ui-accent-border': uiVar('accent-border'),
      'ui-on-accent': uiVar('on-accent'),
      'ui-select': uiVar('select'),
      'ui-select-wash': uiRaw('select-wash'),
      'ui-inverse-line': uiVar('border-inverse'),
      'ui-warn': uiVar('warn'),
      'ui-warn-bg': uiVar('warn-bg'),
      'ui-danger': uiVar('danger'),
      'ui-danger-bg': uiVar('danger-bg'),
      'ui-info': uiVar('info'),
      'ui-info-bg': uiVar('info-bg'),
    },
    fontFamily: {
      display: [fontFamily.display],
      sans: [fontFamily.body],
      mono: [fontFamily.mono],
    },
    /*
     * Auf der Folie ist der Radius 0 — dafür steht `rounded-none`, und der
     * Szenen-Renderer kennt ohnehin nur `RADIUS`. Die abgerundeten Stufen
     * gehören der Oberfläche: ein Knopf in einer Werkzeugleiste ist kein
     * Folienobjekt, und ihn eckig zu machen hat die Marke nie gefordert.
     */
    borderRadius: {
      none: String(RADIUS),
      DEFAULT: px(uiRadius.sm),
      ...(Object.fromEntries(
        Object.entries(uiRadius).map(([key, value]) => [key, px(value)]),
      ) as Record<string, string>),
    },
    borderWidth: {
      0: '0',
      ...Object.fromEntries(Object.entries(stroke).map(([key, value]) => [key, px(value)])),
      1: px(1),
      2: px(stroke.rule),
      3: px(stroke.strong),
      4: px(stroke.heavy),
      /* Die Oberfläche zeichnet Haarlinien; die CI-Stärken heißen `border-rule`
         und aufwärts und bleiben der Bühne vorbehalten. */
      DEFAULT: px(1),
    } as Record<string, string>,
    /* `shadow-md` = harter Marken-Versatz, `shadow-ui-md` = weiche Ebene. */
    boxShadow: {
      ...shadow,
      // Auch die Schatten wechseln mit der Erscheinung: auf dunklem Grund
      // trägt ein weicher Schatten nichts, dort muss er tiefer sein.
      ...(Object.fromEntries(
        Object.keys(uiShadow).map((key) => [`ui-${key}`, `var(--nz-ui-shadow-${key})`]),
      ) as Record<string, string>),
    },
    /*
     * Nur das Raster trägt die Zahlen. Die benannten CI-Stufen stehen daneben
     * unter `ci-*`, weil sie sich sonst *überschreiben*: `space[8]` ist 64px,
     * die achte Rasterstufe ist 32px — ein `h-8`-Knopf wurde damit doppelt so
     * groß wie gebaut, und `top-9` schob ein Menü 96px statt 36px nach unten.
     *
     * Die beiden Sätze meinen auch Verschiedenes. Die Zahlen sind das
     * Werkzeug-Raster; die CI-Stufen sind Folienmaße, und die liest der
     * Szenen-Renderer ohnehin direkt aus `theme.config.ts`. Wer sie doch im
     * DOM braucht, schreibt `p-ci-5` — und man sieht es der Klasse an.
     */
    spacing: {
      px: '1px',
      ...gridSpacing,
      ...(Object.fromEntries(
        Object.entries(space).map(([key, value]) => [`ci-${key}`, px(value)]),
      ) as Record<string, string>),
    },
    fontSize: {
      'ui-label': [px(uiType.label.size), { lineHeight: String(uiType.label.lineHeight) }],
      'ui-body': [px(uiType.body.size), { lineHeight: String(uiType.body.lineHeight) }],
      'ui-title': [px(uiType.title.size), { lineHeight: String(uiType.title.lineHeight) }],
      'ui-mono': [px(uiType.mono.size), { lineHeight: String(uiType.mono.lineHeight) }],
    },
    fontWeight: {
      normal: '400',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      /* Für Abschnittsüberschriften in der Oberfläche. */
      wide: '0.02em',
      wider: '0.09em',
      /* 0.12em ist die Label-Laufweite der CI — auf der Folie, nicht im Formular. */
      label: '0.12em',
    },
    transitionDuration: Object.fromEntries(
      Object.entries(motion.duration).map(([key, value]) => [key, `${value}ms`]),
    ) as Record<string, string>,
    transitionTimingFunction: { ...motion.easing },
    zIndex: {
      base: '0',
      canvas: '10',
      chrome: '100',
      popover: '400',
      modal: '600',
      toast: '800',
    },
    extend: {
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pop-in': `pop-in ${motion.duration.fast}ms ${motion.easing.standard} both`,
        'fade-in': `fade-in ${motion.duration.base}ms ${motion.easing.standard} both`,
      },
    },
  },
  plugins: [],
};

export default config;
