import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  RECOMMENDED_IMAGE_PX,
  SOURCE_IMAGE_PX,
  TIER_IDS,
  TIER_LIST_SAVES_KEY,
  TIER_LIST_STORAGE_KEY,
  emptyDocument,
  isHttpsImageUrl,
  parseDocument,
  parseSaves,
  toSharePayload,
  fromSharePayload,
  type NamedSave,
  type TierId,
  type TierItem,
  type TierListDocument,
} from "../../lib/tier-list/model";
import { BUILTIN_TEMPLATES, documentFromTemplate } from "../../lib/tier-list/templates";

const TIER_TONE: Record<Exclude<TierId, "unranked">, string> = {
  s: "bg-red-500 text-white",
  a: "bg-orange-500 text-white",
  b: "bg-amber-400 text-stone-900",
  c: "bg-lime-600 text-white",
  d: "bg-stone-500 text-white",
};

const COPY = {
  ko: {
    add: "추가",
    addPh: "이름",
    imagePh: "https://… 이미지 주소 (선택)",
    imageHint: `권장 ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px, 원본 ${SOURCE_IMAGE_PX}px 정사각`,
    move: "이동",
    reset: "비우기",
    save: "내 목록에 저장",
    saved: "저장됨",
    share: "공유 링크",
    sharing: "올리는 중…",
    shareFail: "지금은 공유 서버를 쓸 수 없습니다. 로컬 저장은 됩니다.",
    load: "불러오기",
    compare: "비교",
    hideCompare: "비교 닫기",
    templates: "템플릿",
    publish: "템플릿 공개",
    published: "공개됨",
    up: "추천",
    down: "비추천",
    privacy: "공유·공개 링크는 누구나 볼 수 있습니다. 이름·얼굴·개인정보를 적지 마세요.",
    empty: "비어 있음",
    unranked: "미분류",
  },
} as const;

function copyFor(_locale: Locale) {
  return COPY.ko;
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TierListStudio({ locale = "ko" as Locale }: { locale?: Locale }) {
  const copy = copyFor(locale);
  const loc = (["ko", "en", "ja", "zh", "fr", "es"].includes(locale) ? locale : "en") as "ko" | "en" | "ja" | "zh" | "fr" | "es";
  const [doc, setDoc] = useState<TierListDocument>(() => emptyDocument());
  const [selected, setSelected] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saves, setSaves] = useState<NamedSave[]>([]);
  const [compareId, setCompareId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = parseDocument(window.localStorage.getItem(TIER_LIST_STORAGE_KEY));
    if (stored) setDoc(stored);
    setSaves(parseSaves(window.localStorage.getItem(TIER_LIST_SAVES_KEY)));
    const shareId = new URLSearchParams(window.location.search).get("s");
    if (shareId) {
      void fetch(`/api/tier-share/${shareId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const next = json ? fromSharePayload(json.payload, json.payload?.title) : null;
          if (next) setDoc(next);
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIER_LIST_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* private mode */
    }
  }, [doc]);

  const selectedItem = useMemo(() => {
    for (const tier of doc.tiers) {
      const item = tier.items.find((entry) => entry.id === selected);
      if (item) return item;
    }
    return null;
  }, [doc, selected]);

  const moveTo = useCallback((tierId: TierId) => {
    if (!selected) return;
    setDoc((prev) => {
      let moving: TierItem | undefined;
      const stripped = prev.tiers.map((tier) => {
        const item = tier.items.find((entry) => entry.id === selected);
        if (item) moving = item;
        return { ...tier, items: tier.items.filter((entry) => entry.id !== selected) };
      });
      if (!moving) return prev;
      return {
        ...prev,
        savedAt: new Date().toISOString(),
        tiers: stripped.map((tier) => (tier.id === tierId ? { ...tier, items: [...tier.items, moving!] } : tier)),
      };
    });
    setSelected(null);
  }, [selected]);

  const addItem = useCallback(() => {
    const name = label.trim();
    if (!name) return;
    const image = imageUrl.trim();
    if (image && !isHttpsImageUrl(image)) {
      setStatus(copy.imageHint);
      return;
    }
    const item: TierItem = { id: newId("i"), label: name, ...(image ? { imageUrl: image } : {}) };
    setDoc((prev) => ({
      ...prev,
      savedAt: new Date().toISOString(),
      tiers: prev.tiers.map((tier) => (tier.id === "unranked" ? { ...tier, items: [...tier.items, item] } : tier)),
    }));
    setLabel("");
    setImageUrl("");
  }, [copy.imageHint, imageUrl, label]);

  const persistSave = useCallback(() => {
    const entry: NamedSave = { id: newId("save"), title: doc.title, savedAt: new Date().toISOString(), document: doc };
    const next = [entry, ...saves].slice(0, 8);
    setSaves(next);
    window.localStorage.setItem(TIER_LIST_SAVES_KEY, JSON.stringify(next));
    setStatus(copy.saved);
  }, [copy.saved, doc, saves]);

  const share = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/tier-share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: toSharePayload(doc) }),
      });
      const json = (await res.json()) as { snapshotId?: string };
      if (!res.ok || !json.snapshotId) throw new Error("share");
      const url = `${window.location.origin}/${locale}/tier-list/?s=${json.snapshotId}`;
      await navigator.clipboard.writeText(url);
      setStatus(url);
    } catch {
      setStatus(copy.shareFail);
    } finally {
      setBusy(false);
    }
  }, [copy.shareFail, doc, locale]);

  const vote = useCallback(async (templateId: string, side: "up" | "down") => {
    await fetch("/api/tier-vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId, side }),
    }).catch(() => undefined);
  }, []);

  const compareDoc = saves.find((save) => save.id === compareId)?.document ?? null;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <label className="block">
        <span className="sr-only">제목</span>
        <input
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base font-bold"
          value={doc.title}
          onChange={(event) => setDoc((prev) => ({ ...prev, title: event.target.value.slice(0, 40) }))}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {BUILTIN_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="min-h-11 rounded-full border border-stone-300 px-3 text-sm font-bold"
            onClick={() => setDoc(documentFromTemplate(template, loc === "ko" || loc === "en" || loc === "ja" || loc === "zh" || loc === "fr" || loc === "es" ? loc : "en"))}
          >
            {template.title.ko}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {doc.tiers.filter((tier): tier is typeof tier & { id: Exclude<TierId, "unranked"> } => tier.id !== "unranked").map((tier) => (
          <div key={tier.id} className="overflow-hidden rounded-xl border border-stone-200">
            <button
              type="button"
              className={`flex min-h-11 w-20 items-center justify-center text-lg font-black ${TIER_TONE[tier.id]}`}
              onClick={() => moveTo(tier.id)}
            >
              {tier.id.toUpperCase()}
            </button>
            <div className="-mt-11 ml-20 flex min-h-11 flex-wrap gap-2 bg-white p-2">
              {tier.items.length === 0 ? <span className="self-center text-xs text-stone-400">{copy.empty}</span> : null}
              {tier.items.map((item) => (
                <Chip key={item.id} item={item} selected={selected === item.id} onSelect={() => setSelected(item.id)} />
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-stone-300 p-2">
          <p className="mb-2 text-xs font-bold text-stone-500">{copy.unranked}</p>
          <div className="flex flex-wrap gap-2">
            {doc.tiers.find((tier) => tier.id === "unranked")?.items.map((item) => (
              <Chip key={item.id} item={item} selected={selected === item.id} onSelect={() => setSelected(item.id)} />
            ))}
          </div>
        </div>
      </div>

      {selectedItem ? (
        <p className="text-sm">
          {selectedItem.label} → {TIER_IDS.filter((id) => id !== "unranked").map((id) => (
            <button key={id} type="button" className="ml-1 min-h-11 min-w-11 rounded-md border px-2 font-bold" onClick={() => moveTo(id)}>
              {id.toUpperCase()}
            </button>
          ))}
        </p>
      ) : null}

      <div className="space-y-2 rounded-xl bg-stone-50 p-3">
        <input className="min-h-11 w-full rounded-lg border px-3" value={label} placeholder={copy.addPh} onChange={(event) => setLabel(event.target.value)} />
        <input className="min-h-11 w-full rounded-lg border px-3 text-sm" value={imageUrl} placeholder={copy.imagePh} onChange={(event) => setImageUrl(event.target.value)} />
        <p className="text-xs text-stone-500">{copy.imageHint}</p>
        <button type="button" className="min-h-11 w-full rounded-lg bg-lime-700 font-bold text-white" onClick={addItem}>
          {copy.add}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="min-h-11 rounded-lg border font-bold" onClick={persistSave}>{copy.save}</button>
        <button type="button" className="min-h-11 rounded-lg border font-bold" disabled={busy} onClick={() => void share()}>{busy ? copy.sharing : copy.share}</button>
        <button type="button" className="min-h-11 rounded-lg border font-bold" onClick={() => setDoc(emptyDocument(doc.title))}>{copy.reset}</button>
        <button type="button" className="min-h-11 rounded-lg border font-bold" onClick={() => setCompareId(compareId ? "" : (saves[0]?.id ?? ""))}>
          {compareId ? copy.hideCompare : copy.compare}
        </button>
      </div>

      {saves.length > 0 ? (
        <label className="block text-sm">
          {copy.load}
          <select
            className="mt-1 min-h-11 w-full rounded-lg border"
            value={compareId}
            onChange={(event) => {
              const save = saves.find((entry) => entry.id === event.target.value);
              setCompareId(event.target.value);
              if (save && !compareId) setDoc(save.document);
            }}
          >
            <option value="">—</option>
            {saves.map((save) => (
              <option key={save.id} value={save.id}>{save.title}</option>
            ))}
          </select>
        </label>
      ) : null}

      {compareDoc ? (
        <div className="rounded-xl border p-3 text-sm">
          {TIER_IDS.filter((id) => id !== "unranked").map((id) => (
            <p key={id} className="mt-1">
              <b>{id.toUpperCase()}</b> 지금 {doc.tiers.find((tier) => tier.id === id)?.items.map((item) => item.label).join(", ") || "—"}
              {" / "}저장 {compareDoc.tiers.find((tier) => tier.id === id)?.items.map((item) => item.label).join(", ") || "—"}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold">{copy.templates}</p>
        {BUILTIN_TEMPLATES.map((template) => (
          <div key={template.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3">
            <span>{template.title.ko}</span>
            <span className="flex gap-1">
              <button type="button" className="min-h-11 px-2" onClick={() => void vote(template.id, "up")}>{copy.up}</button>
              <button type="button" className="min-h-11 px-2" onClick={() => void vote(template.id, "down")}>{copy.down}</button>
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-stone-500">{copy.privacy}</p>
      {status ? <p className="break-all text-sm font-bold text-lime-800">{status}</p> : null}
    </section>
  );
}

function Chip({ item, selected, onSelect }: { item: TierItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-11 items-center gap-2 rounded-full border px-2 text-sm ${selected ? "border-lime-700 bg-lime-50" : "border-stone-200 bg-white"}`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" width={32} height={32} className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : null}
      <span>{item.label}</span>
    </button>
  );
}
