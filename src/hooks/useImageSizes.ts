/**
 * Die Bildmaße für die Fläche — als Zähler, an dem die Merker hängen.
 *
 * Dieselbe Bauart wie `useFontsVersion()` und `useThemeVersion()`, und aus
 * demselben Grund: die Fläche zeichnet aus `useMemo`, und ohne eine
 * Zustandsänderung bliebe das alte Markup stehen, wenn die Maße eintreffen.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { Deck } from '@/model/types';
import {
  bildmasseVersion,
  collectImageSources,
  fordereBildmasse,
  subscribeBildmasse,
} from '@/lib/export/images';

export function useImageSizes(deck: Deck): number {
  const version = useSyncExternalStore(subscribeBildmasse, bildmasseVersion, bildmasseVersion);

  useEffect(() => {
    fordereBildmasse(collectImageSources(deck));
  }, [deck]);

  return version;
}
