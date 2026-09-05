/**
 * Schriftmaße.
 *
 * Die Ausgabewege brauchen echte Vorschübe, um Zeilen zu brechen, und sie
 * müssen mit dem übereinstimmen, was der Browser auf dem Bildschirm getan hat
 * — gemessen wird deshalb über denselben Schriftstapel in einem Canvas. Unter
 * jsdom, also in den Tests, gibt es keines; dort springt ein festes
 * Rechenmodell ein. Es gilt nur für die Tests und für den Fall „kein Canvas",
 * nie für einen echten Export.
 */
import { fontFamily } from '@/theme';

export type FontFamilyKey = 'display' | 'body' | 'mono';

export interface FontSpec {
  family: FontFamilyKey;
  size: number;
  weight: number;
  italic: boolean;
  /** Die Laufweite als Bruchteil der Schriftgröße (Geviert), wie in der CI. */
  tracking: number;
}

export function font(spec: Partial<FontSpec> & { size: number }): FontSpec {
  return {
    family: spec.family ?? 'body',
    size: spec.size,
    weight: spec.weight ?? 400,
    italic: spec.italic ?? false,
    tracking: spec.tracking ?? 0,
  };
}

export function fontCssShorthand(spec: FontSpec): string {
  return `${spec.italic ? 'italic ' : ''}${spec.weight} ${spec.size}px ${fontFamily[spec.family]}`;
}

/* -------------------------------------------------------------------------- */
/* Canvas-backed measurement                                                   */
/* -------------------------------------------------------------------------- */

let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  try {
    if (typeof document === 'undefined') {
      ctx = null;
    } else {
      const canvasEl = document.createElement('canvas');
      canvasEl.width = 8;
      canvasEl.height = 8;
      ctx = canvasEl.getContext('2d');
      // jsdom gibt `null` zurück — oder eine Attrappe ohne `measureText`.
      if (ctx && typeof ctx.measureText !== 'function') ctx = null;
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

const cache = new Map<string, number>();
const CACHE_LIMIT = 20000;

/** Die Breite von `text` in dieser Schrift, Laufweite eingerechnet. */
export function measureText(text: string, spec: FontSpec): number {
  if (!text) return 0;
  const key = `${spec.family}|${spec.size}|${spec.weight}|${spec.italic ? 'i' : 'n'}|${text}`;
  const hit = cache.get(key);
  const base = hit ?? computeWidth(text, spec);
  if (hit === undefined) {
    if (cache.size > CACHE_LIMIT) cache.clear();
    cache.set(key, base);
  }
  return base + trackingWidth(text, spec);
}

/** Was die Laufweite zusätzlich braucht — sie sitzt zwischen den Zeichen. */
export function trackingWidth(text: string, spec: FontSpec): number {
  if (!spec.tracking || text.length === 0) return 0;
  return spec.tracking * spec.size * text.length;
}

function computeWidth(text: string, spec: FontSpec): number {
  const c = context();
  if (c) {
    c.font = fontCssShorthand(spec);
    return c.measureText(text).width;
  }
  return approximateWidth(text, spec);
}

/* -------------------------------------------------------------------------- */
/* Deterministic fallback model                                                */
/* -------------------------------------------------------------------------- */

/**
 * Der Vorschub je Zeichen als Bruchteil des Gevierts, ungefähr nach einer
 * humanistischen Grotesk im Schnitt 400. Gilt nur, wenn es kein Canvas gibt.
 */
const NARROW = new Set([...'ijltfIr!.,:;\'"|[]()`']);
const WIDE = new Set([...'mwMW@%']);

export function approximateWidth(text: string, spec: FontSpec): number {
  const mono = spec.family === 'mono';
  let em = 0;
  for (const char of text) {
    if (mono) em += 0.6;
    else if (char === ' ') em += 0.26;
    else if (NARROW.has(char)) em += 0.31;
    else if (WIDE.has(char)) em += 0.86;
    else if (char >= 'A' && char <= 'Z') em += 0.66;
    else if (char >= '0' && char <= '9') em += 0.56;
    else em += 0.53;
  }
  const weightFactor = spec.weight >= 600 ? 1.035 : spec.weight >= 500 ? 1.015 : 1;
  return em * spec.size * weightFactor;
}

/** Den Messpuffer leeren — sobald eine Webschrift angekommen ist. */
export function resetMeasurementCache(): void {
  cache.clear();
}

/** Ob es hier echte Maße gibt, also ein Canvas. */
export function hasRealMetrics(): boolean {
  return context() !== null;
}

/* -------------------------------------------------------------------------- */
/* Vertical metrics                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Die Verhältnisse, mit denen die Grundlinie in der Zeile sitzt. Über den
 * Schriftstapel der CI hinweg sind sie stabil genug, dass sie festgeschrieben
 * SVG, PDF und Fläche zusammenhalten — je Schrift zu messen ließe die drei
 * auseinanderlaufen.
 */
export const ASCENT_RATIO = 0.76;
export const DESCENT_RATIO = 0.24;

/** Wie tief die Grundlinie in einer Zeile der Höhe `lineHeight` liegt. */
export function baselineOffset(fontSize: number, lineHeight: number): number {
  const leading = lineHeight - fontSize;
  return leading / 2 + fontSize * ASCENT_RATIO;
}
