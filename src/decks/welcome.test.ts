import { describe, expect, it } from 'vitest';
import welcome from './welcome.md?raw';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { buildSlideScene } from '@/lib/export/scene';
import { sceneToSvg } from '@/lib/export/svg';
import { maxRevealStep } from '@/model/types';
import { toneNames } from '@/theme';

/**
 * Das mitgelieferte Deck ist zugleich der breiteste Prüfstein, den es hier
 * gibt: es geht jedes Layout durch, jeden Untergrund, jede Elementart und
 * jeden Einblendschritt.
 */
describe('the bundled welcome deck', () => {
  const deck = parseDeck(welcome);

  it('parses into the expected shape', () => {
    expect(deck.meta.title).toBe('nozilla Whiteboard');
    expect(deck.meta.footer).toBe('nozilla · Gute digitale Dienste.');
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

  it('setzt den grünen Marker als Marker, nicht als Sternchen', () => {
    const withMarker = deck.slides.filter((slide) => slide.markdown.includes('=='));
    expect(withMarker.length).toBeGreaterThan(0);

    for (const slide of withMarker) {
      // Regel 5 der CI: höchstens drei Marker pro Absatz.
      for (const paragraph of slide.markdown.split(/\n{2,}/)) {
        const markers = paragraph.match(/==[^=]+==/g) ?? [];
        expect(markers.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('hält sich an die Farbrollen der CI', () => {
    const tones = new Set(deck.slides.flatMap((slide) => slide.elements.map((el) => el.tone)));
    for (const tone of tones) {
      // Gegen `toneNames` statt gegen eine abgeschriebene Liste: fällt eine
      // Rolle weg, soll dieser Test es merken und nicht stillhalten.
      expect(toneNames).toContain(tone);
    }
  });
});
