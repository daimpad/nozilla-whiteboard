/**
 * Die Wortmarke aus einer SVG-Datei — gegen echte Exporte gemessen.
 *
 * Diese Datei liest, was ein Zeichenprogramm schreibt, und nicht, was in einer
 * Spezifikation steht. Deshalb sind die Eingaben hier so geschrieben, wie
 * Illustrator, Figma und Inkscape es tun — bis hin zu `SVGID_1_`, dem Namen,
 * den Illustrator jedem Beschnittpfad gibt.
 *
 * An dieser Datei hingen schon zwei Fehler, die kein Test sah: eine dritte
 * Füllfarbe, die nirgends gezeichnet wurde, und ein vom `<g>` geerbtes `fill`,
 * das die Buchstabenpfade von 4152 auf 51 Zeichen schrumpfen ließ. Beide fand
 * nicht das Nachdenken, sondern das Nachmessen an einer echten Datei.
 */
import { describe, expect, it } from 'vitest';
import { readPaths, readViewBox, ungeleseneAngaben, wordmarkFromSvg } from './wordmark';

const svg = (inneres: string, box = '0 0 200 48') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${inneres}</svg>`;

describe('readViewBox', () => {
  it('nimmt beide Anführungszeichen', () => {
    expect(readViewBox(`<svg viewBox='0 0 200 48'>`)).toEqual([0, 0, 200, 48]);
    expect(readViewBox(`<svg viewBox="0 0 200 48">`)).toEqual([0, 0, 200, 48]);
  });

  it('nimmt Kommas als Trenner und weist Unsinn ab', () => {
    expect(readViewBox('<svg viewBox="0,0,200,48">')).toEqual([0, 0, 200, 48]);
    expect(readViewBox('<svg viewBox="0 0 200">')).toBeNull();
    expect(readViewBox('<svg viewBox="0 0 zwei 48">')).toBeNull();
    expect(readViewBox('<svg>')).toBeNull();
  });
});

describe('readPaths', () => {
  it('erbt die Füllung vom umschließenden <g>', () => {
    // Der Fehler, an dem die Buchstabenpfade einmal auf 51 Zeichen schrumpften.
    const pfade = readPaths(svg('<g fill="#111111"><path d="M0 0 H10 Z"/></g>'));
    expect(pfade).toEqual([{ d: 'M0 0 H10 Z', fill: '#111111' }]);
  });

  it('lässt die eigene Füllung die geerbte schlagen', () => {
    const pfade = readPaths(svg('<g fill="#111111"><path d="M0 0 H10 Z" fill="#E4003A"/></g>'));
    expect(pfade[0].fill).toBe('#E4003A');
  });

  it('liest die Füllung auch aus dem style-Attribut', () => {
    const pfade = readPaths(svg('<path d="M0 0 H10 Z" style="fill:#111111" fill="#E4003A"/>'));
    // CSS entscheidet so: die Deklaration schlägt das Präsentationsattribut.
    expect(pfade[0].fill).toBe('#111111');
  });

  it('sammelt nichts aus einem Rahmen, der gar nicht zeichnet', () => {
    /*
       Illustrator schreibt für eine beschnittene Auswahl genau das hier. Der
       Beschnittpfad kam vorher als vollwertiger Pfad zurück — und trug er eine
       Füllung, landete er in derselben Farbe wie die Buchstaben: gemessen
       ergab das `"M0 0 H200 V48 H0 Z M0 10 H150 V38 H0 Z"`, also einen
       schwarzen Balken über der ganzen viewBox, unter dem die Marke
       verschwindet.
    */
    const quelle = svg(
      '<defs><clipPath id="SVGID_1_"><path d="M0 0 H200 V48 H0 Z" fill="#111111"/></clipPath></defs>' +
        '<path d="M0 10 H150 V38 H0 Z" fill="#111111"/>',
    );
    expect(readPaths(quelle)).toEqual([{ d: 'M0 10 H150 V38 H0 Z', fill: '#111111' }]);
    expect(wordmarkFromSvg(quelle, { letters: '#111111' }).letters).toBe('M0 10 H150 V38 H0 Z');
  });

  it('findet nach dem stummen Rahmen wieder alles', () => {
    // Die Gegenrichtung: ein Zähler, der nicht wieder herunterzählt, verschluckt
    // den Rest der Datei — und das sähe wie ein leeres SVG aus.
    const pfade = readPaths(
      svg(
        '<defs><clipPath id="c"><path d="M0 0 H1 Z"/></clipPath></defs>' +
          '<path d="M0 10 H150 Z" fill="#111111"/><path d="M160 10 H170 Z" fill="#E4003A"/>',
      ),
    );
    expect(pfade.map((pfad) => pfad.d)).toEqual(['M0 10 H150 Z', 'M160 10 H170 Z']);
  });

  it('lässt ein selbstschließendes <g/> keinen Rahmen aufmachen', () => {
    const pfade = readPaths(svg('<g fill="#111111"/><path d="M0 0 H10 Z" fill="#E4003A"/>'));
    expect(pfade[0].fill).toBe('#E4003A');
  });
});

describe('wordmarkFromSvg', () => {
  it('teilt die Pfade nach ihrer Farbe und nicht nach ihrer Reihenfolge', () => {
    const marke = wordmarkFromSvg(
      svg('<path d="M160 20 H170 Z" fill="#E4003A"/><path d="M0 10 H150 Z" fill="#111111"/>'),
      { letters: '#111111', accent: '#E4003A' },
    );
    expect(marke.letters).toBe('M0 10 H150 Z');
    expect(marke.period).toBe('M160 20 H170 Z');
  });

  it('hebt beim Zusammenfassen jeden weiteren Pfad auf absolut', () => {
    /*
       Ein `m` am Anfang eines eigenen `<path>` ist nach der Spezifikation
       absolut; hinter einem anderen Teilpfad ist es relativ zu dessen
       Endpunkt. Gemessen an `M0 0 h10` und `m50 50 h10`: zusammengefügt begann
       der zweite bei (60, 50) statt bei (50, 50) — bei einem Schriftzug aus
       einem Pfad je Buchstabe wandert damit jeder Buchstabe weiter als der
       davor.
    */
    const marke = wordmarkFromSvg(
      svg(
        '<path d="M0 0 h10" fill="#111111"/><path d="m50 50 h10" fill="#111111"/>',
        '0 0 100 100',
      ),
      { letters: '#111111' },
    );
    expect(marke.letters).toBe('M0 0 h10 M50 50 h10');
  });

  it('lässt den ersten Pfad, wie er ist', () => {
    // Die Gegenrichtung: der erste Teilpfad steht ohnehin am Ursprung, und ihn
    // anzufassen wäre eine Änderung ohne Anlass.
    const marke = wordmarkFromSvg(svg('<path d="m5 5 h10" fill="#111111"/>', '0 0 100 100'), {
      letters: '#111111',
    });
    expect(marke.letters).toBe('m5 5 h10');
  });

  it('wirft, wenn die viewBox keine Fläche hat', () => {
    expect(() =>
      wordmarkFromSvg(svg('<path d="M0 0 Z" fill="#111"/>', '0 0 0 0'), { letters: '#111' }),
    ).toThrow(/viewBox ohne Fläche/);
  });

  it('wirft, wenn kein Pfad die Buchstabenfarbe trägt', () => {
    expect(() =>
      wordmarkFromSvg(svg('<path d="M0 0 Z" fill="#E4003A"/>'), { letters: '#111111' }),
    ).toThrow(/kein Pfad/);
  });

  it('lässt den Akzent weg, wenn keiner angegeben ist', () => {
    expect(
      wordmarkFromSvg(svg('<path d="M0 0 Z" fill="#111111"/>'), { letters: '#111111' }).period,
    ).toBe('');
  });
});

describe('ungeleseneAngaben', () => {
  /*
     Was dieser Leser nicht mitnimmt, wird gezählt und von `pruefeWortmarke()`
     genannt. Gerechnet wird es nicht: eine Transformation anzuwenden hieße,
     die Matrixrechnung aus `path.ts` ein zweites Mal aufzustellen, und eine
     Ellipse in Kubiken zu wandeln ein zweites `shapes.ts`.
  */
  it('zählt eine Transformation am <g> und am <path>', () => {
    expect(
      ungeleseneAngaben(svg('<g transform="translate(0,-1004.36)"><path d="M0 0 Z"/></g>'))
        .transformationen,
    ).toBe(1);
    expect(ungeleseneAngaben(svg('<path d="M0 0 Z" transform="scale(2)"/>')).transformationen).toBe(
      1,
    );
  });

  it('zählt jede Form, die kein Pfad ist', () => {
    const quelle = svg(
      '<path d="M0 10 H150 Z" fill="#111111"/><circle cx="180" cy="24" r="10" fill="#E4003A"/>' +
        '<rect x="0" y="0" width="4" height="4"/><polygon points="0,0 1,1"/>',
    );
    expect(ungeleseneAngaben(quelle).formen).toBe(3);
  });

  it('zählt nicht, was in einem stummen Rahmen steht', () => {
    // Ein Beschnittpfad wird ohnehin nicht gezeichnet; ihn zu melden wäre der
    // Fehlalarm, gegen den `readPaths` gerade repariert wurde.
    expect(
      ungeleseneAngaben(
        svg('<defs><clipPath id="c"><rect x="0" y="0" width="4" height="4"/></clipPath></defs>'),
      ).formen,
    ).toBe(0);
  });

  it('meldet nichts bei einer Datei, die nur Pfade führt', () => {
    const sauber = svg('<g fill="#111111"><path d="M0 10 H150 Z"/><path d="M160 10 H170 Z"/></g>');
    expect(ungeleseneAngaben(sauber)).toEqual({ transformationen: 0, formen: 0 });
  });
});
