/**
 * Die Schriftmaße — und vor allem: wofür der Messpuffer steht.
 *
 * Diese Datei hatte keine eigene Prüfung. Mitgenommen wurde sie über die
 * Ausgabewege, und die fragen nach dem Ergebnis eines Satzes; dass der Puffer
 * unter einem *anderen Erscheinungsbild* die alten Breiten herausgab, konnte
 * dort niemand sehen — unter jsdom gibt es kein Canvas, und das Ersatzmodell
 * kennt die Schrift gar nicht.
 *
 * Gemessen wird deshalb gegen eine Attrappe, deren Breite vom Schriftstapel
 * abhängt. Das ist genau die Eigenschaft eines echten Canvas, auf die es hier
 * ankommt, und die einzige, die dieser Fehler braucht.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  approximateWidth,
  baselineOffset,
  font,
  fontCssShorthand,
  measureText,
  resetMeasurementCache,
  trackingWidth,
} from './measure';
import { nozillaTheme, withTheme } from '@/theme';
import { musterkunde } from '@/themes/musterkunde';

/** Zehn Einheiten je Zeichen für Zilla Slab, drei für alles andere. */
const ZILLA = 10;
const ANDERE = 3;

beforeAll(() => {
  // `src/test/setup.ts` stellt `getContext` auf `null`, damit jede Zusicherung
  // über den Satz auf jedem Rechner gilt. Hier wird gerade das Gegenteil
  // gebraucht: eine Messung, die die Schrift *sieht*.
  (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function () {
    return {
      font: '',
      measureText(text: string) {
        const stapel = String((this as { font: string }).font);
        return { width: text.length * (stapel.includes('Zilla Slab') ? ZILLA : ANDERE) };
      },
    };
  };
});

describe('der Messpuffer', () => {
  it('misst unter einem anderen Erscheinungsbild neu', () => {
    /*
       Der Fehler in einem Satz: der Schlüssel nannte die *Rolle* („display")
       und nicht die Schrift, und die Rolle bleibt beim Wechsel dieselbe.

       Der Puffer wird geleert, sobald Schriften ankommen — aber nur dann.
       `withTheme()` fordert grundsätzlich nichts an: es rechnet nur, und
       genau so rechnet die Vorschau des CI-Generators. Eine Marke, die
       dieselben Dateien anders stapelt oder eine Systemschrift nennt, fordert
       ebenfalls nichts nach.
    */
    resetMeasurementCache();
    const spec = font({ family: 'display', size: 16 });

    expect(nozillaTheme.fontFamily.display).toContain('Zilla Slab');
    expect(musterkunde.fontFamily.display).not.toContain('Zilla Slab');

    const unterNozilla = measureText('Hallo', spec);
    const unterMuster = withTheme(musterkunde, () => measureText('Hallo', spec));

    expect(unterNozilla).toBe(5 * ZILLA);
    expect(unterMuster).toBe(5 * ANDERE);
  });

  it('gibt dieselbe Frage aus dem Puffer zurück', () => {
    resetMeasurementCache();
    const spec = font({ family: 'body', size: 16 });
    const erst = measureText('Puffer', spec);
    expect(measureText('Puffer', spec)).toBe(erst);
  });

  it('trennt Größe, Gewicht und Neigung', () => {
    resetMeasurementCache();
    const grund = font({ family: 'body', size: 16 });
    // Die Attrappe misst nach Zeichenzahl; was sich unterscheiden *muss*, ist
    // der Schlüssel — sonst käme für jede Angabe dieselbe Zeile zurück.
    const schluessel = new Set(
      [
        grund,
        font({ family: 'body', size: 24 }),
        font({ family: 'body', size: 16, weight: 700 }),
        font({ family: 'body', size: 16, italic: true }),
        font({ family: 'display', size: 16 }),
      ].map((spec) => fontCssShorthand(spec)),
    );
    expect(schluessel.size).toBe(5);
  });
});

describe('die Laufweite', () => {
  it('sitzt zwischen den Zeichen und wird nicht gepuffert', () => {
    const eng = font({ family: 'body', size: 20, tracking: -0.02 });
    const weit = font({ family: 'body', size: 20, tracking: 0.05 });
    expect(trackingWidth('abcde', eng)).toBeCloseTo(-0.02 * 20 * 5, 6);
    expect(measureText('abcde', weit) - measureText('abcde', eng)).toBeCloseTo(
      (0.05 - -0.02) * 20 * 5,
      6,
    );
  });

  it('ist bei leerem Text null', () => {
    expect(measureText('', font({ size: 16, tracking: 0.1 }))).toBe(0);
    expect(trackingWidth('', font({ size: 16, tracking: 0.1 }))).toBe(0);
  });
});

describe('das Ersatzmodell', () => {
  it('gibt Mono jedem Zeichen dieselbe Breite', () => {
    const mono = font({ family: 'mono', size: 10 });
    expect(approximateWidth('iiii', mono)).toBeCloseTo(approximateWidth('mmmm', mono), 6);
    expect(approximateWidth('WWWW', mono)).toBeCloseTo(approximateWidth('....', mono), 6);
  });

  it('macht ein „i" schmaler als ein „m"', () => {
    const spec = font({ family: 'body', size: 10 });
    expect(approximateWidth('i', spec)).toBeLessThan(approximateWidth('m', spec));
  });

  it('wächst mit der Größe und mit dem Gewicht', () => {
    const klein = approximateWidth('Hallo', font({ size: 10 }));
    expect(approximateWidth('Hallo', font({ size: 20 }))).toBeCloseTo(klein * 2, 6);
    expect(approximateWidth('Hallo', font({ size: 10, weight: 700 }))).toBeGreaterThan(klein);
  });
});

describe('die Grundlinie', () => {
  it('sitzt bei einem Zeilenabstand von 1 auf der Versalhöhe', () => {
    expect(baselineOffset(20, 20)).toBeCloseTo(20 * 0.76, 6);
  });

  it('rückt mit dem Durchschuss zur Hälfte nach unten', () => {
    expect(baselineOffset(20, 30)).toBeCloseTo(5 + 20 * 0.76, 6);
  });
});
