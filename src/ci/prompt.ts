/**
 * Der Prompt, mit dem ein Sprachmodell den Entwurf ausfüllt.
 *
 * ## Warum überhaupt ein Umweg über ein fremdes Werkzeug
 *
 * Weil die Angaben, aus denen ein Erscheinungsbild entsteht, selten in der
 * Form vorliegen, die dieses Formular verlangt. Was vorliegt, ist ein PDF mit
 * Markenrichtlinien, eine Webseite, eine Handvoll Screenshots — und daraus
 * sechzehn Palettenrollen, drei Schriftstapel und eine Größenleiter zu
 * destillieren, ist genau die Arbeit, die ein Sprachmodell gut kann und dieses
 * Werkzeug gar nicht: es hat keinen Zugang zum Netz und soll auch keinen
 * bekommen.
 *
 * Der Generator schreibt deshalb das *Lastenheft* und liest die Antwort
 * zurück. Er ruft dabei nichts auf — der Weg dazwischen führt über die
 * Zwischenablage, und das ist keine Sparsamkeit, sondern dieselbe Linie wie
 * beim ganzen Werkzeug: kein Server, kein Konto, kein Dienst, der mitliest.
 *
 * ## Und warum der Prompt gelesen und nicht getippt ist
 *
 * Jede Rolle, jede Stufe, jeder Erklärungssatz kommt aus `nozillaTheme` und
 * `texte.ts` — denselben Quellen wie das Formular. Ein getippter Prompt wäre
 * eine zweite Wahrheit über die CI: käme morgen eine Palettenrolle dazu, hätte
 * ihn niemand nachgezogen, das Modell ließe sie aus, und der Rücklauf meldete
 * eine Lücke, die keine ist. Genau diese Fehlerklasse steht im Kopf von
 * `entwurf.ts` als Grund dafür, dass die Feldliste gelesen wird.
 */
import { nozillaTheme } from '@/theme';
import {
  paletteRollen,
  pdfSchriften,
  schattenRollen,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  type CiEntwurf,
} from './entwurf';
import {
  LEITERTEXT,
  PALETTENTEXT,
  SCHATTENTEXT,
  SCHRIFTTEXT,
  STRICHTEXT,
  STUFENTEXT,
} from './texte';

/** Eine Zeile „schlüssel — wofür", wie sie im Prompt steht. */
function zeile(schluessel: string, was: string, beispiel: string | number): string {
  return `  "${schluessel}": ${typeof beispiel === 'number' ? beispiel : `"${beispiel}"`}   // ${was}`;
}

/**
 * Der Prompt.
 *
 * `entwurf` geht mit ein, weil das Modell wissen soll, was schon dasteht: wer
 * den Schlüssel und den Markennamen bereits eingetragen hat, will sie nicht
 * erfunden bekommen. Ist noch nichts ausgefüllt, fällt der Abschnitt weg —
 * ein Prompt, der „Schlüssel: (leer)" sagt, lädt zum Raten ein.
 */
export function promptText(entwurf: CiEntwurf): string {
  const bekannt = [
    entwurf.id && `- Schlüssel (id): ${entwurf.id}`,
    entwurf.label && `- Name in der Auswahl: ${entwurf.label}`,
    entwurf.markenname && `- Markenname: ${entwurf.markenname}`,
    entwurf.produkt && `- Produktname: ${entwurf.produkt}`,
  ].filter(Boolean);

  return [
    'Du belegst das Erscheinungsbild einer Marke für ein Präsentationswerkzeug.',
    'Antworte mit **einem** JSON-Objekt und sonst nichts — kein einleitender',
    'Satz, keine Erklärung dahinter, keine Kommentare im JSON.',
    '',
    /*
       Beide Blöcke stehen immer da, und das war einmal anders: „Woher die
       Werte kommen" erschien nur, solange noch nichts ausgefüllt war. Der Weg
       dorthin ist aber der naheliegende — den Namen in Schritt 2 eintragen,
       zurück zu Schritt 1, Prompt kopieren —, und danach fehlte dem Modell
       ausgerechnet der Satz, der ihm sagt, woher es die Werte nehmen soll, samt
       dem Verbot, Platzhalter zu erfinden.
    */
    [
      '## Woher die Werte kommen',
      '',
      'Nimm die Markenrichtlinien, die ich dir gebe. Wo sie schweigen, leite ab —',
      'und schreibe an *keiner* Stelle „TODO" oder einen Platzhalter: ein Feld,',
      'das du nicht belegen kannst, lässt du weg. Der Generator behält dafür',
      'seinen bisherigen Wert und sagt es.',
      '',
    ].join('\n'),
    bekannt.length
      ? [
          '## Das steht schon fest',
          '',
          ...bekannt,
          '',
          'Übernimm diese Werte unverändert.',
          '',
        ].join('\n')
      : '',
    '## Die Form',
    '',
    '```json',
    '{',
    zeile(
      'id',
      'Kleinschrift, Ziffern, Bindestriche; steht im Frontmatter jedes Decks',
      'probenhaus',
    ),
    zeile('label', 'der Name in der Auswahlliste', 'Probenhaus'),
    zeile('markenname', 'steht als Urheber in jedem PDF und jeder PPTX', 'Probenhaus GmbH'),
    zeile('produkt', 'steht in der Beschreibung jedes SVG', 'Probenhaus Folien'),
    '',
    '  "palette": {   // sechzehn Rollen, jede als #RRGGBB',
    ...paletteRollen.map(
      (rolle) => `  ${zeile(rolle, PALETTENTEXT[rolle], nozillaTheme.palette[rolle])}`,
    ),
    '  },',
    '',
    '  "fontFamily": {   // je ein CSS-Stapel; der erste Name muss unten einen Schnitt haben',
    ...schriftRollen.map(
      (rolle) =>
        `  ${zeile(rolle, `${SCHRIFTTEXT[rolle]} — dahinter die andere Marken-Schrift, dann das System`, nozillaTheme.fontFamily[rolle])}`,
    ),
    '  },',
    '',
    `  "pdfFontFamily": {   // die Ersatzschrift im PDF, nur ${pdfSchriften.join(' | ')}`,
    ...schriftRollen.map(
      (rolle) => `  ${zeile(rolle, SCHRIFTTEXT[rolle], nozillaTheme.pdfFontFamily[rolle])}`,
    ),
    '  },',
    '',
    '  "webfontFaces": [   // jeder selbst gehostete Schnitt, als .woff2',
    '    { "family": "Zilla Slab", "weight": 400, "style": "normal", "file": "zilla-slab-400.woff2" }',
    '  ],',
    '',
    '  "textScale": {   // die Größenleiter in Folien-Einheiten; sie muss steigen',
    ...textStufen.map(
      (stufe) => `  ${zeile(stufe, LEITERTEXT[stufe], nozillaTheme.textScale[stufe])}`,
    ),
    '  },',
    '',
    '  "sonderstufen": {   // drei Größen, die auf keiner Stufe der Leiter sitzen',
    ...sonderstufen.map(
      (stufe) => `  ${zeile(stufe, STUFENTEXT[stufe], nozillaTheme.typeScale[stufe].size)}`,
    ),
    '  },',
    '',
    zeile(
      'auszeichnungEnger',
      'um wie viel em die Auszeichnung enger läuft; 0 lässt die Leiter, wie sie ist',
      0,
    ),
    '',
    '  "stroke": {   // Strichstärken in Folien-Einheiten',
    ...strichRollen.map(
      (rolle) => `  ${zeile(rolle, STRICHTEXT[rolle], nozillaTheme.stroke[rolle])}`,
    ),
    '  },',
    '',
    '  "shadowOffset": {   // harte Versätze, kein Weichzeichner',
    ...schattenRollen.map(
      (rolle) => `  ${zeile(rolle, SCHATTENTEXT[rolle], nozillaTheme.shadowOffset[rolle])}`,
    ),
    '  }',
    '}',
    '```',
    '',
    '## Woran der Entwurf sonst scheitert',
    '',
    'Diese Regeln prüft der Generator, nachdem er deine Antwort gelesen hat.',
    'Halte sie ein, dann bleibt die Liste leer.',
    '',
    '1. Jede Farbe als `#RRGGBB`. Keine Kurzform, kein `rgb()`, kein Farbname.',
    '2. `ink` muss auf `white`, auf `paper` und auf `signal` lesbar sein (4,5 : 1),',
    '   und `paper` auf `ink`. Das ist der Fehler, der bei einer neuen Marke fast',
    '   sicher vorkommt: eine dunkle Signalfarbe bekommt schwarze Schrift darauf,',
    '   auf jeder Signalfolie. Reparieren lässt er sich nur über die Palette.',
    '3. `paper` und `white` müssen zwei sichtbar verschiedene Farben sein — sonst',
    '   malen vier Menüeinträge dieselbe. Dasselbe gilt für `signalSoft`/`signal`,',
    '   `ink800`/`ink` und `signalStrong`/`signal`.',
    '4. Die Größenleiter steigt von `xs` bis `xl4`, ohne Gleichstand.',
    '5. Jeder Schriftstapel nennt **zwei** Schriften dieser Marke. Keine Schrift',
    '   führt jedes Zeichen — ⌘, ⌫, ⇧ und ⌥ fehlen den meisten —, und der Export',
    '   sucht ein fehlendes Zeichen in genau dieser Reihenfolge.',
    '6. Der erste Name jedes Stapels muss buchstabengleich einer `family` unter',
    '   `webfontFaces` entsprechen. Passt er nicht, findet der Export keine Datei',
    '   und setzt still in der Ersatzschrift.',
    '7. Jede `family` braucht mindestens einen Schnitt mit `"style": "normal"`,',
    '   Gewichte von 100 bis 900, Dateinamen auf `.woff2`.',
    '8. `shadowOffset.none` ist 0.',
    '',
    '## Was du nicht lieferst',
    '',
    '- Die Wortmarke. Sie ist eine SVG-Datei und wird im Generator hochgeladen.',
    '- Die Zeichen. Der Katalog kommt mit; eigene trägt man später von Hand nach.',
    '- Abgeleitete Werte: semantische Tokens, Flächenrollen, Deckkraftstufen,',
    '  Zeilenhöhen, Radien, das Folienmaß. Sie werden aus der Palette gemischt',
    '  oder sind Struktur — danach zu fragen wäre die Fehlerklasse und nicht die',
    '  Gründlichkeit.',
  ].join('\n');
}
