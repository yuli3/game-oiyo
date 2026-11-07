import { useCallback, useEffect, useRef, useState } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { useDynamicDifficultyPro, useCardTiltPro } from "../../lib/games/engine-suite-unified";
import { celebrate } from "../../lib/games/celebration";
import { Maximize2, Minimize2, Award, Wrench, X, Shield, Crosshair } from "lucide-react";
import { SWAT_BREACH_SPRITES } from "../../lib/games/sprites";
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
import { INITIAL_SWAT_QUESTS, type SwatQuest } from "../../lib/games/swat-breach-quests";
import { SWAT_COMMS_LOGS } from "../../lib/games/swat-breach-lore";
import {
  SWAT_META_UPGRADE_DEFS,
  loadSwatMetaState,
  purchaseSwatMetaUpgrade,
  saveSwatMetaState,
  type SwatPlayerMetaState,
} from "../../lib/games/swat-breach-meta";
import { nativeHaptics } from "../../lib/haptics/native-bridge";
import { GameStatTile } from "../ui/game/GameStatTile";

const CANVAS_W = 700;
const CANVAS_H = 540;

function TiltSwatButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { transformCss, onPointerMove, onPointerLeave } = useCardTiltPro();
  return (
    <button
      style={{ "--card-tilt": transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transform-(--card-tilt) will-change-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

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

const CELL_SIZE = 62;
const OFFSET_X = 40;
const OFFSET_Y = 22;

export default function SwatBreach({ locale = "ko" }: Props) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal();
  const lang: Locale = (locale in I18N ? locale : "en") as Locale;
  const t = I18N[lang];

  const [metaState, setMetaState] = useState<SwatPlayerMetaState>(() => loadSwatMetaState());
  const [quests, setQuests] = useState<SwatQuest[]>(() => [...INITIAL_SWAT_QUESTS]);
  const [showArmoryModal, setShowArmoryModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);

  const buildMetaModifiers = useCallback((meta: SwatPlayerMetaState) => {
    return {
      kevlarHp: meta.upgrades.kevlarPlating * 20,
      fireCooldownReduction: meta.upgrades.slickBarrel * 0.12,
      reactionBonus: meta.upgrades.reflexSight * 0.15,
      extraFlashbangs: meta.upgrades.flashbangBelt >= 3 ? 2 : meta.upgrades.flashbangBelt >= 1 ? 1 : 0,
      speedMultiplier: meta.upgrades.breacherBoots * 0.1,
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SwatBreachState>(
    createSwatBreachState(0, buildMetaModifiers(loadSwatMetaState()))
  );
  const audioCtxRef = useRef<AudioContext | null>(null);

  const spritesRef = useRef<{
    shield: HTMLImageElement | null;
    c4: HTMLImageElement | null;
    siren: HTMLImageElement | null;
    breachCharge: HTMLImageElement | null;
  }>({ shield: null, c4: null, siren: null, breachCharge: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sh = new Image(); sh.src = SWAT_BREACH_SPRITES.shield;
    const c = new Image(); c.src = SWAT_BREACH_SPRITES.c4;
    const si = new Image(); si.src = SWAT_BREACH_SPRITES.siren;
    const br = new Image(); br.src = SWAT_BREACH_SPRITES.breachCharge;
    spritesRef.current = { shield: sh, c4: c, siren: si, breachCharge: br };
  }, []);

  const [uiMissionIdx, setUiMissionIdx] = useState(0);
  const [uiPhase, setUiPhase] = useState<SwatBreachState["phase"]>("planning");
  const [uiSelectedOp, setUiSelectedOp] = useState<"alpha" | "bravo">("alpha");
  const [uiToolMode, setUiToolMode] = useState<"waypoint" | "flashbang">("waypoint");
  const [uiSuspectsLeft, setUiSuspectsLeft] = useState(3);
  const [uiHostagesRescued, setUiHostagesRescued] = useState(0);
  const [uiHostagesTotal, setUiHostagesTotal] = useState(1);
  const [uiCommsLogId, setUiCommsLogId] = useState<string>("planning_brief");

  const {
    recordHit: recordDdaHit,
    recordKill: recordDdaKill,
    recordDeath: recordDdaDeath,
  } = useDynamicDifficultyPro();

  // Sync tactical tokens from game state
  useEffect(() => {
    const st = stateRef.current;
    if (st.tokensEarned > 0) {
      setMetaState((prev) => {
        const next = { ...prev, tacticalTokens: prev.tacticalTokens + st.tokensEarned };
        saveSwatMetaState(next);
        return next;
      });
      st.tokensEarned = 0;
    }
  }, [uiPhase, uiHostagesRescued, uiSuspectsLeft]);

  // Check quest progress
  useEffect(() => {
    const st = stateRef.current;
    setQuests((prevQuests) =>
      prevQuests.map((q) => {
        if (q.completed) return q;
        const progress = q.check(st);
        const completed = progress >= q.target;
        if (completed && !q.completed) {
          nativeHaptics.trigger("success");
        }
        return {
          ...q,
          current: Math.min(q.target, progress),
          completed,
        };
      })
    );
  }, [uiPhase, uiHostagesRescued, uiSuspectsLeft]);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    if (st.activeCommsLogId) {
      setUiCommsLogId(st.activeCommsLogId);
    }

    if (st.phase === "victory") {
      const dateKey = new Date().toISOString().slice(0, 10);
      const pass = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(pass, "swat-breach", st.missionIndex + 1);
      saveArcadePassProgress(updated);
    }
  }, []);

  const loadMission = useCallback(
    (idx: number) => {
      stateRef.current = createSwatBreachState(idx, buildMetaModifiers(metaState));
      syncUi();
    },
    [buildMetaModifiers, metaState, syncUi]
  );

  const handleSelectOp = useCallback(
    (opId: "alpha" | "bravo") => {
      stateRef.current.selectedOpId = opId;
      nativeHaptics.trigger("light");
      playSoundEffect("click");
      syncUi();
    },
    [playSoundEffect, syncUi]
  );

  const handleSelectTool = useCallback(
    (mode: "waypoint" | "flashbang") => {
      stateRef.current.toolMode = mode;
      nativeHaptics.trigger("light");
      playSoundEffect("click");
      syncUi();
    },
    [playSoundEffect, syncUi]
  );

  const handleExecuteBreach = useCallback(() => {
    startBreachExecution(stateRef.current);
    nativeHaptics.trigger("heavy");
    playSoundEffect("door");
    syncUi();
  }, [playSoundEffect, syncUi]);

  const handleClaimQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.completed && !q.claimed) {
          setMetaState((m) => {
            const next = { ...m, tacticalTokens: m.tacticalTokens + q.rewardTokens };
            saveSwatMetaState(next);
            return next;
          });
          nativeHaptics.trigger("success");
          return { ...q, claimed: true };
        }
        return q;
      })
    );
  };

  const handlePurchaseMeta = (upgradeId: keyof SwatPlayerMetaState["upgrades"]) => {
    setMetaState((prev) => {
      const next = { ...prev };
      const success = purchaseSwatMetaUpgrade(next, upgradeId);
      if (success) {
        nativeHaptics.trigger("success");
        playSoundEffect("click");
        // apply to running game
        stateRef.current.metaModifiers = buildMetaModifiers(next);
      }
      return next;
    });
  };

  // 60fps CQB simulation & tactical blueprint renderer
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = stateRef.current;

      if (st.phase === "executing") {
        const prevPhase = st.phase as string;
        const prevSuspects = st.suspects.filter((s) => !s.neutralized).length;
        const events = stepSwatBreach(st, dt);

        if (events.flashDetonated) {
          playSoundEffect("flash");
          nativeHaptics.trigger("warning");
        } else if (events.doorBreached) {
          playSoundEffect("door");
          nativeHaptics.trigger("heavy");
        } else if (events.shotsFired > 0) {
          playSoundEffect("shot");
          nativeHaptics.trigger("light");
          recordDdaHit();
        }

        const nowSuspects = st.suspects.filter((s) => !s.neutralized).length;
        if (nowSuspects < prevSuspects) {
          recordDdaKill();
        }

        const currentPhase = st.phase as string;
        if (currentPhase === "victory" && prevPhase !== "victory") {
          celebrate(canvasRef.current, { preset: "sparks" });
          nativeHaptics.trigger("success");
        } else if (currentPhase === "failed" && prevPhase !== "failed") {
          recordDdaDeath();
          nativeHaptics.trigger("error");
        }

        syncUi();
      }

      // Render tactical floorplan canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Clear blueprint floor
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid Tiles
          for (let y = 0; y < st.gridH; y++) {
            for (let x = 0; x < st.gridW; x++) {
              const px = OFFSET_X + x * CELL_SIZE;
              const py = OFFSET_Y + y * CELL_SIZE;
              const tile = st.tiles[y][x];

              if (tile === "wall") {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = "#334155";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
              } else if (tile === "door_closed") {
                ctx.fillStyle = "#334155";
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                if (spritesRef.current.breachCharge?.complete) {
                  ctx.drawImage(
                    spritesRef.current.breachCharge,
                    px + CELL_SIZE / 2 - 12,
                    py + CELL_SIZE / 2 - 12,
                    24,
                    24
                  );
                } else {
                  ctx.fillStyle = "#ef4444";
                  ctx.fillRect(px + 4, py + CELL_SIZE / 2 - 6, CELL_SIZE - 8, 12);
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "bold 10px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText("DOOR", px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 4);
                }
              } else if (tile === "door_open") {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = "#22c55e";
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);
              } else if (tile === "cover") {
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                ctx.fillStyle = "#475569";
                ctx.fillRect(px + 10, py + 10, CELL_SIZE - 20, CELL_SIZE - 20);
              } else {
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
              }
            }
          }

          // CodePen Curved Spacetime shockwave distortions
          for (const sw of st.activeShockwaves) {
            ctx.save();
            const sx = OFFSET_X + sw.x * CELL_SIZE + CELL_SIZE / 2;
            const sy = OFFSET_Y + sw.y * CELL_SIZE + CELL_SIZE / 2;
            const rPx = sw.radius * CELL_SIZE;

            const grad = ctx.createRadialGradient(sx, sy, Math.max(0, rPx - 15), sx, sy, rPx + 10);
            grad.addColorStop(0, "rgba(56, 189, 248, 0)");
            grad.addColorStop(0.5, "rgba(251, 191, 36, 0.45)");
            grad.addColorStop(1, "rgba(56, 189, 248, 0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, rPx + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(254, 240, 138, 0.8)";
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
          }

          // Flash bursts
          for (const b of st.activeFlashBursts) {
            ctx.save();
            const bx = OFFSET_X + b.x * CELL_SIZE + CELL_SIZE / 2;
            const by = OFFSET_Y + b.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            ctx.beginPath();
            ctx.arc(bx, by, 3.5 * CELL_SIZE, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Tracers
          for (const tLine of st.tracerLines) {
            ctx.save();
            ctx.strokeStyle = tLine.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(OFFSET_X + tLine.x1 * CELL_SIZE + CELL_SIZE / 2, OFFSET_Y + tLine.y1 * CELL_SIZE + CELL_SIZE / 2);
            ctx.lineTo(OFFSET_X + tLine.x2 * CELL_SIZE + CELL_SIZE / 2, OFFSET_Y + tLine.y2 * CELL_SIZE + CELL_SIZE / 2);
            ctx.stroke();
            ctx.restore();
          }

          // Waypoint lines
          for (const op of st.operators) {
            if (op.waypoints.length > 0) {
              ctx.save();
              ctx.strokeStyle = op.id === "alpha" ? "#38bdf8" : "#a855f7";
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(OFFSET_X + op.x * CELL_SIZE + CELL_SIZE / 2, OFFSET_Y + op.y * CELL_SIZE + CELL_SIZE / 2);
              for (const pt of op.waypoints) {
                ctx.lineTo(OFFSET_X + pt.x * CELL_SIZE + CELL_SIZE / 2, OFFSET_Y + pt.y * CELL_SIZE + CELL_SIZE / 2);
              }
              ctx.stroke();
              ctx.restore();
            }

            // Flashbang target mark
            if (op.flashbangTarget && !op.flashbangThrown) {
              ctx.save();
              const fx = OFFSET_X + op.flashbangTarget.x * CELL_SIZE + CELL_SIZE / 2;
              const fy = OFFSET_Y + op.flashbangTarget.y * CELL_SIZE + CELL_SIZE / 2;
              ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
              ctx.beginPath();
              ctx.arc(fx, fy, CELL_SIZE * 0.45, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#f59e0b";
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.font = "14px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("💥", fx, fy + 5);
              ctx.restore();
            }
          }

          // Hostages
          for (const h of st.hostages) {
            const hx = OFFSET_X + h.x * CELL_SIZE + CELL_SIZE / 2;
            const hy = OFFSET_Y + h.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.save();
            ctx.fillStyle = h.rescued ? "#22c55e" : "#f59e0b";
            ctx.beginPath();
            ctx.arc(hx, hy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(h.rescued ? "🕊️" : "🤝", hx, hy + 5);
            ctx.restore();
          }

          // Suspects
          for (const s of st.suspects) {
            const sx = OFFSET_X + s.x * CELL_SIZE + CELL_SIZE / 2;
            const sy = OFFSET_Y + s.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.save();

            // Sniper laser pointer
            if (s.suspectType === "sniper" && !s.neutralized && s.stunTimer <= 0) {
              ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + Math.cos(s.angle) * CELL_SIZE * 5, sy + Math.sin(s.angle) * CELL_SIZE * 5);
              ctx.stroke();
            }

            ctx.fillStyle = s.neutralized ? "#475569" : s.stunTimer > 0 ? "#eab308" : "#ef4444";
            ctx.beginPath();
            ctx.arc(sx, sy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = s.suspectType === "shielded" ? "#38bdf8" : "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            if (s.neutralized) {
              ctx.fillText("☠️", sx, sy + 5);
            } else if (s.stunTimer > 0) {
              ctx.fillText("💫", sx, sy + 5);
            } else if (s.suspectType === "shielded" && spritesRef.current.shield?.complete) {
              ctx.drawImage(spritesRef.current.shield, sx - 11, sy - 11, 22, 22);
            } else if (s.suspectType === "bomber" && spritesRef.current.c4?.complete) {
              ctx.drawImage(spritesRef.current.c4, sx - 11, sy - 11, 22, 22);
            } else {
              let sIcon = "👺";
              if (s.suspectType === "shielded") sIcon = "🛡️";
              else if (s.suspectType === "bomber") sIcon = "💣";
              else if (s.suspectType === "sniper") sIcon = "🎯";
              ctx.fillText(sIcon, sx, sy + 5);
            }
            ctx.restore();
          }

          // Operators
          for (const op of st.operators) {
            if (op.hp <= 0) continue;
            const ox = OFFSET_X + op.x * CELL_SIZE + CELL_SIZE / 2;
            const oy = OFFSET_Y + op.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.save();
            ctx.fillStyle = op.id === "alpha" ? "#0284c7" : "#9333ea";
            ctx.beginPath();
            ctx.arc(ox, oy, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = op.id === st.selectedOpId ? "#ffffff" : "#cbd5e1";
            ctx.lineWidth = op.id === st.selectedOpId ? 3 : 1.5;
            ctx.stroke();

            ctx.font = "bold 10px monospace";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(op.id === "alpha" ? "A1" : "B2", ox, oy + 4);

            // HP bar
            const hpRatio = Math.max(0, op.hp / op.maxHp);
            ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : "#ef4444";
            ctx.fillRect(ox - 14, oy - 22, 28 * hpRatio, 3.5);
            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ensureAudio, playSoundEffect, recordDdaDeath, recordDdaHit, recordDdaKill, syncUi]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const gx = Math.floor((clickX - OFFSET_X) / CELL_SIZE);
    const gy = Math.floor((clickY - OFFSET_Y) / CELL_SIZE);

    if (addWaypointOrFlash(stateRef.current, gx, gy)) {
      nativeHaptics.trigger("light");
      playSoundEffect("click");
      syncUi();
    }
  };

  const curMission = MISSIONS[uiMissionIdx];
  const curComms = SWAT_COMMS_LOGS.find((c) => c.id === uiCommsLogId) ?? SWAT_COMMS_LOGS[0];

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-4xl mx-auto flex flex-col items-center bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden ${
        isImmersive ? "fixed inset-0 z-50 rounded-none border-none max-w-none justify-center" : "my-4"
      }`}
    >
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold tracking-tight text-primary">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{curMission.title[lang]}</p>
          </div>
        </div>

        {/* Action Modals & Tokens */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuestModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            <span>작전지령 ({quests.filter((q) => q.completed && !q.claimed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowArmoryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-chart-4/20 text-chart-4 border border-chart-4/40 hover:bg-chart-4/30 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>무기고 ({metaState.tacticalTokens} 🎖️)</span>
          </button>

          <button
            type="button"
            onClick={togglePortal}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TOC Radio Comms HUD */}
      <div className="w-full px-4 py-1.5 bg-muted/20 border-b border-border/80 flex items-center gap-2 text-xs">
        <span className="font-bold text-primary whitespace-nowrap">[{curComms.sender.ko}]</span>
        <span className="text-foreground/90 truncate">{curComms.message.ko}</span>
      </div>

      {/* Stats Bar */}
      <div className="w-full grid grid-cols-4 gap-2 px-4 py-2 bg-muted/10 border-b border-border/40 text-center">
        <GameStatTile
          label="작전 상태"
          value={
            uiPhase === "planning"
              ? "설계 중"
              : uiPhase === "executing"
              ? "돌입 교전"
              : uiPhase === "victory"
              ? "확보 완료"
              : "작전 실패"
          }
          icon="📋"
        />
        <GameStatTile label={t.suspectsLabel} value={`${uiSuspectsLeft}명 잔여`} icon="👺" />
        <GameStatTile label={t.hostagesLabel} value={`${uiHostagesRescued} / ${uiHostagesTotal}명`} icon="🕊️" />
        <GameStatTile label="작전 훈장" value={`${metaState.tacticalTokens} 🎖️`} icon="⭐" />
      </div>

      {/* Floorplan Canvas Viewport */}
      <div className="relative w-full aspect-video max-h-120 bg-background flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-crosshair"
        />
      </div>

      {/* Tactical Planning Control Pad */}
      <div className="w-full p-3 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Operator Selection */}
          <TiltSwatButton
            type="button"
            onClick={() => handleSelectOp("alpha")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              uiSelectedOp === "alpha"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            🛡️ ALPHA-1
          </TiltSwatButton>

          <TiltSwatButton
            type="button"
            onClick={() => handleSelectOp("bravo")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              uiSelectedOp === "bravo"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            ⚡ BRAVO-2
          </TiltSwatButton>

          {/* Tool Mode */}
          <button
            type="button"
            onClick={() => handleSelectTool("waypoint")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              uiToolMode === "waypoint"
                ? "bg-muted text-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            📍 경로 지정
          </button>

          <button
            type="button"
            onClick={() => handleSelectTool("flashbang")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              uiToolMode === "flashbang"
                ? "bg-chart-4/20 text-chart-4 border-chart-4"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            💥 섬광탄
          </button>
        </div>

        <div className="flex items-center gap-2">
          {uiPhase === "planning" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  applyAutoTacticalPlan(stateRef.current);
                  syncUi();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-card text-muted-foreground hover:text-foreground border border-border text-xs transition-colors"
              >
                {t.autoPlanBtn}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearOperatorWaypoints(stateRef.current);
                  syncUi();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-card text-muted-foreground hover:text-foreground border border-border text-xs transition-colors"
              >
                {t.clearPathBtn}
              </button>

              <TiltSwatButton
                type="button"
                onClick={handleExecuteBreach}
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-colors"
              >
                {t.goCodeBtn}
              </TiltSwatButton>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => loadMission(uiMissionIdx)}
                className="px-3 py-1.5 rounded-lg bg-card text-foreground border border-border text-xs font-bold hover:bg-muted transition-colors"
              >
                {t.resetBtn}
              </button>

              {uiPhase === "victory" && (
                <button
                  type="button"
                  onClick={() => loadMission((uiMissionIdx + 1) % MISSIONS.length)}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors"
                >
                  {t.nextMissionBtn}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quests Modal */}
      {showQuestModal && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">SWAT 전술 작전 지령</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    q.claimed
                      ? "bg-muted/20 border-border/40 opacity-60"
                      : q.completed
                      ? "bg-primary/10 border-primary/60"
                      : "bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{q.title.ko}</span>
                    <span className="text-xs font-semibold text-chart-4">+{q.rewardTokens} 🎖️</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{q.description.ko}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-muted-foreground">
                      진행도: {q.current} / {q.target}
                    </div>
                    {q.completed && !q.claimed ? (
                      <button
                        type="button"
                        onClick={() => handleClaimQuest(q.id)}
                        className="px-2.5 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors"
                      >
                        보상 수령
                      </button>
                    ) : q.claimed ? (
                      <span className="text-xs text-muted-foreground font-semibold">수령 완료</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">진행 중</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SWAT Armory Modal */}
      {showArmoryModal && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-chart-4" />
                <h3 className="font-bold text-foreground">SWAT 본부 무기고 5대 영구 연구소</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-chart-4">{metaState.tacticalTokens} 🎖️ 작전 훈장</span>
                <button
                  type="button"
                  onClick={() => setShowArmoryModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {SWAT_META_UPGRADE_DEFS.map((def) => {
                const currentLvl = metaState.upgrades[def.id];
                const isMax = currentLvl >= def.maxLevel;
                const cost = isMax ? 0 : def.costPerLevel[currentLvl];
                const canAfford = metaState.tacticalTokens >= cost;

                return (
                  <div
                    key={def.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{def.name.ko}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                            Lv.{currentLvl}/{def.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.desc.ko}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePurchaseMeta(def.id)}
                      disabled={isMax || !canAfford}
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isMax ? "최대 레벨" : `${cost} 🎖️ 연구`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
