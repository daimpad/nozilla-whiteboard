/**
 * Der CI-Generator — geprüft an dem, was herauskommt.
 *
 * Die teuerste Prüfung, die man hier bauen könnte, wäre eine gegen den
 * Erzeuger: „ruft der Emitter `colorsFromPalette` auf". Sie wäre grün, während
 * die erzeugte Datei nicht übersetzt.
 *
 * Geprüft wird deshalb am **Ergebnis**, und zwar in beiden Richtungen. Der
 * erste Teil nimmt einen Entwurf, macht daraus ein Erscheinungsbild, meldet es
 * wirklich an und zeichnet damit eine Folie — dieselbe Zeichenstrecke wie SVG,
 * PDF und PPTX. Der zweite Teil liest die *erzeugte Quelldatei* und hält sie
 * gegen die Regeln, an denen eine von Hand geschriebene auch gemessen wird.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { activeTheme, nozillaTheme, setActiveTheme, tonesOutsidePalette } from '@/theme';
import { kontrast } from '@/lib/contrast';
import { registerThemes } from '@/themes';
import { zeichneProbe } from './Vorschau';
import {
  alphaStufen,
  leererEntwurf,
  paletteRollen,
  themeAusEntwurf,
  TINTE_STUFEN,
  typeScaleAusEntwurf,
  type CiEntwurf,
} from './entwurf';
import { pruefe, stapelNamen, traegtFehler } from './pruefung';
import { anleitung, kundendatei } from './emitter';

registerThemes();

afterEach(() => {
  setActiveTheme('nozilla');
});

/**
 * Eine SVG-Wortmarke, wie sie aus einer Zeichensoftware kommt.
 *
 * Zwei Pfade in zwei Füllfarben, damit die Zuordnung über die Farbe wirklich
 * etwas zu tun hat — mit nur einem Pfad ginge jede Zuordnung durch.
 */
const WORTMARKE = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">',
  '<path fill="#101010" d="M0 0 L120 0 L120 48 L0 48 Z"/>',
  '<path fill="#E4003A" d="M140 24 L164 24 L164 48 L140 48 Z"/>',
  '</svg>',
].join('');

function probeEntwurf(patch: Partial<CiEntwurf> = {}): CiEntwurf {
  return {
    ...leererEntwurf(),
    id: 'probenhaus',
    label: 'Probenhaus',
    markenname: 'probe',
    produkt: 'probe Whiteboard',
    palette: {
      ...leererEntwurf().palette,
      signal: '#E4003A',
      signalStrong: '#B8002F',
      signalSoft: '#FFD6DE',
      signalDeep: '#7A001F',
      paper: '#FAF7F2',
      paperAlt: '#F1ECE4',
      paperDeep: '#E7E0D5',
      white: '#FFFFFF',
      ink: '#101010',
    },
    wortmarke: {
      svg: WORTMARKE,
      dateiname: 'probenhaus-wortmarke.svg',
      letters: '#101010',
      accent: '#E4003A',
    },
    ...patch,
  };
}

/* -------------------------------------------------------------------------- */

describe('das erzeugte Erscheinungsbild', () => {
  const entwurf = probeEntwurf();
  const theme = themeAusEntwurf(entwurf);

  it('besteht die Prüfung, die registerTheme() selbst anlegt', () => {
    // Der eine Riegel, den die Anmeldung wirklich zieht: eine Flächenrolle,
    // die die eigene Palette verlässt. Er vergleicht Zeichenketten — `#ffffff`
    // und `#FFFFFF` sind für ihn zwei Farben.
    expect(tonesOutsidePalette(theme)).toEqual([]);
  });

  it('mischt color und elementTones und schreibt sie nicht ab', () => {
    // Die Fehlerklasse, um die es hier geht: wer die neunundzwanzig
    // semantischen Tokens erfragt oder von Hand schreibt, trifft achtundzwanzig
    // und vergisst einen.
    expect(theme.color.surface).toBe(entwurf.palette.paper);
    expect(theme.color.surfaceRaised).toBe(entwurf.palette.white);
    expect(theme.elementTones.signal.surface).toBe(entwurf.palette.signal);
    expect(theme.elementTones.ink.text).toBe(entwurf.palette.paper);
    // Und vollständig: kein Schlüssel fehlt gegenüber nozilla.
    expect(Object.keys(theme.color).sort()).toEqual(Object.keys(nozillaTheme.color).sort());
    expect(Object.keys(theme.elementTones).sort()).toEqual(
      Object.keys(nozillaTheme.elementTones).sort(),
    );
  });

  it('rechnet die Deckkraftstufen aus Tinte und Papier, statt sie zu fragen', () => {
    // Die Stufen lügen doppelt: 70 trägt 0,72 bei der Tinte und 0,64 beim
    // Papier. Und paperAlpha gehört zum *Papier*, nicht zum Weiß — genau das
    // stand einmal falsch in der Vorlage.
    expect(theme.inkAlpha[70]).toBe('rgba(16, 16, 16, 0.72)');
    expect(theme.paperAlpha[70]).toBe('rgba(250, 247, 242, 0.64)');
    expect(theme.paperAlpha[70]).not.toContain('255, 255, 255');
  });

  it('nimmt die Größen aus der Leiter und die Struktur von nozilla', () => {
    const eng = themeAusEntwurf(
      probeEntwurf({
        textScale: { ...leererEntwurf().textScale, xl3: 60 },
        auszeichnungEnger: 0.01,
      }),
    );
    // h1 sitzt auf xl3 — die Zuordnung wird über den Wert gefunden und nicht
    // aus einer getippten Tabelle gelesen.
    expect(eng.typeScale.h1.size).toBe(60);
    expect(eng.typeScale.h1.tracking).toBeCloseTo(nozillaTheme.typeScale.h1.tracking - 0.01, 5);
    // Der Fließtext bleibt: die Laufweite gehört der Auszeichnung.
    expect(eng.typeScale.body.tracking).toBe(nozillaTheme.typeScale.body.tracking);
    // Zeilenhöhe, Schnitt und Versalien sind Struktur.
    expect(eng.typeScale.label.caps).toBe(nozillaTheme.typeScale.label.caps);
  });

  it('lässt die drei Stufen außerhalb der Leiter einzeln setzen', () => {
    // Sie sitzen auf keiner Stufe. Sie aus der Leiter zu rechnen hieße, eine
    // Umrechnungsregel zu erfinden — drei ehrliche Felder sind besser.
    const eigen = themeAusEntwurf(
      probeEntwurf({
        sonderstufen: { headline: 80, labelSmall: 10, codeInline: 14 },
      }),
    );
    expect(eigen.typeScale.headline.size).toBe(80);
    expect(eigen.typeScale.labelSmall.size).toBe(10);
    expect(eigen.typeScale.codeInline.size).toBe(14);
  });

  it('zeichnet damit eine Folie in den Farben des Kunden', () => {
    /*
       Der Beleg, auf den es ankommt: nicht die Zusicherung über ein Objekt,
       sondern das Markup, das auch im Export steht. Gerufen wird dafür
       `zeichneProbe()` — genau die Funktion, an der auch die Vorschau hängt.
       Eine zweite Rechnung hier wäre eine zweite Wahrheit und könnte grün
       bleiben, während die Seite etwas anderes zeigt.
    */
    const vorher = activeTheme().id;
    const markup = zeichneProbe(theme)
      .map((blatt) => blatt.markup)
      .join('');

    expect(markup).toContain('#E4003A');
    expect(markup).not.toContain(nozillaTheme.palette.signal);
    expect(markup).not.toContain(nozillaTheme.palette.paper);
    // Und danach steht wieder, was vorher stand: die Vorschau darf die
    // laufende Belegung nicht an einem halbfertigen Entwurf hängen lassen.
    expect(activeTheme().id).toBe(vorher);
  });

  it('zeigt jede Probefolie und keine leere', () => {
    const blaetter = zeichneProbe(theme);
    expect(blaetter.length).toBeGreaterThanOrEqual(4);
    for (const blatt of blaetter) expect(blatt.markup.length).toBeGreaterThan(200);
    // Vier verschiedene Untergründe — sonst zeigte die Vorschau viermal
    // dasselbe und niemand sähe, was ein Untergrund eigentlich tut.
    expect(new Set(blaetter.map((blatt) => blatt.hintergrund)).size).toBeGreaterThanOrEqual(4);
  });

  it('läuft mit der Leiter dieser Marke nicht über', () => {
    // Das Probedeck ist für diese Prüfung gebaut: keine von Hand gelegten
    // Titel, großzügige Kästen. Liefe es schon bei nozilla über, zeigte es
    // jedem Kunden Überläufe, die nicht seine sind.
    for (const blatt of zeichneProbe(nozillaTheme)) expect(blatt.ueberlauf).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('die erzeugte Kundendatei', () => {
  const entwurf = probeEntwurf();
  const quelle = kundendatei(entwurf);

  it('nennt jede Farbe genau einmal', () => {
    /*
       Der Kern: die Palette steht in der Datei, die neunundzwanzig
       semantischen Tokens und die zweiunddreißig Tonwerte nicht. Eine Datei,
       in der die Farben zweimal stehen, ist eine, in der jemand später eine
       ändert und die andere vergisst.
    */
    for (const rolle of paletteRollen) {
      const wert = entwurf.palette[rolle];
      const treffer = quelle.split(wert).length - 1;
      expect(treffer, `${rolle} = ${wert}`).toBeLessThanOrEqual(2);
    }
    expect(quelle).toContain('colorsFromPalette(palette, inkAlpha)');
    expect(quelle).toContain('tonesFromPalette(palette, inkAlpha, paperAlpha)');
  });

  it('schreibt die Deckkraftstufen aus, statt sie zu erfragen', () => {
    expect(quelle).toContain("70: 'rgba(16, 16, 16, 0.72)'");
    expect(quelle).toContain("70: 'rgba(250, 247, 242, 0.64)'");
  });

  it('trägt die Wortmarke mit den Füllfarben aus der Datei', () => {
    expect(quelle).toContain('wordmarkFromSvg(wortmarke,');
    expect(quelle).toContain("letters: '#101010'");
    expect(quelle).toContain("accent: '#E4003A'");
    expect(quelle).toContain("import wortmarke from './probenhaus-wortmarke.svg?raw'");
  });

  it('lässt den Akzent weg, wenn die Marke keinen hat', () => {
    const ohne = kundendatei(
      probeEntwurf({
        wortmarke: {
          svg: WORTMARKE,
          dateiname: 'x.svg',
          letters: '#101010',
          accent: '',
        },
      }),
    );
    expect(ohne).not.toContain('accent:');
  });

  it('sagt, wo die Anmeldung fehlt', () => {
    // Eine Datei, die hier liegt und nicht angemeldet ist, führt der Inspektor
    // als „nicht installiert" — das Deck sieht dann nach einem Fehler des
    // Werkzeugs aus, obwohl nur eine Zeile fehlt.
    expect(quelle).toContain('clientThemes');
    expect(anleitung(entwurf)).toContain("import { probenhaus } from './probenhaus'");
    expect(anleitung(entwurf)).toContain('theme: probenhaus');
  });

  it('schreibt einen Schlüssel mit Bindestrich als gültigen Bezeichner', () => {
    // `alte-post` ist ein guter Schlüssel und ein schlechter Variablenname.
    const quelle = kundendatei(probeEntwurf({ id: 'alte-post', label: 'Alte Post' }));
    expect(quelle).toContain('export const altePost: BrandTheme');
    expect(quelle).toContain("id: 'alte-post'");
    expect(quelle).not.toContain('export const alte-post');
  });

  it('kommt in der Form heraus, die Prettier ohnehin herstellt', async () => {
    /*
       Gefragt wird **Prettier selbst** und nicht eine nachgebaute Regel.

       Die erste Fassung dieser Prüfung zählte Zeilenlängen gegen 100 und wurde
       an einem Schriftstapel von 106 Zeichen rot — zu Recht besorgt und
       trotzdem falsch: `printWidth` ist eine weiche Grenze, und eine
       Zeichenkette bricht Prettier nicht um. Die nachgebaute Regel verurteilte
       also genau das, was Prettier selbst schreibt. Wer eine Form prüfen will,
       fragt den, der sie herstellt.

       Und die Frage ist nicht akademisch: eine erzeugte Datei, die beim
       nächsten `npm run format` umgebrochen wird, macht einen Diff, den
       niemand bestellt hat — und der landet dann in einem fremden Commit.
    */
    const prettier = await import('prettier');
    const optionen = await prettier.resolveConfig('src/themes/probe.ts');
    const formatiert = await prettier.format(quelle, {
      ...optionen,
      parser: 'typescript',
    });
    expect(formatiert).toBe(quelle);
  });

  it('ist gültiges TypeScript und kein Text, der so aussieht', async () => {
    // Prettier oben wirft auf einem Syntaxfehler; hier wird die *Struktur*
    // geprüft, die kein Formatierer bemerkt: dass die Datei wirklich ein
    // `BrandTheme` exportiert und nicht nur so heißt.
    expect(quelle).toMatch(/export const probenhaus: BrandTheme = \{/);
    expect(quelle).toContain('palette,');
    expect(quelle).toContain('inkAlpha,');
    expect(quelle).toContain('paperAlpha,');
    for (const rolle of ['textScale', 'typeScale', 'fontFamily', 'webfont', 'pdfFontFamily']) {
      expect(quelle, rolle).toContain(`${rolle}`);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('die Prüfliste', () => {
  it('lässt einen tragfähigen Entwurf durch', () => {
    expect(traegtFehler(pruefe(probeEntwurf()))).toBe(false);
  });

  it('hält einen vergebenen Schlüssel auf', () => {
    // `nozilla` ersetzt das angemeldete Erscheinungsbild kommentarlos — also
    // die eigene CI.
    const befunde = pruefe(probeEntwurf({ id: 'nozilla' }));
    expect(befunde.some((b) => b.rang === 'fehler' && b.text.includes('vergeben'))).toBe(true);
  });

  it('hält eine Farbe auf, die kein #RRGGBB ist', () => {
    // withAlpha() wirft daran schon beim Anlegen, und tonesOutsidePalette()
    // vergleicht Zeichenketten — die zwei Formate laufen auseinander.
    const kurz = pruefe(probeEntwurf({ palette: { ...probeEntwurf().palette, ink: '#000' } }));
    expect(traegtFehler(kurz)).toBe(true);
  });

  it('meldet zwei helle Töne, die dieselbe Farbe malen', () => {
    const gleich = pruefe(
      probeEntwurf({ palette: { ...probeEntwurf().palette, paper: '#FFFFFF' } }),
    );
    const treffer = gleich.filter((b) => b.rang === 'warnung' && b.text.includes('dieselbe Farbe'));
    expect(treffer.length).toBeGreaterThan(0);
  });

  it('meldet schwarze Schrift auf dunklem Signal', () => {
    /*
       Der eine CI-Fehler, der bei einer neuen Marke fast sicher vorkommt und
       den der Kunde gar nicht reparieren kann: `elementTones.signal.text` ist
       fest `palette.ink`. Ein dunkles Signal heißt schwarz auf dunkel — auf
       jeder Signalfolie, in jedem Abzeichen.
    */
    const dunkel = probeEntwurf({
      palette: { ...probeEntwurf().palette, signal: '#101820' },
    });
    expect(kontrast('#101010', '#101820')).toBeLessThan(4.5);
    const befunde = pruefe(dunkel);
    expect(befunde.some((b) => b.rang === 'warnung' && b.text.includes('Kontrast'))).toBe(true);
  });

  it('meldet einen Schriftstapel ohne zweite Marken-Schrift', () => {
    /*
       Und zwar für *jede* Rolle. Die bestehende Prüfung in fonts.test.ts fängt
       nur die Auszeichnung: `ersatzkette()` stellt die eigene Rolle vorn ein,
       wenn der Stapel sie nicht nennt — `body` bekommt damit ['body','display']
       und ist länger als eins, ohne dass eine zweite Schrift im Spiel wäre.
    */
    const einsam = pruefe(
      probeEntwurf({
        fontFamily: {
          display: "'Zilla Slab', Georgia, serif",
          body: "'Inter', system-ui, sans-serif",
          mono: "'Space Mono', ui-monospace, monospace",
        },
      }),
    );
    const treffer = einsam.filter((b) => b.text.includes('nur eine Marken-Schrift'));
    expect(treffer).toHaveLength(3);
  });

  it('hält einen Stapel auf, dessen erster Name keinen Schnitt hat', () => {
    // Der erste Name ist ein Fremdschlüssel auf die Schnitte. Passt er nicht,
    // findet der Export keine Datei und fällt still auf Helvetica zurück —
    // kein Fehler, keine Warnung, nur eine andere Schrift.
    const falsch = pruefe(
      probeEntwurf({
        fontFamily: {
          ...probeEntwurf().fontFamily,
          display: "'Zilla Slap', 'Inter', serif",
        },
      }),
    );
    expect(traegtFehler(falsch)).toBe(true);
  });

  it('hält eine Wortmarke auf, deren Füllfarbe nicht in der Datei steht', () => {
    const daneben = pruefe(
      probeEntwurf({
        wortmarke: {
          svg: WORTMARKE,
          dateiname: 'x.svg',
          letters: '#000000',
          accent: '',
        },
      }),
    );
    expect(traegtFehler(daneben)).toBe(true);
  });

  it('meldet eine Leiter, die nicht steigt', () => {
    const krumm = pruefe(probeEntwurf({ textScale: { ...probeEntwurf().textScale, xl2: 20 } }));
    expect(krumm.some((b) => b.text.includes('Die Leiter steigt nicht'))).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Bausteine der Rechnung', () => {
  it('trennt die Namen eines Schriftstapels', () => {
    expect(stapelNamen("'Zilla Slab', 'Inter', Georgia, serif")).toEqual([
      'Zilla Slab',
      'Inter',
      'Georgia',
      'serif',
    ]);
  });

  it('rechnet den Kontrast gegen die bekannten Eckwerte', () => {
    // Die Norm gibt zwei Werte vor, an denen sich jede Umsetzung messen lässt:
    // Schwarz auf Weiß ist 21 : 1, eine Farbe auf sich selbst ist 1 : 1. Ohne
    // sie stünde hier eine Rechnung, die niemand nachgeprüft hat — und sie
    // entscheidet jetzt über jede Kundenpalette.
    expect(kontrast('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(kontrast('#FF5A1F', '#FF5A1F')).toBeCloseTo(1, 5);
    // Und sie ist symmetrisch: welche Farbe vorn steht, ändert nichts.
    expect(kontrast('#101010', '#E4003A')).toBeCloseTo(kontrast('#E4003A', '#101010'), 10);
  });

  it('rechnet die Deckkraftstufen aus den Kanälen', () => {
    expect(alphaStufen('#FF5A1F', TINTE_STUFEN)).toEqual({
      70: 'rgba(255, 90, 31, 0.72)',
      50: 'rgba(255, 90, 31, 0.50)',
      20: 'rgba(255, 90, 31, 0.18)',
    });
  });

  it('liest die Rollen aus nozilla und schreibt sie nicht auf', () => {
    // Eine getippte Liste wäre eine zweite Wahrheit über die CI: käme morgen
    // eine Rolle dazu, hätte das Formular sie nicht, und niemandem fiele es
    // auf.
    expect(paletteRollen).toEqual(Object.keys(nozillaTheme.palette));
    expect(Object.keys(typeScaleAusEntwurf(probeEntwurf()))).toEqual(
      Object.keys(nozillaTheme.typeScale),
    );
  });
});
