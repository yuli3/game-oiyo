import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Locale } from "../../lib/i18n";
import {
  RECOMMENDED_IMAGE_PX,
  SOURCE_IMAGE_PX,
  LOCAL_IMAGE_MAX_COUNT,
  LOCAL_IMAGE_PX,
  TIER_COLORS,
  TIER_IDS,
  TIER_LABEL_MAX,
  TIER_LIST_SAVES_KEY,
  TIER_LIST_STORAGE_KEY,
  emptyDocument,
  addTier,
  exportLayout,
  isHttpsImageUrl,
  isLocalImageData,
  localImageCount,
  moveTierItem,
  recolorTier,
  removeTier,
  renameTier,
  tierColor,
  tierLabel,
  visibleRankedTiers,
  parseDocument,
  removeTierItem,
  parseSaves,
  toSharePayload,
  fromSharePayload,
  type NamedSave,
  type RankedTierId,
  type TierColor,
  type TierId,
  type TierItem,
  type TierListDocument,
} from "../../lib/tier-list/model";
import { documentFromTemplate, templatesForLocale } from "../../lib/tier-list/templates";

// 2026-10-06: 줄 색을 고를 수 있게 되면서 색은 줄 id 가 아니라 TierColor 에 묶인다.
const TONE: Record<TierColor, { chip: string; fill: string; ink: string }> = {
  red: { chip: "bg-red-500 text-white", fill: "#ef4444", ink: "#fff" },
  orange: { chip: "bg-orange-500 text-white", fill: "#f97316", ink: "#fff" },
  amber: { chip: "bg-amber-400 text-stone-900", fill: "#fbbf24", ink: "#1c1917" },
  lime: { chip: "bg-lime-600 text-white", fill: "#65a30d", ink: "#fff" },
  teal: { chip: "bg-teal-600 text-white", fill: "#0d9488", ink: "#fff" },
  sky: { chip: "bg-sky-500 text-white", fill: "#0ea5e9", ink: "#fff" },
  violet: { chip: "bg-violet-500 text-white", fill: "#8b5cf6", ink: "#fff" },
  pink: { chip: "bg-pink-500 text-white", fill: "#ec4899", ink: "#fff" },
  stone: { chip: "bg-stone-500 text-white", fill: "#78716c", ink: "#fff" },
};

// 기기 이미지를 정사각으로 잘라 LOCAL_IMAGE_PX 로 줄인다. 원본은 어디에도 보내지 않는다.
async function fileToLocalImage(file: Blob): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) return null;
    const canvas = document.createElement("canvas");
    canvas.width = LOCAL_IMAGE_PX; canvas.height = LOCAL_IMAGE_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, LOCAL_IMAGE_PX, LOCAL_IMAGE_PX);
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, LOCAL_IMAGE_PX, LOCAL_IMAGE_PX);
    for (const quality of [0.82, 0.6, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (isLocalImageData(data)) return data;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function labelFromFileName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 40);
}

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
    templateSearch: "템플릿 검색",
    fullscreen: "방송 전체화면",
    present: "프레젠테이션",
    edit: "편집으로 돌아가기",
    exportPng: "PNG 저장",
    itemSearch: "카드 검색",
    remove: "선택 삭제",
    publish: "템플릿 공개",
    published: "공개됨",
    up: "추천",
    down: "비추천",
    privacy: "공유·공개 링크는 누구나 볼 수 있어요. 이름·얼굴·개인정보를 적지 마세요.",
    empty: "비어 있음",
    unranked: "미분류",
    titleLabel: "제목",
    compareCurrent: "지금",
    compareSaved: "저장",
    pick: "내 이미지 고르기",
    localNote: "기기에서 고른 이미지는 이 브라우저에만 저장돼요. PNG에는 들어가고, 공유 링크에는 들어가지 않아요.",
    shareLocal: "공유 링크에는 기기 이미지가 빠져요. 이름만 전달돼요.",
    imageFail: "이 이미지는 읽을 수 없어요.",
    tooMany: "기기 이미지는 {n}장까지 넣을 수 있어요.",
    rowsEdit: "줄 편집",
    rowsDone: "줄 편집 끝내기",
    addRow: "줄 추가",
    removeRow: "줄 삭제",
    rowName: "줄 이름",
    rowColor: "줄 색",
    unnamed: "이미지",
  },
  en: {
    add: "Add",
    addPh: "Name",
    imagePh: "https://… image URL (optional)",
    imageHint: `Recommended ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px, source square ${SOURCE_IMAGE_PX}px`,
    move: "Move",
    reset: "Clear",
    save: "Save to My Lists",
    saved: "Saved",
    share: "Share Link",
    sharing: "Uploading…",
    shareFail: "The share server isn't available right now. Local saving still works.",
    load: "Load",
    compare: "Compare",
    hideCompare: "Close Compare",
    templates: "Templates",
    templateSearch: "Search templates",
    fullscreen: "Broadcast Fullscreen",
    present: "Present",
    edit: "Back to Editing",
    exportPng: "Save PNG",
    itemSearch: "Search cards",
    remove: "Remove Selected",
    publish: "Publish Template",
    published: "Published",
    up: "Upvote",
    down: "Downvote",
    privacy: "Share and public links can be viewed by anyone. Don't include names, faces, or personal information.",
    empty: "Empty",
    unranked: "Unranked",
    titleLabel: "Title",
    compareCurrent: "Now",
    compareSaved: "Saved",
    pick: "Choose my images",
    localNote: "Images from your device stay in this browser. They appear in the PNG, not in share links.",
    shareLocal: "Share links leave out device images. Only names are sent.",
    imageFail: "This image could not be read.",
    tooMany: "You can add up to {n} device images.",
    rowsEdit: "Edit rows",
    rowsDone: "Done editing rows",
    addRow: "Add row",
    removeRow: "Delete row",
    rowName: "Row name",
    rowColor: "Row color",
    unnamed: "Image",
  },
  ja: {
    add: "追加",
    addPh: "名前",
    imagePh: "https://… 画像URL（任意）",
    imageHint: `推奨 ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px、元画像 ${SOURCE_IMAGE_PX}px 正方形`,
    move: "移動",
    reset: "空にする",
    save: "マイリストに保存",
    saved: "保存済み",
    share: "共有リンク",
    sharing: "アップロード中…",
    shareFail: "現在、共有サーバーを利用できません。ローカル保存は可能です。",
    load: "読み込み",
    compare: "比較",
    hideCompare: "比較を閉じる",
    templates: "テンプレート",
    templateSearch: "テンプレート検索",
    fullscreen: "配信用フルスクリーン",
    present: "プレゼンテーション",
    edit: "編集に戻る",
    exportPng: "PNG保存",
    itemSearch: "カード検索",
    remove: "選択削除",
    publish: "テンプレート公開",
    published: "公開済み",
    up: "おすすめ",
    down: "おすすめしない",
    privacy: "共有・公開リンクは誰でも閲覧できます。名前・顔・個人情報は記載しないでください。",
    empty: "空です",
    unranked: "未分類",
    titleLabel: "タイトル",
    compareCurrent: "現在",
    compareSaved: "保存",
    pick: "自分の画像を選ぶ",
    localNote: "端末から選んだ画像は、このブラウザーにだけ保存されます。PNGには入りますが、共有リンクには入りません。",
    shareLocal: "共有リンクには端末の画像が含まれません。名前だけが送られます。",
    imageFail: "この画像は読み込めませんでした。",
    tooMany: "端末の画像は{n}枚まで追加できます。",
    rowsEdit: "行を編集",
    rowsDone: "行の編集を終える",
    addRow: "行を追加",
    removeRow: "行を削除",
    rowName: "行の名前",
    rowColor: "行の色",
    unnamed: "画像",
  },
  zh: {
    add: "添加",
    addPh: "名称",
    imagePh: "https://… 图片链接（可选）",
    imageHint: `推荐 ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px，原图 ${SOURCE_IMAGE_PX}px 正方形`,
    move: "移动",
    reset: "清空",
    save: "保存到我的列表",
    saved: "已保存",
    share: "分享链接",
    sharing: "上传中…",
    shareFail: "目前无法使用分享服务器，仍可本地保存。",
    load: "加载",
    compare: "对比",
    hideCompare: "关闭对比",
    templates: "模板",
    templateSearch: "搜索模板",
    fullscreen: "直播全屏",
    present: "演示模式",
    edit: "返回编辑",
    exportPng: "保存PNG",
    itemSearch: "搜索卡片",
    remove: "删除所选",
    publish: "发布模板",
    published: "已发布",
    up: "推荐",
    down: "不推荐",
    privacy: "分享和公开链接任何人都可查看，请勿填写姓名、照片或个人信息。",
    empty: "空",
    unranked: "未分类",
    titleLabel: "标题",
    compareCurrent: "当前",
    compareSaved: "已保存",
    pick: "选择我的图片",
    localNote: "从设备选择的图片只保存在这个浏览器里。会出现在PNG中，但不会进入分享链接。",
    shareLocal: "分享链接不包含设备图片，只会发送名称。",
    imageFail: "无法读取这张图片。",
    tooMany: "最多可以添加{n}张设备图片。",
    rowsEdit: "编辑行",
    rowsDone: "结束编辑行",
    addRow: "添加行",
    removeRow: "删除行",
    rowName: "行名称",
    rowColor: "行颜色",
    unnamed: "图片",
  },
  fr: {
    add: "Ajouter",
    addPh: "Nom",
    imagePh: "https://… URL de l'image (facultatif)",
    imageHint: `Recommandé ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px, original carré de ${SOURCE_IMAGE_PX}px`,
    move: "Déplacer",
    reset: "Vider",
    save: "Enregistrer dans mes listes",
    saved: "Enregistré",
    share: "Lien de partage",
    sharing: "Envoi en cours…",
    shareFail: "Le serveur de partage est indisponible pour le moment. L'enregistrement local fonctionne toujours.",
    load: "Charger",
    compare: "Comparer",
    hideCompare: "Fermer la comparaison",
    templates: "Modèles",
    templateSearch: "Rechercher un modèle",
    fullscreen: "Plein écran diffusion",
    present: "Présentation",
    edit: "Retour à l'édition",
    exportPng: "Enregistrer en PNG",
    itemSearch: "Rechercher une carte",
    remove: "Supprimer la sélection",
    publish: "Publier le modèle",
    published: "Publié",
    up: "Recommander",
    down: "Ne pas recommander",
    privacy: "Les liens de partage et publics sont visibles par tous. N'incluez ni noms, ni visages, ni informations personnelles.",
    empty: "Vide",
    unranked: "Non classé",
    titleLabel: "Titre",
    compareCurrent: "Actuel",
    compareSaved: "Enregistré",
    pick: "Choisir mes images",
    localNote: "Les images de votre appareil restent dans ce navigateur. Elles figurent dans le PNG, pas dans les liens de partage.",
    shareLocal: "Les liens de partage n'incluent pas les images de l'appareil. Seuls les noms sont envoyés.",
    imageFail: "Impossible de lire cette image.",
    tooMany: "Vous pouvez ajouter jusqu'à {n} images de l'appareil.",
    rowsEdit: "Modifier les lignes",
    rowsDone: "Terminer la modification",
    addRow: "Ajouter une ligne",
    removeRow: "Supprimer la ligne",
    rowName: "Nom de la ligne",
    rowColor: "Couleur de la ligne",
    unnamed: "Image",
  },
  es: {
    add: "Añadir",
    addPh: "Nombre",
    imagePh: "https://… URL de imagen (opcional)",
    imageHint: `Recomendado ${RECOMMENDED_IMAGE_PX}×${RECOMMENDED_IMAGE_PX}px, original cuadrado de ${SOURCE_IMAGE_PX}px`,
    move: "Mover",
    reset: "Vaciar",
    save: "Guardar en mis listas",
    saved: "Guardado",
    share: "Enlace para compartir",
    sharing: "Subiendo…",
    shareFail: "El servidor para compartir no está disponible ahora. El guardado local sigue funcionando.",
    load: "Cargar",
    compare: "Comparar",
    hideCompare: "Cerrar comparación",
    templates: "Plantillas",
    templateSearch: "Buscar plantillas",
    fullscreen: "Pantalla completa para transmisión",
    present: "Presentación",
    edit: "Volver a editar",
    exportPng: "Guardar PNG",
    itemSearch: "Buscar tarjetas",
    remove: "Eliminar selección",
    publish: "Publicar plantilla",
    published: "Publicado",
    up: "Recomendar",
    down: "No recomendar",
    privacy: "Los enlaces compartidos y públicos pueden verlos cualquier persona. No incluyas nombres, caras ni información personal.",
    empty: "Vacío",
    unranked: "Sin clasificar",
    titleLabel: "Título",
    compareCurrent: "Ahora",
    compareSaved: "Guardado",
    pick: "Elegir mis imágenes",
    localNote: "Las imágenes de tu dispositivo se quedan en este navegador. Aparecen en el PNG, no en los enlaces para compartir.",
    shareLocal: "Los enlaces para compartir no incluyen las imágenes del dispositivo. Solo se envían los nombres.",
    imageFail: "No se pudo leer esta imagen.",
    tooMany: "Puedes añadir hasta {n} imágenes del dispositivo.",
    rowsEdit: "Editar filas",
    rowsDone: "Terminar de editar",
    addRow: "Añadir fila",
    removeRow: "Eliminar fila",
    rowName: "Nombre de la fila",
    rowColor: "Color de la fila",
    unnamed: "Imagen",
  },
} as const;

function copyFor(locale: Locale) {
  return COPY[(locale in COPY ? locale : "en") as keyof typeof COPY];
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
  const [templateQuery, setTemplateQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [editingRows, setEditingRows] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const draggingRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<{ item: TierItem; x: number; y: number } | null>(null);
  const [hoverTier, setHoverTier] = useState<TierId | null>(null);

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

  const moveItem = useCallback((itemId: string, tierId: TierId, index = Number.MAX_SAFE_INTEGER) => {
    setDoc((prev) => moveTierItem(prev, itemId, tierId, index));
    setSelected(null);
  }, []);

  const moveTo = useCallback((tierId: TierId) => {
    if (selected) moveItem(selected, tierId);
  }, [moveItem, selected]);

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

  const addImages = useCallback(async (files: Blob[], names: string[] = []) => {
    const room = LOCAL_IMAGE_MAX_COUNT - localImageCount(doc);
    if (files.length > room) setStatus(copy.tooMany.replace("{n}", String(LOCAL_IMAGE_MAX_COUNT)));
    const typed = label.trim();
    const items: TierItem[] = [];
    let failed = false;
    for (const [index, file] of files.slice(0, Math.max(0, room)).entries()) {
      const data = await fileToLocalImage(file);
      if (!data) { failed = true; continue; }
      const name = (files.length === 1 && typed) || labelFromFileName(names[index] ?? "") || `${copy.unnamed} ${index + 1}`;
      items.push({ id: newId("i"), label: name.slice(0, 40), imageData: data });
    }
    if (failed) setStatus(copy.imageFail);
    if (!items.length) return;
    setDoc((prev) => ({
      ...prev,
      savedAt: new Date().toISOString(),
      tiers: prev.tiers.map((tier) => (tier.id === "unranked" ? { ...tier, items: [...tier.items, ...items] } : tier)),
    }));
    if (files.length === 1) setLabel("");
  }, [copy.imageFail, copy.tooMany, copy.unnamed, doc, label]);

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
      setStatus(localImageCount(doc) > 0 ? `${url} — ${copy.shareLocal}` : url);
    } catch {
      setStatus(copy.shareFail);
    } finally {
      setBusy(false);
    }
  }, [copy.shareFail, copy.shareLocal, doc, locale]);

  const vote = useCallback(async (templateId: string, side: "up" | "down") => {
    await fetch("/api/tier-vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId, side }),
    }).catch(() => undefined);
  }, []);

  const compareDoc = saves.find((save) => save.id === compareId)?.document ?? null;
  const visibleTemplates = useMemo(() => {
    const query = templateQuery.trim().toLocaleLowerCase();
    const localized = templatesForLocale(loc);
    return query ? localized.filter((template) => Object.values(template.title).some((title) => title.toLocaleLowerCase().includes(query))) : localized;
  }, [loc, templateQuery]);

  const followDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    setGhost((prev) => (prev ? { ...prev, x: clientX, y: clientY } : prev));
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-tier-id]");
    const tierId = target?.dataset.tierId as TierId | undefined;
    setHoverTier(tierId && TIER_IDS.includes(tierId) ? tierId : null);
  }, []);

  const beginDrag = useCallback((item: TierItem, clientX: number, clientY: number) => {
    draggingRef.current = { id: item.id, x: clientX, y: clientY };
    setGhost({ item, x: clientX, y: clientY });
  }, []);

  const clearDrag = useCallback(() => {
    draggingRef.current = null;
    setGhost(null);
    setHoverTier(null);
  }, []);

  const finishPointerDrag = useCallback((event: ReactPointerEvent) => {
    const drag = draggingRef.current;
    const itemId = drag?.id;
    const moved = drag ? Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 8 : false;
    clearDrag();
    if (!itemId || !moved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tier-id]");
    const tierId = target?.dataset.tierId as TierId | undefined;
    if (tierId && TIER_IDS.includes(tierId)) moveItem(itemId, tierId);
  }, [clearDrag, moveItem]);

  const exportPng = useCallback(async () => {
    const layout = exportLayout(doc, 1200);
    const canvas = document.createElement("canvas");
    canvas.width = layout.width; canvas.height = layout.height;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fafaf9"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1c1917"; ctx.font = "bold 32px system-ui"; ctx.fillText(doc.title, 28, 52);
    const loadImage = (url: string) => new Promise<HTMLImageElement | null>((resolve) => { const image = new Image(); image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = url; });
    for (const row of layout.rows) {
      const tone = row.id === "unranked" ? { fill: "#d6d3d1", ink: "#1c1917" } : TONE[row.color];
      ctx.fillStyle = tone.fill; ctx.fillRect(0, row.y, 96, row.height);
      // 줄 이름이 길면 글자를 줄여 96px 칸 안에 넣는다.
      ctx.fillStyle = tone.ink; ctx.textAlign = "center";
      let size = 28; ctx.font = `bold ${size}px system-ui`;
      while (size > 12 && ctx.measureText(row.label).width > 84) { size -= 2; ctx.font = `bold ${size}px system-ui`; }
      ctx.fillText(row.label, 48, row.y + 48);
      for (const item of row.items) {
        ctx.fillStyle = "#fff"; ctx.fillRect(item.x, item.y, item.width, item.height);
        const source = item.imageData ?? item.imageUrl;
        const image = source ? await loadImage(source) : null;
        if (image) ctx.drawImage(image, item.x + 4, item.y + 4, 72, 72);
        else { ctx.fillStyle = "#e7e5e4"; ctx.fillRect(item.x + 4, item.y + 4, 72, 72); ctx.fillStyle = "#57534e"; ctx.font = "bold 24px system-ui"; ctx.textAlign = "center"; ctx.fillText(item.label.slice(0, 1), item.x + 40, item.y + 49); }
        ctx.fillStyle = "#1c1917"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center"; ctx.fillText(item.label.slice(0, 11), item.x + 40, item.y + 90);
      }
    }
    canvas.toBlob((blob) => { if (!blob) return; const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${doc.title.replace(/[^a-zA-Z0-9가-힣_-]+/g, "-") || "tier-list"}.png`; link.click(); URL.revokeObjectURL(link.href); }, "image/png");
  }, [doc]);

  return (
    <section
      ref={studioRef}
      onPointerMove={(event) => followDrag(event.clientX, event.clientY)}
      onPointerUp={finishPointerDrag}
      onPointerCancel={clearDrag}
      onDragOver={(event) => {
        event.preventDefault();
        followDrag(event.clientX, event.clientY);
      }}
      onDragEnd={clearDrag}
      onPaste={(event) => {
        const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (images.length) { event.preventDefault(); void addImages(images, images.map((file) => file.name)); }
      }}
      className="mx-auto max-w-6xl space-y-4 px-1"
    >
      {presenting ? <h2 className="text-center text-3xl font-black">{doc.title}</h2> : <label className="block">
        <span className="sr-only">{copy.titleLabel}</span>
        <input
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-card px-3 text-base font-bold"
          value={doc.title}
          onChange={(event) => setDoc((prev) => ({ ...prev, title: event.target.value.slice(0, 40) }))}
        />
      </label>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="min-h-11 rounded-xl border px-4 font-bold" onClick={() => setPresenting((value) => !value)}>{presenting ? copy.edit : copy.present}</button>
        {!presenting && <button type="button" aria-pressed={editingRows} className="min-h-11 rounded-xl border px-4 font-bold" onClick={() => setEditingRows((value) => !value)}>{editingRows ? copy.rowsDone : copy.rowsEdit}</button>}
        <button type="button" className="min-h-11 rounded-xl border px-4 font-bold" onClick={() => void exportPng()}>{copy.exportPng}</button>
      </div>

      {!presenting && <><div className="flex flex-col gap-2 sm:flex-row">
        <input value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder={copy.templateSearch} className="min-h-11 flex-1 rounded-xl border border-stone-300 px-3" />
        <button type="button" className="min-h-11 rounded-xl bg-stone-900 px-4 font-bold text-white" onClick={() => void studioRef.current?.requestFullscreen?.()}>{copy.fullscreen}</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {visibleTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="min-h-11 shrink-0 rounded-full border border-stone-300 px-3 text-sm font-bold"
            onClick={() => setDoc(documentFromTemplate(template, loc === "ko" || loc === "en" || loc === "ja" || loc === "zh" || loc === "fr" || loc === "es" ? loc : "en"))}
          >
            {template.title[loc]} · {template.items.length}
          </button>
        ))}
      </div></>}

      {!presenting && <div className="flex flex-col gap-2 sm:flex-row">
        <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={copy.itemSearch} className="min-h-11 flex-1 rounded-xl border px-3" />
        <button type="button" disabled={!selected} onClick={() => { if (selected) { setDoc((prev) => removeTierItem(prev, selected)); setSelected(null); } }} className="min-h-11 rounded-xl border border-red-300 px-4 font-bold text-red-700 disabled:opacity-40">{copy.remove}</button>
      </div>}

      <div className="space-y-2">
        {visibleRankedTiers(doc).map((tier) => {
          const tierId = tier.id as RankedTierId;
          const tone = TONE[tierColor(tier)];
          return (
          <div key={tier.id} data-tier-id={tier.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/tier-item"); if (id) moveItem(id, tier.id); clearDrag(); }} className={`overflow-hidden rounded-xl border border-stone-200 ${hoverTier === tier.id ? "ring-2 ring-lime-400" : ""}`}>
            {editingRows && !presenting ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-50 p-2">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    className="min-h-11 w-28 rounded-lg border border-stone-300 bg-card px-2 text-sm font-bold"
                    value={tier.label ?? tier.id.toUpperCase()}
                    maxLength={TIER_LABEL_MAX}
                    aria-label={copy.rowName}
                    onChange={(event) => setDoc((prev) => renameTier(prev, tierId, event.target.value))}
                  />
                </label>
                <div role="group" aria-label={copy.rowColor} className="flex flex-wrap gap-1">
                  {TIER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`${copy.rowColor}: ${color}`}
                      aria-pressed={tierColor(tier) === color}
                      className={`size-11 rounded-full border-2 ${tierColor(tier) === color ? "border-stone-900" : "border-transparent"}`}
                      onClick={() => setDoc((prev) => recolorTier(prev, tierId, color))}
                    >
                      <span className={`mx-auto block size-6 rounded-full ${TONE[color].chip}`} />
                    </button>
                  ))}
                </div>
                <button type="button" className="ml-auto min-h-11 rounded-lg border border-red-300 px-3 text-sm font-bold text-red-700 disabled:opacity-40" disabled={visibleRankedTiers(doc).length <= 1} onClick={() => setDoc((prev) => removeTier(prev, tierId))}>{copy.removeRow}</button>
              </div>
            ) : null}
            <button
              type="button"
              className={`flex min-h-11 w-20 items-center justify-center break-all px-1 text-center font-black leading-tight ${tierLabel(tier).length > 3 ? "text-xs" : "text-lg"} ${tone.chip}`}
              onClick={() => moveTo(tier.id)}
            >
              {tierLabel(tier)}
            </button>
            <div className="-mt-11 ml-20 flex min-h-11 flex-wrap gap-2 bg-card p-2">
              {tier.items.length === 0 ? <span className="self-center text-xs text-stone-400">{copy.empty}</span> : null}
              {tier.items.filter((item) => !itemQuery.trim() || item.label.toLocaleLowerCase().includes(itemQuery.trim().toLocaleLowerCase())).map((item) => (
                <Chip key={item.id} item={item} selected={selected === item.id} dimmed={ghost?.item.id === item.id} onSelect={() => setSelected(item.id)} onPointerStart={(event) => beginDrag(item, event.clientX, event.clientY)} onDragStart={(event) => { beginDrag(item, event.clientX, event.clientY); event.dataTransfer.setData("text/tier-item", item.id); event.dataTransfer.setData("text/plain", item.label); event.dataTransfer.effectAllowed = "move"; const blank = document.createElement("canvas"); blank.width = 1; blank.height = 1; event.dataTransfer.setDragImage(blank, 0, 0); }} />
              ))}
            </div>
          </div>
          );
        })}
        {editingRows && !presenting ? (
          <button type="button" className="min-h-11 w-full rounded-xl border border-dashed border-stone-400 font-bold disabled:opacity-40" disabled={!doc.tiers.some((tier) => tier.id !== "unranked" && tier.hidden)} onClick={() => setDoc((prev) => addTier(prev))}>{copy.addRow}</button>
        ) : null}
        <div data-tier-id="unranked" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/tier-item"); if (id) moveItem(id, "unranked"); clearDrag(); }} className={`rounded-xl border border-dashed border-stone-300 p-2 ${hoverTier === "unranked" ? "ring-2 ring-lime-400" : ""}`}>
          <p className="mb-2 text-xs font-bold text-stone-500">{copy.unranked}</p>
          <div className="flex flex-wrap gap-2">
            {doc.tiers.find((tier) => tier.id === "unranked")?.items.filter((item) => !itemQuery.trim() || item.label.toLocaleLowerCase().includes(itemQuery.trim().toLocaleLowerCase())).map((item) => (
              <Chip key={item.id} item={item} selected={selected === item.id} dimmed={ghost?.item.id === item.id} onSelect={() => setSelected(item.id)} onPointerStart={(event) => beginDrag(item, event.clientX, event.clientY)} onDragStart={(event) => { beginDrag(item, event.clientX, event.clientY); event.dataTransfer.setData("text/tier-item", item.id); event.dataTransfer.setData("text/plain", item.label); event.dataTransfer.effectAllowed = "move"; const blank = document.createElement("canvas"); blank.width = 1; blank.height = 1; event.dataTransfer.setDragImage(blank, 0, 0); }} />
            ))}
          </div>
        </div>
      </div>

      <div className={presenting ? "hidden" : "contents"}>
      {selectedItem ? (
        <p className="text-sm">
          {selectedItem.label} → {visibleRankedTiers(doc).map((tier) => (
            <button key={tier.id} type="button" className="ml-1 min-h-11 min-w-11 rounded-md border px-2 font-bold" onClick={() => moveTo(tier.id)}>
              {tierLabel(tier)}
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label={copy.pick}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) void addImages(files, files.map((file) => file.name));
            event.target.value = "";
          }}
        />
        <button type="button" className="min-h-11 w-full rounded-lg border border-lime-700 font-bold text-lime-800" onClick={() => fileRef.current?.click()}>
          {copy.pick}
        </button>
        <p className="text-xs leading-relaxed text-stone-500">{copy.localNote}</p>
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
          {visibleRankedTiers(doc).map((tier) => (
            <p key={tier.id} className="mt-1">
              <b>{tierLabel(tier)}</b> {copy.compareCurrent} {tier.items.map((item) => item.label).join(", ") || "—"}
              {" / "}{copy.compareSaved} {compareDoc.tiers.find((saved) => saved.id === tier.id)?.items.map((item) => item.label).join(", ") || "—"}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold">{copy.templates}</p>
        {templatesForLocale(loc).map((template) => (
          <div key={template.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3">
            <span>{template.title[loc]}</span>
            <span className="flex gap-1">
              <button type="button" className="min-h-11 px-2" onClick={() => void vote(template.id, "up")}>{copy.up}</button>
              <button type="button" className="min-h-11 px-2" onClick={() => void vote(template.id, "down")}>{copy.down}</button>
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-stone-500">{copy.privacy}</p>
      {status ? <p className="break-all text-sm font-bold text-lime-800">{status}</p> : null}
      </div>
      {ghost ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-50"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <ChipFace item={ghost.item} />
        </div>
      ) : null}
    </section>
  );
}

function ChipFace({ item }: { item: TierItem }) {
  return (
    <div className="flex w-20 flex-col items-center overflow-hidden rounded-lg border border-stone-200 bg-card text-[11px] shadow-sm">
      {item.imageData ?? item.imageUrl ? (
        <img src={item.imageData ?? item.imageUrl} alt="" width={72} height={72} className="size-[72px] object-cover" draggable={false} referrerPolicy="no-referrer" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : <span className="grid size-[72px] place-items-center bg-stone-100 text-2xl font-black text-stone-400">{item.label.slice(0, 1)}</span>}
      <span className="w-full truncate px-1 py-1.5 font-bold">{item.label}</span>
    </div>
  );
}

function Chip({ item, selected, dimmed, onSelect, onPointerStart, onDragStart }: { item: TierItem; selected: boolean; dimmed: boolean; onSelect: () => void; onPointerStart: (event: ReactPointerEvent<HTMLButtonElement>) => void; onDragStart: (event: ReactDragEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onPointerDown={onPointerStart}
      onClick={onSelect}
      className={`flex w-20 touch-none flex-col items-center overflow-hidden rounded-lg border bg-card text-[11px] shadow-sm transition ${selected ? "border-lime-700 ring-2 ring-lime-300" : "border-stone-200"} ${dimmed ? "opacity-40" : ""}`}
    >
      {item.imageData ?? item.imageUrl ? (
        <img src={item.imageData ?? item.imageUrl} alt="" width={72} height={72} className="size-[72px] object-cover" draggable={false} referrerPolicy="no-referrer" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }} />
      ) : <span className="grid size-[72px] place-items-center bg-stone-100 text-2xl font-black text-stone-400">{item.label.slice(0, 1)}</span>}
      <span className="w-full truncate px-1 py-1.5 font-bold">{item.label}</span>
    </button>
  );
}
