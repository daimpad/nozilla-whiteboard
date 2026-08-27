/**
 * Welche Farbe unter einer Folie liegt.
 *
 * Am 27. August 2026 haben die beiden hellen Untergründe die Plätze getauscht:
 * `paper` malt seither das **Weiß** des Erscheinungsbilds, und der warme
 * Papierton hat mit `cream` einen eigenen Wert bekommen. Der Name `paper`
 * blieb, weil er in jeder bestehenden `.md` steht — ihn umzubenennen hieße,
 * jedes Deck unlesbar zu machen.
 *
 * Genau deshalb steht diese Prüfung hier. Der Wert im Dateiformat sagt seit
 * dem Tausch nicht mehr, welche Farbe herauskommt; wer nur den Namen liest,
 * liest das Falsche. Geprüft wird darum am **fertigen SVG**: dort steht die
 * Farbe, die auch im PDF, im PPTX und auf der Fläche landet, denn alle vier
 * sind Kunden derselben Szene.
 */
import { describe, expect, it } from 'vitest';
import { elementTones, palette } from '@/theme';
import { backgroundLabels } from '@/lib/labels';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { slideBackgrounds } from '@/model/types';
import { buildSlideScene } from './scene';
import { sceneToSvg } from './svg';

const deckMit = (background: string) =>
  parseDeck(['<!-- nzl', `background: ${background}`, '-->', '', '# Eine Folie', ''].join('\n'));

/** Die Füllung des ersten Rechtecks im fertigen SVG — der Untergrund. */
function untergrund(background: string): string {
  const deck = deckMit(background);
  const svg = sceneToSvg(buildSlideScene(deck.slides[0], deck));
  const dokument = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(dokument.getElementsByTagName('parsererror')).toHaveLength(0);

  const rect = dokument.getElementsByTagName('rect')[0];
  expect(rect).toBeTruthy();
  return rect.getAttribute('fill') ?? '';
}

describe('der Untergrund einer Folie im fertigen SVG', () => {
  it('malt bei „paper" das Weiß und nicht den Papierton', () => {
    // Der Tausch selbst. Ohne diese Zeile wäre der einzige Beleg der
    // Funktionsname, und der sagt seit dem Tausch das Gegenteil.
    expect(untergrund('paper')).toBe(palette.white);
    expect(untergrund('paper')).not.toBe(palette.paper);
  });

  it('malt bei „cream" den Papierton', () => {
    expect(untergrund('cream')).toBe(palette.paper);
  });

  it('gibt dem Raster dasselbe Weiß wie dem Papier', () => {
    // „Raster" heißt Papier mit Punkten. Ein cremefarbenes Raster neben einem
    // weißen Papier wäre ein dritter Ton, den niemand gewählt hat.
    expect(untergrund('grid')).toBe(untergrund('paper'));
  });

  it('lässt Tinte und Signal, wie sie waren', () => {
    // Die Gegenrichtung: der Tausch betrifft die hellen Untergründe und sonst
    // keinen. Ohne sie hielte diese Datei auch dann, wenn alles weiß würde.
    expect(untergrund('ink')).toBe(palette.ink);
    expect(untergrund('signal')).toBe(palette.signal);
  });

  it('unterscheidet die beiden hellen wirklich', () => {
    // Beim Musterkunden sind sie dieselbe Farbe, und das ist dessen CI. Bei
    // nozilla müssen sie zwei sein — sonst wäre der neue Wert eine Attrappe.
    expect(palette.white).not.toBe(palette.paper);
  });
});

describe('„cream" als Wert des Dateiformats', () => {
  it('überlebt das Lesen und Schreiben einer Datei', () => {
    // Ein Untergrund, den der Inspektor anbietet und die `.md` verliert, wäre
    // schlimmer als keiner: die Folie sähe nach dem Öffnen anders aus.
    const deck = deckMit('cream');
    expect(deck.slides[0].meta.background).toBe('cream');

    const zurueck = parseDeck(serializeDeck(deck));
    expect(zurueck.slides[0].meta.background).toBe('cream');
    expect(serializeDeck(deck)).toContain('background: cream');
  });

  it('steht im Vokabular, das der Parser kennt', () => {
    expect(slideBackgrounds).toContain('cream');
    // Und `paper` bleibt der erste — der Rückfall für alles Unbekannte.
    expect(slideBackgrounds[0]).toBe('paper');
  });

  it('fällt bei einem unbekannten Wort auf „paper" zurück, also auf Weiß', () => {
    // Ein älteres Deck mit `paper-alt` liegt seit heute auf Weiß statt auf
    // Creme. Wer den warmen Ton behalten will, schreibt `cream`.
    expect(deckMit('paper-alt').slides[0].meta.background).toBe('paper');
    expect(untergrund('paper-alt')).toBe(palette.white);
  });
});

describe('die Beschriftungen im Inspektor', () => {
  it('führt jeden Untergrund, den der Parser kennt', () => {
    // Ein Untergrund ohne Beschriftung stünde als roher Wert im Menü.
    for (const background of slideBackgrounds) {
      expect(backgroundLabels[background]).toBeTruthy();
    }
  });

  it('nennt keine Farbe, die der Untergrund nicht malt', () => {
    /*
       Die eigentliche Falle dieses Tauschs, und sie sitzt nicht im Code,
       sondern im Wort. „Papier" *benennt in dieser CI den Cremeton* —
       `palette.paper` ist der warme, und die Flächenrolle „Papier" gleich
       darunter im Inspektor malt genau ihn. Ein weißer Untergrund namens
       „Papier" widerspräche also der Beschriftung zwei Zeilen tiefer, und das
       fiele niemandem auf, weil beide Listen für sich stimmig aussehen.

       Geprüft wird deshalb die Regel und nicht der Einzelfall: wer eine Farbe
       benennt, muss sie auch malen.
    */
    const farbwoerter: Record<string, string> = {
      Weiß: palette.white,
      Creme: palette.paper,
      Papier: palette.paper,
      Tinte: palette.ink,
      Signal: palette.signal,
    };

    for (const background of slideBackgrounds) {
      const versprochen = farbwoerter[backgroundLabels[background]];
      if (!versprochen) continue;
      expect([background, untergrund(background)]).toEqual([background, versprochen]);
    }
  });

  it('gibt derselben Farbe in beiden Listen denselben Namen', () => {
    // Der Inspektor führt Untergründe und Flächenrollen untereinander. Trüge
    // „Weiß" oben eine andere Farbe als unten, wäre jede Wahl ein Ratespiel.
    expect(elementTones.white.surface).toBe(untergrund('paper'));
    expect(elementTones.paper.surface).toBe(untergrund('cream'));
  });
});
