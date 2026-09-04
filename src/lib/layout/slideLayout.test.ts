/**
 * Was beim Verkleinern der Folie unter die Kante rutscht.
 *
 * Gelesen wird ein Deck, kein von Hand gebautes Modell: die Koordinaten sollen
 * denselben Weg gegangen sein wie die eines echten Decks, `normalizeElement`
 * eingeschlossen.
 */
import { describe, expect, it } from 'vitest';
import { canvas, folienhoehe } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { unterDerKante } from './slideLayout';

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
