/**
 * Die Primitive, aus denen ein nozilla-Icon besteht.
 *
 * Die Geometrie kommt aus dem CI-Repo (Dialekt A: 64 × 64, 4 px, square caps,
 * miter joins). Sie liegt strukturiert vor statt als Markup, weil dieselbe
 * Zeichnung in drei Ausgaben landet — Canvas, SVG-Export, PDF-Export.
 */

/**
 * Wo eine Fläche ihre Farbe herbekommt.
 *
 * `signal-soft` und `signal-deep` sind die beiden anderen Stufen der
 * Grün-Rampe des CI. Sie schattieren innerhalb einer Zeichnung, vor allem in
 * der Pixel-Reihe, und stehen nie für eine Handlung. Ohne sie fehlten dem Set
 * fünf Zeichen, weil ihre Schattierung sich nicht in `ink` und `signal`
 * ausdrücken lässt.
 */
export type IconPaintRole = 'ink' | 'signal' | 'signal-soft' | 'signal-deep';

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

/**
 * Die Signatur des nozilla-Sets: ein 6 × 6 großer Punkt unten rechts, in
 * Signalgrün, als letztes Primitiv jedes Zeichens.
 *
 * Sie steht hier als Wert und nicht als Zahlenfolge in drei Dateien, weil drei
 * Stellen sie brauchen: der Test, der sie einfordert, die Oberfläche, die sie in
 * kleinen Knöpfen weglässt, und der Übersetzer, der sie anhängt. Sie gehört zum
 * Set und nicht zum Dialekt — ein fremdes Set darf ohne sie auskommen.
 */
export const ICON_SIGNATURE = {
  t: 'rect',
  x: 54,
  y: 54,
  w: 6,
  h: 6,
  fill: 'signal',
} as const satisfies IconPrim;
