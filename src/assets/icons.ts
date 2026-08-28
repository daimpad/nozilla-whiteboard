/**
 * Das Icon-Set des gerade gültigen Erscheinungsbilds.
 *
 * Was hier steht, wechselt mit dem Erscheinungsbild. Was in `iconSet.ts` steht,
 * wechselt nicht: dort liegt das nozilla-Set als Wert und daneben das Set,
 * aus dem die Werkzeug-Oberfläche zeichnet.
 *
 * ## Warum hier fast alles eine Funktion ist
 *
 * `iconNames` war eine Konstante, und eine Konstante ist genau das, was ein
 * wechselbares Set nicht sein darf — sie hielte die Liste des
 * Erscheinungsbilds fest, das beim Start zufällig galt. Dieselbe Regel wie bei
 * den Farben in `theme/runtime.ts`, nur strenger: eine Palette ist ein Objekt
 * und kann eine lebendige Bindung sein, eine abgeleitete Liste nicht.
 *
 * Wer eine dieser Funktionen in einem `useMemo` aufruft, hängt `useThemeVersion()`
 * mit in die Abhängigkeiten. Ohne das bleibt nach einem Wechsel die alte
 * Bibliothek stehen.
 */
import { iconSet } from '@/theme';
import { missingIcon, type IconDef, type IconSet } from './iconSet';

export { iconGrid, iconStrokeGrid, missingIcon, toolIcon, withoutSignature } from './iconSet';
export type { IconDef, IconPrim, IconPaintRole, IconSet, ToolIconName } from './iconSet';

/**
 * Der Name eines Zeichens — eine freie Zeichenkette, keine Aufzählung.
 *
 * Sie war einmal die Vereinigung der 554 nozilla-Namen. Das ging, solange es
 * ein Set gab. Jetzt darf ein Deck ein Zeichen nennen, das zum Set eines
 * anderen Erscheinungsbilds gehört, und der Wert muss den Weg durch das Werkzeug
 * überstehen, auch wenn hier gerade niemand ihn zeichnen kann — sonst
 * verlöre ein falsch geöffnetes Deck beim Speichern seine Icons.
 *
 * Dieselbe Entscheidung wie bei `DeckMeta.theme`, und aus demselben Grund.
 * Wer in der Oberfläche ein Zeichen wörtlich nennt, nimmt `ToolIconName` —
 * das ist weiterhin eng.
 */
export type IconName = string;

/** Das Set, aus dem gerade gezeichnet wird. */
export function activeIconSet(): IconSet {
  return iconSet;
}

export function icons(): Record<string, IconDef> {
  return iconSet.icons;
}

export function iconNames(): IconName[] {
  return Object.keys(iconSet.icons);
}

export function iconCategoryNames(): readonly string[] {
  return iconSet.categories;
}

/**
 * Ein Zeichen nachschlagen. Ein unbekannter Name bekommt das Ersatzzeichen —
 * ein durchgestrichenes Quadrat, damit die Lücke zu sehen ist.
 */
export function iconDef(name: IconName | undefined): IconDef {
  return (name && iconSet.icons[name]) || missingIcon;
}

/**
 * Kennt das gültige Set dieses Zeichen?
 *
 * Eine Prüfung zur Laufzeit, wo früher der Übersetzer entschied — und das ist
 * die genauere Auskunft: ob ein Name gezeichnet werden kann, hängt am Set und
 * nicht am Übersetzungszeitpunkt.
 */
export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in iconSet.icons;
}

export function iconsByCategory(): Array<{ category: string; names: IconName[] }> {
  const names = iconNames();
  return iconSet.categories
    .map((category) => ({
      category,
      names: names.filter((name) => iconSet.icons[name].category === category),
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
  if (!needle) return iconNames();
  return iconNames().filter((name) => {
    const icon = iconSet.icons[name];
    return (
      name.includes(needle) ||
      icon.label.toLowerCase().includes(needle) ||
      icon.meaning.toLowerCase().includes(needle) ||
      icon.category.includes(needle)
    );
  });
}

/** Die Primitive eines Icons, in Zeichenreihenfolge. */
export function iconPrims(name: IconName | undefined): IconDef['prims'] {
  return iconDef(name).prims;
}
