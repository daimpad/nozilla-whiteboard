/**
 * Image resolution for export.
 *
 * SVG can reference an image by URL, but a PDF needs the actual bytes and both
 * need intrinsic dimensions to lay Markdown figures out correctly. This module
 * loads every image a deck references once, up front, and hands back a lookup
 * the scene builder and the PDF writer share.
 */
import type { Deck } from '@/model/types';

export interface ResolvedImage {
  src: string;
  dataUrl: string;
  format: string;
  w: number;
  h: number;
}

export type ImageMap = Map<string, ResolvedImage>;

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

/** Every image source a deck refers to, from elements and from Markdown. */
export function collectImageSources(deck: Deck): string[] {
  const found = new Set<string>();

  const scanMarkdown = (markdown: string) => {
    for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
      if (match[1]) found.add(match[1]);
    }
  };

  for (const slide of deck.slides) {
    scanMarkdown(slide.markdown);
    for (const element of slide.elements) {
      if (element.kind === 'image' && element.src) found.add(element.src);
      if (element.kind === 'markdown') scanMarkdown(element.markdown);
    }
  }

  return [...found];
}

/**
 * Load every source into a data URL plus its intrinsic size. Failures are
 * skipped rather than thrown — one missing image must not fail an export.
 */
export async function resolveImages(sources: readonly string[]): Promise<ImageMap> {
  const entries = await Promise.all(sources.map((src) => resolveOne(src)));
  const map: ImageMap = new Map();
  for (const entry of entries) {
    if (entry) map.set(entry.src, entry);
  }
  return map;
}

export async function resolveDeckImages(deck: Deck): Promise<ImageMap> {
  return resolveImages(collectImageSources(deck));
}

async function resolveOne(src: string): Promise<ResolvedImage | null> {
  try {
    const image = await loadImage(src);
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    const { dataUrl, format } = src.startsWith('data:')
      ? { dataUrl: src, format: formatOf(src) }
      : rasterize(image, w, h);
    return { src, dataUrl, format, w, h };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function rasterize(
  image: HTMLImageElement,
  w: number,
  h: number,
): { dataUrl: string; format: string } {
  const surface = document.createElement('canvas');
  surface.width = Math.max(1, w);
  surface.height = Math.max(1, h);
  const context = surface.getContext('2d');
  if (!context) throw new Error('No 2-D context available for image rasterisation');
  context.drawImage(image, 0, 0);
  return { dataUrl: surface.toDataURL('image/png'), format: 'PNG' };
}

function formatOf(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  if (dataUrl.startsWith('data:image/gif')) return 'GIF';
  return 'JPEG';
}

/** A `resolveImageSize` callback for the typesetter, backed by an `ImageMap`. */
export function sizeResolver(map: ImageMap) {
  return (src: string): { w: number; h: number } | undefined => {
    const entry = map.get(src);
    return entry ? { w: entry.w, h: entry.h } : undefined;
  };
}

/** Replace remote/relative hrefs with their data URLs so an SVG is standalone. */
export function inlineImageHrefs(svg: string, map: ImageMap): string {
  let out = svg;
  for (const [src, entry] of map) {
    if (src === entry.dataUrl) continue;
    out = out.split(escapeXmlAttr(src)).join(entry.dataUrl);
  }
  return out;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
