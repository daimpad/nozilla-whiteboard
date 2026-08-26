/**
 * Wie groß ein eingebettetes Bild werden darf.
 *
 * Der Fehler dahinter: ein Foto wurde in voller Auflösung eingebettet. Vier
 * Megabyte werden als data-URI zu 5,3 Millionen Zeichen, und `localStorage`
 * zählt in UTF-16 — also gut zehn Megabyte gegen ein Kontingent von etwa fünf.
 * Ein einziges eingefügtes Bild legte die Selbstsicherung still, und zu sehen
 * war davon nichts.
 */
import { describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import { HOECHSTKANTE, zielmass } from './imageElement';

describe('das Maß eines eingebetteten Bildes', () => {
  it('misst sich an der Rasterbreite einer Folie', () => {
    // Nicht geraten: so breit rastert dieses Werkzeug eine ganze Folie. Ein
    // Bild, das breiter ist, kann in keiner Ausgabe von hier mehr zeigen.
    expect(HOECHSTKANTE).toBe(canvas.width * 2);
  });

  it('lässt in Ruhe, was hineinpasst', () => {
    expect(zielmass(800, 600)).toBeNull();
    // Genau auf der Kante ist noch drin — sonst würde jedes Bild, das schon
    // einmal durch diese Rechnung ging, beim nächsten Mal wieder gerechnet.
    expect(zielmass(HOECHSTKANTE, 100)).toBeNull();
  });

  it('kappt die längste Kante und behält das Seitenverhältnis', () => {
    const ziel = zielmass(4032, 3024);
    expect(ziel).not.toBeNull();
    expect(ziel?.w).toBe(HOECHSTKANTE);
    // 4 : 3 bleibt 4 : 3.
    expect(ziel?.h).toBe(Math.round((HOECHSTKANTE * 3) / 4));
  });

  it('erkennt die längste Kante auch hochkant', () => {
    // Die erste Fassung dieser Rechnung sah nur auf die Breite. Ein Foto im
    // Hochformat kam damit ungekappt durch — und genau so entstehen sie.
    const ziel = zielmass(3024, 4032);
    expect(ziel?.h).toBe(HOECHSTKANTE);
    expect(ziel?.w).toBe(Math.round((HOECHSTKANTE * 3) / 4));
  });

  it('lässt keine Kante auf null fallen', () => {
    // Ein Trennstrich von 8000 × 3: der Faktor drückt die Höhe unter einen
    // halben Bildpunkt, und eine Zeichenfläche der Höhe null lässt `drawImage`
    // werfen. Aus dem eingefügten Bild würde dann gar keines.
    const ziel = zielmass(80_000, 3);
    expect(ziel?.w).toBe(HOECHSTKANTE);
    expect(ziel?.h).toBeGreaterThanOrEqual(1);
  });
});
