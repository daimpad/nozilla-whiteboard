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
import type { WebfontFace } from './brandTheme';
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
 * Die `@font-face`-Regeln zu einer Schnittliste.
 *
 * Öffentlich, weil ein zweiter Leser sie braucht: der CI-Generator bindet die
 * Schnitte eines *Entwurfs* ein, der noch in keinem Erscheinungsbild steht.
 * Zwei Stellen, die dieselbe Regel schreiben, liefen auseinander — und man
 * sähe es erst an einer fremden Schrift, die nicht lädt.
 */
export function fontFaceRules(
  faces: readonly WebfontFace[],
  base = import.meta.env.BASE_URL ?? '/',
): string {
  const prefix = `${base.replace(/\/$/, '')}/${webfont.directory}`;
  return faces
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
}

/**
 * Regeln unter einer eigenen Kennung ins Dokument legen.
 *
 * Getrennte Kennungen, damit sich zwei Sätze nicht gegenseitig entfernen: der
 * Generator schreibt die Schnitte seines Entwurfs neben die des gültigen
 * Erscheinungsbilds und nicht darüber. Genau daran ist die Vorschau vorher
 * gescheitert — `installWebfonts()` räumt bei jedem Wechsel auf, und die
 * fremde Schrift war weg, bevor der Browser malte.
 */
export function setzeSchriftregeln(id: string, regeln: string): void {
  if (typeof document === 'undefined') return;
  const vorhanden = document.getElementById(id);
  if (vorhanden) {
    // Nur schreiben, wenn sich etwas geändert hat: ein Austausch fordert die
    // Dateien erneut an, und das Formular ruft hier bei jedem Anschlag vorbei.
    if (vorhanden.textContent === regeln) return;
    vorhanden.textContent = regeln;
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = regeln;
  document.head.appendChild(style);
}

/**
 * Die Schnitte des gerade gewählten Erscheinungsbilds einbinden.
 *
 * Mehrfach aufrufbar, und das ist keine Bequemlichkeit: eine fremde Marke
 * bringt ihre eigenen Schriften mit. Die alten `@font-face`-Regeln werden dabei ersetzt
 * und nicht ergänzt — sonst blieben die Schnitte des vorigen Erscheinungsbilds
 * im Dokument stehen und der Setzer könnte sie treffen.
 *
 * Ersetzt wird dabei nur, was unter `STYLE_ID` steht. Ein Satz unter einer
 * anderen Kennung — die Entwurfsschnitte des CI-Generators — bleibt liegen;
 * das ist der Sinn der Trennung.
 */
export function installWebfonts(base = import.meta.env.BASE_URL ?? '/'): void {
  if (!webfont.enabled) return;
  if (typeof document === 'undefined') return;

  const regeln = fontFaceRules(webfont.faces, base);
  const vorhanden = document.getElementById(STYLE_ID);

  /*
     Nichts tun, wenn nichts anders ist — und das ist keine Sparsamkeit,
     sondern der Riegel gegen eine Schleife.

     `loadFaces()` fordert die Schnitte an und zählt danach einen Zähler hoch,
     an dem die Fläche hängt. Wer diese Funktion bei jedem Anlass ruft, löst
     also ein Neuzeichnen aus; kommt der Anlass aus dem Zeichnen selbst, dreht
     sich das im Kreis. Genau das tat der CI-Generator: seine Vorschau meldet
     ihren Entwurf an und stellt hinterher zurück, an jedem Wechsel hängt der
     Abonnent aus `main.tsx`, und der ruft hier vorbei. Gemessen wurden
     **11.505 Läufe in sechs Sekunden** — eine Seite, die einen Kern auslastet,
     solange sie offen steht, ohne dass etwas davon zu sehen wäre.

     Der Vergleich ist der Text der Regeln und nicht die Kennung des
     Erscheinungsbilds: zwei Marken mit denselben Schriften brauchen keinen
     zweiten Ladelauf, und dieselbe Marke unter anderem `base` sehr wohl.
  */
  if (vorhanden && vorhanden.textContent === regeln) return;

  vorhanden?.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = regeln;
  document.head.appendChild(style);

  loadFaces(webfont.faces);
}

/**
 * Jeden deklarierten Schnitt anfordern und abwarten.
 *
 * Ein einzelner Fehlschlag darf den Rest nicht aufhalten — fehlt eine Datei,
 * setzt das Werkzeug in der Ersatzschrift, und das ist besser als eine Fläche,
 * die nie neu misst.
 */
export function loadFaces(faces: readonly WebfontFace[]): void {
  if (typeof document === 'undefined' || !('fonts' in document)) return;

  const requests = faces.map((face) =>
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
