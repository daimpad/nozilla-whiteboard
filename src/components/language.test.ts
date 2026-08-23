/**
 * Die Oberfläche spricht Deutsch.
 *
 * Sie tat es lange halb: von 154 sichtbaren Zeichenketten waren 46 englisch und
 * 22 deutsch, gemischt im selben Feld — „Search elements" über „Überschrift 1",
 * und einmal sogar beides in einem Satz („Use the Papier tone"). Das ist kein
 * Schönheitsfehler, sondern liest sich wie ein halb fertiger Umbau.
 *
 * Ein Test hält das, was eine Absichtserklärung nicht hält. Geprüft werden die
 * Zeichenketten, die tatsächlich vor Augen kommen: Beschriftungen, Titel,
 * Platzhalter, Hinweise.
 *
 * ## Was ausdrücklich erlaubt bleibt
 *
 * Fachwörter, die auch auf Deutsch so heißen — Markdown, Label, Layout, Badge,
 * Export, Deck, Icon. Sie zu übersetzen machte die Oberfläche nicht deutscher,
 * nur fremder. Und die Schlüssel des Dateiformats: `layout: canvas` steht so in
 * der `.md`, übersetzt wird nur, was daneben angezeigt wird.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src', 'components');

/**
 * Zwei Siebe, weil es zwei Fälle gibt.
 *
 * **Funktionswörter** verraten einen englischen *Satz*: „the", „with", „your"
 * kommen in deutschen Sätzen nicht vor. Ein Treffer genügt.
 *
 * **Substantive** verraten eine englische *Beschriftung*: „Overview", „Tone",
 * „Width" stehen allein in einem Feld. Hier genügt ein Treffer gerade nicht —
 * „Ein Pfad relativ zum Deck" ist deutsch, obwohl „Deck" darin steht. Erst
 * wenn die ganze Zeichenkette aus solchen Wörtern besteht, ist sie englisch.
 */
const FUNKTIONSWORT =
  /\b(the|and|with|your|you|this|that|these|those|from|into|when|where|which|while|are|is|would|should|click|search|show|hide|add|save|open|close|delete|move|bring|send|align|distribute|inherits|rendered|shown|only|every|whole|current|single|previous|next|exit|pick|place|appears|advance)\b/i;

const SUBSTANTIV = new Set(
  [
    'overview',
    'tone',
    'width',
    'height',
    'opacity',
    'padding',
    'source',
    'variant',
    'background',
    'transition',
    'author',
    'footer',
    'notes',
    'step',
    'style',
    'fill',
    'shape',
    'frame',
    'slide',
    'slides',
    'alt',
    'reveal',
    'weight',
    'line',
    'body',
  ].map((word) => word.toLowerCase()),
);

/**
 * Fachwörter und Namen, die stehen bleiben. Eine Zeichenkette, die nur aus
 * diesen besteht, ist kein englischer Satz.
 */
const ERLAUBT = new Set(
  [
    'markdown',
    'text',
    'label',
    'labels',
    'layout',
    'badge',
    'export',
    'deck',
    'icon',
    'icons',
    'element',
    'lead',
    'headline',
    'prompt',
    'canvas',
    'svg',
    'pdf',
    'powerpoint',
    'pptx',
    'md',
    'chevron',
    'banner',
    'code',
    'nozilla',
    'ci',
    'esc',
    'system',
  ].map((word) => word.toLowerCase()),
);

function quellen(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return quellen(path);
    return /\.tsx?$/.test(path) && !path.endsWith('.test.ts') ? [path] : [];
  });
}

/** Kommentare heraus — der Code ist auf Deutsch kommentiert, das zählt nicht. */
function ohneKommentare(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Was der Mensch sieht: Werte von `label`, `title`, `placeholder`,
 * `aria-label`, `hint` — und Textknoten im Markup.
 */
function sichtbareTexte(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(
    /(?:label|title|placeholder|aria-label|hint)=(?:"([^"]{2,})"|\{'([^']{2,})'\})/g,
  )) {
    out.push(match[1] ?? match[2]);
  }
  // Textknoten: eine Zeile zwischen > und < ohne Klammern und ohne Code.
  for (const match of source.matchAll(/>\s*([A-Za-zÄÖÜäöü][^<>{}\n]{3,80})\s*</g)) {
    out.push(match[1]);
  }
  return out.map((text) => text.trim()).filter(Boolean);
}

function istEnglisch(text: string): boolean {
  // Zeichenketten mit Umlauten oder ß sind deutsch, fertig.
  if (/[äöüßÄÖÜ]/.test(text)) return false;
  const woerter = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (woerter.length === 0) return false;
  if (woerter.every((word) => ERLAUBT.has(word))) return false;
  if (FUNKTIONSWORT.test(text)) return true;
  // Eine Beschriftung ganz aus englischen Substantiven — „Line weight", „Alt
  // text". Fachwörter dürfen dabeistehen, sie entscheiden nichts.
  return woerter.every((word) => SUBSTANTIV.has(word) || ERLAUBT.has(word));
}

describe('die Oberfläche spricht Deutsch', () => {
  it('trägt keine englischen Beschriftungen', () => {
    const treffer: string[] = [];
    for (const file of quellen(ROOT)) {
      const name = file.split('/').pop() ?? '';
      for (const text of sichtbareTexte(ohneKommentare(readFileSync(file, 'utf8')))) {
        if (istEnglisch(text)) treffer.push(`${name}: ${text}`);
      }
    }
    expect(treffer).toEqual([]);
  });

  it('erkennt einen englischen Satz, wenn einer käme', () => {
    // Der Test über dem Test: ein Sieb, das nichts fängt, ist grün und nutzlos.
    expect(istEnglisch('Click to place at the centre of the slide.')).toBe(true);
    expect(istEnglisch('Hide footer and slide number')).toBe(true);
    expect(istEnglisch('Fußzeile und Foliennummer ausblenden')).toBe(false);
    expect(istEnglisch('Overview')).toBe(true);
    expect(istEnglisch('Line weight')).toBe(true);
    expect(istEnglisch('Markdown')).toBe(false);
    expect(istEnglisch('Prompt')).toBe(false);
    // Deutsche Sätze, in denen ein Fachwort steckt, bleiben deutsch.
    expect(istEnglisch('Ein Pfad relativ zum Deck oder eine data-URI.')).toBe(false);
    expect(istEnglisch('SVG — ganzes Deck')).toBe(false);
    // „was" und „will" sind deutsche Wörter — das Sieb darf nicht darauf
    // hereinfallen.
    expect(istEnglisch('Was soll passieren, wenn das Deck durch ist?')).toBe(false);
    expect(istEnglisch('Text')).toBe(false);
  });
});
