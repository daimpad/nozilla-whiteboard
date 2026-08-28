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
import { useEffect, useMemo } from 'react';
import { registerTheme, withTheme, type BrandTheme } from '@/theme';
import { parseDeck } from '@/lib/markdown/deck';
import { buildSlideScene } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { overflowOf } from '@/lib/overflow';
import { canvas } from '@/theme';
import { fontFaceRules, loadFaces, setzeSchriftregeln } from '@/theme/fonts';
import { useFontsVersion } from '@/hooks/useFonts';
import { PROBEDECK } from './probedeck';

/**
 * Unter dieser Kennung stehen die Schnitte des Entwurfs.
 *
 * Eine eigene, und daran hing der Fehler: `zeichneProbe()` schaltet auf den
 * Entwurf um und im `finally` zurück, und an jedem Wechsel hängt der Abonnent
 * aus `main.tsx`, der `installWebfonts()` ruft. Der räumt seine eigenen Regeln
 * ab und schreibt die des gültigen Erscheinungsbilds — die fremde Schrift stand
 * also genau so lange im Dokument, wie die Szene *gerechnet* wurde, und war
 * weg, bevor der Browser malte. Die einzige Seite, deren Zweck es ist, eine
 * fremde Schrift zu beurteilen, hat sie nie gezeigt.
 */
const ENTWURFS_SCHNITTE = 'nz-ci-entwurf-fonts';

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
  /*
     Umgestellt wird **ohne Ansage**. `setActiveTheme()` heißt „jemand hat ein
     anderes Erscheinungsbild gewählt" und weckt alles, was daran hängt —
     darunter den Abonnenten aus `main.tsx`, der die Schriften neu anfordert.
     Deren Ankunft löst aber genau das Neuzeichnen aus, das hierher geführt
     hat: gemessen 11.505 Umläufe in sechs Sekunden, eine Seite, die einen Kern
     auslastet, solange sie offen steht.

     Hier wird nur gerechnet, und das geht niemanden sonst etwas an. Die
     Schnitte des Entwurfs stehen ohnehin unter eigener Kennung im Dokument
     (siehe oben) — der Setzer findet sie, ohne dass jemand aufgeweckt wird.
  */
  registerTheme(theme);

  return withTheme(theme, () => {
    const deck = parseDeck(PROBEDECK);
    return deck.slides.map((slide, nummer) => {
      const szene = buildSlideScene(slide, deck, {
        // Der Index und nicht die feste 1: die Fußzeile ist der Ort, an dem
        // die Stufe `labelSmall` beurteilt wird, und diese Ansicht verspricht
        // im Kopf, genau das Markup des SVG-Exports zu zeigen. Vorher trug
        // jede der vier Probefolien „1 / 4".
        slideNumber: nummer + 1,
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
  });
}

export function Vorschau({ theme, blatt }: { theme: BrandTheme | null; blatt: number }) {
  /*
     Die Schnitte des Entwurfs einbinden — neben denen des Werkzeugs, unter
     eigener Kennung. `setzeSchriftregeln()` schreibt nur, wenn sich wirklich
     etwas geändert hat; sonst würde jeder Anschlag im Formular die Dateien
     erneut anfordern.

     `loadFaces()` fordert sie danach ausdrücklich an. Ein `@font-face` allein
     lädt nichts: der Browser holt eine Datei erst, wenn ein gezeichnetes
     Zeichen sie braucht — und der Setzer misst vorher.
  */
  const regeln = useMemo(() => (theme ? fontFaceRules(theme.webfont.faces) : ''), [theme]);

  useEffect(() => {
    if (!regeln || !theme) return;
    const vorher = document.getElementById(ENTWURFS_SCHNITTE)?.textContent;
    setzeSchriftregeln(ENTWURFS_SCHNITTE, regeln);
    if (vorher !== regeln) loadFaces(theme.webfont.faces);
  }, [regeln, theme]);

  /*
     Und danach wird neu gemessen. `useFontsVersion()` zählt hoch, sobald die
     Schnitte angekommen sind; ohne diese Abhängigkeit bliebe die erste,
     gegen die Ersatzschrift gerechnete Fassung stehen — samt ihrer
     Wortpositionen und ihrer Überlaufwarnung. Dieselben drei Zeilen und
     derselbe Grund wie in `SlideView`.
  */
  const schriftstand = useFontsVersion();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, schriftstand]);

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
