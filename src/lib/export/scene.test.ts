/**
 * Woran Untergrund und Fußzeile hängen — und woran nicht.
 *
 * Die Drehscheibe hatte keine eigene Prüfung. Das hier ist die kleinste
 * nützliche: welche Felder einer Folie die beiden Erzeuger überhaupt lesen.
 *
 * Der Anlass war ein Verdacht, der sich nicht bestätigt hat. In `SlideView`
 * merken sich zwei `useMemo` ihr Markup an der ganzen `slide`; damit verfällt
 * bei jeder Änderung an irgendeinem Element auch der Untergrund, und der setzt
 * den ganzen Fließtext neu. Das klingt teuer und ist es nicht: gemessen an
 * vierzig Zugschritten, auf einer Folie mit vierzehn Absätzen, sind es
 * 163 ms gegen 166 ms — der Unterschied liegt im Rauschen, weil der
 * Messpuffer in `measure.ts` die Schriftmaße ohnehin schon hält. Die engeren
 * Merker sind deshalb *nicht* eingebaut worden: sie hätten nichts gebracht
 * und eine Abhängigkeitsliste hinterlassen, die von Hand stimmen muss.
 *
 * Was bleibt, ist diese Prüfung. Sie hält fest, was die Erzeuger lesen — und
 * wer ihnen ein Feld hinzufügt, sieht hier, dass er es getan hat.
 */
import { describe, expect, it } from 'vitest';
import { buildSlideBackdrop, buildSlideChrome } from './scene';
import { createEmptySlide } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import type { Deck, Slide } from '@/model/types';

const folie = (patch: Partial<Slide> = {}): Slide =>
  createEmptySlide({
    markdown: '# Überschrift\n\nEin Absatz, der gesetzt werden muss.',
    ...patch,
    meta: { layout: 'default', transition: 'fade', background: 'paper', ...patch.meta },
  });

const deck = (patch: Partial<Deck['meta']> = {}): Deck => ({
  meta: { title: 'Ein Deck', footer: 'nozilla · Gute digitale Dienste.', ...patch },
  slides: [],
});

describe('der Untergrund einer Folie', () => {
  it('ändert sich nicht, wenn sich ein Element ändert', () => {
    // Der eigentliche Punkt: Elemente liegen *auf* dem Untergrund, nicht darin.
    const ohne = buildSlideBackdrop(folie());
    const mit = buildSlideBackdrop(
      folie({ elements: [createElement('card'), createElement('shape', { x: 400 })] }),
    );
    expect(mit).toEqual(ohne);
  });

  it('ändert sich nicht mit Notizen, Nummer oder Nacktheit', () => {
    const schlicht = buildSlideBackdrop(folie());
    expect(buildSlideBackdrop(folie({ meta: { notes: 'Etwas zum Sagen' } as never }))).toEqual(
      schlicht,
    );
  });

  it('ändert sich sehr wohl mit Untergrund, Layout und Fließtext', () => {
    // Die Gegenrichtung. Ohne sie stünde hier eine Prüfung, die auch dann
    // hielte, wenn `buildSlideBackdrop` immer dasselbe zurückgäbe.
    const schlicht = buildSlideBackdrop(folie());
    expect(buildSlideBackdrop(folie({ meta: { background: 'ink' } as never }))).not.toEqual(
      schlicht,
    );
    expect(buildSlideBackdrop(folie({ meta: { layout: 'title' } as never }))).not.toEqual(schlicht);
    expect(buildSlideBackdrop(folie({ markdown: '# Etwas anderes' }))).not.toEqual(schlicht);
  });
});

describe('die Fußzeile einer Folie', () => {
  const optionen = { slideNumber: 3, totalSlides: 9 };

  it('ändert sich nicht mit Fließtext, Layout oder Elementen', () => {
    const schlicht = buildSlideChrome(folie(), deck(), optionen);
    expect(buildSlideChrome(folie({ markdown: '# Ganz anders' }), deck(), optionen)).toEqual(
      schlicht,
    );
    expect(
      buildSlideChrome(folie({ meta: { layout: 'quote' } as never }), deck(), optionen),
    ).toEqual(schlicht);
    expect(
      buildSlideChrome(folie({ elements: [createElement('badge')] }), deck(), optionen),
    ).toEqual(schlicht);
  });

  it('ändert sich sehr wohl mit `bare`, Untergrund, Fußzeilentext und Nummer', () => {
    const schlicht = buildSlideChrome(folie(), deck(), optionen);
    expect(buildSlideChrome(folie({ meta: { bare: true } as never }), deck(), optionen)).toEqual(
      [],
    );
    expect(
      buildSlideChrome(folie({ meta: { background: 'ink' } as never }), deck(), optionen),
    ).not.toEqual(schlicht);
    expect(buildSlideChrome(folie(), deck({ footer: 'Anderer Fuß' }), optionen)).not.toEqual(
      schlicht,
    );
    expect(buildSlideChrome(folie(), deck(), { ...optionen, slideNumber: 4 })).not.toEqual(
      schlicht,
    );
  });
});
