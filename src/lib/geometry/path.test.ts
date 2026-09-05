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
    // Der gedachte Griff spiegelt (2,4) an (4,0) — also (6,−4).
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

  it('liest zusammengezogene Bogenflaggen', () => {
    /*
       Die Flaggen eines Bogens sind einzelne Ziffern und dürfen zusammenkleben:
       `a5 5 0 0110 0` heißt largeArc=0, sweep=1, x=10. Der Leser zerlegte den
       Pfad vorweg in Zahlen, las daraus die 110 und brach mit „Invalid number
       in path data: undefined" ab — und das ist keine Schrulle, sondern genau
       das, was SVGO schreibt. Die Datei eines Logos sieht in aller Regel so
       aus, der Wurf landet beim Zeichnen in einem `useMemo`, und das Fenster
       bleibt weiß.

       Geprüft wird gegen die *ausgeschriebene* Fassung derselben Kurve: beide
       müssen dieselben Segmente ergeben.
    */
    const gespreizt = segsToPath(parsePath('M10 10 a5 5 0 0 1 10 0'));
    for (const kompakt of ['M10 10a5 5 0 0110 0', 'M10 10a5 5 0 01 10 0', 'M10 10a5 5 0 01,10,0']) {
      expect(segsToPath(parsePath(kompakt)), kompakt).toBe(gespreizt);
    }

    // Und die Flaggen werden wirklich gelesen und nicht geraten: derselbe
    // Bogen mit sweep = 0 läuft in die andere Richtung.
    expect(segsToPath(parsePath('M10 10a5 5 0 0010 0'))).not.toBe(gespreizt);
  });

  it('dreht sich nicht, wenn hinter einem Z eine Zahl steht', () => {
    /*
       Jeder Befehl außer `Z` verbraucht mindestens eine Zahl und kommt damit
       voran. `Z` verbraucht keine — stand eine Zahl dahinter, lief die
       Schleife weiter, ohne den Zeiger zu bewegen. Gemessen: 34,8 Sekunden,
       dann `RangeError: Invalid array length`; im Browser ein eingefrorener
       Tab und ein Gigabyte Speicher auf dem Weg.
    */
    expect(() => parsePath('M0 0 L10 0 Z 5 5')).toThrow(/Z takes no arguments/);

    // Die Gegenrichtung: ein `Z` mit einem Befehl dahinter ist gewöhnlich und
    // muss durchgehen.
    expect(parsePath('M0 0 L10 0 Z M20 0 L30 0').map((seg) => seg.c)).toEqual([
      'M',
      'L',
      'Z',
      'M',
      'L',
    ]);
  });

  it('nennt jeden kaputten Pfad beim Namen, statt zu rechnen', () => {
    // Die Pfade kommen aus einer hochgeladenen SVG-Datei; was der Leser nicht
    // versteht, muss er *schnell* und mit einem Satz zurückweisen.
    for (const [d, muster] of [
      ['M', /Invalid number/],
      ['M0 0 L', /Invalid number/],
      ['0 0', /must start with a command/],
      ['M0 0 A1 1 0 2 0 5 5', /Arc flag must be 0 or 1/],
      ['M0 0a1 1 0 0', /Arc flag must be 0 or 1/],
    ] as Array<[string, RegExp]>) {
      expect(() => parsePath(d), d).toThrow(muster);
    }
    // Ein leerer Pfad ist kein Fehler, sondern nichts.
    expect(parsePath('')).toEqual([]);
    expect(parsePath('   ')).toEqual([]);
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
