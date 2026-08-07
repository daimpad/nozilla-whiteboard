/**
 * The Nozilla logomark, drawn from CI primitives rather than shipped as a
 * binary asset — the app stays a pure source tree and the mark inherits the
 * palette automatically.
 */
import { color as ci, radius, stroke } from '@/theme';
import { icons } from '@/assets/icons';

export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  const mark = icons.nozilla.prims[0];
  const points =
    mark.t === 'polyline'
      ? mark.points.reduce<string[]>((out, value, index) => {
          if (index % 2 === 0) out.push(String(value));
          else out[out.length - 1] += `,${value}`;
          return out;
        }, [])
      : [];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        background: ci.primary,
        borderRadius: radius.sm,
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24" fill="none">
        <polyline
          points={points.join(' ')}
          stroke={ci.inkOnBrand}
          strokeWidth={stroke.bold}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
