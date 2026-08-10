/**
 * Neu zeichnen, wenn die Marken-Schriften angekommen sind.
 *
 * Der Setzer misst gegen die echte Schrift und gibt Wörter an absoluten
 * Positionen aus. Wer vor dem Laden misst, misst die Ersatzschrift — und die
 * Positionen bleiben falsch, bis jemand neu baut. Genau das löst dieser Haken
 * aus; das Warum steht ausführlich in `src/theme/fonts.ts`.
 */
import { useSyncExternalStore } from 'react';
import { fontsVersion, subscribeFontsReady } from '@/theme/fonts';

export function useFontsVersion(): number {
  return useSyncExternalStore(subscribeFontsReady, fontsVersion, fontsVersion);
}
