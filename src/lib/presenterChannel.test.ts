/**
 * Was zwischen den beiden Fenstern passieren muss — und was nicht.
 *
 * Die Referentenansicht selbst wird im Rauchtest geprüft, mit zwei echten
 * Fenstern; hier steht, worauf sie sich verlässt. Beides fiel schon einmal
 * auseinander, ohne dass ein Test etwas sagte: der Vortrag lief, das zweite
 * Fenster blieb leer.
 */
import { describe, expect, it } from 'vitest';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import {
  endlicherSchritt,
  isPresenterWindow,
  openPresenterChannel,
  PRESENTER_QUERY,
  type Vortragsnachricht,
} from './presenterChannel';

describe('das zweite Fenster erkennt sich selbst', () => {
  it('nur bei genau dieser Adresse', () => {
    expect(isPresenterWindow(`?${PRESENTER_QUERY}=1`)).toBe(true);
    expect(isPresenterWindow(`?deck=a&${PRESENTER_QUERY}=1`)).toBe(true);
    expect(isPresenterWindow('')).toBe(false);
    expect(isPresenterWindow('?referenten=1')).toBe(false);
    // Eine Null ist kein Ja. Sonst öffnete ein Link mit abgeschalteter
    // Referentenansicht genau sie.
    expect(isPresenterWindow(`?${PRESENTER_QUERY}=0`)).toBe(false);
  });
});

describe('der Stand', () => {
  it('trägt eine ganz gezeigte Folie als endliche Zahl hinüber', () => {
    // `Infinity` heißt im Store „alles sichtbar". Es überlebt das Klonen,
    // aber nicht die Zwischenstationen — in JSON wird daraus `null`, und die
    // Referentenansicht zeigte dann die erste Stufe.
    const schritt = endlicherSchritt(Infinity);
    expect(Number.isFinite(schritt)).toBe(true);
    expect(schritt).toBeGreaterThan(1000);
    expect(JSON.parse(JSON.stringify({ schritt })).schritt).toBe(schritt);
  });

  it('lässt eine echte Stufe in Ruhe', () => {
    expect(endlicherSchritt(0)).toBe(0);
    expect(endlicherSchritt(2)).toBe(2);
  });
});

describe('das Deck geht als Markdown hinüber', () => {
  const quelle = [
    '---',
    'title: Vortrag',
    '---',
    '',
    '<!-- nzl',
    'layout: default',
    'notes: Hier steht, was gesagt werden soll.',
    '-->',
    '',
    '# Erste Folie',
    '',
    '---',
    '',
    '# Zweite Folie',
    '',
  ].join('\n');

  it('und kommt mit seinen Notizen an', () => {
    // Die Notizen sind der eigentliche Zweck des zweiten Fensters. Gingen sie
    // beim Serialisieren verloren, wäre die Referentenansicht eine zweite
    // Folienansicht und sonst nichts.
    const drueben = parseDeck(serializeDeck(parseDeck(quelle)));
    expect(drueben.slides).toHaveLength(2);
    expect(drueben.slides[0].meta.notes).toContain('was gesagt werden soll');
  });
});

describe('der Kanal', () => {
  it('trägt eine Nachricht zum anderen Fenster und nicht zu sich selbst', async () => {
    // Das ist die Eigenschaft, auf der die Handreichung beruht: die
    // vortragende Seite hört ihre eigenen Stände nicht und gerät deshalb nicht
    // in eine Schleife.
    const sender = openPresenterChannel();
    const empfaenger = openPresenterChannel();
    expect(sender && empfaenger).toBeTruthy();
    if (!sender || !empfaenger) return;

    const beimSender: Vortragsnachricht[] = [];
    sender.onmessage = (event: MessageEvent<Vortragsnachricht>) => beimSender.push(event.data);

    // Gewartet wird auf die Nachricht und nicht auf eine Frist: wann jsdom
    // zustellt, ist seine Sache, und ein `setTimeout(0)` traf es nicht immer.
    const angekommen = new Promise<Vortragsnachricht>((da) => {
      empfaenger.onmessage = (event: MessageEvent<Vortragsnachricht>) => da(event.data);
    });

    sender.postMessage({ art: 'hallo' } satisfies Vortragsnachricht);

    expect(await angekommen).toEqual({ art: 'hallo' });
    expect(beimSender).toEqual([]);

    sender.close();
    empfaenger.close();
  });
});
