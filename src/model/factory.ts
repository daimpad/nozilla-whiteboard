/**
 * Elemente bauen und einlesen.
 *
 * `createElement` ist der einzige Weg, auf dem ein Element ins Dokument kommt.
 * Genau das macht die Zusage „alles erbt automatisch die CI" strukturell statt
 * zu einer Konvention, an die sich jemand erinnern muss.
 *
 * `normalizeElement` ist der nachsichtige Zwilling: es repariert von Hand
 * geschriebenes YAML aus einer `.md` zu einem gültigen, vollständig
 * vorbelegten Element — ein Tippfehler kostet einen Standardwert, nicht die
 * ganze Datei.
 */
import { canvas, elementDefaults, elementTones, revealAnimations, typeScale } from '@/theme';
import type { RevealAnimation, ShadowName, StrokeName, ToneName, TypeStyleName } from '@/theme';
import type { IconName } from '@/assets/icons';
import {
  cardVariants,
  connectorKinds,
  elementKinds,
  fillStyles,
  horizontalAligns,
  iconFrames,
  shapeNames,
  verticalAligns,
  chartKinds,
  wordmarkVariants,
  type CanvasElement,
  type ElementBase,
  type ElementKind,
  type FillStyle,
} from './types';

let idCounter = 0;

/** Kurze, stabile, lesbare Ids — sie landen in der gespeicherten Markdown-Datei. */
export function createId(prefix = 'el'): string {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${idCounter.toString(36)}${random}`;
}

/** Den Zähler zurücksetzen — für Tests mit erwartbarer Ausgabe. */
export function __resetIdCounter(value = 0): void {
  idCounter = value;
}

const defaultFill: Record<ElementKind, FillStyle> = {
  text: 'none',
  markdown: 'none',
  card: 'framed',
  badge: 'framed',
  icon: 'none',
  shape: 'framed',
  connector: 'none',
  image: 'outline',
  wordmark: 'none',
  chart: 'framed',
  // Ein Rahmen um eine Tabelle, deren Zeilen schon Linien haben, sind zwei
  // Gitter übereinander.
  table: 'none',
};

const defaultShadow: Record<ElementKind, ShadowName> = {
  text: 'none',
  markdown: 'none',
  card: 'md',
  badge: 'sm',
  icon: 'none',
  shape: 'none',
  connector: 'none',
  image: 'md',
  wordmark: 'none',
  chart: 'none',
  table: 'none',
};

const defaultPadding: Record<ElementKind, number> = {
  text: elementDefaults.text.padding,
  markdown: elementDefaults.markdown.padding,
  card: elementDefaults.card.padding,
  badge: 16,
  icon: 12,
  shape: 20,
  connector: 0,
  image: 0,
  wordmark: 0,
  chart: elementDefaults.chart.padding,
  table: elementDefaults.table.padding,
};

const defaultStroke: Record<ElementKind, StrokeName> = {
  text: 'hair',
  markdown: elementDefaults.markdown.strokeWeight,
  card: elementDefaults.card.strokeWeight,
  badge: elementDefaults.badge.strokeWeight,
  icon: elementDefaults.icon.strokeWeight,
  shape: elementDefaults.shape.strokeWeight,
  connector: elementDefaults.connector.strokeWeight,
  image: 'rule',
  wordmark: 'hair',
  chart: elementDefaults.chart.strokeWeight,
  table: elementDefaults.table.strokeWeight,
};

const defaultSize: Record<ElementKind, { w: number; h: number }> = {
  text: { w: elementDefaults.text.width, h: elementDefaults.text.height },
  markdown: { w: elementDefaults.markdown.width, h: elementDefaults.markdown.height },
  card: { w: elementDefaults.card.width, h: elementDefaults.card.height },
  badge: { w: elementDefaults.badge.width, h: elementDefaults.badge.height },
  icon: { w: elementDefaults.icon.width, h: elementDefaults.icon.height },
  shape: { w: elementDefaults.shape.width, h: elementDefaults.shape.height },
  connector: { w: elementDefaults.connector.width, h: elementDefaults.connector.height },
  image: { w: elementDefaults.image.width, h: elementDefaults.image.height },
  wordmark: { w: elementDefaults.wordmark.width, h: elementDefaults.wordmark.height },
  chart: { w: elementDefaults.chart.width, h: elementDefaults.chart.height },
  table: { w: elementDefaults.table.width, h: elementDefaults.table.height },
};

const defaultTone: Record<ElementKind, ToneName> = {
  text: elementDefaults.text.tone,
  markdown: elementDefaults.markdown.tone,
  card: elementDefaults.card.tone,
  badge: elementDefaults.badge.tone,
  icon: elementDefaults.icon.tone,
  shape: elementDefaults.shape.tone,
  connector: elementDefaults.connector.tone,
  image: elementDefaults.image.tone,
  wordmark: elementDefaults.wordmark.tone,
  chart: elementDefaults.chart.tone,
  table: elementDefaults.table.tone,
};

function baseFor(kind: ElementKind): ElementBase {
  const size = defaultSize[kind];
  return {
    id: createId(kind),
    kind,
    x: Math.round((canvas.width - size.w) / 2),
    y: Math.round((canvas.height - size.h) / 2),
    w: size.w,
    h: size.h,
    rotation: 0,
    z: 0,
    tone: defaultTone[kind],
    fill: defaultFill[kind],
    strokeWeight: defaultStroke[kind],
    shadow: defaultShadow[kind],
    padding: defaultPadding[kind],
    opacity: 1,
    locked: false,
  };
}

type ElementOf<K extends ElementKind> = Extract<CanvasElement, { kind: K }>;

/**
 * Ein vollständiges, CI-vorbelegtes Element bauen. `patch` darf alles
 * überschreiben — was fehlt, kommt aus der CI.
 */
export function createElement<K extends ElementKind>(
  kind: K,
  patch: Partial<ElementOf<K>> = {},
): ElementOf<K> {
  const base = baseFor(kind);
  let element: CanvasElement;

  switch (kind) {
    case 'text':
      element = {
        ...base,
        kind: 'text',
        text: 'Text',
        typeStyle: elementDefaults.text.typeStyle,
        align: elementDefaults.text.align,
        valign: 'top',
      };
      break;
    case 'markdown':
      element = {
        ...base,
        kind: 'markdown',
        markdown: '### Zwischentitel\n\nFließtext.',
        align: 'left',
      };
      break;
    case 'card':
      element = {
        ...base,
        kind: 'card',
        variant: 'feature',
        title: 'Titel der Karte',
        body: 'Ein Satz, der behauptet, was die Karte behauptet.',
        icon: 'square-check',
      };
      break;
    case 'badge':
      element = { ...base, kind: 'badge', text: 'Label' };
      break;
    case 'icon':
      element = { ...base, kind: 'icon', icon: 'square-check', frame: 'none' };
      break;
    case 'shape':
      element = { ...base, kind: 'shape', shape: 'rectangle' };
      break;
    case 'connector':
      element = { ...base, kind: 'connector', connector: 'arrow', dashed: false };
      break;
    case 'image':
      element = { ...base, kind: 'image', src: '', alt: '', fit: 'contain' };
      break;
    case 'wordmark':
      element = { ...base, kind: 'wordmark', variant: 'auto' };
      break;
    case 'chart':
      element = {
        ...base,
        kind: 'chart',
        chart: 'bar',
        // Drei Zeilen als Anschauung: man sieht sofort, wie die Zahlen
        // hineinkommen, und muss nichts nachschlagen.
        data: '2023  38\n2024  52\n* 2025  61',
        label: '',
        values: true,
      };
      break;
    case 'table':
      element = {
        ...base,
        kind: 'table',
        // Wie beim Diagramm: drei Zeilen als Anschauung, damit man sieht, wie
        // die Zellen hineinkommen, statt es nachschlagen zu müssen.
        data: 'Was  Wert\nErste Zeile  12\nZweite Zeile  34',
        header: true,
        label: '',
      };
      break;
    default:
      throw new Error(`Unbekannte Elementart: ${String(kind)}`);
  }

  return { ...element, ...patch } as ElementOf<K>;
}

/** Ein Element mit frischer Id kopieren, um `offset` Folien-Einheiten versetzt. */
/**
 * Gruppenkennungen einer Auswahl frisch vergeben.
 *
 * Ohne das trüge jede Kopie die Kennung ihres Originals — und wäre damit
 * dieselbe Gruppe. Wer eine Gruppe dupliziert und die Kopie wegzieht, nähme
 * das Original mit.
 */
export function regroupElements(elements: readonly CanvasElement[]): CanvasElement[] {
  const neu = new Map<string, string>();
  return elements.map((element) => {
    if (!element.group) return element;
    if (!neu.has(element.group)) neu.set(element.group, createId('group'));
    return { ...element, group: neu.get(element.group) } as CanvasElement;
  });
}

export function duplicateElement(
  element: CanvasElement,
  offset = canvas.gridSize * 3,
): CanvasElement {
  return {
    ...element,
    id: createId(element.kind),
    x: element.x + offset,
    y: element.y + offset,
  } as CanvasElement;
}

/* -------------------------------------------------------------------------- */
/* Einlesen                                                                    */
/* -------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Ein Icon-Name wird übernommen, wie er dasteht — auch wenn das gerade gültige
 * Set ihn nicht kennt.
 *
 * Früher prüfte das hier gegen die 554 nozilla-Namen und warf alles andere weg.
 * Seit ein Erscheinungsbild sein eigenes Set mitbringt, wäre das eine stille
 * Enteignung: ein Deck unter fremder Marke, das in einer Sitzung ohne deren Set
 * geöffnet und gespeichert wird, verlöre jedes Icon. Dieselbe Entscheidung wie
 * bei `DeckMeta.theme` — den Wert behalten, die Lücke zeigen. Die Fläche
 * zeichnet ein leeres Quadrat, der Inspektor schreibt „not in this set" daneben.
 */
function optionalIcon(value: unknown): IconName | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export function normalizeElement(raw: unknown, index = 0): CanvasElement | null {
  if (!isRecord(raw)) return null;

  const kind = oneOf(raw.kind, elementKinds, 'shape');
  const size = defaultSize[kind];
  const base: ElementBase = {
    id: str(raw.id) || createId(kind),
    kind,
    x: num(raw.x, canvas.gridSize * 8),
    y: num(raw.y, canvas.gridSize * 8),
    w: Math.max(1, num(raw.w, size.w)),
    h: Math.max(kind === 'connector' ? 0 : 1, num(raw.h, size.h)),
    rotation: num(raw.rotation, 0),
    z: num(raw.z, index),
    tone: oneOf(raw.tone, Object.keys(elementTones) as ToneName[], defaultTone[kind]),
    fill: oneOf(raw.fill, fillStyles, defaultFill[kind]),
    strokeWeight: oneOf(
      raw.strokeWeight ?? raw.stroke,
      ['hair', 'rule', 'strong', 'heavy'] as const,
      defaultStroke[kind],
    ),
    shadow: oneOf(raw.shadow, ['none', 'sm', 'md', 'lg'] as const, defaultShadow[kind]),
    padding: num(raw.padding, defaultPadding[kind]),
    opacity: Math.min(1, Math.max(0, num(raw.opacity, 1))),
    locked: bool(raw.locked, false),
  };

  if (typeof raw.name === 'string' && raw.name.trim()) base.name = raw.name;
  if (typeof raw.group === 'string' && raw.group.trim()) base.group = raw.group.trim();

  const reveal = normalizeReveal(raw.reveal);
  if (reveal) base.reveal = reveal;

  switch (kind) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        text: str(raw.text),
        typeStyle: oneOf(raw.typeStyle, Object.keys(typeScale) as TypeStyleName[], 'h4'),
        align: oneOf(raw.align, horizontalAligns, 'left'),
        valign: oneOf(raw.valign, verticalAligns, 'top'),
      };
    case 'markdown':
      return {
        ...base,
        kind: 'markdown',
        markdown: str(raw.markdown ?? raw.content ?? raw.text),
        align: oneOf(raw.align, horizontalAligns, 'left'),
      };
    case 'card':
      return {
        ...base,
        kind: 'card',
        variant: oneOf(raw.variant, cardVariants, 'feature'),
        label: typeof raw.label === 'string' ? raw.label : undefined,
        title: str(raw.title),
        body: str(raw.body),
        icon: optionalIcon(raw.icon),
      };
    case 'badge':
      return { ...base, kind: 'badge', text: str(raw.text), icon: optionalIcon(raw.icon) };
    case 'icon':
      return {
        ...base,
        kind: 'icon',
        icon: optionalIcon(raw.icon) ?? 'square-check',
        frame: oneOf(raw.frame, iconFrames, 'none'),
      };
    case 'shape':
      return {
        ...base,
        kind: 'shape',
        shape: oneOf(raw.shape, shapeNames, 'rectangle'),
        label: typeof raw.label === 'string' ? raw.label : undefined,
        labelStyle:
          typeof raw.labelStyle === 'string'
            ? oneOf(raw.labelStyle, Object.keys(typeScale) as TypeStyleName[], 'body')
            : undefined,
      };
    case 'connector':
      return {
        ...base,
        kind: 'connector',
        connector: oneOf(raw.connector, connectorKinds, 'arrow'),
        dashed: bool(raw.dashed, false),
        label: typeof raw.label === 'string' ? raw.label : undefined,
      };
    case 'image':
      return {
        ...base,
        kind: 'image',
        src: str(raw.src),
        alt: str(raw.alt),
        fit: oneOf(raw.fit, ['cover', 'contain'] as const, 'contain'),
      };
    case 'wordmark':
      return { ...base, kind: 'wordmark', variant: oneOf(raw.variant, wordmarkVariants, 'auto') };
    case 'chart':
      return {
        ...base,
        kind: 'chart',
        chart: oneOf(raw.chart, chartKinds, 'bar'),
        data: str(raw.data),
        label: str(raw.label),
        values: bool(raw.values, true),
      };
    case 'table':
      return {
        ...base,
        kind: 'table',
        data: str(raw.data),
        header: bool(raw.header, true),
        label: str(raw.label),
      };
    default:
      return null;
  }
}

function normalizeReveal(raw: unknown): { step: number; animation: RevealAnimation } | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return { step: Math.floor(raw), animation: 'rise' };
  }
  if (!isRecord(raw)) return null;
  const step = Math.floor(num(raw.step, 0));
  if (step <= 0) return null;
  return { step, animation: oneOf(raw.animation, revealAnimations, 'rise') };
}

/* -------------------------------------------------------------------------- */
/* Schreiben                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Alles weglassen, was noch dem CI-Standard entspricht. Die gespeicherte
 * Markdown-Datei trägt dann nur, was jemand wirklich entschieden hat. Position
 * und Größe bleiben immer stehen — sie sind der ganze Zweck der Übung.
 */
export function minimizeElement(element: CanvasElement): Record<string, unknown> {
  const kind = element.kind;
  const out: Record<string, unknown> = {
    id: element.id,
    kind,
    x: round2(element.x),
    y: round2(element.y),
    w: round2(element.w),
    h: round2(element.h),
  };

  const keepIfChanged = <T>(key: string, value: T, fallback: T) => {
    if (value !== fallback && value !== undefined) out[key] = value;
  };

  keepIfChanged('rotation', round2(element.rotation), 0);
  keepIfChanged('z', element.z, 0);
  keepIfChanged('tone', element.tone, defaultTone[kind]);
  keepIfChanged('fill', element.fill, defaultFill[kind]);
  keepIfChanged('strokeWeight', element.strokeWeight, defaultStroke[kind]);
  keepIfChanged('shadow', element.shadow, defaultShadow[kind]);
  keepIfChanged('padding', round2(element.padding), defaultPadding[kind]);
  keepIfChanged('opacity', round2(element.opacity), 1);
  keepIfChanged('locked', element.locked, false);
  if (element.name) out.name = element.name;
  if (element.group) out.group = element.group;
  if (element.reveal && element.reveal.step > 0) {
    out.reveal = { step: element.reveal.step, animation: element.reveal.animation };
  }

  switch (element.kind) {
    case 'text':
      out.text = element.text;
      keepIfChanged('typeStyle', element.typeStyle, 'h4');
      keepIfChanged('align', element.align, 'left');
      keepIfChanged('valign', element.valign, 'top');
      break;
    case 'markdown':
      out.markdown = element.markdown;
      keepIfChanged('align', element.align, 'left');
      break;
    case 'card':
      keepIfChanged('variant', element.variant, 'feature');
      if (element.label) out.label = element.label;
      out.title = element.title;
      out.body = element.body;
      if (element.icon) out.icon = element.icon;
      break;
    case 'badge':
      out.text = element.text;
      if (element.icon) out.icon = element.icon;
      break;
    case 'icon':
      out.icon = element.icon;
      keepIfChanged('frame', element.frame, 'none');
      break;
    case 'shape':
      out.shape = element.shape;
      if (element.label) out.label = element.label;
      if (element.labelStyle) out.labelStyle = element.labelStyle;
      break;
    case 'connector':
      out.connector = element.connector;
      keepIfChanged('dashed', element.dashed, false);
      if (element.label) out.label = element.label;
      break;
    case 'image':
      out.src = element.src;
      if (element.alt) out.alt = element.alt;
      keepIfChanged('fit', element.fit, 'contain');
      break;
    case 'wordmark':
      keepIfChanged('variant', element.variant, 'auto');
      break;
    case 'chart':
      out.chart = element.chart;
      out.data = element.data;
      if (element.label) out.label = element.label;
      keepIfChanged('values', element.values, true);
      break;
    case 'table':
      out.data = element.data;
      if (element.label) out.label = element.label;
      keepIfChanged('header', element.header, true);
      break;
  }

  return out;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
