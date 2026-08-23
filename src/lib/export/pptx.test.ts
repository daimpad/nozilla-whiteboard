// @vitest-environment node
/**
 * Der PowerPoint-Export, gegen das erzeugte Paket geprüft.
 *
 * Nicht gegen Zeichenketten im Erzeuger, sondern gegen die Datei: das ZIP wird
 * wieder aufgemacht, das XML geparst und auf die Zusagen abgeklopft, die
 * PowerPoint einfordert. Ein Test, der nur prüft, dass ein Erzeuger das
 * schreibt, was er schreibt, hätte keinen von den Fehlern gefunden, die beim
 * Bauen wirklich auftraten.
 *
 * Die Umgebung ist `node`, weil jsdoms `Blob` sich nicht auslesen lässt.
 */
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { palette } from '@/theme';
import { deckToPptx, EMU, SLIDE_CX, SLIDE_CY } from './pptx';
import { createZip, crc32, utf8 } from './zip';

/* -------------------------------------------------------------------------- */
/* Ein winziger ZIP-Leser — nur so viel, wie zum Prüfen nötig ist.             */
/* -------------------------------------------------------------------------- */

async function readZip(blob: Blob): Promise<Map<string, string>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const out = new Map<string, string>();

  // Vom Ende her: End-of-Central-Directory suchen.
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  expect(end, 'End-of-Central-Directory nicht gefunden').toBeGreaterThanOrEqual(0);

  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);

  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));

    expect(view.getUint32(localAt, true), `${name}: kein lokaler Header`).toBe(0x04034b50);
    const localName = view.getUint16(localAt + 26, true);
    const localExtra = view.getUint16(localAt + 28, true);
    const dataAt = localAt + 30 + localName + localExtra;
    const raw = bytes.subarray(dataAt, dataAt + compressed);

    const plain =
      method === 0
        ? raw
        : new Uint8Array(
            await new Response(
              new Blob([raw.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
            ).arrayBuffer(),
          );
    out.set(name, new TextDecoder().decode(plain));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return out;
}

const DECK = [
  '---',
  'title: Prüfdeck & <Sonderzeichen>',
  'footer: nozilla · Gute digitale Dienste.',
  '---',
  '',
  '<!-- nzl',
  'layout: title',
  'notes: Eine Notiz.',
  'elements:',
  '  - kind: card',
  '    x: 700',
  '    y: 140',
  '    w: 492',
  '    h: 190',
  '    variant: stat',
  '    label: Laufzeit',
  '    title: 38 %',
  '    body: weniger Wartungsaufwand.',
  '    tone: signal',
  '  - kind: badge',
  '    x: 88',
  '    y: 560',
  '    text: Ship it',
  '  - kind: icon',
  '    x: 300',
  '    y: 560',
  '    icon: rocket',
  '-->',
  '',
  '# Überschrift mit ==Marker==',
  '',
  'Fließtext mit **fett**, *kursiv* und `Code`.',
  '',
  '- Erster Punkt',
  '- Zweiter Punkt',
  '  - Verschachtelt',
  '',
  'Ein Absatz mit weichem',
  'Umbruch mitten drin.',
  '',
  '---',
  '',
  '## Zweite Folie',
  '',
  '| Was | Wert |',
  '| --- | --- |',
  '| Eins | 1 |',
  '| Zwei | 2 |',
].join('\n');

const deck = parseDeck(DECK);
const parts = await readZip(await deckToPptx(deck, { images: new Map() }));

describe('ZIP-Schreiber', () => {
  it('berechnet CRC-32 wie die Spezifikation', () => {
    // Der bekannte Prüfwert für "123456789".
    expect(crc32(utf8('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('schreibt ein Archiv, das sich wieder lesen lässt', async () => {
    const blob = await createZip([
      { name: 'a.txt', data: utf8('Hallo Ärger'.repeat(50)) },
      { name: 'b/leer.txt', data: new Uint8Array(0) },
      { name: 'c.bin', data: utf8('roh'), store: true },
    ]);
    const read = await readZip(blob);
    expect([...read.keys()]).toEqual(['a.txt', 'b/leer.txt', 'c.bin']);
    expect(read.get('a.txt')).toBe('Hallo Ärger'.repeat(50));
    expect(read.get('b/leer.txt')).toBe('');
    expect(read.get('c.bin')).toBe('roh');
  });

  it('kommt mit einem leeren Archiv zurecht', async () => {
    const blob = await createZip([]);
    expect(blob.size).toBe(22);
  });
});

describe('PPTX-Paket', () => {
  it('enthält alle Teile, die PowerPoint verlangt', () => {
    for (const name of [
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/core.xml',
      'docProps/app.xml',
      'ppt/presentation.xml',
      'ppt/_rels/presentation.xml.rels',
      'ppt/presProps.xml',
      'ppt/theme/theme1.xml',
      'ppt/slideMasters/slideMaster1.xml',
      'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      'ppt/slideLayouts/slideLayout1.xml',
      'ppt/notesMasters/notesMaster1.xml',
      'ppt/slides/slide1.xml',
      'ppt/slides/_rels/slide1.xml.rels',
      'ppt/slides/slide2.xml',
    ]) {
      expect(parts.has(name), name).toBe(true);
    }
  });

  it('meldet jeden Teil im Content-Types', () => {
    const types = parts.get('[Content_Types].xml')!;
    for (const name of parts.keys()) {
      // `.rels` und Bilder laufen über `Default Extension`, und das
      // Content-Types-Verzeichnis beschreibt sich nicht selbst.
      if (name === '[Content_Types].xml') continue;
      if (name.endsWith('.rels') || name.startsWith('ppt/media/')) continue;
      expect(types, name).toContain(`PartName="/${name}"`);
    }
  });

  it('löst jede Relationship-Id auf, die ein XML benutzt', () => {
    for (const [name, xml] of parts) {
      if (name.endsWith('.rels') || !name.endsWith('.xml')) continue;
      const used = [...xml.matchAll(/r:(?:id|embed)="([^"]+)"/g)].map((match) => match[1]);
      if (used.length === 0) continue;

      const relsName = name.replace(/([^/]+)$/, '_rels/$1.rels');
      const rels = parts.get(relsName);
      expect(rels, `${name} benutzt rIds, hat aber keine ${relsName}`).toBeTruthy();
      for (const id of used) {
        expect(rels, `${name}: ${id} nicht definiert`).toContain(`Id="${id}"`);
      }
    }
  });

  it('setzt die Folienfläche auf 16:9 in ganzen EMU', () => {
    const xml = parts.get('ppt/presentation.xml')!;
    expect(xml).toContain(`<p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/>`);
    expect(SLIDE_CX / EMU).toBe(1280);
    expect(SLIDE_CY / EMU).toBe(720);
    expect(SLIDE_CX / SLIDE_CY).toBeCloseTo(16 / 9, 6);
  });

  it('ist wohlgeformtes XML — in jedem Teil', () => {
    for (const [name, xml] of parts) {
      if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;
      const parsed = new JSDOM(xml, { contentType: 'application/xml' });
      expect(parsed.window.document.getElementsByTagName('parsererror'), name).toHaveLength(0);
    }
  });

  it('maskiert Sonderzeichen in den Metadaten', () => {
    expect(parts.get('docProps/core.xml')).toContain('Prüfdeck &amp; &lt;Sonderzeichen&gt;');
  });
});

describe('Folieninhalt', () => {
  const slide1 = parts.get('ppt/slides/slide1.xml')!;
  const slide2 = parts.get('ppt/slides/slide2.xml')!;

  it('legt Text in bearbeitbare Rahmen, nicht in Platzhalter', () => {
    expect(slide1).toContain('<p:cNvSpPr txBox="1"/>');
    // Ein `p:ph` würde den Rahmen an das Layout binden.
    expect(slide1).not.toContain('<p:ph ');
  });

  it('lässt PowerPoint umbrechen, ohne die Schrift zu verkleinern', () => {
    expect(slide1).toContain('wrap="square"');
    expect(slide1).toContain('<a:noAutofit/>');
    expect(slide1).not.toContain('normAutofit');
  });

  it('schreibt den Text als echten Text', () => {
    expect(slide1).toContain('<a:t>Fließtext mit </a:t>');
    expect(slide1).toContain('<a:t>fett</a:t>');
    expect(slide1).toContain('b="1"');
    expect(slide1).toContain('i="1"');
  });

  it('setzt den grünen Marker als Texthervorhebung', () => {
    // Als Fläche darunter würde er beim Umbruch vom Wort abrutschen.
    // Die Farbe kommt aus dem Erscheinungsbild und stand hier einmal fest im
    // Code — im SVG und im PDF war der Marker dann orange und in der .pptx grün.
    expect(slide1).toContain(
      `<a:highlight><a:srgbClr val="${palette.signal.slice(1).toUpperCase()}"/></a:highlight>`,
    );
  });

  it('nennt die Marken-Schriften beim Namen', () => {
    expect(slide1).toContain('<a:latin typeface="Zilla Slab"/>');
    expect(slide1).toContain('<a:latin typeface="Inter"/>');
    expect(slide1).toContain('<a:latin typeface="Space Mono"/>');
  });

  it('sperrt nie positiv — LibreOffice schneidet solche Zeilen ab', () => {
    for (const value of [...slide1.matchAll(/spc="(-?\d+)"/g)].map((m) => Number(m[1]))) {
      expect(value).toBeLessThanOrEqual(0);
    }
  });

  it('legt alle Teilkonturen in *einen* Pfad', () => {
    // Mehrere `a:path` wären mehrere Flächen — ein Ring würde zur Scheibe.
    // Dieselbe Falle wie im PDF-Export.
    const paths = [...slide1.matchAll(/<a:pathLst>(.*?)<\/a:pathLst>/gs)];
    expect(paths.length).toBeGreaterThan(0);
    for (const [, inner] of paths) {
      expect((inner.match(/<a:path /g) ?? []).length).toBe(1);
    }
  });

  it('gibt jeder Form eine eigene Kennung — und nie die der Gruppe', () => {
    const ids = [...slide1.matchAll(/<p:cNvPr id="(\d+)"/g)].map((match) => Number(match[1]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 1)).toHaveLength(1); // nur der Gruppenknoten
  });

  it('macht aus einer Markdown-Tabelle eine echte PowerPoint-Tabelle', () => {
    expect(slide2).toContain('<a:tbl>');
    expect(slide2).toContain('<a:gridCol');
    expect(slide2).toContain('<a:t>Eins</a:t>');
  });

  it('ordnet die Zelleigenschaften wie das Schema es verlangt', () => {
    // `a:tcPr` ist eine Sequenz: erst die Linien, dann die Füllung.
    for (const [, inner] of slide2.matchAll(/<a:tcPr[^>]*>([\s\S]*?)<\/a:tcPr>/g)) {
      const line = inner.indexOf('<a:lnB');
      const fill = Math.max(inner.indexOf('<a:solidFill'), inner.indexOf('<a:noFill'));
      if (line >= 0 && fill >= 0) expect(line).toBeLessThan(fill);
    }
  });

  it('schreibt Notizen in eine eigene Notizfolie', () => {
    expect(parts.get('ppt/notesSlides/notesSlide1.xml')).toContain('<a:t>Eine Notiz.</a:t>');
    expect(parts.get('ppt/slides/_rels/slide1.xml.rels')).toContain('notesSlide1.xml');
    // Folie 2 hat keine Notiz und bekommt deshalb auch keine Datei.
    expect(parts.has('ppt/notesSlides/notesSlide2.xml')).toBe(false);
  });

  it('nummeriert Folien über ein Feld, nicht über eine feste Zahl', () => {
    expect(slide1).toContain('type="slidenum"');
  });

  it('ebnet weiche Zeilenumbrüche ein, statt sie mitzuschleppen', () => {
    // In `<a:t>` ist Weißraum bedeutsam: ein rohes \n aus einem weichen
    // Markdown-Umbruch würde in PowerPoint zum echten Zeilenwechsel — auf der
    // Fläche wird er zum Leerzeichen.
    for (const [, text] of slide1.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)) {
      expect(text).not.toMatch(/[\r\n\t]/);
    }
  });
});

describe('Bilder', () => {
  const PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const build = async (deckSource: string, images: Array<[string, string]>) => {
    const map = new Map(
      images.map(([src, dataUrl]) => [src, { src, dataUrl, format: 'png', width: 1, height: 1 }]),
    );
    return readZip(await deckToPptx(parseDeck(deckSource), { images: map as never }));
  };

  it('bettet ein platziertes Bild ein und verweist darauf', async () => {
    const built = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: p.png',
        '-->',
      ].join('\n'),
      [['p.png', PIXEL]],
    );
    expect(built.has('ppt/media/image1.png')).toBe(true);
    expect(built.get('ppt/slides/slide1.xml')).toContain('<p:pic>');
    expect(built.get('ppt/slides/_rels/slide1.xml.rels')).toContain('../media/image1.png');
  });

  it('packt kein Bild ein, auf das nichts zeigt', async () => {
    // Ein Bild im Fließtext hat in PPTX keine Entsprechung — ein Textrahmen
    // kennt keine eingebetteten Bilder. Die Bytes trotzdem einzupacken
    // erzeugte einen toten Teil, und der macht das Paket ungültig.
    const built = await build('# Kopf\n\n![Diagramm](d.png)\n\nText.', [['d.png', PIXEL]]);
    expect([...built.keys()].filter((name) => name.startsWith('ppt/media/'))).toEqual([]);
    expect(built.get('[Content_Types].xml')).not.toContain('Extension="png"');
  });

  it('benennt jedes Format richtig, statt alles png zu nennen', async () => {
    const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const built = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: g.gif',
        '-->',
      ].join('\n'),
      [['g.gif', gif]],
    );
    expect(built.has('ppt/media/image1.gif')).toBe(true);
    expect(built.get('[Content_Types].xml')).toContain(
      '<Default Extension="gif" ContentType="image/gif"/>',
    );
  });

  it('legt kein leeres Bild ab, wenn die Daten-URL nicht base64 ist', async () => {
    const inline = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>';
    const built = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: i.svg',
        '-->',
      ].join('\n'),
      [['i.svg', inline]],
    );
    expect([...built.keys()].filter((name) => name.startsWith('ppt/media/'))).toEqual([]);
    expect(built.get('ppt/slides/slide1.xml')).not.toContain('<p:pic>');
  });
});

describe('Grenzfälle', () => {
  it('baut auch aus einem leeren Deck ein gültiges Paket', async () => {
    const empty = await readZip(await deckToPptx(parseDeck(''), { images: new Map() }));
    expect(empty.has('ppt/slides/slide1.xml')).toBe(true);
    expect(empty.get('ppt/presentation.xml')).toContain('<p:sldIdLst>');
  });

  it('hält die Folien-Kennungen im erlaubten Bereich', async () => {
    // 256 bis 2147483647 laut Spezifikation; darunter lehnt PowerPoint ab.
    const many = parseDeck(
      Array.from({ length: 60 }, (_, index) => `# Folie ${index + 1}`).join('\n\n---\n\n'),
    );
    const built = await readZip(await deckToPptx(many, { images: new Map() }));
    const ids = [...built.get('ppt/presentation.xml')!.matchAll(/<p:sldId id="(\d+)"/g)].map(
      (match) => Number(match[1]),
    );
    expect(ids).toHaveLength(60);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(256);
    expect(Math.max(...ids)).toBeLessThan(2147483648);
    expect(new Set(ids).size).toBe(60);
  });
});
