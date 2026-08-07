/** Colour parsing shared by the PDF backend (which needs numeric channels). */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_RE = /^#?([\da-f]{3,8})$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i;

export function parseColor(input: string | undefined): Rgba | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (value === 'none' || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = HEX_RE.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) digits = digits.split('').map((c) => c + c).join('');
    else if (digits.length === 4) digits = digits.split('').map((c) => c + c).join('');
    if (digits.length === 6) {
      const int = Number.parseInt(digits, 16);
      return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 1 };
    }
    if (digits.length === 8) {
      const int = Number.parseInt(digits.slice(0, 6), 16);
      return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
        a: Number.parseInt(digits.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  const rgb = RGB_RE.exec(value);
  if (rgb) {
    const alphaToken = rgb[4];
    const a = alphaToken
      ? alphaToken.endsWith('%')
        ? Number.parseFloat(alphaToken) / 100
        : Number.parseFloat(alphaToken)
      : 1;
    return {
      r: clampChannel(Number.parseFloat(rgb[1])),
      g: clampChannel(Number.parseFloat(rgb[2])),
      b: clampChannel(Number.parseFloat(rgb[3])),
      a: Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1,
    };
  }

  return null;
}

/**
 * Flatten a translucent colour onto an opaque backdrop. PDF fills honour a
 * graphics-state alpha, but flattening keeps stroke joins from double-darkening
 * where sub-paths overlap.
 */
export function flatten(color: Rgba, backdrop: Rgba): Rgba {
  if (color.a >= 1) return color;
  return {
    r: Math.round(color.r * color.a + backdrop.r * (1 - color.a)),
    g: Math.round(color.g * color.a + backdrop.g * (1 - color.a)),
    b: Math.round(color.b * color.a + backdrop.b * (1 - color.a)),
    a: 1,
  };
}

export function toHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}
