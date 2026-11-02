/**
 * Die Schriftdateien, die jemand selbst mitgebracht hat.
 *
 * Bis hierher kam ein Schnitt nur über `public/fonts/` ins Werkzeug, also über
 * das Repo. Ein importiertes Erscheinungsbild mit einer Hausschrift stand
 * damit auf jedem Rechner außer dem des Entwicklers in der Ersatzschrift. Die
 * Ablage hier hält hochgeladene TrueType-Dateien im Browser und reicht sie an
 * genau die beiden Stellen, die sonst `public/fonts/` fragen: die
 * `@font-face`-Regeln des Bildschirms (`fonts.ts`) und den Export
 * (`fontFiles.ts`). Beide fragen zuerst hier — ein Schnitt, der in der Ablage
 * liegt, *ist* für dieses Werkzeug die Datei.
 *
 * ## Warum IndexedDB und nicht `localStorage`
 *
 * Ein Schnitt hat 100 bis 400 kB. Die Ablage im `localStorage` fasst rund fünf
 * Millionen Zeichen und teilt sie mit der Selbstsicherung des Decks und den
 * importierten Erscheinungsbildern; drei Schnitte als Base64, und die
 * Selbstsicherung scheiterte — der Fehler, der in CLAUDE.md unter „Ein
 * eingebettetes Bild legte die Selbstsicherung still" steht. IndexedDB nimmt
 * die Bytes, wie sie sind, und hat ihren eigenen Platz.
 *
 * Geladen wird beim Start einmal alles in den Speicher (`ladeSchriftablage()`),
 * und gefragt wird danach synchron. Die beiden Kunden fragen aus Rechnungen,
 * die nicht warten können: `fontFaceRules()` baut einen Text, `fetchBytes()`
 * entscheidet, woher es holt.
 *
 * ## Zwei Fenster
 *
 * Der CI-Generator läuft in einem eigenen Tab und lädt dort hoch; das Werkzeug
 * daneben soll es wissen, ohne neu geladen zu werden. IndexedDB kennt kein
 * `storage`-Ereignis, deshalb sagt es ein `BroadcastChannel`.
 */
import { liesSchriftdatei, type Schriftangaben } from '@/lib/text/schriftdatei';

export interface EigenerSchnitt extends Schriftangaben {
  /** Der Name der TrueType-Datei, unter dem ein Erscheinungsbild ihn nennt. */
  datei: string;
  bytes: ArrayBuffer;
}

const DATENBANK = 'nz-schriften';
const LAGER = 'schnitte';
const KANAL = 'nz-schriften';

const ablage = new Map<string, EigenerSchnitt>();
const adressen = new Map<string, string>();
const horcher = new Set<() => void>();
let version = 0;
let geladen: Promise<void> | null = null;
let kanal: BroadcastChannel | null = null;

/**
 * Der Name, unter dem ein Schnitt hier steht.
 *
 * Ein Erscheinungsbild nennt seine Schnitte als `.woff2` (die Bibliothek) oder
 * als `.ttf` (ein hochgeladener). Gesucht wird beide Male die TrueType-Datei —
 * dieselbe Regel, nach der `loadTtf()` aus einer `.woff2` die `.ttf` macht.
 */
export function ttfName(datei: string): string {
  return datei.replace(/\.woff2$/, '.ttf');
}

export function eigeneSchrift(datei: string): EigenerSchnitt | undefined {
  return ablage.get(ttfName(datei));
}

/**
 * Eine Adresse, unter der der Browser den Schnitt laden kann.
 *
 * Einmal je Schnitt und nicht je Aufruf: `installWebfonts()` vergleicht den
 * Text der Regeln, um nicht im Kreis zu laden — eine neue Adresse bei jedem
 * Bauen hieße neue Regeln bei jedem Bauen, und genau diese Schleife steht in
 * CLAUDE.md mit elftausend Umläufen.
 */
export function eigeneSchriftUrl(datei: string): string | null {
  const schnitt = eigeneSchrift(datei);
  if (!schnitt || typeof URL.createObjectURL !== 'function') return null;
  const vorhanden = adressen.get(schnitt.datei);
  if (vorhanden) return vorhanden;
  const adresse = URL.createObjectURL(new Blob([schnitt.bytes], { type: 'font/ttf' }));
  adressen.set(schnitt.datei, adresse);
  return adresse;
}

export function eigeneSchnitte(): EigenerSchnitt[] {
  // Nach Familie und Gewicht, wie man eine Schrift liest — nach Dateinamen
  // stünde „Bold" vor „Regular".
  return [...ablage.values()].sort(
    (a, b) =>
      a.familie.localeCompare(b.familie) || a.gewicht - b.gewicht || a.datei.localeCompare(b.datei),
  );
}

/**
 * Worin ein abgelegter Schnitt von dem abweicht, als was ein Erscheinungsbild
 * ihn einträgt — oder `null`, wenn er passt oder gar nicht hier liegt.
 *
 * Eine `@font-face`-Regel *behauptet* Gewicht und Lage, und der Browser
 * glaubt ihr: steht unter „700" die Regular, simuliert er nichts, sondern
 * zeichnet sie. Der Export holt dieselbe Datei über den Namen. Beide Wege sind
 * sich damit einig — und beide falsch: jede fette Überschrift steht in
 * Regular, und keine Ausgabe sieht anders aus als die andere. Der naheliegende
 * Weg dorthin ist „.ttf nachreichen" mit der Nachbardatei aus demselben
 * Ordner.
 *
 * Gemeldet wird ab hundert Einheiten Abstand. Eine Familie, deren Book auf
 * 350 steht und als 400 eingetragen wird, ist kein Versehen, sondern eine
 * Zuordnung — eine Warnung darüber wäre die Sorte, die man beim zweiten Mal
 * überliest.
 */
export function abweichungVomEintrag(face: {
  file: string;
  weight: number;
  style: string;
}): string[] {
  const schnitt = eigeneSchrift(face.file);
  if (!schnitt) return [];
  const teile: string[] = [];
  if (Math.abs(schnitt.gewicht - face.weight) >= 100) {
    teile.push(`als ${face.weight} eingetragen, die Datei ist ${schnitt.gewicht}`);
  }
  const kursivEingetragen = face.style === 'italic';
  if (schnitt.kursiv !== kursivEingetragen) {
    teile.push(
      kursivEingetragen
        ? 'als kursiv eingetragen, die Datei ist aufrecht'
        : 'als aufrecht eingetragen, die Datei ist kursiv',
    );
  }
  return teile;
}

export function subscribeSchriftablage(fn: () => void): () => void {
  horcher.add(fn);
  return () => horcher.delete(fn);
}

export function schriftablageVersion(): number {
  return version;
}

function melde(): void {
  version += 1;
  for (const fn of horcher) fn();
}

function vergissAdresse(datei: string): void {
  const adresse = adressen.get(datei);
  // Dieselbe Vorsicht wie beim Anlegen: wer keine Adressen vergeben kann,
  // hat auch keine freizugeben.
  if (adresse && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(adresse);
  adressen.delete(datei);
}

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                   */
/* -------------------------------------------------------------------------- */

function oeffne(): Promise<IDBDatabase> {
  return new Promise((fertig, scheitert) => {
    if (typeof indexedDB === 'undefined') {
      scheitert(new Error('Dieser Browser bietet keine IndexedDB an.'));
      return;
    }
    const anfrage = indexedDB.open(DATENBANK, 1);
    anfrage.onupgradeneeded = () => {
      anfrage.result.createObjectStore(LAGER, { keyPath: 'datei' });
    };
    anfrage.onsuccess = () => fertig(anfrage.result);
    anfrage.onerror = () =>
      scheitert(anfrage.error ?? new Error('IndexedDB ließ sich nicht öffnen.'));
    // Ein anderer Tab hält eine ältere Fassung offen. Warten hieße, den Start
    // dieses Fensters an einen fremden Tab zu hängen.
    anfrage.onblocked = () => scheitert(new Error('Ein anderer Tab blockiert die Schriftablage.'));
  });
}

function vorgang<T>(
  art: IDBTransactionMode,
  tun: (lager: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return oeffne().then(
    (db) =>
      new Promise<T>((fertig, scheitert) => {
        const transaktion = db.transaction(LAGER, art);
        const anfrage = tun(transaktion.objectStore(LAGER));
        transaktion.oncomplete = () => {
          db.close();
          fertig(anfrage.result);
        };
        transaktion.onerror = () => {
          db.close();
          scheitert(transaktion.error ?? new Error('Die Schriftablage ließ sich nicht schreiben.'));
        };
        transaktion.onabort = transaktion.onerror;
      }),
  );
}

async function liesAlles(): Promise<void> {
  const eintraege = await vorgang('readonly', (lager) => lager.getAll() as IDBRequest<unknown[]>);
  const neu = new Map<string, EigenerSchnitt>();
  for (const roh of eintraege) {
    // Was hier liegt, hat beim Ablegen die Prüfung bestanden — gelesen wird
    // trotzdem nur, was die Form hat. Eine Ablage aus einer künftigen Fassung
    // soll diesen Start nicht umwerfen.
    if (!roh || typeof roh !== 'object') continue;
    const eintrag = roh as Partial<EigenerSchnitt>;
    if (typeof eintrag.datei !== 'string' || !(eintrag.bytes instanceof ArrayBuffer)) continue;
    const lesung = liesSchriftdatei(eintrag.bytes);
    if (!lesung.ok) continue;
    neu.set(eintrag.datei, { datei: eintrag.datei, bytes: eintrag.bytes, ...lesung.angaben });
  }
  for (const datei of ablage.keys()) if (!neu.has(datei)) vergissAdresse(datei);
  ablage.clear();
  for (const [datei, schnitt] of neu) ablage.set(datei, schnitt);
}

/**
 * Die Ablage einmal in den Speicher holen.
 *
 * Scheitert das — ein privates Fenster in einem Browser, der dort keine
 * IndexedDB anbietet —, startet das Werkzeug trotzdem: ohne eigene Schriften,
 * und `legeSchriftAb()` sagt beim ersten Versuch, dass nichts gemerkt wird.
 * Ein Werkzeug, das wegen einer fehlenden Ablage gar nicht startet, verlöre
 * mehr, als die Ablage je hält.
 */
export function ladeSchriftablage(): Promise<void> {
  geladen ??= liesAlles()
    .then(melde)
    .catch(() => undefined);
  if (!kanal && typeof BroadcastChannel !== 'undefined') {
    kanal = new BroadcastChannel(KANAL);
    kanal.onmessage = () => {
      void liesAlles()
        .then(melde)
        .catch(() => undefined);
    };
  }
  return geladen;
}

export interface Ablageergebnis {
  /** Die Prüfung der Datei — gescheitert, kommt nichts in die Ablage. */
  grund: string | null;
  schnitt?: EigenerSchnitt;
  /**
   * Ob der Schnitt das nächste Neuladen übersteht. In einem Fenster ohne
   * IndexedDB gilt er für diese Sitzung — und das gehört gesagt, sonst ist er
   * morgen weg, ohne dass jemand weiß, warum.
   */
  gemerkt: boolean;
}

/**
 * Einen Schnitt prüfen und ablegen.
 *
 * In dieser Reihenfolge: erst prüfen, dann in den Speicher, dann in die
 * Datenbank. Ein Schnitt, der nicht taugt, kommt nirgends hin; einer, der
 * taugt, gilt sofort — auch wenn die Datenbank danach scheitert.
 */
export async function legeSchriftAb(datei: string, bytes: ArrayBuffer): Promise<Ablageergebnis> {
  const lesung = liesSchriftdatei(bytes);
  if (!lesung.ok) return { grund: lesung.grund, gemerkt: false };
  const name = ttfName(datei);
  const schnitt: EigenerSchnitt = { datei: name, bytes, ...lesung.angaben };
  vergissAdresse(name);
  ablage.set(name, schnitt);
  melde();
  try {
    await vorgang('readwrite', (lager) => lager.put({ datei: name, bytes }));
    kanal?.postMessage('geaendert');
    return { grund: null, schnitt, gemerkt: true };
  } catch {
    return { grund: null, schnitt, gemerkt: false };
  }
}

export async function entferneSchrift(datei: string): Promise<void> {
  const name = ttfName(datei);
  vergissAdresse(name);
  ablage.delete(name);
  melde();
  try {
    await vorgang('readwrite', (lager) => lager.delete(name));
    kanal?.postMessage('geaendert');
  } catch {
    // Nicht gemerkt heißt hier: der Schnitt kommt beim nächsten Neuladen
    // wieder. Für diese Sitzung ist er weg, und mehr verspricht der Knopf nicht.
  }
}
