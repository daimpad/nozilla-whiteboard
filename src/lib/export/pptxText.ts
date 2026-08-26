/**
 * Text für PowerPoint — bearbeitbar, nicht abgemalt.
 *
 * Hier trennt sich der PPTX-Export von den anderen. SVG und PDF bekommen vom
 * Setzer fertig umbrochene, absolut gesetzte Zeilen; das ist richtig, weil eine
 * Datei, die eins zu eins aussehen soll, nichts mehr selbst entscheiden darf.
 *
 * Eine `.pptx` soll das Gegenteil: dort landet der Text als Absätze in einem
 * Textrahmen, und **PowerPoint bricht selbst um**. Wer die Folie öffnet, kann
 * hineinschreiben, und der Satz läuft weiter, statt an einer alten Zeilenkante
 * zu zerbrechen.
 *
 * Der Preis ist ehrlich zu benennen: der Umbruch kann eine Silbe anders fallen
 * als auf der Fläche, weil PowerPoint mit eigenen Metriken misst. Das ist keine
 * Ungenauigkeit, sondern die Bedingung von Bearbeitbarkeit. Wer das Bild exakt
 * braucht, nimmt PDF.
 *
 * Deshalb wird hier nicht das Szenenmodell gelesen, sondern das Deck-Modell:
 * vor dem Umbruch, mit Überschriftenebene, Listenstruktur und Auszeichnung
 * noch intakt.
 */
import type { Token, Tokens } from 'marked';
import { color as ci, typeScale, type TypeStyleName } from '@/theme';
import { lexMarkdown, lexInline } from '@/lib/markdown/render';
import { flattenInline, type StyledRun } from '@/lib/text/typeset';
import { font, type FontSpec } from '@/lib/text/measure';
import type { BackgroundStyle } from './scene';

/* -------------------------------------------------------------------------- */
/* Absatzmodell                                                                */
/* -------------------------------------------------------------------------- */

export type BulletKind = 'none' | 'square' | 'number' | 'check' | 'unchecked';

export interface Paragraph {
  runs: StyledRun[];
  /** Einrückungsebene, 0 = bündig. */
  level: number;
  bullet: BulletKind;
  align: 'l' | 'ctr' | 'r';
  /** Abstand *vor* dem Absatz, in Folien-Einheiten. */
  spaceBefore: number;
  /** Zeilenabstand als Vielfaches der Schriftgröße. */
  lineHeight: number;
  /** Ein Zitat trägt links einen Balken — in PPTX als Einzug plus Kursive. */
  quote?: boolean;
}

export interface TableModel {
  header: StyledRun[][];
  rows: StyledRun[][][];
  /**
   * Je Spalte die Ausrichtung aus der Trennzeile (`---:` heißt rechtsbündig).
   *
   * Sie steht hier, weil die Fläche sie zeichnet: eine Zahlenspalte, die dort
   * rechts steht und in der `.pptx` links, ist ein Unterschied, den man erst
   * in PowerPoint sieht.
   */
  align: ('l' | 'ctr' | 'r')[];
}

/** Was ein Markdown-Block wird: entweder Absätze oder eine echte Tabelle. */
export type Block = { t: 'paras'; paras: Paragraph[] } | { t: 'table'; table: TableModel };

export interface TextPalette {
  text: string;
  muted: string;
  accent: string;
}

export function paletteOf(bg: BackgroundStyle): TextPalette {
  return { text: bg.ink, muted: bg.muted, accent: bg.signal };
}

function defaultPalette(): TextPalette {
  return { text: ci.ink, muted: ci.inkMuted, accent: ci.ink };
}

/* -------------------------------------------------------------------------- */
/* Markdown → Blöcke                                                           */
/* -------------------------------------------------------------------------- */

const HEADING_STYLE: Record<number, TypeStyleName> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'bodyStrong',
  6: 'bodyStrong',
};

export interface BlockOptions {
  palette?: TextPalette;
  /** Grundstil des Fließtextes; Überschriften bleiben ihre eigene Stufe. */
  baseStyle?: TypeStyleName;
  /** Alles gleichmäßig verkleinern — für Elemente, die kleiner sind als eine Folie. */
  scale?: number;
  align?: 'l' | 'ctr' | 'r';
}

export function markdownToBlocks(source: string, options: BlockOptions = {}): Block[] {
  const palette = options.palette ?? defaultPalette();
  const scale = options.scale ?? 1;
  const align = options.align ?? 'l';
  const baseStyle = options.baseStyle ?? 'body';

  const spec = (name: TypeStyleName): FontSpec => {
    const style = typeScale[name];
    return font({
      size: style.size * scale,
      family: style.family as FontSpec['family'],
      weight: style.weight,
      tracking: style.tracking,
    });
  };

  const out: Block[] = [];
  let paras: Paragraph[] = [];
  const flush = () => {
    if (paras.length > 0) out.push({ t: 'paras', paras });
    paras = [];
  };

  const push = (
    tokens: readonly Token[],
    style: TypeStyleName,
    extra: Partial<Paragraph> = {},
    color = palette.text,
  ) => {
    const base = spec(style);
    const runs = capsIfNeeded(flattenInline(tokens, base, color), typeScale[style].caps);
    paras.push({
      runs: runs.length > 0 ? runs : [{ text: '', font: base, color }],
      level: 0,
      bullet: 'none',
      align,
      spaceBefore: typeScale[style].size * scale * 0.45,
      lineHeight: typeScale[style].lineHeight,
      ...extra,
    });
  };

  const walkList = (list: Tokens.List, level: number) => {
    list.items.forEach((item, index) => {
      const task = item.task === true;
      const bullet: BulletKind = task
        ? item.checked
          ? 'check'
          : 'unchecked'
        : list.ordered
          ? 'number'
          : 'square';

      // Der erste Absatz eines Punktes trägt das Aufzählungszeichen, alles
      // Weitere darunter hängt eingerückt daran.
      let first = true;
      for (const child of item.tokens ?? []) {
        if (child.type === 'list') {
          walkList(child as Tokens.List, level + 1);
          continue;
        }
        const inline = (child as Token & { tokens?: Token[] }).tokens;
        if (!inline && child.type !== 'text') continue;
        push(inline ?? lexInline((child as Tokens.Text).text ?? ''), baseStyle, {
          level,
          bullet: first ? bullet : 'none',
          spaceBefore: first && index === 0 ? typeScale[baseStyle].size * scale * 0.4 : 0,
        });
        first = false;
      }
    });
  };

  for (const token of lexMarkdown(source)) {
    switch (token.type) {
      case 'heading': {
        const heading = token as Tokens.Heading;
        push(heading.tokens ?? [], HEADING_STYLE[heading.depth] ?? 'h4', {
          spaceBefore: typeScale[HEADING_STYLE[heading.depth] ?? 'h4'].size * scale * 0.5,
        });
        break;
      }

      case 'paragraph':
        push((token as Tokens.Paragraph).tokens ?? [], baseStyle);
        break;

      case 'text':
        push(lexInline((token as Tokens.Text).text ?? ''), baseStyle);
        break;

      case 'list':
        walkList(token as Tokens.List, 0);
        break;

      case 'blockquote': {
        // Der Balken der CI lässt sich in einem Textrahmen nicht zeichnen, ohne
        // den Umbruch festzunageln. Ein Zitat wird deshalb eingerückt gesetzt —
        // dieselbe Aussage, mit den Mitteln des Formats.
        const quote = token as Tokens.Blockquote;
        for (const child of quote.tokens ?? []) {
          const inline = (child as Token & { tokens?: Token[] }).tokens;
          push(inline ?? [], baseStyle, { level: 1, quote: true }, palette.muted);
        }
        break;
      }

      case 'code': {
        const code = token as Tokens.Code;
        const base = spec('code');
        for (const line of (code.text ?? '').split('\n')) {
          paras.push({
            runs: [{ text: line, font: base, color: palette.text }],
            level: 1,
            bullet: 'none',
            align: 'l',
            spaceBefore: 0,
            lineHeight: typeScale.code.lineHeight,
          });
        }
        break;
      }

      case 'table': {
        const table = token as Tokens.Table;
        flush();
        out.push({
          t: 'table',
          table: {
            header: table.header.map((cell) =>
              flattenInline(cell.tokens ?? [], spec('bodyStrong'), palette.text),
            ),
            align: table.header.map((_, index) => {
              const richtung = table.align?.[index];
              return richtung === 'right' ? 'r' : richtung === 'center' ? 'ctr' : 'l';
            }),
            rows: table.rows.map((row) =>
              row.map((cell) => flattenInline(cell.tokens ?? [], spec('body'), palette.text)),
            ),
          },
        });
        break;
      }

      case 'hr':
        // Eine Linie ist Geometrie, kein Text. Sie wird als eigene Form
        // gezeichnet; hier bleibt nur der Abstand.
        paras.push({
          runs: [{ text: '', font: spec(baseStyle), color: palette.text }],
          level: 0,
          bullet: 'none',
          align,
          spaceBefore: typeScale[baseStyle].size * scale,
          lineHeight: 1,
        });
        break;

      case 'space':
        break;

      default: {
        const inline = (token as Token & { tokens?: Token[] }).tokens;
        if (inline?.length) push(inline, baseStyle);
        break;
      }
    }
  }

  flush();
  return out;
}

/** Nur die Absätze — für Rahmen, in denen ohnehin keine Tabelle vorkommen kann. */
export function markdownToParagraphs(source: string, options: BlockOptions = {}): Paragraph[] {
  return markdownToBlocks(source, options).flatMap((block) =>
    block.t === 'paras' ? block.paras : tableAsParagraphs(block.table),
  );
}

/** Notlösung: eine Tabelle, wo keine stehen kann, wird zu Zeilen. */
function tableAsParagraphs(table: TableModel): Paragraph[] {
  const rows = [table.header, ...table.rows];
  return rows.map((row) => ({
    runs: row.flatMap((cell, index) =>
      index === 0
        ? cell
        : [
            { text: '  ·  ', font: cell[0]?.font ?? font({ size: 17 }), color: ci.inkMuted },
            ...cell,
          ],
    ),
    level: 0,
    bullet: 'none' as const,
    align: 'l' as const,
    spaceBefore: 0,
    lineHeight: 1.4,
  }));
}

/**
 * Ein einzelner Textzug als ein Absatz — für `text`- und `badge`-Elemente, die
 * keinen Markdown-Block tragen, aber Auszeichnung enthalten dürfen.
 */
export function inlineToParagraph(
  text: string,
  style: TypeStyleName,
  options: { palette?: TextPalette; align?: 'l' | 'ctr' | 'r'; color?: string } = {},
): Paragraph {
  const scaleStyle = typeScale[style];
  const base = font({
    size: scaleStyle.size,
    family: scaleStyle.family as FontSpec['family'],
    weight: scaleStyle.weight,
    tracking: scaleStyle.tracking,
  });
  const color = options.color ?? options.palette?.text ?? defaultPalette().text;
  return {
    runs: capsIfNeeded(flattenInline(lexInline(text), base, color), scaleStyle.caps),
    level: 0,
    bullet: 'none',
    align: options.align ?? 'l',
    spaceBefore: 0,
    lineHeight: scaleStyle.lineHeight,
  };
}

/**
 * Labels der CI stehen in Versalien.
 *
 * Auf der Fläche macht das der Setzer beim Zeichnen. In PPTX gibt es dafür kein
 * Attribut, das PowerPoint zuverlässig anwendet — also wird der Text selbst
 * umgestellt. Der Unterschied fällt beim Bearbeiten auf: wer weiterschreibt,
 * muss die Umschalttaste selbst bemühen. Das ist die kleinere Zumutung, als
 * ein Label kleinzuschreiben, das die Marke groß verlangt.
 */
function capsIfNeeded(runs: StyledRun[], caps: boolean): StyledRun[] {
  if (!caps) return runs;
  return runs.map((run) => ({ ...run, text: run.text.toLocaleUpperCase('de-DE') }));
}
