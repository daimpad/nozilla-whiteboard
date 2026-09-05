/**
 * Ein kleiner Werkzeugkasten für Pfade in der Ebene, ohne fremde Bibliothek.
 *
 * Alles, was gezeichnet wird — die Formen der CI, die Icons, die Verbinder,
 * das Beiwerk einer Karte —, wird auf dieselbe Segmentliste gebracht (`Seg[]`:
 * Absetzen, Linie, Kubik, Schließen). Die Fläche schreibt daraus ein
 * `d`-Attribut, der SVG-Weg dasselbe, und der PDF-Weg läuft sie mit jsPDFs
 * `lines()` ab. Eine Geometrie, drei Ausgaben, kein Auseinanderlaufen.
 *
 * Ellipsenbögen gibt es hier mit Absicht nicht: PDF kennt keinen
 * Bogen-Operator, also ist jede Kurve eine kubische Bézierkurve. `KAPPA` ist
 * die übliche Konstante, mit der eine Kubik einen Viertelkreis annähert.
 */

export type Seg =
  | { c: 'M'; x: number; y: number }
  | { c: 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Z' };

/** Affine Matrix: x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Mat = readonly [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** 4·(√2 − 1)/3 — der Griffabstand, mit dem eine Kubik den Viertelkreis trifft. */
export const KAPPA = 0.5522847498307936;

/* -------------------------------------------------------------------------- */
/* Matrices                                                                    */
/* -------------------------------------------------------------------------- */

export function matMultiply(m1: Mat, m2: Mat): Mat {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function matTranslate(tx: number, ty: number): Mat {
  return [1, 0, 0, 1, tx, ty];
}

export function matScale(sx: number, sy: number = sx): Mat {
  return [sx, 0, 0, sy, 0, 0];
}

/**
 * Waagerechte Scherung: x' = x + k·y, y bleibt.
 *
 * Der Winkel steckt im Faktor — `k = tan θ`. Wer scheren will, muss wissen, in
 * welche Richtung seine Y-Achse zeigt: auf der Folie wächst y nach unten, im
 * Textraum eines PDF nach oben, und ein kursiver Schnitt lehnt in beiden
 * Fällen *oben* nach rechts.
 */
export function matShearX(k: number): Mat {
  return [1, 0, k, 1, 0, 0];
}

export function matRotate(degrees: number): Mat {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, sin, -sin, cos, 0, 0];
}

/** Drehung um einen beliebigen Drehpunkt. */
export function matRotateAbout(degrees: number, cx: number, cy: number): Mat {
  return matMultiply(matMultiply(matTranslate(cx, cy), matRotate(degrees)), matTranslate(-cx, -cy));
}

export function applyMat(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

export function matToSvg(m: Mat): string {
  return `matrix(${m.map((n) => round(n, 4)).join(' ')})`;
}

export function isIdentity(m: Mat): boolean {
  return (
    near(m[0], 1) &&
    near(m[1], 0) &&
    near(m[2], 0) &&
    near(m[3], 1) &&
    near(m[4], 0) &&
    near(m[5], 0)
  );
}

/* -------------------------------------------------------------------------- */
/* Segment utilities                                                           */
/* -------------------------------------------------------------------------- */

export function transformSegs(segs: readonly Seg[], m: Mat): Seg[] {
  if (isIdentity(m)) return segs.slice();
  return segs.map((seg) => {
    switch (seg.c) {
      case 'M':
      case 'L': {
        const p = applyMat(m, seg.x, seg.y);
        return { c: seg.c, x: p.x, y: p.y };
      }
      case 'C': {
        const p1 = applyMat(m, seg.x1, seg.y1);
        const p2 = applyMat(m, seg.x2, seg.y2);
        const p = applyMat(m, seg.x, seg.y);
        return { c: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
      }
      default:
        return { c: 'Z' };
    }
  });
}

export function segsToPath(segs: readonly Seg[], precision = 3): string {
  const n = (v: number) => round(v, precision);
  const out: string[] = [];
  for (const seg of segs) {
    switch (seg.c) {
      case 'M':
        out.push(`M${n(seg.x)} ${n(seg.y)}`);
        break;
      case 'L':
        out.push(`L${n(seg.x)} ${n(seg.y)}`);
        break;
      case 'C':
        out.push(`C${n(seg.x1)} ${n(seg.y1)} ${n(seg.x2)} ${n(seg.y2)} ${n(seg.x)} ${n(seg.y)}`);
        break;
      case 'Z':
        out.push('Z');
        break;
    }
  }
  return out.join(' ');
}

/** Die achsenparallele Hülle einer Segmentliste, Griffe eingeschlossen. */
export function segsBounds(segs: readonly Seg[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const take = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const seg of segs) {
    if (seg.c === 'M' || seg.c === 'L') take(seg.x, seg.y);
    else if (seg.c === 'C') {
      take(seg.x1, seg.y1);
      take(seg.x2, seg.y2);
      take(seg.x, seg.y);
    }
  }
  if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/* -------------------------------------------------------------------------- */
/* Path-data parser (M/L/H/V/C/S/Q/T/Z → normalised M/L/C/Z)                    */
/* -------------------------------------------------------------------------- */

/**
 * Pfaddaten eines SVG in absolute Segmente lesen: Absetzen, Linie, Kubik,
 * Schließen. Quadratische Kurven werden exakt zu Kubiken erhoben, die glatten
 * Schreibweisen bekommen ihren gespiegelten Griff. Ellipsenbögen (A/a) werden
 * zu Kubiken — PDF kennt keinen Bogen-Operator, und alle drei Ausgaben sollen
 * dieselbe Kurve zeichnen.
 */
/*
   Gelesen wird mit einem Zeiger, nicht mit einer Wortliste.

   Vorher zerlegte ein `d.match(...)` den ganzen Pfad vorweg in Befehle und
   Zahlen. Zwei Dinge gingen damit nicht, und beide sind gemessen:

   **Die Flaggen eines Bogens sind einzelne Ziffern und dürfen zusammenkleben.**
   `a5 5 0 0110 0` heißt largeArc=0, sweep=1, x=10 — die Wortliste las daraus
   die Zahl 110 und brach mit „Invalid number in path data: undefined" ab. Das
   ist keine Schrulle: genau so schreibt SVGO, und damit sieht die Datei eines
   Logos in aller Regel so aus. Der Wurf landet in einem `useMemo` beim
   Zeichnen — also in einem weißen Fenster.

   **Und ein `Z` mit einer Zahl dahinter drehte endlos.** Jeder andere Befehl
   verbraucht mindestens eine Zahl und kommt damit voran; `Z` verbraucht keine.
   Stand hinter ihm eine Zahl, lief die Schleife weiter, ohne den Zeiger zu
   bewegen: gemessen 34,8 Sekunden, dann `RangeError: Invalid array length` —
   im Browser ein eingefrorener Tab und ein Gigabyte Speicher auf dem Weg.

   Mit einem Zeiger ist beides erledigt: die Flaggen werden zeichenweise
   gelesen, und nach einem `Z` ist eine Zahl ein Fehler mit Namen statt einer
   Endlosschleife.
*/
const ZAHL = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y;
const BEFEHL = /[MmLlHhVvCcSsQqTtAaZz]/y;
const TRENNER = /[\s,]*/y;

export function parsePath(d: string): Seg[] {
  const out: Seg[] = [];

  let at = 0;
  let cmd = '';
  let cx: number = 0;
  let cy: number = 0;
  let startX: number = 0;
  let startY: number = 0;
  // Der letzte Griff einer Kubik beziehungsweise einer Quadratischen — für
  // die Spiegelung bei S und T.
  let lastCubicCtrl: { x: number; y: number } | null = null;
  let lastQuadCtrl: { x: number; y: number } | null = null;

  const ueberspringe = () => {
    TRENNER.lastIndex = at;
    TRENNER.exec(d);
    at = TRENNER.lastIndex;
  };

  const num = (): number => {
    ueberspringe();
    ZAHL.lastIndex = at;
    const treffer = ZAHL.exec(d);
    if (!treffer) throw new Error(`Invalid number in path data at ${at}: ${d.slice(at, at + 12)}`);
    at = ZAHL.lastIndex;
    return Number(treffer[0]);
  };

  /**
   * Eine Bogenflagge ist **ein Zeichen**, nicht eine Zahl.
   *
   * Genau daran hing der Fehler: `0110` sind vier Angaben und nicht eine.
   */
  const flagge = (): boolean => {
    ueberspringe();
    const zeichen = d[at];
    if (zeichen !== '0' && zeichen !== '1') {
      throw new Error(`Arc flag must be 0 or 1 at ${at}: ${d.slice(at, at + 12)}`);
    }
    at += 1;
    return zeichen === '1';
  };

  while (true) {
    ueberspringe();
    if (at >= d.length) break;

    BEFEHL.lastIndex = at;
    const befehl = BEFEHL.exec(d);
    if (befehl) {
      cmd = befehl[0];
      at = BEFEHL.lastIndex;
    } else if (!cmd) {
      throw new Error(`Path data must start with a command: ${d}`);
    } else if (cmd === 'M') {
      cmd = 'L';
    } else if (cmd === 'm') {
      cmd = 'l';
    } else if (cmd === 'Z' || cmd === 'z') {
      // `closepath` nimmt keine Argumente. Ohne diesen Wurf verbrauchte die
      // Schleife hier nichts und drehte sich, bis der Speicher überlief.
      throw new Error(`Z takes no arguments at ${at}: ${d.slice(at, at + 12)}`);
    }

    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;

    switch (cmd.toUpperCase()) {
      case 'M': {
        cx = num() + ox;
        cy = num() + oy;
        startX = cx;
        startY = cy;
        out.push({ c: 'M', x: cx, y: cy });
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      case 'L': {
        cx = num() + ox;
        cy = num() + oy;
        out.push({ c: 'L', x: cx, y: cy });
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      case 'H': {
        cx = num() + ox;
        out.push({ c: 'L', x: cx, y: cy });
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      case 'V': {
        cy = num() + oy;
        out.push({ c: 'L', x: cx, y: cy });
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      case 'C': {
        const x1 = num() + ox;
        const y1 = num() + oy;
        const x2 = num() + ox;
        const y2 = num() + oy;
        cx = num() + ox;
        cy = num() + oy;
        out.push({ c: 'C', x1, y1, x2, y2, x: cx, y: cy });
        lastCubicCtrl = { x: x2, y: y2 };
        lastQuadCtrl = null;
        break;
      }
      case 'S': {
        const refX: number = lastCubicCtrl ? lastCubicCtrl.x : cx;
        const refY: number = lastCubicCtrl ? lastCubicCtrl.y : cy;
        const x1: number = 2 * cx - refX;
        const y1: number = 2 * cy - refY;
        const x2 = num() + ox;
        const y2 = num() + oy;
        cx = num() + ox;
        cy = num() + oy;
        out.push({ c: 'C', x1, y1, x2, y2, x: cx, y: cy });
        lastCubicCtrl = { x: x2, y: y2 };
        lastQuadCtrl = null;
        break;
      }
      case 'Q': {
        const qx = num() + ox;
        const qy = num() + oy;
        const ex = num() + ox;
        const ey = num() + oy;
        out.push(quadToCubic(cx, cy, qx, qy, ex, ey));
        lastQuadCtrl = { x: qx, y: qy };
        lastCubicCtrl = null;
        cx = ex;
        cy = ey;
        break;
      }
      case 'T': {
        const refX: number = lastQuadCtrl ? lastQuadCtrl.x : cx;
        const refY: number = lastQuadCtrl ? lastQuadCtrl.y : cy;
        const qx: number = 2 * cx - refX;
        const qy: number = 2 * cy - refY;
        const ex = num() + ox;
        const ey = num() + oy;
        out.push(quadToCubic(cx, cy, qx, qy, ex, ey));
        lastQuadCtrl = { x: qx, y: qy };
        lastCubicCtrl = null;
        cx = ex;
        cy = ey;
        break;
      }
      case 'Z': {
        out.push({ c: 'Z' });
        cx = startX;
        cy = startY;
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rotation = num();
        const largeArc = flagge();
        const sweep = flagge();
        const ex = num() + ox;
        const ey = num() + oy;
        out.push(...arcToCubics(cx, cy, rx, ry, rotation, largeArc, sweep, ex, ey));
        cx = ex;
        cy = ey;
        lastCubicCtrl = lastQuadCtrl = null;
        break;
      }
      default:
        throw new Error(`Unsupported path command: ${cmd}`);
    }
  }

  return out;
}

/**
 * Ellipsenbogen → kubische Bézierkurven, nach der Endpunkt-Parametrisierung
 * des SVG-Standards (F.6.5 / F.6.6). Der Bogen wird in Stücke von höchstens
 * 90° geteilt; eine Kubik trifft jedes davon im Maßstab eines Icons auf
 * deutlich unter ein Zehntel Pixel genau.
 *
 * Es gibt das, weil PDF keinen Bogen-Operator kennt: `parsePath` bringt alles
 * auf Absetzen, Linie und Kubik, damit alle drei Zeichner dieselbe Kurve
 * malen.
 */
export function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  degrees: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): Seg[] {
  // Entartete Radien machen aus dem Bogen eine Gerade (SVG F.6.2).
  if (rxIn === 0 || ryIn === 0) return [{ c: 'L', x: x2, y: y2 }];
  if (x1 === x2 && y1 === y2) return [];

  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  const phi = (degrees * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  // Die Radien vergrößern, wenn sie die Sehne nicht überspannen (F.6.6).
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const numerator = rxSq * rySq - rxSq * y1p * y1p - rySq * x1p * x1p;
  const denominator = rxSq * y1p * y1p + rySq * x1p * x1p;
  const factor =
    (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator) / (denominator || 1));

  const cxp = (factor * rx * y1p) / ry;
  const cyp = (-factor * ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const theta2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
  let delta = theta2 - theta1;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / segments;
  const alpha = (4 / 3) * Math.tan(step / 4);

  const point = (theta: number) => ({
    x: cx + rx * cosPhi * Math.cos(theta) - ry * sinPhi * Math.sin(theta),
    y: cy + rx * sinPhi * Math.cos(theta) + ry * cosPhi * Math.sin(theta),
  });
  const derivative = (theta: number) => ({
    x: -rx * cosPhi * Math.sin(theta) - ry * sinPhi * Math.cos(theta),
    y: -rx * sinPhi * Math.sin(theta) + ry * cosPhi * Math.cos(theta),
  });

  const out: Seg[] = [];
  for (let i = 0; i < segments; i += 1) {
    const from = theta1 + i * step;
    const to = from + step;
    const p0 = point(from);
    const d0 = derivative(from);
    const p1 = point(to);
    const d1 = derivative(to);
    out.push({
      c: 'C',
      x1: p0.x + alpha * d0.x,
      y1: p0.y + alpha * d0.y,
      x2: p1.x - alpha * d1.x,
      y2: p1.y - alpha * d1.y,
      x: p1.x,
      y: p1.y,
    });
  }
  return out;
}

function quadToCubic(x0: number, y0: number, qx: number, qy: number, x: number, y: number): Seg {
  return {
    c: 'C',
    x1: x0 + (2 / 3) * (qx - x0),
    y1: y0 + (2 / 3) * (qy - y0),
    x2: x + (2 / 3) * (qx - x),
    y2: y + (2 / 3) * (qy - y),
    x,
    y,
  };
}

/* -------------------------------------------------------------------------- */
/* Primitive builders                                                          */
/* -------------------------------------------------------------------------- */

export function rectSegs(x: number, y: number, w: number, h: number, r = 0): Seg[] {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (radius <= 0.01) {
    return [
      { c: 'M', x, y },
      { c: 'L', x: x + w, y },
      { c: 'L', x: x + w, y: y + h },
      { c: 'L', x, y: y + h },
      { c: 'Z' },
    ];
  }
  const k = radius * KAPPA;
  return [
    { c: 'M', x: x + radius, y },
    { c: 'L', x: x + w - radius, y },
    {
      c: 'C',
      x1: x + w - radius + k,
      y1: y,
      x2: x + w,
      y2: y + radius - k,
      x: x + w,
      y: y + radius,
    },
    { c: 'L', x: x + w, y: y + h - radius },
    {
      c: 'C',
      x1: x + w,
      y1: y + h - radius + k,
      x2: x + w - radius + k,
      y2: y + h,
      x: x + w - radius,
      y: y + h,
    },
    { c: 'L', x: x + radius, y: y + h },
    { c: 'C', x1: x + radius - k, y1: y + h, x2: x, y2: y + h - radius + k, x, y: y + h - radius },
    { c: 'L', x, y: y + radius },
    { c: 'C', x1: x, y1: y + radius - k, x2: x + radius - k, y2: y, x: x + radius, y },
    { c: 'Z' },
  ];
}

export function ellipseSegs(cx: number, cy: number, rx: number, ry: number): Seg[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { c: 'M', x: cx, y: cy - ry },
    { c: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { c: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { c: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { c: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { c: 'Z' },
  ];
}

export function circleSegs(cx: number, cy: number, r: number): Seg[] {
  return ellipseSegs(cx, cy, r, r);
}

export function polySegs(points: readonly number[], close: boolean): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    segs.push({ c: i === 0 ? 'M' : 'L', x: points[i], y: points[i + 1] });
  }
  if (close) segs.push({ c: 'Z' });
  return segs;
}

export function lineSegs(x1: number, y1: number, x2: number, y2: number): Seg[] {
  return [
    { c: 'M', x: x1, y: y1 },
    { c: 'L', x: x2, y: y2 },
  ];
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

export function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function near(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}
