/**
 * Aus einer Bilddatei wird ein Element.
 *
 * Zwei Wege führen hierher — eine Datei auf die Fläche fallen lassen und ein
 * Bildschirmfoto aus der Zwischenablage einfügen. Sie sollen dasselbe ergeben,
 * und dafür gibt es die Funktion: als beide Wege ihre eigene Rechnung hatten,
 * hätte ein anderer Seitenverhältnis-Fallback in einem der beiden monatelang
 * unbemerkt bleiben können.
 */
import { readFileAsDataUrl } from '@/lib/export/download';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/** So breit wird ein eingesetztes Bild; die Höhe folgt dem Seitenverhältnis. */
const BREITE = 420;

/** 16 : 9, wenn das Bild seine eigenen Maße nicht verrät. */
const ERSATZ_VERHAELTNIS = 0.5625;

export async function imageElementFromFile(
  file: File,
  patch: Partial<CanvasElement> = {},
): Promise<CanvasElement> {
  const src = await readFileAsDataUrl(file);
  const bild = await new Promise<HTMLImageElement>((fertig, gescheitert) => {
    const element = new Image();
    element.onload = () => fertig(element);
    element.onerror = gescheitert;
    element.src = src;
  }).catch(() => null);

  const verhaeltnis =
    bild && bild.naturalWidth > 0 ? bild.naturalHeight / bild.naturalWidth : ERSATZ_VERHAELTNIS;

  return createElement('image', {
    src,
    // Ein Bildschirmfoto aus der Zwischenablage heißt „image.png" — daraus
    // wird kein brauchbarer Alternativtext, also bleibt er leer und der
    // Inspektor fragt danach.
    alt: dateiname(file),
    w: BREITE,
    h: Math.round(BREITE * verhaeltnis),
    ...patch,
  } as never) as CanvasElement;
}

function dateiname(file: File): string {
  const roh = file.name.replace(/\.[^.]+$/, '').trim();
  return roh && roh !== 'image' ? roh : '';
}
