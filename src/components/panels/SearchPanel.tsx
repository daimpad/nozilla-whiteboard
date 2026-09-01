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
import { searchDeck, zaehleFunde, type Treffer } from '@/lib/search';
import { slideTitle } from '@/model/types';
import { zaehle } from '@/lib/labels';
import { useDeckStore } from '@/state/deckStore';
import { Button, IconButton, cx } from '@/components/ui/controls';

/** „1 Folie" und „4 Folien" — Deutsch zählt anders als eine Zeichenkette. */
export function SearchPanel() {
  const deck = useDeckStore((state) => state.deck);
  const close = useDeckStore((state) => state.toggleSearch);
  const goTo = useDeckStore((state) => state.goTo);
  const select = useDeckStore((state) => state.select);
  const clearSelection = useDeckStore((state) => state.clearSelection);

  const ersetzeImDeck = useDeckStore((state) => state.ersetzeImDeck);

  const [frage, setFrage] = useState('');
  const [ersatz, setErsatz] = useState('');
  /** Was das letzte Ersetzen bewirkt hat — sonst sieht man nur, dass die Liste leer wird. */
  const [bilanz, setBilanz] = useState<string | null>(null);
  const feld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    feld.current?.focus();
    feld.current?.select();
  }, []);

  const treffer = useMemo(() => searchDeck(deck, frage), [deck, frage]);
  /*
     Die Liste zeigt eine Zeile je *Feld*; ersetzt wird jedes *Vorkommen*.
     „Zwiebelsuppe und Zwiebelbrot" steht in einem Feld — eine Zeile, zwei
     Ersetzungen. Der Knopf nennt deshalb diese Zahl und nicht die Länge der
     Liste: einer, der eine Zahl nennt und eine andere tut, ist schlimmer als
     einer ohne Zahl.
  */
  const funde = useMemo(() => zaehleFunde(deck, frage), [deck, frage]);

  const ersetzen = () => {
    const anzahl = ersetzeImDeck(frage.trim(), ersatz);
    setBilanz(
      anzahl === 0
        ? 'Nichts zu ersetzen.'
        : `${zaehle(anzahl, 'Stelle', 'Stellen')} ersetzt. ⌘Z nimmt es in einem Zug zurück.`,
    );
  };

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
            onChange={(event) => {
              setFrage(event.target.value);
              setBilanz(null);
            }}
          />
          <IconButton icon="xmark" label="Suche schließen (Esc)" onClick={() => close(false)} />
        </div>

        {/*
           Ersetzen steht unter dem Suchfeld und nicht daneben: es ist der
           seltenere Handgriff, und wer nur sucht, soll nicht an ihm
           vorbeitippen. Der Knopf sagt die Zahl mit, denn „Alle ersetzen" ohne
           sie ist ein Sprung ins Dunkle.
        */}
        <div className="flex items-center gap-2 border-b border-ui px-3 py-2">
          <input
            className="nz-field flex-1"
            value={ersatz}
            placeholder="Ersetzen durch"
            aria-label="Ersetzen durch"
            onChange={(event) => {
              setErsatz(event.target.value);
              setBilanz(null);
            }}
          />
          <Button
            icon="check"
            onClick={ersetzen}
            disabled={treffer.length === 0}
            title="Ersetzt jeden Fund im ganzen Deck — Groß und Klein bleiben unbeachtet."
          >
            {funde > 0 ? `Alle ${funde}` : 'Alle'}
          </Button>
        </div>

        {bilanz ? (
          <p className="border-b border-ui px-3 py-1.5 text-ui-label text-ui-muted">{bilanz}</p>
        ) : null}

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
            {zaehle(funde, 'Fundstelle', 'Fundstellen')} auf{' '}
            {zaehle(new Set(treffer.map((fund) => fund.slideIndex)).size, 'Folie', 'Folien')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
