import { describe, expect, it } from 'vitest';
import {
  brand,
  canvas,
  color,
  elementTones,
  nozillaTheme,
  palette,
  registerTheme,
  setActiveTheme,
  typeScale,
} from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { segsBounds, type Seg } from '@/lib/geometry/path';
import { createElement } from '@/model/factory';
import type { Deck } from '@/model/types';
import { buildElementPrims, buildSlideScene, elementPaint, withAlpha } from './scene';
import { primsToSvgMarkup, sceneToSvg, scenesToContactSheet, escapeXml } from './svg';
import { inlineImageHrefs } from './images';
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
    expect(scene.prims[0]).toMatchObject({
      t: 'rect',
      x: 0,
      y: 0,
      w: canvas.width,
      h: canvas.height,
    });
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
    expect(svg.indexOf('FRONT')).toBeGreaterThan(0);
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
    expect(primsToSvgMarkup(hidden.prims)).not.toContain('LATER');
    expect(primsToSvgMarkup(shown.prims)).toContain('LATER');
  });

  it('adds the footer and slide number, and respects `bare`', () => {
    const deck = deckOf('---\nfooter: Internal\n---\n\n# S');
    const withChrome = buildSlideScene(deck.slides[0], deck, { slideNumber: 2, totalSlides: 7 });
    const markup = primsToSvgMarkup(withChrome.prims);
    expect(markup).toContain('INTERNAL');
    expect(markup).toContain('2 / 7');

    deck.slides[0].meta.bare = true;
    expect(primsToSvgMarkup(buildSlideScene(deck.slides[0], deck).prims)).not.toContain('INTERNAL');
  });

  it('setzt die Wortmarke klein unten rechts in die Fußzeile', () => {
    // Die Signatur der Folie. Geprüft werden die Primitive und nicht das
    // Markup: der Pfad wird vor der Ausgabe in Folien-Koordinaten gerechnet,
    // die Zeichenkette aus dem Erscheinungsbild steht dort also nie wörtlich.
    const deck = deckOf('---\nfooter: Internal\n---\n\n# S');
    const chrome = buildSlideScene(deck.slides[0], deck, { slideNumber: 1, totalSlides: 3 }).prims;
    const marke = chrome.filter((prim) => prim.t === 'path');

    // Buchstaben und Akzent.
    expect(marke).toHaveLength(2);

    const kasten = segsBounds(marke.flatMap((prim) => (prim as { segs: Seg[] }).segs));
    // Ganz rechts am Satzspiegel. Auf zwei Pixel genau, nicht auf null: die
    // viewBox einer Marke darf ein Haar Luft um die Zeichnung tragen, und die
    // Kante der Buchstaben liegt dann knapp innerhalb.
    expect(kasten.x + kasten.w).toBeGreaterThan(canvas.width - canvas.margin.right - 2);
    expect(kasten.x + kasten.w).toBeLessThanOrEqual(canvas.width - canvas.margin.right);
    // … und ganz klein: eine Signatur, keine zweite Überschrift.
    expect(kasten.h).toBeLessThan(typeScale.body.size);

    // `bare` blendet auch sie aus — eine Folie ohne Fußzeile hat keine.
    deck.slides[0].meta.bare = true;
    expect(buildSlideScene(deck.slides[0], deck).prims.filter((p) => p.t === 'path')).toHaveLength(
      0,
    );
  });

  it('rückt die Foliennummer vor die Wortmarke', () => {
    // Sonst lägen sie übereinander. Die Marke gehört an die Ecke, die Nummer
    // ist eine Hilfe für den Vortrag.
    const deck = deckOf('# S');
    const chrome = buildSlideScene(deck.slides[0], deck, { slideNumber: 1, totalSlides: 3 }).prims;
    const nummer = chrome.find((prim) => prim.t === 'text');
    const marke = segsBounds(
      chrome.filter((p) => p.t === 'path').flatMap((p) => (p as { segs: Seg[] }).segs),
    );
    expect(nummer).toBeDefined();
    const rechts =
      (nummer as { x: number }).x + (nummer as { runs: { width: number }[] }).runs[0].width;
    expect(rechts).toBeLessThan(marke.x);
  });

  it('rotates geometry rather than leaving it axis-aligned', () => {
    const straight = buildElementPrims(createElement('shape', { x: 0, y: 0, rotation: 0 }));
    const turned = buildElementPrims(createElement('shape', { x: 0, y: 0, rotation: 30 }));
    expect(primsToSvgMarkup(straight)).not.toEqual(primsToSvgMarkup(turned));
  });

  it('zeichnet die Grün-Rampe eines Pixelbilds in drei Stufen', () => {
    const markup = primsToSvgMarkup(
      buildElementPrims(createElement('icon', { icon: 'core-pixel-coffee', tone: 'paper' })),
    );
    expect(markup).toContain(palette.signal);
    expect(markup).toContain(palette.signalSoft);
    expect(markup).toContain(palette.signalDeep);
  });

  it('lässt die Rampe mit dem Signal umschlagen, wenn sie sonst verschwände', () => {
    // Auf einer Signal-Kachel wird das Signal zur Tinte, damit das Zeichen
    // überhaupt sichtbar bleibt. Die Schattenstufen müssen mit umschlagen —
    // ein halb umgefärbtes Pixelbild wäre schlimmer als ein einfarbiges.
    // `fill: 'flat'` ist die Kachel; ein blankes Zeichen (`none`) steht direkt
    // auf der Folie und behält seine Rampe.
    const markup = primsToSvgMarkup(
      buildElementPrims(
        createElement('icon', { icon: 'core-pixel-coffee', tone: 'signal', fill: 'flat' }),
      ),
    );
    expect(markup).not.toContain(palette.signalSoft);
    expect(markup).not.toContain(palette.signalDeep);
  });
});

describe('elementPaint', () => {
  it('löst nur CI-Rollen auf, nie einen freien Farbwert', () => {
    const framed = elementPaint(createElement('card', { tone: 'paper', fill: 'framed' }));
    expect(framed.body.fill).toBe(elementTones.paper.surface);
    expect(framed.body.stroke).toBe(elementTones.paper.line);

    const signal = elementPaint(createElement('card', { tone: 'signal', fill: 'flat' }));
    expect(signal.body.fill).toBe(elementTones.signal.surface);
    expect(signal.body.stroke).toBeUndefined();

    const inverse = elementPaint(createElement('card', { tone: 'ink', fill: 'framed' }));
    expect(inverse.body.fill).toBe(elementTones.ink.surface);
    expect(inverse.text).toBe(elementTones.ink.text);

    const outline = elementPaint(createElement('shape', { fill: 'outline' }));
    expect(outline.body.fill).toBeUndefined();
    expect(outline.body.stroke).toBe(color.line);

    expect(elementPaint(createElement('text', { fill: 'none' })).body).toEqual({});
  });

  it('zeichnet nie einen weichen Schatten — der Versatz ist eine Fläche', () => {
    const prims = buildElementPrims(
      createElement('card', { x: 0, y: 0, shadow: 'md', fill: 'framed' }),
    );
    const markup = primsToSvgMarkup(prims);
    expect(markup).not.toContain('filter');
    expect(markup).not.toContain('blur');
    // Erst der Schatten, dann der Körper: zwei deckungsgleiche Pfade.
    expect((markup.match(/<path /g) ?? []).length).toBeGreaterThanOrEqual(2);
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

  it('lässt die Beschreibung weg, statt sie leer zu schreiben', () => {
    /*
       Beide Richtungen, und die zweite ist der Grund für die Prüfung: mit
       Produktnamen steht genau eine `<desc>` da, ohne gar keine. Vorher stand
       dort „Exported from " — eine leere Beschreibung behauptet, es gäbe eine,
       und ist damit schlechter als keine. Dasselbe Argument wie beim leeren
       `descr` eines Alternativtexts.
    */
    const scene = buildSlideScene(deck.slides[0], deck);
    expect(sceneToSvg(scene)).toContain(`<desc>Exported from ${brand.product}</desc>`);

    const vorher = brand.product;
    try {
      setActiveTheme('musterkunde');
      // Der Musterkunde hat einen Produktnamen; leer wird er hier von Hand.
      const ohne = { ...nozillaTheme, brand: { ...nozillaTheme.brand, product: '  ' } };
      registerTheme({ ...ohne, id: 'ohne-produkt', label: 'Ohne Produkt' });
      setActiveTheme('ohne-produkt');
      expect(sceneToSvg(buildSlideScene(deck.slides[0], deck))).not.toContain('<desc>');
    } finally {
      setActiveTheme('nozilla');
      expect(brand.product).toBe(vorher);
    }
  });

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
    // Badge-Text ist ein Mono-Label und wird deshalb in Versalien gesetzt.
    expect(svg).toContain('SHIP IT');
    expect(svg).toContain(`font-size="${typeScale.h1.size}"`);
    expect(svg).toContain(`font-weight="${typeScale.h1.weight}"`);
    // Colours come from the CI ramp, never from an ad-hoc literal.
    expect(svg).toContain(color.ink);
    const literals = svg.match(/#[0-9a-f]{3,6}\b/gi) ?? [];
    const allowed = new Set(Object.values(palette).map((value) => value.toLowerCase()));
    expect(literals.filter((value) => !allowed.has(value.toLowerCase()))).toEqual([]);
  });

  it('escapes markup in content', () => {
    expect(svg).toContain('Export &amp; &lt;Test&gt;');
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;',
    );
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
    expect(parseColor('#00FF9C')).toEqual({ r: 0, g: 255, b: 156, a: 1 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0.62)')).toMatchObject({ r: 0, g: 0, b: 0 });
    expect(parseColor('rgba(0, 0, 0, 0.62)')?.a).toBeCloseTo(0.62, 6);
    expect(parseColor('transparent')?.a).toBe(0);
    expect(parseColor('nonsense')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });

  it('round-trips withAlpha through the parser', () => {
    const parsed = parseColor(withAlpha(palette.signal, 0.5));
    expect(parsed).toMatchObject({ r: 0, g: 255, b: 156 });
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

  it('findet auch ein Bild in den Notizen — das Handout setzt sie', () => {
    /*
       `buildHandoutScene()` setzt die Notizen mit `typesetMarkdown()` und macht
       aus einem `![…](…)` ein Bild-Primitiv. Eingesammelt wurden sie nicht, und
       daran hingen drei stumme Folgen: der Setzer kannte die Maße nicht und
       blies ein 300 × 300-Bild auf 1104 × 621 auf, der PDF-Weg stieg ohne
       Eintrag aus, und gemeldet wurde es auch nicht.
    */
    const deck = deckOf(
      [
        '<!-- nzl',
        'notes: |',
        '  Zum Vortrag:',
        '',
        '  ![Diagramm](notiz.png)',
        '-->',
        '',
        '# T',
      ].join('\n'),
    );
    expect(deck.slides[0].meta.notes).toContain('notiz.png');
    expect(collectImageSources(deck)).toContain('notiz.png');
  });

  it('ersetzt einen Verweis auch dann, wenn ein Apostroph darin steht', () => {
    /*
       Zwei Maskierfunktionen für dieselbe Frage, uneinig über ein Zeichen:
       `escapeXml()` macht aus `'` ein `&apos;`, die zweite in `images.ts`
       nicht. Gesucht wurde damit eine Zeichenkette, die im Markup nicht steht
       — der Verweis blieb relativ stehen, und im PNG fehlte das Bild
       ersatzlos.
    */
    const svg = `<image href="${escapeXml("bilder/claude's-logo.png")}"/>`;
    const map = new Map([
      [
        "bilder/claude's-logo.png",
        {
          src: "bilder/claude's-logo.png",
          dataUrl: 'data:image/png;base64,AAA',
          format: 'png',
          width: 1,
          height: 1,
        },
      ],
    ]);
    const out = inlineImageHrefs(svg, map as never);
    expect(out).toContain('data:image/png;base64,AAA');
    expect(out).not.toContain('claude');
  });
});

describe('Steuerzeichen im Text', () => {
  it('macht die erzeugte Datei nicht ungültig', () => {
    /*
       Ein aus Word eingefügter Absatz trägt an jedem manuellen Zeilenumbruch
       U+000B, aus einem PDF kopierter Text U+000C. Beide überleben Öffnen und
       Sichern, auf der Fläche fällt nichts auf — der HTML-Parser ist
       nachsichtig —, und die exportierte `.svg` war kein wohlgeformtes XML
       mehr: sie öffnete in keinem Browser, und der PNG-Weg scheiterte mit
       „Das SVG ließ sich nicht als Bild laden", einem Satz, der auf die
       Ursache nicht zeigt.

       Geprüft wird deshalb mit einem **XML-Parser** an der fertigen Datei und
       nicht an der Zeichenkette: nur er sagt „disallowed character".
    */
    const deck = deckOf('# Titel\n\nHallo\u000bWelt und\u000cSeite');
    const svg = sceneToSvg(buildSlideScene(deck.slides[0], deck, {}));
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(svg).not.toContain('\u000b');

    // Die Gegenrichtung: der Text bleibt lesbar, nur das Steuerzeichen wird
    // zum Leerzeichen.
    expect(svg).toContain('Hallo');
    expect(svg).toContain('Welt');
  });
});

describe('slugify', () => {
  it('makes a safe file stem', () => {
    expect(slugify('nozilla — Q3 Review!')).toBe('nozilla-q3-review');
    expect(slugify(' ')).toBe('deck');
  });
});

describe('der Alternativtext eines Bildes', () => {
  /*
     Er stand im Inspektor und ging fast nirgendwohin: das SVG kannte ihn
     nicht, das PDF auch nicht, und in der PPTX landete er im `name` — dem
     Namen in der Auswahlliste, den keine Hilfstechnik vorliest. Ein Feld,
     dessen Inhalt verworfen wird, ist schlimmer als kein Feld: es sieht so
     aus, als hätte man etwas getan.
  */
  const mitBild = (alt: string) =>
    deckOf(
      [
        '<!-- nzl',
        'elements:',
        '  - id: bild-1',
        '    kind: image',
        '    x: 100',
        '    y: 100',
        '    w: 200',
        '    h: 120',
        '    src: bilder/team.png',
        `    alt: ${alt}`,
        '-->',
        '',
        '# Eins',
        '',
      ].join('\n'),
    );

  it('steht im SVG als Titel', () => {
    const deck = mitBild('Das Team vor der Werkstatt');
    const scene = buildSlideScene(deck.slides[0], deck);
    const markup = primsToSvgMarkup(scene.prims);
    expect(markup).toContain('<title>Das Team vor der Werkstatt</title>');
  });

  it('fehlt im SVG, wenn keiner da ist', () => {
    // Die Gegenrichtung: ein leerer `<title>` wäre schlechter als keiner —
    // eine Hilfstechnik läse dann „" statt das Bild zu überspringen.
    const deck = mitBild("''");
    const markup = primsToSvgMarkup(buildSlideScene(deck.slides[0], deck).prims);
    expect(markup).toContain('<image');
    expect(markup).not.toContain('<title>');
  });

  it('kommt auch aus einem Markdown-Bild mit', () => {
    // `![so hier](bild.png)` — der Text in den eckigen Klammern. Er kam bis
    // in die Szene und fiel dort heraus.
    const deck = deckOf('# Eins\n\n![Ein Diagramm der Laufzeiten](bilder/kurve.png)\n');
    const scene = buildSlideScene(deck.slides[0], deck);
    const bild = scene.prims.find((prim) => prim.t === 'image');
    expect(bild).toMatchObject({ alt: 'Ein Diagramm der Laufzeiten' });
  });

  it('wird im SVG wie jeder andere Text entschärft', () => {
    const deck = mitBild('"Ein <Bild> & ein Text"');
    const markup = primsToSvgMarkup(buildSlideScene(deck.slides[0], deck).prims);
    expect(markup).toContain('&lt;Bild&gt; &amp; ein Text');
  });
});
