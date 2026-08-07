import { describe, expect, it } from 'vitest';
import { typeScale } from '@/theme';
import { font, measureText } from './measure';
import { typesetMarkdown, typesetText, wrapRuns, type TypesetPrim } from './typeset';

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
