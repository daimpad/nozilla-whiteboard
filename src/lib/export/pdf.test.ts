/**
 * Der PDF-Weg, gegen die erzeugte Datei geprüft.
 *
 * Gelesen wird mit `pdfjs-dist`, und zwar der Operatorenlauf: nur er sagt, wo
 * ein Bild wirklich landet und ob ein Beschnitt gesetzt wurde. Eine Zusicherung
 * über den Aufruf beweist hier nichts — jsPDF entscheidet an mehreren Stellen
 * selbst, was aus einem Aufruf wird.
 */
import { describe, expect, it } from 'vitest';
import { scenesToPdf } from './pdf';
import type { Scene, ScenePrim } from './scene';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function szene(prims: ScenePrim[]): Scene {
  return { width: 1280, height: 720, background: '#FFFFFF', prims } as Scene;
}

async function lies(scene: Scene) {
  const doc = await scenesToPdf([scene], {
    embedFonts: false,
    images: new Map([['a.png', { src: 'a.png', dataUrl: PIXEL, format: 'png', w: 4, h: 2 }]]),
  } as never);
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: true }).promise;
  const seite = await pdf.getPage(1);
  return { liste: await seite.getOperatorList(), OPS: pdfjs.OPS, hoehe: seite.view[3] };
}

/** Die vier Ecken des Bildes, zurück in Folien-Einheiten. */
async function bildecken(scene: Scene): Promise<Array<[number, number]>> {
  const { liste, OPS, hoehe } = await lies(scene);
  // Eine Folien-Einheit ist ¾ Punkt; die Seite ist in Punkten gesetzt.
  const skala = 0.75;
  const mul = (a: number[], b: number[]) => [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stapel: number[][] = [];
  let out: Array<[number, number]> = [];
  for (let i = 0; i < liste.fnArray.length; i += 1) {
    const fn = liste.fnArray[i];
    const args = liste.argsArray[i] as number[];
    if (fn === OPS.save) stapel.push([...ctm]);
    else if (fn === OPS.restore) ctm = stapel.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(args, ctm);
    // `paintJpegXObject` steht nicht in den Typen von pdfjs-dist, kommt aber
    // für ein JPEG wirklich vor.
    else if (
      fn === OPS.paintImageXObject ||
      fn === (OPS as Record<string, number>).paintJpegXObject
    ) {
      out = (
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ] as Array<[number, number]>
      ).map(([x, y]) => [
        (ctm[0] * x + ctm[2] * y + ctm[4]) / skala,
        (hoehe - (ctm[1] * x + ctm[3] * y + ctm[5])) / skala,
      ]);
    }
  }
  return out;
}

/*
   Sortiert verglichen: welche Ecke des Einheitsquadrats in welcher Reihenfolge
   kommt, hängt an der Kippung der PDF-Achse und sagt nichts über die Lage.
*/
const rund = (ecken: Array<[number, number]>) =>
  ecken.map(([x, y]) => [Math.round(x), Math.round(y)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

describe('Bilder im PDF', () => {
  it('dreht ein Bild um denselben Punkt wie das SVG', async () => {
    /*
       Ein `image`-Primitiv trägt seine Ecke **nach** der Matrix und dreht um
       genau diesen Punkt — `scene.ts` rechnet sie eigens dafür aus, damit Bild
       und Rahmen zusammenfallen, und `svg.ts` schreibt `rotate(a x y)`. jsPDF
       dreht dagegen um `(x, y + h)`, also um die untere linke Ecke des
       ungedrehten Rechtecks: gemessen lag der Rahmen des Elements bei
       x 350…450 und das Bild bei x 550…650.
    */
    const ecken = await bildecken(
      szene([{ t: 'image', x: 450, y: -50, w: 400, h: 100, href: 'a.png' } as ScenePrim]),
    );
    const gedreht = await bildecken(
      szene([
        { t: 'image', x: 450, y: -50, w: 400, h: 100, href: 'a.png', rotate: 90 } as ScenePrim,
      ]),
    );

    // Ungedreht: ein 4:2-Bild in einem 400 × 100-Kasten wird auf 200 × 100
    // eingepasst und mittig gesetzt.
    expect(rund(ecken)).toEqual([
      [550, -50],
      [550, 50],
      [750, -50],
      [750, 50],
    ]);
    // Gedreht: dieselben vier Punkte, um (450, −50) im Uhrzeigersinn gedreht.
    expect(rund(gedreht)).toEqual([
      [350, 50],
      [350, 250],
      [450, 50],
      [450, 250],
    ]);
  });

  it('beschneidet „Füllend", statt ein Rechteck zu malen', async () => {
    /*
       Für `fit: 'cover'` schnitt der Weg mit `doc.rect(...)` ohne Stil-Argument
       zu. jsPDF reicht ein fehlendes Argument an `putStyle` durch, das auf
       `defaultPathOperation` = `"S"` fällt: der Pfad wurde **gestrichen und
       dabei verbraucht**, das `W` danach fand keinen Pfad mehr. Es gab also
       keinen Beschnitt — dafür ein sichtbares schwarzes Rechteck über dem Bild.
    */
    const { liste, OPS } = await lies(
      szene([
        { t: 'image', x: 100, y: 100, w: 400, h: 100, href: 'a.png', fit: 'cover' } as ScenePrim,
      ]),
    );
    const ops = [...liste.fnArray];
    expect(ops).toContain(OPS.clip);
    // Und nichts wird dabei gestrichen: ein `S` an dieser Stelle ist der
    // schwarze Balken, den niemand bestellt hat.
    expect(ops).not.toContain(OPS.stroke);
    expect(ops).not.toContain(OPS.fillStroke);
  });
});
