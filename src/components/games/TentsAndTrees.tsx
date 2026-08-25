import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { dayIndex, mulberry32, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import { explainTentsHint, generateTents, generateUniqueTents, validateTents, type Pos, type TentsHint, type TentsPuzzle, type TentsValidation } from '../../lib/games/tents';
import {
    DAILY_BOARD,
    FREE_BOARD,
    clearTentsSave,
    loadTentsSave,
    puzzleForTentsSave,
    storeTentsSave,
    type CellMark,
    type TentsMode,
} from '../../lib/games/tents-save';
import { TENTS_SPRITES } from '../../lib/games/sprites';

// ─── Tents & Trees — logic puzzle with generated boards ─────────────────────
// Every tree pairs with one tent on an orthogonally adjacent cell; tents never
// touch (diagonals included); row/column counts must match the hints. Boards
// are generated with a guaranteed solution (see lib/games/tents.ts). The
// hardcoded single board of the original version is gone.

const DAILY_GAME_ID = 'tents-and-trees';

function generateDailyTents() {
    return generateUniqueTents(DAILY_BOARD.size, DAILY_BOARD.pairs, mulberry32(0x74656e ^ Math.imul(dayIndex() + 1, 2654435761)));
}

function emptyMarksFor(size: number): CellMark[][] {
    return Array.from({ length: size }, () => Array(size).fill('empty' as CellMark));
}

interface InitialGame {
    mode: TentsMode;
    puzzle: TentsPuzzle;
    marks: CellMark[][];
    seed: number;
    dailyDate: string;
}

/** Restores an in-progress save if one matches today, otherwise starts a fresh daily puzzle. */
function initialGame(): InitialGame {
    const today = todayKey();
    const saved = loadTentsSave(today);
    if (saved) {
        const puzzle = puzzleForTentsSave(saved.mode, saved.dailyDate, saved.seed);
        return { mode: saved.mode, puzzle, marks: saved.marks, seed: saved.seed, dailyDate: saved.dailyDate };
    }
    const { puzzle } = generateDailyTents();
    return { mode: 'daily', puzzle, marks: emptyMarksFor(puzzle.size), seed: 0, dailyDate: today };
}

const COPY = {
    ko: { title: '텐트와 나무', desc: '나무마다 텐트를 하나씩 설치하세요!', note: '텐트는 나무의 상하좌우에 놓이며, 텐트끼리는 대각선을 포함해 이웃할 수 없습니다. 행·열 숫자는 그 줄의 텐트 수입니다.', daily: '📅 오늘의 퍼즐', free: '자유 모드 5×5', win: '캠핑 준비 완료!', next: '다음 퍼즐', errAdjacent: '텐트끼리 붙어 있습니다', errOrphan: '나무 옆이 아닌 텐트가 있습니다', errCount: '행·열 숫자를 초과했습니다', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓', sound: '소리' },
    en: { title: 'Tents & Trees', desc: 'Each tree needs exactly one tent!', note: 'Tents go orthogonally next to a tree and never touch another tent, even diagonally. Row/column numbers count the tents in that line.', daily: '📅 Daily Puzzle', free: 'Free play 5×5', win: 'Camping Ready!', next: 'Next puzzle', errAdjacent: 'Two tents are touching', errOrphan: 'A tent is not next to any tree', errCount: 'A row/column count is exceeded', streak: 'Streak', best: 'Best', doneToday: 'Done today ✓', sound: 'Sound' },
    ja: { title: 'テントと木', desc: '木ごとにテントを1つずつ設置しましょう！', note: 'テントは木の上下左右に置き、テント同士は斜めも含め隣接できません。行・列の数字はその列のテント数です。', daily: '📅 今日のパズル', free: 'フリー 5×5', win: 'キャンプ準備完了！', next: '次のパズル', errAdjacent: 'テント同士が隣接しています', errOrphan: '木の隣にないテントがあります', errCount: '行・列の数字を超えています', streak: '連続', best: '最高', doneToday: '本日クリア ✓', sound: '音' },
    zh: { title: '帐篷与树', desc: '每棵树旁放一顶帐篷！', note: '帐篷放在树的上下左右，帐篷之间（含对角）不能相邻。行列数字表示该行列的帐篷数。', daily: '📅 每日谜题', free: '自由模式 5×5', win: '露营准备就绪！', next: '下一题', errAdjacent: '有帐篷相邻了', errOrphan: '有帐篷不在树旁', errCount: '超过了行列数字', streak: '连续', best: '最佳', doneToday: '今日已完成 ✓', sound: '声音' },
    fr: { title: 'Tentes et arbres', desc: "Chaque arbre a besoin d'une tente !", note: "Les tentes se placent à côté d'un arbre (jamais en diagonale d'une autre tente). Les nombres comptent les tentes de chaque ligne/colonne.", daily: '📅 Puzzle du jour', free: 'Libre 5×5', win: 'Prêt à camper !', next: 'Puzzle suivant', errAdjacent: 'Deux tentes se touchent', errOrphan: "Une tente n'est près d'aucun arbre", errCount: 'Un compteur de ligne/colonne est dépassé', streak: 'Série', best: 'Record', doneToday: "Fini aujourd'hui ✓", sound: 'Son' },
    es: { title: 'Tiendas y árboles', desc: '¡Cada árbol necesita una tienda!', note: 'Las tiendas van junto a un árbol (arriba/abajo/izquierda/derecha) y nunca se tocan entre sí, ni en diagonal. Los números cuentan las tiendas de cada fila/columna.', daily: '📅 Puzle diario', free: 'Libre 5×5', win: '¡Listos para acampar!', next: 'Siguiente puzle', errAdjacent: 'Dos tiendas se tocan', errOrphan: 'Hay una tienda sin árbol al lado', errCount: 'Se superó un número de fila/columna', streak: 'Racha', best: 'Récord', doneToday: 'Hecho hoy ✓', sound: 'Sonido' },
} as const;

const TENTS_HINT: Record<keyof typeof COPY, Record<TentsHint['reason'], string>> = {
    ko: { adjacent: '붙어 있는 텐트를 확인하세요.', orphan: '나무 옆이 아닌 텐트를 확인하세요.', count: '행·열 숫자를 초과한 텐트를 확인하세요.', pairing: '나무와 텐트가 1:1로 짝이 맞는지 확인하세요.' },
    en: { adjacent: 'Check the tents that are touching.', orphan: 'Check the tent that is not beside a tree.', count: 'Check tents that exceed a row or column count.', pairing: 'Check that every tree has exactly one tent.' },
    ja: { adjacent: '隣り合うテントを確認しましょう。', orphan: '木の隣にないテントを確認しましょう。', count: '行・列の数字を超えたテントを確認しましょう。', pairing: '木とテントが1対1か確認しましょう。' },
    zh: { adjacent: '检查相邻的帐篷。', orphan: '检查不在树旁的帐篷。', count: '检查超过行列数字的帐篷。', pairing: '检查每棵树是否正好配一顶帐篷。' },
    fr: { adjacent: 'Vérifiez les tentes qui se touchent.', orphan: 'Vérifiez la tente éloignée de tout arbre.', count: 'Vérifiez les tentes qui dépassent un compteur.', pairing: 'Vérifiez qu’arbre et tente vont par paires.' },
    es: { adjacent: 'Revisa las tiendas que se tocan.', orphan: 'Revisa la tienda que no está junto a un árbol.', count: 'Revisa las tiendas que superan un recuento.', pairing: 'Comprueba que cada árbol tenga una tienda.' },
};
const HINT_LABEL: Record<keyof typeof COPY, string> = { ko: '힌트', en: 'Hint', ja: 'ヒント', zh: '提示', fr: 'Indice', es: 'Pista' };

const A11Y_COPY = {
    ko: { subtitle: '텐트 배치 논리 퍼즐', reset: '다시 시작', row: '행', column: '열', rowHint: '행 텐트 수', columnHint: '열 텐트 수', tree: '나무', empty: '빈 칸', tent: '텐트', grass: '잔디 표시' },
    en: { subtitle: 'Tent placement logic puzzle', reset: 'Reset', row: 'Row', column: 'Column', rowHint: 'Row tent count', columnHint: 'Column tent count', tree: 'Tree', empty: 'Empty cell', tent: 'Tent', grass: 'Grass mark' },
    ja: { subtitle: 'テント配置論理パズル', reset: 'やり直す', row: '行', column: '列', rowHint: '行のテント数', columnHint: '列のテント数', tree: '木', empty: '空きマス', tent: 'テント', grass: '草印' },
    zh: { subtitle: '帐篷配置逻辑谜题', reset: '重新开始', row: '行', column: '列', rowHint: '行帐篷数', columnHint: '列帐篷数', tree: '树', empty: '空格', tent: '帐篷', grass: '草地标记' },
    fr: { subtitle: 'Puzzle logique de placement', reset: 'Recommencer', row: 'Ligne', column: 'Colonne', rowHint: 'Tentes de la ligne', columnHint: 'Tentes de la colonne', tree: 'Arbre', empty: 'Case vide', tent: 'Tente', grass: 'Marque herbe' },
    es: { subtitle: 'Puzle lógico de colocación', reset: 'Reiniciar', row: 'Fila', column: 'Columna', rowHint: 'Tiendas de la fila', columnHint: 'Tiendas de la columna', tree: 'Árbol', empty: 'Casilla vacía', tent: 'Tienda', grass: 'Marca de hierba' },
} as const;

const TentsAndTrees: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const a11y = A11Y_COPY[locale as keyof typeof A11Y_COPY] ?? A11Y_COPY.en;

    const [initial] = useState(initialGame);
    const [mode, setMode] = useState<TentsMode>(initial.mode);
    const [puzzle, setPuzzle] = useState<TentsPuzzle>(initial.puzzle);
    const [marks, setMarks] = useState<CellMark[][]>(initial.marks);
    const [seed, setSeed] = useState(initial.seed);
    const [validation, setValidation] = useState<TentsValidation>({ ok: true, complete: false, error: null });
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(initial.dailyDate);
    const [activeCell, setActiveCell] = useState(0);
    const cellRefs = useRef<Array<HTMLButtonElement | HTMLDivElement | null>>([]);

    const [muted, setMuted] = useState(false);
    const [hint, setHint] = useState<TentsHint | null>(null);
    const mutedRef = useRef(false);
    useEffect(() => { mutedRef.current = muted; }, [muted]);
    const audioRef = useRef<AudioContext | null>(null);
    const tone = useCallback((frequency: number, duration = 0.05) => {
        if (mutedRef.current || typeof window === 'undefined') return;
        const context = audioRef.current ?? new AudioContext();
        audioRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    }, []);
    useEffect(() => () => { void audioRef.current?.close(); }, []);

    useEffect(() => {
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
    }, []);

    const newPuzzle = useCallback((nextMode: TentsMode) => {
        clearTentsSave();
        if (nextMode === 'daily') {
            const { puzzle: p } = generateDailyTents();
            setMode('daily');
            setDailyDate(todayKey());
            setSeed(0);
            setPuzzle(p);
            setMarks(emptyMarksFor(p.size));
        } else {
            const freshSeed = Math.floor(Math.random() * 0xffffffff);
            const { puzzle: p } = generateTents(FREE_BOARD.size, FREE_BOARD.pairs, mulberry32(freshSeed));
            setMode('free');
            setDailyDate(todayKey());
            setSeed(freshSeed);
            setPuzzle(p);
            setMarks(emptyMarksFor(p.size));
        }
        setValidation({ ok: true, complete: false, error: null });
        setHint(null);
        setActiveCell(0);
    }, []);

    const isTree = (r: number, c: number) => puzzle.trees.some(([tr, tc]) => tr === r && tc === c);

    const handleCellClick = (r: number, c: number) => {
        if (validation.complete || isTree(r, c)) return;
        if (mode === 'daily' && dailyDate !== todayKey()) {
            newPuzzle('daily');
            return;
        }
        const next = marks.map((row) => [...row]);
        const cycle: CellMark[] = ['empty', 'tent', 'grass'];
        next[r][c] = cycle[(cycle.indexOf(next[r][c]) + 1) % 3];
        setMarks(next);
        tone(420, 0.04);

        const tents: Pos[] = [];
        for (let rr = 0; rr < puzzle.size; rr++) for (let cc = 0; cc < puzzle.size; cc++) if (next[rr][cc] === 'tent') tents.push([rr, cc]);
        const v = validateTents(tents, puzzle);
        setValidation(v);
        if (v.complete) {
            clearTentsSave();
            tone(880, 0.1);
            window.setTimeout(() => tone(1100, 0.16), 90);
            if (mode === 'daily') {
                const today = todayKey();
                setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            }
        } else {
            if (v.error) tone(180, 0.08);
            storeTentsSave({ mode, dailyDate, seed, marks: next, savedAtEpochMs: Date.now() });
        }
    };

    const solvedToday = streak?.lastWinDate === todayKey();
    const { size } = puzzle;

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
        <GameContainer title={t.title} subtitle={a11y.subtitle} resetLabel={a11y.reset} onReset={() => newPuzzle(mode)}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-2 text-center leading-relaxed">{t.desc}</p>
                <p className="text-xs text-muted-foreground/80 mb-4 text-center max-w-xs leading-relaxed">{t.note}</p>

                <div className="mb-4 inline-flex flex-wrap justify-center gap-1">
                    {(['daily', 'free'] as const).map((m) => (
                        <button key={m} onClick={() => newPuzzle(m)}
                            aria-pressed={mode === m}
                            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === m ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[m]}
                        </button>
                    ))}
                    <button type="button" onClick={() => {
                        const tents: Pos[] = [];
                        for (let rr = 0; rr < puzzle.size; rr++) for (let cc = 0; cc < puzzle.size; cc++) if (marks[rr][cc] === 'tent') tents.push([rr, cc]);
                        setHint(explainTentsHint(tents, puzzle));
                    }} disabled={validation.complete} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-40">
                        {HINT_LABEL[locale as keyof typeof HINT_LABEL] ?? HINT_LABEL.en}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMuted((value) => !value)}
                        aria-pressed={muted}
                        className="min-h-11 min-w-11 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                    >
                        <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
                        <span className="sr-only">{t.sound}</span>
                    </button>
                </div>

                {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                    <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
                        🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                        {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                    </p>
                )}

                <div className="bg-muted/30 p-1 sm:p-3 rounded-2xl sm:rounded-3xl border border-border shadow-inner w-full max-w-sm overflow-x-auto">
                    <div className="grid gap-0.5 sm:gap-1" role="grid" aria-label={t.title} aria-rowcount={size + 1} aria-colcount={size + 1}
                        style={{ gridTemplateColumns: `1.5rem repeat(${size}, minmax(2.75rem, 1fr))` }}>
                        <div role="row" aria-rowindex={1} className="contents">
                        <div role="columnheader" aria-rowindex={1} aria-colindex={1} aria-label={`${a11y.row} / ${a11y.column}`} />
                            {puzzle.colHints.map((h, i) => (
                                <div key={`ch-${i}`} role="columnheader" aria-colindex={i + 2} aria-label={`${a11y.column} ${i + 1}, ${a11y.columnHint} ${h}`}
                                    className="flex items-center justify-center text-sm font-black text-primary">{h}</div>
                            ))}
                        </div>
                        {marks.map((row, r) => (
                            <div key={`r-${r}`} role="row" aria-rowindex={r + 2} className="contents">
                                <div role="rowheader" aria-colindex={1} aria-label={`${a11y.row} ${r + 1}, ${a11y.rowHint} ${puzzle.rowHints[r]}`}
                                    className="flex items-center justify-center text-sm font-black text-primary">{puzzle.rowHints[r]}</div>
                                {row.map((mark, c) => {
                                    const tree = isTree(r, c);
                                    const index = r * size + c;
                                    const position = `${a11y.row} ${r + 1}, ${a11y.column} ${c + 1}`;
                                    const common = 'min-h-11 min-w-11 aspect-square rounded-lg flex items-center justify-center transition-all motion-reduce:transition-none motion-reduce:transform-none border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset';
                                    if (tree) {
                                        return (
                                            <div key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} role="gridcell"
                                                tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 2} aria-colindex={c + 2}
                                                aria-label={`${position}: ${a11y.tree}`} onFocus={() => setActiveCell(index)}
                                                onKeyDown={(event) => handleGridKeyDown(event, index)}
                                                className={`${common} bg-emerald-100 text-emerald-700 cursor-default`}>
                                                <img src={TENTS_SPRITES.tree} alt="" draggable={false} className="h-7 w-7 object-contain pointer-events-none" aria-hidden="true" />
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            key={`${r}-${c}`}
                                            ref={(node) => { cellRefs.current[index] = node; }} type="button" role="gridcell"
                                            onClick={() => { setActiveCell(index); handleCellClick(r, c); }} aria-disabled={validation.complete}
                                            tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 2} aria-colindex={c + 2}
                                            aria-label={`${position}: ${mark === 'tent' ? a11y.tent : mark === 'grass' ? a11y.grass : a11y.empty}`}
                                            onFocus={() => setActiveCell(index)} onKeyDown={(event) => handleGridKeyDown(event, index)}
                                            className={`${common} ${
                                                mark === 'tent' ? 'bg-rose-100 text-rose-700 shadow-md -translate-y-0.5' :
                                                mark === 'grass' ? 'bg-muted/50 text-muted-foreground/30' : 'bg-background hover:bg-muted/20 active:scale-95'
                                            } ${hint?.cells.some(([hr, hc]) => hr === r && hc === c) ? 'ring-4 ring-amber-400' : ''}`}
                                        >
                                            {mark === 'tent' && <img src={TENTS_SPRITES.tent} alt="" draggable={false} className="h-7 w-7 object-contain pointer-events-none" aria-hidden="true" />}
                                            {mark === 'grass' && <img src={TENTS_SPRITES.grass} alt="" draggable={false} className="h-6 w-6 object-contain pointer-events-none opacity-80" aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 min-h-[2rem] text-center" role="status" aria-live="polite">
                    {validation.complete ? (
                        <div className="animate-fade-up motion-reduce:animate-none">
                            <p className="text-xl font-black text-success mb-3">🎉 {t.win}</p>
                            {mode === 'free' && (
                                <button onClick={() => newPuzzle('free')} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                                    {t.next}
                                </button>
                            )}
                        </div>
                    ) : validation.error ? (
                        <p className="text-xs font-bold text-destructive">
                            {validation.error === 'adjacent' ? t.errAdjacent : validation.error === 'orphan' ? t.errOrphan : t.errCount}
                        </p>
                    ) : hint ? (
                        <p className="text-xs font-bold text-primary">{(TENTS_HINT[locale as keyof typeof TENTS_HINT] ?? TENTS_HINT.en)[hint.reason]}</p>
                    ) : null}
                </div>
            </div>
        </GameContainer>
    );
};

export default TentsAndTrees;
