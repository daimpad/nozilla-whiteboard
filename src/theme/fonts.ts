/**
 * Die Marken-Schriften einbinden.
 *
 * Zilla Slab, Inter und Space Mono liegen selbst gehostet unter
 * `public/fonts/` (SIL Open Font License 1.1) — dieselbe Entscheidung wie im
 * CI-Repo: das Werkzeug rendert offline, ohne Dritt-CDN.
 *
 * Die `@font-face`-Regeln entstehen zur Laufzeit aus `theme.config.ts`, damit
 * die Dateiliste an genau einer Stelle steht.
 */
import { webfont } from '@theme';
import { resetMeasurementCache } from '@/lib/text/measure';

const STYLE_ID = 'nz-webfonts';

export function installWebfonts(base = import.meta.env.BASE_URL ?? '/'): void {
  if (!webfont.enabled) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const prefix = `${base.replace(/\/$/, '')}/${webfont.directory}`;
  const rules = webfont.faces
    .map(
      (face) => `@font-face {
  font-family: '${face.family}';
  src: url('${prefix}/${face.file}') format('truetype');
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;
}`,
    )
    .join('\n');

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = rules;
  document.head.appendChild(style);

  // Vor dem Laden gemessene Vorschübe sind danach falsch.
  if ('fonts' in document) {
    void document.fonts.ready.then(() => resetMeasurementCache());
  }
}
