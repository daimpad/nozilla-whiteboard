/**
 * Die Bausteinbibliothek — jeder Eintrag ist eine Zusage über das, was auf der
 * Folie landet.
 *
 * Geprüft wird hier nicht, wie ein Baustein *aussieht*: das tun der
 * Überlauf-Wächter (`overflow.test.ts`, an jedem Baustein) und der Rauchtest,
 * der jede Kachel anklickt. Geprüft wird, was man dem fertigen Element erst
 * ansieht, wenn man es anfasst — und das ist etwas anderes.
 */
import { describe, expect, it } from 'vitest';
import { assetPresets, presetGroupLabels, presetGroups } from './presets';
import { isIconName } from './icons';
import { createElement } from '@/model/factory';
import { elementFelder } from '@/lib/export/scene';
import { canvas } from '@/theme';
import type { CanvasElement } from '@/model/types';

/** Das Element, das aus einem Baustein wirklich entsteht. */
function ausBaustein(preset: (typeof assetPresets)[number]): CanvasElement {
  return { ...createElement(preset.kind), ...preset.patch } as CanvasElement;
}

describe('die Bausteine', () => {
  it('legen jedes Maß auf das Raster, auf das eingerastet wird', () => {
    /*
       `computeSnap()` und `resizeRect()` rasten jedes gezogene Element auf
       `canvas.gridSize` ein, und der Deck-Prompt verlangt dasselbe vom
       Sprachmodell. Die Bausteine selbst hielten sich nicht daran: 37 von 47
       Maßen lagen daneben, und sichtbar wird das beim ersten Anfassen — der
       Kasten springt aufs Raster, sobald jemand einen Griff berührt.

       Dieselbe Falle wie bei `insertColumnWidth()`, eine Ebene höher: dort
       lagen 530 Einheiten bei x = 662 neben dem Raster.
    */
    const daneben: string[] = [];
    for (const preset of assetPresets) {
      const patch = preset.patch as Record<string, unknown>;
      for (const schluessel of ['x', 'y', 'w', 'h'] as const) {
        const wert = patch[schluessel];
        if (typeof wert === 'number' && wert % canvas.gridSize !== 0) {
          daneben.push(`${preset.id}.${schluessel} = ${wert}`);
        }
      }
    }
    expect(daneben).toEqual([]);
  });

  it('bleiben in der Spaltenbreite des Satzspiegels', () => {
    const spalte = canvas.width - canvas.margin.left - canvas.margin.right;
    const zuBreit = assetPresets
      .map((preset) => ({ id: preset.id, w: (preset.patch as { w?: number }).w ?? 0 }))
      .filter((eintrag) => eintrag.w > spalte);
    expect(zuBreit).toEqual([]);
  });

  it('setzen keine Angabe, die bei ihrer Art nichts tut', () => {
    /*
       Dieselbe Frage wie im Inspektor, und dieselbe Rechnung: ein Baustein,
       der dem Abzeichen einen Innenabstand mitgibt oder der Wortmarke einen
       Schatten, schreibt einen Wert in die `.md`, den kein Zeichner liest.
       Ein Feld, dessen Inhalt verworfen wird, ist schlimmer als kein Feld —
       hier ist es ein Wert, den niemand gesetzt hat und niemand sieht.
    */
    const tot: string[] = [];
    for (const preset of assetPresets) {
      const felder = elementFelder(ausBaustein(preset)) as unknown as Record<string, boolean>;
      const patch = preset.patch as Record<string, unknown>;
      for (const [feld, schluessel] of [
        ['drehung', 'rotation'],
        ['ton', 'tone'],
        ['fuellung', 'fill'],
        ['strichstaerke', 'strokeWidth'],
        ['schatten', 'shadow'],
        ['innenabstand', 'padding'],
      ] as const) {
        if (schluessel in patch && !felder[feld]) {
          tot.push(`${preset.id}: ${schluessel} wirkt bei ${preset.kind} nicht`);
        }
      }
    }
    expect(tot).toEqual([]);
  });

  it('nennen nur Zeichen, die das Set führt', () => {
    // Ein Name, den das Set nicht kennt, zeichnet nichts — und die Kachel in
    // der Bibliothek verspricht trotzdem etwas. `sparkle` stand so schon
    // einmal im Inspektor.
    const unbekannt = assetPresets
      .map((preset) => ({ id: preset.id, icon: (preset.patch as { icon?: string }).icon }))
      .filter((eintrag) => eintrag.icon !== undefined && !isIconName(eintrag.icon));
    expect(unbekannt).toEqual([]);
  });

  it('tragen eindeutige Kennungen und eine bekannte Gruppe', () => {
    const ids = assetPresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of assetPresets) {
      expect(presetGroups).toContain(preset.group);
    }
  });

  it('füllen jede Gruppe, die die Bibliothek anbietet', () => {
    // Eine Überschrift ohne Inhalt darunter ist eine leere Zusage.
    const leer = presetGroups.filter(
      (gruppe) => !assetPresets.some((preset) => preset.group === gruppe),
    );
    expect(leer).toEqual([]);
    expect(Object.keys(presetGroupLabels).sort()).toEqual([...presetGroups].sort());
  });
});
