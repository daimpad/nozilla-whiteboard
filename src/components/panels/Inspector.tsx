/**
 * The right-hand inspector: slide settings, the Markdown source for the current
 * slide, and the properties of whatever is selected on the canvas.
 *
 * Every control writes through a store action, so undo/redo and the dirty flag
 * work without the panel knowing they exist.
 */
import { useMemo, useState } from 'react';
import {
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
import { iconNames, type IconName } from '@/assets/icons';
import {
  cardVariants,
  connectorKinds,
  fillStyles,
  horizontalAligns,
  shapeNames,
  slideBackgrounds,
  verticalAligns,
  type CanvasElement,
  type FillStyle,
} from '@/model/types';
import { readFileAsDataUrl } from '@/lib/export/download';
import { selectCurrentSlide, useDeckStore, useSelectedElements } from '@/state/deckStore';
import {
  Button,
  Divider,
  Field,
  IconButton,
  Segmented,
  Select,
  cx,
} from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';

type Tab = 'slide' | 'element' | 'deck';

export function Inspector() {
  const slide = useDeckStore(selectCurrentSlide);
  const selected = useSelectedElements();
  const [tab, setTab] = useState<Tab>('slide');

  // Selecting something on the canvas pulls the panel to the element tab.
  const effectiveTab: Tab = selected.length > 0 && tab === 'slide' ? 'element' : tab;

  return (
    <aside
      className="flex h-full w-[300px] shrink-0 flex-col border-l border-line bg-surface"
      aria-label="Inspector"
    >
      <div className="flex items-center gap-1 border-b border-line px-2 py-2">
        <TabButton active={effectiveTab === 'slide'} onClick={() => setTab('slide')}>
          Slide
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
        'h-7 flex-1  text-ui-body font-medium transition-colors duration-fast ease-standard',
        active ? 'bg-signal text-ink' : 'text-ink-muted hover:bg-paper-deep',
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
          options={slideLayouts.map((value) => ({ value, label: titleCase(value) }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Background">
          <Select
            value={slide.meta.background}
            onChange={(event) =>
              setSlideMeta({ background: event.target.value as (typeof slideBackgrounds)[number] })
            }
            options={slideBackgrounds.map((value) => ({ value, label: titleCase(value) }))}
          />
        </Field>
        <Field label="Transition">
          <Select
            value={slide.meta.transition}
            onChange={(event) =>
              setSlideMeta({ transition: event.target.value as SlideTransition })
            }
            options={slideTransitions.map((value) => ({ value, label: titleCase(value) }))}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-ui-body text-ink-muted">
        <input
          type="checkbox"
          checked={Boolean(slide.meta.bare)}
          onChange={(event) => setSlideMeta({ bare: event.target.checked })}
        />
        Hide footer and slide number
      </label>

      <Field label="Markdown" hint="Rendered inside the layout frame with the CI type scale.">
        <textarea
          value={slide.markdown}
          spellCheck={false}
          onChange={(event) => setSlideMarkdown(event.target.value)}
          rows={12}
          className="nz-field resize-y font-mono text-[12px] leading-relaxed"
          placeholder={'# Heading\n\n- A point\n- Another point'}
        />
      </Field>

      <Field label="Presenter notes">
        <textarea
          value={slide.meta.notes ?? ''}
          onChange={(event) => setSlideMeta({ notes: event.target.value })}
          rows={4}
          className="nz-field resize-y"
          placeholder="Only you see these."
        />
      </Field>
    </div>
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
      <Field label="Title">
        <input
          className="nz-field"
          value={meta.title}
          onChange={(event) => setDeckMeta({ title: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Author">
          <input
            className="nz-field"
            value={meta.author ?? ''}
            onChange={(event) => setDeckMeta({ author: event.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            className="nz-field"
            value={meta.date ?? ''}
            placeholder="2026-08-07"
            onChange={(event) => setDeckMeta({ date: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Footer" hint="Shown bottom-left on every slide that allows chrome.">
        <input
          className="nz-field"
          value={meta.footer ?? ''}
          onChange={(event) => setDeckMeta({ footer: event.target.value })}
        />
      </Field>

      <dl className=" border border-line bg-surface-alt p-2 text-[11px] text-ink-muted">
        <div className="flex justify-between">
          <dt>Slides</dt>
          <dd className="font-mono">{slideCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Canvas elements</dt>
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
  const deleteSelection = useDeckStore((state) => state.deleteSelection);
  const setRevealStep = useDeckStore((state) => state.setRevealStep);

  const ids = useMemo(() => elements.map((element) => element.id), [elements]);
  const first = elements[0];

  const patch = (update: Partial<CanvasElement>, historic = true) => {
    if (historic) pushHistory();
    updateElements(ids, update);
  };

  if (!first) {
    return (
      <div className="p-6 text-center text-ui-body text-ink-subtle">
        <Icon name="table" size={22} className="mx-auto mb-2 opacity-50" />
        Nothing selected.
        <br />
        Pick an element on the canvas, or add one from the library.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* ----------------------------------------------------------- actions */}
      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          icon="layer-group"
          label="Bring to front"
          onClick={() => reorderSelection('front')}
        />
        <IconButton
          icon="arrow-up"
          label="Bring forward"
          onClick={() => reorderSelection('forward')}
        />
        <IconButton
          icon="arrow-down"
          label="Send backward"
          onClick={() => reorderSelection('backward')}
        />
        <IconButton icon="square" label="Send to back" onClick={() => reorderSelection('back')} />
        <Divider />
        <IconButton icon="plus" label="Duplicate" onClick={duplicateSelection} />
        <IconButton
          icon={first.locked ? 'lock' : 'key'}
          label={first.locked ? 'Unlock' : 'Lock'}
          active={first.locked}
          onClick={() => patch({ locked: !first.locked })}
        />
        <IconButton icon="xmark" label="Delete" tone="danger" onClick={deleteSelection} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          icon="chevron-right"
          label="Align left"
          className="rotate-180"
          onClick={() => alignSelection('left')}
        />
        <IconButton
          icon="minus"
          label="Align horizontal centres"
          onClick={() => alignSelection('hcenter')}
        />
        <IconButton
          icon="chevron-right"
          label="Align right"
          onClick={() => alignSelection('right')}
        />
        <Divider />
        <IconButton
          icon="chevron-down"
          label="Align top"
          className="rotate-180"
          onClick={() => alignSelection('top')}
        />
        <IconButton
          icon="minus"
          label="Align vertical centres"
          className="rotate-90"
          onClick={() => alignSelection('vcenter')}
        />
        <IconButton
          icon="chevron-down"
          label="Align bottom"
          onClick={() => alignSelection('bottom')}
        />
        <Divider />
        <IconButton
          icon="table"
          label="Distribute horizontally"
          onClick={() => distributeSelection('h')}
          disabled={elements.length < 3}
        />
        <IconButton
          icon="layer-group"
          label="Distribute vertically"
          onClick={() => distributeSelection('v')}
          disabled={elements.length < 3}
        />
      </div>

      {/* -------------------------------------------------------- geometry */}
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={first.x} onChange={(x) => patch({ x })} />
        <NumberField label="Y" value={first.y} onChange={(y) => patch({ y })} />
        <NumberField label="Width" value={first.w} min={1} onChange={(w) => patch({ w })} />
        <NumberField label="Height" value={first.h} min={0} onChange={(h) => patch({ h })} />
        <NumberField
          label="Rotation"
          value={first.rotation}
          step={1}
          onChange={(rotation) => patch({ rotation })}
        />
        <NumberField
          label="Opacity %"
          value={Math.round(first.opacity * 100)}
          min={0}
          max={100}
          onChange={(value) => patch({ opacity: Math.min(1, Math.max(0, value / 100)) })}
        />
      </div>

      {/* ------------------------------------------------------------- CI */}
      <Field label="Tone">
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
                'h-6 w-6  border transition-transform duration-fast ease-standard',
                first.tone === name ? 'scale-110 border-ink' : 'border-line hover:scale-105',
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
        <Field label="Fill">
          <Select
            value={first.fill}
            onChange={(event) => patch({ fill: event.target.value as FillStyle })}
            options={fillStyles.map((value) => ({ value, label: titleCase(value) }))}
          />
        </Field>
        <Field label="Line weight">
          <Select
            value={first.strokeWeight}
            onChange={(event) => patch({ strokeWeight: event.target.value as StrokeName })}
            options={strokeNames.map((value) => ({ value, label: titleCase(value) }))}
          />
        </Field>
        <Field label="Schatten" hint="Harter Versatz, kein Weichzeichner.">
          <Select
            value={first.shadow}
            onChange={(event) => patch({ shadow: event.target.value as ShadowName })}
            options={shadowNames.map((value) => ({
              value,
              label: value === 'none' ? 'ohne' : `${shadowOffset[value]} px`,
            }))}
          />
        </Field>
        <NumberField
          label="Padding"
          value={first.padding}
          min={0}
          onChange={(padding) => patch({ padding })}
        />
      </div>

      {/* ------------------------------------------------------ kind-specific */}
      <KindFields element={first} patch={patch} />

      {/* ----------------------------------------------------------- reveal */}
      <div className=" border border-line p-2">
        <Field label="Reveal step" hint="0 shows with the slide; 1+ appears on an advance.">
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
              options={revealAnimations.map((value) => ({ value, label: titleCase(value) }))}
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
            <Field label="Type style">
              <Select
                value={element.typeStyle}
                onChange={(event) =>
                  patch({
                    typeStyle: event.target.value as TypeStyleName,
                  } as Partial<CanvasElement>)
                }
                options={(Object.keys(typeScale) as TypeStyleName[]).map((value) => ({
                  value,
                  label: `${value} · ${typeScale[value].size}px`,
                }))}
              />
            </Field>
            <Field label="Align">
              <Select
                value={element.align}
                onChange={(event) => patch({ align: event.target.value } as Partial<CanvasElement>)}
                options={horizontalAligns.map((value) => ({ value, label: titleCase(value) }))}
              />
            </Field>
          </div>
          <Field label="Vertical align">
            <Segmented
              value={element.valign}
              onChange={(valign) => patch({ valign } as Partial<CanvasElement>)}
              options={verticalAligns.map((value) => ({ value, label: titleCase(value) }))}
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
          <Field label="Align">
            <Segmented
              value={element.align}
              onChange={(align) => patch({ align } as Partial<CanvasElement>)}
              options={horizontalAligns.map((value) => ({ value, label: titleCase(value) }))}
            />
          </Field>
        </>
      );

    case 'card':
      return (
        <>
          <Field label="Variant">
            <Select
              value={element.variant}
              onChange={(event) => patch({ variant: event.target.value } as Partial<CanvasElement>)}
              options={cardVariants.map((value) => ({ value, label: titleCase(value) }))}
            />
          </Field>
          <Field label="Label">
            <input
              className="nz-field"
              value={element.label ?? ''}
              onChange={(event) => patch({ label: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field label="Title">
            <textarea
              rows={2}
              className="nz-field resize-y"
              value={element.title}
              onChange={(event) => patch({ title: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field label="Body">
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
          <Field label="Frame">
            <Segmented
              value={element.frame}
              onChange={(frame) => patch({ frame } as Partial<CanvasElement>)}
              options={[
                { value: 'none' as const, label: 'None' },
                { value: 'square' as const, label: 'Tile' },
                { value: 'circle' as const, label: 'Circle' },
              ]}
            />
          </Field>
        </>
      );

    case 'shape':
      return (
        <>
          <Field label="Shape">
            <Select
              value={element.shape}
              onChange={(event) => patch({ shape: event.target.value } as Partial<CanvasElement>)}
              options={shapeNames.map((value) => ({ value, label: titleCase(value) }))}
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
          <Field label="Connector">
            <Select
              value={element.connector}
              onChange={(event) =>
                patch({ connector: event.target.value } as Partial<CanvasElement>)
              }
              options={connectorKinds.map((value) => ({ value, label: titleCase(value) }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-ui-body text-ink-muted">
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
          <Field label="Source" hint="A path relative to the deck, or an embedded data URI.">
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
            Embed a file
          </Button>
          <Field label="Alt text">
            <input
              className="nz-field"
              value={element.alt}
              onChange={(event) => patch({ alt: event.target.value } as Partial<CanvasElement>)}
            />
          </Field>
          <Field label="Fit">
            <Segmented
              value={element.fit}
              onChange={(fit) => patch({ fit } as Partial<CanvasElement>)}
              options={[
                { value: 'contain' as const, label: 'Contain' },
                { value: 'cover' as const, label: 'Cover' },
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

function IconField({
  value,
  onChange,
  allowNone,
}: {
  value: IconName | undefined;
  onChange: (icon: IconName | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <Field label="Icon">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center border border-line bg-surface-alt text-ink">
          {value ? <Icon name={value} size={17} /> : <span className="text-ink-subtle">—</span>}
        </span>
        <Select
          className="flex-1"
          value={value ?? ''}
          onChange={(event) => onChange((event.target.value || undefined) as IconName | undefined)}
          options={[
            ...(allowNone ? [{ value: '', label: 'None' }] : []),
            ...iconNames.map((name) => ({ value: name, label: name })),
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

function titleCase(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
