/**
 * Hier kommen die Erscheinungsbilder der Kunden an.
 *
 * Die nozilla-CI ist schon angemeldet — sie steht in `theme.config.ts`, weil
 * `tailwind.config.ts` sie zur Bauzeit liest. Alles Weitere gehört hierher:
 * eine Datei je Kunde, ein Aufruf in `registerThemes()`.
 *
 * `musterkunde.ts` liegt schon hier und belegt jede wechselbare Rolle einmal —
 * Farben, Wortmarke, Icons, Schriften. Der schnellste Weg zu einem echten
 * Kunden ist, die Datei zu kopieren und die Werte zu ersetzen. Was unten steht,
 * ist dieselbe Sache in kurz.
 *
 * ## Ein Erscheinungsbild anlegen
 *
 * ```ts
 * // src/themes/musterkunde.ts
 * import {
 *   colorsFromPalette, nozillaTheme, tonesFromPalette, wordmarkFromSvg, type BrandTheme,
 * } from '@/theme';
 * import logo from './musterkunde-logo.svg?raw';
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
 *   color: colorsFromPalette(palette, inkAlpha),
 *   elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),
 *   wordmark: wordmarkFromSvg(logo, { letters: '#111111', accent: '#E4003A' }),
 * };
 * ```
 *
 * Vier Dinge, die dabei zählen:
 *
 * 1. **Farben einmal nennen.** `tonesFromPalette()` und `colorsFromPalette()`
 *    mischen die drei Tonrollen und die fünfundzwanzig semantischen Tokens
 *    daraus. Wer sie von Hand schreibt und eine vergisst, bekommt eine Folie,
 *    die fast stimmt — `registerTheme()` weist das ab und sagt, welche Rolle
 *    daneben liegt.
 * 2. **Schriften mitliefern.** Eigene Schnitte gehören nach `public/fonts/`
 *    und in `webfont.faces`; `fontFamily` nennt die Stapel. Ohne das setzt der
 *    Setzer weiter in Zilla Slab und Inter.
 * 3. **Die Wortmarke ist Geometrie**, kein Bild. `wordmarkFromSvg()` liest sie
 *    aus einer SVG-Datei; die Zuordnung geht über die Füllfarben, nicht über
 *    die Reihenfolge der Pfade. Eine Marke ohne Akzent am Wortende lässt
 *    `accent` weg — dann wird auch keiner gezeichnet.
 *
 *    Sie ist Pflicht und hat keine Voreinstellung. Fehlte sie, trüge ein
 *    Kundendeck die Marke von nozilla, und das wäre der auffälligste Fehler,
 *    den dieses Werkzeug machen kann.
 * 4. **Das Icon-Set ist wechselbar, aber nicht Pflicht.** Ohne Angabe zeichnet
 *    ein Erscheinungsbild aus den 554 nozilla-Zeichen. Das ist Absicht: ein
 *    Pfeil gehört keiner Marke, und eine leere Bibliothek wäre die schlechtere
 *    Lage. Mitgeliefert wird dabei die 6 × 6 große Signatur unten rechts — eine
 *    Erfindung des nozilla-Sets, die aber die Signalfarbe des gewählten
 *    Erscheinungsbilds annimmt. Wer sie nicht will, bringt ein eigenes Set mit.
 *
 * ## Ein eigenes Icon-Set
 *
 * Ein Set *ersetzt*, es ergänzt nicht. Ein Zeichen ist Geometrie im Dialekt des
 * Werkzeugs — 64 × 64, 4 px, square caps, miter joins — und keine Datei:
 *
 * ```ts
 * icons: {
 *   categories: ['marke', 'produkt'],
 *   icons: {
 *     siegel: {
 *       label: 'Siegel',
 *       meaning: 'Zertifikat, geprüft',
 *       category: 'marke',
 *       prims: [
 *         { t: 'circle', cx: 32, cy: 28, r: 18 },
 *         { t: 'path', d: 'M24 44 L20 58 L32 52 L44 58 L40 44' },
 *       ],
 *     },
 *   },
 * },
 * ```
 *
 * Die Farbrollen eines Primitivs sind `ink` (Vorgabe) und die drei Stufen der
 * Signalrampe; ein Hex-Wert ist an dieser Stelle ein CI-Bruch — er entkäme dem
 * Erscheinungsbild.
 *
 * Wer die nozilla-Zeichen behalten und eigene dazulegen will, schreibt das hin:
 *
 * ```ts
 * import { nozillaIcons } from '@/theme';
 *
 * icons: {
 *   categories: [...nozillaIcons.categories, 'marke'],
 *   icons: { ...nozillaIcons.icons, siegel: { ... } },
 * },
 * ```
 *
 * Stilles Zusammenlegen wäre bequemer und falsch: ein Kundendeck böte dann 554
 * fremde Zeichen an, ohne dass jemand das entschieden hat.
 */
import { registerTheme, type BrandTheme } from '@/theme';
import { musterkunde } from './musterkunde';

/** Ein Eintrag je Kunde. Die Reihenfolge ist die der Auswahl im Inspektor. */
const clientThemes: BrandTheme[] = [musterkunde];

/** Beim Start einmal aufrufen, bevor ein Deck sein Erscheinungsbild verlangt. */
export function registerThemes(): void {
  for (const theme of clientThemes) registerTheme(theme);
}
