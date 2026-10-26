/**
 * Gorogoa Frame Weaver (#133) — 2x2 Multi-Frame Zoom, Pan, Swap & Stencil Layer Puzzle Engine
 *
 * Inspired by Jason Roberts' Gorogoa (2017):
 * - 2x2 grid (slots 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right)
 * - Each panel has multiple zoom levels (0: Wide, 1: Close-up)
 * - Panels can be swapped across slots, zoomed in/out, or have stencil cutout layers stacked onto another panel
 * - When the spatial/zoom/layer conditions of a chapter are satisfied, a narrative animation bridges the panels!
 */

export type SlotIndex = 0 | 1 | 2 | 3;

export interface PanelDefinition {
  id: string;
  title: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  maxZoom: number;
  initialZoom: number;
  initialSlot: SlotIndex;
  hasStencilAtZoom?: number; // If defined, at this zoom level its foreground stencil can be stacked onto targetPanelId
  stencilTargetPanelId?: string;
  themeColor: string;
  accentColor: string;
  sceneType:
    | "seeker_room"
    | "crimson_tree"
    | "stone_arch"
    | "fountain_courtyard"
    | "night_telescope"
    | "star_sky"
    | "rooftop_left"
    | "lighthouse_right"
    | "tower_top"
    | "tower_base"
    | "sun_dial"
    | "sanctuary_bell";
}

export interface PanelState {
  id: string;
  slot: SlotIndex;
  zoom: number;
  stackedStencilFromId: string | null;
  isStencilDetached: boolean;
}

export interface ChapterRule {
  /** Required conditions for chapter completion */
  requiredZooms: Record<string, number>;
  /** Optional horizontal adjacency pair [leftPanelId, rightPanelId] in [0,1] or [2,3] */
  horizontalPair?: [string, string];
  /** Optional vertical adjacency pair [topPanelId, bottomPanelId] in [0,2] or [1,3] */
  verticalPair?: [string, string];
  /** Optional stencil stack requirement: { stencilPanelId, targetPanelId } */
  requiredStack?: { stencilPanelId: string; targetPanelId: string };
}

export interface ChapterSpec {
  id: string;
  chapterNum: number;
  title: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  objective: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  hintText: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  panels: PanelDefinition[];
  rule: ChapterRule;
}

export interface GorogoaState {
  chapterIndex: number;
  panels: PanelState[];
  selectedSlot: SlotIndex | null;
  moves: number;
  hintsUsed: number;
  isChapterCleared: boolean;
  isAllCleared: boolean;
  connectionAnimProgress: number; // 0 to 1 when solved
}

export const CHAPTERS: ChapterSpec[] = [
  {
    id: "crimson-fruit",
    chapterNum: 1,
    title: {
      ko: "제1장: 붉은 열매의 정원",
      en: "Chapter I: The Garden of Crimson Fruit",
      ja: "第1章：紅き果実の庭園",
      zh: "第一章：绯红果实的庭院",
      fr: "Chapitre I : Le Jardin du Fruit Vermeil",
      es: "Capítulo I: El Jardín del Fruto Carmesí",
    },
    objective: {
      ko: "서재 창문을 확대(🔍+)해 탐구자를 깨우고, 사과나무 가지를 우측에 나란히 배치한 뒤, 석조 아치 틀을 분수대 위에 겹쳐 붉은 열매를 받으세요.",
      en: "Zoom into the Study Window & Crimson Tree, align them side-by-side (Left -> Right), and stack the Stone Arch stencil onto the Fountain!",
      ja: "書斎の窓とリンゴの木を拡大(🔍+)して左右に並べ、石のアーチ枠を噴水の上に重ねて赤い果実を受け止めましょう。",
      zh: "放大书房窗户与红果树枝并将其左右并排，再将石拱门镂空框叠加到庭院喷泉上以承接果实。",
      fr: "Zoomez sur la fenêtre et l'arbre, alignez-les côte à côte (Gauche -> Droite) et superposez l'arche de pierre sur la fontaine !",
      es: "¡Haz zoom en la ventana y el árbol, alinéalos de izquierda a derecha y superpón el arco de piedra sobre la fuente!",
    },
    hintText: {
      ko: "힌트: 1) 서재와 사과나무를 확대(🔍+)하세요. 2) 서재를 왼쪽, 사과나무를 오른쪽에 두세요. 3) 아치 틀을 확대한 뒤 분수대 패널과 교환/결합하세요!",
      en: "Hint: 1) Zoom in on Study & Tree. 2) Put Study on Left, Tree on Right. 3) Zoom in on Stone Arch and drag/swap it onto Fountain!",
      ja: "ヒント: 1) 書斎と木を拡大。2) 書斎を左、木を右に配置。3) 石のアーチを拡大して噴水パネルに重ねましょう！",
      zh: "提示：1) 放大书房与果树。2) 书房置左、果树置右。3) 放大石拱门并拖拽叠加至喷泉面板！",
      fr: "Indice : 1) Zoomez sur l'étude et l'arbre. 2) Étude à gauche, Arbre à droite. 3) Zoomez sur l'arche et glissez-la sur la fontaine !",
      es: "Pista: 1) Haz zoom en el estudio y el árbol. 2) Estudio a la izquierda, árbol a la derecha. 3) ¡Haz zoom en el arco y únelo a la fuente!",
    },
    panels: [
      {
        id: "seeker_room",
        title: { ko: "탐구자의 서재", en: "Seeker's Study", ja: "探究者の書斎", zh: "探求者书房", fr: "Étude du Chercheur", es: "Estudio del Buscador" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 1,
        themeColor: "#1e293b",
        accentColor: "#38bdf8",
        sceneType: "seeker_room",
      },
      {
        id: "crimson_tree",
        title: { ko: "붉은 사과나무", en: "Crimson Apple Tree", ja: "紅リンゴの木", zh: "绯红苹果树", fr: "Pommier Vermeil", es: "Manzano Carmesí" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 0,
        themeColor: "#14532d",
        accentColor: "#ef4444",
        sceneType: "crimson_tree",
      },
      {
        id: "stone_arch",
        title: { ko: "석조 아치 창틀", en: "Stone Arch Frame", ja: "石造りのアーチ枠", zh: "石拱窗框（镂空）", fr: "Arche de Pierre", es: "Marco de Arco" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 2,
        hasStencilAtZoom: 1,
        stencilTargetPanelId: "fountain_courtyard",
        themeColor: "#475569",
        accentColor: "#facc15",
        sceneType: "stone_arch",
      },
      {
        id: "fountain_courtyard",
        title: { ko: "정원 분수대", en: "Courtyard Fountain", ja: "中庭の噴水", zh: "庭院喷泉", fr: "Fontaine de la Cour", es: "Fuente del Patio" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 3,
        themeColor: "#0f172a",
        accentColor: "#60a5fa",
        sceneType: "fountain_courtyard",
      },
    ],
    rule: {
      requiredZooms: {
        seeker_room: 1,
        crimson_tree: 1,
      },
      horizontalPair: ["seeker_room", "crimson_tree"],
      requiredStack: {
        stencilPanelId: "stone_arch",
        targetPanelId: "fountain_courtyard",
      },
    },
  },
  {
    id: "starlight-moth",
    chapterNum: 2,
    title: {
      ko: "제2장: 별빛 등대와 황금 나방",
      en: "Chapter II: The Starlight Lighthouse",
      ja: "第2章：星明かりの灯台と黄金の蛾",
      zh: "第二章：星光灯塔与黄金蛾",
      fr: "Chapitre II : Le Phare Stellaire",
      es: "Capítulo II: El Faro de Luz Estelar",
    },
    objective: {
      ko: "망원경 렌즈 틀을 확대해 밤하늘의 별자리 위에 겹쳐 등대 불빛을 밝히고, 지붕 다리(좌)와 등대 탑(우)을 연결하세요!",
      en: "Zoom into the Telescope Aperture and stack it onto the Starry Sky to ignite the starlight, then align Rooftop (Left) and Lighthouse (Right)!",
      ja: "望遠鏡のレンズ枠を拡大して星空に重ねて光を灯し、屋根の橋(左)と灯台(右)を左右に繋げましょう！",
      zh: "放大望远镜光圈框并叠加到璀璨星空上点亮星芒，再将屋顶长桥（左）与灯塔（右）水平对齐相连！",
      fr: "Zoomez sur la lunette, superposez-la sur le ciel étoilé, puis alignez le toit (Gauche) et le phare (Droite) !",
      es: "¡Haz zoom en el telescopio, superpónlo al cielo estrellado y alinea el tejado (Izquierda) con el faro (Derecha)!",
    },
    hintText: {
      ko: "힌트: 1) 망원경 렌즈를 확대(🔍+)한 뒤 밤하늘 패널 위에 겹치세요. 2) 지붕 다리와 등대 탑을 모두 확대한 뒤 좌·우로 나란히 배치하세요!",
      en: "Hint: 1) Zoom in on Telescope and stack onto Starry Sky. 2) Zoom in on both Rooftop & Lighthouse and place Rooftop Left, Lighthouse Right!",
      ja: "ヒント: 1) 望遠鏡を拡大して星空に重ねます。2) 屋根と灯台を両方拡大し、左に屋根、右に灯台を並べましょう！",
      zh: "提示：1) 放大望远镜并叠加至星空。2) 放大屋顶与灯塔，将屋顶放左侧、灯塔放右侧！",
      fr: "Indice : 1) Zoomez sur la lunette et glissez-la sur le ciel étoilé. 2) Zoomez sur le toit et le phare et alignez-les !",
      es: "Pista: 1) Haz zoom en el telescopio y únelo al cielo. 2) ¡Haz zoom en tejado y faro y colócalos de izquierda a derecha!",
    },
    panels: [
      {
        id: "night_telescope",
        title: { ko: "황동 망원경 창", en: "Brass Telescope Lens", ja: "真鍮の望遠鏡枠", zh: "黄铜望远镜框（镂空）", fr: "Lunette en Laiton", es: "Lente de Telescopio" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 0,
        hasStencilAtZoom: 1,
        stencilTargetPanelId: "star_sky",
        themeColor: "#334155",
        accentColor: "#fbbf24",
        sceneType: "night_telescope",
      },
      {
        id: "star_sky",
        title: { ko: "북극성 밤하늘", en: "Polaris Starfield", ja: "北極星の夜空", zh: "北极星夜空", fr: "Ciel Étoilé", es: "Cielo Estrellado" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 1,
        themeColor: "#090d16",
        accentColor: "#fde047",
        sceneType: "star_sky",
      },
      {
        id: "rooftop_left",
        title: { ko: "달빛 지붕 다리", en: "Moonlit Rooftop", ja: "月明かりの屋根橋", zh: "月光屋顶长桥", fr: "Toit au Clair de Lune", es: "Tejado Iluminado" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 3,
        themeColor: "#1e1b4b",
        accentColor: "#a78bfa",
        sceneType: "rooftop_left",
      },
      {
        id: "lighthouse_right",
        title: { ko: "고대 등대 탑", en: "Ancient Lighthouse", ja: "古代の灯台塔", zh: "古老灯塔", fr: "Tour du Phare", es: "Torre del Faro" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 2,
        themeColor: "#172554",
        accentColor: "#38bdf8",
        sceneType: "lighthouse_right",
      },
    ],
    rule: {
      requiredZooms: {
        rooftop_left: 1,
        lighthouse_right: 1,
      },
      horizontalPair: ["rooftop_left", "lighthouse_right"],
      requiredStack: {
        stencilPanelId: "night_telescope",
        targetPanelId: "star_sky",
      },
    },
  },
  {
    id: "clockwork-sanctuary",
    chapterNum: 3,
    title: {
      ko: "제3장: 시간의 시계탑 성소",
      en: "Chapter III: The Clockwork Sanctuary",
      ja: "第3章：時の時計塔聖域",
      zh: "第三章：时间钟塔圣所",
      fr: "Chapitre III : Le Sanctuaire d'Horlogerie",
      es: "Capítulo III: El Santuario del Reloj",
    },
    objective: {
      ko: "시계탑 상층 계단(위)과 하층 기단(아래)을 수직으로 맞추고, 해시계 고리를 확대해 성소의 황금 종 위에 겹쳐 시간을 깨우세요!",
      en: "Align the Upper Staircase (Top) directly above the Lower Base (Bottom), and stack the Sundial Ring onto the Sanctuary Bell!",
      ja: "時計塔の上層階段(上)と下層基壇(下)を縦に繋ぎ、日時計のリングを拡大して聖域の黄金の鐘に重ねましょう！",
      zh: "将钟塔上层阶梯（上）与下层基座（下）垂直对齐，并放大日晷圆环叠加至圣所黄金钟上唤醒时间！",
      fr: "Alignez l'escalier supérieur (Haut) au-dessus de la base (Bas) et superposez l'anneau du cadran solaire sur la cloche !",
      es: "¡Alinea la escalera superior (Arriba) sobre la base (Abajo) y superpón el anillo del reloj solar sobre la campana!",
    },
    hintText: {
      ko: "힌트: 1) 상층 계단과 하층 기단을 모두 확대(🔍+)하고 위·아래 슬롯(예: 좌상단·좌하단)에 배치하세요. 2) 해시계 고리를 확대해 성소의 종에 겹치세요!",
      en: "Hint: 1) Zoom in on Upper Staircase & Lower Base and align vertically (Top/Bottom). 2) Zoom in on Sundial Ring and stack onto Sanctuary Bell!",
      ja: "ヒント: 1) 上層階段と下層基壇を拡大して上下に配置。2) 日時計リングを拡大して聖域の鐘に重ねましょう！",
      zh: "提示：1) 放大上层阶梯与下层基座并上下垂直对齐。2) 放大日晷圆环并叠加至圣所黄金钟！",
      fr: "Indice : 1) Zoomez sur l'escalier et la base et alignez-les verticalement. 2) Zoomez sur le cadran et glissez-le sur la cloche !",
      es: "Pista: 1) Haz zoom en escalera y base y alinéalos verticalmente. 2) ¡Haz zoom en el reloj solar y únelo a la campana!",
    },
    panels: [
      {
        id: "tower_top",
        title: { ko: "시계탑 상층 나선계단", en: "Upper Spiral Stair", ja: "時計塔の上層階段", zh: "钟塔上层螺旋阶梯", fr: "Escalier Supérieur", es: "Escalera Superior" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 2,
        themeColor: "#312e81",
        accentColor: "#c084fc",
        sceneType: "tower_top",
      },
      {
        id: "tower_base",
        title: { ko: "시계탑 하층 회랑", en: "Lower Tower Hall", ja: "時計塔の下層回廊", zh: "钟塔下层回廊", fr: "Hall Inférieur", es: "Salón Inferior" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 0,
        themeColor: "#1e1b4b",
        accentColor: "#818cf8",
        sceneType: "tower_base",
      },
      {
        id: "sun_dial",
        title: { ko: "천문 해시계 고리", en: "Celestial Sundial Ring", ja: "天文日時計の輪", zh: "天文日晷圆环（镂空）", fr: "Anneau Solaire", es: "Anillo de Reloj Solar" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 1,
        hasStencilAtZoom: 1,
        stencilTargetPanelId: "sanctuary_bell",
        themeColor: "#451a03",
        accentColor: "#fbbf24",
        sceneType: "sun_dial",
      },
      {
        id: "sanctuary_bell",
        title: { ko: "성소의 황금 종", en: "Sanctuary Golden Bell", ja: "聖域の黄金の鐘", zh: "圣所黄金钟", fr: "Cloche du Sanctuaire", es: "Campana del Santuario" },
        maxZoom: 1,
        initialZoom: 0,
        initialSlot: 3,
        themeColor: "#1c1917",
        accentColor: "#f59e0b",
        sceneType: "sanctuary_bell",
      },
    ],
    rule: {
      requiredZooms: {
        tower_top: 1,
        tower_base: 1,
      },
      verticalPair: ["tower_top", "tower_base"],
      requiredStack: {
        stencilPanelId: "sun_dial",
        targetPanelId: "sanctuary_bell",
      },
    },
  },
];

export function createGorogoaState(chapterIndex = 0): GorogoaState {
  const safeIdx = Math.max(0, Math.min(CHAPTERS.length - 1, chapterIndex));
  const spec = CHAPTERS[safeIdx];

  const panels: PanelState[] = spec.panels.map((p) => ({
    id: p.id,
    slot: p.initialSlot,
    zoom: p.initialZoom,
    stackedStencilFromId: null,
    isStencilDetached: false,
  }));

  return {
    chapterIndex: safeIdx,
    panels,
    selectedSlot: null,
    moves: 0,
    hintsUsed: 0,
    isChapterCleared: false,
    isAllCleared: false,
    connectionAnimProgress: 0,
  };
}

export function checkChapterSolved(state: GorogoaState): boolean {
  const spec = CHAPTERS[state.chapterIndex];
  const rule = spec.rule;

  // 1. Check required zooms
  for (const [panelId, reqZoom] of Object.entries(rule.requiredZooms)) {
    const p = state.panels.find((item) => item.id === panelId);
    if (!p || p.zoom !== reqZoom) return false;
  }

  // 2. Check horizontal adjacency ([0, 1] or [2, 3])
  if (rule.horizontalPair) {
    const [leftId, rightId] = rule.horizontalPair;
    const leftP = state.panels.find((p) => p.id === leftId);
    const rightP = state.panels.find((p) => p.id === rightId);
    if (!leftP || !rightP) return false;
    const validHoriz =
      (leftP.slot === 0 && rightP.slot === 1) ||
      (leftP.slot === 2 && rightP.slot === 3);
    if (!validHoriz) return false;
  }

  // 3. Check vertical adjacency ([0, 2] or [1, 3])
  if (rule.verticalPair) {
    const [topId, bottomId] = rule.verticalPair;
    const topP = state.panels.find((p) => p.id === topId);
    const bottomP = state.panels.find((p) => p.id === bottomId);
    if (!topP || !bottomP) return false;
    const validVert =
      (topP.slot === 0 && bottomP.slot === 2) ||
      (topP.slot === 1 && bottomP.slot === 3);
    if (!validVert) return false;
  }

  // 4. Check stencil stacking
  if (rule.requiredStack) {
    const targetP = state.panels.find(
      (p) => p.id === rule.requiredStack?.targetPanelId
    );
    if (
      !targetP ||
      targetP.stackedStencilFromId !== rule.requiredStack.stencilPanelId
    ) {
      return false;
    }
  }

  return true;
}

function updateSolvedStatus(state: GorogoaState): void {
  if (checkChapterSolved(state)) {
    state.isChapterCleared = true;
    state.connectionAnimProgress = 1;
    if (state.chapterIndex === CHAPTERS.length - 1) {
      state.isAllCleared = true;
    }
  }
}

export function togglePanelZoom(state: GorogoaState, panelId: string): boolean {
  if (state.isChapterCleared) return false;
  const spec = CHAPTERS[state.chapterIndex];
  const def = spec.panels.find((d) => d.id === panelId);
  const p = state.panels.find((item) => item.id === panelId);
  if (!def || !p) return false;

  p.zoom = p.zoom < def.maxZoom ? p.zoom + 1 : 0;
  state.moves += 1;
  updateSolvedStatus(state);
  return true;
}

export function interactSlots(
  state: GorogoaState,
  slotA: SlotIndex,
  slotB: SlotIndex
): { action: "swapped" | "stacked" | "none" } {
  if (state.isChapterCleared || slotA === slotB) return { action: "none" };

  const spec = CHAPTERS[state.chapterIndex];
  const panelA = state.panels.find((p) => p.slot === slotA);
  const panelB = state.panels.find((p) => p.slot === slotB);
  if (!panelA || !panelB) return { action: "none" };

  const defA = spec.panels.find((d) => d.id === panelA.id);
  const defB = spec.panels.find((d) => d.id === panelB.id);

  // Check if A can stack its stencil onto B
  if (
    defA &&
    defA.hasStencilAtZoom !== undefined &&
    panelA.zoom === defA.hasStencilAtZoom &&
    defA.stencilTargetPanelId === panelB.id &&
    !panelA.isStencilDetached
  ) {
    panelA.isStencilDetached = true;
    panelB.stackedStencilFromId = panelA.id;
    state.moves += 1;
    state.selectedSlot = null;
    updateSolvedStatus(state);
    return { action: "stacked" };
  }

  // Check if B can stack its stencil onto A
  if (
    defB &&
    defB.hasStencilAtZoom !== undefined &&
    panelB.zoom === defB.hasStencilAtZoom &&
    defB.stencilTargetPanelId === panelA.id &&
    !panelB.isStencilDetached
  ) {
    panelB.isStencilDetached = true;
    panelA.stackedStencilFromId = panelB.id;
    state.moves += 1;
    state.selectedSlot = null;
    updateSolvedStatus(state);
    return { action: "stacked" };
  }

  // Otherwise swap their slots in the 2x2 grid
  panelA.slot = slotB;
  panelB.slot = slotA;
  state.moves += 1;
  state.selectedSlot = null;
  updateSolvedStatus(state);
  return { action: "swapped" };
}

/**
 * Performs one smart assistive step toward solving the current chapter
 */
export function applyHintStep(state: GorogoaState): boolean {
  if (state.isChapterCleared) return false;
  const spec = CHAPTERS[state.chapterIndex];
  const rule = spec.rule;
  state.hintsUsed += 1;

  // Step 1: Ensure required zooms are set
  for (const [panelId, reqZoom] of Object.entries(rule.requiredZooms)) {
    const p = state.panels.find((item) => item.id === panelId);
    if (p && p.zoom !== reqZoom) {
      p.zoom = reqZoom;
      state.moves += 1;
      updateSolvedStatus(state);
      return true;
    }
  }

  // Step 2: Ensure stencil is zoomed and stacked
  if (rule.requiredStack) {
    const stencilP = state.panels.find(
      (p) => p.id === rule.requiredStack?.stencilPanelId
    );
    const targetP = state.panels.find(
      (p) => p.id === rule.requiredStack?.targetPanelId
    );
    const stencilDef = spec.panels.find(
      (d) => d.id === rule.requiredStack?.stencilPanelId
    );
    if (
      stencilP &&
      stencilDef &&
      stencilDef.hasStencilAtZoom !== undefined &&
      stencilP.zoom !== stencilDef.hasStencilAtZoom
    ) {
      stencilP.zoom = stencilDef.hasStencilAtZoom;
      state.moves += 1;
      updateSolvedStatus(state);
      return true;
    }
    if (
      stencilP &&
      targetP &&
      targetP.stackedStencilFromId !== stencilP.id
    ) {
      interactSlots(state, stencilP.slot, targetP.slot);
      return true;
    }
  }

  // Step 3: Align horizontal or vertical pair
  if (rule.horizontalPair) {
    const [leftId, rightId] = rule.horizontalPair;
    const leftP = state.panels.find((p) => p.id === leftId);
    const rightP = state.panels.find((p) => p.id === rightId);
    if (leftP && leftP.slot !== 0) {
      interactSlots(state, leftP.slot, 0);
      return true;
    }
    if (rightP && rightP.slot !== 1) {
      interactSlots(state, rightP.slot, 1);
      return true;
    }
  }

  if (rule.verticalPair) {
    const [topId, bottomId] = rule.verticalPair;
    const topP = state.panels.find((p) => p.id === topId);
    const bottomP = state.panels.find((p) => p.id === bottomId);
    if (topP && topP.slot !== 0) {
      interactSlots(state, topP.slot, 0);
      return true;
    }
    if (bottomP && bottomP.slot !== 2) {
      interactSlots(state, bottomP.slot, 2);
      return true;
    }
  }

  return false;
}
