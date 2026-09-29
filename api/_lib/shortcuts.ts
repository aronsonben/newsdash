import shortcutsJson from '../../shortcuts.json' with { type: 'json' };

export interface ServerShortcut {
  id: string;
  name: string;
  prompt: string;
  instructions?: string;
}

const shortcuts = shortcutsJson as ServerShortcut[];

/** Returns the trusted server-side shortcut config for an id, or undefined if not allowlisted. */
export function getShortcut(id: unknown): ServerShortcut | undefined {
  return typeof id === 'string' ? shortcuts.find((s) => s.id === id) : undefined;
}

/** Allowlist check used by every route that takes a shortcut/prompt id. */
export function isShortcutId(id: unknown): id is string {
  return getShortcut(id) !== undefined;
}

export function listShortcuts(): ServerShortcut[] {
  return shortcuts;
}
