/**
 * File I/O for a browser-only app: downloads, the File System Access API when
 * the browser offers it, and drag-and-drop / picker reads.
 */

export interface SaveResult {
  /** `handle` when saved in place, `download` when the browser downloaded it. */
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
  // Revoke on the next frame so Safari has committed the navigation.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Save a blob. When a `handle` is supplied (a file the user previously opened
 * or saved), the bytes are written straight back to it — that is what makes
 * "open a deck, edit it, press ⌘S" behave like a real editor.
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
      // Fall through to a download if writing in place failed.
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
      // Any other failure: fall back to a plain download.
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

/** Open a Markdown deck, preferring the picker so ⌘S can write back in place. */
export async function openMarkdownFile(): Promise<OpenedFile | null> {
  const picker = openPicker();
  if (picker) {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [
          {
            description: 'Markdown deck',
            accept: { 'text/markdown': ['.md', '.markdown'] },
          },
        ],
      });
      if (!handle) return null;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (error) {
      if (isAbort(error)) return null;
      // Fall through to the classic input element.
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

/** Read an image file into a `data:` URI so it survives being saved in a deck. */
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
  return extensions.length > 0 ? `${extensions.join(', ')} file` : 'File';
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
