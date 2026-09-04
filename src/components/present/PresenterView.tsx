/**
 * Die Referentenansicht.
 *
 * Was der Vortragende sieht, während das Publikum die Folie sieht: die
 * laufende Folie klein, **die nächste daneben**, die Notizen groß darunter,
 * und eine Uhr.
 *
 * Die nächste Folie ist der eigentliche Gewinn. Wer weiß, was kommt, kann
 * überleiten — und das ist der Unterschied zwischen Vorlesen und Vortragen.
 *
 * Dieses Fenster hält **kein** Deck im Store. Es bekommt das Markdown über den
 * Kanal und liest es für sich; damit kann hier nichts bearbeitet und nichts
 * versehentlich gespeichert werden. Ein Vortragsfenster, das die Datei ändern
 * könnte, wäre eine schlechte Idee um zwei Uhr nachts vor Publikum.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDeck } from '@/lib/markdown/deck';
import {
  openPresenterChannel,
  type Vortragsnachricht,
  type Vortragsstand,
} from '@/lib/presenterChannel';
import {
  activeTheme,
  isThemeId,
  istFolienformat,
  setActiveTheme,
  setzeFolienformat,
} from '@/theme';
import { slideTitle, type Deck } from '@/model/types';
import { SlideView } from '@/components/canvas/SlideView';
import { Button, IconButton } from '@/components/ui/controls';

export function PresenterView() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [stand, setStand] = useState<Vortragsstand | null>(null);
  const [beendet, setBeendet] = useState(false);
  const kanal = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const c = openPresenterChannel();
    kanal.current = c;
    if (!c) return;

    c.onmessage = (event: MessageEvent<Vortragsnachricht>) => {
      const nachricht = event.data;
      // Jede Nachricht aus einem laufenden Vortrag hebt ein früheres Ende
      // auf: wer den Vortrag verlässt und wieder betritt, findet dasselbe
      // Fenster vor und muss es nicht neu öffnen.
      if (nachricht.art === 'deck') {
        setBeendet(false);
        setDeck(parseDeck(nachricht.markdown));
      } else if (nachricht.art === 'stand') {
        setBeendet(false);
        setStand(nachricht.stand);
      } else if (nachricht.art === 'ende') setBeendet(true);
    };

    // Wer später dazukommt, bekommt nichts mitgeteilt — also fragen.
    c.postMessage({ art: 'hallo' } satisfies Vortragsnachricht);

    // Ein geschlossenes Fenster räumt React nicht ab; `pagehide` ist die
    // Stelle, an der das Vortragsfenster noch etwas sagen kann.
    const tschuess = () => c.postMessage({ art: 'tschuess' } satisfies Vortragsnachricht);
    window.addEventListener('pagehide', tschuess);

    return () => {
      window.removeEventListener('pagehide', tschuess);
      tschuess();
      c.onmessage = null;
      c.close();
    };
  }, []);

  /*
     Das Deck bestimmt auch hier das Erscheinungsbild — dieselbe Richtung wie
     im Werkzeug, nur ohne Store. Ohne das zeichnete die Referentenansicht ein
     fremdes Deck in den Farben von nozilla, und der Vortragende sähe etwas
     anderes als sein Publikum.
  */
  useEffect(() => {
    const gewuenscht = deck?.meta.theme;
    const id = gewuenscht && isThemeId(gewuenscht) ? gewuenscht : 'nozilla';
    if (id !== activeTheme().id) setActiveTheme(id);
    /*
       Und das Blatt ebenso. Dieses Fenster hat keinen Store und damit auch
       nicht `useDeckFolienformat()`; es liest sein Deck selbst aus dem
       Vortragskanal und muss die Bindung deshalb selbst setzen. Ohne das säße
       der Referent vor einer 16:9-Folie, während das Publikum ein A4-Blatt
       sieht — und die Notizen daneben gehörten zu einer anderen Höhe.
    */
    setzeFolienformat(istFolienformat(deck?.meta.format) ? deck.meta.format : '16-9');
  }, [deck]);

  const sende = (nachricht: Vortragsnachricht) => kanal.current?.postMessage(nachricht);

  useEffect(() => {
    const taste = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
        event.preventDefault();
        sende({ art: 'weiter' });
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        sende({ art: 'zurueck' });
      }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, []);

  const slide = deck && stand ? deck.slides[stand.slideIndex] : undefined;
  const naechste = deck && stand ? deck.slides[stand.slideIndex + 1] : undefined;

  if (beendet) {
    return (
      <Mitte>
        <p className="text-ui-title">Der Vortrag ist beendet.</p>
        <Button onClick={() => window.close()}>Fenster schließen</Button>
      </Mitte>
    );
  }

  if (!deck || !stand || !slide) {
    return (
      <Mitte>
        <p className="text-ui-title">Warte auf den Vortrag …</p>
        <p className="max-w-prose text-ui-body text-ui-muted">
          Dieses Fenster folgt dem Vortrag im anderen. Läuft dort keiner, bleibt es leer.
        </p>
      </Mitte>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-ui-canvas p-4">
      {/*
         Drei Teile Folien, zwei Teile Notizen. Zu gleichen Teilen aufgeteilt
         standen die Folien klein und unter ihnen ein halber Bildschirm Weiß —
         die meisten Notizen sind zwei Sätze lang. Was länger ist, rollt.
      */}
      <div className="grid min-h-0 flex-1 grid-rows-[3fr_2fr] gap-3">
        <div className="grid min-h-0 grid-cols-[3fr_2fr] gap-4">
          <Vorschau slide={slide} deck={deck} titel="Jetzt" step={stand.revealStep} />
          {naechste ? (
            <Vorschau slide={naechste} deck={deck} titel="Als Nächstes" />
          ) : (
            <div className="flex flex-col gap-1">
              <h2 className="text-ui-label uppercase tracking-wide text-ui-faint">Als Nächstes</h2>
              <div className="flex flex-1 items-center justify-center border border-dashed border-ui text-ui-body text-ui-faint">
                Letzte Folie
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto border-t border-ui pt-3">
          <h2 className="mb-1 text-ui-label uppercase tracking-wide text-ui-faint">
            Notizen · {slideTitle(slide, stand.slideIndex)}
          </h2>
          <p className="whitespace-pre-wrap text-ui-read text-ui-ink">
            {slide.meta.notes?.trim() || 'Für diese Folie ist nichts notiert.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <IconButton icon="arrow-left" label="Zurück" onClick={() => sende({ art: 'zurueck' })} />
        <span className="tabular-nums text-ui-title font-semibold">
          {stand.slideIndex + 1} / {stand.totalSlides}
        </span>
        <IconButton icon="arrow-right" label="Weiter" onClick={() => sende({ art: 'weiter' })} />
        <Uhr />
      </div>
    </div>
  );
}

function Mitte({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ui-canvas p-8 text-center">
      {children}
    </div>
  );
}

function Vorschau({
  slide,
  deck,
  titel,
  step,
}: {
  slide: Deck['slides'][number];
  deck: Deck;
  titel: string;
  step?: number;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1">
      <h2 className="text-ui-label uppercase tracking-wide text-ui-faint">{titel}</h2>
      {/*
         Kein Kasten mit Seitenverhältnis darum: die Folie hält ihres selbst
         (`preserveAspectRatio`) und stellt sich in ihren Platz. Ein zweites
         Verhältnis daneben stritte nur mit dem ersten.
      */}
      <SlideView slide={slide} deck={deck} revealStep={step} className="min-h-0 flex-1" />
    </div>
  );
}

/**
 * Die Uhr läuft ab dem Öffnen und lässt sich zurückstellen.
 *
 * Absichtlich keine Restzeit: dafür müsste jemand vorher sagen, wie lang der
 * Vortrag werden soll, und diese Angabe stimmt nie. Die verstrichene Zeit
 * stimmt immer.
 */
function Uhr() {
  const [start, setStart] = useState(() => Date.now());
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    const takt = window.setInterval(() => setJetzt(Date.now()), 1000);
    return () => window.clearInterval(takt);
  }, []);

  const sekunden = Math.max(0, Math.floor((jetzt - start) / 1000));
  const anzeige = useMemo(() => {
    const m = Math.floor(sekunden / 60);
    const s = sekunden % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [sekunden]);

  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="tabular-nums text-ui-title font-semibold" aria-label="Verstrichene Zeit">
        {anzeige}
      </span>
      <IconButton
        icon="rotate"
        label="Uhr zurückstellen"
        onClick={() => {
          setStart(Date.now());
          setJetzt(Date.now());
        }}
      />
    </div>
  );
}
