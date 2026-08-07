/**
 * The CI asset palette.
 *
 * Every tile previews itself by running the real scene pipeline at thumbnail
 * scale, so the palette can never advertise something the canvas would draw
 * differently.
 */
import { memo, useMemo, useState } from 'react';
import { color as ci, elementTones, toneNames, type ToneName } from '@/theme';
import {
  assetPresets,
  presetGroupLabels,
  presetGroups,
  type AssetPreset,
  type PresetGroup,
} from '@/assets/presets';
import { iconsByCategory, searchIcons, type IconName } from '@/assets/icons';
import { buildElementPrims } from '@/lib/export/scene';
import { primsToSvgMarkup } from '@/lib/export/svg';
import { createElement } from '@/model/factory';
import type { CanvasElement } from '@/model/types';
import { useDeckStore } from '@/state/deckStore';
import { Icon } from '@/components/ui/Icon';
import { cx, SectionTitle } from '@/components/ui/controls';

type Tab = 'elements' | 'icons';

export function AssetSidebar() {
  const [tab, setTab] = useState<Tab>('elements');
  const [tone, setTone] = useState<ToneName>('paper');
  const [query, setQuery] = useState('');
  const insertPreset = useDeckStore((state) => state.insertPreset);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assetPresets;
    return assetPresets.filter(
      (preset) => preset.label.toLowerCase().includes(needle) || preset.kind.includes(needle),
    );
  }, [query]);

  const iconMatches = useMemo(() => (query ? searchIcons(query) : null), [query]);

  return (
    <aside
      className="flex h-full w-[268px] shrink-0 flex-col border-r border-ui bg-ui-surface"
      aria-label="Asset library"
    >
      <div className="flex items-center gap-1 border-b border-ui px-2 py-2">
        <TabButton
          active={tab === 'elements'}
          onClick={() => setTab('elements')}
          icon="layer-group"
        >
          Elements
        </TabButton>
        <TabButton
          active={tab === 'icons'}
          onClick={() => setTab('icons')}
          icon="wand-magic-sparkles"
        >
          Icons
        </TabButton>
      </div>

      <div className="border-b border-ui p-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ui-faint">
            <Icon name="magnifying-glass" size={13} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === 'icons' ? 'Search icons' : 'Search elements'}
            className="nz-field pl-8"
            aria-label="Search the asset library"
          />
        </div>

        <div className="mt-2 flex items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
            Tone
          </span>
          {toneNames.map((name) => (
            <button
              key={name}
              type="button"
              title={elementTones[name].label}
              aria-label={`Use the ${elementTones[name].label} tone`}
              aria-pressed={tone === name}
              onClick={() => setTone(name)}
              className={cx(
                'h-5 w-5 rounded-sm border transition-transform duration-fast ease-standard',
                tone === name
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {tab === 'elements' ? (
          presetGroups.map((group) => {
            const items = filtered.filter((preset) => preset.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <SectionTitle>{presetGroupLabels[group as PresetGroup]}</SectionTitle>
                <div className="grid grid-cols-2 gap-2 px-3">
                  {items.map((preset) => (
                    <PresetTile
                      key={preset.id}
                      preset={preset}
                      tone={tone}
                      onInsert={() =>
                        insertPreset(preset.kind, {
                          ...preset.patch,
                          tone,
                        } as Partial<CanvasElement>)
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <IconPalette tone={tone} matches={iconMatches} />
        )}
      </div>

      <p className="border-t border-ui px-3 py-2 text-[11px] leading-snug text-ui-faint">
        Click to place at the centre of the slide. Everything inherits the CI tone, radii and line
        weights automatically.
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm text-ui-body font-medium',
        'transition-colors duration-fast ease-standard',
        active ? 'bg-ui-accent-soft text-ui-ink' : 'text-ui-muted hover:bg-ui-sunken',
      )}
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

interface PresetTileProps {
  preset: AssetPreset;
  tone: ToneName;
  onInsert: () => void;
}

const PresetTile = memo(function PresetTile({ preset, tone, onInsert }: PresetTileProps) {
  const markup = useMemo(() => {
    const element = createElement(preset.kind, {
      ...preset.patch,
      tone,
      x: 0,
      y: 0,
    } as never);
    return {
      html: primsToSvgMarkup(buildElementPrims(element)),
      w: element.w,
      h: Math.max(element.h, 24),
    };
  }, [preset, tone]);

  const pad = 10;

  return (
    <button
      type="button"
      onClick={onInsert}
      title={preset.hint ?? `Add ${preset.label}`}
      className={cx(
        'group flex flex-col items-stretch gap-1 rounded-md border border-ui bg-ui-surface p-1.5',
        'text-left transition-all duration-fast ease-standard',
        'hover:-translate-y-px hover:border-ui-accent-border hover:shadow-ui-md',
      )}
    >
      <span
        className="flex h-[54px] items-center justify-center overflow-hidden bg-ui-subtle"
        aria-hidden="true"
      >
        <svg
          viewBox={`${-pad} ${-pad} ${markup.w + pad * 2} ${markup.h + pad * 2}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          dangerouslySetInnerHTML={{ __html: markup.html }}
        />
      </span>
      <span className="truncate text-[11px] font-medium text-ui-muted group-hover:text-ui-ink">
        {preset.label}
      </span>
    </button>
  );
});

/* -------------------------------------------------------------------------- */

function IconPalette({ tone, matches }: { tone: ToneName; matches: IconName[] | null }) {
  const insertPreset = useDeckStore((state) => state.insertPreset);
  const groups = useMemo(() => iconsByCategory(), []);
  const visible = matches ? new Set(matches) : null;

  const add = (name: IconName, frame: 'none' | 'square' | 'circle') => {
    insertPreset('icon', {
      icon: name,
      tone,
      frame,
      fill: frame === 'none' ? 'none' : 'soft',
      w: frame === 'none' ? 72 : 88,
      h: frame === 'none' ? 72 : 88,
    } as Partial<CanvasElement>);
  };

  return (
    <>
      <div className="px-3 pt-3">
        <p className="text-[11px] leading-snug text-ui-faint">
          Click for a plain glyph, ⇧-click for a tinted tile.
        </p>
      </div>
      {groups.map((group) => {
        const names = visible ? group.names.filter((name) => visible.has(name)) : group.names;
        if (names.length === 0) return null;
        return (
          <section key={group.category}>
            <SectionTitle>{group.category}</SectionTitle>
            <div className="grid grid-cols-6 gap-1 px-3">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={`Add the ${name} icon`}
                  onClick={(event) => add(name, event.shiftKey ? 'square' : 'none')}
                  className={cx(
                    'flex aspect-square items-center justify-center rounded-sm border border-transparent',
                    'transition-colors duration-fast ease-standard hover:border-ui hover:bg-ui-subtle',
                  )}
                  style={{ color: ci.ink }}
                >
                  <Icon name={name} size={18} />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
