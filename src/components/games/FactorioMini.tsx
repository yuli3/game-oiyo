import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import {
  applyStageBlueprint,
  createFactorioState,
  DIR_VECTORS,
  ITEM_COLORS,
  ITEM_RP_VALUES,
  placeBuilding,
  rotateSelectedTool,
  STAGES,
  stepFactorio,
  type BuildingType,
  type Direction,
  type FactorioState,
  type ItemType,
} from "../../lib/games/factorio-mini";

type Locale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

interface Props {
  locale?: string;
}

const I18N: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    rpLabel: string;
    deliveredLabel: string;
    rotateBtn: string;
    blueprintBtn: string;
    speedBtn: string;
    resetBtn: string;
    nextStageBtn: string;
    stageComplete: string;
    tools: Record<BuildingType, string>;
    dirs: Record<Direction, string>;
    items: Record<ItemType, string>;
    controlsHint: string;
  }
> = {
  ko: {
    title: "팩토리오 미니",
    subtitle: "채굴기·용광로·조립기·컨베이어 벨트를 연결해 연구실(🔬)에 과학 팩을 자동 공급하세요!",
    rpLabel: "연구 점수 (RP)",
    deliveredLabel: "납품 수량",
    rotateBtn: "방향 회전 [R]",
    blueprintBtn: "⚡ 청사진 증설",
    speedBtn: "배속",
    resetBtn: "초기화",
    nextStageBtn: "다음 공구로 이동 →",
    stageComplete: "🎉 연구 목표 달성! 자동화 공정이 완벽히 가동되었습니다!",
    tools: {
      belt: "➡️ 벨트 [1]",
      miner: "⛏️ 채굴기 [2]",
      smelter: "🔥 용광로 [3]",
      assembler: "⚙️ 조립기 [4]",
      empty: "🗑️ 철거 [5]",
      lab: "🔬 연구실",
    },
    dirs: { 0: "⬆️ 북(N)", 1: "➡️ 동(E)", 2: "⬇️ 남(S)", 3: "⬅️ 서(W)" },
    items: {
      iron_ore: "철광석",
      copper_ore: "구리광석",
      coal: "석탄",
      iron_plate: "철판(10RP)",
      copper_plate: "구리판(10RP)",
      gear: "기어(25RP)",
      circuit: "회로(25RP)",
      science_pack: "과학팩(65RP)",
    },
    controlsHint: "타일 클릭/드래그: 설비 배치 · 동일 설비 재클릭 또는 [R]: 90° 회전 · 철판+구리판을 같은 조립기에 넣으면 적색 과학팩(65 RP) 합성!",
  },
  en: {
    title: "Factorio Automation Mini",
    subtitle: "Connect Miners, Smelters, Assemblers, and Conveyor Belts to feed the Research Lab!",
    rpLabel: "Research (RP)",
    deliveredLabel: "Delivered",
    rotateBtn: "Rotate [R]",
    blueprintBtn: "⚡ Auto-Blueprint",
    speedBtn: "Speed",
    resetBtn: "Reset",
    nextStageBtn: "Next Sector →",
    stageComplete: "🎉 Research Target Complete! The factory is fully automated!",
    tools: {
      belt: "➡️ Belt [1]",
      miner: "⛏️ Miner [2]",
      smelter: "🔥 Smelter [3]",
      assembler: "⚙️ Assembler [4]",
      empty: "🗑️ Demolish [5]",
      lab: "🔬 Lab",
    },
    dirs: { 0: "⬆️ North", 1: "➡️ East", 2: "⬇️ South", 3: "⬅️ West" },
    items: {
      iron_ore: "Iron Ore",
      copper_ore: "Copper Ore",
      coal: "Coal",
      iron_plate: "Iron Plate(10RP)",
      copper_plate: "Copper Plate(10RP)",
      gear: "Gear(25RP)",
      circuit: "Circuit(25RP)",
      science_pack: "Science Pack(65RP)",
    },
    controlsHint: "Click/Drag tile: Place building · Click same building or [R]: Rotate 90° · Feed Iron + Copper plates into one Assembler for Science Packs (65 RP)!",
  },
  ja: {
    title: "ファクトリオ ミニ",
    subtitle: "採掘機・溶鉱炉・組立機・コンベアを繋いで研究所(🔬)へ自動供給しよう！",
    rpLabel: "研究ポイント (RP)",
    deliveredLabel: "納品数",
    rotateBtn: "回転 [R]",
    blueprintBtn: "⚡ 青写真増設",
    speedBtn: "速度",
    resetBtn: "リセット",
    nextStageBtn: "次の工区へ →",
    stageComplete: "🎉 研究目標達成！自動化ラインが完璧に稼働しました！",
    tools: {
      belt: "➡️ ベルト [1]",
      miner: "⛏️ 採掘機 [2]",
      smelter: "🔥 溶鉱炉 [3]",
      assembler: "⚙️ 組立機 [4]",
      empty: "🗑️ 撤去 [5]",
      lab: "🔬 研究所",
    },
    dirs: { 0: "⬆️ 北(N)", 1: "➡️ 東(E)", 2: "⬇️ 南(S)", 3: "⬅️ 西(W)" },
    items: {
      iron_ore: "鉄鉱石",
      copper_ore: "銅鉱石",
      coal: "石炭",
      iron_plate: "鉄板(10RP)",
      copper_plate: "銅板(10RP)",
      gear: "歯車(25RP)",
      circuit: "回路(25RP)",
      science_pack: "赤パック(65RP)",
    },
    controlsHint: "タイルクリック: 設置 · 同じ設備をクリックまたは[R]: 90°回転 · 鉄板+銅板を同じ組立機に入れると赤サイエンスパック(65 RP)を合成！",
  },
  zh: {
    title: "异星工厂 迷你版",
    subtitle: "连接采矿机、熔炉、组装机与传送带，向研究中心(🔬)全自动输送科技包！",
    rpLabel: "研究点数 (RP)",
    deliveredLabel: "已交付",
    rotateBtn: "旋转方向 [R]",
    blueprintBtn: "⚡ 蓝图扩建",
    speedBtn: "倍速",
    resetBtn: "重置",
    nextStageBtn: "前往下一工区 →",
    stageComplete: "🎉 研发目标达成！全自动生产线高效运转中！",
    tools: {
      belt: "➡️ 传送带 [1]",
      miner: "⛏️ 采矿机 [2]",
      smelter: "🔥 熔炉 [3]",
      assembler: "⚙️ 组装机 [4]",
      empty: "🗑️ 拆除 [5]",
      lab: "🔬 研究所",
    },
    dirs: { 0: "⬆️ 北(N)", 1: "➡️ 东(E)", 2: "⬇️ 南(S)", 3: "⬅️ 西(W)" },
    items: {
      iron_ore: "铁矿石",
      copper_ore: "铜矿石",
      coal: "煤炭",
      iron_plate: "铁板(10RP)",
      copper_plate: "铜板(10RP)",
      gear: "齿轮(25RP)",
      circuit: "电路(25RP)",
      science_pack: "红瓶(65RP)",
    },
    controlsHint: "点击网格：建造设施 · 再次点击同设施或按 [R]：旋转 90° · 将铁板与铜板汇入同一组装机即可合成高价值红瓶（65 RP）！",
  },
  fr: {
    title: "Factorio Automation Mini",
    subtitle: "Reliez foreuses, fours, assembleuses et convoyeurs pour alimenter le laboratoire !",
    rpLabel: "Recherche (RP)",
    deliveredLabel: "Livré",
    rotateBtn: "Pivoter [R]",
    blueprintBtn: "⚡ Plan Auto",
    speedBtn: "Vitesse",
    resetBtn: "Réinitialiser",
    nextStageBtn: "Secteur suivant →",
    stageComplete: "🎉 Objectif de recherche atteint ! L'usine tourne à plein régime !",
    tools: {
      belt: "➡️ Convoyeur [1]",
      miner: "⛏️ Foreuse [2]",
      smelter: "🔥 Four [3]",
      assembler: "⚙️ Assembleuse [4]",
      empty: "🗑️ Démolir [5]",
      lab: "🔬 Labo",
    },
    dirs: { 0: "⬆️ Nord", 1: "➡️ Est", 2: "⬇️ Sud", 3: "⬅️ Ouest" },
    items: {
      iron_ore: "Minerai fer",
      copper_ore: "Minerai cuivre",
      coal: "Charbon",
      iron_plate: "Plaque fer(10RP)",
      copper_plate: "Plaque cuivre(10RP)",
      gear: "Engrenage(25RP)",
      circuit: "Circuit(25RP)",
      science_pack: "Pack Rouge(65RP)",
    },
    controlsHint: "Clic sur case : Construire · Clic identique ou [R] : Pivoter 90° · Fer + Cuivre dans une assembleuse = Pack scientifique (65 RP) !",
  },
  es: {
    title: "Factorio Automation Mini",
    subtitle: "¡Conecta perforadoras, hornos, ensambladoras y cintas para abastecer el laboratorio!",
    rpLabel: "Investigación (RP)",
    deliveredLabel: "Entregado",
    rotateBtn: "Rotar [R]",
    blueprintBtn: "⚡ Plano Auto",
    speedBtn: "Velocidad",
    resetBtn: "Reiniciar",
    nextStageBtn: "Siguiente sector →",
    stageComplete: "🎉 ¡Meta de investigación completada! ¡La fábrica está automatizada!",
    tools: {
      belt: "➡️ Cinta [1]",
      miner: "⛏️ Perforadora [2]",
      smelter: "🔥 Horno [3]",
      assembler: "⚙️ Ensambladora [4]",
      empty: "🗑️ Demoler [5]",
      lab: "🔬 Lab",
    },
    dirs: { 0: "⬆️ Norte", 1: "➡️ Este", 2: "⬇️ Sur", 3: "⬅️ Oeste" },
    items: {
      iron_ore: "Mineral hierro",
      copper_ore: "Mineral cobre",
      coal: "Carbón",
      iron_plate: "Placa hierro(10RP)",
      copper_plate: "Placa cobre(10RP)",
      gear: "Engranaje(25RP)",
      circuit: "Circuito(25RP)",
      science_pack: "Ciencia Roja(65RP)",
    },
    controlsHint: "Clic en casilla: Construir · Clic repetido o [R]: Rotar 90° · ¡Hierro + Cobre en una ensambladora crean Ciencia Roja (65 RP)!",
  },
};

const CANVAS_W = 700;
const CANVAS_H = 560;
const CELL_SIZE = 64;
const GRID_OFFSET_X = 30;
const GRID_OFFSET_Y = 24;

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export default function FactorioMini({ locale = "ko" }: Props) {
  const lang: Locale = (locale in I18N ? locale : "en") as Locale;
  const t = I18N[lang];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<FactorioState>(createFactorioState(0));
  const popupsRef = useRef<FloatingPopup[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPointerDownRef = useRef(false);
  const lastPaintedTileRef = useRef<string | null>(null);

  const [uiStageIdx, setUiStageIdx] = useState(0);
  const [uiRp, setUiRp] = useState(0);
  const [uiTargetRp, setUiTargetRp] = useState(STAGES[0].targetRp);
  const [uiDelivered, setUiDelivered] = useState(0);
  const [uiTool, setUiTool] = useState<BuildingType>("belt");
  const [uiDir, setUiDir] = useState<Direction>(1);
  const [uiSpeed, setUiSpeed] = useState<1 | 2>(1);
  const [uiCleared, setUiCleared] = useState(false);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playPlaceSound = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }, [ensureAudio]);

  const playDeliverChime = useCallback(
    (itemType: ItemType) => {
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq =
        itemType === "science_pack"
          ? 880
          : itemType === "gear" || itemType === "circuit"
            ? 660
            : 523.25;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    },
    [ensureAudio]
  );

  const syncUi = useCallback(() => {
    const st = stateRef.current;
    setUiStageIdx(st.stageIndex);
    setUiRp(st.rp);
    setUiTargetRp(st.targetRp);
    setUiDelivered(st.totalItemsDelivered);
    setUiTool(st.selectedTool);
    setUiDir(st.selectedDir);
    setUiSpeed(st.simSpeed);
    setUiCleared(st.isCleared);
  }, []);

  const loadStage = useCallback(
    (idx: number) => {
      stateRef.current = createFactorioState(idx);
      popupsRef.current = [];
      syncUi();
    },
    [syncUi]
  );

  const handleSelectTool = useCallback(
    (tool: BuildingType) => {
      stateRef.current.selectedTool = tool;
      setUiTool(tool);
    },
    []
  );

  const handleRotate = useCallback(() => {
    const nextDir = rotateSelectedTool(stateRef.current);
    setUiDir(nextDir);
  }, []);

  const handleBlueprint = useCallback(() => {
    applyStageBlueprint(stateRef.current);
    playPlaceSound();
    syncUi();
  }, [playPlaceSound, syncUi]);

  const handleToggleSpeed = useCallback(() => {
    const nextSpeed = stateRef.current.simSpeed === 1 ? 2 : 1;
    stateRef.current.simSpeed = nextSpeed;
    setUiSpeed(nextSpeed);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") handleSelectTool("belt");
      else if (e.key === "2") handleSelectTool("miner");
      else if (e.key === "3") handleSelectTool("smelter");
      else if (e.key === "4") handleSelectTool("assembler");
      else if (e.key === "5" || e.key === "x" || e.key === "X")
        handleSelectTool("empty");
      else if (e.key === "r" || e.key === "R") handleRotate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRotate, handleSelectTool]);

  // Main 60fps simulation & render loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let beltAnimOffset = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = stateRef.current;

      beltAnimOffset = (beltAnimOffset + dt * 28 * st.simSpeed) % 16;

      const prevRp = st.rp;
      const prevCleared = st.isCleared;
      const res = stepFactorio(st, dt);

      if (res.deliveredItems.length > 0) {
        const spec = STAGES[st.stageIndex];
        const labPx = GRID_OFFSET_X + spec.labX * CELL_SIZE + CELL_SIZE / 2;
        const labPy = GRID_OFFSET_Y + spec.labY * CELL_SIZE + 12;
        for (const item of res.deliveredItems) {
          const val = ITEM_RP_VALUES[item] ?? 5;
          popupsRef.current.push({
            x: labPx + (Math.random() - 0.5) * 20,
            y: labPy,
            text: `+${val} RP`,
            color: ITEM_COLORS[item],
            alpha: 1,
          });
          playDeliverChime(item);
        }

        // Report Arcade Pass mission progress on RP gain
        const dateKey = new Date().toISOString().slice(0, 10);
        const pass = loadArcadePassProgress(dateKey);
        const updated = reportMissionProgress(pass, "factorio-mini", st.rp);
        saveArcadePassProgress(updated);
      }

      if (st.rp !== prevRp || st.isCleared !== prevCleared) {
        syncUi();
      }

      // Render canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Industrial factory floor background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw grid cells
        for (let y = 0; y < st.gridH; y++) {
          for (let x = 0; x < st.gridW; x++) {
            const cell = st.cells[y][x];
            const px = GRID_OFFSET_X + x * CELL_SIZE;
            const py = GRID_OFFSET_Y + y * CELL_SIZE;

            // Base steel tile
            ctx.fillStyle = (x + y) % 2 === 0 ? "#1e293b" : "#172033";
            ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            // Resource vein patch
            if (cell.resource !== "none") {
              ctx.fillStyle =
                cell.resource === "iron_ore"
                  ? "rgba(96, 165, 250, 0.28)"
                  : cell.resource === "copper_ore"
                    ? "rgba(251, 146, 60, 0.28)"
                    : "rgba(71, 85, 105, 0.45)";
              ctx.beginPath();
              ctx.roundRect(px + 5, py + 5, CELL_SIZE - 10, CELL_SIZE - 10, 8);
              ctx.fill();

              // Ore crystals
              ctx.fillStyle = ITEM_COLORS[cell.resource];
              for (let c = 0; c < 4; c++) {
                const cx = px + 16 + (c % 2) * 28;
                const cy = py + 16 + Math.floor(c / 2) * 28;
                ctx.beginPath();
                ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Buildings
            const cx = px + CELL_SIZE / 2;
            const cy = py + CELL_SIZE / 2;
            const vec = DIR_VECTORS[cell.dir];

            if (cell.building === "belt") {
              // Conveyor track
              ctx.fillStyle = "#334155";
              ctx.beginPath();
              ctx.roundRect(px + 8, py + 8, CELL_SIZE - 16, CELL_SIZE - 16, 6);
              ctx.fill();

              // Animated directional rollers/chevrons
              ctx.strokeStyle = "#facc15";
              ctx.lineWidth = 2.2;
              for (let step = -1; step <= 1; step++) {
                const shift = ((step * 14 + beltAnimOffset) % 36) - 18;
                const rx = cx + vec.dx * shift;
                const ry = cy + vec.dy * shift;
                ctx.beginPath();
                if (cell.dir === 1 || cell.dir === 3) {
                  const sign = cell.dir === 1 ? 1 : -1;
                  ctx.moveTo(rx - 4 * sign, ry - 7);
                  ctx.lineTo(rx + 4 * sign, ry);
                  ctx.lineTo(rx - 4 * sign, ry + 7);
                } else {
                  const sign = cell.dir === 2 ? 1 : -1;
                  ctx.moveTo(rx - 7, ry - 4 * sign);
                  ctx.lineTo(rx, ry + 4 * sign);
                  ctx.lineTo(rx + 7, ry - 4 * sign);
                }
                ctx.stroke();
              }
            } else if (cell.building === "miner") {
              ctx.fillStyle = "#1d4ed8";
              ctx.beginPath();
              ctx.roundRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12, 8);
              ctx.fill();
              ctx.strokeStyle = "#93c5fd";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Rotating drill head
              const angle = (now / 180) % (Math.PI * 2);
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(angle);
              ctx.fillStyle = "#e2e8f0";
              ctx.fillRect(-10, -3, 20, 6);
              ctx.fillRect(-3, -10, 6, 20);
              ctx.restore();
            } else if (cell.building === "smelter") {
              ctx.fillStyle = "#7c2d12";
              ctx.beginPath();
              ctx.roundRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12, 10);
              ctx.fill();
              ctx.strokeStyle = "#fb923c";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Glowing furnace core
              const glow = 0.7 + 0.3 * Math.sin(now / 150);
              ctx.fillStyle = `rgba(251, 146, 60, ${glow})`;
              ctx.beginPath();
              ctx.arc(cx, cy, 11, 0, Math.PI * 2);
              ctx.fill();
            } else if (cell.building === "assembler") {
              ctx.fillStyle = "#14532d";
              ctx.beginPath();
              ctx.roundRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12, 10);
              ctx.fill();
              ctx.strokeStyle = "#4ade80";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Buffer indicators (Iron & Copper counts inside assembler)
              ctx.fillStyle = "#93c5fd";
              ctx.font = "bold 10px monospace";
              ctx.fillText(`Fe:${cell.bufferIron}`, px + 10, py + 19);
              ctx.fillStyle = "#fdba74";
              ctx.fillText(`Cu:${cell.bufferCopper}`, px + 10, py + 52);
            } else if (cell.building === "lab") {
              const pulse = 0.65 + 0.35 * Math.sin(now / 220);
              ctx.fillStyle = "#312e81";
              ctx.beginPath();
              ctx.roundRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 12);
              ctx.fill();
              ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
              ctx.lineWidth = 3;
              ctx.stroke();

              ctx.fillStyle = "#38bdf8";
              ctx.font = "bold 20px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("🔬", cx, cy + 7);
              ctx.textAlign = "start";
            }

            // Direction output nozzle arrow for Miner, Smelter, Assembler
            if (
              cell.building === "miner" ||
              cell.building === "smelter" ||
              cell.building === "assembler"
            ) {
              const ax = cx + vec.dx * 22;
              const ay = cy + vec.dy * 22;
              ctx.fillStyle = "#facc15";
              ctx.beginPath();
              ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Second pass: Draw moving items on top of buildings
        for (let y = 0; y < st.gridH; y++) {
          for (let x = 0; x < st.gridW; x++) {
            const cell = st.cells[y][x];
            if (!cell.item) continue;

            const vec = DIR_VECTORS[cell.dir];
            const shift = (cell.item.progress - 0.5) * (CELL_SIZE * 0.75);
            const ix =
              GRID_OFFSET_X + x * CELL_SIZE + CELL_SIZE / 2 + vec.dx * shift;
            const iy =
              GRID_OFFSET_Y + y * CELL_SIZE + CELL_SIZE / 2 + vec.dy * shift;

            ctx.fillStyle = ITEM_COLORS[cell.item.type];
            ctx.beginPath();
            if (
              cell.item.type === "iron_plate" ||
              cell.item.type === "copper_plate"
            ) {
              ctx.roundRect(ix - 8, iy - 6, 16, 12, 3);
            } else if (cell.item.type === "science_pack") {
              ctx.arc(ix, iy, 9, 0, Math.PI * 2);
            } else {
              ctx.arc(ix, iy, 7, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }

        // Draw floating +RP popups
        popupsRef.current = popupsRef.current.filter((p) => p.alpha > 0.04);
        for (const p of popupsRef.current) {
          p.y -= dt * 32;
          p.alpha -= dt * 0.9;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playDeliverChime, syncUi]);

  const applyTileAtPointer = useCallback(
    (clientX: number, clientY: number, isDrag: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const cx = (clientX - rect.left) * scaleX;
      const cy = (clientY - rect.top) * scaleY;

      const gx = Math.floor((cx - GRID_OFFSET_X) / CELL_SIZE);
      const gy = Math.floor((cy - GRID_OFFSET_Y) / CELL_SIZE);
      if (
        gx < 0 ||
        gx >= stateRef.current.gridW ||
        gy < 0 ||
        gy >= stateRef.current.gridH
      )
        return;

      const key = `${gx},${gy}`;
      if (isDrag && lastPaintedTileRef.current === key) return;
      lastPaintedTileRef.current = key;

      const ok = placeBuilding(
        stateRef.current,
        gx,
        gy,
        isDrag ? stateRef.current.selectedTool : undefined,
        isDrag ? stateRef.current.selectedDir : undefined
      );
      if (ok) {
        playPlaceSound();
        syncUi();
      }
    },
    [playPlaceSound, syncUi]
  );

  const stageSpec = STAGES[uiStageIdx];
  const progressPct = Math.min(100, Math.round((uiRp / uiTargetRp) * 100));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        {/* Top HUD Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {stageSpec.name[lang]}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {t.deliveredLabel}: {uiDelivered}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stageSpec.description[lang]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBlueprint}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:opacity-90"
            >
              {t.blueprintBtn}
            </button>
            <button
              type="button"
              onClick={handleToggleSpeed}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              {t.speedBtn}: {uiSpeed}x
            </button>
            <button
              type="button"
              onClick={() => loadStage(uiStageIdx)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
            >
              {t.resetBtn}
            </button>
          </div>
        </div>

        {/* Research Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-primary">
              🔬 {t.rpLabel}: {uiRp} / {uiTargetRp} RP ({progressPct}%)
            </span>
            <div className="flex gap-1.5">
              {STAGES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadStage(idx)}
                  className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                    idx === uiStageIdx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-200 w-(--rp-w)"
              style={{ "--rp-w": `${progressPct}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Stage Clear Banner */}
        {uiCleared && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-primary/10 px-4 py-3">
            <span className="text-sm font-bold text-primary">
              {t.stageComplete}
            </span>
            <button
              type="button"
              onClick={() => loadStage((uiStageIdx + 1) % STAGES.length)}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90"
            >
              {t.nextStageBtn}
            </button>
          </div>
        )}

        {/* Main Interactive Factory Grid Canvas */}
        <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-inner">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={(e) => {
              isPointerDownRef.current = true;
              lastPaintedTileRef.current = null;
              applyTileAtPointer(e.clientX, e.clientY, false);
            }}
            onPointerMove={(e) => {
              if (!isPointerDownRef.current) return;
              applyTileAtPointer(e.clientX, e.clientY, true);
            }}
            onPointerUp={() => {
              isPointerDownRef.current = false;
              lastPaintedTileRef.current = null;
            }}
            onPointerLeave={() => {
              isPointerDownRef.current = false;
              lastPaintedTileRef.current = null;
            }}
            className="block h-auto w-full cursor-pointer touch-none select-none"
          />
        </div>

        {/* Construction Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              ["belt", "miner", "smelter", "assembler", "empty"] as BuildingType[]
            ).map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => handleSelectTool(tool)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  uiTool === tool
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                {t.tools[tool]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRotate}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-muted"
          >
            {t.rotateBtn}: {t.dirs[uiDir]}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t.controlsHint}
        </p>
      </div>
  );
}
