/**
 * Das Handout: je Seite eine Folie und darunter ihre Notizen.
 *
 * Geprüft wird an der fertigen PDF-Datei und nicht am Erzeuger. Der Grund ist
 * derselbe wie überall hier: die Seite ist das Ergebnis, und eine Zusicherung
 * über eine Szene sagt nichts darüber, ob die Notizen auf dem Blatt unter der
 * Folie stehen oder darüber.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { canvas, folienhoehe, setzeFolienformat } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { buildHandoutScenes } from './scene';
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

afterEach(() => setzeFolienformat('16-9'));

describe('die Handout-Szene', () => {
  it('ist so breit wie die Folie und hoch wie ein DIN-Blatt', () => {
    // Nicht die Folienmaße: sonst stünden die Notizen außerhalb der Seite.
    const [szene] = buildHandoutScenes(deck.slides[0], deck);
    expect(szene.width).toBe(canvas.width);
    expect(szene.height / szene.width).toBeCloseTo(Math.SQRT2, 3);
  });

  it('setzt die Notizen unter die Folie, nicht darauf', () => {
    const [szene] = buildHandoutScenes(deck.slides[0], deck);
    const texte = szene.prims.filter((prim) => prim.t === 'text');
    const unten = texte.filter((prim) => prim.y > canvas.height);
    expect(unten.length).toBeGreaterThan(0);
    // Und die Folie selbst bleibt, wo sie ist — keine Koordinate wurde
    // umgerechnet. Genau deshalb gibt es keinen zweiten Zeichner.
    expect(texte.some((prim) => prim.y < canvas.height)).toBe(true);
  });

  it('setzt die Notizen auf die nächste Seite, wenn die Folie das Blatt füllt', () => {
    /*
       Ein Deck im Format `a4-hoch` ist genau so hoch wie das Blatt — unter der
       Folie ist dann kein Platz. Gemessen, bevor das hier stand: die erste
       Notizzeile stand bei y = 1899 auf einem 1810 hohen Blatt, also auf
       keiner Seite des PDF, und zwar wortlos.

       Die Regel „die erste Zeile einer Seite wird nie umgebrochen" gilt für
       eine *Notizseite*, auf der es keinen besseren Ort gäbe. Die Folienseite
       hat einen: die nächste.
    */
    setzeFolienformat('a4-hoch');
    const seiten = buildHandoutScenes(deck.slides[0], deck);
    expect(seiten.length).toBeGreaterThan(1);
    for (const [nummer, szene] of seiten.entries()) {
      const drueber = szene.prims.filter((prim) => prim.t === 'text' && prim.y > szene.height);
      expect(drueber, `Seite ${nummer + 1} setzt Text unter die Blattkante`).toEqual([]);
    }
    // Und die erste Seite trägt nur die Folie: keine Notiz zwischen ihrer
    // Unterkante und dem Blattrand, weil dort nichts hinpasst.
    const ersteNotiz = seiten[0].prims.filter(
      (prim) => prim.t === 'text' && prim.y > folienhoehe('a4-hoch'),
    );
    expect(ersteNotiz).toEqual([]);
  });

  it('lässt die Notizen auf der Folienseite, wo Platz ist', () => {
    // Die Gegenrichtung: eine 16:9-Folie füllt das Blatt nicht, und dann
    // gehört die Notiz darunter und nicht auf ein zweites Blatt. Ohne diese
    // Hälfte bestünde die Prüfung auch für ein Handout, das die Notiz *immer*
    // auf die nächste Seite schiebt.
    const seiten = buildHandoutScenes(deck.slides[0], deck);
    expect(seiten).toHaveLength(1);
    expect(seiten[0].prims.some((prim) => prim.t === 'text' && prim.y > canvas.height)).toBe(true);
  });

  it('lässt den Platz leer, wenn es nichts zu sagen gibt', () => {
    const [szene] = buildHandoutScenes(deck.slides[1], deck);
    expect(szene.prims.filter((prim) => prim.t === 'text' && prim.y > canvas.height)).toEqual([]);
    // Die Seite ist trotzdem eine ganze Seite: ein Handout ohne Notizen ist
    // eine Folie mit Platz zum Schreiben.
    expect(szene.height / szene.width).toBeCloseTo(Math.SQRT2, 3);
  });
});

describe('das Handout als Datei', () => {
  it('trägt je Folie eine Seite im Hochformat, mit den Notizen darauf', async () => {
    const doc = await scenesToPdf(
      deck.slides.flatMap((slide, index) =>
        buildHandoutScenes(slide, deck, {
          slideNumber: index + 1,
          totalSlides: deck.slides.length,
        }),
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

  it('setzt eine lange Notiz auf einer zweiten Seite fort', async () => {
    /*
       Unter der Folie bleiben knapp tausend Einheiten. Wer mehr aufschreibt,
       verlor den Rest **wortlos**: gemessen an sechzig Absätzen standen 1188
       Einheiten unterhalb der Blattkante — im PDF also nirgends.

       Geprüft wird an den **Seiten der Datei** und nicht an der Szene: dass
       eine Szene Primitive trägt, sagt nichts darüber, ob sie auf einem Blatt
       landen.
    */
    const lang = parseDeck('# Eine Folie\n');
    lang.slides[0].meta.notes = Array.from(
      { length: 60 },
      (_, i) => `Absatz ${i + 1} mit genug Text, dass er eine ganze Zeile füllt und umbricht.`,
    ).join('\n\n');

    const doc = await scenesToPdf(buildHandoutScenes(lang.slides[0], lang), {
      title: 'Handout',
      embedFonts: false,
    });
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: true }).promise;
    expect(pdf.numPages).toBeGreaterThan(1);

    // Jeder Absatz steht auf irgendeiner Seite — und zwar innerhalb ihrer
    // Kanten. Der Fehler war ja nicht, dass die Zeilen fehlten, sondern dass
    // sie außerhalb des Blattes lagen.
    const gefunden = new Set<string>();
    for (let nummer = 1; nummer <= pdf.numPages; nummer += 1) {
      const seite = await pdf.getPage(nummer);
      const [, , seitenbreite, seitenhoehe] = seite.view;
      const inhalt = await seite.getTextContent();
      // `margin.left` und nicht `margin.top`: der Satzspiegel des Handouts
      // nimmt denselben Rand nach allen Seiten, und die beiden Tokens sind
      // nicht dieselbe Zahl.
      const oben = seitenhoehe - canvas.margin.left * (seitenbreite / canvas.width);
      for (const stueck of inhalt.items as { str: string; transform: number[] }[]) {
        const treffer = stueck.str.match(/Absatz (\d+)/);
        if (!treffer) continue;
        expect(
          stueck.transform[5],
          `Absatz ${treffer[1]} liegt außerhalb der Seite`,
        ).toBeGreaterThan(0);
        /*
           Und *unterhalb* des oberen Randes. Ein gesetztes Textprimitiv trägt
           seine **Grundlinie** als `y`, eine Fläche ihre Oberkante — wer das
           gleichsetzt, legt die erste Zeile jeder Folgeseite genau auf den
           Rand und lässt ihre Versalhöhe darüber hinausragen. Das liegt noch
           auf dem Blatt und ist trotzdem falsch.
        */
        expect(stueck.transform[5], `Absatz ${treffer[1]} ragt über den Rand`).toBeLessThan(oben);
        gefunden.add(treffer[1]!);
      }
    }
    expect(gefunden.size).toBe(60);
  });
});
