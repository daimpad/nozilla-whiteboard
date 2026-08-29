/**
 * Der Entwurf überlebt ein ⌘R.
 *
 * ## Warum das kein Widerspruch zu „diese Seite hat keinen Store" ist
 *
 * Der Grund, aus dem der CI-Generator ohne Store gebaut ist, gilt der
 * **Sitzung des Decks**: `App` lädt beim Start das gemerkte Deck und schaltet
 * die Selbstsicherung ein, und eine zweite Seite, die dasselbe täte, schriebe
 * ihren Stand über die Arbeit im ersten Fenster. Ein eigener Schlüssel für den
 * Entwurf berührt den an keiner Stelle — `entwurfSchluessel` und der der
 * Deck-Sitzung sind zwei verschiedene Zeichenketten in zwei verschiedenen
 * Ablagen, und `generator.test.ts` hält sie auseinander.
 *
 * ## Und warum `sessionStorage` und nicht `localStorage`
 *
 * Weil ein Entwurf zu einem *Anlass* gehört und nicht zum Rechner. Wer heute
 * eine Marke anlegt und in drei Wochen wiederkommt, will nicht ungefragt in
 * einem halb gefüllten Formular von damals stehen — er will anfangen. Ein
 * geschlossener Tab beendet den Anlass, ein ⌘R nicht, und genau diese Grenze
 * zieht `sessionStorage`.
 *
 * ## Was gespeichert wird
 *
 * Der Entwurf, wie er ist — einschließlich der Wortmarke. Sie ist durch den
 * Riegel in `WortmarkeSchritt` auf 256 kB begrenzt, und das ist der Grund,
 * warum das hier gefahrlos ist: ohne ihn läge ein nachgezeichnetes Logo mit
 * drei Megabyte in einer Ablage, die etwa fünf fasst.
 */
import { leererEntwurf, neueKennung, type CiEntwurf, type Schnitt } from './entwurf';

/**
 * Der Schlüssel dieser Seite.
 *
 * Öffentlich, weil ein Test ihn gegen den der Deck-Sitzung hält. Zwei
 * Ablagen, die einander überschreiben, wären der Fehler, den dieses Werkzeug
 * schon zweimal gemacht hat — und man sähe ihn erst, wenn jemand mitten in
 * einem Vortrag ein Erscheinungsbild anlegt.
 */
export const entwurfSchluessel = 'nz-ci:entwurf:v1';

function ablage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Den Entwurf ablegen — oder sagen, warum nicht.
 *
 * Der Rückgabewert ist kein Zierrat. Ein leerer `catch` mit dem Kommentar
 * „best-effort by design" stand in diesem Projekt schon einmal, und von da an
 * sicherte sich nichts mehr, während der Benutzer weiterarbeitete im Glauben,
 * es geschehe. Wer hier scheitert, sagt es.
 */
export function sichereEntwurf(entwurf: CiEntwurf): string | null {
  const speicher = ablage();
  if (!speicher) return null;
  try {
    speicher.setItem(entwurfSchluessel, JSON.stringify(entwurf));
    return null;
  } catch (fehler) {
    return `Der Entwurf ließ sich nicht für ein Neuladen merken: ${String(fehler)}. Ein ⌘R verliert ihn ab jetzt.`;
  }
}

export function vergissEntwurf(): void {
  try {
    ablage()?.removeItem(entwurfSchluessel);
  } catch {
    // Wegräumen, was ohnehin nicht da ist, ist kein Fehler, den jemand
    // erfahren müsste.
  }
}

/**
 * Einen abgelegten Entwurf zurücklesen.
 *
 * Zusammengeführt über `leererEntwurf()` und nicht roh übernommen: was hier
 * liegt, ist zwar das eigene Format, aber es kann aus einer älteren Fassung
 * dieses Werkzeugs stammen. Eine Palettenrolle, die es damals noch nicht gab,
 * fehlte sonst — und `Palette` ist ein `Record` über dieselben Schlüssel, also
 * merkte es der Compiler nicht und die Prüfliste erst zwei Schritte später.
 *
 * Die Kennungen der Schnitte werden dabei neu vergeben. Sie gehören dem
 * Formular dieser Sitzung und nicht der Ablage; zwei Zeilen mit derselben
 * Kennung machen die Liste unbedienbar, und das ist genau der Fehler, wegen
 * dessen es sie gibt.
 */
export function liesEntwurf(): CiEntwurf | null {
  const speicher = ablage();
  if (!speicher) return null;

  let roh: string | null = null;
  try {
    roh = speicher.getItem(entwurfSchluessel);
  } catch {
    return null;
  }
  if (!roh) return null;

  try {
    const gelesen = JSON.parse(roh) as Partial<CiEntwurf>;
    if (!gelesen || typeof gelesen !== 'object' || Array.isArray(gelesen)) return null;
    return zusammen(gelesen);
  } catch {
    return null;
  }
}

/** Einen gelesenen Teil-Entwurf auf einen vollständigen legen. */
export function zusammen(gelesen: Partial<CiEntwurf>): CiEntwurf {
  const leer = leererEntwurf();
  const schnitte = Array.isArray(gelesen.webfontFaces) ? gelesen.webfontFaces : leer.webfontFaces;

  return {
    ...leer,
    ...gelesen,
    palette: { ...leer.palette, ...(gelesen.palette ?? {}) },
    textScale: { ...leer.textScale, ...(gelesen.textScale ?? {}) },
    sonderstufen: { ...leer.sonderstufen, ...(gelesen.sonderstufen ?? {}) },
    stroke: { ...leer.stroke, ...(gelesen.stroke ?? {}) },
    shadowOffset: { ...leer.shadowOffset, ...(gelesen.shadowOffset ?? {}) },
    fontFamily: { ...leer.fontFamily, ...(gelesen.fontFamily ?? {}) },
    pdfFontFamily: { ...leer.pdfFontFamily, ...(gelesen.pdfFontFamily ?? {}) },
    webfontFaces: schnitte.map((face): Schnitt => ({
      family: String(face?.family ?? ''),
      weight: Number(face?.weight),
      style: face?.style === 'italic' ? 'italic' : 'normal',
      file: String(face?.file ?? ''),
      kennung: neueKennung(),
    })),
  };
}

/**
 * Trägt dieser Entwurf überhaupt Arbeit?
 *
 * Gefragt wird beim Öffnen, bevor jemand mit „wollen Sie fortsetzen" behelligt
 * wird. Ein Entwurf, der nur die nozilla-Vorbelegung trägt, ist keine Arbeit —
 * die Frage wäre dann eine, die man nur wegklicken kann.
 *
 * Gemessen an den Feldern, die ein Mensch anfassen muss, damit überhaupt etwas
 * entsteht: der Schlüssel, der Name, die Wortmarke. Ein Vergleich des ganzen
 * Entwurfs gegen `leererEntwurf()` wäre genauer und zugleich schlechter — die
 * Schnitt-Kennungen zählen hoch, also wäre er immer ungleich.
 */
export function traegtArbeit(entwurf: CiEntwurf): boolean {
  return Boolean(entwurf.id.trim() || entwurf.label.trim() || entwurf.wortmarke);
}
