/**
 * Die Schriftablage und ihre beiden Kunden — geprüft an dem, was die Kunden
 * daraus machen, und nicht an der Ablage allein.
 *
 * Eine Ablage, die einen Schnitt hält, den `fontFaceRules()` oder der Export
 * nicht finden, wäre grün und hülfe niemandem. Gefragt wird deshalb, ob eine
 * `@font-face`-Regel ihn nennt, ob `schnittFehlt()` ihn kennt und ob der
 * Umriss-Leser aus ihm zeichnet — auch nachdem er vorher gefehlt hat.
 *
 * jsdom bietet keine IndexedDB an. Das ist hier kein Mangel, sondern der eine
 * Fall, den die Ablage ausdrücklich zusagt: ohne Datenbank gilt ein Schnitt für
 * diese Sitzung und sagt, dass er nicht gemerkt wurde. Ob er ein Neuladen
 * übersteht, prüft der Rauchtest im echten Browser.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nozillaTheme } from './brandTheme';
import { fontFaceRules } from './fonts';
import {
  eigeneSchnitte,
  eigeneSchrift,
  entferneSchrift,
  legeSchriftAb,
  subscribeSchriftablage,
} from './schriftablage';
import { embeddedFontCss, loadOutlines, schnittFehlt, type FaceRef } from '@/lib/export/fontFiles';

function schriftAus(datei: string): ArrayBuffer {
  const roh = readFileSync(join(process.cwd(), 'public', 'fonts', datei));
  return roh.buffer.slice(roh.byteOffset, roh.byteOffset + roh.byteLength);
}

const NAME = 'eigen-Probe-Regular.ttf';
const face: FaceRef = {
  role: 'body',
  family: 'Probe',
  weight: 400,
  file: NAME,
  id: 'eigen-Probe-Regular',
};

afterEach(async () => {
  // Erst räumen, dann die Attrappen weg — die Ablage gibt beim Entfernen die
  // Adressen frei, die eine Attrappe vergeben hat.
  for (const schnitt of eigeneSchnitte()) await entferneSchrift(schnitt.datei);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('die Schriftablage', () => {
  it('nimmt eine TrueType-Datei an und sagt, dass sie ohne Datenbank nicht bleibt', async () => {
    const ergebnis = await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    expect(ergebnis.grund).toBeNull();
    expect(ergebnis.gemerkt).toBe(false);
    expect(ergebnis.schnitt).toMatchObject({ familie: 'Inter', gewicht: 400, datei: NAME });
  });

  it('weist ab, was der Export nicht lesen kann — und legt es nirgends hin', async () => {
    const ergebnis = await legeSchriftAb(NAME, schriftAus('Inter-Regular.woff2'));
    expect(ergebnis.grund).toMatch(/WOFF2/);
    expect(eigeneSchrift(NAME)).toBeUndefined();
  });

  it('findet einen Schnitt auch unter dem Namen der .woff2, die eine Marke nennt', async () => {
    // So kommt eine Datei an, die beim Import fehlte: die Marke nennt
    // `Kunde-Bold.woff2`, nachgereicht wird die TrueType-Fassung.
    await legeSchriftAb('Kunde-Bold.woff2', schriftAus('Inter-Bold.ttf'));
    expect(eigeneSchrift('Kunde-Bold.woff2')?.datei).toBe('Kunde-Bold.ttf');
    expect(eigeneSchrift('Kunde-Bold.ttf')?.gewicht).toBe(700);
  });

  it('meldet jede Änderung', async () => {
    const horcher = vi.fn();
    const ab = subscribeSchriftablage(horcher);
    await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    await entferneSchrift(NAME);
    ab();
    expect(horcher).toHaveBeenCalledTimes(2);
  });
});

describe('der Bildschirm', () => {
  it('lädt einen hochgeladenen Schnitt aus der Ablage und nicht vom Server', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:probe', revokeObjectURL() {} });
    await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    const regeln = fontFaceRules([{ family: 'Probe', weight: 400, style: 'normal', file: NAME }]);
    expect(regeln).toContain("url('blob:probe') format('truetype')");
    expect(regeln).not.toContain(`/fonts/${NAME}`);
  });

  it('nennt eine .ttf im Repo `truetype` und nicht wie die Bibliothek', () => {
    // Ein falsches `format()` lässt der Browser die Regel überspringen —
    // ohne ein Wort, und der Text steht in der Ersatzschrift.
    const regeln = fontFaceRules([{ family: 'Probe', weight: 400, style: 'normal', file: NAME }]);
    expect(regeln).toContain("format('truetype')");
    expect(regeln).not.toContain("format('woff2')");
  });

  it('lässt die Schnitte der Bibliothek, wo sie waren', () => {
    const regeln = fontFaceRules(nozillaTheme.webfont.faces);
    expect(regeln).not.toContain('blob:');
    expect(regeln).toContain("format('woff2')");
  });
});

describe('der Export', () => {
  it('kennt einen hochgeladenen Schnitt als vorhanden', async () => {
    expect(await schnittFehlt(NAME)).not.toBeNull();
    await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    expect(await schnittFehlt(NAME)).toBeNull();
  });

  it('zeichnet aus einem Schnitt, der erst fehlte und dann nachgereicht wurde', async () => {
    /*
       Der Fall, an dem ein Merker zur Falle wird: der erste Versuch scheitert,
       sein Ergebnis bleibt liegen, und ein nachgereichter Schnitt käme nie an.
    */
    await expect(loadOutlines(face)).rejects.toThrow();
    await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    const umriss = await loadOutlines(face);
    expect(umriss.unitsPerEm).toBeGreaterThan(0);
  });

  it('bettet ihn ins SVG als TrueType ein und nicht als WOFF2', async () => {
    await legeSchriftAb(NAME, schriftAus('Inter-Regular.ttf'));
    const css = await embeddedFontCss([face]);
    expect(css).toContain('data:font/ttf;base64,AAEAAA');
    expect(css).toContain("format('truetype')");
  });
});
