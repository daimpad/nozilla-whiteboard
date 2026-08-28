/**
 * Die Vorschau — eine echte Folie, über die echte Zeichenstrecke.
 *
 * Das ist der Kern dieser Seite und der Grund, warum sie im Bauwerk liegt und
 * nicht als abgeschriebene Einzeldatei daneben: sie ruft `buildSlideScene()`
 * und `primsToSvgMarkup()`, also **genau das Markup, das der SVG-Export
 * erzeugt**. Was hier steht, steht auch in der Datei. Ein zweiter Zeichner
 * wäre ein Versprechen, das keine Ausgabe hält.
 *
 * Diese Datei liest Marken-Werte — das ist ihr Zweck und keine Verwechslung.
 * `theme.test.ts` führt sie deshalb als Vorschau-Datei; die Bedienfläche
 * daneben benutzt ausschließlich den `ui-*`-Namensraum.
 */
import { useMemo } from 'react';
import { activeTheme, registerTheme, setActiveTheme, type BrandTheme } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { buildSlideScene } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { overflowOf } from '@/lib/overflow';
import { canvas } from '@/theme';
import { PROBEDECK } from './probedeck';

export interface Blatt {
  markup: string;
  hintergrund: string;
  /** Elemente, die aus ihrem Kasten laufen — Kennung und Übermaß. */
  ueberlauf: Array<{ id: string; ueber: number }>;
}

/**
 * Das Probedeck unter einem Erscheinungsbild zeichnen.
 *
 * Das Erscheinungsbild wird dafür wirklich angemeldet und aktiviert. Anders
 * ginge es nicht: die Szene liest ihre Werte über lebendige Bindungen aus der
 * Laufzeit, nicht aus einem durchgereichten Argument — genau deshalb kann ein
 * Deck sein Erscheinungsbild überhaupt wechseln. Danach wird zurückgestellt,
 * damit die Bedienfläche nicht an einem halbfertigen Entwurf hängt.
 *
 * Das Deck wird bei jedem Aufruf neu gelesen, und das ist keine
 * Verschwendung: `overflowOf()` merkt sich sein Ergebnis am *Element-Objekt*.
 * Auf denselben Objekten bekäme man nach einem Schriftwechsel den Überlauf der
 * vorigen Schrift zurück — richtig gerechnet und trotzdem falsch.
 */
export function zeichneProbe(theme: BrandTheme): Blatt[] {
  const vorher = activeTheme().id;
  registerTheme(theme);
  setActiveTheme(theme.id);

  try {
    const deck = parseDeck(PROBEDECK);
    return deck.slides.map((slide) => {
      const szene = buildSlideScene(slide, deck, {
        slideNumber: 1,
        totalSlides: deck.slides.length,
      });
      return {
        markup: primsToSvgMarkup(szene.prims),
        hintergrund: szene.background,
        ueberlauf: slide.elements
          .map((element) => ({ id: element.id, ueber: overflowOf(element) }))
          .filter((eintrag) => eintrag.ueber > 0),
      };
    });
  } finally {
    setActiveTheme(vorher);
  }
}

export function Vorschau({ theme, blatt }: { theme: BrandTheme | null; blatt: number }) {
  const blaetter = useMemo(() => {
    if (!theme) return null;
    try {
      return zeichneProbe(theme);
    } catch {
      // Ein Entwurf, der noch nicht trägt — die Prüfliste daneben sagt warum.
      // Hier stumm zu bleiben ist richtig: die Meldung steht schon einmal auf
      // der Seite, und zweimal derselbe Satz liest sich wie zwei Fehler.
      return null;
    }
  }, [theme]);

  if (!blaetter) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-ui-body text-ui-faint">
        Sobald Schlüssel, Palette und Wortmarke stehen, wird hier eine echte Folie gezeichnet — mit
        demselben Markup, das der SVG-Export erzeugt.
      </div>
    );
  }

  const seite = blaetter[Math.min(blatt, blaetter.length - 1)];

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        className="w-full shrink-0 border border-ui"
        style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
      >
        <svg
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={`Probefolie ${blatt + 1} von ${blaetter.length}`}
          dangerouslySetInnerHTML={{ __html: seite.markup }}
        />
      </div>

      {seite.ueberlauf.length > 0 ? (
        <p className="shrink-0 border border-ui-danger bg-ui-danger-bg px-2 py-1.5 text-[11px] leading-snug text-ui-danger">
          {seite.ueberlauf.length === 1
            ? 'Ein Element läuft'
            : `${seite.ueberlauf.length} Elemente laufen`}{' '}
          aus dem Kasten ({seite.ueberlauf.map((eintrag) => `${eintrag.ueber} px`).join(', ')}).
          Eine breiter laufende Schrift bricht, was von Hand gelegt ist — der Kasten wächst nicht
          mit.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Wie viele Probefolien es gibt.
 *
 * Gelesen und nicht gezählt: ein `split('---')` über den Rohtext zählt die
 * beiden Striche des Frontmatters mit und liefert zwei zu viel. Der Parser
 * weiß es, also fragt man ihn.
 */
export const PROBEFOLIEN = parseDeck(PROBEDECK).slides.length;
