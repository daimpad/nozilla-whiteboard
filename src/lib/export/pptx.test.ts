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
import { brand, nozillaTheme, palette, registerTheme, setActiveTheme, typeScale } from '@/theme';
import { deckToPptx, EMU, slideCx, slideCy } from './pptx';
import { buildSlideScene, footerMark, tabellenLabelHoehe } from './scene';
import { sceneToSvg } from './svg';
import { footerFrame } from '@/lib/layout/slideLayout';
import { bundledDecks } from '@/decks';
import { folienhoehe, setzeFolienformat } from '@/theme';
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
    expect(xml).toContain(`<p:sldSz cx="${slideCx()}" cy="${slideCy()}"/>`);
    expect(slideCx() / EMU).toBe(1280);
    expect(slideCy() / EMU).toBe(720);
    expect(slideCx() / slideCy()).toBeCloseTo(16 / 9, 6);
  });

  it('nimmt das Seitenmaß aus dem Folienformat und nicht aus dem Startwert', async () => {
    /*
       `p:sldSz` stand als Modulkonstante da und trug damit die Höhe des
       Formats, das beim Laden des Moduls zufällig galt. Eine `.pptx` eines
       A4-Decks käme so mit einer 16:9-Seite heraus — die Formen an der
       richtigen Stelle, das Blatt zu niedrig, und alles unterhalb 720
       außerhalb der Seite. Geprüft wird deshalb an der Datei.
    */
    setzeFolienformat('a4-hoch');
    try {
      const dateien = await readZip(await deckToPptx(parseDeck(DECK)));
      const xml = dateien.get('ppt/presentation.xml') ?? '';
      expect(xml).toContain(`cy="${folienhoehe('a4-hoch') * EMU}"`);
      expect(xml).not.toContain(`cy="${folienhoehe('16-9') * EMU}"`);
    } finally {
      setzeFolienformat('16-9');
    }
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

  it('lässt die Anwendung weg, statt sie leer zu schreiben', async () => {
    /*
       Beide Richtungen. Mit Produktnamen steht ein `<Application>` da, ohne
       gar keins — und nicht ein leeres, das behauptet, es gäbe eines. Dasselbe
       Argument wie beim leeren `descr` eines Alternativtexts und beim `<desc>`
       im SVG; hier ist die zweite Stelle, an der es zählt.
    */
    expect(parts.get('docProps/app.xml')).toContain(`<Application>${brand.product}</Application>`);

    try {
      registerTheme({
        ...nozillaTheme,
        id: 'pptx-ohne-produkt',
        label: 'Ohne Produkt',
        brand: { ...nozillaTheme.brand, product: '  ' },
      });
      setActiveTheme('pptx-ohne-produkt');
      const ohne = await readZip(await deckToPptx(deck, { images: new Map() }));
      expect(ohne.get('docProps/app.xml')).not.toContain('<Application>');
    } finally {
      setActiveTheme('nozilla');
    }
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

  it('trägt die Wortmarke der Fußzeile mit in die Folie', async () => {
    // Der PPTX-Weg setzt seine Fußzeile selbst — der *Text* ist die begründete
    // Ausnahme, die Marke war es nie. Als ihre Rechnung nur in der Szene
    // stand, trugen Fläche, SVG und PDF die Marke und die `.pptx` nicht.
    // Gefunden hat es niemand hier, sondern LibreOffice.
    const mark = footerMark(palette.ink);
    const links = (footerFrame().right - mark.w) * EMU;
    const oben = (footerFrame().y - mark.h) * EMU;
    const nahe = (xml: string) =>
      [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/g)].filter(
        ([, x, y]) => Math.abs(Number(x) - links) < 6 * EMU && Math.abs(Number(y) - oben) < 6 * EMU,
      ).length;

    expect(nahe(slide1)).toBeGreaterThan(0);

    // Und eine nackte Folie trägt sie nicht — sonst prüfte die Zahl oben nur,
    // dass irgendwo unten rechts etwas steht.
    const nackt = parseDeck(['<!-- nzl', 'bare: true', '-->', '', '# Nackt'].join('\n'));
    const nacktXml = (await readZip(await deckToPptx(nackt, { images: new Map() }))).get(
      'ppt/slides/slide1.xml',
    )!;
    expect(nahe(nacktXml)).toBe(0);
  });

  it('nimmt die Beschriftung eines Diagramms mit', async () => {
    // Der PPTX-Weg filtert Textprimitive aus der Geometrie und setzt den Text
    // danach aus den *Feldern* des Elements — ein Diagramm hat aber keine
    // Textfelder, sein Text steht in der Szene. Ohne den eigenen Zweig hätte
    // die `.pptx` Balken ohne Beschriftung gezeigt: dieselbe Falle wie damals
    // bei der Wortmarke.
    const deck = parseDeck(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: chart',
        '    x: 100',
        '    y: 100',
        '    w: 500',
        '    h: 300',
        '    chart: bar',
        '    label: Laufzeit in Tagen',
        '    data: |',
        '      2023  38',
        '      2024  52',
        '-->',
        '',
        '# Zahlen',
      ].join('\n'),
    );
    const xml = (await readZip(await deckToPptx(deck, { images: new Map() }))).get(
      'ppt/slides/slide1.xml',
    )!;

    // Die Überschrift steht in der Label-Stufe und damit in Versalien — so
    // wird sie auch gezeichnet.
    for (const wort of ['LAUFZEIT IN TAGEN', '2023', '2024', '38', '52']) {
      expect(xml, wort).toContain(`<a:t>${wort}</a:t>`);
    }
    // Und die Balken sind echte Formen, nicht ein eingebettetes Bild.
    expect(xml).toContain('<a:custGeom>');
    expect(xml).not.toContain('<p:pic>');
  });

  it('macht aus einem Tabellen-Element eine echte PowerPoint-Tabelle', async () => {
    /*
       Der eigentliche Grund für diese Elementart.

       Eine Tabelle in einem Markdown-Block kommt hier nur als Textrahmen an,
       und `tableAsParagraphs()` macht daraus Zeilen mit Trennpunkten — in
       PowerPoint kann eine Tabelle nicht im Textfluss stehen. Weil hier aber
       *bekannt* ist, dass das Element eine Tabelle ist, lässt sich derselbe
       `a:tbl` schreiben wie für den Fließtext.
    */
    const deck = parseDeck(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: table',
        '    x: 100',
        '    y: 100',
        '    w: 500',
        '    h: 300',
        '    label: Tastenkürzel',
        '    data: |',
        '      Was | Tasten',
        '      Übersicht | ⌘K',
        '-->',
        '',
        '# Zellen',
      ].join('\n'),
    );
    // Ohne Fußzeile, weil die kleine Wortmarke unten rechts selbst ein
    // `custGeom` ist — und die Prüfung darunter sonst nichts aussagte.
    const xml = (await readZip(await deckToPptx(deck, { images: new Map(), chrome: false }))).get(
      'ppt/slides/slide1.xml',
    )!;

    expect(xml).toContain('<a:tbl>');
    expect(xml).toContain('<a:t>Übersicht</a:t>');
    expect(xml).toContain('<a:t>⌘K</a:t>');
    // Die Überschrift steht in der Label-Stufe und damit in Versalien.
    expect(xml).toContain('<a:t>TASTENKÜRZEL</a:t>');
    // Und nicht die Notlösung mit Trennpunkten, die ein Markdown-Block bekäme.
    expect(xml).not.toContain('  ·  ');
    // Die Linien des Setzers dürfen nicht mitkommen: die echte Tabelle bringt
    // ihre eigenen mit, und zwei Gitter übereinander sieht man sofort.
    expect(xml).not.toContain('<a:custGeom>');
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

describe('was die .pptx zeigt und die Fläche nicht', () => {
  /**
   * Eine Folie mit einem Element bauen und ihr XML lesen.
   *
   * Über `deckToPptx` und das wirklich entstandene ZIP — eine Zusicherung über
   * eine Zeichenkette beweist hier nichts, das steht im Kopf dieser Datei.
   */
  const folieMit = async (nzl: string[]) => {
    const quelle = ['<!-- nzl', 'elements:', ...nzl, '-->', '', '# Probe'].join('\n');
    const teile = await readZip(await deckToPptx(parseDeck(quelle), { images: new Map() }));
    return teile.get('ppt/slides/slide1.xml') ?? '';
  };

  it('dreht eine Form nicht ein zweites Mal', async () => {
    /*
       `buildElementPrims()` schickt jedes Segment durch
       `transformSegs(segs, elementMatrix(element))` — die Drehung steckt schon
       in den Koordinaten. Der PPTX-Weg schrieb sie zusätzlich als `rot` in die
       `a:xfrm`: die Form stand in PowerPoint um 60° gedreht statt um 30, und
       bei 90° hob es sich auf und die Datei zeigte gar keine Drehung, während
       Fläche, SVG und PDF sie zeigten.
    */
    const xml = await folieMit([
      '  - kind: shape',
      '    x: 100',
      '    y: 200',
      '    w: 400',
      '    h: 100',
      '    rotation: 30',
    ]);
    expect(xml).toContain('<a:custGeom');
    expect(xml).not.toMatch(/<a:xfrm rot="[^0]/);
  });

  it('setzt Tabellenzellen in derselben Stufe wie der Setzer', async () => {
    /*
       Der Setzer zeichnet Tabellen immer in `typeScale.small`; der PPTX-Weg
       schrieb fest `bodyStrong`/`body`. Jede Tabelle war damit 23 % größer als
       auf der Fläche — und das in Spalten, deren Breite mit den Maßen von
       `small` gerechnet ist.
    */
    const xml = parts.get('ppt/slides/slide2.xml') ?? '';
    const groessen = [...xml.matchAll(/<a:rPr[^>]*sz="(\d+)"/g)].map(([, wert]) => Number(wert));
    const zellen = groessen.filter((wert) => wert < 1600);
    expect(zellen.length).toBeGreaterThan(0);
    // `sz` ist in Hundertstel Punkt, eine Folien-Einheit ist drei viertel Punkt.
    expect(Math.max(...zellen)).toBe(Math.round(typeScale.small.size * 0.75 * 100));
  });

  it('füllt die Kopfzeile einer Tabelle nicht', async () => {
    // Der Setzer malt sie nicht — er zeichnet je Zeile nur die Linie darunter.
    // Die `.pptx` hatte einen grauen Balken obenauf, den sonst niemand kennt.
    const xml = parts.get('ppt/slides/slide2.xml') ?? '';
    const zellen = [...xml.matchAll(/<a:tcPr[\s\S]*?<\/a:tcPr>/g)].map(([treffer]) => treffer);
    expect(zellen.length).toBeGreaterThan(0);
    /*
       Die Füllung steht am **Ende** der Sequenz, nach den Linien — die tragen
       selbst ein `solidFill` für ihre Farbe. Gefragt wird deshalb genau die
       letzte Angabe jeder Zelle.
    */
    expect(zellen.every((zelle) => zelle.endsWith('<a:noFill/></a:tcPr>'))).toBe(true);
  });

  it('trägt die Beschriftung einer Form und eines Verbinders mit', async () => {
    /*
       Sie stehen in der Szene als Text-Primitive, und der PPTX-Weg filtert
       Textprimitive aus der Geometrie. `TEXT_KINDS` kennt nur Bausteine mit
       eigenen Textfeldern — ein Flussdiagramm aus beschrifteten Formen und
       Verbindern war in PowerPoint ein leeres Kastendiagramm.
    */
    const xml = await folieMit([
      '  - kind: shape',
      '    label: Antrag pruefen',
      '  - kind: connector',
      '    x: 400',
      '    y: 300',
      '    label: abgelehnt',
    ]);
    /*
       Verglichen wird mit der **Fläche** und nicht mit einer abgeschriebenen
       Zeichenkette. Die erste Fassung dieser Prüfung erwartete Versalien —
       genau das, was der Fehler erzeugte: der PPTX-Weg setzte jedes
       Textprimitiv der Szene über `inlineToParagraph(text, 'label')` neu, also
       in Space Mono Bold 12 in Großbuchstaben, während die Szene die
       Beschriftung einer Form in `labelStyle ?? 'body'` setzt. Der Test hat
       den Fehler bestätigt statt ihn zu finden.
    */
    const svg = sceneToSvg(
      buildSlideScene(
        parseDeck(
          [
            '<!-- nzl',
            'elements:',
            '  - kind: shape',
            '    label: Antrag pruefen',
            '  - kind: connector',
            '    x: 400',
            '    y: 300',
            '    label: abgelehnt',
            '-->',
            '',
            '# Probe',
          ].join('\n'),
        ).slides[0],
        parseDeck('# Probe'),
        {},
      ),
    );
    const ausSvg = [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(([, wert]) => wert);
    const texte = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(([, wert]) => wert);
    /*
       Die beiden Beschriftungen laufen über *verschiedene* Stufen, und genau
       darum geht es: die einer Form über `labelStyle ?? 'body'` — Inter 16,
       gemischt —, die eines Verbinders über `label` — Space Mono Bold 12,
       Versalien. Der PPTX-Weg machte aus beiden das Zweite.
    */
    for (const wort of ['Antrag', 'pruefen', 'ABGELEHNT']) {
      expect(ausSvg.join(' '), `Fläche: ${wort}`).toContain(wort);
      expect(texte.join(' '), `PPTX: ${wort}`).toContain(wort);
    }
    // Und die Gegenrichtung: was die Fläche nicht groß schreibt, schreibt die
    // Datei auch nicht groß.
    expect(texte.join(' ')).not.toContain('ANTRAG');
  });

  it('gibt der Kontur dieselbe Deckkraft wie der Fläche', async () => {
    /*
       Im SVG steht `opacity` an der Form und gilt für Füllung und Strich, im
       PDF setzt `setOpacity()` beides. Hier ging die Deckkraft nur an
       `solidFill` der Füllung: eine gerahmte Form verblasste, ihr Rahmen
       blieb schwarz, und eine Form mit „Füllung: Kontur" — also jeder
       Verbinder und jede Diagrammachse — blieb ganz undurchsichtig.
    */
    const xml = await folieMit([
      '  - kind: shape',
      '    fill: outline',
      '    opacity: 0.4',
      '    w: 300',
      '    h: 150',
    ]);
    // `<a:ln ` mit dem Leerzeichen: ohne es trifft das Muster auch `<a:lnTo>`,
    // und ein Pfadsegment trägt keine Farbe.
    const linien = [...xml.matchAll(/<a:ln[ >]([\s\S]*?)<\/a:ln>/g)].map(([, inhalt]) => inhalt);
    const mitFarbe = linien.filter((inhalt) => inhalt.includes('<a:srgbClr'));
    expect(mitFarbe.length).toBeGreaterThan(0);
    // 0,4 · 100000 — dieselbe Zahl, die `solidFill` für eine Füllung schreibt.
    for (const inhalt of mitFarbe) expect(inhalt).toContain('<a:alpha val="40000"/>');
  });

  it('setzt die Kennzahl einer Karte auf dieselbe Größe wie die Fläche', async () => {
    /*
       `cardScene()` deckelt die Ziffer auf 42 % der Kartenhöhe — sonst ragt
       eine 88 Einheiten hohe Zahl aus einer 190 Einheiten hohen Karte heraus,
       und genau so hoch ist die Kennzahl-Karte im mitgelieferten Deck. Der
       PPTX-Weg schrieb die volle Stufe.
    */
    const xml = await folieMit([
      '  - kind: card',
      '    variant: stat',
      '    title: 38 %',
      '    w: 492',
      '    h: 190',
    ]);
    // 190 · 0,42 = 79,8 Einheiten → ¾ Punkt je Einheit → 5985 Hundertstel.
    expect(xml).toContain('sz="5985"');
    expect(xml).not.toContain('sz="6600"');
  });

  it('setzt die Ziffer einer Schritt-Karte so groß wie die Fläche', async () => {
    /*
       Das Quadrat ist 44 Einheiten breit, und die 24 der Ziffer ist daneben
       gewählt und nicht aus der Typo-Leiter genommen. Der PPTX-Weg schrieb
       dafür die Stufe `h3` — 34 statt 24, also 42 % zu groß im selben Quadrat
       —, dazu ein eigenes `STEP_SIZE = 44` mit dem Kommentar „siehe scene.ts".
       Zwei Zahlen für dieselbe Zeichnung.
    */
    const xml = await folieMit([
      '  - kind: card',
      '    variant: step',
      '    label: "7"',
      '    title: Titel',
      '    w: 320',
      '    h: 220',
    ]);
    // 24 Einheiten → ¾ Punkt je Einheit → 1800 Hundertstel Punkt.
    expect(xml).toContain('sz="1800"');
    expect(xml).not.toContain('sz="2550"');
  });

  it('setzt die Quellenangabe eines Zitats wie die Fläche', async () => {
    /*
       Die Zitat-Karte ist die eine Variante, die aus der Reihe fällt: Titel in
       `lead` (Inter Regular, ohne Sperrung), Quellenangabe in `label` (Space
       Mono Bold, Versalien). Der PPTX-Weg führte dafür seine eigene Tabelle
       und schrieb `h4` und `small` — dieselbe Karte, in PowerPoint in einer
       anderen Schrift, in einem anderen Gewicht und in gemischter Schreibweise.
    */
    const xml = await folieMit([
      '  - kind: card',
      '    variant: quote',
      '    title: Wir bauen Dinge, die halten.',
      '    body: Anna Beispiel',
      '    w: 500',
      '    h: 260',
    ]);
    const texte = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(([, wert]) => wert);
    expect(texte.join(' ')).toContain('ANNA BEISPIEL');
    expect(texte.join(' ')).not.toContain('Anna Beispiel');
  });

  it('dreht die Beschriftung mit und blendet sie mit ein', async () => {
    /*
       Ein Textprimitiv der Szene trägt beides — `opacity` vom Element und
       `rotate` als Grad **um (x, y)**. `scenenTextShape()` gab keines davon
       weiter: die Beschriftung einer gedrehten Form lag in PowerPoint
       waagerecht neben ihr, während die Form gedreht war, und eine zu 35 %
       eingeblendete Beschriftung stand voll deckend da.

       Geprüft wird an der **Hülle**, nicht am Winkel: PowerPoint dreht um die
       *Mitte* des Rahmens, das SVG um (x, y) — der Rahmen muss deshalb
       verschoben dastehen, damit beide Drehungen an derselben Stelle enden.
    */
    const nzl = [
      '  - kind: shape',
      '    x: 200',
      '    y: 200',
      '    w: 400',
      '    h: 100',
      '    rotation: 30',
      '    opacity: 0.35',
      '    label: Antrag',
    ];
    const xml = await folieMit(nzl);
    const rahmen = xml.match(
      /name="Beschriftung[^"]*"[\s\S]*?<a:xfrm rot="(\d+)"><a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"/,
    );
    expect(rahmen, 'kein gedrehter Rahmen für die Beschriftung').not.toBeNull();
    const [, rot, ox, oy, cx, cy] = rahmen!.map(Number);
    expect(rot).toBe(30 * 60000);
    expect(xml).toMatch(/name="Beschriftung[^"]*"[\s\S]*?<a:alpha val="35000"\/>/);

    // Die Mitte des Rahmens muss dort liegen, wo die Drehung um (x, y) sie
    // hinbringt — das ist die eine Zahl, die beide Wege gemeinsam haben.
    const szene = buildSlideScene(
      parseDeck(['<!-- nzl', 'elements:', ...nzl, '-->', '', '# Probe'].join('\n')).slides[0],
      parseDeck('# Probe'),
      {},
    );
    const text = szene.prims.find((prim) => prim.t === 'text' && prim.rotate);
    expect(text, 'die Szene dreht die Beschriftung gar nicht').toBeDefined();
    if (text?.t !== 'text') throw new Error('kein Textprimitiv');
    const bogen = ((text.rotate ?? 0) * Math.PI) / 180;
    const hoehe = cy / EMU;
    const dx = cx / EMU / 2;
    const dy = hoehe / 2 - hoehe / 1.5;
    const soll = {
      x: text.x + dx * Math.cos(bogen) - dy * Math.sin(bogen),
      y: text.y + dx * Math.sin(bogen) + dy * Math.cos(bogen),
    };
    expect(ox / EMU + dx).toBeCloseTo(soll.x, 1);
    expect(oy / EMU + hoehe / 2).toBeCloseTo(soll.y, 1);
  });

  it('blendet eine Tabelle mit ein', async () => {
    /*
       `tableShape()` bekam nie eine Deckkraft: eine zu 35 % eingeblendete
       Tabelle stand in PowerPoint voll deckend da — Zellen wie Linien —,
       während Fläche, SVG und PDF sie blass zeigten.
    */
    const xml = await folieMit([
      '  - kind: table',
      '    x: 100',
      '    y: 100',
      '    w: 600',
      '    h: 300',
      '    opacity: 0.35',
      '    data: |',
      '      Was\tWert',
      '      Eins\t1',
    ]);
    const rahmen = xml.slice(xml.indexOf('<p:graphicFrame>'));
    expect(rahmen).toContain('<a:tbl>');
    // Die Linie unter jeder Zelle und die Schrift darin — beide gedämpft.
    const zellen = [...rahmen.matchAll(/<a:tcPr[\s\S]*?<\/a:tcPr>/g)].map(([treffer]) => treffer);
    expect(zellen.length).toBeGreaterThan(0);
    for (const zelle of zellen) expect(zelle).toContain('<a:alpha val="35000"/>');
    expect(rahmen).toMatch(/<a:rPr[\s\S]*?<a:alpha val="\d+"\/>/);
  });

  it('misst die Überschrift einer Tabelle, statt eine Zeile zu raten', async () => {
    /*
       Hier stand `typeScale.label.size * lineHeight * 1.6`, also fest eine
       Zeile — `tableScene()` misst dagegen mit `typesetText()`. Eine
       Überschrift, die über die Breite hinausgeht, bricht auf der Fläche um
       und lag in PowerPoint über der ersten Tabellenzeile.
    */
    const lang =
      'Eine Überschrift, die über die Breite dieser Tabelle deutlich hinausgeht und umbricht';
    const xml = await folieMit([
      '  - kind: table',
      '    x: 100',
      '    y: 100',
      '    w: 600',
      '    h: 300',
      '    padding: 24',
      `    label: ${lang}`,
      '    data: |',
      '      Was\tWert',
      '      Eins\t1',
    ]);
    const kopf = xml.match(
      /name="Überschrift[^"]*"[\s\S]*?<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"/,
    );
    const tabelle = xml.match(/<p:graphicFrame>[\s\S]*?<a:off x="(-?\d+)" y="(-?\d+)"/);
    expect(kopf, 'keine Überschrift im Paket').not.toBeNull();
    expect(tabelle, 'keine Tabelle im Paket').not.toBeNull();

    // Dieselbe Rechnung, nach der die Fläche zeichnet — und die Tabelle steht
    // genau darunter.
    const soll = tabellenLabelHoehe(lang, 600 - 24 * 2);
    expect(Number(tabelle![2]) / EMU).toBeCloseTo(Number(kopf![2]) / EMU + soll, 1);
    // Und die Gegenrichtung: eine geratene Zeile wäre kleiner, weil die
    // Überschrift zweizeilig ist.
    expect(soll).toBeGreaterThan(typeScale.label.size * typeScale.label.lineHeight * 1.6);
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

  it('trägt die Deckkraft eines Bildes mit', async () => {
    /*
       Die Szene trägt sie am `image`-Primitiv, das SVG schreibt `opacity` ans
       `<image>`, der PDF-Weg setzt eine GState. Nur die `.pptx` ließ den Wert
       fallen: ein zu 35 % eingeblendetes Hintergrundbild stand dort voll
       deckend über der Folie und verdeckte, was auf ihr steht. `a:alphaModFix`
       ist der dafür vorgesehene Weg — er fehlte schlicht.
    */
    const built = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: p.png',
        '    opacity: 0.35',
        '-->',
      ].join('\n'),
      [['p.png', PIXEL]],
    );
    expect(built.get('ppt/slides/slide1.xml')).toContain('<a:alphaModFix amt="35000"/>');

    // Die Gegenrichtung: ein volldeckendes Bild bekommt keinen Eintrag — ein
    // `amt="100000"` wäre dasselbe und stünde nur im Weg.
    const voll = await build(
      ['<!-- nzl', 'elements:', '  - kind: image', '    src: p.png', '-->'].join('\n'),
      [['p.png', PIXEL]],
    );
    expect(voll.get('ppt/slides/slide1.xml')).not.toContain('alphaModFix');
  });

  it('nimmt Rahmen und Schatten eines Bildes mit', async () => {
    /*
       Ein Bild ist nicht nur ein `p:pic`: die Szene malt dazu den
       Versatzschatten und — bei jeder Füllung außer „Ohne" — einen Rahmen aus
       `paint.line` in der gewählten Strichstärke. `elementShapes()` kehrte mit
       dem Bild sofort zurück, und beides fiel heraus: Fläche, SVG, PNG und PDF
       zeigten sie, die `.pptx` als einziger Weg nicht.
    */
    const mit = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    w: 400',
        '    h: 300',
        '    src: p.png',
        '    fill: framed',
        '    strokeWeight: heavy',
        '    shadow: lg',
        '-->',
      ].join('\n'),
      [['p.png', PIXEL]],
    );
    /*
       Die Gegenrichtung steht daneben und ist hier die eigentliche Messung:
       gezählt wird der *Unterschied* zwischen einem Bild mit Rahmen und
       Schatten und einem ohne beides. Die Folie trägt ohnehin Geometrie — die
       kleine Wortmarke in der Fußzeile —, und eine nackte Zählung bewiese
       deshalb nichts.
    */
    const ohne = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    w: 400',
        '    h: 300',
        '    src: p.png',
        '    fill: none',
        '    shadow: none',
        '-->',
      ].join('\n'),
      [['p.png', PIXEL]],
    );
    const zaehle = (teile: Map<string, string>) =>
      [...(teile.get('ppt/slides/slide1.xml') ?? '').matchAll(/<a:custGeom>/g)].length;

    expect(mit.get('ppt/slides/slide1.xml')).toContain('<p:pic>');
    expect(ohne.get('ppt/slides/slide1.xml')).toContain('<p:pic>');
    expect(zaehle(mit) - zaehle(ohne)).toBe(2);
  });

  it('schreibt den Alternativtext dorthin, wo er vorgelesen wird', async () => {
    /*
       `name` ist der Name in der Auswahlliste, `descr` der Alternativtext —
       und nur den liest eine Hilfstechnik vor. Bisher stand er im `name`:
       sichtbar für den, der die Datei bearbeitet, unsichtbar für den, der sie
       hört.
    */
    const built = await build(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: image',
        '    x: 0',
        '    y: 0',
        '    src: p.png',
        '    alt: Das Team vor der Werkstatt',
        '-->',
      ].join('\n'),
      [['p.png', PIXEL]],
    );
    expect(built.get('ppt/slides/slide1.xml')).toContain('descr="Das Team vor der Werkstatt"');
  });

  it('erfindet keine Beschreibung, wo keine steht', async () => {
    // Die Gegenrichtung: ein leeres `descr` behauptet, das Bild sei
    // beschrieben. Lieber gar keines — dann sagt die Hilfstechnik „Bild".
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
    expect(built.get('ppt/slides/slide1.xml')).not.toContain('descr=');
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

/* -------------------------------------------------------------------------- */

describe('der Text der .pptx gegen den des SVG', () => {
  it('lässt kein Wort der Folie zurück', async () => {
    /*
       Drei Fehler dieses Repos hatten dieselbe Bauart: die `.pptx` setzte
       etwas anders oder gar nicht, was das SVG richtig zeigte — die
       Beschriftung einer Form fiel ganz heraus, die Zellen einer Tabelle
       standen 23 % zu groß, das Label einer Zitatkarte stand doppelt. Alle
       drei hätte diese Prüfung gefunden, und keine der vorhandenen tat es:
       sie greifen einzelne XML-Knoten heraus, und was gar nicht da ist, hat
       keinen Knoten.

       Verglichen werden **Wörter** und keine Positionen. Wo etwas steht, ist
       eine andere Frage und hat ihre eigenen Zusicherungen; hier geht es nur
       darum, dass nichts verlorengeht. Kurze Wörter bleiben draußen, weil
       „und" in jedem Dokument vorkommt und nichts beweist.

       Ausgenommen ist der Beschreibungstext des SVG (`<title>`, `<desc>`):
       er ist Metadaten der Datei und steht auf keiner Folie.
    */
    for (const eintrag of bundledDecks) {
      const deck = parseDeck(eintrag.source);
      const dateien = await readZip(await deckToPptx(deck));
      const ausPptx = worte(
        [...dateien.entries()]
          .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .map(([, xml]) => xml)
          .join(' '),
      );
      const ausSvg = worte(
        deck.slides
          .map((slide, index) =>
            sceneToSvg(
              buildSlideScene(slide, deck, {
                chrome: true,
                slideNumber: index + 1,
                totalSlides: deck.slides.length,
              }),
            ).replace(/<(title|desc)>[\s\S]*?<\/\1>/g, ' '),
          )
          .join(' '),
      );

      const fehlt = [...ausSvg].filter((wort) => !ausPptx.has(wort));
      expect(fehlt, `${eintrag.file}: Wörter nur im SVG`).toEqual([]);
      // Und die Prüfung hat wirklich etwas zu vergleichen.
      expect(ausSvg.size, eintrag.file).toBeGreaterThan(40);
    }
  }, 60000);
});

/**
 * Die Wörter eines Markups — ohne Auszeichnung, ohne Kurzes.
 *
 * Vier Zeichen als Untergrenze: darunter liegen die Füllwörter, die in jedem
 * deutschen Satz stehen und deren Vorkommen nichts belegt.
 */
function worte(markup: string): Set<string> {
  return new Set(
    markup
      .replace(/<[^>]+>/g, ' ')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((wort) => wort.length > 3)
      .map((wort) => wort.toLocaleLowerCase('de-DE')),
  );
}
