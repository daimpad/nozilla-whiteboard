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
      for (const [feld, text] of elementTexts(element)) {
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
export function elementTexts(element: CanvasElement): [string, string][] {
  const out: [string, string][] = [];
  if (element.name) out.push(['Name', element.name]);

  switch (element.kind) {
    case 'text':
      out.push(['Text', element.text]);
      break;
    case 'markdown':
      out.push(['Markdown', element.markdown]);
      break;
    case 'card':
      if (element.label) out.push(['Label', element.label]);
      if (element.title) out.push(['Titel', element.title]);
      if (element.body) out.push(['Text', element.body]);
      break;
    case 'badge':
      out.push(['Badge', element.text]);
      break;
    case 'shape':
      if (element.label) out.push(['Beschriftung', element.label]);
      break;
    case 'image':
      if (element.alt) out.push(['Alternativtext', element.alt]);
      break;
    case 'icon':
    case 'connector':
    case 'wordmark':
      break;
  }
  return out;
}

function fundstelle(
  text: string,
  gesucht: string,
): { vorher: string; treffer: string; nachher: string } | null {
  const at = text.toLocaleLowerCase('de-DE').indexOf(gesucht);
  if (at < 0) return null;

  // Über Zeilen hinweg wird der Ausschnitt unlesbar; ein Umbruch wird deshalb
  // zum Leerzeichen. Gesucht wurde vorher, die Stelle stimmt also noch.
  const flach = (teil: string) => teil.replace(/\s+/g, ' ');
  const von = Math.max(0, at - UMFELD);
  const bis = Math.min(text.length, at + gesucht.length + UMFELD);
  return {
    vorher: (von > 0 ? '…' : '') + flach(text.slice(von, at)),
    treffer: text.slice(at, at + gesucht.length),
    nachher: flach(text.slice(at + gesucht.length, bis)) + (bis < text.length ? '…' : ''),
  };
}
