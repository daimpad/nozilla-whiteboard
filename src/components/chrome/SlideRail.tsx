/**
 * Der Filmstreifen unter der Fläche — Folien wechseln und umstellen, ohne die
 * Arbeit zu verlassen, und immer im Blick.
 */
import { useEffect, useRef } from 'react';
import { canvas } from '@/theme';
import { slideTitle } from '@/model/types';
import { useDeckStore } from '@/state/deckStore';
import { SlideView } from '@/components/canvas/SlideView';
import { IconButton, cx } from '@/components/ui/controls';
import { useFolienformatVersion } from '@/hooks/useFolienformat';

/**
 * Die Höhe einer Kachel — und die Breite folgt daraus, nicht umgekehrt.
 *
 * Andersherum stand es hier, und mit einem Folienformat war es falsch: bei
 * fester Breite ist eine hochkante Kachel 187 Pixel hoch, der Streifen aber
 * 104 — die Kacheln wurden unten abgeschnitten, und man sah der Übersicht
 * nicht an, welche Folie man anklickt. Der Streifen gibt seine Höhe vor, also
 * ist sie die feste Größe.
 *
 * 74 ist die Höhe, die eine 16:9-Kachel bisher hatte (132 · 9/16); an einem
 * bestehenden Deck ändert sich damit nichts.
 */
const THUMB_HEIGHT = 74;

export function SlideRail() {
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
  const addSlide = useDeckStore((state) => state.addSlide);
  const moveSlide = useDeckStore((state) => state.moveSlide);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [slideIndex]);

  return (
    <nav
      className="flex h-[104px] shrink-0 items-center gap-2 border-t border-ui bg-ui-surface px-2"
      aria-label="Folien"
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
              'group relative shrink-0 overflow-hidden rounded-sm border bg-ui-surface transition-all',
              'duration-fast ease-standard hover:-translate-y-px hover:shadow-ui-md',
              index === slideIndex
                ? 'border-ui-accent shadow-ui-sm ring-1 ring-ui-accent'
                : 'border-ui',
            )}
            style={{ width: (THUMB_HEIGHT * canvas.width) / canvas.height, height: THUMB_HEIGHT }}
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
                index === slideIndex
                  ? 'bg-ui-accent text-ui-on-accent'
                  : 'bg-ui-surface/85 text-ui-muted',
              )}
            >
              {index + 1}
            </span>
          </button>
        ))}
      </div>

      <IconButton icon="plus" label="Folie danach einfügen" onClick={() => addSlide()} />
    </nav>
  );
}
