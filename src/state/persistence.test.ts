/**
 * Die Frage vor dem Ersetzen.
 *
 * Sie stand lange an genau einer von sechs Stellen — das Beispiel-Menü fragte,
 * „Neues Deck", „Öffnen", `⌘⇧N`, `⌘O`, die Datei im Fenster und die Übernahme
 * aus dem Prompt nicht. Wer dort danebengriff, verlor die ungesicherte Arbeit
 * samt Verlauf, und die Selbstsicherung schrieb den Verlust siebenhundert
 * Millisekunden später fest.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  UNLESBAR_KEY,
  darfErsetzen,
  grund,
  loadSession,
  oeffneDeck,
  sichereDeck,
  startAutosave,
} from './persistence';
import { createStarterDeck, useDeckStore } from './deckStore';

/*
   Der Ausgabeweg wird ersetzt, nicht gefahren: geprüft wird, was die
   Oberfläche vom Scheitern erfährt, und nicht, ob jsPDF eine Datei schreibt.
*/
const { exportMarkdown, openMarkdownFile } = vi.hoisted(() => ({
  exportMarkdown: vi.fn(),
  openMarkdownFile: vi.fn(),
}));
vi.mock('@/lib/export', () => ({ exportMarkdown, openMarkdownFile }));

const schmutzig = (wert: boolean) => useDeckStore.setState({ dirty: wert });

afterEach(() => {
  vi.unstubAllGlobals();
  schmutzig(false);
});

describe('darf das offene Deck ersetzt werden', () => {
  it('fragt nicht, solange nichts zu verlieren ist', () => {
    // Wer drei Beispiele hintereinander ansieht, soll nicht dreimal
    // aufgehalten werden: ein frisch geladenes Deck ist nicht `dirty`.
    const gefragt = vi.fn(() => false);
    vi.stubGlobal('confirm', gefragt);
    schmutzig(false);

    expect(darfErsetzen()).toBe(true);
    expect(gefragt).not.toHaveBeenCalled();
  });

  it('fragt bei ungesicherter Arbeit — und gehorcht der Antwort', () => {
    schmutzig(true);

    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    expect(darfErsetzen()).toBe(false);

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    expect(darfErsetzen()).toBe(true);
  });

  it('nennt beim Fragen, worum es geht', () => {
    schmutzig(true);
    const gefragt = vi.fn((_frage?: string) => true);
    vi.stubGlobal('confirm', gefragt);

    darfErsetzen();
    const text = String(gefragt.mock.calls[0]?.[0]);
    expect(text).toMatch(/nicht gesichert/i);
    expect(text).toMatch(/ersetzen/i);
  });

  it('lässt durch, wo es keinen Dialog gibt', () => {
    // Ein eingebetteter Rahmen ohne `confirm` — ein Werkzeug, das dann gar
    // nichts mehr täte, wäre die schlechtere Lage.
    schmutzig(true);
    vi.stubGlobal('confirm', undefined);
    expect(darfErsetzen()).toBe(true);
  });
});

describe('wenn sich die Sitzung nicht mehr merken lässt', () => {
  /*
     Der Fehler, gegen den das steht: das Schreiben scheiterte, und der `catch`
     war leer. „Best-effort by design" stand daneben, und der Satz stimmte —
     nur war er kein Grund zu schweigen. Ein einziges eingebettetes Bild
     sprengte das Kontingent, von da an sicherte sich nichts mehr, und der
     Benutzer arbeitete weiter im Vertrauen darauf, dass es geschieht.
  */
  let stop = () => undefined as void;

  beforeEach(() => {
    vi.useFakeTimers();
    useDeckStore.setState({
      deck: createStarterDeck(),
      slideIndex: 0,
      sicherungGescheitert: false,
    });
    stop = startAutosave();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Eine Änderung am Deck anstoßen und die Selbstsicherung laufen lassen. */
  const schreibenLassen = () => {
    useDeckStore.getState().addSlide();
    vi.advanceTimersByTime(1000);
  };

  it('sagt es', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    schreibenLassen();
    expect(useDeckStore.getState().sicherungGescheitert).toBe(true);
  });

  it('nimmt es zurück, sobald es wieder geht', () => {
    // Wer den Grund beseitigt — das Bild gelöscht, das Deck geteilt —, soll
    // die Warnung loswerden, ohne etwas dafür tun zu müssen.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    schreibenLassen();
    expect(useDeckStore.getState().sicherungGescheitert).toBe(true);

    setItem.mockRestore();
    schreibenLassen();
    expect(useDeckStore.getState().sicherungGescheitert).toBe(false);
  });

  it('schlägt keinen Alarm, solange es klappt', () => {
    schreibenLassen();
    expect(useDeckStore.getState().sicherungGescheitert).toBe(false);
  });
});

describe('wenn eine Datei-Aktion scheitert', () => {
  /*
     Der Fehler, gegen den das steht: ein gescheiterter Export sagte nichts.
     `console.error`, der Spinner ging aus, und wer auf „PDF" geklickt hatte,
     sah einen Moment lang etwas laufen und danach nichts — kein Unterschied zu
     einem Export, den man versehentlich abgebrochen hat. Und der Unterschied
     ist genau der, auf den es ankommt.

     Beim Sichern war es schlimmer: `⌘S` hatte gar keine Fehlerbehandlung, und
     ein Scheitern endete als unbehandelte Zusage.
  */
  beforeEach(() => {
    useDeckStore.setState({ deck: createStarterDeck(), hinweis: null, dirty: true });
    exportMarkdown.mockReset();
    openMarkdownFile.mockReset();
  });

  const abbruch = () => new DOMException('abgebrochen', 'AbortError');

  it('sagt, dass das Deck nicht gesichert werden konnte', async () => {
    exportMarkdown.mockRejectedValue(new Error('Kein Platz auf dem Datenträger'));

    expect(await sichereDeck()).toBe(false);
    const hinweis = String(useDeckStore.getState().hinweis);
    expect(hinweis).toMatch(/nicht sichern/i);
    // Der technische Satz bleibt stehen: wer einen Fehler meldet, braucht ihn.
    expect(hinweis).toContain('Kein Platz auf dem Datenträger');
  });

  it('schweigt, wenn der Mensch den Dialog schließt', async () => {
    // Ein geschlossener Dateidialog ist keine Panne, sondern die Antwort
    // „doch nicht". Eine Klage darüber wäre schlimmer als keine.
    exportMarkdown.mockRejectedValue(abbruch());

    expect(await sichereDeck()).toBe(false);
    expect(useDeckStore.getState().hinweis).toBeNull();
  });

  it('nimmt den Hinweis weg, sobald es geklappt hat', async () => {
    useDeckStore.setState({ hinweis: 'Etwas Altes' });
    exportMarkdown.mockResolvedValue({ via: 'download' });

    expect(await sichereDeck()).toBe(true);
    expect(useDeckStore.getState().hinweis).toBeNull();
    expect(useDeckStore.getState().dirty).toBe(false);
  });

  it('sagt, dass die Datei nicht geöffnet werden konnte', async () => {
    useDeckStore.setState({ dirty: false });
    openMarkdownFile.mockRejectedValue(new Error('Datei nicht lesbar'));

    expect(await oeffneDeck()).toBe(false);
    expect(String(useDeckStore.getState().hinweis)).toMatch(/nicht öffnen/i);
  });

  it('macht aus einem Fehler einen Satz', () => {
    expect(grund(new Error('Bumm'))).toBe('Bumm');
    expect(grund('Bumm')).toBe('Bumm');
    // Ein geworfenes Objekt ohne Botschaft darf nicht als „[object Object]"
    // vor Augen kommen.
    expect(grund({})).toBe('Unbekannter Fehler.');
  });
});

/**
 * Eine unlesbare Sitzung ist nicht dasselbe wie keine.
 *
 * Beide gaben `null` zurück, und der Unterschied war alles: bei „keine" hat
 * hier noch nie jemand gearbeitet, bei „unlesbar" stehen seine Zeichen in der
 * Ablage und niemand sagt es. Das Werkzeug startete mit der Willkommensmappe,
 * und siebenhundert Millisekunden nach der ersten Änderung schrieb die
 * Selbstsicherung darüber.
 *
 * Geprüft wird an der **Ablage** und nicht am Rückgabewert: dass `loadSession()`
 * `null` liefert, sagt nichts darüber, ob der Rohtext noch da ist.
 */
describe('eine Sitzung, die sich nicht lesen lässt', () => {
  beforeEach(() => {
    localStorage.clear();
    useDeckStore.getState().zeigeHinweis(null);
  });

  const kaputt = (roh: string) => {
    localStorage.setItem(STORAGE_KEY, roh);
    return loadSession();
  };

  it('bleibt erhalten und wird beim Namen genannt', () => {
    const roh = JSON.stringify({ markdown: '---\ntitle: Meins\n---\n\n# Folie.', savedAt: 1 });
    const halb = roh.slice(0, roh.length - 15);

    expect(kaputt(halb)).toBeNull();
    // Der Rohtext steht wortgleich beiseite …
    expect(localStorage.getItem(UNLESBAR_KEY)).toBe(halb);
    // … der kaputte Eintrag ist weg, damit die Selbstsicherung ihn nicht trifft …
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // … und die Oberfläche weiß davon.
    const hinweis = String(useDeckStore.getState().hinweis);
    expect(hinweis).toMatch(/nicht lesen/i);
    expect(hinweis).toContain(String(halb.length));
    expect(hinweis).toContain(UNLESBAR_KEY);
  });

  it('gilt auch für einen Eintrag ohne Markdown', () => {
    // Kein Wurf, sondern eine fremde Gestalt — der zweite stille Weg.
    const fremd = JSON.stringify({ deck: { slides: [] }, version: 2 });
    expect(kaputt(fremd)).toBeNull();
    expect(localStorage.getItem(UNLESBAR_KEY)).toBe(fremd);
    expect(String(useDeckStore.getState().hinweis)).toMatch(/kein Markdown/i);
  });

  it('schweigt dagegen, wo es wirklich nichts gab', () => {
    /*
       Die Gegenrichtung, und sie trägt die Regel: ein Hinweis beim ersten
       Start wäre eine Warnung über etwas, das nie existiert hat — genau die
       Sorte Wächter, die man abschaltet.
    */
    expect(loadSession()).toBeNull();
    expect(useDeckStore.getState().hinweis).toBeNull();
    expect(localStorage.getItem(UNLESBAR_KEY)).toBeNull();
  });

  it('holt eine heile Sitzung zurück, ohne etwas beiseitezulegen', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        markdown: '---\ntitle: Heil\n---\n\n# Folie.',
        fileName: 'heil.md',
        slideIndex: 0,
        savedAt: 1,
      }),
    );
    const sitzung = loadSession();
    expect(sitzung?.deck.meta.title).toBe('Heil');
    expect(sitzung?.fileName).toBe('heil.md');
    expect(localStorage.getItem(UNLESBAR_KEY)).toBeNull();
    expect(useDeckStore.getState().hinweis).toBeNull();
  });
});

/**
 * Ein Sichern, das woanders landet, sagt es.
 *
 * `saveBlob()` fällt auf einen Download zurück, wenn das Schreiben in den
 * Dateigriff scheitert — die Datei ist verschoben, die Berechtigung abgelaufen.
 * Die Politik stimmt; nur las `sichereDeck()` das `via` nicht. Das Deck galt
 * als gesichert, der Griff blieb stehen, und die geöffnete Datei auf der
 * Platte war weiter die alte.
 */
describe('wohin gesichert wurde', () => {
  beforeEach(() => {
    useDeckStore.getState().zeigeHinweis(null);
    useDeckStore.setState({ fileName: 'meins.md', fileHandle: undefined });
    exportMarkdown.mockReset();
  });

  it('meldet, wenn statt in die Datei heruntergeladen wurde', async () => {
    useDeckStore.setState({ fileHandle: {} as FileSystemFileHandle });
    exportMarkdown.mockResolvedValue({ via: 'download' });

    expect(await sichereDeck()).toBe(true);
    const hinweis = String(useDeckStore.getState().hinweis);
    expect(hinweis).toContain('meins.md');
    expect(hinweis).toMatch(/heruntergeladen/i);
    expect(hinweis).toMatch(/nicht auf dem neuesten Stand/i);
  });

  it('schweigt, wenn die Datei wirklich beschrieben wurde', () => {
    useDeckStore.setState({ fileHandle: {} as FileSystemFileHandle });
    exportMarkdown.mockResolvedValue({ via: 'handle', handle: {} });
    return sichereDeck().then(() => {
      expect(useDeckStore.getState().hinweis).toBeNull();
    });
  });

  it('schweigt auch beim ersten Sichern ohne Datei', async () => {
    /*
       Die Gegenrichtung, ohne die die Prüfung oben auch für einen Hinweis
       bestünde, der immer kommt: wer noch nie gesichert hat, *soll* einen
       Download bekommen, und das ist keine Meldung wert.
    */
    exportMarkdown.mockResolvedValue({ via: 'download' });
    expect(await sichereDeck()).toBe(true);
    expect(useDeckStore.getState().hinweis).toBeNull();
  });
});
