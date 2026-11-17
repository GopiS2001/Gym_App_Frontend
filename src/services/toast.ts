/**
 * Toast events. A plain emitter rather than React context, so non-React code
 * (the API client) can raise a toast too. `ToastHost` renders them.
 */
export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

let nextId = 1;
const listeners = new Set<(t: ToastItem) => void>();

export function showToast(message: string, tone: ToastTone = 'success') {
  const item = { id: nextId++, message, tone };
  listeners.forEach((fn) => fn(item));
}

export function onToast(fn: (t: ToastItem) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const GENERIC: Record<string, string> = {
  post: 'Saved',
  put: 'Updated',
  patch: 'Updated',
  delete: 'Deleted',
};

/**
 * Requests that should stay quiet: sign-in plumbing, the file upload that is
 * always followed by a save of its own (which shows the toast), and photo
 * comparison, which is a POST but only reads.
 */
const SILENT = [
  /\/auth\/(login|refresh|logout|setup)/,
  /\/media\/upload/,
  /\/progress\/photos\/compare/,
];

/** The toast for a successful write, or null when it should stay quiet. */
export function toastForWrite(
  method: string | undefined,
  url: string | undefined,
  serverMessage: unknown,
): string | null {
  const m = (method || 'get').toLowerCase();
  if (!GENERIC[m]) return null;
  if (url && SILENT.some((re) => re.test(url))) return null;

  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    // "Record created successfully" says nothing the generic word doesn't.
    if (/^record (created|updated|deleted) successfully$/i.test(serverMessage.trim())) {
      return GENERIC[m];
    }
    return serverMessage.trim().replace(/\s+successfully\.?$/i, '');
  }
  return GENERIC[m];
}
