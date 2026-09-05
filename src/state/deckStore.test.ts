import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '@/theme';
import { flowBounds, insertColumnWidth } from '@/lib/layout/slideLayout';
import { createElement } from '@/model/factory';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { createStarterDeck, useDeckStore } from './deckStore';
import { bildmass, fordereBildmasse } from '@/lib/export/images';
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
    // Die Kopie bekommt eigene Kennungen: wer an einer arbeitet, ändert die
    // andere nie mit.
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
      expect(element.w, element.id).toBe(insertColumnWidth());
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

describe('Gruppen', () => {
  const dreiFormen = () => {
    const a = addShape({ x: 100, y: 100 });
    const b = addShape({ x: 300, y: 100 });
    const c = addShape({ x: 500, y: 100 });
    return [a, b, c];
  };

  it('fasst die Auswahl zusammen und löst sie wieder auf', () => {
    const [a, b] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();

    const gruppen = elementsNow().map((element) => element.group);
    expect(gruppen[0]).toBeTruthy();
    expect(gruppen[1]).toBe(gruppen[0]);
    expect(gruppen[2]).toBeUndefined();

    store().ungroupSelection();
    expect(elementsNow().every((element) => element.group === undefined)).toBe(true);
  });

  it('wählt beim Klick auf ein Mitglied die ganze Gruppe', () => {
    // Das ist der Sinn der Sache: sonst zöge man weiterhin einzeln.
    const [a, b, c] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();

    store().select([a]);
    expect([...store().selection].sort()).toEqual([a, b].sort());

    store().select([c]);
    expect(store().selection).toEqual([c]);
  });

  it('nimmt beim Abwählen die ganze Gruppe heraus', () => {
    // Eine halbe Gruppe in der Auswahl führte den nächsten Zug auseinander.
    const [a, b, c] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();

    store().select([a, c]);
    expect(store().selection).toHaveLength(3);
    store().toggleSelect(b);
    expect(store().selection).toEqual([c]);
  });

  it('verschmilzt zwei Gruppen, statt sie zu verschachteln', () => {
    const [a, b, c] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();
    store().select([b, c]);
    store().groupSelection();

    const gruppen = elementsNow().map((element) => element.group);
    expect(new Set(gruppen).size).toBe(1);
    expect(gruppen[0]).toBeTruthy();
  });

  it('gibt einer Kopie eine eigene Gruppe', () => {
    // Sonst nähme das Wegziehen der Kopie das Original mit.
    const [a, b] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();
    const vorher = elementsNow()[0].group;

    store().duplicateSelection();
    const kopien = elementsNow().slice(3);
    expect(kopien).toHaveLength(2);
    expect(kopien[0].group).toBeTruthy();
    expect(kopien[0].group).not.toBe(vorher);
    expect(kopien[1].group).toBe(kopien[0].group);
  });

  it('lässt eine einzelne Auswahl in Ruhe', () => {
    const [a] = dreiFormen();
    store().select([a]);
    store().groupSelection();
    expect(elementsNow()[0].group).toBeUndefined();
  });

  it('übersteht den Weg durch die Datei', () => {
    const [a, b] = dreiFormen();
    store().select([a, b]);
    store().groupSelection();
    const gruppe = elementsNow()[0].group;

    const wieder = parseDeck(serializeDeck(store().deck));
    const elemente = wieder.slides[store().slideIndex].elements;
    expect(elemente[0].group).toBe(gruppe);
    expect(elemente[1].group).toBe(gruppe);
    expect(elemente[2].group).toBeUndefined();
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

describe('eine Folie mit unlesbarem `nzl`-Block', () => {
  const KAPUTT = [
    '<!-- nzl',
    'layout: canvas',
    'elements:',
    '  - id: card-1',
    '    kind: card',
    '    text: Achtung: hier steht ein Doppelpunkt zu viel',
    '-->',
    '',
    '# Eine Folie',
    '',
  ].join('\n');

  it('behält den Rohtext, solange niemand sie anfasst', () => {
    store().loadMarkdown(KAPUTT);
    expect(serializeDeck(store().deck)).toContain('text: Achtung: hier steht');
  });

  it('gibt ihn auf, sobald jemand die Folie ändert', () => {
    /*
       Das ist die Falle, die der Rundlauf aufstellt: der Rohtext wird
       *wortgleich* zurückgeschrieben, und in ihm steht kein Wort von dem, was
       gerade geändert wurde. Ohne dieses Fallenlassen setzte der Benutzer ein
       Layout, sähe es auf der Fläche — und fände beim nächsten Öffnen wieder
       den kaputten Block. Von zwei Wahrheiten in einer Datei ist die neuere
       die, die der Mensch gerade wollte.
    */
    store().loadMarkdown(KAPUTT);
    store().setSlideMeta({ layout: 'split' });

    const gesichert = serializeDeck(store().deck);
    expect(gesichert).not.toContain('Doppelpunkt zu viel');
    expect(gesichert).toContain('layout: split');
  });

  it('gibt ihn auch beim Tippen im Fließtext auf', () => {
    // Derselbe Weg, andere Tür: `mapSlide` ist die eine Stelle, durch die
    // jede Folienänderung geht — deshalb steht das Fallenlassen dort und
    // nicht in den einzelnen Aktionen.
    store().loadMarkdown(KAPUTT);
    store().setSlideMarkdown('# Etwas Neues');

    const gesichert = serializeDeck(store().deck);
    expect(gesichert).not.toContain('Doppelpunkt zu viel');
    expect(gesichert).toContain('# Etwas Neues');
  });
});

/* -------------------------------------------------------------------------- */
/* Der Verlauf                                                                 */
/* -------------------------------------------------------------------------- */

/** Alles einfrieren, was der Verlauf noch braucht. */
function einfrieren<T>(wert: T): T {
  if (wert && typeof wert === 'object' && !Object.isFrozen(wert)) {
    Object.freeze(wert);
    for (const teil of Object.values(wert)) einfrieren(teil);
  }
  return wert;
}

describe('der Verlauf', () => {
  it('macht aus einem getippten Wort einen Schritt', () => {
    /*
       Der Fehler, gegen den das steht: jeder Anschlag war ein Schritt.
       Dreiundvierzig Zeichen in einem Feld waren dreiundvierzig Schritte,
       schoben alles davor aus den hundertzwanzig heraus — und ⌘Z nahm danach
       einen Buchstaben zurück statt der Änderung davor.
    */
    const anfang = store().deck.slides[0].markdown;
    let getippt = '';
    for (const zeichen of '# Guten Tag') {
      getippt += zeichen;
      store().setSlideMarkdown(getippt);
    }

    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().deck.slides[0].markdown).toBe(anfang);
  });

  it('trennt, sobald das Feld wechselt', () => {
    // Erst der Fließtext, dann die Notizen: zwei Handgriffe, zwei Schritte.
    store().setSlideMarkdown('# Eins');
    store().setSlideMeta({ notes: 'Ein Wort' });
    store().setSlideMeta({ notes: 'Ein Wort dazu' });
    expect(store().past).toHaveLength(2);
  });

  it('trennt nach einer Pause', () => {
    vi.useFakeTimers();
    try {
      store().setSlideMarkdown('# Eins');
      vi.advanceTimersByTime(2000);
      store().setSlideMarkdown('# Eins und zwei');
      expect(store().past).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fasst nach einem ⌘Z nicht in den falschen Schritt hinein', () => {
    /*
       Der Merker zeigt auf den Eintrag, den er selbst abgelegt hat. Ein ⌘Z
       nimmt genau den wieder heraus — und damit hört die Zusammenfassung von
       selbst auf. Eine Liste von Stellen, an denen man zurücksetzen *muss*,
       wäre eine Liste von Stellen, an denen man es vergessen kann.
    */
    store().setSlideMarkdown('# Eins');
    store().undo();
    store().setSlideMarkdown('# Zwei');
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().deck.slides[0].markdown).toBe('');
  });

  it('teilt sich mit dem Verlauf, was sich nicht geändert hat', () => {
    /*
       Vorher war jeder Schritt ein `structuredClone` des ganzen Decks — bei
       einem Deck mit eingebetteten Bildern hundertzwanzigmal ein paar
       Megabyte. Geprüft wird deshalb die *Identität*: die unveränderte Folie
       im Verlauf ist dieselbe wie die in der Gegenwart, nicht bloß gleich.
    */
    store().addSlide();
    store().goTo(0);
    const zweite = store().deck.slides[1];

    store().setSlideMarkdown('# Nur die erste');

    const abgelegt = store().past[store().past.length - 1];
    expect(abgelegt.slides[1]).toBe(zweite);
    expect(store().deck.slides[1]).toBe(zweite);
    // Und die erste Folie ist es *nicht* — sonst hätte der Verlauf nichts
    // aufgehoben, sondern nur mitgeschrieben.
    expect(abgelegt.slides[0]).not.toBe(store().deck.slides[0]);
  });

  it('fasst nichts an, was der Verlauf noch hält', () => {
    /*
       Das ist die Bedingung, unter der das Teilen überhaupt erlaubt ist: jede
       Aktion baut ihr Ergebnis aus neuen Objekten. Wer künftig an Ort und
       Stelle ändert — ein `element.x = …`, ein `slides.push(…)` auf dem Array
       aus dem Zustand —, bekommt hier einen TypeError statt eines Verlaufs,
       der sich rückwirkend ändert.
    */
    addShape({ x: 40, y: 40 });
    addShape({ x: 220, y: 40 });
    addShape({ x: 400, y: 40 });
    store().addSlide();
    store().goTo(0);
    store().selectAll();

    const handgriffe: Array<[string, () => void]> = [
      ['setSlideMarkdown', () => store().setSlideMarkdown('# Titel')],
      ['setSlideMeta', () => store().setSlideMeta({ layout: 'split' })],
      ['setDeckMeta', () => store().setDeckMeta({ title: 'Neu' })],
      ['updateElements', () => store().updateElements(store().selection, { opacity: 0.5 })],
      ['transformElements', () => store().transformElements((el) => ({ x: el.x + 1 }))],
      ['nudgeSelection', () => store().nudgeSelection(4, 0)],
      ['reorderSelection', () => store().reorderSelection('front')],
      ['alignSelection', () => store().alignSelection('left')],
      ['distributeSelection', () => store().distributeSelection('h')],
      ['setElementTone', () => store().setElementTone('signal')],
      ['setRevealStep', () => store().setRevealStep(1)],
      ['groupSelection', () => store().groupSelection()],
      ['ungroupSelection', () => store().ungroupSelection()],
      ['duplicateSelection', () => store().duplicateSelection()],
      ['insertPreset', () => store().insertPreset('badge')],
      ['addElement', () => store().addElement(createElement('shape'))],
      ['pasteElements', () => store().pasteElements([createElement('shape')])],
      ['deleteSelection', () => (store().selectAll(), store().deleteSelection())],
      ['addSlide', () => store().addSlide()],
      ['duplicateSlide', () => store().duplicateSlide()],
      ['moveSlide', () => store().moveSlide(0, 1)],
      ['deleteSlide', () => store().deleteSlide()],
      ['undo', () => store().undo()],
      ['redo', () => store().redo()],
    ];

    einfrieren(store().deck);
    for (const [name, handgriff] of handgriffe) {
      expect(handgriff, name).not.toThrow();
      // Auch das Ergebnis gehört gleich dem Verlauf — der nächste Handgriff
      // muss es genauso in Ruhe lassen.
      einfrieren(store().deck);
    }
  });
});

describe('im ganzen Deck ersetzen', () => {
  const DECK = [
    '<!-- nzl',
    'notes: Der Kunde heißt Kunde.',
    'elements:',
    '  - id: karte-1',
    '    kind: card',
    '    x: 80',
    '    y: 80',
    '    title: Für den Kunden',
    '    body: Was der Kunde davon hat.',
    '-->',
    '',
    '# Der Kunde im Mittelpunkt',
    '',
    '---',
    '',
    '# Zweite Folie ohne das Wort',
    '',
  ].join('\n');

  it('fasst alles an, was ein Mensch geschrieben hat', () => {
    store().loadMarkdown(DECK);
    // Fließtext, Notiz, Titel und Text der Karte — fünfmal „Kunde".
    expect(store().ersetzeImDeck('kunde', 'Auftraggeber')).toBe(5);

    const gesichert = serializeDeck(store().deck);
    expect(gesichert).not.toMatch(/Kunde/);
    expect(gesichert).toContain('# Der Auftraggeber im Mittelpunkt');
    expect(gesichert).toContain('Was der Auftraggeber davon hat.');
  });

  it('ist ein Verlaufsschritt und nicht zwölf', () => {
    /*
       Der Grund, warum das im Store steht und nicht in der Suchleiste: über
       fünf Felder verteilt wären es fünf Schritte, und ⌘Z nähme das Ersetzen
       häppchenweise zurück.
    */
    store().loadMarkdown(DECK);
    const vorher = serializeDeck(store().deck);

    store().ersetzeImDeck('kunde', 'Auftraggeber');
    expect(store().past).toHaveLength(1);

    store().undo();
    expect(serializeDeck(store().deck)).toBe(vorher);
  });

  it('lässt das Deck in Ruhe, wenn nichts passt', () => {
    store().loadMarkdown(DECK);
    const deck = store().deck;
    expect(store().ersetzeImDeck('gibtesnicht', 'x')).toBe(0);
    // Kein Verlaufsschritt, kein neues Deck — sonst hätte ein Fehlgriff das
    // Deck als „geändert" markiert und die Selbstsicherung angeworfen.
    expect(store().deck).toBe(deck);
    expect(store().past).toHaveLength(0);
  });

  it('teilt unveränderte Folien mit dem Verlauf', () => {
    // Die zweite Folie trägt das Wort nicht. Sie darf nicht neu gebaut werden
    // — sonst wüchse der Verlauf um ein Deck statt um das Geänderte.
    store().loadMarkdown(DECK);
    const zweite = store().deck.slides[1];
    store().ersetzeImDeck('kunde', 'Auftraggeber');
    expect(store().deck.slides[1]).toBe(zweite);
    expect(store().deck.slides[0]).not.toBe(store().past[0].slides[0]);
  });
});

describe('der Rohblock einer unbekannten Elementart', () => {
  const QUELLE = [
    '<!-- nzl',
    'elements:',
    '  - kind: heading',
    '    id: h-1',
    '    x: 10',
    '    y: 10',
    '    text: Ein Satz, den diese Fassung nicht kennt',
    '-->',
    '',
    '# Probe',
  ].join('\n');

  /**
   * Jede Aktion, die Elemente anfasst — und was sie in der Datei bewirkt.
   *
   * Der Rohblock verfiel bisher in `geaendert()`, und das riefen zwei von
   * zwölf Aktionen. Die anderen spreizten direkt, der Block blieb stehen, und
   * beim Sichern stand wortgleich der alte Text in der Datei: das Modell war
   * geändert, die Datei nicht. Geprüft wird deshalb an der **gesicherten
   * Datei** und nicht am Modell — dasselbe Urteil wie beim unlesbaren
   * `nzl`-Block einer Folie.
   */
  const handgriffe: Array<[string, () => void]> = [
    ['nudgeSelection', () => store().nudgeSelection(5, 5)],
    ['setElementTone', () => store().setElementTone('signal')],
    ['setRevealStep', () => store().setRevealStep(1)],
    ['alignSelection', () => store().alignSelection('left')],
    ['reorderSelection', () => store().reorderSelection('front')],
    ['updateElements', () => store().updateElements(store().selection, { x: 42 })],
    ['transformElements', () => store().transformElements(() => ({ y: 42 }), store().selection)],
  ];

  for (const [name, tun] of handgriffe) {
    it(`verfällt bei ${name}`, () => {
      const deck = parseDeck(QUELLE);
      useDeckStore.setState({
        deck,
        slideIndex: 0,
        selection: deck.slides[0].elements.map((element) => element.id),
      });
      expect(serializeDeck(store().deck)).toContain('kind: heading');
      tun();
      expect(serializeDeck(store().deck)).not.toContain('kind: heading');
    });
  }

  it('bleibt stehen, solange niemand das Element anfasst', () => {
    // Die Gegenrichtung: ein Handgriff an der *Folie* darf den Block nicht
    // wegräumen — sonst wäre der Wert weg, den er retten soll.
    const deck = parseDeck(QUELLE);
    useDeckStore.setState({ deck, slideIndex: 0, selection: [] });
    store().setSlideMeta({ background: 'ink' });
    expect(serializeDeck(store().deck)).toContain('kind: heading');
  });
});

/**
 * Der Kasten, dem das Einsetzen ausweicht, muss der gesetzte sein.
 *
 * `flowBounds()` bekam seinen Maßgeber, als der Fehler in `useClipboard`
 * auffiel — der zweite Kunde stand ohne. Und es ist der häufigere: die
 * Bausteinbibliothek. Ohne die Maße fällt der Setzer auf „volle
 * Spaltenbreite, Verhältnis 0,5625" zurück, bei einem 300 × 300-Logo also auf
 * 762 Einheiten statt 441.
 */
class Bildattrappe {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 300;
  naturalHeight = 300;
  crossOrigin = '';
  decoding = '';
  set src(_wert: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('einsetzen neben einem Bild im Fließtext', () => {
  const MIT_BILD = ['# Titel', '', '![Logo](logo.png)'].join('\n');

  beforeEach(() => {
    useDeckStore.setState({
      deck: parseDeck(MIT_BILD),
      slideIndex: 0,
      selection: [],
      past: [],
      future: [],
      dirty: false,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('weicht dem Bild aus, wie es wirklich gesetzt ist', async () => {
    vi.stubGlobal('Image', Bildattrappe);
    fordereBildmasse(['logo.png']);
    // Die Attrappe meldet sich in einer Mikroaufgabe.
    await Promise.resolve();
    await Promise.resolve();
    expect(bildmass('logo.png')).toEqual({ w: 300, h: 300 });

    const slide = store().deck.slides[0];
    const echt = flowBounds(slide.meta.layout, slide.markdown, bildmass);
    const geraten = flowBounds(slide.meta.layout, slide.markdown);
    // Die Vorbedingung der Prüfung: ohne die Maße rechnet der Setzer den
    // Kasten deutlich zu hoch. Ohne sie prüfte der Rest nichts.
    expect(geraten!.h).toBeGreaterThan(echt!.h + 100);

    store().insertPreset('badge');
    const gelegt = elementsNow().at(-1)!;
    // Unter dem *gesetzten* Text — und über dem, was die Vorgabe geraten
    // hätte.
    expect(gelegt.y).toBeGreaterThanOrEqual(echt!.y + echt!.h);
    expect(gelegt.y).toBeLessThan(geraten!.y + geraten!.h);
  });

  it('ändert nichts, wo gar kein Bild steht', () => {
    /*
       Die Gegenrichtung. Ohne sie bestünde die Prüfung darüber auch für einen
       Maßgeber, der jede Messung verschiebt: auf einer Folie ohne Bild muss
       er folgenlos sein.
    */
    useDeckStore.setState({ deck: parseDeck('# Titel\n\nEin Absatz.\n') });
    const slide = store().deck.slides[0];
    expect(flowBounds(slide.meta.layout, slide.markdown, bildmass)).toEqual(
      flowBounds(slide.meta.layout, slide.markdown),
    );
  });
});

/**
 * Zwei Netze über den Zustand, und beide rechnen ihre Liste, statt sie zu
 * tippen.
 *
 * Die Prüfung „fasst nichts an, was der Verlauf noch hält" führt vierundzwanzig
 * Handgriffe von Hand — der Store hat dreiundfünfzig. Eine Härtungsliste, die
 * man tippt, prüft die Hälfte; das steht in `CLAUDE.md` schon einmal.
 */
describe('das Netz über alle Aktionen', () => {
  /** Aktionen, die den Verlauf nichts angehen — mit Grund. */
  const OHNE_DECK = new Set([
    // Dateiweg: setzt den Zustand von außen neu.
    'loadDeck',
    'loadMarkdown',
    'newDeck',
    'markSaved',
    'meldeSicherung',
    'zeigeHinweis',
    // Ansicht und Auswahl — sie fassen das Deck nicht an.
    'goTo',
    'next',
    'previous',
    'advance',
    'retreat',
    'setMode',
    'toggleOverview',
    'toggleNotes',
    'togglePrompt',
    'toggleSearch',
    'togglePanel',
    'select',
    'toggleSelect',
    'selectAll',
    'clearSelection',
    'setGuides',
    'setSnap',
    'toggleGrid',
    'setZoom',
  ]);

  const GEPRUEFT = new Set([
    'setSlideMarkdown',
    'setSlideMeta',
    'setDeckMeta',
    'updateElement',
    'updateElements',
    'transformElements',
    'nudgeSelection',
    'reorderSelection',
    'alignSelection',
    'distributeSelection',
    'setElementTone',
    'setRevealStep',
    'groupSelection',
    'ungroupSelection',
    'duplicateSelection',
    'insertPreset',
    'addElement',
    'addElements',
    'pasteElements',
    'deleteSelection',
    'ersetzeImDeck',
    'addSlide',
    'duplicateSlide',
    'moveSlide',
    'deleteSlide',
    'pushHistory',
    'undo',
    'redo',
  ]);

  it('kennt jede Aktion des Stores', () => {
    /*
       Der Wächter über dem Wächter: wer eine Aktion hinzufügt, muss sich
       entscheiden — geprüft oder mit Grund ausgenommen. Ohne ihn wächst der
       Store und die Liste bleibt stehen.
    */
    const alle = Object.entries(store())
      .filter(([, wert]) => typeof wert === 'function')
      .map(([name]) => name)
      .sort();
    const unbekannt = alle.filter((name) => !GEPRUEFT.has(name) && !OHNE_DECK.has(name));
    expect(unbekannt).toEqual([]);

    // Und die Gegenrichtung: keine Liste führt etwas, das es nicht mehr gibt.
    const vorhanden = new Set(alle);
    expect([...GEPRUEFT, ...OHNE_DECK].filter((name) => !vorhanden.has(name))).toEqual([]);
  });

  it('fasst auch in den übrigen Aktionen nichts an, was der Verlauf hält', () => {
    /*
       Dieselbe Zusicherung wie oben, für die vier Handgriffe, die die getippte
       Liste nicht führte: `updateElement`, `addElements`, `ersetzeImDeck` und
       `pushHistory`. Keiner von ihnen hat je an Ort und Stelle geändert — die
       Prüfung hält fest, dass es so bleibt.
    */
    addShape({ x: 40, y: 40 });
    store().selectAll();
    const weitere: Array<[string, () => void]> = [
      ['updateElement', () => store().updateElement(store().selection[0], { opacity: 0.4 })],
      ['addElements', () => store().addElements([createElement('badge')])],
      ['ersetzeImDeck', () => store().ersetzeImDeck('a', 'b')],
      ['pushHistory', () => store().pushHistory('probe')],
    ];

    einfrieren(store().deck);
    for (const [name, handgriff] of weitere) {
      expect(handgriff, name).not.toThrow();
      einfrieren(store().deck);
    }
  });
});

/**
 * „Alle ersetzen" gibt den Rohblock auf wie jeder andere Weg.
 *
 * Der Kopf von `withElements()` führt es als einen der zehn Wege auf, die den
 * Block früher stehen ließen — und es war der eine, der es weiter tat:
 * `withElements()` gilt der *offenen* Folie, dieser Weg geht durch alle.
 *
 * Der Zustand ist **von Hand gebaut**, und das gehört dazu: aus dem Leser kommt
 * ein Element mit Rohblock als `shape` mit lauter Vorgabewerten, und in leeren
 * Feldern findet die Suche nichts. Erreichbar ist der Fehler heute also nicht —
 * die Zusage steht trotzdem an zwei Stellen im Klartext, und eine Zusage, die
 * nur fast gilt, ist keine.
 */
describe('der Rohblock beim Ersetzen im ganzen Deck', () => {
  const mitRohblock = (titel: string) =>
    ({
      ...createElement('card', { x: 40, y: 40, title: titel }),
      unknownRaw: { kind: 'heading', text: titel },
    }) as CanvasElement;

  const lege = (element: CanvasElement) => {
    useDeckStore.setState((state) => ({
      deck: {
        ...state.deck,
        slides: state.deck.slides.map((slide, i) =>
          i === 0 ? { ...slide, elements: [element] } : slide,
        ),
      },
      selection: [element.id],
    }));
  };

  it('verfällt, sobald der Text wirklich ersetzt wird', () => {
    lege(mitRohblock('Hallo'));
    expect(store().ersetzeImDeck('Hallo', 'Servus')).toBeGreaterThan(0);

    const element = store().deck.slides[0].elements[0];
    expect(element.unknownRaw).toBeUndefined();
    // Und an der gesicherten Datei, nicht am Modell: der alte Block darf dort
    // nicht mehr stehen, sonst wäre die Ersetzung beim nächsten Öffnen weg.
    const datei = serializeDeck(store().deck);
    expect(datei).toContain('Servus');
    expect(datei).not.toContain('kind: heading');
  });

  it('bleibt stehen, wo nichts ersetzt wurde', () => {
    // Die Gegenrichtung: wer nicht angefasst wurde, behält seinen Block.
    lege(mitRohblock('Hallo'));
    expect(store().ersetzeImDeck('kommt nicht vor', 'x')).toBe(0);
    expect(store().deck.slides[0].elements[0].unknownRaw).toBeDefined();
  });
});

/**
 * Und was der Store baut, muss die Datei tragen können.
 *
 * Eine Aktion, deren Ergebnis den Weg durch die `.md` nicht übersteht, verliert
 * still — und man sieht es erst beim nächsten Öffnen. Verglichen wird das
 * ganze Deck; die **Folienkennung** ist ausgenommen, weil sie im Dateiformat
 * nicht steht: sie ist ein Griff im Speicher und wird beim Lesen neu vergeben.
 */
describe('der Rundlauf durch die Datei', () => {
  const ohneFolienId = (deck: ReturnType<typeof parseDeck>) => ({
    ...deck,
    slides: deck.slides.map(({ id: _id, ...rest }) => rest),
  });

  const wege: Array<[string, () => void]> = [
    ['setSlideMeta', () => store().setSlideMeta({ layout: 'split', notes: 'Notiz' })],
    ['setDeckMeta', () => store().setDeckMeta({ title: 'Neu', theme: 'musterkunde' })],
    ['updateElements', () => store().updateElements(store().selection, { opacity: 0.5 })],
    ['transformElements', () => store().transformElements((el) => ({ x: el.x + 1, rotation: 30 }))],
    ['nudgeSelection', () => store().nudgeSelection(8, 8)],
    ['reorderSelection', () => store().reorderSelection('back')],
    ['alignSelection', () => store().alignSelection('vcenter')],
    ['distributeSelection', () => store().distributeSelection('h')],
    ['setElementTone', () => store().setElementTone('signal')],
    ['setRevealStep', () => store().setRevealStep(2, 'wipe')],
    ['groupSelection', () => store().groupSelection()],
    ['duplicateSelection', () => store().duplicateSelection()],
    ['insertPreset', () => store().insertPreset('icon')],
    ['pasteElements', () => store().pasteElements([createElement('wordmark')])],
    ['deleteSelection', () => store().deleteSelection()],
    ['addSlide', () => store().addSlide()],
    ['duplicateSlide', () => store().duplicateSlide()],
    ['ersetzeImDeck', () => store().ersetzeImDeck('A', 'Z')],
    ['undo', () => store().undo()],
  ];

  it.each(wege)('%s übersteht Sichern und Öffnen', (_name, tun) => {
    useDeckStore.setState({
      deck: parseDeck('# Eins\n\nText eins.\n'),
      slideIndex: 0,
      selection: [],
      past: [],
      future: [],
      dirty: false,
    });
    store().addElement(createElement('card', { x: 40, y: 40, title: 'A' }));
    store().addElement(createElement('badge', { x: 300, y: 40, text: 'B' }));
    store().addElement(createElement('shape', { x: 560, y: 40 }));
    store().selectAll();

    tun();
    const gebaut = store().deck;
    const gelesen = parseDeck(serializeDeck(gebaut));
    expect(ohneFolienId(gelesen)).toEqual(ohneFolienId(gebaut));
  });
});
