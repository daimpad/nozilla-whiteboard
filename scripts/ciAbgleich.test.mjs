/**
 * Die Rechnung, die einen CI-Sync vor sich selbst schützt.
 *
 * `sync-ci.mjs` ließ sich nie prüfen: es läuft von oben nach unten, schreibt
 * Dateien und beendet den Prozess. Die drei Fragen, auf die es beim Schreiben
 * ankommt, stehen deshalb in `ciAbgleich.mjs` — und hier steht, was sie
 * beantworten müssen.
 *
 * Der Anlass ist gemessen: in diesem Rechner lagen zwei Klone des CI-Repos,
 * der ältere brachte 37 Kern-Zeichen mit, wo der Stand der Quelle 92 führt.
 * Ein Sync hätte 55 Zeichen aus dem Werkzeug genommen, und die Prüfung sagte
 * einen Atemzug vorher „bestanden".
 */
import { describe, expect, it } from 'vitest';
import { krummeZahlen, schluesselAus, verlust } from './ciAbgleich.mjs';

/** Eine erzeugte Datei, wie `sync-ci.mjs` sie schreibt. */
function erzeugt(namen) {
  return [
    '/** GENERIERT — nicht von Hand bearbeiten. */',
    'export const coreIcons = {',
    ...namen.map((name) => `  ${JSON.stringify(name)}: { label: "x", prims: [] },`),
    '} as const;',
    '',
  ].join('\n');
}

describe('schluesselAus', () => {
  it('liest die Namen einer erzeugten Datei', () => {
    expect(schluesselAus(erzeugt(['core-arrow', 'core-bell']))).toEqual([
      'core-arrow',
      'core-bell',
    ]);
  });

  it('nimmt nur die Einträge, nicht den Kopf und nicht die Tiefe', () => {
    /*
       Zwei Leerzeichen, Name, Doppelpunkt — das ist die Zeilenform, die das
       Skript selbst schreibt. Was tiefer steht, gehört zu einem Eintrag und
       ist keiner; was am Rand steht, ist Code.
    */
    const datei = [
      'export const coreIcons = {',
      '  "core-arrow": { label: "Pfeil",',
      '    "prims": [],',
      '  },',
      '"nicht-eingerueckt": {},',
      '} as const;',
    ].join('\n');
    expect(schluesselAus(datei)).toEqual(['core-arrow']);
  });

  it('kommt mit nichts zurecht', () => {
    expect(schluesselAus('')).toEqual([]);
    expect(schluesselAus(undefined)).toEqual([]);
    expect(schluesselAus(null)).toEqual([]);
  });
});

describe('verlust', () => {
  it('nennt, was nur noch im alten Stand steht', () => {
    const alt = erzeugt(['core-arrow', 'core-bell', 'core-book']);
    const neu = erzeugt(['core-arrow', 'core-book']);
    expect(verlust(alt, neu)).toEqual(['core-bell']);
  });

  it('schweigt, wenn nichts verschwindet', () => {
    const alt = erzeugt(['core-arrow']);
    expect(verlust(alt, erzeugt(['core-arrow', 'core-neu']))).toEqual([]);
    expect(verlust(alt, alt)).toEqual([]);
  });

  it('zählt einen Zuwachs nicht als Verlust', () => {
    expect(verlust(erzeugt([]), erzeugt(['core-arrow']))).toEqual([]);
  });

  it('meldet den ganzen Satz, wenn die Quelle leer ist', () => {
    // Der schlimmste Fall und der wahrscheinlichste: ein Verzeichnis, das der
    // Checkout gar nicht hat.
    expect(verlust(erzeugt(['a', 'b', 'c']), erzeugt([]))).toEqual(['a', 'b', 'c']);
  });
});

describe('krummeZahlen', () => {
  it('findet ein NaN und sagt, wo es steht', () => {
    // `<rect width="8">` ohne `x` ergibt `+undefined`.
    const prims = [
      { t: 'rect', x: Number('nicht'), y: 0, w: 8, h: 8 },
      { t: 'circle', cx: 32, cy: 32, r: 4 },
    ];
    expect(krummeZahlen(prims)).toEqual(['0.x']);
  });

  it('sieht auch in eine Liste hinein', () => {
    const prims = [{ t: 'path', d: 'M0 0', dash: [4, Number.NaN], rotate: [90, 32, 32] }];
    expect(krummeZahlen(prims)).toEqual(['0.dash[1]']);
  });

  it('lässt saubere Geometrie in Ruhe', () => {
    const prims = [
      { t: 'rect', x: 54, y: 54, w: 6, h: 6, fill: 'signal' },
      { t: 'path', d: 'M4 4 L60 60', sw: 4, dash: [8, 4] },
    ];
    expect(krummeZahlen(prims)).toEqual([]);
  });

  it('nennt auch Unendlich', () => {
    expect(krummeZahlen([{ t: 'circle', cx: 1 / 0, cy: 0, r: 1 }])).toEqual(['0.cx']);
  });
});
