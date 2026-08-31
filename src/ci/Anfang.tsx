/**
 * Der erste Schritt: von wo aus?
 *
 * Zwei Wege, und sie sind nicht gleich viel wert. Von Hand ist der ehrliche,
 * aber lange: rund fünfzig Felder, von denen die meisten aus einem PDF mit
 * Markenrichtlinien abzuschreiben sind. Über ein Sprachmodell ist der schnelle
 * — und der, bei dem etwas hereinkommt, das niemand geprüft hat.
 *
 * Diese Datei ist die Schleuse dazwischen. Sie händigt den Prompt aus, liest
 * die Antwort und legt sie als **Vorschlag** hin: was sich ändern würde, war →
 * wird, Zeile für Zeile. Übernommen wird erst auf einen zweiten Handgriff.
 *
 * Das war einmal anders — ein Knopf hieß „Übernehmen und prüfen", geprüft
 * wurde nach dem Übernehmen, und zurück ging es nur über „Zurücksetzen", das
 * die Handarbeit gleich mit wegwarf. Genau die Bauart, die dieses Projekt an
 * anderer Stelle schon einmal repariert hat: „Sechs Wege ersetzten das Deck,
 * einer fragte."
 *
 * Der Weg zum Modell führt über die Zwischenablage. Kein Aufruf, kein
 * Schlüssel, kein Dienst: dieselbe Linie wie beim ganzen Werkzeug.
 */
import { useMemo, useState } from 'react';
import { Button, cx } from '@/components/ui/controls';
import { Abschnitt } from './felder';
import { promptText } from './prompt';
import {
  fortsetzenAb,
  liesRuecklauf,
  teilRuecklauf,
  type Aenderung,
  type Ruecklauf,
  type Ruecklaufrang,
} from './ruecklauf';
import type { CiEntwurf } from './entwurf';

const RANGTEXT: Record<Ruecklaufrang, { titel: string; klasse: string }> = {
  fehler: { titel: 'Nicht gelesen', klasse: 'border-ui-danger bg-ui-danger-bg text-ui-danger' },
  korrigiert: { titel: 'Geändert', klasse: 'border-ui-strong bg-ui-subtle text-ui-ink' },
  uebergangen: { titel: 'Übergangen', klasse: 'border-ui-strong bg-ui-subtle text-ui-ink' },
  fehlt: { titel: 'Kam nicht', klasse: 'border-ui bg-ui-surface text-ui-muted' },
  gelesen: { titel: 'Gelesen', klasse: 'border-ui bg-ui-surface text-ui-muted' },
};

/** Die Reihenfolge, in der der Bericht gelesen werden soll. */
const RAENGE: Ruecklaufrang[] = ['fehler', 'korrigiert', 'uebergangen', 'fehlt', 'gelesen'];

/**
 * Ein gelesener Vorschlag — und der Entwurf, gegen den er gelesen wurde.
 *
 * Das zweite Feld ist der Grund, aus dem der Vorschlag verfallen kann. Wer
 * liest, dann in Schritt 3 eine Farbe von Hand setzt und danach übernimmt,
 * bekäme sonst die alte Rechnung: „war #00FF9C" über einem Wert, der längst
 * ein anderer ist. Ein Vorschlag, der nicht neu rechnen kann, muss ablaufen.
 */
export interface Vorschlag extends Ruecklauf {
  gelesenGegen: CiEntwurf;
}

export function AnfangSchritt({
  entwurf,
  setzeEntwurf,
  weiter,
  antwort,
  setAntwort,
  vorschlag,
  setVorschlag,
  rueckgaengig,
}: {
  entwurf: CiEntwurf;
  setzeEntwurf: (entwurf: CiEntwurf) => void;
  weiter: () => void;
  antwort: string;
  setAntwort: (wert: string) => void;
  vorschlag: Vorschlag | null;
  setVorschlag: (wert: Vorschlag | null) => void;
  /** Den letzten übernommenen Rücklauf zurücknehmen — `null`, wenn es keinen gibt. */
  rueckgaengig: (() => void) | null;
}) {
  const [kopiert, setKopiert] = useState<string | null>(null);

  const prompt = useMemo(() => promptText(entwurf), [entwurf]);
  const veraltet = vorschlag !== null && vorschlag.gelesenGegen !== entwurf;

  const kopiere = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setKopiert('Der Prompt liegt in der Zwischenablage.');
    } catch {
      // Kein Grund zur Klage und kein Grund zum Schweigen: das Feld darunter
      // steht offen, und von Hand markieren geht immer.
      setKopiert(
        'Die Zwischenablage ließ sich nicht beschreiben — der Prompt steht unten zum Markieren.',
      );
    }
  };

  const lies = () => setVorschlag({ ...liesRuecklauf(antwort, entwurf), gelesenGegen: entwurf });

  const uebernimm = () => {
    if (!vorschlag?.entwurf || veraltet) return;
    setzeEntwurf(vorschlag.entwurf);
    setVorschlag(null);
  };

  const teil = () => {
    if (!vorschlag?.abbruch) return;
    const gelesen = teilRuecklauf(vorschlag.abbruch, entwurf);
    setVorschlag({ ...gelesen, gelesenGegen: entwurf });
  };

  return (
    <>
      <Abschnitt
        titel="Anfang"
        hinweis="Hier entsteht ein eigenes Theme: Farben, Schriften, Maße, Wortmarke. In acht Schritten, rechts immer die Folie dazu. Vorbelegt ist die nozilla-CI — geändert wird nur, was anders sein soll."
      >
        <Button variant="primary" icon="chevron-right" onClick={weiter}>
          Von Hand ausfüllen
        </Button>
      </Abschnitt>

      <Abschnitt
        titel="Oder: aus den Markenrichtlinien"
        hinweis="Den Prompt kopieren, einem Sprachmodell zusammen mit den Richtlinien geben, die Antwort hier einfügen. Der Weg dazwischen ist die Zwischenablage — nichts verlässt diesen Rechner von selbst."
      >
        <div className="flex items-center gap-2">
          <Button icon="copy" onClick={() => void kopiere()}>
            Prompt kopieren
          </Button>
          {kopiert ? <span className="text-[11px] text-ui-muted">{kopiert}</span> : null}
        </div>

        <details className="rounded-sm border border-ui bg-ui-sunken">
          <summary className="cursor-pointer px-2 py-1.5 text-[11px] text-ui-muted">
            Den Prompt ansehen ({prompt.split('\n').length} Zeilen)
          </summary>
          <pre className="max-h-64 overflow-auto border-t border-ui px-2 py-2 font-mono text-[10px] leading-relaxed text-ui-muted">
            {prompt}
          </pre>
        </details>

        <label className="block text-[11px] font-medium text-ui-muted">
          Die Antwort des Modells
          <textarea
            value={antwort}
            onChange={(event) => setAntwort(event.target.value)}
            spellCheck={false}
            rows={8}
            placeholder='{ "id": "probenhaus", "palette": { … } }'
            className="mt-1 block w-full rounded-sm border border-ui bg-ui-surface px-2 py-1.5 font-mono text-[11px] leading-relaxed text-ui-ink placeholder:text-ui-faint focus:border-ui-strong focus:outline-none"
          />
        </label>
        <p className="text-[11px] leading-snug text-ui-faint">
          Der Codezaun darf drin bleiben, ein Satz davor auch, und Kommentare im JSON ebenfalls. Was
          davon herausgenommen werden musste, steht danach im Bericht.
        </p>

        <div className="flex items-center gap-2">
          <Button icon="check" disabled={!antwort.trim()} onClick={lies}>
            Antwort lesen
          </Button>
          {rueckgaengig ? (
            <Button variant="ghost" onClick={rueckgaengig}>
              Rückgängig
            </Button>
          ) : null}
        </div>
      </Abschnitt>

      {vorschlag ? (
        <Bericht
          vorschlag={vorschlag}
          veraltet={veraltet}
          lies={lies}
          uebernimm={uebernimm}
          teil={teil}
        />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Was aus der Antwort würde.
 *
 * Fünf Ränge, und der wichtigste ist „Kam nicht". Ein Modell, das zwölf von
 * sechzehn Palettenrollen liefert, sieht aus, als hätte es geliefert — die
 * vier fehlenden stünden danach in nozilla-Grün auf der Folie einer fremden
 * Marke, und niemand hätte je gesagt, dass sie fehlen.
 */
function Bericht({
  vorschlag,
  veraltet,
  lies,
  uebernimm,
  teil,
}: {
  vorschlag: Vorschlag;
  veraltet: boolean;
  lies: () => void;
  uebernimm: () => void;
  teil: () => void;
}) {
  const { befunde, aenderungen, abbruch, entwurf } = vorschlag;

  return (
    /*
       Der Bericht ist als Bereich benannt, und das ist nicht Zierde: die
       Erklärung über dem Eingabefeld nennt dieselben Wörter („Codezaun",
       „Kommentare"), weil sie ankündigt, was hier stehen wird. Eine Prüfung,
       die die ganze Seite durchsucht, findet sie dort — und bleibt grün, auch
       wenn der Bericht schweigt. Genau das ist beim Gegenprüfen passiert.
    */
    <section aria-label="Bericht zum Rücklauf" className="border-b border-ui px-4 py-4">
      <h2 className="text-ui-title font-semibold text-ui-ink">Das würde daraus</h2>

      {veraltet ? (
        <p className="mt-2 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink">
          Der Entwurf hat sich seit dem Lesen geändert — dieser Vorschlag rechnet gegen einen Stand,
          den es nicht mehr gibt.{' '}
          <button type="button" onClick={lies} className="underline underline-offset-2">
            Noch einmal lesen
          </button>
        </p>
      ) : null}

      {abbruch ? (
        <div className="mt-2">
          <Button variant="primary" onClick={teil}>
            Den vollständigen Anfang lesen ({Object.keys(abbruch.objekt).length} Felder)
          </Button>
          <p className="mt-1 text-[11px] leading-snug text-ui-faint">
            Angeboten, nicht genommen: vollständig war zuletzt „
            {abbruch.letzterSchluessel || '(nichts)'}", alles danach bleibt draußen. Fortsetzen
            lässt sich das Modell {fortsetzenAb(abbruch)}.
          </p>
        </div>
      ) : null}

      {entwurf ? (
        <div className="mt-2">
          <Button variant="primary" disabled={veraltet || !aenderungen.length} onClick={uebernimm}>
            {aenderungen.length === 1
              ? 'Einen Wert übernehmen'
              : `${aenderungen.length} Werte übernehmen`}
          </Button>
          {!aenderungen.length ? (
            <p className="mt-1 text-[11px] leading-snug text-ui-faint">
              Die Antwort ließ sich lesen und ändert nichts — sie nennt durchweg die Werte, die
              schon dastehen.
            </p>
          ) : null}
        </div>
      ) : null}

      {aenderungen.length ? <Aenderungsliste aenderungen={aenderungen} /> : null}

      <h3 className="mb-2 mt-4 text-ui-title font-semibold text-ui-ink">Beim Lesen</h3>
      <div className="flex flex-col gap-1.5">
        {RAENGE.flatMap((rang) =>
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
    </section>
  );
}

/**
 * War → wird, Wert für Wert.
 *
 * Zusammengefasst nach Schritt, weil danach gesucht wird: „was ändert sich an
 * den Farben" ist die Frage, „was ändert sich an Feld Nummer neun" nicht.
 */
function Aenderungsliste({ aenderungen }: { aenderungen: Aenderung[] }) {
  const gruppen = [...new Set(aenderungen.map((eintrag) => eintrag.feld))];

  return (
    <div className="mt-3">
      {gruppen.map((feld) => (
        <div key={feld} className="mb-2">
          <p className="text-[11px] font-medium text-ui-muted">{feld}</p>
          <table className="w-full table-fixed border-collapse text-[11px]">
            <tbody>
              {aenderungen
                .filter((eintrag) => eintrag.feld === feld)
                .map((eintrag) => (
                  <tr key={`${feld}-${eintrag.name}`} className="align-top">
                    <td className="w-28 truncate py-0.5 pr-2 font-mono text-ui-muted">
                      {eintrag.name}
                    </td>
                    <td className="w-24 truncate py-0.5 pr-1 font-mono text-ui-faint line-through">
                      {eintrag.war}
                    </td>
                    <td className="truncate py-0.5 font-mono text-ui-ink">{eintrag.wird}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
