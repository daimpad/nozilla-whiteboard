/**
 * Zeilen und Zellen lesen — und als Markdown-Tabelle zurückgeben.
 *
 * Eine Tabelle als Elementart hat **keinen eigenen Zeichner**. Sie liest, was
 * getippt oder hineinkopiert wurde, und schreibt daraus die kanonische
 * Markdown-Tabelle, die der Setzer ohnehin zeichnet. Ein zweiter Tabellensatz
 * neben dem des Fließtexts wäre genau das, wovor die erste Regel dieses
 * Projekts warnt: zwei Wege zum selben Bild, die eines Tages auseinanderlaufen.
 *
 * Gelesen wird großzügig, weil Tabellen nicht getippt, sondern kopiert werden.
 * Aus einer Tabellenkalkulation kommen Tabulatoren, aus einer Webseite zwei
 * Leerzeichen, aus einer `.md` senkrechte Striche. Alle drei gelten. Ein
 * *einzelnes* Leerzeichen trennt nicht — sonst zerfiele „Gute digitale
 * Dienste" in drei Spalten.
 *
 * Die Trennzeile einer Markdown-Tabelle (`---`, `:---:`, `---:`) ist keine
 * Zeile mit Inhalt, sondern die Ausrichtung der Spalten. Wer eine fertige
 * Tabelle hereinkopiert, bekommt seine Zahlen deshalb rechtsbündig, ohne
 * etwas dafür zu tun.
 *
 * Ein senkrechter Strich, der *in* einer Zelle stehen soll, wird als `\|`
 * geschrieben — dieselbe Schreibweise wie in Markdown. Er darf, weil er in
 * einer Tastenkombination oder einer Regel vorkommt, und er muss maskiert
 * werden, weil er sonst trennt.
 */

export type Zellenausrichtung = 'left' | 'center' | 'right';

export interface Tabelle {
  /** Die Kopfzeile. Leer, wenn keine gewünscht ist. */
  kopf: string[];
  zeilen: string[][];
  /** Je Spalte eine Ausrichtung; so lang wie die breiteste Zeile. */
  ausrichtung: Zellenausrichtung[];
}

/** Tabulator, senkrechter Strich oder zwei Leerzeichen. Kein einzelnes. */
const TRENNER = /\t|\s*\|\s*|\s{2,}/;

/**
 * Der Platzhalter für einen maskierten Strich.
 *
 * Der bequeme Weg wäre ein negativer Rückblick im Trenner
 * (`(?<!\\)\|`) — den kennt aber nicht jeder Browser, den dieses Werkzeug
 * bedienen soll. Ein Zeichen, das in keinem Text vorkommt, tut dasselbe und
 * läuft überall.
 */
const MASKE = '\u0000';

/** `---`, `:---`, `---:`, `:---:` — die Ausrichtungszeile einer Markdown-Tabelle. */
const AUSRICHTUNG = /^:?-{2,}:?$/;

export function parseTable(source: string, mitKopf: boolean): Tabelle {
  const roh: string[][] = [];
  let ausrichtung: Zellenausrichtung[] = [];
  let gesehen = 0;

  for (const zeile of ohneGemeinsamenEinzug(source.split('\n'))) {
    // Der führende und der abschließende Strich einer Markdown-Tabelle
    // gehören zum Rahmen und nicht zum Inhalt; ohne dieses Abschneiden
    // entstünde vorn und hinten je eine leere Spalte.
    /*
       Nur rechts beschneiden, nicht links.

       Ein `trim()` über die ganze Zeile entfernte den **führenden Trenner** —
       bei Tabulatoren und der Zwei-Leerzeichen-Schreibweise ist er Leerraum.
       Eine leere erste Zelle fiel damit weg, und alle Zellen der Zeile
       rutschten eine Spalte nach links: aus einer Tabellenkalkulation kopiert,
       mit einer Gruppenspalte, die nur in der ersten Zeile gefüllt ist, stand
       danach „Hamburg" unter „Region" und die letzte Spalte leer. In
       Strich-Schreibweise (`|  | Hamburg | 20 |`) und bei einer leeren Zelle
       *mitten* in der Zeile ging es gut — es traf ausschließlich die erste.
    */
    const inhalt = zeile
      .replace(/\s+$/, '')
      .replace(/\\\|/g, MASKE)
      .replace(/^\s*\|/, '')
      .replace(/\|$/, '');
    if (!inhalt.trim()) continue;

    const zellen = inhalt.split(TRENNER).map((zelle) => zelle.trim().split(MASKE).join('|'));

    /*
       Die Ausrichtungszeile ist die **zweite** Zeile — und nur die.

       Gesucht wurde sie vorher in jeder Zeile, und damit verschwand jede
       Zeile, deren Zellen alle aus Bindestrichen bestehen. Gemessen an
       „Was|Wert / --|-- / 1|2": die mittlere Zeile stand in keiner Ausgabe
       mehr, ohne ein Wort — dabei ist ein Strich die verbreitetste
       Schreibweise für „keine Angabe". Eine zweite Trennzeile weiter unten
       stellte obendrein die Ausrichtung aller Spalten um.

       So steht es auch in Markdown: die Zeile aus Strichen trennt die
       Kopfzeile vom Rumpf und kommt genau einmal vor. Was weiter unten wie
       eine aussieht, ist Inhalt — den Wert behalten, die Lücke zeigen.
    */
    gesehen += 1;
    if (gesehen === 2 && zellen.every((zelle) => AUSRICHTUNG.test(zelle))) {
      ausrichtung = zellen.map(ausrichtungAus);
      continue;
    }
    roh.push(zellen);
  }

  if (roh.length === 0) return { kopf: [], zeilen: [], ausrichtung: [] };

  // Eine kurze Zeile bekommt leere Zellen, statt die Tabelle zu verschieben.
  const spalten = Math.max(...roh.map((zeile) => zeile.length));
  const gefuellt = roh.map((zeile) =>
    Array.from({ length: spalten }, (_, index) => zeile[index] ?? ''),
  );

  return {
    kopf: mitKopf ? gefuellt[0] : [],
    zeilen: mitKopf ? gefuellt.slice(1) : gefuellt,
    ausrichtung: Array.from({ length: spalten }, (_, index) => ausrichtung[index] ?? 'left'),
  };
}

/**
 * Der Einzug, den alle Zeilen gemeinsam haben, gehört keiner Zelle.
 *
 * Links wird bewusst nicht beschnitten — bei Tabulatoren und der
 * Zwei-Leerzeichen-Schreibweise *ist* der führende Trenner eine leere erste
 * Zelle (siehe oben). Ein Einzug, den **jede** Zeile trägt, ist aber keine
 * Spalte, sondern ein Einzug: eine eingerückt eingefügte Tabelle bekam damit
 * vorn eine leere Spalte, die Platz nimmt und nichts zeigt.
 *
 * Der Unterschied hängt an dem Wort „gemeinsam". Der Fall, für den das
 * Nicht-Beschneiden gebaut ist — eine Gruppenspalte, die nur in der ersten
 * Zeile gefüllt ist —, hat in der ersten Zeile keinen Einzug; der gemeinsame
 * ist damit leer und es wird nichts abgeschnitten.
 */
function ohneGemeinsamenEinzug(zeilen: readonly string[]): string[] {
  let einzug: string | null = null;
  for (const zeile of zeilen) {
    if (!zeile.trim()) continue;
    const eigener = /^\s*/.exec(zeile)?.[0] ?? '';
    if (einzug === null) {
      einzug = eigener;
      continue;
    }
    let gleich = 0;
    while (gleich < einzug.length && einzug[gleich] === eigener[gleich]) gleich += 1;
    einzug = einzug.slice(0, gleich);
    if (!einzug) break;
  }
  const ab = einzug?.length ?? 0;
  return ab === 0 ? [...zeilen] : zeilen.map((zeile) => zeile.slice(ab));
}

function ausrichtungAus(zelle: string): Zellenausrichtung {
  const links = zelle.startsWith(':');
  const rechts = zelle.endsWith(':');
  if (links && rechts) return 'center';
  if (rechts) return 'right';
  return 'left';
}

/**
 * Die kanonische Markdown-Tabelle — das, was der Setzer zeichnet.
 *
 * Ohne Kopfzeile steht trotzdem eine da: eine Markdown-Tabelle *braucht* eine,
 * sonst ist es keine. Sie bleibt dann leer, und das ist genau die Zeile, die
 * man sieht, wenn man eine Tabelle ohne Kopf aufzieht.
 */
export function toMarkdownTable(tabelle: Tabelle): string {
  const spalten = tabelle.ausrichtung.length;
  if (spalten === 0) return '';

  const zeile = (zellen: readonly string[]) =>
    `| ${Array.from({ length: spalten }, (_, i) => maskiere(zellen[i] ?? '')).join(' | ')} |`;

  const trenner = tabelle.ausrichtung.map((art) =>
    art === 'center' ? ':---:' : art === 'right' ? '---:' : '---',
  );

  return [
    zeile(tabelle.kopf),
    `| ${trenner.join(' | ')} |`,
    ...tabelle.zeilen.map((z) => zeile(z)),
  ].join('\n');
}

/**
 * Ein senkrechter Strich in einer Zelle beendete sonst die Zelle.
 *
 * Beim Lesen kam er als `\|` herein und steht jetzt roh in der Zelle; beim
 * Zurückschreiben muss er wieder maskiert werden. Ohne das käme aus einer
 * Zelle plötzlich eine mehr — und die Tabelle verschöbe sich ab dieser Zeile.
 */
function maskiere(zelle: string): string {
  return zelle.replace(/\|/g, '\\|');
}
