/**
 * Der Rauchtest der Oberfläche.
 *
 * ## Warum es ihn gibt
 *
 * Die 3589 Unit-Tests prüfen, was das Werkzeug *herstellt* — Szene, Markup,
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

/** Die vier Zahlenfelder des Inspektors: x, y, Breite, Höhe. */
async function masse(seite) {
  await seite.getByRole('button', { name: 'Element', exact: true }).click();
  await seite.waitForTimeout(300);
  return seite.evaluate(() =>
    [...document.querySelectorAll('aside[aria-label="Inspektor"] input')]
      .slice(0, 4)
      .map((el) => Number(el.value)),
  );
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
  const geschrieben = Math.max(juengstes('src'), statSync('theme.config.ts').mtimeMs);
  if (geschrieben > gebaut) {
    throw new Error(
      'dist/ ist älter als src/ — der Rauchtest liefe gegen den vorigen Stand. Erst `npm run build`.',
    );
  }
}

async function main() {
  pruefeStand();
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
  await seite.waitForTimeout(2500);

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
    await seite.waitForTimeout(500);
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(500);

    const [x] = await masse(seite);
    // Der linke Satzspiegel: dort fängt man zu lesen an, und dort fängt auch
    // alles Eingesetzte an. Die Spalte ist 48 % des Satzspiegels breit.
    gleich(x, 88, 'linke Kante des eingesetzten Elements');
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
    await seite.waitForTimeout(300);
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
    // Für ein Werkzeug, das sich Whiteboard nennt, war ⌘V die auffälligste
    // Lücke: eine Datei *fallen zu lassen* ging, sie *einzufügen* nicht.
    const [x, y] = await masse(seite);
    await seite.keyboard.press('Control+c');
    await seite.waitForTimeout(400);

    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(600);
    await seite.keyboard.press('Control+v');
    await seite.waitForTimeout(900);

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

  await pruefe('⌘F findet ein Wort auf einer anderen Folie', async () => {
    // Die Suche des Browsers fände nur, was gerade auf dem Bildschirm steht —
    // also die eine Folie, die man ohnehin sieht.
    await seite.getByRole('navigation', { name: 'Folien' }).locator('button').first().click();
    await seite.waitForTimeout(500);
    const vorher = Number(
      (await seite.locator('header span.tabular-nums').first().innerText()).split('/')[0],
    );

    await seite.keyboard.press('Control+f');
    await seite.waitForTimeout(400);
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

  await pruefe('ein Diagramm zeichnet die Zahlen, die drinstehen', async () => {
    // Ein Diagramm ist ein Kunde der Szene wie jedes andere Element — deshalb
    // wird hier geprüft, was auf der Folie *steht*, nicht was das Modell hält.
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
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

    const nachher = (await folie()).markup;
    wahr(nachher.includes('>Eins<'), 'die neuen Beschriftungen stehen nicht auf der Folie');
    wahr(!nachher.includes('>2023<'), 'die alten Beschriftungen stehen noch da');
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
    await seite.waitForTimeout(1200);
    const nachher = (await seite.evaluate(FOLIE)).markup;

    wahr(nachher !== vorher, 'die Folie sieht nach dem Wechsel gleich aus');
    wahr(nachher.includes('#FF5A1F'), 'die Signalfarbe des Kunden fehlt');
    wahr(!nachher.includes('#00FF9C'), 'das Grün von nozilla steht noch auf der Folie');

    await auswahl.selectOption('nozilla');
    await seite.waitForTimeout(1200);
  });

  await pruefe('die dunkle Erscheinung lässt die Folie in Ruhe', async () => {
    // Die Garantie, an der alles hängt: eine Einstellung des Arbeitsplatzes
    // darf niemals in einer Datei landen.
    const vorher = (await seite.evaluate(FOLIE)).markup;

    await seite.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await seite.waitForTimeout(300);
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
    await seite.waitForTimeout(500);
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
    await seite.waitForTimeout(900);
    wahr((await seite.evaluate(FOLIE)).markup !== vorher, 'die Folie blieb stehen');
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
    await referent.waitForTimeout(2500);

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
    await seite.waitForTimeout(900);
    wahr(
      (await seite.evaluate(FOLIE)).markup !== vorher,
      'das Blättern in der Referentenansicht kam im Vortrag nicht an',
    );

    await referent.close();
    await seite.waitForTimeout(400);
  });

  await pruefe('Esc führt zurück an die Arbeit', async () => {
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(900);
    wahr(
      await seite.getByRole('button', { name: 'Export', exact: true }).count(),
      'die Kopfleiste kam nicht zurück',
    );
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
