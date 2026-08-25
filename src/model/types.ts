/**
 * Das Datenmodell.
 *
 * Der ganze Anwendungszustand ist (Deck + etwas flüchtiger UI-Zustand), und das
 * Deck lässt sich verlustfrei nach Markdown schreiben — siehe `lib/markdown`.
 *
 * Was hier *nicht* steht, ist so wichtig wie das, was drinsteht: kein
 * Eckenradius, keine Farbe, keine Schriftgröße. Ein Element wählt eine Rolle
 * aus der CI, keinen Wert.
 */
import type {
  RevealAnimation,
  ShadowName,
  SlideLayout,
  SlideTransition,
  StrokeName,
  ToneName,
  TypeStyleName,
} from '@/theme';
// Der Name eines Zeichens ist eine freie Zeichenkette, seit ein
// Erscheinungsbild sein eigenes Icon-Set mitbringen kann: ein Deck darf ein
// Zeichen nennen, das hier gerade niemand zeichnen kann, ohne es zu verlieren.
import type { IconName } from '@/assets/icons';

/* -------------------------------------------------------------------------- */
/* Elemente                                                                    */
/* -------------------------------------------------------------------------- */

export const elementKinds = [
  'text',
  'markdown',
  'card',
  'badge',
  'icon',
  'shape',
  'connector',
  'image',
  'wordmark',
] as const;
export type ElementKind = (typeof elementKinds)[number];

/**
 * Wie eine Fläche gemalt wird. Vier Zustände, weil das CI vier kennt:
 * nackt, nur Kontur, nur Fläche, Fläche mit Kontur.
 */
export const fillStyles = ['none', 'outline', 'flat', 'framed'] as const;
export type FillStyle = (typeof fillStyles)[number];

/**
 * Formen. Kein `rounded`, kein `pill` — abgerundete Ecken stehen im CI auf der
 * Verbotsliste. Ellipsen sind erlaubt: das sind Kurven, keine weichen Ecken.
 */
export const shapeNames = [
  'rectangle',
  'ellipse',
  'diamond',
  'triangle',
  'hexagon',
  'chevron',
  'banner',
  'callout',
  'frame',
  'bracket',
  'cross',
] as const;
export type ShapeName = (typeof shapeNames)[number];

export const connectorKinds = ['line', 'arrow', 'double-arrow', 'elbow'] as const;
export type ConnectorKind = (typeof connectorKinds)[number];

export const cardVariants = ['feature', 'stat', 'step', 'quote', 'note'] as const;
export type CardVariant = (typeof cardVariants)[number];

export const iconFrames = ['none', 'box'] as const;
export type IconFrame = (typeof iconFrames)[number];

export const horizontalAligns = ['left', 'center', 'right'] as const;
export type HorizontalAlign = (typeof horizontalAligns)[number];

export const verticalAligns = ['top', 'middle', 'bottom'] as const;
export type VerticalAlign = (typeof verticalAligns)[number];

export const wordmarkVariants = ['auto', 'ink', 'paper', 'mono'] as const;
export type WordmarkVariant = (typeof wordmarkVariants)[number];

/** Choreografie: wann ein Element in der Präsentation erscheint. */
export interface Reveal {
  /** 0 = sofort mit der Folie; 1..n = beim n-ten Weiterschalten. */
  step: number;
  animation: RevealAnimation;
}

/** Was jedes Element auf der Fläche gemeinsam hat. Koordinaten in Folien-Einheiten. */
export interface ElementBase {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Grad, im Uhrzeigersinn, um die Elementmitte. */
  rotation: number;
  /** Malreihenfolge innerhalb der Folie; höher liegt vorn. */
  z: number;
  tone: ToneName;
  fill: FillStyle;
  strokeWeight: StrokeName;
  /** Harter Versatzschatten. Kein Weichzeichner — es gibt keinen. */
  shadow: ShadowName;
  padding: number;
  opacity: number;
  locked: boolean;
  reveal?: Reveal;
  /** Optionaler Name für die Ebenenliste. */
  name?: string;
  /**
   * Zu welcher Gruppe das Element gehört.
   *
   * Eine Gruppe ist kein eigenes Element, sondern eine Kennung, die mehrere
   * tragen. Das ist die kleinere Änderung — ein Gruppen-Element hätte einen
   * eigenen Kasten, eigene Maße und eine eigene Malreihenfolge, und jede
   * Ausgabe müsste es kennen. So bleibt für Szene, SVG, PDF und PPTX alles,
   * wie es war: sie sehen weiterhin nur Elemente.
   *
   * Gruppen verschachteln sich nicht. Wer eine Gruppe mit etwas anderem
   * gruppiert, bekommt eine Gruppe aus allem — das ist die Erwartung bei einem
   * Werkzeug, in dem man Dinge nebeneinanderlegt, und es erspart einen Baum,
   * den niemand sehen kann.
   */
  group?: string;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  typeStyle: TypeStyleName;
  align: HorizontalAlign;
  valign: VerticalAlign;
}

export interface MarkdownElement extends ElementBase {
  kind: 'markdown';
  markdown: string;
  align: HorizontalAlign;
}

export interface CardElement extends ElementBase {
  kind: 'card';
  variant: CardVariant;
  /** Space-Mono-Label über der Überschrift, ALL-CAPS. */
  label?: string;
  title: string;
  body: string;
  icon?: IconName;
}

export interface BadgeElement extends ElementBase {
  kind: 'badge';
  text: string;
  icon?: IconName;
}

export interface IconElement extends ElementBase {
  kind: 'icon';
  icon: IconName;
  frame: IconFrame;
}

export interface ShapeElement extends ElementBase {
  kind: 'shape';
  shape: ShapeName;
  label?: string;
  labelStyle?: TypeStyleName;
}

export interface ConnectorElement extends ElementBase {
  kind: 'connector';
  connector: ConnectorKind;
  dashed: boolean;
  label?: string;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  /** Pfad relativ zum Deck oder eine `data:`-URI. */
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

/** Die Wortmarke als platzierbares Element — mit den Regeln des CI im Bauch. */
export interface WordmarkElement extends ElementBase {
  kind: 'wordmark';
  variant: WordmarkVariant;
}

export type CanvasElement =
  | TextElement
  | MarkdownElement
  | CardElement
  | BadgeElement
  | IconElement
  | ShapeElement
  | ConnectorElement
  | ImageElement
  | WordmarkElement;

/* -------------------------------------------------------------------------- */
/* Folien & Deck                                                               */
/* -------------------------------------------------------------------------- */

/**
 * `paper-alt` und `paper-deep` standen hier, solange es drei Cremetöne gab.
 * Seit die CI einen führt, wären sie drei Einträge mit demselben Bild. Ein
 * älteres Deck, das sie noch nennt, fällt beim Einlesen auf `paper` zurück —
 * dasselbe Ergebnis, ohne die Auswahl, die keine war.
 */
export const slideBackgrounds = ['paper', 'ink', 'signal', 'grid'] as const;
export type SlideBackground = (typeof slideBackgrounds)[number];

export interface SlideMeta {
  layout: SlideLayout;
  transition: SlideTransition;
  background: SlideBackground;
  /** Notizen für die vortragende Person. Nie auf der Folie. */
  notes?: string;
  /** Fußzeile und Foliennummer auf dieser Folie ausblenden. */
  bare?: boolean;
}

export interface Slide {
  id: string;
  meta: SlideMeta;
  /** Fließtext, im Satzspiegel des Layouts gesetzt. */
  markdown: string;
  /** Frei platzierte CI-Elemente. */
  elements: CanvasElement[];
}

export interface DeckMeta {
  title: string;
  author?: string;
  date?: string;
  footer?: string;
  /**
   * Wessen Erscheinungsbild dieses Deck trägt.
   *
   * Steht im Frontmatter, damit die Datei es weiß und nicht das Werkzeug:
   * wer eine `.md` weitergibt, gibt die Zugehörigkeit mit. Fehlt der
   * Schlüssel, gilt `nozilla`; nennt er ein unbekanntes Erscheinungsbild,
   * bleibt der Wert erhalten und die Oberfläche sagt es — stillschweigend im
   * falschen Gewand zu zeichnen wäre schlimmer als ein Hinweis.
   */
  theme?: string;
  /** Unbekannte Frontmatter-Schlüssel überleben einen Lade-/Speicherzyklus. */
  extra?: Record<string, unknown>;
}

export interface Deck {
  meta: DeckMeta;
  slides: Slide[];
}

/* -------------------------------------------------------------------------- */
/* Helfer                                                                      */
/* -------------------------------------------------------------------------- */

export function maxRevealStep(slide: Slide): number {
  return slide.elements.reduce((max, el) => Math.max(max, el.reveal?.step ?? 0), 0);
}

/** Der Titel, unter dem eine Folie in Übersicht und Filmstreifen läuft. */
export function slideTitle(slide: Slide, index: number): string {
  const heading = slide.markdown.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m);
  if (heading?.[1]) return stripInline(heading[1]);

  const firstText = slide.elements
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .find(
      (el): el is TextElement | CardElement =>
        (el.kind === 'text' && Boolean(el.text.trim())) ||
        (el.kind === 'card' && Boolean(el.title.trim())),
    );
  if (firstText) {
    return stripInline(firstText.kind === 'text' ? firstText.text : firstText.title).slice(0, 60);
  }

  const firstLine = slide.markdown
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine) return stripInline(firstLine).slice(0, 60);

  return `Folie ${index + 1}`;
}

function stripInline(input: string): string {
  return input
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
