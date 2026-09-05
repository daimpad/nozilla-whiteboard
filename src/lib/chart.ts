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

/**
 * Was gelesen wurde — und was nicht.
 *
 * Die zweite Hälfte ist der Grund, warum es diese Schnittstelle gibt. Eine
 * Zeile ohne lesbare Zahl fiel bisher wortlos heraus, und die Reihe hatte
 * danach einen Balken weniger; dass es dieselbe Stille ist wie beim leeren
 * `catch` der Selbstsicherung, steht in `CLAUDE.md` schon einmal. Gerechnet
 * wird beides an einer Stelle: der Zeichner nimmt `punkte`, der Inspektor
 * `ungelesen`.
 */
export interface Chartlese {
  readonly punkte: Datenpunkt[];
  /** Zeilen mit Inhalt, aus denen keine Zahl zu lesen war — wortgleich. */
  readonly ungelesen: string[];
}

const TRENNER = /\t|\s*[;|]\s*|\s{2,}/;

export function parseChartData(source: string): Datenpunkt[] {
  return liesChart(source).punkte;
}

export function liesChart(source: string): Chartlese {
  const punkte: Datenpunkt[] = [];
  const ungelesen: string[] = [];
  let schonHervorgehoben = false;

  for (const roh of source.split('\n')) {
    const zeile = roh.trim();
    if (!zeile) continue;

    const hervor = zeile.startsWith('*');
    const ohneStern = hervor ? zeile.slice(1).trim() : zeile;

    const teile = ohneStern.split(TRENNER).filter(Boolean);

    // Die Zahl steht hinten. Vorne kann alles stehen, auch mit Leerzeichen.
    const zahl = zahlAus(teile[teile.length - 1] ?? '');
    if (zahl === null) {
      ungelesen.push(zeile);
      continue;
    }

    punkte.push({
      label: teile.slice(0, -1).join(' ').trim(),
      value: zahl,
      signal: hervor && !schonHervorgehoben,
    });
    if (hervor) schonHervorgehoben = true;
  }
  return { punkte, ungelesen };
}

/**
 * Was in einer Zelle wie eine Zahl aussieht.
 *
 * Ziffern, dazwischen die Trenner, die *in* einer Zahl vorkommen dürfen —
 * Punkt, Komma, Leerzeichen, geschütztes Leerzeichen, Apostroph —, und ein
 * Minus unmittelbar davor.
 */
const ZAHL = /-?\d[\d.,'\u00a0\u202f ]*\d|-?\d/g;

/**
 * Eine Zahl aus dem, was in der Zelle steht.
 *
 * Deutsche Schreibweise inbegriffen: „1.240,5" ist eintausendzweihundertvierzig
 * Komma fünf, und ein Prozentzeichen oder ein Euro dahinter stört nicht. Wer
 * seine Zahlen aus einer Tabellenkalkulation kopiert, kopiert sie so.
 *
 * Gesucht wird die Zahl — früher wurde alles andere **weggeworfen**
 * (`replace(/[^\d,.-]/g, '')`), und das ist etwas anderes: es macht aus jeder
 * Zelle irgendeine Zahl. Gemessen am fertigen SVG stand danach über dem
 * Balken „13", wo „1e3" in der Zelle steht, und „1,2" für „1,23E+09" — die
 * Schreibweise, in der eine Tabellenkalkulation große Zahlen ausgibt. Eine
 * mit Komma getrennte Zeile („Region,12") wurde zu 0,12 ohne Beschriftung:
 * ein Diagramm aus lauter Nullen, ohne ein Wort. Und ein Bindestrich im Namen
 * wurde zum Vorzeichen — „Nord-West 12" zeichnete einen Balken nach unten.
 *
 * Deshalb die Bedingung: **genau eine** Zahl in der Zelle. Zierrat davor und
 * dahinter darf, solange keine Ziffer darin steht. „12 - 15" ist keine Zahl,
 * „1e3" auch nicht — und was nicht gelesen wurde, steht in `ungelesen` und
 * wird im Inspektor genannt, statt still zu einem erfundenen Wert zu werden.
 */
function zahlAus(text: string): number | null {
  const treffer = text.match(ZAHL);
  if (!treffer || treffer.length !== 1) return null;

  const sauber = treffer[0].replace(/['\s]/g, '');
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
 *
 * Gesucht wird in einer Schleife und nicht mit `Math.max(...werte)`: ein
 * gespreiztes Array ist eine Argumentliste, und die ist begrenzt. Gemessen
 * warf es ab rund 130.000 Werten `RangeError: Maximum call stack size
 * exceeded` — und weil diese Rechnung beim Zeichnen in einem `useMemo` läuft,
 * wäre das ein weißes Fenster. Eine eingefügte Tabellenkalkulation hat so
 * viele Zeilen nicht oft, aber sie kann sie haben.
 */
export function chartScale(punkte: readonly Datenpunkt[]): { min: number; max: number } {
  if (punkte.length === 0) return { min: 0, max: 1 };
  let max = 0;
  let min = 0;
  for (const punkt of punkte) {
    if (punkt.value > max) max = punkt.value;
    if (punkt.value < min) min = punkt.value;
  }
  // Eine Reihe aus lauter Nullen hätte sonst keine Höhe.
  return max === min ? { min, max: min + 1 } : { min, max };
}
