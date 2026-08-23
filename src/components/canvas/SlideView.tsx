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
import { useFontsVersion } from '@/hooks/useFonts';
import { useThemeVersion } from '@/hooks/useTheme';
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
  /*
     Der Satz hängt an den geladenen Schriften.

     Gemessen wird gegen die echte Schrift; wer vor dem Laden misst, misst die
     Ersatzschrift und setzt die Wörter falsch. `fonts` zählt hoch, sobald die
     Schnitte da sind — dadurch fallen alle Merker unten und die Folie wird neu
     gesetzt. Ohne das bleibt der erste, falsch gesetzte Satz stehen.
  */
  const fonts = useFontsVersion();
  // Ein Wechsel des Erscheinungsbilds ändert jede Farbe und jedes Maß der
  // Szene. Ohne diesen Zähler bliebe das gemerkte Markup stehen.
  const skin = useThemeVersion();

  // `skin` gehört in die Abhängigkeiten: der Untergrund trägt Tinte, Linie und
  // Signal der Fläche. Ohne ihn behielt die Wortmarke ihre alte Farbe, während
  // alles andere schon umgeschaltet hatte.
  const background = useMemo(
    () => backgroundStyle(slide.meta.background),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide.meta.background, skin],
  );

  // `fonts` steht bewusst in der Liste, obwohl der Rumpf es nicht liest: es ist
  // der Schlüssel, der den Merker verfallen lässt. Gilt für alle drei hier.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const backdrop = useMemo(() => primsToSvgMarkup(buildSlideBackdrop(slide)), [slide, fonts, skin]);

  const footer = useMemo(
    () =>
      chrome ? primsToSvgMarkup(buildSlideChrome(slide, deck, { slideNumber, totalSlides })) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chrome, slide, deck, slideNumber, totalSlides, fonts, skin],
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
            fonts={fonts}
            skin={skin}
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
  /** Zählt hoch, sobald die Schriften da sind — siehe `SlideViewImpl`. */
  fonts: number;
  /** Zählt hoch, sobald ein anderes Erscheinungsbild gilt. */
  skin: number;
}

const ElementLayer = memo(function ElementLayer({
  element,
  background,
  animate,
  index,
  fonts,
  skin,
}: ElementLayerProps) {
  const markup = useMemo(
    () => primsToSvgMarkup(buildElementPrims(element, background)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element, background, fonts, skin],
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
