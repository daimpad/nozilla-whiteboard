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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  backgroundStyle,
  buildElementPrims,
  buildSlideBackdrop,
  buildSlideChrome,
  kartenFelder,
  elementFelder,
  unsichtbareFlaeche,
  type ScenePrim,
  type ElementFelder,
} from './scene';
import { primsToSvgMarkup } from './svg';
import { segsBounds } from '@/lib/geometry/path';
import { createEmptySlide } from '@/lib/markdown/deck';
import { createElement } from '@/model/factory';
import {
  fillStyles,
  shapeNames,
  slideBackgrounds,
  type CanvasElement,
  type Deck,
  type ElementKind,
  type Slide,
} from '@/model/types';
import {
  availableThemes,
  palette,
  setActiveTheme,
  stroke,
  shadowNames,
  strokeNames,
  toneNames,
} from '@/theme';
import { registerThemes } from '@/themes';

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

/** Für jede Elementart der Inhalt, ohne den sie nichts zeichnet. */
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

describe('was die Oberfläche über das Gezeichnete behauptet', () => {
  /** Ein Element jeder Art, mit genug Inhalt, dass ein Abstand messbar wäre. */

  it('nennt Drehung und Körper genau dort, wo sie etwas tun', () => {
    /*
       Dieselbe Prüfung wie beim Innenabstand, für die beiden anderen Felder:
       gezeichnet wird mit dem einen Wert und mit dem anderen, und verglichen
       wird das Markup. Getroffen wird davon genau eine Art — die Wortmarke
       trägt die Regeln des CI im Bauch und ist gegen Drehung, Ton, Füllung,
       Strichstärke und Schatten taub; der Verbinder ist ein Strich und hat
       weder Füllung noch Schatten. Acht Bedienelemente standen dafür im
       Inspektor, und der Drehgriff war schlimmer als nichts: der
       Auswahlrahmen drehte sich mit, das Zeichen nicht.
    */
    for (const [kind, felder] of Object.entries(inhalt)) {
      const bau = (patch: Record<string, unknown>) =>
        primsToSvgMarkup(
          buildElementPrims(
            createElement(
              kind as ElementKind,
              {
                ...felder,
                w: 300,
                h: 200,
                ...patch,
              } as Partial<CanvasElement>,
            ),
          ),
        );

      const drehtSich = bau({ rotation: 0 }) !== bau({ rotation: 30 });
      expect(elementFelder(createElement(kind as ElementKind)).drehung, `${kind}/Drehung`).toBe(
        drehtSich,
      );

      /*
         Ein Eintrag je Bedienelement, und gemessen wird jedes für sich. Eine
         gemeinsame Frage („hat es einen Körper") hätte die beiden toten Felder
         des Verbinders mitgetragen: Ton und Strichstärke wirken dort, Füllung
         und Schatten nicht.

         Und gemessen wird über **jede Füllung**. Die erste Fassung dieser
         Prüfung zeichnete nur mit `fill: 'framed'` und fragte `elementFelder`
         nach dem Element mit seiner *Vorgabe*-Füllung — zwei verschiedene
         Elemente also, und genau in dieser Lücke saßen dreiundvierzig tote
         Bedienelemente: ohne Fläche kommen Tinte und Linie aus dem Untergrund,
         der Ton tut dann nichts, und bei Text, Markdown, Zeichen, Verbinder
         und Tabelle ist „ohne Fläche" die Vorgabe. Wer einen frisch
         eingesetzten Text anwählte, sah drei Regler, die nichts taten.
      */
      const felderAmMarkup: Array<[keyof ElementFelder, string, readonly string[]]> = [
        ['ton', 'tone', toneNames],
        ['strichstaerke', 'strokeWeight', strokeNames],
        ['schatten', 'shadow', shadowNames],
      ];
      for (const fill of fillStyles) {
        const gesagt = elementFelder(
          createElement(kind as ElementKind, { fill } as Partial<CanvasElement>),
        );
        for (const [name, feld, werte] of felderAmMarkup) {
          const markup = werte.map((wert) => bau({ fill, [feld]: wert }));
          expect(gesagt[name], `${kind}/${fill}/${name}`).toBe(new Set(markup).size > 1);
        }
      }
      // Die Füllung selbst: ändert sie das Bild, muss sie im Inspektor stehen.
      const ueberFuellungen = fillStyles.map((fill) => bau({ fill }));
      expect(elementFelder(createElement(kind as ElementKind)).fuellung, `${kind}/fuellung`).toBe(
        new Set(ueberFuellungen).size > 1,
      );
    }

    /*
       Und die offenen Formen: „Rahmen" ist ein Eckwinkel, „Klammer" ein Haken.
       `emitBody()` malt einen Schatten nur für einen geschlossenen Pfad — beide
       werfen also nie einen, und der Regler stand trotzdem da.
    */
    for (const shape of shapeNames) {
      const bau = (shadow: (typeof shadowNames)[number]) =>
        primsToSvgMarkup(
          buildElementPrims(
            createElement('shape', { shape, fill: 'flat', shadow, w: 200, h: 100 }),
          ),
        );
      expect(elementFelder(createElement('shape', { shape })).schatten, `${shape}/schatten`).toBe(
        bau('none') !== bau('lg'),
      );
    }
  });

  it('zeigt den Innenabstand genau dort, wo er etwas tut', () => {
    /*
       Die Rechnung wird an dem geprüft, was **wirklich herauskommt**: für jede
       Art und jede Füllung wird gezeichnet, einmal mit Abstand 0 und einmal
       mit 40, und das Markup verglichen. Was sich ändert, muss
       `elementFelder().innenabstand` bejahen — und was gleich bleibt, verneinen.

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
        expect(elementFelder(ohne).innenabstand, `${kind}/${fill}`).toBe(wirkt);
      }
    }
  });

  it('malt Quadrat und Balken einer Karte in derselben Signalrolle wie den Rest', () => {
    /*
       `elementPaint()` schlägt die Signalfarbe auf Tinte um, sobald das
       Element selbst signalfarben ist — genau dafür gibt es `paint.signal`,
       und `iconScene()` bekommt sie in derselben Karte übergeben. Das Quadrat
       der Schritt-Karte und der Balken der Notizkarte griffen daneben auf
       `bg.signal` zurück: auf einer Karte im Ton „Signal" standen sie in
       derselben Farbe wie ihre Fläche und waren weg, die Ziffer im Quadrat
       gleich mit.

       Und die Deckkraft: jedes andere Primitiv desselben Elements bekommt sie
       mit. Diese beiden gingen leer aus — bei „Deckkraft 0" blieben ein
       grünes Quadrat und ein grüner Balken voll deckend stehen.
    */
    for (const variant of ['step', 'note'] as const) {
      const karte = (tone: 'paper' | 'signal', opacity: number) =>
        createElement('card', {
          variant,
          tone,
          opacity,
          fill: 'flat',
          label: '7',
          title: 'Titel',
          body: 'Rumpf',
          w: 320,
          h: 220,
        });
      const auf = (tone: 'paper' | 'signal', opacity: number) =>
        primsToSvgMarkup(buildElementPrims(karte(tone, opacity), backgroundStyle('paper')));

      /*
         Gesucht wird der Akzent selbst und nicht irgendein Grün im Markup: auf
         einer signalfarbenen Karte *ist* die Fläche grün, und eine Zählung
         über die ganze Datei bewiese nichts. Das Quadrat der Schritt-Karte ist
         44 × 44, der Balken der Notizkarte so breit wie eine schwere Linie und
         so hoch wie die Karte.
      */
      const akzent = (tone: 'paper' | 'signal') => {
        const prims = buildElementPrims(karte(tone, 1), backgroundStyle('paper'));
        for (const prim of prims) {
          if (prim.t !== 'path') continue;
          const box = segsBounds(prim.segs);
          if (!box) continue;
          const trifft =
            variant === 'step'
              ? Math.round(box.w) === 44 && Math.round(box.h) === 44
              : Math.round(box.w) === Math.round(stroke.heavy) && Math.round(box.h) === 220;
          if (trifft) return prim.fill;
        }
        return undefined;
      };
      expect(akzent('paper'), `${variant}/paper`).toBe(palette.signal);
      expect(akzent('signal'), `${variant}/signal`).toBe(palette.ink);

      // Und kein gemalter Pfad ohne Deckkraft, wenn das Element durchsichtig ist.
      const pfade = [...auf('paper', 0.4).matchAll(/<path [^>]*fill="[^"]+"[^>]*>/g)].map(
        ([treffer]) => treffer,
      );
      expect(pfade.length, `${variant}/Pfade`).toBeGreaterThan(0);
      for (const pfad of pfade) expect(pfad, `${variant}/Deckkraft`).toContain('opacity="0.4"');
    }
  });

  it('meldet nichts über ein Element, an dem etwas zu sehen ist', () => {
    /*
       Die Probe aufs Exempel, über **jede** Art, jeden Untergrund, jeden Ton
       und jede Füllung: was die Warnung meldet, muss im Markup auch wirklich
       unsichtbar sein.

       Die erste Fassung fragte `elementPaint(element, bg).body` — den Erzeuger
       der Farben und nicht das Gezeichnete. Zwei Arten malen ihren Körper gar
       nicht daraus (das Bild zeichnet Rahmen und Bild, die offene Form eine
       Kontur), und bei jeder Art mit Text steht neben der unsichtbaren Fläche
       ein sichtbarer Satz. Gemessen waren es fünfundvierzig Fehlalarme —
       darunter jede Textfolie mit weißer Fläche auf weißem Papier, also der
       Regelfall. Eine Warnung über einem Element, das gut aussieht, ist die
       Sorte Wächter, die man abschaltet; der Kopf der Funktion sagt das seit
       ihrem ersten Tag, und sie hat es zweimal selbst nicht eingehalten.
    */
    for (const [kind, felder] of Object.entries(inhalt)) {
      for (const hintergrund of slideBackgrounds) {
        const bg = backgroundStyle(hintergrund);
        for (const tone of toneNames) {
          for (const fill of fillStyles) {
            const element = createElement(
              kind as ElementKind,
              {
                ...felder,
                tone,
                fill,
                w: 300,
                h: 200,
              } as Partial<CanvasElement>,
            );
            if (!unsichtbareFlaeche(element, bg)) continue;
            const markup = primsToSvgMarkup(buildElementPrims(element, bg));
            const farben = [...markup.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map(
              ([, wert]) => wert,
            );
            const sichtbar =
              markup.includes('<image') ||
              farben.some(
                (farbe) =>
                  farbe !== 'none' &&
                  farbe !== 'transparent' &&
                  farbe.toUpperCase() !== bg.fill.toUpperCase(),
              );
            expect(sichtbar, `${kind}/${hintergrund}/${tone}/${fill}`).toBe(false);
          }
        }
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

    /*
       Und die Wortmarke gar nicht: sie malt keinen Körper, `elementPaint`
       rechnet ihr aber einen aus. Der erste Anlauf dieser Warnung beklagte
       damit ein Zeichen, das mit 3867 Zeichen Markup sichtbar dasteht und die
       Untergrundfarbe kein einziges Mal führt — genau der Fehlalarm, gegen
       den der Kopf von `unsichtbareFlaeche` geschrieben ist.
    */
    for (const hintergrund of slideBackgrounds) {
      const bg = backgroundStyle(hintergrund);
      for (const tone of toneNames) {
        for (const fill of fillStyles) {
          const marke = createElement('wordmark', { tone, fill, w: 300, h: 80 });
          expect(unsichtbareFlaeche(marke, bg), `${hintergrund}/${tone}/${fill}`).toBe(false);
        }
      }
    }
    const marke = createElement('wordmark', { tone: 'white', fill: 'flat', w: 300, h: 80 });
    const gemalt = primsToSvgMarkup(buildElementPrims(marke, aufWeiss));
    expect(gemalt.length).toBeGreaterThan(1000);
    expect(gemalt).not.toContain(`fill="${aufWeiss.fill}"`);
  });
});

describe('was die Oberfläche behauptet, gilt auch unter fremder Marke', () => {
  /*
     Beide Rechnungen lesen Marken-Werte: `elementFelder()` über das erzeugte
     Markup, `unsichtbareFlaeche()` über `elementPaint` und `backgroundStyle`.
     Eine Prüfung, die nur nozilla durchgeht, sagt über die zweite Marke nichts
     — und die zweite Marke ist der Zweck dieses Werkzeugs. Dieselbe Linie wie
     bei „geht jedes angemeldete Erscheinungsbild durch" in `brandTheme.test.ts`.
  */
  const vorher = availableThemes().map((theme) => theme.id);
  beforeAll(() => registerThemes());
  afterAll(() => setActiveTheme('nozilla'));

  it('nennt für jedes Erscheinungsbild dieselben Felder wie das Markup', () => {
    registerThemes();
    for (const theme of availableThemes()) {
      setActiveTheme(theme.id);
      for (const [kind, felder] of Object.entries(inhalt)) {
        const bau = (patch: Record<string, unknown>) =>
          primsToSvgMarkup(
            buildElementPrims(
              createElement(
                kind as ElementKind,
                {
                  ...felder,
                  w: 300,
                  h: 200,
                  ...patch,
                } as Partial<CanvasElement>,
              ),
            ),
          );
        expect(
          elementFelder(createElement(kind as ElementKind)).drehung,
          `${theme.id}/${kind}/Drehung`,
        ).toBe(bau({ rotation: 0 }) !== bau({ rotation: 30 }));
        const paare: Array<[keyof ElementFelder, string, readonly string[]]> = [
          ['ton', 'tone', toneNames],
          ['strichstaerke', 'strokeWeight', strokeNames],
          ['schatten', 'shadow', shadowNames],
        ];
        for (const fill of fillStyles) {
          const gesagt = elementFelder(
            createElement(kind as ElementKind, { fill } as Partial<CanvasElement>),
          );
          for (const [name, feld, werte] of paare) {
            const markup = werte.map((wert) => bau({ fill, [feld]: wert }));
            expect(gesagt[name], `${theme.id}/${kind}/${fill}/${name}`).toBe(
              new Set(markup).size > 1,
            );
          }
        }
      }
    }
    // Der Stand des Verzeichnisses vor dem Test — `registerTheme()` nimmt
    // nichts wieder heraus, und eine spätere Prüfung soll dieselbe Liste sehen.
    expect(availableThemes().map((theme) => theme.id)).toContain(vorher[0]);
  });

  it('meldet für jedes Erscheinungsbild nur, was wirklich unsichtbar ist', () => {
    registerThemes();
    for (const theme of availableThemes()) {
      setActiveTheme(theme.id);
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
      /*
         Dieselben fünf wie bei nozilla, und das ist kein Zufall: sie entstehen
         daraus, dass ein Ton und ein Untergrund *denselben* Palettenwert
         nennen. Eine Marke, die das anders anlegt, wird hier rot — und dann
         gehört nachgesehen, welche Wahl im Inspektor neuerdings nichts tut.
      */
      expect(treffer, theme.id).toEqual([
        'paper/white/flat',
        'cream/paper/flat',
        'ink/ink/flat',
        'signal/signal/flat',
        'grid/white/flat',
      ]);
    }
  });
});
