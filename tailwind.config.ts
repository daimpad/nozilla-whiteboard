import type { Config } from 'tailwindcss';
import {
  color,
  fontFamily,
  motion,
  palette,
  radius,
  shadow,
  space,
  stroke,
  uiType,
} from './theme.config';

/**
 * Tailwind is generated *from* `theme.config.ts` so that utility classes can
 * never drift from the CI. `theme.extend` is deliberately narrow: the default
 * Tailwind palette is replaced outright, which makes an accidental
 * `bg-blue-500` a build-visible mistake rather than a silent CI violation.
 */
const px = (n: number) => `${n}px`;

/**
 * The CI declares a 4px base grid. Rather than exposing only the *named* steps,
 * the whole grid is generated in half-steps: `p-3` and `gap-1.5` are then both
 * on-grid, and a utility can never silently evaporate because its step happens
 * to have no name. The named tokens remain the vocabulary for design decisions;
 * this is the grid they sit on.
 */
const GRID_BASE = 4;
const gridSpacing = Object.fromEntries(
  Array.from({ length: 193 }, (_, index) => index / 2).map((step) => [
    Number.isInteger(step) ? String(step) : String(step),
    px(step * GRID_BASE),
  ]),
) as Record<string, string>;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      cobalt: palette.cobalt,
      ember: palette.ember,
      verdigris: palette.verdigris,
      amber: palette.amber,
      coral: palette.coral,
      graphite: palette.graphite,
      /* Semantic aliases — the preferred way to reach for colour in components. */
      canvas: color.canvas,
      surface: color.surface,
      'surface-subtle': color.surfaceSubtle,
      'surface-sunken': color.surfaceSunken,
      'surface-inverse': color.surfaceInverse,
      ink: color.ink,
      'ink-muted': color.inkMuted,
      'ink-subtle': color.inkSubtle,
      'ink-inverse': color.inkInverse,
      border: color.border,
      'border-strong': color.borderStrong,
      'border-inverse': color.borderInverse,
      primary: color.primary,
      'primary-hover': color.primaryHover,
      'primary-active': color.primaryActive,
      'primary-soft': color.primarySoft,
      'primary-border': color.primaryBorder,
      accent: color.accent,
      'accent-hover': color.accentHover,
      'accent-soft': color.accentSoft,
      support: color.support,
      'support-soft': color.supportSoft,
      info: color.info,
      success: color.success,
      warning: color.warning,
      danger: color.danger,
      'danger-soft': color.dangerSoft,
    },
    fontFamily: {
      display: [fontFamily.display],
      sans: [fontFamily.body],
      mono: [fontFamily.mono],
    },
    borderRadius: Object.fromEntries(
      Object.entries(radius).map(([k, v]) => [k, k === 'none' ? '0' : px(v as number)]),
    ) as Record<string, string>,
    borderWidth: {
      0: '0',
      // Numeric aliases keep the common utilities working; the named CI weights
      // are what components should reach for.
      1: px(1),
      2: px(2),
      4: px(4),
      ...Object.fromEntries(Object.entries(stroke).map(([k, v]) => [k, px(v as number)])),
      DEFAULT: px(stroke.hairline),
    } as Record<string, string>,
    boxShadow: { ...shadow },
    spacing: {
      px: '1px',
      ...gridSpacing,
      // Named CI steps override the raw grid where they coincide.
      ...(Object.fromEntries(Object.entries(space).map(([k, v]) => [k, px(v as number)])) as Record<
        string,
        string
      >),
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
      wide: '0.02em',
      wider: '0.09em',
    },
    transitionDuration: Object.fromEntries(
      Object.entries(motion.duration).map(([k, v]) => [k, `${v as number}ms`]),
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
        'pop-in': `pop-in ${motion.duration.fast}ms ${motion.easing.entrance} both`,
        'fade-in': `fade-in ${motion.duration.base}ms ${motion.easing.standard} both`,
      },
    },
  },
  plugins: [],
};

export default config;
