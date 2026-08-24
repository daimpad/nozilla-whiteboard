/**
 * Kopieren, Ausschneiden, Einfügen.
 *
 * Für ein Werkzeug, das sich Whiteboard nennt, ist ⌘V die selbstverständlichste
 * Geste überhaupt — ein Bildschirmfoto machen und es hinlegen. Sie fehlte
 * ganz: eine Bilddatei *fallen zu lassen* ging, sie *einzufügen* nicht, und
 * Elemente ließen sich nur auf derselben Folie duplizieren.
 *
 * Gehorcht wird den Ereignissen `copy`, `cut` und `paste`, nicht den Tasten.
 * Der Unterschied ist nicht kosmetisch: nur in diesen Ereignissen darf man die
 * Zwischenablage ohne Nachfrage lesen und beschreiben. Über `navigator.
 * clipboard` bräuchte es eine Berechtigung, die der Browser beim ersten Mal
 * erfragt — mitten in der Arbeit, für eine Geste, die überall sonst einfach
 * funktioniert.
 *
 * Steht der Zeiger in einem Feld, hält sich alles hier heraus. Das Notizfeld
 * und der Markdown-Kasten sind Textfelder, und dort bedeutet ⌘V, was es
 * überall bedeutet.
 */
import { useEffect } from 'react';
import { elementsToSnippet, snippetToElements } from '@/lib/clipboard';
import { imageElementFromFile } from '@/lib/imageElement';
import { insertFrame } from '@/lib/layout/slideLayout';
import { selectCurrentSlide, useDeckStore } from '@/state/deckStore';
import { isTypingTarget } from '@/hooks/useKeyboardShortcuts';

/**
 * Von welcher Folie der letzte Ausschnitt kam.
 *
 * Nur damit die Kopie versetzt liegt, wenn sie auf dieselbe Folie zurückkommt.
 * Kommt der Text von woanders — aus einem zweiten Fenster, aus einem Editor —,
 * ist hier nichts gemerkt, und dann gilt der Normalfall: an dieselbe Stelle.
 */
let herkunft: { text: string; slideId: string } | null = null;

export function useClipboard(): void {
  useEffect(() => {
    const eigeneElemente = (): string | null => {
      const state = useDeckStore.getState();
      if (state.mode !== 'edit' || state.selection.length === 0) return null;
      const slide = selectCurrentSlide(state);
      if (!slide) return null;
      const gewaehlt = state.selection
        .map((id) => slide.elements.find((element) => element.id === id))
        .filter((element): element is NonNullable<typeof element> => Boolean(element));
      if (gewaehlt.length === 0) return null;

      const text = elementsToSnippet(gewaehlt);
      herkunft = { text, slideId: slide.id };
      return text;
    };

    const onCopy = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const text = eigeneElemente();
      if (!text || !event.clipboardData) return;
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    };

    const onCut = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const text = eigeneElemente();
      if (!text || !event.clipboardData) return;
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
      useDeckStore.getState().deleteSelection();
    };

    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const store = useDeckStore.getState();
      if (store.mode !== 'edit' || !event.clipboardData) return;

      // Bilder zuerst: ein Bildschirmfoto liegt oft *zusammen* mit einem
      // Textschnipsel in der Zwischenablage, und gemeint ist das Bild.
      const bilder = [...event.clipboardData.files].filter((file) =>
        file.type.startsWith('image/'),
      );
      if (bilder.length > 0) {
        event.preventDefault();
        void einfuegenAlsBilder(bilder);
        return;
      }

      const elemente = snippetToElements(event.clipboardData.getData('text/plain'));
      if (elemente.length === 0) return;

      event.preventDefault();
      const slide = selectCurrentSlide(store);
      const zurueck = Boolean(
        herkunft &&
        slide &&
        herkunft.slideId === slide.id &&
        herkunft.text === event.clipboardData.getData('text/plain'),
      );
      store.pasteElements(elemente, { offset: zurueck });
    };

    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, []);
}

/**
 * Bilder landen dort, wo alles Eingesetzte landet — an der Einsetzlinie und
 * untereinander. Sie kommen ohne eigene Koordinaten, also gibt es nichts zu
 * erhalten.
 */
async function einfuegenAlsBilder(dateien: readonly File[]): Promise<void> {
  for (const datei of dateien) {
    const element = await imageElementFromFile(datei);
    const state = useDeckStore.getState();
    const slide = selectCurrentSlide(state);
    const spot = insertFrame(slide?.elements ?? [], element);
    state.addElement({ ...element, x: spot.x, y: spot.y });
  }
}
