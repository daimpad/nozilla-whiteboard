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
 * ein Kunde nennt „Papier" vielleicht „Weiß".
 */

/** Ein Anzeigename, oder der Wert selbst, wenn keiner eingetragen ist. */
export function labelOf(table: Record<string, string>, value: string): string {
  return table[value] ?? value;
}

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

export const backgroundLabels: Record<string, string> = {
  paper: 'Papier',
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
