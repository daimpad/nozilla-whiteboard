/**
 * Scene → PDF.
 *
 * True vector output: shapes become PDF path operators, text becomes real PDF
 * text (selectable, searchable, copy-pasteable). Nothing is rasterised except
 * bitmap images the author placed themselves.
 *
 * Font note — a PDF cannot reference the CI web font without embedding it, so
 * the exporter uses the metric-compatible core fonts declared in
 * `theme.config.ts` (`pdfFontFamily`). Because line breaking has already
 * happened against the *real* on-screen metrics and every line is emitted at an
 * absolute position, the substitution never reflows the deck; it only changes
 * the glyph shapes slightly.
 */
import type { jsPDF } from 'jspdf';
import { brand, canvas as canvasTokens, pdfFontFamily } from '@/theme';
import { ellipseSegs, rectSegs, type Seg } from '@/lib/geometry/path';
import { parseColor, type Rgba } from './color';
import type { Scene, ScenePrim, SceneRun } from './scene';

/** Slide units → PDF points. 1280×720 slide units become a 960×540 pt page. */
export const PDF_SCALE = 0.75;

export interface PdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  /** Override the slide-unit → point scale. */
  scale?: number;
  /** Bitmap data for `image` primitives, keyed by `href`. */
  images?: Map<string, { dataUrl: string; format: string }>;
}

/**
 * jsPDF is loaded on demand: it is by far the heaviest dependency, and a deck
 * that is never exported should not pay for it at boot.
 */
export async function scenesToPdf(
  scenes: readonly Scene[],
  options: PdfOptions = {},
): Promise<jsPDF> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const scale = options.scale ?? PDF_SCALE;
  const pageWidth = canvasTokens.width * scale;
  const pageHeight = canvasTokens.height * scale;

  const doc = new JsPdf({
    orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageWidth, pageHeight],
    compress: true,
  });

  doc.setProperties({
    title: options.title ?? scenes[0]?.title ?? brand.product,
    author: options.author ?? brand.name,
    subject: options.subject ?? '',
    creator: brand.product,
  });

  scenes.forEach((scene, index) => {
    if (index > 0)
      doc.addPage([pageWidth, pageHeight], pageWidth >= pageHeight ? 'landscape' : 'portrait');
    drawScene(doc, scene, scale, options);
  });

  return doc;
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                     */
/* -------------------------------------------------------------------------- */

function drawScene(doc: jsPDF, scene: Scene, scale: number, options: PdfOptions): void {
  const backdrop = parseColor(scene.background) ?? { r: 255, g: 255, b: 255, a: 1 };
  let currentOpacity = 1;

  const setOpacity = (value: number) => {
    const next = Math.min(1, Math.max(0, value));
    if (Math.abs(next - currentOpacity) < 0.001) return;
    currentOpacity = next;
    // jsPDF exposes the graphics-state constructor on the instance.
    const GStateCtor = (
      doc as unknown as {
        GState?: new (options: Record<string, unknown>) => unknown;
      }
    ).GState;
    if (GStateCtor) {
      doc.setGState(new GStateCtor({ opacity: next, 'stroke-opacity': next }) as never);
    }
  };

  for (const prim of scene.prims) {
    switch (prim.t) {
      case 'rect':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, rectToSegs(prim), prim, scale, backdrop);
        break;
      case 'ellipse':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, ellipseToSegs(prim), prim, scale, backdrop);
        break;
      case 'path':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, prim.segs, prim, scale, backdrop, prim.closed);
        break;
      case 'text':
        setOpacity(prim.opacity ?? 1);
        drawText(doc, prim, scale, backdrop);
        break;
      case 'image':
        setOpacity(prim.opacity ?? 1);
        drawImage(doc, prim, scale, options);
        break;
    }
  }

  setOpacity(1);
}

interface PaintLike {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round';
}

function drawSegs(
  doc: jsPDF,
  segs: readonly Seg[],
  paint: PaintLike,
  scale: number,
  backdrop: Rgba,
  closed = true,
): void {
  const fill = paint.fill ? parseColor(paint.fill) : null;
  const strokeColor = paint.stroke ? parseColor(paint.stroke) : null;
  const strokeWidth = paint.strokeWidth ?? 0;

  const hasFill = Boolean(fill && fill.a > 0 && closed);
  const hasStroke = Boolean(strokeColor && strokeColor.a > 0 && strokeWidth > 0);
  if (!hasFill && !hasStroke) return;

  if (fill && hasFill) {
    const flat = fill.a < 1 ? blend(fill, backdrop) : fill;
    doc.setFillColor(flat.r, flat.g, flat.b);
  }
  if (strokeColor && hasStroke) {
    const flat = strokeColor.a < 1 ? blend(strokeColor, backdrop) : strokeColor;
    doc.setDrawColor(flat.r, flat.g, flat.b);
    doc.setLineWidth(strokeWidth * scale);
    // Die CI zeichnet mit square caps; jsPDF kennt genau diese drei.
    doc.setLineCap(paint.lineCap ?? 'butt');
    doc.setLineJoin(paint.lineJoin === 'round' ? 'round' : 'miter');
    doc.setLineDashPattern(paint.dash ? paint.dash.map((n) => n * scale) : [], 0);
  }

  const style = hasFill && hasStroke ? 'FD' : hasFill ? 'F' : 'S';

  for (const subpath of splitSubpaths(segs)) {
    if (subpath.legs.length === 0) continue;
    doc.lines(
      subpath.legs,
      subpath.start.x * scale,
      subpath.start.y * scale,
      [scale, scale],
      style,
      subpath.closed,
    );
  }

  if (paint.dash) doc.setLineDashPattern([], 0);
}

/**
 * Split a normalised segment list into subpaths whose legs are expressed the
 * way jsPDF's `lines()` wants them: deltas from the current point, in *unscaled*
 * units (the `scale` argument does the conversion).
 */
export function splitSubpaths(
  segs: readonly Seg[],
): Array<{ start: { x: number; y: number }; legs: number[][]; closed: boolean }> {
  const out: Array<{ start: { x: number; y: number }; legs: number[][]; closed: boolean }> = [];
  let current: { start: { x: number; y: number }; legs: number[][]; closed: boolean } | null = null;
  let cx = 0;
  let cy = 0;

  for (const seg of segs) {
    switch (seg.c) {
      case 'M':
        if (current) out.push(current);
        current = { start: { x: seg.x, y: seg.y }, legs: [], closed: false };
        cx = seg.x;
        cy = seg.y;
        break;
      case 'L':
        if (!current) {
          current = { start: { x: cx, y: cy }, legs: [], closed: false };
        }
        current.legs.push([seg.x - cx, seg.y - cy]);
        cx = seg.x;
        cy = seg.y;
        break;
      case 'C':
        if (!current) {
          current = { start: { x: cx, y: cy }, legs: [], closed: false };
        }
        current.legs.push([
          seg.x1 - cx,
          seg.y1 - cy,
          seg.x2 - cx,
          seg.y2 - cy,
          seg.x - cx,
          seg.y - cy,
        ]);
        cx = seg.x;
        cy = seg.y;
        break;
      case 'Z':
        if (current) {
          current.closed = true;
          out.push(current);
          cx = current.start.x;
          cy = current.start.y;
          current = null;
        }
        break;
    }
  }

  if (current) out.push(current);
  return out;
}

function rectToSegs(prim: Extract<ScenePrim, { t: 'rect' }>): Seg[] {
  return rectSegs(prim.x, prim.y, prim.w, prim.h, 0);
}

function ellipseToSegs(prim: Extract<ScenePrim, { t: 'ellipse' }>): Seg[] {
  return ellipseSegs(prim.cx, prim.cy, prim.rx, prim.ry);
}

/* -------------------------------------------------------------------------- */
/* Text                                                                        */
/* -------------------------------------------------------------------------- */

function drawText(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'text' }>,
  scale: number,
  backdrop: Rgba,
): void {
  const angleDeg = prim.rotate ?? 0;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (const run of prim.runs) {
    if (!run.text) continue;
    const color = parseColor(run.color);
    if (!color || color.a === 0) continue;
    const flat = color.a < 1 ? blend(color, backdrop) : color;

    const family = pdfFontFamily[run.font.family];
    doc.setFont(family, pdfFontStyle(run.font.weight, run.font.italic));
    doc.setFontSize(run.font.size * scale);
    doc.setTextColor(flat.r, flat.g, flat.b);

    const x = (prim.x + run.dx * cos) * scale;
    const y = (prim.y + run.dx * sin) * scale;

    doc.text(run.text, x, y, {
      baseline: 'alphabetic',
      // jsPDF measures rotation counter-clockwise; the scene is clockwise.
      angle: angleDeg ? -angleDeg : undefined,
      charSpace: run.font.tracking ? run.font.tracking * run.font.size * scale : undefined,
    });

    if (run.underline || run.strike) {
      drawDecoration(doc, prim, run, scale, flat, cos, sin);
    }
  }
}

function drawDecoration(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'text' }>,
  run: SceneRun,
  scale: number,
  color: Rgba,
  cos: number,
  sin: number,
): void {
  const thickness = Math.max(0.6, run.font.size * 0.058);
  const offsets: number[] = [];
  if (run.underline) offsets.push(run.font.size * 0.13);
  if (run.strike) offsets.push(-run.font.size * 0.27);

  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(thickness * scale);
  doc.setLineCap('butt');
  doc.setLineDashPattern([], 0);

  for (const dy of offsets) {
    // Rotate both the run offset and the vertical decoration offset.
    const startX = prim.x + run.dx * cos - dy * sin;
    const startY = prim.y + run.dx * sin + dy * cos;
    doc.lines(
      [[run.width * cos, run.width * sin]],
      startX * scale,
      startY * scale,
      [scale, scale],
      'S',
      false,
    );
  }
}

function pdfFontStyle(weight: number, italic: boolean): string {
  const bold = weight >= 600;
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

function drawImage(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'image' }>,
  scale: number,
  options: PdfOptions,
): void {
  const entry = options.images?.get(prim.href);
  const source = entry?.dataUrl ?? (prim.href.startsWith('data:') ? prim.href : null);
  if (!source) return;

  const format = entry?.format ?? guessFormat(source);
  try {
    doc.addImage(
      source,
      format,
      prim.x * scale,
      prim.y * scale,
      prim.w * scale,
      prim.h * scale,
      undefined,
      'FAST',
      prim.rotate ? -prim.rotate : 0,
    );
  } catch {
    // A broken image should never abort the whole export.
  }
}

function guessFormat(dataUrl: string): string {
  if (dataUrl.includes('image/png')) return 'PNG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'JPEG';
}

/* -------------------------------------------------------------------------- */

function blend(color: Rgba, backdrop: Rgba): Rgba {
  return {
    r: Math.round(color.r * color.a + backdrop.r * (1 - color.a)),
    g: Math.round(color.g * color.a + backdrop.g * (1 - color.a)),
    b: Math.round(color.b * color.a + backdrop.b * (1 - color.a)),
    a: 1,
  };
}
