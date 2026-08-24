import { beforeEach, describe, expect, it } from 'vitest';
import { canvas } from '@/theme';
import { flowBounds, insertColumnWidth } from '@/lib/layout/slideLayout';
import { createElement } from '@/model/factory';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { createStarterDeck, useDeckStore } from './deckStore';
import type { CanvasElement } from '@/model/types';

const store = () => useDeckStore.getState();

const addShape = (patch: Partial<CanvasElement> = {}) => {
  const element = createElement('shape', patch as never);
  store().addElement(element);
  return element.id;
};

const elementsNow = () => store().deck.slides[store().slideIndex].elements;

/** Ein Satz, der einen Satzspiegel füllt. */
const LANG = Array.from({ length: 12 }, () => 'Ein Satz, der etwas behauptet.').join(' ');

beforeEach(() => {
  useDeckStore.setState({
    deck: createStarterDeck(),
    slideIndex: 0,
    selection: [],
    guides: [],
    past: [],
    future: [],
    dirty: false,
    mode: 'edit',
    revealStep: Infinity,
    overviewOpen: false,
  });
});

describe('slides', () => {
  it('adds, duplicates and deletes slides', () => {
    expect(store().deck.slides).toHaveLength(1);

    store().addSlide();
    expect(store().deck.slides).toHaveLength(2);
    expect(store().slideIndex).toBe(1);

    addShape();
    store().duplicateSlide();
    expect(store().deck.slides).toHaveLength(3);
    // The copy owns fresh element ids, so editing one never edits the other.
    const ids = store().deck.slides.flatMap((slide) => slide.elements.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);

    store().deleteSlide();
    expect(store().deck.slides).toHaveLength(2);
  });

  it('never leaves the deck with zero slides', () => {
    store().deleteSlide();
    expect(store().deck.slides).toHaveLength(1);
  });

  it('reorders slides', () => {
    store().setSlideMarkdown('# A');
    store().addSlide();
    store().setSlideMarkdown('# B');
    store().moveSlide(1, 0);
    expect(store().deck.slides.map((slide) => slide.markdown)).toEqual(['# B', '# A']);
  });

  it('clamps navigation to the deck', () => {
    store().goTo(99);
    expect(store().slideIndex).toBe(0);
    store().goTo(-5);
    expect(store().slideIndex).toBe(0);
  });
});

describe('elements', () => {
  it('places new elements on top and selects them', () => {
    const first = addShape();
    const second = addShape();
    expect(elementsNow().find((e) => e.id === second)?.z).toBeGreaterThan(
      elementsNow().find((e) => e.id === first)!.z,
    );
    expect(store().selection).toEqual([second]);
  });

  it('duplicates the selection with new ids, offset from the original', () => {
    const id = addShape({ x: 100, y: 100 });
    store().select([id]);
    store().duplicateSelection();

    expect(elementsNow()).toHaveLength(2);
    const copy = elementsNow()[1];
    expect(copy.id).not.toBe(id);
    expect(copy.x).toBeGreaterThan(100);
    expect(store().selection).toEqual([copy.id]);
  });

  it('deletes the selection and re-packs z order', () => {
    const a = addShape();
    addShape();
    const c = addShape();
    store().select([a, c]);
    store().deleteSelection();

    expect(elementsNow()).toHaveLength(1);
    expect(elementsNow()[0].z).toBe(0);
    expect(store().selection).toEqual([]);
  });

  it('nudges by whole grid steps and skips locked elements', () => {
    const id = addShape({ x: 100, y: 100 });
    store().select([id]);
    store().nudgeSelection(canvas.gridSize, 0);
    expect(elementsNow()[0].x).toBe(100 + canvas.gridSize);

    store().updateElement(id, { locked: true });
    store().nudgeSelection(canvas.gridSize, 0);
    expect(elementsNow()[0].x).toBe(100 + canvas.gridSize);
  });

  it('reorders layers', () => {
    const a = addShape();
    const b = addShape();
    const c = addShape();

    store().select([a]);
    store().reorderSelection('front');
    expect(
      elementsNow()
        .slice()
        .sort((x, y) => x.z - y.z)
        .map((e) => e.id),
    ).toEqual([b, c, a]);

    store().reorderSelection('backward');
    expect(
      elementsNow()
        .slice()
        .sort((x, y) => x.z - y.z)
        .map((e) => e.id),
    ).toEqual([b, a, c]);

    store().reorderSelection('back');
    expect(
      elementsNow()
        .slice()
        .sort((x, y) => x.z - y.z)
        .map((e) => e.id),
    ).toEqual([a, b, c]);
  });

  it('aligns a multi-selection to its own bounds', () => {
    const a = addShape({ x: 100, y: 0, w: 100, h: 50 });
    const b = addShape({ x: 300, y: 0, w: 100, h: 50 });
    store().select([a, b]);
    store().alignSelection('left');
    expect(elementsNow().map((e) => e.x)).toEqual([100, 100]);
  });

  it('centres a single element on the slide', () => {
    const id = addShape({ x: 0, y: 0, w: 200, h: 100 });
    store().select([id]);
    store().alignSelection('hcenter');
    expect(elementsNow()[0].x).toBe((canvas.width - 200) / 2);
  });

  it('distributes three or more elements evenly', () => {
    const a = addShape({ x: 0, y: 0, w: 100, h: 50 });
    const b = addShape({ x: 130, y: 0, w: 100, h: 50 });
    const c = addShape({ x: 400, y: 0, w: 100, h: 50 });
    store().select([a, b, c]);
    store().distributeSelection('h');

    const xs = elementsNow().map((e) => e.x);
    expect(xs[1] - (xs[0] + 100)).toBeCloseTo(xs[2] - (xs[1] + 100), 6);
  });

  it('sets and clears reveal steps', () => {
    const id = addShape();
    store().select([id]);
    store().setRevealStep(2, 'wipe');
    expect(elementsNow()[0].reveal).toEqual({ step: 2, animation: 'wipe' });

    store().setRevealStep(0);
    expect(elementsNow()[0].reveal).toBeUndefined();
  });

  it('setzt alles an dieselbe Linie und stapelt nach unten', () => {
    // Die Mitte gehört dem Fließtext: er steht links und reicht bei den
    // meisten Layouts bis dorthin. Wer eine Karte einsetzte, musste sie als
    // Erstes wegziehen.
    store().insertPreset('shape');
    store().insertPreset('shape');
    const [first, second] = elementsNow();
    const linie = canvas.margin.left;

    expect(first.x).toBe(linie);
    expect(second.x).toBe(linie);
    expect(second.y).toBeGreaterThan(first.y + first.h - 1);
    expect(second.y + second.h).toBeLessThanOrEqual(canvas.height - canvas.margin.bottom);
  });

  it('legt jede Textstufe an dieselbe Linie, egal wie breit der Baustein war', () => {
    // Das war der eigentliche Fehler: solange jeder Baustein seine eigene
    // Breite mitbrachte, bekam jeder auch seine eigene Kante — eine Headline
    // begann bei 192, ein Zwischentitel bei 552, ein Label bei 892.
    // Untereinander ergab das keine Linie, sondern eine Treppe.
    store().insertPreset('text', { typeStyle: 'headline', text: 'Wir bauen.', w: 1000, h: 180 });
    store().insertPreset('text', { typeStyle: 'h2', text: 'Zwischentitel', w: 640, h: 60 });
    store().insertPreset('text', { typeStyle: 'label', text: 'Abschnitt', w: 300, h: 20 });

    const linie = canvas.margin.left;
    for (const element of elementsNow()) {
      expect(element.x, element.id).toBe(linie);
      expect(element.w, element.id).toBe(insertColumnWidth);
    }
  });

  it('misst die Höhe im schmaleren Kasten nach', () => {
    // Ein schmalerer Kasten bricht den Text öfter um. Bliebe die Höhe aus dem
    // Baustein stehen, ragte das nächste Element ins vorige hinein — genau das
    // war beim ersten Versuch zu sehen.
    store().insertPreset('text', {
      typeStyle: 'body',
      text: 'Ein Satz, der in einem schmaleren Kasten mehrfach umbrechen muss und deshalb höher wird, als der Baustein es vorsah.',
      w: 1000,
      h: 30,
    });
    const [lang] = elementsNow();
    expect(lang.h).toBeGreaterThan(30);

    store().insertPreset('text', { typeStyle: 'label', text: 'Danach', w: 300, h: 20 });
    const [erst, dann] = elementsNow();
    // In derselben Spalte, und ohne ins vorige hineinzuragen.
    expect(dann.x).toBe(erst.x);
    expect(dann.y).toBeGreaterThanOrEqual(erst.y + erst.h);
  });

  it('lässt einem Baustein mit eigenem Maß sein Maß', () => {
    // Ein Zeichen ist quadratisch, ein Bild hat ein Seitenverhältnis. Sie auf
    // Spaltenbreite zu ziehen hieße, dem Baustein seine Proportion zu nehmen —
    // sie fangen nur an derselben Linie an.
    store().insertPreset('icon', { icon: 'rocket', w: 88, h: 88 });
    const [zeichen] = elementsNow();
    expect(zeichen.w).toBe(88);
    expect(zeichen.h).toBe(88);
    expect(zeichen.x).toBe(canvas.margin.left);
  });

  it('meidet den Fließtext, solange Platz ist', () => {
    // Der Grund, aus dem früher überhaupt rechts eingesetzt wurde: sonst liegt
    // das erste Element mitten in der Überschrift.
    useDeckStore.setState((state) => ({
      deck: {
        ...state.deck,
        slides: state.deck.slides.map((slide, i) =>
          i === 0 ? { ...slide, markdown: '# Eine Überschrift\n\nUnd ein Satz darunter.' } : slide,
        ),
      },
    }));
    const text = flowBounds(store().deck.slides[0].meta.layout, store().deck.slides[0].markdown);
    expect(text).not.toBeNull();

    store().insertPreset('text', { typeStyle: 'label', text: 'Abschnitt', w: 300, h: 20 });
    const [gelegt] = elementsNow();
    expect(gelegt.y).toBeGreaterThanOrEqual(text!.y + text!.h);
  });

  it('überdeckt den Fließtext lieber, als alles auf einen Notplatz zu legen', () => {
    // Hart behandelt hätte der Fließtext einer Titelfolie keinen Platz mehr
    // übrig gelassen — und dann läge jede Karte auf demselben Fleck am unteren
    // Satzspiegel, übereinander und nicht auseinanderzuhalten.
    useDeckStore.setState((state) => ({
      deck: {
        ...state.deck,
        slides: state.deck.slides.map((slide, i) =>
          i === 0
            ? { ...slide, meta: { ...slide.meta, layout: 'statement' as const }, markdown: LANG }
            : slide,
        ),
      },
    }));

    store().insertPreset('card');
    store().insertPreset('card');
    const [erst, dann] = elementsNow();
    expect(`${dann.x} / ${dann.y}`).not.toBe(`${erst.x} / ${erst.y}`);
  });

  it('lässt nichts über den rechten Satzspiegel hinauslaufen', () => {
    store().insertPreset('shape', { w: 9999, h: 100 });
    const [breit] = elementsNow();
    expect(breit.x + breit.w).toBeLessThanOrEqual(canvas.width - canvas.margin.right);
  });

  it('legt Eingefügtes auf der neuen Folie an dieselbe Stelle', () => {
    // Der Sinn des Kopierens zwischen zwei Folien: dieselbe Karte an
    // derselben Stelle. Rückte sie dabei, wäre jede zweite Folie krumm.
    const quelle = createElement('card', { x: 700, y: 96, w: 492, h: 168 }) as CanvasElement;
    store().addSlide();
    store().pasteElements([quelle]);

    const [gelegt] = elementsNow();
    expect([gelegt.x, gelegt.y]).toEqual([700, 96]);
    expect(store().selection).toEqual([gelegt.id]);
  });

  it('versetzt eine Kopie, die auf dieselbe Folie zurückkommt', () => {
    // Sonst läge sie genau auf dem Original, und man sähe nichts geschehen.
    const quelle = createElement('card', { x: 700, y: 96, w: 492, h: 168 }) as CanvasElement;
    store().addElement(quelle);
    store().pasteElements([{ ...quelle, id: 'kopie' } as CanvasElement], { offset: true });

    const kopie = elementsNow().find((element) => element.id === 'kopie');
    expect(kopie?.x).toBeGreaterThan(quelle.x);
    expect(kopie?.y).toBeGreaterThan(quelle.y);
  });

  it('lässt Eingefügtes nicht aus der Folie fallen und ist rückgängig zu machen', () => {
    const weit = createElement('card', { x: 4000, y: 4000, w: 200, h: 100 }) as CanvasElement;
    store().pasteElements([weit]);
    const [gelegt] = elementsNow();
    expect(gelegt.x).toBeLessThan(canvas.width);
    expect(gelegt.y).toBeLessThan(canvas.height);

    store().undo();
    expect(elementsNow()).toHaveLength(0);
  });

  it('rückt eine Spalte nach links, wenn die rechte voll ist', () => {
    // Vorher landete bei voller Spalte alles auf dem unteren Satzspiegel und
    // damit aufeinander — sichtbar war nur das oberste. So legt auch niemand.
    const bottom = canvas.height - canvas.margin.bottom;
    for (let i = 0; i < 12; i += 1) store().insertPreset('card');
    const karten = elementsNow();

    const rechteSpalte = canvas.width - canvas.margin.right;
    expect(karten.some((el) => el.x + el.w < rechteSpalte - 1)).toBe(true);

    // Und keine liegt außerhalb des Satzspiegels.
    for (const el of karten) {
      expect(el.x).toBeGreaterThanOrEqual(canvas.margin.left);
      expect(el.y + el.h).toBeLessThanOrEqual(bottom);
    }
  });
});

describe('presentation', () => {
  it('walks reveal steps before moving to the next slide', () => {
    store().setSlideMarkdown('# One');
    const id = addShape();
    store().select([id]);
    store().setRevealStep(1);
    store().addSlide();
    store().setSlideMarkdown('# Two');
    store().goTo(0);
    store().setMode('present');

    expect(store().revealStep).toBe(0);
    store().advance();
    expect(store().slideIndex).toBe(0);
    expect(store().revealStep).toBe(1);
    store().advance();
    expect(store().slideIndex).toBe(1);
  });

  it('stops at the ends of the deck', () => {
    store().setMode('present');
    store().retreat();
    expect(store().slideIndex).toBe(0);
    store().advance();
    expect(store().slideIndex).toBe(0);
  });
});

describe('history', () => {
  it('undoes and redoes an element insertion', () => {
    addShape();
    expect(elementsNow()).toHaveLength(1);

    store().undo();
    expect(elementsNow()).toHaveLength(0);

    store().redo();
    expect(elementsNow()).toHaveLength(1);
  });

  it('treats a gesture as one step when pushHistory is called once', () => {
    const id = addShape({ x: 0, y: 0 });
    store().pushHistory();
    store().updateElements([id], { x: 10 });
    store().updateElements([id], { x: 20 });
    store().updateElements([id], { x: 30 });

    store().undo();
    expect(elementsNow()[0].x).toBe(0);
  });

  it('drops the redo stack once new work happens', () => {
    addShape();
    store().undo();
    expect(store().future).toHaveLength(1);
    addShape();
    expect(store().future).toHaveLength(0);
  });

  it('is a no-op when there is nothing to undo', () => {
    const before = store().deck;
    store().undo();
    expect(store().deck).toBe(before);
  });
});

describe('document lifecycle', () => {
  it('loads Markdown and clears history and the dirty flag', () => {
    addShape();
    store().loadMarkdown('# Fresh', { fileName: 'fresh.md' });

    expect(store().deck.slides[0].markdown).toBe('# Fresh');
    expect(store().past).toHaveLength(0);
    expect(store().dirty).toBe(false);
    expect(store().fileName).toBe('fresh.md');
  });

  it('marks the deck dirty on edit and clean on save', () => {
    expect(store().dirty).toBe(false);
    addShape();
    expect(store().dirty).toBe(true);
    store().markSaved();
    expect(store().dirty).toBe(false);
  });

  it('survives a save/load cycle with the canvas intact', () => {
    const id = addShape({ x: 123, y: 45, tone: 'signal', rotation: 15 });
    store().select([id]);
    store().setRevealStep(3, 'wipe');

    const reloaded = parseDeck(serializeDeck(store().deck));
    expect(reloaded.slides[0].elements[0]).toMatchObject({
      x: 123,
      y: 45,
      tone: 'signal',
      rotation: 15,
      reveal: { step: 3, animation: 'wipe' },
    });
  });
});
