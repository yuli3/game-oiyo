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
import { CELL, COLS, CORNER, CX, CY, ICE, RINK_SLUG, RINK_STAGES, RX, RY, STAGE_COUNT, coverage, needed, newMachine, starsFor, stepMachine, type Machine } from "../../lib/games/rink-resurface";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; time: string; start: string; win: string; lose: string; result: string; again: string; next: string; bump: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}%", time: "{0}초", start: "가고 싶은 곳을 누르고 있으면 정빙차가 그쪽으로 돌아요. 바깥부터 한 바퀴씩!", win: "빙판이 거울 같아요! 스케이터 입장", lose: "아직 긁힌 얼음이 남았어요", result: "{0}% 정빙 · 펜스 충돌 {1}번",
    again: "다시 하기", next: "다음 단계", bump: "쿵! 펜스",
    help: "겨울 스케이트장은 한 시간쯤 타고 나면 얼음이 날에 긁혀 거칠어져요. 그래서 쉬는 시간마다 정빙차가 나와 얼음을 얇게 깎고 물을 뿌려 다시 매끈하게 만들어요. 정빙차는 바깥쪽부터 한 바퀴씩, 날 폭만큼 안쪽으로 겹치며 돌아요. 화면에서 가고 싶은 곳을 누르고 있으면 정빙차가 그쪽으로 방향을 틀어요. 날이 지나간 자리는 반짝이고, 깊게 팬 자리(진한 점)는 두 번 지나가야 매끈해져요. 펜스에 부딪히면 잠깐 멈추니 모서리는 크게 돌아요. 스케이터가 돌아오기 전에 목표만큼 정빙하면 통과예요. (키보드: 왼쪽·오른쪽 방향키로 핸들)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}%", time: "{0}s", start: "Hold where you want to go and the machine turns that way. Lap the outside first!", win: "Ice like a mirror! Skaters back on", lose: "Scratched ice is left", result: "{0}% resurfaced · {1} bumps",
    again: "Try again", next: "Next stage", bump: "Bump!",
    help: "After an hour of skating, a winter rink's ice is scored rough by the blades. So in every break an ice resurfacer comes out, shaves a thin layer and lays down water to make it smooth again. It laps the rink from the outside in, each lap overlapping the last by about a blade's width. Hold the screen where you want to go and the machine turns towards it. The ice it has passed over shines; deep gouges (dark marks) need two passes. Hitting the boards stalls it for a moment, so take the corners wide. Smooth enough of the ice before the skaters come back to clear the stage. (Keyboard: left and right arrows steer.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}%", time: "{0}秒", start: "行きたい所を押し続けると整氷車がそちらへ曲がるよ。外側から一周ずつ！", win: "鏡のような氷！スケーター入場", lose: "削れた氷が残っています", result: "{0}% 整氷・フェンス衝突 {1}回",
    again: "もう一度", next: "次の面", bump: "ドン！フェンス",
    help: "冬のスケートリンクは1時間ほど滑ると、氷がエッジで削られてざらざらになります。そこで休憩のたびに整氷車が出て、氷を薄く削り水をまいて滑らかにします。整氷車は外側から一周ずつ、刃の幅ほど内側に重ねて回ります。画面の行きたい所を押し続けると整氷車がそちらへ向きを変えます。刃が通った所は光り、深い傷（濃い点）は2回通ると滑らかになります。フェンスにぶつかると少し止まるので、角は大きく回りましょう。スケーターが戻る前に目標まで整氷すればクリア。（キーボード：左右キーでハンドル）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}%", time: "{0}秒", start: "按住想去的地方，浇冰车就会转向那里。从外圈一圈圈来！", win: "冰面像镜子一样！滑冰的人入场", lose: "还有刮花的冰面", result: "已整冰 {0}% · 撞围栏 {1}次",
    again: "再来一次", next: "下一关", bump: "砰！围栏",
    help: "冬天的滑冰场滑上一小时，冰面就会被冰刀划得粗糙。所以每次休息时，浇冰车都会出来刮掉薄薄一层冰再洒水，让冰面重新光滑。浇冰车从外圈开始一圈圈往里开，每圈与上一圈重叠约一个刀宽。按住屏幕上想去的地方，浇冰车就会转向那里。刀刮过的地方会发亮，深的划痕（深色点）要刮两遍才平。撞到围栏会停一会儿，所以转角要转大一点。在滑冰的人回来前整好目标面积就过关。（键盘：左右方向键转向）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0} %", time: "{0} s", start: "Maintenez le doigt là où vous voulez aller : la surfaceuse s'y dirige. Le tour extérieur d'abord !", win: "Une glace miroir ! Retour des patineurs", lose: "Il reste de la glace rayée", result: "{0} % resurfacé · {1} chocs",
    again: "Réessayer", next: "Niveau suivant", bump: "Bang ! La bande",
    help: "Après une heure de patinage, la glace d'une patinoire d'hiver est rayée par les lames. À chaque pause, une surfaceuse vient raboter une fine couche et étaler de l'eau pour la lisser. Elle fait le tour de l'extérieur vers l'intérieur, chaque tour chevauchant le précédent d'environ une largeur de lame. Maintenez le doigt là où vous voulez aller et la machine s'y tourne. La glace passée brille ; les entailles profondes (points sombres) demandent deux passages. Toucher la bande arrête la machine un instant : prenez les virages larges. Lissez assez de glace avant le retour des patineurs. (Clavier : flèches gauche et droite pour diriger.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0} %", time: "{0} s", start: "Mantén pulsado hacia donde quieres ir y la máquina gira hacia allí. ¡Primero la vuelta de fuera!", win: "¡Hielo como un espejo! Vuelven los patinadores", lose: "Queda hielo rayado", result: "{0} % pulido · {1} choques",
    again: "Reintentar", next: "Siguiente nivel", bump: "¡Pum! La valla",
    help: "Tras una hora de patinaje, el hielo de una pista de invierno queda rayado por las cuchillas. En cada descanso sale una pulidora que rasura una capa fina y echa agua para dejarlo liso. Da vueltas de fuera hacia dentro, cada vuelta solapando la anterior un ancho de cuchilla. Mantén pulsado donde quieres ir y la máquina gira hacia allí. El hielo pulido brilla; las marcas hondas (puntos oscuros) necesitan dos pasadas. Chocar con la valla la para un momento, así que abre las curvas. Pule suficiente hielo antes de que vuelvan los patinadores. (Teclado: flechas izquierda y derecha para girar.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:rink-resurface:muted";
const W = 360;
const H = 560;
// the resurfacer from above, nose to the right: a blue body, the driver's seat and the blade box at the back
const MACHINE: PixelArt = {
  palette: { b: "#1971c2", d: "#0b3d6b", w: "#f8f9fa", k: "#212529", y: "#fcc419", g: "#adb5bd" },
  rows: ["..kk......kk..", "gbbbbbbbbbbbby", "gbbwwbbbbbbbbb", "gbbwkbbbdddbbb", "gbbwkbbbdddbbb", "gbbwwbbbbbbbbb", "gbbbbbbbbbbbby", "..kk......kk.."],
};

interface Pop { text: string; t: number; x: number; y: number }

export default function RinkResurface({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; pct: number; bumps: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mRef = useRef<Machine>(newMachine(RINK_STAGES[0]));
  const visited = useRef(new Set<number>());
  const finger = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef({ left: false, right: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = RINK_STAGES[stage];

  useRunRecord(RINK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    mRef.current = newMachine(RINK_STAGES[s]);
    visited.current = new Set();
    finger.current = null;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(RINK_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const k = keys.current;
    const set = (ev: KeyboardEvent, on: boolean) => {
      if (ev.key === "ArrowLeft") k.left = on;
      else if (ev.key === "ArrowRight") k.right = on;
      else return;
      ev.preventDefault();
      if (on) setTouched(true);
    };
    const down = (ev: KeyboardEvent) => set(ev, true);
    const up = (ev: KeyboardEvent) => set(ev, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      k.left = false;
      k.right = false;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let started = false;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const m = mRef.current;
      const cp = copyRef.current;
      // the machine waits on the line until the first touch
      started = started || finger.current !== null || keys.current.left || keys.current.right;
      if (m.t === 0 && !finger.current && !keys.current.left && !keys.current.right) started = false;
      if (started && !m.over) {
        // steer once per frame: toward the held finger, or by the arrow keys
        let steer = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);
        const f = finger.current;
        if (f) {
          let diff = Math.atan2(f.y - m.y, f.x - m.x) - m.heading;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          steer = Math.max(-1, Math.min(1, diff * 3));
        }
        const ev = stepMachine(m, steer, dt, visited.current);
        if (ev.bump) {
          pops.current.push({ text: cp.bump, t: 0.9, x: m.x, y: m.y - 24 });
          spawnBurst(parts.current, m.x, m.y, ["#e7f5ff", "#a5d8ff"], 8, 80, 2);
          sfx("fail");
        }
        if (ev.end) {
          setOver({ won: m.won, stars: starsFor(m), pct: Math.round(coverage(m) * 100), bumps: m.bumps });
          if (m.won) {
            setCleared(markStageCleared(RINK_SLUG, m.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, CX, CY, ["#ffffff", "#74c0fc", "#ffd43b"], 24, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 0);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, 0, W, H);
        // the boards
        ctx.fillStyle = "#f1f3f5";
        ctx.beginPath();
        ctx.roundRect(CX - RX - 6, CY - RY - 6, RX * 2 + 12, RY * 2 + 12, CORNER + 6);
        ctx.fill();
        ctx.fillStyle = "#c92a2a";
        ctx.beginPath();
        ctx.roundRect(CX - RX - 2, CY - RY - 2, RX * 2 + 4, RY * 2 + 4, CORNER + 2);
        ctx.fill();
        // the ice: scratched grey-blue until the blade has been over it, then shining
        const x0 = CX - RX;
        const y0 = CY - RY;
        for (const i of ICE) {
          const need = needed(m.stage, i);
          const p = m.passes[i];
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          ctx.fillStyle = p >= need ? ((col + row) % 7 === 0 ? "#ffffff" : "#e7f5ff") : need === 2 && p === 0 ? "#868e96" : need === 2 ? "#a5b4c2" : (col * 7 + row * 3) % 5 === 0 ? "#b8c6d1" : "#c5d3de";
          ctx.fillRect(x0 + col * CELL, y0 + row * CELL, CELL, CELL);
        }
        // the centre line and face-off circle painted under the ice
        ctx.strokeStyle = "rgba(201,42,42,0.45)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(CX - RX, CY);
        ctx.lineTo(CX + RX, CY);
        ctx.stroke();
        ctx.strokeStyle = "rgba(25,113,194,0.45)";
        ctx.beginPath();
        ctx.arc(CX, CY, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.heading);
        drawSprite(ctx, MACHINE, 0, 0, { scale: 3, center: true });
        ctx.restore();
        if (finger.current && !m.over) {
          ctx.strokeStyle = "rgba(25,113,194,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(finger.current.x, finger.current.y, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawParticles(ctx, parts.current);
        // coverage and clock
        const cov = coverage(m);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(12, 40, W - 24, 8);
        ctx.fillStyle = cov >= m.stage.need ? "#40c057" : "#74c0fc";
        ctx.fillRect(12, 40, (W - 24) * Math.min(1, cov), 8);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(12 + (W - 24) * m.stage.need - 1, 36, 3, 16);
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.textAlign = "left";
        ctx.fillText(`${Math.round(cov * 100)}% / ${Math.round(m.stage.need * 100)}%`, 12, 26);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(m.stage.time - m.t))), W - 12, 26);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 18, tw, 24);
          ctx.fillStyle = "#e8590c";
          ctx.fillText(pp.text, x, pp.y - 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="rink-resurface"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, Math.round(st.need * 100))}</Badge>
        <Badge variant="outline">{fill(c.time, st.time)}</Badge>
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
            if (mRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            finger.current = toCanvas(e);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            finger.current = toCanvas(e);
          }}
          onPointerUp={() => (finger.current = null)}
          onPointerCancel={() => (finger.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.pct, over.bumps)}</p>
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
