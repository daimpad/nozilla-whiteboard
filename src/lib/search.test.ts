import { describe, expect, it } from 'vitest';
import { elementTexts, searchDeck } from './search';
import { parseDeck } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/**
 * Geprüft wird, was gefunden wird — und ebenso, was *nicht* gefunden wird.
 *
 * Die zweite Hälfte ist die wichtigere: eine Suche, die auch Kennungen,
 * Zeichennamen und Layoutwerte durchkämmt, findet auf jede Frage etwas, und
 * dann findet sie nichts mehr.
 */
const DECK = parseDeck(
  [
    '---',
    'title: Prüfdeck',
    '---',
    '',
    '<!-- nzl',
    'notes: In der Notiz steht Löwenzahn.',
    'elements:',
    '  - id: card-1',
    '    kind: card',
    '    title: Der Schnitt',
    '    body: Aus dem Entwurf wird eine Kontur.',
    '  - id: icon-1',
    '    kind: icon',
    '    icon: rocket',
    '-->',
    '',
    '# Die Überschrift der ersten Folie',
    '',
    'Ein Absatz mit dem Wort Löwenzahn darin.',
    '',
    '---',
    '',
    '## Zweite Folie',
    '',
    'Hier steht nichts Besonderes.',
  ].join('\n'),
);

describe('die Suche im Deck', () => {
  it('findet im Fließtext, in den Notizen und in einem Element', () => {
    const alle = searchDeck(DECK, 'Löwenzahn');
    expect(alle.map((fund) => fund.wo).sort()).toEqual(['flow', 'notes']);

    const imElement = searchDeck(DECK, 'Entwurf');
    expect(imElement).toHaveLength(1);
    expect(imElement[0].wo).toBe('element');
    expect(imElement[0].elementId).toBe('card-1');
    expect(imElement[0].feld).toBe('Text');
  });

  it('nennt die Folie, auf der ein Treffer steht', () => {
    const [fund] = searchDeck(DECK, 'Besonderes');
    expect(fund.slideIndex).toBe(1);
  });

  it('sucht ohne Rücksicht auf Groß und Klein', () => {
    expect(searchDeck(DECK, 'löwenZAHN').length).toBeGreaterThan(0);
    expect(searchDeck(DECK, 'DER SCHNITT')).toHaveLength(1);
  });

  it('gibt den Ausschnitt zerlegt zurück', () => {
    // Damit die Anzeige hervorheben kann, ohne noch einmal zu suchen.
    const [fund] = searchDeck(DECK, 'Entwurf');
    expect(fund.treffer).toBe('Entwurf');
    expect(fund.vorher).toContain('Aus dem');
    expect(fund.nachher).toContain('wird eine');
    expect(`${fund.vorher}${fund.treffer}${fund.nachher}`).not.toContain('\n');
  });

  it('lässt Kennungen, Zeichennamen und Layoutwerte in Ruhe', () => {
    // Wer nach „card" sucht, meint das Wort auf einer Folie, nicht die
    // Elementart. Eine Suche, die alles durchkämmt, findet immer etwas.
    expect(searchDeck(DECK, 'card-1')).toEqual([]);
    expect(searchDeck(DECK, 'rocket')).toEqual([]);
    expect(searchDeck(DECK, 'canvas')).toEqual([]);
  });

  it('schweigt bei einer zu kurzen Frage', () => {
    // Ein einzelner Buchstabe fände die halbe Mappe.
    expect(searchDeck(DECK, 'e')).toEqual([]);
    expect(searchDeck(DECK, '  ')).toEqual([]);
  });

  it('zählt die Textfelder einer Karte einzeln auf', () => {
    const karte = createElement('card', {
      label: 'Erst',
      title: 'Der Schnitt',
      body: 'Ein Satz.',
    }) as CanvasElement;
    expect(elementTexts(karte).map(([feld]) => feld)).toEqual(['Label', 'Titel', 'Text']);
  });

  it('nimmt den von Hand vergebenen Namen mit', () => {
    const form = createElement('shape', { name: 'Der grüne Kasten' }) as CanvasElement;
    expect(elementTexts(form)).toContainEqual(['Name', 'Der grüne Kasten']);
  });
});
