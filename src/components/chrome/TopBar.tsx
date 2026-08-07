/**
 * The application bar: deck identity, file actions, the export menu, canvas
 * options and the presentation switch.
 */
import { useEffect, useRef, useState } from 'react';
import { brand, canvas as canvasTokens } from '@/theme';
import { openMarkdownFile } from '@/lib/export/download';
import { exportMarkdown, exportPdf, exportSvg } from '@/lib/export';
import { selectCanRedo, selectCanUndo, useDeckStore } from '@/state/deckStore';
import { Button, Divider, IconButton, Segmented, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/assets/icons';
import { Logo } from '@/components/chrome/Logo';

export function TopBar() {
  const deck = useDeckStore((state) => state.deck);
  const fileName = useDeckStore((state) => state.fileName);
  const fileHandle = useDeckStore((state) => state.fileHandle);
  const dirty = useDeckStore((state) => state.dirty);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const total = useDeckStore((state) => state.deck.slides.length);
  const zoom = useDeckStore((state) => state.zoom);
  const showGrid = useDeckStore((state) => state.showGrid);
  const snap = useDeckStore((state) => state.snap);
  const overviewOpen = useDeckStore((state) => state.overviewOpen);
  const canUndo = useDeckStore(selectCanUndo);
  const canRedo = useDeckStore(selectCanRedo);

  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);
  const newDeck = useDeckStore((state) => state.newDeck);
  const markSaved = useDeckStore((state) => state.markSaved);
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

  const handleOpen = async () => {
    const file = await openMarkdownFile();
    if (file) loadMarkdown(file.text, { fileName: file.name, handle: file.handle });
  };

  const handleSave = async () => {
    setBusy('Saving');
    try {
      const result = await exportMarkdown(deck, { filename: fileName, handle: fileHandle });
      markSaved({ handle: result.handle });
    } finally {
      setBusy(null);
    }
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      <Logo className="mr-1" />

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-ui-title font-semibold">{deck.meta.title}</span>
        <span className="truncate text-[11px] text-ink-subtle">
          {fileName}
          {dirty ? ' · unsaved' : ''}
        </span>
      </div>

      <Divider className="mx-1" />

      <IconButton icon="file-lines" label="New deck (⌘⇧N)" onClick={newDeck} />
      <IconButton icon="folder" label="Open a Markdown deck (⌘O)" onClick={handleOpen} />
      <IconButton icon="download" label="Save Markdown (⌘S)" onClick={handleSave} />
      <ExportMenu busy={busy} setBusy={setBusy} />

      <Divider className="mx-1" />

      <IconButton
        icon="rotate"
        label="Undo (⌘Z)"
        disabled={!canUndo}
        onClick={undo}
        className="-scale-x-100"
      />
      <IconButton icon="rotate" label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo} />

      <Divider className="mx-1" />

      <IconButton icon="plus" label="Add a slide" onClick={() => addSlide()} />
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
        <span className="tabular-nums text-[11px] text-ink-subtle">
          {Math.min(slideIndex + 1, total)} / {total}
        </span>

        <Divider />

        <IconButton
          icon="layer-group"
          label="Snap to grid and guides"
          active={snap.grid || snap.smart}
          onClick={() => setSnap({ grid: !snap.grid, smart: !snap.smart })}
        />
        <IconButton icon="table" label="Show the grid" active={showGrid} onClick={toggleGrid} />

        <Segmented
          value={zoom === 'fit' ? 'fit' : 'custom'}
          onChange={(value) => setZoom(value === 'fit' ? 'fit' : 1)}
          options={[
            { value: 'fit', label: 'Fit' },
            { value: 'custom', label: '100%' },
          ]}
        />

        <Divider />

        <Button variant="primary" icon="play" onClick={() => setMode('present')}>
          Present
        </Button>
      </div>

      {busy ? (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-14 z-toast -translate-x-1/2 bg-surface-inverse px-3 py-1 text-[11px] text-ink-inverse shadow-lg"
        >
          {busy}…
        </span>
      ) : null}
    </header>
  );
}

/* -------------------------------------------------------------------------- */

function ExportMenu({
  busy,
  setBusy,
}: {
  busy: string | null;
  setBusy: (value: string | null) => void;
}) {
  const deck = useDeckStore((state) => state.deck);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const run = async (label: string, task: () => Promise<unknown>) => {
    setOpen(false);
    setBusy(label);
    try {
      await task();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error(error);
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
            'nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-lg',
          )}
          role="menu"
        >
          <MenuItem
            icon="file-lines"
            label="Markdown (deck + layout)"
            hint=".md — re-importable"
            onClick={() => run('Exporting Markdown', () => exportMarkdown(deck))}
          />
          <MenuItem
            icon="square"
            label="SVG — current slide"
            hint={`${canvasTokens.width}×${canvasTokens.height} vectors`}
            onClick={() => run('Rendering SVG', () => exportSvg(deck, { slideIndex }))}
          />
          <MenuItem
            icon="layer-group"
            label="SVG — whole deck"
            hint="One file, slides stacked"
            onClick={() => run('Rendering SVG', () => exportSvg(deck))}
          />
          <MenuItem
            icon="book"
            label="PDF — whole deck"
            hint="Vector pages, selectable text"
            onClick={() => run('Rendering PDF', () => exportPdf(deck))}
          />
          <MenuItem
            icon="play"
            label="PDF — current slide"
            hint="Single page"
            onClick={() => run('Rendering PDF', () => exportPdf(deck, { slideIndex }))}
          />
          <p className="border-t border-line px-2 py-1.5 text-[11px] text-ink-subtle">
            Exports render through the same pipeline as the canvas — {brand.name} CI included.
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
  icon: IconName;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors duration-fast hover:bg-surface-subtle"
    >
      <span className="mt-0.5 text-ink-subtle">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ui-body font-medium">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-ink-subtle">{hint}</span> : null}
      </span>
    </button>
  );
}
