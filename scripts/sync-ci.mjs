#!/usr/bin/env node
/* ============================================================================
   nozilla Whiteboard — CI-Sync

   Übernimmt Schriften, Marken-Grafiken und das Icon-Set aus dem CI-Repo
   (https://github.com/daimpad/nozilla-ci) in dieses Projekt:

     public/fonts/                 Zilla Slab · Inter · Space Mono als WOFF2 (SIL OFL)
     public/brand/                 Wortmarke, Favicon, Social Preview
     src/assets/icons.generated.ts 462 Icons, Dialekt A, als Primitive

   Warum generieren statt kopieren: die Icon-Geometrien liegen im CI-Repo als
   SVG-Fragmente. Dieses Projekt zeichnet dieselbe Geometrie in drei Ausgaben
   (Canvas, SVG-Export, PDF-Export) und braucht sie deshalb strukturiert, nicht
   als Markup-Blob. Der Generator ist die einzige Stelle, an der übersetzt wird
   — und er erzwingt dabei dieselben CI-Regeln wie der Build im CI-Repo.

   Aufruf:
     node scripts/sync-ci.mjs [pfad/zum/nozilla-ci]
     node scripts/sync-ci.mjs --check      nur prüfen, nichts schreiben
============================================================================ */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');
const CI_ROOT =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ??
  process.env.NOZILLA_CI ??
  firstExisting([
    join(ROOT, '..', 'nozilla-ci'),
    '/workspace/daimpad/nozilla-ci',
    '/workspace/nozilla-ci',
  ]);

function firstExisting(candidates) {
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

if (!existsSync(join(CI_ROOT, 'scripts', 'icons'))) {
  console.error(
    `✗ CI-Repo nicht gefunden unter ${CI_ROOT}\n` +
      `  git clone https://github.com/daimpad/nozilla-ci\n` +
      `  node scripts/sync-ci.mjs <pfad>`,
  );
  process.exit(1);
}

const problems = [];
const note = (message) => console.log(`  ${message}`);

/** Die einzigen beiden Farben, die in CI-Geometrie vorkommen dürfen. */
const INK_HEX = '#000000';
const SIGNAL_HEX = '#00FF9C';

/* -------------------------------------------------------------------------- */
/* 1 · Schriften                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Im CI-Repo liegen die Schriften als TTF (dort werden sie auch für PDF- und
 * Druckwege gebraucht). Im Browser ist TTF die falsche Verpackung: dieselben
 * Konturen sind als WOFF2 rund 70 % kleiner, weil das Format die
 * Glyphen-Tabellen vorverarbeitet und mit Brotli komprimiert. Deshalb wandelt
 * der Sync beim Übernehmen um und legt nur die WOFF2-Dateien ins `public/`.
 */
const FONT_FILES = [
  'ZillaSlab-Medium.ttf',
  'ZillaSlab-SemiBold.ttf',
  'ZillaSlab-Bold.ttf',
  'Inter-Regular.ttf',
  'Inter-Medium.ttf',
  'Inter-SemiBold.ttf',
  'Inter-Bold.ttf',
  'SpaceMono-Regular.ttf',
  'SpaceMono-Bold.ttf',
];
const LICENCE_FILES = ['OFL.txt'];

console.log('nozilla CI-Sync');
console.log(`  Quelle: ${CI_ROOT}\n`);

console.log('Schriften');
const fontsOut = join(ROOT, 'public', 'fonts');
if (!CHECK_ONLY) mkdirSync(fontsOut, { recursive: true });

let ttfBytes = 0;
let woff2Bytes = 0;
for (const file of FONT_FILES) {
  const from = join(CI_ROOT, 'project', 'fonts', file);
  if (!existsSync(from)) {
    problems.push(`Schrift fehlt im CI-Repo: ${file}`);
    continue;
  }
  const ttf = readFileSync(from);
  ttfBytes += ttf.length;
  const woff2 = await compressToWoff2(ttf, file);
  woff2Bytes += woff2.length;
  if (!CHECK_ONLY) writeFileSync(join(fontsOut, file.replace(/\.ttf$/, '.woff2')), woff2);
}
for (const file of LICENCE_FILES) {
  const from = join(CI_ROOT, 'project', 'fonts', file);
  if (!existsSync(from)) {
    problems.push(`Schrift fehlt im CI-Repo: ${file}`);
    continue;
  }
  if (!CHECK_ONLY) copyFileSync(from, join(fontsOut, file));
}
note(
  `${FONT_FILES.length} Schnitte als WOFF2 → public/fonts/ ` +
    `(${kb(ttfBytes)} TTF → ${kb(woff2Bytes)}, −${Math.round((1 - woff2Bytes / ttfBytes) * 100)} %)`,
);

async function compressToWoff2(ttf, label) {
  const { compress } = await import('wawoff2');
  const out = await compress(ttf);
  // wawoff2 gibt je nach Version Buffer oder Uint8Array zurück.
  const bytes = Buffer.isBuffer(out) ? out : Buffer.from(out);
  if (bytes.length < 1024 || bytes.subarray(0, 4).toString('latin1') !== 'wOF2') {
    problems.push(`WOFF2-Umwandlung fehlgeschlagen: ${label}`);
  }
  return bytes;
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} kB`;
}

/* -------------------------------------------------------------------------- */
/* 2 · Marken-Grafiken                                                         */
/* -------------------------------------------------------------------------- */

const BRAND_FILES = [
  'nozilla-logo.svg',
  'nozilla-logo-invers.svg',
  'nozilla-logo-mono.svg',
  'favicon.svg',
  'favicon-32.png',
  'favicon-180.png',
  'og-image.png',
];

console.log('Marken-Grafiken');
const brandOut = join(ROOT, 'public', 'brand');
if (!CHECK_ONLY) mkdirSync(brandOut, { recursive: true });
for (const file of BRAND_FILES) {
  const from = join(CI_ROOT, 'project', 'assets', file);
  if (!existsSync(from)) {
    problems.push(`Marken-Grafik fehlt im CI-Repo: ${file}`);
    continue;
  }
  if (!CHECK_ONLY) copyFileSync(from, join(brandOut, file));
}
note(`${BRAND_FILES.length} Dateien → public/brand/`);

/* -------------------------------------------------------------------------- */
/* 3 · Wortmarke als Vektor                                                    */
/* -------------------------------------------------------------------------- */

/*
   Die Wortmarke wird nicht als Bild eingebunden, sondern als Pfad übernommen.
   Nur so landet sie in SVG *und* PDF als echter Vektor, ohne dass der Export
   eine externe Datei nachladen muss. Sie besteht aus genau zwei Pfaden: den
   Buchstaben und dem grünen Punkt.
*/
console.log('Wortmarke');
const logoSvg = readFileSync(join(CI_ROOT, 'project', 'assets', 'nozilla-logo.svg'), 'utf8');
const viewBox = /viewBox="([^"]+)"/.exec(logoSvg)?.[1].trim().split(/\s+/).map(Number);
if (!viewBox || viewBox.length !== 4) problems.push('Wortmarke: viewBox nicht lesbar');

const logoPaths = [...logoSvg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map((match) => ({
  d: match[1].replace(/\s+/g, ' ').trim(),
  fill: /fill="([^"]+)"/.exec(match[0])?.[1],
}));
const inkPath = logoPaths.find((path) => path.fill === INK_HEX);
const signalPath = logoPaths.find((path) => path.fill === SIGNAL_HEX);
if (!inkPath || !signalPath)
  problems.push('Wortmarke: erwartet je einen Tinte- und einen Signal-Pfad');
note('2 Pfade → src/assets/wordmark.generated.ts');

/* -------------------------------------------------------------------------- */
/* 4 · Icons                                                                   */
/* -------------------------------------------------------------------------- */

console.log('Icons');

const iconDir = join(CI_ROOT, 'scripts', 'icons');
const partFiles = readdirSync(iconDir)
  .filter((file) => /^\d+-.*\.mjs$/.test(file))
  .sort();

const icons = [];
for (const file of partFiles) {
  const module = await import(pathToFileURL(join(iconDir, file)).href);
  for (const icon of module.default) icons.push({ ...icon, part: file });
}

/** Der grüne Signaturpunkt, den der CI-Build jedem Icon anhängt. */
const SIGNATURE = { t: 'rect', x: 54, y: 54, w: 6, h: 6, fill: 'signal' };

/**
 * Ein SVG-Fragment aus dem CI-Repo in Primitive übersetzen.
 * Der Attributsatz ist klein und geschlossen (path/circle/ellipse/rect plus
 * fill, transform, stroke-width, stroke-dasharray, stroke) — deshalb reicht
 * ein Tokenizer; ein XML-Parser wäre hier nur Ballast.
 */
function parseGeometry(name, markup) {
  const prims = [];
  const elementRe = /<(path|circle|ellipse|rect)\b([^>]*)\/?>/g;

  for (const match of markup.matchAll(elementRe)) {
    const [, tag, rawAttrs] = match;
    const attrs = {};
    for (const attr of rawAttrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }

    const paint = {};
    if (attrs.fill && attrs.fill !== 'none') {
      if (attrs.fill === SIGNAL_HEX) paint.fill = 'signal';
      else if (attrs.fill === INK_HEX) paint.fill = 'ink';
      else problems.push(`Farbe außerhalb des CI: ${attrs.fill} in ${name}`);
    }
    if (attrs.stroke && attrs.stroke !== 'none') {
      if (attrs.stroke === SIGNAL_HEX) paint.stroke = 'signal';
      else if (attrs.stroke !== INK_HEX) {
        problems.push(`Strichfarbe außerhalb des CI: ${attrs.stroke} in ${name}`);
      }
    }
    if (attrs['stroke-width']) paint.sw = Number(attrs['stroke-width']);
    if (attrs['stroke-dasharray']) {
      paint.dash = attrs['stroke-dasharray']
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    }
    if (attrs.transform) {
      const rotate = /rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(attrs.transform);
      if (rotate) {
        paint.rotate = [Number(rotate[1]), Number(rotate[2]), Number(rotate[3])];
      } else {
        problems.push(`Unbekannte Transformation in ${name}: ${attrs.transform}`);
      }
    }

    switch (tag) {
      case 'path':
        prims.push({ t: 'path', d: attrs.d.replace(/\s+/g, ' ').trim(), ...paint });
        break;
      case 'circle':
        prims.push({ t: 'circle', cx: +attrs.cx, cy: +attrs.cy, r: +attrs.r, ...paint });
        break;
      case 'ellipse':
        prims.push({
          t: 'ellipse',
          cx: +attrs.cx,
          cy: +attrs.cy,
          rx: +attrs.rx,
          ry: +attrs.ry,
          ...paint,
        });
        break;
      case 'rect':
        if (attrs.rx || attrs.ry) problems.push(`Abgerundetes Rechteck verboten: ${name}`);
        prims.push({
          t: 'rect',
          x: +attrs.x,
          y: +attrs.y,
          w: +attrs.width,
          h: +attrs.height,
          ...paint,
        });
        break;
    }
  }

  if (prims.length === 0) problems.push(`Geometrie leer: ${name}`);
  return prims;
}

const seen = new Set();
const entries = [];
const categories = new Map();

for (const icon of icons) {
  if (seen.has(icon.n)) problems.push(`Name doppelt vergeben: ${icon.n}`);
  seen.add(icon.n);

  if (/stroke-line(?:cap|join)="round"/.test(icon.g)) {
    problems.push(`Runde Enden verboten: ${icon.n}`);
  }
  if (/gradient|filter=|blur/i.test(icon.g)) {
    problems.push(`Verlauf oder Filter verboten: ${icon.n}`);
  }

  const prims = parseGeometry(icon.n, icon.g);
  const [label, meaning] = icon.de.split(' — ');
  entries.push({
    name: icon.n,
    label: label.trim(),
    meaning: (meaning ?? '').trim(),
    category: icon.c,
    prims: [...prims, SIGNATURE],
  });
  categories.set(icon.c, (categories.get(icon.c) ?? 0) + 1);
}

note(`${entries.length} Icons in ${categories.size} Kategorien`);

/* -------------------------------------------------------------------------- */
/* 4 · Schreiben                                                               */
/* -------------------------------------------------------------------------- */

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} CI-Verstoß/Verstöße\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log('\n✓ Prüfung bestanden (nichts geschrieben)');
  process.exit(0);
}

const sortedCategories = [...categories.keys()].sort();
const header = `/**
 * GENERIERT — nicht von Hand bearbeiten.
 *
 * Quelle:  https://github.com/daimpad/nozilla-ci  ·  scripts/icons/*.mjs
 * Neu bauen: node scripts/sync-ci.mjs [pfad/zum/nozilla-ci]
 *
 * Dialekt A — Heavy-Stroke: 64 × 64 Raster, 4 px, square caps, miter joins.
 * Jedes Icon trägt unten rechts die 6 × 6 Signal-Grün-Signatur des Sets.
 */
import type { IconPrim } from './iconTypes';

export interface GeneratedIcon {
  /** Font-Awesome-Name — der Schlüssel des Sets. */
  label: string;
  meaning: string;
  category: IconCategory;
  prims: IconPrim[];
}

export const iconCategories = ${JSON.stringify(sortedCategories, null, 2)
  .replace(/"/g, "'")
  .replace(/\n/g, '\n')} as const;

export type IconCategory = (typeof iconCategories)[number];

export const generatedIcons = {
`;

const body = entries
  .map((entry) => {
    const prims = entry.prims.map((prim) => JSON.stringify(prim)).join(', ');
    return `  ${JSON.stringify(entry.name)}: { label: ${JSON.stringify(entry.label)}, meaning: ${JSON.stringify(
      entry.meaning,
    )}, category: ${JSON.stringify(entry.category)}, prims: [${prims}] },`;
  })
  .join('\n');

const footer = `
} as const satisfies Record<string, GeneratedIcon>;

export type GeneratedIconName = keyof typeof generatedIcons;
`;

writeFileSync(
  join(ROOT, 'src', 'assets', 'wordmark.generated.ts'),
  `/**
 * GENERIERT — nicht von Hand bearbeiten.
 * Quelle: https://github.com/daimpad/nozilla-ci · project/assets/nozilla-logo.svg
 * Neu bauen: node scripts/sync-ci.mjs
 *
 * Die Wortmarke ist das einzige Logo. Sie wird nie gedreht, nie umgefärbt, nie
 * verzerrt und trägt nie einen Schatten — siehe CI, Abschnitt „Logo".
 */
export const wordmark = {
  viewBox: [${viewBox.join(', ')}] as const,
  /** Die Buchstaben. Nimmt die Tintenfarbe der Fläche an. */
  letters: ${JSON.stringify(inkPath?.d ?? '')},
  /** Der Punkt am Wortende. Immer Signal-Grün. */
  period: ${JSON.stringify(signalPath?.d ?? '')},
} as const;
`,
);
note('→ src/assets/wordmark.generated.ts');

const outFile = join(ROOT, 'src', 'assets', 'icons.generated.ts');
writeFileSync(outFile, header + body + footer);
note(`→ src/assets/icons.generated.ts (${((header + body + footer).length / 1024).toFixed(0)} kB)`);

console.log('\n✓ CI-Sync abgeschlossen');
