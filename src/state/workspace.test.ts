import { beforeEach, describe, expect, it } from 'vitest';
import { OPEN, panelNames, readPanels, writePanels } from './workspace';

const SCHLUESSEL = 'nz-panels';

describe('welche Leisten offen stehen', () => {
  beforeEach(() => localStorage.clear());

  it('steht beim ersten Mal alles offen', () => {
    // Keine Vorliebe, sondern Bedingung: wer das Werkzeug zum ersten Mal
    // öffnet, muss die Bibliothek sehen, sonst ist die Fläche eine leere
    // Fläche.
    expect(readPanels()).toEqual({ library: true, inspector: true, rail: true });
    expect(readPanels()).toEqual(OPEN);
  });

  it('merkt sich, was zugeklappt wurde', () => {
    writePanels({ library: false, inspector: true, rail: false });
    expect(readPanels()).toEqual({ library: false, inspector: true, rail: false });
  });

  it('öffnet, was es nicht versteht', () => {
    /*
       Ein halb geschriebener oder alter Eintrag soll eine Leiste öffnen, nicht
       das Werkzeug lahmlegen. Der schlimmste Fall hier ist eine Leiste zu
       viel — der schlimmste Fall bei einem Wurf wäre ein weißes Fenster.
    */
    for (const roh of ['[]', 'null', '{"library":"ja"}', 'kein JSON', '{']) {
      localStorage.setItem(SCHLUESSEL, roh);
      const gelesen = readPanels();
      for (const name of panelNames) expect(gelesen[name], `${roh} · ${name}`).toBe(true);
    }
  });

  it('behält den Teil, der lesbar ist', () => {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ rail: false, quatsch: 1 }));
    expect(readPanels()).toEqual({ library: true, inspector: true, rail: false });
  });

  it('gibt bei jedem Lesen ein eigenes Objekt zurück', () => {
    // `OPEN` ist die Vorlage und darf nicht das sein, was der Store hält —
    // sonst schriebe ein Umschalten in die Vorlage.
    const eins = readPanels();
    eins.library = false;
    expect(readPanels().library).toBe(true);
    expect(OPEN.library).toBe(true);
  });
});
