/**
 * Eine Schicht, die aufgeht, gibt den Fokus zurück, wenn sie zugeht.
 *
 * Der Grund steht schon im Kopf von `useMenu()` und gilt hier genauso: wer
 * eine Schicht mit der Tastatur öffnet und mit `Escape` schließt, stünde
 * sonst auf `<body>`, und das nächste `Tab` finge wieder ganz vorn an — bei
 * einem Fenster mit vier Leisten sind das zwei Dutzend Anschläge zurück an
 * die Stelle, an der man war.
 *
 * Gemessen im Browser, an allen vier Schichten:
 *
 *   Übersicht (⌘K)     offen: BODY                     nach Esc: BODY
 *   Prüfliste          offen: BUTTON [Prüfliste]       nach Esc: BUTTON [Prüfliste]
 *   Prompt-Generator   offen: TEXTAREA                 nach Esc: BODY
 *   Suche (⌘F)         offen: INPUT [Im Deck suchen]   nach Esc: BODY
 *
 * Die beiden unteren nehmen den Fokus und geben ihn nicht zurück; die beiden
 * oberen nehmen ihn gar nicht erst. Dieser Haken gilt deshalb genau denen,
 * die ihn nehmen — und weil es zwei sind und nicht einer, steht er hier und
 * nicht zweimal in einer Komponente. Eine Liste von Stellen, an denen man
 * daran denken *muss*, ist eine Liste von Stellen, an denen man es vergisst.
 *
 * Zurückgegeben wird nur an ein Element, das es noch gibt: `isConnected`
 * fragt danach. Ein Knopf, der die Schicht geöffnet hat und dabei selbst
 * verschwunden ist, bekäme sonst einen Fokus, den niemand sieht.
 */
import { useEffect } from 'react';

export function useFokusZurueck(): void {
  useEffect(() => {
    const vorher = document.activeElement;
    return () => {
      if (vorher instanceof HTMLElement && vorher.isConnected) vorher.focus();
    };
  }, []);
}
