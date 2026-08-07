/**
 * Die Geometrie der CI-Formen.
 *
 * Jede Form entsteht im lokalen Elementraum (0,0)–(w,h), damit dieselbe
 * Funktion den Canvas und beide Exporte bedient.
 *
 * Es gibt keinen Radius-Parameter. Das ist kein Versehen: „Keine runden Ecken
 * — auch nicht nur ein bisschen" ist Regel 8 der CI. Eine Ellipse ist erlaubt,
 * weil sie eine Kurve ist und keine weiche Ecke.
 */
import { ellipseSegs, lineSegs, polySegs, type Seg } from './path';
import type { ConnectorKind, ShapeName } from '@/model/types';

export interface ShapeGeometry {
  segs: Seg[];
  /** Ob die Form eine geschlossene Fläche ist und damit gefüllt werden darf. */
  closed: boolean;
}

export function shapeGeometry(shape: ShapeName, w: number, h: number): ShapeGeometry {
  const W = Math.max(1, w);
  const H = Math.max(1, h);

  switch (shape) {
    case 'rectangle':
      return { segs: polySegs([0, 0, W, 0, W, H, 0, H], true), closed: true };

    case 'ellipse':
      return { segs: ellipseSegs(W / 2, H / 2, W / 2, H / 2), closed: true };

    case 'diamond':
      return { segs: polySegs([W / 2, 0, W, H / 2, W / 2, H, 0, H / 2], true), closed: true };

    case 'triangle':
      return { segs: polySegs([W / 2, 0, W, H, 0, H], true), closed: true };

    case 'hexagon': {
      const inset = Math.min(W * 0.25, H * 0.5);
      return {
        segs: polySegs([inset, 0, W - inset, 0, W, H / 2, W - inset, H, inset, H, 0, H / 2], true),
        closed: true,
      };
    }

    case 'chevron': {
      const notch = Math.min(W * 0.22, H * 0.5);
      return {
        segs: polySegs([0, 0, W - notch, 0, W, H / 2, W - notch, H, 0, H, notch, H / 2], true),
        closed: true,
      };
    }

    case 'banner': {
      const notch = Math.min(W * 0.14, H * 0.5);
      return { segs: polySegs([0, 0, W, 0, W - notch, H / 2, W, H, 0, H], true), closed: true };
    }

    case 'callout': {
      // Sprechblase mit scharfem Fuß — kein Radius, keine weiche Spitze.
      const bodyH = Math.max(H * 0.78, H - 32);
      const tailW = Math.min(W * 0.16, 40);
      const tailX = Math.min(Math.max(24, W * 0.14), Math.max(24, W - tailW - 24));
      return {
        segs: polySegs(
          [0, 0, W, 0, W, bodyH, tailX + tailW, bodyH, tailX, H, tailX, bodyH, 0, bodyH],
          true,
        ),
        closed: true,
      };
    }

    case 'frame': {
      // Vier Eckwinkel — das CI-Mittel, um etwas zu rahmen, ohne es zu umranden.
      const arm = Math.min(W, H) * 0.3;
      return {
        segs: [
          ...corner(0, 0, arm, 1, 1),
          ...corner(W, 0, arm, -1, 1),
          ...corner(W, H, arm, -1, -1),
          ...corner(0, H, arm, 1, -1),
        ],
        closed: false,
      };
    }

    case 'bracket':
      return {
        segs: [
          { c: 'M', x: W, y: 0 },
          { c: 'L', x: 0, y: 0 },
          { c: 'L', x: 0, y: H },
          { c: 'L', x: W, y: H },
        ],
        closed: false,
      };

    case 'cross': {
      const armW = W * 0.32;
      const armH = H * 0.32;
      const x0 = (W - armW) / 2;
      const y0 = (H - armH) / 2;
      return {
        segs: polySegs(
          [
            x0,
            0,
            x0 + armW,
            0,
            x0 + armW,
            y0,
            W,
            y0,
            W,
            y0 + armH,
            x0 + armW,
            y0 + armH,
            x0 + armW,
            H,
            x0,
            H,
            x0,
            y0 + armH,
            0,
            y0 + armH,
            0,
            y0,
            x0,
            y0,
          ],
          true,
        ),
        closed: true,
      };
    }

    default:
      return { segs: polySegs([0, 0, W, 0, W, H, 0, H], true), closed: true };
  }
}

/** Ein Eckwinkel: zwei gerade Arme, scharfe Ecke. */
function corner(x: number, y: number, arm: number, sx: number, sy: number): Seg[] {
  return [
    { c: 'M', x: x + sx * arm, y },
    { c: 'L', x, y },
    { c: 'L', x, y: y + sy * arm },
  ];
}

/* -------------------------------------------------------------------------- */
/* Verbinder                                                                   */
/* -------------------------------------------------------------------------- */

export interface ConnectorGeometry {
  segs: Seg[];
  /** Geschlossene, gefüllte Spitzen. */
  heads: Seg[][];
}

/**
 * Ein Verbinder spannt die Elementbox von links-oben nach rechts-unten auf;
 * die Drehung des Elements richtet ihn dann aus. `elbow` läuft über einen
 * rechten Winkel — passend zur Formensprache.
 */
export function connectorGeometry(
  kind: ConnectorKind,
  w: number,
  h: number,
  strokeWidth: number,
): ConnectorGeometry {
  const W = Math.max(1, w);
  const H = h;
  const headLen = Math.max(12, strokeWidth * 4);
  const headHalf = Math.max(6, strokeWidth * 2.2);

  if (kind === 'elbow') {
    const midX = W / 2;
    return {
      segs: trimEnd(
        [
          { c: 'M', x: 0, y: 0 },
          { c: 'L', x: midX, y: 0 },
          { c: 'L', x: midX, y: H },
          { c: 'L', x: W, y: H },
        ],
        headLen,
      ),
      heads: [arrowHead(W, H, 0, headLen, headHalf)],
    };
  }

  const angle = Math.atan2(H, W);
  const deg = (angle * 180) / Math.PI;

  const heads: Seg[][] = [];
  let x1 = 0;
  let y1 = 0;
  let x2 = W;
  let y2 = H;

  if (kind === 'arrow' || kind === 'double-arrow') {
    heads.push(arrowHead(W, H, deg, headLen, headHalf));
    x2 -= Math.cos(angle) * headLen * 0.9;
    y2 -= Math.sin(angle) * headLen * 0.9;
  }
  if (kind === 'double-arrow') {
    heads.push(arrowHead(0, 0, deg + 180, headLen, headHalf));
    x1 += Math.cos(angle) * headLen * 0.9;
    y1 += Math.sin(angle) * headLen * 0.9;
  }

  return { segs: lineSegs(x1, y1, x2, y2), heads };
}

/** Eine geschlossene, dreieckige Spitze mit Kopf bei (x, y) in Richtung `deg`. */
export function arrowHead(
  x: number,
  y: number,
  deg: number,
  length: number,
  halfWidth: number,
): Seg[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const baseX = x - cos * length;
  const baseY = y - sin * length;
  const nx = -sin * halfWidth;
  const ny = cos * halfWidth;
  return polySegs([x, y, baseX + nx, baseY + ny, baseX - nx, baseY - ny], true);
}

/** Den letzten Punkt eines Streckenzugs entlang seines letzten Schenkels zurückziehen. */
function trimEnd(segs: Seg[], amount: number): Seg[] {
  if (segs.length < 2) return segs;
  const last = segs[segs.length - 1];
  const prev = segs[segs.length - 2];
  if (last.c !== 'L' || (prev.c !== 'L' && prev.c !== 'M')) return segs;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy);
  if (len <= amount) return segs;
  const t = (len - amount * 0.9) / len;
  const copy = segs.slice();
  copy[copy.length - 1] = { c: 'L', x: prev.x + dx * t, y: prev.y + dy * t };
  return copy;
}
