/**
 * The Nozilla CI icon library.
 *
 * Icons are authored as *structured primitives* on a 24×24 grid rather than as
 * opaque path strings. Three renderers consume this same data — the DOM
 * (`<Icon/>`), the SVG exporter and the PDF exporter — so an icon can never
 * look different depending on where it ends up.
 *
 * Authoring rules (enforced by `icons.test.ts`):
 *   • 24×24 grid, geometry inside 0…24.
 *   • Stroke-first drawing at `iconStrokeGrid` weight, round caps and joins.
 *   • Path data uses M/L/H/V/C/S/Q/T/Z only — *no elliptical arcs* — because
 *     the PDF backend has no arc operator. Use `circle`/`ellipse` primitives
 *     for true circles instead.
 */

export type IconPrim =
  | { t: 'path'; d: string; fill?: boolean }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; r?: number; fill?: boolean }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'polyline'; points: number[] }
  | { t: 'polygon'; points: number[]; fill?: boolean };

export const iconCategories = [
  'brand',
  'core',
  'object',
  'people',
  'data',
  'status',
  'media',
] as const;
export type IconCategory = (typeof iconCategories)[number];

export interface IconDef {
  label: string;
  category: IconCategory;
  prims: IconPrim[];
}

/** The design grid all icons are authored on. */
export const iconGrid = 24;
/** The stroke weight icons are drawn at, in grid units. */
export const iconStrokeGrid = 2;

const line = (x1: number, y1: number, x2: number, y2: number): IconPrim => ({
  t: 'line',
  x1,
  y1,
  x2,
  y2,
});
const poly = (...points: number[]): IconPrim => ({ t: 'polyline', points });
const shape = (...points: number[]): IconPrim => ({ t: 'polygon', points });
const dot = (cx: number, cy: number, r = 1.05): IconPrim => ({ t: 'circle', cx, cy, r, fill: true });

export const icons = {
  /* ---------------------------------------------------------------- brand */
  nozilla: {
    label: 'Nozilla mark',
    category: 'brand',
    prims: [poly(6, 19, 6, 5, 18, 19, 18, 5)],
  },

  /* ----------------------------------------------------------------- core */
  'arrow-right': {
    label: 'Arrow right',
    category: 'core',
    prims: [line(4, 12, 20, 12), poly(13.5, 5.5, 20, 12, 13.5, 18.5)],
  },
  'arrow-left': {
    label: 'Arrow left',
    category: 'core',
    prims: [line(20, 12, 4, 12), poly(10.5, 5.5, 4, 12, 10.5, 18.5)],
  },
  'arrow-up': {
    label: 'Arrow up',
    category: 'core',
    prims: [line(12, 20, 12, 4), poly(5.5, 10.5, 12, 4, 18.5, 10.5)],
  },
  'arrow-down': {
    label: 'Arrow down',
    category: 'core',
    prims: [line(12, 4, 12, 20), poly(5.5, 13.5, 12, 20, 18.5, 13.5)],
  },
  check: {
    label: 'Check',
    category: 'core',
    prims: [poly(4, 12.5, 9.5, 18, 20, 6.5)],
  },
  close: {
    label: 'Close',
    category: 'core',
    prims: [line(6, 6, 18, 18), line(18, 6, 6, 18)],
  },
  plus: {
    label: 'Plus',
    category: 'core',
    prims: [line(12, 4, 12, 20), line(4, 12, 20, 12)],
  },
  minus: {
    label: 'Minus',
    category: 'core',
    prims: [line(4, 12, 20, 12)],
  },
  'chevron-right': {
    label: 'Chevron right',
    category: 'core',
    prims: [poly(9, 5, 16, 12, 9, 19)],
  },
  'chevron-down': {
    label: 'Chevron down',
    category: 'core',
    prims: [poly(5, 9, 12, 16, 19, 9)],
  },
  refresh: {
    label: 'Refresh',
    category: 'core',
    prims: [
      { t: 'path', d: 'M 4 12 C 4 7.58 7.58 4 12 4 C 16.42 4 20 7.58 20 12 C 20 16.42 16.42 20 12 20' },
      poly(1.5, 9, 4, 12.6, 7.6, 10),
    ],
  },
  search: {
    label: 'Search',
    category: 'core',
    prims: [{ t: 'circle', cx: 10.5, cy: 10.5, r: 6.5 }, line(15.2, 15.2, 20.5, 20.5)],
  },
  external: {
    label: 'External link',
    category: 'core',
    prims: [poly(14, 3.5, 20.5, 3.5, 20.5, 10), line(20.5, 3.5, 11, 13), poly(17, 14, 17, 20.5, 3.5, 20.5, 3.5, 7, 10, 7)],
  },
  link: {
    label: 'Link',
    category: 'core',
    prims: [
      line(9.8, 14.2, 14.2, 9.8),
      {
        t: 'path',
        d: 'M 13.5 8 L 15.5 6 C 17.16 4.34 19.34 4.34 21 6 C 22.66 7.66 22.66 9.84 21 11.5 L 19 13.5',
      },
      {
        t: 'path',
        d: 'M 10.5 16 L 8.5 18 C 6.84 19.66 4.66 19.66 3 18 C 1.34 16.34 1.34 14.16 3 12.5 L 5 10.5',
      },
    ],
  },
  filter: {
    label: 'Filter',
    category: 'core',
    prims: [shape(3, 5, 21, 5, 14, 13, 14, 20.5, 10, 17.5, 10, 13)],
  },
  settings: {
    label: 'Settings',
    category: 'core',
    prims: [
      line(3.5, 7, 6.6, 7),
      line(11.4, 7, 20.5, 7),
      { t: 'circle', cx: 9, cy: 7, r: 2.2 },
      line(3.5, 17, 12.6, 17),
      line(17.4, 17, 20.5, 17),
      { t: 'circle', cx: 15, cy: 17, r: 2.2 },
    ],
  },

  /* --------------------------------------------------------------- object */
  document: {
    label: 'Document',
    category: 'object',
    prims: [
      shape(6, 3, 14, 3, 18, 7, 18, 21, 6, 21),
      poly(14, 3, 14, 7, 18, 7),
      line(9, 13, 15, 13),
      line(9, 17, 15, 17),
    ],
  },
  folder: {
    label: 'Folder',
    category: 'object',
    prims: [shape(3, 6, 9, 6, 11, 9, 21, 9, 21, 20, 3, 20)],
  },
  database: {
    label: 'Database',
    category: 'object',
    prims: [
      { t: 'ellipse', cx: 12, cy: 6, rx: 8, ry: 3 },
      {
        t: 'path',
        d: 'M 4 6 V 18 C 4 19.66 7.58 21 12 21 C 16.42 21 20 19.66 20 18 V 6',
      },
      { t: 'path', d: 'M 4 12 C 4 13.66 7.58 15 12 15 C 16.42 15 20 13.66 20 12' },
    ],
  },
  cloud: {
    label: 'Cloud',
    category: 'object',
    prims: [
      {
        t: 'path',
        d: 'M 7 19 C 4.24 19 2 16.76 2 14 C 2 11.53 3.79 9.48 6.14 9.08 C 6.96 6.71 9.21 5 11.86 5 C 15.02 5 17.6 7.44 17.84 10.54 C 20.19 10.9 22 12.94 22 15.4 C 22 17.39 20.39 19 18.4 19 Z',
      },
    ],
  },
  server: {
    label: 'Server',
    category: 'object',
    prims: [
      { t: 'rect', x: 3, y: 4, w: 18, h: 7, r: 2 },
      { t: 'rect', x: 3, y: 13, w: 18, h: 7, r: 2 },
      dot(7, 7.5),
      dot(7, 16.5),
    ],
  },
  chip: {
    label: 'Chip',
    category: 'object',
    prims: [
      { t: 'rect', x: 6, y: 6, w: 12, h: 12, r: 2 },
      { t: 'rect', x: 9.5, y: 9.5, w: 5, h: 5, r: 1 },
      line(9, 6, 9, 3),
      line(15, 6, 15, 3),
      line(9, 18, 9, 21),
      line(15, 18, 15, 21),
      line(6, 9, 3, 9),
      line(6, 15, 3, 15),
      line(18, 9, 21, 9),
      line(18, 15, 21, 15),
    ],
  },
  code: {
    label: 'Code',
    category: 'object',
    prims: [poly(8.5, 7.5, 3.5, 12, 8.5, 16.5), poly(15.5, 7.5, 20.5, 12, 15.5, 16.5), line(13.5, 4.5, 10.5, 19.5)],
  },
  terminal: {
    label: 'Terminal',
    category: 'object',
    prims: [
      { t: 'rect', x: 2.5, y: 4.5, w: 19, h: 15, r: 2.5 },
      poly(7, 10, 10.5, 13, 7, 16),
      line(13, 16, 17, 16),
    ],
  },
  box: {
    label: 'Box',
    category: 'object',
    prims: [
      shape(12, 2.5, 21, 7.25, 21, 16.75, 12, 21.5, 3, 16.75, 3, 7.25),
      poly(3, 7.25, 12, 12, 21, 7.25),
      line(12, 12, 12, 21.5),
    ],
  },
  layers: {
    label: 'Layers',
    category: 'object',
    prims: [shape(12, 3, 21, 8, 12, 13, 3, 8), poly(3, 12.5, 12, 17.5, 21, 12.5), poly(3, 16.5, 12, 21.5, 21, 16.5)],
  },
  grid: {
    label: 'Grid',
    category: 'object',
    prims: [
      { t: 'rect', x: 3, y: 3, w: 7.5, h: 7.5, r: 1.5 },
      { t: 'rect', x: 13.5, y: 3, w: 7.5, h: 7.5, r: 1.5 },
      { t: 'rect', x: 3, y: 13.5, w: 7.5, h: 7.5, r: 1.5 },
      { t: 'rect', x: 13.5, y: 13.5, w: 7.5, h: 7.5, r: 1.5 },
    ],
  },
  book: {
    label: 'Book',
    category: 'object',
    prims: [
      {
        t: 'path',
        d: 'M 12 5.5 C 12 5.5 9.8 3.5 6.5 3.5 H 3 V 18 H 6.5 C 9.8 18 12 20 12 20 C 12 20 14.2 18 17.5 18 H 21 V 3.5 H 17.5 C 14.2 3.5 12 5.5 12 5.5 Z',
      },
      line(12, 5.5, 12, 20),
    ],
  },
  map: {
    label: 'Map',
    category: 'object',
    prims: [shape(3, 6, 9, 3.5, 15, 6.5, 21, 4, 21, 18, 15, 20.5, 9, 17.5, 3, 20), line(9, 3.5, 9, 17.5), line(15, 6.5, 15, 20.5)],
  },
  pin: {
    label: 'Pin',
    category: 'object',
    prims: [
      {
        t: 'path',
        d: 'M 12 21.5 C 12 21.5 19 15.4 19 10.5 C 19 6.63 15.87 3.5 12 3.5 C 8.13 3.5 5 6.63 5 10.5 C 5 15.4 12 21.5 12 21.5 Z',
      },
      { t: 'circle', cx: 12, cy: 10.5, r: 2.6 },
    ],
  },
  key: {
    label: 'Key',
    category: 'object',
    prims: [{ t: 'circle', cx: 8, cy: 12, r: 4.5 }, line(12.5, 12, 21, 12), line(18, 12, 18, 15.5), line(21, 12, 21, 15)],
  },
  lock: {
    label: 'Lock',
    category: 'object',
    prims: [
      { t: 'rect', x: 4.5, y: 10.5, w: 15, h: 9.5, r: 2.5 },
      { t: 'path', d: 'M 8 10.5 V 8 C 8 5.79 9.79 4 12 4 C 14.21 4 16 5.79 16 8 V 10.5' },
    ],
  },
  globe: {
    label: 'Globe',
    category: 'object',
    prims: [
      { t: 'circle', cx: 12, cy: 12, r: 8.5 },
      line(3.5, 12, 20.5, 12),
      {
        t: 'path',
        d: 'M 12 3.5 C 14.5 6 15.75 9 15.75 12 C 15.75 15 14.5 18 12 20.5 C 9.5 18 8.25 15 8.25 12 C 8.25 9 9.5 6 12 3.5 Z',
      },
    ],
  },
  calendar: {
    label: 'Calendar',
    category: 'object',
    prims: [
      { t: 'rect', x: 3.5, y: 5, w: 17, h: 15.5, r: 2.5 },
      line(3.5, 10, 20.5, 10),
      line(8.5, 2.5, 8.5, 7),
      line(15.5, 2.5, 15.5, 7),
    ],
  },
  clock: {
    label: 'Clock',
    category: 'object',
    prims: [{ t: 'circle', cx: 12, cy: 12, r: 8.5 }, poly(12, 6.5, 12, 12, 16.5, 14.5)],
  },
  checklist: {
    label: 'Checklist',
    category: 'object',
    prims: [
      poly(3.5, 6.5, 5, 8, 7.5, 5),
      poly(3.5, 11.5, 5, 13, 7.5, 10),
      poly(3.5, 16.5, 5, 18, 7.5, 15),
      line(10, 7, 20.5, 7),
      line(10, 12, 20.5, 12),
      line(10, 17, 20.5, 17),
    ],
  },

  /* --------------------------------------------------------------- people */
  user: {
    label: 'User',
    category: 'people',
    prims: [
      { t: 'circle', cx: 12, cy: 8, r: 4 },
      { t: 'path', d: 'M 4.5 20.5 C 4.5 16.36 7.86 13 12 13 C 16.14 13 19.5 16.36 19.5 20.5' },
    ],
  },
  users: {
    label: 'Users',
    category: 'people',
    prims: [
      { t: 'circle', cx: 9, cy: 8, r: 3.5 },
      { t: 'path', d: 'M 2.5 20 C 2.5 16.41 5.41 13.5 9 13.5 C 12.59 13.5 15.5 16.41 15.5 20' },
      { t: 'circle', cx: 17.5, cy: 9, r: 2.8 },
      { t: 'path', d: 'M 15.6 13.9 C 16.2 13.64 16.85 13.5 17.5 13.5 C 19.99 13.5 22 15.51 22 18 V 20' },
    ],
  },
  chat: {
    label: 'Chat',
    category: 'people',
    prims: [shape(3, 5.5, 21, 5.5, 21, 16.5, 12.5, 16.5, 7.5, 20.5, 7.5, 16.5, 3, 16.5)],
  },
  mail: {
    label: 'Mail',
    category: 'people',
    prims: [{ t: 'rect', x: 2.5, y: 5, w: 19, h: 14, r: 2 }, poly(3.5, 6.5, 12, 13, 20.5, 6.5)],
  },
  bell: {
    label: 'Bell',
    category: 'people',
    prims: [
      {
        t: 'path',
        d: 'M 7 10 C 7 7.24 9.24 5 12 5 C 14.76 5 17 7.24 17 10 V 14 L 19 17 H 5 L 7 14 Z',
      },
      { t: 'path', d: 'M 10 19.5 C 10.4 20.4 11.16 21 12 21 C 12.84 21 13.6 20.4 14 19.5' },
    ],
  },
  share: {
    label: 'Share',
    category: 'people',
    prims: [
      { t: 'circle', cx: 18, cy: 5.5, r: 2.5 },
      { t: 'circle', cx: 6, cy: 12, r: 2.5 },
      { t: 'circle', cx: 18, cy: 18.5, r: 2.5 },
      line(8.2, 10.8, 15.8, 6.7),
      line(8.2, 13.2, 15.8, 17.3),
    ],
  },

  /* ----------------------------------------------------------------- data */
  'chart-bar': {
    label: 'Bar chart',
    category: 'data',
    prims: [
      line(3.5, 20.5, 20.5, 20.5),
      { t: 'rect', x: 5, y: 12, w: 3.5, h: 8.5, r: 0.75 },
      { t: 'rect', x: 10.25, y: 7.5, w: 3.5, h: 13, r: 0.75 },
      { t: 'rect', x: 15.5, y: 10, w: 3.5, h: 10.5, r: 0.75 },
    ],
  },
  'chart-line': {
    label: 'Line chart',
    category: 'data',
    prims: [line(3.5, 20.5, 20.5, 20.5), poly(5, 16.5, 9.5, 11, 13.5, 14.5, 20, 6)],
  },
  'chart-pie': {
    label: 'Pie chart',
    category: 'data',
    prims: [{ t: 'circle', cx: 12, cy: 12, r: 8.5 }, line(12, 12, 12, 3.5), line(12, 12, 19.4, 16.25)],
  },
  'trend-up': {
    label: 'Trend up',
    category: 'data',
    prims: [poly(3.5, 16.5, 9.5, 10.5, 13.5, 14.5, 20.5, 7.5), poly(15.5, 7.5, 20.5, 7.5, 20.5, 12.5)],
  },
  target: {
    label: 'Target',
    category: 'data',
    prims: [
      { t: 'circle', cx: 12, cy: 12, r: 8.5 },
      { t: 'circle', cx: 12, cy: 12, r: 4.5 },
      dot(12, 12, 1.3),
    ],
  },
  gauge: {
    label: 'Gauge',
    category: 'data',
    prims: [
      {
        t: 'path',
        d: 'M 4 17 C 3.36 15.53 3 13.81 3 12 C 3 7.03 7.03 3 12 3 C 16.97 3 21 7.03 21 12 C 21 13.81 20.64 15.53 20 17',
      },
      line(12, 12, 16.2, 8.4),
      dot(12, 12, 1.5),
    ],
  },

  /* --------------------------------------------------------------- status */
  info: {
    label: 'Info',
    category: 'status',
    prims: [{ t: 'circle', cx: 12, cy: 12, r: 9 }, line(12, 11, 12, 16.5), dot(12, 7.8)],
  },
  warning: {
    label: 'Warning',
    category: 'status',
    prims: [shape(12, 3.5, 22, 20.5, 2, 20.5), line(12, 10, 12, 15), dot(12, 17.8)],
  },
  shield: {
    label: 'Shield',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 12 3 L 20 6 V 12 C 20 16.5 16.6 19.9 12 21.5 C 7.4 19.9 4 16.5 4 12 V 6 Z',
      },
      poly(8.8, 12, 11.2, 14.4, 15.6, 9.6),
    ],
  },
  star: {
    label: 'Star',
    category: 'status',
    prims: [shape(12, 3, 14.7, 9.1, 21, 9.8, 16.3, 14.1, 17.6, 20.5, 12, 17.3, 6.4, 20.5, 7.7, 14.1, 3, 9.8, 9.3, 9.1)],
  },
  heart: {
    label: 'Heart',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 12 20.5 C 12 20.5 3 15 3 9.2 C 3 6.33 5.24 4 8 4 C 9.87 4 11.28 5.05 12 6.2 C 12.72 5.05 14.13 4 16 4 C 18.76 4 21 6.33 21 9.2 C 21 15 12 20.5 12 20.5 Z',
      },
    ],
  },
  flag: {
    label: 'Flag',
    category: 'status',
    prims: [line(5, 3.5, 5, 21), shape(5, 4.5, 19.5, 4.5, 16, 9.5, 19.5, 14.5, 5, 14.5)],
  },
  sparkle: {
    label: 'Sparkle',
    category: 'status',
    prims: [shape(12, 2.5, 14, 9.5, 21, 11.5, 14, 13.5, 12, 20.5, 10, 13.5, 3, 11.5, 10, 9.5)],
  },
  bolt: {
    label: 'Bolt',
    category: 'status',
    prims: [shape(13.5, 2.5, 5, 13.5, 11, 13.5, 10.5, 21.5, 19, 10.5, 13, 10.5)],
  },
  rocket: {
    label: 'Rocket',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 12 2.5 C 15.5 5 17.5 9 17.5 13 V 15.5 L 12 20 L 6.5 15.5 V 13 C 6.5 9 8.5 5 12 2.5 Z',
      },
      { t: 'circle', cx: 12, cy: 10, r: 2.2 },
      poly(6.5, 14, 3.5, 17.5, 6, 18.5),
      poly(17.5, 14, 20.5, 17.5, 18, 18.5),
    ],
  },
  bulb: {
    label: 'Idea',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 9 17 C 9 17 5.5 14.8 5.5 10.5 C 5.5 6.9 8.4 4 12 4 C 15.6 4 18.5 6.9 18.5 10.5 C 18.5 14.8 15 17 15 17 Z',
      },
      line(9.5, 19.5, 14.5, 19.5),
      line(10.5, 21.5, 13.5, 21.5),
    ],
  },
  eye: {
    label: 'Eye',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 2 12 C 4.5 7.5 8 5.5 12 5.5 C 16 5.5 19.5 7.5 22 12 C 19.5 16.5 16 18.5 12 18.5 C 8 18.5 4.5 16.5 2 12 Z',
      },
      { t: 'circle', cx: 12, cy: 12, r: 3.2 },
    ],
  },
  quote: {
    label: 'Quote',
    category: 'status',
    prims: [
      {
        t: 'path',
        d: 'M 10 18 H 4.5 V 12.5 C 4.5 8.9 6.6 6.6 10 6 V 8.6 C 8.2 9.2 7.2 10.5 7.2 12.5 H 10 Z',
        fill: true,
      },
      {
        t: 'path',
        d: 'M 19.5 18 H 14 V 12.5 C 14 8.9 16.1 6.6 19.5 6 V 8.6 C 17.7 9.2 16.7 10.5 16.7 12.5 H 19.5 Z',
        fill: true,
      },
    ],
  },

  /* ---------------------------------------------------------------- media */
  play: {
    label: 'Play',
    category: 'media',
    prims: [shape(8, 5, 19, 12, 8, 19)],
  },
  pause: {
    label: 'Pause',
    category: 'media',
    prims: [
      { t: 'rect', x: 7.5, y: 5, w: 3.5, h: 14, r: 1 },
      { t: 'rect', x: 13, y: 5, w: 3.5, h: 14, r: 1 },
    ],
  },
  download: {
    label: 'Download',
    category: 'media',
    prims: [line(12, 3.5, 12, 15.5), poly(7, 10.5, 12, 15.5, 17, 10.5), poly(4, 17.5, 4, 20.5, 20, 20.5, 20, 17.5)],
  },
  upload: {
    label: 'Upload',
    category: 'media',
    prims: [line(12, 15.5, 12, 4), poly(7, 9, 12, 4, 17, 9), poly(4, 17.5, 4, 20.5, 20, 20.5, 20, 17.5)],
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof icons;

export const iconNames = Object.keys(icons) as IconName[];

export function iconDef(name: IconName | undefined): IconDef {
  return (name && (icons as Record<string, IconDef>)[name]) || icons.nozilla;
}

export function iconsByCategory(): Array<{ category: IconCategory; names: IconName[] }> {
  return iconCategories
    .map((category) => ({
      category,
      names: iconNames.filter((name) => icons[name].category === category),
    }))
    .filter((group) => group.names.length > 0);
}

/** Case-insensitive search across icon name and label. */
export function searchIcons(query: string): IconName[] {
  const q = query.trim().toLowerCase();
  if (!q) return iconNames;
  return iconNames.filter(
    (name) => name.includes(q) || icons[name].label.toLowerCase().includes(q),
  );
}
