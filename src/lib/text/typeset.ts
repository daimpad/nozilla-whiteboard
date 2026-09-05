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
  /**
   * Wie weit nach rechts wirklich etwas gesetzt wurde.
   *
   * Gemessen am fertigen Primitiv und nicht an einer Buchführung nebenher: die
   * hakte an fünf Stellen ein und ließ die Linie, den Zitatbalken und den
   * Marker aus — ein Codeblock über die volle Breite meldete 105,6 von 600, und
   * die Zeile darüber versprach „die breiteste gesetzte Zeile". Wer hier
   * einpassen will, muss wissen, dass eine Linie und eine Codeplatte die
   * angebotene Breite *nehmen* und nicht *fordern*; die Zahl sagt, was dasteht,
   * nicht, was nötig wäre.
   */
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

/** Die Farben, mit denen gesetzt wird, wenn niemand andere nennt. */
export function defaultPalette(): TypesetPalette {
  return {
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
}

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
  private firstBlock = true;

  constructor(options: TypesetOptions) {
    this.palette = { ...defaultPalette(), ...options.palette };
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
    return {
      prims: this.prims,
      height: Math.max(0, this.y),
      width: Math.max(0, rechterRand(this.prims) - this.originX),
    };
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
        /*
           Ein Bild wird eine Abbildung — auch dann, wenn Text danebensteht.

           Erkannt wurde es nur, wenn der Absatz aus **genau einem** Token
           bestand. Stand ein Wort daneben — „Siehe ![Logo](logo.png) hier." —,
           ging der Absatz den Inline-Weg, und dort wird aus einem
           `image`-Token stillschweigend ein *kursiver Textlauf mit dem
           Alternativtext*: das Bild fiel aus jeder Ausgabe, und auf der Folie
           stand „Logo" in Kursiv. Wer ein Bild einsetzt und Worte daneben
           schreibt, bekam Worte.

           Getrennt wird deshalb: die Bilder werden zu Abbildungen, der Rest zu
           Absätzen, in der Reihenfolge des Textes. Das ist eine andere
           Anordnung als im Browser — dort läuft ein Bild im Text mit —, aber
           es ist die Anordnung, die dieses Werkzeug für ein Bild kennt, und
           kein stiller Verlust.
        */
        const style = typeScale[this.baseStyle];
        const spec = font({
          family: style.family,
          size: base,
          weight: style.weight,
          tracking: style.tracking,
        });
        const teile = paragraph.tokens ?? [];
        if (teile.some((teil) => teil.type === 'image')) {
          for (const teil of absatzteile(teile)) {
            if ('bild' in teil) {
              this.image(teil.bild, indent);
              continue;
            }
            const runs = flattenInline(teil.inline, spec, this.palette.text);
            if (runs.every((run) => run.text.trim() === '')) continue;
            this.gapBefore(base * 0.35);
            this.paragraph(runs, base * style.lineHeight, indent);
            this.y += base * 0.42;
          }
          return;
        }

        this.gapBefore(base * 0.35);
        const runs = flattenInline(teile, spec, this.palette.text);
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
          : [{ text: laufText(textToken.text ?? ''), font: spec, color: this.palette.text }];
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
          w: this.platz(indent),
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
      /*
         Ein Absatz bleibt ein Absatz — auch im Listenpunkt.

         Verschmolzen wurde hier alles zu *einer* Laufreihe: ein lockerer
         Listenpunkt (Leerzeile zwischen zwei Absätzen, die gewöhnliche
         Schreibweise für einen mehrteiligen Punkt) klebte damit zusammen zu
         „Erster Absatz.Zweiter Absatz." — ohne Leerzeichen, ohne Umbruch, in
         jeder Ausgabe. Absätze gehen deshalb einzeln durch, alles andere wird
         wie zuvor zusammengezogen.
      */
      let gesammelt: StyledRun[] = [];
      let erster = true;
      const setze = () => {
        if (gesammelt.length === 0) return;
        if (!erster) this.y += base * 0.3;
        this.paragraph(gesammelt, lineHeight, contentIndent);
        gesammelt = [];
        erster = false;
      };
      for (const child of inlineTokens) {
        /*
           Die Leerzeile *ist* die Grenze. Ein lockerer Listenpunkt bekommt von
           marked kein `paragraph`, sondern zwei `text`-Kinder mit einem
           `space` dazwischen — und weil hier alles zu einer Laufreihe
           verschmolzen wurde, stand danach „Erster Absatz.Zweiter Absatz."
        */
        if (child.type === 'space') {
          setze();
          continue;
        }
        const withTokens = child as Token & { tokens?: Token[]; text?: string };
        if (!withTokens.tokens) {
          gesammelt.push({
            text: laufText(withTokens.text ?? ''),
            font: spec,
            color: this.palette.text,
          });
          continue;
        }
        /*
           Und eine Abbildung bleibt auch hier eine Abbildung.

           Der Zerleger stand nur im Absatz-Zweig; ein Listenpunkt reicht seine
           Kinder an `flattenInline()` weiter, und dort wird aus einem
           `image`-Token stillschweigend ein *kursiver Lauf mit dem
           Alternativtext*. Aus `- ![Logo](logo.png)` wurde damit „Logo" in
           Kursiv — in jeder Ausgabe, ohne ein Wort. Genau der Fehler, der im
           Absatz schon einmal behoben wurde, eine Einrückung weiter.
        */
        for (const teil of absatzteile(withTokens.tokens)) {
          if ('bild' in teil) {
            setze();
            this.image(teil.bild, contentIndent);
            continue;
          }
          gesammelt.push(...flattenInline(teil.inline, spec, this.palette.text));
        }
      }
      setze();
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
    const boxWidth = this.platz(indent);
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
    const boxWidth = this.platz(indent);
    const columns = Math.max(1, token.header.length);

    const specFor = (bold: boolean) =>
      font({
        family: style.family,
        size,
        weight: bold ? 600 : style.weight,
        tracking: style.tracking,
      });

    const runsFor = (cell: Tokens.TableCell | undefined, bold: boolean) =>
      flattenInline(
        cell?.tokens ?? [],
        specFor(bold),
        bold ? this.palette.text : this.palette.muted,
      );

    const spalten = tableColumnWidths(
      [token.header, ...token.rows].map((row) =>
        Array.from({ length: columns }, (_, index) => runsFor(row[index], row === token.header)),
      ),
      boxWidth,
      cellPadX,
      size,
    );
    const links = spalten.map((_, index) => spalten.slice(0, index).reduce((a, b) => a + b, 0));

    this.gapBefore(base * 0.4);
    let y = this.y;

    const drawRow = (cells: Tokens.TableCell[], bold: boolean) => {
      const lineHeight = size * style.lineHeight;
      let rowHeight = lineHeight;
      const rowTop = y;

      for (let index = 0; index < columns; index += 1) {
        const runs = runsFor(cells[index], bold);
        const innen = Math.max(size, spalten[index] - cellPadX * 2);
        const lines = wrapRuns(runs, innen);
        rowHeight = Math.max(rowHeight, lines.length * lineHeight);
        // Die Ausrichtung steht in der Trennzeile der Tabelle — `---:` heißt
        // rechtsbündig, und genau so setzt man Zahlen.
        const richtung = token.align?.[index] ?? null;
        lines.forEach((lineRuns, lineIndex) => {
          const lineWidth = lineRuns.reduce((sum, run) => sum + run.width, 0);
          const versatz =
            richtung === 'right'
              ? innen - lineWidth
              : richtung === 'center'
                ? (innen - lineWidth) / 2
                : 0;
          this.prims.push({
            t: 'text',
            x: this.originX + indent + links[index] + cellPadX + Math.max(0, versatz),
            y: rowTop + cellPadY + lineIndex * lineHeight + baselineOffset(size, lineHeight),
            width: lineWidth,
            runs: lineRuns,
          });
        });
      }

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
  }

  private image(token: Tokens.Image, indent: number): void {
    const available = this.platz(indent);
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
  }

  /* --------------------------------------------------------------- helpers */

  /** Wrap `runs` into lines and emit them, advancing `y`. */
  paragraph(runs: readonly StyledRun[], lineHeight: number, indent: number): void {
    const available = this.platz(indent);
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
          // Die Kontur ist nicht Zierde, sondern das, was `code` im CI-Dokument
          // trägt: Fläche *und* Haarlinie. Solange die Cremetöne verschieden
          // waren, reichte die Fläche; seit es einen gibt, ist die Linie das
          // Einzige, was ein Wort in Space Mono vom Papier abhebt.
          const padX = run.font.size * 0.22;
          this.prims.push({
            t: 'rect',
            x: x + run.dx - padX,
            y: this.y + lineHeight / 2 - run.font.size * 0.72,
            w: run.width + padX * 2,
            h: run.font.size * 1.42,
            fill: this.palette.codeBackground,
            stroke: this.palette.border,
            strokeWidth: stroke.hair,
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
      this.y += lineHeight;
    }

    if (lines.length === 0) this.y += lineHeight;
  }

  /**
   * Was von der Breite nach dem Einzug übrig bleibt — nie weniger als nichts.
   *
   * Ein tief verschachtelter Listenpunkt schiebt den Einzug über die Breite
   * hinaus, und `this.width - indent` wurde dann negativ. Das ist keine
   * Übertreibung von „passt nicht", sondern ein ungültiges Maß: die Codeplatte
   * kam als `<rect width="-6.4">` heraus — im SVG ein Fehlerwert, den kein
   * Betrachter zeichnet —, und im PPTX-Weg wird daraus ein `<a:ext cx="-…">`,
   * das die Datei gegen ihr eigenes Schema stellt. Der Inhalt läuft weiterhin
   * über die Kante, wie im Browser auch; nur die Maße bleiben Maße.
   */
  private platz(indent: number): number {
    return Math.max(0, this.width - indent);
  }
}

/** Der äußerste rechte Rand über alle Primitive — in Folien-Koordinaten. */
function rechterRand(prims: readonly TypesetPrim[]): number {
  let rand = 0;
  for (const prim of prims) {
    const ende =
      prim.t === 'text'
        ? prim.x + prim.runs.reduce((weit, run) => Math.max(weit, run.dx + run.width), 0)
        : prim.x + prim.w;
    if (ende > rand) rand = ende;
  }
  return rand;
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

/**
 * Ein Absatz zerfällt an seinen Abbildungen.
 *
 * Ein Bild läuft im Browser im Text mit; dieses Werkzeug kennt für ein Bild nur
 * die Abbildung, also einen eigenen Block. Zerlegt wird deshalb in der
 * Reihenfolge des Textes — Text, Bild, Text —, und zwar an *einer* Stelle:
 * Absatz und Listenpunkt fragen dieselbe Rechnung. Zwei Zerleger für dieselbe
 * Frage liefen in diesem Repo schon dreimal auseinander.
 */
type Absatzteil = { readonly bild: Tokens.Image } | { readonly inline: Token[] };

function absatzteile(tokens: readonly Token[]): Absatzteil[] {
  const teile: Absatzteil[] = [];
  let stapel: Token[] = [];
  const kippe = () => {
    if (stapel.length > 0) teile.push({ inline: stapel });
    stapel = [];
  };
  for (const token of tokens) {
    if (token.type === 'image') {
      kippe();
      teile.push({ bild: token as Tokens.Image });
      continue;
    }
    stapel.push(token);
  }
  kippe();
  return teile;
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
              text: laufText(link.text ?? link.href),
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
        case 'html': {
          /*
             Rohes HTML wird nicht gesetzt — auf Blockebene steht das
             ausgeschrieben („exporting it as vector text would be a lie"), und
             inline galt es nicht: `<br>` fiel in den `default`-Zweig und stand
             danach als Text auf der Folie, samt spitzer Klammern. Wer in einem
             Markdown-Feld einen Umbruch erzwingen wollte — die verbreitetste
             Schreibweise dafür —, bekam ihn ausgedruckt statt ausgeführt.

             `<br>` ist die eine Ausnahme, und zwar keine erfundene: marked
             liefert dafür nur deshalb kein `br`-Token, weil das Zeichen nicht
             am Zeilenende steht. Alles andere wird stillschweigend
             weggelassen, wie auf Blockebene.
          */
          const roh = (withTokens.text ?? '').trim();
          if (/^<br\s*\/?>$/i.test(roh)) {
            out.push({ text: '', font: spec, color: currentColor, hardBreak: true });
          }
          break;
        }
        case 'image':
          out.push({
            text: laufText((token as Tokens.Image).text || ''),
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
              text: laufText(withTokens.text),
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

/*
   Die Namen des Latin-1-Blocks, in der Reihenfolge ihrer Zeichen.

   Sie werden *gerechnet* und nicht getippt: der n-te Name gehört zu
   U+00A0 + n, und damit ist der Block vollständig, ohne dass jemand
   sechsundneunzig Paare abschreibt. Eine getippte Liste wäre wieder das, was
   hier vorher stand — eine Auswahl, bei der man erst merkt, was fehlt, wenn
   es jemand schreibt.
*/
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr ' +
  'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest ' +
  'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml ' +
  'Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times ' +
  'Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig ' +
  'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml ' +
  'igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide ' +
  'oslash ugrave uacute ucirc uuml yacute thorn yuml';

/**
 * Der Vorrat benannter Zeichen.
 *
 * Vollständig ist er nicht und kann es nicht sein: HTML5 kennt
 * zweitausendzweihunderteinunddreißig Namen, und die mitzuschleppen hieße,
 * hundert Kilobyte für einen Fall auszuliefern, den ein Deck nie hat. Was hier
 * fehlt, wird deshalb **stehen gelassen und nicht erraten** — dieselbe Linie
 * wie beim unbekannten `theme:`: den Wert behalten, die Lücke zeigen. Ein
 * `&spades;` steht danach als `&spades;` auf der Folie, und wer das sieht,
 * schreibt das Zeichen hin.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  hellip: '…',
  mdash: '—',
  ndash: '–',
  ...Object.fromEntries(
    LATIN1.split(' ').map((name, index) => [name, String.fromCharCode(0xa0 + index)]),
  ),
};

/*
   Ein Zeichen, das XML nicht kennt, wird nicht übersetzt.

   `&#0;` und `&#xD800;` sind gültige Schreibweisen und trotzdem keine Zeichen,
   die in eine `.svg` dürfen — `ohneVerboteneZeichen()` schnitte sie dort
   wieder heraus. Sie *hier* zu übersetzen hieße, aus einer sichtbaren Angabe
   eine unsichtbare zu machen; sie bleibt deshalb stehen.
*/
function erlaubtesZeichen(code: number): boolean {
  if (code === 0x9 || code === 0xa || code === 0xd) return true;
  if (code >= 0x20 && code <= 0xd7ff) return true;
  if (code >= 0xe000 && code <= 0xfffd) return true;
  return code >= 0x10000 && code <= 0x10ffff;
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (ganz, name: string) => {
    if (name[0] !== '#') return ENTITIES[name] ?? ganz;
    const hex = name[1] === 'x' || name[1] === 'X';
    const code = Number.parseInt(hex ? name.slice(2) : name.slice(1), hex ? 16 : 10);
    return Number.isFinite(code) && erlaubtesZeichen(code) ? String.fromCodePoint(code) : ganz;
  });
}

/**
 * Der Text eines Laufs, so wie er auf die Folie gehört.
 *
 * Ein weicher Markdown-Umbruch kam bis hierher als rohes `\n` durch und wurde
 * erst in den Ausgaben eingeebnet — im PPTX-Weg von `flattenWhitespace()`, auf
 * der Fläche vom Browser, der ein `\n` in einem `<tspan>` wie ein Leerzeichen
 * misst. Drei Einebnungen für dieselbe Tatsache, und die vierte fehlte: die
 * Ersatzmessung der Tests gibt `\n` eine andere Breite als dem Leerzeichen,
 * und damit bricht jede Prüfung ohne Canvas an einer anderen Stelle um als der
 * Browser. Eingeebnet wird deshalb hier, wo der Lauf entsteht.
 */
function laufText(text: string): string {
  return decodeEntities(text).replace(/[\r\n\t]+/g, ' ');
}

/* -------------------------------------------------------------------------- */
/* Line breaking                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Greedy line breaking across a list of styled runs. Words never split unless a
 * single word is wider than the line, in which case it is broken by character —
 * the same behaviour a browser gives with `overflow-wrap: anywhere`.
 */
/**
 * Wie breit jede Spalte einer Tabelle wird.
 *
 * **Nach dem, was in ihr steht.** Zu gleichen Teilen sah es lange aus wie ein
 * Raster und las sich wie eines: „Was" bekam so viel Platz wie „Folie vor /
 * zurück", die schmale Spalte stand als Loch daneben, und die breite brach um.
 * Gewichtet wird deshalb nach der breitesten *ungebrochenen* Zelle — genau der
 * Platz, den die Spalte gern hätte.
 *
 * Der Innenabstand wird dabei **vorweg** abgezogen und nicht mitgewichtet.
 * Sonst verhungert die schmale Spalte: sie bekäme ihren Anteil an der
 * *Gesamt*breite, und davon gingen noch zwei Innenabstände ab — „Wert" brach
 * zu „Wer / t" um und „1.240" zu „1.24 / 0".
 *
 * Diese Funktion ist **öffentlich, weil sie zwei Kunden hat**: der Setzer
 * zeichnet damit, und der PowerPoint-Export schreibt damit seine `a:gridCol`.
 * Zwei Rechnungen für dieselbe Frage liefen irgendwann auseinander, und man
 * sähe es erst in der fremden Datei.
 */
export function tableColumnWidths(
  rows: readonly (readonly StyledRun[])[][],
  boxWidth: number,
  padX: number,
  min: number,
): number[] {
  const columns = Math.max(1, ...rows.map((row) => row.length));
  const roheBreite = (runs: readonly StyledRun[] | undefined) =>
    (runs ?? []).reduce((sum, run) => sum + measureText(run.text, run.font), 0);

  // Eine leere Spalte darf nicht auf null fallen: ihre Zeilenlinie liefe sonst
  // durch die Nachbarspalte.
  const wunsch = Array.from({ length: columns }, (_, index) =>
    Math.max(min, ...rows.map((row) => roheBreite(row[index]))),
  );
  const summe = wunsch.reduce((a, b) => a + b, 0);

  const luft = padX * 2;
  const bedarf = wunsch.map((w) => w + luft);
  const gesamt = bedarf.reduce((a, b) => a + b, 0);

  return gesamt <= boxWidth
    ? // Es passt: jede Spalte bekommt, was sie braucht, und der Rest geht an
      // die, in denen am meisten steht.
      bedarf.map((b, index) => b + ((boxWidth - gesamt) * wunsch[index]) / summe)
    : // Es passt nicht: umbrochen wird ohnehin, also wird der Platz nach dem
      // Bedarf verteilt — die lange Spalte bricht, die kurze nicht.
      wunsch.map((w) => luft + (Math.max(min * columns, boxWidth - luft * columns) * w) / summe);
}

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
    /*
       Geschnitten wird an Weißraum — **außer am geschützten Leerzeichen**.

       `\s` schließt U+00A0 ein, und `trim()` zählt es ebenfalls als Weißraum:
       `10&nbsp;km` wurde damit an genau der Stelle umgebrochen, an der es
       nicht umgebrochen werden soll. `decodeEntities()` übersetzt `&nbsp;`
       richtig — und der Umbruch machte die Übersetzung sofort wieder zunichte.
    */
    const pieces = run.text.split(/([^\S\u00a0]+)/).filter((piece) => piece !== '');
    for (const piece of pieces) {
      const isSpace = piece !== '' && !/[^\s]|\u00a0/.test(piece);
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

      /*
         Ein Wort, das breiter ist als die Zeile, wird zeichenweise gebrochen —
         und zwar auch dann, wenn schon etwas auf der Zeile steht.

         Der Zeichenbruch stand *innerhalb* des Zweigs „passt noch" und
         zusätzlich hinter `current.length === 0`: er griff also nur, wenn das
         lange Wort allein auf der Zeile stand. Stand ein Wort davor, fiel das
         lange in den `flush(); push()` darunter — und lief über die Kante des
         Elements hinaus, im SVG, im PDF und in der `.pptx`. Der Kopf dieser
         Funktion verspricht `overflow-wrap: anywhere`.
      */
      if (width > maxWidth) {
        if (current.length > 0) flush();
        for (const chunk of breakByCharacter(piece, run.font, maxWidth)) {
          if (x > 0) flush();
          push(run, chunk.text, chunk.width);
        }
        continue;
      }

      if (x + width <= maxWidth || current.length === 0) {
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
