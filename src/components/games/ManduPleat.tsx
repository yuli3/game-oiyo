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
import { LEVEL_MAX, MANDU_SLUG, MANDU_STAGES, STAGE_COUNT, current, good, newKitchen, press, release, starsFor, stepKitchen, type Fault, type Kitchen } from "../../lib/games/mandu-pleat";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; tray: string; start: string; fillHint: string; pleatHint: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; ok: string; flat: string; burst: string; tear: string; open: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}개", tray: "쟁반 {0}/{1}", start: "꾹 눌러 소를 넣고, 띠 안에서 손을 떼요!", fillHint: "누르는 동안 소가 들어가요", pleatHint: "일정한 박자로 톡톡 주름!", win: "만두 한 판 완성!", lose: "만두가 모자라요", result: "잘 빚은 만두 {0}/{1}",
    again: "다시 빚기", next: "다음 단계", ok: "예쁘다!", flat: "소가 적어요", burst: "터졌어요!", tear: "주름이 찢어졌어요", open: "덜 여몄어요",
    help: "설날 아침, 온 가족이 둘러앉아 만두를 빚어요. 만두 하나는 두 번에 빚어요. 먼저 꾹 누르고 있으면 숟가락으로 만두소를 떠 넣어요. 오른쪽 눈금의 초록 띠 안에서 손을 떼야 해요. 적으면 납작하고, 많으면 터져요. 다음은 주름 잡기예요. 집는 손이 만두피 가장자리를 따라 움직이는데, 탭할 때마다 그 자리에 주름이 잡혀요. 주름은 고른 박자로 잡아야 해요. 너무 촘촘하면 피가 찢어지고, 너무 벌어지면 덜 여며져요. 정해진 수만큼 쟁반에 올리면 통과예요. (스페이스 키도 돼요)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}", tray: "Tray {0}/{1}", start: "Hold to spoon in filling, let go inside the band!", fillHint: "Filling goes in while you hold", pleatHint: "Pleat on an even beat!", win: "A full tray of mandu!", lose: "Not enough dumplings", result: "{0}/{1} made well",
    again: "Fold again", next: "Next stage", ok: "Lovely!", flat: "Too little filling", burst: "It burst!", tear: "The pleats tore", open: "Left open",
    help: "Seollal morning: the whole family sits round making mandu. Each dumpling takes two moves. First hold to spoon filling onto the wrapper and let go while the gauge on the right is in the green band: too little and it's flat, too much and it bursts. Then pleat it: a pinch travels along the edge and every tap folds a pleat there. Keep an even beat: pleats too close together tear the wrapper, too far apart leave it open. Put the stage's count on the tray to clear it. (Space works too.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}個", tray: "お盆 {0}/{1}", start: "長押しで具を入れて、帯の中で指を離そう！", fillHint: "押している間、具が入る", pleatHint: "一定のリズムでひだを！", win: "マンドゥが一皿完成！", lose: "マンドゥが足りない", result: "上手に包めた {0}/{1}",
    again: "もう一度", next: "次の面", ok: "きれい！", flat: "具が少ない", burst: "破れた！", tear: "ひだが裂けた", open: "閉じきれていない",
    help: "ソルラル（旧正月）の朝、家族みんなで囲んでマンドゥを包みます。一つは二段階で作ります。まず長押しでスプーンで具をのせ、右のゲージが緑の帯にあるうちに離します。少なければぺたんこ、多すぎれば破れます。次はひだ寄せ。つまむ指が皮のふちに沿って動き、タップするたびにそこにひだができます。一定のリズムで。詰めすぎると皮が裂け、空けすぎると閉じきれません。決められた数をお盆にのせればクリア。（スペースキーでも可）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}个", tray: "托盘 {0}/{1}", start: "按住舀馅，在绿色带内松手！", fillHint: "按住时会加馅", pleatHint: "按均匀的节拍捏褶！", win: "包好一整盘饺子！", lose: "饺子不够", result: "包好了 {0}/{1}",
    again: "再包一次", next: "下一关", ok: "真漂亮！", flat: "馅太少", burst: "破了！", tear: "褶子撕破了", open: "没捏严",
    help: "韩国春节（설날）的早上，全家围坐在一起包饺子（만두）。每个饺子分两步。先按住用勺子舀馅放到皮上，在右边刻度落在绿色带里时松手：太少就扁，太多就破。然后捏褶：捏的手沿着饺子皮边缘移动，每点一下就在那里捏出一道褶。要保持均匀的节拍：褶子太密皮会撕破，太稀就捏不严。在托盘上放够规定数量即过关。（也可以用空格键）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0}", tray: "Plateau {0}/{1}", start: "Maintenez pour garnir, relâchez dans la bande !", fillHint: "La farce coule tant que vous maintenez", pleatHint: "Plissez en rythme régulier !", win: "Un plateau de mandu !", lose: "Pas assez de raviolis", result: "{0}/{1} réussis",
    again: "Replier", next: "Niveau suivant", ok: "Joli !", flat: "Pas assez de farce", burst: "Il a éclaté !", tear: "Les plis ont déchiré", open: "Resté ouvert",
    help: "Matin de Seollal, le Nouvel An coréen : toute la famille plie des mandu. Chaque ravioli se fait en deux gestes. D'abord, maintenez pour déposer la farce à la cuillère et relâchez quand la jauge de droite est dans la bande verte : trop peu, il est plat ; trop, il éclate. Ensuite, plissez : une pince suit le bord de la pâte et chaque toucher y fait un pli. Gardez un rythme régulier : des plis trop serrés déchirent la pâte, trop espacés la laissent ouverte. Posez le nombre demandé sur le plateau. (La barre d'espace marche aussi.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0}", tray: "Bandeja {0}/{1}", start: "¡Mantén para rellenar y suelta dentro de la franja!", fillHint: "El relleno cae mientras mantienes", pleatHint: "¡Pliega con un ritmo parejo!", win: "¡Una bandeja de mandu!", lose: "Faltan empanadillas", result: "{0}/{1} bien hechas",
    again: "Plegar otra vez", next: "Siguiente nivel", ok: "¡Qué bonita!", flat: "Poco relleno", burst: "¡Reventó!", tear: "Se rasgaron los pliegues", open: "Quedó abierta",
    help: "Mañana de Seollal, el Año Nuevo coreano: toda la familia hace mandu. Cada empanadilla lleva dos pasos. Primero mantén pulsado para echar relleno con la cuchara y suelta cuando el indicador de la derecha esté en la franja verde: poco y queda plana, demasiado y revienta. Luego pliega: una pinza recorre el borde de la masa y cada toque hace un pliegue ahí. Mantén un ritmo parejo: pliegues muy juntos rasgan la masa y muy separados la dejan abierta. Pon en la bandeja las del nivel para pasarlo. (También vale la barra espaciadora.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:mandu-pleat:muted";
const W = 360;
const H = 560;
const CX = 160;
const CY = 250;
const R = 110;
const GX = 318;
const GY0 = 110;
const GH = 280;

const MANDU_OK: PixelArt = { palette: { w: "#f8f9fa", s: "#dee2e6", d: "#adb5bd" }, rows: ["..sws..", ".wwwww.", "wswswsw", "wwwwwww", ".ddddd."] };
const MANDU_BAD: PixelArt = { palette: { w: "#ced4da", s: "#e03131", d: "#868e96" }, rows: ["..s.w..", ".ww.ww.", "wsw.wsw", "wwwswww", ".ddddd."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function ManduPleat({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; good: number; total: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<Kitchen>(newKitchen(MANDU_STAGES[0]));
  const input = useRef<Array<"down" | "up">>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = MANDU_STAGES[stage];

  useRunRecord(MANDU_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    kRef.current = newKitchen(MANDU_STAGES[s]);
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(MANDU_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let held = false;
    const down = (ev: KeyboardEvent) => {
      if (ev.key !== " " || kRef.current.over) return;
      ev.preventDefault();
      if (held) return;
      held = true;
      input.current.push("down");
      setTouched(true);
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.key !== " ") return;
      held = false;
      input.current.push("up");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const edge = (p: number) => {
      // the folded dumpling's edge: a half circle from left to right over the top
      const a = Math.PI + p * Math.PI;
      return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R * 0.75 };
    };
    const announce = (f: Fault | null) => {
      if (f === null) return;
      const cp = copyRef.current;
      const k = kRef.current;
      const text = f === "" ? cp.ok : cp[f];
      pops.current.push({ text, t: 1, color: f === "" ? "#2f9e44" : "#e03131", x: CX, y: CY - 130 });
      if (f === "") {
        spawnBurst(parts.current, CX, CY, ["#ffd43b", "#f8f9fa", "#ff8787"], 14, 110, Math.floor(k.t * 1000));
        sfx("success");
      } else sfx("fail");
    };
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const k = kRef.current;
      // presses are read once per frame
      for (const e of input.current.splice(0)) {
        const ev = e === "down" ? press(k) : release(k);
        if (ev.pleat) sfx("tap");
        announce(ev.done);
      }
      if (!k.over) {
        const ev = stepKitchen(k, dt);
        announce(ev.done);
        if (k.over) {
          setOver({ won: k.won, stars: starsFor(k), good: good(k), total: k.stage.dumplings.length });
          if (k.won) {
            setCleared(markStageCleared(MANDU_SLUG, k.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a low table on a warm floor
        ctx.fillStyle = "#f4e3c1";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#8d5524";
        ctx.fillRect(0, 60, W, 400);
        ctx.fillStyle = "#a0662f";
        for (let y = 70; y < 460; y += 26) ctx.fillRect(0, y, W, 2);
        const d = current(k);
        if (!k.over && k.phase === "fill") {
          // the open wrapper with a mound of filling
          ctx.fillStyle = "#f8f9fa";
          ctx.beginPath();
          ctx.arc(CX, CY, R, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e9ecef";
          ctx.beginPath();
          ctx.arc(CX, CY, R - 8, 0, Math.PI * 2);
          ctx.fill();
          const mound = 10 + (k.level / LEVEL_MAX) * 70;
          ctx.fillStyle = k.level > d.hi ? "#c92a2a" : "#8f5b3a";
          ctx.beginPath();
          ctx.arc(CX, CY, mound, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#5c940d";
          for (let i = 0; i < Math.floor(mound / 4); i++) ctx.fillRect(CX - mound * 0.6 + ((i * 37) % (mound * 1.2)), CY - mound * 0.6 + ((i * 53) % (mound * 1.2)), 4, 4);
          if (k.holding) {
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(CX + 20, CY - 140, 10, 90);
            ctx.beginPath();
            ctx.ellipse(CX + 25, CY - 50, 22, 12, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (!k.over) {
          // the folded half moon, the pleats made so far and the travelling pinch
          ctx.fillStyle = "#f8f9fa";
          ctx.beginPath();
          ctx.ellipse(CX, CY, R, R * 0.75, 0, Math.PI, Math.PI * 2);
          ctx.lineTo(CX + R, CY);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#dee2e6";
          ctx.fillRect(CX - R, CY - 4, R * 2, 8);
          if (k.stage.stage < 5) {
            ctx.fillStyle = "rgba(47,158,68,0.45)";
            for (let i = 1; i < d.pleats; i++) {
              const p = edge(i / d.pleats);
              ctx.fillRect(p.x - 2, p.y - 12, 4, 10);
            }
          }
          ctx.strokeStyle = "#adb5bd";
          ctx.lineWidth = 3;
          for (const tp of k.taps) {
            const p = edge(tp);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(CX + (p.x - CX) * 0.7, CY + (p.y - CY) * 0.7);
            ctx.stroke();
          }
          ctx.strokeStyle = "#ced4da";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(CX, CY, R, R * 0.75, 0, Math.PI, Math.PI + k.pos * Math.PI);
          ctx.stroke();
          const p = edge(k.pos);
          ctx.fillStyle = "#ffc9c9";
          ctx.beginPath();
          ctx.arc(p.x, p.y - 6, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e599f7";
          ctx.fillRect(p.x - 3, p.y - 20, 6, 10);
        }
        // the fill gauge with its band
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(GX - 4, GY0 - 4, 28, GH + 8);
        const gy = (lv: number) => GY0 + GH - (lv / LEVEL_MAX) * GH;
        ctx.fillStyle = "#40c057";
        ctx.fillRect(GX, gy(d.hi), 20, gy(d.lo) - gy(d.hi));
        ctx.fillStyle = "#fa5252";
        ctx.fillRect(GX, GY0, 20, gy(d.hi) - GY0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(GX - 6, gy(k.phase === "fill" ? k.level : 0) - 2, 32, 4);
        // the tray of finished dumplings
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(10, 478, W - 20, 64);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(14, 482, W - 28, 56);
        k.results.forEach((r, i) => drawSprite(ctx, r === "" ? MANDU_OK : MANDU_BAD, 36 + i * 32, 510, { scale: 4 }));
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#3d2b1f";
        const cp = copyRef.current;
        ctx.fillText(fill(cp.tray, good(k), k.stage.need), 12, 30);
        ctx.font = "14px sans-serif";
        if (!k.over) ctx.fillText(k.phase === "fill" ? cp.fillHint : cp.pleatHint, 12, 50);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - tw / 2, pp.y - 20, tw, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 2);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="mandu-pleat"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
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
          onPointerDown={(ev) => {
            if (kRef.current.over) return;
            ev.currentTarget.setPointerCapture(ev.pointerId);
            setTouched(true);
            input.current.push("down");
          }}
          onPointerUp={() => input.current.push("up")}
          onPointerCancel={() => input.current.push("up")}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.good, over.total)}</p>
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
