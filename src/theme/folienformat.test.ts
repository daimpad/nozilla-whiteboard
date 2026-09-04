/**
 * Das Folienformat — geprüft am Ergebnis eines Wechsels, nicht an der Mechanik.
 *
 * Ob eine exportierte Bindung lebendig ist, sagt die Sprachspezifikation. Was
 * sie nicht sagt: ob irgendwo im Werkzeug jemand die Folienhöhe beim Laden in
 * eine Konstante geschrieben hat. Drei solche Stellen gab es — der Satzspiegel
 * der Layouts, die Fußzeile und das Seitenmaß im PPTX. Genau die fielen hier
 * auf: die Szene käme nach dem Wechsel mit der alten Höhe heraus.
 *
 * Dieselbe Bauart wie `runtime.test.ts` beim Erscheinungsbild, und aus
 * demselben Grund.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { canvas as ciCanvas } from '@theme';
import {
  aktivesFolienformat,
  canvas,
  cssVariables,
  folienformate,
  folienformatVersion,
  folienhoehe,
  istFolienformat,
  setzeFolienformat,
} from './index';
import { flowFrame, footerFrame } from '@/lib/layout/slideLayout';
import { slideLandmarks } from '@/lib/geometry/snap';
import { buildSlideScene } from '@/lib/export/scene';
import { sceneToSvg } from '@/lib/export/svg';
import { scenesToPdf } from '@/lib/export/pdf';
import { parseDeck } from '@/lib/markdown/deck';

const deck = parseDeck(['# Die Idee', '', 'Ein Satz dazu.', ''].join('\n'));
const szene = () => buildSlideScene(deck.slides[0], deck, { chrome: true, slideNumber: 1 });

afterEach(() => {
  setzeFolienformat('16-9');
});

/* -------------------------------------------------------------------------- */

describe('die Formate selbst', () => {
  it('nimmt für 16:9 die Höhe der CI — und der Name stimmt', () => {
    /*
       Der Schlüssel heißt `16-9` und die Höhe kommt aus der CI, nicht aus dem
       Namen. Beides zusammen geht nur auf, solange die CI wirklich 16:9 ist —
       änderte sie ihr Maß, wäre der Name eine Lüge, und zwar eine im
       Dateiformat. Wer ein Format benennt, muss es auch zeichnen.
    */
    expect(folienhoehe('16-9')).toBe(ciCanvas.height);
    expect(ciCanvas.width / ciCanvas.height).toBeCloseTo(16 / 9, 6);
  });

  it('macht beide A4-Formate höher als 16:9', () => {
    // Daran hängt das Versprechen, dass ein bestehendes Deck beim Umstellen
    // nichts verliert: nach unten ist mehr Platz, nicht weniger.
    expect(folienhoehe('a4-hoch')).toBeGreaterThan(folienhoehe('16-9'));
    expect(folienhoehe('a4-quer')).toBeGreaterThan(folienhoehe('16-9'));
    for (const format of ['a4-hoch', 'a4-quer'] as const) {
      const lang = Math.max(ciCanvas.width, folienhoehe(format));
      const kurz = Math.min(ciCanvas.width, folienhoehe(format));
      expect(lang / kurz, format).toBeCloseTo(Math.SQRT2, 3);
    }
    expect(folienhoehe('a4-hoch')).toBeGreaterThan(ciCanvas.width);
    expect(folienhoehe('a4-quer')).toBeLessThan(ciCanvas.width);
  });

  it('ändert ausschließlich die Höhe', () => {
    /*
       Das ist keine Feinheit, sondern die Zusage, auf der zwei Modulkonstanten
       ruhen: `HOECHSTKANTE` in `imageElement.ts` liest `canvas.width` beim
       Laden, `NOTIZ_ABSTAND` in `scene.ts` den oberen Satzspiegel. Beide sind
       genau so lange in Ordnung, wie ein Format nichts als die Höhe anfasst.
       Käme je ein Format dazu, das die Breite ändert, wird diese Zusicherung
       rot — und zwar bevor die beiden still falsch werden.
    */
    for (const format of folienformate) {
      setzeFolienformat(format);
      expect({ ...canvas, height: 0 }, format).toEqual({ ...ciCanvas, height: 0 });
    }
  });

  it('erkennt einen Formatnamen und weist alles andere ab', () => {
    for (const format of folienformate) expect(istFolienformat(format)).toBe(true);
    for (const murks of ['a4', '', 'A4-HOCH', null, 4, undefined]) {
      expect(istFolienformat(murks), String(murks)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('ein Wechsel des Formats', () => {
  it('kommt im SVG an', () => {
    const vorher = sceneToSvg(szene());
    setzeFolienformat('a4-hoch');
    const nachher = sceneToSvg(szene());

    expect(vorher).toContain(`viewBox="0 0 ${ciCanvas.width} ${ciCanvas.height}"`);
    expect(nachher).toContain(`viewBox="0 0 ${ciCanvas.width} ${folienhoehe('a4-hoch')}"`);
    // Und nicht nur der Kopf: die Untergrundfläche der Folie ist die erste
    // Zeichnung der Szene und muss das Blatt füllen.
    expect(nachher).toContain(`height="${folienhoehe('a4-hoch')}"`);
  });

  it('kommt im PDF an', async () => {
    setzeFolienformat('a4-quer');
    const doc = await scenesToPdf([szene()], { embedFonts: false });
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(doc.output('arraybuffer')),
      disableFontFace: true,
    }).promise;
    const seite = await pdf.getPage(1);
    // 0,75 ist der übliche Massstab: eine Folieneinheit ist ¾ Punkt.
    expect(seite.view[3]).toBeCloseTo(folienhoehe('a4-quer') * 0.75, 1);
  }, 30000);

  it('schiebt die Fußzeile mit — sie stand sonst auf halber Seite', () => {
    const vorher = footerFrame().y;
    setzeFolienformat('a4-hoch');
    expect(footerFrame().y - vorher).toBe(folienhoehe('a4-hoch') - ciCanvas.height);
  });

  it('macht den Satzspiegel höher, aber nicht breiter', () => {
    const vorher = flowFrame('default');
    setzeFolienformat('a4-hoch');
    const nachher = flowFrame('default');
    expect(nachher?.h).toBe((vorher?.h ?? 0) + folienhoehe('a4-hoch') - ciCanvas.height);
    // Die waagerechte Hälfte bleibt gleich — daran hängt, dass kein Text neu
    // umbricht und kein bestehendes Deck mit anderen Zeilen zurückkommt.
    expect(nachher?.w).toBe(vorher?.w);
    expect(nachher?.x).toBe(vorher?.x);
  });

  it('setzt die waagerechten Fanglinien neu und lässt die senkrechten stehen', () => {
    const vorher = slideLandmarks();
    setzeFolienformat('a4-quer');
    const nachher = slideLandmarks();
    expect(nachher.horizontal).not.toEqual(vorher.horizontal);
    expect(nachher.horizontal).toContain(folienhoehe('a4-quer'));
    expect(nachher.vertical).toEqual(vorher.vertical);
  });

  it('zieht die CSS-Variable mit, die fremdes CSS liest', () => {
    /*
       `--nz-canvas-h` steht ausdrücklich für fremdes CSS in `cssVariables()`.
       Vor dem Umbau kam sie aus der Konfiguration; damit hätte sie nach einem
       Wechsel die alte Höhe genannt, und das ist die schlimmere Sorte Fehler:
       keine Ausgabe wäre falsch, nur eine Angabe, der jemand glaubt.
    */
    setzeFolienformat('a4-hoch');
    expect(cssVariables()['--nz-canvas-h']).toBe(`${folienhoehe('a4-hoch')}px`);
    expect(cssVariables()['--nz-canvas-w']).toBe(`${ciCanvas.width}px`);
  });

  it('stellt beim Zurückschalten genau den alten Zustand her', () => {
    const vorher = sceneToSvg(szene());
    setzeFolienformat('a4-hoch');
    setzeFolienformat('16-9');
    expect(sceneToSvg(szene())).toBe(vorher);
    expect(aktivesFolienformat()).toBe('16-9');
  });

  it('zählt nur, wenn sich wirklich etwas ändert', () => {
    // Ein Deck zu laden, das dasselbe Format trägt wie das vorige, ist der
    // Normalfall — und `announce()` zeichnet die halbe Oberfläche neu.
    const stand = folienformatVersion();
    expect(setzeFolienformat('16-9')).toBe(false);
    expect(folienformatVersion()).toBe(stand);
    expect(setzeFolienformat('a4-quer')).toBe(true);
    expect(folienformatVersion()).toBe(stand + 1);
  });
});
