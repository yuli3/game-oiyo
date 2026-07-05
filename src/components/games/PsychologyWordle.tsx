import React, { useMemo, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type TileState = 'correct' | 'present' | 'absent';

// ─── Hangul jamo decomposition ───────────────────────────────────────────────
// Korean answers are played at the jamo level (감정 → ㄱㅏㅁㅈㅓㅇ), matching the
// on-screen jamo keyboard. Words below only use basic jamo present on the keyboard.
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function toJamo(word: string): string[] {
    const out: string[] = [];
    for (const ch of word) {
        const code = ch.charCodeAt(0) - 0xac00;
        if (code < 0 || code > 11171) { out.push(ch); continue; }
        out.push(CHO[Math.floor(code / 588)]);
        out.push(JUNG[Math.floor((code % 588) / 28)]);
        const jong = JONG[code % 28];
        if (jong) out.push(jong);
    }
    return out;
}

// Psychology terms — ko uses only jamo available on the on-screen keyboard
const KO_WORDS = ['감정', '기억', '공감', '불안', '인지', '자아', '동기', '기분', '통찰', '신념', '본능', '몰입', '이성', '착각'];
const EN_WORDS = ['BRAIN', 'DREAM', 'SLEEP', 'HABIT', 'TRUST', 'GUILT', 'PRIDE', 'FOCUS', 'SENSE', 'LOGIC', 'ANGER'];

const MAX_GUESSES = 6;

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
    },
} as const;

// Two-pass wordle evaluation (handles duplicate letters correctly)
function evaluate(guess: string[], target: string[]): TileState[] {
    const result: TileState[] = Array(target.length).fill('absent');
    const used = Array(target.length).fill(false);
    for (let i = 0; i < target.length; i++) {
        if (guess[i] === target[i]) { result[i] = 'correct'; used[i] = true; }
    }
    for (let i = 0; i < target.length; i++) {
        if (result[i] === 'correct') continue;
        const idx = target.findIndex((c, j) => c === guess[i] && !used[j]);
        if (idx !== -1) { result[i] = 'present'; used[idx] = true; }
    }
    return result;
}

const TILE_CLASSES: Record<TileState, string> = {
    correct: 'bg-success text-success-foreground border-success',
    present: 'bg-warning text-warning-foreground border-warning',
    absent: 'bg-muted text-muted-foreground border-muted',
};

const PsychologyWordle: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';
    const t = COPY[isKo ? 'ko' : 'en'];

    const pickWord = () => {
        const pool = isKo ? KO_WORDS : EN_WORDS;
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const [targetDisplay, setTargetDisplay] = useState(pickWord);
    const target = useMemo(() => (isKo ? toJamo(targetDisplay) : targetDisplay.split('')), [isKo, targetDisplay]);
    const wordLen = target.length;

    const [guesses, setGuesses] = useState<string[][]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>([]);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const handleInput = (char: string) => {
        if (status !== 'playing') return;
        if (currentGuess.length < wordLen) setCurrentGuess((prev) => [...prev, char]);
    };

    const handleBackspace = () => setCurrentGuess((prev) => prev.slice(0, -1));

    const handleSubmit = () => {
        if (status !== 'playing' || currentGuess.length !== wordLen) return;
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess([]);

        if (currentGuess.join('') === target.join('')) setStatus('won');
        else if (newGuesses.length >= MAX_GUESSES) setStatus('lost');
    };

    const restart = () => {
        setTargetDisplay(pickWord());
        setGuesses([]);
        setCurrentGuess([]);
        setStatus('playing');
    };

    const keys = isKo
        ? 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('')
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={restart}>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest mb-6">
                {isKo ? (t.desc as (n: number, s: number) => string)(wordLen, targetDisplay.length) : (t.desc as (n: number) => string)(wordLen)}
            </p>

            <div className="grid gap-2 mb-8" role="grid" aria-label={t.title}>
                {Array.from({ length: MAX_GUESSES }).map((_, i) => {
                    const isSubmitted = i < guesses.length;
                    const row = isSubmitted ? guesses[i] : i === guesses.length ? currentGuess : [];
                    const states = isSubmitted ? evaluate(guesses[i], target) : null;

                    return (
                        <div key={i} className="flex justify-center gap-1.5" role="row">
                            {Array.from({ length: wordLen }).map((_, j) => {
                                const char = row[j] ?? '';
                                return (
                                    <div
                                        key={j}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl font-black text-lg sm:text-xl border-2 transition-all ${
                                            states
                                                ? TILE_CLASSES[states[j]]
                                                : char ? 'border-primary text-foreground' : 'border-muted text-muted-foreground'
                                        }`}
                                    >
                                        {char}
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
                        <button
                            key={key}
                            onClick={() => handleInput(key)}
                            className="min-w-[2rem] px-2 py-2 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-accent active:scale-90 transition-all border border-border"
                        >
                            {key}
                        </button>
                    ))}
                    <button onClick={handleBackspace} aria-label="Backspace" className="px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-bold border border-border hover:bg-accent transition-colors">{t.del}</button>
                    <button onClick={handleSubmit} disabled={currentGuess.length !== wordLen} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">{t.enter}</button>
                </div>
            ) : (
                <div className="text-center animate-fade-up" role="status" aria-live="polite">
                    <p className="text-lg font-bold text-foreground mb-4">
                        {status === 'won' ? t.won : `${t.lost} ${targetDisplay}`}
                    </p>
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
