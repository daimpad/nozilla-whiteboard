/**
 * Die Probefolien — die einzige Fläche, auf der ein Entwurf zu beurteilen ist.
 *
 * Geprüft wird nicht, was auf ihnen *steht*, sondern was man an ihnen *sieht*:
 * für jede Rolle, die ein Entwurf setzen kann, wird sie einzeln verstellt und
 * das erzeugte Markup verglichen. Was das Bild nicht bewegt, kann auf diesen
 * Folien auch niemand beurteilen.
 *
 * Der Kopf von `probedeck.ts` versprach lange „vier Folien, die zusammen jede
 * Rolle einmal zeigen". Diese Messung sagte: neunzehn von siebenunddreißig
 * bewegten nichts — darunter die Kampagnengröße, auf einer Folie, die genau so
 * überschrieben war.
 */
import { describe, expect, it } from 'vitest';
import { leererEntwurf, vorschauTheme, type CiEntwurf } from './entwurf';
import { zeichneProbe } from './Vorschau';
import { PROBEDECK, STUMME_ROLLEN } from './probedeck';
import { parseDeck } from '@/lib/markdown/deck';
import { isIconName } from '@/assets/icons';
import { withTheme } from '@/theme/runtime';
import { nozillaTheme } from '@/theme/brandTheme';
import { musterkunde } from '@/themes/musterkunde';

/** Das ganze Probebild als eine Zeichenkette. */
function bild(entwurf: CiEntwurf): string {
  return zeichneProbe(vorschauTheme(entwurf))
    .map((blatt) => blatt.markup)
    .join('\n');
}

/**
 * Jede Rolle einmal verstellen — und zurückgeben, welche das Bild nicht bewegt.
 *
 * Verstellt wird mit einem Wert, den nozilla nirgends führt: eine Farbe, die
 * zufällig schon dasteht, änderte nichts und sähe wie ein Befund aus.
 */
function stummeRollen(): string[] {
  const basis = bild(leererEntwurf());
  const stumm: string[] = [];
  const pruefe = (name: string, aendern: (entwurf: CiEntwurf) => void) => {
    const entwurf = leererEntwurf();
    aendern(entwurf);
    if (bild(entwurf) === basis) stumm.push(name);
  };

  for (const rolle of Object.keys(leererEntwurf().palette)) {
    pruefe(`palette.${rolle}`, (entwurf) => {
      (entwurf.palette as Record<string, string>)[rolle] = '#123456';
    });
  }
  for (const gruppe of ['textScale', 'sonderstufen', 'stroke', 'shadowOffset'] as const) {
    for (const rolle of Object.keys(leererEntwurf()[gruppe])) {
      pruefe(`${gruppe}.${rolle}`, (entwurf) => {
        (entwurf[gruppe] as Record<string, number>)[rolle] += 7;
      });
    }
  }
  pruefe('auszeichnungEnger', (entwurf) => {
    entwurf.auszeichnungEnger = -0.05;
  });

  return stumm;
}

describe('das Probedeck', () => {
  it('zeigt jede Rolle, die eine Folie überhaupt malen kann', () => {
    expect(stummeRollen().sort()).toEqual(Object.keys(STUMME_ROLLEN).sort());
  });

  it('führt keine Rolle als stumm, die das Bild sehr wohl bewegt', () => {
    /*
       Die Gegenrichtung, und sie ist die eigentliche: die Liste bliebe sonst
       stehen, wenn eine Folie dazukommt, die die Rolle zeigt — und behauptete
       im Formular weiter, man sähe nichts. Ein Hinweis, der eine Rolle falsch
       benennt, ist schlimmer als keiner.
    */
    const wirklichStumm = new Set(stummeRollen());
    const zuUnrecht = Object.keys(STUMME_ROLLEN).filter((rolle) => !wirklichStumm.has(rolle));
    expect(zuUnrecht).toEqual([]);
  });

  it('gibt jeder stummen Rolle einen Grund, der etwas sagt', () => {
    for (const [rolle, grund] of Object.entries(STUMME_ROLLEN)) {
      expect(grund.length, rolle).toBeGreaterThan(20);
      expect(grund.trim().endsWith('.'), rolle).toBe(true);
    }
  });

  it('nennt nur Zeichen, die beide mitgelieferten Sets führen', () => {
    /*
       Die Probefolien nennen zwei Zeichen beim Namen. Ein Set, das eines
       davon nicht führt, zeichnet den Platzhalter — und die eine Seite, deren
       Zweck es ist, ein fremdes Erscheinungsbild zu beurteilen, zeigte dann
       eine Lücke, die niemand gewählt hat.
    */
    const genannt = [...PROBEDECK.matchAll(/^\s*icon:\s*(\S+)\s*$/gm)].map((treffer) => treffer[1]);
    expect(genannt.length).toBeGreaterThan(1);
    for (const theme of [nozillaTheme, musterkunde]) {
      withTheme(theme, () => {
        expect(genannt.filter((name) => !isIconName(name))).toEqual([]);
      });
    }
  });

  it('trägt so viele Folien, wie sein Kopf ansagt', () => {
    // Sechs — und die Zahl steht im Kopf der Datei, also muss sie stimmen.
    expect(parseDeck(PROBEDECK).slides).toHaveLength(6);
  });
});
