import { describe, expect, it } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { parseDeck } from '@/lib/markdown/deck';
import { PRESENTER_CHANNEL, type Vortragsnachricht } from '@/lib/presenterChannel';
import { useDeckStore } from '@/state/deckStore';
import { usePresenterChannel } from './usePresenterChannel';

const QUELLE = ['# Eins', '', '---', '', '# Zwei', '', '---', '', '# Drei'].join('\n');

function Probe() {
  usePresenterChannel();
  return null;
}

describe('Vortragskanal', () => {
  it('schickt das Deck nur einmal', async () => {
    // eslint-disable-next-line no-console
    console.log('BroadcastChannel vorhanden:', typeof BroadcastChannel !== 'undefined');
    const empfangen: Vortragsnachricht[] = [];
    const referent = new BroadcastChannel(PRESENTER_CHANNEL);
    referent.onmessage = (event: MessageEvent<Vortragsnachricht>) => {
      empfangen.push(event.data);
    };

    useDeckStore.setState({
      deck: parseDeck(QUELLE),
      slideIndex: 0,
      selection: [],
      past: [],
      future: [],
      mode: 'edit',
    });

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      useDeckStore.getState().setMode('present');
      useDeckStore.getState().goTo(1);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Das Kreuz an Kachel 1 der Übersicht, mitten im Vortrag.
    await act(async () => {
      useDeckStore.getState().deleteSlide(0);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    // eslint-disable-next-line no-console
    console.log('Nachrichten:', empfangen.map((n) => n.art).join(', '));

    const decks = empfangen.filter((n) => n.art === 'deck') as Array<{
      art: 'deck';
      markdown: string;
    }>;
    const staende = empfangen.filter((n) => n.art === 'stand') as Array<{
      art: 'stand';
      stand: { slideIndex: number; totalSlides: number };
    }>;
    const letzterStand = staende[staende.length - 1].stand;
    const referentDeck = parseDeck(decks[decks.length - 1].markdown);
    const publikum = useDeckStore.getState().deck.slides[useDeckStore.getState().slideIndex];

    // eslint-disable-next-line no-console
    console.log('deck-Nachrichten:', decks.length);
    // eslint-disable-next-line no-console
    console.log('Publikum sieht:', publikum.markdown.trim());
    // eslint-disable-next-line no-console
    console.log(
      'Referent sieht:',
      referentDeck.slides[letzterStand.slideIndex]?.markdown.trim(),
      '· Referent zählt:',
      referentDeck.slides.length,
      '· Stand sagt:',
      letzterStand.totalSlides,
    );

    referent.close();
    await act(async () => {
      root.unmount();
    });
    expect(decks.length).toBeGreaterThan(0);
  });
});
