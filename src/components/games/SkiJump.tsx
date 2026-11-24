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
import { BAND_C, BAND_W, HILLS, POP_WINDOW, SKI_SLUG, STAGE_COUNT, groundAt, hold, newJump, starsFor, stepJump, tap, type Jump, type Landing } from "../../lib/games/ski-jump";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; wind: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; pop: string; early: string; land: Record<Exclude<Landing, "">, string>; m: string;
}> = {
  ko: {
    stage: "{0}단계 · K{1}", goal: "목표 {0}점", wind: "바람 {0}", start: "꾹 눌러 웅크리고, 도약대 끝에서 손을 떼요!", win: "목표 점수 돌파!", lose: "조금 모자랐어요", result: "{0}m · {1}점",
    again: "다시 하기", next: "다음 단계", pop: "도약!", early: "너무 일찍 일어섰어요", m: "{0}m",
    land: { telemark: "텔레마크 착지!", clean: "착지", fall: "넘어졌어요" },
    help: "스키점프 대회에 나가요. 화면을 꾹 누르고 있으면 몸을 웅크려 도약대를 빠르게 내려가고, 도약대 끝(빨간 끝)에서 손을 떼면 힘차게 뛰어올라요. 너무 일찍 떼면 그냥 일어서 버리니 다시 누르세요. 공중에서는 누르고 있으면 몸을 앞으로 숙이고, 떼면 몸을 세워요. 오른쪽 막대의 초록 칸 안에 몸 각도를 유지해야 바람을 타고 멀리 날아요. 땅에 닿기 직전에 한 번 더 누르면 텔레마크 착지로 자세 점수를 더 받아요. K점에 닿으면 60점, 1m마다 2점이 더해지거나 빠져요. 뒤로 갈수록 언덕이 커지고 맞바람·뒷바람과 돌풍이 몸 각도를 흔들어요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0} · K{1}", goal: "Mark {0} pts", wind: "Wind {0}", start: "Hold to tuck, let go at the end of the ramp!", win: "Past the mark!", lose: "Just short", result: "{0} m · {1} pts",
    again: "Jump again", next: "Next stage", pop: "Spring!", early: "Stood up too early", m: "{0} m",
    land: { telemark: "Telemark landing!", clean: "Landed", fall: "Fell over" },
    help: "Jump at a ski-jumping meet. Hold the screen to crouch into a tuck and speed down the in-run, then let go right at the end of the table (the red tip) to spring off. Let go too early and you just stand up, so press again. In the air, hold to lean forward over your skis and let go to sit up: keep your body angle inside the green band on the right gauge and the air carries you far. Press once more just before touchdown for a telemark landing and better style points. Reaching the K-point is worth 60 points, and each metre past or short of it adds or takes 2. Later hills are bigger, with head and tail winds and gusts that push your body angle around.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面 · K{1}", goal: "目標 {0}点", wind: "風 {0}", start: "長押しでかがみ、踏切の端で指を離そう！", win: "目標突破！", lose: "あと少し", result: "{0}m · {1}点",
    again: "もう一度", next: "次の面", pop: "踏切！", early: "立ち上がるのが早すぎた", m: "{0}m",
    land: { telemark: "テレマーク着地！", clean: "着地", fall: "転倒" },
    help: "スキージャンプ大会に出場。画面を長押しするとクラウチング姿勢で助走路を速く下り、踏切台の端(赤い先)で指を離すと力強く飛び出します。早く離しすぎるとただ立ち上がってしまうので、もう一度押しましょう。空中では押している間は体を前に倒し、離すと起こします。右のゲージの緑の帯の中に体の角度を保つと、風に乗って遠くまで飛べます。着地の直前にもう一度押すとテレマーク着地で飛型点が上がります。K点到達で60点、1mごとに2点が加算・減算。後半はヒルが大きくなり、向かい風・追い風と突風が体の角度を揺らします。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关 · K{1}", goal: "目标 {0}分", wind: "风 {0}", start: "按住下蹲，到跳台尽头松手！", win: "超过目标分！", lose: "差一点点", result: "{0}米 · {1}分",
    again: "再跳一次", next: "下一关", pop: "起跳！", early: "站起来太早了", m: "{0}米",
    land: { telemark: "弓步落地！", clean: "落地", fall: "摔倒了" },
    help: "参加跳台滑雪比赛。按住屏幕就会蹲成团身姿势加速滑下助滑道，在跳台尽头（红色末端）松手就会有力地起跳。松得太早只会站起来，再按住即可。空中按住身体前倾，松开身体直起。把身体角度保持在右侧量表的绿色区间内，就能乘风飞得更远。落地前一刻再按一次，就是弓步式（telemark）落地，姿势分更高。到达K点得60分，每多或少1米加减2分。越往后跳台越大，还有逆风、顺风和阵风扰动身体角度。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0} · K{1}", goal: "Objectif {0} pts", wind: "Vent {0}", start: "Maintenez pour vous accroupir, lâchez au bout du tremplin !", win: "Objectif dépassé !", lose: "Juste un peu court", result: "{0} m · {1} pts",
    again: "Resauter", next: "Niveau suivant", pop: "Impulsion !", early: "Relevé trop tôt", m: "{0} m",
    land: { telemark: "Réception en télémark !", clean: "Réception", fall: "Chute" },
    help: "Participez à un concours de saut à ski. Maintenez l'écran pour vous accroupir et prendre de la vitesse sur l'élan, puis lâchez juste au bout de la table (la pointe rouge) pour vous propulser. Trop tôt, vous vous relevez simplement : appuyez à nouveau. En l'air, maintenez pour vous pencher sur vos skis et lâchez pour vous redresser : gardez l'angle du corps dans la bande verte de la jauge de droite et l'air vous porte loin. Appuyez encore juste avant de toucher la neige pour une réception en télémark et plus de points de style. Atteindre le point K vaut 60 points, et chaque mètre au-delà ou en deçà ajoute ou retire 2 points. Plus loin, les tremplins grandissent, avec vents de face, de dos et rafales qui bousculent votre angle.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0} · K{1}", goal: "Meta {0} pts", wind: "Viento {0}", start: "Mantén para agacharte, ¡suelta al final de la rampa!", win: "¡Superaste la marca!", lose: "Faltó poquito", result: "{0} m · {1} pts",
    again: "Saltar otra vez", next: "Siguiente nivel", pop: "¡Impulso!", early: "Te levantaste antes de tiempo", m: "{0} m",
    land: { telemark: "¡Aterrizaje telemark!", clean: "Aterrizaje", fall: "Caída" },
    help: "Compite en un concurso de saltos de esquí. Mantén pulsada la pantalla para agacharte y bajar rápido por la rampa, y suelta justo al final de la mesa (la punta roja) para impulsarte. Si sueltas antes, solo te pones de pie: vuelve a pulsar. En el aire, mantén pulsado para inclinarte sobre los esquís y suelta para erguirte: mantén el ángulo del cuerpo dentro de la franja verde del medidor de la derecha y el aire te llevará lejos. Pulsa otra vez justo antes de tocar la nieve para un aterrizaje telemark y más puntos de estilo. Llegar al punto K vale 60 puntos, y cada metro de más o de menos suma o resta 2. Más adelante los trampolines crecen, con viento de cara, de cola y ráfagas que mueven tu ángulo.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ski-jump:muted";
const W = 360;
const H = 560;
const PX = 5; // px per metre

const TUCK: PixelArt = {
  palette: { k: "#212529", r: "#e03131", w: "#f8f9fa", b: "#1c7ed6", s: "#f1c27d", y: "#ffd43b" },
  rows: ["....rrr...", "...rrrrr..", "...sss....", "..bbbbbb..", ".bbbbbbbb.", "..bbbbbbb.", "...bbbbb..", "kkkkkkkkkk"],
};
const FLY: PixelArt = {
  palette: { k: "#212529", r: "#e03131", b: "#1c7ed6", s: "#f1c27d", y: "#ffd43b" },
  rows: ["k..........", ".k...rr....", "..k.rrrs...", "...bbbbbb..", "....bbbbbbb", ".....k.....", "......k....", ".......k..."],
};
const FLAG: PixelArt = { palette: { r: "#e03131", w: "#ffffff", k: "#495057" }, rows: ["krrrw", "krrw.", "krw..", "k....", "k....", "k...."] };
const PINE: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1e5f2c", w: "#ffffff", t: "#6b4423" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t..."],
};

interface Pop { text: string; t: number; color: string }

export default function SkiJump({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; dist: number; points: number; landing: Landing }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jRef = useRef<Jump>(newJump(HILLS[0]));
  const started = useRef(false);
  const pressQ = useRef<Array<"down" | "up">>([]);
  const cam = useRef({ x: 0, y: 0 });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const hill = HILLS[stage];

  useRunRecord(SKI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    jRef.current = newJump(HILLS[st]);
    started.current = false;
    pressQ.current = [];
    parts.current = [];
    pops.current = [];
    cam.current = { x: 0, y: 0 };
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SKI_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
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
      const j = jRef.current;
      const h = j.hill;
      // the button is read once per frame, in order
      for (const e of pressQ.current.splice(0)) {
        if (e === "down") {
          hold(j, true);
          if (j.phase === "flight") tap(j);
        } else {
          hold(j, false);
          if (j.phase === "inrun" && started.current) {
            const r = tap(j);
            if (r === "pop") {
              pops.current.push({ text: copyRef.current.pop, t: 0.8, color: "#1c7ed6" });
              sfx("combo");
            } else if (r === "early") pops.current.push({ text: copyRef.current.early, t: 0.9, color: "#868e96" });
          }
        }
      }
      if (started.current && !j.over) {
        const ev = stepJump(j, dt);
        if (ev.missedLip) pops.current.push({ text: copyRef.current.early, t: 0.9, color: "#868e96" });
        if (ev.landed) {
          const good = ev.landed !== "fall";
          pops.current.push({ text: copyRef.current.land[ev.landed], t: 1.4, color: good ? "#2f9e44" : "#e03131" });
          spawnBurst(parts.current, W * 0.35, H * 0.55, ["#ffffff", "#d0ebff"], 24, 140, Math.floor(now));
          setOver({ won: j.won, stars: starsFor(j), dist: j.distance, points: j.points, landing: j.landing });
          if (j.won) {
            setCleared(markStageCleared(SKI_SLUG, h.stage, STAGE_COUNT));
            sfx("win");
          } else sfx(good ? "lose" : "fail");
        }
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      // world (metres): the lip at (0,0), x along the hill, y up
      const sin35 = Math.sin((35 * Math.PI) / 180);
      const cos35 = Math.cos((35 * Math.PI) / 180);
      const pos = j.phase === "inrun" ? { x: -(h.inrun - j.s) * cos35, y: (h.inrun - j.s) * sin35 } : { x: j.x, y: j.y };
      const want = { x: pos.x - (W * 0.35) / PX, y: pos.y + (H * 0.45) / PX };
      cam.current.x += (want.x - cam.current.x) * Math.min(1, dt * 5);
      cam.current.y += (want.y - cam.current.y) * Math.min(1, dt * 5);
      if (!started.current) cam.current = want;
      const X = (mx: number) => (mx - cam.current.x) * PX;
      const Y = (my: number) => (cam.current.y - my) * PX;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#74c0fc");
        g.addColorStop(1, "#e7f5ff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // far mountains (slow parallax)
        ctx.fillStyle = "#c5d8ea";
        for (let k = -2; k < 6; k++) {
          const mx = k * 160 - ((cam.current.x * PX * 0.2) % 160);
          ctx.beginPath();
          ctx.moveTo(mx - 120, H);
          ctx.lineTo(mx, H * 0.35 + (k % 2) * 30);
          ctx.lineTo(mx + 120, H);
          ctx.fill();
        }
        // in-run ramp
        ctx.strokeStyle = "#8a5a3b";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(X(-h.inrun * cos35), Y(h.inrun * sin35));
        ctx.lineTo(X(0), Y(0));
        ctx.stroke();
        ctx.fillStyle = "#e03131";
        ctx.fillRect(X(0) - 4, Y(0) - 3, 6, 6);
        // the landing hill (snow), from the knoll down to the out-run
        ctx.fillStyle = "#f8fbff";
        ctx.beginPath();
        ctx.moveTo(X(0), Y(-2.5));
        for (let x = 0; x <= h.k * 2.1; x += 2) ctx.lineTo(X(x), Y(groundAt(h.k, x)));
        ctx.lineTo(X(h.k * 2.1), H + 40);
        ctx.lineTo(X(0), H + 40);
        ctx.fill();
        ctx.strokeStyle = "#a5c7e3";
        ctx.lineWidth = 2;
        ctx.stroke();
        // distance marks and the red K line
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        for (let d = 20; d <= h.k * 1.8; d += 10) {
          const gx = X(d);
          const gy = Y(groundAt(h.k, d));
          if (gx < -20 || gx > W + 20) continue;
          const isK = Math.abs(d - h.k) < 5;
          ctx.fillStyle = isK ? "#e03131" : "#1c7ed6";
          ctx.fillRect(gx - 1, gy - 10, isK ? 4 : 2, 14);
          if (d % 20 === 0) ctx.fillText(fill(copyRef.current.m, d), gx, gy + 18);
        }
        const kx = X(h.k);
        const ky = Y(groundAt(h.k, h.k));
        ctx.fillStyle = "#e03131";
        ctx.fillRect(kx - 30, ky - 2, 60, 4);
        ctx.fillText("K", kx, ky - 14);
        for (let d = -40; d < h.k * 2; d += 37) {
          const gx = X(d < 0 ? d - 10 : d);
          if (gx < -20 || gx > W + 20) continue;
          drawSprite(ctx, PINE, gx, Y(d < 0 ? -d * Math.tan((35 * Math.PI) / 180) * 0.6 : groundAt(h.k, d)) - 30, { scale: 3, alpha: 0.85 });
        }
        // the jumper
        if (j.phase === "inrun") drawSprite(ctx, TUCK, X(pos.x), Y(pos.y) - 12, { scale: 3, rotate: (35 * Math.PI) / 180 });
        else {
          const rot = j.landing === "fall" ? 1.2 : ((j.alpha - 20) * Math.PI) / 180 + Math.atan2(-j.vy, j.vx) * (j.over ? 0 : 0.4);
          drawSprite(ctx, FLY, X(pos.x), Y(pos.y) - 10, { scale: 3, rotate: rot });
        }
        drawParticles(ctx, parts.current);
        // wind flag and the body-angle gauge
        if (h.wind) {
          drawSprite(ctx, FLAG, W - 70, 36, { scale: 4, flipX: h.wind < 0 });
          ctx.fillStyle = "#212529";
          ctx.textAlign = "left";
          ctx.fillText(`${h.wind > 0 ? "←" : "→"} ${Math.abs(h.wind).toFixed(1)}`, W - 56, 34);
        }
        const gx = W - 26;
        const gt = 120;
        const gb = 400;
        const gy = (a: number) => gt + ((45 - a) / 50) * (gb - gt);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(gx, gt, 14, gb - gt);
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(gx, gy(BAND_C + BAND_W), 14, gy(BAND_C - BAND_W) - gy(BAND_C + BAND_W));
        if (j.phase === "flight") {
          const inBand = Math.abs(j.alpha - BAND_C) <= BAND_W;
          ctx.fillStyle = inBand ? "#2f9e44" : "#e03131";
          ctx.fillRect(gx - 4, Math.round(gy(j.alpha)) - 3, 22, 6);
        }
        // in-run: how close the lip is
        if (j.phase === "inrun" && started.current) {
          const left = (h.inrun - j.s) / Math.max(1, j.v);
          ctx.fillStyle = left <= POP_WINDOW ? "#2f9e44" : "rgba(33,37,41,0.35)";
          ctx.fillRect(16, H - 30, Math.max(0, Math.min(1, 1 - left / 2)) * (W - 32), 8);
        }
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(p.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 92 - (1.4 - p.t) * 10 - 22, w, 30);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, W / 2, 92 - (1.4 - p.t) * 10);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const down = useCallback(() => {
    if (jRef.current.over) return;
    if (!started.current) {
      started.current = true;
      setTouched(true);
    }
    pressQ.current.push("down");
  }, []);
  const up = useCallback(() => {
    if (started.current) pressQ.current.push("up");
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
      data-game="ski-jump"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1, hill.k)}</Badge>
        <Badge variant="outline">{fill(c.goal, hill.goal)}</Badge>
        {hill.wind ? <Badge variant="outline">{fill(c.wind, `${hill.wind > 0 ? "←" : "→"} ${Math.abs(hill.wind).toFixed(1)}`)}</Badge> : null}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.dist, over.points)}{over.landing ? ` · ${c.land[over.landing]}` : ""}</p>
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
