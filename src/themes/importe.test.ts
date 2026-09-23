/**
 * Der Import eines Erscheinungsbilds — geprüft an der Ablage und am
 * Verzeichnis, nicht am Rückgabewert.
 *
 * Jede Prüfung beginnt mit frischen Modulen: das Verzeichnis der
 * Erscheinungsbilder ist eine Map auf Modulebene, und ein Neuladen des
 * Fensters ist hier nichts anderes als ein neuer Satz Module über derselben
 * Ablage. Nur so ist „überlebt es ein ⌘R" eine Frage, die dieser Test stellen
 * kann.
 *
 * Der Server ist nachgestellt, und zwar so, wie er wirklich antwortet: eine
 * Datei, die unter `public/` liegt, kommt mit ihren Bytes; eine, die fehlt,
 * kommt mit **Status 200 und einer HTML-Seite** — der Rückfall einer
 * Einzelseiten-App, gemessen an `vite preview`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CiEntwurf } from '@/ci/entwurf';

const WORTMARKE = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">',
  '<path fill="#101010" d="M0 0 L120 0 L120 48 L0 48 Z"/>',
  '<path fill="#E4003A" d="M140 24 L164 24 L164 48 L140 48 Z"/>',
  '</svg>',
].join('');

async function frisch() {
  vi.resetModules();
  const themes = await import('@/themes');
  const importe = await import('@/themes/importe');
  const theme = await import('@/theme');
  const entwurf = await import('@/ci/entwurf');
  const start = themes.registerThemes();
  return { ...importe, ...theme, ...entwurf, start };
}

function probe(patch: Partial<CiEntwurf> = {}, leer?: () => CiEntwurf): CiEntwurf {
  const basis = leer!();
  return {
    ...basis,
    id: 'probenhaus',
    label: 'Probenhaus',
    markenname: 'probe',
    produkt: 'probe Whiteboard',
    palette: {
      ...basis.palette,
      signal: '#E4003A',
      signalStrong: '#B8002F',
      signalSoft: '#FFD6DE',
      signalDeep: '#7A001F',
    },
    wortmarke: { svg: WORTMARKE, dateiname: 'w.svg', letters: '#101010', accent: '#E4003A' },
    ...patch,
  };
}

const SPA_SEITE = '<!doctype html><html><head><title>nozilla</title></head></html>';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', async (url: string | URL) => {
    const pfad = decodeURI(String(url)).replace(/^\//, '');
    const datei = join(process.cwd(), 'public', pfad);
    if (existsSync(datei)) return new Response(readFileSync(datei));
    return new Response(SPA_SEITE, { status: 200, headers: { 'content-type': 'text/html' } });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ein Import', () => {
  it('meldet an, merkt sich und überlebt ein Neuladen', async () => {
    const m = await frisch();
    const datei = probe({}, m.leererEntwurf);
    const geprueft = await m.pruefeImport(JSON.stringify(datei));
    expect(geprueft.ok).toBe(true);
    if (!geprueft.ok) return;
    expect(m.uebernehmeImport(geprueft.vorschlag)).toBeNull();
    expect(m.isThemeId('probenhaus')).toBe(true);
    // Der Import meldet nur an; umstellen ist ein eigener Handgriff.
    expect(m.activeTheme().id).toBe('nozilla');

    // Das „⌘R": neue Module, dieselbe Ablage.
    const danach = await frisch();
    expect(danach.start.angemeldet).toEqual(['probenhaus']);
    expect(danach.isThemeId('probenhaus')).toBe(true);
    danach.setActiveTheme('probenhaus');
    expect(danach.activeTheme().palette.signal).toBe('#E4003A');
    expect(danach.activeTheme()).toEqual(danach.themeAusEntwurf(probe({}, danach.leererEntwurf)));
  });

  it('nimmt einen Schlüssel an, den der Emitter als Bezeichner ablehnen würde', async () => {
    // `kunde-2024` ist kein JavaScript-Bezeichner und ein guter `theme:`-Wert.
    // Ein Import schreibt keinen Quelltext.
    const m = await frisch();
    const geprueft = await m.pruefeImport(
      JSON.stringify(probe({ id: 'kunde-2024' }, m.leererEntwurf)),
    );
    expect(geprueft.ok).toBe(true);
  });

  it('sagt beim zweiten Mal, dass er ersetzt', async () => {
    const m = await frisch();
    const text = JSON.stringify(probe({}, m.leererEntwurf));
    const erst = await m.pruefeImport(text);
    if (!erst.ok) throw new Error(erst.grund);
    expect(erst.vorschlag.ersetzt).toBe(false);
    m.uebernehmeImport(erst.vorschlag);
    const zweit = await m.pruefeImport(text);
    if (!zweit.ok) throw new Error(zweit.grund);
    expect(zweit.vorschlag.ersetzt).toBe(true);
  });

  it('lässt sich entfernen — aus der Auswahl und aus der Ablage', async () => {
    const m = await frisch();
    const geprueft = await m.pruefeImport(JSON.stringify(probe({}, m.leererEntwurf)));
    if (!geprueft.ok) throw new Error(geprueft.grund);
    m.uebernehmeImport(geprueft.vorschlag);
    m.setActiveTheme('probenhaus');

    expect(m.entferneImport('probenhaus')).toBe(true);
    expect(m.isThemeId('probenhaus')).toBe(false);
    // War es das gültige, gilt danach nozilla — und nicht ein Loch.
    expect(m.activeTheme().id).toBe('nozilla');
    const danach = await frisch();
    expect(danach.isThemeId('probenhaus')).toBe(false);
  });

  it('entfernt kein mitgeliefertes Erscheinungsbild', async () => {
    const m = await frisch();
    expect(m.entferneImport('nozilla')).toBe(false);
    expect(m.entferneImport('musterkunde')).toBe(false);
    expect(m.isThemeId('musterkunde')).toBe(true);
  });

  it('hält sich vom Schlüssel der Deck-Sitzung fern', async () => {
    const { STORAGE_KEY } = await import('@/state/persistence');
    localStorage.setItem(STORAGE_KEY, 'unberührt');
    const m = await frisch();
    const geprueft = await m.pruefeImport(JSON.stringify(probe({}, m.leererEntwurf)));
    if (!geprueft.ok) throw new Error(geprueft.grund);
    m.uebernehmeImport(geprueft.vorschlag);
    m.entferneImport('probenhaus');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('unberührt');
    expect(m.ABLAGE_KEY).not.toBe(STORAGE_KEY);
  });
});

describe('was ein Import ablehnt', () => {
  it('überschreibt keine mitgelieferte Marke — und die eigene CI bleibt, wie sie war', async () => {
    const m = await frisch();
    const signalVorher = m.activeTheme().palette.signal;
    for (const id of ['nozilla', 'musterkunde']) {
      const geprueft = await m.pruefeImport(JSON.stringify(probe({ id }, m.leererEntwurf)));
      expect(geprueft.ok, id).toBe(false);
      if (!geprueft.ok) expect(geprueft.grund, id).toContain('mitgeliefert');
    }
    expect(m.activeTheme().palette.signal).toBe(signalVorher);
  });

  it('nimmt einen halben Entwurf nicht an und sagt, was fehlt', async () => {
    const m = await frisch();
    const geprueft = await m.pruefeImport(
      JSON.stringify(probe({ wortmarke: null }, m.leererEntwurf)),
    );
    expect(geprueft.ok).toBe(false);
    if (!geprueft.ok) expect(geprueft.grund).toContain('Wortmarke');
  });

  it('macht aus einer fremden Datei keine nozilla-Marke unter fremdem Namen', async () => {
    const m = await frisch();
    for (const text of [
      '{kaputt',
      '[]',
      '{"name":"paket","version":"1.0.0"}',
      '{"id":"nur-ein-name"}',
    ]) {
      const geprueft = await m.pruefeImport(text);
      expect(geprueft.ok, text).toBe(false);
    }
    expect(m.isThemeId('nur-ein-name')).toBe(false);
  });

  it('nimmt keinen Entwurf mit einem Fehler der Prüfliste an und nennt ihn', async () => {
    /*
       Ein Fehler, den der Leser durchlässt und erst die Prüfliste sieht: eine
       Schnittdatei, die kein WOFF2 ist. `loadTtf()` tauscht nur die Endung —
       mit `.ttf` in der Liste suchte der Export eine `.ttf.ttf`.
    */
    const m = await frisch();
    const basis = probe({}, m.leererEntwurf);
    const datei = {
      ...basis,
      webfontFaces: basis.webfontFaces.map((face, index) =>
        index === 0 ? { ...face, file: face.file.replace(/\.woff2$/, '.ttf') } : face,
      ),
    };
    const geprueft = await m.pruefeImport(JSON.stringify(datei));
    expect(geprueft.ok).toBe(false);
    if (geprueft.ok) return;
    expect(geprueft.befunde?.some((befund) => befund.text.includes('kein WOFF2'))).toBe(true);
    expect(m.isThemeId('probenhaus')).toBe(false);
  });
});

describe('die Schriften eines Imports', () => {
  it('nennt jede Datei, die hier nicht liegt — auch wenn der Server 200 sagt', async () => {
    const m = await frisch();
    const basis = probe({}, m.leererEntwurf);
    const datei = {
      ...basis,
      fontFamily: { ...basis.fontFamily, body: "'Hausschrift', 'Zilla Slab', sans-serif" },
      webfontFaces: [
        ...basis.webfontFaces,
        {
          family: 'Hausschrift',
          weight: 400,
          style: 'normal',
          file: 'Hausschrift-Regular.woff2',
          kennung: 'x',
        },
      ],
    };
    const geprueft = await m.pruefeImport(JSON.stringify(datei));
    if (!geprueft.ok) throw new Error(geprueft.grund);
    expect(geprueft.vorschlag.fehlendeSchnitte.map((f) => f.datei)).toEqual([
      'Hausschrift-Regular.woff2',
    ]);
    expect(geprueft.vorschlag.fehlendeSchnitte[0].grund).toContain('HTML-Seite');
  });

  it('meldet keine Datei als fehlend, die wirklich daliegt', async () => {
    // Die Gegenrichtung: eine Warnung, die immer dasteht, ist keine.
    const m = await frisch();
    const geprueft = await m.pruefeImport(JSON.stringify(probe({}, m.leererEntwurf)));
    if (!geprueft.ok) throw new Error(geprueft.grund);
    expect(geprueft.vorschlag.fehlendeSchnitte).toEqual([]);
  });

  it('lässt den Export keine HTML-Seite als Schrift einbetten', async () => {
    /*
       Der Fehler, den der Import sichtbar gemacht hat und der vorher schon
       dastand: `fetchBytes()` fragte nur `response.ok`. Der SVG-Export bettete
       die `index.html` als WOFF2 ein, und PDF wie PNG liefen mit ihr in den
       Umriss-Leser.
    */
    const { loadTtf, loadWoff2 } = await import('@/lib/export/fontFiles');
    const face = {
      role: 'body' as const,
      family: 'X',
      weight: 400,
      file: 'Fehlt-Regular.woff2',
      id: 'Fehlt-Regular',
    };
    await expect(loadWoff2(face)).rejects.toThrow('HTML-Seite');
    await expect(loadTtf(face)).rejects.toThrow('HTML-Seite');
    const echt = { ...face, file: 'Inter-Regular.woff2', id: 'Inter-Regular' };
    await expect(loadWoff2(echt)).resolves.toBeInstanceOf(ArrayBuffer);
    await expect(loadTtf(echt)).resolves.toBeInstanceOf(ArrayBuffer);
  });
});

describe('die Ablage beim Start', () => {
  it('legt eine unlesbare Ablage beiseite und sagt es', async () => {
    localStorage.setItem('nz-themes:v1', '{kaputt');
    const m = await frisch();
    expect(m.start.unlesbar).toContain('ließen sich nicht lesen');
    expect(localStorage.getItem(m.UNLESBAR_KEY)).toBe('{kaputt');
    expect(localStorage.getItem(m.ABLAGE_KEY)).toBeNull();
  });

  it('schweigt beim allerersten Start', async () => {
    // Eine Meldung über etwas, das nie existiert hat, ist die Sorte Wächter,
    // die man abschaltet.
    const m = await frisch();
    expect(m.start).toEqual({ angemeldet: [], gescheitert: [], unlesbar: undefined });
  });

  it('wirft nie — ein kaputter Eintrag ruht und wird genannt', async () => {
    const leer = (await import('@/ci/entwurf')).leererEntwurf;
    localStorage.setItem(
      'nz-themes:v1',
      JSON.stringify({
        ohne: { ...probe({}, leer), id: 'ohne', wortmarke: null },
        kaputt: {
          ...probe({}, leer),
          id: 'kaputt',
          wortmarke: { svg: '<svg/>', dateiname: 'x', letters: '#000000', accent: '#FF0000' },
        },
        gut: { ...probe({}, leer), id: 'gut' },
      }),
    );
    const m = await frisch();
    expect(m.start.angemeldet).toEqual(['gut']);
    expect(m.start.gescheitert.map((g) => g.id).sort()).toEqual(['kaputt', 'ohne']);
    // Den Wert behalten, die Lücke zeigen: die ruhenden Einträge stehen noch da.
    expect(m.gemerkteSchluessel().sort()).toEqual(['gut', 'kaputt', 'ohne']);
  });

  it('lässt eine inzwischen mitgelieferte Marke gewinnen', async () => {
    const leer = (await import('@/ci/entwurf')).leererEntwurf;
    localStorage.setItem(
      'nz-themes:v1',
      JSON.stringify({ musterkunde: { ...probe({}, leer), id: 'musterkunde' } }),
    );
    const m = await frisch();
    expect(m.start.gescheitert[0]?.grund).toContain('mitgeliefert');
    m.setActiveTheme('musterkunde');
    expect(m.activeTheme().palette.signal).not.toBe('#E4003A');
  });
});
