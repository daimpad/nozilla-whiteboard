import { afterEach, describe, expect, it } from 'vitest';
import {
  activeTheme,
  availableThemes,
  nozillaTheme,
  setActiveTheme,
  tonesOutsidePalette,
  palette,
  typeScale,
  fontFamily,
} from '@/theme';
import { iconNames, iconsByCategory, isIconName } from '@/assets/icons';
import { isSignature } from '@/assets/iconSet';
import { buildElementPrims, backgroundStyle } from '@/lib/export/scene';
import { resolveFace } from '@/lib/export/fontFiles';
import { buildSchemaSection } from '@/lib/prompt/buildPrompt';
import { createElement } from '@/model/factory';
import { registerThemes } from './index';
import { musterkunde } from './musterkunde';

/**
 * Der Musterkunde ist die Vorlage, an der eine Kundendatei abgeschrieben wird.
 * Eine Vorlage, die niemand prüft, stimmt nach dem zweiten Umbau nicht mehr —
 * und dann schreibt der nächste Kunde einen Fehler ab.
 *
 * Geprüft wird deshalb nicht, ob die Datei *existiert*, sondern ob sie tut,
 * was eine Kundendatei tun muss: eigene Farben durchhalten, eine eigene Marke
 * zeichnen, eigene Zeichen mitbringen.
 */
registerThemes();

afterEach(() => {
  setActiveTheme('nozilla');
});

describe('die angemeldeten Erscheinungsbilder', () => {
  it('kommen alle durch die Anmeldung', () => {
    // `registerTheme()` wirft, wenn eine Tonrolle die eigene Palette verlässt.
    // Oben ist der Aufruf schon gelaufen — käme eine Datei nicht durch, stünde
    // hier gar kein Testlauf, sondern ein Fehler beim Laden des Moduls.
    expect(availableThemes().map((entry) => entry.id)).toEqual(['nozilla', 'musterkunde']);
  });

  it('halten jede Farbrolle in der eigenen Palette', () => {
    expect(tonesOutsidePalette(musterkunde)).toEqual([]);
  });

  it('färben die Szene um', () => {
    const karte = () => buildElementPrims(createElement('card', {}), backgroundStyle('paper'));

    const vorher = JSON.stringify(karte());
    expect(vorher).toContain(nozillaTheme.palette.paper);

    setActiveTheme('musterkunde');
    const nachher = JSON.stringify(karte());
    expect(nachher).toContain(musterkunde.palette.paper);
    expect(nachher).not.toContain(nozillaTheme.palette.paper);
    expect(palette.signal).toBe('#FF5A1F');
  });

  it('setzen die Auszeichnung in einer anderen Schrift und auf einer eigenen Leiter', () => {
    // Die Stufe bleibt dieselbe, der Stapel wechselt: Zilla Slab ist eine
    // Slab-Serif, Inter eine Grotesk. Wäre `fontFamily` beim Laden abgegriffen
    // worden, stünde hier weiter die Serife.
    expect(fontFamily[typeScale.h1.family]).toContain('Zilla Slab');
    setActiveTheme('musterkunde');
    expect(fontFamily[typeScale.h1.family]).toContain('Inter');
    expect(fontFamily[typeScale.h1.family]).not.toContain('Zilla Slab');
    // Eine Grotesk läuft breiter — die Leiter dieses Kunden steht darum tiefer.
    expect(typeScale.h1.size).toBeLessThan(nozillaTheme.typeScale.h1.size);
    expect(typeScale.h1.tracking).toBeLessThan(nozillaTheme.typeScale.h1.tracking);
    // Fließtext und Labels bleiben, wo sie waren: sie setzen ohnehin in Inter
    // und Space Mono.
    expect(typeScale.body).toEqual(nozillaTheme.typeScale.body);
    expect(typeScale.label).toEqual(nozillaTheme.typeScale.label);
  });

  it('zeichnen eine eigene Wortmarke', () => {
    // Verglichen werden die Primitive und nicht das Markup: der Pfad wird vor
    // der Ausgabe in Folien-Koordinaten gerechnet.
    const marke = () =>
      buildElementPrims(createElement('wordmark', {}), backgroundStyle('paper')).filter(
        (prim) => prim.t === 'path',
      );

    const vorher = marke();
    setActiveTheme('musterkunde');
    const nachher = marke();

    // Beide tragen Buchstaben und einen Akzent — nur eben nicht dieselben.
    expect(vorher).toHaveLength(2);
    expect(nachher).toHaveLength(2);
    expect(nachher).not.toEqual(vorher);
  });

  it('bringen eigene Zeichen mit und leihen den Katalog', () => {
    setActiveTheme('musterkunde');
    expect(isIconName('freigabe')).toBe(true);
    expect(isIconName('rocket')).toBe(true);
    expect(iconNames()).toHaveLength(Object.keys(nozillaTheme.icons?.icons ?? {}).length + 12);
    // Die eigenen Rubriken stehen oben in der Bibliothek.
    expect(iconsByCategory()[0].category).toBe('muster');
  });

  it('lassen die Signatur von nozilla auf keiner Folie erscheinen', () => {
    // Der 6 × 6-Punkt unten rechts ist nozillas Erkennungszeichen und nicht
    // Teil des Dialekts. Er nähme die Signalfarbe dieses Kunden an und setzte
    // trotzdem eine fremde Handschrift auf jede Folie.
    expect(nozillaTheme.icons?.icons.rocket.prims.some(isSignature)).toBe(true);

    for (const [name, icon] of Object.entries(musterkunde.icons?.icons ?? {})) {
      expect(icon.prims.length, name).toBeGreaterThan(0);
      expect(icon.prims.some(isSignature), name).toBe(false);
    }
  });

  it('benutzen in den Zeichen nur CI-Farbrollen', () => {
    // Ein Hex-Wert in einem Primitiv entkäme dem Erscheinungsbild: er bliebe
    // stehen, wenn jemand die Palette ändert.
    const roles = ['ink', 'signal', 'signal-soft', 'signal-deep'];
    for (const [name, icon] of Object.entries(musterkunde.icons?.icons ?? {})) {
      for (const prim of icon.prims) {
        if (prim.fill) expect(roles, name).toContain(prim.fill);
        if (prim.stroke) expect(roles, name).toContain(prim.stroke);
      }
    }
  });

  it('finden die Schriftdateien der eigenen Auszeichnungsschrift', () => {
    // Die Zuordnung Rolle → Schriftname stand einmal als Tabelle im
    // PDF-Weg und zeigte für `display` fest auf Zilla Slab. Ein
    // Erscheinungsbild mit anderer Auszeichnungsschrift fand seine Datei
    // deshalb nicht — im PDF stand dann Helvetica, und niemand sah einen
    // Fehler. Nur das Ergebnis verrät es: die aufgelöste Datei.
    const displayFace = () => resolveFace({ family: 'display', weight: 700 });
    expect(displayFace()?.file).toContain('ZillaSlab');

    setActiveTheme('musterkunde');
    expect(displayFace()?.file).toContain('Inter');
  });

  it('nennen im Prompt die eigenen Schriften', () => {
    setActiveTheme('musterkunde');
    const prompt = buildSchemaSection();
    expect(prompt).toContain('Überschriften: Inter Bold');
    expect(prompt).not.toContain('Zilla Slab');
  });

  it('lassen das Werkzeug in Ruhe', () => {
    setActiveTheme('musterkunde');
    // Die Oberfläche hat ihr eigenes Set, und das ist nicht wechselbar.
    // Fehlte hier ein Name, bliebe ein Knopf leer.
    expect(activeTheme().id).toBe('musterkunde');
    expect(nozillaTheme.icons?.icons['chevron-right']).toBeDefined();
  });
});
