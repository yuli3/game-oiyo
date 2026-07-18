import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest, getBestForConditions, recordBestForConditions, getDailyStreak, recordDailyWin, type BestConditions, type DailyStreak } from '../../lib/games/records';
import { dayIndex, todayKey, previousDayKey } from '../../lib/games/daily';
import {
    chordMinesweeperCell,
    createEmptyBoard,
    createNoGuessMinesweeperBoard,
    revealMinesweeperCell,
    toggleMinesweeperFlag,
    MINESWEEPER_DIFFICULTIES,
    type MinesweeperBoard,
    type MinesweeperDifficultyId,
    type RevealResult,
} from '../../lib/games/minesweeper';

const LEGACY_BEST_KEY = 'oiyo-minesweeper-best'; // pre-unification key, read once for migration

// Daily challenge is pinned to Intermediate size and a fixed centre opening so
// every player gets the exact same board — first-click-safe generation
// otherwise depends on wherever the player clicks, which free play wants but a
// shared daily puzzle can't allow.
const DAILY_DIFFICULTY_ID: MinesweeperDifficultyId = 'intermediate';
const DAILY_GAME_ID = 'minesweeper-daily';

function createGenerationSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) | 0;
}

function bestKeyFor(id: MinesweeperDifficultyId): string {
    return id === 'beginner' ? 'minesweeper' : `minesweeper-${id}`;
}

function generateDailyBoard() {
    const difficulty = MINESWEEPER_DIFFICULTIES[DAILY_DIFFICULTY_ID];
    const cx = Math.floor(difficulty.width / 2);
    const cy = Math.floor(difficulty.height / 2);
    const seed = (0x4d53 ^ Math.imul(dayIndex() + 1, 2654435761)) | 0;
    const generated = createNoGuessMinesweeperBoard(difficulty, cx, cy, seed);
    const opened = revealMinesweeperCell(generated.board, cx, cy).board;
    return { board: opened, strategy: generated.strategy };
}

const COPY = {
    ko: { title: "지뢰찾기", subtitle: "Logic Sweep", mines: "남은 지뢰", time: "시간", over: "폭발! 게임 종료", win: "모든 안전 칸을 열었습니다!", reset: "새 게임", dig: "파기", flag: "깃발", best: "최단 기록", hint: "숫자를 다시 누르면 주변 깃발 수가 맞을 때 한꺼번에 엽니다 · 모바일: 깃발 모드 · PC: 우클릭", pending: "첫 클릭은 항상 안전하며, 클릭 위치에 맞춰 판을 만듭니다.", verified: "이 판은 표준 논리 추론만으로 풀 수 있음을 검증했습니다.", fallback: "첫 클릭은 안전하지만 제한된 생성 횟수 안에 무추측 검증을 마치지 못한 판입니다.", row: "행", column: "열", hidden: "닫힌 칸", flagged: "깃발 표시", mine: "지뢰", empty: "빈 칸", number: "주변 지뢰", daily: "📅 오늘의 도전", free: "자유 플레이", beginner: "초급 10×10", intermediate: "중급 16×16", expert: "고급 30×16", streak: "연속", doneToday: "오늘 완료 ✓" },
    en: { title: "Minesweeper", subtitle: "Logic Sweep", mines: "Mines", time: "Time", over: "BOOM! Game Over", win: "All safe cells cleared!", reset: "New Game", dig: "Dig", flag: "Flag", best: "Best Time", hint: "Press an open number again to clear around matching flags · Mobile: flag mode · PC: right-click", pending: "The first click is always safe; the board is generated around it.", verified: "This board was verified solvable using standard logical deductions only.", fallback: "The first click is safe, but no-guess verification did not finish within the generation limit.", row: "row", column: "column", hidden: "hidden cell", flagged: "flagged", mine: "mine", empty: "empty", number: "adjacent mines", daily: "📅 Daily Challenge", free: "Free Play", beginner: "Beginner 10×10", intermediate: "Intermediate 16×16", expert: "Expert 30×16", streak: "Streak", doneToday: "Done today ✓" },
    ja: { title: "マインスイーパー", subtitle: "Logic Sweep", mines: "残り地雷", time: "時間", over: "ドカン！ゲーム終了", win: "安全なマスをすべて開きました！", reset: "新しいゲーム", dig: "掘る", flag: "旗", best: "最短記録", hint: "開いた数字を再度押すと、旗の数が合う場合に周囲を一括で開きます · モバイル: 旗モード · PC: 右クリック", pending: "最初のクリックは必ず安全で、その位置に合わせて盤面を生成します。", verified: "この盤面は標準的な論理推論だけで解けることを検証済みです。", fallback: "最初のクリックは安全ですが、生成上限内に推測不要の検証を完了できませんでした。", row: "行", column: "列", hidden: "閉じたマス", flagged: "旗付き", mine: "地雷", empty: "空白", number: "周囲の地雷", daily: "📅 デイリー挑戦", free: "フリープレイ", beginner: "初級 10×10", intermediate: "中級 16×16", expert: "上級 30×16", streak: "連続", doneToday: "本日クリア ✓" },
    zh: { title: "扫雷", subtitle: "Logic Sweep", mines: "剩余地雷", time: "时间", over: "爆炸！游戏结束", win: "已打开所有安全格！", reset: "新游戏", dig: "挖开", flag: "插旗", best: "最快记录", hint: "再次按已打开的数字，旗帜数匹配时可一次打开周围 · 手机: 插旗模式 · 电脑: 右键", pending: "首次点击始终安全，棋盘会围绕该位置生成。", verified: "此棋盘已验证可仅用标准逻辑推理完成。", fallback: "首次点击安全，但在生成次数上限内未完成无猜测验证。", row: "行", column: "列", hidden: "未打开", flagged: "已插旗", mine: "地雷", empty: "空格", number: "相邻地雷", daily: "📅 每日挑战", free: "自由模式", beginner: "初级 10×10", intermediate: "中级 16×16", expert: "高级 30×16", streak: "连续", doneToday: "今日已完成 ✓" },
    fr: { title: "Démineur", subtitle: "Logic Sweep", mines: "Mines", time: "Temps", over: "BOUM ! Partie terminée", win: "Toutes les cases sûres sont ouvertes !", reset: "Nouvelle partie", dig: "Creuser", flag: "Drapeau", best: "Meilleur temps", hint: "Réactivez un nombre ouvert pour dégager autour des drapeaux correspondants · Mobile : drapeau · PC : clic droit", pending: "Le premier clic est toujours sûr ; la grille est générée autour de lui.", verified: "Cette grille a été vérifiée comme résoluble uniquement par déductions logiques standard.", fallback: "Le premier clic est sûr, mais la vérification sans conjecture n'a pas abouti dans la limite de génération.", row: "ligne", column: "colonne", hidden: "case fermée", flagged: "drapeau", mine: "mine", empty: "vide", number: "mines voisines", daily: "📅 Défi du jour", free: "Partie libre", beginner: "Débutant 10×10", intermediate: "Intermédiaire 16×16", expert: "Expert 30×16", streak: "Série", doneToday: "Fini aujourd'hui ✓" },
    es: { title: "Buscaminas", subtitle: "Logic Sweep", mines: "Minas", time: "Tiempo", over: "¡BUM! Fin del juego", win: "¡Abriste todas las casillas seguras!", reset: "Nueva partida", dig: "Cavar", flag: "Bandera", best: "Mejor tiempo", hint: "Pulsa de nuevo un número abierto para despejar alrededor de las banderas coincidentes · Móvil: bandera · PC: clic derecho", pending: "El primer clic siempre es seguro; el tablero se genera a su alrededor.", verified: "Se verificó que este tablero puede resolverse solo con deducciones lógicas estándar.", fallback: "El primer clic es seguro, pero la verificación sin adivinar no terminó dentro del límite de generación.", row: "fila", column: "columna", hidden: "casilla cerrada", flagged: "con bandera", mine: "mina", empty: "vacía", number: "minas adyacentes", daily: "📅 Reto diario", free: "Juego libre", beginner: "Principiante 10×10", intermediate: "Intermedio 16×16", expert: "Experto 30×16", streak: "Racha", doneToday: "Hecho hoy ✓" },
} as const;

// Classic minesweeper number colors mapped to design tokens
const NUM_COLORS: Record<number, string> = {
    1: 'text-chart-2',
    2: 'text-primary',
    3: 'text-destructive',
    4: 'text-chart-4',
    5: 'text-chart-5',
    6: 'text-chart-1',
    7: 'text-foreground',
    8: 'text-muted-foreground',
};

type Mode = 'daily' | MinesweeperDifficultyId;

const Minesweeper: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [mode, setMode] = useState<Mode>('daily');
    const difficultyId: MinesweeperDifficultyId = mode === 'daily' ? DAILY_DIFFICULTY_ID : mode;
    const { width, height, mineCount } = MINESWEEPER_DIFFICULTIES[difficultyId];

    const [board, setBoard] = useState<MinesweeperBoard>(() => createEmptyBoard(width, height));
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timer, setTimer] = useState(0);
    const [flagMode, setFlagMode] = useState(false);
    const [firstClick, setFirstClick] = useState(true);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [activeCell, setActiveCell] = useState(0);
    const [generationStrategy, setGenerationStrategy] = useState<'pending' | 'verified' | 'safe-fallback'>('pending');
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(() => todayKey());
    const generationSeed = useRef(createGenerationSeed());
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const recordedRef = useRef(false);

    const recordConditions = useCallback((): BestConditions => ({
        seed: mode === 'daily' ? `daily-${dailyDate}` : `free-${generationSeed.current}`,
        difficulty: difficultyId,
        assist: 'none',
    }), [dailyDate, difficultyId, mode]);

    const initBoard = useCallback((next: Mode) => {
        const id = next === 'daily' ? DAILY_DIFFICULTY_ID : next;
        const dims = MINESWEEPER_DIFFICULTIES[id];
        setMode(next);
        setFlagMode(false);
        setActiveCell(0);
        setTimer(0);
        recordedRef.current = false;
        if (next === 'daily') {
            const daily = generateDailyBoard();
            setBoard(daily.board);
            setGenerationStrategy(daily.strategy);
            setFirstClick(false);
            setDailyDate(todayKey());
        } else {
            setBoard(createEmptyBoard(dims.width, dims.height));
            setGenerationStrategy('pending');
            setFirstClick(true);
            generationSeed.current = createGenerationSeed();
        }
        setStatus('playing');
        const conditions: BestConditions = {
            seed: next === 'daily' ? `daily-${todayKey()}` : `free-${generationSeed.current}`,
            difficulty: id,
            assist: 'none',
        };
        setBestTime(getBestForConditions(bestKeyFor(id), conditions)?.value ?? null);
    }, []);

    useEffect(() => {
        initBoard('daily');
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        // One-time migration from the pre-unification per-game key (beginner best time)
        try {
            if (!getBest('minesweeper')) {
                const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
                if (Number.isFinite(legacy) && legacy > 0) recordBest('minesweeper', legacy, 'seconds', undefined, { trackPlay: false });
            }
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status !== 'playing' || firstClick) return;
        const interval = setInterval(() => setTimer((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [status, firstClick]);

    const applyReveal = (result: RevealResult) => {
        if (!result.changed) return;
        setBoard(result.board);
        setStatus(result.status);
        if (result.status === 'won' && !recordedRef.current) {
            recordedRef.current = true;
            setBestTime(recordBestForConditions(bestKeyFor(difficultyId), Math.max(1, timer), 'seconds', recordConditions()).value);
            if (mode === 'daily') {
                const today = todayKey();
                setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            }
        }
    };

    const reveal = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isFlagged) return;
        if (mode === 'daily' && dailyDate !== todayKey()) { initBoard('daily'); return; }

        // Free play: first click is always safe — build and verify the board around it.
        let base = board;
        if (firstClick) {
            const dims = MINESWEEPER_DIFFICULTIES[difficultyId];
            const generated = createNoGuessMinesweeperBoard(dims, x, y, generationSeed.current);
            base = generated.board;
            for (const cell of board.flat()) if (cell.isFlagged) base[cell.y][cell.x].isFlagged = true;
            setGenerationStrategy(generated.strategy);
            setFirstClick(false);
        }
        applyReveal(base[y][x].isRevealed
            ? chordMinesweeperCell(base, x, y)
            : revealMinesweeperCell(base, x, y));
    };

    const toggleFlag = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isRevealed) return;
        setBoard((prev) => toggleMinesweeperFlag(prev, x, y, mineCount));
    };

    const handleCellClick = (x: number, y: number) => {
        if (flagMode) toggleFlag(x, y);
        else reveal(x, y);
    };

    const handleContextMenu = (e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        toggleFlag(x, y);
    };

    const flaggedCount = board.flat().filter((c) => c.isFlagged).length;

    const handleGridKeyDown = (event: React.KeyboardEvent, index: number) => {
        const row = Math.floor(index / width);
        const column = index % width;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * width + column;
        else if (event.key === 'ArrowDown') next = Math.min(height - 1, row + 1) * width + column;
        else if (event.key === 'ArrowLeft') next = row * width + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * width + Math.min(width - 1, column + 1);
        else if (event.key === 'Home') next = row * width;
        else if (event.key === 'End') next = row * width + width - 1;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    const solvedToday = streak?.lastWinDate === todayKey();
    const cellSize = width > 20 ? '1.75rem' : width > 12 ? '2.25rem' : '2.75rem';

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={() => initBoard(mode)}>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <button onClick={() => initBoard('daily')} aria-pressed={mode === 'daily'}
                    className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    {t.daily}{solvedToday ? ' ✓' : ''}
                </button>
                {(['beginner', 'intermediate', 'expert'] as const).map((id) => (
                    <button key={id} onClick={() => initBoard(id)} aria-pressed={mode === id}
                        className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === id ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                        {t[id]}
                    </button>
                ))}
            </div>

            {mode === 'daily' && streak && streak.played > 0 && (
                <p className="mb-3 text-center text-[11px] font-bold text-muted-foreground">🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}</p>
            )}

            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.mines}>🚩 {mineCount - flaggedCount}</div>
                <button
                    onClick={() => setFlagMode((f) => !f)}
                    aria-pressed={flagMode}
                    aria-label={flagMode ? t.flag : t.dig}
                    className={`min-h-11 px-4 py-2 rounded-full text-xs font-black border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        flagMode
                            ? 'bg-chart-2/15 text-chart-2 border-chart-2/40'
                            : 'bg-muted text-muted-foreground border-border'
                    }`}
                >
                    {flagMode ? `🚩 ${t.flag}` : `⛏️ ${t.dig}`}
                </button>
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.time}>⏱️ {timer}s</div>
            </div>

            <p className="mb-3 text-center text-[11px] font-medium text-muted-foreground" role="status" aria-live="polite">
                {generationStrategy === 'pending' ? t.pending : generationStrategy === 'verified' ? t.verified : t.fallback}
            </p>

            <div className="overflow-x-auto pb-1">
                <div className="grid gap-1 bg-muted/30 p-2 rounded-xl border border-border w-max mx-auto" style={{ gridTemplateColumns: `repeat(${width}, ${cellSize})` }} role="grid" aria-label={t.title} aria-rowcount={height} aria-colcount={width}>
                    {board.map((row, y) => (
                        <div key={`row-${y}`} role="row" className="contents">
                            {row.map((cell, x) => {
                                const index = y * width + x;
                                const state = cell.isRevealed
                                    ? cell.isMine ? t.mine : cell.neighborMines > 0 ? `${t.number} ${cell.neighborMines}` : t.empty
                                    : cell.isFlagged ? t.flagged : t.hidden;
                                return (
                                    <button
                                        key={`${x}-${y}`}
                                        ref={(node) => { cellRefs.current[index] = node; }}
                                        type="button"
                                        role="gridcell"
                                        onClick={() => { setActiveCell(index); handleCellClick(cell.x, cell.y); }}
                                        onContextMenu={(e) => handleContextMenu(e, cell.x, cell.y)}
                                        onFocus={() => setActiveCell(index)}
                                        onKeyDown={(event) => handleGridKeyDown(event, index)}
                                        disabled={status !== 'playing'}
                                        tabIndex={activeCell === index ? 0 : -1}
                                        aria-rowindex={y + 1}
                                        aria-colindex={x + 1}
                                        aria-label={`${t.row} ${y + 1}, ${t.column} ${x + 1}: ${state}`}
                                        style={{ height: cellSize, width: cellSize }}
                                        className={`rounded-md flex items-center justify-center font-black text-sm transition-colors motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                                            cell.isRevealed
                                                ? cell.isMine ? 'bg-destructive text-destructive-foreground' : 'bg-background border border-border'
                                                : 'bg-primary/20 hover:bg-primary/30 active:scale-95 border-b-2 border-primary/40'
                                        }`}
                                    >
                                        {cell.isRevealed
                                            ? cell.isMine ? '💣' : (cell.neighborMines > 0
                                                ? <span className={NUM_COLORS[cell.neighborMines] ?? 'text-primary'}>{cell.neighborMines}</span>
                                                : '')
                                            : cell.isFlagged ? '🚩' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {status !== 'playing' ? (
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none" role="status" aria-live="polite">
                    <p className={`text-lg font-black ${status === 'won' ? 'text-primary' : 'text-destructive'}`}>
                        {status === 'won' ? t.win : t.over}
                    </p>
                    {status === 'won' && bestTime !== null && (
                        <p className="text-xs text-muted-foreground mt-1">{t.best}: {bestTime}s</p>
                    )}
                    <button
                        onClick={() => initBoard(mode)}
                        className="mt-4 px-8 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                    >
                        {t.reset}
                    </button>
                </div>
            ) : (
                <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
            )}
        </GameContainer>
    );
};

export default Minesweeper;
