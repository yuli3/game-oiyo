import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import {
  createStickerCozyState,
  ROOM_THEMES,
  triggerTweezersHint,
  tryPlaceStickerAt,
  type StickerCozyState,
  type StickerSpec,
} from "../../lib/games/sticker-cozy";

type Locale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

interface Props {
  locale?: string;
}

const I18N: Record<
  Locale,
  {
    title: string;
    placedLabel: string;
    scoreLabel: string;
    hintBtn: string;
    resetBtn: string;
    nextRoomBtn: string;
    trayTitle: string;
    roomComplete: string;
    allComplete: string;
    controlsHint: string;
  }
> = {
  ko: {
    title: "스티커북 코지 룸",
    placedLabel: "부착 완료",
    scoreLabel: "코지 점수",
    hintBtn: "🥢 핀셋 위치 찾기",
    resetBtn: "초기화",
    nextRoomBtn: "다음 코지 룸으로 →",
    trayTitle: "📒 스티커 바인더 (스티커 선택 후 방 안의 점선 실루엣을 클릭하거나 드래그하세요)",
    roomComplete: "🎉 아늑한 디오라마 방 꾸미기가 완성되었습니다!",
    allComplete: "🏆 3개의 모든 코지 룸 스티커북을 완성했습니다!",
    controlsHint:
      "하단 바인더에서 스티커 선택 후 방 안의 번호 점선 위치에 클릭/드래그하여 부착하세요 · [🥢 핀셋 위치 찾기]로 남은 위치를 하이라이트할 수 있습니다.",
  },
  en: {
    title: "Sticker Book Cozy Room",
    placedLabel: "Placed",
    scoreLabel: "Cozy Score",
    hintBtn: "🥢 Tweezers Hint",
    resetBtn: "Reset",
    nextRoomBtn: "Next Cozy Room →",
    trayTitle: "📒 Sticker Binder (Select a sticker, then click or drag onto its dashed silhouette in the room)",
    roomComplete: "🎉 Cozy Diorama Room Complete! Every sticker is in place!",
    allComplete: "🏆 All 3 Cozy Sticker Rooms Completed!",
    controlsHint:
      "Select a sticker from the binder below, then click or drag it onto the matching numbered silhouette in the isometric room.",
  },
  ja: {
    title: "ステッカーブック コージールーム",
    placedLabel: "配置済",
    scoreLabel: "スコア",
    hintBtn: "🥢 ピンセットヒント",
    resetBtn: "リセット",
    nextRoomBtn: "次のルームへ →",
    trayTitle: "📒 ステッカーバインダー（シールを選んで部屋の点線シルエットをクリック/ドラッグ）",
    roomComplete: "🎉 温かいジオラマルームが完成しました！",
    allComplete: "🏆 全3室のステッカーブックをコンプリートしました！",
    controlsHint:
      "下のバインダーからシールを選び、部屋の中の同じ番号のシルエットをクリックまたはドラッグして貼り付けましょう。",
  },
  zh: {
    title: "贴纸书：温馨小屋",
    placedLabel: "已贴好",
    scoreLabel: "治愈得分",
    hintBtn: "🥢 镊子定位提示",
    resetBtn: "重置",
    nextRoomBtn: "前往下一房间 →",
    trayTitle: "📒 贴纸收集册（选择下方贴纸后，点击或拖拽至房间内对应编号的虚线轮廓处）",
    roomComplete: "🎉 温馨立体微缩房间装饰完成！",
    allComplete: "🏆 全部 3 间治愈贴纸小屋圆满完工！",
    controlsHint:
      "从下方贴纸册选择贴纸，点击或拖拽到房间内对应编号的虚线位置即可磁吸贴合 · 点击 [🥢 镊子定位提示] 可高亮显示目标位置。",
  },
  fr: {
    title: "Sticker Book Cozy Room",
    placedLabel: "Collés",
    scoreLabel: "Score Cosy",
    hintBtn: "🥢 Indice Pince",
    resetBtn: "Réinitialiser",
    nextRoomBtn: "Pièce suivante →",
    trayTitle: "📒 Cahier d'autocollants (Choisissez un sticker puis cliquez sur sa silhouette numérotée)",
    roomComplete: "🎉 La pièce diorama cosy est terminée !",
    allComplete: "🏆 Les 3 pièces du cahier d'autocollants sont complètes !",
    controlsHint:
      "Sélectionnez un autocollant ci-dessous, puis cliquez ou glissez-le sur la silhouette correspondante dans la pièce.",
  },
  es: {
    title: "Sticker Book Cozy Room",
    placedLabel: "Colocados",
    scoreLabel: "Puntos",
    hintBtn: "🥢 Pista Pinzas",
    resetBtn: "Reiniciar",
    nextRoomBtn: "Siguiente sala →",
    trayTitle: "📒 Álbum de pegatinas (Elige una pegatina y haz clic o arrástrala a su silueta numerada)",
    roomComplete: "🎉 ¡Habitación diorama acogedora completada!",
    allComplete: "🏆 ¡Las 3 salas del álbum de pegatinas completadas!",
    controlsHint:
      "Selecciona una pegatina del álbum inferior y haz clic o arrástrala hasta su silueta numerada en la sala isométrica.",
  },
};

const CANVAS_W = 700;
const CANVAS_H = 440;

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

export default function StickerCozy({ locale = "ko" }: Props) {
  const lang: Locale = (locale in I18N ? locale : "en") as Locale;
  const t = I18N[lang];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<StickerCozyState>(createStickerCozyState(0));
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const sparklesRef = useRef<SparkleParticle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [uiRoomIdx, setUiRoomIdx] = useState(0);
  const [uiSelectedId, setUiSelectedId] = useState<string | null>(
    () => createStickerCozyState(0).selectedStickerId
  );
  const [uiPlacedIds, setUiPlacedIds] = useState<string[]>([]);
  const [uiScore, setUiScore] = useState(0);
  const [uiComplete, setUiComplete] = useState(false);
  const [uiAllComplete, setUiAllComplete] = useState(false);

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

  const playPeelSound = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }, [ensureAudio]);

  const playSnapPopSound = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }, [ensureAudio]);

  const syncUi = useCallback(() => {
    const st = stateRef.current;
    setUiRoomIdx(st.roomIndex);
    setUiSelectedId(st.selectedStickerId);
    setUiPlacedIds(st.stickers.filter((s) => s.placed).map((s) => s.id));
    setUiScore(st.score);
    setUiComplete(st.isRoomComplete);
    setUiAllComplete(st.isAllComplete);

    if (st.placedCount > 0) {
      const dateKey = new Date().toISOString().slice(0, 10);
      const pass = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(
        pass,
        "sticker-cozy",
        st.placedCount
      );
      saveArcadePassProgress(updated);
    }
  }, []);

  const loadRoom = useCallback(
    (idx: number) => {
      stateRef.current = createStickerCozyState(idx);
      sparklesRef.current = [];
      syncUi();
    },
    [syncUi]
  );

  const handleSelectSticker = useCallback(
    (id: string) => {
      stateRef.current.selectedStickerId = id;
      playPeelSound();
      syncUi();
    },
    [playPeelSound, syncUi]
  );

  const handleHint = useCallback(() => {
    triggerTweezersHint(stateRef.current);
    playPeelSound();
    syncUi();
  }, [playPeelSound, syncUi]);

  const spawnSparkles = useCallback((spec: StickerSpec) => {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const speed = 40 + Math.random() * 55;
      sparklesRef.current.push({
        x: spec.targetX,
        y: spec.targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: i % 2 === 0 ? "#facc15" : spec.color,
      });
    }
  }, []);

  const handleCanvasClickOrDrop = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const st = stateRef.current;
      if (!canvas || !st.selectedStickerId) return;

      const rect = canvas.getBoundingClientRect();
      const cx = ((clientX - rect.left) / rect.width) * CANVAS_W;
      const cy = ((clientY - rect.top) / rect.height) * CANVAS_H;

      const res = tryPlaceStickerAt(
        st,
        st.selectedStickerId,
        cx,
        cy,
        performance.now()
      );
      if (res.snapped && res.spec) {
        playSnapPopSound();
        spawnSparkles(res.spec);
        syncUi();
      }
    },
    [playSnapPopSound, spawnSparkles, syncUi]
  );

  // Main 60fps isometric room & die-cut sticker renderer
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const st = stateRef.current;
      const theme = ROOM_THEMES[st.roomIndex];

      if (canvas && ctx && theme) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Soft ambient backdrop
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Isometric Room Cutaway Geometry
        // Center corner at (350, 70), back bottom corner at (350, 270)
        // Left corner at (130, 180) -> (130, 340)
        // Right corner at (570, 180) -> (570, 340)
        // Front floor point at (350, 425)

        // Left Wall
        ctx.fillStyle = theme.wallLeftColor;
        ctx.beginPath();
        ctx.moveTo(350, 65);
        ctx.lineTo(130, 165);
        ctx.lineTo(130, 325);
        ctx.lineTo(350, 255);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Right Wall
        ctx.fillStyle = theme.wallRightColor;
        ctx.beginPath();
        ctx.moveTo(350, 65);
        ctx.lineTo(570, 165);
        ctx.lineTo(570, 325);
        ctx.lineTo(350, 255);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Isometric Floor
        ctx.fillStyle = theme.floorColor;
        ctx.beginPath();
        ctx.moveTo(350, 255);
        ctx.lineTo(570, 325);
        ctx.lineTo(350, 420);
        ctx.lineTo(130, 325);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw unplaced silhouettes first
        for (const spec of theme.stickers) {
          const inst = st.stickers.find((s) => s.id === spec.id);
          if (inst?.placed) continue;

          const isHighlighted = st.highlightedStickerId === spec.id;
          const isSelected = st.selectedStickerId === spec.id;
          const pulse = 0.6 + 0.4 * Math.sin(now / 200);

          ctx.save();
          ctx.translate(spec.targetX, spec.targetY);

          ctx.fillStyle = isHighlighted
            ? `rgba(250, 204, 21, ${0.38 * pulse})`
            : isSelected
              ? "rgba(255, 255, 255, 0.45)"
              : "rgba(15, 23, 42, 0.22)";
          ctx.strokeStyle = isHighlighted
            ? "#facc15"
            : isSelected
              ? "#0ea5e9"
              : "rgba(71, 85, 105, 0.65)";
          ctx.lineWidth = isHighlighted || isSelected ? 2.8 : 1.8;
          ctx.setLineDash([5, 4]);

          ctx.beginPath();
          ctx.roundRect(
            -spec.width / 2,
            -spec.height / 2,
            spec.width,
            spec.height,
            14
          );
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Number badge inside silhouette
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`#${spec.number}`, 0, 5);
          ctx.restore();
        }

        // Draw placed stickers sorted by zLayer
        const placedSpecs = theme.stickers
          .filter((spec) => st.stickers.find((s) => s.id === spec.id)?.placed)
          .sort((a, b) => a.zLayer - b.zLayer);

        for (const spec of placedSpecs) {
          const inst = st.stickers.find((s) => s.id === spec.id)!;
          const elapsed = Math.max(0, (now - inst.placedAtTime) / 1000);
          const bounce =
            elapsed < 0.35
              ? 1 + Math.sin((elapsed / 0.35) * Math.PI) * 0.22
              : 1;

          ctx.save();
          ctx.translate(spec.targetX, spec.targetY);
          ctx.scale(bounce, bounce);

          // Die-cut white sticker border + soft drop shadow
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(
            -spec.width / 2 - 4,
            -spec.height / 2 - 4,
            spec.width + 8,
            spec.height + 8,
            16
          );
          ctx.fill();

          // Colored sticker body
          ctx.fillStyle = spec.color;
          ctx.beginPath();
          ctx.roundRect(
            -spec.width / 2,
            -spec.height / 2,
            spec.width,
            spec.height,
            12
          );
          ctx.fill();

          // Sticker illustration emoji & label
          ctx.font = "28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(spec.emoji, 0, 6);
          ctx.restore();
        }

        // Draw floating sticker under pointer with tweezers when hovering canvas
        if (pointerPosRef.current && st.selectedStickerId && !st.isRoomComplete) {
          const selSpec = theme.stickers.find(
            (s) => s.id === st.selectedStickerId
          );
          if (selSpec) {
            const { x, y } = pointerPosRef.current;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-0.08);
            ctx.globalAlpha = 0.88;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(-32, -32, 64, 64, 14);
            ctx.fill();
            ctx.strokeStyle = selSpec.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.font = "26px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(selSpec.emoji, 0, 8);
            ctx.restore();
          }
        }

        // Update & draw sparkle particles
        sparklesRef.current = sparklesRef.current.filter((p) => p.alpha > 0.04);
        for (const p of sparklesRef.current) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha -= dt * 1.8;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const theme = ROOM_THEMES[uiRoomIdx];
  const progressPct = Math.round(
    (uiPlacedIds.length / theme.stickers.length) * 100
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
              {theme.title[lang]}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {t.placedLabel}: {uiPlacedIds.length} / {theme.stickers.length} ·{" "}
              {t.scoreLabel}: {uiScore}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {theme.subtitle[lang]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ROOM_THEMES.map((rm, idx) => (
            <button
              key={rm.id}
              type="button"
              onClick={() => loadRoom(idx)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                idx === uiRoomIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              #{rm.roomNumber}
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
            onClick={() => loadRoom(uiRoomIdx)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {t.resetBtn}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-200 w-(--cozy-w)"
          style={{ "--cozy-w": `${progressPct}%` } as React.CSSProperties}
        />
      </div>

      {uiComplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-primary/10 px-4 py-3">
          <span className="text-sm font-bold text-primary">
            {uiAllComplete ? t.allComplete : t.roomComplete}
          </span>
          {uiRoomIdx < ROOM_THEMES.length - 1 && (
            <button
              type="button"
              onClick={() => loadRoom(uiRoomIdx + 1)}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90"
            >
              {t.nextRoomBtn}
            </button>
          )}
        </div>
      )}

      {/* Isometric Cozy Room Canvas */}
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-inner">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            pointerPosRef.current = {
              x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
              y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
            };
          }}
          onPointerLeave={() => {
            pointerPosRef.current = null;
          }}
          onPointerDown={(e) => {
            handleCanvasClickOrDrop(e.clientX, e.clientY);
          }}
          className="block h-auto w-full cursor-pointer touch-none select-none"
        />
      </div>

      {/* Sticker Binder Tray */}
      <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
        <span className="text-xs font-bold text-foreground">{t.trayTitle}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {theme.stickers.map((spec) => {
            const isPlaced = uiPlacedIds.includes(spec.id);
            const isSelected = uiSelectedId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                disabled={isPlaced}
                onClick={() => handleSelectSticker(spec.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                  isPlaced
                    ? "border-border bg-muted/40 text-muted-foreground opacity-45 line-through"
                    : isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                <span className="text-lg">{spec.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs opacity-75">#{spec.number}</div>
                  <div className="truncate">{spec.name[lang]}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t.controlsHint}
      </p>
    </div>
  );
}
