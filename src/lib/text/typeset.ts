/**
 * A miniature Markdown typesetter.
 *
 * It turns Markdown into positioned, styled text lines plus the few decorations
 * that go with them (bullets, rules, code-block panels, quote bars, tables).
 * The output is deliberately dumb — absolute coordinates and paint properties —
 * so the SVG and PDF exporters can emit it without understanding Markdown at
 * all. That is what makes exports *vector text* rather than screenshots.
 *
 * The DOM renders Markdown with CSS instead, but from the same CI type scale
 * (`theme.config.ts`), so the two agree closely.
 */
import type { Token, Tokens } from 'marked';
import { color as ci, stroke, typeScale } from '@/theme';
import type { TypeStyleName } from '@/theme';
import { lexMarkdown } from '@/lib/markdown/render';
import { baselineOffset, font, measureText, type FontSpec } from './measure';

/* -------------------------------------------------------------------------- */
/* Output model                                                                */
/* -------------------------------------------------------------------------- */

export interface PositionedRun {
  /** Offset from the line's origin x. */
  dx: number;
  text: string;
  font: FontSpec;
  color: string;
  underline?: boolean;
  strike?: boolean;
  /** Inline-Code bekommt eine getönte Platte. */
  plate?: boolean;
  /** Grüner Marker hinter dem Wort — das Signature-Element der CI. */
  mark?: boolean;
  width: number;
}

/** A uniformly-styled span of text, before line breaking. */
export interface StyledRun {
  text: string;
  font: FontSpec;
  color: string;
  underline?: boolean;
  strike?: boolean;
  /** Erzwingt einen Umbruch vor diesem Lauf (aus `<br>`). */
  hardBreak?: boolean;
  /** Inline-Code bekommt eine getönte Platte. */
  plate?: boolean;
  /** Grüner Marker hinter dem Wort. */
  mark?: boolean;
}

export type TypesetPrim =
  | {
      t: 'text';
      /** Left edge of the line (runs are positioned relative to this). */
      x: number;
      /** Baseline y. */
      y: number;
      runs: PositionedRun[];
      width: number;
    }
  | {
      t: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      r?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | { t: 'image'; x: number; y: number; w: number; h: number; src: string; alt: string };

export interface TypesetResult {
  prims: TypesetPrim[];
  /** Total laid-out height. */
  height: number;
  /** Widest laid-out line — useful for shrink-to-fit boxes. */
  width: number;
}

export interface TypesetPalette {
  text: string;
  muted: string;
  /** Die Farbe für Aufzählungszeichen, Regeln und den Zitatbalken. */
  accent: string;
  border: string;
  codeText: string;
  codeBackground: string;
  quoteBar: string;
  /** Der grüne Marker. Immer Signal — er ist die Signatur, keine Dekoration. */
  marker: string;
  markerText: string;
}

export const defaultPalette: TypesetPalette = {
  text: ci.ink,
  muted: ci.inkMuted,
  accent: ci.ink,
  border: ci.line,
  codeText: ci.ink,
  codeBackground: ci.surfaceAlt,
  quoteBar: ci.ink,
  marker: ci.signal,
  markerText: ci.inkOnSignal,
};

export interface TypesetOptions {
  /** Available width for the flow, in slide units. */
  width: number;
  palette?: Partial<TypesetPalette>;
  /** Multiplies every type size — used to fit a deck into a smaller frame. */
  scale?: number;
  align?: 'left' | 'center' | 'right';
  /** The type style used for body paragraphs (headings scale from the CI ramp). */
  baseStyle?: TypeStyleName;
  /** Look up an image's intrinsic size so exports can lay it out correctly. */
  resolveImageSize?: (src: string) => { w: number; h: number } | undefined;
  /** Starting y offset. */
  offsetY?: number;
  /** Starting x offset. */
  offsetX?: number;
}

/* -------------------------------------------------------------------------- */
/* Entry points                                                                */
/* -------------------------------------------------------------------------- */

const HEADING_STYLES: TypeStyleName[] = ['h1', 'h1', 'h2', 'h3', 'h4', 'h4', 'h4'];

export function typesetMarkdown(source: string, options: TypesetOptions): TypesetResult {
  const layout = new Layout(options);
  layout.blocks(lexMarkdown(source ?? ''), 0);
  return layout.finish();
}

/**
 * Lay out a plain (but inline-Markdown-aware) string in one type style — the
 * text element's renderer.
 */
export function typesetText(
  text: string,
  styleName: TypeStyleName,
  options: TypesetOptions,
): TypesetResult {
  const layout = new Layout({ ...options, baseStyle: styleName });
  const style = typeScale[styleName];
  const scale = options.scale ?? 1;
  const spec = font({
    family: style.family,
    size: style.size * scale,
    weight: style.weight,
    tracking: style.tracking,
  });
  const lineHeight = style.size * scale * style.lineHeight;
  const source = style.caps ? (text ?? '').toLocaleUpperCase('de-DE') : (text ?? '');

  for (const paragraph of source.split(/\n/)) {
    if (paragraph.trim() === '') {
      layout.advance(lineHeight * 0.5);
      continue;
    }
    layout.paragraph(
      flattenInline(inlineTokensOf(paragraph), spec, layout.palette.text),
      lineHeight,
      0,
    );
  }

  return layout.finish();
}

/* -------------------------------------------------------------------------- */
/* Layout engine                                                               */
/* -------------------------------------------------------------------------- */

class Layout {
  readonly prims: TypesetPrim[] = [];
  readonly palette: TypesetPalette;
  readonly width: number;
  readonly scale: number;
  readonly align: 'left' | 'center' | 'right';
  readonly baseStyle: TypeStyleName;
  readonly originX: number;
  readonly resolveImageSize?: (src: string) => { w: number; h: number } | undefined;

  y: number;
  maxWidth = 0;
  private firstBlock = true;

  constructor(options: TypesetOptions) {
    this.palette = { ...defaultPalette, ...options.palette };
    this.width = Math.max(1, options.width);
    this.scale = options.scale ?? 1;
    this.align = options.align ?? 'left';
    this.baseStyle = options.baseStyle ?? 'body';
    this.originX = options.offsetX ?? 0;
    this.y = options.offsetY ?? 0;
    this.resolveImageSize = options.resolveImageSize;
  }

  get baseSize(): number {
    return typeScale[this.baseStyle].size * this.scale;
  }

  advance(amount: number): void {
    this.y += amount;
  }

  finish(): TypesetResult {
    return { prims: this.prims, height: Math.max(0, this.y), width: this.maxWidth };
  }

  private gapBefore(amount: number): void {
    if (this.firstBlock) {
      this.firstBlock = false;
      return;
    }
    this.y += amount;
  }

  blocks(tokens: readonly Token[], indent: number): void {
    for (const token of tokens) this.block(token, indent);
  }

  block(token: Token, indent: number): void {
    const base = this.baseSize;

    switch (token.type) {
      case 'space':
        return;

      case 'heading': {
        const heading = token as Tokens.Heading;
        const styleName = HEADING_STYLES[Math.min(heading.depth, 6)] ?? 'h3';
        const style = typeScale[styleName];
        const spec = font({
          family: style.family,
          size: style.size * this.scale,
          weight: style.weight,
          tracking: style.tracking,
        });
        this.gapBefore(style.size * this.scale * 0.55);
        const runs = flattenInline(heading.tokens ?? [], spec, this.palette.text);
        this.paragraph(runs, style.size * this.scale * style.lineHeight, indent);
        this.y += style.size * this.scale * 0.32;
        return;
      }

      case 'paragraph': {
        const paragraph = token as Tokens.Paragraph;
        // A paragraph that is only an image becomes a figure.
        const only = paragraph.tokens?.length === 1 ? paragraph.tokens[0] : null;
        if (only && only.type === 'image') {
          this.image(only as Tokens.Image, indent);
          return;
        }
        this.gapBefore(base * 0.35);
        const style = typeScale[this.baseStyle];
        const spec = font({
          family: style.family,
          size: base,
          weight: style.weight,
          tracking: style.tracking,
        });
        const runs = flattenInline(paragraph.tokens ?? [], spec, this.palette.text);
        this.paragraph(runs, base * style.lineHeight, indent);
        this.y += base * 0.42;
        return;
      }

      case 'text': {
        const textToken = token as Tokens.Text;
        const style = typeScale[this.baseStyle];
        const spec = font({
          family: style.family,
          size: base,
          weight: style.weight,
          tracking: style.tracking,
        });
        const runs = textToken.tokens
          ? flattenInline(textToken.tokens, spec, this.palette.text)
          : [{ text: textToken.text ?? '', font: spec, color: this.palette.text }];
        this.paragraph(runs, base * style.lineHeight, indent);
        return;
      }

      case 'list': {
        const list = token as Tokens.List;
        this.gapBefore(base * 0.35);
        let counter = Number(list.start ?? 1) || 1;
        for (const item of list.items) {
          this.listItem(item, indent, list.ordered, counter);
          counter += 1;
        }
        this.y += base * 0.42;
        return;
      }

      case 'code': {
        this.codeBlock(token as Tokens.Code, indent);
        return;
      }

      case 'blockquote': {
        this.blockquote(token as Tokens.Blockquote, indent);
        return;
      }

      case 'hr': {
        this.gapBefore(base * 0.9);
        this.prims.push({
          t: 'rect',
          x: this.originX + indent,
          y: this.y,
          w: this.width - indent,
          h: stroke.rule,
          fill: this.palette.border,
        });
        this.y += base * 0.9 + stroke.rule;
        return;
      }

      case 'table': {
        this.table(token as Tokens.Table, indent);
        return;
      }

      case 'html': {
        // Raw HTML is not typeset — exporting it as vector text would be a lie.
        return;
      }

      default: {
        const withTokens = token as Token & { tokens?: Token[] };
        if (withTokens.tokens?.length) this.blocks(withTokens.tokens, indent);
      }
    }
  }

  /* ------------------------------------------------------------------ items */

  private listItem(item: Tokens.ListItem, indent: number, ordered: boolean, counter: number): void {
    const base = this.baseSize;
    const style = typeScale[this.baseStyle];
    const spec = font({
      family: style.family,
      size: base,
      weight: style.weight,
      tracking: style.tracking,
    });
    const markerWidth = base * 1.35;
    const lineHeight = base * style.lineHeight;
    const top = this.y;

    // Marker
    if (item.task) {
      const boxSize = base * 0.72;
      const boxY = top + (lineHeight - boxSize) / 2;
      this.prims.push({
        t: 'rect',
        x: this.originX + indent,
        y: boxY,
        w: boxSize,
        h: boxSize,
        fill: item.checked ? this.palette.marker : 'transparent',
        stroke: this.palette.border,
        strokeWidth: stroke.rule,
      });
      if (item.checked) {
        const tick = font({ family: 'body', size: boxSize * 0.8, weight: 700 });
        this.prims.push({
          t: 'text',
          x: this.originX + indent + boxSize * 0.19,
          y: boxY + baselineOffset(tick.size, boxSize),
          width: boxSize,
          runs: [
            {
              dx: 0,
              text: '✓',
              font: tick,
              color: this.palette.markerText,
              width: measureText('✓', tick),
            },
          ],
        });
      }
    } else if (ordered) {
      const label = `${counter}.`;
      const markerFont = font({
        family: style.family,
        size: base,
        weight: 600,
        tracking: style.tracking,
      });
      const w = measureText(label, markerFont);
      this.prims.push({
        t: 'text',
        x: this.originX + indent + markerWidth - base * 0.45 - w,
        y: top + baselineOffset(base, lineHeight),
        width: w,
        runs: [{ dx: 0, text: label, font: markerFont, color: this.palette.muted, width: w }],
      });
    } else {
      // Quadrat, kein Punkt: die Formensprache kennt keine runden Ecken.
      const size = base * 0.3;
      this.prims.push({
        t: 'rect',
        x: this.originX + indent + base * 0.24,
        y: top + lineHeight / 2 - size / 2,
        w: size,
        h: size,
        fill: this.palette.accent,
      });
    }

    // Content, indented past the marker.
    const contentIndent = indent + markerWidth;
    const inlineTokens: Token[] = [];
    const nested: Token[] = [];
    for (const child of item.tokens ?? []) {
      if (child.type === 'list' || child.type === 'code' || child.type === 'blockquote') {
        nested.push(child);
      } else {
        inlineTokens.push(child);
      }
    }

    if (inlineTokens.length > 0) {
      const runs = inlineTokens.flatMap((child) => {
        const withTokens = child as Token & { tokens?: Token[]; text?: string };
        return withTokens.tokens
          ? flattenInline(withTokens.tokens, spec, this.palette.text)
          : [{ text: withTokens.text ?? '', font: spec, color: this.palette.text }];
      });
      this.paragraph(runs, lineHeight, contentIndent);
    } else {
      this.y += lineHeight;
    }

    if (nested.length > 0) {
      this.y += base * 0.15;
      const wasFirst = this.firstBlock;
      this.firstBlock = true;
      this.blocks(nested, contentIndent);
      this.firstBlock = wasFirst;
    }

    this.y += base * 0.22;
  }

  private codeBlock(token: Tokens.Code, indent: number): void {
    const base = this.baseSize;
    const style = typeScale.code;
    const size = style.size * this.scale;
    const spec = font({ family: 'mono', size, weight: style.weight });
    const lineHeight = size * style.lineHeight;
    const padding = base * 0.75;
    const boxWidth = this.width - indent;
    const innerWidth = boxWidth - padding * 2;

    this.gapBefore(base * 0.4);
    const top = this.y;

    const sourceLines = (token.text ?? '').replace(/\n+$/, '').split('\n');
    const laid: Array<{ text: string }> = [];
    for (const sourceLine of sourceLines) {
      laid.push(...softWrapMono(sourceLine, spec, innerWidth));
    }

    const boxHeight = padding * 2 + Math.max(1, laid.length) * lineHeight;
    this.prims.push({
      t: 'rect',
      x: this.originX + indent,
      y: top,
      w: boxWidth,
      h: boxHeight,
      fill: this.palette.codeBackground,
      stroke: this.palette.border,
      strokeWidth: stroke.hair,
    });

    let lineY = top + padding;
    for (const laidLine of laid) {
      const w = measureText(laidLine.text, spec);
      this.prims.push({
        t: 'text',
        x: this.originX + indent + padding,
        y: lineY + baselineOffset(size, lineHeight),
        width: w,
        runs: [{ dx: 0, text: laidLine.text, font: spec, color: this.palette.codeText, width: w }],
      });
      this.trackWidth(indent + padding + w);
      lineY += lineHeight;
    }

    this.y = top + boxHeight + base * 0.5;
  }

  private blockquote(token: Tokens.Blockquote, indent: number): void {
    const base = this.baseSize;
    const barWidth = stroke.strong * this.scale;
    const gutter = base * 0.9;

    this.gapBefore(base * 0.4);
    const contentTop = this.y;

    const wasFirst = this.firstBlock;
    this.firstBlock = true;
    this.blocks(token.tokens ?? [], indent + gutter);
    this.firstBlock = wasFirst;

    this.prims.push({
      t: 'rect',
      x: this.originX + indent,
      y: contentTop,
      w: barWidth,
      h: Math.max(base, this.y - contentTop),
      fill: this.palette.quoteBar,
    });

    this.y += base * 0.3;
  }

  private table(token: Tokens.Table, indent: number): void {
    const base = this.baseSize;
    const style = typeScale.small;
    const size = style.size * this.scale;
    const cellPadY = size * 0.55;
    const cellPadX = size * 0.7;
    const boxWidth = this.width - indent;
    const columns = Math.max(1, token.header.length);
    const colWidth = boxWidth / columns;

    this.gapBefore(base * 0.4);
    let y = this.y;

    const drawRow = (cells: Tokens.TableCell[], bold: boolean) => {
      const spec = font({
        family: style.family,
        size,
        weight: bold ? 600 : style.weight,
        tracking: style.tracking,
      });
      const lineHeight = size * style.lineHeight;
      let rowHeight = lineHeight;
      const rowTop = y;

      cells.forEach((cell, index) => {
        const runs = flattenInline(
          cell.tokens ?? [],
          spec,
          bold ? this.palette.text : this.palette.muted,
        );
        const lines = wrapRuns(runs, colWidth - cellPadX * 2);
        rowHeight = Math.max(rowHeight, lines.length * lineHeight);
        lines.forEach((lineRuns, lineIndex) => {
          const lineWidth = lineRuns.reduce((sum, run) => sum + run.width, 0);
          this.prims.push({
            t: 'text',
            x: this.originX + indent + index * colWidth + cellPadX,
            y: rowTop + cellPadY + lineIndex * lineHeight + baselineOffset(size, lineHeight),
            width: lineWidth,
            runs: lineRuns,
          });
        });
      });

      y = rowTop + rowHeight + cellPadY * 2;
      this.prims.push({
        t: 'rect',
        x: this.originX + indent,
        y: y - stroke.hair,
        w: boxWidth,
        h: stroke.hair,
        fill: this.palette.border,
      });
    };

    drawRow(token.header, true);
    for (const row of token.rows) drawRow(row, false);

    this.y = y + base * 0.5;
    this.trackWidth(indent + boxWidth);
  }

  private image(token: Tokens.Image, indent: number): void {
    const available = this.width - indent;
    const intrinsic = this.resolveImageSize?.(token.href) ?? undefined;
    const ratio = intrinsic && intrinsic.w > 0 ? intrinsic.h / intrinsic.w : 0.5625;
    const w = intrinsic ? Math.min(available, intrinsic.w) : available;
    const h = w * ratio;

    this.gapBefore(this.baseSize * 0.4);
    this.prims.push({
      t: 'image',
      x: this.originX + indent,
      y: this.y,
      w,
      h,
      src: token.href,
      alt: token.text ?? '',
    });
    this.y += h + this.baseSize * 0.5;
    this.trackWidth(indent + w);
  }

  /* --------------------------------------------------------------- helpers */

  /** Wrap `runs` into lines and emit them, advancing `y`. */
  paragraph(runs: readonly StyledRun[], lineHeight: number, indent: number): void {
    const available = this.width - indent;
    const lines = wrapRuns(runs, available);

    for (const lineRuns of lines) {
      const lineWidth = lineRuns.reduce((sum, run) => sum + run.width, 0);
      let x = this.originX + indent;
      if (this.align === 'center') x += (available - lineWidth) / 2;
      else if (this.align === 'right') x += available - lineWidth;

      // Flächen hinter dem Text: erst der grüne Marker, dann die Code-Platte.
      // Beide sind echte Rechtecke ohne Radius — so exportieren sie exakt.
      for (const run of lineRuns) {
        if (run.mark) {
          const padX = run.font.size * 0.16;
          this.prims.push({
            t: 'rect',
            x: x + run.dx - padX,
            y: this.y + lineHeight / 2 - run.font.size * 0.66,
            w: run.width + padX * 2,
            h: run.font.size * 1.3,
            fill: this.palette.marker,
          });
        }
        if (run.plate) {
          const padX = run.font.size * 0.22;
          this.prims.push({
            t: 'rect',
            x: x + run.dx - padX,
            y: this.y + lineHeight / 2 - run.font.size * 0.72,
            w: run.width + padX * 2,
            h: run.font.size * 1.42,
            fill: this.palette.codeBackground,
          });
        }
      }

      this.prims.push({
        t: 'text',
        x,
        y: this.y + baselineOffset(maxFontSize(lineRuns), lineHeight),
        width: lineWidth,
        runs: lineRuns,
      });
      this.trackWidth(indent + lineWidth);
      this.y += lineHeight;
    }

    if (lines.length === 0) this.y += lineHeight;
  }

  private trackWidth(value: number): void {
    if (value > this.maxWidth) this.maxWidth = value;
  }
}

function maxFontSize(runs: readonly PositionedRun[]): number {
  return runs.reduce((max, run) => Math.max(max, run.font.size), 0);
}

/* -------------------------------------------------------------------------- */
/* Inline handling                                                             */
/* -------------------------------------------------------------------------- */

function inlineTokensOf(text: string): Token[] {
  const first = lexMarkdown(text)[0] as (Token & { tokens?: Token[] }) | undefined;
  if (first?.tokens?.length) return first.tokens;
  return [{ type: 'text', raw: text, text } as Token];
}

/** Flatten marked's inline token tree into a list of uniformly-styled runs. */
export function flattenInline(
  tokens: readonly Token[],
  base: FontSpec,
  color: string,
): StyledRun[] {
  const out: StyledRun[] = [];

  const walk = (
    list: readonly Token[],
    spec: FontSpec,
    currentColor: string,
    deco: Partial<StyledRun>,
  ) => {
    for (const token of list) {
      const withTokens = token as Token & { tokens?: Token[]; text?: string };
      switch (token.type) {
        case 'strong':
          walk(withTokens.tokens ?? [], { ...spec, weight: 700 }, currentColor, deco);
          break;
        case 'em':
          walk(withTokens.tokens ?? [], { ...spec, italic: true }, currentColor, deco);
          break;
        case 'del':
          walk(withTokens.tokens ?? [], spec, currentColor, { ...deco, strike: true });
          break;
        case 'mark':
          // Der grüne Marker färbt nicht den Text, er legt eine Fläche darunter.
          walk(withTokens.tokens ?? [], spec, currentColor, { ...deco, mark: true });
          break;
        case 'link': {
          // Kein eigenes Linkblau: die CI kennt drei Farbrollen, und Blau ist
          // keine davon. Ein Link ist unterstrichene Tinte.
          const link = token as Tokens.Link;
          if (link.tokens?.length) {
            walk(link.tokens, spec, currentColor, { ...deco, underline: true });
          } else {
            out.push({
              text: link.text ?? link.href,
              font: spec,
              color: currentColor,
              underline: true,
              ...deco,
            });
          }
          break;
        }
        case 'codespan': {
          const codeSpec: FontSpec = {
            ...spec,
            family: 'mono',
            size: spec.size * 0.94,
            tracking: 0,
          };
          out.push({
            text: (token as Tokens.Codespan).text ?? '',
            font: codeSpec,
            color: currentColor,
            plate: true,
            ...deco,
          });
          break;
        }
        case 'br':
          out.push({ text: '', font: spec, color: currentColor, hardBreak: true });
          break;
        case 'image':
          out.push({
            text: (token as Tokens.Image).text || '',
            font: { ...spec, italic: true },
            color: currentColor,
            ...deco,
          });
          break;
        case 'escape':
        case 'text':
        default: {
          if (withTokens.tokens?.length) {
            walk(withTokens.tokens, spec, currentColor, deco);
          } else if (withTokens.text) {
            out.push({
              text: decodeEntities(withTokens.text),
              font: spec,
              color: currentColor,
              ...deco,
            });
          }
        }
      }
    }
  };

  walk(tokens, base, color, {});
  return out;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp|hellip|mdash|ndash);/g, (m) => ENTITIES[m] ?? m);
}

/* -------------------------------------------------------------------------- */
/* Line breaking                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Greedy line breaking across a list of styled runs. Words never split unless a
 * single word is wider than the line, in which case it is broken by character —
 * the same behaviour a browser gives with `overflow-wrap: anywhere`.
 */
export function wrapRuns(runs: readonly StyledRun[], maxWidth: number): PositionedRun[][] {
  const lines: PositionedRun[][] = [];
  let current: PositionedRun[] = [];
  let x = 0;

  const flush = () => {
    // Trim trailing whitespace from the finished line.
    while (current.length > 0 && current[current.length - 1].text.trim() === '') {
      const removed = current.pop();
      if (removed) x -= removed.width;
    }
    if (current.length > 0) lines.push(current);
    current = [];
    x = 0;
  };

  const push = (run: StyledRun, text: string, width: number) => {
    current.push({
      dx: x,
      text,
      font: run.font,
      color: run.color,
      underline: run.underline,
      strike: run.strike,
      plate: run.plate,
      mark: run.mark,
      width,
    });
    x += width;
  };

  for (const run of runs) {
    if (run.hardBreak) {
      flush();
      continue;
    }
    const pieces = run.text.split(/(\s+)/).filter((piece) => piece !== '');
    for (const piece of pieces) {
      const isSpace = piece.trim() === '';
      const width = measureText(piece, run.font);

      if (isSpace) {
        if (current.length === 0) continue; // no leading spaces
        if (x + width > maxWidth) {
          flush();
          continue;
        }
        push(run, piece, width);
        continue;
      }

      if (x + width <= maxWidth || current.length === 0) {
        if (width > maxWidth && current.length === 0) {
          // A single unbreakable token wider than the line: break by character.
          for (const chunk of breakByCharacter(piece, run.font, maxWidth)) {
            if (x > 0) flush();
            push(run, chunk.text, chunk.width);
          }
          continue;
        }
        push(run, piece, width);
        continue;
      }

      flush();
      push(run, piece, width);
    }
  }

  flush();
  return lines;
}

function breakByCharacter(
  text: string,
  spec: FontSpec,
  maxWidth: number,
): Array<{ text: string; width: number }> {
  const out: Array<{ text: string; width: number }> = [];
  let buffer = '';
  for (const char of text) {
    const next = buffer + char;
    if (buffer && measureText(next, spec) > maxWidth) {
      out.push({ text: buffer, width: measureText(buffer, spec) });
      buffer = char;
    } else {
      buffer = next;
    }
  }
  if (buffer) out.push({ text: buffer, width: measureText(buffer, spec) });
  return out;
}

/** Soft-wrap a code line without breaking on spaces. */
function softWrapMono(text: string, spec: FontSpec, maxWidth: number): Array<{ text: string }> {
  if (!text) return [{ text: '' }];
  if (measureText(text, spec) <= maxWidth) return [{ text }];
  return breakByCharacter(text, spec, maxWidth).map((chunk) => ({ text: chunk.text }));
}
