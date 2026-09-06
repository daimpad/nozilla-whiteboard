/**
 * Der Titel einer Folie — die Zeichenkette, die vier Stellen anzeigen.
 *
 * Filmstreifen, Übersicht, Referentenansicht und das Exportmenü nennen eine
 * Folie so. Gezeichnet wird sie nie über die Zeichenstrecke; sie entsteht in
 * `slideTitle()` aus dem Markdown und wird dort von Hand von ihren
 * Auszeichnungen befreit. Genau dort saß der Fehler, den diese Datei bewacht.
 */
import { describe, expect, it } from 'vitest';
import { slideTitle, type Slide } from './types';
import { createElement } from './factory';
import { lexInline } from '@/lib/markdown/render';

function folie(markdown: string, elements: Slide['elements'] = []): Slide {
  return { id: 'probe', markdown, elements, meta: { layout: 'default' } } as Slide;
}

describe('slideTitle', () => {
  it('nimmt die erste Überschrift', () => {
    expect(slideTitle(folie('Vorspann\n\n# Der Titel\n\nText'), 0)).toBe('Der Titel');
  });

  it('nimmt die Auszeichnungen heraus', () => {
    expect(slideTitle(folie('# **Fett** und *kursiv* und `code`'), 0)).toBe(
      'Fett und kursiv und code',
    );
    expect(slideTitle(folie('# Ein ==Marker== im Titel'), 0)).toBe('Ein Marker im Titel');
    expect(slideTitle(folie('# Ein [Verweis](https://example.org) darin'), 0)).toBe(
      'Ein Verweis darin',
    );
    expect(slideTitle(folie('# Ein ![Bild](logo.png) darin'), 0)).toBe('Ein  darin');
  });

  it('lässt einen Unterstrich im Wort stehen', () => {
    /*
       Die Regel ist nicht erfunden, sondern die von CommonMark: `_` zeichnet
       innerhalb eines Wortes nicht aus. Gehalten wird sie hier gegen den
       Leser, der sie umsetzt — zwei Rechnungen für dieselbe Frage laufen sonst
       auseinander, und man sähe es nur an einer Kachel.
    */
    const roh = 'Der user_id-Fehler';
    expect(slideTitle(folie(`# ${roh}`), 0)).toBe(roh);

    const stueck = lexInline(roh) as { type: string; text?: string }[];
    expect(stueck).toHaveLength(1);
    expect(stueck[0].text).toBe(roh);
  });

  it('nimmt einen echten Kursiv-Unterstrich trotzdem weg', () => {
    expect(slideTitle(folie('# _kursiv_ und __fett__'), 0)).toBe('kursiv und fett');
  });

  it('fällt auf das erste Element zurück, wenn keine Überschrift dasteht', () => {
    const text = createElement('text', { text: 'Aus dem Element' });
    expect(slideTitle(folie('', [text]), 0)).toBe('Aus dem Element');
  });

  it('nimmt das oberste Element und nicht das erste im Array', () => {
    const unten = createElement('text', { y: 500, text: 'unten' });
    const oben = createElement('text', { y: 100, text: 'oben' });
    expect(slideTitle(folie('', [unten, oben]), 0)).toBe('oben');
  });

  it('fällt auf die erste Textzeile zurück', () => {
    expect(slideTitle(folie('\n\n   Eine Zeile ohne Raute\n'), 0)).toBe('Eine Zeile ohne Raute');
  });

  it('nennt zuletzt die Nummer', () => {
    expect(slideTitle(folie('   \n\n'), 4)).toBe('Folie 5');
  });
});
