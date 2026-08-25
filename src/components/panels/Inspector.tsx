/**
 * The right-hand inspector: slide settings, the Markdown source for the current
 * slide, and the properties of whatever is selected on the canvas.
 *
 * Every control writes through a store action, so undo/redo and the dirty flag
 * work without the panel knowing they exist.
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
} from '@/theme';
import { layoutDescriptions } from '@/lib/layout/slideLayout';
import {
  alignLabels,
  backgroundLabels,
  cardLabels,
  chartLabels,
  connectorLabels,
  fillLabels,
  iconFrameLabels,
  labelOf,
  layoutLabels,
  revealLabels,
  shapeLabels,
  strokeLabels,
  transitionLabels,
  typeStyleLabels,
  valignLabels,
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
  type CanvasElement,
  type FillStyle,
} from '@/model/types';
import { readFileAsDataUrl } from '@/lib/export/download';
import { overflowOf } from '@/lib/overflow';
import { selectCurrentSlide, useDeckStore, useSelectedElements } from '@/state/deckStore';
import { useThemeVersion } from '@/hooks/useTheme';
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
  if (!slide) return null;

  return (
    <div className="space-y-3 p-3">
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

      <Field label="Markdown" hint="Gesetzt im Satzspiegel des Layouts, in der Typo-Leiter der CI.">
        <textarea
          value={slide.markdown}
          spellCheck={false}
          onChange={(event) => setSlideMarkdown(event.target.value)}
          rows={12}
          className="nz-field resize-y font-mono text-[12px] leading-relaxed"
          placeholder={'# Heading\n\n- A point\n- Another point'}
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
    ...(unknown ? [{ value: current, label: `${current} — not installed` }] : []),
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

  const ids = useMemo(() => elements.map((element) => element.id), [elements]);
  const first = elements[0];
  // Eine Gruppe liegt vor, sobald das erste ausgewählte Element eine Kennung
  // trägt — die Auswahl umfasst dann ohnehin die ganze Gruppe.
  const gruppiert = Boolean(first?.group);
  // Nur bei einer einzelnen Auswahl: bei mehreren wüsste man nicht, welcher
  // Kasten gemeint ist, und „anpassen" träfe alle.
  const ueberlauf = elements.length === 1 && first ? overflowOf(first) : 0;

  const patch = (update: Partial<CanvasElement>, historic = true) => {
    if (historic) pushHistory();
    updateElements(ids, update);
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
        <NumberField label="Breite" value={first.w} min={1} onChange={(w) => patch({ w })} />
        <NumberField label="Höhe" value={first.h} min={0} onChange={(h) => patch({ h })} />
        <NumberField
          label="Drehung"
          value={first.rotation}
          step={1}
          onChange={(rotation) => patch({ rotation })}
        />
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

      <div className="grid grid-cols-2 gap-2">
        <Field label="Füllung">
          <Select
            value={first.fill}
            onChange={(event) => patch({ fill: event.target.value as FillStyle })}
            options={fillStyles.map((value) => ({ value, label: labelOf(fillLabels, value) }))}
          />
        </Field>
        <Field label="Strichstärke">
          <Select
            value={first.strokeWeight}
            onChange={(event) => patch({ strokeWeight: event.target.value as StrokeName })}
            options={strokeNames.map((value) => ({ value, label: labelOf(strokeLabels, value) }))}
          />
        </Field>
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
        <NumberField
          label="Innenabstand"
          value={first.padding}
          min={0}
          onChange={(padding) => patch({ padding })}
        />
      </div>

      {/* ------------------------------------------------------ kind-specific */}
      <KindFields element={first} patch={patch} />

      {/* ----------------------------------------------------------- reveal */}
      <div className="rounded-md border border-ui p-2">
        <Field label="Einblendschritt" hint="0 erscheint mit der Folie, ab 1 beim Weiterschalten.">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="nz-field w-16"
              value={first.reveal?.step ?? 0}
              onChange={(event) => setRevealStep(Number(event.target.value) || 0)}
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
          <Field label="Label">
            <input
              className="nz-field"
              value={element.label ?? ''}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
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
          <IconField
            value={element.icon}
            allowNone
            onChange={(icon) => patch({ icon } as Partial<CanvasElement>)}
          />
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
            onChange={(icon) => patch({ icon: icon ?? 'sparkle' } as Partial<CanvasElement>)}
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
            Dashed
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
              value={element.src.startsWith('data:') ? '(embedded image)' : element.src}
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
          <Field label="Alternativtext">
            <input
              className="nz-field"
              value={element.alt}
              onChange={(event) => patch({ alt: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
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

    default:
      return null;
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
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </Field>
  );
}
