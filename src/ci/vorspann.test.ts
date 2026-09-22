/**
 * Der Prompt für ein angehängtes Artefakt.
 *
 * Der Generator händigt seit je einen Prompt aus, mit dem ein Sprachmodell den
 * Entwurf ausfüllt — gedacht für Markenrichtlinien, also für eine Quelle, die
 * ihre Werte *benennt*. Eine Präsentation benennt sie nicht, sie benutzt sie,
 * und die beiden gehen weit auseinander: gemessen an einer echten Vorlage
 * trugen das Farbschema und die Vorgabestile des Masters unverändertes
 * Office-Standard, während die Marke auf den Folien stand.
 *
 * Geprüft wird deshalb zweierlei. Dass der Artefakt-Prompt die sechs Stellen
 * nennt, an denen das schiefgeht — und, wichtiger, dass er **sonst nichts
 * ändert**: Form, Regeln und das, was nicht geliefert wird, sind Zeichen für
 * Zeichen dieselben. Zwei Verträge für einen Leser wären genau der zweite Weg,
 * den die erste Regel dieses Projekts verbietet.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUNKT_JE_EINHEIT } from '@/theme';
import { PDF_SCALE } from '@/lib/export/pdf';
import { leererEntwurf } from './entwurf';
import { promptText, promptquellen, type Promptquelle } from './prompt';

const quelle = (datei: string) => readFileSync(join(process.cwd(), 'src', 'ci', datei), 'utf8');

/** Den Prompt in seine `##`-Abschnitte zerlegen, Überschrift als Schlüssel. */
function abschnitte(text: string): Map<string, string> {
  const aus = new Map<string, string>();
  let name = '(Kopf)';
  let zeilen: string[] = [];
  for (const zeile of text.split('\n')) {
    if (zeile.startsWith('## ')) {
      aus.set(name, zeilen.join('\n'));
      name = zeile.slice(3).trim();
      zeilen = [];
    } else {
      zeilen.push(zeile);
    }
  }
  aus.set(name, zeilen.join('\n'));
  return aus;
}

const WOHER = 'Woher die Werte kommen';

describe('die Quelle belegt einen Abschnitt und sonst nichts', () => {
  it('lässt jeden anderen Abschnitt Zeichen für Zeichen gleich', () => {
    /*
       Die eigentliche Zusicherung dieser Datei. Ein zweiter Prompt daneben
       wäre bequemer gewesen und hätte genau die Fehlerklasse gebaut, die in
       `CLAUDE.md` ein Dutzend Mal steht: zwei Rechnungen für dieselbe Frage
       laufen auseinander, und man sieht es erst an der fremden Antwort — hier
       an einer, die der Leser plötzlich nicht mehr kennt.
    */
    const a = abschnitte(promptText(leererEntwurf(), 'richtlinien'));
    const b = abschnitte(promptText(leererEntwurf(), 'artefakt'));

    expect([...b.keys()]).toEqual([...a.keys()]);
    for (const name of a.keys()) {
      if (name === WOHER) continue;
      expect(b.get(name), name).toBe(a.get(name));
    }
    // Und der eine Abschnitt ist wirklich ein anderer.
    expect(b.get(WOHER)).not.toBe(a.get(WOHER));
  });

  it('nimmt „Markenrichtlinien" ohne Quelle an', () => {
    // Die Vorgabe ist der bisherige Prompt. Wer `promptText(entwurf)` ruft —
    // und das tun `ruecklauf.test.ts` und jeder künftige Aufrufer —, bekommt,
    // was er immer bekam.
    expect(promptText(leererEntwurf())).toBe(promptText(leererEntwurf(), 'richtlinien'));
  });

  it('verbietet unter jeder Quelle den Platzhalter', () => {
    /*
       Der Satz stand im alten, gemeinsamen Text, und beim Aufteilen ist genau
       so etwas zu verlieren: er wandert in einen der beiden Zweige und fehlt
       im anderen. „Ein Feld, das du nicht belegen kannst, lässt du weg" ist
       die Zusage, an der der Bericht „kam nicht" überhaupt hängt.
    */
    for (const q of promptquellen) {
      const text = promptText(leererEntwurf(), q);
      expect(text, q).toContain('TODO');
      expect(text, q).toContain('lässt du weg');
    }
  });
});

describe('was der Artefakt-Prompt zusätzlich sagt', () => {
  const text = promptText(leererEntwurf(), 'artefakt');

  it('warnt vor dem Standard-Farbschema — dem teuersten Fehler', () => {
    /*
       Gemessen an der Vorlage, die diese Runde ausgelöst hat: `theme1.xml`
       trug `clrScheme name="Office"` mit #4F81BD, das Schriftschema Arial,
       und die Vorgabestile des Masters Arial 14 pt auf allen neun Ebenen. Ein
       Modell, das brav „das Theme" abliest, liefert daraus ein vollständiges,
       plausibles und vollständig falsches Erscheinungsbild.
    */
    expect(text).toContain('theme1.xml');
    expect(text).toContain('#4F81BD');
    expect(text).toContain('Folienmaster');
  });

  it('nennt dieselbe Umrechnung, mit der der PDF-Weg rechnet', () => {
    /*
       Der Punkt, an dem eine zweite Wahrheit entstanden wäre. Die Zahl stand
       an drei Stellen: als `PDF_SCALE`, als nackte 0,75 im PPTX-Weg und als
       Satz im Prompt. Jetzt an einer — und geprüft wird das am *Ergebnis*,
       also daran, dass im Prompt wirklich die gerechneten Beispiele stehen
       und nicht zwei zufällig gleiche Zahlen.
    */
    expect(PDF_SCALE).toBe(PUNKT_JE_EINHEIT);
    expect(text).toContain(String(PUNKT_JE_EINHEIT).replace('.', ','));
    expect(text).toContain(`Aus 60 pt werden ${60 / PUNKT_JE_EINHEIT}`);
    expect(text).toContain(`aus 18 pt`);
    expect(text).toContain(`werden ${18 / PUNKT_JE_EINHEIT}`);
  });

  it('zeigt nur Beispiele, die ganze Zahlen sind', () => {
    // Ein Prompt, der „aus 60 pt werden 79,99999" sagt, ist an der Stelle
    // unbrauchbar, an der es auf Genauigkeit ankommt. Die beiden Beispiele
    // sind so gewählt, dass sie aufgehen — wer die Konstante ändert, wird
    // hier rot und sucht sich zwei neue.
    expect(Number.isInteger(60 / PUNKT_JE_EINHEIT)).toBe(true);
    expect(Number.isInteger(18 / PUNKT_JE_EINHEIT)).toBe(true);
  });

  it('sagt, dass ein Verlauf zwei Farben sind', () => {
    // Die Vorlage der Runde trug einen Verlauf von #F8AA1E nach #FB9800; die
    // CI kennt nur Vollton. Ungesagt liefert ein Modell eine der beiden und
    // unterschlägt die andere.
    expect(text).toContain('Verlauf');
    expect(text).toContain('signalStrong');
  });

  it('steht nicht im Prompt für Markenrichtlinien', () => {
    /*
       Die Gegenrichtung, und sie ist hier die eigentliche: ein Vorspann, der
       immer dasteht, ist kein Vorspann, sondern eine Verlängerung — und er
       erklärt dann einem Modell, das ein PDF mit Richtlinien vor sich hat,
       ausführlich die Innereien einer .pptx.
    */
    const richtlinien = promptText(leererEntwurf(), 'richtlinien');
    expect(richtlinien).not.toContain('theme1.xml');
    expect(richtlinien).not.toContain('#4F81BD');
    expect(richtlinien).not.toContain('Folien-Einheiten, nicht Punkt');
  });
});

describe('das Formular', () => {
  const anfang = quelle('Anfang.tsx');

  it('reicht die Quelle wirklich an den Prompt durch', () => {
    /*
       Dieselbe Bauart wie `replaceGuard.test.ts` und die Nähte in
       `naht.test.ts`: die Rechnung kann stimmen und die Bedienfläche sie
       trotzdem nicht rufen. Gemessen wird an der Quelle, weil die Naht in
       einer Komponente sitzt.
    */
    expect(anfang).toContain('promptText(entwurf, quelle)');
    // Und der Merker hängt an beidem — sonst bliebe der Prompt beim Umschalten
    // stehen, und der Knopf kopierte den vorigen Text.
    expect(anfang).toContain('[entwurf, quelle]');
  });

  it('bietet jede Quelle zur Wahl an', () => {
    // Gelesen und nicht getippt: käme eine dritte Quelle dazu und stünde sie
    // nicht im Formular, wäre sie ein Zweig, den niemand erreicht.
    for (const q of promptquellen) {
      expect(anfang, q).toContain(`value: '${q}'`);
    }
  });

  it('merkt sich die Quelle nicht im Entwurf', () => {
    /*
       Sie beschreibt, was gerade neben dem Rechner liegt, und nicht die
       Marke. Stünde sie im Entwurf, ginge sie in die `.nzci.json` und käme
       morgen mit einer Auskunft zurück, die niemanden mehr angeht.
    */
    expect(Object.keys(leererEntwurf())).not.toContain('quelle');
  });
});

/** Damit der Typ wirklich benutzt wird und nicht nur importiert dasteht. */
const _typprobe: Promptquelle = 'artefakt';
void _typprobe;
