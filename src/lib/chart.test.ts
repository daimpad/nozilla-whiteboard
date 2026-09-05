import { describe, expect, it } from 'vitest';
import { chartScale, liesChart, parseChartData } from './chart';
import { backgroundStyle, buildElementPrims } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { createElement } from '@/model/factory';

describe('die Zahlen eines Diagramms', () => {
  it('liest Beschriftung und Wert je Zeile', () => {
    expect(parseChartData('2023  38\n2024  52')).toEqual([
      { label: '2023', value: 38, signal: false },
      { label: '2024', value: 52, signal: false },
    ]);
  });

  it('trennt auch an Tabulator, Semikolon und senkrechtem Strich', () => {
    // Damit man aus einer Tabellenkalkulation kopieren kann, ohne vorher
    // aufzuräumen.
    expect(parseChartData('Q1\t12').map((p) => p.value)).toEqual([12]);
    expect(parseChartData('Q1; 12').map((p) => p.value)).toEqual([12]);
    expect(parseChartData('Q1 | 12').map((p) => p.value)).toEqual([12]);
  });

  it('lässt ein einzelnes Leerzeichen in der Beschriftung stehen', () => {
    // „Erstes Quartal 12" darf nicht zu „Quartal" werden. Getrennt wird erst
    // ab zwei Leerzeichen.
    expect(parseChartData('Erstes Quartal  12')).toEqual([
      { label: 'Erstes Quartal', value: 12, signal: false },
    ]);
  });

  it('versteht deutsche Zahlen samt Einheit', () => {
    expect(parseChartData('Umsatz  1.240,5 €').map((p) => p.value)).toEqual([1240.5]);
    expect(parseChartData('Quote  86 %').map((p) => p.value)).toEqual([86]);
    // Ein Punkt ohne Komma ist ein Dezimalpunkt und kein Tausendertrenner —
    // „3.5" ist dreieinhalb und nicht fünfunddreißig.
    expect(parseChartData('Wert  3.5').map((p) => p.value)).toEqual([3.5]);
  });

  it('hebt genau einen Wert hervor', () => {
    // Die CI erlaubt höchstens ein Signal-Element pro Folie. Mehrere Sterne
    // wären ein Verstoß, den niemand bemerkt.
    const punkte = parseChartData('a 1\n* b 2\n* c 3');
    expect(punkte.map((p) => p.signal)).toEqual([false, true, false]);
  });

  it('überspringt, was keine Zahl trägt', () => {
    expect(parseChartData('nur Text\n\n  \n2024  52')).toEqual([
      { label: '2024', value: 52, signal: false },
    ]);
  });

  it('lässt die Achse bei null anfangen', () => {
    // Die verbreitetste Art, mit einem Diagramm zu lügen: eine Achse, die bei
    // 38 beginnt, macht aus vier Prozent Unterschied einen doppelt so hohen
    // Balken. Sie passiert meist aus Versehen.
    expect(chartScale(parseChartData('a 38\nb 40\nc 42')).min).toBe(0);
  });

  it('macht Platz nach unten, sobald ein Wert negativ ist', () => {
    const skala = chartScale(parseChartData('a -12\nb 30'));
    expect(skala.min).toBe(-12);
    expect(skala.max).toBe(30);
  });

  it('gibt einer Reihe aus lauter Nullen trotzdem eine Höhe', () => {
    const skala = chartScale(parseChartData('a 0\nb 0'));
    expect(skala.max).toBeGreaterThan(skala.min);
  });
});

describe('deutsche Tausenderpunkte', () => {
  it('liest eine Ganzzahl mit mehreren Punkten', () => {
    /*
       Der Punkt galt nur als Tausendertrenner, wenn ein Komma dabeistand —
       eine deutsche Ganzzahl hat aber keines. Aus „1.234.567" wurde `NaN`, und
       `parseChartData` warf die ganze Zeile weg: die Reihe hatte einen Balken
       weniger, ohne ein Wort.
    */
    expect(parseChartData('Nord\t1.234.567')).toEqual([
      { label: 'Nord', value: 1234567, signal: false },
    ]);
    expect(parseChartData('Nord\t1.234.567,5')[0].value).toBe(1234567.5);

    // Und die Gegenrichtung: ein *einzelner* Punkt bleibt ein Dezimalpunkt.
    // „3.5" ist drei Komma fünf, und raten wäre hier schlimmer als lesen.
    expect(parseChartData('Nord\t3.5')[0].value).toBe(3.5);
    expect(parseChartData('Nord\t1.240')[0].value).toBe(1.24);
  });
});

/*
   Die Zahl wird gelesen, nicht herausgeschnitten.

   `zahlAus` warf früher alles weg, was keine Ziffer, kein Komma, kein Punkt
   und kein Minus war (`replace(/[^\d,.-]/g, '')`) — und das ist etwas anderes
   als lesen: es macht aus jeder Zelle irgendeine Zahl. Geprüft wird deshalb
   bis ins fertige SVG, denn dort steht sie am Balken.
*/
describe('eine Zelle, in der keine Zahl steht', () => {
  it('erfindet keine aus dem, was danebensteht', () => {
    // Gemessen: „1e3" wurde 13, und „1,23E+09" — die Schreibweise, in der eine
    // Tabellenkalkulation große Zahlen ausgibt — wurde 1,23.
    expect(parseChartData('Nord\t1e3')).toEqual([]);
    expect(parseChartData('Nord\t1,23E+09')).toEqual([]);
    // Zwei Zahlen in einer Zelle sind keine Zahl.
    expect(parseChartData('Nord\t12 - 15')).toEqual([]);
  });

  it('macht aus einem Bindestrich im Namen kein Vorzeichen', () => {
    /*
       Ein einzelnes Leerzeichen trennt nicht, „Nord-West 12" ist also *eine*
       Zelle. Der Bindestrich blieb beim Wegwerfen stehen und wurde zum Minus:
       der Balken zeigte nach unten.
    */
    expect(parseChartData('Nord-West 12')[0].value).toBe(12);
    // Und die Gegenrichtung: ein Minus, das wirklich eines ist, bleibt.
    expect(parseChartData('Nord\t-12')[0].value).toBe(-12);
  });

  it('liest eine mit Komma getrennte Zeile nicht als Bruchteil', () => {
    // „Region,12" wurde 0,12 — ein Diagramm aus lauter Nullen, ohne ein Wort.
    // Das Komma trennt hier nicht (es ist das deutsche Dezimalzeichen), die
    // Beschriftung bleibt deshalb leer; die Zahl muss trotzdem stimmen.
    expect(parseChartData('Region,12')[0].value).toBe(12);
  });

  it('lässt jeden Zierrat gelten, der keine Ziffer enthält', () => {
    // Die Gegenrichtung zu allem darüber: was vorher schon ging, geht weiter.
    const wert = (quelle: string) => parseChartData(`Nord\t${quelle}`)[0]?.value;
    expect(wert('1.240,5 €')).toBe(1240.5);
    expect(wert('86 %')).toBe(86);
    expect(wert('€ 1.240')).toBe(1.24);
    expect(wert('1 234 567')).toBe(1234567);
    expect(wert("1'234'567")).toBe(1234567);
    expect(wert('(12)')).toBe(12);
  });

  it('nennt jede Zeile, die nichts hergab', () => {
    /*
       Der eigentliche Befund: eine Zeile ohne Zahl fiel wortlos heraus, die
       Reihe hatte einen Balken weniger, und wer nicht nachzählte, merkte es
       nie. Dieselbe Stille wie beim leeren `catch` der Selbstsicherung.
    */
    const lese = liesChart('Nord\t12\nSued\tkeine Angabe\n\nWest\t1e3');
    expect(lese.punkte.map((p) => p.label)).toEqual(['Nord']);
    expect(lese.ungelesen).toEqual(['Sued\tkeine Angabe', 'West\t1e3']);

    // Und die Gegenrichtung: wo alles gelesen wurde, wird nichts gemeldet.
    // Ohne sie bestünde die Prüfung auch für einen Melder, der immer klagt.
    expect(liesChart('Nord\t12\n\n  \nSued\t8').ungelesen).toEqual([]);
  });

  it('steht mit dem, was gezeichnet wird, an einer Stelle', () => {
    /*
       Am Ergebnis und nicht am Leser: über dem Balken stand „13", während in
       der Zelle „1e3" steht. Verglichen wird deshalb, was das SVG an Text
       trägt, mit dem, was der Leser zurückgibt.
    */
    const data = 'Nord\t1e3\nSued\t2';
    const element = createElement('chart', { w: 400, h: 240, data, values: true });
    const markup = primsToSvgMarkup(buildElementPrims(element, backgroundStyle('paper')));
    const texte = [...markup.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((treffer) =>
      treffer[1].trim(),
    );
    expect(texte).toEqual(['2', 'SUED']);
  });
});

describe('sehr viele Zeilen', () => {
  it('bringen die Achse nicht zum Werfen', () => {
    /*
       `Math.max(...werte)` ist eine Argumentliste, und die ist begrenzt:
       gemessen warf es ab rund 130.000 Werten `RangeError`. Diese Rechnung
       läuft beim Zeichnen in einem `useMemo` — das wäre ein weißes Fenster.
    */
    const punkte = Array.from({ length: 200_000 }, (_, i) => ({
      label: '',
      value: i,
      signal: false,
    }));
    expect(chartScale(punkte)).toEqual({ min: 0, max: 199_999 });
  });
});
