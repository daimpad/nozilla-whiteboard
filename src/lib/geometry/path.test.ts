import { describe, expect, it } from 'vitest';
import {
  applyMat,
  circleSegs,
  ellipseSegs,
  matMultiply,
  matRotateAbout,
  matTranslate,
  parsePath,
  rectSegs,
  segsBounds,
  segsToPath,
  transformSegs,
  type Seg,
} from './path';

describe('parsePath', () => {
  it('parses absolute move and line commands', () => {
    expect(parsePath('M 10 20 L 30 40')).toEqual([
      { c: 'M', x: 10, y: 20 },
      { c: 'L', x: 30, y: 40 },
    ]);
  });

  it('resolves relative commands against the current point', () => {
    expect(parsePath('m 10 10 l 5 0 l 0 5 z')).toEqual([
      { c: 'M', x: 10, y: 10 },
      { c: 'L', x: 15, y: 10 },
      { c: 'L', x: 15, y: 15 },
      { c: 'Z' },
    ]);
  });

  it('expands H and V', () => {
    expect(parsePath('M 0 0 H 10 V 5')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 10, y: 0 },
      { c: 'L', x: 10, y: 5 },
    ]);
  });

  it('repeats an implicit command after a moveto', () => {
    expect(parsePath('M 0 0 1 1 2 2')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 1, y: 1 },
      { c: 'L', x: 2, y: 2 },
    ]);
  });

  it('reflects the control point for S', () => {
    const segs = parsePath('M 0 0 C 1 1 2 2 3 3 S 5 5 6 6');
    expect(segs[2]).toEqual({ c: 'C', x1: 4, y1: 4, x2: 5, y2: 5, x: 6, y: 6 });
  });

  it('promotes quadratics to cubics exactly', () => {
    const [, cubic] = parsePath('M 0 0 Q 3 0 6 0');
    expect(cubic).toEqual({ c: 'C', x1: 2, y1: 0, x2: 4, y2: 0, x: 6, y: 0 });
  });

  it('reflects the control point for T', () => {
    const segs = parsePath('M 0 0 Q 2 4 4 0 T 8 0');
    // The implied control point mirrors (2,4) about (4,0) → (6,-4).
    expect(segs[2]).toMatchObject({ c: 'C' });
    const t = segs[2] as Extract<Seg, { c: 'C' }>;
    expect(t.x1).toBeCloseTo(4 + (2 / 3) * 2, 6);
    expect(t.y1).toBeCloseTo((2 / 3) * -4, 6);
  });

  it('converts elliptical arcs to cubics, because PDF has no arc operator', () => {
    const segs = parsePath('M 0 0 A 5 5 0 0 1 10 0');
    expect(segs[0]).toEqual({ c: 'M', x: 0, y: 0 });
    expect(segs.every((seg) => seg.c === 'M' || seg.c === 'C')).toBe(true);

    // Der Bogen endet, wo er enden soll.
    const last = segs[segs.length - 1] as Extract<Seg, { c: 'C' }>;
    expect(last.x).toBeCloseTo(10, 6);
    expect(last.y).toBeCloseTo(0, 6);
  });

  it('approximates a half circle within a fraction of a pixel', () => {
    // Halbkreis mit Radius 5 um (5,0): der Scheitel muss bei (5,5) liegen.
    const bounds = segsBounds(parsePath('M 0 0 A 5 5 0 0 1 10 0'));
    expect(bounds.x).toBeCloseTo(0, 3);
    expect(bounds.w).toBeCloseTo(10, 3);
    expect(bounds.h).toBeCloseTo(5, 2);
  });

  it('scales up radii that are too small to span the chord', () => {
    // rx/ry sind zu klein für die Sehne — SVG F.6.6 skaliert sie hoch.
    const segs = parsePath('M 0 0 A 1 1 0 0 1 10 0');
    const last = segs[segs.length - 1] as Extract<Seg, { c: 'C' }>;
    expect(last.x).toBeCloseTo(10, 6);
  });

  it('treats a zero radius as a straight line', () => {
    expect(parsePath('M 0 0 A 0 0 0 0 1 10 10')).toEqual([
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: 10, y: 10 },
    ]);
  });

  it('rejects path data that does not start with a command', () => {
    expect(() => parsePath('10 20')).toThrow();
  });
});

describe('shape primitives', () => {
  it('builds a sharp rectangle from four lines', () => {
    const segs = rectSegs(0, 0, 10, 6, 0);
    expect(segs.map((s) => s.c)).toEqual(['M', 'L', 'L', 'L', 'Z']);
    expect(segsBounds(segs)).toEqual({ x: 0, y: 0, w: 10, h: 6 });
  });

  it('clamps the corner radius to half the shorter side', () => {
    const segs = rectSegs(0, 0, 10, 4, 999);
    expect(segsBounds(segs)).toEqual({ x: 0, y: 0, w: 10, h: 4 });
  });

  it('produces a circle whose bounds match its radius', () => {
    const bounds = segsBounds(circleSegs(50, 50, 20));
    expect(bounds.x).toBeCloseTo(30, 6);
    expect(bounds.w).toBeCloseTo(40, 6);
    expect(bounds.h).toBeCloseTo(40, 6);
  });

  it('produces an ellipse with independent radii', () => {
    const bounds = segsBounds(ellipseSegs(0, 0, 30, 10));
    expect(bounds.w).toBeCloseTo(60, 6);
    expect(bounds.h).toBeCloseTo(20, 6);
  });
});

describe('transforms', () => {
  it('translates every point', () => {
    const segs = transformSegs(rectSegs(0, 0, 10, 10, 0), matTranslate(5, 7));
    expect(segsBounds(segs)).toEqual({ x: 5, y: 7, w: 10, h: 10 });
  });

  it('rotates about a pivot', () => {
    const m = matRotateAbout(90, 0, 0);
    const p = applyMat(m, 1, 0);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(1, 9);
  });

  it('composes matrices left-to-right', () => {
    const m = matMultiply(matTranslate(10, 0), matRotateAbout(180, 0, 0));
    const p = applyMat(m, 1, 0);
    expect(p.x).toBeCloseTo(9, 9);
    expect(p.y).toBeCloseTo(0, 9);
  });

  it('leaves geometry untouched under the identity', () => {
    const segs = rectSegs(1, 2, 3, 4, 1);
    expect(transformSegs(segs, matTranslate(0, 0))).toEqual(segs);
  });
});

describe('segsToPath', () => {
  it('serialises to compact SVG path data', () => {
    expect(segsToPath(parsePath('M 0 0 L 10 0 Z'))).toBe('M0 0 L10 0 Z');
  });

  it('round-trips through the parser', () => {
    const original = rectSegs(3, 4, 20, 12, 5);
    expect(parsePath(segsToPath(original, 6))).toEqual(
      original.map((seg) =>
        seg.c === 'Z'
          ? seg
          : Object.fromEntries(
              Object.entries(seg).map(([k, v]) => [k, typeof v === 'number' ? round6(v) : v]),
            ),
      ),
    );
  });
});

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
