/**
 * Der Weg über ein Sprachmodell — geprüft an dem, was zurückkommt.
 *
 * Zwei Hälften, und sie hängen zusammen: der Prompt sagt, was geliefert werden
 * soll, und der Rücklauf liest genau das. Laufen die beiden auseinander, ist
 * nichts kaputt und alles falsch — das Modell liefert brav eine Rolle, die der
 * Leser nicht kennt, der Bericht meldet sie als „übergangen", und der Wert
 * verschwindet, während beide Seiten für sich stimmig aussehen.
 *
 * Die erste Prüfung unten ist deshalb die wichtigste dieser Datei: sie hält
 * die beiden Listen aneinander, und zwar über die Rollen, die *das
 * Erscheinungsbild* führt und nicht über eine dritte getippte Liste.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nozillaTheme } from '@/theme';
import {
  leererEntwurf,
  leererSchnitt,
  themeAusEntwurf,
  vorschaustand,
  vorschauTheme,
  wortmarkeAusSvg,
  paletteRollen,
  schattenRollen,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  promptSchluessel,
  type CiEntwurf,
} from './entwurf';
import { normalisiereFarbe } from './farbwert';
import { promptText } from './prompt';
import {
  abgebrochen,
  liesRuecklauf,
  teilRuecklauf,
  type Ruecklaufbefund,
  type Ruecklaufrang,
} from './ruecklauf';
import { ankerFuer, massAnker, massgruppen, pruefe, traegtFehler, type Feld } from './pruefung';
import { SCHLUESSELREGEL, bezeichnerProblem, designdatei } from './emitter';
import { SCHRITTE, schrittFuerFeld } from './schritte';
import { entwurfSchluessel, sichereEntwurf, traegtArbeit, zusammen } from './sitzung';
import { STORAGE_KEY as SITZUNG } from '@/state/persistence';

function texte(befunde: Ruecklaufbefund[], rang: Ruecklaufrang): string {
  return befunde
    .filter((befund) => befund.rang === rang)
    .map((befund) => befund.text)
    .join(' | ');
}

/**
 * Der Entwurf, in den hineingelesen wird — und er sieht der Antwort **nicht**
 * ähnlich.
 *
 * Das ist der Kern dieser Datei und war einmal ihr größter Fehler: die
 * Grundlage war `leererEntwurf()`, also die nozilla-CI, und die Probeantwort
 * baute sich aus denselben `nozillaTheme`-Werten. `expect(palette).toEqual(
 * nozillaTheme.palette)` galt damit auch dann, wenn der Leser gar nichts
 * übernahm — das `Object.assign` für die Palette ließ sich ersatzlos
 * entfernen, ohne dass eine einzige Prüfung rot wurde.
 *
 * Jede Gruppe trägt hier deshalb Werte, die in keiner Antwort dieser Datei
 * vorkommen. „Gelesen" und „Basis behalten" sind erst dadurch zwei
 * unterscheidbare Ergebnisse.
 */
function BASIS(): CiEntwurf {
  const leer = leererEntwurf();
  return {
    ...leer,
    id: 'basis',
    label: 'Basis',
    markenname: 'Basis AG',
    produkt: 'Basis Folien',
    palette: Object.fromEntries(
      paletteRollen.map((rolle, index) => [rolle, `#0${index.toString(16).toUpperCase()}0A0B`]),
    ) as CiEntwurf['palette'],
    textScale: Object.fromEntries(
      textStufen.map((stufe, index) => [stufe, 900 + index]),
    ) as CiEntwurf['textScale'],
    sonderstufen: { headline: 901, labelSmall: 902, codeInline: 903 },
    auszeichnungEnger: 0.099,
    stroke: Object.fromEntries(
      strichRollen.map((rolle, index) => [rolle, 90 + index]),
    ) as CiEntwurf['stroke'],
    shadowOffset: Object.fromEntries(
      schattenRollen.map((rolle, index) => [rolle, 80 + index]),
    ) as CiEntwurf['shadowOffset'],
    fontFamily: { display: 'Basisschrift', body: 'Basisschrift', mono: 'Basisschrift' },
    pdfFontFamily: { display: 'courier', body: 'courier', mono: 'courier' },
    webfontFaces: [
      { family: 'Basisschrift', weight: 400, style: 'normal', file: 'basis.woff2', kennung: 'b1' },
    ],
  };
}

/** Jedes Feld, das ein Befund tragen kann — die Union als Werteliste. */
const FELDER: Feld[] = [
  'Marke',
  'Farbe',
  'Schrift',
  'Maße',
  'Wortmarke',
  'Zeichen',
  'Werkzeug',
  'Rücklauf',
];

/* -------------------------------------------------------------------------- */

describe('der Prompt', () => {
  it('nennt jede Rolle, die der Rücklauf lesen kann', () => {
    /*
       Der Wächter gegen die eine Naht, an der diese beiden Dateien
       auseinanderlaufen können. Beide lesen ihre Rollen aus `nozillaTheme` —
       aber der Prompt *schreibt* sie in einen Text, und ein Textbaustein, den
       jemand vergisst mitzuziehen, fällt sonst niemandem auf: das Modell
       liefert dann eine Rolle weniger, und der Bericht meldet eine Lücke, die
       keine ist.
    */
    const prompt = promptText(leererEntwurf());
    const rollen = [
      ...paletteRollen,
      ...textStufen,
      ...strichRollen,
      ...schattenRollen,
      ...schriftRollen,
      ...sonderstufen,
    ];
    for (const rolle of rollen) {
      expect(prompt, `„${rolle}" fehlt im Prompt`).toContain(`"${rolle}"`);
    }
    /*
       Und die obersten Schlüssel aus **der** Liste, nicht aus einer dritten.
       Sie standen einmal dreimal getippt da — im Prompt, in `ERWARTET` und
       hier. Wer dann ein Feld hinzufügt und nur eine der drei nachzieht,
       bekommt ein Modell, das den Prompt befolgt und dafür gerügt wird, bei
       grünem Test.
    */
    for (const schluessel of promptSchluessel) {
      expect(prompt, `„${schluessel}" fehlt im Prompt`).toContain(`"${schluessel}"`);
    }
  });

  it('verlangt für den Schlüssel keine Form, die die Prüfliste ablehnt', () => {
    /*
       Der Prompt beschrieb den Schlüssel als „Kleinschrift, Ziffern,
       Bindestriche" — und die Prüfliste lehnt davon einen Teil ab. Der
       Emitter macht aus dem Schlüssel einen Exportnamen und zieht dazu `-x`
       zu `X` zusammen; das greift nur vor einem *Buchstaben*, aus
       `probe-2024` würde also `probe-2024`, und das ist kein Bezeichner.

       Wer hier zu viel verspricht, bekommt vom Modell einen Schlüssel, den
       die Seite eine Ecke weiter zurückweist — und der Fehler steht dann bei
       dem, der den Prompt befolgt hat. Geprüft wird deshalb an **beiden**
       Beispielen, die der Prompt nennt, gegen den Emitter, der urteilt.
    */
    const prompt = promptText(leererEntwurf());
    expect(prompt).toContain('probe-haus');
    expect(prompt).toContain('probe-2024');
    expect(bezeichnerProblem('probe-haus')).toBeNull();
    expect(bezeichnerProblem('probe-2024')).not.toBeNull();
    // Und das Beispiel, das der Prompt als Wert vorzeigt, muss selbst durch.
    expect(bezeichnerProblem('probenhaus')).toBeNull();

    /*
       Und derselbe Satz steht unter dem Feld, in das der Wert von Hand getippt
       wird. Er wurde einmal nur im Prompt verschärft; wer dem Formular daneben
       folgte, bekam einen harten Fehler in der Prüfliste und einen gesperrten
       Datei-Knopf. Geprüft wird an der *Quelle* — eine zweite Formulierung im
       Formular wäre eine zweite Wahrheit über dieselbe Regel.
    */
    expect(prompt).toContain(SCHLUESSELREGEL);
    const formular = readFileSync(join(process.cwd(), 'src', 'ci', 'schritte.tsx'), 'utf8');
    expect(formular).toContain('SCHLUESSELREGEL');
    expect(formular).not.toMatch(/hinweis="Kleinschrift/);
  });

  it('meldet keinen Schlüssel als überzählig, nach dem er selbst fragt', () => {
    /*
       Die Gegenrichtung, und die eigentliche Prüfung: was der Prompt verlangt,
       muss der Leser kennen. Geliefert wird hier jeder oberste Schlüssel
       einmal — kennt der Leser einen davon nicht, steht er als „übergangen" im
       Bericht, und das ist die Rüge für ein Modell, das alles richtig gemacht
       hat.
    */
    const alles = Object.fromEntries(promptSchluessel.map((schluessel) => [schluessel, null]));
    const { befunde } = liesRuecklauf(JSON.stringify(alles), BASIS());
    expect(texte(befunde, 'uebergangen')).not.toMatch(/kennt der Generator nicht/);
  });

  it('zeigt eine Form, die wirklich JSON ist', () => {
    /*
       Die Prüfung, die gefehlt hat — und ihr Fehlen war teuer: der gezeigte
       Rumpf trug zwischen den Feldern **kein einziges Komma**. Ein Block, der
       ausdrücklich als ```json ausgezeichnet und als Vorlage gemeint ist, war
       durchweg kein JSON. Ein Modell, das die Form buchstabengetreu nachahmt,
       liefert damit etwas, das `JSON.parse` an der zweiten Zeile abweist —
       und der Rücklauf hat keine Stufe, die ein *fehlendes* Komma ergänzen
       könnte. Rund sechzig Werte fielen weg.

       Geprüft wird am Ergebnis: Kommentare heraus, dann parsen. Die vorigen
       Prüfungen fragten nur `toContain('"<rolle>"')` und wären über jedem
       kaputten Rumpf grün geblieben.
    */
    const prompt = promptText(leererEntwurf());
    const block = /```json\n([\s\S]*?)\n```/.exec(prompt);
    expect(block, 'kein JSON-Block im Prompt').not.toBeNull();

    const ohneKommentare = (block as RegExpExecArray)[1].replace(/\s*\/\/.*$/gm, '');
    const gelesen = JSON.parse(ohneKommentare) as Record<string, unknown>;

    // Und was dabei herauskommt, ist die Form, die der Leser erwartet.
    expect(Object.keys(gelesen).sort()).toEqual([...promptSchluessel].sort());
    expect(Object.keys(gelesen.palette as object).sort()).toEqual([...paletteRollen].sort());
    expect(Object.keys(gelesen.textScale as object).sort()).toEqual([...textStufen].sort());
  });

  it('zeigt eine Form, die der Leser ohne einen Befund annimmt', () => {
    /*
       Die Gegenrichtung, und die eigentliche Zusicherung: die Vorlage ist
       nicht nur *lesbar*, sie ist auch *vollständig*. Wer sie unverändert
       zurückschickt, bekommt keine Lücke und keine Übergehung gemeldet.
    */
    const prompt = promptText(leererEntwurf());
    const block = /```json\n([\s\S]*?)\n```/.exec(prompt) as RegExpExecArray;
    const antwort = block[1].replace(/\s*\/\/.*$/gm, '');

    const { entwurf, befunde } = liesRuecklauf(antwort, BASIS());
    expect(entwurf).not.toBeNull();
    expect(texte(befunde, 'fehlt')).toBe('');
    expect(texte(befunde, 'uebergangen')).toBe('');

    /*
       Und die Zählung stimmt auch **nach oben**. Geprüft war nur der kleine
       Wert („2 von 13"); ein vergessenes `bericht.nahm(…)` hätte über genau
       dieser tadellosen Antwort „12 von 13" gemeldet, ohne dass irgendwo
       danebenstünde, welches Feld gemeint ist — der Benutzer sucht dann ein
       Feld, das gar nicht fehlt. Dasselbe Muster wie „Ein Knopf, der eine Zahl
       nennt und eine andere tut", nur mit umgekehrtem Vorzeichen.
    */
    expect(texte(befunde, 'gelesen')).toContain(
      `Übernommen: ${promptSchluessel.length} von ${promptSchluessel.length}`,
    );
  });

  it('nennt die Werte von nozilla als Beispiel und erfindet keine', () => {
    const prompt = promptText(leererEntwurf());
    expect(prompt).toContain(nozillaTheme.palette.signal);
    expect(prompt).toContain(`"xl4": ${nozillaTheme.textScale.xl4}`);
  });

  it('trägt nach, was schon feststeht — und behält dabei die Anweisung', () => {
    /*
       Beide Blöcke, immer. Die vorige Fassung verzweigte ausschließend: sobald
       id oder Name eingetragen waren, verschwand „Woher die Werte kommen" —
       samt dem Verbot, Platzhalter zu erfinden. Und der Weg dorthin ist der
       naheliegende: Namen in Schritt 2 tippen, zurück zu Schritt 1, kopieren.
    */
    const leer = promptText(leererEntwurf());
    expect(leer).not.toContain('Das steht schon fest');
    expect(leer).toContain('Woher die Werte kommen');

    const mit = promptText({ ...leererEntwurf(), id: 'probenhaus', markenname: 'Probenhaus GmbH' });
    expect(mit).toContain('Das steht schon fest');
    expect(mit).toContain('Woher die Werte kommen');
    expect(mit).toContain('probenhaus');
    expect(mit).toContain('Probenhaus GmbH');
    // Und nichts Leeres: ein „Produktname: " lädt zum Raten ein.
    expect(mit).not.toContain('Produktname: \n');
  });
});

/* -------------------------------------------------------------------------- */

describe('normalisiereFarbe', () => {
  it('lässt die kanonische Form in Ruhe und sagt es', () => {
    expect(normalisiereFarbe('#E4003A')).toEqual({ wert: '#E4003A', wie: '' });
  });

  it('bringt Kleinschrift hoch — tonesOutsidePalette vergleicht Zeichenketten', () => {
    const korrektur = normalisiereFarbe('#e4003a');
    expect(korrektur?.wert).toBe('#E4003A');
    expect(korrektur?.wie).not.toBe('');
  });

  it('schreibt die Kurzform aus, mit und ohne Raute', () => {
    expect(normalisiereFarbe('#e43')?.wert).toBe('#EE4433');
    expect(normalisiereFarbe('e43')?.wert).toBe('#EE4433');
  });

  it('ergänzt die fehlende Raute', () => {
    expect(normalisiereFarbe('E4003A')?.wert).toBe('#E4003A');
  });

  it('rechnet rgb() um', () => {
    expect(normalisiereFarbe('rgb(228, 0, 58)')?.wert).toBe('#E4003A');
    expect(normalisiereFarbe('rgb(228 0 58)')?.wert).toBe('#E4003A');
  });

  it('sagt, dass die Deckkraft wegfällt — eine Palettenrolle ist immer deckend', () => {
    const korrektur = normalisiereFarbe('rgba(228, 0, 58, 0.5)');
    expect(korrektur?.wert).toBe('#E4003A');
    expect(korrektur?.wie).toMatch(/Deckkraft/);
    // Und ein volles Alpha ist keine Meldung wert.
    expect(normalisiereFarbe('rgba(228, 0, 58, 1)')?.wie).not.toMatch(/Deckkraft/);
  });

  it('sagt es auch, wenn die Deckkraft in Prozent dasteht', () => {
    /*
       Dieselbe Farbe, dieselbe halbe Deckkraft, zwei Schreibweisen — und nur
       eine wurde gemeldet. `parseFloat('50%')` ist 50, und die vorige Fassung
       fragte `< 1`: die Prozentform galt damit als deckend und fiel stumm
       weg. Und sie ist die häufigere, denn die Schrägstrich-Schreibweise ist
       die, die ein Sprachmodell heute schreibt.
    */
    expect(normalisiereFarbe('rgb(228 0 58 / 50%)')?.wie).toMatch(/Deckkraft/);
    expect(normalisiereFarbe('rgba(228, 0, 58, 50%)')?.wie).toMatch(/Deckkraft/);
    // Die Gegenrichtung, ohne die die Regel nur eine halbe wäre: 100 % ist
    // deckend und keine Meldung wert.
    expect(normalisiereFarbe('rgb(228 0 58 / 100%)')?.wie).not.toMatch(/Deckkraft/);
    expect(normalisiereFarbe('rgb(228 0 58 / 100%)')?.wert).toBe('#E4003A');
  });

  it('erfindet nichts, wo nichts zu lesen ist', () => {
    // Fünf Stellen sind weder die Kurz- noch die Langform. Die vorige Fassung
    // des Farbfelds zeigte für so etwas `#000000` im Wähler — ein Schwarz, das
    // niemand gewählt hat, sieht aus wie eine Entscheidung.
    expect(normalisiereFarbe('#E4003')).toBeNull();
    expect(normalisiereFarbe('rot')).toBeNull();
    expect(normalisiereFarbe('')).toBeNull();
    expect(normalisiereFarbe('rgb(a, b, c)')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe('der Rücklauf repariert stufenweise — und sagt jede Stufe an', () => {
  const KERN = '{"id": "probenhaus", "label": "Probenhaus"}';

  it('meldet nichts, wenn es reines JSON war', () => {
    const { entwurf, befunde } = liesRuecklauf(KERN, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(texte(befunde, 'korrigiert')).toBe('');
  });

  it('nimmt den Codezaun ab', () => {
    const { entwurf, befunde } = liesRuecklauf('```json\n' + KERN + '\n```', BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(texte(befunde, 'korrigiert')).toMatch(/Codezaun/);
  });

  it('schneidet den Satz davor und dahinter weg', () => {
    const roh = `Klar, hier ist das Erscheinungsbild:\n${KERN}\nSag Bescheid, wenn ich etwas ändern soll.`;
    const { entwurf, befunde } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(texte(befunde, 'korrigiert')).toMatch(/weggeschnitten/);
  });

  it('trifft die schließende Klammer, und zwar in beide Richtungen', () => {
    /*
       Die Gegenprobe zum Schnitt oben, und sie braucht **zwei** Fälle. Gezählt
       wird mit Rücksicht auf Zeichenketten, weil beide naheliegenden
       Abkürzungen je eine Hälfte verfehlen: wer beim ersten `}` aufhört, wird
       von einer Klammer *im Wert* abgeschnitten; wer bis zum letzten `}` im
       ganzen Text geht, nimmt eine Klammer aus dem Satz dahinter mit. Eine
       Prüfung mit nur einem der beiden Fälle überlebt die Sabotage am anderen —
       genau das ist hier passiert.
    */
    const imWert = liesRuecklauf(
      'Bitte sehr:\n{"id": "probenhaus", "label": "Probe } Haus"}',
      BASIS(),
    );
    expect(imWert.entwurf?.label).toBe('Probe } Haus');

    const dahinter = liesRuecklauf('{"id": "probenhaus"}\nSag Bescheid, wenn du magst :}', BASIS());
    expect(dahinter.entwurf?.id).toBe('probenhaus');
  });

  it('entfernt Kommentare — JSON kennt keine', () => {
    const roh =
      '{\n"id": "probenhaus", // der Schlüssel\n/* und der Name */ "label": "Probenhaus"\n}';
    const { entwurf, befunde } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(entwurf?.label).toBe('Probenhaus');
    expect(texte(befunde, 'korrigiert')).toMatch(/Kommentare/);
  });

  it('lässt sich von einer Klammer im Kommentar nicht abschneiden', () => {
    /*
       Der Fall, an dem die Reihenfolge der Stufen hängt. Der Klammerzähler
       kennt Zeichenketten, aber keine Kommentare: liefe er vor dem
       Kommentarleser, hielte ihn das `}` in `// auch #FFF }` für das Ende des
       Objekts, und alles danach wäre weg — samt einer Meldung, die eine andere
       Ursache nennt als die wahre.
    */
    const roh = '{ "palette": { "signal": "#E4003A" } // auch #FFF }\n, "id": "probenhaus" }';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(entwurf?.palette.signal).toBe('#E4003A');
  });

  it('lässt einen Schrägstrich in einem Wert stehen', () => {
    const roh = '{"produkt": "Probe // Folien", "id": "probenhaus"}';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.produkt).toBe('Probe // Folien');
  });

  it('entfernt ein Komma vor der schließenden Klammer', () => {
    const roh = '{"id": "probenhaus", "label": "Probenhaus",}';
    const { entwurf, befunde } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.label).toBe('Probenhaus');
    expect(texte(befunde, 'korrigiert')).toMatch(/Komma/);
  });

  it('begradigt typografische Anführungszeichen — aber erst zuletzt', () => {
    const roh = '{“id”: “probenhaus”}';
    const { entwurf, befunde } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(texte(befunde, 'korrigiert')).toMatch(/Anführungszeichen/);

    // Die Gegenrichtung: solange eine frühere Stufe reicht, fasst diese nicht
    // an — ein Markenname mit einem echten Anführungszeichen bliebe sonst
    // verändert stehen.
    const heil = liesRuecklauf('{"markenname": "Haus „zum Anker“"}', BASIS());
    expect(heil.entwurf?.markenname).toBe('Haus „zum Anker“');
  });

  it('schafft auch alles auf einmal', () => {
    const roh = [
      'Hier bitte:',
      '```json',
      '{',
      '  "id": "probenhaus", // klein',
      '  "label": "Probenhaus",',
      '}',
      '```',
    ].join('\n');
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.id).toBe('probenhaus');
    expect(entwurf?.label).toBe('Probenhaus');
  });

  it('gibt auf, statt zu raten', () => {
    const { entwurf, befunde } = liesRuecklauf('Ich kann das leider nicht.', BASIS());
    expect(entwurf).toBeNull();
    expect(befunde.some((befund) => befund.rang === 'fehler')).toBe(true);
  });

  it('nimmt keine Liste als Objekt', () => {
    const { entwurf } = liesRuecklauf('[1, 2, 3]', BASIS());
    expect(entwurf).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe('typografische Anführungszeichen und ein // im Wert', () => {
  it('verlieren nicht den halben Text — und werden nicht als Abbruch gemeldet', () => {
    /*
       Zwei Dinge zugleich, für die je eine Stufe gebaut ist: typografische
       Begrenzer (dafür ist `geradeAnfuehrung` da) und ein `//` in einem Wert
       (dafür kennt `ohneKommentare` Zeichenketten). Die Buchführung zählte
       aber nur gerade Anführungszeichen: `inText` stand nie auf true, das `//`
       galt als Zeilenkommentar, und der Rest der Zeile samt schließender
       Klammer war weg.

       Das Ergebnis war nicht bloß ein Verlust, sondern ein **falscher Rat**:
       gemeldet wurde ein Längenabbruch des Modells über einer vollständigen
       Antwort. Wer ihn befolgte, bekam dieselbe Antwort und dasselbe Ergebnis,
       beliebig oft.
    */
    const roh = '{ “id”: “probe”, “produkt”: “Deck // Fläche” }';
    const { entwurf, befunde, abbruch } = liesRuecklauf(roh, BASIS());
    expect(abbruch).toBeNull();
    expect(entwurf?.id).toBe('probe');
    expect(entwurf?.produkt).toBe('Deck // Fläche');
    expect(texte(befunde, 'fehler')).toBe('');
  });

  it('behält den Schrägstrich in einem Dateinamen', () => {
    // Der realistische Auslöser: die Schnitte liegen auf einem CDN. Ohne die
    // Reparatur war hier die ganze Schnittliste weg.
    const roh =
      '{ “webfontFaces”: [{ “family”: “Probe”, “weight”: 400, “style”: “normal”,' +
      ' “file”: “https://cdn.example.com/p.woff2” }] }';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.webfontFaces).toHaveLength(1);
    expect(entwurf?.webfontFaces[0].file).toBe('https://cdn.example.com/p.woff2');
  });

  it('lässt ein deutsches Anführungszeichen im Wert stehen, wo es kann', () => {
    /*
       Die Gegenrichtung, und der Grund, warum `geradeAnfuehrung` weiterhin die
       vorletzte Stufe ist und nicht vorgezogen wurde: hier ist nur ein
       Nachkomma zu entfernen, und der Markenname darf seine Anführungszeichen
       behalten. Zöge man das Begradigen vor, käme „Alte Post" gerade an.
    */
    const roh = '{"label": "Das „Alte Post“ Haus", }';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.label).toBe('Das „Alte Post“ Haus');
  });
});

/* -------------------------------------------------------------------------- */

describe('der Rücklauf sagt, was fehlt und was er übergangen hat', () => {
  it('nennt die Palettenrollen, die nicht kamen — beim Namen', () => {
    /*
       Der wichtigste Rang der fünf. Ein Modell, das zwölf von sechzehn Rollen
       liefert, sieht aus, als hätte es geliefert; die vier fehlenden stünden
       danach in nozilla-Grün auf der Folie einer fremden Marke.
    */
    const { entwurf, befunde } = liesRuecklauf('{"palette": {"signal": "#E4003A"}}', BASIS());
    const fehlt = texte(befunde, 'fehlt');
    expect(fehlt).toMatch(/ink/);
    expect(fehlt).toMatch(/white/);
    expect(entwurf?.palette.signal).toBe('#E4003A');
    // Und was nicht kam, bleibt stehen, statt leer zu werden.
    expect(entwurf?.palette.ink).toBe(BASIS().palette.ink);
  });

  it('meldet eine Rolle, die es hier nicht gibt', () => {
    const { befunde } = liesRuecklauf('{"palette": {"akzent": "#E4003A"}}', BASIS());
    expect(texte(befunde, 'uebergangen')).toMatch(/akzent/);
  });

  it('meldet ein Feld, das der Generator nicht kennt', () => {
    const { befunde } = liesRuecklauf('{"radius": 8, "id": "probenhaus"}', BASIS());
    expect(texte(befunde, 'uebergangen')).toMatch(/radius/);
  });

  it('meldet jedes der dreizehn obersten Felder, wenn es fehlt — auch das einzelne', () => {
    /*
       Eine leere Antwort lässt alle dreizehn aus, und **jedes** gehört genannt.
       Der Anlass ist einer davon: `auszeichnungEnger` lief weder über
       `nimmText` noch über `bericht.gruppe`, also über keinen der beiden Wege,
       die „kam nicht" sagen. Ein Modell, das ihn ausließ, bekam dafür kein
       Wort — und die Laufweite der Auszeichnung sieht man auf der Probefolie
       nicht.

       Gezählt wird gegen die Liste, aus der auch der Prompt gebaut ist, und
       nicht gegen eine Zahl im Test: ein vierzehnter Schlüssel bekommt so
       nicht stillschweigend eine Ausnahme. Nach dem *Namen* lässt sich nicht
       suchen — die Gruppen melden sich auf Deutsch („Die Palette kam nicht"),
       und das ist richtig so, denn diese Sätze liest ein Mensch.
    */
    const { befunde } = liesRuecklauf('{}', BASIS());
    expect(befunde.filter((befund) => befund.rang === 'fehlt')).toHaveLength(
      promptSchluessel.length,
    );
    // Und der eine, der durchgerutscht war, ausdrücklich beim Namen.
    expect(texte(befunde, 'fehlt')).toContain('auszeichnungEnger');
  });

  it('zählt als übernommen, was ankam — nicht, was mitgeschickt wurde', () => {
    /*
       „Übernommen: 13 von 13" stand über einer Antwort, in der zwölf Felder
       vom falschen Typ waren und übergangen wurden. Gezählt wurden die
       Schlüssel des Objekts; genannt wurde etwas anderes. Das ist „Ein Knopf,
       der eine Zahl nennt und eine andere tut" in Satzform.
    */
    const roh = JSON.stringify({
      id: 'probenhaus',
      label: 'Probenhaus',
      palette: 'creme und rot',
      textScale: [16, 21],
      stroke: { hair: 'dünn' },
    });
    const gelesen = texte(liesRuecklauf(roh, BASIS()).befunde, 'gelesen');
    expect(gelesen).toMatch(new RegExp(`Übernommen: 2 von ${promptSchluessel.length} Feldern`));
  });

  it('meldet, wenn eine ganze Gruppe fehlt', () => {
    const { befunde } = liesRuecklauf('{"id": "probenhaus"}', BASIS());
    const fehlt = texte(befunde, 'fehlt');
    expect(fehlt).toMatch(/Palette/);
    expect(fehlt).toMatch(/Größenleiter/);
    expect(fehlt).toMatch(/Schnitte/);
  });
});

/* -------------------------------------------------------------------------- */

describe('der Rücklauf korrigiert, was sich korrigieren lässt', () => {
  it('liest „48px" als Zahl', () => {
    /*
       Ohne das kommt `Number('48px')`, also `NaN`, in der Größenleiter an —
       und `NaN` ist ein gültiger *Bezeichner*: die erzeugte Datei trüge
       `xl3: NaN`, übersetzte anstandslos und setzte danach leise falsch.
    */
    const { entwurf, befunde } = liesRuecklauf('{"textScale": {"xl3": "48px"}}', BASIS());
    expect(entwurf?.textScale.xl3).toBe(48);
    expect(texte(befunde, 'korrigiert')).toMatch(/48/);
  });

  it('übernimmt „48pt" NICHT — eine Folien-Einheit ist ¾ Punkt', () => {
    /*
       Beide Richtungen, denn hier liegt der teuerste Rang der Prüfliste. Die
       vorige Fassung nahm die Zahl und schrieb dazu „die Einheit pt fiel weg,
       hier zählen Folien-Einheiten": eine Überschrift ein Drittel zu klein,
       mit einem Satz daneben, der klingt, als sei es bedacht worden.

       Umgerechnet wird trotzdem nicht — „pt" kann ebenso hingeschrieben sein.
       Genannt wird beides: die Rechnung und dass sie nicht angewandt wurde.
    */
    const { entwurf, befunde } = liesRuecklauf('{"textScale": {"xl3": "48pt"}}', BASIS());
    expect(entwurf?.textScale.xl3).toBe(BASIS().textScale.xl3);
    const uebergangen = texte(befunde, 'uebergangen');
    expect(uebergangen).toMatch(/64\.00/);
    expect(uebergangen).toMatch(/¾ Punkt/);
  });

  it('nimmt em nur dort, wo em die Einheit ist', () => {
    const leiter = liesRuecklauf('{"textScale": {"xl3": "3em"}}', BASIS());
    expect(leiter.entwurf?.textScale.xl3).toBe(BASIS().textScale.xl3);
    expect(texte(leiter.befunde, 'uebergangen')).toMatch(/em/);

    const laufweite = liesRuecklauf('{"auszeichnungEnger": "0.02em"}', BASIS());
    expect(laufweite.entwurf?.auszeichnungEnger).toBe(0.02);
  });

  it('rechnet eine Farbe aus rgb() um und meldet es', () => {
    const { entwurf, befunde } = liesRuecklauf(
      '{"palette": {"signal": "rgb(228, 0, 58)"}}',
      BASIS(),
    );
    expect(entwurf?.palette.signal).toBe('#E4003A');
    expect(texte(befunde, 'korrigiert')).toMatch(/signal/);
  });

  it('übergeht eine Farbe, aus der nichts zu lesen ist, statt sie zu erfinden', () => {
    const { entwurf, befunde } = liesRuecklauf('{"palette": {"signal": "knallrot"}}', BASIS());
    expect(entwurf?.palette.signal).toBe(BASIS().palette.signal);
    expect(texte(befunde, 'uebergangen')).toMatch(/knallrot/);
  });

  it('kennt „Italic" und „kursiv" als denselben Schnittstil', () => {
    const roh =
      '{"webfontFaces": [{"family": "Probe", "weight": 400, "style": "normal", "file": "a.woff2"},' +
      ' {"family": "Probe", "weight": 400, "style": "Kursiv", "file": "b.woff2"}]}';
    const { entwurf, befunde } = liesRuecklauf(roh, BASIS());
    expect(entwurf?.webfontFaces.map((face) => face.style)).toEqual(['normal', 'italic']);
    expect(texte(befunde, 'korrigiert')).toMatch(/italic/);
  });

  it('gibt jedem Schnitt eine eigene Kennung', () => {
    // Die Kennung ist die Identität der Formularzeile. Zwei gleiche Schnitte
    // mit derselben Kennung machten die Liste unbedienbar — genau der Fehler,
    // wegen dessen es sie überhaupt gibt.
    const roh =
      '{"webfontFaces": [{"family": "A", "weight": 400, "style": "normal", "file": "a.woff2"},' +
      ' {"family": "A", "weight": 400, "style": "normal", "file": "a.woff2"}]}';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    const kennungen = entwurf?.webfontFaces.map((face) => face.kennung) ?? [];
    expect(new Set(kennungen).size).toBe(kennungen.length);
  });

  it('ersetzt ein unlesbares Gewicht nicht still durch 400', () => {
    /*
       Ein stilles 400 behauptete, das sei gemeint gewesen. Durchgereicht wird
       stattdessen, was nicht zu lesen war — und die Prüfliste sagt gleich
       danach, dass ein @font-face 100 bis 900 kennt.
    */
    const roh =
      '{"webfontFaces": [{"family": "A", "weight": "fett", "style": "normal", "file": "a.woff2"}]}';
    const { entwurf } = liesRuecklauf(roh, BASIS());
    expect(Number.isFinite(entwurf?.webfontFaces[0].weight)).toBe(false);
    expect(pruefe(entwurf as CiEntwurf).some((befund) => /Gewicht/.test(befund.text))).toBe(true);
  });

  it('lässt eine leere Schnittliste die bestehende nicht löschen', () => {
    const vorher = BASIS().webfontFaces.length;
    const { entwurf, befunde } = liesRuecklauf('{"webfontFaces": []}', BASIS());
    expect(entwurf?.webfontFaces).toHaveLength(vorher);
    expect(texte(befunde, 'uebergangen')).toMatch(/leer/);
  });

  it('nimmt nur die drei PDF-Kernschriften, und Großschrift auch', () => {
    const { entwurf, befunde } = liesRuecklauf(
      '{"pdfFontFamily": {"display": "Times", "body": "Arial"}}',
      BASIS(),
    );
    expect(entwurf?.pdfFontFamily.display).toBe('times');
    expect(entwurf?.pdfFontFamily.body).toBe(BASIS().pdfFontFamily.body);
    expect(texte(befunde, 'uebergangen')).toMatch(/Arial/);
  });
});

/* -------------------------------------------------------------------------- */

describe('ein vollständiger Rücklauf', () => {
  /** Was ein Modell liefert, das den Prompt gelesen hat. */
  function vollstaendig(): string {
    return JSON.stringify({
      id: 'probenhaus',
      label: 'Probenhaus',
      markenname: 'Probenhaus GmbH',
      produkt: 'Probenhaus Folien',
      palette: Object.fromEntries(
        paletteRollen.map((rolle) => [rolle, nozillaTheme.palette[rolle]]),
      ),
      fontFamily: Object.fromEntries(
        schriftRollen.map((rolle) => [rolle, nozillaTheme.fontFamily[rolle]]),
      ),
      pdfFontFamily: Object.fromEntries(
        schriftRollen.map((rolle) => [rolle, nozillaTheme.pdfFontFamily[rolle]]),
      ),
      webfontFaces: nozillaTheme.webfont.faces,
      textScale: Object.fromEntries(
        textStufen.map((stufe) => [stufe, nozillaTheme.textScale[stufe]]),
      ),
      sonderstufen: Object.fromEntries(
        sonderstufen.map((stufe) => [stufe, nozillaTheme.typeScale[stufe].size]),
      ),
      auszeichnungEnger: 0,
      stroke: Object.fromEntries(strichRollen.map((rolle) => [rolle, nozillaTheme.stroke[rolle]])),
      shadowOffset: Object.fromEntries(
        schattenRollen.map((rolle) => [rolle, nozillaTheme.shadowOffset[rolle]]),
      ),
    });
  }

  it('kommt ohne eine einzige Lücke und ohne eine einzige Übergehung an', () => {
    const { entwurf, befunde } = liesRuecklauf(vollstaendig(), BASIS());
    expect(texte(befunde, 'fehlt')).toBe('');
    expect(texte(befunde, 'uebergangen')).toBe('');
    expect(entwurf?.markenname).toBe('Probenhaus GmbH');
  });

  it('setzt jede Gruppe wirklich — und nicht nur die, an die man denkt', () => {
    /*
       Je Gruppe eine Zusicherung, und jede nennt den Wert *aus der Antwort*.
       Ohne sie ließe sich das `Object.assign` einer Gruppe ersatzlos entfernen:
       die Grundlage stünde weiter im Entwurf, und nichts wäre rot. Für
       `fontFamily`, `stroke`, `shadowOffset` und `sonderstufen` gab es vorher
       überhaupt keine Prüfung, die „gelesen" von „behalten" trennt.
    */
    const { entwurf } = liesRuecklauf(vollstaendig(), BASIS());
    expect(entwurf?.palette).toEqual(nozillaTheme.palette);
    expect(entwurf?.textScale).toEqual(nozillaTheme.textScale);
    expect(entwurf?.stroke).toEqual(nozillaTheme.stroke);
    expect(entwurf?.shadowOffset).toEqual(nozillaTheme.shadowOffset);
    expect(entwurf?.fontFamily).toEqual(nozillaTheme.fontFamily);
    expect(entwurf?.pdfFontFamily).toEqual(nozillaTheme.pdfFontFamily);
    expect(entwurf?.sonderstufen.headline).toBe(nozillaTheme.typeScale.headline.size);
    expect(entwurf?.webfontFaces.map((face) => face.file)).toEqual(
      nozillaTheme.webfont.faces.map((face) => face.file),
    );
    // Und keiner dieser Werte darf noch der der Grundlage sein — sonst prüfte
    // die Zeile darüber nichts.
    expect(entwurf?.stroke).not.toEqual(BASIS().stroke);
    expect(entwurf?.fontFamily).not.toEqual(BASIS().fontFamily);
  });

  it('lässt Wortmarke und Zeichen unangetastet — sie stehen nicht im Prompt', () => {
    const basis = { ...BASIS(), zeichen: 'ohne-signatur' as const };
    const { entwurf } = liesRuecklauf(vollstaendig(), basis);
    expect(entwurf?.wortmarke).toBeNull();
    expect(entwurf?.zeichen).toBe('ohne-signatur');
  });
});

/* -------------------------------------------------------------------------- */

describe('der Prüfstand aus hässlichen Antworten', () => {
  /*
     Nicht aus dem eigenen Beispiel gebaut — das prüfte den Erzeuger. Was hier
     steht, ist die Sammlung dessen, was Modelle wirklich zurückgeben: eine
     Antwort in Prosa verpackt, eine mit Kommentaren, eine in YAML, eine mit
     erfundenen Rollennamen, eine mit allen Farben als rgb(), eine mit allen
     Größen als „16px", und die eigene Palette wortgleich zurück.

     Die eine Zusicherung, die über allen steht, trägt die Bauart: **jede**
     Eingabe endet entweder mit einem Entwurf oder mit einem Befund, der sagt,
     warum nicht. Stumm durchfallen darf keine.
  */
  const antworten: Array<{ was: string; roh: string; liest: boolean }> = [
    {
      was: 'in Prosa verpackt',
      roh: 'Klar!\n```json\n{"id": "probenhaus", "label": "Probenhaus"}\n```\nPasst das so?',
      liest: true,
    },
    {
      was: 'mit Kommentar und Nachkomma',
      roh: '{\n "id": "probenhaus", // klein\n "label": "Probenhaus",\n}',
      liest: true,
    },
    {
      was: 'mit allen Farben als rgb()',
      roh: JSON.stringify({
        palette: Object.fromEntries(paletteRollen.map((rolle) => [rolle, 'rgb(228, 0, 58)'])),
      }),
      liest: true,
    },
    {
      was: 'mit allen Größen als „16px"',
      roh: JSON.stringify({
        textScale: Object.fromEntries(textStufen.map((stufe, i) => [stufe, `${10 + i * 8}px`])),
      }),
      liest: true,
    },
    {
      was: 'mit erfundenen Rollennamen',
      roh: '{"palette": {"primary": "#E4003A", "background": "#FFFFFF", "foreground": "#101010"}}',
      liest: true,
    },
    {
      was: 'mit derselben Rolle zweimal',
      roh: '{"palette": {"paper": "#FAF7F2", "paper": "#111111"}}',
      liest: true,
    },
    {
      was: 'in YAML statt JSON',
      roh: 'id: probenhaus\nlabel: Probenhaus\npalette:\n  signal: #E4003A',
      liest: false,
    },
    { was: 'als reine Prosa', roh: 'Das kann ich leider nicht.', liest: false },
    /*
       Eine Liste mit einem Objekt darin **wird** gelesen, und zwar deren
       erstes: die eckigen Klammern sind für den Leser Vorspann und Nachsatz
       wie jeder Satz davor, und beide Schnitte stehen im Bericht. Eine Liste
       *ohne* Objekt fällt durch — das prüft „nimmt keine Liste als Objekt"
       weiter oben.
    */
    { was: 'als Liste mit einem Objekt darin', roh: '[{"id": "probenhaus"}]', liest: true },
    {
      was: 'mitten im Wort abgeschnitten',
      roh: '{"id": "probenhaus", "palette": {"signal": "#E4',
      liest: false,
    },
  ];

  for (const fall of antworten) {
    it(`fällt bei einer Antwort ${fall.was} nicht stumm durch`, () => {
      const { entwurf, befunde } = liesRuecklauf(fall.roh, BASIS());
      expect(befunde.length, 'gar kein Befund').toBeGreaterThan(0);
      expect(Boolean(entwurf)).toBe(fall.liest);
      if (!entwurf) {
        expect(texte(befunde, 'fehler'), 'kein Grund genannt').not.toBe('');
      }
    });
  }

  it('nimmt die eigene Palette wortgleich an und ändert nichts', () => {
    /*
       Der Fall, der am leichtesten falsch zählt: sechzehn gelieferte Rollen,
       null Änderungen. Ein Knopf, der hier „16 Werte übernehmen" verspricht,
       tut nichts.
    */
    const basis = BASIS();
    const roh = JSON.stringify({ palette: basis.palette });
    const { entwurf, aenderungen, befunde } = liesRuecklauf(roh, basis);
    expect(entwurf?.palette).toEqual(basis.palette);
    expect(aenderungen).toEqual([]);
    expect(texte(befunde, 'fehlt')).not.toMatch(/Die Palette lässt/);
  });

  it('rechnet die Farben und die Größen wirklich um', () => {
    // Die Gegenrichtung zum Prüfstand: dass etwas *durchgeht*, ist die halbe
    // Auskunft — was ankommt, gehört auch geprüft.
    const farben = liesRuecklauf(
      JSON.stringify({
        palette: Object.fromEntries(paletteRollen.map((rolle) => [rolle, 'rgb(228, 0, 58)'])),
      }),
      BASIS(),
    );
    expect(farben.entwurf?.palette.signal).toBe('#E4003A');
    expect(farben.entwurf?.palette.ink).toBe('#E4003A');

    const groessen = liesRuecklauf('{"textScale": {"base": "18px"}}', BASIS());
    expect(groessen.entwurf?.textScale.base).toBe(18);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Vorschau', () => {
  it('entscheidet über frisch und veraltet in einer Rechnung', () => {
    /*
       Als reine Funktion prüfbar, und das ist der Punkt. Der Fehler, gegen den
       sie steht, ist für `tsc`, ESLint und Prettier unsichtbar:
       `const theme = frisch;` lässt den Merker beschrieben und ungelesen, und
       `const veraltet = false && …` bleibt ein gültiger boolean. Die Sabotage
       **baut** — nur der Rauchtest sah sie, und ein einziger Zeuge ist in
       diesem Projekt schon zweimal zu wenig gewesen.
    */
    expect(vorschaustand('neu', 'alt')).toEqual({ stand: 'neu', veraltet: false });
    expect(vorschaustand(null, 'alt')).toEqual({ stand: 'alt', veraltet: true });
    expect(vorschaustand(null, null)).toEqual({ stand: null, veraltet: false });
  });

  it('zeichnet ohne Wortmarke mit einem Platzhalter — und schreibt trotzdem keine Datei', () => {
    /*
       Die Wortmarke steht spät im Wizard, weil man für sie eine Datei suchen
       muss. Ohne den Platzhalter wären fünf von acht Schritten ohne Bild, und
       ausgerechnet „Farbe" wäre blind.

       Die Grenze dazu ist die eigentliche Prüfung: `themeAusEntwurf()` wirft
       weiter, der Befund bleibt stehen, und der Platzhalter taucht in keiner
       erzeugten Zeile auf. Ein Bild, keine Zusage.
    */
    const ohne = { ...BASIS(), wortmarke: null, palette: leererEntwurf().palette };
    expect(() => themeAusEntwurf(ohne)).toThrow();

    const theme = vorschauTheme(ohne);
    expect(theme.wordmark.letters.length).toBeGreaterThan(0);
    expect(pruefe(ohne).some((befund) => befund.feld === 'Wortmarke')).toBe(true);
    expect(() => designdatei(ohne)).toThrow();
  });
});

describe('eine kaputte Farbe bringt die anderen Befunde nicht zum Schweigen', () => {
  it('meldet den Kontrast auch dann, wenn eine Rolle unlesbar ist', () => {
    /*
       Die vorige Fassung stieg nach der ersten unlesbaren Rolle aus. Eine
       Raute zu wenig in einem von sechzehn Feldern — und jeder Kontrast- und
       jeder Trennbefund schwieg, während die Liste kürzer aussah und kürzer
       genannt wurde.
    */
    const entwurf: CiEntwurf = {
      ...leererEntwurf(),
      id: 'probe',
      label: 'Probe',
      palette: {
        ...leererEntwurf().palette,
        signalSoft: 'knallrot',
        paper: '#FFFFFF',
        white: '#FFFFFF',
      },
    };
    const befunde = pruefe(entwurf);
    expect(befunde.some((b) => b.rang === 'fehler' && /signalSoft/.test(b.text))).toBe(true);
    expect(befunde.some((b) => b.rang === 'warnung' && /„paper" und „white"/.test(b.text))).toBe(
      true,
    );
  });

  it('klagt nicht über die Trennung einer Rolle, die gar keine Farbe trägt', () => {
    // Die Gegenrichtung: „signalSoft und signal sind dieselbe Farbe" wäre über
    // einem unlesbaren Wert eine Behauptung ins Blaue.
    const entwurf: CiEntwurf = {
      ...leererEntwurf(),
      palette: { ...leererEntwurf().palette, signalSoft: 'knallrot' },
    };
    const befunde = pruefe(entwurf);
    expect(befunde.some((b) => /„signalSoft" und „signal"/.test(b.text))).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Wortmarke aus einer Datei', () => {
  it('liest die Füllfarben auch aus einfachen Anführungszeichen', () => {
    /*
       Ein Leser, eine Wahrheit. Das Formular hatte einen eigenen Ausdruck, der
       nur `fill="…"` kannte, während `readPaths()` beide Schreibweisen liest —
       eine Datei in einfachen Anführungszeichen kam mit zwei leeren Farbfeldern
       an, und die Prüfliste beklagte eine Datei, die in Ordnung war.
    */
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 48'>" +
      "<path fill='#101010' d='M0 0 H120 V48 H0 Z'/>" +
      "<path fill='#E4003A' d='M140 24 H164 V48 H140 Z'/></svg>";
    const marke = wortmarkeAusSvg(svg, 'probe.svg');
    expect(marke.letters).toBe('#101010');
    expect(marke.accent).toBe('#E4003A');

    // Und die Datei zeichnet danach wirklich — ohne NaN im Markup.
    const entwurf: CiEntwurf = { ...BASIS(), palette: leererEntwurf().palette, wortmarke: marke };
    expect(() => themeAusEntwurf(entwurf)).not.toThrow();
  });

  it('schlägt die Farben der neuen Datei vor und nicht die der alten', () => {
    // Die vorige Fassung behielt mit `marke?.letters || gefunden[0]` die alten
    // Werte: wer eine zweite Wortmarke wählte, bekam die Zuordnung der ersten,
    // und die Prüfliste meldete „kein Pfad in #101010" über eine Datei, in der
    // nie ein Schwarz stand.
    const zweite = wortmarkeAusSvg(
      '<svg viewBox="0 0 100 20"><path fill="#223344" d="M0 0 H10 V10 H0 Z"/></svg>',
      'zweite.svg',
    );
    expect(zweite.letters).toBe('#223344');
    expect(zweite.accent).toBe('');
  });

  it('erbt die Füllfarbe vom <g> — sonst verliert der Schriftzug seine Buchstaben', () => {
    /*
       Die Form, die Illustrator, Figma und Inkscape für eine gruppierte
       Auswahl schreiben: die Buchstaben tragen ihre Farbe am umschließenden
       `<g>`, der Akzent hat ein eigenes `fill`. `readPaths()` las nur das
       Attribut am `<path>` — die Buchstabenpfade kamen mit leerer Füllung
       zurück, `wortmarkeAusSvg()` schlug deshalb die *Akzentfarbe* als
       Buchstabenton vor, und auf der Folie, im SVG, im PDF und in der PPTX
       stand danach nur noch der Akzentpunkt. Bei grüner Prüfliste.
    */
    const ausIllustrator =
      '<svg viewBox="0 0 200 48">' +
      '<g fill="#101010">' +
      '<path d="M0 0 H60 V40 H0 Z"/><path d="M70 0 H120 V40 H70 Z"/>' +
      '</g>' +
      '<path fill="#E4003A" d="M140 24 H164 V40 H140 Z"/></svg>';
    const marke = wortmarkeAusSvg(ausIllustrator, 'gruppe.svg');
    expect(marke.letters).toBe('#101010');
    expect(marke.accent).toBe('#E4003A');

    // Und die Buchstaben stehen wirklich in der Zeichnung, nicht nur im Feld.
    const entwurf: CiEntwurf = { ...BASIS(), palette: leererEntwurf().palette, wortmarke: marke };
    const wortmarke = themeAusEntwurf(entwurf).wordmark;
    expect(wortmarke.letters).toContain('M0 0');
    expect(wortmarke.letters).toContain('M70 0');
    expect(wortmarke.period).toContain('M140 24');
    expect(pruefe(entwurf).filter((befund) => befund.rang === 'fehler')).toEqual([]);
  });

  it('liest die Füllfarbe auch aus einem style-Attribut', () => {
    // Inkscape schreibt `style="fill:#101010"` statt des Attributs, und wo
    // beides dasteht, entscheidet CSS für das `style`.
    const svg =
      '<svg viewBox="0 0 200 48">' +
      '<path style="fill:#101010" d="M0 0 H60 V40 H0 Z"/>' +
      '<path fill="#000000" style="fill: #E4003A ;" d="M140 24 H164 V40 H140 Z"/></svg>';
    const marke = wortmarkeAusSvg(svg, 'inkscape.svg');
    expect(marke.letters).toBe('#101010');
    expect(marke.accent).toBe('#E4003A');
  });

  it('meldet die Pfade, die auch nach dem Erben keine Farbe tragen', () => {
    /*
       Die Farben stehen in einer CSS-Klasse im `<style>`-Block — die liest
       hier niemand, und eine zu erfinden hieße zu behaupten, sie sei gemeint.
       Gesagt gehört es trotzdem: diese Pfade fallen aus jeder Ausgabe, und
       vorher stand darüber kein Wort. Die vorige Fassung war sogar doppelt
       blind — `letters` blieb leer, und die Prüfung `pfade.some(gleich('',''))`
       hielt die leere Farbe für gefunden.
    */
    const ausCss =
      '<svg viewBox="0 0 200 48"><style>.a{fill:#101010}</style>' +
      '<path class="a" d="M0 0 H60 V40 H0 Z"/><path class="a" d="M70 0 H120 V40 H70 Z"/></svg>';
    const marke = wortmarkeAusSvg(ausCss, 'css.svg');
    expect(marke.letters).toBe('');

    const entwurf: CiEntwurf = { ...BASIS(), palette: leererEntwurf().palette, wortmarke: marke };
    const fehler = pruefe(entwurf).filter(
      (befund) => befund.feld === 'Wortmarke' && befund.rang === 'fehler',
    );
    expect(fehler.map((befund) => befund.text).join(' | ')).toMatch(/keine Füllfarbe/);
    expect(fehler.map((befund) => befund.text).join(' | ')).toMatch(/Buchstabenfarbe fehlt/);
    // Und die Datei entsteht nicht: sie trüge `letters: ''`.
    expect(traegtFehler(pruefe(entwurf))).toBe(true);
  });

  it('schlägt „none" nicht als Farbe vor', () => {
    // `fill="none"` heißt „hier wird nichts gemalt" — als Buchstabenton
    // vorgeschlagen ergäbe es einen Schriftzug aus Pfaden, die nichts zeichnen.
    const svg =
      '<svg viewBox="0 0 200 48">' +
      '<path fill="none" d="M0 0 H200 V48 H0 Z"/>' +
      '<path fill="#101010" d="M0 0 H60 V40 H0 Z"/></svg>';
    expect(wortmarkeAusSvg(svg, 'rahmen.svg').letters).toBe('#101010');
  });

  it('sagt es, wenn eine dritte Füllfarbe nirgends gezeichnet wird', () => {
    /*
       Die Marke kennt genau zwei Farben: `wordmarkFromSvg()` sammelt die
       Pfade in `letters` und die in `accent` und verwirft den Rest, und
       `wortmarkeAusSvg()` nimmt beim Einlesen die ersten beiden, die es
       findet. Eine dreifarbige Datei verlor damit ein Drittel ihrer Pfade —
       auf der Folie, im SVG, im PDF und in der PPTX, ohne dass irgendwo etwas
       stand. Dass es zwei Farben sind, ist eine Entscheidung dieses Werkzeugs;
       sie stumm durchzuziehen ist keine.
    */
    const drei =
      '<svg viewBox="0 0 300 48">' +
      '<path fill="#101010" d="M0 0 H120 V48 H0 Z"/>' +
      '<path fill="#E4003A" d="M140 24 H164 V48 H140 Z"/>' +
      '<path fill="#0066FF" d="M200 0 H240 V48 H200 Z"/></svg>';
    const marke = wortmarkeAusSvg(drei, 'drei.svg');
    const entwurf: CiEntwurf = { ...BASIS(), palette: leererEntwurf().palette, wortmarke: marke };

    const gesagt = pruefe(entwurf).filter(
      (befund) => befund.feld === 'Wortmarke' && /0066FF/i.test(befund.text),
    );
    expect(gesagt).toHaveLength(1);
    expect(gesagt[0].rang).toBe('warnung');

    // Und die Gegenrichtung, ohne die die Regel nur eine halbe wäre: eine
    // zweifarbige Datei bekommt darüber kein Wort.
    const zwei =
      '<svg viewBox="0 0 200 48">' +
      '<path fill="#101010" d="M0 0 H120 V48 H0 Z"/>' +
      '<path fill="#E4003A" d="M140 24 H164 V48 H140 Z"/></svg>';
    const sauber: CiEntwurf = {
      ...entwurf,
      wortmarke: wortmarkeAusSvg(zwei, 'zwei.svg'),
    };
    expect(
      pruefe(sauber).filter(
        (befund) => befund.feld === 'Wortmarke' && /Füllfarbe/.test(befund.text),
      ),
    ).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Bereiche der Maße', () => {
  it('meldet, was läuft und trotzdem falsch ist — an jeder Grenze', () => {
    /*
       Beide Richtungen je Grenze. Eine Strichstärke von 200 stürzt nicht ab,
       sie füllt die Folie; eine Schriftgröße von 3 übersetzt und ist auf keiner
       Leinwand mehr zu lesen. Ohne diese Prüfung sieht man beides erst am
       ersten Deck.
    */
    const mit = (teil: Partial<CiEntwurf>): string =>
      pruefe({ ...leererEntwurf(), ...teil })
        .filter((befund) => befund.rang === 'warnung')
        .map((befund) => befund.text)
        .join(' | ');

    const leer = leererEntwurf();
    expect(mit({ stroke: { ...leer.stroke, heavy: 200 } })).toMatch(/heavy/);
    expect(mit({ stroke: { ...leer.stroke, heavy: 0.1 } })).toMatch(/heavy/);
    expect(mit({ stroke: { ...leer.stroke, heavy: 4 } })).not.toMatch(/heavy/);

    expect(mit({ textScale: { ...leer.textScale, xs: 3 } })).toMatch(/„xs"/);
    expect(mit({ textScale: { ...leer.textScale, xl4: 900 } })).toMatch(/„xl4"/);

    expect(mit({ shadowOffset: { ...leer.shadowOffset, lg: 200 } })).toMatch(/„lg"/);
    expect(mit({ auszeichnungEnger: 0.5 })).toMatch(/Laufweite/);
    expect(mit({ auszeichnungEnger: 0.02 })).not.toMatch(/Laufweite/);
  });

  it('klagt nicht zweimal über dieselbe Stelle', () => {
    // Ein leeres Feld ist bereits ein Fehler. Eine Bereichswarnung darüber
    // machte die Liste länger und nicht klarer.
    const leer = leererEntwurf();
    const befunde = pruefe({ ...leer, stroke: { ...leer.stroke, heavy: Number.NaN } });
    expect(befunde.filter((befund) => /heavy/.test(befund.text))).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('der Vorschlag', () => {
  it('schreibt nicht in den Entwurf, den er gelesen hat', () => {
    /*
       Der Riegel, der die ganze Bauart trägt: `liesRuecklauf()` liefert einen
       Entwurf, es *setzt* keinen. Wäre es anders, gäbe es keinen Vorschlag,
       den man ansehen und ablehnen kann — nur eine Quittung. Eingefroren wie
       in `deckStore.test.ts`: wer künftig an Ort und Stelle ändert, bekommt
       einen TypeError statt eines stillen Fehlers.
    */
    const basis = Object.freeze({
      ...BASIS(),
      palette: Object.freeze({ ...BASIS().palette }),
      textScale: Object.freeze({ ...BASIS().textScale }),
      webfontFaces: Object.freeze([...BASIS().webfontFaces]),
    }) as CiEntwurf;

    const { entwurf } = liesRuecklauf('{"id": "neu", "palette": {"signal": "#E4003A"}}', basis);
    expect(entwurf?.id).toBe('neu');
    expect(basis.id).toBe('basis');
    expect(basis.palette.signal).not.toBe('#E4003A');
  });

  it('zählt die Werte, die sich wirklich ändern', () => {
    /*
       Ein Knopf, der „16 Werte übernehmen" verspricht und nichts tut, ist
       genau die Sorte Zahl, die dieses Projekt schon einmal teuer bezahlt hat
       („Ein Knopf, der eine Zahl nennt und eine andere tut"). Gezählt wird
       deshalb der Unterschied und nicht das Gelieferte.
    */
    const basis = BASIS();
    const gleich = liesRuecklauf(JSON.stringify({ id: basis.id, label: basis.label }), basis);
    expect(gleich.aenderungen).toEqual([]);

    const anders = liesRuecklauf('{"id": "neu", "textScale": {"xl3": 61}}', basis);
    expect(anders.aenderungen.map((eintrag) => eintrag.name).sort()).toEqual(['id', 'xl3']);
    const id = anders.aenderungen.find((eintrag) => eintrag.name === 'id');
    expect(id).toMatchObject({ feld: 'Marke', war: 'basis', wird: 'neu' });
  });

  it('hält NaN gegen NaN nicht für eine Änderung', () => {
    /*
       Ein leeres Zahlenfeld schreibt NaN in den Entwurf; die Prüfliste meldet
       das als Fehler, der Wert steht aber da. Eine Antwort, die dieses Feld
       nicht nennt, ändert daran nichts — `NaN === NaN` ist trotzdem false.
       Der Knopf versprach danach „Einen Wert übernehmen" über einer Antwort,
       die nichts tut, und verbrauchte beim Klick den Weg zurück.
    */
    const mitNaN = { ...BASIS(), auszeichnungEnger: Number.NaN };
    expect(liesRuecklauf('{}', mitNaN).aenderungen).toEqual([]);

    // Die Gegenrichtung: eine echte Zahl gegen NaN ist sehr wohl eine Änderung.
    const echt = liesRuecklauf('{"auszeichnungEnger": -0.01}', mitNaN).aenderungen;
    expect(echt.map((eintrag) => eintrag.name)).toEqual(['auszeichnungEnger']);
  });

  it('nennt eine geänderte Schnittliste als eine Zeile und nicht als neun', () => {
    const roh =
      '{"webfontFaces": [{"family": "A", "weight": 400, "style": "normal", "file": "a.woff2"},' +
      ' {"family": "A", "weight": 700, "style": "normal", "file": "b.woff2"}]}';
    const { aenderungen } = liesRuecklauf(roh, BASIS());
    const schnitte = aenderungen.filter((eintrag) => eintrag.name === 'Schnitte');
    expect(schnitte).toHaveLength(1);
    /*
       Genannt wird, **welche** Zeilen gehen und welche kommen. Die vorige
       Fassung schrieb die beiden Längen hin, und das war bei neun gegen neun
       andere Schnitten — derselben Familie in anderen Dateien, also dem
       Normalfall — die Zeile „9 Schnitte → 9 Schnitte": zwei gleiche Zahlen
       über der Behauptung, dazwischen ändere sich etwas.
    */
    expect(schnitte[0].war).toContain('Basisschrift 400 normal basis.woff2');
    expect(schnitte[0].wird).toContain('A 400 normal a.woff2');
    expect(schnitte[0].wird).toContain('A 700 normal b.woff2');
  });

  it('nennt bei gleicher Länge, was getauscht wird — und nicht zweimal dieselbe Zahl', () => {
    /*
       Der Fall, an dem die vorige Fassung stumm war: dieselbe Zahl Schnitte,
       andere Dateien. Sie schrieb „1 Schnitte → 1 Schnitte" und ließ den
       Leser mit der Frage stehen, was sich denn nun ändert.
    */
    const basis = BASIS();
    const roh = JSON.stringify({
      webfontFaces: basis.webfontFaces.map((face) => ({
        family: face.family,
        weight: face.weight,
        style: face.style,
        file: 'anders.woff2',
      })),
    });
    const schnitte = liesRuecklauf(roh, basis).aenderungen.filter(
      (eintrag) => eintrag.name === 'Schnitte',
    );
    expect(schnitte).toHaveLength(1);
    expect(schnitte[0].war).toContain('basis.woff2');
    expect(schnitte[0].wird).toContain('anders.woff2');
    expect(schnitte[0].war).not.toBe(schnitte[0].wird);
  });

  it('meldet keine Änderung, wenn die Liste dieselbe bleibt', () => {
    // Die Gegenrichtung: die Kennungen zählen bei jedem Lesen hoch, also wären
    // sie als Vergleichsgrundlage immer ungleich. Verglichen werden die Werte.
    const basis = BASIS();
    const roh = JSON.stringify({
      webfontFaces: basis.webfontFaces.map(({ family, weight, style, file }) => ({
        family,
        weight,
        style,
        file,
      })),
    });
    expect(liesRuecklauf(roh, basis).aenderungen).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('eine abgebrochene Antwort', () => {
  /** Wie eine Antwort aussieht, der das Modell die Luft ausgegangen ist. */
  const ABGESCHNITTEN =
    '{\n  "id": "probenhaus",\n  "label": "Probenhaus",\n' +
    '  "palette": { "signal": "#E4003A", "ink": "#101010" },\n  "paper": "#FAF';

  it('wird als Abbruch erkannt und nicht als Tippfehler', () => {
    /*
       Der häufigste Grund für eine unlesbare Antwort ist die Längengrenze des
       Modells, und von einer verunglückten Klammer ist das an der rohen
       Parser-Meldung nicht zu unterscheiden. Die Sackgasse ist dieselbe — nur
       dass hier drei Felder schon dastehen und niemand sie bekommt.
    */
    const { entwurf, abbruch, befunde } = liesRuecklauf(ABGESCHNITTEN, BASIS());
    expect(entwurf).toBeNull();
    expect(abbruch).not.toBeNull();
    /*
       Zwei Schlüssel und nicht einer, und der Unterschied ist die ganze
       Auskunft: „palette" stand vollständig da, „paper" riss ab. Die vorige
       Fassung führte nur den zuletzt *begonnenen* und nannte ihn „zuletzt
       vollständig" — sie behauptete also von genau dem Feld, an dem die
       Antwort scheiterte, es sei fertig. Wer danach das Modell „ab paper"
       fortsetzen ließ, bekam den Rest richtig; wer die Zeile daneben las,
       suchte den Fehler an der falschen Stelle.
    */
    expect(abbruch?.letzterSchluessel).toBe('palette');
    expect(abbruch?.offenerSchluessel).toBe('paper');
    expect(Object.keys(abbruch?.objekt ?? {})).toEqual(['id', 'label', 'palette']);
    expect(texte(befunde, 'fehler')).toMatch(/mitten im Satz/);
    // Und die rohe Meldung bleibt trotzdem stehen — wer einen Fehler meldet,
    // braucht sie.
    expect(texte(befunde, 'uebergangen')).toMatch(/Meldung des Lesers/);
  });

  it('gibt den vollständigen Anfang her — aber erst auf Verlangen', () => {
    const { abbruch } = liesRuecklauf(ABGESCHNITTEN, BASIS());
    expect(abbruch).not.toBeNull();

    const teil = teilRuecklauf(abbruch as NonNullable<typeof abbruch>, BASIS());
    expect(teil.entwurf?.id).toBe('probenhaus');
    expect(teil.entwurf?.palette.signal).toBe('#E4003A');
    // Und was nach dem Abbruch stand, ist draußen — samt einer Meldung dazu.
    expect(teil.entwurf?.palette.paper).toBe(BASIS().palette.paper);
    expect(texte(teil.befunde, 'fehlt')).toMatch(/paper/);
  });

  it('rettet auch die Rollen, wenn der Abbruch mitten in der Palette liegt', () => {
    /*
       Der Fall, den der Kopfkommentar von `Abbruch` beschreibt — und den die
       vorige Fassung gerade nicht konnte. Sie merkte sich Schnitte nur auf der
       obersten Ebene: bricht die Antwort *innerhalb* der Palette ab, war der
       letzte Schnitt der vor „palette", und angeboten wurden zwei Felder statt
       der schon gelieferten Farbrollen. Weil die Palette der längste Block
       einer Modellantwort ist, ist das der Regelfall eines Längenabbruchs und
       nicht sein Rand.
    */
    const inDerPalette =
      '{\n  "id": "probenhaus",\n  "label": "Probenhaus",\n  "palette": {\n' +
      '    "signal": "#E4003A",\n    "signalStrong": "#B8002F",\n    "ink": "#101010",\n' +
      '    "paper": "#FAF';

    const { abbruch } = liesRuecklauf(inDerPalette, BASIS());
    expect(abbruch).not.toBeNull();
    expect(Object.keys(abbruch?.objekt ?? {})).toEqual(['id', 'label', 'palette']);
    expect(Object.keys((abbruch?.objekt.palette ?? {}) as object)).toEqual([
      'signal',
      'signalStrong',
      'ink',
    ]);

    // Und der Teilimport bringt sie wirklich in den Entwurf — samt einer
    // Meldung über die Rollen, die nicht mehr kamen.
    const teil = teilRuecklauf(abbruch as NonNullable<typeof abbruch>, BASIS());
    expect(teil.entwurf?.palette.signal).toBe('#E4003A');
    expect(teil.entwurf?.palette.ink).toBe('#101010');
    expect(teil.entwurf?.palette.paper).toBe(BASIS().palette.paper);
    expect(texte(teil.befunde, 'fehlt')).toMatch(/paper/);
  });

  it('nennt beim Fortsetzen nicht dieselbe Stelle als fertig und als offen', () => {
    /*
       Reißt die Antwort zwischen zwei Feldern ab — nach der schließenden
       Klammer, nach dem Komma oder mitten im nächsten Schlüsselnamen —, stand
       auf dem Bildschirm „zuletzt vollständig war ‚palette', abgerissen ist sie
       in ‚palette' … bitte es, ab ‚palette' fortzusetzen". Der Satz widerspricht
       sich selbst, und der Rat schickt das Modell an eine Stelle, die schon
       fertig ist: es liefert denselben Block noch einmal und bricht wieder an
       derselben Stelle ab.
    */
    const zwischenFeldern = '{"id":"p","label":"P","palette":{"ink":"#000000"},"textSc';
    const { befunde, abbruch } = liesRuecklauf(zwischenFeldern, BASIS());
    expect(abbruch?.letzterSchluessel).toBe('palette');
    const satz = texte(befunde, 'fehler');
    expect(satz).toMatch(/palette/);
    expect(satz).not.toMatch(/ab „palette" fortzusetzen/);
    expect(satz).toMatch(/nach „palette"/);
  });

  it('erkennt einen Abbruch auch hinter einem offenen Codezaun', () => {
    /*
       Die Form, in der ein Längenabbruch wirklich ankommt: Vorrede, ein Zaun
       auf, und der schließende kam nie. Dann ist der erste Zaun zugleich der
       letzte, und ein Zuschnitt „von der Zeile danach bis zur Zeile davor"
       ergäbe die leere Zeichenkette — die ganze Abbruchbehandlung fiele weg,
       und übrig bliebe „Daraus wird kein JSON-Objekt: Unexpected end of JSON
       input". Genau die Sackgasse, für die es `abgebrochen()` gibt.
    */
    const roh = 'Klar, hier ist die CI:\n```json\n{\n  "id": "probenhaus",\n  "label": "Prob';
    const { abbruch, entwurf } = liesRuecklauf(roh, BASIS());
    expect(entwurf).toBeNull();
    expect(abbruch).not.toBeNull();
    expect(abbruch?.objekt).toEqual({ id: 'probenhaus' });
    expect(abbruch?.offenerSchluessel).toBe('label');
  });

  it('hält eine vollständige Antwort nicht für abgebrochen', () => {
    // Die Gegenrichtung. Ohne sie böte der Bericht bei jeder gelungenen
    // Antwort einen Teilimport an, den niemand braucht.
    expect(liesRuecklauf('{"id": "probenhaus"}', BASIS()).abbruch).toBeNull();
    expect(abgebrochen('{"id": "probenhaus"}')).toBeNull();
    // Auch nicht bei einer Klammer in einem Wert.
    expect(abgebrochen('{"label": "Probe } Haus"}')).toBeNull();
  });

  it('gibt auf, wenn noch kein einziges Feld fertig war', () => {
    // Ein Teilimport von null Feldern wäre ein Knopf, der nichts tut.
    expect(abgebrochen('{"id": "probenh')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe('die Sitzung des Generators', () => {
  it('benutzt einen anderen Schlüssel als die Sitzung des Decks', () => {
    /*
       Der eine Riegel, ohne den diese ganze Ablage nicht sein dürfte. Der
       Grund, aus dem der Generator keinen Store hat, ist die Sitzung des
       Decks; berührte er sie, schriebe er mitten in einem Vortrag über die
       Arbeit im ersten Fenster.
    */
    expect(entwurfSchluessel).not.toBe(SITZUNG);
  });

  it('legt fehlende Rollen aus der Vorbelegung nach', () => {
    // Eine Datei aus einer älteren Fassung kennt eine neue Palettenrolle
    // nicht. `Palette` ist ein `Record` über dieselben Schlüssel — der
    // Compiler merkte die Lücke nicht, und die Prüfliste erst zwei Schritte
    // später.
    const gelesen = zusammen({ id: 'alt', palette: { signal: '#E4003A' } as never }).entwurf;
    expect(gelesen.id).toBe('alt');
    expect(gelesen.palette.signal).toBe('#E4003A');
    expect(gelesen.palette.ink).toBe(leererEntwurf().palette.ink);
    expect(Object.keys(gelesen.palette).sort()).toEqual([...paletteRollen].sort());
  });

  it('überlebt eine fremde Datei, statt die Seite wegzureißen', () => {
    /*
       Der schwerste Fall dieser Datei. `zusammen()` legte einmal `...gelesen`
       über den leeren Entwurf, ohne einen einzigen Feldtyp zu prüfen — und
       `pruefe()` läuft in einem `useMemo` *während des Renderns* und greift auf
       `entwurf.id.trim()`, `marke.svg.length` und `palette[rolle].trim()` zu.
       Eine fremde .json mit einer numerischen `id` warf dort einen TypeError,
       und der `try/catch` um „Entwurf laden" konnte ihn nicht fangen: `ersetze()`
       plant nur eine Zustandsänderung, gerendert wird danach. Ergebnis: weißes
       Fenster, keine Meldung, kein Formular mehr.

       Geprüft wird deshalb an dem, was danach passiert — `pruefe()` muss
       durchlaufen, nicht nur `zusammen()`.
    */
    /*
       Die Liste wird **gerechnet und nicht getippt**. Die vorige prüfte sieben
       Felder von fünfzehn — `label`, `markenname`, `produkt` und `fontFamily`
       fehlten, und `pruefe()` fasst die genauso an (`label.trim()`,
       `stapelNamen(fontFamily[rolle])`). Eine fremde Datei mit `{"label": 42}`
       hätte die Seite genauso weggerissen, und der Test dafür wäre grün
       geblieben. Ein neues oberstes Feld bekommt so keine stillschweigende
       Ausnahme.
    */
    const fremd: unknown[] = [
      ...Object.keys(leererEntwurf()).map((feld) => ({ [feld]: 42 })),
      ...Object.keys(leererEntwurf()).map((feld) => ({ [feld]: { irgendwas: 42 } })),
      { wortmarke: {} },
      { wortmarke: 'nicht objekt' },
      { palette: { ink: 12 } },
      { textScale: { base: 'groß' } },
      { webfontFaces: [null, 7, { family: 5 }] },
      { pdfFontFamily: { display: 'Comic Sans' } },
      { zeichen: 'erfunden' },
      {},
    ];

    for (const roh of fremd) {
      const entwurf = zusammen(roh as Partial<CiEntwurf>).entwurf;
      expect(() => pruefe(entwurf), `${JSON.stringify(roh)} riss die Prüfung weg`).not.toThrow();
      expect(typeof entwurf.id).toBe('string');
      expect(typeof entwurf.palette.ink).toBe('string');
      // Und was nicht passt, fällt auf die Vorbelegung zurück statt zu fehlen.
      expect(Object.keys(entwurf.palette).sort()).toEqual([...paletteRollen].sort());
    }

    /*
       Die Gegenrichtung, und zwar über den **ganzen** Entwurf. Vorher standen
       hier drei Gruppen von zwölf: `stroke: leer.stroke` zu schreiben — also
       das Gelesene wegzuwerfen — wäre unbemerkt geblieben, und wer im Schritt
       „Maße" die Striche und Schatten setzt und dann ⌘R drückt, bekäme sie
       stillschweigend zurückgesetzt. Eine Zusicherung über alles deckt auch
       eine künftige Gruppe ab.

       Die Kennungen bleiben außen vor: sie werden beim Lesen neu vergeben, und
       das ist Absicht.
    */
    const echt = BASIS();
    const zurueck = zusammen(JSON.parse(JSON.stringify(echt)) as Partial<CiEntwurf>).entwurf;
    const ohneKennung = (entwurf: CiEntwurf) => ({
      ...entwurf,
      webfontFaces: entwurf.webfontFaces.map(({ family, weight, style, file }) => ({
        family,
        weight,
        style,
        file,
      })),
    });
    expect(ohneKennung(zurueck)).toEqual(ohneKennung(echt));
  });

  it('nimmt eine Datei nicht an, aus der kein bekanntes Feld kommt', () => {
    /*
       Eine fremde `.json` — eine `package.json` etwa — ergab exakt den leeren
       Entwurf: kein Wort, kein Fehler, und der Sprung nach Schritt 1 sah aus
       wie ein gelungener Ladevorgang. Der Satz „… ist kein gesicherter
       Entwurf" stand direkt daneben und wurde nie erreicht.
    */
    const fremd = zusammen({ name: 'nozilla', version: '1.0.0' } as never);
    expect(fremd.genommen).toEqual([]);

    // Und die Gegenrichtung: ein einziges bekanntes Feld genügt.
    expect(zusammen({ id: 'probe' }).genommen).toEqual(['id']);
  });

  it('nennt die Felder, die es nicht lesen konnte, statt sie stumm zu ersetzen', () => {
    /*
       Eine Rolle mit falschem Typ fiel wortlos auf nozillas Wert zurück, und
       die Prüfliste kann davon nichts sagen — `#000000` ist eine gültige
       Farbe. Der Nächste arbeitete danach mit einer Tinte, die er nie gewählt
       hat. Das ist die Linie, die dieses Projekt beim unlesbaren `nzl`-Block
       und beim unbekannten `theme:` andersherum entschieden hat: den Wert
       behalten, die Lücke zeigen.
    */
    const gemischt = zusammen({
      id: 'probe',
      label: 42,
      palette: 'creme und rot',
    } as never);
    expect(gemischt.genommen).toContain('id');
    expect(gemischt.verworfen).toEqual(expect.arrayContaining(['label', 'palette']));
    // Was nicht dastand, wird auch nicht beklagt.
    expect(gemischt.verworfen).not.toContain('stroke');
  });

  it('sagt es, wenn der Browser gar keine Ablage hergibt', () => {
    /*
       Der zweite Weg in dieselbe Stille. Der `catch` daneben meldet eine
       gescheiterte Ablage — die *fehlende* gab wortlos `null` zurück, und die
       Folge ist dieselbe: von da an sichert sich nichts, und der Benutzer
       arbeitet weiter im Glauben, es geschehe. Genau der leere `catch` mit dem
       Kommentar „best-effort by design", nur eine Zeile höher.

       Ein privates Fenster ist kein erfundener Fall: es ist die Voreinstellung
       von Leuten, die fremde Werkzeuge ausprobieren.
    */
    const echt = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('gesperrt', 'SecurityError');
      },
    });
    try {
      const klage = sichereEntwurf(BASIS());
      expect(klage).not.toBeNull();
      expect(klage).toMatch(/⌘R/);
    } finally {
      if (echt) Object.defineProperty(globalThis, 'sessionStorage', echt);
      else delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }

    // Die Gegenrichtung: mit Ablage ist Schweigen richtig.
    expect(sichereEntwurf(BASIS())).toBeNull();
  });

  it('vergibt die Kennungen der Schnitte neu', () => {
    const gelesen = zusammen({
      webfontFaces: [
        { family: 'A', weight: 400, style: 'normal', file: 'a.woff2', kennung: 'x' },
        { family: 'A', weight: 700, style: 'normal', file: 'b.woff2', kennung: 'x' },
      ],
    }).entwurf;
    const kennungen = gelesen.webfontFaces.map((face) => face.kennung);
    expect(new Set(kennungen).size).toBe(2);
    expect(kennungen).not.toContain('x');
  });

  it('fragt nur, wenn wirklich Arbeit dasteht — aber dann bei jeder', () => {
    /*
       Eine Frage, die man nur wegklicken kann, ist eine, die beim dritten Mal
       niemand mehr liest. Die Gegenrichtung ist hier aber die teurere: die
       vorige Fassung maß Arbeit an Schlüssel, Name und Wortmarke — und warf
       damit stumm weg, was jemand in „Farbe" und „Maße" eingetragen hatte. Der
       Name wird erfahrungsgemäß zuletzt vergeben.
    */
    const leer = leererEntwurf();
    expect(traegtArbeit(leer)).toBe(false);

    const arbeit: Array<[string, CiEntwurf]> = [
      ['Schlüssel', { ...leer, id: 'probenhaus' }],
      ['Name', { ...leer, label: 'Probenhaus' }],
      ['eine Farbe', { ...leer, palette: { ...leer.palette, signal: '#E4003A' } }],
      ['eine Größe', { ...leer, textScale: { ...leer.textScale, xl3: 61 } }],
      ['ein Strich', { ...leer, stroke: { ...leer.stroke, heavy: 5 } }],
      ['ein Schriftstapel', { ...leer, fontFamily: { ...leer.fontFamily, body: 'Probe' } }],
      ['die Laufweite', { ...leer, auszeichnungEnger: 0.01 }],
      ['das Zeichen-Set', { ...leer, zeichen: 'ohne-signatur' }],
      ['ein Schnitt', { ...leer, webfontFaces: [...leer.webfontFaces, leererSchnitt()] }],
    ];
    for (const [was, entwurf] of arbeit) {
      expect(traegtArbeit(entwurf), `${was} zählt nicht als Arbeit`).toBe(true);
    }

    // Und die Kennungen zählen nicht mit: sie steigen bei jedem Lesen, ein
    // Entwurf wäre sonst immer „Arbeit".
    expect(traegtArbeit(leererEntwurf())).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Anker der Prüfliste', () => {
  it('zeigen auf ein Feld, das es gibt', () => {
    /*
       Ein Anker, den kein Feld trägt, führt „Zum Feld" ins Leere — und das
       sieht aus wie ein Knopf, der nichts tut. Geprüft wird deshalb an der
       *Quelle* des Formulars, dass zu jedem vergebenen Anker auch ein Feld
       gehört, das ihn setzt: dieselbe Bauart wie `theme.test.ts`.
    */
    const quelle = readFileSync(join(process.cwd(), 'src', 'ci', 'schritte.tsx'), 'utf8');
    const kaputt: CiEntwurf = {
      ...leererEntwurf(),
      palette: { ...leererEntwurf().palette, signalSoft: 'knallrot' },
      stroke: { ...leererEntwurf().stroke, heavy: Number.NaN },
    };
    const anker = pruefe(kaputt)
      .map((befund) => befund.anker)
      .filter((wert): wert is string => Boolean(wert));

    expect(anker.length).toBeGreaterThan(1);
    expect(anker).toContain(ankerFuer('Farbe', 'signalSoft'));
    expect(anker).toContain(massAnker('strich', 'heavy'));
    // Und die Formularseite setzt sie wirklich — nicht nur die Prüfung.
    expect(quelle).toContain("ankerFuer('Farbe', rolle)");
    for (const gruppe of massgruppen) {
      expect(quelle, gruppe).toContain(`massAnker('${gruppe}',`);
    }
  });

  it('vergibt jede Kennung genau einmal', () => {
    /*
       Zwei Felder mit derselben Kennung sind im DOM **ein** Feld:
       `getElementById` nimmt das erste, der Fokus landet dort, und der Knopf
       „Zum Feld" führt an eine Stelle, an der nichts falsch ist. Genau das
       geschah, und zwar an zwei Stellen: die Größenleiter führt `sm` und `lg`,
       die Schattenversätze führen sie auch, und beide Gruppen wohnen im Schritt
       „Maße" — `nz-ci-masse-sm` gab es damit doppelt.

       Geprüft wird an dem, was `pruefe()` **wirklich ausgibt**, und nicht an
       `massAnker()` selbst: eine Prüfung an der Kennungsfunktion wäre grün,
       während im Formular die Gruppe fehlt.
    */
    const nichts = Number.NaN;
    const leer = leererEntwurf();
    const kaputt: CiEntwurf = {
      ...leer,
      textScale: Object.fromEntries(
        Object.keys(leer.textScale).map((rolle) => [rolle, nichts]),
      ) as CiEntwurf['textScale'],
      sonderstufen: Object.fromEntries(
        Object.keys(leer.sonderstufen).map((rolle) => [rolle, nichts]),
      ) as CiEntwurf['sonderstufen'],
      stroke: Object.fromEntries(
        Object.keys(leer.stroke).map((rolle) => [rolle, nichts]),
      ) as CiEntwurf['stroke'],
      shadowOffset: Object.fromEntries(
        Object.keys(leer.shadowOffset).map((rolle) => [rolle, nichts]),
      ) as CiEntwurf['shadowOffset'],
      auszeichnungEnger: nichts,
    };
    const anker = pruefe(kaputt)
      .map((befund) => befund.anker)
      .filter((wert): wert is string => Boolean(wert));

    // Erst die Gegenprobe, dass wirklich jede Leiter dabei ist: eine Prüfung
    // über eine leere Liste ist immer eindeutig.
    const felder =
      Object.keys(leer.textScale).length +
      Object.keys(leer.sonderstufen).length +
      Object.keys(leer.stroke).length +
      Object.keys(leer.shadowOffset).length +
      1;
    expect(anker.length).toBe(felder);
    expect(new Set(anker).size).toBe(anker.length);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Schritte', () => {
  it('führen jeden Befund, den die Prüfung liefern kann', () => {
    /*
       Der Schrittbalken zählt je Schritt, was dort offen ist. Ein Befund,
       dessen Feld keinem Schritt gehört, taucht in keinem Zähler auf — und die
       Zahl daneben behauptete dann, es sei nichts offen. Geprüft wird deshalb
       an dem, was `pruefe()` wirklich liefert, und nicht an einer getippten
       Liste von Feldnamen.
    */
    const entwuerfe: CiEntwurf[] = [
      leererEntwurf(),
      { ...leererEntwurf(), id: 'probenhaus', label: 'Probenhaus' },
      {
        ...leererEntwurf(),
        id: 'NICHT ERLAUBT',
        palette: { ...leererEntwurf().palette, signal: 'knallrot' },
        textScale: { ...leererEntwurf().textScale, xl3: Number.NaN },
        webfontFaces: [],
        fontFamily: { display: '', body: '', mono: '' },
      },
    ];

    const felder = new Set(entwuerfe.flatMap((e) => pruefe(e)).map((befund) => befund.feld));
    expect(felder.size).toBeGreaterThan(3);
    for (const feld of felder) {
      expect(schrittFuerFeld(feld), `kein Schritt führt „${feld}"`).toBeGreaterThanOrEqual(0);
    }
  });

  it('führen jedes Feld auf einem Schritt, den es gibt', () => {
    /*
       Die Gegenrichtung zur Prüfung darüber, und die einzige, die der Compiler
       nicht schon hält: `FELD_SCHRITT` ist ein `Record` über die volle Union,
       also kann kein Feld fehlen — wohl aber auf eine Schritt-Kennung zeigen,
       die in `SCHRITTE` nicht steht. Dann fiele der Befund aus dem Balken,
       ohne dass etwas rot würde.
    */
    for (const feld of FELDER) {
      expect(schrittFuerFeld(feld), `„${feld}" zeigt auf keinen Schritt`).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(SCHRITTE.map((schritt) => schritt.id)).size).toBe(SCHRITTE.length);
  });
});
