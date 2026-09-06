/**
 * Die Formen der CI — gemessen an dem, was sie zeichnen.
 *
 * Alles, was keine Ikone ist, entsteht hier: jede Form, jeder Verbinder, jede
 * Pfeilspitze. Eine Prüfdatei gab es dafür nie; mitgenommen wurde die Datei
 * über die Ausgabewege, und die fragen nach dem Bild und nicht nach dem
 * Kasten.
 *
 * Genau dort lag der Fehler. Eine Form, die über ihren Kasten hinauszeichnet,
 * sieht auf der Folie in Ordnung aus — und der Auswahlrahmen, der
 * Klickbereich und die Überlaufrechnung folgen dem Kasten und wissen nichts
 * davon.
 */
import { describe, expect, it } from 'vitest';
import { connectorKinds, shapeNames } from '@/model/types';
import { segsBounds, segsToPath } from './path';
import { connectorGeometry, shapeGeometry } from './shapes';

/** Die Maße, in denen eine Form wirklich vorkommt — samt der entarteten. */
const MASSE: Array<[number, number]> = [];
for (const w of [1, 8, 24, 29, 40, 57, 58, 96, 232, 400, 1000]) {
  for (const h of [1, 8, 24, 60, 200, 400]) MASSE.push([w, h]);
}

describe('jede Form bleibt in ihrem Kasten', () => {
  /*
     Der Fehler, gegen den das steht: der Fuß der Sprechblase saß mit einer
     harten `24` von der linken Kante — in *beiden* Zweigen seiner Klemme. Bei
     24 Einheiten Breite, also genau bei `minElementSize`, lief er bis x = 27,8
     und stand damit 3,8 Einheiten außerhalb des Elements. Betroffen war jede
     Sprechblase bis 28 Einheiten Breite, in jeder Ausgabe.
  */
  it.each(shapeNames)('%s läuft nie über ihre Kanten hinaus', (shape) => {
    const draussen = MASSE.filter(([w, h]) => {
      const b = segsBounds(shapeGeometry(shape, w, h).segs);
      return b.x < -0.01 || b.y < -0.01 || b.x + b.w > w + 0.01 || b.y + b.h > h + 0.01;
    });
    expect(draussen).toEqual([]);
  });

  /*
     Die Gegenrichtung, und sie ist die Zusage, an der der Auswahlrahmen hängt:
     eine Form, die ihren Kasten nicht ausfüllt, säße mit sichtbarer Luft in
     ihrem Rahmen. Der einzige Boden ist `Math.max(1, …)`, deshalb erst ab 1.
  */
  it.each(shapeNames)('%s füllt ihren Kasten auch aus', (shape) => {
    const zuKlein = MASSE.filter(([w, h]) => {
      const b = segsBounds(shapeGeometry(shape, w, h).segs);
      return Math.abs(b.w - Math.max(1, w)) > 0.01 || Math.abs(b.h - Math.max(1, h)) > 0.01;
    });
    expect(zuKlein).toEqual([]);
  });
});

describe('was geschlossen heißt, ist geschlossen', () => {
  /*
     `closed` entscheidet in `scene.ts`, ob eine Form gefüllt werden darf. Eine
     Form, die sich für geschlossen ausgibt und keinen Schlussbefehl trägt,
     bekäme eine Füllung, die der Betrachter nicht malt — und eine offene mit
     `closed: true` wäre der Fall, der in `CLAUDE.md` unter „Eine offene Form
     mit Füllung: Fläche verschwand" steht.
  */
  it.each(shapeNames)('%s sagt die Wahrheit über ihren Schluss', (shape) => {
    const { segs, closed } = shapeGeometry(shape, 200, 120);
    const hatZ = segs.some((seg) => seg.c === 'Z');
    expect(hatZ).toBe(closed);
  });

  it('lässt den Eckwinkel vier getrennte Teilpfade sein', () => {
    // Vier Ecken, vier `M`. Zusammengelegt wären es Striche quer über die
    // Fläche — dieselbe Frage wie bei den Teilkonturen eines Buchstabens, nur
    // andersherum.
    const { segs } = shapeGeometry('frame', 200, 120);
    expect(segs.filter((seg) => seg.c === 'M')).toHaveLength(4);
  });

  it('lässt die Klammer einen einzigen offenen Zug sein', () => {
    const { segs } = shapeGeometry('bracket', 200, 120);
    expect(segs.filter((seg) => seg.c === 'M')).toHaveLength(1);
    expect(segs.some((seg) => seg.c === 'Z')).toBe(false);
  });
});

describe('die Sprechblase bleibt, wo sie war', () => {
  /*
     Die Absicht steht als Zahl im Test und nicht als nachgebaute Formel: eine
     Prüfung, die dieselbe Rechnung noch einmal aufschreibt, wandert mit jeder
     Änderung mit. Gemessen ab 58 Einheiten Breite — darunter rückt der Fuß
     nach innen, weil er sonst über die Kante stünde.
  */
  it.each([
    [58, 'M0 0 L58 0 L58 168 L33.28 168 L24 200 L24 168 L0 168 Z'],
    [232, 'M0 0 L232 0 L232 168 L69.6 168 L32.48 200 L32.48 168 L0 168 Z'],
    [400, 'M0 0 L400 0 L400 168 L96 168 L56 200 L56 168 L0 168 Z'],
  ])('zeichnet bei %i Einheiten unverändert', (w, pfad) => {
    expect(segsToPath(shapeGeometry('callout', w as number, 200).segs)).toBe(pfad);
  });

  it('rückt den Fuß nach innen, wo der Kasten ihn sonst nicht trägt', () => {
    const b = segsBounds(shapeGeometry('callout', 24, 200).segs);
    expect(b.x + b.w).toBeLessThanOrEqual(24.01);
  });
});

describe('die Verbinder', () => {
  it.each([
    ['line', 0],
    ['arrow', 1],
    ['double-arrow', 2],
    ['elbow', 1],
  ] as const)('%s trägt %i Spitzen', (kind, anzahl) => {
    expect(connectorGeometry(kind, 400, 120, 2).heads).toHaveLength(anzahl);
  });

  it('kennt jede Art, die das Modell führt', () => {
    // Ohne das bliebe eine fünfte Art unbemerkt die schlichte Linie — den
    // Compiler hält `never` in `shapes.ts` auf, hier steht die Zahl.
    expect(connectorKinds).toHaveLength(4);
  });

  it('setzt die Spitze genau an das Ende der Linie', () => {
    const { heads } = connectorGeometry('arrow', 400, 120, 2);
    const spitze = heads[0][0];
    expect(spitze.c).toBe('M');
    if (spitze.c === 'M') {
      expect(spitze.x).toBeCloseTo(400, 6);
      expect(spitze.y).toBeCloseTo(120, 6);
    }
  });

  it('zieht die Linie unter jeder Spitze zurück', () => {
    /*
       Sonst stünde die Linie in der Spitze und liefe bei einer halbdurch-
       sichtigen Farbe dunkler durch. Gemessen an beiden Enden: der Pfeil
       kürzt hinten, der Doppelpfeil vorn und hinten.
    */
    const ohne = segsBounds(connectorGeometry('line', 400, 0, 2).segs);
    const einer = segsBounds(connectorGeometry('arrow', 400, 0, 2).segs);
    const zwei = segsBounds(connectorGeometry('double-arrow', 400, 0, 2).segs);

    expect(ohne.w).toBeCloseTo(400, 6);
    expect(einer.w).toBeLessThan(ohne.w);
    expect(einer.x).toBeCloseTo(0, 6);
    expect(zwei.w).toBeLessThan(einer.w);
    expect(zwei.x).toBeGreaterThan(0);
  });

  it('führt den Winkelverbinder über einen rechten Winkel', () => {
    const { segs } = connectorGeometry('elbow', 400, 200, 2);
    const punkte = segs.filter((seg) => seg.c === 'M' || seg.c === 'L');
    expect(punkte).toHaveLength(4);
    // Die Mitte ist zweimal derselbe x-Wert: erst waagerecht, dann senkrecht.
    const [, zwei, drei] = punkte as Array<{ x: number; y: number }>;
    expect(zwei.x).toBeCloseTo(drei.x, 6);
    expect(zwei.y).toBeCloseTo(0, 6);
    expect(drei.y).toBeCloseTo(200, 6);
  });
});
