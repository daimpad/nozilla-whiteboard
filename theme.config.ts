/**
 * theme.config.ts — nozilla Corporate Identity, eine Quelle der Wahrheit.
 * ---------------------------------------------------------------------------
 * Übernommen aus https://github.com/daimpad/nozilla-ci — `design-system.css`,
 * `README.md` und `CLAUDE.md`. Die Token-Namen folgen dem CI-Vokabular
 * (`--nz-signal`, `--nz-paper`, `--nz-ink`, `--nz-stroke-*`), damit ein Blick
 * in beide Repos dieselben Begriffe zeigt.
 *
 * Nichts unter `src/` darf einen Hex-Wert, einen Schriftstapel, einen Radius
 * oder eine Strichstärke hart schreiben — alles kommt von hier, direkt oder
 * über die generierten CSS-Custom-Properties und Tailwind-Klassen.
 *
 * Die drei Regeln, die dieses Werkzeug technisch erzwingt:
 *   • Radius ist 0. Überall. Es gibt keinen anderen Wert.
 *   • Schatten sind harte Versätze ohne Weichzeichner.
 *   • Farbe hat genau drei Rollen: Papier, Tinte, Signal.
 */

/* -------------------------------------------------------------------------- */
/* Marke                                                                       */
/* -------------------------------------------------------------------------- */

export const brand = {
  name: 'nozilla',
  product: 'nozilla Whiteboard',
  motto: 'Gute digitale Dienste.',
  contact: 'contact@nozilla.de',
  ci: 'https://github.com/daimpad/nozilla-ci',
  /** Die Wortmarke ist das einzige Logo — keine Bildmarke, kein Claim im Lockup. */
  wordmark: {
    light: '/brand/nozilla-logo.svg',
    dark: '/brand/nozilla-logo-invers.svg',
    mono: '/brand/nozilla-logo-mono.svg',
  },
  favicon: '/brand/favicon.svg',
  socialPreview: '/brand/og-image.png',
} as const;

/* -------------------------------------------------------------------------- */
/* Farbe — genau drei Rollen                                                   */
/* -------------------------------------------------------------------------- */

export const palette = {
  /** Signal — die Handlungsfarbe. Nur Buttons, CTAs, Marker, Highlights. */
  signal: '#00FF9C',
  signalStrong: '#00E88D',
  signalSoft: '#B7FFE0',
  /**
   * Die dunkelste Stufe der Grün-Rampe. Sie schattiert *innerhalb* einer
   * Zeichnung und ist keine Handlungsfarbe: sie gehört nie auf eine Fläche,
   * nie auf einen Knopf, nie hinter ein Wort. `signalStrong` täte es dafür
   * nicht, der Ton steht dem Signal zu nah — als Hover-Zustand richtig, als
   * Schatten unsichtbar.
   */
  signalDeep: '#00C075',

  /**
   * Papier — warmes Creme. Der globale Untergrund.
   *
   * Die drei Töne waren einmal drei: `#FFFEE5`, `#FAF8D4`, `#F4F1C4`. Am
   * 7. August 2026 hat der Auftraggeber entschieden, dass bei Unterschieden
   * zwischen CI-Dokument und Webseite die Webseite gilt — und die Webseite
   * hat ein Creme. Der Grund steht in `ci/UEBERNAHME.md` des Relaunch-Repos
   * und ist nachprüfbar: man sieht, dass da drei verschiedene Weiß
   * nebeneinanderstehen, aber nicht, welches welches ist. Auf Papier wäre das
   * anders; dieses Werkzeug zeichnet auf Bildschirme.
   *
   * Die Namen bleiben, weil das CI-Dokument sie behält und weil sie eine
   * Rolle benennen, keinen Wert.
   */
  paper: '#FFFEE5',
  paperAlt: '#FFFEE5',
  paperDeep: '#FFFEE5',
  white: '#FFFFFF',

  /** Tinte — echtes Schwarz plus warme Fast-Schwarz-Töne für dunkle Flächen. */
  ink: '#000000',
  ink900: '#0C0C0A',
  ink800: '#17160F',
  ink700: '#201F16',
  ink600: '#2C2B20',

  /** Funktional — nur Status, nie Dekoration. */
  warn: '#FF5F1F',
  danger: '#E5484D',
  info: '#3E7BFA',
} as const;

/** Tinte mit Deckkraft — die Abstufungen, die das CI-Dokument benutzt. */
export const inkAlpha = {
  70: 'rgba(0, 0, 0, 0.72)',
  50: 'rgba(0, 0, 0, 0.50)',
  20: 'rgba(0, 0, 0, 0.18)',
} as const;

/** Papier mit Deckkraft — dasselbe auf dunklem Grund. */
export const paperAlpha = {
  70: 'rgba(255, 254, 229, 0.64)',
  50: 'rgba(255, 254, 229, 0.40)',
  20: 'rgba(255, 254, 229, 0.18)',
} as const;

/**
 * Semantische Tokens. Komponenten greifen auf diese zu, nicht auf die Palette.
 */
export const color = {
  /* Flächen */
  canvas: palette.paperDeep,
  surface: palette.paper,
  surfaceAlt: palette.paperAlt,
  surfaceRaised: palette.white,
  surfaceInverse: palette.ink,
  overlay: 'rgba(0, 0, 0, 0.62)',

  /* Text */
  ink: palette.ink,
  inkMuted: inkAlpha[70],
  inkSubtle: inkAlpha[50],
  inkInverse: palette.paper,
  inkOnSignal: palette.ink,

  /* Linien — im CI immer Tinte, nie ein Grauton */
  line: palette.ink,
  lineSoft: inkAlpha[20],
  grid: inkAlpha[20],
  gridStrong: inkAlpha[50],

  /* Signal */
  signal: palette.signal,
  signalStrong: palette.signalStrong,
  signalSoft: palette.signalSoft,
  signalDeep: palette.signalDeep,

  /* Status */
  warn: palette.warn,
  warnBg: '#FFF0E8',
  danger: palette.danger,
  dangerBg: '#FDEBEC',
  info: palette.info,
  infoBg: '#ECF1FE',

  /* Interaktion */
  focus: palette.signalStrong,
  selection: palette.ink,
  selectionWash: 'rgba(0, 255, 156, 0.22)',
  snapGuide: palette.signal,
} as const;

/**
 * Die Flächenrollen, die ein Canvas-Element annehmen darf.
 *
 * Bewusst eine Handvoll Rollen statt einer Akzentpalette: „Akzent-Paletten mit
 * 5 Blautönen" stehen im CI ausdrücklich auf der Verbotsliste. Wer eine Fläche
 * einfärben will, wählt eine Rolle — keinen Farbwert. Ein Farbwähler existiert
 * nicht.
 *
 * Die Zahl war schon einmal vier. „Papier getönt" hatte genau eine Aufgabe:
 * sich vom Papier abzusetzen. Seit die drei Cremetöne einer sind (siehe
 * `palette`), konnte es das nicht mehr, und ein Eintrag, der etwas verspricht,
 * was er nicht hält, gehört gelöscht. Ein Deck, das ihn noch nennt, fällt beim
 * Einlesen auf `paper` zurück, und das ist genau das, was es dann auch war.
 *
 * `white` nimmt diese Aufgabe wieder auf — und kann sie halten, denn reines
 * Weiß *ist* vom Creme zu unterscheiden. Es ist keine neue Farbe: `palette.
 * white` steht schon länger in der Palette und trägt bereits `surfaceRaised`.
 * Neu ist nur, dass eine Folie es benennen darf.
 */
export const elementTones = {
  paper: {
    label: 'Papier',
    hint: 'Standard — Papier mit Tintenkontur',
    surface: palette.paper,
    surfaceAlt: palette.paperAlt,
    line: palette.ink,
    text: palette.ink,
    textMuted: inkAlpha[70],
    accent: palette.ink,
  },
  white: {
    label: 'Weiß',
    hint: 'Reines Weiß — hebt sich vom cremefarbenen Papier ab',
    surface: palette.white,
    surfaceAlt: palette.white,
    line: palette.ink,
    text: palette.ink,
    textMuted: inkAlpha[70],
    accent: palette.ink,
  },
  signal: {
    label: 'Signal',
    hint: 'Nur echte Handlungsaufforderungen — 5 % der Fläche',
    surface: palette.signal,
    surfaceAlt: palette.signalSoft,
    line: palette.ink,
    text: palette.ink,
    textMuted: inkAlpha[70],
    accent: palette.ink,
  },
  ink: {
    label: 'Tinte',
    hint: 'Invers — Tinte als Fläche, Papier als Schrift',
    surface: palette.ink,
    surfaceAlt: palette.ink800,
    line: palette.paper,
    text: palette.paper,
    textMuted: paperAlpha[70],
    accent: palette.signal,
  },
} as const;

export type ToneName = keyof typeof elementTones;
export const toneNames = Object.keys(elementTones) as ToneName[];

/* -------------------------------------------------------------------------- */
/* Werkzeug-Oberfläche — bewusst *nicht* die Marke                             */
/* -------------------------------------------------------------------------- */

/**
 * Die Trennlinie dieses Projekts, an genau einer Stelle formuliert:
 *
 *   Alles oberhalb (`palette`, `color`, `elementTones`) beschreibt **Inhalt** —
 *   was auf einer Folie landet und exportiert wird. Das ist die nozilla CI und
 *   darf nichts anderes sein.
 *
 *   Alles hier unten beschreibt **Werkzeug** — Leisten, Paletten, Felder,
 *   Knöpfe. Das ist bewusst neutral: Weiß und ein kühler Grauton. Wer eine
 *   Folie baut, soll die Marke auf der Bühne sehen, nicht im Rahmen darum.
 *   Ein cremefarbener Editor um eine cremefarbene Folie macht beides unlesbar.
 *
 * Regel: eine Chrome-Komponente greift auf `ui.*` zu, nie auf `palette` oder
 * `color`. Der Umkehrschluss gilt genauso — kein `ui`-Wert erreicht je eine
 * Szene, einen SVG- oder einen PDF-Export.
 *
 * Die Oberfläche leiht sich **nichts** von der Marke, auch keinen Akzent. Sie
 * kennt Weiß, sechs Graustufen und Schwarz — sonst nichts. Damit ist die
 * einzige Farbe im Bild die auf der Folie, und das ist der Punkt: das Werkzeug
 * baut Marken-Material, es ist keins.
 */
const graphite = {
  0: '#FFFFFF',
  25: '#FBFCFD',
  50: '#F5F7FA',
  100: '#ECEFF4',
  200: '#DDE2EA',
  300: '#C4CBD7',
  400: '#9AA4B5',
  500: '#6F7A8C',
  600: '#515B6B',
  700: '#3A4351',
  800: '#232B36',
  900: '#12161C',
  950: '#0A0D12',
} as const;

export const ui = {
  /* Flächen — Weiß, darunter ein kühles Grau */
  canvas: graphite[100],
  surface: graphite[0],
  surfaceSubtle: graphite[50],
  surfaceSunken: graphite[100],
  surfaceInverse: graphite[900],
  overlay: 'rgba(18, 22, 28, 0.62)',

  /*
     Schrift — neutrales Fast-Schwarz, nicht das harte Tinte-Schwarz der Marke.

     Die beiden gedämpften Stufen standen eine Sprosse höher (600/500) und
     lagen damit bei 6,9 und 4,3 gegen Weiß. Die zweite verfehlte die 4,5, die
     WCAG für Fließtext verlangt — und `text-ui-faint` ist die meistbenutzte
     gedämpfte Klasse des Werkzeugs, sie trägt die Hinweiszeilen unter den
     Feldern. „Fast lesbar" ist bei einem Hinweis dasselbe wie „nicht da".
  */
  ink: graphite[900],
  inkMuted: graphite[700],
  inkSubtle: graphite[600],
  inkInverse: graphite[0],

  /* Linien — hier sind Graustufen richtig; auf der Folie wären sie es nicht */
  border: graphite[200],
  borderStrong: graphite[300],
  borderInverse: graphite[700],

  /*
     Der Akzent ist Schwarz. Ein Knopf, der die Hauptsache ist, wird dunkel —
     nicht bunt. Das hält die Aufmerksamkeit dort, wo die einzige Farbe im Bild
     sitzt: auf der Folie.

     Gedrückt wird dunkler, überfahren heller — bei Schwarz geht nur die eine
     Richtung, deshalb ist `accentHover` die *hellere* Stufe.
  */
  accent: graphite[900],
  accentHover: graphite[800],
  accentActive: graphite[950],
  accentSoft: graphite[100],
  accentBorder: graphite[300],
  onAccent: graphite[0],

  /* Auswahl, Griffe, Hilfslinien, Raster — dieselbe Schwarz-Familie. */
  select: graphite[900],
  selectWash: 'rgba(18, 22, 28, 0.08)',
  grid: graphite[300],

  /* Status — die einzigen Farbwerte der Oberfläche, und nur für Rückmeldung. */
  warn: '#F5A524',
  warnBg: '#FFF7E6',
  danger: '#E5484D',
  dangerBg: '#FEEDEE',
  info: graphite[700],
  infoBg: graphite[50],
} as const;

/**
 * Dieselbe Oberfläche bei Nacht.
 *
 * Kein zweites Regelwerk, sondern dieselbe Graphit-Leiter von unten gelesen:
 * Weiß, sechs Graustufen, Schwarz — nur umgekehrt belegt. Auch hier leiht sich
 * die Oberfläche **nichts** von der Marke; die einzige Farbe im Bild bleibt die
 * auf der Folie, und auf dunklem Grund fällt sie sogar mehr auf.
 *
 * Der Akzent kippt mit. Bei Tag ist der Knopf, der die Hauptsache ist, dunkel;
 * bei Nacht ist er hell. Bunt wird er in keinem der beiden Fälle.
 *
 * **Drei Werte kippen nicht:** `select`, `selectWash` und `grid`. Sie werden
 * nicht in der Leiste gezeichnet, sondern *auf der Folie* — Auswahlrahmen,
 * Aufziehrechteck, Rasterpunkte. Ein weißer Auswahlrahmen auf cremefarbenem
 * Papier wäre unsichtbar, und die Folie weiß nichts davon, ob jemand das
 * Werkzeug hell oder dunkel eingestellt hat.
 */
export const uiDark = {
  ...ui,

  canvas: graphite[950],
  surface: graphite[900],
  surfaceSubtle: graphite[800],
  surfaceSunken: graphite[950],
  surfaceInverse: graphite[50],
  overlay: 'rgba(5, 7, 10, 0.72)',

  // Dieselbe Verschiebung von unten gelesen: eine Sprosse heller, damit auch
  // hier beide Stufen über 4,5 liegen.
  ink: graphite[50],
  inkMuted: graphite[300],
  inkSubtle: graphite[400],
  inkInverse: graphite[900],

  border: graphite[700],
  borderStrong: graphite[600],
  borderInverse: graphite[300],

  accent: graphite[50],
  accentHover: graphite[0],
  accentActive: graphite[200],
  accentSoft: graphite[800],
  accentBorder: graphite[600],
  onAccent: graphite[900],

  /* Status — dieselbe Aufgabe, auf dunklem Grund lesbar gemacht. */
  warn: '#FFC65C',
  warnBg: '#3A2E15',
  danger: '#FF8A8E',
  dangerBg: '#3A1F21',
  info: graphite[300],
  infoBg: graphite[800],
} as const satisfies Record<keyof typeof ui, string>;

/**
 * Die Schatten der Nacht-Oberfläche.
 *
 * Auf dunklem Grund trägt ein Schatten kaum — was eine Fläche abhebt, ist die
 * Kante. Die Versätze bleiben deshalb dieselben, nur tiefer und dazu ein
 * heller Innenstrich, der die Oberkante zeichnet.
 */
export const uiShadowDark = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.40)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.50), 0 1px 2px rgba(0, 0, 0, 0.30)',
  md: '0 4px 10px rgba(0, 0, 0, 0.50), 0 1px 3px rgba(0, 0, 0, 0.35)',
  lg: '0 12px 28px rgba(0, 0, 0, 0.58), 0 2px 6px rgba(0, 0, 0, 0.40)',
  xl: '0 24px 56px rgba(0, 0, 0, 0.64), 0 4px 10px rgba(0, 0, 0, 0.40)',
  focus: '0 0 0 3px rgba(245, 247, 250, 0.28)',
} as const satisfies Record<keyof typeof uiShadow, string>;

/**
 * Radien der Oberfläche. Auf der Folie ist der Radius 0 und bleibt es
 * (`RADIUS`) — ein Knopf in einer Werkzeugleiste ist aber kein Folienobjekt.
 */
export const uiRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Schatten der Oberfläche: weich und klein, damit sie Ebenen andeuten statt
 * Aufmerksamkeit zu ziehen. Die harten Versatzschatten der Marke (`shadow`)
 * gehören auf die Bühne, wo sie exportiert werden.
 */
export const uiShadow = {
  none: 'none',
  xs: '0 1px 2px rgba(18, 22, 28, 0.06)',
  sm: '0 1px 3px rgba(18, 22, 28, 0.08), 0 1px 2px rgba(18, 22, 28, 0.04)',
  md: '0 4px 10px rgba(18, 22, 28, 0.08), 0 1px 3px rgba(18, 22, 28, 0.05)',
  lg: '0 12px 28px rgba(18, 22, 28, 0.12), 0 2px 6px rgba(18, 22, 28, 0.06)',
  xl: '0 24px 56px rgba(18, 22, 28, 0.16), 0 4px 10px rgba(18, 22, 28, 0.06)',
  focus: '0 0 0 3px rgba(18, 22, 28, 0.20)',
} as const;

/* -------------------------------------------------------------------------- */
/* Typografie — drei Schriften, klare Rollen                                   */
/* -------------------------------------------------------------------------- */

/**
 * Die Marken-Schriften liegen selbst gehostet unter `public/fonts/`
 * (SIL Open Font License 1.1, siehe `public/fonts/OFL.txt`). Kein CDN, keine
 * Netzabhängigkeit — dieselbe Entscheidung wie im CI-Repo.
 */
/*
   Hinter der eigenen Schrift stehen erst die beiden *anderen* Marken-Schriften
   und dann erst die des Systems.

   Das ist kein Schmuck, sondern die Bedingung dafür, dass Bildschirm und
   Export dasselbe zeigen. Space Mono führt `⌘`, `⌫`, `⇧` und `⌥` nicht; Inter
   führt sie. Ohne diese Reihenfolge nimmt der Browser irgendeine Systemschrift
   — auf jedem Rechner eine andere, auf manchem gar keine —, misst deren
   Vorschub und setzt das nächste Zeichen danach. Der Export hat diese Schrift
   nicht und kann nur aus den mitgelieferten wählen: er zeichnete an einer
   Stelle, die für eine fremde Breite gerechnet war, und die Zeichen liefen
   ineinander.

   So fällt beides auf dieselbe Datei zurück, und die Frage „wo steht das
   Zeichen" hat wieder eine Antwort.
*/
export const fontFamily = {
  display: "'Zilla Slab', 'Inter', 'Space Mono', Georgia, 'Times New Roman', serif",
  body: "'Inter', 'Zilla Slab', 'Space Mono', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'Space Mono', 'Inter', 'Zilla Slab', ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

/**
 * Ausgeliefert wird WOFF2, nicht TTF: dieselben Konturen, rund zwei Drittel
 * weniger Bytes (1875 kB → 630 kB über alle neun Schnitte). Umgewandelt wird
 * beim CI-Sync (`scripts/sync-ci.mjs`), damit im CI-Repo weiter die TTFs für
 * Druck und Office liegen können.
 */
export const webfont = {
  enabled: true,
  directory: 'fonts',
  format: 'woff2',
  faces: [
    { family: 'Zilla Slab', weight: 500, style: 'normal', file: 'ZillaSlab-Medium.woff2' },
    { family: 'Zilla Slab', weight: 600, style: 'normal', file: 'ZillaSlab-SemiBold.woff2' },
    { family: 'Zilla Slab', weight: 700, style: 'normal', file: 'ZillaSlab-Bold.woff2' },
    { family: 'Inter', weight: 400, style: 'normal', file: 'Inter-Regular.woff2' },
    { family: 'Inter', weight: 500, style: 'normal', file: 'Inter-Medium.woff2' },
    { family: 'Inter', weight: 600, style: 'normal', file: 'Inter-SemiBold.woff2' },
    { family: 'Inter', weight: 700, style: 'normal', file: 'Inter-Bold.woff2' },
    { family: 'Space Mono', weight: 400, style: 'normal', file: 'SpaceMono-Regular.woff2' },
    { family: 'Space Mono', weight: 700, style: 'normal', file: 'SpaceMono-Bold.woff2' },
  ],
} as const;

/**
 * PDF kennt keine Web-Fonts. Zilla Slab ist eine Slab-Serif, deshalb steht im
 * Export Times (Serif) dafür — näher an der Marke als Helvetica. Der
 * Zeilenumbruch ist zu diesem Zeitpunkt längst gegen die echten Bildschirm-
 * Metriken gefallen, der Ersatz verschiebt also nichts, er zeichnet nur die
 * Glyphen etwas anders.
 */
export const pdfFontFamily = {
  display: 'times',
  body: 'helvetica',
  mono: 'courier',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Die Größenleiter des CI — acht Stufen, und sonst gibt es keine.
 *
 * Sie steht hier für sich, weil sie das ist, was sich ändert. Am 7. August
 * 2026 hat die Leiter der Webseite die des CI-Dokuments abgelöst; sieben der
 * acht Stufen sind dabei gewandert. Wer die Leiter wieder nachzieht, ändert
 * diese acht Zahlen und sonst nichts — die Hierarchie darunter liest von
 * hier.
 *
 * Die neue Leiter ist unten enger und oben weiter, und das mit Absicht:
 * Fließtext muss lesbar sein, Titel dürfen groß sein. Die alte war in beide
 * Richtungen zahmer.
 *
 * `xl4` ist auf der Webseite ein `clamp(64px, 10vw, 140px)`. Eine Folie hat
 * eine feste Breite, also nimmt sie den oberen Wert.
 */
export const textScale = {
  xs: 12,
  sm: 13,
  base: 16,
  lg: 21,
  xl: 34,
  xl2: 48,
  xl3: 68,
  xl4: 140,
} as const;

/**
 * Die Typo-Hierarchie aus dem CI, in Folien-Einheiten.
 *
 * Die Zuordnung ist die des CI-Dokuments: `h1` ist `xl3`, `h2` ist `xl2`, und
 * so weiter. Labels sind Space Mono, ALL-CAPS, 0.12em — deshalb trägt
 * `overline` die Versalien-Kennzeichnung mit.
 *
 * Drei Stufen sind keine CI-Marken, sondern gehören diesem Werkzeug, und sie
 * stehen als nackte Zahl da, damit man sie von den Marken unterscheiden kann:
 * die Kampagnengröße `headline` zwischen `xl3` und `xl4`, `labelSmall` für
 * Fußzeile und Foliennummer — unterhalb der Leiter, weil die Leiter dort
 * aufhört, wo eine Folie noch weitermuss —, und `codeInline`, das knapp unter
 * dem Fließtext steht, weil Space Mono breiter baut als Inter.
 */
export const typeScale = {
  /* Kampagnen-Größen — Zilla Slab Bold, Zeilenhöhe 0.95, -0.02em */
  display: {
    size: textScale.xl4,
    lineHeight: 0.95,
    weight: fontWeight.bold,
    tracking: -0.02,
    family: 'display',
    caps: false,
  },
  headline: {
    size: 88,
    lineHeight: 0.95,
    weight: fontWeight.bold,
    tracking: -0.02,
    family: 'display',
    caps: false,
  },
  /* Die Hierarchie aus dem CI-Dokument */
  h1: {
    size: textScale.xl3,
    lineHeight: 1.0,
    weight: fontWeight.bold,
    tracking: -0.02,
    family: 'display',
    caps: false,
  },
  h2: {
    size: textScale.xl2,
    lineHeight: 1.05,
    weight: fontWeight.bold,
    tracking: -0.02,
    family: 'display',
    caps: false,
  },
  h3: {
    size: textScale.xl,
    lineHeight: 1.15,
    weight: fontWeight.bold,
    tracking: -0.015,
    family: 'display',
    caps: false,
  },
  h4: {
    size: textScale.lg,
    lineHeight: 1.25,
    weight: fontWeight.bold,
    tracking: -0.01,
    family: 'display',
    caps: false,
  },
  lead: {
    size: textScale.lg,
    lineHeight: 1.4,
    weight: fontWeight.regular,
    tracking: 0,
    family: 'body',
    caps: false,
  },
  body: {
    size: textScale.base,
    lineHeight: 1.55,
    weight: fontWeight.regular,
    tracking: 0,
    family: 'body',
    caps: false,
  },
  bodyStrong: {
    size: textScale.base,
    lineHeight: 1.55,
    weight: fontWeight.semibold,
    tracking: 0,
    family: 'body',
    caps: false,
  },
  small: {
    size: textScale.sm,
    lineHeight: 1.55,
    weight: fontWeight.regular,
    tracking: 0,
    family: 'body',
    caps: false,
  },
  /* Labels sind Space Mono Bold, ALL-CAPS, 0.12em */
  label: {
    size: textScale.xs,
    lineHeight: 1.2,
    weight: fontWeight.bold,
    tracking: 0.12,
    family: 'mono',
    caps: true,
  },
  labelSmall: {
    size: 11,
    lineHeight: 1.2,
    weight: fontWeight.bold,
    tracking: 0.12,
    family: 'mono',
    caps: true,
  },
  code: {
    size: textScale.sm,
    lineHeight: 1.55,
    weight: fontWeight.regular,
    tracking: 0,
    family: 'mono',
    caps: false,
  },
  codeInline: {
    size: 15,
    lineHeight: 1.4,
    weight: fontWeight.regular,
    tracking: 0,
    family: 'mono',
    caps: false,
  },
} as const;

export type TypeStyleName = keyof typeof typeScale;

/** Die Anwendungsoberfläche selbst — feste, kompakte Größen. */
export const uiType = {
  label: { size: 11, lineHeight: 1.2, weight: fontWeight.bold, tracking: 0.12 },
  body: { size: 13, lineHeight: 1.45, weight: fontWeight.regular, tracking: 0 },
  title: { size: 15, lineHeight: 1.25, weight: fontWeight.bold, tracking: -0.01 },
  mono: { size: 12, lineHeight: 1.5, weight: fontWeight.regular, tracking: 0 },
  /*
     Die eine Stufe, die nicht bedient, sondern gelesen wird.

     Die Notizen der Referentenansicht stehen einen Meter vom Auge entfernt und
     werden beim Sprechen überflogen, nicht studiert. Die 15 px von `title`
     sind für eine Feldbeschriftung richtig und für einen Satz, den man in
     einer halben Sekunde wiederfinden muss, zu klein. Der Zeilenabstand ist
     aus demselben Grund weiter: die Zeile, in der man war, geht sonst
     verloren.
  */
  read: { size: 20, lineHeight: 1.55, weight: fontWeight.regular, tracking: 0 },
} as const;

/* -------------------------------------------------------------------------- */
/* Formensprache                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Der Eckenradius ist 0. Immer. Das ist keine Vorgabe, die man überschreiben
 * könnte — es gibt schlicht keinen zweiten Wert im System.
 */
export const RADIUS = 0;

/** Die vier Strichstärken des CI. Mehr gibt es nicht. */
export const stroke = {
  hair: 1.5,
  rule: 2,
  strong: 3,
  heavy: 4,
} as const;

export const strokeNames = ['hair', 'rule', 'strong', 'heavy'] as const;
export type StrokeName = (typeof strokeNames)[number];

/** 4px-Basisraster, wie im Design System. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
} as const;

/**
 * Schatten sind harte Versätze — Fläche, kein Weichzeichner. Weil sie eine
 * echte Fläche sind, lassen sie sich exakt nach SVG *und* PDF exportieren;
 * ein weicher Schatten könnte das nicht.
 */
export const shadowOffset = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 10,
} as const;

export const shadowNames = ['none', 'sm', 'md', 'lg'] as const;
export type ShadowName = (typeof shadowNames)[number];

/** Die CSS-Fassung derselben Schatten, für die Anwendungsoberfläche. */
export const shadow = {
  none: 'none',
  sm: `${shadowOffset.sm}px ${shadowOffset.sm}px 0 0 ${palette.ink}`,
  md: `${shadowOffset.md}px ${shadowOffset.md}px 0 0 ${palette.ink}`,
  lg: `${shadowOffset.lg}px ${shadowOffset.lg}px 0 0 ${palette.ink}`,
  signal: `${shadowOffset.md}px ${shadowOffset.md}px 0 0 ${palette.signal}`,
  focus: `0 0 0 3px ${palette.signalStrong}`,
} as const;

/* -------------------------------------------------------------------------- */
/* Bewegung                                                                    */
/* -------------------------------------------------------------------------- */

export const motion = {
  duration: {
    fast: 90,
    base: 160,
    slow: 260,
    slide: 380,
  },
  easing: {
    standard: 'cubic-bezier(.2, 0, 0, 1)',
    entrance: 'cubic-bezier(.2, 0, 0, 1)',
    exit: 'cubic-bezier(.4, 0, 1, 1)',
  },
  /** Abstand zwischen aufeinanderfolgenden Einblendungen eines Schritts. */
  stagger: 60,
} as const;

/* -------------------------------------------------------------------------- */
/* Folien-Geometrie                                                            */
/* -------------------------------------------------------------------------- */

export const canvas = {
  /** Arbeitsauflösung, 16:9. Alle Element-Koordinaten sind diese Einheiten. */
  width: 1280,
  height: 720,
  /** Satzspiegel. Der Freiraum um die Wortmarke bestimmt das Maß. */
  margin: { top: 72, right: 88, bottom: 72, left: 88 },
  gridSize: 8,
  gridMajorEvery: 4,
  snapThreshold: 6,
  minElementSize: 24,
  zoom: { min: 0.2, max: 3, step: 0.1 },
} as const;

/* -------------------------------------------------------------------------- */
/* Element-Vorgaben                                                            */
/* -------------------------------------------------------------------------- */

export const elementDefaults = {
  text: {
    width: 520,
    height: 96,
    tone: 'paper' as ToneName,
    typeStyle: 'h4' as TypeStyleName,
    padding: space[4],
    align: 'left' as const,
  },
  markdown: {
    width: 560,
    height: 280,
    tone: 'paper' as ToneName,
    padding: space[5],
    strokeWeight: 'rule' as StrokeName,
  },
  card: {
    width: 340,
    height: 220,
    tone: 'paper' as ToneName,
    padding: space[5],
    strokeWeight: 'rule' as StrokeName,
  },
  /**
   * Ein Diagramm ist breiter als hoch, weil Zahlenreihen waagerecht gelesen
   * werden. Die Maße sind die der Karte, einmal quer — so passen zwei
   * nebeneinander in eine Einsetzspalte, ohne dass etwas gequetscht aussieht.
   */
  chart: {
    width: 530,
    height: 300,
    tone: 'paper' as ToneName,
    padding: space[5],
    strokeWeight: 'rule' as StrokeName,
  },
  /**
   * Eine Tabelle ist so breit wie die Einsetzspalte und so hoch, wie vier
   * Zeilen brauchen. Höher aufzuziehen bringt nichts: sie wächst mit ihren
   * Zeilen von oben nach unten und lässt darunter Luft, statt sie zu dehnen.
   */
  table: {
    width: 530,
    height: 220,
    tone: 'paper' as ToneName,
    padding: space[5],
    strokeWeight: 'rule' as StrokeName,
  },
  badge: {
    width: 168,
    height: 40,
    tone: 'signal' as ToneName,
    strokeWeight: 'rule' as StrokeName,
  },
  icon: {
    width: 96,
    height: 96,
    tone: 'paper' as ToneName,
    strokeWeight: 'heavy' as StrokeName,
  },
  shape: {
    width: 260,
    height: 180,
    tone: 'paper' as ToneName,
    strokeWeight: 'rule' as StrokeName,
  },
  connector: {
    width: 220,
    height: 0,
    tone: 'paper' as ToneName,
    strokeWeight: 'strong' as StrokeName,
  },
  image: {
    width: 400,
    height: 260,
    tone: 'paper' as ToneName,
  },
  wordmark: {
    width: 320,
    height: 80,
    tone: 'paper' as ToneName,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Folien-Vokabular                                                            */
/* -------------------------------------------------------------------------- */

export const slideTransitions = ['none', 'cut', 'fade', 'slide', 'push'] as const;
export type SlideTransition = (typeof slideTransitions)[number];

export const revealAnimations = [
  'cut',
  'fade',
  'rise',
  'slide-left',
  'slide-right',
  'wipe',
] as const;
export type RevealAnimation = (typeof revealAnimations)[number];

export const slideLayouts = [
  'title',
  'default',
  'section',
  'split',
  'quote',
  'statement',
  'blank',
  'canvas',
] as const;
export type SlideLayout = (typeof slideLayouts)[number];

/* -------------------------------------------------------------------------- */
/* Sprache & Ton — was das Werkzeug prüfen kann                                 */
/* -------------------------------------------------------------------------- */

/**
 * Wörter, die das CI ausdrücklich ausschließt. Der Editor markiert sie im
 * Text, statt sie zu verbieten — die Entscheidung bleibt beim Menschen.
 */
export const forbiddenWords = [
  'seamless',
  'disruptive',
  'disruptiv',
  'synergy',
  'synergie',
  'empowern',
  'orchestrieren',
  'ganzheitlich',
  'innovativ',
  'state-of-the-art',
  'best-in-class',
  'leverage',
] as const;

/** Höchstzahl grüner Marker pro Absatz. */
export const MAX_MARKERS_PER_PARAGRAPH = 3;

/* -------------------------------------------------------------------------- */
/* Sammel-Export                                                               */
/* -------------------------------------------------------------------------- */

export const theme = {
  brand,
  palette,
  inkAlpha,
  paperAlpha,
  color,
  elementTones,
  ui,
  uiRadius,
  uiShadow,
  fontFamily,
  webfont,
  pdfFontFamily,
  fontWeight,
  typeScale,
  uiType,
  RADIUS,
  stroke,
  space,
  shadow,
  shadowOffset,
  motion,
  canvas,
  elementDefaults,
} as const;

export type Theme = typeof theme;
export default theme;
