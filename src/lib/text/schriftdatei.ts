/**
 * Eine hochgeladene Schriftdatei lesen — und sagen, warum sie nicht taugt.
 *
 * Dieses Werkzeug braucht von einem Schnitt mehr als der Bildschirm. Der
 * Browser zeichnet aus fast allem, was eine Schrift heißt; der Export braucht
 * `glyf`-Konturen (PDF-Einbettung und Umriss-Leser) und einen festen Schnitt
 * (`truetype.ts` kennt keine Variationsachsen). Eine Datei, die nur der
 * Bildschirm lesen kann, sähe auf der Folie richtig aus und stünde in PNG und
 * PDF in der Ersatzschrift — wörtlich „Der Bildschirm ersetzt eine fehlende
 * Glyphe, die Datei nicht". Abgewiesen wird deshalb beim Hochladen und nicht
 * beim ersten Export.
 *
 * Gelesen werden dazu Familie, Gewicht und Lage aus der Datei selbst. Wer
 * sie von Hand eintrüge, träfe beim dritten Schnitt den falschen Namen — und
 * der Stapel einer Rolle ist ein Fremdschlüssel auf genau diesen Namen.
 */
import { parseTrueType } from './truetype';

export interface Schriftangaben {
  familie: string;
  /** Das Gewicht aus `OS/2`, auf den Bereich gebracht, den `@font-face` kennt. */
  gewicht: number;
  kursiv: boolean;
}

export type Schriftlesung = { ok: true; angaben: Schriftangaben } | { ok: false; grund: string };

/** Die Tabellen einer TrueType-Datei, nur Name und Lage. */
function tabellen(view: DataView): Map<string, { offset: number; length: number }> {
  const anzahl = view.getUint16(4);
  const liste = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < anzahl; i += 1) {
    const eintrag = 12 + i * 16;
    const name = String.fromCharCode(
      view.getUint8(eintrag),
      view.getUint8(eintrag + 1),
      view.getUint8(eintrag + 2),
      view.getUint8(eintrag + 3),
    );
    liste.set(name, { offset: view.getUint32(eintrag + 8), length: view.getUint32(eintrag + 12) });
  }
  return liste;
}

/**
 * Den Familiennamen aus der `name`-Tabelle.
 *
 * Bevorzugt wird die *typografische* Familie (Name 16) vor der älteren
 * (Name 1): eine Familie mit neun Schnitten nennt in Name 1 oft „Kunde Sans
 * Light" und „Kunde Sans SemiBold" — aus jedem Schnitt eine eigene Familie,
 * und der Stapel fände je Rolle genau einen davon.
 */
function familienname(view: DataView, name: { offset: number }): string | null {
  const anzahl = view.getUint16(name.offset + 2);
  const texte = name.offset + view.getUint16(name.offset + 4);
  const gefunden = new Map<number, string>();
  for (let i = 0; i < anzahl; i += 1) {
    const eintrag = name.offset + 6 + i * 12;
    const plattform = view.getUint16(eintrag);
    const nameId = view.getUint16(eintrag + 6);
    if (nameId !== 1 && nameId !== 16) continue;
    const laenge = view.getUint16(eintrag + 8);
    const start = texte + view.getUint16(eintrag + 10);
    const bytes = new Uint8Array(view.buffer, view.byteOffset + start, laenge);
    // Windows und Unicode schreiben UTF-16BE, der alte Mac-Eintrag ein Byte je
    // Zeichen. Gewonnen hat Windows: es steht in jeder heute gebauten Datei.
    const text =
      plattform === 1 ? String.fromCharCode(...bytes) : new TextDecoder('utf-16be').decode(bytes);
    if (!gefunden.has(nameId) || plattform === 3) gefunden.set(nameId, text.trim());
  }
  return gefunden.get(16) || gefunden.get(1) || null;
}

export function liesSchriftdatei(bytes: ArrayBuffer): Schriftlesung {
  if (bytes.byteLength < 12) return { ok: false, grund: 'Die Datei ist zu kurz für eine Schrift.' };
  const kopf = String.fromCharCode(...new Uint8Array(bytes, 0, 4));
  if (kopf === 'wOF2' || kopf === 'wOFF') {
    return {
      ok: false,
      grund: `Das ist eine komprimierte Webschrift (${kopf === 'wOF2' ? 'WOFF2' : 'WOFF'}). Der Export braucht die Konturen unkomprimiert — bitte die .ttf derselben Schrift.`,
    };
  }
  if (kopf === 'OTTO') {
    return {
      ok: false,
      grund:
        'Das ist eine OpenType-Schrift mit PostScript-Konturen (CFF). Der Export liest nur TrueType-Konturen — bitte die TrueType-Fassung (.ttf) derselben Schrift.',
    };
  }

  try {
    parseTrueType(bytes);
  } catch (fehler) {
    return {
      ok: false,
      grund: `Keine lesbare TrueType-Schrift: ${fehler instanceof Error ? fehler.message : String(fehler)}.`,
    };
  }

  const view = new DataView(bytes);
  const liste = tabellen(view);
  if (liste.has('fvar')) {
    return {
      ok: false,
      grund:
        'Das ist eine variable Schrift. Im Export stünde jeder Schnitt in der Grundstellung — jede fette Überschrift in PDF und PNG wäre Regular. Bitte je Gewicht eine feste .ttf.',
    };
  }

  const name = liste.get('name');
  const familie = name ? familienname(view, name) : null;
  if (!familie) {
    return { ok: false, grund: 'Die Datei nennt keinen Familiennamen.' };
  }

  const os2 = liste.get('OS/2');
  const head = liste.get('head');
  const roh = os2 ? view.getUint16(os2.offset + 4) : 400;
  const gewicht = Math.min(900, Math.max(100, roh || 400));
  const kursiv = os2
    ? (view.getUint16(os2.offset + 62) & 1) === 1
    : head
      ? (view.getUint16(head.offset + 44) & 2) === 2
      : false;

  return { ok: true, angaben: { familie, gewicht, kursiv } };
}

/**
 * Ein Dateiname, unter dem ein hochgeladener Schnitt im Erscheinungsbild steht.
 *
 * Mit Vorsilbe, damit niemand einen Schnitt der Bibliothek überdeckt: wer
 * „Inter-Regular.ttf" hochlädt, soll nicht still ändern, was jedes andere
 * Erscheinungsbild unter diesem Namen bekommt. Und ohne Zeichen, die in einer
 * URL, einer CSS-Zeichenkette oder einem Dateisystem eine Bedeutung haben.
 */
export function eigenerDateiname(original: string): string {
  const stamm =
    original
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'schnitt';
  return `eigen-${stamm}.ttf`;
}
