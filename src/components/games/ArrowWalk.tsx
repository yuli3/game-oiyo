"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import PixelImg from "../ui/game/PixelImg";
import { PATH_ARROW, PATH_STAR, PATH_STONE, PATH_STONE_LIT } from "../../lib/games/pixel-sprites";
import { celebrate } from "../../lib/games/celebration";
import { loadHighScore, saveHighScore } from "../../lib/games/game-save";
import { dailySeed } from "../../lib/games/number-trail";
import { createWalk, hintCell, isSolved, rotate, traceWalk, type Dir, type WalkLevel } from "../../lib/games/arrow-walk";

const COPY = {
  en: { title: "Arrow Walk", sub: "One walk through every cell", rules: "Start on the ▶ cell and follow the arrows. Turn the arrows so the walk visits every cell exactly once and stops on the ★ goal. Grey arrows are fixed.", tap: "Tap an arrow to turn it clockwise.", daily: "Daily", random: "New puzzle", easy: "Easy", medium: "Medium", hard: "Hard", covered: "Covered", hint: "Hint", hints: "hints", edge: "The walk runs off the board.", loop: "The walk runs into a cell it already used.", goalEarly: "You reach the goal, but some cells are left out.", solved: "Solved!", solvedCount: "Solved", restart: "New puzzle" },
  ko: { title: "애로 워크", sub: "모든 칸을 한 번에 걷기", rules: "▶ 칸에서 출발해 화살표를 따라가요. 화살표를 돌려서 모든 칸을 한 번씩만 지나 ★ 칸에서 멈추게 하세요. 회색 화살표는 고정이에요.", tap: "화살표를 누르면 시계 방향으로 돌아가요.", daily: "오늘의 퍼즐", random: "새 퍼즐", easy: "쉬움", medium: "보통", hard: "어려움", covered: "지난 칸", hint: "힌트", hints: "힌트", edge: "길이 판 밖으로 나가요.", loop: "이미 지난 칸으로 다시 들어가요.", goalEarly: "★에 닿았지만 안 지난 칸이 남았어요.", solved: "성공!", solvedCount: "푼 퍼즐", restart: "새 퍼즐" },
  ja: { title: "アローウォーク", sub: "全マスを一筆で歩く", rules: "▶のマスから矢印に従って進みます。矢印を回して、すべてのマスを1回ずつ通り★で止まるようにしましょう。灰色の矢印は固定です。", tap: "矢印をタップすると時計回りに回ります。", daily: "今日のパズル", random: "新しいパズル", easy: "やさしい", medium: "ふつう", hard: "むずかしい", covered: "通過", hint: "ヒント", hints: "ヒント", edge: "盤の外に出てしまいます。", loop: "通ったマスに戻ってしまいます。", goalEarly: "★に着きましたが通っていないマスがあります。", solved: "クリア！", solvedCount: "クリア数", restart: "新しいパズル" },
  zh: { title: "箭头漫步", sub: "一笔走遍所有格子", rules: "从 ▶ 格出发沿箭头前进。旋转箭头，让路线恰好经过每个格子一次并停在 ★。灰色箭头固定不动。", tap: "点击箭头顺时针旋转。", daily: "每日谜题", random: "新谜题", easy: "简单", medium: "普通", hard: "困难", covered: "已走", hint: "提示", hints: "提示", edge: "路线走出了棋盘。", loop: "路线回到了走过的格子。", goalEarly: "到达 ★ 了，但还有格子没走到。", solved: "完成！", solvedCount: "已解", restart: "新谜题" },
  fr: { title: "Arrow Walk", sub: "Une marche par toutes les cases", rules: "Partez de la case ▶ et suivez les flèches. Tournez-les pour que la marche passe une seule fois par chaque case et s'arrête sur l'étoile ★. Les flèches grises sont fixes.", tap: "Touchez une flèche pour la tourner dans le sens horaire.", daily: "Du jour", random: "Nouveau", easy: "Facile", medium: "Moyen", hard: "Difficile", covered: "Parcourues", hint: "Indice", hints: "indices", edge: "La marche sort du plateau.", loop: "La marche revient sur une case déjà vue.", goalEarly: "L'étoile est atteinte, mais des cases restent.", solved: "Résolu !", solvedCount: "Résolus", restart: "Nouveau" },
  es: { title: "Arrow Walk", sub: "Un paseo por todas las casillas", rules: "Sal de la casilla ▶ y sigue las flechas. Gíralas para que el paseo pase una sola vez por cada casilla y termine en la estrella ★. Las flechas grises son fijas.", tap: "Toca una flecha para girarla en sentido horario.", daily: "Diario", random: "Nuevo", easy: "Fácil", medium: "Medio", hard: "Difícil", covered: "Recorridas", hint: "Pista", hints: "pistas", edge: "El paseo se sale del tablero.", loop: "El paseo vuelve a una casilla ya usada.", goalEarly: "Llegas a la estrella, pero faltan casillas.", solved: "¡Resuelto!", solvedCount: "Resueltos", restart: "Nuevo" },
};
type Loc = keyof typeof COPY;
const COLS: Record<number, string> = { 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7" };
const LEVELS: WalkLevel[] = ["easy", "medium", "hard"];
const ROT = ["rotate-0", "rotate-90", "rotate-180", "-rotate-90"];

export default function ArrowWalk({ locale = "en" }: { locale?: string }) {
  const t = COPY[(locale as Loc) in COPY ? (locale as Loc) : "en"];
  const [level, setLevel] = useState<WalkLevel>("easy");
  const [mode, setMode] = useState<"daily" | "random">("daily");
  const [seed, setSeed] = useState<number>(() => dailySeed(new Date()));
  const puzzle = useMemo(() => createWalk(level, seed), [level, seed]);
  const [arrows, setArrows] = useState<Dir[]>(puzzle.arrows);
  const [hintAt, setHintAt] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solvedTotal, setSolvedTotal] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const scored = useRef("");

  useEffect(() => setSolvedTotal(loadHighScore("arrow-walk", 0)), []);
  useEffect(() => {
    setArrows(puzzle.arrows);
    setHintAt(null);
    setHintsUsed(0);
  }, [puzzle]);

  const trace = traceWalk(puzzle, arrows);
  const solved = isSolved(puzzle, arrows);
  const onTrace = new Map(trace.cells.map((c, i) => [c, i]));
  const total = puzzle.size * puzzle.size;

  useEffect(() => {
    if (!solved) return;
    const key = `${level}:${seed}`;
    if (scored.current === key) return;
    scored.current = key;
    const next = solvedTotal + 1;
    saveHighScore("arrow-walk", next);
    setSolvedTotal(next);
    window.dispatchEvent(new CustomEvent("oiyo:game-score", { detail: { slug: "arrow-walk", score: next } }));
    celebrate(boardRef.current, { preset: "stardust", label: hintsUsed === 0 ? "NO HINTS" : undefined });
  }, [solved, level, seed, solvedTotal, hintsUsed]);

  const onTap = (cell: number) => {
    if (solved || puzzle.locked[cell]) return;
    setArrows((a) => rotate(puzzle, a, cell));
    if (hintAt === cell) setHintAt(null);
  };
  const onHint = () => {
    const c = hintCell(puzzle, arrows);
    if (c === null) return;
    setHintAt(c);
    setHintsUsed((n) => n + 1);
  };
  const newRandom = () => {
    setMode("random");
    setSeed(Math.floor(Math.random() * 1e9));
  };
  const toDaily = () => {
    setMode("daily");
    setSeed(dailySeed(new Date()));
  };
  const message = solved ? t.solved : trace.end === "edge" ? t.edge : trace.end === "loop" ? t.loop : trace.end === "goal" ? t.goalEarly : t.tap;

  return (
    <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.restart} onReset={newRandom}>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{t.rules}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${level === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground"}`}>
            {t[l]}
          </button>
        ))}
        <button type="button" onClick={toDaily} aria-pressed={mode === "daily"} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${mode === "daily" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
          {t.daily}
        </button>
      </div>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground">{t.covered}</span>
        <span className="font-mono text-2xl font-black text-foreground">{trace.cells.length} / {total}</span>
      </div>
      <div ref={boardRef} className="mx-auto w-full max-w-md">
        <div className={`grid gap-0 overflow-hidden rounded-xl border-4 border-border ${COLS[puzzle.size]}`} role="grid" aria-label={t.title}>
          {arrows.map((d, i) => {
            const step = onTrace.get(i);
            const isStart = i === puzzle.start;
            const isGoal = i === puzzle.goal;
            const locked = puzzle.locked[i] && !isGoal;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTap(i)}
                disabled={isGoal}
                aria-label={`${isStart ? "start, " : ""}${isGoal ? "goal" : ["up", "right", "down", "left"][d]}${locked ? ", fixed" : ""}${step !== undefined ? `, step ${step + 1}` : ""}`}
                className={`relative flex aspect-square min-h-11 items-center justify-center text-2xl font-black text-foreground sm:text-3xl ${
                  hintAt === i ? "ring-4 ring-inset ring-destructive" : ""
                } ${locked ? "opacity-70" : ""}`}
              >
                <PixelImg art={solved || step !== undefined ? PATH_STONE_LIT : PATH_STONE} className="pointer-events-none absolute inset-0 size-full" />
                {isGoal ? (
                  <PixelImg art={PATH_STAR} className="pointer-events-none relative size-3/5" />
                ) : (
                  <span aria-hidden="true" className={`relative inline-flex size-3/5 transition-transform motion-reduce:transition-none ${ROT[d]}`}>
                    <PixelImg art={PATH_ARROW} className="size-full" />
                  </span>
                )}
                {isStart && <span className="absolute left-1 top-0.5 text-xs text-primary-foreground" aria-hidden="true">▶</span>}
                {step !== undefined && !solved && <span className="absolute bottom-0.5 right-1 rounded bg-foreground px-1 font-mono text-xs text-background" aria-hidden="true">{step + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <p role="status" aria-live="polite" className={`mt-4 min-h-12 text-center text-sm font-semibold ${solved ? "text-primary" : "text-muted-foreground"}`}>{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onHint} disabled={solved} className="min-h-11 rounded-xl border border-border bg-muted px-4 text-sm font-bold text-foreground">{t.hint}{hintsUsed > 0 ? ` (${hintsUsed})` : ""}</button>
        <button type="button" onClick={newRandom} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{t.random}</button>
        <span className="text-xs font-semibold text-muted-foreground">{t.solvedCount}: {solvedTotal}</span>
      </div>
    </GameContainer>
  );
}
