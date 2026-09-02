/**
 * Der Vortragskanal — geprüft an dem, was wirklich hinübergeht.
 *
 * Gehorcht wird dem Store, gesendet wird über einen `BroadcastChannel`. Die
 * Gegenseite ist hier ein zweiter Kanal desselben Namens, also genau das, was
 * die Referentenansicht aufmacht.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { openPresenterChannel, type Vortragsnachricht } from '@/lib/presenterChannel';
import { useDeckStore } from '@/state/deckStore';
import { usePresenterChannel } from './usePresenterChannel';

function Probe() {
  usePresenterChannel();
  return null;
}

let aufraeumen: Array<() => void> = [];
afterEach(() => {
  for (const tun of aufraeumen) tun();
  aufraeumen = [];
});

describe('was der Vortragskanal hinüberschickt', () => {
  it('schickt das Deck nach, wenn es sich im Vortrag ändert', async () => {
    /*
       Das Markdown ging genau zweimal hinüber: beim Einhängen und auf `hallo`.
       Die Übersicht ist im Vortrag aber voll bedienbar — ⌘K, und an jeder
       Kachel stehen „schieben", „duplizieren" und „löschen". Wer dort eine
       Folie löschte, sah in der Referentenansicht danach eine andere Folie als
       das Publikum.
    */
    const gegenseite = openPresenterChannel();
    expect(gegenseite).not.toBeNull();
    const empfangen: Vortragsnachricht[] = [];
    gegenseite!.onmessage = (event: MessageEvent<Vortragsnachricht>) => {
      empfangen.push(event.data);
    };
    aufraeumen.push(() => gegenseite!.close());

    useDeckStore.setState({ deck: parseDeck('# Eins\n\n---\n\n# Zwei\n'), slideIndex: 0 });

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<Probe />);
    });
    aufraeumen.push(() => {
      root.unmount();
      host.remove();
    });

    // Der Kanal stellt erst in einer Mikroaufgabe zu.
    await act(async () => {
      await new Promise((fertig) => setTimeout(fertig, 0));
    });
    const vorher = empfangen.filter((nachricht) => nachricht.art === 'deck').length;
    expect(vorher).toBeGreaterThan(0);

    await act(async () => {
      useDeckStore.getState().deleteSlide(0);
    });
    await act(async () => {
      await new Promise((fertig) => setTimeout(fertig, 0));
    });

    const decks = empfangen.filter(
      (nachricht): nachricht is Extract<Vortragsnachricht, { art: 'deck' }> =>
        nachricht.art === 'deck',
    );
    expect(decks.length).toBeGreaterThan(vorher);
    // Und was ankommt, ist der *neue* Stand.
    expect(decks[decks.length - 1].markdown).not.toContain('# Eins');
    expect(decks[decks.length - 1].markdown).toContain('# Zwei');
  });
});
