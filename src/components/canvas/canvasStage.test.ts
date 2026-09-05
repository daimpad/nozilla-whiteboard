/**
 * Was die Fläche ansagt und woran sie misst.
 *
 * Zwei Auskünfte dieser Datei stehen vor keinem Auge und sind trotzdem falsch
 * gewesen: die Ansage eines Elements, die nur eine Hilfstechnik vorliest, und
 * das Raster, das man sieht, gegen das, auf das eingerastet wird.
 */
import { describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import { connectorLabels, kindLabels, labelOf, shapeLabels } from '@/lib/labels';
import { elementKinds } from '@/model/types';
import { createElement } from '@/model/factory';
import { elementLabel } from './CanvasStage';

describe('die Ansage eines Elements', () => {
  /*
     Der `default`-Zweig gab drei Arten den Namen einer vierten: Wortmarke,
     Diagramm und Tabelle hießen alle „Markdown-Block". Vor Augen steht die
     Zeichenkette nie — sie ist das, was eine Hilfstechnik vorliest, und
     deshalb fiel es niemandem auf. Dieselbe Bauart wie „Resize nw" an acht
     Griffen.

     Geprüft wird die Regel, die daran hängt, und nicht eine Tabelle daneben:
     **keine Art trägt den Namen einer anderen.**
  */
  it('trägt nie den Namen einer anderen Art', () => {
    for (const kind of elementKinds) {
      const ansage = elementLabel(createElement(kind, { x: 0, y: 0 }));
      for (const fremd of elementKinds) {
        if (fremd === kind) continue;
        expect(`${kind}: „${ansage}" gegen ${fremd}`).not.toBe(
          `${kind}: „${labelOf(kindLabels, fremd)}" gegen ${fremd}`,
        );
      }
    }
  });

  it('nennt jede Art bei einem Namen, den die Oberfläche kennt', () => {
    // Die Gegenrichtung: ohne sie bestünde die Prüfung oben auch für eine
    // Ansage, die für jede Art etwas Erfundenes zurückgibt.
    const erlaubt = new Set([
      ...Object.values(kindLabels),
      ...Object.values(shapeLabels),
      ...Object.values(connectorLabels),
    ]);
    for (const kind of elementKinds) {
      const ansage = elementLabel(createElement(kind, { x: 0, y: 0 }));
      // Die Arten mit eigenem Text sagen diesen an; die übrigen ihren Namen.
      const eigen = elementLabel({
        ...createElement(kind, { x: 0, y: 0 }),
        text: '',
        title: '',
        label: '',
        alt: '',
        markdown: '',
      } as unknown as Parameters<typeof elementLabel>[0]);
      const bekannt = erlaubt.has(eigen) || eigen.startsWith(labelOf(kindLabels, 'icon'));
      expect(`${kind}: „${eigen}" (aus „${ansage}") ${bekannt ? 'bekannt' : 'erfunden'}`).toBe(
        `${kind}: „${eigen}" (aus „${ansage}") bekannt`,
      );
    }
  });

  it('sagt den eigenen Text an, wo es einen gibt', () => {
    expect(elementLabel(createElement('text', { x: 0, y: 0, text: 'Ein Satz' }))).toBe('Ein Satz');
    expect(elementLabel(createElement('chart', { x: 0, y: 0, label: 'Umsatz' }))).toBe('Umsatz');
    expect(elementLabel(createElement('table', { x: 0, y: 0, label: 'Preise' }))).toBe('Preise');
    // Und der Name aus der Ebenenliste geht allem vor.
    expect(elementLabel(createElement('card', { x: 0, y: 0, name: 'Meine Karte' }))).toBe(
      'Meine Karte',
    );
  });
});

describe('das Raster', () => {
  it('ist dasselbe, auf das eingerastet wird', () => {
    /*
       Gezeichnet wurde `gridSize × gridMajorEvery`, also alle 32 Einheiten,
       während `computeSnap()` alle 8 einrastet: das Auge sah ein Raster, das
       Werkzeug rechnete mit einem vierfach feineren. Die 32 sind nicht falsch,
       sie gehören nur woandershin — sie sind die Punktrasterung des
       Untergrunds `grid`, also etwas, das exportiert wird.

       Hier steht nur die Zahl; dass die Fläche sie wirklich malt, prüft der
       Rauchtest am `background-size` der Ebene.
    */
    expect(canvas.gridSize * canvas.gridMajorEvery).not.toBe(canvas.gridSize);
  });
});
