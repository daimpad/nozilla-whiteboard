/**
 * Welches Folienformat gerade gilt.
 *
 * Bis hierher war das Folienmaß eine Konstante der CI: 1280 × 720, strukturell
 * und für jede Marke dieselbe. Das bleibt es auch — was hier dazukommt, ist
 * nicht eine Wahl der *Marke*, sondern eine des **Decks**: dieselbe CI, ein
 * anderes Blatt. Wer für den Bildschirm baut, will 16:9; wer eine Seite baut,
 * die gedruckt und gelocht wird, will A4.
 *
 * ## Warum `export let` und keine Funktion
 *
 * Dieselbe Antwort wie in `runtime.ts`, und aus demselben Grund: `canvas.width`
 * und `canvas.height` werden an einundsechzig Stellen gelesen. Aus jeder davon
 * `folienmasse().height` zu machen, hieße einundsechzig Stellen anzufassen für
 * einen Gewinn, den ES-Module ohnehin liefern — **eine exportierte Bindung ist
 * lebendig.**
 *
 * Der Preis ist dieselbe Regel: **nichts darf den Wert beim Laden abgreifen.**
 * Ein `const { width, height } = canvas` auf Modulebene friert das Format ein,
 * das beim Start zufällig galt. Drei solche Stellen gab es — der Satzspiegel
 * der Layouts, die Fußzeile und das Seitenmaß im PPTX —, sie sind jetzt
 * Funktionen. Wer eine vierte anlegt, merkt es nicht; deshalb prüft
 * `folienformat.test.ts` das **Ergebnis** eines Wechsels und nicht die
 * Mechanik.
 *
 * ## Warum nur die Höhe wechselt
 *
 * Weil damit keine einzige waagerechte Größe wechselt: Satzspiegel,
 * Spaltenbreiten, die Einsetzspalten, `tableColumnWidths()`, jeder
 * Zeilenumbruch und jede vorgemessene Wortbreite bleiben, wie sie sind. Ein
 * Format, das auch die Breite änderte, setzte jeden Text neu — und ein Deck,
 * das jemand umstellt, käme mit anderen Umbrüchen zurück, ohne dass er ein
 * Wort angefasst hätte.
 *
 * Beide A4-Formate sind deshalb **höher** als 16:9. Ein bestehendes Deck
 * umzustellen kann nichts wegschieben; nur der Rückweg kann Elemente unter die
 * Kante schicken, und das ist die eine Richtung, vor der gewarnt gehört.
 */
import { canvas as ciCanvas } from '@theme';

/**
 * Das Seitenverhältnis der DIN-A-Reihe.
 *
 * Keine erfundene Zahl, sondern die Eigenschaft, die A4 zu A4 macht: die lange
 * Kante ist die kurze mal Wurzel zwei. Steht hier und nicht neben dem
 * Blatt-Export, weil beide dieselbe Frage stellen — zwei Konstanten für
 * dieselbe Tatsache laufen früher oder später auseinander.
 */
export const DIN_HOCH = Math.SQRT2;

export const folienformate = ['16-9', 'a4-hoch', 'a4-quer'] as const;
export type Folienformat = (typeof folienformate)[number];

/**
 * Die Maße einer Folie — dieselben Rollen wie in der CI, nur nicht mehr auf
 * ihre Startwerte festgelegt.
 *
 * Abgelesen und nicht aufgeschrieben: eine getippte Feldliste wäre eine zweite
 * Wahrheit über die CI, und käme dort eine Angabe dazu, hätte dieser Typ sie
 * nicht.
 */
export type Folienmasse = {
  readonly [K in keyof typeof ciCanvas]: (typeof ciCanvas)[K] extends number
    ? number
    : (typeof ciCanvas)[K];
};

/**
 * Wie hoch die Folie in diesem Format ist.
 *
 * `16-9` nimmt die Höhe der **CI** und rechnet sie nicht aus dem Namen: das
 * Format ist die Folie, die dieses Werkzeug seit je zeichnet, und wenn die CI
 * ihr Maß je änderte, soll es mitgehen. Dass der Name dann noch stimmt, hält
 * eine Zusicherung in `folienformat.test.ts` fest — wer ein Format benennt,
 * muss es auch zeichnen.
 */
export function folienhoehe(format: Folienformat): number {
  switch (format) {
    case 'a4-hoch':
      return Math.round(ciCanvas.width * DIN_HOCH);
    case 'a4-quer':
      return Math.round(ciCanvas.width / DIN_HOCH);
    case '16-9':
      return ciCanvas.height;
  }
}

export function istFolienformat(wert: unknown): wert is Folienformat {
  return typeof wert === 'string' && (folienformate as readonly string[]).includes(wert);
}

/* -------------------------------------------------------------------------- */
/* Die lebendige Bindung                                                       */
/* -------------------------------------------------------------------------- */

function masse(format: Folienformat): Folienmasse {
  return { ...ciCanvas, height: folienhoehe(format) };
}

let aktuell: Folienformat = '16-9';

export let canvas: Folienmasse = masse(aktuell);

export function aktivesFolienformat(): Folienformat {
  return aktuell;
}

/**
 * Das Format umstellen. Gibt zurück, ob sich etwas geändert hat.
 *
 * Der Rückgabewert ist nicht Zierde: `announce()` zeichnet die halbe Oberfläche
 * neu, und ein Deck zu laden, das dasselbe Format trägt wie das vorige, ist der
 * Normalfall.
 */
export function setzeFolienformat(format: Folienformat): boolean {
  if (format === aktuell) return false;
  aktuell = format;
  canvas = masse(format);
  announce();
  return true;
}

/* -------------------------------------------------------------------------- */
/* Das Signal für die Oberfläche                                               */
/* -------------------------------------------------------------------------- */

/**
 * Ein Zähler, kein Formatname: `useSyncExternalStore` zeichnet nur neu, wenn
 * sich der Schnappschuss ändert — dieselbe Bauart wie beim Erscheinungsbild.
 */
let version = 0;
const listeners = new Set<() => void>();

export function subscribeFolienformat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function folienformatVersion(): number {
  return version;
}

function announce(): void {
  version += 1;
  for (const listener of listeners) listener();
}
