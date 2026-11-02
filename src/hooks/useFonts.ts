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
import { schriftablageVersion, subscribeSchriftablage } from '@/theme/schriftablage';

export function useFontsVersion(): number {
  return useSyncExternalStore(subscribeFontsReady, fontsVersion, fontsVersion);
}

/**
 * Neu zeichnen, wenn ein Schnitt hochgeladen oder entfernt wurde.
 *
 * Für die Fläche reicht `useFontsVersion()`: ein neuer Schnitt geht über
 * `installWebfonts()` und zählt dort hoch. Wer aber *auflistet*, was in der
 * Ablage liegt — die Auswahl im Generator, die Liste der Erscheinungsbilder —,
 * hängt hieran, denn ein Schnitt, den keine gültige Marke benutzt, lädt nie.
 */
export function useSchriftablageVersion(): number {
  return useSyncExternalStore(subscribeSchriftablage, schriftablageVersion, schriftablageVersion);
}
