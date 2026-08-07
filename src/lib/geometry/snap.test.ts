import { describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import {
  clampToSlide,
  computeSnap,
  normalizeRect,
  rectsIntersect,
  resizeRect,
  rotatePoint,
  snapValueToGrid,
  unionRects,
  type Rect,
} from './snap';

const rect = (x: number, y: number, w = 100, h = 50): Rect => ({ x, y, w, h });

describe('snapValueToGrid', () => {
  it('rounds to the nearest CI grid step', () => {
    expect(snapValueToGrid(11)).toBe(canvas.gridSize * Math.round(11 / canvas.gridSize));
    expect(snapValueToGrid(3)).toBe(0);
    expect(snapValueToGrid(5)).toBe(8);
  });
});

describe('computeSnap', () => {
  it('snaps to the grid when nothing else is nearby', () => {
    const result = computeSnap(rect(301, 203), [], { grid: true, smart: false });
    expect(result.x % canvas.gridSize).toBe(0);
    expect(result.y % canvas.gridSize).toBe(0);
    expect(result.guides).toHaveLength(0);
  });

  it('aligns a left edge to a sibling left edge and reports a guide', () => {
    const result = computeSnap(rect(203, 400), [rect(200, 100)], { grid: false, smart: true });
    expect(result.x).toBe(200);
    expect(result.guides.some((guide) => guide.orientation === 'v' && guide.position === 200)).toBe(
      true,
    );
  });

  it('aligns centres, not only edges', () => {
    // Moving rect is 100 wide; its centre lands on the slide centre line.
    const result = computeSnap(rect(canvas.width / 2 - 50 + 3, 10), [], {
      grid: false,
      smart: true,
    });
    expect(result.x).toBe(canvas.width / 2 - 50);
  });

  it('respects the CI safe-area margins as landmarks', () => {
    const result = computeSnap(rect(canvas.margin.left + 2, 300), [], {
      grid: false,
      smart: true,
    });
    expect(result.x).toBe(canvas.margin.left);
  });

  it('leaves a position alone when it is far from everything', () => {
    const result = computeSnap(rect(413, 297), [rect(20, 20)], {
      grid: false,
      smart: true,
      threshold: 2,
    });
    expect(result).toMatchObject({ x: 413, y: 297 });
  });
});

describe('resizeRect', () => {
  const start = rect(100, 100, 200, 100);
  const noSnap = { snap: { grid: false, smart: false } };

  it('grows from the south-east handle', () => {
    expect(resizeRect(start, 'se', 40, 20, noSnap)).toEqual({ x: 100, y: 100, w: 240, h: 120 });
  });

  it('moves the origin when dragging the north-west handle', () => {
    expect(resizeRect(start, 'nw', 20, 10, noSnap)).toEqual({ x: 120, y: 110, w: 180, h: 90 });
  });

  it('never collapses below the minimum size', () => {
    const result = resizeRect(start, 'se', -1000, -1000, noSnap);
    expect(result.w).toBe(canvas.minElementSize);
    expect(result.h).toBe(canvas.minElementSize);
  });

  it('keeps the aspect ratio when asked', () => {
    const result = resizeRect(start, 'se', 200, 0, { ...noSnap, lockAspect: true });
    expect(result.w / result.h).toBeCloseTo(start.w / start.h, 6);
  });

  it('grows symmetrically about the centre', () => {
    const result = resizeRect(start, 'e', 50, 0, { ...noSnap, fromCenter: true });
    expect(result.w).toBe(300);
    expect(result.x + result.w / 2).toBe(start.x + start.w / 2);
  });

  it('snaps the resulting edges to the grid by default', () => {
    const result = resizeRect(start, 'se', 43, 0);
    expect(result.w % canvas.gridSize).toBe(0);
  });
});

describe('rect helpers', () => {
  it('normalises a drag rectangle regardless of direction', () => {
    expect(normalizeRect(30, 40, 10, 20)).toEqual({ x: 10, y: 20, w: 20, h: 20 });
  });

  it('detects intersection', () => {
    expect(rectsIntersect(rect(0, 0), rect(50, 25))).toBe(true);
    expect(rectsIntersect(rect(0, 0), rect(500, 500))).toBe(false);
  });

  it('unions a set of rects', () => {
    expect(unionRects([rect(0, 0, 10, 10), rect(20, 30, 10, 10)])).toEqual({
      x: 0,
      y: 0,
      w: 30,
      h: 40,
    });
    expect(unionRects([])).toBeNull();
  });

  it('keeps a dragged element partly on the slide', () => {
    const clamped = clampToSlide(rect(-9999, -9999, 100, 50), 24);
    expect(clamped.x).toBe(-76);
    expect(clamped.y).toBe(-26);
  });
});

describe('rotatePoint', () => {
  it('is a no-op at zero degrees', () => {
    expect(rotatePoint(3, 4, 0, 0, 0)).toEqual({ x: 3, y: 4 });
  });

  it('rotates clockwise in screen coordinates', () => {
    const p = rotatePoint(1, 0, 0, 0, 90);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(1, 9);
  });

  it('inverts cleanly', () => {
    const forward = rotatePoint(7, -3, 2, 2, 37);
    const back = rotatePoint(forward.x, forward.y, 2, 2, -37);
    expect(back.x).toBeCloseTo(7, 9);
    expect(back.y).toBeCloseTo(-3, 9);
  });
});
