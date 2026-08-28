/**
 * Aus einem Entwurf wird eine Kundendatei.
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

/** Ein Zeichenkettenliteral in der Form, die Prettier schreibt. */
function text(wert: string): string {
  // Prettier bevorzugt einfache Anführungszeichen und wechselt nur, wenn der
  // Inhalt dadurch weniger Maskierung braucht — genau wie hier.
  return wert.includes("'") ? `"${wert.replace(/"/g, '\\"')}"` : `'${wert}'`;
}

/** Ein Feld, dessen Schlüssel in TypeScript ein Bezeichner sein darf. */
function schluessel(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : text(name);
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

function facesBlock(entwurf: CiEntwurf): string {
  return entwurf.webfontFaces
    .map(
      (face) =>
        `  { family: ${text(face.family)}, weight: ${face.weight}, style: ${text(face.style)}, file: ${text(face.file)} },`,
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
  return rollen.map((rolle) => `${einzug}${schluessel(rolle)}: ${werte[rolle]},`).join('\n');
}

/**
 * Die Datei.
 *
 * Sie beginnt mit einem Kopfkommentar, der sagt, woher sie kommt und was der
 * Nächste wissen muss. Das ist nicht Höflichkeit: eine erzeugte Datei ohne
 * Herkunftsvermerk wird von Hand geändert, und beim nächsten Lauf des
 * Generators ist die Änderung weg.
 */
export function kundendatei(entwurf: CiEntwurf): string {
  const marke = entwurf.wortmarke;
  const svgName = `${entwurf.id}-wortmarke.svg`;

  const kopf = `/**
 * ${entwurf.label} — das Erscheinungsbild dieses Kunden.
 *
 * Angelegt mit dem CI-Generator (ci.html). Wer hier von Hand ändert, ändert
 * die Wahrheit — der Generator liest diese Datei nicht zurück.
 *
 * Was hier steht, ist eine **Belegung von Rollen** und kein neues Regelwerk.
 * Was nicht wechselt, steht im Kopf von \`src/theme/brandTheme.ts\`: Radius 0,
 * harte Versatzschatten, 1280 × 720 und das 64 × 64-Raster der Zeichen bei
 * 4 px Strich.
 *
 * Anmelden nicht vergessen — \`clientThemes\` in \`src/themes/index.ts\`:
 *
 * \`\`\`ts
 * import { ${entwurf.id.replace(/-([a-z])/g, (_, b: string) => b.toUpperCase())} } from './${entwurf.id}';
 * const clientThemes: BrandTheme[] = [musterkunde, ${entwurf.id.replace(/-([a-z])/g, (_, b: string) => b.toUpperCase())}];
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
        tracking: stil.family === 'display' ? stil.tracking - ${entwurf.auszeichnungEnger} : stil.tracking,
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

  const themeTeil = `export const ${entwurf.id.replace(/-([a-z])/g, (_, b: string) => b.toUpperCase())}: BrandTheme = {
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
    letters: ${text(marke?.letters ?? '')},${marke?.accent ? `\n    accent: ${text(marke.accent)},` : ''}
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
 * Die Zeilen, die von Hand nachzutragen sind.
 *
 * Sie stehen getrennt und nicht im Kopf der Datei, weil sie *woanders*
 * hingehören — und weil eine aufgeschriebene Regel genau das ist, wovon dieses
 * Projekt wieder und wieder feststellt, dass sie nicht hält.
 */
export function anleitung(entwurf: CiEntwurf): string {
  const name = entwurf.id.replace(/-([a-z])/g, (_, b: string) => b.toUpperCase());
  return `1 · Die beiden Dateien ablegen

   src/themes/${entwurf.id}.ts
   src/themes/${entwurf.id}-wortmarke.svg

2 · Anmelden — src/themes/index.ts

   import { ${name} } from './${entwurf.id}';
   const clientThemes: BrandTheme[] = [musterkunde, ${name}];

3 · Die Schriften

   Zu jeder .woff2 gehört die gleichnamige .ttf unter public/fonts/.
   Fehlt die .ttf, sehen Fläche und SVG richtig aus — PDF und PNG nicht.

4 · Prüfen

   npm run build && npm run test

   Ein Deck stellt man mit  theme: ${entwurf.id}  im Frontmatter um.`;
}
