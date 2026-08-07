import { describe, expect, it } from 'vitest';
import { canvas, color, elementTones, palette, typeScale } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import type { Deck } from '@/model/types';
import { buildElementPrims, buildSlideScene, elementPaint, withAlpha } from './scene';
import { primsToSvgMarkup, sceneToSvg, scenesToContactSheet, escapeXml } from './svg';
import { splitSubpaths } from './pdf';
import { parseColor } from './color';
import { collectImageSources } from './images';
import { slugify } from './download';

const deckOf = (source: string): Deck => parseDeck(source);

describe('scene building', () => {
  it('always paints a background covering the whole slide', () => {
    const deck = deckOf('# Hello');
    const scene = buildSlideScene(deck.slides[0], deck);
    expect(scene.width).toBe(canvas.width);
    expect(scene.height).toBe(canvas.height);
    expect(scene.prims[0]).toMatchObject({ t: 'rect', x: 0, y: 0, w: canvas.width, h: canvas.height });
  });

  it('typesets flow Markdown into positioned text primitives', () => {
    const deck = deckOf('# Heading\n\nSome body copy.');
    const scene = buildSlideScene(deck.slides[0], deck);
    const texts = scene.prims.filter((prim) => prim.t === 'text');
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });

  it('paints elements in z order', () => {
    const deck = deckOf(
      [
        '<!-- nzl',
        'elements:',
        '  - id: back',
        '    kind: shape',
        '    x: 0',
        '    y: 0',
        '    z: 0',
        '  - id: front',
        '    kind: badge',
        '    x: 0',
        '    y: 0',
        '    z: 1',
        '    text: Front',
        '-->',
      ].join('\n'),
    );
    const scene = buildSlideScene(deck.slides[0], deck);
    const svg = primsToSvgMarkup(scene.prims);
    expect(svg.indexOf('Front')).toBeGreaterThan(0);
  });

  it('honours the reveal step', () => {
    const deck = deckOf(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: badge',
        '    x: 0',
        '    y: 0',
        '    text: Later',
        '    reveal:',
        '      step: 2',
        '-->',
      ].join('\n'),
    );
    const hidden = buildSlideScene(deck.slides[0], deck, { revealStep: 1 });
    const shown = buildSlideScene(deck.slides[0], deck, { revealStep: 2 });
    expect(primsToSvgMarkup(hidden.prims)).not.toContain('Later');
    expect(primsToSvgMarkup(shown.prims)).toContain('Later');
  });

  it('adds the footer and slide number, and respects `bare`', () => {
    const deck = deckOf('---\nfooter: Internal\n---\n\n# S');
    const withChrome = buildSlideScene(deck.slides[0], deck, { slideNumber: 2, totalSlides: 7 });
    const markup = primsToSvgMarkup(withChrome.prims);
    expect(markup).toContain('Internal');
    expect(markup).toContain('2 / 7');

    deck.slides[0].meta.bare = true;
    expect(primsToSvgMarkup(buildSlideScene(deck.slides[0], deck).prims)).not.toContain('Internal');
  });

  it('rotates geometry rather than leaving it axis-aligned', () => {
    const straight = buildElementPrims(createElement('shape', { x: 0, y: 0, rotation: 0 }));
    const turned = buildElementPrims(createElement('shape', { x: 0, y: 0, rotation: 30 }));
    expect(primsToSvgMarkup(straight)).not.toEqual(primsToSvgMarkup(turned));
  });
});

describe('elementPaint', () => {
  it('uses the CI tone ramp, never an ad-hoc colour', () => {
    const soft = elementPaint(createElement('card', { tone: 'primary', fill: 'soft' }));
    expect(soft.body.fill).toBe(elementTones.primary.softFill);
    expect(soft.body.stroke).toBe(elementTones.primary.border);

    const solid = elementPaint(createElement('card', { tone: 'accent', fill: 'solid' }));
    expect(solid.body.fill).toBe(elementTones.accent.solidFill);
    expect(solid.text).toBe(elementTones.accent.solidText);

    const outline = elementPaint(createElement('shape', { tone: 'support', fill: 'outline' }));
    expect(outline.body.fill).toBeUndefined();
    expect(outline.body.stroke).toBe(elementTones.support.accentText);

    expect(elementPaint(createElement('text', { fill: 'none' })).body).toEqual({});
  });
});

describe('SVG export', () => {
  const deck = deckOf(
    [
      '---',
      'title: Export & <Test>',
      '---',
      '',
      '<!-- nzl',
      'elements:',
      '  - kind: icon',
      '    x: 40',
      '    y: 40',
      '    icon: rocket',
      '  - kind: badge',
      '    x: 200',
      '    y: 40',
      '    text: Ship it',
      '-->',
      '',
      '# Title',
      '',
      'Body with `code` and a [link](https://example.invalid).',
    ].join('\n'),
  );

  const svg = sceneToSvg(buildSlideScene(deck.slides[0], deck));

  it('produces a standalone SVG document', () => {
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('emits real vector primitives, not a raster or foreignObject', () => {
    expect(svg).toContain('<path ');
    expect(svg).toContain('<text ');
    expect(svg).not.toContain('foreignObject');
    expect(svg).not.toContain('data:image/png');
  });

  it('keeps text selectable and CI-styled', () => {
    expect(svg).toContain('Ship it');
    expect(svg).toContain(`font-size="${typeScale.h1.size}"`);
    expect(svg).toContain(`font-weight="${typeScale.h1.weight}"`);
    // Colours come from the CI ramp, never from an ad-hoc literal.
    expect(svg).toContain(palette.cobalt[500]);
    expect(svg).toContain(color.ink);
    const literals = svg.match(/#[0-9a-f]{6}/gi) ?? [];
    const allowed = new Set(
      Object.values(palette)
        .flatMap((ramp) => Object.values(ramp))
        .map((value) => value.toLowerCase()),
    );
    expect(literals.filter((value) => !allowed.has(value.toLowerCase()))).toEqual([]);
  });

  it('escapes markup in content', () => {
    expect(svg).toContain('Export &amp; &lt;Test&gt;');
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });

  it('is well-formed XML', () => {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('stacks a whole deck into one contact sheet', () => {
    const multi = deckOf('# One\n\n---\n\n# Two\n\n---\n\n# Three');
    const scenes = multi.slides.map((slide) => buildSlideScene(slide, multi));
    const sheet = scenesToContactSheet(scenes, 24);
    expect(sheet.match(/<g transform="translate/g)).toHaveLength(3);
    expect(sheet).toContain(`height="${canvas.height * 3 + 48}"`);
  });
});

describe('PDF geometry translation', () => {
  it('splits a path into subpaths with deltas from the current point', () => {
    const subpaths = splitSubpaths([
      { c: 'M', x: 10, y: 10 },
      { c: 'L', x: 20, y: 10 },
      { c: 'L', x: 20, y: 20 },
      { c: 'Z' },
      { c: 'M', x: 50, y: 50 },
      { c: 'L', x: 60, y: 50 },
    ]);

    expect(subpaths).toHaveLength(2);
    expect(subpaths[0]).toEqual({
      start: { x: 10, y: 10 },
      legs: [
        [10, 0],
        [0, 10],
      ],
      closed: true,
    });
    expect(subpaths[1].closed).toBe(false);
  });

  it('expresses cubic control points relative to the current point', () => {
    const [subpath] = splitSubpaths([
      { c: 'M', x: 0, y: 0 },
      { c: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
    ]);
    expect(subpath.legs[0]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles a path that starts without an explicit move', () => {
    expect(splitSubpaths([{ c: 'L', x: 5, y: 5 }])).toHaveLength(1);
  });
});

describe('colour parsing', () => {
  it('reads the formats the scene actually emits', () => {
    expect(parseColor('#2A4BD8')).toEqual({ r: 42, g: 75, b: 216, a: 1 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('rgba(18, 22, 28, 0.62)')).toMatchObject({ r: 18, g: 22, b: 28 });
    expect(parseColor('rgba(18, 22, 28, 0.62)')?.a).toBeCloseTo(0.62, 6);
    expect(parseColor('transparent')?.a).toBe(0);
    expect(parseColor('nonsense')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });

  it('round-trips withAlpha through the parser', () => {
    const parsed = parseColor(withAlpha(palette.cobalt[500], 0.5));
    expect(parsed).toMatchObject({ r: 42, g: 75, b: 216 });
    expect(parsed?.a).toBeCloseTo(0.5, 6);
  });
});

describe('asset collection', () => {
  it('finds images in flow Markdown, Markdown elements and image elements', () => {
    const deck = deckOf(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: photo.png',
        '  - kind: markdown',
        '    x: 0',
        '    y: 0',
        '    markdown: "![in element](inner.svg)"',
        '-->',
        '',
        '![flow](diagram.png)',
      ].join('\n'),
    );
    expect(collectImageSources(deck).sort()).toEqual(['diagram.png', 'inner.svg', 'photo.png']);
  });
});

describe('slugify', () => {
  it('makes a safe file stem', () => {
    expect(slugify('Nozilla — Q3 Review!')).toBe('nozilla-q3-review');
    expect(slugify('   ')).toBe('deck');
  });
});
