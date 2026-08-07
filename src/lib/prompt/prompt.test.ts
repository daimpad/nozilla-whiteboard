import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canvas, slideLayouts, toneNames } from '@/theme';
import { cardVariants, shapeNames, slideBackgrounds } from '@/model/types';
import { parseDeck } from '@/lib/markdown/deck';
import { stripCodeFence } from '@/components/panels/PromptStudio';
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

describe('stripCodeFence', () => {
  it('entfernt einen umschließenden Codeblock', () => {
    expect(stripCodeFence('```markdown\n---\ntitle: X\n---\n```')).toBe('---\ntitle: X\n---');
    expect(stripCodeFence('```\nhallo\n```')).toBe('hallo');
  });

  it('lässt gewöhnlichen Text in Ruhe', () => {
    expect(stripCodeFence('---\ntitle: X\n---')).toBe('---\ntitle: X\n---');
  });

  it('lässt einen Codeblock *innerhalb* des Decks stehen', () => {
    const deck = '---\ntitle: X\n---\n\n```ts\nconst a = 1;\n```';
    expect(stripCodeFence(deck)).toBe(deck);
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
