export const TIER_LIST_SCHEMA = "oiyo.tier-list" as const;
export const TIER_LIST_VERSION = 3 as const;
export const TIER_LIST_STORAGE_KEY = "oiyo:tier-list:v2";
export const TIER_LIST_SAVES_KEY = "oiyo:tier-list-saves:v1";
export const TIER_LIST_MAX_ITEMS = 256;
export const TIER_LIST_MAX_SAVES = 8;
export const RECOMMENDED_IMAGE_PX = 128;
export const SOURCE_IMAGE_PX = 256;

// 2026-10-06: e·f 는 사용자가 추가하는 줄이다. 저장 순서에서 unranked 뒤에 둔 이유는
// v1·v2 문서가 tiers[5] = unranked 로 저장돼 있어서다. 화면 순서는 RANKED_TIER_IDS 를 쓴다.
export const TIER_IDS = ["s", "a", "b", "c", "d", "unranked", "e", "f"] as const;
export type TierId = (typeof TIER_IDS)[number];
export type RankedTierId = Exclude<TierId, "unranked">;
export const RANKED_TIER_IDS: readonly RankedTierId[] = ["s", "a", "b", "c", "d", "e", "f"];
const OPTIONAL_TIER_IDS: readonly TierId[] = ["e", "f"];

export const TIER_COLORS = ["red", "orange", "amber", "lime", "teal", "sky", "violet", "pink", "stone"] as const;
export type TierColor = (typeof TIER_COLORS)[number];
export const DEFAULT_TIER_COLOR: Record<RankedTierId, TierColor> = {
  s: "red", a: "orange", b: "amber", c: "lime", d: "stone", e: "sky", f: "violet",
};
export const TIER_LABEL_MAX = 12;

// 기기에서 고른 이미지는 브라우저 안에서 줄여 data URL 로만 보관한다. 서버로 보내지 않는다.
export const LOCAL_IMAGE_PX = 128;
export const LOCAL_IMAGE_MAX_CHARS = 60_000;
export const LOCAL_IMAGE_MAX_COUNT = 60;
const LOCAL_IMAGE_RE = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isLocalImageData(value: string): boolean {
  return value.length <= LOCAL_IMAGE_MAX_CHARS && LOCAL_IMAGE_RE.test(value);
}

export type TierItem = {
  id: string;
  label: string;
  imageUrl?: string;
  /** 기기에서 고른 이미지. 공유 링크에는 넣지 않는다. */
  imageData?: string;
};

export type TierRow = { id: TierId; items: TierItem[]; label?: string; color?: TierColor; hidden?: boolean };

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
  if (rec.imageData !== undefined) {
    if (typeof rec.imageData !== "string" || !isLocalImageData(rec.imageData)) return null;
    item.imageData = rec.imageData;
  }
  return item;
}

export function emptyDocument(title = "새 티어표"): TierListDocument {
  return {
    schema: TIER_LIST_SCHEMA,
    version: TIER_LIST_VERSION,
    title: cleanLabel(title) ?? "새 티어표",
    savedAt: new Date().toISOString(),
    tiers: TIER_IDS.map((id) => (OPTIONAL_TIER_IDS.includes(id) ? { id, items: [], hidden: true } : { id, items: [] })),
  };
}

export function tierLabel(row: Pick<TierRow, "id" | "label">): string {
  return row.label ?? (row.id === "unranked" ? "?" : row.id.toUpperCase());
}

export function tierColor(row: Pick<TierRow, "id" | "color">): TierColor {
  return row.color ?? (row.id === "unranked" ? "stone" : DEFAULT_TIER_COLOR[row.id]);
}

function touch(doc: TierListDocument, tiers: TierRow[]): TierListDocument {
  return { ...doc, savedAt: new Date().toISOString(), tiers };
}

export function renameTier(doc: TierListDocument, tierId: RankedTierId, label: string): TierListDocument {
  const clean = label.trim().replace(/\s+/g, " ").slice(0, TIER_LABEL_MAX);
  return touch(doc, doc.tiers.map((tier) => {
    if (tier.id !== tierId) return tier;
    const { label: _old, ...rest } = tier;
    return clean && clean !== tier.id.toUpperCase() ? { ...rest, label: clean } : rest;
  }));
}

export function recolorTier(doc: TierListDocument, tierId: RankedTierId, color: TierColor): TierListDocument {
  if (!TIER_COLORS.includes(color)) return doc;
  return touch(doc, doc.tiers.map((tier) => (tier.id === tierId ? { ...tier, color } : tier)));
}

/** 숨겨 둔 줄 하나를 다시 연다. 열 줄이 없으면 문서를 그대로 돌려준다. */
export function addTier(doc: TierListDocument): TierListDocument {
  const next = RANKED_TIER_IDS.find((id) => doc.tiers.find((tier) => tier.id === id)?.hidden);
  if (!next) return doc;
  return touch(doc, doc.tiers.map((tier) => {
    if (tier.id !== next) return tier;
    const { hidden: _hidden, ...rest } = tier;
    return rest;
  }));
}

/** 줄을 지우면 그 줄의 카드는 미분류로 돌아간다. 마지막 한 줄은 지우지 않는다. */
export function removeTier(doc: TierListDocument, tierId: RankedTierId): TierListDocument {
  const visible = doc.tiers.filter((tier) => tier.id !== "unranked" && !tier.hidden);
  const target = doc.tiers.find((tier) => tier.id === tierId);
  if (!target || target.hidden || visible.length <= 1) return doc;
  return touch(doc, doc.tiers.map((tier) => {
    if (tier.id === tierId) return { id: tier.id, items: [], hidden: true };
    if (tier.id === "unranked") return { ...tier, items: [...tier.items, ...target.items] };
    return tier;
  }));
}

export function visibleRankedTiers(doc: TierListDocument): TierRow[] {
  return RANKED_TIER_IDS.map((id) => doc.tiers.find((tier) => tier.id === id)).filter((tier): tier is TierRow => Boolean(tier) && !tier!.hidden);
}

export function localImageCount(doc: TierListDocument): number {
  return doc.tiers.reduce((sum, tier) => sum + tier.items.filter((item) => item.imageData).length, 0);
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
  rows: Array<{ id: TierId; label: string; color: TierColor; y: number; height: number; items: Array<TierItem & { x: number; y: number; width: number; height: number }> }>;
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
  const unranked = doc.tiers.find((tier) => tier.id === "unranked");
  const ordered = [...visibleRankedTiers(doc), ...(unranked ? [unranked] : [])];
  const rows = ordered.map((tier) => {
    const lines = Math.max(1, Math.ceil(tier.items.length / columns));
    const height = gap * 2 + lines * cardHeight + (lines - 1) * gap;
    const items = tier.items.map((item, index) => ({
      ...item,
      x: labelWidth + gap + (index % columns) * (cardWidth + gap),
      y: y + gap + Math.floor(index / columns) * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    }));
    const row = { id: tier.id, label: tierLabel(tier), color: tierColor(tier), y, height, items };
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
  if (rec.version !== 1 && rec.version !== 2 && rec.version !== 3) return null;
  if (typeof rec.title !== "string" || typeof rec.savedAt !== "string") return null;
  const title = cleanLabel(rec.title);
  if (!title || !Number.isFinite(Date.parse(rec.savedAt)) || !Array.isArray(rec.tiers)) return null;

  const byId = new Map<TierId, TierItem[]>();
  const meta = new Map<TierId, Pick<TierRow, "label" | "color" | "hidden">>();
  let localImages = 0;
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
      if (item.imageData && ++localImages > LOCAL_IMAGE_MAX_COUNT) return null;
      items.push(item);
      total += 1;
      if (total > TIER_LIST_MAX_ITEMS) return null;
    }
    byId.set(id, items);
    if (id !== "unranked") {
      const extra: Pick<TierRow, "label" | "color" | "hidden"> = {};
      if (typeof tier.label === "string") {
        const label = tier.label.trim().replace(/\s+/g, " ").slice(0, TIER_LABEL_MAX);
        // 공유 페이로드는 기본 이름("S")도 label 로 보낸다. 기본값과 같으면 저장하지 않는다.
        if (label && label !== id.toUpperCase()) extra.label = label;
      }
      if (typeof tier.color === "string" && TIER_COLORS.includes(tier.color as TierColor)) extra.color = tier.color as TierColor;
      if (tier.hidden === true && items.length === 0) extra.hidden = true;
      meta.set(id, extra);
    }
  }
  // v1·v2 문서에는 e·f 가 없다. 없는 선택 줄은 숨긴 빈 줄로 채운다.
  for (const id of OPTIONAL_TIER_IDS) {
    if (!byId.has(id)) { byId.set(id, []); meta.set(id, { hidden: true }); }
  }
  if (TIER_IDS.some((id) => !byId.has(id))) return null;
  if (RANKED_TIER_IDS.every((id) => meta.get(id)?.hidden)) return null;
  return {
    schema: TIER_LIST_SCHEMA,
    version: TIER_LIST_VERSION,
    title,
    savedAt: new Date(rec.savedAt).toISOString(),
    tiers: TIER_IDS.map((id) => ({ id, items: byId.get(id) ?? [], ...(meta.get(id) ?? {}) })),
  };
}

export function toSharePayload(doc: TierListDocument) {
  return {
    title: doc.title,
    tiers: doc.tiers.map((tier) => ({
      id: tier.id,
      label: tier.id === "unranked" ? "Unranked" : tierLabel(tier),
      ...(tier.color ? { color: tier.color } : {}),
      ...(tier.hidden ? { hidden: true } : {}),
      // imageData(기기 이미지)는 일부러 뺀다. 공유는 서버에 저장되기 때문이다.
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
