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
import { RESCUE_SLUG, RESCUE_STAGES, STAGE_COUNT, beepGap, dig, newRescue, reading, starsFor, stepRescue, stop, walkTo, type Rescue, type RescueStage } from "../../lib/games/avalanche-rescue";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; air: string; found: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; dist: string; noSignal: string; dug: string; digHere: string;
}> = {
  ko: {
    stage: "{0}단계", air: "남은 공기 {0}초", found: "구조 {0}/{1}", start: "눈밭을 눌러 걷고, 구조대원을 꾹 눌러 파요!", win: "모두 구조했어요!", lose: "공기가 다 떨어졌어요", result: "{0}초 · 구조 {1}명",
    again: "다시 하기", next: "다음 단계", dist: "{0}m", noSignal: "신호 없음 — 위로 올라가요", dug: "찾았다!", digHere: "여기서 꾹 눌러 파요",
    help: "눈사태에 묻힌 스키어를 구조해요. 묻힌 사람은 신호기를 차고 있어요. 내 수신기는 가장 가까운 신호 쪽 화살표와 거리를 보여 주고, 가까울수록 삐삐 소리가 빨라져요. 멀리서는 화살표가 흔들려요. 눈밭 아무 데나 누르면 그쪽으로 걷고, 구조대원을 꾹 누르고 있으면 그 자리를 파요. 바로 위(1.5m 안)에서만 파야 닿아요. 한 명을 꺼내면 수신기가 다음 신호를 잡아요. 공기가 떨어지기 전에 모두 구하면 통과예요. 키보드는 방향키로 걷고 스페이스로 파요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", air: "Air {0}s", found: "Found {0}/{1}", start: "Tap the snow to walk; hold on the rescuer to dig!", win: "Everyone is out!", lose: "The air ran out", result: "{0}s · {1} rescued",
    again: "Search again", next: "Next stage", dist: "{0} m", noSignal: "No signal: head up the slide", dug: "Found them!", digHere: "Hold on the rescuer to dig here",
    help: "Rescue skiers buried in an avalanche. They wear transceivers. Yours shows an arrow and the distance to the nearest signal, and beeps faster the closer you get; far away the arrow wavers. Tap anywhere on the snow to walk there; hold on the rescuer to dig where you stand. Digging only reaches someone right below you (within 1.5 m). Dig one out and your transceiver picks up the next signal. Find everyone before the air runs out. Keyboard: arrows to walk, Space to dig.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", air: "残りの空気 {0}秒", found: "救助 {0}/{1}", start: "雪原をタップで歩き、救助隊員を長押しで掘ろう！", win: "全員救助した！", lose: "空気が尽きた", result: "{0}秒 · 救助 {1}人",
    again: "もう一度", next: "次の面", dist: "{0}m", noSignal: "信号なし：斜面を上ろう", dug: "見つけた！", digHere: "隊員を長押しでここを掘る",
    help: "雪崩に埋まったスキーヤーを救助します。埋まった人はビーコンを着けています。あなたの受信機は一番近い信号への矢印と距離を表示し、近いほどピッピッという音が速くなります。遠いと矢印が揺れます。雪原のどこかをタップするとそこへ歩き、救助隊員を長押しするとその場を掘ります。真上(1.5m以内)を掘らないと届きません。一人掘り出すと受信機が次の信号をとらえます。空気が尽きる前に全員を救えばクリア。キーボードは矢印キーで歩き、スペースで掘ります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", air: "剩余空气 {0}秒", found: "救出 {0}/{1}", start: "点雪地走过去，按住救援员挖！", win: "全部救出来了！", lose: "空气耗尽了", result: "{0}秒 · 救出 {1}人",
    again: "再搜一次", next: "下一关", dist: "{0}米", noSignal: "没有信号：往坡上走", dug: "找到了！", digHere: "按住救援员在这里挖",
    help: "救出被雪崩掩埋的滑雪者。被埋的人身上带着信标。你的接收器会显示指向最近信号的箭头和距离，离得越近“哔哔”声越快；离得远时箭头会晃。点雪地任何地方就走过去，按住救援员就在原地挖。只有在正上方（1.5米内）挖才能挖到。挖出一个人后，接收器会接收下一个信号。在空气耗尽前救出所有人就过关。键盘用方向键走，空格挖。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", air: "Air {0} s", found: "Trouvés {0}/{1}", start: "Touchez la neige pour marcher ; maintenez sur le secouriste pour creuser !", win: "Tout le monde est sorti !", lose: "L'air est épuisé", result: "{0} s · {1} secourus",
    again: "Chercher à nouveau", next: "Niveau suivant", dist: "{0} m", noSignal: "Pas de signal : remontez la coulée", dug: "Trouvé !", digHere: "Maintenez sur le secouriste pour creuser ici",
    help: "Secourez des skieurs ensevelis par une avalanche. Ils portent des DVA. Le vôtre affiche une flèche et la distance vers le signal le plus proche, et bipe plus vite à mesure que vous approchez ; de loin, la flèche hésite. Touchez la neige pour y marcher ; maintenez sur le secouriste pour creuser sur place. Creuser n'atteint quelqu'un que juste en dessous (à moins de 1,5 m). Une fois l'un dégagé, votre DVA capte le signal suivant. Trouvez tout le monde avant que l'air s'épuise. Clavier : flèches pour marcher, Espace pour creuser.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", air: "Aire {0} s", found: "Rescatados {0}/{1}", start: "¡Toca la nieve para caminar y mantén sobre el rescatista para cavar!", win: "¡Todos fuera!", lose: "Se acabó el aire", result: "{0} s · {1} rescatados",
    again: "Buscar otra vez", next: "Siguiente nivel", dist: "{0} m", noSignal: "Sin señal: sube por la avalancha", dug: "¡Encontrado!", digHere: "Mantén sobre el rescatista para cavar aquí",
    help: "Rescata a esquiadores enterrados por una avalancha. Llevan ARVA. El tuyo muestra una flecha y la distancia a la señal más cercana, y pita más rápido cuanto más te acercas; de lejos la flecha vacila. Toca la nieve para caminar hasta allí; mantén sobre el rescatista para cavar donde estás. Solo llegas a alguien justo debajo (a menos de 1,5 m). Al sacar a uno, tu ARVA capta la siguiente señal. Encuentra a todos antes de que se acabe el aire. Teclado: flechas para caminar, Espacio para cavar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:avalanche-rescue:muted";
const W = 360;
const H = 560;
const TOP = 70; // the map starts below the HUD

const RESCUER: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#f1c27d", y: "#fab005", g: "#868e96" },
  rows: ["..kkk...", ".krrrk..", ".kssk...", "rrrrrr..", "rryrrr.g", "rrrrrrg.", ".kk.kk..", ".k...k.."],
};
const SKIER: PixelArt = {
  palette: { k: "#212529", b: "#1971c2", s: "#f1c27d", y: "#fab005" },
  rows: ["..yy..", ".ksk..", "bbbbb.", "bbbbbb", ".b..b.", "kk..kk"],
};

interface Pop { text: string; t: number; color: string }

// field metres <-> canvas px: the view follows the rescuer at 12 px a metre
const K = 12;
const CAM = { x: 0, y: 0 };
const toPx = (_s: RescueStage, x: number, y: number) => ({ x: W / 2 + (x - CAM.x) * K, y: H * 0.58 - (y - CAM.y) * K });

export default function AvalancheRescue({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number; found: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Rescue>(newRescue(RESCUE_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<{ kind: "walk"; x: number; y: number } | { kind: "dig" } | { kind: "stop" }>>([]);
  const beepT = useRef(0);
  const flash = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = RESCUE_STAGES[stage];

  useRunRecord(RESCUE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    rRef.current = newRescue(RESCUE_STAGES[s]);
    CAM.x = rRef.current.x;
    CAM.y = rRef.current.y;
    started.current = false;
    input.current = [];
    beepT.current = 0;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(RESCUE_SLUG, STAGE_COUNT);
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
      const r = rRef.current;
      const s = r.stage;
      const cp = copyRef.current;
      // commands are read once per frame
      for (const e of input.current.splice(0)) {
        started.current = true;
        if (e.kind === "walk") walkTo(r, e.x, e.y);
        else if (e.kind === "dig") dig(r);
        else stop(r);
      }
      if (started.current && !r.over) {
        const ev = stepRescue(r, dt);
        const rd = reading(r);
        if (rd && (beepT.current -= dt) <= 0) {
          beepT.current = beepGap(rd.dist);
          flash.current = 0.12;
          cues.current?.play("tap");
        }
        if (r.digging && Math.floor(r.t * 6) !== Math.floor((r.t - dt) * 6)) {
          const p = toPx(s, r.x, r.y);
          spawnBurst(parts.current, p.x, p.y, ["#ffffff", "#dbe4ff"], 4, 60, Math.floor(r.t * 1000));
        }
        if (ev === "found" || (ev === "end" && r.won)) {
          pops.current.push({ text: cp.dug, t: 1, color: "#2f9e44" });
          sfx("success");
        }
        if (ev === "end") {
          setOver({ won: r.won, stars: starsFor(r), time: r.t, found: r.found.filter(Boolean).length });
          if (r.won) {
            setCleared(markStageCleared(RESCUE_SLUG, s.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      flash.current = Math.max(0, flash.current - dt);
      CAM.x += (r.x - CAM.x) * Math.min(1, dt * 4);
      CAM.y += (r.y - CAM.y) * Math.min(1, dt * 4);
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1c3d6b";
        ctx.fillRect(0, 0, W, H);
        // the avalanche debris field, with rough blocks of snow
        const tl = toPx(s, 0, s.h);
        ctx.fillStyle = "#f1f5fa";
        ctx.fillRect(tl.x, tl.y, s.w * K, s.h * K);
        ctx.fillStyle = "#dbe4ef";
        for (let i = 0; i < 160; i++) {
          const bx = ((i * 37) % 101) / 101;
          const by = ((i * 61) % 103) / 103;
          const p = toPx(s, bx * s.w, by * s.h);
          if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
          ctx.fillRect(p.x, p.y, 10 + (i % 4) * 5, 6 + (i % 3) * 3);
        }
        // the dug-out skiers
        s.buried.forEach((b, i) => {
          if (!r.found[i]) return;
          const p = toPx(s, b.x, b.y);
          ctx.fillStyle = "#8fa6c2";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.fill();
          drawSprite(ctx, SKIER, p.x, p.y, { scale: 3 });
        });
        // the rescuer, the dig hole and the walk target
        const me = toPx(s, r.x, r.y);
        if (r.target) {
          const tp = toPx(s, r.target.x, r.target.y);
          ctx.strokeStyle = "rgba(28,126,214,0.6)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(me.x, me.y);
          ctx.lineTo(tp.x, tp.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (r.digging) {
          ctx.fillStyle = "#8fa6c2";
          ctx.beginPath();
          ctx.arc(me.x, me.y + 6, 6 + r.dug * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        drawSprite(ctx, RESCUER, me.x, me.y - 8, { scale: 3 });
        // the transceiver: arrow, distance, and a ring that flashes with each beep
        const rd = reading(r);
        ctx.fillStyle = "rgba(33,37,41,0.85)";
        ctx.fillRect(0, 0, W, TOP - 6);
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.air, Math.max(0, s.limit - r.t).toFixed(0)), 12, 24);
        ctx.fillText(fill(cp.found, r.found.filter(Boolean).length, s.buried.length), 12, 48);
        if (flash.current > 0) {
          ctx.strokeStyle = "rgba(250,176,5,0.9)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(me.x, me.y - 8, 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (rd) {
          ctx.save();
          ctx.translate(me.x, me.y - 8);
          ctx.rotate(-rd.bearing);
          ctx.fillStyle = "#e8590c";
          ctx.beginPath();
          ctx.moveTo(44, 0);
          ctx.lineTo(28, -8);
          ctx.lineTo(28, 8);
          ctx.fill();
          ctx.fillRect(14, -2, 16, 4);
          ctx.restore();
          ctx.textAlign = "right";
          ctx.font = "bold 26px sans-serif";
          ctx.fillStyle = rd.dist <= 1.5 ? "#69db7c" : "#ffd43b";
          ctx.fillText(fill(cp.dist, rd.dist.toFixed(1)), W - 14, 40);
          if (rd.dist <= 1.5 && !r.digging) {
            ctx.textAlign = "center";
            ctx.font = "bold 14px sans-serif";
            ctx.fillStyle = "#2f9e44";
            ctx.fillText(cp.digHere, W / 2, TOP + 18);
          }
        } else if (started.current) {
          ctx.textAlign = "right";
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#adb5bd";
          ctx.fillText(cp.noSignal, W - 12, 40);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          const tw = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - tw / 2, 120 - 24, tw, 32);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 120);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const fromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * W) / rect.width;
    const py = ((e.clientY - rect.top) * H) / rect.height;
    return { px, py, x: CAM.x + (px - W / 2) / K, y: CAM.y - (py - H * 0.58) / K };
  };
  const pressing = useRef<"walk" | "dig" | null>(null);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const r = rRef.current;
      if (r.over) return;
      const step: Record<string, [number, number]> = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, 3], ArrowDown: [0, -3] };
      if (step[e.key]) {
        e.preventDefault();
        setTouched(true);
        input.current.push({ kind: "walk", x: r.x + step[e.key][0], y: r.y + step[e.key][1] });
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        setTouched(true);
        input.current.push({ kind: "dig" });
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      input.current.push({ kind: "stop" });
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="avalanche-rescue"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.found, 0, st.buried.length)}</Badge>
        <Badge variant="outline">{st.limit}s</Badge>
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
          onPointerDown={(e) => {
            if (rRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            const p = fromEvent(e);
            const r = rRef.current;
            const me = toPx(r.stage, r.x, r.y);
            if (Math.hypot(p.px - me.x, p.py - (me.y - 8)) <= 22) {
              pressing.current = "dig";
              input.current.push({ kind: "dig" });
            } else {
              pressing.current = "walk";
              input.current.push({ kind: "walk", x: p.x, y: p.y });
            }
          }}
          onPointerMove={(e) => {
            if (pressing.current !== "walk") return;
            const p = fromEvent(e);
            input.current.push({ kind: "walk", x: p.x, y: p.y });
          }}
          onPointerUp={() => {
            if (pressing.current === "dig") input.current.push({ kind: "stop" });
            pressing.current = null;
          }}
          onPointerCancel={() => {
            if (pressing.current === "dig") input.current.push({ kind: "stop" });
            pressing.current = null;
          }}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(0), over.found)}</p>
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
