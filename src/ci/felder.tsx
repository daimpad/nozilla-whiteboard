/**
 * Die Bedienelemente des Generators.
 *
 * Sie benutzen ausschließlich den `ui-*`-Namensraum. Das ist hier nicht bloß
 * Konvention, sondern der Kern der Seite: ein Formular, dessen eigene Flächen
 * die Farben tragen, die es gerade einstellt, wird beim ersten dunklen
 * fremden CI unbedienbar. Die Marke gehört in die Vorschau daneben, nirgendwo
 * sonst.
 */
import { useId, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/controls';
import { normalisiereFarbe } from './farbwert';

export function Abschnitt({
  titel,
  hinweis,
  children,
}: {
  titel: string;
  hinweis?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-ui px-4 py-4">
      <h2 className="text-ui-title font-semibold text-ui-ink">{titel}</h2>
      {hinweis ? <p className="mt-1 text-[11px] leading-snug text-ui-faint">{hinweis}</p> : null}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Textfeld({
  label,
  wert,
  auf,
  hinweis,
  platzhalter,
  einheit,
}: {
  label: string;
  wert: string;
  auf: (wert: string) => void;
  hinweis?: string;
  platzhalter?: string;
  einheit?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-ui-muted">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="text"
          value={wert}
          placeholder={platzhalter}
          onChange={(event) => auf(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-sm border border-ui bg-ui-surface px-2 text-ui-body text-ui-ink placeholder:text-ui-faint focus:border-ui-strong focus:outline-none"
        />
        {einheit ? <span className="shrink-0 text-[11px] text-ui-faint">{einheit}</span> : null}
      </div>
      {hinweis ? <p className="mt-1 text-[11px] leading-snug text-ui-faint">{hinweis}</p> : null}
    </div>
  );
}

export function Zahlenfeld({
  label,
  wert,
  auf,
  einheit,
  schritt,
  anker,
}: {
  label: string;
  wert: number;
  auf: (wert: number) => void;
  einheit?: string;
  schritt?: number;
  /** Eine stabile Kennung, damit ein Befund hierher springen kann. */
  anker?: string;
}) {
  const erzeugt = useId();
  const id = anker ?? erzeugt;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-24 shrink-0 font-mono text-[11px] text-ui-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        step={schritt ?? 1}
        value={Number.isFinite(wert) ? wert : ''}
        onChange={(event) => auf(Number.parseFloat(event.target.value))}
        className="h-8 w-24 rounded-sm border border-ui bg-ui-surface px-2 text-right tabular-nums text-ui-body text-ui-ink focus:border-ui-strong focus:outline-none"
      />
      {einheit ? <span className="text-[11px] text-ui-faint">{einheit}</span> : null}
    </div>
  );
}

/**
 * Ein Farbfeld: Wähler und Hex nebeneinander, dazu die Kanäle als Klartext.
 *
 * Beides zusammen und nicht eines von beiden, weil beide Wege wirklich
 * vorkommen: aus einem Styleguide wird ein Hex-Wert kopiert, an einem
 * Nachbarton wird geschoben. Und die RGB-Zeile daneben ist kein Schmuck — ein
 * Styleguide nennt seine Farben oft als `rgb(…)`, und wer sie hier wiedererkennt,
 * hat sich nicht vertippt.
 *
 * ## Zwei Kleinigkeiten, die beide einmal falsch waren
 *
 * **Aufgeräumt wird beim Verlassen, nicht beim Tippen.** Die vorige Fassung
 * rief `trim().toUpperCase()` bei jedem Anschlag. Das klingt harmlos und
 * machte das Feld unbedienbar für den häufigsten Fall überhaupt: wer
 * `rgb(228, 0, 58)` hineinkopierte, konnte danach kein Leerzeichen mehr tippen
 * — der `trim()` fraß es, sobald es am Rand stand —, und ein Wert, den man in
 * Kleinschrift kennt, sprang unter den Fingern in Versalien. Beim Verlassen
 * ist es dagegen genau richtig: dort steht der Wert fest.
 *
 * **Und ein unlesbarer Wert färbt den Wähler nicht schwarz.** `value` eines
 * `input[type=color]` *muss* ein `#RRGGBB` sein; stand dort etwas anderes,
 * zeigte der Browser `#000000`. Ein Schwarz, das niemand gewählt hat, sieht
 * aus wie eine Entscheidung — und wer daneben klickt, hat sie getroffen. Der
 * Wähler bleibt deshalb ausgeblendet, solange der Wert nicht steht.
 */
export function Farbfeld({
  label,
  rolle,
  wert,
  auf,
  hinweis,
  anker,
}: {
  label: string;
  rolle: string;
  wert: string;
  auf: (wert: string) => void;
  hinweis?: string;
  /** Eine stabile Kennung, damit ein Befund hierher springen kann. */
  anker?: string;
}) {
  const erzeugt = useId();
  /*
     `useId()` erzeugt Kennungen wie `:r7:` — eindeutig, aber nicht
     vorhersagbar. Ein Befund, der auf ein Feld zeigen soll, braucht eine, die
     schon feststeht, bevor das Feld gezeichnet ist. Deshalb darf sie von außen
     kommen; ohne Anker bleibt es bei der erzeugten.
  */
  const id = anker ?? erzeugt;
  const gueltig = /^#[0-9a-f]{6}$/i.test(wert);
  const kanal = gueltig
    ? [1, 3, 5].map((i) => Number.parseInt(wert.slice(i, i + 2), 16)).join(', ')
    : '—';

  /*
     Was beim Verlassen geschieht: `rgb(…)`, eine Kurzform und eine fehlende
     Raute werden zu dem einen Format, das sich anmelden lässt. Was sich nicht
     lesen lässt, bleibt stehen, wie es dasteht — der Rahmen ist rot, die
     Prüfliste nennt die Rolle, und ein stiller Ersatz behauptete, es sei etwas
     anderes gemeint gewesen.

     **Und die Korrektur sagt, was sie getan hat.** `normalisiereFarbe()` gibt
     den Satz dafür zurück, und der Kopf jener Datei schreibt ausdrücklich, wozu:
     „Eine stille Korrektur ist eine Behauptung: ‚das war gemeint'." Der
     Rücklauf-Leser hielt sich daran, dieses Feld nicht — es las nur den Wert
     und warf den Satz weg. Der teuerste Fall dabei ist die weggefallene
     Deckkraft: wer `rgba(17, 17, 17, 0.05)` aus einem Styleguide einsetzt,
     sah danach `#111111` im Feld — Fast-Schwarz statt eines Fünf-Prozent-Grau —
     und kein Wort dazu. Danach sieht es keine Prüfung mehr: `#111111` ist ein
     gültiger Wert.
  */
  const [korrigiert, setKorrigiert] = useState<string | null>(null);
  const raeumeAuf = () => {
    const korrektur = normalisiereFarbe(wert);
    if (!korrektur || korrektur.wert === wert) return;
    auf(korrektur.wert);
    setKorrigiert(korrektur.wie);
  };

  return (
    <div className="flex items-start gap-2">
      {gueltig ? (
        <input
          type="color"
          aria-label={`${label} wählen`}
          value={wert}
          onChange={(event) => auf(event.target.value.toUpperCase())}
          className="mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-ui bg-ui-surface p-0.5"
        />
      ) : (
        <span
          aria-hidden="true"
          title="Kein lesbarer Wert — der Wähler zeigte sonst ein Schwarz, das niemand gewählt hat."
          className="mt-0.5 h-8 w-8 shrink-0 rounded-sm border border-ui-danger bg-ui-sunken"
        />
      )}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-[11px] font-medium text-ui-muted">
          {label} <span className="font-mono text-ui-faint">{rolle}</span>
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id={id}
            type="text"
            value={wert}
            spellCheck={false}
            onChange={(event) => {
              setKorrigiert(null);
              auf(event.target.value);
            }}
            onBlur={raeumeAuf}
            className={cx(
              'h-8 w-28 shrink-0 rounded-sm border bg-ui-surface px-2 font-mono text-ui-body focus:outline-none',
              gueltig
                ? 'border-ui text-ui-ink focus:border-ui-strong'
                : 'border-ui-danger text-ui-danger',
            )}
          />
          <span className="truncate font-mono text-[11px] text-ui-faint">rgb({kanal})</span>
        </div>
        {korrigiert ? (
          <p className="mt-1 text-[11px] leading-snug text-ui-ink">Übernommen: {korrigiert}.</p>
        ) : null}
        {hinweis ? <p className="mt-1 text-[11px] leading-snug text-ui-faint">{hinweis}</p> : null}
      </div>
    </div>
  );
}

export function Wahlfeld<T extends string>({
  label,
  wert,
  optionen,
  auf,
  hinweis,
}: {
  label: string;
  wert: T;
  optionen: Array<{ value: T; label: string }>;
  auf: (wert: T) => void;
  hinweis?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-ui-muted">
        {label}
      </label>
      <select
        id={id}
        value={wert}
        onChange={(event) => auf(event.target.value as T)}
        className="mt-1 h-8 w-full rounded-sm border border-ui bg-ui-surface px-2 text-ui-body text-ui-ink focus:border-ui-strong focus:outline-none"
      >
        {optionen.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hinweis ? <p className="mt-1 text-[11px] leading-snug text-ui-faint">{hinweis}</p> : null}
    </div>
  );
}
