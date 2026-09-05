/**
 * Dateien in einem Werkzeug, das nur im Browser läuft: Downloads, die File
 * System Access API dort, wo der Browser sie anbietet, und das Lesen aus dem
 * Dateidialog oder von einer ins Fenster gezogenen Datei.
 *
 * Die Beschriftungen hier stehen im Dialog des **Betriebssystems** — in der
 * Auswahlliste „Dateityp". Sie sind damit so sichtbar wie jede Beschriftung im
 * Fenster und gehören deshalb auf Deutsch. Gesehen hat sie kein Test:
 * `language.test.ts` liest zwar ganz `src`, aber „Markdown deck" und
 * „.md file" bestehen aus Wörtern, die in keiner seiner Listen stehen — und
 * eine Liste um „file" und „deck" zu erweitern, hieße die halbe Oberfläche zu
 * verurteilen, denn „Deck" ist hier ein deutsches Wort.
 */

export interface SaveResult {
  /** `handle`, wenn an Ort und Stelle geschrieben wurde; `download` sonst. */
  via: 'handle' | 'download';
  handle?: FileSystemFileHandle;
}

/* -------------------------------------------------------------------------- */
/* Feature detection                                                           */
/* -------------------------------------------------------------------------- */

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}

type SaveFilePicker = (options?: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>;
type OpenFilePicker = (options?: {
  multiple?: boolean;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemFileHandle[]>;

function savePicker(): SaveFilePicker | null {
  const fn = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  return typeof fn === 'function' ? fn.bind(window) : null;
}

function openPicker(): OpenFilePicker | null {
  const fn = (window as unknown as { showOpenFilePicker?: OpenFilePicker }).showOpenFilePicker;
  return typeof fn === 'function' ? fn.bind(window) : null;
}

export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && savePicker() !== null;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Erst später freigeben, damit Safari die Navigation abgeschlossen hat.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Einen Blob sichern. Ist ein `handle` dabei — eine Datei, die vorher geöffnet
 * oder gesichert wurde —, gehen die Bytes unmittelbar dorthin zurück. Genau
 * das lässt „ein Deck öffnen, ändern, ⌘S" sich anfühlen wie ein richtiger
 * Editor.
 *
 * Schlägt das fehl, wird **heruntergeladen statt aufgegeben** — und `via` sagt
 * es. Wer den Rückgabewert nicht liest, hält eine Datei für aktuell, die es
 * nicht ist; das stand in `sichereDeck()` und ist dort behoben.
 */
export async function saveBlob(
  blob: Blob,
  filename: string,
  options: { handle?: FileSystemFileHandle; mimeType?: string; extensions?: string[] } = {},
): Promise<SaveResult> {
  if (options.handle) {
    try {
      const writable = await options.handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { via: 'handle', handle: options.handle };
    } catch (error) {
      if (isAbort(error)) throw error;
      // An Ort und Stelle ging es nicht — weiter zum Download.
    }
  }

  const picker = savePicker();
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: describe(options.extensions ?? extensionsOf(filename)),
            accept: {
              [options.mimeType ?? blob.type ?? 'application/octet-stream']:
                options.extensions ?? extensionsOf(filename),
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { via: 'handle', handle };
    } catch (error) {
      if (isAbort(error)) throw error;
      // Alles andere: zurück auf den gewöhnlichen Download.
    }
  }

  downloadBlob(blob, filename);
  return { via: 'download' };
}

export async function saveText(
  text: string,
  filename: string,
  mimeType: string,
  handle?: FileSystemFileHandle,
): Promise<SaveResult> {
  return saveBlob(new Blob([text], { type: `${mimeType};charset=utf-8` }), filename, {
    handle,
    mimeType,
  });
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

export interface OpenedFile {
  name: string;
  text: string;
  handle?: FileSystemFileHandle;
}

/** Ein Deck öffnen — über den Dateidialog, damit ⌘S zurückschreiben kann. */
export async function openMarkdownFile(): Promise<OpenedFile | null> {
  const picker = openPicker();
  if (picker) {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [
          {
            description: 'Markdown-Deck',
            accept: { 'text/markdown': ['.md', '.markdown'] },
          },
        ],
      });
      if (!handle) return null;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (error) {
      if (isAbort(error)) return null;
      // Weiter zum klassischen Eingabefeld.
    }
  }

  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown,text/plain';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text() } : null);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

export async function readDroppedFile(file: File): Promise<OpenedFile> {
  return { name: file.name, text: await file.text() };
}

/** Ein Bild als `data:`-URI lesen, damit es das Sichern im Deck übersteht. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function slugify(value: string, fallback = 'deck'): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

function extensionsOf(filename: string): string[] {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? [filename.slice(dot)] : [];
}

function describe(extensions: string[]): string {
  return extensions.length > 0 ? `${extensions.join(', ')}-Datei` : 'Datei';
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
