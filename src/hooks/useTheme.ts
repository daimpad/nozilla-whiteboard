import { useSyncExternalStore } from 'react';
import { subscribeTheme, themeVersion } from '@/theme';

/**
 * Ein Zähler, der bei jedem Wechsel des Erscheinungsbilds steigt.
 *
 * Die Fläche zeichnet aus gemerkten Werten (`useMemo`); ohne eine
 * Zustandsänderung bliebe nach einem Wechsel das alte Markup stehen. Derselbe
 * Griff wie bei den Schriften — und aus demselben Grund.
 */
export function useThemeVersion(): number {
  return useSyncExternalStore(subscribeTheme, themeVersion, themeVersion);
}
