/**
 * Die Schriften, die in diesem Werkzeug als Dateien vorliegen.
 *
 * Zwei Quellen, ein Verzeichnis: die drei Familien der nozilla-CI kommen über
 * `npm run sync:ci`, die übrigen zwanzig über `scripts/schriftbibliothek.mjs`
 * aus Google Fonts. Beide liegen unter `public/fonts/` als TTF (für PDF und
 * PNG) und WOFF2 (für den Bildschirm), und beide sind hier zusammen als eine
 * Liste zu haben — wer eine Familie wählt, soll nicht wissen müssen, woher sie
 * kam.
 *
 * Eine Familie aus dieser Liste ist eine, die **überall** gleich aussieht: auf
 * der Fläche, im PDF, im PNG und auf jedem Rechner, auf dem das Werkzeug läuft.
 * Eine Schrift, die hier nicht steht, fällt im Export auf die Ersatzschrift
 * zurück, und der Bildschirm zeigt dabei, was der Browser gerade findet.
 */
import { nozillaTheme } from '@/theme/brandTheme';
import { bibliothek } from './schriftbibliothek.generated';

export type Schriftart = 'sans' | 'serif' | 'slab' | 'mono';

export interface Bibliotheksfamilie {
  familie: string;
  art: Schriftart;
  lizenz: string;
  schnitte: readonly { weight: number; file: string }[];
}

/*
   Die Art der drei CI-Familien. Sie steht nirgends sonst, und eine vierte
   Familie in der CI ohne Eintrag hier fällt in `schriftbibliothek.test.ts`
   auf — nicht erst dann, wenn jemand sie in der Auswahl vermisst.
*/
export const ciArten: Readonly<Record<string, Schriftart>> = {
  'Zilla Slab': 'slab',
  Inter: 'sans',
  'Space Mono': 'mono',
};

/**
 * Die Familien der nozilla-CI, abgelesen und nicht abgeschrieben.
 *
 * Gelesen wird `nozillaTheme` und nicht die lebendige Bindung: gefragt ist,
 * welche Dateien *physisch* unter `public/fonts/` liegen, und das hängt nicht
 * davon ab, welche Marke gerade gilt.
 */
function ciFamilien(): Bibliotheksfamilie[] {
  const nachFamilie = new Map<string, { weight: number; file: string }[]>();
  for (const face of nozillaTheme.webfont.faces) {
    if (face.style !== 'normal') continue;
    const liste = nachFamilie.get(face.family) ?? [];
    liste.push({ weight: face.weight, file: face.file });
    nachFamilie.set(face.family, liste);
  }
  return [...nachFamilie].map(([familie, schnitte]) => ({
    familie,
    art: ciArten[familie] ?? 'sans',
    lizenz: 'OFL-1.1',
    schnitte,
  }));
}

/** Alle Familien, die als Dateien vorliegen — die der CI zuerst. */
export function schriftbibliothek(): readonly Bibliotheksfamilie[] {
  return [...ciFamilien(), ...bibliothek];
}

/** Eine Familie beim Namen, buchstabengleich wie `resolveFace()` vergleicht. */
export function bibliotheksfamilie(name: string): Bibliotheksfamilie | undefined {
  return schriftbibliothek().find((eintrag) => eintrag.familie === name);
}
