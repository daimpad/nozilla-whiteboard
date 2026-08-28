/**
 * Der CI-Generator — Schritt für Schritt zu einem eigenen Erscheinungsbild,
 * und daneben die Folie, die dabei herauskommt.
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
 *
 * ## Die Aufteilung
 *
 * Links steht **ein** Schritt, rechts stehen Vorschau und Prüfliste — und die
 * beiden stehen dort die ganze Zeit. Das ist der Unterschied zwischen einem
 * Wizard und einem Fragebogen: die Antwort auf „was tut das, was ich gerade
 * eintippe" steht neben dem Feld und nicht hinter einem Knopf am Ende.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type BrandTheme } from '@/theme';
import { saveText } from '@/lib/export/download';
import { Button, IconButton, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { leererEntwurf, vorschaustand, vorschauTheme, type CiEntwurf } from './entwurf';
import { pruefe, traegtFehler, type Befund, type Rang } from './pruefung';
import { anleitung, designdatei, wortmarkeDateiname } from './emitter';
import { AnfangSchritt } from './Anfang';
import type { Ruecklaufbefund } from './ruecklauf';
import {
  FarbeSchritt,
  MarkeSchritt,
  MasseSchritt,
  SCHRITTE,
  SchriftSchritt,
  WortmarkeSchritt,
  ZeichenSchritt,
  schrittFuerFeld,
} from './schritte';
import { PROBEFOLIEN, Vorschau } from './Vorschau';

export function CiGenerator() {
  const [entwurf, setEntwurf] = useState<CiEntwurf>(leererEntwurf);
  const [schritt, setSchritt] = useState(0);
  const [blatt, setBlatt] = useState(0);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [beruehrt, setBeruehrt] = useState(false);
  const spalte = useRef<HTMLDivElement>(null);

  /*
     Die Antwort des Modells und der Bericht darüber wohnen hier und nicht im
     Schritt. Gezeichnet wird immer nur der offene Schritt; React hängt den
     ersten beim „Weiter" aus dem Baum, und lokaler Zustand ginge dabei mit.
     Genau der Handgriff, den der Bericht empfiehlt — „sieh in Schritt 3 nach" —
     hätte damit die Liste vernichtet, die ihn empfiehlt.
  */
  const [antwort, setAntwort] = useState('');
  const [bericht, setBericht] = useState<Ruecklaufbefund[] | null>(null);

  const aendere = (teil: Partial<CiEntwurf>) => {
    setBeruehrt(true);
    setEntwurf((alt) => ({ ...alt, ...teil }));
  };

  const ersetze = (neu: CiEntwurf) => {
    setBeruehrt(true);
    setEntwurf(neu);
  };

  /*
     Der Entwurf lebt allein in diesem Zustand — kein Store, keine Sitzung,
     keine Selbstsicherung. Das ist Absicht (der Grund steht im Kopf dieser
     Datei), hat aber einen Preis: ein ⌘R, ein Fehlklick, ein geschlossener
     Tab, und rund fünfzig ausgefüllte Felder samt der Wortmarke sind ohne
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

  const gehe = useCallback((ziel: number) => {
    setSchritt(Math.max(0, Math.min(SCHRITTE.length - 1, ziel)));
    // Ein Schrittwechsel setzt die linke Spalte oben an. Ohne das steht ein
    // kurzer Schritt hinter einem langen mitten im Nichts.
    spalte.current?.scrollTo({ top: 0 });
  }, []);

  const befunde = useMemo(() => pruefe(entwurf), [entwurf]);
  const fehlerhaft = traegtFehler(befunde);

  /*
     Gezeichnet wird über `vorschauTheme()` und nicht über `themeAusEntwurf()`:
     fehlt allein die Wortmarke, setzt es einen sichtbar benannten Platzhalter
     ein, damit die Folie schon ab Schritt 2 dasteht. Die Wortmarke ist die
     einzige Angabe, für die man eine Datei suchen muss — ohne den Platzhalter
     wären fünf von acht Schritten ohne Bild, und der Schritt „Farbe" wäre
     blind. Am Fehler in der Prüfliste und an der gesperrten Datei ändert das
     nichts.
  */
  const frisch = useMemo<BrandTheme | null>(() => {
    if (!zeichenbar(befunde, entwurf.wortmarke !== null)) return null;
    try {
      return vorschauTheme(entwurf);
    } catch {
      return null;
    }
  }, [entwurf, befunde]);

  const frischerQuelltext = useMemo(
    () => (fehlerhaft ? null : designdatei(entwurf)),
    [entwurf, fehlerhaft],
  );

  /*
     Ein einzelner Fehler leert die rechte Spalte nicht mehr.

     Vorher hing beides an `fehlerhaft`: wer in ein Farbfeld klickte und die
     Raute löschte, sah die Folie verschwinden und den Quelltext dazu — bei
     genau einer offenen Stelle von sechzehn. Die Vorschau ist aber der Grund,
     aus dem jemand hier ist; sie wegzunehmen, sobald irgendetwas offen ist,
     nimmt sie die halbe Zeit weg.

     Stehen bleibt deshalb der letzte tragfähige Stand — ausdrücklich als
     veraltet ausgewiesen. Das eine, was nicht passieren darf, ist ein alter
     Stand, der sich für den aktuellen ausgibt.
  */
  const letztesTheme = useRef<BrandTheme | null>(null);
  const letzterQuelltext = useRef<string>('');
  if (frisch) letztesTheme.current = frisch;
  if (frischerQuelltext !== null) letzterQuelltext.current = frischerQuelltext;

  const { stand: theme, veraltet } = vorschaustand(frisch, letztesTheme.current);
  const quelltext = frischerQuelltext ?? letzterQuelltext.current;
  const platzhalter = !entwurf.wortmarke && theme !== null;

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

  const dieser = SCHRITTE[schritt];

  return (
    <div className="flex h-screen flex-col bg-ui-sunken text-ui-ink">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-ui bg-ui-surface px-4">
        <Icon name="palette" size={18} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-ui-title font-semibold">CI-Generator</span>
          <span className="truncate text-[11px] text-ui-faint">
            Ein eigenes Erscheinungsbild anlegen — jede Rolle einmal belegt
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={!beruehrt}
            onClick={() => {
              if (!window.confirm('Den Entwurf verwerfen und von vorn anfangen?')) return;
              setEntwurf(leererEntwurf());
              setBeruehrt(false);
              setHinweis(null);
              setBlatt(0);
              setAntwort('');
              setBericht(null);
              gehe(0);
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

      <Schrittbalken jetzt={schritt} befunde={befunde} auf={gehe} />

      {hinweis ? (
        <p
          role="alert"
          className="shrink-0 border-b border-ui-danger bg-ui-danger-bg px-4 py-2 text-ui-body text-ui-danger"
        >
          {hinweis}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Der Schritt */}
        <div className="flex w-[440px] shrink-0 flex-col border-r border-ui bg-ui-surface">
          <div ref={spalte} className="min-h-0 flex-1 overflow-y-auto">
            {dieser.id === 'anfang' ? (
              <AnfangSchritt
                entwurf={entwurf}
                setzeEntwurf={ersetze}
                weiter={() => gehe(1)}
                antwort={antwort}
                setAntwort={setAntwort}
                bericht={bericht}
                setBericht={setBericht}
              />
            ) : null}
            {dieser.id === 'marke' ? <MarkeSchritt entwurf={entwurf} aendere={aendere} /> : null}
            {dieser.id === 'farbe' ? <FarbeSchritt entwurf={entwurf} aendere={aendere} /> : null}
            {dieser.id === 'schrift' ? (
              <SchriftSchritt entwurf={entwurf} aendere={aendere} />
            ) : null}
            {dieser.id === 'masse' ? <MasseSchritt entwurf={entwurf} aendere={aendere} /> : null}
            {dieser.id === 'wortmarke' ? (
              <WortmarkeSchritt entwurf={entwurf} aendere={aendere} />
            ) : null}
            {dieser.id === 'zeichen' ? (
              <ZeichenSchritt entwurf={entwurf} aendere={aendere} />
            ) : null}
            {dieser.id === 'fertig' ? (
              <FertigSchritt
                entwurf={entwurf}
                quelltext={quelltext}
                fehlerhaft={fehlerhaft}
                sichere={sichere}
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-ui px-4 py-3">
            <Button
              icon="chevron-right"
              className="[&>svg]:-scale-x-100"
              disabled={schritt === 0}
              onClick={() => gehe(schritt - 1)}
            >
              Zurück
            </Button>
            <Button
              variant="primary"
              trailingIcon="chevron-right"
              disabled={schritt >= SCHRITTE.length - 1}
              onClick={() => gehe(schritt + 1)}
            >
              Weiter
            </Button>
            <span className="ml-auto text-[11px] text-ui-faint">
              Schritt {schritt + 1} von {SCHRITTE.length}
            </span>
          </div>
        </div>

        {/* Vorschau und Prüfliste */}
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

          {veraltet ? (
            <p className="mb-2 shrink-0 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink">
              Nicht mehr aktuell: der Entwurf trägt gerade einen Fehler. Zu sehen ist der letzte
              Stand, aus dem sich zeichnen ließ — was offen ist, steht unten.
            </p>
          ) : null}

          {platzhalter ? (
            <p className="mb-2 shrink-0 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink">
              Die Wortmarke unten rechts ist ein Platzhalter — sie fehlt noch. Die Farben und die
              Schrift stimmen; die Datei entsteht erst, wenn eine echte da ist.
            </p>
          ) : null}

          <div className={cx('shrink-0', veraltet && 'opacity-60')}>
            <Vorschau theme={theme} blatt={blatt} />
          </div>

          <Pruefliste befunde={befunde} jetzt={schritt} auf={gehe} />
        </div>
      </div>
    </div>
  );
}

/**
 * Lässt sich daraus ein Bild machen, das die Wahrheit sagt?
 *
 * Das ist eine **andere Frage** als „darf daraus eine Datei werden", und sie
 * musste getrennt werden, als der Wizard kam. Ein fehlender Schlüssel hält die
 * Datei auf und hat mit der Folie nichts zu tun; ein unlesbares Hex dagegen
 * macht jedes Bild zur Erfindung. Wer beides über einen Kamm schert, bekommt
 * genau das, was hier vorher stand: eine leere Fläche auf Schritt 2, weil in
 * Schritt 1 noch kein Name eingetragen ist.
 *
 * Geblockt wird deshalb an den Feldern, die das Bild *machen*: Farbe und Maße.
 * Und an der Wortmarke, aber nur, wenn eine da ist — fehlt sie ganz, springt
 * der Platzhalter ein; ist sie da und taugt nicht, gehört sie nicht
 * überzeichnet.
 */
function zeichenbar(befunde: Befund[], hatWortmarke: boolean): boolean {
  return befunde.every(
    (befund) =>
      befund.rang !== 'fehler' ||
      !(
        befund.feld === 'Farbe' ||
        befund.feld === 'Maße' ||
        (befund.feld === 'Wortmarke' && hatWortmarke)
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* Der Schrittbalken                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Die Schritte als Leiste — und zugleich der Stand der Dinge.
 *
 * Ein Schrittbalken, der nur zählt, ist Dekoration. Dieser trägt je Schritt,
 * was dort offen ist, und *deshalb* darf er frei anspringbar sein: wer sieht,
 * wo etwas fehlt, braucht keinen Zwang zur Reihenfolge. Der Zwang wäre auch
 * das Falsche — der halb gefüllte Entwurf auf der Folie ist der Zweck dieser
 * Seite und kein Zustand, aus dem jemand herausgeführt gehört.
 */
function Schrittbalken({
  jetzt,
  befunde,
  auf,
}: {
  jetzt: number;
  befunde: Befund[];
  auf: (ziel: number) => void;
}) {
  const zaehler = SCHRITTE.map(() => ({ fehler: 0, warnung: 0 }));
  for (const befund of befunde) {
    const index = schrittFuerFeld(befund.feld);
    if (index < 0) continue;
    if (befund.rang === 'fehler') zaehler[index].fehler += 1;
    if (befund.rang === 'warnung') zaehler[index].warnung += 1;
  }

  return (
    <nav
      aria-label="Schritte"
      className="flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-ui bg-ui-surface px-4 py-2"
    >
      {SCHRITTE.map((schritt, index) => {
        const stand = zaehler[index];
        const aktiv = index === jetzt;
        /*
           Der Name wird gesetzt und nicht aus dem Inhalt gelesen. „Marke" ist
           in „Wortmarke" enthalten, und die Zahlen daneben stünden mit im
           Namen: „2 Marke 3" ist als Ansage so unbrauchbar, wie es als
           Suchbegriff mehrdeutig ist. Ausgesprochen wird deshalb der Satz, den
           ein Mensch auch lesen würde — und die Abzeichen sind dafür stumm.
        */
        const ansage = [
          `Schritt ${index + 1}: ${schritt.titel}`,
          stand.fehler ? `${stand.fehler} mal „Fehler"` : '',
          stand.warnung ? `${stand.warnung} mal „läuft, ist aber falsch"` : '',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <button
            key={schritt.id}
            type="button"
            aria-label={ansage}
            aria-current={aktiv ? 'step' : undefined}
            onClick={() => auf(index)}
            className={cx(
              'flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 text-[11px] transition-colors',
              aktiv
                ? 'border-ui-strong bg-ui-accent-soft font-semibold text-ui-ink'
                : 'border-transparent text-ui-muted hover:bg-ui-sunken hover:text-ui-ink',
            )}
          >
            <span className="tabular-nums text-ui-faint">{index + 1}</span>
            {schritt.titel}
            {stand.fehler ? (
              <span
                aria-hidden="true"
                className="rounded-sm bg-ui-danger-bg px-1 font-semibold text-ui-danger"
              >
                {stand.fehler}
              </span>
            ) : null}
            {!stand.fehler && stand.warnung ? (
              <span
                aria-hidden="true"
                className="rounded-sm border border-ui-strong px-1 text-ui-muted"
              >
                {stand.warnung}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Die Prüfliste                                                               */
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
 *
 * Gezeigt wird **immer alles**, auch das, was zu einem anderen Schritt gehört.
 * Eine Liste, die sich auf den offenen Schritt beschränkte, versteckte den
 * Kontrastfehler der Palette vor dem, der gerade Schriften einträgt. Was zum
 * offenen Schritt gehört, steht nur weiter oben; alles andere trägt einen Weg
 * dorthin.
 */
function Pruefliste({
  befunde,
  jetzt,
  auf,
}: {
  befunde: Befund[];
  jetzt: number;
  auf: (ziel: number) => void;
}) {
  const raenge: Rang[] = ['fehler', 'warnung', 'hinweis'];
  const sortiert = raenge.flatMap((rang) => {
    const gleich = befunde.filter(
      (befund) => befund.rang === rang && schrittFuerFeld(befund.feld) === jetzt,
    );
    const andere = befunde.filter(
      (befund) => befund.rang === rang && schrittFuerFeld(befund.feld) !== jetzt,
    );
    return [...gleich, ...andere].map((befund) => ({ befund, rang }));
  });

  return (
    <div className="mt-4 shrink-0">
      <h2 className="mb-2 text-ui-title font-semibold">Prüfliste</h2>
      <div className="flex flex-col gap-1.5">
        {sortiert.map(({ befund, rang }, index) => {
          const ziel = schrittFuerFeld(befund.feld);
          const anderswo = ziel >= 0 && ziel !== jetzt;
          return (
            <p
              key={`${rang}-${index}`}
              className={cx('border px-2 py-1.5 text-[11px] leading-snug', RANGTEXT[rang].klasse)}
            >
              <span className="font-semibold">
                {RANGTEXT[rang].titel} · {befund.feld}
              </span>{' '}
              {befund.text}{' '}
              {anderswo ? (
                <button
                  type="button"
                  onClick={() => auf(ziel)}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  Zu Schritt {ziel + 1}
                </button>
              ) : null}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Der letzte Schritt                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Was am Ende herauskommt: zwei Dateien und vier Handgriffe.
 *
 * Die Anleitung steht getrennt vom Kopfkommentar der erzeugten Datei, weil sie
 * *woanders* hingehört — in `src/themes/index.ts` und unter `public/fonts/`.
 */
function FertigSchritt({
  entwurf,
  quelltext,
  fehlerhaft,
  sichere,
}: {
  entwurf: CiEntwurf;
  quelltext: string;
  fehlerhaft: boolean;
  sichere: (text: string, name: string, typ: string) => Promise<void>;
}) {
  return (
    <section className="px-4 py-4">
      <h2 className="text-ui-title font-semibold text-ui-ink">Fertig</h2>
      <p className="mt-1 text-[11px] leading-snug text-ui-faint">
        Zwei Dateien, vier Handgriffe. Solange in der Prüfliste ein Fehler steht, entsteht keine
        Datei — eine mit <span className="font-mono">NaN</span> darin übersetzt anstandslos und
        setzt danach jahrelang leise falsch.
      </p>

      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          icon="download"
          disabled={fehlerhaft || !entwurf.wortmarke}
          onClick={() => void sichere(quelltext, `${entwurf.id}.ts`, 'text/plain')}
        >
          Designdatei
        </Button>
        <Button
          icon="download"
          /*
             Auch am Schlüssel gesperrt, nicht nur an der Wortmarke: ohne ihn
             hieße die Datei „-wortmarke.svg", während der Emitter
             `import wortmarke from './<id>-wortmarke.svg?raw'` schreibt. Die
             beiden Namen müssen zusammenpassen, und Umbenennen ist der
             Handgriff, der beim Ablegen am ehesten schiefgeht.
          */
          disabled={!entwurf.wortmarke || !entwurf.id.trim()}
          onClick={() =>
            void sichere(
              entwurf.wortmarke?.svg ?? '',
              wortmarkeDateiname(entwurf.id),
              'image/svg+xml',
            )
          }
        >
          Wortmarke
        </Button>
      </div>

      <h3 className="mb-2 mt-4 text-ui-title font-semibold">Danach</h3>
      <pre className="whitespace-pre-wrap rounded-sm border border-ui bg-ui-sunken p-3 font-mono text-[11px] leading-relaxed text-ui-muted">
        {anleitung(entwurf)}
      </pre>

      <h3 className="mb-2 mt-4 text-ui-title font-semibold">src/themes/{entwurf.id || '…'}.ts</h3>
      <pre className="overflow-x-auto rounded-sm border border-ui bg-ui-sunken p-3 font-mono text-[10px] leading-relaxed text-ui-ink">
        {quelltext || 'Die Datei entsteht, sobald kein Fehler mehr in der Prüfliste steht.'}
      </pre>
    </section>
  );
}
