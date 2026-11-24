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
import { BOTTOM, LAND_TOL, PIPES, PIPE_SLUG, STAGE_COUNT, letGo, newRider, press, starsFor, stepRider, wallY, type Rider, type RiderEvents } from "../../lib/games/snow-halfpipe";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; hits: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; pump: string; bobble: string; wipe: string; spin: string; pts: string;
}> = {
  ko: {
    stage: "{0}단계", score: "점수 {0}/{1}", hits: "남은 점프 {0}", start: "바닥에서 톡 눌러 펌핑, 공중에서 꾹 눌러 회전!", win: "목표 점수 돌파!", lose: "점수가 모자랐어요", result: "{0}점 · 넘어짐 {1}",
    again: "다시 하기", next: "다음 단계", pump: "펌핑!", bobble: "휘청", wipe: "넘어졌어요", spin: "{0}°", pts: "+{0}",
    help: "눈으로 만든 하프파이프에서 스노보드를 타요. 라이더는 양쪽 벽을 오가요. 평평한 바닥을 지날 때 화면을 톡 누르면 펌핑해서 속도가 붙고, 벽 위에서 누르면 휘청거려 속도를 잃어요. 벽 끝(립)을 넘어 날아오르면 꾹 눌러 몸을 돌리고, 손을 떼면 회전이 멈춰요. 보드를 반 바퀴 단위(180°, 360°…)에서 30° 안으로 맞춰 내려와야 착지 성공이고, 비뚤게 내려오면 넘어져 그 점프 점수를 잃고 속도도 크게 줄어요. 높이 뜰수록 회전할 시간이 길어요. 정해진 점프 수 안에 목표 점수를 넘기면 통과예요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", score: "Score {0}/{1}", hits: "{0} airs left", start: "Tap in the bottom to pump, hold in the air to spin!", win: "Past the mark!", lose: "Not enough points", result: "{0} pts · {1} wipeouts",
    again: "Ride again", next: "Next stage", pump: "Pump!", bobble: "Bobble", wipe: "Wipeout", spin: "{0}°", pts: "+{0}",
    help: "Ride a snowboard in a snow halfpipe. The rider swings from wall to wall. Tap as you cross the flat bottom to pump and gain speed; a tap up on the wall is a bobble that costs speed. When you fly out over the lip, hold to spin and let go to stop. Land with the board within 30° of a whole half turn (180°, 360°…) to stick it; land crooked and you wipe out, losing that air's points and most of your speed. The more air, the more time to spin. Beat the mark within the set number of airs. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", score: "得点 {0}/{1}", hits: "残りエア {0}", start: "底でタップしてパンプ、空中で長押しして回転！", win: "目標突破！", lose: "得点が足りません", result: "{0}点 · 転倒 {1}",
    again: "もう一度", next: "次の面", pump: "パンプ！", bobble: "ぐらつき", wipe: "転倒", spin: "{0}°", pts: "+{0}",
    help: "雪のハーフパイプでスノーボード。ライダーは左右の壁を行き来します。平らな底を通るときにタップするとパンプして加速し、壁の上で押すとぐらついて減速します。リップを越えて飛び出したら長押しで回転、離すと止まります。ボードを半回転単位(180°、360°…)から30°以内にそろえて降りれば着地成功、ずれると転倒してそのエアの点を失い、スピードも大きく落ちます。高く飛ぶほど回る時間が長くなります。決められたエア数のうちに目標点を超えればクリア。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", score: "得分 {0}/{1}", hits: "剩余腾空 {0}", start: "在底部点击加速，空中按住旋转！", win: "超过目标分！", lose: "分数不够", result: "{0}分 · 摔倒 {1}",
    again: "再滑一次", next: "下一关", pump: "加速！", bobble: "晃了一下", wipe: "摔倒", spin: "{0}°", pts: "+{0}",
    help: "在雪造的U型场地里玩单板滑雪。选手在两侧墙壁之间来回滑行。经过平坦底部时点一下屏幕可以压板加速，在墙上点会晃动掉速。飞出台唇后按住旋转，松开停止。落地时板子要在整半圈（180°、360°……）的30°以内才算成功，歪着落地就会摔倒，失去这次腾空的分数，速度也大减。飞得越高，旋转时间越长。在规定的腾空次数内超过目标分就过关。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", score: "Score {0}/{1}", hits: "{0} sauts restants", start: "Touchez au fond pour pomper, maintenez en l'air pour tourner !", win: "Objectif dépassé !", lose: "Pas assez de points", result: "{0} pts · {1} chutes",
    again: "Rider à nouveau", next: "Niveau suivant", pump: "Pompe !", bobble: "Déséquilibre", wipe: "Chute", spin: "{0}°", pts: "+{0}",
    help: "Faites du snowboard dans un halfpipe de neige. Le rider passe d'un mur à l'autre. Touchez en traversant le fond plat pour pomper et prendre de la vitesse ; toucher sur le mur vous déséquilibre et fait perdre de la vitesse. Une fois sorti au-dessus du bord, maintenez pour tourner et lâchez pour arrêter. Retombez avec la planche à moins de 30° d'un demi-tour entier (180°, 360°…) pour réussir ; de travers, c'est la chute : vous perdez les points du saut et presque toute votre vitesse. Plus vous montez haut, plus vous avez le temps de tourner. Dépassez l'objectif en un nombre de sauts donné. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", score: "Puntos {0}/{1}", hits: "Quedan {0} saltos", start: "Toca en el fondo para bombear, ¡mantén en el aire para girar!", win: "¡Superaste la marca!", lose: "Faltaron puntos", result: "{0} pts · {1} caídas",
    again: "Otra vez", next: "Siguiente nivel", pump: "¡Bombeo!", bobble: "Tambaleo", wipe: "Caída", spin: "{0}°", pts: "+{0}",
    help: "Monta en snowboard en un halfpipe de nieve. El rider va de pared a pared. Toca al cruzar el fondo plano para bombear y ganar velocidad; tocar arriba en la pared es un tambaleo que te frena. Al salir volando por encima del borde, mantén pulsado para girar y suelta para parar. Aterriza con la tabla a menos de 30° de media vuelta entera (180°, 360°…) para clavarlo; torcido, te caes, pierdes los puntos de ese salto y casi toda la velocidad. Cuanto más alto, más tiempo para girar. Supera la marca en el número de saltos fijado. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snow-halfpipe:muted";
const W = 360;
const H = 560;
const LIP_Y = 250; // screen y of the lips

const RIDER: PixelArt = {
  palette: { k: "#212529", h: "#f08c00", s: "#f1c27d", g: "#1098ad", b: "#364fc7", w: "#f8f9fa", r: "#e03131" },
  rows: ["...hhh....", "..hhhhh...", "..ksssk...", "...sss....", "..ggggg...", ".ggggggg..", ".g.ggg.g..", "..bbbbb...", "..bb.bb...", "rrrrrrrrrr"],
};

interface Pop { text: string; t: number; color: string }

export default function SnowHalfpipe({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ score: 0, hit: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number; score: number; crashes: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Rider>(newRider(PIPES[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const pipe = PIPES[stage];

  useRunRecord(PIPE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    rRef.current = newRider(PIPES[st]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ score: 0, hit: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(PIPE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const handle = useCallback((r: Rider, ev: RiderEvents) => {
    const cp = copyRef.current;
    if (ev.land) {
      const l = ev.land;
      if (l.clean) {
        pops.current.push({ text: `${fill(cp.spin, Math.round(l.spin / 180) * 180)} ${fill(cp.pts, l.points)}`, t: 1.2, color: "#2f9e44" });
        sfx(l.spin >= 340 ? "combo" : "success");
      } else {
        pops.current.push({ text: cp.wipe, t: 1.2, color: "#e03131" });
        spawnBurst(parts.current, W / 2 + r.side * 140, LIP_Y, ["#ffffff", "#d0ebff"], 26, 160, Math.floor(r.time * 1000));
        sfx("fail");
      }
      setHud({ score: r.score, hit: r.hit });
    }
    if (ev.done) {
      setOver({ won: r.won, stars: starsFor(r), score: r.score, crashes: r.crashes });
      if (r.won) {
        setCleared(markStageCleared(PIPE_SLUG, r.pipe.stage, STAGE_COUNT));
        sfx("win");
      } else sfx("lose");
    }
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const r = rRef.current;
      const p = r.pipe;
      // the button is read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "down") {
          const res = press(r);
          if (res === "pump") {
            pops.current.push({ text: copyRef.current.pump, t: 0.6, color: "#1c7ed6" });
            sfx("tap");
          } else if (res === "bobble") pops.current.push({ text: copyRef.current.bobble, t: 0.6, color: "#868e96" });
        } else letGo(r);
      }
      if (started.current && !r.over) handle(r, stepRider(r, dt));
      stepParticles(parts.current, dt, 220);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cx = W / 2;
        const scale = 140 / p.half;
        const X = (x: number) => cx + x * scale;
        const Y = (h: number) => LIP_Y + p.depth - h; // h = height above the pipe bottom
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#4dabf7");
        g.addColorStop(1, "#d0ebff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e7f5ff";
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 120 - 60, LIP_Y);
          ctx.lineTo(k * 120, LIP_Y - 90 - (k % 2) * 40);
          ctx.lineTo(k * 120 + 60, LIP_Y);
          ctx.fill();
        }
        // the pipe: snow walls, the flat bottom (pump zone) and the lips
        ctx.fillStyle = "#f8fbff";
        ctx.beginPath();
        ctx.moveTo(0, LIP_Y);
        ctx.lineTo(X(-p.half), LIP_Y);
        for (let x = -p.half; x <= p.half; x += 4) ctx.lineTo(X(x), Y(wallY(p, x)));
        ctx.lineTo(X(p.half), LIP_Y);
        ctx.lineTo(W, LIP_Y);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();
        ctx.strokeStyle = "#a5d8ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = -p.half; x <= p.half; x += 4) ctx.lineTo(X(x), Y(wallY(p, x)));
        ctx.stroke();
        ctx.fillStyle = "rgba(28,126,214,0.18)";
        ctx.fillRect(X(-p.half * BOTTOM), Y(0) - 3, (X(p.half * BOTTOM) - X(-p.half * BOTTOM)), 8);
        ctx.fillStyle = "#1c7ed6";
        ctx.fillRect(X(-p.half) - 6, LIP_Y - 3, 12, 6);
        ctx.fillRect(X(p.half) - 6, LIP_Y - 3, 12, 6);
        // the rider: on the wall (tilted with it) or in the air (spinning)
        let rx: number;
        let ry: number;
        let rot: number;
        if (r.air) {
          rx = X(r.side * p.half) - r.side * 8;
          ry = LIP_Y - r.y - 18;
          rot = ((r.spin * Math.PI) / 180) * -r.side;
          // landing guide: how far the board is from the nearest half turn
          const off = r.spin % 180;
          const ok = off <= LAND_TOL || off >= 180 - LAND_TOL;
          ctx.strokeStyle = ok ? "#2f9e44" : "#e03131";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(rx, ry, 30, -Math.PI / 2, -Math.PI / 2 + ((r.spin % 360) * Math.PI) / 180);
          ctx.stroke();
        } else {
          rx = X(r.x);
          const hgt = wallY(p, r.x);
          ry = Y(hgt) - 16;
          const dx = 2;
          rot = Math.atan2(-(wallY(p, r.x + dx) - wallY(p, r.x - dx)), 2 * dx * scale);
        }
        drawSprite(ctx, RIDER, rx, ry, { scale: 3, rotate: rot });
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 70 - (1.2 - pp.t) * 12 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 70 - (1.2 - pp.t) * 12);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handle, sfx]);

  const down = useCallback(() => {
    if (rRef.current.over) return;
    if (!started.current) {
      started.current = true;
      setTouched(true);
      return;
    }
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
      data-game="snow-halfpipe"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.score, hud.score, pipe.goal)}</Badge>
        <Badge variant="outline">{fill(c.hits, pipe.hits - hud.hit)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.score, over.crashes)}</p>
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
