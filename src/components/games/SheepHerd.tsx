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
import { FIELD_H, FIELD_W, HERD_SLUG, LAYOUTS, STAGE_COUNT, newHerd, setDogTarget, starsFor, stepHerd, type Herd } from "../../lib/games/sheep-herd";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; penned: string; time: string; win: string; lose: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; start: string; goat: string; ice: string; snow: string; fence: string; seconds: string; baa: string; meh: string;
}> = {
  ko: {
    baa: "매애", meh: "메~",
    start: "손가락으로 강아지를 움직여요", stage: "{0}단계", penned: "우리 안 {0}/{1}", time: "{0}초", win: "양떼가 모두 우리에 들어갔어요!", lose: "해가 졌어요 · {0}/{1}마리",
    again: "다시 하기", next: "다음 단계", goat: "고집 센 흑염소", ice: "얼음 연못", snow: "깊은 눈", fence: "울타리", seconds: "{0}초 만에",
    help: "화면을 누른 채 움직이면 강아지가 손가락을 따라 달립니다. 양은 강아지를 피해 도망치면서 무리를 지어 다니니, 양떼 뒤쪽에 서서 문 쪽으로 밀어 주세요. 강아지는 울타리를 넘어 다닐 수 있지만 우리 안에는 들어가지 않아요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    baa: "Baa", meh: "Meh!",
    start: "Move the dog with your finger", stage: "Stage {0}", penned: "Penned {0}/{1}", time: "{0}s", win: "Every sheep is in the pen!", lose: "Sunset · {0}/{1} penned",
    again: "Play again", next: "Next stage", goat: "Stubborn goat", ice: "Frozen pond", snow: "Deep snow", fence: "Fence", seconds: "in {0}s",
    help: "Press and move to make the dog run after your finger. Sheep run away from the dog and stay together as a flock, so stand behind the flock and push it toward the gate. The dog can hop over fences but never goes into the pen.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    baa: "メェ〜", meh: "ンメェ",
    start: "指で犬を動かそう", stage: "{0}面", penned: "囲いの中 {0}/{1}", time: "{0}秒", win: "羊がみんな囲いに入った！", lose: "日が暮れた · {0}/{1}匹",
    again: "もう一度", next: "次の面", goat: "頑固な黒ヤギ", ice: "凍った池", snow: "深い雪", fence: "柵", seconds: "{0}秒で",
    help: "画面を押したまま動かすと、犬が指を追いかけて走ります。羊は犬から逃げつつ群れで動くので、群れの後ろに立って門のほうへ押しましょう。犬は柵を飛び越えられますが、囲いの中には入りません。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    baa: "咩～", meh: "咩！",
    start: "用手指移动小狗", stage: "第{0}关", penned: "进圈 {0}/{1}", time: "{0}秒", win: "所有羊都进圈了！", lose: "太阳下山了 · {0}/{1}只",
    again: "再玩一次", next: "下一关", goat: "倔强的黑山羊", ice: "结冰的池塘", snow: "深雪", fence: "栅栏", seconds: "用时{0}秒",
    help: "按住屏幕移动，小狗就会追着手指跑。羊会躲开小狗并成群行动，所以站在羊群后面把它们往门口赶。小狗能跳过栅栏，但不会进羊圈。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    baa: "Bêê", meh: "Mêê !",
    start: "Déplacez le chien du doigt", stage: "Niveau {0}", penned: "Au parc {0}/{1}", time: "{0} s", win: "Tous les moutons sont au parc !", lose: "Le soleil est couché · {0}/{1}",
    again: "Rejouer", next: "Niveau suivant", goat: "Chèvre têtue", ice: "Étang gelé", snow: "Neige profonde", fence: "Clôture", seconds: "en {0} s",
    help: "Appuyez et bougez : le chien court après votre doigt. Les moutons fuient le chien et restent en troupeau, alors placez-vous derrière le troupeau et poussez-le vers la porte. Le chien saute les clôtures mais n'entre jamais dans le parc.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    baa: "Beee", meh: "¡Meee!",
    start: "Mueve al perro con el dedo", stage: "Nivel {0}", penned: "En el corral {0}/{1}", time: "{0} s", win: "¡Todas las ovejas están en el corral!", lose: "Se puso el sol · {0}/{1}",
    again: "Otra vez", next: "Siguiente nivel", goat: "Cabra testaruda", ice: "Estanque helado", snow: "Nieve profunda", fence: "Valla", seconds: "en {0} s",
    help: "Mantén pulsado y mueve: el perro corre tras tu dedo. Las ovejas huyen del perro y van en rebaño, así que ponte detrás del rebaño y empújalo hacia la puerta. El perro salta las vallas, pero nunca entra en el corral.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:sheep-herd:muted";

const SHEEP_A: PixelArt = {
  palette: { w: "#ffffff", g: "#dfe6ee", k: "#2b2b2b", s: "#f3d6c0" },
  rows: [".wwwww...", "wwgwwwwkk", "wwwwwgkks", "gwwwwwkk.", ".wwwwww..", ".k.k.k.k."],
};
const SHEEP_B: PixelArt = { palette: SHEEP_A.palette, rows: [".wwwww...", "wwgwwwwkk", "wwwwwgkks", "gwwwwwkk.", ".wwwwww..", "k.k...k.k"] };
const GOAT_A: PixelArt = {
  palette: { b: "#2b2b30", d: "#45454d", h: "#c9b48a", e: "#ffd43b" },
  rows: ["......h.h", ".bbbbb.bb", "bbdbbbbeb", "bbbbbdbb.", ".bbbbbb..", ".b.b.b.b."],
};
const GOAT_B: PixelArt = { palette: GOAT_A.palette, rows: ["......h.h", ".bbbbb.bb", "bbdbbbbeb", "bbbbbdbb.", ".bbbbbb..", "b.b...b.b"] };
const DOG: PixelArt = {
  palette: { o: "#d9822b", w: "#fff4e6", k: "#2b1d16", r: "#e03131" },
  rows: ["o......o.", "o.....ooo", ".ooooookw", ".oooooww.", ".wwrwwo..", ".o.o.o.o."],
};
const PINE: PixelArt = {
  palette: { g: "#2b6a4a", d: "#1f4d36", w: "#ffffff", t: "#6b4426" },
  rows: ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t...", "...t..."],
};

const SKIES: BackdropSpec[] = [
  { sky: ["#f4f8fc", "#eef4fa", "#e6eef6"], stars: 0, seed: 11 },
  { sky: ["#fbf1e6", "#f6ebe0", "#f0e3d6"], seed: 12 },
  { sky: ["#e9eef8", "#e1e8f4", "#d8e1ef"], seed: 13 },
];

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function SheepHerd({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ penned: 0, total: 0, left: 0 });
  const [over, setOver] = useState<null | { won: boolean; time: number }>(null);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const herdRef = useRef<Herd>(newHerd(0, 1));
  const startedRef = useRef(false);
  const pointer = useRef<number | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const lastBleat = useRef(0);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const layout = LAYOUTS[stage];
  useRunRecord(HERD_SLUG, Boolean(over?.won), Math.round(over?.time ?? 0), "seconds", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const h = newHerd(s, Math.floor(Math.random() * 1e6));
    herdRef.current = h;
    parts.current = [];
    pops.current = [];
    pointer.current = null;
    startedRef.current = false;
    setStarted(false);
    setOver(null);
    setHud({ penned: 0, total: h.sheep.length, left: LAYOUTS[s].limit });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(HERD_SLUG, STAGE_COUNT);
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
    let lastSec = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const h = herdRef.current;
      const l = h.layout;
      if (startedRef.current && !h.over) {
        const ev = stepHerd(h, dt);
        if (ev.penned) {
          const n = h.sheep.filter((s) => s.penned).length;
          setHud((x) => ({ ...x, penned: n }));
          spawnBurst(parts.current, (l.gate.x0 + l.gate.x1) / 2, l.gate.y - 10, ["#ffd43b", "#ffffff", "#a5d8ff"], 10, 90, Math.floor(now));
          sfx("place");
        }
        if (ev.bleat && now - lastBleat.current > 900) {
          lastBleat.current = now;
          const s = h.sheep[Math.floor(Math.random() * h.sheep.length)];
          pops.current.push({ x: s.x, y: s.y - 16, text: s.goat ? c.meh : c.baa, t: 0.8, color: "#495057" });
          sfx("tap");
        }
        const sec = Math.max(0, Math.ceil(l.limit - h.time));
        if (sec !== lastSec) {
          lastSec = sec;
          setHud((x) => ({ ...x, left: sec }));
        }
        if (h.over) {
          setOver({ won: h.won, time: h.time });
          setHud((x) => ({ ...x, penned: h.sheep.filter((s) => s.penned).length }));
          if (h.won) {
            setCleared(markStageCleared(HERD_SLUG, l.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKIES[Math.floor(l.stage / 10) % SKIES.length], 4);
        // snow sparkle
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = "rgba(180,200,220,0.35)";
          ctx.fillRect((k * 97) % FIELD_W, 130 + ((k * 61) % 460), 4, 2);
        }
        // pen floor (straw) and the hedge strip
        ctx.fillStyle = "#c9d6c0";
        ctx.fillRect(0, 0, FIELD_W, l.gate.y);
        ctx.fillStyle = "#e8d49a";
        ctx.fillRect(l.pen.x0, l.pen.y0, l.pen.x1 - l.pen.x0, l.pen.y1 - l.pen.y0);
        ctx.fillStyle = "#d9c27e";
        for (let y = l.pen.y0 + 6; y < l.pen.y1; y += 10) for (let x = l.pen.x0 + ((y / 10) % 2) * 6; x < l.pen.x1; x += 14) ctx.fillRect(Math.round(x), y, 6, 2);
        // hedge bushes outside the pen
        ctx.fillStyle = "#5c8a5c";
        for (let x = 0; x < FIELD_W; x += 12) {
          if (x + 12 > l.pen.x0 && x < l.pen.x1) continue;
          for (let y = 0; y < l.gate.y; y += 12) ctx.fillRect(x + 1, y + 1, 10, 10);
        }
        // ponds and deep snow
        for (const p of l.ponds) {
          ctx.fillStyle = "#b9e0f7";
          ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
          ctx.fillStyle = "#e7f5ff";
          for (let k = 0; k < 4; k++) ctx.fillRect(p.x0 + 12 + k * 26, p.y0 + 10 + (k % 2) * 22, 16, 2);
        }
        for (const d of l.drifts) {
          ctx.fillStyle = "#ffffff";
          for (let x = d.x0; x < d.x1; x += 10) for (let y = d.y0; y < d.y1; y += 10) ctx.fillRect(Math.round(x), Math.round(y + Math.sin(x * 0.2) * 2), 9, 8);
          ctx.fillStyle = "rgba(160,180,200,0.35)";
          for (let x = d.x0; x < d.x1; x += 10) ctx.fillRect(Math.round(x), Math.round(d.y1 - 2), 9, 2);
        }
        // fences: posts and rails
        for (const f of l.fences) {
          const len = Math.hypot(f.b.x - f.a.x, f.b.y - f.a.y);
          const n = Math.max(1, Math.ceil(len / 4));
          for (let k = 0; k <= n; k++) {
            const x = f.a.x + ((f.b.x - f.a.x) * k) / n;
            const y = f.a.y + ((f.b.y - f.a.y) * k) / n;
            ctx.fillStyle = "#8a5a3b";
            ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
            if (k % 5 === 0) {
              ctx.fillStyle = "#6b4426";
              ctx.fillRect(Math.round(x) - 3, Math.round(y) - 6, 6, 10);
            }
          }
        }
        // gate posts with a red ribbon
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(Math.round(l.gate.x0) - 4, l.gate.y - 12, 8, 16);
        ctx.fillRect(Math.round(l.gate.x1) - 4, l.gate.y - 12, 8, 16);
        for (const t of l.trees) {
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(Math.round(t.x - t.r), Math.round(t.y + t.r - 4), Math.round(t.r * 2), 6);
          drawSprite(ctx, PINE, t.x, t.y - 6, { scale: Math.max(4, Math.round(t.r / 4)) });
        }
        // sheep, back to front
        const order = h.sheep.slice().sort((a, b) => a.y - b.y);
        for (const s of order) {
          const moving = Math.hypot(s.vx, s.vy) > 12;
          const step = moving && Math.floor(h.time * 8 + s.x) % 2 === 0;
          const art = s.goat ? (step ? GOAT_B : GOAT_A) : step ? SHEEP_B : SHEEP_A;
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.fillRect(Math.round(s.x - 12), Math.round(s.y + 8), 24, 4);
          drawSprite(ctx, art, s.x, s.y, { scale: 3, flipX: s.face < 0 });
        }
        // dog
        const dogMoving = h.target && Math.hypot(h.target.x - h.dog.x, h.target.y - h.dog.y) > 4;
        const facing = h.target ? h.target.x >= h.dog.x : true;
        drawSprite(ctx, DOG, h.dog.x, h.dog.y + (dogMoving ? Math.sin(h.time * 20) * 1.5 : 0), { scale: 3, flipX: !facing });
        if (h.target && pointer.current !== null) {
          ctx.strokeStyle = "rgba(217,130,43,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(Math.round(h.target.x) - 6, Math.round(h.target.y) - 6, 12, 12);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 13px sans-serif";
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 18);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.baa, c.meh, sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const h = herdRef.current;
    if (h.over || pointer.current !== null) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDogTarget(h, toField(e));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId) return;
    setDogTarget(herdRef.current, toField(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setDogTarget(herdRef.current, null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const stars = over?.won ? starsFor(over.time, layout.limit) : 0;
  const tags = [layout.goats ? c.goat : null, layout.ponds.length ? c.ice : null, layout.drifts.length ? c.snow : null, layout.fences.length > layout.hedges ? c.fence : null].filter(Boolean) as string[];

  return (
    <div
      ref={containerRef}
      data-game="sheep-herd"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.penned, hud.penned, hud.total)}</Badge>
        <Badge variant="outline">{fill(c.time, hud.left)}</Badge>
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
            <p className="text-lg font-bold">{over.won ? c.win : fill(c.lose, hud.penned, hud.total)}</p>
            {over.won ? (
              <>
                <p className="text-sm text-muted-foreground">{fill(c.seconds, Math.round(over.time))}</p>
                <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
              </>
            ) : null}
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
