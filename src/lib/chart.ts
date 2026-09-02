/**
 * Zahlen lesen.
 *
 * Ein Diagramm hält seine Werte als **Textblock**, eine Zeile je Wert, und
 * nicht als Liste von Objekten. Der Grund ist die Bedienung: man soll die
 * Zahlen tippen können — im Inspektor, im Deck-Prompt, in der `.md`. Ein
 * Formular mit „Zeile hinzufügen" wäre mehr Klicks für weniger.
 *
 * Getrennt wird großzügig: Tabulator, Semikolon, senkrechter Strich oder zwei
 * Leerzeichen. Damit lässt sich aus einer Tabellenkalkulation kopieren, ohne
 * vorher aufzuräumen — und ein Wert mit Leerzeichen im Namen („Erstes
 * Quartal") bleibt heil, weil ein *einzelnes* Leerzeichen nicht trennt.
 *
 * Ein `*` am Zeilenanfang hebt einen Wert hervor. Die CI erlaubt höchstens ein
 * Signal-Element pro Folie; in einem Diagramm ist das der eine Balken, auf den
 * es ankommt. Mehrere Sterne wären ein Verstoß, den niemand bemerkt — deshalb
 * gilt der erste und die übrigen werden zu gewöhnlichen Werten.
 */

export interface Datenpunkt {
  label: string;
  value: number;
  /** Der eine hervorgehobene Wert. */
  signal: boolean;
}

const TRENNER = /\t|\s*[;|]\s*|\s{2,}/;

export function parseChartData(source: string): Datenpunkt[] {
  const out: Datenpunkt[] = [];
  let schonHervorgehoben = false;

  for (const roh of source.split('\n')) {
    const zeile = roh.trim();
    if (!zeile) continue;

    const hervor = zeile.startsWith('*');
    const ohneStern = hervor ? zeile.slice(1).trim() : zeile;

    const teile = ohneStern.split(TRENNER).filter(Boolean);
    if (teile.length === 0) continue;

    // Die Zahl steht hinten. Vorne kann alles stehen, auch mit Leerzeichen.
    const zahl = zahlAus(teile[teile.length - 1]);
    if (zahl === null) continue;

    out.push({
      label: teile.slice(0, -1).join(' ').trim(),
      value: zahl,
      signal: hervor && !schonHervorgehoben,
    });
    if (hervor) schonHervorgehoben = true;
  }
  return out;
}

/**
 * Eine Zahl aus dem, was in der Zelle steht.
 *
 * Deutsche Schreibweise inbegriffen: „1.240,5" ist eintausendzweihundertvierzig
 * Komma fünf, und ein Prozentzeichen oder ein Euro dahinter stört nicht. Wer
 * seine Zahlen aus einer Tabellenkalkulation kopiert, kopiert sie so.
 */
function zahlAus(text: string): number | null {
  const sauber = text.replace(/[^\d,.-]/g, '');
  if (!sauber) return null;

  /*
     Punkte sind Tausendertrenner, wenn ein Komma dabeisteht — oder wenn es
     mehr als einen gibt.

     Der zweite Fall fehlte, und er ist der häufigere: eine deutsche Ganzzahl
     hat kein Komma. Aus „1.234.567" wurde `Number('1.234.567')` und damit
     `NaN`, und `parseChartData` warf die ganze Zeile weg — die Reihe hatte
     danach einen Balken weniger, ohne ein Wort. Der Kopf dieser Datei
     verspricht im selben Atemzug deutsche Schreibweise.

     Beim *einzelnen* Punkt bleibt es beim Bisherigen: „3.5" ist drei Komma
     fünf und nicht fünfunddreißig. Wer „1.240" meint, schreibt es entweder
     mit einem zweiten Punkt oder ohne Trenner — raten wäre hier schlimmer als
     lesen.
  */
  const punkte = (sauber.match(/\./g) ?? []).length;
  const normalisiert = sauber.includes(',')
    ? sauber.replace(/\./g, '').replace(',', '.')
    : punkte > 1
      ? sauber.replace(/\./g, '')
      : sauber;

  const zahl = Number(normalisiert);
  return Number.isFinite(zahl) ? zahl : null;
}

/**
 * Die Achse, gegen die gezeichnet wird.
 *
 * Sie beginnt bei null, solange alle Werte positiv sind — ein Balkendiagramm,
 * dessen Achse bei 38 anfängt, macht aus vier Prozent Unterschied einen
 * doppelt so hohen Balken. Das ist die verbreitetste Art, mit einem Diagramm
 * zu lügen, und sie passiert meist aus Versehen.
 */
export function chartScale(punkte: readonly Datenpunkt[]): { min: number; max: number } {
  if (punkte.length === 0) return { min: 0, max: 1 };
  const werte = punkte.map((p) => p.value);
  const max = Math.max(...werte, 0);
  const min = Math.min(...werte, 0);
  // Eine Reihe aus lauter Nullen hätte sonst keine Höhe.
  return max === min ? { min, max: min + 1 } : { min, max };
}
