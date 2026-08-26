import { describe, expect, it } from 'vitest';
import { parseTable, toMarkdownTable } from './table';

describe('die Zellen einer Tabelle', () => {
  it('liest eine Zeile je Zeile', () => {
    const t = parseTable('Was  Wert\nEins  1\nZwei  2', true);
    expect(t.kopf).toEqual(['Was', 'Wert']);
    expect(t.zeilen).toEqual([
      ['Eins', '1'],
      ['Zwei', '2'],
    ]);
  });

  it('trennt an Tabulator und senkrechtem Strich', () => {
    // Tabellen werden nicht getippt, sondern kopiert: aus einer
    // Tabellenkalkulation kommen Tabulatoren, aus einer `.md` Striche.
    expect(parseTable('a\tb\nc\td', true).zeilen).toEqual([['c', 'd']]);
    expect(parseTable('| a | b |\n| c | d |', true).zeilen).toEqual([['c', 'd']]);
  });

  it('lässt ein einzelnes Leerzeichen in der Zelle stehen', () => {
    // Sonst zerfiele „Gute digitale Dienste" in drei Spalten.
    expect(parseTable('Gute digitale Dienste  ja', true).kopf).toEqual([
      'Gute digitale Dienste',
      'ja',
    ]);
  });

  it('nimmt die Trennzeile als Ausrichtung und nicht als Inhalt', () => {
    const t = parseTable('Was | Wert\n:--- | ---:\nEins | 1', true);
    expect(t.zeilen).toEqual([['Eins', '1']]);
    expect(t.ausrichtung).toEqual(['left', 'right']);
  });

  it('kennt auch die zentrierte Spalte', () => {
    expect(parseTable('a|b\n:---:|---\n1|2', true).ausrichtung).toEqual(['center', 'left']);
  });

  it('füllt eine kurze Zeile auf, statt die Tabelle zu verschieben', () => {
    const t = parseTable('a  b  c\nnur eins', true);
    expect(t.zeilen).toEqual([['nur eins', '', '']]);
  });

  it('kommt ohne Kopfzeile aus', () => {
    const t = parseTable('Eins  1\nZwei  2', false);
    expect(t.kopf).toEqual([]);
    expect(t.zeilen).toHaveLength(2);
  });

  it('bleibt bei leerer Eingabe leer', () => {
    expect(parseTable('   \n\n', true)).toEqual({ kopf: [], zeilen: [], ausrichtung: [] });
    expect(toMarkdownTable(parseTable('', true))).toBe('');
  });
});

describe('die Markdown-Tabelle daraus', () => {
  it('trägt Kopf, Trennzeile und Zeilen', () => {
    expect(toMarkdownTable(parseTable('Was | Wert\nEins | 1', true))).toBe(
      ['| Was | Wert |', '| --- | --- |', '| Eins | 1 |'].join('\n'),
    );
  });

  it('schreibt die Ausrichtung mit', () => {
    expect(toMarkdownTable(parseTable('a|b\n---|---:\n1|2', true))).toContain('| --- | ---: |');
  });

  it('hat auch ohne Kopfzeile eine — eine leere', () => {
    // Eine Markdown-Tabelle *braucht* eine Kopfzeile, sonst ist es keine.
    const md = toMarkdownTable(parseTable('Eins  1', false));
    expect(md.split('\n')[0]).toBe('|  |  |');
    expect(md).toContain('| Eins | 1 |');
  });

  it('trägt einen maskierten Strich durch beide Richtungen', () => {
    // Ein Strich *in* einer Zelle wird als `\|` geschrieben — wie in
    // Markdown. Ohne Maskierung beim Zurückschreiben käme aus einer Zelle eine
    // mehr, und die Tabelle verschöbe sich ab dieser Zeile.
    const t = parseTable('Zeichen  Bedeutung\nA\\|B  Auswahl', true);
    expect(t.zeilen[0][0]).toBe('A|B');
    expect(toMarkdownTable(t)).toContain('A\\|B');
  });
});
