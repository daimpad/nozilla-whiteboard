/**
 * Die Decks, die mitgeliefert werden.
 *
 * Zwei, und der Unterschied ist der Punkt: das eine gehört nozilla, das andere
 * einem erfundenen Kunden. Ein Werkzeug, das mehrere Erscheinungsbilder kann,
 * aber nur ein Deck der eigenen Marke zeigt, belegt seine Behauptung nicht —
 * man sieht dem nozilla-Deck unter fremder Marke an, dass es dafür nicht
 * gemacht wurde, weil jeder von Hand gelegte Titel für *diese* Schrift
 * ausgemessen ist.
 *
 * Das Musterkunde-Deck ist deshalb kein Schaustück, sondern eine Prüfung, die
 * man ansehen kann: eigene Palette, eigene Schrift, eigene Wortmarke, eigene
 * Zeichen — und alles auf Folien, die für genau diese Maße gelegt sind.
 */
import welcome from './welcome.md?raw';
import musterkunde from './musterkunde.md?raw';

export interface BundledDeck {
  /** Der Dateiname, unter dem es in der Kopfleiste steht. */
  file: string;
  label: string;
  hint: string;
  source: string;
}

export const bundledDecks: readonly BundledDeck[] = [
  {
    file: 'welcome.md',
    label: 'Willkommensmappe',
    hint: 'nozilla — jedes Layout, jede Elementart',
    source: welcome,
  },
  {
    file: 'musterkunde.md',
    label: 'Probenhaus',
    hint: 'Musterkunde — ein Deck unter fremder Marke',
    source: musterkunde,
  },
];

/** Das Deck, mit dem das Werkzeug startet. */
export const starterDeck = bundledDecks[0];
