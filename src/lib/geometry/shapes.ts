/**
 * CI shape geometry. Every shape is built in local element space (0,0)–(w,h)
 * so the same builder serves the on-canvas DOM renderer and both exporters.
 *
 * Proportional details (notch depth, callout tail size, corner-bracket length)
 * are derived from the element box rather than hard-coded, so a shape stays
 * recognisably itself at any size.
 */
import { ellipseSegs, lineSegs, polySegs, rectSegs, type Seg } from './path';
import type { ConnectorKind, ShapeName } from '@/model/types';

export interface ShapeGeometry {
  /** Segments that make up the body. */
  segs: Seg[];
  /** Whether the body is a closed region (so it may be filled). */
  closed: boolean;
}

export function shapeGeometry(
  shape: ShapeName,
  w: number,
  h: number,
  radius: number,
): ShapeGeometry {
  const W = Math.max(1, w);
  const H = Math.max(1, h);

  switch (shape) {
    case 'rectangle':
      return { segs: rectSegs(0, 0, W, H, 0), closed: true };

    case 'rounded':
      return { segs: rectSegs(0, 0, W, H, radius), closed: true };

    case 'pill':
      return { segs: rectSegs(0, 0, W, H, Math.min(W, H) / 2), closed: true };

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
      const notch = Math.min(W * 0.25, H * 0.5);
      return {
        segs: polySegs(
          [0, 0, W - notch, 0, W, H / 2, W - notch, H, 0, H, notch, H / 2],
          true,
        ),
        closed: true,
      };
    }

    case 'banner': {
      const notch = Math.min(W * 0.16, H * 0.5);
      return {
        segs: polySegs([0, 0, W, 0, W - notch, H / 2, W, H, 0, H], true),
        closed: true,
      };
    }

    case 'callout': {
      // Rounded body occupying the top ~82%, with a tail dropping from the
      // lower-left quarter.
      const bodyH = Math.max(H * 0.78, H - 28);
      const r = Math.max(0, Math.min(radius, Math.min(W, bodyH) / 2));
      const tailW = Math.min(W * 0.16, 34);
      const tailX = Math.min(Math.max(r + 8, W * 0.16), W - r - tailW - 8);
      const body = rectSegs(0, 0, W, bodyH, r);
      // Splice the tail into the bottom edge: rebuild manually for a clean join.
      return {
        segs: [
          ...body.slice(0, body.length - 1),
          { c: 'M', x: tailX, y: bodyH },
          { c: 'L', x: tailX, y: H },
          { c: 'L', x: tailX + tailW, y: bodyH },
          { c: 'Z' },
        ],
        closed: true,
      };
    }

    case 'frame': {
      // Four corner brackets — a CI device for framing content or photos.
      const arm = Math.min(W, H) * 0.28;
      const r = Math.min(radius, arm);
      return {
        segs: [
          ...cornerBracket(0, 0, arm, r, 1, 1),
          ...cornerBracket(W, 0, arm, r, -1, 1),
          ...cornerBracket(W, H, arm, r, -1, -1),
          ...cornerBracket(0, H, arm, r, 1, -1),
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

    default:
      return { segs: rectSegs(0, 0, W, H, radius), closed: true };
  }
}

function cornerBracket(
  x: number,
  y: number,
  arm: number,
  r: number,
  sx: number,
  sy: number,
): Seg[] {
  const k = r * 0.5523;
  return [
    { c: 'M', x: x + sx * arm, y },
    { c: 'L', x: x + sx * r, y },
    { c: 'C', x1: x + sx * (r - k), y1: y, x2: x, y2: y + sy * (r - k), x, y: y + sy * r },
    { c: 'L', x, y: y + sy * arm },
  ];
}

/* -------------------------------------------------------------------------- */
/* Connectors                                                                  */
/* -------------------------------------------------------------------------- */

export interface ConnectorGeometry {
  /** The connector line itself. */
  segs: Seg[];
  /** Closed, filled arrowheads. */
  heads: Seg[][];
}

/**
 * Connectors span the element box from its left-middle to its right-middle
 * (the box's rotation then aims it). `elbow` routes with a single right angle.
 */
export function connectorGeometry(
  kind: ConnectorKind,
  w: number,
  h: number,
  strokeWidth: number,
): ConnectorGeometry {
  const W = Math.max(1, w);
  const H = h;
  const headLen = Math.max(9, strokeWidth * 4.2);
  const headHalf = Math.max(5, strokeWidth * 2.4);

  if (kind === 'elbow') {
    const midX = W / 2;
    const segs: Seg[] = [
      { c: 'M', x: 0, y: 0 },
      { c: 'L', x: midX, y: 0 },
      { c: 'L', x: midX, y: H },
      { c: 'L', x: W, y: H },
    ];
    return {
      segs: trimEnd(segs, headLen),
      heads: [arrowHead(W, H, 0, headLen, headHalf)],
    };
  }

  const start = { x: 0, y: 0 };
  const end = { x: W, y: H };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const deg = (angle * 180) / Math.PI;

  const heads: Seg[][] = [];
  let x1 = start.x;
  let y1 = start.y;
  let x2 = end.x;
  let y2 = end.y;

  if (kind === 'arrow' || kind === 'double-arrow') {
    heads.push(arrowHead(end.x, end.y, deg, headLen, headHalf));
    x2 -= Math.cos(angle) * headLen * 0.82;
    y2 -= Math.sin(angle) * headLen * 0.82;
  }
  if (kind === 'double-arrow') {
    heads.push(arrowHead(start.x, start.y, deg + 180, headLen, headHalf));
    x1 += Math.cos(angle) * headLen * 0.82;
    y1 += Math.sin(angle) * headLen * 0.82;
  }

  return { segs: lineSegs(x1, y1, x2, y2), heads };
}

/** A closed triangular arrowhead with the tip at (x, y), pointing along `deg`. */
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
  const bx = x - cos * length;
  const by = y - sin * length;
  const nx = -sin * halfWidth;
  const ny = cos * halfWidth;
  return polySegs([x, y, bx + nx, by + ny, bx - nx, by - ny], true);
}

/** Pull the final point of a polyline back along its last leg. */
function trimEnd(segs: Seg[], amount: number): Seg[] {
  if (segs.length < 2) return segs;
  const last = segs[segs.length - 1];
  const prev = segs[segs.length - 2];
  if (last.c !== 'L' || (prev.c !== 'L' && prev.c !== 'M')) return segs;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy);
  if (len <= amount) return segs;
  const t = (len - amount * 0.82) / len;
  const copy = segs.slice();
  copy[copy.length - 1] = { c: 'L', x: prev.x + dx * t, y: prev.y + dy * t };
  return copy;
}
