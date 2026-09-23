import { useEffect } from 'react';
import { activeTheme, isThemeId, setActiveTheme } from '@/theme';
import { useDeckStore } from '@/state/deckStore';
import { useThemeVersion } from './useTheme';

/** Der Satz über eine Marke, die dieser Browser nicht kennt. */
export function fehlendeMarkeText(id: string): string {
  return (
    `Dieses Deck trägt die Marke „${id}", die dieser Browser nicht kennt. Gezeichnet wird in ` +
    'nozilla, und der Eintrag bleibt in der Datei stehen. Die Marke kommt als .nzci.json aus dem CI-Generator.'
  );
}

/*
   Welche fehlende Marke gerade gemeldet ist. Auf Modulebene und nicht im
   Zustand: gemeldet wird einmal je Marke und nicht bei jedem Neuzeichnen —
   ein Hinweis, der nach dem Schließen gleich wiederkommt, wird beim dritten
   Mal nicht mehr gelesen.
*/
let gemeldet: string | null = null;

/**
 * Das Deck bestimmt, welches Erscheinungsbild gilt.
 *
 * Eine Richtung, und nur eine: die `.md` sagt es, das Werkzeug folgt. Wer im
 * Inspektor umschaltet, ändert das Deck — und erst dadurch das Aussehen. So
 * kann es keine zwei Wahrheiten geben, und was gespeichert wird, ist genau
 * das, was zu sehen war.
 *
 * Nennt ein Deck ein unbekanntes Erscheinungsbild, bleibt der Eintrag stehen
 * und es wird in der Voreinstellung gezeichnet. Den Eintrag stillschweigend
 * zu überschreiben hieße, eine fremde Zugehörigkeit beim ersten Speichern zu
 * löschen.
 *
 * ## Warum der Zähler in den Abhängigkeiten steht
 *
 * Solange jedes Erscheinungsbild beim Start angemeldet wurde, hing die Frage
 * nur am Deck. Seit es sich im laufenden Fenster importieren lässt, hängt sie
 * auch am Verzeichnis: das Deck nennt `kunde-a`, `kunde-a` wird importiert —
 * und das Deck ist dasselbe Objekt wie vorher. Ohne den Zähler liefe dieser
 * Effekt nicht noch einmal, die Folie bliebe in nozilla, und der Import
 * meldete Erfolg über einer Fläche, an der sich nichts geändert hat. Gemessen
 * hat das der Entwurf dieses Merkmals, bevor eine Zeile davon stand.
 *
 * Und dieselbe Stelle sagt es jetzt, wenn eine Marke fehlt. Vorher stand das
 * nur im Inspektor, im Reiter „Deck" — also dort, wo man es nur findet, wenn
 * man schon weiß, dass etwas fehlt.
 */
export function useDeckTheme(): void {
  const wanted = useDeckStore((state) => state.deck.meta.theme);
  const version = useThemeVersion();

  useEffect(() => {
    const bekannt = Boolean(wanted) && isThemeId(wanted);
    const id = bekannt ? (wanted as string) : 'nozilla';
    if (id !== activeTheme().id) setActiveTheme(id);

    const store = useDeckStore.getState();
    if (wanted && !bekannt) {
      if (gemeldet !== wanted) {
        gemeldet = wanted;
        store.zeigeHinweis(fehlendeMarkeText(wanted), 'marken');
      }
    } else if (gemeldet) {
      // Die Marke ist angekommen, oder das Deck nennt eine andere. Der Hinweis
      // über sie geht mit — aber nur, wenn er noch dasteht und nicht längst
      // ein anderer an seiner Stelle.
      if (store.hinweis === fehlendeMarkeText(gemeldet)) store.zeigeHinweis(null);
      gemeldet = null;
    }
  }, [wanted, version]);
}
