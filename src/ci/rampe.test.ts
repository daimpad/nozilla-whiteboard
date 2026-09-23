/**
 * Eine Rampe ist eine Farbe in Stufen — und nicht zwei Farben.
 *
 * Der Fall, der das ausgelöst hat, ist gemessen: ein Sprachmodell liest eine
 * Präsentation aus, liefert `signal`, `signalStrong` und `signalDeep` als
 * Orange und lässt `signalSoft` weg. Der Bericht nennt die Lücke — richtig so
 * —, aber der Entwurf trägt danach nozillas Minzgrün als „weiche Stufe" eines
 * orangen Signals. Auf der Probefolie steht ein mintgrüner Codeblock auf
 * oranger Fläche, und die Prüfliste sagte dazu nichts: jede Farbe für sich ist
 * gültig, und die beiden unterscheiden sich sauber.
 *
 * Geprüft wird in beide Richtungen, und die zweite ist hier die eigentliche.
 * Ein Wächter, der auf dem eigenen Material anschlägt, wird beim ersten Öffnen
 * als Rauschen abgetan — das steht in `CLAUDE.md` inzwischen viermal.
 */
import { describe, expect, it } from 'vitest';
import { activeTheme, availableThemes, nozillaTheme, setActiveTheme } from '@/theme';
import { registerThemes } from '@/themes';
import { farbfamilie, UNTERSCHEIDBAR, kanalabstand } from '@/lib/contrast';
import { rampenbefunde, pruefe, ankerFuer } from './pruefung';
import { leererEntwurf, type CiEntwurf } from './entwurf';

/*
   Dieselbe Bauart wie in `generator.test.ts`: die eigenen Erscheinungsbilder
   werden angemeldet, und der Stand des Verzeichnisses wird *vor* dem ersten
   Test festgehalten. `registerTheme()` nimmt nichts wieder heraus, und eine
   Vorschau, die ihren Entwurf anmeldet, stünde sonst in dieser Liste.
*/
registerThemes();
const MITGELIEFERT = availableThemes().map(({ id }) => id);

/** Die Palette, die beim Auslesen jener Vorlage wirklich herauskam. */
const TZ_GLEHN = {
  ...nozillaTheme.palette,
  signal: '#F8AB1F',
  signalStrong: '#FB9800',
  signalDeep: '#F18700',
  // `signalSoft` blieb auf #B7FFE0 stehen — das Modell lieferte es nicht.
};

describe('farbfamilie', () => {
  it('nennt die Rangfolge der Kanäle', () => {
    expect(farbfamilie('#F8AB1F')).toBe('RGB');
    expect(farbfamilie('#00FF9C')).toBe('GBR');
    expect(farbfamilie('#B7FFE0')).toBe('GBR');
  });

  it('gibt einem fast neutralen Ton keine Familie', () => {
    /*
       Bei `#0C0C0A` entscheiden zwei Zählschritte über die Rangfolge. Eine
       Tintenrampe darüber zu befragen hieße, Rauschen zu verurteilen — und
       genau das wäre der Wächter, den man nach dem ersten Fehlalarm abschaltet.
    */
    expect(farbfamilie('#0C0C0A')).toBeNull();
    expect(farbfamilie('#FFFFFF')).toBeNull();
    expect(farbfamilie('#000000')).toBeNull();
    expect(farbfamilie('#1A1614')).toBeNull();
  });

  it('nimmt die Grenze aus derselben Kalibrierung wie die Unterscheidbarkeit', () => {
    /*
       Keine zweite Schwelle daneben: eine Farbe hat genau dann eine Familie,
       wenn sie von ihrem *eigenen* Grau unterscheidbar ist. Geprüft wird das
       am Ergebnis und nicht an der Formel — sonst wanderte die Zusicherung mit,
       wenn jemand die Rechnung ändert.
    */
    const grau = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
      const m = Math.round((r + g + b) / 3);
      return `#${[m, m, m].map((k) => k.toString(16).padStart(2, '0')).join('')}`;
    };
    for (const hex of ['#F8AB1F', '#00FF9C', '#B7FFE0', '#0C0C0A', '#1A1614', '#4C443E']) {
      const hatFamilie = farbfamilie(hex) !== null;
      expect(kanalabstand(hex, grau(hex)) >= UNTERSCHEIDBAR, hex).toBe(hatFamilie);
    }
  });

  it('gibt nichts zurück, was kein #RRGGBB ist', () => {
    expect(farbfamilie('rot')).toBeNull();
    expect(farbfamilie('#FFF')).toBeNull();
    expect(farbfamilie('')).toBeNull();
  });
});

describe('die Rampenbefunde', () => {
  it('nennt die weiche Stufe, die aus der Familie fällt', () => {
    const befunde = rampenbefunde(TZ_GLEHN);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].rang).toBe('warnung');
    expect(befunde[0].text).toContain('signalSoft');
    expect(befunde[0].text).toContain('signal');
    // Und der Befund führt zu seinem Feld — sonst sucht man es unter sechzehn.
    expect(befunde[0].anker).toBe(ankerFuer('Farbe', 'signalSoft'));
  });

  it('schweigt zu jedem angemeldeten Erscheinungsbild', () => {
    /*
       Die Gegenrichtung. Geschleift wird über das Verzeichnis und nicht über
       eine getippte Liste: ein drittes Erscheinungsbild soll hier mitgeprüft
       werden, ohne dass jemand die Zeile nachzieht.
    */
    const vorher = activeTheme().id;
    expect(MITGELIEFERT).toContain('nozilla');
    expect(MITGELIEFERT.length).toBeGreaterThanOrEqual(2);
    for (const id of MITGELIEFERT) {
      setActiveTheme(id);
      expect(rampenbefunde(activeTheme().palette), id).toEqual([]);
    }
    setActiveTheme(vorher);
  });

  it('lässt eine Rampe in Ruhe, deren Grundton neutral ist', () => {
    // Ohne Familie im Grundton gibt es nichts, woran eine Stufe sich messen
    // ließe. Eine knallrote ink900 über schwarzer Tinte bleibt deshalb stumm.
    const neutral = { ...nozillaTheme.palette, ink: '#000000', ink900: '#FF0000' };
    expect(rampenbefunde(neutral)).toEqual([]);
  });

  it('überspringt eine Rolle, die gar keine Farbe trägt — über die Familie', () => {
    /*
       Dass hier nichts gemeldet wird, ist richtig: der Fehler steht schon eine
       Zeile weiter oben, und zweimal dasselbe zu sagen macht die Liste länger
       und nicht klarer. *Warum* es nicht gemeldet wird, ist die Zusicherung —
       diese Funktion hatte dafür einmal eine Liste der kaputten Rollen, und
       die Gegenprobe zeigte, dass sie nichts tun konnte: ein unlesbarer Wert
       hat ohnehin keine Familie. Geprüft wird also der Weg, der wirklich hält.
    */
    const kaputt = { ...TZ_GLEHN, signalSoft: 'mintgrün' };
    expect(farbfamilie('mintgrün')).toBeNull();
    expect(rampenbefunde(kaputt)).toEqual([]);
  });
});

describe('die Prüfliste gibt den Befund wirklich aus', () => {
  /*
     Eine Rechnung zu prüfen ist nicht dasselbe, wie ihren Kunden zu prüfen.
     Genau daran ist die Wortmarken-Runde einmal vorbeigelaufen: die Rechnung
     war dicht, die Zeile, die sie ruft, ließ sich entschärfen, und alle
     Prüfungen des Generators blieben grün.
  */
  const mitPalette = (palette: Record<string, string>): CiEntwurf => ({
    ...leererEntwurf(),
    id: 'probe',
    label: 'Probe',
    markenname: 'Probe',
    produkt: 'Probe',
    palette: palette as CiEntwurf['palette'],
  });
  const farbbefunde = (palette: Record<string, string>) =>
    pruefe(mitPalette(palette)).filter((b) => b.feld === 'Farbe');

  it('meldet die fremde Stufe über pruefe()', () => {
    const texte = farbbefunde(TZ_GLEHN).map((b) => b.text);
    expect(texte.some((t) => /Farbfamilie/.test(t) && /signalSoft/.test(t))).toBe(true);
  });

  it('meldet sie nicht, wenn die Stufe zur Familie passt', () => {
    // Dieselbe Palette, nur mit einem hellen Orange als weicher Stufe.
    const heil = { ...TZ_GLEHN, signalSoft: '#FDE6BC' };
    expect(farbfamilie('#FDE6BC')).toBe('RGB');
    expect(farbbefunde(heil).some((b) => /Farbfamilie/.test(b.text))).toBe(false);
  });
});
