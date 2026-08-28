/**
 * Die Wortmarke als Geometrie.
 *
 * Sie wird nicht als Bild eingebunden, sondern als Pfad. Nur so landet sie in
 * SVG *und* PDF als echter Vektor, ohne dass ein Export eine externe Datei
 * nachladen muss — und nur so nimmt sie die Tinte der Fläche an, auf der sie
 * sitzt.
 *
 * Sie gehört dem Erscheinungsbild, nicht dem Werkzeug. Die Wortmarke einer
 * Marke auf eine Folie einer anderen zu zeichnen, wäre der auffälligste
 * Fehler, den dieses Werkzeug machen könnte.
 */
export interface Wordmark {
  /** Der Ausschnitt der Quelldatei: x, y, Breite, Höhe. */
  viewBox: readonly [number, number, number, number];
  /** Die Buchstaben. Nehmen die Tinte der Fläche an. */
  letters: string;
  /**
   * Der Akzent am Wortende, in der Signalfarbe — bei nozilla der Punkt.
   * Leer, wenn eine Marke keinen hat; dann wird auch keiner gezeichnet.
   */
  period: string;
}

/**
 * Eine Wortmarke aus einer SVG-Datei lesen.
 *
 * Damit braucht ein Erscheinungsbild keinen Bauschritt: die Datei neben die
 * Theme-Datei legen, mit `?raw` importieren, hier durchgeben.
 *
 * ```ts
 * import logo from './musterkunde-logo.svg?raw';
 * const wordmark = wordmarkFromSvg(logo, { letters: '#111111', accent: '#E4003A' });
 * ```
 *
 * Die Zuordnung geht über die Füllfarbe und nicht über die Reihenfolge: eine
 * Zeichensoftware sortiert Pfade um, wie sie will, und ein vertauschter
 * Akzent fiele erst auf der Folie auf. Mehrere Pfade derselben Farbe werden zu
 * einem zusammengefasst — Teilkonturen gehören in *einen* Pfad, sonst füllt
 * jede für sich und aus einem Loch wird eine Scheibe.
 */
/**
 * Der Ausschnitt einer SVG-Datei — oder `null`.
 *
 * Beide Anführungszeichen, und das ist kein Luxus: `<svg viewBox='0 0 200 48'>`
 * ist gültiges XML, und eine Zeichensoftware schreibt es so. Die vorige Fassung
 * las nur doppelte und wies eine gültige Datei als „nicht lesbar" ab.
 *
 * Öffentlich, weil der CI-Generator dieselbe Frage stellt, bevor er die Datei
 * annimmt. Zwei Leser derselben Datei, die sich uneinig sind, ergäben eine
 * grüne Prüfliste und einen Wurf.
 */
export function readViewBox(svg: string): readonly [number, number, number, number] | null {
  const raw = /viewBox=["']([^"']+)["']/.exec(svg)?.[1];
  if (!raw) return null;
  const box = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box.length !== 4 || box.some((value) => !Number.isFinite(value))) return null;
  return [box[0], box[1], box[2], box[3]] as const;
}

/** Die Pfade einer SVG-Datei mit ihrer Füllfarbe, in ihrer Reihenfolge. */
export function readPaths(svg: string): Array<{ d: string; fill: string }> {
  return [...svg.matchAll(/<path[^>]*\sd=["']([^"']+)["'][^>]*>/g)].map((match) => ({
    d: match[1].replace(/\s+/g, ' ').trim(),
    fill: /fill=["']([^"']+)["']/.exec(match[0])?.[1] ?? '',
  }));
}

export function wordmarkFromSvg(
  svg: string,
  colours: { letters: string; accent?: string },
): Wordmark {
  const box = readViewBox(svg);
  if (!box) throw new Error('Wortmarke: viewBox nicht lesbar');
  if (box[2] <= 0 || box[3] <= 0) {
    // Vier endliche Zahlen genügten einmal — `viewBox="0 0 0 0"` kam damit
    // durch, und im Markup stand danach `MNaN NaN`: die Marke fehlte in jeder
    // Ausgabe, ohne dass etwas anschlug.
    throw new Error(`Wortmarke: viewBox ohne Fläche (${box[2]} × ${box[3]})`);
  }

  const paths = readPaths(svg);

  const sameColour = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
  const join = (colour: string) =>
    paths
      .filter((path) => sameColour(path.fill, colour))
      .map((path) => path.d)
      .join(' ');

  const letters = join(colours.letters);
  if (!letters) throw new Error(`Wortmarke: kein Pfad in ${colours.letters}`);

  return {
    viewBox: [box[0], box[1], box[2], box[3]] as const,
    letters,
    period: colours.accent ? join(colours.accent) : '',
  };
}
