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
  shadowSize,
  stroke as strokeTokens,
  strokeWidth as strokeWidthOf,
  typeScale,
} from '@/theme';
import { iconDef, iconGrid, iconStrokeGrid, type IconName, type IconPrim } from '@/assets/icons';
import { wordmark } from '@/assets/wordmark.generated';
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
import { flowFrame, footerFrame } from '@/lib/layout/slideLayout';
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

const PAPER_BASE = {
  ink: ci.ink,
  muted: ci.inkMuted,
  line: ci.line,
  signal: palette.signal,
  shadowColor: ci.ink,
} as const;

export function backgroundStyle(background: SlideBackground): BackgroundStyle {
  switch (background) {
    case 'signal':
      return { ...PAPER_BASE, fill: palette.signal, codeBackground: palette.signalSoft };
    case 'grid':
      return {
        ...PAPER_BASE,
        fill: palette.paper,
        codeBackground: palette.paperAlt,
        dots: ci.grid,
      };
    case 'ink':
      return {
        fill: palette.ink,
        ink: palette.paper,
        muted: 'rgba(255, 254, 229, 0.64)',
        line: palette.paper,
        signal: palette.signal,
        codeBackground: palette.ink800,
        shadowColor: palette.paper,
      };
    case 'paper':
    default:
      return { ...PAPER_BASE, fill: palette.paper, codeBackground: palette.paperAlt };
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

    let dy = frame.y;
    if (frame.valign === 'middle') dy = frame.y + Math.max(0, (frame.h - result.height) / 2);
    else if (frame.valign === 'bottom') dy = frame.y + Math.max(0, frame.h - result.height);

    prims.push(...typesetToScene(result, frame.x, dy));
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

/** Fußzeile und Foliennummer — Space Mono, ALL-CAPS, wie die CI es für Labels will. */
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

  if (options.slideNumber) {
    const label = options.totalSlides
      ? `${options.slideNumber} / ${options.totalSlides}`
      : String(options.slideNumber);
    const width = measureText(label, spec);
    out.push({
      t: 'text',
      x: footerFrame.right - width,
      y: footerFrame.y,
      runs: [{ dx: 0, text: label, font: spec, color: bg.muted, width }],
    });
  }

  return out;
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
      if (element.frame === 'box' || element.fill !== 'none') emitBody(boxSegs(), true);
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

const wordmarkLetters = parsePath(wordmark.letters);
const wordmarkPeriod = parsePath(wordmark.period);

/**
 * Die Wortmarke als Vektor. Sie wird proportional eingepasst, nie verzerrt,
 * nie gedreht, nie umgefärbt und bekommt keinen Schatten — das sind vier der
 * Logo-Regeln des CI, und sie stehen hier als Code, nicht als Bitte.
 */
function wordmarkScene(
  element: Extract<CanvasElement, { kind: 'wordmark' }>,
  paint: ElementPaint,
  bg: BackgroundStyle,
  matrix: Mat,
  opacity: number,
): ScenePrim[] {
  const [vx, vy, vw, vh] = wordmark.viewBox;
  const scale = Math.min(element.w / vw, element.h / vh);
  const dx = (element.w - vw * scale) / 2;
  const dy = (element.h - vh * scale) / 2;

  // Drehung wird bewusst ignoriert: „Was wir nie tun — drehen."
  const place = matMultiply(
    matMultiply(matTranslate(element.x, element.y), matTranslate(dx, dy)),
    matMultiply(matScale(scale), matTranslate(-vx, -vy)),
  );
  void matrix;

  const letterColor =
    element.variant === 'ink'
      ? palette.ink
      : element.variant === 'paper'
        ? palette.paper
        : element.variant === 'mono'
          ? paint.ink
          : bg.ink;

  const prims: ScenePrim[] = [
    {
      t: 'path',
      segs: transformSegs(wordmarkLetters, place),
      closed: true,
      fill: letterColor,
      opacity: opacity === 1 ? undefined : opacity,
    },
  ];

  // Der Punkt bleibt grün — außer in der einfarbigen Fassung.
  prims.push({
    t: 'path',
    segs: transformSegs(wordmarkPeriod, place),
    closed: true,
    fill: element.variant === 'mono' ? letterColor : palette.signal,
    opacity: opacity === 1 ? undefined : opacity,
  });

  return prims;
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
    const color = (role: 'ink' | 'signal' | undefined) => (role === 'signal' ? signal : ink);

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
