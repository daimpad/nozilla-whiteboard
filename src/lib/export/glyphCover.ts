/**
 * Welcher Schnitt ein Zeichen wirklich zeichnen kann.
 *
 * ## Warum es das gibt
 *
 * Auf dem Bildschirm ist diese Frage unsichtbar: findet der Browser ein
 * Zeichen in der gesetzten Schrift nicht, holt er es still aus einer
 * Systemschrift. Die Folie sieht richtig aus. Der Export hat diese
 * Bequemlichkeit nicht — er trägt genau die Dateien bei sich, die er
 * einbettet, und was darin fehlt, fehlt.
 *
 * Das ist keine Theorie. Die Tastentabelle des Willkommens-Decks setzt ihre
 * Kürzel in Backticks, also in `codeInline`, also in Space Mono. Space Mono
 * führt `⌘`, `⌫`, `⇧` und `⌥` nicht. Auf der Fläche stand `⌘D`; im PNG stand
 * `D`, und die Zeile „Löschen" hatte gar keinen Wert mehr, weil ihr `⌫` das
 * einzige Zeichen der Zelle war. Im PDF stand `#`. Gefunden hat es niemand —
 * kein Test sah je hin, und der Bildschirm log.
 *
 * ## Was hier passiert
 *
 * Für jedes Zeichen jeder Szene wird bestimmt, welcher Schnitt es tatsächlich
 * führt: der gewünschte, wenn er kann, sonst der erste aus der Ersatzkette.
 * Inter deckt die vier Tastenzeichen ab, Zilla Slab und Space Mono nicht — die
 * Kette ist also nicht Zierde, sie greift beim ersten echten Deck.
 *
 * ## Warum an *einer* Stelle
 *
 * Zwei Wege stellen dieselbe Frage: der Umriss-Weg (PNG immer, SVG und PDF auf
 * Wunsch) braucht die Kontur, der PDF-Weg braucht den Schriftnamen für
 * `setFont`. Zwei Rechnungen für dieselbe Frage laufen auseinander, und man
 * sähe es erst in der fremden Datei — dieselbe Falle wie bei den
 * Tabellenspalten. Deshalb eine Deckung, zwei Kunden.
 *
 * ## Was es *nicht* tut
 *
 * Es verschiebt nichts. **Wo** ein Zeichen steht, bestimmt weiterhin der
 * Browser über `measureText`; ersetzt wird nur, **womit** gezeichnet wird. Der
 * Ersatzschnitt hat einen anderen Vorschub als das, was der Browser gemessen
 * hat, das Zeichen sitzt also um Haaresbreite anders als auf dem Bildschirm.
 * Ein leicht anders proportioniertes Zeichen ist trotzdem besser als keines —
 * und das war die Wahl.
 */
import { familyName, fontFamily } from '@/theme';
import type { FontFamilyKey, FontSpec } from '@/lib/text/measure';
import type { TrueTypeFont } from '@/lib/text/truetype';
import { loadOutlines, resolveFace, type FaceRef } from './fontFiles';
import type { Scene, SceneRun } from './scene';

/* -------------------------------------------------------------------------- */
/* Was herausfällt, wird gesagt                                                */
/* -------------------------------------------------------------------------- */

/** Was der Export nicht setzen konnte. */
export interface Ausfall {
  /** Zeichen, die keine der Schriften führt — sie fehlen in der Ausgabe. */
  readonly zeichen: readonly string[];
  /** Schnitte, deren Datei nicht ankam — ihr Text bleibt unkonvertiert. */
  readonly schnitte: readonly string[];
}

export type Ausfallmeldung = (ausfall: Ausfall) => void;

let melder: Ausfallmeldung | null = null;

/**
 * Wohin die Nachricht geht, dass ein Zeichen oder ein Schnitt fehlt.
 *
 * Hier stand ein `console.warn`, und das ist dieselbe Stille wie beim leeren
 * `catch` der Selbstsicherung und beim fehlenden Bild: die *Politik* stimmt —
 * ein fehlendes Zeichen darf einen Export nicht abbrechen —, das Schweigen
 * nicht. Ein `😀` fällt aus PNG und PDF heraus, und wer die Datei nicht selbst
 * ansieht, merkt es beim Vortrag.
 *
 * Der zweite Fall stand überhaupt nirgends: kommt die `.ttf` eines Schnitts
 * nicht an — der wahrscheinlichste Grund ist ein eigenes Erscheinungsbild, das
 * nur die `.woff2` mitliefert —, bleibt sein Text unkonvertiert. Im PNG malt
 * ihn dann die Vorgabeschrift des Betrachters, denn ein über eine Blob-URL
 * geladenes SVG sieht die Schriften der Seite nicht; im PDF fällt er auf eine
 * Kernschrift zurück. Beides sieht aus wie ein Fehler des Werkzeugs und ist
 * eine fehlende Datei.
 *
 * Gemeldet wird über einen Melder und nicht durch einen Import aus dem Store:
 * `lib/` kennt `state/` nicht. Die eine Verdrahtung steht im Sitzungsstart —
 * dieselbe Bauart wie bei `beiFehlendenBildern()`, und aus demselben Grund an
 * **einer** Stelle: `glyphCoverFor()` hat genau zwei Kunden, den Umriss-Weg und
 * den PDF-Weg.
 */
export function beiAusfallImExport(fn: Ausfallmeldung | null): void {
  melder = fn;
}

function melde(zeichen: readonly string[], schnitte: readonly string[]): void {
  if (zeichen.length === 0 && schnitte.length === 0) return;
  melder?.({ zeichen, schnitte });
}

/**
 * Schnitte melden, die ein anderer Weg nicht unterbringen konnte.
 *
 * Denselben Melder, weil es dieselbe Auskunft ist: „ihr Text steht in der
 * Ersatzschrift". Der zweite Kunde ist der SVG-Export — bekommt er die
 * Schnitte nicht als `@font-face` eingebettet, nennt die Datei sie nur beim
 * Namen, und auf einem fremden Rechner steht der Text in irgendetwas anderem.
 * Dort stand ein `console.warn` mit dem Satz „ein Fehlschlag bleibt
 * folgenlos" daneben; folgenlos ist er für den *Export*, nicht für den, der
 * die Datei danach öffnet.
 */
export function meldeSchnittausfall(schnitte: readonly string[]): void {
  melde([], schnitte);
}

const ROLLEN: readonly FontFamilyKey[] = ['display', 'body', 'mono'];

/**
 * Die Ersatzkette einer Rolle — **abgelesen am Schriftstapel**, nicht daneben
 * noch einmal aufgeschrieben.
 *
 * Der Browser sucht ein fehlendes Zeichen in genau dieser Reihenfolge und
 * misst danach seinen Vorschub. Wer hier eine andere Reihenfolge pflegte,
 * zeichnete an einer Stelle, die für eine andere Schrift gerechnet war —
 * zwei Rechnungen für dieselbe Frage, und man sähe es erst in der Datei.
 */
export function ersatzkette(role: FontFamilyKey): FontFamilyKey[] {
  const namen = fontFamily[role].split(',').map((teil) => teil.trim().replace(/^['"]|['"]$/g, ''));

  const kette: FontFamilyKey[] = [];
  for (const name of namen) {
    const rolle = ROLLEN.find((kandidat) => familyName(kandidat) === name);
    if (rolle && !kette.includes(rolle)) kette.push(rolle);
  }
  // Die eigene Rolle steht vorn, auch wenn der Stapel sie nicht nennt.
  if (!kette.includes(role)) kette.unshift(role);
  return kette;
}

export type GlyphSpec = Pick<FontSpec, 'family' | 'weight'>;

export interface GlyphCover {
  /**
   * Der Schnitt, der dieses Zeichen zeichnet — `null`, wenn keiner es führt.
   *
   * In aller Regel ist das der gewünschte; die Karte enthält nur die
   * Ausnahmen, damit der Normalfall keine Suche kostet.
   */
  faceFor(spec: GlyphSpec, codePoint: number): FaceRef | null;
  /** Die gelesene Schrift zu einem Schnitt, sofern sie geladen werden konnte. */
  outlines(face: FaceRef): TrueTypeFont | undefined;
  /** Jeder Schnitt, der gebraucht wird — die gewünschten und die Ersatzschnitte. */
  readonly faces: readonly FaceRef[];
  /** Zeichen, die keine der Schriften führt. Sie fallen im Export aus. */
  readonly uncovered: readonly string[];
}

const schluessel = (spec: GlyphSpec, codePoint: number) =>
  `${spec.family}|${spec.weight}|${codePoint}`;

/**
 * Die Deckung für eine Menge von Szenen aufbauen.
 *
 * Ersatzschnitte werden **nur geladen, wenn wirklich etwas fehlt**. Ein Deck
 * ohne exotische Zeichen — also fast jedes — zahlt für diese Prüfung nichts
 * als das Nachschlagen in der schon gelesenen `cmap`.
 */
export async function glyphCoverFor(scenes: readonly Scene[]): Promise<GlyphCover> {
  // Je Vorgabe die Zeichen sammeln, die sie überhaupt setzen soll.
  const verlangt = new Map<string, { spec: GlyphSpec; codePoints: Set<number> }>();
  for (const scene of scenes) {
    for (const prim of scene.prims) {
      if (prim.t !== 'text') continue;
      for (const run of prim.runs) sammle(verlangt, run);
    }
  }

  const geladen = new Map<string, TrueTypeFont>();
  const faces = new Map<string, FaceRef>();
  const nichtGeladen = new Set<string>();

  const lade = async (face: FaceRef | null): Promise<TrueTypeFont | undefined> => {
    if (!face) return undefined;
    if (geladen.has(face.id)) return geladen.get(face.id);
    try {
      const font = await loadOutlines(face);
      geladen.set(face.id, font);
      faces.set(face.id, face);
      return font;
    } catch {
      // Ein Schnitt, der nicht ankommt, ist kein Abbruch: der Umriss-Weg lässt
      // den Lauf dann als Text stehen, der PDF-Weg nimmt die Kernschrift.
      // Gesagt wird es trotzdem — siehe `beiAusfallImExport()`.
      nichtGeladen.add(face.id);
      return undefined;
    }
  };

  // Erst die gewünschten Schnitte, dann sehen, was ihnen fehlt.
  const fehlend: { spec: GlyphSpec; codePoint: number }[] = [];
  await Promise.all(
    [...verlangt.values()].map(async ({ spec, codePoints }) => {
      const face = resolveFace(spec);
      const font = await lade(face);
      if (!font) return;
      for (const codePoint of codePoints) {
        if (font.glyph(codePoint) === null) fehlend.push({ spec, codePoint });
      }
    }),
  );

  const ersatz = new Map<string, FaceRef>();
  const ohne: string[] = [];

  if (fehlend.length > 0) {
    // Jetzt erst die Ersatzschnitte — und nur die Gewichte, die gebraucht
    // werden.
    const ketten = new Map<FontFamilyKey, FontFamilyKey[]>();
    const kandidaten = new Map<string, FaceRef>();
    for (const { spec } of fehlend) {
      const kette = ketten.get(spec.family) ?? ersatzkette(spec.family);
      ketten.set(spec.family, kette);
      for (const rolle of kette) {
        if (rolle === spec.family) continue;
        const face = resolveFace({ family: rolle, weight: spec.weight });
        if (face) kandidaten.set(face.id, face);
      }
    }
    await Promise.all([...kandidaten.values()].map(lade));

    for (const { spec, codePoint } of fehlend) {
      // In der Reihenfolge des Stapels, damit derselbe Schnitt greift, den
      // auch der Browser genommen hat.
      const treffer = (ketten.get(spec.family) ?? [])
        .filter((rolle) => rolle !== spec.family)
        .map((rolle) => resolveFace({ family: rolle, weight: spec.weight }))
        .find((face) => face && geladen.get(face.id)?.glyph(codePoint) != null);
      if (treffer) ersatz.set(schluessel(spec, codePoint), treffer);
      else ohne.push(String.fromCodePoint(codePoint));
    }
  }

  melde([...new Set(ohne)], [...nichtGeladen]);

  return {
    faceFor(spec, codePoint) {
      return ersatz.get(schluessel(spec, codePoint)) ?? resolveFace(spec);
    },
    outlines(face) {
      return geladen.get(face.id);
    },
    faces: [...faces.values()],
    uncovered: [...new Set(ohne)],
  };
}

function sammle(
  verlangt: Map<string, { spec: GlyphSpec; codePoints: Set<number> }>,
  run: SceneRun,
): void {
  const key = `${run.font.family}|${run.font.weight}`;
  let eintrag = verlangt.get(key);
  if (!eintrag) {
    eintrag = { spec: { family: run.font.family, weight: run.font.weight }, codePoints: new Set() };
    verlangt.set(key, eintrag);
  }
  for (const zeichen of run.text) {
    const codePoint = zeichen.codePointAt(0);
    // Zwischenraum trägt keine Kontur und ist in jeder Schrift vorhanden;
    // ihn zu prüfen kostet nur Zeit.
    if (codePoint !== undefined && codePoint > 0x20) eintrag.codePoints.add(codePoint);
  }
}

/**
 * Eine Deckung, die nichts geladen hat und nichts ersetzt.
 *
 * Für den Weg ohne Einbettung: dort schreibt das PDF in die Kernschriften des
 * Betrachters, und welcher Marken-Schnitt ein Zeichen führt, spielt keine
 * Rolle. Schriftdateien dafür zu laden wäre reine Verschwendung.
 */
export function leereDeckung(): GlyphCover {
  return {
    faceFor: (spec) => resolveFace(spec),
    outlines: () => undefined,
    faces: [],
    uncovered: [],
  };
}

/**
 * Einen Lauf in Stücke zerlegen, die je *ein* Schnitt zeichnen kann.
 *
 * Der PDF-Weg braucht das: `doc.text()` kennt genau eine Schrift, und ein
 * `⌘` mitten in einem Space-Mono-Lauf muss aus Inter kommen. Der Umriss-Weg
 * fragt statt dessen je Zeichen — er hat kein Stück, das eine Schrift binden
 * müsste.
 *
 * Zurück kommt je Stück der Versatz **in Zeichen**, nicht in Punkten: wo das
 * Stück steht, misst der Aufrufer selbst gegen die echte Schrift.
 */
export interface FaceStueck {
  text: string;
  at: number;
  face: FaceRef | null;
  /**
   * Keine der Schriften führt dieses Zeichen.
   *
   * Es bekommt ein eigenes Stück, damit der Aufrufer es *auslassen* kann,
   * ohne seine Nachbarn zu verschieben. Vorher gab `faceFor()` auch für ein
   * ungedecktes Zeichen den gewünschten Schnitt zurück, das Stück blieb also
   * ganz — und jsPDF ließ das Zeichen beim Kodieren fallen. Weil die Nachbarn
   * im selben `doc.text()` standen, rückten sie um dessen Vorschub nach
   * links: aus „A😀B" wurde ein „AB", dessen B um vier Millimeter zu weit
   * links stand. Der Umriss-Weg lässt an derselben Stelle eine Lücke, denn er
   * fragt je Zeichen. Zwei Ausgaben, zwei verschiedene Zeilen.
   */
  ungedeckt?: boolean;
}

export function splitByFace(run: SceneRun, cover: GlyphCover): FaceStueck[] {
  const stuecke: FaceStueck[] = [];
  const ungedeckt = new Set(cover.uncovered);
  let letzteFace: FaceRef | null = null;
  let index = 0;

  for (const zeichen of run.text) {
    const codePoint = zeichen.codePointAt(0);
    if (ungedeckt.has(zeichen)) {
      stuecke.push({ text: zeichen, at: index, face: null, ungedeckt: true });
      index += zeichen.length;
      continue;
    }

    const face: FaceRef | null =
      codePoint === undefined || codePoint <= 0x20
        ? // Zwischenraum bleibt beim vorigen Stück; ihn zu trennen erzeugte
          // Stücke, die nichts zeichnen, aber alles zerschneiden.
          (letzteFace ?? cover.faceFor(run.font, 0x20))
        : cover.faceFor(run.font, codePoint);

    const letztes = stuecke[stuecke.length - 1];
    if (letztes && !letztes.ungedeckt && letztes.face?.id === face?.id) letztes.text += zeichen;
    else stuecke.push({ text: zeichen, at: index, face });
    letzteFace = face;
    index += zeichen.length;
  }

  return stuecke;
}
