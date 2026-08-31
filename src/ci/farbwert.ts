/**
 * Was jemand hinschreibt, wenn er eine Farbe meint — und was daraus wird.
 *
 * Ein Styleguide nennt seine Farben mal `#E4003A`, mal `e4003a`, mal
 * `rgb(228, 0, 58)`, mal `#e43` als Kurzform. Alle vier meinen dasselbe, und
 * genau eine davon lässt sich anmelden: `withAlpha()` wirft schon beim Anlegen
 * über allem, was nicht `#RRGGBB` ist, und `tonesOutsidePalette()` vergleicht
 * Zeichenketten — `#ffffff` und `#FFFFFF` sind für sie zwei Farben.
 *
 * ## Warum das *eine* Funktion ist und keine zwei
 *
 * Zwei Stellen brauchen dieselbe Antwort: das Farbfeld im Formular, wenn
 * jemand eine Farbe hineinkopiert, und der Rücklauf des Sprachmodells, wenn
 * dort `rgb(…)` steht. Zwei Rechnungen für dieselbe Frage liefen in diesem
 * Projekt schon auseinander (die Spaltenbreiten der Tabelle), und man sähe es
 * erst an der fremden Datei.
 *
 * ## Und warum sie sagt, *was* sie getan hat
 *
 * Eine stille Korrektur ist eine Behauptung: „das war gemeint". Wer `#E4003` —
 * fünf Stellen, eine vertippt — hineinkopiert, bekommt sonst wortlos irgendein
 * Rot. Der zweite Rückgabewert ist deshalb der Satz, den die Oberfläche
 * anzeigt; ist er leer, war nichts zu tun.
 */

export interface Farbkorrektur {
  /** Der Wert in der einen Form, die sich anmelden lässt: `#RRGGBB`, groß. */
  wert: string;
  /** Was dabei geschah — leer, wenn nichts zu tun war. */
  wie: string;
}

/** Zwei Stellen Hex zu einem Kanal, oder `null`. */
function kanal(zahl: number): string {
  return Math.max(0, Math.min(255, Math.round(zahl)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * Ist diese Deckkraft voll?
 *
 * Sie kommt in zwei Schreibweisen, und **eine Zahl allein entscheidet die
 * Frage nicht**: `rgba(228, 0, 58, 0.5)` ist halb durchsichtig, und
 * `rgb(228 0 58 / 50%)` meint dasselbe — nur steht dort die 50, und 50 ist
 * größer als 1. Die vorige Fassung fragte `parseFloat(…) < 1` und hielt die
 * Prozentform deshalb für deckend: derselbe Wert, einmal gemeldet und einmal
 * stumm verschluckt. Und die stumme Hälfte ist die häufigere — die
 * Schrägstrich-Schreibweise ist die, die ein Sprachmodell heute schreibt.
 */
function deckend(roh: string | undefined): boolean {
  if (roh === undefined) return true;
  const zahl = Number.parseFloat(roh);
  // Was sich nicht lesen lässt, gilt als deckend: eine Behauptung „die
  // Deckkraft fiel weg" über einem Wert, den niemand entziffern kann, wäre
  // eine Auskunft mehr, als hier zu haben ist.
  if (!Number.isFinite(zahl)) return true;
  return roh.trim().endsWith('%') ? zahl >= 100 : zahl >= 1;
}

/**
 * Aus einer Eingabe die kanonische Form — oder `null`, wenn sich nichts
 * Vernünftiges daraus lesen lässt.
 *
 * `null` ist ausdrücklich kein Notfallwert: die vorige Fassung des Farbfelds
 * zeigte bei einer unlesbaren Eingabe `#000000` im Wähler, und ein Schwarz,
 * das niemand gewählt hat, sieht aus wie eine Entscheidung.
 */
export function normalisiereFarbe(roh: string): Farbkorrektur | null {
  const wert = (roh ?? '').trim();
  if (!wert) return null;

  if (/^#[0-9a-fA-F]{6}$/.test(wert)) {
    const gross = wert.toUpperCase();
    return { wert: gross, wie: gross === wert ? '' : 'in Großschrift gebracht' };
  }

  // Die Kurzform. Sie steht in jedem zweiten Styleguide und ist die einzige
  // Schreibweise, die sich verlustfrei ausschreiben lässt.
  if (/^#[0-9a-fA-F]{3}$/.test(wert)) {
    const lang = `#${[...wert.slice(1)].map((z) => z + z).join('')}`.toUpperCase();
    return { wert: lang, wie: `aus der Kurzform „${wert}" ausgeschrieben` };
  }

  // Ohne Raute — der häufigste Kopierfehler aus einer Tabelle.
  if (/^[0-9a-fA-F]{6}$/.test(wert)) {
    return { wert: `#${wert.toUpperCase()}`, wie: 'die fehlende Raute ergänzt' };
  }
  if (/^[0-9a-fA-F]{3}$/.test(wert)) {
    const lang = `#${[...wert].map((z) => z + z).join('')}`.toUpperCase();
    return { wert: lang, wie: `aus der Kurzform „${wert}" ausgeschrieben` };
  }

  const rgb =
    /^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)\s*(?:[,/]\s*([0-9.%]+)\s*)?\)$/i.exec(wert);
  if (rgb) {
    const zahlen = [rgb[1], rgb[2], rgb[3]].map(Number);
    if (zahlen.some((z) => !Number.isFinite(z))) return null;
    const hex = `#${zahlen.map(kanal).join('')}`.toUpperCase();
    /*
       Die Deckkraft fällt weg, und das gehört gesagt. Eine Palettenrolle ist
       immer deckend — die drei Deckkraftstufen rechnet `alphaStufen()` selbst
       aus der Tinte und dem Papier, und eine halbdurchsichtige Signalfarbe
       gäbe es an keiner Stelle des Mischers.
    */
    const durchsichtig = !deckend(rgb[4]);
    return {
      wert: hex,
      wie: durchsichtig
        ? `aus „${wert}" gerechnet — die Deckkraft fiel dabei weg, eine Palettenrolle ist immer deckend`
        : `aus „${wert}" gerechnet`,
    };
  }

  return null;
}
