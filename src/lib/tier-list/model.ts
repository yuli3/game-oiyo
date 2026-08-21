export const TIER_LIST_SCHEMA = "oiyo.tier-list" as const;
export const TIER_LIST_VERSION = 2 as const;
export const TIER_LIST_STORAGE_KEY = "oiyo:tier-list:v2";
export const TIER_LIST_SAVES_KEY = "oiyo:tier-list-saves:v1";
export const TIER_LIST_MAX_ITEMS = 256;
export const TIER_LIST_MAX_SAVES = 8;
export const RECOMMENDED_IMAGE_PX = 128;
export const SOURCE_IMAGE_PX = 256;

export const TIER_IDS = ["s", "a", "b", "c", "d", "unranked"] as const;
export type TierId = (typeof TIER_IDS)[number];

export type TierItem = {
  id: string;
  label: string;
  imageUrl?: string;
};

export type TierRow = { id: TierId; items: TierItem[] };

export type TierListDocument = {
  schema: typeof TIER_LIST_SCHEMA;
  version: typeof TIER_LIST_VERSION;
  title: string;
  savedAt: string;
  tiers: TierRow[];
};

export type NamedSave = { id: string; title: string; savedAt: string; document: TierListDocument };

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isHttpsImageUrl(value: string): boolean {
  if (value.length < 12 || value.length > 400) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname.includes(".")) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function cleanLabel(value: string): string | null {
  const label = value.trim().replace(/\s+/g, " ");
  if (label.length < 1 || label.length > 40) return null;
  return label;
}

function cleanItem(raw: unknown): TierItem | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.label !== "string") return null;
  const id = rec.id.trim();
  const label = cleanLabel(rec.label);
  if (!ID_RE.test(id) || !label) return null;
  const item: TierItem = { id, label };
  if (rec.imageUrl !== undefined) {
    if (typeof rec.imageUrl !== "string" || !isHttpsImageUrl(rec.imageUrl)) return null;
    item.imageUrl = rec.imageUrl;
  }
  return item;
}

export function emptyDocument(title = "새 티어표"): TierListDocument {
  return {
    schema: TIER_LIST_SCHEMA,
    version: TIER_LIST_VERSION,
    title: cleanLabel(title) ?? "새 티어표",
    savedAt: new Date().toISOString(),
    tiers: TIER_IDS.map((id) => ({ id, items: [] })),
  };
}

export function moveTierItem(doc: TierListDocument, itemId: string, targetTierId: TierId, targetIndex: number): TierListDocument {
  let moving: TierItem | undefined;
  const tiers = doc.tiers.map((tier) => {
    const found = tier.items.find((item) => item.id === itemId);
    if (found) moving = found;
    return { ...tier, items: tier.items.filter((item) => item.id !== itemId) };
  });
  if (!moving) return doc;
  return {
    ...doc,
    savedAt: new Date().toISOString(),
    tiers: tiers.map((tier) => {
      if (tier.id !== targetTierId) return tier;
      const index = Math.max(0, Math.min(Math.floor(targetIndex), tier.items.length));
      const items = tier.items.slice();
      items.splice(index, 0, moving!);
      return { ...tier, items };
    }),
  };
}

export function removeTierItem(doc: TierListDocument, itemId: string): TierListDocument {
  if (!doc.tiers.some((tier) => tier.items.some((item) => item.id === itemId))) return doc;
  return {
    ...doc,
    savedAt: new Date().toISOString(),
    tiers: doc.tiers.map((tier) => ({ ...tier, items: tier.items.filter((item) => item.id !== itemId) })),
  };
}

export type TierExportLayout = {
  width: number;
  height: number;
  titleHeight: number;
  rows: Array<{ id: TierId; y: number; height: number; items: Array<TierItem & { x: number; y: number; width: number; height: number }> }>;
};

export function exportLayout(doc: TierListDocument, requestedWidth = 1200): TierExportLayout {
  const width = Math.max(640, Math.min(2400, Math.floor(requestedWidth)));
  const titleHeight = 88;
  const labelWidth = 96;
  const gap = 8;
  const cardWidth = 80;
  const cardHeight = 96;
  const columns = Math.max(1, Math.floor((width - labelWidth - gap * 2) / (cardWidth + gap)));
  let y = titleHeight;
  const rows = doc.tiers.map((tier) => {
    const lines = Math.max(1, Math.ceil(tier.items.length / columns));
    const height = gap * 2 + lines * cardHeight + (lines - 1) * gap;
    const items = tier.items.map((item, index) => ({
      ...item,
      x: labelWidth + gap + (index % columns) * (cardWidth + gap),
      y: y + gap + Math.floor(index / columns) * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    }));
    const row = { id: tier.id, y, height, items };
    y += height;
    return row;
  });
  return { width, height: y, titleHeight, rows };
}

export function parseDocument(input: unknown): TierListDocument | null {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.schema !== TIER_LIST_SCHEMA) return null;
  if (rec.version !== 1 && rec.version !== 2) return null;
  if (typeof rec.title !== "string" || typeof rec.savedAt !== "string") return null;
  const title = cleanLabel(rec.title);
  if (!title || !Number.isFinite(Date.parse(rec.savedAt)) || !Array.isArray(rec.tiers)) return null;

  const byId = new Map<TierId, TierItem[]>();
  const itemIds = new Set<string>();
  let total = 0;
  for (const row of rec.tiers) {
    if (!row || typeof row !== "object") return null;
    const tier = row as Record<string, unknown>;
    if (!TIER_IDS.includes(tier.id as TierId) || !Array.isArray(tier.items)) return null;
    const id = tier.id as TierId;
    if (byId.has(id)) return null;
    const items: TierItem[] = [];
    for (const raw of tier.items) {
      const item = cleanItem(raw);
      if (!item || itemIds.has(item.id)) return null;
      itemIds.add(item.id);
      items.push(item);
      total += 1;
      if (total > TIER_LIST_MAX_ITEMS) return null;
    }
    byId.set(id, items);
  }
  if (TIER_IDS.some((id) => !byId.has(id))) return null;
  return {
    schema: TIER_LIST_SCHEMA,
    version: TIER_LIST_VERSION,
    title,
    savedAt: new Date(rec.savedAt).toISOString(),
    tiers: TIER_IDS.map((id) => ({ id, items: byId.get(id) ?? [] })),
  };
}

export function toSharePayload(doc: TierListDocument) {
  return {
    title: doc.title,
    tiers: doc.tiers.map((tier) => ({
      id: tier.id,
      label: tier.id === "unranked" ? "Unranked" : tier.id.toUpperCase(),
      items: tier.items.map((item) =>
        item.imageUrl ? { id: item.id, label: item.label, imageUrl: item.imageUrl } : { id: item.id, label: item.label },
      ),
    })),
  };
}

export function fromSharePayload(payload: unknown, fallbackTitle = "공유된 티어표"): TierListDocument | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  return parseDocument({
    schema: TIER_LIST_SCHEMA,
    version: TIER_LIST_VERSION,
    title: typeof rec.title === "string" ? rec.title : fallbackTitle,
    savedAt: new Date().toISOString(),
    tiers: rec.tiers,
  });
}

export function parseSaves(raw: string | null): NamedSave[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: NamedSave[] = [];
    for (const row of parsed.slice(0, TIER_LIST_MAX_SAVES)) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const document = parseDocument(rec.document);
      if (!document || typeof rec.id !== "string" || typeof rec.title !== "string") continue;
      out.push({
        id: rec.id,
        title: cleanLabel(rec.title) ?? document.title,
        savedAt: typeof rec.savedAt === "string" ? rec.savedAt : document.savedAt,
        document,
      });
    }
    return out;
  } catch {
    return [];
  }
}
