/**
 * Alignment: grid snapping plus "smart guides" against sibling elements, the
 * slide edges, the slide centre lines and the CI safe-area margins.
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
  /** X for vertical guides, Y for horizontal guides. */
  position: number;
  /** Extent of the drawn guide line, in slide units. */
  start: number;
  end: number;
}

export interface SnapOptions {
  /** Snap positions to the CI grid. */
  grid: boolean;
  gridSize?: number;
  /** Align to sibling elements / slide landmarks. */
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

/** The fixed lines every slide offers: edges, centres and CI safe-area margins. */
export function slideLandmarks(): { vertical: number[]; horizontal: number[] } {
  const { width, height, margin } = canvas;
  return {
    vertical: [0, margin.left, width / 2, width - margin.right, width],
    horizontal: [0, margin.top, height / 2, height - margin.bottom, height],
  };
}

/**
 * Resolve a proposed top-left position for `moving` into a snapped position,
 * returning the guides that should be drawn while the snap is active.
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

    // Candidate lines on the moving rect, expressed as offsets from its origin.
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
  /** Preserve the starting aspect ratio (Shift). */
  lockAspect?: boolean;
  /** Grow symmetrically about the centre (Alt). */
  fromCenter?: boolean;
  snap?: SnapOptions;
  minSize?: number;
}

/**
 * Apply a pointer delta to a rect for a given handle. Deltas are expressed in
 * the element's *own* (unrotated) frame — the caller un-rotates them first, so
 * resizing a rotated element still drags along its own edges.
 */
export function resizeRect(
  start: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  options: ResizeOptions = {},
): Rect {
  const min = options.minSize ?? canvas.minElementSize;
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
    h = Math.max(min, snap(h));
    if (options.lockAspect) ({ w, h } = lockAspect(start, w, h, min));
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
  if (south) h = Math.max(min, snap(start.h + dy));
  if (north) {
    const bottom = start.y + start.h;
    y = Math.min(snap(start.y + dy), bottom - min);
    h = bottom - y;
  }

  if (options.lockAspect) {
    const locked = lockAspect(start, w, h, min);
    if (west) x = start.x + start.w - locked.w;
    if (north) y = start.y + start.h - locked.h;
    w = locked.w;
    h = locked.h;
  }

  return { x, y, w, h };
}

function lockAspect(start: Rect, w: number, h: number, min: number): { w: number; h: number } {
  const ratio = start.h === 0 ? 1 : start.w / start.h;
  // Follow whichever axis moved further, proportionally.
  const byWidth = Math.abs(w - start.w) >= Math.abs(h - start.h);
  if (byWidth) {
    const nw = Math.max(min, w);
    return { w: nw, h: Math.max(min, nw / ratio) };
  }
  const nh = Math.max(min, h);
  return { w: Math.max(min, nh * ratio), h: nh };
}

/** Rotate a point about a pivot (degrees, clockwise in screen coordinates). */
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

/** Clamp a rect so it keeps at least `keep` px of itself over the slide. */
export function clampToSlide(rect: Rect, keep = 24): Rect {
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, -rect.w + keep), canvas.width - keep),
    y: Math.min(Math.max(rect.y, -rect.h + keep), canvas.height - keep),
  };
}
