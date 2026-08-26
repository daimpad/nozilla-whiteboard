/**
 * Local persistence.
 *
 * The deck is autosaved to `localStorage` as Markdown — the same Markdown the
 * export pipeline writes — so a reload never loses work, and the recovered
 * state is a file you could have written by hand. No database, no sync, no
 * server: the whole point of the tool.
 */
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import { useDeckStore } from './deckStore';

const STORAGE_KEY = 'nozilla-whiteboard:session:v1';
const AUTOSAVE_DELAY = 700;

interface StoredSession {
  markdown: string;
  fileName: string;
  slideIndex: number;
  savedAt: number;
}

function readStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSession(): { deck: Deck; fileName: string; slideIndex: number } | null {
  const storage = readStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (typeof session.markdown !== 'string') return null;
    return {
      deck: parseDeck(session.markdown),
      fileName: session.fileName || 'untitled.md',
      slideIndex: session.slideIndex ?? 0,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  readStorage()?.removeItem(STORAGE_KEY);
}

/** Start autosaving. Returns an unsubscribe function. */
export function startAutosave(): () => void {
  const storage = readStorage();
  if (!storage) return () => undefined;

  let timer: ReturnType<typeof setTimeout> | undefined;

  const write = () => {
    const state = useDeckStore.getState();
    try {
      const session: StoredSession = {
        markdown: serializeDeck(state.deck),
        fileName: state.fileName,
        slideIndex: state.slideIndex,
        savedAt: Date.now(),
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Quota exceeded or private mode — autosave is best-effort by design.
    }
  };

  const unsubscribe = useDeckStore.subscribe((state, previous) => {
    if (state.deck === previous.deck && state.slideIndex === previous.slideIndex) return;
    clearTimeout(timer);
    timer = setTimeout(write, AUTOSAVE_DELAY);
  });

  const flush = () => {
    clearTimeout(timer);
    write();
  };
  window.addEventListener('beforeunload', flush);

  return () => {
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener('beforeunload', flush);
  };
}

/**
 * Darf das offene Deck ersetzt werden?
 *
 * Sechs Wege führen dorthin — „Neues Deck", „Öffnen", `⌘⇧N`, `⌘O`, eine Datei
 * ins Fenster gezogen und die Übernahme aus dem Prompt —, und bis hierher
 * fragte genau *einer* von ihnen: das Beispiel-Menü. Die anderen fünf luden
 * durch, leerten dabei den Verlauf (`past` und `future`), und siebenhundert
 * Millisekunden später schrieb die Selbstsicherung den neuen Stand über die
 * gemerkte Sitzung. Danach gab es keinen Weg zurück — kein ⌘Z, keine Datei,
 * nichts.
 *
 * Die Frage steht deshalb hier und nicht sechsmal daneben. Sie ist die
 * Gegenrichtung zu `guardUnsavedChanges()`: das hält den Browser davon ab, die
 * Arbeit mitzunehmen, dieses hier das Werkzeug selbst.
 *
 * Gefragt wird **nur bei ungesicherter Arbeit**. Ein frisch geladenes Deck ist
 * nicht `dirty`, also fragt auch niemand — wer drei Beispiele hintereinander
 * ansieht, wird nicht dreimal aufgehalten. Und wo es kein `confirm` gibt (ein
 * Test, ein eingebetteter Rahmen), gilt die Antwort „ja": ein Werkzeug, das
 * ohne Dialog gar nichts mehr täte, wäre die schlechtere Lage.
 */
export function darfErsetzen(): boolean {
  if (!useDeckStore.getState().dirty) return true;
  if (typeof confirm !== 'function') return true;
  return confirm('Das offene Deck ist nicht gesichert. Trotzdem ersetzen?');
}

/** Warn before leaving with unsaved changes. Returns an unsubscribe function. */
export function guardUnsavedChanges(): () => void {
  const handler = (event: BeforeUnloadEvent) => {
    if (!useDeckStore.getState().dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}
