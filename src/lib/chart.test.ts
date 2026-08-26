import { describe, expect, it } from 'vitest';
import { chartScale, parseChartData } from './chart';

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
