// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseDeck } from '@/lib/markdown/deck';
import { deckToPptx } from './pptx';

const DECK = [
  '<!-- nzl',
  'elements:',
  '  - kind: shape',
  '    x: 100',
  '    y: 100',
  '    w: 200',
  '    h: 100',
  '    shape: rectangle',
  '    fill: framed',
  '    opacity: 0.4',
  '-->',
  '',
  '# T',
].join('\n');

async function readZip(blob: Blob): Promise<Map<string, string>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const out = new Map<string, string>();
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < count; i += 1) {
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const localName = view.getUint16(localAt + 26, true);
    const localExtra = view.getUint16(localAt + 28, true);
    const dataAt = localAt + 30 + localName + localExtra;
    const raw = bytes.subarray(dataAt, dataAt + compressed);
    const plain =
      method === 0
        ? raw
        : new Uint8Array(
            await new Response(
              new Blob([raw.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
            ).arrayBuffer(),
          );
    out.set(name, new TextDecoder().decode(plain));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return out;
}

describe('opacity probe', () => {
  it('dumps', async () => {
    const deck = parseDeck(DECK);
    const parts = await readZip(await deckToPptx(deck, { images: new Map() }));
    const slide = parts.get('ppt/slides/slide1.xml')!;
    const m = /<p:sp><p:nvSpPr><p:cNvPr id="3".*?<\/p:spPr>/s.exec(slide);
    console.log(m?.[0]);
    expect(true).toBe(true);
  });
});
