/**
 * Musterkunde — das Erscheinungsbild, an dem man sieht, dass es geht.
 *
 * Kein echter Auftrag, sondern die Vorlage: eine Datei, die jede wechselbare
 * Rolle einmal belegt, damit die nächste Kundendatei nur noch andere Werte
 * eintragen muss. Sie steht mit im Werkzeug, weil eine Vorlage, die niemand
 * laufen sieht, nach dem zweiten Umbau nicht mehr stimmt.
 *
 * Erfunden ist die Firma dahinter auch: ein Haus für Muster und Proben. Das
 * ist kein Scherz, sondern Absicht — ein Erscheinungsbild ohne Gegenstand
 * verleitet dazu, Zeichen zu zeichnen, die nichts bedeuten.
 *
 * ## Was hier anders ist als bei nozilla
 *
 * | Rolle          | nozilla                     | Musterkunde                 |
 * | -------------- | --------------------------- | --------------------------- |
 * | Signal         | Grün `#00FF9C`              | Orange `#FF5A1F`            |
 * | Papier         | Creme `#FFFEE5`             | Weiß, warmes Grau daneben   |
 * | Tinte          | Reines Schwarz              | Warmes Schwarz `#1A1614`    |
 * | Auszeichnung   | Zilla Slab (Slab-Serif)     | Inter (Grotesk), 10 % kleiner|
 * | Wortmarke      | Schriftzug mit grünem Punkt | Schriftzug mit orangem Block|
 * | Icons          | 554 Zeichen, Katalog + Kern | 12 eigene und der Katalog   |
 *
 * ## Was hier *nicht* anders ist
 *
 * Radius 0, harte Versatzschatten, 1280 × 720, das 64er-Raster der Icons, die
 * vier Tonrollen. Das ist keine Nachlässigkeit — es ist die Grenze, die
 * `theme/brandTheme.ts` zieht. Wer sie verschieben will, verschiebt sie nicht
 * in einer Kundendatei.
 */
import {
  colorsFromPalette,
  nozillaIcons,
  nozillaTheme,
  tonesFromPalette,
  wordmarkFromSvg,
  type BrandTheme,
  type IconSet,
  type TypeScale,
  type TypeStyle,
} from '@/theme';
import { withoutSignature, type IconDef } from '@/assets/icons';
import wortmarke from './musterkunde-wortmarke.svg?raw';

/* -------------------------------------------------------------------------- */
/* Farbe                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Die Palette. Einmal genannt — Tonrollen und semantische Tokens werden daraus
 * gemischt, damit keine Farbe an zwei Stellen steht.
 *
 * `warn`, `danger` und `info` bleiben, wie sie sind: sie sagen „Achtung",
 * „Fehler", „Hinweis" und gehören keiner Marke. Nur das Orange von `warn`
 * musste weichen — es stand dem neuen Signal zu nah, und zwei Farben, die
 * fast dasselbe sind, sind schlimmer als eine.
 */
const palette = {
  signal: '#FF5A1F',
  signalStrong: '#EE4708',
  signalSoft: '#FFDCCB',
  signalDeep: '#B23405',

  paper: '#FFFFFF',
  paperAlt: '#F6F3F0',
  paperDeep: '#EDE8E3',
  white: '#FFFFFF',

  ink: '#1A1614',
  ink900: '#241F1C',
  ink800: '#2F2926',
  ink700: '#3C3531',
  ink600: '#4C443E',

  warn: '#B45309',
  danger: nozillaTheme.palette.danger,
  info: nozillaTheme.palette.info,
};

/** Tinte und Papier mit Deckkraft — die Werte gehören zu *dieser* Palette. */
const inkAlpha = {
  70: 'rgba(26, 22, 20, 0.72)',
  50: 'rgba(26, 22, 20, 0.50)',
  20: 'rgba(26, 22, 20, 0.18)',
};
const paperAlpha = {
  70: 'rgba(255, 255, 255, 0.64)',
  50: 'rgba(255, 255, 255, 0.40)',
  20: 'rgba(255, 255, 255, 0.18)',
};

/* -------------------------------------------------------------------------- */
/* Die Zeichen                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Zwölf eigene Zeichen im Dialekt des Werkzeugs: 64 × 64, 4 px, square caps,
 * miter joins.
 *
 * Was sie *nicht* tragen, ist der Punkt unten rechts — der ist die Signatur
 * des nozilla-Sets und keine Eigenschaft des Dialekts.
 */
const eigeneZeichen: Record<string, IconDef> = {
  raster: {
    label: 'Raster',
    meaning: 'Rapport, Wiederholung, Ordnung',
    category: 'muster',
    prims: [
      { t: 'rect', x: 10, y: 10, w: 44, h: 44 },
      { t: 'path', d: 'M10 24 L54 24' },
      { t: 'path', d: 'M10 40 L54 40' },
      { t: 'path', d: 'M24 10 L24 54' },
      { t: 'path', d: 'M40 10 L40 54' },
    ],
  },
  probe: {
    label: 'Probe',
    meaning: 'Musterkarte, Vorlage, Abzug',
    category: 'muster',
    prims: [
      { t: 'path', d: 'M12 10 L40 10 L54 24 L54 54 L12 54 Z' },
      { t: 'path', d: 'M40 10 L40 24 L54 24' },
    ],
  },
  naht: {
    label: 'Naht',
    meaning: 'Verbindung, Kante, Steppung',
    category: 'muster',
    prims: [
      { t: 'path', d: 'M8 24 L56 24', dash: [8, 6] },
      { t: 'path', d: 'M8 40 L56 40', dash: [8, 6] },
    ],
  },
  schnitt: {
    label: 'Schnitt',
    meaning: 'Entwurf, Kontur, Vorlage',
    category: 'muster',
    prims: [
      { t: 'path', d: 'M12 52 C 12 22, 28 12, 52 12' },
      { t: 'path', d: 'M12 52 L52 12', dash: [6, 6] },
      { t: 'circle', cx: 12, cy: 52, r: 4, fill: 'ink' },
      { t: 'circle', cx: 52, cy: 12, r: 4, fill: 'ink' },
    ],
  },

  schere: {
    label: 'Schere',
    meaning: 'Zuschnitt, trennen, kürzen',
    category: 'werkstatt',
    prims: [
      { t: 'path', d: 'M14 46 L48 12' },
      { t: 'path', d: 'M50 46 L16 12' },
      { t: 'circle', cx: 18, cy: 50, r: 6 },
      { t: 'circle', cx: 46, cy: 50, r: 6 },
    ],
  },
  massband: {
    label: 'Maßband',
    meaning: 'Maß, Prüfung, Genauigkeit',
    category: 'werkstatt',
    prims: [
      { t: 'rect', x: 8, y: 22, w: 48, h: 20 },
      { t: 'path', d: 'M18 22 L18 32' },
      { t: 'path', d: 'M28 22 L28 32' },
      { t: 'path', d: 'M38 22 L38 32' },
      { t: 'path', d: 'M48 22 L48 32' },
    ],
  },
  stempel: {
    label: 'Stempel',
    meaning: 'Abnahme, Freigabe, Herkunft',
    category: 'werkstatt',
    prims: [
      { t: 'path', d: 'M22 10 L42 10 L42 26 L52 36 L52 44 L12 44 L12 36 L22 26 Z' },
      { t: 'path', d: 'M10 54 L54 54' },
    ],
  },
  karton: {
    label: 'Karton',
    meaning: 'Versand, Lieferung, Los',
    category: 'werkstatt',
    prims: [
      { t: 'path', d: 'M32 8 L56 20 L56 44 L32 56 L8 44 L8 20 Z' },
      { t: 'path', d: 'M8 20 L32 32 L56 20' },
      { t: 'path', d: 'M32 32 L32 56' },
    ],
  },

  farbfeld: {
    label: 'Farbfeld',
    meaning: 'Ton, Auswahl, Abstimmung',
    category: 'prüfung',
    prims: [
      { t: 'rect', x: 8, y: 20, w: 14, h: 24 },
      { t: 'rect', x: 25, y: 20, w: 14, h: 24, fill: 'signal' },
      { t: 'rect', x: 42, y: 20, w: 14, h: 24 },
    ],
  },
  lupe: {
    label: 'Lupe',
    meaning: 'Prüfen, nachsehen, Detail',
    category: 'prüfung',
    prims: [
      { t: 'circle', cx: 28, cy: 28, r: 16 },
      { t: 'path', d: 'M40 40 L54 54' },
    ],
  },
  freigabe: {
    label: 'Freigabe',
    meaning: 'Abgenommen, fertig, richtig',
    category: 'prüfung',
    prims: [{ t: 'path', d: 'M12 34 L26 48 L52 16' }],
  },
  ruecklauf: {
    label: 'Rücklauf',
    meaning: 'Nacharbeit, zurück, Schleife',
    category: 'prüfung',
    prims: [
      { t: 'path', d: 'M54 32 A 22 22 0 1 1 32 10' },
      { t: 'path', d: 'M20 14 L32 10 L36 22' },
    ],
  },
};

/**
 * Das Set: die eigenen Zeichen zuerst, danach der geliehene Katalog.
 *
 * **Warum leihen und nicht ersetzen.** Ein Set ersetzt, es ergänzt nicht — wer
 * nur die zwölf einträgt, hat zwölf. Für einen Kunden, der sein Repertoire eng
 * führt, ist genau das richtig. Dieser hier führt es nicht eng: ein Pfeil, ein
 * Schloss, ein Zahnrad gehören keiner Marke, und ein Deck, das ein Zahnrad
 * braucht, soll nicht an der Bibliothek scheitern.
 *
 * **Warum ohne Signatur.** Der 6 × 6 große Punkt unten rechts ist nozillas
 * Erkennungszeichen, nicht Teil des Dialekts. Er würde die Signalfarbe dieses
 * Kunden annehmen und trotzdem eine fremde Handschrift auf jede Folie setzen.
 * `withoutSignature()` nimmt ihn heraus — dieselbe Funktion, mit der die
 * Oberfläche ihn aus kleinen Knöpfen nimmt.
 *
 * Wer das *nicht* will, schreibt `nozillaIcons.icons` direkt hin. Beides ist
 * eine Entscheidung; still zusammenzulegen wäre keine.
 */
const geliehen: Record<string, IconDef> = Object.fromEntries(
  Object.entries(nozillaIcons.icons).map(([name, icon]) => [
    name,
    { ...icon, prims: withoutSignature(icon.prims) },
  ]),
);

const icons: IconSet = {
  // Die eigenen Rubriken stehen oben: wer ein Zeichen sucht, soll zuerst die
  // sehen, die für diesen Kunden gezeichnet wurden.
  categories: ['muster', 'werkstatt', 'prüfung', ...nozillaIcons.categories],
  icons: { ...geliehen, ...eigeneZeichen },
};

/* -------------------------------------------------------------------------- */
/* Schrift                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Inter läuft bei gleicher Größe rund zehn Prozent breiter als Zilla Slab —
 * gemessen, nicht geschätzt: „Die CI-Bibliothek, unverändert" ist bei 68 px in
 * der Slab 879 px breit und in der Grotesk 965 px.
 *
 * Deshalb steht hier eine eigene Leiter. Das ist keine Anpassung an eine
 * bestimmte Folie, sondern das, was jede Marke beim Wechsel der Schrift tut:
 * eine Grotesk verträgt in großen Graden mehr Enge und weniger Grad als eine
 * Slab-Serif, sonst wird die Zeile lang und der Satz laut.
 *
 * Wer eine Marke wechselt, sollte trotzdem hinsehen: **frei platzierter Text
 * fließt nicht nach.** Ein Element hat eine Breite, und wenn die Schrift breiter
 * läuft, bricht die Zeile um und der Kasten wächst nicht mit. Fließender
 * Markdown-Text passt sich an, ein von Hand gelegter Titel nicht.
 */
const DISPLAY = 0.9;
const textScale = {
  ...nozillaTheme.textScale,
  xl: Math.round(nozillaTheme.textScale.xl * DISPLAY),
  xl2: Math.round(nozillaTheme.textScale.xl2 * DISPLAY),
  xl3: Math.round(nozillaTheme.textScale.xl3 * DISPLAY),
  xl4: Math.round(nozillaTheme.textScale.xl4 * DISPLAY),
};

/** Die Stufen der Leiter, auf denen die Auszeichnungsschrift sitzt. */
const displaySteps: Record<string, number> = {
  display: textScale.xl4,
  headline: Math.round(88 * DISPLAY),
  h1: textScale.xl3,
  h2: textScale.xl2,
  h3: textScale.xl,
  h4: textScale.lg,
};

const typeScale = Object.fromEntries(
  Object.entries(nozillaTheme.typeScale).map(([name, style]) => [
    name,
    style.family === 'display'
      ? ({
          ...style,
          size: displaySteps[name] ?? style.size,
          // Eine Grotesk in großen Graden verträgt — und braucht — mehr Enge.
          tracking: style.tracking - 0.01,
        } satisfies TypeStyle)
      : style,
  ]),
) as TypeScale;

/* -------------------------------------------------------------------------- */
/* Das Erscheinungsbild                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Die Schriften bringt dieser Kunde nicht selbst mit — er setzt in Inter und
 * Space Mono, und beide liegen ohnehin unter `public/fonts/`. Zilla Slab
 * kommt deshalb aus `webfont.faces` heraus: neun Schnitte anzufordern, von
 * denen drei nie gezeichnet werden, kostet Bytes und Ladezeit für nichts.
 *
 * Ein Kunde mit eigenen Schnitten legt sie daneben und trägt sie hier ein;
 * `installWebfonts()` tauscht die `@font-face`-Regeln beim Wechsel aus.
 */
const faces = nozillaTheme.webfont.faces.filter((face) => face.family !== 'Zilla Slab');

export const musterkunde: BrandTheme = {
  id: 'musterkunde',
  label: 'Musterkunde',

  brand: {
    name: 'muster',
    product: 'muster Whiteboard',
    motto: 'Erst die Probe, dann die Auflage.',
    contact: 'hallo@muster.example',
    ci: 'https://example.com/muster/ci',
    wordmark: {
      light: '/brand/muster-logo.svg',
      dark: '/brand/muster-logo-invers.svg',
      mono: '/brand/muster-logo-mono.svg',
    },
    favicon: '/brand/favicon.svg',
    socialPreview: '/brand/og-image.png',
  },

  /**
   * Aus der SVG-Datei gelesen, nicht als Bild eingebunden: nur so landet die
   * Marke in SVG *und* PDF als echter Vektor und nimmt die Tinte der Fläche
   * an, auf der sie sitzt. Zugeordnet wird über die Füllfarbe — eine
   * Zeichensoftware sortiert Pfade um, wie sie will.
   */
  wordmark: wordmarkFromSvg(wortmarke, { letters: '#1A1614', accent: '#FF5A1F' }),
  icons,

  palette,
  inkAlpha,
  paperAlpha,
  color: colorsFromPalette(palette, inkAlpha),
  elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),

  textScale,
  typeScale,
  /*
     Hinter der eigenen Schrift steht die *andere* des Erscheinungsbilds, und
     erst danach das System.

     Das ist keine Kosmetik. Space Mono führt `⌘`, `⌫`, `⇧` und `⌥` nicht;
     Inter führt sie. Der Export sucht ein fehlendes Zeichen in genau der
     Reihenfolge, die hier steht (`ersatzkette()` in `glyphCover.ts` liest den
     Stapel ab) — nennt der Stapel keine zweite Marken-Schrift, findet er
     nichts, und das Zeichen fällt aus PNG und PDF heraus. Genau dieser Fehler
     war im nozilla-Erscheinungsbild schon einmal da.
  */
  fontFamily: {
    display: "'Inter', 'Space Mono', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', 'Space Mono', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "'Space Mono', 'Inter', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  },
  webfont: { ...nozillaTheme.webfont, faces },
  // Im PDF steht für die Auszeichnung jetzt eine Grotesk und keine Serife —
  // die Ersatzschrift soll der echten nahekommen, nicht der von nozilla.
  pdfFontFamily: { ...nozillaTheme.pdfFontFamily, display: 'helvetica' },

  stroke: nozillaTheme.stroke,
  shadowOffset: nozillaTheme.shadowOffset,
};
