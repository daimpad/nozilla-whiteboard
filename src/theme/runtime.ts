/**
 * Welches Erscheinungsbild gerade gilt.
 *
 * Bis hierher war die CI eine Konstante: `import { palette } from '@theme'`
 * band den Wert beim Übersetzen ein. Ab hier ist sie eine Belegung, die sich
 * im laufenden Werkzeug wechseln lässt.
 *
 * ## Warum `export let` und keine Funktion
 *
 * Die Werte werden an rund neunzig Stellen gelesen — `palette.signal`,
 * `ci.ink`, `typeScale.h1`. Aus jeder davon `theme().palette.signal` zu
 * machen, hieße neunzig Stellen anzufassen für einen Gewinn, den ES-Module
 * ohnehin liefern: **eine exportierte Bindung ist lebendig.** Wird sie hier
 * neu gesetzt, sehen alle Importeure den neuen Wert, ohne dass sie etwas davon
 * wissen müssen.
 *
 * Der Preis ist eine Regel, die man kennen muss: **nichts darf den Wert beim
 * Laden abgreifen.** Ein `const PAPER = { ink: ci.ink }` auf Modulebene friert
 * die Farbe des Erscheinungsbilds ein, das beim Start zufällig galt. Vier
 * solche Stellen gab es, sie sind jetzt Funktionen. Wer eine neue anlegt,
 * merkt es nicht — deshalb prüft `runtime.test.ts` das Ergebnis eines
 * Wechsels und nicht die Mechanik.
 *
 * ## Was der Wechsel nicht ändert
 *
 * Die Werkzeug-Oberfläche. Sie ist absichtlich neutral und für jeden Kunden
 * dieselbe; ein cremefarbener Editor um eine cremefarbene Folie macht beides
 * unlesbar, und ein kundenbunter erst recht. `ui`, `uiRadius`, `uiShadow` und
 * die Tailwind-Klassen daraus bleiben, wo sie sind.
 */
import { nozillaTheme, tonesOutsidePalette, type BrandTheme, type ToneRole } from './brandTheme';

/* -------------------------------------------------------------------------- */
/* Das Verzeichnis                                                             */
/* -------------------------------------------------------------------------- */

const registry = new Map<string, BrandTheme>([[nozillaTheme.id, nozillaTheme]]);
let current: BrandTheme = nozillaTheme;

/**
 * Ein Erscheinungsbild anmelden. Ein bekannter Schlüssel wird ersetzt.
 *
 * Wirft, wenn die Farbrollen die eigene Palette verlassen. Das ist streng,
 * aber der Fehler ist sonst unsichtbar: Untergrund und Fließtext folgen dem
 * neuen Erscheinungsbild, die Karten tragen das alte. Wer das wirklich will,
 * nimmt die Farbe in die Palette auf — dann steht sie da, wo man sie sucht.
 */
export function registerTheme(theme: BrandTheme): void {
  const strays = tonesOutsidePalette(theme);
  if (strays.length > 0) {
    throw new Error(
      `Erscheinungsbild „${theme.id}": ${strays.length} Farbrolle(n) außerhalb der eigenen Palette — ` +
        strays.join(', '),
    );
  }
  registry.set(theme.id, theme);
  // Wer das gerade Sichtbare neu anmeldet, will es sehen.
  if (theme.id === current.id) activate(theme);
}

export function availableThemes(): Array<{ id: string; label: string }> {
  return [...registry.values()].map(({ id, label }) => ({ id, label }));
}

export function activeTheme(): BrandTheme {
  return current;
}

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && registry.has(value);
}

/**
 * Umschalten. Ein unbekannter Schlüssel ändert nichts und meldet es —
 * lautlos auf die Voreinstellung zu fallen, hieße ein Deck im falschen
 * Erscheinungsbild zu zeigen, ohne dass es jemand merkt.
 */
export function setActiveTheme(id: string): boolean {
  const next = registry.get(id);
  if (!next) return false;
  if (next.id === current.id) return true;
  activate(next);
  return true;
}

function activate(theme: BrandTheme): void {
  current = theme;
  brand = theme.brand;
  palette = theme.palette;
  inkAlpha = theme.inkAlpha;
  paperAlpha = theme.paperAlpha;
  color = theme.color;
  elementTones = theme.elementTones;
  toneNames = Object.keys(theme.elementTones) as ToneRole[];
  textScale = theme.textScale;
  typeScale = theme.typeScale;
  fontFamily = theme.fontFamily;
  webfont = theme.webfont;
  pdfFontFamily = theme.pdfFontFamily;
  stroke = theme.stroke;
  shadowOffset = theme.shadowOffset;
  announce();
}

/* -------------------------------------------------------------------------- */
/* Die lebendigen Bindungen                                                    */
/* -------------------------------------------------------------------------- */

export let brand = current.brand;
export let palette = current.palette;
export let inkAlpha = current.inkAlpha;
export let paperAlpha = current.paperAlpha;
export let color = current.color;
export let elementTones = current.elementTones;
export let toneNames = Object.keys(current.elementTones) as ToneRole[];
export let textScale = current.textScale;
export let typeScale = current.typeScale;
export let fontFamily = current.fontFamily;
export let webfont = current.webfont;
export let pdfFontFamily = current.pdfFontFamily;
export let stroke = current.stroke;
export let shadowOffset = current.shadowOffset;

/* -------------------------------------------------------------------------- */
/* Das Signal für die Oberfläche                                               */
/* -------------------------------------------------------------------------- */

/**
 * Ein Zähler, keine Marke: `useSyncExternalStore` zeichnet nur neu, wenn sich
 * der Schnappschuss ändert, und zwischen zwei Erscheinungsbildern wird
 * mehrfach hin und her gewechselt.
 */
let version = 0;
const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function themeVersion(): number {
  return version;
}

function announce(): void {
  version += 1;
  for (const listener of listeners) listener();
}
