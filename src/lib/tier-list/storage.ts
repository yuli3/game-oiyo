type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

// 2026-10-10: The localStorage getter itself can throw in restricted browsers;
// acquire it inside the guard, not at the caller's argument evaluation.
export function readTierStorage(access: StorageAccess, key: string): { ok: true; value: string | null } | { ok: false } {
  try {
    return { ok: true, value: access().getItem(key) };
  } catch {
    return { ok: false };
  }
}

export function writeTierStorage(access: StorageAccess, key: string, value: unknown, expected?: string | null): boolean {
  try {
    const storage = access();
    // 2026-10-13: Do not replace a record changed since it was read. This check
    // detects stale tabs; localStorage does not provide an atomic transaction.
    if (expected !== undefined && storage.getItem(key) !== expected) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
