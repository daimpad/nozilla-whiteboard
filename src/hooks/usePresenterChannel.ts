/**
 * Die Seite des Vortragsfensters.
 *
 * Sie sendet den Stand und gehorcht dem Blättern aus der Referentenansicht.
 * Beides läuft über den Store, nicht über eigene Zustände: die Vortragsansicht
 * blättert ohnehin über `advance()` und `retreat()`, und ein zweiter Weg
 * dorthin wäre ein zweiter Zustand.
 *
 * Der Stand wird bei *jeder* Änderung gesendet und außerdem auf `hallo` hin.
 * Ohne das Zweite bliebe eine Referentenansicht, die mitten im Vortrag
 * geöffnet wird, bis zum nächsten Klick leer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeDeck } from '@/lib/markdown/deck';
import {
  endlicherSchritt,
  openPresenterChannel,
  PRESENTER_QUERY,
  type Vortragsnachricht,
} from '@/lib/presenterChannel';
import { useDeckStore } from '@/state/deckStore';

export function usePresenterChannel(): { offen: boolean; oeffnen: () => void } {
  const kanal = useRef<BroadcastChannel | null>(null);
  const fenster = useRef<Window | null>(null);
  const [offen, setOffen] = useState(false);

  const slideIndex = useDeckStore((state) => state.slideIndex);
  const revealStep = useDeckStore((state) => state.revealStep);
  const total = useDeckStore((state) => state.deck.slides.length);

  useEffect(() => {
    const c = openPresenterChannel();
    kanal.current = c;
    if (!c) return;

    const stand = () => {
      const state = useDeckStore.getState();
      return {
        slideIndex: state.slideIndex,
        revealStep: endlicherSchritt(state.revealStep),
        totalSlides: state.deck.slides.length,
      };
    };

    const schickAlles = () => {
      c.postMessage({
        art: 'deck',
        markdown: serializeDeck(useDeckStore.getState().deck),
      } satisfies Vortragsnachricht);
      c.postMessage({ art: 'stand', stand: stand() } satisfies Vortragsnachricht);
    };

    c.onmessage = (event: MessageEvent<Vortragsnachricht>) => {
      const store = useDeckStore.getState();
      if (event.data.art === 'hallo') {
        schickAlles();
        setOffen(true);
      } else if (event.data.art === 'tschuess') setOffen(false);
      else if (event.data.art === 'weiter') store.advance();
      else if (event.data.art === 'zurueck') store.retreat();
    };

    // Auch ungefragt, einmal beim Anfangen: eine Referentenansicht, die schon
    // offenstand, bevor der Vortrag begann, hat ihr `hallo` ins Leere gerufen
    // und wartete sonst bis zum ersten Blättern.
    schickAlles();

    return () => {
      c.postMessage({ art: 'ende' } satisfies Vortragsnachricht);
      c.onmessage = null;
      c.close();
    };
  }, []);

  // Jede Bewegung im Vortrag geht hinüber.
  useEffect(() => {
    kanal.current?.postMessage({
      art: 'stand',
      stand: { slideIndex, revealStep: endlicherSchritt(revealStep), totalSlides: total },
    } satisfies Vortragsnachricht);
  }, [slideIndex, revealStep, total]);

  const oeffnen = useCallback(() => {
    // Ein schon offenes Fenster wird nach vorn geholt, statt ein zweites
    // aufzumachen — zwei Referentenansichten wären zwei Uhren.
    if (fenster.current && !fenster.current.closed) {
      fenster.current.focus();
      return;
    }
    const url = `${window.location.pathname}?${PRESENTER_QUERY}=1`;
    fenster.current = window.open(url, 'nz-referent', 'width=1100,height=760');
    setOffen(Boolean(fenster.current));
  }, []);

  return { offen, oeffnen };
}
