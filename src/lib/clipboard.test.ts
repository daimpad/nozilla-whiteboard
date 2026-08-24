import { describe, expect, it } from 'vitest';
import { elementsToSnippet, snippetToElements } from './clipboard';
import { parseDeck } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/**
 * Die Zwischenablage ist ein Ausschnitt der Datei, kein zweites Format.
 *
 * Genau das wird hier geprüft — nicht, dass die Funktionen etwas zurückgeben,
 * sondern dass das Zurückgegebene *dieselbe* Sprache spricht wie die `.md`.
 * Ginge das auseinander, fiele es erst jemandem auf, der kopiert.
 */
const karte = createElement('card', {
  x: 700,
  y: 96,
  w: 492,
  h: 168,
  variant: 'feature',
  label: 'Erst',
  title: 'Der Schnitt',
  body: 'Aus dem Entwurf wird eine Kontur.',
  tone: 'signal',
}) as CanvasElement;

const zeichen = createElement('icon', {
  x: 88,
  y: 440,
  w: 88,
  h: 88,
  icon: 'rocket',
  frame: 'box',
}) as CanvasElement;

describe('die Zwischenablage', () => {
  it('schreibt den Block, der auch in der Datei stünde', () => {
    const text = elementsToSnippet([karte, zeichen]);
    expect(text.startsWith('<!-- nzl')).toBe(true);
    expect(text.trimEnd().endsWith('-->')).toBe(true);
    // Die Probe aufs Exempel: der Ausschnitt ist als Folie einlesbar.
    const deck = parseDeck(text);
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0].elements).toHaveLength(2);
  });

  it('bringt Ort, Maß und Art unverändert zurück', () => {
    const [zurueck] = snippetToElements(elementsToSnippet([karte]));
    expect(zurueck.kind).toBe('card');
    expect([zurueck.x, zurueck.y, zurueck.w, zurueck.h]).toEqual([700, 96, 492, 168]);
    expect(zurueck.kind === 'card' && zurueck.title).toBe('Der Schnitt');
    expect(zurueck.tone).toBe('signal');
  });

  it('vergibt frische Kennungen', () => {
    // Sonst lägen nach dem Einfügen auf derselben Folie zwei Elemente mit
    // derselben Kennung — und jede Auswahl träfe beide.
    const [zurueck] = snippetToElements(elementsToSnippet([karte]));
    expect(zurueck.id).not.toBe(karte.id);
    const [a, b] = snippetToElements(elementsToSnippet([karte, zeichen]));
    expect(a.id).not.toBe(b.id);
  });

  it('lässt fremden Text fremd sein', () => {
    // Wer einen Satz kopiert und ⌘V drückt, soll keine Folie zerlegt bekommen.
    expect(snippetToElements('Guten Morgen.')).toEqual([]);
    expect(snippetToElements('')).toEqual([]);
    expect(snippetToElements('{ "elements": [1, 2, 3] }')).toEqual([]);
    // Auch ein Text, der das Stichwort trägt und trotzdem keiner ist.
    expect(snippetToElements('Die elements: sind hier nur ein Wort.')).toEqual([]);
  });

  it('überlebt die Runde durch echten Zwischenablagentext', () => {
    // Ein Editor darf den Text angefasst haben: führende Leerzeile, Rest
    // unverändert.
    const text = `\n${elementsToSnippet([karte, zeichen])}\n`;
    expect(snippetToElements(text)).toHaveLength(2);
  });
});
