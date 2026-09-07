/**
 * Die Prüfliste für das ganze Deck.
 *
 * Acht Warnungen rechnete das Werkzeug schon, und alle acht standen im
 * Inspektor — also nur dort zu sehen, wo zufällig das richtige Element auf der
 * richtigen Folie ausgewählt war. Wer ein Deck von dreißig Folien übergibt,
 * hat sie nie alle gesehen. Diese Liste sammelt sie ein; gerechnet wird
 * nichts Neues, siehe `lib/deckPruefung.ts`.
 *
 * Ein Klick springt auf die Folie **und** wählt das Element aus. Ohne das
 * zweite führt ein Befund auf eine Folie mit zehn Elementen, und das gemeinte
 * sucht man von Hand — dieselbe Rückzahlung wie der Anker im CI-Generator.
 */
import { useMemo } from 'react';
import { pruefeDeck, zaehleBefunde, type DeckBefund, type Rang } from '@/lib/deckPruefung';
import { slideTitle } from '@/model/types';
import { zaehle } from '@/lib/labels';
import { useDeckStore } from '@/state/deckStore';
import { useFontsVersion } from '@/hooks/useFonts';
import { useThemeVersion } from '@/hooks/useTheme';
import { useImageSizes } from '@/hooks/useImageSizes';
import { useFolienformatVersion } from '@/hooks/useFolienformat';
import { IconButton, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import type { ToolIconName } from '@/assets/icons';

/** Wie ein Rang heißt und aussieht. Die Reihenfolge ist die der Schwere. */
const RANG: Record<Rang, { wort: string; icon: ToolIconName; ton: string }> = {
  fehler: { wort: 'Nicht zu sehen', icon: 'triangle-exclamation', ton: 'text-ui-warn' },
  warnung: { wort: 'Läuft, ist aber falsch', icon: 'triangle-exclamation', ton: 'text-ui-warn' },
  hinweis: { wort: 'Zu wissen', icon: 'circle-info', ton: 'text-ui-faint' },
};

export function PruefPanel() {
  const deck = useDeckStore((state) => state.deck);
  const close = useDeckStore((state) => state.togglePruefung);
  const goTo = useDeckStore((state) => state.goTo);
  const select = useDeckStore((state) => state.select);
  const clearSelection = useDeckStore((state) => state.clearSelection);

  /*
     Drei der Rechnungen dahinter hängen nicht am Deck allein: an der echten
     Schrift, am Erscheinungsbild, an eingetroffenen Bildmaßen — und wogegen
     der Fließtext gemessen wird, am Folienformat. Ohne diese vier Zähler
     stünde hier eine Liste, die einmal gerechnet wurde und danach steht.
  */
  useFontsVersion();
  useThemeVersion();
  useImageSizes(deck);
  useFolienformatVersion();

  const befunde = useMemo(() => pruefeDeck(deck), [deck]);
  const zahl = zaehleBefunde(befunde);

  const hin = (befund: DeckBefund) => {
    goTo(befund.folie);
    if (befund.element) select([befund.element]);
    else clearSelection();
  };

  return (
    <div
      className="absolute right-3 top-3 z-popover w-[26rem] animate-pop-in"
      role="dialog"
      aria-label="Prüfliste des Decks"
    >
      <div className="nz-panel overflow-hidden shadow-ui-xl">
        <div className="flex items-center gap-2 border-b border-ui px-3 py-2">
          <h2 className="flex-1 text-ui-title font-semibold">Prüfliste</h2>
          <IconButton icon="xmark" label="Prüfliste schließen (Esc)" onClick={() => close(false)} />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {befunde.length === 0 ? (
            <p className="px-3 py-3 text-ui-body text-ui-faint">
              Nichts zu beanstanden. Geprüft wird, was in keiner Ausgabe zu sehen wäre, was anders
              herauskommt als es aussieht, und was einer Hilfstechnik fehlt.
            </p>
          ) : (
            <ul>
              {befunde.map((befund, index) => (
                <li key={`${befund.folie}-${befund.element ?? 'folie'}-${index}`}>
                  <button
                    type="button"
                    onClick={() => hin(befund)}
                    className={cx(
                      'block w-full px-3 py-2 text-left transition-colors duration-fast',
                      'hover:bg-ui-subtle',
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="tabular-nums text-ui-label font-semibold text-ui-faint">
                        {befund.folie + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-ui-label uppercase tracking-wide text-ui-faint">
                          <Icon
                            name={RANG[befund.rang].icon}
                            size={12}
                            className={RANG[befund.rang].ton}
                          />
                          {RANG[befund.rang].wort} ·{' '}
                          {slideTitle(deck.slides[befund.folie], befund.folie)}
                        </span>
                        <span className="block text-ui-body text-ui-muted">{befund.text}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {befunde.length > 0 ? (
          <p className="border-t border-ui px-3 py-1.5 text-ui-label text-ui-faint">
            {zahl.fehler > 0 ? `${zaehle(zahl.fehler, 'Fehler', 'Fehler')} · ` : ''}
            {zahl.warnung > 0 ? `${zaehle(zahl.warnung, 'Warnung', 'Warnungen')} · ` : ''}
            {zaehle(zahl.hinweis, 'Hinweis', 'Hinweise')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
