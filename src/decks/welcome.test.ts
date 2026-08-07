import { describe, expect, it } from 'vitest';
import welcome from './welcome.md?raw';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { buildSlideScene } from '@/lib/export/scene';
import { sceneToSvg } from '@/lib/export/svg';
import { maxRevealStep } from '@/model/types';

/**
 * The deck that ships with the app is also the widest end-to-end fixture we
 * have: it exercises every layout, background, element kind and reveal.
 */
describe('the bundled welcome deck', () => {
  const deck = parseDeck(welcome);

  it('parses into the expected shape', () => {
    expect(deck.meta.title).toBe('Nozilla Whiteboard');
    expect(deck.meta.footer).toBe('Nozilla — Internal');
    expect(deck.slides.length).toBeGreaterThanOrEqual(6);
  });

  it('places canvas elements on most slides', () => {
    const withElements = deck.slides.filter((slide) => slide.elements.length > 0);
    expect(withElements.length).toBeGreaterThanOrEqual(5);
  });

  it('uses more than one layout, background and element kind', () => {
    expect(new Set(deck.slides.map((s) => s.meta.layout)).size).toBeGreaterThan(2);
    expect(new Set(deck.slides.map((s) => s.meta.background)).size).toBeGreaterThan(2);
    const kinds = new Set(deck.slides.flatMap((s) => s.elements.map((e) => e.kind)));
    expect(kinds.size).toBeGreaterThanOrEqual(5);
  });

  it('round-trips through the Markdown writer without losing anything', () => {
    const reloaded = parseDeck(serializeDeck(deck));

    expect(reloaded.meta).toEqual(deck.meta);
    expect(reloaded.slides).toHaveLength(deck.slides.length);

    deck.slides.forEach((slide, index) => {
      const other = reloaded.slides[index];
      expect(other.markdown).toBe(slide.markdown);
      expect(other.meta).toEqual(slide.meta);
      expect(other.elements).toEqual(slide.elements);
    });
  });

  it('is stable under a second round trip', () => {
    const once = serializeDeck(deck);
    const twice = serializeDeck(parseDeck(once));
    expect(twice).toBe(once);
  });

  it('renders every slide to a non-trivial vector scene', () => {
    deck.slides.forEach((slide, index) => {
      const scene = buildSlideScene(slide, deck, {
        slideNumber: index + 1,
        totalSlides: deck.slides.length,
        revealStep: maxRevealStep(slide),
      });
      expect(scene.prims.length).toBeGreaterThan(1);

      const svg = sceneToSvg(scene);
      expect(svg).toContain('</svg>');
      expect(svg).not.toContain('undefined');
      expect(svg).not.toContain('NaN');
    });
  });

  it('is not derailed by a code sample that itself contains deck syntax', () => {
    // Slide two documents the metadata format inside a fenced block: it holds a
    // literal `<!-- nzl`, a literal `-->` and a literal `---`.
    const withCode = deck.slides.find((slide) => slide.markdown.includes('```md'));
    expect(withCode).toBeDefined();
    expect(withCode!.markdown).toContain('<!-- nzl');
    expect(withCode!.markdown).toContain('-->');

    // The splitter must still see the same slides, and the sample must survive.
    const reloaded = parseDeck(serializeDeck(deck));
    expect(reloaded.slides).toHaveLength(deck.slides.length);
    expect(reloaded.slides[1].markdown).toBe(withCode!.markdown);
    expect(reloaded.slides[1].elements).toHaveLength(withCode!.elements.length);
  });
});
