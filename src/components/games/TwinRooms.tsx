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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { HIT_R, MISSES, PANEL_H, PANEL_W, STAGE_COUNT, TWIN_SLUG, TWIN_STAGES, bottomThings, diffAt, newSearch, starsFor, tap, type Search, type Thing } from "../../lib/games/twin-rooms";
import { itemArt } from "../../lib/games/twin-rooms-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; found: string; misses: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    found: "찾은 곳 {0}/{1}",
    misses: "실수 {0}/{1}",
    start: "두 그림에서 다른 곳을 눌러요!",
    win: "다른 곳을 모두 찾았어요!",
    lose: "실수를 다섯 번 했어요",
    result: "실수 {0}번으로 다 찾았어요",
    help: "아늑한 방을 그린 그림 두 장이 위아래로 걸려 있는데, 몇 군데가 달라요. 물건이 없어졌거나, 새로 생겼거나, 색이 바뀌었거나, 반대로 돌아앉아 있어요. 다른 곳을 위나 아래 그림에서 누르면 두 그림 모두에 동그라미가 그려져요. 엉뚱한 곳을 다섯 번 누르기 전에 모두 찾으면 통과예요. 실수가 한 번 이하면 별 셋이에요. 요령은 벽, 선반, 바닥을 한 줄씩 위아래로 번갈아 보는 것, 그리고 처음 단계는 사라지거나 생긴 물건만 다르다는 거예요. 색과 방향이 바뀌는 곳은 4단계와 11단계부터 나와요. 키보드는 화살표로 표시를 움직이고(Shift를 누르면 크게), Space로 눌러요.",
    again: "다시 하기",
    next: "다음 단계",
    stages: "단계 고르기",
    full: "전체화면",
    exitFull: "나가기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}",
    found: "Found {0}/{1}",
    misses: "Misses {0}/{1}",
    start: "Tap the differences between the pictures!",
    win: "You found every difference!",
    lose: "Five wrong taps",
    result: "Found them all with {0} wrong taps",
    help: "Two pictures of the same cosy room hang one above the other, but a few things differ: something is missing, something new has appeared, something has changed colour or is turned the other way. Tap a difference in either picture and it's circled in both. Find them all before five wrong taps to pass; one wrong tap or none earns three stars. The knack is comparing the wall, the shelf and the floor one band at a time, and knowing the first rooms only hide missing or new things; colour changes come in from stage 4 and mirror images from stage 11. Keys: arrows move the marker (Shift for big steps), Space taps.",
    again: "Try again",
    next: "Next stage",
    stages: "Choose a stage",
    full: "Fullscreen",
    exitFull: "Exit",
    mute: "Mute",
    unmute: "Unmute",
  },
  ja: {
    stage: "{0}面",
    found: "見つけた {0}/{1}",
    misses: "まちがい {0}/{1}",
    start: "2枚の絵のちがう所をタップ！",
    win: "ちがう所を全部見つけた！",
    lose: "5回まちがえた",
    result: "まちがい{0}回で全部見つけた",
    help: "同じほっこりした部屋の絵が2枚、上下にかかっていますが、何か所かちがいます。物がなくなっていたり、新しく増えていたり、色が変わっていたり、反対を向いていたり。ちがう所を上か下の絵でタップすると、両方の絵に丸がつきます。5回まちがえる前に全部見つければクリア。まちがいが1回以下なら星3つです。コツは壁、棚、床を1段ずつ上下で見くらべること、そして最初の面はなくなった物と増えた物だけがちがうこと。色のちがいは4面から、向きのちがいは11面から出てきます。キーボードは矢印で印を動かし（Shiftで大きく）、Spaceでタップします。",
    again: "もう一度",
    next: "次の面",
    stages: "ステージ選択",
    full: "全画面",
    exitFull: "戻る",
    mute: "ミュート",
    unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关",
    found: "找到 {0}/{1}",
    misses: "失误 {0}/{1}",
    start: "点出两幅画的不同之处！",
    win: "所有不同之处都找到了！",
    lose: "点错五次了",
    result: "失误 {0} 次全部找到",
    help: "同一间温馨房间的两幅画上下挂着，但有几处不一样：东西不见了、多出来了、换了颜色，或者朝向反了。在上面或下面的画里点出不同之处，两幅画都会画上圆圈。点错五次之前全部找到即过关，失误一次以内得三星。诀窍是把墙、架子、地板一层一层上下对照，而且前几关只有消失或多出来的东西不同；颜色变化从第4关开始，左右翻转从第11关开始。键盘用方向键移动标记（按住 Shift 移动得更多），空格点击。",
    again: "再来一次",
    next: "下一关",
    stages: "选择关卡",
    full: "全屏",
    exitFull: "退出",
    mute: "静音",
    unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}",
    found: "Trouvées {0}/{1}",
    misses: "Erreurs {0}/{1}",
    start: "Touchez les différences entre les images !",
    win: "Toutes les différences trouvées !",
    lose: "Cinq erreurs",
    result: "Tout trouvé avec {0} erreurs",
    help: "Deux images de la même chambre douillette sont accrochées l'une au-dessus de l'autre, mais quelques détails diffèrent : un objet a disparu, un nouveau est apparu, un autre a changé de couleur ou de sens. Touchez une différence dans l'une ou l'autre image et elle est entourée dans les deux. Trouvez-les toutes avant cinq erreurs pour réussir ; une erreur ou aucune donne trois étoiles. L'astuce : comparer le mur, l'étagère et le sol bande par bande, et savoir que les premières chambres ne cachent que des objets disparus ou ajoutés ; les couleurs changent à partir du niveau 4, les images inversées à partir du 11. Touches : les flèches déplacent le repère (Maj pour de grands pas), Espace touche.",
    again: "Réessayer",
    next: "Niveau suivant",
    stages: "Choisir un niveau",
    full: "Plein écran",
    exitFull: "Quitter",
    mute: "Couper le son",
    unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}",
    found: "Encontradas {0}/{1}",
    misses: "Fallos {0}/{1}",
    start: "¡Toca las diferencias entre los dibujos!",
    win: "¡Encontraste todas las diferencias!",
    lose: "Cinco fallos",
    result: "Todo encontrado con {0} fallos",
    help: "Dos dibujos de la misma habitación acogedora cuelgan uno sobre otro, pero hay algunas diferencias: falta algo, ha aparecido algo nuevo, algo ha cambiado de color o mira hacia el otro lado. Toca una diferencia en cualquiera de los dibujos y se marca en los dos. Encuéntralas todas antes de cinco fallos para superar el nivel; con un fallo o ninguno ganas tres estrellas. El truco es comparar la pared, la repisa y el suelo franja a franja, y saber que las primeras habitaciones solo esconden cosas que faltan o sobran; los cambios de color llegan en el nivel 4 y los objetos al revés en el 11. Teclas: las flechas mueven la marca (Mayús para pasos grandes), Espacio toca.",
    again: "Reintentar",
    next: "Siguiente nivel",
    stages: "Elegir nivel",
    full: "Pantalla completa",
    exitFull: "Salir",
    mute: "Silenciar",
    unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:twin-rooms:muted";
const W = 360;
const H = 560;
const PANEL_X = 10;
const TOP_Y = 64;
const BOT_Y = 306;
const SHELF_Y = 116;

/** One cosy room picture: wall, window, shelf, floor and its keepsakes. */
function drawRoom(ctx: CanvasRenderingContext2D, oy: number, things: Thing[], tone: number) {
  const walls = ["#fff4e6", "#e7f5ff", "#f3f0ff", "#ebfbee"];
  const floors = ["#e9c46a", "#d0a26c", "#c9a27a", "#e0b884"];
  ctx.fillStyle = walls[tone % walls.length];
  ctx.fillRect(PANEL_X, oy, PANEL_W, PANEL_H);
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let x = 0; x < PANEL_W; x += 20) ctx.fillRect(PANEL_X + x, oy, 10, 130);
  ctx.fillStyle = floors[tone % floors.length];
  ctx.fillRect(PANEL_X, oy + 130, PANEL_W, PANEL_H - 130);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 140; y < PANEL_H; y += 18) ctx.fillRect(PANEL_X, oy + y, PANEL_W, 2);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(PANEL_X + 8, oy + SHELF_Y + 4, PANEL_W - 16, 6);
  for (const t of things) drawSprite(ctx, itemArt(t.item, t.v, t.flip), PANEL_X + t.x, oy + t.y, { scale: 3 });
  ctx.strokeStyle = "#495057";
  ctx.lineWidth = 3;
  ctx.strokeRect(PANEL_X, oy, PANEL_W, PANEL_H);
}

export default function TwinRooms({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const [over, setOver] = useState<null | { won: boolean; stars: number; misses: number }>(null);
  const [found, setFound] = useState(0);
  const [misses, setMisses] = useState(0);
  const searchRef = useRef<Search | null>(null);
  const bottom = useRef<Thing[]>([]);
  const crosses = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const marker = useRef<{ x: number; y: number; shown: boolean }>({ x: PANEL_W / 2, y: PANEL_H / 2, shown: false });
  const st = TWIN_STAGES[stage];

  useRunRecord(TWIN_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    searchRef.current = newSearch(TWIN_STAGES[s]);
    bottom.current = bottomThings(TWIN_STAGES[s]);
    crosses.current = [];
    marker.current = { x: PANEL_W / 2, y: PANEL_H / 2, shown: false };
    setFound(0);
    setMisses(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(TWIN_SLUG, STAGE_COUNT);
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
      const s = searchRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      for (const c of crosses.current) c.t -= dt;
      crosses.current = crosses.current.filter((c) => c.t > 0);
      stepParticles(parts.current, dt, 120);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, W, H);
        const tone = s.stage.stage;
        drawRoom(ctx, TOP_Y, s.stage.things, tone);
        drawRoom(ctx, BOT_Y, bottom.current, tone);
        // circles on both pictures for every difference found
        ctx.strokeStyle = "#e03131";
        ctx.lineWidth = 3;
        s.found.forEach((f, k) => {
          if (!f) return;
          const [x, y] = diffAt(s.stage, k);
          for (const oy of [TOP_Y, BOT_Y]) {
            ctx.beginPath();
            ctx.arc(PANEL_X + x, oy + y, HIT_R, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        // a wrong tap: a quick grey cross
        ctx.strokeStyle = "#868e96";
        for (const c of crosses.current) {
          ctx.beginPath();
          ctx.moveTo(c.x - 8, c.y - 8);
          ctx.lineTo(c.x + 8, c.y + 8);
          ctx.moveTo(c.x + 8, c.y - 8);
          ctx.lineTo(c.x - 8, c.y + 8);
          ctx.stroke();
        }
        if (marker.current.shown) {
          ctx.strokeStyle = "#1c7ed6";
          ctx.lineWidth = 2;
          for (const oy of [TOP_Y, BOT_Y]) {
            ctx.strokeRect(PANEL_X + marker.current.x - 10, oy + marker.current.y - 10, 20, 20);
          }
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const look = (px: number, py: number, fx: number, fy: number) => {
    const s = searchRef.current;
    if (!s || s.over) return;
    const k = tap(s, px, py);
    if (k >= 0) {
      setFound(s.found.filter(Boolean).length);
      spawnBurst(parts.current, fx, fy, ["#ffd43b", "#ff8787", "#fff"], 12, 100, 2);
      sfx("success");
    } else if (k === -1) {
      setMisses(s.misses);
      crosses.current.push({ x: fx, y: fy, t: 0.6 });
      sfx("fail");
    }
    if (s.over) {
      setOver({ won: s.won, stars: starsFor(s), misses: s.misses });
      if (s.won) {
        setCleared(markStageCleared(TWIN_SLUG, s.stage.stage, STAGE_COUNT));
        sfx("win");
      } else sfx("lose");
    }
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setTouched(true);
    marker.current.shown = false;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) * W) / r.width;
    const fy = ((e.clientY - r.top) * H) / r.height;
    const px = fx - PANEL_X;
    // either picture: the top one, or the bottom one
    const oy = fy >= BOT_Y ? BOT_Y : TOP_Y;
    const py = fy - oy;
    if (px < 0 || px > PANEL_W || py < 0 || py > PANEL_H) return;
    look(px, py, fx, fy);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const k = e.key;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!(k in d) && k !== " " && k !== "Enter") return;
    e.preventDefault();
    setTouched(true);
    const mk = marker.current;
    if (!mk.shown) {
      mk.shown = true;
      if (k in d) return;
    }
    if (k in d) {
      const step = e.shiftKey ? 30 : 10;
      mk.x = Math.max(0, Math.min(PANEL_W, mk.x + d[k][0] * step));
      mk.y = Math.max(0, Math.min(PANEL_H, mk.y + d[k][1] * step));
    } else look(mk.x, mk.y, PANEL_X + mk.x, TOP_Y + mk.y);
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
      data-game="twin-rooms"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.found, found, st.diffs.length)}</Badge>
        <Badge variant="outline">{fill(c.misses, misses, MISSES)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.misses)}</p> : null}
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
