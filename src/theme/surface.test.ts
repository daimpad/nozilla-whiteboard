import { afterEach, describe, expect, it } from 'vitest';
import { ui, uiDark, uiShadow, uiShadowDark, palette, color, elementTones } from '@theme';
import { activeUi, activeUiShadow, setSurfaceMode, surfaceMode } from './surface';
import { cssVariables } from './index';
import { buildSlideScene } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { parseDeck } from '@/lib/markdown/deck';
import welcome from '@/decks/welcome.md?raw';

/**
 * Die Erscheinung des Werkzeugs ist eine Einstellung des Arbeitsplatzes, das
 * Erscheinungsbild eine Eigenschaft des Decks. Was hier geprüft wird, ist
 * genau die Trennlinie zwischen den beiden — und dass sie in beide Richtungen
 * hält.
 */
const deck = parseDeck(welcome);

afterEach(() => {
  setSurfaceMode('system');
});

describe('die Erscheinung des Werkzeugs', () => {
  it('steht ohne Einstellung auf System', () => {
    expect(surfaceMode()).toBe('system');
  });

  it('tauscht die Belegung der Leisten', () => {
    setSurfaceMode('light');
    expect(activeUi().surface).toBe(ui.surface);
    expect(activeUiShadow().md).toBe(uiShadow.md);

    setSurfaceMode('dark');
    expect(activeUi().surface).toBe(uiDark.surface);
    expect(activeUi().surface).not.toBe(ui.surface);
    expect(activeUiShadow().md).toBe(uiShadowDark.md);
  });

  it('lässt die Folie in Ruhe — der Export sieht immer gleich aus', () => {
    // Die eine Garantie, an der alles hängt: eine Einstellung des Werkzeugs
    // darf niemals in einer Datei landen. Käme dieselbe Folie je nach
    // Helligkeit der Leiste anders heraus, wäre der Export wertlos.
    const markup = () => primsToSvgMarkup(buildSlideScene(deck.slides[2], deck).prims);

    setSurfaceMode('light');
    const hell = markup();
    setSurfaceMode('dark');
    expect(markup()).toEqual(hell);
  });

  it('lässt Auswahl, Aufziehrechteck und Raster stehen', () => {
    // Die drei werden *auf* der Folie gezeichnet. Ein weißer Auswahlrahmen auf
    // cremefarbenem Papier wäre unsichtbar, und die Folie weiß nichts davon,
    // wie jemand sein Werkzeug eingestellt hat.
    setSurfaceMode('dark');
    expect(activeUi().select).toBe(ui.select);
    expect(activeUi().selectWash).toBe(ui.selectWash);
    expect(activeUi().grid).toBe(ui.grid);
  });

  it('belegt jede Rolle der hellen Fassung', () => {
    // `uiDark` entsteht aus `{ ...ui }`. Fehlte eine Rolle, fiele sie still
    // auf den hellen Wert zurück — und genau eine helle Fläche im dunklen
    // Werkzeug fällt erst auf, wenn man sie trifft.
    expect(Object.keys(uiDark).sort()).toEqual(Object.keys(ui).sort());
    expect(Object.keys(uiShadowDark).sort()).toEqual(Object.keys(uiShadow).sort());
  });

  it('leiht sich auch bei Nacht nichts von der Marke', () => {
    // Weiß, sechs Graustufen, Schwarz — sonst nichts. Der Akzent kippt mit
    // (hell statt dunkel), bunt wird er nicht.
    const brand = new Set<string>([
      ...Object.values(palette),
      ...Object.values(color),
      ...Object.values(elementTones).flatMap((tone) => Object.values(tone)),
    ]);
    // Die drei Folien-Werte sind ausgenommen: sie *sollen* auf der Folie
    // funktionieren, und `#FFFFFF` steht zufällig in beiden Sätzen.
    const chrome = Object.entries(uiDark).filter(
      ([key]) => !['select', 'selectWash', 'grid'].includes(key),
    );
    for (const [key, value] of chrome) {
      if (value === '#FFFFFF') continue;
      expect(brand.has(value), `${key} = ${value}`).toBe(false);
    }
  });

  it('schreibt die Kanal-Tripel, an denen die Deckkraft hängt', () => {
    // `bg-ui-surface/85` rechnet Tailwind aus `rgb(var(--…-rgb) / 0.85)`.
    // Fehlte das Tripel, verpuffte der Zusatz still und die Leisten über der
    // Folie verlören ihre Durchsicht.
    setSurfaceMode('dark');
    const vars = cssVariables();
    expect(vars['--nz-ui-surface']).toBe(uiDark.surface);
    expect(vars['--nz-ui-surface-rgb']).toMatch(/^\d+ \d+ \d+$/);
    // Farben mit eigener Deckkraft bekommen keins — ein zweites Alpha darüber
    // wäre keine sinnvolle Angabe.
    expect(vars['--nz-ui-overlay-rgb']).toBeUndefined();
  });
});
