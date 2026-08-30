import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canvas, slideLayouts, toneNames } from '@/theme';
import { cardVariants, shapeNames, slideBackgrounds } from '@/model/types';
import { parseDeck } from '@/lib/markdown/deck';
import { ohneCodezaun } from './zaun';
import {
  buildExampleSection,
  buildPrompt,
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
    const example = buildExampleSection();
    for (const paragraph of example.split(/\n{2,}/)) {
      expect((paragraph.match(/==[^=]+==/g) ?? []).length).toBeLessThanOrEqual(3);
    }
    expect(example).not.toMatch(/seamless|disruptiv|synergie/i);
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
