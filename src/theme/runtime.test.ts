import { afterEach, describe, expect, it } from 'vitest';
import {
  activeTheme,
  availableThemes,
  palette,
  registerTheme,
  setActiveTheme,
  themeVersion,
  typeScale,
  type BrandTheme,
} from './index';
import { nozillaTheme, tonesFromPalette } from './brandTheme';
import { buildSlideScene } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { PARTS } from '@/lib/export/pptxParts';
import { parseDeck } from '@/lib/markdown/deck';
import welcome from '@/decks/welcome.md?raw';

/**
 * Geprüft wird das Ergebnis, nicht die Mechanik.
 *
 * Ob eine exportierte Bindung lebendig ist, sagt die Sprachspezifikation. Was
 * sie nicht sagt: ob irgendwo im Werkzeug jemand den Wert beim Laden in eine
 * Konstante geschrieben hat. Genau das würde hier auffallen — die Szene käme
 * nach dem Wechsel in den alten Farben heraus.
 */

/**
 * Dasselbe Regelwerk, andere Belegung. Kein echter Kunde, nur ein Prüfstein —
 * und zugleich das Muster, nach dem ein Erscheinungsbild angelegt wird: Farben
 * einmal nennen, Töne daraus mischen lassen.
 */
const probePalette = {
  ...nozillaTheme.palette,
  signal: '#FF00AA',
  signalSoft: '#FFC7E8',
  paper: '#101010',
  paperAlt: '#101010',
  ink: '#FFFFFF',
  ink800: '#2A2A2A',
};
const probeInkAlpha = {
  70: 'rgba(255, 255, 255, 0.72)',
  50: 'rgba(255, 255, 255, 0.50)',
  20: 'rgba(255, 255, 255, 0.18)',
};
const probePaperAlpha = {
  70: 'rgba(16, 16, 16, 0.64)',
  50: 'rgba(16, 16, 16, 0.40)',
  20: 'rgba(16, 16, 16, 0.18)',
};

const probe: BrandTheme = {
  ...nozillaTheme,
  id: 'probe',
  label: 'Prüfstein',
  palette: probePalette,
  inkAlpha: probeInkAlpha,
  paperAlpha: probePaperAlpha,
  color: {
    ...nozillaTheme.color,
    signal: probePalette.signal,
    surface: probePalette.paper,
    ink: probePalette.ink,
    line: probePalette.ink,
  },
  elementTones: tonesFromPalette(probePalette, probeInkAlpha, probePaperAlpha),
  typeScale: {
    ...nozillaTheme.typeScale,
    h1: { ...nozillaTheme.typeScale.h1, size: 200 },
  },
};

const deck = parseDeck(welcome);
const slideMarkup = () => primsToSvgMarkup(buildSlideScene(deck.slides[0], deck).prims);

afterEach(() => {
  setActiveTheme('nozilla');
});

describe('das Erscheinungsbild zur Laufzeit', () => {
  it('kennt zu Beginn nur nozilla', () => {
    expect(activeTheme().id).toBe('nozilla');
    expect(availableThemes().map((entry) => entry.id)).toContain('nozilla');
  });

  it('wechselt die Farben der Szene', () => {
    const vorher = slideMarkup();
    expect(vorher).toContain(nozillaTheme.palette.signal);

    registerTheme(probe);
    expect(setActiveTheme('probe')).toBe(true);

    const nachher = slideMarkup();
    expect(nachher).toContain('#FF00AA');
    expect(nachher).not.toContain(nozillaTheme.palette.signal);
    expect(nachher).not.toEqual(vorher);
  });

  it('wechselt auch die Typo — der Satz fällt anders', () => {
    registerTheme(probe);
    const vorher = slideMarkup();
    setActiveTheme('probe');
    const nachher = slideMarkup();

    expect(vorher).toContain(`font-size="${nozillaTheme.typeScale.h1.size}"`);
    expect(nachher).toContain('font-size="200"');
  });

  it('stellt beim Zurückschalten genau den alten Zustand her', () => {
    registerTheme(probe);
    const anfang = slideMarkup();
    setActiveTheme('probe');
    setActiveTheme('nozilla');
    expect(slideMarkup()).toEqual(anfang);
  });

  it('reicht bis in die PPTX-Bausteine', () => {
    // Der Folienmaster trägt die Papierfarbe. Wäre er beim Laden gebaut
    // worden, stünde dort für immer das Creme der nozilla-CI.
    registerTheme(probe);
    expect(PARTS.slideMaster).toContain('FFFEE5');
    setActiveTheme('probe');
    expect(PARTS.slideMaster).toContain('101010');
    expect(PARTS.theme).toContain('FF00AA');
  });

  it('lässt die einzelnen Werte mitwandern', () => {
    registerTheme(probe);
    expect(palette.signal).toBe(nozillaTheme.palette.signal);
    setActiveTheme('probe');
    expect(palette.signal).toBe('#FF00AA');
    expect(typeScale.h1.size).toBe(200);
  });

  it('nimmt kein Erscheinungsbild an, dessen Töne die eigene Palette verlassen', () => {
    // Die Falle: Palette geändert, Töne vergessen. Untergrund und Fließtext
    // folgen, die Karten tragen weiter das Grün, von dem abgeschrieben wurde.
    const halb: BrandTheme = { ...probe, id: 'halb', elementTones: nozillaTheme.elementTones };
    expect(() => registerTheme(halb)).toThrow(/außerhalb der eigenen Palette/);
  });

  it('weist einen unbekannten Schlüssel ab, statt still zurückzufallen', () => {
    const vorher = activeTheme().id;
    expect(setActiveTheme('gibt-es-nicht')).toBe(false);
    expect(activeTheme().id).toBe(vorher);
  });

  it('zählt jeden Wechsel, damit die Oberfläche neu zeichnet', () => {
    registerTheme(probe);
    const vorher = themeVersion();
    setActiveTheme('probe');
    expect(themeVersion()).toBeGreaterThan(vorher);
    // Zweimal dasselbe ist kein Wechsel.
    const dazwischen = themeVersion();
    setActiveTheme('probe');
    expect(themeVersion()).toBe(dazwischen);
  });
});
