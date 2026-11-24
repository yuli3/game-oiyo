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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { CLIMB_SLUG, CLIMB_STAGES, STAGE_COUNT, band, newClimber, powerFor, press, release, starsFor, stepClimber, type Climber, type Ice } from "../../lib/games/ice-climb";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; height: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; bite: string; glance: string; shatter: string; thin: string; firm: string; hard: string;
}> = {
  ko: {
    stage: "{0}단계", time: "남은 시간 {0}초", height: "{0}/{1}칸", start: "꾹 눌러 도끼를 들고, 알맞은 힘에서 떼어 찍어요!", win: "꼭대기에 올랐어요!", lose: "해가 얼음을 녹였어요", result: "{0}칸 · 박힘 {1} · 깨짐 {2}",
    again: "다시 오르기", next: "다음 단계", bite: "콱!", glance: "튕겼어요", shatter: "와장창! 미끄러져요", thin: "얇은 얼음: 살살", firm: "단단한 얼음: 중간", hard: "두꺼운 얼음: 세게",
    help: "얼어붙은 폭포를 피켈로 오르는 빙벽 등반이에요. 화면을 누르고 있으면 오른쪽 힘 막대가 올라갔다 내려갔다 해요. 원하는 힘에서 손을 떼면 바로 위 얼음을 찍어요. 얼음마다 알맞은 힘이 달라요. 파랗고 얇은 얼음은 살살, 하얀 얼음은 중간, 회색 두꺼운 얼음은 세게 찍어야 해요. 막대의 밝은 칸 안에서 떼면 도끼가 박혀 한 칸 올라가고, 약하면 튕기고, 너무 세면 얼음이 깨져 한 칸 미끄러져요. 해가 얼음을 녹이기 전에 꼭대기까지 오르면 통과예요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s left", height: "{0}/{1}", start: "Hold to raise the axe, let go at the right power to strike!", win: "You topped out!", lose: "The sun softened the ice", result: "{0} steps · {1} bites · {2} shattered",
    again: "Climb again", next: "Next stage", bite: "Thunk!", glance: "Glanced off", shatter: "Crash! You slip", thin: "Thin ice: gently", firm: "Firm ice: medium", hard: "Hard ice: full swing",
    help: "Climb a frozen waterfall with ice axes. Hold the screen and the power bar on the right rises and falls. Let go at the power you want to strike the ice just above you. Every patch wants its own strength: blue thin ice gently, white firm ice medium, grey hard ice a full swing. Let go inside the bar's bright band and the axe bites and you climb a step; too soft glances off; too hard shatters the ice and you slip a step. Reach the top before the sun softens the ice. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "残り {0}秒", height: "{0}/{1}段", start: "長押しでピッケルを振り上げ、ちょうどいい力で離して打ち込もう！", win: "頂上に着いた！", lose: "日差しで氷がゆるんだ", result: "{0}段 · 刺さった {1} · 割れた {2}",
    again: "もう一度", next: "次の面", bite: "ガッ！", glance: "はじかれた", shatter: "バリン！ ずり落ちる", thin: "薄い氷：そっと", firm: "固い氷：中くらい", hard: "厚い氷：思い切り",
    help: "凍った滝をアイスアックスで登るアイスクライミング。画面を押している間、右の力メーターが上がっては下がります。好きな力で指を離すと、すぐ上の氷に打ち込みます。氷ごとにちょうどいい力が違います。青く薄い氷はそっと、白い氷は中くらい、灰色の厚い氷は思い切り。メーターの明るい帯の中で離せば刺さって1段登り、弱いとはじかれ、強すぎると氷が割れて1段ずり落ちます。日差しで氷がゆるむ前に頂上まで登ればクリア。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "剩余 {0}秒", height: "{0}/{1}格", start: "按住举起冰镐，在合适的力度松手砸下去！", win: "登顶了！", lose: "太阳把冰晒软了", result: "{0}格 · 扎牢 {1} · 砸碎 {2}",
    again: "再爬一次", next: "下一关", bite: "咚！", glance: "弹开了", shatter: "哗啦！往下滑", thin: "薄冰：轻一点", firm: "硬冰：中等", hard: "厚冰：用力",
    help: "用冰镐攀登结冰瀑布。按住屏幕，右边的力度条会升起又落下；在想要的力度松手，就砸向正上方的冰。每块冰需要的力度不同：蓝色薄冰要轻，白冰中等，灰色厚冰要用力。在条上亮色区间内松手，冰镐扎牢，往上爬一格；力度不够会弹开；太大则冰碎，往下滑一格。在太阳把冰晒软之前爬到顶就过关。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s restantes", height: "{0}/{1}", start: "Maintenez pour lever le piolet, lâchez à la bonne force pour frapper !", win: "Sommet atteint !", lose: "Le soleil a ramolli la glace", result: "{0} prises · {1} ancrages · {2} brisées",
    again: "Grimper à nouveau", next: "Niveau suivant", bite: "Tchac !", glance: "Ça ricoche", shatter: "Crac ! Vous glissez", thin: "Glace fine : doucement", firm: "Glace ferme : moyen", hard: "Glace dure : à fond",
    help: "Gravissez une cascade de glace aux piolets. Maintenez l'écran : la jauge de force à droite monte puis redescend. Lâchez à la force voulue pour frapper la glace juste au-dessus. Chaque plaque veut sa force : glace bleue et fine doucement, glace blanche moyennement, glace grise et dure à fond. Lâchez dans la zone claire de la jauge et le piolet s'ancre, vous montez d'une prise ; trop doux, il ricoche ; trop fort, la glace casse et vous glissez d'une prise. Atteignez le sommet avant que le soleil ramollisse la glace. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "Quedan {0} s", height: "{0}/{1}", start: "¡Mantén para alzar el piolet y suelta con la fuerza justa para clavarlo!", win: "¡Llegaste a la cima!", lose: "El sol ablandó el hielo", result: "{0} pasos · {1} clavados · {2} rotos",
    again: "Escalar otra vez", next: "Siguiente nivel", bite: "¡Clac!", glance: "Rebotó", shatter: "¡Crac! Te resbalas", thin: "Hielo fino: suave", firm: "Hielo firme: medio", hard: "Hielo duro: a tope",
    help: "Escala una cascada helada con piolets. Mantén la pantalla y la barra de fuerza de la derecha sube y baja. Suelta con la fuerza que quieras para golpear el hielo justo encima. Cada placa pide su fuerza: hielo azul y fino suave, hielo blanco medio, hielo gris y duro a tope. Suelta dentro de la franja clara de la barra y el piolet se clava y subes un paso; muy flojo, rebota; demasiado fuerte, el hielo se rompe y resbalas un paso. Llega a la cima antes de que el sol ablande el hielo. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ice-climb:muted";
const W = 360;
const H = 560;
const STEP_PX = 56; // screen px per step up the wall
const WALL_X = 70;
const WALL_W = 200;
const ICE_COLOR = ["#a5d8ff", "#f1f7ff", "#adb5bd"];
const ICE_EDGE = ["#4dabf7", "#ced4da", "#495057"];

const CLIMBER: PixelArt = {
  palette: { k: "#212529", r: "#e8590c", s: "#f1c27d", b: "#364fc7", g: "#868e96", y: "#fab005" },
  rows: ["g..yy..g", "g.kssk.g", "grrrrrrg", ".rrrrrr.", "..rrrr..", "..bbbb..", "..b..b..", ".kk..kk."],
};

interface Pop { text: string; t: number; color: string }

export default function IceClimb({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; step: number; bites: number; shatters: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cRef = useRef<Climber>(newClimber(CLIMB_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const camY = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = CLIMB_STAGES[stage];

  useRunRecord(CLIMB_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    cRef.current = newClimber(CLIMB_STAGES[s]);
    started.current = false;
    input.current = [];
    camY.current = 0;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(CLIMB_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const finish = useCallback((cl: Climber) => {
    setOver({ won: cl.won, stars: starsFor(cl), step: cl.step, bites: cl.bites, shatters: cl.shatters });
    if (cl.won) {
      setCleared(markStageCleared(CLIMB_SLUG, cl.stage.stage, STAGE_COUNT));
      sfx("win");
    } else sfx("lose");
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const cl = cRef.current;
      const cp = copyRef.current;
      const s = cl.stage;
      // the button is read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "down") {
          started.current = true;
          press(cl);
        } else {
          const res = release(cl);
          const cy = H - 150;
          if (res === "bite") {
            pops.current.push({ text: cp.bite, t: 0.6, color: "#2f9e44" });
            spawnBurst(parts.current, W / 2, cy - 40, ["#e7f5ff", "#ffffff"], 10, 80, Math.floor(cl.t * 1000));
            sfx("success");
          } else if (res === "glance") {
            pops.current.push({ text: cp.glance, t: 0.6, color: "#868e96" });
            sfx("tap");
          } else if (res === "shatter") {
            pops.current.push({ text: cp.shatter, t: 0.8, color: "#e03131" });
            spawnBurst(parts.current, W / 2, cy - 40, ["#a5d8ff", "#4dabf7", "#ffffff"], 22, 150, Math.floor(cl.t * 1000));
            sfx("fail");
          }
          if (cl.over) finish(cl);
        }
      }
      if (started.current && !cl.over && stepClimber(cl, dt)) finish(cl);
      camY.current += (cl.step * STEP_PX - camY.current) * Math.min(1, dt * 8);
      stepParticles(parts.current, dt, 300);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1c3d6b");
        g.addColorStop(1, "#74c0fc");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // rock on both sides of the frozen fall
        ctx.fillStyle = "#495057";
        ctx.fillRect(0, 0, WALL_X, H);
        ctx.fillRect(WALL_X + WALL_W, 0, W - WALL_X - WALL_W, H);
        const baseY = H - 150; // screen y of the climber's hands
        // patches: step i sits at baseY - (i * STEP_PX - camY)
        for (let i = 0; i < s.wall.length; i++) {
          const y = baseY - (i * STEP_PX - camY.current) - STEP_PX;
          if (y < -STEP_PX || y > H) continue;
          const ice = s.wall[i];
          ctx.fillStyle = ICE_COLOR[ice];
          ctx.fillRect(WALL_X, y, WALL_W, STEP_PX - 2);
          ctx.fillStyle = ICE_EDGE[ice];
          ctx.fillRect(WALL_X, y + STEP_PX - 6, WALL_W, 4);
          if (i === cl.step && !cl.over) {
            ctx.strokeStyle = "#fab005";
            ctx.lineWidth = 3;
            ctx.strokeRect(WALL_X + 2, y + 2, WALL_W - 4, STEP_PX - 6);
          }
        }
        // the top lip and the ground
        const topY = baseY - (s.wall.length * STEP_PX - camY.current) - STEP_PX;
        if (topY > -40) {
          ctx.fillStyle = "#f8f9fa";
          ctx.fillRect(0, topY - 30, W, 32);
        }
        if (baseY + camY.current < H) {
          ctx.fillStyle = "#f1f3f5";
          ctx.fillRect(0, baseY + camY.current, W, H);
        }
        const swing = cl.holding ? powerFor(s, cl.hold) : 0;
        drawSprite(ctx, CLIMBER, W / 2, baseY + 10, { scale: 4, rotate: -swing * 0.3 });
        drawParticles(ctx, parts.current);
        // the power meter with this patch's band
        const mx = W - 40;
        const my = 120;
        const mh = 300;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(mx, my, 24, mh);
        if (!cl.over && cl.step < s.wall.length) {
          const [lo, hi] = band(s, s.wall[cl.step] as Ice);
          ctx.fillStyle = "rgba(64,192,87,0.8)";
          ctx.fillRect(mx, my + mh * (1 - hi), 24, mh * (hi - lo));
        }
        ctx.fillStyle = "#fab005";
        ctx.fillRect(mx - 4, my + mh * (1 - swing) - 3, 32, 6);
        // HUD
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        const left = Math.max(0, s.limit - cl.t);
        ctx.fillText(fill(cp.time, left.toFixed(1)), 12, 28);
        ctx.fillText(fill(cp.height, cl.step, s.wall.length), 12, 52);
        if (!cl.over && cl.step < s.wall.length) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = ICE_COLOR[s.wall[cl.step]];
          ctx.fillText([cp.thin, cp.firm, cp.hard][s.wall[cl.step]], 12, 76);
        }
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 110 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 110);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [finish, sfx]);

  const down = useCallback(() => {
    if (cRef.current.over) return;
    setTouched(true);
    input.current.push("down");
  }, []);
  const up = useCallback(() => {
    input.current.push("up");
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      e.preventDefault();
      down();
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      up();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [down, up]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="ice-climb"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.height, st.wall.length, st.wall.length)}</Badge>
        <Badge variant="outline">{st.limit.toFixed(1)}s</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); down(); }}
          onPointerUp={up}
          onPointerCancel={up}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.step, over.bites, over.shatters)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
