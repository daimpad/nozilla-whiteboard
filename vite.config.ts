import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Woher die Version kommt, die das Werkzeug unten links anzeigt.
 *
 * Sie wird zur *Bauzeit* eingesetzt, nicht zur Laufzeit gelesen: was auf
 * board.nozilla.net liegt, ist ein Verzeichnis mit statischen Dateien und hat
 * kein Repository dabei. Der Commit ist die einzige Angabe, mit der sich ein
 * gemeldeter Fehler wieder auf einen Stand zurückführen lässt — die Nummer aus
 * `package.json` allein ändert sich zu selten dafür.
 *
 * Fehlt Git (ein entpacktes Archiv, ein Container ohne `.git`), steht dort
 * „lokal". Das ist ehrlicher als ein erfundener Commit.
 */
function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const commit = git('rev-parse', '--short=7', 'HEAD') || 'lokal';
// Der Zeitstempel des Commits und nicht der des Bauens: zweimal denselben Stand
// zu bauen soll zweimal dasselbe ergeben.
const built = git('log', '-1', '--format=%cI') || new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILT__: JSON.stringify(built),
  },
  // Relative base so `dist/` can be opened straight from the file system —
  // this is a local-only application, there is no server to deploy to.
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@theme': fileURLToPath(new URL('./theme.config.ts', import.meta.url)),
      /*
         Die beiden Wege von jsPDF, die dieses Werkzeug nicht geht.

         `doc.svg()` und `doc.html()` laden `canvg` und `html2canvas` im Rumpf
         über einen dynamischen Import nach. Gerufen wird keiner von beiden —
         das PDF entsteht hier aus der `Scene` —, aber Rollup sieht die
         Ausdrücke und legt zwei Lazy-Chunks an: 202 kB und 160 kB, die
         ausgeliefert werden und die kein Browser je anfordert. Warum ein
         leeres Modul und kein `external`, steht im Kopf von `jspdfOhne.ts`.

         `dompurify` ist der dritte im Bunde — und stand hier lange ausdrücklich
         *nicht*, mit der Begründung, dieses Werkzeug benutze es selbst:
         `lib/markdown/render.ts` reinige damit das eingebettete HTML. Der Satz
         stimmte einmal. Nachgezählt hatte `renderMarkdown()` keinen einzigen
         Aufrufer mehr — die Fläche zeichnet längst über dieselbe
         Zeichenstrecke wie der SVG-Export, es gibt kein HTML, das jemand
         einsetzt. Gekostet hat der tote Weg 22 kB als eigenen Lazy-Chunk und
         30 kB im Hauptbündel, weil der Import dort statisch stand.
      */
      canvg: fileURLToPath(new URL('./src/lib/export/jspdfOhne.ts', import.meta.url)),
      html2canvas: fileURLToPath(new URL('./src/lib/export/jspdfOhne.ts', import.meta.url)),
      dompurify: fileURLToPath(new URL('./src/lib/export/jspdfOhne.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      /*
         Zwei Einstiege, und beide müssen hier stehen: `input` *ersetzt* die
         Vorgabe. Wer nur `ci` einträgt, bekommt ein `dist/` ohne
         `index.html` — `npm run build` läuft durch, `vite preview` liefert
         eine Verzeichnisliste, und der Rauchtest bricht erst beim Starten der
         Vorschau ab.

         Beide liegen dabei im Wurzelverzeichnis von `dist/` und nicht in
         Unterordnern. `base: './'` löst jede URL gegen die Dokumentadresse
         auf — aus `/ci/index.html` würde `/ci/fonts/…`, und jede
         Marken-Schrift fehlte still, mit Ersatzschrift und ohne Fehler.
      */
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        ci: fileURLToPath(new URL('./ci.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    /*
       Auch die Skripte. `scripts/ciAbgleich.mjs` trägt die Rechnung, die einen
       CI-Sync vor sich selbst schützt — sie hat zwei Kunden, das Skript und
       ihre Prüfung, und ohne diese Zeile liefe die zweite nie mit.
    */
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.mjs'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
