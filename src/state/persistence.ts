/**
 * Local persistence.
 *
 * The deck is autosaved to `localStorage` as Markdown — the same Markdown the
 * export pipeline writes — so a reload never loses work, and the recovered
 * state is a file you could have written by hand. No database, no sync, no
 * server: the whole point of the tool.
 */
import { exportMarkdown, openMarkdownFile } from '@/lib/export';
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

  /*
     Scheitert das Schreiben, wird es gesagt.

     „Best-effort by design" stand hier, und der Satz stimmt auch — nur ist er
     kein Grund zu schweigen. Das Kontingent von `localStorage` liegt bei etwa
     fünf Megabyte, und ein einziges eingebettetes Bild reichte, es zu
     sprengen. Von da an sicherte sich nichts mehr, und zu sehen war das an
     keiner Stelle: der Benutzer arbeitete weiter in dem Glauben, die Sitzung
     werde gemerkt.

     Beide Richtungen gehören dazu. Wer den Grund beseitigt — das Bild
     gelöscht, das Deck geteilt —, soll die Warnung wieder loswerden, ohne
     etwas dafür tun zu müssen.
  */
  const write = () => {
    const state = useDeckStore.getState();
    let gelungen = false;
    try {
      const session: StoredSession = {
        markdown: serializeDeck(state.deck),
        fileName: state.fileName,
        slideIndex: state.slideIndex,
        savedAt: Date.now(),
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
      gelungen = true;
    } catch {
      // Kontingent erschöpft, privates Fenster, abgeschaltete Ablage.
    }
    if (state.sicherungGescheitert === gelungen) {
      useDeckStore.getState().meldeSicherung(gelungen);
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

/**
 * Das Deck in seine Datei schreiben.
 *
 * Es gab diesen Weg dreimal — im Knopf der Leiste, auf `⌘S` und jetzt in der
 * Warnung, die erscheint, wenn die Sitzungsablage nicht mehr mitmacht. Drei
 * Fassungen einer Rechnung laufen auseinander; die auf `⌘S` hatte schon keine
 * Fehlerbehandlung mehr, und ein abgebrochener Dateidialog endete dort als
 * unbehandelte Zusage.
 *
 * Zurück kommt, ob wirklich geschrieben wurde. Ein geschlossener Dialog ist
 * kein Fehler, sondern eine Antwort — alles andere wird **hier** gemeldet und
 * nicht dem Aufrufer überlassen. Es gibt drei davon, und der auf `⌘S` hatte
 * gar keine Fehlerbehandlung: dort endete ein Scheitern als unbehandelte
 * Zusage in der Konsole, und der Benutzer sah nichts als ein Deck, das nicht
 * gesichert war.
 */
export async function sichereDeck(): Promise<boolean> {
  const state = useDeckStore.getState();
  try {
    const result = await exportMarkdown(state.deck, {
      filename: state.fileName,
      handle: state.fileHandle,
    });
    useDeckStore.getState().markSaved({ handle: result.handle });
    useDeckStore.getState().zeigeHinweis(null);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    useDeckStore.getState().zeigeHinweis(`Das Deck ließ sich nicht sichern. ${grund(error)}`);
    return false;
  }
}

/**
 * Ein Deck aus einer Datei holen.
 *
 * Dieselbe Geschichte wie beim Sichern, eine Tür weiter: den Weg gab es
 * zweimal — im Knopf der Leiste und auf `⌘O` —, und die Fassung auf `⌘O` hatte
 * keine Fehlerbehandlung. Die Frage vor dem Ersetzen steht jetzt ebenfalls
 * hier, also an der einen Stelle, an der auch geladen wird.
 */
export async function oeffneDeck(): Promise<boolean> {
  if (!darfErsetzen()) return false;
  try {
    const datei = await openMarkdownFile();
    if (!datei) return false;
    useDeckStore
      .getState()
      .loadMarkdown(datei.text, { fileName: datei.name, handle: datei.handle });
    return true;
  } catch (error) {
    useDeckStore.getState().zeigeHinweis(`Die Datei ließ sich nicht öffnen. ${grund(error)}`);
    return false;
  }
}

/**
 * Was von einem Fehler übrig bleibt, wenn ein Mensch ihn lesen soll.
 *
 * Der technische Satz bleibt stehen und wird nicht weggeglättet: wer einen
 * Fehler meldet, braucht ihn, und wer ihn nicht braucht, überliest ihn.
 */
export function grund(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const text = String(error);
  return text === '[object Object]' ? 'Unbekannter Fehler.' : text;
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
