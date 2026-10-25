import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, Maximize2, Minimize2, QrCode, Share2, Volume2, VolumeX } from 'lucide-react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from '../../lib/games/share-card';
import { dayIndex, mulberry32, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import { generateChallengeQrSvg } from '../../lib/games/challenge-qr';
import { buildChallengeUrl, generateChallengeCopy } from '../../lib/games/seed-challenge';
import { DailyPuzzleCalendarModal } from '../ui/game/DailyPuzzleCalendarModal';
import { recordDailyPuzzleClear } from '../../lib/games/daily-calendar';
import {
    autoMarkAdjacentWhites,
    generateKurodokoPuzzle,
    getKurodokoConflicts,
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
    ko: { title: '쿠로도코', subtitle: 'Nikoli Logic', desc: '숫자 칸에서 보이는 흰 칸 수(자신 포함)가 숫자와 같아지도록 검은 칸을 칠하세요. 검은 칸은 붙을 수 없고 흰 칸은 모두 연결돼야 합니다.', daily: '📅 오늘의 퍼즐', easy: '쉬움 5×5', medium: '보통 6×6', hard: '어려움 7×7', win: '완벽한 추리력이에요!', errNumber: '숫자 조건이 깨졌어요', errAdjacent: '검은 칸이 붙어 있어요', errDisconnected: '흰 칸이 끊겼어요', moves: '이동', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓' },
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
    const [showQrModal, setShowQrModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const challengeUrl = typeof window !== 'undefined'
        ? buildChallengeUrl({
            baseUrl: window.location.origin,
            locale: locale as any,
            slug: 'kurodoko',
            seed,
            score: Math.max(1, seconds),
        })
        : '';

    const handleCopyChallenge = () => {
        if (!challengeUrl) return;
        const copyText = generateChallengeCopy({
            locale: locale as any,
            gameTitle: t.title,
            score: Math.max(1, seconds),
            url: challengeUrl,
        });
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(copyText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            });
        }
    };
    const [shareCardCopied, setShareCardCopied] = useState(false);

    const handleShareCard = useCallback(async () => {
        const size = puzzle.length;
        const canvas = createShareCardCanvas({
            title: "Kurodoko",
            subtitle: mode === 'daily' ? `Daily Logic (${dailyDate})` : `${size}×${size} Logic Grid`,
            score: `${moves} Moves`,
            slug: "kurodoko",
            customStats: [
                { label: "Board Size", value: `${size}×${size}` },
                { label: "Time", value: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` },
                ...(streak ? [{ label: "Streak", value: `${streak.currentStreak} Days` }] : []),
            ],
        });
        const ok = await copyShareCardToClipboard(canvas);
        if (ok) {
            setShareCardCopied(true);
            setTimeout(() => setShareCardCopied(false), 2000);
        } else {
            downloadShareCard(canvas, `kurodoko-${dailyDate || size}.png`);
        }
    }, [puzzle.length, mode, dailyDate, moves, seconds, streak]);
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
    const [muted, setMuted] = useState<boolean>(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem('kurodoko_sound_muted') === 'true';
            }
        } catch {}
        return false;
    });

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const next = !m;
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('kurodoko_sound_muted', String(next));
                }
            } catch {}
            return next;
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                togglePortal();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMute();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePortal, toggleMute]);

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
        if (v.complete) {
            clearKurodokoSaveV1();
            if (containerRef.current) celebrate(containerRef.current, { preset: "tiles" });
        }
        if (v.complete && mode === 'daily') {
            const today = todayKey();
            setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            recordDailyPuzzleClear('kurodoko', dailyDate);
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

    const conflicts = useMemo(() => getKurodokoConflicts(playableBoard(board), puzzle), [board, puzzle]);

    const handleAutoMark = () => {
        if (validation.complete) return;
        const { nextMarks, changedCount } = autoMarkAdjacentWhites(board);
        if (changedCount === 0) return;
        setHistory((items) => [...items.slice(-49), board.map((row) => [...row])]);
        setBoard(nextMarks);
        setMoves((m) => m + 1);
        const v = validateKurodokoBoard(playableBoard(nextMarks), puzzle);
        setValidation(v);
        playTone(v.complete ? 'win' : 'move', muted);
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
        <div
            ref={containerRef}
            data-game-surface
            className={
                isImmersive
                    ? "fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col items-center justify-between m-0 select-none"
                    : "relative"
            }
        >
            <GameContainer title={t.title} subtitle={a11y.subtitle} resetLabel={a11y.reset} onReset={() => newPuzzle(mode === 'daily' ? 'daily' : difficulty)}>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t.desc}</p>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex flex-wrap gap-1">
                        <button onClick={() => newPuzzle('daily')}
                            aria-pressed={mode === 'daily'}
                            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t.daily}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCalendarOpen(true)}
                            title="과거 데일리 퍼즐 아카이브 달력"
                            className="min-h-11 px-2.5 py-2 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <Calendar className="size-3.5" />
                            <span className="hidden sm:inline">아카이브</span>
                        </button>
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                            <button key={d} onClick={() => newPuzzle(d)}
                                aria-pressed={mode === 'free' && difficulty === d}
                                className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'free' && difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                                {t[d]}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                        <button type="button" onClick={handleAutoMark} disabled={validation.complete}
                            title="검은 칸 주변을 흰색으로 자동 마킹"
                            className="min-h-11 rounded-lg border border-primary/30 bg-primary/5 px-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            ⚡ 자동 마킹
                        </button>
                        <button type="button" onClick={undo} disabled={history.length === 0 || validation.complete}
                            className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            ↶ {a11y.undo}
                        </button>
                        <button type="button" onClick={toggleMute}
                            aria-label={muted ? portalLabels.unmute : portalLabels.mute} aria-pressed={!muted}
                            title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
                            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                        </button>
                        <button type="button" onClick={togglePortal}
                            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} aria-pressed={isImmersive}
                            title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
                            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                        </button>
                        <span className="pl-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.moves} {moves} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
                    </div>
                </div>

                <p className="mb-3 text-center text-xs font-medium text-muted-foreground">{a11y.hint}</p>

            {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
                    🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                    {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                </p>
            )}

            <div
                className={`grid gap-0.5 sm:gap-1 p-1 sm:p-2 bg-muted/30 rounded-xl border border-border mx-auto max-w-sm overflow-x-auto ${validation.complete ? 'ring-2 ring-success' : ''} ${size === 5 ? 'grid-cols-5' : size === 6 ? 'grid-cols-6' : 'grid-cols-7'}`}
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
                                const key = `${r}-${c}`;
                                const isSatisfied = conflicts.satisfiedClues.has(key);
                                const isBroken = conflicts.brokenClues.has(key);
                                const clueToneCls = isBroken
                                    ? 'border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive'
                                    : isSatisfied
                                        ? 'border-success/80 bg-success/10 text-success'
                                        : 'bg-card border-2 border-foreground/60 text-foreground';
                                return (
                                    <div key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} role="gridcell"
                                        tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 1} aria-colindex={c + 1}
                                        aria-label={`${position}: ${a11y.clue} ${n}${isSatisfied ? ' (충족)' : isBroken ? ' (시야 부족)' : ''}`} onFocus={() => setActiveCell(index)}
                                        onKeyDown={(event) => handleGridKeyDown(event, index)}
                                        className={`${common} ${clueToneCls} cursor-default`}>
                                        {n}
                                    </div>
                                );
                            }
                            const isAdjacentConflict = cell === 1 && conflicts.adjacentBlacks.has(`${r}-${c}`);
                            const conflictBorderCls = isAdjacentConflict ? 'border-destructive ring-2 ring-destructive animate-pulse' : '';
                            return (
                                <button key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} type="button" role="gridcell"
                                    onClick={() => { setActiveCell(index); toggle(r, c); }}
                                    onContextMenu={(event) => { event.preventDefault(); setActiveCell(index); toggle(r, c, true); }} aria-disabled={validation.complete}
                                    tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 1} aria-colindex={c + 1}
                                    aria-label={`${position}: ${cell === 1 ? a11y.black : cell === 0 ? a11y.white : a11y.unknown}${isAdjacentConflict ? ' (인접 검은 칸 충돌)' : ''}`}
                                    onFocus={() => setActiveCell(index)} onKeyDown={(event) => handleGridKeyDown(event, index)}
                                    className={`${common} ${conflictBorderCls} relative overflow-hidden ${cell === 1 ? 'border-foreground shadow-inner' : cell === 0 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border hover:bg-muted motion-safe:active:scale-95'}`}>
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
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleShareCard}
                                className="min-h-11 px-4 py-2 rounded-xl border border-primary/50 bg-primary/20 shadow-xs text-xs font-bold text-primary hover:bg-primary/30 transition-colors flex items-center gap-1.5"
                                title={shareCardCopied ? "복사됨!" : "결과 카드"}
                            >
                                {shareCardCopied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                                <span>{shareCardCopied ? "복사 완료" : "결과 카드"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCopyChallenge}
                                className="min-h-11 px-4 py-2 rounded-xl border border-border bg-background shadow-xs text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                            >
                                {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
                                <span>{copied ? '링크 복사됨!' : '챌린지 공유'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(true)}
                                className="min-h-11 px-4 py-2 rounded-xl border border-border bg-background shadow-xs text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                            >
                                <QrCode className="size-4" />
                                <span>QR 코드</span>
                            </button>
                        </div>
                    </div>
                ) : validation.error ? (
                    <p className="text-xs font-bold text-destructive">
                        {validation.error === 'number' ? t.errNumber : validation.error === 'adjacent' ? t.errAdjacent : t.errDisconnected}
                    </p>
                ) : null}
            </div>
        </GameContainer>
        {showQrModal && challengeUrl && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                onClick={() => setShowQrModal(false)}
            >
                <div
                    className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 text-center shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-base font-bold text-foreground">모바일로 챌린지 열기</h3>
                    <p className="text-xs text-muted-foreground">스마트폰 카메라로 QR 코드를 스캔하세요.</p>
                    <div
                        className="mx-auto flex size-52 items-center justify-center rounded-xl bg-white p-2 shadow-inner"
                        dangerouslySetInnerHTML={{
                            __html: generateChallengeQrSvg(challengeUrl, { size: 200 }),
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        className="w-full min-h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                    >
                        닫기
                    </button>
                </div>
            </div>
        )}
        <DailyPuzzleCalendarModal
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            gameSlug="kurodoko"
            gameTitle={t.title}
            onSelectDate={(selectedDate) => {
                const parts = selectedDate.split('-').map(Number);
                const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const nextSeed = kurodokoDailySeed(dayIndex(targetDate));
                const p = generateKurodokoPuzzle(DAILY_DIFFICULTY, mulberry32(nextSeed)).puzzle;
                setMode('daily');
                setDifficulty(DAILY_DIFFICULTY);
                setDailyDate(selectedDate);
                setSeed(nextSeed);
                setPuzzle(p);
                setBoard(initialMarks(p));
                setHistory([]);
                setMoves(0);
                setSeconds(0);
                setValidation({ ok: true, complete: false, error: null });
                setActiveCell(0);
                clearKurodokoSaveV1();
                setIsCalendarOpen(false);
            }}
        />
    </div>
);
};

export default Kurodoko;
