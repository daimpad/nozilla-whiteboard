/**
 * Was zwischen zwei Folien — und zwischen zwei Fenstern — durch die
 * Zwischenablage geht.
 *
 * Es wäre einfacher gewesen, die Elemente in ein eigenes JSON zu schreiben und
 * beim Einfügen wieder auszupacken. Dann gäbe es aber ein zweites Format neben
 * der `.md`, und zwei Formate laufen auseinander: eine neue Elementart, die im
 * Dateiformat gelesen wird und in der Zwischenablage nicht, fällt erst auf,
 * wenn jemand kopiert.
 *
 * Deshalb ist die Zwischenablage **ein Ausschnitt der Datei**. Kopiert wird
 * genau der `<!-- nzl -->`-Block, der auch in der `.md` stünde; eingelesen wird
 * er mit demselben `parseSlide()`. Beide Richtungen sind damit von den
 * bestehenden Prüfungen des Dateiformats mitgedeckt.
 *
 * Der Nebeneffekt ist der eigentliche Gewinn: was in der Zwischenablage liegt,
 * ist lesbarer Text. Man kann es in einen Editor werfen, in eine Nachricht
 * schreiben oder in ein zweites Fenster des Werkzeugs einfügen.
 */
import { createEmptySlide, parseSlide, serializeSlide } from '@/lib/markdown/deck';
import { createId, regroupElements } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/** Elemente als Ausschnitt der Datei — der Block, der auch in der `.md` stünde. */
export function elementsToSnippet(elements: readonly CanvasElement[]): string {
  return serializeSlide(createEmptySlide({ elements: [...elements] }));
}

/**
 * Was von einem eingefügten Text übrig bleibt.
 *
 * Frische Kennungen sind Pflicht: kopiert jemand eine Karte und fügt sie auf
 * derselben Folie wieder ein, lägen sonst zwei Elemente mit derselben Kennung
 * darauf — und jede Auswahl, jede Änderung träfe beide.
 */
export function snippetToElements(text: string): CanvasElement[] {
  if (!text.includes('elements:')) return [];
  try {
    return regroupElements(
      parseSlide(text).elements.map(
        (element) => ({ ...element, id: createId(element.kind) }) as CanvasElement,
      ),
    );
  } catch {
    // Ein Text, der wie ein Block aussah und keiner war. Kein Fehler — der
    // Benutzer hat etwas anderes kopiert, und dann wird eben nichts eingefügt.
    return [];
  }
}
