/**
 * Was an einem Deck falsch sein kann — auf einer Liste, für das ganze Deck.
 *
 * ## Warum es das gibt
 *
 * Acht Warnungen rechnete dieses Werkzeug schon, und alle acht waren
 * praktisch unsichtbar: sie standen im Inspektor und erschienen nur, wenn
 * zufällig das richtige Element auf der richtigen Folie ausgewählt war. Wer
 * ein Deck von dreißig Folien übergibt, hat sie nie alle gesehen.
 *
 * Das ist keine neue Rechnung. Jede Zeile hier ruft die Funktion, die es
 * ohnehin gibt — `overflowOf()`, `flussUeberlauf()`, `unterDerFolienkante()`,
 * `unterDerKante()`, `unsichtbareFlaeche()`, `liesChart()`. Zwei Rechnungen
 * für dieselbe Frage laufen auseinander, und man sieht es erst in der fremden
 * Datei; das steht in `CLAUDE.md` viermal.
 *
 * ## Warum drei Ränge und nicht zwei
 *
 * Dieselbe Leiter wie im CI-Generator, und aus demselben Grund. `fehler`
 * heißt: es ist in keiner Ausgabe zu sehen oder es geht etwas verloren.
 * `warnung` heißt: alles läuft, und trotzdem ist etwas falsch — ein Balken
 * fehlt in der Reihe, eine Fläche hat die Farbe ihres Untergrunds, eine Zeile
 * steht über der Kante ihres Kastens. Das ist die Klasse, die dieses Projekt
 * immer wieder teuer zu stehen gekommen ist. `hinweis` ist das, was der
 * Nächste wissen soll.
 *
 * ## Was hier *nicht* steht
 *
 * **Ein totes Bild.** `bildmass()` unterscheidet nicht zwischen „noch nicht
 * geladen" und „kommt nie" — beides ist `undefined`. Danach zu fragen hieße,
 * jedes frisch geöffnete Deck kurz für kaputt zu erklären. Gemeldet wird es
 * dort, wo es sicher zu entscheiden ist: beim Export, über
 * `meldeFehlendeBilder()`. Zweimal dieselbe Klage über dasselbe tote Bild
 * wäre eine zu viel.
 *
 * **Der Kontrast einer Farbe auf ihrem Untergrund.** Das ist eine Eigenschaft
 * des Erscheinungsbilds und nicht des Decks; `ci/pruefung.ts` fragt danach an
 * der Stelle, an der jemand die Farben wählt. Hier leuchtete bei einer Marke
 * mit dunkler Signalfarbe jede Signalfolie auf, und der Benutzer könnte
 * nichts dagegen tun.
 */
import { canvas } from '@/theme';
import { liesChart } from '@/lib/chart';
import { backgroundStyle, unsichtbareFlaeche } from '@/lib/export/scene';
import { unterDerKante } from '@/lib/layout/slideLayout';
import { flussUeberlauf, overflowOf, unterDerFolienkante } from '@/lib/overflow';
import { elementLabel } from '@/lib/labels';
import type { Deck } from '@/model/types';

export type Rang = 'fehler' | 'warnung' | 'hinweis';

/** Wie ernst ein Rang ist — je größer, desto weiter oben steht er. */
const GEWICHT: Record<Rang, number> = { fehler: 2, warnung: 1, hinweis: 0 };

export interface DeckBefund {
  rang: Rang;
  /** Der Index der Folie, auf die der Befund zeigt. */
  folie: number;
  /**
   * Die Kennung des gemeinten Elements — wenn es eines gibt.
   *
   * Ohne sie führt „Zu Folie 7" auf die Folie und dort vor zehn Elemente, und
   * das gemeinte sucht man von Hand. Dieselbe Rückzahlung wie der Anker im
   * CI-Generator.
   */
  element?: string;
  text: string;
}

/**
 * Das ganze Deck durchgehen. Die Reihenfolge ist die der Folien, und
 * innerhalb einer Folie der Rang — was nichts zeigt, steht über dem, was
 * falsch aussieht.
 */
export function pruefeDeck(deck: Deck): DeckBefund[] {
  const befunde: DeckBefund[] = [];
  const unterKante = new Set(
    unterDerKante(deck, canvas.height).map(({ folie, element }) => `${folie}:${element.id}`),
  );

  deck.slides.forEach((slide, folie) => {
    const dieseFolie: DeckBefund[] = [];
    const sage = (rang: Rang, text: string, element?: string) =>
      dieseFolie.push({ rang, folie, element, text });

    if (slide.meta.unreadable !== undefined) {
      sage(
        'fehler',
        'Der nzl-Block dieser Folie ließ sich nicht lesen — meist ein Doppelpunkt ' +
          'zu viel im YAML. Layout und Elemente fehlen deshalb; der Block bleibt beim ' +
          'Sichern unverändert erhalten, bis jemand die Folie ändert.',
      );
    }

    const unterFolie = unterDerFolienkante(slide);
    if (unterFolie > 0) {
      sage(
        'fehler',
        `Der Fließtext läuft ${unterFolie} Einheiten unter die Folienkante. Dort ` +
          'zeigt ihn keine Ausgabe.',
      );
    } else {
      const ueberSpiegel = flussUeberlauf(slide);
      if (ueberSpiegel > 0) {
        sage(
          'warnung',
          `Der Fließtext läuft ${ueberSpiegel} Einheiten über den Satzspiegel — dort ` +
            'unten sitzt die Fußzeile.',
        );
      }
    }

    const grund = backgroundStyle(slide.meta.background);
    for (const element of slide.elements) {
      const name = elementLabel(element);

      if (unterKante.has(`${folie}:${element.id}`)) {
        sage(
          'fehler',
          `${name} liegt unter der Folienkante: keine Ausgabe zeigt es, und auf der ` +
            'Fläche trifft es kein Klick.',
          element.id,
        );
        continue;
      }

      const ueber = overflowOf(element);
      if (ueber > 0) {
        sage(
          'warnung',
          `${name}: der Inhalt läuft ${ueber} Einheiten aus dem Kasten. Auf dem ` +
            'Bildschirm steht die Zeile noch, im PDF über dem Rand, in PowerPoint ' +
            'abgeschnitten.',
          element.id,
        );
      }

      if (unsichtbareFlaeche(element, grund)) {
        sage(
          'warnung',
          `${name} hat genau die Farbe seines Untergrunds. Es steht in der ` +
            'Ebenenliste, lässt sich anwählen — und ist nirgends zu sehen.',
          element.id,
        );
      }

      if (element.kind === 'chart') {
        const { ungelesen } = liesChart(element.data);
        if (ungelesen.length > 0) {
          const erste = ungelesen[0];
          const gekuerzt = erste.length > 40 ? `${erste.slice(0, 40)}…` : erste;
          sage(
            'warnung',
            ungelesen.length === 1
              ? `${name}: eine Zeile trägt keine lesbare Zahl und wird nicht ` +
                  `gezeichnet — „${gekuerzt}".`
              : `${name}: ${ungelesen.length} Zeilen tragen keine lesbare Zahl und ` +
                  `werden nicht gezeichnet, die erste ist „${gekuerzt}".`,
            element.id,
          );
        }
      }

      if (element.kind === 'image') {
        /*
           Eine Frage je Loch, und die erste ist die echte: ohne Quelle gibt es
           kein Bild, und nach der Beschreibung eines Bildes zu fragen, das
           keines ist, wäre der zweite Befund für dasselbe.
        */
        if (!element.src.trim()) {
          sage(
            'warnung',
            `${name} hat noch keine Quelle — auf der Folie bleibt es leer.`,
            element.id,
          );
        } else if (!element.alt.trim()) {
          sage(
            'hinweis',
            `${name} hat keinen Alternativtext. In jeder Ausgabe ist es damit ein ` +
              'stummer Fleck; wer die Folie nicht sehen kann, hat nichts.',
            element.id,
          );
        }
      }
    }

    dieseFolie.sort((a, b) => GEWICHT[b.rang] - GEWICHT[a.rang]);
    befunde.push(...dieseFolie);
  });

  return befunde;
}

/** Wie viele Befunde je Rang — für die Zahl am Knopf. */
export function zaehleBefunde(befunde: readonly DeckBefund[]): Record<Rang, number> {
  const zahl: Record<Rang, number> = { fehler: 0, warnung: 0, hinweis: 0 };
  for (const befund of befunde) zahl[befund.rang] += 1;
  return zahl;
}
