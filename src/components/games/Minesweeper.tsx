import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest } from '../../lib/games/records';
import {
    chordMinesweeperCell,
    createEmptyBoard,
    createMinesweeperBoard,
    revealMinesweeperCell,
    toggleMinesweeperFlag,
    type MinesweeperBoard,
    type RevealResult,
} from '../../lib/games/minesweeper';

const SIZE = 10;
const MINE_COUNT = 10;
const LEGACY_BEST_KEY = 'oiyo-minesweeper-best'; // pre-unification key, read once for migration

const COPY = {
    ko: { title: "지뢰찾기", subtitle: "Logic Sweep", mines: "남은 지뢰", time: "시간", over: "폭발! 게임 종료", win: "모든 안전 칸을 열었습니다!", reset: "새 게임", dig: "파기", flag: "깃발", best: "최단 기록", hint: "숫자를 다시 누르면 주변 깃발 수가 맞을 때 한꺼번에 엽니다 · 모바일: 깃발 모드 · PC: 우클릭", row: "행", column: "열", hidden: "닫힌 칸", flagged: "깃발 표시", mine: "지뢰", empty: "빈 칸", number: "주변 지뢰" },
    en: { title: "Minesweeper", subtitle: "Logic Sweep", mines: "Mines", time: "Time", over: "BOOM! Game Over", win: "All safe cells cleared!", reset: "New Game", dig: "Dig", flag: "Flag", best: "Best Time", hint: "Press an open number again to clear around matching flags · Mobile: flag mode · PC: right-click", row: "row", column: "column", hidden: "hidden cell", flagged: "flagged", mine: "mine", empty: "empty", number: "adjacent mines" },
    ja: { title: "マインスイーパー", subtitle: "Logic Sweep", mines: "残り地雷", time: "時間", over: "ドカン！ゲーム終了", win: "安全なマスをすべて開きました！", reset: "新しいゲーム", dig: "掘る", flag: "旗", best: "最短記録", hint: "開いた数字を再度押すと、旗の数が合う場合に周囲を一括で開きます · モバイル: 旗モード · PC: 右クリック", row: "行", column: "列", hidden: "閉じたマス", flagged: "旗付き", mine: "地雷", empty: "空白", number: "周囲の地雷" },
    zh: { title: "扫雷", subtitle: "Logic Sweep", mines: "剩余地雷", time: "时间", over: "爆炸！游戏结束", win: "已打开所有安全格！", reset: "新游戏", dig: "挖开", flag: "插旗", best: "最快记录", hint: "再次按已打开的数字，旗帜数匹配时可一次打开周围 · 手机: 插旗模式 · 电脑: 右键", row: "行", column: "列", hidden: "未打开", flagged: "已插旗", mine: "地雷", empty: "空格", number: "相邻地雷" },
    fr: { title: "Démineur", subtitle: "Logic Sweep", mines: "Mines", time: "Temps", over: "BOUM ! Partie terminée", win: "Toutes les cases sûres sont ouvertes !", reset: "Nouvelle partie", dig: "Creuser", flag: "Drapeau", best: "Meilleur temps", hint: "Réactivez un nombre ouvert pour dégager autour des drapeaux correspondants · Mobile : drapeau · PC : clic droit", row: "ligne", column: "colonne", hidden: "case fermée", flagged: "drapeau", mine: "mine", empty: "vide", number: "mines voisines" },
    es: { title: "Buscaminas", subtitle: "Logic Sweep", mines: "Minas", time: "Tiempo", over: "¡BUM! Fin del juego", win: "¡Abriste todas las casillas seguras!", reset: "Nueva partida", dig: "Cavar", flag: "Bandera", best: "Mejor tiempo", hint: "Pulsa de nuevo un número abierto para despejar alrededor de las banderas coincidentes · Móvil: bandera · PC: clic derecho", row: "fila", column: "columna", hidden: "casilla cerrada", flagged: "con bandera", mine: "mina", empty: "vacía", number: "minas adyacentes" },
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

const Minesweeper: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [board, setBoard] = useState<MinesweeperBoard>(() => createEmptyBoard(SIZE, SIZE));
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timer, setTimer] = useState(0);
    const [flagMode, setFlagMode] = useState(false);
    const [firstClick, setFirstClick] = useState(true);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [activeCell, setActiveCell] = useState(0);
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const initBoard = useCallback(() => {
        setBoard(createEmptyBoard(SIZE, SIZE));
        setStatus('playing');
        setTimer(0);
        setFirstClick(true);
        setFlagMode(false);
        setActiveCell(0);
    }, []);

    useEffect(() => {
        initBoard();
        const existing = getBest('minesweeper');
        if (existing) { setBestTime(existing.value); return; }
        // One-time migration from the pre-unification per-game key
        try {
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (Number.isFinite(legacy) && legacy > 0) setBestTime(recordBest('minesweeper', legacy, 'seconds').value);
        } catch { /* ignore */ }
    }, [initBoard]);

    useEffect(() => {
        if (status !== 'playing' || firstClick) return;
        const interval = setInterval(() => setTimer((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [status, firstClick]);

    const applyReveal = (result: RevealResult) => {
        if (!result.changed) return;
        setBoard(result.board);
        setStatus(result.status);
        if (result.status === 'won') {
            setBestTime(recordBest('minesweeper', Math.max(1, timer), 'seconds').value);
        }
    };

    const reveal = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isFlagged) return;

        // First click is always safe: build the board around it
        let base = board;
        if (firstClick) {
            base = createMinesweeperBoard(SIZE, SIZE, MINE_COUNT, x, y);
            for (const cell of board.flat()) if (cell.isFlagged) base[cell.y][cell.x].isFlagged = true;
            setFirstClick(false);
        }
        applyReveal(base[y][x].isRevealed
            ? chordMinesweeperCell(base, x, y)
            : revealMinesweeperCell(base, x, y));
    };

    const toggleFlag = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isRevealed) return;
        setBoard((prev) => toggleMinesweeperFlag(prev, x, y, MINE_COUNT));
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
        const row = Math.floor(index / SIZE);
        const column = index % SIZE;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * SIZE + column;
        else if (event.key === 'ArrowDown') next = Math.min(SIZE - 1, row + 1) * SIZE + column;
        else if (event.key === 'ArrowLeft') next = row * SIZE + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * SIZE + Math.min(SIZE - 1, column + 1);
        else if (event.key === 'Home') next = row * SIZE;
        else if (event.key === 'End') next = row * SIZE + SIZE - 1;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={initBoard}>
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.mines}>🚩 {MINE_COUNT - flaggedCount}</div>
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

            <div className="overflow-x-auto pb-1">
                <div className="grid gap-1 bg-muted/30 p-2 rounded-xl border border-border w-max mx-auto" style={{ gridTemplateColumns: `repeat(${SIZE}, 2.75rem)` }} role="grid" aria-label={t.title} aria-rowcount={SIZE} aria-colcount={SIZE}>
                    {board.map((row, y) => (
                        <div key={`row-${y}`} role="row" className="contents">
                            {row.map((cell, x) => {
                                const index = y * SIZE + x;
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
                                        className={`h-11 w-11 rounded-md flex items-center justify-center font-black text-sm transition-colors motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
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
                        onClick={initBoard}
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
