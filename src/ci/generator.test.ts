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
import {
  activeTheme,
  availableThemes,
  nozillaTheme,
  setActiveTheme,
  tonesOutsidePalette,
} from '@/theme';
import { kanalabstand, kontrast, unterscheidbar } from '@/lib/contrast';
import { registerThemes } from '@/themes';
import { zeichneProbe } from './Vorschau';
import {
  alphaStufen,
  leererEntwurf,
  leererSchnitt,
  paletteRollen,
  schnittstile,
  themeAusEntwurf,
  TINTE_STUFEN,
  typeScaleAusEntwurf,
  type CiEntwurf,
} from './entwurf';
import { pruefe, stapelNamen, traegtFehler, trennbefunde } from './pruefung';
import { anleitung, bezeichner, bezeichnerProblem, designdatei, text } from './emitter';

registerThemes();

/**
 * Die Erscheinungsbilder, die dieses Projekt **mitliefert**.
 *
 * Festgehalten *vor* dem ersten Test — und heute nicht mehr, weil die Vorschau
 * das Verzeichnis anfasst, sondern damit auffällt, wenn sie es wieder tut.
 * Sie hat es einmal getan: `zeichneProbe()` rief `registerTheme(theme)` mit
 * dem Schlüssel, den jemand gerade ins Formular tippt, und `registerTheme()`
 * nimmt nichts wieder heraus. „probenhaus" stand danach im Verzeichnis, und
 * wer „nozilla" eintippte, ersetzte damit die laufende nozilla-CI.
 *
 * Die Liste ist deshalb die Grundlage einer eigenen Zusicherung weiter unten:
 * nach einer Vorschau muss sie dieselbe sein.
 */
const MITGELIEFERT = availableThemes().map(({ id }) => id);

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

  it('zeichnet damit eine Folie in den Farben der neuen Marke', () => {
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
    // jeder fremden Marke Überläufe, die nicht ihre sind.
    for (const blatt of zeichneProbe(nozillaTheme)) expect(blatt.ueberlauf).toEqual([]);
  });

  it('meldet den Entwurf nicht an — und ersetzt damit keine laufende CI', () => {
    /*
       Der teuerste Fehler dieser Seite. `zeichneProbe()` rief einmal
       `registerTheme(theme)`, und der Entwurf trägt den Schlüssel, den jemand
       gerade ins Formular tippt. `registerTheme()` ruft `activate()`, wenn der
       Schlüssel der gerade gültige ist: wer „nozilla" eintippte, **ersetzte
       damit die laufende nozilla-CI**. Nachgemessen: `palette.signal` ging von
       #00FF9C auf #FF0000, und der Eintrag in der Auswahlliste hieß fortan wie
       das Formularfeld. Ein leerer Schlüssel meldete ein Erscheinungsbild unter
       dem Namen „" an.

       Geprüft wird am **Verzeichnis und an der gültigen CI**, nicht daran, ob
       eine Funktion gerufen wurde: `withTheme()` belegt dieselben lebendigen
       Bindungen und muss sie hinterher zurückgeben.
    */
    const gefaehrlich = probeEntwurf({ id: 'nozilla', label: 'Übernommen' });
    zeichneProbe(themeAusEntwurf(gefaehrlich));

    expect(availableThemes().map(({ id }) => id)).toEqual(MITGELIEFERT);
    expect(activeTheme().palette.signal).toBe(nozillaTheme.palette.signal);
    expect(activeTheme().label).toBe(nozillaTheme.label);
  });
});

/* -------------------------------------------------------------------------- */

describe('die Probefolien', () => {
  it('tragen jede ihre eigene Nummer', () => {
    /*
       Die Fußzeile ist der Ort, an dem die Stufe `labelSmall` beurteilt wird,
       und die Vorschau verspricht im Kopf, genau das Markup des SVG-Exports zu
       zeigen. Vorher trug jede der vier Probefolien „1 / 4" — ein festes
       `slideNumber: 1`, das man nur sieht, wenn man weiterblättert und
       hinsieht.
    */
    const blaetter = zeichneProbe(themeAusEntwurf(probeEntwurf()));
    expect(blaetter.length).toBeGreaterThan(1);
    blaetter.forEach((blatt, index) => {
      expect(blatt.markup, `Folie ${index + 1} trägt die falsche Nummer`).toContain(
        `${index + 1} / ${blaetter.length}`,
      );
    });
  });
});

describe('eine Schrift, die kein Stapel nennt', () => {
  it('wird gemeldet — und eine benutzte nicht', () => {
    /*
       Ihre Dateien werden in jeder Sitzung geladen und nie gezeichnet. Die
       Warnung stand, der Test fehlte; und beide Richtungen gehören geprüft,
       sonst wäre eine Regel, die *jede* Familie meldet, genauso grün.
    */
    const entwurf = probeEntwurf();
    const mitFremder: CiEntwurf = {
      ...entwurf,
      webfontFaces: [
        ...entwurf.webfontFaces,
        { family: 'Fremd', weight: 400, style: 'normal', file: 'fremd.woff2', kennung: 'f1' },
      ],
    };
    const texte = (roh: CiEntwurf) =>
      pruefe(roh)
        .filter((befund) => befund.rang === 'warnung')
        .map((befund) => befund.text)
        .join(' | ');

    expect(texte(mitFremder)).toMatch(/„Fremd" hat Schnitte, aber kein Stapel nennt sie/);
    expect(texte(entwurf)).not.toMatch(/kein Stapel nennt sie/);
  });
});

describe('die erzeugte Designdatei', () => {
  const entwurf = probeEntwurf();
  const quelle = designdatei(entwurf);

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
    const ohne = designdatei(
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
    expect(quelle).toContain('brandThemes');
    expect(anleitung(entwurf)).toContain("import { probenhaus } from './probenhaus'");
    expect(anleitung(entwurf)).toContain('theme: probenhaus');
  });

  it('schreibt einen Schlüssel mit Bindestrich als gültigen Bezeichner', () => {
    // `alte-post` ist ein guter Schlüssel und ein schlechter Variablenname.
    const quelle = designdatei(probeEntwurf({ id: 'alte-post', label: 'Alte Post' }));
    expect(quelle).toContain('export const altePost: BrandTheme');
    expect(quelle).toContain("id: 'alte-post'");
    expect(quelle).not.toContain('export const alte-post');
  });

  it('lässt jeden Wert unverändert zurücklaufen', () => {
    /*
       Die Prüfung, die die **stille** Hälfte des Maskierens abdeckt — und die
       gefehlt hat.

       Prettier ist gegen sie blind: `const a = 'C:\fonts\Inter.woff2';` kommt
       aus Prettier unverändert zurück, während der Wert dahinter zur Laufzeit
       `C:<FF>ontsInter.woff2` ist. Die Schrift lädt dann nie, und der Export
       fällt still auf die Ersatzschrift zurück: kein Fehler, keine Warnung,
       nur eine andere Schrift.

       Gemessen wird deshalb am **Wert** und nicht an der Zeichenkette: das
       erzeugte Literal wird ausgewertet und gegen das Original gehalten. Was
       das nicht beweist, ist, dass die ganze Datei übersetzt — dafür stehen
       die Prüfungen darüber.
    */
    const hart = [
      'C:\\fonts\\',
      'C:\\fonts\\Inter.woff2',
      "O'Brien",
      'sagt "hallo"',
      'beide \' und "',
      'zwei\nZeilen',
      'Muster */ Ende',
      'Zilla Slab, Inter, ui-sans-serif',
    ];

    for (const wert of hart) {
      const zurueck = Function(`return ${text(wert)};`)() as string;
      expect(zurueck, `„${wert}" kam anders zurück`).toBe(wert);
    }
  });

  it('faltet einen Umbruch im Kopfkommentar, statt die Spalte zu zerreißen', async () => {
    /*
       Ein Label mit einem Zeilenumbruch riss die ` * `-Spalte auf: ab der
       zweiten Zeile stand der Text am linken Rand, ohne Stern. Prettier fasst
       Blockkommentare nicht an, es gibt also keinen Diff und keinen Wurf — nur
       einen Kopf, der aussieht wie abgeschnittener Code.
    */
    const quelle = designdatei(probeEntwurf({ label: 'Alte\nPost' }));
    const kopf = quelle.slice(0, quelle.indexOf('*/'));
    expect(kopf).toContain('Alte Post');
    for (const zeile of kopf.split('\n').slice(1)) {
      expect(zeile.trimStart().startsWith('*') || !zeile.trim()).toBe(true);
    }

    // Und die Datei bleibt in der Form, die Prettier schreibt.
    const prettier = await import('prettier');
    const optionen = await prettier.resolveConfig('src/themes/probe.ts');
    expect(await prettier.format(quelle, { ...optionen, parser: 'typescript' })).toBe(quelle);
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

  it('bleibt in dieser Form auch bei einem langen Schriftnamen', async () => {
    /*
       Die Prüfung darüber läuft auf dem Entwurf mit nozillas Schnitten, und
       deren Zeilen sind kurz genug. Sie war deshalb grün, während der Fall,
       um den es geht, danebenlag: „Neue Haas Grotesk Display Pro Condensed"
       samt Dateiname ergab eine Zeile von 144 Zeichen, und Prettier bricht die
       beim nächsten `npm run format` in vier auf. Die Datei im Repo ist dann
       eine andere als die, die hier herauskam — und der Diff landet in einem
       fremden Commit.

       Eine Prüfung, deren Eingabe nie an die Grenze geht, prüft die Grenze
       nicht.
    */
    const lang = designdatei(
      probeEntwurf({
        webfontFaces: [
          {
            ...leererSchnitt(),
            family: 'Neue Haas Grotesk Display Pro Condensed',
            weight: 400,
            style: 'normal',
            file: 'NeueHaasGroteskDisplayPro-CondensedRegular.woff2',
          },
        ],
      }),
    );
    const prettier = await import('prettier');
    const optionen = await prettier.resolveConfig('src/themes/probe.ts');
    expect(await prettier.format(lang, { ...optionen, parser: 'typescript' })).toBe(lang);
    // Und der Name steht wirklich drin — sonst prüfte das oben eine Datei
    // ohne den Schnitt, um den es geht.
    expect(lang).toContain('Neue Haas Grotesk Display Pro Condensed');
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

  it('lässt jedes angemeldete Erscheinungsbild in Ruhe', () => {
    /*
       Der Wächter, der gefehlt hat — und der Grund, warum es ihn braucht:
       die erste Fassung maß Unterscheidbarkeit am **Kontrastverhältnis** und
       verurteilte damit die nozilla-CI selbst. `paper` #FFFEE5 gegen `white`
       #FFFFFF kommt auf 1,0214, unter der damaligen Schwelle 1,04. Die beiden
       sind aber zwei Farben, sichtbar zwei auf jeder Folie — WCAG wichtet Blau
       mit 0,0722, und genau dort liegt der Unterschied.

       Der erste Satz, den ein Neuling im leeren Formular las, war also falsch
       — und zwar ausgerechnet der Satz, der für einen echten historischen
       Fehler gebaut wurde. So lernt man in der ersten Minute, den teuersten
       Rang der Liste als Rauschen zu behandeln.

       Kein bestehender Test sah es: `probeEntwurf()` überschreibt `paper`, und
       „lässt einen tragfähigen Entwurf durch" fragt nur nach dem Rang
       „fehler". Diese Prüfung geht deshalb jedes angemeldete Erscheinungsbild
       durch — die eigene CI eingeschlossen.
    */
    const vorher = activeTheme().id;
    expect(MITGELIEFERT).toContain('nozilla');
    for (const id of MITGELIEFERT) {
      setActiveTheme(id);
      expect(trennbefunde(activeTheme().palette), id).toEqual([]);
    }
    setActiveTheme(vorher);
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
       der sich in der erzeugten Datei gar nicht reparieren lässt: `elementTones.signal.text` ist
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

describe('die Schnitte im Formular', () => {
  it('tragen eine Kennung, die nicht aus ihrem Inhalt kommt', () => {
    /*
       Der Fehler, gegen den das steht: die Zeilen trugen als React-Schlüssel
       ihren eigenen Inhalt. Jeder Anschlag im Feld „Familie" änderte damit den
       Schlüssel, React hängte die Zeile aus dem Baum, und der Fokus fiel weg —
       im Browser gemessen: von „ Kunde" kam ein Zeichen an. Wer eine
       eigene Schrift eintragen wollte, kam pro Klick genau ein Zeichen weit.
    */
    const schnitte = leererEntwurf().webfontFaces;
    const kennungen = schnitte.map((schnitt) => schnitt.kennung);
    expect(new Set(kennungen).size).toBe(schnitte.length);

    // Und zwei frische Zeilen sind zwei — vorher trugen beide „-400-normal".
    const a = leererSchnitt();
    const b = leererSchnitt();
    expect(a.kennung).not.toBe(b.kennung);
    expect({ ...a, kennung: '' }).toEqual({ ...b, kennung: '' });
  });

  it('lassen die Kennung nicht in die Designdatei durch', () => {
    // Sie gehört dem Formular. In einem `@font-face` hat sie nichts verloren,
    // und in der erzeugten Datei stünde sie als Feld, das kein Typ kennt.
    const theme = themeAusEntwurf(probeEntwurf());
    for (const face of theme.webfont.faces) {
      expect(Object.keys(face).sort()).toEqual(['family', 'file', 'style', 'weight']);
    }
    expect(designdatei(probeEntwurf())).not.toContain('kennung');
  });

  it('lassen einen kursiven Schnitt zu', () => {
    // `style` stand im Schlüssel, aber in keinem Feld — eine Marke mit einer
    // Kursiven hätte sie von Hand nachtragen müssen.
    expect(schnittstile).toContain('italic');
    const kursiv = probeEntwurf({
      webfontFaces: leererEntwurf().webfontFaces.map((schnitt, i) =>
        i === 0 ? { ...schnitt, style: 'italic' } : schnitt,
      ),
    });
    expect(traegtFehler(pruefe(kursiv))).toBe(false);
    expect(designdatei(kursiv)).toContain("style: 'italic'");
  });
});

describe('die Zahlen eines Entwurfs', () => {
  /*
     Ein leeres Zahlenfeld gibt `Number.parseFloat('')` weiter, also `NaN`.
     Und `NaN` ist ein gültiger *Bezeichner*: die erzeugte Datei trug
     `xl3: NaN` und `stil.tracking - NaN`, übersetzte anstandslos und setzte
     von da an in jeder Ausgabe leise falsch.
  */
  const mitNaN: Array<[string, Partial<CiEntwurf>]> = [
    ['die Laufweite', { auszeichnungEnger: Number.NaN }],
    ['eine Leiterstufe', { textScale: { ...leererEntwurf().textScale, xl3: Number.NaN } }],
    [
      'der Schattenversatz „none"',
      { shadowOffset: { ...leererEntwurf().shadowOffset, none: Number.NaN } },
    ],
    [
      'ein Schnittgewicht',
      {
        webfontFaces: leererEntwurf().webfontFaces.map((schnitt, i) =>
          i === 0 ? { ...schnitt, weight: Number.NaN } : schnitt,
        ),
      },
    ],
  ];

  for (const [was, patch] of mitNaN) {
    it(`hält auf, wenn ${was} leer ist`, () => {
      const entwurf = probeEntwurf(patch);
      expect(traegtFehler(pruefe(entwurf)), 'die Prüfliste').toBe(true);
      // Und der Emitter wirft, statt NaN zu schreiben — der letzte Riegel.
      expect(() => designdatei(entwurf)).toThrow();
    });
  }

  it('lässt die Laufweite null und negativ sein', () => {
    // Sie darf beides: null lässt die Leiter, wie sie ist, negativ macht die
    // Auszeichnung enger. Nur eine Zahl muss sie sein. Die vorige Fassung
    // sprang deshalb ganz über sie hinweg.
    for (const wert of [0, -0.02, 0.01]) {
      expect(traegtFehler(pruefe(probeEntwurf({ auszeichnungEnger: wert }))), `${wert}`).toBe(
        false,
      );
    }
  });

  it('meldet ein Schnittgewicht außerhalb von 100 bis 900', () => {
    const daneben = probeEntwurf({
      webfontFaces: leererEntwurf().webfontFaces.map((schnitt, i) =>
        i === 0 ? { ...schnitt, weight: 1200 } : schnitt,
      ),
    });
    expect(traegtFehler(pruefe(daneben))).toBe(true);
  });
});

describe('der Exportname der Designdatei', () => {
  /*
     Die Prüfliste erlaubt Kleinschrift, Ziffern und Bindestriche — richtig für
     einen Schlüssel, der im Frontmatter steht. Der Emitter macht daraus einen
     Bezeichner, indem er `-x` zu `X` zieht, und das greift nur vor einem
     Buchstaben. `kunde-2024` — die naheliegendste Form eines Markenschlüssels
     überhaupt — wurde damit zu `export const kunde-2024`, einem Syntaxfehler,
     bei grüner Prüfliste und freigegebenem Knopf.
  */
  const untauglich = ['kunde-2024', 'default', 'class', 'palette', 'nozillaTheme', 'faces'];

  for (const id of untauglich) {
    it(`hält „${id}" auf`, () => {
      expect(bezeichnerProblem(id)).not.toBeNull();
      expect(traegtFehler(pruefe(probeEntwurf({ id })))).toBe(true);
    });
  }

  it('lässt taugliche Schlüssel durch und zieht den Bindestrich zusammen', () => {
    expect(bezeichner('alte-post')).toBe('altePost');
    expect(bezeichnerProblem('alte-post')).toBeNull();
    expect(designdatei(probeEntwurf({ id: 'alte-post' }))).toContain('export const altePost:');
  });

  it('rechnet in Prüfung und Emitter dieselbe Formel', () => {
    // Zwei Rechnungen für dieselbe Frage gäben eine Datei frei, die nicht
    // übersetzt — die Prüfliste grün, der Compiler rot.
    for (const id of ['probenhaus', 'alte-post', 'a1']) {
      expect(designdatei(probeEntwurf({ id }))).toContain(`export const ${bezeichner(id)}:`);
    }
  });
});

describe('die Bausteine der Rechnung', () => {
  it('trennt die Namen eines Schriftstapels', () => {
    expect(stapelNamen("'Zilla Slab', 'Inter', Georgia, serif")).toEqual([
      'Zilla Slab',
      'Inter',
      'Georgia',
      'serif',
    ]);
  });

  it('misst Unterscheidbarkeit kanalweise und nicht am Kontrast', () => {
    // Der Fall, der die erste Fassung widerlegt hat: sichtbar zwei Farben,
    // deren Kontrastverhältnis fast eins ist.
    expect(kontrast('#FFFEE5', '#FFFFFF')).toBeLessThan(1.04);
    expect(kanalabstand('#FFFEE5', '#FFFFFF')).toBe(26);
    expect(unterscheidbar('#FFFEE5', '#FFFFFF')).toBe(true);
    // Und die Gegenrichtung: derselbe Wert ist kein Paar.
    expect(unterscheidbar('#FFFFFF', '#FFFFFF')).toBe(false);
    expect(kanalabstand('#FFFFFF', '#FFFFFF')).toBe(0);
  });

  it('rechnet den Kontrast gegen die bekannten Eckwerte', () => {
    // Die Norm gibt zwei Werte vor, an denen sich jede Umsetzung messen lässt:
    // Schwarz auf Weiß ist 21 : 1, eine Farbe auf sich selbst ist 1 : 1. Ohne
    // sie stünde hier eine Rechnung, die niemand nachgeprüft hat — und sie
    // entscheidet jetzt über jede fremde Palette.
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
