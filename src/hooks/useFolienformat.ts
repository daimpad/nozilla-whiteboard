import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import {
  aktivesFolienformat,
  folienformatVersion,
  istFolienformat,
  setzeFolienformat,
  subscribeFolienformat,
} from '@/theme';
import { useDeckStore } from '@/state/deckStore';

/**
 * Das Deck bestimmt, auf welchem Blatt es liegt.
 *
 * Eine Richtung, und nur eine — dieselbe wie beim Erscheinungsbild in
 * `useDeckTheme`: die `.md` sagt es, das Werkzeug folgt. Wer im Inspektor
 * umstellt, ändert das Deck, und erst dadurch das Blatt. So kann es keine zwei
 * Wahrheiten geben, und was gespeichert wird, ist genau das, was zu sehen war.
 *
 * Nennt ein Deck ein unbekanntes Format, bleibt der Eintrag stehen und
 * gezeichnet wird in der Vorgabe. Ihn stillschweigend zu überschreiben hieße,
 * eine Angabe beim ersten Speichern zu löschen.
 */
export function useDeckFolienformat(): void {
  const gewuenscht = useDeckStore((state) => state.deck.meta.format);

  useEffect(() => {
    setzeFolienformat(istFolienformat(gewuenscht) ? gewuenscht : '16-9');
  }, [gewuenscht]);
}

/**
 * Ein Zähler, der bei jedem Wechsel des Folienformats steigt.
 *
 * Er wird an einer einzigen Stelle gebraucht, und die ist lehrreich: die
 * Merker in `SlideView` hängen an der **Folie** (`[slide, fonts, skin,
 * bilder]`), das Format aber am **Deck**. Ein Wechsel legt also ein neues
 * Deck-Objekt an und lässt jede Folie, wie sie war — der Merker verfiele
 * nicht, und die Fläche zeichnete das alte Blatt weiter, während Filmstreifen,
 * Übersicht und jeder Export schon das neue zeigen.
 *
 * Alle anderen Leser des Folienmaßes rechnen im Rumpf ihrer Komponente und
 * folgen damit jedem Neuzeichnen von selbst. Derselbe Griff wie bei den
 * Schriften und beim Erscheinungsbild, und aus demselben Grund.
 */
export function useFolienformatVersion(): number {
  return useSyncExternalStore(subscribeFolienformat, folienformatVersion, folienformatVersion);
}

/** Welches Format gerade gilt — für die Oberfläche, die es anzeigt. */
export function useFolienformat(): string {
  useFolienformatVersion();
  return aktivesFolienformat();
}
