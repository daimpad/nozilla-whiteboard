/// <reference types="vite/client" />

/**
 * Zur Bauzeit eingesetzt (siehe `vite.config.ts`). Keine Umgebungsvariablen:
 * die fertige Anwendung ist ein Verzeichnis statischer Dateien und hat zur
 * Laufzeit niemanden, den sie fragen könnte.
 */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;
