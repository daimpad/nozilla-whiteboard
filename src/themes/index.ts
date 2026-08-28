/**
 * Hier kommen die eigenen Erscheinungsbilder an.
 *
 * Die nozilla-CI ist schon angemeldet — sie steht in `theme.config.ts`, weil
 * `tailwind.config.ts` sie zur Bauzeit liest. Alles Weitere gehört hierher:
 * eine Datei je Erscheinungsbild, ein Aufruf in `registerThemes()`.
 *
 * `musterkunde.ts` liegt schon hier und belegt jede wechselbare Rolle einmal —
 * Farben, Wortmarke, Icons, Schriften. Der schnellste Weg zu einer echten
 * Marke ist, die Datei zu kopieren und die Werte zu ersetzen. Was unten steht,
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
 *   paper: '#FAF8F5',
 *   paperAlt: '#F1EDE8',
 *   paperDeep: '#E8E2DB',
 *   white: '#FFFFFF',
 *   ink: '#111111',
 * };
 * const inkAlpha = { 70: 'rgba(17,17,17,.72)', 50: 'rgba(17,17,17,.5)', 20: 'rgba(17,17,17,.18)' };
 * const paperAlpha = { 70: 'rgba(250,248,245,.64)', 50: 'rgba(250,248,245,.4)', 20: 'rgba(250,248,245,.18)' };
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
 *    mischen die vier Tonrollen und die fünfundzwanzig semantischen Tokens
 *    daraus. Wer sie von Hand schreibt und eine vergisst, bekommt eine Folie,
 *    die fast stimmt — `registerTheme()` weist das ab und sagt, welche Rolle
 *    daneben liegt.
 *
 *    **`paper` und `white` müssen zwei sein.** `paper` ist das *Papier* der
 *    Marke, `white` ihr reines Weiß; sie belegen je einen Untergrund („Creme"
 *    und „Weiß") und je eine Flächenrolle. Wer beiden `#FFFFFF` gibt, bekommt
 *    vier Menüeinträge, die dasselbe tun — nichts ist kaputt, nichts sagt
 *    etwas, die Wahl tut nur nichts. Genau das stand hier einmal als Beispiel,
 *    und der Musterkunde hatte es abgeschrieben. Führt eine CI wirklich nur
 *    einen hellen Ton, wird `brandTheme.test.ts` rot — das ist der Ort, an dem
 *    das eine Entscheidung wird und kein Versehen.
 *
 *    `paperAlpha` gehört dabei zum *Papier* und nicht zum Weiß: es malt den
 *    gedämpften Text auf einer Folie in Tinte.
 * 2. **Schriften mitliefern.** Eigene Schnitte gehören nach `public/fonts/`
 *    und in `webfont.faces`; `fontFamily` nennt die Stapel. Ohne das setzt der
 *    Setzer weiter in Zilla Slab und Inter.
 *
 *    **In jedem Stapel stehen die Geschwister-Schriften vor denen des
 *    Systems.** Keine Schrift führt jedes Zeichen — Space Mono kennt `⌘`,
 *    `⌫`, `⇧` und `⌥` nicht —, und der Export sucht ein fehlendes Zeichen in
 *    genau der Reihenfolge, die im Stapel steht. Nennt er keine zweite
 *    Marken-Schrift, fällt das Zeichen aus PNG und PDF heraus, während der
 *    Bildschirm es aus einer Systemschrift holt und richtig aussieht. Das ist
 *    kein erfundener Fall: er ist im nozilla-Erscheinungsbild passiert und
 *    stand in drei Ausgaben, bevor ihn jemand sah.
 * 3. **Die Wortmarke ist Geometrie**, kein Bild. `wordmarkFromSvg()` liest sie
 *    aus einer SVG-Datei; die Zuordnung geht über die Füllfarben, nicht über
 *    die Reihenfolge der Pfade. Eine Marke ohne Akzent am Wortende lässt
 *    `accent` weg — dann wird auch keiner gezeichnet.
 *
 *    Sie ist Pflicht und hat keine Voreinstellung. Fehlte sie, trüge ein Deck
 *    unter fremder Marke die von nozilla, und das wäre der auffälligste Fehler,
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
 * Stilles Zusammenlegen wäre bequemer und falsch: ein fremdes Deck böte dann 554
 * fremde Zeichen an, ohne dass jemand das entschieden hat.
 */
import { registerTheme, type BrandTheme } from '@/theme';
import { musterkunde } from './musterkunde';

/** Ein Eintrag je Marke. Die Reihenfolge ist die der Auswahl im Inspektor. */
const brandThemes: BrandTheme[] = [musterkunde];

/** Beim Start einmal aufrufen, bevor ein Deck sein Erscheinungsbild verlangt. */
export function registerThemes(): void {
  for (const theme of brandThemes) registerTheme(theme);
}
