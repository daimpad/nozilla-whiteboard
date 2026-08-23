/**
 * Neu zeichnen, wenn die Erscheinung der Oberfläche wechselt.
 *
 * Die Farben selbst laufen über CSS-Variablen und brauchen React nicht — was
 * ihn braucht, ist die Einstellung: das Zahnrad muss zeigen, was gerade
 * gewählt ist, und bei „System" auch dann folgen, wenn das Betriebssystem
 * abends umschaltet.
 */
import { useSyncExternalStore } from 'react';
import { subscribeSurface, surface, surfaceMode, surfaceVersion } from '@/theme';
import type { Surface, SurfaceMode } from '@/theme';

export function useSurface(): { mode: SurfaceMode; resolved: Surface } {
  useSyncExternalStore(subscribeSurface, surfaceVersion, surfaceVersion);
  return { mode: surfaceMode(), resolved: surface() };
}
