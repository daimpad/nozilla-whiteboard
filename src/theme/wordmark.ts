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

/**
 * Die Füllfarbe eines Tags — aus `style="fill:…"` oder aus dem Attribut.
 *
 * In dieser Reihenfolge, weil CSS es so entscheidet: eine Deklaration im
 * `style` schlägt das Präsentationsattribut daneben. Ein Zeichenprogramm
 * schreibt mal das eine, mal das andere, und Inkscape schreibt beides.
 */
function fillOf(tag: string): string {
  const style = /style=["']([^"']*)["']/.exec(tag)?.[1];
  const fromStyle = style ? /(?:^|;)\s*fill\s*:\s*([^;]+)/.exec(style)?.[1]?.trim() : undefined;
  if (fromStyle) return fromStyle;
  return /fill=["']([^"']+)["']/.exec(tag)?.[1] ?? '';
}

/**
 * Die Pfade einer SVG-Datei mit ihrer Füllfarbe, in ihrer Reihenfolge.
 *
 * Die Füllfarbe wird **geerbt**, und das ist keine Gründlichkeit ohne Anlass.
 * Die vorige Fassung las nur `fill=` am `<path>` selbst — und Illustrator,
 * Figma und Inkscape schreiben für eine gruppierte Auswahl die Farbe ans
 * umschließende `<g>`. Aus einer solchen Datei kamen alle Buchstabenpfade mit
 * leerer Füllung zurück, und weil die Zuordnung über die Farbe geht, fielen
 * sie aus jeder Ausgabe: auf der Folie, im SVG, im PDF und in der PPTX stand
 * dann nur noch der Akzentpunkt.
 *
 * Was danach *immer noch* keine Farbe trägt — Pfade, die ihre Füllung aus
 * einer CSS-Klasse im `<style>`-Block holen —, kommt mit leerer Füllung
 * zurück und wird nicht erraten. Dafür ist `pruefeWortmarke` da: eine Farbe zu
 * erfinden hieße zu behaupten, sie sei gemeint.
 */
export function readPaths(svg: string): Array<{ d: string; fill: string }> {
  const paths: Array<{ d: string; fill: string }> = [];
  /* Die Füllfarben der offenen Vorfahren, von außen nach innen. */
  const inherited: string[] = [];

  for (const match of svg.matchAll(/<(\/?)(svg|g|path)\b([^>]*)>/g)) {
    const [tag, closing, name, rest] = match;

    if (closing) {
      if (name !== 'path') inherited.pop();
      continue;
    }

    if (name === 'path') {
      const d = /\sd=["']([^"']+)["']/.exec(tag)?.[1];
      if (!d) continue;
      const own = fillOf(tag);
      const nearest = [...inherited].reverse().find(Boolean) ?? '';
      paths.push({ d: d.replace(/\s+/g, ' ').trim(), fill: own || nearest });
      continue;
    }

    // Ein selbstschließendes `<g/>` macht keinen Rahmen auf.
    if (!rest.trimEnd().endsWith('/')) inherited.push(fillOf(tag));
  }

  return paths;
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
