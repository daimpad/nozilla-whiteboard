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
import { HOECHSTKANTE, neuschrift, zielmass } from './imageElement';

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

describe('ob ein Bild überhaupt neu geschrieben wird', () => {
  /*
     Die Lücke im ersten Anlauf, und sie ist am Maßband aufgefallen: angefasst
     wurde nur, was zu *breit* war. Ein Vollbild-Bildschirmfoto mit
     2560 × 1440 liegt genau auf der Kappungsgrenze, wurde also durchgereicht —
     und blieb als PNG bei 1,6 Millionen Zeichen, wo dasselbe Bild als JPEG
     219.000 braucht.
  */
  const KLEIN = 100_000;
  const GROSS = 1_600_000;

  it('lässt ein kleines Bild in Ruhe', () => {
    expect(neuschrift(800, 600, 'image/png', KLEIN)).toBeNull();
  });

  it('fasst ein zu langes Bild an, auch wenn das Maß passt', () => {
    // Genau auf der Kante — nichts zu kappen, und trotzdem zu viel.
    expect(neuschrift(HOECHSTKANTE, 1440, 'image/png', GROSS)).toEqual({
      w: HOECHSTKANTE,
      h: 1440,
    });
  });

  it('kappt weiterhin, was zu breit ist — auch wenn es kurz ist', () => {
    // Ein Bild kann sehr groß und trotzdem gut gepackt sein; gekappt wird es
    // dennoch, denn breiter als die Folie nützt es in keiner Ausgabe.
    expect(neuschrift(5000, 5000, 'image/png', KLEIN)).toEqual({
      w: HOECHSTKANTE,
      h: HOECHSTKANTE,
    });
  });

  it('schreibt ein JPEG nicht ohne Not noch einmal', () => {
    // Jede Runde durch den Kodierer frisst Kanten, und ein JPEG ist bereits
    // die knappe Fassung — ein paar Prozent wären das nicht wert.
    expect(neuschrift(2000, 1500, 'image/jpeg', GROSS)).toBeNull();
    // Muss es ohnehin kleiner gezeichnet werden, dann aber schon.
    expect(neuschrift(5000, 3000, 'image/jpeg', GROSS)).not.toBeNull();
  });

  it('lässt fremde Formate ganz in Ruhe', () => {
    // Ein SVG ist keine Rasterdatei: es zu rastern machte aus etwas beliebig
    // Scharfem etwas Unscharfes. Und ein WebP nach PNG wäre größer.
    expect(neuschrift(9000, 9000, 'image/svg+xml', GROSS)).toBeNull();
    expect(neuschrift(9000, 9000, 'image/webp', GROSS)).toBeNull();
  });
});
