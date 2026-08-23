import { describe, expect, it } from 'vitest';
import { elementTones, palette, inkAlpha, paperAlpha } from '@theme';
import { nozillaTheme, tonesFromPalette, tonesOutsidePalette } from './brandTheme';

describe('der Vertrag eines Erscheinungsbilds', () => {
  it('mischt aus der nozilla-Palette genau deren Töne', () => {
    // Der Riegel gegen zwei Wahrheiten: `tonesFromPalette` beschreibt dasselbe
    // Muster wie `theme.config.ts`. Ändert jemand dort eine Rolle und hier
    // nicht, legt jeder neue Kunde ein Erscheinungsbild an, das anders gebaut
    // ist als das, an dem es sich orientiert.
    expect(tonesFromPalette(palette, inkAlpha, paperAlpha)).toEqual(elementTones);
  });

  it('lässt die nozilla-CI ihre eigene Prüfung bestehen', () => {
    expect(tonesOutsidePalette(nozillaTheme)).toEqual([]);
  });

  it('findet eine Farbrolle, die aus einer fremden Palette stammt', () => {
    const fremd = {
      ...nozillaTheme,
      elementTones: {
        ...nozillaTheme.elementTones,
        signal: { ...nozillaTheme.elementTones.signal, surface: '#123456' },
      },
    };
    expect(tonesOutsidePalette(fremd)).toEqual(['signal.surface = #123456']);
  });
});
