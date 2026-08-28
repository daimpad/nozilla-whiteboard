/**
 * Der CI-Generator — jedes Feld, das ein Erscheinungsbild belegt, und daneben
 * die Folie, die dabei herauskommt.
 *
 * ## Warum eine eigene Seite und kein Panel im Werkzeug
 *
 * Weil ein zweites Fenster mit demselben Store die Sitzung des ersten
 * überschreibt — derselbe Grund, aus dem die Referentenansicht keinen Store
 * hat. Diese Seite lädt kein Deck, sichert nichts und merkt sich nichts; sie
 * meldet ein Erscheinungsbild an, zeichnet damit ein Probedeck und stellt
 * hinterher zurück.
 *
 * ## Und warum die Vorschau eine echte Folie ist
 *
 * Sie ruft `buildSlideScene()` und `primsToSvgMarkup()` — dieselbe
 * Zeichenstrecke wie SVG, PDF und PPTX. Ein Generator mit eigenem Zeichner
 * versprach etwas, das keine Ausgabe hält; die erste Regel dieses Projekts
 * verbietet ihn deshalb.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nozillaTheme, type BrandTheme, type FamilyRole, type PaletteRole } from '@/theme';
import { saveText } from '@/lib/export/download';
import { Button, IconButton, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import {
  leererEntwurf,
  paletteRollen,
  pdfSchriften,
  schattenRollen,
  schriftRollen,
  leererSchnitt,
  schnittstile,
  sonderstufen,
  strichRollen,
  textStufen,
  themeAusEntwurf,
  zeichenwahl,
  type CiEntwurf,
  type Schnitt,
  type PdfSchrift,
  type Sonderstufe,
  type Zeichenwahl,
} from './entwurf';
import { pruefe, schriftRollenTitel, traegtFehler, type Befund, type Rang } from './pruefung';
import { anleitung, kundendatei } from './emitter';
import { Abschnitt, Farbfeld, Textfeld, Wahlfeld, Zahlenfeld } from './felder';
import { PROBEFOLIEN, Vorschau } from './Vorschau';

/**
 * Wofür jede Palettenrolle da ist.
 *
 * Der englische Schlüssel steht daneben und wird nicht übersetzt — er ist der
 * Name im Dateiformat und in jeder erzeugten Datei. Übersetzt wird nur, was
 * angezeigt wird; das ist dieselbe Linie wie in `src/lib/labels.ts`.
 */
const PALETTENTEXT: Record<PaletteRole, string> = {
  signal: 'Die Handlungsfarbe. Nur Knöpfe, Marker, echte Aufforderungen.',
  signalStrong: 'Eine Stufe dunkler — der gedrückte Zustand.',
  signalSoft: 'Die weiche Stufe. Trägt den Code-Untergrund auf einer Signalfolie.',
  signalDeep: 'Die dunkelste Stufe. Schattiert innerhalb einer Zeichnung, nie auf einer Fläche.',
  paper: 'Das Papier der Marke — der Untergrund „Creme" und die Flächenrolle „Papier".',
  paperAlt: 'Die zweite Papierstufe. Trägt den Code-Untergrund auf Weiß.',
  paperDeep: 'Die tiefste Papierstufe.',
  white: 'Das reine Weiß — der Untergrund „Weiß" und die Flächenrolle „Weiß".',
  ink: 'Die Tinte: Schrift, Kontur, Schatten und der Untergrund „Tinte".',
  ink900: 'Fast-Tinte, eine Stufe heller.',
  ink800: 'Trägt den Code-Untergrund auf einer Folie in Tinte.',
  ink700: 'Fast-Tinte, dritte Stufe.',
  ink600: 'Fast-Tinte, vierte Stufe.',
  warn: 'Achtung. Funktional, nie Dekoration.',
  danger: 'Fehler. Funktional, nie Dekoration.',
  info: 'Hinweis. Funktional, nie Dekoration.',
};

const STUFENTEXT: Record<Sonderstufe, string> = {
  headline: 'Kampagnengröße — zwischen den beiden obersten Stufen der Leiter.',
  labelSmall: 'Fußzeile und Foliennummer — unterhalb der Leiter, weil eine Folie weitermuss.',
  codeInline: 'Code im Fließtext — knapp darunter, weil eine Monospace breiter baut.',
};

const ZEICHENTEXT: Record<Zeichenwahl, string> = {
  nozilla: 'Der nozilla-Katalog, wie er ist (mit Signatur)',
  'ohne-signatur': 'Der Katalog ohne nozillas Signatur',
};

export function CiGenerator() {
  const [entwurf, setEntwurf] = useState<CiEntwurf>(leererEntwurf);
  const [blatt, setBlatt] = useState(0);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [beruehrt, setBeruehrt] = useState(false);

  const aendere = (teil: Partial<CiEntwurf>) => {
    setBeruehrt(true);
    setEntwurf((alt) => ({ ...alt, ...teil }));
  };

  /*
     Der Entwurf lebt allein in diesem Zustand — kein Store, keine Sitzung,
     keine Selbstsicherung. Das ist Absicht (der Grund steht im Kopf dieser
     Datei), hat aber einen Preis: ein ⌘R, ein Fehlklick, ein geschlossener
     Tab, und rund vierzig ausgefüllte Felder samt der Wortmarke sind ohne
     einen Ton weg.

     Gemerkt wird deshalb nicht der Inhalt, sondern *dass* jemand etwas
     angefasst hat. Ein Vergleich mit dem leeren Entwurf wäre genauer und
     zugleich schlechter: wer tippt und wieder löscht, hat trotzdem gearbeitet.
  */
  useEffect(() => {
    if (!beruehrt) return;
    const frage = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', frage);
    return () => window.removeEventListener('beforeunload', frage);
  }, [beruehrt]);

  /**
   * Zurück ins Werkzeug — durch Schließen und nicht durch Navigieren.
   *
   * Die Seite wird aus den Einstellungen mit `target="_blank"` geöffnet, damit
   * die offene Arbeit stehen bleibt. Ein Rücklink auf `index.html` machte aus
   * diesem Tab deshalb eine **zweite Kopie des Werkzeugs**: zwei Instanzen mit
   * eigenem Store, beide mit geladener Sitzung und laufender Selbstsicherung —
   * und die zweite schriebe ihren älteren Stand über die Arbeit der ersten.
   * Das ist wörtlich die Falle, derentwegen diese Seite überhaupt ohne Store
   * gebaut ist.
   *
   * `window.close()` greift nicht überall (ein Tab, den jemand von Hand
   * geöffnet hat, ist nicht schließbar). Bleibt er stehen, wird navigiert —
   * dann ist die zweite Kopie das kleinere Übel gegenüber einer Sackgasse.
   */
  const zurueck = useCallback(() => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) window.location.href = './index.html';
    }, 150);
  }, []);

  const befunde = useMemo(() => pruefe(entwurf), [entwurf]);
  const fehlerhaft = traegtFehler(befunde);

  const theme = useMemo<BrandTheme | null>(() => {
    if (fehlerhaft) return null;
    try {
      return themeAusEntwurf(entwurf);
    } catch {
      return null;
    }
  }, [entwurf, fehlerhaft]);

  const quelltext = useMemo(() => (fehlerhaft ? '' : kundendatei(entwurf)), [entwurf, fehlerhaft]);

  const sichere = async (text: string, name: string, typ: string) => {
    try {
      await saveText(text, name, typ);
      setHinweis(null);
    } catch (fehler) {
      // Ein geschlossener Dateidialog bleibt stumm — das ist die Antwort
      // „doch nicht" und keine Panne. Alles andere gehört gesagt: ein
      // Export, der still scheitert, sieht aus wie einer, den man abgebrochen
      // hat, und genau der Unterschied ist der, auf den es ankommt.
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return;
      setHinweis(`Die Datei ließ sich nicht aushändigen: ${String(fehler)}`);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-ui-sunken text-ui-ink">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-ui bg-ui-surface px-4">
        <Icon name="palette" size={18} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-ui-title font-semibold">CI-Generator</span>
          <span className="truncate text-[11px] text-ui-faint">
            Ein Erscheinungsbild anlegen — jede Rolle einmal belegt
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            icon="download"
            disabled={fehlerhaft || !entwurf.wortmarke}
            onClick={() => void sichere(quelltext, `${entwurf.id}.ts`, 'text/plain')}
          >
            Kundendatei
          </Button>
          <Button
            icon="download"
            disabled={!entwurf.wortmarke}
            onClick={() =>
              void sichere(
                entwurf.wortmarke?.svg ?? '',
                `${entwurf.id}-wortmarke.svg`,
                'image/svg+xml',
              )
            }
          >
            Wortmarke
          </Button>
          <Button
            variant="ghost"
            disabled={!beruehrt}
            onClick={() => {
              if (!window.confirm('Den Entwurf verwerfen und von vorn anfangen?')) return;
              setEntwurf(leererEntwurf());
              setBeruehrt(false);
              setHinweis(null);
              setBlatt(0);
            }}
          >
            Zurücksetzen
          </Button>
          <Button
            variant="ghost"
            icon="chevron-right"
            className="[&>svg]:-scale-x-100"
            onClick={zurueck}
          >
            Zurück zum Werkzeug
          </Button>
        </div>
      </header>

      {hinweis ? (
        <p
          role="alert"
          className="shrink-0 border-b border-ui-danger bg-ui-danger-bg px-4 py-2 text-ui-body text-ui-danger"
        >
          {hinweis}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Das Formular */}
        <div className="w-[440px] shrink-0 overflow-y-auto border-r border-ui bg-ui-surface">
          <Abschnitt
            titel="Marke"
            hinweis="Der Schlüssel steht im Frontmatter jedes Decks (theme: …) und lässt sich später nicht mehr ändern, ohne jede Datei anzufassen."
          >
            <Textfeld
              label="Schlüssel"
              wert={entwurf.id}
              auf={(id) => aendere({ id })}
              platzhalter="probenhaus"
              hinweis="Kleinschrift, Ziffern, Bindestriche."
            />
            <Textfeld
              label="Name in der Auswahl"
              wert={entwurf.label}
              auf={(label) => aendere({ label })}
              platzhalter="Probenhaus"
            />
            <Textfeld
              label="Markenname"
              wert={entwurf.markenname}
              auf={(markenname) => aendere({ markenname })}
              hinweis="Steht als Urheber in jedem PDF und jeder PPTX."
            />
            <Textfeld
              label="Produktname"
              wert={entwurf.produkt}
              auf={(produkt) => aendere({ produkt })}
              hinweis="Steht in der Beschreibung des SVG."
            />
          </Abschnitt>

          <Abschnitt
            titel="Farbe"
            hinweis="Sechzehn Rollen. Daraus mischt das Werkzeug neunundzwanzig semantische Tokens und die vier Flächenrollen — danach zu fragen wäre die Fehlerklasse, nicht die Gründlichkeit."
          >
            {paletteRollen.map((rolle) => (
              <Farbfeld
                key={rolle}
                rolle={rolle}
                label={rolle}
                wert={entwurf.palette[rolle]}
                hinweis={PALETTENTEXT[rolle]}
                auf={(wert) => aendere({ palette: { ...entwurf.palette, [rolle]: wert } })}
              />
            ))}
          </Abschnitt>

          <Abschnitt
            titel="Schrift"
            hinweis="Hinter der eigenen Schrift steht die andere dieser Marke, und erst danach das System. Keine Schrift führt jedes Zeichen — ohne eine zweite fällt ⌘ aus PNG und PDF heraus."
          >
            {schriftRollen.map((rolle) => (
              <Textfeld
                key={rolle}
                label={schriftRollenTitel[rolle]}
                wert={entwurf.fontFamily[rolle]}
                auf={(wert) => aendere({ fontFamily: { ...entwurf.fontFamily, [rolle]: wert } })}
              />
            ))}

            <p className="pt-1 text-[11px] font-medium text-ui-muted">Ersatz im PDF</p>
            {schriftRollen.map((rolle) => (
              <Wahlfeld<PdfSchrift>
                key={rolle}
                label={schriftRollenTitel[rolle]}
                wert={entwurf.pdfFontFamily[rolle]}
                optionen={pdfSchriften.map((wert) => ({ value: wert, label: wert }))}
                auf={(wert) =>
                  aendere({ pdfFontFamily: { ...entwurf.pdfFontFamily, [rolle]: wert } })
                }
              />
            ))}

            <Schnitte entwurf={entwurf} aendere={aendere} />
          </Abschnitt>

          <Abschnitt
            titel="Maße"
            hinweis="Die Leiter der Marke. Zeilenhöhe, Schnitt und Versalien bleiben die der Hierarchie — wer sie ändern muss, ändert sie in der erzeugten Datei."
          >
            <p className="text-[11px] font-medium text-ui-muted">Größenleiter</p>
            {textStufen.map((stufe) => (
              <Zahlenfeld
                key={stufe}
                label={stufe}
                einheit="px"
                wert={entwurf.textScale[stufe]}
                auf={(wert) => aendere({ textScale: { ...entwurf.textScale, [stufe]: wert } })}
              />
            ))}

            <p className="pt-2 text-[11px] font-medium text-ui-muted">
              Stufen außerhalb der Leiter
            </p>
            {sonderstufen.map((stufe) => (
              <div key={stufe}>
                <Zahlenfeld
                  label={stufe}
                  einheit="px"
                  wert={entwurf.sonderstufen[stufe]}
                  auf={(wert) =>
                    aendere({ sonderstufen: { ...entwurf.sonderstufen, [stufe]: wert } })
                  }
                />
                <p className="ml-26 text-[11px] leading-snug text-ui-faint">{STUFENTEXT[stufe]}</p>
              </div>
            ))}

            <p className="pt-2 text-[11px] font-medium text-ui-muted">Laufweite der Auszeichnung</p>
            <Zahlenfeld
              label="enger um"
              einheit="em"
              schritt={0.005}
              wert={entwurf.auszeichnungEnger}
              auf={(auszeichnungEnger) => aendere({ auszeichnungEnger })}
            />
            <p className="text-[11px] leading-snug text-ui-faint">
              Eine Grotesk verträgt in großen Graden mehr Enge als eine Slab-Serif. Null lässt die
              Laufweite der Hierarchie stehen.
            </p>

            <p className="pt-2 text-[11px] font-medium text-ui-muted">Strichstärken</p>
            {strichRollen.map((rolle) => (
              <Zahlenfeld
                key={rolle}
                label={rolle}
                einheit="px"
                schritt={0.5}
                wert={entwurf.stroke[rolle]}
                auf={(wert) => aendere({ stroke: { ...entwurf.stroke, [rolle]: wert } })}
              />
            ))}

            <p className="pt-2 text-[11px] font-medium text-ui-muted">Schattenversätze</p>
            {schattenRollen.map((rolle) => (
              <Zahlenfeld
                key={rolle}
                label={rolle}
                einheit="px"
                wert={entwurf.shadowOffset[rolle]}
                auf={(wert) =>
                  aendere({ shadowOffset: { ...entwurf.shadowOffset, [rolle]: wert } })
                }
              />
            ))}
            <p className="text-[11px] leading-snug text-ui-faint">
              Ein harter Versatz, kein Weichzeichner. Das ist Struktur und keine Einstellung.
            </p>
          </Abschnitt>

          <Wortmarkenfeld entwurf={entwurf} aendere={aendere} />

          <Abschnitt
            titel="Zeichen"
            hinweis="Ein Set ersetzt, es ergänzt nicht. Eigene Zeichen trägt man in der erzeugten Datei nach — sie ersetzen den Katalog dann."
          >
            <Wahlfeld<Zeichenwahl>
              label="Katalog"
              wert={entwurf.zeichen}
              optionen={zeichenwahl.map((wert) => ({ value: wert, label: ZEICHENTEXT[wert] }))}
              auf={(zeichen) => aendere({ zeichen })}
            />
          </Abschnitt>
        </div>

        {/* Vorschau, Prüfliste, Ergebnis */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <h2 className="text-ui-title font-semibold">Probefolie</h2>
            <span className="text-[11px] text-ui-faint">
              {blatt + 1} / {PROBEFOLIEN}
            </span>
            <div className="ml-auto flex gap-1">
              <IconButton
                icon="chevron-right"
                label="Vorige Probefolie"
                className="-scale-x-100"
                disabled={blatt === 0}
                onClick={() => setBlatt((wert) => Math.max(0, wert - 1))}
              />
              <IconButton
                icon="chevron-right"
                label="Nächste Probefolie"
                disabled={blatt >= PROBEFOLIEN - 1}
                onClick={() => setBlatt((wert) => Math.min(PROBEFOLIEN - 1, wert + 1))}
              />
            </div>
          </div>

          <div className="shrink-0">
            <Vorschau theme={theme} blatt={blatt} />
          </div>

          <Pruefliste befunde={befunde} />

          <h2 className="mb-2 mt-4 shrink-0 text-ui-title font-semibold">
            src/themes/{entwurf.id || '…'}.ts
          </h2>
          <pre className="shrink-0 overflow-x-auto rounded-sm border border-ui bg-ui-surface p-3 font-mono text-[11px] leading-relaxed text-ui-ink">
            {quelltext || 'Die Datei entsteht, sobald kein Fehler mehr in der Prüfliste steht.'}
          </pre>

          <h2 className="mb-2 mt-4 shrink-0 text-ui-title font-semibold">Danach</h2>
          <pre className="shrink-0 whitespace-pre-wrap rounded-sm border border-ui bg-ui-surface p-3 font-mono text-[11px] leading-relaxed text-ui-muted">
            {anleitung(entwurf)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const RANGTEXT: Record<Rang, { titel: string; klasse: string }> = {
  fehler: { titel: 'Fehler', klasse: 'border-ui-danger bg-ui-danger-bg text-ui-danger' },
  warnung: { titel: 'Läuft, ist aber falsch', klasse: 'border-ui-strong bg-ui-subtle text-ui-ink' },
  hinweis: { titel: 'Zu wissen', klasse: 'border-ui bg-ui-surface text-ui-muted' },
};

/**
 * Die Prüfliste.
 *
 * Drei Ränge und nicht zwei, weil der mittlere der teuerste ist: alles läuft,
 * nichts sagt etwas, und trotzdem malen vier Menüeinträge dieselbe Farbe oder
 * eine Schrift wird im Export still durch Helvetica ersetzt. Ein Generator,
 * der nur zwischen „geht" und „geht nicht" unterscheidet, führt genau dorthin.
 */
function Pruefliste({ befunde }: { befunde: Befund[] }) {
  const raenge: Rang[] = ['fehler', 'warnung', 'hinweis'];

  return (
    <div className="mt-4 shrink-0">
      <h2 className="mb-2 text-ui-title font-semibold">Prüfliste</h2>
      <div className="flex flex-col gap-1.5">
        {raenge.flatMap((rang) =>
          befunde
            .filter((befund) => befund.rang === rang)
            .map((befund, index) => (
              <p
                key={`${rang}-${index}`}
                className={cx('border px-2 py-1.5 text-[11px] leading-snug', RANGTEXT[rang].klasse)}
              >
                <span className="font-semibold">
                  {RANGTEXT[rang].titel} · {befund.feld}
                </span>{' '}
                {befund.text}
              </p>
            )),
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Die Wortmarke.
 *
 * Sie ist Pflicht und hat mit Absicht keine Voreinstellung — fehlte sie, trüge
 * ein Kundendeck die Marke von nozilla. Gefragt wird nach der Datei *und* nach
 * den beiden Füllfarben, die darin stehen: `wordmarkFromSvg()` ordnet über die
 * Farbe zu und nicht über die Reihenfolge der Pfade, weil eine Zeichensoftware
 * Pfade umsortiert, wie sie will.
 */
function Wortmarkenfeld({
  entwurf,
  aendere,
}: {
  entwurf: CiEntwurf;
  aendere: (teil: Partial<CiEntwurf>) => void;
}) {
  const marke = entwurf.wortmarke;

  const lies = async (datei: File | undefined) => {
    if (!datei) return;
    const svg = await datei.text();
    // Die Füllfarben aus der Datei vorschlagen: sie stehen dort, und sie zu
    // raten wäre der Punkt, an dem der Generator anfängt, Werte zu erfinden.
    const gefunden = [
      ...new Set([...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((treffer) => treffer[1])),
    ];
    aendere({
      wortmarke: {
        svg,
        dateiname: datei.name,
        letters: marke?.letters || gefunden[0] || '',
        accent: marke?.accent || gefunden[1] || '',
      },
    });
  };

  return (
    <Abschnitt
      titel="Wortmarke"
      hinweis="Als Geometrie, nicht als Bild — nur so landet sie in SVG und PDF als echter Vektor und nimmt die Tinte der Fläche an, auf der sie sitzt."
    >
      <label className="block text-[11px] font-medium text-ui-muted">
        SVG-Datei
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(event) => void lies(event.target.files?.[0])}
          className="mt-1 block w-full text-[11px] text-ui-muted file:mr-2 file:h-8 file:rounded-sm file:border file:border-ui file:bg-ui-surface file:px-3 file:text-ui-body file:text-ui-ink"
        />
      </label>

      {marke ? (
        <>
          <p className="font-mono text-[11px] text-ui-faint">{marke.dateiname}</p>
          <Textfeld
            label="Füllfarbe der Buchstaben"
            wert={marke.letters}
            auf={(letters) => aendere({ wortmarke: { ...marke, letters } })}
            hinweis="Wie sie in der Datei steht — nicht die Farbe der Marke."
          />
          <Textfeld
            label="Füllfarbe des Akzents"
            wert={marke.accent}
            auf={(accent) => aendere({ wortmarke: { ...marke, accent } })}
            hinweis="Leer lassen, wenn die Marke keinen Akzent am Wortende hat. Gemalt wird er immer in der Signalfarbe."
          />
        </>
      ) : null}
    </Abschnitt>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Die selbst gehosteten Schnitte.
 *
 * Sie stehen als Liste und nicht als Formular je Schnitt: wer eine
 * Kundenschrift mitbringt, hat neun Dateien und keine Lust auf sechsunddreißig
 * Felder. Was hier zählt, ist die Zuordnung Familie → Datei — der erste Name
 * jedes Stapels ist ein Fremdschlüssel darauf, und passt er nicht, findet der
 * Export keine Datei und fällt still auf die Ersatzschrift zurück.
 */
function Schnitte({
  entwurf,
  aendere,
}: {
  entwurf: CiEntwurf;
  aendere: (teil: Partial<CiEntwurf>) => void;
}) {
  /*
     Angefasst wird über die **Kennung** und nicht über den Index. Der Index
     wäre hier zwar ausreichend — die Liste wächst nur am Ende —, aber er ist
     dieselbe Art Schlüssel, die diese Zeile schon einmal unbedienbar gemacht
     hat: einer, der sich mit dem Inhalt bewegt. Die Kennung bewegt sich nie.
  */
  const setze = (kennung: string, teil: Partial<Schnitt>) =>
    aendere({
      webfontFaces: entwurf.webfontFaces.map((face) =>
        face.kennung === kennung ? { ...face, ...teil } : face,
      ),
    });

  return (
    <div>
      <p className="pt-1 text-[11px] font-medium text-ui-muted">
        Schnitte unter <span className="font-mono">public/fonts/</span>
      </p>
      <p className="mb-2 text-[11px] leading-snug text-ui-faint">
        Zu jeder <span className="font-mono">.woff2</span> gehört die gleichnamige{' '}
        <span className="font-mono">.ttf</span>: WOFF2 kann nichts lesen, was Glyphen braucht, und
        PDF wie Umriss-Leser brauchen sie.
      </p>

      <div className="flex flex-col gap-1">
        {entwurf.webfontFaces.map((face, index) => (
          <div key={face.kennung} className="flex gap-1">
            <input
              type="text"
              aria-label={`Familie des ${index + 1}. Schnitts`}
              value={face.family}
              onChange={(event) => setze(face.kennung, { family: event.target.value })}
              className="h-7 w-24 min-w-0 rounded-sm border border-ui bg-ui-surface px-1.5 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            <input
              type="number"
              aria-label={`Gewicht des ${index + 1}. Schnitts`}
              value={Number.isFinite(face.weight) ? face.weight : ''}
              step={100}
              onChange={(event) =>
                setze(face.kennung, { weight: Number.parseInt(event.target.value, 10) })
              }
              className="h-7 w-14 rounded-sm border border-ui bg-ui-surface px-1.5 text-right tabular-nums text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            {/*
              Kursive Schnitte waren bisher gar nicht anzulegen: `style` stand
              im Schlüssel, aber in keinem Feld. Eine Marke mit einer Kursiven
              hätte sie von Hand nachtragen müssen.
            */}
            <select
              aria-label={`Stil des ${index + 1}. Schnitts`}
              value={face.style}
              onChange={(event) => setze(face.kennung, { style: event.target.value })}
              className="h-7 w-20 rounded-sm border border-ui bg-ui-surface px-1 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            >
              {schnittstile.map((stil) => (
                <option key={stil} value={stil}>
                  {stil === 'normal' ? 'aufrecht' : 'kursiv'}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label={`Datei des ${index + 1}. Schnitts`}
              value={face.file}
              onChange={(event) => setze(face.kennung, { file: event.target.value })}
              className="h-7 min-w-0 flex-1 rounded-sm border border-ui bg-ui-surface px-1.5 font-mono text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"
            />
            <IconButton
              icon="trash"
              label={`${index + 1}. Schnitt entfernen${face.family ? ` (${face.family} ${face.weight})` : ''}`}
              tone="danger"
              size={13}
              className="h-7 w-7"
              onClick={() =>
                aendere({
                  webfontFaces: entwurf.webfontFaces.filter(
                    (andere) => andere.kennung !== face.kennung,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>

      <Button
        icon="plus"
        className="mt-2 h-7"
        onClick={() => aendere({ webfontFaces: [...entwurf.webfontFaces, leererSchnitt()] })}
      >
        Schnitt
      </Button>
      <p className="mt-1 text-[11px] leading-snug text-ui-faint">
        Vorbelegt sind die {nozillaTheme.webfont.faces.length} Schnitte, die schon unter{' '}
        <span className="font-mono">public/fonts/</span> liegen.
      </p>
    </div>
  );
}

/** Damit die Rollen-Titel auch außerhalb der Prüfung eine Heimat haben. */
export type { FamilyRole };
