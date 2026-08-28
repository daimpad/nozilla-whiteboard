/**
 * Die Bedienelemente des Generators.
 *
 * Sie benutzen ausschließlich den `ui-*`-Namensraum. Das ist hier nicht bloß
 * Konvention, sondern der Kern der Seite: ein Formular, dessen eigene Flächen
 * die Farben tragen, die es gerade einstellt, wird beim ersten dunklen
 * Kunden-CI unbedienbar. Die Marke gehört in die Vorschau daneben, nirgendwo
 * sonst.
 */
import { useId, type ReactNode } from 'react';
import { cx } from '@/components/ui/controls';

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
}: {
  label: string;
  wert: number;
  auf: (wert: number) => void;
  einheit?: string;
  schritt?: number;
}) {
  const id = useId();
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
 */
export function Farbfeld({
  label,
  rolle,
  wert,
  auf,
  hinweis,
}: {
  label: string;
  rolle: string;
  wert: string;
  auf: (wert: string) => void;
  hinweis?: string;
}) {
  const id = useId();
  const gueltig = /^#[0-9a-f]{6}$/i.test(wert);
  const kanal = gueltig
    ? [1, 3, 5].map((i) => Number.parseInt(wert.slice(i, i + 2), 16)).join(', ')
    : '—';

  return (
    <div className="flex items-start gap-2">
      <input
        type="color"
        aria-label={`${label} wählen`}
        value={gueltig ? wert : '#000000'}
        onChange={(event) => auf(event.target.value.toUpperCase())}
        className="mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-ui bg-ui-surface p-0.5"
      />
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
            onChange={(event) => auf(event.target.value.trim().toUpperCase())}
            className={cx(
              'h-8 w-28 shrink-0 rounded-sm border bg-ui-surface px-2 font-mono text-ui-body focus:outline-none',
              gueltig
                ? 'border-ui text-ui-ink focus:border-ui-strong'
                : 'border-ui-danger text-ui-danger',
            )}
          />
          <span className="truncate font-mono text-[11px] text-ui-faint">rgb({kanal})</span>
        </div>
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
