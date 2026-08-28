/**
 * Kontrast und Unterscheidbarkeit zweier Farben.
 *
 * Die Rechnung stand testlokal in `theme/surface.test.ts` und galt dort nur
 * den Leisten — für die Palette eines Erscheinungsbilds gab es keine einzige
 * Prüfung. Das ist die teurere Lücke von beiden: **die kritischen Paare sind
 * im Mischer fest verdrahtet und lassen sich vom Kunden gar nicht reparieren.**
 * `elementTones.signal.text` ist `palette.ink` auf `palette.signal`,
 * `color.inkOnSignal` ebenso, `elementTones.ink.text` ist `palette.paper` auf
 * `palette.ink`. Eine Marke mit dunkler Signalfarbe bekommt damit schwarze
 * Schrift auf dunklem Grund — auf jeder Signalfolie, in jedem Abzeichen.
 *
 * Sie steht deshalb hier und nicht dort: der CI-Generator prüft damit eine
 * Palette, bevor jemand sie anlegt, und `surface.test.ts` ruft dieselbe
 * Funktion. Zwei Rechnungen für dieselbe Frage liefen auseinander, und man
 * sähe es erst an der fremden Marke.
 */

/** Ein `#RRGGBB` in seine drei Kanäle. `null`, wenn es keines ist. */
export function kanaele(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex.trim())) return null;
  const wert = Number.parseInt(hex.trim().slice(1), 16);
  return [(wert >> 16) & 255, (wert >> 8) & 255, wert & 255];
}

/** Relative Leuchtdichte nach WCAG 2.1. */
function leuchtdichte(hex: string): number {
  const roh = kanaele(hex);
  if (!roh) return 0;
  const linear = roh.map((kanal) => {
    const c = kanal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Das Kontrastverhältnis zweier `#RRGGBB` — zwischen 1 (gleich) und 21
 * (Schwarz auf Weiß).
 */
export function kontrast(a: string, b: string): number {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}

/**
 * Die Schwellen der WCAG 2.1 für Text.
 *
 * `AA` gilt für Fließtext, `AA_GROSS` ab 24 px beziehungsweise 18,5 px fett —
 * auf einer Folie ist fast jede Überschrift dort. Beide stehen hier als Zahl,
 * weil sie aus einer Norm kommen und keiner Marke gehören.
 */
export const AA = 4.5;
export const AA_GROSS = 3;

/**
 * Sind zwei Farben überhaupt zu unterscheiden?
 *
 * Eine eigene Frage, und eine andere als die nach dem Kontrast. Der Code-
 * Untergrund auf einer Signalfolie (`signalSoft` auf `signal`) muss nichts
 * lesbar machen — er muss nur *sichtbar* sein. Genau diese Klasse Fehler hat
 * das Projekt schon zweimal getroffen: `paper` und `white` beide `#FFFFFF`,
 * und davor drei Cremetöne, die einer waren. Nichts ist dann kaputt, nichts
 * sagt etwas, die Wahl tut nur nichts.
 *
 * Die Schwelle ist bewusst niedrig: 1,04 entspricht rund einem Prozent
 * Helligkeitsunterschied und trennt „derselbe Wert" von „ein Nachbarton".
 */
export const UNTERSCHEIDBAR = 1.04;

export function unterscheidbar(a: string, b: string): boolean {
  return kontrast(a, b) >= UNTERSCHEIDBAR;
}
