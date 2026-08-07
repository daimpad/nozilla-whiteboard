/**
 * Ein kleiner TrueType-Leser: Zeichen → Umriss.
 *
 * Warum selbst geschrieben und nicht `opentype.js`: gebraucht wird genau ein
 * Weg — von einem Zeichen zu seinen Konturen, in derselben Segmentliste, die
 * `lib/geometry/path.ts` schon durch SVG *und* PDF schiebt. Das sind die
 * Tabellen `head`, `maxp`, `cmap`, `loca`, `glyf` und `hmtx`; alles andere in
 * einer Schrift-Bibliothek (Ligaturen, GPOS, Variationsachsen, CFF) brauchen
 * die neun statischen Schnitte der CI nicht.
 *
 * Wichtig: dieser Leser **positioniert nicht**. Wo ein Zeichen hinkommt,
 * entscheidet weiter der Browser über `measureText` (siehe
 * `lib/export/outline.ts`) — nur so bleibt der Export deckungsgleich mit dem
 * Bildschirm, inklusive Kerning und Unterschneidung, die diese Tabellen gar
 * nicht hergeben.
 *
 * Quadratische Béziers werden beim Lesen zu kubischen erhoben, weil PDF nur
 * kubische kennt — dieselbe Entscheidung wie bei den Bögen in `path.ts`.
 */
import type { Seg } from '@/lib/geometry/path';

export interface Glyph {
  /** Konturen in Font-Einheiten, Y nach oben (die Konvention der Schrift). */
  segs: Seg[];
  /** Vorschub in Font-Einheiten. Nur für Notfälle — normal misst der Browser. */
  advance: number;
}

export interface TrueTypeFont {
  unitsPerEm: number;
  /** Umriss zu einem Codepoint; `null`, wenn die Schrift ihn nicht führt. */
  glyph(codePoint: number): Glyph | null;
}

/* -------------------------------------------------------------------------- */
/* Binärleser                                                                  */
/* -------------------------------------------------------------------------- */

class Reader {
  constructor(
    private readonly view: DataView,
    public offset = 0,
  ) {}

  seek(offset: number): this {
    this.offset = offset;
    return this;
  }
  u8(): number {
    return this.view.getUint8(this.offset++);
  }
  u16(): number {
    const value = this.view.getUint16(this.offset);
    this.offset += 2;
    return value;
  }
  i16(): number {
    const value = this.view.getInt16(this.offset);
    this.offset += 2;
    return value;
  }
  u32(): number {
    const value = this.view.getUint32(this.offset);
    this.offset += 4;
    return value;
  }
  f2dot14(): number {
    return this.i16() / 16384;
  }
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Eine TrueType-Datei einlesen. Wirft, wenn es keine ist — der Aufrufer fällt
 * dann auf echten Text zurück, statt eine leere Folie auszugeben.
 */
export function parseTrueType(buffer: ArrayBuffer): TrueTypeFont {
  const view = new DataView(buffer);
  const reader = new Reader(view);

  const tag = reader.u32();
  // 0x00010000 = TrueType, 'true' = ältere Apple-Variante, 'ttcf' = Sammlung.
  if (tag === 0x74746366) throw new Error('TrueType-Sammlungen werden nicht gelesen');
  if (tag !== 0x00010000 && tag !== 0x74727565) {
    throw new Error(
      tag === 0x4f54544f
        ? 'OpenType/CFF hat keine glyf-Tabelle — dieser Leser kann nur TrueType-Konturen'
        : `Keine TrueType-Datei (0x${tag.toString(16)})`,
    );
  }

  const tableCount = reader.u16();
  reader.offset += 6; // searchRange, entrySelector, rangeShift
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < tableCount; i += 1) {
    const name = String.fromCharCode(reader.u8(), reader.u8(), reader.u8(), reader.u8());
    reader.u32(); // checksum
    tables.set(name, { offset: reader.u32(), length: reader.u32() });
  }

  const need = (name: string) => {
    const table = tables.get(name);
    if (!table) throw new Error(`Tabelle ${name} fehlt`);
    return table;
  };

  /* head — Einheiten pro Em und das Format der loca-Tabelle */
  const head = need('head');
  const unitsPerEm = view.getUint16(head.offset + 18);
  const indexToLocFormat = view.getInt16(head.offset + 50);

  /* maxp — Anzahl der Glyphen */
  const numGlyphs = view.getUint16(need('maxp').offset + 4);

  /* hhea + hmtx — Vorschübe */
  const numberOfHMetrics = view.getUint16(need('hhea').offset + 34);
  const hmtx = need('hmtx');

  /* loca — Glyph-Index → Versatz in glyf */
  const loca = need('loca');
  const glyphRange = (index: number): [number, number] => {
    if (index < 0 || index >= numGlyphs) return [0, 0];
    if (indexToLocFormat === 0) {
      return [
        view.getUint16(loca.offset + index * 2) * 2,
        view.getUint16(loca.offset + index * 2 + 2) * 2,
      ];
    }
    return [view.getUint32(loca.offset + index * 4), view.getUint32(loca.offset + index * 4 + 4)];
  };

  const glyf = need('glyf');
  const cmap = buildCmap(view, need('cmap').offset);

  const advanceOf = (index: number): number => {
    const clamped = Math.min(index, numberOfHMetrics - 1);
    if (clamped < 0) return 0;
    return view.getUint16(hmtx.offset + clamped * 4);
  };

  /** Konturen eines Glyph-Index. `depth` bremst zusammengesetzte Zyklen. */
  const outline = (index: number, depth = 0): Seg[] => {
    if (depth > 5) return [];
    const [start, end] = glyphRange(index);
    if (end <= start) return []; // leerer Glyph, z. B. das Leerzeichen

    const g = new Reader(view, glyf.offset + start);
    const contourCount = g.i16();
    g.offset += 8; // xMin, yMin, xMax, yMax

    return contourCount >= 0
      ? simpleOutline(g, contourCount)
      : compositeOutline(g, (child) => outline(child, depth + 1));
  };

  const cache = new Map<number, Glyph | null>();

  return {
    unitsPerEm,
    glyph(codePoint) {
      const hit = cache.get(codePoint);
      if (hit !== undefined) return hit;
      const index = cmap(codePoint);
      const value: Glyph | null =
        index === undefined ? null : { segs: outline(index), advance: advanceOf(index) };
      cache.set(codePoint, value);
      return value;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* cmap — Codepoint → Glyph-Index                                              */
/* -------------------------------------------------------------------------- */

/**
 * Gelesen werden Format 4 (BMP) und Format 12 (voller Unicode-Bereich).
 * Format 12 gewinnt, wenn beide da sind — es deckt Emoji und alles jenseits
 * von U+FFFF ab.
 */
function buildCmap(view: DataView, base: number): (codePoint: number) => number | undefined {
  const reader = new Reader(view, base + 2);
  const tableCount = reader.u16();

  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < tableCount; i += 1) {
    const platform = reader.u16();
    const encoding = reader.u16();
    const offset = reader.u32();
    // Windows/Unicode-UCS4 (3,10) vor Unicode-UCS4 (0,4) vor BMP.
    const score =
      platform === 3 && encoding === 10
        ? 4
        : platform === 0 && encoding >= 4
          ? 3
          : platform === 3 && encoding === 1
            ? 2
            : platform === 0
              ? 1
              : 0;
    if (score > bestScore) {
      bestScore = score;
      best = base + offset;
    }
  }
  if (best < 0) throw new Error('cmap: kein brauchbares Untertabellen-Format');

  const format = view.getUint16(best);
  if (format === 12) return cmapFormat12(view, best);
  if (format === 4) return cmapFormat4(view, best);
  if (format === 6) return cmapFormat6(view, best);
  throw new Error(`cmap-Format ${format} wird nicht gelesen`);
}

function cmapFormat4(view: DataView, base: number): (codePoint: number) => number | undefined {
  const segCountX2 = view.getUint16(base + 6);
  const segCount = segCountX2 / 2;
  const endsAt = base + 14;
  const startsAt = endsAt + segCountX2 + 2;
  const deltasAt = startsAt + segCountX2;
  const rangesAt = deltasAt + segCountX2;

  return (codePoint) => {
    if (codePoint > 0xffff) return undefined;
    for (let i = 0; i < segCount; i += 1) {
      if (view.getUint16(endsAt + i * 2) < codePoint) continue;
      const start = view.getUint16(startsAt + i * 2);
      if (start > codePoint) return undefined;

      const delta = view.getInt16(deltasAt + i * 2);
      const rangeOffset = view.getUint16(rangesAt + i * 2);
      if (rangeOffset === 0) return (codePoint + delta) & 0xffff;

      const at = rangesAt + i * 2 + rangeOffset + (codePoint - start) * 2;
      if (at + 1 >= view.byteLength) return undefined;
      const index = view.getUint16(at);
      return index === 0 ? undefined : (index + delta) & 0xffff;
    }
    return undefined;
  };
}

function cmapFormat6(view: DataView, base: number): (codePoint: number) => number | undefined {
  const first = view.getUint16(base + 6);
  const count = view.getUint16(base + 8);
  return (codePoint) => {
    const index = codePoint - first;
    if (index < 0 || index >= count) return undefined;
    return view.getUint16(base + 10 + index * 2);
  };
}

function cmapFormat12(view: DataView, base: number): (codePoint: number) => number | undefined {
  const groupCount = view.getUint32(base + 12);
  return (codePoint) => {
    // Die Gruppen sind sortiert — binär suchen, es können Tausende sein.
    let low = 0;
    let high = groupCount - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const at = base + 16 + mid * 12;
      const start = view.getUint32(at);
      const end = view.getUint32(at + 4);
      if (codePoint < start) high = mid - 1;
      else if (codePoint > end) low = mid + 1;
      else return view.getUint32(at + 8) + (codePoint - start);
    }
    return undefined;
  };
}

/* -------------------------------------------------------------------------- */
/* glyf — Konturen                                                             */
/* -------------------------------------------------------------------------- */

const ON_CURVE = 0x01;
const X_SHORT = 0x02;
const Y_SHORT = 0x04;
const REPEAT = 0x08;
const X_SAME_OR_POSITIVE = 0x10;
const Y_SAME_OR_POSITIVE = 0x20;

function simpleOutline(reader: Reader, contourCount: number): Seg[] {
  const endPoints: number[] = [];
  for (let i = 0; i < contourCount; i += 1) endPoints.push(reader.u16());
  const pointCount = (endPoints[contourCount - 1] ?? -1) + 1;
  if (pointCount <= 0) return [];

  // Hinting-Anweisungen überspringen. Getrennt notiert, weil `offset += u16()`
  // den alten Offset liest, *bevor* `u16()` ihn weiterschiebt — die zwei Bytes
  // der Länge gingen dabei verloren.
  const instructionLength = reader.u16();
  reader.offset += instructionLength;

  /* Flags, ggf. wiederholt */
  const flags: number[] = [];
  while (flags.length < pointCount) {
    const flag = reader.u8();
    flags.push(flag);
    if (flag & REPEAT) {
      const repeats = reader.u8();
      for (let i = 0; i < repeats && flags.length < pointCount; i += 1) flags.push(flag);
    }
  }

  /* Koordinaten — als Deltas, mit drei Kodierungen je Achse */
  const readAxis = (shortBit: number, sameBit: number): number[] => {
    const values: number[] = [];
    let value = 0;
    for (let i = 0; i < pointCount; i += 1) {
      const flag = flags[i];
      if (flag & shortBit) {
        const delta = reader.u8();
        value += flag & sameBit ? delta : -delta;
      } else if (!(flag & sameBit)) {
        value += reader.i16();
      }
      values.push(value);
    }
    return values;
  };
  const xs = readAxis(X_SHORT, X_SAME_OR_POSITIVE);
  const ys = readAxis(Y_SHORT, Y_SAME_OR_POSITIVE);

  /* Punkte in Konturen zerlegen und zeichnen */
  const segs: Seg[] = [];
  let first = 0;
  for (const last of endPoints) {
    if (last >= first) {
      const points = [];
      for (let i = first; i <= last; i += 1) {
        points.push({ x: xs[i], y: ys[i], on: Boolean(flags[i] & ON_CURVE) });
      }
      contourToSegs(points, segs);
    }
    first = last + 1;
  }
  return segs;
}

interface Point {
  x: number;
  y: number;
  on: boolean;
}

/**
 * Eine TrueType-Kontur ist eine geschlossene Folge von Stützpunkten, die
 * abwechselnd auf und neben der Kurve liegen dürfen. Zwei aufeinanderfolgende
 * Kontrollpunkte implizieren einen Kurvenpunkt genau in ihrer Mitte — das ist
 * die Kompression, die das Format so kompakt macht, und die Stelle, an der
 * naive Leser falsch liegen.
 */
function contourToSegs(points: Point[], out: Seg[]): void {
  if (points.length === 0) return;

  const midpoint = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    on: true,
  });

  // Einen Startpunkt *auf* der Kurve finden — oder einen konstruieren.
  let start = points.findIndex((point) => point.on);
  let startPoint: Point;
  if (start < 0) {
    startPoint = midpoint(points[points.length - 1], points[0]);
    start = 0;
  } else {
    startPoint = points[start];
    start += 1;
  }

  out.push({ c: 'M', x: startPoint.x, y: startPoint.y });

  let current = startPoint;
  let control: Point | null = null;
  const total = points.length;

  const quadTo = (ctrl: Point, end: Point) => {
    // Quadratisch → kubisch: die Kontrollpunkte liegen auf zwei Dritteln.
    out.push({
      c: 'C',
      x1: current.x + (2 / 3) * (ctrl.x - current.x),
      y1: current.y + (2 / 3) * (ctrl.y - current.y),
      x2: end.x + (2 / 3) * (ctrl.x - end.x),
      y2: end.y + (2 / 3) * (ctrl.y - end.y),
      x: end.x,
      y: end.y,
    });
    current = end;
  };

  for (let step = 0; step < total; step += 1) {
    const point = points[(start + step) % total];
    if (point.on) {
      if (control) {
        quadTo(control, point);
        control = null;
      } else {
        out.push({ c: 'L', x: point.x, y: point.y });
        current = point;
      }
    } else if (control) {
      // Zwei Kontrollpunkte hintereinander: der Kurvenpunkt liegt dazwischen.
      quadTo(control, midpoint(control, point));
      control = point;
    } else {
      control = point;
    }
  }

  // Die Kontur schließt sich auf ihren Anfang zurück.
  if (control) quadTo(control, startPoint);
  out.push({ c: 'Z' });
}

const ARG_1_AND_2_ARE_WORDS = 0x0001;
const ARGS_ARE_XY_VALUES = 0x0002;
const WE_HAVE_A_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;

/**
 * Zusammengesetzte Glyphen — „Ä" ist „A" plus Trema, nicht noch einmal
 * gezeichnet. Ohne diesen Zweig fehlen im Export alle Umlaute, und das fällt
 * in einem deutschsprachigen Werkzeug sofort auf.
 */
function compositeOutline(reader: Reader, resolve: (index: number) => Seg[]): Seg[] {
  const out: Seg[] = [];
  let more = true;

  while (more) {
    const flags = reader.u16();
    const glyphIndex = reader.u16();
    more = Boolean(flags & MORE_COMPONENTS);

    let dx = 0;
    let dy = 0;
    if (flags & ARG_1_AND_2_ARE_WORDS) {
      const a = reader.i16();
      const b = reader.i16();
      if (flags & ARGS_ARE_XY_VALUES) {
        dx = a;
        dy = b;
      }
    } else {
      const a = (reader.u8() << 24) >> 24; // int8
      const b = (reader.u8() << 24) >> 24;
      if (flags & ARGS_ARE_XY_VALUES) {
        dx = a;
        dy = b;
      }
    }

    let a = 1;
    let b = 0;
    let c = 0;
    let d = 1;
    if (flags & WE_HAVE_A_SCALE) {
      a = d = reader.f2dot14();
    } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
      a = reader.f2dot14();
      d = reader.f2dot14();
    } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
      a = reader.f2dot14();
      b = reader.f2dot14();
      c = reader.f2dot14();
      d = reader.f2dot14();
    }

    const at = reader.offset;
    for (const seg of resolve(glyphIndex)) {
      out.push(transformSeg(seg, a, b, c, d, dx, dy));
    }
    reader.offset = at;
  }

  return out;
}

function transformSeg(
  seg: Seg,
  a: number,
  b: number,
  c: number,
  d: number,
  dx: number,
  dy: number,
): Seg {
  const at = (x: number, y: number) => ({ x: a * x + c * y + dx, y: b * x + d * y + dy });
  switch (seg.c) {
    case 'M':
    case 'L': {
      const p = at(seg.x, seg.y);
      return { c: seg.c, x: p.x, y: p.y };
    }
    case 'C': {
      const p1 = at(seg.x1, seg.y1);
      const p2 = at(seg.x2, seg.y2);
      const p = at(seg.x, seg.y);
      return { c: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
    }
    default:
      return seg;
  }
}
