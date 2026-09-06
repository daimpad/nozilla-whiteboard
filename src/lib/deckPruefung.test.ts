/**
 * Die Prüfliste — geprüft an beidem: dass sie anschlägt und dass sie schweigt.
 *
 * Die zweite Hälfte ist hier die wichtigere. Ein Wächter, der auf dem eigenen
 * Material anschlägt, wird abgeschaltet und bewacht dann gar nichts mehr —
 * das steht in `CLAUDE.md` dreimal, beim Kontrastwächter, beim Überlaufbalken
 * und bei der Unterscheidbarkeit zweier Farben. Die mitgelieferten Decks
 * müssen deshalb sauber herauskommen, und zwar ohne Ausnahme.
 *
 * Gerechnet wird hier mit den **Ersatzmaßen**: unter jsdom gibt es kein
 * Canvas. Wo eine Zeile wirklich umbricht, entscheidet die echte Schrift —
 * dafür steht der Handgriff im Rauchtest.
 */
import { describe, expect, it } from 'vitest';
import welcome from '@/decks/welcome.md?raw';
import musterkunde from '@/decks/musterkunde.md?raw';
import { parseDeck } from '@/lib/markdown/deck';
import { pruefeDeck, zaehleBefunde, type Rang } from './deckPruefung';

/**
 * Ein Deck, in dem jede Regel genau einmal verletzt ist.
 *
 * Die Werte stehen so da, weil sie gemessen wurden: die Überschrift läuft aus
 * ihrem Kasten, das Abzeichen liegt unter der Folienkante, das Rechteck trägt
 * den Ton „Weiß" auf dem Untergrund „Papier" — die Vorgabe jeder neuen Folie
 * und eine der fünf Kombinationen, die nichts malen.
 */
const KAPUTT = `# Eins

<!-- nzl
elements:
  - id: schmal
    kind: text
    x: 88
    y: 88
    w: 300
    h: 60
    typeStyle: h1
    text: Eine Überschrift, die in diesen Kasten nicht hineinpasst
  - id: unsichtbar
    kind: shape
    x: 88
    y: 200
    w: 200
    h: 100
    tone: white
    fill: flat
  - id: weg
    kind: badge
    x: 88
    y: 900
    w: 200
    h: 40
  - id: ohnequelle
    kind: image
    x: 400
    y: 200
    w: 200
    h: 120
  - id: ohnealt
    kind: image
    x: 700
    y: 200
    w: 200
    h: 120
    src: logo.png
  - id: zahlen
    kind: chart
    x: 700
    y: 400
    w: 300
    h: 200
    data: |
      Eins 10
      Kaputt
      Drei 30
-->

---

<!-- nzl
notes: eins: zwei: drei
-->

# Zwei

---

${absaetze(40)}

---

${absaetze(16)}
`;

function absaetze(anzahl: number): string {
  return Array.from(
    { length: anzahl },
    (_, i) => `Absatz ${i + 1} mit genug Text, dass er Platz braucht und umbricht.`,
  ).join('\n\n');
}

const befunde = pruefeDeck(parseDeck(KAPUTT));
const traegt = (teil: string) => befunde.filter((b) => b.text.includes(teil));

describe('was die Prüfliste findet', () => {
  it('meldet einen unlesbaren nzl-Block als Fehler', () => {
    const [befund] = traegt('nzl-Block dieser Folie');
    expect(befund?.rang).toBe<Rang>('fehler');
    expect(befund?.folie).toBe(1);
    expect(befund?.element).toBeUndefined();
  });

  it('trennt den Fließtext unter der Folienkante von dem über dem Satzspiegel', () => {
    /*
       Zwei Fragen und nicht eine: zwischen Satzspiegel und Folienkante steht
       der Text noch da (und in der Fußzeile), darunter steht er in keiner
       Ausgabe. Ein Satz, der beides gleichsetzt, ist an einer der beiden
       Stellen falsch.
    */
    const unten = traegt('unter die Folienkante');
    expect(unten).toHaveLength(1);
    expect(unten[0].rang).toBe<Rang>('fehler');
    expect(unten[0].folie).toBe(2);

    const spiegel = traegt('über den Satzspiegel');
    expect(spiegel).toHaveLength(1);
    expect(spiegel[0].rang).toBe<Rang>('warnung');
    expect(spiegel[0].folie).toBe(3);
  });

  it('nennt ein Element unter der Folienkante beim Namen', () => {
    const [befund] = traegt('liegt unter der Folienkante');
    expect(befund?.rang).toBe<Rang>('fehler');
    expect(befund?.element).toBe('weg');
  });

  it('meldet einen Überlauf mit seiner Zahl', () => {
    const [befund] = traegt('aus dem Kasten');
    expect(befund?.rang).toBe<Rang>('warnung');
    expect(befund?.element).toBe('schmal');
    expect(befund?.text).toMatch(/läuft \d+ Einheiten/);
  });

  it('meldet eine Fläche in der Farbe ihres Untergrunds', () => {
    const [befund] = traegt('Farbe seines Untergrunds');
    expect(befund?.rang).toBe<Rang>('warnung');
    expect(befund?.element).toBe('unsichtbar');
  });

  it('nennt die erste Diagrammzeile, die keine Zahl trägt', () => {
    const [befund] = traegt('keine lesbare Zahl');
    expect(befund?.rang).toBe<Rang>('warnung');
    expect(befund?.element).toBe('zahlen');
    expect(befund?.text).toContain('Kaputt');
  });

  it('fragt erst nach der Quelle und dann nach dem Alternativtext', () => {
    /*
       Eine Frage je Loch: nach der Beschreibung eines Bildes zu fragen, das
       gar keines ist, wäre der zweite Befund für dasselbe. Deshalb trägt
       `ohnequelle` genau einen Befund und nicht zwei.
    */
    const quelle = traegt('noch keine Quelle');
    expect(quelle).toHaveLength(1);
    expect(quelle[0].element).toBe('ohnequelle');

    const alt = traegt('keinen Alternativtext');
    expect(alt).toHaveLength(1);
    expect(alt[0].rang).toBe<Rang>('hinweis');
    expect(alt[0].element).toBe('ohnealt');
  });

  it('stellt auf einer Folie den schwereren Rang nach oben', () => {
    const ersteFolie = befunde.filter((b) => b.folie === 0);
    const raenge = ersteFolie.map((b) => b.rang);
    expect(raenge[0]).toBe<Rang>('fehler');
    expect(raenge).toEqual([...raenge].sort((a, b) => gewicht(b) - gewicht(a)));
  });

  it('zählt, was es gefunden hat', () => {
    const zahl = zaehleBefunde(befunde);
    expect(zahl.fehler + zahl.warnung + zahl.hinweis).toBe(befunde.length);
    expect(zahl.fehler).toBeGreaterThan(0);
    expect(zahl.hinweis).toBe(1);
  });
});

function gewicht(rang: Rang): number {
  return rang === 'fehler' ? 2 : rang === 'warnung' ? 1 : 0;
}

describe('was die Prüfliste in Ruhe lässt', () => {
  /*
     Die Gegenrichtung, und sie ist hier der eigentliche Befund. Beide
     mitgelieferten Decks gehen jedes Layout, jeden Untergrund, jede
     Elementart und jeden Einblendschritt durch — wenn irgendetwas davon eine
     Regel auslöst, ist die Regel zu scharf und nicht das Deck kaputt.
  */
  it.each([
    ['welcome', welcome],
    ['musterkunde', musterkunde],
  ])('lässt %s ohne einen einzigen Befund durch', (_name, quelle) => {
    expect(pruefeDeck(parseDeck(quelle))).toEqual([]);
  });

  it('sagt zu einem leeren Deck nichts', () => {
    expect(pruefeDeck(parseDeck(''))).toEqual([]);
  });
});
