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
import { CEIL, FLOOR, HALF, HEARTS, MID, PLAYER_X, STAGE_COUNT, UPSIDE_SLUG, UPSIDE_STAGES, flip, newRun, starsFor, step, type Run } from "../../lib/games/upside-dash";
import { BATTERY_ART, BOT_ART } from "../../lib/games/upside-dash-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; bat: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    bat: "배터리 {0}",
    start: "눌러서 위아래를 뒤집어요!",
    win: "터널 통과!",
    lose: "하트를 다 잃었어요",
    result: "배터리 {0}개 · 부딪힘 {1}번",
    help: "자석 로봇이 터널을 저절로 달려요. 바닥이나 천장에 붙어 달리다가, 화면을 누르면 반대쪽으로 휙 뒤집혀요. 바닥과 천장에는 가시가, 터널 가운데에는 톱니가 있어요. 부딪히면 하트를 하나 잃고 잠깐 무적이 돼요. 하트가 남은 채로 끝까지 가면 통과, 부딪히지 않고 배터리를 많이 모으면 별 셋이에요. 요령은 가시가 다가오는 쪽을 보고, 반대쪽이 비어 있을 때 미리 뒤집는 것이에요. 뒤집는 도중에는 가운데를 지나니 톱니 근처에서는 기다려요. 키보드는 Space나 위·아래 화살표예요.",
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
    bat: "Batteries {0}",
    start: "Tap to flip upside down!",
    win: "Through the tunnel!",
    lose: "Out of hearts",
    result: "{0} batteries · {1} bumps",
    help: "A magnet robot runs along a tunnel on its own, stuck to the floor or the ceiling. Tap and it flips to the other side. Spikes grow from the floor and the ceiling, and saws spin in the middle. A bump costs a heart and leaves you safe for a moment. Reach the end with a heart left to pass; no bumps and plenty of batteries for three stars. The knack is watching the side the spikes are coming on and flipping early, while the other side is clear. A flip crosses the middle, so wait near a saw. Keys: Space or the up/down arrows.",
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
    bat: "バッテリー {0}",
    start: "タップして上下をひっくり返そう！",
    win: "トンネル突破！",
    lose: "ハートがなくなった",
    result: "バッテリー{0}個・衝突{1}回",
    help: "磁石ロボットがトンネルをひとりでに走ります。床か天井にくっついて走り、画面をタップすると反対側へくるっとひっくり返ります。床と天井にはトゲが、トンネルの真ん中にはノコギリがあります。ぶつかるとハートが1つ減り、少しのあいだ無敵になります。ハートが残ったまま最後まで行けばクリア、ぶつからずにバッテリーをたくさん集めれば星3つ。コツは、トゲが近づく側を見て、反対側が空いているうちに早めにひっくり返ること。ひっくり返る途中は真ん中を通るので、ノコギリの近くでは待ちましょう。キーボードはSpaceか上下の矢印です。",
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
    bat: "电池 {0}",
    start: "点击翻转上下！",
    win: "穿过隧道！",
    lose: "心用完了",
    result: "电池 {0} 个 · 碰撞 {1} 次",
    help: "磁铁机器人自己沿着隧道奔跑，贴着地面或天花板。点一下屏幕，它就翻到另一边。地面和天花板长着尖刺，隧道中间转着锯片。撞到会失去一颗心，并短暂无敌。带着剩下的心跑到终点即过关；不撞且收集够多电池可得三星。诀窍是看尖刺从哪边过来，趁另一边空着提早翻转。翻转途中会经过中间，所以靠近锯片时先等等。键盘用空格或上下方向键。",
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
    bat: "Piles {0}",
    start: "Touchez pour passer la tête en bas !",
    win: "Tunnel traversé !",
    lose: "Plus de cœurs",
    result: "{0} piles · {1} chocs",
    help: "Un robot aimanté file tout seul dans un tunnel, collé au sol ou au plafond. Touchez l'écran : il bascule de l'autre côté. Des pointes sortent du sol et du plafond, des scies tournent au milieu. Un choc coûte un cœur et vous protège un instant. Atteignez la sortie avec un cœur pour réussir ; aucun choc et beaucoup de piles pour trois étoiles. L'astuce : regarder de quel côté arrivent les pointes et basculer tôt, tant que l'autre côté est libre. Une bascule traverse le milieu : attendez près d'une scie. Touches : Espace ou flèches haut/bas.",
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
    bat: "Pilas {0}",
    start: "¡Toca para dar la vuelta!",
    win: "¡Túnel superado!",
    lose: "Sin corazones",
    result: "{0} pilas · {1} choques",
    help: "Un robot imantado corre solo por un túnel, pegado al suelo o al techo. Toca la pantalla y se da la vuelta al otro lado. Del suelo y del techo salen pinchos, y en el centro giran sierras. Un choque cuesta un corazón y te deja a salvo un momento. Llega al final con algún corazón para superar el nivel; sin choques y con muchas pilas, tres estrellas. El truco es mirar por qué lado vienen los pinchos y girar pronto, mientras el otro lado esté libre. Un giro cruza el centro, así que espera cerca de una sierra. Teclas: Espacio o flechas arriba/abajo.",
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

const MUTE_KEY = "oiyo:upside-dash:muted";
const W = 360;
const H = 560;
const DT_FIX = 1 / 120;

export default function UpsideDash({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; batteries: number; hits: number }>(null);
  const [hearts, setHearts] = useState(HEARTS);
  const [bats, setBats] = useState(0);
  const runRef = useRef<Run | null>(null);
  const taps = useRef(0);
  const started = useRef(false);
  const acc = useRef(0);
  const flash = useRef(0);
  const st = UPSIDE_STAGES[stage];

  useRunRecord(UPSIDE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    runRef.current = newRun(UPSIDE_STAGES[s]);
    taps.current = 0;
    started.current = false;
    acc.current = 0;
    flash.current = 0;
    setHearts(HEARTS);
    setBats(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(UPSIDE_SLUG, STAGE_COUNT);
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
      const r = runRef.current;
      if (!r) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      if (taps.current > 0) {
        taps.current = 0;
        if (!started.current) started.current = true;
        else if (flip(r)) sfx("tap");
      }
      if (started.current && !r.over) {
        acc.current += dt;
        while (acc.current >= DT_FIX && !r.over) {
          acc.current -= DT_FIX;
          const ev = step(r, DT_FIX);
          if (ev.hit) {
            setHearts(r.hearts);
            flash.current = 0.4;
            spawnBurst(parts.current, PLAYER_X, r.y, ["#ff6b6b", "#fff"], 14, 120, 3);
            sfx("fail");
          }
          if (ev.battery) {
            setBats(r.batteries);
            spawnBurst(parts.current, PLAYER_X, r.y, ["#ffd43b", "#51cf66"], 8, 90, 2);
            sfx("success");
          }
        }
        if (r.over) {
          setOver({ won: r.won, stars: starsFor(r), batteries: r.batteries, hits: r.hits });
          if (r.won) {
            setCleared(markStageCleared(UPSIDE_SLUG, r.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, MID, ["#4dabf7", "#ffd43b", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      flash.current = Math.max(0, flash.current - dt);
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cam = r.x - PLAYER_X;
        ctx.fillStyle = "#1c2541";
        ctx.fillRect(0, 0, W, H);
        // the tunnel: back wall stripes moving slower, then floor and ceiling
        ctx.fillStyle = "#243156";
        for (let k = -1; k < 8; k++) ctx.fillRect(Math.round(k * 60 - ((cam * 0.5) % 60)), CEIL - HALF, 24, FLOOR - CEIL + HALF * 2);
        ctx.fillStyle = "#495057";
        ctx.fillRect(0, FLOOR + HALF, W, H - FLOOR - HALF);
        ctx.fillRect(0, 0, W, CEIL - HALF);
        ctx.fillStyle = "#868e96";
        for (let k = -1; k < 10; k++) {
          const x = Math.round(k * 40 - (cam % 40));
          ctx.fillRect(x, FLOOR + HALF, 20, 4);
          ctx.fillRect(x, CEIL - HALF - 4, 20, 4);
        }
        // the finish line
        const fx = r.stage.length - cam;
        if (fx < W + 20) {
          for (let y = CEIL - HALF; y < FLOOR + HALF; y += 12) {
            ctx.fillStyle = (Math.floor(y / 12) % 2) ? "#fff" : "#212529";
            ctx.fillRect(Math.round(fx), y, 12, 12);
          }
        }
        for (const h of r.stage.hazards) {
          const x = h.x - cam;
          if (x > W + 10 || x + h.w < -10) continue;
          if (h.lane === 1) {
            const cx = x + h.w / 2;
            const rot = r.t * 12;
            ctx.fillStyle = "#ced4da";
            for (let k = 0; k < 8; k++) {
              const a = rot + (k * Math.PI) / 4;
              ctx.fillRect(Math.round(cx + Math.cos(a) * 18) - 3, Math.round(MID + Math.sin(a) * 18) - 3, 6, 6);
            }
            ctx.fillStyle = "#868e96";
            ctx.fillRect(Math.round(cx) - 12, MID - 12, 24, 24);
            ctx.fillStyle = "#495057";
            ctx.fillRect(Math.round(cx) - 4, MID - 4, 8, 8);
            continue;
          }
          // spikes: little teeth along the stretch
          ctx.fillStyle = "#ff6b6b";
          for (let sx = x; sx < x + h.w - 4; sx += 12) {
            for (let k = 0; k < 4; k++) {
              const wdt = 12 - k * 3;
              if (h.lane === 0) ctx.fillRect(Math.round(sx + k * 1.5), FLOOR + HALF - 4 - k * 4, wdt, 4);
              else ctx.fillRect(Math.round(sx + k * 1.5), CEIL - HALF + k * 4, wdt, 4);
            }
          }
        }
        r.stage.batteries.forEach((b, k) => {
          if (r.got[k]) return;
          const x = b.x - cam;
          if (x < -20 || x > W + 20) return;
          drawSprite(ctx, BATTERY_ART, x, b.y + Math.sin(r.t * 6 + k) * 2, { scale: 3 });
        });
        if (r.safe === 0 || Math.floor(r.t * 12) % 2 === 0) drawSprite(ctx, BOT_ART, PLAYER_X, r.y, { scale: 3, rotate: (1 - (r.y - CEIL) / (FLOOR - CEIL)) * Math.PI });
        if (flash.current > 0) {
          ctx.fillStyle = `rgba(255,107,107,${flash.current})`;
          ctx.fillRect(0, 0, W, H);
        }
        // the progress bar
        ctx.fillStyle = "#343a40";
        ctx.fillRect(20, 30, W - 40, 8);
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(20, 30, Math.round((W - 40) * Math.min(1, r.x / r.stage.length)), 8);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = () => {
    if (runRef.current?.over) return;
    taps.current++;
    setTouched(true);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat || runRef.current?.over) return;
    taps.current++;
    setTouched(true);
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
      data-game="upside-dash"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline" aria-label={`${hearts}`}>{"♥".repeat(Math.max(0, hearts))}</Badge>
        <Badge variant="outline">{fill(c.bat, `${bats}/${st.par}`)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.batteries, over.hits)}</p>
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
