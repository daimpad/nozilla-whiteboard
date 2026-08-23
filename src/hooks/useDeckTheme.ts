import { useEffect } from 'react';
import { activeTheme, isThemeId, setActiveTheme } from '@/theme';
import { useDeckStore } from '@/state/deckStore';

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
 */
export function useDeckTheme(): void {
  const wanted = useDeckStore((state) => state.deck.meta.theme);

  useEffect(() => {
    const id = wanted && isThemeId(wanted) ? wanted : 'nozilla';
    if (id !== activeTheme().id) setActiveTheme(id);
  }, [wanted]);
}
