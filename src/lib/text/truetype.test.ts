/**
 * Der TrueType-Leser gegen die echten Marken-Schriften.
 *
 * Die Dateien liegen im Projekt, also wird gegen sie geprüft und nicht gegen
 * eine gebastelte Testschrift: ein Leser, der bei einer erfundenen Datei
 * funktioniert und bei Zilla Slab nicht, ist wertlos.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTrueType, type TrueTypeFont } from './truetype';
import { segsBounds } from '@/lib/geometry/path';

function load(file: string): TrueTypeFont {
  const bytes = readFileSync(join(process.cwd(), 'public', 'fonts', file));
  return parseTrueType(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
}

const zilla = load('ZillaSlab-Bold.ttf');
const inter = load('Inter-Regular.ttf');
const mono = load('SpaceMono-Regular.ttf');

describe('TrueType-Leser', () => {
  it('liest die Kopfdaten der drei Marken-Schriften', () => {
    expect(zilla.unitsPerEm).toBe(1000);
    expect(inter.unitsPerEm).toBe(2048);
    expect(mono.unitsPerEm).toBe(1000);
  });

  it('liefert Konturen, die im Em-Quadrat liegen', () => {
    for (const [name, font] of [
      ['Zilla', zilla],
      ['Inter', inter],
      ['Mono', mono],
    ] as const) {
      const glyph = font.glyph('H'.codePointAt(0)!);
      expect(glyph, name).not.toBeNull();
      const box = segsBounds(glyph!.segs);
      // Versalhöhe: positiv, unter dem Em — und die Grundlinie ist y = 0,
      // also liegt das „H" komplett darüber (in Font-Koordinaten: y > 0).
      expect(box.y, name).toBeGreaterThanOrEqual(-1);
      expect(box.h, name).toBeGreaterThan(font.unitsPerEm * 0.5);
      expect(box.h, name).toBeLessThan(font.unitsPerEm);
      expect(glyph!.advance, name).toBeGreaterThan(0);
    }
  });

  it('gibt für das Leerzeichen einen Vorschub ohne Kontur', () => {
    const space = inter.glyph(' '.codePointAt(0)!);
    expect(space).not.toBeNull();
    expect(space!.segs).toHaveLength(0);
    expect(space!.advance).toBeGreaterThan(0);
  });

  it('löst zusammengesetzte Glyphen auf — Umlaute sind keine Randnotiz', () => {
    // „Ä" ist im Format „A" plus Trema. Ohne den Composite-Zweig käme hier
    // entweder nichts oder nur das nackte A.
    const a = zilla.glyph('A'.codePointAt(0)!)!;
    const umlaut = zilla.glyph('Ä'.codePointAt(0)!)!;
    expect(umlaut.segs.length).toBeGreaterThan(a.segs.length);
    expect(segsBounds(umlaut.segs).h).toBeGreaterThan(segsBounds(a.segs).h);

    for (const character of 'äöüÄÖÜß') {
      const glyph = zilla.glyph(character.codePointAt(0)!);
      expect(glyph, character).not.toBeNull();
      expect(glyph!.segs.length, character).toBeGreaterThan(0);
    }
  });

  it('zeichnet Punzen als eigene Kontur', () => {
    // Ein „o" hat außen und innen je eine geschlossene Kontur. Fehlt die
    // innere, wird der Buchstabe beim Füllen zum schwarzen Klecks.
    const o = inter.glyph('o'.codePointAt(0)!)!;
    const contours = o.segs.filter((seg) => seg.c === 'M').length;
    expect(contours).toBe(2);
  });

  it('erhebt quadratische auf kubische Kurven — PDF kennt nichts anderes', () => {
    const glyph = zilla.glyph('S'.codePointAt(0)!)!;
    expect(glyph.segs.some((seg) => seg.c === 'C')).toBe(true);
    expect(glyph.segs.every((seg) => ['M', 'L', 'C', 'Z'].includes(seg.c))).toBe(true);
  });

  it('meldet ein unbekanntes Zeichen, statt etwas Falsches zu zeichnen', () => {
    // Eine private-use-Stelle, die keine Textschrift führt.
    expect(inter.glyph(0x10fffd)).toBeNull();
  });

  it('weist zurück, was keine TrueType-Datei ist', () => {
    expect(() => parseTrueType(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer)).toThrow();
  });
});
