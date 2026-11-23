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
import { FIELD_H, FIELD_W, GONGGI_SLUG, HAND, LEVELS, LIVES, STAGE_COUNT, STEPS, airFor, motherY, need, newGonggi, starsFor, stepGonggi, tap, toss, type GonggiState, type TapResult } from "../../lib/games/gonggi-toss";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; step: string; pick: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; r: Record<Exclude<TapResult, "none"> | "drop", string>;
}> = {
  ko: {
    stage: "{0}단계", step: "공기 {0}단", pick: "주울 돌 {0}", start: "위로 튕겨 던지고, 떠 있는 동안 돌을 톡 주워요", win: "공기 다 땄다!", lose: "기회를 다 썼어요", result: "잡은 횟수 {0}번",
    again: "다시 하기", next: "다음 단계",
    r: { pick: "줍기!", catch: "잡았다!", short: "덜 주웠어요", early: "너무 빨라요", drop: "떨어뜨렸어요" },
    help: "설날 오후, 따뜻한 방바닥에서 공기놀이를 해요. 화면을 위로 튕기면 손에 든 빨간 공깃돌이 위로 올라가요. 세게 튕길수록 오래 떠 있어요. 떠 있는 동안 바닥의 돌을 톡 눌러 줍고, 공깃돌이 손으로 내려올 때 아무 데나 톡 눌러 받아요. 손 둘레가 초록으로 빛날 때 받아야 해요. 1단은 한 알씩, 2단은 두 알씩, 3단은 세 알과 한 알, 4단은 네 알을 한 번에 주워요. 너무 일찍 받거나, 덜 줍거나, 떨어뜨리면 하트가 줄어요. 뒤로 갈수록 여러 단을 이어 하고, 돌이 넓게 흩어지고, 받는 순간이 짧아져요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", step: "Step {0}", pick: "Pick {0}", start: "Flick up to toss, then tap stones while it flies", win: "You cleared the gonggi!", lose: "Out of hearts", result: "{0} catches",
    again: "Play again", next: "Next stage",
    r: { pick: "Picked!", catch: "Caught!", short: "Not enough stones", early: "Too early", drop: "Dropped it" },
    help: "A Seollal afternoon on the warm floor: time for gonggi, the Korean five-stone game. Flick up on the screen to toss the red mother stone; a harder flick throws it higher. While it is in the air, tap the stones on the floor to scoop them up, then tap anywhere to catch the mother stone as it comes back down, when the ring around the hand glows green. Step 1 picks one stone per toss, step 2 two, step 3 three then one, step 4 all four. Grabbing too early, scooping too few or dropping it costs a heart. Later stages chain steps, spread the stones wider and shorten the catch.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", step: "{0}段", pick: "拾う石 {0}", start: "上へはじいて投げ、浮いている間に石をタップ", win: "コンギ制覇！", lose: "ハートがなくなった", result: "キャッチ {0}回",
    again: "もう一度", next: "次の面",
    r: { pick: "拾った!", catch: "キャッチ!", short: "拾い足りない", early: "早すぎ", drop: "落とした" },
    help: "ソルラルの午後、暖かい床でコンギ(韓国のお手玉石遊び)。画面を上へはじくと赤い親石が上がり、強くはじくほど長く浮きます。浮いている間に床の石をタップして拾い、親石が手に戻ってくるとき、手のまわりの輪が緑に光ったらどこでもタップしてキャッチ。1段は1個ずつ、2段は2個ずつ、3段は3個と1個、4段は4個いっぺんに拾います。早すぎるキャッチ、拾い足りない、落とすとハートが減ります。後半は段が続き、石が広く散らばり、キャッチの瞬間が短くなります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", step: "第{0}段", pick: "要捡 {0}", start: "向上一弹抛起，石子在空中时点地上的石子", win: "抓石子全过关！", lose: "红心用完了", result: "接住 {0}次",
    again: "再玩一次", next: "下一关",
    r: { pick: "捡到!", catch: "接住了!", short: "捡得不够", early: "太早了", drop: "掉了" },
    help: "春节午后，在温暖的炕上玩抓石子(공기)。在屏幕上向上一弹，红色母石就会飞起，弹得越用力飞得越久。母石在空中时，点地上的石子把它捡起来；母石落回手上、手边的圆圈亮绿时，点任意位置接住。第1段每次捡一颗，第2段两颗，第3段三颗再一颗，第4段一次捡四颗。接得太早、捡得不够或掉了都会扣一颗心。越往后要连着玩几段，石子散得更开，接住的时机也更短。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", step: "Étape {0}", pick: "À ramasser {0}", start: "Lancez vers le haut, puis touchez les cailloux", win: "Gonggi réussi !", lose: "Plus de cœurs", result: "{0} rattrapages",
    again: "Rejouer", next: "Niveau suivant",
    r: { pick: "Ramassé !", catch: "Rattrapé !", short: "Pas assez de cailloux", early: "Trop tôt", drop: "Tombé" },
    help: "Un après-midi de Seollal sur le sol chauffé : place au gonggi, le jeu coréen des cinq cailloux. Glissez vers le haut pour lancer le caillou rouge ; plus le geste est vif, plus il monte. Pendant qu'il vole, touchez les cailloux au sol pour les ramasser, puis touchez n'importe où pour le rattraper quand l'anneau autour de la main devient vert. Étape 1 : un caillou par lancer, étape 2 : deux, étape 3 : trois puis un, étape 4 : les quatre. Trop tôt, pas assez ramassé ou tombé : un cœur en moins. Plus loin, les étapes s'enchaînent, les cailloux s'éparpillent et le rattrapage raccourcit.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", step: "Paso {0}", pick: "Recoger {0}", start: "Desliza hacia arriba para lanzar y toca las piedras", win: "¡Gonggi superado!", lose: "Sin corazones", result: "{0} atrapadas",
    again: "Otra vez", next: "Siguiente nivel",
    r: { pick: "¡Recogida!", catch: "¡Atrapada!", short: "Faltan piedras", early: "Muy pronto", drop: "Se cayó" },
    help: "Una tarde de Seollal en el suelo cálido: hora de gonggi, el juego coreano de las cinco piedras. Desliza hacia arriba para lanzar la piedra roja; cuanto más rápido, más alto sube. Mientras vuela, toca las piedras del suelo para recogerlas y luego toca en cualquier lugar para atraparla al bajar, cuando el aro alrededor de la mano brilla en verde. Paso 1: una piedra por lanzamiento, paso 2: dos, paso 3: tres y una, paso 4: las cuatro. Atrapar muy pronto, recoger pocas o dejarla caer cuesta un corazón. Más adelante se encadenan pasos, las piedras se dispersan y el momento de atrapar se acorta.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:gonggi-toss:muted";
const pebble = (a: string, b: string, h: string): PixelArt => ({ palette: { a, b, h }, rows: [".aaa.", "ahaab", "aaaab", "aaabb", ".bbb."] });
const STONES = [pebble("#4dabf7", "#1971c2", "#d0ebff"), pebble("#ffd43b", "#f08c00", "#fff3bf"), pebble("#69db7c", "#2b8a3e", "#d3f9d8"), pebble("#da77f2", "#9c36b5", "#f3d9fa")];
const MOTHER = pebble("#ff6b6b", "#c92a2a", "#ffe3e3");
const PALM: PixelArt = {
  palette: { s: "#f1c27d", d: "#d4a066", h: "#c92a2a", w: "#fff" },
  rows: [".s.s.s.s..", ".s.s.s.s..", ".sssssss..", "ssssssssss", "sssssssss.", ".sssssss..", "..ddddd...", "..hhhhh...", "..hwhwh..."],
};

interface Pop { x: number; y: number; text: string; t: number; color: string }
interface Fly { x: number; y: number; k: number; color: number }

export default function GonggiToss({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ step: LEVELS[0].steps[0], need: 1, lives: LIVES });
  const [over, setOver] = useState<null | { won: boolean; stars: number; catches: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<GonggiState>(newGonggi(0));
  const flick = useRef<null | { id: number; x: number; y: number; t: number; done: boolean }>(null);
  const flies = useRef<Fly[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const level = LEVELS[stage];

  useRunRecord(GONGGI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const sync = useCallback(() => {
    const s = sRef.current;
    if (!s.over) setHud({ step: s.level.steps[s.step], need: need(s), lives: s.lives });
    else setHud((h) => ({ ...h, lives: s.lives }));
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newGonggi(st);
    flick.current = null;
    flies.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ step: LEVELS[st].steps[0], need: STEPS[LEVELS[st].steps[0] - 1][0], lives: LIVES });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GONGGI_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const finish = useCallback(() => {
    const s = sRef.current;
    sync();
    if (!s.over) return;
    setOver({ won: s.won, stars: starsFor(s), catches: s.catches });
    if (s.won) {
      setCleared(markStageCleared(GONGGI_SLUG, s.level.stage, STAGE_COUNT));
      spawnBurst(parts.current, HAND.x, HAND.y - 40, ["#ff6b6b", "#ffd43b", "#4dabf7", "#69db7c"], 36, 160, s.catches);
      sfx("win");
    } else sfx("lose");
  }, [sfx, sync]);

  const pop = useCallback((text: string, color: string, x = HAND.x, y = HAND.y - 120) => {
    pops.current.push({ x, y, text, t: 1, color });
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = sRef.current;
      if (stepGonggi(s, dt) === "drop") {
        pop(c.r.drop, "#c92a2a");
        sfx("fail");
        finish();
      }
      stepParticles(parts.current, dt, 140);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      for (const f of flies.current) f.k = Math.min(1, f.k + dt * 6);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm yellow floor mat with its seams, a folded blanket and a sliding door
        ctx.fillStyle = "#f2d38a";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = "#e6c06e";
        for (let y = 140; y < FIELD_H; y += 70) ctx.fillRect(0, y, FIELD_W, 2);
        for (let x = 0; x < FIELD_W; x += 90) ctx.fillRect(x, 140, 2, FIELD_H - 140);
        ctx.fillStyle = "#fff9ef";
        ctx.fillRect(0, 0, FIELD_W, 130);
        ctx.fillStyle = "#8a5a3b";
        for (let x = 0; x <= FIELD_W; x += 36) ctx.fillRect(x, 0, 4, 130);
        for (let y = 0; y <= 130; y += 32) ctx.fillRect(0, y, FIELD_W, 4);
        ctx.fillRect(0, 128, FIELD_W, 10);
        ctx.fillStyle = "#e64980";
        ctx.fillRect(14, 150, 70, 30);
        ctx.fillStyle = "#f783ac";
        ctx.fillRect(14, 150, 70, 8);
        ctx.fillStyle = "#1c7ed6";
        ctx.fillRect(18, 180, 62, 12);

        // stones on the floor
        s.stones.forEach((st, i) => {
          if (st.taken) return;
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(Math.round(st.x) - 9, Math.round(st.y) + 8, 18, 4);
          drawSprite(ctx, STONES[i % 4], st.x, st.y, { scale: 4 });
        });
        // stones that were just scooped fly to the hand
        for (const f of flies.current) {
          const x = f.x + (HAND.x + 34 - f.x) * f.k;
          const y = f.y + (HAND.y - 6 - f.y) * f.k - Math.sin(f.k * Math.PI) * 30;
          drawSprite(ctx, STONES[f.color % 4], x, y, { scale: 4 });
        }
        flies.current = flies.current.filter((f) => f.k < 1 || s.flying);

        // the catch ring around the hand glows while a catch would count
        const inWindow = s.flying && s.t >= s.air - s.level.window && s.picked >= need(s);
        ctx.strokeStyle = inWindow ? "#2f9e44" : s.flying ? "rgba(73,80,87,0.35)" : "rgba(73,80,87,0.15)";
        ctx.lineWidth = inWindow ? 5 : 3;
        ctx.beginPath();
        ctx.arc(HAND.x, HAND.y, 34, 0, Math.PI * 2);
        ctx.stroke();
        drawSprite(ctx, PALM, HAND.x, HAND.y + 16, { scale: 4 });
        // scooped stones held in the hand
        for (let k = 0; k < s.picked; k++) drawSprite(ctx, STONES[k % 4], HAND.x + 22 + (k % 2) * 12, HAND.y + 6 - Math.floor(k / 2) * 10, { scale: 3 });
        // the mother stone and its shadow
        const my = motherY(s);
        const lift = (HAND.y - my) / 400;
        ctx.fillStyle = `rgba(0,0,0,${0.18 - lift * 0.12})`;
        ctx.fillRect(HAND.x - 8 + Math.round(lift * 4), HAND.y + 2, 16 - Math.round(lift * 8), 4);
        drawSprite(ctx, MOTHER, HAND.x, my - 4, { scale: 4 });

        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 14;
          const py = pp.y - (1 - pp.t) * 24;
          ctx.fillRect(pp.x - w / 2, py - 18, w, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, pp.x, py);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.r.drop, finish, pop, sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const doToss = (speed: number) => {
    const s = sRef.current;
    if (toss(s, airFor(s.level, speed))) sfx("tap");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over) return;
    setTouched(true);
    const p = toField(e);
    if (s.flying) {
      // taps while the stone flies act at once, so timing is the moment of the touch
      const before = s.stones.map((st) => st.taken);
      const res = tap(s, p.x, p.y);
      if (res === "pick") {
        const i = s.stones.findIndex((st, k) => st.taken && !before[k]);
        if (i >= 0) flies.current.push({ x: s.stones[i].x, y: s.stones[i].y, k: 0, color: i });
        pop(c.r.pick, "#1c7ed6", p.x, p.y - 30);
        sfx("place");
      } else if (res === "catch") {
        pop(c.r.catch, "#2f9e44");
        spawnBurst(parts.current, HAND.x, HAND.y - 10, ["#ffffff", "#ffd43b"], 12, 100, s.catches);
        flies.current = [];
        sfx(s.over ? "combo" : "success");
      } else if (res === "early" || res === "short") {
        pop(c.r[res], "#c92a2a");
        flies.current = [];
        sfx("fail");
      }
      finish();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    flick.current = { id: e.pointerId, x: p.x, y: p.y, t: performance.now() / 1000, done: false };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const f = flick.current;
    if (!f || f.id !== e.pointerId || f.done) return;
    const p = toField(e);
    const dy = f.y - p.y;
    if (dy > 36) {
      f.done = true;
      const dtv = Math.max(0.016, performance.now() / 1000 - f.t);
      doToss(dy / dtv);
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const f = flick.current;
    if (!f || f.id !== e.pointerId) return;
    flick.current = null;
    if (f.done) return;
    const p = toField(e);
    // a plain tap still tosses, at middle height
    if (Math.hypot(p.x - f.x, p.y - f.y) < 14) doToss(800);
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
      data-game="gonggi-toss"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.step, hud.step)}{level.steps.length > 1 ? ` (${level.steps.join("→")})` : ""}</Badge>
        <Badge variant="outline">{fill(c.pick, hud.need)}</Badge>
        <Badge variant="outline" aria-label={`${hud.lives}/${LIVES}`}>{"♥".repeat(hud.lives)}{"♡".repeat(LIVES - hud.lives)}</Badge>
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
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (flick.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.catches)}</p>
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
