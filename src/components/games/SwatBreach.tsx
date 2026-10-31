import { useCallback, useEffect, useRef, useState } from "react";
import { useDynamicDifficultyPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import {
  addWaypointOrFlash,
  applyAutoTacticalPlan,
  clearOperatorWaypoints,
  createSwatBreachState,
  MISSIONS,
  startBreachExecution,
  stepSwatBreach,
  type SwatBreachState,
} from "../../lib/games/swat-breach";

type Locale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

interface Props {
  locale?: string;
}

const I18N: Record<
  Locale,
  {
    title: string;
    phasePlanning: string;
    phaseExecuting: string;
    phaseVictory: string;
    phaseFailed: string;
    goCodeBtn: string;
    autoPlanBtn: string;
    clearPathBtn: string;
    resetBtn: string;
    nextMissionBtn: string;
    waypointTool: string;
    flashbangTool: string;
    suspectsLabel: string;
    hostagesLabel: string;
    victoryBanner: string;
    failedBanner: string;
    controlsHint: string;
  }
> = {
  ko: {
    title: "택티컬 스왓 브리치",
    phasePlanning: "📋 작전 설계 (PLANNING)",
    phaseExecuting: "🚨 돌입 교전 중 (BREACHING)",
    phaseVictory: "✅ 전 구역 확보 완료 (ALL CLEAR)",
    phaseFailed: "⚠️ 작전 실패 (MISSION FAILED)",
    goCodeBtn: "🚨 작전 개시 (GO CODE)",
    autoPlanBtn: "⚡ 표준 전술 경로",
    clearPathBtn: "경로 지우기",
    resetBtn: "재배치",
    nextMissionBtn: "다음 작전 투입 →",
    waypointTool: "📍 이동 경로 설정",
    flashbangTool: "💥 섬광탄 투척 지점",
    suspectsLabel: "무장 용의자",
    hostagesLabel: "인질 구출",
    victoryBanner: "🎖️ 모든 용의자를 제압하고 인질을 안전하게 구출했습니다!",
    failedBanner: "⚠️ 대원이 모두 무력화되었습니다. 전술 경로와 섬광탄 위치를 재점검하세요.",
    controlsHint:
      "설계 단계에서 대원(ALPHA-1 / BRAVO-2)을 선택하고 바닥 타일을 클릭해 진입 경로와 섬광탄(💥) 투척 지점을 지정한 뒤 [🚨 작전 개시]를 누르세요!",
  },
  en: {
    title: "Tactical SWAT Breach",
    phasePlanning: "📋 TACTICAL PLANNING",
    phaseExecuting: "🚨 BREACHING IN PROGRESS",
    phaseVictory: "✅ ROOM CLEAR — HOSTAGES SECURED",
    phaseFailed: "⚠️ MISSION FAILED",
    goCodeBtn: "🚨 EXECUTE BREACH (GO CODE)",
    autoPlanBtn: "⚡ Auto-Plan Route",
    clearPathBtn: "Clear Path",
    resetBtn: "Reset",
    nextMissionBtn: "Next Operation →",
    waypointTool: "📍 Plot Waypoints",
    flashbangTool: "💥 Set Flashbang Target",
    suspectsLabel: "Hostiles",
    hostagesLabel: "Hostages",
    victoryBanner: "🎖️ All hostiles neutralized and hostages safely extracted!",
    failedBanner: "⚠️ Squad neutralized. Adjust your entry paths and flashbang targets.",
    controlsHint:
      "Select ALPHA-1 or BRAVO-2, click floor tiles to plot entry waypoints or Flashbang (💥) targets, then press [🚨 EXECUTE BREACH]!",
  },
  ja: {
    title: "タクティカル SWAT ブリーチ",
    phasePlanning: "📋 戦術プランニング",
    phaseExecuting: "🚨 突入作戦遂行中",
    phaseVictory: "✅ 全エリア制圧完了 (ALL CLEAR)",
    phaseFailed: "⚠️ 作戦失敗",
    goCodeBtn: "🚨 突入開始 (GO CODE)",
    autoPlanBtn: "⚡ 標準戦術ルート",
    clearPathBtn: "経路クリア",
    resetBtn: "リセット",
    nextMissionBtn: "次の作戦へ →",
    waypointTool: "📍 移動経路プロット",
    flashbangTool: "💥 閃光弾ターゲット",
    suspectsLabel: "武装容疑者",
    hostagesLabel: "人質救出",
    victoryBanner: "🎖️ 全容疑者を制圧し、人質を無事に救出しました！",
    failedBanner: "⚠️ 隊員が倒れました。突入経路と閃光弾の位置を見直してください。",
    controlsHint:
      "隊員(ALPHA-1 / BRAVO-2)を選び、タイルをクリックして移動経路や閃光弾(💥)の位置を指定してから[🚨 突入開始]を押しましょう！",
  },
  zh: {
    title: "战术特警：破门突击",
    phasePlanning: "📋 战术路线规划",
    phaseExecuting: "🚨 破门突袭交战中",
    phaseVictory: "✅ 区域肃清完毕 (ALL CLEAR)",
    phaseFailed: "⚠️ 行动失败",
    goCodeBtn: "🚨 行动开始 (GO CODE)",
    autoPlanBtn: "⚡ 标准战术路线",
    clearPathBtn: "清除路线",
    resetBtn: "重新部署",
    nextMissionBtn: "下一项行动 →",
    waypointTool: "📍 规划行进航点",
    flashbangTool: "💥 设定闪光弹落点",
    suspectsLabel: "武装歹徒",
    hostagesLabel: "解救人质",
    victoryBanner: "🎖️ 已制服全部武装分子并安全营救所有人质！",
    failedBanner: "⚠️ 特警小队失利，请重新调整突入路线与闪光弹震慑落点。",
    controlsHint:
      "在规划阶段选择干员（ALPHA-1 / BRAVO-2），点击地面砖块设定突入航点与闪光弹（💥）落点，随后点击 [🚨 行动开始]！",
  },
  fr: {
    title: "Tactical SWAT Breach",
    phasePlanning: "📋 PLANIFICATION TACTIQUE",
    phaseExecuting: "🚨 ASSAUT EN COURS",
    phaseVictory: "✅ ZONE SÉCURISÉE",
    phaseFailed: "⚠️ ÉCHEC DE LA MISSION",
    goCodeBtn: "🚨 LANCER L'ASSAUT (GO CODE)",
    autoPlanBtn: "⚡ Plan Tactique Auto",
    clearPathBtn: "Effacer trajet",
    resetBtn: "Réinitialiser",
    nextMissionBtn: "Opération suivante →",
    waypointTool: "📍 Tracer itinéraire",
    flashbangTool: "💥 Cible Grenade Flash",
    suspectsLabel: "Suspects",
    hostagesLabel: "Otages",
    victoryBanner: "🎖️ Tous les suspects sont neutralisés et les otages sont sains et saufs !",
    failedBanner: "⚠️ Escouade neutralisée. Ajustez vos itinéraires et vos grenades flash.",
    controlsHint:
      "Sélectionnez ALPHA-1 ou BRAVO-2, cliquez sur les cases pour tracer le chemin et la cible flash (💥), puis lancez l'assaut !",
  },
  es: {
    title: "Tactical SWAT Breach",
    phasePlanning: "📋 PLANIFICACIÓN TÁCTICA",
    phaseExecuting: "🚨 IRRUPCIÓN EN CURSO",
    phaseVictory: "✅ ZONA DESPEJADA",
    phaseFailed: "⚠️ MISIÓN FALLIDA",
    goCodeBtn: "🚨 INICIAR IRRUPCIÓN (GO CODE)",
    autoPlanBtn: "⚡ Plan Táctico Auto",
    clearPathBtn: "Borrar ruta",
    resetBtn: "Reiniciar",
    nextMissionBtn: "Siguiente operación →",
    waypointTool: "📍 Trazar ruta",
    flashbangTool: "💥 Objetivo Cegadora",
    suspectsLabel: "Sospechosos",
    hostagesLabel: "Rehenes",
    victoryBanner: "🎖️ ¡Todos los sospechosos neutralizados y rehenes rescatados con éxito!",
    failedBanner: "⚠️ Escuadrón neutralizado. Revisa tus rutas de entrada y granadas cegadoras.",
    controlsHint:
      "Selecciona a ALPHA-1 o BRAVO-2, haz clic en las casillas para trazar la ruta y el punto de cegadora (💥), ¡y pulsa [🚨 INICIAR IRRUPCIÓN]!",
  },
};

const CANVAS_W = 700;
const CANVAS_H = 540;
const CELL_SIZE = 62;
const OFFSET_X = 40;
const OFFSET_Y = 22;

export default function SwatBreach({ locale = "ko" }: Props) {
  const lang: Locale = (locale in I18N ? locale : "en") as Locale;
  const t = I18N[lang];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SwatBreachState>(createSwatBreachState(0));
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [uiMissionIdx, setUiMissionIdx] = useState(0);
  const [uiPhase, setUiPhase] = useState<SwatBreachState["phase"]>("planning");
  const [uiSelectedOp, setUiSelectedOp] = useState<"alpha" | "bravo">("alpha");
  const [uiToolMode, setUiToolMode] = useState<"waypoint" | "flashbang">(
    "waypoint"
  );
  const [uiSuspectsLeft, setUiSuspectsLeft] = useState(3);
  const [uiHostagesRescued, setUiHostagesRescued] = useState(0);
  const [uiHostagesTotal, setUiHostagesTotal] = useState(1);

  const {
    flowState,
    currentMultiplier,
    recordHit: recordDdaHit,
    recordKill: recordDdaKill,
    recordDeath: recordDdaDeath,
  } = useDynamicDifficultyPro();

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

  const playSoundEffect = useCallback(
    (kind: "shot" | "flash" | "door" | "click") => {
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (kind === "shot") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (kind === "flash") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.28);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (kind === "door") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    },
    [ensureAudio]
  );

  const syncUi = useCallback(() => {
    const st = stateRef.current;
    setUiMissionIdx(st.missionIndex);
    setUiPhase(st.phase);
    setUiSelectedOp(st.selectedOpId);
    setUiToolMode(st.toolMode);
    setUiSuspectsLeft(st.suspects.filter((s) => !s.neutralized).length);
    setUiHostagesRescued(st.hostages.filter((h) => h.rescued).length);
    setUiHostagesTotal(st.hostages.length);

    if (st.phase === "victory") {
      const dateKey = new Date().toISOString().slice(0, 10);
      const pass = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(
        pass,
        "swat-breach",
        st.missionIndex + 1
      );
      saveArcadePassProgress(updated);
    }
  }, []);

  const loadMission = useCallback(
    (idx: number) => {
      stateRef.current = createSwatBreachState(idx);
      syncUi();
    },
    [syncUi]
  );

  const handleSelectOp = useCallback(
    (opId: "alpha" | "bravo") => {
      stateRef.current.selectedOpId = opId;
      playSoundEffect("click");
      syncUi();
    },
    [playSoundEffect, syncUi]
  );

  const handleSelectTool = useCallback(
    (mode: "waypoint" | "flashbang") => {
      stateRef.current.toolMode = mode;
      playSoundEffect("click");
      syncUi();
    },
    [playSoundEffect, syncUi]
  );

  const handleExecuteBreach = useCallback(() => {
    startBreachExecution(stateRef.current);
    playSoundEffect("door");
    syncUi();
  }, [playSoundEffect, syncUi]);

  // 60fps CQB simulation & tactical blueprint renderer
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = stateRef.current;

      if (st.phase === "executing") {
        const prevPhase = st.phase;
        const prevSuspects = st.suspects.filter((s) => !s.neutralized).length;
        const events = stepSwatBreach(st, dt);

        if (events.flashDetonated) {
          playSoundEffect("flash");
          MobileHapticsPro.impact();
        } else if (events.doorBreached) {
          playSoundEffect("door");
          MobileHapticsPro.light();
        } else if (events.shotsFired > 0) {
          playSoundEffect("shot");
          MobileHapticsPro.light();
        }

        const nowSuspects = st.suspects.filter((s) => !s.neutralized).length;
        if (nowSuspects < prevSuspects) {
          recordDdaKill();
          MobileHapticsPro.light();
        }

        const currentPhase = st.phase as string;
        if (currentPhase !== prevPhase || nowSuspects !== prevSuspects) {
          if (currentPhase === "victory") {
            MobileHapticsPro.impact();
          } else if (currentPhase === "failed") {
            recordDdaDeath();
            MobileHapticsPro.heavy();
          }
          syncUi();
        }
      }

      // Render blueprint canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Tactical dark navy background
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw floorplan tiles
        for (let y = 0; y < st.gridH; y++) {
          for (let x = 0; x < st.gridW; x++) {
            const tile = st.tiles[y][x];
            const px = OFFSET_X + x * CELL_SIZE;
            const py = OFFSET_Y + y * CELL_SIZE;

            if (tile === "wall") {
              ctx.fillStyle = "#334155";
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
              ctx.strokeStyle = "#64748b";
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            } else {
              // Tactical blueprint grid tile
              ctx.fillStyle = (x + y) % 2 === 0 ? "#0f172a" : "#131c31";
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
              ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
              ctx.lineWidth = 1;
              ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

              if (tile === "door_closed") {
                ctx.fillStyle = "#d97706";
                ctx.fillRect(px + 8, py + 18, CELL_SIZE - 16, CELL_SIZE - 36);
                ctx.strokeStyle = "#fef08a";
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 8, py + 18, CELL_SIZE - 16, CELL_SIZE - 36);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.fillText("DOOR", px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 4);
              } else if (tile === "door_open") {
                ctx.strokeStyle = "#f59e0b";
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12);
                ctx.setLineDash([]);
              } else if (tile === "cover") {
                ctx.fillStyle = "#1e293b";
                ctx.beginPath();
                ctx.roundRect(px + 10, py + 14, CELL_SIZE - 20, CELL_SIZE - 28, 6);
                ctx.fill();
                ctx.strokeStyle = "#475569";
                ctx.stroke();
              }
            }
          }
        }

        // Draw planned waypoint lines & flashbang markers
        for (const op of st.operators) {
          const color = op.id === "alpha" ? "#38bdf8" : "#4ade80";
          if (op.waypoints.length > 0) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.moveTo(
              OFFSET_X + (op.x + 0.5) * CELL_SIZE,
              OFFSET_Y + (op.y + 0.5) * CELL_SIZE
            );
            for (const wp of op.waypoints) {
              ctx.lineTo(
                OFFSET_X + (wp.x + 0.5) * CELL_SIZE,
                OFFSET_Y + (wp.y + 0.5) * CELL_SIZE
              );
            }
            ctx.stroke();
            ctx.restore();

            for (const wp of op.waypoints) {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(
                OFFSET_X + (wp.x + 0.5) * CELL_SIZE,
                OFFSET_Y + (wp.y + 0.5) * CELL_SIZE,
                5,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }

          if (op.flashbangTarget && !op.flashbangThrown) {
            const fx = OFFSET_X + (op.flashbangTarget.x + 0.5) * CELL_SIZE;
            const fy = OFFSET_Y + (op.flashbangTarget.y + 0.5) * CELL_SIZE;
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fx, fy, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("💥", fx, fy + 5);
          }
        }

        // Draw Hostages
        for (const h of st.hostages) {
          const hx = OFFSET_X + (h.x + 0.5) * CELL_SIZE;
          const hy = OFFSET_Y + (h.y + 0.5) * CELL_SIZE;
          ctx.fillStyle = h.rescued ? "#22c55e" : "#facc15";
          ctx.beginPath();
          ctx.arc(hx, hy, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = "#090d16";
          ctx.textAlign = "center";
          ctx.fillText(h.rescued ? "SAFE" : "VIP", hx, hy + 4);
        }

        // Draw Suspects
        for (const sus of st.suspects) {
          const sx = OFFSET_X + (sus.x + 0.5) * CELL_SIZE;
          const sy = OFFSET_Y + (sus.y + 0.5) * CELL_SIZE;
          if (sus.neutralized) {
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 12, 0, Math.PI * 2);
            ctx.stroke();
            continue;
          }

          ctx.fillStyle = sus.stunTimer > 0 ? "#f59e0b" : "#ef4444";
          ctx.beginPath();
          ctx.arc(sx, sy, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          if (sus.stunTimer > 0) {
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("💫", sx, sy - 20);
          }
        }

        // Draw SWAT Operators & FOV Vision Cones
        for (const op of st.operators) {
          if (op.hp <= 0) continue;
          const ox = OFFSET_X + (op.x + 0.5) * CELL_SIZE;
          const oy = OFFSET_Y + (op.y + 0.5) * CELL_SIZE;
          const color = op.id === "alpha" ? "#38bdf8" : "#4ade80";

          // Vision Cone
          ctx.save();
          ctx.fillStyle =
            op.id === "alpha"
              ? "rgba(56, 189, 248, 0.16)"
              : "rgba(74, 222, 128, 0.16)";
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.arc(ox, oy, 130, op.angle - 0.45, op.angle + 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Operator Circle
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(ox, oy, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = "#090d16";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(op.id === "alpha" ? "A1" : "B2", ox, oy + 4);
        }

        // Draw Flashbang shockwaves
        for (const b of st.activeFlashBursts) {
          const bx = OFFSET_X + (b.x + 0.5) * CELL_SIZE;
          const by = OFFSET_Y + (b.y + 0.5) * CELL_SIZE;
          ctx.save();
          ctx.fillStyle = `rgba(254, 240, 138, ${b.timer})`;
          ctx.beginPath();
          ctx.arc(bx, by, (1 - b.timer) * 180 + 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw Bullet Tracers
        for (const tr of st.tracerLines) {
          ctx.strokeStyle = tr.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(
            OFFSET_X + (tr.x1 + 0.5) * CELL_SIZE,
            OFFSET_Y + (tr.y1 + 0.5) * CELL_SIZE
          );
          ctx.lineTo(
            OFFSET_X + (tr.x2 + 0.5) * CELL_SIZE,
            OFFSET_Y + (tr.y2 + 0.5) * CELL_SIZE
          );
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playSoundEffect, syncUi]);

  const handleCanvasClick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = ((clientX - rect.left) / rect.width) * CANVAS_W;
      const cy = ((clientY - rect.top) / rect.height) * CANVAS_H;

      const gx = Math.floor((cx - OFFSET_X) / CELL_SIZE);
      const gy = Math.floor((cy - OFFSET_Y) / CELL_SIZE);

      if (addWaypointOrFlash(stateRef.current, gx, gy)) {
        playSoundEffect("click");
        syncUi();
      }
    },
    [playSoundEffect, syncUi]
  );

  const spec = MISSIONS[uiMissionIdx];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Top Tactical Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
              {spec.title[lang]}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-black ${
                flowState === 'flow'
                  ? 'border-primary/40 bg-primary/20 text-primary'
                  : flowState === 'danger'
                    ? 'border-destructive/40 bg-destructive/20 text-destructive'
                    : 'border-chart-3/40 bg-chart-3/20 text-chart-3'
              }`}
            >
              DDA: {flowState.toUpperCase()}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {uiPhase === "planning"
                ? t.phasePlanning
                : uiPhase === "executing"
                  ? t.phaseExecuting
                  : uiPhase === "victory"
                    ? t.phaseVictory
                    : t.phaseFailed}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {spec.briefing[lang]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {MISSIONS.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => loadMission(idx)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                idx === uiMissionIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Op.{m.missionNum}
            </button>
          ))}
          <button
            type="button"
            onClick={() => loadMission(uiMissionIdx)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {t.resetBtn}
          </button>
        </div>
      </div>

      {/* Status & Go-Code Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <span className="text-destructive">
            🎯 {t.suspectsLabel}: {uiSuspectsLeft}
          </span>
          <span className="text-success">
            🛟 {t.hostagesLabel}: {uiHostagesRescued} / {uiHostagesTotal}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {uiPhase === "planning" && (
            <>
              <button
                type="button"
                onClick={() => {
                  applyAutoTacticalPlan(stateRef.current);
                  playSoundEffect("click");
                  syncUi();
                }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:opacity-90"
              >
                {t.autoPlanBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearOperatorWaypoints(stateRef.current);
                  playSoundEffect("click");
                  syncUi();
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                {t.clearPathBtn}
              </button>
              <button
                type="button"
                onClick={handleExecuteBreach}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90"
              >
                {t.goCodeBtn}
              </button>
            </>
          )}
        </div>
      </div>

      {uiPhase === "victory" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-primary/10 px-4 py-3">
          <span className="text-sm font-bold text-primary">
            {t.victoryBanner}
          </span>
          {uiMissionIdx < MISSIONS.length - 1 && (
            <button
              type="button"
              onClick={() => loadMission(uiMissionIdx + 1)}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90"
            >
              {t.nextMissionBtn}
            </button>
          )}
        </div>
      )}

      {uiPhase === "failed" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-destructive/10 px-4 py-3">
          <span className="text-sm font-bold text-destructive">
            {t.failedBanner}
          </span>
          <button
            type="button"
            onClick={() => loadMission(uiMissionIdx)}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {t.resetBtn}
          </button>
        </div>
      )}

      {/* Main Tactical Blueprint Canvas */}
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-inner">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={(e) => handleCanvasClick(e.clientX, e.clientY)}
          className="block h-auto w-full cursor-pointer touch-none select-none"
        />
      </div>

      {/* Operator & Tool Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectOp("alpha")}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              uiSelectedOp === "alpha"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card text-foreground hover:bg-muted"
            }`}
          >
            🛡️ ALPHA-1 (Shield)
          </button>
          <button
            type="button"
            onClick={() => handleSelectOp("bravo")}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              uiSelectedOp === "bravo"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card text-foreground hover:bg-muted"
            }`}
          >
            ⚡ BRAVO-2 (Assault)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectTool("waypoint")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              uiToolMode === "waypoint"
                ? "bg-secondary text-secondary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.waypointTool}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTool("flashbang")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              uiToolMode === "flashbang"
                ? "bg-secondary text-secondary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.flashbangTool}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t.controlsHint}
      </p>
    </div>
  );
}
