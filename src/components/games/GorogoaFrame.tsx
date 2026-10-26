import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import {
  applyHintStep,
  CHAPTERS,
  createGorogoaState,
  interactSlots,
  togglePanelZoom,
  type GorogoaState,
  type PanelDefinition,
  type PanelState,
  type SlotIndex,
} from "../../lib/games/gorogoa-frame";

type Locale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

interface Props {
  locale?: string;
}

const I18N: Record<
  Locale,
  {
    title: string;
    movesLabel: string;
    zoomInBtn: string;
    zoomOutBtn: string;
    stencilReadyBadge: string;
    stackedBadge: string;
    hintBtn: string;
    resetBtn: string;
    nextChapterBtn: string;
    chapterCleared: string;
    allCleared: string;
    controlsHint: string;
  }
> = {
  ko: {
    title: "고르고아 프레임",
    movesLabel: "조작 횟수",
    zoomInBtn: "🔍+ 확대",
    zoomOutBtn: "🔍- 축소",
    stencilReadyBadge: "✨ 창틀 분리 가능 (다른 액자 클릭 시 결합)",
    stackedBadge: "🧩 레이어 겹침 완료",
    hintBtn: "💡 영감 한 수",
    resetBtn: "초기화",
    nextChapterBtn: "다음 장으로 →",
    chapterCleared: "✨ 프레임의 시공이 하나로 이어졌습니다!",
    allCleared: "🏆 세 개의 모든 장을 완성했습니다! 시간과 공간의 직조자!",
    controlsHint:
      "액자 클릭 후 다른 액자 클릭: 위치 교환 또는 창틀(스텐실) 겹치기 · 우측 상단 [🔍] 버튼: 액자 내부 풍경 확대/축소",
  },
  en: {
    title: "Gorogoa Frame Weaver",
    movesLabel: "Moves",
    zoomInBtn: "🔍+ Zoom In",
    zoomOutBtn: "🔍- Zoom Out",
    stencilReadyBadge: "✨ Stencil Ready (Click target frame to stack)",
    stackedBadge: "🧩 Layer Composited",
    hintBtn: "💡 Hint Step",
    resetBtn: "Reset",
    nextChapterBtn: "Next Chapter →",
    chapterCleared: "✨ The frames have woven into a single continuous path!",
    allCleared: "🏆 All 3 Chapters Complete! Master Weaver of Frames!",
    controlsHint:
      "Click a panel then another: Swap slots or Stack stencil cutout · Top-right [🔍] button: Zoom In/Out inside each panel",
  },
  ja: {
    title: "ゴロゴア フレーム",
    movesLabel: "手数",
    zoomInBtn: "🔍+ 拡大",
    zoomOutBtn: "🔍- 縮小",
    stencilReadyBadge: "✨ 枠レイヤー重ね可能",
    stackedBadge: "🧩 レイヤー合成済",
    hintBtn: "💡 ヒント1手",
    resetBtn: "リセット",
    nextChapterBtn: "次の章へ →",
    chapterCleared: "✨ 4つの絵画フレームがひとつの物語に繋がりました！",
    allCleared: "🏆 全3章コンプリート！時空を紡ぐ絵画の織り手！",
    controlsHint:
      "パネルを順にクリック: 位置入替または枠レイヤー重ね合わせ · 右上の[🔍]ボタン: パネル内の風景を拡大/縮小",
  },
  zh: {
    title: "画中世界 帧界编织",
    movesLabel: "步数",
    zoomInBtn: "🔍+ 放大",
    zoomOutBtn: "🔍- 缩小",
    stencilReadyBadge: "✨ 镂空框可叠加（点击目标画框合并）",
    stackedBadge: "🧩 图层已叠加",
    hintBtn: "💡 灵感提示",
    resetBtn: "重置",
    nextChapterBtn: "下一章 →",
    chapterCleared: "✨ 四格画框的时空已无缝交织为一体！",
    allCleared: "🏆 全部三章通关！跨越画框的时空编织大师！",
    controlsHint:
      "依次点击两个画框：交换位置或叠加镂空图层 · 右上角 [🔍] 按钮：放大或缩小画框内部景物",
  },
  fr: {
    title: "Gorogoa Frame Weaver",
    movesLabel: "Coups",
    zoomInBtn: "🔍+ Zoom +",
    zoomOutBtn: "🔍- Zoom -",
    stencilReadyBadge: "✨ Pochoir prêt (Cliquez sur la cible)",
    stackedBadge: "🧩 Calque superposé",
    hintBtn: "💡 Indice",
    resetBtn: "Réinitialiser",
    nextChapterBtn: "Chapitre suivant →",
    chapterCleared: "✨ Les cadres se sont tissés en un seul chemin continu !",
    allCleared: "🏆 Les 3 chapitres sont terminés ! Maître tisseur de cadres !",
    controlsHint:
      "Cliquez sur deux cadres : Échanger ou Superposer un calque · Bouton [🔍] : Zoomer/Dézoomer dans l'image",
  },
  es: {
    title: "Gorogoa Frame Weaver",
    movesLabel: "Movimientos",
    zoomInBtn: "🔍+ Acercar",
    zoomOutBtn: "🔍- Alejar",
    stencilReadyBadge: "✨ Plantilla lista (Haz clic en el destino)",
    stackedBadge: "🧩 Capa superpuesta",
    hintBtn: "💡 Pista",
    resetBtn: "Reiniciar",
    nextChapterBtn: "Siguiente capítulo →",
    chapterCleared: "✨ ¡Los marcos se han entrelazado en un solo camino!",
    allCleared: "🏆 ¡Los 3 capítulos completados! ¡Maestro tejedor de marcos!",
    controlsHint:
      "Haz clic en dos paneles: Intercambiar posición o Superponer plantilla · Botón [🔍]: Acercar/Alejar vista",
  },
};

function drawSceneCanvas(
  ctx: CanvasRenderingContext2D,
  def: PanelDefinition,
  panel: PanelState,
  w: number,
  h: number,
  now: number,
  isCleared: boolean
) {
  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, def.themeColor);
  grad.addColorStop(1, "#090d16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const zScale = panel.zoom === 1 ? 1.38 : 0.92;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(zScale, zScale);

  const pulse = 0.75 + 0.25 * Math.sin(now / 320);

  switch (def.sceneType) {
    case "seeker_room": {
      // Study room window and seeker silhouette
      ctx.fillStyle = "#334155";
      ctx.fillRect(-90, -80, 180, 160);
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(-55, -55, 110, 95);
      // Window panes
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 4;
      ctx.strokeRect(-55, -55, 110, 95);
      // Seeker character looking right
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(-15, 10, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-25, 24, 20, 32);
      // Path extending to the right edge when zoomed
      if (panel.zoom === 1) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(0, 32, 120, 8);
      }
      break;
    }
    case "crimson_tree": {
      // Lush orchard branch reaching from left edge
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-120, 30, 145, 10);
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(15, -10, 48, 0, Math.PI * 2);
      ctx.fill();
      // Glowing Crimson Fruit
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.beginPath();
      ctx.arc(10, 15, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
    case "stone_arch": {
      if (panel.isStencilDetached) {
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🪨 Stencil Moved", 0, 5);
      } else {
        // Ornate stone archway stencil
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 56, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.strokeRect(-64, -64, 128, 128);
      }
      break;
    }
    case "fountain_courtyard": {
      // Water fountain basin
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.ellipse(0, 28, 58, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(-8, -32, 16, 60);
      if (panel.stackedStencilFromId === "stone_arch") {
        // Draw composited golden stone arch & glowing fruit inside!
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, 14, 15, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "night_telescope": {
      if (panel.isStencilDetached) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔭 Lens Moved", 0, 5);
      } else {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 54, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-54, 0);
        ctx.lineTo(54, 0);
        ctx.moveTo(0, -54);
        ctx.lineTo(0, 54);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      break;
    }
    case "star_sky": {
      // Twinkling stars
      ctx.fillStyle = "#fde047";
      const coords = [
        [-45, -35],
        [38, -28],
        [-30, 40],
        [42, 30],
        [0, 0],
      ];
      for (const [sx, sy] of coords) {
        ctx.beginPath();
        ctx.arc(sx, sy, sx === 0 ? 11 * pulse : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (panel.stackedStencilFromId === "night_telescope") {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.stroke();
        // Golden moth awakened
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "rooftop_left": {
      ctx.fillStyle = "#4c1d95";
      ctx.beginPath();
      ctx.moveTo(-90, 65);
      ctx.lineTo(-20, -10);
      ctx.lineTo(50, 65);
      ctx.fill();
      // Bridge extending right
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-15, 18, 135, 9);
      break;
    }
    case "lighthouse_right": {
      // Bridge arriving from left
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-120, 18, 125, 9);
      // Lighthouse tower
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(-18, -52, 36, 110);
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, -56, 18 * pulse, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "tower_top": {
      // Spiral staircase descending to bottom edge
      ctx.fillStyle = "#c084fc";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(-26 + i * 4, -40 + i * 24, 52, 10);
      }
      break;
    }
    case "tower_base": {
      // Staircase arriving from top edge
      ctx.fillStyle = "#c084fc";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(-16 - i * 3, -110 + i * 24, 52, 10);
      }
      ctx.fillStyle = "#818cf8";
      ctx.fillRect(-50, 28, 100, 18);
      break;
    }
    case "sun_dial": {
      if (panel.isStencilDetached) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("☀️ Ring Moved", 0, 5);
      } else {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "sanctuary_bell": {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(0, -5, 28, Math.PI, 0);
      ctx.lineTo(34, 30);
      ctx.lineTo(-34, 30);
      ctx.closePath();
      ctx.fill();
      if (panel.stackedStencilFromId === "sun_dial") {
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 4, 58, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();

  if (isCleared) {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  }
}

export default function GorogoaFrame({ locale = "ko" }: Props) {
  const lang: Locale = (locale in I18N ? locale : "en") as Locale;
  const t = I18N[lang];

  const stateRef = useRef<GorogoaState>(createGorogoaState(0));
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [uiChapterIdx, setUiChapterIdx] = useState(0);
  const [uiPanels, setUiPanels] = useState<PanelState[]>(
    () => createGorogoaState(0).panels
  );
  const [uiSelectedSlot, setUiSelectedSlot] = useState<SlotIndex | null>(null);
  const [uiMoves, setUiMoves] = useState(0);
  const [uiCleared, setUiCleared] = useState(false);
  const [uiAllCleared, setUiAllCleared] = useState(false);
  const [showHintBanner, setShowHintBanner] = useState(false);

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

  const playHarmonicTone = useCallback(
    (freq: number, dur = 0.22) => {
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + dur);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    },
    [ensureAudio]
  );

  const syncUi = useCallback(() => {
    const st = stateRef.current;
    setUiChapterIdx(st.chapterIndex);
    setUiPanels(st.panels.map((p) => ({ ...p })));
    setUiSelectedSlot(st.selectedSlot);
    setUiMoves(st.moves);
    setUiCleared(st.isChapterCleared);
    setUiAllCleared(st.isAllCleared);

    if (st.isChapterCleared) {
      playHarmonicTone(523.25, 0.45);
      const dateKey = new Date().toISOString().slice(0, 10);
      const pass = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(
        pass,
        "gorogoa-frame",
        st.chapterIndex + 1
      );
      saveArcadePassProgress(updated);
    }
  }, [playHarmonicTone]);

  const loadChapter = useCallback(
    (idx: number) => {
      stateRef.current = createGorogoaState(idx);
      setShowHintBanner(false);
      syncUi();
    },
    [syncUi]
  );

  const handleSlotClick = useCallback(
    (slot: SlotIndex) => {
      const st = stateRef.current;
      if (st.isChapterCleared) return;

      if (st.selectedSlot === null) {
        st.selectedSlot = slot;
        playHarmonicTone(330, 0.1);
        syncUi();
      } else if (st.selectedSlot === slot) {
        st.selectedSlot = null;
        syncUi();
      } else {
        const res = interactSlots(st, st.selectedSlot, slot);
        if (res.action === "stacked") {
          playHarmonicTone(659.25, 0.28);
        } else {
          playHarmonicTone(440, 0.14);
        }
        syncUi();
      }
    },
    [playHarmonicTone, syncUi]
  );

  const handleZoomClick = useCallback(
    (panelId: string) => {
      const ok = togglePanelZoom(stateRef.current, panelId);
      if (ok) {
        playHarmonicTone(392, 0.16);
        syncUi();
      }
    },
    [playHarmonicTone, syncUi]
  );

  const handleHint = useCallback(() => {
    setShowHintBanner(true);
    applyHintStep(stateRef.current);
    playHarmonicTone(587.33, 0.2);
    syncUi();
  }, [playHarmonicTone, syncUi]);

  // Render loop for the 4 panel canvases
  useEffect(() => {
    let rafId = 0;
    const render = (now: number) => {
      const st = stateRef.current;
      const spec = CHAPTERS[st.chapterIndex];
      for (const p of st.panels) {
        const canvas = canvasRefs.current[p.id];
        const def = spec.panels.find((d) => d.id === p.id);
        if (canvas && def) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawSceneCanvas(
              ctx,
              def,
              p,
              canvas.width,
              canvas.height,
              now,
              st.isChapterCleared
            );
          }
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const spec = CHAPTERS[uiChapterIdx];
  const slotsOrder: SlotIndex[] = [0, 1, 2, 3];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
              {spec.title[lang]}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {t.movesLabel}: {uiMoves}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {spec.objective[lang]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CHAPTERS.map((ch, idx) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => loadChapter(idx)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                idx === uiChapterIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Ch.{ch.chapterNum}
            </button>
          ))}
          <button
            type="button"
            onClick={handleHint}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:opacity-90"
          >
            {t.hintBtn}
          </button>
          <button
            type="button"
            onClick={() => loadChapter(uiChapterIdx)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {t.resetBtn}
          </button>
        </div>
      </div>

      {showHintBanner && (
        <div className="rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs text-foreground">
          {spec.hintText[lang]}
        </div>
      )}

      {uiCleared && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-primary/10 px-4 py-3">
          <span className="text-sm font-bold text-primary">
            {uiAllCleared ? t.allCleared : t.chapterCleared}
          </span>
          {uiChapterIdx < CHAPTERS.length - 1 && (
            <button
              type="button"
              onClick={() => loadChapter(uiChapterIdx + 1)}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90"
            >
              {t.nextChapterBtn}
            </button>
          )}
        </div>
      )}

      {/* 2x2 Illustrated Comic Frame Grid */}
      <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 rounded-2xl border-2 border-border bg-background p-3 shadow-inner">
        {slotsOrder.map((slotIdx) => {
          const panel = uiPanels.find((p) => p.slot === slotIdx);
          if (!panel) return null;
          const def = spec.panels.find((d) => d.id === panel.id);
          if (!def) return null;

          const isSelected = uiSelectedSlot === slotIdx;
          const isStencilReady =
            def.hasStencilAtZoom !== undefined &&
            panel.zoom === def.hasStencilAtZoom &&
            !panel.isStencilDetached;

          return (
            <div
              key={panel.id}
              onClick={() => handleSlotClick(slotIdx)}
              className={`group relative flex flex-col overflow-hidden rounded-xl border-2 transition cursor-pointer select-none ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/60"
              }`}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[panel.id] = el;
                }}
                width={260}
                height={220}
                className="block h-auto w-full"
              />

              {/* Top Overlay Bar inside Frame */}
              <div className="flex items-center justify-between bg-card/90 px-2.5 py-1.5 backdrop-blur-xs">
                <span className="truncate text-xs font-bold text-foreground">
                  {def.title[lang]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomClick(panel.id);
                  }}
                  className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                >
                  {panel.zoom === 0 ? t.zoomInBtn : t.zoomOutBtn}
                </button>
              </div>

              {/* Stencil / Stack Status Pill */}
              {isStencilReady && (
                <div className="bg-secondary px-2 py-1 text-center text-xs font-bold text-secondary-foreground">
                  {t.stencilReadyBadge}
                </div>
              )}
              {panel.stackedStencilFromId && (
                <div className="bg-primary/20 px-2 py-1 text-center text-xs font-bold text-primary">
                  {t.stackedBadge}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t.controlsHint}
      </p>
    </div>
  );
}
