/**
 * Die Frage vor dem Ersetzen.
 *
 * Sie stand lange an genau einer von sechs Stellen — das Beispiel-Menü fragte,
 * „Neues Deck", „Öffnen", `⌘⇧N`, `⌘O`, die Datei im Fenster und die Übernahme
 * aus dem Prompt nicht. Wer dort danebengriff, verlor die ungesicherte Arbeit
 * samt Verlauf, und die Selbstsicherung schrieb den Verlust siebenhundert
 * Millisekunden später fest.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { darfErsetzen } from './persistence';
import { useDeckStore } from './deckStore';

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
