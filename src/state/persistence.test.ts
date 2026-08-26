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
import { darfErsetzen, startAutosave } from './persistence';
import { createStarterDeck, useDeckStore } from './deckStore';

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
