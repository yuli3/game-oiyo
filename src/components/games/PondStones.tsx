import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import {
  DUO_LEVEL, FIELD_H, FIELD_W, HOG_Y, HOUSE, LEVELS, POND_SLUG, STAGE_COUNT, START, STONE_R, canThrow, duoWinner, newPond, scoreFor, setSweep, starsFor, stepPond,
  stonesLeft, straightStop, throwStone, type Mode, type Pond, type Spin,
} from "../../lib/games/pond-stones";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; left: string; score: string; solo: string; duo: string; start: string; spin: string; sweep: string; win: string; lose: string; again: string; next: string;
  p1: string; p2: string; turn: string; duoWin: string; blank: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
  snow: string; rock: string; guard: string; mode: string;
}> = {
  ko: {
    stage: "{0}단계", left: "남은 돌 {0}", score: "점수 {0}/{1}", solo: "혼자", duo: "둘이 한 폰으로", start: "아래쪽을 누른 채 뒤로 당겼다 놓아요", spin: "돌을 톡 치면 회전이 바뀌어요",
    sweep: "문질러!", win: "돌이 과녁에 자리 잡았어요!", lose: "돌을 다 썼어요", again: "다시 하기", next: "다음 단계", p1: "노랑", p2: "파랑", turn: "{0} 차례",
    duoWin: "{0} 승리! {1}점", blank: "아무도 점수를 못 냈어요", snow: "눈 더미", rock: "얼어붙은 바위", guard: "막는 돌", mode: "놀이 방식",
    help: "화면 아래쪽을 누른 채 손가락을 뒤로 당겼다 놓으면 돌이 미끄러져 나가요. 던지기 전에 돌을 톡 치면 왼쪽·오른쪽으로 휘는 회전이 걸려요. 돌이 미끄러지는 동안 돌 앞의 얼음을 손가락으로 빠르게 문지르면 더 멀리, 덜 휘어 가요. 빨간 돌보다 가운데에 더 가까운 내 돌만 점수가 돼요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", left: "{0} stones left", score: "Score {0}/{1}", solo: "Solo", duo: "Two on one phone", start: "Press low, pull back, let go", spin: "Tap the stone to change its spin",
    sweep: "Rub!", win: "Your stones hold the rings!", lose: "Out of stones", again: "Play again", next: "Next stage", p1: "Yellow", p2: "Blue", turn: "{0} to throw",
    duoWin: "{0} wins! {1} pts", blank: "Nobody scored", snow: "Snow patch", rock: "Frozen rock", guard: "Guard stone", mode: "Play mode",
    help: "Press near the bottom, pull your finger back and let go to slide the stone. Tap the stone before throwing to give it a spin that curls left or right. While it slides, rub the ice just ahead of it quickly: it goes further and curls less. Only your stones closer to the centre than every red stone score.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}面", left: "残り {0}個", score: "得点 {0}/{1}", solo: "ひとり", duo: "ふたりで1台", start: "下を押して引いて離そう", spin: "石をタップで回転を変える",
    sweep: "こすれ！", win: "石が的に収まった！", lose: "石がなくなった", again: "もう一度", next: "次の面", p1: "黄", p2: "青", turn: "{0}の番",
    duoWin: "{0}の勝ち！ {1}点", blank: "どちらも得点なし", snow: "雪だまり", rock: "凍った岩", guard: "じゃまな石", mode: "遊び方",
    help: "画面の下を押したまま指を後ろへ引いて離すと、石が滑り出します。投げる前に石をタップすると左右に曲がる回転がかかります。滑っている間、石の前の氷を指で素早くこすると、遠くまで、あまり曲がらずに進みます。赤い石より中心に近い自分の石だけが得点です。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}关", left: "剩余{0}块", score: "得分 {0}/{1}", solo: "单人", duo: "双人一部手机", start: "按住下方往后拉再松手", spin: "轻点石头切换旋转",
    sweep: "快擦！", win: "石头停在靶心附近了！", lose: "石头用完了", again: "再玩一次", next: "下一关", p1: "黄方", p2: "蓝方", turn: "轮到{0}",
    duoWin: "{0}获胜！{1}分", blank: "双方都没得分", snow: "积雪", rock: "冻住的石块", guard: "挡路的石头", mode: "玩法",
    help: "按住屏幕下方，把手指往后拉再松开，石头就会滑出去。投出前轻点石头，可以加上向左或向右弯的旋转。石头滑行时，用手指快速摩擦它前方的冰面，它会滑得更远、弯得更少。只有比所有红石更靠近中心的己方石头才得分。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", left: "{0} pierres", score: "Points {0}/{1}", solo: "Solo", duo: "À deux sur un téléphone", start: "Appuyez en bas, tirez, lâchez", spin: "Touchez la pierre pour changer l'effet",
    sweep: "Frottez !", win: "Vos pierres tiennent la cible !", lose: "Plus de pierres", again: "Rejouer", next: "Niveau suivant", p1: "Jaune", p2: "Bleu", turn: "Au tour de {0}",
    duoWin: "{0} gagne ! {1} pts", blank: "Personne n'a marqué", snow: "Tas de neige", rock: "Rocher gelé", guard: "Pierre de garde", mode: "Mode de jeu",
    help: "Appuyez près du bas, tirez le doigt en arrière et lâchez pour lancer la pierre. Touchez-la avant pour lui donner un effet qui la fait tourner à gauche ou à droite. Pendant qu'elle glisse, frottez vite la glace juste devant : elle va plus loin et tourne moins. Seules vos pierres plus proches du centre que toute pierre rouge comptent.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", left: "Quedan {0}", score: "Puntos {0}/{1}", solo: "Solo", duo: "Dos en un móvil", start: "Pulsa abajo, tira hacia atrás y suelta", spin: "Toca la piedra para cambiar el giro",
    sweep: "¡Frota!", win: "¡Tus piedras dominan la diana!", lose: "Sin piedras", again: "Otra vez", next: "Siguiente nivel", p1: "Amarillo", p2: "Azul", turn: "Turno de {0}",
    duoWin: "¡Gana {0}! {1} pts", blank: "Nadie puntuó", snow: "Montón de nieve", rock: "Roca helada", guard: "Piedra guardia", mode: "Modo de juego",
    help: "Pulsa cerca de abajo, tira del dedo hacia atrás y suelta para lanzar la piedra. Tócala antes de lanzar para darle un giro que la curva a izquierda o derecha. Mientras se desliza, frota rápido el hielo justo delante: llega más lejos y curva menos. Solo puntúan tus piedras más cerca del centro que cualquier piedra roja.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:pond-stones:muted";
const PULL_FULL = 150;
const MAX_ANGLE = 0.42;

function stoneArt(handle: string): PixelArt {
  return {
    palette: { g: "#868e96", d: "#5c636a", l: "#ced4da", h: handle, k: "#343a40" },
    rows: ["..dddd..", ".dggggd.", "dglhhgld", "dghhhhgd", "dgghhggd", "dggggggd", ".dkkkkd.", "..dddd.."],
  };
}
const STONES = [stoneArt("#fab005"), stoneArt("#e03131"), stoneArt("#339af0")];
const ROCK: PixelArt = {
  palette: { r: "#6c757d", d: "#495057", l: "#adb5bd", w: "#ffffff" },
  rows: ["..wwww..", ".wlrrlw.", "lrrrrrrd", "rrlrrrdd", "rrrrrddd", ".rrrddd.", "..dddd.."],
};
const BROOM: PixelArt = {
  palette: { b: "#8a5a3b", y: "#f2c14e", d: "#c9971c" },
  rows: ["....b", "...b.", "..b..", ".b...", "yyy..", "ydy..", "yyy.."],
};

const SKY: BackdropSpec = { sky: ["#dbeefe", "#cfe6fb", "#c3def8"], seed: 61 };

export default function PondStones({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<Mode>("solo");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ left: 0, score: 0, turn: 0 as 0 | 1, spin: 0 as Spin });
  const [over, setOver] = useState<null | { won: boolean; used: number; winner: -1 | 0 | 1; pts: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pondRef = useRef<Pond>(newPond(0));
  const spinRef = useRef<Spin>(0);
  const aim = useRef<null | { id: number; from: { x: number; y: number }; to: { x: number; y: number } }>(null);
  const rub = useRef<null | { id: number; x: number; y: number; t: number; until: number }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const level = mode === "duo" ? DUO_LEVEL : LEVELS[stage];
  useRunRecord(POND_SLUG, Boolean(over?.won && mode === "solo"), over ? starsFor(over.used, LEVELS[stage]) : 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const sync = useCallback(() => {
    const p = pondRef.current;
    setHud({ left: stonesLeft(p), score: scoreFor(p, p.mode === "duo" ? p.turn : 0), turn: p.turn, spin: spinRef.current });
  }, []);

  const start = useCallback((s: number, m: Mode) => {
    setStage(s);
    setMode(m);
    pondRef.current = newPond(s, m);
    aim.current = null;
    rub.current = null;
    parts.current = [];
    spinRef.current = 0;
    setOver(null);
    sync();
  }, [sync]);

  useEffect(() => {
    const done = loadClearedStages(POND_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT), "solo");
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const p = pondRef.current;
      const l = p.level;
      if (p.active !== -1) {
        const r = rub.current;
        const s = p.stones[p.active];
        const near = r && now < r.until && Math.hypot(r.x - s.x, r.y - s.y) < 110 && r.y <= s.y + 10;
        setSweep(p, Boolean(near));
        const ev = stepPond(p, dt);
        if (near && Math.random() < 0.5) spawnBurst(parts.current, s.x + (Math.random() - 0.5) * 20, s.y - 16, ["#ffffff", "#e7f5ff"], 2, 40, Math.floor(now));
        if (ev.hit) {
          sfx("combo");
          spawnBurst(parts.current, s.x, s.y, ["#ffffff", "#adb5bd"], 8, 90, Math.floor(now));
        }
        if (ev.rock) sfx("fail");
        if (ev.stopped) {
          sync();
          if (p.over) {
            const winner = duoWinner(p);
            setOver({ won: p.won, used: p.thrown[0], winner, pts: winner >= 0 ? scoreFor(p, winner as 0 | 1) : 0 });
            if (p.mode === "solo" && p.won) {
              setCleared(markStageCleared(POND_SLUG, l.stage, STAGE_COUNT));
              sfx("win");
            } else if (p.mode === "solo") sfx("lose");
            else sfx("win");
          } else sfx("place");
        }
      }
      stepParticles(parts.current, dt, 60);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKY, 4);
        // ice scratches
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        for (let k = 0; k < 36; k++) ctx.fillRect((k * 89) % FIELD_W, (k * 53) % FIELD_H, 10 + (k % 3) * 6, 2);
        // snowbanks on both sides
        ctx.fillStyle = "#ffffff";
        for (let y = 0; y < FIELD_H; y += 8) {
          ctx.fillRect(0, y, 6 + ((y / 8) % 3) * 2, 8);
          ctx.fillRect(FIELD_W - 6 - ((y / 8 + 1) % 3) * 2, y, 12, 8);
        }
        // house rings
        const ringColors = ["#e03131", "#ffffff", "#339af0"];
        HOUSE.rings.forEach((r, i) => {
          ctx.fillStyle = ringColors[i];
          ctx.beginPath();
          ctx.arc(HOUSE.x, HOUSE.y, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(HOUSE.x - 4, HOUSE.y - 4, 8, 8);
        // hog line
        ctx.fillStyle = "#e03131";
        for (let x = 8; x < FIELD_W - 8; x += 12) ctx.fillRect(x, HOG_Y - 1, 6, 3);
        // snow patches
        for (const s of l.snow) {
          ctx.fillStyle = "#f8f9fa";
          ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
          ctx.fillStyle = "#dee2e6";
          for (let x = s.x0; x < s.x1; x += 9) ctx.fillRect(x, s.y0 + ((x / 9) % 3) * 6 + 3, 5, 3);
        }
        for (const r of l.rocks) drawSprite(ctx, ROCK, r.x, r.y, { scale: Math.max(3, Math.round(r.r / 3.5)) });
        // stones
        for (const s of p.stones) {
          if (!s.alive) continue;
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(Math.round(s.x - STONE_R), Math.round(s.y + STONE_R - 3), STONE_R * 2, 4);
          const art = s.team === 0 ? STONES[0] : p.mode === "duo" ? STONES[2] : STONES[1];
          drawSprite(ctx, art, s.x, s.y, { scale: 3 });
        }
        // waiting stone at the start
        if (canThrow(p)) {
          const art = p.turn === 0 ? STONES[0] : STONES[2];
          drawSprite(ctx, art, START.x, START.y, { scale: 3 });
          const sp = spinRef.current;
          if (sp) {
            ctx.strokeStyle = "#212529";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(START.x, START.y, STONE_R + 7, sp > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1, sp > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6, sp < 0);
            ctx.stroke();
            const tip = sp > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6;
            const tx = START.x + Math.cos(tip) * (STONE_R + 7);
            const ty = START.y + Math.sin(tip) * (STONE_R + 7);
            ctx.fillStyle = "#212529";
            ctx.fillRect(Math.round(tx) - 3, Math.round(ty) - 3, 6, 6);
          }
          const a = aim.current;
          if (a) {
            const dx = a.to.x - a.from.x;
            const dy = a.to.y - a.from.y;
            const pull = Math.hypot(dx, dy);
            if (pull > 10) {
              const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(-dx, dy)));
              const power = Math.min(1, pull / PULL_FULL);
              const stop = straightStop(angle, power);
              ctx.fillStyle = "rgba(33,37,41,0.55)";
              const n = 24;
              for (let k = 1; k <= n; k++) {
                const x = START.x + ((stop.x - START.x) * k) / n;
                const y = START.y + ((stop.y - START.y) * k) / n;
                if (y < 0) break;
                ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
              }
              ctx.strokeStyle = "#212529";
              ctx.lineWidth = 2;
              ctx.strokeRect(Math.round(stop.x) - STONE_R, Math.round(stop.y) - STONE_R, STONE_R * 2, STONE_R * 2);
              // power bar
              ctx.fillStyle = "rgba(255,255,255,0.8)";
              ctx.fillRect(16, 470, 12, 110);
              ctx.fillStyle = power > 0.8 ? "#e03131" : "#fab005";
              ctx.fillRect(16, 580 - 110 * power, 12, 110 * power);
            }
          }
        }
        // the broom follows the rubbing finger
        const r = rub.current;
        if (p.active !== -1 && r && now < r.until + 200) drawSprite(ctx, BROOM, r.x + 6, r.y - 6, { scale: 4 });
        if (p.sweeping) {
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#1864ab";
          ctx.fillText(c.sweep, FIELD_W / 2, 590);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.sweep, sfx, sync]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pondRef.current;
    if (p.over) return;
    const pt = toField(e);
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (p.active !== -1) {
      rub.current = { id: e.pointerId, x: pt.x, y: pt.y, t: performance.now(), until: 0 };
      return;
    }
    if (canThrow(p) && !aim.current && pt.y > HOG_Y + 40) aim.current = { id: e.pointerId, from: pt, to: pt };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toField(e);
    const a = aim.current;
    if (a && a.id === e.pointerId) {
      a.to = pt;
      return;
    }
    const r = rub.current;
    if (r && r.id === e.pointerId) {
      const now = performance.now();
      const speed = Math.hypot(pt.x - r.x, pt.y - r.y) / Math.max(0.001, (now - r.t) / 1000);
      if (speed > 220) r.until = now + 160;
      r.x = pt.x;
      r.y = pt.y;
      r.t = now;
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = rub.current;
    if (r && r.id === e.pointerId) rub.current = null;
    const a = aim.current;
    if (!a || a.id !== e.pointerId) return;
    aim.current = null;
    const p = pondRef.current;
    const dx = a.to.x - a.from.x;
    const dy = a.to.y - a.from.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 14) {
      // a tap on the stone changes the spin
      if (Math.hypot(a.from.x - START.x, a.from.y - START.y) < 40) {
        spinRef.current = spinRef.current === 0 ? 1 : spinRef.current === 1 ? -1 : 0;
        sync();
        sfx("tap");
      }
      return;
    }
    if (dy < 6) return; // pulled forward: cancel
    const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(-dx, dy)));
    if (throwStone(p, angle, Math.min(1, pull / PULL_FULL), spinRef.current)) {
      spinRef.current = 0;
      sync();
      sfx("tap");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const team = hud.turn === 0 ? c.p1 : c.p2;
  const tags = mode === "duo" ? [] : ([level.reds.some((r) => r.y > HOUSE.y + 80) ? c.guard : null, level.rocks.length ? c.rock : null, level.snow.length ? c.snow : null].filter(Boolean) as string[]);
  const stars = over && mode === "solo" && over.won ? starsFor(over.used, LEVELS[stage]) : 0;

  return (
    <div
      ref={containerRef}
      data-game="pond-stones"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={c.mode}>
        <button type="button" className={`game-btn min-h-11 px-3 text-sm ${mode === "solo" ? "game-btn-live" : ""}`} aria-pressed={mode === "solo"} onClick={() => start(stage, "solo")}>
          {c.solo}
        </button>
        <button type="button" className={`game-btn min-h-11 px-3 text-sm ${mode === "duo" ? "game-btn-live" : ""}`} aria-pressed={mode === "duo"} onClick={() => start(stage, "duo")}>
          {c.duo}
        </button>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {mode === "solo" ? <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge> : <Badge variant="secondary">{fill(c.turn, team)}</Badge>}
        <Badge variant="outline">{fill(c.left, hud.left)}</Badge>
        {mode === "solo" ? <Badge variant="outline">{fill(c.score, hud.score, level.need)}</Badge> : null}
        {tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 space-y-2 text-center" aria-hidden="true">
            <span className="inline-block rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
            <br />
            <span className="inline-block rounded-full bg-background/85 px-3 py-1 text-sm shadow">{c.spin}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/3 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            {mode === "solo" ? (
              <>
                <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
                {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p> : null}
              </>
            ) : (
              <p className="text-lg font-bold">{over.winner < 0 ? c.blank : fill(c.duoWin, over.winner === 0 ? c.p1 : c.p2, over.pts)}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, mode)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={mode === "duo" || !over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1, "solo")}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      {mode === "solo" ? (
        <details className="rounded-lg border border-border p-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
          <div className="pt-2">
            <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i, "solo")} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
