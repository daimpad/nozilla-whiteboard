import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStarterDeck, useDeckStore } from './deckStore';
import { STORAGE_KEY, darfErsetzen, loadSession, startAutosave } from './persistence';

const store = () => useDeckStore.getState();

beforeEach(() => {
  localStorage.clear();
  useDeckStore.setState({
    deck: createStarterDeck(),
    slideIndex: 0,
    selection: [],
    past: [],
    future: [],
    dirty: false,
    fileHandle: undefined,
    fileName: 'untitled.md',
  });
});

describe('wiederhergestellte Sitzung', () => {
  it('gilt als gesichert', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        markdown: '# Drei Stunden Arbeit\n',
        fileName: 'untitled.md',
        slideIndex: 0,
        savedAt: Date.now(),
      }),
    );

    // Der Sitzungsstart aus App.tsx, nachgespielt.
    const session = loadSession();
    expect(session).not.toBeNull();
    store().loadDeck(session!.deck, { fileName: session!.fileName });

    const gefragt = vi.fn(() => false);
    vi.stubGlobal('confirm', gefragt);
    const darf = darfErsetzen();

    // eslint-disable-next-line no-console
    console.log('Inhalt nach Wiederherstellung:', JSON.stringify(store().deck.slides[0].markdown));
    // eslint-disable-next-line no-console
    console.log('dirty:', store().dirty, '· fileHandle:', store().fileHandle);
    // eslint-disable-next-line no-console
    console.log('darfErsetzen():', darf, '· confirm gerufen:', gefragt.mock.calls.length);
    vi.unstubAllGlobals();
  });

  it('wird von ⌘⇧N weggeworfen und 700 ms später überschrieben', () => {
    vi.useFakeTimers();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        markdown: '# Drei Stunden Arbeit\n',
        fileName: 'untitled.md',
        slideIndex: 0,
        savedAt: Date.now(),
      }),
    );
    const session = loadSession();
    store().loadDeck(session!.deck, { fileName: session!.fileName });
    const stop = startAutosave();

    // ⌘⇧N: `if (!darfErsetzen()) return; store.newDeck();`
    const gefragt = vi.fn(() => false);
    vi.stubGlobal('confirm', gefragt);
    if (darfErsetzen()) store().newDeck();
    vi.advanceTimersByTime(1000);

    // eslint-disable-next-line no-console
    console.log('confirm gerufen:', gefragt.mock.calls.length);
    // eslint-disable-next-line no-console
    console.log('in der Ablage steht jetzt:', localStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line no-console
    console.log('past:', store().past.length, 'future:', store().future.length);

    stop();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
