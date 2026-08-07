/**
 * The slide renderer.
 *
 * It draws by injecting the *exact* markup the SVG exporter produces, so what
 * appears on screen and what lands in an exported file are the same bytes.
 * Elements are wrapped in their own `<g>` so each can carry its reveal
 * animation independently.
 */
import { memo, useMemo } from 'react';
import { canvas, motion } from '@/theme';
import {
  backgroundStyle,
  buildElementPrims,
  buildSlideBackdrop,
  buildSlideChrome,
  type BackgroundStyle,
} from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import type { CanvasElement, Deck, Slide } from '@/model/types';

export interface SlideViewProps {
  slide: Slide;
  deck: Deck;
  slideNumber?: number;
  totalSlides?: number;
  /** Elements with a reveal step above this are hidden. */
  revealStep?: number;
  /** Animate elements as they appear (presentation mode). */
  animateReveals?: boolean;
  /** Draw the deck footer and slide number. */
  chrome?: boolean;
  className?: string;
}

function SlideViewImpl({
  slide,
  deck,
  slideNumber,
  totalSlides,
  revealStep = Infinity,
  animateReveals = false,
  chrome = true,
  className,
}: SlideViewProps) {
  const background = useMemo(() => backgroundStyle(slide.meta.background), [slide.meta.background]);

  const backdrop = useMemo(() => primsToSvgMarkup(buildSlideBackdrop(slide)), [slide]);

  const footer = useMemo(
    () =>
      chrome ? primsToSvgMarkup(buildSlideChrome(slide, deck, { slideNumber, totalSlides })) : '',
    [chrome, slide, deck, slideNumber, totalSlides],
  );

  const ordered = useMemo(() => slide.elements.slice().sort((a, b) => a.z - b.z), [slide.elements]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={deck.meta.title}
    >
      <g dangerouslySetInnerHTML={{ __html: backdrop }} />
      {ordered.map((element, index) => {
        const step = element.reveal?.step ?? 0;
        if (step > revealStep) return null;
        return (
          <ElementLayer
            key={element.id}
            element={element}
            background={background}
            animate={animateReveals && step > 0 && step === revealStep}
            index={index}
          />
        );
      })}
      {footer ? <g dangerouslySetInnerHTML={{ __html: footer }} /> : null}
    </svg>
  );
}

export const SlideView = memo(SlideViewImpl);

/* -------------------------------------------------------------------------- */

interface ElementLayerProps {
  element: CanvasElement;
  background: BackgroundStyle;
  animate: boolean;
  index: number;
}

const ElementLayer = memo(function ElementLayer({
  element,
  background,
  animate,
  index,
}: ElementLayerProps) {
  const markup = useMemo(
    () => primsToSvgMarkup(buildElementPrims(element, background)),
    [element, background],
  );

  const animation = element.reveal?.animation ?? 'rise';

  return (
    <g
      data-element-id={element.id}
      className={animate ? `nz-reveal nz-reveal-${animation}` : undefined}
      style={animate ? { animationDelay: `${index * motion.stagger}ms` } : undefined}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
});
