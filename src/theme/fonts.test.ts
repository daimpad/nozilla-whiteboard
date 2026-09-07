/**
 * Die Schriften einer Marke — am Dokument gemessen, nicht an der Absicht.
 *
 * Diese Datei hatte keine eigene Prüfung. Mitgenommen wurde sie über den
 * Rauchtest, und der sieht, *dass* Text richtig gesetzt ist — nicht, was im
 * Kopf des Dokuments steht, wenn die Marke wechselt.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cssZeichenkette, fontFaceRules, installWebfonts } from './fonts';
import { registerTheme, setActiveTheme } from './runtime';
import { nozillaTheme } from './brandTheme';
import type { BrandTheme } from './brandTheme';

const STYLE_ID = 'nz-webfonts';
const kopf = () => document.getElementById(STYLE_ID)?.textContent ?? '';

function marke(id: string, patch: Partial<BrandTheme>): BrandTheme {
  return { ...nozillaTheme, id, label: id, ...patch };
}

beforeEach(() => {
  setActiveTheme('nozilla');
  document.getElementById(STYLE_ID)?.remove();
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
