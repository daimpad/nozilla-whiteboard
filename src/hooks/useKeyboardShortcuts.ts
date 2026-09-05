/**
 * Die Tastatur des ganzen Fensters.
 *
 * Alles läuft über Aktionen des Stores, und alles ist stumm, solange jemand in
 * einem Feld tippt — der Inspektor besteht zu großen Teilen aus Textfeldern,
 * und „⌫ löscht das ausgewählte Element" wäre darin eine Katastrophe.
 *
 * Drei Sperren liegen übereinander, und sie beantworten drei verschiedene
 * Fragen. `isTypingTarget` fragt, ob gerade Text entsteht. `istBedienelement`
 * fragt, ob die Taste dem Knopf gehört, auf dem der Fokus steht. Und
 * `zugedeckt` fragt, ob überhaupt jemand die Folie sieht, die eine Taste
 * gleich verändern würde.
 */
import { useEffect } from 'react';
import { canvas } from '@/theme';
import { useDeckStore } from '@/state/deckStore';
import { darfErsetzen, oeffneDeck, sichereDeck } from '@/state/persistence';

/**
 * Ob der Zeiger gerade in einem Feld steht. Auch die Zwischenablage fragt
 * danach: ein ⌘V im Notizfeld soll Text einfügen und keine Folienelemente.
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Ob die Taste dem Bedienelement gehört, auf dem der Fokus steht.
 *
 * Leertaste und Eingabe *drücken* einen Knopf — das ist die Bedienung ohne
 * Maus, und sie ist nicht verhandelbar. Gemessen am Knopf „Folie hinzufügen":
 * ein Tabstopp darauf, dann Leertaste, und statt einer neuen Folie kam die
 * nächste — der `preventDefault` nahm dem Knopf seine Betätigung und
 * blätterte stattdessen weiter. Im Vortrag traf es „Präsentation verlassen":
 * eine Eingabe darauf ging eine Folie vor, statt den Vortrag zu beenden.
 *
 * Dieselbe Überlegung wie bei `Tab`, das dieses Werkzeug ausdrücklich nicht
 * abfängt: wer die Tasten belegt, mit denen man überhaupt weiterkommt, sperrt
 * den Benutzer dort ein, wo er gerade steht.
 *
 * Gefragt wird nach dem *Element* und nicht nach der Rolle: die Elemente der
 * Arbeitsfläche tragen `role="button"`, damit sie einen Tabstopp bekommen,
 * und dort soll die Leertaste weiterblättern.
 */
const istBedienelement = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.closest('button, a[href], summary') !== null;

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useDeckStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const typing = isTypingTarget(event.target);

      /* -------------------------------------------------- always available */

      if (event.key === 'Escape') {
        if (store.searchOpen) store.toggleSearch(false);
        else if (store.promptOpen) store.togglePrompt(false);
        else if (store.overviewOpen) store.toggleOverview(false);
        else if (store.mode === 'present') store.setMode('edit');
        else if (store.selection.length > 0) store.clearSelection();
        else return;
        event.preventDefault();
        return;
      }

      /*
         Die drei Leisten. `⌘1` bis `⌘3` stehen in der Reihenfolge, in der sie
         am Fenster liegen: links, unten, rechts.

         Sie liegen bewusst *vor* der Tipp-Sperre — wer in einem Feld des
         Inspektors steht und ihn zuklappen will, meint das auch. Dieselbe
         Überlegung wie bei `⌘F`.
      */
      if (mod && !event.shiftKey && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const welche = { '1': 'library', '2': 'rail', '3': 'inspector' } as const;
        store.togglePanel(welche[event.key as '1' | '2' | '3']);
        return;
      }

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void sichereDeck();
        return;
      }

      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void oeffneDeck();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        if (!darfErsetzen()) return;
        store.newDeck();
        return;
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        store.toggleOverview();
        return;
      }

      // Steht vor der Tipp-Sperre, und zwar mit Absicht: wer in einem Feld
      // steht und ⌘F drückt, meint das Deck. Der Browser bietet dafür nichts
      // anderes an, und die Suche des Browsers fände nur, was gerade auf dem
      // Bildschirm steht — also die eine Folie, die man ohnehin sieht.
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        store.toggleSearch(true);
        return;
      }

      if (typing) return;

      // Die zweite Sperre: was ein Knopf braucht, bekommt der Knopf.
      if ((event.key === ' ' || event.key === 'Enter') && istBedienelement(event.target)) return;

      /* --------------------------------------------------------- undo/redo */

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }

      /* ------------------------------------------------------- presentation */

      if (store.mode === 'present') {
        switch (event.key) {
          case 'ArrowRight':
          case 'PageDown':
          case ' ':
          case 'Enter':
            event.preventDefault();
            store.advance();
            return;
          case 'ArrowLeft':
          case 'PageUp':
          case 'Backspace':
            event.preventDefault();
            store.retreat();
            return;
          case 'Home':
            event.preventDefault();
            store.goTo(0);
            return;
          case 'End':
            event.preventDefault();
            store.goTo(store.deck.slides.length - 1);
            return;
          default:
            break;
        }
        const key = event.key.toLowerCase();
        if (key === 'f') {
          event.preventDefault();
          void toggleFullscreen();
          return;
        }
        if (key === 'n') {
          event.preventDefault();
          store.toggleNotes();
          return;
        }
        return;
      }

      /*
         Die dritte Sperre: sieht überhaupt jemand die Folie?

         Übersicht, Suche und Prompt liegen als eigene Schicht davor — die
         Fluchtreihenfolge des `Escape` oben zählt sie der Reihe nach auf.
         Alles darunter blieb trotzdem scharf. Wer im Suchfeld auf „Alle
         ersetzen" geklickt hatte, stand danach auf einem Knopf und nicht in
         einem Feld: ein `⌫` von dort löschte das ausgewählte Element auf der
         Folie darunter, ohne dass etwas davon zu sehen war. Ein `n` legte
         hinter dem Prompt-Dialog eine Folie an, ein `p` startete hinter der
         Übersicht den Vortrag.
      */
      const zugedeckt = store.searchOpen || store.promptOpen || store.overviewOpen;

      /* -------------------------------------------------------- blättern */

      /*
         *Welche* Folie zu sehen ist, darf auch eine offene Schicht ändern:
         die Übersicht zeigt gerade, wo man steht, und wer sucht, will die
         Fundstelle sehen. Geschoben wird dagegen nur, was man auch sieht —
         deshalb zählt die Auswahl hier als leer, solange etwas davorliegt.
      */
      const auswahl = zugedeckt ? 0 : store.selection.length;
      const step = event.shiftKey ? canvas.gridSize * 5 : canvas.gridSize;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (auswahl > 0) store.nudgeSelection(-step, 0);
          else store.previous();
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (auswahl > 0) store.nudgeSelection(step, 0);
          else store.next();
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (auswahl > 0) store.nudgeSelection(0, -step);
          else store.previous();
          return;
        case 'ArrowDown':
          event.preventDefault();
          if (auswahl > 0) store.nudgeSelection(0, step);
          else store.next();
          return;
        case ' ':
          event.preventDefault();
          store.next();
          return;
        case 'Home':
          event.preventDefault();
          store.goTo(0);
          return;
        case 'End':
          event.preventDefault();
          store.goTo(store.deck.slides.length - 1);
          return;
        default:
          break;
      }

      if (zugedeckt) return;

      /* -------------------------------------------------------- editing */

      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        store.selectAll();
        return;
      }

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        store.duplicateSelection();
        return;
      }

      if (mod && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (event.shiftKey) store.ungroupSelection();
        else store.groupSelection();
        return;
      }

      if (mod && (event.key === ']' || event.key === '[')) {
        event.preventDefault();
        if (event.shiftKey) store.reorderSelection(event.key === ']' ? 'front' : 'back');
        else store.reorderSelection(event.key === ']' ? 'forward' : 'backward');
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (store.selection.length === 0) return;
        event.preventDefault();
        store.deleteSelection();
        return;
      }

      /*
         Blanke Buchstaben, und zwar wirklich blank.

         `n` fragte danach, `g` und `p` nicht — und `g` fiel das nur deshalb
         nicht auf die Füße, weil `⌘G` eine Ecke weiter oben schon
         zurückkehrt. `⌘P` kehrte nirgends zurück: es startete den Vortrag
         und nahm dem Browser dabei den Druckdialog weg. Ausgerechnet hier,
         in einem Werkzeug, dessen Zweck druckbares Material ist.
      */
      if (mod) return;
      switch (event.key.toLowerCase()) {
        case 'g':
          event.preventDefault();
          store.toggleGrid();
          break;
        case 'p':
          event.preventDefault();
          store.setMode('present');
          break;
        case 'n':
          event.preventDefault();
          store.addSlide();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Das Vollbild darf abgelehnt werden — in einem eingebetteten Rahmen oder
    // ohne die nötige Erlaubnis. Zu sagen gibt es dazu nichts: wer die Taste
    // drückt, sieht selbst, dass nichts geschieht.
  }
}
