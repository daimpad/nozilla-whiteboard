/**
 * Was der Export sagt, wenn die Schriften nicht in die Datei kommen.
 *
 * Hier stand ein `console.warn` und daneben der Satz „ein Fehlschlag bleibt
 * folgenlos". Der stimmt für den *Export* — die Datei entsteht — und nicht für
 * den, der sie danach öffnet: ohne die eingebetteten Schnitte nennt das SVG
 * seine Schriften nur beim Namen, und auf einem fremden Rechner steht der Text
 * in irgendetwas anderem. Dieselbe Stille wie beim leeren `catch` der
 * Selbstsicherung und beim fehlenden Bild.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { beiAusfallImExport, type Ausfall } from './glyphCover';

const { embeddedFontCss } = vi.hoisted(() => ({ embeddedFontCss: vi.fn() }));
vi.mock('./fontFiles', async (original) => ({
  ...(await original<typeof import('./fontFiles')>()),
  embeddedFontCss,
}));

const deck = parseDeck('---\ntitle: Probe\n---\n\n# Eine Überschrift.\n\nUnd ein Absatz.');

describe('Schnitte, die nicht eingebettet werden konnten', () => {
  let gemeldet: Ausfall[] = [];

  beforeEach(() => {
    gemeldet = [];
    beiAusfallImExport((ausfall) => gemeldet.push(ausfall));
    embeddedFontCss.mockReset();
  });

  afterEach(() => beiAusfallImExport(null));

  it('werden gemeldet und nicht auf die Konsole geschrieben', async () => {
    embeddedFontCss.mockRejectedValue(new Error('kein Netz'));
    const { renderSvg } = await import('./index');

    const { svg } = await renderSvg(deck, { slideIndex: 0 });

    // Die Datei entsteht trotzdem — die Politik stimmt.
    expect(svg).toContain('<svg');
    // Und die Oberfläche erfährt davon.
    expect(gemeldet).toHaveLength(1);
    expect(gemeldet[0].zeichen).toEqual([]);
    expect(gemeldet[0].schnitte.length).toBeGreaterThan(0);
    // Genannt wird, *welcher* Schnitt fehlt, und nicht nur, dass etwas
    // fehlte — in derselben Schreibweise wie beim Umriss-Weg, der über
    // denselben Kanal meldet.
    expect(gemeldet[0].schnitte).toContain('ZillaSlab-Bold');
  });

  it('schweigen, wenn das Einbetten gelingt', async () => {
    // Die Gegenrichtung: eine Meldung, die immer kommt, ist keine.
    embeddedFontCss.mockResolvedValue('@font-face{}');
    const { renderSvg } = await import('./index');

    await renderSvg(deck, { slideIndex: 0 });
    expect(gemeldet).toEqual([]);
  });

  it('schweigen auch, wo gar keine Schrift eingebettet wird', async () => {
    // Im Umriss-Weg gibt es keinen Lauf mehr, für den eine `@font-face`-Regel
    // etwas täte — dort darf `embeddedFontCss` gar nicht erst gerufen werden.
    embeddedFontCss.mockRejectedValue(new Error('kein Netz'));
    const { renderSvg } = await import('./index');

    await renderSvg(deck, { slideIndex: 0, text: 'outlines' });
    expect(embeddedFontCss).not.toHaveBeenCalled();
    /*
       Gemeldet wird auf diesem Weg trotzdem — aber von einem anderen
       Erzeuger: `glyphCoverFor()` sagt, welche `.ttf` nicht ankam. Das ist
       genau richtig und hat mit dem Einbetten nichts zu tun; hier zählt nur,
       dass die Regeln gar nicht erst gebaut werden.
    */
  });
});
