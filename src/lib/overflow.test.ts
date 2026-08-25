import { describe, expect, it } from 'vitest';
import { overflowOf } from './overflow';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';

/**
 * Zwei Hälften, und die zweite ist die wichtigere: eine Anzeige, die bei jedem
 * Element anschlägt, ist so nutzlos wie gar keine. Wer sie einmal zu oft
 * gesehen hat, sieht sie nicht mehr.
 */
const text = (patch: Record<string, unknown>) =>
  createElement('text', {
    typeStyle: 'body',
    text: 'Ein Satz.',
    ...patch,
  } as never) as CanvasElement;

describe('der Überlauf', () => {
  it('schweigt, wo der Inhalt in seinen Kasten passt', () => {
    expect(overflowOf(text({ w: 400, h: 200 }))).toBe(0);
  });

  it('meldet sich, wenn der Text tiefer reicht als der Kasten', () => {
    // Derselbe Text, ein Zehntel der Höhe und ein Drittel der Breite: er
    // bricht öfter um und reicht damit unter die Unterkante.
    const eng = text({
      w: 120,
      h: 20,
      text: 'Ein Satz, der in einem sehr schmalen Kasten viele Male umbrechen muss.',
    });
    expect(overflowOf(eng)).toBeGreaterThan(0);
  });

  it('gibt an, um wie viel — nicht nur, dass', () => {
    const kurz = text({ w: 300, h: 10, text: 'Eine Zeile.' });
    const lang = text({
      w: 300,
      h: 10,
      text: 'Eine Zeile. Und noch eine. Und eine dritte, damit es deutlich mehr wird als vorher.',
    });
    expect(overflowOf(lang)).toBeGreaterThan(overflowOf(kurz));
  });

  it('nimmt Unterlängen und Rundung in Kauf', () => {
    // Ohne Nachsicht schlüge fast jedes Textelement an: die Grundlinie der
    // letzten Zeile liegt fast immer dicht an der Unterkante.
    const knapp = text({ w: 400, h: 26, text: 'Genau eine Zeile.' });
    expect(overflowOf(knapp)).toBe(0);
  });

  it('lässt Bild und Verbinder in Ruhe', () => {
    // Ein Bild wird eingepasst, eine Linie hat keinen Inhalt — dort wäre die
    // Frage sinnlos.
    const bild = createElement('image', { w: 10, h: 10 }) as CanvasElement;
    const linie = createElement('connector', { w: 300, h: 0 }) as CanvasElement;
    expect(overflowOf(bild)).toBe(0);
    expect(overflowOf(linie)).toBe(0);
  });

  it('sieht auch eine Karte an, nicht nur reinen Text', () => {
    const passt = createElement('card', {
      w: 492,
      h: 220,
      title: 'Der Schnitt',
      body: 'Aus dem Entwurf wird eine Kontur.',
    }) as CanvasElement;
    const zuKlein = createElement('card', {
      w: 200,
      h: 40,
      title: 'Der Schnitt',
      body: 'Aus dem Entwurf wird eine Kontur, und aus der Kontur ein Muster.',
    }) as CanvasElement;

    expect(overflowOf(passt)).toBe(0);
    expect(overflowOf(zuKlein)).toBeGreaterThan(0);
  });
});
