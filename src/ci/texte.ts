/**
 * Wofür jede Rolle da ist — einmal aufgeschrieben.
 *
 * Diese Sätze standen im Formular, und dort allein waren sie richtig
 * aufgehoben, solange das Formular der einzige Weg zu einem Entwurf war. Seit
 * es einen zweiten gibt — den Prompt an ein Sprachmodell —, sind sie das
 * *Lastenheft* und nicht mehr die Beschriftung: das Modell bekommt genau diese
 * Erklärungen, und es bekommt sie deshalb aus derselben Datei.
 *
 * Zwei Fassungen derselben Erklärung wären hier besonders teuer. Sie liefen
 * nicht laut auseinander, sondern leise: das Modell belegte `paperAlt` nach
 * einem Satz, den das Formular so nicht mehr sagt, und niemand verglich je die
 * beiden Texte.
 *
 * Der englische Schlüssel steht überall daneben und wird nicht übersetzt — er
 * ist der Name im Dateiformat und in jeder erzeugten Datei. Dieselbe Linie wie
 * in `src/lib/labels.ts`.
 */
import type { FamilyRole, PaletteRole, ShadowRole, StrokeRole, TextStepRole } from '@/theme';
import type { Sonderstufe, Zeichenwahl } from './entwurf';

export const PALETTENTEXT: Record<PaletteRole, string> = {
  signal: 'Die Handlungsfarbe. Nur Knöpfe, Marker, echte Aufforderungen.',
  signalStrong: 'Eine Stufe dunkler — der gedrückte Zustand.',
  signalSoft: 'Die weiche Stufe. Trägt den Code-Untergrund auf einer Signalfolie.',
  signalDeep: 'Die dunkelste Stufe. Schattiert innerhalb einer Zeichnung, nie auf einer Fläche.',
  paper: 'Das Papier der Marke — der Untergrund „Creme" und die Flächenrolle „Papier".',
  paperAlt: 'Die zweite Papierstufe. Trägt den Code-Untergrund auf Weiß.',
  paperDeep: 'Die tiefste Papierstufe.',
  white: 'Das reine Weiß — der Untergrund „Weiß" und die Flächenrolle „Weiß".',
  ink: 'Die Tinte: Schrift, Kontur, Schatten und der Untergrund „Tinte".',
  ink900: 'Fast-Tinte, eine Stufe heller.',
  ink800: 'Trägt den Code-Untergrund auf einer Folie in Tinte.',
  ink700: 'Fast-Tinte, dritte Stufe.',
  ink600: 'Fast-Tinte, vierte Stufe.',
  warn: 'Achtung. Funktional, nie Dekoration.',
  danger: 'Fehler. Funktional, nie Dekoration.',
  info: 'Hinweis. Funktional, nie Dekoration.',
};

export const STUFENTEXT: Record<Sonderstufe, string> = {
  headline: 'Kampagnengröße — zwischen den beiden obersten Stufen der Leiter.',
  labelSmall: 'Fußzeile und Foliennummer — unterhalb der Leiter, weil eine Folie weitermuss.',
  codeInline: 'Code im Fließtext — knapp darunter, weil eine Monospace breiter baut.',
};

export const ZEICHENTEXT: Record<Zeichenwahl, string> = {
  nozilla: 'Der nozilla-Katalog, wie er ist (mit Signatur)',
  'ohne-signatur': 'Der Katalog ohne nozillas Signatur',
};

/** Die Rollen der Schriften, für die Anzeige. */
export const SCHRIFTTEXT: Record<FamilyRole, string> = {
  display: 'Auszeichnung',
  body: 'Fließtext',
  mono: 'Monospace',
};

/**
 * Was eine Stufe der Größenleiter trägt.
 *
 * Für das Sprachmodell aufgeschrieben, das sonst acht Zahlen ohne Anlass
 * setzen müsste. Die Leiter ist keine Reihe von Wünschen, sondern eine
 * Hierarchie: `xl4` ist der Folientitel, `sm` die Bildunterschrift.
 */
export const LEITERTEXT: Record<TextStepRole, string> = {
  xl4: 'Der Folientitel.',
  xl3: 'Die zweite Überschrift.',
  xl2: 'Die dritte Überschrift.',
  xl: 'Die vierte Überschrift, und die Zahl in einer Kennzahl.',
  lg: 'Großer Fließtext — der Aufhänger unter einem Titel.',
  base: 'Der Fließtext.',
  sm: 'Klein: Label, Bildunterschrift, Achsenbeschriftung.',
  xs: 'Das Kleinste, das noch gelesen werden soll.',
};

export const STRICHTEXT: Record<StrokeRole, string> = {
  hair: 'Trennlinie, Achse, Raster.',
  rule: 'Der Rahmen einer Fläche.',
  strong: 'Der Strich der Zeichen und der Rahmen einer betonten Fläche.',
  heavy: 'Der lauteste Strich — Auswahl, Unterstreichung.',
};

export const SCHATTENTEXT: Record<ShadowRole, string> = {
  none: 'Kein Schatten. Muss 0 sein, sonst hat „kein Schatten" einen.',
  sm: 'Der kleine harte Versatz.',
  md: 'Der mittlere — die Voreinstellung einer Karte.',
  lg: 'Der große, für das, was vorn liegt.',
};
