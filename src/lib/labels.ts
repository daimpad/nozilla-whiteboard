/**
 * Die deutschen Namen der Auswahlwerte.
 *
 * **Der Wert bleibt englisch, nur der Name wird übersetzt.** Das ist keine
 * Halbherzigkeit, sondern die Trennung, an der alles hängt: `layout: canvas`
 * steht so in der `.md`, und die `.md` ist das Dateiformat. Wer den Wert
 * übersetzte, machte jedes bestehende Deck unlesbar und jeden Prompt falsch.
 *
 * Deshalb sind das hier reine Anzeigenamen. Sie werden nirgends gelesen,
 * verglichen oder gespeichert — sie stehen nur in Auswahlfeldern.
 *
 * Was hier *nicht* steht: die drei Farbrollen. Die tragen ihren Namen selbst,
 * in `elementTones[…].label`, weil ein Erscheinungsbild sie umbenennen darf —
 * eine Marke nennt „Papier" vielleicht „Weiß".
 */

/** Ein Anzeigename, oder der Wert selbst, wenn keiner eingetragen ist. */
export function labelOf(table: Record<string, string>, value: string): string {
  return table[value] ?? value;
}

/**
 * Wie eine Elementart heißt, wenn man sie ansagen muss.
 *
 * Gebraucht wird das dort, wo kein Bild hilft: eine Hilfstechnik liest die
 * Fläche vor, und „Gruppe" für jedes Element wäre keine Auskunft.
 */
export const kindLabels: Record<string, string> = {
  text: 'Text',
  markdown: 'Markdown',
  card: 'Karte',
  badge: 'Badge',
  icon: 'Zeichen',
  shape: 'Form',
  connector: 'Verbinder',
  image: 'Bild',
  wordmark: 'Wortmarke',
  chart: 'Diagramm',
  table: 'Tabelle',
};

export const layoutLabels: Record<string, string> = {
  title: 'Titel',
  default: 'Standard',
  section: 'Kapitel',
  split: 'Geteilt',
  quote: 'Zitat',
  statement: 'Aussage',
  blank: 'Leer',
  canvas: 'Freie Fläche',
};

/*
   Der Untergrund `paper` heißt hier **„Weiß"** und nicht „Papier", obwohl der
   Wert im Dateiformat `paper` lautet. Das ist die eine Stelle, an der Wert und
   Beschriftung auseinandergehen dürfen, und sie tut es aus einem Grund: „Papier"
   *benennt in dieser CI den Cremeton* — `palette.paper` ist #FFFEE5, und die
   Flächenrolle „Papier" gleich darunter im Inspektor malt genau ihn. Ein weißer
   Untergrund namens „Papier" widerspräche also der Beschriftung zwei Zeilen
   tiefer. Seit dem Tausch vom 27. August 2026 gilt: was „Weiß" heißt, ist weiß,
   und was „Papier" heißt, ist creme — in beiden Listen.

   Der Wert bleibt trotzdem `paper`. Er steht in jeder bestehenden `.md`, und ihn
   umzubenennen hieße, jedes Deck unlesbar zu machen.
*/
export const backgroundLabels: Record<string, string> = {
  paper: 'Weiß',
  // „Creme" und nicht „Gelb": der Ton ist der Papierton der Marke, und wie
  // warm er ist, entscheidet das Erscheinungsbild. Ein Name, der eine Farbe
  // behauptet, wäre bei der nächsten Marke falsch.
  cream: 'Creme',
  ink: 'Tinte',
  signal: 'Signal',
  grid: 'Raster',
};

export const transitionLabels: Record<string, string> = {
  none: 'Ohne',
  cut: 'Schnitt',
  fade: 'Blende',
  slide: 'Schub',
  push: 'Nachrücken',
};

export const revealLabels: Record<string, string> = {
  cut: 'Schnitt',
  fade: 'Blende',
  rise: 'Aufsteigen',
  'slide-left': 'Von rechts',
  'slide-right': 'Von links',
  wipe: 'Wischen',
};

export const fillLabels: Record<string, string> = {
  none: 'Ohne',
  outline: 'Kontur',
  flat: 'Fläche',
  framed: 'Gerahmt',
};

export const strokeLabels: Record<string, string> = {
  hair: 'Haarlinie',
  rule: 'Normal',
  strong: 'Kräftig',
  heavy: 'Fett',
};

export const shadowLabels: Record<string, string> = {
  none: 'Ohne',
  sm: 'Klein',
  md: 'Mittel',
  lg: 'Groß',
};

export const alignLabels: Record<string, string> = {
  left: 'Links',
  center: 'Mittig',
  right: 'Rechts',
};

export const valignLabels: Record<string, string> = {
  top: 'Oben',
  middle: 'Mittig',
  bottom: 'Unten',
};

export const cardLabels: Record<string, string> = {
  feature: 'Merkmal',
  stat: 'Zahl',
  step: 'Schritt',
  quote: 'Zitat',
  note: 'Hinweis',
};

export const connectorLabels: Record<string, string> = {
  line: 'Linie',
  arrow: 'Pfeil',
  'double-arrow': 'Doppelpfeil',
  elbow: 'Winkel',
};

/**
 * „3 Folien" — eine Zahl mit ihrem Wort, im Singular wie im Plural.
 *
 * Stand zweimal im Code: einmal deutsch in der Suchleiste, einmal englisch in
 * der Übersicht (`{n} slide{n === 1 ? '' : 's'}`). Ein Wort, das nur in einem
 * Ausdruck vorkommt, sieht ein Sieb schwer — und dieses sah es gar nicht, weil
 * sein Textknoten-Muster verlangt, dass der Text hinter einem `>` beginnt.
 * Hier begann er hinter einem `}`.
 */
export function zaehle(anzahl: number, eins: string, viele: string): string {
  return `${anzahl} ${anzahl === 1 ? eins : viele}`;
}

/**
 * Die acht Griffe am Auswahlrahmen.
 *
 * Sie hießen für eine Hilfstechnik „Resize nw" — englisch, und dazu ein
 * Schlüssel des Codes als Ansage. Gesehen hat es niemand, denn diese
 * Beschriftung steht nur im Barrierebaum; das Sprachsieb ließ sie durch, weil
 * „resize" ein Verb ist und seine beiden Listen Substantive führen.
 */
export const handleLabels: Record<string, string> = {
  nw: 'oben links',
  n: 'oben',
  ne: 'oben rechts',
  e: 'rechts',
  se: 'unten rechts',
  s: 'unten',
  sw: 'unten links',
  w: 'links',
};

/** Balken oder Linie. */
export const chartLabels: Record<string, string> = {
  bar: 'Balken',
  line: 'Linie',
};

export const shapeLabels: Record<string, string> = {
  rectangle: 'Rechteck',
  ellipse: 'Ellipse',
  diamond: 'Raute',
  triangle: 'Dreieck',
  hexagon: 'Sechseck',
  chevron: 'Pfeilband',
  banner: 'Banner',
  callout: 'Sprechblase',
  frame: 'Eckwinkel',
  bracket: 'Klammer',
  cross: 'Kreuz',
};

export const iconFrameLabels: Record<string, string> = {
  none: 'Ohne',
  box: 'Kasten',
};

/**
 * Die Farbe der Wortmarke.
 *
 * „Automatisch" ist der Regelfall und heißt: der Ton, der auf dem Untergrund
 * der Folie lesbar ist. Die anderen drei sind die Ausnahme, die man
 * ausdrücklich wählt — und deshalb heißen sie nach dem, was sie malen, und
 * nicht nach ihrem Wert im Dateiformat.
 */
export const wordmarkLabels: Record<string, string> = {
  auto: 'Automatisch',
  ink: 'Tinte',
  paper: 'Papier',
  mono: 'Einfarbig',
};

/**
 * Die Typo-Stufen behalten ihre Namen: `h1`, `lead`, `body` sind die Sprache
 * der CI und stehen so in `theme.config.ts`, im Prompt und in jedem Deck.
 * Übersetzt wird nur, was ohne Erklärung sonst nichts sagt.
 */
export const typeStyleLabels: Record<string, string> = {
  display: 'Kampagnensatz',
  headline: 'Headline',
  lead: 'Lead',
  body: 'Fließtext',
  bodyStrong: 'Fließtext fett',
  small: 'Kleintext',
  label: 'Label',
  labelSmall: 'Label klein',
  code: 'Code',
  codeInline: 'Code im Satz',
};
