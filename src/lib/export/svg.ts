/**
 * Scene → SVG.
 *
 * Output is a standalone, self-describing SVG 1.1 document: real `<path>`,
 * `<rect>`, `<ellipse>` and `<text>` elements — no `foreignObject`, no embedded
 * HTML, no rasterisation. It opens correctly in browsers *and* in vector
 * editors, and the text stays selectable and editable.
 *
 * Schriften: `<text>` allein nennt nur einen Namen, den die Gegenseite haben
 * muss. Deshalb kann `fontCss` die benutzten Schnitte als `@font-face` mit
 * Daten-URI *in die Datei* legen — dann trägt die Datei ihre Schrift selbst.
 * Wer sie in einem Programm öffnet, das eingebettete Schriften ignoriert,
 * nimmt statt dessen den Weg über Umrisse (`lib/export/outline.ts`); die
 * Szene enthält danach gar keinen Text mehr, sondern Konturen.
 */
import { brand, fontFamily } from '@/theme';
import { round, segsToPath } from '@/lib/geometry/path';
import type { Scene, ScenePrim, SceneRun } from './scene';

export interface SvgOptions {
  /** Pretty-print with newlines and indentation. */
  pretty?: boolean;
  /**
   * `@font-face`-Regeln, die in die Datei eingebettet werden — gebaut von
   * `fontFiles.embeddedFontCss()`. Ohne sie nennt die Datei ihre Schriften nur
   * beim Namen.
   */
  fontCss?: string;
}

export function sceneToSvg(scene: Scene, options: SvgOptions = {}): string {
  const { pretty = true } = options;
  const nl = pretty ? '\n' : '';
  const pad = pretty ? ' ' : '';

  const body = scene.prims.map((prim) => pad + primToSvg(prim)).join(nl);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" ` +
      `role="img" aria-label="${escapeXml(scene.title)}">`,
    `${pad}<title>${escapeXml(scene.title)}</title>`,
    /*
       Ohne Produktnamen fällt die Zeile weg, statt „Exported from " zu
       schreiben. Dasselbe Argument wie beim leeren `descr` eines
       Alternativtexts: eine leere Beschreibung behauptet, es gäbe eine, und ist
       damit schlechter als keine. Der Generator warnt beim Anlegen; das hier
       ist die andere Hälfte, und sie liegt außerhalb seiner Reichweite.
    */
    brand.product.trim() ? `${pad}<desc>Exported from ${escapeXml(brand.product)}</desc>` : '',
    fontStyleBlock(options.fontCss, pad),
    body,
    '</svg>',
    '',
  ]
    .filter((line) => line !== '')
    .join(nl);
}

/**
 * Der Stilblock mit den eingebetteten Schriften.
 *
 * Er steht in einem CDATA-Abschnitt, weil Base64 zwar keine spitzen Klammern
 * enthält, ein Stilblock in SVG aber grundsätzlich als Zeichendaten gilt —
 * ohne CDATA hinge die Datei von der Nachsicht des Parsers ab.
 */
function fontStyleBlock(css: string | undefined, pad: string): string {
  if (!css) return '';
  return `${pad}<defs><style type="text/css"><![CDATA[\n${css}\n]]></style></defs>`;
}

/** Convenience: the whole deck as a vertical strip of slides in one SVG. */
export function scenesToContactSheet(scenes: Scene[], gap = 24, fontCss?: string): string {
  if (scenes.length === 0)
    return sceneToSvg({ width: 0, height: 0, background: '#fff', prims: [], title: 'Empty' });
  const width = scenes[0].width;
  const height = scenes.reduce((sum, scene) => sum + scene.height + gap, 0) - gap;

  const groups = scenes
    .map((scene, index) => {
      const y = index * (scene.height + gap);
      const inner = scene.prims.map((prim) => `    ${primToSvg(prim)}`).join('\n');
      return `  <g transform="translate(0 ${y})">\n${inner}\n  </g>`;
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <title>${escapeXml(scenes[0].title)}</title>`,
    ...(fontCss ? [fontStyleBlock(fontCss, '  ')] : []),
    groups,
    '</svg>',
    '',
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Serialise primitives to SVG markup.
 *
 * The on-screen canvas injects this same markup into a live `<svg>`, which is
 * what makes the editor literally WYSIWYG with respect to SVG export: there is
 * no second renderer that could disagree.
 */
export function primsToSvgMarkup(prims: readonly ScenePrim[], separator = ''): string {
  return prims.map((prim) => primToSvg(prim)).join(separator);
}

function primToSvg(prim: ScenePrim): string {
  switch (prim.t) {
    case 'rect': {
      const attrs = [
        `x="${round(prim.x)}"`,
        `y="${round(prim.y)}"`,
        `width="${round(prim.w)}"`,
        `height="${round(prim.h)}"`,
      ];
      return `<rect ${attrs.join(' ')}${paintAttrs(prim)}/>`;
    }

    case 'ellipse':
      return (
        `<ellipse cx="${round(prim.cx)}" cy="${round(prim.cy)}" ` +
        `rx="${round(prim.rx)}" ry="${round(prim.ry)}"${paintAttrs(prim)}/>`
      );

    case 'path':
      return `<path d="${segsToPath(prim.segs)}"${paintAttrs(prim, !prim.closed)}/>`;

    case 'text':
      return textToSvg(prim);

    case 'image': {
      const transform = prim.rotate
        ? ` transform="rotate(${round(prim.rotate)} ${round(prim.x)} ${round(prim.y)})"`
        : '';
      const opacity = prim.opacity !== undefined ? ` opacity="${round(prim.opacity, 3)}"` : '';
      const kopf =
        `<image x="${round(prim.x)}" y="${round(prim.y)}" width="${round(prim.w)}" ` +
        `height="${round(prim.h)}" href="${escapeXml(prim.href)}" ` +
        `preserveAspectRatio="xMidYMid meet"${transform}${opacity}`;
      /*
         Der Alternativtext steht als `<title>`, weil das die Stelle ist, an
         der eine Hilfstechnik ihn sucht — in einer `.svg`-Datei genauso wie
         auf der Fläche, die dasselbe Markup einsetzt. Nebenwirkung auf dem
         Bildschirm: der Browser zeigt ihn als Kurzhinweis, wenn der Zeiger
         darauf steht. Das ist kein Unfall, sondern derselbe Text an derselben
         Stelle.
      */
      return prim.alt ? `${kopf}><title>${escapeXml(prim.alt)}</title></image>` : `${kopf}/>`;
    }

    default:
      return '';
  }
}

function paintAttrs(
  prim: Extract<ScenePrim, { t: 'rect' | 'ellipse' | 'path' }>,
  forceNoFill = false,
): string {
  const attrs: string[] = [];
  const fill = forceNoFill ? undefined : prim.fill;
  attrs.push(`fill="${fill ?? 'none'}"`);

  if (prim.stroke && (prim.strokeWidth ?? 0) > 0) {
    attrs.push(`stroke="${prim.stroke}"`);
    attrs.push(`stroke-width="${round(prim.strokeWidth ?? 1)}"`);
    if (prim.lineCap) attrs.push(`stroke-linecap="${prim.lineCap}"`);
    if (prim.lineJoin) attrs.push(`stroke-linejoin="${prim.lineJoin}"`);
    if (prim.dash?.length)
      attrs.push(`stroke-dasharray="${prim.dash.map((n) => round(n)).join(' ')}"`);
  }
  if (prim.opacity !== undefined && prim.opacity < 1) {
    attrs.push(`opacity="${round(prim.opacity, 3)}"`);
  }
  return ` ${attrs.join(' ')}`;
}

function textToSvg(prim: Extract<ScenePrim, { t: 'text' }>): string {
  if (prim.runs.length === 0) return '';

  const transform = prim.rotate
    ? ` transform="rotate(${round(prim.rotate)} ${round(prim.x)} ${round(prim.y)})"`
    : '';
  const opacity = prim.opacity !== undefined ? ` opacity="${round(prim.opacity, 3)}"` : '';

  const tspans = prim.runs
    .filter((run) => run.text.length > 0)
    .map((run) => runToTspan(run, prim.x, prim.y))
    .join('');

  const decorations = prim.runs
    .filter((run) => run.underline || run.strike)
    .map((run) => decorationRect(run, prim.x, prim.y))
    .join('');

  return (
    `<g${transform}${opacity}><text x="${round(prim.x)}" y="${round(prim.y)}" ` +
    `xml:space="preserve">${tspans}</text>${decorations}</g>`
  );
}

function runToTspan(run: SceneRun, originX: number, originY: number): string {
  const attrs = [
    `x="${round(originX + run.dx)}"`,
    `y="${round(originY)}"`,
    `font-family="${escapeXml(fontFamily[run.font.family])}"`,
    `font-size="${round(run.font.size)}"`,
    `font-weight="${run.font.weight}"`,
    `fill="${run.color}"`,
  ];
  if (run.font.italic) attrs.push('font-style="italic"');
  if (run.font.tracking) attrs.push(`letter-spacing="${round(run.font.tracking * run.font.size)}"`);
  return `<tspan ${attrs.join(' ')}>${escapeXml(run.text)}</tspan>`;
}

/**
 * Underlines and strikethroughs are drawn as rects rather than
 * `text-decoration`, which several vector editors ignore.
 */
function decorationRect(run: SceneRun, originX: number, originY: number): string {
  const thickness = Math.max(0.8, run.font.size * 0.058);
  const parts: string[] = [];
  if (run.underline) {
    parts.push(
      `<rect x="${round(originX + run.dx)}" y="${round(originY + run.font.size * 0.13)}" ` +
        `width="${round(run.width)}" height="${round(thickness)}" fill="${run.color}"/>`,
    );
  }
  if (run.strike) {
    parts.push(
      `<rect x="${round(originX + run.dx)}" y="${round(originY - run.font.size * 0.27)}" ` +
        `width="${round(run.width)}" height="${round(thickness)}" fill="${run.color}"/>`,
    );
  }
  return parts.join('');
}

/* -------------------------------------------------------------------------- */
/* Escaping                                                                    */
/* -------------------------------------------------------------------------- */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
