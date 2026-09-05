/**
 * Slide layout presets.
 *
 * A layout decides where the *flow* (Markdown) content sits inside the slide
 * and how it is typeset. Freeform canvas elements ignore layouts entirely —
 * they are absolutely positioned — which is exactly the hybrid the tool is for.
 */
import { canvas } from '@/theme';
import { typesetMarkdown } from '@/lib/text/typeset';
import type { SlideLayout, TypeStyleName } from '@/theme';
import type { CanvasElement, Deck } from '@/model/types';

export interface FlowFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  /** Multiplies the CI type scale for this layout. */
  scale: number;
  baseStyle: TypeStyleName;
}

/**
 * The frame for a layout, or `null` when the layout has no flow content at all
 * (`blank` and `canvas` hand the whole slide to the freeform elements).
 */
export function flowFrame(layout: SlideLayout): FlowFrame | null {
  /*
     Gelesen wird **bei jedem Aufruf**. Hier stand die Zeile
     `const { width, height, margin } = canvas` auf Modulebene, und das war
     genau die Falle, die der Kopf von `folienformat.ts` beschreibt: sie friert
     die Folienhöhe ein, die beim Laden des Moduls zufällig galt. Ein Deck im
     A4-Format bekäme den Satzspiegel von 16:9 — auf jeder Folie, in jeder
     Ausgabe, ohne ein Wort.
  */
  const { width, height, margin } = canvas;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  switch (layout) {
    case 'title':
      // Titel stehen links, nicht mittig: die CI setzt Kampagnensätze am
      // Satzspiegel an, nicht in die Mitte.
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.86),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'statement':
      // Eine Aussage, groß. Für den einen Satz, der die Folie trägt.
      return {
        x: margin.left,
        y: margin.top,
        w: innerW,
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'section':
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.78),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'split':
      return {
        x: margin.left,
        y: margin.top,
        w: Math.round(innerW * 0.48),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 0.94,
        baseStyle: 'body',
      };

    case 'quote':
      return {
        x: Math.round(width * 0.14),
        y: margin.top,
        w: Math.round(width * 0.72),
        h: innerH,
        align: 'left',
        valign: 'middle',
        scale: 1,
        baseStyle: 'lead',
      };

    case 'blank':
    case 'canvas':
      return null;

    case 'default':
    default:
      return {
        x: margin.left,
        y: margin.top,
        w: innerW,
        h: innerH,
        align: 'left',
        valign: 'top',
        scale: 1,
        baseStyle: 'body',
      };
  }
}

/**
 * Where the deck footer and slide number sit.
 *
 * Eine Funktion und kein Objekt: als Konstante trüge sie die Höhe des Formats,
 * das beim Laden galt, und die Fußzeile eines A4-Decks stünde auf halber
 * Seite. Dieselbe Falle wie beim Satzspiegel eine Funktion weiter oben.
 */
export function footerFrame(): { y: number; left: number; right: number } {
  const { width, height, margin } = canvas;
  return {
    y: height - margin.bottom + 34,
    left: margin.left,
    right: width - margin.right,
  };
}

/**
 * Die Spalten, in denen Eingesetztes landet — und ihre Breite.
 *
 * Sie sind **fest** und nicht aus der Breite des Bausteins gerechnet. Das ist
 * der ganze Punkt: solange jeder Baustein seine eigene Breite mitbrachte,
 * bekam jeder auch seine eigene Kante — eine Überschrift begann bei 192, ein
 * Zwischentitel bei 552, ein Label bei 892. Untereinander ergab das keine
 * Linie, sondern eine Treppe, und man sah der Folie an, dass niemand sie
 * gelegt hatte.
 *
 * 48 % des Satzspiegels — dasselbe Verhältnis, das das `split`-Layout seiner
 * linken Spalte gibt. Zwei davon passen nebeneinander, die erste am linken
 * Satzspiegel, die zweite am rechten.
 *
 * Gefüllt wird **von links**. Das war zwischendurch andersherum, aus einem
 * guten Grund: eingesetztes Material landete sonst mitten im Fließtext. Der
 * Grund ist geblieben, die Lösung nicht — der Fließtext zählt jetzt selbst als
 * besetzte Fläche (`flowBounds()`), und dann kann die erste Spalte dort
 * stehen, wo man zu lesen anfängt.
 */
/**
 * Wie breit ein eingesetztes Element ist — auf dem Raster.
 *
 * Die 0,48 sind knapp die halbe Satzspiegelbreite; das Runden auf `gridSize`
 * kam dazu, weil sonst zwei Wahrheiten über dasselbe Raster nebeneinander
 * standen. Der Deck-Prompt verlangt vom Modell „alle Werte auf ein Vielfaches
 * von `gridSize` runden", `computeSnap()` und `resizeRect()` rasten jedes
 * gezogene Element darauf ein — und das Einsetzen legte es mit 530 Einheiten
 * bei x = 662 daneben. Sichtbar wurde es beim ersten Anfassen: das Element
 * sprang auf das Raster und verlor dabei die rechte Kante des Satzspiegels.
 *
 * Zwei Einheiten schmaler, und die Rechnung geht auf: 528 bei x = 664 endet
 * genau auf `width - margin.right`, und beide Zahlen liegen im Raster.
 */
export function insertColumnWidth(): number {
  const { width, margin, gridSize } = canvas;
  return Math.round(((width - margin.left - margin.right) * 0.48) / gridSize) * gridSize;
}

export function insertColumns(): number[] {
  const { width, margin, gridSize } = canvas;
  const innerW = width - margin.left - margin.right;
  const spalte = insertColumnWidth();
  const right = width - margin.right;
  const anzahl = Math.max(1, Math.floor(innerW / spalte));
  if (anzahl === 1) return [margin.left];
  const luecke = (right - margin.left - anzahl * spalte) / (anzahl - 1);
  /*
     Auch der Ort liegt im Raster, und zwar von Bauart wegen: die Lücke ist
     eine Division und trifft es nicht von selbst. Bei zwei Spalten geht die
     Rechnung heute auf — eine Zahl, die zufällig stimmt, ist genau das, was
     dieses Repo schon dreimal für eine Zusicherung gehalten hat.
  */
  return Array.from(
    { length: anzahl },
    (_, i) => Math.round((margin.left + i * (spalte + luecke)) / gridSize) * gridSize,
  );
}

/**
 * Wo der Fließtext senkrecht ansetzt.
 *
 * Steht hier und nicht in `scene.ts`, weil zwei Stellen dieselbe Zahl
 * brauchen: die Szene, um den Text zu zeichnen, und das Einsetzen, um ihn
 * nicht zu überdecken. Zwei Rechnungen wären zwei Wahrheiten.
 */
export function flowOffsetY(frame: FlowFrame, contentHeight: number): number {
  if (frame.valign === 'middle') return frame.y + Math.max(0, (frame.h - contentHeight) / 2);
  if (frame.valign === 'bottom') return frame.y + Math.max(0, frame.h - contentHeight);
  return frame.y;
}

/**
 * Der Kasten, den der Fließtext einer Folie wirklich einnimmt.
 *
 * Nicht der Satzspiegel des Layouts — der reicht bei den meisten Layouts über
 * die ganze Folie —, sondern die gesetzte Höhe des Markdowns darin. Wer
 * darunter einsetzt, überdeckt nichts; wer den ganzen Rahmen meidet, fände
 * unter einer zweizeiligen Überschrift keinen Platz mehr.
 *
 * Gibt `null` zurück, wenn die Folie keinen Fließtext trägt — bei `canvas` und
 * `blank` gehört die Fläche ohnehin dem frei Gelegten.
 *
 * `resolveImageSize` durchzureichen ist keine Zutat, sondern die Bedingung
 * dafür, dass hier dieselbe Höhe herauskommt wie in der Szene: ohne die Maße
 * fällt der Setzer auf „volle Spaltenbreite, Verhältnis 0,5625" zurück.
 * Gemessen an einem Deck mit einem 300 × 300-Logo im Fließtext sind das 762
 * Einheiten statt 441 — der Kasten, den das Einsetzen meiden soll, wäre um
 * ein Drittel zu hoch. Als Argument und nicht als Import, weil `lib/layout/`
 * sonst über `images.ts → svg.ts → scene.ts` wieder bei sich selbst
 * herauskäme.
 */
export function flowBounds(
  layout: SlideLayout,
  markdown: string,
  resolveImageSize?: (src: string) => { w: number; h: number } | undefined,
): { x: number; y: number; w: number; h: number } | null {
  const frame = flowFrame(layout);
  if (!frame || !markdown.trim()) return null;
  const gesetzt = typesetMarkdown(markdown, {
    width: frame.w,
    scale: frame.scale,
    align: frame.align,
    baseStyle: frame.baseStyle,
    resolveImageSize,
  });
  return { x: frame.x, y: flowOffsetY(frame, gesetzt.height), w: frame.w, h: gesetzt.height };
}

/**
 * Wo ein neu eingefügtes Element landet.
 *
 * Es landete lange in der Mitte der Folie — und damit bei fast jedem Layout
 * mitten im Fließtext, denn der steht links und reicht bis in die Mitte. Wer
 * eine Karte einsetzte, musste sie als Erstes wegziehen.
 *
 * Jetzt wird **in der rechten Spalte** eingesetzt und untereinander gestapelt.
 * Gestapelt wird unter allem, was die Spalte schon berührt — geprüft wird die
 * Überlappung und nicht eine Kante, sonst schöbe ein breites Element, das quer
 * bis in die Spalte reicht, den Stapel nicht.
 *
 * Ist die Spalte voll, geht es eine Spalte weiter nach links. Ist auch links
 * kein Platz, sitzt das Element auf dem unteren Satzspiegel auf: es überdeckt
 * dann etwas, aber es ist zu sehen und steht dort, wo man es sucht. Oben
 * wieder anzufangen hieße, es unter der Überschrift zu verstecken.
 */
export function insertFrame(
  existing: readonly { x: number; y: number; w: number; h: number }[],
  size: { w: number; h: number },
  weich: readonly { x: number; y: number; w: number; h: number }[] = [],
): { x: number; y: number } {
  const { height, margin } = canvas;
  const bottom = height - margin.bottom;
  const gap = canvas.gridSize * 3;
  const spalten = insertColumns();
  const spaltenbreite = insertColumnWidth();

  const untenIn =
    (hindernisse: readonly { x: number; y: number; w: number; h: number }[]) =>
    (spaltenX: number) =>
      hindernisse
        .filter((rect) => rect.x < spaltenX + spaltenbreite && rect.x + rect.w > spaltenX)
        .reduce<number>((tiefstes, rect) => Math.max(tiefstes, rect.y + rect.h + gap), margin.top);

  const versuch = (hindernisse: readonly { x: number; y: number; w: number; h: number }[]) => {
    const unten = untenIn(hindernisse);
    for (const x of spalten) {
      const y = unten(x);
      if (y + size.h <= bottom) return { x, y };
    }
    return null;
  };

  // `weich` ist der Fließtext: gemieden, solange irgendwo Platz ist. Ihn hart
  // zu behandeln wäre schlimmer als ihn zu überdecken — auf einer Titelfolie
  // mit großem, mittig stehendem Satz bliebe sonst nirgends Raum, und alles
  // Eingesetzte landete auf demselben Notplatz am unteren Satzspiegel,
  // übereinander und nicht mehr auseinanderzuhalten.
  return (
    versuch([...existing, ...weich]) ??
    versuch(existing) ?? { x: spalten[0], y: Math.max(margin.top, bottom - size.h) }
  );
}

/**
 * Welche Elemente bei dieser Folienhöhe unter der Kante lägen.
 *
 * Gebraucht wird das an genau einer Stelle: bevor jemand das Folienformat
 * verkleinert. Beide A4-Formate sind höher als 16:9, ein bestehendes Deck kann
 * beim Umstellen also nichts verlieren — der **Rückweg** kann es sehr wohl,
 * und dann liegen Elemente außerhalb der Folie, ohne dass eine Ausgabe sie
 * zeigt und ohne dass man sie auf der Fläche noch anklicken kann.
 *
 * Umgerechnet wird deshalb nichts. Die Koordinaten hat jemand gelegt, und sie
 * automatisch zu stauchen wäre ein zweiter Weg, eine Folie zu setzen. Gesagt
 * gehört es trotzdem — dieselbe Linie wie bei einer Fläche in der Farbe ihres
 * Untergrunds.
 *
 * Die Schwelle ist `minElementSize`: bleibt weniger als die kleinste zulässige
 * Elementgröße über der Kante, ist das Element praktisch weg. Denselben Wert
 * benutzt `clampToSlide()`, wenn es ein gezogenes Element auf der Folie hält.
 */
export function unterDerKante(
  deck: Deck,
  hoehe: number,
): Array<{ folie: number; element: CanvasElement }> {
  const rand = hoehe - canvas.minElementSize;
  return deck.slides.flatMap((slide, folie) =>
    slide.elements.filter((element) => element.y > rand).map((element) => ({ folie, element })),
  );
}

export const layoutDescriptions: Record<SlideLayout, string> = {
  title: 'Titelfolie — Kampagnensatz am Satzspiegel',
  default: 'Standardfolie — Fließtext im Satzspiegel',
  section: 'Kapiteltrenner',
  statement: 'Eine Aussage, groß',
  split: 'Text links, Fläche rechts',
  quote: 'Zitat',
  blank: 'Ohne Fließtext',
  canvas: 'Nur freie Fläche',
};
