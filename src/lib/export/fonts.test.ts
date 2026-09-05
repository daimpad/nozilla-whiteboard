/**
 * Die Schriftwege des Exports.
 *
 * Der Umriss-Weg wird hier mit echten Schriftdateien gefahren — `fetch` zieht
 * unter jsdom aus `public/fonts/`. Das ist der Punkt: die Zusicherung „im
 * Export steht die richtige Schrift" lässt sich nicht gegen eine Attrappe
 * prüfen.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { font } from '@/lib/text/measure';
import { bundledDecks } from '@/decks';
import { availableThemes, isThemeId, setActiveTheme } from '@/theme';
import { registerThemes } from '@/themes';
import { segsBounds } from '@/lib/geometry/path';
import { buildSlideScene, type Scene, type ScenePrim } from './scene';
import { outlineScene, outlineScenes } from './outline';
import { facesFor, resolveFace } from './fontFiles';
import {
  beiAusfallImExport,
  ersatzkette,
  glyphCoverFor,
  splitByFace,
  type Ausfall,
} from './glyphCover';
import { ausfallText } from '@/App';
import { primsToSvgMarkup, sceneToSvg } from './svg';

/** `fetch` auf das Dateisystem legen — dieselben Dateien, die ausgeliefert werden. */
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const file = url.slice(url.lastIndexOf('/') + 1);
    const bytes = readFileSync(join(process.cwd(), 'public', 'fonts', file));
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  }) as unknown as typeof fetch;
});

describe('Schnitt-Auflösung', () => {
  it('nimmt den nächstgelegenen vorhandenen Schnitt', () => {
    // Zilla Slab fängt bei 500 an — 400 muss dorthin fallen, nicht ins Leere.
    expect(resolveFace({ family: 'display', weight: 400 })?.weight).toBe(500);
    expect(resolveFace({ family: 'display', weight: 700 })?.weight).toBe(700);
    // Space Mono kennt nur 400 und 700.
    expect(resolveFace({ family: 'mono', weight: 500 })?.weight).toBe(400);
    expect(resolveFace({ family: 'mono', weight: 600 })?.weight).toBe(700);
    expect(resolveFace({ family: 'body', weight: 600 })?.weight).toBe(600);
  });

  it('fasst mehrfach angefragte Schnitte zu einem zusammen', () => {
    const faces = facesFor([
      font({ size: 17, family: 'body', weight: 400 }),
      font({ size: 12, family: 'body', weight: 400 }),
      font({ size: 56, family: 'display', weight: 700 }),
    ]);
    expect(faces).toHaveLength(2);
    expect(faces.map((face) => face.id).sort()).toEqual(['Inter-Regular', 'ZillaSlab-Bold']);
  });
});

describe('Text in Pfade', () => {
  const deck = parseDeck(['# Übergrößen', '', 'Ein Satz mit ==Marker== und Ähnlichem.'].join('\n'));

  it('lässt keinen Text stehen', async () => {
    const scene = buildSlideScene(deck.slides[0], deck);
    expect(scene.prims.some((prim) => prim.t === 'text')).toBe(true);

    const outlined = await outlineScene(scene);
    expect(outlined.prims.some((prim) => prim.t === 'text')).toBe(false);
    expect(primsToSvgMarkup(outlined.prims)).not.toContain('<text');
  });

  it('nennt danach keine Schrift mehr — auch nicht im Dateikopf', async () => {
    const outlined = await outlineScene(buildSlideScene(deck.slides[0], deck));
    const svg = sceneToSvg(outlined);
    expect(svg).not.toContain('font-family');
    expect(svg).not.toContain('@font-face');
  });

  it('erzeugt Konturen an der Stelle, an der der Text stand', async () => {
    const scene = buildSlideScene(deck.slides[0], deck);
    const before = scene.prims.filter((prim) => prim.t === 'text');
    const outlined = await outlineScene(scene);
    const paths = outlined.prims.filter((prim) => prim.t === 'path');

    expect(paths.length).toBeGreaterThanOrEqual(before.length);
    // Jede Kontur ist geschlossen und gefüllt — gestrichen wäre die Schrift
    // fetter als gesetzt.
    for (const path of paths) {
      if (path.t !== 'path') continue;
      expect(path.closed).toBe(true);
    }
  });

  it('behält die Farbe des Laufs', async () => {
    const inverse = parseDeck(['<!-- nzl', 'background: ink', '-->', '', '# Invers'].join('\n'));
    const outlined = await outlineScene(buildSlideScene(inverse.slides[0], inverse));
    const fills = new Set(
      outlined.prims.flatMap((prim) => (prim.t === 'path' && prim.fill ? [prim.fill] : [])),
    );
    // Auf Tinte wird in Papier geschrieben; irgendeine Kontur muss hell sein.
    expect(fills.size).toBeGreaterThan(0);
  });

  it('lässt einen Lauf als Text stehen, wenn seine Schrift fehlt', async () => {
    // Frische Module, damit der Lade-Puffer leer ist — sonst antwortet er mit
    // den Schriften aus den Tests davor und der Ausfall käme nie an.
    vi.resetModules();
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    try {
      const fresh = await import('./outline');
      const scene = buildSlideScene(deck.slides[0], deck);
      const outlined = await fresh.outlineScene(scene);
      // Kein Loch in der Folie: der Text bleibt, wie er war.
      expect(outlined.prims.filter((prim) => prim.t === 'text').length).toBe(
        scene.prims.filter((prim) => prim.t === 'text').length,
      );
    } finally {
      globalThis.fetch = original;
      vi.resetModules();
    }
  });
});

/* -------------------------------------------------------------------------- */

/**
 * Zeichen, die die gesetzte Schrift nicht führt.
 *
 * Der Fehler, gegen den das hier steht, war im Bild sofort zu sehen und in
 * keinem Test: die Tastentabelle des Willkommens-Decks setzt ihre Kürzel in
 * Backticks, also in `codeInline`, also in Space Mono — und Space Mono führt
 * `⌘`, `⌫`, `⇧` und `⌥` nicht. Auf der Fläche sprang der Browser auf eine
 * Systemschrift und es sah richtig aus. Im PNG stand „D" statt „⌘D", die Zeile
 * „Löschen" hatte gar keinen Wert mehr, und im PDF stand „#".
 */
describe('Zeichen, die die gesetzte Schrift nicht führt', () => {
  const BEFEHL = 0x2318; // ⌘
  const LOESCHEN = 0x232b; // ⌫
  const mono = { family: 'mono' as const, weight: 400 };

  const szene = (markdown: string): Scene => {
    const deck = parseDeck(markdown);
    return buildSlideScene(deck.slides[0], deck);
  };

  const segmente = (scene: Scene) =>
    scene.prims.reduce((summe, prim) => summe + (prim.t === 'path' ? prim.segs.length : 0), 0);

  it('holt sie aus einem anderen Schnitt', async () => {
    const cover = await glyphCoverFor([szene('Kürzel: `⌘D` und `⌫`.')]);
    for (const codePoint of [BEFEHL, LOESCHEN]) {
      const face = cover.faceFor(mono, codePoint);
      expect(face, String.fromCodePoint(codePoint)).toBeTruthy();
      // Es ist ausdrücklich *nicht* der gewünschte Schnitt — sonst wäre nichts
      // ersetzt worden und die Prüfung sagte nichts.
      expect(face!.id).not.toBe(resolveFace(mono)!.id);
      expect(cover.outlines(face!)!.glyph(codePoint)).not.toBeNull();
    }
  });

  it('lässt den gewöhnlichen Fall in Ruhe', async () => {
    const cover = await glyphCoverFor([szene('Ein Wort in `Code`.')]);
    expect(cover.faceFor(mono, 'D'.codePointAt(0)!)!.id).toBe(resolveFace(mono)!.id);
    expect(cover.uncovered).toEqual([]);
  });

  it('zeichnet sie danach wirklich', async () => {
    // Gegen das Ergebnis, nicht gegen die Zusicherung: dieselbe Folie einmal
    // mit und einmal ohne das Zeichen. Vorher waren beide gleich viele
    // Segmente — das ⌘ fiel heraus, ohne eine Spur zu hinterlassen.
    const mit = segmente(await outlineScene(szene('Kürzel: `⌘D`.')));
    const ohne = segmente(await outlineScene(szene('Kürzel: `D`.')));
    expect(mit).toBeGreaterThan(ohne);
  });

  it('setzt das Ersatzzeichen im Maß seines eigenen Schnitts', async () => {
    /*
       Inter zählt 2048 Einheiten aufs Geviert, Space Mono 1000.

       Der Umriss-Weg holte den Maßstab früher einmal je Lauf, aus dem Schnitt
       des Laufs. Ein aus Inter geholtes ⌘, mit Space Monos 1000 skaliert,
       wäre gut doppelt so groß und stünde quer über seinen Nachbarn — und
       die Segmentzahl bliebe dieselbe, keine der übrigen Prüfungen sagte ein
       Wort.
    */
    const spec = font({ size: 40, family: 'mono', weight: 400 });
    const scene: Scene = {
      width: 1280,
      height: 720,
      background: '#FFFEE5',
      title: 'Nur ein Zeichen',
      prims: [
        {
          t: 'text',
          x: 100,
          y: 100,
          runs: [{ dx: 0, text: '⌘', font: spec, color: '#000000', width: 40 }],
        },
      ],
    };

    const outlined = await outlineScene(scene);
    const pfad = outlined.prims.find((prim) => prim.t === 'path');
    expect(pfad?.t).toBe('path');
    const box = segsBounds((pfad as Extract<ScenePrim, { t: 'path' }>).segs);
    // Ein Zeichen ist kleiner als sein Geviert; mit falschem Maßstab wäre es
    // gut das Doppelte.
    expect(box.h).toBeGreaterThan(spec.size * 0.3);
    expect(box.h).toBeLessThan(spec.size);
    expect(box.w).toBeLessThan(spec.size);
  });

  it('nennt ein Zeichen, das keine der Schriften führt', async () => {
    /*
       Ein Emoji: keine der drei Marken-Schriften führt es.

       Die erste Fassung dieser Prüfung nahm den Codepoint der privaten Ebene
       (U+F8FF) — und schlug fehl, weil Zilla Slab dort etwas stehen hat. Die
       Deckung hatte also recht und die Prüfung unrecht; deshalb nimmt sie
       jetzt ein Zeichen, dessen Fehlen nachgewiesen ist.
    */
    const cover = await glyphCoverFor([szene('Zeichen: \u{1F600}')]);
    expect(cover.uncovered).toContain('\u{1F600}');

    /*
       Und das ist kein Abbruch: der Rest der Folie steht weiterhin.

       Die erste Fassung fragte hier nach *irgendeinem* Pfad — und das ist
       immer wahr, weil die Wortmarke der Fußzeile schon vor dem Umriss-Weg
       einer ist. Sie hätte auch dann gehalten, wenn `outlineScene` die Szene
       unverändert zurückgäbe. Gefragt wird deshalb, ob wirklich gesetzt
       wurde: kein Text bleibt stehen, und der Satz trägt genauso viele
       Segmente wie ohne das Emoji — das eine Zeichen fällt aus, sonst nichts.
    */
    const mit = await outlineScene(szene('Ein Satz \u{1F600} mit Emoji.'));
    const ohne = await outlineScene(szene('Ein Satz mit Emoji.'));
    expect(mit.prims.some((prim) => prim.t === 'text')).toBe(false);
    expect(segmente(mit)).toBe(segmente(ohne));
    expect(segmente(mit)).toBeGreaterThan(0);
  });

  it('sagt es, wenn ein Zeichen herausfällt', async () => {
    /*
       Hier stand ein `console.warn`, und das ist dieselbe Stille wie beim
       leeren `catch` der Selbstsicherung und beim fehlenden Bild: die Politik
       stimmt — ein fehlendes Zeichen darf einen Export nicht abbrechen —, das
       Schweigen nicht. Ein `😀` fällt aus PNG und PDF heraus, und wer die
       Datei nicht selbst ansieht, merkt es beim Vortrag.
    */
    const gemeldet: Ausfall[] = [];
    beiAusfallImExport((ausfall) => gemeldet.push(ausfall));
    try {
      await glyphCoverFor([szene('Zeichen: \u{1F600}')]);
    } finally {
      beiAusfallImExport(null);
    }
    expect(gemeldet).toHaveLength(1);
    expect(gemeldet[0].zeichen).toContain('\u{1F600}');
    expect(ausfallText(gemeldet[0])).toContain('\u{1F600}');

    // Die Gegenrichtung: ein gewöhnlicher Satz meldet nichts. Ein Melder, der
    // immer anschlägt, wird abgeschaltet und bewacht dann gar nichts mehr.
    const still: Ausfall[] = [];
    beiAusfallImExport((ausfall) => still.push(ausfall));
    try {
      await glyphCoverFor([szene('Ein gewöhnlicher Satz.')]);
    } finally {
      beiAusfallImExport(null);
    }
    expect(still).toEqual([]);
  });

  it('sagt es auch, wenn die Datei eines Schnitts nicht ankommt', async () => {
    /*
       Der zweite Fall stand überhaupt nirgends. Kommt die `.ttf` eines
       Schnitts nicht an — der wahrscheinlichste Grund ist ein eigenes
       Erscheinungsbild, das nur die `.woff2` mitliefert —, bleibt sein Text
       unkonvertiert: im PNG malt ihn die Vorgabeschrift des Betrachters, denn
       ein über eine Blob-URL geladenes SVG sieht die Schriften der Seite
       nicht. Das sieht aus wie ein Fehler des Werkzeugs und ist eine fehlende
       Datei.

       Die Module werden dafür frisch geladen: `fontFiles.ts` merkt sich
       gelesene Bytes, und ein Schnitt, den eine frühere Prüfung schon geholt
       hat, käme aus dem Puffer statt aus dem 404.
    */
    vi.resetModules();
    const echt = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(
        typeof input === 'string' ? input : input instanceof URL ? input.href : '',
      );
      const datei = url.split('/').pop() ?? '';
      if (datei.startsWith('ZillaSlab')) return new Response('weg', { status: 404 });
      return echt(input as RequestInfo);
    }) as typeof fetch;

    const frisch = await import('./glyphCover');
    const gemeldet: Array<{ schnitte: readonly string[] }> = [];
    frisch.beiAusfallImExport((ausfall) => gemeldet.push(ausfall));
    try {
      await frisch.glyphCoverFor([szene('# Eine Überschrift in Zilla Slab')]);
    } finally {
      frisch.beiAusfallImExport(null);
      globalThis.fetch = echt;
      vi.resetModules();
    }
    expect(gemeldet).toHaveLength(1);
    expect(gemeldet[0].schnitte.some((id) => id.startsWith('ZillaSlab'))).toBe(true);
    expect(ausfallText({ zeichen: [], schnitte: ['ZillaSlab-Bold'] })).toContain('ZillaSlab-Bold');
  });

  it('zieht den Strich dorthin, wo ihn das SVG zieht', async () => {
    /*
       Unter- und Durchstreichung sind keine Glyphen; jede Ausgabe zieht sie
       selbst — und jede zog sie anders: `svg.ts` nahm `max(0.8, size · 0.058)`
       bei `size · 0.13`, der Umriss-Weg `max(1, size · 0.055)` bei
       `size · 0.14`. Gemessen an einem Lauf in 16 Einheiten: das SVG setzt den
       Strich auf y = 90,64 mit 0,928 Dicke, der Umriss auf y = 90,80 mit 1,00
       — und der Umriss ist das, was im PNG steht. Bei kleiner Schrift wächst
       der Unterschied auf ein Viertel, weil die Untergrenzen verschieden sind.

       Geprüft wird an beiden Ergebnissen und nicht an der Formel: das SVG-Rect
       gegen die Hülle des Umriss-Pfades.
    */
    for (const size of [16, 12, 34]) {
      for (const art of ['underline', 'strike'] as const) {
        const lauf = {
          dx: 0,
          text: 'Wort',
          font: font({ size }),
          color: '#000000',
          width: 40,
          [art]: true,
        };
        const prim = { t: 'text' as const, x: 100, y: 200, runs: [lauf] };

        const markup = primsToSvgMarkup([prim]);
        const rect = markup.match(
          /<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/,
        );
        expect(rect, `${art} @${size}: kein rect im SVG`).not.toBeNull();

        const [um] = await outlineScenes([{ ...szene('x'), prims: [prim] }]);
        const strich = um.prims.find(
          (p): p is Extract<ScenePrim, { t: 'path' }> => p.t === 'path' && p.segs.length === 5,
        );
        expect(strich, `${art} @${size}: kein Strich im Umriss`).toBeDefined();
        const box = segsBounds(strich!.segs);

        expect(box.x, `${art} @${size}: x`).toBeCloseTo(Number(rect![1]), 6);
        expect(box.y, `${art} @${size}: y`).toBeCloseTo(Number(rect![2]), 6);
        expect(box.w, `${art} @${size}: Breite`).toBeCloseTo(Number(rect![3]), 6);
        expect(box.h, `${art} @${size}: Dicke`).toBeCloseTo(Number(rect![4]), 6);
      }
    }
  });

  it('teilt einen Lauf für den PDF-Weg in Stücke je Schnitt', async () => {
    // `doc.text()` kennt genau eine Schrift. Ohne diese Teilung schrieb jsPDF
    // das ⌘ in die eingebettete Schrift, die es nicht führt — im Betrachter
    // stand dann ein fremdes Zeichen.
    const cover = await glyphCoverFor([szene('Kürzel: `⌘D`.')]);
    const lauf = {
      dx: 0,
      text: '⌘D',
      font: font({ size: 15, family: 'mono', weight: 400 }),
      color: '#000',
      width: 20,
    };
    const stuecke = splitByFace(lauf, cover);
    expect(stuecke.map((s) => s.text)).toEqual(['⌘', 'D']);
    expect(stuecke[0].at).toBe(0);
    expect(stuecke[1].at).toBe(1);
    expect(stuecke[0].face!.id).not.toBe(stuecke[1].face!.id);

    // Und ein Lauf ohne Sonderzeichen bleibt ein einziges Stück — der
    // Normalfall darf nicht teurer werden.
    expect(splitByFace({ ...lauf, text: 'Code' }, cover)).toHaveLength(1);
  });

  it('legt den Ersatzschnitt auch ins PDF', async () => {
    /*
       Eine Szene, die *nur* Space Mono verlangt — und ein ⌘, das Space Mono
       nicht führt.

       Vorher bettete der PDF-Weg genau die Schnitte ein, die die Läufe
       nennen. Der Ersatzschnitt war nicht darunter, also stand im Betrachter
       wieder ein fremdes Zeichen. Geprüft wird an der Datei: trägt sie den
       Schnitt, der das ⌘ zeichnet?
    */
    const { scenesToPdf } = await import('./pdf');
    const spec = font({ size: 15, family: 'mono', weight: 400 });
    const scene: Scene = {
      width: 1280,
      height: 720,
      background: '#FFFEE5',
      title: 'Nur Mono',
      prims: [
        {
          t: 'text',
          x: 100,
          y: 100,
          runs: [{ dx: 0, text: '⌘D', font: spec, color: '#000000', width: 60 }],
        },
      ],
    };

    const doc = await scenesToPdf([scene], { title: 'Nur Mono' });
    const bytes = new Uint8Array(doc.output('arraybuffer'));

    /*
       Gelesen wird die fertige Datei, nicht der Erzeuger.

       Die erste Fassung suchte „Inter\" in den Rohbytes — das belegt nur, dass
       der Schnitt *eingebettet* wurde. jsPDF schreibt jede angemeldete Schrift
       aus, ob sie benutzt wird oder nicht; die Zuordnung Stück → `setFont`
       blieb damit unbewacht, und genau dort saß der Fehler. `pdfjs-dist` gibt
       je Textstück den Schnitt zurück, mit dem es gesetzt ist.
    */
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: true }).promise;
    const seite = await pdf.getPage(1);
    // Erst der Operatorenlauf füllt die Schnittnamen; ohne ihn stehen dort
    // nur die Kennungen der Ressourcen.
    await seite.getOperatorList();
    const inhalt = await seite.getTextContent();

    const gesetzt = (inhalt.items as { str: string; fontName: string }[]).map((item) => ({
      text: item.str,
      schnitt:
        (seite.commonObjs.get(item.fontName) as { name?: string } | null)?.name ?? item.fontName,
    }));

    expect(gesetzt.map((eintrag) => eintrag.text)).toEqual(['⌘', 'D']);
    expect(gesetzt[0].schnitt).toBe('Inter-Regular');
    expect(gesetzt[1].schnitt).toBe('SpaceMono-Regular');
  });

  it('gibt jedem Erscheinungsbild eine Ersatzkette', async () => {
    /*
       Die Regel als Prüfung, nicht als Absatz in einer Anleitung.

       Der Fix hat zwei Hälften, und die zweite steht in `theme.config.ts`:
       der Schriftstapel nennt die Geschwister-Schriften vor denen des
       Systems. Ein Erscheinungsbild, das `fontFamily` neu belegt und das
       vergisst, hat den Fehler wieder — und das war beim Musterkunden auch
       so, obwohl er als Vorlage für jede Marke dasteht.
    */
    registerThemes();
    for (const { id } of availableThemes()) {
      setActiveTheme(id);
      for (const rolle of ['display', 'body', 'mono'] as const) {
        expect(ersatzkette(rolle).length, `${id} · ${rolle}`).toBeGreaterThan(1);
      }
    }
    setActiveTheme('nozilla');
  });

  it('führt jedes Zeichen der mitgelieferten Decks', async () => {
    // Der Wächter, den es beim ersten Mal nicht gab. Er prüft nicht, ob ein
    // Ersatzschnitt nötig war — das darf vorkommen —, sondern ob am Ende
    // jedes Zeichen von *irgendeiner* Schrift gezeichnet werden kann. Fällt
    // eines heraus, steht im Export ein Loch, und auf dem Bildschirm sähe man
    // es nie.
    registerThemes();
    for (const gebunden of bundledDecks) {
      const deck = parseDeck(gebunden.source);
      const gewuenscht = deck.meta.theme;
      setActiveTheme(gewuenscht && isThemeId(gewuenscht) ? gewuenscht : 'nozilla');

      const scenes = deck.slides.map((slide, index) =>
        buildSlideScene(slide, deck, { slideNumber: index + 1, totalSlides: deck.slides.length }),
      );
      const cover = await glyphCoverFor(scenes);
      expect(cover.uncovered, gebunden.file).toEqual([]);
    }
    setActiveTheme('nozilla');
  });
});
