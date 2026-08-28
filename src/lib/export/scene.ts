/**
 * Folie → Szene.
 *
 * Eine `Scene` ist eine flache, vollständig aufgelöste Liste von Zeichen-
 * Primitiven in Folien-Koordinaten. Kein Markdown, kein CSS, kein DOM: jede
 * Farbe ist ein Literal, jeder Textlauf sitzt, jede Kurve ist ein Bézier.
 * Canvas, SVG-Export und PDF-Export sind danach nur noch Übersetzer über
 * derselben Szene — deshalb können sie nicht auseinanderlaufen.
 *
 * Zwei CI-Eigenheiten sind hier eingebaut, nicht aufgesetzt:
 *   • Es gibt keinen Radius. Rechtecke sind Rechtecke.
 *   • Schatten sind eine zweite, versetzte Fläche in Tinte — keine Weichzeichnung.
 *     Genau deshalb exportieren sie exakt, auch nach PDF.
 */
import {
  canvas as canvasTokens,
  color as ci,
  elementTones,
  palette,
  paperAlpha,
  wordmark,
  shadowSize,
  stroke as strokeTokens,
  strokeWidth as strokeWidthOf,
  typeScale,
} from '@/theme';
import {
  iconDef,
  iconGrid,
  iconStrokeGrid,
  type IconName,
  type IconPaintRole,
  type IconPrim,
} from '@/assets/icons';
import {
  circleSegs,
  ellipseSegs,
  matMultiply,
  matRotateAbout,
  matScale,
  matTranslate,
  parsePath,
  polySegs,
  transformSegs,
  type Mat,
  type Seg,
} from '@/lib/geometry/path';
import { connectorGeometry, shapeGeometry } from '@/lib/geometry/shapes';
import { chartScale, parseChartData } from '@/lib/chart';
import { parseTable, toMarkdownTable } from '@/lib/table';
import { flowFrame, flowOffsetY, footerFrame } from '@/lib/layout/slideLayout';
import { font, measureText, type FontSpec } from '@/lib/text/measure';
import { typesetMarkdown, typesetText, type TypesetResult } from '@/lib/text/typeset';
import type { CanvasElement, CardElement, Deck, Slide, SlideBackground } from '@/model/types';

/* -------------------------------------------------------------------------- */
/* Szenen-Modell                                                               */
/* -------------------------------------------------------------------------- */

export interface ScenePaint {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
  /** Die CI zeichnet mit `square`-Enden; `butt` nur, wo eine Linie exakt enden muss. */
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round';
}

export interface SceneRun {
  dx: number;
  text: string;
  font: FontSpec;
  color: string;
  underline?: boolean;
  strike?: boolean;
  width: number;
}

export type ScenePrim =
  | ({ t: 'rect'; x: number; y: number; w: number; h: number } & ScenePaint)
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & ScenePaint)
  | ({ t: 'path'; segs: Seg[]; closed: boolean } & ScenePaint)
  | {
      t: 'text';
      x: number;
      y: number;
      runs: SceneRun[];
      /** Grad, um (x, y). */
      rotate?: number;
      opacity?: number;
    }
  | {
      t: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      href: string;
      /**
       * Was auf dem Bild zu sehen ist, in Worten.
       *
       * Gehört in die **Szene** und nicht nur ins Modell, weil jede Ausgabe
       * es braucht und keine es sich selbst zusammenreimen kann: das SVG
       * schreibt einen `<title>`, PPTX eine Beschreibung. Vorher stand der
       * Alternativtext im Inspektor, ging aber nur nach PowerPoint — und dort
       * als Anzeigename, den keine Hilfstechnik liest.
       */
      alt?: string;
      opacity?: number;
      rotate?: number;
    };

export interface Scene {
  width: number;
  height: number;
  background: string;
  prims: ScenePrim[];
  title: string;
}

export interface SceneOptions {
  /** Fußzeile und Foliennummer mitzeichnen. */
  chrome?: boolean;
  slideNumber?: number;
  totalSlides?: number;
  /** Nur Elemente bis zu diesem Einblendschritt. `Infinity` = alle. */
  revealStep?: number;
  resolveImageSize?: (src: string) => { w: number; h: number } | undefined;
}

/* -------------------------------------------------------------------------- */
/* Untergründe                                                                 */
/* -------------------------------------------------------------------------- */

export interface BackgroundStyle {
  fill: string;
  /** Die Tinte dieser Fläche — Schwarz auf Papier, Papier auf Schwarz. */
  ink: string;
  muted: string;
  line: string;
  signal: string;
  codeBackground: string;
  /** Die Farbe der harten Schatten auf dieser Fläche. */
  shadowColor: string;
  dots?: string;
}

/**
 * Die Grundzüge einer Papierfläche.
 *
 * Eine Funktion und keine Konstante: die Farben gehören dem gewählten
 * Erscheinungsbild. Auf Modulebene ausgewertet, behielte jede Folie die
 * Tinte, die beim Start des Werkzeugs galt.
 */
function paperBase() {
  return {
    ink: ci.ink,
    muted: ci.inkMuted,
    line: ci.line,
    signal: palette.signal,
    shadowColor: ci.ink,
  } as const;
}

/**
 * Welche Farbe ein Folienuntergrund malt.
 *
 * Zwei helle gibt es, und die Namen führen leicht in die Irre: **`paper` malt
 * das Weiß** des Erscheinungsbilds, **`cream` seinen warmen Papierton**. Das
 * ist kein Versehen, sondern eine Entscheidung von August 2026 — eine Folie
 * ist im Normalfall weiß, und das Creme steht daneben, wenn man es will. Der
 * Wert im Dateiformat heißt weiter `paper`, weil er in jeder bestehenden
 * `.md` so steht.
 *
 * Beide bleiben dabei **Rollen des Erscheinungsbilds** und keine festen
 * Werte: eine Marke, deren CI ein gebrochenes Weiß führt, belegt `white` neu
 * und bekommt es hier. Der Musterkunde führt für beides `#FFFFFF` — dann sind
 * die zwei Untergründe bei ihm dieselbe Farbe, und das ist seine CI, nicht
 * unser Fehler.
 *
 * Das Raster folgt dem Papier: „Raster" heißt *Papier mit Punkten*, und wenn
 * das Papier weiß ist, ist das Raster es auch. Ein cremefarbenes Raster neben
 * einem weißen Papier wäre ein dritter Ton, den niemand gewählt hat.
 */
export function backgroundStyle(background: SlideBackground): BackgroundStyle {
  switch (background) {
    case 'signal':
      return { ...paperBase(), fill: palette.signal, codeBackground: palette.signalSoft };
    case 'cream':
      /*
         Der Code-Untergrund ist hier das Weiß, weil `paperAlt` derselbe Ton
         wäre wie die Fläche — seit die drei Papiertöne der CI am 7. August zu
         einem zusammengelegt wurden, hatte ein Codeblock auf Papier gar keinen
         sichtbaren Untergrund mehr. Auf Weiß wäre er wieder da; hier ist er es
         nur, wenn die beiden hellen Töne einander abwechseln.
      */
      return { ...paperBase(), fill: palette.paper, codeBackground: palette.white };
    case 'grid':
      return {
        ...paperBase(),
        fill: palette.white,
        codeBackground: palette.paperAlt,
        dots: ci.grid,
      };
    case 'ink':
      return {
        fill: palette.ink,
        ink: palette.paper,
        muted: paperAlpha[70],
        line: palette.paper,
        signal: palette.signal,
        codeBackground: palette.ink800,
        shadowColor: palette.paper,
      };
    case 'paper':
    default:
      // Der Code-Untergrund bleibt der Papierton und ist auf Weiß endlich zu
      // sehen; auf dem alten cremefarbenen Papier war er dieselbe Farbe wie
      // die Fläche.
      return { ...paperBase(), fill: palette.white, codeBackground: palette.paperAlt };
  }
}

/* -------------------------------------------------------------------------- */
/* Szenenaufbau                                                                */
/* -------------------------------------------------------------------------- */

export function buildSlideScene(slide: Slide, deck: Deck, options: SceneOptions = {}): Scene {
  const { revealStep = Infinity } = options;
  const bg = backgroundStyle(slide.meta.background);

  const visible = slide.elements
    .filter((element) => (element.reveal?.step ?? 0) <= revealStep)
    .slice()
    .sort((a, b) => a.z - b.z);

  return {
    width: canvasTokens.width,
    height: canvasTokens.height,
    background: bg.fill,
    title: deck.meta.title,
    prims: [
      ...buildSlideBackdrop(slide, options),
      ...visible.flatMap((element) => buildElementPrims(element, bg, options)),
      ...buildSlideChrome(slide, deck, options),
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Das Handout                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Das Seitenverhältnis der DIN-A-Reihe.
 *
 * Keine erfundene Zahl, sondern die Eigenschaft, die A4 zu A4 macht: die
 * lange Kante ist die kurze mal Wurzel zwei. Eine Handout-Seite, die anders
 * proportioniert ist, druckt mit Rändern, die niemand wollte.
 */
const DIN_HOCH = Math.SQRT2;

/** Wie weit die Notizen unter der Folie beginnen. */
const NOTIZ_ABSTAND = canvasTokens.margin.top;

/**
 * Eine Folie mit ihren Notizen darunter, auf einer Seite im Hochformat.
 *
 * **Ohne die Folie neu zu zeichnen.** Die Seite ist so breit wie die Folie und
 * mal Wurzel zwei hoch; die Folie sitzt oben links und behält damit jede
 * Koordinate, die sie ohnehin hat. Das ist der ganze Trick, und er erspart
 * eine Rechnung, die es sonst gäbe: einen Weg, eine ganze Szene zu skalieren
 * — durch jeden Primitivtyp hindurch, samt der vorgemessenen Breiten in den
 * Textläufen. Zwei Wege, eine Folie zu zeichnen, wären genau das, was die
 * erste Regel dieses Projekts verbietet.
 *
 * Der Untergrund der Seite ist deshalb Papier und nicht der der Folie: die
 * Folie malt ihren eigenen über sich, und eine dunkle Folie soll nicht die
 * ganze Seite schwärzen. Der Haarstrich um sie herum ist der Grund, warum man
 * auf weißem Papier noch sieht, wo die Folie aufhört.
 */
export function buildHandoutScene(slide: Slide, deck: Deck, options: SceneOptions = {}): Scene {
  const folie = buildSlideScene(slide, deck, options);
  const papier = backgroundStyle('paper');

  const breite = canvasTokens.width;
  const hoehe = Math.round(breite * DIN_HOCH);
  const rand = canvasTokens.margin.left;

  const prims: ScenePrim[] = [
    { t: 'rect', x: 0, y: 0, w: breite, h: hoehe, fill: papier.fill },
    ...folie.prims,
    {
      t: 'rect',
      x: 0,
      y: 0,
      w: breite,
      h: canvasTokens.height,
      stroke: papier.line,
      strokeWidth: strokeWidthOf('hair'),
    },
  ];

  const notiz = (slide.meta.notes ?? '').trim();
  if (notiz) {
    const gesetzt = typesetMarkdown(notiz, {
      width: breite - rand * 2,
      baseStyle: 'body',
      resolveImageSize: options.resolveImageSize,
      palette: flowPalette(papier),
    });
    prims.push(...typesetToScene(gesetzt, rand, canvasTokens.height + NOTIZ_ABSTAND));
  }

  return {
    width: breite,
    height: hoehe,
    background: papier.fill,
    title: deck.meta.title,
    prims,
  };
}

/** Die Fläche, das optionale Punktraster und der gesetzte Fließtext. */
export function buildSlideBackdrop(slide: Slide, options: SceneOptions = {}): ScenePrim[] {
  const bg = backgroundStyle(slide.meta.background);
  const prims: ScenePrim[] = [];

  prims.push({
    t: 'rect',
    x: 0,
    y: 0,
    w: canvasTokens.width,
    h: canvasTokens.height,
    fill: bg.fill,
  });

  if (bg.dots) prims.push(...gridDots(bg.dots));

  const frame = flowFrame(slide.meta.layout);
  if (frame && slide.markdown.trim()) {
    const result = typesetMarkdown(slide.markdown, {
      width: frame.w,
      scale: frame.scale,
      align: frame.align,
      baseStyle: frame.baseStyle,
      resolveImageSize: options.resolveImageSize,
      palette: flowPalette(bg),
    });

    prims.push(...typesetToScene(result, frame.x, flowOffsetY(frame, result.height)));
  }

  return prims;
}

function flowPalette(bg: BackgroundStyle) {
  return {
    text: bg.ink,
    muted: bg.muted,
    accent: bg.ink,
    border: bg.line,
    codeText: bg.ink,
    codeBackground: bg.codeBackground,
    quoteBar: bg.ink,
    marker: bg.signal,
    markerText: ci.inkOnSignal,
  };
}

/**
 * Wie hoch die Wortmarke in der Fußzeile steht.
 *
 * Klein genug, dass sie eine Signatur bleibt und keine zweite Überschrift —
 * gerechnet aus der Labelgröße, damit sie mit der Typo-Leiter eines
 * Erscheinungsbilds mitwandert statt als feste Zahl danebenzustehen.
 */
const FOOTER_MARK = 1.4;

/** Fußzeile, Wortmarke und Foliennummer — Space Mono, ALL-CAPS, wie die CI es für Labels will. */
export function buildSlideChrome(
  slide: Slide,
  deck: Deck,
  options: SceneOptions = {},
): ScenePrim[] {
  if (options.chrome === false || slide.meta.bare) return [];

  const bg = backgroundStyle(slide.meta.background);
  const out: ScenePrim[] = [];
  const style = typeScale.labelSmall;
  const spec = font({
    family: style.family,
    size: style.size,
    weight: style.weight,
    tracking: style.tracking,
  });

  if (deck.meta.footer) {
    const text = deck.meta.footer.toLocaleUpperCase('de-DE');
    out.push({
      t: 'text',
      x: footerFrame.left,
      y: footerFrame.y,
      runs: [{ dx: 0, text, font: spec, color: bg.muted, width: measureText(text, spec) }],
    });
  }

  const mark = footerMark(bg.muted);
  out.push(...mark.prims);

  if (options.slideNumber) {
    const label = options.totalSlides
      ? `${options.slideNumber} / ${options.totalSlides}`
      : String(options.slideNumber);
    const width = measureText(label, spec);
    out.push({
      t: 'text',
      x: mark.numberRight - width,
      y: footerFrame.y,
      runs: [{ dx: 0, text: label, font: spec, color: bg.muted, width }],
    });
  }

  return out;
}

/**
 * Die Wortmarke der Fußzeile — Maß, Zeichnung und der Platz davor.
 *
 * Sie steht ganz außen rechts, die Foliennummer rückt davor: die Marke gehört
 * an die Ecke, die Nummer ist eine Hilfe für den Vortrag.
 *
 * Der Kasten ist genau so hoch wie die Zeichnung, denn die viewBox der Marke
 * sitzt eng am Bild — ihre Unterkante fällt damit mit der Grundlinie der
 * Fußzeile zusammen. Eine Marke mit Unterlängen säße etwas hoch; nozillas und
 * die des Musterkunden haben keine.
 *
 * Dass das hier steht und nicht in `buildSlideChrome`, hat einen Grund: der
 * PPTX-Weg setzt seine Fußzeile selbst — der *Text* ist dort die begründete
 * Ausnahme — und braucht trotzdem dieselbe Marke an derselben Stelle. Als die
 * Rechnung nur in der Szene stand, trugen Fläche, SVG und PDF die Marke und
 * die `.pptx` nicht. Aufgefallen ist es erst in LibreOffice.
 */
export function footerMark(letterColor: string): {
  w: number;
  h: number;
  prims: ScenePrim[];
  /** Wo die Foliennummer rechts endet. */
  numberRight: number;
} {
  const style = typeScale.labelSmall;
  const size = wordmarkSize(style.size * FOOTER_MARK);
  return {
    ...size,
    prims: wordmarkPrims(
      { x: footerFrame.right - size.w, y: footerFrame.y - size.h, w: size.w, h: size.h },
      letterColor,
      palette.signal,
    ),
    numberRight: footerFrame.right - size.w - style.size * 2,
  };
}

function gridDots(colorValue: string): ScenePrim[] {
  const out: ScenePrim[] = [];
  const step = canvasTokens.gridSize * canvasTokens.gridMajorEvery;
  for (let x = step; x < canvasTokens.width; x += step) {
    for (let y = step; y < canvasTokens.height; y += step) {
      // Quadrat statt Punkt — auch das Raster hält sich an die Formensprache.
      out.push({ t: 'rect', x: x - 1, y: y - 1, w: 2, h: 2, fill: colorValue });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Farbe eines Elements                                                        */
/* -------------------------------------------------------------------------- */

export interface ElementPaint {
  /** Fläche und Kontur des Körpers. */
  body: ScenePaint;
  /** Ob der Körper überhaupt eine Fläche hat (für den Schatten wichtig). */
  hasBody: boolean;
  text: string;
  muted: string;
  /** Tinte für Icons, Aufzählungen, Linien innerhalb des Elements. */
  ink: string;
  line: string;
  signal: string;
  codeBackground: string;
}

/**
 * Eine Flächenrolle plus einen Malstil in konkrete CI-Werte auflösen.
 * Es gibt genau vier Malstile, weil das CI genau vier kennt.
 */
export function elementPaint(
  element: CanvasElement,
  bg: BackgroundStyle = backgroundStyle('paper'),
): ElementPaint {
  const t = elementTones[element.tone] ?? elementTones.paper;
  const sw = strokeWidthOf(element.strokeWeight);

  // Ohne eigene Fläche erbt das Element die Tinte des Untergrunds — sonst
  // stünde schwarze Schrift auf schwarzem Grund.
  const bare = element.fill === 'none' || element.fill === 'outline';
  const text = bare ? bg.ink : t.text;
  const muted = bare ? bg.muted : t.textMuted;
  const line = bare ? bg.line : t.line;

  const body: ScenePaint =
    element.fill === 'none'
      ? {}
      : element.fill === 'outline'
        ? { stroke: line, strokeWidth: sw, lineJoin: 'miter', lineCap: 'square' }
        : element.fill === 'flat'
          ? { fill: t.surface }
          : {
              fill: t.surface,
              stroke: t.line,
              strokeWidth: sw,
              lineJoin: 'miter',
              lineCap: 'square',
            };

  return {
    body,
    hasBody: element.fill !== 'none',
    text,
    muted,
    ink: text,
    line,
    signal: element.tone === 'signal' && !bare ? ci.ink : bg.signal,
    codeBackground: bare ? bg.codeBackground : t.surfaceAlt,
  };
}

/** Die Drehung eines Elements als Matrix um seine eigene Mitte. */
function elementMatrix(element: CanvasElement): Mat {
  const base = matTranslate(element.x, element.y);
  if (!element.rotation) return base;
  return matMultiply(base, matRotateAbout(element.rotation, element.w / 2, element.h / 2));
}

/* -------------------------------------------------------------------------- */
/* Elemente zeichnen                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ein einzelnes Element malen. Exportiert, weil der Canvas genau durch diese
 * Funktion rendert — was man sieht, ist wirklich das, was exportiert wird.
 */
export function buildElementPrims(
  element: CanvasElement,
  bg: BackgroundStyle = backgroundStyle('paper'),
  options: SceneOptions = {},
): ScenePrim[] {
  const paint = elementPaint(element, bg);
  const matrix = elementMatrix(element);
  const opacity = element.opacity;
  const offset = shadowSize(element.shadow);
  const out: ScenePrim[] = [];

  /** Körper zeichnen — mit hartem Schatten darunter, wenn einer gesetzt ist. */
  const emitBody = (segs: Seg[], closed: boolean, style: ScenePaint = paint.body) => {
    if (offset > 0 && closed && (style.fill || style.stroke)) {
      out.push({
        t: 'path',
        segs: transformSegs(segs, matMultiply(matTranslate(offset, offset), matrix)),
        closed: true,
        fill: bg.shadowColor,
        opacity: opacity === 1 ? undefined : opacity,
      });
    }
    if (!style.fill && !style.stroke) return;
    out.push({
      t: 'path',
      segs: transformSegs(segs, matrix),
      closed,
      ...style,
      opacity: combineOpacity(opacity, style.opacity),
    });
  };

  const emitPath = (segs: Seg[], closed: boolean, style: ScenePaint) => {
    out.push({
      t: 'path',
      segs: transformSegs(segs, matrix),
      closed,
      lineJoin: 'miter',
      lineCap: 'square',
      ...style,
      opacity: combineOpacity(opacity, style.opacity),
    });
  };

  const boxSegs = () => polySegs([0, 0, element.w, 0, element.w, element.h, 0, element.h], true);

  switch (element.kind) {
    case 'shape': {
      const geometry = shapeGeometry(element.shape, element.w, element.h);
      emitBody(geometry.segs, geometry.closed);
      if (element.label?.trim()) {
        const result = typesetText(element.label, element.labelStyle ?? 'body', {
          width: Math.max(8, element.w - element.padding * 2),
          align: 'center',
          palette: elementTypesetPalette(paint),
        });
        out.push(
          ...typesetToScene(
            result,
            element.padding,
            Math.max(0, (element.h - result.height) / 2),
            matrix,
            opacity,
          ),
        );
      }
      break;
    }

    case 'connector': {
      const sw = strokeWidthOf(element.strokeWeight);
      const geometry = connectorGeometry(element.connector, element.w, element.h, sw);
      emitPath(geometry.segs, false, {
        stroke: paint.ink,
        strokeWidth: sw,
        lineCap: element.dashed ? 'butt' : 'square',
        dash: element.dashed ? [sw * 3, sw * 2.5] : undefined,
      });
      for (const head of geometry.heads) {
        emitPath(head, true, { fill: paint.ink });
      }
      if (element.label?.trim()) {
        const result = typesetText(element.label, 'label', {
          width: Math.max(40, element.w),
          align: 'center',
          palette: elementTypesetPalette(paint),
        });
        out.push(...typesetToScene(result, 0, -result.height - sw * 3, matrix, opacity));
      }
      break;
    }

    case 'badge': {
      emitBody(boxSegs(), true);

      const style = typeScale.label;
      const size = Math.min(style.size, element.h * 0.4);
      const spec = font({
        family: style.family,
        size,
        weight: style.weight,
        tracking: style.tracking,
      });
      const text = element.text.toLocaleUpperCase('de-DE');
      const iconSize = element.icon ? size * 1.6 : 0;
      const gap = element.icon ? size * 0.6 : 0;
      const textWidth = measureText(text, spec);
      const startX = (element.w - (iconSize + gap + textWidth)) / 2;
      const centerY = element.h / 2;

      if (element.icon) {
        out.push(
          ...iconScene(element.icon, {
            x: startX,
            y: centerY - iconSize / 2,
            size: iconSize,
            ink: paint.text,
            signal: paint.signal,
            strokeWidth: strokeWidthOf('heavy'),
            matrix,
            opacity,
          }),
        );
      }
      out.push(
        ...textPrim(
          startX + iconSize + gap,
          centerY + size * 0.36,
          [{ dx: 0, text, font: spec, color: paint.text, width: textWidth }],
          matrix,
          opacity,
        ),
      );
      break;
    }

    case 'icon': {
      if (element.fill !== 'none') {
        emitBody(boxSegs(), true);
      } else if (element.frame === 'box') {
        // Der Kasten wurde über `paint.body` gemalt — und der ist bei
        // `fill: none` leer. „Rahmen: Kasten" versprach damit einen Rahmen und
        // lieferte nichts, solange niemand zusätzlich eine Füllung wählte.
        emitPath(boxSegs(), true, {
          stroke: paint.line,
          strokeWidth: strokeWidthOf(element.strokeWeight),
        });
      }
      const inset = element.frame === 'box' ? element.padding : 0;
      const size = Math.max(8, Math.min(element.w, element.h) - inset * 2);
      out.push(
        ...iconScene(element.icon, {
          x: (element.w - size) / 2,
          y: (element.h - size) / 2,
          size,
          ink: paint.text,
          signal: paint.signal,
          strokeWidth: strokeWidthOf(element.strokeWeight),
          matrix,
          opacity,
        }),
      );
      break;
    }

    case 'text': {
      if (element.fill !== 'none') emitBody(boxSegs(), true);
      const inner = element.fill === 'none' ? 0 : element.padding;
      const result = typesetText(element.text, element.typeStyle, {
        width: Math.max(8, element.w - inner * 2),
        align: element.align,
        palette: elementTypesetPalette(paint),
      });
      const dy =
        element.valign === 'middle'
          ? Math.max(0, (element.h - result.height) / 2)
          : element.valign === 'bottom'
            ? Math.max(0, element.h - inner - result.height)
            : inner;
      out.push(...typesetToScene(result, inner, dy, matrix, opacity));
      break;
    }

    case 'markdown': {
      if (element.fill !== 'none') emitBody(boxSegs(), true);
      const inner = element.fill === 'none' ? 0 : element.padding;
      const result = typesetMarkdown(element.markdown, {
        width: Math.max(8, element.w - inner * 2),
        align: element.align,
        resolveImageSize: options.resolveImageSize,
        palette: elementTypesetPalette(paint),
      });
      out.push(...typesetToScene(result, inner, inner, matrix, opacity));
      break;
    }

    case 'card':
      out.push(...cardScene(element, paint, matrix, bg, emitBody, boxSegs));
      break;

    case 'chart':
      emitBody(boxSegs(), true);
      out.push(...chartScene(element, paint, matrix));
      break;

    case 'table':
      emitBody(boxSegs(), true);
      out.push(...tableScene(element, paint, matrix, opacity));
      break;

    case 'wordmark':
      out.push(...wordmarkScene(element, paint, bg, matrix, opacity));
      break;

    case 'image': {
      if (element.src) {
        if (offset > 0) {
          emitPath(boxSegs(), true, { fill: 'transparent' });
        }
        if (offset > 0) {
          out.push({
            t: 'path',
            segs: transformSegs(boxSegs(), matMultiply(matTranslate(offset, offset), matrix)),
            closed: true,
            fill: bg.shadowColor,
            opacity: opacity === 1 ? undefined : opacity,
          });
        }
        out.push({
          t: 'image',
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          href: element.src,
          alt: element.alt || undefined,
          opacity: opacity === 1 ? undefined : opacity,
          rotate: element.rotation || undefined,
        });
        if (element.fill !== 'none') {
          emitPath(boxSegs(), true, {
            stroke: paint.line,
            strokeWidth: strokeWidthOf(element.strokeWeight),
          });
        }
      } else {
        // Platzhalter: gestrichelter Rahmen, damit sichtbar ist, dass hier
        // noch ein Bild fehlt.
        emitPath(boxSegs(), true, {
          stroke: paint.line,
          strokeWidth: strokeTokens.rule,
          dash: [8, 6],
          lineCap: 'butt',
        });
      }
      break;
    }
  }

  return out;
}

function elementTypesetPalette(paint: ElementPaint) {
  return {
    text: paint.text,
    muted: paint.muted,
    accent: paint.ink,
    border: paint.line,
    codeText: paint.text,
    codeBackground: paint.codeBackground,
    quoteBar: paint.ink,
    marker: paint.signal,
    markerText: ci.inkOnSignal,
  };
}

/* -------------------------------------------------------------------------- */
/* Wortmarke                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Geparste Pfade, nach ihrer Zeichenkette gemerkt.
 *
 * Beim Laden zu parsen ginge nicht mehr: die Wortmarke gehört dem
 * Erscheinungsbild und wechselt mit ihm. Bei jedem Bild neu zu parsen wäre
 * Verschwendung — der Buchstabenpfad hat über hundert Segmente. Der Schlüssel
 * ist der Pfad selbst, damit zwei Erscheinungsbilder sich nicht ins Gehege
 * kommen.
 */
const parsedPaths = new Map<string, Seg[]>();
function pathSegs(d: string): Seg[] {
  let segs = parsedPaths.get(d);
  if (!segs) {
    segs = parsePath(d);
    parsedPaths.set(d, segs);
  }
  return segs;
}

/**
 * Die Wortmarke als Vektor. Sie wird proportional eingepasst, nie verzerrt,
 * nie gedreht, nie umgefärbt und bekommt keinen Schatten — das sind vier der
 * Logo-Regeln des CI, und sie stehen hier als Code, nicht als Bitte.
 */
/**
 * Die Wortmarke als zwei Pfade, in einen Kasten gesetzt.
 *
 * Steht hier und nicht zweimal, weil sie an zwei Stellen gebraucht wird: als
 * platzierbares Element und klein in der Folienfußzeile. Die Geometrie ist
 * dieselbe, nur die Farben und der Kasten unterscheiden sich.
 *
 * Gedreht wird nie — „Was wir nie tun: drehen."
 */
function wordmarkPrims(
  box: { x: number; y: number; w: number; h: number },
  letterColor: string,
  accentColor: string | null,
  opacity = 1,
): ScenePrim[] {
  const [vx, vy, vw, vh] = wordmark.viewBox;
  const scale = Math.min(box.w / vw, box.h / vh);
  const dx = (box.w - vw * scale) / 2;
  const dy = (box.h - vh * scale) / 2;
  const place = matMultiply(
    matMultiply(matTranslate(box.x, box.y), matTranslate(dx, dy)),
    matMultiply(matScale(scale), matTranslate(-vx, -vy)),
  );

  const prims: ScenePrim[] = [
    {
      t: 'path',
      segs: transformSegs(pathSegs(wordmark.letters), place),
      closed: true,
      fill: letterColor,
      opacity: opacity === 1 ? undefined : opacity,
    },
  ];

  // Eine Marke ohne Akzent lässt ihn leer, dann wird auch keiner gezeichnet.
  if (wordmark.period && accentColor) {
    prims.push({
      t: 'path',
      segs: transformSegs(pathSegs(wordmark.period), place),
      closed: true,
      fill: accentColor,
      opacity: opacity === 1 ? undefined : opacity,
    });
  }

  return prims;
}

/** Die Maße der Wortmarke bei einer gegebenen Höhe. */
function wordmarkSize(height: number): { w: number; h: number } {
  const [, , vw, vh] = wordmark.viewBox;
  return { w: (vw / vh) * height, h: height };
}

function wordmarkScene(
  element: Extract<CanvasElement, { kind: 'wordmark' }>,
  paint: ElementPaint,
  bg: BackgroundStyle,
  matrix: Mat,
  opacity: number,
): ScenePrim[] {
  // Drehung wird bewusst ignoriert: „Was wir nie tun — drehen."
  void matrix;

  const letterColor =
    element.variant === 'ink'
      ? palette.ink
      : element.variant === 'paper'
        ? palette.paper
        : element.variant === 'mono'
          ? paint.ink
          : bg.ink;

  // Der Akzent bleibt in der Signalfarbe — außer in der einfarbigen Fassung.
  const accent = element.variant === 'mono' ? letterColor : palette.signal;

  return wordmarkPrims(element, letterColor, accent, opacity);
}

/* -------------------------------------------------------------------------- */
/* Karten                                                                      */
/* -------------------------------------------------------------------------- */

function cardScene(
  element: CardElement,
  paint: ElementPaint,
  matrix: Mat,
  bg: BackgroundStyle,
  emitBody: (segs: Seg[], closed: boolean, style?: ScenePaint) => void,
  boxSegs: () => Seg[],
): ScenePrim[] {
  const out: ScenePrim[] = [];
  const pad = element.padding;
  const innerWidth = Math.max(8, element.w - pad * 2);
  const gap = 12;

  emitBody(boxSegs(), true);

  let y = pad;

  switch (element.variant) {
    case 'stat': {
      if (element.label)
        y += pushLabel(out, element.label, pad, y, innerWidth, paint, matrix, element.opacity) + 8;
      const style = typeScale.headline;
      const size = Math.min(style.size, element.h * 0.42);
      const spec = font({
        family: style.family,
        size,
        weight: style.weight,
        tracking: style.tracking,
      });
      const width = measureText(element.title, spec);
      out.push(
        ...textPrim(
          pad,
          y + size * 0.8,
          [{ dx: 0, text: element.title, font: spec, color: paint.text, width }],
          matrix,
          element.opacity,
        ),
      );
      y += size * 0.95 + gap * 0.5;
      if (element.body) {
        const result = typesetText(element.body, 'small', {
          width: innerWidth,
          palette: { ...elementTypesetPalette(paint), text: paint.muted },
        });
        out.push(...typesetToScene(result, pad, y, matrix, element.opacity));
      }
      break;
    }

    case 'quote': {
      const quote = typesetText(element.title, 'lead', {
        width: innerWidth,
        palette: elementTypesetPalette(paint),
      });
      out.push(...typesetToScene(quote, pad, y, matrix, element.opacity));
      y += quote.height + gap;
      if (element.body) {
        const attribution = typesetText(element.body, 'label', {
          width: innerWidth,
          palette: { ...elementTypesetPalette(paint), text: paint.muted },
        });
        out.push(...typesetToScene(attribution, pad, y, matrix, element.opacity));
      }
      break;
    }

    case 'step': {
      const size = 44;
      out.push({
        t: 'path',
        segs: transformSegs(
          polySegs([pad, y, pad + size, y, pad + size, y + size, pad, y + size], true),
          matrix,
        ),
        closed: true,
        fill: bg.signal,
      });
      const numberSpec = font({ family: 'display', size: 24, weight: 700 });
      const label = element.label?.trim() || '1';
      const labelWidth = measureText(label, numberSpec);
      out.push(
        ...textPrim(
          pad + size / 2 - labelWidth / 2,
          y + size / 2 + 8,
          [{ dx: 0, text: label, font: numberSpec, color: ci.inkOnSignal, width: labelWidth }],
          matrix,
          element.opacity,
        ),
      );
      y += size + gap;
      pushTitleAndBody(out, element, paint, pad, y, innerWidth, matrix);
      break;
    }

    case 'note': {
      const barWidth = strokeTokens.heavy;
      out.push({
        t: 'path',
        segs: transformSegs(
          polySegs([0, 0, barWidth, 0, barWidth, element.h, 0, element.h], true),
          matrix,
        ),
        closed: true,
        fill: bg.signal,
      });
      const inset = pad + barWidth;
      let cy = pad;
      if (element.icon) {
        const iconSize = 28;
        out.push(
          ...iconScene(element.icon, {
            x: inset,
            y: cy,
            size: iconSize,
            ink: paint.text,
            signal: paint.signal,
            strokeWidth: strokeWidthOf('heavy'),
            matrix,
            opacity: element.opacity,
          }),
        );
        cy += iconSize + gap * 0.6;
      }
      pushTitleAndBody(
        out,
        element,
        paint,
        inset,
        cy,
        Math.max(8, element.w - inset - pad),
        matrix,
      );
      break;
    }

    case 'feature':
    default: {
      if (element.icon) {
        const iconSize = 40;
        out.push(
          ...iconScene(element.icon, {
            x: pad,
            y,
            size: iconSize,
            ink: paint.text,
            signal: paint.signal,
            strokeWidth: strokeWidthOf('heavy'),
            matrix,
            opacity: element.opacity,
          }),
        );
        y += iconSize + gap;
      }
      if (element.label) {
        y += pushLabel(out, element.label, pad, y, innerWidth, paint, matrix, element.opacity) + 6;
      }
      pushTitleAndBody(out, element, paint, pad, y, innerWidth, matrix);
      break;
    }
  }

  return out;
}

/**
 * Balken und Linien.
 *
 * Ein Diagramm ist ein Kunde der `Scene` wie jedes andere Element: es gibt
 * Rechtecke, Pfade und Textläufe zurück. Damit tragen es Fläche, SVG, PDF und
 * PPTX ohne eine Zeile Zusatzarbeit — der ganze Grund, warum es hier steht und
 * nicht in einer Diagrammbibliothek.
 *
 * Gezeichnet wird mit den Mitteln der CI: Balken in Tinte, ein hervorgehobener
 * in Signal, Achse als Haarlinie, Beschriftungen in der Label-Stufe. Es gibt
 * kein Gitternetz, keine Legende und keine Farbverläufe — nichts davon steht
 * in der CI, und ein Diagramm mit fünf Blautönen wäre genau der Verstoß, den
 * die Tonrollen verhindern sollen.
 */
function chartScene(
  element: Extract<CanvasElement, { kind: 'chart' }>,
  paint: ElementPaint,
  matrix: Mat,
): ScenePrim[] {
  const out: ScenePrim[] = [];
  const punkte = parseChartData(element.data);
  if (punkte.length === 0) return out;

  const pad = element.padding;
  const innen = { x: pad, y: pad, w: element.w - pad * 2, h: element.h - pad * 2 };
  if (innen.w <= 0 || innen.h <= 0) return out;

  let oben = innen.y;
  if (element.label) {
    oben += pushLabel(out, element.label, innen.x, oben, innen.w, paint, matrix, element.opacity);
    oben += strokeWidthOf('rule') * 8;
  }

  // Unten die Kategorien, darüber die Zeichenfläche.
  const beschriftung = typeScale.label.size * 1.6;
  const wertHoehe = element.values ? typeScale.label.size * 1.5 : 0;
  const feld = {
    x: innen.x,
    y: oben + wertHoehe,
    w: innen.w,
    h: innen.y + innen.h - beschriftung - (oben + wertHoehe),
  };
  if (feld.h <= 4) return out;

  const { min, max } = chartScale(punkte);
  const spanne = max - min;
  const yFuer = (wert: number) => feld.y + feld.h - ((wert - min) / spanne) * feld.h;

  /**
   * Eine gefüllte Fläche.
   *
   * Als Pfad und nicht als `rect`-Primitiv, weil ein Rechteck keine Matrix
   * tragen kann: es stünde in Element-Koordinaten, während alles andere in
   * Folien-Koordinaten steht. Beim ersten Versuch lagen die Balken deshalb
   * links neben ihrem Kasten und die Punkte des zweiten Diagramms mitten im
   * ersten — im Bild sofort zu sehen, in der Zahl nicht.
   */
  const flaeche = (x: number, y: number, w: number, h: number, farbe: string) => {
    out.push({
      t: 'path',
      segs: transformSegs(
        [
          { c: 'M', x, y },
          { c: 'L', x: x + w, y },
          { c: 'L', x: x + w, y: y + h },
          { c: 'L', x, y: y + h },
          { c: 'Z' },
        ],
        matrix,
      ),
      closed: true,
      fill: farbe,
      opacity: element.opacity === 1 ? undefined : element.opacity,
    });
  };

  const linie = (segs: Seg[], farbe: string, breite: number) => {
    out.push({
      t: 'path',
      segs: transformSegs(segs, matrix),
      closed: false,
      stroke: farbe,
      strokeWidth: breite,
      lineCap: 'square',
      lineJoin: 'miter',
      opacity: element.opacity === 1 ? undefined : element.opacity,
    });
  };

  // Die Nulllinie. Sie liegt unten, solange alles positiv ist — und mittendrin,
  // sobald ein Wert darunter geht. Ohne sie läse man negative Werte als kurze.
  linie(
    [
      { c: 'M', x: feld.x, y: yFuer(Math.max(min, 0)) },
      { c: 'L', x: feld.x + feld.w, y: yFuer(Math.max(min, 0)) },
    ],
    paint.line,
    strokeWidthOf('rule'),
  );

  const schritt = feld.w / punkte.length;

  punkte.forEach((punkt, i) => {
    const mitte = feld.x + schritt * (i + 0.5);
    const farbe = punkt.signal ? paint.signal : paint.ink;
    const y = yFuer(punkt.value);
    const null_ = yFuer(Math.max(min, 0));

    if (element.chart === 'bar') {
      // Ein Drittel Luft zwischen den Balken — schmaler wirkt zerfranst,
      // breiter wird aus dem Diagramm ein Blockbild.
      const breite = schritt * 0.62;
      flaeche(
        mitte - breite / 2,
        Math.min(y, null_),
        breite,
        Math.max(1, Math.abs(null_ - y)),
        farbe,
      );
    } else {
      // Der Punkt auf der Linie; die Linie selbst kommt danach in einem Stück.
      const r = strokeWidthOf('strong');
      flaeche(mitte - r, y - r, r * 2, r * 2, farbe);
    }

    if (element.values) {
      pushZentriert(
        out,
        formatWert(punkt.value),
        mitte,
        Math.min(y, null_) - typeScale.label.size * 0.5,
        punkt.signal ? paint.text : paint.muted,
        matrix,
        element.opacity,
      );
    }
    if (punkt.label) {
      pushZentriert(
        out,
        punkt.label,
        mitte,
        innen.y + innen.h - typeScale.label.size * 0.3,
        paint.muted,
        matrix,
        element.opacity,
      );
    }
  });

  if (element.chart === 'line' && punkte.length > 1) {
    linie(
      punkte.map((punkt, i) => ({
        c: i === 0 ? 'M' : 'L',
        x: feld.x + schritt * (i + 0.5),
        y: yFuer(punkt.value),
      })) as Seg[],
      paint.ink,
      strokeWidthOf('strong'),
    );
  }

  return out;
}

/**
 * Eine Tabelle — und zwar **ohne einen einzigen eigenen Strich**.
 *
 * Gelesen wird großzügig, geschrieben wird eine Markdown-Tabelle, gezeichnet
 * wird sie vom Setzer. Der zeichnet die Tabellen im Fließtext schon, samt
 * fetter Kopfzeile und Haarlinie unter jeder Zeile; ein zweiter Tabellensatz
 * daneben wäre ein zweiter Renderer, und der widerspricht dem ersten
 * irgendwann.
 */
function tableScene(
  element: Extract<CanvasElement, { kind: 'table' }>,
  paint: ElementPaint,
  matrix: Mat,
  opacity: number,
): ScenePrim[] {
  const out: ScenePrim[] = [];
  const quelle = toMarkdownTable(parseTable(element.data, element.header));
  if (!quelle) return out;

  const pad = element.padding;
  const breite = element.w - pad * 2;
  if (breite <= 0) return out;

  let oben = pad;
  if (element.label) {
    oben += pushLabel(out, element.label, pad, oben, breite, paint, matrix, opacity);
    oben += strokeWidthOf('rule') * 4;
  }

  const gesetzt = typesetMarkdown(quelle, {
    width: breite,
    palette: elementTypesetPalette(paint),
  });
  out.push(...typesetToScene(gesetzt, pad, oben, matrix, opacity));
  return out;
}

/** Eine Zeile, um `mitte` zentriert, auf der Grundlinie `y`. */
function pushZentriert(
  out: ScenePrim[],
  text: string,
  mitte: number,
  y: number,
  farbe: string,
  matrix: Mat,
  opacity: number,
): void {
  const style = typeScale.label;
  const spec = font({
    family: style.family,
    size: style.size,
    weight: style.weight,
    tracking: style.tracking,
  });
  const breite = measureText(text, spec);
  out.push(
    ...textPrim(
      mitte - breite / 2,
      y,
      [{ dx: 0, text, font: spec, color: farbe, width: breite }],
      matrix,
      opacity,
    ),
  );
}

/**
 * Eine Zahl, wie man sie auf Deutsch schreibt.
 *
 * Ganze Zahlen ohne Nachkommastellen, sonst eine — mehr liest auf einer Folie
 * niemand, und der Punkt als Tausendertrenner kommt aus der Landeseinstellung
 * und nicht von Hand.
 */
function formatWert(wert: number): string {
  return Number.isInteger(wert)
    ? wert.toLocaleString('de-DE')
    : wert.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

function pushLabel(
  out: ScenePrim[],
  text: string,
  x: number,
  y: number,
  width: number,
  paint: ElementPaint,
  matrix: Mat,
  opacity: number,
): number {
  const result = typesetText(text, 'label', {
    width,
    palette: { ...elementTypesetPalette(paint), text: paint.muted },
  });
  out.push(...typesetToScene(result, x, y, matrix, opacity));
  return result.height;
}

function pushTitleAndBody(
  out: ScenePrim[],
  element: CardElement,
  paint: ElementPaint,
  x: number,
  y: number,
  width: number,
  matrix: Mat,
): number {
  let cursor = y;
  if (element.title) {
    const title = typesetText(element.title, 'h4', {
      width,
      palette: elementTypesetPalette(paint),
    });
    out.push(...typesetToScene(title, x, cursor, matrix, element.opacity));
    cursor += title.height + 8;
  }
  if (element.body) {
    const body = typesetText(element.body, 'small', {
      width,
      palette: { ...elementTypesetPalette(paint), text: paint.muted },
    });
    out.push(...typesetToScene(body, x, cursor, matrix, element.opacity));
    cursor += body.height;
  }
  return cursor - y;
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */

export interface IconSceneOptions {
  x: number;
  y: number;
  size: number;
  /** Tintenfarbe für Striche und schwarze Flächen. */
  ink: string;
  /** Signalfarbe für grüne Flächen — inklusive der Signatur unten rechts. */
  signal: string;
  /** Gewünschte CI-Strichstärke; wird ins 64er-Raster umgerechnet. */
  strokeWidth: number;
  matrix?: Mat;
  opacity?: number;
}

/**
 * Ein Icon zeichnen. Die Strichstärke skaliert mit dem Icon, damit eine 32-px-
 * und eine 160-px-Fassung erkennbar dieselbe Zeichnung sind — genau so gibt das
 * CI-Set sie aus.
 */
export function iconScene(name: IconName | undefined, options: IconSceneOptions): ScenePrim[] {
  const {
    x,
    y,
    size,
    ink,
    signal,
    strokeWidth,
    matrix = matTranslate(0, 0),
    opacity = 1,
  } = options;
  const def = iconDef(name);
  const scale = size / iconGrid;
  const base = matMultiply(matMultiply(matrix, matTranslate(x, y)), matScale(scale));
  const weight = (strokeWidth / strokeTokens.heavy) * iconStrokeGrid * scale;

  return def.prims.map((prim) => {
    const { segs, closed } = iconPrimSegs(prim);
    const local = prim.rotate
      ? matMultiply(base, matRotateAbout(prim.rotate[0], prim.rotate[1], prim.rotate[2]))
      : base;
    const filled = Boolean(prim.fill);
    const color = (role: IconPaintRole | undefined) => {
      if (role !== 'signal' && role !== 'signal-soft' && role !== 'signal-deep') return ink;
      // Die Rampe folgt dem Signal. Steht das Zeichen auf einer Signal-Fläche,
      // ist `signal` bereits zur Tinte umgeschlagen, damit es überhaupt sichtbar
      // bleibt — dann fallen die Schattenstufen mit um. Ein halb umgefärbtes
      // Pixelbild wäre schlimmer als ein einfarbiges.
      if (signal !== palette.signal) return signal;
      if (role === 'signal-soft') return palette.signalSoft;
      if (role === 'signal-deep') return palette.signalDeep;
      return signal;
    };

    return {
      t: 'path',
      segs: transformSegs(segs, local),
      closed,
      fill: filled ? color(prim.fill) : undefined,
      stroke: filled ? undefined : color(prim.stroke),
      strokeWidth: filled ? 0 : prim.sw ? (prim.sw / iconStrokeGrid) * weight : weight,
      dash: prim.dash ? prim.dash.map((value) => value * scale) : undefined,
      // Die Signatur des Sets: square caps, miter joins. Keine runden Enden.
      lineCap: 'square',
      lineJoin: 'miter',
      opacity: opacity === 1 ? undefined : opacity,
    } satisfies ScenePrim;
  });
}

function iconPrimSegs(prim: IconPrim): { segs: Seg[]; closed: boolean } {
  switch (prim.t) {
    case 'path':
      return { segs: parseIconPath(prim.d), closed: /z\s*$/i.test(prim.d.trim()) };
    case 'circle':
      return { segs: circleSegs(prim.cx, prim.cy, prim.r), closed: true };
    case 'ellipse':
      return { segs: ellipseSegs(prim.cx, prim.cy, prim.rx, prim.ry), closed: true };
    case 'rect':
      return {
        segs: polySegs(
          [
            prim.x,
            prim.y,
            prim.x + prim.w,
            prim.y,
            prim.x + prim.w,
            prim.y + prim.h,
            prim.x,
            prim.y + prim.h,
          ],
          true,
        ),
        closed: true,
      };
    default:
      return { segs: [], closed: false };
  }
}

const iconPathCache = new Map<string, Seg[]>();

function parseIconPath(d: string): Seg[] {
  const cached = iconPathCache.get(d);
  if (cached) return cached;
  const segs = parsePath(d);
  iconPathCache.set(d, segs);
  return segs;
}

/* -------------------------------------------------------------------------- */
/* Satz → Szene                                                                */
/* -------------------------------------------------------------------------- */

export function typesetToScene(
  result: TypesetResult,
  dx: number,
  dy: number,
  matrix: Mat = matTranslate(0, 0),
  opacity = 1,
): ScenePrim[] {
  const local = matMultiply(matrix, matTranslate(dx, dy));
  const rotate = matrixRotation(local);
  const out: ScenePrim[] = [];

  for (const prim of result.prims) {
    switch (prim.t) {
      case 'text': {
        const origin = applyMatrix(local, prim.x, prim.y);
        out.push({
          t: 'text',
          x: origin.x,
          y: origin.y,
          runs: prim.runs,
          rotate: rotate || undefined,
          opacity: opacity === 1 ? undefined : opacity,
        });
        break;
      }
      case 'rect': {
        out.push({
          t: 'path',
          segs: transformSegs(
            polySegs(
              [
                prim.x,
                prim.y,
                prim.x + prim.w,
                prim.y,
                prim.x + prim.w,
                prim.y + prim.h,
                prim.x,
                prim.y + prim.h,
              ],
              true,
            ),
            local,
          ),
          closed: true,
          fill: prim.fill === 'transparent' ? undefined : prim.fill,
          stroke: prim.stroke,
          strokeWidth: prim.strokeWidth,
          lineJoin: 'miter',
          opacity: opacity === 1 ? undefined : opacity,
        });
        break;
      }
      case 'image': {
        const origin = applyMatrix(local, prim.x, prim.y);
        out.push({
          t: 'image',
          x: origin.x,
          y: origin.y,
          w: prim.w,
          h: prim.h,
          href: prim.src,
          // Ein Markdown-Bild trägt seinen Alternativtext in den eckigen
          // Klammern: `![so hier](bild.png)`. Er kam bis hierher und fiel
          // dann heraus.
          alt: prim.alt || undefined,
          rotate: rotate || undefined,
          opacity: opacity === 1 ? undefined : opacity,
        });
        break;
      }
    }
  }

  return out;
}

function textPrim(
  x: number,
  y: number,
  runs: SceneRun[],
  matrix: Mat,
  opacity: number,
): ScenePrim[] {
  const origin = applyMatrix(matrix, x, y);
  const rotate = matrixRotation(matrix);
  return [
    {
      t: 'text',
      x: origin.x,
      y: origin.y,
      runs,
      rotate: rotate || undefined,
      opacity: opacity === 1 ? undefined : opacity,
    },
  ];
}

function applyMatrix(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

function matrixRotation(m: Mat): number {
  const angle = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  return Math.abs(angle) < 1e-6 ? 0 : angle;
}

function combineOpacity(a: number, b: number | undefined): number | undefined {
  const value = a * (b ?? 1);
  return value >= 1 ? undefined : value;
}

/* -------------------------------------------------------------------------- */
/* Farb-Helfer                                                                 */
/* -------------------------------------------------------------------------- */

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let value = match[1];
  if (value.length === 3)
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  const int = Number.parseInt(value, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
