/**
 * Die Wahl einer Familie aus der Bibliothek — geprüft am Ergebnis.
 *
 * Die Frage ist nicht, ob die Funktion schreibt, was sie schreibt, sondern ob
 * der Export danach eine Datei findet: `resolveFace()` unter dem gebauten
 * Erscheinungsbild, und diese Datei muss unter `public/fonts/` liegen. Genau
 * dort bricht eine von Hand eingetragene Schrift, und zwar still — der Export
 * setzt dann in der Ersatzschrift.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveFace } from '@/lib/export/fontFiles';
import { withTheme } from '@/theme';
import { bibliothek } from '@/assets/schriftbibliothek.generated';
import { schriftbibliothek } from '@/assets/schriftbibliothek';
import { gewaehlteFamilie, waehleFamilie } from './bibliothekswahl';
import { leererEntwurf, schriftRollen, themeAusEntwurf, type CiEntwurf } from './entwurf';
import { pruefe } from './pruefung';
import { promptText } from './prompt';

const WORTMARKE = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">',
  '<path fill="#101010" d="M0 0 L120 0 L120 48 L0 48 Z"/>',
  '<path fill="#E4003A" d="M140 24 L164 24 L164 48 L140 48 Z"/>',
  '</svg>',
].join('');

function entwurf(): CiEntwurf {
  return {
    ...leererEntwurf(),
    id: 'probenhaus',
    label: 'Probenhaus',
    markenname: 'probe',
    produkt: 'probe Whiteboard',
    wortmarke: { svg: WORTMARKE, dateiname: 'w.svg', letters: '#101010', accent: '#E4003A' },
  };
}

const waehle = (
  e: CiEntwurf,
  rolle: (typeof schriftRollen)[number],
  familie: string,
): CiEntwurf => ({
  ...e,
  ...waehleFamilie(e, rolle, familie),
});

/** Die Befunde zur Schrift, ohne die übrigen Schritte. */
const schriftbefunde = (e: CiEntwurf) =>
  pruefe(e).filter((b) => b.feld === 'Schrift' && b.rang !== 'hinweis');

describe('eine Familie aus der Bibliothek wählen', () => {
  it('stellt den Stapel der Rolle und die Geschwister in den anderen um', () => {
    const neu = waehle(entwurf(), 'body', 'DM Sans');
    expect(neu.fontFamily.body.startsWith("'DM Sans'")).toBe(true);
    // Inter stand in der Überschrift als Geschwister — dort steht jetzt DM Sans,
    // und zwar an derselben Stelle.
    expect(neu.fontFamily.display).toBe(
      entwurf().fontFamily.display.replace("'Inter'", "'DM Sans'"),
    );
    expect(neu.fontFamily.mono).toBe(entwurf().fontFamily.mono.replace("'Inter'", "'DM Sans'"));
    for (const rolle of schriftRollen) {
      expect(neu.fontFamily[rolle], rolle).not.toContain('Inter');
    }
  });

  it('bringt die Schnitte mit und nimmt die der abgelösten Familie weg', () => {
    const neu = waehle(entwurf(), 'body', 'DM Sans');
    const familien = new Set(neu.webfontFaces.map((f) => f.family));
    expect(familien.has('Inter')).toBe(false);
    expect(neu.webfontFaces.filter((f) => f.family === 'DM Sans').map((f) => f.weight)).toEqual([
      400, 500, 600, 700,
    ]);
    // Die übrigen Familien bleiben, wie sie waren.
    expect(familien.has('Zilla Slab')).toBe(true);
    expect(familien.has('Space Mono')).toBe(true);
  });

  it('behält die Schnitte einer Familie, die noch eine andere Rolle trägt', () => {
    // Auszeichnung und Fließtext in derselben Schrift; getauscht wird nur die
    // Auszeichnung — der Fließtext braucht seine Dateien weiter.
    const beide = waehle(waehle(entwurf(), 'body', 'Lora'), 'display', 'Lora');
    const danach = waehle(beide, 'display', 'Montserrat');
    expect(danach.webfontFaces.some((f) => f.family === 'Lora')).toBe(true);
    expect(danach.webfontFaces.some((f) => f.family === 'Montserrat')).toBe(true);
  });

  it('nennt eine Familie nicht zweimal im selben Stapel', () => {
    const neu = waehle(entwurf(), 'display', 'Inter');
    const namen = neu.fontFamily.display.split(',').map((t) => t.trim());
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('ändert nichts, wenn die Familie nicht in der Bibliothek steht', () => {
    const vorher = entwurf();
    const neu = waehleFamilie(vorher, 'body', 'Helvetica Neue');
    expect(neu.fontFamily).toBe(vorher.fontFamily);
    expect(neu.webfontFaces).toBe(vorher.webfontFaces);
  });

  it('meldet die gewählte Familie zurück — und nichts bei einer eigenen', () => {
    expect(gewaehlteFamilie(waehle(entwurf(), 'mono', 'JetBrains Mono'), 'mono')).toBe(
      'JetBrains Mono',
    );
    const eigen = {
      ...entwurf(),
      fontFamily: { ...entwurf().fontFamily, body: "'Hausschrift', sans-serif" },
    };
    expect(gewaehlteFamilie(eigen, 'body')).toBe('');
  });
});

describe('für jede Familie der Bibliothek', () => {
  it('findet der Export danach für jede Rolle eine Datei, die wirklich daliegt', () => {
    /*
       Jede Familie einmal in jede Rolle — nicht nur eine Stichprobe: die
       Dateinamen entstehen je Familie aus einem eigenen Stamm, und ein
       Tippfehler in einem davon wäre genau die stille Ersatzschrift.
    */
    for (const familie of bibliothek) {
      let e = entwurf();
      for (const rolle of schriftRollen) e = waehle(e, rolle, familie.familie);
      const theme = themeAusEntwurf(e);
      withTheme(theme, () => {
        for (const rolle of schriftRollen) {
          for (const gewicht of [400, 700]) {
            const face = resolveFace({ family: rolle, weight: gewicht });
            expect(face?.family, `${familie.familie} ${rolle}`).toBe(familie.familie);
            expect(face?.weight, `${familie.familie} ${rolle} ${gewicht}`).toBe(gewicht);
            const ttf = join(
              process.cwd(),
              'public',
              'fonts',
              face!.file.replace(/\.woff2$/, '.ttf'),
            );
            expect(existsSync(ttf), ttf).toBe(true);
          }
        }
      });
    }
  });

  it('bleibt die Prüfliste zur Schrift ohne Fehler und ohne Warnung', () => {
    /*
       Die Gegenrichtung zur Bequemlichkeit: eine Wahl, die die Prüfliste
       anschlagen lässt, wäre ein Knopf, der Arbeit macht. Geprüft wird der
       Fall, den die Auswahl wirklich erzeugt — drei verschiedene Familien, je
       eine je Rolle, und die Geschwister richtig umgestellt.
    */
    const dreier: Array<[string, string, string]> = [
      ['Playfair Display', 'DM Sans', 'JetBrains Mono'],
      ['Roboto Slab', 'Roboto', 'Source Code Pro'],
      ['Source Serif 4', 'Source Sans 3', 'IBM Plex Mono'],
    ];
    for (const [display, body, mono] of dreier) {
      let e = entwurf();
      e = waehle(e, 'display', display);
      e = waehle(e, 'body', body);
      e = waehle(e, 'mono', mono);
      expect(schriftbefunde(e), `${display} / ${body} / ${mono}`).toEqual([]);
    }
  });
});

describe('der Prompt für das Sprachmodell', () => {
  const text = promptText(leererEntwurf());

  it('nennt jede Familie der Bibliothek mit jeder ihrer Dateien', () => {
    // Gerechnet und nicht getippt: ein neuer Lauf der Bibliothek muss hier
    // ankommen, ohne dass jemand den Prompt anfasst.
    for (const familie of schriftbibliothek()) {
      expect(text, familie.familie).toContain(`"${familie.familie}"`);
      for (const schnitt of familie.schnitte) expect(text, schnitt.file).toContain(schnitt.file);
    }
  });

  it('zeigt als Beispiel eine Schnittdatei, die es wirklich gibt', () => {
    /*
       Vorher stand dort `zilla-slab-400.woff2`. Ein Modell schreibt ein
       Beispiel ab, und die Datei gibt es nicht — der Export setzte die
       Überschrift danach in der Ersatzschrift, bei grüner Prüfliste.
    */
    const dateien = [...text.matchAll(/"file": "([^"]+)"/g)].map((treffer) => treffer[1]);
    expect(dateien.length).toBeGreaterThan(0);
    for (const datei of dateien) {
      expect(existsSync(join(process.cwd(), 'public', 'fonts', datei)), datei).toBe(true);
    }
  });
});
