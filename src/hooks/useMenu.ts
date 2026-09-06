/**
 * Ein Menü der Kopfleiste — auf, zu, und beides auch ohne Maus.
 *
 * Die drei Menüs der Leiste — Datei, Export, Einstellungen — machten dasselbe
 * dreimal, und zwei davon machten es unvollständig. Gemessen im Browser:
 *
 *   Datei          offen · nach Esc: offen · aria-expanded: nichts
 *   Export         offen · nach Esc: offen · aria-expanded: nichts
 *   Einstellungen  offen · nach Esc: zu    · aria-expanded: nichts
 *
 * Zwei von drei ließen sich mit der Tastatur nicht wieder schließen, und
 * keines sagte einer Hilfstechnik, dass es überhaupt ein Menü ist: die
 * Knöpfe trugen weder `aria-haspopup` noch `aria-expanded`. Vor Augen steht
 * dieser Unterschied nie — man sieht das Feld ja aufgehen.
 *
 * Deshalb eine Rechnung mit drei Kunden. Eine Liste von Stellen, an denen man
 * an `Escape` denken *muss*, ist eine Liste von Stellen, an denen man es
 * vergisst — dieselbe Antwort wie bei `withElements()` und `darfErsetzen()`.
 *
 * ## Zwei Kleinigkeiten, die daran hängen
 *
 * **Der Fokus kommt zurück.** Wer ein Menü mit der Tastatur öffnet und mit
 * `Escape` schließt, stünde sonst auf `<body>`, und das nächste `Tab` finge
 * wieder ganz vorn an. Dieselbe Überlegung wie bei der Schrittleiste des
 * CI-Generators.
 *
 * **Und `Escape` gehört dem Obersten.** `useKeyboardShortcuts` räumt mit
 * derselben Taste die Schichten des Werkzeugs ab — Suche, Prüfliste, Prompt,
 * Übersicht, Vortrag, Auswahl. Solange ein Menü offen steht, liegt es darüber,
 * also endet das Ereignis hier: sonst schlösse ein `Escape` das Menü *und*
 * gäbe die Auswahl auf der Folie frei, und von den beiden hat niemand das
 * zweite gemeint.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Menue<T extends HTMLElement> {
  offen: boolean;
  /** An die Hülle aus Knopf und Feld — sie entscheidet, was „daneben" ist. */
  huelle: React.RefObject<T>;
  /** Auf den Knopf, damit der Fokus nach `Escape` zurückfindet. */
  knopf: React.RefObject<HTMLButtonElement>;
  schliessen: () => void;
  /** Auf den Knopf legen: Zustand, Ansage und das Umschalten. */
  knopfProps: {
    ref: React.RefObject<HTMLButtonElement>;
    active: boolean;
    'aria-haspopup': 'menu' | 'dialog';
    'aria-expanded': boolean;
    'aria-pressed': undefined;
    onClick: () => void;
  };
}

export function useMenu<T extends HTMLElement = HTMLDivElement>(
  art: 'menu' | 'dialog' = 'menu',
): Menue<T> {
  const [offen, setOffen] = useState(false);
  const huelle = useRef<T>(null);
  const knopf = useRef<HTMLButtonElement>(null);

  const schliessen = useCallback(() => setOffen(false), []);

  useEffect(() => {
    if (!offen) return;
    const daneben = (event: MouseEvent) => {
      if (!huelle.current?.contains(event.target as Node)) setOffen(false);
    };
    const taste = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOffen(false);
      knopf.current?.focus();
    };
    document.addEventListener('mousedown', daneben);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('mousedown', daneben);
      document.removeEventListener('keydown', taste);
    };
  }, [offen]);

  return {
    offen,
    huelle,
    knopf,
    schliessen,
    knopfProps: {
      ref: knopf,
      active: offen,
      'aria-haspopup': art,
      'aria-expanded': offen,
      /*
         `IconButton` setzt von Haus aus `aria-pressed={active}` — das ist die
         Ansage eines Schalters und nicht die eines Menüknopfes, und beide
         zugleich widersprechen sich. Hier wird sie deshalb ausdrücklich
         zurückgenommen; das Spreizen der Rest-Eigenschaften steht in
         `controls.tsx` hinter dem `aria-pressed`, also gewinnt dieser Wert.
      */
      'aria-pressed': undefined,
      onClick: () => setOffen((wert) => !wert),
    },
  };
}
