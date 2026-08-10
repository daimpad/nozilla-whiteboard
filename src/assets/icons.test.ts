import { describe, expect, it } from 'vitest';
import { parsePath, segsBounds } from '@/lib/geometry/path';
import {
  iconGrid,
  iconNames,
  icons,
  iconsByCategory,
  isIconName,
  searchIcons,
  type IconPrim,
} from './icons';

/**
 * Das sind CI-Konformitätstests, keine Rauchproben: ein Icon, das eine dieser
 * Regeln bricht, sähe auf der Fläche, im SVG oder im PDF anders aus als im
 * CI-Repo — und genau das darf nicht passieren.
 *
 * Die Geometrie ist generiert (`scripts/sync-ci.mjs`); geprüft wird deshalb
 * das Ergebnis der Übersetzung, nicht die Handarbeit.
 */
describe('das nozilla-Icon-Set', () => {
  it('ist vollständig und eindeutig', () => {
    // 462 Nachbauten aus dem Katalog, 87 Kern-Zeichen der Webseite.
    expect(iconNames.filter((name) => name.startsWith('core-')).length).toBe(87);
    expect(iconNames.length).toBe(549);
    expect(new Set(iconNames).size).toBe(iconNames.length);
  });

  it('hält die beiden Sätze auseinander, wo sie denselben Namen tragen', () => {
    // 26 Namen kommen doppelt vor und zeigen verschiedene Zeichnungen. Das
    // Präfix ist das Einzige, was sie trennt — geht es verloren, überschreibt
    // ein Satz den anderen still.
    expect(isIconName('book')).toBe(true);
    expect(isIconName('core-book')).toBe(true);
    expect(icons['core-book'].prims).not.toEqual(icons.book.prims);
  });

  it.each(iconNames)('%s zeichnet etwas', (name) => {
    expect(icons[name].prims.length).toBeGreaterThan(1);
  });

  it.each(iconNames)('%s hat lesbare Pfaddaten', (name) => {
    for (const prim of icons[name].prims as readonly IconPrim[]) {
      if (prim.t !== 'path') continue;
      // Arcs sind erlaubt und werden beim Parsen zu Kubiken — PDF kennt keine.
      expect(() => parsePath(prim.d)).not.toThrow();
      expect(parsePath(prim.d).length).toBeGreaterThan(0);
    }
  });

  it.each(iconNames)('%s bleibt im 64er-Raster', (name) => {
    for (const prim of icons[name].prims as readonly IconPrim[]) {
      // Gedrehte Geometrie darf rechnerisch ausbrechen — sie wird zurückgedreht.
      if ('rotate' in prim && prim.rotate) continue;
      for (const { x, y } of primPoints(prim)) {
        expect(x).toBeGreaterThanOrEqual(-1);
        expect(y).toBeGreaterThanOrEqual(-1);
        expect(x).toBeLessThanOrEqual(iconGrid + 1);
        expect(y).toBeLessThanOrEqual(iconGrid + 1);
      }
    }
  });

  it.each(iconNames)('%s benutzt nur CI-Farbrollen', (name) => {
    for (const prim of icons[name].prims as readonly IconPrim[]) {
      if (prim.fill) expect(['ink', 'signal']).toContain(prim.fill);
      if (prim.stroke) expect(['ink', 'signal']).toContain(prim.stroke);
    }
  });

  it.each(iconNames)('%s trägt die Signatur des Sets', (name) => {
    // Jedes Icon endet mit demselben 6 × 6-Punkt unten rechts — das
    // Erkennungszeichen, das auch die Wortmarke trägt.
    const last = icons[name].prims[icons[name].prims.length - 1];
    expect(last).toEqual({ t: 'rect', x: 54, y: 54, w: 6, h: 6, fill: 'signal' });
  });

  it.each(iconNames)('%s ist beschriftet und einsortiert', (name) => {
    expect(icons[name].label.length).toBeGreaterThan(0);
    expect(icons[name].category.length).toBeGreaterThan(0);
  });

  it('ordnet jedes Icon genau einer Kategorie zu', () => {
    const grouped = iconsByCategory().flatMap((group) => group.names);
    expect(grouped.slice().sort()).toEqual([...iconNames].sort());
  });

  it('sucht über Name, deutsche Beschriftung und Bedeutung', () => {
    expect(searchIcons('arrow-right')).toContain('arrow-right');
    expect(searchIcons('Pfeil rechts')).toContain('arrow-right');
    // Die Bedeutung ist im CI gepflegt: „vorwärts, weiter, Ziel".
    expect(searchIcons('weiter')).toContain('arrow-right');
    expect(searchIcons('')).toEqual(iconNames);
    expect(searchIcons('zzzz')).toEqual([]);
  });

  it('erkennt gültige Namen', () => {
    expect(isIconName('rocket')).toBe(true);
    expect(isIconName('kein-icon')).toBe(false);
    expect(isIconName(42)).toBe(false);
  });

  it('behält die Bogen-Geometrie im Raster, nachdem sie zu Kubiken wurde', () => {
    // `database` ist der Prüfstein: drei Ellipsenbögen, die nach der Umwandlung
    // immer noch dasselbe Fass beschreiben müssen.
    const paths = (icons.database.prims as readonly IconPrim[]).filter((prim) => prim.t === 'path');
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const bounds = segsBounds(parsePath((path as Extract<IconPrim, { t: 'path' }>).d));
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(iconGrid + 1);
      expect(bounds.y + bounds.h).toBeLessThanOrEqual(iconGrid + 1);
    }
  });
});

function primPoints(prim: IconPrim): Array<{ x: number; y: number }> {
  switch (prim.t) {
    case 'path': {
      const bounds = segsBounds(parsePath(prim.d));
      return [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      ];
    }
    case 'circle':
      return [
        { x: prim.cx - prim.r, y: prim.cy - prim.r },
        { x: prim.cx + prim.r, y: prim.cy + prim.r },
      ];
    case 'ellipse':
      return [
        { x: prim.cx - prim.rx, y: prim.cy - prim.ry },
        { x: prim.cx + prim.rx, y: prim.cy + prim.ry },
      ];
    case 'rect':
      return [
        { x: prim.x, y: prim.y },
        { x: prim.x + prim.w, y: prim.y + prim.h },
      ];
    default:
      return [];
  }
}
