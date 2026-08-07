/**
 * Optional web-font installation.
 *
 * The CI names a licensed display face, but the application must work without
 * it — so the `@font-face` rules are injected at runtime from
 * `theme.config.ts#webfont` rather than declared in CSS. A missing file is a
 * non-event: the browser falls through to the next family in the stack, and the
 * build never depends on a binary asset.
 */
import { webfont } from '@theme';
import { resetMeasurementCache } from '@/lib/text/measure';

const STYLE_ID = 'nzl-webfonts';

export function installWebfonts(base = import.meta.env.BASE_URL ?? '/'): void {
  if (!webfont.enabled) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const prefix = `${base.replace(/\/$/, '')}/${webfont.directory}`;
  const rules = webfont.faces
    .map(
      (face) => `@font-face {
  font-family: '${webfont.family}';
  src: url('${prefix}/${face.file}') format('woff2');
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

  // Measured advances taken before the face arrives are stale.
  if ('fonts' in document) {
    void document.fonts.ready.then(() => resetMeasurementCache());
  }
}
