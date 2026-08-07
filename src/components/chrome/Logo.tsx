/**
 * Die Wortmarke in der Anwendungsoberfläche.
 *
 * Gezeichnet aus denselben Pfaden, die auch auf der Fläche landen — und mit
 * denselben Regeln: nicht drehen, nicht umfärben, nicht verzerren, kein
 * Schatten.
 */
import { palette } from '@/theme';
import { wordmark } from '@/assets/wordmark.generated';

export function Logo({ height = 20, className }: { height?: number; className?: string }) {
  const [x, y, w, h] = wordmark.viewBox;
  return (
    <svg
      height={height}
      width={(w / h) * height}
      viewBox={`${x} ${y} ${w} ${h}`}
      className={className}
      role="img"
      aria-label="nozilla"
    >
      <path d={wordmark.letters} fill="currentColor" />
      <path d={wordmark.period} fill={palette.signal} />
    </svg>
  );
}
