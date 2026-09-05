/**
 * Text → Pfade.
 *
 * Wandelt die `text`-Primitiven einer Szene in `path`-Primitiven um, die dann
 * durch dieselbe Strecke laufen wie jede andere Geometrie. Danach enthält der
 * Export keine Schriftreferenz mehr — er sieht in jedem Betrachter gleich aus,
 * auch dort, wo eingebettete Schriften ignoriert werden (Illustrator, Inkscape,
 * manche Druckvorstufen).
 *
 * Die Arbeitsteilung ist der Kern:
 *
 *   **Wo** ein Zeichen steht, bestimmt der Browser. Für jedes Präfix eines
 *   Laufs wird `measureText` gefragt; die Differenz ist der Vorschub. Damit
 *   trägt der Export die echte Unterschneidung des Bildschirms — Kerning,
 *   Ligaturen-Breiten, alles, was die reine `hmtx`-Tabelle nicht hergibt.
 *
 *   **Wie** ein Zeichen aussieht, liefert `lib/text/truetype.ts`.
 *
 * Eine Schrift-Bibliothek würde beides selbst machen und dabei anders
 * positionieren als der Bildschirm. Genau das darf hier nicht passieren: der
 * Editor zeichnet die Fläche mit demselben Markup, das der SVG-Export erzeugt,
 * und diese Zusage soll auch für Umrisse gelten.
 */
import {
  matMultiply,
  matRotateAbout,
  matScale,
  matTranslate,
  transformSegs,
  type Seg,
} from '@/lib/geometry/path';
import { measureText } from '@/lib/text/measure';
import { glyphCoverFor, type GlyphCover } from './glyphCover';
import { laufStriche, type Scene, type ScenePrim, type SceneRun } from './scene';

/**
 * Alle Textprimitiven einer Szene durch Pfade ersetzen.
 *
 * Ein Lauf, dessen Schnitt sich nicht laden lässt, bleibt Text. Lieber eine
 * Folie mit einer ersetzten Schrift als eine Folie mit einem Loch.
 */
export async function outlineScene(scene: Scene): Promise<Scene> {
  return (await outlineScenes([scene]))[0];
}

export async function outlineScenes(scenes: readonly Scene[]): Promise<Scene[]> {
  const hatText = scenes.some((scene) => scene.prims.some((prim) => prim.t === 'text'));
  if (!hatText) return [...scenes];

  // Die Deckung wird für *alle* Szenen zusammen aufgebaut: ein Ersatzschnitt,
  // den Folie 6 braucht, ist dann auch für Folie 2 schon gelesen.
  const cover = await glyphCoverFor(scenes);
  if (cover.faces.length === 0) return [...scenes];

  return scenes.map((scene) => {
    const prims: ScenePrim[] = [];
    for (const prim of scene.prims) {
      if (prim.t !== 'text') {
        prims.push(prim);
        continue;
      }
      prims.push(...outlineTextPrim(prim, cover));
    }
    return { ...scene, prims };
  });
}

/* -------------------------------------------------------------------------- */

type TextPrim = Extract<ScenePrim, { t: 'text' }>;

function outlineTextPrim(prim: TextPrim, cover: GlyphCover): ScenePrim[] {
  const out: ScenePrim[] = [];
  const leftovers: SceneRun[] = [];

  // Drehung und Grundlinie einmal aufbauen; jeder Lauf hängt sich daran.
  const place =
    prim.rotate && prim.rotate !== 0
      ? matMultiply(matRotateAbout(prim.rotate, prim.x, prim.y), matTranslate(prim.x, prim.y))
      : matTranslate(prim.x, prim.y);

  for (const run of prim.runs) {
    // Der Schnitt des ersten zeichnenden Zeichens entscheidet, ob dieser Lauf
    // überhaupt in Umrisse kann; kommt seine Datei nicht an, bleibt er Text.
    if (!hatSchrift(run, cover)) {
      leftovers.push(run);
      continue;
    }

    // Der Lauf sitzt an seinem eigenen Versatz auf der Grundlinie.
    const at = matMultiply(place, matTranslate(run.dx, 0));

    // Ein Lauf aus reinem Zwischenraum trägt keine Kontur — das ist richtig
    // so, seine Breite steckt bereits im `dx` des nächsten Laufs.
    const segs = runToSegs(run, cover);
    if (segs.length > 0) {
      out.push({
        t: 'path',
        segs: transformSegs(segs, at),
        // Konturen werden gefüllt, nie gestrichen: ein Strich würde die Schrift
        // fetter machen als gesetzt. Die Löcher in „o" und „e" trägt die
        // Nonzero-Regel, die SVG und PDF beide von Haus aus anwenden.
        closed: true,
        fill: run.color,
        opacity: prim.opacity,
      });
    }

    // Unter- und Durchstreichung sind keine Glyphen; sie bleiben Geometrie.
    for (const rule of decorations(run)) {
      out.push({
        t: 'path',
        segs: transformSegs(rule, at),
        closed: true,
        fill: run.color,
        opacity: prim.opacity,
      });
    }
  }

  if (leftovers.length > 0) out.push({ ...prim, runs: leftovers });
  return out;
}

/** Ob für diesen Lauf überhaupt eine Schrift gelesen werden konnte. */
function hatSchrift(run: SceneRun, cover: GlyphCover): boolean {
  const face = cover.faceFor(run.font, 'A'.codePointAt(0)!);
  return Boolean(face && cover.outlines(face));
}

/**
 * Einen Lauf in Konturen übersetzen, in Folien-Einheiten, Y nach unten.
 *
 * Die Schrift liefert Y nach oben und in Font-Einheiten; beides dreht und
 * skaliert `matScale(s, -s)` in einem Schritt.
 *
 * Der Schnitt wird **je Zeichen** erfragt, nicht je Lauf. Das kostet ein
 * Nachschlagen und rettet jedes Zeichen, das die gesetzte Schrift nicht führt:
 * vorher fiel es hier stillschweigend heraus, und im PNG stand eine leere
 * Tabellenzelle. Die Skalierung hängt am Schnitt, der tatsächlich zeichnet —
 * `unitsPerEm` ist von Schrift zu Schrift verschieden.
 */
function runToSegs(run: SceneRun, cover: GlyphCover): Seg[] {
  const out: Seg[] = [];

  let index = 0;
  for (const character of run.text) {
    index += character.length;
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;

    const face = cover.faceFor(run.font, codePoint);
    const font = face ? cover.outlines(face) : undefined;
    if (!font) continue;

    const glyph = font.glyph(codePoint);
    if (glyph && glyph.segs.length > 0) {
      const scale = run.font.size / font.unitsPerEm;
      // Der Browser hat den Vorschub bis *vor* dieses Zeichen schon bestimmt.
      const x = advanceBefore(run, index - character.length);
      out.push(
        ...transformSegs(glyph.segs, matMultiply(matTranslate(x, 0), matScale(scale, -scale))),
      );
    }
  }

  return out;
}

/**
 * Der Vorschub bis zu einem Zeichen, gemessen wie auf dem Bildschirm.
 *
 * `measureText` ist gepuffert, und die Präfixe eines Laufs sind kurz — der
 * quadratische Aufbau kostet in der Praxis nichts, kauft aber exakte
 * Übereinstimmung mit der Darstellung.
 */
function advanceBefore(run: SceneRun, upTo: number): number {
  if (upTo === 0) return 0;
  return measureText(run.text.slice(0, upTo), run.font);
}

/**
 * Unterstreichung und Durchstreichung als Rechtecke.
 *
 * Wo sie liegen, rechnet `laufStriche()` — dieselbe Rechnung, die der
 * SVG-Weg geht. Hier standen eigene Zahlen, und sie waren andere: der Strich
 * lag im PNG 0,16 Einheiten tiefer und war 7,8 % dicker als im SVG, bei
 * kleiner Schrift um ein Viertel.
 */
function decorations(run: SceneRun): Seg[][] {
  return laufStriche(run).map(({ y, h }) => [
    { c: 'M', x: 0, y },
    { c: 'L', x: run.width, y },
    { c: 'L', x: run.width, y: y + h },
    { c: 'L', x: 0, y: y + h },
    { c: 'Z' },
  ]);
}
