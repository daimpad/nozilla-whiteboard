/**
 * Was beim Verkleinern der Folie unter die Kante rutscht.
 *
 * Gelesen wird ein Deck, kein von Hand gebautes Modell: die Koordinaten sollen
 * denselben Weg gegangen sein wie die eines echten Decks, `normalizeElement`
 * eingeschlossen.
 */
import { describe, expect, it } from 'vitest';
import { canvas, folienformate, folienhoehe, setzeFolienformat } from '@/theme';
import { createEmptySlide, parseDeck } from '@/lib/markdown/deck';
import { buildSlideBackdrop } from '@/lib/export/scene';
import { flowBounds, insertColumns, insertColumnWidth, unterDerKante } from './slideLayout';

/** Ein Deck mit einem Element je genannter Höhe, eines je Folie. */
function deckMit(...hoehen: number[]) {
  const folien = hoehen.map((y, index) =>
    [
      '<!-- nzl',
      'layout: blank',
      'elements:',
      `  - id: e${index}`,
      '    kind: text',
      '    x: 88',
      `    y: ${y}`,
      '    w: 400',
      '    h: 96',
      '    text: Irgendwas',
      '-->',
      '',
      `# Folie ${index + 1}`,
      '',
    ].join('\n'),
  );
  /*
     `---` und nicht `- - -`: die zweite Schreibweise ist genau die, die der
     Serialisierer benutzt, *damit* sie kein Folientrenner ist. Der erste
     Anlauf hier stand mit ihr da, bekam ein einziges Folienobjekt zurück und
     meldete, es liege nichts unter der Kante.
  */
  return parseDeck(folien.join('\n---\n\n'));
}

describe('was unter der Kante läge', () => {
  it('zählt, was auf der kleineren Folie nicht mehr zu sehen wäre', () => {
    const deck = deckMit(100, 1200, 1500);
    // Auf A4 hoch (1810) ist alles drauf; auf 16:9 (720) sind es die beiden
    // tiefen — und die Folie, auf der sie liegen, steht mit dabei.
    expect(unterDerKante(deck, folienhoehe('a4-hoch'))).toEqual([]);
    const verlust = unterDerKante(deck, folienhoehe('16-9'));
    expect(verlust.map((eintrag) => eintrag.folie)).toEqual([1, 2]);
    expect(verlust.map((eintrag) => eintrag.element.id)).toEqual(['e1', 'e2']);
  });

  it('lässt gelten, was mit der kleinsten Elementgröße über der Kante bleibt', () => {
    /*
       Die Schwelle in beide Richtungen — eine Regel, deren Gegenrichtung
       niemand prüft, ist eine halbe Regel. Sie ist `minElementSize`: bleibt
       weniger als die kleinste zulässige Elementgröße über der Kante, ist das
       Element praktisch weg; genau so viel ist es noch da.
    */
    const kante = folienhoehe('16-9') - canvas.minElementSize;
    expect(unterDerKante(deckMit(kante), folienhoehe('16-9'))).toEqual([]);
    expect(unterDerKante(deckMit(kante + 1), folienhoehe('16-9'))).toHaveLength(1);
  });

  it('sagt nichts über ein Deck ohne freie Elemente', () => {
    expect(unterDerKante(parseDeck('# Nur Fließtext\n'), folienhoehe('16-9'))).toEqual([]);
  });
});

/**
 * Der Kasten, den der Fließtext einnimmt — gemessen an dem, was gezeichnet
 * wird.
 *
 * `flowBounds()` hat einen einzigen Kunden: das Einsetzen weicht ihm aus. Läuft
 * er auseinander mit dem, was die Szene setzt, landet Eingesetztes im Text oder
 * unnötig weit darunter — und man sieht es nur, wenn man beide nebeneinander
 * legt. Also nebeneinander gelegt.
 */
describe('der Kasten des Fließtextes', () => {
  const bild = '# Titel\n\n![Logo](logo.png)\n\nEin Absatz danach.';
  const masse = (src: string) => (src === 'logo.png' ? { w: 300, h: 300 } : undefined);

  /** Die Unterkante dessen, was `buildSlideBackdrop` wirklich setzt. */
  const gezeichnet = (markdown: string) => {
    const slide = createEmptySlide({ markdown });
    const prims = buildSlideBackdrop(slide, { resolveImageSize: masse });
    let unten = -Infinity;
    for (const prim of prims) {
      if (prim.t === 'image') unten = Math.max(unten, prim.y + prim.h);
      else if (prim.t === 'text') unten = Math.max(unten, prim.y);
    }
    return unten;
  };

  it('rechnet mit den Maßen der Bilder, die darin stehen', () => {
    /*
       Ohne sie fällt der Setzer auf „volle Spaltenbreite, Verhältnis 0,5625"
       zurück: gemessen 762 Einheiten statt 441 — der gemiedene Kasten wäre um
       ein Drittel zu hoch, und Eingesetztes landete entsprechend tiefer.
    */
    const mit = flowBounds('default', bild, masse)!;
    const ohne = flowBounds('default', bild)!;
    expect(mit.h).toBeLessThan(ohne.h);

    // Und die Zahl, auf die es ankommt: die Unterkante muss die des
    // Gezeichneten sein. Die letzte Zeile nennt ihre Grundlinie, deshalb ein
    // paar Einheiten Spiel für die Unterlänge.
    expect(mit.y + mit.h - gezeichnet(bild)).toBeGreaterThan(0);
    expect(mit.y + mit.h - gezeichnet(bild)).toBeLessThan(20);
  });

  it('bleibt ohne Bild derselbe', () => {
    // Die Gegenrichtung: wo kein Bild steht, ändert der Maßgeber nichts. Ohne
    // sie bestünde die Prüfung oben auch für einen, der immer etwas anderes
    // rechnet.
    const schlicht = '# Titel\n\nEin Absatz danach.';
    expect(flowBounds('default', schlicht, masse)).toEqual(flowBounds('default', schlicht));
  });
});

describe('die Spalten, in die eingesetzt wird', () => {
  it('liegen im Raster — wie der Prompt es verlangt', () => {
    /*
       Drei Stellen sprechen über dasselbe Raster: `computeSnap()` und
       `resizeRect()` rasten jedes gezogene Element darauf ein, und der
       Deck-Prompt verlangt vom Modell ein Vielfaches von `gridSize`. Das
       Einsetzen sprach nicht mit: 530 Einheiten bei x = 662. Sichtbar wurde
       es beim ersten Anfassen — das Element sprang auf das Raster und verlor
       dabei die rechte Kante des Satzspiegels.
    */
    const breite = insertColumnWidth();
    expect(breite % canvas.gridSize).toBe(0);
    for (const x of insertColumns()) expect(x % canvas.gridSize).toBe(0);

    // Und die Absicht bleibt: die letzte Spalte endet auf dem Satzspiegel.
    const letzte = insertColumns().at(-1)!;
    expect(letzte + breite).toBe(canvas.width - canvas.margin.right);
  });

  it('halten das auch auf einem anderen Blatt', () => {
    // `canvas` ist eine lebendige Bindung; eine Zahl, die nur im Startformat
    // aufgeht, ist keine Zusicherung.
    for (const blatt of folienformate) {
      setzeFolienformat(blatt);
      expect(`${blatt}: ${insertColumnWidth() % canvas.gridSize}`).toBe(`${blatt}: 0`);
      for (const x of insertColumns())
        expect(`${blatt}: ${x % canvas.gridSize}`).toBe(`${blatt}: 0`);
    }
    setzeFolienformat('16-9');
  });
});
