/**
 * Ein kleiner ZIP-Schreiber.
 *
 * Eine `.pptx` ist ein ZIP mit XML darin. Dafür eine Bibliothek zu laden wäre
 * ein Paket mehr im Bündel für eine Handvoll Byte-Strukturen, die seit 1989
 * unverändert sind — hier stehen sie ausgeschrieben.
 *
 * Komprimiert wird mit `CompressionStream('deflate-raw')`, das jeder Browser
 * mitbringt, den dieses Werkzeug ohnehin voraussetzt. Fehlt es, werden die
 * Einträge unkomprimiert abgelegt: die Datei wird größer, bleibt aber gültig.
 * Ein PPTX darf beides mischen — die Methode steht pro Eintrag.
 *
 * Nicht unterstützt und nicht gebraucht: ZIP64 (Grenze bei 4 GB), Verschlüsse-
 * lung, Verzeichniseinträge, Data Descriptors.
 */

export interface ZipEntry {
  /** Pfad im Archiv, mit `/` getrennt, ohne führenden Schrägstrich. */
  name: string;
  data: Uint8Array;
  /**
   * Unkomprimiert ablegen. Für bereits komprimierte Daten (PNG, JPEG) sinnvoll:
   * Deflate darüber kostet Zeit und bringt nichts.
   */
  store?: boolean;
}

/**
 * Feste Zeitmarke statt „jetzt".
 *
 * Zwei Exporte desselben Decks sollen byteweise gleich sein — sonst lässt sich
 * nicht prüfen, ob eine Änderung am Erzeuger etwas am Ergebnis geändert hat.
 * Der Wert ist der ZIP-Nullpunkt (1980-01-01), den auch reproduzierbare Builds
 * benutzen.
 */
const DOS_TIME = 0;
const DOS_DATE = 33; // 1980-01-01: ((1980-1980) << 9) | (1 << 5) | 1

export async function createZip(entries: readonly ZipEntry[]): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encodeName(entry.name);
    const crc = crc32(entry.data);
    const stored = entry.store || entry.data.length === 0;
    const body = stored ? entry.data : await deflate(entry.data);
    // Deflate kann bei winzigen oder bereits dichten Daten wachsen. Dann ist
    // „unkomprimiert" schlicht die bessere Antwort.
    const useStore = stored || body.length >= entry.data.length;
    const payload = useStore ? entry.data : body;
    const method = useStore ? 0 : 8;

    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // benötigte Version: 2.0
    view.setUint16(6, 0x0800, true); // Bit 11: Namen sind UTF-8
    view.setUint16(8, method, true);
    view.setUint16(10, DOS_TIME, true);
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, payload.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true); // kein Extra-Feld
    local.set(name, 30);

    chunks.push(local, payload);

    const record = new Uint8Array(46 + name.length);
    const recordView = new DataView(record.buffer);
    recordView.setUint32(0, 0x02014b50, true);
    recordView.setUint16(4, 20, true); // erzeugt von Version 2.0
    recordView.setUint16(6, 20, true);
    recordView.setUint16(8, 0x0800, true);
    recordView.setUint16(10, method, true);
    recordView.setUint16(12, DOS_TIME, true);
    recordView.setUint16(14, DOS_DATE, true);
    recordView.setUint32(16, crc, true);
    recordView.setUint32(20, payload.length, true);
    recordView.setUint32(24, entry.data.length, true);
    recordView.setUint16(28, name.length, true);
    recordView.setUint16(30, 0, true); // Extra
    recordView.setUint16(32, 0, true); // Kommentar
    recordView.setUint16(34, 0, true); // Datenträger
    recordView.setUint16(36, 0, true); // interne Attribute
    recordView.setUint32(38, 0, true); // externe Attribute
    recordView.setUint32(42, offset, true);
    record.set(name, 46);
    central.push(record);

    offset += local.length + payload.length;
  }

  const centralSize = central.reduce((sum, record) => sum + record.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true); // kein Archivkommentar

  const parts: BlobPart[] = [...chunks, ...central, end].map(copy);
  return new Blob(parts, { type: 'application/zip' });
}

/* -------------------------------------------------------------------------- */

const encoder = new TextEncoder();

function encodeName(name: string): Uint8Array {
  return encoder.encode(name);
}

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (!Ctor) return data;
  try {
    const stream = new Ctor('deflate-raw');
    const writer = stream.writable.getWriter();
    // Ein eigener Puffer, und als Sicht darauf: Node nimmt einen nackten
    // `ArrayBuffer` nicht entgegen, der Browser einen geteilten nicht.
    const written = writer.write(new Uint8Array(copy(data)));
    const closed = writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    await Promise.all([written, closed]);
    return new Uint8Array(buffer);
  } catch {
    return data;
  }
}

/**
 * Eine Kopie mit eigenem, nicht geteiltem Puffer.
 *
 * `Uint8Array` kann auf einem `SharedArrayBuffer` sitzen, und die Web-APIs
 * nehmen den nicht entgegen. Die Kopie ist billiger als die Fallunterscheidung.
 */
function copy(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/* -------------------------------------------------------------------------- */
/* CRC-32                                                                      */
/* -------------------------------------------------------------------------- */

let table: Uint32Array | null = null;

function crcTable(): Uint32Array {
  if (table) return table;
  const next = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    next[i] = value >>> 0;
  }
  table = next;
  return next;
}

export function crc32(data: Uint8Array): number {
  const lookup = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = lookup[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
