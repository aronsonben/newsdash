/** Returns the string if it is within maxLength, otherwise null. */
export function limitedString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

/** Returns the URL string only if it parses and uses https:, otherwise null. */
export function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/** Trims, strips control characters and caps a user-supplied display name at 32 chars; falls back to "anonymous". */
export function sanitizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return 'anonymous';
  const cleaned = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 32);
  return cleaned || 'anonymous';
}
