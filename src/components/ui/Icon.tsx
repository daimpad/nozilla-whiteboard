/**
 * Icons in der Anwendungsoberfläche — zwei Komponenten, weil es zwei Sätze gibt.
 *
 * `Icon` zeichnet aus dem Satz des **Werkzeugs**: Leisten, Knöpfe, Listen,
 * Reiter. Er wechselt nicht mit dem Erscheinungsbild, aus demselben Grund, aus
 * dem die Leiste ihre Farbe nicht wechselt. Ein fremdes Set, dem `chevron-right`
 * fehlt, dürfte keinen Knopf leeren.
 *
 * `BrandIcon` zeichnet aus dem Satz des gerade gültigen **Erscheinungsbilds**.
 * Er gehört überall dorthin, wo die Oberfläche zeigt, *was auf der Folie
 * landen wird* — die Icon-Bibliothek, das Feld im Inspektor. Was dort steht,
 * muss dieselbe Zeichnung sein, die die Szene später setzt.
 *
 * Für die Fläche selbst geht nichts durch diese Datei — dort zeichnet die Szene
 * (`lib/export/scene.ts`), damit Fläche und Export identisch bleiben. Hier
 * steht nur, dass auch die Oberfläche aus denselben Primitiven zeichnet.
 */
import { memo } from 'react';
import {
  iconDef,
  iconGrid,
  iconStrokeGrid,
  toolIcon,
  withoutSignature,
  type IconDef,
  type IconName,
  type IconPaintRole,
  type IconPrim,
  type ToolIconName,
} from '@/assets/icons';
import { palette } from '@/theme';
import { useThemeVersion } from '@/hooks/useTheme';

export interface IconProps {
  name: ToolIconName;
  size?: number;
  /** Strichstärke im 64er-Raster; Vorgabe ist die CI-Stärke. */
  weight?: number;
  className?: string;
  title?: string;
  /** Die grüne Signatur unten rechts ausblenden — in kleinen Knöpfen zu laut. */
  signature?: boolean;
}

/**
 * Ohne Signalfarbe: die Oberfläche leiht sich nichts von der Marke, und in
 * einer Leiste wäre ein grüner Tupfer ohnehin nur laut. Alles nimmt die
 * Textfarbe des Knopfes an, auf dem das Zeichen sitzt.
 */
const toolPaint = () => 'currentColor';

function IconImpl({ name, signature = false, ...rest }: IconProps) {
  return <Glyphs def={toolIcon(name)} signature={signature} paint={toolPaint} {...rest} />;
}

/** Ein Zeichen aus dem Set des Erscheinungsbilds — eine Vorschau des Inhalts. */
export interface BrandIconProps extends Omit<IconProps, 'name'> {
  name: IconName | undefined;
}

/**
 * Dieselbe Auflösung wie in der Szene: die Grün-Rampe hat drei Stufen, und ein
 * halb umgefärbtes Pixelbild wäre schlimmer als ein einfarbiges. Was hier steht,
 * ist die Vorschau dessen, was `iconScene()` später setzt.
 */
function brandPaint(role: IconPaintRole | undefined): string {
  if (role === 'signal') return palette.signal;
  if (role === 'signal-soft') return palette.signalSoft;
  if (role === 'signal-deep') return palette.signalDeep;
  return 'currentColor';
}

function BrandIconImpl({ name, signature = false, ...rest }: BrandIconProps) {
  // Der Zähler steht hier nur, damit React nach einem Wechsel des
  // Erscheinungsbilds neu zeichnet; `iconDef()` liest das aktive Set selbst.
  useThemeVersion();
  return <Glyphs def={iconDef(name)} signature={signature} paint={brandPaint} {...rest} />;
}

export const Icon = memo(IconImpl);
export const BrandIcon = memo(BrandIconImpl);

/* -------------------------------------------------------------------------- */
/* Die gemeinsame Zeichnung                                                    */
/* -------------------------------------------------------------------------- */

function Glyphs({
  def,
  paint,
  size = 16,
  weight = iconStrokeGrid,
  className,
  title,
  signature,
}: Omit<IconProps, 'name' | 'signature'> & {
  def: IconDef;
  paint: (role: IconPaintRole | undefined) => string;
  signature: boolean;
}) {
  const prims = signature ? def.prims : withoutSignature(def.prims);

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
      {prims.map((prim, index) => renderPrim(prim, index, paint))}
    </svg>
  );
}

function renderPrim(
  prim: IconPrim,
  key: number,
  paint: (role: IconPaintRole | undefined) => string,
) {
  const colour = prim.fill
    ? { fill: paint(prim.fill), stroke: 'none' }
    : prim.stroke
      ? { stroke: paint(prim.stroke) }
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
      return <path key={key} d={prim.d} {...colour} {...extra} />;
    case 'circle':
      return <circle key={key} cx={prim.cx} cy={prim.cy} r={prim.r} {...colour} {...extra} />;
    case 'ellipse':
      return (
        <ellipse
          key={key}
          cx={prim.cx}
          cy={prim.cy}
          rx={prim.rx}
          ry={prim.ry}
          {...colour}
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
          {...colour}
          {...extra}
        />
      );
    default:
      return null;
  }
}
