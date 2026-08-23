/**
 * Deck → PowerPoint (.pptx).
 *
 * Der vierte Kunde derselben Szene — mit einer bewussten Ausnahme.
 *
 * **Geometrie** kommt wie bei SVG und PDF aus `buildElementPrims()`. Die
 * Segmentliste (Move / Linie / Kubik / Schließen) übersetzt sich eins zu eins
 * in DrawingMLs `a:custGeom`; die Arbeit dafür war schon getan.
 *
 * **Text** kommt *nicht* aus der Szene, sondern aus dem Deck-Modell. Das ist
 * der ganze Unterschied zwischen einer Präsentation und einem Bild einer
 * Präsentation: in der Szene ist der Text bereits umbrochen und zu absolut
 * gesetzten Zeilen erstarrt, in der `.pptx` soll er ein Textrahmen sein, in
 * den man hineinschreiben kann. Wer das exakte Bild braucht, exportiert PDF —
 * dafür ist es da.
 *
 * Maßeinheit ist EMU. Eine Folien-Einheit ist genau 9525 EMU, damit die
 * 1280 × 720 Einheiten auf PowerPoints Breitbild-Vorgabe von 13,333 × 7,5 Zoll
 * fallen — ohne Rundung, ohne krumme Zahl. Eine Einheit ist damit ¾ Punkt,
 * dieselbe Umrechnung, die der PDF-Export benutzt.
 */
import {
  brand,
  canvas as canvasTokens,
  palette,
  strokeWidth as strokeWidthOf,
  typeScale,
} from '@/theme';
import { flowFrame, footerFrame } from '@/lib/layout/slideLayout';
import { segsBounds, type Seg } from '@/lib/geometry/path';
import type { StyledRun } from '@/lib/text/typeset';
import type { CanvasElement, Deck, Slide } from '@/model/types';
import { slideTitle } from '@/model/types';
import {
  backgroundStyle,
  buildElementPrims,
  footerMark,
  elementPaint,
  type BackgroundStyle,
  type ScenePrim,
} from './scene';
import { parseColor } from './color';
import { escapeXml } from './svg';
import { resolveDeckImages, type ImageMap } from './images';
import {
  inlineToParagraph,
  markdownToBlocks,
  markdownToParagraphs,
  type Block,
  type BulletKind,
  type Paragraph,
  type TableModel,
} from './pptxText';
import { createZip, utf8, type ZipEntry } from './zip';
import { PARTS, XML_DECL, NS, faceName, relationships } from './pptxParts';

/** Eine Folien-Einheit in EMU. 1280 × 9525 = 12192000 = 13⅓ Zoll. */
export const EMU = 9525;
export const SLIDE_CX = canvasTokens.width * EMU;
export const SLIDE_CY = canvasTokens.height * EMU;

const emu = (units: number) => Math.round(units * EMU);
/** Schriftgrößen stehen in Hundertstel Punkt; eine Einheit ist ¾ Punkt. */
const pt100 = (units: number) => Math.round(units * 0.75 * 100);

export interface PptxOptions {
  title?: string;
  author?: string;
  /** Fußzeile und Foliennummer mitgeben. */
  chrome?: boolean;
  images?: ImageMap;
}

/* -------------------------------------------------------------------------- */
/* Paket                                                                       */
/* -------------------------------------------------------------------------- */

export async function deckToPptx(deck: Deck, options: PptxOptions = {}): Promise<Blob> {
  const images = options.images ?? (await resolveDeckImages(deck));
  const media = collectMedia(images);

  const slides = deck.slides.map((slide, index) =>
    buildSlide(slide, deck, {
      chrome: options.chrome !== false,
      slideNumber: index + 1,
      totalSlides: deck.slides.length,
      media,
    }),
  );

  /*
     Nur eingepackt, was auch referenziert wird.

     `collectMedia()` sammelt jede Bildquelle des Decks — auch die aus dem
     Fließtext, für die es in PPTX keine Entsprechung gibt (ein Textrahmen
     kennt keine eingebetteten Bilder). Diese Bytes ohne Relationship ins
     Paket zu legen erzeugt einen toten Teil, und tote Teile sind laut
     Spezifikation kein gültiges Paket.
  */
  const referenced = media.filter((item) => slides.some((slide) => slide.media.includes(item)));

  const entries: ZipEntry[] = [];
  const add = (name: string, xml: string) => entries.push({ name, data: utf8(xml) });

  add('[Content_Types].xml', contentTypes(slides, referenced));
  add('_rels/.rels', PARTS.rootRels);
  add('docProps/core.xml', coreProps(deck, options));
  add('docProps/app.xml', appProps(deck));
  add('ppt/presentation.xml', presentation(slides.length));
  add('ppt/_rels/presentation.xml.rels', presentationRels(slides.length));
  add('ppt/presProps.xml', PARTS.presProps);
  add('ppt/viewProps.xml', PARTS.viewProps);
  add('ppt/tableStyles.xml', PARTS.tableStyles);
  add('ppt/theme/theme1.xml', PARTS.theme);
  add('ppt/theme/theme2.xml', PARTS.theme);
  add('ppt/slideMasters/slideMaster1.xml', PARTS.slideMaster);
  add('ppt/slideMasters/_rels/slideMaster1.xml.rels', PARTS.slideMasterRels);
  add('ppt/slideLayouts/slideLayout1.xml', PARTS.slideLayout);
  add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', PARTS.slideLayoutRels);
  add('ppt/notesMasters/notesMaster1.xml', PARTS.notesMaster);
  add('ppt/notesMasters/_rels/notesMaster1.xml.rels', PARTS.notesMasterRels);

  slides.forEach((slide, index) => {
    const n = index + 1;
    add(`ppt/slides/slide${n}.xml`, slide.xml);
    add(`ppt/slides/_rels/slide${n}.xml.rels`, slideRels(n, slide));
    if (slide.notes) {
      add(`ppt/notesSlides/notesSlide${n}.xml`, notesSlide(slide.notes));
      add(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`, notesSlideRels(n));
    }
  });

  for (const item of referenced) {
    entries.push({ name: `ppt/media/${item.file}`, data: item.bytes, store: true });
  }

  return createZip(entries);
}

/* -------------------------------------------------------------------------- */
/* Bilder                                                                      */
/* -------------------------------------------------------------------------- */

interface MediaItem {
  src: string;
  file: string;
  ext: string;
  bytes: Uint8Array;
}

/**
 * Bildendung und Inhaltstyp je MIME.
 *
 * Die Endung steuert den `<Default>`-Eintrag im Content-Types-Verzeichnis, und
 * der muss zum Inhalt passen — ein GIF, das `image1.png` heißt und als
 * `image/png` angemeldet ist, ist ein Verstoß gegen die Spezifikation, den
 * PowerPoint als beschädigte Datei auslegen darf.
 */
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/webp': 'webp',
  'image/x-emf': 'emf',
  'image/x-wmf': 'wmf',
};

export function imageContentType(ext: string): string {
  const found = Object.entries(IMAGE_TYPES).find(([, value]) => value === ext);
  return found ? found[0] : `image/${ext}`;
}

function collectMedia(images: ImageMap): MediaItem[] {
  const out: MediaItem[] = [];
  let index = 0;
  for (const image of images.values()) {
    const match = /^data:([^;,]*)((?:;[^,]*)*),([\s\S]*)$/.exec(image.dataUrl);
    if (!match) continue;

    const mime = (match[1] || 'image/png').toLowerCase();
    const isBase64 = /;base64/i.test(match[2]);
    const bytes = decodeDataUrl(match[3], isBase64);
    // Ein leeres Medium wäre ein toter Teil im Paket, auf den eine
    // Relationship zeigt — lieber gar kein Bild als ein kaputtes.
    if (bytes.length === 0) continue;

    /*
       SVG ist in PPTX kein eigenständiges Bild: `a:blip` verlangt ein Raster,
       das SVG hängt nur als Erweiterung daran. Ohne dieses Raster zeigt
       PowerPoint eine leere Fläche. Solche Quellen werden deshalb
       übersprungen — sie sind auf der Folie ohnehin selten, und ein Loch mit
       Ansage ist besser als ein Loch ohne.
    */
    if (mime === 'image/svg+xml') continue;

    const ext = IMAGE_TYPES[mime] ?? 'png';
    index += 1;
    out.push({ src: image.src, file: `image${index}.${ext}`, ext, bytes });
  }
  return out;
}

/**
 * Eine Daten-URL in Bytes.
 *
 * Nicht jede ist base64-kodiert: `data:image/svg+xml;utf8,<svg …>` ist gültig
 * und häufig. `atob()` darauf wirft, und ein stillschweigend leeres Ergebnis
 * hätte ein Null-Byte-Bild ins Paket gelegt.
 */
function decodeDataUrl(payload: string, isBase64: boolean): Uint8Array {
  try {
    if (!isBase64) return new TextEncoder().encode(decodeURIComponent(payload));
    const binary = atob(payload.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

/* -------------------------------------------------------------------------- */
/* Folie                                                                       */
/* -------------------------------------------------------------------------- */

interface BuiltSlide {
  xml: string;
  notes: string | null;
  /** Bilder, die diese Folie benutzt — in der Reihenfolge ihrer rIds. */
  media: MediaItem[];
}

interface SlideContext {
  chrome: boolean;
  slideNumber: number;
  totalSlides: number;
  media: MediaItem[];
}

function buildSlide(slide: Slide, deck: Deck, context: SlideContext): BuiltSlide {
  const bg = backgroundStyle(slide.meta.background);
  const shapes: string[] = [];
  const used: MediaItem[] = [];
  let id = 1;
  const nextId = () => (id += 1);

  const chrome = context.chrome && !slide.meta.bare;

  /* Fließtext der Folie — ein Textrahmen im Satzspiegel. */
  const frame = flowFrame(slide.meta.layout);
  if (frame && slide.markdown.trim()) {
    const blocks = markdownToBlocks(slide.markdown, {
      palette: { text: bg.ink, muted: bg.muted, accent: bg.ink },
      baseStyle: frame.baseStyle,
      scale: frame.scale,
      align: frame.align === 'center' ? 'ctr' : frame.align === 'right' ? 'r' : 'l',
    });
    shapes.push(...flowShapes(blocks, frame, bg, nextId));
  }

  /* Elemente in Malreihenfolge. */
  for (const element of [...slide.elements].sort((a, b) => a.z - b.z)) {
    shapes.push(...elementShapes(element, bg, nextId, context, used));
  }

  /* Fußzeile und Foliennummer. */
  if (chrome) {
    const footer = footerFrame;
    const text = deck.meta.footer;
    if (text) {
      shapes.push(
        textShape(
          nextId(),
          'Fußzeile',
          footer.left,
          footer.y - 14,
          footer.right - footer.left,
          24,
          [inlineToParagraph(text, 'labelSmall', { color: bg.muted })],
        ),
      );
    }
    // Die Wortmarke kommt als Zeichnung aus der Szene — nur der Text der
    // Fußzeile ist hier die Ausnahme, die Marke ist keine.
    const mark = footerMark(bg.muted);
    for (const prim of mark.prims) {
      const shape = primToShape(prim, nextId, 0);
      if (shape) shapes.push(shape);
    }

    if (context.totalSlides > 0) {
      shapes.push(
        slideNumberShape(nextId(), mark.numberRight - 120, footer.y - 14, 120, 24, bg.muted, [
          context.slideNumber,
          context.totalSlides,
        ]),
      );
    }
  }

  const xml = [
    XML_DECL,
    `<p:sld ${NS}>`,
    '<p:cSld>',
    backgroundXml(bg),
    '<p:spTree>',
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>',
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
      '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>',
    ...shapes,
    '</p:spTree>',
    '</p:cSld>',
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>',
    '</p:sld>',
  ].join('');

  return { xml, notes: slide.meta.notes?.trim() || null, media: used };
}

function backgroundXml(bg: BackgroundStyle): string {
  return `<p:bg><p:bgPr>${solidFill(bg.fill)}<a:effectLst/></p:bgPr></p:bg>`;
}

/* -------------------------------------------------------------------------- */
/* Fließtext                                                                   */
/* -------------------------------------------------------------------------- */

type IdFn = () => number;

function flowShapes(
  blocks: Block[],
  frame: NonNullable<ReturnType<typeof flowFrame>>,
  bg: BackgroundStyle,
  nextId: IdFn,
): string[] {
  const out: string[] = [];
  const paras = blocks.filter((block) => block.t === 'paras').flatMap((block) => block.paras);
  const tables = blocks.filter((block) => block.t === 'table');

  // Ohne Tabelle bekommt der Fließtext den ganzen Rahmen und darf darin
  // vertikal ausgerichtet werden — das ist der häufige Fall.
  if (tables.length === 0) {
    if (paras.length > 0) {
      out.push(
        textShape(nextId(), 'Inhalt', frame.x, frame.y, frame.w, frame.h, paras, {
          anchor: frame.valign === 'middle' ? 'ctr' : frame.valign === 'bottom' ? 'b' : 't',
        }),
      );
    }
    return out;
  }

  // Mit Tabelle wird der Rahmen aufgeteilt: Text oben, Tabellen darunter. Eine
  // Tabelle in PowerPoint ist ein eigener Rahmen und kann nicht im Textfluss
  // stehen — das ist eine Eigenschaft des Formats, keine Entscheidung.
  const tableHeights = tables.map((block) =>
    block.t === 'table' ? TABLE_ROW_HEIGHT * (block.table.rows.length + 1) : 0,
  );
  const tableTotal = tableHeights.reduce((sum, value) => sum + value + 16, 0);
  const textHeight = Math.max(80, frame.h - tableTotal);
  if (paras.length > 0) {
    out.push(textShape(nextId(), 'Inhalt', frame.x, frame.y, frame.w, textHeight, paras));
  }
  let y = frame.y + (paras.length > 0 ? textHeight + 16 : 0);
  tables.forEach((block, index) => {
    if (block.t !== 'table') return;
    out.push(tableShape(nextId(), frame.x, y, frame.w, tableHeights[index], block.table, bg));
    y += tableHeights[index] + 16;
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* Elemente                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Welche Elemente ihren Text als bearbeitbaren Rahmen bekommen — und damit
 * nicht als Geometrie gezeichnet werden.
 */
const TEXT_KINDS = new Set(['text', 'markdown', 'card', 'badge']);

function elementShapes(
  element: CanvasElement,
  bg: BackgroundStyle,
  nextId: IdFn,
  context: SlideContext,
  used: MediaItem[],
): string[] {
  if (element.kind === 'image') {
    const item = context.media.find((entry) => entry.src === element.src);
    if (!item) return [];
    if (!used.includes(item)) used.push(item);
    return [pictureShape(nextId(), element, used.indexOf(item) + 1)];
  }

  /*
     Bei `text` und `markdown` wird die Geometrie an einer *leeren* Fassung des
     Elements erzeugt. Sonst kämen die Beigaben des Setzers mit —
     Tabellenlinien, Code-Platten, Zitatbalken —, und die stünden dort, wo der
     Umbruch auf der Fläche lag, nicht dort, wo PowerPoint ihn setzt: Linien
     quer durch die Schrift.

     Karten sind ausgenommen. Ihr Icon, der Signalbalken und das Ziffernquadrat
     sind Gestaltung, nicht Satz, und sollen bleiben.
  */
  const source: CanvasElement =
    element.kind === 'text'
      ? { ...element, text: '' }
      : element.kind === 'markdown'
        ? { ...element, markdown: '' }
        : element;
  const prims = buildElementPrims(source, bg);
  const geometry = prims.filter((prim) => prim.t !== 'text');
  const out: string[] = [];

  // Alles Gezeichnete zuerst — Rahmen, Schatten, Icon, Verbinder.
  for (const prim of geometry) {
    const shape = primToShape(prim, nextId, element.rotation);
    if (shape) out.push(shape);
  }

  // Dann der Text, als eigener Rahmen darüber.
  if (TEXT_KINDS.has(element.kind)) {
    const paras = elementParagraphs(element, bg);
    if (paras.length > 0) {
      const box = textBox(element);
      out.push(
        textShape(nextId(), element.name ?? element.kind, box.x, box.y, box.w, box.h, paras, {
          anchor: anchorOf(element),
          rotation: element.rotation,
          opacity: element.opacity,
        }),
      );
    }
    // Die Ziffer einer Schritt-Karte sitzt im grünen Quadrat und ist dort
    // Gestaltung, nicht Fließtext — sie bekommt ihren eigenen Rahmen.
    if (element.kind === 'card' && element.variant === 'step') {
      out.push(
        textShape(
          nextId(),
          'Schritt',
          element.x + element.padding,
          element.y + element.padding + 10,
          STEP_SIZE,
          STEP_SIZE,
          [inlineToParagraph(element.label?.trim() || '1', 'h3', { align: 'ctr' })],
          { anchor: 't', rotation: element.rotation, opacity: element.opacity },
        ),
      );
    }
  }

  return out;
}

/** Die Kantenlänge des Ziffernquadrats einer Schritt-Karte (siehe `scene.ts`). */
const STEP_SIZE = 44;

/**
 * Wo der Textrahmen eines Elements sitzt.
 *
 * Die Werte spiegeln `cardScene()` in `scene.ts`: dort wird das Icon, der
 * Signalbalken oder das Ziffernquadrat gezeichnet, und der Text beginnt
 * darunter beziehungsweise daneben. Stünde der Rahmen hier einfach am
 * Innenrand, läge die Überschrift auf dem Icon.
 */
function textBox(element: CanvasElement): { x: number; y: number; w: number; h: number } {
  const pad = Math.max(element.padding, 0);
  let left = pad;
  let top = pad;

  if (element.kind === 'card') {
    switch (element.variant) {
      case 'note':
        // Der Signalbalken steht links, das Icon darüber.
        left = pad + 4;
        top = pad + (element.icon ? 28 + 7 : 0);
        break;
      case 'feature':
        top = pad + (element.icon ? 40 + 12 : 0);
        break;
      case 'stat':
        break;
      case 'step':
        top = pad + STEP_SIZE + 12;
        break;
      default:
        break;
    }
  } else if (element.kind === 'badge' && element.icon) {
    // Das Icon steht vor dem Text; der Rahmen fängt dahinter an.
    const size = typeScale.labelSmall.size;
    left = pad + size * 1.6 + size * 0.6;
  }

  return {
    x: element.x + left,
    y: element.y + top,
    w: Math.max(24, element.w - left - pad),
    h: Math.max(16, element.h - top - pad),
  };
}

function anchorOf(element: CanvasElement): 'square' | 't' | 'ctr' | 'b' {
  if (element.kind === 'badge') return 'ctr';
  if (element.kind === 'text') {
    return element.valign === 'middle' ? 'ctr' : element.valign === 'bottom' ? 'b' : 't';
  }
  if (element.kind === 'card') return 't';
  return 't';
}

function elementParagraphs(element: CanvasElement, bg: BackgroundStyle): Paragraph[] {
  const paint = elementPaint(element, bg);
  const palette = { text: paint.text, muted: paint.muted, accent: paint.text };

  switch (element.kind) {
    case 'text': {
      const align = element.align === 'center' ? 'ctr' : element.align === 'right' ? 'r' : 'l';
      return element.text
        .split(/\n{2,}/)
        .filter((part) => part.trim())
        .map((part) => inlineToParagraph(part, element.typeStyle, { color: paint.text, align }));
    }

    case 'markdown':
      return markdownToParagraphs(element.markdown, {
        palette,
        baseStyle: 'small',
        scale: 1,
      });

    case 'badge':
      return [inlineToParagraph(element.text, 'labelSmall', { color: paint.text, align: 'ctr' })];

    case 'card': {
      // Stufen und Abstände wie in `cardScene()`: Label, dann +6, Titel,
      // dann +8, Fließtext in der gedämpften Tinte.
      const out: Paragraph[] = [];
      if (element.label && element.variant !== 'step') {
        out.push(inlineToParagraph(element.label, 'label', { color: paint.muted }));
      }
      if (element.title) {
        const style = element.variant === 'stat' ? 'headline' : 'h4';
        out.push({
          ...inlineToParagraph(element.title, style, { color: paint.text }),
          spaceBefore: out.length > 0 ? 6 : 0,
        });
      }
      if (element.body) {
        out.push(
          ...markdownToParagraphs(element.body, {
            palette: { ...palette, text: paint.muted },
            baseStyle: 'small',
          }).map((para, index) => ({
            ...para,
            spaceBefore: index === 0 ? (out.length > 0 ? 8 : 0) : para.spaceBefore,
          })),
        );
      }
      return out;
    }

    default:
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Primitive → Form                                                            */
/* -------------------------------------------------------------------------- */

function primToShape(prim: ScenePrim, nextId: IdFn, rotation: number): string | null {
  switch (prim.t) {
    case 'rect':
      return segsShape(
        nextId(),
        [
          { c: 'M', x: prim.x, y: prim.y },
          { c: 'L', x: prim.x + prim.w, y: prim.y },
          { c: 'L', x: prim.x + prim.w, y: prim.y + prim.h },
          { c: 'L', x: prim.x, y: prim.y + prim.h },
          { c: 'Z' },
        ],
        prim,
        true,
        rotation,
      );

    case 'ellipse':
      return ellipseShape(nextId(), prim, rotation);

    case 'path':
      return segsShape(nextId(), prim.segs, prim, prim.closed, rotation);

    default:
      return null;
  }
}

interface PaintLike {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round';
}

/**
 * Eine Segmentliste als `a:custGeom`.
 *
 * Der Pfad-Koordinatenraum (`a:path w= h=`) wird auf die Ausdehnung der Form
 * gelegt, damit PowerPoint beim Ziehen an den Griffen sauber skaliert. Alle
 * Teilkonturen liegen in **einem** `a:path` — mehrere `a:path`-Elemente wären
 * mehrere Flächen, und ein Ring würde zur Scheibe. Dieselbe Falle wie im PDF.
 */
function segsShape(
  id: number,
  segs: readonly Seg[],
  paint: PaintLike,
  closed: boolean,
  rotation: number,
): string | null {
  if (segs.length === 0) return null;
  const box = segsBounds(segs);
  if (!Number.isFinite(box.w) || !Number.isFinite(box.h)) return null;

  // Eine Linie hat keine Fläche; ohne Mindestmaß wäre die Form nicht greifbar.
  const w = Math.max(box.w, 1);
  const h = Math.max(box.h, 1);
  const pw = emu(w);
  const ph = emu(h);

  const commands: string[] = [];
  for (const seg of segs) {
    const px = (x: number) => Math.round(((x - box.x) / w) * pw);
    const py = (y: number) => Math.round(((y - box.y) / h) * ph);
    switch (seg.c) {
      case 'M':
        commands.push(`<a:moveTo><a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:moveTo>`);
        break;
      case 'L':
        commands.push(`<a:lnTo><a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:lnTo>`);
        break;
      case 'C':
        commands.push(
          `<a:cubicBezTo><a:pt x="${px(seg.x1)}" y="${py(seg.y1)}"/>` +
            `<a:pt x="${px(seg.x2)}" y="${py(seg.y2)}"/>` +
            `<a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:cubicBezTo>`,
        );
        break;
      case 'Z':
        commands.push('<a:close/>');
        break;
    }
  }
  if (commands.length === 0) return null;

  const geom =
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>' +
    `<a:pathLst><a:path w="${pw}" h="${ph}" fill="${closed && paint.fill ? 'norm' : 'none'}">` +
    commands.join('') +
    '</a:path></a:pathLst></a:custGeom>';

  return shape(id, 'Form', {
    x: box.x,
    y: box.y,
    w,
    h,
    rotation,
    geometry: geom,
    fill: closed ? paint.fill : undefined,
    line: lineXml(paint),
    opacity: paint.opacity,
  });
}

function ellipseShape(
  id: number,
  prim: Extract<ScenePrim, { t: 'ellipse' }>,
  rotation: number,
): string {
  return shape(id, 'Ellipse', {
    x: prim.cx - prim.rx,
    y: prim.cy - prim.ry,
    w: prim.rx * 2,
    h: prim.ry * 2,
    rotation,
    geometry: '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>',
    fill: prim.fill,
    line: lineXml(prim),
    opacity: prim.opacity,
  });
}

function lineXml(paint: PaintLike): string {
  const color = paint.stroke ? parseColor(paint.stroke) : null;
  if (!color || color.a === 0 || !(paint.strokeWidth && paint.strokeWidth > 0)) {
    return '<a:ln><a:noFill/></a:ln>';
  }
  const cap = paint.lineCap === 'round' ? 'rnd' : paint.lineCap === 'square' ? 'sq' : 'flat';
  const join = paint.lineJoin === 'round' ? '<a:round/>' : '<a:miter lim="800000"/>';
  const dash = paint.dash?.length ? '<a:prstDash val="dash"/>' : '<a:prstDash val="solid"/>';
  return (
    `<a:ln w="${emu(paint.strokeWidth)}" cap="${cap}">` +
    solidFill(paint.stroke!) +
    dash +
    join +
    '</a:ln>'
  );
}

/* -------------------------------------------------------------------------- */
/* Formen-Grundgerüst                                                          */
/* -------------------------------------------------------------------------- */

interface ShapeSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  geometry: string;
  fill?: string;
  line?: string;
  opacity?: number;
  body?: string;
}

function shape(id: number, name: string, spec: ShapeSpec): string {
  return [
    '<p:sp>',
    `<p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(`${name} ${id}`)}"/>`,
    '<p:cNvSpPr/><p:nvPr/></p:nvSpPr>',
    '<p:spPr>',
    xfrm(spec.x, spec.y, spec.w, spec.h, spec.rotation),
    spec.geometry,
    spec.fill ? solidFill(spec.fill, spec.opacity) : '<a:noFill/>',
    spec.line ?? '<a:ln><a:noFill/></a:ln>',
    '</p:spPr>',
    spec.body ?? emptyBody(),
    '</p:sp>',
  ].join('');
}

function xfrm(x: number, y: number, w: number, h: number, rotation?: number): string {
  // PowerPoint dreht um die Mitte der Form, in 60000steln eines Grades.
  const rot = rotation ? ` rot="${Math.round(((rotation % 360) + 360) % 360) * 60000}"` : '';
  return (
    `<a:xfrm${rot}><a:off x="${emu(x)}" y="${emu(y)}"/>` +
    `<a:ext cx="${Math.max(1, emu(w))}" cy="${Math.max(1, emu(h))}"/></a:xfrm>`
  );
}

function emptyBody(): string {
  return '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="de-DE"/></a:p></p:txBody>';
}

function solidFill(color: string, opacity?: number): string {
  const parsed = parseColor(color);
  if (!parsed || parsed.a === 0) return '<a:noFill/>';
  const hex = toHex(parsed);
  const alpha = (parsed.a ?? 1) * (opacity ?? 1);
  const alphaXml = alpha < 1 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : '';
  return `<a:solidFill><a:srgbClr val="${hex}">${alphaXml}</a:srgbClr></a:solidFill>`;
}

/** Eine Farbe als `<a:srgbClr>` — ohne Deckkraft, für Stellen, die keine kennen. */
function srgb(color: string): string {
  const parsed = parseColor(color);
  return `<a:srgbClr val="${parsed ? toHex(parsed) : '000000'}"/>`;
}

function toHex(color: { r: number; g: number; b: number }): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `${part(color.r)}${part(color.g)}${part(color.b)}`.toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Textrahmen                                                                  */
/* -------------------------------------------------------------------------- */

interface TextShapeOptions {
  anchor?: 'square' | 't' | 'ctr' | 'b';
  rotation?: number;
  opacity?: number;
}

/**
 * Ein freier Textrahmen.
 *
 * `<p:cNvSpPr txBox="1"/>` ohne `<p:ph>` im `nvPr` ist der Unterschied zwischen
 * „Textfeld" und „Platzhalter": ein Platzhalter erbt Format und Position vom
 * Layout und lässt sich schlecht verschieben, ein Textfeld gehört der Folie.
 *
 * `<a:noAutofit/>` heißt: PowerPoint bricht um, verändert aber die
 * Schriftgröße nicht. `<a:normAutofit/>` würde beim Bearbeiten heimlich
 * verkleinern und damit die Typo-Hierarchie der Marke aushebeln.
 */
function textShape(
  id: number,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paras: readonly Paragraph[],
  options: TextShapeOptions = {},
): string {
  const anchor = options.anchor ?? 't';
  return [
    '<p:sp>',
    `<p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(`${name} ${id}`)}"/>`,
    '<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>',
    '<p:spPr>',
    xfrm(x, y, w, h, options.rotation),
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
    '<a:noFill/><a:ln><a:noFill/></a:ln>',
    '</p:spPr>',
    '<p:txBody>',
    `<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${anchor}">` +
      '<a:noAutofit/></a:bodyPr>',
    '<a:lstStyle/>',
    paras.map((para) => paragraphXml(para, options.opacity)).join(''),
    '</p:txBody>',
    '</p:sp>',
  ].join('');
}

/** Die automatische Foliennummer — `a:fld` statt einer festen Zahl. */
function slideNumberShape(
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  [current, total]: [number, number],
): string {
  // Dasselbe `rPr` wie ein gewöhnlicher Lauf — insbesondere ohne positive
  // Laufweite, siehe `runXml()`.
  const style = typeScale.labelSmall;
  const rPr =
    `<a:rPr lang="de-DE" sz="${pt100(style.size)}" b="1">` +
    solidFill(color) +
    `<a:latin typeface="${escapeXml(faceName('mono'))}"/></a:rPr>`;
  return [
    '<p:sp>',
    `<p:nvSpPr><p:cNvPr id="${id}" name="Foliennummer"/><p:cNvSpPr txBox="1"/>`,
    '<p:nvPr/></p:nvSpPr>',
    '<p:spPr>',
    xfrm(x, y, w, h),
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>',
    '</p:spPr>',
    '<p:txBody>',
    // `wrap="square"` wie bei der Fußzeile. Mit `wrap="none"` schneidet
    // LibreOffice die letzte Ziffer ab — es misst die Zeile dann anders, als
    // es sie zeichnet.
    '<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t">' +
      '<a:noAutofit/></a:bodyPr>',
    '<a:lstStyle/>',
    '<a:p><a:pPr algn="r"/>',
    `<a:fld id="{B4D2AA1E-5F1C-4E2B-9C3F-${String(id).padStart(12, '0')}}" type="slidenum">`,
    rPr,
    `<a:t>${current}</a:t></a:fld>`,
    `<a:r>${rPr}<a:t> / ${total}</a:t></a:r>`,
    '</a:p>',
    '</p:txBody>',
    '</p:sp>',
  ].join('');
}

const BULLET_CHAR: Record<Exclude<BulletKind, 'none' | 'number'>, string> = {
  // Ein Quadrat, kein Punkt — die CI kennt keine runden Formen.
  square: '■',
  check: '✓',
  unchecked: '□',
};

function paragraphXml(para: Paragraph, opacity?: number): string {
  const size = para.runs[0]?.font.size ?? typeScale.body.size;
  const indent = para.level * 24 + (para.bullet === 'none' ? 0 : 0);
  const hanging = para.bullet === 'none' ? 0 : Math.round(size * 1.1);

  const props: string[] = [];
  if (para.align !== 'l') props.push(`algn="${para.align}"`);
  if (indent + hanging > 0) props.push(`marL="${emu(indent + hanging)}"`);
  if (hanging > 0) props.push(`indent="${emu(-hanging)}"`);

  const inner: string[] = [];
  /*
     Zeilenabstand absolut, nicht in Prozent.

     `<a:spcPct>` ist ein Prozentsatz des *natürlichen* Zeilenabstands der
     Schrift — und der liegt je nach Schnitt bei 1,2 bis 1,4 der Schriftgröße.
     Die CI gibt den Abstand aber als Vielfaches der Schriftgröße an. 155 %
     hieße in PowerPoint rund 1,9 em statt 1,55 em, und eine Karte, die auf der
     Fläche passt, läuft über.

     `<a:spcPts>` nennt den Abstand in Hundertstel Punkt und trifft damit
     genau. Der Preis: wer die Schriftgröße im Nachhinein ändert, muss den
     Abstand mit ändern. Wer Text ergänzt, merkt nichts — und das ist der Fall,
     der zählt.
  */
  inner.push(`<a:lnSpc><a:spcPts val="${pt100(para.lineHeight * size)}"/></a:lnSpc>`);
  if (para.spaceBefore > 0) {
    inner.push(`<a:spcBef><a:spcPts val="${pt100(para.spaceBefore)}"/></a:spcBef>`);
  }
  if (para.bullet === 'none') {
    inner.push('<a:buNone/>');
  } else if (para.bullet === 'number') {
    inner.push('<a:buAutoNum type="arabicPeriod"/>');
  } else {
    inner.push(
      `<a:buFont typeface="Arial"/><a:buChar char="${escapeXml(BULLET_CHAR[para.bullet])}"/>`,
    );
  }

  const pPr = `<a:pPr${props.length ? ` ${props.join(' ')}` : ''}>${inner.join('')}</a:pPr>`;

  /*
     Ein erzwungener Umbruch (`<br>` im Markdown) wird `<a:br/>` — ein
     Absatzwechsel wäre er nicht, der Absatz gehört zusammen. Läufe ohne Text
     fallen weg; sie tragen sonst nur ein leeres `<a:t/>` ins Dokument.
  */
  const pieces = para.runs
    .map((run) => (run.hardBreak ? '<a:br/>' : run.text ? runXml(run, para, opacity) : ''))
    .filter(Boolean);

  if (pieces.length === 0) {
    return `<a:p>${pPr}<a:endParaRPr lang="de-DE" sz="${pt100(size)}"/></a:p>`;
  }
  return `<a:p>${pPr}${pieces.join('')}</a:p>`;
}

function runXml(run: StyledRun, para: Paragraph, opacity?: number): string {
  const attrs = [`lang="de-DE"`, `sz="${pt100(run.font.size)}"`];
  if (run.font.weight >= 600) attrs.push('b="1"');
  if (run.font.italic || para.quote) attrs.push('i="1"');
  if (run.underline) attrs.push('u="sng"');
  if (run.strike) attrs.push('strike="sngStrike"');
  // Laufweite nur, wenn sie enger stellt.
  //
  // `spc` ist gültiges OOXML und PowerPoints eigene Zeichenabstand-Funktion
  // schreibt genau das. LibreOffice reserviert aber die *ungesperrte* Breite
  // und schneidet die gesperrte Zeile darauf ab — aus „ICONS" wird „ICON",
  // aus der Fußzeile ein Satzfragment. Bei negativer Laufweite (die
  // Kampagnen-Überschriften der CI) tritt das nicht auf, weil die Zeile dann
  // schmaler wird als reserviert.
  //
  // Abgeschnittener Text ist der schlimmere Fehler als fehlende Sperrung.
  // Deshalb verliert das PPTX die 0,12 em der Mono-Labels; sie bleiben
  // Versalien in Space Mono Bold und damit als Label erkennbar.
  if (run.font.tracking < 0) {
    attrs.push(`spc="${pt100(run.font.tracking * run.font.size)}"`);
  }

  const parts: string[] = [solidFill(run.color, opacity)];
  // Der Marker der CI ist in PPTX eine Texthervorhebung — damit bleibt er am
  // Wort kleben, auch wenn der Umbruch sich verschiebt. Eine Fläche darunter
  // täte das nicht.
  //
  // Die Farbe wird beim Schreiben gelesen und stand hier einmal als Grün im
  // Klartext. Das fiel erst auf, als ein Kunde mit orangem Signal exportierte
  // und in der .pptx grüne Marker standen — im SVG und im PDF nicht, weil die
  // über die Szene laufen und nicht über diese Zeile.
  if (run.mark) parts.push(`<a:highlight>${srgb(palette.signal)}</a:highlight>`);
  parts.push(`<a:latin typeface="${escapeXml(faceName(run.font.family))}"/>`);
  parts.push(`<a:cs typeface="${escapeXml(faceName(run.font.family))}"/>`);

  return (
    `<a:r><a:rPr ${attrs.join(' ')}>${parts.join('')}</a:rPr>` +
    `<a:t>${escapeXml(flattenWhitespace(run.text))}</a:t></a:r>`
  );
}

/**
 * Zeilenumbrüche und Tabulatoren im Lauf zu Leerzeichen.
 *
 * In `<a:t>` ist Weißraum bedeutsam: ein rohes `\n` aus einem weichen
 * Markdown-Umbruch würde in PowerPoint als echter Zeilenwechsel erscheinen.
 * Auf der Fläche wird derselbe Umbruch zum Leerzeichen, weil der Setzer ihn
 * beim Umbrechen einebnet — und daran hat sich der Export zu halten.
 */
function flattenWhitespace(text: string): string {
  return text.replace(/[\r\n\t]+/g, ' ');
}

/* -------------------------------------------------------------------------- */
/* Tabelle                                                                     */
/* -------------------------------------------------------------------------- */

/** Mindesthöhe einer Tabellenzeile in Folien-Einheiten. */
export const TABLE_ROW_HEIGHT = 40;

function tableShape(
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  table: TableModel,
  bg: BackgroundStyle,
): string {
  const columns = Math.max(1, table.header.length);
  const columnWidth = Math.floor(emu(w) / columns);
  // `a:tr h` ist für PowerPoint eine *Mindest*höhe — eine Zeile mit
  // umbrechendem Text wächst darüber hinaus. Eine geratene Aufteilung der
  // Rahmenhöhe wäre deshalb falsch: sie würde Zeilen zu flach machen und die
  // Linien mitten durch die Schrift legen.
  const rowHeight = emu(TABLE_ROW_HEIGHT);

  const cell = (runs: StyledRun[], header: boolean): string => {
    const para: Paragraph = {
      runs,
      level: 0,
      bullet: 'none',
      align: 'l',
      spaceBefore: 0,
      lineHeight: 1.3,
    };
    return (
      '<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>' +
      paragraphXml(para) +
      '</a:txBody>' +
      // `a:tcPr` ist im Schema eine *Sequenz*: erst die Linien (lnL, lnR,
      // lnT, lnB), dann die Füllung. Umgekehrt ist die Datei ungültig.
      '<a:tcPr marL="45720" marR="45720" marT="27432" marB="27432" anchor="ctr">' +
      `<a:lnB w="${emu(strokeWidthOf('hair'))}" cap="flat">${solidFill(bg.line)}` +
      '<a:prstDash val="solid"/></a:lnB>' +
      (header ? solidFill(bg.codeBackground) : '<a:noFill/>') +
      '</a:tcPr></a:tc>'
    );
  };

  const rows = [
    `<a:tr h="${rowHeight}">` + table.header.map((runs) => cell(runs, true)).join('') + '</a:tr>',
    ...table.rows.map(
      (row) =>
        `<a:tr h="${rowHeight}">` +
        Array.from({ length: columns }, (_, index) => cell(row[index] ?? [], false)).join('') +
        '</a:tr>',
    ),
  ];

  return [
    '<p:graphicFrame>',
    `<p:nvGraphicFramePr><p:cNvPr id="${id}" name="Tabelle ${id}"/>`,
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>',
    '<p:nvPr/></p:nvGraphicFramePr>',
    `<p:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></p:xfrm>`,
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">',
    '<a:tbl><a:tblPr firstRow="1" bandRow="0"/>',
    '<a:tblGrid>' +
      Array.from({ length: columns }, () => `<a:gridCol w="${columnWidth}"/>`).join('') +
      '</a:tblGrid>',
    rows.join(''),
    '</a:tbl></a:graphicData></a:graphic>',
    '</p:graphicFrame>',
  ].join('');
}

/* -------------------------------------------------------------------------- */
/* Bild                                                                        */
/* -------------------------------------------------------------------------- */

function pictureShape(
  id: number,
  element: Extract<CanvasElement, { kind: 'image' }>,
  relIndex: number,
): string {
  return [
    '<p:pic>',
    `<p:nvPicPr><p:cNvPr id="${id}" name="${escapeXml(element.alt || 'Bild')}"/>`,
    '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>',
    `<p:blipFill><a:blip r:embed="rId${relIndex + 10}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`,
    '<p:spPr>',
    xfrm(element.x, element.y, element.w, element.h, element.rotation),
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
    '</p:spPr>',
    '</p:pic>',
  ].join('');
}

/* -------------------------------------------------------------------------- */
/* Notizen                                                                     */
/* -------------------------------------------------------------------------- */

function notesSlide(notes: string): string {
  const paras = notes
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => inlineToParagraph(part, 'body'));

  return [
    XML_DECL,
    `<p:notes ${NS}>`,
    '<p:cSld><p:spTree>',
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>',
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
      '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>',
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notizen"/>',
    '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>',
    '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>',
    '<p:spPr/>',
    '<p:txBody><a:bodyPr/><a:lstStyle/>',
    paras.map((para) => paragraphXml(para)).join(''),
    '</p:txBody></p:sp>',
    '</p:spTree></p:cSld>',
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>',
    '</p:notes>',
  ].join('');
}

/* -------------------------------------------------------------------------- */
/* Paket-Teile, die von der Folienzahl abhängen                                */
/* -------------------------------------------------------------------------- */

function contentTypes(slides: readonly BuiltSlide[], media: readonly MediaItem[]): string {
  const defaults = new Set(['rels', 'xml']);
  for (const item of media) defaults.add(item.ext);

  const defaultType = (ext: string) =>
    ext === 'rels'
      ? 'application/vnd.openxmlformats-package.relationships+xml'
      : ext === 'xml'
        ? 'application/xml'
        : imageContentType(ext);

  const overrides = [
    '/ppt/presentation.xml|application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
    '/ppt/presProps.xml|application/vnd.openxmlformats-officedocument.presentationml.presProps+xml',
    '/ppt/viewProps.xml|application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml',
    '/ppt/tableStyles.xml|application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml',
    '/ppt/theme/theme1.xml|application/vnd.openxmlformats-officedocument.theme+xml',
    '/ppt/theme/theme2.xml|application/vnd.openxmlformats-officedocument.theme+xml',
    '/ppt/slideMasters/slideMaster1.xml|application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
    '/ppt/slideLayouts/slideLayout1.xml|application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
    '/ppt/notesMasters/notesMaster1.xml|application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml',
    '/docProps/core.xml|application/vnd.openxmlformats-package.core-properties+xml',
    '/docProps/app.xml|application/vnd.openxmlformats-officedocument.extended-properties+xml',
  ];
  slides.forEach((slide, index) => {
    overrides.push(
      `/ppt/slides/slide${index + 1}.xml|application/vnd.openxmlformats-officedocument.presentationml.slide+xml`,
    );
    if (slide.notes) {
      overrides.push(
        `/ppt/notesSlides/notesSlide${index + 1}.xml|application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml`,
      );
    }
  });

  return (
    XML_DECL +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    [...defaults]
      .map((ext) => `<Default Extension="${ext}" ContentType="${defaultType(ext)}"/>`)
      .join('') +
    overrides
      .map((entry) => {
        const [part, type] = entry.split('|');
        return `<Override PartName="${part}" ContentType="${type}"/>`;
      })
      .join('') +
    '</Types>'
  );
}

function presentation(slideCount: number): string {
  const ids = Array.from(
    { length: slideCount },
    (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 10}"/>`,
  ).join('');
  return (
    XML_DECL +
    `<p:presentation ${NS} saveSubsetFonts="1">` +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst>' +
    `<p:sldIdLst>${ids}</p:sldIdLst>` +
    `<p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/>` +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    defaultTextStyle() +
    '</p:presentation>'
  );
}

function defaultTextStyle(): string {
  return (
    '<p:defaultTextStyle>' +
    Array.from({ length: 9 }, (_, level) => {
      const tag = `<a:lvl${level + 1}pPr marL="${level * 342900}" algn="l" rtl="0">`;
      return (
        tag +
        `<a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill>` +
        `<a:latin typeface="+mn-lt"/></a:defRPr></a:lvl${level + 1}pPr>`
      );
    }).join('') +
    '</p:defaultTextStyle>'
  );
}

function presentationRels(slideCount: number): string {
  const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rels = [
    `<Relationship Id="rId1" Type="${base}/slideMaster" Target="slideMasters/slideMaster1.xml"/>`,
    `<Relationship Id="rId2" Type="${base}/notesMaster" Target="notesMasters/notesMaster1.xml"/>`,
    `<Relationship Id="rId3" Type="${base}/presProps" Target="presProps.xml"/>`,
    `<Relationship Id="rId4" Type="${base}/viewProps" Target="viewProps.xml"/>`,
    `<Relationship Id="rId5" Type="${base}/theme" Target="theme/theme1.xml"/>`,
    `<Relationship Id="rId6" Type="${base}/tableStyles" Target="tableStyles.xml"/>`,
    ...Array.from(
      { length: slideCount },
      (_, index) =>
        `<Relationship Id="rId${index + 10}" Type="${base}/slide" Target="slides/slide${index + 1}.xml"/>`,
    ),
  ];
  return relationships(rels);
}

function slideRels(index: number, slide: BuiltSlide): string {
  const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rels = [
    `<Relationship Id="rId1" Type="${base}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`,
  ];
  if (slide.notes) {
    rels.push(
      `<Relationship Id="rId2" Type="${base}/notesSlide" Target="../notesSlides/notesSlide${index}.xml"/>`,
    );
  }
  slide.media.forEach((item, position) => {
    rels.push(
      `<Relationship Id="rId${position + 11}" Type="${base}/image" Target="../media/${item.file}"/>`,
    );
  });
  return relationships(rels);
}

function notesSlideRels(index: number): string {
  const base = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return relationships([
    `<Relationship Id="rId1" Type="${base}/notesMaster" Target="../notesMasters/notesMaster1.xml"/>`,
    `<Relationship Id="rId2" Type="${base}/slide" Target="../slides/slide${index}.xml"/>`,
  ]);
}

function coreProps(deck: Deck, options: PptxOptions): string {
  return (
    XML_DECL +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escapeXml(options.title ?? deck.meta.title)}</dc:title>` +
    `<dc:creator>${escapeXml(options.author ?? deck.meta.author ?? brand.name)}</dc:creator>` +
    `<cp:lastModifiedBy>${escapeXml(brand.product)}</cp:lastModifiedBy>` +
    '</cp:coreProperties>'
  );
}

function appProps(deck: Deck): string {
  const titles = deck.slides.map((slide, index) => slideTitle(slide, index));
  return (
    XML_DECL +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    `<Application>${escapeXml(brand.product)}</Application>` +
    `<Slides>${deck.slides.length}</Slides>` +
    '<TitlesOfParts>' +
    `<vt:vector size="${titles.length}" baseType="lpstr">` +
    titles.map((title) => `<vt:lpstr>${escapeXml(title)}</vt:lpstr>`).join('') +
    '</vt:vector></TitlesOfParts>' +
    '</Properties>'
  );
}
