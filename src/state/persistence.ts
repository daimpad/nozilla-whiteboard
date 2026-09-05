/**
 * Die Sitzung im Browser.
 *
 * Das Deck wird als Markdown in `localStorage` gesichert — dasselbe Markdown,
 * das auch der Export schreibt. Ein Neuladen verliert damit nichts, und was
 * zurückkommt, ist eine Datei, die man von Hand hätte schreiben können. Keine
 * Datenbank, kein Abgleich, kein Server: das ist der ganze Punkt des
 * Werkzeugs.
 */
import { exportMarkdown, openMarkdownFile } from '@/lib/export';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import type { Deck } from '@/model/types';
import { useDeckStore } from './deckStore';

/**
 * Der Schlüssel der Deck-Sitzung.
 *
 * Öffentlich, weil eine zweite Seite daneben eine eigene Ablage führt: der
 * CI-Generator merkt sich seinen Entwurf, damit ein ⌘R ihn nicht verliert. Die
 * beiden dürfen sich unter keinen Umständen berühren, und ein Test hält sie
 * auseinander — gefunden würde es sonst mitten in einem Vortrag.
 */
export const STORAGE_KEY = 'nozilla-whiteboard:session:v1';

/**
 * Wohin eine Sitzung ausweicht, die sich nicht lesen ließ.
 *
 * Der Eintrag wird **nicht** weggeworfen. Was hier landet, ist der Rohtext,
 * wortgleich — dieselbe Linie wie beim unlesbaren `nzl`-Block und beim
 * unbekannten `theme:`: den Wert behalten, die Lücke zeigen.
 */
export const UNLESBAR_KEY = `${STORAGE_KEY}:unlesbar`;

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

/**
 * Die gemerkte Sitzung zurückholen.
 *
 * ## Warum eine unlesbare Sitzung nicht dasselbe ist wie keine
 *
 * Beide Fälle gaben `null` zurück, und der Unterschied war alles: bei „keine"
 * hat der Benutzer noch nie hier gearbeitet, bei „unlesbar" stehen seine
 * Zeichen in der Ablage und niemand sagt es. Das Werkzeug startete dann mit
 * der Willkommensmappe, und siebenhundert Millisekunden nach der ersten
 * Änderung schrieb die Selbstsicherung darüber. Gemessen an einer
 * abgeschnittenen Ablage: **6296 Zeichen** Arbeit, weg ohne ein Wort.
 *
 * Wörtlich der teuerste Fehler dieses Projekts, eine Ebene höher — beim
 * unlesbaren `nzl`-Block ging eine Folie verloren, hier das ganze Deck.
 *
 * Der Rohtext geht deshalb zur Seite (`UNLESBAR_KEY`), der kaputte Eintrag
 * weg, und gesagt wird es auch. **In dieser Reihenfolge**: lässt sich der Text
 * nicht beiseitelegen — die Ablage ist voll, das Fenster privat —, bleibt er,
 * wo er ist. Ihn zu entfernen, weil das Ausweichen scheiterte, wäre genau der
 * Verlust, gegen den das hier gebaut ist.
 */
export function loadSession(): { deck: Deck; fileName: string; slideIndex: number } | null {
  const storage = readStorage();
  if (!storage) return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as StoredSession;
    if (typeof session.markdown !== 'string') {
      return bewahre(storage, raw, 'der Eintrag trägt kein Markdown');
    }
    return {
      deck: parseDeck(session.markdown),
      fileName: session.fileName || 'untitled.md',
      slideIndex: session.slideIndex ?? 0,
    };
  } catch (error) {
    return bewahre(storage, raw, grund(error));
  }
}

/**
 * Den Rohtext einer unlesbaren Sitzung beiseitelegen und es sagen.
 *
 * Gibt immer `null` zurück: der Aufrufer soll weiterarbeiten können. Die
 * Politik stimmt — eine kaputte Ablage darf das Werkzeug nicht aufhalten —,
 * das Schweigen nicht.
 */
function bewahre(storage: Storage, roh: string, warum: string): null {
  let beiseite = false;
  try {
    storage.setItem(UNLESBAR_KEY, roh);
    storage.removeItem(STORAGE_KEY);
    beiseite = true;
  } catch {
    // Kontingent erschöpft. Dann bleibt der Eintrag lieber liegen, wo er ist.
  }

  /*
     Und wenn das Ausweichen scheitert, wird auch das gesagt — nicht
     beschönigt. Der Eintrag bleibt dann liegen, wo er ist, und die nächste
     Selbstsicherung schreibt darüber; wer die Zeichen retten will, muss das
     Fenster jetzt in Ruhe lassen. Ein Hinweis, der Sicherheit verspricht, die
     es nicht gibt, wäre schlechter als keiner.
  */
  useDeckStore
    .getState()
    .zeigeHinweis(
      `Die gemerkte Sitzung ließ sich nicht lesen: ${warum}. Ihre ${roh.length} Zeichen ` +
        (beiseite
          ? `sind unverändert erhalten und stehen in der Ablage des Browsers unter „${UNLESBAR_KEY}".`
          : `stehen weiter unter „${STORAGE_KEY}" — beiseitelegen ließen sie sich nicht, ` +
            'und die nächste Selbstsicherung schreibt darüber.'),
    );
  return null;
}

export function clearSession(): void {
  readStorage()?.removeItem(STORAGE_KEY);
}

/** Die Selbstsicherung anwerfen. Zurück kommt, wie man sie wieder abstellt. */
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
    /*
       Geschrieben wurde — nur vielleicht nicht dorthin, wo der Benutzer es
       erwartet.

       `saveBlob()` fällt auf einen Download zurück, wenn das Schreiben in den
       Dateigriff scheitert: die Datei ist verschoben, die Berechtigung
       abgelaufen, das Laufwerk weg. Die Politik stimmt — lieber ein Download
       als ein verlorener Handgriff —, und `SaveResult.via` sagt es auch. Nur
       las das hier niemand: das Deck galt als gesichert, der Griff blieb
       stehen, und die geöffnete Datei auf der Platte war weiter die alte.
       Wer danach das Fenster schloss, hatte seine Arbeit in einem Download,
       von dem er nichts wusste.
    */
    useDeckStore
      .getState()
      .zeigeHinweis(
        state.fileHandle && result.via === 'download'
          ? `„${state.fileName}" ließ sich nicht an Ort und Stelle beschreiben — das Deck ` +
              'wurde stattdessen heruntergeladen. Die geöffnete Datei ist damit nicht auf ' +
              'dem neuesten Stand.'
          : null,
      );
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

/** Vor dem Verlassen mit ungesicherter Arbeit warnen; zurück kommt das Abstellen. */
export function guardUnsavedChanges(): () => void {
  const handler = (event: BeforeUnloadEvent) => {
    if (!useDeckStore.getState().dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}
