/**
 * Die Tastatur — geprüft an dem, was sie wirklich auslöst.
 *
 * Zwei Fragen stehen hier nebeneinander, und sie sind verschieden. Die eine:
 * *tut* eine Taste, was sie soll — und lässt sie liegen, was ihr nicht gehört?
 * Die andere: weiß irgendjemand davon? Eine Belegung, die nirgends steht, ist
 * das Gegenstück zum toten Bedienelement — eine Wirkung ohne einen Weg dorthin.
 */
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { useDeckStore } from '@/state/deckStore';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

vi.mock('@/state/persistence', () => ({
  sichereDeck: vi.fn(async () => {}),
  oeffneDeck: vi.fn(async () => {}),
  darfErsetzen: vi.fn(() => true),
}));
import { oeffneDeck, sichereDeck } from '@/state/persistence';

function Probe() {
  useKeyboardShortcuts();
  return null;
}

const DECK = `# Eins

<!-- nzl
elements:
  - id: a
    kind: shape
    x: 100
    y: 100
    w: 200
    h: 100
  - id: b
    kind: shape
    x: 400
    y: 100
    w: 200
    h: 100
-->

---

# Zwei
`;

let abbauen: (() => void) | null = null;

beforeEach(async () => {
  const wirt = document.createElement('div');
  document.body.append(wirt);
  const wurzel = createRoot(wirt);
  await act(async () => {
    wurzel.render(<Probe />);
  });
  abbauen = () => {
    wurzel.unmount();
    wirt.remove();
  };
  neuesDeck();
});

afterEach(() => {
  abbauen?.();
  abbauen = null;
  vi.clearAllMocks();
});

function neuesDeck(): void {
  useDeckStore.setState({
    deck: parseDeck(DECK),
    slideIndex: 0,
    mode: 'edit',
    selection: [],
    past: [],
    future: [],
    overviewOpen: false,
    searchOpen: false,
    promptOpen: false,
  });
}

const zustand = () => useDeckStore.getState();
const elemente = () => zustand().deck.slides[zustand().slideIndex].elements;
const ersteId = () => zustand().deck.slides[0].elements[0].id;

/** Eine Taste drücken. `ziel` ist der Knoten, auf dem der Fokus steht. */
function taste(init: KeyboardEventInit, ziel?: EventTarget): KeyboardEvent {
  const ereignis = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  (ziel ?? window).dispatchEvent(ereignis);
  return ereignis;
}

/* -------------------------------------------------------------------------- */
/* Was eine Taste auslöst                                                      */
/* -------------------------------------------------------------------------- */

describe('was eine Taste auslöst', () => {
  it('macht aus einem gehaltenen Pfeil einen Verlaufsschritt', () => {
    /*
       Dreißig Anschläge waren dreißig Einträge im Verlauf. Eine Sekunde auf
       der Taste räumt damit ein Viertel der hundertzwanzig leer, und ⌘Z nimmt
       danach acht Einheiten Bewegung zurück statt der Änderung davor —
       wörtlich der Fehler, den das Zusammenfassen für die Textfelder längst
       behebt.
    */
    zustand().select([ersteId()]);
    const vorher = zustand().past.length;
    for (let i = 0; i < 30; i++) taste({ key: 'ArrowRight' });

    expect(zustand().past.length).toBe(vorher + 1);
    expect(elemente()[0].x).toBe(100 + 30 * 8);

    // Und ein anderer Handgriff ist ein anderer Schritt: wer etwas anderes
    // anwählt und dann schiebt, hat nicht dasselbe weitergeschoben.
    zustand().select([zustand().deck.slides[0].elements[1].id]);
    taste({ key: 'ArrowRight' });
    expect(zustand().past.length).toBe(vorher + 2);
  });

  it('lässt ⌘P dem Browser', () => {
    /*
       Der Schalter `!mod` stand bei `n` und fehlte bei `g` und `p`. Bei `g`
       fiel das nicht auf, weil `⌘G` eine Ecke weiter oben zurückkehrt; `⌘P`
       kehrte nirgends zurück und nahm dem Browser den Druckdialog weg — in
       einem Werkzeug, dessen Zweck druckbares Material ist.
    */
    const gedruckt = taste({ key: 'p', metaKey: true });
    expect(zustand().mode).toBe('edit');
    expect(gedruckt.defaultPrevented).toBe(false);

    // Die Gegenrichtung: blank tun die drei Buchstaben weiterhin ihren Dienst.
    expect(taste({ key: 'p' }).defaultPrevented).toBe(true);
    expect(zustand().mode).toBe('present');
    zustand().setMode('edit');

    const raster = zustand().showGrid;
    taste({ key: 'g' });
    expect(zustand().showGrid).toBe(!raster);

    const folien = zustand().deck.slides.length;
    taste({ key: 'n' });
    expect(zustand().deck.slides.length).toBe(folien + 1);
  });

  it('lässt Leertaste und Eingabe dem Knopf, auf dem der Fokus steht', () => {
    /*
       Ein Tabstopp auf „Folie hinzufügen", dann Leertaste — und statt einer
       neuen Folie kam die nächste Folie: der `preventDefault` nahm dem Knopf
       seine Betätigung. Im Vortrag traf es „Präsentation verlassen".
    */
    const knopf = document.createElement('button');
    document.body.append(knopf);
    knopf.focus();

    expect(taste({ key: ' ' }, knopf).defaultPrevented).toBe(false);
    expect(zustand().slideIndex).toBe(0);

    useDeckStore.setState({ mode: 'present', slideIndex: 0, revealStep: 0 });
    expect(taste({ key: 'Enter' }, knopf).defaultPrevented).toBe(false);
    expect(taste({ key: ' ' }, knopf).defaultPrevented).toBe(false);
    expect(zustand().slideIndex).toBe(0);

    knopf.remove();

    // Die Gegenrichtung, und sie ist hier der eigentliche Befund: ohne einen
    // Knopf unter dem Fokus blättert die Leertaste weiter wie eh und je.
    useDeckStore.setState({ mode: 'edit', slideIndex: 0 });
    expect(taste({ key: ' ' }).defaultPrevented).toBe(true);
    expect(zustand().slideIndex).toBe(1);
  });

  it('fasst nichts an, was eine offene Schicht zudeckt', () => {
    /*
       Wer im Suchfeld auf „Alle ersetzen" geklickt hat, steht danach auf
       einem Knopf und nicht in einem Feld — die Tipp-Sperre greift dort
       nicht. Ein `⌫` löschte von dort das ausgewählte Element auf der Folie
       darunter, ohne dass etwas davon zu sehen war.
    */
    for (const schicht of ['searchOpen', 'promptOpen', 'overviewOpen'] as const) {
      neuesDeck();
      zustand().select([ersteId()]);
      useDeckStore.setState({ [schicht]: true });

      taste({ key: 'Delete' });
      expect(elemente(), schicht).toHaveLength(2);
      taste({ key: 'n' });
      expect(zustand().deck.slides, schicht).toHaveLength(2);
      taste({ key: 'p' });
      expect(zustand().mode, schicht).toBe('edit');
      taste({ key: 'ArrowRight' });
      expect(zustand().deck.slides[0].elements[0].x, schicht).toBe(100);

      // Blättern darf sie trotzdem: die Übersicht zeigt gerade, wo man steht.
      expect(zustand().slideIndex, schicht).toBe(1);
    }
  });

  it('bleibt stumm, solange jemand tippt — bis auf die vier, die es sollen', () => {
    const feld = document.createElement('textarea');
    document.body.append(feld);

    zustand().select([ersteId()]);
    taste({ key: 'Backspace' }, feld);
    expect(elemente()).toHaveLength(2);
    taste({ key: 'ArrowRight' }, feld);
    expect(elemente()[0].x).toBe(100);

    // ⌘S, ⌘F und die drei Leisten stehen bewusst davor.
    taste({ key: 's', metaKey: true }, feld);
    expect(sichereDeck).toHaveBeenCalled();
    taste({ key: 'f', metaKey: true }, feld);
    expect(zustand().searchOpen).toBe(true);
    taste({ key: '3', metaKey: true }, feld);
    expect(zustand().panels.inspector).toBe(false);

    feld.remove();
  });
});

/* -------------------------------------------------------------------------- */
/* Was angesagt ist                                                            */
/* -------------------------------------------------------------------------- */

const QUELLE = readFileSync('src/hooks/useKeyboardShortcuts.ts', 'utf8');

/** Kommentare leeren statt entfernen — dieselbe Linie wie in `theme.test.ts`. */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (treffer) => treffer.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

/**
 * Welche Tastenkombinationen der Haken abfragt — aus der Quelle gelesen.
 *
 * Die Modifikatoren stehen in derselben Zeile wie der Vergleich, deshalb
 * genügt es, zeilenweise zu lesen. Zwei Grenzen hat das, und beide stehen
 * hier, damit der Nächste sie kennt.
 *
 * Ein `event.shiftKey` eine Ebene tiefer wird nicht gesehen: `⇧⌘Z` und `⇧⌘G`
 * gehören hier zu `⌘Z` und `⌘G`, weil sie derselbe Zweig sind.
 *
 * Und ein blanker Buchstabe kann in zwei Betriebsarten zwei Dinge tun — `n`
 * legt eine Folie an und schaltet im Vortrag die Notizen um. Gelesen wird die
 * *Taste* und nicht die Bedeutung: solange eine der beiden Stellen die Taste
 * ansagt, ist diese Prüfung zufrieden. Nachgemessen an der Gegenprobe — das
 * `(N)` am Knopf „Folie hinzufügen" wegzunehmen macht sie nicht rot, weil der
 * Notizen-Knopf im Vortrag dasselbe `(N)` trägt.
 */
function bindungen(quelle: string): Set<string> {
  const gefunden = new Set<string>();
  for (const zeile of ohneKommentare(quelle).split('\n')) {
    const fall = /^\s*case '([^']*)':/.exec(zeile);
    if (fall) {
      gefunden.add(fall[1]);
      continue;
    }
    // Gelesen wird die *Bedingung* und nicht die ganze Zeile. Sonst zählt
    // `if (event.shiftKey) reorder(event.key === ']' ? …)` als eine eigene
    // Belegung von `]` ohne ⌘ — dabei ist es der Zweig innerhalb von ⌘].
    const bedingung = pruefteil(zeile);
    if (!bedingung) continue;
    if (/\['1', '2', '3'\]/.test(bedingung)) {
      for (const ziffer of ['1', '2', '3']) gefunden.add(`⌘${ziffer}`);
      continue;
    }
    const mit = /\bmod &&/.test(bedingung) ? '⌘' : '';
    const umschalt = /[^!]event\.shiftKey &&/.test(bedingung) ? '⇧' : '';
    for (const treffer of bedingung.matchAll(
      /(?:event\.key(?:\.toLowerCase\(\))?|\bkey)\s*===\s*'([^']*)'/g,
    )) {
      gefunden.add(`${mit}${umschalt}${treffer[1]}`);
    }
  }
  return gefunden;
}

/** Der geklammerte Teil hinter `if` — oder nichts, wenn die Zeile keines ist. */
function pruefteil(zeile: string): string {
  const anfang = /(?:^\s*|\}\s*else\s*)if \(/.exec(zeile);
  if (!anfang) return '';
  let tiefe = 0;
  const von = anfang.index + anfang[0].length;
  for (let i = von - 1; i < zeile.length; i++) {
    if (zeile[i] === '(') tiefe++;
    else if (zeile[i] === ')') {
      tiefe--;
      if (tiefe === 0) return zeile.slice(von, i);
    }
  }
  return zeile.slice(von);
}

/**
 * Wo eine Belegung angesagt wird — die Schreibweise, unter der sie zu finden
 * ist. Gesucht wird in den Beschriftungen der Oberfläche und im
 * Willkommens-Deck, also genau dort, wo ein Mensch sie lesen kann.
 */
const ANSAGE: Record<string, string> = {
  '⌘1': '⌘1',
  '⌘2': '⌘2',
  '⌘3': '⌘3',
  '⌘s': '⌘S',
  '⌘o': '⌘O',
  '⌘⇧n': '⌘⇧N',
  '⌘k': '⌘K',
  '⌘f': '⌘F',
  '⌘z': '⌘Z',
  '⌘a': '⌘A',
  '⌘d': '⌘D',
  '⌘g': '⌘G',
  '⌘]': '⌘]',
  '⌘[': '⌘[',
  Escape: 'Esc',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: 'Pfeiltasten',
  ArrowDown: 'Pfeiltasten',
  ' ': 'Leer',
  Backspace: '⌫',
  f: 'F Vollbild',
  g: '(G)',
  n: '(N)',
  p: '`P`',
};

/**
 * Was ausdrücklich nicht angesagt wird — und warum. Eine Ausnahme ohne Grund
 * ist eine Lücke mit Deckmantel.
 */
const AUSNAHMEN: Record<string, string> = {
  '⌘y': 'Zweitbelegung von ⇧⌘Z, für Tastaturen, auf denen Y und Z getauscht sind.',
  PageUp: 'Was ein Präsentierstab schickt; keine Taste, die jemand sucht.',
  PageDown: 'Was ein Präsentierstab schickt; keine Taste, die jemand sucht.',
  Enter: 'Was ein Präsentierstab schickt, und die übliche Zweitbelegung der Leertaste.',
  Delete: 'Dieselbe Handlung wie ⌫, auf einer Tastatur mit eigenem Entf-Block.',
  Home: 'Erste Folie — der Filmstreifen zeigt sie, die Taste ist die übliche.',
  End: 'Letzte Folie — der Filmstreifen zeigt sie, die Taste ist die übliche.',
};

function angesagteQuellen(): string {
  const dateien = [
    'src/App.tsx',
    'src/components/chrome/TopBar.tsx',
    'src/components/chrome/Overview.tsx',
    'src/components/present/PresentView.tsx',
    'src/components/panels/Inspector.tsx',
    'src/components/panels/SearchPanel.tsx',
    'src/components/panels/PromptStudio.tsx',
  ];
  const code = dateien.map((datei) => ohneKommentare(readFileSync(datei, 'utf8'))).join('\n');
  // Das Willkommens-Deck ohne Kommentarschnitt: sein `nzl`-Block *ist* der
  // sichtbare Inhalt der Tastentabelle.
  return `${code}\n${readFileSync('src/decks/welcome.md', 'utf8')}`;
}

describe('was angesagt ist', () => {
  it('sagt jede Belegung an — oder nennt den Grund, warum nicht', () => {
    const quellen = angesagteQuellen();
    const fehlend: string[] = [];
    for (const bindung of bindungen(QUELLE)) {
      if (AUSNAHMEN[bindung]) continue;
      const schreibweise = ANSAGE[bindung];
      if (schreibweise === undefined || !quellen.includes(schreibweise)) fehlend.push(bindung);
    }
    expect(fehlend).toEqual([]);
  });

  it('führt keine Ansage und keine Ausnahme, die es nicht mehr gibt', () => {
    // Der Wächter über dem Wächter: eine Liste, die Belegungen führt, die der
    // Haken gar nicht abfragt, sagt nichts mehr über den Haken.
    const gebunden = bindungen(QUELLE);
    const verwaist = [...Object.keys(ANSAGE), ...Object.keys(AUSNAHMEN)].filter(
      (bindung) => !gebunden.has(bindung),
    );
    expect(verwaist).toEqual([]);
  });

  it('liest überhaupt Belegungen aus der Quelle', () => {
    // Ohne das wären beide Prüfungen darüber grün, sobald der Leser nichts
    // mehr findet.
    const gebunden = bindungen(QUELLE);
    expect(gebunden.size).toBeGreaterThan(25);
    expect(gebunden.has('⌘f')).toBe(true);
    expect(gebunden.has('Escape')).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Die Tastentabelle des Willkommens-Decks                                     */
/* -------------------------------------------------------------------------- */

/** Die Kürzel, die das Willkommens-Deck in seiner Tastentabelle verspricht. */
function versprochen(): string[] {
  const deck = readFileSync('src/decks/welcome.md', 'utf8');
  const tabelle = deck.slice(deck.indexOf('### Tasten'));
  const ende = tabelle.indexOf('\n-->');
  return [...new Set([...tabelle.slice(0, ende).matchAll(/`([^`]+)`/g)].map((t) => t[1]))];
}

/**
 * Was jedes versprochene Kürzel bewirken muss. Die Liste wird gegen das Deck
 * gehalten und nicht umgekehrt: wer eine Zeile in die Tabelle schreibt, ohne
 * sie zu belegen, wird hier rot.
 */
const PROBEN: Record<string, () => void> = {
  '→': () => {
    taste({ key: 'ArrowRight' });
    expect(zustand().slideIndex).toBe(1);
  },
  '←': () => {
    zustand().goTo(1);
    taste({ key: 'ArrowLeft' });
    expect(zustand().slideIndex).toBe(0);
  },
  Leer: () => {
    taste({ key: ' ' });
    expect(zustand().slideIndex).toBe(1);
  },
  '⌘D': () => {
    zustand().select([ersteId()]);
    taste({ key: 'd', metaKey: true });
    expect(elemente()).toHaveLength(3);
  },
  '⌫': () => {
    zustand().select([ersteId()]);
    taste({ key: 'Backspace' });
    expect(elemente()).toHaveLength(1);
  },
  '⌘]': () => {
    zustand().select([ersteId()]);
    taste({ key: ']', metaKey: true });
    expect(elemente().find((element) => element.id === 'a')?.z).toBe(1);
  },
  '⌘[': () => {
    const zweite = zustand().deck.slides[0].elements[1].id;
    zustand().select([zweite]);
    taste({ key: '[', metaKey: true });
    expect(elemente().find((element) => element.id === zweite)?.z).toBe(0);
  },
  '⌘A': () => {
    taste({ key: 'a', metaKey: true });
    expect(zustand().selection).toHaveLength(2);
  },
  '⌘Z': () => {
    zustand().select([ersteId()]);
    taste({ key: 'Backspace' });
    taste({ key: 'z', metaKey: true });
    expect(elemente()).toHaveLength(2);
  },
  '⇧⌘Z': () => {
    zustand().select([ersteId()]);
    taste({ key: 'Backspace' });
    taste({ key: 'z', metaKey: true });
    taste({ key: 'z', metaKey: true, shiftKey: true });
    expect(elemente()).toHaveLength(1);
  },
  '⌘K': () => {
    taste({ key: 'k', metaKey: true });
    expect(zustand().overviewOpen).toBe(true);
  },
  P: () => {
    taste({ key: 'p' });
    expect(zustand().mode).toBe('present');
  },
  '⌘S': () => {
    taste({ key: 's', metaKey: true });
    expect(sichereDeck).toHaveBeenCalled();
  },
};

describe('was das Willkommens-Deck verspricht', () => {
  it('belegt jedes Kürzel seiner Tastentabelle', () => {
    const kuerzel = versprochen();
    expect(kuerzel.length).toBeGreaterThan(10);
    for (const kurz of kuerzel) {
      const probe = PROBEN[kurz];
      expect(probe, `Die Tabelle verspricht \`${kurz}\`, geprüft wird es nicht.`).toBeDefined();
      neuesDeck();
      probe!();
    }
  });

  it('führt keine Probe für ein Kürzel, das die Tabelle nicht nennt', () => {
    const kuerzel = new Set(versprochen());
    expect(Object.keys(PROBEN).filter((kurz) => !kuerzel.has(kurz))).toEqual([]);
  });
});

/* Nur damit `oeffneDeck` als benutzt gilt — der Haken ruft es auf ⌘O. */
expect(typeof oeffneDeck).toBe('function');
