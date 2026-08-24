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

async function main() {
  const server = await starteVorschau();
  const browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROMIUM || undefined,
    args: ['--no-sandbox'],
  });
  const seite = await (
    await browser.newContext({ viewport: { width: 1500, height: 940 }, acceptDownloads: true })
  ).newPage();

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

  await pruefe('ein Baustein landet rechtsbündig am Satzspiegel', async () => {
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(500);

    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    await seite.waitForTimeout(300);
    const werte = await seite.evaluate(() => {
      const zahlen = [...document.querySelectorAll('aside[aria-label="Inspektor"] input')]
        .map((el) => el.value)
        .slice(0, 4);
      return zahlen.map(Number);
    });
    const [x, , breite] = werte;
    // 1280 − 88 = 1192, der rechte Satzspiegel.
    gleich(x + breite, 1192, 'rechte Kante des eingesetzten Elements');
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
