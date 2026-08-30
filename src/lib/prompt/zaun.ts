/**
 * Den Codezaun um eine Modellantwort abnehmen.
 *
 * ## Warum das hier liegt und nicht in einer Komponente
 *
 * Weil zwei Wege dieselbe Frage stellen — der Deck-Prompt im Werkzeug und der
 * CI-Prompt im Generator —, und weil eine Prüfung unter `lib/` bisher aus
 * einer Komponente importierte. Das ist die Richtung, in die dieses Projekt
 * nicht baut: `lib/` ist die Rechnung, `components/` die Oberfläche.
 *
 * ## Und warum es zwei Regeln sind und nicht eine
 *
 * Was hier ankommt, ist entweder Markdown oder JSON, und der Unterschied ist
 * nicht kosmetisch: **ein Deck darf selbst einen Codezaun enthalten.** Die
 * Willkommensmappe tut es. Wer stumpf vom ersten ``` bis zum letzten schneidet,
 * holt aus einem nackten Deck dessen *inneren* Codeblock heraus und wirft alles
 * andere weg — grün in jedem Test, der nur eingezäunte Antworten kennt.
 *
 * Deshalb die vier Stufen unten. Die dritte ist die, die zuletzt gefehlt hat:
 * der Schutz aus Stufe 2 greift nur, solange der Text *mit* `---` beginnt.
 * Steht ein Satz davor, fiel ein nacktes Deck bis zum Schnitt durch — und der
 * nahm dessen inneren Codeblock. Gemessen wurde beides: mit äußerem Zaun fehlte
 * alles hinter dem inneren Block, ohne äußeren Zaun blieb vom ganzen Deck
 * `const a = 1;` übrig.
 *
 * Zwei Regeln tragen die Reparatur. Ein Frontmatter **vor** dem ersten Zaun
 * heißt: der Zaun gehört zum Deck und nicht um es herum. Und geschnitten wird
 * bis zum **letzten** Zaun und nicht bis zum nächsten — der nächste ist bei
 * einem Deck mit Codeblock dessen Öffner.
 */

/** Ist diese Zeile ein Zaun? */
function zaunzeile(zeile: string): boolean {
  return zeile.trimStart().startsWith('```');
}

/** Beginnt hier ein Deck mit seinem eigenen Frontmatter? */
function nacktesDeck(text: string): boolean {
  return text.startsWith('---');
}

export function ohneCodezaun(input: string): string {
  const text = input.trim();

  // 1 · Der Zaun steht ganz vorn: verankert schneiden. Ein innerer Zaun im
  //     Inhalt bleibt damit unberührt — das `$` am Ende zwingt bis zum letzten.
  const verankert = /^```[a-zA-Z0-9]*\n([\s\S]*?)\n?```$/.exec(text);
  if (verankert) return verankert[1];

  // 2 · Ein nacktes Deck wird nicht angefasst, auch wenn ein Codeblock darin
  //     steht. Ohne diese Zeile schnitte Schritt 4 gleich dessen Inhalt heraus.
  if (nacktesDeck(text)) return text;

  const zeilen = text.split('\n');
  const erste = zeilen.findIndex(zaunzeile);
  if (erste < 0) return text;

  /*
     3 · Ein nacktes Deck **mit einem Satz davor**. Das war die Lücke, und sie
     stand als Schutz im Kopf dieser Datei, ohne dass der Code sie hatte:
     Schritt 2 fängt den Fall nur, solange der Text mit `---` beginnt. Steht
     „Klar, hier ist das Deck:" davor, fiel er weiter — und der Schnitt nahm
     den *inneren* Codeblock. Gemessen: aus einem Deck mit einem ```ts-Block
     wurde `const a = 1;`, das ganze Deck ersetzt durch den Inhalt seines
     Codeblocks.

     Erkannt wird es daran, dass **vor** dem ersten Zaun schon ein Frontmatter
     steht. Dann ist der Zaun Teil des Decks und nicht seine Verpackung.
  */
  const vorspann = zeilen.slice(0, erste);
  if (vorspann.some((zeile) => zeile.trim() === '---')) return text;

  /*
     4 · Vorrede und Nachrede um einen Zaun — der häufigste Fall überhaupt.
     Geschnitten wird bis zum **letzten** Zaun und nicht bis zum nächsten: der
     nächste ist bei einem Deck mit Codeblock dessen Öffner, und der Inhalt
     hörte dann mitten in der ersten Folie auf.
  */
  const letzte = zeilen.length - 1 - [...zeilen].reverse().findIndex(zaunzeile);
  if (letzte <= erste) return text;
  return zeilen.slice(erste + 1, letzte).join('\n');
}
