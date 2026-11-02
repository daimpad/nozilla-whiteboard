/**
 * Die geführte Tour durch den CI-Generator.
 *
 * Eine eigene Tour und nicht drei Schritte mehr in der des Werkzeugs: der
 * Generator ist eine eigene Seite in einem eigenen Tab, und wer ihn öffnet,
 * steht vor acht Reitern, einer Folie und einer Liste von Befunden — dem
 * erklärungsbedürftigsten Teil des ganzen Werkzeugs. Wie die Tour sich
 * benimmt, steht in `ui/Fuehrung.tsx`; hier stehen nur die Schritte.
 *
 * Die Sätze stehen in einer `.tsx`, weil `language.test.ts` nur dort liest,
 * wo gezeichnet wird.
 */
import { useCallback } from 'react';
import { merkeTourGesehen, tourGesehen, TOUR_CI_KEY } from '@/state/workspace';
import { Fuehrung, FuehrungsAngebot, type FuehrungsSchritt } from '@/components/ui/Fuehrung';

export const ciTourSchritte: readonly FuehrungsSchritt[] = [
  {
    ziel: null,
    titel: 'Ein eigenes Erscheinungsbild',
    text: 'Hier legst du die CI einer Marke an: Farben, Schriften, Größen, Wortmarke und Zeichen. Gefragt wird nur, was sich nicht rechnen lässt — aus sechzehn Farben entstehen alle Töne, die eine Folie braucht. Mit → und ← blätterst du durch die Tour, Esc beendet sie.',
  },
  {
    ziel: 'ci-schritte',
    titel: 'Acht Schritte',
    text: 'Von „Anfang" bis „Fertig", in beliebiger Reihenfolge anspringbar. Die Zahl an einem Reiter sagt, wie viele Befunde dort noch offen sind. Mit der Tastatur: einmal Tab auf die Leiste, dann ← und →.',
  },
  {
    ziel: 'ci-formular',
    titel: 'Der Schritt',
    text: 'Die Felder des offenen Schritts, und unter jedem steht, wofür die Rolle da ist. Im ersten Schritt wählst du: von Hand ausfüllen, vorbelegt mit der nozilla-CI — oder ein Sprachmodell füllt die Felder aus deinen Richtlinien oder einer vorhandenen Präsentation aus, und du übernimmst nur, was stimmt.',
  },
  {
    ziel: 'ci-vorschau',
    titel: 'Die Probefolie',
    text: 'Eine echte Folie, gezeichnet über dieselbe Strecke wie im Werkzeug und in jedem Export. Mit den Pfeilen darüber blätterst du durch die Probefolien; zusammen zeigen sie jede Rolle, die eine Folie überhaupt zeigen kann.',
  },
  {
    ziel: 'ci-pruefliste',
    titel: 'Die Prüfliste',
    text: 'Jede Regel, die ein Erscheinungsbild bestehen muss, in drei Rängen: „Fehler" hält die Datei auf, „Läuft, ist aber falsch" verdient den zweiten Blick, „Zu wissen" ist Auskunft. Neben jedem Befund führt ein Knopf zu der Stelle, um die es geht.',
  },
  {
    ziel: 'ci-entwurf',
    titel: 'Den Entwurf sichern',
    text: 'Der Entwurf übersteht ein Neuladen dieses Tabs von selbst. Als Datei sicherst du ihn mit „Entwurf sichern" — für einen anderen Rechner, für jemand anderen oder für später — und holst ihn mit „Entwurf laden" zurück. „Zurücksetzen" fängt von vorn an und fragt vorher; „Zurück zum Werkzeug" führt zu deinem Deck, das dabei unberührt bleibt.',
  },
  {
    ziel: null,
    titel: 'Und am Ende',
    text: 'Im Schritt „Fertig" entsteht die Designdatei für das Repo — oder du nimmst die .nzci.json und importierst sie im Werkzeug unter Datei → Erscheinungsbilder…, ganz ohne Build. Beides geht erst, wenn kein Fehler mehr in der Prüfliste steht. Die Tour findest du jederzeit wieder oben über „Tour".',
  },
];

export function CiTour({ beenden }: { beenden: () => void }) {
  const merken = useCallback(() => merkeTourGesehen(TOUR_CI_KEY), []);
  return <Fuehrung schritte={ciTourSchritte} beenden={beenden} merken={merken} />;
}

export function CiTourAngebot({ starten, verborgen }: { starten: () => void; verborgen: boolean }) {
  return (
    <FuehrungsAngebot
      anzahl={ciTourSchritte.length}
      gesehen={() => tourGesehen(TOUR_CI_KEY)}
      merken={() => merkeTourGesehen(TOUR_CI_KEY)}
      starten={starten}
      verborgen={verborgen}
      wiederfinden="Später findest du sie oben über „Tour“."
    />
  );
}
