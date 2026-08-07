/**
 * Die Primitive, aus denen ein nozilla-Icon besteht.
 *
 * Die Geometrie kommt aus dem CI-Repo (Dialekt A: 64 × 64, 4 px, square caps,
 * miter joins). Sie liegt strukturiert vor statt als Markup, weil dieselbe
 * Zeichnung in drei Ausgaben landet — Canvas, SVG-Export, PDF-Export.
 */

/** Wo eine Fläche ihre Farbe herbekommt. */
export type IconPaintRole = 'ink' | 'signal';

interface IconPaint {
  /** Fläche füllen statt stricheln. */
  fill?: IconPaintRole;
  /** Strichfarbe abweichend von der Tinte des Elements. */
  stroke?: IconPaintRole;
  /** Strichstärke im 64er-Raster, abweichend vom CI-Standard (4). */
  sw?: number;
  /** Strichmuster im 64er-Raster. */
  dash?: number[];
  /** Drehung [Grad, cx, cy] im 64er-Raster. */
  rotate?: [number, number, number];
}

export type IconPrim =
  | ({ t: 'path'; d: string } & IconPaint)
  | ({ t: 'circle'; cx: number; cy: number; r: number } & IconPaint)
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & IconPaint)
  | ({ t: 'rect'; x: number; y: number; w: number; h: number } & IconPaint);

/** Das Raster, auf dem alle Icons gezeichnet sind. */
export const ICON_GRID = 64;
/** Die CI-Strichstärke in diesem Raster. */
export const ICON_STROKE = 4;
