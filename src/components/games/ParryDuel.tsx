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
import { FOCUS_MAX, PARRY_SLUG, PARRY_STAGES, PLAYER_HP, STAGE_COUNT, choose, combo, focusCost, hitTime, newDuel, starsFor, stepDuel, tap, type Duel, type Move } from "../../lib/games/parry-duel";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; round: string; you: string; rival: string; focus: string; start: string; yourTurn: string; theirTurn: string; win: string; lose: string; result: string; again: string; next: string;
  moves: Record<Move, string>; parry: string; block: string; hit: string; fumble: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", round: "{0}라운드", you: "나", rival: "상대", focus: "집중 {0}/{1}", start: "기술을 고르고, 상대가 휘두르면 원이 닿는 순간 눌러요!", yourTurn: "내 차례: 기술을 골라요", theirTurn: "막기! 원이 닿을 때 눌러요", win: "승리!", lose: "쓰러졌어요", result: "완벽 막기 {0} · 막기 {1} · 맞음 {2}",
    again: "다시 하기", next: "다음 단계", moves: { strike: "베기", heavy: "강타 (2)", mend: "회복 (3)" }, parry: "완벽 막기!", block: "막기", hit: "맞았어요", fumble: "헛손질",
    help: "번갈아 싸우는 결투예요. 내 차례에는 베기, 강타(집중 2), 회복(집중 3) 중 하나를 골라요. 상대 차례에는 연속 공격이 날아오고, 휘두를 때마다 원이 줄어들다 내 캐릭터에 닿는 순간 공격이 들어와요. 그 순간에 맞춰 화면을 누르면 완벽 막기라 피해가 없고 짧게 반격하며 집중을 1 얻어요. 조금 어긋나면 막기라 피해가 4분의 1로 줄어요. 너무 일찍 누르면 헛손질해서 잠깐 막을 수 없어요. 상대마다 몇 가지 연속 공격을 번갈아 쓰니 박자를 외우세요. 뒤로 갈수록 빨라지고, 길게 뜸 들이는 속임수도 섞여요. (키보드: 1·2·3으로 기술, 스페이스로 막기)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", round: "Round {0}", you: "You", rival: "Rival", focus: "Focus {0}/{1}", start: "Pick a move, then tap as each ring closes on you!", yourTurn: "Your turn: pick a move", theirTurn: "Defend! Tap as the ring lands", win: "Victory!", lose: "You fell", result: "Parries {0} · blocks {1} · hits taken {2}",
    again: "Try again", next: "Next stage", moves: { strike: "Strike", heavy: "Heavy (2)", mend: "Mend (3)" }, parry: "Parry!", block: "Block", hit: "Hit", fumble: "Fumble",
    help: "A duel in turns. On your turn pick a strike, a heavy blow (2 focus) or mend your wounds (3 focus). On the rival's turn a combo comes at you: each swing shows a ring closing in, and the blow lands the moment it reaches you. Tap right then to parry — no damage, a quick counter and 1 focus. A little off and you block for a quarter of the damage. Tap too early and you fumble, unable to defend for a moment. Each rival cycles through a few combos, so learn their rhythm. Later rivals swing faster and mix in feints with long wind-ups. (Keyboard: 1 2 3 for moves, Space to parry.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", round: "第{0}ラウンド", you: "自分", rival: "相手", focus: "集中 {0}/{1}", start: "技を選び、相手が振ったら輪が届く瞬間に押そう！", yourTurn: "自分の番：技を選ぼう", theirTurn: "防御！輪が届く瞬間に押そう", win: "勝利！", lose: "倒れました", result: "パリィ {0}・ガード {1}・被弾 {2}",
    again: "もう一度", next: "次の面", moves: { strike: "斬る", heavy: "強打（2）", mend: "回復（3）" }, parry: "パリィ！", block: "ガード", hit: "被弾", fumble: "空振り",
    help: "交互に戦う決闘です。自分の番には斬る・強打（集中2）・回復（集中3）から選びます。相手の番には連続攻撃が来て、振るたびに輪が縮み、自分に届いた瞬間に攻撃が当たります。その瞬間に画面を押せばパリィでダメージなし、短く反撃して集中が1増えます。少しずれるとガードでダメージが4分の1。早すぎると空振りして少しの間防げません。相手ごとにいくつかの連続攻撃を順に使うので、リズムを覚えましょう。後半ほど速くなり、長くためるフェイントも混じります。（キーボード：1・2・3で技、スペースで防御）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", round: "第{0}回合", you: "我", rival: "对手", focus: "专注 {0}/{1}", start: "选一个招式，对手挥击时在圈碰到你的瞬间点击！", yourTurn: "我的回合：选招式", theirTurn: "防守！圈落下时点击", win: "胜利！", lose: "倒下了", result: "完美格挡 {0} · 格挡 {1} · 被击中 {2}",
    again: "再来一次", next: "下一关", moves: { strike: "斩击", heavy: "重击（2）", mend: "疗伤（3）" }, parry: "完美格挡！", block: "格挡", hit: "被击中", fumble: "落空",
    help: "轮流出手的决斗。我的回合从斩击、重击（专注2）、疗伤（专注3）中选一个。对手回合会连续攻击：每次挥击都有一个缩小的圈，圈碰到你的瞬间攻击落下。在那一刻点屏幕就是完美格挡，不受伤，并短暂反击、获得1点专注。稍有偏差就是格挡，伤害减为四分之一。点得太早会落空，一时无法防守。每个对手轮流使用几套连招，记住节奏吧。越往后挥击越快，还会夹杂长时间蓄力的假动作。（键盘：1、2、3选招式，空格格挡）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", round: "Manche {0}", you: "Vous", rival: "Rival", focus: "Concentration {0}/{1}", start: "Choisissez un coup, puis touchez quand chaque anneau se referme sur vous !", yourTurn: "Votre tour : choisissez un coup", theirTurn: "Défendez ! Touchez quand l'anneau arrive", win: "Victoire !", lose: "Vous êtes tombé", result: "Parades {0} · blocages {1} · coups reçus {2}",
    again: "Réessayer", next: "Niveau suivant", moves: { strike: "Frappe", heavy: "Coup lourd (2)", mend: "Soin (3)" }, parry: "Parade !", block: "Blocage", hit: "Touché", fumble: "Raté",
    help: "Un duel au tour par tour. À votre tour, choisissez une frappe, un coup lourd (2 de concentration) ou un soin (3). Au tour du rival, une série de coups arrive : chaque coup montre un anneau qui se resserre et frappe quand il vous atteint. Touchez à cet instant pour parer — aucun dégât, une riposte et 1 de concentration. Un peu à côté, vous bloquez un quart des dégâts. Trop tôt, vous ratez et ne pouvez plus vous défendre un instant. Chaque rival enchaîne quelques séries : apprenez leur rythme. Plus loin, ils frappent plus vite et feintent avec de longues préparations. (Clavier : 1 2 3 pour les coups, Espace pour parer.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", round: "Ronda {0}", you: "Tú", rival: "Rival", focus: "Foco {0}/{1}", start: "¡Elige un golpe y toca cuando cada anillo se cierre sobre ti!", yourTurn: "Tu turno: elige un golpe", theirTurn: "¡Defiende! Toca cuando llegue el anillo", win: "¡Victoria!", lose: "Has caído", result: "Paradas {0} · bloqueos {1} · golpes recibidos {2}",
    again: "Reintentar", next: "Siguiente nivel", moves: { strike: "Tajo", heavy: "Golpe fuerte (2)", mend: "Curar (3)" }, parry: "¡Parada!", block: "Bloqueo", hit: "Golpe", fumble: "Fallo",
    help: "Un duelo por turnos. En tu turno elige un tajo, un golpe fuerte (2 de foco) o curarte (3). En el turno del rival llega una serie de golpes: cada uno muestra un anillo que se cierra y golpea al alcanzarte. Toca justo entonces para parar: sin daño, un contraataque y 1 de foco. Un poco desviado bloqueas y recibes un cuarto del daño. Demasiado pronto fallas y no puedes defenderte un momento. Cada rival repite unas cuantas series: aprende su ritmo. Más adelante golpean más rápido y amagan con preparaciones largas. (Teclado: 1 2 3 para golpes, Espacio para parar.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:parry-duel:muted";
const W = 360;
const H = 560;
const ME = { x: 180, y: 380 };
const FOE = { x: 180, y: 170 };
const MOVES: Move[] = ["strike", "heavy", "mend"];
const PLATE_Y = 470;
const plateX = (k: number) => 10 + k * 116;
const HERO: PixelArt = {
  palette: { k: "#212529", s: "#f3c9a0", b: "#1971c2", w: "#dee2e6", y: "#fcc419" },
  rows: ["..kkk...", ".kssk...", ".ksss..w", "..bb..w.", ".bbbbyw.", "b.bb.y..", "..bb....", ".b..b...", ".b..b..."],
};
const RIVAL: PixelArt = {
  palette: { k: "#212529", s: "#e0b894", r: "#c92a2a", w: "#adb5bd", d: "#5c0d0d" },
  rows: ["w..kkk..", ".w.kssk.", "..wsssk.", "...rr...", "..rrrr.r", ".r.rr.r.", "...dd...", "..d..d..", "..d..d.."],
};

interface Pop { text: string; t: number; color: string }
type Input = { kind: "move"; mv: Move } | { kind: "tap" };

export default function ParryDuel({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; parries: number; blocks: number; hits: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dRef = useRef<Duel>(newDuel(PARRY_STAGES[0]));
  const input = useRef<Input[]>([]);
  const shake = useRef(0);
  const flash = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(PARRY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    dRef.current = newDuel(PARRY_STAGES[s]);
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PARRY_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      if (ev.key === " ") {
        ev.preventDefault();
        input.current.push({ kind: "tap" });
        setTouched(true);
      } else if (ev.key === "1" || ev.key === "2" || ev.key === "3") {
        input.current.push({ kind: "move", mv: MOVES[Number(ev.key) - 1] });
        setTouched(true);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const d = dRef.current;
      const cp = copyRef.current;
      const end = () => {
        setOver({ won: d.won, stars: starsFor(d), parries: d.parries, blocks: d.blocks, hits: d.hits });
        if (d.won) {
          setCleared(markStageCleared(PARRY_SLUG, d.rival.stage, STAGE_COUNT));
          spawnBurst(parts.current, FOE.x, FOE.y, ["#ffd43b", "#fff", "#fa5252"], 26, 140, 3);
          sfx("win");
        } else sfx("lose");
      };
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (d.over) break;
        if (e.kind === "move" && d.phase === "choose") {
          if (choose(d, e.mv)) {
            sfx(e.mv === "mend" ? "combo" : "place");
            if (e.mv !== "mend") spawnBurst(parts.current, FOE.x, FOE.y + 20, ["#fff", "#ffa8a8"], e.mv === "heavy" ? 14 : 7, 90, 2);
            if (d.over) end();
          }
        } else if (e.kind === "tap" && d.phase === "defend") {
          const r = tap(d);
          if (r === "parry") {
            pops.current.push({ text: cp.parry, t: 0.6, color: "#ffd43b" });
            spawnBurst(parts.current, ME.x, ME.y - 40, ["#ffd43b", "#fff"], 12, 120, 2);
            flash.current = 0.12;
            sfx("success");
            if (d.over) end();
          } else if (r === "block") {
            pops.current.push({ text: cp.block, t: 0.6, color: "#74c0fc" });
            sfx("tap");
            if (d.over) end();
          } else if (r === "fumble") {
            pops.current.push({ text: cp.fumble, t: 0.6, color: "#e8590c" });
          }
        }
      }
      if (!d.over && d.phase === "defend") {
        const hp = d.hp;
        const ev = stepDuel(d, dt);
        if (ev.hit) {
          pops.current.push({ text: cp.hit, t: 0.6, color: "#fa5252" });
          shake.current = 0.25;
          sfx("fail");
          if (d.hp < hp) spawnBurst(parts.current, ME.x, ME.y, ["#fa5252"], 8, 80, 2);
        }
        if (d.over) end();
      }
      shake.current = Math.max(0, shake.current - dt);
      flash.current = Math.max(0, flash.current - dt);
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = flash.current > 0 ? "#3b2f0b" : "#1a1423";
        ctx.fillRect(0, 0, W, H);
        // the arena floor
        ctx.fillStyle = "#2c2235";
        ctx.fillRect(0, 250, W, 200);
        ctx.fillStyle = "#3a2d45";
        for (let x = 0; x < W; x += 40) ctx.fillRect(x, 250, 2, 200);
        const sx = shake.current > 0 ? Math.sin(now / 20) * 4 : 0;
        // the rival raises its blade during a wind-up
        const sw = d.phase === "defend" ? combo(d)[d.swing] : undefined;
        const raising = sw && d.t >= sw.at && d.t <= hitTime(sw) + d.rival.good;
        drawSprite(ctx, RIVAL, FOE.x, FOE.y - (raising ? 6 : 0), { scale: 8 });
        drawSprite(ctx, HERO, ME.x + sx, ME.y, { scale: 8 });
        // the closing ring: it reaches you exactly as the blow lands
        if (sw && d.t >= sw.at) {
          const left = Math.max(0, (hitTime(sw) - d.t) / sw.windup);
          const r = 34 + left * 120;
          ctx.strokeStyle = sw.feint ? "#cc5de8" : "#ff8787";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(ME.x, ME.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ME.x, ME.y, 34, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (d.phase === "defend" && d.t < d.lockUntil) {
          ctx.fillStyle = "rgba(232,89,12,0.35)";
          ctx.fillRect(ME.x - 40, ME.y - 50, 80, 100);
        }
        drawParticles(ctx, parts.current);
        // health and focus
        const bar = (x: number, y: number, w: number, v: number, max: number, col: string) => {
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fillRect(x, y, w, 10);
          ctx.fillStyle = col;
          ctx.fillRect(x, y, (w * Math.max(0, v)) / max, 10);
        };
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f1f3f5";
        ctx.fillText(`${cp.rival} ${Math.max(0, d.foe)}`, 12, 22);
        bar(12, 28, 336, d.foe, d.rival.hp, "#fa5252");
        ctx.fillText(`${cp.you} ${d.hp}`, 12, 440);
        bar(12, 446, 220, d.hp, PLAYER_HP, "#51cf66");
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.focus, d.focus, FOCUS_MAX), W - 12, 440);
        for (let k = 0; k < FOCUS_MAX; k++) {
          ctx.fillStyle = k < d.focus ? "#ffd43b" : "rgba(255,255,255,0.15)";
          ctx.fillRect(W - 12 - (FOCUS_MAX - k) * 20, 446, 16, 10);
        }
        ctx.textAlign = "center";
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#ced4da";
        ctx.fillText(`${fill(cp.round, d.round + 1)} · ${d.phase === "choose" ? cp.yourTurn : cp.theirTurn}`, W / 2, 60);
        // move plates (live on your turn)
        MOVES.forEach((mv, k) => {
          const ok = d.phase === "choose" && !d.over && d.focus >= focusCost[mv];
          ctx.fillStyle = ok ? (mv === "mend" ? "#2b8a3e" : mv === "heavy" ? "#c92a2a" : "#1971c2") : "#343a40";
          ctx.fillRect(plateX(k), PLATE_Y, 108, 72);
          ctx.fillStyle = ok ? "#fff" : "#868e96";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(cp.moves[mv], plateX(k) + 54, PLATE_Y + 42);
        });
        for (const pp of pops.current) {
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 285 - (0.6 - pp.t) * 30);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dRef.current;
    if (d.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (d.phase === "choose") {
      MOVES.forEach((mv, k) => {
        if (x >= plateX(k) && x <= plateX(k) + 108 && y >= PLATE_Y && y <= PLATE_Y + 72) input.current.push({ kind: "move", mv });
      });
    } else input.current.push({ kind: "tap" });
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
      data-game="parry-duel"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{`${c.rival} ${PARRY_STAGES[stage].hp}`}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-24 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.parries, over.blocks, over.hits)}</p>
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
