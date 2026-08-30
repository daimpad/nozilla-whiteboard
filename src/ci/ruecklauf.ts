/**
 * Die Antwort des Sprachmodells zurücklesen — und sagen, was dabei geschah.
 *
 * ## Warum das mehr ist als ein `JSON.parse`
 *
 * Weil das, was zurückkommt, fast nie reines JSON ist. Es ist JSON in einem
 * Codezaun, mit einem einleitenden Satz davor, mit `// so wie im Beispiel`
 * hinter einer Zeile, mit einem Komma hinter dem letzten Feld, mit
 * typografischen Anführungszeichen, weil das Modell deutschen Fließtext
 * daneben schreibt. Jede dieser Kleinigkeiten lässt `JSON.parse` werfen, und
 * die Meldung, die dabei herauskommt („Unexpected token / in JSON at position
 * 412"), sagt keinem Menschen, was zu tun ist.
 *
 * Repariert wird deshalb **stufenweise und laut**: nach jeder Stufe wird es
 * erneut versucht, und jede Stufe, die wirklich etwas verändert hat, steht
 * hinterher im Bericht. Das ist der Unterschied, auf den es ankommt — eine
 * stille Reparatur ist eine Behauptung darüber, was gemeint war.
 *
 * ## Und warum der Bericht vier Ränge hat
 *
 * `fehler` heißt: gar nichts gelesen. `korrigiert`: gelesen, aber verändert —
 * `rgb(228, 0, 58)` wurde `#E4003A`, `"48px"` wurde `48`. `übergangen`: etwas
 * stand da, das hier keinen Platz hat. `fehlt`: etwas kam nicht, und der
 * bisherige Wert bleibt stehen.
 *
 * Der letzte Rang ist der, den es ohne diese Datei nicht gäbe. Ein Modell, das
 * zwölf von sechzehn Palettenrollen liefert, sieht aus, als hätte es geliefert
 * — die vier fehlenden stehen danach in nozilla-Grün auf der Folie einer
 * fremden Marke, und niemand hat je gesagt, dass sie fehlten.
 */
import {
  paletteRollen,
  pdfSchriften,
  schattenRollen,
  schnittstile,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  neueKennung,
  promptSchluessel,
  type CiEntwurf,
  type PdfSchrift,
  type Schnitt,
  type Schnittstil,
} from './entwurf';
import { ohneCodezaun } from '@/lib/prompt/zaun';
import { normalisiereFarbe } from './farbwert';
import type { Feld } from './pruefung';

export type Ruecklaufrang = 'fehler' | 'korrigiert' | 'uebergangen' | 'fehlt' | 'gelesen';

export interface Ruecklaufbefund {
  rang: Ruecklaufrang;
  /** Der Abschnitt, zu dem der Befund gehört — dieselbe Achse wie in der Prüfliste. */
  feld: Feld;
  text: string;
}

export interface Ruecklauf {
  /**
   * Der Entwurf, der daraus **würde** — nicht der, der gilt.
   *
   * `liesRuecklauf()` schreibt nirgendwohin. Das war einmal anders: der Knopf
   * hieß „Übernehmen und prüfen", geprüft wurde nach dem Übernehmen, und
   * zurück ging es nur über „Zurücksetzen", das auch die Handarbeit wegwarf.
   * Ein Rücklauf ist aber genau das, was dieses Projekt sonst überall mit
   * einer Frage versieht: etwas, das vierzig Felder auf einmal ersetzt.
   */
  entwurf: CiEntwurf | null;
  befunde: Ruecklaufbefund[];
  /** Was sich dabei ändern würde — je Feld, war → wird. */
  aenderungen: Aenderung[];
  /** Gesetzt, wenn die Antwort mitten im Satz abbricht. */
  abbruch: Abbruch | null;
}

/** Ein einzelner Wert, der sich ändern würde. */
export interface Aenderung {
  feld: Feld;
  /** Der Name der Rolle, wie er im Formular steht. */
  name: string;
  war: string;
  wird: string;
}

/* -------------------------------------------------------------------------- */
/* Stufe 1 — aus dem Text ein Objekt                                           */
/* -------------------------------------------------------------------------- */

/**
 * Den Codezaun abnehmen — über denselben Leser wie der Deck-Prompt.
 *
 * Zwei Fassungen derselben Frage standen hier und in `PromptStudio`, und die
 * dortige war verankert: „Klar, hier ist die CI:" davor, und der Zaun blieb
 * stehen. Der häufigste Fall überhaupt, und in genau einem der beiden Wege
 * kaputt — das ist die Sorte Abweichung, die man erst an der fremden Datei
 * sieht.
 */
function ohneZaun(text: string): string {
  return ohneCodezaun(text);
}

/**
 * Den Vorspann abschneiden — bis zur ersten öffnenden Klammer.
 *
 * Getrennt von der Suche nach der schließenden, und zwar aus einem handfesten
 * Grund: der Vorspann ist Fließtext, und Fließtext enthält Anführungszeichen
 * („Hier ist die CI:"). Liefe der Kommentarleser darüber, käme seine
 * Zeichenketten-Buchführung aus dem Tritt, und ein Kommentar *im JSON* bliebe
 * stehen. Vorn wird deshalb stumpf geschnitten, hinten gezählt.
 */
function abVorne(text: string): string {
  const start = text.indexOf('{');
  return start < 0 ? text : text.slice(start);
}

/**
 * Vom ersten `{` bis zu der schließenden Klammer, die dazu gehört.
 *
 * Gezählt wird mit Rücksicht auf Zeichenketten: ein `}` in `"schließende }"`
 * beendet kein Objekt. Ohne diese Rücksicht schnitt die Suche nach dem letzten
 * `}` im Text ein Objekt ab, sobald das Modell hinterher noch etwas schrieb —
 * und mit ihr nahm sie zu viel, sobald in einem Wert eine Klammer stand.
 */
function nurObjekt(text: string): string {
  const start = text.indexOf('{');
  if (start < 0) return text;

  let tiefe = 0;
  let inText = false;
  let maskiert = false;

  for (let i = start; i < text.length; i += 1) {
    const zeichen = text[i];
    if (inText) {
      if (maskiert) maskiert = false;
      else if (zeichen === '\\') maskiert = true;
      else if (zeichen === '"') inText = false;
      continue;
    }
    if (zeichen === '"') inText = true;
    else if (zeichen === '{') tiefe += 1;
    else if (zeichen === '}') {
      tiefe -= 1;
      if (tiefe === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** Zeilen- und Blockkommentare heraus — außerhalb von Zeichenketten. */
function ohneKommentare(text: string): string {
  let aus = '';
  let inText = false;
  let maskiert = false;

  for (let i = 0; i < text.length; i += 1) {
    const zeichen = text[i];
    if (inText) {
      aus += zeichen;
      if (maskiert) maskiert = false;
      else if (zeichen === '\\') maskiert = true;
      else if (zeichen === '"') inText = false;
      continue;
    }
    if (zeichen === '"') {
      inText = true;
      aus += zeichen;
      continue;
    }
    if (zeichen === '/' && text[i + 1] === '/') {
      const ende = text.indexOf('\n', i);
      if (ende < 0) break;
      i = ende - 1;
      continue;
    }
    if (zeichen === '/' && text[i + 1] === '*') {
      const ende = text.indexOf('*/', i + 2);
      if (ende < 0) break;
      i = ende + 1;
      continue;
    }
    aus += zeichen;
  }
  return aus;
}

/** Ein Komma vor `}` oder `]` — erlaubt in JavaScript, verboten in JSON. */
function ohneNachkomma(text: string): string {
  let aus = '';
  let inText = false;
  let maskiert = false;

  for (let i = 0; i < text.length; i += 1) {
    const zeichen = text[i];
    if (inText) {
      aus += zeichen;
      if (maskiert) maskiert = false;
      else if (zeichen === '\\') maskiert = true;
      else if (zeichen === '"') inText = false;
      continue;
    }
    if (zeichen === '"') inText = true;
    if (zeichen === ',') {
      const rest = text.slice(i + 1);
      const naechstes = rest.replace(/^\s*/, '')[0];
      if (naechstes === '}' || naechstes === ']') continue;
    }
    aus += zeichen;
  }
  return aus;
}

/**
 * Typografische Anführungszeichen begradigen.
 *
 * Die letzte Stufe, und mit Absicht die letzte: sie fasst auch *innerhalb* von
 * Werten an, und ein Markenname mit einem echten Anführungszeichen käme
 * dadurch verändert an. Solange eine frühere Stufe reicht, läuft sie nie —
 * und wenn sie läuft, steht sie im Bericht.
 */
function geradeAnfuehrung(text: string): string {
  return text.replace(/[“”„«»]/g, '"').replace(/[‘’]/g, "'");
}

/**
 * Die Stufen, und die Reihenfolge ist das Entscheidende daran.
 *
 * `nurObjekt` läuft **zuletzt**, und das war einmal anders. Der Klammerzähler
 * kennt Zeichenketten, aber keine Kommentare — stand also in einem `// …` ein
 * `}`, hörte er dort auf, und alles danach war weg. Gemessen an
 * `{ "palette": { "signal": "#E4003A" } // auch #FFF }\n, "id": "x" }`: der
 * Schlüssel verschwand, und die Meldung lautete „Daraus wird kein
 * JSON-Objekt" — eine andere Ursache als die genannte.
 *
 * Umgekehrt darf der Zähler nicht vor dem Codezaun stehen (der Zaun ist der
 * verlässlichere Schnitt), und `geradeAnfuehrung` bleibt vor ihm, weil ein
 * typografisches Anführungszeichen den Zähler sonst mitten in einer
 * Zeichenkette aussteigen ließe.
 */
const STUFEN: Array<{ was: string; tu: (text: string) => string }> = [
  { was: 'den Codezaun abgenommen', tu: ohneZaun },
  { was: 'den Vorspann bis zur ersten Klammer weggeschnitten', tu: abVorne },
  { was: 'Kommentare entfernt — JSON kennt keine', tu: ohneKommentare },
  { was: 'ein Komma vor einer schließenden Klammer entfernt', tu: ohneNachkomma },
  { was: 'typografische Anführungszeichen begradigt', tu: geradeAnfuehrung },
  { was: 'den Nachsatz hinter dem Objekt weggeschnitten', tu: nurObjekt },
];

/**
 * Wo eine abgebrochene Antwort aufhört — und was bis dahin vollständig ist.
 *
 * Der häufigste Grund für eine unlesbare Antwort ist kein Tippfehler, sondern
 * ein **Abbruch in der Länge**: das Modell hört mitten in `"paper": "#FAF` auf.
 * Von einer verunglückten Klammer ist das an der rohen Parser-Meldung nicht zu
 * unterscheiden, und die Sackgasse ist dieselbe — nur dass hier zwölf von
 * sechzehn Rollen schon dastehen und niemand sie bekommt.
 *
 * Abgeschnitten wird deshalb rückwärts bis zur letzten Stelle, an der ein Wert
 * *fertig* war, und danach werden die offenen Klammern geschlossen. Was dabei
 * herauskommt, ist gültiges JSON aus lauter vollständigen Feldern — angeboten
 * und nie von selbst genommen.
 */
export interface Abbruch {
  /** Das, was sich aus dem vollständigen Teil lesen ließ. */
  objekt: Record<string, unknown>;
  /**
   * Der Schlüssel, dessen Wert zuletzt **ganz** dastand.
   *
   * Und das ist ein anderer als der, an dem die Antwort abriss. Die vorige
   * Fassung führte nur einen: den zuletzt *begonnenen*. Sie meldete damit
   * „zuletzt vollständig war ‚palette'" über einer Palette, die mitten in
   * `"paper": "#FAF` abbrach — die eine Auskunft, auf die es hier ankommt, war
   * genau verkehrt herum.
   */
  letzterSchluessel: string;
  /** Der Schlüssel, in dem die Antwort abriss — der Punkt zum Fortsetzen. */
  offenerSchluessel: string;
  /** Wie viele Zeichen die Antwort hatte, bevor sie abbrach. */
  zeichen: number;
}

/**
 * Aus einem abgebrochenen Objekt den vollständigen Anfang.
 *
 * Gezählt wird mit Rücksicht auf Zeichenketten — dieselbe Buchführung wie in
 * `nurObjekt()`. Gemerkt wird dabei jede Stelle, an der ein Wert der obersten
 * Ebene zu Ende war (ein Komma oder eine schließende Klammer auf Tiefe 1) und
 * welcher Schlüssel gerade zuletzt gelesen wurde.
 */
export function abgebrochen(text: string): Abbruch | null {
  let tiefe = 0;
  let inText = false;
  let maskiert = false;
  let letzterSchnitt = -1;
  let letzterSchluessel = '';
  let offenerSchluessel = '';
  let schluessel = '';
  let sammle = false;

  for (let i = 0; i < text.length; i += 1) {
    const zeichen = text[i];
    if (inText) {
      if (maskiert) maskiert = false;
      else if (zeichen === '\\') maskiert = true;
      else if (zeichen === '"') inText = false;
      else if (sammle) schluessel += zeichen;
      continue;
    }
    if (zeichen === '"') {
      inText = true;
      // Ein Schlüssel ist eine Zeichenkette auf Tiefe 1, der ein `:` folgt.
      // Gesammelt wird auf Verdacht; steht danach kein Doppelpunkt, wird sie
      // beim nächsten Anlauf überschrieben.
      if (tiefe === 1) {
        schluessel = '';
        sammle = true;
      }
      continue;
    }
    if (zeichen === ':' && tiefe === 1) {
      offenerSchluessel = schluessel || offenerSchluessel;
      sammle = false;
      continue;
    }
    if (zeichen === '{' || zeichen === '[') tiefe += 1;
    else if (zeichen === '}' || zeichen === ']') tiefe -= 1;
    else if (zeichen === ',' && tiefe === 1) {
      // Hier endet ein Wert der obersten Ebene: *dieser* Schlüssel stand ganz
      // da. Der offene wandert damit zum vollständigen.
      letzterSchnitt = i;
      letzterSchluessel = offenerSchluessel;
    }

    if (tiefe === 1 && (zeichen === '}' || zeichen === ']')) {
      letzterSchnitt = i + 1;
      letzterSchluessel = offenerSchluessel;
    }
    if (tiefe === 0 && i > 0) return null; // Das Objekt ist zu — kein Abbruch.
  }

  if (tiefe <= 0 || letzterSchnitt < 0) return null;

  const kopf = text.slice(0, letzterSchnitt).replace(/,\s*$/, '');
  try {
    const wert: unknown = JSON.parse(`${kopf}}`);
    if (!wert || typeof wert !== 'object' || Array.isArray(wert)) return null;
    return {
      objekt: wert as Record<string, unknown>,
      letzterSchluessel,
      offenerSchluessel,
      zeichen: text.length,
    };
  } catch {
    return null;
  }
}

/** Was die stufenweise Reparatur ergeben hat. */
interface Gelesen {
  objekt: Record<string, unknown> | null;
  getan: string[];
  fehler: string;
  /** Gesetzt, wenn die Antwort mitten im Satz aufhört. */
  abbruch: Abbruch | null;
}

function liesObjekt(roh: string): Gelesen {
  const getan: string[] = [];
  let text = roh;
  let fehler = '';

  const versuch = (): Record<string, unknown> | null => {
    try {
      const wert: unknown = JSON.parse(text);
      if (wert && typeof wert === 'object' && !Array.isArray(wert)) {
        return wert as Record<string, unknown>;
      }
      fehler = 'Die Antwort ist zwar lesbar, aber kein Objekt.';
      return null;
    } catch (ausnahme) {
      fehler = String(ausnahme instanceof Error ? ausnahme.message : ausnahme);
      return null;
    }
  };

  let objekt = versuch();
  if (objekt) return { objekt, getan, fehler: '', abbruch: null };

  for (const stufe of STUFEN) {
    const neu = stufe.tu(text);
    if (neu === text) continue;
    text = neu;
    getan.push(stufe.was);
    objekt = versuch();
    if (objekt) return { objekt, getan, fehler: '', abbruch: null };
  }

  // Erst wenn keine Stufe mehr hilft: sieht es nach einem Abbruch aus?
  return { objekt: null, getan, fehler, abbruch: abgebrochen(text) };
}

/* -------------------------------------------------------------------------- */
/* Stufe 2 — aus dem Objekt Werte                                              */
/* -------------------------------------------------------------------------- */

/**
 * Der Sammler.
 *
 * Er hält den Bericht und kennt die Rollen einer Gruppe — damit steht die
 * Frage „was war da, was fehlt, was hat hier nichts verloren" an einer Stelle
 * und nicht siebenmal.
 */
class Bericht {
  readonly befunde: Ruecklaufbefund[] = [];

  /**
   * Die obersten Felder, aus denen wirklich ein Wert in den Entwurf ging.
   *
   * Gezählt wird das und nicht, was das Modell *mitgeschickt* hat. Die vorige
   * Fassung nahm `Object.keys(objekt)` und meldete „Übernommen: 13 von 13"
   * über einer Antwort, in der `textScale` eine Zeichenkette war und
   * `palette` eine Liste — beides übergangen, beides mitgezählt. Genau die
   * Sorte Zahl, die in diesem Projekt schon einmal teuer war: sie nennt
   * eine und tut eine andere.
   */
  readonly genommen = new Set<string>();

  melde(rang: Ruecklaufrang, feld: Feld, text: string): void {
    this.befunde.push({ rang, feld, text });
  }

  /** Aus diesem obersten Feld ist mindestens ein Wert angekommen. */
  nahm(schluessel: string): void {
    this.genommen.add(schluessel);
  }

  /**
   * Eine Gruppe gleichartiger Werte — Palette, Leiter, Striche, Schatten.
   *
   * Sie beantwortet drei Fragen auf einmal, und dass es *eine* Stelle ist,
   * ist der Punkt: eine Gruppe, die nur die gelieferten Schlüssel durchgeht,
   * meldet nie eine Lücke, und eine, die nur die erwarteten durchgeht, meldet
   * nie einen überzähligen.
   */
  gruppe<T>(
    feld: Feld,
    titel: string,
    roh: unknown,
    rollen: readonly string[],
    lies: (wert: unknown, rolle: string) => T | null,
  ): Partial<Record<string, T>> {
    if (roh === undefined) {
      this.melde('fehlt', feld, `${titel} kam nicht — die bisherigen Werte bleiben stehen.`);
      return {};
    }
    if (!roh || typeof roh !== 'object' || Array.isArray(roh)) {
      this.melde('uebergangen', feld, `${titel} ist kein Objekt und wurde übergangen.`);
      return {};
    }

    const gegeben = roh as Record<string, unknown>;
    const aus: Partial<Record<string, T>> = {};
    const fehlend: string[] = [];

    for (const rolle of rollen) {
      if (!(rolle in gegeben)) {
        fehlend.push(rolle);
        continue;
      }
      const wert = lies(gegeben[rolle], rolle);
      if (wert !== null) aus[rolle] = wert;
    }

    const fremd = Object.keys(gegeben).filter((schluessel) => !rollen.includes(schluessel));
    if (fremd.length) {
      this.melde(
        'uebergangen',
        feld,
        `${titel} bringt ${fremd.length === 1 ? 'eine Rolle' : `${fremd.length} Rollen`} mit, die es hier nicht gibt: ${fremd.join(', ')}.`,
      );
    }
    if (fehlend.length) {
      this.melde(
        'fehlt',
        feld,
        `${titel} lässt ${fehlend.length === 1 ? 'eine Rolle' : `${fehlend.length} Rollen`} aus: ${fehlend.join(', ')}. Der bisherige Wert bleibt stehen.`,
      );
    }
    return aus;
  }
}

/** Eine Zeichenkette, oder nichts. */
function nimmText(bericht: Bericht, feld: Feld, name: string, roh: unknown): string | null {
  if (roh === undefined) {
    bericht.melde('fehlt', feld, `„${name}" kam nicht — der bisherige Wert bleibt stehen.`);
    return null;
  }
  if (typeof roh !== 'string') {
    bericht.melde('uebergangen', feld, `„${name}" ist keine Zeichenkette und wurde übergangen.`);
    return null;
  }
  const wert = roh.trim();
  if (wert !== roh) {
    bericht.melde('korrigiert', feld, `„${name}": Leerraum am Rand entfernt.`);
  }
  return wert;
}

/**
 * Eine Zahl — auch dann, wenn sie als `"48px"` dasteht.
 *
 * Ein Modell, das eine Größenleiter liefert, hängt gern die Einheit an; es ist
 * die Schreibweise, in der Leitern überall sonst stehen. Das Feld dahinter
 * nimmt aber eine nackte Zahl, und `Number('48px')` ist `NaN` — das ist genau
 * der Wert, der später als `xl3: NaN` in einer Datei landet, die anstandslos
 * übersetzt.
 *
 * ## Und warum nicht jede Einheit durchgeht
 *
 * Die vorige Fassung nahm `px`, `pt`, `em` und `rem` und schrieb dazu „die
 * Einheit fiel weg, hier zählen Folien-Einheiten". Bei `px` stimmt das. Bei
 * `pt` ist es **falsch mit einem Beleg daneben**: eine Folien-Einheit ist ¾
 * Punkt, `16pt` sind also 21,33 Einheiten, und aus „16pt" wurde eine Schrift,
 * die um ein Drittel zu klein ist — mit einem Satz darüber, der klingt, als sei
 * es bedacht worden. Das ist genau der Rang „läuft, ist aber falsch", den
 * dieser ganze Generator einzufangen versucht.
 *
 * Umgerechnet wird trotzdem nicht: `16pt` kann ebenso ein hingeschriebenes
 * „pt" für Pixel sein, und wer rät, rät hier an einer Stelle, an der man es
 * erst am fertigen Deck sieht. Abgelehnt, benannt, bisheriger Wert bleibt.
 */
function nimmZahl(
  bericht: Bericht,
  feld: Feld,
  name: string,
  roh: unknown,
  erlaubt: readonly string[] = ['px'],
): number | null {
  if (typeof roh === 'number') {
    if (!Number.isFinite(roh)) {
      bericht.melde('uebergangen', feld, `„${name}" ist keine endliche Zahl und wurde übergangen.`);
      return null;
    }
    return roh;
  }
  if (typeof roh === 'string') {
    const treffer = /^\s*(-?[0-9]*\.?[0-9]+)\s*([a-z%]*)\s*$/i.exec(roh);
    if (treffer) {
      const einheit = treffer[2].toLowerCase();
      const zahl = Number.parseFloat(treffer[1]);
      if (!einheit) {
        bericht.melde('korrigiert', feld, `„${name}": „${roh}" als Zahl ${zahl} gelesen.`);
        return zahl;
      }
      if (erlaubt.includes(einheit)) {
        bericht.melde(
          'korrigiert',
          feld,
          `„${name}": „${roh}" als Zahl ${zahl} gelesen — die Einheit ${einheit} entspricht hier der Folien-Einheit.`,
        );
        return zahl;
      }
      bericht.melde(
        'uebergangen',
        feld,
        einheit === 'pt'
          ? `„${name}": „${roh}" wurde nicht übernommen. Eine Folien-Einheit ist ¾ Punkt, ${zahl}pt wären also ${(zahl * (4 / 3)).toFixed(2)} — ob „pt" so gemeint war oder nur hingeschrieben, lässt sich hier nicht entscheiden. Der bisherige Wert bleibt stehen.`
          : `„${name}": die Einheit ${einheit} hat hier keine Bedeutung; verlangt ist eine Folien-Einheit (${erlaubt.join(', ')} oder ohne Einheit). Der bisherige Wert bleibt stehen.`,
      );
      return null;
    }
  }
  bericht.melde('uebergangen', feld, `„${name}" ist keine Zahl: ${JSON.stringify(roh)}.`);
  return null;
}

/** Eine Farbe in der einen Form, die sich anmelden lässt. */
function nimmFarbe(bericht: Bericht, feld: Feld, name: string, roh: unknown): string | null {
  if (typeof roh !== 'string') {
    bericht.melde('uebergangen', feld, `„${name}" ist keine Farbe: ${JSON.stringify(roh)}.`);
    return null;
  }
  const korrektur = normalisiereFarbe(roh);
  if (!korrektur) {
    bericht.melde(
      'uebergangen',
      feld,
      `„${name}": aus „${roh}" wird keine Farbe. Verlangt ist #RRGGBB.`,
    );
    return null;
  }
  if (korrektur.wie) {
    bericht.melde('korrigiert', feld, `„${name}": ${korrektur.wie} → ${korrektur.wert}.`);
  }
  return korrektur.wert;
}

/* -------------------------------------------------------------------------- */
/* Die Schnitte                                                                */
/* -------------------------------------------------------------------------- */

function nimmSchnitte(bericht: Bericht, roh: unknown): Schnitt[] | null {
  const feld: Feld = 'Schrift';
  if (roh === undefined) {
    bericht.melde('fehlt', feld, 'Es kamen keine Schnitte — die bisherige Liste bleibt stehen.');
    return null;
  }
  if (!Array.isArray(roh)) {
    bericht.melde('uebergangen', feld, '„webfontFaces" ist keine Liste und wurde übergangen.');
    return null;
  }
  if (roh.length === 0) {
    bericht.melde(
      'uebergangen',
      feld,
      'Die Liste der Schnitte ist leer. Ohne einen einzigen Schnitt gäbe es keine Marken-Schrift — die bisherige Liste bleibt stehen.',
    );
    return null;
  }

  const aus: Schnitt[] = [];
  roh.forEach((eintrag, index) => {
    const nummer = index + 1;
    if (!eintrag || typeof eintrag !== 'object' || Array.isArray(eintrag)) {
      bericht.melde('uebergangen', feld, `Der ${nummer}. Schnitt ist kein Objekt.`);
      return;
    }
    const satz = eintrag as Record<string, unknown>;
    const family = typeof satz.family === 'string' ? satz.family.trim() : '';
    const file = typeof satz.file === 'string' ? satz.file.trim() : '';

    if (!family) {
      bericht.melde('uebergangen', feld, `Der ${nummer}. Schnitt nennt keine Familie.`);
      return;
    }

    const gewicht = nimmZahl(bericht, feld, `Gewicht des ${nummer}. Schnitts`, satz.weight ?? 400);
    /*
       Ein unlesbares Gewicht wird nicht ersetzt, sondern durchgereicht: die
       Prüfliste sagt gleich danach, dass 100 bis 900 verlangt sind, und ein
       stilles 400 hätte behauptet, das sei gemeint gewesen.
    */
    const weight = gewicht ?? Number.NaN;

    let style: Schnittstil = 'normal';
    const rohStil = typeof satz.style === 'string' ? satz.style.trim().toLowerCase() : '';
    if (rohStil === 'italic' || rohStil === 'oblique' || rohStil === 'kursiv') {
      style = 'italic';
      if (rohStil !== 'italic') {
        bericht.melde('korrigiert', feld, `Der ${nummer}. Schnitt: „${satz.style}" → italic.`);
      }
    } else if (rohStil && !(schnittstile as readonly string[]).includes(rohStil)) {
      bericht.melde(
        'korrigiert',
        feld,
        `Der ${nummer}. Schnitt: „${satz.style}" ist kein @font-face-Stil, gesetzt wird normal.`,
      );
    }

    aus.push({ family, weight, style, file, kennung: neueKennung() });
  });

  if (!aus.length) {
    bericht.melde(
      'uebergangen',
      feld,
      'Aus der Liste der Schnitte war keiner zu gebrauchen — die bisherige bleibt stehen.',
    );
    return null;
  }
  return aus;
}

/* -------------------------------------------------------------------------- */
/* Alles zusammen                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Die Schlüssel, die im Prompt stehen — alles andere ist überzählig.
 *
 * Gelesen und nicht getippt: `promptSchluessel` *ist* die Liste, aus der der
 * Prompt seinen Rumpf baut. Eine zweite hier wäre eine Verabredung, an die
 * sich niemand erinnert — und ein Feld, das nur der Prompt kennt, käme als
 * „kennt der Generator nicht" zurück.
 */
const ERWARTET = promptSchluessel;

/**
 * Den vollständigen Anfang einer abgebrochenen Antwort lesen.
 *
 * Über `JSON.stringify` zurück in den einen Leser und nicht an ihm vorbei: der
 * Teil ist bereits geparst, aber er soll dieselben Korrekturen, dieselben
 * Übergehungen und denselben Bericht bekommen wie eine ganze Antwort. Ein
 * zweiter Weg in den Entwurf wäre genau die Sorte Abkürzung, die in diesem
 * Projekt schon zweimal auseinandergelaufen ist.
 */
export function teilRuecklauf(abbruch: Abbruch, basis: CiEntwurf): Ruecklauf {
  return liesRuecklauf(JSON.stringify(abbruch.objekt), basis);
}

/**
 * Was zwischen zwei Entwürfen anders ist — Wert für Wert.
 *
 * Gerechnet und nicht mitgeschrieben: der Leser weiß, was er *gelesen* hat,
 * aber nicht, ob es sich vom bisherigen Wert unterscheidet. Ein Modell, das
 * die Palette wortgleich zurückgibt, hat sechzehn Rollen geliefert und ändert
 * keine — und ein Knopf, der „16 Werte übernehmen" verspricht und nichts tut,
 * ist genau die Sorte Zahl, die dieses Projekt schon einmal teuer bezahlt hat.
 *
 * Die Namen sind die des Formulars, damit die Zeile im Bericht auf ein Feld
 * zeigt, das man auch findet.
 */
export function unterschiede(alt: CiEntwurf, neu: CiEntwurf): Aenderung[] {
  const aus: Aenderung[] = [];
  const zeig = (wert: unknown): string =>
    typeof wert === 'string' ? wert || '(leer)' : String(wert);

  const einzeln = (feld: Feld, name: string, a: unknown, b: unknown) => {
    if (a === b) return;
    aus.push({ feld, name, war: zeig(a), wird: zeig(b) });
  };

  for (const name of ['id', 'label', 'markenname', 'produkt'] as const) {
    einzeln('Marke', name, alt[name], neu[name]);
  }
  for (const rolle of paletteRollen) {
    einzeln('Farbe', rolle, alt.palette[rolle], neu.palette[rolle]);
  }
  for (const stufe of textStufen) {
    einzeln('Maße', stufe, alt.textScale[stufe], neu.textScale[stufe]);
  }
  for (const stufe of sonderstufen) {
    einzeln('Maße', stufe, alt.sonderstufen[stufe], neu.sonderstufen[stufe]);
  }
  for (const rolle of strichRollen) {
    einzeln('Maße', rolle, alt.stroke[rolle], neu.stroke[rolle]);
  }
  for (const rolle of schattenRollen) {
    einzeln('Maße', rolle, alt.shadowOffset[rolle], neu.shadowOffset[rolle]);
  }
  einzeln('Maße', 'auszeichnungEnger', alt.auszeichnungEnger, neu.auszeichnungEnger);
  for (const rolle of schriftRollen) {
    einzeln('Schrift', rolle, alt.fontFamily[rolle], neu.fontFamily[rolle]);
    einzeln('Schrift', `${rolle} (PDF)`, alt.pdfFontFamily[rolle], neu.pdfFontFamily[rolle]);
  }

  /*
     Die Schnitte werden als Ganzes verglichen und nicht Zeile für Zeile: die
     Liste kann kürzer oder länger werden, und „der dritte Schnitt heißt jetzt
     anders" wäre über einer verschobenen Liste eine Behauptung ins Blaue. Die
     Kennung bleibt dabei außen vor — sie gehört dem Formular.

     Genannt wird, **welche Zeilen gehen und welche kommen**, und nicht wie
     viele es sind. Die vorige Fassung schrieb „9 Schnitte → 9 Schnitte": eine
     Zeile, die zwei gleiche Zahlen zeigt und behauptet, dazwischen ändere sich
     etwas. Wer neun Schnitte gegen neun andere tauscht — dieselbe Familie in
     anderen Dateien ist der Normalfall — bekam damit als einzige Auskunft, es
     bleibe bei neun.
  */
  const zeile = (face: CiEntwurf['webfontFaces'][number]) =>
    `${face.family} ${face.weight} ${face.style} ${face.file}`;
  /** Was in `a` steht und in `b` nicht — als Multimenge, also mit Vielfachheit. */
  const ohne = (a: string[], b: string[]): string[] => {
    const rest = [...b];
    return a.filter((eintrag) => {
      const stelle = rest.indexOf(eintrag);
      if (stelle < 0) return true;
      rest.splice(stelle, 1);
      return false;
    });
  };
  const weg = ohne(alt.webfontFaces.map(zeile), neu.webfontFaces.map(zeile));
  const dazu = ohne(neu.webfontFaces.map(zeile), alt.webfontFaces.map(zeile));
  // Steht auf beiden Seiten nichts, hat sich nur die Reihenfolge bewegt — und
  // die ändert an keiner Ausgabe etwas. Eine Zeile „nichts → nichts" wäre die
  // Sorte Meldung, deretwegen man Meldungen überliest.
  if (weg.length || dazu.length) {
    aus.push({
      feld: 'Schrift',
      name: 'Schnitte',
      war: weg.length ? weg.join(' · ') : `${alt.webfontFaces.length} Schnitte, keiner fällt weg`,
      wird: dazu.length
        ? dazu.join(' · ')
        : `${neu.webfontFaces.length} Schnitte, keiner kommt dazu`,
    });
  }

  return aus;
}

/**
 * Aus der Antwort einen Entwurf — auf der Grundlage des bisherigen.
 *
 * Zusammengeführt wird hier und nicht beim Aufrufer, damit die Frage „was
 * bleibt stehen" dort beantwortet wird, wo auch die Antwort „das kam nicht"
 * entsteht. Getrennt wären es zwei Stellen, die dasselbe wissen müssen.
 */
export function liesRuecklauf(roh: string, basis: CiEntwurf): Ruecklauf {
  const bericht = new Bericht();

  if (!roh.trim()) {
    return {
      entwurf: null,
      befunde: [{ rang: 'fehler', feld: 'Rücklauf', text: 'Das Feld ist leer.' }],
      aenderungen: [],
      abbruch: null,
    };
  }

  const { objekt, getan, fehler, abbruch } = liesObjekt(roh);

  if (!objekt) {
    /*
       Zwei verschiedene Sackgassen, und sie brauchen zwei verschiedene Sätze.
       Bricht die Antwort in der Länge ab, ist der Weg heraus ein anderer als
       bei einem Tippfehler — und er steht nur da, wenn jemand ihn hinschreibt.
       Die rohe Parser-Meldung bleibt trotzdem stehen: wer einen Fehler meldet,
       braucht sie. Sie ist nur nicht mehr die einzige Auskunft.
    */
    const befunde: Ruecklaufbefund[] = abbruch
      ? [
          {
            rang: 'fehler',
            feld: 'Rücklauf',
            text: `Die Antwort hört nach ${abbruch.zeichen} Zeichen mitten im Satz auf — zuletzt vollständig war „${abbruch.letzterSchluessel || '(nichts)'}", abgerissen ist sie in „${abbruch.offenerSchluessel || '(unbekannt)'}". Das ist meist keine Panne, sondern die Längengrenze des Modells: bitte es, ab „${abbruch.offenerSchluessel || abbruch.letzterSchluessel}" fortzusetzen, und füge den Rest hier an.`,
          },
          {
            rang: 'uebergangen',
            feld: 'Rücklauf',
            text: `Die Meldung des Lesers, für den Fall dass es doch etwas anderes ist: ${fehler}`,
          },
        ]
      : [
          {
            rang: 'fehler',
            feld: 'Rücklauf',
            text: `Daraus wird kein JSON-Objekt${getan.length ? `, auch nachdem ${getan.join(', ')} wurde` : ''}: ${fehler}`,
          },
        ];
    return { entwurf: null, befunde, aenderungen: [], abbruch };
  }

  for (const was of getan) {
    bericht.melde('korrigiert', 'Rücklauf', `Es war kein reines JSON — ${was}.`);
  }

  const fremd = Object.keys(objekt).filter(
    (schluessel) => !(ERWARTET as readonly string[]).includes(schluessel),
  );
  if (fremd.length) {
    bericht.melde(
      'uebergangen',
      'Rücklauf',
      `Diese Felder kennt der Generator nicht und übergeht sie: ${fremd.join(', ')}.`,
    );
  }

  const entwurf: CiEntwurf = {
    ...basis,
    palette: { ...basis.palette },
    textScale: { ...basis.textScale },
    sonderstufen: { ...basis.sonderstufen },
    stroke: { ...basis.stroke },
    shadowOffset: { ...basis.shadowOffset },
    fontFamily: { ...basis.fontFamily },
    pdfFontFamily: { ...basis.pdfFontFamily },
    webfontFaces: [...basis.webfontFaces],
  };

  for (const name of ['id', 'label', 'markenname', 'produkt'] as const) {
    const wert = nimmText(bericht, 'Marke', name, objekt[name]);
    if (wert !== null) {
      entwurf[name] = wert;
      bericht.nahm(name);
    }
  }

  /** Eine Gruppe übernehmen — und mitschreiben, ob dabei etwas ankam. */
  const uebernimm = <T>(
    ziel: Record<string, T>,
    schluessel: string,
    gelesen: Partial<Record<string, T>>,
  ) => {
    Object.assign(ziel, gelesen);
    if (Object.keys(gelesen).length) bericht.nahm(schluessel);
  };

  uebernimm(
    entwurf.palette,
    'palette',
    bericht.gruppe('Farbe', 'Die Palette', objekt.palette, paletteRollen, (wert, rolle) =>
      nimmFarbe(bericht, 'Farbe', rolle, wert),
    ),
  );

  uebernimm(
    entwurf.textScale,
    'textScale',
    bericht.gruppe('Maße', 'Die Größenleiter', objekt.textScale, textStufen, (wert, rolle) =>
      nimmZahl(bericht, 'Maße', rolle, wert),
    ),
  );
  uebernimm(
    entwurf.sonderstufen,
    'sonderstufen',
    bericht.gruppe(
      'Maße',
      'Die Stufen außerhalb der Leiter',
      objekt.sonderstufen,
      sonderstufen,
      (wert, rolle) => nimmZahl(bericht, 'Maße', rolle, wert),
    ),
  );
  uebernimm(
    entwurf.stroke,
    'stroke',
    bericht.gruppe('Maße', 'Die Strichstärken', objekt.stroke, strichRollen, (wert, rolle) =>
      nimmZahl(bericht, 'Maße', rolle, wert),
    ),
  );
  uebernimm(
    entwurf.shadowOffset,
    'shadowOffset',
    bericht.gruppe(
      'Maße',
      'Die Schattenversätze',
      objekt.shadowOffset,
      schattenRollen,
      (wert, rolle) => nimmZahl(bericht, 'Maße', rolle, wert),
    ),
  );

  if (objekt.auszeichnungEnger === undefined) {
    /*
       Auch das Fehlen wird gemeldet, und das war die Lücke: dieser eine
       Schlüssel lief nicht über `nimmText` und nicht über `bericht.gruppe`,
       also über keinen der beiden Wege, die „kam nicht" sagen. Ein Modell,
       das ihn ausließ, bekam dafür kein Wort — und die Laufweite der
       Auszeichnung ist nichts, was man auf der Probefolie sieht.
    */
    bericht.melde(
      'fehlt',
      'Maße',
      '„auszeichnungEnger" kam nicht — der bisherige Wert bleibt stehen.',
    );
  } else {
    // Die einzige Größe, die kein Folienmaß ist: die Laufweite steht in em, und
    // dort ist die Einheit richtig statt fremd.
    const wert = nimmZahl(bericht, 'Maße', 'auszeichnungEnger', objekt.auszeichnungEnger, ['em']);
    if (wert !== null) {
      entwurf.auszeichnungEnger = wert;
      bericht.nahm('auszeichnungEnger');
    }
  }

  uebernimm(
    entwurf.fontFamily,
    'fontFamily',
    bericht.gruppe(
      'Schrift',
      'Die Schriftstapel',
      objekt.fontFamily,
      schriftRollen,
      (wert, rolle) => nimmText(bericht, 'Schrift', rolle, wert),
    ),
  );
  uebernimm(
    entwurf.pdfFontFamily,
    'pdfFontFamily',
    bericht.gruppe(
      'Schrift',
      'Die PDF-Ersatzschriften',
      objekt.pdfFontFamily,
      schriftRollen,
      (wert, rolle) => {
        const name = nimmText(bericht, 'Schrift', rolle, wert);
        if (name === null) return null;
        const klein = name.toLowerCase();
        if (!(pdfSchriften as readonly string[]).includes(klein)) {
          bericht.melde(
            'uebergangen',
            'Schrift',
            `„${name}" ist keine der drei PDF-Kernschriften (${pdfSchriften.join(', ')}) — der bisherige Wert für „${rolle}" bleibt stehen.`,
          );
          return null;
        }
        if (klein !== name) {
          bericht.melde('korrigiert', 'Schrift', `„${rolle}": „${name}" → ${klein}.`);
        }
        return klein as PdfSchrift;
      },
    ),
  );

  const schnitte = nimmSchnitte(bericht, objekt.webfontFaces);
  if (schnitte) {
    entwurf.webfontFaces = schnitte;
    bericht.nahm('webfontFaces');
  }

  bericht.melde(
    'gelesen',
    'Rücklauf',
    `Übernommen: ${bericht.genommen.size} von ${ERWARTET.length} Feldern. Was nicht kam oder nicht taugte, steht unten; die Prüfliste rechts urteilt danach über das Ganze.`,
  );

  return {
    entwurf,
    befunde: bericht.befunde,
    aenderungen: unterschiede(basis, entwurf),
    abbruch: null,
  };
}
