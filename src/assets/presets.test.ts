/**
 * Die Bausteinbibliothek — jeder Eintrag ist eine Zusage über das, was auf der
 * Folie landet.
 *
 * Geprüft wird hier nicht, wie ein Baustein *aussieht*: das tun der
 * Überlauf-Wächter (`overflow.test.ts`, an jedem Baustein) und der Rauchtest,
 * der jede Kachel anklickt. Geprüft wird, was man dem fertigen Element erst
 * ansieht, wenn man es anfasst — und das ist etwas anderes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetPresets, presetGroupLabels, presetGroups } from './presets';
import { isIconName } from './icons';
import { createElement } from '@/model/factory';
import { buildElementPrims, elementFelder } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { canvas, toneNames } from '@/theme';
import type { CanvasElement, ElementKind } from '@/model/types';

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

  it('nehmen den Ton genau dann an, wenn sie eine Fläche malen', () => {
    /*
       Die Tonreihe steht über der Bibliothek und gilt für jede Kachel — bei
       dreiundzwanzig der siebenundvierzig Bausteine bewegt sie nichts.
       Gemessen wird das am **Markup** und nicht an `elementFelder()`: die
       Rechnung kann stimmen und der Zeichner etwas anderes tun, und genau
       darum ging es beim Innenabstand schon einmal.

       Die Zusage des Hinweises ist damit eine Regel und kein Einzelfall: der
       Ton greift, wenn der Baustein eine eigene Fläche malt, und sonst nicht.
    */
    const falsch: string[] = [];
    for (const preset of assetPresets) {
      const basis = ausBaustein(preset);
      const bilder = new Set(
        toneNames.map((tone) => primsToSvgMarkup(buildElementPrims({ ...basis, tone }))),
      );
      const wirkt = bilder.size > 1;
      if (wirkt !== elementFelder(basis).ton) {
        falsch.push(`${preset.id}: Markup ${wirkt ? 'ändert sich' : 'bleibt gleich'}`);
      }
    }
    expect(falsch).toEqual([]);

    // Und beide Seiten müssen besetzt sein: eine Regel, die alles oder nichts
    // bejaht, sagt über den Hinweis nichts.
    const ohne = assetPresets.filter((preset) => !elementFelder(ausBaustein(preset)).ton);
    expect(ohne.length).toBeGreaterThan(0);
    expect(ohne.length).toBeLessThan(assetPresets.length);
  });

  it('werden in der Leiste von keinem Hinweis falsch benannt', () => {
    /*
       Der Hinweis unter der Tonreihe nennt Arten beim Namen. Nennt er eine,
       bei der der Ton sehr wohl etwas tut, ist er schlimmer als keiner — das
       ist dieselbe Frage wie beim Untergrund `paper`, der das Weiß malt: wer
       eine Sache benennt, muss auch die meinen.
    */
    const quelle = readFileSync(
      join(process.cwd(), 'src', 'components', 'panels', 'AssetSidebar.tsx'),
      'utf8',
    );
    const hinweis = quelle.match(/data-hinweis="ton"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    expect(hinweis).toBeTruthy();

    const woerter: Partial<Record<ElementKind, string>> = {
      text: 'Text',
      markdown: 'Markdown',
      card: 'Karte',
      badge: 'Abzeichen',
      icon: 'Zeichen',
      shape: 'Form',
      connector: 'Verbinder',
      image: 'Bild',
      wordmark: 'Wortmarke',
      chart: 'Diagramm',
      table: 'Tabelle',
    };
    const gelogen: string[] = [];
    for (const [kind, wort] of Object.entries(woerter) as [ElementKind, string][]) {
      if (!hinweis?.includes(wort)) continue;
      const mitTon = assetPresets
        .filter((preset) => preset.kind === kind)
        .filter((preset) => elementFelder(ausBaustein(preset)).ton);
      if (mitTon.length > 0) gelogen.push(`${wort}: ${mitTon.map((p) => p.id).join(', ')}`);
    }
    expect(gelogen).toEqual([]);
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
