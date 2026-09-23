/**
 * Die Schriften einer Marke — am Dokument gemessen, nicht an der Absicht.
 *
 * Diese Datei hatte keine eigene Prüfung. Mitgenommen wurde sie über den
 * Rauchtest, und der sieht, *dass* Text richtig gesetzt ist — nicht, was im
 * Kopf des Dokuments steht, wenn die Marke wechselt.
 */
// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { uiFont } from '@theme';
import tailwind from '../../tailwind.config';
import { cssVariables } from './index';
import { cssZeichenkette, fontFaceRules, installWebfonts, werkzeugSchriftRegeln } from './fonts';
import { registerTheme, setActiveTheme } from './runtime';
import { nozillaTheme } from './brandTheme';
import type { BrandTheme } from './brandTheme';

const STYLE_ID = 'nz-webfonts';
const WERKZEUG_ID = 'nz-werkzeug-schrift';
const kopf = () => document.getElementById(STYLE_ID)?.textContent ?? '';
const werkzeugkopf = () => document.getElementById(WERKZEUG_ID)?.textContent ?? '';

function marke(id: string, patch: Partial<BrandTheme>): BrandTheme {
  return { ...nozillaTheme, id, label: id, ...patch };
}

beforeEach(() => {
  setActiveTheme('nozilla');
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(WERKZEUG_ID)?.remove();
});

afterEach(() => setActiveTheme('nozilla'));

describe('cssZeichenkette', () => {
  it('macht aus einem Apostroph keinen Abbruch', () => {
    /*
       Gemessen in Chromium: der Schnitt selbst verliert seinen Namen
       (`font-family: ""`) und wird damit nie geladen — sein Text steht danach
       in der Ersatzschrift, ohne dass jemand einen Fehler sieht. Wie weit es
       darüber hinausreicht, hängt daran, wo das nächste Apostroph steht: bei
       drei Regeln fraß der Fehler die beiden dahinter (1 von 3), bei den neun
       echten Schnitten keine (9 von 9). Verlassen kann man sich nur auf die
       erste Hälfte — und die genügt.
    */
    expect(cssZeichenkette("O'Neill Display")).toBe("O\\'Neill Display");
    expect(cssZeichenkette('Bob\\Sans')).toBe('Bob\\\\Sans');
  });

  it('wirft Steuerzeichen weg, statt sie zu maskieren', () => {
    // Eine rohe Zeile in einer CSS-Zeichenkette ist ein Parse-Fehler und kein
    // Zeichen — sie gehört nicht escapiert, sondern entfernt.
    expect(cssZeichenkette('Zilla\nSlab')).toBe('ZillaSlab');
    expect(cssZeichenkette('Zilla\u000bSlab')).toBe('ZillaSlab');
  });

  it('lässt einen gewöhnlichen Namen in Ruhe', () => {
    // Die Gegenrichtung: ein Escaper, der auch anfasst, was er nicht muss,
    // ändert jeden Schriftnamen des Projekts.
    for (const name of ['Zilla Slab', 'Inter', 'Space Mono', 'Neue Haas Grotesk Display']) {
      expect(cssZeichenkette(name)).toBe(name);
    }
  });
});

describe('fontFaceRules', () => {
  it('setzt Name und Datei so, dass die Zeichenkette hält', () => {
    const regeln = fontFaceRules(
      [{ family: "O'Neill", weight: 700, style: 'normal', file: "O'Neill-Bold.woff2" }],
      '/',
    );
    // Zwischen den Anführungszeichen darf kein unmaskiertes Apostroph stehen.
    for (const stelle of regeln.matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
      expect(stelle[1]).not.toMatch(/(^|[^\\])'/);
    }
    expect(regeln).toContain("font-family: 'O\\'Neill'");
    expect(regeln).toContain("url('/fonts/O\\'Neill-Bold.woff2')");
  });

  it('hängt die Dateien unter den Pfad, unter dem die Seite liegt', () => {
    expect(fontFaceRules(nozillaTheme.webfont.faces.slice(0, 1), '/werkzeug/')).toContain(
      "url('/werkzeug/fonts/",
    );
  });
});

describe('installWebfonts', () => {
  it('legt die Schnitte der gültigen Marke in den Kopf', () => {
    installWebfonts('/');
    expect(kopf()).toContain("font-family: 'Zilla Slab'");
    expect(kopf().match(/@font-face/g) ?? []).toHaveLength(nozillaTheme.webfont.faces.length);
  });

  it('ersetzt die Schnitte der vorigen Marke, statt sie zu ergänzen', () => {
    installWebfonts('/');
    registerTheme(
      marke('fremdschrift', {
        webfont: {
          ...nozillaTheme.webfont,
          faces: [{ family: 'Fremd', weight: 400, style: 'normal', file: 'Fremd.woff2' }],
        },
      }),
    );
    setActiveTheme('fremdschrift');
    installWebfonts('/');
    expect(kopf()).toContain("font-family: 'Fremd'");
    expect(kopf()).not.toContain('Zilla Slab');
  });

  it('räumt sie weg, wenn die neue Marke gar keine hat', () => {
    /*
       Hier stand `if (!webfont.enabled) return;` *vor* jedem Griff ans
       Dokument: gemessen blieben 1484 Zeichen der vorigen Marke im Kopf
       stehen. Wer eine Systemschrift wählt, bekam sie nur dort, wo die Namen
       sich nicht überschneiden — und wo doch, die Datei der fremden Marke.
    */
    installWebfonts('/');
    expect(kopf()).toContain('Zilla Slab');

    registerTheme(
      marke('systemschrift', {
        webfont: { ...nozillaTheme.webfont, enabled: false, faces: [] },
      }),
    );
    setActiveTheme('systemschrift');
    installWebfonts('/');
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });

  it('schreibt nicht noch einmal, wenn sich nichts geändert hat', () => {
    /*
       Der Riegel gegen die Schleife: `loadFaces()` zählt einen Zähler hoch, an
       dem die Fläche hängt, also löst jeder Neuaufbau ein Neuzeichnen aus.
       Gemessen wurden einmal 11.505 Läufe in sechs Sekunden. Geprüft wird am
       Knoten und nicht am Zähler: bleibt *dasselbe* Element stehen, hat
       niemand die Dateien erneut angefordert.
    */
    installWebfonts('/');
    const erst = document.getElementById(STYLE_ID);
    installWebfonts('/');
    expect(document.getElementById(STYLE_ID)).toBe(erst);
  });
});

/**
 * Die Schrift der Oberfläche wechselt mit keiner Marke.
 *
 * Die Leisten zogen den Stapel der gültigen Marke, und die Regeln dazu standen
 * nur für deren Schnitte im Dokument. Gesehen hat es erst ein Bildschirmfoto:
 * nach dem Umstellen auf eine importierte Marke stand der ganze Inspektor in
 * Source Sans 3. Geprüft wird hier an dem, was im Dokument steht und was die
 * Klassen der Leisten rufen — nicht an der Absicht in `uiFont`.
 */
describe('die Schrift der Oberfläche', () => {
  const fremd = () =>
    marke('fremdwerk', {
      webfont: {
        ...nozillaTheme.webfont,
        directory: 'anderswo',
        faces: [{ family: 'Inter', weight: 400, style: 'normal', file: 'Fremd.woff2' }],
      },
      fontFamily: {
        display: "'Inter', serif",
        body: "'Inter', sans-serif",
        mono: "'Inter', monospace",
      },
    });

  it('bleibt im Dokument, wenn die Marke wechselt — auch zu einer ohne Webfonts', () => {
    installWebfonts('/');
    const vorher = werkzeugkopf();
    expect(vorher).not.toBe('');

    registerTheme(fremd());
    setActiveTheme('fremdwerk');
    installWebfonts('/');
    expect(werkzeugkopf()).toBe(vorher);

    registerTheme(
      marke('ohnewerk', { webfont: { ...nozillaTheme.webfont, enabled: false, faces: [] } }),
    );
    setActiveTheme('ohnewerk');
    installWebfonts('/');
    expect(werkzeugkopf()).toBe(vorher);
  });

  it('führt nur die eigenen Namen, und zwar aus nozillas Dateien', () => {
    // Eine Marke, die eine Datei unter dem Namen „Inter" anmeldet, darf die
    // Leisten nicht erreichen: sie heißen anders. Und das Verzeichnis ist
    // nozillas, nicht das der gültigen Marke.
    registerTheme(fremd());
    setActiveTheme('fremdwerk');
    const regeln = werkzeugSchriftRegeln('/');
    const namen = [...regeln.matchAll(/font-family: '([^']+)'/g)].map((t) => t[1]);
    expect(new Set(namen)).toEqual(new Set([uiFont.familie.text, uiFont.familie.mono]));
    expect(regeln).not.toContain('anderswo');
    expect(regeln).not.toContain('Fremd.woff2');

    const dateien = [...regeln.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((t) => t[1]);
    expect(dateien.length).toBeGreaterThanOrEqual(4);
    for (const datei of dateien) {
      expect(`${datei} liegt in public/fonts: ${existsSync(join('public/fonts', datei))}`).toBe(
        `${datei} liegt in public/fonts: true`,
      );
    }
  });

  it('nennt im Stapel keine Familie, deren Regeln eine Marke stellt', () => {
    // Sonst griffe der Browser, solange die eigene Schrift lädt, zu dem, was
    // eine Marke unter diesem Namen angemeldet hat.
    for (const stapel of [uiFont.stapel.text, uiFont.stapel.mono]) {
      for (const rolle of Object.values(nozillaTheme.fontFamily)) {
        const erste = rolle.split(',')[0].trim().replace(/^'|'$/g, '');
        expect(stapel).not.toContain(erste);
      }
    }
  });

  it('ist das, was die Leisten rufen — über Tailwind und über den Körper', () => {
    const familien = tailwind.theme?.fontFamily as Record<string, string[]>;
    expect(familien.sans).toEqual([uiFont.stapel.text]);
    expect(familien.mono).toEqual([uiFont.stapel.mono]);

    // Der Körper erbt an jedes Feld und jeden Knopf ohne eigene Klasse. Er
    // darf keine Marken-Variable ziehen — genau dort stand der Fehler.
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--nz-ui-font-text\)/);
    expect(css).not.toMatch(/--nz-font-/);

    const vorher = cssVariables();
    registerTheme(fremd());
    setActiveTheme('fremdwerk');
    const nachher = cssVariables();
    expect(nachher['--nz-ui-font-text']).toBe(uiFont.stapel.text);
    expect(nachher['--nz-ui-font-text']).toBe(vorher['--nz-ui-font-text']);
    expect(nachher['--nz-ui-font-mono']).toBe(vorher['--nz-ui-font-mono']);
    // Die Gegenrichtung: die Marken-Variable wandert sehr wohl mit, sonst
    // bewiese der Vergleich darüber nur, dass sich gar nichts ändert.
    expect(nachher['--nz-font-body']).not.toBe(vorher['--nz-font-body']);
  });
});
