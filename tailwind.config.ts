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
  uiType,
} from './theme.config';

/**
 * Tailwind wird *aus* `theme.config.ts` erzeugt. Die Standard-Palette wird
 * ersetzt statt erweitert — ein versehentliches `bg-blue-500` ist damit ein
 * sichtbarer Fehler und kein stiller CI-Bruch.
 *
 * Die Radius-Skala hat genau einen Eintrag: 0. `rounded-lg` existiert nicht,
 * weil es in dieser Marke nichts gibt, das es beschreiben könnte.
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

      /* Semantische Aliase */
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
    },
    fontFamily: {
      display: [fontFamily.display],
      sans: [fontFamily.body],
      mono: [fontFamily.mono],
    },
    /* Der Radius ist 0. Es gibt keinen zweiten Wert. */
    borderRadius: { none: String(RADIUS), DEFAULT: String(RADIUS) },
    borderWidth: {
      0: '0',
      ...Object.fromEntries(Object.entries(stroke).map(([key, value]) => [key, px(value)])),
      1: px(1),
      2: px(stroke.rule),
      3: px(stroke.strong),
      4: px(stroke.heavy),
      DEFAULT: px(stroke.rule),
    } as Record<string, string>,
    boxShadow: { ...shadow },
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
      /* 0.12em ist die Label-Laufweite der CI. */
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
          '0%': { opacity: '0', transform: 'translate(-2px, -2px)' },
          '100%': { opacity: '1', transform: 'translate(0, 0)' },
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
