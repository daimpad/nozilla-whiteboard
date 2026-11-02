/**
 * Eine hochgeladene Schrift lesen — geprüft an echten Dateien aus
 * `public/fonts/` und an Abwandlungen davon, die je genau eine Eigenschaft
 * ändern. Eine von Hand gebaute Mini-Schrift prüfte den Leser gegen die
 * Vorstellung dessen, der sie gebaut hat.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eigenerDateiname, liesSchriftdatei } from './schriftdatei';

function schriftAus(datei: string): ArrayBuffer {
  const roh = readFileSync(join(process.cwd(), 'public', 'fonts', datei));
  return roh.buffer.slice(roh.byteOffset, roh.byteOffset + roh.byteLength);
}

/** Die Lage einer Tabelle — oder `null`. */
function tabelle(bytes: ArrayBuffer, name: string): { eintrag: number; offset: number } | null {
  const view = new DataView(bytes);
  for (let i = 0; i < view.getUint16(4); i += 1) {
    const eintrag = 12 + i * 16;
    const tag = String.fromCharCode(...new Uint8Array(bytes, eintrag, 4));
    if (tag === name) return { eintrag, offset: view.getUint32(eintrag + 8) };
  }
  return null;
}

describe('liesSchriftdatei', () => {
  it('liest Familie, Gewicht und Lage aus der Datei', () => {
    expect(liesSchriftdatei(schriftAus('Inter-Regular.ttf'))).toEqual({
      ok: true,
      angaben: { familie: 'Inter', gewicht: 400, kursiv: false },
    });
    expect(liesSchriftdatei(schriftAus('ZillaSlab-Bold.ttf'))).toEqual({
      ok: true,
      angaben: { familie: 'Zilla Slab', gewicht: 700, kursiv: false },
    });
  });

  it('erkennt einen kursiven Schnitt am Bit, das ihn so nennt', () => {
    const bytes = schriftAus('Inter-Regular.ttf');
    const os2 = tabelle(bytes, 'OS/2')!;
    const view = new DataView(bytes);
    view.setUint16(os2.offset + 62, view.getUint16(os2.offset + 62) | 1);
    const lesung = liesSchriftdatei(bytes);
    expect(lesung.ok && lesung.angaben.kursiv).toBe(true);
  });

  it('weist eine komprimierte Webschrift ab und sagt, was stattdessen', () => {
    const lesung = liesSchriftdatei(schriftAus('Inter-Regular.woff2'));
    expect(lesung.ok).toBe(false);
    expect(!lesung.ok && lesung.grund).toMatch(/WOFF2.*\.ttf/);
  });

  it('weist PostScript-Konturen ab', () => {
    // Dieselbe Datei mit der Kennung einer CFF-Schrift: der Leser soll an der
    // Kennung urteilen, bevor er Tabellen sucht, die es dort nicht gäbe.
    const bytes = schriftAus('Inter-Regular.ttf');
    new Uint8Array(bytes).set([0x4f, 0x54, 0x54, 0x4f], 0);
    const lesung = liesSchriftdatei(bytes);
    expect(!lesung.ok && lesung.grund).toMatch(/CFF/);
  });

  it('weist eine variable Schrift ab', () => {
    // Eine Tabelle, die der Leser nicht braucht, heißt jetzt `fvar`. Sonst
    // bleibt die Datei, was sie war — gelesen werden könnte sie also.
    const bytes = schriftAus('Inter-Regular.ttf');
    const post = tabelle(bytes, 'post')!;
    new Uint8Array(bytes).set([0x66, 0x76, 0x61, 0x72], post.eintrag);
    const lesung = liesSchriftdatei(bytes);
    expect(!lesung.ok && lesung.grund).toMatch(/variable Schrift/);
  });

  it('weist Bytes ab, die keine Schrift sind', () => {
    const html = new TextEncoder().encode('<!doctype html><html></html>');
    expect(liesSchriftdatei(html.buffer as ArrayBuffer).ok).toBe(false);
  });
});

describe('eigenerDateiname', () => {
  it('trägt eine Vorsilbe und endet auf .ttf', () => {
    expect(eigenerDateiname('Kunde Sans Bold.TTF')).toBe('eigen-Kunde-Sans-Bold.ttf');
  });

  it('überdeckt keinen Schnitt der Bibliothek', () => {
    // Ohne Vorsilbe stünde ein hochgeladenes „Inter-Regular.ttf" unter dem
    // Namen, den jedes Erscheinungsbild mit Inter für den Export holt.
    expect(eigenerDateiname('Inter-Regular.ttf')).not.toBe('Inter-Regular.ttf');
  });

  it('lässt nichts stehen, was in einer URL oder CSS etwas bedeutet', () => {
    expect(eigenerDateiname("Grüne O'Neill (2024)/Bold.ttf")).toMatch(
      /^eigen-[A-Za-z0-9._-]+\.ttf$/,
    );
  });
});
