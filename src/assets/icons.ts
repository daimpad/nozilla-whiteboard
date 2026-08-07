/**
 * Das nozilla-Icon-Set — 462 Icons, Dialekt A.
 *
 * Die Geometrie kommt aus dem CI-Repo und wird von `scripts/sync-ci.mjs` nach
 * `icons.generated.ts` übersetzt. Diese Datei ist nur die Fassade: sie legt
 * fest, wie ein Icon gefunden, benannt und gruppiert wird.
 *
 * Gezeichnet wird nirgends hier — das macht die Szene (`lib/export/scene.ts`),
 * damit Canvas, SVG und PDF dieselbe Zeichnung sehen.
 */
import { generatedIcons, iconCategories, type GeneratedIcon } from './icons.generated';
import { ICON_GRID, ICON_STROKE, type IconPrim } from './iconTypes';

export type { IconPrim } from './iconTypes';
export { iconCategories } from './icons.generated';
export type { IconCategory } from './icons.generated';

export type IconName = keyof typeof generatedIcons;
export type IconDef = GeneratedIcon;

/** Das Raster, auf dem alle Icons gezeichnet sind. */
export const iconGrid = ICON_GRID;
/** Die CI-Strichstärke in diesem Raster. */
export const iconStrokeGrid = ICON_STROKE;

export const icons = generatedIcons;
export const iconNames = Object.keys(generatedIcons) as IconName[];

const FALLBACK: IconName = 'square' in generatedIcons ? ('square' as IconName) : iconNames[0];

export function iconDef(name: IconName | undefined): IconDef {
  return (name && (generatedIcons as Record<string, IconDef>)[name]) || generatedIcons[FALLBACK];
}

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in generatedIcons;
}

export function iconsByCategory(): Array<{ category: string; names: IconName[] }> {
  return iconCategories
    .map((category) => ({
      category,
      names: iconNames.filter((name) => generatedIcons[name].category === category),
    }))
    .filter((group) => group.names.length > 0);
}

/**
 * Suche über Name, deutsche Beschriftung und Bedeutung. Die Bedeutung ist im
 * CI-Set gepflegt („Pfeil rechts — vorwärts, weiter, Ziel"), deshalb findet
 * eine Suche nach „weiter" das Pfeil-Icon.
 */
export function searchIcons(query: string): IconName[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return iconNames;
  return iconNames.filter((name) => {
    const icon = generatedIcons[name];
    return (
      name.includes(needle) ||
      icon.label.toLowerCase().includes(needle) ||
      icon.meaning.toLowerCase().includes(needle) ||
      icon.category.includes(needle)
    );
  });
}

/** Die Primitive eines Icons, in Zeichenreihenfolge. */
export function iconPrims(name: IconName | undefined): readonly IconPrim[] {
  return iconDef(name).prims;
}
