import { describe, expect, it } from 'vitest';
import { flussUeberlauf, overflowOf, unterDerFolienkante } from './overflow';
import { createElement } from '@/model/factory';
import { createEmptySlide, parseDeck } from '@/lib/markdown/deck';
import { setActiveTheme } from '@/theme';
import { registerThemes } from '@/themes';
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

describe('der gemerkte Wert', () => {
  /*
     Die `WeakMap` hielt ihren Wert für die Lebenszeit des Element-Objekts —
     und drei Dinge ändern das Maß, ohne das Element anzufassen: die echte
     Schrift (sie kommt erst nach dem ersten Zeichnen an), ein anderes
     Erscheinungsbild und eingetroffene Bildmaße. `resetMeasurementCache()`
     räumt bei genau diesen Anlässen den Messpuffer; zwei Merker für dieselbe
     Frage, und nur einer verfiel.
  */
  const ueberschrift = () =>
    createElement('text', {
      w: 300,
      h: 60,
      typeStyle: 'h1',
      text: 'Eine Überschrift, die knapp in ihren Kasten passt.',
    } as never) as CanvasElement;

  it('verfällt, wenn ein anderes Erscheinungsbild gilt', () => {
    registerThemes();
    const el = ueberschrift();
    const unterNozilla = overflowOf(el);

    setActiveTheme('musterkunde');
    try {
      // Der Vergleich ist gegen eine frische Kopie: sie kann nichts gemerkt
      // haben, ist also die Wahrheit. Gemessen: 417 gegen 307.
      const richtig = overflowOf({ ...el } as CanvasElement);
      expect(richtig).not.toBe(unterNozilla);
      expect(overflowOf(el)).toBe(richtig);
    } finally {
      setActiveTheme('nozilla');
    }

    // Und wieder zurück — sonst hielte die Prüfung auch für einen Merker, der
    // nur ein einziges Mal verfällt.
    expect(overflowOf(el)).toBe(unterNozilla);
  });

  it('merkt sich trotzdem, was sich nicht geändert hat', () => {
    /*
       Die Gegenrichtung, und sie hält fest, warum der Schlüssel das Element
       *selbst* ist: der Store legt für jede Änderung ein neues Objekt an. Wer
       dasselbe Objekt an Ort und Stelle ändert — was keine Aktion des Stores
       tut —, bekommt den gemerkten Wert. Ohne diese Prüfung bestünde die
       obige auch für eine Fassung ganz ohne Merker.
    */
    const el = ueberschrift();
    const vorher = overflowOf(el);
    (el as { h: number }).h += 4000;
    expect(overflowOf(el)).toBe(vorher);
    expect(overflowOf({ ...el } as CanvasElement)).not.toBe(vorher);
  });
});

describe('ein Bild im Fließtext eines Elements', () => {
  it('zählt für den Überlauf mit', () => {
    /*
       `untersteKante` sah nur Textprimitive. Ein Markdown-Element, dessen
       Inhalt eine Abbildung ist, setzt gar keinen Text: gefunden wurde nichts,
       gemeldet wurde 0. Gemessen: das Bild endet 145 Einheiten unter der
       Unterkante des Kastens.
    */
    const mitBild = createElement('markdown', {
      w: 400,
      h: 80,
      markdown: '![Ein Bild](logo.png)',
    }) as CanvasElement;
    expect(overflowOf(mitBild)).toBeGreaterThan(100);
  });

  it('meldet nichts, wo es hineinpasst', () => {
    // Die Gegenrichtung: derselbe Inhalt in einem Kasten, der hoch genug ist.
    const weit = createElement('markdown', {
      w: 400,
      h: 400,
      markdown: '![Ein Bild](logo.png)',
    }) as CanvasElement;
    expect(overflowOf(weit)).toBe(0);

    // Und ein Bild*element* bleibt außen vor — das wird eingepasst.
    expect(overflowOf(createElement('image', { w: 10, h: 10 }) as CanvasElement)).toBe(0);
  });
});

describe('der Fließtext einer Folie', () => {
  const folie = (markdown: string) => createEmptySlide({ markdown });

  it('meldet sich, wenn er unter den Satzspiegel läuft', () => {
    /*
       Der Wächter kannte nur Elemente — und damit ausgerechnet den Inhalt
       nicht, den jede Folie hat. Gemessen an vierzig Absätzen im
       `default`-Layout: der Satz endet 831 Einheiten unter der Folienkante, in
       jeder Ausgabe, ohne ein Wort.
    */
    const viel = Array.from({ length: 40 }, (_, i) => `Ein Absatz Nummer ${i}.`).join('\n\n');
    expect(flussUeberlauf(folie(viel))).toBeGreaterThan(0);
    expect(unterDerFolienkante(folie(viel))).toBeGreaterThan(0);
  });

  it('hält Satzspiegel und Folienkante auseinander', () => {
    /*
       Zwischen beiden steht der Text noch da — er läuft nur in die Fußzeile.
       Erst darunter steht er in keiner Ausgabe, und ein Satz, der beides
       gleichsetzt, ist an einer der zwei Stellen falsch.
    */
    const knapp = Array.from({ length: 16 }, (_, i) => `Absatz ${i}.`).join('\n\n');
    expect(flussUeberlauf(folie(knapp))).toBeGreaterThan(0);
    expect(unterDerFolienkante(folie(knapp))).toBe(0);
  });

  it('schweigt bei jeder mitgelieferten Folie', () => {
    /*
       Dieselbe Gegenrichtung wie bei den Elementen: ein Wächter, der auf dem
       eigenen Material anschlägt, wird abgeschaltet und bewacht dann gar
       nichts mehr.
    */
    const laufen: string[] = [];
    for (const eintrag of bundledDecks) {
      const deck = parseDeck(eintrag.source);
      setActiveTheme(deck.meta.theme ?? 'nozilla');
      try {
        deck.slides.forEach((slide, index) => {
          const um = flussUeberlauf(slide);
          if (um > 0) laufen.push(`${eintrag.file} Folie ${index + 1} um ${um}`);
        });
      } finally {
        setActiveTheme('nozilla');
      }
    }
    expect(laufen).toEqual([]);
  });

  it('schweigt, wo es gar keinen Fließtext gibt', () => {
    // `canvas` und `blank` geben die Fläche dem frei Gelegten; dort ist die
    // Frage sinnlos und nicht etwa mit „nein" zu beantworten.
    const viel = Array.from({ length: 40 }, (_, i) => `Ein Absatz Nummer ${i}.`).join('\n\n');
    for (const layout of ['canvas', 'blank'] as const) {
      const slide = createEmptySlide({ markdown: viel, meta: { layout } as never });
      expect(flussUeberlauf(slide), layout).toBe(0);
    }
  });
});
