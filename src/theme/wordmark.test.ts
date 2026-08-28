import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { wordmark as generated } from '@/assets/wordmark.generated';
import { wordmarkFromSvg } from './wordmark';

const logo = readFileSync(join(process.cwd(), 'public', 'brand', 'nozilla-logo.svg'), 'utf8');

describe('die Wortmarke als Geometrie', () => {
  it('liest aus der Quelldatei genau das, was der Erzeuger schreibt', () => {
    // Der Riegel gegen zwei Wahrheiten: `scripts/sync-ci.mjs` erzeugt die
    // nozilla-Wortmarke beim Sync, `wordmarkFromSvg` liest die einer fremden
    // Marke zur Laufzeit. Lesen beide dieselbe Datei verschieden, bekommt die
    // fremde eine andere Behandlung als die eigene.
    const gelesen = wordmarkFromSvg(logo, { letters: '#000000', accent: '#00FF9C' });
    expect(gelesen.viewBox).toEqual(generated.viewBox);
    expect(gelesen.letters).toBe(generated.letters);
    expect(gelesen.period).toBe(generated.period);
  });

  it('kommt ohne Akzent aus', () => {
    // Nicht jede Marke hat einen Punkt am Wortende.
    const ohne = wordmarkFromSvg(logo, { letters: '#000000' });
    expect(ohne.letters).toBe(generated.letters);
    expect(ohne.period).toBe('');
  });

  it('fasst mehrere Pfade derselben Farbe zu einem zusammen', () => {
    // Teilkonturen gehören in *einen* Pfad, sonst füllt jede für sich und aus
    // einem Loch wird eine Scheibe.
    const svg =
      '<svg viewBox="0 0 10 10"><path d="M0 0 L5 0 Z" fill="#111"/>' +
      '<path d="M5 5 L9 5 Z" fill="#111"/></svg>';
    expect(wordmarkFromSvg(svg, { letters: '#111' }).letters).toBe('M0 0 L5 0 Z M5 5 L9 5 Z');
  });

  it('ordnet über die Farbe zu, nicht über die Reihenfolge', () => {
    // Eine Zeichensoftware sortiert Pfade um, wie sie will. Ginge es nach der
    // Reihenfolge, wäre irgendwann der Akzent der Schriftzug.
    const svg =
      '<svg viewBox="0 0 10 10"><path d="M9 9 L10 10 Z" fill="#0F0"/>' +
      '<path d="M0 0 L5 0 Z" fill="#111"/></svg>';
    const mark = wordmarkFromSvg(svg, { letters: '#111', accent: '#0F0' });
    expect(mark.letters).toBe('M0 0 L5 0 Z');
    expect(mark.period).toBe('M9 9 L10 10 Z');
  });

  it('sagt es, wenn die Datei nichts hergibt', () => {
    expect(() =>
      wordmarkFromSvg('<svg><path d="M0 0" fill="#111"/></svg>', { letters: '#111' }),
    ).toThrow(/viewBox/);
    expect(() => wordmarkFromSvg('<svg viewBox="0 0 1 1"/>', { letters: '#111' })).toThrow(
      /kein Pfad/,
    );
  });
});
