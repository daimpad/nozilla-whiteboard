/**
 * Eine Schrift, die es nirgends gibt — für die Prüfungen des Hochladens.
 *
 * Wer das Hochladen prüft, braucht eine Familie, die **nicht** in der
 * Bibliothek steht: `waehlbareFamilie()` nimmt bei gleichem Namen die
 * Bibliothek, und eine Prüfung mit Inter prüfte die Bibliothek. Gebaut wird
 * sie aus einem echten Schnitt, in dem nur der Name ausgetauscht ist — eine
 * von Hand gebaute Mini-Schrift prüfte den Leser gegen die Vorstellung dessen,
 * der sie gebaut hat.
 *
 * Getauscht wird nur innerhalb der `name`-Tabelle und nur gleich lang: jede
 * Länge und jeder Versatz bleibt, wie er war. Die Prüfsumme der Tabelle stimmt
 * danach nicht mehr; Chromium rechnet sie nicht nach, und `parseTrueType()`
 * liest sie nicht.
 *
 * Geteilt von `vitest` und dem Rauchtest, deshalb JavaScript und hier.
 */
export function probeschrift(bytes, alt = 'Inter', neu = 'Probe') {
  if (alt.length !== neu.length) throw new Error('Alter und neuer Name müssen gleich lang sein');
  const kopie = bytes.slice(0);
  const view = new DataView(kopie);
  let name = null;
  for (let i = 0; i < view.getUint16(4); i += 1) {
    const eintrag = 12 + i * 16;
    const tag = String.fromCharCode(...new Uint8Array(kopie, eintrag, 4));
    if (tag === 'name')
      name = { offset: view.getUint32(eintrag + 8), laenge: view.getUint32(eintrag + 12) };
  }
  if (!name) throw new Error('Die Schrift hat keine name-Tabelle');
  const tabelle = new Uint8Array(kopie, name.offset, name.laenge);
  const muster = [
    [[...alt].flatMap((z) => [0, z.charCodeAt(0)]), [...neu].flatMap((z) => [0, z.charCodeAt(0)])],
    [[...alt].map((z) => z.charCodeAt(0)), [...neu].map((z) => z.charCodeAt(0))],
  ];
  let getauscht = 0;
  for (const [suche, ersatz] of muster) {
    for (let i = 0; i + suche.length <= tabelle.length; i += 1) {
      if (suche.every((byte, j) => tabelle[i + j] === byte)) {
        tabelle.set(ersatz, i);
        getauscht += 1;
      }
    }
  }
  if (!getauscht) throw new Error(`„${alt}" steht nicht in der name-Tabelle`);
  return kopie;
}
