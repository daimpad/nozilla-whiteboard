/**
 * Die geführte Tour — Bereich für Bereich durch das Fenster.
 *
 * Jeder Schritt zeigt auf **einen** Bereich, dunkelt den Rest ab und sagt in
 * wenigen Sätzen, wofür er da ist. Die Bereiche tragen dafür ein
 * `data-tour`-Attribut; gesucht wird zur Laufzeit und nicht über einen
 * gespeicherten Knoten, denn eine Leiste, die die Tour aufklappt, ist danach
 * ein neuer Knoten an einer neuen Stelle.
 *
 * ## Warum die Tour die Tastatur ganz an sich nimmt
 *
 * Die Tastatur des Fensters (`useKeyboardShortcuts`) hört auf `window` und
 * kennt Pfeile, `n`, `p` und `⌫`. Unter einer abgedunkelten Fläche wären das
 * Handgriffe, die niemand sieht: ein `→` blätterte die Folie statt der Tour
 * weiter, ein `⌫` löschte ein ausgewähltes Element. Die Tour hängt deshalb
 * *vor* allem anderen in der Einfangphase und lässt keine Taste weiter — nur
 * die eingebaute Bedienung des Browsers bleibt, also `Tab` im Kasten und die
 * Leertaste auf dem Knopf, auf dem der Fokus steht.
 *
 * Und der Rest des Fensters wird `inert`: weder ein Klick noch ein Tabstopp
 * noch eine Hilfstechnik kommt darunter an. Eine Tour, durch die man
 * hindurch auf „Folie hinzufügen" tabben kann, erklärt einen Knopf und drückt
 * dabei einen anderen.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDeckStore } from '@/state/deckStore';
import { merkeTourGesehen, tourGesehen, type PanelName } from '@/state/workspace';
import { Button, IconButton } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

export interface TourSchritt {
  /** Der Wert von `data-tour` am Bereich — oder `null` für einen Schritt ohne Ziel. */
  ziel: string | null;
  titel: string;
  text: string;
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

/** Wie weit der Lichtkegel über den Bereich hinausreicht, in Bildpunkten. */
const RAND = 6;
/** Abstand zwischen Bereich und Kasten. */
const ABSTAND = 12;
/**
 * Die Breite des Kastens. Als Zahl und nicht als Klasse, weil die Platzierung
 * ohnehin in Bildpunkten rechnet — und ein schmales Fenster sie unterbieten
 * darf.
 */
const BREITE = 352;

interface Kasten {
  left: number;
  top: number;
  width: number;
  height: number;
}

function gleich(a: Kasten | null, b: Kasten | null): boolean {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function zielKnoten(ziel: string | null): HTMLElement | null {
  if (!ziel) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${ziel}"]`);
}

function vermiss(ziel: string | null): Kasten | null {
  const knoten = zielKnoten(ziel);
  if (!knoten) return null;
  const r = knoten.getBoundingClientRect();
  // Ein Bereich ohne Fläche ist für die Tour so gut wie keiner: auf einen
  // zugeklappten Knoten zu zeigen, hieße auf einen Strich zu zeigen.
  if (r.width < 1 || r.height < 1) return null;
  return {
    left: Math.round(r.left),
    top: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

/**
 * Wohin der Kasten kommt: unter den Bereich, sonst darüber, sonst rechts,
 * sonst links — und wenn nirgends Platz ist, in den Bereich hinein, unten
 * mittig. Das trifft die Fläche, die das halbe Fenster einnimmt.
 */
function platziere(
  ziel: Kasten | null,
  karte: { width: number; height: number },
  fenster: { width: number; height: number },
): { left: number; top: number } {
  const klemme = (wert: number, max: number) => Math.max(ABSTAND, Math.min(wert, max - ABSTAND));
  if (!ziel) {
    return {
      left: Math.round((fenster.width - karte.width) / 2),
      top: Math.round((fenster.height - karte.height) / 2),
    };
  }
  const unten = ziel.top + ziel.height + RAND + ABSTAND;
  const links = klemme(ziel.left, fenster.width - karte.width);
  if (unten + karte.height <= fenster.height - ABSTAND) return { left: links, top: unten };

  const oben = ziel.top - RAND - ABSTAND - karte.height;
  if (oben >= ABSTAND) return { left: links, top: oben };

  const senkrecht = klemme(ziel.top, fenster.height - karte.height);
  const rechts = ziel.left + ziel.width + RAND + ABSTAND;
  if (rechts + karte.width <= fenster.width - ABSTAND) return { left: rechts, top: senkrecht };

  const davor = ziel.left - RAND - ABSTAND - karte.width;
  if (davor >= ABSTAND) return { left: davor, top: senkrecht };

  return {
    left: klemme(ziel.left + (ziel.width - karte.width) / 2, fenster.width - karte.width),
    top: klemme(ziel.top + ziel.height - karte.height - ABSTAND * 2, fenster.height - karte.height),
  };
}

export function Tour() {
  const schliessen = useDeckStore((state) => state.toggleTour);
  const panels = useDeckStore((state) => state.panels);
  const togglePanel = useDeckStore((state) => state.togglePanel);
  const [index, setIndex] = useState(0);
  const [ziel, setZiel] = useState<Kasten | null>(null);
  const [lage, setLage] = useState<{ left: number; top: number } | null>(null);
  const karte = useRef<HTMLDivElement>(null);

  const schritt = tourSchritte[index];
  const letzter = index === tourSchritte.length - 1;
  const ende = () => schliessen(false);

  /*
     Gesehen ist die Tour, sobald sie einmal aufging — auch über das Zahnrad.
     Das Angebot beim ersten Start fragt sonst nach etwas, das jemand längst
     gefunden hat.
  */
  useEffect(() => merkeTourGesehen(), []);

  /*
     Der Rest des Fensters wird `inert`, und der Fokus kommt hinterher dorthin
     zurück, wo er vorher stand. Beides in **einem** Effekt und in dieser
     Reihenfolge: ein Knoten, der `inert` wird, verliert seinen Fokus — wer
     sich das Ziel erst danach merkt, merkt sich `<body>`. Und beim Schließen
     muss `inert` zuerst fallen, sonst nimmt der alte Knopf den Fokus nicht an.
     `useFokusZurueck()` kann das nicht: zwei Effekte räumen in der Reihenfolge
     ab, in der sie stehen, und genau falsch herum.
  */
  useEffect(() => {
    const vorher = document.activeElement;
    const wurzel = document.getElementById('root');
    if (wurzel) wurzel.inert = true;
    karte.current?.focus();
    return () => {
      if (wurzel) wurzel.inert = false;
      if (vorher instanceof HTMLElement && vorher.isConnected) vorher.focus();
    };
  }, []);

  // Eine zugeklappte Leiste aufklappen, bevor auf sie gezeigt wird.
  useEffect(() => {
    if (schritt.leiste && !panels[schritt.leiste]) togglePanel(schritt.leiste, true);
  }, [schritt, panels, togglePanel]);

  /*
     Nachmessen, sooft sich etwas bewegt haben kann: beim Schrittwechsel, wenn
     das Fenster seine Größe ändert und wenn der Bereich selbst sich ändert —
     eine Leiste, die eben aufging, verschiebt die Fläche daneben.
  */
  useLayoutEffect(() => {
    const miss = () =>
      setZiel((alt) => {
        const neu = vermiss(schritt.ziel);
        return gleich(alt, neu) ? alt : neu;
      });
    miss();
    const rahmen = requestAnimationFrame(miss);
    const beobachter = new ResizeObserver(miss);
    const knoten = zielKnoten(schritt.ziel);
    if (knoten) beobachter.observe(knoten);
    beobachter.observe(document.documentElement);
    window.addEventListener('resize', miss);
    return () => {
      cancelAnimationFrame(rahmen);
      beobachter.disconnect();
      window.removeEventListener('resize', miss);
    };
  }, [schritt, panels]);

  useLayoutEffect(() => {
    const kasten = karte.current;
    if (!kasten) return;
    setLage(
      platziere(
        ziel,
        { width: kasten.offsetWidth, height: kasten.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [ziel, index]);

  /* --------------------------------------------------------------- Tasten */

  useEffect(() => {
    const taste = (event: KeyboardEvent) => {
      // Vor allem anderen und für alles andere zu: die Tastatur des Fensters
      // bekommt während der Tour keine einzige Taste zu sehen.
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        schliessen(false);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (letzter) schliessen(false);
        else setIndex((i) => i + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key === 'Tab') {
        /*
           Tab läuft im Kasten im Kreis. Das ist kein Widerspruch zur Regel,
           dass dieses Werkzeug `Tab` nicht abfängt: dort sperrte das Abfangen
           den Benutzer in einem Bereich ein, hier gibt es außer dem Kasten
           keinen erreichbaren — das Fenster darunter ist `inert`. Ohne den
           Kreis lief der Fokus nach dem letzten Knopf auf `<body>`, und von
           dort führte kein Tab zurück; gemessen nach drei Anschlägen.
           Hinaus geht es mit `Escape`, und das steht am Knopf daneben.
        */
        const kasten = karte.current;
        if (!kasten) return;
        const knoepfe = [...kasten.querySelectorAll('button')].filter((knopf) => !knopf.disabled);
        const erster = knoepfe[0];
        const letzterKnopf = knoepfe[knoepfe.length - 1];
        if (!erster || !letzterKnopf) return;
        const hier = document.activeElement;
        const drin = hier instanceof Node && kasten.contains(hier);
        if (event.shiftKey && (!drin || hier === erster || hier === kasten)) {
          event.preventDefault();
          letzterKnopf.focus();
        } else if (!event.shiftKey && (!drin || hier === letzterKnopf)) {
          event.preventDefault();
          erster.focus();
        }
      }
    };
    /*
       Und dasselbe für die Zwischenablage: `useClipboard` hört auf `paste`
       und legte ein ⌘V als Element auf die Folie unter der Tour.
    */
    const sperre = (event: Event) => event.stopPropagation();
    window.addEventListener('keydown', taste, true);
    for (const art of ['copy', 'cut', 'paste'] as const) window.addEventListener(art, sperre, true);
    return () => {
      window.removeEventListener('keydown', taste, true);
      for (const art of ['copy', 'cut', 'paste'] as const)
        window.removeEventListener(art, sperre, true);
    };
  }, [letzter, schliessen]);

  // Beim Schrittwechsel liest eine Hilfstechnik den neuen Schritt vor — der
  // Fokus bleibt dafür im Kasten und nicht auf einem Knopf, der verschwindet.
  useEffect(() => {
    karte.current?.focus();
  }, [index]);

  return createPortal(
    /*
       Der Grund unter allem fängt jeden Klick ab, und ein Klick daneben
       beendet die Tour nicht: ein Fehlgriff kostete sonst alle Schritte bis
       hierher. Beendet wird über den Knopf oder mit Esc.
    */
    <div className="fixed inset-0 z-toast">
      {ziel ? (
        <div
          data-tour-licht=""
          className="pointer-events-none fixed rounded-md ring-2 ring-ui-accent transition-all duration-fast ease-standard"
          style={{
            left: ziel.left - RAND,
            top: ziel.top - RAND,
            width: ziel.width + RAND * 2,
            height: ziel.height + RAND * 2,
            boxShadow: '0 0 0 9999px var(--nz-ui-overlay)',
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-ui-overlay" />
      )}

      <div
        ref={karte}
        role="dialog"
        aria-modal="true"
        aria-label="Geführte Tour"
        aria-describedby="nz-tour-text"
        data-tour-ziel={schritt.ziel ?? ''}
        tabIndex={-1}
        className="nz-panel fixed animate-pop-in p-4 shadow-ui-xl outline-none"
        style={{
          width: Math.min(BREITE, window.innerWidth - ABSTAND * 2),
          /*
             Bis zur ersten Messung durchsichtig und **nicht** `visibility:
             hidden`: ein verborgener Knoten nimmt keinen Fokus an, und der
             Fokus soll beim Öffnen hier landen. Gemessen stand er im ersten
             Schritt auf `<body>`.
          */
          ...(lage ? { left: lage.left, top: lage.top } : { opacity: 0 }),
        }}
      >
        <div className="flex items-start gap-2">
          <Icon name="signs-post" size={16} className="mt-0.5 shrink-0 text-ui-muted" />
          <h2 className="min-w-0 flex-1 text-ui-title font-semibold text-ui-ink">
            {schritt.titel}
          </h2>
          <IconButton icon="xmark" label="Tour beenden (Esc)" onClick={ende} />
        </div>
        <p
          id="nz-tour-text"
          aria-live="polite"
          className="mt-1 text-ui-body leading-relaxed text-ui-muted"
        >
          {schritt.text}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="flex-1 tabular-nums text-[11px] text-ui-faint">
            Schritt {index + 1} von {tourSchritte.length}
          </span>
          <Button
            variant="ghost"
            icon="arrow-left"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Zurück
          </Button>
          {letzter ? (
            <Button variant="primary" icon="check" onClick={ende}>
              Fertig
            </Button>
          ) : (
            <Button
              variant="primary"
              trailingIcon="arrow-right"
              onClick={() => setIndex((i) => i + 1)}
            >
              Weiter
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Das Angebot beim allerersten Start.
 *
 * Eine Ecke und kein Dialog: wer das Werkzeug kennt, soll es wegklicken
 * können, ohne vorher etwas zu lesen, und wer gleich loslegen will, muss
 * nicht. Einmal beantwortet — gestartet oder „Später" —, kommt es nicht
 * wieder; die Tour selbst bleibt unter dem Zahnrad.
 */
export function TourAngebot() {
  const [offen, setOffen] = useState(() => !tourGesehen());
  const tourOpen = useDeckStore((state) => state.tourOpen);
  const starte = useDeckStore((state) => state.toggleTour);

  if (!offen || tourOpen) return null;

  const spaeter = () => {
    merkeTourGesehen();
    setOffen(false);
  };

  return (
    <section
      aria-label="Tour-Angebot"
      className="nz-panel absolute bottom-3 right-3 z-popover w-72 animate-pop-in p-3 shadow-ui-lg"
    >
      <p className="flex items-center gap-2 text-ui-body font-semibold text-ui-ink">
        <Icon name="signs-post" size={15} />
        Zum ersten Mal hier?
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ui-muted">
        Die Tour zeigt in {tourSchritte.length} Schritten, wo was ist und wofür es da ist. Später
        findest du sie unter dem Zahnrad.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          icon="signs-post"
          onClick={() => {
            setOffen(false);
            starte(true);
          }}
        >
          Tour starten
        </Button>
        <Button variant="ghost" onClick={spaeter}>
          Später
        </Button>
      </div>
    </section>
  );
}
