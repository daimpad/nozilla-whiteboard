/**
 * The application shell.
 *
 * Edit mode is [library | canvas | inspector]; presentation mode takes over the
 * whole window. Deck files and images can be dropped anywhere.
 */
import { useCallback, useEffect, useState } from 'react';
import { starterDeck } from '@/decks';
import { readDroppedFile } from '@/lib/export/download';
import { imageElementFromFile } from '@/lib/imageElement';
import { insertFrame } from '@/lib/layout/slideLayout';
import { useDeckTheme } from '@/hooks/useDeckTheme';
import { selectCurrentSlide, useDeckStore } from '@/state/deckStore';
import { guardUnsavedChanges, loadSession, startAutosave } from '@/state/persistence';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useClipboard } from '@/hooks/useClipboard';
import { CanvasStage } from '@/components/canvas/CanvasStage';
import { AssetSidebar } from '@/components/panels/AssetSidebar';
import { Inspector } from '@/components/panels/Inspector';
import { PromptStudio } from '@/components/panels/PromptStudio';
import { Overview } from '@/components/chrome/Overview';
import { TopBar } from '@/components/chrome/TopBar';
import { SlideRail } from '@/components/chrome/SlideRail';
import { PresentView } from '@/components/present/PresentView';
import { cx } from '@/components/ui/controls';

export default function App() {
  // Das Deck bestimmt das Erscheinungsbild, nicht umgekehrt.
  useDeckTheme();

  const mode = useDeckStore((state) => state.mode);
  const overviewOpen = useDeckStore((state) => state.overviewOpen);
  const promptOpen = useDeckStore((state) => state.promptOpen);
  const deck = useDeckStore((state) => state.deck);
  const slide = useDeckStore(selectCurrentSlide);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);
  const loadDeck = useDeckStore((state) => state.loadDeck);
  const addElement = useDeckStore((state) => state.addElement);

  const [dropping, setDropping] = useState(false);

  useKeyboardShortcuts();
  useClipboard();

  /* --------------------------------------------------------------- startup */
  useEffect(() => {
    const session = loadSession();
    if (session) {
      loadDeck(session.deck, { fileName: session.fileName });
      if (session.slideIndex) useDeckStore.getState().goTo(session.slideIndex);
    } else {
      loadMarkdown(starterDeck.source, { fileName: starterDeck.file });
    }
    const stopAutosave = startAutosave();
    const stopGuard = guardUnsavedChanges();
    return () => {
      stopAutosave();
      stopGuard();
    };
    // Startup runs once; the store is the source of truth from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ drop */
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      if (/\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith('text/')) {
        const opened = await readDroppedFile(file);
        loadMarkdown(opened.text, { fileName: opened.name });
        return;
      }

      if (file.type.startsWith('image/')) {
        // Dieselbe Rechnung wie beim Einfügen aus der Zwischenablage, und der
        // Platz kommt von derselben Stelle wie bei jedem Baustein.
        const element = await imageElementFromFile(file);
        const slide = useDeckStore.getState().deck.slides[useDeckStore.getState().slideIndex];
        const spot = insertFrame(slide?.elements ?? [], element);
        addElement({ ...element, x: spot.x, y: spot.y });
      }
    },
    [addElement, loadMarkdown],
  );

  if (mode === 'present') {
    return (
      <div className="h-full w-full">
        <PresentView />
        {overviewOpen ? <Overview /> : null}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      onDragOver={(event) => {
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <AssetSidebar />

        <main className="relative flex min-w-0 flex-1 flex-col">
          {slide ? (
            <CanvasStage
              slide={slide}
              deck={deck}
              slideNumber={slideIndex + 1}
              totalSlides={deck.slides.length}
            />
          ) : null}
          <SlideRail />
        </main>

        <Inspector />
      </div>

      {overviewOpen ? <Overview /> : null}
      {promptOpen ? <PromptStudio /> : null}

      <div
        className={cx(
          'pointer-events-none absolute inset-0 z-modal flex items-center justify-center',
          'border-2 border-dashed border-ui-accent bg-ui-select-wash transition-opacity duration-fast',
          dropping ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden={!dropping}
      >
        <p className="rounded-md bg-ui-surface px-4 py-3 text-ui-title font-semibold shadow-ui-xl">
          Drop a <code className="font-mono">.md</code> deck to open it, or an image to place it
        </p>
      </div>
    </div>
  );
}
