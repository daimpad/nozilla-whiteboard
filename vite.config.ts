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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
