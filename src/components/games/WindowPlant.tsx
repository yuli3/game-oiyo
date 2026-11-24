import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, Droplets, Maximize2, Minimize2, RefreshCw, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { BUG_LIFE, PLANT_SLUG, PLANT_STAGES, STAGE_COUNT, act, bugsOn, cloudy, newPlant, starsFor, stepPlant, sunAt, type Act, type Plant } from "../../lib/games/window-plant";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; height: string; start: string; water: string; turn: string; bug: string; dry: string; soggy: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}일째", height: "키 {0}/{1}", start: "일하는 동안 옆에 켜 두세요. 가끔 들여다보며 돌봐요.", water: "물 주기", turn: "화분 돌리기", bug: "벌레 털기", dry: "흙이 말랐어요", soggy: "물이 너무 많아요",
    win: "쑥쑥 자랐어요!", lose: "저녁이 됐어요", result: "키 {0} · 물 {1}번", again: "다시 키우기", next: "다음 날",
    help: "일하는 화면 옆, 창가에 놓인 화분이에요. 하루 동안 해가 창을 가로질러 가고, 흙은 천천히 마르고, 가끔 작은 초록 벌레가 잎에 앉아요. 계속 붙어 있을 필요 없어요. 일하다가 가끔 들여다보고 흙이 마르면 물을 주고(아직 젖어 있을 때 주면 뿌리가 썩어요), 해 쪽으로 화분을 돌리고, 벌레가 잎을 갉기 전에 털어 주세요. 해 질 무렵까지 그날의 목표 키만큼 자라면 통과예요. (키보드: W 물 주기, T 화분 돌리기, B 벌레 털기)",
    stages: "날짜 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Day {0}", height: "Height {0}/{1}", start: "Leave it open beside your work and look after it now and then.", water: "Water", turn: "Turn pot", bug: "Flick bug", dry: "The soil is dry", soggy: "Too much water",
    win: "It shot up!", lose: "Evening came", result: "Height {0} · watered {1} times", again: "Grow again", next: "Next day",
    help: "A pot on the windowsill beside your work. Over the day the sun crosses the window, the soil slowly dries, and now and then a little green bug lands on a leaf. You don't need to watch it: glance over now and then, water when the soil is dry (water it while it's still wet and the roots rot), turn the pot towards the sun, and flick bugs off before they nibble. Grow it to the day's height by evening. (Keyboard: W to water, T to turn the pot, B to flick a bug.)",
    stages: "Choose a day", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}日目", height: "高さ {0}/{1}", start: "作業の横で開いておいて、ときどき世話をしよう。", water: "水やり", turn: "鉢を回す", bug: "虫を払う", dry: "土が乾いた", soggy: "水が多すぎる",
    win: "ぐんぐん育った！", lose: "夕方になった", result: "高さ {0}・水やり {1}回", again: "もう一度育てる", next: "次の日",
    help: "作業画面の横、窓辺に置いた鉢植えです。一日のうちに太陽が窓を横切り、土はゆっくり乾き、ときどき小さな緑の虫が葉にとまります。ずっと見ている必要はありません。作業の合間にのぞいて、土が乾いたら水をやり（まだ湿っているうちにやると根腐れします）、鉢を日の当たる方へ回し、虫が葉をかじる前に払いましょう。夕方までにその日の目標の高さまで育てばクリア。（キーボード：Wで水やり、Tで鉢を回す、Bで虫を払う）",
    stages: "日を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}天", height: "高度 {0}/{1}", start: "工作时开在旁边，偶尔照看一下。", water: "浇水", turn: "转花盆", bug: "赶虫子", dry: "土干了", soggy: "水太多了",
    win: "长得真快！", lose: "天黑了", result: "高度 {0} · 浇水 {1} 次", again: "重新种", next: "下一天",
    help: "放在工作屏幕旁窗台上的一盆植物。一天里太阳从窗前划过，土慢慢变干，偶尔还有小绿虫落在叶子上。不用一直盯着：工作间隙看一眼，土干了就浇水（还湿着就浇会烂根），把花盆转向太阳，在虫子啃叶子前把它赶走。傍晚前长到当天的目标高度就过关。（键盘：W浇水，T转花盆，B赶虫子）",
    stages: "选择日子", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Jour {0}", height: "Hauteur {0}/{1}", start: "Laissez-le ouvert à côté de votre travail et occupez-vous-en de temps en temps.", water: "Arroser", turn: "Tourner le pot", bug: "Chasser l'insecte", dry: "La terre est sèche", soggy: "Trop d'eau",
    win: "Elle a bien poussé !", lose: "Le soir est venu", result: "Hauteur {0} · arrosée {1} fois", again: "Refaire pousser", next: "Jour suivant",
    help: "Un pot sur le rebord de la fenêtre, à côté de votre travail. Au fil du jour, le soleil traverse la fenêtre, la terre sèche doucement, et parfois un petit insecte vert se pose sur une feuille. Pas besoin de la surveiller : jetez un œil de temps en temps, arrosez quand la terre est sèche (arroser une terre encore humide fait pourrir les racines), tournez le pot vers le soleil et chassez les insectes avant qu'ils ne grignotent. Faites-la pousser jusqu'à la hauteur du jour avant le soir. (Clavier : W arroser, T tourner, B chasser.)",
    stages: "Choisir un jour", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Día {0}", height: "Altura {0}/{1}", start: "Déjala abierta junto a tu trabajo y cuídala de vez en cuando.", water: "Regar", turn: "Girar maceta", bug: "Quitar bicho", dry: "La tierra está seca", soggy: "Demasiada agua",
    win: "¡Ha crecido mucho!", lose: "Llegó la tarde", result: "Altura {0} · regada {1} veces", again: "Cultivar otra vez", next: "Día siguiente",
    help: "Una maceta en el alféizar, junto a tu trabajo. A lo largo del día el sol cruza la ventana, la tierra se seca despacio y de vez en cuando un bichito verde se posa en una hoja. No hace falta vigilarla: échale un vistazo de vez en cuando, riega cuando la tierra esté seca (si riegas aún húmeda, se pudren las raíces), gira la maceta hacia el sol y quita los bichos antes de que muerdan. Hazla crecer hasta la altura del día antes de la tarde. (Teclado: W regar, T girar, B quitar bicho.)",
    stages: "Elegir día", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:window-plant:muted";
const W = 360;
const H = 560;
const POT_Y = 440;
const BUG: PixelArt = { palette: { g: "#2b8a3e", l: "#8ce99a", k: "#212529" }, rows: [".k.k.", "gglgg", "glllg", ".ggg."] };
const SUN: PixelArt = { palette: { y: "#ffd43b", o: "#fab005" }, rows: [".y.y.", "yoooy", ".ooo.", "yoooy", ".y.y."] };

interface Pop { text: string; t: number; color: string }

export default function WindowPlant({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; height: number; waterings: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pRef = useRef<Plant>(newPlant(PLANT_STAGES[0]));
  const acts = useRef<Act[]>([]);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = PLANT_STAGES[stage];

  useRunRecord(PLANT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    pRef.current = newPlant(PLANT_STAGES[s]);
    acts.current = [];
    started.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PLANT_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const push = useCallback((a: Act) => {
    acts.current.push(a);
    started.current = true;
    setTouched(true);
  }, []);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k === "w") push("water");
      else if (k === "t") push("turn");
      else if (k === "b") push("bug");
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [push]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = pRef.current;
      const s = p.stage;
      const cp = copyRef.current;
      // actions are read once per frame
      for (const a of acts.current.splice(0)) {
        if (p.over) break;
        if (act(p, a)) {
          if (a === "water") {
            spawnBurst(parts.current, W / 2, POT_Y - 10, ["#74c0fc", "#a5d8ff"], 10, 60, 2);
            sfx(p.moisture > 0.95 ? "fail" : "place");
          } else if (a === "turn") sfx("tap");
          else {
            spawnBurst(parts.current, W / 2 + 30, POT_Y - 60, ["#8ce99a"], 6, 80, 2);
            sfx("success");
          }
        }
      }
      if (started.current && !p.over) {
        const was = p.moisture;
        if (stepPlant(p, dt)) {
          setOver({ won: p.won, stars: starsFor(p), height: Math.round(p.height), waterings: p.waterings });
          if (p.won) {
            setCleared(markStageCleared(PLANT_SLUG, s.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, POT_Y - 120, ["#ffd43b", "#ff8787", "#fff"], 24, 100, 3);
            sfx("win");
          } else sfx("lose");
        }
        if (was >= 0.15 && p.moisture < 0.15) pops.current = [{ text: cp.dry, t: 1.5, color: "#e8590c" }];
        if (p.soggy > 3 && p.soggy - dt <= 3) pops.current = [{ text: cp.soggy, t: 1.5, color: "#1971c2" }];
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the window: sky by time of day, the sun crossing it, any cloud
        const dayT = Math.min(1, p.t / s.day);
        const sky = ctx.createLinearGradient(0, 40, 0, 360);
        sky.addColorStop(0, dayT > 0.85 ? "#f59f00" : "#74c0fc");
        sky.addColorStop(1, dayT > 0.85 ? "#ffd8a8" : "#d0ebff");
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = sky;
        ctx.fillRect(30, 40, W - 60, 320);
        const sx = 30 + ((sunAt(s, p.t) + 1) / 2) * (W - 60);
        if (!cloudy(s, p.t)) drawSprite(ctx, SUN, sx, 90 + Math.abs(sunAt(s, p.t)) * 50, { scale: 7 });
        else {
          ctx.fillStyle = "#f8f9fa";
          for (let k = 0; k < 4; k++) ctx.fillRect(sx - 50 + k * 24, 90 + (k % 2) * 10, 40, 26);
        }
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(W / 2 - 3, 40, 6, 320);
        ctx.fillRect(30, 195, W - 60, 6);
        ctx.strokeStyle = "#adb5bd";
        ctx.lineWidth = 10;
        ctx.strokeRect(25, 35, W - 50, 330);
        // the sill, the pot and its soil (darker when wet)
        ctx.fillStyle = "#c0a080";
        ctx.fillRect(0, POT_Y + 30, W, 30);
        ctx.fillStyle = "#d9480f";
        ctx.fillRect(W / 2 - 40, POT_Y - 10, 80, 44);
        ctx.fillStyle = "#e8590c";
        ctx.fillRect(W / 2 - 46, POT_Y - 16, 92, 12);
        const m = Math.min(1, p.moisture);
        ctx.fillStyle = `rgb(${Math.round(150 - m * 90)}, ${Math.round(110 - m * 70)}, ${Math.round(70 - m * 40)})`;
        ctx.fillRect(W / 2 - 40, POT_Y - 18, 80, 6);
        // the plant: a stem as tall as it has grown, leaves leaning toward the side it faces
        const tall = Math.min(260, 10 + (p.height / s.target) * 240);
        ctx.fillStyle = "#2f9e44";
        ctx.fillRect(W / 2 - 2, POT_Y - 18 - tall, 4, tall);
        const wilt = p.moisture < 0.15 ? 6 : 0;
        for (let k = 0; k < Math.floor(tall / 22); k++) {
          const ly = POT_Y - 30 - k * 22;
          const side = (k % 2 === 0 ? 1 : -1) * p.facing;
          ctx.fillStyle = k % 3 === 0 ? "#40c057" : "#51cf66";
          ctx.fillRect(W / 2 + (side > 0 ? 2 : -24), ly + wilt, 22, 9);
        }
        bugsOn(p).forEach((b, k) => {
          const nibbling = p.t - b.at > BUG_LIFE;
          drawSprite(ctx, BUG, W / 2 + 20 - k * 30, POT_Y - 50 - (k % 3) * 30 + (nibbling ? Math.sin(now / 80) * 2 : 0), { scale: 3 });
        });
        drawParticles(ctx, parts.current);
        // gauges: height toward the day's target, soil moisture, time of day
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, 30);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.fillText(fill(cp.height, Math.floor(p.height), s.target), 10, 20);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(200, 10, 150, 10);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(200, 10, 150 * dayT, 10);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(14, POT_Y + 66, 120, 10);
        ctx.fillStyle = p.moisture > 0.95 ? "#1971c2" : p.moisture < 0.3 ? "#e8590c" : "#4dabf7";
        ctx.fillRect(14, POT_Y + 66, 120 * Math.min(1, p.moisture / 1.2), 10);
        ctx.fillStyle = "#2f9e44";
        ctx.fillRect(14 + 120 * (0.3 / 1.2), POT_Y + 63, 2, 16);
        ctx.fillRect(14 + 120 * (0.85 / 1.2), POT_Y + 63, 2, 16);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 14;
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(W / 2 - tw / 2, 380, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 397);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pRef.current;
    if (p.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - r.top) * H) / r.height;
    // tapping the leaves flicks a bug; tapping the soil waters
    if (y < POT_Y - 20 && bugsOn(p).length) push("bug");
    else if (y >= POT_Y - 20 && y <= POT_Y + 34) push("water");
    else {
      started.current = true;
      setTouched(true);
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
      data-game="window-plant"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.height, 0, st.target)}</Badge>
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
          onPointerDown={onDown}
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
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.height, over.waterings)}</p>
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
      <div className="grid grid-cols-3 gap-2">
        <Button className="min-h-12" disabled={Boolean(over)} onClick={() => push("water")}>
          <Droplets className="size-4" />
          <span>{c.water}</span>
        </Button>
        <Button variant="secondary" className="min-h-12" disabled={Boolean(over)} onClick={() => push("turn")}>
          <RefreshCw className="size-4" />
          <span>{c.turn}</span>
        </Button>
        <Button variant="outline" className="min-h-12" disabled={Boolean(over)} onClick={() => push("bug")}>
          <Bug className="size-4" />
          <span>{c.bug}</span>
        </Button>
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
