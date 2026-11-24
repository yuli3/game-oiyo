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
import { ICE_ROAD_SLUG, ICE_ROAD_STAGES, STAGE_COUNT, VMAX, bandLoad, newDrive, starsFor, stepDrive, stretchAt, type Drive } from "../../lib/games/ice-road";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; start: string; win: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; crack: string; ridge: string; time: string; cracking: string; left: string; speed: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "제한 {0}초", start: "누르고 있으면 가속, 떼면 브레이크! 빨간 띠 속도는 피해요", win: "호수를 건넜어요!", result: "{0}초 만에 도착",
    crack: "얼음이 깨졌어요", ridge: "얼음 둑에서 미끄러졌어요", time: "시간이 다 됐어요", cracking: "쩍…", left: "남은 거리 {0}m", speed: "{0} km/h",
    again: "다시 달리기", next: "다음 단계",
    help: "얼어붙은 호수 위로 트럭을 몰아요. 무거운 트럭은 얼음 밑으로 물결을 밀어내는데, 트럭 속도가 그 물결 속도와 같아지면 물결이 바퀴 밑에 쌓여 얼음이 갈라져요. 물결 속도는 물 깊이에 따라 달라서, 구간마다 위험한 속도 띠(속도계의 빨간 부분)가 달라요. 누르고 있으면 가속, 떼면 브레이크예요. 띠보다 느리게 가거나 띠보다 빠르게 가고, 띠를 지나야 할 때는 재빨리 지나가요. 하얀 얼음 둑은 천천히 넘어야 하고, 시간 제한이 있으니 기어가기만 해서도 안 돼요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Limit {0}s", start: "Hold to speed up, let go to brake! Stay out of the red band", win: "Across the lake!", result: "Made it in {0}s",
    crack: "The ice broke", ridge: "Spun out on a pressure ridge", time: "Out of time", cracking: "Crack…", left: "{0} m to go", speed: "{0} km/h",
    again: "Drive again", next: "Next stage",
    help: "Drive a truck across a frozen lake. A heavy truck pushes a wave along under the ice, and when the truck's speed matches the wave's, the wave piles up under the wheels and the ice cracks. The wave's speed depends on the water's depth, so each stretch has its own danger band (red on the speedometer). Hold to speed up, let go to brake. Go under the band or over it, and when you must cross it, cross it fast. Take the white pressure ridges slowly, and mind the clock: crawling won't do either.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "制限 {0}秒", start: "押すと加速、離すとブレーキ！赤い帯の速さは避けよう", win: "湖を渡りきった！", result: "{0}秒で到着",
    crack: "氷が割れた", ridge: "氷丘でスリップした", time: "時間切れ", cracking: "ピキッ…", left: "残り {0}m", speed: "{0} km/h",
    again: "もう一度", next: "次の面",
    help: "凍った湖の上をトラックで渡ります。重いトラックは氷の下に波を押し出し、トラックの速さが波の速さと同じになると波が車輪の下にたまって氷が割れます。波の速さは水深で変わるので、区間ごとに危ない速さの帯（速度計の赤い部分）が違います。押すと加速、離すとブレーキ。帯より遅く走るか帯より速く走り、帯を越えるときは素早く越えましょう。白い氷丘はゆっくり越え、制限時間があるのでのろのろ走るだけでもだめです。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "限时 {0}秒", start: "按住加速，松开刹车！避开红色速度带", win: "成功横穿湖面！", result: "用时 {0}秒",
    crack: "冰面裂开了", ridge: "在冰脊上打滑了", time: "时间到了", cracking: "咔嚓…", left: "还剩 {0}米", speed: "{0} km/h",
    again: "再开一次", next: "下一关",
    help: "驾驶卡车穿过结冰的湖面。沉重的卡车会在冰下推起一道波，当车速和波速一致时，波会堆在车轮下，冰面就会裂开。波速取决于水深，所以每一段都有各自的危险速度带（速度表上的红色部分）。按住加速，松开刹车。要么比速度带慢，要么比它快；必须穿过时就要快速穿过。白色冰脊要慢慢开过去，而且有时间限制，一味慢慢爬也不行。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Limite {0} s", start: "Maintenez pour accélérer, relâchez pour freiner ! Évitez la bande rouge", win: "Le lac est traversé !", result: "Arrivé en {0} s",
    crack: "La glace a cédé", ridge: "Dérapage sur une crête de glace", time: "Temps écoulé", cracking: "Crac…", left: "Encore {0} m", speed: "{0} km/h",
    again: "Rouler à nouveau", next: "Niveau suivant",
    help: "Conduisez un camion sur un lac gelé. Un camion lourd pousse une onde sous la glace ; quand sa vitesse égale celle de l'onde, l'onde s'accumule sous les roues et la glace se fend. La vitesse de l'onde dépend de la profondeur de l'eau : chaque tronçon a sa bande dangereuse (en rouge sur le compteur). Maintenez pour accélérer, relâchez pour freiner. Roulez sous la bande ou au-dessus, et quand il faut la traverser, faites-le vite. Passez les crêtes de glace blanches lentement, et surveillez le chrono : se traîner ne suffit pas.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Límite {0} s", start: "¡Mantén para acelerar, suelta para frenar! Evita la franja roja", win: "¡Lago cruzado!", result: "Llegaste en {0} s",
    crack: "El hielo se rompió", ridge: "Derrapaste en una cresta de hielo", time: "Se acabó el tiempo", cracking: "Crac…", left: "Faltan {0} m", speed: "{0} km/h",
    again: "Conducir otra vez", next: "Siguiente nivel",
    help: "Conduce un camión sobre un lago helado. Un camión pesado empuja una onda bajo el hielo; cuando su velocidad iguala la de la onda, esta se acumula bajo las ruedas y el hielo se agrieta. La velocidad de la onda depende de la profundidad del agua, así que cada tramo tiene su franja peligrosa (en rojo en el velocímetro). Mantén para acelerar, suelta para frenar. Ve por debajo de la franja o por encima, y cuando tengas que cruzarla, hazlo rápido. Pasa despacio las crestas blancas y vigila el reloj: arrastrarse tampoco sirve.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ice-road:muted";
const W = 360;
const H = 560;
const PX = 5; // px per metre
const TRUCK_Y = 430;
const ROAD_X = 150;
const ROAD_W = 90;
const KMH = 3.6;

const TRUCK: PixelArt = {
  palette: { r: "#e03131", d: "#a51111", w: "#a5d8ff", k: "#212529", g: "#ced4da" },
  rows: [".rrrr.", "rwwwwr", "rrrrrr", "kggggk", ".gggg.", "kggggk", ".gggg.", "kggggk"],
};

interface Pop { text: string; t: number; color: string; x: number; y: number }

// depth tint: shallow ice is pale, deep ice dark blue
function iceColor(wave: number): string {
  const k = Math.max(0, Math.min(1, (wave - 10) / 17));
  const r = Math.round(200 - 150 * k);
  const g = Math.round(235 - 120 * k);
  const b = Math.round(250 - 60 * k);
  return `rgb(${r},${g},${b})`;
}

export default function IceRoad({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; t: number; fail: Drive["fail"] }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dRef = useRef<Drive>(newDrive(ICE_ROAD_STAGES[0]));
  const started = useRef(false);
  const gas = useRef({ pointer: false, key: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = ICE_ROAD_STAGES[stage];

  useRunRecord(ICE_ROAD_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    dRef.current = newDrive(ICE_ROAD_STAGES[s]);
    started.current = false;
    gas.current = { pointer: false, key: false };
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(ICE_ROAD_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const isGas = (k: string) => k === " " || k === "ArrowUp" || k === "w";
    const down = (ev: KeyboardEvent) => {
      if (!isGas(ev.key) || dRef.current.over) return;
      ev.preventDefault();
      gas.current.key = true;
      setTouched(true);
    };
    const up = (ev: KeyboardEvent) => {
      if (isGas(ev.key)) gas.current.key = false;
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
    let crackCue = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const d = dRef.current;
      const cp = copyRef.current;
      // the pedal is read once per frame
      const pedal = gas.current.pointer || gas.current.key;
      if (pedal) started.current = true;
      if (started.current && !d.over) {
        const ev = stepDrive(d, pedal, dt);
        crackCue -= dt;
        if (ev.cracking && crackCue <= 0) {
          crackCue = 0.35;
          pops.current.push({ text: cp.cracking, t: 0.5, color: "#e03131", x: ROAD_X + 70, y: TRUCK_Y - 40 });
          sfx("tap");
        }
        if (ev.ridge && !ev.end) sfx("place");
        if (ev.end) {
          setOver({ won: d.won, stars: starsFor(d), t: d.t, fail: d.fail });
          if (!d.won) spawnBurst(parts.current, ROAD_X + ROAD_W / 2, TRUCK_Y, ["#e7f5ff", "#74c0fc", "#1c7ed6"], 24, 140, Math.floor(d.t * 1000));
          if (d.won) {
            setCleared(markStageCleared(ICE_ROAD_SLUG, d.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const top = d.x + (TRUCK_Y / PX); // metres at screen top
        const yOf = (m: number) => TRUCK_Y - (m - d.x) * PX;
        // the lake: each stretch tinted by depth
        ctx.fillStyle = "#f1f3f5";
        ctx.fillRect(0, 0, W, H);
        for (const s of d.stage.stretches) {
          if (s.to < d.x - 40 || s.from > top) continue;
          const y0 = yOf(s.to);
          const y1 = yOf(s.from);
          ctx.fillStyle = iceColor(s.wave);
          ctx.fillRect(0, y0, W - 70, y1 - y0);
        }
        // the road
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillRect(ROAD_X, 0, ROAD_W, H);
        ctx.fillStyle = "rgba(73,80,87,0.35)";
        for (let m = Math.floor((d.x - 40) / 8) * 8; m < top; m += 8) ctx.fillRect(ROAD_X + ROAD_W / 2 - 1, yOf(m), 2, 16);
        // the finish and the ridges
        ctx.fillStyle = "#212529";
        for (let i = 0; i < 9; i++) ctx.fillRect(ROAD_X + i * 10, yOf(d.stage.length) - (i % 2) * 6, 10, 6);
        for (const r of d.stage.ridges) {
          const y = yOf(r.at);
          if (y < -10 || y > H + 10) continue;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(ROAD_X - 20, y - 5, ROAD_W + 40, 10);
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(ROAD_X - 20, y + 3, ROAD_W + 40, 2);
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillStyle = "#1c2541";
          ctx.fillText(`≤${Math.round(r.limit * KMH)}`, ROAD_X + ROAD_W + 24, y + 4);
        }
        // cracks spreading as stress builds
        if (d.stress > 0.05) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, d.stress + 0.2)})`;
          ctx.lineWidth = 2;
          const n = Math.ceil(d.stress * 8);
          for (let i = 0; i < n; i++) {
            const a = i * 2.4;
            const len = 20 + d.stress * 60;
            ctx.beginPath();
            ctx.moveTo(ROAD_X + ROAD_W / 2, TRUCK_Y);
            ctx.lineTo(ROAD_X + ROAD_W / 2 + Math.cos(a) * len * 0.6, TRUCK_Y + Math.sin(a) * len * 0.4);
            ctx.lineTo(ROAD_X + ROAD_W / 2 + Math.cos(a + 0.3) * len, TRUCK_Y + Math.sin(a + 0.3) * len * 0.7);
            ctx.stroke();
          }
        }
        drawSprite(ctx, TRUCK, ROAD_X + ROAD_W / 2, TRUCK_Y, { scale: 6 });
        drawParticles(ctx, parts.current);
        // the speedometer: a vertical scale with this stretch's band in red and the next one's in faint red
        const gx = W - 52;
        const gy0 = 70;
        const gh = 400;
        const vy = (v: number) => gy0 + gh - (v / VMAX) * gh;
        ctx.fillStyle = "rgba(28,37,65,0.85)";
        ctx.fillRect(gx - 8, gy0 - 10, 56, gh + 20);
        const cur = stretchAt(d.stage, d.x);
        const nxt = stretchAt(d.stage, cur.to + 0.1);
        const band = (s: typeof cur, color: string, x: number, w: number) => {
          ctx.fillStyle = color;
          const y0 = vy(Math.min(VMAX, s.wave + s.width));
          const y1 = vy(Math.max(0, s.wave - s.width));
          ctx.fillRect(x, y0, w, y1 - y0);
        };
        if (nxt !== cur) band(nxt, "rgba(250,82,82,0.35)", gx + 22, 14);
        band(cur, "#fa5252", gx, 20);
        ctx.fillStyle = "#ffffff";
        for (let v = 0; v <= VMAX; v += 5) ctx.fillRect(gx, vy(v), 6, 1);
        const load = bandLoad(cur, d.v);
        ctx.fillStyle = load > 0 ? "#ffd43b" : "#69db7c";
        ctx.fillRect(gx - 6, vy(d.v) - 2, 46, 4);
        // stress meter along the bottom
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(12, H - 22, W - 90, 8);
        ctx.fillStyle = d.stress > 0.6 ? "#e03131" : "#fab005";
        ctx.fillRect(12, H - 22, (W - 90) * Math.min(1, d.stress), 8);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#1c2541";
        ctx.fillText(fill(cp.speed, Math.round(d.v * KMH)), 12, 30);
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.left, Math.max(0, Math.ceil(d.stage.length - d.x))), 12, 52);
        ctx.fillText(`${Math.max(0, d.stage.timeLimit - d.t).toFixed(1)}s`, 12, 72);
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

  const failText = (f: Drive["fail"]) => (f === "crack" ? c.crack : f === "ridge" ? c.ridge : c.time);

  return (
    <div
      ref={containerRef}
      data-game="ice-road"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.timeLimit)}</Badge>
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
            if (dRef.current.over) return;
            ev.currentTarget.setPointerCapture(ev.pointerId);
            gas.current.pointer = true;
            setTouched(true);
          }}
          onPointerUp={() => {
            gas.current.pointer = false;
          }}
          onPointerCancel={() => {
            gas.current.pointer = false;
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
            <p className="text-lg font-bold">{over.won ? c.win : failText(over.fail)}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.t.toFixed(1))}</p> : null}
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
