/**
 * Die Marken-Schriften einbinden — und dafür sorgen, dass danach neu gemessen
 * wird.
 *
 * Zilla Slab, Inter und Space Mono liegen als WOFF2 selbst gehostet unter
 * `public/fonts/` (SIL Open Font License 1.1) — dieselbe Entscheidung wie im
 * CI-Repo: das Werkzeug rendert offline, ohne Dritt-CDN.
 *
 * Die `@font-face`-Regeln entstehen zur Laufzeit aus `theme.config.ts`, damit
 * die Dateiliste an genau einer Stelle steht.
 *
 * ## Warum hier mehr steht als ein `<style>`-Element
 *
 * Der Setzer misst mit `measureText()` gegen die *echte* Schrift und gibt
 * Wörter an absoluten Positionen aus. Wird gemessen, bevor die Schrift da ist,
 * misst er die Ersatzschrift — und die Positionen bleiben falsch, auch wenn
 * später die richtigen Glyphen gezeichnet werden. Wörter kleben dann aneinander
 * oder stehen zu weit auseinander.
 *
 * Zwei Dinge sind dagegen nötig, und beide waren vorher nicht da:
 *
 * 1. **Die Schnitte werden angefordert.** Ein `@font-face` allein lädt nichts —
 *    der Browser holt eine Datei erst, wenn ein gezeichnetes Zeichen sie
 *    braucht. `document.fonts.ready` kann also auflösen, *bevor* eine der
 *    Marken-Schriften überhaupt angefragt wurde. `document.fonts.load()` fragt
 *    sie ausdrücklich an.
 * 2. **Danach wird neu gezeichnet.** Den Messpuffer zu leeren reicht nicht:
 *    ohne Zustandsänderung baut React die Szene nicht neu, und das alte,
 *    falsch gesetzte Markup bleibt stehen. Deshalb der kleine Abonnenten-Satz
 *    unten, an dem die Fläche hängt.
 */
import { fontFamily, webfont } from './runtime';
import { resetMeasurementCache } from '@/lib/text/measure';

const STYLE_ID = 'nz-webfonts';

/* -------------------------------------------------------------------------- */
/* Signal: „die Schriften sind da"                                             */
/* -------------------------------------------------------------------------- */

/**
 * Ein Zähler, keine Ja-Nein-Marke.
 *
 * `useSyncExternalStore` zeichnet nur neu, wenn sich der Schnappschuss ändert.
 * Ein `true`, das `true` bleibt, löst beim zweiten Mal nichts aus — und ein
 * zweites Mal gibt es: erst greift die Notbremse unten, später kommen die
 * Schriften doch noch an.
 */
let version = 0;
const listeners = new Set<() => void>();

/** Für `useSyncExternalStore` — die Fläche hängt daran und zeichnet neu. */
export function subscribeFontsReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function fontsVersion(): number {
  return version;
}

function announce(): void {
  version += 1;
  // Erst der Puffer, dann die Abonnenten: wer neu misst, soll die echten
  // Vorschübe bekommen und nicht die der Ersatzschrift.
  resetMeasurementCache();
  for (const listener of listeners) listener();
}

/* -------------------------------------------------------------------------- */

/**
 * Die Schnitte des gerade gewählten Erscheinungsbilds einbinden.
 *
 * Mehrfach aufrufbar, und das ist keine Bequemlichkeit: ein Kunde bringt seine
 * eigenen Schriften mit. Die alten `@font-face`-Regeln werden dabei ersetzt
 * und nicht ergänzt — sonst blieben die Schnitte des vorigen Erscheinungsbilds
 * im Dokument stehen und der Setzer könnte sie treffen.
 */
export function installWebfonts(base = import.meta.env.BASE_URL ?? '/'): void {
  if (!webfont.enabled) return;
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();

  const prefix = `${base.replace(/\/$/, '')}/${webfont.directory}`;
  const rules = webfont.faces
    .map(
      (face) => `@font-face {
  font-family: '${face.family}';
  src: url('${prefix}/${face.file}') format('${webfont.format}');
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

  loadFaces();
}

/**
 * Jeden deklarierten Schnitt anfordern und abwarten.
 *
 * Ein einzelner Fehlschlag darf den Rest nicht aufhalten — fehlt eine Datei,
 * setzt das Werkzeug in der Ersatzschrift, und das ist besser als eine Fläche,
 * die nie neu misst.
 */
function loadFaces(): void {
  if (!('fonts' in document)) return;

  const requests = webfont.faces.map((face) =>
    document.fonts
      // Die Größe ist beliebig, aber Pflicht: `load()` erwartet eine
      // vollständige CSS-`font`-Kurzschreibweise.
      .load(`${face.style} ${face.weight} 16px '${face.family}'`)
      .catch(() => []),
  );

  void Promise.all(requests)
    .then(() => document.fonts.ready)
    .catch(() => undefined)
    .then(() => announce());

  // Notbremse: hängt das Netz, wird nach zwei Sekunden trotzdem neu gemessen.
  // Dann steht die Ersatzschrift, aber wenigstens passen die Abstände zu dem,
  // was zu sehen ist — und der Lauf oben korrigiert es später noch einmal.
  window.setTimeout(() => announce(), 2000);
}

/** Der Schriftstapel einer Rolle — als Fassade, damit `@theme` nicht überall steht. */
export function familyStack(role: keyof typeof fontFamily): string {
  return fontFamily[role];
}
