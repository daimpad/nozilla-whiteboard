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
import {
  leererEntwurf,
  neueKennung,
  pdfSchriften,
  type CiEntwurf,
  type PdfSchrift,
  type Schnitt,
} from './entwurf';

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
  /*
     Und die fehlende Ablage ist derselbe Fall, nicht ein harmloserer. Ein
     privates Fenster oder ein Browser, der Sitzungsdaten sperrt, gibt hier
     `null` zurück — und das schwieg, während der Absatz darüber erklärt, warum
     Schweigen hier der Fehler ist. Die Folge ist dieselbe: es sichert sich
     nichts, und niemand erfährt es.
  */
  if (!speicher) {
    return 'Der Entwurf lässt sich nicht für ein Neuladen merken: dieser Browser gibt keine Sitzungsablage her (ein privates Fenster tut das oft nicht). Ein ⌘R verliert ihn.';
  }
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
    return zusammen(gelesen).entwurf;
  } catch {
    return null;
  }
}

/**
 * Einen gelesenen Teil-Entwurf auf einen vollständigen legen.
 *
 * Und dabei **jeden Wert prüfen**, nicht nur die Form. Das war einmal ein
 * `...gelesen` über den leeren Entwurf, und der Unterschied ist kein
 * theoretischer: `pruefe()` läuft in einem `useMemo` *während des Renderns* und
 * greift auf `entwurf.id.trim()`, `marke.svg.length` und `palette[rolle].trim()`
 * zu. Eine fremde Datei mit `{"id": 42}` warf dort einen TypeError — und der
 * `try/catch` um „Entwurf laden" fängt das nicht, weil `ersetze()` nur eine
 * Zustandsänderung plant und das Rendern erst danach läuft. Gemessen: weißes
 * Fenster, keine Meldung, kein Formular mehr, obwohl direkt daneben der Satz
 * „… ist kein gesicherter Entwurf" für genau diesen Fall gebaut ist.
 *
 * Was nicht passt, fällt auf die Vorbelegung zurück. Das ist hier richtig und
 * anderswo nicht: eine Datei aus einer älteren Fassung ist kein Rücklauf eines
 * Sprachmodells, über den berichtet werden müsste — sie ist das eigene Format,
 * und was darin fehlt, hat nie jemand entschieden. Die Prüfliste sagt danach
 * ohnehin, was noch offen ist.
 */
export interface Zusammengelegt {
  entwurf: CiEntwurf;
  /** Felder, aus denen wirklich ein Wert kam. */
  genommen: string[];
  /**
   * Felder, die in der Datei standen und nicht zu gebrauchen waren.
   *
   * Sie fallen auf die Vorbelegung zurück, und das ist richtig — aber nicht
   * wortlos. Eine `.nzci.json`, in der `palette.ink` eine Zahl trägt, lud
   * vorher grün durch: die Tinte stand danach auf nozillas Schwarz, die
   * Prüfliste konnte davon nichts sagen (`#000000` ist ein gültiger Wert),
   * und der Nächste arbeitete mit einer Farbe, die er nie gewählt hat. Das ist
   * die Linie, die dieses Projekt an anderer Stelle andersherum entschieden
   * hat: den Wert behalten, die Lücke zeigen.
   */
  verworfen: string[];
}

export function zusammen(gelesen: Partial<CiEntwurf>): Zusammengelegt {
  const leer = leererEntwurf();
  const roh = (gelesen ?? {}) as Record<string, unknown>;
  const genommen: string[] = [];
  const verworfen: string[] = [];

  /** Ein Feld verbuchen: kam es an, oder fiel es auf die Vorbelegung zurück? */
  const buche = (name: string, angekommen: boolean) => {
    if (!(name in roh)) return;
    (angekommen ? genommen : verworfen).push(name);
  };

  const alsText = (wert: unknown, ersatz: string): string =>
    typeof wert === 'string' ? wert : ersatz;
  const alsZahl = (wert: unknown, ersatz: number): number =>
    typeof wert === 'number' && Number.isFinite(wert) ? wert : ersatz;

  const text = (name: string, ersatz: string): string => {
    const wert = alsText(roh[name], ersatz);
    buche(name, typeof roh[name] === 'string');
    return wert;
  };

  /** Eine Gruppe gleichartiger Werte, Rolle für Rolle geprüft. */
  const gruppe = <T>(
    name: string,
    vorgabe: Record<string, T>,
    wert: unknown,
    lies: (roh: unknown, ersatz: T) => T,
  ): Record<string, T> => {
    const gegeben = (wert && typeof wert === 'object' ? wert : {}) as Record<string, unknown>;
    let angekommen = false;
    const aus = Object.fromEntries(
      Object.entries(vorgabe).map(([rolle, ersatz]) => {
        const gelesen = lies(gegeben[rolle], ersatz);
        if (rolle in gegeben && gelesen !== ersatz) angekommen = true;
        return [rolle, gelesen];
      }),
    );
    /*
       Ein Wert, der zufällig gleich der Vorbelegung ist, zählt trotzdem als
       angekommen — sonst hieße „dieselbe Farbe wie nozilla" plötzlich
       „unlesbar". Gefragt wird deshalb zusätzlich, ob überhaupt eine
       *bekannte* Rolle mit passendem Typ dastand.
    */
    if (!angekommen) {
      angekommen = Object.keys(vorgabe).some(
        (rolle) => rolle in gegeben && lies(gegeben[rolle], vorgabe[rolle]) === gegeben[rolle],
      );
    }
    buche(name, angekommen);
    return aus;
  };

  const marke = roh.wortmarke;
  const wortmarke =
    marke && typeof marke === 'object' && typeof (marke as Record<string, unknown>).svg === 'string'
      ? {
          svg: (marke as Record<string, unknown>).svg as string,
          dateiname: alsText((marke as Record<string, unknown>).dateiname, ''),
          letters: alsText((marke as Record<string, unknown>).letters, ''),
          accent: alsText((marke as Record<string, unknown>).accent, ''),
        }
      : null;

  const schnitte = Array.isArray(roh.webfontFaces)
    ? (roh.webfontFaces as unknown[])
    : leer.webfontFaces;

  buche('wortmarke', wortmarke !== null);
  buche('webfontFaces', Array.isArray(roh.webfontFaces));
  buche('auszeichnungEnger', typeof roh.auszeichnungEnger === 'number');
  buche('zeichen', roh.zeichen === 'ohne-signatur' || roh.zeichen === 'nozilla');

  const entwurf: CiEntwurf = {
    id: text('id', leer.id),
    label: text('label', leer.label),
    markenname: text('markenname', leer.markenname),
    produkt: text('produkt', leer.produkt),
    palette: gruppe('palette', leer.palette, roh.palette, alsText) as CiEntwurf['palette'],
    textScale: gruppe(
      'textScale',
      leer.textScale,
      roh.textScale,
      alsZahl,
    ) as CiEntwurf['textScale'],
    sonderstufen: gruppe(
      'sonderstufen',
      leer.sonderstufen,
      roh.sonderstufen,
      alsZahl,
    ) as CiEntwurf['sonderstufen'],
    auszeichnungEnger: alsZahl(roh.auszeichnungEnger, leer.auszeichnungEnger),
    stroke: gruppe('stroke', leer.stroke, roh.stroke, alsZahl) as CiEntwurf['stroke'],
    shadowOffset: gruppe(
      'shadowOffset',
      leer.shadowOffset,
      roh.shadowOffset,
      alsZahl,
    ) as CiEntwurf['shadowOffset'],
    fontFamily: gruppe(
      'fontFamily',
      leer.fontFamily,
      roh.fontFamily,
      alsText,
    ) as CiEntwurf['fontFamily'],
    pdfFontFamily: gruppe('pdfFontFamily', leer.pdfFontFamily, roh.pdfFontFamily, (wert, ersatz) =>
      (pdfSchriften as readonly string[]).includes(wert as string) ? (wert as PdfSchrift) : ersatz,
    ) as CiEntwurf['pdfFontFamily'],
    /*
       Die Kennungen werden neu vergeben. Sie gehören dem Formular dieser
       Sitzung und nicht der Ablage; zwei Zeilen mit derselben Kennung machen
       die Liste unbedienbar, und das ist genau der Fehler, wegen dessen es sie
       gibt.
    */
    webfontFaces: schnitte.map((eintrag): Schnitt => {
      const face = (eintrag ?? {}) as Record<string, unknown>;
      return {
        family: alsText(face.family, ''),
        weight: alsZahl(face.weight, Number.NaN),
        style: face.style === 'italic' ? 'italic' : 'normal',
        file: alsText(face.file, ''),
        kennung: neueKennung(),
      };
    }),
    wortmarke,
    zeichen: roh.zeichen === 'ohne-signatur' ? 'ohne-signatur' : 'nozilla',
  };

  return { entwurf, genommen, verworfen };
}

/**
 * Trägt dieser Entwurf überhaupt Arbeit?
 *
 * Gefragt wird beim Öffnen, bevor jemand mit „wollen Sie fortsetzen" behelligt
 * wird. Ein Entwurf, der nur die nozilla-Vorbelegung trägt, ist keine Arbeit —
 * die Frage wäre dann eine, die man nur wegklicken kann.
 *
 * Gemessen wird am **ganzen Entwurf** und nicht an drei Feldern. Die vorige
 * Fassung fragte nur nach Schlüssel, Name und Wortmarke, und das warf echte
 * Arbeit stumm weg: wer über den Schrittbalken gleich zu „Farbe" springt (der
 * Name wird erfahrungsgemäß zuletzt vergeben), sechzehn Rollen und die Leiter
 * setzt und dann ⌘R drückt, bekam keine Frage, das leere Formular und einen
 * gemerkten Stand, den der nächste Anschlag überschrieb.
 *
 * Die Kennungen der Schnitte bleiben beim Vergleich außen vor: sie zählen bei
 * jedem Lesen hoch, und ein Entwurf wäre sonst immer „Arbeit".
 */
export function traegtArbeit(entwurf: CiEntwurf): boolean {
  return ohneKennungen(entwurf) !== ohneKennungen(leererEntwurf());
}

function ohneKennungen(entwurf: CiEntwurf): string {
  return JSON.stringify({
    ...entwurf,
    webfontFaces: entwurf.webfontFaces.map(({ family, weight, style, file }) => ({
      family,
      weight,
      style,
      file,
    })),
  });
}
