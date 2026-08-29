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
import { ankerFuer, pruefe, type Feld } from './pruefung';
import { designdatei } from './emitter';
import { SCHRITTE, schrittFuerFeld } from './schritte';
import { entwurfSchluessel, traegtArbeit, zusammen } from './sitzung';
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
    for (const gruppe of [
      'palette',
      'fontFamily',
      'pdfFontFamily',
      'webfontFaces',
      'textScale',
      'sonderstufen',
      'auszeichnungEnger',
      'stroke',
      'shadowOffset',
    ]) {
      expect(prompt, `die Gruppe „${gruppe}" fehlt im Prompt`).toContain(`"${gruppe}"`);
    }
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

  it('nennt eine geänderte Schnittliste als eine Zeile und nicht als neun', () => {
    const roh =
      '{"webfontFaces": [{"family": "A", "weight": 400, "style": "normal", "file": "a.woff2"},' +
      ' {"family": "A", "weight": 700, "style": "normal", "file": "b.woff2"}]}';
    const { aenderungen } = liesRuecklauf(roh, BASIS());
    const schnitte = aenderungen.filter((eintrag) => eintrag.name === 'Schnitte');
    expect(schnitte).toHaveLength(1);
    expect(schnitte[0]).toMatchObject({ war: '1 Schnitte', wird: '2 Schnitte' });
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
    expect(abbruch?.letzterSchluessel).toBe('paper');
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
    const gelesen = zusammen({ id: 'alt', palette: { signal: '#E4003A' } as never });
    expect(gelesen.id).toBe('alt');
    expect(gelesen.palette.signal).toBe('#E4003A');
    expect(gelesen.palette.ink).toBe(leererEntwurf().palette.ink);
    expect(Object.keys(gelesen.palette).sort()).toEqual([...paletteRollen].sort());
  });

  it('vergibt die Kennungen der Schnitte neu', () => {
    const gelesen = zusammen({
      webfontFaces: [
        { family: 'A', weight: 400, style: 'normal', file: 'a.woff2', kennung: 'x' },
        { family: 'A', weight: 700, style: 'normal', file: 'b.woff2', kennung: 'x' },
      ],
    });
    const kennungen = gelesen.webfontFaces.map((face) => face.kennung);
    expect(new Set(kennungen).size).toBe(2);
    expect(kennungen).not.toContain('x');
  });

  it('fragt nur, wenn wirklich Arbeit dasteht', () => {
    // Eine Frage, die man nur wegklicken kann, ist eine, die beim dritten Mal
    // niemand mehr liest.
    expect(traegtArbeit(leererEntwurf())).toBe(false);
    expect(traegtArbeit({ ...leererEntwurf(), id: 'probenhaus' })).toBe(true);
    expect(traegtArbeit({ ...leererEntwurf(), label: 'Probenhaus' })).toBe(true);
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
    expect(anker).toContain(ankerFuer('Maße', 'heavy'));
    // Und die Formularseite setzt sie wirklich — nicht nur die Prüfung.
    expect(quelle).toContain("ankerFuer('Farbe', rolle)");
    expect(quelle).toContain("ankerFuer('Maße', rolle)");
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
