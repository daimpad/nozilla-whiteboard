#!/usr/bin/env node
/* ============================================================================
   nozilla Whiteboard — Schriftbibliothek

   Holt eine kuratierte Auswahl freier Schriften aus dem Repository von Google
   Fonts (https://github.com/google/fonts) und legt sie so ab, wie dieses
   Werkzeug sie lesen kann:

     public/fonts/<Familie>-<Schnitt>.ttf     für PDF und PNG (Umrisse, Einbettung)
     public/fonts/<Familie>-<Schnitt>.woff2   für den Bildschirm
     public/fonts/lizenzen/<Familie>.txt      die Lizenz jeder Familie
     src/assets/schriftbibliothek.generated.ts  der Katalog, aus dem der
                                                CI-Generator anbietet

   Warum nicht einfach die Dateien von Google übernehmen: Google liefert die
   meisten Familien nur noch als *variable* Schrift — eine Datei mit einer
   Gewichtsachse. Der TrueType-Leser dieses Projekts kennt keine
   Variationsachsen (`src/lib/text/truetype.ts`), er läse aus einer solchen
   Datei für jedes Gewicht dieselben Umrisse der Grundstellung. Auf dem
   Bildschirm stünde die Überschrift fett, im PDF in Regular — wörtlich „Der
   Bildschirm simuliert fett, die Datei nicht" aus CLAUDE.md. Geschnitten wird
   deshalb hier, einmal, zu festen Schnitten.

   Aufruf:
     node scripts/schriftbibliothek.mjs              vom aktuellen Stand von main
     node scripts/schriftbibliothek.mjs --stand <sha>   von genau diesem Stand

   Braucht Python mit fontTools (`pip install fonttools`). Das ist keine
   Abhängigkeit des Werkzeugs: ausgeliefert werden die fertigen Dateien, und
   nur wer die Bibliothek neu schneidet, braucht den Schneider.
============================================================================ */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'public', 'fonts');
const LIZENZEN = join(FONTS, 'lizenzen');
const KATALOG = join(ROOT, 'src', 'assets', 'schriftbibliothek.generated.ts');

/*
   Die vier Gewichte, die jede Familie bekommt.

   Nicht erfunden, sondern abgelesen: die Hierarchie der CI setzt Überschriften
   in 700, betonten Fließtext in 600, Fließtext in 400 und Zwischenstufen in
   500 (`typeScale` in theme.config.ts). Ein fehlendes Gewicht nimmt
   `resolveFace()` als das nächstliegende — der Bildschirm simuliert dann, die
   Datei nicht. Kursive Schnitte kommen nicht mit: fehlt einer, schert das
   Werkzeug selbst, auf dem Bildschirm wie im Export (`kursivNeigung()`).
*/
const GEWICHTE = [
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
];

/*
   Die Auswahl. `art` ist die Frage, die jemand beim Wählen stellt — eine
   Grotesk für den Fließtext, eine Antiqua für Überschriften, eine Mono für
   Code —, und nicht die Klassifikation eines Schriftenkatalogs.

   `datei` ist der Stamm der Dateinamen. Er ist eindeutig und ohne Leerzeichen,
   weil `resolveFace()` aus dem Dateinamen die Kennung eines jsPDF-Schnitts
   macht; ein Schrägstrich oder ein Leerzeichen dort ginge ungeprüft in einen
   PDF-Namen.
*/
const FAMILIEN = [
  { familie: 'IBM Plex Sans', pfad: 'ofl/ibmplexsans', art: 'sans', datei: 'IBMPlexSans' },
  { familie: 'DM Sans', pfad: 'ofl/dmsans', art: 'sans', datei: 'DMSans' },
  { familie: 'Source Sans 3', pfad: 'ofl/sourcesans3', art: 'sans', datei: 'SourceSans3' },
  { familie: 'Work Sans', pfad: 'ofl/worksans', art: 'sans', datei: 'WorkSans' },
  { familie: 'Manrope', pfad: 'ofl/manrope', art: 'sans', datei: 'Manrope' },
  { familie: 'Montserrat', pfad: 'ofl/montserrat', art: 'sans', datei: 'Montserrat' },
  { familie: 'Open Sans', pfad: 'ofl/opensans', art: 'sans', datei: 'OpenSans' },
  { familie: 'Roboto', pfad: 'ofl/roboto', art: 'sans', datei: 'Roboto' },
  { familie: 'Fira Sans', pfad: 'ofl/firasans', art: 'sans', datei: 'FiraSans' },
  { familie: 'Barlow', pfad: 'ofl/barlow', art: 'sans', datei: 'Barlow' },
  { familie: 'Nunito Sans', pfad: 'ofl/nunitosans', art: 'sans', datei: 'NunitoSans' },
  { familie: 'Source Serif 4', pfad: 'ofl/sourceserif4', art: 'serif', datei: 'SourceSerif4' },
  { familie: 'IBM Plex Serif', pfad: 'ofl/ibmplexserif', art: 'serif', datei: 'IBMPlexSerif' },
  { familie: 'Lora', pfad: 'ofl/lora', art: 'serif', datei: 'Lora' },
  { familie: 'Merriweather', pfad: 'ofl/merriweather', art: 'serif', datei: 'Merriweather' },
  {
    familie: 'Playfair Display',
    pfad: 'ofl/playfairdisplay',
    art: 'serif',
    datei: 'PlayfairDisplay',
  },
  { familie: 'Roboto Slab', pfad: 'apache/robotoslab', art: 'slab', datei: 'RobotoSlab' },
  { familie: 'IBM Plex Mono', pfad: 'ofl/ibmplexmono', art: 'mono', datei: 'IBMPlexMono' },
  { familie: 'JetBrains Mono', pfad: 'ofl/jetbrainsmono', art: 'mono', datei: 'JetBrainsMono' },
  { familie: 'Source Code Pro', pfad: 'ofl/sourcecodepro', art: 'mono', datei: 'SourceCodePro' },
];

/* -------------------------------------------------------------------------- */

const standArg = process.argv.indexOf('--stand');
const STAND = standArg > 0 ? process.argv[standArg + 1] : aktuellerStand();

function aktuellerStand() {
  /*
     Über git und nicht über die API von GitHub: die API ist aus manchen
     Netzen gesperrt, `git ls-remote` geht durch denselben Weg wie jeder Klon.
     Festgehalten wird der Stand, damit ein zweiter Lauf dieselben Dateien
     schreibt und nicht die von morgen.
  */
  const zeile = execFileSync(
    'git',
    ['ls-remote', 'https://github.com/google/fonts', 'refs/heads/main'],
    {
      encoding: 'utf8',
    },
  );
  const sha = zeile.split(/\s/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Kein Stand von google/fonts lesbar: ${zeile}`);
  return sha;
}

function roh(pfad) {
  return `https://raw.githubusercontent.com/google/fonts/${STAND}/${pfad}`;
}

async function hole(pfad) {
  const antwort = await fetch(roh(pfad));
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
  return Buffer.from(await antwort.arrayBuffer());
}

/**
 * Die Schnitte einer Familie aus ihrer METADATA.pb.
 *
 * Das Format ist Protobuf-Text; gelesen werden nur `fonts { … }`-Blöcke mit
 * Stil, Gewicht und Dateiname. Ein vollständiger Leser wäre eine Abhängigkeit
 * für drei Felder.
 */
function schnitteAus(metadata) {
  const bloecke = metadata.split(/\nfonts\s*\{/).slice(1);
  return bloecke.map((block) => ({
    stil: /style:\s*"([^"]+)"/.exec(block)?.[1],
    gewicht: Number(/weight:\s*(\d+)/.exec(block)?.[1]),
    datei: /filename:\s*"([^"]+)"/.exec(block)?.[1],
  }));
}

/* -------------------------------------------------------------------------- */
/* Schneiden                                                                   */
/* -------------------------------------------------------------------------- */

/*
   Der Schneider, in Python, weil fontTools dort zu Hause ist.

   Alle Achsen werden festgelegt und nicht nur `wght`: eine Achse, die man
   offen lässt, bleibt als `fvar` in der Datei stehen, und dann ist der Schnitt
   wieder variabel — `None` legt eine Achse auf ihre Grundstellung. Danach wird
   das Gewicht in OS/2 ausdrücklich gesetzt und nachgesehen, dass kein `fvar`
   übrig ist. Beides prüft `schriftbibliothek.test.ts` noch einmal an der
   fertigen Datei; hier bricht der Lauf ab, bevor eine falsche Datei entsteht.
*/
const SCHNEIDER = `
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

quelle, ziel, gewicht = sys.argv[1], sys.argv[2], int(sys.argv[3])
font = TTFont(quelle)
if 'fvar' in font:
    achsen = {a.axisTag: None for a in font['fvar'].axes}
    wght = next(a for a in font['fvar'].axes if a.axisTag == 'wght')
    if not (wght.minValue <= gewicht <= wght.maxValue):
        sys.exit(f'Gewicht {gewicht} liegt außerhalb {wght.minValue}–{wght.maxValue}')
    achsen['wght'] = gewicht
    try:
        font = instancer.instantiateVariableFont(font, achsen, updateFontNames=True)
    except Exception:
        font = instancer.instantiateVariableFont(font, achsen)
if 'glyf' not in font:
    sys.exit('keine glyf-Tabelle — der Umriss-Leser braucht TrueType-Konturen')
if 'fvar' in font:
    sys.exit('nach dem Schneiden noch variabel')
font['OS/2'].usWeightClass = gewicht
font.save(ziel)
`;

function pruefeSchneider() {
  try {
    execFileSync('python3', ['-c', 'import fontTools.varLib.instancer'], { stdio: 'pipe' });
  } catch {
    console.error(
      '✗ Python mit fontTools fehlt.\n' +
        '  pip install fonttools\n' +
        '  (oder PYTHONPATH auf ein Verzeichnis mit fontTools setzen)',
    );
    process.exit(1);
  }
}

function schneide(quelle, ziel, gewicht) {
  execFileSync('python3', ['-c', SCHNEIDER, quelle, ziel, String(gewicht)], { stdio: 'pipe' });
}

async function woff2(ttf) {
  const { compress } = await import('wawoff2');
  return Buffer.from(await compress(ttf));
}

/* -------------------------------------------------------------------------- */

pruefeSchneider();
mkdirSync(LIZENZEN, { recursive: true });
const werkbank = mkdtempSync(join(tmpdir(), 'schriftbibliothek-'));

console.log(`Schriftbibliothek aus google/fonts @ ${STAND.slice(0, 7)}`);

const katalog = [];
let ttfSumme = 0;
let woff2Summe = 0;

for (const eintrag of FAMILIEN) {
  const metadata = (await hole(`${eintrag.pfad}/METADATA.pb`)).toString('utf8');
  const schnitte = schnitteAus(metadata).filter((s) => s.stil === 'normal' && s.datei);
  const variabel = schnitte.find((s) => s.datei.includes('['));

  const geschrieben = [];
  for (const [gewicht, name] of GEWICHTE) {
    const quellDatei = variabel ?? schnitte.find((s) => s.gewicht === gewicht);
    if (!quellDatei) throw new Error(`${eintrag.familie}: kein Schnitt in ${gewicht}`);

    const lokal = join(werkbank, quellDatei.datei);
    if (!existsSync(lokal)) writeFileSync(lokal, await hole(`${eintrag.pfad}/${quellDatei.datei}`));

    const stamm = `${eintrag.datei}-${name}`;
    const ttfPfad = join(FONTS, `${stamm}.ttf`);
    schneide(lokal, ttfPfad, gewicht);

    const ttf = readFileSync(ttfPfad);
    const w2 = await woff2(ttf);
    writeFileSync(join(FONTS, `${stamm}.woff2`), w2);
    ttfSumme += ttf.length;
    woff2Summe += w2.length;
    geschrieben.push({ weight: gewicht, file: `${stamm}.woff2` });
  }

  const lizenzDatei = eintrag.pfad.startsWith('apache/') ? 'LICENSE.txt' : 'OFL.txt';
  writeFileSync(
    join(LIZENZEN, `${eintrag.datei}.txt`),
    await hole(`${eintrag.pfad}/${lizenzDatei}`),
  );

  katalog.push({
    familie: eintrag.familie,
    art: eintrag.art,
    lizenz: eintrag.pfad.startsWith('apache/') ? 'Apache-2.0' : 'OFL-1.1',
    schnitte: geschrieben,
  });
  console.log(
    `  ${eintrag.familie.padEnd(18)} ${variabel ? 'variabel → geschnitten' : 'feste Schnitte'}`,
  );
}

const kopf = `/* ERZEUGT von scripts/schriftbibliothek.mjs — nicht von Hand ändern.
   Quelle: google/fonts @ ${STAND}
   ${katalog.length} Familien, je ${GEWICHTE.length} Schnitte, TTF + WOFF2 unter public/fonts/. */`;

const rumpf = katalog
  .map(
    (f) => `  {
    familie: ${JSON.stringify(f.familie)},
    art: ${JSON.stringify(f.art)},
    lizenz: ${JSON.stringify(f.lizenz)},
    schnitte: [
${f.schnitte.map((s) => `      { weight: ${s.weight}, file: ${JSON.stringify(s.file)} },`).join('\n')}
    ],
  },`,
  )
  .join('\n');

writeFileSync(
  KATALOG,
  `${kopf}
import type { Bibliotheksfamilie } from './schriftbibliothek';

export const bibliothek: readonly Bibliotheksfamilie[] = [
${rumpf}
];
`,
);

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(
  `\n${katalog.length} Familien · ${katalog.length * GEWICHTE.length} Schnitte · ` +
    `TTF ${mb(ttfSumme)} + WOFF2 ${mb(woff2Summe)} = ${mb(ttfSumme + woff2Summe)}`,
);
