/**
 * Der PDF-Weg, gegen die erzeugte Datei geprüft.
 *
 * Gelesen wird mit `pdfjs-dist`, und zwar der Operatorenlauf: nur er sagt, wo
 * ein Bild wirklich landet und ob ein Beschnitt gesetzt wurde. Eine Zusicherung
 * über den Aufruf beweist hier nichts — jsPDF entscheidet an mehreren Stellen
 * selbst, was aus einem Aufruf wird.
 */
import { describe, expect, it } from 'vitest';
import { PDF_SCALE, scenesToPdf } from './pdf';
import { buildSlideScene } from './scene';
import { parseDeck } from '@/lib/markdown/deck';
import { bundledDecks } from '@/decks';
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

/* -------------------------------------------------------------------------- */

describe('ein Bild, das jsPDF nicht verdaut', () => {
  it('nimmt nicht den Rest der Folie mit', async () => {
    /*
       „Füllend" klemmt den Überstand ab: `saveGraphicsState()`, ein Pfad,
       `clip()`. Das `restoreGraphicsState()` stand hinter dem `addImage` im
       `try` — warf das, und genau darauf ist der `catch` daneben gebaut,
       blieb die Klemme stehen. Alles, was danach auf der Seite gezeichnet
       wird, liegt dann im Rechteck des kaputten Bildes und ist nicht zu
       sehen.

       Geprüft wird am **Operatorenlauf** und nicht am Text: `getTextContent()`
       liest den Inhaltsstrom und meldet die Zeile auch dann, wenn eine Klemme
       sie unsichtbar macht. Nur die Reihenfolge sagt es — `restore` muss vor
       dem Text kommen.

       Der Satz über dem `catch` stimmt weiterhin: ein kaputtes Bild darf den
       Export nicht abbrechen. Nur hat es dabei den Rest der Folie
       mitgenommen, und das ist schlimmer als ein Abbruch — der sagt es.
    */
    const kaputt: ScenePrim = {
      t: 'image',
      x: 50,
      y: 50,
      w: 200,
      h: 100,
      href: 'kaputt.png',
      fit: 'cover',
    };
    const text: ScenePrim = {
      t: 'text',
      x: 100,
      y: 400,
      runs: [
        {
          dx: 0,
          text: 'DANACH',
          font: { family: 'body', size: 40, weight: 400, italic: false, tracking: 0 },
          color: '#101010',
          width: 200,
        },
      ],
    };

    const doc = await scenesToPdf([szene([kaputt, text])], {
      embedFonts: false,
      // Maße bekannt, Daten unlesbar: „Füllend" greift, `addImage` wirft.
      images: new Map([
        ['kaputt.png', { dataUrl: 'data:image/png;base64,ZZZZ', format: 'PNG', w: 400, h: 100 }],
      ]),
    } as never);

    const bytes = new Uint8Array(doc.output('arraybuffer'));
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: true }).promise;
    const { fnArray } = await (await pdf.getPage(1)).getOperatorList();

    const klemme = fnArray.indexOf(pdfjs.OPS.clip);
    const zurueck = fnArray.indexOf(pdfjs.OPS.restore);
    const zeile = fnArray.indexOf(pdfjs.OPS.showText);

    // Die Klemme wurde wirklich gesetzt — sonst prüft das hier nichts.
    expect(klemme, 'kein Beschnitt im Lauf').toBeGreaterThanOrEqual(0);
    expect(zeile, 'kein Text im Lauf').toBeGreaterThanOrEqual(0);
    expect(zurueck, 'die Klemme wird nie aufgehoben').toBeGreaterThanOrEqual(0);
    expect(zurueck, 'der Text steht innerhalb der Klemme').toBeLessThan(zeile);
  }, 30000);
});

/* -------------------------------------------------------------------------- */

describe('wo das PDF seinen Text ansetzt', () => {
  it('beginnt jede Zeile dort, wo die Szene sie beginnt', async () => {
    /*
       Drei Fehler dieses Repos waren „zwei Ausgaben, zwei Stellen": ein Bild
       drehte sich um die andere Ecke, jsPDF klemmte am falschen Ort, die
       Beschriftung stand in der `.pptx` neben ihrer Form. Für den **Text** im
       PDF gab es dazu keine Zusicherung — dabei rechnet dieser Weg die
       Position selbst (`prim.x + dx · cos`), teilt Läufe an Schriftgrenzen und
       misst den Vorlauf mit `measureText()`.

       Verglichen wird der **Zeilenanfang**: pdfjs fasst aufeinanderfolgende
       Läufe zu einem Eintrag zusammen und zerlegt eine gesperrte Zeile in
       einzelne Zeichen — der erste Eintrag einer Zeile beginnt aber in beiden
       Fällen dort, wo die Szene die Zeile ansetzt. Ein systematischer Versatz
       fällt damit auf, ohne dass die Prüfung die Eigenheiten von pdfjs
       nachbauen müsste.

       Gedrehte Läufe bleiben draußen: für sie steht die Zusicherung über den
       Drehpunkt eine Prüfung weiter oben.
    */
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    let geprueft = 0;

    for (const eintrag of bundledDecks) {
      const deck = parseDeck(eintrag.source);
      for (const [index, slide] of deck.slides.entries()) {
        const scene = buildSlideScene(slide, deck, {
          chrome: true,
          slideNumber: index + 1,
          totalSlides: deck.slides.length,
        });
        const doc = await scenesToPdf([scene], { embedFonts: false });
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(doc.output('arraybuffer')),
          disableFontFace: true,
        }).promise;
        const seite = await pdf.getPage(1);
        const hoehe = seite.view[3];
        const inhalt = await seite.getTextContent();

        const imPdf = inhalt.items
          .filter((eintragImPdf) => 'str' in eintragImPdf && eintragImPdf.str.trim())
          .map((eintragImPdf) => {
            const tr = (eintragImPdf as { transform: number[] }).transform;
            // Eine Folien-Einheit ist ¾ Punkt, und die Seite zählt von unten.
            return { x: tr[4] / PDF_SCALE, y: (hoehe - tr[5]) / PDF_SCALE };
          });

        for (const prim of scene.prims) {
          if (prim.t !== 'text' || prim.rotate) continue;
          const anfang = { x: prim.x + (prim.runs[0]?.dx ?? 0), y: prim.y };
          geprueft += 1;
          expect(
            imPdf.some((b) => Math.abs(b.x - anfang.x) < 1.5 && Math.abs(b.y - anfang.y) < 1.5),
            `${eintrag.file} #${index + 1}: kein Text bei ${anfang.x.toFixed(1)}/${anfang.y.toFixed(1)}`,
          ).toBe(true);
        }
      }
    }

    // Und die Prüfung hatte wirklich etwas zu vergleichen.
    expect(geprueft).toBeGreaterThan(50);
  }, 120000);
});
