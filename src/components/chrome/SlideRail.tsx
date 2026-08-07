/**
 * The filmstrip beneath the canvas — always-visible slide navigation and
 * reordering without leaving edit mode.
 */
import { useEffect, useRef } from 'react';
import { canvas } from '@/theme';
import { slideTitle } from '@/model/types';
import { useDeckStore } from '@/state/deckStore';
import { SlideView } from '@/components/canvas/SlideView';
import { IconButton, cx } from '@/components/ui/controls';

const THUMB_WIDTH = 132;

export function SlideRail() {
  const deck = useDeckStore((state) => state.deck);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const goTo = useDeckStore((state) => state.goTo);
  const addSlide = useDeckStore((state) => state.addSlide);
  const moveSlide = useDeckStore((state) => state.moveSlide);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [slideIndex]);

  return (
    <nav
      className="flex h-[104px] shrink-0 items-center gap-2 border-t border-border bg-surface px-2"
      aria-label="Slides"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2">
        {deck.slides.map((slide, index) => (
          <button
            key={slide.id}
            ref={index === slideIndex ? activeRef : undefined}
            type="button"
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== null && dragIndex.current !== index) {
                moveSlide(dragIndex.current, index);
              }
              dragIndex.current = null;
            }}
            onClick={() => goTo(index)}
            title={`${index + 1}. ${slideTitle(slide, index)}`}
            aria-current={index === slideIndex}
            className={cx(
              'group relative shrink-0 overflow-hidden rounded-sm border bg-surface transition-all',
              'duration-fast ease-standard hover:-translate-y-px hover:shadow-md',
              index === slideIndex ? 'border-primary shadow-sm ring-1 ring-primary' : 'border-border',
            )}
            style={{ width: THUMB_WIDTH, height: (THUMB_WIDTH * canvas.height) / canvas.width }}
          >
            <SlideView
              slide={slide}
              deck={deck}
              slideNumber={index + 1}
              totalSlides={deck.slides.length}
              className="pointer-events-none h-full w-full"
            />
            <span
              className={cx(
                'absolute left-1 top-1 rounded-xs px-1 text-[10px] font-bold tabular-nums',
                index === slideIndex ? 'bg-primary text-ink-inverse' : 'bg-surface/85 text-ink-muted',
              )}
            >
              {index + 1}
            </span>
          </button>
        ))}
      </div>

      <IconButton icon="plus" label="Add a slide after this one" onClick={() => addSlide()} />
    </nav>
  );
}
