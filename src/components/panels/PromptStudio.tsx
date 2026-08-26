/**
 * Der Prompt-Generator.
 *
 * Links ein Auftrag als Formular, rechts der fertige Prompt. Der Prompt wird
 * aus dem laufenden Schema gebaut (`lib/prompt/buildPrompt.ts`) — er kann
 * deshalb nichts nennen, was der Parser nicht kennt.
 *
 * Unten schließt sich der Kreis: die Antwort des Modells hier einfügen, und
 * das Deck ist offen. Ohne Datei, ohne Zwischenschritt.
 */
import { useMemo, useState } from 'react';
import {
  buildPrompt,
  deckPurposes,
  emptyBrief,
  purposeLabels,
  type DeckBrief,
  type DeckPurpose,
} from '@/lib/prompt/buildPrompt';
import { parseDeck } from '@/lib/markdown/deck';
import { useDeckStore } from '@/state/deckStore';
import { darfErsetzen } from '@/state/persistence';
import { Button, Field, IconButton, Select, cx } from '@/components/ui/controls';

export function PromptStudio() {
  const close = useDeckStore((state) => state.togglePrompt);
  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);

  const [brief, setBrief] = useState<DeckBrief>(emptyBrief);
  const [withExample, setWithExample] = useState(true);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const prompt = useMemo(() => buildPrompt(brief, { withExample }), [brief, withExample]);
  const set = <K extends keyof DeckBrief>(key: K, value: DeckBrief[K]) =>
    setBrief((current) => ({ ...current, [key]: value }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  /** Die Antwort des Modells als Deck übernehmen. */
  const takeOver = () => {
    const cleaned = stripCodeFence(answer);
    if (!cleaned.trim()) {
      setImportError('Da ist nichts drin.');
      return;
    }
    const deck = parseDeck(cleaned);
    const elements = deck.slides.reduce((sum, slide) => sum + slide.elements.length, 0);
    if (deck.slides.length === 1 && !deck.slides[0].markdown.trim() && elements === 0) {
      setImportError('Das liest sich nicht wie ein Deck. Steht ganz oben das `---`-Frontmatter?');
      return;
    }
    setImportError(null);
    if (!darfErsetzen()) return;
    loadMarkdown(cleaned, { fileName: 'entwurf.md' });
    close(false);
  };

  return (
    <div
      className="absolute inset-0 z-modal flex flex-col bg-ui-canvas"
      role="dialog"
      aria-label="Prompt-Generator"
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-ui bg-ui-surface px-3">
        <h2 className="text-ui-title font-semibold">Prompt-Generator</h2>
        <p className="text-[11px] text-ui-muted">
          Auftrag beschreiben, Prompt kopieren, Antwort zurück einfügen.
        </p>
        <div className="ml-auto">
          <IconButton icon="xmark" label="Schließen (Esc)" onClick={() => close(false)} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,420px)_1fr]">
        {/* ------------------------------------------------------------ Auftrag */}
        <section className="min-h-0 space-y-3 overflow-y-auto border-r border-ui bg-ui-surface p-4">
          <Field label="Thema" hint="Der eine Satz, worum es geht.">
            <textarea
              className="nz-field resize-y"
              rows={2}
              autoFocus
              value={brief.topic}
              onChange={(event) => set('topic', event.target.value)}
              placeholder="Ablösung der Altplattform in zwei Quartalen"
            />
          </Field>

          <Field label="Art">
            <Select
              value={brief.purpose}
              onChange={(event) => set('purpose', event.target.value as DeckPurpose)}
              options={deckPurposes.map((value) => ({ value, label: purposeLabels[value] }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Publikum">
              <input
                className="nz-field"
                value={brief.audience}
                onChange={(event) => set('audience', event.target.value)}
                placeholder="Geschäftsführung"
              />
            </Field>
            <Field label="Folien">
              <input
                type="number"
                min={2}
                max={40}
                className="nz-field"
                value={brief.slideCount}
                onChange={(event) =>
                  set('slideCount', Math.max(2, Number(event.target.value) || 8))
                }
              />
            </Field>
          </div>

          <Field label="Ziel danach" hint="Was soll passieren, wenn das Deck durch ist?">
            <input
              className="nz-field"
              value={brief.goal}
              onChange={(event) => set('goal', event.target.value)}
              placeholder="Freigabe für das erste Quartal"
            />
          </Field>

          <Field label="Material" hint="Stichpunkte, Zahlen, Zitate — roh reicht.">
            <textarea
              className="nz-field resize-y font-mono text-[12px]"
              rows={9}
              value={brief.material}
              onChange={(event) => set('material', event.target.value)}
              placeholder={
                '38 % der Entwicklungszeit gehen in Fehlerbehebung\nZwei Module verursachen drei Viertel der Meldungen\nZielwert 12 % nach zwei Quartalen'
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Titel">
              <input
                className="nz-field"
                value={brief.title}
                onChange={(event) => set('title', event.target.value)}
                placeholder="(automatisch)"
              />
            </Field>
            <Field label="Fußzeile">
              <input
                className="nz-field"
                value={brief.footer}
                onChange={(event) => set('footer', event.target.value)}
              />
            </Field>
          </div>

          <fieldset className="space-y-1.5 border border-ui p-2">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Feinheiten
            </legend>
            <Check
              checked={brief.richCanvas}
              onChange={(value) => set('richCanvas', value)}
              label="Freie Fläche nutzen"
              hint="Karten, Formen und Verbinder statt reiner Textfolien"
            />
            <Check
              checked={brief.notes}
              onChange={(value) => set('notes', value)}
              label="Präsentationsnotizen"
              hint="Ein bis zwei Sätze pro Folie"
            />
            <Check
              checked={withExample}
              onChange={setWithExample}
              label="Beispielfolien mitschicken"
              hint="Trifft das Format deutlich besser, kostet rund ein Drittel der Länge"
            />
          </fieldset>
        </section>

        {/* ------------------------------------------------------------- Prompt */}
        <section className="flex min-h-0 flex-col bg-ui-sunken">
          <div className="flex shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Prompt · {prompt.length.toLocaleString('de-DE')} Zeichen
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="primary" icon={copied ? 'check' : 'clone'} onClick={copy}>
                {copied ? 'Kopiert' : 'Kopieren'}
              </Button>
            </div>
          </div>

          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed">
            {prompt}
          </pre>

          {/* ------------------------------------------------------- Rückweg */}
          <div className="shrink-0 border-t border-ui bg-ui-surface p-3">
            <Field
              label="Antwort des Modells"
              hint="Hier einfügen — das Deck wird direkt geöffnet. Ein umschließender Codeblock stört nicht."
            >
              <textarea
                className="nz-field resize-y font-mono text-[11px]"
                rows={4}
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setImportError(null);
                }}
                placeholder="---&#10;title: …"
              />
            </Field>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="primary"
                icon="file-lines"
                onClick={takeOver}
                disabled={!answer.trim()}
              >
                Als Deck öffnen
              </Button>
              {importError ? (
                <span className={cx('text-[11px] font-semibold text-ui-danger')}>
                  {importError}
                </span>
              ) : (
                <span className="text-[11px] text-ui-muted">
                  Ersetzt das aktuelle Deck. Vorher sichern, wenn es noch gebraucht wird.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-ui-body font-semibold">{label}</span>
        <span className="block text-[11px] text-ui-muted">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Modelle packen ihre Antwort gern in einen Codeblock, obwohl der Prompt es
 * verbietet. Das hier zu tolerieren ist billiger, als den Menschen putzen zu
 * lassen.
 */
export function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  const fenced = /^```[a-z]*\n([\s\S]*?)\n?```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}
