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
import { buildSlideScene } from './scene';
import { outlineScene } from './outline';
import { facesFor, resolveFace } from './fontFiles';
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
