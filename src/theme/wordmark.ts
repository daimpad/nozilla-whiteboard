/**
 * Die Wortmarke als Geometrie.
 *
 * Sie wird nicht als Bild eingebunden, sondern als Pfad. Nur so landet sie in
 * SVG *und* PDF als echter Vektor, ohne dass ein Export eine externe Datei
 * nachladen muss — und nur so nimmt sie die Tinte der Fläche an, auf der sie
 * sitzt.
 *
 * Sie gehört dem Erscheinungsbild, nicht dem Werkzeug. Die Wortmarke eines
 * Kunden auf eine Folie eines anderen zu zeichnen, wäre der auffälligste
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
export function wordmarkFromSvg(
  svg: string,
  colours: { letters: string; accent?: string },
): Wordmark {
  const box = /viewBox="([^"]+)"/.exec(svg)?.[1].trim().split(/\s+/).map(Number);
  if (!box || box.length !== 4 || box.some((value) => !Number.isFinite(value))) {
    throw new Error('Wortmarke: viewBox nicht lesbar');
  }

  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map((match) => ({
    d: match[1].replace(/\s+/g, ' ').trim(),
    fill: /fill="([^"]+)"/.exec(match[0])?.[1] ?? '',
  }));

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
