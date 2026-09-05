/**
 * Image resolution for export.
 *
 * SVG can reference an image by URL, but a PDF needs the actual bytes and both
 * need intrinsic dimensions to lay Markdown figures out correctly. This module
 * loads every image a deck references once, up front, and hands back a lookup
 * the scene builder and the PDF writer share.
 */
import type { Deck } from '@/model/types';
import { escapeXml } from './svg';

export interface ResolvedImage {
  src: string;
  dataUrl: string;
  format: string;
  w: number;
  h: number;
}

export type ImageMap = Map<string, ResolvedImage>;

/* -------------------------------------------------------------------------- */
/* Was fehlt, wird gesagt                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Wohin die Nachricht geht, dass ein Bild fehlt.
 *
 * Ein Bild, das sich nicht laden lässt, darf einen Export **nicht** abbrechen —
 * ein Deck mit dreißig Folien wegen eines toten Pfades gar nicht auszugeben
 * wäre die schlechtere Lage. Bisher stand das so im Kommentar und damit war
 * die Sache erledigt: das PDF kam ohne das Bild heraus, und niemand erfuhr es.
 * Die Politik war richtig, das Schweigen nicht.
 *
 * Gemeldet wird über einen Melder und nicht durch einen Import aus dem Store:
 * `lib/` kennt `state/` nicht, und das soll so bleiben — der Ausgabeweg ist
 * eine Rechnung, keine Oberfläche. Die eine Verdrahtung steht im
 * Sitzungsstart.
 *
 * Und der Melder sitzt an der **einen** Stelle, an der Bilder geladen werden.
 * Ein sechster Ausgabeweg bekommt ihn damit umsonst — die Alternative wäre,
 * ihn in jedem Weg einzeln durchzureichen, und wie das ausgeht, steht in
 * CLAUDE.md unter „Sechs Wege ersetzten das Deck, einer fragte".
 */
export type Fehlmeldung = (fehlend: readonly string[]) => void;

let melder: Fehlmeldung | null = null;

/** Den Melder setzen; `null` schaltet ihn ab. */
export function beiFehlendenBildern(fn: Fehlmeldung | null): void {
  melder = fn;
}

/** Melden, dass diese Quellen nicht zu haben waren. */
export function meldeFehlendeBilder(fehlend: readonly string[]): void {
  if (fehlend.length > 0) melder?.(fehlend);
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

/** Every image source a deck refers to, from elements and from Markdown. */
export function collectImageSources(deck: Deck): string[] {
  const found = new Set<string>();

  const scanMarkdown = (markdown: string) => {
    for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
      if (match[1]) found.add(match[1]);
    }
  };

  for (const slide of deck.slides) {
    scanMarkdown(slide.markdown);
    /*
       Auch die Notizen: das Handout setzt sie mit `typesetMarkdown()` und
       macht aus einem `![…](…)` sehr wohl ein Bild-Primitiv. Hier fehlten sie,
       und daran hingen drei Folgen, von denen keine etwas sagte — der Setzer
       kannte die Maße nicht und nahm seinen Rückfall „volle Spaltenbreite,
       Verhältnis 0,5625" (ein 300 × 300-Bild stand mit 1104 × 621 da, und
       alles darunter rutschte), der PDF-Weg fand keinen Eintrag und stieg
       stumm aus, und als fehlend gemeldet wurde es auch nicht, weil die
       Quelle nie eingesammelt worden war.
    */
    scanMarkdown(slide.meta.notes ?? '');
    for (const element of slide.elements) {
      if (element.kind === 'image' && element.src) found.add(element.src);
      if (element.kind === 'markdown') scanMarkdown(element.markdown);
    }
  }

  return [...found];
}

/**
 * Load every source into a data URL plus its intrinsic size. Failures are
 * skipped rather than thrown — one missing image must not fail an export.
 */
export async function resolveImages(sources: readonly string[]): Promise<ImageMap> {
  const entries = await Promise.all(sources.map((src) => resolveOne(src)));
  const map: ImageMap = new Map();
  for (const entry of entries) {
    if (entry) map.set(entry.src, entry);
  }
  return map;
}

export async function resolveDeckImages(deck: Deck): Promise<ImageMap> {
  const quellen = collectImageSources(deck);
  const geladen = await resolveImages(quellen);
  meldeFehlendeBilder(quellen.filter((src) => !geladen.has(src)));
  return geladen;
}

async function resolveOne(src: string): Promise<ResolvedImage | null> {
  try {
    const image = await loadImage(src);
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    const { dataUrl, format } = src.startsWith('data:')
      ? { dataUrl: src, format: formatOf(src) }
      : rasterize(image, w, h);
    return { src, dataUrl, format, w, h };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function rasterize(
  image: HTMLImageElement,
  w: number,
  h: number,
): { dataUrl: string; format: string } {
  const surface = document.createElement('canvas');
  surface.width = Math.max(1, w);
  surface.height = Math.max(1, h);
  const context = surface.getContext('2d');
  if (!context) throw new Error('No 2-D context available for image rasterisation');
  context.drawImage(image, 0, 0);
  return { dataUrl: surface.toDataURL('image/png'), format: 'PNG' };
}

function formatOf(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  if (dataUrl.startsWith('data:image/gif')) return 'GIF';
  return 'JPEG';
}

/** A `resolveImageSize` callback for the typesetter, backed by an `ImageMap`. */
/* -------------------------------------------------------------------------- */
/* Die Maße, die auch die Fläche braucht                                       */
/* -------------------------------------------------------------------------- */

/**
 * Ein Merker allein für die **Maße** der Bilder.
 *
 * Der Export löst sie über `resolveDeckImages()` auf und rastert dabei jedes
 * Bild; die Fläche braucht das nicht — sie braucht nur Breite und Höhe, und
 * zwar dieselben. Sie hatte sie nicht: `SlideView` rief `buildSlideBackdrop()`
 * und `buildElementPrims()` **ohne** Optionen, also war `resolveImageSize`
 * undefiniert und der Setzer fiel auf „volle Spaltenbreite, Verhältnis 0,5625"
 * zurück. Ein 300 × 300 großes Logo stand auf dem Bildschirm 1104 × 621 groß
 * da und in jeder Ausgabe 300 × 300; der Absatz darunter begann auf der Fläche
 * unterhalb des Folienrands und im Export in der oberen Hälfte.
 *
 * Das widerspricht dem Satz, mit dem `SlideView` überschrieben ist: sie
 * zeichnet, indem sie *genau das Markup* einsetzt, das der SVG-Export erzeugt.
 * Ohne dieselben Maße stimmt das nicht.
 */
const masse = new Map<string, { w: number; h: number }>();
const laufend = new Set<string>();
const hoerer = new Set<() => void>();
let masseVersion = 0;

/** Das Maß eines Bildes, wenn es schon bekannt ist. */
export function bildmass(src: string): { w: number; h: number } | undefined {
  return masse.get(src);
}

export function bildmasseVersion(): number {
  return masseVersion;
}

export function subscribeBildmasse(fn: () => void): () => void {
  hoerer.add(fn);
  return () => hoerer.delete(fn);
}

/**
 * Die Maße dieser Quellen besorgen, soweit sie fehlen.
 *
 * Läuft je Quelle genau einmal — auch wenn zwanzig Folienvorschauen dieselbe
 * Datei zeigen. Ein Fehlschlag wird hier **nicht** gemeldet: das tut der
 * Export über `meldeFehlendeBilder()`, und zwar dann, wenn wirklich eine Datei
 * entsteht. Zweimal dieselbe Klage über dasselbe tote Bild wäre eine zu viel.
 */
export function fordereBildmasse(quellen: readonly string[]): void {
  for (const src of quellen) {
    if (!src || masse.has(src) || laufend.has(src)) continue;
    laufend.add(src);
    void loadImage(src)
      .then((image) => {
        masse.set(src, {
          w: image.naturalWidth || image.width,
          h: image.naturalHeight || image.height,
        });
        masseVersion += 1;
        for (const fn of hoerer) fn();
      })
      .catch(() => {
        // Ein totes Bild bleibt ohne Maß; der Setzer nimmt dann seinen
        // Rückfall, und der Export sagt Bescheid.
      })
      .finally(() => laufend.delete(src));
  }
}

export function sizeResolver(map: ImageMap) {
  return (src: string): { w: number; h: number } | undefined => {
    const entry = map.get(src);
    return entry ? { w: entry.w, h: entry.h } : undefined;
  };
}

/**
 * Verweise durch ihre Daten-URI ersetzen, damit ein SVG für sich steht.
 *
 * Maskiert wird mit **derselben** Funktion, die das Markup geschrieben hat.
 * Hier stand eine zweite, und die beiden waren sich über ein Zeichen uneinig:
 * `escapeXml()` macht aus `'` ein `&apos;`, die zweite nicht. Ein Pfad mit
 * einem Apostroph — `claude's-logo.png` — wurde deshalb gesucht, wie er nicht
 * im Markup steht, nicht gefunden und stehen gelassen. Im exportierten SVG
 * blieb ein relativer Verweis, obwohl der Dateikopf zusagt, die Datei stehe
 * für sich; und im PNG fehlte das Bild ersatzlos, weil ein über eine Blob-URL
 * geladenes SVG keine externen Ressourcen holen darf. Mit `&` im Pfad griff
 * die Ersetzung, mit `'` nicht — ein Fehler an genau einem Zeichen.
 *
 * ## Und ersetzt wird im **Attribut**, nicht im ganzen Text
 *
 * Hier stand `out.split(escapeXml(src)).join(entry.dataUrl)`, also eine
 * Zeichenkettenersetzung über das ganze Markup. Zwei Folgen, beide gemessen:
 *
 * Der Pfad wurde auch dort ersetzt, wo er **Text** ist. Eine Folie, die zeigt,
 * wie man ein Bild einbindet — also ein Codeblock mit `![Alt](logo.png)` —
 * trug danach eine Daten-URL im Fließtext, im SVG wie in jeder Ausgabe, die
 * daraus entsteht. Bei einem echten Bild sind das ein bis zwei Megabyte
 * Base64 als Fließtext.
 *
 * Und er wurde **innerhalb eines längeren Pfades** ersetzt: sind `logo.png`
 * und `bilder/logo.png` beide im Deck, wird aus dem zweiten Verweis
 * `bilder/data:image/png;base64,…`. Der Verweis ist damit tot, seine eigene
 * Daten-URL wird nie eingesetzt, und im PNG fehlt das Bild — wieder ohne ein
 * Wort, denn geladen war es ja.
 *
 * Gesucht wird deshalb der **ganze Attributwert**. Und die Daten-URL wird
 * maskiert wie jeder andere Attributwert auch: dass eine gerasterte URL nur
 * Base64 enthält, ist heute wahr und wäre morgen eine Annahme über eine
 * fremde Funktion.
 */
export function inlineImageHrefs(svg: string, map: ImageMap): string {
  const nachMarkup = new Map<string, string>();
  for (const [src, entry] of map) {
    if (src === entry.dataUrl) continue;
    nachMarkup.set(escapeXml(src), entry.dataUrl);
  }
  if (nachMarkup.size === 0) return svg;

  return svg.replace(/href="([^"]*)"/g, (ganz, wert: string) => {
    const daten = nachMarkup.get(wert);
    return daten ? `href="${escapeXml(daten)}"` : ganz;
  });
}
