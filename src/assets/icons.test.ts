import { describe, expect, it } from 'vitest';
import { parsePath, segsBounds } from '@/lib/geometry/path';
import { iconGrid, iconNames, icons, iconsByCategory, searchIcons, type IconPrim } from './icons';

/**
 * These are CI conformance tests, not smoke tests: an icon that breaks one of
 * them would render differently on the canvas, in an SVG export or in a PDF.
 */
describe('the CI icon library', () => {
  it('is not empty and has unique names', () => {
    expect(iconNames.length).toBeGreaterThan(40);
    expect(new Set(iconNames).size).toBe(iconNames.length);
  });

  it.each(iconNames)('%s draws something', (name) => {
    expect(icons[name].prims.length).toBeGreaterThan(0);
  });

  it.each(iconNames)('%s uses only arc-free path data', (name) => {
    for (const prim of icons[name].prims as IconPrim[]) {
      if (prim.t !== 'path') continue;
      expect(prim.d).not.toMatch(/[Aa]/);
      expect(() => parsePath(prim.d)).not.toThrow();
    }
  });

  it.each(iconNames)('%s stays on the 24×24 grid', (name) => {
    for (const prim of icons[name].prims as IconPrim[]) {
      for (const { x, y } of primPoints(prim)) {
        expect(x).toBeGreaterThanOrEqual(-0.5);
        expect(y).toBeGreaterThanOrEqual(-0.5);
        expect(x).toBeLessThanOrEqual(iconGrid + 0.5);
        expect(y).toBeLessThanOrEqual(iconGrid + 0.5);
      }
    }
  });

  it.each(iconNames)('%s has a label and a known category', (name) => {
    expect(icons[name].label.length).toBeGreaterThan(0);
    expect(icons[name].category).toBeTruthy();
  });

  it('groups every icon into exactly one category', () => {
    const grouped = iconsByCategory().flatMap((group) => group.names);
    expect(grouped.sort()).toEqual([...iconNames].sort());
  });

  it('searches by name and by label', () => {
    expect(searchIcons('chart')).toContain('chart-bar');
    expect(searchIcons('Bar chart')).toContain('chart-bar');
    expect(searchIcons('')).toEqual(iconNames);
    expect(searchIcons('zzzz')).toEqual([]);
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
    case 'line':
      return [
        { x: prim.x1, y: prim.y1 },
        { x: prim.x2, y: prim.y2 },
      ];
    case 'polyline':
    case 'polygon': {
      const out: Array<{ x: number; y: number }> = [];
      for (let i = 0; i + 1 < prim.points.length; i += 2) {
        out.push({ x: prim.points[i], y: prim.points[i + 1] });
      }
      return out;
    }
    default:
      return [];
  }
}
