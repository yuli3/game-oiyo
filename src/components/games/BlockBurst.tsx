import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { getBest, recordAchievementEvent, recordBest } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { BLOCK_BURST_FX, BLOCK_BURST_SPRITES } from "../../lib/games/sprites";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
import {
  COLS,
  ROWS,
  createBlockBurst,
  ghostPiece,
  gravityMs,
  parseBurst,
  pieceCells,
  serializeBurst,
  settleLock,
  softDrop,
  spawnBurstPiece,
  tryMove,
  tryRotate,
  type BurstColor,
  type BurstState,
  type BurstWave,
  type Cell,
} from "../../lib/games/block-burst";

const SAVE = "oiyo:block-burst-state:v1";
const GAME = "block-burst";
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const COPY = {
  ko: {
    title: "블록 버스트",
    sub: "라인 브레이커",
    start: "낙하 시작",
    score: "점수",
    best: "최고",
    combo: "연쇄",
    level: "레벨",
    next: "다음",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    over: "보드가 가득 찼습니다",
    again: "다시 하기",
    hint: "가로 줄이나 세로 줄을 꽉 채우면 폭발합니다. 스와이프·버튼·방향키.",
    restored: "저장된 판을 이어서 불러왔어요",
    rotate: "회전",
    drop: "하드 드롭",
    left: "왼쪽",
    right: "오른쪽",
    down: "내리기",
  },
  en: {
    title: "Block Burst",
    sub: "Line Breaker",
    start: "Start drop",
    score: "Score",
    best: "Best",
    combo: "Chain",
    level: "Level",
    next: "Next",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    over: "The board is full",
    again: "Play again",
    hint: "Fill a whole row or column to detonate it. Swipe, buttons, or arrow keys.",
    restored: "Your saved board was restored",
    rotate: "Rotate",
    drop: "Hard drop",
    left: "Left",
    right: "Right",
    down: "Soft drop",
  },
  ja: {
    title: "ブロックバースト",
    sub: "ラインブレイカー",
    start: "落下スタート",
    score: "スコア",
    best: "ベスト",
    combo: "連鎖",
    level: "レベル",
    next: "ネクスト",
    pause: "一時停止",
    resume: "続ける",
    sound: "サウンド",
    over: "盤面がいっぱいになりました",
    again: "もう一度",
    hint: "横一列または縦一列を埋めると爆発します。スワイプ・ボタン・矢印キー。",
    restored: "保存した盤面を復元しました",
    rotate: "回転",
    drop: "ハードドロップ",
    left: "左",
    right: "右",
    down: "ソフトドロップ",
  },
  zh: {
    title: "方块爆裂",
    sub: "行列爆破",
    start: "开始下落",
    score: "分数",
    best: "最高",
    combo: "连锁",
    level: "等级",
    next: "下一个",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    over: "棋盘已满",
    again: "再玩一次",
    hint: "填满一整行或一整列就会爆炸。滑动、按钮或方向键。",
    restored: "已恢复保存的棋盘",
    rotate: "旋转",
    drop: "硬降",
    left: "左",
    right: "右",
    down: "软降",
  },
  fr: {
    title: "Block Burst",
    sub: "Briseur de lignes",
    start: "Lancer la chute",
    score: "Score",
    best: "Record",
    combo: "Chaîne",
    level: "Niveau",
    next: "Suivant",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    over: "Le plateau est plein",
    again: "Rejouer",
    hint: "Remplissez une ligne ou une colonne entière pour la faire exploser.",
    restored: "Votre plateau a été restauré",
    rotate: "Rotation",
    drop: "Chute dure",
    left: "Gauche",
    right: "Droite",
    down: "Chute douce",
  },
  es: {
    title: "Block Burst",
    sub: "Rompelíneas",
    start: "Empezar caída",
    score: "Puntos",
    best: "Récord",
    combo: "Cadena",
    level: "Nivel",
    next: "Siguiente",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    over: "El tablero está lleno",
    again: "Jugar otra vez",
    hint: "Llena una fila o columna entera para detonarla. Desliza, botones o flechas.",
    restored: "Se restauró tu tablero",
    rotate: "Girar",
    drop: "Caída dura",
    left: "Izquierda",
    right: "Derecha",
    down: "Caída suave",
  },
} as const;

const GEMS: Record<BurstColor, { fill: string; glow: string; shine: string }> = {
  1: { fill: "#6f8f3a", glow: "rgba(132, 176, 58, 0.55)", shine: "#d7e48a" },
  2: { fill: "#d97706", glow: "rgba(251, 191, 36, 0.5)", shine: "#fde68a" },
  3: { fill: "#dc4c3c", glow: "rgba(248, 113, 113, 0.5)", shine: "#fecaca" },
  4: { fill: "#0f9aa8", glow: "rgba(45, 212, 191, 0.5)", shine: "#99f6e4" },
  5: { fill: "#c6a15b", glow: "rgba(250, 204, 21, 0.45)", shine: "#fef3c7" },
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

function Gem({ color, ghost, bursting }: { color: BurstColor; ghost?: boolean; bursting?: boolean }) {
  const gem = GEMS[color];
  return (
    <div
      className={`relative h-full w-full ${bursting ? "scale-110 animate-pulse" : ""}`}
      style={{ filter: ghost ? "none" : `drop-shadow(0 0 8px ${gem.glow})`, opacity: ghost ? 0.38 : 1 }}
    >
      <img
        src={BLOCK_BURST_SPRITES[color]}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
      />
      {bursting ? (
        <img
          src={BLOCK_BURST_FX.burst}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-[-18%] h-[136%] w-[136%] object-contain"
        />
      ) : null}
    </div>
  );
}

export default function BlockBurst({ locale = "ko" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"briefing" | "playing" | "paused" | "over">("briefing");
  const [game, setGame] = useState<BurstState>(() => createBlockBurst(1));
  const [best, setBest] = useState(0);
  const [sound, setSound] = useState(true);
  const [restored, setRestored] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [bursting, setBursting] = useState<Cell[]>([]);
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [flashCols, setFlashCols] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const [banner, setBanner] = useState("");
  const [gainPop, setGainPop] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const phaseRef = useRef(phase);
  const gameRef = useRef(game);
  const resolvingRef = useRef(false);
  const runRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  phaseRef.current = phase;
  gameRef.current = game;
  resolvingRef.current = resolving;

  const tone = useCallback((freq: number, dur = 0.12) => {
    if (!sound) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }, [sound]);

  const burstFx = useCallback((cells: Cell[], colors: BurstColor[]) => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board || reducedMotion) return;
    const rect = board.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const color = GEMS[colors[i] ?? 1];
      for (let n = 0; n < 14; n++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;
        particles.current.push({
          x: (cell.c + 0.5) * cellW,
          y: (cell.r + 0.5) * cellH,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          life: 1,
          color: n % 2 ? color.shine : color.fill,
          size: 2 + Math.random() * 4,
        });
      }
    }
    setShake(cells.length > COLS ? 10 : 6);
    window.setTimeout(() => setShake(0), reducedMotion ? 40 : 180);
  }, [reducedMotion]);

  useEffect(() => {
    const existing = getBest(GAME);
    if (existing) setBest(existing.value);
    const saved = parseBurst(typeof localStorage === "undefined" ? null : localStorage.getItem(SAVE));
    if (saved && saved.status === "playing") {
      setGame(saved);
      setRestored(true);
      setPhase("paused");
    }
  }, []);

  useEffect(() => {
    if (phase === "playing") localStorage.setItem(SAVE, serializeBurst(game));
    if (phase === "over") localStorage.removeItem(SAVE);
  }, [phase, game]);

  useEffect(() => {
    const hide = () => { if (document.hidden && phaseRef.current === "playing") setPhase("paused"); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dt = 0.016;
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.life -= dt * 1.6;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      void t;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const start = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    runRef.current += 1;
    setGame(createBlockBurst(seed));
    setPhase("playing");
    setRestored(false);
    setResolving(false);
    setBursting([]);
    setFlashCols([]);
    setFlashRows([]);
    setBanner("");
    setGainPop(0);
    tone(520, 0.16);
  };

  const finish = useCallback((next: BurstState) => {
    setGame(next);
    if (next.status !== "over") return;
    setPhase("over");
    recordAchievementEvent(GAME, "played");
    if (next.score > 0) {
      const saved = recordBest(GAME, next.score, "score");
      setBest(saved.value);
    }
    tone(140, 0.28);
  }, [tone]);

  const playWaves = useCallback(async (base: BurstState, waves: BurstWave[], merged: (BurstColor | null)[][], gain: number) => {
    const run = ++runRef.current;
    setResolving(true);
    setGame({ ...base, active: null, board: merged });
    const burstMs = reducedMotion ? 50 : 220;
    const fallMs = reducedMotion ? 60 : 240;
    for (let i = 0; i < waves.length; i++) {
      if (run !== runRef.current) return;
      const wave = waves[i];
      setBursting(wave.clear.cells);
      setFlashRows(wave.clear.rows);
      setFlashCols(wave.clear.cols);
      setGame((g) => ({ ...g, board: wave.before, combo: i + 1 }));
      const colors = wave.clear.cells.map((cell) => wave.before[cell.r][cell.c] ?? 1);
      burstFx(wave.clear.cells, colors);
      setBanner(i === 0 && wave.clear.rows.length && wave.clear.cols.length ? "CROSS" : i >= 2 ? `CHAIN x${i + 1}` : wave.clear.cols.length ? "COLUMN" : "LINE");
      tone(Math.min(980, 360 + i * 90), 0.14);
      await wait(burstMs);
      if (run !== runRef.current) return;
      setBursting([]);
      setGame((g) => ({ ...g, board: wave.after }));
      await wait(fallMs);
    }
    if (run !== runRef.current) return;
    setFlashCols([]);
    setFlashRows([]);
    setBanner("");
    setGainPop(gain);
    window.setTimeout(() => setGainPop(0), 700);
    const spawned = spawnBurstPiece(base);
    setResolving(false);
    finish(spawned);
  }, [burstFx, finish, reducedMotion, tone]);

  const lockNow = useCallback(async (state: BurstState) => {
    if (resolvingRef.current || state.status !== "playing" || !state.active) return;
    const settled = settleLock(state);
    if (settled.wavesDetail.length === 0) {
      finish(spawnBurstPiece(settled.state));
      tone(240);
      return;
    }
    await playWaves(settled.state, settled.wavesDetail, settled.merged, settled.gain);
  }, [finish, playWaves, tone]);

  const apply = useCallback((next: BurstState) => {
    if (next === gameRef.current) return false;
    setGame(next);
    return true;
  }, []);

  const move = useCallback((dr: number, dc: number) => {
    if (phaseRef.current !== "playing" || resolvingRef.current) return;
    const next = tryMove(gameRef.current, dr, dc);
    if (apply(next)) tone(dc === 0 ? 190 : 260, 0.05);
  }, [apply, tone]);

  const rotate = useCallback(() => {
    if (phaseRef.current !== "playing" || resolvingRef.current) return;
    const next = tryRotate(gameRef.current);
    if (apply(next)) tone(410, 0.07);
  }, [apply, tone]);

  const dropSoft = useCallback(() => {
    if (phaseRef.current !== "playing" || resolvingRef.current) return;
    const next = softDrop(gameRef.current);
    if (!apply(next)) void lockNow(gameRef.current);
    else tone(210, 0.04);
  }, [apply, lockNow, tone]);

  const dropHard = useCallback(() => {
    if (phaseRef.current !== "playing" || resolvingRef.current) return;
    let current = gameRef.current;
    if (!current.active) return;
    while (true) {
      const next = tryMove(current, 1, 0);
      if (next === current) break;
      current = { ...next, score: next.score + 2 };
    }
    setGame(current);
    void lockNow(current);
    tone(640, 0.1);
  }, [lockNow, tone]);

  useEffect(() => {
    if (phase !== "playing" || resolving) return;
    const id = window.setInterval(() => {
      const current = gameRef.current;
      const next = tryMove(current, 1, 0);
      if (next !== current) {
        setGame(next);
        return;
      }
      void lockNow(current);
    }, gravityMs(game.level));
    return () => window.clearInterval(id);
  }, [phase, resolving, game.level, lockNow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === "briefing" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        start();
        return;
      }
      if (phaseRef.current !== "playing") return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Enter"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") move(0, -1);
      if (e.key === "ArrowRight") move(0, 1);
      if (e.key === "ArrowDown") dropSoft();
      if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") rotate();
      if (e.key === " " || e.key === "Enter") dropHard();
      if (e.key === "p" || e.key === "P") setPhase((p) => (p === "playing" ? "paused" : "playing"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = (e: React.PointerEvent) => {
    touchRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const startPt = touchRef.current;
    touchRef.current = null;
    if (!startPt || phase !== "playing") return;
    const dx = e.clientX - startPt.x;
    const dy = e.clientY - startPt.y;
    const dt = performance.now() - startPt.t;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 220) {
      rotate();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else if (dy > 28 && dt < 180) dropHard();
    else if (dy > 18) dropSoft();
    else rotate();
  };

  const display = game.board.map((row) => [...row]);
  const ghost = phase === "playing" ? ghostPiece(game) : null;
  if (ghost && game.active) {
    for (const cell of pieceCells(ghost)) {
      if (cell.r >= 0 && cell.r < ROWS) display[cell.r][cell.c] = display[cell.r][cell.c] ?? game.active.color;
    }
  }
  const ghostSet = new Set(ghost && game.active ? pieceCells(ghost).map((c) => `${c.r}:${c.c}`) : []);
  const liveSet = new Set(game.active ? pieceCells(game.active).map((c) => `${c.r}:${c.c}`) : []);
  if (game.active) {
    for (const cell of pieceCells(game.active)) {
      if (cell.r >= 0 && cell.r < ROWS) display[cell.r][cell.c] = game.active.color;
    }
  }
  const burstingSet = new Set(bursting.map((c) => `${c.r}:${c.c}`));

  const btn = "min-h-11 min-w-11 rounded-xl border border-border bg-muted px-3 text-sm font-black text-foreground shadow-sm active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  if (phase === "briefing") {
    return (
      <GameContainer title={t.title} subtitle={t.sub}>
        <div className="mb-5 flex justify-center gap-2">
          {([1, 2, 3, 4, 5] as BurstColor[]).map((color) => (
            <div key={color} className="h-12 w-12">
              <Gem color={color} />
            </div>
          ))}
        </div>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t.hint}</p>
        <button type="button" onClick={start} className={`${btn} w-full bg-primary text-primary-foreground`}>
          {t.start}
        </button>
      </GameContainer>
    );
  }

  return (
    <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.again} onReset={start}>
      <div aria-live="polite" className="sr-only">{banner || (phase === "over" ? t.over : "")}</div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <div className="rounded-xl border border-border bg-card px-2 py-2"><div>{t.score}</div><div className="text-lg text-foreground">{game.score}</div></div>
        <div className="rounded-xl border border-border bg-card px-2 py-2"><div>{t.best}</div><div className="text-lg text-foreground">{Math.max(best, game.score)}</div></div>
        <div className="rounded-xl border border-border bg-card px-2 py-2"><div>{t.level}</div><div className="text-lg text-foreground">{game.level}</div></div>
      </div>
      {restored && phase === "paused" ? <p className="mb-2 text-xs font-semibold text-primary">{t.restored}</p> : null}
      <div className="flex items-start gap-3">
        <div
          ref={boardRef}
          className="relative flex-1 touch-none overflow-hidden rounded-[1.4rem] border border-[#cfc6a8] bg-[radial-gradient(circle_at_top,#f7f1dc,rgba(232,223,186,0.95)_58%,#d7ccab)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_40px_rgba(80,70,30,0.16)]"
          style={{ transform: shake ? `translate(${shake % 2 ? -6 : 6}px, ${shake > 7 ? 4 : 0}px)` : undefined }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="grid aspect-[8/10] w-full gap-[3px]" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
            {display.flatMap((row, r) =>
              row.map((cell, c) => {
                const key = `${r}:${c}`;
                const flashing = flashRows.includes(r) || flashCols.includes(c);
                return (
                  <div key={key} className={`relative rounded-[22%] bg-[#efe6c8]/70 ${flashing ? "ring-2 ring-amber-300" : ""}`}>
                    {cell ? <Gem color={cell} ghost={ghostSet.has(key) && !liveSet.has(key)} bursting={burstingSet.has(key)} /> : null}
                  </div>
                );
              }),
            )}
          </div>
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {banner ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-foreground/85 px-4 py-1.5 text-sm font-black tracking-[0.2em] text-primary-foreground shadow-lg">
                {banner}
              </span>
            </div>
          ) : null}
          {gainPop > 0 ? (
            <div className="pointer-events-none absolute right-3 top-3 text-sm font-black text-amber-700">+{gainPop}</div>
          ) : null}
          {phase === "paused" || phase === "over" ? (
            <div className="absolute inset-0 grid place-items-center bg-[#f7f1dc]/80 backdrop-blur-[2px]">
              <div className="text-center">
                <p className="mb-3 text-lg font-black text-foreground">{phase === "over" ? t.over : t.pause}</p>
                <button type="button" className={`${btn} bg-primary text-primary-foreground`} onClick={() => (phase === "over" ? start() : setPhase("playing"))}>
                  {phase === "over" ? t.again : t.resume}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex w-[4.5rem] flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.next}</div>
          {game.queue.map((piece, i) => (
            <div key={`${piece.shape}-${i}`} className="grid aspect-square grid-cols-4 gap-0.5 rounded-xl border border-border bg-card p-1">
              {Array.from({ length: 16 }, (_, n) => {
                const r = Math.floor(n / 4);
                const c = n % 4;
                const on = pieceCells({ ...piece, x: 0, y: 0 }).some((cell) => cell.r === r && cell.c === c);
                return <div key={n}>{on ? <Gem color={piece.color} /> : <div className="h-full w-full" />}</div>;
              })}
            </div>
          ))}
          {game.combo > 1 ? <div className="text-center text-[11px] font-black text-amber-700">{t.combo} {game.combo}</div> : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <button type="button" className={btn} onClick={() => move(0, -1)} aria-label={t.left}>←</button>
        <button type="button" className={btn} onClick={rotate} aria-label={t.rotate}>⟳</button>
        <button type="button" className={btn} onClick={() => move(0, 1)} aria-label={t.right}>→</button>
        <button type="button" className={btn} onClick={dropHard} aria-label={t.drop}>⬇</button>
        <button type="button" className={`${btn} col-span-2`} onClick={dropSoft}>{t.down}</button>
        <button type="button" className={btn} onClick={() => setPhase((p) => (p === "paused" ? "playing" : "paused"))}>{phase === "paused" ? t.resume : t.pause}</button>
        <button type="button" className={btn} onClick={() => setSound((v) => !v)} aria-pressed={sound}>{t.sound}</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.hint}</p>
    </GameContainer>
  );
}
