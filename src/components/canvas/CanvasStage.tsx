/**
 * The interactive canvas.
 *
 * The slide itself is drawn by `<SlideView/>` (SVG). Everything you can *grab*
 * lives in a DOM overlay above it: hit areas, the selection frame, resize and
 * rotate handles, the marquee and the smart-alignment guides. Keeping the two
 * apart means the drawing layer stays export-identical while the interaction
 * layer can be as chatty as it likes.
 *
 * Deshalb zieht diese Datei ihre Farben aus `ui.*`, nicht aus der CI: Rahmen,
 * Griffe, Hilfslinien und Raster sind Werkzeug und werden nie exportiert.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { canvas as canvasTokens, motion, ui } from '@/theme';
import { connectorLabels, labelOf, shapeLabels } from '@/lib/labels';
import {
  computeSnap,
  normalizeRect,
  rectsIntersect,
  resizeHandles,
  resizeRect,
  rotatePoint,
  unionRects,
  type Guide,
  type Rect,
  type ResizeHandle,
} from '@/lib/geometry/snap';
import { useDeckStore } from '@/state/deckStore';
import type { CanvasElement, Deck, Slide } from '@/model/types';
import { useElementSize } from '@/hooks/useElementSize';
import { SlideView } from './SlideView';

const ROTATE_SNAP = 15;

interface Gesture {
  kind: 'move' | 'resize' | 'rotate' | 'marquee';
  pointerId: number;
  start: { x: number; y: number };
  originals: Map<string, Rect>;
  rotations: Map<string, number>;
  handle?: ResizeHandle;
  primaryId?: string;
  center?: { x: number; y: number };
  startAngle?: number;
  moved: boolean;
}

export interface CanvasStageProps {
  slide: Slide;
  deck: Deck;
  slideNumber: number;
  totalSlides: number;
}

export function CanvasStage({ slide, deck, slideNumber, totalSlides }: CanvasStageProps) {
  const [setViewport, viewport] = useElementSize<HTMLDivElement>();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);

  const zoom = useDeckStore((state) => state.zoom);
  const selection = useDeckStore((state) => state.selection);
  const guides = useDeckStore((state) => state.guides);
  const showGrid = useDeckStore((state) => state.showGrid);
  const snapOptions = useDeckStore((state) => state.snap);

  const select = useDeckStore((state) => state.select);
  const toggleSelect = useDeckStore((state) => state.toggleSelect);
  const clearSelection = useDeckStore((state) => state.clearSelection);
  const pushHistory = useDeckStore((state) => state.pushHistory);
  const transformElements = useDeckStore((state) => state.transformElements);
  const setGuides = useDeckStore((state) => state.setGuides);

  const padding = 40;
  const fitScale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(
          (viewport.width - padding * 2) / canvasTokens.width,
          (viewport.height - padding * 2) / canvasTokens.height,
        )
      : 0.5;
  const scale = zoom === 'fit' ? Math.max(0.05, fitScale) : zoom;

  const selectionSet = useMemo(() => new Set(selection), [selection]);
  const selectedElements = useMemo(
    () => slide.elements.filter((element) => selectionSet.has(element.id)),
    [slide.elements, selectionSet],
  );

  /** Client coordinates → slide coordinates. */
  const toSlide = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    },
    [scale],
  );

  /* ------------------------------------------------------------- gestures */

  const beginGesture = useCallback(
    (
      event: React.PointerEvent,
      kind: Gesture['kind'],
      options: { handle?: ResizeHandle; primaryId?: string; ids?: string[] } = {},
    ) => {
      const point = toSlide(event.clientX, event.clientY);
      const ids = options.ids ?? selection;
      const originals = new Map<string, Rect>();
      const rotations = new Map<string, number>();
      for (const element of slide.elements) {
        if (!ids.includes(element.id)) continue;
        originals.set(element.id, { x: element.x, y: element.y, w: element.w, h: element.h });
        rotations.set(element.id, element.rotation);
      }

      let center: { x: number; y: number } | undefined;
      let startAngle: number | undefined;
      if (kind === 'rotate' && options.primaryId) {
        const rect = originals.get(options.primaryId);
        if (rect) {
          center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
          startAngle = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
        }
      }

      gestureRef.current = {
        kind,
        pointerId: event.pointerId,
        start: point,
        originals,
        rotations,
        handle: options.handle,
        primaryId: options.primaryId,
        center,
        startAngle,
        moved: false,
      };

      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    [selection, slide.elements, toSlide],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const point = toSlide(event.clientX, event.clientY);
      const dx = point.x - gesture.start.x;
      const dy = point.y - gesture.start.y;

      if (!gesture.moved) {
        if (Math.abs(dx) * scale < 2 && Math.abs(dy) * scale < 2) return;
        gesture.moved = true;
        if (gesture.kind !== 'marquee') pushHistory();
      }

      switch (gesture.kind) {
        case 'marquee': {
          setMarquee(normalizeRect(gesture.start.x, gesture.start.y, point.x, point.y));
          break;
        }

        case 'move': {
          const primaryId = gesture.primaryId ?? [...gesture.originals.keys()][0];
          const primary = primaryId ? gesture.originals.get(primaryId) : undefined;
          if (!primary) break;

          const others = slide.elements
            .filter((element) => !gesture.originals.has(element.id))
            .map((element) => ({ x: element.x, y: element.y, w: element.w, h: element.h }));

          const proposed = { ...primary, x: primary.x + dx, y: primary.y + dy };
          const snapped = event.altKey
            ? { x: proposed.x, y: proposed.y, guides: [] as Guide[] }
            : computeSnap(proposed, others, snapOptions);

          const appliedDx = snapped.x - primary.x;
          const appliedDy = snapped.y - primary.y;
          setGuides(snapped.guides);

          transformElements(
            (element) => {
              const original = gesture.originals.get(element.id);
              if (!original || element.locked) return null;
              return { x: original.x + appliedDx, y: original.y + appliedDy };
            },
            [...gesture.originals.keys()],
          );
          break;
        }

        case 'resize': {
          const id = gesture.primaryId;
          const original = id ? gesture.originals.get(id) : undefined;
          if (!id || !original || !gesture.handle) break;

          // Express the drag in the element's own (unrotated) frame.
          const rotation = gesture.rotations.get(id) ?? 0;
          const local = rotatePoint(dx, dy, 0, 0, -rotation);

          const next = resizeRect(original, gesture.handle, local.x, local.y, {
            lockAspect: event.shiftKey,
            fromCenter: event.altKey,
            snap: snapOptions,
          });

          // Keep the visual centre stable when the element is rotated.
          let { x, y } = next;
          if (rotation) {
            const oldCenter = { x: original.x + original.w / 2, y: original.y + original.h / 2 };
            const newCenter = { x: next.x + next.w / 2, y: next.y + next.h / 2 };
            const delta = rotatePoint(
              newCenter.x - oldCenter.x,
              newCenter.y - oldCenter.y,
              0,
              0,
              rotation,
            );
            x = oldCenter.x + delta.x - next.w / 2;
            y = oldCenter.y + delta.y - next.h / 2;
          }

          transformElements(() => ({ x, y, w: next.w, h: next.h }), [id]);
          break;
        }

        case 'rotate': {
          const id = gesture.primaryId;
          if (!id || !gesture.center || gesture.startAngle === undefined) break;
          const angle =
            (Math.atan2(point.y - gesture.center.y, point.x - gesture.center.x) * 180) / Math.PI;
          const base = gesture.rotations.get(id) ?? 0;
          let rotation = base + (angle - gesture.startAngle);
          if (!event.altKey) rotation = Math.round(rotation / ROTATE_SNAP) * ROTATE_SNAP;
          transformElements(() => ({ rotation: normalizeAngle(rotation) }), [id]);
          break;
        }
      }
    },
    [pushHistory, scale, setGuides, slide.elements, snapOptions, toSlide, transformElements],
  );

  const endGesture = useCallback(
    (event: React.PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);

      if (gesture.kind === 'marquee') {
        const box = marquee;
        setMarquee(null);
        if (box && box.w > 2 && box.h > 2) {
          const hits = slide.elements
            .filter((element) =>
              rectsIntersect(box, { x: element.x, y: element.y, w: element.w, h: element.h }),
            )
            .map((element) => element.id);
          select(event.shiftKey ? [...selection, ...hits] : hits);
        } else if (!event.shiftKey) {
          clearSelection();
        }
      }

      setGuides([]);
    },
    [clearSelection, marquee, select, selection, setGuides, slide.elements],
  );

  /* -------------------------------------------------------------- surface */

  const onSurfacePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-hit-element]') || target.closest('[data-handle]')) return;
      if (!event.shiftKey) clearSelection();
      beginGesture(event, 'marquee', { ids: [] });
    },
    [beginGesture, clearSelection],
  );

  const onElementPointerDown = useCallback(
    (event: React.PointerEvent, element: CanvasElement) => {
      if (event.button !== 0) return;
      event.stopPropagation();

      let ids = selection;
      if (event.shiftKey) {
        toggleSelect(element.id);
        ids = selection.includes(element.id)
          ? selection.filter((id) => id !== element.id)
          : [...selection, element.id];
      } else if (!selection.includes(element.id)) {
        select([element.id]);
        ids = [element.id];
      }

      if (element.locked) return;
      beginGesture(event, 'move', { primaryId: element.id, ids });
    },
    [beginGesture, select, selection, toggleSelect],
  );

  /* --------------------------------------------------------------- render */

  const surfaceStyle: React.CSSProperties = {
    width: canvasTokens.width * scale,
    height: canvasTokens.height * scale,
  };

  return (
    <div
      ref={setViewport}
      className="relative flex h-full w-full items-center justify-center overflow-auto bg-ui-canvas p-10"
      data-testid="canvas-viewport"
    >
      <div
        ref={surfaceRef}
        className="nz-stage relative shrink-0 touch-none select-none"
        style={surfaceStyle}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <SlideView
          slide={slide}
          deck={deck}
          slideNumber={slideNumber}
          totalSlides={totalSlides}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-[inherit]"
        />

        {showGrid ? <GridOverlay scale={scale} /> : null}

        {/* Hit areas — one per element, above the drawing, below the handles. */}
        <div className="absolute inset-0">
          {slide.elements.map((element) => (
            <div
              key={element.id}
              data-hit-element={element.id}
              data-locked={element.locked || undefined}
              role="button"
              tabIndex={-1}
              aria-label={elementLabel(element)}
              className="nz-hit"
              style={hitStyle(element, scale, selectionSet.has(element.id))}
              onPointerDown={(event) => onElementPointerDown(event, element)}
            />
          ))}
        </div>

        <SelectionOverlay
          elements={selectedElements}
          scale={scale}
          onResizeStart={(event, element, handle) => {
            event.stopPropagation();
            beginGesture(event, 'resize', {
              handle,
              primaryId: element.id,
              ids: [element.id],
            });
          }}
          onRotateStart={(event, element) => {
            event.stopPropagation();
            beginGesture(event, 'rotate', { primaryId: element.id, ids: [element.id] });
          }}
        />

        <GuideOverlay guides={guides} scale={scale} />

        {marquee ? (
          <div
            className="pointer-events-none absolute border"
            style={{
              left: marquee.x * scale,
              top: marquee.y * scale,
              width: marquee.w * scale,
              height: marquee.h * scale,
              borderColor: ui.select,
              background: ui.selectWash,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlays                                                                    */
/* -------------------------------------------------------------------------- */

function GridOverlay({ scale }: { scale: number }) {
  const step = canvasTokens.gridSize * scale;
  const major = step * canvasTokens.gridMajorEvery;
  if (step < 3) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        backgroundImage: `radial-gradient(${ui.grid} 1px, transparent 1px)`,
        backgroundSize: `${major}px ${major}px`,
        opacity: 0.5,
      }}
    />
  );
}

interface SelectionOverlayProps {
  elements: CanvasElement[];
  scale: number;
  onResizeStart: (event: React.PointerEvent, element: CanvasElement, handle: ResizeHandle) => void;
  onRotateStart: (event: React.PointerEvent, element: CanvasElement) => void;
}

function SelectionOverlay({
  elements,
  scale,
  onResizeStart,
  onRotateStart,
}: SelectionOverlayProps) {
  if (elements.length === 0) return null;
  const single = elements.length === 1 ? elements[0] : null;
  const bounds =
    elements.length > 1
      ? unionRects(elements.map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h })))
      : null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {bounds ? (
        <div
          className="absolute border border-dashed"
          style={{
            left: bounds.x * scale,
            top: bounds.y * scale,
            width: bounds.w * scale,
            height: bounds.h * scale,
            borderColor: ui.select,
          }}
        />
      ) : null}

      {elements.map((element) => (
        <div
          key={element.id}
          className="absolute"
          style={{
            left: element.x * scale,
            top: element.y * scale,
            width: element.w * scale,
            height: element.h * scale,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
            transformOrigin: 'center center',
            outline: `1.5px solid ${ui.select}`,
            outlineOffset: 0,
          }}
        >
          {single && !element.locked ? (
            <>
              {resizeHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  data-handle={handle}
                  aria-label={`Resize ${handle}`}
                  className="nz-handle pointer-events-auto"
                  style={handleStyle(handle, element, scale)}
                  onPointerDown={(event) => onResizeStart(event, element, handle)}
                />
              ))}
              <button
                type="button"
                data-handle="rotate"
                aria-label="Drehen"
                className="nz-handle nz-handle--round pointer-events-auto"
                style={{
                  left: (element.w * scale) / 2 - 5,
                  top: -26,
                  cursor: 'grab',
                }}
                onPointerDown={(event) => onRotateStart(event, element)}
              />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function GuideOverlay({ guides, scale }: { guides: Guide[]; scale: number }) {
  if (guides.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {guides.map((guide, index) =>
        guide.orientation === 'v' ? (
          <div
            key={`v-${index}`}
            className="absolute"
            style={{
              left: guide.position * scale,
              top: Math.min(guide.start, 0) * scale,
              width: 1,
              height: (Math.max(guide.end, canvasTokens.height) - Math.min(guide.start, 0)) * scale,
              background: ui.select,
              transition: `opacity ${motion.duration.fast}ms linear`,
            }}
          />
        ) : (
          <div
            key={`h-${index}`}
            className="absolute"
            style={{
              top: guide.position * scale,
              left: Math.min(guide.start, 0) * scale,
              height: 1,
              width: (Math.max(guide.end, canvasTokens.width) - Math.min(guide.start, 0)) * scale,
              background: ui.select,
            }}
          />
        ),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Style helpers                                                               */
/* -------------------------------------------------------------------------- */

function hitStyle(element: CanvasElement, scale: number, selected: boolean): React.CSSProperties {
  return {
    left: element.x * scale,
    top: element.y * scale,
    width: element.w * scale,
    height: Math.max(element.h, canvasTokens.minElementSize / 2) * scale,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    cursor: element.locked ? 'not-allowed' : selected ? 'move' : 'pointer',
  };
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

function handleStyle(
  handle: ResizeHandle,
  element: CanvasElement,
  scale: number,
): React.CSSProperties {
  const w = element.w * scale;
  const h = element.h * scale;
  const half = 5;
  const x = handle.includes('w') ? -half : handle.includes('e') ? w - half : w / 2 - half;
  const y = handle.startsWith('n') ? -half : handle.startsWith('s') ? h - half : h / 2 - half;
  return { left: x, top: y, cursor: HANDLE_CURSORS[handle] };
}

function elementLabel(element: CanvasElement): string {
  if (element.name) return element.name;
  switch (element.kind) {
    case 'text':
      return element.text.slice(0, 40) || 'Text';
    case 'card':
      return element.title || 'Karte';
    case 'badge':
      return element.text || 'Badge';
    case 'icon':
      return `Zeichen ${element.icon}`;
    case 'shape':
      return element.label || labelOf(shapeLabels, element.shape);
    case 'connector':
      return labelOf(connectorLabels, element.connector);
    case 'image':
      return element.alt || 'Bild';
    default:
      return 'Markdown-Block';
  }
}

function normalizeAngle(degrees: number): number {
  const value = degrees % 360;
  return Math.abs(value) < 0.01 ? 0 : value;
}
