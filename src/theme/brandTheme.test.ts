import { describe, expect, it } from 'vitest';
import { color, elementTones, palette, inkAlpha, paperAlpha } from '@theme';
import {
  colorsFromPalette,
  nozillaTheme,
  tonesFromPalette,
  tonesOutsidePalette,
} from './brandTheme';
import { parseColor } from '@/lib/export/color';
import { activeTheme, availableThemes, setActiveTheme } from './runtime';
import { registerThemes } from '@/themes';

/**
 * Jedes angemeldete Erscheinungsbild, als Objekt.
 *
 * `availableThemes()` gibt nur Schlüssel und Beschriftung; an das ganze
 * Erscheinungsbild kommt man über das Umschalten. Das ist kein Umweg, sondern
 * genau der Weg, den die Anwendung auch geht.
 *
 * Geschleift wird über das Verzeichnis und nicht über eine getippte Liste, und
 * daran hängt mehr, als es aussieht: **eine erzeugte Kundendatei wird sonst von
 * keiner dieser Prüfungen angesehen.** Der CI-Generator legt Dateien an, die
 * hier hereinkommen — eine feste Liste ließe sie ungeprüft durch und erweckte
 * dabei den Eindruck, sie seien geprüft.
 */
function angemeldeteThemes() {
  registerThemes();
  const vorher = activeTheme().id;
  const alle = availableThemes().map(({ id }) => {
    setActiveTheme(id);
    return activeTheme();
  });
  setActiveTheme(vorher);
  return alle;
}

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

    /*
       Und zwar für **jedes angemeldete** Erscheinungsbild und nicht nur für
       das eigene. Die vorige Fassung sagte diesen Satz im Kommentar und prüfte
       darunter nur, dass der gemischte Ton aus der Palette kommt — was immer
       gilt, weil `tonesFromPalette` genau das tut. Der Musterkunde führte
       derweil für `paper` und `white` beide `#FFFFFF`, und der Test war grün:
       zwei Flächenrollen und, seit es „Creme" gibt, zwei Untergründe, die
       dieselbe Farbe malen. Nichts war kaputt, nichts sagte etwas — die Wahl
       tat nur nichts.

       Ein Kunde, dessen CI wirklich nur einen hellen Ton führt, wird hier rot
       und muss sich entscheiden. Das ist der Sinn: vier tote Menüeinträge
       sollen eine Entscheidung sein und kein Versehen.
    */
    for (const theme of angemeldeteThemes()) {
      const gemischt = tonesFromPalette(theme.palette, theme.inkAlpha, theme.paperAlpha);
      expect(gemischt.white.surface, theme.id).toBe(theme.palette.white);
      expect(gemischt.white.surface, theme.id).not.toBe(gemischt.paper.surface);
    }
  });

  it('mischt die Deckkraftstufen aus derselben Tinte und demselben Papier', () => {
    /*
       `inkAlpha` und `paperAlpha` stehen als fertige `rgba(…)`-Zeichenketten in
       der Datei, weil sie im Markup so gebraucht werden — und genau deshalb
       kann ihre Farbe von der Palette abkommen, ohne dass etwas anschlägt.
       `tonesOutsidePalette()` fängt das nicht: es fragt nur, ob ein Ton *aus*
       den eigenen Werten stammt, und die falsche Stufe stammt es.

       Der Schaden wäre leise. `paperAlpha` malt den gedämpften Text auf einer
       Folie in Tinte; stimmte sein Unterton nicht mit `palette.paper` überein,
       hätte jeder Nebensatz eine andere Wärme als der Satz darüber — auf jeder
       dunklen Folie, und niemand käme darauf, wo es herkommt. Beim Musterkunden
       stand genau das drin, nachdem sein Papier von Weiß auf einen warmen Ton
       gewechselt war.
    */
    const kanaele = (wert: string) => {
      const farbe = parseColor(wert);
      expect(farbe, wert).not.toBeNull();
      return [farbe?.r, farbe?.g, farbe?.b];
    };

    for (const theme of angemeldeteThemes()) {
      for (const stufe of Object.values(theme.inkAlpha)) {
        expect(kanaele(stufe), `${theme.id} · inkAlpha`).toEqual(kanaele(theme.palette.ink));
      }
      for (const stufe of Object.values(theme.paperAlpha)) {
        expect(kanaele(stufe), `${theme.id} · paperAlpha`).toEqual(kanaele(theme.palette.paper));
      }
    }
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
