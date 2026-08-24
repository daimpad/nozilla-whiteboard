/**
 * Was ein Erscheinungsbild ausmacht — und was nicht.
 *
 * Dieses Werkzeug hat lange genau eine CI gekannt, und `theme.config.ts` war
 * sie. Diese Datei zieht die Grenze zwischen dem, was von Kunde zu Kunde
 * verschieden sein darf, und dem, was das Werkzeug ausmacht.
 *
 * ## Was sich ändern darf
 *
 * Farben, Typo-Leiter, Schriften, Strichstärken, Schattenversätze, die Marke
 * selbst. Alles Werte. Ein Erscheinungsbild ist eine Belegung dieser Rollen,
 * kein neues Regelwerk.
 *
 * ## Was bleibt
 *
 * Der Radius ist 0, und Formen nehmen keinen entgegen. Ein Schatten ist eine
 * versetzte Fläche, das Szenen-Modell kennt keinen Weichzeichner. Die
 * Foliengröße ist 1280 × 720, weil jedes Layout dagegen gerechnet ist. Der
 * Icon-Dialekt ist 64 × 64 bei 4 px — die *Zeichen* wechseln mit dem
 * Erscheinungsbild, das Raster nicht.
 *
 * Das ist keine Bequemlichkeit, sondern der Kern: **dieses Werkzeug kann nur
 * konformes Material herstellen.** Wer runde Ecken zulässt, gibt genau die
 * Garantie auf, für die es gebaut wurde. Wenn ein Kunde das braucht, ist das
 * eine Entscheidung und kein Konfigurationswert — sie gehört besprochen, nicht
 * eingestellt.
 *
 * ## Die Rollen sind vollständig zu belegen
 *
 * Die Typen unten sind `Record`s über die Schlüssel der nozilla-CI. Ein
 * Erscheinungsbild, dem ein Ton fehlt, übersetzt nicht — und das ist Absicht:
 * eine halb belegte Palette fällt sonst erst auf, wenn jemand die eine Folie
 * baut, die den fehlenden Ton benutzt.
 */
import { nozillaIcons, type IconSet } from '@/assets/iconSet';
import { wordmark as nzWordmark } from '@/assets/wordmark.generated';
import type { Wordmark } from './wordmark';
import {
  brand as nzBrand,
  inkAlpha as nzInkAlpha,
  paperAlpha as nzPaperAlpha,
  color as nzColor,
  elementTones as nzTones,
  fontFamily as nzFontFamily,
  palette as nzPalette,
  pdfFontFamily as nzPdfFontFamily,
  shadowOffset as nzShadowOffset,
  stroke as nzStroke,
  textScale as nzTextScale,
  typeScale as nzTypeScale,
  webfont as nzWebfont,
} from '@theme';

/* -------------------------------------------------------------------------- */
/* Die Rollen                                                                  */
/* -------------------------------------------------------------------------- */

export type PaletteRole = keyof typeof nzPalette;
export type ColorRole = keyof typeof nzColor;
export type ToneRole = keyof typeof nzTones;
export type TypeStyleRole = keyof typeof nzTypeScale;
export type TextStepRole = keyof typeof nzTextScale;
export type FamilyRole = keyof typeof nzFontFamily;
export type StrokeRole = keyof typeof nzStroke;
export type ShadowRole = keyof typeof nzShadowOffset;

export type Palette = Record<PaletteRole, string>;
/** Tinte und Papier mit Deckkraft. Ein Erscheinungsbild mit anderem Papier
 *  braucht andere Werte — deshalb gehören sie ihm und nicht der Konfiguration. */
export type AlphaSteps = Record<keyof typeof nzInkAlpha, string>;
export type ColorTokens = Record<ColorRole, string>;
export type TextScale = Record<TextStepRole, number>;
export type FontFamilies = Record<FamilyRole, string>;
export type PdfFontFamilies = Record<FamilyRole, string>;
export type StrokeWidths = Record<StrokeRole, number>;
export type ShadowOffsets = Record<ShadowRole, number>;

/** Eine Flächenrolle: was ein Element annimmt, wenn es diesen Ton trägt. */
export interface ElementTone {
  label: string;
  hint: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  text: string;
  textMuted: string;
  accent: string;
}
export type ElementTones = Record<ToneRole, ElementTone>;

/**
 * Eine Stufe der Typo-Hierarchie.
 *
 * `family` bleibt die enge Auswahl aus drei Rollen und wird nicht zu `string`
 * geweitet: der Setzer schlägt sie in `fontFamily` nach, ein freier Name
 * fände dort nichts.
 */
export interface TypeStyle {
  size: number;
  lineHeight: number;
  weight: number;
  tracking: number;
  family: FamilyRole;
  caps: boolean;
}
export type TypeScale = Record<TypeStyleRole, TypeStyle>;

export interface WebfontFace {
  family: string;
  weight: number;
  style: string;
  file: string;
}

/** Die selbst gehosteten Schnitte. Ohne sie misst der Setzer die Ersatzschrift. */
export interface Webfont {
  enabled: boolean;
  /** Verzeichnis unter `public/`. */
  directory: string;
  format: string;
  faces: WebfontFace[];
}

export interface BrandInfo {
  name: string;
  product: string;
  motto: string;
  contact: string;
  /** Wo die CI dieses Kunden steht. */
  ci: string;
  wordmark: { light: string; dark: string; mono: string };
  favicon: string;
  socialPreview: string;
}

/* -------------------------------------------------------------------------- */
/* Das Erscheinungsbild                                                        */
/* -------------------------------------------------------------------------- */

export interface BrandTheme {
  /** Schlüssel im Verzeichnis und im Deck-Frontmatter. Kleinschrift, ohne Leerzeichen. */
  id: string;
  /** Was in der Auswahl steht. */
  label: string;
  brand: BrandInfo;
  /**
   * Die Wortmarke als Pfad. Pflicht, und mit Absicht keine Voreinstellung:
   * fehlte sie, zeichnete ein Kundendeck die Marke von nozilla — der
   * auffälligste Fehler, den dieses Werkzeug machen könnte.
   */
  wordmark: Wordmark;
  /**
   * Die Piktogramme. Ohne Angabe gilt das nozilla-Set.
   *
   * Anders als die Wortmarke ist das keine Falle: ein Pfeil, ein Schloss, ein
   * Zahnrad gehören keiner Marke, und ein Erscheinungsbild ohne eigenes Set
   * wäre mit einer leeren Bibliothek schlechter bedient als mit einer
   * fremden. Was mitkommt, ist die 6 × 6 große Signatur unten rechts — sie ist
   * eine Erfindung des nozilla-Sets, nimmt aber die Signalfarbe des gewählten
   * Erscheinungsbilds an. Wer sie nicht will, bringt ein eigenes Set mit.
   *
   * Ein Set *ersetzt*, es ergänzt nicht. Wer die 554 nozilla-Zeichen behalten
   * und eigene dazulegen will, schreibt das hin — siehe `src/themes/index.ts`.
   * Stilles Zusammenlegen hieße, dass ein Kundendeck fremde Zeichen anbietet,
   * ohne dass jemand das entschieden hat.
   */
  icons?: IconSet;
  palette: Palette;
  inkAlpha: AlphaSteps;
  paperAlpha: AlphaSteps;
  color: ColorTokens;
  elementTones: ElementTones;
  textScale: TextScale;
  typeScale: TypeScale;
  fontFamily: FontFamilies;
  webfont: Webfont;
  pdfFontFamily: PdfFontFamilies;
  stroke: StrokeWidths;
  shadowOffset: ShadowOffsets;
}

/**
 * Die nozilla-CI, unverändert aus `theme.config.ts`.
 *
 * Die Werte stehen weiterhin dort und nicht hier, weil `tailwind.config.ts`
 * sie zur Bauzeit liest. Dieses Erscheinungsbild ist deshalb kein zweiter Satz
 * Zahlen, sondern derselbe unter einem Namen.
 */
export const nozillaTheme: BrandTheme = {
  id: 'nozilla',
  label: 'nozilla',
  brand: nzBrand,
  wordmark: nzWordmark,
  icons: nozillaIcons,
  palette: nzPalette,
  inkAlpha: nzInkAlpha,
  paperAlpha: nzPaperAlpha,
  color: nzColor,
  elementTones: nzTones,
  textScale: nzTextScale,
  typeScale: nzTypeScale,
  fontFamily: nzFontFamily,
  webfont: { ...nzWebfont, faces: [...nzWebfont.faces] },
  pdfFontFamily: nzPdfFontFamily,
  stroke: nzStroke,
  shadowOffset: nzShadowOffset,
};

/* -------------------------------------------------------------------------- */
/* Anlegen                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Die semantischen Tokens aus einer Palette mischen.
 *
 * `color` führt fünfundzwanzig Schlüssel, und zwanzig davon sind bloß eine
 * Palettenfarbe unter einem Namen, der ihre Aufgabe nennt. Wer sie von Hand
 * schreibt, trifft neunzehn und vergisst einen — und das Ergebnis ist die
 * schlechteste Lage, die dieses Projekt kennt: fast richtig. Deshalb dieselbe
 * Vorgehensweise wie bei den Tonrollen, und derselbe Test hält sie an
 * `theme.config.ts`.
 *
 * Nicht abgeleitet wird, was keiner Marke gehört: die Hintergründe der
 * Statusfarben. Sie sind Wäschen von Warn-, Fehler- und Hinweisfarbe, und die
 * sind funktional — ein Kunde darf sie ändern, muss aber nicht.
 */
export function colorsFromPalette(palette: Palette, inkAlpha: AlphaSteps): ColorTokens {
  return {
    canvas: palette.paperDeep,
    surface: palette.paper,
    surfaceAlt: palette.paperAlt,
    surfaceRaised: palette.white,
    surfaceInverse: palette.ink,
    overlay: withAlpha(palette.ink, 0.62),

    ink: palette.ink,
    inkMuted: inkAlpha[70],
    inkSubtle: inkAlpha[50],
    inkInverse: palette.paper,
    inkOnSignal: palette.ink,

    line: palette.ink,
    lineSoft: inkAlpha[20],
    grid: inkAlpha[20],
    gridStrong: inkAlpha[50],

    signal: palette.signal,
    signalStrong: palette.signalStrong,
    signalSoft: palette.signalSoft,
    signalDeep: palette.signalDeep,

    warn: palette.warn,
    warnBg: nzColor.warnBg,
    danger: palette.danger,
    dangerBg: nzColor.dangerBg,
    info: palette.info,
    infoBg: nzColor.infoBg,

    focus: palette.signalStrong,
    selection: palette.ink,
    selectionWash: withAlpha(palette.signal, 0.22),
    snapGuide: palette.signal,
  };
}

/**
 * Eine Palettenfarbe mit Deckkraft. Nur `#RRGGBB` — eine Palette führt
 * Vollfarben, die Abstufungen stehen in `inkAlpha` und `paperAlpha`.
 */
function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Kein #RRGGBB: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Die Farbrollen aus einer Palette mischen.
 *
 * Wer ein Erscheinungsbild anlegt, soll Farben *einmal* nennen. Diese Funktion
 * setzt daraus die vier Tonrollen zusammen, und zwar nach demselben Muster wie
 * die nozilla-CI: Papier trägt Tinte, Signal trägt Tinte, Tinte trägt Papier
 * und setzt den Akzent auf Signal.
 *
 * `brandTheme.test.ts` hält sie an die Vorlage: was hier herauskommt, muss für
 * die nozilla-Palette genau deren Töne ergeben. Laufen die beiden auseinander,
 * schlägt der Test an — sonst wäre diese Funktion eine zweite Wahrheit.
 */
export function tonesFromPalette(
  palette: Palette,
  inkAlpha: AlphaSteps,
  paperAlpha: AlphaSteps,
  labels: Record<ToneRole, { label: string; hint: string }> = toneLabels,
): ElementTones {
  return {
    paper: {
      ...labels.paper,
      surface: palette.paper,
      surfaceAlt: palette.paperAlt,
      line: palette.ink,
      text: palette.ink,
      textMuted: inkAlpha[70],
      accent: palette.ink,
    },
    white: {
      ...labels.white,
      surface: palette.white,
      surfaceAlt: palette.white,
      line: palette.ink,
      text: palette.ink,
      textMuted: inkAlpha[70],
      accent: palette.ink,
    },
    signal: {
      ...labels.signal,
      surface: palette.signal,
      surfaceAlt: palette.signalSoft,
      line: palette.ink,
      text: palette.ink,
      textMuted: inkAlpha[70],
      accent: palette.ink,
    },
    ink: {
      ...labels.ink,
      surface: palette.ink,
      surfaceAlt: palette.ink800,
      line: palette.paper,
      text: palette.paper,
      textMuted: paperAlpha[70],
      accent: palette.signal,
    },
  };
}

/** Die Beschriftungen der vier Rollen. Ein Kunde darf sie anders nennen. */
export const toneLabels: Record<ToneRole, { label: string; hint: string }> = {
  paper: { label: nzTones.paper.label, hint: nzTones.paper.hint },
  white: { label: nzTones.white.label, hint: nzTones.white.hint },
  signal: { label: nzTones.signal.label, hint: nzTones.signal.hint },
  ink: { label: nzTones.ink.label, hint: nzTones.ink.hint },
};

/* -------------------------------------------------------------------------- */
/* Prüfung                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sind die Farbrollen aus der eigenen Palette gemischt?
 *
 * Das ist die eine Falle, die beim Anlegen eines Erscheinungsbilds zuschnappt.
 * `palette` und `elementTones` sind zwei Objekte, und wer die Palette ändert
 * und die Töne vergisst, bekommt eine Folie, die fast stimmt: Fließtext und
 * Untergrund folgen, aber jede Karte und jedes Abzeichen trägt weiter die
 * Farbe des Erscheinungsbilds, von dem abgeschrieben wurde.
 *
 * „Fast richtig" ist hier die schlechteste Lage — es fällt erst der Kundin
 * auf. Deshalb prüft `registerTheme()` das und nimmt ein Erscheinungsbild
 * nicht an, das seine eigene Palette verlässt.
 *
 * Geprüft werden nur die Töne. `color` führt bewusst ein paar Werte, die
 * keiner Marke gehören — der Schleier über einem Dialog, die Hintergründe der
 * Statusfarben.
 */
export function tonesOutsidePalette(theme: BrandTheme): string[] {
  const own = new Set<string>([
    ...Object.values(theme.palette),
    ...Object.values(theme.inkAlpha),
    ...Object.values(theme.paperAlpha),
  ]);

  const strays: string[] = [];
  for (const [name, tone] of Object.entries(theme.elementTones)) {
    for (const [role, value] of Object.entries(tone)) {
      if (role === 'label' || role === 'hint') continue;
      if (!own.has(value)) strays.push(`${name}.${role} = ${value}`);
    }
  }
  return strays;
}
