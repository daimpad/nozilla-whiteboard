/**
 * The CI icon, rendered for application chrome (toolbars, buttons, lists).
 *
 * Canvas artwork never comes through here — it goes through the scene pipeline
 * so that it matches export exactly. This component exists purely so the UI
 * itself is drawn from the same icon library.
 */
import { memo } from 'react';
import { iconDef, iconGrid, iconStrokeGrid, type IconName, type IconPrim } from '@/assets/icons';

export interface IconProps {
  name: IconName;
  size?: number;
  /** Stroke weight in grid units (defaults to the CI icon weight). */
  weight?: number;
  className?: string;
  title?: string;
}

function IconImpl({ name, size = 16, weight = iconStrokeGrid, className, title }: IconProps) {
  const def = iconDef(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${iconGrid} ${iconGrid}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {def.prims.map((prim, index) => renderPrim(prim, index))}
    </svg>
  );
}

export const Icon = memo(IconImpl);

function renderPrim(prim: IconPrim, key: number) {
  const filled = 'fill' in prim && prim.fill === true;
  const paint = filled ? { fill: 'currentColor', stroke: 'none' } : undefined;

  switch (prim.t) {
    case 'path':
      return <path key={key} d={prim.d} {...paint} />;
    case 'circle':
      return <circle key={key} cx={prim.cx} cy={prim.cy} r={prim.r} {...paint} />;
    case 'ellipse':
      return <ellipse key={key} cx={prim.cx} cy={prim.cy} rx={prim.rx} ry={prim.ry} {...paint} />;
    case 'rect':
      return (
        <rect
          key={key}
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          rx={prim.r ?? 0}
          {...paint}
        />
      );
    case 'line':
      return <line key={key} x1={prim.x1} y1={prim.y1} x2={prim.x2} y2={prim.y2} />;
    case 'polyline':
      return <polyline key={key} points={pointsOf(prim.points)} />;
    case 'polygon':
      return <polygon key={key} points={pointsOf(prim.points)} {...paint} />;
    default:
      return null;
  }
}

function pointsOf(points: readonly number[]): string {
  const pairs: string[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) pairs.push(`${points[i]},${points[i + 1]}`);
  return pairs.join(' ');
}
