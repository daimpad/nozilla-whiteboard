/**
 * Das Gehäuse der Anwendung.
 *
 * Beim Arbeiten stehen Bibliothek, Fläche und Inspektor nebeneinander; der
 * Vortrag nimmt das ganze Fenster ein. Deck-Dateien und Bilder darf man
 * irgendwohin ins Fenster ziehen.
 */
import { useCallback, useEffect, useState } from 'react';
import { starterDeck } from '@/decks';
import { readDroppedFile } from '@/lib/export/download';
import { beiFehlendenBildern } from '@/lib/export/images';
import { beiAusfallImExport, type Ausfall } from '@/lib/export/glyphCover';
import { imageElementFromFile } from '@/lib/imageElement';
import { insertFrame } from '@/lib/layout/slideLayout';
import { useDeckTheme } from '@/hooks/useDeckTheme';
import { useDeckFolienformat } from '@/hooks/useFolienformat';
import { selectCurrentSlide, useDeckStore } from '@/state/deckStore';
import { guardUnsavedChanges, loadSession, startAutosave, darfErsetzen } from '@/state/persistence';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useClipboard } from '@/hooks/useClipboard';
import { CanvasStage } from '@/components/canvas/CanvasStage';
import { AssetSidebar } from '@/components/panels/AssetSidebar';
import { Inspector } from '@/components/panels/Inspector';
import { PromptStudio } from '@/components/panels/PromptStudio';
import { SearchPanel } from '@/components/panels/SearchPanel';
import { Overview } from '@/components/chrome/Overview';
import { TopBar } from '@/components/chrome/TopBar';
import { SessionWarning } from '@/components/chrome/SessionWarning';
import { SlideRail } from '@/components/chrome/SlideRail';
import { PanelHandle } from '@/components/chrome/PanelHandle';
import { PresentView } from '@/components/present/PresentView';
import { cx } from '@/components/ui/controls';

/**
 * Der Satz, mit dem fehlende Bilder gemeldet werden.
 *
 * Die Namen stehen dabei, sonst ist die Meldung ein Schulterzucken — aber
 * höchstens drei: eine Liste, die über den Rand läuft, sagt weniger als eine
 * Zahl.
 */
export function fehlendeBilderText(fehlend: readonly string[]): string {
  const namen = fehlend.slice(0, 3).join(', ');
  const rest = fehlend.length - 3;
  const liste = rest > 0 ? `${namen} und ${rest} weitere` : namen;
  return fehlend.length === 1
    ? `Ein Bild ließ sich nicht laden und fehlt in der Ausgabe: ${liste}`
    : `${fehlend.length} Bilder ließen sich nicht laden und fehlen in der Ausgabe: ${liste}`;
}

/**
 * Der Satz, mit dem ein Ausfall im Export gemeldet wird.
 *
 * Zwei Dinge können herausfallen, und sie haben verschiedene Ursachen: ein
 * Zeichen, das keine der Marken-Schriften führt, und ein Schnitt, dessen Datei
 * nicht ankommt. Genannt werden beide, denn der Rat ist ein anderer — beim
 * Zeichen ein anderes Zeichen, beim Schnitt die fehlende `.ttf`.
 */
export function ausfallText(ausfall: Ausfall): string {
  const teile: string[] = [];
  if (ausfall.zeichen.length > 0) {
    const liste = ausfall.zeichen.slice(0, 3).join(' ');
    const rest = ausfall.zeichen.length - 3;
    teile.push(
      ausfall.zeichen.length === 1
        ? `Ein Zeichen führt keine der Schriften und fehlt in der Ausgabe: ${liste}`
        : `${ausfall.zeichen.length} Zeichen führt keine der Schriften und fehlen in der Ausgabe: ${liste}${rest > 0 ? ` und ${rest} weitere` : ''}`,
    );
  }
  if (ausfall.schnitte.length > 0) {
    const liste = ausfall.schnitte.slice(0, 3).join(', ');
    const rest = ausfall.schnitte.length - 3;
    const rumpf =
      ausfall.schnitte.length === 1
        ? 'Ein Schnitt ließ sich nicht laden; sein Text steht in der Ersatzschrift'
        : `${ausfall.schnitte.length} Schnitte ließen sich nicht laden; ihr Text steht in der Ersatzschrift`;
    teile.push(`${rumpf}: ${liste}${rest > 0 ? ` und ${rest} weitere` : ''}`);
  }
  return teile.join(' · ');
}

export default function App() {
  // Das Deck bestimmt das Erscheinungsbild, nicht umgekehrt.
  useDeckTheme();
  // Und ebenso das Blatt, auf dem es liegt.
  useDeckFolienformat();

  const mode = useDeckStore((state) => state.mode);
  const overviewOpen = useDeckStore((state) => state.overviewOpen);
  const promptOpen = useDeckStore((state) => state.promptOpen);
  const searchOpen = useDeckStore((state) => state.searchOpen);
  const panels = useDeckStore((state) => state.panels);
  const deck = useDeckStore((state) => state.deck);
  const slide = useDeckStore(selectCurrentSlide);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);
  const loadDeck = useDeckStore((state) => state.loadDeck);
  const addElement = useDeckStore((state) => state.addElement);

  const [dropping, setDropping] = useState(false);

  useKeyboardShortcuts();
  useClipboard();

  /* --------------------------------------------------------------- startup */
  /*
     Sitzungsstart — die eine Stelle, die *nicht* fragt.

     `darfErsetzen()` steht vor jedem Weg, der ein offenes Deck ersetzt. Hier
     gibt es keines: das Fenster ist eben aufgegangen, und was geladen wird,
     ist die gemerkte Sitzung oder das Willkommens-Deck. Fragen hieße, den
     Benutzer beim Öffnen zu fragen, ob er öffnen möchte.

     Der Vermerk ist nicht nur Prosa: `replaceGuard.test.ts` sucht danach und
     nimmt genau die Rufe aus, die ihm nahe genug stehen — beide hier gehören
     zum Sitzungsstart.
  */
  useEffect(() => {
    const session = loadSession();
    if (session) {
      loadDeck(session.deck, { fileName: session.fileName });
      if (session.slideIndex) useDeckStore.getState().goTo(session.slideIndex);
      // Der Sitzungsstart lädt ungesicherte Arbeit: sie steht in keiner
      // Datei. `loadDeck()` setzt `dirty: false`, und `darfErsetzen()` fragt
      // genau daran — ohne diese Zeile liefen alle sechs Ersetzungswege
      // wortlos über die wiederhergestellte Arbeit hinweg.
      useDeckStore.setState({ dirty: true });
    } else {
      loadMarkdown(starterDeck.source, { fileName: starterDeck.file });
    }
    const stopAutosave = startAutosave();
    const stopGuard = guardUnsavedChanges();

    /*
       Die eine Verdrahtung: der Ausgabeweg meldet fehlende Bilder, die
       Oberfläche zeigt sie. `lib/` kennt `state/` nicht und soll es nicht
       kennen — die Naht liegt deshalb hier.

       Ein Bild, das sich nicht laden lässt, bricht keinen Export ab. Es fehlte
       aber auch in jeder Meldung: das PDF kam ohne das Logo heraus, und wer
       es nicht selbst nachsah, merkte es beim Vortrag.
    */
    beiFehlendenBildern((fehlend) => {
      useDeckStore.getState().zeigeHinweis(fehlendeBilderText(fehlend));
    });

    // Und dieselbe Naht für das, was der Schriftweg nicht setzen konnte: ein
    // Zeichen, das keine der Schriften führt, oder ein Schnitt, dessen Datei
    // nicht ankam. Beides stand vorher bestenfalls auf der Konsole.
    beiAusfallImExport((ausfall) => {
      useDeckStore.getState().zeigeHinweis(ausfallText(ausfall));
    });

    return () => {
      stopAutosave();
      stopGuard();
      beiFehlendenBildern(null);
      beiAusfallImExport(null);
    };
    // Der Start läuft einmal; von da an ist der Store die Wahrheit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ drop */
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      if (/\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith('text/')) {
        if (!darfErsetzen()) return;
        const opened = await readDroppedFile(file);
        loadMarkdown(opened.text, { fileName: opened.name });
        return;
      }

      if (file.type.startsWith('image/')) {
        // Dieselbe Rechnung wie beim Einfügen aus der Zwischenablage, und der
        // Platz kommt von derselben Stelle wie bei jedem Baustein.
        const element = await imageElementFromFile(file);
        const slide = useDeckStore.getState().deck.slides[useDeckStore.getState().slideIndex];
        const spot = insertFrame(slide?.elements ?? [], element);
        addElement({ ...element, x: spot.x, y: spot.y });
      }
    },
    [addElement, loadMarkdown],
  );

  if (mode === 'present') {
    return (
      <div className="h-full w-full">
        <PresentView />
        {overviewOpen ? <Overview /> : null}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      onDragOver={(event) => {
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <TopBar />
      <SessionWarning />

      <div className="flex min-h-0 flex-1">
        {panels.library ? <AssetSidebar /> : null}

        {/*
           Die Griffe liegen im `main` und nicht in den Leisten — sonst
           verschwänden sie mit dem, was sie zurückholen sollen. Die Fläche
           misst sich selbst (`useElementSize` in `CanvasStage`); dass sie
           breiter wird, merkt sie ohne Zutun, und „Passend" stimmt sofort.
        */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/*
             Die Griffe liegen im Kasten der *Fläche*, nicht im ganzen `main`.
             Damit sitzt der untere von allein an der Grenze zum Filmstreifen,
             wenn der offen ist, und am Fensterrand, wenn er zu ist — ohne dass
             seine Höhe (104) irgendwo ein zweites Mal aufgeschrieben werden
             müsste. Zwei Rechnungen für dieselbe Kante liefen auseinander.
          */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {slide ? (
              <CanvasStage
                slide={slide}
                deck={deck}
                slideNumber={slideIndex + 1}
                totalSlides={deck.slides.length}
              />
            ) : null}

            <PanelHandle panel="library" side="left" name="Bausteine" shortcut="⌘1" />
            <PanelHandle panel="rail" side="bottom" name="Filmstreifen" shortcut="⌘2" />
            <PanelHandle panel="inspector" side="right" name="Inspektor" shortcut="⌘3" />
          </div>

          {panels.rail ? <SlideRail /> : null}
        </main>

        {panels.inspector ? <Inspector /> : null}
      </div>

      {overviewOpen ? <Overview /> : null}
      {promptOpen ? <PromptStudio /> : null}
      {searchOpen ? <SearchPanel /> : null}

      <div
        className={cx(
          'pointer-events-none absolute inset-0 z-modal flex items-center justify-center',
          'border-2 border-dashed border-ui-accent bg-ui-select-wash transition-opacity duration-fast',
          dropping ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden={!dropping}
      >
        <p className="rounded-md bg-ui-surface px-4 py-3 text-ui-title font-semibold shadow-ui-xl">
          Ein <code className="font-mono">.md</code>-Deck hierher ziehen zum Öffnen, ein Bild zum
          Platzieren
        </p>
      </div>
    </div>
  );
}
