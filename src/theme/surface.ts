/**
 * Wie das *Werkzeug* aussieht — hell oder dunkel.
 *
 * Das ist ausdrücklich nicht dasselbe wie `runtime.ts`. Dort steht, welches
 * Erscheinungsbild auf der **Folie** gilt; hier steht, wie die Leisten um die
 * Folie herum aussehen. Die beiden dürfen sich nicht berühren, und deshalb
 * sind es zwei Dateien:
 *
 *   Ein Erscheinungsbild gehört dem Deck und steht im Frontmatter — wer die
 *   `.md` weitergibt, gibt es mit. Die Erscheinung der Oberfläche gehört dem
 *   Menschen vor dem Bildschirm und bleibt in seinem Browser. Sie in einer
 *   Datei mitzuschicken wäre so falsch wie umgekehrt.
 *
 * ## Was der Wechsel nicht anfasst
 *
 * Die Folie. Kein Wert aus `palette`, `color` oder `elementTones` wird hier
 * berührt, und kein Export sieht je einen dieser Werte — sonst käme dieselbe
 * Datei je nach Einstellung anders heraus.
 *
 * Auch drei Werte der Oberfläche bleiben: `select`, `selectWash` und `grid`.
 * Sie werden *auf* der Folie gezeichnet — Auswahlrahmen, Aufziehrechteck,
 * Rasterpunkte — und ein weißer Rahmen auf cremefarbenem Papier wäre
 * unsichtbar. Sie stehen in `uiDark` bewusst nicht drin.
 */
import { ui, uiDark, uiShadow, uiShadowDark } from '@theme';

export const surfaceModes = ['system', 'light', 'dark'] as const;
export type SurfaceMode = (typeof surfaceModes)[number];
export type Surface = 'light' | 'dark';

const STORAGE_KEY = 'nz-surface';
const QUERY = '(prefers-color-scheme: dark)';

/* -------------------------------------------------------------------------- */
/* Der gewählte Modus                                                          */
/* -------------------------------------------------------------------------- */

let mode: SurfaceMode = read();

function read(): SurfaceMode {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSurfaceMode(stored) ? stored : 'system';
  } catch {
    // Ein Browser mit gesperrtem Speicher ist kein Grund, gar nicht zu starten.
    return 'system';
  }
}

export function isSurfaceMode(value: unknown): value is SurfaceMode {
  return typeof value === 'string' && (surfaceModes as readonly string[]).includes(value);
}

export function surfaceMode(): SurfaceMode {
  return mode;
}

export function setSurfaceMode(next: SurfaceMode): void {
  if (next === mode) return;
  mode = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nicht merken zu können ist ärgerlich, aber kein Fehler.
  }
  announce();
}

/** Was daraus gerade folgt — `system` fragt den Browser. */
export function surface(): Surface {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

/* -------------------------------------------------------------------------- */
/* Die Belegung                                                                */
/* -------------------------------------------------------------------------- */

/** Die Belegung der Oberfläche, wie sie gerade gilt. */
export type UiTokens = Record<keyof typeof ui, string>;
export type UiShadows = Record<keyof typeof uiShadow, string>;

export function activeUi(): UiTokens {
  return surface() === 'dark' ? uiDark : ui;
}

export function activeUiShadow(): UiShadows {
  return surface() === 'dark' ? uiShadowDark : uiShadow;
}

/* -------------------------------------------------------------------------- */
/* Das Signal für die Oberfläche                                               */
/* -------------------------------------------------------------------------- */

let version = 0;
const listeners = new Set<() => void>();

export function subscribeSurface(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function surfaceVersion(): number {
  return version;
}

function announce(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/**
 * Auf den Systemwechsel hören.
 *
 * Ohne das bliebe eine Einstellung „System" bei dem stehen, was beim Laden
 * galt — und genau dann fällt es auf, wenn abends das Betriebssystem
 * umschaltet und das Werkzeug als Einziges hell bleibt.
 */
export function watchSystemSurface(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(QUERY);
  const onChange = () => {
    if (mode === 'system') announce();
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
