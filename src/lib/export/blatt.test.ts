/**
 * Die Folie auf einem Blatt Papier.
 *
 * Geprüft wird an der fertigen PDF-Datei und an der Szene, nicht am Erzeuger.
 * Die eine Frage, die nur die Datei beantwortet, ist die nach dem **Maß**: ein
 * Format, das A4 heißt und 385 × 545 Millimeter groß ist, hat die richtige
 * Proportion und ist trotzdem kein A4. Die andere, die nur die Szene
 * beantwortet, ist die nach der Verschiebung: dass ein Primitiv um genau den
 * Betrag gewandert ist und sonst nichts an ihm anders wurde.
 */
import { describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { aufBlatt, buildSlideScene, verschiebePrims, type ScenePrim } from './scene';
import { renderPdf } from './index';

const deck = parseDeck(['# Die Idee', '', 'Ein Satz dazu.', ''].join('\n'));

const folie = () =>
  buildSlideScene(deck.slides[0], deck, { chrome: true, slideNumber: 1, totalSlides: 1 });

/**
 * Die Bytes eines Blob — über `FileReader`, weil der Blob von jsPDF kein
 * `arrayBuffer()` mitbringt und ein Umweg über `Response` den Inhalt als Text
 * liest und damit jedes Byte über 127 zerstört.
 */
function bytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((fertig, schief) => {
    const leser = new FileReader();
    leser.onload = () => fertig(new Uint8Array(leser.result as ArrayBuffer));
    leser.onerror = () => schief(leser.error);
    leser.readAsArrayBuffer(blob);
  });
}

/** Das Seitenmaß der ersten Seite in Millimetern. */
async function blattmass(blob: Blob): Promise<{ breite: number; hoehe: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: await bytes(blob), disableFontFace: true }).promise;
  const seite = await pdf.getPage(1);
  const mm = (pt: number) => (pt / 72) * 25.4;
  return { breite: mm(seite.view[2]), hoehe: mm(seite.view[3]) };
}

/* -------------------------------------------------------------------------- */

describe('das Blatt', () => {
  it('legt die Folie mittig auf eine Seite in DIN-Proportion', () => {
    for (const lage of ['hoch', 'quer'] as const) {
      const blatt = aufBlatt(folie(), lage);
      const lang = Math.max(blatt.width, blatt.height);
      const kurz = Math.min(blatt.width, blatt.height);
      expect(lang / kurz, lage).toBeCloseTo(Math.SQRT2, 3);
      expect(blatt.height > blatt.width, lage).toBe(lage === 'hoch');

      // Mittig heißt: links wie rechts derselbe Rand, oben wie unten auch.
      const rahmen = blatt.prims[blatt.prims.length - 1];
      expect(rahmen?.t).toBe('rect');
      if (rahmen?.t !== 'rect') throw new Error('kein Rahmen');
      expect(rahmen.x, lage).toBeCloseTo(blatt.width - rahmen.x - rahmen.w, 6);
      expect(rahmen.y, lage).toBeCloseTo(blatt.height - rahmen.y - rahmen.h, 6);
      // Und der Rand ist der Satzspiegel der CI, keine erfundene Zahl.
      expect(rahmen.x, lage).toBe(canvas.margin.left);
    }
  });

  it('rechnet die Folie nicht klein', () => {
    /*
       Der Kern des Ganzen: das Blatt wächst, die Folie bleibt. Gemessen an den
       **vorgemessenen Breiten** der Textläufe, denn die sind es, die eine
       Skalierung zur Lüge machen würde — sie beschreiben Glyphen in einer
       Größe, und wer die Größe ändert, ohne neu zu messen, setzt Wörter an
       Stellen, an die sie nicht gehören.
    */
    const vorher = folie().prims.filter((prim) => prim.t === 'text');
    const nachher = aufBlatt(folie(), 'hoch').prims.filter((prim) => prim.t === 'text');
    expect(nachher).toHaveLength(vorher.length);
    expect(vorher.length).toBeGreaterThan(0);
    for (const [index, prim] of vorher.entries()) {
      const gleich = nachher[index];
      if (prim.t !== 'text' || gleich?.t !== 'text') throw new Error('kein Text');
      expect(gleich.runs.map((run) => [run.width, run.font.size, run.text])).toEqual(
        prim.runs.map((run) => [run.width, run.font.size, run.text]),
      );
    }
  });

  it('verschiebt jede Art von Primitiv und lässt keine liegen', () => {
    /*
       Fünf Arten, und alle fünf stehen hier — von Hand gebaut und nicht aus
       einem Deck geholt. Ein Deck, das gerade zufällig keine Ellipse enthält,
       machte aus dieser Prüfung sonst eine über drei Arten, die behauptet, es
       seien fünf. Dieselbe Sorte Wächter, die schon zweimal genau ihren
       eigenen Fall weggefiltert hat.

       Geprüft wird zudem, dass **sonst nichts** anders wurde: eine
       Verschiebung, die dabei eine Farbe, einen Winkel oder eine Textbreite
       anfasst, wäre keine mehr.
    */
    const prims: ScenePrim[] = [
      { t: 'rect', x: 10, y: 20, w: 30, h: 40, fill: '#101010' },
      { t: 'ellipse', cx: 50, cy: 60, rx: 7, ry: 8, stroke: '#101010', strokeWidth: 2 },
      {
        t: 'path',
        closed: true,
        segs: [
          { c: 'M', x: 1, y: 2 },
          { c: 'L', x: 3, y: 4 },
          { c: 'C', x1: 5, y1: 6, x2: 7, y2: 8, x: 9, y: 10 },
          { c: 'Z' },
        ],
        fill: '#101010',
      },
      {
        t: 'text',
        x: 100,
        y: 200,
        rotate: 30,
        runs: [
          {
            dx: 0,
            text: 'Hallo',
            font: { family: 'body', size: 16, weight: 400, italic: false, tracking: 0 },
            color: '#101010',
            width: 42,
          },
        ],
      },
      { t: 'image', x: 11, y: 22, w: 33, h: 44, href: 'bild.png', rotate: 90, alt: 'Ein Bild' },
    ];
    expect(new Set(prims.map((prim) => prim.t)).size).toBe(5);

    const [dx, dy] = [7, 13];
    const gewandert = verschiebePrims(prims, dx, dy);

    // Zurückschieben muss wieder das Ausgangsbild ergeben — das prüft beide
    // Richtungen auf einmal und braucht keine zweite Rechnung daneben.
    expect(verschiebePrims(gewandert, -dx, -dy)).toEqual(prims);

    const ecke = (prim: ScenePrim): [number, number] => {
      if (prim.t === 'ellipse') return [prim.cx, prim.cy];
      if (prim.t === 'path') {
        const erst = prim.segs[0];
        if (erst?.c !== 'M') throw new Error('kein M');
        return [erst.x, erst.y];
      }
      return [prim.x, prim.y];
    };
    for (const [index, prim] of prims.entries()) {
      const ziel = gewandert[index];
      if (!ziel) throw new Error('kein Primitiv');
      const [ax, ay] = ecke(prim);
      const [bx, by] = ecke(ziel);
      expect([bx - ax, by - ay], prim.t).toEqual([dx, dy]);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('das PDF auf A4', () => {
  it('ist wirklich 210 × 297 Millimeter groß', async () => {
    /*
       Die Prüfung, die die Proportion allein nicht abdeckt. Ohne den
       Massstab käme das Blatt mit 1092 × 1544 Punkt heraus — im Verhältnis
       genau richtig und im Maß ein Bogen von 385 × 545 Millimetern, den jeder
       Betrachter beim Drucken verkleinert, mit einem Rand, den niemand
       gewählt hat.
    */
    const hoch = await blattmass((await renderPdf(deck, { seite: 'a4-hoch' })).blob);
    expect(hoch.breite).toBeCloseTo(210, 1);
    expect(hoch.hoehe).toBeCloseTo(297, 1);

    const quer = await blattmass((await renderPdf(deck, { seite: 'a4-quer' })).blob);
    expect(quer.breite).toBeCloseTo(297, 1);
    expect(quer.hoehe).toBeCloseTo(210, 1);
  }, 30000);

  it('lässt die Folienseite, wie sie war', async () => {
    // Die Vorgabe darf sich durch das neue Format nicht ändern: 1280 × 720
    // Einheiten mal 0,75 sind 960 × 540 Punkt, und daran hängt jedes bisher
    // ausgegebene PDF.
    const ohne = await blattmass((await renderPdf(deck)).blob);
    expect(ohne.breite).toBeCloseTo((960 / 72) * 25.4, 2);
    expect(ohne.hoehe).toBeCloseTo((540 / 72) * 25.4, 2);
  }, 30000);

  it('nennt das Format im Dateinamen', async () => {
    // Zwei Ausgaben desselben Decks im selben Ordner unterscheiden sich sonst
    // erst beim Öffnen.
    expect((await renderPdf(deck, { seite: 'a4-quer' })).filename).toMatch(/-a4-quer\.pdf$/);
    expect((await renderPdf(deck)).filename).not.toMatch(/a4/);
  }, 30000);
});
