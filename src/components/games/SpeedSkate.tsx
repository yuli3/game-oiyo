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
import { LAP, RACES, SKATE_SLUG, STAGE_COUNT, STRAIGHT, newSkater, rightLeg, segAt, starsFor, stepSkater, stroke, type Side, type Skater } from "../../lib/games/speed-skate";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; rival: string; dist: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; perfect: string; good: string; weak: string; wrong: string; curve: string; left: string; right: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", rival: "상대 {0}초", dist: "{0}/{1}m", start: "왼쪽·오른쪽을 번갈아 톡! 곡선에서는 오른쪽만!", win: "상대보다 먼저 들어왔어요!", lose: "상대가 더 빨랐어요", result: "{0}초 · 상대 {1}초 · 멋진 밀기 {2}번",
    again: "다시 달리기", next: "다음 단계", perfect: "완벽!", good: "좋아요", weak: "약해요", wrong: "휘청!", curve: "곡선: 오른발 크로스오버", left: "왼발", right: "오른발",
    help: "400m 빙상 트랙을 도는 스피드스케이팅이에요. 화면 왼쪽을 누르면 왼발, 오른쪽을 누르면 오른발로 얼음을 밀어요. 직선에서는 왼발·오른발을 번갈아 밀고, 곡선에서는 오른발을 왼발 앞으로 넘기는 크로스오버라 오른쪽만 계속 눌러요. 아래 막대가 초록 구간에 왔을 때 밀면 가장 빨라지고, 너무 이르거나 늦으면 약하게 밀려요. 발을 잘못 쓰면 휘청거려 속도를 잃어요. 상대 기록보다 먼저 결승선을 지나면 통과예요. 키보드는 ←·→ 방향키.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", rival: "Rival {0}s", dist: "{0}/{1} m", start: "Tap left, right, left… and only right in the curves!", win: "You beat the rival!", lose: "The rival was faster", result: "{0}s · rival {1}s · {2} perfect pushes",
    again: "Race again", next: "Next stage", perfect: "Perfect!", good: "Good", weak: "Weak", wrong: "Wobble!", curve: "Curve: right-leg crossovers", left: "Left", right: "Right",
    help: "Long-track speed skating on a 400 m oval. Tap the left half of the screen to push with your left leg and the right half for your right leg. On the straights you alternate legs; in the curves you cross the right leg over the left, so you keep tapping right. Push when the bar below reaches the green band for the most speed; too early or too late is a weak push, and the wrong leg is a wobble that costs speed. Cross the line before the rival's time to clear the stage. Keyboard: ← and →.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", rival: "ライバル {0}秒", dist: "{0}/{1}m", start: "左・右と交互にタップ！ カーブでは右だけ！", win: "ライバルより先にゴール！", lose: "ライバルのほうが速かった", result: "{0}秒 · ライバル {1}秒 · 完璧なひと蹴り {2}回",
    again: "もう一度", next: "次の面", perfect: "完璧！", good: "いいね", weak: "弱い", wrong: "ぐらつき！", curve: "カーブ：右足クロスオーバー", left: "左足", right: "右足",
    help: "400mのリンクを回るスピードスケート。画面の左を押すと左足、右を押すと右足で氷を蹴ります。直線では左右の足を交互に、カーブでは右足を左足の前に交差させるクロスオーバーなので右だけを押し続けます。下のバーが緑の帯に来たときに蹴るといちばん加速し、早すぎても遅すぎても弱い蹴りになります。足を間違えるとぐらついて減速。ライバルのタイムより先にゴールすればクリア。キーボードは ← と →。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", rival: "对手 {0}秒", dist: "{0}/{1}米", start: "左、右交替点！弯道只点右边！", win: "比对手先冲线！", lose: "对手更快", result: "{0}秒 · 对手 {1}秒 · 完美蹬冰 {2}次",
    again: "再滑一次", next: "下一关", perfect: "完美！", good: "不错", weak: "太弱", wrong: "晃了！", curve: "弯道：右腿交叉步", left: "左腿", right: "右腿",
    help: "在400米大道上滑速度滑冰。点屏幕左半边用左腿蹬冰，点右半边用右腿蹬冰。直道上左右腿交替蹬，弯道是右腿从左腿前交叉的交叉步，所以一直点右边。下方的条走到绿色区间时蹬冰加速最多，太早或太晚都蹬得弱；用错腿会晃动掉速。在对手的成绩之前冲过终点就过关。键盘用 ← 和 →。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", rival: "Rival {0} s", dist: "{0}/{1} m", start: "Touchez gauche, droite, gauche… et seulement droite dans les virages !", win: "Vous battez le rival !", lose: "Le rival était plus rapide", result: "{0} s · rival {1} s · {2} poussées parfaites",
    again: "Recourir", next: "Niveau suivant", perfect: "Parfait !", good: "Bien", weak: "Faible", wrong: "Déséquilibre !", curve: "Virage : croisés de la jambe droite", left: "Gauche", right: "Droite",
    help: "Patinage de vitesse sur un anneau de 400 m. Touchez la moitié gauche de l'écran pour pousser avec la jambe gauche, la moitié droite pour la jambe droite. Dans les lignes droites, alternez les jambes ; dans les virages, la jambe droite croise devant la gauche, alors on touche toujours à droite. Poussez quand la barre en bas atteint la zone verte pour aller le plus vite ; trop tôt ou trop tard, la poussée est faible, et la mauvaise jambe vous déséquilibre. Passez la ligne avant le temps du rival. Clavier : ← et →.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", rival: "Rival {0} s", dist: "{0}/{1} m", start: "Toca izquierda, derecha, izquierda… ¡y solo derecha en las curvas!", win: "¡Le ganaste al rival!", lose: "El rival fue más rápido", result: "{0} s · rival {1} s · {2} impulsos perfectos",
    again: "Correr otra vez", next: "Siguiente nivel", perfect: "¡Perfecto!", good: "Bien", weak: "Flojo", wrong: "¡Tambaleo!", curve: "Curva: cruces con la pierna derecha", left: "Izquierda", right: "Derecha",
    help: "Patinaje de velocidad en un óvalo de 400 m. Toca la mitad izquierda de la pantalla para impulsarte con la pierna izquierda y la derecha para la derecha. En las rectas alternas las piernas; en las curvas la pierna derecha cruza por delante de la izquierda, así que sigues tocando a la derecha. Impúlsate cuando la barra de abajo llegue a la franja verde para ir más rápido; muy pronto o muy tarde el impulso es flojo, y la pierna equivocada te hace tambalear. Cruza la meta antes que el tiempo del rival. Teclado: ← y →.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:speed-skate:muted";
const W = 360;
const H = 560;
// the oval, seen from above: straights up the right and down the left, skated counter-clockwise
const CX = 180;
const TOP = 130;
const BOT = 350;
const RAD = 70;
const PX_M = (BOT - TOP) / STRAIGHT;

function ovalAt(d: number): { x: number; y: number; a: number } {
  const m = ((d % LAP) + LAP) % LAP;
  if (m < STRAIGHT) return { x: CX + RAD, y: BOT - m * PX_M, a: -Math.PI / 2 };
  if (m < 2 * STRAIGHT) {
    const th = ((m - STRAIGHT) / STRAIGHT) * Math.PI;
    return { x: CX + RAD * Math.cos(th), y: TOP - RAD * Math.sin(th), a: -Math.PI / 2 - th };
  }
  if (m < 3 * STRAIGHT) return { x: CX - RAD, y: TOP + (m - 2 * STRAIGHT) * PX_M, a: Math.PI / 2 };
  const th = ((m - 3 * STRAIGHT) / STRAIGHT) * Math.PI;
  return { x: CX - RAD * Math.cos(th), y: BOT + RAD * Math.sin(th), a: Math.PI / 2 - th };
}

const SKATER: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#f1c27d", b: "#1c7ed6", w: "#f8f9fa" },
  rows: ["...kk...", "..kssk..", "..rrrr..", ".rrrrrr.", "r.rrrr.r", "..bbbb..", "..b..b..", ".ww..ww."],
};
const GHOST: PixelArt = {
  palette: { k: "#495057", g: "#868e96", w: "#dee2e6" },
  rows: ["...kk...", "..kggk..", "..gggg..", ".gggggg.", "g.gggg.g", "..gggg..", "..g..g..", ".ww..ww."],
};

interface Pop { text: string; t: number; color: string }

export default function SpeedSkate({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number; perfects: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Skater>(newSkater(RACES[0]));
  const started = useRef(false);
  const input = useRef<Side[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const race = RACES[stage];

  useRunRecord(SKATE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newSkater(RACES[st]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SKATE_SLUG, STAGE_COUNT);
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
      const s = sRef.current;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const side of input.current.splice(0)) {
        if (!started.current) started.current = true;
        const res = stroke(s, side);
        if (!res) continue;
        const p = ovalAt(s.d);
        if (res === "perfect") {
          pops.current.push({ text: cp.perfect, t: 0.6, color: "#2f9e44" });
          spawnBurst(parts.current, p.x, p.y, ["#e7f5ff", "#a5d8ff"], 8, 70, Math.floor(s.t * 1000));
          sfx("success");
        } else if (res === "good") {
          pops.current.push({ text: cp.good, t: 0.5, color: "#1c7ed6" });
          sfx("tap");
        } else if (res === "weak") {
          pops.current.push({ text: cp.weak, t: 0.5, color: "#868e96" });
          sfx("tap");
        } else {
          pops.current.push({ text: cp.wrong, t: 0.7, color: "#e03131" });
          sfx("fail");
        }
      }
      if (started.current && !s.over && stepSkater(s, dt)) {
        setOver({ won: s.won, stars: starsFor(s), time: s.finish, perfects: s.perfects });
        if (s.won) {
          setCleared(markStageCleared(SKATE_SLUG, s.race.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
      stepParticles(parts.current, dt, 0);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#dbe4ff";
        ctx.fillRect(0, 0, W, H);
        // stands
        ctx.fillStyle = "#4c6ef5";
        for (let i = 0; i < 9; i++) ctx.fillRect(8 + i * 40, 10, 32, 8);
        // the ice and the lane
        ctx.fillStyle = "#f1f7ff";
        ctx.beginPath();
        ctx.roundRect(CX - RAD - 34, TOP - RAD - 34, (RAD + 34) * 2, BOT - TOP + (RAD + 34) * 2, RAD + 34);
        ctx.fill();
        ctx.strokeStyle = "#74c0fc";
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(CX + RAD, BOT);
        ctx.lineTo(CX + RAD, TOP);
        ctx.arc(CX, TOP, RAD, 0, Math.PI, true);
        ctx.lineTo(CX - RAD, BOT);
        ctx.arc(CX, BOT, RAD, Math.PI, 0, true);
        ctx.stroke();
        ctx.strokeStyle = "#e7f5ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#c5f6fa";
        ctx.fillRect(CX - RAD + 14, TOP, (RAD - 14) * 2, BOT - TOP);
        // finish line on the current lap
        const fin = ovalAt(s.race.length);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(fin.x - 14, fin.y - 2, 28, 4);
        // the rival skates an even pace to its time
        const rd = Math.min(s.race.length, started.current ? (s.race.length * s.t) / s.race.goal : 0);
        const rp = ovalAt(rd);
        drawSprite(ctx, GHOST, rp.x, rp.y, { scale: 3, rotate: rp.a + Math.PI / 2, alpha: 0.55 });
        const p = ovalAt(s.d);
        drawSprite(ctx, SKATER, p.x, p.y, { scale: 3, rotate: p.a + Math.PI / 2 });
        drawParticles(ctx, parts.current);
        // HUD: clock, distance, which leg next and the cadence bar
        ctx.textAlign = "center";
        ctx.fillStyle = "#212529";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(fill(cp.time, s.t.toFixed(1)), CX, TOP + 70);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#495057";
        ctx.fillText(fill(cp.dist, Math.floor(Math.min(s.d, s.race.length)), s.race.length), CX, TOP + 92);
        ctx.fillText(fill(cp.rival, s.race.goal.toFixed(1)), CX, TOP + 112);
        const curve = segAt(s.d) === "curve";
        if (curve) {
          ctx.fillStyle = "#e8590c";
          ctx.fillText(cp.curve, CX, TOP + 140);
        }
        const want = rightLeg(s);
        const zoneY = H - 92;
        for (const side of [-1, 1] as const) {
          const x0 = side < 0 ? 8 : W / 2 + 4;
          const lit = s.strokes === 0 || want === side;
          ctx.fillStyle = lit ? (side < 0 ? "rgba(28,126,214,0.85)" : "rgba(224,49,49,0.85)") : "rgba(73,80,87,0.25)";
          ctx.fillRect(x0, zoneY, W / 2 - 12, 54);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText(side < 0 ? `◀ ${cp.left}` : `${cp.right} ▶`, x0 + (W / 2 - 12) / 2, zoneY + 34);
        }
        const bx = 20;
        const bw = W - 40;
        const span = s.race.cadence * 1.8;
        ctx.fillStyle = "rgba(73,80,87,0.2)";
        ctx.fillRect(bx, zoneY - 24, bw, 12);
        ctx.fillStyle = "rgba(47,158,68,0.55)";
        const g0 = ((s.race.cadence - s.race.window * 0.47) / span) * bw;
        const g1 = ((s.race.cadence + s.race.window * 0.47) / span) * bw;
        ctx.fillRect(bx + g0, zoneY - 26, g1 - g0, 16);
        if (s.strokes > 0) {
          ctx.fillStyle = "#212529";
          ctx.fillRect(bx + Math.min(1, s.since / span) * bw - 2, zoneY - 30, 4, 24);
        }
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(CX - w / 2, TOP + 160 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, CX, TOP + 160);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const tap = useCallback((side: Side) => {
    if (sRef.current.over) return;
    setTouched(true);
    input.current.push(side);
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        tap(-1);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        tap(1);
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [tap]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="speed-skate"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.rival, race.goal.toFixed(1))}</Badge>
        <Badge variant="outline">{race.length}m</Badge>
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
            const r = e.currentTarget.getBoundingClientRect();
            tap(e.clientX - r.left < r.width / 2 ? -1 : 1);
          }}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(2), race.goal.toFixed(1), over.perfects)}</p>
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
