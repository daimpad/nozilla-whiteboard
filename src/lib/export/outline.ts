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
import { measureText, type FontSpec } from '@/lib/text/measure';
import { facesFor, loadOutlines, resolveFace } from './fontFiles';
import type { Scene, ScenePrim, SceneRun } from './scene';
import type { TrueTypeFont } from '@/lib/text/truetype';

/**
 * Alle Textprimitiven einer Szene durch Pfade ersetzen.
 *
 * Ein Lauf, dessen Schnitt sich nicht laden lässt, bleibt Text. Lieber eine
 * Folie mit einer ersetzten Schrift als eine Folie mit einem Loch.
 */
export async function outlineScene(scene: Scene): Promise<Scene> {
  const specs: FontSpec[] = [];
  for (const prim of scene.prims) {
    if (prim.t === 'text') for (const run of prim.runs) specs.push(run.font);
  }
  if (specs.length === 0) return scene;

  const fonts = await loadFonts(specs);
  if (fonts.size === 0) return scene;

  const prims: ScenePrim[] = [];
  for (const prim of scene.prims) {
    if (prim.t !== 'text') {
      prims.push(prim);
      continue;
    }
    prims.push(...outlineTextPrim(prim, fonts));
  }
  return { ...scene, prims };
}

export async function outlineScenes(scenes: readonly Scene[]): Promise<Scene[]> {
  return Promise.all(scenes.map(outlineScene));
}

/** Die Schnitte laden, die eine Szene braucht; Fehlschläge stillschweigend auslassen. */
async function loadFonts(specs: readonly FontSpec[]): Promise<Map<string, TrueTypeFont>> {
  const loaded = new Map<string, TrueTypeFont>();
  await Promise.all(
    facesFor(specs).map(async (face) => {
      try {
        loaded.set(face.id, await loadOutlines(face));
      } catch (error) {
        console.warn(`Umrisse für ${face.id} nicht verfügbar — bleibt echter Text.`, error);
      }
    }),
  );
  return loaded;
}

/* -------------------------------------------------------------------------- */

type TextPrim = Extract<ScenePrim, { t: 'text' }>;

function outlineTextPrim(prim: TextPrim, fonts: Map<string, TrueTypeFont>): ScenePrim[] {
  const out: ScenePrim[] = [];
  const leftovers: SceneRun[] = [];

  // Drehung und Grundlinie einmal aufbauen; jeder Lauf hängt sich daran.
  const place =
    prim.rotate && prim.rotate !== 0
      ? matMultiply(matRotateAbout(prim.rotate, prim.x, prim.y), matTranslate(prim.x, prim.y))
      : matTranslate(prim.x, prim.y);

  for (const run of prim.runs) {
    const face = resolveFace(run.font);
    const font = face ? fonts.get(face.id) : undefined;
    if (!font) {
      leftovers.push(run);
      continue;
    }

    // Der Lauf sitzt an seinem eigenen Versatz auf der Grundlinie.
    const at = matMultiply(place, matTranslate(run.dx, 0));

    // Ein Lauf aus reinem Zwischenraum trägt keine Kontur — das ist richtig
    // so, seine Breite steckt bereits im `dx` des nächsten Laufs.
    const segs = runToSegs(run, font);
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

/**
 * Einen Lauf in Konturen übersetzen, in Folien-Einheiten, Y nach unten.
 *
 * Die Schrift liefert Y nach oben und in Font-Einheiten; beides dreht und
 * skaliert `matScale(s, -s)` in einem Schritt.
 */
function runToSegs(run: SceneRun, font: TrueTypeFont): Seg[] {
  const scale = run.font.size / font.unitsPerEm;
  const toSlide = matScale(scale, -scale);
  const out: Seg[] = [];

  let index = 0;
  for (const character of run.text) {
    index += character.length;
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;

    const glyph = font.glyph(codePoint);
    if (glyph && glyph.segs.length > 0) {
      // Der Browser hat den Vorschub bis *vor* dieses Zeichen schon bestimmt.
      const x = advanceBefore(run, index - character.length);
      out.push(...transformSegs(glyph.segs, matMultiply(matTranslate(x, 0), toSlide)));
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

/** Unterstreichung und Durchstreichung als Rechtecke. */
function decorations(run: SceneRun): Seg[][] {
  const rules: Seg[][] = [];
  const thickness = Math.max(1, run.font.size * 0.055);
  const rule = (y: number): Seg[] => [
    { c: 'M', x: 0, y },
    { c: 'L', x: run.width, y },
    { c: 'L', x: run.width, y: y + thickness },
    { c: 'L', x: 0, y: y + thickness },
    { c: 'Z' },
  ];
  if (run.underline) rules.push(rule(run.font.size * 0.14));
  if (run.strike) rules.push(rule(-run.font.size * 0.28));
  return rules;
}
