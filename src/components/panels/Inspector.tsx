/**
 * Der Inspektor rechts: die Folie, ihr Markdown und die Eigenschaften dessen,
 * was auf der Fläche ausgewählt ist.
 *
 * Jedes Bedienelement schreibt über eine Store-Aktion. Damit funktionieren
 * Verlauf und der Merker „ungesichert", ohne dass diese Leiste davon weiß.
 *
 * ## Woran jede Anzeige hier hängt
 *
 * Drei der Auskünfte sind **gerechnet** und nicht abgelesen: der Überlauf
 * eines Elements, der Überlauf des Fließtextes und die Warnung vor einer
 * Fläche in der Farbe des Untergrunds. Alle drei ändern sich, ohne dass die
 * Folie angefasst wird — an der echten Schrift (sie kommt erst nach dem ersten
 * Zeichnen an), am Erscheinungsbild, an eingetroffenen Bildmaßen und am
 * Folienformat.
 *
 * Deshalb ruft **jede** Leiste, die eine dieser Rechnungen anstellt, die vier
 * Zähler — dieselbe Bauart wie in `SlideView` und `CanvasStage`, und aus
 * demselben Grund. `inspector.test.ts` liest die Quelle und schlägt an, wenn
 * eine fünfte Stelle rechnet, ohne zu abonnieren.
 */
import { useMemo, useState } from 'react';
import {
  availableThemes,
  elementTones,
  revealAnimations,
  slideLayouts,
  slideTransitions,
  shadowNames,
  shadowOffset,
  strokeNames,
  toneNames,
  typeScale,
  type RevealAnimation,
  type SlideLayout,
  type ShadowName,
  type SlideTransition,
  type StrokeName,
  type ToneName,
  type TypeStyleName,
  canvas,
  folienformate,
  folienhoehe,
  istFolienformat,
} from '@/theme';
import { layoutDescriptions, unterDerKante } from '@/lib/layout/slideLayout';
import {
  alignLabels,
  backgroundLabels,
  cardLabels,
  chartLabels,
  connectorLabels,
  fillLabels,
  iconFrameLabels,
  kindLabels,
  labelOf,
  layoutLabels,
  revealLabels,
  shapeLabels,
  strokeLabels,
  transitionLabels,
  typeStyleLabels,
  valignLabels,
  wordmarkLabels,
  folienformatLabels,
  zaehle,
} from '@/lib/labels';
import { iconNames, isIconName, type IconName } from '@/assets/icons';
import {
  cardVariants,
  chartKinds,
  connectorKinds,
  fillStyles,
  horizontalAligns,
  iconFrames,
  shapeNames,
  slideBackgrounds,
  verticalAligns,
  wordmarkVariants,
  type CanvasElement,
  type FillStyle,
} from '@/model/types';
import { mindestBreite, mindestHoehe, standardIcon } from '@/model/factory';
import { readFileAsDataUrl } from '@/lib/export/download';
import { liesChart } from '@/lib/chart';
import { flussUeberlauf, overflowOf, unterDerFolienkante } from '@/lib/overflow';
import {
  backgroundStyle,
  kartenFelder,
  elementFelder,
  unsichtbareFlaeche,
} from '@/lib/export/scene';
import { selectCurrentSlide, useDeckStore, useSelectedElements } from '@/state/deckStore';
import { useThemeVersion } from '@/hooks/useTheme';
import { useFontsVersion } from '@/hooks/useFonts';
import { useImageSizes } from '@/hooks/useImageSizes';
import { useFolienformatVersion } from '@/hooks/useFolienformat';
import {
  Button,
  Divider,
  Field,
  IconButton,
  Segmented,
  Select,
  cx,
} from '@/components/ui/controls';
import { BrandIcon, Icon } from '@/components/ui/Icon';

type Tab = 'slide' | 'element' | 'deck';

export function Inspector() {
  const slide = useDeckStore(selectCurrentSlide);
  const selected = useSelectedElements();
  const [tab, setTab] = useState<Tab>('slide');

  // Wer auf der Fläche etwas auswählt, will das Element sehen — der Reiter
  // folgt der Auswahl.
  const effectiveTab: Tab = selected.length > 0 && tab === 'slide' ? 'element' : tab;

  return (
    <aside
      className="flex h-full w-[300px] shrink-0 flex-col border-l border-ui bg-ui-surface"
      aria-label="Inspektor"
    >
      <div className="flex items-center gap-1 border-b border-ui px-2 py-2">
        <TabButton active={effectiveTab === 'slide'} onClick={() => setTab('slide')}>
          Folie
        </TabButton>
        <TabButton active={effectiveTab === 'element'} onClick={() => setTab('element')}>
          Element{selected.length > 1 ? ` (${selected.length})` : ''}
        </TabButton>
        <TabButton active={effectiveTab === 'deck'} onClick={() => setTab('deck')}>
          Deck
        </TabButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {effectiveTab === 'slide' && slide ? <SlidePanel /> : null}
        {effectiveTab === 'element' ? <ElementPanel elements={selected} /> : null}
        {effectiveTab === 'deck' ? <DeckPanel /> : null}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'h-7 flex-1 rounded-sm text-ui-body font-medium transition-colors duration-fast ease-standard',
        active ? 'bg-ui-accent-soft text-ui-ink' : 'text-ui-muted hover:bg-ui-sunken',
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide                                                                       */
/* -------------------------------------------------------------------------- */

function SlidePanel() {
  const slide = useDeckStore(selectCurrentSlide);
  const setSlideMeta = useDeckStore((state) => state.setSlideMeta);
  const setSlideMarkdown = useDeckStore((state) => state.setSlideMarkdown);
  /*
     Dieselben vier Zähler wie auf der Fläche: die Höhe des gesetzten Textes
     hängt an der Schrift, am Erscheinungsbild und an den Bildmaßen, und
     *wogegen* sie gemessen wird, am Folienformat — keins davon fasst die Folie
     an. Ohne sie stünde hier der Wert der Ersatzschrift.

     Das Format fehlte, und der Fehler ist der aus „Ein Effekt läuft nach dem
     Zeichnen": `useDeckFolienformat()` setzt die Bindung erst *nach* dem
     Rendern. Der erste Durchlauf nach einem Formatwechsel rechnet also noch
     mit dem alten Blatt, und ohne Abonnement kommt kein zweiter. Gemessen an
     vierzig Absätzen: 999 Einheiten Überlauf auf 16:9, 0 auf A4 hoch, 814 auf
     A4 quer — die Warnung hätte auf dem hohen Blatt weitergestanden.
  */
  const deck = useDeckStore((state) => state.deck);
  useFontsVersion();
  useThemeVersion();
  useImageSizes(deck);
  useFolienformatVersion();
  const fluss = slide ? flussUeberlauf(slide) : 0;
  const slideUnten = slide ? unterDerFolienkante(slide) : 0;
  if (!slide) return null;

  return (
    <div className="space-y-3 p-3">
      {slide.meta.unreadable !== undefined ? (
        <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
          <Icon name="triangle-exclamation" size={14} className="mt-0.5 shrink-0 text-ui-warn" />
          <span>
            Der <code className="font-mono">nzl</code>-Block dieser Folie ließ sich nicht lesen —
            meist ein Doppelpunkt zu viel im YAML. Layout und Elemente fehlen deshalb hier, der
            Block selbst bleibt beim Sichern <strong>unverändert erhalten</strong>. Wer ihn
            geradebiegt, bekommt die Folie zurück; wer hier etwas ändert, ersetzt ihn.
          </span>
        </p>
      ) : null}

      <Field label="Layout" hint={layoutDescriptions[slide.meta.layout]}>
        <Select
          value={slide.meta.layout}
          onChange={(event) => setSlideMeta({ layout: event.target.value as SlideLayout })}
          options={slideLayouts.map((value) => ({ value, label: labelOf(layoutLabels, value) }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Untergrund">
          <Select
            value={slide.meta.background}
            onChange={(event) =>
              setSlideMeta({ background: event.target.value as (typeof slideBackgrounds)[number] })
            }
            options={slideBackgrounds.map((value) => ({
              value,
              label: labelOf(backgroundLabels, value),
            }))}
          />
        </Field>
        <Field label="Übergang">
          <Select
            value={slide.meta.transition}
            onChange={(event) =>
              setSlideMeta({ transition: event.target.value as SlideTransition })
            }
            options={slideTransitions.map((value) => ({
              value,
              label: labelOf(transitionLabels, value),
            }))}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-ui-body text-ui-muted">
        <input
          type="checkbox"
          checked={Boolean(slide.meta.bare)}
          onChange={(event) => setSlideMeta({ bare: event.target.checked })}
        />
        Fußzeile und Foliennummer ausblenden
      </label>

      {fluss > 0 ? (
        <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
          <Icon name="triangle-exclamation" size={14} className="mt-0.5 shrink-0 text-ui-warn" />
          <span>
            Der Fließtext läuft {fluss} Einheiten unter den Satzspiegel — dort steht die Fußzeile
            {slideUnten > 0
              ? `, und ${slideUnten} Einheiten davon liegen unter der Folienkante`
              : ''}
            .
          </span>
        </p>
      ) : null}

      <Field label="Markdown" hint="Gesetzt im Satzspiegel des Layouts, in der Typo-Leiter der CI.">
        <textarea
          value={slide.markdown}
          spellCheck={false}
          onChange={(event) => setSlideMarkdown(event.target.value)}
          rows={12}
          className="nz-field resize-y font-mono text-[12px] leading-relaxed"
          placeholder={'# Überschrift\n\n- Ein Punkt\n- Noch ein Punkt'}
        />
      </Field>

      <Field label="Notizen für den Vortrag">
        <textarea
          value={slide.meta.notes ?? ''}
          onChange={(event) => setSlideMeta({ notes: event.target.value })}
          rows={4}
          className="nz-field resize-y"
          placeholder="Sieht nur, wer vorträgt."
        />
      </Field>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Erscheinungsbild                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Wem dieses Deck gehört.
 *
 * Der Wert steht im Frontmatter, nicht im Werkzeug: wer die `.md` weitergibt,
 * gibt die Zugehörigkeit mit. Deshalb schreibt die Auswahl ins Deck, und das
 * Aussehen folgt (`useDeckTheme`).
 *
 * Nennt ein Deck ein Erscheinungsbild, das dieses Werkzeug nicht kennt, steht
 * es hier trotzdem — als Eintrag mit Hinweis. Es stillschweigend auf die
 * Voreinstellung zu setzen, hieße die Zugehörigkeit beim ersten Speichern zu
 * löschen.
 */
function ThemeField() {
  // Die Liste steht im Verzeichnis, nicht im Zustand — der Zähler ist das
  // Einzige, was React von einer Anmeldung erfährt.
  useThemeVersion();
  const theme = useDeckStore((state) => state.deck.meta.theme);
  const setDeckMeta = useDeckStore((state) => state.setDeckMeta);
  const known = availableThemes();
  const current = theme ?? 'nozilla';
  const unknown = !known.some((entry) => entry.id === current);

  const options = [
    ...known.map((entry) => ({ value: entry.id, label: entry.label })),
    ...(unknown ? [{ value: current, label: `${current} — nicht installiert` }] : []),
  ];

  return (
    <Field
      label="Erscheinungsbild"
      hint={
        unknown
          ? `„${current}" ist hier nicht angemeldet. Gezeichnet wird im Standard; der Eintrag bleibt in der Datei stehen.`
          : known.length > 1
            ? 'Steht im Frontmatter — die Datei trägt ihre Zugehörigkeit mit.'
            : 'Weitere Erscheinungsbilder werden in src/themes/ angemeldet.'
      }
    >
      <Select
        value={current}
        onChange={(event) => setDeckMeta({ theme: event.target.value })}
        options={options}
      />
    </Field>
  );
}

/**
 * Auf welchem Blatt dieses Deck liegt.
 *
 * Dieselbe Richtung wie beim Erscheinungsbild darüber: die Wahl schreibt ins
 * Frontmatter, und erst dadurch ändert sich das Bild (`useDeckFolienformat`).
 * Ein unbekanntes Format bleibt als Eintrag stehen — es stillschweigend auf
 * die Vorgabe zu setzen, hieße es beim ersten Speichern zu löschen.
 *
 * ## Warum nur in einer Richtung gefragt wird
 *
 * Beide A4-Formate sind höher als 16:9. Auf ein größeres Blatt umzustellen
 * kann deshalb nichts wegschieben, und eine Frage, die man nur wegklicken
 * kann, ist eine, die beim dritten Mal niemand mehr liest. Der Rückweg kann
 * sehr wohl etwas verlieren: was unter der neuen Kante liegt, steht in keiner
 * Ausgabe mehr und ist auf der Fläche nicht mehr anzuklicken.
 *
 * Gefragt wird deshalb **nur dann und nur mit der Zahl, die wirklich zutrifft**
 * — gezählt an den Elementen und nicht an den Folien, denn eine Frage, die
 * eine Zahl nennt und eine andere meint, ist schlimmer als keine.
 */
function FormatField() {
  const deck = useDeckStore((state) => state.deck);
  const setDeckMeta = useDeckStore((state) => state.setDeckMeta);
  const aktuell = deck.meta.format ?? '16-9';
  const unbekannt = !istFolienformat(aktuell);

  const optionen = [
    ...folienformate.map((wert) => ({ value: wert, label: labelOf(folienformatLabels, wert) })),
    ...(unbekannt ? [{ value: aktuell, label: `${aktuell} — unbekannt` }] : []),
  ];

  const waehle = (wert: string) => {
    if (wert === aktuell) return;
    if (istFolienformat(wert)) {
      const verlust = unterDerKante(deck, folienhoehe(wert));
      if (verlust.length > 0) {
        const folien = new Set(verlust.map((eintrag) => eintrag.folie)).size;
        const frage =
          `${zaehle(verlust.length, 'Element', 'Elemente')} auf ` +
          `${zaehle(folien, 'Folie', 'Folien')} ` +
          `${verlust.length === 1 ? 'liegt' : 'liegen'} bei einer Folienhöhe von ` +
          `${folienhoehe(wert)} unter der Kante und ${verlust.length === 1 ? 'ist' : 'sind'} ` +
          'dann in keiner Ausgabe mehr zu sehen. Trotzdem umstellen? ⌘Z nimmt es zurück.';
        if (!window.confirm(frage)) return;
      }
    }
    setDeckMeta({ format: wert });
  };

  return (
    <Field
      label="Folienformat"
      hint={
        unbekannt
          ? `„${aktuell}" kennt dieses Werkzeug nicht. Gezeichnet wird 16:9; der Eintrag bleibt in der Datei stehen.`
          : `${canvas.width} × ${folienhoehe(aktuell)} Einheiten. Steht im Frontmatter — die Datei trägt ihr Blatt mit.`
      }
    >
      <Select value={aktuell} onChange={(event) => waehle(event.target.value)} options={optionen} />
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Deck                                                                        */
/* -------------------------------------------------------------------------- */

function DeckPanel() {
  const meta = useDeckStore((state) => state.deck.meta);
  const setDeckMeta = useDeckStore((state) => state.setDeckMeta);
  const slideCount = useDeckStore((state) => state.deck.slides.length);
  const elementCount = useDeckStore((state) =>
    state.deck.slides.reduce((sum, slide) => sum + slide.elements.length, 0),
  );

  return (
    <div className="space-y-3 p-3">
      <Field label="Titel">
        <input
          className="nz-field"
          value={meta.title}
          onChange={(event) => setDeckMeta({ title: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Autor">
          <input
            className="nz-field"
            value={meta.author ?? ''}
            onChange={(event) => setDeckMeta({ author: event.target.value })}
          />
        </Field>
        <Field label="Datum">
          <input
            className="nz-field"
            value={meta.date ?? ''}
            placeholder="2026-08-07"
            onChange={(event) => setDeckMeta({ date: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Fußzeile" hint="Steht unten links auf jeder Folie, die eine Fußzeile zulässt.">
        <input
          className="nz-field"
          value={meta.footer ?? ''}
          onChange={(event) => setDeckMeta({ footer: event.target.value })}
        />
      </Field>

      <ThemeField />
      <FormatField />

      <dl className="rounded-md border border-ui bg-ui-subtle p-2 text-[11px] text-ui-muted">
        <div className="flex justify-between">
          <dt>Folien</dt>
          <dd className="font-mono">{slideCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Elemente auf der Fläche</dt>
          <dd className="font-mono">{elementCount}</dd>
        </div>
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Element                                                                     */
/* -------------------------------------------------------------------------- */

function ElementPanel({ elements }: { elements: CanvasElement[] }) {
  const updateElements = useDeckStore((state) => state.updateElements);
  const pushHistory = useDeckStore((state) => state.pushHistory);
  const reorderSelection = useDeckStore((state) => state.reorderSelection);
  const alignSelection = useDeckStore((state) => state.alignSelection);
  const distributeSelection = useDeckStore((state) => state.distributeSelection);
  const duplicateSelection = useDeckStore((state) => state.duplicateSelection);
  const groupSelection = useDeckStore((state) => state.groupSelection);
  const ungroupSelection = useDeckStore((state) => state.ungroupSelection);
  const deleteSelection = useDeckStore((state) => state.deleteSelection);
  const setRevealStep = useDeckStore((state) => state.setRevealStep);

  /*
     Dieselben vier Zähler wie in `SlidePanel` — und hier fehlten sie ganz.

     `overflowOf()` verwirft seinen Merker, sobald Schrift, Erscheinungsbild
     oder Bildmaß wechseln; diese Leiste erfuhr davon nichts und zeigte
     weiterhin die Zahl, die beim ersten Rendern herauskam. Gemessen an einer
     h1 in einem 300 × 60-Kasten: 281 Einheiten unter nozilla, 185 unter dem
     Musterkunden — der Balken auf der Fläche folgte dem Wechsel, die Zahl
     daneben nicht, und „Kasten anpassen" hätte um 281 statt um 185 vergrößert.

     Dasselbe gilt der Warnung vor einer Fläche in der Farbe des Untergrunds:
     welche Kombination sich wegmalt, entscheidet die Palette der Laufzeit.
  */
  const deck = useDeckStore((state) => state.deck);
  useFontsVersion();
  useThemeVersion();
  useImageSizes(deck);
  useFolienformatVersion();

  const ids = useMemo(() => elements.map((element) => element.id), [elements]);
  const first = elements[0];
  // Eine Gruppe liegt vor, sobald das erste ausgewählte Element eine Kennung
  // trägt — die Auswahl umfasst dann ohnehin die ganze Gruppe.
  const gruppiert = Boolean(first?.group);
  // Nur bei einer einzelnen Auswahl: bei mehreren wüsste man nicht, welcher
  // Kasten gemeint ist, und „anpassen" träfe alle.
  const ueberlauf = elements.length === 1 && first ? overflowOf(first) : 0;
  /*
     Der Untergrund der offenen Folie — er entscheidet, welche Farben ein
     Element überhaupt zeigt. Ohne ihn ließe sich nicht sagen, ob eine Fläche
     im Untergrund verschwindet.
  */
  /*
     Welche gemeinsamen Felder diese Art überhaupt benutzt — dieselbe Rechnung,
     nach der gezeichnet wird. Bei mehreren Ausgewählten entscheidet die erste;
     die Leiste zeigt ohnehin deren Werte.

     `first` ist `CanvasElement` und trotzdem oft nichts: `elements[0]` einer
     leeren Auswahl. Der Compiler sieht das nicht — der Abbruch „Nichts
     ausgewählt" steht dreißig Zeilen weiter unten, und Merker müssen vor ihm
     stehen, weil ein Haken nicht bedingt gerufen werden darf.
  */
  const felder = first
    ? elementFelder(first)
    : {
        drehung: false,
        ton: false,
        fuellung: false,
        strichstaerke: false,
        schatten: false,
        innenabstand: false,
      };
  const folie = useDeckStore(selectCurrentSlide);
  const unsichtbar =
    elements.length === 1 &&
    first !== undefined &&
    unsichtbareFlaeche(first, backgroundStyle(folie?.meta.background ?? 'paper'));

  /*
     Der Schlüssel sagt dem Verlauf, was für ein Handgriff das war: dieselben
     Elemente, dasselbe Feld. Wer in ein Textfeld tippt, bekommt damit einen
     Schritt statt einen je Anschlag — und wer danach das Feld wechselt, einen
     neuen. Ohne ihn war ein getippter Satz vierzig Schritte, und ⌘Z nahm einen
     Buchstaben zurück.
  */
  const patch = (update: Partial<CanvasElement>, historic = true) => {
    if (historic) pushHistory(`${ids.join()}:${Object.keys(update).join()}`);
    updateElements(ids, update);
  };

  /*
     Artgebundene Felder treffen nur, was dieselbe Art hat.

     Der Inspektor zeigt die Felder des **ersten** Ausgewählten und schrieb sie
     an **alle**. Bei zwei verschiedenen Arten war das nicht bloß folgenlos,
     sondern zerstörend: Diagramm und Tabelle teilen sich `data` und `label`.
     Wer beide auswählte und im Feld „Zahlen" tippte, überschrieb damit die
     Zellen der Tabelle — gemessen: aus „Was⇥Wert / Eins⇥1" wurde „West⇥99",
     und der Verlust überlebte das Sichern. Ein Badge bekam auf demselben Weg
     ein `title`, das kein Zeichner liest und das in der Datei stand.

     Die gemeinsamen Felder oben — Ort, Maße, Ton, Füllung — treffen weiter
     alle: dafür wählt man mehrere aus.
  */
  const artIds = useMemo(
    () => elements.filter((element) => element.kind === first?.kind).map((element) => element.id),
    [elements, first],
  );
  const gemischt = artIds.length !== ids.length;
  const patchArt = (update: Partial<CanvasElement>, historic = true) => {
    if (historic) pushHistory(`${artIds.join()}:${Object.keys(update).join()}`);
    updateElements(artIds, update);
  };

  if (!first) {
    return (
      <div className="p-6 text-center text-ui-body text-ui-faint">
        <Icon name="table" size={22} className="mx-auto mb-2 opacity-50" />
        Nichts ausgewählt.
        <br />
        Wähle ein Element auf der Fläche oder setze eines aus der Bibliothek ein.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* ----------------------------------------------------------- actions */}
      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          icon="layer-group"
          label="Ganz nach vorn"
          onClick={() => reorderSelection('front')}
        />
        <IconButton
          icon="arrow-up"
          label="Eine Ebene vor"
          onClick={() => reorderSelection('forward')}
        />
        <IconButton
          icon="arrow-down"
          label="Eine Ebene zurück"
          onClick={() => reorderSelection('backward')}
        />
        <IconButton
          icon="square"
          label="Ganz nach hinten"
          onClick={() => reorderSelection('back')}
        />
        <Divider />
        <IconButton icon="plus" label="Duplizieren" onClick={duplicateSelection} />
        <IconButton
          icon="layer-group"
          label={gruppiert ? 'Gruppe auflösen (⇧⌘G)' : 'Gruppieren (⌘G)'}
          active={gruppiert}
          disabled={!gruppiert && elements.length < 2}
          onClick={() => (gruppiert ? ungroupSelection() : groupSelection())}
        />
        <IconButton
          icon={first.locked ? 'lock' : 'key'}
          label={first.locked ? 'Entsperren' : 'Sperren'}
          active={first.locked}
          onClick={() => patch({ locked: !first.locked })}
        />
        <IconButton icon="xmark" label="Löschen" tone="danger" onClick={deleteSelection} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          icon="chevron-right"
          label="Links ausrichten"
          className="rotate-180"
          onClick={() => alignSelection('left')}
        />
        <IconButton
          icon="minus"
          label="Waagerecht mittig ausrichten"
          onClick={() => alignSelection('hcenter')}
        />
        <IconButton
          icon="chevron-right"
          label="Rechts ausrichten"
          onClick={() => alignSelection('right')}
        />
        <Divider />
        <IconButton
          icon="chevron-down"
          label="Oben ausrichten"
          className="rotate-180"
          onClick={() => alignSelection('top')}
        />
        <IconButton
          icon="minus"
          label="Senkrecht mittig ausrichten"
          className="rotate-90"
          onClick={() => alignSelection('vcenter')}
        />
        <IconButton
          icon="chevron-down"
          label="Unten ausrichten"
          onClick={() => alignSelection('bottom')}
        />
        <Divider />
        <IconButton
          icon="table"
          label="Waagerecht verteilen"
          onClick={() => distributeSelection('h')}
          disabled={elements.length < 3}
        />
        <IconButton
          icon="layer-group"
          label="Senkrecht verteilen"
          onClick={() => distributeSelection('v')}
          disabled={elements.length < 3}
        />
      </div>

      {/* -------------------------------------------------------- geometry */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={first.x} onChange={(x) => patch({ x })} />
        <NumberField label="Y" value={first.y} onChange={(y) => patch({ y })} />
        <NumberField
          label="Breite"
          value={first.w}
          min={mindestBreite()}
          onChange={(w) => patch({ w })}
        />
        {/*
          Die Grenze kommt aus dem Leser und steht nicht daneben noch einmal.
          Sie war hier `min={0}`, während `normalizeElement` alles außer einem
          Verbinder auf 1 hebt: eine getippte 0 blieb im Modell stehen und kam
          beim nächsten Öffnen als 1 zurück — weder behalten noch abgelehnt,
          sondern still ersetzt, und genau dagegen ist die Kappung im Feld
          gebaut.
        */}
        <NumberField
          label="Höhe"
          value={first.h}
          min={mindestHoehe(first.kind)}
          onChange={(h) => patch({ h })}
        />
        {/*
          Die Wortmarke wird nie gedreht, und dann gehört auch kein Feld dafür
          hierher: der Wert stand vorher im Modell und in der `.md`, gezeichnet
          wurde er nirgends — nur der Auswahlrahmen drehte sich mit.
        */}
        {felder.drehung ? (
          <NumberField
            label="Drehung"
            value={first.rotation}
            step={1}
            onChange={(rotation) => patch({ rotation })}
          />
        ) : null}
        <NumberField
          label="Deckkraft %"
          value={Math.round(first.opacity * 100)}
          min={0}
          max={100}
          onChange={(value) => patch({ opacity: Math.min(1, Math.max(0, value / 100)) })}
        />
      </div>

      {ueberlauf > 0 ? (
        <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
          <Icon name="triangle-exclamation" size={14} className="mt-0.5 shrink-0 text-ui-warn" />
          <span>
            Der Text steht {ueberlauf} Einheiten unter der Unterkante. Auf der Fläche sieht man ihn
            noch — im PDF steht er über dem Rand, und PowerPoint schneidet ihn ab.{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => patch({ h: Math.round(first.h + ueberlauf) })}
            >
              Kasten anpassen
            </button>
          </span>
        </p>
      ) : null}

      {/* ------------------------------------------------------------- CI */}
      {/*
        Gezeigt wird jedes dieser Felder nur, wo es etwas tut — gefragt wird
        `elementFelder()`, also dieselbe Rechnung, nach der gezeichnet wird.
        Getroffen sind zwei Arten: die Wortmarke malt keinen Körper (ihre Farbe
        kommt aus der Variante), und der Verbinder ist ein Strich ohne Fläche.
        Gemessen taten dort sechs beziehungsweise zwei Bedienelemente nichts,
        und wer einen Regler bewegt und nichts geschehen sieht, zweifelt an
        sich selbst.
      */}
      {felder.ton ? (
        <Field label="Ton">
          <div className="flex flex-wrap gap-1">
            {toneNames.map((name) => (
              <button
                key={name}
                type="button"
                title={elementTones[name].label}
                aria-label={elementTones[name].label}
                aria-pressed={first.tone === name}
                onClick={() => patch({ tone: name as ToneName })}
                className={cx(
                  'h-6 w-6 rounded-sm border transition-transform duration-fast ease-standard',
                  first.tone === name
                    ? 'scale-110 border-ui-accent ring-2 ring-ui-accent'
                    : 'border-ui hover:scale-105',
                )}
                style={{
                  background: elementTones[name].surface,
                  boxShadow: `inset 0 0 0 2px ${elementTones[name].line}`,
                }}
              />
            ))}
          </div>
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {felder.fuellung ? (
          <Field label="Füllung">
            <Select
              value={first.fill}
              onChange={(event) => patch({ fill: event.target.value as FillStyle })}
              options={fillStyles.map((value) => ({ value, label: labelOf(fillLabels, value) }))}
            />
          </Field>
        ) : null}
        {felder.strichstaerke ? (
          <Field label="Strichstärke">
            <Select
              value={first.strokeWeight}
              onChange={(event) => patch({ strokeWeight: event.target.value as StrokeName })}
              options={strokeNames.map((value) => ({
                value,
                label: labelOf(strokeLabels, value),
              }))}
            />
          </Field>
        ) : null}
        {felder.schatten ? (
          <Field label="Schatten" hint="Harter Versatz, kein Weichzeichner.">
            <Select
              value={first.shadow}
              onChange={(event) => patch({ shadow: event.target.value as ShadowName })}
              options={shadowNames.map((value) => ({
                value,
                label: value === 'none' ? 'Ohne' : `${shadowOffset[value]} px`,
              }))}
            />
          </Field>
        ) : null}
        {felder.innenabstand ? (
          <NumberField
            label="Innenabstand"
            value={first.padding}
            min={0}
            onChange={(padding) => patch({ padding })}
          />
        ) : null}
      </div>

      {/*
        Und eine Fläche, die genau die Farbe des Untergrunds hat, ist keine.
        Umgefärbt wird nichts — die Farbe hat jemand gewählt —, aber gesagt
        gehört es: sonst steht das Element in der Ebenenliste, lässt sich
        anwählen und ist auf der Folie, im SVG, im PDF und in der .pptx nicht
        zu sehen. Dieselbe Linie wie beim fehlenden Alternativtext.
      */}
      {unsichtbar ? (
        <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
          <Icon name="triangle-exclamation" size={14} className="mt-0.5 shrink-0 text-ui-warn" />
          <span>
            Die Fläche hat genau die Farbe des Untergrunds — von diesem Element ist auf der Folie
            nichts zu sehen.
          </span>
        </p>
      ) : null}

      {/* ------------------------------------------------------ kind-specific */}
      {gemischt ? (
        <p className="px-1 text-[11px] leading-snug text-ui-faint">
          Die Auswahl umfasst mehrere Arten. Was hier steht, gilt nur für{' '}
          {artIds.length === 1 ? 'das ausgewählte' : `die ${artIds.length} ausgewählten`}{' '}
          {labelOf(kindLabels, first.kind)}.
        </p>
      ) : null}
      <KindFields element={first} patch={patchArt} />

      {/* ----------------------------------------------------------- reveal */}
      <div className="rounded-md border border-ui p-2">
        <Field label="Einblendschritt" hint="0 erscheint mit der Folie, ab 1 beim Weiterschalten.">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="nz-field w-16"
              value={first.reveal?.step ?? 0}
              // Nicht unter null: ein negativer Schritt bleibt im Modell
              // stehen, und beim nächsten Öffnen fällt die ganze Choreografie
              // weg — samt der Animation, die jemand daneben gewählt hat.
              onChange={(event) => setRevealStep(Math.max(0, Number(event.target.value) || 0))}
            />
            <Select
              className="flex-1"
              value={first.reveal?.animation ?? 'rise'}
              disabled={!first.reveal}
              onChange={(event) =>
                setRevealStep(first.reveal?.step ?? 1, event.target.value as RevealAnimation)
              }
              options={revealAnimations.map((value) => ({
                value,
                label: labelOf(revealLabels, value),
              }))}
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface KindFieldsProps {
  element: CanvasElement;
  patch: (update: Partial<CanvasElement>, historic?: boolean) => void;
}

/**
 * Was der Zahlenleser nicht lesen konnte — und deshalb nicht zeichnet.
 *
 * Eine Zeile ohne lesbare Zahl fiel wortlos heraus: die Reihe hatte einen
 * Balken weniger, und wer nicht nachzählte, merkte es nie. Genannt wird die
 * erste, denn eine Zahl allein sagt nicht, *welche* Zeile gemeint ist.
 */
function UngeleseneZeilen({ data }: { data: string }) {
  const { ungelesen } = liesChart(data);
  if (ungelesen.length === 0) return null;

  const erste = ungelesen[0];
  const gekuerzt = erste.length > 40 ? `${erste.slice(0, 40)}…` : erste;

  return (
    <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
      <Icon name="triangle-exclamation" size={14} className="mt-0.5 shrink-0 text-ui-warn" />
      <span>
        {ungelesen.length === 1
          ? 'Eine Zeile trägt keine lesbare Zahl und wird nicht gezeichnet: '
          : `${ungelesen.length} Zeilen tragen keine lesbare Zahl und werden nicht gezeichnet, die erste: `}
        <span className="font-mono">„{gekuerzt}“</span>
      </span>
    </p>
  );
}

function KindFields({ element, patch }: KindFieldsProps) {
  switch (element.kind) {
    case 'chart':
      return (
        <>
          <Field label="Art">
            <Segmented
              value={element.chart}
              onChange={(chart) => patch({ chart } as Partial<CanvasElement>)}
              options={chartKinds.map((value) => ({
                value,
                label: labelOf(chartLabels, value),
              }))}
            />
          </Field>
          <Field label="Überschrift">
            <input
              className="nz-field"
              value={element.label}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field
            label="Zahlen"
            hint="Eine Zeile je Wert: Beschriftung, dann die Zahl. Ein * davor hebt einen Wert hervor."
          >
            <textarea
              rows={6}
              className="nz-field resize-y font-mono text-ui-label"
              value={element.data}
              onChange={(event) => patch({ data: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <UngeleseneZeilen data={element.data} />
          <label className="flex items-center gap-2 text-ui-body">
            <input
              type="checkbox"
              checked={element.values}
              onChange={(event) =>
                patch({ values: event.target.checked } as Partial<CanvasElement>)
              }
            />
            Zahlen mitschreiben
          </label>
        </>
      );

    case 'table':
      return (
        <>
          <Field label="Überschrift">
            <input
              className="nz-field"
              value={element.label}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field
            label="Zellen"
            hint="Eine Zeile je Zeile. Getrennt wird an Tabulator, senkrechtem Strich oder zwei Leerzeichen — aus einer Tabellenkalkulation kann man hineinkopieren."
          >
            <textarea
              rows={7}
              className="nz-field resize-y font-mono text-ui-label"
              value={element.data}
              onChange={(event) => patch({ data: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <label className="flex items-center gap-2 text-ui-body">
            <input
              type="checkbox"
              checked={element.header}
              onChange={(event) =>
                patch({ header: event.target.checked } as Partial<CanvasElement>)
              }
            />
            Erste Zeile ist die Kopfzeile
          </label>
        </>
      );

    case 'text':
      return (
        <>
          <Field label="Text">
            <textarea
              rows={3}
              className="nz-field resize-y"
              value={element.text}
              onChange={(event) => patch({ text: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Typo-Stufe">
              <Select
                value={element.typeStyle}
                onChange={(event) =>
                  patch({
                    typeStyle: event.target.value as TypeStyleName,
                  } as Partial<CanvasElement>)
                }
                options={(Object.keys(typeScale) as TypeStyleName[]).map((value) => ({
                  value,
                  label: `${labelOf(typeStyleLabels, value)} · ${typeScale[value].size} px`,
                }))}
              />
            </Field>
            <Field label="Ausrichtung">
              <Select
                value={element.align}
                onChange={(event) => patch({ align: event.target.value } as Partial<CanvasElement>)}
                options={horizontalAligns.map((value) => ({
                  value,
                  label: labelOf(alignLabels, value),
                }))}
              />
            </Field>
          </div>
          <Field label="Senkrecht">
            <Segmented
              value={element.valign}
              onChange={(valign) => patch({ valign } as Partial<CanvasElement>)}
              options={verticalAligns.map((value) => ({
                value,
                label: labelOf(valignLabels, value),
              }))}
            />
          </Field>
        </>
      );

    case 'markdown':
      return (
        <>
          <Field label="Markdown">
            <textarea
              rows={8}
              spellCheck={false}
              className="nz-field resize-y font-mono text-[12px]"
              value={element.markdown}
              onChange={(event) =>
                patch({ markdown: event.target.value } as Partial<CanvasElement>)
              }
            />
          </Field>
          <Field label="Ausrichtung">
            <Segmented
              value={element.align}
              onChange={(align) => patch({ align } as Partial<CanvasElement>)}
              options={horizontalAligns.map((value) => ({
                value,
                label: labelOf(alignLabels, value),
              }))}
            />
          </Field>
        </>
      );

    case 'card':
      return (
        <>
          <Field label="Variante">
            <Select
              value={element.variant}
              onChange={(event) => patch({ variant: event.target.value } as Partial<CanvasElement>)}
              options={cardVariants.map((value) => ({ value, label: labelOf(cardLabels, value) }))}
            />
          </Field>
          {/*
            Gezeigt wird, was die Variante wirklich benutzt — gefragt wird
            `kartenFelder()`, also dieselbe Rechnung, nach der gezeichnet wird.
            Vorher standen beide Felder bei jeder Variante da: wer bei „Zitat"
            ein Label eintrug, sah es auf der Folie nie (und in der `.pptx`
            sehr wohl), und das Zeichen war bei drei von fünf Varianten
            folgenlos.
          */}
          {kartenFelder(element.variant).label ? (
            <Field label={element.variant === 'step' ? 'Nummer' : 'Label'}>
              <input
                className="nz-field"
                value={element.label ?? ''}
                onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
              />
            </Field>
          ) : null}
          <Field label="Titel">
            <textarea
              rows={2}
              className="nz-field resize-y"
              value={element.title}
              onChange={(event) => patch({ title: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field label="Fließtext">
            <textarea
              rows={3}
              className="nz-field resize-y"
              value={element.body}
              onChange={(event) => patch({ body: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          {kartenFelder(element.variant).icon ? (
            <IconField
              value={element.icon}
              allowNone
              onChange={(icon) => patch({ icon } as Partial<CanvasElement>)}
            />
          ) : null}
        </>
      );

    case 'badge':
      return (
        <>
          <Field label="Text">
            <input
              className="nz-field"
              value={element.text}
              onChange={(event) => patch({ text: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <IconField
            value={element.icon}
            allowNone
            onChange={(icon) => patch({ icon } as Partial<CanvasElement>)}
          />
        </>
      );

    case 'icon':
      return (
        <>
          <IconField
            value={element.icon}
            onChange={(icon) => patch({ icon: icon ?? standardIcon() } as Partial<CanvasElement>)}
          />
          <Field label="Rahmen">
            <Segmented
              value={element.frame}
              onChange={(frame) => patch({ frame } as Partial<CanvasElement>)}
              // `none` und `box` — mehr kennt das Modell nicht. Hier standen
              // einmal `square` und `circle`: der Inspektor bot zwei Rahmen an,
              // die es nie gab, und die Auswahl tat schlicht nichts.
              options={iconFrames.map((value) => ({
                value,
                label: labelOf(iconFrameLabels, value),
              }))}
            />
          </Field>
        </>
      );

    /*
       Die Wortmarke fiel bis hierher in den `default`-Zweig und bekam gar
       keine eigenen Felder. Ihre Variante ist aber das **einzige**, was sie an
       sich selbst hat, und sie wirkt: von den vier Werten malen drei
       verschiedene Bilder. Erreichbar war sie nur, indem man den `nzl`-Block
       von Hand editiert — ein Feld des Dateiformats ohne einen Weg dorthin.
    */
    case 'wordmark':
      return (
        <Field
          label="Farbe"
          hint={'„Automatisch" nimmt den Ton, der auf dem Untergrund der Folie lesbar ist.'}
        >
          <Select
            value={element.variant}
            onChange={(event) => patch({ variant: event.target.value } as Partial<CanvasElement>)}
            options={wordmarkVariants.map((value) => ({
              value,
              label: labelOf(wordmarkLabels, value),
            }))}
          />
        </Field>
      );

    case 'shape':
      return (
        <>
          <Field label="Form">
            <Select
              value={element.shape}
              onChange={(event) => patch({ shape: event.target.value } as Partial<CanvasElement>)}
              options={shapeNames.map((value) => ({ value, label: labelOf(shapeLabels, value) }))}
            />
          </Field>
          <Field label="Label">
            <input
              className="nz-field"
              value={element.label ?? ''}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          {/*
            Die Stufe des Labels wirkt — `shapeScene()` setzt es in
            `labelStyle ?? 'body'`, die `.pptx` trägt sie mit, und im
            Dateiformat steht sie. Nur gab es kein Feld dafür: wer eine Form
            als Überschrift wollte, musste den `nzl`-Block von Hand schreiben.
          */}
          {element.label?.trim() ? (
            <Field label="Typo-Stufe des Labels">
              <Select
                value={element.labelStyle ?? 'body'}
                onChange={(event) =>
                  patch({
                    labelStyle: event.target.value as TypeStyleName,
                  } as Partial<CanvasElement>)
                }
                options={(Object.keys(typeScale) as TypeStyleName[]).map((value) => ({
                  value,
                  label: `${labelOf(typeStyleLabels, value)} · ${typeScale[value].size} px`,
                }))}
              />
            </Field>
          ) : null}
        </>
      );

    case 'connector':
      return (
        <>
          <Field label="Verbinder">
            <Select
              value={element.connector}
              onChange={(event) =>
                patch({ connector: event.target.value } as Partial<CanvasElement>)
              }
              options={connectorKinds.map((value) => ({
                value,
                label: labelOf(connectorLabels, value),
              }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-ui-body text-ui-muted">
            <input
              type="checkbox"
              checked={element.dashed}
              onChange={(event) =>
                patch({ dashed: event.target.checked } as Partial<CanvasElement>)
              }
            />
            Gestrichelt
          </label>
          <Field label="Label">
            <input
              className="nz-field"
              value={element.label ?? ''}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
        </>
      );

    case 'image':
      return (
        <>
          <Field label="Quelle" hint="Ein Pfad relativ zum Deck oder eine eingebettete data-URI.">
            <input
              className="nz-field"
              value={element.src.startsWith('data:') ? '(eingebettetes Bild)' : element.src}
              readOnly={element.src.startsWith('data:')}
              onChange={(event) => patch({ src: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Button
            icon="upload"
            onClick={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                patch({ src: await readFileAsDataUrl(file) } as Partial<CanvasElement>);
              };
              input.click();
            }}
          >
            Datei einbetten
          </Button>
          <Field
            label="Alternativtext"
            hint="Was auf dem Bild zu sehen ist, in einem Satz. Landet im SVG als Titel und in der PPTX als Beschreibung — dort liest eine Hilfstechnik ihn vor."
          >
            <input
              className="nz-field"
              value={element.alt}
              onChange={(event) => patch({ alt: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          {element.alt.trim() ? null : (
            <p className="flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink">
              <Icon
                name="triangle-exclamation"
                size={14}
                className="mt-0.5 shrink-0 text-ui-warn"
              />
              <span>
                Ohne Alternativtext ist dieses Bild in jeder Ausgabe ein stummer Fleck. Zwei Sätze
                genügen — wer die Folie nicht sehen kann, hat sonst nichts.
              </span>
            </p>
          )}
          <Field label="Einpassung">
            <Segmented
              value={element.fit}
              onChange={(fit) => patch({ fit } as Partial<CanvasElement>)}
              options={[
                { value: 'contain' as const, label: 'Ganz sichtbar' },
                { value: 'cover' as const, label: 'Füllend' },
              ]}
            />
          </Field>
        </>
      );

    default: {
      /*
         Eine zwölfte Elementart bekäme hier stillschweigend gar keine Felder —
         dieselbe Lücke, die `svg.ts` und `pdf.ts` inzwischen mit einer
         Zuweisung an `never` schließen. Sie bricht `tsc` ab, bevor jemand die
         Art anlegt und sich wundert, warum die Leiste leer bleibt.

         Anders als dort wird hier **nicht geworfen**: das ist eine Komponente,
         und ein Wurf im Renderpfad ist ein weißes Fenster — der Fall, gegen
         den in diesem Repo schon einmal etwas gebaut wurde. Der Compiler ist
         die Prüfung, das `null` ist die Notlandung.
      */
      const unbekannt: never = element;
      void unbekannt;
      return null;
    }
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Die Auswahl steht im Set des gerade gültigen Erscheinungsbilds. Nennt das
 * Element ein Zeichen, das dort nicht vorkommt, bleibt der Name in der Liste
 * stehen und sagt es — genau wie bei einem unbekannten Erscheinungsbild. Ihn
 * still gegen das erstbeste zu tauschen, hieße die Angabe zu verlieren.
 */
function IconField({
  value,
  onChange,
  allowNone,
}: {
  value: IconName | undefined;
  onChange: (icon: IconName | undefined) => void;
  allowNone?: boolean;
}) {
  useThemeVersion();
  const missing = value !== undefined && !isIconName(value);

  return (
    <Field
      label="Icon"
      hint={missing ? `„${value}“ steht nicht im Zeichensatz dieses Erscheinungsbilds.` : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-ui bg-ui-subtle text-ui-ink">
          {value ? <BrandIcon name={value} size={17} /> : <span className="text-ui-faint">—</span>}
        </span>
        <Select
          className="flex-1"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || undefined)}
          options={[
            ...(allowNone ? [{ value: '', label: 'Ohne' }] : []),
            ...(missing ? [{ value, label: `${value} — nicht in diesem Set` }] : []),
            ...iconNames().map((name) => ({ value: name, label: name })),
          ]}
        />
      </div>
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className="nz-field"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isFinite(next)) return;
          /*
             `min` und `max` standen bisher nur als Attribute da — der Browser
             hält davon nur die Pfeiltasten ab, getippt wird alles. Wer in
             „Breite" (min 1) eine −50 schrieb, bekam eine Karte, deren Text
             Zeichen für Zeichen umbrach, und beim nächsten Öffnen stand
             stillschweigend eine 1 da: `normalizeElement` kappt beim Lesen.
             Der getippte Wert war damit weder behalten noch abgelehnt,
             sondern still ersetzt.
          */
          onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
        }}
      />
    </Field>
  );
}
