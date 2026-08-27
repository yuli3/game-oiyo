import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { dayIndex, mulberry32, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import {
    generateKurodokoPuzzle,
    kurodokoDailySeed,
    validateKurodokoBoard,
    type KurodokoCell as Cell,
    type KurodokoDifficulty as Difficulty,
    type KurodokoPuzzle as Puzzle,
    type KurodokoValidation as Validation,
} from '../../lib/games/kurodoko';
import {
    clearKurodokoSaveV1,
    loadKurodokoSaveV1,
    puzzleFromKurodokoSave,
    restoredKurodokoSeconds,
    storeKurodokoSaveV1,
    type KurodokoMark as Mark,
    type KurodokoMode as Mode,
} from '../../lib/games/kurodoko-save';
import { LOGIC_CELL_SPRITES } from '../../lib/games/sprites';

// ─── Kurodoko (Where is Black Cells?) — Nikoli logic puzzle ──────────────────
// Shade cells black so each numbered cell sees exactly that many white cells
// (itself + straight lines until a black cell/edge). Black cells never touch
// orthogonally; all white cells stay connected. Ported from ahoxy-legacy.

const COPY = {
    ko: { title: '쿠로도코', subtitle: 'Nikoli Logic', desc: '숫자 칸에서 보이는 흰 칸 수(자신 포함)가 숫자와 같아지도록 검은 칸을 칠하세요. 검은 칸은 붙을 수 없고 흰 칸은 모두 연결돼야 합니다.', daily: '📅 오늘의 퍼즐', easy: '쉬움 5×5', medium: '보통 6×6', hard: '어려움 7×7', win: '완벽한 추리력입니다!', errNumber: '숫자 조건이 깨졌습니다', errAdjacent: '검은 칸이 붙어 있습니다', errDisconnected: '흰 칸이 끊겼습니다', moves: '이동', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓' },
    en: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Shade black cells so each number sees exactly that many white cells (itself included). Black cells never touch; whites stay connected.', daily: '📅 Daily Puzzle', easy: 'Easy 5×5', medium: 'Medium 6×6', hard: 'Hard 7×7', win: 'Flawless deduction!', errNumber: 'A number clue is broken', errAdjacent: 'Black cells are touching', errDisconnected: 'White cells are disconnected', moves: 'Moves', streak: 'Streak', best: 'Best', doneToday: 'Done today ✓' },
    ja: { title: 'クロドコ（黒どこ）', subtitle: 'Nikoli Logic', desc: '数字マスから見える白マスの数(自分含む)が数字と一致するよう黒マスを塗ります。黒マスは隣接不可、白マスは全て連結。', daily: '📅 今日のパズル', easy: 'かんたん 5×5', medium: 'ふつう 6×6', hard: 'むずかしい 7×7', win: '完璧な推理力です！', errNumber: '数字の条件が崩れています', errAdjacent: '黒マスが隣接しています', errDisconnected: '白マスが分断されています', moves: '手数', streak: '連続', best: '最高', doneToday: '本日クリア ✓' },
    zh: { title: '黑格在哪 (Kurodoko)', subtitle: 'Nikoli Logic', desc: '涂黑格子，使每个数字格能看到的白格数(含自身)恰好等于该数字。黑格不相邻，白格须全连通。', daily: '📅 每日谜题', easy: '简单 5×5', medium: '普通 6×6', hard: '困难 7×7', win: '推理完美！', errNumber: '数字条件被破坏', errAdjacent: '黑格相邻了', errDisconnected: '白格断开了', moves: '步数', streak: '连续', best: '最佳', doneToday: '今日已完成 ✓' },
    fr: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Noircissez des cases pour que chaque nombre voie exactement autant de cases blanches (lui compris). Les noires ne se touchent pas ; les blanches restent connectées.', daily: '📅 Puzzle du jour', easy: 'Facile 5×5', medium: 'Moyen 6×6', hard: 'Difficile 7×7', win: 'Déduction parfaite !', errNumber: 'Un indice numérique est cassé', errAdjacent: 'Des cases noires se touchent', errDisconnected: 'Les cases blanches sont coupées', moves: 'Coups', streak: 'Série', best: 'Record', doneToday: "Fini aujourd'hui ✓" },
    es: { title: 'Kurodoko', subtitle: 'Nikoli Logic', desc: 'Sombrea casillas para que cada número vea exactamente esa cantidad de blancas (incluida ella). Las negras no se tocan; las blancas quedan conectadas.', daily: '📅 Puzle diario', easy: 'Fácil 5×5', medium: 'Normal 6×6', hard: 'Difícil 7×7', win: '¡Deducción perfecta!', errNumber: 'Una pista numérica está rota', errAdjacent: 'Hay negras juntas', errDisconnected: 'Las blancas están separadas', moves: 'Movs', streak: 'Racha', best: 'Récord', doneToday: 'Hecho hoy ✓' },
} as const;

const A11Y_COPY = {
    ko: { subtitle: '니코리 논리 퍼즐', reset: '다시 시작', row: '행', column: '열', clue: '숫자 단서', black: '검은 칸', white: '흰 칸 표시', unknown: '미정 칸', undo: '실행 취소', soundOn: '소리 켜기', soundOff: '소리 끄기', hint: '탭: 검정 → 흰색 표시 → 미정 · 우클릭: 반대 순서' },
    en: { subtitle: 'Nikoli logic puzzle', reset: 'Reset', row: 'Row', column: 'Column', clue: 'Number clue', black: 'Black cell', white: 'White mark', unknown: 'Unknown cell', undo: 'Undo', soundOn: 'Sound on', soundOff: 'Sound off', hint: 'Tap: black → white mark → unknown · right-click: reverse' },
    ja: { subtitle: 'ニコリ論理パズル', reset: 'やり直す', row: '行', column: '列', clue: '数字ヒント', black: '黒マス', white: '白マーク', unknown: '未確定マス', undo: '元に戻す', soundOn: '音をオン', soundOff: '音をオフ', hint: 'タップ：黒 → 白印 → 未確定 · 右クリック：逆順' },
    zh: { subtitle: 'Nikoli 逻辑谜题', reset: '重新开始', row: '行', column: '列', clue: '数字提示', black: '黑格', white: '白格标记', unknown: '未定格', undo: '撤销', soundOn: '开启声音', soundOff: '关闭声音', hint: '点击：黑格 → 白色标记 → 未定 · 右键：反向' },
    fr: { subtitle: 'Puzzle logique Nikoli', reset: 'Recommencer', row: 'Ligne', column: 'Colonne', clue: 'Indice numérique', black: 'Case noire', white: 'Marque blanche', unknown: 'Case inconnue', undo: 'Annuler', soundOn: 'Activer le son', soundOff: 'Couper le son', hint: 'Toucher : noir → marque blanche → inconnu · clic droit : inverse' },
    es: { subtitle: 'Puzle lógico Nikoli', reset: 'Reiniciar', row: 'Fila', column: 'Columna', clue: 'Pista numérica', black: 'Casilla negra', white: 'Marca blanca', unknown: 'Casilla sin decidir', undo: 'Deshacer', soundOn: 'Activar sonido', soundOff: 'Silenciar', hint: 'Toca: negra → marca blanca → sin decidir · clic derecho: inverso' },
} as const;

// Daily puzzle: same board for everyone on the same calendar day (medium 6×6).
const DAILY_GAME_ID = 'kurodoko';
const DAILY_DIFFICULTY: Difficulty = 'medium';
function generateDailyKurodoko() {
    const seed = kurodokoDailySeed(dayIndex());
    return { ...generateKurodokoPuzzle(DAILY_DIFFICULTY, mulberry32(seed)), seed };
}

function initialMarks(puzzle: Puzzle): Mark[][] {
    return puzzle.map((row) => row.map((clue) => clue === null ? -1 : 0));
}

function playableBoard(marks: Mark[][]): Cell[][] {
    return marks.map((row) => row.map((mark) => mark === 1 ? 1 : 0));
}

function randomSeed(): number {
    return (Math.random() * 0x1_0000_0000) | 0;
}

function playTone(kind: 'move' | 'win', muted: boolean) {
    if (muted || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'win' ? 'sine' : 'triangle';
    oscillator.frequency.value = kind === 'win' ? 660 : 180;
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'win' ? 0.35 : 0.08));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === 'win' ? 0.35 : 0.08));
    oscillator.addEventListener('ended', () => void context.close(), { once: true });
}

const Kurodoko: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const a11y = A11Y_COPY[(locale as keyof typeof A11Y_COPY)] ?? A11Y_COPY.en;

    const [mode, setMode] = useState<Mode>('daily');
    const [difficulty, setDifficulty] = useState<Difficulty>(DAILY_DIFFICULTY);
    const [puzzle, setPuzzle] = useState<Puzzle>(() => generateDailyKurodoko().puzzle);
    const [seed, setSeed] = useState(() => generateDailyKurodoko().seed);
    const [board, setBoard] = useState<Mark[][]>(() => initialMarks(puzzle));
    const [history, setHistory] = useState<Mark[][][]>([]);
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [validation, setValidation] = useState<Validation>({ ok: true, complete: false, error: null });
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(() => todayKey());
    const [activeCell, setActiveCell] = useState(0);
    const [muted, setMuted] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const cellRefs = useRef<Array<HTMLButtonElement | HTMLDivElement | null>>([]);

    useEffect(() => {
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        const saved = loadKurodokoSaveV1(today);
        if (saved) {
            const restoredPuzzle = puzzleFromKurodokoSave(saved);
            setMode(saved.mode);
            setDifficulty(saved.difficulty);
            setDailyDate(saved.dailyDate);
            setSeed(saved.seed);
            setPuzzle(restoredPuzzle);
            setBoard(saved.marks);
            setMoves(saved.moves);
            setSeconds(restoredKurodokoSeconds(saved));
            setValidation(validateKurodokoBoard(playableBoard(saved.marks), restoredPuzzle));
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated || moves === 0 || validation.complete) return;
        const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [hydrated, moves, validation.complete]);

    useEffect(() => {
        if (!hydrated || moves === 0 || validation.complete) return;
        storeKurodokoSaveV1({ mode, difficulty, dailyDate, seed, marks: board, moves, seconds, savedAtEpochMs: Date.now() });
    }, [board, dailyDate, difficulty, hydrated, mode, moves, seconds, seed, validation.complete]);

    const newPuzzle = useCallback((next: 'daily' | Difficulty) => {
        const isDaily = next === 'daily';
        const nextSeed = isDaily ? kurodokoDailySeed(dayIndex()) : randomSeed();
        const p = generateKurodokoPuzzle(isDaily ? DAILY_DIFFICULTY : next, mulberry32(nextSeed)).puzzle;
        setMode(isDaily ? 'daily' : 'free');
        setDifficulty(isDaily ? DAILY_DIFFICULTY : next);
        setDailyDate(todayKey());
        setSeed(nextSeed);
        setPuzzle(p);
        setBoard(initialMarks(p));
        setHistory([]);
        setMoves(0);
        setSeconds(0);
        setValidation({ ok: true, complete: false, error: null });
        setActiveCell(0);
        clearKurodokoSaveV1();
    }, []);

    const toggle = (r: number, c: number, reverse = false) => {
        if (validation.complete || puzzle[r][c] !== null) return;
        if (mode === 'daily' && dailyDate !== todayKey()) {
            newPuzzle('daily');
            return;
        }
        const next = board.map((row) => [...row]);
        const order: Mark[] = reverse ? [-1, 0, 1] : [-1, 1, 0];
        next[r][c] = order[(order.indexOf(next[r][c]) + 1) % order.length];
        setHistory((items) => [...items.slice(-49), board.map((row) => [...row])]);
        setBoard(next);
        setMoves((m) => m + 1);
        const v = validateKurodokoBoard(playableBoard(next), puzzle);
        setValidation(v);
        playTone(v.complete ? 'win' : 'move', muted);
        if (v.complete) clearKurodokoSaveV1();
        if (v.complete && mode === 'daily') {
            const today = todayKey();
            setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
        }
    };

    const undo = () => {
        const previous = history.at(-1);
        if (!previous || validation.complete) return;
        setHistory((items) => items.slice(0, -1));
        setBoard(previous);
        setMoves((value) => Math.max(0, value - 1));
        setValidation(validateKurodokoBoard(playableBoard(previous), puzzle));
        playTone('move', muted);
    };

    const size = puzzle.length;
    const cellCls = size <= 5 ? 'text-xl' : size <= 6 ? 'text-lg' : 'text-base';

    const solvedToday = streak?.lastWinDate === todayKey();

    const handleGridKeyDown = (event: React.KeyboardEvent, index: number) => {
        const row = Math.floor(index / size);
        const column = index % size;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * size + column;
        else if (event.key === 'ArrowDown') next = Math.min(size - 1, row + 1) * size + column;
        else if (event.key === 'ArrowLeft') next = row * size + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * size + Math.min(size - 1, column + 1);
        else if (event.key === 'Home') next = row * size;
        else if (event.key === 'End') next = row * size + size - 1;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle={a11y.subtitle} resetLabel={a11y.reset} onReset={() => newPuzzle(mode === 'daily' ? 'daily' : difficulty)}>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t.desc}</p>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap gap-1">
                    <button onClick={() => newPuzzle('daily')}
                        aria-pressed={mode === 'daily'}
                        className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                        {t.daily}
                    </button>
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => newPuzzle(d)}
                            aria-pressed={mode === 'free' && difficulty === d}
                            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'free' && difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[d]}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={undo} disabled={history.length === 0 || validation.complete}
                        className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        ↶ {a11y.undo}
                    </button>
                    <button type="button" onClick={() => setMuted((value) => !value)}
                        aria-label={muted ? a11y.soundOn : a11y.soundOff} aria-pressed={!muted}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-base text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {muted ? '🔇' : '🔊'}
                    </button>
                    <span className="pl-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.moves} {moves} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
                </div>
            </div>

            <p className="mb-3 text-center text-[11px] font-medium text-muted-foreground">{a11y.hint}</p>

            {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
                    🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                    {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                </p>
            )}

            <div
                className={`grid gap-0.5 sm:gap-1 p-1 sm:p-2 bg-muted/30 rounded-xl border border-border mx-auto max-w-sm overflow-x-auto ${validation.complete ? 'ring-2 ring-success' : ''}`}
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                role="grid" aria-label={t.title} aria-rowcount={size} aria-colcount={size}
            >
                {board.map((row, r) => (
                    <div key={`row-${r}`} role="row" className="contents">
                        {row.map((cell, c) => {
                            const n = puzzle[r][c];
                            const index = r * size + c;
                            const position = `${a11y.row} ${r + 1}, ${a11y.column} ${c + 1}`;
                            const common = `min-h-11 min-w-11 aspect-square flex items-center justify-center rounded-md font-black ${cellCls} border transition-all motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`;
                            if (n !== null) {
                                return (
                                    <div key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} role="gridcell"
                                        tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 1} aria-colindex={c + 1}
                                        aria-label={`${position}: ${a11y.clue} ${n}`} onFocus={() => setActiveCell(index)}
                                        onKeyDown={(event) => handleGridKeyDown(event, index)}
                                        className={`${common} bg-card border-2 border-foreground/60 text-foreground cursor-default`}>
                                        {n}
                                    </div>
                                );
                            }
                            return (
                                <button key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} type="button" role="gridcell"
                                    onClick={() => { setActiveCell(index); toggle(r, c); }}
                                    onContextMenu={(event) => { event.preventDefault(); setActiveCell(index); toggle(r, c, true); }} aria-disabled={validation.complete}
                                    tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 1} aria-colindex={c + 1}
                                    aria-label={`${position}: ${cell === 1 ? a11y.black : cell === 0 ? a11y.white : a11y.unknown}`}
                                    onFocus={() => setActiveCell(index)} onKeyDown={(event) => handleGridKeyDown(event, index)}
                                    className={`${common} relative overflow-hidden ${cell === 1 ? 'border-foreground shadow-inner' : cell === 0 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border hover:bg-muted active:scale-95'}`}>
                                    {cell === 1 && <img src={LOGIC_CELL_SPRITES.black} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />}
                                    {cell === 0 && <span aria-hidden="true" className="block size-2 rounded-full bg-primary/70" />}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="mt-4 min-h-[2rem] text-center" role="status" aria-live="polite">
                {validation.complete ? (
                    <div className="animate-fade-up rounded-xl border border-success/30 bg-success/10 px-4 py-3 motion-reduce:animate-none">
                        <p className="text-lg font-black text-success">🎉 {t.win}</p>
                        <p className="mt-1 text-xs font-bold text-muted-foreground">{t.moves} {moves} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} · {mode === 'daily' ? t.daily : t[difficulty]}</p>
                    </div>
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
