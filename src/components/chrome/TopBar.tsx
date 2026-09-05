/**
 * Die Kopfleiste: wer das Deck ist, die Wege zur Datei, das Export-Menü, was
 * die Fläche zeigt, und der Sprung in den Vortrag.
 */
import { useEffect, useRef, useState } from 'react';
import { darfErsetzen, grund, oeffneDeck, sichereDeck } from '@/state/persistence';
import { brand, canvas as canvasTokens } from '@/theme';
import { bundledDecks } from '@/decks';
import {
  exportMarkdown,
  exportHandoutPdf,
  exportPdf,
  exportPng,
  exportPptx,
  exportSvg,
  seitenformatHints,
  seitenformatLabels,
  seitenformate,
  textModeLabels,
  textModeHints,
  textModes,
  type Seitenformat,
  type TextMode,
} from '@/lib/export';
import { selectCanRedo, selectCanUndo, useDeckStore } from '@/state/deckStore';
import { Button, Divider, IconButton, SectionTitle, Segmented, cx } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import type { ToolIconName } from '@/assets/icons';
import { Logo } from '@/components/chrome/Logo';
import { SettingsMenu } from '@/components/panels/SettingsMenu';
import { useFolienformatVersion } from '@/hooks/useFolienformat';

export function TopBar() {
  const deck = useDeckStore((state) => state.deck);
  const fileName = useDeckStore((state) => state.fileName);
  const dirty = useDeckStore((state) => state.dirty);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const total = useDeckStore((state) => state.deck.slides.length);
  const zoom = useDeckStore((state) => state.zoom);
  const showGrid = useDeckStore((state) => state.showGrid);
  const snap = useDeckStore((state) => state.snap);
  const overviewOpen = useDeckStore((state) => state.overviewOpen);
  const searchOpen = useDeckStore((state) => state.searchOpen);
  const canUndo = useDeckStore(selectCanUndo);
  const canRedo = useDeckStore(selectCanRedo);

  const setZoom = useDeckStore((state) => state.setZoom);
  const toggleGrid = useDeckStore((state) => state.toggleGrid);
  const setSnap = useDeckStore((state) => state.setSnap);
  const toggleOverview = useDeckStore((state) => state.toggleOverview);
  const toggleSearch = useDeckStore((state) => state.toggleSearch);
  const togglePrompt = useDeckStore((state) => state.togglePrompt);
  const setMode = useDeckStore((state) => state.setMode);
  const undo = useDeckStore((state) => state.undo);
  const redo = useDeckStore((state) => state.redo);
  const addSlide = useDeckStore((state) => state.addSlide);

  const [busy, setBusy] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy('Sichere');
    try {
      await sichereDeck();
    } finally {
      setBusy(null);
    }
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3">
      <Logo className="mr-1" />

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-ui-title font-semibold">{deck.meta.title}</span>
        <span className="truncate text-[11px] text-ui-faint">
          {fileName}
          {dirty ? ' · nicht gesichert' : ''}
        </span>
      </div>

      <Divider className="mx-1" />

      {/*
        Links steht, was mit der **Datei und der Marke** zu tun hat, rechts,
        was mit der **Ansicht** zu tun hat. Das Zahnrad stand bis hierher
        rechts neben „Vortragen" und war dort der einzige Fremdkörper: die
        Erscheinung des Arbeitsplatzes, das Anlegen eines Erscheinungsbilds
        und der Stand des Werkzeugs gehen den Vortrag nichts an.
      */}
      <DateiMenu onSave={handleSave} />
      <ExportMenu busy={busy} setBusy={setBusy} />
      <SettingsMenu />

      <Divider className="mx-1" />

      <IconButton
        icon="rotate"
        label="Rückgängig (⌘Z)"
        disabled={!canUndo}
        onClick={undo}
        className="-scale-x-100"
      />
      <IconButton icon="rotate" label="Wiederholen (⇧⌘Z)" disabled={!canRedo} onClick={redo} />

      <Divider className="mx-1" />

      <IconButton icon="plus" label="Folie hinzufügen (N)" onClick={() => addSlide()} />
      <IconButton
        icon="table"
        label="Folienübersicht (⌘K)"
        active={overviewOpen}
        onClick={() => toggleOverview()}
      />
      {/*
         Suchen und Ersetzen war das einzige Merkmal ohne einen Weg mit der
         Maus: `⌘F` stand in zwei Kommentaren im Quelltext und in keiner
         einzigen sichtbaren Beschriftung. Wer das Kürzel nicht kannte, konnte
         im Deck nicht suchen — das Gegenstück zum toten Bedienelement, eine
         Wirkung ohne einen Weg dorthin.
      */}
      <IconButton
        icon="magnifying-glass"
        label="Suchen und Ersetzen (⌘F)"
        active={searchOpen}
        onClick={() => toggleSearch()}
      />
      <Button icon="wand-magic-sparkles" onClick={() => togglePrompt(true)}>
        Prompt
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="tabular-nums text-[11px] text-ui-faint">
          {Math.min(slideIndex + 1, total)} / {total}
        </span>

        <Divider />

        <IconButton
          icon="layer-group"
          label="An Raster und Hilfslinien einrasten"
          active={snap.grid || snap.smart}
          onClick={() => setSnap({ grid: !snap.grid, smart: !snap.smart })}
        />
        <IconButton icon="table" label="Raster zeigen (G)" active={showGrid} onClick={toggleGrid} />

        <Segmented
          value={zoom === 'fit' ? 'fit' : 'custom'}
          onChange={(value) => setZoom(value === 'fit' ? 'fit' : 1)}
          options={[
            { value: 'fit', label: 'Passend' },
            { value: 'custom', label: '100%' },
          ]}
        />

        <Divider />

        <Button variant="primary" icon="play" onClick={() => setMode('present')}>
          Vortragen
        </Button>
      </div>

      {busy ? (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-14 z-toast -translate-x-1/2 bg-ui-inverse px-3 py-1 text-[11px] text-ui-on-inverse shadow-ui-lg"
        >
          {busy}…
        </span>
      ) : null}

      <Hinweis />
    </header>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Alles, was ein Deck anlegt, ersetzt, öffnet oder sichert — an einer Stelle.
 *
 * Vorher standen dafür vier Knöpfe und ein Untermenü nebeneinander in der
 * Leiste. Das ist die Sorte Reihe, die man nur noch mit dem Kurzhinweis liest:
 * fünf Zeichen, deren Unterschied „neu", „Beispiel", „öffnen", „sichern"
 * heißt, und keines davon sieht man ihm an.
 *
 * Die mitgelieferten Decks stehen **flach** darin und nicht in einem
 * Untermenü. Ein Menü im Menü ist mit der Maus fummelig und mit der Tastatur
 * eine eigene Belegung; bei zwei Einträgen wäre das ein Bauwerk für nichts.
 * Sie stehen aber unter einer eigenen Überschrift, denn sie bedeuten etwas
 * anderes als „Neues Deck": leer anfangen ist das eine, etwas Fertiges
 * ansehen das andere — und beides überschreibt, was gerade offen ist.
 */
function DateiMenu({ onSave }: { onSave: () => void }) {
  const newDeck = useDeckStore((state) => state.newDeck);
  const loadMarkdown = useDeckStore((state) => state.loadMarkdown);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const zu = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', zu);
    return () => document.removeEventListener('mousedown', zu);
  }, [open]);

  const dann = (tu: () => void) => () => {
    setOpen(false);
    tu();
  };

  const oeffneBeispiel = (deck: (typeof bundledDecks)[number]) => {
    // Die Frage stand ursprünglich hier — als einzige von sechs Stellen.
    // Jetzt steht sie in `darfErsetzen()`, und die anderen fünf stellen sie
    // auch.
    if (!darfErsetzen()) return;
    loadMarkdown(deck.source, { fileName: deck.file });
  };

  return (
    <div className="relative" ref={ref}>
      <Button icon="file-lines" active={open} onClick={() => setOpen((value) => !value)}>
        Datei
      </Button>
      {open ? (
        <div
          className="nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg"
          role="menu"
        >
          <MenuItem
            icon="file-lines"
            label="Neues Deck"
            hint="⌘⇧N — leer anfangen"
            onClick={dann(() => {
              if (darfErsetzen()) newDeck();
            })}
          />
          <MenuItem
            icon="folder"
            label="Markdown-Deck öffnen"
            hint="⌘O"
            onClick={dann(() => void oeffneDeck())}
          />
          <MenuItem icon="download" label="Markdown sichern" hint="⌘S" onClick={dann(onSave)} />

          <div className="border-t border-ui pt-1">
            <SectionTitle>Beispiele</SectionTitle>
            {bundledDecks.map((deck) => (
              <MenuItem
                key={deck.file}
                icon="book"
                label={deck.label}
                onClick={dann(() => oeffneBeispiel(deck))}
              />
            ))}
          </div>

          {/*
            Der Generator ist eine eigene Seite und kein Panel: er meldet ein
            Erscheinungsbild an und aktiviert es, um damit ein Probedeck zu
            zeichnen. Täte er das im laufenden Werkzeug, führe die offene Folie
            bei jedem Tastendruck mit.

            Er stand bis hierher im Zahnrad. Dort war er richtig einsortiert,
            solange „Einstellungen" der einzige Ort für alles Nicht-Folienhafte
            war — er *erstellt* aber etwas, und alles Erstellende steht jetzt
            hier. `target="_blank"`, damit die offene Arbeit stehen bleibt.
          */}
          <div className="border-t border-ui pt-1">
            <SectionTitle>Erscheinungsbild</SectionTitle>
            <MenuItem
              icon="palette"
              label="Eigenes Design erstellen"
              hint="Eigene Seite, eigener Tab"
              href="./ci.html"
              onClick={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExportMenu({
  busy,
  setBusy,
}: {
  busy: string | null;
  setBusy: (value: string | null) => void;
}) {
  const deck = useDeckStore((state) => state.deck);
  const slideIndex = useDeckStore((state) => state.slideIndex);
  const zeigeHinweis = useDeckStore((state) => state.zeigeHinweis);
  const [open, setOpen] = useState(false);
  // Wie die Schrift in die Datei kommt. Eine Entscheidung pro Export, kein
  // Deck-Zustand — sie hängt am Ziel (Bildschirm, Druckerei), nicht am Inhalt.
  const [textMode, setTextMode] = useState<TextMode>('embedded');
  // Dasselbe für die Seite: ein Blatt A4 will, wer druckt, und das ist eine
  // Eigenschaft dieses einen Exports und keine des Decks.
  const [seite, setSeite] = useState<Seitenformat>('folie');
  /*
     Das Folienmaß wird im Rumpf gelesen, das Format aber in einem Effekt
     gesetzt — und Effekte laufen *nach* dem Zeichnen. Ohne diesen Zähler
     bliebe nach dem Laden eines A4-Decks das 16:9-Blatt stehen, bis
     irgendetwas anderes ein Neuzeichnen auslöste. Derselbe Griff wie bei
     `useThemeVersion()`, und aus genau demselben Grund.
  */
  useFolienformatVersion();
  const ref = useRef<HTMLDivElement | null>(null);

  /*
     Der Hinweis unter einem PDF-Eintrag nennt beide Entscheidungen, die ihn
     betreffen. Ohne das stünden sie nur unten in den Segmenten, und wer den
     Knopf drückt, sähe am Knopf nicht, was er bekommt — dieselbe Sorte
     Bedienelement, das etwas anderes tut, als daneben steht.
  */
  const pdfHinweis = () => {
    const schrift = textMode === 'embedded' ? 'Text bleibt markierbar' : 'Text als Konturen';
    return seite === 'folie'
      ? `Vektorseiten, ${schrift}`
      : `${seitenformatLabels[seite]}, ${schrift}`;
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  /*
     Ein gescheiterter Export sagte nichts.

     `console.error` und der Spinner ging aus: wer auf „PDF" klickte, sah einen
     Moment lang etwas laufen und danach nichts. Keine Datei, keine Meldung,
     kein Unterschied zu einem Export, den man versehentlich abgebrochen hat —
     und der Unterschied ist genau der, auf den es ankommt.

     Ein geschlossener Dateidialog bleibt stumm: das ist keine Panne, sondern
     die Antwort „doch nicht".
  */
  const run = async (label: string, task: () => Promise<unknown>) => {
    setOpen(false);
    // Der nächste Versuch räumt den vorigen Hinweis weg — sonst stünde nach
    // einem geglückten Export noch die Klage über den davor.
    zeigeHinweis(null);
    setBusy(label);
    try {
      await task();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error(error);
        zeigeHinweis(`${label} — gescheitert. ${grund(error)}`);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/*
        Beschriftet und nicht nur ein Zeichen: „Datei" steht daneben und trägt
        sein Wort, und ein nacktes Symbol dazwischen liest sich wie eine
        Nebensache. Die zugängliche Beschriftung bleibt „Export" — ein Knopf
        mit diesem Text heißt genauso wie einer mit diesem `label`, und der
        Rauchtest greift ihn zehnmal darüber.
      */}
      <Button
        icon="share"
        active={open}
        disabled={Boolean(busy)}
        onClick={() => setOpen((value) => !value)}
      >
        Export
      </Button>
      {open ? (
        <div
          className={cx(
            'nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg',
          )}
          role="menu"
        >
          <MenuItem
            icon="file-lines"
            label="Markdown (Deck und Layout)"
            hint=".md — wieder einlesbar"
            onClick={() => run('Schreibe Markdown', () => exportMarkdown(deck))}
          />
          <MenuItem
            icon="square"
            label="SVG — diese Folie"
            hint={`${canvasTokens.width}×${canvasTokens.height}, echte Pfade`}
            onClick={() =>
              run('Zeichne SVG', () => exportSvg(deck, { slideIndex, text: textMode }))
            }
          />
          <MenuItem
            icon="image"
            label="PNG — diese Folie"
            hint={`${canvasTokens.width * 2}×${canvasTokens.height * 2}, zum Verschicken`}
            onClick={() => run('Rastere PNG', () => exportPng(deck, { slideIndex }))}
          />
          <MenuItem
            icon="layer-group"
            label="SVG — ganzes Deck"
            hint="Eine Datei, Folien untereinander"
            onClick={() => run('Zeichne SVG', () => exportSvg(deck, { text: textMode }))}
          />
          <MenuItem
            icon="book"
            label="PDF — ganzes Deck"
            hint={pdfHinweis()}
            onClick={() => run('Zeichne PDF', () => exportPdf(deck, { text: textMode, seite }))}
          />
          <MenuItem
            icon="file-lines"
            label="PDF — Handout mit Notizen"
            hint="Hochformat, je Seite eine Folie und ihre Notizen"
            onClick={() => run('Setze Handout', () => exportHandoutPdf(deck))}
          />
          <MenuItem
            icon="play"
            label="PDF — diese Folie"
            hint={`Eine Seite · ${pdfHinweis()}`}
            onClick={() =>
              run('Zeichne PDF', () => exportPdf(deck, { slideIndex, text: textMode, seite }))
            }
          />
          <MenuItem
            icon="table"
            label="PowerPoint (.pptx)"
            hint="Bearbeitbar — auch für Google Slides"
            onClick={() => run('Baue PPTX', () => exportPptx(deck))}
          />

          <div className="border-t border-ui px-2 pb-1.5 pt-2">
            <span className="nz-label">Schrift in SVG und PDF</span>
            <Segmented
              value={textMode}
              onChange={setTextMode}
              className="w-full"
              options={textModes.map((mode) => ({
                value: mode,
                label: textModeLabels[mode],
                title: textModeHints[mode],
              }))}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-ui-faint">
              {textMode === 'embedded'
                ? 'Die Marken-Schnitte liegen in der Datei. Text bleibt markierbar und durchsuchbar.'
                : 'Jede Glyphe wird zur Kontur — gleiches Bild auch dort, wo eingebettete Schriften ignoriert werden.'}
            </p>
          </div>

          <div className="border-t border-ui px-2 pb-1.5 pt-2">
            <span className="nz-label">Seitenformat im PDF</span>
            <Segmented
              value={seite}
              onChange={setSeite}
              className="w-full"
              options={seitenformate.map((wert) => ({
                value: wert,
                label: seitenformatLabels[wert],
                title: seitenformatHints[wert],
              }))}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-ui-faint">
              {seite === 'folie'
                ? `Die Seite ist die Folie — ${canvasTokens.width} × ${canvasTokens.height}, ohne Rand.`
                : 'Die Folie liegt mittig auf einem echten A4-Bogen und wird dabei nicht kleiner gerechnet. Das Handout bringt seine eigene Seite mit.'}
            </p>
          </div>

          <p className="border-t border-ui px-2 py-1.5 text-[11px] text-ui-faint">
            Ein Export läuft durch dieselbe Strecke wie die Fläche — die CI von {brand.name}{' '}
            inbegriffen.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Ein Eintrag in einem der Menüs der Kopfleiste.
 *
 * Mit `href` wird daraus ein **Verweis** und kein Knopf. Das ist kein
 * Schönheitsfehler, den man mit einem `onClick` auf einem `<button>` auch
 * erschlagen könnte: der CI-Generator ist eine eigene Seite, und ein Verweis
 * lässt sich mit der mittleren Maustaste, mit ⌘-Klick und aus dem Kontextmenü
 * öffnen. Ein Knopf, der `window.open()` ruft, kann das alles nicht.
 */
function MenuItem({
  icon,
  label,
  hint,
  onClick,
  href,
}: {
  icon: ToolIconName;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
}) {
  const inhalt = (
    <>
      <span className="mt-0.5 text-ui-faint">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ui-body font-medium">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-ui-faint">{hint}</span> : null}
      </span>
    </>
  );
  const klasse =
    'flex w-full items-start gap-2 px-2 py-1.5 text-left text-ui-ink ' +
    'transition-colors duration-fast hover:bg-ui-subtle';

  if (href) {
    return (
      <a
        role="menuitem"
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        className={klasse}
      >
        {inhalt}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={klasse}>
      {inhalt}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Der Hinweis, der nach einem Fehlschlag stehen bleibt.
 *
 * Er verschwindet **nicht** von selbst. Ein Hinweis, der sich nach drei
 * Sekunden wegnimmt, ist für den gemacht, der gerade hinsieht — und wer gerade
 * hinsieht, hat den Fehler ohnehin bemerkt. Weggenommen wird er mit einem
 * Klick oder vom nächsten Versuch.
 */
function Hinweis() {
  const text = useDeckStore((state) => state.hinweis);
  const zeigeHinweis = useDeckStore((state) => state.zeigeHinweis);
  if (!text) return null;

  return (
    <div
      role="alert"
      className="absolute left-1/2 top-14 z-toast flex max-w-xl -translate-x-1/2 items-start gap-2 border border-ui-warn bg-ui-warn-bg px-3 py-2 text-ui-body text-ui-ink shadow-ui-lg"
    >
      <Icon name="triangle-exclamation" size={15} className="mt-0.5 shrink-0 text-ui-warn" />
      <span className="min-w-0">{text}</span>
      <IconButton icon="xmark" label="Hinweis schließen" onClick={() => zeigeHinweis(null)} />
    </div>
  );
}
