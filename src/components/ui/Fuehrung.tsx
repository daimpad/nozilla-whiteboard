/**
 * Eine geführte Tour — Bereich für Bereich durch ein Fenster.
 *
 * Zwei Seiten tragen eine: das Werkzeug (`chrome/Tour.tsx`) und der
 * CI-Generator (`ci/Tour.tsx`). Was sie unterscheidet, sind die Schritte und
 * wo sich gemerkt wird, dass sie gesehen wurde; alles, was hier steht — der
 * Lichtkegel, die Tastatur, `inert`, die Rückgabe des Fokus —, ist dasselbe
 * und steht deshalb einmal da. Zwei Kopien liefen beim ersten Fehler
 * auseinander, und man fände ihn nur auf der Seite, die man gerade ansieht.
 *
 * Jeder Schritt zeigt auf **einen** Bereich, dunkelt den Rest ab und sagt in
 * wenigen Sätzen, wofür er da ist. Die Bereiche tragen dafür ein
 * `data-tour`-Attribut; gesucht wird zur Laufzeit und nicht über einen
 * gespeicherten Knoten, denn eine Leiste, die die Tour aufklappt, ist danach
 * ein neuer Knoten an einer neuen Stelle.
 *
 * ## Warum die Tour die Tastatur ganz an sich nimmt
 *
 * Die Tastatur des Werkzeugs (`useKeyboardShortcuts`) hört auf `window` und
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
import { Button, IconButton } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

export interface FuehrungsSchritt {
  /** Der Wert von `data-tour` am Bereich — oder `null` für einen Schritt ohne Ziel. */
  ziel: string | null;
  titel: string;
  text: string;
}

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

interface FuehrungProps<S extends FuehrungsSchritt> {
  schritte: readonly S[];
  beenden: () => void;
  /** Merkt sich, dass die Tour gesehen wurde — jede Seite unter eigenem Schlüssel. */
  merken: () => void;
  /** Läuft vor jedem Schritt, etwa um eine zugeklappte Leiste aufzuklappen. */
  vorbereiten?: (schritt: S) => void;
  /** Ändert er sich, wird neu gemessen — eine Leiste, die aufging, verschiebt ihre Nachbarn. */
  anlass?: unknown;
}

export function Fuehrung<S extends FuehrungsSchritt>({
  schritte,
  beenden,
  merken,
  vorbereiten,
  anlass,
}: FuehrungProps<S>) {
  const [index, setIndex] = useState(0);
  const [ziel, setZiel] = useState<Kasten | null>(null);
  const [lage, setLage] = useState<{ left: number; top: number } | null>(null);
  const karte = useRef<HTMLDivElement>(null);

  const schritt = schritte[index];
  const letzter = index === schritte.length - 1;

  /*
     Gesehen ist die Tour, sobald sie einmal aufging — auch über den Knopf.
     Das Angebot beim ersten Start fragt sonst nach etwas, das jemand längst
     gefunden hat.
  */
  useEffect(() => merken(), [merken]);

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

  // Was ein Schritt vorher braucht — im Werkzeug: eine Leiste aufklappen.
  useEffect(() => {
    vorbereiten?.(schritt);
  }, [schritt, vorbereiten]);

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
  }, [schritt, anlass]);

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
        beenden();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (letzter) beenden();
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
       Und dasselbe für die Zwischenablage: `useClipboard` hört im Werkzeug
       auf `paste` und legte ein ⌘V als Element auf die Folie unter der Tour.
    */
    const sperre = (event: Event) => event.stopPropagation();
    window.addEventListener('keydown', taste, true);
    for (const art of ['copy', 'cut', 'paste'] as const) window.addEventListener(art, sperre, true);
    return () => {
      window.removeEventListener('keydown', taste, true);
      for (const art of ['copy', 'cut', 'paste'] as const)
        window.removeEventListener(art, sperre, true);
    };
  }, [letzter, beenden]);

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
          <IconButton icon="xmark" label="Tour beenden (Esc)" onClick={beenden} />
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
            Schritt {index + 1} von {schritte.length}
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
            <Button variant="primary" icon="check" onClick={beenden}>
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
 * Eine Ecke und kein Dialog: wer die Seite kennt, soll es wegklicken können,
 * ohne vorher etwas zu lesen, und wer gleich loslegen will, muss nicht.
 * Einmal beantwortet — gestartet oder „Später" —, kommt es nicht wieder; die
 * Tour selbst bleibt über ihren Knopf erreichbar, und `wiederfinden` sagt,
 * wo der steht.
 */
export function FuehrungsAngebot({
  anzahl,
  gesehen,
  merken,
  starten,
  verborgen,
  wiederfinden,
}: {
  anzahl: number;
  gesehen: () => boolean;
  merken: () => void;
  starten: () => void;
  /** Läuft die Tour gerade, steht das Angebot nicht daneben. */
  verborgen: boolean;
  wiederfinden: string;
}) {
  const [offen, setOffen] = useState(() => !gesehen());

  if (!offen || verborgen) return null;

  const spaeter = () => {
    merken();
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
        Die Tour zeigt in {anzahl} Schritten, wo was ist und wofür es da ist. {wiederfinden}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          icon="signs-post"
          onClick={() => {
            setOffen(false);
            starten();
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
