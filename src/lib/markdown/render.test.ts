/**
 * Der Markdown-Leser — die Zusage, auf der zwei Setzer stehen.
 *
 * Diese Datei hatte keine eigene Prüfung. Mitgenommen wurde sie über die
 * Ausgabewege: was `lexMarkdown()` liefert, sieht man im SVG und in der
 * `.pptx` wieder. Was dort aber *nicht* zu sehen ist, ist die Grenze — welche
 * Schreibweise noch als Marker gilt und welche nicht, und was aus einem Stück
 * Text wird, das gar kein Absatz ist.
 *
 * Geprüft wird deshalb am Tokenstrom und nicht an einer Ausgabe: er ist das
 * Ergebnis dieses Moduls.
 */
import { describe, expect, it } from 'vitest';
import { lexInline, lexMarkdown } from './render';

/** Die Typen eines Tokenstroms, flach. */
const arten = (token: readonly { type: string }[]) => token.map((t) => t.type);

/** Alle Marker-Token eines Absatzes. */
function marker(quelle: string): string[] {
  const absatz = lexMarkdown(quelle)[0] as { tokens?: { type: string; text?: string }[] };
  return (absatz.tokens ?? []).filter((t) => t.type === 'mark').map((t) => t.text ?? '');
}

describe('der grüne Marker', () => {
  it('wird ein eigenes Token und nicht rohes HTML', () => {
    expect(marker('Ein ==wichtiges== Wort.')).toEqual(['wichtiges']);
  });

  it('trägt seine Auszeichnung mit', () => {
    const absatz = lexMarkdown('==**fett** im Marker==')[0] as {
      tokens?: { type: string; tokens?: { type: string }[] }[];
    };
    const treffer = (absatz.tokens ?? []).find((t) => t.type === 'mark');
    expect(arten(treffer?.tokens ?? [])).toContain('strong');
  });

  it('nimmt zwei Marker in einem Absatz einzeln', () => {
    expect(marker('==eins== und ==zwei==')).toEqual(['eins', 'zwei']);
  });

  it('greift nicht über Leerraum am Rand', () => {
    // `== so ==` ist kein Marker: das Wort muss direkt an den
    // Gleichheitszeichen stehen. Sonst würde jede Tabelle mit `==` in einer
    // Zelle zum Marker.
    expect(marker('== nicht ==')).toEqual([]);
    expect(marker('a ==b== c')).toEqual(['b']);
  });

  it('lässt eine leere Klammer stehen', () => {
    expect(marker('==== bleibt Text')).toEqual([]);
  });
});

describe('lexMarkdown', () => {
  it('liest die Blockarten, die der Setzer kennt', () => {
    const strom = lexMarkdown(
      ['# Titel', '', 'Ein Absatz.', '', '- Punkt', '', '> Zitat', '', '```', 'code', '```'].join(
        '\n',
      ),
    );
    expect(arten(strom).filter((art) => art !== 'space')).toEqual([
      'heading',
      'paragraph',
      'list',
      'blockquote',
      'code',
    ]);
  });

  it('nimmt leere Eingaben, ohne zu werfen', () => {
    // `TokensList` ist ein Array mit einer `links`-Eigenschaft — gefragt ist
    // die Länge und nicht die Gleichheit mit `[]`.
    expect(lexMarkdown('')).toHaveLength(0);
    expect(lexMarkdown(undefined as unknown as string)).toHaveLength(0);
  });

  it('liest eine Tabelle als Tabelle — GFM ist an', () => {
    const strom = lexMarkdown(['| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n'));
    expect(arten(strom)).toEqual(['table']);
  });

  it('bricht eine einzelne Zeile nicht um — `breaks` ist aus', () => {
    // Ein weicher Umbruch wird auf der Fläche zum Leerzeichen; wäre `breaks`
    // an, stünde dort ein harter Zeilenumbruch und der Satz sähe im Export
    // anders aus als im Feld.
    const absatz = lexMarkdown('erste\nzweite')[0] as { tokens?: { type: string }[] };
    expect(arten(absatz.tokens ?? [])).not.toContain('br');
  });
});

describe('lexInline', () => {
  it('zerlegt die Auszeichnungen eines Labels', () => {
    expect(arten(lexInline('**fett** und *kursiv* und `code`'))).toEqual([
      'strong',
      'text',
      'em',
      'text',
      'codespan',
    ]);
  });

  it('gibt leeren Text als leere Liste zurück', () => {
    expect(lexInline('')).toEqual([]);
    expect(lexInline(undefined as unknown as string)).toEqual([]);
  });

  it('rettet ein Stück, das kein Absatz ist, als Text', () => {
    /*
       Ein Label ist ein Feld und kein Dokument. Steht darin etwas, das marked
       als Block liest — ein Aufzählungsstrich zum Beispiel —, gibt es keine
       Inline-Token; dann muss der Text als Text herauskommen und nicht
       verschwinden.
    */
    const stueck = lexInline('- kein Absatz') as { type: string; text?: string }[];
    expect(stueck).toHaveLength(1);
    expect(stueck[0].type).toBe('text');
    expect(stueck[0].text).toBe('- kein Absatz');
  });

  it('lässt einen Unterstrich im Wort in Ruhe', () => {
    // CommonMark zeichnet mit `_` nicht *innerhalb* eines Wortes aus — und
    // genau darauf verlässt sich `stripInline()` in `model/types.ts`.
    const stueck = lexInline('user_id im Text') as { type: string; text?: string }[];
    expect(arten(stueck)).toEqual(['text']);
    expect(stueck[0].text).toBe('user_id im Text');
  });
});
