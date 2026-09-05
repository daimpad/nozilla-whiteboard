/**
 * Die Übersicht — ein Raster aus Kacheln, um zwischen Folien zu springen und
 * sie umzustellen. Die Kacheln sind lebendige `<SlideView/>`, sie zeigen also
 * genau das, was die Folie ist, Elemente eingeschlossen.
 */
import { useEffect, useRef } from 'react';
import { canvas } from '@/theme';
import { slideTitle } from '@/model/types';
import { zaehle } from '@/lib/labels';
import { useDeckStore } from '@/state/deckStore';
import { SlideView } from '@/components/canvas/SlideView';
import { IconButton, cx } from '@/components/ui/controls';
import { useFolienformatVersion } from '@/hooks/useFolienformat';

const THUMB_WIDTH = 232;

export function Overview() {
  /*
     Das Folienmaß wird im Rumpf gelesen, das Format aber in einem Effekt
     gesetzt — und Effekte laufen *nach* dem Zeichnen. Ohne diesen Zähler
     bliebe nach dem Laden eines A4-Decks das 16:9-Blatt stehen, bis
     irgendetwas anderes ein Neuzeichnen auslöste. Derselbe Griff wie bei
     `useThemeVersion()`, und aus genau demselben Grund.
  */
  useFolienformatVersion();
  const deck = useDeckStore((state) => state.deck);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const goTo = useDeckStore((state) => state.goTo);
  const toggleOverview = useDeckStore((state) => state.toggleOverview);
  const moveSlide = useDeckStore((state) => state.moveSlide);
  const duplicateSlide = useDeckStore((state) => state.duplicateSlide);
  const deleteSlide = useDeckStore((state) => state.deleteSlide);
  const addSlide = useDeckStore((state) => state.addSlide);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [slideIndex]);

  return (
    <div
      className="absolute inset-0 z-modal flex flex-col bg-ui-canvas/95 backdrop-blur-sm"
      role="dialog"
      aria-label="Folienübersicht"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3">
        <h2 className="text-ui-title font-semibold">Übersicht</h2>
        <span className="text-[11px] text-ui-faint">
          {zaehle(deck.slides.length, 'Folie', 'Folien')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            icon="plus"
            label="Folie hinzufügen"
            onClick={() => addSlide(deck.slides.length)}
          />
          <IconButton
            icon="xmark"
            label="Übersicht schließen (Esc)"
            onClick={() => toggleOverview(false)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ul
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))` }}
        >
          {deck.slides.map((slide, index) => (
            <li key={slide.id} className="group relative">
              <button
                ref={index === slideIndex ? activeRef : undefined}
                type="button"
                onClick={() => {
                  goTo(index);
                  toggleOverview(false);
                }}
                className={cx(
                  'block w-full overflow-hidden rounded-sm border bg-ui-surface text-left transition-all',
                  'duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-ui-lg',
                  index === slideIndex
                    ? 'border-ui-accent shadow-ui-md ring-2 ring-ui-accent'
                    : 'border-ui',
                )}
              >
                <span
                  className="block overflow-hidden bg-ui-surface"
                  style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                >
                  <SlideView
                    slide={slide}
                    deck={deck}
                    slideNumber={index + 1}
                    totalSlides={deck.slides.length}
                    className="h-full w-full"
                  />
                </span>
                <span className="flex items-center gap-2 border-t border-ui px-2 py-1.5">
                  <span className="tabular-nums text-[11px] font-semibold text-ui-faint">
                    {index + 1}
                  </span>
                  <span className="truncate text-[12px] font-medium">
                    {slideTitle(slide, index)}
                  </span>
                </span>
              </button>

              <div className="absolute right-1.5 top-1.5 flex gap-0.5 bg-ui-surface/90 p-0.5 opacity-0 shadow-ui-sm transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
                <IconButton
                  icon="arrow-left"
                  label="Nach vorn schieben"
                  disabled={index === 0}
                  onClick={() => moveSlide(index, index - 1)}
                  className="h-6 w-6"
                  size={13}
                />
                <IconButton
                  icon="arrow-right"
                  label="Nach hinten schieben"
                  disabled={index === deck.slides.length - 1}
                  onClick={() => moveSlide(index, index + 1)}
                  className="h-6 w-6"
                  size={13}
                />
                <IconButton
                  icon="plus"
                  label="Folie duplizieren"
                  onClick={() => duplicateSlide(index)}
                  className="h-6 w-6"
                  size={13}
                />
                <IconButton
                  icon="xmark"
                  label="Folie löschen"
                  tone="danger"
                  onClick={() => deleteSlide(index)}
                  className="h-6 w-6"
                  size={13}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
