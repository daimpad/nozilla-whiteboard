/**
 * Die geführte Tour durch das Werkzeug — Bereich für Bereich durch das Fenster.
 *
 * Wie eine Tour sich benimmt, steht in `ui/Fuehrung.tsx`; hier stehen die
 * Schritte und das, was nur das Werkzeug hat: Leisten, die die Tour aufklappt,
 * bevor sie auf sie zeigt, und den Schalter im Store, an dem sie hängt.
 */
import { useCallback } from 'react';
import { useDeckStore } from '@/state/deckStore';
import { merkeTourGesehen, tourGesehen, type PanelName } from '@/state/workspace';
import { Fuehrung, FuehrungsAngebot, type FuehrungsSchritt } from '@/components/ui/Fuehrung';

export interface TourSchritt extends FuehrungsSchritt {
  /**
   * Die Leiste, in der das Ziel liegt. Ist sie zugeklappt, klappt die Tour sie
   * auf — sonst zeigte der Schritt auf einen Bereich, den es gerade nicht gibt.
   */
  leiste?: PanelName;
}

/**
 * Die Schritte, in der Reihenfolge, in der das Fenster gelesen wird: oben
 * von links nach rechts, dann die drei Spalten, dann der Vortrag.
 *
 * Die Sätze stehen hier und nicht in einer `.ts`-Datei daneben, und das ist
 * Absicht: `language.test.ts` liest die `.tsx`-Dateien, weil dort steht, was
 * gezeichnet wird. In einer `.ts` stünden sechzehn Absätze sichtbarer Text an
 * dem einen Ort, an dem das Sprachsieb nicht hinsieht.
 */
export const tourSchritte: readonly TourSchritt[] = [
  {
    ziel: null,
    titel: 'Willkommen',
    text: 'Hier entstehen Folien, die sich wie ein Whiteboard benehmen: den Text schreibst du in Markdown, alles andere legst du frei auf die Fläche. Herauskommen kann dabei nur Material, das der CI entspricht. Mit → und ← blätterst du durch die Tour, Esc beendet sie.',
  },
  {
    ziel: 'datei',
    titel: 'Datei',
    text: 'Ein neues Deck anfangen, eine Markdown-Datei öffnen (⌘O) oder sichern (⌘S), dazu zwei Beispiel-Decks. Darunter legst du im CI-Generator ein eigenes Erscheinungsbild an oder importierst eines. Was offen ist, sichert sich zusätzlich im Browser von selbst.',
  },
  {
    ziel: 'export',
    titel: 'Export',
    text: 'SVG und PNG einer Folie, das ganze Deck als PDF, ein Handout mit Notizen und PowerPoint. Jede Ausgabe läuft durch dieselbe Zeichenstrecke wie die Fläche — was du hier siehst, steht auch in der Datei.',
  },
  {
    ziel: 'einstellungen',
    titel: 'Einstellungen',
    text: 'Die Leisten hell, dunkel oder wie das System — das gilt nur für das Werkzeug und nie für die Folie. Hier startest du auch diese Tour wieder.',
  },
  {
    ziel: 'verlauf',
    titel: 'Rückgängig und Wiederholen',
    text: '⌘Z nimmt zurück, ⇧⌘Z stellt wieder her. Ein getipptes Wort ist dabei ein Schritt und nicht jeder Buchstabe einzeln.',
  },
  {
    ziel: 'deckwerkzeuge',
    titel: 'Folien, Übersicht, Suche, Prüfliste',
    text: 'Eine Folie anlegen (N), alle Folien auf einen Blick (⌘K) und im ganzen Deck suchen und ersetzen (⌘F). Die Prüfliste sammelt jede Warnung des Decks auf einer Liste: übervolle Kästen, unsichtbare Flächen, fehlende Bilder.',
  },
  {
    ziel: 'prompt',
    titel: 'Prompt',
    text: 'Ein Deck von einem Sprachmodell schreiben lassen: den Auftrag ausfüllen, den Prompt kopieren, die Antwort unten wieder einfügen — und das Deck ist offen. Der Prompt kennt genau das Dateiformat, das dieses Werkzeug liest.',
  },
  {
    ziel: 'ansicht',
    titel: 'Ansicht',
    text: 'Einrasten an Raster und Hilfslinien, das Raster zeigen (G) und die Zoomstufe: passend ins Fenster oder in voller Größe. Nichts davon landet in der Datei.',
  },
  {
    ziel: 'bibliothek',
    leiste: 'library',
    titel: 'Bausteine und Zeichen',
    text: 'Überschriften, Karten, Diagramme, Tabellen, Formen und Verbinder — und im zweiten Reiter die Zeichen des Erscheinungsbilds. Ein Klick setzt den Baustein auf die Folie. Der Ton darüber färbt alles, was eine eigene Fläche hat. ⌘1 klappt die Leiste zu und wieder auf.',
  },
  {
    ziel: 'flaeche',
    titel: 'Die Folie',
    text: 'Genau das, was ein Export zeigt. Elemente anklicken und ziehen, an den Griffen Größe und Drehung ändern; die Pfeiltasten schieben, ⌫ löscht. Ein Bild oder eine .md-Datei kannst du einfach ins Fenster ziehen.',
  },
  {
    ziel: 'filmstreifen',
    leiste: 'rail',
    titel: 'Filmstreifen',
    text: 'Alle Folien der Reihe nach. Ein Klick springt hin, Ziehen ordnet um, das Plus fügt eine Folie danach ein. ⌘2 klappt den Streifen zu.',
  },
  {
    ziel: 'inspektor',
    leiste: 'inspector',
    titel: 'Inspektor',
    text: 'Drei Reiter. Folie: Layout, Untergrund, Übergang, der Fließtext als Markdown und die Notizen für den Vortrag. Element: alles am ausgewählten Element — der Reiter folgt der Auswahl. Deck: Titel, Fußzeile, Erscheinungsbild und Folienformat. ⌘3 klappt ihn zu.',
  },
  {
    ziel: 'vortragen',
    titel: 'Vortragen',
    text: 'Zeigt das Deck im ganzen Fenster. Weiter mit → oder der Leertaste, N blendet die Notizen ein, F schaltet auf Vollbild, Esc führt zurück. Die Referentenansicht öffnet ein zweites Fenster mit Notizen und der nächsten Folie.',
  },
  {
    ziel: null,
    titel: 'Das war die Tour',
    text: 'Die wichtigsten Tasten stehen als Tabelle auf der letzten Folie des Beispiels „nozilla-Design" (Datei → Beispiele). Die Tour findest du jederzeit wieder unter dem Zahnrad.',
  },
];

export function Tour() {
  const schliessen = useDeckStore((state) => state.toggleTour);
  const panels = useDeckStore((state) => state.panels);
  const togglePanel = useDeckStore((state) => state.togglePanel);

  const beenden = useCallback(() => schliessen(false), [schliessen]);
  const merken = useCallback(() => merkeTourGesehen(), []);
  // Eine zugeklappte Leiste aufklappen, bevor auf sie gezeigt wird.
  const vorbereiten = useCallback(
    (schritt: TourSchritt) => {
      if (schritt.leiste && !panels[schritt.leiste]) togglePanel(schritt.leiste, true);
    },
    [panels, togglePanel],
  );

  return (
    <Fuehrung
      schritte={tourSchritte}
      beenden={beenden}
      merken={merken}
      vorbereiten={vorbereiten}
      anlass={panels}
    />
  );
}

export function TourAngebot() {
  const tourOpen = useDeckStore((state) => state.tourOpen);
  const starte = useDeckStore((state) => state.toggleTour);

  return (
    <FuehrungsAngebot
      anzahl={tourSchritte.length}
      gesehen={() => tourGesehen()}
      merken={() => merkeTourGesehen()}
      starten={() => starte(true)}
      verborgen={tourOpen}
      wiederfinden="Später findest du sie unter dem Zahnrad."
    />
  );
}
