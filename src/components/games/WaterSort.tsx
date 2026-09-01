import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { getBestForConditions, recordBestForConditions, type BestConditions, type ConditionalBestRecord } from '../../lib/games/records';
import { createWaterSort, generateWaterSortPuzzle, isWaterSortDeadEnd, moveWaterSort, pouredLayerCount, waterSortHint, type WaterSortDifficulty, type WaterSortMove, type WaterSortState } from '../../lib/games/water-sort';
import { clearWaterSortSave, loadWaterSortSave, storeWaterSortSave, type WaterSortAssist } from '../../lib/games/water-sort-save';

const COLORS = ['#ef4444', '#2563eb', '#059669', '#d97706', '#7c3aed'];
const PATTERNS = [
    'repeating-linear-gradient(135deg, transparent 0 7px, rgba(255,255,255,.32) 7px 10px)',
    'radial-gradient(circle at 25% 50%, rgba(255,255,255,.4) 0 2px, transparent 3px)',
    'repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,.3) 8px 11px)',
    'repeating-linear-gradient(0deg, transparent 0 7px, rgba(255,255,255,.3) 7px 9px)',
    'linear-gradient(45deg, transparent 35%, rgba(255,255,255,.3) 35% 50%, transparent 50% 85%, rgba(255,255,255,.3) 85%)',
];
const COPY = {
    ko: { title: '워터 소트', subtitle: '색을 읽고, 흐름을 설계하세요', desc: '같은 색의 물을 한 시험관에 정렬하세요.', reset: '새 판', win: '정제 완료!', tube: (i: number, n: number, layers: string) => `시험관 ${i}, 물 ${n}칸, 색상 ${layers || '없음'}`, selected: '선택됨', playAgain: '새 판 시작', undo: '되돌리기', hint: '힌트', hintMove: (a: number, b: number) => `${a}번 → ${b}번 시험관`, deadEnd: '가능한 이동이 없습니다. 되돌리거나 새 판을 시작하세요.', moves: '이동', time: '시간', best: '동일 조건 최고', efficiency: '기준 효율', next: '다음 목표', soundOn: '소리 켜짐', soundOff: '소리 꺼짐', easy: '쉬움', medium: '보통', hard: '어려움', seconds: '초' },
    en: { title: 'Water Sort', subtitle: 'Read the colors. Engineer the flow.', desc: 'Unify each color in its own tube.', reset: 'New board', win: 'Purification complete!', tube: (i: number, n: number, layers: string) => `Tube ${i}, ${n} water layers, colors ${layers || 'empty'}`, selected: 'selected', playAgain: 'New board', undo: 'Undo', hint: 'Hint', hintMove: (a: number, b: number) => `Tube ${a} → ${b}`, deadEnd: 'No legal moves remain. Undo or start a new board.', moves: 'Moves', time: 'Time', best: 'Same-condition best', efficiency: 'Baseline efficiency', next: 'Next target', soundOn: 'Sound on', soundOff: 'Sound off', easy: 'Easy', medium: 'Medium', hard: 'Hard', seconds: 'sec' },
    ja: { title: 'ウォーターソート', subtitle: '色を読み、流れを設計しよう', desc: '同じ色の水を一つの試験管にまとめましょう。', reset: '新しい盤面', win: '精製完了！', tube: (i: number, n: number, layers: string) => `試験管 ${i}、水 ${n} 層、色 ${layers || 'なし'}`, selected: '選択中', playAgain: '新しい盤面', undo: '元に戻す', hint: 'ヒント', hintMove: (a: number, b: number) => `試験管 ${a} → ${b}`, deadEnd: '動かせる手がありません。元に戻すか新しい盤面を始めてください。', moves: '手数', time: '時間', best: '同条件ベスト', efficiency: '基準効率', next: '次の目標', soundOn: 'サウンドオン', soundOff: 'サウンドオフ', easy: '初級', medium: '中級', hard: '上級', seconds: '秒' },
    zh: { title: '倒水排序', subtitle: '辨认颜色，设计流向', desc: '把每种颜色的水集中到一支试管中。', reset: '新棋盘', win: '提纯完成！', tube: (i: number, n: number, layers: string) => `试管 ${i}，${n} 层水，颜色 ${layers || '空'}`, selected: '已选择', playAgain: '新棋盘', undo: '撤销', hint: '提示', hintMove: (a: number, b: number) => `试管 ${a} → ${b}`, deadEnd: '没有可行移动。请撤销或开始新棋盘。', moves: '步数', time: '时间', best: '同条件最佳', efficiency: '基准效率', next: '下一目标', soundOn: '声音开启', soundOff: '声音关闭', easy: '简单', medium: '普通', hard: '困难', seconds: '秒' },
    fr: { title: 'Water Sort', subtitle: 'Lisez les couleurs. Maîtrisez le flux.', desc: 'Réunissez chaque couleur dans son propre tube.', reset: 'Nouveau plateau', win: 'Purification terminée !', tube: (i: number, n: number, layers: string) => `Tube ${i}, ${n} couches, couleurs ${layers || 'vide'}`, selected: 'sélectionné', playAgain: 'Nouveau plateau', undo: 'Annuler', hint: 'Indice', hintMove: (a: number, b: number) => `Tube ${a} → ${b}`, deadEnd: 'Aucun coup légal. Annulez ou lancez un nouveau plateau.', moves: 'Coups', time: 'Temps', best: 'Meilleur à conditions égales', efficiency: 'Efficacité de référence', next: 'Prochain objectif', soundOn: 'Son activé', soundOff: 'Son coupé', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', seconds: 's' },
    es: { title: 'Water Sort', subtitle: 'Lee los colores. Diseña el flujo.', desc: 'Reúne cada color en su propio tubo.', reset: 'Nuevo tablero', win: '¡Purificación completa!', tube: (i: number, n: number, layers: string) => `Tubo ${i}, ${n} capas, colores ${layers || 'vacío'}`, selected: 'seleccionado', playAgain: 'Nuevo tablero', undo: 'Deshacer', hint: 'Pista', hintMove: (a: number, b: number) => `Tubo ${a} → ${b}`, deadEnd: 'No quedan movimientos legales. Deshaz o inicia un tablero nuevo.', moves: 'Movimientos', time: 'Tiempo', best: 'Mejor en iguales condiciones', efficiency: 'Eficiencia de referencia', next: 'Próximo objetivo', soundOn: 'Sonido activado', soundOff: 'Sonido desactivado', easy: 'Fácil', medium: 'Medio', hard: 'Difícil', seconds: 's' },
} as const;

const WaterSort: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();
    const [game, setGame] = useState<WaterSortState | null>(null);
    const [difficulty, setDifficulty] = useState<WaterSortDifficulty>('medium');
    const [selectedTube, setSelectedTube] = useState<number | null>(null);
    const [focusedTube, setFocusedTube] = useState(0);
    const [undo, setUndo] = useState<WaterSortState[]>([]);
    const [hint, setHint] = useState<WaterSortMove | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [assist, setAssist] = useState<WaterSortAssist>('none');
    const [muted, setMuted] = useState(false);
    const [best, setBest] = useState<ConditionalBestRecord | null>(null);
    const [lastPour, setLastPour] = useState<{ to: number; count: number } | null>(null);
    const audioRef = useRef<AudioContext | null>(null);
    const recordedSeedRef = useRef<number | null>(null);
    const tubeRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const playTone = useCallback((frequency: number, duration = 0.08) => {
        if (muted || typeof window === 'undefined') return;
        try {
            const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) return;
            const context = audioRef.current ?? new AudioContextClass(); audioRef.current = context;
            const oscillator = context.createOscillator(); const gain = context.createGain();
            oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
            oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
        } catch { /* optional feedback */ }
    }, [muted]);

    const startGame = useCallback((nextDifficulty: WaterSortDifficulty) => {
        clearWaterSortSave();
        const seed = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
        setGame(createWaterSort(seed, nextDifficulty)); setDifficulty(nextDifficulty); setSelectedTube(null); setFocusedTube(0);
        setUndo([]); setHint(null); setElapsedSeconds(0); setAssist('none'); setBest(null); setLastPour(null); recordedSeedRef.current = null;
    }, []);

    useEffect(() => {
        const saved = loadWaterSortSave();
        if (saved) { setGame(saved.state); setDifficulty(saved.state.difficulty); setUndo(saved.undo); setElapsedSeconds(saved.elapsedSeconds); setAssist(saved.assist); }
        else startGame('medium');
        return () => { void audioRef.current?.close(); };
    }, [startGame]);

    useEffect(() => {
        if (!game) return;
        if (game.status === 'solved') clearWaterSortSave();
        else storeWaterSortSave(game, undo, elapsedSeconds, assist);
    }, [game, undo, elapsedSeconds, assist]);

    useEffect(() => {
        if (!game || game.status === 'solved') return;
        const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [game?.seed, game?.status]);

    useEffect(() => {
        if (!game || game.status !== 'solved' || recordedSeedRef.current === game.seed) return;
        recordedSeedRef.current = game.seed;
        const conditions: BestConditions = { seed: String(game.seed), difficulty: game.difficulty, assist };
        setBest(recordBestForConditions('water-sort', elapsedSeconds, 'seconds', conditions, `${game.moves} moves`));
        playTone(784, 0.3);
    }, [game, elapsedSeconds, assist, playTone]);

    const handleTubeClick = (index: number) => {
        if (!game || game.status === 'solved') return;
        if (selectedTube === null) {
            if (game.tubes[index].length > 0) { setSelectedTube(index); playTone(440); }
            else playTone(180);
            return;
        }
        if (selectedTube === index) { setSelectedTube(null); playTone(330); return; }
        const next = moveWaterSort(game, { from: selectedTube, to: index });
        if (next !== game) {
            setUndo((history) => [...history.slice(-49), game]);
            setLastPour({ to: index, count: pouredLayerCount(game.tubes, next.tubes, index) });
            setGame(next); playTone(620, 0.12);
        }
        else playTone(160, 0.12);
        setHint(null); setSelectedTube(null);
    };

    const undoMove = () => {
        const previous = undo[undo.length - 1]; if (!previous) return;
        setGame(previous); setUndo((history) => history.slice(0, -1)); setSelectedTube(null); setHint(null); setLastPour(null);
        setAssist((value) => value === 'hint' ? value : 'undo'); playTone(300);
    };
    const showHint = () => {
        if (!game) return;
        const nextHint = waterSortHint(game.tubes); setHint(nextHint); setSelectedTube(nextHint?.from ?? null); setAssist('hint'); playTone(520);
    };
    const focusTube = (next: number) => {
        const normalized = Math.max(0, Math.min((game?.tubes.length ?? 1) - 1, next)); setFocusedTube(normalized); tubeRefs.current[normalized]?.focus();
    };

    const tubes = game?.tubes ?? [];
    const isWon = game?.status === 'solved';
    const deadEnd = game ? isWaterSortDeadEnd(game) : false;
    const baseline = game ? generateWaterSortPuzzle(game.seed, game.difficulty).solution.length : 1;
    const efficiency = game ? Math.min(100, Math.round((baseline / Math.max(1, game.moves)) * 100)) : 0;
    const existingBest = game ? getBestForConditions('water-sort', { seed: String(game.seed), difficulty: game.difficulty, assist }) : null;
    const displayedBest = best ?? existingBest;

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => startGame(difficulty)}>
            <div className="flex flex-col items-center">
                <p className="mb-5 text-center text-sm font-medium text-muted-foreground">{t.desc}</p>
                <div className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Difficulty">
                    {(['easy', 'medium', 'hard'] as const).map((level) => <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => startGame(level)} className={`min-h-11 rounded-full border px-4 text-xs font-black ${difficulty === level ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{t[level]}</button>)}
                    <button type="button" aria-pressed={!muted} onClick={() => setMuted((value) => !value)} className="min-h-11 rounded-full border border-border px-4 text-xs font-bold">{muted ? t.soundOff : t.soundOn}</button>
                </div>
                {game && <div className="mb-4 flex gap-5 text-xs font-black text-muted-foreground"><span>{t.moves}: {game.moves}</span><span>{t.time}: {elapsedSeconds} {t.seconds}</span></div>}
                <div className="mb-6 flex gap-2">
                    <button type="button" onClick={undoMove} disabled={undo.length === 0} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold disabled:opacity-40">{t.undo}</button>
                    <button type="button" onClick={showHint} disabled={!game || isWon || deadEnd} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold disabled:opacity-40">{t.hint}</button>
                </div>
                {hint && <p className="mb-5 text-xs font-bold text-primary" role="status">{t.hintMove(hint.from + 1, hint.to + 1)}</p>}
                {deadEnd && <p className="mb-5 max-w-sm text-center text-xs font-bold text-destructive" role="alert">{t.deadEnd}</p>}
                <div className="mb-8 grid grid-cols-4 gap-3 sm:grid-cols-7 sm:gap-4" role="group" aria-label={t.title}>
                    {tubes.map((tube, i) => <button type="button" key={i} ref={(element) => { tubeRefs.current[i] = element; }} tabIndex={focusedTube === i ? 0 : -1} onFocus={() => setFocusedTube(i)} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusTube(i + 1); } if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusTube(i - 1); } if (event.key === 'Home') { event.preventDefault(); focusTube(0); } if (event.key === 'End') { event.preventDefault(); focusTube(tubes.length - 1); } }} onClick={() => handleTubeClick(i)} aria-pressed={selectedTube === i} aria-label={`${t.tube(i + 1, tube.length, tube.map((color) => String(color + 1)).join('-'))}${selectedTube === i ? `, ${t.selected}` : ''}`} className={`relative h-32 w-12 cursor-pointer overflow-hidden rounded-b-3xl border-4 border-muted sm:h-40 sm:w-14 ${!reducedMotion ? 'transition-all' : ''} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-4 ${selectedTube === i ? `ring-4 ring-primary ring-offset-4 ${!reducedMotion ? '-translate-y-3' : ''}` : (!reducedMotion ? 'hover:-translate-y-1' : '')}`}>
                        <span className="absolute inset-0 flex flex-col-reverse">{tube.map((color, idx) => {
                            const poured = Boolean(lastPour && lastPour.to === i && lastPour.count > 0 && idx >= tube.length - lastPour.count);
                            return <span key={idx} style={{ backgroundColor: COLORS[color], backgroundImage: PATTERNS[color], backgroundSize: color === 1 ? '12px 12px' : undefined }} className={`h-1/4 w-full ${poured && !reducedMotion ? 'oiyo-pour' : ''}`} />;
                        })}</span>
                    </button>)}
                </div>
                {isWon && game && <div className={`w-full max-w-md rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center ${!reducedMotion ? 'animate-in zoom-in-95' : ''}`} role="status">
                    <h4 className="mb-4 text-2xl font-black text-primary">{t.win}</h4>
                    <div className="mb-5 grid grid-cols-2 gap-3 text-sm"><p><strong>{t.moves}</strong><br />{game.moves}</p><p><strong>{t.time}</strong><br />{elapsedSeconds} {t.seconds}</p><p><strong>{t.efficiency}</strong><br />{efficiency}%</p><p><strong>{t.best}</strong><br />{displayedBest?.value ?? elapsedSeconds} {t.seconds}</p></div>
                    <p className="mb-5 text-xs font-bold text-muted-foreground">{t.next}: {Math.max(0, (displayedBest?.value ?? elapsedSeconds) - 1)} {t.seconds}</p>
                    <button type="button" onClick={() => startGame(difficulty)} className="min-h-12 rounded-full bg-primary px-10 font-bold text-primary-foreground shadow-lg">{t.playAgain}</button>
                </div>}
            </div>
        </GameContainer>
    );
};

export default WaterSort;
