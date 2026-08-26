/**
 * Was ein Export nicht laden konnte, wird gesagt.
 *
 * Ein Bild, das fehlt, darf einen Export nicht abbrechen — ein Deck mit
 * dreißig Folien wegen eines toten Pfades gar nicht auszugeben wäre die
 * schlechtere Lage. Bisher stand genau das als Kommentar im `catch`, und damit
 * war die Sache erledigt: das PDF kam ohne das Bild heraus, und niemand erfuhr
 * es. Die Politik war richtig, das Schweigen nicht.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { beiFehlendenBildern, resolveDeckImages } from './images';
import { fehlendeBilderText } from '@/App';
import { parseDeck } from '@/lib/markdown/deck';

/**
 * Ein Bild, das lädt — oder eben nicht.
 *
 * jsdom holt keine Dateien, also entscheidet hier die Quelle: was „fehlt"
 * heißt, scheitert. Data-URIs gehen dabei nicht über die Zeichenfläche, und
 * das ist der Grund, sie zu nehmen — eine Zeichenfläche gibt es in einem Test
 * ohne Browser nicht.
 */
class LadeAttrappe {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 120;
  naturalHeight = 60;
  crossOrigin = '';
  decoding = '';
  set src(wert: string) {
    queueMicrotask(() => (wert.includes('fehlt') ? this.onerror?.() : this.onload?.()));
  }
}

const DA = 'data:image/png;base64,iVBORw0KGgo=';

afterEach(() => {
  beiFehlendenBildern(null);
  vi.unstubAllGlobals();
});

describe('fehlende Bilder', () => {
  it('werden gemeldet, und nur sie', async () => {
    vi.stubGlobal('Image', LadeAttrappe);
    const gemeldet: string[][] = [];
    beiFehlendenBildern((fehlend) => gemeldet.push([...fehlend]));

    const deck = parseDeck(`# Eins\n\n![da](${DA})\n\n![weg](bilder/fehlt.png)\n`);
    const karte = await resolveDeckImages(deck);

    expect(gemeldet).toEqual([['bilder/fehlt.png']]);
    // Und das Vorhandene liegt trotzdem in der Karte — ein toter Pfad nimmt
    // den anderen Bildern nichts.
    expect(karte.has(DA)).toBe(true);
  });

  it('schweigen, wenn nichts fehlt', async () => {
    vi.stubGlobal('Image', LadeAttrappe);
    const gemeldet: string[][] = [];
    beiFehlendenBildern((fehlend) => gemeldet.push([...fehlend]));

    await resolveDeckImages(parseDeck(`# Eins\n\n![da](${DA})\n`));
    expect(gemeldet).toEqual([]);
  });

  it('brechen den Export nicht ab', async () => {
    // Die Politik, die bleibt: ein toter Pfad kostet ein Bild, kein Deck.
    vi.stubGlobal('Image', LadeAttrappe);
    const deck = parseDeck('# Eins\n\n![weg](bilder/fehlt.png)\n');
    await expect(resolveDeckImages(deck)).resolves.toBeInstanceOf(Map);
  });
});

describe('der Satz, mit dem sie gemeldet werden', () => {
  it('zählt richtig und nennt die Namen', () => {
    expect(fehlendeBilderText(['a.png'])).toBe(
      'Ein Bild ließ sich nicht laden und fehlt in der Ausgabe: a.png',
    );
    expect(fehlendeBilderText(['a.png', 'b.png'])).toContain('2 Bilder');
  });

  it('kürzt eine lange Liste, statt sie über den Rand zu schieben', () => {
    // Eine Liste, die über den Rand läuft, sagt weniger als eine Zahl.
    // Namen, die nicht aus einem Buchstaben bestehen: „d" allein steckt auch
    // in „und" und in „laden", und die erste Fassung dieser Prüfung fiel
    // darauf herein.
    const text = fehlendeBilderText(['eins.png', 'zwei.png', 'drei.png', 'vier.png', 'fuenf.png']);
    expect(text).toContain('eins.png, zwei.png, drei.png und 2 weitere');
    expect(text).not.toContain('vier.png');
  });
});
