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
import { CENTER, STAGE_COUNT, WELL_R, YONGAL_SLUG, YONGAL_STAGES, drop, moonX, newWell, starsFor, stepWell, swingX, type Well } from "../../lib/games/yongal-scoop";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; moons: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; got: string; miss: string; dawn: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}번", moons: "뜬 달 {0}/{1}", start: "탭해서 줄을 놓아요! 흔들림을 생각해 미리 놓아야 달에 떨어져요", win: "용알을 떴어요! 올해 운수대통!", lose: "날이 밝아 버렸어요", result: "뜬 달 {0} · 놓친 바가지 {1}",
    again: "다시 하기", next: "다음 단계", got: "용알이다!", miss: "첨벙…", dawn: "동트기까지",
    help: "정월 대보름 새벽, 마을 사람들은 서둘러 우물로 갔어요. 그날 처음 긷는 물을 '용알'이라 했고, 그 물에 비친 둥근 달을 떠 오면 한 해 운이 좋다고 여겼지요. 우물을 내려다보면 줄에 매단 바가지가 좌우로 흔들리고, 물 위에는 달그림자가 천천히 떠다녀요. 탭(또는 스페이스)하면 줄을 놓아요. 바가지는 흔들리던 기세를 그대로 안고 떨어지니까, 달 바로 위가 아니라 조금 앞에서 놓아야 달에 떨어져요. 첨벙하면 물결이 일어 달이 일렁이다가 가라앉고, 그동안 바가지를 다시 올려요. 날이 밝기 전에 목표만큼 달을 뜨면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}", moons: "Moons {0}/{1}", start: "Tap to let the rope go! Let go early: the swing carries the dipper", win: "You scooped the dragon's egg! A lucky year!", lose: "Dawn came first", result: "{0} moons scooped · {1} dippers missed",
    again: "Try again", next: "Next stage", got: "The dragon's egg!", miss: "Splash…", dawn: "Until dawn",
    help: "At dawn on Jeongwol Daeboreum, the first full moon of the lunar year, villagers hurried to the well. The first water drawn that day was called the dragon's egg (yongal), and bringing home the full moon shining in it meant a lucky year. Look down the well: the gourd dipper swings from side to side on its rope, and the moon's reflection drifts slowly on the water. Tap (or press Space) to let the rope go. The dipper keeps its swing as it falls, so let go a little before it is over the moon, not right above it. A splash sets the water rippling and the moon wobbling until it settles, while the dipper is drawn back up. Scoop the goal's worth of moons before the sky turns light.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}回", moons: "すくった月 {0}/{1}", start: "タップで縄を離そう！揺れの勢いを考えて早めに", win: "竜の卵をすくった！今年は運がいい！", lose: "夜が明けてしまった", result: "すくった月 {0} · 外したひしゃく {1}",
    again: "もう一度", next: "次の面", got: "竜の卵だ！", miss: "ぽちゃん…", dawn: "夜明けまで",
    help: "旧暦1月15日のテボルムの明け方、村の人々は急いで井戸へ向かいました。その日最初にくむ水を「竜の卵（ヨンアル）」と呼び、水に映る満月をすくって帰ると一年の運が良いとされました。井戸をのぞくと、縄に吊るしたひょうたんのひしゃくが左右に揺れ、水面には月影がゆっくり漂っています。タップ（またはスペース）で縄を離します。ひしゃくは揺れの勢いのまま落ちるので、月の真上ではなく少し手前で離しましょう。ぽちゃんと落ちると波が立って月が揺れ、静まるまでの間にひしゃくを引き上げます。夜が明ける前に目標の数だけ月をすくえばクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}次", moons: "舀到月亮 {0}/{1}", start: "点击松开绳子！要算上摆动，提前松手", win: "舀到龙蛋啦！今年好运！", lose: "天已经亮了", result: "舀到月亮 {0} · 落空的瓢 {1}",
    again: "再来一次", next: "下一关", got: "龙蛋！", miss: "扑通…", dawn: "离天亮",
    help: "正月十五（大보름）黎明，村里人急着赶到井边。那天打上来的第一桶水叫“龙蛋”（용알），把水里映着的圆月舀回家，就预示着一年好运。往井里看，绳子上挂着的葫芦瓢左右摆动，水面上月影慢慢漂着。点击（或按空格）就松开绳子。瓢会带着摆动的势头落下，所以不是在月亮正上方，而是稍微提前一点松手。扑通一声水面起波，月亮晃动直到平静，这时把瓢重新提上来。在天亮之前舀到目标次数的月亮即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0}", moons: "Lunes {0}/{1}", start: "Touchez pour lâcher la corde ! Lâchez en avance : le balancement emporte la louche", win: "L'œuf du dragon est puisé ! Une année de chance !", lose: "L'aube est arrivée", result: "{0} lunes puisées · {1} louches ratées",
    again: "Réessayer", next: "Niveau suivant", got: "L'œuf du dragon !", miss: "Plouf…", dawn: "Avant l'aube",
    help: "À l'aube de Jeongwol Daeboreum, la première pleine lune de l'année lunaire, les villageois couraient au puits. La première eau tirée ce jour-là s'appelait l'œuf du dragon (yongal), et rapporter la pleine lune qui s'y reflétait promettait une année de chance. Penchez-vous sur le puits : la louche en calebasse se balance au bout de sa corde, et le reflet de la lune dérive lentement sur l'eau. Touchez (ou Espace) pour lâcher la corde. La louche garde son élan en tombant : lâchez un peu avant qu'elle soit au-dessus de la lune, pas juste au-dessus. Un plouf fait onduler l'eau et trembler la lune jusqu'au calme, le temps de remonter la louche. Puisez assez de lunes avant que le ciel s'éclaircisse.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0}", moons: "Lunas {0}/{1}", start: "¡Toca para soltar la cuerda! Suelta antes: el vaivén arrastra el cazo", win: "¡Sacaste el huevo del dragón! ¡Un año de suerte!", lose: "Amaneció antes", result: "{0} lunas sacadas · {1} cazos fallados",
    again: "Reintentar", next: "Siguiente nivel", got: "¡El huevo del dragón!", miss: "Chof…", dawn: "Hasta el alba",
    help: "Al alba de Jeongwol Daeboreum, la primera luna llena del año lunar, los vecinos corrían al pozo. La primera agua sacada ese día se llamaba el huevo del dragón (yongal), y llevarse a casa la luna llena reflejada en ella prometía un año de suerte. Asómate al pozo: el cazo de calabaza se balancea de lado a lado colgado de la cuerda, y el reflejo de la luna flota despacio sobre el agua. Toca (o pulsa Espacio) para soltar la cuerda. El cazo conserva su impulso al caer, así que suéltalo un poco antes de que pase sobre la luna, no justo encima. Un chapoteo riza el agua y la luna tiembla hasta que se calma, mientras vuelves a subir el cazo. Saca las lunas de la meta antes de que clareé el cielo.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:yongal-scoop:muted";
const W = 360;
const H = 560;
const CY = 300; // the water's middle on screen

const DIPPER: PixelArt = { palette: { g: "#e9c46a", d: "#b8893a", k: "#6b4423" }, rows: ["..k..", ".ggg.", "ggdgg", "gdddg", "ggggg", ".ggg."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }
interface Ring { x: number; t: number }

export default function YongalScoop({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; scooped: number; missed: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wRef = useRef<Well>(newWell(YONGAL_STAGES[0]));
  const started = useRef(false);
  const taps = useRef(0); // taps since the last frame
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const rings = useRef<Ring[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = YONGAL_STAGES[stage];

  useRunRecord(YONGAL_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    wRef.current = newWell(YONGAL_STAGES[s]);
    started.current = false;
    taps.current = 0;
    parts.current = [];
    pops.current = [];
    rings.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(YONGAL_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== " " || wRef.current.over) return;
      ev.preventDefault();
      taps.current++;
      setTouched(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = wRef.current;
      const cp = copyRef.current;
      // taps are read once per frame; the first one only starts the dawn clock
      if (taps.current > 0) {
        taps.current = 0;
        if (!started.current) started.current = true;
        else if (drop(w)) sfx("tap");
      }
      if (started.current && !w.over) {
        const ev = stepWell(w, dt);
        if (ev.landed) {
          rings.current.push({ x: ev.landed.x, t: 0 });
          if (ev.landed.moon) {
            pops.current.push({ text: cp.got, t: 1, color: "#e67700", x: ev.landed.x, y: CY - 70 });
            spawnBurst(parts.current, ev.landed.x, CY, ["#ffd43b", "#fff3bf", "#ffffff"], 18, 120, Math.floor(w.t * 1000));
            sfx("success");
          } else {
            pops.current.push({ text: cp.miss, t: 0.8, color: "#4dabf7", x: ev.landed.x, y: CY - 60 });
            spawnBurst(parts.current, ev.landed.x, CY, ["#74c0fc", "#a5d8ff"], 10, 90, Math.floor(w.t * 1000));
            sfx("fail");
          }
        }
        if (ev.end) {
          setOver({ won: w.won, stars: starsFor(w), scooped: w.scooped, missed: w.missed });
          if (w.won) {
            setCleared(markStageCleared(YONGAL_SLUG, w.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 160);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);
      rings.current = rings.current.filter((r) => (r.t += dt) < 1.6);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const s = w.stage;
        const dawn = Math.min(1, w.t / s.time);
        // the stone rim of the well, seen from above, the night sky paling toward dawn around it
        ctx.fillStyle = `rgb(${Math.round(20 + 120 * dawn)},${Math.round(24 + 90 * dawn)},${Math.round(60 + 110 * dawn)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#868e96";
        ctx.beginPath();
        ctx.arc(CENTER, CY, WELL_R + 26, 0, Math.PI * 2);
        ctx.fill();
        for (let a = 0; a < 16; a++) {
          ctx.fillStyle = a % 2 ? "#adb5bd" : "#9aa0a6";
          ctx.beginPath();
          ctx.arc(CENTER, CY, WELL_R + 26, (a / 16) * Math.PI * 2, ((a + 1) / 16) * Math.PI * 2);
          ctx.arc(CENTER, CY, WELL_R + 2, ((a + 1) / 16) * Math.PI * 2, (a / 16) * Math.PI * 2, true);
          ctx.fill();
        }
        ctx.fillStyle = "#0b1d33";
        ctx.beginPath();
        ctx.arc(CENTER, CY, WELL_R, 0, Math.PI * 2);
        ctx.fill();
        // the moon's reflection (wobbling after a splash) and the ripples
        const mx = moonX(w, w.t);
        ctx.fillStyle = `rgba(255,243,191,${0.95 - dawn * 0.4})`;
        ctx.beginPath();
        ctx.arc(mx, CY, s.moonR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,212,59,0.5)";
        ctx.beginPath();
        ctx.arc(mx - s.moonR * 0.25, CY - s.moonR * 0.2, s.moonR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(165,216,255,0.6)";
        ctx.lineWidth = 2;
        for (const r of rings.current) {
          ctx.beginPath();
          ctx.ellipse(r.x, CY, 10 + r.t * 90, 6 + r.t * 50, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // the swing line, the rope from the windlass and the dipper (smaller as it falls away)
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(CENTER - s.swingAmp, CY - 1, s.swingAmp * 2, 2);
        if (w.dropAt >= 0) {
          const p = Math.min(1, (w.t - w.dropAt) / s.fall);
          const x0 = swingX(s, w.dropAt);
          const x = x0 + (w.dropX - x0) * p;
          drawSprite(ctx, DIPPER, x, CY - 6 * (1 - p), { scale: Math.max(3, Math.round(7 - 4 * p)) });
        } else if (w.ready) {
          const x = swingX(s, w.t);
          ctx.strokeStyle = "#c9a26b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(CENTER, 40);
          ctx.lineTo(x, CY - 20);
          ctx.stroke();
          drawSprite(ctx, DIPPER, x, CY - 6, { scale: 7 });
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.moons, w.scooped, s.need), 12, 30);
        // the dawn clock
        ctx.font = "13px sans-serif";
        ctx.fillText(cp.dawn, 12, H - 34);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(12, H - 26, W - 24, 10);
        ctx.fillStyle = "#ffa94d";
        ctx.fillRect(12, H - 26, (W - 24) * dawn, 10);
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
      data-game="yongal-scoop"
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
          onPointerDown={() => {
            if (wRef.current.over) return;
            setTouched(true);
            taps.current++;
          }}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.scooped, over.missed)}</p>
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
