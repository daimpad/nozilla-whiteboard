/**
 * Welche Leisten offen stehen — und warum das nicht ins Deck gehört.
 *
 * Bibliothek, Inspektor und Filmstreifen nehmen zusammen 568 Pixel Breite und
 * 104 Pixel Höhe. Auf einem Laptop ist das gut ein Drittel des Fensters, und
 * wer eine Folie ansieht statt sie zu bauen, braucht davon nichts.
 *
 * Der Zustand gehört dem **Arbeitsplatz**, nicht der Datei — dieselbe Grenze
 * wie bei der Erscheinung des Werkzeugs in `theme/surface.ts`. Ein
 * Erscheinungsbild steht im Frontmatter, weil es dem Deck gehört; ob jemand
 * seinen Inspektor zugeklappt hat, gehört ihm allein. Stünde es in der `.md`,
 * öffnete der Nächste die Datei und fände seine Leisten zu.
 *
 * Gehalten wird der Zustand deshalb im Store — dort, wo auch `overviewOpen`
 * und `searchOpen` liegen —, gemerkt wird er hier. Ein Browser mit gesperrtem
 * Speicher ist kein Grund, gar nicht zu starten; dann steht eben jedes Mal
 * alles offen.
 */

export const panelNames = ['library', 'inspector', 'rail'] as const;
export type PanelName = (typeof panelNames)[number];

/** Offen für alle drei — die Voreinstellung, und sie ist keine Geschmacksfrage. */
export type PanelState = Record<PanelName, boolean>;

const STORAGE_KEY = 'nz-panels';

/**
 * Offen ist die Voreinstellung.
 *
 * Nicht aus Vorliebe: wer das Werkzeug zum ersten Mal öffnet, muss die
 * Bibliothek sehen, sonst ist die Fläche eine leere Fläche. Und der Rauchtest
 * greift an zwölf Stellen in die drei Bereiche — eine zugeklappte
 * Voreinstellung nähme ihm auf einen Schlag die Hälfte seiner Griffe.
 */
export const OPEN: PanelState = { library: true, inspector: true, rail: true };

export function readPanels(): PanelState {
  if (typeof localStorage === 'undefined') return { ...OPEN };
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (!roh) return { ...OPEN };
    const gelesen: unknown = JSON.parse(roh);
    if (!gelesen || typeof gelesen !== 'object') return { ...OPEN };

    // Jeder Name einzeln geprüft: ein alter oder halb geschriebener Eintrag
    // soll eine Leiste öffnen, nicht das Werkzeug lahmlegen.
    const eintrag = gelesen as Record<string, unknown>;
    return Object.fromEntries(
      panelNames.map((name) => [name, typeof eintrag[name] === 'boolean' ? eintrag[name] : true]),
    ) as PanelState;
  } catch {
    return { ...OPEN };
  }
}

export function writePanels(panels: PanelState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  } catch {
    // Gesperrter Speicher: dann merkt es sich das Fenster eben nur für diese
    // Sitzung. Ein Fehler ist das nicht.
  }
}
