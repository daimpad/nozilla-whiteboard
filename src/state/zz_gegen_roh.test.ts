import { beforeEach, describe, expect, it } from 'vitest';
import { parseDeck, serializeDeck } from '@/lib/markdown/deck';
import { createStarterDeck, useDeckStore } from './deckStore';

const store = () => useDeckStore.getState();

const QUELLE = [
  '<!-- nzl',
  'elements:',
  '  - id: h1',
  '    kind: heading',
  '    text: Ein Satz, den diese Fassung nicht kennt',
  '    x: 100',
  '    y: 100',
  '    w: 200',
  '    h: 60',
  '-->',
  '',
  '# Probe Zwiebel',
].join('\n');

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
  });
});

describe('unknownRaw gegen Store-Aktionen', () => {
  it('misst je Handgriff Modell und Datei', () => {
    const handgriffe: Array<[string, () => void]> = [
      ['nudgeSelection', () => store().nudgeSelection(160, 0)],
      ['alignSelection', () => store().alignSelection('right')],
      ['setElementTone', () => store().setElementTone('signal')],
      ['setRevealStep', () => store().setRevealStep(1)],
      ['reorderSelection', () => store().reorderSelection('front')],
      ['groupSelection', () => store().groupSelection()],
      ['transformElements', () => store().transformElements((el) => ({ x: el.x + 160 }))],
      ['updateElements', () => store().updateElements(store().selection, { x: 555 })],
      ['duplicateSelection', () => store().duplicateSelection()],
    ];

    for (const [name, tun] of handgriffe) {
      useDeckStore.setState({
        deck: parseDeck(QUELLE),
        slideIndex: 0,
        selection: [],
        past: [],
        future: [],
      });
      // Zweites Element, damit groupSelection/align etwas zu tun haben.
      store().selectAll();
      const vorherModell = JSON.stringify(store().deck.slides[0].elements);
      const vorherDatei = serializeDeck(store().deck);
      tun();
      const nachherModell = JSON.stringify(store().deck.slides[0].elements);
      const nachherDatei = serializeDeck(store().deck);
      // eslint-disable-next-line no-console
      console.log(
        name.padEnd(20),
        'Modell geändert:',
        String(vorherModell !== nachherModell).padEnd(6),
        'Datei geändert:',
        vorherDatei !== nachherDatei,
      );
    }
  });

  it('ersetzeImDeck meldet Treffer, die Datei bleibt', () => {
    useDeckStore.setState({ deck: parseDeck(QUELLE), slideIndex: 0, selection: [] });
    const anzahl = store().ersetzeImDeck('Zwiebel', 'Kartoffel');
    const datei = serializeDeck(store().deck);
    // eslint-disable-next-line no-console
    console.log('ersetzeImDeck:', anzahl, '· Kartoffel in Datei:', /Kartoffel/.test(datei));
    // eslint-disable-next-line no-console
    console.log('Elementtexte im Modell:', JSON.stringify(store().deck.slides[0].elements));
  });

  it('nudge: Modell vs Datei im Einzelnen', () => {
    useDeckStore.setState({ deck: parseDeck(QUELLE), slideIndex: 0, selection: [] });
    store().selectAll();
    store().nudgeSelection(160, 0);
    const el = store().deck.slides[0].elements[0];
    const datei = serializeDeck(store().deck);
    // eslint-disable-next-line no-console
    console.log('Modell x:', el.x, '· Datei enthält x: 100:', /x: 100/.test(datei));
    // eslint-disable-next-line no-console
    console.log(datei);
  });

  it('duplicateSelection: doppelte id in der Datei', () => {
    useDeckStore.setState({ deck: parseDeck(QUELLE), slideIndex: 0, selection: [] });
    store().selectAll();
    store().duplicateSelection();
    const datei = serializeDeck(store().deck);
    const wieder = parseDeck(datei);
    // eslint-disable-next-line no-console
    console.log(
      'ids im Modell:',
      store().deck.slides[0].elements.map((e) => e.id),
    );
    // eslint-disable-next-line no-console
    console.log(
      'ids in der Datei:',
      wieder.slides[0].elements.map((e) => e.id),
    );
    // eslint-disable-next-line no-console
    console.log(
      'Positionen nach Sichern+Öffnen:',
      wieder.slides[0].elements.map((e) => `${e.x}/${e.y}`),
    );
  });
});
