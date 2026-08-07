/**
 * Global keyboard handling.
 *
 * Everything is routed through store actions, and every shortcut is inert while
 * the user is typing in a field — the inspector has a lot of text areas and
 * "Backspace deletes the selected element" would be catastrophic inside one.
 */
import { useEffect } from 'react';
import { canvas } from '@/theme';
import { exportMarkdown } from '@/lib/export';
import { openMarkdownFile } from '@/lib/export/download';
import { useDeckStore } from '@/state/deckStore';

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useDeckStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const typing = isTypingTarget(event.target);

      /* -------------------------------------------------- always available */

      if (event.key === 'Escape') {
        if (store.promptOpen) store.togglePrompt(false);
        else if (store.overviewOpen) store.toggleOverview(false);
        else if (store.mode === 'present') store.setMode('edit');
        else if (store.selection.length > 0) store.clearSelection();
        else return;
        event.preventDefault();
        return;
      }

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void exportMarkdown(store.deck, {
          filename: store.fileName,
          handle: store.fileHandle,
        }).then((result) => useDeckStore.getState().markSaved({ handle: result.handle }));
        return;
      }

      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void openMarkdownFile().then((file) => {
          if (file) {
            useDeckStore
              .getState()
              .loadMarkdown(file.text, { fileName: file.name, handle: file.handle });
          }
        });
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        store.newDeck();
        return;
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        store.toggleOverview();
        return;
      }

      if (typing) return;

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

      const step = event.shiftKey ? canvas.gridSize * 5 : canvas.gridSize;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (store.selection.length > 0) store.nudgeSelection(-step, 0);
          else store.previous();
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (store.selection.length > 0) store.nudgeSelection(step, 0);
          else store.next();
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (store.selection.length > 0) store.nudgeSelection(0, -step);
          else store.previous();
          return;
        case 'ArrowDown':
          event.preventDefault();
          if (store.selection.length > 0) store.nudgeSelection(0, step);
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
          if (!mod) {
            event.preventDefault();
            store.addSlide();
          }
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
    // Fullscreen can be refused (permissions, embedded contexts) — ignore.
  }
}
