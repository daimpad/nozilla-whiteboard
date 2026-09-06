/**
 * Was ein CI-Sync verändern würde — als Rechnung, die man prüfen kann.
 *
 * `sync-ci.mjs` ist ein Skript: es läuft von oben nach unten, schreibt Dateien
 * und beendet den Prozess. Das lässt sich nicht importieren und damit auch
 * nicht prüfen. Die drei Fragen, auf die es beim Schreiben ankommt, stehen
 * deshalb hier — an einer Stelle, mit zwei Kunden: dem Skript und
 * `ciAbgleich.test.mjs`.
 *
 * Die Fragen sind:
 *
 *   1. Welche Einträge stehen in einer erzeugten Datei?
 *   2. Welche davon würde ein Lauf *verlieren*?
 *   3. Steht in der neuen Geometrie irgendwo eine Zahl, die keine ist?
 *
 * Die dritte klingt weit hergeholt und ist es nicht: `<rect width="8">` ohne
 * `x` ergibt `+undefined`, also `NaN`, und eine erzeugte Datei mit `x: NaN`
 * übersetzt, besteht Prettier und zeichnet danach in jeder Ausgabe still
 * falsch. Denselben Fehler gab es im CI-Generator schon einmal.
 */

/**
 * Die Schlüssel einer erzeugten Datei.
 *
 * Gelesen wird die Zeilenform, die `sync-ci.mjs` selbst schreibt: zwei
 * Leerzeichen, der Name in Anführungszeichen, ein Doppelpunkt. Das ist kein
 * Parser und will keiner sein — es liest eine Datei, die dieselbe Hand
 * geschrieben hat.
 */
export function schluesselAus(inhalt) {
  return [...String(inhalt ?? '').matchAll(/^ {2}"([^"]+)":/gm)].map((treffer) => treffer[1]);
}

/**
 * Was beim Überschreiben verschwände — die Schlüssel, die es nur noch im
 * alten Stand gibt.
 *
 * Gemessen an einem Fall, der wirklich eintrat: die erzeugte Datei führte 92
 * Kern-Zeichen, der Checkout des CI-Repos brachte 37 mit, und `--check`
 * meldete „Prüfung bestanden". Ein Lauf hätte 55 Zeichen aus dem Werkzeug
 * genommen — auf jeder Folie, die eines davon benutzt.
 */
export function verlust(alterInhalt, neuerInhalt) {
  const neu = new Set(schluesselAus(neuerInhalt));
  return schluesselAus(alterInhalt).filter((name) => !neu.has(name));
}

/**
 * Jede Zahl in einer Primitivliste, die keine ist.
 *
 * Zurück kommt der Weg zur Stelle (`3.x`), nicht nur ein Ja: eine Meldung, die
 * nicht sagt, wo es klemmt, kostet die Zeit, die sie sparen soll.
 */
export function krummeZahlen(prims) {
  const funde = [];
  prims.forEach((prim, index) => {
    for (const [schluessel, wert] of Object.entries(prim)) {
      if (typeof wert === 'number' && !Number.isFinite(wert)) {
        funde.push(`${index}.${schluessel}`);
      }
      if (Array.isArray(wert)) {
        wert.forEach((eintrag, stelle) => {
          if (typeof eintrag === 'number' && !Number.isFinite(eintrag)) {
            funde.push(`${index}.${schluessel}[${stelle}]`);
          }
        });
      }
    }
  });
  return funde;
}
