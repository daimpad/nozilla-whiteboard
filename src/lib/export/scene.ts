/**
 * Slide → Scene.
 *
 * A `Scene` is a flat, fully-resolved list of drawing primitives in slide
 * coordinates. It contains no Markdown, no CSS and no DOM — every colour is a
 * literal, every glyph run is positioned, every curve is a cubic. The SVG and
 * PDF exporters are then thin translators over the same scene, which is why
 * they cannot disagree.
 */
import {
  canvas as canvasTokens,
  color as ci,
  elementTones,
  stroke as strokeTokens,
  strokeWidth as strokeWidthOf,
  typeScale,
} from '@/theme';
import { iconDef, iconGrid, iconStrokeGrid, type IconName, type IconPrim } from '@/assets/icons';
import {
  circleSegs,
  ellipseSegs,
  lineSegs,
  matMultiply,
  matRotateAbout,
  matTranslate,
  parsePath,
  polySegs,
  rectSegs,
  transformSegs,
  type Mat,
  type Seg,
} from '@/lib/geometry/path';
import { connectorGeometry, shapeGeometry } from '@/lib/geometry/shapes';
import { flowFrame, footerFrame } from '@/lib/layout/slideLayout';
import { font, measureText, type FontSpec } from '@/lib/text/measure';
import { typesetMarkdown, typesetText, type TypesetResult } from '@/lib/text/typeset';
import type {
  CanvasElement,
  CardElement,
  Deck,
  Slide,
  SlideBackground,
} from '@/model/types';

/* -------------------------------------------------------------------------- */
/* Scene model                                                                 */
/* -------------------------------------------------------------------------- */

export interface ScenePaint {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
  lineCap?: 'butt' | 'round';
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
  | ({ t: 'rect'; x: number; y: number; w: number; h: number; r?: number } & ScenePaint)
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & ScenePaint)
  | ({ t: 'path'; segs: Seg[]; closed: boolean } & ScenePaint)
  | {
      t: 'text';
      x: number;
      y: number;
      runs: SceneRun[];
      /** Degrees, about (x, y). */
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
      radius?: number;
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
  /** Include the deck footer and slide number. */
  chrome?: boolean;
  /** 1-based slide number for the footer. */
  slideNumber?: number;
  totalSlides?: number;
  /** Only include elements whose reveal step is ≤ this. `Infinity` = everything. */
  revealStep?: number;
  /** Supplies intrinsic image sizes so Markdown figures lay out correctly. */
  resolveImageSize?: (src: string) => { w: number; h: number } | undefined;
}

/* -------------------------------------------------------------------------- */
/* Backgrounds                                                                 */
/* -------------------------------------------------------------------------- */

export interface BackgroundStyle {
  fill: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  codeBackground: string;
  dots?: string;
}

export function backgroundStyle(background: SlideBackground): BackgroundStyle {
  switch (background) {
    case 'subtle':
      return {
        fill: ci.surfaceSubtle,
        text: ci.ink,
        muted: ci.inkMuted,
        border: ci.border,
        accent: ci.primary,
        codeBackground: ci.surface,
      };
    case 'inverse':
      return {
        fill: ci.surfaceInverse,
        text: ci.inkInverse,
        muted: elementTones.inverse.accentText,
        border: ci.borderInverse,
        accent: elementTones.primary.fill,
        codeBackground: 'rgba(255,255,255,0.06)',
      };
    case 'brand':
      return {
        fill: ci.primary,
        text: ci.inkOnBrand,
        muted: 'rgba(255,255,255,0.78)',
        border: 'rgba(255,255,255,0.28)',
        accent: ci.inkOnBrand,
        codeBackground: 'rgba(255,255,255,0.12)',
      };
    case 'grid':
      return {
        fill: ci.surface,
        text: ci.ink,
        muted: ci.inkMuted,
        border: ci.border,
        accent: ci.primary,
        codeBackground: ci.surfaceSunken,
        dots: ci.grid,
      };
    case 'surface':
    default:
      return {
        fill: ci.surface,
        text: ci.ink,
        muted: ci.inkMuted,
        border: ci.border,
        accent: ci.primary,
        codeBackground: ci.surfaceSunken,
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Scene construction                                                          */
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

/**
 * Everything behind the freeform elements: the slide surface, the optional dot
 * grid and the typeset flow (Markdown) content.
 */
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
      palette: {
        text: bg.text,
        muted: bg.muted,
        accent: bg.accent,
        border: bg.border,
        codeText: bg.text,
        codeBackground: bg.codeBackground,
        quoteBar: bg.accent,
      },
    });

    let dy = frame.y;
    if (frame.valign === 'middle') dy = frame.y + Math.max(0, (frame.h - result.height) / 2);
    else if (frame.valign === 'bottom') dy = frame.y + Math.max(0, frame.h - result.height);

    prims.push(...typesetToScene(result, frame.x, dy));
  }

  return prims;
}

/** The deck footer and slide number, when the slide allows them. */
export function buildSlideChrome(
  slide: Slide,
  deck: Deck,
  options: SceneOptions = {},
): ScenePrim[] {
  if (options.chrome === false || slide.meta.bare) return [];
  return deckChrome(deck, backgroundStyle(slide.meta.background), options);
}

function gridDots(colorValue: string): ScenePrim[] {
  const out: ScenePrim[] = [];
  const step = canvasTokens.gridSize * canvasTokens.gridMajorEvery;
  for (let x = step; x < canvasTokens.width; x += step) {
    for (let y = step; y < canvasTokens.height; y += step) {
      out.push({ t: 'ellipse', cx: x, cy: y, rx: 1, ry: 1, fill: colorValue });
    }
  }
  return out;
}

function deckChrome(deck: Deck, bg: BackgroundStyle, options: SceneOptions): ScenePrim[] {
  const out: ScenePrim[] = [];
  const style = typeScale.caption;
  const spec = font({
    family: style.family,
    size: style.size,
    weight: style.weight,
    tracking: style.tracking,
  });

  if (deck.meta.footer) {
    const width = measureText(deck.meta.footer, spec);
    out.push({
      t: 'text',
      x: footerFrame.left,
      y: footerFrame.y,
      runs: [{ dx: 0, text: deck.meta.footer, font: spec, color: bg.muted, width }],
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

/* -------------------------------------------------------------------------- */
/* Element painting                                                            */
/* -------------------------------------------------------------------------- */

export interface ElementPaint {
  body: ScenePaint;
  text: string;
  muted: string;
  accent: string;
  border: string;
  codeBackground: string;
}

/** Resolve an element's tone + fill style into concrete CI paint values. */
export function elementPaint(element: CanvasElement): ElementPaint {
  const t = elementTones[element.tone] ?? elementTones.neutral;
  const sw = strokeWidthOf(element.strokeWeight);

  switch (element.fill) {
    case 'solid':
      return {
        body: { fill: t.solidFill, stroke: undefined, strokeWidth: 0 },
        text: t.solidText,
        muted: withAlpha(t.solidText, 0.78),
        accent: t.solidText,
        border: withAlpha(t.solidText, 0.3),
        codeBackground: withAlpha(t.solidText, 0.14),
      };
    case 'outline':
      return {
        body: { fill: undefined, stroke: t.accentText, strokeWidth: sw },
        text: t.text,
        muted: t.accentText,
        accent: t.accentText,
        border: t.border,
        codeBackground: t.softFill,
      };
    case 'soft':
      return {
        body: { fill: t.softFill, stroke: t.border, strokeWidth: sw },
        text: t.text,
        muted: t.accentText,
        accent: t.accentText,
        border: t.border,
        codeBackground: withAlpha(t.accentText, 0.1),
      };
    case 'none':
    default:
      return {
        body: {},
        text: t.text,
        muted: t.accentText,
        accent: t.accentText,
        border: t.border,
        codeBackground: t.softFill,
      };
  }
}

/** Element rotation as a matrix about its own centre. */
function elementMatrix(element: CanvasElement): Mat {
  const base = matTranslate(element.x, element.y);
  if (!element.rotation) return base;
  return matMultiply(base, matRotateAbout(element.rotation, element.w / 2, element.h / 2));
}

/**
 * Paint a single element. Exported because the on-screen canvas renders through
 * exactly this function too — what you see really is what gets exported.
 */
export function buildElementPrims(
  element: CanvasElement,
  bg: BackgroundStyle = backgroundStyle('surface'),
  options: SceneOptions = {},
): ScenePrim[] {
  const paint = elementPaint(element);
  const matrix = elementMatrix(element);
  const opacity = element.opacity;
  const out: ScenePrim[] = [];

  const emitPath = (segs: Seg[], closed: boolean, style: ScenePaint) => {
    out.push({
      t: 'path',
      segs: transformSegs(segs, matrix),
      closed,
      lineCap: 'round',
      lineJoin: 'round',
      ...style,
      opacity: combineOpacity(opacity, style.opacity),
    });
  };

  switch (element.kind) {
    case 'shape': {
      const geometry = shapeGeometry(element.shape, element.w, element.h, element.radius);
      emitPath(geometry.segs, geometry.closed, paint.body);
      if (element.label?.trim()) {
        const result = typesetText(element.label, element.labelStyle ?? 'body', {
          width: Math.max(8, element.w - element.padding * 2),
          align: 'center',
          palette: { text: paint.text, muted: paint.muted, accent: paint.accent },
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
      const strokeColor = paint.body.stroke ?? paint.accent;
      emitPath(geometry.segs, false, {
        stroke: strokeColor,
        strokeWidth: sw,
        dash: element.dashed ? [sw * 3.2, sw * 2.6] : undefined,
      });
      for (const head of geometry.heads) {
        emitPath(head, true, { fill: strokeColor, strokeWidth: 0 });
      }
      if (element.label?.trim()) {
        const result = typesetText(element.label, 'caption', {
          width: Math.max(40, element.w),
          align: 'center',
          palette: { text: paint.text, muted: paint.muted, accent: paint.accent },
        });
        out.push(
          ...typesetToScene(result, 0, -result.height - sw * 3, matrix, opacity),
        );
      }
      break;
    }

    case 'badge': {
      const r = Math.min(element.radius, element.h / 2);
      emitPath(rectSegs(0, 0, element.w, element.h, r), true, paint.body);

      const style = typeScale.caption;
      const size = Math.min(style.size * 1.05, element.h * 0.42);
      const spec = font({
        family: style.family,
        size,
        weight: 600,
        tracking: 0.02,
      });
      const iconSize = element.icon ? size * 1.25 : 0;
      const gap = element.icon ? size * 0.42 : 0;
      const textWidth = measureText(element.text, spec);
      const totalWidth = iconSize + gap + textWidth;
      const startX = (element.w - totalWidth) / 2;
      const centerY = element.h / 2;

      if (element.icon) {
        out.push(
          ...iconScene(
            element.icon,
            startX,
            centerY - iconSize / 2,
            iconSize,
            paint.text,
            strokeWidthOf('medium'),
            matrix,
            opacity,
          ),
        );
      }
      out.push(
        ...textPrim(
          startX + iconSize + gap,
          centerY + size * 0.35,
          [{ dx: 0, text: element.text, font: spec, color: paint.text, width: textWidth }],
          matrix,
          opacity,
        ),
      );
      break;
    }

    case 'icon': {
      if (element.frame !== 'none') {
        const frameSegs =
          element.frame === 'circle'
            ? ellipseSegs(element.w / 2, element.h / 2, element.w / 2, element.h / 2)
            : rectSegs(0, 0, element.w, element.h, element.radius);
        emitPath(frameSegs, true, paint.body);
      } else if (element.fill !== 'none') {
        emitPath(rectSegs(0, 0, element.w, element.h, element.radius), true, paint.body);
      }

      const inset = element.frame === 'none' ? 0 : element.padding;
      const size = Math.max(4, Math.min(element.w, element.h) - inset * 2);
      const glyphColor = element.fill === 'solid' ? paint.text : paint.accent;
      out.push(
        ...iconScene(
          element.icon,
          (element.w - size) / 2,
          (element.h - size) / 2,
          size,
          glyphColor,
          strokeWidthOf(element.strokeWeight),
          matrix,
          opacity,
        ),
      );
      break;
    }

    case 'text': {
      if (element.fill !== 'none') {
        emitPath(rectSegs(0, 0, element.w, element.h, element.radius), true, paint.body);
      }
      const inner = element.fill === 'none' ? 0 : element.padding;
      const result = typesetText(element.text, element.typeStyle, {
        width: Math.max(8, element.w - inner * 2),
        align: element.align,
        palette: { text: paint.text, muted: paint.muted, accent: paint.accent },
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
      if (element.fill !== 'none') {
        emitPath(rectSegs(0, 0, element.w, element.h, element.radius), true, paint.body);
      }
      const inner = element.fill === 'none' ? 0 : element.padding;
      const result = typesetMarkdown(element.markdown, {
        width: Math.max(8, element.w - inner * 2),
        align: element.align,
        resolveImageSize: options.resolveImageSize,
        palette: {
          text: paint.text,
          muted: paint.muted,
          accent: paint.accent,
          border: paint.border,
          codeText: paint.text,
          codeBackground: paint.codeBackground,
          quoteBar: paint.accent,
        },
      });
      out.push(...typesetToScene(result, inner, inner, matrix, opacity));
      break;
    }

    case 'card': {
      out.push(...cardScene(element, paint, matrix));
      break;
    }

    case 'image': {
      if (element.src) {
        out.push({
          t: 'image',
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          href: element.src,
          radius: element.radius,
          opacity,
          rotate: element.rotation || undefined,
        });
      } else {
        emitPath(rectSegs(0, 0, element.w, element.h, element.radius), true, {
          fill: bg.codeBackground,
          stroke: paint.border,
          strokeWidth: strokeTokens.hairline,
          dash: [6, 5],
        });
      }
      break;
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                       */
/* -------------------------------------------------------------------------- */

function cardScene(element: CardElement, paint: ElementPaint, matrix: Mat): ScenePrim[] {
  const out: ScenePrim[] = [];
  const pad = element.padding;
  const innerWidth = Math.max(8, element.w - pad * 2);

  const emitPath = (segs: Seg[], closed: boolean, style: ScenePaint) => {
    out.push({
      t: 'path',
      segs: transformSegs(segs, matrix),
      closed,
      lineCap: 'round',
      lineJoin: 'round',
      ...style,
      opacity: combineOpacity(element.opacity, style.opacity),
    });
  };

  emitPath(rectSegs(0, 0, element.w, element.h, element.radius), true, paint.body);

  let y = pad;
  const gap = 10;

  switch (element.variant) {
    case 'stat': {
      if (element.eyebrow) {
        y += pushOverline(out, element.eyebrow, pad, y, innerWidth, paint.muted, matrix, element.opacity);
        y += 4;
      }
      const style = typeScale.display;
      const size = Math.min(style.size, element.h * 0.44);
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
          y + size * 0.82,
          [{ dx: 0, text: element.title, font: spec, color: paint.text, width }],
          matrix,
          element.opacity,
        ),
      );
      y += size * 1.06 + gap * 0.5;
      if (element.body) {
        const result = typesetText(element.body, 'small', {
          width: innerWidth,
          palette: { text: paint.muted, muted: paint.muted, accent: paint.accent },
        });
        out.push(...typesetToScene(result, pad, y, matrix, element.opacity));
      }
      break;
    }

    case 'quote': {
      const iconSize = 26;
      out.push(
        ...iconScene('quote', pad, y, iconSize, paint.accent, strokeTokens.regular, matrix, element.opacity),
      );
      y += iconSize + gap;
      const quote = typesetText(element.title, 'lead', {
        width: innerWidth,
        palette: { text: paint.text, muted: paint.muted, accent: paint.accent },
      });
      out.push(...typesetToScene(quote, pad, y, matrix, element.opacity));
      y += quote.height + gap;
      if (element.body) {
        const attribution = typesetText(element.body, 'caption', {
          width: innerWidth,
          palette: { text: paint.muted, muted: paint.muted, accent: paint.accent },
        });
        out.push(...typesetToScene(attribution, pad, y, matrix, element.opacity));
      }
      break;
    }

    case 'step': {
      const badgeSize = 34;
      emitPath(circleSegs(pad + badgeSize / 2, y + badgeSize / 2, badgeSize / 2), true, {
        fill: paint.accent,
      });
      const numberSpec = font({ family: 'display', size: 17, weight: 700 });
      const label = element.eyebrow?.trim() || '1';
      const labelWidth = measureText(label, numberSpec);
      out.push(
        ...textPrim(
          pad + badgeSize / 2 - labelWidth / 2,
          y + badgeSize / 2 + 6,
          [{ dx: 0, text: label, font: numberSpec, color: ci.inkInverse, width: labelWidth }],
          matrix,
          element.opacity,
        ),
      );
      y += badgeSize + gap;
      y += pushTitleAndBody(out, element, paint, pad, y, innerWidth, matrix);
      break;
    }

    case 'callout': {
      const barWidth = strokeTokens.heavy;
      emitPath(rectSegs(0, 0, barWidth, element.h, barWidth / 2), true, { fill: paint.accent });
      const inset = pad + barWidth;
      let cy = pad;
      if (element.icon) {
        const iconSize = 22;
        out.push(
          ...iconScene(element.icon, inset, cy, iconSize, paint.accent, strokeTokens.regular, matrix, element.opacity),
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
        const iconSize = 30;
        out.push(
          ...iconScene(element.icon, pad, y, iconSize, paint.accent, strokeTokens.regular, matrix, element.opacity),
        );
        y += iconSize + gap;
      }
      if (element.eyebrow) {
        y += pushOverline(out, element.eyebrow, pad, y, innerWidth, paint.muted, matrix, element.opacity);
        y += 4;
      }
      pushTitleAndBody(out, element, paint, pad, y, innerWidth, matrix);
      break;
    }
  }

  return out;
}

function pushOverline(
  out: ScenePrim[],
  text: string,
  x: number,
  y: number,
  width: number,
  colorValue: string,
  matrix: Mat,
  opacity: number,
): number {
  const result = typesetText(text.toUpperCase(), 'overline', {
    width,
    palette: { text: colorValue, muted: colorValue, accent: colorValue },
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
      palette: { text: paint.text, muted: paint.muted, accent: paint.accent },
    });
    out.push(...typesetToScene(title, x, cursor, matrix, element.opacity));
    cursor += title.height + 6;
  }
  if (element.body) {
    const body = typesetText(element.body, 'small', {
      width,
      palette: { text: paint.muted, muted: paint.muted, accent: paint.accent },
    });
    out.push(...typesetToScene(body, x, cursor, matrix, element.opacity));
    cursor += body.height;
  }
  return cursor - y;
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Emit an icon at (x, y) with the given box `size`, in the local space of
 * `matrix`. Stroke width scales with the icon so a 24 px and a 240 px copy of
 * the same icon look like the same drawing.
 */
export function iconScene(
  name: IconName | undefined,
  x: number,
  y: number,
  size: number,
  colorValue: string,
  ciStrokeWidth: number,
  matrix: Mat = matTranslate(0, 0),
  opacity = 1,
): ScenePrim[] {
  const def = iconDef(name);
  const scale = size / iconGrid;
  const local = matMultiply(
    matMultiply(matrix, matTranslate(x, y)),
    [scale, 0, 0, scale, 0, 0] as Mat,
  );
  const weight = (ciStrokeWidth / strokeTokens.regular) * iconStrokeGrid * scale;

  return def.prims.map((prim) => {
    const { segs, closed } = iconPrimSegs(prim);
    const filled = 'fill' in prim && prim.fill === true;
    return {
      t: 'path',
      segs: transformSegs(segs, local),
      closed,
      fill: filled ? colorValue : undefined,
      stroke: filled ? undefined : colorValue,
      strokeWidth: filled ? 0 : weight,
      lineCap: 'round',
      lineJoin: 'round',
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
      return { segs: rectSegs(prim.x, prim.y, prim.w, prim.h, prim.r ?? 0), closed: true };
    case 'line':
      return { segs: lineSegs(prim.x1, prim.y1, prim.x2, prim.y2), closed: false };
    case 'polyline':
      return { segs: polySegs(prim.points, false), closed: false };
    case 'polygon':
      return { segs: polySegs(prim.points, true), closed: true };
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
/* Typeset → Scene                                                             */
/* -------------------------------------------------------------------------- */

/** Translate typeset output into scene primitives, optionally through a matrix. */
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
          segs: transformSegs(rectSegs(prim.x, prim.y, prim.w, prim.h, prim.r ?? 0), local),
          closed: true,
          fill: prim.fill === 'transparent' ? undefined : prim.fill,
          stroke: prim.stroke,
          strokeWidth: prim.strokeWidth,
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

/** Rotation angle (degrees) encoded in a rotation+translation matrix. */
function matrixRotation(m: Mat): number {
  const angle = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  return Math.abs(angle) < 1e-6 ? 0 : angle;
}

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                              */
/* -------------------------------------------------------------------------- */

function combineOpacity(a: number, b: number | undefined): number | undefined {
  const value = a * (b ?? 1);
  return value >= 1 ? undefined : value;
}

/** Blend a hex colour with an alpha channel, producing `rgba(...)`. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let value = match[1];
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  const int = Number.parseInt(value, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
