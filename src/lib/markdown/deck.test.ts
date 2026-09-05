import { describe, expect, it } from 'vitest';
import {
  escapeCommentTerminators,
  parseDeck,
  parseSlide,
  serializeDeck,
  splitFrontmatter,
  splitSlides,
  unescapeCommentTerminators,
} from './deck';
import {
  cardVariants,
  chartKinds,
  connectorKinds,
  elementKinds,
  fillStyles,
  iconFrames,
  shapeNames,
  wordmarkVariants,
  type CanvasElement,
  type Deck,
} from '@/model/types';
import { revealAnimations, shadowNames, strokeNames, toneNames, typeScale } from '@/theme';
import { createElement } from '@/model/factory';
import { bundledDecks } from '@/decks';

/** Die Folienkennung gibt es nur zur Laufzeit — beim Rundlauf zählt sie nicht. */
function stable(deck: Deck) {
  return {
    meta: deck.meta,
    slides: deck.slides.map(({ meta, markdown, elements }) => ({ meta, markdown, elements })),
  };
}

describe('splitSlides', () => {
  it('splits on a `---` line preceded by a blank line', () => {
    expect(splitSlides('# One\n\n---\n\n# Two')).toEqual(['# One\n', '\n# Two']);
  });

  it('does not split a Setext heading underline', () => {
    const source = 'Heading\n---\n\nBody';
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('ignores delimiters inside fenced code blocks', () => {
    const source = ['# One', '', '```', '', '---', '', '```', '', 'still slide one'].join('\n');
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('ignores delimiters inside HTML comments', () => {
    const source = ['<!-- nzl', 'notes: |', '  a', '', '---', '', '  b', '-->', '', '# One'].join(
      '\n',
    );
    expect(splitSlides(source)).toHaveLength(1);
  });

  it('drops empty chunks but always yields at least one', () => {
    expect(splitSlides('')).toEqual(['']);
    expect(splitSlides('\n---\n\n# Only')).toEqual(['\n# Only']);
  });
});

describe('splitFrontmatter', () => {
  it('extracts a leading YAML block', () => {
    const { frontmatter, body } = splitFrontmatter('---\ntitle: Hi\n---\n\n# Slide');
    expect(frontmatter).toBe('title: Hi');
    expect(body.trim()).toBe('# Slide');
  });

  it('leaves a document without frontmatter alone', () => {
    const { frontmatter, body } = splitFrontmatter('# Slide');
    expect(frontmatter).toBeNull();
    expect(body).toBe('# Slide');
  });
});

describe('comment terminator escaping', () => {
  const cases = ['-->', '--&gt;', '--&&gt;', 'a --> b --> c', 'no terminators here'];

  it.each(cases)('round-trips %j', (input) => {
    expect(unescapeCommentTerminators(escapeCommentTerminators(input))).toBe(input);
  });

  it('removes every raw terminator from the escaped form', () => {
    expect(escapeCommentTerminators('x --> y')).not.toContain('-->');
  });
});

describe('parseDeck', () => {
  it('reads deck metadata and slide metadata', () => {
    const deck = parseDeck(
      [
        '---',
        'title: Quarterly',
        'author: Nozilla',
        'footer: Internal',
        '---',
        '',
        '<!-- nzl',
        'layout: title',
        'transition: cut',
        'background: ink',
        '-->',
        '',
        '# Hello',
      ].join('\n'),
    );

    expect(deck.meta).toMatchObject({
      title: 'Quarterly',
      author: 'Nozilla',
      footer: 'Internal',
    });
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0].meta).toEqual({
      layout: 'title',
      transition: 'cut',
      background: 'ink',
    });
    expect(deck.slides[0].markdown).toBe('# Hello');
  });

  it('restores element positions and applies CI defaults to omitted properties', () => {
    const deck = parseDeck(
      [
        '<!-- nzl',
        'elements:',
        '  - id: b1',
        '    kind: badge',
        '    x: 88',
        '    y: 96',
        '    w: 160',
        '    h: 40',
        '    text: New',
        '-->',
        '',
        '# Slide',
      ].join('\n'),
    );

    const [element] = deck.slides[0].elements;
    expect(element).toMatchObject({ id: 'b1', kind: 'badge', x: 88, y: 96, w: 160, h: 40 });
    // Was niemand angefasst hat, kommt aus den Vorgaben der CI und nicht aus
    // der Datei.
    expect(element).toMatchObject({ tone: 'signal', fill: 'framed', opacity: 1, rotation: 0 });
  });

  it('survives a broken element instead of failing the file', () => {
    const deck = parseDeck(
      ['<!-- nzl', 'elements:', '  - kind: not-a-kind', '    x: nope', '-->', '', '# Slide'].join(
        '\n',
      ),
    );
    expect(deck.slides[0].elements).toHaveLength(1);
    expect(deck.slides[0].elements[0].kind).toBe('shape');
  });

  it('preserves unknown frontmatter keys', () => {
    const deck = parseDeck('---\ntitle: T\ncustom: 42\n---\n\n# S');
    expect(deck.meta.extra).toEqual({ custom: 42 });
    expect(serializeDeck(deck)).toContain('custom: 42');
  });

  it('always produces at least one slide', () => {
    expect(parseDeck('').slides).toHaveLength(1);
  });
});

describe('serializeDeck', () => {
  it('round-trips a deck losslessly', () => {
    const source = [
      '---',
      'title: Round Trip',
      'author: Nozilla',
      '---',
      '',
      '<!-- nzl',
      'layout: title',
      'background: ink',
      'notes: Say something memorable.',
      'elements:',
      '  - id: badge-1',
      '    kind: badge',
      '    x: 88',
      '    y: 96',
      '    w: 210',
      '    h: 40',
      '    tone: ink',
      '    text: Markdown + Canvas',
      '    icon: sparkle',
      '  - id: card-1',
      '    kind: card',
      '    x: 664',
      '    y: 168',
      '    w: 300',
      '    h: 190',
      '    rotation: 12',
      '    opacity: 0.8',
      '    title: A card',
      '    body: With a body.',
      '    reveal:',
      '      step: 2',
      '      animation: zoom',
      '-->',
      '',
      '# Hello',
      '',
      'Some **content**.',
      '',
      '---',
      '',
      '## Second slide',
    ].join('\n');

    const first = parseDeck(source);
    const second = parseDeck(serializeDeck(first));
    expect(stable(second)).toEqual(stable(first));
  });

  it('keeps an icon name that the active icon set does not know', () => {
    // Ein Deck darf ein Zeichen aus dem Set einer anderen Marke nennen.
    // Würde es beim Einlesen verworfen, verlöre eine Sitzung ohne dieses Set
    // beim ersten Speichern jedes Icon — genau wie bei einem unbekannten
    // Erscheinungsbild bleibt der Wert stehen.
    const source = [
      '<!-- nzl',
      'elements:',
      '  - kind: icon',
      '    x: 10',
      '    y: 10',
      '    icon: musterkunde-siegel',
      '-->',
    ].join('\n');

    const deck = parseDeck(source);
    expect(serializeDeck(deck)).toContain('icon: musterkunde-siegel');
  });

  it('keeps a slide that has neither content nor metadata', () => {
    const deck = parseDeck('# One\n\n---\n\n# Two');
    deck.slides[1].markdown = '';
    const reloaded = parseDeck(serializeDeck(deck));
    expect(reloaded.slides).toHaveLength(2);
  });

  it('omits properties that still equal the CI default', () => {
    const deck = parseDeck(
      ['<!-- nzl', 'elements:', '  - kind: shape', '    x: 10', '    y: 10', '-->'].join('\n'),
    );
    const output = serializeDeck(deck);
    expect(output).toContain('kind: shape');
    expect(output).not.toContain('opacity:');
    expect(output).not.toContain('rotation:');
    expect(output).not.toContain('locked:');
  });

  it('emits no metadata block for a plain Markdown slide', () => {
    const deck = parseDeck('# Just prose\n\nNothing placed here.');
    expect(serializeDeck(deck)).not.toContain('<!-- nzl');
  });

  it('escapes content that would close the metadata comment', () => {
    const deck = parseDeck('# S');
    deck.slides[0].meta.notes = 'watch out for --> this';
    const output = serializeDeck(deck);
    // Genau ein Kommentarende — das echte.
    expect(output.match(/-->/g)).toHaveLength(1);
    expect(parseDeck(output).slides[0].meta.notes).toBe('watch out for --> this');
  });
});

describe('das Erscheinungsbild im Frontmatter', () => {
  it('überlebt einen Lade- und Speicherzyklus', () => {
    const source = ['---', 'title: Kundendeck', 'theme: musterkunde', '---', '', '# Eins', ''].join(
      '\n',
    );
    const deck = parseDeck(source);
    expect(deck.meta.theme).toBe('musterkunde');
    expect(serializeDeck(deck)).toContain('theme: musterkunde');
  });

  it('bleibt leer, wenn keins genannt ist', () => {
    const deck = parseDeck('# Ohne Frontmatter\n');
    expect(deck.meta.theme).toBeUndefined();
    // Ein Deck ohne Zugehörigkeit soll auch keine vortäuschen.
    expect(serializeDeck(deck)).not.toContain('theme:');
  });

  it('nimmt einen unbekannten Namen mit, statt ihn zu verwerfen', () => {
    // Ein Deck kann aus einer Installation kommen, die dieses Erscheinungsbild
    // kennt. Es beim ersten Speichern zu löschen wäre Datenverlust.
    const deck = parseDeck(
      ['---', 'theme: gibt-es-hier-nicht', '---', '', '# Eins', ''].join('\n'),
    );
    expect(deck.meta.theme).toBe('gibt-es-hier-nicht');
    expect(serializeDeck(deck)).toContain('theme: gibt-es-hier-nicht');
  });
});

describe('das Folienformat im Frontmatter', () => {
  it('überlebt einen Lade- und Speicherzyklus', () => {
    const source = ['---', 'title: Handzettel', 'format: a4-hoch', '---', '', '# Eins', ''].join(
      '\n',
    );
    const deck = parseDeck(source);
    expect(deck.meta.format).toBe('a4-hoch');
    expect(serializeDeck(deck)).toContain('format: a4-hoch');
  });

  it('bleibt leer, wenn keins genannt ist', () => {
    // Jedes bestehende Deck ist 16:9 und soll nach dem Speichern keinen
    // Schlüssel tragen, den niemand geschrieben hat.
    const deck = parseDeck('# Ohne Frontmatter\n');
    expect(deck.meta.format).toBeUndefined();
    expect(serializeDeck(deck)).not.toContain('format:');
  });

  it('nimmt einen unbekannten Wert mit, statt ihn zu verwerfen', () => {
    /*
       Dieselbe Linie wie beim Erscheinungsbild darüber, und aus demselben
       Grund: das Deck kann aus einer neueren Fassung dieses Werkzeugs kommen.
       Ihn beim ersten Speichern durch die Vorgabe zu ersetzen wäre
       Datenverlust — und einer, den niemand bemerkt, weil `16-9` gültig
       aussieht.
    */
    const deck = parseDeck(['---', 'format: a3-quer', '---', '', '# Eins', ''].join('\n'));
    expect(deck.meta.format).toBe('a3-quer');
    expect(serializeDeck(deck)).toContain('format: a3-quer');
    // Und er landet nicht zusätzlich unter den unbekannten Schlüsseln — sonst
    // stünde er nach dem Speichern zweimal in der Datei.
    expect(deck.meta.extra?.format).toBeUndefined();
    expect(serializeDeck(deck).match(/format:/g)).toHaveLength(1);
  });
});

describe('ein `nzl`-Block, der sich nicht lesen lässt', () => {
  /*
     Ein Doppelpunkt zu viel — hier im Text einer Karte, und das ist die
     wahrscheinlichste Stelle, weil dort deutsche Sätze stehen. YAML liest
     `text: Achtung: hier` als Zuordnung in einer Zuordnung und bricht ab.
  */
  const KAPUTT = [
    '<!-- nzl',
    'layout: canvas',
    'elements:',
    '  - id: card-1',
    '    kind: card',
    '    x: 80',
    '    y: 80',
    '    w: 400',
    '    h: 200',
    '    text: Achtung: hier steht ein Doppelpunkt zu viel',
    '-->',
    '',
    '# Eine Folie',
    '',
  ].join('\n');

  it('nimmt den Rohtext mit, statt ihn zu verwerfen', () => {
    const deck = parseDeck(KAPUTT);
    expect(deck.slides[0].meta.unreadable).toContain('text: Achtung: hier steht');
  });

  it('schreibt ihn beim Sichern wortgleich zurück', () => {
    /*
       Das ist die Prüfung, um die es geht. Vorher fiel der Block beim Parsen
       durch — Layout auf Vorgabe, keine Elemente — und wurde beim Sichern
       nicht wieder gebaut. Wer eine solche Datei öffnete und speicherte,
       verlor seine Folie, ohne dass irgendwo etwas rot geworden wäre.
    */
    const gesichert = serializeDeck(parseDeck(KAPUTT));
    expect(gesichert).toContain('text: Achtung: hier steht ein Doppelpunkt zu viel');
    expect(gesichert).toContain('- id: card-1');
  });

  it('bleibt über beliebig viele Runden derselbe Text', () => {
    // Ein Deck, das bei jedem Sichern anders aussieht, macht jede Versionierung
    // unbrauchbar — und dieser Weg baut den Block nicht, er reicht ihn durch.
    const einmal = serializeDeck(parseDeck(KAPUTT));
    const zweimal = serializeDeck(parseDeck(einmal));
    expect(zweimal).toBe(einmal);
  });

  it('lässt einen lesbaren Block unberührt', () => {
    // Das Gegenstück: der Vermerk darf nicht an jeder Folie kleben, sonst
    // würde nie wieder ein Block aus dem Modell gebaut.
    const deck = parseDeck(['<!-- nzl', 'layout: canvas', '-->', '', '# Eins', ''].join('\n'));
    expect(deck.slides[0].meta.unreadable).toBeUndefined();
    expect(deck.slides[0].meta.layout).toBe('canvas');
  });

  it('hält einen leeren Block nicht für kaputt', () => {
    // `<!-- nzl -->` sagt dasselbe wie gar kein Block. Eine Warnung dafür wäre
    // ein Fehlalarm, und Fehlalarme bringen echte Warnungen um ihre Wirkung.
    const deck = parseDeck(['<!-- nzl', '-->', '', '# Eins', ''].join('\n'));
    expect(deck.slides[0].meta.unreadable).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('was eine Datei mitbringen kann', () => {
  it('macht doppelte Kennungen eindeutig', () => {
    /*
       Einen Element-Block im `nzl`-Abschnitt kopieren ist der naheliegendste
       Weg, eine zweite Karte anzulegen — und danach stand dieselbe `id`
       zweimal. `updateElements()` filtert über ein `Set` der Kennungen: ein
       Ziehen der linken Karte bewegte auch die rechte, bei einer Auswahl, die
       nur einen Eintrag zeigte.
    */
    const slide = parseSlide(
      [
        '<!-- nzl',
        'elements:',
        '  - kind: card',
        '    id: doppelt',
        '  - kind: card',
        '    id: doppelt',
        '-->',
        '',
        '# Probe',
      ].join('\n'),
    );
    expect(slide.elements).toHaveLength(2);
    expect(new Set(slide.elements.map((element) => element.id)).size).toBe(2);
    // Und die erste behält ihre — nur die Wiederholung bekommt eine neue.
    expect(slide.elements[0].id).toBe('doppelt');
  });

  it('behält den Block einer Elementart, die es hier nicht gibt', () => {
    /*
       Der teuerste Fehler dieser Datei, in klein: `oneOf(raw.kind, …, 'shape')`
       machte aus `kind: heading` ein Rechteck, der `switch` ließ alles Übrige
       fallen, und **Öffnen und Sichern genügte**, um den Inhalt endgültig zu
       verlieren. Dieselbe Linie wie beim unlesbaren `nzl`-Block und beim
       unbekannten `theme:`: den Wert behalten, die Lücke zeigen.

       Geprüft wird an der **gesicherten Datei** und nicht am Modell — das
       Modell weiß von dem Block ohnehin nichts, und trotzdem wäre nichts
       verloren, wenn er beim Schreiben wieder dastünde.
    */
    const quelle = [
      '<!-- nzl',
      'elements:',
      '  - kind: heading',
      '    text: Ein Satz, den diese Fassung nicht kennt',
      '    x: 40',
      '    y: 40',
      '-->',
      '',
      '# Probe',
    ].join('\n');

    const deck = parseDeck(quelle);
    const zurueck = serializeDeck(deck);
    expect(zurueck).toContain('kind: heading');
    expect(zurueck).toContain('Ein Satz, den diese Fassung nicht kennt');

    // Und er verfällt, sobald jemand das Element ändert — sonst stünde beim
    // nächsten Öffnen der alte Block da und die Änderung nirgends.
    const geaendert = {
      ...deck,
      slides: deck.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((element) => {
          const { unknownRaw: _weg, ...rest } = element;
          return { ...rest, x: 99 } as typeof element;
        }),
      })),
    };
    expect(serializeDeck(geaendert)).not.toContain('kind: heading');
  });
});

describe('was ein Rundlauf durch die Datei überstehen muss', () => {
  it('teilt eine Folie nicht, weil ein Querstrich im Fließtext steht', () => {
    /*
       `---` nach einer Leerzeile ist in Markdown ein Trennstrich — und in
       diesem Dateiformat der Folientrenner. Geschrieben wurde der Fließtext
       wortgleich hinaus, und aus einer Folie wurden beim Sichern zwei. Der Weg
       dorthin ist der Regelfall: `serializeDeck → parseDeck` läuft bei jeder
       Selbstsicherung und bei jedem Wort, das der Vortragskanal hinüberschickt
       — im Vortrag sah der Referent danach eine andere Folie als das Publikum.
    */
    const basis = parseDeck('# A\n\nPlatzhalter\n\n---\n\n# B\n');
    const deck = {
      ...basis,
      slides: basis.slides.map((slide, index) =>
        index === 0 ? { ...slide, markdown: '# A\n\nOben.\n\n---\n\nUnten.' } : slide,
      ),
    };
    const wieder = parseDeck(serializeDeck(deck));
    expect(wieder.slides).toHaveLength(2);
    expect(wieder.slides[0].markdown).toContain('Oben.');
    expect(wieder.slides[0].markdown).toContain('Unten.');
    // Geschrieben wird derselbe Trennstrich in der Schreibweise, die der
    // Trenner-Ausdruck nicht sieht.
    expect(serializeDeck(deck)).toContain('- - -');
  });

  it('verliert die erste Folie nicht, wenn ihr Text mit einem Querstrich beginnt', () => {
    // `splitFrontmatter()` nimmt jede Datei, die mit `---` beginnt, als
    // Frontmatter — ein Deck ohne Frontmatter verlor damit seine erste Folie
    // ganz. Dasselbe Schreiben deckt beides ab.
    const basis = parseDeck('# Eins\n\nInhalt.\n\n---\n\n# Zwei\n');
    const deck = {
      ...basis,
      slides: basis.slides.map((slide, index) =>
        index === 0 ? { ...slide, markdown: '---\n\n# Eins' } : slide,
      ),
    };
    const wieder = parseDeck(serializeDeck(deck));
    expect(wieder.slides).toHaveLength(2);
    expect(wieder.slides[0].markdown).toContain('# Eins');
  });

  it('lässt einen nzl-Block im Codeblock im Text stehen', () => {
    /*
       `splitSlides()` zählt Codezäune mit, `parseSlide()` tat es nicht: es
       suchte den Block über den ganzen Brocken und schnitt den Treffer heraus.
       Eine Folie, die das Dateiformat *zeigt* — also das Willkommens-Deck —
       verlor beim Öffnen den halben Codeblock, und die Beispielwerte wurden zu
       den echten Metadaten der Folie.
    */
    const quelle = [
      '# So sieht das Dateiformat aus',
      '',
      '```markdown',
      '<!-- nzl',
      'layout: title',
      'background: ink',
      '-->',
      '```',
      '',
      'Ende.',
    ].join('\n');
    const slide = parseDeck(quelle).slides[0];
    expect(slide.markdown).toContain('<!-- nzl');
    expect(slide.markdown).toContain('Ende.');
    expect(slide.meta.layout).toBe('default');
    expect(slide.meta.background).toBe('paper');
  });

  it('nimmt einem Wert nicht sein letztes Leerzeichen', () => {
    /*
       `buildSlideMetaBlock()` räumte den YAML-Rumpf mit `.trimEnd()` auf — und
       nahm damit ein Leerzeichen mit, das zum **Wert** gehört. js-yaml
       schreibt einen langen Text als gefalteten Blockskalar (`text: >-`), und
       dessen letzte Zeile endet dann mit dem Leerzeichen, mit dem der Wert
       endet. Gemessen an einer Notiz aus vier Sätzen: 308 Zeichen hinein, 307
       zurück — ein Zeichen, bei jedem Sichern, ohne ein Wort.

       Der Schreiber ist nicht schuld: `dumpYaml → load` ist für denselben Text
       verlustfrei. Es war das Aufräumen danach.
    */
    const lang = 'Ein Satz mit Wörtern und Leerzeichen darin. '.repeat(4);
    for (const notiz of ['Kurz ', lang]) {
      const basis = parseDeck('# A');
      const deck = {
        ...basis,
        slides: basis.slides.map((slide) => ({
          ...slide,
          meta: { ...slide.meta, notes: notiz },
        })),
      };
      expect(parseDeck(serializeDeck(deck)).slides[0].meta.notes, JSON.stringify(notiz)).toBe(
        notiz,
      );
    }
  });

  it('behält die Einrückung eines Codeblocks in der ersten Zeile', () => {
    // `parseSlide()` nimmt vorn nur `\n+` weg, `serializeSlide()` nahm mit
    // `trim()` auch die Leerzeichen: aus einem eingerückten Codeblock wurde
    // ein Absatz mit einer eingerückten Zeile darunter.
    const deck = parseDeck('    npm run build\n    npm run test\n\nDanach.\n');
    const wieder = parseDeck(serializeDeck(deck));
    expect(wieder.slides[0].markdown.startsWith('    npm run build')).toBe(true);
  });
});

describe('was das Modell aus einem halben Block macht', () => {
  const mit = (zeilen: string[]) =>
    parseDeck(['<!-- nzl', 'elements:', ...zeilen, '-->', '', '# Probe'].join('\n'));

  it('behält einen Block, dem `kind` ganz fehlt', () => {
    /*
       Der Rohblock-Schutz hing an `typeof raw.kind === 'string'`. `kind:
       heading` wurde damit richtig behalten — ein Block *ohne* `kind`, mit
       `kind:` ohne Wert (in YAML ein `null`) oder mit `kind: 42` fiel durch:
       `oneOf` machte ein Rechteck daraus, alles Übrige fiel weg, und beim
       nächsten Sichern stand nur noch `kind: shape` in der Datei. Ein halb
       bearbeiteter, kopierter Element-Block ist genau der Fall, für den der
       Rohblock gebaut wurde.
    */
    for (const kopf of ['  - id: t-1', '  - kind:', '  - kind: 42']) {
      const deck = mit([kopf, '    text: Ein wichtiger Satz', '    typeStyle: h1']);
      const zurueck = serializeDeck(deck);
      expect(zurueck, kopf).toContain('Ein wichtiger Satz');
      expect(zurueck, kopf).toContain('typeStyle: h1');
    }

    // Die Gegenrichtung: eine bekannte Art bekommt keinen Rohblock, sonst
    // stünde jede Änderung daran in keiner Datei.
    const gut = mit(['  - kind: text', '    text: Ein Satz']);
    expect(gut.slides[0].elements[0].unknownRaw).toBeUndefined();
  });

  it('liest ein Label, das in YAML eine Zahl ist', () => {
    // `label: 2` ist in YAML eine Zahl, und `typeof … === 'string'` damit
    // falsch: jede so geschriebene Schritt-Karte wurde zur „1", und beim
    // Sichern war die Ziffer ganz weg. `title`, `body` und `data` daneben
    // gehen längst über den nachsichtigen Leser.
    const deck = mit([
      '  - kind: card',
      '    variant: step',
      '    label: 2',
      '    title: Zweitens',
    ]);
    const karte = deck.slides[0].elements[0];
    expect(karte.kind === 'card' && karte.label).toBe('2');
    expect(serializeDeck(deck)).toContain('label: "2"');
  });
});

/* -------------------------------------------------------------------------- */
/* Das Netz: was jede Datei aushalten muss                                     */
/* -------------------------------------------------------------------------- */

/**
 * Drei Reihen, die es vorher nicht gab.
 *
 * Die Prüfungen darüber sind Einzelfälle, jeder aus einem Fehler entstanden.
 * Was fehlte, war die Fläche: dass **jede** Datei einen Rundlauf übersteht,
 * dass **jeder** Wert **jedes** Feldes zurückkommt, und dass eine von Hand oder
 * von einem Sprachmodell geschriebene Datei nichts durcheinanderbringt. Der
 * Rundlauf ist dabei kein Randfall — `serializeDeck → parseDeck` läuft bei
 * jeder Selbstsicherung und bei jedem Wort, das der Vortragskanal
 * hinüberschickt.
 */
describe('das Netz unter dem Dateiformat', () => {
  const FEINDSELIG: Array<[string, string]> = [
    ['leer', ''],
    ['Querstrich im Text', '# A\n\nDavor\n\n---\n\nDanach'],
    ['Querstrich zuerst', '---\n\n# A'],
    ['vier Striche', '# A\n\nDavor\n\n----\n\nDanach'],
    ['leere Folie dazwischen', '# A\n\n---\n\n---\n\n# B'],
    ['Codeblock mit nzl', '# A\n\n```\n<!-- nzl\nlayout: title\n-->\n```\n'],
    ['Codeblock mit Trenner', '# A\n\n```\n---\n```\n'],
    ['eingerückter Codeblock', '    const a = 1;\n\n# Titel'],
    ['Setext-Überschrift', 'Titel\n---\n\nText'],
    ['Kommentar im Text', '# A\n\n<!-- ein Hinweis -->\n\nText'],
    ['Pfeil im Text', '# A\n\nEin Pfeil --> hier'],
    ['kaputter nzl-Block', '<!-- nzl\nlayout: title: doppelt\n-->\n\n# A'],
    ['leerer nzl-Block', '<!-- nzl -->\n\n# A'],
    ['unbekanntes Layout', '<!-- nzl\nlayout: gibtsnicht\n-->\n\n# A'],
    ['Frontmatter mit Extra', '---\ntitle: T\nfremd: wert\n---\n\n# A'],
    ['Frontmatter ohne Ende', '---\ntitle: T\n\n# A'],
    ['Frontmatter ist eine Liste', '---\n- eins\n- zwei\n---\n\n# A'],
    ['Format unbekannt', '---\ntitle: T\nformat: a3-quer\n---\n\n# A'],
    ['offener Kommentar', '# A\n\n<!-- unfertig\n\n---\n\n# B'],
    ['offener Codezaun', '# A\n\n```\ncode\n\n---\n\n# B'],
    ['Tilde-Zaun', '# A\n\n~~~\n---\n~~~\n\n---\n\n# B'],
    ['Windows-Zeilenenden', '# A\r\n\r\n---\r\n\r\n# B'],
    [
      'doppelte Element-Id',
      '<!-- nzl\nelements:\n  - id: x\n    kind: badge\n    x: 10\n    y: 10\n  - id: x\n    kind: badge\n    x: 20\n    y: 20\n-->\n\n# A',
    ],
  ];

  it('jede Datei kommt beim zweiten Sichern gleich wieder heraus', () => {
    const quellen: Array<[string, string]> = [
      ...bundledDecks.map((eintrag) => [eintrag.file, eintrag.source] as [string, string]),
      ...FEINDSELIG,
    ];
    for (const [was, quelle] of quellen) {
      const erst = parseDeck(quelle);
      const einmal = serializeDeck(erst);
      const zweit = parseDeck(einmal);
      expect(serializeDeck(zweit), `${was}: die Datei wandert`).toBe(einmal);
      expect(zweit.slides.length, `${was}: Zahl der Folien`).toBe(erst.slides.length);
      expect(stable(zweit), `${was}: das Modell`).toEqual(stable(erst));
    }
  });

  it('jeder Wert jedes Feldes überlebt die Datei — für jede Elementart', () => {
    /*
       Die Asymmetrie, um die es geht: `minimizeElement()` lässt weg, was der
       Vorgabe entspricht, und `normalizeElement()` setzt die Vorgabe wieder
       ein. Gehen die beiden Vorgaben auseinander, wird ein Wert stumm zu einem
       anderen — und man sieht es erst an der Folie, die anders aussieht als
       vor dem Sichern.
    */
    const FELDER: Array<[string, readonly unknown[]]> = [
      ['tone', toneNames],
      ['fill', fillStyles],
      ['strokeWeight', strokeNames],
      ['shadow', shadowNames],
      ['typeStyle', Object.keys(typeScale)],
      ['align', ['left', 'center', 'right']],
      ['valign', ['top', 'middle', 'bottom']],
      ['icon', ['rocket', 'shield']],
      ['frame', iconFrames],
      ['shape', shapeNames],
      ['connector', connectorKinds],
      ['chart', chartKinds],
      ['fit', ['cover', 'contain']],
      ['dashed', [true, false]],
      ['header', [true, false]],
      ['locked', [true, false]],
      ['rotation', [0, 15, -15, 359.5]],
      ['opacity', [0, 0.35, 1]],
      ['padding', [0, 12, 64]],
      ['reveal', revealAnimations.map((animation) => ({ step: 1, animation }))],
      ['group', ['g1']],
      ['name', ['Mein Name']],
    ];

    for (const kind of elementKinds) {
      const basis = createElement(kind, { x: 40, y: 50, w: 300, h: 200 });
      // Die Varianten gehören der Art und nicht der Liste: eine Kartenvariante
      // an einer Wortmarke wird zu Recht auf deren Vorgabe gebracht.
      const eigene: Array<[string, readonly unknown[]]> =
        kind === 'card'
          ? [['variant', cardVariants]]
          : kind === 'wordmark'
            ? [['variant', wordmarkVariants]]
            : [];
      for (const [feld, werte] of [...FELDER, ...eigene]) {
        if (!(feld in basis)) continue;
        for (const wert of werte) {
          const zurueck = rundlauf({ ...basis, [feld]: wert } as CanvasElement) as unknown as
            Record<string, unknown> | undefined;
          expect(zurueck?.[feld], `${kind}.${feld} = ${JSON.stringify(wert)}`).toEqual(wert);
        }
      }
    }
  });

  it('behält jedes Maß, auch ein krummes und ein negatives', () => {
    for (const kind of elementKinds) {
      for (const [x, y, w, h] of [
        [0, 0, 1, 1],
        [-100, -100, 40, 40],
        [1279.5, 719.25, 12.75, 8.5],
        [1000, 600, 4000, 3000],
      ]) {
        const el = createElement(kind, { x, y, w, h });
        const zurueck = rundlauf(el);
        expect(
          [zurueck?.x, zurueck?.y, zurueck?.w, zurueck?.h],
          `${kind} bei ${x}/${y}/${w}/${h}`,
        ).toEqual([x, y, w, h]);
      }
    }
  });

  it('kommt mit einer von Hand geschriebenen Datei zurecht', () => {
    /*
       Der realistische Fall ist kein Angriff, sondern der Deck-Prompt: ein
       Sprachmodell schreibt eine `.md`, und darin steht dann eine Zahl als
       Wort, ein `kind`, das es nicht gibt, oder ein Element, das gar kein
       Objekt ist. Nichts davon darf werfen, eine unendliche Zahl ergeben oder
       die Datei beim nächsten Sichern wandern lassen.
    */
    const FAELLE: Array<[string, string[]]> = [
      ['Maße als Text', ['  - kind: badge', '    x: "zehn"', '    y: "zwanzig"', '    w: "breit"']],
      [
        'Maße negativ',
        ['  - kind: card', '    x: -500', '    y: -500', '    w: -50', '    h: -50'],
      ],
      ['Maße riesig', ['  - kind: card', '    x: 1e9', '    y: 1e9', '    w: 1e9', '    h: 1e9']],
      ['Deckkraft daneben', ['  - kind: badge', '    x: 10', '    y: 10', '    opacity: 5']],
      [
        'Einblendschritt negativ',
        [
          '  - kind: badge',
          '    x: 10',
          '    y: 10',
          '    reveal:',
          '      step: -3',
          '      animation: rise',
        ],
      ],
      ['kind fehlt', ['  - x: 10', '    y: 10', '    text: Hallo']],
      ['kind unbekannt', ['  - kind: heading', '    x: 10', '    y: 10', '    text: Hallo']],
      ['Element ist null', ['  - null', '  - kind: badge', '    x: 1', '    y: 1']],
      ['Element ist Text', ['  - "nur ein Wort"']],
      ['Textfeld ist Zahl', ['  - kind: text', '    x: 10', '    y: 10', '    text: 42']],
      [
        'Textfeld ist Liste',
        ['  - kind: text', '    x: 10', '    y: 10', '    text:', '      - a'],
      ],
      ['z ist Text', ['  - kind: badge', '    x: 10', '    y: 10', '    z: "oben"']],
      ['elements ist kein Array', ['  nichts: hier']],
    ];

    for (const [was, zeilen] of FAELLE) {
      const quelle = ['<!-- nzl', 'layout: canvas', 'elements:', ...zeilen, '-->', '', '# A'].join(
        '\n',
      );
      const deck = parseDeck(quelle);
      for (const element of deck.slides[0].elements) {
        for (const [feld, wert] of Object.entries(element)) {
          if (typeof wert === 'number')
            expect(Number.isFinite(wert), `${was}: ${element.kind}.${feld}`).toBe(true);
        }
      }
      const einmal = serializeDeck(deck);
      expect(serializeDeck(parseDeck(einmal)), `${was}: die Datei wandert`).toBe(einmal);
    }
  });

  /** Ein Element einmal durch die Datei und zurück. */
  function rundlauf(element: CanvasElement): CanvasElement | undefined {
    const basis = parseDeck('<!-- nzl\nlayout: canvas\n-->\n');
    const deck: Deck = {
      ...basis,
      slides: basis.slides.map((slide) => ({ ...slide, elements: [element] })),
    };
    return parseDeck(serializeDeck(deck)).slides[0].elements[0];
  }
});
