import { describe, expect, it } from 'vitest';
import {
  escapeCommentTerminators,
  parseDeck,
  parseSlide,
  serializeDeck,
  splitFrontmatter,
  splitSlides,
  unescapeCommentTerminators,
} from './deck';
import type { Deck } from '@/model/types';

/** Slide ids are runtime-only; ignore them when comparing round trips. */
function stable(deck: Deck) {
  return {
    meta: deck.meta,
    slides: deck.slides.map(({ meta, markdown, elements }) => ({ meta, markdown, elements })),
  };
}

describe('splitSlides', () => {
  it('splits on a `---` line preceded by a blank line', () => {
    expect(splitSlides('# One\n\n---\n\n# Two')).toEqual(['# One\n', '\n# Two']);
  });

  it('does not split a Setext heading underline', () => {
    const source = 'Heading\n---\n\nBody';
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('ignores delimiters inside fenced code blocks', () => {
    const source = ['# One', '', '```', '', '---', '', '```', '', 'still slide one'].join('\n');
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('ignores delimiters inside HTML comments', () => {
    const source = ['<!-- nzl', 'notes: |', '  a', '', '---', '', '  b', '-->', '', '# One'].join(
      '\n',
    );
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('drops empty chunks but always yields at least one', () => {
    expect(splitSlides('')).toEqual(['']);
    expect(splitSlides('\n---\n\n# Only')).toEqual(['\n# Only']);
  });
});

describe('splitFrontmatter', () => {
  it('extracts a leading YAML block', () => {
    const { frontmatter, body } = splitFrontmatter('---\ntitle: Hi\n---\n\n# Slide');
    expect(frontmatter).toBe('title: Hi');
    expect(body.trim()).toBe('# Slide');
  });

  it('leaves a document without frontmatter alone', () => {
    const { frontmatter, body } = splitFrontmatter('# Slide');
    expect(frontmatter).toBeNull();
    expect(body).toBe('# Slide');
  });
});

describe('comment terminator escaping', () => {
  const cases = ['-->', '--&gt;', '--&&gt;', 'a --> b --> c', 'no terminators here'];

  it.each(cases)('round-trips %j', (input) => {
    expect(unescapeCommentTerminators(escapeCommentTerminators(input))).toBe(input);
  });

  it('removes every raw terminator from the escaped form', () => {
    expect(escapeCommentTerminators('x --> y')).not.toContain('-->');
  });
});

describe('parseDeck', () => {
  it('reads deck metadata and slide metadata', () => {
    const deck = parseDeck(
      [
        '---',
        'title: Quarterly',
        'author: Nozilla',
        'footer: Internal',
        '---',
        '',
        '<!-- nzl',
        'layout: title',
        'transition: cut',
        'background: ink',
        '-->',
        '',
        '# Hello',
      ].join('\n'),
    );

    expect(deck.meta).toMatchObject({
      title: 'Quarterly',
      author: 'Nozilla',
      footer: 'Internal',
    });
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0].meta).toEqual({
      layout: 'title',
      transition: 'cut',
      background: 'ink',
    });
    expect(deck.slides[0].markdown).toBe('# Hello');
  });

  it('restores element positions and applies CI defaults to omitted properties', () => {
    const deck = parseDeck(
      [
        '<!-- nzl',
        'elements:',
        '  - id: b1',
        '    kind: badge',
        '    x: 88',
        '    y: 96',
        '    w: 160',
        '    h: 40',
        '    text: New',
        '-->',
        '',
        '# Slide',
      ].join('\n'),
    );

    const [element] = deck.slides[0].elements;
    expect(element).toMatchObject({ id: 'b1', kind: 'badge', x: 88, y: 96, w: 160, h: 40 });
    // Untouched properties come from the CI defaults, not from the file.
    expect(element).toMatchObject({ tone: 'signal', fill: 'framed', opacity: 1, rotation: 0 });
  });

  it('survives a broken element instead of failing the file', () => {
    const deck = parseDeck(
      ['<!-- nzl', 'elements:', '  - kind: not-a-kind', '    x: nope', '-->', '', '# Slide'].join(
        '\n',
      ),
    );
    expect(deck.slides[0].elements).toHaveLength(1);
    expect(deck.slides[0].elements[0].kind).toBe('shape');
  });

  it('preserves unknown frontmatter keys', () => {
    const deck = parseDeck('---\ntitle: T\ncustom: 42\n---\n\n# S');
    expect(deck.meta.extra).toEqual({ custom: 42 });
    expect(serializeDeck(deck)).toContain('custom: 42');
  });

  it('always produces at least one slide', () => {
    expect(parseDeck('').slides).toHaveLength(1);
  });
});

describe('serializeDeck', () => {
  it('round-trips a deck losslessly', () => {
    const source = [
      '---',
      'title: Round Trip',
      'author: Nozilla',
      '---',
      '',
      '<!-- nzl',
      'layout: title',
      'background: ink',
      'notes: Say something memorable.',
      'elements:',
      '  - id: badge-1',
      '    kind: badge',
      '    x: 88',
      '    y: 96',
      '    w: 210',
      '    h: 40',
      '    tone: ink',
      '    text: Markdown + Canvas',
      '    icon: sparkle',
      '  - id: card-1',
      '    kind: card',
      '    x: 664',
      '    y: 168',
      '    w: 300',
      '    h: 190',
      '    rotation: 12',
      '    opacity: 0.8',
      '    title: A card',
      '    body: With a body.',
      '    reveal:',
      '      step: 2',
      '      animation: zoom',
      '-->',
      '',
      '# Hello',
      '',
      'Some **content**.',
      '',
      '---',
      '',
      '## Second slide',
    ].join('\n');

    const first = parseDeck(source);
    const second = parseDeck(serializeDeck(first));
    expect(stable(second)).toEqual(stable(first));
  });

  it('keeps an icon name that the active icon set does not know', () => {
    // Ein Deck darf ein Zeichen aus dem Set einer anderen Marke nennen.
    // Würde es beim Einlesen verworfen, verlöre eine Sitzung ohne dieses Set
    // beim ersten Speichern jedes Icon — genau wie bei einem unbekannten
    // Erscheinungsbild bleibt der Wert stehen.
    const source = [
      '<!-- nzl',
      'elements:',
      '  - kind: icon',
      '    x: 10',
      '    y: 10',
      '    icon: musterkunde-siegel',
      '-->',
    ].join('\n');

    const deck = parseDeck(source);
    expect(serializeDeck(deck)).toContain('icon: musterkunde-siegel');
  });

  it('keeps a slide that has neither content nor metadata', () => {
    const deck = parseDeck('# One\n\n---\n\n# Two');
    deck.slides[1].markdown = '';
    const reloaded = parseDeck(serializeDeck(deck));
    expect(reloaded.slides).toHaveLength(2);
  });

  it('omits properties that still equal the CI default', () => {
    const deck = parseDeck(
      ['<!-- nzl', 'elements:', '  - kind: shape', '    x: 10', '    y: 10', '-->'].join('\n'),
    );
    const output = serializeDeck(deck);
    expect(output).toContain('kind: shape');
    expect(output).not.toContain('opacity:');
    expect(output).not.toContain('rotation:');
    expect(output).not.toContain('locked:');
  });

  it('emits no metadata block for a plain Markdown slide', () => {
    const deck = parseDeck('# Just prose\n\nNothing placed here.');
    expect(serializeDeck(deck)).not.toContain('<!-- nzl');
  });

  it('escapes content that would close the metadata comment', () => {
    const deck = parseDeck('# S');
    deck.slides[0].meta.notes = 'watch out for --> this';
    const output = serializeDeck(deck);
    // Exactly one comment terminator: the real one.
    expect(output.match(/-->/g)).toHaveLength(1);
    expect(parseDeck(output).slides[0].meta.notes).toBe('watch out for --> this');
  });
});

describe('das Erscheinungsbild im Frontmatter', () => {
  it('überlebt einen Lade- und Speicherzyklus', () => {
    const source = ['---', 'title: Kundendeck', 'theme: musterkunde', '---', '', '# Eins', ''].join(
      '\n',
    );
    const deck = parseDeck(source);
    expect(deck.meta.theme).toBe('musterkunde');
    expect(serializeDeck(deck)).toContain('theme: musterkunde');
  });

  it('bleibt leer, wenn keins genannt ist', () => {
    const deck = parseDeck('# Ohne Frontmatter\n');
    expect(deck.meta.theme).toBeUndefined();
    // Ein Deck ohne Zugehörigkeit soll auch keine vortäuschen.
    expect(serializeDeck(deck)).not.toContain('theme:');
  });

  it('nimmt einen unbekannten Namen mit, statt ihn zu verwerfen', () => {
    // Ein Deck kann aus einer Installation kommen, die dieses Erscheinungsbild
    // kennt. Es beim ersten Speichern zu löschen wäre Datenverlust.
    const deck = parseDeck(
      ['---', 'theme: gibt-es-hier-nicht', '---', '', '# Eins', ''].join('\n'),
    );
    expect(deck.meta.theme).toBe('gibt-es-hier-nicht');
    expect(serializeDeck(deck)).toContain('theme: gibt-es-hier-nicht');
  });
});

describe('ein `nzl`-Block, der sich nicht lesen lässt', () => {
  /*
     Ein Doppelpunkt zu viel — hier im Text einer Karte, und das ist die
     wahrscheinlichste Stelle, weil dort deutsche Sätze stehen. YAML liest
     `text: Achtung: hier` als Zuordnung in einer Zuordnung und bricht ab.
  */
  const KAPUTT = [
    '<!-- nzl',
    'layout: canvas',
    'elements:',
    '  - id: card-1',
    '    kind: card',
    '    x: 80',
    '    y: 80',
    '    w: 400',
    '    h: 200',
    '    text: Achtung: hier steht ein Doppelpunkt zu viel',
    '-->',
    '',
    '# Eine Folie',
    '',
  ].join('\n');

  it('nimmt den Rohtext mit, statt ihn zu verwerfen', () => {
    const deck = parseDeck(KAPUTT);
    expect(deck.slides[0].meta.unreadable).toContain('text: Achtung: hier steht');
  });

  it('schreibt ihn beim Sichern wortgleich zurück', () => {
    /*
       Das ist die Prüfung, um die es geht. Vorher fiel der Block beim Parsen
       durch — Layout auf Vorgabe, keine Elemente — und wurde beim Sichern
       nicht wieder gebaut. Wer eine solche Datei öffnete und speicherte,
       verlor seine Folie, ohne dass irgendwo etwas rot geworden wäre.
    */
    const gesichert = serializeDeck(parseDeck(KAPUTT));
    expect(gesichert).toContain('text: Achtung: hier steht ein Doppelpunkt zu viel');
    expect(gesichert).toContain('- id: card-1');
  });

  it('bleibt über beliebig viele Runden derselbe Text', () => {
    // Ein Deck, das bei jedem Sichern anders aussieht, macht jede Versionierung
    // unbrauchbar — und dieser Weg baut den Block nicht, er reicht ihn durch.
    const einmal = serializeDeck(parseDeck(KAPUTT));
    const zweimal = serializeDeck(parseDeck(einmal));
    expect(zweimal).toBe(einmal);
  });

  it('lässt einen lesbaren Block unberührt', () => {
    // Das Gegenstück: der Vermerk darf nicht an jeder Folie kleben, sonst
    // würde nie wieder ein Block aus dem Modell gebaut.
    const deck = parseDeck(['<!-- nzl', 'layout: canvas', '-->', '', '# Eins', ''].join('\n'));
    expect(deck.slides[0].meta.unreadable).toBeUndefined();
    expect(deck.slides[0].meta.layout).toBe('canvas');
  });

  it('hält einen leeren Block nicht für kaputt', () => {
    // `<!-- nzl -->` sagt dasselbe wie gar kein Block. Eine Warnung dafür wäre
    // ein Fehlalarm, und Fehlalarme bringen echte Warnungen um ihre Wirkung.
    const deck = parseDeck(['<!-- nzl', '-->', '', '# Eins', ''].join('\n'));
    expect(deck.slides[0].meta.unreadable).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('was eine Datei mitbringen kann', () => {
  it('macht doppelte Kennungen eindeutig', () => {
    /*
       Einen Element-Block im `nzl`-Abschnitt kopieren ist der naheliegendste
       Weg, eine zweite Karte anzulegen — und danach stand dieselbe `id`
       zweimal. `updateElements()` filtert über ein `Set` der Kennungen: ein
       Ziehen der linken Karte bewegte auch die rechte, bei einer Auswahl, die
       nur einen Eintrag zeigte.
    */
    const slide = parseSlide(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: card',
        '    id: doppelt',
        '  - kind: card',
        '    id: doppelt',
        '-->',
        '',
        '# Probe',
      ].join('\n'),
    );
    expect(slide.elements).toHaveLength(2);
    expect(new Set(slide.elements.map((element) => element.id)).size).toBe(2);
    // Und die erste behält ihre — nur die Wiederholung bekommt eine neue.
    expect(slide.elements[0].id).toBe('doppelt');
  });

  it('behält den Block einer Elementart, die es hier nicht gibt', () => {
    /*
       Der teuerste Fehler dieser Datei, in klein: `oneOf(raw.kind, …, 'shape')`
       machte aus `kind: heading` ein Rechteck, der `switch` ließ alles Übrige
       fallen, und **Öffnen und Sichern genügte**, um den Inhalt endgültig zu
       verlieren. Dieselbe Linie wie beim unlesbaren `nzl`-Block und beim
       unbekannten `theme:`: den Wert behalten, die Lücke zeigen.

       Geprüft wird an der **gesicherten Datei** und nicht am Modell — das
       Modell weiß von dem Block ohnehin nichts, und trotzdem wäre nichts
       verloren, wenn er beim Schreiben wieder dastünde.
    */
    const quelle = [
      '<!-- nzl',
      'elements:',
      '  - kind: heading',
      '    text: Ein Satz, den diese Fassung nicht kennt',
      '    x: 40',
      '    y: 40',
      '-->',
      '',
      '# Probe',
    ].join('\n');

    const deck = parseDeck(quelle);
    const zurueck = serializeDeck(deck);
    expect(zurueck).toContain('kind: heading');
    expect(zurueck).toContain('Ein Satz, den diese Fassung nicht kennt');

    // Und er verfällt, sobald jemand das Element ändert — sonst stünde beim
    // nächsten Öffnen der alte Block da und die Änderung nirgends.
    const geaendert = {
      ...deck,
      slides: deck.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((element) => {
          const { unknownRaw: _weg, ...rest } = element;
          return { ...rest, x: 99 } as typeof element;
        }),
      })),
    };
    expect(serializeDeck(geaendert)).not.toContain('kind: heading');
  });
});
