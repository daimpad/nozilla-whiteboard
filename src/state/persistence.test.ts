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
import { darfErsetzen, grund, oeffneDeck, sichereDeck, startAutosave } from './persistence';
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
