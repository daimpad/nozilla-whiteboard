/**
 * Die Schriftdateien für den Export beschaffen.
 *
 * Auf dem Bildschirm reicht WOFF2 — der Browser lädt es über `@font-face` und
 * zeichnet damit. Der Export braucht mehr:
 *
 *   PDF       jsPDF bettet TrueType ein (und bildet dabei eine Teilmenge aus
 *             den benutzten Zeichen). WOFF2 kann es nicht lesen.
 *   Pfade     Der Umriss-Leser (`lib/text/truetype.ts`) braucht die
 *             unkomprimierten `glyf`-Konturen, also ebenfalls TrueType.
 *   SVG       Hier ist WOFF2 richtig: es wird als Daten-URI in eine
 *             `@font-face`-Regel *in der Datei* gelegt und ist rund zwei
 *             Drittel kleiner.
 *
 * Deshalb liegen beide Formate in `public/fonts/`. Geladen wird nichts davon
 * beim Start — erst wenn jemand exportiert, und dann nur die Schnitte, die auf
 * den Folien wirklich vorkommen.
 */
import { webfont, familyName, fontFamily, syntheticItalicDegrees } from '@/theme';
import type { FontFamilyKey, FontSpec } from '@/lib/text/measure';
import { parseTrueType, type TrueTypeFont } from '@/lib/text/truetype';

export interface FaceRef {
  /** Rolle im Satzspiegel. */
  role: FontFamilyKey;
  /** Familienname, wie er in der Schrift und im PDF steht. */
  family: string;
  /** Der Schnitt, den diese Datei trägt — nicht zwingend der gewünschte. */
  weight: number;
  file: string;
  /** Stabiler Schlüssel, auch als jsPDF-Fontname benutzbar. */
  id: string;
}

/**
 * Den Schnitt auflösen, der einem gewünschten Gewicht am nächsten kommt.
 *
 * Die CI liefert nicht jedes Gewicht für jede Familie — Zilla Slab beginnt bei
 * 500, Space Mono kennt nur 400 und 700. Der Bildschirm löst das still über die
 * Schriftauswahl des Browsers; der Export muss dieselbe Wahl bewusst treffen,
 * sonst weicht er genau dort ab, wo niemand hinschaut.
 */
export function resolveFace(spec: Pick<FontSpec, 'family' | 'weight'>): FaceRef | null {
  const family = familyName(spec.family);
  const candidates = webfont.faces.filter(
    (face) => face.family === family && face.style === 'normal',
  );
  if (candidates.length === 0) return null;

  const best = candidates.reduce((closest, face) =>
    Math.abs(face.weight - spec.weight) < Math.abs(closest.weight - spec.weight) ? face : closest,
  );

  return {
    role: spec.family,
    family,
    weight: best.weight,
    file: best.file,
    id: best.file.replace(/\.\w+$/, ''),
  };
}

/**
 * Wie stark ein kursiver Lauf geschert werden muss — oder `0`.
 *
 * Der Bildschirm schert selbst, wenn eine Familie keinen kursiven Schnitt
 * führt; die beiden Ausgaben, die ihre Glyphen selbst zeichnen, taten es
 * nicht. `*kursiv*` stand damit im PDF und im PNG aufrecht, während SVG und
 * PowerPoint es schräg zeigten — nachgemessen mit `pdfjs-dist`: „Aufrecht"
 * und „Kursiv" kamen beide als `Inter-Regular` zurück.
 *
 * **Nur wenn es wirklich keinen gibt.** `resolveFace()` sucht heute
 * ausdrücklich nur unter `style === 'normal'`; wer ihm eines Tages beibringt,
 * einen kursiven Schnitt zu nehmen, bekäme sonst beides — den echten Schnitt
 * *und* die Schere. Gefragt wird deshalb die Schnittliste des
 * Erscheinungsbilds und nicht das, was `resolveFace()` gerade tut.
 */
export function kursivNeigung(spec: Pick<FontSpec, 'family' | 'weight' | 'italic'>): number {
  if (!spec.italic) return 0;
  const family = familyName(spec.family);
  const echter = webfont.faces.some((face) => face.family === family && face.style === 'italic');
  return echter ? 0 : Math.tan((syntheticItalicDegrees * Math.PI) / 180);
}

/** Alle Schnitte, die eine Menge von Vorgaben zusammen anfordert. */
export function facesFor(specs: Iterable<Pick<FontSpec, 'family' | 'weight'>>): FaceRef[] {
  const seen = new Map<string, FaceRef>();
  for (const spec of specs) {
    const face = resolveFace(spec);
    if (face && !seen.has(face.id)) seen.set(face.id, face);
  }
  return [...seen.values()];
}

/* -------------------------------------------------------------------------- */
/* Laden                                                                       */
/* -------------------------------------------------------------------------- */

function baseUrl(): string {
  const base = import.meta.env?.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}/${webfont.directory}`;
}

const bytesCache = new Map<string, Promise<ArrayBuffer>>();

/**
 * Woran eine Schriftdatei zu erkennen ist: an ihren ersten vier Bytes.
 *
 * `response.ok` allein sagt nichts. Ein Server, der für eine Einzelseiten-App
 * ausliefert — `vite preview` ebenso wie die `.htaccess` dieses Projekts —,
 * beantwortet eine **fehlende** Datei mit Status 200 und der `index.html`.
 * Gemessen: `/fonts/KundeA-Bold.woff2` kam als `200 text/html` mit 842 Bytes.
 * Der SVG-Export bettete diese Seite danach als Schrift ein, und der
 * Umriss-Leser warf eine Meldung, die auf alles zeigte außer auf die fehlende
 * Datei. Die Kennung ist die eine Frage, die keine Server-Einstellung
 * beantworten kann.
 */
const KENNUNGEN: Record<'woff2' | 'ttf', readonly string[]> = {
  woff2: ['wOF2'],
  // 0x00010000 = TrueType, 'true' = die ältere Apple-Variante; dieselben zwei,
  // die `parseTrueType()` annimmt.
  ttf: ['\u0000\u0001\u0000\u0000', 'true'],
};

function pruefeKennung(file: string, bytes: ArrayBuffer): void {
  const art = file.endsWith('.ttf') ? 'ttf' : 'woff2';
  const kopf = String.fromCharCode(...new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength)));
  if (KENNUNGEN[art].includes(kopf)) return;
  const html = /^\s*</.test(
    new TextDecoder().decode(new Uint8Array(bytes, 0, Math.min(64, bytes.byteLength))),
  );
  throw new Error(
    `${file} liegt nicht vor — der Server lieferte ${html ? 'eine HTML-Seite' : `etwas anderes als eine ${art.toUpperCase()}-Datei`}`,
  );
}

function fetchBytes(file: string): Promise<ArrayBuffer> {
  const hit = bytesCache.get(file);
  if (hit) return hit;
  const pending = fetch(`${baseUrl()}/${file}`).then(async (response) => {
    if (!response.ok) throw new Error(`Schrift ${file} nicht ladbar (${response.status})`);
    const bytes = await response.arrayBuffer();
    pruefeKennung(file, bytes);
    return bytes;
  });
  bytesCache.set(file, pending);
  return pending;
}

/**
 * Liegt ein Schnitt in beiden Fassungen vor, die dieses Werkzeug braucht?
 *
 * Gibt `null` zurück, wenn ja, sonst den Grund. Gefragt wird über denselben
 * Abruf, mit dem der Export die Dateien später holt — eine zweite Rechnung
 * für „liegt die Datei da" liefe auseinander, und zwar genau an der Stelle,
 * an der der Server eine fehlende Datei mit Status 200 beantwortet. Was hier
 * geholt wird, ist danach auch für den Export schon da.
 */
export async function schnittFehlt(file: string): Promise<string | null> {
  try {
    await Promise.all([fetchBytes(file), fetchBytes(file.replace(/\.woff2$/, '.ttf'))]);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Die TrueType-Fassung eines Schnitts (für PDF-Einbettung und Umrisse). */
export function loadTtf(face: FaceRef): Promise<ArrayBuffer> {
  return fetchBytes(face.file.replace(/\.woff2$/, '.ttf'));
}

/** Die WOFF2-Fassung (für die Einbettung in eine SVG-Datei). */
export function loadWoff2(face: FaceRef): Promise<ArrayBuffer> {
  return fetchBytes(face.file);
}

const parsedCache = new Map<string, Promise<TrueTypeFont>>();

/** Einen Schnitt als lesbare Umriss-Quelle. */
export function loadOutlines(face: FaceRef): Promise<TrueTypeFont> {
  const hit = parsedCache.get(face.id);
  if (hit) return hit;
  const pending = loadTtf(face).then(parseTrueType);
  parsedCache.set(face.id, pending);
  return pending;
}

/* -------------------------------------------------------------------------- */
/* Kodierung                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Bytes → Base64, in Blöcken. `String.fromCharCode(...bytes)` in einem Rutsch
 * sprengt bei einer 300-kB-Schrift den Aufrufstapel.
 */
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Die `@font-face`-Regeln, die in eine exportierte SVG-Datei wandern.
 *
 * Der Fallback-Stapel aus `theme.config.ts` bleibt hinter dem eingebetteten
 * Namen stehen: öffnet jemand die Datei in einem Programm, das eingebettete
 * Schriften ignoriert (Illustrator, Inkscape), fällt sie auf dieselbe
 * Systemschrift zurück wie ohne Einbettung — und nicht auf gar nichts.
 */
export async function embeddedFontCss(faces: readonly FaceRef[]): Promise<string> {
  if (faces.length === 0) return '';
  const rules = await Promise.all(
    faces.map(async (face) => {
      const base64 = toBase64(await loadWoff2(face));
      return [
        '@font-face {',
        `  font-family: '${face.family}';`,
        `  font-weight: ${face.weight};`,
        '  font-style: normal;',
        `  src: url(data:font/woff2;base64,${base64}) format('woff2');`,
        '}',
      ].join('\n');
    }),
  );
  return rules.join('\n');
}

/** Der Schriftstapel, den ein Textelement im SVG bekommt. */
export function familyStackFor(role: FontFamilyKey): string {
  return fontFamily[role];
}
