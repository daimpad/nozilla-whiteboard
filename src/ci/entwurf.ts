/**
 * Der Entwurf eines Erscheinungsbilds — das, was im Formular steht.
 *
 * Er ist absichtlich **kleiner als ein `BrandTheme`**. Ein Erscheinungsbild
 * belegt weit über hundert Werte; danach zu fragen wäre nicht gründlich,
 * sondern die Fehlerklasse, die dieses Projekt am häufigsten getroffen hat:
 * `colorsFromPalette()` und `tonesFromPalette()` rechnen neunundzwanzig
 * semantische Tokens und zweiunddreißig Tonwerte aus der Palette. Wer sie
 * erfragt, trifft achtundzwanzig und vergisst einen — und „fast richtig" ist
 * die schlechteste Lage, die es hier gibt.
 *
 * Gefragt wird deshalb nur nach dem, was ein Mensch entscheiden muss. Alles
 * andere rechnet `themeAusEntwurf()`.
 *
 * ## Und die Feldliste wird gelesen, nicht geschrieben
 *
 * Die Schlüssel kommen durchweg aus `nozillaTheme` (`Object.keys`). Eine
 * getippte Liste wäre eine zweite Wahrheit über die CI: käme morgen eine
 * Palettenrolle dazu, hätte das Formular sie nicht, und niemandem fiele es
 * auf — die erzeugte Datei übersetzte trotzdem, weil `Palette` ein `Record`
 * über dieselben Schlüssel ist und TypeScript nur die *fehlende* Rolle
 * bemerkt. Man sähe es also erst am Compiler des Nächsten.
 */
import {
  colorsFromPalette,
  nozillaTheme,
  readPaths,
  tonesFromPalette,
  wordmarkFromSvg,
  type BrandTheme,
  type FamilyRole,
  type PaletteRole,
  type ShadowRole,
  type StrokeRole,
  type TextStepRole,
  type TypeScale,
  type TypeStyle,
  type WebfontFace,
} from '@/theme';
import { nozillaIcons, withoutSignature } from '@/assets/iconSet';
import { kanaele } from '@/lib/contrast';

/* -------------------------------------------------------------------------- */
/* Die Rollen, gelesen                                                         */
/* -------------------------------------------------------------------------- */

export const paletteRollen = Object.keys(nozillaTheme.palette) as PaletteRole[];
export const textStufen = Object.keys(nozillaTheme.textScale) as TextStepRole[];
export const strichRollen = Object.keys(nozillaTheme.stroke) as StrokeRole[];
export const schattenRollen = Object.keys(nozillaTheme.shadowOffset) as ShadowRole[];
export const schriftRollen = Object.keys(nozillaTheme.fontFamily) as FamilyRole[];

/**
 * Die drei Größen, die auf keiner Stufe der Leiter sitzen.
 *
 * Sie stehen in `theme.config.ts` als nackte Zahl da, damit man sie von den
 * Marken-Stufen unterscheiden kann: die Kampagnengröße zwischen `xl3` und
 * `xl4`, die Fußzeilengröße unterhalb der Leiter, und `codeInline` knapp unter
 * dem Fließtext, weil eine Monospace breiter baut. Sie werden hier einzeln
 * gefragt und nicht aus der Leiter gerechnet — eine erfundene Umrechnungsregel
 * wäre schlechter als drei ehrliche Felder.
 */
export const sonderstufen = ['headline', 'labelSmall', 'codeInline'] as const;
export type Sonderstufe = (typeof sonderstufen)[number];

/** Welche PDF-Ersatzschriften jsPDF überhaupt kennt. */
export const pdfSchriften = ['helvetica', 'times', 'courier'] as const;
export type PdfSchrift = (typeof pdfSchriften)[number];

/**
 * Was mit den Zeichen geschieht.
 *
 * Ein Set **ersetzt**, es ergänzt nicht — wer zwölf eigene einträgt, hat
 * zwölf. Deshalb ist das eine Wahl und keine Voreinstellung. Die vierte
 * Möglichkeit, geliehener Katalog *plus* eigene Zeichen, ist die des
 * Musterkunden; sie braucht gezeichnete Geometrie und steht deshalb nicht im
 * Formular, sondern als Hinweis in der erzeugten Datei.
 */
export const zeichenwahl = ['nozilla', 'ohne-signatur'] as const;
export type Zeichenwahl = (typeof zeichenwahl)[number];

/* -------------------------------------------------------------------------- */
/* Der Entwurf                                                                 */
/* -------------------------------------------------------------------------- */

export interface Wortmarkenentwurf {
  /** Der Rohtext der SVG-Datei. */
  svg: string;
  /** Der Dateiname — er landet als `import` in der erzeugten Datei. */
  dateiname: string;
  /** Die Füllfarbe der Buchstaben, wie sie **in der Datei** steht. */
  letters: string;
  /** Die Füllfarbe des Akzents am Wortende. Leer heißt: die Marke hat keinen. */
  accent: string;
}

export interface CiEntwurf {
  id: string;
  label: string;
  markenname: string;
  produkt: string;
  palette: Record<PaletteRole, string>;
  textScale: Record<TextStepRole, number>;
  sonderstufen: Record<Sonderstufe, number>;
  /**
   * Wie viel enger die Auszeichnung läuft, in em.
   *
   * Der eine Regler, den ein Schriftwechsel wirklich braucht: eine Grotesk
   * verträgt in großen Graden mehr Enge als eine Slab-Serif. Zeilenhöhe,
   * Schriftschnitt und Versalien bleiben die der nozilla-Hierarchie — das ist
   * Struktur und keine Marke, und wer sie ändern muss, ändert sie in der
   * erzeugten Datei.
   */
  auszeichnungEnger: number;
  stroke: Record<StrokeRole, number>;
  shadowOffset: Record<ShadowRole, number>;
  fontFamily: Record<FamilyRole, string>;
  pdfFontFamily: Record<FamilyRole, PdfSchrift>;
  webfontFaces: Schnitt[];
  wortmarke: Wortmarkenentwurf | null;
  zeichen: Zeichenwahl;
}

/**
 * Ein Schnitt im Formular — mit einer Kennung, die nur dem Formular gehört.
 *
 * Der Grund ist ein Fehler, der die Seite an ihrer wichtigsten Stelle
 * unbedienbar machte: die Zeilen der Liste trugen als React-Schlüssel ihren
 * *eigenen Inhalt* (`${family}-${weight}-${style}`). Jeder Anschlag im Feld
 * „Familie" änderte damit den Schlüssel, React hängte die Zeile samt Eingabe
 * aus dem Baum und setzte eine neue ein — das Zeichen stand im Wert, der
 * Fokus auf dem Rumpf. Wer eine eigene Schrift eintragen wollte, kam pro Klick
 * genau ein Zeichen weit. Zwei frische Zeilen trugen zudem denselben
 * Schlüssel.
 *
 * `kennung` steht deshalb *neben* den Werten und wird nie mehr angefasst.
 * Dieselbe Linie wie bei den Elementen im Deck-Modell: die Kennung ist die
 * Identität, der Inhalt ist der Inhalt. In die erzeugte Datei geht sie nicht —
 * dort steht der Schnitt so, wie ihn `webfont.faces` verlangt.
 */
export interface Schnitt extends WebfontFace {
  kennung: string;
}

/**
 * Die nächste Kennung.
 *
 * Ein hochzählender Zähler und kein `crypto.randomUUID()`: er ist
 * reproduzierbar, und ein Test, der zweimal denselben Entwurf baut, bekommt
 * zweimal dasselbe. Für eine Kennung, die nie eine Datei sieht, reicht das.
 */
let letzteKennung = 0;
export function neueKennung(): string {
  letzteKennung += 1;
  return `s${letzteKennung}`;
}

/** Die Schnitte, die schon unter `public/fonts/` liegen. */
export function nozillaSchnitte(): Schnitt[] {
  return nozillaTheme.webfont.faces.map((face) => ({ ...face, kennung: neueKennung() }));
}

/** Eine leere Zeile für einen neuen Schnitt. */
export function leererSchnitt(): Schnitt {
  return { family: '', weight: 400, style: 'normal', file: '', kennung: neueKennung() };
}

/** Die Schnittstile, die ein `@font-face` kennt. */
export const schnittstile = ['normal', 'italic'] as const;
export type Schnittstil = (typeof schnittstile)[number];

/**
 * Ein leerer Entwurf — belegt mit der nozilla-CI.
 *
 * Nicht mit Platzhaltern, sondern mit echten Werten: wer ein Erscheinungsbild
 * anlegt, ändert die Hälfte davon und lässt den Rest stehen. Ein Formular, das
 * mit achtzehn leeren Farbfeldern anfängt, zwingt zu achtzehn Entscheidungen,
 * von denen fünfzehn keine sind.
 */
export function leererEntwurf(): CiEntwurf {
  return {
    id: '',
    label: '',
    markenname: '',
    produkt: '',
    palette: { ...nozillaTheme.palette },
    textScale: { ...nozillaTheme.textScale },
    sonderstufen: {
      headline: nozillaTheme.typeScale.headline.size,
      labelSmall: nozillaTheme.typeScale.labelSmall.size,
      codeInline: nozillaTheme.typeScale.codeInline.size,
    },
    auszeichnungEnger: 0,
    stroke: { ...nozillaTheme.stroke },
    shadowOffset: { ...nozillaTheme.shadowOffset },
    fontFamily: { ...nozillaTheme.fontFamily },
    pdfFontFamily: { ...nozillaTheme.pdfFontFamily } as Record<FamilyRole, PdfSchrift>,
    webfontFaces: nozillaSchnitte(),
    wortmarke: null,
    zeichen: 'nozilla',
  };
}

/* -------------------------------------------------------------------------- */
/* Ableiten                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Die drei Deckkraftstufen zu einer Farbe.
 *
 * Sie werden **gerechnet und nicht gefragt**. Die Schlüssel lügen dabei
 * doppelt, und genau deshalb steht die Rechnung an einer Stelle: Stufe `70`
 * trägt 0,72 bei der Tinte und 0,64 beim Papier, `50` trägt 0,50 bzw. 0,40,
 * `20` beide Male 0,18. Und `paperAlpha` gehört zum *Papier*, nicht zum Weiß —
 * es malt den gedämpften Text auf einer Folie in Tinte, und der soll denselben
 * Unterton haben wie der laute darüber. Genau dieser Fehler stand einmal in
 * der Vorlage.
 */
export function alphaStufen(hex: string, stufen: [number, number, number]) {
  const roh = kanaele(hex) ?? [0, 0, 0];
  const rgba = (deckkraft: number) =>
    `rgba(${roh[0]}, ${roh[1]}, ${roh[2]}, ${deckkraft.toFixed(2)})`;
  return { 70: rgba(stufen[0]), 50: rgba(stufen[1]), 20: rgba(stufen[2]) };
}

/** Die Deckkraftstufen der Tinte — 0,72 / 0,50 / 0,18. */
export const TINTE_STUFEN: [number, number, number] = [0.72, 0.5, 0.18];
/** Die des Papiers — 0,64 / 0,40 / 0,18. Nicht dieselben, und das mit Absicht. */
export const PAPIER_STUFEN: [number, number, number] = [0.64, 0.4, 0.18];

/**
 * Die Typo-Hierarchie aus der Leiter des Entwurfs.
 *
 * Die *Struktur* ist die von nozilla — welche Stufe welcher Schriftrolle
 * gehört, wie hoch die Zeile steht, welcher Schnitt, ob Versalien. Ersetzt
 * werden nur die Größen und die Laufweite der Auszeichnung.
 *
 * Zugeordnet wird über den **Wert**: jede nozilla-Größe wird in der
 * nozilla-Leiter gesucht, und steht sie dort, nimmt der Entwurf seinen Wert für
 * dieselbe Stufe. Das ist keine Bequemlichkeit — es ist der einzige Weg, der
 * ohne eine getippte Zuordnungstabelle auskommt, und eine solche Tabelle war
 * hier schon einmal eine eingefrorene CI.
 */
export function typeScaleAusEntwurf(entwurf: CiEntwurf): TypeScale {
  const stufeMitWert = new Map<number, TextStepRole>();
  for (const stufe of textStufen) stufeMitWert.set(nozillaTheme.textScale[stufe], stufe);

  const eintraege = Object.entries(nozillaTheme.typeScale).map(([name, stil]) => {
    const stufe = stufeMitWert.get(stil.size);
    const sondergroesse = (entwurf.sonderstufen as Record<string, number | undefined>)[name];
    const size = stufe ? entwurf.textScale[stufe] : (sondergroesse ?? stil.size);

    return [
      name,
      {
        ...stil,
        size,
        tracking:
          stil.family === 'display' ? stil.tracking - entwurf.auszeichnungEnger : stil.tracking,
      } satisfies TypeStyle,
    ];
  });

  return Object.fromEntries(eintraege) as TypeScale;
}

/**
 * Aus dem Entwurf ein `BrandTheme`.
 *
 * Wirft, wenn die Wortmarke fehlt oder nicht lesbar ist — sie ist Pflicht und
 * hat mit Absicht keine Voreinstellung: fehlte sie, trüge ein Deck unter fremder
 * Marke die von nozilla, und das wäre der auffälligste Fehler, den dieses Werkzeug
 * machen kann.
 */
export function themeAusEntwurf(entwurf: CiEntwurf): BrandTheme {
  if (!entwurf.wortmarke) throw new Error('Ohne Wortmarke gibt es kein Erscheinungsbild.');

  const palette = { ...entwurf.palette };
  const inkAlpha = alphaStufen(palette.ink, TINTE_STUFEN);
  const paperAlpha = alphaStufen(palette.paper, PAPIER_STUFEN);

  return {
    id: entwurf.id,
    label: entwurf.label,
    brand: {
      ...nozillaTheme.brand,
      name: entwurf.markenname,
      product: entwurf.produkt,
    },
    wordmark: wordmarkFromSvg(entwurf.wortmarke.svg, {
      letters: entwurf.wortmarke.letters,
      accent: entwurf.wortmarke.accent || undefined,
    }),
    icons: zeichensatz(entwurf.zeichen),
    palette,
    inkAlpha,
    paperAlpha,
    color: colorsFromPalette(palette, inkAlpha),
    elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),
    textScale: { ...entwurf.textScale },
    typeScale: typeScaleAusEntwurf(entwurf),
    fontFamily: { ...entwurf.fontFamily },
    webfont: {
      ...nozillaTheme.webfont,
      // Ohne die Kennung: sie gehört dem Formular und hat in einem
      // `@font-face` nichts verloren.
      faces: entwurf.webfontFaces.map(({ family, weight, style, file }) => ({
        family,
        weight,
        style,
        file,
      })),
    },
    pdfFontFamily: { ...entwurf.pdfFontFamily },
    stroke: { ...entwurf.stroke },
    shadowOffset: { ...entwurf.shadowOffset },
  };
}

/**
 * Die Schlüssel, nach denen der Prompt fragt — und die der Rücklauf liest.
 *
 * Sie standen dreimal getippt da: als Literale in `promptText()`, noch einmal
 * in `ERWARTET` und ein drittes Mal im Test. Drei Listen über dieselbe Sache
 * sind keine Redundanz, sondern eine Verabredung, an die sich niemand
 * erinnert: käme morgen ein Feld dazu und stünde es nur im Prompt, meldete der
 * Leser es als „Diese Felder kennt der Generator nicht" — das Modell hätte den
 * Prompt befolgt und würde dafür gerügt, und der Test bliebe grün, weil er die
 * dritte Liste prüft.
 *
 * Die Reihenfolge ist die, in der die Felder im Prompt stehen; er baut seinen
 * Rumpf daraus.
 */
export const promptSchluessel = [
  'id',
  'label',
  'markenname',
  'produkt',
  'palette',
  'fontFamily',
  'pdfFontFamily',
  'webfontFaces',
  'textScale',
  'sonderstufen',
  'auszeichnungEnger',
  'stroke',
  'shadowOffset',
] as const;

export type PromptSchluessel = (typeof promptSchluessel)[number];

/**
 * Aus einer SVG-Datei ein Wortmarken-Entwurf — samt Vorschlag für die beiden
 * Füllfarben.
 *
 * Die Farben werden **aus der Datei gelesen** und nicht geraten: das wäre der
 * Punkt, an dem der Generator anfängt, Werte zu erfinden. Gelesen wird dabei
 * mit `readPaths()`, also mit demselben Leser, den `wordmarkFromSvg()` benutzt.
 * Die vorige Fassung hatte einen eigenen Ausdruck, der nur `fill="…"` kannte —
 * eine Datei in einfachen Anführungszeichen kam mit zwei leeren Farbfeldern an,
 * und die Prüfliste beklagte eine Datei, die in Ordnung war.
 */
export function wortmarkeAusSvg(svg: string, dateiname: string): Wortmarkenentwurf {
  /*
     Vorgeschlagen wird nur, was wirklich malt. `none` ist eine Wahl und keine
     Farbe — als Buchstabenton vorgeschlagen ergäbe es einen Schriftzug aus
     Pfaden, die ausdrücklich nichts zeichnen. Und die leere Füllung ist die
     Lücke, die `pruefeWortmarke()` meldet; sie hier zum Ton zu machen hieße,
     eine Farbe zu erfinden, die niemand genannt hat.
  */
  const gefunden = [
    ...new Set(
      readPaths(svg)
        .map((pfad) => pfad.fill)
        .filter((fuellung) => fuellung && fuellung.toLowerCase() !== 'none'),
    ),
  ];
  return { svg, dateiname, letters: gefunden[0] ?? '', accent: gefunden[1] ?? '' };
}

/**
 * Was die Vorschau zeigt — der frische Stand oder der letzte, der trug.
 *
 * Eine reine Funktion und keine drei Zeilen in der Komponente, weil der Fehler,
 * gegen den sie steht, für `tsc`, ESLint und vitest **unsichtbar** ist. Die
 * Gegenprobe hat es vorgeführt: `const theme = frisch;` lässt den Merker
 * beschrieben und ungelesen, `const veraltet = false && …` bleibt ein gültiger
 * `boolean` und wird weiter benutzt — kein ungenutzter Import, kein Diff bei
 * Prettier, und eine Sabotage, die **baut**. Der einzige Zeuge war der
 * Rauchtest, und ein einziger Zeuge ist in diesem Projekt schon zweimal zu
 * wenig gewesen.
 *
 * Das eine, was nicht passieren darf, ist ein alter Stand, der sich für den
 * aktuellen ausgibt — deshalb kommt `veraltet` aus derselben Rechnung und
 * nicht aus einer zweiten daneben.
 */
export function vorschaustand<T>(
  frisch: T | null,
  letzter: T | null,
): { stand: T | null; veraltet: boolean } {
  if (frisch !== null) return { stand: frisch, veraltet: false };
  return { stand: letzter, veraltet: letzter !== null };
}

/**
 * Das Erscheinungsbild, mit dem die *Vorschau* zeichnet.
 *
 * Es unterscheidet sich von `themeAusEntwurf()` an genau einer Stelle: fehlt
 * die Wortmarke, setzt es einen sichtbaren Platzhalter ein, statt zu werfen.
 *
 * Der Grund ist der Wizard. Die Wortmarke ist die einzige Angabe, für die man
 * eine Datei suchen muss, und sie steht deshalb spät — wer den Generator zum
 * ersten Mal öffnet, hat sie nicht bereitliegen. Ohne den Platzhalter wären
 * fünf von acht Schritten ohne Bild, und ausgerechnet der Schritt „Farbe" wäre
 * blind: die sechs fest verdrahteten Lesepaare sind auf der Probefolie zu
 * sehen und sonst nirgends.
 *
 * Und die Grenze, ohne die daraus ein stiller Ersatz würde: `themeAusEntwurf()`
 * **wirft weiter**, der Fehler bleibt in der Prüfliste, der Knopf „Designdatei"
 * bleibt gesperrt, und die Vorschau schreibt daneben, dass sie einen
 * Platzhalter zeigt. Er ist ein Bild und keine Zusage.
 */
export function vorschauTheme(entwurf: CiEntwurf): BrandTheme {
  if (entwurf.wortmarke) return themeAusEntwurf(entwurf);
  return themeAusEntwurf({ ...entwurf, wortmarke: PLATZHALTER_WORTMARKE });
}

/**
 * Ein Schriftzug, der wie einer aussieht und keiner ist.
 *
 * Zwei Pfade in zwei Füllfarben, damit die Zuordnung über die Farbe dasselbe
 * tut wie bei einer echten Datei: ein Balken als Wortkörper und ein Quadrat als
 * Akzent am Wortende. Die Farben sind erfunden — sie stehen nur *in dieser
 * Datei* und werden von `wordmarkFromSvg` gegen die Pfade gehalten; auf der
 * Folie malt die Marke ohnehin in Tinte und Signal.
 */
const PLATZHALTER_WORTMARKE: Wortmarkenentwurf = {
  svg: [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">',
    '<path fill="#111111" d="M0 14 H24 V34 H0 Z M32 14 H56 V34 H32 Z M64 14 H88 V34 H64 Z',
    ' M96 14 H120 V34 H96 Z M128 14 H152 V34 H128 Z"/>',
    '<path fill="#E4003A" d="M164 26 H176 V38 H164 Z"/>',
    '</svg>',
  ].join(''),
  dateiname: '(Platzhalter)',
  letters: '#111111',
  accent: '#E4003A',
};

/**
 * Der Zeichensatz zur getroffenen Wahl.
 *
 * „Ohne Signatur" nimmt den 6 × 6 großen Punkt unten rechts heraus. Er ist
 * nozillas Erkennungszeichen und keine Eigenschaft des Dialekts — er nähme die
 * Signalfarbe der neuen Marke an und setzte trotzdem eine fremde Handschrift auf
 * jede Folie.
 */
export function zeichensatz(wahl: Zeichenwahl) {
  if (wahl === 'nozilla') return nozillaIcons;
  return {
    categories: [...nozillaIcons.categories],
    icons: Object.fromEntries(
      Object.entries(nozillaIcons.icons).map(([name, icon]) => [
        name,
        { ...icon, prims: withoutSignature(icon.prims) },
      ]),
    ),
  };
}
