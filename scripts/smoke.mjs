/**
 * Der Rauchtest der Oberfläche.
 *
 * ## Warum es ihn gibt
 *
 * Die rund 3700 Unit-Tests prüfen, was das Werkzeug *herstellt* — Szene, Markup,
 * PDF, PPTX. Sie prüfen nicht, ob man es *bedienen* kann. Der Unterschied ist
 * nicht theoretisch: die vier Fehler, die zuletzt gefunden wurden, waren alle
 * grün.
 *
 *   • Icon-Kacheln blieben leer, weil das letzte Primitiv gestrichen wurde.
 *   • Eine Überschrift lief aus ihrem Kasten, weil die Schrift breiter läuft.
 *   • Die Bausteinvorschau war schwarz auf dunkelgrau.
 *   • Der Marker im PPTX blieb grün, während die Folie orange war.
 *
 * Jeder davon ist im Bild aufgefallen, keiner in einem Test. Was hier steht,
 * ist der Versuch, diese Klasse einzufangen: nicht jede Regung der Oberfläche,
 * sondern die Handgriffe, ohne die das Werkzeug nichts taugt.
 *
 * ## Was er prüft
 *
 * Geladen, gezeichnet, umgeschaltet, eingesetzt, vorgetragen, exportiert — und
 * dabei kein Fehler in der Konsole. Der Vortrag steht dabei nicht aus
 * Vollständigkeit in der Liste: er ist der einzige Bildschirm, den das Publikum
 * sieht, und war der letzte, den niemand prüfte — er blieb englisch, während
 * neun Prüfungen grün waren. Geprüft wird gegen `vite preview`, also gegen das
 * gebaute Verzeichnis und nicht gegen den Entwicklungsserver: bereitgestellt
 * wird das Gebaute.
 *
 * ## Ausführen
 *
 *     npm run build && npm run test:ui
 *
 * Chromium holt sich Playwright selbst (`npx playwright install chromium`).
 * Steht schon eines bereit, sagt man es über `SMOKE_CHROMIUM`.
 */
import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;

/* -------------------------------------------------------------------------- */
/* Prüfgerüst — klein genug, dass es keine Bibliothek braucht                   */
/* -------------------------------------------------------------------------- */

const ergebnisse = [];

async function pruefe(name, fn) {
  try {
    await fn();
    ergebnisse.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    ergebnisse.push({ name, ok: false, error });
    console.log(`  ✗ ${name}\n      ${String(error).split('\n')[0]}`);
  }
}

function gleich(ist, soll, was) {
  if (ist !== soll) throw new Error(`${was}: ${JSON.stringify(ist)} statt ${JSON.stringify(soll)}`);
}

function wahr(bedingung, was) {
  if (!bedingung) throw new Error(was);
}

/* -------------------------------------------------------------------------- */
/* Warten — auf eine Bedingung und nicht auf die Uhr                            */
/* -------------------------------------------------------------------------- */

/**
 * Warten, bis etwas eintritt.
 *
 * Eine feste Pause ist immer zugleich zu lang und zu kurz: auf einem
 * ausgelasteten Rechner reicht sie nicht und der Test wird wackelig, auf einem
 * leeren ist sie verschenkte Zeit. Gemessen wurden 167 solcher Pausen mit
 * zusammen 135 Sekunden — drei Viertel der Laufzeit dieses Rauchtests, in dem
 * gar nichts geschah.
 *
 * Der Rückgabewert ist der erste *wahrhaftige* Wert, damit sich das Ergebnis
 * gleich weiterverwenden lässt. Der letzte Fehler wird mitgenannt: „nach 15 s
 * nicht eingetreten" allein sagt nichts darüber, woran es lag.
 */
async function bis(fn, was, frist = 15000) {
  const ende = Date.now() + frist;
  let letzter;
  for (;;) {
    try {
      const wert = await fn();
      if (wert) return wert;
      letzter = undefined;
    } catch (fehler) {
      letzter = fehler;
    }
    if (Date.now() > ende) {
      throw new Error(
        `${was} — nach ${frist} ms nicht eingetreten${letzter ? `: ${String(letzter).split('\n')[0]}` : ''}`,
      );
    }
    await new Promise((weiter) => setTimeout(weiter, 40));
  }
}

/**
 * Warten, bis `fn()` `soll` liefert — und sonst klagen wie `gleich()`.
 *
 * Die Zusicherung *ist* die Bedingung. Das ist der Kern der Umstellung: „warte
 * 400 ms, dann muss im Feld ‚Handgeschrieben' stehen" und „warte, bis im Feld
 * ‚Handgeschrieben' steht" prüfen dasselbe — nur ist das Zweite schneller,
 * wenn es stimmt, und genauso laut, wenn nicht. Die Meldung am Ende ist
 * wortgleich die alte, samt dem zuletzt gelesenen Wert.
 */
async function bisGleich(fn, soll, was, frist = 15000) {
  const ende = Date.now() + frist;
  for (;;) {
    const ist = await fn();
    if (ist === soll) return ist;
    if (Date.now() > ende) gleich(ist, soll, was);
    await new Promise((weiter) => setTimeout(weiter, 40));
  }
}

/** Warten, bis `fn()` wahr wird — und sonst klagen wie `wahr()`. */
async function bisWahr(fn, was, frist = 15000) {
  const ende = Date.now() + frist;
  for (;;) {
    const ist = await fn();
    if (ist) return ist;
    // Die Meldung darf eine Funktion sein: dann kann sie nennen, was zuletzt
    // dastand — „nicht eingetreten" allein sagt nichts darüber, woran es lag.
    if (Date.now() > ende) wahr(ist, typeof was === 'function' ? was() : was);
    await new Promise((weiter) => setTimeout(weiter, 40));
  }
}

/**
 * Warten, bis die Marken-Schriften da sind und die Fläche mit ihnen gezeichnet
 * hat.
 *
 * Beides ist nötig, und das steht auch im Kopf von `src/theme/fonts.ts`: ein
 * `@font-face` allein lädt nichts, und ohne Zustandsänderung zeichnet React
 * nicht neu. Gefragt wird deshalb `document.fonts.check()` — das ist wahr,
 * sobald ein Schnitt wirklich benutzbar ist — und danach werden zwei
 * Bildrahmen abgewartet, denn `announce()` zählt seinen Zähler erst nach
 * `document.fonts.ready` hoch.
 *
 * Hier stand eine Pause von 2500 ms mit demselben Kommentar. Sie war auf einem
 * warmen Zwischenspeicher um zwei Sekunden zu lang und auf einem kalten
 * Rechner womöglich zu kurz — die Pause weiß es nicht, die Bedingung schon.
 */
async function warteAufSchriften(seite) {
  await seite.waitForFunction(
    () =>
      ['700 68px "Zilla Slab"', '400 16px "Inter"', '700 12px "Space Mono"'].every((schnitt) =>
        document.fonts.check(schnitt),
      ),
    null,
    { timeout: 20000 },
  );
  await seite.evaluate(
    () =>
      new Promise((weiter) => requestAnimationFrame(() => requestAnimationFrame(() => weiter()))),
  );
}

/**
 * Nach einem Wechsel des Erscheinungsbilds zur Ruhe kommen lassen.
 *
 * Das ist die eine Stelle, an der eine feste Wartezeit richtig ist — und sie
 * hat eine Zahl aus dem Code, keine geratene: `loadFaces()` in
 * `src/theme/fonts.ts` zählt seinen Zähler ein **zweites** Mal hoch, wenn die
 * Notbremse nach 2000 ms greift, und an diesem Zähler hängt ein Neuzeichnen.
 * Ein Wechsel des Erscheinungsbilds fordert die Schnitte der neuen Marke an,
 * also läuft diese Uhr danach wieder.
 *
 * Wer das nicht abwartet, misst zwei Stände. Aufgefallen ist es an der Prüfung
 * gleich danach — „die dunkle Erscheinung lässt die Folie in Ruhe" nahm ihr
 * „vorher" vor der Notbremse und ihr „nachher" danach und meldete eine
 * Änderung, die nicht die dunkle Erscheinung gemacht hatte. Einmal in fünf
 * Läufen; die alte Fassung kam mit 1200 + 800 ms zufällig gerade darüber.
 *
 * Eine Bedingung gäbe es dafür nicht: „die Fläche zeichnet gleich noch einmal"
 * ist von außen nicht zu sehen, und ein Ruhefenster, das kürzer ist als die
 * Notbremse, erklärt die Fläche für ruhig, während die Uhr noch läuft.
 */
async function nachDemWechsel(seite) {
  await seite.waitForTimeout(2200);
}

/**
 * Den CI-Generator öffnen und warten, bis er wirklich dasteht.
 *
 * Sechzehnmal stand hier dieselbe Folge: eine neue Seite, `goto`, und danach
 * eine feste Pause von 2200 ms — zusammen 35 der 186 Sekunden dieses
 * Rauchtests. Gewartet wurde dabei auf zweierlei: dass die Seite gezeichnet
 * ist, und dass die Marken-Schriften da sind, denn die Vorschau zeichnet eine
 * echte Folie und misst gegen die echte Schrift.
 *
 * Beides lässt sich fragen. Die Seite steht, wenn die Schrittleiste da ist —
 * sie ist das erste, was der Generator zeichnet, und ohne sie ginge ohnehin
 * kein Handgriff. Die Schriften erledigt `warteAufSchriften()`.
 *
 * `vorhanden` gibt es für die zwei Stellen, die ihre Seite selbst anlegen
 * müssen: eine hängt vorher einen Fehlerhorcher ein, die andere setzt die
 * Fenstergröße — beides muss vor dem `goto` geschehen.
 */
async function oeffneGenerator(kontext, vorhanden) {
  const generator = vorhanden ?? (await kontext.newPage());
  await generator.goto(`${URL}ci.html`, { waitUntil: 'networkidle' });
  await generator.getByRole('tablist').waitFor({ timeout: 20000 });
  await warteAufSchriften(generator);
  return generator;
}

/**
 * Einen Schritt des CI-Generators öffnen.
 *
 * Über den Schrittbalken und nicht über einen Zustand im Code: das ist der Weg,
 * den ein Mensch nimmt, und damit zugleich die Prüfung, dass der Balken
 * umschaltet. Bliebe er stehen, fände der nächste Handgriff sein Feld nicht.
 */
async function zumSchritt(seite, titel) {
  // Über den ausgesprochenen Namen und nicht über den Aufdruck: „Marke" steckt
  // in „Wortmarke", und die Zahl der offenen Befunde stünde mit im Aufdruck.
  const tab = reiter(seite, titel);
  await tab.click();
  // Der Reiter sagt selbst, ob er dran ist. Hier standen 250 ms, und diese
  // Funktion wird vierunddreißigmal gerufen.
  await bisGleich(() => tab.getAttribute('aria-selected'), 'true', `Schritt „${titel}" kam nicht`);
}

/** Der Reiter eines Schritts. */
function reiter(seite, titel) {
  return seite
    .getByRole('tablist', { name: 'Schritte' })
    .getByRole('tab', { name: new RegExp(`^Schritt \\d+: ${titel}(,|$)`) });
}

/**
 * Die Kennung des Hex-Felds einer Palettenrolle.
 *
 * Die Felder tragen `useId()`-Kennungen, also nichts Vorhersagbares. Gesucht
 * wird deshalb über die Beschriftung, die die Rolle beim Namen nennt.
 */
async function farbfeldId(seite, rolle) {
  return seite.evaluate((name) => {
    const label = [...document.querySelectorAll('label')].find((element) =>
      element.textContent?.trim().startsWith(`${name} `),
    );
    if (!label) throw new Error(`kein Feld für die Rolle ${name}`);
    return label.htmlFor;
  }, rolle);
}

/**
 * Eine Palettenrolle setzen — über das Hex-Feld.
 *
 * Ein `input[type=color]` lässt sich nicht fernsteuern; das Hex-Feld daneben
 * ist genau deshalb da. Gesetzt wird über den nativen Setter, damit React die
 * Änderung sieht, und danach kommt ein `change` — das Feld räumt beim Verlassen
 * auf, nicht beim Tippen.
 */
async function setzeFarbe(seite, rolle, wert) {
  const id = await farbfeldId(seite, rolle);
  await seite.evaluate(
    ([kennung, farbe]) => {
      const feld = document.getElementById(kennung);
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      setter.call(feld, farbe);
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      // React hängt `onBlur` an das native `focusout` — ein `blur` steigt
      // nicht auf und käme am Wurzelknoten nie an.
      feld.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    },
    [id, wert],
  );
  await seite.waitForTimeout(150);
}

/** Die vier Zahlenfelder des Inspektors: x, y, Breite, Höhe. */
async function masse(seite) {
  await seite.getByRole('button', { name: 'Element', exact: true }).click();
  // Gewartet wird, bis vier Zahlen dastehen — und zwar Zahlen: ein Feld, das
  // noch leer ist, ergäbe `NaN` und eine Meldung über eine falsche Kante,
  // während in Wirklichkeit nur der Inspektor noch nicht so weit war.
  let zuletzt = null;
  return bisWahr(
    async () => {
      zuletzt = await seite.evaluate(() =>
        [...document.querySelectorAll('aside[aria-label="Inspektor"] input')]
          .slice(0, 4)
          .map((el) => el.value),
      );
      const werte = zuletzt.map(Number);
      return werte.length === 4 && werte.every(Number.isFinite) ? werte : null;
    },
    () => `der Inspektor zeigte keine vier Maße, sondern ${JSON.stringify(zuletzt)}`,
  );
}

/**
 * Auf eine leere Stelle der Folie klicken — um ein Feld zu verlassen.
 *
 * Ausdrücklich `.nz-stage` und nicht „das letzte SVG der Seite". Das war der
 * erste Griff, und er traf ein Zeichen im Filmstreifen: 92 % seiner Breite
 * lagen auf dem Knopf „Folie danach einfügen". Die Prüfung legte damit eine
 * Folie an, stand danach auf einer leeren und suchte dort einen Text, den sie
 * auf der vorigen geschrieben hatte.
 */
async function klickeLeereFolie(seite) {
  const kasten = await seite.locator('.nz-stage').boundingBox();
  await seite.mouse.click(kasten.x + kasten.width * 0.9, kasten.y + kasten.height * 0.9);
  // Wozu diese Funktion da ist, steht in ihrem Titel: aus einem Feld heraus.
  // Genau das ist auch die Bedingung — und sie hängt nicht daran, welche
  // Leiste gerade offen steht.
  await bisWahr(
    () => seite.evaluate(() => !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)),
    'der Zeiger blieb im Feld',
  );
}

/** Steht dieser Text auf der Folie? Gefragt wird das Bild, nicht das Feld. */
async function stehtAufFolie(seite, text) {
  return seite.evaluate((gesucht) => {
    let folie = null;
    for (const svg of document.querySelectorAll('svg')) {
      const box = svg.getBoundingClientRect();
      if (!folie || box.width * box.height > folie.flaeche) {
        folie = { flaeche: box.width * box.height, svg };
      }
    }
    if (!folie) return false;
    return [...folie.svg.querySelectorAll('text')].some((el) =>
      (el.textContent ?? '').includes(gesucht),
    );
  }, text);
}

/* -------------------------------------------------------------------------- */
/* Der Server                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `npx` ist nur der Bote: es startet `vite` als eigenes Kind und reicht das
 * Signal nicht weiter. Ein `server.kill()` erschlägt deshalb den Boten, und
 * der Server läuft weiter — mit offenen Rohren, an denen Nodes Ereignisschleife
 * hängenbleibt. Der Rauchtest lief so einmal durch, meldete neun von neun und
 * beendete sich nie; in der CI stand der Schritt fast eine Stunde.
 *
 * Deshalb eine eigene Prozessgruppe (`detached`) und ein Signal an die ganze
 * Gruppe (`-pid`).
 */
async function starteVorschau() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  for (let versuch = 0; versuch < 60; versuch += 1) {
    try {
      const antwort = await fetch(URL);
      if (antwort.ok) return server;
    } catch {
      // Noch nicht da.
    }
    await new Promise((fertig) => setTimeout(fertig, 500));
  }
  beende(server);
  throw new Error(`vite preview antwortet nicht auf ${URL} — wurde vorher gebaut?`);
}

function beende(server) {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // Schon tot, oder es gab nie eine Gruppe.
  }
}

/* -------------------------------------------------------------------------- */
/* Die Prüfungen                                                               */
/* -------------------------------------------------------------------------- */

/** Das größte SVG der Seite ist die Folie. */
const FOLIE = () => {
  let groesstes = null;
  for (const svg of document.querySelectorAll('svg')) {
    const box = svg.getBoundingClientRect();
    if (!groesstes || box.width * box.height > groesstes.flaeche) {
      groesstes = { flaeche: box.width * box.height, markup: svg.innerHTML };
    }
  }
  return groesstes;
};

/**
 * Geprüft wird das gebaute Verzeichnis — und genau daran hängt eine Falle, in
 * die dieser Rauchtest schon getappt ist.
 *
 * Beim Gegenprüfen einer Prüfung wurde eine Zeile in `App.tsx` auskommentiert.
 * Damit war ein Import ungenutzt, `tsc` brach ab, `vite build` lief nie — und
 * `dist/` blieb, wie es war. Der Rauchtest meldete fünfzehn von fünfzehn und
 * bestätigte damit den Stand *vor* der Änderung. Eine grüne Zahl, die nichts
 * über den Code aussagt, ist schlimmer als eine rote.
 */
function pruefeStand() {
  const juengstes = (dir) =>
    readdirSync(dir, { withFileTypes: true }).reduce((neuestes, eintrag) => {
      const pfad = join(dir, eintrag.name);
      const zeit = eintrag.isDirectory() ? juengstes(pfad) : statSync(pfad).mtimeMs;
      return Math.max(neuestes, zeit);
    }, 0);

  let gebaut;
  try {
    gebaut = juengstes('dist');
  } catch {
    throw new Error('Es gibt kein dist/ — erst `npm run build`.');
  }
  /*
     Die beiden Einstiegsseiten liegen weder in `src/` noch in
     `theme.config.ts` — wer nur an `ci.html` ändert und den Bau auslässt,
     bekäme sonst eine fröhliche grüne Zahl über den vorigen Stand. Genau die
     Falle, gegen die diese Funktion überhaupt gebaut wurde.
  */
  const geschrieben = Math.max(
    juengstes('src'),
    ...['theme.config.ts', 'index.html', 'ci.html'].map((datei) => statSync(datei).mtimeMs),
  );
  if (geschrieben > gebaut) {
    throw new Error(
      'dist/ ist älter als src/ — der Rauchtest liefe gegen den vorigen Stand. Erst `npm run build`.',
    );
  }
}

/**
 * Was im Bauwerk liegt, muss auch geholt werden.
 *
 * jsPDF lädt `canvg` und `html2canvas` im Rumpf über einen dynamischen Import
 * nach — für `doc.svg()` und `doc.html()`, also für die beiden Wege, ein PDF
 * aus einem *Dokument* zu machen. Dieses Werkzeug macht seines aus der `Scene`
 * und ruft keinen von beiden; Rollup sah die Ausdrücke trotzdem und legte zwei
 * Lazy-Chunks an: 202 kB und 160 kB, die ausgeliefert werden und die kein
 * Browser je anfordert.
 *
 * Geprüft wird am **Verzeichnis** und nicht an der Konfiguration: dass ein
 * Alias dasteht, sagt nichts darüber, ob er greift — dieselbe Regel wie
 * überall hier.
 */
function pruefeBauwerk() {
  const dateien = readdirSync(join('dist', 'assets'));
  const tot = dateien.filter((name) => /html2canvas|canvg/i.test(name));
  if (tot.length > 0) {
    throw new Error(
      `Tote Chunks im Bauwerk: ${tot.join(', ')} — der Alias in vite.config.ts greift nicht.`,
    );
  }
}

async function main() {
  pruefeStand();
  pruefeBauwerk();
  const server = await starteVorschau();
  const browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROMIUM || undefined,
    args: ['--no-sandbox'],
  });
  const kontext = await browser.newContext({
    viewport: { width: 1500, height: 940 },
    acceptDownloads: true,
  });
  // Ohne diese beiden fällt jedes ⌘C und ⌘V still aus.
  await kontext.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seite = await kontext.newPage();

  // Der Dateiauswahl-Dialog des Browsers lässt sich nicht fernsteuern; ohne ihn
  // fällt das Werkzeug auf den gewöhnlichen Download zurück.
  await seite.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });

  const fehler = [];
  seite.on('pageerror', (error) => fehler.push(`pageerror: ${error}`));
  seite.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(`console: ${nachricht.text()}`);
  });

  await seite.goto(URL, { waitUntil: 'networkidle' });
  // Die Schriften werden ausdrücklich angefordert und danach neu gemessen;
  // vorher steht die Ersatzschrift und die Wortpositionen stimmen nicht.
  await warteAufSchriften(seite);

  console.log('\nOberfläche:');

  await pruefe('die Fläche zeichnet die Folie', async () => {
    const folie = await seite.evaluate(FOLIE);
    wahr(folie, 'kein SVG auf der Seite');
    wahr(folie.markup.length > 2000, `Folienmarkup zu kurz: ${folie.markup.length} Zeichen`);
    wahr(folie.markup.includes('<path'), 'keine Pfade in der Folie');
  });

  await pruefe('der Filmstreifen führt jede Folie', async () => {
    const anzahl = await seite
      .getByRole('navigation', { name: 'Folien' })
      .locator('button')
      .count();
    wahr(anzahl >= 6, `nur ${anzahl} Folien im Streifen`);
  });

  await pruefe('das mitgelieferte Deck malt sich keinen Überlaufbalken', async () => {
    /*
       Der Balken ist die Ansage „hier steht Text unter der Unterkante", und
       genau die stand beim ersten Öffnen auf Folie 3: die Überschrift brach in
       Zilla Slab Bold 68 auf zwei Zeilen und lag 73 Einheiten unter ihrem
       Kasten. Ein Wächter, der auf dem eigenen Material anschlägt, wird als
       Rauschen abgetan — und schweigt dann auch dort, wo es zählt.

       Hier und nicht in vitest, weil es dort kein Canvas gibt: der Setzer misst
       gegen die Ersatzschrift, und wo eine Zeile umbricht, entscheidet die
       echte. Die Prüfung läuft deshalb vor dem ersten Handgriff, solange das
       Willkommens-Deck unberührt dasteht.

       Geklickt werden die Kacheln über ihr `title` — der Knopf daneben legt
       eine Folie an, und der Reihe nach über alle Knöpfe der Leiste zu gehen
       hieße, dem Deck sechs leere Folien anzuhängen.
    */
    const kacheln = seite.getByRole('navigation', { name: 'Folien' }).locator('button[title]');
    const anzahl = await kacheln.count();
    wahr(anzahl >= 6, `nur ${anzahl} Kacheln`);
    const treffer = [];
    for (let i = 0; i < anzahl; i += 1) {
      await kacheln.nth(i).click();
      // Die Kachel trägt `aria-current`, sobald ihre Folie die gezeigte ist —
      // das ist die Bedingung, und nicht eine Pause, die hofft.
      await bisWahr(
        async () => (await kacheln.nth(i).getAttribute('aria-current')) === 'true',
        `Folie ${i + 1} kam nicht nach vorn`,
      );
      const balken = await seite.locator('[title^="Der Text steht"]').count();
      if (balken > 0) treffer.push(`Folie ${i + 1}`);
    }
    await kacheln.nth(0).click();
    gleich(treffer.join(', '), '', 'Überlauf im mitgelieferten Deck');
  });

  await pruefe('die Zeichenbibliothek zeigt gezeichnete Kacheln', async () => {
    // Die Kacheln waren einmal leer, weil das letzte Primitiv gestrichen wurde.
    await seite.getByRole('button', { name: 'Zeichen', exact: true }).click();
    await seite.waitForTimeout(500);
    const leer = await seite.evaluate(() => {
      const kacheln = [...document.querySelectorAll('aside button svg')].slice(0, 60);
      return kacheln.filter((svg) => svg.children.length === 0).length;
    });
    gleich(leer, 0, 'leere Icon-Kacheln');
    await seite.getByRole('button', { name: 'Bausteine', exact: true }).click();
    await seite.waitForTimeout(300);
  });

  await pruefe('ein Baustein landet an der Einsetzlinie', async () => {
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    // Der linke Satzspiegel: dort fängt man zu lesen an, und dort fängt auch
    // alles Eingesetzte an. Die Spalte ist 48 % des Satzspiegels breit.
    await bisGleich(
      async () => (await masse(seite))[0],
      88,
      'linke Kante des eingesetzten Elements',
    );
  });

  await pruefe('ein Label steht mit seinem Text auf derselben Linie', async () => {
    // Geprüft wird das Bild, nicht das Feld. Solange jeder Baustein seine
    // eigene Breite mitbrachte, bekam jeder auch seine eigene Kante — und
    // untereinander ergab das keine Linie, sondern eine Treppe.
    await seite.locator('aside button').filter({ hasText: 'Label' }).first().click();
    await seite.waitForTimeout(600);

    const kante = await seite.evaluate(() => {
      let folie = null;
      for (const svg of document.querySelectorAll('svg')) {
        const box = svg.getBoundingClientRect();
        if (!folie || box.width * box.height > folie.flaeche) {
          folie = { flaeche: box.width * box.height, svg };
        }
      }
      const knoten = [...folie.svg.querySelectorAll('text')].find((el) =>
        /ABSCHNITT/i.test(el.textContent ?? ''),
      );
      if (!knoten) return null;
      return Math.round(knoten.getBBox().x);
    });

    wahr(kante !== null, 'kein Label-Text auf der Folie gefunden');
    // Dieselbe Linie wie die Karte darüber. Ein paar Einheiten Spiel für die
    // Seitenlage der ersten Glyphe.
    wahr(Math.abs(kante - 88) <= 6, `linke Kante des Label-Textes: ${kante} statt 88`);
  });

  await pruefe('ein getipptes Wort ist ein ⌘Z wert, kein Buchstabe', async () => {
    const steht = (text) => stehtAufFolie(seite, text);
    /*
       Der Fehler, gegen den das steht: jeder Anschlag legte einen
       Verlaufsschritt an — samt Tiefklon des ganzen Decks. Dreiundvierzig
       Zeichen waren dreiundvierzig Schritte, schoben alles davor aus den
       hundertzwanzig heraus, und ⌘Z nahm danach *einen Buchstaben* zurück.

       Geprüft wird an der Oberfläche und nicht am Store, denn der Weg, um den
       es geht, führt durch den Inspektor: `patch()` ruft `pushHistory()` und
       gibt ihm den Schlüssel, an dem der Verlauf denselben Handgriff erkennt.
       Ein Test am Store liefe an dieser Stelle vorbei.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();

    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    // Der Inspektor füllt sein Feld aus dem ausgewählten Element; leer heißt,
    // er ist noch nicht so weit.
    const vorher = await bisWahr(() => feld.inputValue(), 'das Textfeld blieb leer');

    await feld.click();
    await seite.keyboard.press('Control+a');
    await seite.keyboard.type('Handgeschrieben', { delay: 40 });
    await bisGleich(() => feld.inputValue(), 'Handgeschrieben', 'was im Feld steht');
    await bisWahr(() => steht('Handgeschrieben'), 'das Getippte steht nicht auf der Folie');

    /*
       Vor dem ⌘Z aus dem Feld heraus — und das ist keine Umständlichkeit,
       sondern der Weg. Solange der Zeiger im Feld steht, gehört ⌘Z dem
       Browser (`isTypingTarget` in `useKeyboardShortcuts`), und der nimmt
       einen Anschlag zurück, nicht einen Verlaufsschritt. Der erste Anlauf
       dieser Prüfung maß genau das und meldete „Handgeschriebe".
    */
    await klickeLeereFolie(seite);
    // Wirklich heraus: solange der Zeiger im Feld steht, gehört ⌘Z dem Browser.
    await bisWahr(
      () => seite.evaluate(() => document.activeElement?.tagName !== 'TEXTAREA'),
      'der Zeiger blieb im Textfeld',
    );

    await seite.keyboard.press('Control+z');

    // Ein einziges ⌘Z bringt den ganzen Satz zurück auf den Stand davor.
    await bisWahr(() => steht(vorher), `der Text nach einem ⌘Z — „${vorher}" fehlt auf der Folie`);
    wahr(!(await steht('Handgeschrieben')), 'das Getippte steht immer noch auf der Folie');
  });

  await pruefe('ein Element ist auch ohne Maus zu erreichen', async () => {
    /*
       Der Fehler, gegen den das steht: es gab keinen Weg, *ein* Element
       auszuwählen, ohne darauf zu klicken. Die Pfeiltasten schoben eine
       Auswahl, `⌘A` nahm alle — aber wer nicht zeigen kann, kam an keines.

       Erreichbar sind sie jetzt über die Tab-Reihenfolge des Browsers und
       nicht über eine abgefangene Taste. Der Unterschied ist der zweite Teil
       dieser Prüfung: `Tab` muss auch wieder **heraus**führen. Wer die Taste
       abfängt, mit der man weiterkommt, sperrt den Benutzer in dem Bereich
       ein, den er gerade erreicht hat.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(600);
    await seite.keyboard.press('Escape');

    // Die Griffe liegen im Kasten der Fläche, also *hinter* der Folie: ein
    // Schritt zurück landet auf dem letzten Element.
    await seite.locator('[data-panel-handle="library"]').focus();
    await seite.keyboard.press('Shift+Tab');
    await seite.waitForTimeout(400);

    const daran = await seite.evaluate(() => {
      const el = document.activeElement;
      return {
        id: el?.getAttribute?.('data-element-id') ?? null,
        ansage: el?.getAttribute?.('aria-label') ?? null,
      };
    });
    wahr(Boolean(daran.id), 'der Zeiger landete auf keinem Element');
    // Und er sagt an, was da liegt — „Grafik" hülfe niemandem beim Suchen.
    wahr(/Karte/.test(daran.ansage ?? ''), `Ansage des Elements: ${daran.ansage}`);

    // Ausgewählt ist es damit auch: der Inspektor zeigt seine Maße.
    const [, , breite] = await masse(seite);
    wahr(breite > 0, `keine Auswahl nach dem Tabben: Breite ${breite}`);

    /* ------------------------------------------------- und wieder hinaus */
    await seite.locator('[data-panel-handle="library"]').focus();
    for (let schritt = 0; schritt < 6; schritt += 1) await seite.keyboard.press('Tab');
    await seite.waitForTimeout(300);
    const draussen = await seite.evaluate(() =>
      Boolean(document.activeElement?.closest('.nz-stage svg')),
    );
    wahr(!draussen, 'Tab kam aus der Folie nicht wieder heraus');
  });

  await pruefe('zwei Bausteine lassen sich zu einer Gruppe zusammenfassen', async () => {
    // Mehrfachauswahl gab es, Gruppieren nicht — wer eine Karte samt Zeichen
    // verschieben wollte, musste jedes Mal neu einrahmen.
    await seite.locator('aside button').filter({ hasText: 'Zahl' }).first().click();
    await seite.waitForTimeout(500);
    await seite.keyboard.press('Control+a');
    await seite.waitForTimeout(300);
    await seite.keyboard.press('Control+g');
    await seite.waitForTimeout(500);

    const knopf = seite.getByRole('button', { name: /Gruppe auflösen/ });
    wahr(await knopf.count(), 'kein Knopf zum Auflösen — es wurde nicht gruppiert');
    gleich(await knopf.first().getAttribute('aria-pressed'), 'true', 'Zustand des Gruppenknopfs');

    // Und der Klick auf ein einzelnes Mitglied nimmt die ganze Gruppe.
    //
    // Geprüft an den Griffen, nicht am Gruppenknopf: der zeigt sich auch bei
    // einem einzelnen Mitglied, denn die Kennung klebt am Element. Griffe
    // zeichnet die Fläche dagegen nur, wenn genau *eines* ausgewählt ist —
    // keine Griffe heißt also: die Gruppe hängt mit dran.
    await seite.keyboard.press('Escape');
    await seite.locator('[data-hit-element]').first().click();
    await seite.waitForTimeout(400);
    gleich(
      await seite.locator('[data-handle]').count(),
      0,
      'Griffe nach dem Klick auf ein Gruppenmitglied',
    );

    await seite.keyboard.press('Control+Shift+g');
    await seite.waitForTimeout(400);
    wahr(
      await seite.getByRole('button', { name: /^Gruppieren/ }).count(),
      'die Gruppe ließ sich nicht auflösen',
    );
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(300);
  });

  await pruefe('eine Karte reist über die Zwischenablage auf die nächste Folie', async () => {
    /*
       Für ein Werkzeug, das sich Whiteboard nennt, war ⌘V die auffälligste
       Lücke: eine Datei *fallen zu lassen* ging, sie *einzufügen* nicht.

       Erst auswählen, und das ist keine Förmlichkeit: ⌘C kopiert die
       **Auswahl**. Ohne sie kopierte diese Prüfung nichts, fügte nichts ein
       und verglich zweimal `undefined / undefined` — grün, und ohne einen
       einzigen Handgriff belegt. Aufgefallen ist es erst, als `masse()` sagte,
       was es wirklich sah: eine leere Liste.
    */
    await seite.locator('[data-hit-element]').first().click();
    const [x, y] = await masse(seite);
    wahr(Number.isFinite(x) && Number.isFinite(y), `keine Karte ausgewählt: ${x} / ${y}`);
    await seite.keyboard.press('Control+c');

    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.keyboard.press('Control+v');

    const [x2, y2] = await masse(seite);
    // Auf einer *anderen* Folie behält die Kopie ihren Ort — das ist der Sinn
    // des Kopierens zwischen zwei Folien.
    gleich(`${x2} / ${y2}`, `${x} / ${y}`, 'Ort der eingefügten Karte');
  });

  await pruefe('ein Bildschirmfoto aus der Zwischenablage wird ein Bild', async () => {
    // Ein echtes ⌘V mit einem Bild lässt sich fernab einer Tastatur nicht
    // auslösen — die Zwischenablage des Betriebssystems steht hier nicht zur
    // Verfügung. Das Ereignis wird deshalb von Hand geschickt. Bewiesen ist
    // damit alles außer der Taste selbst: dass der Zuhörer hängt, dass die
    // Datei gelesen wird, dass das Seitenverhältnis stimmt und dass das Bild
    // am Satzspiegel landet.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);

    await seite.evaluate(async () => {
      const flaeche = document.createElement('canvas');
      flaeche.width = 200;
      flaeche.height = 100;
      flaeche.getContext('2d').fillRect(0, 0, 200, 100);
      const blob = await new Promise((fertig) => flaeche.toBlob(fertig, 'image/png'));
      const daten = new DataTransfer();
      daten.items.add(new File([blob], 'Bildschirmfoto.png', { type: 'image/png' }));
      document.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: daten, bubbles: true, cancelable: true }),
      );
    });
    await seite.waitForTimeout(1200);

    const [x, y, breite, hoehe] = await masse(seite);
    // 200 × 100 sind 2 : 1, und 420 ist die Breite eines eingesetzten Bildes.
    gleich(`${breite} × ${hoehe}`, '420 × 210', 'Maß des eingefügten Bildes');
    gleich(`${x} / ${y}`, '88 / 72', 'Ort des eingefügten Bildes');
  });

  await pruefe('ein zu großes Bild wird beim Einsetzen gekappt', async () => {
    /*
       Der Fehler, gegen den das steht: ein Foto wurde in voller Auflösung
       eingebettet. Vier Megabyte werden als data-URI zu 5,3 Millionen
       Zeichen, und `localStorage` zählt in UTF-16 — gut zehn Megabyte gegen
       ein Kontingent von etwa fünf. Ein einziges eingefügtes Bild legte die
       Selbstsicherung still, und zu sehen war davon nichts.

       Gemessen wird das eingebettete Bild selbst und nicht die Rechnung, die
       zu ihm führt: die steht in `imageElement.test.ts`. Hier geht es um die
       Frage, ob im Dokument am Ende auch wirklich das kleinere Bild steht —
       und in welchem Format.

       Zwei Bilder, weil die Regel in zwei Richtungen gilt. Das Kappen allein
       half dem Foto nicht: aus der Zwischenablage kommt **immer** ein PNG,
       und PNG rechnet ein Foto nicht klein. Es wird deshalb zum JPEG, wenn
       das deutlich kleiner ausfällt. Ein Bildschirmfoto darf das gerade
       nicht: an seinen Buchstaben sähe man es.
    */
    const einfuegen = (breite, hoehe, art) =>
      seite.evaluate(
        async ([b, h, welche]) => {
          const flaeche = document.createElement('canvas');
          flaeche.width = b;
          flaeche.height = h;
          const stift = flaeche.getContext('2d');
          if (welche === 'foto') {
            // Weiche Verläufe mit etwas Struktur — so verhält sich ein Foto.
            const daten = stift.createImageData(b, h);
            for (let y = 0; y < h; y += 1) {
              for (let x = 0; x < b; x += 1) {
                const i = (y * b + x) * 4;
                daten.data[i] = (x / b) * 255;
                daten.data[i + 1] = (y / h) * 255;
                daten.data[i + 2] = 128 + 120 * Math.sin((x + y) / 90);
                daten.data[i + 3] = 255;
              }
            }
            stift.putImageData(daten, 0, 0);
          } else {
            // Große weiße Fläche mit harten schwarzen Kanten — ein Fenster
            // voller Text, wie es die Zwischenablage liefert.
            stift.fillStyle = '#ffffff';
            stift.fillRect(0, 0, b, h);
            stift.fillStyle = '#000000';
            for (let y = 20; y < h; y += 40) stift.fillRect(40, y, b - 200, 14);
          }
          const blob = await new Promise((fertig) => flaeche.toBlob(fertig, 'image/png'));
          const daten = new DataTransfer();
          daten.items.add(new File([blob], `${welche}.png`, { type: 'image/png' }));
          document.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: daten, bubbles: true, cancelable: true }),
          );
          return blob.size;
        },
        [breite, hoehe, art],
      );

    /** Die Quelle des Bildes, das auf der Folie liegt. */
    const eingebettet = () =>
      seite.evaluate(async () => {
        let folie = null;
        for (const svg of document.querySelectorAll('svg')) {
          const box = svg.getBoundingClientRect();
          if (!folie || box.width * box.height > folie.flaeche) {
            folie = { flaeche: box.width * box.height, svg };
          }
        }
        const knoten = folie?.svg.querySelector('image');
        const quelle = knoten?.getAttribute('href') ?? knoten?.getAttribute('xlink:href');
        if (!quelle) return null;
        const bild = new Image();
        await new Promise((fertig, schief) => {
          bild.onload = fertig;
          bild.onerror = schief;
          bild.src = quelle;
        });
        return {
          breite: bild.naturalWidth,
          zeichen: quelle.length,
          art: quelle.slice(5, quelle.indexOf(';')),
        };
      });

    /* ------------------------------------------------------- das Foto */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    const fotoBytes = await einfuegen(4032, 3024, 'foto');
    /*
       Gewartet wird, bis das Bild wirklich auf der Folie liegt — hier standen
       4000 ms, dreimal. Das Kappen und Umkodieren läuft über ein Canvas und
       `toBlob()`, und wie lange das dauert, hängt am Bild und am Rechner: eine
       feste Pause ist dafür entweder zu lang oder zu kurz. `eingebettet()`
       gibt `null` zurück, solange nichts da ist — das ist die Bedingung.
    */
    const foto = await bis(eingebettet, 'das eingefügte Foto kam nicht auf der Folie an', 30000);
    wahr(foto !== null, 'kein Foto auf der Folie');
    // 2560 ist die Rasterbreite einer Folie; mehr nützt in keiner Ausgabe.
    gleich(foto.breite, 2560, 'Breite des eingebetteten Fotos');
    gleich(foto.art, 'image/jpeg', 'Format des eingebetteten Fotos');
    // Und es passt jetzt in eine Sitzungsablage von etwa fünf Megabyte —
    // vorher waren es allein für dieses eine Bild ein Vielfaches davon.
    wahr(
      foto.zeichen < 2_000_000,
      `data-URI des Fotos ${foto.zeichen} Zeichen lang (Quelle: ${fotoBytes} Bytes)`,
    );

    /* ----------------------------------------------- das Bildschirmfoto */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    await einfuegen(3000, 2000, 'schirm');
    const schirm = await bis(
      eingebettet,
      'das eingefügte Bildschirmfoto kam nicht auf der Folie an',
      30000,
    );
    wahr(schirm !== null, 'kein Bildschirmfoto auf der Folie');
    gleich(schirm.breite, 2560, 'Breite des eingebetteten Bildschirmfotos');
    // Die Gegenrichtung: hier wäre JPEG ein Verlust ohne Gewinn.
    gleich(schirm.art, 'image/png', 'Format des eingebetteten Bildschirmfotos');

    /* ------------------------------------------- genau auf der Kante */
    /*
       Die Lücke des ersten Anlaufs. Angefasst wurde nur, was zu *breit* war —
       und ein Vollbild-Foto mit 2560 × 1440 liegt genau auf der
       Kappungsgrenze. Es wurde durchgereicht und blieb als PNG bei 1,6
       Millionen Zeichen, wo dasselbe Bild als JPEG 219.000 braucht. Zwei
       davon, und die Sitzungsablage ist wieder tot.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    await einfuegen(2560, 1440, 'foto');
    const kante = await bis(
      eingebettet,
      'das Bild auf der Kappungsgrenze kam nicht auf der Folie an',
      30000,
    );
    wahr(kante !== null, 'kein Foto auf der Folie');
    gleich(kante.breite, 2560, 'Breite des Fotos auf der Kante');
    gleich(kante.art, 'image/jpeg', 'Format des Fotos auf der Kante');
  });

  await pruefe('⌘F findet ein Wort auf einer anderen Folie', async () => {
    // Die Suche des Browsers fände nur, was gerade auf dem Bildschirm steht —
    // also die eine Folie, die man ohnehin sieht.
    await seite.getByRole('navigation', { name: 'Folien' }).locator('button').first().click();
    await seite.waitForTimeout(500);
    const vorher = Number(
      (await seite.locator('header span.tabular-nums').first().innerText()).split('/')[0],
    );

    await seite.keyboard.press('Control+f');
    await seite.getByLabel('Im Deck suchen').fill('Vektor');
    await seite.waitForTimeout(600);

    const treffer = seite.locator('[aria-label="Im Deck suchen"]').locator('..').locator('..');
    const knoepfe = treffer.locator('ul button');
    wahr(await knoepfe.count(), 'kein Treffer für ein Wort, das im Deck steht');

    await knoepfe.first().click();
    await seite.waitForTimeout(700);
    const nachher = Number(
      (await seite.locator('header span.tabular-nums').first().innerText()).split('/')[0],
    );
    wahr(nachher !== vorher, `der Treffer führte nicht auf eine andere Folie (${nachher})`);

    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(300);
  });

  await pruefe('⌘F ersetzt, und ⌘Z nimmt es in einem Zug zurück', async () => {
    /*
       Die Suche fand, konnte aber nichts ändern — wer eine Zahl auf vierzig
       Folien austauschen wollte, ging sie einzeln durch.

       Geprüft wird am *Bild* und am Verlauf, nicht an der Trefferliste: dass
       die Liste leer wird, wüsste sie auch dann zu melden, wenn das Ersetzen
       gar nichts geschrieben hätte.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    // Ausdrücklich der Reiter „Folie": stand vorher ein Element in der
    // Auswahl, zeigte der Inspektor dessen Felder, und „das erste Textfeld"
    // war ein ganz anderes. Der erste Anlauf tippte deshalb ins Leere und
    // fand danach nichts zu ersetzen.
    await seite.getByRole('button', { name: 'Folie', exact: true }).click();
    await seite.waitForTimeout(300);
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    await feld.click();
    await seite.keyboard.press('Control+a');
    await seite.keyboard.type('# Zwiebelsuppe und Zwiebelbrot');
    await seite.waitForTimeout(800);
    wahr(await stehtAufFolie(seite, 'Zwiebelsuppe'), 'der Ausgangstext steht nicht auf der Folie');

    // Aus dem Feld heraus, sonst gehört ⌘F dem Browser nicht und ⌘Z nicht uns.
    await klickeLeereFolie(seite);
    await seite.waitForTimeout(300);

    await seite.keyboard.press('Control+f');
    await seite.getByRole('textbox', { name: 'Im Deck suchen' }).fill('zwiebel');
    await seite.getByRole('textbox', { name: 'Ersetzen durch' }).fill('Kürbis');
    await seite.waitForTimeout(400);
    // Der Knopf trägt die Zahl: ohne Treffer ist er aus, und ein Klick darauf
    // liefe in eine Zeitüberschreitung statt in eine Aussage.
    const knopf = seite.getByRole('button', { name: /^Alle/ });
    wahr(
      /Alle 2/.test(await knopf.innerText()),
      `Trefferzahl am Knopf: ${await knopf.innerText()}`,
    );
    await knopf.click();
    await seite.waitForTimeout(600);
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(400);

    wahr(await stehtAufFolie(seite, 'Kürbissuppe'), 'das Ersetzte steht nicht auf der Folie');
    wahr(!(await stehtAufFolie(seite, 'Zwiebel')), 'das Alte steht noch auf der Folie');

    // Und der ganze Handgriff hängt an *einem* ⌘Z.
    await seite.keyboard.press('Control+z');
    await seite.waitForTimeout(600);
    wahr(await stehtAufFolie(seite, 'Zwiebelsuppe'), 'ein ⌘Z brachte den Text nicht zurück');
    wahr(!(await stehtAufFolie(seite, 'Kürbis')), 'nach dem ⌘Z steht noch Ersetztes da');
  });

  await pruefe('ein Diagramm zeichnet die Zahlen, die drinstehen', async () => {
    // Ein Diagramm ist ein Kunde der Szene wie jedes andere Element — deshalb
    // wird hier geprüft, was auf der Folie *steht*, nicht was das Modell hält.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Balken' }).first().click();
    await seite.waitForTimeout(700);

    const folie = () => seite.evaluate(FOLIE);
    const vorher = (await folie()).markup;
    for (const wort of ['2023', '2025', '61']) {
      wahr(vorher.includes(`>${wort}<`), `„${wort}" fehlt im Diagramm`);
    }
    // Der mit * markierte Wert trägt die Signalfarbe — höchstens einer.
    const signale = vorher.split('#00FF9C').length - 1;
    wahr(signale > 0, 'kein hervorgehobener Balken');

    // Andere Zahlen, anderes Bild.
    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    await seite.waitForTimeout(300);
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    await feld.fill('Eins  10\nZwei  90');
    await seite.waitForTimeout(800);

    /*
       In Versalien, und das ist der Punkt: die Kategorien laufen über
       `typeScale.label`, und diese Stufe schreibt groß — ihre Laufweite von
       0,12 em ist dafür gerechnet. `pushZentriert()` wandte `caps` lange nicht
       an, und dieselbe CI-Stufe stand damit in einem Element zweimal
       verschieden da: die Überschrift groß, die Kategorie darunter gemischt.

       Die drei Zahlen oben fielen dabei nicht auf — Ziffern haben keine
       Schreibweise. Nur der Text verrät es.
    */
    const nachher = (await folie()).markup;
    wahr(nachher.includes('>EINS<'), 'die neuen Beschriftungen stehen nicht auf der Folie');
    wahr(!nachher.includes('>Eins<'), 'die Kategorie steht nicht in Versalien');
    wahr(!nachher.includes('>2023<'), 'die alten Beschriftungen stehen noch da');
  });

  await pruefe('eine Tabelle teilt ihre Spalten nach dem, was drinsteht', async () => {
    /*
       Die Spaltenbreiten sind der Grund für diese Prüfung.

       Zu gleichen Teilen war es lange, und es sah aus wie ein Raster: die
       schmale Spalte stand als Loch daneben, während die breite umbrach. Am
       Markup ist das nicht zu sehen — wohl aber an den Kästen der Textknoten,
       und die verrät `getBBox()`.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Tabelle' }).first().click();

    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    await seite.waitForTimeout(300);
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    await feld.fill(
      [
        'Was | Zahl | Rest',
        '--- | ---: | ---',
        'Ein deutlich längerer Zelleninhalt | 1.240 | ja',
        'Kurz | 12 | nein',
      ].join('\n'),
    );
    await seite.waitForTimeout(900);

    const kaesten = await seite.evaluate(() => {
      let groesstes = null;
      for (const svg of document.querySelectorAll('svg')) {
        const box = svg.getBoundingClientRect();
        if (!groesstes || box.width * box.height > groesstes.flaeche) {
          groesstes = { flaeche: box.width * box.height, svg };
        }
      }
      return [...groesstes.svg.querySelectorAll('text')].map((node) => ({
        text: node.textContent,
        x: node.getBBox().x,
        rechts: node.getBBox().x + node.getBBox().width,
      }));
    });

    const finde = (text) => kaesten.find((k) => k.text === text);
    for (const wort of [
      'Was',
      'Zahl',
      'Kurz',
      '1.240',
      'ja',
      'Ein deutlich längerer Zelleninhalt',
    ]) {
      wahr(finde(wort), `„${wort}" fehlt in der Tabelle`);
    }

    /*
       Gemessen wird die *letzte* Spalte, und zwar eine linksbündige.

       Die erste Fassung sah auf die Zahlenspalte — und die überlebte die
       Gegenprobe: rechtsbündig steht sie an der rechten Kante der Tabelle, und
       die ist bei gleichen Teilen dieselbe. Eine linksbündige Spalte verrät,
       wo ihre Spalte *anfängt*, und genau darum geht es: bei drei gleichen
       Teilen bei 69 % der Breite, nach Inhalt bei über 90 %.
    */
    // Die Kanten kommen aus den Zellen und nicht aus allen Textknoten der
    // Folie: die Fußzeile steht weiter links und weiter rechts als die Tabelle
    // und verschöbe jedes Verhältnis.
    const linkeKante = finde('Was').x;
    const rechteKante = Math.max(finde('Rest').rechts, finde('nein').rechts);
    const anteil = (finde('ja').x - linkeKante) / (rechteKante - linkeKante);
    wahr(anteil > 0.8, `die Spalten sind gleich breit statt nach Inhalt (${anteil.toFixed(2)})`);

    // Und `---:` heißt rechtsbündig: die beiden Zahlen enden auf derselben
    // Kante, obwohl sie verschieden lang sind.
    const zahl = finde('1.240');
    const kurz = finde('12');
    wahr(
      Math.abs(zahl.rechts - kurz.rechts) < 2,
      `die Zahlen stehen nicht rechtsbündig (${Math.round(zahl.rechts)} / ${Math.round(kurz.rechts)})`,
    );
  });

  await pruefe('die drei Leisten gehen zu und wieder auf', async () => {
    /*
       Gemessen wird die Fläche, nicht der Knopf.

       Zuklappen heißt: die Folie bekommt den Platz. Eine Prüfung, die nur
       nachsähe, ob der Griff jetzt „ausklappen" heißt, hielte auch dann, wenn
       die Leiste stehen bliebe — und genau das wäre der Fehler. Die Fläche
       misst sich selbst (`useElementSize`), also verrät ihre Größe, ob wirklich
       Platz frei wurde.

       Und zurück muss es auch gehen: der Griff liegt deshalb auf der Seite,
       die bleibt. Läge er in der Leiste, wäre sie nach dem ersten Klick für
       immer weg.
    */
    const folie = async () => {
      const gemessen = await seite.evaluate(FOLIE);
      return gemessen ? gemessen.flaeche : 0;
    };

    await seite.getByRole('navigation', { name: 'Folien' }).locator('button').first().click();
    await seite.waitForTimeout(500);
    const vorher = await folie();
    wahr(vorher > 0, 'keine Folie zu messen');

    for (const bereich of ['library', 'inspector', 'rail']) {
      await seite.locator(`[data-panel-handle="${bereich}"]`).click();
      await seite.waitForTimeout(500);
    }

    const zu = await folie();
    wahr(zu > vorher * 1.5, `die Folie wuchs nicht: ${Math.round(vorher)} → ${Math.round(zu)} px²`);
    // Und die Leisten sind wirklich weg, nicht nur schmal.
    wahr(
      !(await seite.locator('aside[aria-label="Inspektor"]').count()),
      'der Inspektor steht noch da',
    );
    wahr(
      !(await seite.getByRole('navigation', { name: 'Folien' }).count()),
      'der Filmstreifen steht noch da',
    );

    // Zurück über die Tastatur — ⌘1 bis ⌘3.
    for (const taste of ['1', '2', '3']) {
      await seite.keyboard.press('Control+' + taste);
      await seite.waitForTimeout(400);
    }
    await seite.waitForTimeout(500);

    const wieder = await folie();
    wahr(
      Math.abs(wieder - vorher) < vorher * 0.02,
      `die Folie kam nicht auf ihr Maß zurück: ${Math.round(vorher)} → ${Math.round(wieder)} px²`,
    );
    wahr(
      await seite.locator('aside[aria-label="Inspektor"]').count(),
      'der Inspektor kam nicht zurück',
    );
  });

  console.log('\nErscheinungsbild und Erscheinung:');

  await pruefe('ein anderes Erscheinungsbild färbt die Folie um', async () => {
    await seite.getByRole('button', { name: 'Deck', exact: true }).click();
    await seite.waitForTimeout(300);
    const auswahl = seite
      .locator('select')
      .filter({ has: seite.locator('option[value="musterkunde"]') })
      .first();
    wahr(await auswahl.count(), 'kein Erscheinungsbild „musterkunde" in der Auswahl');

    const vorher = (await seite.evaluate(FOLIE)).markup;
    await auswahl.selectOption('musterkunde');
    // Die Zusicherung *ist* die Bedingung: gewartet wird, bis die Folie anders
    // aussieht, und wenn sie es nicht tut, steht dieselbe Meldung da wie vorher.
    const nachher = await bis(async () => {
      const markup = (await seite.evaluate(FOLIE)).markup;
      return markup !== vorher ? markup : null;
    }, 'die Folie sieht nach dem Wechsel gleich aus');

    wahr(nachher.includes('#FF5A1F'), 'die Signalfarbe der fremden Marke fehlt');
    wahr(!nachher.includes('#00FF9C'), 'das Grün von nozilla steht noch auf der Folie');

    await auswahl.selectOption('nozilla');
    await bis(
      async () => (await seite.evaluate(FOLIE)).markup.includes('#00FF9C'),
      'die Folie kam nicht zu nozilla zurück',
    );
    await nachDemWechsel(seite);
  });

  await pruefe('die dunkle Erscheinung lässt die Folie in Ruhe', async () => {
    // Die Garantie, an der alles hängt: eine Einstellung des Arbeitsplatzes
    // darf niemals in einer Datei landen.
    const vorher = (await seite.evaluate(FOLIE)).markup;

    await seite.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await seite.getByRole('button', { name: 'Dunkel', exact: true }).click();
    await seite.waitForTimeout(800);
    await seite.keyboard.press('Escape');

    const leiste = await seite.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--nz-ui-surface').trim(),
    );
    wahr(leiste !== '#FFFFFF', `die Leiste blieb hell: ${leiste}`);
    gleich((await seite.evaluate(FOLIE)).markup, vorher, 'die Folie hat sich mitgeändert');
  });

  await pruefe('die Vorschau der Bausteine bleibt lesbar', async () => {
    // Sie saß einmal auf der Fläche der Leiste — bei dunkler Oberfläche war
    // das schwarz auf dunkelgrau.
    const hell = await seite.evaluate(() => {
      const kachel = document.querySelector('aside button span[aria-hidden="true"]');
      return kachel ? getComputedStyle(kachel).backgroundColor : null;
    });
    wahr(hell, 'keine Bausteinvorschau gefunden');
    const [r, g, b] = hell.match(/\d+/g).map(Number);
    wahr(r + g + b > 600, `Vorschau-Untergrund zu dunkel: ${hell}`);
  });

  await pruefe('ein überlaufender Text meldet sich, ein passender nicht', async () => {
    // Zweimal ist genau das schon passiert — die Überschrift des Musterkunden
    // lief aus ihrem Kasten, eine Karte saß auf ihrer Unterkante. Beide Male
    // war alles grün, und gesehen habe ich es im Bild.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Fließtext' }).first().click();
    await seite.waitForTimeout(600);

    const warnung = seite.getByText('unter der Unterkante', { exact: false });
    gleich(await warnung.count(), 0, 'Warnung bei einem Text, der passt');

    // Auf ein Zehntel der Höhe zusammenschieben — dann steht er heraus.
    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    await seite.waitForTimeout(300);
    const hoehe = seite.locator('aside[aria-label="Inspektor"] input').nth(3);
    await hoehe.fill('12');
    await hoehe.press('Enter');
    await seite.waitForTimeout(700);

    wahr(await warnung.count(), 'keine Warnung, obwohl der Text heraussteht');
    // Und der Strich liegt auch auf der Fläche, ohne dass man klicken muss.
    wahr(
      await seite.locator('[title*="unter der Unterkante"]').count(),
      'kein Strich auf der Fläche',
    );

    await seite.getByRole('button', { name: /Kasten anpassen/ }).click();
    await seite.waitForTimeout(700);
    gleich(await warnung.count(), 0, 'Warnung nach dem Anpassen des Kastens');
  });

  console.log('\nVortrag:');

  // Der Bildschirm, den nicht der Benutzer sieht, sondern sein Publikum — und
  // der einzige, den bis zuletzt niemand geprüft hat. Er blieb deshalb
  // englisch, während neun Prüfungen grün waren.
  await pruefe('die Vortragsansicht nimmt die ganze Fläche ein', async () => {
    await seite.getByRole('button', { name: 'Vortragen', exact: true }).click();
    await seite.waitForTimeout(900);

    const folie = await seite.evaluate(FOLIE);
    wahr(folie, 'keine Folie im Vortrag');
    // Im Vortrag ist die Folie größer als im Bearbeiten — sonst wurde nicht
    // umgeschaltet, sondern nur ein Fenster darübergelegt.
    wahr(folie.flaeche > 700_000, `die Folie füllt nicht: ${Math.round(folie.flaeche)} px²`);
    wahr(
      !(await seite.getByRole('button', { name: 'Export', exact: true }).count()),
      'die Kopfleiste steht noch da',
    );
  });

  await pruefe('weiterblättern bringt die nächste Folie', async () => {
    const vorher = (await seite.evaluate(FOLIE)).markup;
    await seite.keyboard.press('ArrowRight');
    await bis(
      async () => (await seite.evaluate(FOLIE)).markup !== vorher,
      'die Folie blieb stehen',
    );
  });

  await pruefe('die Notizen kommen auf Deutsch', async () => {
    // Hier stand „Notes ·" und „No notes for this slide." — beides in einem
    // Ausdruck, und beides deshalb am Sprachtest vorbei.
    wahr(
      !(await seite.getByRole('button', { name: 'Export', exact: true }).count()),
      'nicht mehr im Vortrag — diese Prüfung sagt sonst nichts über die Notizkarte',
    );
    await seite.keyboard.press('n');
    await seite.waitForTimeout(600);
    const karte = await seite.evaluate(() => {
      const el = [...document.querySelectorAll('aside')].find((node) =>
        /Notiz|Notes/i.test(node.textContent ?? ''),
      );
      return el?.textContent ?? null;
    });
    wahr(karte, 'keine Notizkarte im Vortrag');
    wahr(!/\bNotes\b|No notes/i.test(karte), `die Notizkarte ist englisch: ${karte.slice(0, 60)}`);
    await seite.keyboard.press('n');
    await seite.waitForTimeout(400);
  });

  await pruefe('die Referentenansicht folgt dem Vortrag im zweiten Fenster', async () => {
    /*
       Zwei Fenster, ein Kanal — und drei Dinge, die nur hier auffallen
       könnten: dass die Abzweigung in `main.tsx` überhaupt greift (sonst
       stünde im zweiten Fenster der Editor), dass das Deck über den Kanal
       ankommt (sonst bliebe es beim „Warte auf den Vortrag …") und dass das
       Blättern zurückwirkt.
    */
    const [referent] = await Promise.all([
      seite.waitForEvent('popup'),
      seite.getByRole('button', { name: 'Referentenansicht öffnen' }).click(),
    ]);
    await referent.waitForLoadState('networkidle');
    await warteAufSchriften(referent);

    const text = await referent.evaluate(() => document.body.innerText);
    wahr(!/Warte auf den Vortrag/.test(text), 'das zweite Fenster bekam kein Deck');
    wahr(
      !(await referent.getByRole('button', { name: 'Export', exact: true }).count()),
      'im zweiten Fenster steht der Editor statt der Referentenansicht',
    );
    // Ohne `i` findet sich nichts: die Überschriften stehen in Versalien, und
    // `innerText` gibt zurück, was zu sehen ist — „NOTIZEN", nicht „Notizen".
    wahr(/notizen/i.test(text), `keine Notizen in der Referentenansicht: ${text.slice(0, 80)}`);
    wahr(
      !/\bNotes\b|Next up/i.test(text),
      `die Referentenansicht ist englisch: ${text.slice(0, 80)}`,
    );

    // Die laufende *und* die nächste Folie — der eigentliche Gewinn des
    // zweiten Fensters. Eine allein wäre nur eine kleinere Vortragsansicht.
    const folien = await referent.evaluate(
      () =>
        [...document.querySelectorAll('svg')].filter((svg) => {
          const box = svg.getBoundingClientRect();
          return box.width * box.height > 40_000;
        }).length,
    );
    wahr(folien >= 2, `nur ${folien} Folie(n) in der Referentenansicht`);

    // Und zurück: was im zweiten Fenster gedrückt wird, blättert im ersten.
    const vorher = (await seite.evaluate(FOLIE)).markup;
    await referent.keyboard.press('ArrowRight');
    await bis(
      async () => (await seite.evaluate(FOLIE)).markup !== vorher,
      'das Blättern in der Referentenansicht kam im Vortrag nicht an',
    );

    await referent.close();
    await seite.waitForTimeout(400);
  });

  await pruefe('Esc führt zurück an die Arbeit', async () => {
    await seite.keyboard.press('Escape');
    await seite
      .getByRole('button', { name: 'Export', exact: true })
      .waitFor({ timeout: 15000 })
      .catch(() => {
        throw new Error('die Kopfleiste kam nicht zurück');
      });
  });

  console.log('\nExport:');

  await pruefe('das SVG des Decks kommt heraus', async () => {
    await seite.getByRole('button', { name: 'Export', exact: true }).click();
    await seite.waitForTimeout(300);
    const wartet = seite.waitForEvent('download', { timeout: 60000 });
    await seite
      .locator('[role="menu"] button')
      .filter({ hasText: 'SVG — ganzes Deck' })
      .first()
      .click();
    const datei = await wartet;
    const pfad = await datei.path();
    const { size } = await import('node:fs').then((fs) => fs.promises.stat(pfad));
    wahr(size > 50_000, `SVG zu klein: ${size} Bytes`);
    await seite.keyboard.press('Escape');
  });

  await pruefe('das Handout kommt heraus und ist hochkant', async () => {
    /*
       Der Ausgabeweg ist derselbe wie beim PDF — nur mit einer anderen Szene.
       Geprüft wird hier deshalb nicht die Rechnung (die steht in
       `handout.test.ts`), sondern dass der Weg durch das Menü überhaupt
       funktioniert und eine Datei herausfällt.
    */
    await seite.getByRole('button', { name: 'Export', exact: true }).click();
    await seite.waitForTimeout(300);
    const wartet = seite.waitForEvent('download', { timeout: 90000 });
    await seite.locator('[role="menu"] button').filter({ hasText: 'Handout' }).first().click();
    const datei = await wartet;
    const pfad = await datei.path();
    const bytes = await import('node:fs').then((fs) => fs.promises.readFile(pfad));

    wahr(bytes.subarray(0, 5).toString() === '%PDF-', 'kein PDF');
    wahr(bytes.length > 20_000, `Handout zu klein: ${bytes.length} Bytes`);
    // Das Seitenmaß steht als Rechteck im Katalog: hochkant heißt Höhe > Breite.
    const mediaBox = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(bytes.toString('latin1'));
    wahr(Boolean(mediaBox), 'keine MediaBox im PDF gefunden');
    const [breite, hoehe] = [Number(mediaBox[1]), Number(mediaBox[2])];
    wahr(hoehe > breite, `Handout liegt quer: ${breite} × ${hoehe}`);
  });

  await pruefe('das PNG einer Folie kommt heraus und ist ein Bild', async () => {
    // Nicht nur „eine Datei kam an": ein SVG, das über ein <img> gerastert
    // wird, ist ein eigenes Dokument ohne Zugriff auf die Schriften der
    // Seite. Wer Textknoten hineinlegt, bekommt ein Bild in der
    // Ersatzschrift — und merkt es erst beim Empfänger. Deshalb wird hier die
    // *Signatur* der Datei geprüft und ihre Größe: ein leeres oder einfarbiges
    // Bild wäre klein.
    await seite.getByRole('button', { name: 'Export', exact: true }).click();
    await seite.waitForTimeout(300);
    const wartet = seite.waitForEvent('download', { timeout: 60000 });
    await seite
      .locator('[role="menu"] button')
      .filter({ hasText: 'PNG — diese Folie' })
      .first()
      .click();
    const datei = await wartet;
    const pfad = await datei.path();
    const fs = await import('node:fs');
    const bytes = await fs.promises.readFile(pfad);

    wahr(
      bytes.length > 8 && bytes[0] === 0x89 && bytes.toString('latin1', 1, 4) === 'PNG',
      'die Datei trägt keine PNG-Signatur',
    );
    // Breite und Höhe stehen im IHDR, big-endian ab Byte 16.
    const breite = bytes.readUInt32BE(16);
    const hoehe = bytes.readUInt32BE(20);
    gleich(`${breite}×${hoehe}`, '2560×1440', 'Maß des Bildes');
    wahr(bytes.length > 20_000, `PNG zu klein: ${bytes.length} Bytes`);
    await seite.keyboard.press('Escape');
  });

  await pruefe('ein fehlendes Bild fehlt nicht in der Meldung', async () => {
    /*
       Der Fehler, gegen den das steht: `resolveOne()` fing jeden Ladefehler
       und gab `null` zurück, im PDF fing `drawImage` noch einmal — mit dem
       Kommentar „A broken image should never abort the whole export". Die
       Politik stimmt: ein toter Pfad darf ein Deck von dreißig Folien nicht
       ungedruckt lassen. Nur erfuhr es niemand. Das PDF kam ohne das Logo
       heraus, und wer nicht selbst nachsah, merkte es beim Vortrag.

       Geprüft wird an der Meldung *nach* einem Export, der durchgeht — beides
       gehört zusammen: die Datei kommt, und der Mangel wird genannt.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    await feld.click();
    await seite.keyboard.press('Control+a');
    await seite.keyboard.type('# Mit Loch\n\n![Logo](bilder/gibt-es-nicht.png)');
    await seite.waitForTimeout(800);

    const wartet = seite.waitForEvent('download', { timeout: 60000 });
    await seite.getByRole('button', { name: 'Export', exact: true }).click();
    await seite.waitForTimeout(300);
    await seite
      .locator('[role="menu"] button')
      .filter({ hasText: 'SVG — diese Folie' })
      .first()
      .click();

    // Die Datei kommt trotzdem — das ist die Hälfte, die stimmen muss.
    const datei = await wartet;
    wahr(Boolean(await datei.path()), 'kein SVG trotz vorhandener Folie');

    await seite.waitForTimeout(800);
    const meldung = await seite.getByRole('alert').first().innerText();
    wahr(/nicht laden/i.test(meldung), `keine Meldung über das fehlende Bild: ${meldung}`);
    wahr(meldung.includes('bilder/gibt-es-nicht.png'), `der Pfad fehlt in der Meldung: ${meldung}`);

    await seite.getByRole('button', { name: 'Hinweis schließen' }).click();
    await seite.waitForTimeout(300);
  });

  await pruefe('ein gescheiterter Export sagt es', async () => {
    /*
       Der Fehler, gegen den das steht: `console.error` und der Spinner ging
       aus. Wer auf „PDF" klickte und dessen Export scheiterte, sah einen
       Moment lang etwas laufen und danach nichts — kein Unterschied zu einem
       Export, den man versehentlich abgebrochen hat.

       Zum Scheitern gebracht wird er an der Stelle, an der jede Ausgabe
       vorbeikommt: dem Aushändigen der Datei. Das ist keine erfundene Panne,
       sondern die wahrscheinlichste — ein privates Fenster, ein voller
       Datenträger, ein abgelehnter Zugriff.
    */
    await seite.evaluate(() => {
      window.__objectUrl = URL.createObjectURL;
      URL.createObjectURL = () => {
        throw new Error('Die Datei ließ sich nicht anlegen');
      };
    });

    await seite.getByRole('button', { name: 'Export', exact: true }).click();
    await seite.waitForTimeout(300);
    await seite
      .locator('[role="menu"] button')
      .filter({ hasText: 'SVG — diese Folie' })
      .first()
      .click();
    await seite.waitForTimeout(1500);

    const meldung = await seite.getByRole('alert').first().innerText();
    wahr(/gescheitert/i.test(meldung), `keine Klage über den Export: ${meldung}`);
    // Und der Grund steht dabei — ohne ihn ist eine Meldung nur ein Schulterzucken.
    wahr(
      meldung.includes('Die Datei ließ sich nicht anlegen'),
      `der Grund fehlt in der Meldung: ${meldung}`,
    );

    // Weggeräumt wird sie mit einem Klick.
    await seite.getByRole('button', { name: 'Hinweis schließen' }).click();
    await seite.waitForTimeout(300);
    gleich(await seite.getByRole('alert').count(), 0, 'die Meldung blieb stehen');

    await seite.evaluate(() => {
      URL.createObjectURL = window.__objectUrl;
    });

    /*
       Diese eine Prüfung *erzeugt* einen Fehler, und der Weg schreibt ihn
       zusätzlich auf die Konsole — zu Recht: wer einen Fehler meldet, soll
       den Stapel dazu finden. Die Prüfung darunter würde ihn aber als
       Beschwerde zählen. Herausgenommen wird deshalb genau der Satz, den wir
       selbst geworfen haben, und kein anderer.
    */
    for (let i = fehler.length - 1; i >= 0; i -= 1) {
      if (fehler[i].includes('Die Datei ließ sich nicht anlegen')) fehler.splice(i, 1);
    }
  });

  await pruefe('der Inspektor zeigt nur, was auch etwas tut', async () => {
    /*
       Zwei Fehler derselben Sorte, beide gemessen und keiner sichtbar: ein
       Feld, das nichts bewirkt, und eine Fläche, die nichts malt.

       Der Innenabstand stand bei jeder Elementart da; gerechnet wirkt er bei
       fünf von elf, und die Fabrik gab dem Badge trotzdem 16 mit, dem Zeichen
       12 und der Form 20. Wer den Regler bewegte, sah nichts geschehen — die
       schlimmste Art von Bedienelement, denn sie lässt einen an sich selbst
       zweifeln.

       Und ein Element mit dem Ton „Weiß" und der Füllung „Fläche" malt auf
       einer Weiß-Folie #FFFFFF auf #FFFFFF. Es steht in der Ebenenliste,
       lässt sich anwählen, hat Maße — und ist auf der Folie, im SVG, im PDF
       und in der .pptx nicht zu sehen. Umgefärbt wird nichts: die Farbe hat
       jemand gewählt. Gesagt gehört es.

       Geprüft wird hier und nicht nur in `scene.test.ts`, weil die Rechnung
       dort das eine ist und der Weg zum Benutzer das andere. Eine Funktion,
       die richtig rechnet, und ein Inspektor, der sie nicht ruft, sehen in
       jeder Zusicherung gleich aus.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(600);

    const inspektor = seite.locator('aside[aria-label="Inspektor"]');
    gleich(
      await inspektor.getByText('Innenabstand', { exact: true }).count(),
      1,
      'die Karte zeigt kein Feld für den Innenabstand',
    );

    /* ------------------------------------- die Fläche in der Untergrundfarbe */
    const warnung = () => inspektor.getByText('genau die Farbe des Untergrunds').count();
    gleich(await warnung(), 0, 'die gerahmte Karte wird schon beklagt');

    /*
       Geprüft wird an einem **Rechteck** und nicht an der Karte.

       Die erste Fassung dieser Prüfung nahm die Karte — und schrieb damit
       einen Fehlalarm fest: eine Karte trägt Titel und Fließtext, die auf
       weißer Fläche in Tinte stehen. Zu sehen ist sie also sehr wohl, nur ihre
       *Fläche* nicht, und die Meldung sagt „von diesem Element ist auf der
       Folie nichts zu sehen". Ein leeres Rechteck ist der Fall, für den der
       Satz stimmt.
    */
    await seite.locator('aside button').filter({ hasText: 'Rechteck' }).first().click();
    await seite.waitForTimeout(600);
    gleich(await warnung(), 0, 'das gerahmte Rechteck wird schon beklagt');

    await inspektor.getByRole('button', { name: 'Weiß', exact: true }).click();
    await inspektor.locator('select').first().selectOption('flat');
    await seite.waitForTimeout(400);
    gleich(await warnung(), 1, 'Weiß auf Weiß wird nicht gemeldet');

    /*
       Zwei Gegenrichtungen. Dieselbe Farbe mit einem Rahmen ist sichtbar — der
       Strich kommt aus dem Ton des Elements und nicht aus dem Untergrund. Und
       dieselbe Farbe unter einer Karte ist auch sichtbar, denn dort steht Text
       darauf: eine Warnung über einem Element, das gut aussieht, ist die Sorte
       Wächter, die man abschaltet.
    */
    await inspektor.locator('select').first().selectOption('framed');
    await seite.waitForTimeout(400);
    gleich(await warnung(), 0, 'die gerahmte Fläche wird zu Unrecht beklagt');

    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await inspektor.getByRole('button', { name: 'Weiß', exact: true }).click();
    await inspektor.locator('select').first().selectOption('flat');
    await seite.waitForTimeout(400);
    gleich(await warnung(), 0, 'die weiße Karte mit ihrem Text wird zu Unrecht beklagt');

    /* ------------------------------------------ und das Feld, das nichts tut */
    await seite.locator('aside button').filter({ hasText: 'Badge' }).first().click();
    await seite.waitForTimeout(600);
    gleich(
      await inspektor.getByText('Innenabstand', { exact: true }).count(),
      0,
      'das Badge zeigt ein Feld für einen Abstand, den es nicht zeichnet',
    );

    /*
       Die Wortmarke trägt die Regeln des CI im Bauch, und die Bibliothek sagt
       sie sogar an ihrer Kachel: „Nie drehen, nie umfärben, nie verzerren, nie
       mit Schatten". Der Inspektor bot trotzdem alle vier an, dazu Füllung und
       Innenabstand — sechs Bedienelemente ohne Wirkung. Der Drehgriff war
       dabei schlimmer als nichts: der Rahmen drehte sich mit, das Zeichen
       nicht.
    */
    await seite.locator('aside button').filter({ hasText: 'Wortmarke' }).first().click();
    await seite.waitForTimeout(600);
    for (const feld of ['Ton', 'Füllung', 'Strichstärke', 'Schatten', 'Drehung']) {
      gleich(
        await inspektor.getByText(feld, { exact: true }).count(),
        0,
        `die Wortmarke zeigt „${feld}" — ein Feld, das an ihr nichts tut`,
      );
    }
    gleich(
      await seite.locator('[data-handle="rotate"]').count(),
      0,
      'die Wortmarke hat einen Drehgriff, obwohl sie sich nicht dreht',
    );

    /*
       Und der Verbinder ist ein Strich: seine Stärke wirkt, Füllung und
       Schatten nicht. Der **Ton** hängt an der Füllung — ohne eigene Fläche
       erbt ein Element Tinte und Linie vom Untergrund, und der Verbinder hat
       „Ohne" als Vorgabe. Genau in dieser Lücke saßen dreiundvierzig tote
       Bedienelemente: gefragt wurde nur die Art, nicht die Füllung.

       Die Gegenrichtung steht ausdrücklich daneben — eine Leiste, die zu wenig
       zeigt, ist so schlimm wie eine, die zu viel zeigt.
    */
    await seite.locator('aside button').filter({ hasText: 'Pfeil' }).first().click();
    await seite.waitForTimeout(600);
    gleich(
      await inspektor.getByText('Strichstärke', { exact: true }).count(),
      1,
      'dem Verbinder fehlt „Strichstärke", obwohl es bei ihm wirkt',
    );
    for (const feld of ['Füllung', 'Schatten', 'Ton']) {
      gleich(
        await inspektor.getByText(feld, { exact: true }).count(),
        0,
        `der Verbinder zeigt „${feld}" — ein Strich ohne eigene Fläche`,
      );
    }

    /*
       Dasselbe am Text, und zwar in beide Richtungen: frisch eingesetzt hat er
       keine Fläche, und dann tun Ton, Strichstärke und Schatten nichts. Wer
       ihm eine Füllung gibt, bekommt alle drei.
    */
    await seite.locator('aside button').filter({ hasText: 'Fließtext' }).first().click();
    await seite.waitForTimeout(600);
    for (const feld of ['Ton', 'Strichstärke', 'Schatten']) {
      gleich(
        await inspektor.getByText(feld, { exact: true }).count(),
        0,
        `der frische Text zeigt „${feld}", obwohl er keine Fläche hat`,
      );
    }
    await inspektor.locator('select').first().selectOption('framed');
    await seite.waitForTimeout(400);
    for (const feld of ['Ton', 'Strichstärke', 'Schatten']) {
      gleich(
        await inspektor.getByText(feld, { exact: true }).count(),
        1,
        `dem gerahmten Text fehlt „${feld}", obwohl es bei ihm wirkt`,
      );
    }
    await seite.locator('aside button').filter({ hasText: 'Pfeil' }).first().click();
    await seite.waitForTimeout(600);
    gleich(
      await seite.locator('[data-handle="rotate"]').count(),
      1,
      'dem Verbinder fehlt der Drehgriff',
    );

    // Und die Griffe sagen an, was sie tun — auf Deutsch. „Resize nw" stand
    // hier, und nur eine Hilfstechnik konnte es lesen.
    gleich(
      await seite.getByRole('button', { name: 'Größe ändern: oben links' }).count(),
      1,
      'der Griff oben links sagt nicht auf Deutsch an, was er tut',
    );
  });

  console.log('\nSchutz der Arbeit:');

  /*
     Diese Prüfung steht am Ende, und das ist Absicht: sie legt ein neues Deck
     an, und alles danach liefe auf einer leeren Folie.
  */
  await pruefe('ein neues Deck fragt, bevor es das offene ersetzt', async () => {
    /*
       Der Fehler, gegen den das hier steht: sechs Wege ersetzten das Deck,
       genau einer fragte. Wer danebengriff, verlor die ungesicherte Arbeit
       samt Verlauf — und die Selbstsicherung schrieb den Verlust
       siebenhundert Millisekunden später fest.

       Gemessen wird das *Deck*, nicht der Dialog. Eine Prüfung, die nur
       nachsähe, ob ein Fenster aufging, hielte auch dann, wenn danach
       trotzdem geladen würde.
    */
    const folien = async () =>
      Number((await seite.locator('header span.tabular-nums').first().innerText()).split('/')[1]);

    // Etwas Ungesichertes anlegen — ohne `dirty` fragt niemand, und das ist
    // richtig so.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(600);
    const vorher = await folien();
    wahr(vorher > 1, `zu wenige Folien zum Prüfen: ${vorher}`);

    // Abgelehnt: das Deck bleibt.
    const ablehnen = (dialog) => void dialog.dismiss();
    seite.on('dialog', ablehnen);
    await seite.keyboard.press('Control+Shift+KeyN');
    await seite.waitForTimeout(900);
    seite.off('dialog', ablehnen);
    gleich(await folien(), vorher, 'das Deck überlebte die Ablehnung nicht');

    // Angenommen: jetzt darf es weg.
    const annehmen = (dialog) => void dialog.accept();
    seite.on('dialog', annehmen);
    await seite.keyboard.press('Control+Shift+KeyN');
    await seite.waitForTimeout(900);
    seite.off('dialog', annehmen);
    gleich(await folien(), 1, 'das neue Deck kam nicht');
  });

  await pruefe('eine wiederhergestellte Sitzung gilt als ungesichert', async () => {
    /*
       Die Sitzung ist ungesicherte Arbeit — sie steht in keiner Datei und hat
       keinen Dateigriff. `loadDeck()` setzte trotzdem `dirty: false`, und
       `darfErsetzen()` fragt genau daran: alle sechs Ersetzungswege liefen
       wortlos über die wiederhergestellte Arbeit hinweg, und
       siebenhundert Millisekunden später schrieb die Selbstsicherung den
       Verlust fest. Wörtlich der Fehler, gegen den `darfErsetzen()` gebaut
       wurde, nur eine Ebene tiefer.

       Gelegt wird die Sitzung über ein Startskript und nicht kurz vor dem
       Neuladen — dazwischen liegt `beforeunload`, und dort schreibt die
       Selbstsicherung den offenen Stand darüber.
    */
    await seite.addInitScript(() => {
      localStorage.setItem(
        'nozilla-whiteboard:session:v1',
        JSON.stringify({
          markdown: '# Aus der Sitzung\n\nEin Satz, der nirgends sonst steht.',
          fileName: 'sitzung.md',
          slideIndex: 0,
          savedAt: 1,
        }),
      );
    });
    await seite.reload({ waitUntil: 'networkidle' });
    await bis(
      () => stehtAufFolie(seite, 'Aus der Sitzung'),
      'die Sitzung kam beim Start nicht zurück',
    );

    // Und jetzt die Frage: ohne sie wäre die Arbeit weg.
    let gefragt = false;
    const ablehnen = (dialog) => {
      gefragt = true;
      void dialog.dismiss();
    };
    seite.on('dialog', ablehnen);
    await seite.keyboard.press('Control+Shift+KeyN');
    await seite.waitForTimeout(900);
    seite.off('dialog', ablehnen);
    wahr(gefragt, 'ein neues Deck fragte nicht, obwohl die Sitzung ungesichert ist');
    wahr(
      await stehtAufFolie(seite, 'Aus der Sitzung'),
      'die Sitzung überlebte die Ablehnung nicht',
    );
  });

  await pruefe('ein unlesbarer Block überlebt das Sichern', async () => {
    /*
       Der Fehler, gegen den das hier steht: ein Doppelpunkt zu viel im YAML
       eines `nzl`-Blocks — im deutschen Text einer Karte die wahrscheinlichste
       Stelle — machte die Folie lautlos leer. Layout auf Vorgabe, Elemente
       weg, und beim nächsten Sichern stand der Block in keiner Datei mehr.
       Der Fließtext blieb stehen; die Folie sah deshalb nicht kaputt aus,
       sondern nur leer.

       Geprüft wird die *gesicherte Datei*, nicht das Modell. Der Unterschied
       ist genau der Fehler: das Modell wusste schon vorher nichts von dem
       Block, und trotzdem hätte niemand etwas verloren, wenn er beim
       Schreiben wieder dagestanden hätte.
    */
    const ZEILE = 'text: Achtung: hier steht ein Doppelpunkt zu viel';
    const KAPUTT = [
      '<!-- nzl',
      'layout: canvas',
      'elements:',
      '  - id: card-1',
      '    kind: card',
      '    x: 80',
      '    y: 80',
      '    w: 480',
      '    h: 220',
      `    ${ZEILE}`,
      '-->',
      '',
      '# Eine Folie, deren Block nicht lesbar ist',
      '',
    ].join('\n');

    /*
       Gelegt wird die Sitzung über ein Startskript und nicht über ein
       `evaluate` vor dem Neuladen — dazwischen liegt `beforeunload`, und dort
       schreibt die Selbstsicherung den *offenen* Stand über das eben Gelegte.
       Der erste Anlauf las danach das Willkommens-Deck und meldete, der
       Inspektor sage nichts.

       Das Startskript gilt von hier an für jede Navigation; deshalb steht
       diese Prüfung am Ende.
    */
    await seite.addInitScript((md) => {
      localStorage.setItem(
        'nozilla-whiteboard:session:v1',
        JSON.stringify({ markdown: md, fileName: 'kaputt.md', slideIndex: 0, savedAt: 1 }),
      );
    }, KAPUTT);
    await seite.reload({ waitUntil: 'networkidle' });

    // Sichtbar sein muss es auch: eine Folie, der die Elemente fehlen, ohne
    // dass irgendwo steht warum, ist der halbe Fehler.
    await bis(
      async () => (await seite.getByText('ließ sich nicht lesen').count()) === 1,
      'der Inspektor sagt nichts über den unlesbaren Block',
    );

    // Etwas ändern, das die Folie *nicht* anfasst — sonst gäbe das Werkzeug
    // den Rohtext zu Recht auf. Eine neue Folie reicht und stößt die
    // Selbstsicherung an.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(1400);

    const gesichert = await seite.evaluate(() => {
      const roh = localStorage.getItem('nozilla-whiteboard:session:v1');
      return roh ? String(JSON.parse(roh).markdown) : '';
    });
    wahr(gesichert.length > 0, 'nichts gesichert');
    wahr(gesichert.includes(ZEILE), 'der unlesbare Block fehlt in der gesicherten Datei');
  });

  console.log('\nErscheinungsbild anlegen:');

  await pruefe('das Zahnrad bleibt erreichbar, wenn die Bibliothek zu ist', async () => {
    /*
       Der eigentliche Grund für den Umzug in die Hauptleiste, und er ist an
       einem Schalter zu sehen: die Bausteinleiste ist wegklappbar (⌘1), und
       ihr Zustand überlebt im Browser. Solange das Zahnrad in ihrem Fuß saß,
       war die Erscheinung des Arbeitsplatzes für jeden verloren, der die
       Bibliothek einmal zugeklappt hatte.

       Ein grüner Rauchtest allein beweist das nicht — die Prüfung darunter
       greift über die zugängliche Beschriftung und die ist ortsunabhängig.
       Geprüft wird deshalb gegen das *Ergebnis*: Bibliothek zu, Zahnrad noch
       da.
    */
    await seite.keyboard.press('Control+Digit1');
    await seite.waitForTimeout(500);
    const bibliothek = await seite.getByRole('button', { name: 'Bausteine', exact: true }).count();
    wahr(!bibliothek, 'die Bausteinleiste ließ sich nicht zuklappen');

    const zahnrad = seite.getByRole('button', { name: 'Einstellungen', exact: true });
    gleich(await zahnrad.count(), 1, 'das Zahnrad ist bei zugeklappter Bibliothek verschwunden');

    await zahnrad.click();
    await seite.waitForTimeout(400);
    // Und das Feld geht nach *unten* auf. In der Kopfleiste ragte ein Feld
    // mit `bottom-9` aus dem Fenster hinaus — sichtbar nur im Bild.
    const kasten = await seite.getByRole('dialog', { name: 'Einstellungen' }).boundingBox();
    wahr(kasten, 'das Einstellungsfeld ging nicht auf');
    wahr(kasten.y > 0, `das Einstellungsfeld ragt oben heraus (y = ${kasten.y})`);

    await seite.keyboard.press('Escape');
    await seite.keyboard.press('Control+Digit1');
    await seite.waitForTimeout(500);
  });

  await pruefe('der CI-Generator zeichnet eine Folie in fremden Farben', async () => {
    /*
       Die zweite Seite ist ein eigener Einstieg — `rollupOptions.input`
       *ersetzt* die Vorgabe, und wer nur sie einträgt, verliert `index.html`
       aus `dist/`. Dass beide da sind, sieht man nur, indem man beide öffnet.

       Und die Vorschau ist der Kern: sie ruft dieselbe Zeichenstrecke wie der
       SVG-Export. Ein Generator mit eigenem Zeichner verspräche etwas, das
       keine Ausgabe hält.

       Seit die Seite ein Wizard ist, steht immer nur *ein* Schritt im Baum.
       Geklickt wird deshalb durch den Schrittbalken — und das ist zugleich die
       Prüfung, dass er wirklich umschaltet: bliebe er stehen, fände der nächste
       Handgriff sein Feld nicht.
    */
    const generator = await kontext.newPage();
    const laut = [];
    generator.on('pageerror', (fehler) => laut.push(String(fehler)));
    await oeffneGenerator(kontext, generator);
    wahr(!laut.length, `die Generator-Seite warf: ${laut.join(' | ')}`);

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('rauchprobe');
    await generator.getByLabel('Name in der Auswahl').fill('Rauchprobe');
    await generator.getByLabel('Markenname').fill('rauch');

    await zumSchritt(generator, 'Farbe');
    // Die Signalfarbe über das Hex-Feld, nicht über den Wähler: ein
    // `input[type=color]` lässt sich nicht fernsteuern.
    await setzeFarbe(generator, 'signal', '#E4003A');

    await zumSchritt(generator, 'Wortmarke');
    const WORTMARKE =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">' +
      '<path fill="#000000" d="M4 8 L96 8 L96 40 L4 40 Z"/>' +
      '<path fill="#E4003A" d="M108 24 L132 24 L132 40 L108 40 Z"/></svg>';
    await generator.setInputFiles('input[accept*="svg"]', {
      name: 'rauchprobe-wortmarke.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(WORTMARKE),
    });
    await generator.waitForTimeout(1500);

    const markup = await generator.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]');
      return svg ? svg.innerHTML : '';
    });
    wahr(markup.length > 200, 'die Vorschau blieb leer');
    wahr(markup.includes('#E4003A'), 'die Signalfarbe der neuen Marke fehlt auf der Probefolie');
    wahr(!markup.includes('#00FF9C'), 'das Grün von nozilla steht noch auf der Probefolie');

    // Und die Designdatei entsteht wirklich — nicht nur ein Knopf, der sie
    // verspricht. Sie steht im letzten Schritt, weil sie dorthin gehört.
    await zumSchritt(generator, 'Fertig');
    const quelle = await generator.evaluate(() => {
      const bloecke = [...document.querySelectorAll('pre')];
      return bloecke.map((block) => block.textContent ?? '').join('\n');
    });
    wahr(
      quelle.includes('export const rauchprobe: BrandTheme'),
      'die Designdatei steht nicht auf der Seite',
    );
    wahr(
      quelle.includes('colorsFromPalette(palette, inkAlpha)'),
      'die Designdatei schreibt die Farben ab, statt sie zu mischen',
    );

    await generator.close();
  });

  await pruefe('die Probefolie steht schon da, bevor die Wortmarke da ist', async () => {
    /*
       Die Wortmarke ist Pflicht und steht spät im Wizard — man muss für sie
       eine Datei suchen. Ohne einen Platzhalter wären fünf von acht Schritten
       ohne Bild, und ausgerechnet „Farbe" wäre blind: die sechs fest
       verdrahteten Lesepaare sind auf der Probefolie zu sehen und sonst
       nirgends.

       Und die Grenze gehört mitgeprüft, sonst wäre der Platzhalter ein stiller
       Ersatz: der Fehler muss in der Prüfliste stehen bleiben und danebenstehen
       muss, dass es einer ist.
    */
    const generator = await oeffneGenerator(kontext);

    const markup = await generator.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]');
      return svg ? svg.innerHTML : '';
    });
    wahr(markup.length > 200, 'die Probefolie blieb leer, solange die Wortmarke fehlt');
    wahr(!/NaN/.test(markup), 'im Markup der Probefolie steht NaN');

    const text = await generator.evaluate(() => document.body.innerText);
    wahr(/Platzhalter/.test(text), 'die Vorschau sagt nicht, dass die Marke ein Platzhalter ist');
    wahr(/Die Wortmarke fehlt/.test(text), 'der Fehler zur Wortmarke steht nicht in der Prüfliste');

    await generator.close();
  });

  await pruefe('ein Fehler im Entwurf leert die Vorschau nicht', async () => {
    /*
       Vorher hing die ganze rechte Spalte an „trägt der Entwurf einen Fehler":
       wer in ein Farbfeld klickte und die Raute löschte, sah die Folie
       verschwinden — bei genau einer offenen Stelle von sechzehn. Die Vorschau
       ist aber der Grund, aus dem jemand auf dieser Seite ist.

       Geprüft wird am Bild und nicht an der Zusicherung: das Markup muss die
       Farbe weiter tragen, und der Hinweis daneben muss sagen, dass es der
       letzte Stand ist. Ein alter Stand, der sich für den aktuellen ausgibt,
       wäre schlimmer als eine leere Fläche.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('rauchhalt');
    await generator.getByLabel('Name in der Auswahl').fill('Rauchhalt');
    await zumSchritt(generator, 'Farbe');
    await setzeFarbe(generator, 'signal', '#E4003A');
    await zumSchritt(generator, 'Wortmarke');
    await generator.setInputFiles('input[accept*="svg"]', {
      name: 'r.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">' +
          '<path fill="#000000" d="M4 8 L96 8 L96 40 L4 40 Z"/></svg>',
      ),
    });
    await generator.waitForTimeout(1800);

    const vorher = await generator.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]');
      return svg ? svg.innerHTML : '';
    });
    wahr(vorher.includes('#E4003A'), 'die Vorschau stand vor der Sabotage schon nicht');

    // Jetzt eine einzelne Farbe unlesbar machen.
    await zumSchritt(generator, 'Farbe');
    await setzeFarbe(generator, 'signalSoft', 'knallrot');
    await generator.waitForTimeout(600);

    const nachher = await generator.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]');
      return svg ? svg.innerHTML : '';
    });
    wahr(nachher.length > 200, 'die Vorschau wurde durch einen einzelnen Fehler geleert');
    wahr(nachher.includes('#E4003A'), 'der letzte tragfähige Stand steht nicht mehr da');

    const text = await generator.evaluate(() => document.body.innerText);
    wahr(
      /Nicht mehr aktuell/.test(text),
      'die Vorschau gibt sich als aktuell aus, obwohl sie veraltet ist',
    );

    await generator.close();
  });

  await pruefe('das Farbfeld räumt beim Verlassen auf, nicht beim Tippen', async () => {
    /*
       Der alte `trim().toUpperCase()` bei jedem Anschlag machte das Feld für
       den häufigsten Fall unbedienbar: aus einem Styleguide kommt
       `rgb(228, 0, 58)`, und ein Leerzeichen am Rand war nicht zu tippen.

       Geprüft wird deshalb mit echten Tastendrücken und einem echten
       Fokuswechsel — ein `fill()` setzt den ganzen Wert in einem Ereignis und
       wäre auch über dem alten Stand grün geblieben.
    */
    const generator = await oeffneGenerator(kontext);
    await zumSchritt(generator, 'Farbe');

    const feld = generator.locator(`[id="${await farbfeldId(generator, 'signal')}"]`);
    await feld.click();
    await generator.keyboard.press('ControlOrMeta+a');
    for (const zeichen of 'rgb(228, 0, 58)') {
      await generator.keyboard.type(zeichen, { delay: 20 });
    }

    // Während des Tippens bleibt stehen, was getippt wurde — samt Leerzeichen.
    gleich(
      await feld.inputValue(),
      'rgb(228, 0, 58)',
      'das Feld hat beim Tippen dazwischengeredet',
    );

    await generator.keyboard.press('Tab');
    await generator.waitForTimeout(300);
    gleich(await feld.inputValue(), '#E4003A', 'das Feld hat beim Verlassen nicht aufgeräumt');

    await generator.close();
  });

  await pruefe('der Rücklauf eines Sprachmodells kommt an und wird berichtet', async () => {
    /*
       Der Weg, für den es den ersten Schritt gibt: der Generator schreibt das
       Lastenheft, ein Sprachmodell füllt es aus, und die Antwort kommt hier
       zurück. Was hereinkommt, ist fast nie reines JSON — Codezaun, ein Satz
       davor, ein Kommentar, ein Komma zu viel.

       Geprüft wird an beidem: dass der Wert wirklich im Entwurf landet, und
       dass der Bericht sagt, was er dafür tun musste. Eine stille Reparatur
       wäre eine Behauptung darüber, was gemeint war.
    */
    const generator = await oeffneGenerator(kontext);

    const antwort = [
      'Klar, hier ist das Erscheinungsbild:',
      '```json',
      '{',
      '  "id": "rauchrueck", // klein geschrieben',
      '  "label": "Rauchrücklauf",',
      '  "markenname": "Rauch GmbH",',
      '  "palette": { "signal": "rgb(228, 0, 58)", "akzent": "#123456" },',
      '  "textScale": { "xl4": "120px" },',
      '}',
      '```',
    ].join('\n');

    await generator.getByLabel('Die Antwort des Modells').fill(antwort);
    await generator.getByRole('button', { name: 'Antwort lesen' }).click();
    await generator.waitForTimeout(400);

    /*
       Gelesen wird **nur der Bericht** und nicht die ganze Seite. Die erste
       Fassung dieser Prüfung nahm `document.body.innerText` — und die
       Erklärung über dem Eingabefeld kündigt an, was der Bericht sagen wird:
       „Der Codezaun darf drin bleiben … und Kommentare im JSON ebenfalls."
       Beide Wörter standen also ohnehin auf der Seite. Die Gegenprobe, die den
       Bericht verstummen ließ, blieb deshalb grün.

       Und zwar **vor** dem Übernehmen: der Bericht ist ein Vorschlag, und ein
       angenommener Vorschlag ist keiner mehr. Danach steht dort nichts, und
       das ist richtig — was daraus geworden ist, steht ab dann im Formular.
    */
    const bericht = await generator
      .getByRole('region', { name: 'Bericht zum Rücklauf' })
      .innerText();
    wahr(/Codezaun/.test(bericht), 'der Bericht verschweigt den Codezaun');
    wahr(/Kommentare/.test(bericht), 'der Bericht verschweigt die Kommentare');
    wahr(/akzent/.test(bericht), 'der Bericht verschweigt die übergangene Rolle');
    wahr(/Kam nicht/.test(bericht), 'der Bericht verschweigt, was gar nicht kam');

    await generator.getByRole('button', { name: /Werte übernehmen/ }).click();
    await generator.waitForTimeout(400);

    // Und die Werte stehen wirklich im Entwurf.
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'rauchrueck',
      'der Schlüssel aus dem Rücklauf kam nicht an',
    );

    await zumSchritt(generator, 'Farbe');
    const signal = generator.locator(`[id="${await farbfeldId(generator, 'signal')}"]`);
    gleich(
      await signal.inputValue(),
      '#E4003A',
      'die Farbe aus dem Rücklauf wurde nicht umgerechnet',
    );

    await generator.close();
  });

  await pruefe('im CI-Generator lässt sich ein Schriftname tippen', async () => {
    /*
       Der Defekt, gegen den das steht, war die schwerste Stelle der Seite: der
       React-Schlüssel der Schnitt-Zeile kam aus ihrem *eigenen Inhalt*. Jeder
       Anschlag änderte den Schlüssel, React hängte die Zeile samt Eingabe aus
       dem Baum, und der Fokus fiel auf den Rumpf — von „ Kunde" kam genau ein
       Zeichen an. Wer eine eigene Schrift eintragen wollte, kam pro Klick ein
       Zeichen weit, und das ist der einzige Weg, eine anzumelden.

       Geprüft wird mit echten Tastendrücken und nicht mit `fill()`: `fill()`
       setzt den ganzen Wert in einem Ereignis und wäre auch über dem kaputten
       Stand grün geblieben.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Schrift');
    const familie = generator.locator('input[aria-label="Familie des 1. Schnitts"]');
    await familie.click();
    await generator.keyboard.press('End');
    for (const zeichen of ' Kunde') await generator.keyboard.type(zeichen, { delay: 40 });
    await generator.waitForTimeout(200);

    gleich(await familie.inputValue(), 'Zilla Slab Kunde', 'der getippte Name kam nicht an');
    const fokus = await generator.evaluate(() =>
      document.activeElement?.getAttribute('aria-label'),
    );
    gleich(fokus, 'Familie des 1. Schnitts', 'der Fokus fiel beim Tippen weg');

    // Und die Schnitte des Entwurfs bekommen eine eigene Schriftregel, die den
    // Wechsel des Erscheinungsbilds überlebt — sonst beurteilte die Vorschau
    // eine Schrift, die sie nie zeigt.
    await generator.locator('input[aria-label="Familie des 2. Schnitts"]').fill('Zilla Slab Kunde');
    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('rauchschrift');
    await generator.getByLabel('Name in der Auswahl').fill('Rauchschrift');
    await zumSchritt(generator, 'Wortmarke');
    await generator.setInputFiles('input[accept*="svg"]', {
      name: 'r.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">' +
          '<path fill="#000000" d="M4 8 L96 8 L96 40 L4 40 Z"/></svg>',
      ),
    });
    await generator.waitForTimeout(2000);

    const eigen = await generator.evaluate(() => {
      const style = document.getElementById('nz-ci-entwurf-fonts');
      return style ? style.textContent : '';
    });
    wahr(
      /Zilla Slab Kunde/.test(eigen ?? ''),
      'die Schnitte des Entwurfs haben keine eigene Schriftregel',
    );

    await generator.close();
  });

  await pruefe('die Schrittleiste ist ein Tabstopp, nicht acht', async () => {
    /*
       Vorher waren es acht Knöpfe in einer `<nav>`: wer ohne Maus arbeitet,
       lief auf *jedem* Schritt durch acht davon, bevor er im ersten Feld
       stand. Jetzt ein rollender Tabstopp und innen die Pfeiltasten.

       Nach **Tab** wird ausdrücklich nicht gegriffen — geprüft wird deshalb
       auch, dass ein zweites Tab die Leiste wirklich *verlässt*. Wer die Taste
       abfängt, sperrt den Benutzer in dem Bereich ein, den er gerade erreicht
       hat.
    */
    const generator = await oeffneGenerator(kontext);

    await reiter(generator, 'Anfang').focus();
    await generator.keyboard.press('ArrowRight');
    await generator.keyboard.press('ArrowRight');
    await generator.waitForTimeout(300);
    gleich(
      await generator.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Schritt 3: Farbe',
      'die Pfeiltaste hat den Reiter nicht gewechselt',
    );

    // Und der Schritt daneben ist wirklich der offene.
    const offen = await generator.evaluate(
      () => document.querySelector('[role="tabpanel"] h2')?.textContent,
    );
    wahr(/Schritt 3 von 8/.test(offen ?? ''), `der Bereich zeigt „${offen}"`);

    await generator.keyboard.press('End');
    await generator.waitForTimeout(300);
    gleich(
      await generator.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Schritt 8: Fertig',
      'End sprang nicht ans Ende',
    );

    // Ein Tab führt aus der Leiste heraus und nicht zum nächsten Reiter.
    await generator.keyboard.press('Tab');
    await generator.waitForTimeout(200);
    const danach = await generator.evaluate(() => document.activeElement?.getAttribute('role'));
    wahr(danach !== 'tab', 'Tab blieb in der Schrittleiste hängen');

    await generator.close();
  });

  await pruefe('ein Befund führt zu seinem Feld', async () => {
    /*
       „Zu Schritt 3" führte in den Schritt und dort vor sechzehn Farbfelder;
       die Rolle, um die es ging, suchte man von Hand. Das ist die einzige
       Rückzahlung für das, was ein Wizard gegenüber einer langen Seite
       verliert — dort fand man eine Rolle mit ⌘F.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Farbe');
    await setzeFarbe(generator, 'signalSoft', 'knallrot');

    // Der Befund steht in der Prüfliste und trägt einen Weg zum Feld.
    await generator.getByRole('button', { name: 'Zum Feld' }).first().click();
    await generator.waitForTimeout(400);

    const fokus = await generator.evaluate(() => document.activeElement?.id);
    gleich(fokus, 'nz-ci-farbe-signalSoft', 'der Sprung landete nicht im Feld');

    /*
       Und derselbe Weg für den Schritt „Maße", denn dort führte er ins Leere —
       genauer: an die falsche Stelle. Die Größenleiter führt `sm` und `lg`, die
       Schattenversätze führen sie auch, und beide wohnen im selben Schritt: die
       Kennung `nz-ci-masse-sm` gab es damit zweimal. `getElementById` nimmt das
       erste, also sprang ein Befund über einen Schattenversatz in die
       Schriftgrößen und markierte dort einen Wert, an dem nichts falsch war.

       Geprüft wird am *Fokus* und nicht an der Kennung: eine doppelt vergebene
       Kennung ist im DOM nicht verboten, sie ist nur mehrdeutig, und mehrdeutig
       sieht in keiner Zusicherung anders aus als eindeutig — außer in dieser.
    */
    await zumSchritt(generator, 'Maße');
    await generator.locator('#nz-ci-masse-schatten-sm').fill('');
    await generator.locator('#nz-ci-masse-leiter-base').focus();
    await generator.waitForTimeout(400);

    await generator
      .locator('p', { hasText: 'trägt keine Zahl' })
      .getByRole('button', { name: 'Zum Feld' })
      .first()
      .click();
    await generator.waitForTimeout(400);
    gleich(
      await generator.evaluate(() => document.activeElement?.id),
      'nz-ci-masse-schatten-sm',
      'der Befund über den Schattenversatz sprang in die Größenleiter',
    );

    await generator.close();
  });

  await pruefe('der Rücklauf ist ein Vorschlag und wird zurückgenommen', async () => {
    /*
       Vorher hieß der Knopf „Übernehmen und prüfen", geprüft wurde nach dem
       Übernehmen, und zurück ging es nur über „Zurücksetzen", das auch die
       Handarbeit wegwarf. Geprüft wird deshalb die ganze Kette: lesen ändert
       nichts, übernehmen ändert, rückgängig stellt zurück.
    */
    const generator = await oeffneGenerator(kontext);

    await generator
      .getByLabel('Die Antwort des Modells')
      .fill('{"id": "rauchvorschlag", "label": "Rauchvorschlag"}');
    await generator.getByRole('button', { name: 'Antwort lesen' }).click();
    await generator.waitForTimeout(400);

    // Gelesen — und noch nichts übernommen.
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      '',
      'das Lesen hat schon geschrieben',
    );

    await zumSchritt(generator, 'Anfang');
    const bericht = await generator
      .getByRole('region', { name: 'Bericht zum Rücklauf' })
      .innerText();
    wahr(/rauchvorschlag/.test(bericht), 'der Vorschlag nennt den neuen Wert nicht');

    await generator.getByRole('button', { name: /Werte übernehmen/ }).click();
    await generator.waitForTimeout(400);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'rauchvorschlag',
      'das Übernehmen kam nicht an',
    );

    await zumSchritt(generator, 'Anfang');
    await generator.getByRole('button', { name: 'Rückgängig' }).click();
    await generator.waitForTimeout(400);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      '',
      'Rückgängig nahm den Rücklauf nicht zurück',
    );

    await generator.close();
  });

  await pruefe('der Weg zurück verfällt, sobald von Hand gearbeitet wird', async () => {
    /*
       „Rückgängig" nimmt den **ganzen** Entwurf auf den Stand vor dem Rücklauf
       zurück. Solange der Merker liegen blieb, nahm er alles mit, was seither
       von Hand entstanden ist: übernehmen, in Schritt 2 einen Namen eintragen,
       zurück in Schritt 1 — und der Knopf stand noch da und warf den Namen weg.
       Dieselbe Regel gilt schon für den Vorschlag selbst; ein Angebot, das
       gegen einen Stand rechnet, den es nicht mehr gibt, ist keines.
    */
    const generator = await oeffneGenerator(kontext);

    await generator
      .getByLabel('Die Antwort des Modells')
      .fill('{"id": "rauchverfall", "label": "Rauchverfall"}');
    await generator.getByRole('button', { name: 'Antwort lesen' }).click();
    await generator.getByRole('button', { name: /Werte übernehmen/ }).click();
    await generator.waitForTimeout(400);

    // Erst die Gegenprobe: unmittelbar danach steht der Weg zurück offen.
    await zumSchritt(generator, 'Anfang');
    gleich(
      await generator.getByRole('button', { name: 'Rückgängig' }).count(),
      1,
      'der Weg zurück fehlte schon vor der Handarbeit',
    );

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Markenname').fill('von Hand');
    await generator.waitForTimeout(400);

    await zumSchritt(generator, 'Anfang');
    gleich(
      await generator.getByRole('button', { name: 'Rückgängig' }).count(),
      0,
      'der Weg zurück steht noch da und nähme die Handarbeit mit',
    );

    await generator.close();
  });

  await pruefe('das Farbfeld sagt, was es beim Aufräumen getan hat', async () => {
    /*
       `normalisiereFarbe()` gibt zwei Werte zurück, und der zweite ist der
       Satz für die Oberfläche — der Kopf jener Datei schreibt aus, wozu: „Eine
       stille Korrektur ist eine Behauptung: ‚das war gemeint'." Der
       Rücklauf-Bericht hielt sich daran, das Formular nicht: es las den Wert
       und warf den Satz weg.

       Der teuerste Fall ist die weggefallene Deckkraft. Wer `rgba(17, 17, 17,
       0.05)` aus einem Styleguide einsetzt, hat danach Fast-Schwarz im Feld
       statt eines Fünf-Prozent-Grau — und danach sieht es keine Prüfung mehr,
       denn `#111111` ist ein gültiger Wert.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Farbe');
    await setzeFarbe(generator, 'paperAlt', 'rgba(17, 17, 17, 0.05)');
    await generator.waitForTimeout(400);

    const feld = await farbfeldId(generator, 'paperAlt');
    gleich(
      await generator.locator(`#${feld}`).inputValue(),
      '#111111',
      'die Farbe wurde nicht aufgeräumt',
    );
    const gesagt = await generator.evaluate((kennung) => {
      const eingabe = document.getElementById(kennung);
      return eingabe?.closest('div.min-w-0')?.textContent ?? '';
    }, feld);
    wahr(/Deckkraft/.test(gesagt), `die weggefallene Deckkraft wurde verschwiegen: „${gesagt}"`);

    await generator.close();
  });

  await pruefe('eine fremde Datei wird nicht als Entwurf angenommen', async () => {
    /*
       `zusammen()` ergab für eine fremde .json exakt den leeren Entwurf: keine
       Meldung, kein Fehler, und der Sprung nach Schritt 1 sah aus wie ein
       gelungener Ladevorgang — obwohl fünfzig Felder ersetzt wurden. Der Satz
       „… ist kein gesicherter Entwurf" stand daneben und wurde nie erreicht.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('bleibtstehen');
    await generator.waitForTimeout(700);

    generator.on('dialog', (dialog) => void dialog.accept());
    await generator.setInputFiles('input[accept*="json"]', {
      name: 'package.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"name": "nozilla", "version": "1.0.0"}'),
    });
    await generator.waitForTimeout(700);

    const klage = await generator.getByRole('alert').innerText();
    wahr(/kein gesicherter Entwurf/.test(klage), `keine Meldung zur fremden Datei: „${klage}"`);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'bleibtstehen',
      'die fremde Datei hat den Entwurf trotzdem ersetzt',
    );

    await generator.close();
  });

  await pruefe('ein geladener Entwurf fragt, bevor er den offenen ersetzt', async () => {
    /*
       „Sechs Wege ersetzten das Deck, einer fragte" — eine Seite weiter und
       mit fünfzig Feldern statt eines Decks. „Entwurf laden" warf den offenen
       Stand wortlos weg, während „Zurücksetzen" direkt daneben für dieselbe
       Tat um Erlaubnis bittet. Ein Fehlgriff im Dateidialog genügte.

       Gefahren werden beide Richtungen: abgelehnt muss der offene Stand
       stehen bleiben, angenommen muss die Datei ankommen. Eine Frage, die man
       nur wegklicken kann, wäre so schlimm wie keine.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('vonhand');
    await generator.waitForTimeout(700);

    const datei = {
      name: 'geladen.nzci.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ id: 'ausdatei', label: 'Aus Datei' })),
    };

    generator.once('dialog', (dialog) => void dialog.dismiss());
    await generator.setInputFiles('input[accept*="json"]', datei);
    await generator.waitForTimeout(600);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'vonhand',
      'das abgelehnte Laden ersetzte den Entwurf trotzdem',
    );

    generator.once('dialog', (dialog) => void dialog.accept());
    await generator.setInputFiles('input[accept*="json"]', datei);
    await generator.waitForTimeout(600);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'ausdatei',
      'das angenommene Laden kam nicht an',
    );

    await generator.close();
  });

  await pruefe('der Entwurf überlebt ein Neuladen', async () => {
    /*
       Ein ⌘R, ein zugeklappter Laptop, und fünfzig Felder samt der
       ausgesuchten Wortmarken-Datei waren weg — die Datei musste man erneut
       suchen. Der Schlüssel dafür ist ein eigener; dass er den der Deck-Sitzung
       nicht berührt, prüft `ruecklauf.test.ts`.

       Beide Richtungen: bejaht steht der Entwurf wieder da, verneint ist er
       leer. Eine Frage, deren Nein nichts tut, ist keine.
    */
    const generator = await oeffneGenerator(kontext);

    await zumSchritt(generator, 'Marke');
    await generator.getByLabel('Schlüssel').fill('rauchsitzung');
    await generator.getByLabel('Name in der Auswahl').fill('Rauchsitzung');
    await generator.waitForTimeout(900);

    /*
       **Zwei** Dialoge, nicht einer, und in dieser Reihenfolge: erst der
       `beforeunload` des Browsers (weil etwas angefasst wurde), dann die
       eigene Frage „fortsetzen?". Ein `once`-Aufruf fängt deshalb den
       falschen — der zweite wird dann automatisch weggeklickt, und die Prüfung
       meldet einen Fehler, den es nicht gibt. Genau darauf ist die erste
       Fassung hereingefallen.
    */
    const antworte = (ja) => (dialog) => {
      if (dialog.type() === 'beforeunload') return void dialog.accept();
      return void (ja ? dialog.accept() : dialog.dismiss());
    };

    const fortsetzen = antworte(true);
    generator.on('dialog', fortsetzen);
    await generator.reload({ waitUntil: 'networkidle' });
    await warteAufSchriften(generator);
    generator.off('dialog', fortsetzen);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      'rauchsitzung',
      'der Entwurf hat das Neuladen nicht überlebt',
    );

    // Und die Gegenrichtung: wer verneint, fängt wirklich neu an.
    const verwerfen = antworte(false);
    generator.on('dialog', verwerfen);
    await generator.reload({ waitUntil: 'networkidle' });
    await warteAufSchriften(generator);
    generator.off('dialog', verwerfen);
    await zumSchritt(generator, 'Marke');
    gleich(
      await generator.getByLabel('Schlüssel').inputValue(),
      '',
      'das Verneinen hat den alten Entwurf nicht verworfen',
    );

    await generator.close();
  });

  await pruefe('die Prüfliste scrollt die Folie nicht aus dem Bild', async () => {
    /*
       Vorher war die rechte Spalte ein einziger Scroller: wer die Liste las,
       schob die Folie hinaus. Und das traf genau dann, wenn es zählt — nach
       einem mittelmäßigen Rücklauf stehen zwanzig Befunde da, und die Frage
       lautet „was macht dieser Befund mit der Folie".

       Geprüft an der Geometrie und in zwei Fenstergrößen: die Folie muss auch
       nach dem Scrollen der Liste im Bild stehen, und die Überschrift
       „Prüfliste" muss von Anfang an zu sehen sein.
    */
    for (const groesse of [
      { width: 1500, height: 940 },
      { width: 1280, height: 720 },
    ]) {
      const generator = await kontext.newPage();
      await generator.setViewportSize(groesse);
      await oeffneGenerator(kontext, generator);

      const sichtbar = await generator.evaluate(() => {
        const kopf = [...document.querySelectorAll('h2')].find(
          (element) => element.textContent === 'Prüfliste',
        );
        const kasten = kopf?.getBoundingClientRect();
        return kasten ? kasten.top + kasten.height <= window.innerHeight : false;
      });
      wahr(sichtbar, `die Prüfliste steht bei ${groesse.width}×${groesse.height} unter dem Falz`);

      /*
         Und jetzt die Liste scrollen — die Folie muss stehen bleiben.

         Gescrollt wird der **nächste scrollbare Vorfahr** der Überschrift und
         nicht ein geratener Knoten. Genau daran ist die erste Fassung
         gescheitert: sie nahm `parentElement.parentElement`, und über dem
         kaputten Stand war das eine Ebene daneben — die Gegenprobe blieb grün.

         Dass wirklich gescrollt wurde, gehört mitgeprüft. Eine Prüfung, bei
         der sich nichts bewegt, sagt über das Stehenbleiben nichts.
      */
      const vorher = await generator.evaluate(
        () => document.querySelector('svg[role="img"]')?.getBoundingClientRect().top ?? 0,
      );
      const gescrollt = await generator.evaluate(() => {
        const kopf = [...document.querySelectorAll('h2')].find(
          (element) => element.textContent === 'Prüfliste',
        );
        let knoten = kopf?.parentElement ?? null;
        while (knoten) {
          const stil = getComputedStyle(knoten).overflowY;
          if ((stil === 'auto' || stil === 'scroll') && knoten.scrollHeight > knoten.clientHeight) {
            knoten.scrollTop = knoten.scrollHeight;
            return knoten.scrollTop;
          }
          knoten = knoten.parentElement;
        }
        return 0;
      });
      wahr(gescrollt > 0, `bei ${groesse.width}×${groesse.height} war nichts zu scrollen`);

      await generator.waitForTimeout(300);
      const nachher = await generator.evaluate(
        () => document.querySelector('svg[role="img"]')?.getBoundingClientRect().top ?? 0,
      );
      gleich(
        Math.round(nachher),
        Math.round(vorher),
        `die Folie wanderte bei ${groesse.width}×${groesse.height} mit der Liste`,
      );

      await generator.close();
    }
  });

  await pruefe('nichts hat sich in der Konsole beschwert', async () => {
    gleich(fehler.join('\n'), '', 'Fehler in der Konsole');
  });

  await browser.close();
  beende(server);

  const gescheitert = ergebnisse.filter((e) => !e.ok);
  console.log(
    `\n${ergebnisse.length - gescheitert.length} von ${ergebnisse.length} Prüfungen bestanden.`,
  );
  for (const { name, error } of gescheitert) {
    console.error(`\n✗ ${name}\n${error?.stack ?? error}`);
  }
  // Ausdrücklich, nicht durch Auslaufen der Ereignisschleife: Playwright und
  // die Rohre des Servers halten sie offen, und ein Rauchtest, der nur fast
  // fertig wird, hält die ganze CI an.
  process.exit(gescheitert.length > 0 ? 1 : 0);
}

// Die Notbremse. Ein Rauchtest, der klemmt, soll das nach fünf Minuten selbst
// melden und nicht auf die Zeitgrenze der CI warten.
const FRIST = 5 * 60 * 1000;
setTimeout(() => {
  console.error(`\nAbbruch: der Rauchtest kam in ${FRIST / 1000} Sekunden nicht durch.`);
  process.exit(1);
}, FRIST).unref();

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
