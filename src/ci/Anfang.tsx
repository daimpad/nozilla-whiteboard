/**
 * Der erste Schritt: von wo aus?
 *
 * Zwei Wege, und sie sind nicht gleich viel wert. Von Hand ist der ehrliche,
 * aber lange: rund fünfzig Felder, von denen die meisten aus einem PDF mit
 * Markenrichtlinien abzuschreiben sind. Über ein Sprachmodell ist der schnelle
 * — und der, bei dem etwas hereinkommt, das niemand geprüft hat.
 *
 * Diese Datei ist die Schleuse dazwischen. Sie händigt den Prompt aus, nimmt
 * die Antwort entgegen und **sagt Zeile für Zeile, was sie damit gemacht hat**.
 * Das ist der ganze Punkt: ein Rücklauf, der stillschweigend übernommen wird,
 * ist schlimmer als gar keiner — er sieht aus wie Arbeit, die jemand
 * kontrolliert hat.
 *
 * Der Weg dazwischen führt über die Zwischenablage. Kein Aufruf, kein
 * Schlüssel, kein Dienst: dieselbe Linie wie beim ganzen Werkzeug.
 */
import { useMemo, useState } from 'react';
import { Button, cx } from '@/components/ui/controls';
import { Abschnitt } from './felder';
import { promptText } from './prompt';
import { liesRuecklauf, type Ruecklaufbefund, type Ruecklaufrang } from './ruecklauf';
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
 * Der Schritt.
 *
 * `antwort` und `bericht` kommen von **außen**, und das ist keine Förmlichkeit:
 * `CiGenerator` zeichnet immer nur den offenen Schritt, React hängt diesen beim
 * ersten „Weiter" aus dem Baum, und lokaler Zustand geht dabei mit. Standen sie
 * hier, vernichtete genau der Handgriff, den der Bericht empfiehlt — „sieh in
 * Schritt 3 nach" —, die Liste, die ihn empfiehlt. Und der eingefügte
 * Antworttext gleich mit.
 */
export function AnfangSchritt({
  entwurf,
  setzeEntwurf,
  weiter,
  antwort,
  setAntwort,
  bericht,
  setBericht,
}: {
  entwurf: CiEntwurf;
  setzeEntwurf: (entwurf: CiEntwurf) => void;
  weiter: () => void;
  antwort: string;
  setAntwort: (wert: string) => void;
  bericht: Ruecklaufbefund[] | null;
  setBericht: (befunde: Ruecklaufbefund[] | null) => void;
}) {
  const [kopiert, setKopiert] = useState<string | null>(null);

  const prompt = useMemo(() => promptText(entwurf), [entwurf]);

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

  const uebernimm = () => {
    const ergebnis = liesRuecklauf(antwort, entwurf);
    setBericht(ergebnis.befunde);
    if (ergebnis.entwurf) setzeEntwurf(ergebnis.entwurf);
  };

  return (
    <>
      <Abschnitt
        titel="Anfang"
        hinweis="Vorbelegt ist die nozilla-CI — nicht als Vorschlag, sondern damit nicht fünfzig leere Felder fünfzig Entscheidungen erzwingen, von denen vierzig keine sind. Wer von Hand anfängt, geht einfach weiter."
      >
        <Button variant="primary" icon="chevron-right" onClick={weiter}>
          Von Hand ausfüllen
        </Button>
      </Abschnitt>

      <Abschnitt
        titel="Oder: aus den Markenrichtlinien"
        hinweis="Der Generator schreibt das Lastenheft, ein Sprachmodell füllt es aus den Richtlinien aus, und die Antwort kommt hier zurück. Nichts davon verlässt diesen Rechner von selbst — der Weg dazwischen ist die Zwischenablage."
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

        <div>
          <Button variant="primary" disabled={!antwort.trim()} onClick={uebernimm}>
            Übernehmen und prüfen
          </Button>
        </div>
      </Abschnitt>

      {bericht ? <Ruecklaufbericht befunde={bericht} /> : null}
    </>
  );
}

/**
 * Was aus der Antwort geworden ist.
 *
 * Fünf Ränge, und der wichtigste ist „Kam nicht". Ein Modell, das zwölf von
 * sechzehn Palettenrollen liefert, sieht aus, als hätte es geliefert — die
 * vier fehlenden stünden danach in nozilla-Grün auf der Folie einer fremden
 * Marke, und niemand hätte je gesagt, dass sie fehlten.
 */
function Ruecklaufbericht({ befunde }: { befunde: Ruecklaufbefund[] }) {
  return (
    /*
       Der Bericht ist als Bereich benannt, und das ist nicht Zierde: die
       Erklärung über dem Eingabefeld nennt dieselben Wörter („Codezaun",
       „Kommentare"), weil sie ankündigt, was hier stehen wird. Eine Prüfung,
       die die ganze Seite durchsucht, findet sie dort — und bleibt grün, auch
       wenn der Bericht schweigt. Genau das ist beim Gegenprüfen passiert.
    */
    <section aria-label="Bericht zum Rücklauf" className="border-b border-ui px-4 py-4">
      <h2 className="text-ui-title font-semibold text-ui-ink">Was daraus geworden ist</h2>
      <p className="mt-1 text-[11px] leading-snug text-ui-faint">
        Der Entwurf steht jetzt in den Schritten daneben. Ob er trägt, sagt die Prüfliste rechts —
        dieser Bericht sagt nur, was beim Lesen geschah.
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
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
