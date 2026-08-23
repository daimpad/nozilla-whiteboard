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
 * Icon-Dialekt ist 64 × 64 bei 4 px.
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
 * Die Farbrollen aus einer Palette mischen.
 *
 * Wer ein Erscheinungsbild anlegt, soll Farben *einmal* nennen. Diese Funktion
 * setzt daraus die drei Tonrollen zusammen, und zwar nach demselben Muster wie
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

/** Die Beschriftungen der drei Rollen. Ein Kunde darf sie anders nennen. */
export const toneLabels: Record<ToneRole, { label: string; hint: string }> = {
  paper: { label: nzTones.paper.label, hint: nzTones.paper.hint },
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
