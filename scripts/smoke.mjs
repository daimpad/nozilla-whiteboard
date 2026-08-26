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
  await seite.waitForTimeout(300);
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
    await seite.waitForTimeout(500);
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(600);

    await seite.getByRole('button', { name: 'Element', exact: true }).click();
    await seite.waitForTimeout(300);
    const feld = seite.locator('aside[aria-label="Inspektor"] textarea').first();
    const vorher = await feld.inputValue();

    await feld.click();
    await seite.keyboard.press('Control+a');
    await seite.keyboard.type('Handgeschrieben', { delay: 40 });
    await seite.waitForTimeout(400);
    gleich(await feld.inputValue(), 'Handgeschrieben', 'was im Feld steht');
    wahr(await steht('Handgeschrieben'), 'das Getippte steht nicht auf der Folie');

    /*
       Vor dem ⌘Z aus dem Feld heraus — und das ist keine Umständlichkeit,
       sondern der Weg. Solange der Zeiger im Feld steht, gehört ⌘Z dem
       Browser (`isTypingTarget` in `useKeyboardShortcuts`), und der nimmt
       einen Anschlag zurück, nicht einen Verlaufsschritt. Der erste Anlauf
       dieser Prüfung maß genau das und meldete „Handgeschriebe".
    */
    await klickeLeereFolie(seite);
    await seite.waitForTimeout(300);

    await seite.keyboard.press('Control+z');
    await seite.waitForTimeout(500);

    // Ein einziges ⌘Z bringt den ganzen Satz zurück auf den Stand davor.
    wahr(await steht(vorher), `der Text nach einem ⌘Z — „${vorher}" fehlt auf der Folie`);
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
    await seite.waitForTimeout(500);
    await seite.locator('aside button').filter({ hasText: 'Karte' }).first().click();
    await seite.waitForTimeout(600);
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(300);

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
    await seite.waitForTimeout(4000);

    const foto = await eingebettet();
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
    await seite.waitForTimeout(4000);

    const schirm = await eingebettet();
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
    await seite.waitForTimeout(4000);

    const kante = await eingebettet();
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

  await pruefe('⌘F ersetzt, und ⌘Z nimmt es in einem Zug zurück', async () => {
    /*
       Die Suche fand, konnte aber nichts ändern — wer eine Zahl auf vierzig
       Folien austauschen wollte, ging sie einzeln durch.

       Geprüft wird am *Bild* und am Verlauf, nicht an der Trefferliste: dass
       die Liste leer wird, wüsste sie auch dann zu melden, wenn das Ersetzen
       gar nichts geschrieben hätte.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
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
    await seite.waitForTimeout(400);
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

  await pruefe('eine Tabelle teilt ihre Spalten nach dem, was drinsteht', async () => {
    /*
       Die Spaltenbreiten sind der Grund für diese Prüfung.

       Zu gleichen Teilen war es lange, und es sah aus wie ein Raster: die
       schmale Spalte stand als Loch daneben, während die breite umbrach. Am
       Markup ist das nicht zu sehen — wohl aber an den Kästen der Textknoten,
       und die verrät `getBBox()`.
    */
    await seite.getByRole('button', { name: 'Folie hinzufügen', exact: true }).click();
    await seite.waitForTimeout(500);
    await seite.locator('aside button').filter({ hasText: 'Tabelle' }).first().click();
    await seite.waitForTimeout(900);

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
    await seite.waitForTimeout(1500);

    // Sichtbar sein muss es auch: eine Folie, der die Elemente fehlen, ohne
    // dass irgendwo steht warum, ist der halbe Fehler.
    wahr(
      (await seite.getByText('ließ sich nicht lesen').count()) === 1,
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
