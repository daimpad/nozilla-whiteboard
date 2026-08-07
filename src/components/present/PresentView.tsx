/**
 * Presentation mode.
 *
 * The slide fills the viewport, transitions play on every change, and elements
 * with a reveal step above zero appear one advance at a time. Controls fade
 * away until the pointer moves.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { canvas, motion } from '@/theme';
import { maxRevealStep, slideTitle } from '@/model/types';
import { selectCurrentSlide, useDeckStore } from '@/state/deckStore';
import { SlideView } from '@/components/canvas/SlideView';
import { IconButton, cx } from '@/components/ui/controls';
import { useElementSize } from '@/hooks/useElementSize';

export function PresentView() {
  const deck = useDeckStore((state) => state.deck);
  const slide = useDeckStore(selectCurrentSlide);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const revealStep = useDeckStore((state) => state.revealStep);
  const notesOpen = useDeckStore((state) => state.notesOpen);

  const advance = useDeckStore((state) => state.advance);
  const retreat = useDeckStore((state) => state.retreat);
  const setMode = useDeckStore((state) => state.setMode);
  const toggleNotes = useDeckStore((state) => state.toggleNotes);

  const [setViewport, viewport] = useElementSize<HTMLDivElement>();
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2200);
  }, []);

  useEffect(() => {
    showChrome();
    return () => window.clearTimeout(hideTimer.current);
  }, [showChrome]);

  const scale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(viewport.width / canvas.width, viewport.height / canvas.height)
      : 0;

  if (!slide) return null;

  const steps = maxRevealStep(slide);
  const transitionClass = `nzl-transition-${slide.meta.transition}`;

  return (
    <div
      ref={setViewport}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-surface-inverse"
      onPointerMove={showChrome}
      onClick={(event) => {
        // Clicking the slide advances; clicking a control does not.
        if ((event.target as HTMLElement).closest('button')) return;
        advance();
      }}
    >
      <div
        // Re-keying on the slide restarts the transition animation.
        key={`${slide.id}-${slideIndex}`}
        className={cx('nzl-stage nzl-stage--present overflow-hidden', transitionClass)}
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
          animationDuration: `${motion.duration.slide}ms`,
        }}
      >
        <SlideView
          slide={slide}
          deck={deck}
          slideNumber={slideIndex + 1}
          totalSlides={deck.slides.length}
          revealStep={revealStep}
          animateReveals
          className="h-full w-full"
        />
      </div>

      {/* ---------------------------------------------------------- controls */}
      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4',
          'transition-opacity duration-base ease-standard',
          chromeVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-pill bg-surface/95 px-2 py-1 shadow-lg">
          <IconButton icon="arrow-left" label="Previous" onClick={retreat} />
          <span className="min-w-16 text-center tabular-nums text-[12px] text-ink-muted">
            {slideIndex + 1} / {deck.slides.length}
            {steps > 0 ? ` · ${Math.min(revealStep, steps)}/${steps}` : ''}
          </span>
          <IconButton icon="arrow-right" label="Next" onClick={advance} />
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-pill bg-surface/95 px-2 py-1 shadow-lg">
          <IconButton
            icon="checklist"
            label="Presenter notes (N)"
            active={notesOpen}
            onClick={() => toggleNotes()}
          />
          <IconButton icon="grid" label="Overview (⌘K)" onClick={() => useDeckStore.getState().toggleOverview(true)} />
          <IconButton icon="close" label="Exit presentation (Esc)" onClick={() => setMode('edit')} />
        </div>
      </div>

      {/* ------------------------------------------------------------- notes */}
      {notesOpen ? (
        <aside className="pointer-events-auto absolute right-4 top-4 w-80 rounded-lg bg-surface p-3 shadow-xl">
          <h3 className="mb-1 text-ui-label font-bold uppercase tracking-wide text-ink-subtle">
            Notes · {slideTitle(slide, slideIndex)}
          </h3>
          <p className="whitespace-pre-wrap text-ui-body text-ink-muted">
            {slide.meta.notes?.trim() || 'No notes for this slide.'}
          </p>
        </aside>
      ) : null}

      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3',
          'transition-opacity duration-base ease-standard',
          chromeVisible ? 'opacity-70' : 'opacity-0',
        )}
      >
        <p className="rounded-pill bg-surface/90 px-3 py-1 text-[11px] text-ink-muted">
          → / Space advance · ← back · F fullscreen · Esc exit
        </p>
      </div>
    </div>
  );
}
