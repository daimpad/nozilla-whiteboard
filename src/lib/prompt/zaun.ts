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
 * Deshalb die Reihenfolge unten: steht der Zaun ganz vorn, ist die Antwort
 * eingezäunt und der äußere Zaun fällt (innere bleiben, weil verankert
 * geschnitten wird). Steht dort ein `---`, ist es ein nacktes Deck mit seinem
 * eigenen Frontmatter und es wird gar nicht geschnitten. Erst wenn beides nicht
 * zutrifft, ist ein Satz davor im Spiel — und genau dieser Fall kam vorher
 * nicht durch.
 */

/** Beginnt hier ein Deck mit seinem eigenen Frontmatter? */
function nacktesDeck(text: string): boolean {
  return text.startsWith('---');
}

export function ohneCodezaun(input: string): string {
  const text = input.trim();

  // 1 · Der Zaun steht ganz vorn: verankert schneiden. Ein innerer Zaun im
  //     Inhalt bleibt damit unberührt — `[\s\S]*?` ist nicht gierig, aber das
  //     `$` am Ende zwingt bis zum letzten.
  const verankert = /^```[a-zA-Z0-9]*\n([\s\S]*?)\n?```$/.exec(text);
  if (verankert) return verankert[1];

  // 2 · Ein nacktes Deck wird nicht angefasst, auch wenn ein Codeblock darin
  //     steht. Ohne diese Zeile schnitte Schritt 3 gleich dessen Inhalt heraus.
  if (nacktesDeck(text)) return text;

  // 3 · „Klar, hier ist die CI:" davor und „Soll ich noch …?" dahinter — der
  //     häufigste Fall überhaupt, und der einzige, den die vorige, durchweg
  //     verankerte Fassung nicht kannte.
  const mitVorspann = /```[a-zA-Z0-9]*\n([\s\S]*?)\n?```/.exec(text);
  return mitVorspann ? mitVorspann[1] : text;
}
