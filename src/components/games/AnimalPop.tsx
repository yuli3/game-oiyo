import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

// ─── Animal Pop — 60s match-3, ported from ahoxy-legacy ──────────────────────
// Swap adjacent animals to match 3+; cascades build combo, combo ≥ 5 ignites
// 10s of double-score fever. Rewritten with generalized run detection (the
// original hand-rolled 3/4/5 cases) and without the coin/level meta layer.

const SIZE = 7;
const ANIMALS = ['🐵', '🐱', '🐷', '🐭', '🐰', '🐶', '🐤'];
const GAME_SECONDS = 60;
const FEVER_COMBO = 5, FEVER_SECONDS = 10;
const BEST_KEY = 'oiyo-animal-pop-best';

type Board = string[][];
type Status = 'idle' | 'playing' | 'over';

const randAnimal = () => ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

/** All cells that belong to a horizontal/vertical run of 3+. */
export function findMatches(board: Board): boolean[][] {
    const matched: boolean[][] = board.map((row) => row.map(() => false));
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            // horizontal run starting here
            if (c === 0 || board[r][c - 1] !== board[r][c]) {
                let len = 1;
                while (c + len < SIZE && board[r][c + len] === board[r][c]) len++;
                if (len >= 3) for (let i = 0; i < len; i++) matched[r][c + i] = true;
            }
            // vertical run starting here
            if (r === 0 || board[r - 1][c] !== board[r][c]) {
                let len = 1;
                while (r + len < SIZE && board[r + len][c] === board[r][c]) len++;
                if (len >= 3) for (let i = 0; i < len; i++) matched[r + i][c] = true;
            }
        }
    }
    return matched;
}

const hasAny = (m: boolean[][]) => m.some((row) => row.some(Boolean));

/** Remove matched cells, drop the rest, refill from the top. */
export function collapse(board: Board, matched: boolean[][]): Board {
    const next: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    for (let c = 0; c < SIZE; c++) {
        const keep: string[] = [];
        for (let r = SIZE - 1; r >= 0; r--) if (!matched[r][c]) keep.push(board[r][c]);
        for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) {
            next[r][c] = i < keep.length ? keep[i] : randAnimal();
        }
    }
    return next;
}

export function makeBoard(): Board {
    let board: Board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, randAnimal));
    // settle any accidental initial matches without scoring
    for (let guard = 0; guard < 20; guard++) {
        const m = findMatches(board);
        if (!hasAny(m)) break;
        board = collapse(board, m);
    }
    return board;
}

const COPY = {
    ko: { title: '애니멀 팝', subtitle: 'Match 3', time: '남은 시간', score: '점수', best: '최고 점수', combo: '콤보', fever: '피버! ×2', start: '게임 시작', over: '타임 업!', restart: '다시 하기', hint: '이웃한 동물을 맞바꿔 3마리 이상 맞추세요 · 연쇄로 콤보 → 피버!' },
    en: { title: 'Animal Pop', subtitle: 'Match 3', time: 'Time', score: 'Score', best: 'Best', combo: 'Combo', fever: 'FEVER! ×2', start: 'Start', over: "Time's Up!", restart: 'Play Again', hint: 'Swap neighbors to match 3+ · chain cascades for combo → fever!' },
    ja: { title: 'アニマルポップ', subtitle: 'Match 3', time: '残り時間', score: 'スコア', best: 'ベスト', combo: 'コンボ', fever: 'フィーバー！×2', start: 'スタート', over: 'タイムアップ！', restart: 'もう一度', hint: '隣り合う動物を入れ替えて3匹以上そろえよう · 連鎖でコンボ→フィーバー！' },
    zh: { title: '动物消消乐', subtitle: 'Match 3', time: '剩余时间', score: '分数', best: '最高分', combo: '连击', fever: '狂热！×2', start: '开始游戏', over: '时间到！', restart: '再玩一次', hint: '交换相邻动物凑成3个以上 · 连锁触发连击→狂热模式！' },
    fr: { title: 'Animal Pop', subtitle: 'Match 3', time: 'Temps', score: 'Score', best: 'Record', combo: 'Combo', fever: 'FIÈVRE ! ×2', start: 'Démarrer', over: 'Temps écoulé !', restart: 'Rejouer', hint: 'Échangez des voisins pour aligner 3+ · les cascades donnent des combos → fièvre !' },
    es: { title: 'Animal Pop', subtitle: 'Match 3', time: 'Tiempo', score: 'Puntos', best: 'Récord', combo: 'Combo', fever: '¡FIEBRE! ×2', start: 'Empezar', over: '¡Se acabó el tiempo!', restart: 'Jugar otra vez', hint: 'Intercambia vecinos para alinear 3+ · encadena cascadas para combo → ¡fiebre!' },
} as const;

const AnimalPop: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [board, setBoard] = useState<Board>(makeBoard);
    const [status, setStatus] = useState<Status>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
    const [combo, setCombo] = useState(0);
    const [feverUntil, setFeverUntil] = useState(0);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [popping, setPopping] = useState<boolean[][] | null>(null);
    const busy = useRef(false);
    const scoreRef = useRef(0);
    scoreRef.current = score;
    const bestRef = useRef(0);
    bestRef.current = best;

    const isFever = Date.now() < feverUntil;

    useEffect(() => {
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBest(stored);
        } catch { /* ignore */ }
    }, []);

    // countdown
    useEffect(() => {
        if (status !== 'playing') return;
        if (timeLeft <= 0) {
            setStatus('over');
            if (scoreRef.current > bestRef.current) {
                setBest(scoreRef.current);
                try { localStorage.setItem(BEST_KEY, String(scoreRef.current)); } catch { /* ignore */ }
            }
            return;
        }
        const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [status, timeLeft]);

    const start = useCallback(() => {
        setBoard(makeBoard());
        setScore(0);
        setTimeLeft(GAME_SECONDS);
        setCombo(0);
        setFeverUntil(0);
        setSelected(null);
        setPopping(null);
        busy.current = false;
        setStatus('playing');
    }, []);

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    /** Resolve cascades on a board, awarding score per wave. */
    const resolve = useCallback(async (input: Board) => {
        busy.current = true;
        let current = input;
        let wave = 0;
        for (; ;) {
            const m = findMatches(current);
            if (!hasAny(m)) break;
            wave++;
            const count = m.flat().filter(Boolean).length;
            const multiplier = Date.now() < feverUntil ? 2 : 1;
            setPopping(m);
            setScore((s) => s + count * 10 * wave * multiplier);
            await sleep(220);
            setPopping(null);
            current = collapse(current, m);
            setBoard(current);
            await sleep(120);
        }
        if (wave > 0) {
            setCombo((c) => {
                const next = c + wave;
                if (next >= FEVER_COMBO) setFeverUntil(Date.now() + FEVER_SECONDS * 1000);
                return next;
            });
        } else {
            setCombo(0);
        }
        busy.current = false;
    }, [combo, feverUntil]);

    const trySwap = useCallback(async (r1: number, c1: number, r2: number, c2: number) => {
        if (busy.current || status !== 'playing') return;
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
        const next = board.map((row) => [...row]);
        [next[r1][c1], next[r2][c2]] = [next[r2][c2], next[r1][c1]];
        if (!hasAny(findMatches(next))) {
            // no match — brief swap-back feedback
            busy.current = true;
            setBoard(next);
            await sleep(160);
            setBoard(board);
            busy.current = false;
            setCombo(0);
            return;
        }
        setBoard(next);
        await resolve(next);
    }, [board, status, resolve]);

    const onCell = (r: number, c: number) => {
        if (busy.current || status !== 'playing') return;
        if (!selected) { setSelected([r, c]); return; }
        const [sr, sc] = selected;
        setSelected(null);
        if (sr === r && sc === c) return;
        void trySwap(sr, sc, r, c);
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={start}>
            <div className="flex justify-between items-center mb-3 text-xs font-bold text-muted-foreground">
                <span>⏱ {t.time}: <span className={`text-base font-black ${timeLeft <= 10 ? 'text-destructive' : 'text-foreground'}`}>{timeLeft}s</span></span>
                <div className="flex items-center gap-3">
                    <span>{t.score}: <span className="text-primary text-base font-black">{score.toLocaleString()}</span></span>
                    <span>{t.best}: <span className="text-chart-2 font-black">{best.toLocaleString()}</span></span>
                </div>
            </div>

            {/* combo / fever banner */}
            <div className="h-6 mb-2 text-center" aria-live="polite">
                {isFever ? (
                    <span className="px-3 py-0.5 rounded-full bg-warning text-warning-foreground text-xs font-black animate-pulse motion-reduce:animate-none">🔥 {t.fever}</span>
                ) : combo >= 2 ? (
                    <span className="text-xs font-black text-primary">{combo} {t.combo}!</span>
                ) : null}
            </div>

            <div className="relative">
                <div
                    className="grid gap-1 p-2 rounded-2xl bg-muted/40 border border-border select-none"
                    style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
                    role="grid" aria-label={t.title}
                >
                    {board.map((row, r) => row.map((animal, c) => {
                        const isSel = selected?.[0] === r && selected?.[1] === c;
                        const isPop = popping?.[r]?.[c];
                        return (
                            <button
                                key={`${r}-${c}`}
                                onClick={() => onCell(r, c)}
                                aria-label={animal}
                                className={`aspect-square flex items-center justify-center text-xl sm:text-2xl rounded-lg transition-all ${
                                    isPop
                                        ? 'scale-0 opacity-0 duration-200'
                                        : isSel
                                            ? 'bg-primary/20 ring-2 ring-primary scale-110'
                                            : 'bg-card hover:bg-muted active:scale-95'
                                }`}
                            >
                                {animal}
                            </button>
                        );
                    }))}
                </div>

                {status !== 'playing' && (
                    <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95" role="status" aria-live="polite">
                        {status === 'over' && (
                            <>
                                <p className="text-2xl font-black text-foreground">{t.over}</p>
                                <p className="text-3xl font-black text-primary">{score.toLocaleString()}</p>
                            </>
                        )}
                        <button
                            onClick={start}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                        >
                            {status === 'over' ? t.restart : t.start}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
        </GameContainer>
    );
};

export default AnimalPop;
