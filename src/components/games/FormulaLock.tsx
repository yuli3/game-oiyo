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
import { LOCK_SLUG, LOCK_STAGES, STAGE_COUNT, TRIES, guess, newSafe, starsFor, type Safe } from "../../lib/games/formula-lock";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; symbols: string; start: string; notTrue: string; short: string; win: string; lose: string; result: string; answer: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", symbols: "{0}칸 수식", start: "참인 수식을 입력해 금고를 열어요!", notTrue: "참인 수식이 아니에요", short: "칸을 다 채워요", win: "금고가 열렸어요!", lose: "금고가 잠겼어요", result: "{0}번 만에 열었어요", answer: "정답: {0}",
    again: "다시 하기", next: "다음 단계",
    help: "금고는 참인 수식 하나로 열려요(예: 12+35=47). 같은 길이의 참인 수식을 입력하고 '↵'를 누르면 칸마다 색이 켜져요. 초록은 그 자리에 맞는 기호, 노랑은 수식 어딘가에 있지만 다른 자리인 기호, 회색은 없는 기호예요(같은 기호를 여러 번 넣으면 정답에 있는 만큼만 켜져요). 곱셈·나눗셈을 덧셈·뺄셈보다 먼저 계산하고, 결과는 0 이상의 정수예요. 여섯 번 안에 열면 통과, 적게 쓸수록 별이 늘어요. 키보드로 숫자와 + - * / = 를 치고 Backspace, Enter를 써도 돼요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", symbols: "{0}-symbol equation", start: "Type a true equation to crack the safe!", notTrue: "That equation isn't true", short: "Fill every square", win: "The safe is open!", lose: "The safe stays shut", result: "Opened in {0} tries", answer: "Answer: {0}",
    again: "Try again", next: "Next stage",
    help: "The safe opens to one true equation, such as 12+35=47. Type any true equation of the same length and press ↵: each square lights up — green for the right symbol in the right place, yellow for a symbol that's in the equation somewhere else, grey for one that isn't there (a symbol typed twice lights only as often as the answer has it). × and ÷ come before + and −, and results are whole numbers, zero or more. Crack it within six tries; the fewer, the more stars. You can type digits and + - * / = on a keyboard, with Backspace and Enter.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", symbols: "{0}マスの式", start: "正しい式を入れて金庫を開けよう！", notTrue: "正しい式ではない", short: "マスを全部うめよう", win: "金庫が開いた！", lose: "金庫は閉じたまま", result: "{0}回で開けた", answer: "答え：{0}",
    again: "もう一度", next: "次の面",
    help: "金庫は正しい式ひとつで開きます（例：12+35=47）。同じ長さの正しい式を入れて「↵」を押すと、マスごとに色がつきます。緑は正しい場所の記号、黄色は式のどこかにあるけれど別の場所の記号、灰色はない記号です（同じ記号を何度も入れると、答えにある数だけ色がつきます）。×と÷は+と−より先に計算し、結果は0以上の整数。6回以内に開ければクリア、少ないほど星が増えます。キーボードで数字と + - * / = を打ち、Backspace と Enter も使えます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", symbols: "{0}格算式", start: "输入成立的算式打开保险箱！", notTrue: "这个算式不成立", short: "把格子填满", win: "保险箱打开了！", lose: "保险箱没打开", result: "用了 {0} 次打开", answer: "答案：{0}",
    again: "再来一次", next: "下一关",
    help: "保险箱只认一个成立的算式（例如 12+35=47）。输入同样长度的成立算式并按“↵”，每一格都会亮色：绿色是位置正确的符号，黄色是算式里有但位置不同的符号，灰色是没有的符号（同一符号输入多次，只按答案中出现的次数亮色）。先算×÷再算+−，结果是0以上的整数。六次内打开即过关，次数越少星越多。也可以用键盘输入数字和 + - * / =，以及 Backspace、Enter。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", symbols: "Équation de {0} symboles", start: "Tapez une équation juste pour ouvrir le coffre !", notTrue: "Cette équation est fausse", short: "Remplissez toutes les cases", win: "Le coffre est ouvert !", lose: "Le coffre reste fermé", result: "Ouvert en {0} essais", answer: "Réponse : {0}",
    again: "Réessayer", next: "Niveau suivant",
    help: "Le coffre s'ouvre avec une seule équation juste, comme 12+35=47. Tapez une équation juste de même longueur et appuyez sur ↵ : chaque case s'allume — vert pour le bon symbole au bon endroit, jaune pour un symbole présent ailleurs, gris pour un symbole absent (un symbole tapé deux fois ne s'allume qu'autant de fois qu'il figure dans la réponse). × et ÷ passent avant + et −, et les résultats sont des entiers positifs ou nuls. Ouvrez-le en six essais ; moins il en faut, plus d'étoiles. Au clavier : chiffres, + - * / =, Retour arrière et Entrée.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", symbols: "Ecuación de {0} símbolos", start: "¡Escribe una ecuación cierta para abrir la caja fuerte!", notTrue: "Esa ecuación no es cierta", short: "Rellena todas las casillas", win: "¡La caja está abierta!", lose: "La caja sigue cerrada", result: "Abierta en {0} intentos", answer: "Respuesta: {0}",
    again: "Reintentar", next: "Siguiente nivel",
    help: "La caja fuerte se abre con una sola ecuación cierta, como 12+35=47. Escribe una ecuación cierta de la misma longitud y pulsa ↵: cada casilla se ilumina — verde para el símbolo correcto en su sitio, amarillo para uno que está en otro lugar, gris para uno que no está (un símbolo repetido solo se ilumina tantas veces como aparece en la respuesta). × y ÷ van antes que + y −, y los resultados son enteros de cero en adelante. Ábrela en seis intentos; cuantos menos, más estrellas. Con teclado: cifras, + - * / =, Retroceso e Intro.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:formula-lock:muted";
const W = 360;
const H = 560;
const show = (ch: string) => (ch === "*" ? "×" : ch === "/" ? "÷" : ch === "-" ? "−" : ch);
// the keypad: two rows of keys in the canvas
const KEYS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["+", "-", "*", "/", "=", "del", "enter"],
];
function keyBox(r: number, k: number) {
  if (r === 0) return { x: 6 + k * 34.8, y: 430, w: 32, h: 50 };
  const widths = [40, 40, 40, 40, 40, 56, 70];
  let x = 6;
  for (let j = 0; j < k; j++) x += widths[j] + 4;
  return { x, y: 488, w: widths[k], h: 50 };
}
const MARK_COLOURS = ["#868e96", "#f59f00", "#2b8a3e"];

export default function FormulaLock({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; tries: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const safeRef = useRef<Safe | null>(null);
  const typed = useRef("");
  const input = useRef<string[]>([]);
  const flash = useRef<{ text: string; t: number } | null>(null);
  const shake = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = LOCK_STAGES[stage];

  useRunRecord(LOCK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    safeRef.current = newSafe(LOCK_STAGES[s]);
    typed.current = "";
    input.current = [];
    flash.current = null;
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(LOCK_SLUG, STAGE_COUNT);
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
      const s = safeRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const L = s.stage.length;
      const cp = copyRef.current;
      // keys are read once per frame
      for (const k of input.current.splice(0)) {
        if (s.over) break;
        if (k === "del") typed.current = typed.current.slice(0, -1);
        else if (k === "enter") {
          if (typed.current.length < L) {
            flash.current = { text: cp.short, t: 1.2 };
            shake.current = 0.3;
            sfx("fail");
            continue;
          }
          const r = guess(s, typed.current);
          if (r === "not true") {
            flash.current = { text: cp.notTrue, t: 1.2 };
            shake.current = 0.3;
            sfx("fail");
            continue;
          }
          typed.current = "";
          if (r === "opened") {
            spawnBurst(parts.current, W / 2, 200, ["#ffd43b", "#fff", "#2b8a3e"], 30, 150, 3);
            sfx("win");
          } else sfx("place");
          if (s.over) {
            setOver({ won: s.won, stars: starsFor(s), tries: s.guesses.length });
            if (s.won) setCleared(markStageCleared(LOCK_SLUG, s.stage.stage, STAGE_COUNT));
            else sfx("lose");
          }
        } else if (typed.current.length < L) {
          typed.current += k;
          sfx("tap");
        }
      }
      if (flash.current && (flash.current.t -= dt) <= 0) flash.current = null;
      shake.current = Math.max(0, shake.current - dt);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, 0, W, H);
        // the safe door
        ctx.fillStyle = "#495057";
        ctx.fillRect(10, 40, W - 20, 370);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(14, 44, W - 28, 6);
        const size = Math.min(40, Math.floor((W - 40) / L) - 4);
        const x0 = (W - L * (size + 4)) / 2;
        for (let row = 0; row < TRIES; row++) {
          const y = 64 + row * (size + 8);
          const jig = row === s.guesses.length && shake.current > 0 ? Math.sin(now / 20) * 4 : 0;
          for (let k = 0; k < L; k++) {
            const x = x0 + k * (size + 4) + jig;
            let ch = "";
            let colour = "#212529";
            if (row < s.guesses.length) {
              ch = s.guesses[row][k];
              colour = MARK_COLOURS[s.marks[row][k]];
            } else if (row === s.guesses.length) ch = typed.current[k] ?? "";
            ctx.fillStyle = colour;
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = row === s.guesses.length ? "#ced4da" : "#212529";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
            if (ch) {
              ctx.fillStyle = "#f8f9fa";
              ctx.font = `bold ${Math.round(size * 0.55)}px monospace`;
              ctx.textAlign = "center";
              ctx.fillText(show(ch), x + size / 2, y + size * 0.68);
            }
          }
        }
        ctx.lineWidth = 1;
        // the keypad, with each symbol's best colour so far
        const best = new Map<string, number>();
        s.guesses.forEach((g, r) => [...g].forEach((ch, k) => best.set(ch, Math.max(best.get(ch) ?? -1, s.marks[r][k]))));
        KEYS.forEach((row, r) =>
          row.forEach((key, k) => {
            const b = keyBox(r, k);
            const m = best.get(key);
            ctx.fillStyle = key === "enter" ? "#1971c2" : key === "del" ? "#495057" : m === undefined ? "#868e96" : m === 0 ? "#343a40" : MARK_COLOURS[m];
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = "#f8f9fa";
            ctx.font = "bold 17px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(key === "enter" ? "↵" : key === "del" ? "⌫" : show(key), b.x + b.w / 2, b.y + 32);
          }),
        );
        if (flash.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(flash.current.text).width + 20;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(W / 2 - tw / 2, 10, tw, 26);
          ctx.fillStyle = "#c92a2a";
          ctx.fillText(flash.current.text, W / 2, 28);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (safeRef.current?.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    KEYS.forEach((row, ri) =>
      row.forEach((key, k) => {
        const b = keyBox(ri, k);
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          setTouched(true);
          input.current.push(key);
        }
      }),
    );
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const k = e.key === "Backspace" ? "del" : e.key === "Enter" ? "enter" : e.key === "x" || e.key === "X" ? "*" : e.key === "÷" ? "/" : e.key;
    if (!["del", "enter", ...KEYS[0], "+", "-", "*", "/", "="].includes(k)) return;
    e.preventDefault();
    setTouched(true);
    input.current.push(k);
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
      data-game="formula-lock"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.symbols, st.length)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{over.won ? fill(c.result, over.tries) : fill(c.answer, [...st.answer].map(show).join(""))}</p>
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
