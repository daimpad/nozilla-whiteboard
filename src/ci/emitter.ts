/**
 * Aus einem Entwurf wird eine Designdatei.
 *
 * Geschrieben wird `src/themes/<id>.ts` — und zwar so, wie `musterkunde.ts`
 * geschrieben ist: **die Palette einmal genannt, alles andere gemischt.** Der
 * Generator könnte die neunundzwanzig semantischen Tokens und die
 * zweiunddreißig Tonwerte ausrechnen und hinschreiben; er tut es ausdrücklich
 * nicht. Eine Datei, in der die Farben zweimal stehen, ist eine Datei, in der
 * jemand später eine ändert und die andere vergisst — und dann trägt der
 * Fließtext die neue Farbe und jede Karte die alte.
 *
 * ## Die Form ist die, die Prettier ohnehin herstellt
 *
 * Einfache Anführungszeichen, zwei Leerzeichen, Zeilen unter hundert Zeichen,
 * abschließende Kommata. Eine erzeugte Datei, die Prettier nicht besteht, macht
 * beim nächsten `npm run format` einen Diff, den niemand bestellt hat — und der
 * dann in einem fremden Commit landet.
 */
import type { PaletteRole } from '@/theme';
import {
  PAPIER_STUFEN,
  TINTE_STUFEN,
  paletteRollen,
  schattenRollen,
  schriftRollen,
  sonderstufen,
  strichRollen,
  textStufen,
  type CiEntwurf,
} from './entwurf';

/**
 * Ein Zeichenkettenliteral in der Form, die Prettier schreibt.
 *
 * Die vorige Fassung maskierte **nur** das doppelte Anführungszeichen, und das
 * riss auf drei Größenordnungen:
 *
 * - Laut: ein Wert, der auf einem Backslash endet (`C:\fonts\`), machte aus
 *   dem schließenden Anführungszeichen ein maskiertes — „Unterminated string
 *   literal", und `tsc` bricht ab.
 * - Still und darum schlimmer: ein Backslash *mitten* im Wert wurde zur
 *   Escape-Sequenz. `C:\fonts\Inter.woff2` bestand jede Prüfung, übersetzte
 *   sauber und ergab zur Laufzeit `C:<FF>ontsInter.woff2` — die Schrift lud
 *   nie, und der Export fiel still auf die Ersatzschrift zurück.
 * - Und ein Wert mit beiden Anführungszeichen erzeugte beim nächsten
 *   `npm run format` einen Diff, den niemand bestellt hat.
 *
 * Maskiert wird deshalb über `JSON.stringify` — der kennt Backslash,
 * Zeilenumbruch, Tabulator und die Steuerzeichen. Gewählt wird das
 * Anführungszeichen danach so, wie Prettier es wählt: das seltenere, bei
 * Gleichstand das einfache.
 */
export function text(wert: string): string {
  const einfach = (wert.match(/'/g) ?? []).length;
  const doppelt = (wert.match(/"/g) ?? []).length;
  // JSON.stringify liefert ein doppelt begrenztes Literal mit maskierten
  // Backslashes und Steuerzeichen — die Grundlage stimmt damit schon.
  const roh = JSON.stringify(wert);
  if (einfach > doppelt) return roh;

  // Auf einfache Anführungszeichen umstellen: die maskierten doppelten dürfen
  // wieder nackt stehen, die einfachen müssen maskiert werden.
  return `'${roh.slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`;
}

/**
 * Text für einen Blockkommentar.
 *
 * Ein `*` gefolgt von `/` im Markennamen beendete den Kopfkommentar mitten im
 * Satz, und alles danach war Code. Ein Leerzeichen dazwischen bricht die Folge,
 * ohne den Namen zu verfälschen — er steht dort ohnehin nur zum Lesen.
 */
function imKommentar(wert: string): string {
  /*
     Steuerzeichen ohne regulären Ausdruck: `no-control-regex` verbietet sie
     dort, und ein Zeichenvergleich sagt dasselbe, ohne dass jemand eine
     Ausnahme eintragen muss.
  */
  const lesbar = [...wert].map((zeichen) => (zeichen < ' ' ? ' ' : zeichen)).join('');
  return (
    lesbar
      /*
         Jeder Leerraum wird zu **einem gewöhnlichen Leerzeichen**, und das ist
         nicht Kosmetik: `no-irregular-whitespace` aus `eslint:recommended`
         schaut auch in Kommentare (`skipComments` ist per Vorgabe aus). Ein
         Name mit einem geschützten Leerzeichen — „Alte Post GmbH", wie es beim
         Kopieren aus Word oder von einer Webseite mitkommt — machte die
         erzeugte Datei damit unlintbar. Sie übersetzte, Prettier war zufrieden,
         die Prüfliste schwieg, und `npm run lint` brach in dem Repo ab, in das
         jemand sie gerade gelegt hatte. Gemessen an einer Probedatei: zwei
         Fehler, beide im Kopfkommentar.

         Und dieselbe Regel war der Grund, warum das schmale Leerzeichen, das
         hier früher die Sternchen-Folge brach, selbst ein Fehler war: der Fix
         trug den Fehler bei sich.

         Erst falten, dann die Sternchen-Folge brechen — die Reihenfolge zählt.
         Ein Umbruch im Label zerreißt sonst die ` * `-Spalte des
         Kopfkommentars: ab der zweiten Zeile steht der Text am linken Rand,
         ohne Stern, und von da an sieht der Kommentar aus wie abgeschnittener
         Code. Prettier fasst Blockkommentare nicht an, es gibt also keinen
         Diff und keinen Wurf — nur einen Kopf, den niemand mehr liest.
      */
      /*
         Drei Zeichen, die `no-irregular-whitespace` verbietet und die
         JavaScripts `\s` **nicht** kennt — sie kämen sonst durch die Faltung
         darunter hindurch.
      */
      .replace(/[\u0085\u180E\u200B]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\*\//g, '* /')
      .trim()
  );
}

/** Ein Feld, dessen Schlüssel in TypeScript ein Bezeichner sein darf. */
function schluessel(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : text(name);
}

/* -------------------------------------------------------------------------- */
/* Der Name, unter dem das Erscheinungsbild exportiert wird                     */
/* -------------------------------------------------------------------------- */

/**
 * Aus dem Schlüssel des Dateiformats wird ein Bezeichner.
 *
 * Diese Rechnung stand viermal in dieser Datei, und dreimal davon in einem
 * Kommentar oder in der Anleitung, die jemand kopiert. Sie steht jetzt einmal
 * hier — und `pruefung.ts` ruft **dieselbe**, denn ein Formular, das anders
 * rechnet als der Erzeuger, gibt eine Datei frei, die nicht übersetzt.
 *
 * `-x` wird zu `X`, und sonst nichts. Das ist Absicht: eine Rechnung, die auch
 * Ziffern und Sonderzeichen einebnete, machte aus zwei verschiedenen
 * Schlüsseln denselben Namen.
 */
/**
 * Was ein Schlüssel sein darf — in einem Satz.
 *
 * Hier und nicht zweimal, weil er an zwei Stellen steht: im Prompt für das
 * Sprachmodell und als Hinweis unter dem Feld, in das derselbe Wert von Hand
 * getippt wird. Der Prompt wurde einmal verschärft („nur vor einem
 * Buchstaben"), das Formular daneben nicht — und wer dem Formular folgte und
 * `probe-2024` eintippte, bekam einen harten Fehler in der Prüfliste und einen
 * gesperrten Datei-Knopf. Das ist derselbe Vorwurf, wegen dessen der Prompt
 * verschärft wurde: der Fehler steht bei dem, der die Anweisung befolgt hat.
 *
 * Der Satz steht neben `bezeichner()`, weil diese Rechnung ihn wahr macht.
 */
export const SCHLUESSELREGEL =
  'Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben — ein Bindestrich aber nur vor einem Buchstaben (probe-haus ja, probe-2024 nein)';

export function bezeichner(id: string): string {
  return id.replace(/-([a-z])/g, (_, buchstabe: string) => buchstabe.toUpperCase());
}

/**
 * Die Wörter, die in der erzeugten Datei schon vergeben sind.
 *
 * Zwei Gruppen, und beide gehören **hierher** und nicht in die Prüfung: die
 * eine ist ECMAScript, die andere ist die Liste der Namen, die genau dieser
 * Emitter ein paar Zeilen weiter unten selbst hinschreibt. Wer dort einen
 * Namen ergänzt, sieht diese Liste daneben.
 *
 * Der Anlass: `kunde-2024` — die naheliegendste Form eines Markenschlüssels
 * überhaupt — kam durch die Prüfliste, weil `-2` kein `-x` ist, und wurde zu
 * `export const kunde-2024: BrandTheme = {`. Ein Syntaxfehler, den erst der
 * nächste `npm run build` von jemand anderem findet.
 */
const VERGEBENE_WOERTER = new Set([
  // ECMAScript — reserviert, streng reserviert und für später vorgemerkt.
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'await',
  'arguments',
  'eval',
  'undefined',
  'NaN',
  'Infinity',
  // Was diese Datei selbst in denselben Gültigkeitsbereich schreibt.
  'palette',
  'inkAlpha',
  'paperAlpha',
  'textScale',
  'sonderstufen',
  'stufeMitWert',
  'typeScale',
  'faces',
  'wortmarke',
  'colorsFromPalette',
  'nozillaIcons',
  'nozillaTheme',
  'tonesFromPalette',
  'wordmarkFromSvg',
  'withoutSignature',
  'BrandTheme',
  'TypeScale',
  'TypeStyle',
]);

/**
 * Taugt der Schlüssel als Exportname? `null`, wenn ja — sonst der Grund.
 *
 * Gibt Klartext zurück und keinen Wahrheitswert: die Prüfliste zeigt ihn dem
 * Menschen, und „ungültig" ist keine Auskunft.
 */
export function bezeichnerProblem(id: string): string | null {
  const name = bezeichner(id);
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
    return `Aus „${id}" wird der Exportname „${name}", und das ist kein gültiger Bezeichner. Der Schlüssel darf Bindestriche tragen — aber nur vor einem Buchstaben, denn nur die zieht der Emitter zusammen.`;
  }
  if (VERGEBENE_WOERTER.has(name)) {
    return `Aus „${id}" wird der Exportname „${name}", und der ist vergeben — entweder von JavaScript selbst oder von einem Namen, den die erzeugte Datei daneben schon benutzt.`;
  }
  return null;
}

function paletteBlock(entwurf: CiEntwurf): string {
  /*
     Gruppiert wie in `theme.config.ts` und in `musterkunde.ts`: die Signale
     zusammen, die Papiere zusammen, die Tinten zusammen, die Statusfarben
     zuletzt. Das ist keine Kosmetik — wer eine Palette liest, sucht eine Rampe
     und keinen alphabetischen Index.
  */
  const gruppen: PaletteRole[][] = [
    paletteRollen.filter((rolle) => rolle.startsWith('signal')),
    paletteRollen.filter((rolle) => rolle.startsWith('paper') || rolle === 'white'),
    paletteRollen.filter((rolle) => rolle.startsWith('ink')),
  ];
  const genannt = new Set<PaletteRole>(gruppen.flat());
  gruppen.push(paletteRollen.filter((rolle) => !genannt.has(rolle)));

  return gruppen
    .filter((gruppe) => gruppe.length > 0)
    .map((gruppe) =>
      gruppe.map((rolle) => `  ${schluessel(rolle)}: ${text(entwurf.palette[rolle])},`).join('\n'),
    )
    .join('\n\n');
}

function alphaBlock(name: string, stufen: readonly [number, number, number], hex: string): string {
  const wert = hex.replace('#', '');
  const kanal = [0, 2, 4].map((i) => Number.parseInt(wert.slice(i, i + 2), 16));
  const zeilen = ([70, 50, 20] as const)
    .map(
      (stufe, i) =>
        `  ${stufe}: 'rgba(${kanal[0]}, ${kanal[1]}, ${kanal[2]}, ${stufen[i].toFixed(2)})',`,
    )
    .join('\n');
  return `const ${name} = {\n${zeilen}\n};`;
}

/**
 * Die Schnittliste — jeder Schnitt über vier Zeilen, immer.
 *
 * Einzeilig war kürzer und ging bei langen Namen schief: „Neue Haas Grotesk
 * Display Pro Condensed" samt Dateiname ergibt eine Zeile von 144 Zeichen, und
 * Prettier bricht sie beim nächsten `npm run format` in genau diese vier auf.
 * Die erzeugte Datei ist dann nicht die, die im Repo landet — der Diff steht in
 * einem fremden Commit, und niemand weiß, woher er kommt.
 *
 * Nachgerechnet wird die Grenze **nicht**. `printWidth` ist weich, und eine
 * nachgebaute Regel hat in dieser Datei schon einmal das Falsche verurteilt.
 * Gemessen wurde stattdessen die andere Richtung: ein Objektliteral, das im
 * Quelltext schon umgebrochen dasteht, lässt Prettier umgebrochen — auch wenn
 * es längst in eine Zeile passte. Damit stimmt die Form für jeden Namen, und
 * die Länge muss niemand kennen.
 */
function facesBlock(entwurf: CiEntwurf): string {
  return entwurf.webfontFaces
    .map((face) =>
      [
        '  {',
        `    family: ${text(face.family)},`,
        `    weight: ${zahl(face.weight, `Gewicht von ${face.family}`)},`,
        `    style: ${text(face.style)},`,
        `    file: ${text(face.file)},`,
        '  },',
      ].join('\n'),
    )
    .join('\n');
}

/**
 * Zahlen als Objektfelder.
 *
 * Die Einrückung ist ein Argument und keine Konstante: derselbe Block steht
 * einmal auf Modulebene (`const textScale = {`) und einmal verschachtelt
 * (`stroke: {` im Erscheinungsbild). Fest zwei Leerzeichen zu schreiben ergab
 * eine Datei, die Prettier beim nächsten `npm run format` umbricht — und dann
 * steht der Diff in einem fremden Commit.
 */
function zahlenBlock(
  werte: Record<string, number>,
  rollen: readonly string[],
  einzug = '  ',
): string {
  return rollen
    .map((rolle) => `${einzug}${schluessel(rolle)}: ${zahl(werte[rolle], rolle)},`)
    .join('\n');
}

/**
 * Eine Zahl, oder ein Wurf.
 *
 * Der letzte Riegel, und er sitzt bewusst hier und nicht nur in der Prüfung:
 * `NaN` ist in JavaScript ein gültiger Bezeichner. Eine Datei mit `xl3: NaN`
 * übersetzt, besteht Prettier und ESLint und setzt danach jahrelang leise
 * falsch. Lieber gar keine Datei als diese — und die Prüfliste sagt schon
 * vorher, welches Feld leer ist.
 */
function zahl(wert: number, name: string): number {
  if (!Number.isFinite(wert)) {
    throw new Error(`„${name}" trägt keine Zahl (${wert}) — daraus wird keine Designdatei.`);
  }
  return wert;
}

/**
 * Die Datei.
 *
 * Sie beginnt mit einem Kopfkommentar, der sagt, woher sie kommt und was der
 * Nächste wissen muss. Das ist nicht Höflichkeit: eine erzeugte Datei ohne
 * Herkunftsvermerk wird von Hand geändert, und beim nächsten Lauf des
 * Generators ist die Änderung weg.
 */
export function designdatei(entwurf: CiEntwurf): string {
  /*
     Die Riegel sitzen hier und nicht nur in der Prüfliste — dieselbe
     Entscheidung wie bei `zahl()` und dem `NaN`. Die Prüfliste war der einzige
     Wächter, solange das Formular der einzige Weg zu einem Entwurf war; seit
     der Rücklauf eines Sprachmodells daneben schreibt, ist sie es nicht mehr.

     Und der Schlüssel braucht seinen eigenen: er geht als **roher Text** in den
     Importpfad und in den Exportnamen, und dort hilft `text()` nichts. Ein
     Schlüssel mit einem Anführungszeichen darin bräche die Datei, einer mit
     einem Schrägstrich zeigte auf ein fremdes Verzeichnis.
  */
  const problem = bezeichnerProblem(entwurf.id);
  if (problem) throw new Error(problem);

  const marke = entwurf.wortmarke;
  if (!marke) {
    throw new Error(
      'Ohne Wortmarke gibt es keine Designdatei. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — die erzeugte Datei trüge sonst eine leere Füllfarbe und zeichnete nichts.',
    );
  }
  const svgName = wortmarkeDateiname(entwurf.id);
  const name = bezeichner(entwurf.id);

  const kopf = `/**
 * ${imKommentar(entwurf.label)} — dieses Erscheinungsbild.
 *
 * Angelegt mit dem CI-Generator (ci.html). Wer hier von Hand ändert, ändert
 * die Wahrheit — der Generator liest diese Datei nicht zurück.
 *
 * Was hier steht, ist eine **Belegung von Rollen** und kein neues Regelwerk.
 * Was nicht wechselt, steht im Kopf von \`src/theme/brandTheme.ts\`: Radius 0,
 * harte Versatzschatten, 1280 × 720 und das 64 × 64-Raster der Zeichen bei
 * 4 px Strich.
 *
 * Anmelden nicht vergessen — \`brandThemes\` in \`src/themes/index.ts\`:
 *
 * \`\`\`ts
 * import { ${name} } from './${entwurf.id}';
 * const brandThemes: BrandTheme[] = [musterkunde, ${name}];
 * \`\`\`
 *
 * Eine Datei, die hier liegt und nicht angemeldet ist, führt der Inspektor als
 * „nicht installiert" — das Deck sieht dann nach einem Fehler des Werkzeugs
 * aus, obwohl nur eine Zeile fehlt.
 */`;

  const importe = `import {
  colorsFromPalette,
  nozillaIcons,
  nozillaTheme,
  tonesFromPalette,
  wordmarkFromSvg,
  type BrandTheme,
  type TypeScale,
  type TypeStyle,
} from '@/theme';${entwurf.zeichen === 'ohne-signatur' ? `\nimport { withoutSignature } from '@/assets/icons';` : ''}
import wortmarke from './${svgName}?raw';`;

  const paletteTeil = `/**
 * Die Palette. Einmal genannt — Tonrollen und semantische Tokens werden daraus
 * gemischt, damit keine Farbe an zwei Stellen steht.
 *
 * \`paper\` ist das Papier dieser Marke, \`white\` ihr reines Weiß. Die beiden
 * müssen zwei sein: sie belegen je einen Untergrund („Creme" und „Weiß") und je
 * eine Flächenrolle, und wer ihnen denselben Wert gibt, bekommt vier
 * Menüeinträge, die dasselbe malen.
 */
const palette = {
${paletteBlock(entwurf)}
};

/**
 * Tinte und Papier mit Deckkraft — die Werte gehören zu *dieser* Palette.
 *
 * \`paperAlpha\` ist das Papier und nicht das Weiß: es malt den gedämpften Text
 * auf einer Folie in Tinte, und der soll denselben Unterton haben wie der laute
 * darüber.
 */
${alphaBlock('inkAlpha', TINTE_STUFEN, entwurf.palette.ink)}
${alphaBlock('paperAlpha', PAPIER_STUFEN, entwurf.palette.paper)}`;

  const schriftTeil = `/**
 * Die Größenleiter dieser Marke — acht Stufen, und sonst gibt es keine.
 */
const textScale = {
${zahlenBlock(entwurf.textScale as Record<string, number>, textStufen)}
};

/**
 * Die drei Größen, die auf keiner Stufe der Leiter sitzen: die
 * Kampagnengröße, die Fußzeile unterhalb der Leiter und der Code im Fließtext,
 * der knapp darunter steht, weil eine Monospace breiter baut.
 */
const sonderstufen: Record<string, number> = {
${zahlenBlock(entwurf.sonderstufen as unknown as Record<string, number>, sonderstufen)}
};

/**
 * Die Hierarchie: Struktur von nozilla, Größen aus der Leiter oben.
 *
 * Zugeordnet wird über den *Wert* und nicht über eine getippte Tabelle — eine
 * Tabelle „Rolle → Größe" auf Modulebene war hier schon einmal eine
 * eingefrorene CI.
 */
const stufeMitWert = new Map<number, keyof typeof textScale>(
  (Object.keys(nozillaTheme.textScale) as Array<keyof typeof textScale>).map((stufe) => [
    nozillaTheme.textScale[stufe],
    stufe,
  ]),
);

const typeScale = Object.fromEntries(
  Object.entries(nozillaTheme.typeScale).map(([name, stil]) => {
    const stufe = stufeMitWert.get(stil.size);
    return [
      name,
      {
        ...stil,
        size: stufe ? textScale[stufe] : (sonderstufen[name] ?? stil.size),
        tracking: stil.family === 'display' ? stil.tracking - ${zahl(entwurf.auszeichnungEnger, 'Laufweite')} : stil.tracking,
      } satisfies TypeStyle,
    ];
  }),
) as TypeScale;`;

  const schnitteTeil = `/**
 * Die selbst gehosteten Schnitte. Zu jeder \`.woff2\` muss unter
 * \`public/fonts/\` auch die gleichnamige \`.ttf\` liegen: WOFF2 kann nichts
 * lesen, was Glyphen braucht, und PDF wie Umriss-Leser brauchen \`glyf\`.
 */
const faces = [
${facesBlock(entwurf)}
];`;

  const themeTeil = `export const ${name}: BrandTheme = {
  id: ${text(entwurf.id)},
  label: ${text(entwurf.label)},

  brand: {
    ...nozillaTheme.brand,
    name: ${text(entwurf.markenname)},
    product: ${text(entwurf.produkt)},
  },

  /*
     Aus der SVG-Datei gelesen, nicht als Bild eingebunden: nur so landet die
     Marke in SVG *und* PDF als echter Vektor und nimmt die Tinte der Fläche an,
     auf der sie sitzt. Zugeordnet wird über die Füllfarbe — eine
     Zeichensoftware sortiert Pfade um, wie sie will.
  */
  wordmark: wordmarkFromSvg(wortmarke, {
    letters: ${text(marke.letters)},${marke.accent ? `\n    accent: ${text(marke.accent)},` : ''}
  }),
  ${
    entwurf.zeichen === 'nozilla'
      ? `icons: nozillaIcons,`
      : `/*
     Der geliehene Katalog ohne nozillas Signatur: der 6 × 6 große Punkt unten
     rechts ist deren Erkennungszeichen und keine Eigenschaft des Dialekts. Er
     nähme die Signalfarbe dieser Marke an und setzte trotzdem eine fremde
     Handschrift auf jede Folie.

     Eigene Zeichen kommen hierher — 64 × 64, 4 px, square caps, miter joins,
     Farbe nur über die Rollen ink | signal | signal-soft | signal-deep. Ein Set
     *ersetzt*: wer nur die eigenen einträgt, hat nur die eigenen.
  */
  icons: {
    categories: [...nozillaIcons.categories],
    icons: Object.fromEntries(
      Object.entries(nozillaIcons.icons).map(([name, icon]) => [
        name,
        { ...icon, prims: withoutSignature(icon.prims) },
      ]),
    ),
  },`
  }

  palette,
  inkAlpha,
  paperAlpha,
  color: colorsFromPalette(palette, inkAlpha),
  elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),

  textScale,
  typeScale,
  /*
     Hinter der eigenen Schrift steht die *andere* dieses Erscheinungsbilds, und
     erst danach das System. Der Export sucht ein fehlendes Zeichen in genau
     dieser Reihenfolge; nennt der Stapel keine zweite Marken-Schrift, findet er
     nichts, und das Zeichen fällt aus PNG und PDF heraus.
  */
  fontFamily: {
${schriftRollen.map((rolle) => `    ${rolle}: ${text(entwurf.fontFamily[rolle])},`).join('\n')}
  },
  webfont: { ...nozillaTheme.webfont, faces },
  pdfFontFamily: {
${schriftRollen.map((rolle) => `    ${rolle}: ${text(entwurf.pdfFontFamily[rolle])},`).join('\n')}
  },

  stroke: {
${zahlenBlock(entwurf.stroke as Record<string, number>, strichRollen, '    ')}
  },
  shadowOffset: {
${zahlenBlock(entwurf.shadowOffset as Record<string, number>, schattenRollen, '    ')}
  },
};`;

  return [kopf, importe, paletteTeil, schriftTeil, schnitteTeil, themeTeil].join('\n\n') + '\n';
}

/**
 * Wie die Wortmarken-Datei heißt.
 *
 * Öffentlich und an einer Stelle, weil zwei sie brauchen: die `import`-Zeile
 * der erzeugten Datei und der Knopf, der die Datei aushändigt. Zwei Rechnungen
 * für einen Dateinamen laufen auseinander, und man sähe es erst an der
 * abgelegten Datei — genau dort, wo Umbenennen der Handgriff ist, der am
 * ehesten schiefgeht.
 */
export function wortmarkeDateiname(id: string): string {
  return `${id}-wortmarke.svg`;
}

/**
 * Die Zeilen, die von Hand nachzutragen sind.
 *
 * Sie stehen getrennt und nicht im Kopf der Datei, weil sie *woanders*
 * hingehören — und weil eine aufgeschriebene Regel genau das ist, wovon dieses
 * Projekt wieder und wieder feststellt, dass sie nicht hält.
 */
export function anleitung(entwurf: CiEntwurf): string {
  const name = bezeichner(entwurf.id);
  return `1 · Die beiden Dateien ablegen

   src/themes/${entwurf.id}.ts
   src/themes/${wortmarkeDateiname(entwurf.id)}

2 · Anmelden — src/themes/index.ts

   import { ${name} } from './${entwurf.id}';
   const brandThemes: BrandTheme[] = [musterkunde, ${name}];

3 · Die Schriften

   Zu jeder .woff2 gehört die gleichnamige .ttf unter public/fonts/.
   Fehlt die .ttf, sehen Fläche und SVG richtig aus — PDF und PNG nicht.

4 · Prüfen

   npm run build && npm run test

   Ein Deck stellt man mit  theme: ${entwurf.id}  im Frontmatter um.`;
}
