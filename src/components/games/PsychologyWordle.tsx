import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { backspacePsychologyWordle, createPsychologyWordle, evaluatePsychologyWordleGuess, inputPsychologyWordle, PSYCHOLOGY_WORDLE_MAX_GUESSES, restartPsychologyWordle, submitPsychologyWordle, type PsychologyWordleTile } from '../../lib/games/psychology-wordle';
import { dayIndex, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import { clearPsychologyWordleSave, loadPsychologyWordleSave, storePsychologyWordleSave, type PsychologyWordleMode } from '../../lib/games/psychology-wordle-save';

const DEFINITIONS: Record<string, { ko: string; en: string }> = {
    감정: { ko: '상황에 대한 마음과 몸의 반응', en: 'A mind-body response to a situation' }, 기억: { ko: '경험한 정보를 저장하고 떠올리는 기능', en: 'The ability to store and recall experience' }, 공감: { ko: '타인의 감정과 관점을 이해하는 능력', en: 'Understanding another person’s feelings and perspective' },
    BRAIN: { ko: '사고·감정·행동을 조절하는 신경계의 중심', en: 'The nervous system center governing thought, emotion, and action' }, DREAM: { ko: '수면 중 나타나는 감각과 이야기 경험', en: 'A sensory and narrative experience during sleep' }, HABIT: { ko: '반복으로 자동화된 행동 경향', en: 'A behavior made automatic through repetition' }, TRUST: { ko: '상대의 신뢰성을 기대하는 심리 상태', en: 'A psychological expectation of another’s reliability' }, FOCUS: { ko: '주의 자원을 한 대상에 모으는 상태', en: 'Directing attentional resources toward one target' }, LOGIC: { ko: '일관된 규칙에 따라 결론을 이끄는 추론', en: 'Reasoning toward conclusions through consistent rules' },
};

const COPY = {
    ko: {
        title: '심리학 워들',
        subtitle: 'Psychology Vocab',
        desc: (n: number, s: number) => `심리학 단어를 자모 단위로 맞춰보세요 (${s}글자 · 자모 ${n}칸)`,
        won: '천재시군요!',
        lost: '아쉽네요. 정답은:',
        playAgain: '다시 하기 (새 단어)',
        enter: '입력',
        del: '지움',
        daily: '오늘의 단어', random: '무작위', streak: '연속 학습', definition: '오늘의 심리 개념', days: '일', restored: '진행을 복원했습니다', soundOn: '소리 켜짐', soundOff: '소리 꺼짐', share: '결과 복사', copied: '결과를 복사했습니다', attempts: '사용한 기회', keyGuide: '키보드로 글자를 입력하고 Enter로 제출하세요', correct: '정답 위치', present: '다른 위치', absent: '없음',
    },
    en: {
        title: 'Psycho Wordle',
        subtitle: 'Psychology Vocab',
        desc: (n: number) => `Guess the psychology term (${n} letters)`,
        won: "You're a Genius!",
        lost: 'Too bad. The word was:',
        playAgain: 'Play Again (new word)',
        enter: 'ENTER',
        del: 'DEL',
        daily: 'Daily word', random: 'Random', streak: 'Learning streak', definition: 'Psychology concept', days: 'days', restored: 'Progress restored', soundOn: 'Sound on', soundOff: 'Sound off', share: 'Copy result', copied: 'Result copied', attempts: 'Attempts used', keyGuide: 'Type letters and press Enter to submit', correct: 'Correct', present: 'Elsewhere', absent: 'Absent',
    },
    // ja/zh/fr/es share the English word pool below (no Korean jamo, no Latin-script word
    // list curated for these locales yet) — only the surrounding UI copy is localized.
    ja: {
        title: '心理学ワードル',
        subtitle: 'Psychology Vocab',
        desc: (n: number) => `心理学の英単語を当ててみましょう（${n}文字）`,
        won: '天才ですね！',
        lost: '残念、正解は:',
        playAgain: 'もう一度（新しい単語）',
        enter: 'ENTER',
        del: 'DEL',
        daily: '今日の単語', random: 'ランダム', streak: '連続学習', definition: '心理学の概念', days: '日', restored: '進行を復元しました', soundOn: 'サウンドオン', soundOff: 'サウンドオフ', share: '結果をコピー', copied: 'コピーしました', attempts: '使用回数', keyGuide: '文字を入力し Enter で送信', correct: '正解', present: '別の位置', absent: 'なし',
    },
    zh: {
        title: '心理学猜词',
        subtitle: 'Psychology Vocab',
        desc: (n: number) => `猜出这个心理学英语单词（${n}个字母）`,
        won: '你真是个天才！',
        lost: '可惜，答案是:',
        playAgain: '再来一次（新单词）',
        enter: 'ENTER',
        del: 'DEL',
        daily: '每日单词', random: '随机', streak: '连续学习', definition: '心理学概念', days: '天', restored: '进度已恢复', soundOn: '声音开启', soundOff: '声音关闭', share: '复制结果', copied: '结果已复制', attempts: '已用次数', keyGuide: '输入字母并按 Enter 提交', correct: '位置正确', present: '其他位置', absent: '没有',
    },
    fr: {
        title: 'Wordle Psycho',
        subtitle: 'Psychology Vocab',
        desc: (n: number) => `Devinez ce terme de psychologie en anglais (${n} lettres)`,
        won: 'Vous êtes un génie !',
        lost: "Dommage. Le mot était :",
        playAgain: 'Rejouer (nouveau mot)',
        enter: 'ENTER',
        del: 'EFF',
        daily: 'Mot du jour', random: 'Aléatoire', streak: 'Série d’apprentissage', definition: 'Concept psychologique', days: 'jours', restored: 'Progression restaurée', soundOn: 'Son activé', soundOff: 'Son coupé', share: 'Copier le résultat', copied: 'Résultat copié', attempts: 'Essais utilisés', keyGuide: 'Tapez les lettres puis Entrée', correct: 'Correct', present: 'Ailleurs', absent: 'Absent',
    },
    es: {
        title: 'Wordle Psico',
        subtitle: 'Psychology Vocab',
        desc: (n: number) => `Adivina este término de psicología en inglés (${n} letras)`,
        won: '¡Eres un genio!',
        lost: 'Qué pena. La palabra era:',
        playAgain: 'Jugar de nuevo (palabra nueva)',
        enter: 'ENTER',
        del: 'BORRAR',
        daily: 'Palabra diaria', random: 'Aleatorio', streak: 'Racha de aprendizaje', definition: 'Concepto psicológico', days: 'días', restored: 'Progreso restaurado', soundOn: 'Sonido activado', soundOff: 'Sonido desactivado', share: 'Copiar resultado', copied: 'Resultado copiado', attempts: 'Intentos usados', keyGuide: 'Escribe letras y pulsa Enter', correct: 'Correcta', present: 'Otro lugar', absent: 'Ausente',
    },
} as const;

const TILE_CLASSES: Record<PsychologyWordleTile, string> = {
    correct: 'bg-success text-success-foreground border-success',
    present: 'bg-warning text-warning-foreground border-warning',
    absent: 'bg-muted text-muted-foreground border-muted',
};

const PsychologyWordle: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();

    const [game, setGame] = useState(() => createPsychologyWordle(0x50535943, isKo ? 'ko' : 'latin'));
    const [mode, setMode] = useState<PsychologyWordleMode>('random');
    const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
    const [streak, setStreak] = useState<DailyStreak>({ played: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null });
    const [restored, setRestored] = useState(false);
    const [muted, setMuted] = useState(false);
    const [copied, setCopied] = useState(false);
    const countedSeed = useRef<number | null>(null);
    const audioRef = useRef<AudioContext | null>(null);
    const { targetDisplay, target, guesses, currentGuess, status } = game;
    const wordLen = target.length;

    const playTone = useCallback((frequency: number, duration = 0.08) => {
        if (muted || typeof window === 'undefined') return;
        try { const context = audioRef.current ?? new AudioContext(); audioRef.current = context; const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.04, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration); } catch { /* optional feedback */ }
    }, [muted]);

    useEffect(() => {
        const saved = loadPsychologyWordleSave();
        if (saved) { setGame(saved.state); setMode(saved.mode); setActiveDateKey(saved.dateKey); setRestored(true); }
        const key = todayKey(); setStreak(getDailyStreak('psychology-wordle', key, previousDayKey(key)));
        return () => { void audioRef.current?.close(); };
    }, []);
    useEffect(() => { if (game.status === 'playing') storePsychologyWordleSave(game, mode, activeDateKey); else clearPsychologyWordleSave(); }, [game, mode, activeDateKey]);
    useEffect(() => {
        if (game.status !== 'won' || mode !== 'daily' || !activeDateKey || countedSeed.current === game.seed) return;
        countedSeed.current = game.seed; setStreak(recordDailyWin('psychology-wordle', activeDateKey, previousDayKey(activeDateKey)));
    }, [game, mode, activeDateKey]);

    const startMode = (nextMode: PsychologyWordleMode) => {
        const key = todayKey(); const seed = nextMode === 'daily' ? (dayIndex() ^ (isKo ? 0x4b4f : 0x454e)) >>> 0 : (crypto.getRandomValues?.(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
        clearPsychologyWordleSave(); setMode(nextMode); setActiveDateKey(nextMode === 'daily' ? key : null); setGame(createPsychologyWordle(seed, isKo ? 'ko' : 'latin')); setRestored(false); countedSeed.current = null;
    };

    const handleInput = (char: string) => {
        setGame((state) => inputPsychologyWordle(state, char)); playTone(360);
    };

    const handleBackspace = useCallback(() => { setGame(backspacePsychologyWordle); playTone(220); }, [playTone]);

    const handleSubmit = useCallback(() => { setGame((state) => { const next = submitPsychologyWordle(state); if (next === state) playTone(150); else playTone(next.status === 'won' ? 760 : next.status === 'lost' ? 130 : 520, next.status === 'playing' ? 0.1 : 0.25); return next; }); }, [playTone]);

    const restart = () => {
        if (mode === 'daily') startMode('daily'); else setGame(restartPsychologyWordle);
    };

    const keys = isKo
        ? 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('')
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || game.status !== 'playing') return;
            if (event.key === 'Enter') { event.preventDefault(); handleSubmit(); return; }
            if (event.key === 'Backspace') { event.preventDefault(); handleBackspace(); return; }
            const key = isKo ? event.key : event.key.toUpperCase();
            if (keys.includes(key)) { event.preventDefault(); handleInput(key); }
        };
        window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
    }, [game.status, handleBackspace, handleSubmit, isKo, keys.join('')]);

    const keyStates = new Map<string, PsychologyWordleTile>();
    const rank = { absent: 0, present: 1, correct: 2 } as const;
    guesses.forEach((guess) => evaluatePsychologyWordleGuess(guess, target).forEach((tile, index) => { const key = guess[index]; const before = keyStates.get(key); if (!before || rank[tile] > rank[before]) keyStates.set(key, tile); }));
    const symbols: Record<PsychologyWordleTile, string> = { correct: '✓', present: '◆', absent: '×' };
    const shareResult = async () => {
        const rows = guesses.map((guess) => evaluatePsychologyWordleGuess(guess, target).map((tile) => tile === 'correct' ? '🟩' : tile === 'present' ? '🟨' : '⬛').join(''));
        const text = `${t.title} ${mode} ${status === 'won' ? guesses.length : 'X'}/${PSYCHOLOGY_WORDLE_MAX_GUESSES}\n${rows.join('\n')}`;
        try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={restart}>
            <div className="mb-4 flex justify-center gap-2">
                <button type="button" aria-pressed={mode === 'daily'} onClick={() => startMode('daily')} className={`min-h-11 rounded-full border px-4 text-xs font-bold ${mode === 'daily' ? 'bg-primary text-primary-foreground' : 'border-border'}`}>{t.daily}</button>
                <button type="button" aria-pressed={mode === 'random'} onClick={() => startMode('random')} className={`min-h-11 rounded-full border px-4 text-xs font-bold ${mode === 'random' ? 'bg-primary text-primary-foreground' : 'border-border'}`}>{t.random}</button>
                <button type="button" aria-pressed={!muted} onClick={() => setMuted((value) => !value)} className="min-h-11 rounded-full border border-border px-4 text-xs font-bold">{muted ? t.soundOff : t.soundOn}</button>
            </div>
            <p className="mb-3 text-center text-xs font-bold text-muted-foreground">{t.streak}: {streak.currentStreak} {t.days}</p>
            {restored && <p className="mb-3 text-center text-xs font-bold text-primary" role="status">{t.restored}</p>}
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest mb-6">
                {isKo ? (t.desc as (n: number, s: number) => string)(wordLen, targetDisplay.length) : (t.desc as (n: number) => string)(wordLen)}
            </p>
            <p className="sr-only">{t.keyGuide}. ✓ {t.correct}, ◆ {t.present}, × {t.absent}.</p>

            <div className="grid gap-2 mb-8" role="grid" aria-label={t.title}>
                {Array.from({ length: PSYCHOLOGY_WORDLE_MAX_GUESSES }).map((_, i) => {
                    const isSubmitted = i < guesses.length;
                    const row = isSubmitted ? guesses[i] : i === guesses.length ? currentGuess : [];
                    const states = isSubmitted ? evaluatePsychologyWordleGuess(guesses[i], target) : null;

                    return (
                        <div key={i} className="flex justify-center gap-1.5" role="row">
                            {Array.from({ length: wordLen }).map((_, j) => {
                                const char = row[j] ?? '';
                                return (
                                    <div aria-label={states ? `${char}, ${t[states[j]]}` : char || undefined}
                                        key={j}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl font-black text-lg sm:text-xl border-2 transition-all ${
                                            states
                                                ? TILE_CLASSES[states[j]]
                                                : char ? 'border-primary text-foreground' : 'border-muted text-muted-foreground'
                                        }`}
                                    >
                                        {char}{states && <span className="ml-1 text-[10px]" aria-hidden="true">{symbols[states[j]]}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {status === 'playing' ? (
                <div className="flex flex-wrap justify-center gap-1">
                    {keys.map((key) => (
                        (() => { const keyState = keyStates.get(key); return (
                        <button
                            key={key}
                            onClick={() => handleInput(key)}
                            aria-label={`${key}${keyState ? `, ${t[keyState]}` : ''}`}
                            className={`min-h-11 min-w-11 rounded-lg border px-2 text-xs font-bold active:scale-90 ${keyState ? TILE_CLASSES[keyState] : 'border-border bg-muted text-foreground hover:bg-accent'}`}
                        >
                            {key}{keyState && <span className="ml-1 text-[9px]" aria-hidden="true">{symbols[keyState]}</span>}
                        </button>
                        ); })()
                    ))}
                    <button onClick={handleBackspace} aria-label="Backspace" className="min-h-11 px-3 bg-muted text-foreground rounded-lg text-xs font-bold border border-border hover:bg-accent transition-colors">{t.del}</button>
                    <button onClick={handleSubmit} disabled={currentGuess.length !== wordLen} className="min-h-11 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">{t.enter}</button>
                </div>
            ) : (
                <div className={`text-center ${!reducedMotion ? 'animate-fade-up' : ''}`} role="status" aria-live="polite">
                    <p className="text-lg font-bold text-foreground mb-4">
                        {status === 'won' ? t.won : `${t.lost} ${targetDisplay}`}
                    </p>
                    <div className="mx-auto mb-5 max-w-sm rounded-2xl border border-border bg-muted/40 p-4"><p className="mb-1 text-xs font-black uppercase tracking-wide text-primary">{t.definition}</p><p className="text-sm text-muted-foreground">{(DEFINITIONS[targetDisplay]?.[isKo ? 'ko' : 'en']) ?? (isKo ? '핵심 심리학 어휘입니다.' : 'A core term used in psychology.')}</p></div>
                    <p className="mb-4 text-sm font-bold">{t.attempts}: {guesses.length}/{PSYCHOLOGY_WORDLE_MAX_GUESSES}</p>
                    <button type="button" onClick={shareResult} className="mb-3 min-h-11 rounded-full border border-primary px-6 text-sm font-bold text-primary">{copied ? t.copied : t.share}</button><br />
                    <button
                        onClick={restart}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                    >
                        {t.playAgain}
                    </button>
                </div>
            )}
        </GameContainer>
    );
};

export default PsychologyWordle;
