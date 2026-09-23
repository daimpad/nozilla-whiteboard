/**
 * Erscheinungsbilder, die im Browser importiert wurden.
 *
 * Bis hierher kam eine Marke nur über den Quelltext ins Werkzeug: der
 * CI-Generator schrieb eine Designdatei, jemand legte sie nach `src/themes/`
 * und baute. Jetzt geht es auch ohne Build — mit **derselben** Datei, die der
 * Generator unter „Entwurf sichern" ohnehin aushändigt (`.nzci.json`).
 *
 * ## Warum der Entwurf und nicht ein fertiges Erscheinungsbild
 *
 * Ein `BrandTheme` als JSON wäre bequemer zu laden und liefe an genau den
 * Rechnungen vorbei, deretwegen es den Generator gibt: `colorsFromPalette()`
 * und `tonesFromPalette()` mischen aus sechzehn Farben die übrigen sechzig,
 * und die Prüfliste urteilt über den Entwurf. Ein importiertes Erscheinungsbild
 * geht deshalb durch denselben Leser (`zusammen()`), dieselbe Prüfliste
 * (`pruefe()`) und dieselbe Rechnung (`themeAusEntwurf()`) wie die Vorschau
 * des Generators. Es kann damit keine Prüfung umgehen, die die Designdatei
 * bestehen müsste — das war das Hauptrisiko dieses Merkmals.
 *
 * ## Wo es liegt, und wie lange
 *
 * Im `localStorage`, unter einem eigenen Schlüssel, und zwar als *Entwurf*.
 * Nicht im `sessionStorage` wie der Entwurf des Generators: der gehört einem
 * Anlass, ein importiertes Erscheinungsbild dagegen so lange, wie ein Deck es
 * über `theme:` verlangt — und das Frontmatter überlebt jedes Neuladen. Läge
 * die Marke nur in der Tab-Sitzung, stünde das Deck nach dem nächsten ⌘R
 * wieder auf „nicht installiert", also genau dort, wo der Import es abholen
 * sollte.
 *
 * Die Schriftdateien liegen **nicht** hier. Ein Entwurf nennt Dateien unter
 * `public/fonts/`; was dort nicht liegt, wird beim Import beim Namen genannt.
 */
import { zusammen } from '@/ci/sitzung';
import { themeAusEntwurf, type CiEntwurf } from '@/ci/entwurf';
import type { Befund } from '@/ci/pruefung';
import { schnittFehlt } from '@/lib/export/fontFiles';
import {
  isThemeId,
  registerTheme,
  tonesOutsidePalette,
  unregisterTheme,
  type BrandTheme,
} from '@/theme';

/** Der Schlüssel der Ablage. Er berührt keinen der anderen Schlüssel. */
export const ABLAGE_KEY = 'nz-themes:v1';

/**
 * Wohin eine Ablage ausweicht, die sich nicht lesen ließ — wortgleich, wie
 * bei der Deck-Sitzung. Den Wert behalten, die Lücke zeigen.
 */
export const UNLESBAR_KEY = `${ABLAGE_KEY}:unlesbar`;

type Eintraege = Record<string, unknown>;

function ablage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Lesen                                                                       */
/* -------------------------------------------------------------------------- */

interface Gelesen {
  eintraege: Eintraege;
  /** Gesetzt, wenn die Ablage da war und sich nicht lesen ließ. */
  unlesbar?: string;
}

function liesAblage(): Gelesen {
  const speicher = ablage();
  const roh = speicher?.getItem(ABLAGE_KEY);
  if (!speicher || !roh) return { eintraege: {} };
  try {
    const wert: unknown = JSON.parse(roh);
    if (!wert || typeof wert !== 'object' || Array.isArray(wert)) {
      return bewahre(speicher, roh, 'der Eintrag ist kein Verzeichnis');
    }
    return { eintraege: wert as Eintraege };
  } catch (error) {
    return bewahre(speicher, roh, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Den Rohtext einer unlesbaren Ablage beiseitelegen.
 *
 * Erst beiseite, dann weg — in dieser Reihenfolge, und wenn das Beiseitelegen
 * scheitert, bleibt der Eintrag liegen, wo er ist. Dieselbe Linie wie bei der
 * Sitzung des Decks: eine Meldung, die Sicherheit verspricht, die es nicht
 * gibt, wäre schlechter als keine.
 */
function bewahre(speicher: Storage, roh: string, warum: string): Gelesen {
  let beiseite = false;
  try {
    speicher.setItem(UNLESBAR_KEY, roh);
    speicher.removeItem(ABLAGE_KEY);
    beiseite = true;
  } catch {
    // Kontingent erschöpft — dann bleibt der Eintrag liegen.
  }
  return {
    eintraege: {},
    unlesbar:
      `Die importierten Erscheinungsbilder ließen sich nicht lesen: ${warum}. ` +
      (beiseite
        ? `Ihre ${roh.length} Zeichen stehen unverändert unter „${UNLESBAR_KEY}".`
        : `Sie stehen weiter unter „${ABLAGE_KEY}" — beiseitelegen ließen sie sich nicht.`),
  };
}

function schreibeAblage(eintraege: Eintraege): string | null {
  const speicher = ablage();
  if (!speicher) {
    return 'Dieser Browser gibt keine Ablage her (privates Fenster?) — das Erscheinungsbild gilt nur bis zum Neuladen.';
  }
  try {
    speicher.setItem(ABLAGE_KEY, JSON.stringify(eintraege));
    return null;
  } catch (error) {
    return `Die Ablage des Browsers nahm das Erscheinungsbild nicht an: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

/* -------------------------------------------------------------------------- */
/* Anmelden beim Start                                                         */
/* -------------------------------------------------------------------------- */

/** Was beim Start aus der Ablage kam — und was nicht. */
export interface Anmeldebericht {
  angemeldet: string[];
  /** Einträge, die in der Ablage stehen und sich nicht anmelden ließen. */
  gescheitert: Array<{ id: string; grund: string }>;
  /** Ein Satz, wenn die ganze Ablage unlesbar war. */
  unlesbar?: string;
}

/** Die Schlüssel, die dieses Modul angemeldet hat. */
const importiert = new Set<string>();
let bericht: Anmeldebericht = { angemeldet: [], gescheitert: [] };

/**
 * Aus einem gespeicherten Eintrag ein Erscheinungsbild bauen — oder sagen,
 * warum nicht. Wirft nie: ein Wurf hier läuft vor dem ersten Bild, und dort
 * ist er ein weißes Fenster.
 */
function baue(id: string, roh: unknown): { theme: BrandTheme } | { grund: string } {
  try {
    const { entwurf } = zusammen((roh ?? {}) as Partial<CiEntwurf>);
    if (entwurf.id !== id) return { grund: `der Eintrag trägt den Schlüssel „${entwurf.id}"` };
    const theme = themeAusEntwurf(entwurf);
    const streuner = tonesOutsidePalette(theme);
    if (streuner.length)
      return { grund: `Farbrollen außerhalb der Palette: ${streuner.join(', ')}` };
    return { theme };
  } catch (error) {
    return { grund: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Die gemerkten Erscheinungsbilder anmelden.
 *
 * Läuft einmal beim Start, **nach** den mitgelieferten und **vor** dem ersten
 * Bild — synchron, denn `useDeckTheme()` fragt gleich danach, ob es den
 * Schlüssel des Decks gibt. Eine asynchrone Ablage (IndexedDB) zeichnete die
 * erste Folie in nozilla und stellte dann um.
 *
 * Ein Eintrag, dessen Schlüssel inzwischen mitgeliefert wird, wird nicht
 * angemeldet und nicht gelöscht: die mitgelieferte Marke gewinnt, und die
 * Verwaltung zeigt, warum der eigene Eintrag ruht.
 */
export function meldeImporteAn(): Anmeldebericht {
  const { eintraege, unlesbar } = liesAblage();
  const angemeldet: string[] = [];
  const gescheitert: Anmeldebericht['gescheitert'] = [];

  for (const [id, roh] of Object.entries(eintraege)) {
    if (isThemeId(id) && !importiert.has(id)) {
      gescheitert.push({
        id,
        grund: 'unter diesem Schlüssel steht inzwischen ein mitgeliefertes Erscheinungsbild',
      });
      continue;
    }
    const gebaut = baue(id, roh);
    if ('grund' in gebaut) {
      gescheitert.push({ id, grund: gebaut.grund });
      continue;
    }
    registerTheme(gebaut.theme);
    importiert.add(id);
    angemeldet.push(id);
  }

  bericht = { angemeldet, gescheitert, unlesbar };
  return bericht;
}

/**
 * Das Verzeichnis mit der Ablage abgleichen — wenn ein anderes Fenster sie
 * geändert hat.
 *
 * Zwei Fenster teilen sich eine Ablage, und der `storage`-Horcher meldet dem
 * einen, was das andere schreibt. Ohne den Abgleich zeichnete die
 * Referentenansicht ein Deck in nozilla, dessen Marke im Hauptfenster gerade
 * importiert wurde — der Vortragende sähe etwas anderes als sein Publikum.
 * Und ein zweiter Tab böte eine entfernte Marke weiter zur Wahl an.
 */
export function gleicheAb(): void {
  const vorhanden = new Set(Object.keys(liesAblage().eintraege));
  for (const id of [...importiert]) {
    if (vorhanden.has(id)) continue;
    importiert.delete(id);
    unregisterTheme(id);
  }
  meldeImporteAn();
}

/** Der Bericht vom letzten Start — für die Verwaltung und den Hinweis. */
export function anmeldebericht(): Anmeldebericht {
  return bericht;
}

/**
 * Der Satz über einen Start, bei dem nicht alles zurückkam — oder `null`.
 *
 * Beim allerersten Start und bei einem Start, an dem alles ankam, gibt es
 * nichts zu sagen; eine Meldung über etwas, das nie existiert hat, ist die
 * Sorte Wächter, die man abschaltet.
 */
export function anmeldeHinweis(stand: Anmeldebericht): string | null {
  if (stand.unlesbar) return stand.unlesbar;
  if (stand.gescheitert.length === 0) return null;
  const namen = stand.gescheitert.map((eintrag) => `„${eintrag.id}" (${eintrag.grund})`);
  return (
    `${stand.gescheitert.length === 1 ? 'Ein importiertes Erscheinungsbild ließ' : `${stand.gescheitert.length} importierte Erscheinungsbilder ließen`} ` +
    `sich nicht anmelden: ${namen.join('; ')}. Der Eintrag bleibt in der Ablage stehen.`
  );
}

/** Ist dieser Schlüssel importiert (und nicht mitgeliefert)? */
export function istImportiert(id: string): boolean {
  return importiert.has(id);
}

/**
 * Den gemerkten Entwurf eines importierten Erscheinungsbilds, zum Sichern.
 *
 * Wer ein Deck mit fremder Marke weitergibt, will die Marke mitgeben — und
 * ohne diesen Weg müsste er die Datei von damals wiederfinden.
 */
export function gemerkterEntwurf(id: string): CiEntwurf | null {
  const roh = liesAblage().eintraege[id];
  if (roh === undefined) return null;
  return zusammen(roh as Partial<CiEntwurf>).entwurf;
}

/** Alle Einträge der Ablage, auch die, die sich nicht anmelden ließen. */
export function gemerkteSchluessel(): string[] {
  return Object.keys(liesAblage().eintraege);
}

/* -------------------------------------------------------------------------- */
/* Importieren                                                                 */
/* -------------------------------------------------------------------------- */

/** Ein gelesener, geprüfter Import — noch nicht übernommen. */
export interface Importvorschlag {
  entwurf: CiEntwurf;
  theme: BrandTheme;
  /**
   * Was die Prüfliste im Rang „läuft, ist aber falsch" sagt.
   *
   * Nur dieser Rang. Mit einem Fehler gibt es keinen Vorschlag, und der Rang
   * „zu wissen" erklärt den Generator — fünf Sätze über Radius, Leisten und
   * Akzentfarbe, die bei jedem Entwurf wortgleich dastehen. Beim Import
   * stünden sie bei jeder Datei da, und eine Auskunft, die immer dasteht, wird
   * beim dritten Mal überlesen — samt der Warnung darüber, die zählt.
   */
  befunde: Befund[];
  /** Felder, die in der Datei standen und nicht zu gebrauchen waren. */
  verworfen: string[];
  /** Schnitte, deren Dateien hier nicht liegen — samt Grund. */
  fehlendeSchnitte: Array<{ datei: string; grund: string }>;
  /** Ersetzt der Import ein schon importiertes Erscheinungsbild? */
  ersetzt: boolean;
}

export type Importpruefung =
  { ok: true; vorschlag: Importvorschlag } | { ok: false; grund: string; befunde?: Befund[] };

/**
 * Eine Datei lesen und prüfen — ohne etwas zu übernehmen.
 *
 * Zwei Handgriffe und nicht einer: dazwischen steht die Frage, ob eine
 * vorhandene Marke ersetzt werden soll. Dieselbe Bauart wie beim Rücklauf
 * des Sprachmodells, der erst vorschlägt und dann übernimmt — „Eine Quittung
 * ist kein Vorschlag".
 *
 * Die Prüfliste wird **nachgeladen**. Sie zieht den Emitter des Generators
 * mit, und der hat im Werkzeug sonst nichts zu suchen; wer nie importiert,
 * lädt ihn nie.
 */
export async function pruefeImport(text: string): Promise<Importpruefung> {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      grund: `Die Datei ist kein JSON: ${error instanceof Error ? error.message : String(error)}.`,
    };
  }
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) {
    return { ok: false, grund: 'Die Datei ist kein Entwurf aus dem CI-Generator.' };
  }

  const { entwurf, genommen, verworfen } = zusammen(roh as Partial<CiEntwurf>);

  /*
     Die Schwelle ist strenger als beim Laden im Generator, und das mit
     Absicht. Dort steht danach das ganze Formular da, und was fehlt, sieht
     man. Hier steht nichts da: eine Datei mit nur einem Schlüssel würde zu
     nozilla unter fremdem Namen, und das wäre die auffälligste Lüge, die ein
     Import erzählen kann.
  */
  if (!genommen.some((feld) => feld.startsWith('palette'))) {
    return {
      ok: false,
      grund:
        'Die Datei trägt keine Farben — sie ist kein Entwurf aus dem CI-Generator oder noch leer.',
    };
  }
  if (!entwurf.wortmarke) {
    return {
      ok: false,
      grund:
        'Der Entwurf hat noch keine Wortmarke. Sie ist Pflicht — ohne sie trüge das Deck die von nozilla. Im CI-Generator unter „Wortmarke" nachtragen und neu sichern.',
    };
  }
  if (isThemeId(entwurf.id) && !importiert.has(entwurf.id)) {
    return {
      ok: false,
      grund: `„${entwurf.id}" ist ein mitgeliefertes Erscheinungsbild und lässt sich nicht ersetzen. Im CI-Generator einen eigenen Schlüssel eintragen.`,
    };
  }

  const { pruefe, traegtFehler } = await import('@/ci/pruefung');
  const befunde = pruefe(entwurf, 'import');
  if (traegtFehler(befunde)) {
    return {
      ok: false,
      grund: 'Der Entwurf trägt Fehler, die ihn falsch zeichnen würden.',
      befunde: befunde.filter((befund) => befund.rang === 'fehler'),
    };
  }

  let theme: BrandTheme;
  try {
    theme = themeAusEntwurf(entwurf);
  } catch (error) {
    return { ok: false, grund: error instanceof Error ? error.message : String(error) };
  }
  const streuner = tonesOutsidePalette(theme);
  if (streuner.length) {
    return { ok: false, grund: `Farbrollen außerhalb der Palette: ${streuner.join(', ')}.` };
  }

  /*
     Gefragt wird, ob die Dateien *hier* liegen — über denselben Abruf, mit
     dem der Export sie später holt. Ein Entwurf, der eine Hausschrift beim
     Namen nennt, ist nicht falsch; er sieht auf diesem Rechner nur anders
     aus als gemeint, und das gehört gesagt, bevor jemand ein Deck darin baut.
  */
  const dateien = [...new Set(entwurf.webfontFaces.map((face) => face.file).filter(Boolean))];
  const gruende = await Promise.all(dateien.map((datei) => schnittFehlt(datei)));
  const fehlendeSchnitte = dateien
    .map((datei, index) => ({ datei, grund: gruende[index] }))
    .filter((eintrag): eintrag is { datei: string; grund: string } => eintrag.grund !== null);

  return {
    ok: true,
    vorschlag: {
      entwurf,
      theme,
      befunde: befunde.filter((befund) => befund.rang === 'warnung'),
      verworfen,
      fehlendeSchnitte,
      ersetzt: importiert.has(entwurf.id),
    },
  };
}

/**
 * Einen geprüften Vorschlag übernehmen: merken und anmelden.
 *
 * Gibt `null` zurück, wenn es gelang, sonst den Grund. Gemerkt wird **zuerst**:
 * ein Erscheinungsbild, das angemeldet ist, aber nicht in der Ablage steht,
 * wäre nach dem nächsten Neuladen weg, und das Deck stünde ohne Warnung
 * wieder auf „nicht installiert".
 */
export function uebernehmeImport(vorschlag: Importvorschlag): string | null {
  const { eintraege } = liesAblage();
  const fehler = schreibeAblage({ ...eintraege, [vorschlag.entwurf.id]: vorschlag.entwurf });
  registerTheme(vorschlag.theme);
  importiert.add(vorschlag.entwurf.id);
  bericht = {
    ...bericht,
    gescheitert: bericht.gescheitert.filter((eintrag) => eintrag.id !== vorschlag.entwurf.id),
  };
  return fehler;
}

/**
 * Ein importiertes Erscheinungsbild entfernen — aus der Ablage und aus der
 * Auswahl. Ein mitgeliefertes lässt sich so nicht entfernen.
 *
 * Eine Ablage, die nur wächst, ist die, die eines Tages voll ist — und dann
 * scheitert die Selbstsicherung des Decks, die denselben Platz braucht.
 */
export function entferneImport(id: string): boolean {
  const { eintraege } = liesAblage();
  const war = id in eintraege || importiert.has(id);
  if (!war) return false;
  const rest = { ...eintraege };
  delete rest[id];
  schreibeAblage(rest);
  if (importiert.has(id)) {
    importiert.delete(id);
    unregisterTheme(id);
  }
  bericht = { ...bericht, gescheitert: bericht.gescheitert.filter((eintrag) => eintrag.id !== id) };
  return true;
}
