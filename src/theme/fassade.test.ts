/**
 * Die Fassade — was sie herausreicht, muss der Marke folgen.
 *
 * `src/theme/index.ts` hatte keine eigene Prüfdatei. Der Grund, warum sie eine
 * braucht, steht im Kopf von `runtime.ts`: die Werte sind lebendige Bindungen,
 * und jede Stelle, die einen davon beim Laden abgreift, friert das
 * Erscheinungsbild ein, das beim Start zufällig galt. Vor Augen steht dieser
 * Unterschied nie — man sieht ihn nur im Vergleich zweier Marken.
 */
import { describe, expect, it } from 'vitest';
import * as fassade from './index';
import { cssVariables, familyName, shadowSize } from './index';
import { withTheme } from './runtime';
import { nozillaTheme } from './brandTheme';
import { musterkunde } from '@/themes/musterkunde';

describe('die Fassade unter einer fremden Marke', () => {
  it('reicht keinen eingefrorenen Sammel-Export heraus', () => {
    /*
       Hier stand `theme` — der Sammel-Export von `theme.config.ts`, unter
       denselben Namen wie die lebendigen Bindungen, nur eingefroren auf
       nozilla. Gemessen unter dem Musterkunden im selben Lauf:
       `palette.signal` war #FF5A1F und `theme.palette.signal` #00FF9C,
       `typeScale.h1.size` 61 gegen 68.

       Geprüft wird am *Namen*: dass er nicht mehr da ist, ist die ganze
       Zusage. Wer nozillas Werte als Wert braucht, nimmt `nozillaTheme`.
    */
    expect('theme' in fassade).toBe(false);
    expect(fassade.nozillaTheme.palette.signal).toBe(nozillaTheme.palette.signal);
  });

  it('lässt jede Farbvariable die Marke mitnehmen', () => {
    const nozilla = cssVariables();
    const fremd = withTheme(musterkunde, () => cssVariables());
    const farben = Object.keys(nozilla).filter((name) => name.startsWith('--nz-color-'));
    expect(farben.length).toBeGreaterThan(20);
    // Nicht jede Rolle muss sich unterscheiden, aber die tragenden schon.
    expect(fremd['--nz-color-signal']).toBe(musterkunde.palette.signal);
    expect(fremd['--nz-color-ink']).toBe(musterkunde.palette.ink);
    expect(fremd['--nz-color-signal']).not.toBe(nozilla['--nz-color-signal']);
  });

  it('rechnet die Schattenvariablen aus der Laufzeit statt sie durchzureichen', () => {
    /*
       Hier stand `Object.entries(shadow)` — eine Tabelle, die
       `theme.config.ts` beim Laden aus nozillas Tinte und Signal
       zusammensetzt. Gemessen unter dem Musterkunden, dessen Tinte #1A1614
       ist: `--nz-shadow-sm` blieb „3px 3px 0 0 #000000". Die Farbvariablen
       daneben wechselten mit, diese fünf nicht.
    */
    const fremd = withTheme(musterkunde, () => cssVariables());
    expect(fremd['--nz-shadow-sm']).toContain(musterkunde.palette.ink);
    expect(fremd['--nz-shadow-sm']).not.toContain(nozillaTheme.palette.ink);
    expect(fremd['--nz-shadow-signal']).toContain(musterkunde.palette.signal);
    expect(fremd['--nz-shadow-focus']).toContain(musterkunde.palette.signalStrong);
    // Und der Versatz kommt weiterhin aus der Leiter der Marke.
    expect(fremd['--nz-shadow-md']).toBe(
      `${musterkunde.shadowOffset.md}px ${musterkunde.shadowOffset.md}px 0 0 ${musterkunde.palette.ink}`,
    );
    expect(fremd['--nz-shadow-none']).toBe('none');
  });

  it('lässt die Werkzeug-Variablen ausdrücklich stehen', () => {
    /*
       Die Gegenrichtung, und sie ist hier die eigentliche: die Oberfläche
       wechselt mit Absicht *nicht* mit. Ein cremefarbener Editor um eine
       cremefarbene Folie macht beides unlesbar, und ein markenbunter erst
       recht — das steht im Kopf von `theme.config.ts`.
    */
    const nozilla = cssVariables();
    const fremd = withTheme(musterkunde, () => cssVariables());
    for (const name of Object.keys(nozilla).filter((key) => key.startsWith('--nz-ui-'))) {
      expect(fremd[name], name).toBe(nozilla[name]);
    }
  });

  it('gibt zu jedem Token eine Variable und keine leere', () => {
    const vars = cssVariables();
    expect(Object.keys(vars).length).toBeGreaterThan(60);
    for (const [name, wert] of Object.entries(vars)) {
      expect(name.startsWith('--nz-'), name).toBe(true);
      expect(wert, name).not.toBe('');
      expect(String(wert), name).not.toContain('undefined');
      expect(String(wert), name).not.toContain('NaN');
    }
  });
});

describe('die Helfer der Fassade', () => {
  it('entkleidet den ersten Namen eines Schriftstapels', () => {
    expect(familyName('display')).toBe('Zilla Slab');
    expect(withTheme(musterkunde, () => familyName('display'))).toBe(
      musterkunde.fontFamily.display
        .split(',')[0]
        .trim()
        .replace(/^['"]|['"]$/g, ''),
    );
  });

  it('gibt zu jeder Schattenstufe ihren Versatz und zu keiner etwas Krummes', () => {
    expect(shadowSize('none')).toBe(0);
    expect(shadowSize(undefined)).toBe(0);
    for (const name of ['none', 'sm', 'md', 'lg'] as const) {
      expect(Number.isFinite(shadowSize(name)), name).toBe(true);
    }
    expect(withTheme(musterkunde, () => shadowSize('md'))).toBe(musterkunde.shadowOffset.md);
  });
});
