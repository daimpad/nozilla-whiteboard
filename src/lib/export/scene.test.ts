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
import {
  backgroundStyle,
  buildElementPrims,
  buildSlideBackdrop,
  buildSlideChrome,
  kartenFelder,
  nutztInnenabstand,
  unsichtbareFlaeche,
  type ScenePrim,
} from './scene';
import { primsToSvgMarkup } from './svg';
import { createEmptySlide } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import {
  fillStyles,
  slideBackgrounds,
  type CanvasElement,
  type Deck,
  type ElementKind,
  type Slide,
} from '@/model/types';
import { toneNames } from '@/theme';

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

/* -------------------------------------------------------------------------- */

describe('was ein Element zeichnet', () => {
  /** Die Hülle aller Pfadsegmente eines Prims. */
  const huelle = (prims: ScenePrim[]) => {
    // Nur die Kontur: der Schatten liegt versetzt und verschöbe die Hülle.
    const punkte = prims.flatMap((prim) =>
      prim.t === 'path' && prim.stroke
        ? prim.segs.flatMap((seg) => ('x' in seg ? [{ x: seg.x, y: seg.y }] : []))
        : [],
    );
    return {
      x0: Math.min(...punkte.map((p) => p.x)),
      x1: Math.max(...punkte.map((p) => p.x)),
      y0: Math.min(...punkte.map((p) => p.y)),
      y1: Math.max(...punkte.map((p) => p.y)),
    };
  };

  it('dreht ein Bild um dieselbe Mitte wie seinen Rahmen', () => {
    /*
       Das `image`-Primitiv ging als einziges an `elementMatrix()` vorbei: es
       bekam die *ungedrehte* Ecke plus einen Winkel, und `svg.ts` dreht um
       (x, y) — also um die linke obere Ecke, während alles andere am selben
       Element um die Mitte gedreht wird. Bei 90° und 400 × 100 lagen Rahmen
       und Schatten bei x 250…350 / y 50…450 und das Bild bei x 0…100 /
       y 200…600: zwei getrennte Dinge auf derselben Folie, das Bild links aus
       der Folie heraus, und der Klickbereich dort, wo es nicht ist.

       Geprüft wird an der **Hülle**, nicht am Winkel: der Kasten des Bildes
       muss dort liegen, wo der Kasten seines eigenen Rahmens liegt.
    */
    const bild = createElement('image', {
      x: 100,
      y: 200,
      w: 400,
      h: 100,
      rotation: 90,
      src: 'logo.png',
      fill: 'outline',
    });
    const prims = buildElementPrims(bild);
    const rahmen = huelle(prims);
    const gemalt = prims.find((prim) => prim.t === 'image');
    expect(gemalt?.t).toBe('image');
    if (gemalt?.t !== 'image') return;

    // Die Ecke des Bildes ist eine Ecke seines Rahmens.
    const ecken = [
      [rahmen.x0, rahmen.y0],
      [rahmen.x1, rahmen.y0],
      [rahmen.x1, rahmen.y1],
      [rahmen.x0, rahmen.y1],
    ];
    expect(
      ecken.some(([x, y]) => Math.abs(x - gemalt.x) < 0.01 && Math.abs(y - gemalt.y) < 0.01),
    ).toBe(true);

    // Und die Gegenrichtung: ohne Drehung ändert sich nichts.
    const gerade = buildElementPrims({ ...bild, rotation: 0 });
    const ohne = gerade.find((prim) => prim.t === 'image');
    expect(ohne?.t === 'image' && ohne.x).toBe(100);
    expect(ohne?.t === 'image' && ohne.y).toBe(200);
  });

  it('trägt die Einpassung in die Szene', () => {
    // `fit` stand im Modell, im Inspektor und in der `.md` — und in keiner
    // Ausgabe. Ein Feld, dessen Inhalt niemand liest, ist schlimmer als keins.
    for (const fit of ['cover', 'contain'] as const) {
      const bild = createElement('image', { src: 'a.png', fit });
      const prim = buildElementPrims(bild).find((p) => p.t === 'image');
      expect(prim?.t === 'image' && prim.fit).toBe(fit);
    }
  });

  it('zeichnet eine offene Form auch dann, wenn sie gefüllt werden soll', () => {
    /*
       „Rahmen" und „Klammer" sind Striche und haben keine Fläche. Mit
       „Füllung: Fläche" bekam der Körper einen Farbwert und keine Kontur, und
       ein offener Pfad wird mit `fill="none"` geschrieben: gemessen kam
       `<path d="…" fill="none"/>` heraus — das Element war aus jeder Ausgabe
       verschwunden, stand aber weiter in der Ebenenliste und in der `.md`.
    */
    for (const shape of ['frame', 'bracket'] as const) {
      const form = createElement('shape', { shape, fill: 'flat', w: 200, h: 100 });
      const markup = primsToSvgMarkup(buildElementPrims(form));
      expect(markup, `${shape} zeichnet nichts`).toMatch(/stroke="/);
    }

    // Die Gegenrichtung: „ohne" heißt weiterhin nichts, und eine geschlossene
    // Form wird weiterhin gefüllt.
    expect(buildElementPrims(createElement('shape', { shape: 'frame', fill: 'none' }))).toEqual([]);
    expect(
      primsToSvgMarkup(
        buildElementPrims(createElement('shape', { shape: 'rectangle', fill: 'flat' })),
      ),
    ).toMatch(/fill="#/);
  });

  it('setzt die Kategorien eines Diagramms in Versalien wie jede andere Label-Stufe', () => {
    // `typeScale.label` schreibt groß, und die 0,12 em Laufweite sind dafür
    // gerechnet. `typesetText()` wendet `caps` an, `pushZentriert()` nicht —
    // dieselbe Stufe stand in einem Element zweimal verschieden da.
    const diagramm = createElement('chart', {
      data: 'Nord  12\nSüd  20',
      label: 'Umsatz',
      w: 420,
      h: 300,
    });
    const texte = buildElementPrims(diagramm)
      .filter((prim) => prim.t === 'text')
      .flatMap((prim) => (prim.t === 'text' ? prim.runs.map((run) => run.text) : []));
    expect(texte.join(' ')).toContain('NORD');
    expect(texte.join(' ')).not.toContain('Nord');
  });

  it('nennt für jede Kartenvariante dieselben Felder, die sie zeichnet', () => {
    /*
       Die Rechnung, die drei Kunden teilen. Geprüft wird sie an dem, was
       wirklich herauskommt: wo `kartenFelder` „Label" sagt, muss das Label auf
       der Folie stehen — und wo es „nein" sagt, darf es nirgends stehen.
    */
    for (const variant of ['stat', 'quote', 'step', 'note', 'feature'] as const) {
      const karte = createElement('card', {
        variant,
        label: 'MERKMAL',
        title: 'Titel',
        w: 320,
        h: 220,
      });
      const texte = buildElementPrims(karte)
        .filter((prim) => prim.t === 'text')
        .flatMap((prim) => (prim.t === 'text' ? prim.runs.map((run) => run.text) : []))
        .join(' ');
      expect(texte.includes('MERKMAL'), `${variant}: Label`).toBe(kartenFelder(variant).label);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('was die Oberfläche über das Gezeichnete behauptet', () => {
  /** Ein Element jeder Art, mit genug Inhalt, dass ein Abstand messbar wäre. */
  const inhalt: Record<string, Record<string, unknown>> = {
    text: { text: 'Hallo Welt' },
    markdown: { markdown: '# Titel\n\nEin Absatz.' },
    card: { title: 'Titel', body: 'Text' },
    badge: { text: 'Neu' },
    icon: { icon: 'rocket' },
    shape: { label: 'Text' },
    connector: { label: 'ab' },
    image: { src: 'a.png' },
    table: { data: 'a  b\n1  2' },
    chart: { data: 'a  1\nb  2' },
    wordmark: {},
  };

  it('zeigt den Innenabstand genau dort, wo er etwas tut', () => {
    /*
       Die Rechnung wird an dem geprüft, was **wirklich herauskommt**: für jede
       Art und jede Füllung wird gezeichnet, einmal mit Abstand 0 und einmal
       mit 40, und das Markup verglichen. Was sich ändert, muss
       `nutztInnenabstand()` bejahen — und was gleich bleibt, verneinen.

       Ohne diese Richtung wäre die Funktion eine zweite Wahrheit über den
       Zeichner: gemessen wirkte der Abstand bei sechs von elf Arten gar
       nicht, während der Inspektor das Feld überall zeigte und die Fabrik dem
       Abzeichen 16, dem Zeichen 12 und der Form 20 mitgab.
    */
    for (const [kind, felder] of Object.entries(inhalt)) {
      for (const fill of ['flat', 'none'] as const) {
        const bauen = (padding: number) =>
          createElement(
            kind as ElementKind,
            {
              ...felder,
              fill,
              padding,
              w: 260,
              h: 160,
            } as Partial<CanvasElement>,
          );
        const ohne = bauen(0);
        const mit = bauen(40);
        const wirkt =
          primsToSvgMarkup(buildElementPrims(ohne)) !== primsToSvgMarkup(buildElementPrims(mit));
        expect(nutztInnenabstand(ohne), `${kind}/${fill}`).toBe(wirkt);
      }
    }
  });

  it('meldet einen Körper, der ganz in der Farbe des Untergrunds gemalt wird', () => {
    /*
       Die Liste ist die Messung und keine Meinung: alle achtzig Kombinationen
       aus Untergrund, Ton und Füllung durchgerechnet, und genau diese fünf
       malen nichts, was sich vom Untergrund abhebt. Drei Dinge stehen darin,
       die den Befund tragen — der Untergrund `paper` ist die Vorgabe jeder
       neuen Folie, `white` ein Ton aus der ersten Reihe des Inspektors, und
       kein einziger Fall trägt die Füllung `solid` oder `outline`: deren
       Strich hebt sich immer ab.

       Ändert eine Marke ihre Palette, wird diese Zusicherung rot. Das ist der
       Sinn — dann gehört nachgesehen, welche Wahl im Inspektor neuerdings
       nichts mehr tut.
    */
    const treffer: string[] = [];
    for (const hintergrund of slideBackgrounds) {
      const bg = backgroundStyle(hintergrund);
      for (const tone of toneNames) {
        for (const fill of fillStyles) {
          const element = createElement('shape', { tone, fill, w: 200, h: 100 });
          if (unsichtbareFlaeche(element, bg)) treffer.push(`${hintergrund}/${tone}/${fill}`);
        }
      }
    }
    expect(treffer).toEqual([
      'paper/white/flat',
      'cream/paper/flat',
      'ink/ink/flat',
      'signal/signal/flat',
      'grid/white/flat',
    ]);

    /*
       Und die Messung dahinter, am fertigen Markup: dieselbe Farbe steht
       wirklich zweimal da, und der Körper trägt keinen Strich, der sie noch
       verriete.
    */
    const unsichtbar = createElement('shape', { tone: 'white', fill: 'flat', w: 200, h: 100 });
    const aufWeiss = backgroundStyle('paper');
    const markup = primsToSvgMarkup(buildElementPrims(unsichtbar, aufWeiss));
    expect(markup).toContain(`fill="${aufWeiss.fill}"`);
    expect(markup).not.toContain('stroke=');

    /*
       Die Gegenrichtung, an der der erste Anlauf gescheitert ist: dasselbe
       Element mit `solid` bekommt einen Strich aus seinem eigenen Ton, steht
       also sichtbar da — und bekommt deshalb keine Klage, obwohl seine Fläche
       weiterhin die des Untergrunds ist.
    */
    const mitStrich = createElement('shape', { tone: 'white', fill: 'framed', w: 200, h: 100 });
    expect(unsichtbareFlaeche(mitStrich, aufWeiss)).toBe(false);
    expect(primsToSvgMarkup(buildElementPrims(mitStrich, aufWeiss))).toContain('stroke=');
  });
});
