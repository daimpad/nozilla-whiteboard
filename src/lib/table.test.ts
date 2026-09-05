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

/* -------------------------------------------------------------------------- */

describe('eine leere erste Zelle', () => {
  it('überlebt jede Trennweise', () => {
    /*
       Aus einer Tabellenkalkulation kopiert, mit einer Gruppenspalte, die nur
       in der ersten Zeile gefüllt ist. Das `trim()` über die ganze Zeile
       entfernte den **führenden Trenner** — bei Tabulatoren und der
       Zwei-Leerzeichen-Schreibweise ist er Leerraum —, und alle Zellen
       rutschten eine Spalte nach links: „Hamburg" stand unter „Region", die
       Spalte „Wert" war leer.
    */
    const tab = parseTable('Region\tStadt\tWert\nNord\tKiel\t12\n\tHamburg\t20', true);
    expect(tab.zeilen[1]).toEqual(['', 'Hamburg', '20']);

    const leerzeichen = parseTable('a  b  c\n  y  z', true);
    expect(leerzeichen.zeilen[0]).toEqual(['', 'y', 'z']);

    /*
       Die drei Gegenrichtungen, ohne die die Regel nur eine halbe wäre: die
       Strich-Schreibweise ging schon vorher gut, eine leere Zelle *mitten* in
       der Zeile auch, und der Rahmenstrich am Zeilenanfang darf weiterhin
       keine leere Spalte erzeugen.
    */
    expect(parseTable('| a | b |\n|  | y |', true).zeilen[0]).toEqual(['', 'y']);
    expect(parseTable('a  b  c\nx\t\t3', true).zeilen[0]).toEqual(['x', '', '3']);
    expect(parseTable('| a | b |\n| x | y |', true).kopf).toEqual(['a', 'b']);
  });
});

describe('die Zeile aus Strichen', () => {
  it('gilt nur als Trennzeile, wenn sie die zweite ist', () => {
    /*
       Gesucht wurde sie in jeder Zeile — und damit verschwand jede Zeile,
       deren Zellen alle aus Bindestrichen bestehen. Ein Strich ist die
       verbreitetste Schreibweise für „keine Angabe"; die Zeile stand danach
       in keiner Ausgabe mehr, ohne ein Wort.
    */
    const t = parseTable('a|b\n---|---\n1|2\n--|--\n3|4', true);
    expect(t.zeilen).toEqual([
      ['1', '2'],
      ['--', '--'],
      ['3', '4'],
    ]);
  });

  it('stellt die Ausrichtung nicht mitten in der Tabelle um', () => {
    const t = parseTable('a|b\n---|---:\n1|2\n:---:|:---:\n3|4', true);
    expect(t.ausrichtung).toEqual(['left', 'right']);
  });

  it('gilt an ihrer Stelle weiterhin', () => {
    // Die Gegenrichtung. Ohne sie bestünde die Prüfung auch für einen Leser,
    // der die Ausrichtung gar nicht mehr liest.
    expect(parseTable('a|b\n:---:|---\n1|2', true).ausrichtung).toEqual(['center', 'left']);
    expect(parseTable('a|b\n---|---\n1|2', true).zeilen).toEqual([['1', '2']]);
  });

  it('steht als Inhalt auch auf der Folie', () => {
    // Am Ergebnis: die Zeile muss die kanonische Markdown-Tabelle erreichen,
    // sonst ist sie zwar im Modell und trotzdem in keiner Ausgabe.
    expect(toMarkdownTable(parseTable('a|b\n---|---\n1|2\n--|--\n3|4', true))).toContain(
      '| -- | -- |',
    );
  });
});

describe('ein Einzug, den jede Zeile trägt', () => {
  it('gehört keiner Spalte', () => {
    /*
       Links wird bewusst nicht beschnitten — bei Tabulatoren und der
       Zwei-Leerzeichen-Schreibweise *ist* ein führender Trenner eine leere
       erste Zelle. Ein Einzug, den **jede** Zeile hat, ist aber keiner:
       eingerückt eingefügt bekam die Tabelle vorn eine leere Spalte, die
       Platz nimmt und nichts zeigt.
    */
    expect(parseTable('  Was  Wert\n  Eins  1', true).kopf).toEqual(['Was', 'Wert']);
    expect(parseTable('\tWas\tWert\n\tEins\t1', true).kopf).toEqual(['Was', 'Wert']);
  });

  it('nimmt der leeren ersten Zelle nichts weg', () => {
    /*
       Die Gegenrichtung, und sie ist der ganze Grund für das Wort
       „gemeinsam": der Fall, für den das Nicht-Beschneiden gebaut ist — eine
       Gruppenspalte, die nur in der ersten Zeile gefüllt ist — hat in der
       ersten Zeile keinen Einzug.
    */
    expect(parseTable('Region\tStadt\nNord\tKiel\n\tHamburg', true).zeilen[1]).toEqual([
      '',
      'Hamburg',
    ]);
    expect(parseTable('a  b  c\n  y  z', true).zeilen[0]).toEqual(['', 'y', 'z']);
  });
});
