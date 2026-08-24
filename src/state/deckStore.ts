/**
 * The editor store.
 *
 * One deck, one selection, one history stack. Every mutation goes through an
 * action here so that undo/redo, the dirty flag and autosave stay correct
 * without any component having to think about them.
 *
 * History discipline: atomic actions snapshot themselves. Continuous gestures
 * (drag, resize, rotate) call `pushHistory()` once when the gesture starts and
 * then use the plain mutators, so a drag is one undo step rather than sixty.
 */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { canvas } from '@/theme';
import { insertAlign, insertFrame } from '@/lib/layout/slideLayout';
import type { RevealAnimation, ToneName } from '@/theme';
import {
  createEmptySlide,
  DEFAULT_SLIDE_META,
  normalizeZOrder,
  parseDeck,
} from '@/lib/markdown/deck';
import { createElement, createId, duplicateElement } from '@/model/factory';
import {
  maxRevealStep,
  type CanvasElement,
  type Deck,
  type DeckMeta,
  type ElementKind,
  type Slide,
  type SlideMeta,
} from '@/model/types';
import {
  clampToSlide,
  DEFAULT_SNAP,
  unionRects,
  type Guide,
  type Rect,
  type SnapOptions,
} from '@/lib/geometry/snap';

export type EditorMode = 'edit' | 'present';

export interface EditorState {
  /* Document */
  deck: Deck;
  fileName: string;
  fileHandle?: FileSystemFileHandle;
  dirty: boolean;

  /* Navigation */
  slideIndex: number;
  mode: EditorMode;
  revealStep: number;
  overviewOpen: boolean;
  notesOpen: boolean;
  promptOpen: boolean;

  /* Canvas */
  selection: string[];
  guides: Guide[];
  snap: SnapOptions;
  showGrid: boolean;
  zoom: number | 'fit';

  /* History */
  past: Deck[];
  future: Deck[];

  /* --------------------------------------------------------------- actions */
  loadDeck: (deck: Deck, meta?: { fileName?: string; handle?: FileSystemFileHandle }) => void;
  loadMarkdown: (
    source: string,
    meta?: { fileName?: string; handle?: FileSystemFileHandle },
  ) => void;
  newDeck: () => void;
  markSaved: (meta?: { fileName?: string; handle?: FileSystemFileHandle }) => void;
  setDeckMeta: (patch: Partial<DeckMeta>) => void;

  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  advance: () => void;
  retreat: () => void;
  setMode: (mode: EditorMode) => void;
  toggleOverview: (open?: boolean) => void;
  toggleNotes: (open?: boolean) => void;
  togglePrompt: (open?: boolean) => void;

  addSlide: (at?: number, patch?: Partial<Slide>) => void;
  deleteSlide: (index?: number) => void;
  duplicateSlide: (index?: number) => void;
  moveSlide: (from: number, to: number) => void;
  setSlideMarkdown: (markdown: string, index?: number) => void;
  setSlideMeta: (patch: Partial<SlideMeta>, index?: number) => void;

  addElement: (element: CanvasElement, options?: { select?: boolean }) => void;
  addElements: (elements: CanvasElement[]) => void;
  insertPreset: (kind: ElementKind, patch?: Partial<CanvasElement>) => void;
  /** Elemente aus der Zwischenablage auf die aktuelle Folie legen. */
  pasteElements: (elements: readonly CanvasElement[], options?: { offset?: boolean }) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  updateElements: (ids: readonly string[], patch: Partial<CanvasElement>) => void;
  transformElements: (
    updater: (element: CanvasElement) => Partial<CanvasElement> | null,
    ids?: readonly string[],
  ) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
  reorderSelection: (direction: 'front' | 'forward' | 'backward' | 'back') => void;
  alignSelection: (edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
  distributeSelection: (axis: 'h' | 'v') => void;
  setElementTone: (tone: ToneName) => void;
  setRevealStep: (step: number, animation?: RevealAnimation) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  setGuides: (guides: Guide[]) => void;
  setSnap: (patch: Partial<SnapOptions>) => void;
  toggleGrid: () => void;
  setZoom: (zoom: number | 'fit') => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 120;

const cloneDeck = (deck: Deck): Deck =>
  typeof structuredClone === 'function'
    ? structuredClone(deck)
    : (JSON.parse(JSON.stringify(deck)) as Deck);

export function createStarterDeck(): Deck {
  return {
    meta: { title: 'Untitled deck' },
    slides: [createEmptySlide({ meta: { ...DEFAULT_SLIDE_META, layout: 'title' } })],
  };
}

export const useDeckStore = create<EditorState>()((set, get) => {
  /** Snapshot the deck for undo, then hand the caller a mutable draft. */
  const history = (state: EditorState) => ({
    past: [...state.past, cloneDeck(state.deck)].slice(-HISTORY_LIMIT),
    future: [] as Deck[],
    dirty: true,
  });

  const currentSlide = (state: EditorState): Slide | undefined =>
    state.deck.slides[state.slideIndex];

  /** Replace the current slide via a producer, keeping everything else intact. */
  const mapSlide = (
    state: EditorState,
    index: number,
    producer: (slide: Slide) => Slide,
  ): Deck => ({
    ...state.deck,
    slides: state.deck.slides.map((slide, i) => (i === index ? producer(slide) : slide)),
  });

  const withElements = (
    state: EditorState,
    producer: (elements: CanvasElement[]) => CanvasElement[],
  ): Deck =>
    mapSlide(state, state.slideIndex, (slide) => ({
      ...slide,
      elements: producer(slide.elements),
    }));

  const selectedRects = (state: EditorState): Array<{ element: CanvasElement; rect: Rect }> => {
    const slide = currentSlide(state);
    if (!slide) return [];
    const chosen = new Set(state.selection);
    return slide.elements
      .filter((element) => chosen.has(element.id))
      .map((element) => ({
        element,
        rect: { x: element.x, y: element.y, w: element.w, h: element.h },
      }));
  };

  return {
    deck: createStarterDeck(),
    fileName: 'untitled.md',
    dirty: false,

    slideIndex: 0,
    mode: 'edit',
    revealStep: Infinity,
    overviewOpen: false,
    notesOpen: false,
    promptOpen: false,

    selection: [],
    guides: [],
    snap: { ...DEFAULT_SNAP },
    showGrid: true,
    zoom: 'fit',

    past: [],
    future: [],

    /* ------------------------------------------------------------ document */

    loadDeck: (deck, meta) =>
      set({
        deck,
        slideIndex: 0,
        selection: [],
        guides: [],
        past: [],
        future: [],
        dirty: false,
        revealStep: Infinity,
        fileName: meta?.fileName ?? get().fileName,
        fileHandle: meta?.handle,
      }),

    loadMarkdown: (source, meta) => get().loadDeck(parseDeck(source), meta),

    newDeck: () =>
      set({
        deck: createStarterDeck(),
        slideIndex: 0,
        selection: [],
        guides: [],
        past: [],
        future: [],
        dirty: false,
        fileName: 'untitled.md',
        fileHandle: undefined,
        revealStep: Infinity,
      }),

    markSaved: (meta) =>
      set((state) => ({
        dirty: false,
        fileName: meta?.fileName ?? state.fileName,
        fileHandle: meta?.handle ?? state.fileHandle,
      })),

    setDeckMeta: (patch) =>
      set((state) => ({
        ...history(state),
        deck: { ...state.deck, meta: { ...state.deck.meta, ...patch } },
      })),

    /* ---------------------------------------------------------- navigation */

    goTo: (index) =>
      set((state) => {
        const clamped = Math.max(0, Math.min(index, state.deck.slides.length - 1));
        return {
          slideIndex: clamped,
          selection: [],
          guides: [],
          revealStep: state.mode === 'present' ? 0 : Infinity,
        };
      }),

    next: () => get().goTo(get().slideIndex + 1),
    previous: () => get().goTo(get().slideIndex - 1),

    /** Reveal the next step, or move to the next slide once the slide is done. */
    advance: () =>
      set((state) => {
        const slide = currentSlide(state);
        if (!slide) return {};
        const steps = maxRevealStep(slide);
        if (state.mode === 'present' && state.revealStep < steps) {
          return { revealStep: state.revealStep + 1 };
        }
        if (state.slideIndex >= state.deck.slides.length - 1) return {};
        return {
          slideIndex: state.slideIndex + 1,
          selection: [],
          guides: [],
          revealStep: state.mode === 'present' ? 0 : Infinity,
        };
      }),

    retreat: () =>
      set((state) => {
        if (state.mode === 'present' && state.revealStep > 0) {
          return { revealStep: state.revealStep - 1 };
        }
        if (state.slideIndex <= 0) return {};
        const previousIndex = state.slideIndex - 1;
        const previous = state.deck.slides[previousIndex];
        return {
          slideIndex: previousIndex,
          selection: [],
          guides: [],
          revealStep: state.mode === 'present' ? maxRevealStep(previous) : Infinity,
        };
      }),

    setMode: (mode) =>
      set((state) => ({
        mode,
        selection: mode === 'present' ? [] : state.selection,
        overviewOpen: false,
        revealStep: mode === 'present' ? 0 : Infinity,
      })),

    toggleOverview: (open) => set((state) => ({ overviewOpen: open ?? !state.overviewOpen })),
    toggleNotes: (open) => set((state) => ({ notesOpen: open ?? !state.notesOpen })),
    togglePrompt: (open) => set((state) => ({ promptOpen: open ?? !state.promptOpen })),

    /* -------------------------------------------------------------- slides */

    addSlide: (at, patch) =>
      set((state) => {
        const index = at ?? state.slideIndex + 1;
        const slides = state.deck.slides.slice();
        slides.splice(index, 0, createEmptySlide(patch));
        return {
          ...history(state),
          deck: { ...state.deck, slides },
          slideIndex: index,
          selection: [],
        };
      }),

    deleteSlide: (index) =>
      set((state) => {
        const target = index ?? state.slideIndex;
        if (state.deck.slides.length <= 1) {
          return {
            ...history(state),
            deck: { ...state.deck, slides: [createEmptySlide()] },
            slideIndex: 0,
            selection: [],
          };
        }
        const slides = state.deck.slides.filter((_, i) => i !== target);
        return {
          ...history(state),
          deck: { ...state.deck, slides },
          slideIndex: Math.max(0, Math.min(target, slides.length - 1)),
          selection: [],
        };
      }),

    duplicateSlide: (index) =>
      set((state) => {
        const target = index ?? state.slideIndex;
        const source = state.deck.slides[target];
        if (!source) return {};
        const copy: Slide = {
          ...cloneDeck({ meta: state.deck.meta, slides: [source] }).slides[0],
          id: createId('slide'),
        };
        copy.elements = copy.elements.map((element) => ({
          ...element,
          id: createId(element.kind),
        }));
        const slides = state.deck.slides.slice();
        slides.splice(target + 1, 0, copy);
        return {
          ...history(state),
          deck: { ...state.deck, slides },
          slideIndex: target + 1,
          selection: [],
        };
      }),

    moveSlide: (from, to) =>
      set((state) => {
        const slides = state.deck.slides.slice();
        if (from < 0 || from >= slides.length) return {};
        const clamped = Math.max(0, Math.min(to, slides.length - 1));
        const [moved] = slides.splice(from, 1);
        slides.splice(clamped, 0, moved);
        return {
          ...history(state),
          deck: { ...state.deck, slides },
          slideIndex: clamped,
        };
      }),

    setSlideMarkdown: (markdown, index) =>
      set((state) => ({
        ...history(state),
        deck: mapSlide(state, index ?? state.slideIndex, (slide) => ({ ...slide, markdown })),
      })),

    setSlideMeta: (patch, index) =>
      set((state) => ({
        ...history(state),
        deck: mapSlide(state, index ?? state.slideIndex, (slide) => ({
          ...slide,
          meta: { ...slide.meta, ...patch },
        })),
      })),

    /* ------------------------------------------------------------ elements */

    addElement: (element, options) =>
      set((state) => {
        const slide = currentSlide(state);
        const z = slide ? slide.elements.length : 0;
        const placed = { ...element, z } as CanvasElement;
        return {
          ...history(state),
          deck: withElements(state, (elements) => [...elements, placed]),
          selection: options?.select === false ? state.selection : [placed.id],
        };
      }),

    addElements: (incoming) =>
      set((state) => {
        const slide = currentSlide(state);
        const base = slide ? slide.elements.length : 0;
        const placed = incoming.map((element, i) => ({ ...element, z: base + i }) as CanvasElement);
        return {
          ...history(state),
          deck: withElements(state, (elements) => [...elements, ...placed]),
          selection: placed.map((element) => element.id),
        };
      }),

    insertPreset: (kind, patch) => {
      const state = get();
      const slide = currentSlide(state);
      const element = createElement(kind, patch as never);
      // Rechtsbündig am Satzspiegel und unter das, was dort schon steht —
      // die Mitte gehört dem Fließtext. Warum, steht in `insertFrame()`.
      const spot = insertFrame(slide?.elements ?? [], element);
      const placed = clampToSlide({ ...spot, w: element.w, h: element.h });

      // Ein Textelement ist nichts als sein Text: steht der links im Kasten,
      // hilft die rechte Kante des Kastens niemandem. Alles andere zeichnet
      // eine Fläche, deren Kante man sieht, und bleibt, wie es gedacht war.
      const align =
        element.kind === 'text' && !('align' in (patch ?? {}))
          ? { align: insertAlign(placed.x) }
          : null;

      state.addElement({ ...element, x: placed.x, y: placed.y, ...align } as CanvasElement);
    },

    /**
     * Eingefügt wird dort, wo es herkam — das ist der Sinn des Kopierens
     * zwischen zwei Folien: dieselbe Karte an derselben Stelle.
     *
     * Nur wenn auf *dieselbe* Folie eingefügt wird, rückt die Kopie um denselben
     * Betrag weiter wie beim Duplizieren. Sonst läge sie genau auf dem Original
     * und der Benutzer sähe nichts geschehen.
     */
    pasteElements: (incoming, options) => {
      if (incoming.length === 0) return;
      const versatz = options?.offset ? canvas.gridSize * 3 : 0;
      const gelegt = incoming.map((element) => {
        const spot = clampToSlide({
          x: element.x + versatz,
          y: element.y + versatz,
          w: element.w,
          h: element.h,
        });
        return { ...element, x: spot.x, y: spot.y } as CanvasElement;
      });
      get().addElements(gelegt);
    },

    updateElement: (id, patch) => get().updateElements([id], patch),

    updateElements: (ids, patch) =>
      set((state) => {
        const targets = new Set(ids);
        return {
          dirty: true,
          deck: withElements(state, (elements) =>
            elements.map((element) =>
              targets.has(element.id) ? ({ ...element, ...patch } as CanvasElement) : element,
            ),
          ),
        };
      }),

    transformElements: (updater, ids) =>
      set((state) => {
        const targets = new Set(ids ?? state.selection);
        return {
          dirty: true,
          deck: withElements(state, (elements) =>
            elements.map((element) => {
              if (!targets.has(element.id)) return element;
              const patch = updater(element);
              return patch ? ({ ...element, ...patch } as CanvasElement) : element;
            }),
          ),
        };
      }),

    deleteSelection: () =>
      set((state) => {
        if (state.selection.length === 0) return {};
        const targets = new Set(state.selection);
        return {
          ...history(state),
          deck: withElements(state, (elements) =>
            normalizeZOrder(elements.filter((element) => !targets.has(element.id))),
          ),
          selection: [],
        };
      }),

    duplicateSelection: () =>
      set((state) => {
        const slide = currentSlide(state);
        if (!slide || state.selection.length === 0) return {};
        const targets = new Set(state.selection);
        const copies = slide.elements
          .filter((element) => targets.has(element.id))
          .map(
            (element, index) =>
              ({
                ...duplicateElement(element),
                z: slide.elements.length + index,
              }) as CanvasElement,
          );
        if (copies.length === 0) return {};
        return {
          ...history(state),
          deck: withElements(state, (elements) => [...elements, ...copies]),
          selection: copies.map((element) => element.id),
        };
      }),

    nudgeSelection: (dx, dy) =>
      set((state) => {
        if (state.selection.length === 0) return {};
        const targets = new Set(state.selection);
        return {
          ...history(state),
          deck: withElements(state, (elements) =>
            elements.map((element) =>
              targets.has(element.id) && !element.locked
                ? ({ ...element, x: element.x + dx, y: element.y + dy } as CanvasElement)
                : element,
            ),
          ),
        };
      }),

    reorderSelection: (direction) =>
      set((state) => {
        const slide = currentSlide(state);
        if (!slide || state.selection.length === 0) return {};
        const targets = new Set(state.selection);
        const ordered = normalizeZOrder(slide.elements);
        const moving = ordered.filter((element) => targets.has(element.id));
        const rest = ordered.filter((element) => !targets.has(element.id));

        let next: CanvasElement[];
        switch (direction) {
          case 'front':
            next = [...rest, ...moving];
            break;
          case 'back':
            next = [...moving, ...rest];
            break;
          case 'forward': {
            next = ordered.slice();
            for (let i = next.length - 2; i >= 0; i -= 1) {
              if (targets.has(next[i].id) && !targets.has(next[i + 1].id)) {
                [next[i], next[i + 1]] = [next[i + 1], next[i]];
              }
            }
            break;
          }
          case 'backward':
          default: {
            next = ordered.slice();
            for (let i = 1; i < next.length; i += 1) {
              if (targets.has(next[i].id) && !targets.has(next[i - 1].id)) {
                [next[i], next[i - 1]] = [next[i - 1], next[i]];
              }
            }
            break;
          }
        }

        return {
          ...history(state),
          deck: withElements(state, () =>
            next.map((element, z) => ({ ...element, z }) as CanvasElement),
          ),
        };
      }),

    alignSelection: (edge) =>
      set((state) => {
        const chosen = selectedRects(state);
        if (chosen.length < 1) return {};
        const bounds =
          chosen.length === 1
            ? { x: 0, y: 0, w: canvas.width, h: canvas.height }
            : (unionRects(chosen.map((entry) => entry.rect)) as Rect);

        const targets = new Set(state.selection);
        return {
          ...history(state),
          deck: withElements(state, (elements) =>
            elements.map((element) => {
              if (!targets.has(element.id) || element.locked) return element;
              switch (edge) {
                case 'left':
                  return { ...element, x: bounds.x } as CanvasElement;
                case 'right':
                  return { ...element, x: bounds.x + bounds.w - element.w } as CanvasElement;
                case 'hcenter':
                  return {
                    ...element,
                    x: bounds.x + (bounds.w - element.w) / 2,
                  } as CanvasElement;
                case 'top':
                  return { ...element, y: bounds.y } as CanvasElement;
                case 'bottom':
                  return { ...element, y: bounds.y + bounds.h - element.h } as CanvasElement;
                case 'vcenter':
                default:
                  return {
                    ...element,
                    y: bounds.y + (bounds.h - element.h) / 2,
                  } as CanvasElement;
              }
            }),
          ),
        };
      }),

    distributeSelection: (axis) =>
      set((state) => {
        const chosen = selectedRects(state).filter((entry) => !entry.element.locked);
        if (chosen.length < 3) return {};

        const sorted = chosen
          .slice()
          .sort((a, b) => (axis === 'h' ? a.rect.x - b.rect.x : a.rect.y - b.rect.y));
        const first = sorted[0].rect;
        const last = sorted[sorted.length - 1].rect;
        const span =
          axis === 'h'
            ? last.x + last.w - first.x - sorted.reduce((sum, e) => sum + e.rect.w, 0)
            : last.y + last.h - first.y - sorted.reduce((sum, e) => sum + e.rect.h, 0);
        const gap = span / (sorted.length - 1);

        const positions = new Map<string, number>();
        let cursor = axis === 'h' ? first.x : first.y;
        for (const entry of sorted) {
          positions.set(entry.element.id, cursor);
          cursor += (axis === 'h' ? entry.rect.w : entry.rect.h) + gap;
        }

        return {
          ...history(state),
          deck: withElements(state, (elements) =>
            elements.map((element) => {
              const position = positions.get(element.id);
              if (position === undefined) return element;
              return axis === 'h'
                ? ({ ...element, x: position } as CanvasElement)
                : ({ ...element, y: position } as CanvasElement);
            }),
          ),
        };
      }),

    setElementTone: (tone) =>
      set((state) => ({
        ...history(state),
        deck: withElements(state, (elements) =>
          elements.map((element) =>
            state.selection.includes(element.id)
              ? ({ ...element, tone } as CanvasElement)
              : element,
          ),
        ),
      })),

    setRevealStep: (step, animation) =>
      set((state) => ({
        ...history(state),
        deck: withElements(state, (elements) =>
          elements.map((element) =>
            state.selection.includes(element.id)
              ? ({
                  ...element,
                  reveal:
                    step <= 0
                      ? undefined
                      : { step, animation: animation ?? element.reveal?.animation ?? 'rise' },
                } as CanvasElement)
              : element,
          ),
        ),
      })),

    /* ----------------------------------------------------------- selection */

    select: (ids) => set({ selection: [...new Set(ids)] }),

    toggleSelect: (id) =>
      set((state) => ({
        selection: state.selection.includes(id)
          ? state.selection.filter((entry) => entry !== id)
          : [...state.selection, id],
      })),

    selectAll: () =>
      set((state) => {
        const slide = currentSlide(state);
        return { selection: slide ? slide.elements.filter((e) => !e.locked).map((e) => e.id) : [] };
      }),

    clearSelection: () => set({ selection: [], guides: [] }),

    /* -------------------------------------------------------------- canvas */

    setGuides: (guides) =>
      set((state) => (guides.length === 0 && state.guides.length === 0 ? {} : { guides })),
    setSnap: (patch) => set((state) => ({ snap: { ...state.snap, ...patch } })),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setZoom: (zoom) =>
      set({
        zoom: zoom === 'fit' ? 'fit' : Math.min(canvas.zoom.max, Math.max(canvas.zoom.min, zoom)),
      }),

    /* ------------------------------------------------------------- history */

    pushHistory: () => set((state) => history(state)),

    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous) return {};
        return {
          deck: previous,
          past: state.past.slice(0, -1),
          future: [cloneDeck(state.deck), ...state.future].slice(0, HISTORY_LIMIT),
          slideIndex: Math.min(state.slideIndex, previous.slides.length - 1),
          selection: [],
          guides: [],
          dirty: true,
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0];
        if (!next) return {};
        return {
          deck: next,
          past: [...state.past, cloneDeck(state.deck)].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
          slideIndex: Math.min(state.slideIndex, next.slides.length - 1),
          selection: [],
          guides: [],
          dirty: true,
        };
      }),
  };
});

/* -------------------------------------------------------------------------- */
/* Selectors                                                                   */
/* -------------------------------------------------------------------------- */

export const selectCurrentSlide = (state: EditorState): Slide | undefined =>
  state.deck.slides[state.slideIndex];

/**
 * Selectors that build a new array must be read through `useShallow`, otherwise
 * `useSyncExternalStore` sees a fresh snapshot on every render and spins.
 * `useSelectedElements` is the safe entry point; the raw selector is exported
 * only for tests and non-React callers.
 */
export const selectSelectedElements = (state: EditorState): CanvasElement[] => {
  const slide = state.deck.slides[state.slideIndex];
  if (!slide) return [];
  const chosen = new Set(state.selection);
  return slide.elements.filter((element) => chosen.has(element.id));
};

export function useSelectedElements(): CanvasElement[] {
  return useDeckStore(useShallow(selectSelectedElements));
}

export const selectCanUndo = (state: EditorState): boolean => state.past.length > 0;
export const selectCanRedo = (state: EditorState): boolean => state.future.length > 0;
