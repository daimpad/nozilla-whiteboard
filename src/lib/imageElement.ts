/**
 * Aus einer Bilddatei wird ein Element.
 *
 * Zwei Wege führen hierher — eine Datei auf die Fläche fallen lassen und ein
 * Bildschirmfoto aus der Zwischenablage einfügen. Sie sollen dasselbe ergeben,
 * und dafür gibt es die Funktion: als beide Wege ihre eigene Rechnung hatten,
 * hätte ein anderer Seitenverhältnis-Fallback in einem der beiden monatelang
 * unbemerkt bleiben können.
 */
import { canvas } from '@/theme';
import { readFileAsDataUrl } from '@/lib/export/download';
import { SCHAERFE } from '@/lib/export/raster';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/** So breit wird ein eingesetztes Bild; die Höhe folgt dem Seitenverhältnis. */
const BREITE = 420;

/** 16 : 9, wenn das Bild seine eigenen Maße nicht verrät. */
const ERSATZ_VERHAELTNIS = 0.5625;

/**
 * Die längste Kante, die ein eingebettetes Bild behalten darf.
 *
 * Nicht geraten, sondern abgeleitet: so breit rastert dieses Werkzeug eine
 * ganze Folie (`canvas.width × SCHAERFE`). Ein Bild, das breiter ist als die
 * Folie, auf der es liegt, kann in **keiner** Ausgabe von hier mehr
 * Einzelheiten zeigen — es trägt seine zusätzlichen Bildpunkte nur durch die
 * `.md`, durch die Sitzungsablage und in jeden Export.
 *
 * Und das ist keine Sparsamkeit um ihrer selbst willen. Ein Foto aus einem
 * Telefon hat gut vier Megabyte; als data-URI werden daraus 5,3 Millionen
 * Zeichen, und `localStorage` zählt in UTF-16 — also gut zehn Megabyte gegen
 * ein Kontingent von etwa fünf. Ein einziges eingefügtes Bild legte die
 * Selbstsicherung damit still.
 */
export const HOECHSTKANTE = canvas.width * SCHAERFE;

/**
 * Auf welches Maß ein Bild geschrumpft wird — oder `null`, wenn es bleiben
 * darf.
 *
 * Steht getrennt vom Zeichnen, weil das Urteil prüfbar sein soll und das
 * Zeichnen eine Zeichenfläche braucht, die es in einem Test ohne Browser
 * nicht gibt.
 */
export function zielmass(breite: number, hoehe: number): { w: number; h: number } | null {
  const kante = Math.max(breite, hoehe);
  if (!(kante > HOECHSTKANTE)) return null;

  const faktor = HOECHSTKANTE / kante;
  return {
    // Mindestens ein Bildpunkt: ein extrem schmales Bild — ein Trennstrich von
    // 8000 × 3 — käme sonst mit einer Kante von null heraus, und `drawImage`
    // auf eine Fläche der Breite null wirft.
    w: Math.max(1, Math.round(breite * faktor)),
    h: Math.max(1, Math.round(hoehe * faktor)),
  };
}

/**
 * Welche Formate hier angefasst werden dürfen.
 *
 * PNG und JPEG, und ausdrücklich sonst nichts. Ein SVG ist keine Rasterdatei —
 * es zu rastern hieße, aus etwas Kleinem und beliebig Scharfem etwas Großes
 * und Unscharfes zu machen. Und ein WebP nach PNG umzuschreiben macht es
 * größer, nicht kleiner.
 */
const RASTERFORMATE = new Set(['image/png', 'image/jpeg']);

/**
 * Ab wann ein PNG gegen ein JPEG getauscht wird.
 *
 * Das Kappen allein reichte nicht, und das fiel erst am Ergebnis auf: **ein
 * Foto aus der Zwischenablage ist immer ein PNG.** Der Umweg über die
 * Zwischenablage kennt kein anderes Format, und PNG rechnet ein Foto nicht
 * klein — es blieben Megabyte, und die Sitzungsablage blieb genauso tot wie
 * vorher.
 *
 * Entschieden wird deshalb an der Datei und nicht am Dateinamen: beide
 * Fassungen werden geschrieben, und das JPEG bekommt den Zuschlag nur, wenn es
 * **deutlich** kleiner ist. Ein Bildschirmfoto rechnet PNG ohnehin besser als
 * JPEG; es kommt hier gar nicht erst in die Nähe und behält seine scharfen
 * Buchstaben. Ein Foto unterbietet das PNG um ein Vielfaches. Die Hälfte ist
 * die Grenze, weil unterhalb davon der Gewinn den Verlust nicht mehr trägt.
 */
const JPEG_LOHNT_SICH_AB = 0.5;

export async function imageElementFromFile(
  file: File,
  patch: Partial<CanvasElement> = {},
): Promise<CanvasElement> {
  const roh = await readFileAsDataUrl(file);
  const bild = await lade(roh);

  const verhaeltnis =
    bild && bild.naturalWidth > 0 ? bild.naturalHeight / bild.naturalWidth : ERSATZ_VERHAELTNIS;

  return createElement('image', {
    src: (bild && verkleinert(bild, file.type)) || roh,
    // Ein Bildschirmfoto aus der Zwischenablage heißt „image.png" — daraus
    // wird kein brauchbarer Alternativtext, also bleibt er leer und der
    // Inspektor fragt danach.
    alt: dateiname(file),
    w: BREITE,
    h: Math.round(BREITE * verhaeltnis),
    ...patch,
  } as never) as CanvasElement;
}

function lade(src: string): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement>((fertig, gescheitert) => {
    const element = new Image();
    element.onload = () => fertig(element);
    element.onerror = gescheitert;
    element.src = src;
  }).catch(() => null);
}

/**
 * Das Bild neu zeichnen, kleiner — oder `null`, wenn es dabei bleibt.
 *
 * `null` kommt auch heraus, wo es keine Zeichenfläche gibt: in einem Test ohne
 * Browser, oder wenn `toDataURL` an einer fremden Herkunft scheitert. Dann
 * bleibt das Bild, wie es kam. Ein Werkzeug, das an dieser Stelle gar kein
 * Bild einsetzte, wäre die schlechtere Lage.
 */
function verkleinert(bild: HTMLImageElement, mime: string): string | null {
  if (!RASTERFORMATE.has(mime)) return null;

  const ziel = zielmass(bild.naturalWidth, bild.naturalHeight);
  if (!ziel) return null;

  try {
    const flaeche = document.createElement('canvas');
    flaeche.width = ziel.w;
    flaeche.height = ziel.h;
    const stift = flaeche.getContext('2d');
    if (!stift) return null;
    stift.drawImage(bild, 0, 0, ziel.w, ziel.h);

    // Ohne Güteangabe: die des Browsers ist für JPEG seit je 0,92, und eine
    // eigene Zahl wäre eine erfundene.
    const png = flaeche.toDataURL('image/png');
    if (durchsichtig(stift, flaeche.width, flaeche.height)) return png;

    const jpeg = flaeche.toDataURL('image/jpeg');
    return jpeg.length < png.length * JPEG_LOHNT_SICH_AB ? jpeg : png;
  } catch {
    return null;
  }
}

/**
 * Trägt das Bild irgendwo Durchsicht?
 *
 * Dann kommt kein JPEG in Frage, egal wie klein es wäre: JPEG kennt keine
 * Durchsicht und legt sie auf Schwarz. Ein freigestelltes Zeichen bekäme einen
 * schwarzen Kasten, und das fiele erst in der fertigen Datei auf.
 */
function durchsichtig(stift: CanvasRenderingContext2D, breite: number, hoehe: number): boolean {
  const daten = stift.getImageData(0, 0, breite, hoehe).data;
  for (let i = 3; i < daten.length; i += 4) {
    if (daten[i] < 255) return true;
  }
  return false;
}

function dateiname(file: File): string {
  const roh = file.name.replace(/\.[^.]+$/, '').trim();
  return roh && roh !== 'image' ? roh : '';
}
