/**
 * Was an einem Entwurf falsch sein kann — bevor jemand die Datei anlegt.
 *
 * Der Grund, warum diese Datei die längste des Generators ist: **`registerTheme()`
 * prüft genau eine Sache, und nicht die, die am häufigsten schiefgeht.** Es
 * wirft nur, wenn eine Flächenrolle die eigene Palette verlässt. Ob `color`
 * aus derselben Palette gemischt ist, ob die Deckkraftstufen zur Tinte passen,
 * ob `paper` und `white` zwei sind, ob eine genannte Schrift überhaupt
 * existiert, ob die Ersatzkette länger als eins ist — nichts davon.
 *
 * Diese vier hängen an Tests, und ein Test läuft erst, wenn die Datei schon da
 * ist. Genau das ist die Liste, die ein Formular *vorher* abarbeiten kann.
 *
 * ## Warum drei Schweregrade und nicht zwei
 *
 * `fehler` heißt: die Datei übersetzt nicht, wirft beim Anmelden, oder ein
 * bestehender Test wird rot. `warnung` heißt: alles läuft, und trotzdem ist
 * etwas falsch — vier Menüeinträge, die dasselbe malen, eine Schrift, die im
 * Export still durch Helvetica ersetzt wird, schwarze Schrift auf dunklem
 * Grund. Das ist die Klasse Fehler, die dieses Projekt immer wieder teuer zu
 * stehen gekommen ist, und sie hat genau deshalb einen eigenen Rang: sie
 * verschwindet nicht von selbst, aber sie hält niemanden auf.
 *
 * `hinweis` ist das, was der Nächste wissen muss und nicht raten soll.
 */
import { nozillaTheme, type FamilyRole } from '@/theme';
import { AA, AA_GROSS, kanaele, kontrast, unterscheidbar } from '@/lib/contrast';
import { paletteRollen, pdfSchriften, schriftRollen, textStufen, type CiEntwurf } from './entwurf';
import { bezeichnerProblem } from './emitter';

export type Rang = 'fehler' | 'warnung' | 'hinweis';

export interface Befund {
  rang: Rang;
  /** Der Abschnitt des Formulars, zu dem der Befund gehört. */
  feld: string;
  text: string;
}

/* -------------------------------------------------------------------------- */
/* Marke                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Schlüssel, die ein Erscheinungsbild nicht tragen darf.
 *
 * `nozilla` ist der gefährlichste: ein bereits vergebener Schlüssel **ersetzt
 * das angemeldete Erscheinungsbild kommentarlos**, und `activate()` zieht die
 * Änderung sofort in die laufende Oberfläche. Wer sein Kunden-CI `nozilla`
 * nennt, überschreibt damit die eigene.
 */
const VERGEBEN = new Set(['nozilla', 'musterkunde']);

function pruefeMarke(entwurf: CiEntwurf): Befund[] {
  const befunde: Befund[] = [];
  const feld = 'Marke';

  if (!entwurf.id.trim()) {
    befunde.push({ rang: 'fehler', feld, text: 'Der Schlüssel fehlt.' });
  } else if (!/^[a-z][a-z0-9-]*$/.test(entwurf.id)) {
    befunde.push({
      rang: 'fehler',
      feld,
      text: `„${entwurf.id}" taugt nicht als Schlüssel: Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben. Er steht so im Frontmatter jedes Decks (theme: …).`,
    });
  } else if (VERGEBEN.has(entwurf.id)) {
    befunde.push({
      rang: 'fehler',
      feld,
      text: `„${entwurf.id}" ist vergeben. Ein bereits angemeldeter Schlüssel ersetzt das dortige Erscheinungsbild kommentarlos — bei „nozilla" also die eigene CI.`,
    });
  } else {
    /*
       Die Regel darüber lässt Ziffern und Bindestriche zu, und das ist
       richtig — `kunde-2024` ist ein guter Schlüssel für eine `.md`. Er ist
       nur kein guter *Bezeichner*, und der Emitter macht aus dem einen den
       anderen. Gefragt wird deshalb der Emitter selbst: eine zweite Rechnung
       hier gäbe eine Datei frei, die nicht übersetzt.
    */
    const problem = bezeichnerProblem(entwurf.id);
    if (problem) befunde.push({ rang: 'fehler', feld, text: problem });
  }

  if (!entwurf.label.trim()) {
    befunde.push({ rang: 'fehler', feld, text: 'Der Name für die Auswahl fehlt.' });
  }
  if (!entwurf.markenname.trim()) {
    befunde.push({
      rang: 'warnung',
      feld,
      text: 'Ohne Markennamen steht in jedem exportierten PDF und jeder PPTX ein leerer Urheber.',
    });
  }

  return befunde;
}

/* -------------------------------------------------------------------------- */
/* Farbe                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Die Paare, deren Kontrast über Lesbarkeit entscheidet — und die der Kunde
 * **nicht reparieren kann**.
 *
 * Sie sind im Mischer fest verdrahtet: `elementTones.signal.text` ist
 * `palette.ink` auf `palette.signal`, `color.inkOnSignal` ebenso,
 * `elementTones.ink.text` ist `palette.paper` auf `palette.ink`. Eine Marke
 * mit dunkler Signalfarbe bekommt schwarze Schrift auf dunklem Grund — auf
 * jeder Signalfolie, in jedem Abzeichen, in jedem Knopf. Das ist der eine
 * CI-Fehler, der bei einer neuen Marke fast sicher vorkommt, und der einzige,
 * den ein Formular sofort zeigen kann.
 */
const LESEPAARE: Array<{ vorn: string; hinten: string; wo: string; schwelle: number }> = [
  { vorn: 'ink', hinten: 'white', wo: 'Fließtext auf einer weißen Folie', schwelle: AA },
  { vorn: 'ink', hinten: 'paper', wo: 'Fließtext auf einer cremefarbenen Folie', schwelle: AA },
  { vorn: 'ink', hinten: 'signal', wo: 'Schrift auf einer Signalfläche', schwelle: AA },
  { vorn: 'paper', hinten: 'ink', wo: 'Schrift auf einer Folie in Tinte', schwelle: AA },
  {
    vorn: 'ink',
    hinten: 'signalSoft',
    wo: 'Code auf einer Signalfolie',
    schwelle: AA,
  },
  { vorn: 'paper', hinten: 'ink800', wo: 'Code auf einer Folie in Tinte', schwelle: AA_GROSS },
];

/**
 * Die Paare, die einander nur *unterscheiden* müssen.
 *
 * Eine andere Frage als die nach dem Kontrast. Ein Code-Untergrund auf einer
 * Signalfolie muss nichts lesbar machen — er muss sichtbar sein. Fällt eines
 * dieser Paare zusammen, ist nichts kaputt, nichts sagt etwas, und die Wahl tut
 * nur nichts. Genau so ist es zweimal passiert: erst mit drei Cremetönen, die
 * einer waren, dann mit `paper` und `white`, die beide `#FFFFFF` trugen.
 */
const TRENNPAARE: Array<{ a: string; b: string; wo: string }> = [
  {
    a: 'paper',
    b: 'white',
    wo: 'die Untergründe „Creme" und „Weiß" und die Flächenrollen daneben',
  },
  { a: 'signalSoft', b: 'signal', wo: 'der Code-Untergrund auf einer Signalfolie' },
  { a: 'ink800', b: 'ink', wo: 'der Code-Untergrund auf einer Folie in Tinte' },
  { a: 'signalStrong', b: 'signal', wo: 'der gedrückte Zustand einer Signalfläche' },
];

/**
 * Die Trennbefunde zu einer Palette — für sich, damit ein Test sie an jedem
 * angemeldeten Erscheinungsbild fahren kann.
 *
 * Das ist der Wächter, der gefehlt hat. Die erste Fassung dieser Prüfung
 * verurteilte die nozilla-CI selbst, und kein Test sah es: der Probeentwurf
 * überschreibt `paper`, und die Prüfung „lässt einen tragfähigen Entwurf
 * durch" fragte nur nach dem Rang „fehler". Eine Warnung, die auf der eigenen
 * CI anschlägt, lehrt in der ersten Minute, den teuersten Rang der Liste zu
 * überlesen.
 */
export function trennbefunde(palette: Record<string, string>): Befund[] {
  const befunde: Befund[] = [];
  for (const paar of TRENNPAARE) {
    const a = palette[paar.a];
    const b = palette[paar.b];
    if (!a || !b) continue;
    if (!unterscheidbar(a, b)) {
      befunde.push({
        rang: 'warnung',
        feld: 'Farbe',
        text: `„${paar.a}" und „${paar.b}" sind dieselbe Farbe. Betroffen ist ${paar.wo} — nichts geht kaputt, die Wahl tut nur nichts.`,
      });
    }
  }
  return befunde;
}

function pruefeFarbe(entwurf: CiEntwurf): Befund[] {
  const befunde: Befund[] = [];
  const feld = 'Farbe';
  const p = entwurf.palette;

  for (const rolle of paletteRollen) {
    const wert = (p[rolle] ?? '').trim();
    if (!kanaele(wert)) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${rolle}" ist kein #RRGGBB: „${wert}". Kurzschreibweise, rgb() und Farbnamen lassen withAlpha() schon beim Anlegen werfen — und tonesOutsidePalette() vergleicht Zeichenketten, ${'#ffffff'} und ${'#FFFFFF'} sind für sie zwei Farben.`,
      });
    }
  }
  // Ohne vollständige Palette sagen die Rechnungen darunter nichts.
  if (befunde.length > 0) return befunde;

  befunde.push(...trennbefunde(p));

  for (const paar of LESEPAARE) {
    const wert = kontrast(p[paar.vorn as never], p[paar.hinten as never]);
    if (wert < paar.schwelle) {
      befunde.push({
        rang: 'warnung',
        feld,
        text: `${paar.wo}: Kontrast ${wert.toFixed(1)} : 1, verlangt sind ${paar.schwelle} : 1. Diese Paarung steht fest im Mischer — sie lässt sich nur über die Palette reparieren, nicht in der erzeugten Datei.`,
      });
    }
  }

  return befunde;
}

/* -------------------------------------------------------------------------- */
/* Schrift                                                                     */
/* -------------------------------------------------------------------------- */

/** Der erste Name eines Stapels, ohne Anführungszeichen. */
export function ersterName(stapel: string): string {
  return (stapel.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

/** Alle Namen eines Stapels, in ihrer Reihenfolge. */
export function stapelNamen(stapel: string): string[] {
  return stapel
    .split(',')
    .map((teil) => teil.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function pruefeSchrift(entwurf: CiEntwurf): Befund[] {
  const befunde: Befund[] = [];
  const feld = 'Schrift';
  const familien = new Set(entwurf.webfontFaces.map((face) => face.family));

  for (const rolle of schriftRollen) {
    const stapel = entwurf.fontFamily[rolle] ?? '';
    const namen = stapelNamen(stapel);
    const erster = namen[0] ?? '';

    if (!erster) {
      befunde.push({ rang: 'fehler', feld, text: `Der Stapel für „${rolle}" ist leer.` });
      continue;
    }
    if (!familien.has(erster)) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${erster}" steht vorn im Stapel für „${rolle}", aber in keinem Schnitt. resolveFace() vergleicht buchstabengleich; passt der Name nicht, findet der Export keine Datei und fällt still auf die PDF-Ersatzschrift zurück — kein Fehler, keine Warnung, nur eine andere Schrift.`,
      });
    }

    /*
       Die zweite Marken-Schrift, und warum die bestehende Prüfung sie nicht
       fängt: `ersatzkette()` stellt die eigene Rolle vorn ein, wenn der Stapel
       sie nicht selbst nennt — `body` bekommt damit ['body','display'] und ist
       länger als eins, ohne dass eine zweite Schrift im Spiel wäre. Die
       Prüfung `length > 1` sieht deshalb nur die Auszeichnungsrolle. Gezählt
       werden hier die Namen, die wirklich Schnitte haben.
    */
    const markenNamen = namen.filter((name) => familien.has(name));
    if (markenNamen.length < 2) {
      befunde.push({
        rang: 'warnung',
        feld,
        text: `Der Stapel für „${rolle}" nennt nur eine Marken-Schrift. Keine Schrift führt jedes Zeichen — Space Mono kennt ⌘, ⌫, ⇧ und ⌥ nicht —, und der Export sucht ein fehlendes Zeichen in genau dieser Reihenfolge. Ohne eine zweite fällt es aus PNG und PDF heraus, während der Bildschirm es aus einer Systemschrift holt und richtig aussieht.`,
      });
    }
  }

  for (const familie of familien) {
    const schnitte = entwurf.webfontFaces.filter((face) => face.family === familie);
    if (!schnitte.some((face) => face.style === 'normal')) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${familie}" hat keinen aufrechten Schnitt (style: normal).`,
      });
    }
  }

  for (const face of entwurf.webfontFaces) {
    if (!face.family.trim()) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: 'Ein Schnitt ohne Familie gehört nicht in die Liste.',
      });
    }
    if (!face.file.trim()) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `Der Schnitt „${face.family || '(ohne Familie)'} ${face.weight}" nennt keine Datei.`,
      });
    }
    if (!Number.isInteger(face.weight) || face.weight < 100 || face.weight > 900) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${face.family || '(ohne Familie)'}" trägt das Gewicht ${face.weight}. Ein @font-face kennt 100 bis 900 — alles andere macht die Regel ungültig, und der Schnitt gilt still als 400.`,
      });
    }
    if (face.file.trim() && !face.file.endsWith('.woff2')) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${face.file}" ist kein WOFF2. loadTtf() tauscht für den Export nur die Endung — die Angabe muss die WOFF2-Datei nennen.`,
      });
    }
  }

  for (const rolle of schriftRollen) {
    const wert = entwurf.pdfFontFamily[rolle];
    if (!(pdfSchriften as readonly string[]).includes(wert)) {
      befunde.push({
        rang: 'fehler',
        feld,
        text: `„${wert}" ist keine der drei PDF-Kernschriften (${pdfSchriften.join(', ')}).`,
      });
    }
  }

  return befunde;
}

/* -------------------------------------------------------------------------- */
/* Maße                                                                        */
/* -------------------------------------------------------------------------- */

function pruefeMasse(entwurf: CiEntwurf): Befund[] {
  const befunde: Befund[] = [];

  /*
     Zwei Fragen und nicht eine. `endlich()` fragt, ob überhaupt eine Zahl
     dasteht; `groesse()` zusätzlich, ob sie positiv ist.

     Der Unterschied ist der Anlass für diesen ganzen Abschnitt: ein leeres
     Zahlenfeld gibt `Number.parseFloat('')` weiter, also `NaN`. Und `NaN` ist
     in JavaScript ein gültiger *Bezeichner* — die erzeugte Datei trug
     `xl3: NaN` und `stil.tracking - NaN`, übersetzte anstandslos und setzte
     von da an in jeder Ausgabe leise falsch. Die vorige Fassung sah das nicht,
     weil sie zwei Felder gar nicht durchging: die Laufweite darf null und
     negativ sein, der Schattenversatz `none` muss null sein — beide fielen
     durch die Bedingung `wert <= 0` und wurden deshalb übersprungen. Endlich
     müssen sie trotzdem sein.
  */
  const endlich = (wert: number, name: string) => {
    if (Number.isFinite(wert)) return true;
    befunde.push({
      rang: 'fehler',
      feld: 'Maße',
      text: `„${name}" trägt keine Zahl. Ein leeres Zahlenfeld schreibt NaN in die Kundendatei, und die übersetzt damit anstandslos.`,
    });
    return false;
  };

  const groesse = (wert: number, name: string) => {
    if (!endlich(wert, name)) return false;
    if (wert <= 0) {
      befunde.push({ rang: 'fehler', feld: 'Maße', text: `„${name}" ist keine Größe: ${wert}.` });
      return false;
    }
    return true;
  };

  for (const stufe of textStufen) groesse(entwurf.textScale[stufe], stufe);
  for (const [name, wert] of Object.entries(entwurf.stroke)) groesse(wert, name);
  for (const [name, wert] of Object.entries(entwurf.sonderstufen)) groesse(wert, name);

  // Die Laufweite darf null sein (die Leiter bleibt, wie sie ist) und negativ
  // (eine Grotesk verträgt mehr Enge). Nur eine Zahl muss sie sein.
  endlich(entwurf.auszeichnungEnger, 'Laufweite der Auszeichnung');

  for (const [name, wert] of Object.entries(entwurf.shadowOffset)) {
    if (name === 'none') {
      // „Kein Schatten" ist eine Wahl und deshalb von `groesse()` ausgenommen —
      // die Ausnahme betrifft aber den Wert null, nicht die Endlichkeit.
      if (endlich(wert, name) && wert !== 0) {
        befunde.push({
          rang: 'warnung',
          feld: 'Maße',
          text: `„none" trägt ${wert} statt 0 — dann hat „kein Schatten" einen Schatten.`,
        });
      }
      continue;
    }
    groesse(wert, name);
  }

  // Die Leiter muss steigen. Eine, die es nicht tut, ist keine Hierarchie mehr:
  // eine h2 größer als eine h1 fällt auf keiner einzelnen Folie auf, macht aber
  // jedes Deck unlesbar, das die Hierarchie benutzt.
  for (let i = 1; i < textStufen.length; i += 1) {
    const vorher = entwurf.textScale[textStufen[i - 1]];
    const jetzt = entwurf.textScale[textStufen[i]];
    // Fehlt eine Zahl, steht der Befund schon oben — hier zweimal über
    // dieselbe Stelle zu klagen macht die Liste länger und nicht klarer.
    if (!Number.isFinite(vorher) || !Number.isFinite(jetzt)) continue;
    if (jetzt <= vorher) {
      befunde.push({
        rang: 'warnung',
        feld: 'Maße',
        text: `Die Leiter steigt nicht: „${textStufen[i]}" (${jetzt}) ist nicht größer als „${textStufen[i - 1]}" (${vorher}).`,
      });
    }
  }

  return befunde;
}

/* -------------------------------------------------------------------------- */
/* Wortmarke                                                                   */
/* -------------------------------------------------------------------------- */

function pruefeWortmarke(entwurf: CiEntwurf): Befund[] {
  const feld = 'Wortmarke';
  const marke = entwurf.wortmarke;

  if (!marke) {
    return [
      {
        rang: 'fehler',
        feld,
        text: 'Die Wortmarke fehlt. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — fehlte sie, trüge ein Kundendeck die Marke von nozilla.',
      },
    ];
  }

  const befunde: Befund[] = [];
  const box = /viewBox="([^"]+)"/.exec(marke.svg)?.[1].trim().split(/\s+/).map(Number);
  if (!box || box.length !== 4 || box.some((wert) => !Number.isFinite(wert))) {
    befunde.push({ rang: 'fehler', feld, text: 'Die SVG-Datei hat keine lesbare viewBox.' });
  }

  const pfade = [...marke.svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map(
    (treffer) => /fill="([^"]+)"/.exec(treffer[0])?.[1] ?? '',
  );
  const gleich = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

  if (!pfade.some((fuellung) => gleich(fuellung, marke.letters))) {
    befunde.push({
      rang: 'fehler',
      feld,
      text: `Kein Pfad in „${marke.letters}". Zugeordnet wird über die Füllfarbe, die in der Datei steht — nicht über die Palette und nicht über die Reihenfolge der Pfade. Gefunden wurden: ${[...new Set(pfade)].filter(Boolean).join(', ') || '(keine)'}.`,
    });
  }
  if (marke.accent && !pfade.some((fuellung) => gleich(fuellung, marke.accent))) {
    befunde.push({
      rang: 'warnung',
      feld,
      text: `Kein Pfad in „${marke.accent}" — der Akzent am Wortende bliebe leer. Wer keinen hat, lässt das Feld frei.`,
    });
  }
  if (!marke.accent) {
    befunde.push({
      rang: 'hinweis',
      feld,
      text: 'Ohne Akzentfarbe wird kein Akzent gezeichnet. Das ist erlaubt — nicht jede Marke hat einen Punkt am Wortende.',
    });
  } else {
    befunde.push({
      rang: 'hinweis',
      feld,
      text: 'Die Akzentfarbe wählt nur die Pfade aus; gemalt wird der Akzent auf der Folie immer in der Signalfarbe.',
    });
  }

  return befunde;
}

/* -------------------------------------------------------------------------- */
/* Alles zusammen                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Was der Generator sonst noch sagen muss.
 *
 * Kein Fehler des Entwurfs, sondern zwei Wahrheiten über das Werkzeug, die
 * jeder erfährt, der ein Erscheinungsbild anlegt — und die sonst jeder für
 * einen Fehler hält.
 */
function hinweise(entwurf: CiEntwurf): Befund[] {
  return [
    {
      rang: 'hinweis',
      feld: 'Werkzeug',
      text: 'Die Leisten wechseln nie mit. Sie gehören dem Arbeitsplatz, nicht dem Deck — ein cremefarbener Editor um eine cremefarbene Folie macht beides unlesbar.',
    },
    {
      rang: 'hinweis',
      feld: 'Werkzeug',
      text: `Radius 0, harte Versatzschatten, 1280 × 720 und das 64er-Raster der Zeichen bleiben. Das sind keine Einstellungen, sondern das, wofür dieses Werkzeug gebaut ist.`,
    },
    {
      rang: 'hinweis',
      feld: 'Zeichen',
      text:
        entwurf.zeichen === 'nozilla'
          ? `Die ${Object.keys(nozillaTheme.icons?.icons ?? {}).length} nozilla-Zeichen kommen mit — samt dem 6 × 6 großen Punkt unten rechts, der die Signalfarbe dieser Marke annimmt.`
          : 'Der Katalog kommt ohne nozillas Signatur. Eigene Zeichen trägt man in der erzeugten Datei nach; sie ersetzen den Katalog dann, sie ergänzen ihn nicht.',
    },
  ];
}

export function pruefe(entwurf: CiEntwurf): Befund[] {
  return [
    ...pruefeMarke(entwurf),
    ...pruefeFarbe(entwurf),
    ...pruefeSchrift(entwurf),
    ...pruefeMasse(entwurf),
    ...pruefeWortmarke(entwurf),
    ...hinweise(entwurf),
  ];
}

/** Trägt der Entwurf einen Fehler, der das Anlegen verhindert? */
export function traegtFehler(befunde: Befund[]): boolean {
  return befunde.some((befund) => befund.rang === 'fehler');
}

/** Die Rollen der Schriften, für die Anzeige. */
export const schriftRollenTitel: Record<FamilyRole, string> = {
  display: 'Auszeichnung',
  body: 'Fließtext',
  mono: 'Monospace',
};
