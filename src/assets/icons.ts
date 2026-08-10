/**
 * Das nozilla-Icon-Set — zwei Sätze, ein Namensraum.
 *
 * **Der Katalog**, 462 Zeichen: die frei verfügbaren Font-Awesome-Icons, im
 * nozilla-Dialekt nachgebaut. Sie kommen aus dem CI-Dokument.
 *
 * **Das Kern-Set**, 87 Zeichen mit dem Präfix `core-`: die Zeichen, die
 * nozilla für sich gezeichnet hat — Reihen für KI, Daten, Betrieb, Sicherheit,
 * Prototypen, Web, Workshop, Barrierefreiheit, Team, und eine Pixel-Reihe. Sie
 * kommen aus der Webseite, weil dort das Erscheinungsbild entschieden wird
 * (siehe CLAUDE.md).
 *
 * Das Präfix ist nicht Kosmetik: 26 Namen kommen in beiden Sätzen vor und
 * zeigen verschiedene Zeichnungen. `core-book` ist das Buch der Webseite,
 * `book` der Font-Awesome-Nachbau.
 *
 * Beide Sätze sprechen denselben Dialekt — 64 × 64, 4 px, square caps, miter
 * joins, Signatur unten rechts — und werden von `scripts/sync-ci.mjs` in
 * dieselben Primitive übersetzt. Ab hier unterscheidet sie nichts mehr.
 *
 * Gezeichnet wird nirgends hier — das macht die Szene (`lib/export/scene.ts`),
 * damit Canvas, SVG und PDF dieselbe Zeichnung sehen.
 */
import { generatedIcons, iconCategories } from './icons.generated';
import { coreIconCategories, coreIcons } from './iconsCore.generated';
import { ICON_GRID, ICON_STROKE, type IconPrim } from './iconTypes';

export type { IconPrim } from './iconTypes';

/**
 * Erst das Kern-Set, dann der Katalog.
 *
 * Die Reihenfolge ist die der Bibliothek: wer ein Zeichen sucht, soll zuerst
 * die sehen, die für nozilla gezeichnet wurden, und danach den Nachbau.
 *
 * `accessibility` steht in beiden Listen und bleibt eine Gruppe — wer ein
 * Zeichen für Barrierefreiheit sucht, will alle sehen, nicht zwei Rubriken
 * mit demselben Namen.
 */
export const iconCategoryNames = [...new Set<string>([...coreIconCategories, ...iconCategories])];
export type IconCategory = (typeof coreIconCategories)[number] | (typeof iconCategories)[number];

/**
 * Die gemeinsame Form. Sie steht hier und nicht in einer der beiden erzeugten
 * Dateien, weil erst die Vereinigung beider Kategorien-Listen den Typ ergibt,
 * den ein Icon aus *irgendeinem* der Sätze erfüllt.
 */
export interface IconDef {
  /** Deutsche Beschriftung — im Katalog gepflegt, im Kern-Set aus `aria-label`. */
  label: string;
  /** Wofür das Zeichen steht. Nur der Katalog führt sie. */
  meaning: string;
  category: IconCategory;
  prims: readonly IconPrim[];
}

const allIcons: Record<string, IconDef> = { ...coreIcons, ...generatedIcons };

export type IconName = keyof typeof coreIcons | keyof typeof generatedIcons;

/** Das Raster, auf dem alle Icons gezeichnet sind. */
export const iconGrid = ICON_GRID;
/** Die CI-Strichstärke in diesem Raster. */
export const iconStrokeGrid = ICON_STROKE;

export const icons = allIcons;
export const iconNames = Object.keys(allIcons) as IconName[];

const FALLBACK: IconName = 'square' in allIcons ? ('square' as IconName) : iconNames[0];

export function iconDef(name: IconName | undefined): IconDef {
  return (name && allIcons[name]) || allIcons[FALLBACK];
}

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in allIcons;
}

export function iconsByCategory(): Array<{ category: string; names: IconName[] }> {
  return iconCategoryNames
    .map((category) => ({
      category,
      names: iconNames.filter((name) => allIcons[name].category === category),
    }))
    .filter((group) => group.names.length > 0);
}

/**
 * Suche über Name, deutsche Beschriftung und Bedeutung. Die Bedeutung ist im
 * Katalog gepflegt („Pfeil rechts — vorwärts, weiter, Ziel"), deshalb findet
 * eine Suche nach „weiter" das Pfeil-Icon. Das Kern-Set trägt keine — dort
 * greifen Name und Beschriftung.
 */
export function searchIcons(query: string): IconName[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return iconNames;
  return iconNames.filter((name) => {
    const icon = allIcons[name];
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
