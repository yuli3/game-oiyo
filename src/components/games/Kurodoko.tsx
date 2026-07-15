import React, { useCallback, useEffect, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { dayIndex, mulberry32, previousDayKey, shuffle, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';

// ─── Kurodoko (Where is Black Cells?) — Nikoli logic puzzle ──────────────────
// Shade cells black so each numbered cell sees exactly that many white cells
// (itself + straight lines until a black cell/edge). Black cells never touch
// orthogonally; all white cells stay connected. Ported from ahoxy-legacy.

type Cell = 0 | 1; // 0 = white, 1 = black
type Puzzle = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

// size / black-cell budget / clue count per difficulty.
// NOTE: the ahoxy-legacy hardcoded puzzles were unsolvable (exhaustive search
// found no rule-satisfying configuration), so puzzles are generated instead:
// build a valid black layout first, then derive clues from it — a solution is
// guaranteed by construction.
const DIFF: Record<Difficulty, { size: number; blacks: number; clues: number }> = {
    easy: { size: 5, blacks: 4, clues: 6 },
    medium: { size: 6, blacks: 6, clues: 7 },
    hard: { size: 7, blacks: 9, clues: 8 },
};

function whitesConnected(board: Cell[][]): boolean {
    const size = board.length;
    let start: [number, number] | null = null;
    let whiteCount = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (board[r][c] === 0) { whiteCount++; if (!start) start = [r, c]; }
    if (!start) return false;
    const visited = board.map((row) => row.map(() => false));
    const stack = [start];
    visited[start[0]][start[1]] = true;
    let seen = 1;
    while (stack.length) {
        const [r, c] = stack.pop()!;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && board[nr][nc] === 0) {
                visited[nr][nc] = true;
                seen++;
                stack.push([nr, nc]);
            }
        }
    }
    return seen === whiteCount;
}

function visibleWhites(board: Cell[][], r: number, c: number): number {
    const size = board.length;
    let seen = 1;
    for (let i = r - 1; i >= 0 && board[i][c] === 0; i--) seen++;
    for (let i = r + 1; i < size && board[i][c] === 0; i++) seen++;
    for (let j = c - 1; j >= 0 && board[r][j] === 0; j--) seen++;
    for (let j = c + 1; j < size && board[r][j] === 0; j++) seen++;
    return seen;
}

/** Generate a puzzle with a guaranteed solution. Returns clues + the generating solution.
 *  Pass a seeded rng (see lib/games/daily.ts) for a deterministic daily puzzle. */
export function generateKurodoko(difficulty: Difficulty, rng: () => number = Math.random): { puzzle: Puzzle; solution: Cell[][] } {
    const { size, blacks, clues } = DIFF[difficulty];
    const board: Cell[][] = Array.from({ length: size }, () => Array(size).fill(0) as Cell[]);

    // place blacks: keep no-adjacency + white connectivity invariants
    const order = shuffle(Array.from({ length: size * size }, (_, i) => i), rng);
    let placed = 0;
    for (const idx of order) {
        if (placed >= blacks) break;
        const r = Math.floor(idx / size), c = idx % size;
        if (board[r][c] === 1) continue;
        const touching = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            return nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1;
        });
        if (touching) continue;
        board[r][c] = 1;
        if (whitesConnected(board)) placed++;
        else board[r][c] = 0;
    }

    // derive clues from white cells (prefer informative ones: not the max view)
    const puzzle: Puzzle = Array.from({ length: size }, () => Array(size).fill(null));
    const whiteCells: [number, number][] = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (board[r][c] === 0) whiteCells.push([r, c]);
    let given = 0;
    for (const [r, c] of shuffle(whiteCells, rng)) {
        if (given >= clues) break;
        puzzle[r][c] = visibleWhites(board, r, c);
        given++;
    }

    return { puzzle, solution: board };
}

type Validation = { ok: boolean; complete: boolean; error: 'number' | 'adjacent' | 'disconnected' | null };

export function validateKurodoko(board: Cell[][], puzzle: Puzzle): Validation {
    const size = board.length;

    // numbered cells must see exactly N white cells (only fails when overshot impossible → check exact only for completeness; partial boards may undercount)
    let numbersExact = true;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const n = puzzle[r][c];
            if (n === null) continue;
            if (board[r][c] === 1) return { ok: false, complete: false, error: 'number' }; // numbered cell can't be black
            let seen = 1;
            for (let i = r - 1; i >= 0 && board[i][c] === 0; i--) seen++;
            for (let i = r + 1; i < size && board[i][c] === 0; i++) seen++;
            for (let j = c - 1; j >= 0 && board[r][j] === 0; j--) seen++;
            for (let j = c + 1; j < size && board[r][j] === 0; j++) seen++;
            if (seen < n) return { ok: false, complete: false, error: 'number' }; // over-shaded: can never recover
            if (seen !== n) numbersExact = false;
        }
    }

    // black cells must not touch orthogonally
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== 1) continue;
            if ((c + 1 < size && board[r][c + 1] === 1) || (r + 1 < size && board[r + 1][c] === 1)) {
                return { ok: false, complete: false, error: 'adjacent' };
            }
        }
    }

    // all white cells connected
    let start: [number, number] | null = null;
    for (let r = 0; r < size && !start; r++) for (let c = 0; c < size; c++) if (board[r][c] === 0) { start = [r, c]; break; }
    if (start) {
        const visited = board.map((row) => row.map(() => false));
        const stack = [start];
        visited[start[0]][start[1]] = true;
        while (stack.length) {
            const [r, c] = stack.pop()!;
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && board[nr][nc] === 0) {
                    visited[nr][nc] = true;
                    stack.push([nr, nc]);
                }
            }
        }
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            if (board[r][c] === 0 && !visited[r][c]) return { ok: false, complete: false, error: 'disconnected' };
        }
    }

    return { ok: true, complete: numbersExact, error: null };
}

const COPY = {
    ko: { title: '쿠로도코', subtitle: 'Nikoli Logic', desc: '숫자 칸에서 보이는 흰 칸 수(자신 포함)가 숫자와 같아지도록 검은 칸을 칠하세요. 검은 칸은 붙을 수 없고 흰 칸은 모두 연결돼야 합니다.', daily: '📅 오늘의 퍼즐', easy: '쉬움 5×5', medium: '보통 6×6', hard: '어려움 7×7', win: '완벽한 추리력입니다!', errNumber: '숫자 조건이 깨졌습니다', errAdjacent: '검은 칸이 붙어 있습니다', errDisconnected: '흰 칸이 끊겼습니다', moves: '이동', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓' },
    en: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Shade black cells so each number sees exactly that many white cells (itself included). Black cells never touch; whites stay connected.', daily: '📅 Daily Puzzle', easy: 'Easy 5×5', medium: 'Medium 6×6', hard: 'Hard 7×7', win: 'Flawless deduction!', errNumber: 'A number clue is broken', errAdjacent: 'Black cells are touching', errDisconnected: 'White cells are disconnected', moves: 'Moves', streak: 'Streak', best: 'Best', doneToday: 'Done today ✓' },
    ja: { title: 'クロドコ（黒どこ）', subtitle: 'Nikoli Logic', desc: '数字マスから見える白マスの数(自分含む)が数字と一致するよう黒マスを塗ります。黒マスは隣接不可、白マスは全て連結。', daily: '📅 今日のパズル', easy: 'かんたん 5×5', medium: 'ふつう 6×6', hard: 'むずかしい 7×7', win: '完璧な推理力です！', errNumber: '数字の条件が崩れています', errAdjacent: '黒マスが隣接しています', errDisconnected: '白マスが分断されています', moves: '手数', streak: '連続', best: '最高', doneToday: '本日クリア ✓' },
    zh: { title: '黑格在哪 (Kurodoko)', subtitle: 'Nikoli Logic', desc: '涂黑格子，使每个数字格能看到的白格数(含自身)恰好等于该数字。黑格不相邻，白格须全连通。', daily: '📅 每日谜题', easy: '简单 5×5', medium: '普通 6×6', hard: '困难 7×7', win: '推理完美！', errNumber: '数字条件被破坏', errAdjacent: '黑格相邻了', errDisconnected: '白格断开了', moves: '步数', streak: '连续', best: '最佳', doneToday: '今日已完成 ✓' },
    fr: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Noircissez des cases pour que chaque nombre voie exactement autant de cases blanches (lui compris). Les noires ne se touchent pas ; les blanches restent connectées.', daily: '📅 Puzzle du jour', easy: 'Facile 5×5', medium: 'Moyen 6×6', hard: 'Difficile 7×7', win: 'Déduction parfaite !', errNumber: 'Un indice numérique est cassé', errAdjacent: 'Des cases noires se touchent', errDisconnected: 'Les cases blanches sont coupées', moves: 'Coups', streak: 'Série', best: 'Record', doneToday: "Fini aujourd'hui ✓" },
    es: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Sombrea casillas para que cada número vea exactamente esa cantidad de blancas (incluida ella). Las negras no se tocan; las blancas quedan conectadas.', daily: '📅 Puzle diario', easy: 'Fácil 5×5', medium: 'Normal 6×6', hard: 'Difícil 7×7', win: '¡Deducción perfecta!', errNumber: 'Una pista numérica está rota', errAdjacent: 'Hay negras juntas', errDisconnected: 'Las blancas están separadas', moves: 'Movs', streak: 'Racha', best: 'Récord', doneToday: 'Hecho hoy ✓' },
} as const;

// Daily puzzle: same board for everyone on the same calendar day (medium 6×6).
const DAILY_GAME_ID = 'kurodoko';
const DAILY_DIFFICULTY: Difficulty = 'medium';
function generateDailyKurodoko() {
    return generateKurodoko(DAILY_DIFFICULTY, mulberry32(0x6b7264 ^ Math.imul(dayIndex() + 1, 2654435761)));
}

const Kurodoko: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [mode, setMode] = useState<'daily' | 'free'>('daily');
    const [difficulty, setDifficulty] = useState<Difficulty>(DAILY_DIFFICULTY);
    const [puzzle, setPuzzle] = useState<Puzzle>(() => generateDailyKurodoko().puzzle);
    const [board, setBoard] = useState<Cell[][]>(() => puzzle.map((row) => row.map(() => 0 as Cell)));
    const [moves, setMoves] = useState(0);
    const [validation, setValidation] = useState<Validation>({ ok: true, complete: false, error: null });
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(() => todayKey());

    useEffect(() => {
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
    }, []);

    const newPuzzle = useCallback((next: 'daily' | Difficulty) => {
        const isDaily = next === 'daily';
        const { puzzle: p } = isDaily ? generateDailyKurodoko() : generateKurodoko(next);
        setMode(isDaily ? 'daily' : 'free');
        setDifficulty(isDaily ? DAILY_DIFFICULTY : next);
        if (isDaily) setDailyDate(todayKey());
        setPuzzle(p);
        setBoard(p.map((row) => row.map(() => 0 as Cell)));
        setMoves(0);
        setValidation({ ok: true, complete: false, error: null });
    }, []);

    const toggle = (r: number, c: number) => {
        if (validation.complete || puzzle[r][c] !== null) return;
        if (mode === 'daily' && dailyDate !== todayKey()) {
            newPuzzle('daily');
            return;
        }
        const next = board.map((row) => [...row]);
        next[r][c] = next[r][c] === 0 ? 1 : 0;
        setBoard(next);
        setMoves((m) => m + 1);
        const v = validateKurodoko(next, puzzle);
        setValidation(v);
        if (v.complete && mode === 'daily') {
            const today = todayKey();
            setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
        }
    };

    const size = puzzle.length;
    const cellCls = size <= 5 ? 'text-xl' : size <= 6 ? 'text-lg' : 'text-base';

    const solvedToday = streak?.lastWinDate === todayKey();

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => newPuzzle(mode === 'daily' ? 'daily' : difficulty)}>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t.desc}</p>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap gap-1">
                    <button onClick={() => newPuzzle('daily')}
                        aria-pressed={mode === 'daily'}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                        {t.daily}
                    </button>
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => newPuzzle(d)}
                            aria-pressed={mode === 'free' && difficulty === d}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${mode === 'free' && difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[d]}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.moves} {moves}</span>
            </div>

            {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                <p className="mb-3 text-center text-[11px] font-bold text-muted-foreground">
                    🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                    {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                </p>
            )}

            <div
                className={`grid gap-1 p-2 bg-muted/30 rounded-xl border border-border mx-auto max-w-sm ${validation.complete ? 'ring-2 ring-success' : ''}`}
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                role="grid" aria-label={t.title}
            >
                {board.map((row, r) => row.map((cell, c) => {
                    const n = puzzle[r][c];
                    return (
                        <button
                            key={`${r}-${c}`}
                            onClick={() => toggle(r, c)}
                            disabled={n !== null || validation.complete}
                            aria-label={n !== null ? String(n) : cell === 1 ? 'black' : 'white'}
                            className={`aspect-square flex items-center justify-center rounded-md font-black ${cellCls} border transition-all ${
                                n !== null
                                    ? 'bg-card border-2 border-foreground/60 text-foreground cursor-default'
                                    : cell === 1
                                        ? 'bg-foreground border-foreground'
                                        : 'bg-background border-border hover:bg-muted active:scale-95'
                            }`}
                        >
                            {n}
                        </button>
                    );
                }))}
            </div>

            <div className="mt-4 min-h-[2rem] text-center" role="status" aria-live="polite">
                {validation.complete ? (
                    <p className="text-lg font-black text-success animate-fade-up motion-reduce:animate-none">🎉 {t.win}</p>
                ) : validation.error ? (
                    <p className="text-xs font-bold text-destructive">
                        {validation.error === 'number' ? t.errNumber : validation.error === 'adjacent' ? t.errAdjacent : t.errDisconnected}
                    </p>
                ) : null}
            </div>
        </GameContainer>
    );
};

export default Kurodoko;
