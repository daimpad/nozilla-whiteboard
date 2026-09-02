import { describe, expect, it } from 'vitest';
import { overflowOf } from './overflow';
import { createElement } from '@/model/factory';
import { parseDeck } from '@/lib/markdown/deck';
import { bundledDecks } from '@/decks';
import { assetPresets } from '@/assets/presets';
import type { CanvasElement } from '@/model/types';

/**
 * Zwei Hälften, und die zweite ist die wichtigere: eine Anzeige, die bei jedem
 * Element anschlägt, ist so nutzlos wie gar keine. Wer sie einmal zu oft
 * gesehen hat, sieht sie nicht mehr.
 */
const text = (patch: Record<string, unknown>) =>
  createElement('text', {
    typeStyle: 'body',
    text: 'Ein Satz.',
    ...patch,
  } as never) as CanvasElement;

describe('der Überlauf', () => {
  it('schweigt, wo der Inhalt in seinen Kasten passt', () => {
    expect(overflowOf(text({ w: 400, h: 200 }))).toBe(0);
  });

  it('meldet sich, wenn der Text tiefer reicht als der Kasten', () => {
    // Derselbe Text, ein Zehntel der Höhe und ein Drittel der Breite: er
    // bricht öfter um und reicht damit unter die Unterkante.
    const eng = text({
      w: 120,
      h: 20,
      text: 'Ein Satz, der in einem sehr schmalen Kasten viele Male umbrechen muss.',
    });
    expect(overflowOf(eng)).toBeGreaterThan(0);
  });

  it('gibt an, um wie viel — nicht nur, dass', () => {
    const kurz = text({ w: 300, h: 10, text: 'Eine Zeile.' });
    const lang = text({
      w: 300,
      h: 10,
      text: 'Eine Zeile. Und noch eine. Und eine dritte, damit es deutlich mehr wird als vorher.',
    });
    expect(overflowOf(lang)).toBeGreaterThan(overflowOf(kurz));
  });

  it('nimmt Unterlängen und Rundung in Kauf', () => {
    // Ohne Nachsicht schlüge fast jedes Textelement an: die Grundlinie der
    // letzten Zeile liegt fast immer dicht an der Unterkante.
    const knapp = text({ w: 400, h: 26, text: 'Genau eine Zeile.' });
    expect(overflowOf(knapp)).toBe(0);
  });

  it('lässt Bild und Verbinder in Ruhe', () => {
    // Ein Bild wird eingepasst, eine Linie hat keinen Inhalt — dort wäre die
    // Frage sinnlos.
    const bild = createElement('image', { w: 10, h: 10 }) as CanvasElement;
    const linie = createElement('connector', { w: 300, h: 0 }) as CanvasElement;
    expect(overflowOf(bild)).toBe(0);
    expect(overflowOf(linie)).toBe(0);
  });

  it('sieht auch eine Karte an, nicht nur reinen Text', () => {
    const passt = createElement('card', {
      w: 492,
      h: 220,
      title: 'Der Schnitt',
      body: 'Aus dem Entwurf wird eine Kontur.',
    }) as CanvasElement;
    const zuKlein = createElement('card', {
      w: 200,
      h: 40,
      title: 'Der Schnitt',
      body: 'Aus dem Entwurf wird eine Kontur, und aus der Kontur ein Muster.',
    }) as CanvasElement;

    expect(overflowOf(passt)).toBe(0);
    expect(overflowOf(zuKlein)).toBeGreaterThan(0);
  });
});

describe('eine Drehung ändert die Frage nicht', () => {
  /*
     `elementMatrix()` dreht um die Elementmitte, verglichen wurde aber gegen
     die Unterkante des *ungedrehten* Kastens — und das ging in beide
     Richtungen schief. Gemessen an einem 400 × 120-Textkasten mit einem Satz,
     der bequem hineinpasst: bei 270° meldete die Anzeige 144 Einheiten
     Überlauf, bei 90° wanderte der Text nach oben und ein wirklicher Überlauf
     blieb unsichtbar.
  */
  const satz = (patch: Record<string, unknown>) =>
    createElement('text', {
      x: 400,
      y: 300,
      w: 400,
      h: 120,
      typeStyle: 'body',
      text: 'Ein kurzer Satz.',
      ...patch,
    } as never) as CanvasElement;

  it('meldet nichts an einem gedrehten Kasten, in den der Text passt', () => {
    for (const rotation of [0, 15, 45, 90, 180, 270]) {
      expect(overflowOf(satz({ rotation })), `bei ${rotation}°`).toBe(0);
    }
  });

  it('meldet weiter, wenn er wirklich hinausläuft — auch gedreht', () => {
    const lang =
      'Ein Satz, der in einem sehr flachen Kasten viele Male umbrechen muss und ' +
      'deshalb weit unter seine Unterkante reicht.';
    const gerade = overflowOf(satz({ h: 24, text: lang }));
    expect(gerade).toBeGreaterThan(0);
    // Dieselbe Zahl, egal wie das Element steht: der Kasten dreht sich mit
    // seinem Inhalt.
    for (const rotation of [15, 90, 180, 270]) {
      expect(overflowOf(satz({ h: 24, text: lang, rotation })), `bei ${rotation}°`).toBe(gerade);
    }
  });
});

/**
 * Und die Gegenrichtung, an dem, was das Werkzeug selbst mitbringt.
 *
 * Ein Wächter, der auf dem eigenen Material anschlägt, bringt sich selbst um —
 * wer den Balken beim ersten Öffnen als Rauschen abtut, tut es beim eigenen
 * Deck wieder. Gemessen wurde: die Überschrift auf Folie 3 der
 * Willkommensmappe brach in Zilla Slab Bold 68 auf zwei Zeilen und stand 73
 * Einheiten unter ihrem Kasten, der Baustein „Kampagnensatz" um elf.
 *
 * **Gemessen wird hier mit den Ersatzmaßen**, denn im Test gibt es kein
 * Canvas. Für die beiden Befunde stimmten Ersatz und Wirklichkeit überein —
 * gegengerechnet an den echten Schnitten in `public/fonts/`, 886 gegen 868
 * verfügbare Einheiten. Was diese Prüfung sicher fängt, ist die Zeilenzahl und
 * die Höhe; ein Kasten, der nur um ein Prozent zu schmal ist, kann ihr
 * entgehen. Dafür steht die Prüfung im Rauchtest, die im Browser nach dem
 * Balken sieht.
 */
describe('was mitgeliefert wird, läuft selbst nicht über', () => {
  it('kein Baustein der Bibliothek', () => {
    const laufen = assetPresets
      .map((preset) => ({
        id: preset.id,
        um: overflowOf(createElement(preset.kind, preset.patch as Partial<CanvasElement>)),
      }))
      .filter((eintrag) => eintrag.um > 0);
    expect(laufen).toEqual([]);
  });

  it('kein Element der mitgelieferten Decks', () => {
    const laufen: string[] = [];
    for (const eintrag of bundledDecks) {
      parseDeck(eintrag.source).slides.forEach((folie, index) => {
        for (const element of folie.elements) {
          const um = overflowOf(element);
          if (um > 0) laufen.push(`${eintrag.file} Folie ${index + 1} · ${element.id} um ${um}`);
        }
      });
    }
    expect(laufen).toEqual([]);
  });
});
