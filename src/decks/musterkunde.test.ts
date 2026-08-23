import { afterEach, describe, expect, it } from 'vitest';
import musterkundeDeck from './musterkunde.md?raw';
import { bundledDecks } from './index';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { buildSlideScene } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { palette, setActiveTheme } from '@/theme';
import { iconDef, missingIcon } from '@/assets/icons';
import { registerThemes } from '@/themes';
import { musterkunde } from '@/themes/musterkunde';

/**
 * Das Deck des Musterkunden ist kein Schaustück, sondern eine Prüfung, die man
 * ansehen kann.
 *
 * Ein Werkzeug, das mehrere Erscheinungsbilder beherrscht, aber nur ein Deck
 * der eigenen Marke zeigt, belegt seine Behauptung nicht. Die Willkommensmappe
 * gehört nozilla — jeder von Hand gelegte Titel darin ist für *diese* Schrift
 * ausgemessen und passt unter fremder Marke nur zufällig.
 *
 * Geprüft wird deshalb genau das, was bei einem echten Kundendeck schiefgehen
 * kann: ein Zeichen, das im Set fehlt, eine Farbe, die von woanders kommt, ein
 * Erscheinungsbild, das die Datei zwar nennt, aber niemand anmeldet.
 */
registerThemes();

const deck = parseDeck(musterkundeDeck);

afterEach(() => {
  setActiveTheme('nozilla');
});

describe('das Deck des Musterkunden', () => {
  it('nennt sein Erscheinungsbild in der Datei', () => {
    // Ohne den Eintrag wäre es ein nozilla-Deck mit fremden Icon-Namen.
    expect(deck.meta.theme).toBe('musterkunde');
    expect(deck.meta.footer).toContain('muster');
  });

  it('wird mitgeliefert und ist zu öffnen', () => {
    const eintrag = bundledDecks.find((d) => d.file === 'musterkunde.md');
    expect(eintrag).toBeDefined();
    expect(eintrag?.source).toBe(musterkundeDeck);
  });

  it('nennt nur Zeichen, die dieses Erscheinungsbild führt', () => {
    // Die Probe aufs Exempel: fehlte eines, zeichnete die Folie ein
    // durchgestrichenes Quadrat — sichtbar, aber peinlich.
    setActiveTheme('musterkunde');
    const genannt = deck.slides
      .flatMap((slide) => slide.elements)
      .map((element) => (element as { icon?: string }).icon)
      .filter((name): name is string => Boolean(name));

    expect(genannt.length).toBeGreaterThan(8);
    for (const name of genannt) {
      expect(iconDef(name), name).not.toBe(missingIcon);
    }
  });

  it('greift die eigenen Zeichen und nicht den geliehenen Katalog', () => {
    // Ein Kundendeck, das nur Font-Awesome-Nachbauten benutzt, hätte das
    // eigene Set nicht nötig — dann wäre es kein Beleg.
    // Die eigenen Zeichen sind die in den eigenen Rubriken — das Set enthält
    // daneben den geliehenen Katalog, und dessen Reihenfolge sagt nichts.
    const eigeneRubriken = new Set(['muster', 'werkstatt', 'prüfung']);
    const eigene = new Set(
      Object.entries(musterkunde.icons?.icons ?? {})
        .filter(([, icon]) => eigeneRubriken.has(icon.category))
        .map(([name]) => name),
    );
    expect(eigene.size).toBe(12);
    const genannt = new Set(
      deck.slides
        .flatMap((slide) => slide.elements)
        .map((element) => (element as { icon?: string }).icon)
        .filter(Boolean),
    );
    const treffer = [...genannt].filter((name) => eigene.has(name as string));
    expect(treffer.length).toBeGreaterThanOrEqual(8);
  });

  it('zeichnet in der Palette des Kunden, nicht in der von nozilla', () => {
    setActiveTheme('musterkunde');
    const markup = deck.slides
      .map((slide) => primsToSvgMarkup(buildSlideScene(slide, deck).prims))
      .join('');

    expect(markup).toContain(musterkunde.palette.signal);
    expect(markup).not.toContain('#00FF9C');
    expect(markup).not.toContain('#FFFEE5');
    // Und die Grundfarben stammen wirklich aus der aktiven Belegung.
    expect(palette.ink).toBe(musterkunde.palette.ink);
  });

  it('nutzt mehr als ein Layout, mehr als einen Untergrund, mehr als eine Art', () => {
    expect(new Set(deck.slides.map((s) => s.meta.layout)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(deck.slides.map((s) => s.meta.background)).size).toBeGreaterThanOrEqual(3);
    const arten = new Set(deck.slides.flatMap((s) => s.elements.map((e) => e.kind)));
    expect(arten.size).toBeGreaterThanOrEqual(4);
  });

  it('übersteht einen Lade- und Speicherzyklus unverändert', () => {
    const wieder = parseDeck(serializeDeck(deck));
    expect(wieder.meta).toEqual(deck.meta);
    expect(wieder.slides).toHaveLength(deck.slides.length);
    deck.slides.forEach((slide, index) => {
      expect(wieder.slides[index].elements).toEqual(slide.elements);
      expect(wieder.slides[index].meta).toEqual(slide.meta);
    });
  });
});
