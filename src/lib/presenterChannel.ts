/**
 * Was die beiden Fenster einander sagen.
 *
 * Die Referentenansicht ist ein **zweites Fenster desselben Werkzeugs**, nicht
 * ein Teil des ersten. Das ist die Bedingung: der Vortrag läuft auf dem
 * Beamer, die Notizen auf dem Bildschirm davor, und beide Fenster müssen sich
 * unabhängig in den Vollbildmodus schicken lassen. Ein Bereich innerhalb des
 * einen Fensters könnte das nicht.
 *
 * Gesprochen wird über einen `BroadcastChannel`. Kein `postMessage` auf das
 * geöffnete Fenster: das ginge nur in eine Richtung und stürbe, sobald der
 * Vortragende die Fenster einmal andersherum öffnet. Ein Kanal ist
 * symmetrisch, und beide Seiten dürfen jederzeit dazukommen — deshalb fragt
 * die Referentenansicht mit `hallo`, statt darauf zu hoffen, dass sie den
 * ersten Stand mitbekommt.
 *
 * Das Deck geht **als Markdown** über den Kanal und nicht als Objekt. Es ist
 * ohnehin das Dateiformat, es überlebt das Klonen zwischen zwei Fenstern
 * garantiert, und wer beim Fehlersuchen in den Kanal sieht, liest etwas.
 */

export const PRESENTER_CHANNEL = 'nz-vortrag';

/** Der Zustand, dem die Referentenansicht folgt. */
export interface Vortragsstand {
  slideIndex: number;
  revealStep: number;
  totalSlides: number;
}

export type Vortragsnachricht =
  /** „Ich bin da — schick mir alles." */
  | { art: 'hallo' }
  /** Das ganze Deck, als Markdown. */
  | { art: 'deck'; markdown: string }
  /** Wo der Vortrag gerade steht. */
  | { art: 'stand'; stand: Vortragsstand }
  /** Die Referentenansicht blättert. */
  | { art: 'weiter' }
  | { art: 'zurueck' }
  /** Der Vortrag ist zu Ende; das zweite Fenster darf sich schließen. */
  | { art: 'ende' }
  /** Die Referentenansicht geht zu. */
  | { art: 'tschuess' };

/**
 * Den Kanal öffnen, oder `null`, wo es keinen gibt.
 *
 * `BroadcastChannel` fehlt in älteren Browsern und in den Tests. Ein `null`
 * hier ist deshalb kein Fehler, sondern der Normalfall an einem Ort, an dem
 * es keine zwei Fenster gibt.
 */
export function openPresenterChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(PRESENTER_CHANNEL);
}

/**
 * Der Reveal-Schritt in einer Zahl, die das Klonen übersteht.
 *
 * Eine Folie, die ganz gezeigt wird, steht im Store auf `Infinity`. Der
 * strukturierte Klon zwischen zwei Fenstern trägt `Infinity` zwar hinüber,
 * aber die Vergleiche auf der anderen Seite werden damit unangenehm — und in
 * JSON, das beim Fehlersuchen mitläuft, wird daraus `null`. Eine sehr große
 * endliche Zahl bedeutet dasselbe und rechnet sich überall.
 */
export function endlicherSchritt(step: number): number {
  return Number.isFinite(step) ? step : Number.MAX_SAFE_INTEGER;
}

/** Die Adresse, unter der das zweite Fenster aufgeht. */
export const PRESENTER_QUERY = 'referent';

export function isPresenterWindow(search: string): boolean {
  return new URLSearchParams(search).get(PRESENTER_QUERY) === '1';
}
