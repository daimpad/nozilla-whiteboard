/**
 * Der Zeichner der Folie.
 *
 * Er zeichnet, indem er *genau* das Markup einsetzt, das der SVG-Export
 * erzeugt: was auf dem Bildschirm steht und was in der Datei landet, sind
 * dieselben Bytes. Jedes Element steckt in einem eigenen `<g>`, damit es seine
 * Einblendung für sich tragen kann.
 */
import { memo, useMemo } from 'react';
import { canvas, motion } from '@/theme';
import { kindLabels, labelOf } from '@/lib/labels';
import { useFontsVersion } from '@/hooks/useFonts';
import { useThemeVersion } from '@/hooks/useTheme';
import { useFolienformatVersion } from '@/hooks/useFolienformat';
import { useImageSizes } from '@/hooks/useImageSizes';
import { bildmass } from '@/lib/export/images';
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
  /** Elemente mit einem höheren Einblendschritt bleiben verborgen. */
  revealStep?: number;
  /** Die Elemente beim Erscheinen bewegen — das gilt dem Vortrag. */
  animateReveals?: boolean;
  /** Die Fußzeile des Decks und die Foliennummer mitzeichnen. */
  chrome?: boolean;
  /**
   * Jedes Element in die Tab-Reihenfolge legen.
   *
   * Ausdrücklich eine Bitte und keine Vorgabe: dieselbe Ansicht zeichnet die
   * Kacheln des Filmstreifens, die Übersicht und den Vortrag. Dort wäre jedes
   * Element ein Halt auf dem Weg zum nächsten Knopf — sechs Folien mit je
   * zehn Elementen sind sechzig Tabs, um an die Leiste zu kommen.
   */
  focusable?: boolean;
  /** Was geschieht, wenn ein Element den Zeiger bekommt. */
  onFocusElement?: (id: string) => void;
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
  focusable = false,
  onFocusElement,
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
  /*
     Die Bildmaße — dieselben, mit denen der Export rechnet.

     Ohne sie fiel der Setzer für ein Markdown-Bild auf „volle Spaltenbreite,
     Verhältnis 0,5625" zurück: ein 300 × 300 großes Logo stand hier 1104 × 621
     da und in jeder Ausgabe 300 × 300, und der Absatz darunter begann einmal
     unterhalb des Folienrands und einmal in der oberen Hälfte. Der Kopf dieser
     Datei verspricht *genau das Markup* des SVG-Exports; ohne dieselben Maße
     stimmt der Satz nicht.
  */
  const bilder = useImageSizes(deck);
  // Ein Wechsel des Erscheinungsbilds ändert jede Farbe und jedes Maß der
  // Szene. Ohne diesen Zähler bliebe das gemerkte Markup stehen.
  const skin = useThemeVersion();
  /*
     Und das Folienformat. Es hängt am **Deck**, die Merker hier hängen an der
     **Folie**: ein Wechsel legt ein neues Deck-Objekt an und lässt jede Folie,
     wie sie war. Ohne diesen Zähler zeichnete die Fläche das alte Blatt
     weiter, während Filmstreifen, Übersicht und jeder Export schon das neue
     zeigen — und der Unterschied fiele erst in der Datei auf.
  */
  const blatt = useFolienformatVersion();

  // `skin` gehört in die Abhängigkeiten: der Untergrund trägt Tinte, Linie und
  // Signal der Fläche. Ohne ihn behielt die Wortmarke ihre alte Farbe, während
  // alles andere schon umgeschaltet hatte.
  const background = useMemo(
    () => backgroundStyle(slide.meta.background),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide.meta.background, skin, blatt],
  );

  // `fonts` und `bilder` stehen bewusst in der Liste, obwohl der Rumpf sie
  // nicht liest: sie sind die Schlüssel, die den Merker verfallen lassen.
  // Gilt für alle drei hier.
  const backdrop = useMemo(
    () => primsToSvgMarkup(buildSlideBackdrop(slide, { resolveImageSize: bildmass })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide, fonts, skin, bilder, blatt],
  );

  const footer = useMemo(
    () =>
      chrome ? primsToSvgMarkup(buildSlideChrome(slide, deck, { slideNumber, totalSlides })) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chrome, slide, deck, slideNumber, totalSlides, fonts, skin, blatt],
  );

  const ordered = useMemo(() => slide.elements.slice().sort((a, b) => a.z - b.z), [slide.elements]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      /*
         Ein `img`, in dem Knöpfe liegen, ist ein Widerspruch: nach dem
         ARIA-Modell sind die Kinder eines Bildes Beiwerk. Auf der
         Arbeitsfläche ist die Folie deshalb ein Behälter (`group`); überall
         sonst — Kachel, Übersicht, Vortrag — ist sie wirklich ein Bild.

         Was diese Zeile **nicht** tut: die Elemente erreichbar machen. Das
         besorgt allein der `tabindex` unten. Chromium tabbt in beiden Fällen
         hinein und führt die Elemente in beiden Fällen im Barrierebaum — das
         ist nachgemessen, und der erste Anlauf dieses Kommentars behauptete
         das Gegenteil.
      */
      role={focusable ? 'group' : 'img'}
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
            bilder={bilder}
            skin={skin}
            focusable={focusable}
            onFocusElement={onFocusElement}
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
  /** Zähler der Bildmaße — lässt den Merker verfallen, sobald sie eintreffen. */
  bilder: number;
  /** Zählt hoch, sobald ein anderes Erscheinungsbild gilt. */
  skin: number;
  focusable: boolean;
  onFocusElement?: (id: string) => void;
}

const ElementLayer = memo(function ElementLayer({
  element,
  background,
  animate,
  index,
  fonts,
  bilder,
  skin,
  focusable,
  onFocusElement,
}: ElementLayerProps) {
  const markup = useMemo(
    () => primsToSvgMarkup(buildElementPrims(element, background, { resolveImageSize: bildmass })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element, background, fonts, skin, bilder],
  );

  const animation = element.reveal?.animation ?? 'rise';

  /*
     Erreichbar ohne Maus — und zwar über die Tab-Reihenfolge des Browsers,
     nicht über eine abgefangene Taste.

     Der naheliegende Weg wäre gewesen, `Tab` in `useKeyboardShortcuts`
     abzufangen und die Auswahl weiterzuschieben. Das hätte die Fläche
     bedienbar gemacht und dafür die Leiste unerreichbar: `Tab` ist *die*
     Taste, mit der man weiterkommt, und wer sie abfängt, sperrt den Benutzer
     in dem Bereich ein, den er gerade erreicht hat.

     Ein `tabindex` am Element kostet dagegen keine Taste. Die Reihenfolge ist
     die Malreihenfolge, weil die Knoten so im Baum stehen; am Ende der Folie
     geht es weiter zur nächsten Leiste, wie überall sonst; und eine
     Hilfstechnik liest an, was da liegt, statt „Grafik" zu sagen.

     Diese drei Attribute sind die ganze Sache. Der Rauchtest hängt an ihnen:
     nimmt man den `tabindex` weg, landet der Zeiger auf keinem Element mehr.
  */
  const gemerkt = focusable
    ? {
        tabIndex: 0,
        role: 'button',
        'aria-label': ansage(element),
        onFocus: () => onFocusElement?.(element.id),
      }
    : {};

  return (
    <g
      data-element-id={element.id}
      className={animate ? `nz-reveal nz-reveal-${animation}` : undefined}
      style={animate ? { animationDelay: `${index * motion.stagger}ms` } : undefined}
      dangerouslySetInnerHTML={{ __html: markup }}
      {...gemerkt}
    />
  );
});

/**
 * Was eine Hilfstechnik über dieses Element sagt.
 *
 * Die Art zuerst, dann ein Stück von dem, was daraufsteht — „Karte: Was wir
 * machen". Ohne den Text wären zehn Karten zehnmal „Karte", und die Ansage
 * hülfe niemandem beim Suchen.
 */
function ansage(element: CanvasElement): string {
  const art = labelOf(kindLabels, element.kind);
  const text = eigenerText(element).replace(/\s+/g, ' ').trim();
  return text ? `${art}: ${text.slice(0, 60)}` : art;
}

function eigenerText(element: CanvasElement): string {
  if ('title' in element && element.title) return element.title;
  if ('text' in element && element.text) return element.text;
  if ('markdown' in element && element.markdown) return element.markdown;
  if ('label' in element && element.label) return element.label;
  // Ein Bild sagt seinen Alternativtext — und wenn keiner da ist, sagt es
  // nichts, denn ein Dateiname ist keine Beschreibung.
  if ('alt' in element && element.alt) return element.alt;
  return '';
}
