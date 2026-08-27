export const WHEEL_ITEM_LIMIT = 20;
export const WHEEL_ITEM_LENGTH_LIMIT = 40;

export function normalizeWheelItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string') continue;
    const item = candidate.trim().slice(0, WHEEL_ITEM_LENGTH_LIMIT);
    const key = item.toLocaleLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    normalized.push(item);
    if (normalized.length >= WHEEL_ITEM_LIMIT) break;
  }
  return normalized;
}

export function parseStoredWheelItems(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return normalizeWheelItems(JSON.parse(raw));
  } catch {
    return [];
  }
}
