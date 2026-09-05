/**
 * Wer rechnet, abonniert — und zwar je Komponente.
 *
 * Vier Auskünfte der Oberfläche sind **gerechnet** und nicht abgelesen: der
 * Überlauf eines Elements, der Überlauf des Fließtextes, wie weit er unter die
 * Folienkante reicht, und ob eine Fläche genau die Farbe ihres Untergrunds
 * hat. Alle vier ändern sich, ohne dass jemand die Folie anfasst — an der
 * echten Schrift, am Erscheinungsbild, an eingetroffenen Bildmaßen und am
 * Folienformat. Die Zähler dafür gibt es seit je; sie zu rufen ist die einzige
 * Art, wie React davon erfährt.
 *
 * Diese Prüfung liest Quelltext, aus demselben Grund wie `replaceGuard.test.ts`
 * und `theme.test.ts`: **der Fehler war schon da.** `ElementPanel` rechnete
 * den Überlauf und abonnierte keinen einzigen Zähler; `SlidePanel` abonnierte
 * drei von vier. Eine Prüfung am Ergebnis fängt die eine Leiste, die sie
 * durchspielt — die fünfte Stelle, die morgen dazukommt, fängt nur die Regel.
 *
 * **Je Komponente und nicht je Datei**, denn genau das war der Fehler: die
 * Datei rief die Zähler, nur eben in der anderen Leiste.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { elementKinds } from '@/model/types';
import { isIconName } from '@/assets/icons';
import {
  createElement,
  mindestBreite,
  mindestHoehe,
  minimizeElement,
  normalizeElement,
  standardIcon,
} from '@/model/factory';

const ROOT = join(process.cwd(), 'src', 'components');

/** Die Rechnungen, die an der Laufzeit hängen und nicht am Modell. */
const RECHNET = /\b(overflowOf|flussUeberlauf|unterDerFolienkante|unsichtbareFlaeche)\(/;

/**
 * Die Zähler, an denen sie hängen.
 *
 * Alle vier für jede Rechnung — und nicht je Rechnung einzeln aufgeschlüsselt.
 * Der Unterschied wäre eine Tabelle „welche Rechnung liest welchen Wert", also
 * eine zweite Wahrheit über Funktionen, die andernorts stehen; sie liefe
 * auseinander, sobald eine davon eine Zeile mehr rechnet. Vier Haken kosten
 * nichts, eine falsche Tabelle kostet einen stillen Fehler.
 */
const ZAEHLER = [
  'useFontsVersion(',
  'useThemeVersion(',
  'useImageSizes(',
  'useFolienformatVersion(',
];

/** Kommentare leeren, Zeilen stehen lassen — dieselbe Falle wie nebenan. */
function leereKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

function quellen(dir: string): string[] {
  return readdirSync(dir).flatMap((eintrag) => {
    const pfad = join(dir, eintrag);
    if (statSync(pfad).isDirectory()) return quellen(pfad);
    return /\.tsx?$/.test(pfad) && !/\.test\.tsx?$/.test(pfad) ? [pfad] : [];
  });
}

/**
 * Den Quelltext in Komponenten zerlegen.
 *
 * Geschnitten wird an `function Name(` in Spalte null — das ist in diesem
 * Projekt die Schreibweise jeder Komponente, und mehr Genauigkeit brauchte
 * eine Klammerzählung, die an einer Zeichenkette mit `}` scheitert.
 */
function komponenten(quelle: string): Array<{ name: string; rumpf: string }> {
  const zeilen = quelle.split('\n');
  const anfaenge: Array<{ name: string; zeile: number }> = [];
  zeilen.forEach((zeile, i) => {
    const treffer = /^(?:export )?function ([A-Za-z0-9_]+)\s*\(/.exec(zeile);
    if (treffer) anfaenge.push({ name: treffer[1], zeile: i });
  });

  return anfaenge.map(({ name, zeile }, i) => ({
    name,
    rumpf: zeilen.slice(zeile, anfaenge[i + 1]?.zeile ?? zeilen.length).join('\n'),
  }));
}

describe('wer rechnet, abonniert', () => {
  const dateien = quellen(ROOT).map((pfad) => ({
    pfad: pfad.slice(process.cwd().length + 1),
    quelle: leereKommentare(readFileSync(pfad, 'utf8')),
  }));

  it('findet überhaupt Stellen, die rechnen', () => {
    // Ohne das bestünde die Prüfung darunter auch für einen Ausdruck, der
    // nichts mehr trifft — der Wächter wäre grün und leer.
    const rechnende = dateien.flatMap(({ pfad, quelle }) =>
      komponenten(quelle)
        .filter((k) => RECHNET.test(k.rumpf))
        .map((k) => `${pfad}:${k.name}`),
    );
    expect(rechnende.length).toBeGreaterThanOrEqual(3);
  });

  it('ruft in jeder rechnenden Komponente alle vier Zähler', () => {
    for (const { pfad, quelle } of dateien) {
      for (const { name, rumpf } of komponenten(quelle)) {
        if (!RECHNET.test(rumpf)) continue;
        for (const zaehler of ZAEHLER) {
          const wie = rumpf.includes(zaehler) ? 'abonniert' : 'fehlt';
          expect(`${pfad}:${name} · ${zaehler} ${wie}`).toBe(
            `${pfad}:${name} · ${zaehler} abonniert`,
          );
        }
      }
    }
  });
});

/**
 * Die Grenzen der Zahlenfelder sind die des Lesers.
 *
 * Der Inspektor führte „Breite" mit `min={1}` und „Höhe" mit `min={0}`. Die
 * Breite stimmte; die Höhe nicht — `normalizeElement` hebt alles außer einem
 * Verbinder auf 1. Eine getippte 0 blieb damit im Modell stehen und kam beim
 * nächsten Öffnen als 1 zurück: weder behalten noch abgelehnt, sondern still
 * ersetzt. Genau dagegen ist die Kappung im Feld gebaut.
 *
 * ## Warum die Zahlen hier ausgeschrieben stehen
 *
 * Der erste Anlauf verglich `normalizeElement` mit `mindestHoehe()` — und
 * `normalizeElement` *ruft* `mindestHoehe()`. Die Gegenprobe „gib überall 0
 * zurück" kam damit grün durch: beide Seiten wanderten mit. Das ist die Falle
 * „eine Grundlage, die der Probeantwort gleicht, prüft nichts", eine Datei
 * weiter.
 *
 * Deshalb steht die Absicht hier als Zahl und wird zweimal gehalten: einmal
 * gegen die **gesicherte Datei** (was kommt wirklich zurück) und einmal gegen
 * die Funktion, die der Inspektor fragt. Erst dadurch wird eine Sabotage an
 * einer der beiden Seiten rot.
 */
const GRENZE: Record<string, number> = {
  // Ein Verbinder ist ein Strich: eine waagerechte Linie hat die Höhe null,
  // und das ist keine kaputte Angabe, sondern der Normalfall.
  connector: 0,
};
const HOEHE = (kind: string) => GRENZE[kind] ?? 1;
const BREITE = 1;

describe('die Mindestmaße', () => {
  const rundlauf = (element: ReturnType<typeof createElement>) =>
    normalizeElement(minimizeElement(element));

  it('sind die, die der Leser durchlässt', () => {
    for (const kind of elementKinds) {
      const auf = { ...createElement(kind, { x: 0, y: 0 }), w: BREITE, h: HOEHE(kind) };
      const zurueck = rundlauf(auf);
      expect(`${kind}: ${zurueck?.w} × ${zurueck?.h}`).toBe(`${kind}: ${BREITE} × ${HOEHE(kind)}`);
    }
  });

  it('und darunter kappt er — das ist die andere Hälfte', () => {
    // Ohne diese Richtung bestünde die Prüfung oben auch für eine Grenze, die
    // viel zu niedrig ist: behalten wird ja alles, was der Leser nicht anfasst.
    for (const kind of elementKinds) {
      const drunter = { ...createElement(kind, { x: 0, y: 0 }), w: BREITE - 1, h: HOEHE(kind) - 1 };
      const zurueck = rundlauf(drunter);
      expect(`${kind}: ${zurueck?.w} × ${zurueck?.h}`).toBe(`${kind}: ${BREITE} × ${HOEHE(kind)}`);
    }
  });

  it('und der Inspektor fragt nach genau denselben', () => {
    // Die zweite Hälfte: der Leser kann recht haben und das Feld trotzdem eine
    // andere Grenze anbieten — das war der Befund.
    expect(mindestBreite()).toBe(BREITE);
    for (const kind of elementKinds) {
      expect(`${kind}: ${mindestHoehe(kind)}`).toBe(`${kind}: ${HOEHE(kind)}`);
    }
  });
});

/**
 * Das Vorgabezeichen ist eines, das es gibt.
 *
 * Es stand an vier Stellen: dreimal in der Fabrik als `'square-check'` und
 * einmal im Inspektor als `icon ?? 'sparkle'` — und `sparkle` führt das
 * nozilla-Set überhaupt nicht. Erreichbar war der Zweig nicht; ein
 * Vorgabewert, der beim Hinsehen falsch ist, wird beim nächsten Umbau
 * trotzdem richtig eingebaut.
 */
describe('das Vorgabezeichen', () => {
  it('steht im Zeichensatz und ist das, was die Fabrik nimmt', () => {
    expect(isIconName(standardIcon())).toBe(true);
    expect(createElement('icon', { x: 0, y: 0 }).icon).toBe(standardIcon());
    expect(createElement('card', { x: 0, y: 0 }).icon).toBe(standardIcon());
  });
});
