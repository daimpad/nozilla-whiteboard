/**
 * Scene → PDF.
 *
 * True vector output: shapes become PDF path operators, text becomes real PDF
 * text (selectable, searchable, copy-pasteable). Nothing is rasterised except
 * bitmap images the author placed themselves.
 *
 * Schriften: die Marken-Schnitte werden **eingebettet**. jsPDF liest dafür die
 * TrueType-Fassung aus `public/fonts/` und legt nur die tatsächlich benutzten
 * Zeichen ins Dokument — eine Folie mit zwanzig Wörtern kostet ein paar Kilobyte,
 * nicht dreihundert.
 *
 * Wenn eine Schrift nicht geladen werden kann, fällt der Export auf die
 * metrisch verwandten Kernschriften zurück (`theme.config.ts#pdfFontFamily`).
 * Der Umbruch ist zu diesem Zeitpunkt längst gegen die echten
 * Bildschirm-Metriken gefallen und jede Zeile steht an einer absoluten
 * Position — der Ersatz verschiebt also nichts, er zeichnet nur die Glyphen
 * anders. Sichtbar ist das trotzdem, weshalb es der Notnagel bleibt und nicht
 * der Normalfall.
 */
import type { jsPDF } from 'jspdf';
import { brand, canvas as canvasTokens, pdfFontFamily } from '@/theme';
import { measureText, type FontFamilyKey } from '@/lib/text/measure';
import { facesFor, loadTtf, toBase64, type FaceRef } from './fontFiles';
import { glyphCoverFor, leereDeckung, splitByFace, type GlyphCover } from './glyphCover';
import { ellipseSegs, rectSegs, type Seg } from '@/lib/geometry/path';
import { parseColor, type Rgba } from './color';
import { meldeFehlendeBilder } from './images';
import type { Scene, ScenePrim, SceneRun } from './scene';

/** Slide units → PDF points. 1280×720 slide units become a 960×540 pt page. */
export const PDF_SCALE = 0.75;

export interface PdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  /** Override the slide-unit → point scale. */
  scale?: number;
  /** Bitmap data for `image` primitives, keyed by `href`. */
  images?: Map<string, { dataUrl: string; format: string; w?: number; h?: number }>;
  /**
   * Die Marken-Schriften einbetten (Vorgabe). Aus, wenn die Szene ohnehin
   * schon in Umrisse gewandelt wurde — dann gibt es keinen Text mehr, den eine
   * Schrift tragen müsste.
   */
  embedFonts?: boolean;
}

/**
 * Welcher eingebettete Schnitt für welche Rolle und welches Gewicht zuständig
 * ist. Wird pro Dokument aufgebaut; leer, wenn nichts eingebettet werden konnte.
 */
type FontMap = Map<string, { name: string; style: string }>;

const fontKey = (family: FontFamilyKey, weight: number) => `${family}|${weight}`;

/**
 * Die benutzten Schnitte in das Dokument legen.
 *
 * Fehlschläge sind kein Abbruch: kommt eine Datei nicht an, bleibt der Eintrag
 * einfach aus der Karte, und `drawText` nimmt für diesen Lauf die Kernschrift.
 * Ein PDF mit ersetzter Schrift ist besser als gar keins.
 */
async function embedFaces(
  doc: jsPDF,
  scenes: readonly Scene[],
  cover: GlyphCover,
): Promise<FontMap> {
  const specs = scenes.flatMap((scene) =>
    scene.prims.flatMap((prim) => (prim.t === 'text' ? prim.runs.map((run) => run.font) : [])),
  );
  const map: FontMap = new Map();
  if (specs.length === 0) return map;

  // Eingebettet wird, was die Deckung nennt — also auch der Ersatzschnitt für
  // ein `⌘`, das in keinem anderen Lauf vorkommt. Ohne ihn stünde im PDF
  // wieder ein fremdes Zeichen.
  const gebraucht = new Map<string, FaceRef>();
  for (const face of [...facesFor(specs), ...cover.faces]) gebraucht.set(face.id, face);

  const loaded = await Promise.all(
    [...gebraucht.values()].map(async (face): Promise<[FaceRef, ArrayBuffer] | null> => {
      try {
        return [face, await loadTtf(face)];
      } catch (error) {
        console.warn(`Schrift ${face.id} nicht einbettbar — PDF nimmt die Kernschrift.`, error);
        return null;
      }
    }),
  );

  for (const entry of loaded) {
    if (!entry) continue;
    const [face, bytes] = entry;
    const fileName = `${face.id}.ttf`;
    doc.addFileToVFS(fileName, toBase64(bytes));
    // Jeder Schnitt bekommt einen eigenen Namen unter `normal`. jsPDF würde
    // `bold` sonst als Synthese verstehen und den Strich künstlich verdicken —
    // die Marke hat für jedes Gewicht eine eigene Datei, die soll auch greifen.
    doc.addFont(fileName, face.id, 'normal');
    map.set(fontKey(face.role, face.weight), { name: face.id, style: 'normal' });
  }

  // Jede angefragte Kombination auf den Schnitt zeigen lassen, der sie trägt.
  for (const spec of specs) {
    const key = fontKey(spec.family, spec.weight);
    if (map.has(key)) continue;
    const face = facesFor([spec])[0];
    const target = face ? map.get(fontKey(face.role, face.weight)) : undefined;
    if (target) map.set(key, target);
  }

  return map;
}

/**
 * jsPDF is loaded on demand: it is by far the heaviest dependency, and a deck
 * that is never exported should not pay for it at boot.
 */
export async function scenesToPdf(
  scenes: readonly Scene[],
  options: PdfOptions = {},
): Promise<jsPDF> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const scale = options.scale ?? PDF_SCALE;
  /*
     Das Seitenmaß kommt aus der **Szene** und nicht aus den Folienmaßen der
     CI. Beide waren dasselbe, solange jede Seite eine Folie war; das Handout
     ist es nicht — es ist so breit wie die Folie und mal Wurzel zwei hoch.
     Wer hier die Tokens liest, druckt die Notizen über den Rand hinaus.
  */
  const massDer = (scene: Scene | undefined) => ({
    w: (scene?.width ?? canvasTokens.width) * scale,
    h: (scene?.height ?? canvasTokens.height) * scale,
  });
  const erste = massDer(scenes[0]);

  const doc = new JsPdf({
    orientation: erste.w >= erste.h ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [erste.w, erste.h],
    compress: true,
  });

  doc.setProperties({
    title: options.title ?? scenes[0]?.title ?? brand.product,
    author: options.author ?? brand.name,
    subject: options.subject ?? '',
    creator: brand.product,
  });

  /*
     Ohne Einbettung gibt es nichts zu decken.

     Dann schreibt das PDF in die Kernschriften des Betrachters, und welcher
     Marken-Schnitt ein Zeichen führt, spielt keine Rolle mehr. Die Deckung
     dafür aufzubauen hiesse, Schriftdateien zu laden, die niemand benutzt.
  */
  const cover = options.embedFonts === false ? leereDeckung() : await glyphCoverFor(scenes);
  const fonts = options.embedFonts === false ? new Map() : await embedFaces(doc, scenes, cover);

  scenes.forEach((scene, index) => {
    const mass = massDer(scene);
    if (index > 0) doc.addPage([mass.w, mass.h], mass.w >= mass.h ? 'landscape' : 'portrait');
    drawScene(doc, scene, scale, options, fonts, cover);
  });

  return doc;
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                     */
/* -------------------------------------------------------------------------- */

function drawScene(
  doc: jsPDF,
  scene: Scene,
  scale: number,
  options: PdfOptions,
  fonts: FontMap,
  cover: GlyphCover,
): void {
  const backdrop = parseColor(scene.background) ?? { r: 255, g: 255, b: 255, a: 1 };
  let currentOpacity = 1;

  const setOpacity = (value: number) => {
    const next = Math.min(1, Math.max(0, value));
    if (Math.abs(next - currentOpacity) < 0.001) return;
    currentOpacity = next;
    // jsPDF exposes the graphics-state constructor on the instance.
    const GStateCtor = (
      doc as unknown as {
        GState?: new (options: Record<string, unknown>) => unknown;
      }
    ).GState;
    if (GStateCtor) {
      doc.setGState(new GStateCtor({ opacity: next, 'stroke-opacity': next }) as never);
    }
  };

  for (const prim of scene.prims) {
    switch (prim.t) {
      case 'rect':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, rectToSegs(prim), prim, scale, backdrop);
        break;
      case 'ellipse':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, ellipseToSegs(prim), prim, scale, backdrop);
        break;
      case 'path':
        setOpacity(prim.opacity ?? 1);
        drawSegs(doc, prim.segs, prim, scale, backdrop, prim.closed);
        break;
      case 'text':
        drawText(doc, prim, scale, fonts, cover, setOpacity);
        break;
      case 'image':
        setOpacity(prim.opacity ?? 1);
        drawImage(doc, prim, scale, options);
        break;
    }
  }

  setOpacity(1);
}

interface PaintLike {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round';
}

function drawSegs(
  doc: jsPDF,
  segs: readonly Seg[],
  paint: PaintLike,
  scale: number,
  backdrop: Rgba,
  closed = true,
): void {
  const fill = paint.fill ? parseColor(paint.fill) : null;
  const strokeColor = paint.stroke ? parseColor(paint.stroke) : null;
  const strokeWidth = paint.strokeWidth ?? 0;

  const hasFill = Boolean(fill && fill.a > 0 && closed);
  const hasStroke = Boolean(strokeColor && strokeColor.a > 0 && strokeWidth > 0);
  if (!hasFill && !hasStroke) return;

  if (fill && hasFill) {
    const flat = fill.a < 1 ? blend(fill, backdrop) : fill;
    doc.setFillColor(flat.r, flat.g, flat.b);
  }
  if (strokeColor && hasStroke) {
    const flat = strokeColor.a < 1 ? blend(strokeColor, backdrop) : strokeColor;
    doc.setDrawColor(flat.r, flat.g, flat.b);
    doc.setLineWidth(strokeWidth * scale);
    // Die CI zeichnet mit square caps; jsPDF kennt genau diese drei.
    doc.setLineCap(paint.lineCap ?? 'butt');
    doc.setLineJoin(paint.lineJoin === 'round' ? 'round' : 'miter');
    doc.setLineDashPattern(paint.dash ? paint.dash.map((n) => n * scale) : [], 0);
  }

  const style = hasFill && hasStroke ? 'FD' : hasFill ? 'F' : 'S';

  /*
     Alle Teilkonturen bilden *einen* Pfad, und der wird genau einmal gemalt.
     Das ist keine Sparmaßnahme, sondern die Bedingung dafür, dass Löcher
     Löcher bleiben: PDF entscheidet über die Nonzero-Regel, welche Fläche
     innen liegt, und die kann nur über einen gemeinsamen Pfad greifen. Jede
     Kontur einzeln zu füllen macht aus dem „o" einen schwarzen Klecks — und
     seit Text als Umriss exportiert werden kann, ist das kein Randfall mehr,
     sondern jeder zweite Buchstabe.

     jsPDF nimmt dafür `null` als Stil: dann konstruiert `lines()` nur und malt
     nicht. Der letzte Aufruf trägt den echten Stil und schließt den Pfad ab.
  */
  const subpaths = splitSubpaths(segs).filter((subpath) => subpath.legs.length > 0);
  subpaths.forEach((subpath, index) => {
    doc.lines(
      subpath.legs,
      subpath.start.x * scale,
      subpath.start.y * scale,
      [scale, scale],
      index === subpaths.length - 1 ? style : null,
      subpath.closed,
    );
  });

  if (paint.dash) doc.setLineDashPattern([], 0);
}

/**
 * Split a normalised segment list into subpaths whose legs are expressed the
 * way jsPDF's `lines()` wants them: deltas from the current point, in *unscaled*
 * units (the `scale` argument does the conversion).
 */
export function splitSubpaths(
  segs: readonly Seg[],
): Array<{ start: { x: number; y: number }; legs: number[][]; closed: boolean }> {
  const out: Array<{ start: { x: number; y: number }; legs: number[][]; closed: boolean }> = [];
  let current: { start: { x: number; y: number }; legs: number[][]; closed: boolean } | null = null;
  let cx = 0;
  let cy = 0;

  for (const seg of segs) {
    switch (seg.c) {
      case 'M':
        if (current) out.push(current);
        current = { start: { x: seg.x, y: seg.y }, legs: [], closed: false };
        cx = seg.x;
        cy = seg.y;
        break;
      case 'L':
        if (!current) {
          current = { start: { x: cx, y: cy }, legs: [], closed: false };
        }
        current.legs.push([seg.x - cx, seg.y - cy]);
        cx = seg.x;
        cy = seg.y;
        break;
      case 'C':
        if (!current) {
          current = { start: { x: cx, y: cy }, legs: [], closed: false };
        }
        current.legs.push([
          seg.x1 - cx,
          seg.y1 - cy,
          seg.x2 - cx,
          seg.y2 - cy,
          seg.x - cx,
          seg.y - cy,
        ]);
        cx = seg.x;
        cy = seg.y;
        break;
      case 'Z':
        if (current) {
          current.closed = true;
          out.push(current);
          cx = current.start.x;
          cy = current.start.y;
          current = null;
        }
        break;
    }
  }

  if (current) out.push(current);
  return out;
}

function rectToSegs(prim: Extract<ScenePrim, { t: 'rect' }>): Seg[] {
  return rectSegs(prim.x, prim.y, prim.w, prim.h, 0);
}

function ellipseToSegs(prim: Extract<ScenePrim, { t: 'ellipse' }>): Seg[] {
  return ellipseSegs(prim.cx, prim.cy, prim.rx, prim.ry);
}

/* -------------------------------------------------------------------------- */
/* Text                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Ein Textprimitiv.
 *
 * Die Deckkraft eines Laufs geht über die GState und **nicht** über das
 * Verrechnen gegen den Folienuntergrund. Der Kopf von `flatten()` begründet
 * das Abflachen für Flächen — überlappende Teilpfade würden sich an den
 * Stoßstellen doppelt verdunkeln —, und für Striche gilt das weiter. Für Text
 * gilt es nicht, und dort war es falsch: die CI baut ihre Hierarchie über
 * Farben mit Deckkraft (`elementTones.ink.textMuted` ist Papier bei 64 %), und
 * auf einer hellen Folie steht die dunkle Karte dazwischen. Gegen den *hellen*
 * Untergrund gerechnet wurde daraus ein sehr helles Grau auf schwarzer Karte —
 * gemessen unlesbar, während SVG und `.pptx` denselben Text richtig zeigten.
 */
function drawText(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'text' }>,
  scale: number,
  fonts: FontMap,
  cover: GlyphCover,
  setOpacity: (value: number) => void,
): void {
  const angleDeg = prim.rotate ?? 0;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (const run of prim.runs) {
    if (!run.text) continue;
    const color = parseColor(run.color);
    if (!color || color.a === 0) continue;

    setOpacity((prim.opacity ?? 1) * color.a);
    doc.setFontSize(run.font.size * scale);
    doc.setTextColor(color.r, color.g, color.b);

    /*
       Ein Lauf kann mehr als einen Schnitt brauchen.

       `doc.text()` kennt genau eine Schrift, und ein `⌘` mitten in einem
       Space-Mono-Lauf muss aus Inter kommen — Space Mono führt das Zeichen
       nicht. Vorher schrieb jsPDF es trotzdem in die eingebettete Schrift,
       und im Betrachter stand ein fremdes Zeichen: aus `⌘D` wurde `#D`.

       Der Normalfall bleibt *ein* Stück, also ein einziger `doc.text`-Aufruf
       wie zuvor.
    */
    for (const stueck of splitByFace(run, cover)) {
      /*
         Ein Zeichen, das keine der Schriften führt, wird ausgelassen — und
         zwar *nur* es. jsPDF ließe es ohnehin fallen; stünde es aber noch in
         einem Stück mit seinen Nachbarn, rückten die um seinen Vorschub nach
         links. Der Umriss-Weg lässt an derselben Stelle eine Lücke, und beide
         Ausgaben sollen dieselbe Zeile zeigen.
      */
      if (stueck.ungedeckt) continue;
      const embedded =
        (stueck.face && fonts.get(fontKey(stueck.face.role, stueck.face.weight))) ??
        fonts.get(fontKey(run.font.family, run.font.weight));
      if (embedded) {
        doc.setFont(embedded.name, embedded.style);
      } else {
        doc.setFont(pdfFontFamily[run.font.family], pdfFontStyle(run.font.weight, run.font.italic));
      }

      // Wo das Stück steht, misst der Browser — dieselbe Rechnung wie im
      // Umriss-Weg, damit beide Ausgaben an derselben Stelle setzen.
      const vor = stueck.at === 0 ? 0 : measureText(run.text.slice(0, stueck.at), run.font);
      const dx = run.dx + vor;
      doc.text(stueck.text, (prim.x + dx * cos) * scale, (prim.y + dx * sin) * scale, {
        baseline: 'alphabetic',
        // jsPDF measures rotation counter-clockwise; the scene is clockwise.
        angle: angleDeg ? -angleDeg : undefined,
        charSpace: run.font.tracking ? run.font.tracking * run.font.size * scale : undefined,
      });
    }

    if (run.underline || run.strike) {
      drawDecoration(doc, prim, run, scale, color, cos, sin);
    }
  }
}

function drawDecoration(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'text' }>,
  run: SceneRun,
  scale: number,
  color: Rgba,
  cos: number,
  sin: number,
): void {
  const thickness = Math.max(0.6, run.font.size * 0.058);
  const offsets: number[] = [];
  if (run.underline) offsets.push(run.font.size * 0.13);
  if (run.strike) offsets.push(-run.font.size * 0.27);

  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(thickness * scale);
  doc.setLineCap('butt');
  doc.setLineDashPattern([], 0);

  for (const dy of offsets) {
    // Rotate both the run offset and the vertical decoration offset.
    const startX = prim.x + run.dx * cos - dy * sin;
    const startY = prim.y + run.dx * sin + dy * cos;
    doc.lines(
      [[run.width * cos, run.width * sin]],
      startX * scale,
      startY * scale,
      [scale, scale],
      'S',
      false,
    );
  }
}

function pdfFontStyle(weight: number, italic: boolean): string {
  const bold = weight >= 600;
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

function drawImage(
  doc: jsPDF,
  prim: Extract<ScenePrim, { t: 'image' }>,
  scale: number,
  options: PdfOptions,
): void {
  const entry = options.images?.get(prim.href);
  const source = entry?.dataUrl ?? (prim.href.startsWith('data:') ? prim.href : null);
  if (!source) {
    // Der zweite stille Ausstieg. Der `catch` unten meldet ein Bild, das
    // jsPDF nicht verdaut; hier fehlt es schon in der Karte, und ohne diese
    // Zeile fehlte es im PDF *und* in jeder Meldung.
    meldeFehlendeBilder([prim.href]);
    return;
  }

  const format = entry?.format ?? guessFormat(source);
  /*
     jsPDF kennt kein `preserveAspectRatio`: es zieht das Bild auf das
     angegebene Rechteck. Eingepasst wird deshalb hier, und zwar aus den echten
     Maßen — vorher stand ein 2:1-Bild in einem 400 × 400-Kasten auf der Fläche
     und im SVG eingepasst da und im PDF auf die halbe Höhe gestaucht:
     dieselbe Folie, zwei Bilder.

     Ohne bekannte Maße bleibt es beim Strecken. Das ist nicht schön und
     trotzdem richtig: raten hieße, ein Verhältnis zu erfinden.
  */
  const kasten = einpassen(prim, entry?.w, entry?.h);
  const beschnitten = kasten.w > prim.w + 0.01 || kasten.h > prim.h + 0.01;
  const ecke = jsPdfEcke(prim, kasten);
  try {
    if (beschnitten) {
      /*
         „Füllend" heißt: den Kasten voll machen und den Überstand
         abschneiden. Ohne den Beschnitt liefe das Bild über seinen eigenen
         Rahmen hinaus.

         Geklemmt wird über einen **Pfad** und nicht über `doc.rect(...)`.
         jsPDF reicht ein fehlendes Stil-Argument an `putStyle` durch, und das
         fällt auf `defaultPathOperation` = `"S"` zurück: der Pfad wurde
         gestrichen und dabei verbraucht, das `W` danach fand keinen Pfad mehr
         — kein Beschnitt, dafür ein schwarzes Rechteck quer über dem Bild.
         jsPDF schreibt die richtige Benutzung an seine eigene `clip()`: erst
         eine Zeichenoperation mit dem Stil `null`, dann klemmen. Und der Pfad
         ist die *gedrehte* Hülle des Elements, nicht sein achsenparalleler
         Kasten — sonst schnitte er bei einer Drehung am falschen Ort.
      */
      doc.saveGraphicsState();
      const [start, ...legs] = huelle(prim);
      doc.lines(
        legs.map(([x, y]) => [x - start[0], y - start[1]]),
        start[0] * scale,
        start[1] * scale,
        [scale, scale],
        null,
        true,
      );
      doc.clip();
      doc.discardPath();
    }
    doc.addImage(
      source,
      format,
      ecke.x * scale,
      ecke.y * scale,
      kasten.w * scale,
      kasten.h * scale,
      undefined,
      'FAST',
      prim.rotate ? -prim.rotate : 0,
    );
    if (beschnitten) doc.restoreGraphicsState();
  } catch {
    /*
       Ein kaputtes Bild darf den ganzen Export nicht abbrechen — aber es
       verschwindet auch nicht wortlos. Das ist der zweite Fang: das Bild war
       zu haben, jsPDF kommt trotzdem nicht damit zurecht (ein falsch
       angemeldetes Format, eine beschädigte Datei). Ohne diese Zeile fehlte
       es im PDF und in keiner Meldung.
    */
    meldeFehlendeBilder([prim.href]);
  }
}

/**
 * Wo das Bild anzusetzen ist, damit jsPDF um denselben Punkt dreht wie das SVG.
 *
 * Ein `image`-Primitiv trägt seine Ecke **nach** der Matrix und dreht um genau
 * diesen Punkt — so schreibt es `svg.ts` (`rotate(a x y)`), und `scene.ts`
 * rechnet die Ecke eigens dafür aus, damit Bild und Rahmen zusammenfallen.
 * jsPDF dreht dagegen um `(x, y + h)`, also um die *untere* linke Ecke des
 * ungedrehten Rechtecks. Gemessen an einem 400 × 100-Bild bei (450, −50) mit
 * 90°: der Rahmen des Elements lag bei x 350…450, das Bild bei x 550…650 —
 * zwei getrennte Dinge auf derselben Folie, und in PowerPoint an einer dritten
 * Stelle.
 *
 * Gerechnet wird deshalb die Ecke, die jsPDFs eigene Drehung dorthin bringt,
 * wo das SVG sie hat. Ohne Drehung fällt die Rechnung auf den Kasten zurück.
 */
function jsPdfEcke(
  prim: Extract<ScenePrim, { t: 'image' }>,
  kasten: { x: number; y: number; w: number; h: number },
): { x: number; y: number } {
  if (!prim.rotate) return kasten;
  const bogen = (prim.rotate * Math.PI) / 180;
  const sin = Math.sin(bogen);
  const cos = Math.cos(bogen);
  // Die linke obere Ecke des Bildkastens, gedreht um die Ecke des Primitivs.
  const dx = kasten.x - prim.x;
  const dy = kasten.y - prim.y;
  const ziel = { x: prim.x + dx * cos - dy * sin, y: prim.y + dx * sin + dy * cos };
  return { x: ziel.x - kasten.h * sin, y: ziel.y - kasten.h + kasten.h * cos };
}

/** Die vier Ecken des Primitivs, gedreht wie das SVG sie dreht. */
function huelle(prim: Extract<ScenePrim, { t: 'image' }>): Array<[number, number]> {
  const bogen = ((prim.rotate ?? 0) * Math.PI) / 180;
  const sin = Math.sin(bogen);
  const cos = Math.cos(bogen);
  return (
    [
      [0, 0],
      [prim.w, 0],
      [prim.w, prim.h],
      [0, prim.h],
    ] as Array<[number, number]>
  ).map(([dx, dy]) => [prim.x + dx * cos - dy * sin, prim.y + dx * sin + dy * cos]);
}

/**
 * Das Rechteck, in dem das Bild wirklich landet.
 *
 * Die Szene sagt, wie eingepasst werden soll; das SVG kann das selbst
 * (`preserveAspectRatio`), jsPDF nicht — es zieht das Bild stur auf das
 * angegebene Rechteck. Gerechnet wird deshalb hier, und zwar aus den echten
 * Maßen des Bildes: ohne sie ist jede Einpassung eine Erfindung, und dann
 * bleibt es beim Strecken.
 */
function einpassen(
  prim: Extract<ScenePrim, { t: 'image' }>,
  breite: number | undefined,
  hoehe: number | undefined,
): { x: number; y: number; w: number; h: number } {
  const kasten = { x: prim.x, y: prim.y, w: prim.w, h: prim.h };
  if (!breite || !hoehe || prim.w <= 0 || prim.h <= 0) return kasten;

  const eigen = breite / hoehe;
  const platz = prim.w / prim.h;
  // `contain` nimmt den kleineren Maßstab (Luft an zwei Seiten), `cover` den
  // größeren (Überstand an zwei Seiten, der beschnitten wird).
  const breiter = prim.fit === 'cover' ? eigen < platz : eigen > platz;

  const w = breiter ? prim.w : prim.h * eigen;
  const h = breiter ? prim.w / eigen : prim.h;
  return { x: prim.x + (prim.w - w) / 2, y: prim.y + (prim.h - h) / 2, w, h };
}

function guessFormat(dataUrl: string): string {
  if (dataUrl.includes('image/png')) return 'PNG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'JPEG';
}

/* -------------------------------------------------------------------------- */

function blend(color: Rgba, backdrop: Rgba): Rgba {
  return {
    r: Math.round(color.r * color.a + backdrop.r * (1 - color.a)),
    g: Math.round(color.g * color.a + backdrop.g * (1 - color.a)),
    b: Math.round(color.b * color.a + backdrop.b * (1 - color.a)),
    a: 1,
  };
}
