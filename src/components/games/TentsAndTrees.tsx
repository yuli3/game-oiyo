import React, { useCallback, useEffect, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { dayIndex, mulberry32, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import { generateTents, validateTents, type Pos, type TentsPuzzle, type TentsValidation } from '../../lib/games/tents';

// ─── Tents & Trees — logic puzzle with generated boards ─────────────────────
// Every tree pairs with one tent on an orthogonally adjacent cell; tents never
// touch (diagonals included); row/column counts must match the hints. Boards
// are generated with a guaranteed solution (see lib/games/tents.ts). The
// hardcoded single board of the original version is gone.

type CellMark = 'empty' | 'tent' | 'grass';

const FREE = { size: 5, pairs: 5 };
const DAILY = { size: 6, pairs: 7 };
const DAILY_GAME_ID = 'tents-and-trees';

function generateDailyTents() {
    return generateTents(DAILY.size, DAILY.pairs, mulberry32(0x74656e ^ Math.imul(dayIndex() + 1, 2654435761)));
}

const COPY = {
    ko: { title: '텐트와 나무', desc: '나무마다 텐트를 하나씩 설치하세요!', note: '텐트는 나무의 상하좌우에 놓이며, 텐트끼리는 대각선을 포함해 이웃할 수 없습니다. 행·열 숫자는 그 줄의 텐트 수입니다.', daily: '📅 오늘의 퍼즐', free: '자유 모드 5×5', win: '캠핑 준비 완료!', next: '다음 퍼즐', errAdjacent: '텐트끼리 붙어 있습니다', errOrphan: '나무 옆이 아닌 텐트가 있습니다', errCount: '행·열 숫자를 초과했습니다', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓' },
    en: { title: 'Tents & Trees', desc: 'Each tree needs exactly one tent!', note: 'Tents go orthogonally next to a tree and never touch another tent, even diagonally. Row/column numbers count the tents in that line.', daily: '📅 Daily Puzzle', free: 'Free play 5×5', win: 'Camping Ready!', next: 'Next puzzle', errAdjacent: 'Two tents are touching', errOrphan: 'A tent is not next to any tree', errCount: 'A row/column count is exceeded', streak: 'Streak', best: 'Best', doneToday: 'Done today ✓' },
    ja: { title: 'テントと木', desc: '木ごとにテントを1つずつ設置しましょう！', note: 'テントは木の上下左右に置き、テント同士は斜めも含め隣接できません。行・列の数字はその列のテント数です。', daily: '📅 今日のパズル', free: 'フリー 5×5', win: 'キャンプ準備完了！', next: '次のパズル', errAdjacent: 'テント同士が隣接しています', errOrphan: '木の隣にないテントがあります', errCount: '行・列の数字を超えています', streak: '連続', best: '最高', doneToday: '本日クリア ✓' },
    zh: { title: '帐篷与树', desc: '每棵树旁放一顶帐篷！', note: '帐篷放在树的上下左右，帐篷之间（含对角）不能相邻。行列数字表示该行列的帐篷数。', daily: '📅 每日谜题', free: '自由模式 5×5', win: '露营准备就绪！', next: '下一题', errAdjacent: '有帐篷相邻了', errOrphan: '有帐篷不在树旁', errCount: '超过了行列数字', streak: '连续', best: '最佳', doneToday: '今日已完成 ✓' },
    fr: { title: 'Tentes et arbres', desc: "Chaque arbre a besoin d'une tente !", note: "Les tentes se placent à côté d'un arbre (jamais en diagonale d'une autre tente). Les nombres comptent les tentes de chaque ligne/colonne.", daily: '📅 Puzzle du jour', free: 'Libre 5×5', win: 'Prêt à camper !', next: 'Puzzle suivant', errAdjacent: 'Deux tentes se touchent', errOrphan: "Une tente n'est près d'aucun arbre", errCount: 'Un compteur de ligne/colonne est dépassé', streak: 'Série', best: 'Record', doneToday: "Fini aujourd'hui ✓" },
    es: { title: 'Tiendas y árboles', desc: '¡Cada árbol necesita una tienda!', note: 'Las tiendas van junto a un árbol (arriba/abajo/izquierda/derecha) y nunca se tocan entre sí, ni en diagonal. Los números cuentan las tiendas de cada fila/columna.', daily: '📅 Puzle diario', free: 'Libre 5×5', win: '¡Listos para acampar!', next: 'Siguiente puzle', errAdjacent: 'Dos tiendas se tocan', errOrphan: 'Hay una tienda sin árbol al lado', errCount: 'Se superó un número de fila/columna', streak: 'Racha', best: 'Récord', doneToday: 'Hecho hoy ✓' },
} as const;

const TentsAndTrees: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [mode, setMode] = useState<'daily' | 'free'>('daily');
    const [puzzle, setPuzzle] = useState<TentsPuzzle>(() => generateDailyTents().puzzle);
    const [marks, setMarks] = useState<CellMark[][]>(() => Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill('empty' as CellMark)));
    const [validation, setValidation] = useState<TentsValidation>({ ok: true, complete: false, error: null });
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(() => todayKey());

    useEffect(() => {
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
    }, []);

    const newPuzzle = useCallback((nextMode: 'daily' | 'free') => {
        const { puzzle: p } = nextMode === 'daily' ? generateDailyTents() : generateTents(FREE.size, FREE.pairs);
        setMode(nextMode);
        if (nextMode === 'daily') setDailyDate(todayKey());
        setPuzzle(p);
        setMarks(Array.from({ length: p.size }, () => Array(p.size).fill('empty' as CellMark)));
        setValidation({ ok: true, complete: false, error: null });
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

        const tents: Pos[] = [];
        for (let rr = 0; rr < puzzle.size; rr++) for (let cc = 0; cc < puzzle.size; cc++) if (next[rr][cc] === 'tent') tents.push([rr, cc]);
        const v = validateTents(tents, puzzle);
        setValidation(v);
        if (v.complete && mode === 'daily') {
            const today = todayKey();
            setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
        }
    };

    const solvedToday = streak?.lastWinDate === todayKey();
    const { size } = puzzle;

    return (
        <GameContainer title={t.title} subtitle="Logical Deployment" onReset={() => newPuzzle(mode)}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-2 text-center leading-relaxed">{t.desc}</p>
                <p className="text-[10px] text-muted-foreground/70 mb-4 text-center max-w-xs leading-relaxed">{t.note}</p>

                <div className="mb-4 inline-flex flex-wrap justify-center gap-1">
                    {(['daily', 'free'] as const).map((m) => (
                        <button key={m} onClick={() => newPuzzle(m)}
                            aria-pressed={mode === m}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${mode === m ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[m]}
                        </button>
                    ))}
                </div>

                {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                    <p className="mb-3 text-center text-[11px] font-bold text-muted-foreground">
                        🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                        {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                    </p>
                )}

                <div className="bg-muted/30 p-3 rounded-3xl border border-border shadow-inner w-full max-w-sm">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `1.25rem repeat(${size}, minmax(0, 1fr))` }}>
                        <div />
                        {puzzle.colHints.map((h, i) => (
                            <div key={`ch-${i}`} className="flex items-center justify-center text-xs font-black text-primary">{h}</div>
                        ))}
                        {marks.map((row, r) => (
                            <React.Fragment key={`r-${r}`}>
                                <div className="flex items-center justify-center text-xs font-black text-primary">{puzzle.rowHints[r]}</div>
                                {row.map((mark, c) => {
                                    const tree = isTree(r, c);
                                    return (
                                        <button
                                            key={`${r}-${c}`}
                                            onClick={() => handleCellClick(r, c)}
                                            disabled={tree || validation.complete}
                                            aria-label={tree ? 'tree' : mark}
                                            className={`aspect-square rounded-lg flex items-center justify-center transition-all border border-border/40 ${
                                                tree ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                                                mark === 'tent' ? 'bg-rose-100 text-rose-700 shadow-md -translate-y-0.5' :
                                                mark === 'grass' ? 'bg-muted/50 text-muted-foreground/30' : 'bg-background hover:bg-muted/20 active:scale-95'
                                            }`}
                                        >
                                            {tree && <span className="text-lg sm:text-xl">🌲</span>}
                                            {!tree && mark === 'tent' && <span className="text-lg sm:text-xl">⛺</span>}
                                            {!tree && mark === 'grass' && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
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
                    ) : null}
                </div>
            </div>
        </GameContainer>
    );
};

export default TentsAndTrees;
