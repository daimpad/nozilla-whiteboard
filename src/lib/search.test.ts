import { describe, expect, it } from 'vitest';
import { elementTexts, ersetzeAlle, fundstellen, searchDeck, zaehleFunde } from './search';
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
    expect(elementTexts(karte).map((f) => f.feld)).toEqual(['Label', 'Titel', 'Text']);
    // Und der Schlüssel kommt mit — ohne ihn wüsste das Ersetzen nicht, wohin.
    expect(elementTexts(karte).map((f) => f.schluessel)).toEqual(['label', 'title', 'body']);
  });

  it('nimmt den von Hand vergebenen Namen mit', () => {
    const form = createElement('shape', { name: 'Der grüne Kasten' }) as CanvasElement;
    expect(elementTexts(form)).toContainEqual({
      feld: 'Name',
      schluessel: 'name',
      text: 'Der grüne Kasten',
    });
  });
});

describe('ersetzen', () => {
  it('ersetzt jeden Fund, nicht nur den ersten', () => {
    // Die Suche zeigt je Feld einen Treffer — das ist eine Sache der Anzeige.
    // Ersetzt wird trotzdem alles, sonst bliebe die Hälfte stehen.
    expect(ersetzeAlle('Deck, Deck und nochmal Deck', 'deck', 'Foliensatz')).toEqual({
      text: 'Foliensatz, Foliensatz und nochmal Foliensatz',
      anzahl: 3,
    });
  });

  it('beachtet Groß und Klein nicht — in beide Richtungen', () => {
    expect(ersetzeAlle('DECK und deck', 'Deck', 'x').anzahl).toBe(2);
  });

  it('kommt nicht in eine Schleife, wenn der Ersatz das Gesuchte enthält', () => {
    // „a" → „aa" wäre ohne den einen Durchgang von links nach rechts unendlich.
    expect(ersetzeAlle('aaa', 'a', 'aa')).toEqual({ text: 'aaaaaa', anzahl: 3 });
  });

  it('lässt den Text in Ruhe, wenn nichts passt', () => {
    const text = 'Ein Satz ohne den Fund.';
    const raus = ersetzeAlle(text, 'xyz', 'abc');
    expect(raus.anzahl).toBe(0);
    // Dasselbe Objekt wäre zu viel verlangt, aber derselbe Text nicht.
    expect(raus.text).toBe(text);
  });

  it('schneidet nicht daneben, wenn Kleinschreiben die Länge ändert', () => {
    /*
       `'İ'.toLowerCase()` ist zwei Zeichen lang. Wer den Index aus der
       kleingeschriebenen Fassung am Original anlegt, schneidet danach um eins
       daneben und frisst einen Buchstaben. Lieber ein Treffer weniger.
    */
    const text = 'İstanbul und Wien';
    expect(ersetzeAlle(text, 'wien', 'Graz').text).not.toContain('undWien');
    expect(ersetzeAlle(text, 'Wien', 'Graz')).toEqual({ text: 'İstanbul und Graz', anzahl: 1 });
  });

  it('findet alle Stellen, mit ihren Positionen', () => {
    expect(fundstellen('abcabc', 'bc')).toEqual([
      { at: 1, laenge: 2 },
      { at: 4, laenge: 2 },
    ]);
    expect(fundstellen('abc', '')).toEqual([]);
  });
});

describe('zaehleFunde', () => {
  it('zählt Vorkommen, nicht Zeilen der Liste', () => {
    /*
       Die Liste zeigt eine Zeile je Feld. „Zwiebelsuppe und Zwiebelbrot"
       steht in einem Feld: eine Zeile, zwei Fundstellen. Der Knopf zum
       Ersetzen nennt die zweite Zahl, denn die tut er auch.
    */
    const deck = parseDeck('# Zwiebelsuppe und Zwiebelbrot\n');
    expect(searchDeck(deck, 'zwiebel')).toHaveLength(1);
    expect(zaehleFunde(deck, 'zwiebel')).toBe(2);
  });

  it('schweigt unter zwei Zeichen, wie die Suche auch', () => {
    expect(zaehleFunde(parseDeck('# aaa\n'), 'a')).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Beschriftung eines Verbinders', () => {
  it('ist zu finden und zu ersetzen', () => {
    // Sie stand bei den Arten *ohne* Text und war damit weder zu finden noch
    // über „Alle ersetzen" zu ändern — dasselbe, was dem Diagramm schon
    // einmal passiert ist.
    const verbinder = createElement('connector', { label: 'abgelehnt' });
    expect(elementTexts(verbinder)).toContainEqual({
      feld: 'Beschriftung',
      schluessel: 'label',
      text: 'abgelehnt',
    });

    // Und die Gegenrichtung: ohne Beschriftung meldet er nichts.
    expect(elementTexts(createElement('connector', {}))).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('die drei Kunden von fundstellen()', () => {
  /*
     `searchDeck()` zeigt die Liste, `zaehleFunde()` beschriftet den Knopf,
     `ersetzeImDeck()` tut es — alle drei fragen dieselbe Rechnung, und einer
     stellte die Frage anders: `searchDeck()` faltete sie vorher klein.

     `fundstellen()` faltet selbst, aber nur, solange das Falten die Länge
     nicht ändert; sonst vergleicht es genau. Eine vorgefaltete Frage traf in
     diesem zweiten Zweig auf den Originaltext — und fand nichts.
  */
  const MIT_I = 'Ein Wort mit İ und Straße';

  it('ist genau ein Zeichen im BMP, an dem das hängt', () => {
    /*
       Die Behauptung des Kommentars, gemessen statt geglaubt: U+0130 İ ist
       das einzige Zeichen unter 0x10000, das beim Kleinschreiben länger wird.
       Der Fall ist damit schmal — und keiner, den man sich ausdenkt: er
       braucht kein türkisches Suchwort, sondern nur ein türkisches Wort
       irgendwo im *Text*.
    */
    const waechst: string[] = [];
    for (let cp = 0; cp <= 0xffff; cp += 1) {
      const zeichen = String.fromCodePoint(cp);
      if (zeichen.toLocaleLowerCase('de-DE').length !== zeichen.length) waechst.push(zeichen);
    }
    expect(waechst).toEqual(['İ']);
  });

  it('gibt auf dieselbe Frage dieselbe Antwort', () => {
    const deck = parseDeck(`# ${MIT_I}\n`);
    // Die Liste zählt Felder, der Zähler Vorkommen — gleich sind sie nur
    // darin, *ob* etwas da ist. Genau das ist die Frage, an der die Leiste
    // hängt: sie sperrt den Knopf und schreibt „Nichts gefunden.".
    expect(searchDeck(deck, 'Straße').length > 0).toBe(zaehleFunde(deck, 'Straße') > 0);
    expect(zaehleFunde(deck, 'Straße')).toBe(1);
    expect(searchDeck(deck, 'Straße')).toHaveLength(1);
  });

  it('findet auch das Wort, das das Zeichen selbst trägt', () => {
    const deck = parseDeck('# İstanbul im Text\n');
    expect(zaehleFunde(deck, 'İstanbul')).toBe(1);
    expect(searchDeck(deck, 'İstanbul')).toHaveLength(1);
  });

  it('bleibt dabei blind für Groß und Klein, wo das Falten trägt', () => {
    const deck = parseDeck('# ÄPFEL und Äpfel\n');
    expect(searchDeck(deck, 'äpfel')).toHaveLength(1);
    expect(zaehleFunde(deck, 'äpfel')).toBe(2);
    expect(ersetzeAlle('ÄPFEL und Äpfel', 'äpfel', 'Birnen').anzahl).toBe(2);
  });

  it('hält die Zusage über das ganze Prüfdeck', () => {
    /*
       Die Regel und nicht der Einzelfall: für jedes Wort, das im Prüfdeck
       vorkommt, müssen Liste und Zähler sich einig sein, ob es etwas gibt.
       Ein Einzelfall bewacht den Fall, den jemand aufgeschrieben hat.
    */
    const woerter = new Set(
      DECK.slides
        .flatMap((slide) => [slide.markdown, slide.meta.notes ?? ''])
        .join(' ')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((wort) => wort.length >= 2),
    );
    expect(woerter.size).toBeGreaterThan(10);
    const uneinig = [...woerter].filter(
      (wort) => searchDeck(DECK, wort).length > 0 !== zaehleFunde(DECK, wort) > 0,
    );
    expect(uneinig).toEqual([]);
  });
});
