import { describe, expect, it } from 'vitest';
import {
  escapeCommentTerminators,
  parseDeck,
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
