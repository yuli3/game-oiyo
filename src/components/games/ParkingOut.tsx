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
import { DX, DY, MAX_BUMPS, PARKING_SLUG, PARKING_STAGES, STAGE_COUNT, newLot, squares, starsFor, tap, tick, type Lot } from "../../lib/games/parking-out";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; bumps: string; left: string; time: string; start: string; bump: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", bumps: "부딪힘 {0}/{1}", left: "남은 차 {0}대", time: "{0}초", start: "앞길이 빈 차를 눌러 내보내요!", bump: "쿵! 앞에 차가 있어요", win: "주차장을 다 비웠어요!", lose: "관리인이 그만하래요", result: "{0}초 · 부딪힘 {1}번",
    again: "다시 하기", next: "다음 단계",
    help: "출근길 주차장이 꽉 막혔어요. 차는 앞을 보고 있는 쪽으로만 곧장 달려요. 차를 누르면 주차장 밖까지 쭉 나가는데, 가는 길에 다른 차나 기둥이 있으면 쿵 부딪히고 제자리에 서요. 세 번 부딪히면 끝이에요. 앞길이 빈 차부터 순서를 찾아 모든 차를 내보내요. 한 번도 부딪히지 않고 빨리 비우면 별 세 개예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", bumps: "Bumps {0}/{1}", left: "{0} cars left", time: "{0}s", start: "Tap a car with a clear road ahead to drive it out!", bump: "Bump! Something's in the way", win: "The car park is empty!", lose: "The attendant sends you away", result: "{0}s · {1} bumps",
    again: "Try again", next: "Next stage",
    help: "The morning car park is jammed. Each car can only drive straight ahead, the way it faces. Tap a car and it drives right out of the car park — but if another car or a pillar is on its way, it bumps and stops where it was. Three bumps and you're out. Find the order, starting with cars whose road is clear, and get every car out. Clear the lot quickly without a single bump for three stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", bumps: "接触 {0}/{1}", left: "残り {0}台", time: "{0}秒", start: "前が空いている車を押して出そう！", bump: "ゴツン！前に何かある", win: "駐車場が空になった！", lose: "係員にもうやめてと言われた", result: "{0}秒・接触 {1}回",
    again: "もう一度", next: "次の面",
    help: "朝の駐車場が詰まっています。車は向いている方向にまっすぐしか進めません。車を押すと駐車場の外まで走り抜けますが、途中に別の車や柱があるとゴツンとぶつかってその場で止まります。3回ぶつかると終わり。前が空いている車から順番を見つけて、全部の車を出そう。一度もぶつからず素早く空にすると星3つ。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", bumps: "碰撞 {0}/{1}", left: "剩 {0} 辆车", time: "{0}秒", start: "点前方畅通的车把它开出去！", bump: "砰！前面有东西挡着", win: "停车场清空了！", lose: "管理员不让你再挪了", result: "{0}秒 · 碰撞 {1} 次",
    again: "再来一次", next: "下一关",
    help: "早高峰的停车场堵得水泄不通。每辆车只能朝车头方向直行。点一辆车，它会一路开出停车场——但若路上有别的车或柱子，就会砰地撞上并停在原地。撞三次就结束。从前方畅通的车开始找顺序，把所有车都开出去。一次不撞且快速清空可得三颗星。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", bumps: "Chocs {0}/{1}", left: "{0} voitures restantes", time: "{0} s", start: "Touchez une voiture dont la voie est libre pour la sortir !", bump: "Bing ! Quelque chose bloque", win: "Le parking est vide !", lose: "Le gardien vous renvoie", result: "{0} s · {1} chocs",
    again: "Réessayer", next: "Niveau suivant",
    help: "Le parking du matin est bloqué. Chaque voiture ne peut rouler que tout droit, dans le sens où elle regarde. Touchez une voiture et elle sort du parking — mais si une autre voiture ou un pilier est sur son chemin, elle le heurte et reste en place. Trois chocs et c'est fini. Trouvez l'ordre, en commençant par les voitures dont la voie est libre, et sortez-les toutes. Videz vite sans aucun choc pour trois étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", bumps: "Golpes {0}/{1}", left: "Quedan {0} coches", time: "{0} s", start: "¡Toca un coche con el camino libre para sacarlo!", bump: "¡Pum! Algo bloquea el paso", win: "¡El aparcamiento está vacío!", lose: "El vigilante te echa", result: "{0} s · {1} golpes",
    again: "Reintentar", next: "Siguiente nivel",
    help: "El aparcamiento de la mañana está atascado. Cada coche solo puede ir recto hacia donde mira. Toca un coche y saldrá del aparcamiento, pero si otro coche o una columna está en su camino, choca y se queda donde estaba. Tres golpes y se acabó. Encuentra el orden empezando por los coches con el camino libre y sácalos todos. Vacíalo rápido sin un solo golpe para tres estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:parking-out:muted";
const W = 360;
const H = 560;
const CAR_COLOURS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c", "#495057"];

interface Leaving { car: number; d: number }
interface Pop { text: string; t: number; x: number; y: number }

export default function ParkingOut({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; t: number; bumps: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lRef = useRef<Lot>(newLot(PARKING_STAGES[0]));
  const input = useRef<number[]>([]);
  const started = useRef(false);
  const leaving = useRef<Leaving[]>([]);
  const jolt = useRef(new Map<number, number>());
  const cursor = useRef(-1);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = PARKING_STAGES[stage];

  useRunRecord(PARKING_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    lRef.current = newLot(PARKING_STAGES[s]);
    input.current = [];
    started.current = false;
    leaving.current = [];
    jolt.current = new Map();
    cursor.current = -1;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PARKING_SLUG, STAGE_COUNT);
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
      const l = lRef.current;
      const s = l.stage;
      const cp = copyRef.current;
      const cell = Math.floor(330 / s.w);
      const ox = (W - cell * s.w) / 2;
      const oy = 110 + (380 - cell * s.h) / 2;
      // taps are read once per frame
      for (const i of input.current.splice(0)) {
        if (l.over) break;
        started.current = true;
        const r = tap(l, i);
        const car = s.cars[i];
        const [fx, fy] = squares(car)[car.len - 1];
        if (r === "out") {
          leaving.current.push({ car: i, d: 0 });
          sfx("place");
        } else if (r === "bump") {
          jolt.current.set(i, 0.3);
          pops.current = [{ text: cp.bump, t: 0.9, x: ox + (fx + 0.5) * cell, y: oy + fy * cell - 6 }];
          spawnBurst(parts.current, ox + (fx + 0.5 + DX[car.dir] * 0.5) * cell, oy + (fy + 0.5 + DY[car.dir] * 0.5) * cell, ["#ffd43b", "#fff"], 8, 80, 2);
          sfx("fail");
        }
        if (l.over) {
          setOver({ won: l.won, stars: starsFor(l), t: Math.round(l.t), bumps: l.bumps });
          if (l.won) {
            setCleared(markStageCleared(PARKING_SLUG, s.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#2f9e44", "#1971c2"], 30, 150, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      if (started.current) tick(l, dt);
      for (const lv of leaving.current) lv.d += dt * 14;
      leaving.current = leaving.current.filter((lv) => lv.d < 20);
      for (const [k, v] of jolt.current) {
        if (v - dt <= 0) jolt.current.delete(k);
        else jolt.current.set(k, v - dt);
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#212529";
        ctx.fillRect(0, 0, W, H);
        // the lot: asphalt squares with painted lines
        ctx.fillStyle = "#495057";
        ctx.fillRect(ox, oy, cell * s.w, cell * s.h);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= s.w; x++) {
          ctx.beginPath();
          ctx.moveTo(ox + x * cell, oy);
          ctx.lineTo(ox + x * cell, oy + s.h * cell);
          ctx.stroke();
        }
        for (let y = 0; y <= s.h; y++) {
          ctx.beginPath();
          ctx.moveTo(ox, oy + y * cell);
          ctx.lineTo(ox + s.w * cell, oy + y * cell);
          ctx.stroke();
        }
        for (const p of s.pillars) {
          const x = p % s.w;
          const y = Math.floor(p / s.w);
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(ox + x * cell + cell * 0.2, oy + y * cell + cell * 0.2, cell * 0.6, cell * 0.6);
          ctx.fillStyle = "#f59f00";
          ctx.fillRect(ox + x * cell + cell * 0.2, oy + y * cell + cell * 0.42, cell * 0.6, cell * 0.16);
        }
        const drawCar = (i: number, shift: number) => {
          const car = s.cars[i];
          const sq = squares(car);
          const xs = sq.map(([x]) => x);
          const ys = sq.map(([, y]) => y);
          const jig = jolt.current.has(i) ? Math.sin(now / 20) * 3 : 0;
          const x0 = ox + Math.min(...xs) * cell + DX[car.dir] * shift * cell + (car.dir % 2 ? jig : 0);
          const y0 = oy + Math.min(...ys) * cell + DY[car.dir] * shift * cell + (car.dir % 2 ? 0 : jig);
          const w = (Math.max(...xs) - Math.min(...xs) + 1) * cell;
          const h = (Math.max(...ys) - Math.min(...ys) + 1) * cell;
          ctx.fillStyle = CAR_COLOURS[car.colour % CAR_COLOURS.length];
          ctx.fillRect(x0 + 4, y0 + 4, w - 8, h - 8);
          if (cursor.current === i) {
            ctx.strokeStyle = "#ffd43b";
            ctx.lineWidth = 3;
            ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
          }
          // windscreen and an arrow on the bonnet show which way it faces
          const [fx, fy] = sq[car.len - 1];
          const cx = ox + (fx + 0.5) * cell + DX[car.dir] * shift * cell;
          const cy = oy + (fy + 0.5) * cell + DY[car.dir] * shift * cell;
          ctx.fillStyle = "#d0ebff";
          ctx.fillRect(cx - cell * 0.28 + DX[car.dir] * cell * 0.05, cy - cell * 0.28 + DY[car.dir] * cell * 0.05, cell * 0.56, cell * 0.56);
          ctx.fillStyle = "#212529";
          ctx.beginPath();
          ctx.moveTo(cx + DX[car.dir] * cell * 0.22, cy + DY[car.dir] * cell * 0.22);
          ctx.lineTo(cx - DY[car.dir] * cell * 0.16, cy + DX[car.dir] * cell * 0.16);
          ctx.lineTo(cx + DY[car.dir] * cell * 0.16, cy - DX[car.dir] * cell * 0.16);
          ctx.closePath();
          ctx.fill();
        };
        s.cars.forEach((_, i) => {
          if (!l.out[i]) drawCar(i, 0);
        });
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 90, W, 420);
        ctx.clip();
        for (const lv of leaving.current) drawCar(lv.car, lv.d);
        ctx.restore();
        drawParticles(ctx, parts.current);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.textAlign = "left";
        ctx.fillText(fill(cp.bumps, l.bumps, MAX_BUMPS), 20, 40);
        ctx.fillText(fill(cp.left, l.out.filter((o) => !o).length), 20, 64);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.floor(l.t)), W - 20, 40);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 13px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 15, tw, 20);
          ctx.fillStyle = "#e8590c";
          ctx.fillText(pp.text, x, pp.y);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const l = lRef.current;
    if (l.over) return;
    const s = l.stage;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) * W) / r.width;
    const py = ((e.clientY - r.top) * H) / r.height;
    const cell = Math.floor(330 / s.w);
    const ox = (W - cell * s.w) / 2;
    const oy = 110 + (380 - cell * s.h) / 2;
    const gx = Math.floor((px - ox) / cell);
    const gy = Math.floor((py - oy) / cell);
    setTouched(true);
    const i = s.cars.findIndex((car, k) => !l.out[k] && squares(car).some(([x, y]) => x === gx && y === gy));
    if (i >= 0) input.current.push(i);
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const l = lRef.current;
    if (l.over) return;
    const left = l.stage.cars.map((_, i) => i).filter((i) => !l.out[i]);
    if (!left.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const at = left.indexOf(cursor.current);
      cursor.current = left[(at + step + left.length) % left.length];
      setTouched(true);
    } else if ((e.key === "Enter" || e.key === " ") && left.includes(cursor.current)) {
      e.preventDefault();
      input.current.push(cursor.current);
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
      data-game="parking-out"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.left, st.cars.length)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-20 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.t, over.bumps)}</p>
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
