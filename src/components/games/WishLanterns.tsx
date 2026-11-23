import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FIELD_H, FIELD_W, LANTERN_SLUG, LEVELS, STAGE_COUNT, applyGust, birdPos, newSky, starsFor, stepSky, type Sky, type Vec } from "../../lib/games/wish-lanterns";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; home: string; left: string; start: string; win: string; lose: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; windL: string; windR: string; gusty: string; birds: string; branches: string; out: string;
}> = {
  ko: {
    stage: "{0}단계", home: "달까지 {0}/{1}", left: "남은 등 {0}", start: "하늘을 쓱 그어 바람을 일으켜요", win: "소원등이 달에 닿았어요!", lose: "등불이 모자라요 · {0}/{1}",
    again: "다시 하기", next: "다음 단계", windL: "← 바람", windR: "바람 →", gusty: "돌풍", birds: "새 떼", branches: "솔가지", out: "불이 꺼졌어요",
    help: "등불은 직접 만질 수 없어요. 밤하늘을 손가락으로 쓱 그으면 그은 방향으로 바람이 불어 근처 등불이 밀려나요. 전깃줄 틈으로, 솔가지와 새 떼를 피해 달까지 올려 보내세요. 너무 세게 연달아 불면 촛불이 꺼져요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", home: "To the moon {0}/{1}", left: "{0} to launch", start: "Swipe the sky to make a breeze", win: "Your wishes reached the moon!", lose: "Not enough lanterns · {0}/{1}",
    again: "Play again", next: "Next stage", windL: "← Breeze", windR: "Breeze →", gusty: "Gusts", birds: "Birds", branches: "Pine branches", out: "Flame out",
    help: "You can't touch the lanterns. Swipe across the night sky and a breeze blows the way you swiped, nudging every lantern nearby. Guide them through gaps in the power lines, past pine branches and birds, up to the moon. Blow too hard again and again and the candle goes out.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}面", home: "月まで {0}/{1}", left: "残り {0}個", start: "空をなぞって風を起こそう", win: "願いの灯りが月に届いた！", lose: "灯りが足りない · {0}/{1}",
    again: "もう一度", next: "次の面", windL: "← 風", windR: "風 →", gusty: "突風", birds: "鳥の群れ", branches: "松の枝", out: "火が消えた",
    help: "灯りには直接さわれません。夜空を指でなぞると、なぞった向きに風が吹いて近くの灯りが流されます。電線のすき間を通し、松の枝や鳥をよけて月まで上げましょう。強く何度も吹くとろうそくが消えます。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}关", home: "到达月亮 {0}/{1}", left: "还剩{0}盏", start: "划过夜空吹起一阵风", win: "心愿灯飞到月亮啦！", lose: "灯不够 · {0}/{1}",
    again: "再玩一次", next: "下一关", windL: "← 风", windR: "风 →", gusty: "阵风", birds: "鸟群", branches: "松枝", out: "灯灭了",
    help: "灯不能直接碰。用手指划过夜空，就会顺着划的方向吹起风，把附近的灯推开。引导它们穿过电线的缝隙，避开松枝和鸟群，一直飞到月亮。连续吹得太猛，蜡烛会熄灭。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", home: "Vers la lune {0}/{1}", left: "{0} à lancer", start: "Glissez dans le ciel pour faire du vent", win: "Vos vœux ont atteint la lune !", lose: "Pas assez de lanternes · {0}/{1}",
    again: "Rejouer", next: "Niveau suivant", windL: "← Brise", windR: "Brise →", gusty: "Rafales", birds: "Oiseaux", branches: "Branches de pin", out: "Flamme éteinte",
    help: "On ne touche pas les lanternes. Glissez le doigt dans le ciel nocturne : une brise souffle dans ce sens et pousse les lanternes proches. Faites-les passer entre les fils électriques, éviter les branches de pin et les oiseaux, jusqu'à la lune. Soufflez trop fort encore et encore et la bougie s'éteint.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", home: "A la luna {0}/{1}", left: "Quedan {0}", start: "Desliza por el cielo para hacer viento", win: "¡Tus deseos llegaron a la luna!", lose: "Faltan farolillos · {0}/{1}",
    again: "Otra vez", next: "Siguiente nivel", windL: "← Brisa", windR: "Brisa →", gusty: "Ráfagas", birds: "Pájaros", branches: "Ramas de pino", out: "Se apagó",
    help: "Los farolillos no se tocan. Desliza el dedo por el cielo nocturno y sopla una brisa en esa dirección que empuja los farolillos cercanos. Guíalos entre los cables, esquivando ramas de pino y pájaros, hasta la luna. Si soplas fuerte una y otra vez, la vela se apaga.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:wish-lanterns:muted";

const LANTERN: PixelArt = {
  palette: { r: "#e8590c", o: "#ff922b", y: "#ffd43b", w: "#fff3bf", k: "#5c3d2e" },
  rows: ["..kkkk..", ".orrrro.", "orryyrro", "oryywyro", "oryywyro", "orryyrro", ".orrrro.", "..kkkk..", "...yy..."],
};
const DARK: PixelArt = {
  palette: { r: "#6c5f5b", o: "#8d7f78", k: "#3d3330" },
  rows: ["..kkkk..", ".orrrro.", "orrrrrro", "orrrrrro", "orrrrrro", "orrrrrro", ".orrrro.", "..kkkk.."],
};
const BIRD_A: PixelArt = { palette: { k: "#1b1f3b", w: "#e9ecef" }, rows: ["k.....k", ".k...k.", "..kwk..", "...k..."] };
const BIRD_B: PixelArt = { palette: { k: "#1b1f3b", w: "#e9ecef" }, rows: ["...k...", "..kwk..", ".kk.kk.", "k.....k"] };
const ROOF: PixelArt = {
  palette: { d: "#141a33", g: "#20294a", w: "#ffd43b" },
  rows: ["d..............d", "dd............dd", ".dddddddddddddd.", "..gggggggggggg..", "..gggwwgggwwggg.", "..gggwwgggwwggg.", "..gggggggggggg.."],
};

const SKY: BackdropSpec = { sky: ["#070b24", "#0f1b45", "#22306b"], stars: 0.7, starColor: "#e7f5ff", orb: { x: 0.78, y: 0.1, r: 22, color: "#fff9db", glow: "#ffe066" }, seed: 15 };

interface Trail { x: number; y: number; t: number }

export default function WishLanterns({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ home: 0, left: 0 });
  const [over, setOver] = useState<null | { won: boolean; home: number }>(null);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skyRef = useRef<Sky>(newSky(0));
  const startedRef = useRef(false);
  const stroke = useRef<null | { id: number; last: Vec; t: number; once: Set<number> }>(null);
  const trails = useRef<Trail[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const level = LEVELS[stage];
  useRunRecord(LANTERN_SLUG, Boolean(over?.won), over?.home ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    skyRef.current = newSky(s);
    startedRef.current = false;
    stroke.current = null;
    trails.current = [];
    parts.current = [];
    setStarted(false);
    setOver(null);
    setHud({ home: 0, left: LEVELS[s].count });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(LANTERN_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = skyRef.current;
      const l = s.level;
      if (startedRef.current && !s.over) {
        const ev = stepSky(s, dt);
        if (ev.launched || ev.home) setHud({ home: s.home, left: l.count - s.launched });
        if (ev.home) {
          spawnBurst(parts.current, FIELD_W * 0.78, 40, ["#fff3bf", "#ffd43b", "#ffffff"], 12, 80, Math.floor(now));
          sfx("success");
        }
        if (ev.burnt) {
          for (const ln of s.lanterns) if (ln.fate === "burnt" && ln.age >= 0) {
            spawnBurst(parts.current, ln.x, ln.y, ["#ff922b", "#e8590c", "#ffd43b"], 14, 110, ln.id * 31);
            ln.age = -1;
          }
          sfx("fail");
        }
        if (ev.out) sfx("lose");
        if (s.over) {
          setOver({ won: s.won, home: s.home });
          setHud({ home: s.home, left: l.count - s.launched });
          if (s.won) {
            setCleared(markStageCleared(LANTERN_SLUG, l.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 30);
      trails.current = trails.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKY, 4);
        // wishes already home twinkle as a row of stars by the moon
        for (let k = 0; k < s.home; k++) {
          const x = 40 + k * 22;
          const tw = Math.sin(now / 300 + k) > 0 ? 4 : 2;
          ctx.fillStyle = "#ffe066";
          ctx.fillRect(x - tw / 2, 18 - 1, tw, 2);
          ctx.fillRect(x - 1, 18 - tw / 2, 2, tw);
        }
        // village roofs
        for (let x = -10; x < FIELD_W; x += 60) drawSprite(ctx, ROOF, x + 24, FIELD_H - 14 - ((x / 60) % 2) * 6, { scale: 3 });
        // wires and branches
        for (const g of l.segs) {
          const n = Math.ceil(Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) / 3);
          for (let k = 0; k <= n; k++) {
            const x = g.a.x + ((g.b.x - g.a.x) * k) / n;
            const y = g.a.y + ((g.b.y - g.a.y) * k) / n;
            if (g.kind === "wire") {
              ctx.fillStyle = "#adb5bd";
              ctx.fillRect(Math.round(x), Math.round(y), 3, 2);
            } else {
              ctx.fillStyle = "#6b4426";
              ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
              if (k % 4 === 0) {
                ctx.fillStyle = k % 8 === 0 ? "#2b8a3e" : "#37b24d";
                ctx.fillRect(Math.round(x) - 6, Math.round(y) - 8, 12, 6);
                ctx.fillRect(Math.round(x) - 4, Math.round(y) + 3, 8, 5);
              }
            }
          }
          if (g.kind === "wire") {
            // utility pole stub at the field edge
            const edge = g.a.x < 0 ? g.a : g.b.x > FIELD_W ? g.b : null;
            if (edge) {
              ctx.fillStyle = "#495057";
              ctx.fillRect(edge.x < 0 ? 0 : FIELD_W - 6, edge.y - 10, 6, 20);
            }
          }
        }
        for (const b of l.birds) {
          const p = birdPos(b, s.time);
          const flap = Math.floor(s.time * 6 + b.x0) % 2 === 0;
          for (let k = 0; k < b.span; k++) drawSprite(ctx, flap ? BIRD_A : BIRD_B, p.x - Math.sign(b.speed) * k * 16, p.y + (k % 2) * 4, { scale: 3, flipX: b.speed < 0 });
        }
        // lanterns with a warm glow
        for (const ln of s.lanterns) {
          if (ln.fate === "home" || ln.fate === "lost" || ln.fate === "burnt") continue;
          if (ln.fate === "out") {
            drawSprite(ctx, DARK, ln.x, ln.y, { scale: 3 });
            continue;
          }
          const flick = 0.85 + Math.sin(now / 90 + ln.id) * 0.15;
          const g = ctx.createRadialGradient(ln.x, ln.y, 2, ln.x, ln.y, 34 * flick);
          g.addColorStop(0, "rgba(255,212,59,0.45)");
          g.addColorStop(1, "rgba(255,146,43,0)");
          ctx.fillStyle = g;
          ctx.fillRect(ln.x - 36, ln.y - 36, 72, 72);
          drawSprite(ctx, LANTERN, ln.x, ln.y, { scale: 3 });
        }
        // breeze trail
        for (const p of trails.current) {
          ctx.fillStyle = `rgba(231,245,255,${Math.min(0.7, p.t * 1.6)})`;
          ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 1, 6, 2);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (skyRef.current.over || stroke.current) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    stroke.current = { id: e.pointerId, last: toField(e), t: performance.now(), once: new Set() };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stroke.current;
    if (!st || st.id !== e.pointerId) return;
    const p = toField(e);
    const len = Math.hypot(p.x - st.last.x, p.y - st.last.y);
    if (len < 14) return;
    const now = performance.now();
    const felt = applyGust(skyRef.current, st.last, p, Math.max(0.016, (now - st.t) / 1000), st.once);
    for (let k = 0; k < 3; k++) trails.current.push({ x: st.last.x + ((p.x - st.last.x) * k) / 3, y: st.last.y + ((p.y - st.last.y) * k) / 3, t: 0.45 });
    if (felt) haptics.current?.fire("tap");
    st.last = p;
    st.t = now;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stroke.current?.id === e.pointerId) stroke.current = null;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const stars = over?.won ? starsFor(over.home, level) : 0;
  const tags = [level.wind > 0 ? c.windR : level.wind < 0 ? c.windL : null, level.gust ? c.gusty : null, level.birds.length ? c.birds : null, level.segs.some((g) => g.kind === "branch") ? c.branches : null].filter(Boolean) as string[];

  return (
    <div
      ref={containerRef}
      data-game="wish-lanterns"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.home, hud.home, level.need)}</Badge>
        <Badge variant="outline">{fill(c.left, hud.left)}</Badge>
        {tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
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
        {!started && !over ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/3 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : fill(c.lose, over.home, level.need)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p> : null}
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
