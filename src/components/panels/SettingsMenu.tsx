/**
 * Die Einstellungen des Werkzeugs — und nur die.
 *
 * Was hier steht, gehört dem Menschen vor dem Bildschirm und bleibt in seinem
 * Browser. Was auf die Folie gehört, steht im Inspektor und wandert mit der
 * Datei: das Erscheinungsbild eines Decks ist eine Eigenschaft des Decks, die
 * Helligkeit der Leisten ist eine Eigenschaft des Arbeitsplatzes.
 *
 * Deshalb sind das zwei Auswahlfelder an zwei Orten und nicht eines an einem.
 *
 * ## Das Zahnrad sitzt in der Hauptleiste
 *
 * Es saß bis zum 28. August 2026 im Fuß der Bausteinleiste, und das war ein
 * Fehler mit einem Schalter davor: **die Bausteinleiste ist wegklappbar**
 * (⌘1), und ihr Zustand überlebt im Browser. Wer sie einmal zugeklappt hatte,
 * kam an die Erscheinung seines Arbeitsplatzes nicht mehr heran — und suchte
 * sie dort, wo Einstellungen sonst stehen. Genau dort steht sie jetzt.
 */
import { useEffect, useRef, useState } from 'react';
import { setSurfaceMode, surfaceModes, type SurfaceMode } from '@/theme';
import { build, buildDate } from '@/lib/version';
import { useSurface } from '@/hooks/useSurface';
import { Icon } from '@/components/ui/Icon';
import { cx, IconButton, SectionTitle } from '@/components/ui/controls';
import type { ToolIconName } from '@/assets/icons';

const APPEARANCE: Record<SurfaceMode, { label: string; icon: ToolIconName }> = {
  system: { label: 'System', icon: 'circle-half-stroke' },
  light: { label: 'Hell', icon: 'sun' },
  dark: { label: 'Dunkel', icon: 'moon' },
};

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mode, resolved } = useSurface();

  // Ein Klick daneben schließt. Ohne das bliebe das Feld offen, sobald jemand
  // weiterarbeitet — und verdeckte genau die Bibliothek, aus der er greift.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconButton
        icon="gears"
        label="Einstellungen"
        active={open}
        onClick={() => setOpen((value) => !value)}
      />

      {open ? (
        <div
          /*
             `top-9 right-0` und nicht `bottom-9 left-0`: das ist keine
             Vorzeichenfrage, sondern die Entscheidung, in welche Richtung das
             Feld aufgeht. Am Fuß der Leiste ging es nach oben auf; in der
             Kopfleiste ragte es damit aus dem Fenster hinaus — sichtbar nur im
             Bild, kein Test schlüge an.
          */
          className="nz-panel absolute right-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg"
          role="dialog"
          aria-label="Einstellungen"
        >
          <SectionTitle>Erscheinung</SectionTitle>
          <div className="grid grid-cols-3 gap-1 px-2 pb-1">
            {surfaceModes.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setSurfaceMode(value)}
                className={cx(
                  'flex flex-col items-center gap-1 rounded-sm border px-1 py-2',
                  'text-[11px] transition-colors duration-fast ease-standard',
                  mode === value
                    ? 'border-ui-accent-border bg-ui-accent-soft text-ui-ink'
                    : 'border-transparent text-ui-muted hover:bg-ui-subtle',
                )}
              >
                <Icon name={APPEARANCE[value].icon} size={15} />
                {APPEARANCE[value].label}
              </button>
            ))}
          </div>
          <p className="px-2 pb-2 text-[11px] leading-snug text-ui-faint">
            Gilt für die Leisten, nie für die Folie. Ein Export sieht immer gleich aus.
            {mode === 'system'
              ? ` Das System steht gerade auf ${resolved === 'dark' ? 'dunkel' : 'hell'}.`
              : ''}
          </p>

          <div className="border-t border-ui">
            <SectionTitle>Erscheinungsbild</SectionTitle>
            {/*
              Der Generator ist eine eigene Seite und kein Panel: er meldet ein
              Erscheinungsbild an und aktiviert es, um damit ein Probedeck zu
              zeichnen. Täte er das im laufenden Werkzeug, führe die offene
              Folie bei jedem Tastendruck mit.

              `target="_blank"` mit `rel`, damit die offene Arbeit stehen
              bleibt — wer eine CI anlegt, will danach zurück und nicht neu
              laden.
            */}
            <a
              href="./ci.html"
              target="_blank"
              rel="noreferrer"
              className={cx(
                'mx-1 flex items-center gap-2 rounded-sm px-2 py-1.5',
                'text-ui-body text-ui-ink transition-colors duration-fast ease-standard',
                'hover:bg-ui-subtle',
              )}
            >
              <Icon name="palette" size={15} />
              CI-Generator
            </a>
            <p className="px-2 pb-2 pt-1 text-[11px] leading-snug text-ui-faint">
              Ein eigenes Erscheinungsbild anlegen — Farben, Schriften, Maße, Wortmarke. Öffnet sich
              in einem eigenen Fenster.
            </p>
          </div>

          <div className="border-t border-ui">
            <SectionTitle>Stand</SectionTitle>
            <dl className="px-2 pb-2 text-[11px] text-ui-muted">
              <Row term="Version" value={build.version} />
              <Row term="Commit" value={build.commit} />
              <Row term="Vom" value={buildDate()} />
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{term}</dt>
      <dd className="font-mono text-ui-ink">{value}</dd>
    </div>
  );
}
