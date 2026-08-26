/**
 * The application bar: deck identity, file actions, the export menu, canvas
 * options and the presentation switch.
 */
import { useEffect, useRef, useState } from 'react';
import { darfErsetzen, grund, oeffneDeck, sichereDeck } from '@/state/persistence';
import { brand, canvas as canvasTokens } from '@/theme';
import { bundledDecks } from '@/decks';
import {
  exportMarkdown,
  exportPdf,
  exportPng,
  exportPptx,
  exportSvg,
  textModeLabels,
  textModeHints,
  textModes,
  type TextMode,
} from '@/lib/export';
import { selectCanRedo, selectCanUndo, useDeckStore } from '@/state/deckStore';
import { Button, Divider, IconButton, Segmented, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import type { ToolIconName } from '@/assets/icons';
import { Logo } from '@/components/chrome/Logo';

export function TopBar() {
  const deck = useDeckStore((state) => state.deck);
  const fileName = useDeckStore((state) => state.fileName);
  const dirty = useDeckStore((state) => state.dirty);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const total = useDeckStore((state) => state.deck.slides.length);
  const zoom = useDeckStore((state) => state.zoom);
  const showGrid = useDeckStore((state) => state.showGrid);
  const snap = useDeckStore((state) => state.snap);
  const overviewOpen = useDeckStore((state) => state.overviewOpen);
  const canUndo = useDeckStore(selectCanUndo);
  const canRedo = useDeckStore(selectCanRedo);

  const newDeck = useDeckStore((state) => state.newDeck);
  const setZoom = useDeckStore((state) => state.setZoom);
  const toggleGrid = useDeckStore((state) => state.toggleGrid);
  const setSnap = useDeckStore((state) => state.setSnap);
  const toggleOverview = useDeckStore((state) => state.toggleOverview);
  const togglePrompt = useDeckStore((state) => state.togglePrompt);
  const setMode = useDeckStore((state) => state.setMode);
  const undo = useDeckStore((state) => state.undo);
  const redo = useDeckStore((state) => state.redo);
  const addSlide = useDeckStore((state) => state.addSlide);

  const [busy, setBusy] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy('Sichere');
    try {
      await sichereDeck();
    } finally {
      setBusy(null);
    }
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3">
      <Logo className="mr-1" />

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-ui-title font-semibold">{deck.meta.title}</span>
        <span className="truncate text-[11px] text-ui-faint">
          {fileName}
          {dirty ? ' · nicht gesichert' : ''}
        </span>
      </div>

      <Divider className="mx-1" />

      <IconButton
        icon="file-lines"
        label="Neues Deck (⌘⇧N)"
        onClick={() => {
          if (darfErsetzen()) newDeck();
        }}
      />
      <BeispielMenu />
      <IconButton
        icon="folder"
        label="Markdown-Deck öffnen (⌘O)"
        onClick={() => void oeffneDeck()}
      />
      <IconButton icon="download" label="Markdown sichern (⌘S)" onClick={handleSave} />
      <ExportMenu busy={busy} setBusy={setBusy} />

      <Divider className="mx-1" />

      <IconButton
        icon="rotate"
        label="Rückgängig (⌘Z)"
        disabled={!canUndo}
        onClick={undo}
        className="-scale-x-100"
      />
      <IconButton icon="rotate" label="Wiederholen (⇧⌘Z)" disabled={!canRedo} onClick={redo} />

      <Divider className="mx-1" />

      <IconButton icon="plus" label="Folie hinzufügen" onClick={() => addSlide()} />
      <IconButton
        icon="table"
        label="Folienübersicht (⌘K)"
        active={overviewOpen}
        onClick={() => toggleOverview()}
      />
      <Button icon="wand-magic-sparkles" onClick={() => togglePrompt(true)}>
        Prompt
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="tabular-nums text-[11px] text-ui-faint">
          {Math.min(slideIndex + 1, total)} / {total}
        </span>

        <Divider />

        <IconButton
          icon="layer-group"
          label="An Raster und Hilfslinien einrasten"
          active={snap.grid || snap.smart}
          onClick={() => setSnap({ grid: !snap.grid, smart: !snap.smart })}
        />
        <IconButton icon="table" label="Raster zeigen" active={showGrid} onClick={toggleGrid} />

        <Segmented
          value={zoom === 'fit' ? 'fit' : 'custom'}
          onChange={(value) => setZoom(value === 'fit' ? 'fit' : 1)}
          options={[
            { value: 'fit', label: 'Passend' },
            { value: 'custom', label: '100%' },
          ]}
        />

        <Divider />

        <Button variant="primary" icon="play" onClick={() => setMode('present')}>
          Vortragen
        </Button>
      </div>

      {busy ? (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-14 z-toast -translate-x-1/2 bg-ui-inverse px-3 py-1 text-[11px] text-ui-on-inverse shadow-ui-lg"
        >
          {busy}…
        </span>
      ) : null}

      <Hinweis />
    </header>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Die mitgelieferten Decks.
 *
 * Sie stehen nicht hinter „Neues Deck", weil das etwas anderes bedeutet: leer
 * anfangen. Ein Beispiel zu öffnen heißt, etwas Fertiges anzusehen — und
 * überschreibt, was gerade offen ist. Deshalb ein eigener Knopf und die
 * Rückfrage, sobald noch Ungesichertes daliegt.
 */
function BeispielMenu() {
  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const zu = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', zu);
    return () => document.removeEventListener('mousedown', zu);
  }, [open]);

  const oeffne = (deck: (typeof bundledDecks)[number]) => {
    // Die Frage stand ursprünglich hier — als einzige von sechs Stellen.
    // Jetzt steht sie in `darfErsetzen()`, und die anderen fünf stellen sie
    // auch.
    if (!darfErsetzen()) return;
    loadMarkdown(deck.source, { fileName: deck.file });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton
        icon="book"
        label="Beispiel öffnen"
        active={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div
          className="nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg"
          role="menu"
        >
          {bundledDecks.map((deck) => (
            <MenuItem
              key={deck.file}
              icon="file-lines"
              label={deck.label}
              hint={deck.hint}
              onClick={() => oeffne(deck)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExportMenu({
  busy,
  setBusy,
}: {
  busy: string | null;
  setBusy: (value: string | null) => void;
}) {
  const deck = useDeckStore((state) => state.deck);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const zeigeHinweis = useDeckStore((state) => state.zeigeHinweis);
  const [open, setOpen] = useState(false);
  // Wie die Schrift in die Datei kommt. Eine Entscheidung pro Export, kein
  // Deck-Zustand — sie hängt am Ziel (Bildschirm, Druckerei), nicht am Inhalt.
  const [textMode, setTextMode] = useState<TextMode>('embedded');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  /*
     Ein gescheiterter Export sagte nichts.

     `console.error` und der Spinner ging aus: wer auf „PDF" klickte, sah einen
     Moment lang etwas laufen und danach nichts. Keine Datei, keine Meldung,
     kein Unterschied zu einem Export, den man versehentlich abgebrochen hat —
     und der Unterschied ist genau der, auf den es ankommt.

     Ein geschlossener Dateidialog bleibt stumm: das ist keine Panne, sondern
     die Antwort „doch nicht".
  */
  const run = async (label: string, task: () => Promise<unknown>) => {
    setOpen(false);
    // Der nächste Versuch räumt den vorigen Hinweis weg — sonst stünde nach
    // einem geglückten Export noch die Klage über den davor.
    zeigeHinweis(null);
    setBusy(label);
    try {
      await task();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error(error);
        zeigeHinweis(`${label} — gescheitert. ${grund(error)}`);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton
        icon="share"
        label="Export"
        active={open}
        disabled={Boolean(busy)}
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div
          className={cx(
            'nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg',
          )}
          role="menu"
        >
          <MenuItem
            icon="file-lines"
            label="Markdown (Deck und Layout)"
            hint=".md — wieder einlesbar"
            onClick={() => run('Schreibe Markdown', () => exportMarkdown(deck))}
          />
          <MenuItem
            icon="square"
            label="SVG — diese Folie"
            hint={`${canvasTokens.width}×${canvasTokens.height}, echte Pfade`}
            onClick={() =>
              run('Zeichne SVG', () => exportSvg(deck, { slideIndex, text: textMode }))
            }
          />
          <MenuItem
            icon="image"
            label="PNG — diese Folie"
            hint={`${canvasTokens.width * 2}×${canvasTokens.height * 2}, zum Verschicken`}
            onClick={() => run('Rastere PNG', () => exportPng(deck, { slideIndex }))}
          />
          <MenuItem
            icon="layer-group"
            label="SVG — ganzes Deck"
            hint="Eine Datei, Folien untereinander"
            onClick={() => run('Zeichne SVG', () => exportSvg(deck, { text: textMode }))}
          />
          <MenuItem
            icon="book"
            label="PDF — ganzes Deck"
            hint={
              textMode === 'embedded'
                ? 'Vektorseiten, Text bleibt markierbar'
                : 'Vektorseiten, Text als Konturen'
            }
            onClick={() => run('Zeichne PDF', () => exportPdf(deck, { text: textMode }))}
          />
          <MenuItem
            icon="play"
            label="PDF — diese Folie"
            hint="Eine Seite"
            onClick={() =>
              run('Zeichne PDF', () => exportPdf(deck, { slideIndex, text: textMode }))
            }
          />
          <MenuItem
            icon="table"
            label="PowerPoint (.pptx)"
            hint="Bearbeitbar — auch für Google Slides"
            onClick={() => run('Baue PPTX', () => exportPptx(deck))}
          />

          <div className="border-t border-ui px-2 pb-1.5 pt-2">
            <span className="nz-label">Schrift in SVG und PDF</span>
            <Segmented
              value={textMode}
              onChange={setTextMode}
              className="w-full"
              options={textModes.map((mode) => ({
                value: mode,
                label: textModeLabels[mode],
                title: textModeHints[mode],
              }))}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-ui-faint">
              {textMode === 'embedded'
                ? 'Die Marken-Schnitte liegen in der Datei. Text bleibt markierbar und durchsuchbar.'
                : 'Jede Glyphe wird zur Kontur — gleiches Bild auch dort, wo eingebettete Schriften ignoriert werden.'}
            </p>
          </div>

          <p className="border-t border-ui px-2 py-1.5 text-[11px] text-ui-faint">
            Ein Export läuft durch dieselbe Strecke wie die Fläche — die CI von {brand.name}{' '}
            inbegriffen.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ToolIconName;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors duration-fast hover:bg-ui-subtle"
    >
      <span className="mt-0.5 text-ui-faint">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ui-body font-medium">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-ui-faint">{hint}</span> : null}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Der Hinweis, der nach einem Fehlschlag stehen bleibt.
 *
 * Er verschwindet **nicht** von selbst. Ein Hinweis, der sich nach drei
 * Sekunden wegnimmt, ist für den gemacht, der gerade hinsieht — und wer gerade
 * hinsieht, hat den Fehler ohnehin bemerkt. Weggenommen wird er mit einem
 * Klick oder vom nächsten Versuch.
 */
function Hinweis() {
  const text = useDeckStore((state) => state.hinweis);
  const zeigeHinweis = useDeckStore((state) => state.zeigeHinweis);
  if (!text) return null;

  return (
    <div
      role="alert"
      className="absolute left-1/2 top-14 z-toast flex max-w-xl -translate-x-1/2 items-start gap-2 border border-ui-warn bg-ui-warn-bg px-3 py-2 text-ui-body text-ui-ink shadow-ui-lg"
    >
      <Icon name="triangle-exclamation" size={15} className="mt-0.5 shrink-0 text-ui-warn" />
      <span className="min-w-0">{text}</span>
      <IconButton icon="xmark" label="Hinweis schließen" onClick={() => zeigeHinweis(null)} />
    </div>
  );
}
