import { describe, it } from 'vitest';
import { parseDeck, serializeDeck, parseSlide, serializeSlide, splitFrontmatter } from './deck';
import { lexMarkdown } from './render';
import { createEmptySlide } from './deck';
import type { Deck } from '@/model/types';

const folie = (markdown: string, meta: Partial<Deck['slides'][0]['meta']> = {}) =>
  createEmptySlide({ markdown, meta: { layout: 'default', transition: 'fade', background: 'paper', ...meta } });

describe('gegenprobe', () => {
  it('B1 Querstrich im Fliesstext', () => {
    const deck: Deck = {
      meta: { title: 'Probe' },
      slides: [
        folie('# A\n\nOben\n\n---\n\nUnten', { background: 'ink', notes: 'Notiz zu A' }),
        folie('# B', { background: 'signal', notes: 'Notiz zu B' }),
      ],
    };
    const md = serializeDeck(deck);
    const zurueck = parseDeck(md);
    console.log('B1 serialisiert =', JSON.stringify(md));
    console.log('B1 vorher =', deck.slides.length, 'nachher =', zurueck.slides.length);
    console.log(
      'B1 nachher =',
      zurueck.slides.map((s) => ({ md: s.markdown, bg: s.meta.background, notes: s.meta.notes })),
    );
  });

  it('B1b Querstrich mit *** statt ---', () => {
    const deck: Deck = {
      meta: { title: 'Probe' },
      slides: [folie('# A\n\nOben\n\n***\n\nUnten', { background: 'ink' }), folie('# B')],
    };
    const zurueck = parseDeck(serializeDeck(deck));
    console.log('B1b Folien =', zurueck.slides.length, zurueck.slides.map((s) => s.markdown));
    console.log('B1b Token =', lexMarkdown('# A\n\nOben\n\n***\n\nUnten').map((t) => t.type));
  });

  it('B2 nzl im Codezaun', () => {
    const md =
      '# So sieht das Dateiformat aus\n\n```markdown\n<!-- nzl\nlayout: title\nbackground: ink\n-->\n```\n\nEnde.';
    const s = parseSlide(md);
    console.log('B2 markdown nachher =', JSON.stringify(s.markdown));
    console.log('B2 meta nachher =', JSON.stringify(s.meta));
  });

  it('B2b nzl im Codezaun, unlesbar', () => {
    const md =
      '# Format\n\n```markdown\n<!-- nzl\nnotes: Ein Doppelpunkt: mitten im Text\n-->\n```\n\nEnde.';
    const s1 = parseSlide(md);
    console.log('B2b runde1 meta =', JSON.stringify(s1.meta));
    const g1 = serializeSlide(s1);
    console.log('B2b runde1 gesichert =', JSON.stringify(g1));
    const s2 = parseSlide(g1);
    console.log('B2b runde2 markdown =', JSON.stringify(s2.markdown));
  });

  it('B3 Deck ohne Frontmatter, erste Folie beginnt mit ---', () => {
    const deck: Deck = {
      meta: { title: 'Untitled deck' },
      slides: [folie('---\n\n# Eins\n\nInhalt der ersten Folie.'), folie('# Zwei')],
    };
    const md = serializeDeck(deck);
    console.log('B3 gesichert =', JSON.stringify(md));
    const sf = splitFrontmatter(md);
    console.log('B3 frontmatter =', JSON.stringify(sf.frontmatter));
    const zurueck = parseDeck(md);
    console.log('B3 Folien vorher = 2 | nachher =', zurueck.slides.length);
    console.log('B3 markdowns nachher =', JSON.stringify(zurueck.slides.map((s) => s.markdown)));
    console.log('B3 meta nachher =', JSON.stringify(zurueck.meta));
  });

  it('B3b dasselbe mit Titel im Frontmatter', () => {
    const deck: Deck = {
      meta: { title: 'Mein Deck' },
      slides: [folie('---\n\n# Eins\n\nInhalt der ersten Folie.'), folie('# Zwei')],
    };
    const md = serializeDeck(deck);
    console.log('B3b gesichert =', JSON.stringify(md));
    const zurueck = parseDeck(md);
    console.log('B3b Folien =', zurueck.slides.length, JSON.stringify(zurueck.slides.map((s) => s.markdown)));
  });

  it('B4 eingerueckter Codeblock', () => {
    const vorher = '    npm run build\n    npm run test\n\nDanach ist alles grün.';
    const s = folie(vorher);
    const nachher = serializeSlide(s);
    console.log('B4 vorher  =', JSON.stringify(vorher), lexMarkdown(vorher).map((t) => t.type));
    console.log('B4 nachher =', JSON.stringify(nachher), lexMarkdown(nachher).map((t) => t.type));
    // und der Weg beim Einlesen
    const wieder = parseSlide(nachher);
    console.log('B4 reparse =', JSON.stringify(wieder.markdown));
    // Gegenprobe: mit Metablock davor
    const s2 = folie(vorher, { background: 'ink' });
    console.log('B4 mit Metablock =', JSON.stringify(serializeSlide(s2)));
  });

  it('B5 doppelte Kennung bei unbekannter Art', () => {
    const chunk = `<!-- nzl
elements:
  - id: dup-1
    kind: heading
    x: 10
    y: 10
    w: 100
    h: 50
  - id: dup-1
    kind: heading
    x: 200
    y: 10
    w: 100
    h: 50
  - id: dup-2
    kind: text
    x: 10
    y: 200
    w: 100
    h: 50
    text: A
  - id: dup-2
    kind: text
    x: 200
    y: 200
    w: 100
    h: 50
    text: B
-->

# Folie`;
    const s = parseSlide(chunk);
    console.log('B5 Ids im Modell =', JSON.stringify(s.elements.map((e) => e.id)));
    const gesichert = serializeSlide(s);
    console.log('B5 gesicherte Kennungen =', JSON.stringify(gesichert.match(/id: \S+/g)));
    const s2 = parseSlide(gesichert);
    console.log('B5 Ids nach Sichern+Lesen =', JSON.stringify(s2.elements.map((e) => e.id)));
    console.log(
      'B5 eindeutig im Modell? =',
      new Set(s2.elements.map((e) => e.id)).size === s2.elements.length,
    );
    const s3 = parseSlide(serializeSlide(s2));
    console.log('B5 dritte Runde eindeutig? =', new Set(s3.elements.map((e) => e.id)).size === s3.elements.length);
  });
});
