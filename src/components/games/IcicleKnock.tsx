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
import { BREAK, DROP, ICICLE_SLUG, ICICLE_STAGES, LANES, LANE_W, SNAP, STAGE_COUNT, knock, laneX, newEaves, score, starsFor, stepEaves, walkerX, type Eaves } from "../../lib/games/icicle-knock";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; safe: string; bonk: string; small: string; snapped: string; time: string; goal: string;
}> = {
  ko: {
    goal: "목표 {0}점", stage: "{0}단계", score: "점수 {0}/{1}", start: "금이 간 고드름을 톡! 아래에 사람이 없을 때만요", win: "골목이 안전해졌어요!", lose: "점수가 모자라요", result: "딴 고드름 {0} · 맞은 사람 {1} · 저절로 떨어짐 {2}",
    again: "다시 하기", next: "다음 단계", safe: "톡!", bonk: "아야!", small: "아직 작아요", snapped: "툭…", time: "남은 시간 {0}초",
    help: "한옥 골목 처마 끝에 고드름이 자라요. 고드름에 금이 가면 딸 수 있어요. 고드름을 탭(또는 숫자 키 1~5)하면 떨어지는데, 땅에 닿기까지 잠깐 걸려요. 그때 아래를 지나는 사람이 있으면 머리에 맞아요. 아래가 비어 있을 때 따면 1점, 사람이 맞으면 2점이 깎여요. 너무 오래 두면 저절로 떨어지니 서둘러야 해요. 사람이 지금 어디 있는지보다 고드름이 떨어질 때 어디 있을지를 보세요. 목표 점수를 넘기면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    goal: "Goal {0}", stage: "Stage {0}", score: "Score {0}/{1}", start: "Tap a cracked icicle, but only when nobody is below!", win: "The lane is safe!", lose: "Not enough points", result: "{0} knocked · {1} bonked · {2} fell by themselves",
    again: "Try again", next: "Next stage", safe: "Clink!", bonk: "Ouch!", small: "Too small yet", snapped: "Snap…", time: "{0}s left",
    help: "Icicles grow along the eaves of a hanok lane. Once one shows a crack it can be knocked off. Tap it (or press 1–5) and it drops, taking a moment to hit the ground. If a neighbour is walking underneath right then, they get bonked. A safe knock scores 1, a bonk costs 2. Left too long, an icicle snaps off by itself, so don't dawdle. Watch where people will be when it lands, not where they are now. Beat the stage's score to clear it.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    goal: "目標 {0}点", stage: "{0}面", score: "スコア {0}/{1}", start: "ひびの入ったつららをタップ！下に人がいないときだけ", win: "路地が安全になった！", lose: "点数が足りない", result: "落とした {0} · 当たった人 {1} · 自然に落ちた {2}",
    again: "もう一度", next: "次の面", safe: "カキン！", bonk: "いてっ！", small: "まだ小さい", snapped: "ポキッ…", time: "残り {0}秒",
    help: "韓屋の路地の軒先につららが育ちます。ひびが入ったら落とせます。タップ（または数字キー1〜5）で落とすと、地面に届くまで少しかかります。そのとき下を人が通っていると頭に当たってしまいます。下が空いているときに落とせば1点、人に当たると2点減点。放っておくと勝手に折れて落ちるので、ぐずぐずしないで。人が今どこにいるかより、つららが落ちるときにどこにいるかを見ましょう。目標点を超えればクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    goal: "目标 {0}分", stage: "第{0}关", score: "得分 {0}/{1}", start: "点有裂纹的冰柱，只在下面没人时！", win: "胡同安全了！", lose: "分数不够", result: "敲下 {0} · 砸到人 {1} · 自己掉落 {2}",
    again: "再来一次", next: "下一关", safe: "叮！", bonk: "哎哟！", small: "还太小", snapped: "咔…", time: "剩余 {0}秒",
    help: "韩屋胡同的屋檐下长出冰柱。冰柱出现裂纹就能敲下来。点击它（或按数字键1～5）就会落下，落地需要一点时间。如果那时有人正从下面走过，就会砸到头。下面没人时敲下得1分，砸到人扣2分。放太久冰柱会自己断落，别磨蹭。要看冰柱落地时行人会在哪儿，而不是现在在哪儿。分数达到目标即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    goal: "Objectif {0}", stage: "Niveau {0}", score: "Score {0}/{1}", start: "Touchez un glaçon fissuré, seulement si personne n'est dessous !", win: "La ruelle est sûre !", lose: "Pas assez de points", result: "{0} décrochés · {1} assommés · {2} tombés seuls",
    again: "Réessayer", next: "Niveau suivant", safe: "Cling !", bonk: "Aïe !", small: "Encore trop petit", snapped: "Crac…", time: "{0} s restantes",
    help: "Des glaçons poussent au bord des toits d'une ruelle de hanok. Dès qu'un glaçon se fissure, on peut le décrocher. Touchez-le (ou 1 à 5 au clavier) : il tombe et met un instant à toucher le sol. Si un voisin passe dessous à ce moment, il le reçoit sur la tête. Un glaçon décroché sans danger rapporte 1 point, un voisin assommé en coûte 2. Laissé trop longtemps, le glaçon se détache tout seul : ne traînez pas. Regardez où seront les passants quand il tombera, pas où ils sont. Atteignez le score du niveau.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    goal: "Meta {0}", stage: "Nivel {0}", score: "Puntos {0}/{1}", start: "¡Toca un carámbano agrietado, solo si no hay nadie debajo!", win: "¡El callejón es seguro!", lose: "Faltan puntos", result: "{0} tirados · {1} golpeados · {2} cayeron solos",
    again: "Reintentar", next: "Siguiente nivel", safe: "¡Clinc!", bonk: "¡Ay!", small: "Aún es pequeño", snapped: "Crac…", time: "Quedan {0} s",
    help: "En los aleros de un callejón de casas hanok crecen carámbanos. Cuando uno se agrieta, se puede tirar. Tócalo (o pulsa 1–5) y caerá, tardando un momento en llegar al suelo. Si justo entonces pasa un vecino por debajo, le da en la cabeza. Tirarlo sin peligro suma 1 punto; golpear a alguien resta 2. Si lo dejas demasiado, se suelta solo, así que no te entretengas. Mira dónde estará la gente cuando caiga, no dónde está ahora. Supera la puntuación del nivel.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:icicle-knock:muted";
const W = 360;
const H = 560;
const EAVE_Y = 150;
const GROUND_Y = 470;
const ICE_LEN = 90; // px at SNAP

const WALKER: PixelArt = { palette: { h: "#c92a2a", f: "#ffd8a8", c: "#1c7ed6", l: "#343a40" }, rows: [".hhh.", "hhhhh", ".fff.", "ccccc", "ccccc", ".l.l."] };
const WALKER2: PixelArt = { palette: { h: "#5f3dc4", f: "#ffd8a8", c: "#2f9e44", l: "#343a40" }, rows: [".hhh.", "hhhhh", ".fff.", "ccccc", "ccccc", ".l.l."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function IcicleKnock({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; knocked: number; bonks: number; snapped: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eRef = useRef<Eaves>(newEaves(ICICLE_STAGES[0]));
  const started = useRef(false);
  const input = useRef<number[]>([]); // lanes tapped since the last frame
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = ICICLE_STAGES[stage];

  useRunRecord(ICICLE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    eRef.current = newEaves(ICICLE_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(ICICLE_SLUG, STAGE_COUNT);
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
      const n = Number(ev.key);
      if (Number.isInteger(n) && n >= 1 && n <= LANES && !eRef.current.over) {
        input.current.push(n - 1);
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let snow = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      snow += dt;
      const e = eRef.current;
      const cp = copyRef.current;
      // the taps are read once per frame
      for (const lane of input.current.splice(0)) {
        started.current = true;
        const res = knock(e, lane);
        if (res === "knocked") sfx("tap");
        else if (res === "too-small") pops.current.push({ text: cp.small, t: 0.7, color: "#868e96", x: laneX(lane), y: EAVE_Y + 70 });
      }
      if (started.current && !e.over) {
        const ev = stepEaves(e, dt);
        for (const l of ev.landed) {
          const x = laneX(l.lane);
          spawnBurst(parts.current, x, GROUND_Y - 6, ["#e7f5ff", "#a5d8ff", "#ffffff"], 10, 90, Math.floor(e.t * 1000) + l.lane);
          if (l.bonk) {
            pops.current.push({ text: cp.bonk, t: 0.9, color: "#e03131", x, y: GROUND_Y - 70 });
            sfx("fail");
          } else if (l.knocked) {
            pops.current.push({ text: cp.safe, t: 0.7, color: "#1971c2", x, y: GROUND_Y - 60 });
            sfx("success");
          }
        }
        for (const l of ev.snapped) pops.current.push({ text: cp.snapped, t: 0.7, color: "#868e96", x: laneX(l), y: EAVE_Y + 60 });
        if (ev.end) {
          setOver({ won: e.won, stars: starsFor(e), knocked: e.knocked, bonks: e.bonks, snapped: e.snapped });
          if (e.won) {
            setCleared(markStageCleared(ICICLE_SLUG, e.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a winter evening sky, the tiled eaves of a hanok, a snowy lane
        ctx.fillStyle = "#1c2541";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 40; i++) {
          const x = (i * 97 + snow * (12 + (i % 5) * 4)) % W;
          const y = (i * 53 + snow * (20 + (i % 7) * 5)) % H;
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, EAVE_Y - 60, W, 50);
        for (let x = 0; x < W; x += 18) {
          ctx.fillStyle = "#495057";
          ctx.fillRect(x, EAVE_Y - 60, 14, 50);
        }
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, EAVE_Y - 66, W, 8);
        ctx.fillStyle = "#6b4423";
        ctx.fillRect(0, EAVE_Y - 12, W, 12);
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(0, GROUND_Y, W, 4);
        // lane guides
        for (let l = 0; l < LANES; l++) {
          ctx.fillStyle = "rgba(165,216,255,0.08)";
          ctx.fillRect(l * LANE_W + 30, EAVE_Y, LANE_W - 60, GROUND_Y - EAVE_Y);
        }
        // the icicles: blue while growing, a white crack once they can be knocked, red when about to snap
        for (let l = 0; l < LANES; l++) {
          if (e.wait[l] > 0) continue;
          const sz = e.size[l];
          const len = (Math.min(sz, SNAP) / SNAP) * ICE_LEN;
          const x = laneX(l);
          const ready = sz >= BREAK;
          const danger = sz >= SNAP - 0.18;
          ctx.fillStyle = danger ? "#ffa8a8" : ready ? "#d0ebff" : "#74c0fc";
          ctx.beginPath();
          ctx.moveTo(x - 9, EAVE_Y);
          ctx.lineTo(x + 9, EAVE_Y);
          ctx.lineTo(x, EAVE_Y + len);
          ctx.closePath();
          ctx.fill();
          if (ready) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, EAVE_Y + 6);
            ctx.lineTo(x + 2, EAVE_Y + 10);
            ctx.lineTo(x - 3, EAVE_Y + 15);
            ctx.stroke();
          }
          // growth bar
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(x - 20, EAVE_Y - 8, 40, 4);
          ctx.fillStyle = danger ? "#fa5252" : ready ? "#40c057" : "#74c0fc";
          ctx.fillRect(x - 20, EAVE_Y - 8, 40 * Math.min(1, sz / SNAP), 4);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 20 + 40 * (BREAK / SNAP), EAVE_Y - 10, 1, 8);
        }
        // falling icicles
        for (const f of e.falling) {
          const p = 1 - Math.max(0, f.hitAt - e.t) / DROP;
          const y = EAVE_Y + (GROUND_Y - EAVE_Y - 30) * p * p;
          const x = laneX(f.lane);
          ctx.fillStyle = "#d0ebff";
          ctx.beginPath();
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x + 8, y);
          ctx.lineTo(x, y + 34);
          ctx.closePath();
          ctx.fill();
          // where it will land
          ctx.fillStyle = "rgba(250,82,82,0.35)";
          ctx.fillRect(x - 22, GROUND_Y - 4, 44, 4);
        }
        // walkers
        e.stage.walkers.forEach((w, i) => {
          const x = walkerX(w, e.t);
          if (x === null) return;
          const bob = Math.floor((e.t * 6 + i) % 2) * 2;
          drawSprite(ctx, i % 2 ? WALKER2 : WALKER, x, GROUND_Y - 18 - bob, { scale: 6, flipX: w.speed < 0 });
        });
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.score, score(e), e.stage.need), 12, 30);
        ctx.textAlign = "right";
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(e.stage.length - e.t))), W - 12, 30);
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
      data-game="icicle-knock"
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
            if (eRef.current.over) return;
            const r = ev.currentTarget.getBoundingClientRect();
            const x = ((ev.clientX - r.left) * W) / r.width;
            setTouched(true);
            input.current.push(Math.max(0, Math.min(LANES - 1, Math.floor(x / LANE_W))));
          }}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.knocked, over.bonks, over.snapped)}</p>
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
