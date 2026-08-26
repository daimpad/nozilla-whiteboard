/**
 * Die CI-Palette der platzierbaren Bausteine.
 *
 * Nur das hier lässt sich auf eine Fläche legen. Jeder Eintrag ist ein
 * Teil-Element, das über die CI-Vorgaben gelegt wird — „erbt automatisch die
 * CI" ist damit strukturell und keine Konvention.
 */
import { typeScale } from '@/theme';
import type { CanvasElement, ElementKind } from '@/model/types';

export const presetGroups = ['type', 'cards', 'labels', 'shapes', 'connectors', 'brand'] as const;
export type PresetGroup = (typeof presetGroups)[number];

export interface AssetPreset {
  id: string;
  label: string;
  group: PresetGroup;
  kind: ElementKind;
  patch: Partial<CanvasElement>;
  hint?: string;
}

export const presetGroupLabels: Record<PresetGroup, string> = {
  type: 'Typografie',
  cards: 'Karten',
  labels: 'Labels',
  shapes: 'Formen',
  connectors: 'Verbinder',
  brand: 'Marke & Medien',
};

const preset = <K extends ElementKind>(
  id: string,
  label: string,
  group: PresetGroup,
  kind: K,
  patch: Partial<Extract<CanvasElement, { kind: K }>>,
  hint?: string,
): AssetPreset => ({ id, label, group, kind, patch: patch as Partial<CanvasElement>, hint });

export const assetPresets: AssetPreset[] = [
  /* ------------------------------------------------------------ Typografie */
  preset(
    'text-display',
    'Kampagnensatz',
    'type',
    'text',
    { text: 'Gute digitale Dienste.', typeStyle: 'display', w: 1104, h: 260 },
    'Die größte Stufe der Auszeichnungsschrift — für den einen Satz',
  ),
  preset('text-headline', 'Headline', 'type', 'text', {
    text: 'Wir bauen wartbare Plattformen.',
    typeStyle: 'headline',
    w: 1000,
    h: 180,
  }),
  preset('text-h1', 'Überschrift 1', 'type', 'text', {
    text: 'Überschrift',
    typeStyle: 'h1',
    w: 800,
    h: 70,
  }),
  preset('text-h2', 'Überschrift 2', 'type', 'text', {
    text: 'Zwischentitel',
    typeStyle: 'h2',
    w: 640,
    h: 52,
  }),
  preset('text-h3', 'Überschrift 3', 'type', 'text', {
    text: 'Kleiner Titel',
    typeStyle: 'h3',
    w: 520,
    h: 40,
  }),
  preset('text-lead', 'Lead', 'type', 'text', {
    text: 'Ein Satz, der etwas behauptet — und den die nächste Folie belegt.',
    typeStyle: 'lead',
    w: 620,
    h: 100,
  }),
  preset('text-body', 'Fließtext', 'type', 'text', {
    text: 'Fließtext in der Grundstufe, Zeilenhöhe 1,55.',
    typeStyle: 'body',
    w: 520,
    h: 90,
  }),
  preset('text-small', 'Kleintext', 'type', 'text', {
    text: 'Quelle, Fußnote, Randbemerkung',
    typeStyle: 'small',
    w: 400,
    h: 30,
  }),
  preset(
    'text-label',
    'Label',
    'type',
    'text',
    { text: 'Abschnitt', typeStyle: 'label', w: 300, h: 20 },
    'Label-Schrift, ALL-CAPS, gesperrt — wird automatisch gesetzt',
  ),
  /* ------------------------------------------------------------ Diagramme */
  preset(
    'chart-bar',
    'Balken',
    'cards',
    'chart',
    {
      chart: 'bar',
      label: 'Laufzeit in Tagen',
      data: '2023  38\n2024  52\n* 2025  61',
    },
    'Zahlen als Balken — ein Wert mit * davor bekommt das Signal',
  ),
  preset(
    'chart-line',
    'Linie',
    'cards',
    'chart',
    {
      chart: 'line',
      label: 'Wartungsaufwand',
      data: 'Q1  62\nQ2  48\nQ3  35\nQ4  28',
    },
    'Ein Verlauf über die Zeit',
  ),
  preset(
    'table',
    'Tabelle',
    'cards',
    'table',
    {
      label: '',
      data: 'Was  Tasten\nFolie vor / zurück  → ←\nÜbersicht  ⌘K\nPräsentieren  P',
      header: true,
    },
    'Zellen tippen oder aus einer Tabellenkalkulation hineinkopieren',
  ),
  preset(
    'markdown-block',
    'Markdown-Block',
    'type',
    'markdown',
    {
      markdown: '### Zwischentitel\n\n- Erster Punkt\n- Zweiter Punkt\n- Dritter Punkt',
      w: 520,
      h: 240,
    },
    'Volles Markdown, gesetzt in der CI-Hierarchie',
  ),
  preset(
    'markdown-panel',
    'Markdown-Fläche',
    'type',
    'markdown',
    {
      markdown:
        'Markdown auf einer Fläche.\n\nDer ==grüne Marker== schreibt sich `==so==`.\n\n```ts\nexport const brand = "nozilla";\n```',
      fill: 'framed',
      shadow: 'md',
      w: 560,
      h: 300,
    },
    'Mit Kontur und hartem Schatten',
  ),

  /* ---------------------------------------------------------------- Karten */
  preset('card-feature', 'Karte', 'cards', 'card', {
    variant: 'feature',
    icon: 'square-check',
    title: 'Was wir machen',
    body: 'Ein Satz, der die Behauptung der Karte trägt.',
    w: 340,
    h: 240,
  }),
  preset('card-stat', 'Zahl', 'cards', 'card', {
    variant: 'stat',
    label: 'Laufzeit',
    title: '38 %',
    body: 'weniger Wartungsaufwand',
    w: 300,
    h: 210,
  }),
  preset('card-step', 'Schritt', 'cards', 'card', {
    variant: 'step',
    label: '1',
    title: 'Verstehen',
    body: 'Was in dieser Phase passiert.',
    w: 300,
    h: 230,
  }),
  preset('card-quote', 'Zitat', 'cards', 'card', {
    variant: 'quote',
    title: 'Wir schreiben Sätze, die etwas behaupten.',
    body: 'nozilla',
    w: 460,
    h: 220,
  }),
  preset('card-note', 'Hinweis', 'cards', 'card', {
    variant: 'note',
    icon: 'circle-info',
    title: 'Worauf es ankommt',
    body: 'Eine Randbemerkung, die nicht untergehen darf.',
    w: 440,
    h: 170,
  }),
  preset(
    'card-signal',
    'Karte, Signal',
    'cards',
    'card',
    {
      variant: 'feature',
      icon: 'rocket',
      title: 'Der eine Punkt',
      body: 'Signal-Grün trägt eine Folie — nicht fünf.',
      tone: 'signal',
      w: 340,
      h: 240,
    },
    'Sparsam: 5 % der Fläche',
  ),
  preset('card-ink', 'Karte, Tinte', 'cards', 'card', {
    variant: 'feature',
    icon: 'terminal',
    title: 'Invers',
    body: 'Tinte als Fläche, Papier als Schrift.',
    tone: 'ink',
    w: 340,
    h: 240,
  }),

  /* ---------------------------------------------------------------- Labels */
  preset('badge-signal', 'Badge Signal', 'labels', 'badge', {
    text: 'Neu',
    tone: 'signal',
    w: 128,
    h: 40,
  }),
  preset('badge-paper', 'Badge Papier', 'labels', 'badge', {
    text: 'In Arbeit',
    tone: 'paper',
    w: 176,
    h: 40,
  }),
  preset('badge-ink', 'Badge Tinte', 'labels', 'badge', {
    text: 'Abgelöst',
    tone: 'ink',
    w: 176,
    h: 40,
  }),
  preset('badge-icon', 'Badge mit Icon', 'labels', 'badge', {
    text: 'Fertig',
    icon: 'check',
    tone: 'signal',
    w: 196,
    h: 44,
  }),

  /* ---------------------------------------------------------------- Formen */
  preset('shape-rectangle', 'Rechteck', 'shapes', 'shape', { shape: 'rectangle', w: 280, h: 180 }),
  preset('shape-rectangle-shadow', 'Rechteck mit Schatten', 'shapes', 'shape', {
    shape: 'rectangle',
    shadow: 'md',
    w: 280,
    h: 180,
  }),
  preset('shape-outline', 'Nur Kontur', 'shapes', 'shape', {
    shape: 'rectangle',
    fill: 'outline',
    strokeWeight: 'strong',
    w: 280,
    h: 180,
  }),
  preset('shape-ellipse', 'Ellipse', 'shapes', 'shape', { shape: 'ellipse', w: 200, h: 200 }),
  preset('shape-diamond', 'Raute', 'shapes', 'shape', { shape: 'diamond', w: 200, h: 200 }),
  preset('shape-triangle', 'Dreieck', 'shapes', 'shape', { shape: 'triangle', w: 200, h: 170 }),
  preset('shape-hexagon', 'Sechseck', 'shapes', 'shape', { shape: 'hexagon', w: 220, h: 190 }),
  preset('shape-chevron', 'Chevron', 'shapes', 'shape', {
    shape: 'chevron',
    label: 'Phase',
    w: 260,
    h: 88,
  }),
  preset('shape-banner', 'Banner', 'shapes', 'shape', {
    shape: 'banner',
    label: 'Banner',
    tone: 'signal',
    w: 280,
    h: 64,
  }),
  preset('shape-callout', 'Sprechblase', 'shapes', 'shape', {
    shape: 'callout',
    label: 'Kurze Notiz',
    w: 280,
    h: 170,
  }),
  preset('shape-frame', 'Eckwinkel', 'shapes', 'shape', {
    shape: 'frame',
    fill: 'outline',
    strokeWeight: 'heavy',
    w: 340,
    h: 240,
  }),
  preset('shape-bracket', 'Klammer', 'shapes', 'shape', {
    shape: 'bracket',
    fill: 'outline',
    strokeWeight: 'strong',
    w: 48,
    h: 240,
  }),
  preset('shape-cross', 'Kreuz', 'shapes', 'shape', { shape: 'cross', w: 180, h: 180 }),

  /* ------------------------------------------------------------- Verbinder */
  preset('connector-arrow', 'Pfeil', 'connectors', 'connector', {
    connector: 'arrow',
    w: 240,
    h: 0,
  }),
  preset('connector-line', 'Linie', 'connectors', 'connector', {
    connector: 'line',
    w: 240,
    h: 0,
  }),
  preset('connector-double', 'Doppelpfeil', 'connectors', 'connector', {
    connector: 'double-arrow',
    w: 260,
    h: 0,
  }),
  preset('connector-elbow', 'Winkel', 'connectors', 'connector', {
    connector: 'elbow',
    w: 240,
    h: 140,
  }),
  preset('connector-dashed', 'Gestrichelt', 'connectors', 'connector', {
    connector: 'arrow',
    dashed: true,
    w: 240,
    h: 0,
  }),
  preset('connector-rule', 'Regel', 'connectors', 'connector', {
    connector: 'line',
    strokeWeight: 'heavy',
    w: 300,
    h: 0,
  }),

  /* --------------------------------------------------------------- Marke   */
  preset(
    'wordmark',
    'Wortmarke',
    'brand',
    'wordmark',
    { w: 320, h: 80 },
    'Nie drehen, nie umfärben, nie verzerren, nie mit Schatten',
  ),
  preset(
    'wordmark-large',
    'Wortmarke groß',
    'brand',
    'wordmark',
    { w: 560, h: 140 },
    'Mindestgröße digital: 96 px Wortmarkenbreite',
  ),
  preset(
    'image-placeholder',
    'Bild',
    'brand',
    'image',
    { w: 440, h: 280, shadow: 'md' },
    'Datei auf die Fläche ziehen — Fotografie schwarzweiß mit Korn',
  ),
];

export function presetsByGroup(group: PresetGroup): AssetPreset[] {
  return assetPresets.filter((entry) => entry.group === group);
}

/** Die Typo-Stufen, die der Inspektor anbietet — in CI-Reihenfolge. */
export const typeStyleOptions = Object.keys(typeScale) as Array<keyof typeof typeScale>;
