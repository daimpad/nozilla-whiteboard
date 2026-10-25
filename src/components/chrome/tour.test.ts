/**
 * Jeder Schritt der Tour hat genau einen Bereich, auf den er zeigt.
 *
 * Die Tour findet ihre Ziele zur Laufzeit über `data-tour`, und das hat eine
 * Kehrseite: benennt jemand einen Bereich um oder baut eine Leiste neu, zeigt
 * der Schritt auf nichts — und das sähe man erst, wenn man die Tour bis
 * dorthin durchklickt. Der Rauchtest tut das; diese Prüfung sagt es schon,
 * bevor gebaut wird, und sie sagt auch die Gegenrichtung: ein Anker, den kein
 * Schritt mehr nennt, ist ein Versprechen an niemanden.
 *
 * Gelesen wird der Quelltext mit **geleerten** Kommentaren — ein Anker, der
 * nur noch in einem Satz darüber steht, ist keiner. Die Lehre steht in
 * `replaceGuard.test.ts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { merkeTourGesehen, tourGesehen } from '@/state/workspace';
import { tourSchritte } from './Tour';

const ROOT = join(process.cwd(), 'src', 'components');

function quellen(ordner: string): string[] {
  return readdirSync(ordner).flatMap((name) => {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) return quellen(pfad);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [pfad] : [];
  });
}

/** Kommentare durch Leerraum ersetzen; die Länge bleibt, der Inhalt nicht. */
const ohneKommentare = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (treffer) => treffer.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_: string, davor: string) => davor);

/** Jeder gesetzte Anker samt der Datei, in der er steht. */
function anker(): Map<string, string[]> {
  const gefunden = new Map<string, string[]>();
  for (const pfad of quellen(ROOT)) {
    const text = ohneKommentare(readFileSync(pfad, 'utf8'));
    // Ein Name aus Kleinbuchstaben: so steht ein Anker als Attribut da. Der
    // Selektor in `Tour.tsx`, der ihn sucht, setzt keinen.
    for (const [, name] of text.matchAll(/data-tour="([a-zäöü-]+)"/g)) {
      gefunden.set(name!, [...(gefunden.get(name!) ?? []), pfad]);
    }
  }
  return gefunden;
}

describe('die geführte Tour', () => {
  const gesetzt = anker();
  const genannt = tourSchritte.flatMap((schritt) => (schritt.ziel ? [schritt.ziel] : []));

  it('zeigt mit jedem Schritt auf genau einen Bereich', () => {
    for (const ziel of genannt) {
      expect(gesetzt.get(ziel)?.length ?? 0, `„${ziel}"`).toBe(1);
    }
  });

  it('setzt keinen Anker, den kein Schritt nennt', () => {
    expect([...gesetzt.keys()].filter((name) => !genannt.includes(name))).toEqual([]);
  });

  it('nennt jeden Bereich nur einmal', () => {
    expect(new Set(genannt).size).toBe(genannt.length);
  });

  it('fängt mit einem Gruß an und hört mit einem Abschied auf', () => {
    // Beide ohne Ziel: der erste sagt, was kommt, der letzte, wo es weitergeht.
    expect(tourSchritte[0]?.ziel).toBeNull();
    expect(tourSchritte[tourSchritte.length - 1]?.ziel).toBeNull();
  });
});

describe('das Angebot der Tour', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('gilt dem ersten Besuch und danach nicht mehr', () => {
    localStorage.clear();
    expect(tourGesehen()).toBe(false);
    merkeTourGesehen();
    expect(tourGesehen()).toBe(true);
  });

  it('zählt einen gesperrten Speicher als gesehen', () => {
    /*
       Sonst stünde das Angebot bei jedem Start wieder da, und kein „Später"
       hielte je — eine Frage, die man nur wegklicken kann, liest beim dritten
       Mal niemand mehr.
    */
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('gesperrt');
    });
    expect(tourGesehen()).toBe(true);
  });
});
