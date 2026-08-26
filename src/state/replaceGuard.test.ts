/**
 * Jeder Weg, der das Deck ersetzt, fragt vorher.
 *
 * Diese Prüfung liest Quelltext, und das tut sie aus demselben Grund wie
 * `theme.test.ts`: **der Fehler wurde sechsmal gemacht.** Es gab sechs Wege,
 * das offene Deck zu ersetzen, und genau einer stellte die Frage. Ein
 * siebenter Weg wäre morgen dazugekommen und hätte sie wieder nicht gestellt —
 * eine Prüfung am Ergebnis fängt nur den einen Weg, den sie durchspielt.
 *
 * Geprüft wird deshalb die Regel selbst: wo `loadMarkdown(` oder `newDeck()`
 * gerufen wird, steht in den Zeilen davor ein `darfErsetzen()`. Die einzige
 * Ausnahme trägt einen Vermerk im Code und steht auch hier: der Sitzungsstart
 * ersetzt nichts, er stellt her.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');

/** Der Ruf, der ein Deck an die Stelle des offenen setzt. */
const ERSETZT = /\b(loadMarkdown|loadDeck)\(|\bnewDeck\(\)/;

/**
 * Wie weit zurück nach der Frage gesucht wird.
 *
 * Zwölf Zeilen sind großzügig genug für ein `await` dazwischen und eng genug,
 * dass die Frage noch zum selben Handgriff gehört.
 */
const RUECKBLICK = 12;

/** Der Vermerk, mit dem eine Stelle sich ausdrücklich ausnimmt. */
const AUSNAHME = 'Sitzungsstart';

/**
 * Kommentare leeren — aber die Zeilen stehen lassen.
 *
 * Zwei Gründe, und beide sind Fehler aus dem ersten Anlauf.
 *
 * **Geleert**, weil die erste Fassung ihre eigene Gegenprobe überlebte: im
 * Beispiel-Menü stand über dem Ruf ein Kommentar, der `darfErsetzen()`
 * *erwähnte*. Als der echte Ruf entfernt wurde, blieb die Erwähnung stehen —
 * und das Sieb war zufrieden. Ein Wächter, den ein Satz Prosa besänftigt,
 * bewacht nichts.
 *
 * **Und nicht entfernt**, weil das die Zeilennummern verschiebt. Die zweite
 * Fassung schnitt heraus, und danach zeigte der Rückblick auf den Vermerk ins
 * Leere: gemeldet wurde eine Stelle, die sich ausdrücklich ausnimmt.
 */
function leereKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

function quellen(dir: string): string[] {
  return readdirSync(dir).flatMap((eintrag) => {
    const pfad = join(dir, eintrag);
    if (statSync(pfad).isDirectory()) return quellen(pfad);
    return /\.tsx?$/.test(pfad) && !/\.test\.tsx?$/.test(pfad) ? [pfad] : [];
  });
}

describe('jeder Weg, der das Deck ersetzt', () => {
  it('fragt vorher', () => {
    const ungefragt: string[] = [];

    for (const datei of quellen(ROOT)) {
      // Der Store *ist* der Ersetzer; er kann sich nicht selbst fragen.
      if (datei.endsWith('deckStore.ts')) continue;

      const roh = readFileSync(datei, 'utf8').split('\n');
      // Der Vermerk für den Sitzungsstart steht bewusst *in* einem Kommentar;
      // er wird deshalb an den rohen Zeilen gesucht, der Ruf am Code. Beide
      // Fassungen haben dieselben Zeilennummern — sonst zeigte der Rückblick
      // auf die falsche Stelle.
      const zeilen = leereKommentare(roh.join('\n')).split('\n');
      zeilen.forEach((zeile, index) => {
        // Der Ruf selbst, nicht seine Herleitung aus dem Store.
        if (!ERSETZT.test(zeile)) return;
        if (/=\s*useDeckStore|const\s+\{/.test(zeile)) return;

        const davor = zeilen.slice(Math.max(0, index - RUECKBLICK), index + 1).join('\n');
        if (/darfErsetzen\(\)/.test(davor)) return;
        const vermerk = roh.slice(Math.max(0, index - RUECKBLICK), index + 1).join('\n');
        if (vermerk.includes(AUSNAHME)) return;

        const name = datei.slice(ROOT.length + 1);
        ungefragt.push(`${name}:${index + 1}  ${zeile.trim()}`);
      });
    }

    expect(ungefragt).toEqual([]);
  });

  it('kennt die Frage überhaupt', () => {
    // Das Sieb über dem Sieb: eines, das nichts fände, wäre grün und nutzlos.
    const wege = quellen(ROOT)
      .filter((datei) => !datei.endsWith('deckStore.ts'))
      .flatMap((datei) => readFileSync(datei, 'utf8').split('\n'))
      .filter((zeile) => ERSETZT.test(zeile) && !/=\s*useDeckStore|const\s+\{/.test(zeile));

    // Sechs ersetzende Wege plus zwei beim Sitzungsstart — die genaue Zahl
    // darf wachsen, aber ganz ohne wäre die Prüfung eine Attrappe.
    expect(wege.length).toBeGreaterThanOrEqual(6);
  });
});
