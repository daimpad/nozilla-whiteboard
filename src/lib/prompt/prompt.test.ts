import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  activeTheme,
  aktivesFolienformat,
  canvas,
  folienformate,
  forbiddenWords,
  MAX_MARKERS_PER_PARAGRAPH,
  setzeFolienformat,
  slideLayouts,
  toneNames,
} from '@/theme';
import type { ToneName } from '@/theme';
import {
  cardVariants,
  elementKinds,
  fillStyles,
  shapeNames,
  slideBackgrounds,
  type CanvasElement,
} from '@/model/types';
import { parseDeck } from '@/lib/markdown/deck';
import { createElement, minimizeElement } from '@/model/factory';
import { backgroundStyle, unsichtbareFlaeche } from '@/lib/export/scene';
import { bundledDecks } from '@/decks';
import { ohneCodezaun } from './zaun';
import {
  buildExampleSection,
  buildPrompt,
  buildSchemaSection,
  emptyBrief,
  missingSuggestedIcons,
  type DeckBrief,
} from './buildPrompt';

const brief: DeckBrief = {
  ...emptyBrief,
  topic: 'Ablösung der Altplattform',
  audience: 'Geschäftsführung',
  goal: 'Freigabe für das erste Quartal',
  slideCount: 6,
  material: '38 % der Zeit in Fehlerbehebung',
};

describe('der Deck-Prompt', () => {
  const prompt = buildPrompt(brief);

  it('nennt jedes Wort, das der Parser kennt', () => {
    // Das ist der eigentliche Zweck des Generators: was der Parser akzeptiert,
    // muss im Prompt stehen — sonst rät das Modell.
    for (const layout of slideLayouts) expect(prompt).toContain(layout);
    for (const background of slideBackgrounds) expect(prompt).toContain(background);
    for (const tone of toneNames) expect(prompt).toContain(tone);
    for (const variant of cardVariants) expect(prompt).toContain(variant);
    for (const shape of shapeNames) expect(prompt).toContain(shape);
  });

  it('nennt nur Icons, die es wirklich gibt', () => {
    expect(missingSuggestedIcons()).toEqual([]);
  });

  it('gibt die Maße der Fläche an', () => {
    expect(prompt).toContain(String(canvas.width));
    expect(prompt).toContain(String(canvas.height));
    expect(prompt).toContain(String(canvas.margin.left));
  });

  it('trägt den Auftrag', () => {
    expect(prompt).toContain(brief.topic);
    expect(prompt).toContain(brief.audience);
    expect(prompt).toContain(brief.goal);
    expect(prompt).toContain(brief.material);
    expect(prompt).toContain('6 Folien');
  });

  it('schaltet Notizen und freie Fläche wirklich um', () => {
    const plain = buildPrompt({ ...brief, richCanvas: false, notes: false });
    expect(plain).toContain('Keine Notizen');
    expect(plain).toContain('Vorwiegend Fließtext');
    expect(prompt).toContain('Zu jeder Folie `notes:`');
    expect(prompt).toContain('Mindestens die Hälfte der Folien nutzt die freie Fläche');
  });

  it('lässt sich ohne Beispiel spürbar kürzen', () => {
    const short = buildPrompt(brief, { withExample: false });
    expect(short.length).toBeLessThan(prompt.length);
    expect(prompt.length - short.length).toBeGreaterThan(800);
    expect(short).not.toContain('Die Altplattform kostet mehr');
  });

  it('bleibt kurz genug, um zuverlässig zu wirken', () => {
    // Ein Prompt, der zu lang wird, verwässert. 16 000 Zeichen sind rund
    // 4 000 Token — genug Platz für Material, wenig genug zum Befolgen.
    expect(prompt.length).toBeLessThan(16000);
  });

  it('verlangt reine Markdown-Ausgabe', () => {
    expect(prompt).toContain('Gib ausschließlich den Inhalt der Markdown-Datei aus');
  });
});

/**
 * Der Prompt ist ein **Vertrag**: er beschreibt einem Sprachmodell ein
 * Dateiformat, und beurteilt wird die Antwort danach von `parseDeck`. Jede
 * Zusage darin gehört deshalb gegen die Stelle gehalten, die sie einlöst —
 * und nicht gegen die Absicht dessen, der sie aufgeschrieben hat.
 *
 * Die Sorte Fehler, um die es geht, steht in `CLAUDE.md` schon dreimal: „wer
 * zu viel verspricht, bekommt vom Modell etwas, das die Seite eine Ecke
 * weiter zurückweist — der Fehler steht dann bei dem, der den Prompt befolgt
 * hat."
 */
describe('was der Prompt zusagt', () => {
  const format = aktivesFolienformat();
  afterEach(() => setzeFolienformat(format));

  it('liegt mit jeder eigenen Koordinate im Raster', () => {
    /*
       Der Prompt verlangt zweimal ein Vielfaches von `gridSize` — einmal als
       Regel, einmal als Haken der Prüfliste — und brach es in seinen eigenen
       Beispielen elfmal: x 700, y 140, w 492, h 190. Ein Modell schreibt ab,
       was es sieht, nicht was daneben steht.
    */
    const text = `${buildSchemaSection()}\n${buildExampleSection()}`;
    const zahlen = [...text.matchAll(/^\s*(x|y|w|h):\s*(-?\d+)\s*$/gm)];
    expect(zahlen.length).toBeGreaterThan(8);
    for (const [, feld, wert] of zahlen) {
      // Der Rest steht in der Zusicherung, damit die Meldung sagt, welche
      // Zahl es war — „expected 4 to be 0" nennt sie nicht.
      expect(`${feld}: ${wert} · Rest ${Number(wert) % canvas.gridSize}`).toBe(
        `${feld}: ${wert} · Rest 0`,
      );
    }
  });

  it('nennt jedes Feld, das die Datei von einem Element trägt', () => {
    /*
       Gemessen am **Serialisierer** und nicht an einer getippten Liste: was
       `minimizeElement()` schreibt, ist genau das, was in der `.md` steht und
       was der Leser zurückholt. Fehlte davon etwas im Prompt, gäbe es eine
       Angabe, die wirkt und die kein Modell je schreibt — `labelStyle` war
       genau das.

       Die gemeinsamen Schlüssel stehen bewusst nicht in der Feldtabelle: die
       einen erklärt der Prompt an anderer Stelle (tone, fill, shadow,
       strokeWeight, reveal, x/y/w/h), die anderen soll ein Modell gar nicht
       setzen — eine Drehung, eine Ebene, eine Gruppe legt man mit der Hand.
    */
    const gemeinsam = new Set([
      'id',
      'kind',
      'x',
      'y',
      'w',
      'h',
      'rotation',
      'z',
      'tone',
      'fill',
      'strokeWeight',
      'shadow',
      'padding',
      'opacity',
      'locked',
      'name',
      'group',
      'reveal',
    ]);
    const schema = buildSchemaSection();
    const tabelle = schema.slice(schema.indexOf('kind — die Elementarten'));

    for (const kind of elementKinds) {
      /*
         Jedes optionale Feld belegen: der Serialisierer lässt weg, was leer
         ist, und eine leere Vorlage prüfte die halbe Tabelle. Absichtlich über
         die Art hinaus — was eine Art nicht kennt, lässt ihr `switch` ohnehin
         fallen, und nur so bekommt jede alles, was sie kennt.
      */
      const voll = {
        ...createElement(kind, { x: 0, y: 0 }),
        label: 'L',
        labelStyle: 'h3',
        icon: 'check',
        alt: 'A',
      } as unknown as CanvasElement;
      const zeile = tabelle.split('\n').find((l) => l.trim().startsWith(`${kind} `));
      expect(`${kind}: Zeile in der Feldtabelle`).toBe(
        zeile ? `${kind}: Zeile in der Feldtabelle` : `${kind}: fehlt`,
      );
      for (const key of Object.keys(minimizeElement(voll))) {
        if (gemeinsam.has(key)) continue;
        expect(`${kind}.${key}: ${zeile?.includes(key) ? 'genannt' : 'fehlt im Prompt'}`).toBe(
          `${kind}.${key}: genannt`,
        );
      }
    }
  });

  it('sagt, unter welchem Erscheinungsbild und auf welchem Blatt das Deck steht', () => {
    /*
       Der Prompt misst die Folie aus der **lebendigen** Bindung: unter
       `a4-hoch` sagt er „1280 × 1810 Einheiten (DIN A hoch)". Er nannte dabei
       weder `format:` noch `theme:` — ein Modell, das ihm folgt, liefert
       Koordinaten bis y = 1810, das Deck kommt ohne Schlüssel zurück, öffnet
       auf 16:9 und ist 720 hoch. Gemessen: ein Element bei y = 1400 stand
       damit 680 Einheiten unter der Folie.

       Geprüft wird am **Leser** und nicht am Text: was der Prompt hinschreibt,
       muss `parseDeck` als genau dieses Blatt und dieses Erscheinungsbild
       zurückgeben.
    */
    for (const blatt of folienformate) {
      setzeFolienformat(blatt);
      const prompt = buildPrompt({ ...emptyBrief, topic: 'X' });
      const zeilen = prompt.split('\n').map((l) => l.trim());
      const themeZeile = zeilen.find((l) => l.startsWith('theme:'));
      const formatZeile = zeilen.find((l) => l.startsWith('format:'));
      expect(`${blatt}: ${themeZeile ?? 'ohne theme:'}`).toBe(
        `${blatt}: theme: ${activeTheme().id}`,
      );
      expect(`${blatt}: ${formatZeile ?? 'ohne format:'}`).toBe(`${blatt}: format: ${blatt}`);

      const deck = parseDeck(`---\ntitle: X\n${themeZeile}\n${formatZeile}\n---\n\n# Folie.`);
      expect(deck.meta.format).toBe(aktivesFolienformat());
      expect(deck.meta.theme).toBe(activeTheme().id);
      expect(prompt).toContain(`${canvas.width} × ${canvas.height} Einheiten`);
    }
  });

  it('erklärt jeden Untergrund, den es zur Wahl stellt', () => {
    const schema = buildSchemaSection();
    const block = schema.slice(schema.indexOf('background:'), schema.indexOf('transition:'));
    for (const bg of slideBackgrounds) {
      expect(`${bg}: ${new RegExp(`\\b${bg} = `).test(block) ? 'erklärt' : 'nur aufgezählt'}`).toBe(
        `${bg}: erklärt`,
      );
    }
  });

  it('nennt genau die Paare aus Untergrund und Ton, die nichts malen', () => {
    /*
       Beide Richtungen, und die zweite ist die eigentliche: eine Warnung, die
       zu viel nennt, verurteilt eine Folie, die gut aussieht — und ein
       Wächter, der auf gut Aussehendem anschlägt, wird abgeschaltet.

       Gemessen wird an `unsichtbareFlaeche()`, also an dem Wächter, den die
       Oberfläche für dieselbe Frage schon hat. Die Form ist eine `shape` mit
       `flat`: eine Karte malt daneben ihren Titel, ein Verbinder hat keinen
       Körper — nur die Form ist danach wirklich nichts.
    */
    const genannt = new Set(
      [...buildSchemaSection().matchAll(/(\w+)\+(\w+)/g)].map(([, bg, tone]) => `${bg}+${tone}`),
    );
    expect(genannt.size).toBeGreaterThan(0);

    for (const bg of slideBackgrounds) {
      for (const tone of toneNames) {
        const form = { ...createElement('shape', { x: 0, y: 0 }), tone: tone as ToneName };
        const blind = fillStyles.some((fill) =>
          unsichtbareFlaeche({ ...form, fill }, backgroundStyle(bg)),
        );
        expect(`${bg}+${tone}: ${genannt.has(`${bg}+${tone}`) ? 'genannt' : 'nicht genannt'}`).toBe(
          `${bg}+${tone}: ${blind ? 'genannt' : 'nicht genannt'}`,
        );
      }
    }
  });

  it('sagt über Überschriften, was die mitgelieferten Decks tun', () => {
    /*
       „Überschriften sind Sätze mit Punkt." stand hier als Regel für *jede*
       Überschrift — und das eigene Beispiel, die Willkommensmappe und das
       Deck der zweiten Marke halten sich alle drei nicht daran: der Punkt
       gehört dem Kampagnensatz, also der `#`-Zeile, und nicht der
       Zwischenüberschrift.

       Die Regel steht damit gegen das Material, an dem man sie ablesen kann.
       Beide Richtungen, denn eine Regel, die nur die eine Hälfte prüft, wäre
       auch für „alle Überschriften ohne Punkt" grün.
    */
    const quellen = [...bundledDecks.map((d) => d.source), buildExampleSection()];
    let kampagne = 0;
    let zwischen = 0;

    for (const quelle of quellen) {
      // Ein Codeblock zeigt das Dateiformat und ist keine Überschrift.
      const ohneCode = quelle.replace(/^```[\s\S]*?^```/gm, '');
      for (const [, ebene, text] of ohneCode.matchAll(/^(#{1,6}) (.+)$/gm)) {
        if (ebene === '#') {
          kampagne += 1;
          expect(`# ${text}`).toMatch(/[.?!]$/);
        } else {
          zwischen += 1;
          expect(`${ebene} ${text}`).not.toMatch(/\.$/);
        }
      }
    }
    expect(kampagne).toBeGreaterThan(2);
    expect(zwischen).toBeGreaterThan(2);
  });
});

describe('das mitgelieferte Beispiel', () => {
  it('ist selbst gültiges Deck-Markdown', () => {
    // Wenn das Beispiel im Prompt nicht parst, lernt das Modell das Falsche.
    const example = buildExampleSection().split('\n').slice(3).join('\n').trim();
    const deck = parseDeck(example);

    expect(deck.meta.title).toBe('Ablösung der Altplattform');
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0].meta.layout).toBe('title');
    expect(deck.slides[0].elements[0].kind).toBe('wordmark');
    expect(deck.slides[1].elements).toHaveLength(2);
    expect(deck.slides[1].elements[1]).toMatchObject({
      kind: 'card',
      tone: 'signal',
      reveal: { step: 1, animation: 'rise' },
    });
    expect(deck.slides[1].markdown).toContain('==zwei Module==');
  });

  it('hält sich an die eigenen Regeln', () => {
    // Gegen die Werte der CI und nicht gegen abgeschriebene: hier standen eine
    // 3 und drei von zwölf verbotenen Wörtern. Wer ein Wort ergänzt oder die
    // Markergrenze senkt, bekäme von der alten Fassung kein Wort.
    const example = buildExampleSection();
    for (const paragraph of example.split(/\n{2,}/)) {
      expect((paragraph.match(/==[^=]+==/g) ?? []).length).toBeLessThanOrEqual(
        MAX_MARKERS_PER_PARAGRAPH,
      );
    }
    for (const wort of forbiddenWords) {
      expect(
        `${wort}: ${new RegExp(`\\b${wort}\\b`, 'i').test(example) ? 'steht drin' : '—'}`,
      ).toBe(`${wort}: —`);
    }
  });
});

describe('ohneCodezaun', () => {
  it('entfernt einen umschließenden Codeblock', () => {
    expect(ohneCodezaun('```markdown\n---\ntitle: X\n---\n```')).toBe('---\ntitle: X\n---');
    expect(ohneCodezaun('```\nhallo\n```')).toBe('hallo');
  });

  it('lässt gewöhnlichen Text in Ruhe', () => {
    expect(ohneCodezaun('---\ntitle: X\n---')).toBe('---\ntitle: X\n---');
  });

  it('lässt einen Codeblock *innerhalb* des Decks stehen', () => {
    const deck = '---\ntitle: X\n---\n\n```ts\nconst a = 1;\n```';
    expect(ohneCodezaun(deck)).toBe(deck);
  });

  it('nimmt den Zaun auch mit einem Satz davor und dahinter', () => {
    /*
       Der häufigste Fall überhaupt — und der, den die vorige, durchweg
       verankerte Fassung nicht kannte: sie ließ den Zaun stehen, `parseDeck`
       bekam die Vorrede als Inhalt, und die Meldung lautete „Das liest sich
       nicht wie ein Deck".
    */
    const antwort =
      'Klar, hier ist das Deck:\n```md\n---\ntitle: X\n---\n```\nSoll ich noch etwas?';
    expect(ohneCodezaun(antwort)).toBe('---\ntitle: X\n---');
  });

  it('greift dabei nicht in ein nacktes Deck hinein', () => {
    /*
       Die Gegenrichtung, und sie trägt die ganze Regel. Ein Deck darf selbst
       einen Codeblock enthalten — die Willkommensmappe tut es. Wer den Satz
       davor toleriert, ohne diesen Fall auszunehmen, holt aus einem nackten
       Deck dessen *inneren* Block heraus und wirft alles andere weg.
    */
    const deck = '---\ntitle: X\n---\n\nText davor\n\n```ts\nconst a = 1;\n```\n\nText danach';
    expect(ohneCodezaun(deck)).toBe(deck);
  });

  it('greift auch mit einem Satz davor nicht in ein Deck hinein', () => {
    /*
       Die Lücke, die der Schutz eine Stufe darüber nicht deckte: er fängt ein
       nacktes Deck nur, solange der Text *mit* `---` beginnt. „Klar, hier ist
       das Deck:" davor, und der Schnitt nahm den inneren Codeblock — gemessen
       blieb vom ganzen Deck `const a = 1;` übrig.
    */
    const deck = '---\ntitle: X\n---\n\n# Folie\n\n```ts\nconst a = 1;\n```\n\n# Folie 2';
    expect(ohneCodezaun(`Klar, hier ist das Deck:\n${deck}`)).toContain('# Folie 2');
    expect(ohneCodezaun(`Klar, hier ist das Deck:\n${deck}`)).toContain('title: X');
  });

  it('behält den Inhalt, wenn nur der öffnende Zaun kam', () => {
    /*
       Die Form einer abgebrochenen Modellantwort: Vorrede, ein Zaun auf, und
       der schließende kam nie, weil die Länge zu Ende war. Dann ist der erste
       Zaun zugleich der letzte, und ein Schnitt „von der Zeile danach bis zur
       Zeile davor" ergäbe die leere Zeichenkette.

       Damit fiele die ganze Abbruchbehandlung weg: `abgebrochen()` bekäme
       nichts zu sehen, gäbe `null` zurück, und statt „zuletzt vollständig war
       X … bitte das Modell, ab Y fortzusetzen" samt dem Angebot des
       Teilimports bliebe „Daraus wird kein JSON-Objekt: Unexpected end of JSON
       input" — genau die Sackgasse, für die es `abgebrochen()` gibt.
    */
    expect(ohneCodezaun('Klar, hier ist die CI:\n```json\n{"id": "a"')).toContain('"id"');
    // Und der Zaun selbst bleibt draußen — geschnitten wird nur nicht bis ins
    // Leere. Dass daraus eine Abbruchdiagnose wird, prüft `ruecklauf.test.ts`:
    // dort steht der Leser, hier steht nur der Zuschnitt.
    expect(ohneCodezaun('```json\n{"id": "a"')).toBe('```json\n{"id": "a"');
  });

  it('schneidet bis zum letzten Zaun, nicht bis zum nächsten', () => {
    /*
       Die andere Hälfte desselben Falls: ein eingezäuntes Deck *mit* einem
       Codeblock darin. Der nicht gierige Ausdruck endete am Öffner des inneren
       Blocks — der Inhalt hörte mitten in der ersten Folie auf, `parseDeck`
       las das anstandslos, und der Benutzer bekam ein Deck, dem stillschweigend
       die Hälfte der Folien fehlte.
    */
    const deck = '---\ntitle: X\n---\n\n# Folie\n\n```ts\nconst a = 1;\n```\n\n# Folie 2';
    const antwort = `Klar:\n\`\`\`markdown\n${deck}\n\`\`\`\nPasst das?`;
    expect(ohneCodezaun(antwort)).toBe(deck);
  });

  it('lässt innere Zäune stehen, wenn der äußere fällt', () => {
    const antwort = '```md\n---\ntitle: X\n---\n\n```ts\nconst a = 1;\n```\n```';
    expect(ohneCodezaun(antwort)).toBe('---\ntitle: X\n---\n\n```ts\nconst a = 1;\n```');
  });
});

/**
 * PROMPT.md ist die menschenlesbare Fassung desselben Prompts. Dieser Test
 * hält beide zusammen: driftet der Code, schlägt er fehl.
 * Neu schreiben mit:  UPDATE_PROMPT=1 npx vitest run src/lib/prompt
 */
describe('PROMPT.md', () => {
  const file = join(process.cwd(), 'PROMPT.md');
  const marker = '<!-- BEGIN GENERATED PROMPT -->';
  const endMarker = '<!-- END GENERATED PROMPT -->';

  it('enthält den aktuellen Prompt', () => {
    const generated = buildPrompt({ ...emptyBrief, topic: '{{THEMA}}' });
    const current = readFileSync(file, 'utf8');

    if (process.env.UPDATE_PROMPT) {
      const before = current.slice(0, current.indexOf(marker) + marker.length);
      const after = current.slice(current.indexOf(endMarker));
      writeFileSync(file, `${before}\n\n\`\`\`text\n${generated}\n\`\`\`\n\n${after}`);
    }

    const updated = readFileSync(file, 'utf8');
    expect(updated).toContain(marker);
    expect(updated).toContain(generated);
  });
});
