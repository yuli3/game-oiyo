"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import PixelImg from "../ui/game/PixelImg";
import { PATH_STONE, PATH_STONE_LIT } from "../../lib/games/pixel-sprites";
import { celebrate } from "../../lib/games/celebration";
import { loadHighScore, saveHighScore } from "../../lib/games/game-save";
import { createTrail, dailySeed, dragTo, pathSum, tapCell, trailStage, trailStatus, TRAIL_STAGES, type TrailLevel, type TrailPuzzle } from "../../lib/games/number-trail";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import StageBar from "./StageBar";
import PathOverlay from "./PathOverlay";

const COPY = {
  en: { title: "Number Trail", sub: "Add up to the target", rules: "Start at the top-left cell and walk to the bottom-right one through side-by-side cells. Don't reuse a cell. The numbers you pass must add up to exactly the target.", tapHelp: "Drag across the cells, or tap a neighbouring cell to step. Tap the last cell to step back, or an earlier one to cut back to it.", target: "Target", sum: "Your sum", steps: "Cells", par: "par", daily: "Daily", random: "New puzzle", easy: "Easy", medium: "Medium", hard: "Hard", over: "Too high. Step back.", short: "You reached the end but the sum is short.", solved: "Solved!", solvedPar: "Solved on par!", solvedCount: "Solved", clear: "Clear path", restart: "New puzzle", stages: "Stages", next: "Next stage" },
  ko: { title: "넘버 트레일", sub: "목표 합 맞추기", rules: "왼쪽 위 칸에서 출발해 오른쪽 아래 칸까지 상하좌우로 이어진 칸을 따라 걸어가세요. 같은 칸은 두 번 못 지나요. 지나간 숫자의 합이 목표와 정확히 같아야 해요.", tapHelp: "칸 위로 손가락을 끌거나 옆 칸을 눌러 나아가요. 마지막 칸을 누르면 한 칸 물러나고, 앞쪽 칸을 누르면 거기까지 되돌아가요.", target: "목표", sum: "현재 합", steps: "칸 수", par: "기준", daily: "오늘의 퍼즐", random: "새 퍼즐", easy: "쉬움", medium: "보통", hard: "어려움", over: "합이 넘쳤어요. 물러나 보세요.", short: "끝에 닿았지만 합이 모자라요.", solved: "성공!", solvedPar: "기준 칸 수로 성공!", solvedCount: "푼 퍼즐", clear: "길 지우기", restart: "새 퍼즐", stages: "단계 도전", next: "다음 단계" },
  ja: { title: "ナンバートレイル", sub: "合計を目標に合わせる", rules: "左上のマスから右下のマスまで、上下左右に隣り合うマスをたどって進みます。同じマスは2回通れません。通った数字の合計を目標とぴったり同じにしましょう。", tapHelp: "隣のマスをタップで前進。最後のマスをタップで1歩戻り、前のマスをタップでそこまで戻ります。", target: "目標", sum: "合計", steps: "マス数", par: "基準", daily: "今日のパズル", random: "新しいパズル", easy: "やさしい", medium: "ふつう", hard: "むずかしい", over: "合計が多すぎます。戻りましょう。", short: "ゴールに着きましたが合計が足りません。", solved: "クリア！", solvedPar: "基準マス数でクリア！", solvedCount: "クリア数", clear: "道を消す", restart: "新しいパズル", stages: "ステージ", next: "次のステージ" },
  zh: { title: "数字小径", sub: "凑出目标和", rules: "从左上角格子出发，沿上下左右相邻的格子走到右下角。同一格不能走两次。经过的数字之和必须正好等于目标。", tapHelp: "点相邻格子前进一步。点最后一格后退一步，点前面的格子退回到那里。", target: "目标", sum: "当前和", steps: "格数", par: "标准", daily: "每日谜题", random: "新谜题", easy: "简单", medium: "普通", hard: "困难", over: "超过了，后退试试。", short: "到终点了但和还不够。", solved: "完成！", solvedPar: "以标准格数完成！", solvedCount: "已解", clear: "清除路径", restart: "新谜题", stages: "闯关", next: "下一关" },
  fr: { title: "Number Trail", sub: "Atteignez la somme cible", rules: "Partez de la case en haut à gauche et marchez jusqu'à celle en bas à droite par des cases voisines. Pas deux fois la même case. Les nombres traversés doivent faire exactement la cible.", tapHelp: "Touchez une case voisine pour avancer. Touchez la dernière case pour reculer, ou une case antérieure pour revenir jusqu'à elle.", target: "Cible", sum: "Votre somme", steps: "Cases", par: "par", daily: "Du jour", random: "Nouveau", easy: "Facile", medium: "Moyen", hard: "Difficile", over: "Trop haut. Reculez.", short: "Arrivé, mais la somme est trop basse.", solved: "Résolu !", solvedPar: "Résolu au par !", solvedCount: "Résolus", clear: "Effacer", restart: "Nouveau", stages: "Niveaux", next: "Niveau suivant" },
  es: { title: "Number Trail", sub: "Suma exacta al objetivo", rules: "Sal de la casilla superior izquierda y camina hasta la inferior derecha por casillas vecinas. No repitas casillas. Los números que pises deben sumar exactamente el objetivo.", tapHelp: "Toca una casilla vecina para avanzar. Toca la última para retroceder o una anterior para volver hasta ella.", target: "Objetivo", sum: "Tu suma", steps: "Casillas", par: "par", daily: "Diario", random: "Nuevo", easy: "Fácil", medium: "Medio", hard: "Difícil", over: "Te pasaste. Retrocede.", short: "Llegaste, pero la suma no alcanza.", solved: "¡Resuelto!", solvedPar: "¡Resuelto en par!", solvedCount: "Resueltos", clear: "Borrar", restart: "Nuevo", stages: "Niveles", next: "Siguiente nivel" },
};
type Loc = keyof typeof COPY;
const COLS: Record<number, string> = { 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7" };
const LEVELS: TrailLevel[] = ["easy", "medium", "hard"];

export default function NumberTrail({ locale = "en" }: { locale?: string }) {
  const t = COPY[(locale as Loc) in COPY ? (locale as Loc) : "en"];
  const [level, setLevel] = useState<TrailLevel>("medium");
  const [mode, setMode] = useState<"stage" | "daily" | "random">("stage");
  const [seed, setSeed] = useState<number>(() => dailySeed(new Date()));
  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const spec = mode === "stage" ? trailStage(stage) : { level, seed };
  const puzzle = useMemo(() => createTrail(spec.level, spec.seed), [spec.level, spec.seed]);
  // The path is stored with its puzzle so a board switch never judges the old path.
  const [walk, setWalk] = useState<{ p: TrailPuzzle; path: number[] }>(() => ({ p: puzzle, path: [0] }));
  const path = walk.p === puzzle ? walk.path : [0];
  const setPath = (f: number[] | ((prev: number[]) => number[])) =>
    setWalk((w) => {
      const prev = w.p === puzzle ? w.path : [0];
      return { p: puzzle, path: typeof f === "function" ? f(prev) : f };
    });
  const dragging = useRef(false);
  const moved = useRef(false);
  const [solvedTotal, setSolvedTotal] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const status = trailStatus(puzzle, path);
  const sum = pathSum(puzzle, path);
  const scored = useRef<string>("");

  useEffect(() => {
    setSolvedTotal(loadHighScore("number-trail", 0));
    const done = loadClearedStages("number-trail", TRAIL_STAGES);
    setCleared(done);
    setStage(nextOpenStage(done, TRAIL_STAGES));
  }, []);

  useEffect(() => {
    if (status !== "solved") return;
    const key = `${mode}:${puzzle.level}:${puzzle.seed}`;
    if (scored.current === key) return;
    scored.current = key;
    if (mode === "stage") setCleared(markStageCleared("number-trail", stage, TRAIL_STAGES));
    const next = solvedTotal + 1;
    saveHighScore("number-trail", next);
    setSolvedTotal(next);
    window.dispatchEvent(new CustomEvent("oiyo:game-score", { detail: { slug: "number-trail", score: next } }));
    celebrate(boardRef.current, { preset: "stardust", label: path.length === puzzle.par ? "PAR" : undefined });
  }, [status, mode, stage, puzzle.level, puzzle.seed, solvedTotal, path.length, puzzle.par]);

  const onTap = (cell: number) => {
    if (status === "solved") return;
    setPath((p) => tapCell(puzzle, p, cell));
  };
  const newRandom = () => {
    setMode("random");
    setSeed(Math.floor(Math.random() * 1e9));
  };
  const toStages = () => {
    setMode("stage");
    setStage(nextOpenStage(cleared, TRAIL_STAGES));
  };
  const lastStage = stage >= TRAIL_STAGES - 1;
  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
    const n = el ? Number(el.dataset.cell) : NaN;
    return Number.isInteger(n) ? n : null;
  };
  const toDaily = () => {
    setMode("daily");
    setSeed(dailySeed(new Date()));
  };

  const inPath = new Map(path.map((c, i) => [c, i]));
  const end = path[path.length - 1];
  const message = status === "over" ? t.over : status === "short" ? t.short : status === "solved" ? (path.length === puzzle.par ? t.solvedPar : t.solved) : t.tapHelp;
  const goal = puzzle.size * puzzle.size - 1;

  return (
    <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.restart} onReset={newRandom}>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{t.rules}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={toStages} aria-pressed={mode === "stage"} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${mode === "stage" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground"}`}>
          {t.stages}
        </button>
        <button type="button" onClick={toDaily} aria-pressed={mode === "daily"} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${mode === "daily" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground"}`}>
          {t.daily}
        </button>
        {mode !== "stage" &&
          LEVELS.map((l) => (
            <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${level === l ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {t[l]}
            </button>
          ))}
      </div>
      {mode === "stage" && (
        <div className="mb-4">
          <StageBar count={TRAIL_STAGES} current={stage} cleared={cleared} locale={locale} onSelect={setStage} />
        </div>
      )}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-primary bg-primary/10 p-2">
          <p className="text-xs font-semibold text-muted-foreground">{t.target}</p>
          <p className="font-mono text-2xl font-black text-foreground">{puzzle.target}</p>
        </div>
        <div className={`rounded-xl border p-2 ${status === "over" ? "border-destructive bg-destructive/10" : "border-border bg-muted"}`}>
          <p className="text-xs font-semibold text-muted-foreground">{t.sum}</p>
          <p className="font-mono text-2xl font-black text-foreground">{sum}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-2">
          <p className="text-xs font-semibold text-muted-foreground">{t.steps}</p>
          <p className="font-mono text-2xl font-black text-foreground">{path.length}<span className="ml-1 text-xs font-semibold text-muted-foreground">/ {t.par} {puzzle.par}</span></p>
        </div>
      </div>
      <div ref={boardRef} className="mx-auto w-full max-w-md">
        <div className="relative overflow-hidden rounded-xl border-4 border-border">
        <PathOverlay size={puzzle.size} cells={path} tone={status === "solved" ? "solved" : status === "over" ? "blocked" : "normal"} />
        <div
          className={`grid gap-0 touch-none select-none ${COLS[puzzle.size]}`}
          role="grid"
          aria-label={t.title}
          onPointerDown={(e) => {
            const c = cellAt(e.clientX, e.clientY);
            if (c === null || status === "solved") return;
            dragging.current = true;
            moved.current = false;
            // Pressing the end cell starts a drag; it only steps back if released without moving.
            if (path.length > 0 && c === path[path.length - 1]) return;
            onTap(c);
          }}
          onPointerMove={(e) => {
            if (!dragging.current || status === "solved") return;
            if (e.pointerType === "mouse" && e.buttons === 0) { dragging.current = false; return; }
            const c = cellAt(e.clientX, e.clientY);
            if (c === null || c === path[path.length - 1]) return;
            moved.current = true;
            setPath((p) => dragTo(puzzle, p, c));
          }}
          onPointerUp={(e) => {
            if (dragging.current && !moved.current) {
              const c = cellAt(e.clientX, e.clientY);
              if (c !== null && c === path[path.length - 1]) onTap(c);
            }
            dragging.current = false;
          }}
          onPointerCancel={() => { dragging.current = false; }}
        >
          {puzzle.digits.map((d, i) => {
            const step = inPath.get(i);
            const on = step !== undefined;
            const isEnd = i === end;
            const label = i === 0 ? "start" : i === goal ? "goal" : "";
            return (
              <button
                key={i}
                type="button"
                data-cell={i}
                onClick={(e) => { if (e.detail === 0) onTap(i); }}
                aria-label={`${d}${label ? ` ${label}` : ""}${on ? ` step ${step! + 1}` : ""}`}
                className={`relative flex aspect-square min-h-11 items-center justify-center font-mono text-xl font-black text-foreground sm:text-2xl ${isEnd ? "ring-4 ring-inset ring-primary" : ""}`}
              >
                <PixelImg art={on ? PATH_STONE_LIT : PATH_STONE} className="pointer-events-none absolute inset-0 size-full" />
                <span className="relative">{d}</span>
                {(i === 0 || i === goal) && <span className="absolute right-1 top-0.5 text-xs" aria-hidden="true">{i === 0 ? "▶" : "★"}</span>}
              </button>
            );
          })}
        </div>
        </div>
      </div>
      <p role="status" aria-live="polite" className={`mt-4 min-h-12 text-center text-sm font-semibold ${status === "over" ? "text-destructive" : status === "solved" ? "text-primary" : "text-muted-foreground"}`}>{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => setPath([0])} className="min-h-11 rounded-xl border border-border bg-muted px-4 text-sm font-bold text-foreground">{t.clear}</button>
        {mode === "stage" && status === "solved" ? (
          <button type="button" onClick={() => setStage(lastStage ? 0 : stage + 1)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{lastStage ? finaleLabel(locale) : t.next}</button>
        ) : (
          <button type="button" onClick={newRandom} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{t.random}</button>
        )}
        <span className="text-xs font-semibold text-muted-foreground">{t.solvedCount}: {solvedTotal}</span>
      </div>
    </GameContainer>
  );
}
