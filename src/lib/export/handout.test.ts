/**
 * Das Handout: je Seite eine Folie und darunter ihre Notizen.
 *
 * Geprüft wird an der fertigen PDF-Datei und nicht am Erzeuger. Der Grund ist
 * derselbe wie überall hier: die Seite ist das Ergebnis, und eine Zusicherung
 * über eine Szene sagt nichts darüber, ob die Notizen auf dem Blatt unter der
 * Folie stehen oder darüber.
 */
import { describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { buildHandoutScene } from './scene';
import { scenesToPdf } from './pdf';

const DECK = [
  '<!-- nzl',
  'notes: Neunzig Sekunden. Erst die Idee, dann der Beleg.',
  '-->',
  '',
  '# Die Idee',
  '',
  '---',
  '',
  '# Ohne Notiz',
  '',
].join('\n');

const deck = parseDeck(DECK);

describe('die Handout-Szene', () => {
  it('ist so breit wie die Folie und hoch wie ein DIN-Blatt', () => {
    // Nicht die Folienmaße: sonst stünden die Notizen außerhalb der Seite.
    const szene = buildHandoutScene(deck.slides[0], deck);
    expect(szene.width).toBe(canvas.width);
    expect(szene.height / szene.width).toBeCloseTo(Math.SQRT2, 3);
  });

  it('setzt die Notizen unter die Folie, nicht darauf', () => {
    const szene = buildHandoutScene(deck.slides[0], deck);
    const texte = szene.prims.filter((prim) => prim.t === 'text');
    const unten = texte.filter((prim) => prim.y > canvas.height);
    expect(unten.length).toBeGreaterThan(0);
    // Und die Folie selbst bleibt, wo sie ist — keine Koordinate wurde
    // umgerechnet. Genau deshalb gibt es keinen zweiten Zeichner.
    expect(texte.some((prim) => prim.y < canvas.height)).toBe(true);
  });

  it('lässt den Platz leer, wenn es nichts zu sagen gibt', () => {
    const szene = buildHandoutScene(deck.slides[1], deck);
    expect(szene.prims.filter((prim) => prim.t === 'text' && prim.y > canvas.height)).toEqual([]);
    // Die Seite ist trotzdem eine ganze Seite: ein Handout ohne Notizen ist
    // eine Folie mit Platz zum Schreiben.
    expect(szene.height / szene.width).toBeCloseTo(Math.SQRT2, 3);
  });
});

describe('das Handout als Datei', () => {
  it('trägt je Folie eine Seite im Hochformat, mit den Notizen darauf', async () => {
    const doc = await scenesToPdf(
      deck.slides.map((slide, index) =>
        buildHandoutScene(slide, deck, { slideNumber: index + 1, totalSlides: deck.slides.length }),
      ),
      { title: 'Handout', embedFonts: false },
    );
    const bytes = new Uint8Array(doc.output('arraybuffer'));

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: true }).promise;
    expect(pdf.numPages).toBe(2);

    const seite = await pdf.getPage(1);
    const [, , breite, hoehe] = seite.view;
    // Hochformat, und zwar das der DIN-A-Reihe. Vorher nahm `scenesToPdf` das
    // Maß aus den Tokens der CI statt aus der Szene — damit wäre jede Seite
    // quer und die Notizen stünden außerhalb.
    expect(hoehe / breite).toBeCloseTo(Math.SQRT2, 2);

    const inhalt = await seite.getTextContent();
    const stuecke = inhalt.items as { str: string; transform: number[] }[];
    const notiz = stuecke.find((stueck) => stueck.str.includes('Neunzig Sekunden'));
    expect(notiz).toBeDefined();

    /*
       Und sie steht *unter* der Folie. Im PDF wächst y nach oben: die Folie
       belegt den oberen Teil, die Notiz muss also unterhalb ihrer Unterkante
       liegen. Ohne diese Prüfung hielte der Test auch dann, wenn die Notiz
       quer über der Überschrift läge.
    */
    const folienUnterkante = hoehe - canvas.height * (breite / canvas.width);
    expect(notiz!.transform[5]).toBeLessThan(folienUnterkante);
  });
});
