/**
 * Ausrichten: das Einrasten auf dem Raster, dazu Hilfslinien gegen die
 * Geschwister auf der Folie, die Folienkanten, die Mittelachsen und den
 * Satzspiegel der CI.
 */
import { canvas } from '@/theme';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GuideOrientation = 'v' | 'h';

export interface Guide {
  orientation: GuideOrientation;
  /** X bei senkrechten Linien, Y bei waagerechten. */
  position: number;
  /** Wie weit die Linie gezeichnet wird, in Folien-Einheiten. */
  start: number;
  end: number;
}

export interface SnapOptions {
  /** Auf das Raster der CI einrasten. */
  grid: boolean;
  gridSize?: number;
  /** An den Geschwistern und den festen Linien der Folie ausrichten. */
  smart: boolean;
  threshold?: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: Guide[];
}

export const DEFAULT_SNAP: SnapOptions = { grid: true, smart: true };

export function snapValueToGrid(value: number, gridSize: number = canvas.gridSize): number {
  return Math.round(value / gridSize) * gridSize;
}

export function rectOf(el: Rect): Rect {
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function unionRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Die festen Linien jeder Folie: Kanten, Mitten und der Satzspiegel. */
export function slideLandmarks(): { vertical: number[]; horizontal: number[] } {
  const { width, height, margin } = canvas;
  return {
    vertical: [0, margin.left, width / 2, width - margin.right, width],
    horizontal: [0, margin.top, height / 2, height - margin.bottom, height],
  };
}

/**
 * Eine vorgeschlagene linke obere Ecke für `moving` einrasten lassen — und
 * dazu die Linien zurückgeben, die währenddessen zu zeichnen sind.
 */
export function computeSnap(
  moving: Rect,
  others: readonly Rect[],
  options: SnapOptions = DEFAULT_SNAP,
): SnapResult {
  const threshold = options.threshold ?? canvas.snapThreshold;
  const gridSize = options.gridSize ?? canvas.gridSize;

  let x = moving.x;
  let y = moving.y;
  const guides: Guide[] = [];

  if (options.smart) {
    const landmarks = slideLandmarks();

    // Die Linien des gezogenen Rechtecks, als Abstände von seiner Ecke.
    const movingV = [
      { offset: 0, value: moving.x },
      { offset: moving.w / 2, value: moving.x + moving.w / 2 },
      { offset: moving.w, value: moving.x + moving.w },
    ];
    const movingH = [
      { offset: 0, value: moving.y },
      { offset: moving.h / 2, value: moving.y + moving.h / 2 },
      { offset: moving.h, value: moving.y + moving.h },
    ];

    const targetV = [
      ...landmarks.vertical.map((v) => ({ value: v, from: 0, to: canvas.height })),
      ...others.flatMap((o) => [
        { value: o.x, from: o.y, to: o.y + o.h },
        { value: o.x + o.w / 2, from: o.y, to: o.y + o.h },
        { value: o.x + o.w, from: o.y, to: o.y + o.h },
      ]),
    ];
    const targetH = [
      ...landmarks.horizontal.map((v) => ({ value: v, from: 0, to: canvas.width })),
      ...others.flatMap((o) => [
        { value: o.y, from: o.x, to: o.x + o.w },
        { value: o.y + o.h / 2, from: o.x, to: o.x + o.w },
        { value: o.y + o.h, from: o.x, to: o.x + o.w },
      ]),
    ];

    const bestV = bestMatch(movingV, targetV, threshold);
    if (bestV) {
      x = bestV.target.value - bestV.source.offset;
      guides.push({
        orientation: 'v',
        position: bestV.target.value,
        start: Math.min(bestV.target.from, y),
        end: Math.max(bestV.target.to, y + moving.h),
      });
    }

    const bestH = bestMatch(movingH, targetH, threshold);
    if (bestH) {
      y = bestH.target.value - bestH.source.offset;
      guides.push({
        orientation: 'h',
        position: bestH.target.value,
        start: Math.min(bestH.target.from, x),
        end: Math.max(bestH.target.to, x + moving.w),
      });
    }

    if (bestV && bestH) return { x, y, guides };
  }

  if (options.grid) {
    if (!guides.some((g) => g.orientation === 'v')) x = snapValueToGrid(x, gridSize);
    if (!guides.some((g) => g.orientation === 'h')) y = snapValueToGrid(y, gridSize);
  }

  return { x, y, guides };
}

interface SourceLine {
  offset: number;
  value: number;
}
interface TargetLine {
  value: number;
  from: number;
  to: number;
}

function bestMatch(
  sources: readonly SourceLine[],
  targets: readonly TargetLine[],
  threshold: number,
): { source: SourceLine; target: TargetLine; distance: number } | null {
  let best: { source: SourceLine; target: TargetLine; distance: number } | null = null;
  for (const source of sources) {
    for (const target of targets) {
      const distance = Math.abs(source.value - target.value);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { source, target, distance };
      }
    }
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* Resizing                                                                    */
/* -------------------------------------------------------------------------- */

export const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type ResizeHandle = (typeof resizeHandles)[number];

export interface ResizeOptions {
  /** Das Seitenverhältnis vom Anfang halten (Umschalt). */
  lockAspect?: boolean;
  /** Symmetrisch um die Mitte wachsen (Alt). */
  fromCenter?: boolean;
  snap?: SnapOptions;
  minSize?: number;
  /**
   * Das kleinste Maß in der Senkrechten, falls es ein anderes ist.
   *
   * `minSize` ist eine Größe für die Hand: unter `minElementSize` trifft
   * niemand mehr einen Griff. Für den Verbinder ist die Höhe null aber kein
   * zu kleines Maß, sondern der Normalfall — eine waagerechte Linie. Er kommt
   * mit `h = 0` aus der Fabrik, der Leser lässt die Null stehen und der
   * Inspektor nimmt sie an; nur der Griff hob sie auf 24, und am Nordgriff
   * schob er das Element dabei um 24 nach oben. Damit war eine Linie, die man
   * einmal angefasst hatte, auf der Fläche nie wieder gerade zu bekommen.
   */
  minHeight?: number;
}

/**
 * Eine Zeigerbewegung an einem Griff auf ein Rechteck anwenden. Die Bewegung
 * steht im **eigenen**, ungedrehten Rahmen des Elements — der Aufrufer dreht
 * sie vorher zurück, damit ein gedrehtes Element an seinen eigenen Kanten
 * gezogen wird und nicht an denen des Bildschirms.
 */
export function resizeRect(
  start: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  options: ResizeOptions = {},
): Rect {
  const min = options.minSize ?? canvas.minElementSize;
  const minH = options.minHeight ?? min;
  const grid = options.snap?.grid ?? true;
  const gridSize = options.snap?.gridSize ?? canvas.gridSize;
  const snap = (v: number) => (grid ? snapValueToGrid(v, gridSize) : v);

  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.startsWith('n');
  const south = handle.startsWith('s');

  let { x, y, w, h } = start;

  if (options.fromCenter) {
    if (east) w = start.w + dx * 2;
    if (west) w = start.w - dx * 2;
    if (south) h = start.h + dy * 2;
    if (north) h = start.h - dy * 2;
    w = Math.max(min, snap(w));
    h = Math.max(minH, snap(h));
    if (options.lockAspect) ({ w, h } = lockAspect(start, w, h, min, minH));
    x = start.x + start.w / 2 - w / 2;
    y = start.y + start.h / 2 - h / 2;
    return { x, y, w, h };
  }

  if (east) w = Math.max(min, snap(start.w + dx));
  if (west) {
    const right = start.x + start.w;
    x = Math.min(snap(start.x + dx), right - min);
    w = right - x;
  }
  if (south) h = Math.max(minH, snap(start.h + dy));
  if (north) {
    const bottom = start.y + start.h;
    y = Math.min(snap(start.y + dy), bottom - minH);
    h = bottom - y;
  }

  if (options.lockAspect) {
    const locked = lockAspect(start, w, h, min, minH);
    if (west) x = start.x + start.w - locked.w;
    if (north) y = start.y + start.h - locked.h;
    w = locked.w;
    h = locked.h;
  }

  return { x, y, w, h };
}

function lockAspect(
  start: Rect,
  w: number,
  h: number,
  min: number,
  minH: number,
): { w: number; h: number } {
  const ratio = start.h === 0 ? 1 : start.w / start.h;
  // Der Achse folgen, die sich weiter bewegt hat — proportional.
  const byWidth = Math.abs(w - start.w) >= Math.abs(h - start.h);
  if (byWidth) {
    const nw = Math.max(min, w);
    return { w: nw, h: Math.max(minH, nw / ratio) };
  }
  const nh = Math.max(minH, h);
  return { w: Math.max(min, nh * ratio), h: nh };
}

/** Einen Punkt um einen Drehpunkt drehen — Grad, im Uhrzeigersinn auf dem Schirm. */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): { x: number; y: number } {
  if (!degrees) return { x, y };
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Ein Rechteck so klemmen, dass mindestens `keep` Einheiten davon auf der
 * Folie bleiben.
 *
 * Die Vorgabe ist `minElementSize` und stand hier als getippte `24` — was
 * dasselbe war und aus einem anderen Grund. `CLAUDE.md` schreibt seit dem
 * Folienformat, die Schwelle der Formatwarnung sei „derselbe Wert, mit dem
 * `clampToSlide()` ein gezogenes Element auf der Folie hält"; das stimmte,
 * solange niemand eine der beiden Zahlen anfasst. Jetzt stimmt es von Bauart
 * wegen.
 */
export function clampToSlide(rect: Rect, keep = canvas.minElementSize): Rect {
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, -rect.w + keep), canvas.width - keep),
    y: Math.min(Math.max(rect.y, -rect.h + keep), canvas.height - keep),
  };
}
