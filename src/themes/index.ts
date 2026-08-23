/**
 * Hier kommen die Erscheinungsbilder der Kunden an.
 *
 * Die nozilla-CI ist schon angemeldet — sie steht in `theme.config.ts`, weil
 * `tailwind.config.ts` sie zur Bauzeit liest. Alles Weitere gehört hierher:
 * eine Datei je Kunde, ein Aufruf in `registerThemes()`.
 *
 * ## Ein Erscheinungsbild anlegen
 *
 * ```ts
 * // src/themes/musterkunde.ts
 * import { nozillaTheme, tonesFromPalette, type BrandTheme } from '@/theme';
 *
 * const palette = {
 *   ...nozillaTheme.palette,
 *   signal: '#E4003A',
 *   signalSoft: '#FFD6DE',
 *   signalDeep: '#A30029',
 *   paper: '#FFFFFF',
 *   paperAlt: '#F4F4F4',
 *   paperDeep: '#F4F4F4',
 *   ink: '#111111',
 * };
 * const inkAlpha = { 70: 'rgba(17,17,17,.72)', 50: 'rgba(17,17,17,.5)', 20: 'rgba(17,17,17,.18)' };
 * const paperAlpha = { 70: 'rgba(255,255,255,.64)', 50: 'rgba(255,255,255,.4)', 20: 'rgba(255,255,255,.18)' };
 *
 * export const musterkunde: BrandTheme = {
 *   ...nozillaTheme,
 *   id: 'musterkunde',
 *   label: 'Musterkunde',
 *   brand: { ...nozillaTheme.brand, name: 'Musterkunde', motto: 'Ihr Satz hier.' },
 *   palette,
 *   inkAlpha,
 *   paperAlpha,
 *   color: { ...nozillaTheme.color, signal: palette.signal, surface: palette.paper, ink: palette.ink, line: palette.ink },
 *   elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),
 * };
 * ```
 *
 * Drei Dinge, die dabei zählen:
 *
 * 1. **Die Töne aus der eigenen Palette mischen.** `tonesFromPalette()` tut
 *    das. Wer sie von Hand schreibt und eine Farbe vergisst, bekommt eine
 *    Folie, die fast stimmt — `registerTheme()` weist das ab und sagt, welche
 *    Rolle daneben liegt.
 * 2. **Schriften mitliefern.** Eigene Schnitte gehören nach `public/fonts/`
 *    und in `webfont.faces`; `fontFamily` nennt die Stapel. Ohne das setzt der
 *    Setzer weiter in Zilla Slab und Inter.
 * 3. **Die Wortmarke ist Geometrie**, kein Bild — sie kommt aus
 *    `wordmark.generated.ts` und ist noch nicht je Erscheinungsbild
 *    umschaltbar. Bis dahin trägt jedes Deck die nozilla-Wortmarke, wenn ein
 *    Wortmarken-Element darauf liegt.
 */
import { registerTheme, type BrandTheme } from '@/theme';

/** Ein Eintrag je Kunde. Die Reihenfolge ist die der Auswahl im Inspektor. */
const clientThemes: BrandTheme[] = [
  // musterkunde,
];

/** Beim Start einmal aufrufen, bevor ein Deck sein Erscheinungsbild verlangt. */
export function registerThemes(): void {
  for (const theme of clientThemes) registerTheme(theme);
}
