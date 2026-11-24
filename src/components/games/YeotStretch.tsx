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
import { L0, LFOLD, SET_TEMP, STAGE_COUNT, WARN, YEOT_SLUG, YEOT_STAGES, grab, heat, letGo, limit, newYeot, starsFor, stepYeot, type Yeot } from "../../lib/games/yeot-stretch";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; folds: string; start: string; win: string; lose: string; snap: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; fold: string; creak: string; heat: string; mark: string; strain: string;
}> = {
  ko: {
    stage: "{0}단계", folds: "접기 {0}/{1}", start: "오른쪽으로 끌어 늘이고, 표시를 넘으면 손을 떼 접어요!", win: "엿이 굳기 전에 다 접었어요!", lose: "엿이 굳어 버렸어요", snap: "툭! 엿이 끊어졌어요", result: "접기 {0}번 · 가닥 {1}",
    again: "다시 하기", next: "다음 단계", fold: "접었다! ×2", creak: "끊어질 것 같아요!", heat: "온기", mark: "접는 선", strain: "당김",
    help: "따끈한 엿을 늘여 하얗게 만드는 게임이에요. 엿은 왼쪽 말뚝에 걸려 있어요. 화면을 누른 채 오른쪽으로 끌면 엿이 늘어나고, 접는 선을 넘긴 뒤 손을 떼면 말뚝으로 접혀 가닥이 두 배가 돼요. 짧은 엿은 살살, 길게 늘어난 엿은 빠르게 당겨도 버텨요. 길이에 비해 너무 빨리 당기면 당김 막대가 빨개지고 툭 끊어져요. 엿은 계속 식고 접을수록 뻣뻣해져서, 온기가 바닥나면 굳어 버려요. 굳기 전에 정해진 만큼 접으면 통과예요. 키보드는 →를 누르는 동안 당기고, 떼면 접혀요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", folds: "Folds {0}/{1}", start: "Drag right to stretch, let go past the mark to fold!", win: "All folded before it set!", lose: "The taffy set", snap: "Snap! The taffy broke", result: "{0} folds · {1} strands",
    again: "Pull again", next: "Next stage", fold: "Folded! ×2", creak: "About to snap!", heat: "Heat", mark: "Fold mark", strain: "Strain",
    help: "Pull warm Korean rice taffy (yeot) until it turns white. The taffy hangs from a peg on the left. Press and drag right to stretch it; let go past the fold mark and it folds back onto the peg, doubling the strands. A short rope must be pulled gently, but a long one can take a fast pull. Pull too fast for its length and the strain bar turns red and it snaps. The taffy cools all the time and stiffens with every fold; when the heat runs out it sets. Make the stage's folds before then. Keyboard: hold → to pull, let go to fold.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", folds: "折り {0}/{1}", start: "右へドラッグしてのばし、線を越えたら指を離して折ろう！", win: "固まる前に折りきった！", lose: "飴が固まってしまった", snap: "プツッ！ 飴が切れた", result: "{0}回折り · {1}本",
    again: "もう一度", next: "次の面", fold: "折った！ ×2", creak: "切れそう！", heat: "温かさ", mark: "折り線", strain: "張り",
    help: "温かい韓国の米飴(ヨッ)をのばして白くするゲーム。飴は左のくいに掛かっています。押したまま右へドラッグするとのび、折り線を越えてから指を離すとくいへ折り返して本数が2倍に。短い飴はそっと、長くのびた飴は速く引いても耐えます。長さのわりに速く引きすぎると張りメーターが赤くなってプツッと切れます。飴はどんどん冷め、折るたびに硬くなり、温かさがなくなると固まります。固まる前に決められた回数折ればクリア。キーボードは → を押している間引いて、離すと折ります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", folds: "折叠 {0}/{1}", start: "向右拖动拉长，过了线就松手折起来！", win: "在糖变硬前折完了！", lose: "糖变硬了", snap: "啪！糖断了", result: "折叠 {0} 次 · {1} 股",
    again: "再拉一次", next: "下一关", fold: "折好了！×2", creak: "快断了！", heat: "温度", mark: "折叠线", strain: "拉力",
    help: "把温热的韩国米糖（饴糖）拉白的游戏。糖挂在左边的木桩上。按住向右拖就能拉长，过了折叠线再松手，糖会折回木桩，股数翻倍。短的糖要轻轻拉，拉长以后就能拉得快。相对长度拉得太快，拉力条会变红，糖会啪地断掉。糖一直在变凉，每折一次也更硬，温度用完就凝固了。在凝固前折够规定次数就过关。键盘按住 → 拉，松开就折。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", folds: "Plis {0}/{1}", start: "Glissez à droite pour étirer, lâchez après le repère pour plier !", win: "Tout plié avant qu'il durcisse !", lose: "Le caramel a durci", snap: "Clac ! Le caramel a cassé", result: "{0} plis · {1} brins",
    again: "Étirer à nouveau", next: "Niveau suivant", fold: "Plié ! ×2", creak: "Ça va casser !", heat: "Chaleur", mark: "Repère de pli", strain: "Tension",
    help: "Étirez du caramel de riz coréen (yeot) tiède jusqu'à ce qu'il blanchisse. Il pend à une cheville à gauche. Appuyez et glissez vers la droite pour l'étirer ; lâchez après le repère et il se replie sur la cheville, doublant les brins. Un brin court s'étire doucement, un long supporte une traction rapide. Tirez trop vite pour sa longueur et la jauge de tension rougit, puis il casse. Il refroidit sans cesse et durcit à chaque pli ; quand la chaleur est épuisée, il prend. Faites les plis demandés avant. Clavier : maintenez → pour tirer, relâchez pour plier.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", folds: "Pliegues {0}/{1}", start: "¡Arrastra a la derecha para estirar y suelta tras la marca para doblar!", win: "¡Todo doblado antes de que cuajara!", lose: "El caramelo cuajó", snap: "¡Crac! Se rompió el caramelo", result: "{0} pliegues · {1} hebras",
    again: "Estirar otra vez", next: "Siguiente nivel", fold: "¡Doblado! ×2", creak: "¡Está por romperse!", heat: "Calor", mark: "Marca de pliegue", strain: "Tensión",
    help: "Estira caramelo de arroz coreano (yeot) tibio hasta que se vuelva blanco. Cuelga de una estaca a la izquierda. Mantén pulsado y arrastra a la derecha para estirarlo; suelta pasada la marca y se dobla sobre la estaca, duplicando las hebras. Una hebra corta se estira con suavidad, una larga aguanta un tirón rápido. Si tiras muy rápido para su largo, la barra de tensión se pone roja y se rompe. Se enfría sin parar y se endurece con cada pliegue; cuando se acaba el calor, cuaja. Haz los pliegues del nivel antes. Teclado: mantén → para tirar, suelta para doblar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:yeot-stretch:muted";
const W = 360;
const H = 560;
const PEG_X = 34;
const ROPE_Y = 250;
const KEY_RATE = 1.5; // keyboard pulls at this stretch rate (1/s)

const HAND: PixelArt = {
  palette: { k: "#5c3d2e", s: "#f1c27d", d: "#d9a066" },
  rows: ["..ss.ss..", ".ssssssss", "sssssssss", "sdsssssss", "sssssssd.", ".sssssss.", "..sssss..", "..kkkkk.."],
};
const PEG: PixelArt = {
  palette: { k: "#3b2414", b: "#8b5a2b", l: "#b07a46" },
  rows: ["kkkkkk", "kbllbk", "kbllbk", "kbllbk", "kbllbk", "kbbbbk", "kbbbbk", "kkkkkk"],
};

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

interface Pop { text: string; t: number; color: string }

export default function YeotStretch({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [folds, setFolds] = useState(0);
  const [over, setOver] = useState<null | { won: boolean; snapped: boolean; stars: number; folds: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yRef = useRef<Yeot>(newYeot(YEOT_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const moved = useRef(0); // px dragged right since the last frame
  const lastX = useRef<number | null>(null);
  const keyHeld = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const creakT = useRef(0);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = YEOT_STAGES[stage];

  useRunRecord(YEOT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    yRef.current = newYeot(YEOT_STAGES[s]);
    started.current = false;
    input.current = [];
    moved.current = 0;
    lastX.current = null;
    keyHeld.current = false;
    parts.current = [];
    pops.current = [];
    setFolds(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(YEOT_SLUG, STAGE_COUNT);
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
      const y = yRef.current;
      const cp = copyRef.current;
      // the finger is read once per frame: presses, releases and how far it moved right
      for (const e of input.current.splice(0)) {
        if (e === "down") {
          started.current = true;
          grab(y);
        } else if (letGo(y) === "fold") {
          pops.current.push({ text: cp.fold, t: 0.9, color: "#2f9e44" });
          spawnBurst(parts.current, PEG_X + 20, ROPE_Y, ["#fff3bf", "#ffe8cc"], 14, 90, Math.floor(y.t * 1000));
          setFolds(y.folds);
          sfx("success");
        }
      }
      let dx = moved.current;
      moved.current = 0;
      if (keyHeld.current && y.grabbing) dx = KEY_RATE * y.len * dt;
      if (started.current && !y.over) {
        const ev = stepYeot(y, dx, dt);
        if (y.grabbing && y.strain > limit(y) * WARN && (creakT.current -= dt) <= 0) {
          creakT.current = 0.35;
          pops.current.push({ text: cp.creak, t: 0.5, color: "#e03131" });
          haptics.current?.fire("tap");
        }
        if (ev === "snap" || ev === "set") {
          if (ev === "snap") spawnBurst(parts.current, PEG_X + y.len / 2, ROPE_Y, ["#f08c00", "#ffd8a8"], 24, 160, Math.floor(y.t * 1000));
          setOver({ won: y.won, snapped: y.snapped, stars: starsFor(y), folds: y.folds });
          if (y.won) {
            setCleared(markStageCleared(YEOT_SLUG, y.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 260);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm kitchen: hanji wall and a wooden board
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe8cc";
        for (let i = 0; i < 6; i++) ctx.fillRect(0, 40 + i * 60, W, 2);
        ctx.fillStyle = "#a0522d";
        ctx.fillRect(0, 330, W, 40);
        ctx.fillStyle = "#8b4513";
        for (let i = 0; i < 8; i++) ctx.fillRect(i * 48, 330, 2, 40);
        // fold mark
        const markX = PEG_X + LFOLD;
        ctx.strokeStyle = "#2f9e44";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(markX, 150);
        ctx.lineTo(markX, 330);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#2f9e44";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cp.mark, markX - 6, 142);
        // the taffy: whiter with every fold, thinner as it stretches, sagging when not held
        const len = y.len;
        const endX = PEG_X + Math.min(len, W - PEG_X - 10);
        const warm = heat(y);
        const color = mix([214, 128, 40], [255, 248, 230], y.folds / 8 + (1 - warm) * 0.15);
        const thick = Math.max(3, Math.min(26, (1400 / len) * (1 + y.folds * 0.08)));
        const sag = y.grabbing ? 6 : 30;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(PEG_X, ROPE_Y);
        ctx.quadraticCurveTo((PEG_X + endX) / 2, ROPE_Y + sag, endX, ROPE_Y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = Math.max(1, thick * 0.3);
        ctx.stroke();
        drawSprite(ctx, PEG, PEG_X - 4, ROPE_Y, { scale: 3 });
        if (y.grabbing && !y.snapped) drawSprite(ctx, HAND, endX + 10, ROPE_Y, { scale: 3 });
        drawParticles(ctx, parts.current);
        // meters: heat and strain
        const bx = 24;
        const bw = W - 48;
        ctx.textAlign = "left";
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#5c3d2e";
        ctx.fillText(cp.heat, bx, 404);
        ctx.fillStyle = "rgba(92,61,46,0.15)";
        ctx.fillRect(bx, 412, bw, 14);
        ctx.fillStyle = warm > SET_TEMP + 0.15 ? "#f76707" : "#fa5252";
        ctx.fillRect(bx, 412, (bw * Math.max(0, warm - SET_TEMP)) / (1 - SET_TEMP), 14);
        ctx.fillStyle = "#5c3d2e";
        ctx.fillText(cp.strain, bx, 452);
        ctx.fillStyle = "rgba(92,61,46,0.15)";
        ctx.fillRect(bx, 460, bw, 14);
        const sr = Math.min(1, y.strain / limit(y));
        ctx.fillStyle = sr > WARN ? "#e03131" : sr > 0.55 ? "#f59f00" : "#37b24d";
        ctx.fillRect(bx, 460, bw * sr, 14);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(bx + bw - 2, 456, 3, 22);
        // strands so far
        ctx.textAlign = "center";
        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = "#5c3d2e";
        ctx.fillText(`×${2 ** y.folds}`, W / 2, 96);
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 190 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 190);
        }
        if (len < L0 + 1 && !y.grabbing && !y.over) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "#868e96";
          ctx.fillText("→ → →", W / 2, ROPE_Y - 40);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvasX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) * W) / r.width;
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" || e.repeat) return;
      e.preventDefault();
      if (yRef.current.over) return;
      setTouched(true);
      keyHeld.current = true;
      input.current.push("down");
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight") return;
      e.preventDefault();
      keyHeld.current = false;
      input.current.push("up");
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
      data-game="yeot-stretch"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.folds, folds, st.need)}</Badge>
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
            if (yRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            lastX.current = toCanvasX(e);
            input.current.push("down");
          }}
          onPointerMove={(e) => {
            if (lastX.current === null) return;
            const x = toCanvasX(e);
            moved.current += Math.max(0, x - lastX.current);
            lastX.current = x;
          }}
          onPointerUp={() => {
            lastX.current = null;
            input.current.push("up");
          }}
          onPointerCancel={() => {
            lastX.current = null;
            input.current.push("up");
          }}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-16 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.snapped ? c.snap : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.folds, 2 ** over.folds)}</p>
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
