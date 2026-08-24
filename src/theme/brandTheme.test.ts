import { describe, expect, it } from 'vitest';
import { color, elementTones, palette, inkAlpha, paperAlpha } from '@theme';
import {
  colorsFromPalette,
  nozillaTheme,
  tonesFromPalette,
  tonesOutsidePalette,
} from './brandTheme';
import { musterkunde } from '@/themes/musterkunde';

describe('der Vertrag eines Erscheinungsbilds', () => {
  it('mischt aus der nozilla-Palette genau deren Töne', () => {
    // Der Riegel gegen zwei Wahrheiten: `tonesFromPalette` beschreibt dasselbe
    // Muster wie `theme.config.ts`. Ändert jemand dort eine Rolle und hier
    // nicht, legt jeder neue Kunde ein Erscheinungsbild an, das anders gebaut
    // ist als das, an dem es sich orientiert.
    expect(tonesFromPalette(palette, inkAlpha, paperAlpha)).toEqual(elementTones);
  });

  it('mischt aus der nozilla-Palette genau deren semantische Tokens', () => {
    // Derselbe Riegel für die fünfundzwanzig `color`-Schlüssel. Er greift auch
    // dort, wo ein Wert gerechnet und nicht nachgeschlagen wird: der Schleier
    // über einem Dialog und die Auswahl-Wäsche sind Tinte und Signal mit
    // Deckkraft, und das muss für jede Palette gelten und nicht nur für
    // Schwarz auf Grün.
    expect(colorsFromPalette(palette, inkAlpha)).toEqual(color);
  });

  it('gibt jedem Erscheinungsbild einen Ton, der wirklich weiß ist', () => {
    // Der vierte Ton hat eine Vorgeschichte: „Papier getönt" wurde gestrichen,
    // weil er sich nach dem Zusammenfallen der drei Cremetöne nicht mehr vom
    // Papier absetzen konnte. `white` nimmt die Aufgabe wieder auf — und darf
    // sie nicht auf dieselbe Weise verfehlen.
    expect(elementTones.white.surface).toBe(palette.white);
    expect(elementTones.white.surface).not.toBe(elementTones.paper.surface);

    // Und zwar für jede Palette, nicht nur für die eigene: ein Kunde mit
    // weißem Papier bekäme sonst zwei Töne, die dasselbe tun.
    const gemischt = tonesFromPalette(
      musterkunde.palette,
      musterkunde.inkAlpha,
      musterkunde.paperAlpha,
    );
    expect(gemischt.white.surface).toBe(musterkunde.palette.white);
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
