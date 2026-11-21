import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minimize2, Volume2, VolumeX, RotateCcw } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { TRAP_STAIRS_SPRITES } from "../../lib/games/sprites";
import {
  PLAYER_H,
  PLAYER_W,
  ROWS,
  TRAP_SLUG,
  TRAP_STAGES,
  buildLevel,
  startAttempt,
  stepTrap,
  trapScore,
  type Input,
  type Level,
  type TrapState,
} from "../../lib/games/trap-stairs";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; deaths: string; time: string; cleared: string; next: string; retry: string; stages: string;
  finale: string; hint: string; tap: string; left: string; right: string; jump: string; full: string; exitFull: string;
  mute: string; unmute: string; restart: string; quips: string[];
}> = {
  ko: {
    stage: "{0}단계", deaths: "실패 {0}", time: "{0}초", cleared: "{0}단계 통과!", next: "다음 단계", retry: "이 단계 다시", stages: "단계 고르기",
    finale: "40단계 완주! 1단계부터 다시", hint: "← → 이동 · 스페이스/↑ 점프 · 짧게 누르면 낮은 점프", tap: "아무 키나 버튼을 눌러 시작",
    left: "왼쪽", right: "오른쪽", jump: "점프", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", restart: "처음부터",
    quips: ["그럴 줄 알았지?", "계단은 거짓말을 한다", "한 번 본 함정은 기억하자", "이번엔 진짜 될 거야", "바닥을 믿지 마"],
  },
  en: {
    stage: "Stage {0}", deaths: "Fails {0}", time: "{0}s", cleared: "Stage {0} cleared!", next: "Next stage", retry: "Replay stage", stages: "Pick a stage",
    finale: "All 40 stages done! Start again", hint: "← → move · Space/↑ jump · tap for a low hop", tap: "Press any key or button to start",
    left: "Left", right: "Right", jump: "Jump", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", restart: "Restart",
    quips: ["Saw that coming?", "The stairs lie.", "Remember every trap you meet.", "This time for real.", "Never trust the floor."],
  },
  ja: {
    stage: "ステージ{0}", deaths: "ミス {0}", time: "{0}秒", cleared: "ステージ{0}クリア！", next: "次のステージ", retry: "もう一度", stages: "ステージを選ぶ",
    finale: "全40ステージ制覇！最初から", hint: "← → 移動・スペース/↑ ジャンプ・短く押すと小ジャンプ", tap: "キーかボタンを押してスタート",
    left: "左", right: "右", jump: "ジャンプ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", restart: "最初から",
    quips: ["そう来ると思った？", "階段はウソをつく", "一度見た罠は覚えよう", "今度こそ本当に", "床を信じるな"],
  },
  zh: {
    stage: "第{0}关", deaths: "失败 {0}", time: "{0}秒", cleared: "第{0}关通过！", next: "下一关", retry: "重玩本关", stages: "选择关卡",
    finale: "40关全部通关！重新开始", hint: "← → 移动 · 空格/↑ 跳 · 轻按是小跳", tap: "按任意键或按钮开始",
    left: "左", right: "右", jump: "跳", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", restart: "从头开始",
    quips: ["早就猜到了吧？", "台阶会骗人", "见过的陷阱要记住", "这次一定行", "别相信地板"],
  },
  fr: {
    stage: "Niveau {0}", deaths: "Échecs {0}", time: "{0} s", cleared: "Niveau {0} réussi !", next: "Niveau suivant", retry: "Rejouer", stages: "Choisir un niveau",
    finale: "Les 40 niveaux sont faits ! Recommencer", hint: "← → bouger · Espace/↑ sauter · appui bref = petit saut", tap: "Appuyez sur une touche ou un bouton",
    left: "Gauche", right: "Droite", jump: "Sauter", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", restart: "Recommencer",
    quips: ["Vous l'aviez vu venir ?", "Les marches mentent.", "Retenez chaque piège.", "Cette fois, c'est la bonne.", "Ne faites jamais confiance au sol."],
  },
  es: {
    stage: "Nivel {0}", deaths: "Fallos {0}", time: "{0} s", cleared: "¡Nivel {0} superado!", next: "Siguiente nivel", retry: "Repetir nivel", stages: "Elegir nivel",
    finale: "¡Los 40 niveles completados! Empezar de nuevo", hint: "← → mover · Espacio/↑ saltar · toque corto = salto bajo", tap: "Pulsa una tecla o botón para empezar",
    left: "Izquierda", right: "Derecha", jump: "Saltar", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", restart: "Reiniciar",
    quips: ["¿Lo veías venir?", "Las escaleras mienten.", "Recuerda cada trampa.", "Esta vez sí.", "Nunca te fíes del suelo."],
  },
};

const fill = (t: string, ...a: Array<string | number>) => t.replace(/\{(\d+)\}/g, (_, i) => String(a[Number(i)] ?? ""));

const VIEW_COLS = 12;
const TILE = 40;
const W = VIEW_COLS * TILE;
/** Rows 0-2 are always empty sky, so the view starts at row 3 (12×9 tiles, 4:3). */
const VIEW_TOP = 3;
const H = (ROWS - VIEW_TOP) * TILE;
const STEP = 1 / 120;
const MUTE_KEY = "oiyo:trap-stairs:muted";
const SPRITE_KEYS = ["idle", "runA", "runB", "jump", "dead", "stone", "stoneTop", "spike", "door", "dropper", "hidden", "pad"] as const;
type SpriteKey = (typeof SPRITE_KEYS)[number];

type Phase = "ready" | "play" | "dying" | "clear";

export default function TrapStairs({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(1);
  const [cleared, setCleared] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [deaths, setDeaths] = useState(0);
  const [clearTime, setClearTime] = useState(0);
  const [quip, setQuip] = useState("");
  const [muted, setMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef<Level>(buildLevel(1));
  const stRef = useRef<TrapState>(startAttempt(levelRef.current));
  const phaseRef = useRef<Phase>("ready");
  const inputRef = useRef<Input>({ left: false, right: false, jump: false, jumpPressed: false });
  const imgs = useRef<Partial<Record<SpriteKey, HTMLImageElement>>>({});
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const deathsRef = useRef(0);
  const dyingAt = useRef(0);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const map: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(map[cue]);
  }, []);

  const loadStage = useCallback((s: number) => {
    levelRef.current = buildLevel(s);
    stRef.current = startAttempt(levelRef.current);
    deathsRef.current = 0;
    setDeaths(0);
    setStage(s);
    setPhaseBoth("ready");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TRAP_SLUG, TRAP_STAGES);
    setCleared(done);
    loadStage(nextOpenStage(done, TRAP_STAGES) + 1);
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    const src: Record<SpriteKey, string> = {
      idle: TRAP_STAIRS_SPRITES.heroIdle, runA: TRAP_STAIRS_SPRITES.heroRunA, runB: TRAP_STAIRS_SPRITES.heroRunB,
      jump: TRAP_STAIRS_SPRITES.heroJump, dead: TRAP_STAIRS_SPRITES.heroDead, stone: TRAP_STAIRS_SPRITES.stone,
      stoneTop: TRAP_STAIRS_SPRITES.stoneTop, spike: TRAP_STAIRS_SPRITES.spike, door: TRAP_STAIRS_SPRITES.door,
      dropper: TRAP_STAIRS_SPRITES.dropper, hidden: TRAP_STAIRS_SPRITES.hidden, pad: TRAP_STAIRS_SPRITES.pad,
    };
    for (const k of SPRITE_KEYS) {
      const img = new Image();
      img.src = src[k];
      imgs.current[k] = img;
    }
    return () => cues.current?.close();
  }, [loadStage]);

  const begin = useCallback(() => {
    if (phaseRef.current === "ready") setPhaseBoth("play");
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      const i = inputRef.current;
      if (k === "ArrowLeft" || k === "a" || k === "A") i.left = true;
      else if (k === "ArrowRight" || k === "d" || k === "D") i.right = true;
      else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
        if (!i.jump) i.jumpPressed = true;
        i.jump = true;
      } else if (k === "r" || k === "R") {
        stRef.current = startAttempt(levelRef.current, stRef.current.revealed);
        return;
      } else return;
      e.preventDefault();
      begin();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      const i = inputRef.current;
      if (k === "ArrowLeft" || k === "a" || k === "A") i.left = false;
      else if (k === "ArrowRight" || k === "d" || k === "D") i.right = false;
      else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") i.jump = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [begin]);

  // Main loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      const lv = levelRef.current;
      while (acc >= STEP) {
        acc -= STEP;
        if (phaseRef.current !== "play") continue;
        const st = stRef.current;
        const wasDoor = st.doorMoved;
        stepTrap(lv, st, inputRef.current, STEP);
        inputRef.current.jumpPressed = false;
        if (!wasDoor && st.doorMoved) sfx("tap");
        if (st.dead) {
          deathsRef.current += 1;
          setDeaths(deathsRef.current);
          setQuip(c.quips[deathsRef.current % c.quips.length]);
          dyingAt.current = now;
          setPhaseBoth("dying");
          sfx("lose");
        } else if (st.won) {
          setClearTime(Math.round(st.time * 10) / 10);
          setCleared(markStageCleared(TRAP_SLUG, lv.stage - 1, TRAP_STAGES));
          setPhaseBoth("clear");
          sfx("win");
        }
      }
      if (phaseRef.current === "dying" && now - dyingAt.current > 650) {
        stRef.current = startAttempt(lv, stRef.current.revealed);
        setPhaseBoth("play");
      }
      draw(now);
    };
    const draw = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const lv = levelRef.current;
      const st = stRef.current;
      const im = imgs.current;
      const camX = Math.max(0, Math.min(lv.width - VIEW_COLS, st.x - VIEW_COLS * 0.4));
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#1d1638");
      sky.addColorStop(1, "#4a3a7a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 211 - camX * 8) % W + W) % W;
        ctx.fillRect(sx, (i * 67) % (H * 0.6), 2, 2);
      }
      const put = (k: SpriteKey, x: number, y: number, w = 1, h = 1) => {
        const img = im[k];
        const px = (x - camX) * TILE;
        if (img?.complete && img.naturalWidth) ctx.drawImage(img, px, (y - VIEW_TOP) * TILE, w * TILE, h * TILE);
        else {
          ctx.fillStyle = "#5d4f8a";
          ctx.fillRect(px, (y - VIEW_TOP) * TILE, w * TILE, h * TILE);
        }
      };
      const c0 = Math.floor(camX);
      for (let r = 0; r < ROWS; r++) {
        for (let col = c0; col <= Math.min(lv.width - 1, c0 + VIEW_COLS); col++) {
          const cell = lv.grid[r][col];
          const k = `${r},${col}`;
          const solidAbove = r > 0 && (lv.grid[r - 1][col] === "#" || lv.grid[r - 1][col] === "f");
          if (cell === "#") put(solidAbove ? "stone" : "stoneTop", col, r);
          else if (cell === "f" && !st.fallen.has(k)) {
            const shaking = st.crumble.has(k) ? Math.sin(now / 20) * 0.04 : 0;
            put(solidAbove ? "stone" : "stoneTop", col + shaking, r);
          } else if (cell === "^" || (cell === "p" && st.popped.has(k))) put("spike", col, r);
          else if (cell === "h" && st.revealed.has(k)) put("hidden", col, r);
          else if (cell === "b") put("pad", col, r);
        }
      }
      for (const d of st.droppers) put("dropper", d.col, d.y);
      put("door", st.door.x, st.door.y - 0.4, 1, 1.4);
      // hero
      const running = Math.abs(st.vx) > 0 && st.onGround;
      const heroKey: SpriteKey = st.dead ? "dead" : !st.onGround ? "jump" : running ? (Math.floor(now / 110) % 2 ? "runA" : "runB") : "idle";
      const hx = (st.x - camX - (1 - PLAYER_W) / 2) * TILE;
      const hy = (st.y - (1 - PLAYER_H) - VIEW_TOP) * TILE;
      const img = im[heroKey];
      ctx.save();
      if (st.facing < 0) {
        ctx.translate(hx + TILE, hy);
        ctx.scale(-1, 1);
      } else ctx.translate(hx, hy);
      if (img?.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, TILE, TILE);
      ctx.restore();
      if (phaseRef.current === "ready") {
        ctx.fillStyle = "rgba(20,14,40,0.6)";
        ctx.fillRect(0, H / 2 - 48, W, 96);
        ctx.fillStyle = "#fbf7f0";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(fill(c.stage, lv.stage), W / 2, H / 2 - 10);
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText(c.tap, W / 2, H / 2 + 22);
        ctx.textAlign = "left";
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [c, sfx]);

  useRunRecord(TRAP_SLUG, phase === "clear", trapScore(cleared.length, deaths));

  const press = (key: "left" | "right" | "jump", on: boolean) => {
    const i = inputRef.current;
    if (key === "jump") {
      if (on && !i.jump) i.jumpPressed = true;
      i.jump = on;
    } else i[key] = on;
    if (on) begin();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const pad = (key: "left" | "right" | "jump", label: string, icon: React.ReactNode) => (
    <Button
      variant="secondary"
      size="lg"
      aria-label={label}
      className="min-h-14 min-w-16 touch-none select-none"
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); press(key, true); }}
      onPointerUp={() => press(key, false)}
      onPointerCancel={() => press(key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {icon}
    </Button>
  );

  return (
    <div
      ref={containerRef}
      data-game="trap-stairs"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-2" : "mx-auto w-full max-w-3xl space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.stage, stage)} / {TRAP_STAGES}</Badge>
        <Badge variant="outline">{fill(c.deaths, deaths)}</Badge>
        {phase === "dying" && <span className="text-sm font-bold text-destructive">{quip}</span>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" aria-label={c.restart} onClick={() => loadStage(stage)}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-lg">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={begin}
          className="aspect-4/3 w-full touch-none rounded-xl border border-border bg-card"
          aria-label={fill(c.stage, stage)}
        />
        {phase === "clear" && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
              <CardContent>
                <div className="space-y-3 text-center">
                  <p className="text-xl font-bold">{fill(c.cleared, stage)}</p>
                  <p className="text-sm text-muted-foreground">
                    {fill(c.deaths, deaths)} · {fill(c.time, clearTime)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="min-h-12" onClick={() => loadStage(stage)}>{c.retry}</Button>
                    <Button className="min-h-12" onClick={() => loadStage(stage >= TRAP_STAGES ? 1 : stage + 1)}>
                      {stage >= TRAP_STAGES ? c.finale : c.next}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {pad("left", c.left, <ArrowLeft className="size-6" />)}
          {pad("right", c.right, <ArrowRight className="size-6" />)}
        </div>
        {pad("jump", c.jump, <ArrowUp className="size-6" />)}
      </div>
      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={TRAP_STAGES} current={stage - 1} cleared={cleared} locale={locale} onSelect={(i) => loadStage(i + 1)} />
        </div>
      </details>
    </div>
  );
}
