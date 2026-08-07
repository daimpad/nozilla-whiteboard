/**
 * Ein CI-Icon für die Anwendungsoberfläche (Werkzeugleisten, Knöpfe, Listen).
 *
 * Für die Fläche selbst geht nichts durch diese Komponente — dort zeichnet die
 * Szene, damit Canvas und Export identisch bleiben. Diese Datei sorgt nur
 * dafür, dass auch die Oberfläche aus demselben Set gezeichnet wird.
 */
import { memo } from 'react';
import { iconDef, iconGrid, iconStrokeGrid, type IconName, type IconPrim } from '@/assets/icons';
import { palette } from '@/theme';

export interface IconProps {
  name: IconName;
  size?: number;
  /** Strichstärke im 64er-Raster; Vorgabe ist die CI-Stärke. */
  weight?: number;
  className?: string;
  title?: string;
  /** Die grüne Signatur unten rechts ausblenden — in kleinen Knöpfen zu laut. */
  signature?: boolean;
}

function IconImpl({
  name,
  size = 16,
  weight = iconStrokeGrid,
  className,
  title,
  signature = false,
}: IconProps) {
  const def = iconDef(name);
  const prims = signature ? def.prims : def.prims.slice(0, -1);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${iconGrid} ${iconGrid}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {prims.map((prim, index) => renderPrim(prim, index))}
    </svg>
  );
}

export const Icon = memo(IconImpl);

function renderPrim(prim: IconPrim, key: number) {
  const paint = prim.fill
    ? { fill: prim.fill === 'signal' ? palette.signal : 'currentColor', stroke: 'none' }
    : prim.stroke === 'signal'
      ? { stroke: palette.signal }
      : undefined;
  const extra = {
    ...(prim.sw ? { strokeWidth: prim.sw } : {}),
    ...(prim.dash ? { strokeDasharray: prim.dash.join(' ') } : {}),
    ...(prim.rotate
      ? { transform: `rotate(${prim.rotate[0]} ${prim.rotate[1]} ${prim.rotate[2]})` }
      : {}),
  };

  switch (prim.t) {
    case 'path':
      return <path key={key} d={prim.d} {...paint} {...extra} />;
    case 'circle':
      return <circle key={key} cx={prim.cx} cy={prim.cy} r={prim.r} {...paint} {...extra} />;
    case 'ellipse':
      return (
        <ellipse
          key={key}
          cx={prim.cx}
          cy={prim.cy}
          rx={prim.rx}
          ry={prim.ry}
          {...paint}
          {...extra}
        />
      );
    case 'rect':
      return (
        <rect
          key={key}
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          {...paint}
          {...extra}
        />
      );
    default:
      return null;
  }
}
