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
  BURNT, FIELD_H, FIELD_W, GOLDEN, GOLDEN_END, HALF_W, HOTTEOK_SLUG, LEVELS, STAGE_COUNT, SURFACE, THICK, downSide, flick, newGriddle, readyToServe, starsFor, stepGriddle,
  type Griddle, type Hotteok,
} from "../../lib/games/hotteok-flip";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; served: string; lives: string; start: string; win: string; lose: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; burnt: string; splat: string; dropped: string; serve: string; hot: string; pans: string;
}> = {
  ko: {
    stage: "{0}단계", served: "접시 {0}/{1}", lives: "기회 {0}", start: "호떡을 손가락으로 위로 튕겨요", win: "호떡 장사 대성공!", lose: "호떡을 너무 많이 망쳤어요",
    again: "다시 하기", next: "다음 단계", burnt: "탔어요!", splat: "꿀 터짐!", dropped: "떨어졌어요!", serve: "접시로!", hot: "센 불", pans: "철판 {0}칸",
    help: "호떡을 누른 채 위로 휙 튕기면 날아올라요. 가장자리를 튕기면 빙글 돌고, 가운데를 튕기면 그냥 뛰어올라요. 아랫면이 노릇해지면(막대가 금색) 뒤집어 착지시키고, 양면이 다 노릇하면 한 번 더 튕겨 접시로 보내세요. 타거나, 옆으로 서서 떨어져 꿀이 터지거나, 철판 밖으로 떨어지면 망쳐요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", served: "Served {0}/{1}", lives: "Chances {0}", start: "Flick a hotteok upward", win: "Your stall is a hit!", lose: "Too many ruined hotteok",
    again: "Play again", next: "Next stage", burnt: "Burnt!", splat: "Syrup burst!", dropped: "Dropped!", serve: "Plate it!", hot: "Hot spot", pans: "{0} spots",
    help: "Press a hotteok and flick upward to toss it. Flick near the edge and it spins; flick the middle and it just hops. When the bottom turns golden (the bar hits gold), flip it so it lands upside down; once both sides are golden, flick it again to send it to the plate. Burning a side, landing on its edge so the syrup bursts, or dropping it off the griddle ruins it.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}面", served: "お皿 {0}/{1}", lives: "チャンス {0}", start: "ホットクを指で上にはじこう", win: "ホットク屋さん大繁盛！", lose: "ホットクを失敗しすぎた",
    again: "もう一度", next: "次の面", burnt: "焦げた！", splat: "蜜が飛び出た！", dropped: "落ちた！", serve: "お皿へ！", hot: "強火", pans: "鉄板{0}か所",
    help: "ホットクを押して上へはじくと宙に飛びます。端をはじくとくるっと回り、真ん中をはじくと跳ねるだけ。下の面がこんがり（バーが金色）になったら裏返して着地させ、両面こんがりならもう一度はじいてお皿へ。焦がす、縦に落ちて蜜が飛び出す、鉄板の外に落とすと失敗です。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}关", served: "装盘 {0}/{1}", lives: "机会 {0}", start: "用手指把糖饼往上弹", win: "糖饼摊生意火爆！", lose: "毁掉的糖饼太多了",
    again: "再玩一次", next: "下一关", burnt: "糊了！", splat: "糖浆爆了！", dropped: "掉了！", serve: "装盘！", hot: "猛火", pans: "{0}个位置",
    help: "按住糖饼往上一弹，它就会飞起来。弹边缘会转圈，弹中间只会跳起来。底面变金黄（进度条到金色）时把它翻面落下；两面都金黄后再弹一次送进盘子。烤糊、立着落下导致糖浆爆出、或掉出铁板都算失败。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", served: "Servis {0}/{1}", lives: "Essais {0}", start: "Pichenette vers le haut sur un hotteok", win: "Votre stand cartonne !", lose: "Trop de hotteok ratés",
    again: "Rejouer", next: "Niveau suivant", burnt: "Brûlé !", splat: "Sirop explosé !", dropped: "Tombé !", serve: "À l'assiette !", hot: "Point chaud", pans: "{0} places",
    help: "Appuyez sur un hotteok et donnez une pichenette vers le haut pour le lancer. Près du bord il tourne, au milieu il saute seulement. Quand le dessous est doré (la barre atteint l'or), retournez-le pour qu'il retombe à l'envers ; quand les deux faces sont dorées, lancez-le encore pour l'envoyer dans l'assiette. Une face brûlée, une chute sur la tranche qui fait jaillir le sirop ou une chute hors de la plaque le gâchent.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", served: "Servidos {0}/{1}", lives: "Intentos {0}", start: "Lanza un hotteok hacia arriba con el dedo", win: "¡Tu puesto es un éxito!", lose: "Demasiados hotteok arruinados",
    again: "Otra vez", next: "Siguiente nivel", burnt: "¡Quemado!", splat: "¡Reventó el sirope!", dropped: "¡Se cayó!", serve: "¡Al plato!", hot: "Fuego fuerte", pans: "{0} huecos",
    help: "Pulsa un hotteok y desliza hacia arriba para lanzarlo. Cerca del borde gira; en el centro solo salta. Cuando la cara de abajo esté dorada (la barra llega al oro), dale la vuelta para que caiga boca abajo; cuando ambas caras estén doradas, lánzalo otra vez al plato. Quemar una cara, caer de canto y reventar el sirope o tirarlo fuera de la plancha lo arruina.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:hotteok-flip:muted";
const PLATE = { x: 296, y: 150 };

const LAMP: PixelArt = {
  palette: { k: "#2b2b30", y: "#ffd43b", w: "#fff9db", o: "#f08c00" },
  rows: ["...kk...", "...kk...", ".kkkkkk.", "kooooook", ".yywwyy.", "..yyyy.."],
};
const PLATE_ART: PixelArt = {
  palette: { w: "#f8f9fa", g: "#ced4da", b: "#4dabf7" },
  rows: ["..wwwwwwwwwwww..", "wwgggggggggggggww", ".wwbwwwwwwwwbww.", "...wwwwwwwwww..."],
};

const SKY: BackdropSpec = { sky: ["#141b38", "#1f2a52", "#2f3d6b"], stars: 0.35, starColor: "#dee2e6", seed: 44 };

function doughColor(v: number): string {
  if (v < 0.35) return "#f3e6c8";
  if (v < 0.7) return "#f0d39a";
  if (v < GOLDEN) return "#ebbd6a";
  if (v < GOLDEN_END) return "#d9902f";
  if (v < BURNT) return "#9c5b23";
  return "#3b2414";
}

interface Pop { x: number; y: number; text: string; t: number; color: string }
interface Flight { x0: number; y0: number; t: number }

export default function HotteokFlip({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ served: 0, ruined: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<Griddle>(newGriddle(0));
  const press = useRef<null | { id: number; cake: number; offset: number; samples: Array<{ x: number; y: number; t: number }> }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const flights = useRef<Flight[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const level = LEVELS[stage];
  useRunRecord(HOTTEOK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    gRef.current = newGriddle(s);
    press.current = null;
    parts.current = [];
    pops.current = [];
    flights.current = [];
    setTouched(false);
    setOver(null);
    setHud({ served: 0, ruined: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(HOTTEOK_SLUG, STAGE_COUNT);
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
      const g = gRef.current;
      const l = g.level;
      if (touched && !g.over) {
        const before = g.cakes.map((h) => h.fate);
        const ev = stepGriddle(g, dt);
        g.cakes.forEach((h, i) => {
          if (before[i] !== "ruined" && h.fate === "ruined") {
            const text = h.why === "burnt" ? c.burnt : h.why === "splat" ? c.splat : c.dropped;
            pops.current.push({ x: Math.max(50, Math.min(FIELD_W - 50, h.x)), y: SURFACE - 50, text, t: 1.2, color: "#ff8787" });
            spawnBurst(parts.current, h.x, SURFACE - 8, h.why === "burnt" ? ["#495057", "#868e96", "#343a40"] : ["#f08c00", "#ffd43b", "#9c5b23"], 16, 120, h.id * 17);
          }
          if (before[i] === "air" && h.fate === "cooking") spawnBurst(parts.current, h.x, SURFACE - 4, ["#ffffff", "#ffe8cc"], 6, 60, h.id * 7);
        });
        if (ev.ruined) sfx("fail");
        if (ev.landed) sfx("place");
        if (ev.ruined || ev.spawned) setHud({ served: g.served, ruined: g.ruined });
        if (g.over) {
          setHud({ served: g.served, ruined: g.ruined });
          setOver({ won: g.won, stars: starsFor(g) });
          if (g.won) {
            setCleared(markStageCleared(HOTTEOK_SLUG, l.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 140);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      flights.current = flights.current.filter((f) => (f.t += dt) < 0.6);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKY, 4);
        // stall roof and lamps
        ctx.fillStyle = "#c92a2a";
        for (let x = 0; x < FIELD_W; x += 40) {
          ctx.fillRect(x, 60, 40, 22);
          ctx.fillStyle = ctx.fillStyle === "#c92a2a" ? "#f8f9fa" : "#c92a2a";
        }
        ctx.fillStyle = "#e9ecef";
        for (let x = 0; x < FIELD_W; x += 20) ctx.fillRect(x, 82, 12, 6);
        drawSprite(ctx, LAMP, 90, 110, { scale: 4 });
        drawSprite(ctx, LAMP, 270, 110, { scale: 4 });
        const glow = ctx.createRadialGradient(180, 320, 20, 180, 320, 260);
        glow.addColorStop(0, "rgba(255,212,59,0.22)");
        glow.addColorStop(1, "rgba(255,212,59,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 100, FIELD_W, 420);
        // plate with the served stack
        drawSprite(ctx, PLATE_ART, PLATE.x, PLATE.y + 8, { scale: 3 });
        for (let k = 0; k < Math.min(8, g.served); k++) {
          ctx.fillStyle = "#d9902f";
          ctx.fillRect(PLATE.x - 22, PLATE.y - 4 - k * 6, 44, 5);
          ctx.fillStyle = "#9c5b23";
          ctx.fillRect(PLATE.x - 22, PLATE.y - k * 6, 44, 1);
        }
        // counter, griddle, burner
        ctx.fillStyle = "#6b4426";
        ctx.fillRect(0, SURFACE + 40, FIELD_W, FIELD_H - SURFACE - 40);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(0, SURFACE + 40, FIELD_W, 6);
        for (let x = l.pan[0] + 10; x < l.pan[1] - 10; x += 14) {
          const h = 6 + Math.round(Math.sin(now / 80 + x) * 3);
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(x, SURFACE + 36 - h, 6, h);
          ctx.fillStyle = "#a5d8ff";
          ctx.fillRect(x + 2, SURFACE + 36 - h + 2, 2, h - 2);
        }
        ctx.fillStyle = "#343a40";
        ctx.fillRect(l.pan[0], SURFACE, l.pan[1] - l.pan[0], 14);
        ctx.fillStyle = "#495057";
        ctx.fillRect(l.pan[0], SURFACE, l.pan[1] - l.pan[0], 3);
        if (l.hot >= 0) {
          ctx.fillStyle = "rgba(255,107,107,0.55)";
          ctx.fillRect(l.slots[l.hot] - 40, SURFACE + 3, 80, 4);
        }
        // hotteok
        const drawCake = (h: Hotteok) => {
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(h.angle);
          const w = HALF_W * 2;
          ctx.fillStyle = doughColor(h.cook[1]);
          ctx.fillRect(-HALF_W, -THICK / 2, w, 4);
          ctx.fillStyle = "#f3e6c8";
          ctx.fillRect(-HALF_W + 2, -THICK / 2 + 4, w - 4, 4);
          ctx.fillStyle = "#7b4a1e";
          for (let k = -24; k <= 20; k += 11) ctx.fillRect(k, -THICK / 2 + 5, 3, 2);
          ctx.fillStyle = doughColor(h.cook[0]);
          ctx.fillRect(-HALF_W, -THICK / 2 + 8, w, 4);
          ctx.restore();
        };
        for (const h of g.cakes) {
          if (h.fate === "served") continue;
          if (h.fate === "ruined") {
            if (h.t < 0.8) {
              ctx.globalAlpha = 1 - h.t / 0.8;
              drawCake({ ...h, y: h.y + (h.why === "dropped" ? h.t * 200 : 0) });
              ctx.globalAlpha = 1;
            }
            continue;
          }
          drawCake(h);
          if (h.fate === "cooking") {
            // doneness bar for the side on the griddle
            const side = downSide(h.angle);
            const v = h.cook[side];
            const bx = Math.round(h.x - 26);
            const by = SURFACE - 34;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(bx - 2, by - 2, 56, 10);
            const sx = (u: number) => bx + Math.round((Math.min(BURNT, u) / BURNT) * 52);
            ctx.fillStyle = "#f3e6c8";
            ctx.fillRect(bx, by, sx(GOLDEN) - bx, 6);
            ctx.fillStyle = "#fab005";
            ctx.fillRect(sx(GOLDEN), by, sx(GOLDEN_END) - sx(GOLDEN), 6);
            ctx.fillStyle = "#9c5b23";
            ctx.fillRect(sx(GOLDEN_END), by, sx(BURNT) - sx(GOLDEN_END), 6);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sx(v) - 1, by - 3, 3, 12);
            // the side facing up: a small chip
            ctx.fillStyle = doughColor(h.cook[1 - side]);
            ctx.fillRect(bx + 54, by - 1, 6, 8);
            if (readyToServe(h)) {
              ctx.font = "bold 13px sans-serif";
              ctx.textAlign = "center";
              ctx.fillStyle = "#ffd43b";
              ctx.fillText(c.serve, h.x, by - 8 - Math.abs(Math.sin(now / 200)) * 4);
            }
            // steam
            if (Math.floor(now / 120 + h.id) % 5 === 0) spawnBurst(parts.current, h.x + (Math.random() - 0.5) * 40, h.y - 8, ["rgba(255,255,255,0.6)"], 1, 20, Math.floor(now));
          }
        }
        for (const f of flights.current) {
          const t = f.t / 0.6;
          const x = f.x0 + (PLATE.x - f.x0) * t;
          const y = f.y0 + (PLATE.y - f.y0) * t - Math.sin(t * Math.PI) * 120;
          ctx.fillStyle = "#d9902f";
          ctx.fillRect(Math.round(x) - 22, Math.round(y) - 3, 44, 6);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 15px sans-serif";
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (1.2 - p.t) * 20);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.burnt, c.dropped, c.serve, c.splat, sfx, touched]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gRef.current;
    if (g.over || press.current) return;
    const p = toField(e);
    setTouched(true);
    // generous grab area: the hotteok and the air just above it
    let best: Hotteok | null = null;
    for (const h of g.cakes) {
      if (h.fate !== "cooking") continue;
      if (Math.abs(p.x - h.x) <= HALF_W + 12 && p.y > SURFACE - 90 && p.y < SURFACE + 40) {
        if (!best || Math.abs(p.x - h.x) < Math.abs(p.x - best.x)) best = h;
      }
    }
    if (!best) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { id: e.pointerId, cake: best.id, offset: (p.x - best.x) / HALF_W, samples: [{ ...p, t: performance.now() }] };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    const now = performance.now();
    pr.samples.push({ ...toField(e), t: now });
    while (pr.samples.length > 2 && now - pr.samples[0].t > 100) pr.samples.shift();
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    const now = performance.now();
    const p = { ...toField(e), t: now };
    const first = pr.samples.find((s) => now - s.t <= 100) ?? pr.samples[0];
    const dt = Math.max(0.016, (p.t - first.t) / 1000);
    const vx = (p.x - first.x) / dt;
    const vy = (p.y - first.y) / dt;
    const g = gRef.current;
    const h = g.cakes.find((x) => x.id === pr.cake);
    const result = flick(g, pr.cake, pr.offset, vx, vy);
    if (result === "served" && h) {
      flights.current.push({ x0: h.x, y0: h.y, t: 0 });
      setHud({ served: g.served, ruined: g.ruined });
      sfx("success");
    } else if (result === "flipped") sfx("tap");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const livesLeft = Math.max(0, level.lives - hud.ruined);
  return (
    <div
      ref={containerRef}
      data-game="hotteok-flip"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.served, hud.served, level.count)}</Badge>
        <Badge variant="outline">{fill(c.lives, "♥".repeat(livesLeft) || "0")}</Badge>
        {level.slots.length > 1 ? <Badge variant="outline">{fill(c.pans, level.slots.length)}</Badge> : null}
        {level.hot >= 0 ? <Badge variant="outline">{c.hot}</Badge> : null}
        <div className="ml-auto flex gap-1">
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
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.served, hud.served, level.count)}</p>
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
