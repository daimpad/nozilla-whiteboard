/**
 * Die Suche im Deck.
 *
 * Ein Feld und eine Liste. Ein Treffer nennt die Folie, die Fundstelle und den
 * Ausschnitt drumherum — und ein Klick bringt einen dorthin, mit dem Element
 * schon ausgewählt.
 *
 * Die Suche des Browsers täte es nicht: sie fände nur, was gerade auf dem
 * Bildschirm steht, und das ist die eine Folie, die man ohnehin sieht.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchDeck, type Treffer } from '@/lib/search';
import { slideTitle } from '@/model/types';
import { useDeckStore } from '@/state/deckStore';
import { IconButton, cx } from '@/components/ui/controls';

/** „1 Folie" und „4 Folien" — Deutsch zählt anders als eine Zeichenkette. */
function zaehle(anzahl: number, eins: string, viele: string): string {
  return `${anzahl} ${anzahl === 1 ? eins : viele}`;
}

export function SearchPanel() {
  const deck = useDeckStore((state) => state.deck);
  const close = useDeckStore((state) => state.toggleSearch);
  const goTo = useDeckStore((state) => state.goTo);
  const select = useDeckStore((state) => state.select);
  const clearSelection = useDeckStore((state) => state.clearSelection);

  const [frage, setFrage] = useState('');
  const feld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    feld.current?.focus();
    feld.current?.select();
  }, []);

  const treffer = useMemo(() => searchDeck(deck, frage), [deck, frage]);

  const hin = (fund: Treffer) => {
    goTo(fund.slideIndex);
    if (fund.elementId) select([fund.elementId]);
    else clearSelection();
  };

  return (
    <div className="absolute right-3 top-3 z-popover w-[26rem] animate-pop-in">
      <div className="nz-panel overflow-hidden shadow-ui-xl">
        <div className="flex items-center gap-2 border-b border-ui px-3 py-2">
          <input
            ref={feld}
            className="nz-field flex-1"
            value={frage}
            placeholder="Im Deck suchen"
            aria-label="Im Deck suchen"
            onChange={(event) => setFrage(event.target.value)}
          />
          <IconButton icon="xmark" label="Suche schließen (Esc)" onClick={() => close(false)} />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {frage.trim().length < 2 ? (
            <p className="px-3 py-3 text-ui-body text-ui-faint">
              Mindestens zwei Zeichen. Gesucht wird im Fließtext, in den Notizen und in jedem
              Textfeld jedes Elements.
            </p>
          ) : treffer.length === 0 ? (
            <p className="px-3 py-3 text-ui-body text-ui-faint">Nichts gefunden.</p>
          ) : (
            <ul>
              {treffer.map((fund, index) => (
                <li key={`${fund.slideIndex}-${fund.elementId ?? fund.wo}-${index}`}>
                  <button
                    type="button"
                    onClick={() => hin(fund)}
                    className={cx(
                      'block w-full px-3 py-2 text-left transition-colors duration-fast',
                      'hover:bg-ui-subtle',
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="tabular-nums text-ui-label font-semibold text-ui-faint">
                        {fund.slideIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui-label uppercase tracking-wide text-ui-faint">
                          {fund.feld} · {slideTitle(deck.slides[fund.slideIndex], fund.slideIndex)}
                        </span>
                        <span className="block truncate text-ui-body text-ui-muted">
                          {fund.vorher}
                          <mark className="bg-ui-accent px-0.5 text-ui-on-accent">
                            {fund.treffer}
                          </mark>
                          {fund.nachher}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {treffer.length > 0 ? (
          <p className="border-t border-ui px-3 py-1.5 text-ui-label text-ui-faint">
            {zaehle(treffer.length, 'Treffer', 'Treffer')} auf{' '}
            {zaehle(new Set(treffer.map((fund) => fund.slideIndex)).size, 'Folie', 'Folien')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
