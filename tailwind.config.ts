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
  ui,
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
      'ui-canvas': ui.canvas,
      'ui-surface': ui.surface,
      'ui-subtle': ui.surfaceSubtle,
      'ui-sunken': ui.surfaceSunken,
      'ui-inverse': ui.surfaceInverse,
      'ui-overlay': ui.overlay,
      'ui-ink': ui.ink,
      'ui-muted': ui.inkMuted,
      'ui-faint': ui.inkSubtle,
      'ui-on-inverse': ui.inkInverse,
      ui: ui.border,
      'ui-strong': ui.borderStrong,
      'ui-accent': ui.accent,
      'ui-accent-hover': ui.accentHover,
      'ui-accent-active': ui.accentActive,
      'ui-accent-soft': ui.accentSoft,
      'ui-accent-border': ui.accentBorder,
      'ui-on-accent': ui.onAccent,
      'ui-select': ui.select,
      'ui-select-wash': ui.selectWash,
      'ui-inverse-line': ui.borderInverse,
      'ui-warn': ui.warn,
      'ui-warn-bg': ui.warnBg,
      'ui-danger': ui.danger,
      'ui-danger-bg': ui.dangerBg,
      'ui-info': ui.info,
      'ui-info-bg': ui.infoBg,
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
      ...(Object.fromEntries(
        Object.entries(uiShadow).map(([key, value]) => [`ui-${key}`, value]),
      ) as Record<string, string>),
    },
    spacing: {
      px: '1px',
      ...gridSpacing,
      ...(Object.fromEntries(
        Object.entries(space).map(([key, value]) => [key, px(value)]),
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
