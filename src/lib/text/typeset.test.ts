import { describe, expect, it } from 'vitest';
import { typeScale } from '@/theme';
import { font, measureText } from './measure';
import {
  tableColumnWidths,
  typesetMarkdown,
  typesetText,
  wrapRuns,
  type TypesetPrim,
} from './typeset';

const body = font({ size: 18 });

const textPrims = (prims: TypesetPrim[]) =>
  prims.filter((prim): prim is Extract<TypesetPrim, { t: 'text' }> => prim.t === 'text');

const lineText = (prim: Extract<TypesetPrim, { t: 'text' }>) =>
  prim.runs.map((run) => run.text).join('');

describe('measureText', () => {
  it('is monotonic in string length', () => {
    expect(measureText('mm', body)).toBeGreaterThan(measureText('m', body));
  });

  it('scales with font size', () => {
    expect(measureText('hello', font({ size: 36 }))).toBeGreaterThan(
      measureText('hello', font({ size: 18 })),
    );
  });

  it('adds letter spacing', () => {
    const plain = measureText('abcdef', font({ size: 20 }));
    const tracked = measureText('abcdef', font({ size: 20, tracking: 0.1 }));
    expect(tracked).toBeGreaterThan(plain);
  });

  it('returns zero for the empty string', () => {
    expect(measureText('', body)).toBe(0);
  });
});

describe('wrapRuns', () => {
  const runs = [{ text: 'one two three four five six seven eight', font: body, color: '#000' }];

  it('breaks lines at the available width', () => {
    const narrow = wrapRuns(runs, 120);
    const wide = wrapRuns(runs, 2000);
    expect(narrow.length).toBeGreaterThan(1);
    expect(wide).toHaveLength(1);
  });

  it('never exceeds the width unless a single word cannot fit', () => {
    for (const line of wrapRuns(runs, 160)) {
      const width = line.reduce((sum, run) => sum + run.width, 0);
      expect(width).toBeLessThanOrEqual(160 + 1e-6);
    }
  });

  it('preserves every word across the line breaks', () => {
    const words = wrapRuns(runs, 100)
      // A break replaces the space it broke on, so rejoin lines with one.
      .map((line) => line.map((run) => run.text).join(''))
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);
    expect(words).toEqual('one two three four five six seven eight'.split(' '));
  });

  it('breaks an unbreakable token by character rather than overflowing', () => {
    const long = [{ text: 'x'.repeat(400), font: body, color: '#000' }];
    const lines = wrapRuns(long, 100);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('honours a hard break', () => {
    const lines = wrapRuns(
      [
        { text: 'before', font: body, color: '#000' },
        { text: '', font: body, color: '#000', hardBreak: true },
        { text: 'after', font: body, color: '#000' },
      ],
      1000,
    );
    expect(lines).toHaveLength(2);
  });

  it('trims trailing whitespace from a finished line', () => {
    const lines = wrapRuns([{ text: 'word ', font: body, color: '#000' }], 1000);
    expect(lines[0][lines[0].length - 1].text.trim()).not.toBe('');
  });
});

describe('typesetText', () => {
  it('lays a single line out at the requested type size', () => {
    const result = typesetText('Hello', 'h1', { width: 600 });
    const lines = textPrims(result.prims);
    expect(lines).toHaveLength(1);
    expect(lines[0].runs[0].font.size).toBe(typeScale.h1.size);
    expect(result.height).toBeCloseTo(typeScale.h1.size * typeScale.h1.lineHeight, 6);
  });

  it('splits on explicit newlines', () => {
    const result = typesetText('one\ntwo', 'body', { width: 600 });
    expect(textPrims(result.prims).map(lineText)).toEqual(['one', 'two']);
  });

  it('applies inline Markdown emphasis', () => {
    const result = typesetText('plain **bold**', 'body', { width: 600 });
    const weights = textPrims(result.prims)[0].runs.map((run) => run.font.weight);
    expect(weights).toContain(700);
  });

  it('honours alignment', () => {
    const left = typesetText('hi', 'body', { width: 600, align: 'left' });
    const centre = typesetText('hi', 'body', { width: 600, align: 'center' });
    expect(textPrims(centre.prims)[0].x).toBeGreaterThan(textPrims(left.prims)[0].x);
  });

  it('scales the whole block', () => {
    const normal = typesetText('hi', 'h2', { width: 600 });
    const big = typesetText('hi', 'h2', { width: 600, scale: 2 });
    expect(big.height).toBeCloseTo(normal.height * 2, 4);
  });
});

describe('typesetMarkdown', () => {
  it('renders headings larger than body copy', () => {
    const result = typesetMarkdown('# Big\n\nsmall', { width: 800 });
    const sizes = textPrims(result.prims).map((prim) => prim.runs[0].font.size);
    expect(sizes[0]).toBeGreaterThan(sizes[1]);
  });

  it('draws a bullet for each list item', () => {
    const result = typesetMarkdown('- one\n- two\n- three', { width: 800 });
    const bullets = result.prims.filter((prim) => prim.t === 'rect');
    expect(bullets).toHaveLength(3);
    expect(textPrims(result.prims).map(lineText)).toEqual(['one', 'two', 'three']);
  });

  it('numbers an ordered list', () => {
    const result = typesetMarkdown('1. first\n2. second', { width: 800 });
    const texts = textPrims(result.prims).map(lineText);
    expect(texts).toContain('1.');
    expect(texts).toContain('2.');
  });

  it('puts a code block on a panel and keeps its lines separate', () => {
    const result = typesetMarkdown('```ts\nconst a = 1;\nconst b = 2;\n```', { width: 800 });
    expect(result.prims.some((prim) => prim.t === 'rect')).toBe(true);
    const texts = textPrims(result.prims).map(lineText);
    expect(texts).toEqual(['const a = 1;', 'const b = 2;']);
    expect(textPrims(result.prims)[0].runs[0].font.family).toBe('mono');
  });

  it('draws a bar beside a blockquote', () => {
    const result = typesetMarkdown('> quoted', { width: 800 });
    const bars = result.prims.filter((prim) => prim.t === 'rect');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('renders a table header and its rows', () => {
    const result = typesetMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |', { width: 800 });
    const texts = textPrims(result.prims).map(lineText);
    expect(texts).toEqual(expect.arrayContaining(['a', 'b', '1', '2']));
  });

  it('emits an image primitive for a lone figure', () => {
    const result = typesetMarkdown('![alt](diagram.png)', {
      width: 800,
      resolveImageSize: () => ({ w: 400, h: 200 }),
    });
    const image = result.prims.find((prim) => prim.t === 'image');
    expect(image).toMatchObject({ t: 'image', src: 'diagram.png', w: 400, h: 200 });
  });

  it('grows in height as content is added', () => {
    const one = typesetMarkdown('para', { width: 800 }).height;
    const two = typesetMarkdown('para\n\npara', { width: 800 }).height;
    expect(two).toBeGreaterThan(one);
  });

  it('returns nothing for empty input', () => {
    expect(typesetMarkdown('', { width: 800 }).prims).toHaveLength(0);
  });

  it('does not typeset raw HTML', () => {
    const result = typesetMarkdown('<script>alert(1)</script>', { width: 800 });
    expect(textPrims(result.prims).map(lineText).join('')).not.toContain('alert');
  });
});

describe('die Spaltenbreiten einer Tabelle', () => {
  const zelle = (text: string) => [{ text, font: body, color: '#000' }];
  const breit = 'ein deutlich längerer Zelleninhalt';

  it('gibt der Spalte mehr, in der mehr steht', () => {
    const [links, rechts] = tableColumnWidths(
      [
        [zelle(breit), zelle('12')],
        [zelle(breit), zelle('7')],
      ],
      600,
      10,
      12,
    );
    expect(links).toBeGreaterThan(rechts * 2);
    expect(links + rechts).toBeCloseTo(600, 3);
  });

  it('lässt der schmalen Spalte trotzdem Platz für ihren Inhalt', () => {
    // Der Fehler, der das gebaut hat: der Innenabstand wurde mitgewichtet.
    // „Wert" bekam seinen Anteil an der *Gesamt*breite, davon gingen zwei
    // Innenabstände ab, und es brach zu „Wer / t" um.
    const spalten = tableColumnWidths([[zelle(breit), zelle('1.240')]], 600, 10, 12);
    expect(spalten[1] - 20).toBeGreaterThan(measureText('1.240', body));
  });

  it('teilt auch dann, wenn nichts mehr passt', () => {
    const spalten = tableColumnWidths([[zelle(breit), zelle(breit)]], 80, 10, 12);
    expect(spalten.reduce((a, b) => a + b, 0)).toBeCloseTo(80, 3);
    for (const breiteSpalte of spalten) expect(breiteSpalte).toBeGreaterThan(0);
  });

  it('lässt eine leere Spalte nicht verschwinden', () => {
    const spalten = tableColumnWidths([[zelle(breit), zelle('')]], 600, 10, 12);
    expect(spalten[1]).toBeGreaterThan(20);
  });
});

describe('was der Setzer aus einem Text macht', () => {
  const zeilen = (quelle: string, width = 400) =>
    textPrims(typesetMarkdown(quelle, { width }).prims).map(lineText);

  it('bricht ein überlanges Wort auch dann, wenn ein Wort davorsteht', () => {
    /*
       Der Kopf von `wrapRuns` verspricht `overflow-wrap: anywhere`. Der
       Zeichenbruch stand aber *innerhalb* des Zweigs „passt noch" und
       zusätzlich hinter `current.length === 0`: er griff nur, wenn das lange
       Wort allein auf der Zeile stand. Sonst lief es über die Kante des
       Elements hinaus — im SVG, im PDF und in der `.pptx`.
    */
    const lang = 'Donaudampfschifffahrtsgesellschaftskapitaenswitwe';
    const breite = (quelle: string) =>
      Math.max(
        ...textPrims(typesetMarkdown(quelle, { width: 200 }).prims).map((prim) =>
          prim.runs.reduce((summe, run) => summe + run.width, 0),
        ),
      );
    expect(breite(lang)).toBeLessThanOrEqual(200);
    expect(breite(`Wort ${lang}`)).toBeLessThanOrEqual(200);
  });

  it('bricht nicht am geschützten Leerzeichen', () => {
    // `\s` schließt U+00A0 ein, und `trim()` zählt es als Weißraum: `10&nbsp;km`
    // wurde an genau der Stelle umgebrochen, an der es nicht umgebrochen
    // werden soll. `decodeEntities()` übersetzt richtig — der Umbruch machte
    // die Übersetzung sofort wieder zunichte.
    expect(zeilen('10&nbsp;km', 44)).not.toEqual(['10', 'km']);
    expect(zeilen('10&nbsp;km', 60)).toEqual(['10 km']);
    // Die Gegenrichtung: ein gewöhnliches Leerzeichen ist sehr wohl eine
    // Umbruchstelle.
    expect(zeilen('10 km', 44)).toEqual(['10', 'km']);
  });

  it('hält zwei Absätze in einem Listenpunkt auseinander', () => {
    // Ein lockerer Listenpunkt bekommt von marked kein `paragraph`, sondern
    // zwei `text`-Kinder mit einem `space` dazwischen — verschmolzen stand
    // danach „Erster Absatz.Zweiter Absatz." ohne Leerzeichen und ohne
    // Umbruch, in jeder Ausgabe.
    expect(zeilen('- Erster Absatz.\n\n  Zweiter Absatz.\n\n- Punkt zwei.')).toEqual([
      'Erster Absatz.',
      'Zweiter Absatz.',
      'Punkt zwei.',
    ]);
    // Und eine gewöhnliche Liste bleibt, wie sie war.
    expect(zeilen('- Eins\n- Zwei')).toEqual(['Eins', 'Zwei']);
  });

  it('führt ein <br> aus, statt es abzudrucken', () => {
    /*
       Auf Blockebene ist die Haltung ausgeschrieben: rohes HTML wird nicht
       gesetzt. Inline galt sie nicht — `<br>` fiel in den `default`-Zweig und
       stand als Text auf der Folie, samt spitzer Klammern. Wer in einem
       Markdown-Feld einen Umbruch erzwingen wollte, bekam ihn ausgedruckt.
    */
    expect(zeilen('Zeile eins<br>Zeile zwei')).toEqual(['Zeile eins', 'Zeile zwei']);
    expect(zeilen('Zeile eins<br/>Zeile zwei')).toEqual(['Zeile eins', 'Zeile zwei']);
    // Alles andere fällt weg, wie auf Blockebene — der Text bleibt, die
    // Klammern nicht.
    expect(zeilen('Text <span class="x">rot</span> hier').join(' ')).not.toContain('<');
    expect(zeilen('Text <span class="x">rot</span> hier').join(' ')).toContain('rot');
  });

  it('zeichnet ein Bild auch dann, wenn Text danebensteht', () => {
    /*
       Erkannt wurde eine Abbildung nur, wenn der Absatz aus genau einem Token
       bestand. Sonst machte `flattenInline` aus dem `image`-Token einen
       kursiven Textlauf mit dem Alternativtext: das Bild fiel aus jeder
       Ausgabe, und auf der Folie stand „Logo" in Kursiv.
    */
    const bilder = (quelle: string) =>
      typesetMarkdown(quelle, { width: 400 }).prims.filter((prim) => prim.t === 'image').length;
    expect(bilder('![Logo](logo.png)')).toBe(1);
    expect(bilder('Siehe ![Logo](logo.png) hier.')).toBe(1);
    // Und der Text daneben geht nicht verloren.
    expect(zeilen('Siehe ![Logo](logo.png) hier.')).toEqual(['Siehe', 'hier.']);
  });
});
