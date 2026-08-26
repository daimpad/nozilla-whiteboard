/**
 * Der Griff, mit dem eine Leiste zu- und wieder aufgeht.
 *
 * Er sitzt **auf der Seite, die bleibt** — an der Kante der Fläche, nicht in
 * der Leiste. Das ist die eine Entscheidung, an der alles hängt: ein Griff in
 * der Bibliothek verschwände mit ihr, und es gäbe keinen Weg zurück außer über
 * die Tastatur. Deshalb liegt er absolut über der Fläche und wandert nicht mit.
 *
 * Er zeigt in die Richtung, in die er wirkt. Offen heißt „hier drückst du sie
 * weg", zu heißt „hier holst du sie zurück" — der Pfeil dreht sich, nicht die
 * Beschriftung. Ein Griff, dessen Zeichen immer gleich aussieht, muss gelesen
 * werden; einer, der zeigt, wohin es geht, nicht.
 */
import { useDeckStore } from '@/state/deckStore';
import type { PanelName } from '@/state/workspace';
import { cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

export type HandleSide = 'left' | 'right' | 'bottom';

/** Wohin der Pfeil zeigt: offen schiebt weg, zu holt zurück. */
const RICHTUNG: Record<
  HandleSide,
  {
    offen: 'chevron-left' | 'chevron-right' | 'chevron-down';
    zu: 'chevron-left' | 'chevron-right' | 'chevron-up';
  }
> = {
  left: { offen: 'chevron-left', zu: 'chevron-right' },
  right: { offen: 'chevron-right', zu: 'chevron-left' },
  bottom: { offen: 'chevron-down', zu: 'chevron-up' },
};

/**
 * Der Platz am Rand.
 *
 * Waagerecht in der Mitte der Höhe, senkrecht in der Mitte der Breite — dort
 * sucht die Hand, und dort liegt nichts von der Folie darunter.
 */
const PLATZ: Record<HandleSide, string> = {
  left: 'left-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-r-sm border-y border-r',
  right: 'right-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-l-sm border-y border-l',
  bottom: 'bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-t-sm border-x border-t',
};

export interface PanelHandleProps {
  panel: PanelName;
  side: HandleSide;
  /** Was zu- und aufgeht — steht in der Beschriftung und im Titel. */
  name: string;
  /** Die Tastenkombination, damit sie im Titel mitkommt. */
  shortcut: string;
}

export function PanelHandle({ panel, side, name, shortcut }: PanelHandleProps) {
  const offen = useDeckStore((state) => state.panels[panel]);
  const togglePanel = useDeckStore((state) => state.togglePanel);

  const label = `${name} ${offen ? 'einklappen' : 'ausklappen'} (${shortcut})`;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-expanded={offen}
      data-panel-handle={panel}
      onClick={() => togglePanel(panel)}
      className={cx(
        'absolute z-chrome flex items-center justify-center border-ui bg-ui-surface',
        'text-ui-faint transition-colors duration-fast ease-standard',
        'hover:bg-ui-sunken hover:text-ui-ink',
        PLATZ[side],
      )}
    >
      <Icon name={offen ? RICHTUNG[side].offen : RICHTUNG[side].zu} size={12} />
    </button>
  );
}
