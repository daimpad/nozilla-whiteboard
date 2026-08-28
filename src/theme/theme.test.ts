/**
 * Die Trennlinie zwischen Marke und Werkzeug, als Test.
 *
 * Sie ist in `theme.config.ts` beschrieben, aber eine Beschreibung hält keine
 * Regel. Was sie hält, ist ein Test, der beim nächsten schnellen `bg-paper` in
 * einer Werkzeugleiste rot wird — genau die Verwechslung, die diesen Umbau
 * nötig gemacht hat.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { palette, ui, uiRadius, uiShadow, RADIUS, shadow } from '@/theme';

const COMPONENT_ROOT = join(process.cwd(), 'src', 'components');

/**
 * Der CI-Generator (`ci.html`) ist eine zweite Bedienfläche und liegt nicht
 * unter `src/components` — er entkäme diesem Sieb sonst ganz.
 *
 * Nachgezogen wird bewusst nur die **erste** Prüfung, und die dritte. Die
 * zweite („liest Marken-Tokens nur dort, wo Inhalt gezeigt wird") gilt dort
 * nicht: der Generator hantiert von Berufs wegen mit Paletten, das ist sein
 * ganzer Zweck. Was für ihn gilt, ist dasselbe wie für jede andere Leiste —
 * **seine eigenen Flächen tragen keine Marken-Utility.** Ein Formular, dessen
 * Knöpfe die Farben tragen, die es gerade einstellt, wird beim ersten dunklen
 * fremden CI unbedienbar.
 */
const CHROME_ROOTS = [COMPONENT_ROOT, join(process.cwd(), 'src', 'ci')];

/** Kommentare heraus — sonst schlägt der Test auf seiner eigenen Erklärung an. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Zeichenketten heraus.
 *
 * Nur für die Frage „wird hier ein Marken-Token *benutzt*". Ein Token wird als
 * Bezeichner benutzt; steht sein Name in Anführungszeichen, ist er der Name
 * von etwas anderem — eines Zeichens zum Beispiel.
 */
function ohneText(source: string): string {
  return source.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.tsx') || path.endsWith('.ts') ? [path] : [];
  });
}

/**
 * Marken-Utilities, die in der Oberfläche nichts verloren haben. Bewusst die
 * Flächen- und Linienfarben: eine cremefarbene Leiste um eine cremefarbene
 * Folie ist genau der Fehler, den diese Liste verhindert.
 */
const BRAND_ONLY_CLASSES = [
  'bg-paper',
  'bg-paper-alt',
  'bg-paper-deep',
  'bg-canvas',
  'bg-surface',
  'bg-surface-alt',
  'bg-surface-raised',
  'bg-surface-inverse',
  'bg-signal',
  'bg-ink',
  'text-ink-muted',
  'text-ink-subtle',
  'text-ink-inverse',
  'border-line',
  'border-ink',
];

/**
 * Diese Dateien zeigen Marken-Inhalt *als Vorschau* — Tonwert-Plättchen,
 * Element-Kacheln, die Wortmarke. Sie dürfen Marken-Werte lesen; sie färben
 * damit aber keine Bedienfläche, sondern zeichnen, was auf der Folie landet.
 */
const PREVIEWS_BRAND_CONTENT = new Set([
  'Logo.tsx',
  'Icon.tsx',
  'SlideView.tsx',
  'AssetSidebar.tsx',
  'Inspector.tsx',
]);

describe('Marke und Werkzeug sind getrennt', () => {
  it('färbt keine Bedienfläche mit einem Marken-Ton', () => {
    const offenders: string[] = [];
    for (const file of CHROME_ROOTS.flatMap(sourceFiles)) {
      const source = code(readFileSync(file, 'utf8'));
      for (const className of BRAND_ONLY_CLASSES) {
        // Nur als ganze Utility, nicht als Präfix von `bg-ui-surface` o. ä.
        const pattern = new RegExp(`(^|[\\s'"\`:])${className}(?![\\w-])`, 'm');
        if (pattern.test(source)) offenders.push(`${file.split('/').pop()}: ${className}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('liest Marken-Tokens nur dort, wo Inhalt gezeigt wird', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(COMPONENT_ROOT)) {
      const name = file.split('/').pop() ?? '';
      if (PREVIEWS_BRAND_CONTENT.has(name)) continue;
      const source = code(readFileSync(file, 'utf8'));
      /*
         Der Import wird an der rohen Quelle geprüft, die Benutzung an der
         *ohne Zeichenketten*. Der Grund ist ein Zeichen: das Werkzeug-Set
         führt eines namens „palette", und `<Icon name="palette" />` in einer
         Datei, die ohnehin aus `@/theme` importiert, sah für die vorige
         Fassung aus wie ein Griff in die Marken-Palette. Ein Marken-Token wird
         immer als *Bezeichner* benutzt — `palette.signal`, `elementTones.ink` —
         und nie als Zeichenkette; genau diese Unterscheidung fehlte.
      */
      if (/from '@\/theme'/.test(source) && /\b(palette|elementTones)\b/.test(ohneText(source))) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('friert die Oberfläche nicht auf die helle Fassung ein', () => {
    // `ui` ist ein Modulwert und trägt die *helle* Belegung. Seit die
    // Erscheinung des Werkzeugs umschaltbar ist, friert jede Komponente, die
    // `ui.surface` als Wert liest, genau diese Fassung ein — im dunklen
    // Werkzeug bliebe dort eine weiße Fläche stehen. Farben gehören über
    // Tailwind-Klassen und damit über CSS-Variablen bezogen.
    //
    // `CanvasStage` ist die Ausnahme, und zwar mit Grund: Auswahlrahmen,
    // Aufziehrechteck, Raster und der Überlauf-Strich liegen *auf* der Folie
    // und wechseln deshalb nicht mit. Genau diese vier Werte darf sie lesen.
    //
    // Der Überlauf-Strich kam als vierter dazu und gehört in dieselbe Familie:
    // er markiert eine Stelle auf dem Papier. Ein Strich, der im dunklen
    // Werkzeug die Farbe wechselte, wechselte sie über cremefarbenem Papier —
    // dort ändert sich nichts, und er wäre plötzlich schlecht zu sehen.
    const ON_SLIDE = new Set(['select', 'selectWash', 'grid', 'warn']);
    const offenders: string[] = [];

    for (const file of CHROME_ROOTS.flatMap(sourceFiles)) {
      const source = code(readFileSync(file, 'utf8'));
      if (!/from '@\/theme'/.test(source)) continue;
      for (const match of source.matchAll(/\bui\.([A-Za-z]+)/g)) {
        if (!ON_SLIDE.has(match[1])) offenders.push(`${file.split('/').pop()}: ui.${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('hält die beiden Farbsätze vollständig auseinander', () => {
    // Zwei Werte dürfen zusammenfallen, ohne dass etwas herübergereicht wurde:
    // reines Weiß ist Weiß, und ein Fehler-Rot ist ein Fehler-Rot. Beides sind
    // keine Marken-Entscheidungen, sondern Konventionen.
    const STATUS = new Set(['warn', 'warnBg', 'danger', 'dangerBg', 'info', 'infoBg']);
    const brandValues = new Set(
      Object.values(palette)
        .map((value) => value.toLowerCase())
        .filter((value) => value !== '#ffffff'),
    );
    const shared = Object.entries(ui)
      .filter(([key]) => !STATUS.has(key))
      .filter(([, value]) => brandValues.has(String(value).toLowerCase()))
      .map(([key]) => key);
    // Die Oberfläche leiht sich nichts von der Marke — auch keinen Akzent.
    // Ihr Akzent ist Schwarz, damit die einzige Farbe im Bild auf der Folie
    // sitzt.
    expect(shared).toEqual([]);
  });

  it('rundet die Oberfläche, aber nie die Folie', () => {
    expect(RADIUS).toBe(0);
    expect(Object.values(uiRadius).every((value) => value > 0)).toBe(true);
  });

  it('trennt harte Marken-Versätze von weichen Oberflächen-Schatten', () => {
    // Die dritte Länge einer `box-shadow` ist der Weichzeichner-Radius.
    const blurRadii = (value: string) =>
      [...value.matchAll(/(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?/g)].map((match) =>
        Number(match[3]),
      );

    // Auf der Folie: Versatz, kein Weichzeichner — sonst wäre der PDF-Export
    // nicht deckungsgleich mit dem Bildschirm.
    for (const [name, value] of Object.entries(shadow)) {
      if (name === 'none') continue;
      expect(blurRadii(value).every((radius) => radius === 0)).toBe(true);
    }
    // In der Oberfläche darf er weich sein, er wird ja nie exportiert.
    for (const [name, value] of Object.entries(uiShadow)) {
      if (name === 'none' || name === 'focus') continue;
      expect(blurRadii(value).some((radius) => radius > 0)).toBe(true);
    }
  });
});
