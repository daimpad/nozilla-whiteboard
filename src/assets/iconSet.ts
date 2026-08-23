/**
 * Ein Icon-Set als Wert — und das von nozilla als erster davon.
 *
 * Bis hierher war „das Icon-Set" eine Konstante mit 554 Einträgen. Seit ein
 * Erscheinungsbild wechselbar ist, ist es eine Belegung wie Palette und
 * Typo-Leiter: ein Kunde bringt seine Piktogramme mit, und die Fläche zeichnet
 * sie.
 *
 * Diese Datei ist mit Absicht ein Blatt — sie liest nichts vom
 * Erscheinungsbild. Sonst liefe sie im Kreis: `theme/brandTheme.ts` braucht das
 * nozilla-Set, um es als Vorgabe einzutragen, und `assets/icons.ts` braucht das
 * gerade gültige Erscheinungsbild, um das aktive Set nachzuschlagen.
 *
 * ## Zwei Sätze, ein Namensraum
 *
 * **Der Katalog**, 462 Zeichen: die frei verfügbaren Font-Awesome-Icons, im
 * nozilla-Dialekt nachgebaut.
 *
 * **Das Kern-Set**, 92 Zeichen mit dem Präfix `core-`: die Zeichen, die
 * nozilla für sich gezeichnet hat — Reihen für KI, Daten, Betrieb, Sicherheit,
 * Prototypen, Web, Workshop, Barrierefreiheit, Team, und eine Pixel-Reihe.
 *
 * Beide kommen aus demselben CI-Repo, nur in verschiedener Form: der Katalog
 * als Modul, das Kern-Set als fertige SVG-Dateien.
 *
 * Das Präfix ist nicht Kosmetik: 26 Namen kommen in beiden Sätzen vor und
 * zeigen verschiedene Zeichnungen. `core-book` ist das Buch des Kern-Sets,
 * `book` der Font-Awesome-Nachbau.
 *
 * Beide Sätze sprechen denselben Dialekt — 64 × 64, 4 px, square caps, miter
 * joins, Signatur unten rechts — und werden von `scripts/sync-ci.mjs` in
 * dieselben Primitive übersetzt. Ab hier unterscheidet sie nichts mehr.
 *
 * Gezeichnet wird nirgends hier — das macht die Szene (`lib/export/scene.ts`),
 * damit Fläche, SVG und PDF dieselbe Zeichnung sehen.
 */
import { generatedIcons, iconCategories } from './icons.generated';
import { coreIconCategories, coreIcons } from './iconsCore.generated';
import { ICON_GRID, ICON_SIGNATURE, ICON_STROKE, type IconPrim } from './iconTypes';

export type { IconPrim, IconPaintRole } from './iconTypes';

/** Das Raster, auf dem alle Icons gezeichnet sind. */
export const iconGrid = ICON_GRID;
/** Die CI-Strichstärke in diesem Raster. */
export const iconStrokeGrid = ICON_STROKE;

/**
 * Ein einzelnes Zeichen.
 *
 * `category` ist eine freie Zeichenkette und keine Aufzählung: die Rubriken des
 * nozilla-Sets sind seine eigenen, und ein Kunde sortiert nach seinen. Geprüft
 * wird nur, dass eine da ist — sonst fiele das Zeichen aus der Bibliothek.
 */
export interface IconDef {
  /** Deutsche Beschriftung — im Katalog gepflegt, im Kern-Set aus `aria-label`. */
  label: string;
  /** Wofür das Zeichen steht. Nur der Katalog führt sie. */
  meaning: string;
  category: string;
  prims: readonly IconPrim[];
}

/**
 * Ein vollständiges Set.
 *
 * `categories` ist nicht aus `icons` abgeleitet, obwohl es das könnte: die
 * Reihenfolge ist die der Bibliothek, und die gehört dem, der das Set
 * zusammenstellt. Eine abgeleitete Liste stünde in der Reihenfolge, in der die
 * Zeichen zufällig notiert sind.
 */
export interface IconSet {
  icons: Record<string, IconDef>;
  categories: readonly string[];
}

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
export const nozillaIcons: IconSet = {
  icons: { ...coreIcons, ...generatedIcons },
  categories: [...new Set<string>([...coreIconCategories, ...iconCategories])],
};

/* -------------------------------------------------------------------------- */
/* Das Set der Oberfläche                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Die Namen, die die Werkzeug-Oberfläche benutzen darf.
 *
 * Leisten, Knöpfe und Listen zeichnen aus dem nozilla-Set und wechseln **nicht**
 * mit dem Erscheinungsbild — aus demselben Grund, aus dem sie ihre Farben nicht
 * wechseln: die Oberfläche ist das Werkzeug und nicht das Werkstück. Ein
 * Kunden-Set, dem `chevron-right` fehlt, dürfte niemals einen Knopf leeren.
 *
 * Deshalb bleibt hier die enge Vereinigung stehen. Ein Tippfehler in
 * `icon="chevorn-right"` ist ein Übersetzungsfehler und keine leere Fläche.
 */
export type ToolIconName = keyof typeof coreIcons | keyof typeof generatedIcons;

const toolIcons = nozillaIcons.icons as Record<ToolIconName, IconDef>;

/** Ein Zeichen der Oberfläche. Der Typ garantiert, dass es existiert. */
export function toolIcon(name: ToolIconName): IconDef {
  return toolIcons[name];
}

/* -------------------------------------------------------------------------- */
/* Die Signatur                                                                */
/* -------------------------------------------------------------------------- */

/** Trägt dieses Primitiv den Punkt unten rechts? */
export function isSignature(prim: IconPrim): boolean {
  return (
    prim.t === ICON_SIGNATURE.t &&
    prim.x === ICON_SIGNATURE.x &&
    prim.y === ICON_SIGNATURE.y &&
    prim.w === ICON_SIGNATURE.w &&
    prim.h === ICON_SIGNATURE.h &&
    prim.fill === ICON_SIGNATURE.fill
  );
}

/**
 * Die Zeichnung ohne den Punkt unten rechts — in kleinen Knöpfen ist er zu laut.
 *
 * Geprüft wird, ob das letzte Primitiv *die Signatur ist*, nicht bloß, ob es
 * ein letztes gibt. Das nozilla-Set trägt sie überall, ein Kunden-Set muss das
 * nicht: blind das letzte Primitiv zu streichen, nähme einem einstrichigen
 * Zeichen genau seinen einen Strich — und die Bibliothek zeigte leere Kacheln.
 */
export function withoutSignature(prims: readonly IconPrim[]): readonly IconPrim[] {
  const last = prims[prims.length - 1];
  return last && isSignature(last) ? prims.slice(0, -1) : prims;
}

/* -------------------------------------------------------------------------- */
/* Wenn ein Zeichen fehlt                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Das Ersatzzeichen: ein durchgestrichenes Quadrat.
 *
 * Ein Deck darf ein Zeichen nennen, das im gerade gültigen Set nicht steht —
 * genauso, wie es ein unbekanntes Erscheinungsbild nennen darf. Gezeichnet wird
 * dann das hier: unverwechselbar eine Lücke und nicht das erstbeste Zeichen des
 * Sets, das man für die Absicht des Decks halten könnte.
 *
 * Es gehört keinem Set an und trägt deshalb auch keine Signatur.
 */
export const missingIcon: IconDef = {
  label: 'Fehlt',
  meaning: 'Dieses Zeichen steht nicht im gültigen Icon-Set.',
  category: '',
  prims: [
    { t: 'rect', x: ICON_GRID / 8, y: ICON_GRID / 8, w: ICON_GRID * 0.75, h: ICON_GRID * 0.75 },
    {
      t: 'path',
      d: `M${ICON_GRID / 8} ${ICON_GRID / 8} L${ICON_GRID * 0.875} ${ICON_GRID * 0.875}`,
    },
  ],
};
