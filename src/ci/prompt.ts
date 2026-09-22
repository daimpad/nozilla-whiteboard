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
import { nozillaTheme, PUNKT_JE_EINHEIT } from '@/theme';
import { SCHLUESSELREGEL } from './emitter';
import {
  paletteRollen,
  pdfSchriften,
  promptSchluessel,
  schattenRollen,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  type CiEntwurf,
  type PromptSchluessel,
} from './entwurf';
import {
  LEITERTEXT,
  PALETTENTEXT,
  SCHATTENTEXT,
  SCHRIFTTEXT,
  STRICHTEXT,
  STUFENTEXT,
} from './texte';

/**
 * Eine Zeile „schlüssel — wofür", wie sie im Prompt steht.
 *
 * Das Komma steht **vor** dem Kommentar und nicht dahinter, und es steht
 * überhaupt da — beides war einmal anders. Der gezeigte Rumpf trug zwischen
 * den Feldern gar keins: durchweg kein gültiges JSON, in einem Block, der
 * ausdrücklich als ```json ausgezeichnet und als Vorlage gemeint ist. Ein
 * Modell, das die Form buchstabengetreu nachahmt, liefert damit etwas, das
 * `JSON.parse` an der zweiten Zeile abweist — und der Rücklauf hat keine Stufe,
 * die ein *fehlendes* Komma ergänzen könnte. Rund sechzig gelieferte Werte
 * fielen weg, und die Meldung zeigte auf Position 25 statt auf die Vorlage.
 *
 * Gefunden hat es keine Prüfung, sondern erst ein `JSON.parse` über den
 * gezeigten Block. Genau das steht jetzt als Prüfung daneben.
 */
function zeile(schluessel: string, was: string, beispiel: string | number, komma = true): string {
  const wert = typeof beispiel === 'number' ? beispiel : `"${beispiel}"`;
  return `  "${schluessel}": ${wert}${komma ? ',' : ''}   // ${was}`;
}

/** Dieselben Zeilen, das Komma auf allen bis auf der letzten. */
function felder(eintraege: Array<[string, string, string | number]>): string[] {
  return eintraege.map(([schluessel, was, beispiel], index) =>
    zeile(schluessel, was, beispiel, index < eintraege.length - 1),
  );
}

/**
 * Der Rumpf des JSON — je Schlüssel ein Block, in der Reihenfolge der Liste.
 *
 * Gebaut und nicht hingeschrieben: `promptSchluessel` ist dieselbe Liste, an
 * der der Rücklauf misst, was er kennt. Stünde sie hier ein zweites Mal, wäre
 * ein Feld, das nur der Prompt nennt, für den Leser überzählig — das Modell
 * hätte den Prompt befolgt und würde dafür gerügt.
 *
 * Der `switch` ist erschöpfend über die Union: kommt ein Schlüssel dazu und
 * fehlt hier sein Block, bricht `tsc` ab. Ein `default`, das eine leere Zeile
 * liefert, hätte stattdessen einen Prompt ergeben, der ein Feld verlangt, ohne
 * zu sagen, was hineingehört.
 */
function block(schluessel: PromptSchluessel): string[] {
  /**
   * Eine Gruppe: Kopfzeile, Rollen mit Komma bis auf die letzte, Schlussklammer.
   *
   * Das Komma **hinter** der Schlussklammer steht immer — bis auf die letzte
   * Gruppe des Objekts, und die ist `shadowOffset`. Deshalb hat sie unten ihre
   * eigene Zeile.
   */
  const gruppe = (kopf: string, zeilen: string[], schluss = '  },'): string[] => [
    kopf,
    ...zeilen.map((zeile) => `  ${zeile}`),
    schluss,
    '',
  ];

  switch (schluessel) {
    case 'id':
      return [
        /*
           Die Regel ist enger, als sie zuerst dastand, und die Enge ist echt:
           der Emitter macht aus dem Schlüssel einen Exportnamen und zieht dazu
           `-x` zu `X` zusammen. Das greift nur vor einem *Buchstaben* — aus
           `probe-2024` würde `probe-2024`, und das ist kein Bezeichner. Wer
           hier „Ziffern und Bindestriche" verspricht, lässt ein Modell einen
           Schlüssel liefern, den die Prüfliste eine Seite weiter ablehnt: der
           Fehler steht dann bei dem, der den Prompt befolgt hat.
        */
        zeile('id', SCHLUESSELREGEL, 'probenhaus'),
      ];
    case 'label':
      return [zeile('label', 'der Name in der Auswahlliste', 'Probenhaus')];
    case 'markenname':
      return [
        zeile('markenname', 'steht als Urheber in jedem PDF und jeder PPTX', 'Probenhaus GmbH'),
      ];
    case 'produkt':
      return [zeile('produkt', 'steht in der Beschreibung jedes SVG', 'Probenhaus Folien'), ''];
    case 'palette':
      return gruppe(
        '  "palette": {   // sechzehn Rollen, jede als #RRGGBB',
        felder(
          paletteRollen.map((rolle) => [rolle, PALETTENTEXT[rolle], nozillaTheme.palette[rolle]]),
        ),
      );
    case 'fontFamily':
      return gruppe(
        '  "fontFamily": {   // je ein CSS-Stapel; der erste Name muss unten einen Schnitt haben',
        felder(
          schriftRollen.map((rolle) => [
            rolle,
            `${SCHRIFTTEXT[rolle]} — dahinter die andere Marken-Schrift, dann das System`,
            nozillaTheme.fontFamily[rolle],
          ]),
        ),
      );
    case 'pdfFontFamily':
      return gruppe(
        `  "pdfFontFamily": {   // die Ersatzschrift im PDF, nur ${pdfSchriften.join(' | ')}`,
        felder(
          schriftRollen.map((rolle) => [
            rolle,
            SCHRIFTTEXT[rolle],
            nozillaTheme.pdfFontFamily[rolle],
          ]),
        ),
      );
    case 'webfontFaces':
      return [
        '  "webfontFaces": [   // jeder selbst gehostete Schnitt, als .woff2',
        '    { "family": "Zilla Slab", "weight": 400, "style": "normal", "file": "zilla-slab-400.woff2" }',
        '  ],',
        '',
      ];
    case 'textScale':
      return gruppe(
        '  "textScale": {   // die Größenleiter in Folien-Einheiten; sie muss steigen',
        felder(
          textStufen.map((stufe) => [stufe, LEITERTEXT[stufe], nozillaTheme.textScale[stufe]]),
        ),
      );
    case 'sonderstufen':
      return gruppe(
        '  "sonderstufen": {   // drei Größen, die auf keiner Stufe der Leiter sitzen',
        felder(
          sonderstufen.map((stufe) => [
            stufe,
            STUFENTEXT[stufe],
            nozillaTheme.typeScale[stufe].size,
          ]),
        ),
      );
    case 'auszeichnungEnger':
      return [
        zeile(
          'auszeichnungEnger',
          'um wie viel em die Auszeichnung enger läuft; 0 lässt die Leiter, wie sie ist',
          0,
        ),
        '',
      ];
    case 'stroke':
      return gruppe(
        '  "stroke": {   // Strichstärken in Folien-Einheiten',
        felder(strichRollen.map((rolle) => [rolle, STRICHTEXT[rolle], nozillaTheme.stroke[rolle]])),
      );
    case 'shadowOffset':
      // Die letzte Gruppe des Objekts — ihre Schlussklammer trägt kein Komma.
      return gruppe(
        '  "shadowOffset": {   // harte Versätze, kein Weichzeichner',
        felder(
          schattenRollen.map((rolle) => [
            rolle,
            SCHATTENTEXT[rolle],
            nozillaTheme.shadowOffset[rolle],
          ]),
        ),
        '  }',
      ).slice(0, -1);
  }
}

/** Woraus das Modell das Erscheinungsbild ablesen soll. */
export const promptquellen = ['richtlinien', 'artefakt'] as const;
export type Promptquelle = (typeof promptquellen)[number];

/** `0.75` → „0,75". Der Prompt ist deutscher Text, also mit Komma. */
const komma = (zahl: number) => String(zahl).replace('.', ',');

/**
 * Woher die Werte kommen — der eine Abschnitt, der von der Quelle abhängt.
 *
 * Er stand hier als *ein* Text, und der sagte „Nimm die Markenrichtlinien, die
 * ich dir gebe". Bei einer angehängten Präsentation ist dieser Satz nicht
 * unvollständig, sondern falsch: aus einer `.pptx` liest man nicht ab, was in
 * ihr *steht*, sondern was in ihr *benutzt wird* — und die beiden gehen weit
 * auseinander. Deshalb ein Abschnitt mit zwei Füllungen und kein zweiter
 * Prompt daneben: es gibt einen Auftrag, und er ist in sich stimmig.
 *
 * Der `switch` ist erschöpfend über die Union. Käme eine dritte Quelle dazu
 * und fehlte hier ihr Zweig, bräche `tsc` ab — ein `default` hätte
 * stattdessen einen Prompt ergeben, der gar nicht sagt, woher die Werte
 * kommen sollen.
 */
function woherDieWerte(quelle: Promptquelle): string {
  switch (quelle) {
    case 'richtlinien':
      return [
        '## Woher die Werte kommen',
        '',
        'Nimm die Markenrichtlinien, die ich dir gebe. Wo sie schweigen, leite ab —',
        'und schreibe an *keiner* Stelle „TODO" oder einen Platzhalter: ein Feld,',
        'das du nicht belegen kannst, lässt du weg. Der Generator behält dafür',
        'seinen bisherigen Wert und sagt es.',
        '',
      ].join('\n');
    case 'artefakt':
      /*
         Die sechs Punkte sind keine Vorsichtsmaßnahmen, sondern sechs Fehler,
         die beim Auslesen einer echten Vorlage nacheinander aufgetreten sind.
         Der erste ist der teuerste: er liefert ein Ergebnis, das vollständig
         und plausibel aussieht und mit der Marke nichts zu tun hat.
      */
      return [
        '## Woher die Werte kommen',
        '',
        'Ich hänge dir ein Gestaltungsartefakt an — eine Präsentation, ein PDF, ein',
        'paar Screenshots. Lies das Erscheinungsbild **daraus ab**. Sechs Dinge, an',
        'denen das erfahrungsgemäß schiefgeht:',
        '',
        '1. **Die offiziellen Stellen sind oft leer.** In einer `.pptx` stehen Farb-',
        '   und Schriftschema in `ppt/theme/theme1.xml` und die Textstile im',
        '   Folienmaster; bei einem Export aus Google Slides oder Canva sind das',
        '   unveränderte Standardwerte — Arial und das Office-Blau `#4F81BD`. Nimm',
        '   sie nur, wenn sie davon abweichen. Sonst lieferst du Microsoft statt',
        '   der Marke, und es sieht vollständig aus.',
        '2. **Zähle, was wirklich benutzt wird.** Die Gestaltung steht in den',
        '   Füllfarben der Formen, den Farben der Textläufe und den tatsächlich',
        '   gesetzten Größen. Eine Farbe, die einmal in einem Dekobild vorkommt,',
        '   ist etwas anderes als eine, die an elf Stellen Text einfärbt.',
        '3. **Trenne Vorgabe von Verwendung.** Eine Größe, die in den Vorgabestilen',
        '   des Masters steht, aber an keinem einzigen echten Textlauf, ist keine',
        '   Größe der Marke.',
        '4. **Größen sind Folien-Einheiten, nicht Punkt.** Eine Einheit ist',
        `   ${komma(PUNKT_JE_EINHEIT)} Punkt: teile jede Punktangabe durch`,
        `   ${komma(PUNKT_JE_EINHEIT)}. Aus 60 pt werden ${60 / PUNKT_JE_EINHEIT}, aus 18 pt`,
        `   werden ${18 / PUNKT_JE_EINHEIT}. Wer das vergisst, liefert eine Leiter, die ein`,
        '   Drittel zu klein ist — und nichts daran sieht falsch aus.',
        '5. **Ein Verlauf ist zwei Farben.** Findest du einen, nimm seine Enden für',
        '   `signal` und `signalStrong`. Eine Fläche ist hier immer Vollton.',
        '6. **Was keine Quelle hat, lässt du weg.** Rate keine Rolle voll, damit das',
        '   Objekt vollständig aussieht, und schreibe an *keiner* Stelle „TODO"',
        '   oder einen Platzhalter. Ein weggelassenes Feld behält seinen bisherigen',
        '   Wert, und der Generator sagt „kam nicht" — ein geratenes sagt niemand.',
        '',
      ].join('\n');
  }
}

/**
 * Der Prompt.
 *
 * `entwurf` geht mit ein, weil das Modell wissen soll, was schon dasteht: wer
 * den Schlüssel und den Markennamen bereits eingetragen hat, will sie nicht
 * erfunden bekommen. Ist noch nichts ausgefüllt, fällt der Abschnitt weg —
 * ein Prompt, der „Schlüssel: (leer)" sagt, lädt zum Raten ein.
 *
 * `quelle` belegt nur den Abschnitt „Woher die Werte kommen". Die Form, die
 * acht Regeln und das, was nicht geliefert wird, bleiben Zeichen für Zeichen
 * gleich — sonst bekäme dasselbe Werkzeug je nach Herkunft zwei verschiedene
 * Verträge, und der Rücklauf-Leser kennt nur einen.
 */
export function promptText(entwurf: CiEntwurf, quelle: Promptquelle = 'richtlinien'): string {
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
    woherDieWerte(quelle),
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
    ...promptSchluessel.flatMap(block),
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
