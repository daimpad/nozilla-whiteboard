/**
 * Im Deck suchen.
 *
 * Auf sechs Folien braucht das niemand. Auf vierzig schon: irgendwo steht die
 * Zahl, die man ändern muss, und der einzige Weg dorthin war, jede Folie
 * anzusehen.
 *
 * ## Was durchsucht wird
 *
 * Alles, was ein Mensch geschrieben hat: der Fließtext der Folie, die Notizen
 * für den Vortrag und jedes Textfeld jedes Elements. **Nicht** durchsucht
 * werden Kennungen, Zeichennamen und Layoutwerte — wer nach „card" sucht,
 * meint das Wort auf einer Folie und nicht die Elementart.
 *
 * Die Ausnahme ist der Name, den ein Element tragen darf: der ist von Hand
 * vergeben und steht in der Ebenenliste, also ist er Text wie jeder andere.
 *
 * ## Warum die Fundstelle mitkommt
 *
 * Ein Treffer, der nur „Folie 12" sagt, zwingt zum Zweimal-Suchen. Deshalb
 * trägt jeder Treffer den Ausschnitt um die Fundstelle — und zwar zerlegt in
 * davor, Treffer und danach, damit die Anzeige ihn hervorheben kann, ohne den
 * Text noch einmal zu durchsuchen.
 */
import type { CanvasElement, Deck } from '@/model/types';

/** Wo ein Treffer steht. */
export type Fundort = 'flow' | 'notes' | 'element';

export interface Treffer {
  slideIndex: number;
  wo: Fundort;
  /** Die Kennung des Elements — nur bei `wo === 'element'`. */
  elementId?: string;
  /** Woher im Element, für die Anzeige: „Titel", „Text", „Notiz". */
  feld: string;
  vorher: string;
  treffer: string;
  nachher: string;
}

/** Wie viele Zeichen links und rechts der Fundstelle mitkommen. */
const UMFELD = 34;

/**
 * Wie oft die Frage im Deck wirklich vorkommt.
 *
 * Nicht dasselbe wie `searchDeck(...).length`: die Liste zeigt **eine** Zeile
 * je Feld, mit dem Ausschnitt um die erste Fundstelle. Das ist als Wegweiser
 * richtig — drei Zeilen für dieselbe Karte wären dreimal derselbe Weg.
 *
 * Zum Ersetzen taugt diese Zahl aber nicht, und das ist beim Nachsehen
 * aufgefallen: „Zwiebelsuppe und Zwiebelbrot" steht in *einem* Feld, die
 * Liste meldete einen Treffer, und der Knopf hieß „Alle 1" — ersetzt wurden
 * zwei. Ein Knopf, der eine Zahl nennt und eine andere tut, ist schlimmer als
 * einer ohne Zahl.
 */
export function zaehleFunde(deck: Deck, frage: string): number {
  const gesucht = frage.trim();
  if (gesucht.length < 2) return 0;

  let anzahl = 0;
  for (const slide of deck.slides) {
    anzahl += fundstellen(slide.markdown, gesucht).length;
    anzahl += fundstellen(slide.meta.notes ?? '', gesucht).length;
    for (const element of slide.elements) {
      for (const { text } of elementTexts(element)) {
        anzahl += fundstellen(text, gesucht).length;
      }
    }
  }
  return anzahl;
}

export function searchDeck(deck: Deck, frage: string): Treffer[] {
  const gesucht = frage.trim().toLocaleLowerCase('de-DE');
  if (gesucht.length < 2) return [];

  const out: Treffer[] = [];
  deck.slides.forEach((slide, slideIndex) => {
    const nimm = (wo: Fundort, feld: string, text: string, elementId?: string) => {
      const stelle = fundstelle(text, gesucht);
      if (!stelle) return;
      out.push({ slideIndex, wo, feld, elementId, ...stelle });
    };

    nimm('flow', 'Fließtext', slide.markdown);
    nimm('notes', 'Notiz', slide.meta.notes ?? '');
    for (const element of slide.elements) {
      for (const { feld, text } of elementTexts(element)) {
        nimm('element', feld, text, element.id);
      }
    }
  });
  return out;
}

/**
 * Die Textfelder eines Elements, mit ihrem Namen für die Anzeige.
 *
 * Der `switch` zählt jede Art einzeln auf, statt über die Werte des Objekts zu
 * laufen. Das ist mehr Text, aber es hält Kennungen, Zeichennamen und
 * Layoutwerte draußen — und eine neue Elementart fällt beim Übersetzen auf,
 * statt still nichts zu finden.
 */
export interface Textfeld {
  /** Der Name für die Anzeige — „Titel", „Zahlen", „Alternativtext". */
  feld: string;
  /**
   * Der Schlüssel, unter dem das Feld im Element steht.
   *
   * Er kam mit dem Ersetzen dazu. Ein Treffer, der nur weiß, dass er „im
   * Titel" steht, lässt sich anzeigen, aber nicht zurückschreiben — und zwei
   * Tabellen, eine für die Anzeige und eine fürs Schreiben, liefen
   * auseinander, sobald jemand eine Elementart hinzufügt.
   */
  schluessel: string;
  text: string;
}

export function elementTexts(element: CanvasElement): Textfeld[] {
  const out: Textfeld[] = [];
  const nimm = (feld: string, schluessel: string, text: string) =>
    out.push({ feld, schluessel, text });

  if (element.name) nimm('Name', 'name', element.name);

  switch (element.kind) {
    case 'text':
      nimm('Text', 'text', element.text);
      break;
    case 'markdown':
      nimm('Markdown', 'markdown', element.markdown);
      break;
    case 'card':
      if (element.label) nimm('Label', 'label', element.label);
      if (element.title) nimm('Titel', 'title', element.title);
      if (element.body) nimm('Text', 'body', element.body);
      break;
    case 'badge':
      nimm('Badge', 'text', element.text);
      break;
    case 'shape':
      if (element.label) nimm('Beschriftung', 'label', element.label);
      break;
    case 'image':
      if (element.alt) nimm('Alternativtext', 'alt', element.alt);
      break;
    case 'chart':
      if (element.label) nimm('Überschrift', 'label', element.label);
      nimm('Zahlen', 'data', element.data);
      break;
    case 'table':
      if (element.label) nimm('Überschrift', 'label', element.label);
      nimm('Zellen', 'data', element.data);
      break;
    case 'icon':
    case 'connector':
    case 'wordmark':
      break;
    default: {
      /*
         Der Zweig, der die Behauptung darüber erst wahr macht.

         Ohne ihn zählt der `switch` bloß auf, und eine neue Elementart fällt
         *nicht* beim Übersetzen auf — sie ist einfach nicht zu finden. Genau
         das war beim Diagramm passiert: Überschrift und Zahlen standen im
         Deck und die Suche schwieg dazu.
      */
      const unbekannt: never = element;
      void unbekannt;
      break;
    }
  }
  return out;
}

/**
 * Alle Stellen, an denen `gesucht` in `text` steht — Groß und Klein egal.
 *
 * Verglichen wird an der kleingeschriebenen Fassung, geschnitten am Original.
 * Das geht nur, solange beide gleich lang sind, und das ist nicht
 * selbstverständlich: `'İ'.toLowerCase()` ist zwei Zeichen lang. Läuft die
 * Länge auseinander, wird auf genaues Vergleichen zurückgefallen — lieber ein
 * Treffer weniger als ein Schnitt an der falschen Stelle, der einen Buchstaben
 * frisst.
 */
export function fundstellen(text: string, gesucht: string): { at: number; laenge: number }[] {
  if (!gesucht) return [];

  const klein = text.toLocaleLowerCase('de-DE');
  /*
     Nur wenn Kleinschreiben die Länge nicht ändert, zeigt ein Index aus der
     kleinen Fassung auf dieselbe Stelle im Original. Sonst wird genau
     verglichen — lieber ein Treffer weniger als ein Schnitt daneben.
  */
  const gleichLang = klein.length === text.length;
  const heu = gleichLang ? klein : text;
  const nadel = gleichLang ? gesucht.toLocaleLowerCase('de-DE') : gesucht;
  if (!nadel) return [];

  const out: { at: number; laenge: number }[] = [];
  for (let von = 0; ;) {
    const at = heu.indexOf(nadel, von);
    if (at < 0) break;
    out.push({ at, laenge: nadel.length });
    von = at + nadel.length;
  }
  return out;
}

/**
 * Jeden Fund ersetzen — in **einem** Durchgang von links nach rechts.
 *
 * Der Durchgang ist wichtig: wer den Ersatz mitdurchsuchte, käme bei „a" → „aa"
 * nie zum Ende.
 */
export function ersetzeAlle(
  text: string,
  gesucht: string,
  ersatz: string,
): { text: string; anzahl: number } {
  const stellen = fundstellen(text, gesucht);
  if (stellen.length === 0) return { text, anzahl: 0 };

  let out = '';
  let von = 0;
  for (const { at, laenge } of stellen) {
    out += text.slice(von, at) + ersatz;
    // Die Länge kommt von der Fundstelle und nicht von `gesucht`: verglichen
    // wurde unter Umständen an der kleingeschriebenen Fassung, und die kann
    // anders lang sein als das, was der Mensch getippt hat.
    von = at + laenge;
  }
  return { text: out + text.slice(von), anzahl: stellen.length };
}

function fundstelle(
  text: string,
  gesucht: string,
): { vorher: string; treffer: string; nachher: string } | null {
  const erste = fundstellen(text, gesucht)[0];
  if (!erste) return null;
  const { at, laenge } = erste;

  // Über Zeilen hinweg wird der Ausschnitt unlesbar; ein Umbruch wird deshalb
  // zum Leerzeichen. Gesucht wurde vorher, die Stelle stimmt also noch.
  const flach = (teil: string) => teil.replace(/\s+/g, ' ');
  const von = Math.max(0, at - UMFELD);
  const bis = Math.min(text.length, at + laenge + UMFELD);
  return {
    vorher: (von > 0 ? '…' : '') + flach(text.slice(von, at)),
    treffer: text.slice(at, at + laenge),
    nachher: flach(text.slice(at + laenge, bis)) + (bis < text.length ? '…' : ''),
  };
}
