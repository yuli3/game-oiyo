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
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { CATS_SLUG, CATS_STAGES, CAT_H, CAT_W, MISS_PENALTY, SCENE_H, SCENE_TOP, STAGE_COUNT, newHunt, starsFor, tap, tick, timeLeft, type Cat, type Hunt } from "../../lib/games/rooftop-cats";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; found: string; time: string; start: string; miss: string; win: string; lose: string; result: string; again: string; next: string; cats: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", found: "찾은 고양이 {0}/{1}", time: "{0}초", start: "지붕 위에 숨은 고양이를 눌러 찾아요!", miss: "-{0}초", win: "고양이를 다 찾았어요!", lose: "시간이 다 됐어요", result: "{0}마리 중 {1}마리 찾음", cats: "고양이 {0}마리",
    again: "다시 하기", next: "다음 단계",
    help: "픽셀로 그린 동네 지붕 위에 고양이들이 숨어 있어요. 지붕 끝에 웅크리거나, 창문에서 고개만 내밀거나, 굴뚝·물탱크·빨래 옆에 앉아 있어요. 앉은 자리와 같은 색 고양이는 눈에 잘 안 띄어요. 고양이를 누르면 찾은 거예요. 아무것도 없는 곳을 누르면 4초가 줄어요. 시간이 다 가기 전에 모두 찾으면 통과이고, 빨리 찾을수록 별이 늘어요. 키보드: 화살표로 조준(Shift는 크게), Enter로 누르기. 낮에서 해 질 녘, 밤으로 갈수록 어두운 지붕에 어두운 고양이가 숨어요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", found: "Cats found {0}/{1}", time: "{0}s", start: "Tap the cats hiding on the rooftops!", miss: "-{0}s", win: "You found every cat!", lose: "Time's up", result: "Found {1} of {0} cats", cats: "{0} cats",
    again: "Try again", next: "Next stage",
    help: "Cats are hiding all over a pixel town's rooftops — curled on a roof edge, peeking out of a window, sitting by a chimney, a water tank or the washing. A cat the same colour as its spot is hard to see. Tap a cat to find it; a tap on nothing costs 4 seconds. Find them all before the clock runs out to clear the stage, and the faster, the more stars. Keyboard: arrows move a crosshair (Shift for big steps), Enter taps. From noon to dusk to night, dark cats hide on darker roofs.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", found: "見つけた猫 {0}/{1}", time: "{0}秒", start: "屋根に隠れた猫を押して見つけよう！", miss: "-{0}秒", win: "猫を全部見つけた！", lose: "時間切れ", result: "{0}匹中 {1}匹発見", cats: "猫 {0}匹",
    again: "もう一度", next: "次の面",
    help: "ピクセルで描いた町の屋根に猫たちが隠れています。屋根の端で丸まったり、窓から顔だけ出したり、煙突や水タンク、洗濯物のそばに座ったり。座っている場所と同じ色の猫は見つけにくい。猫を押せば発見です。何もない所を押すと4秒減ります。時間内に全部見つければクリア、早いほど星が増えます。キーボード：矢印で照準（Shiftで大きく）、Enterで押す。昼から夕暮れ、夜へと進むほど、暗い屋根に暗い猫が隠れます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", found: "找到的猫 {0}/{1}", time: "{0}秒", start: "点藏在屋顶上的猫把它找出来！", miss: "-{0}秒", win: "猫全部找到了！", lose: "时间到了", result: "{0}只中找到 {1}只", cats: "{0}只猫",
    again: "再来一次", next: "下一关",
    help: "像素小镇的屋顶上到处藏着猫：蜷在屋檐边、从窗户探出头、坐在烟囱、水箱或晾晒的衣服旁。和所在位置同色的猫很难发现。点到猫就算找到；点到空处会扣4秒。在时间用完前全部找到即过关，越快星越多。键盘：方向键移动准星（Shift大步），Enter点击。从正午到黄昏再到夜晚，深色的猫会藏在更暗的屋顶上。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", found: "Chats trouvés {0}/{1}", time: "{0} s", start: "Touchez les chats cachés sur les toits !", miss: "-{0} s", win: "Vous avez trouvé tous les chats !", lose: "Temps écoulé", result: "{1} chats trouvés sur {0}", cats: "{0} chats",
    again: "Réessayer", next: "Niveau suivant",
    help: "Des chats se cachent partout sur les toits d'une ville en pixels — roulés sur le bord d'un toit, la tête à une fenêtre, assis près d'une cheminée, d'un réservoir ou du linge. Un chat de la même couleur que sa place se voit mal. Touchez un chat pour le trouver ; une touche dans le vide coûte 4 secondes. Trouvez-les tous avant la fin du temps ; plus vite, plus d'étoiles. Clavier : flèches pour viser (Maj pour de grands pas), Entrée pour toucher. De midi au crépuscule puis à la nuit, des chats sombres se cachent sur des toits plus sombres.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", found: "Gatos encontrados {0}/{1}", time: "{0} s", start: "¡Toca los gatos escondidos en los tejados!", miss: "-{0} s", win: "¡Encontraste todos los gatos!", lose: "Se acabó el tiempo", result: "Encontrados {1} de {0} gatos", cats: "{0} gatos",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Hay gatos escondidos por los tejados de un pueblo en píxeles: enroscados en el borde, asomados a una ventana, sentados junto a una chimenea, un depósito de agua o la ropa tendida. Un gato del mismo color que su sitio cuesta de ver. Toca un gato para encontrarlo; tocar donde no hay nada cuesta 4 segundos. Encuéntralos todos antes de que se acabe el tiempo; cuanto antes, más estrellas. Teclado: flechas para apuntar (Mayús para pasos grandes), Intro para tocar. De mediodía al atardecer y a la noche, los gatos oscuros se esconden en tejados más oscuros.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

// a sitting cat, 7 × 5 pixels: c coat, k eyes
const CAT_ROWS = [".c...c.", ".ccccc.", ".ckcck.", "ccccccc", "c.c.c.c"];
const MUTE_KEY = "oiyo:rooftop-cats:muted";
const W = 360;
const H = 560;

function drawCat(ctx: CanvasRenderingContext2D, c: Cat, night: boolean): void {
  const px = 2 * c.scale;
  const rows = c.peek ? CAT_ROWS.slice(0, 3) : CAT_ROWS;
  const w = 7 * px;
  const h = rows.length * px;
  const x0 = Math.round(c.x - w / 2);
  const y0 = Math.round(c.y - (c.peek ? (CAT_H * 0.6 * c.scale) / 2 : (CAT_H * c.scale) / 2));
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      ctx.fillStyle = ch === "k" ? (night ? "#c0eb75" : "#212529") : c.colour;
      ctx.fillRect(x0 + x * px, y0 + y * px, px, px);
    }
  });
  void h;
}

export default function RooftopCats({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; found: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hRef = useRef<Hunt>(newHunt(CATS_STAGES[0]));
  const input = useRef<Array<{ x: number; y: number }>>([]);
  const started = useRef(false);
  const rings = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const pops = useRef<Array<{ text: string; x: number; y: number; t: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);
  const aim = useRef<{ x: number; y: number } | null>(null);
  const st = CATS_STAGES[stage];

  useRunRecord(CATS_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    hRef.current = newHunt(CATS_STAGES[s]);
    input.current = [];
    started.current = false;
    rings.current = [];
    pops.current = [];
    parts.current = [];
    overShown.current = false;
    aim.current = null;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CATS_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const h = hRef.current;
      const s = h.stage;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const p of input.current.splice(0)) {
        if (h.over) break;
        started.current = true;
        const before = h.found.slice();
        const r = tap(h, p.x, p.y);
        if (r === "found") {
          const i = h.found.findIndex((f, k) => f && !before[k]);
          const cat = s.cats[i];
          rings.current.push({ x: cat.x, y: cat.y, t: 0 });
          spawnBurst(parts.current, cat.x, cat.y, ["#ffd43b", "#fff", "#ff8787"], 10, 90, 2);
          sfx("success");
        } else if (r === "miss") {
          pops.current.push({ text: fill(cp.miss, MISS_PENALTY), x: p.x, y: p.y, t: 0.8 });
          sfx("fail");
        }
      }
      if (started.current) tick(h, dt);
      if (h.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: h.won, stars: starsFor(h), found: h.found.filter(Boolean).length });
        if (h.won) {
          setCleared(markStageCleared(CATS_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#ff8787", "#74c0fc"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      for (const r of rings.current) r.t += dt;
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#212529";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = s.sky;
        ctx.fillRect(0, SCENE_TOP, W, SCENE_H);
        if (s.time === "night") {
          ctx.fillStyle = "#fff3bf";
          ctx.fillRect(300, SCENE_TOP + 20, 18, 18);
          for (let k = 0; k < 14; k++) ctx.fillRect((k * 97) % W, SCENE_TOP + 8 + ((k * 53) % 90), 2, 2);
        } else if (s.time === "day") {
          ctx.fillStyle = "#ffe066";
          ctx.fillRect(30, SCENE_TOP + 18, 22, 22);
        }
        const night = s.time === "night";
        // props in order; each cat is drawn just after its host, so things placed later stay in front
        const byHost = new Map<number, Cat[]>();
        s.cats.forEach((cat) => {
          const l = byHost.get(cat.host) ?? [];
          l.push(cat);
          byHost.set(cat.host, l);
        });
        s.props.forEach((p, k) => {
          ctx.fillStyle = p.colour;
          if (p.kind === "line") ctx.fillRect(p.x, p.y, p.w, 1);
          else if (p.kind === "plant") {
            ctx.fillRect(p.x + 3, p.y + 6, p.w - 6, p.h - 6);
            ctx.fillRect(p.x, p.y, p.w, 8);
          } else ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          for (const cat of byHost.get(k) ?? []) drawCat(ctx, cat, night);
        });
        // found cats get a ring
        s.cats.forEach((cat, i) => {
          if (!h.found[i]) return;
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cat.x, cat.y, 12, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.lineWidth = 1;
        for (const r of rings.current) {
          if (r.t > 0.5) continue;
          ctx.strokeStyle = `rgba(255,212,59,${1 - r.t * 2})`;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 12 + r.t * 50, 0, Math.PI * 2);
          ctx.stroke();
        }
        // the keyboard's crosshair
        if (aim.current) {
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 2;
          ctx.strokeRect(aim.current.x - CAT_W / 2 - 4, aim.current.y - CAT_H / 2 - 4, CAT_W + 8, CAT_H + 8);
          ctx.lineWidth = 1;
        }
        drawParticles(ctx, parts.current);
        // the clock and the count
        const left = Math.max(0, timeLeft(h));
        ctx.fillStyle = "#343a40";
        ctx.fillRect(14, 66, W - 28, 12);
        ctx.fillStyle = left < 10 ? "#fa5252" : "#51cf66";
        ctx.fillRect(14, 66, ((W - 28) * left) / s.limit, 12);
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.found, h.found.filter(Boolean).length, s.cats.length), 14, 52);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.ceil(left)), W - 14, 52);
        // the cats still to find, as little silhouettes along the bottom
        s.cats.forEach((_, i) => {
          ctx.fillStyle = h.found[i] ? "#ffd43b" : "#495057";
          const x = 20 + i * 25;
          ctx.fillRect(x, 538, 14, 8);
          ctx.fillRect(x + 1, 534, 3, 4);
          ctx.fillRect(x + 10, 534, 3, 4);
        });
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ff6b6b";
          ctx.fillText(p.text, p.x, p.y - 12 - (0.8 - p.t) * 20);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (hRef.current.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    if (y < SCENE_TOP || y > SCENE_TOP + SCENE_H) return;
    setTouched(true);
    input.current.push({ x, y });
  };

  // keyboard: arrows move a crosshair over the scene (Shift for big steps), Enter or Space taps under it
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (hRef.current.over) return;
    const a = aim.current ?? { x: W / 2, y: SCENE_TOP + SCENE_H / 2 };
    const d = e.shiftKey ? 40 : 10;
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      if (e.key === "ArrowLeft") a.x -= d;
      if (e.key === "ArrowRight") a.x += d;
      if (e.key === "ArrowUp") a.y -= d;
      if (e.key === "ArrowDown") a.y += d;
      a.x = Math.max(0, Math.min(W, a.x));
      a.y = Math.max(SCENE_TOP, Math.min(SCENE_TOP + SCENE_H, a.y));
      aim.current = a;
      setTouched(true);
    } else if ((e.key === "Enter" || e.key === " ") && aim.current) {
      e.preventDefault();
      input.current.push({ x: a.x, y: a.y });
    }
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="rooftop-cats"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.cats, st.cats.length)}</Badge>
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
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, st.cats.length, over.found)}</p>
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
