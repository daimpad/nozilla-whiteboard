/**
 * Die Schriftbibliothek, gemessen an den Dateien und nicht am Katalog.
 *
 * Der Katalog kann alles behaupten. Geprüft wird deshalb, was der Export
 * später wirklich tut: die TTF mit dem eigenen Leser öffnen, eine Glyphe
 * holen, und nachsehen, dass „Bold" auch fett ist. Der Fehler, gegen den das
 * gebaut ist, sieht auf dem Bildschirm richtig aus — eine variable Schrift,
 * aus der der Leser nur die Grundstellung zieht, steht dort fett und im PDF in
 * Regular. Eine Prüfung, die nur nach Dateinamen fragt, wäre dabei grün.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTrueType } from '@/lib/text/truetype';
import { nozillaTheme } from '@/theme/brandTheme';
import { bibliothek } from './schriftbibliothek.generated';
import { bibliotheksfamilie, ciArten, schriftbibliothek } from './schriftbibliothek';

const FONTS = join(process.cwd(), 'public', 'fonts');

function bytes(datei: string): ArrayBuffer {
  const puffer = readFileSync(join(FONTS, datei));
  return puffer.buffer.slice(puffer.byteOffset, puffer.byteOffset + puffer.byteLength);
}

/** Das Tabellenverzeichnis einer sfnt-Datei — mehr braucht die Prüfung nicht. */
function tabellen(buffer: ArrayBuffer): Map<string, { offset: number; length: number }> {
  const view = new DataView(buffer);
  const anzahl = view.getUint16(4);
  const aus = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < anzahl; i += 1) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(at),
      view.getUint8(at + 1),
      view.getUint8(at + 2),
      view.getUint8(at + 3),
    );
    aus.set(tag, { offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
  }
  return aus;
}

function gewichtsklasse(buffer: ArrayBuffer): number {
  const os2 = tabellen(buffer).get('OS/2');
  if (!os2) throw new Error('keine OS/2-Tabelle');
  return new DataView(buffer).getUint16(os2.offset + 4);
}

/** Die Fläche einer Glyphe als Summe über ihre Konturen — ein Maß für „fett". */
function flaeche(buffer: ArrayBuffer, zeichen: string): number {
  const font = parseTrueType(buffer);
  const glyph = font.glyph(zeichen.codePointAt(0)!);
  if (!glyph) throw new Error(`„${zeichen}" fehlt`);
  // Schnürsenkel über die Stützpunkte; Kurven gehen als Sehnen ein, das reicht
  // für den Vergleich zweier Schnitte derselben Familie.
  let summe = 0;
  let start: { x: number; y: number } | null = null;
  let vorher: { x: number; y: number } | null = null;
  for (const seg of glyph.segs) {
    const punkt: { x: number; y: number } | null = seg.c === 'Z' ? start : { x: seg.x, y: seg.y };
    if (seg.c === 'M') {
      start = punkt;
      vorher = punkt;
      continue;
    }
    if (punkt && vorher) summe += vorher.x * punkt.y - punkt.x * vorher.y;
    vorher = punkt;
  }
  return Math.abs(summe) / 2 / font.unitsPerEm ** 2;
}

describe('jede Datei der Bibliothek', () => {
  const alle = schriftbibliothek().flatMap((f) =>
    f.schnitte.map((s) => ({ ...s, familie: f.familie })),
  );

  it('liegt als WOFF2 und als TTF daneben', () => {
    for (const schnitt of alle) {
      expect(existsSync(join(FONTS, schnitt.file)), schnitt.file).toBe(true);
      const ttf = schnitt.file.replace(/\.woff2$/, '.ttf');
      expect(existsSync(join(FONTS, ttf)), ttf).toBe(true);
      // Die WOFF2 muss wirklich eine sein — `loadWoff2()` bettet sonst Fremdes ein.
      expect(
        new TextDecoder().decode(new Uint8Array(bytes(schnitt.file), 0, 4)),
        schnitt.file,
      ).toBe('wOF2');
    }
  });

  it('lässt sich mit dem Umriss-Leser des Exports öffnen und zeichnet', () => {
    for (const schnitt of alle) {
      const ttf = bytes(schnitt.file.replace(/\.woff2$/, '.ttf'));
      const font = parseTrueType(ttf);
      const a = font.glyph('A'.codePointAt(0)!);
      expect(a?.segs.length, schnitt.file).toBeGreaterThan(3);
    }
  });

  it('ist ein fester Schnitt und keine variable Schrift', () => {
    // Die Falle, um die es geht: eine variable Datei liest der Leser ohne
    // Fehler — nur eben immer in der Grundstellung.
    for (const schnitt of alle) {
      const ttf = bytes(schnitt.file.replace(/\.woff2$/, '.ttf'));
      expect(tabellen(ttf).has('fvar'), schnitt.file).toBe(false);
      expect(gewichtsklasse(ttf), schnitt.file).toBe(schnitt.weight);
    }
  });

  it('wird mit steigendem Gewicht wirklich fetter', () => {
    /*
       Die Zusicherung, die die Gewichtsklasse allein nicht gibt: die steht in
       einem Feld, das der Schneider setzt, auch wenn die Umrisse gleich
       blieben. Gemessen wird deshalb die Fläche des „H" — Regular muss
       magerer sein als Bold, in jeder Familie. Die Monospace-Familien sind
       dabei der eigentliche Fall: dort sind die Vorschübe aller Schnitte
       gleich, nur die Striche nicht.
    */
    for (const familie of schriftbibliothek()) {
      const nachGewicht = [...familie.schnitte].sort((a, b) => a.weight - b.weight);
      const leicht = nachGewicht[0];
      const schwer = nachGewicht[nachGewicht.length - 1];
      if (leicht.weight === schwer.weight) continue;
      const f = (datei: string) => flaeche(bytes(datei.replace(/\.woff2$/, '.ttf')), 'H');
      expect(
        f(schwer.file),
        `${familie.familie} ${schwer.weight} gegen ${leicht.weight}`,
      ).toBeGreaterThan(f(leicht.file) * 1.05);
    }
  });
});

describe('der Katalog gegen das Verzeichnis', () => {
  it('kennt jede Schriftdatei unter public/fonts — und umgekehrt', () => {
    /*
       In beide Richtungen: eine Datei ohne Katalogeintrag ist Ballast, den
       niemand wählen kann; ein Eintrag ohne Datei ist eine Zusage, die im
       Export auf die Ersatzschrift fällt.
    */
    const bekannt = new Set(
      schriftbibliothek().flatMap((f) =>
        f.schnitte.flatMap((s) => [s.file, s.file.replace(/\.woff2$/, '.ttf')]),
      ),
    );
    const vorhanden = readdirSync(FONTS).filter((d) => /\.(ttf|woff2)$/.test(d));
    expect(vorhanden.filter((d) => !bekannt.has(d))).toEqual([]);
    expect([...bekannt].filter((d) => !vorhanden.includes(d))).toEqual([]);
  });

  it('legt jeder Familie ihre Lizenz bei', () => {
    for (const familie of bibliothek) {
      const stamm = familie.schnitte[0].file.replace(/-\w+\.woff2$/, '');
      const text = readFileSync(join(FONTS, 'lizenzen', `${stamm}.txt`), 'utf8');
      expect(text, familie.familie).toMatch(
        familie.lizenz === 'OFL-1.1' ? /SIL OPEN FONT LICENSE/i : /Apache License/i,
      );
    }
  });

  it('nennt jede Familie einmal', () => {
    const namen = schriftbibliothek().map((f) => f.familie);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('gibt jeder CI-Familie eine Art', () => {
    // Ohne Eintrag fiele eine neue CI-Familie still unter „sans".
    for (const face of nozillaTheme.webfont.faces) {
      expect(ciArten[face.family], face.family).toBeDefined();
    }
  });

  it('benennt Dateien ohne Leer- und Schrägstrich', () => {
    // resolveFace() macht aus dem Dateinamen die Kennung eines PDF-Schnitts.
    for (const familie of schriftbibliothek()) {
      for (const schnitt of familie.schnitte) {
        expect(schnitt.file, familie.familie).toMatch(/^[A-Za-z0-9-]+\.woff2$/);
      }
    }
  });

  it('findet eine Familie beim Namen', () => {
    expect(bibliotheksfamilie('DM Sans')?.schnitte.map((s) => s.weight)).toEqual([
      400, 500, 600, 700,
    ]);
    expect(bibliotheksfamilie('Inter')?.art).toBe('sans');
    expect(bibliotheksfamilie('Helvetica Neue')).toBeUndefined();
  });
});
