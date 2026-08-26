/**
 * Wie fein eine Folie gerastert wird.
 *
 * Steht in einer eigenen Datei, weil zwei sehr verschiedene Stellen dieselbe
 * Zahl brauchen: der PNG-Export, der damit rechnet, und das Einbetten eines
 * Bildes, das sich daran misst, wie groß ein Bild überhaupt noch etwas nützt.
 * Läge sie in `png.ts`, zöge der Import den ganzen Ausgabeweg samt jsPDF in
 * das erste Bündel — für eine einzige Zahl.
 */

/** Wie viele Bildpunkte auf eine Folien-Einheit kommen. */
export const SCHAERFE = 2;
