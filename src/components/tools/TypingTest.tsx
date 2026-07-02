import React, { useState, useEffect, useRef, useCallback } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const L: Record<Locale, {
  title: string; subtitle: string;
  wpm: string; accuracy: string; time: string;
  start: string; restart: string; result: string;
  typingPrompt: string; duration: string;
  chars: string; errors: string;
  dur15: string; dur30: string; dur60: string;
  excellent: string; great: string; good: string; keep: string;
}> = {
  ko: { title: '타이핑 속도 테스트', subtitle: 'Typing Speed Test (WPM)', wpm: '타수(WPM)', accuracy: '정확도', time: '시간', start: '시작', restart: '다시 하기', result: '결과', typingPrompt: '타이핑을 시작하면 테스트가 시작됩니다', duration: '시간 선택', chars: '글자 수', errors: '오류', dur15: '15초', dur30: '30초', dur60: '1분', excellent: '탁월해요! 전문가 수준입니다.', great: '훌륭해요! 평균 이상입니다.', good: '좋아요! 꾸준히 연습하세요.', keep: '계속 연습하면 빠르게 늘어납니다!' },
  en: { title: 'Typing Speed Test', subtitle: 'WPM — Words Per Minute', wpm: 'WPM', accuracy: 'Accuracy', time: 'Time', start: 'Start', restart: 'Restart', result: 'Result', typingPrompt: 'Start typing to begin the test', duration: 'Duration', chars: 'Characters', errors: 'Errors', dur15: '15s', dur30: '30s', dur60: '1 min', excellent: 'Excellent! Pro-level speed.', great: 'Great! Above average.', good: 'Good! Keep practicing.', keep: 'Keep going — you\'ll improve fast!' },
  ja: { title: 'タイピング速度テスト', subtitle: 'WPM測定', wpm: 'WPM', accuracy: '正確率', time: '時間', start: 'スタート', restart: 'もう一度', result: '結果', typingPrompt: 'タイピングを開始するとテストが始まります', duration: '時間選択', chars: '文字数', errors: 'エラー', dur15: '15秒', dur30: '30秒', dur60: '1分', excellent: '素晴らしい！プロレベルです。', great: '上手！平均以上です。', good: '良いです！練習を続けましょう。', keep: '練習を続ければ上達します！' },
  fr: { title: 'Test de vitesse de frappe', subtitle: 'Mots par minute (WPM)', wpm: 'MPM', accuracy: 'Précision', time: 'Temps', start: 'Démarrer', restart: 'Recommencer', result: 'Résultat', typingPrompt: 'Commencez à taper pour lancer le test', duration: 'Durée', chars: 'Caractères', errors: 'Erreurs', dur15: '15 s', dur30: '30 s', dur60: '1 min', excellent: 'Excellent ! Niveau expert.', great: 'Très bien ! Au-dessus de la moyenne.', good: 'Bien ! Continuez à pratiquer.', keep: 'Continuez, vous progresserez vite !' },
  es: { title: 'Test de velocidad de escritura', subtitle: 'Palabras por minuto (PPM)', wpm: 'PPM', accuracy: 'Precisión', time: 'Tiempo', start: 'Empezar', restart: 'Reiniciar', result: 'Resultado', typingPrompt: 'Comienza a escribir para iniciar el test', duration: 'Duración', chars: 'Caracteres', errors: 'Errores', dur15: '15 s', dur30: '30 s', dur60: '1 min', excellent: '¡Excelente! Nivel profesional.', great: '¡Muy bien! Por encima de la media.', good: '¡Bien! Sigue practicando.', keep: '¡Sigue así, mejorarás rápido!' },
  zh: { title: '打字速度测试', subtitle: 'WPM — 每分钟字数', wpm: 'WPM', accuracy: '准确率', time: '时间', start: '开始', restart: '重新测试', result: '结果', typingPrompt: '开始打字即开始测试', duration: '选择时长', chars: '字符数', errors: '错误', dur15: '15秒', dur30: '30秒', dur60: '1分钟', excellent: '优秀！达到专业水平。', great: '很好！高于平均水平。', good: '不错！继续练习。', keep: '继续练习，你会进步很快！' },
};

// Common English typing passages
const PASSAGES = [
  "the quick brown fox jumps over the lazy dog and then runs back to find more exciting adventures in the forest",
  "practice makes perfect when it comes to improving your typing speed and accuracy over time with consistent effort",
  "technology has changed the way we communicate work and learn making fast accurate typing an essential skill",
  "a journey of a thousand miles begins with a single step and every expert was once a beginner",
  "reading books and typing regularly are two habits that can dramatically improve your vocabulary and communication skills",
  "the best way to predict the future is to create it and the best time to start is always right now",
  "success is not final failure is not fatal it is the courage to continue that counts in the end",
  "every day is a new opportunity to learn something new challenge yourself and grow into a better version",
];

function getPassage(): string {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
}

function calcWPM(chars: number, elapsedMs: number): number {
  const minutes = elapsedMs / 60000;
  if (minutes === 0) return 0;
  return Math.round((chars / 5) / minutes);
}

type GameState = 'idle' | 'running' | 'done';

const TypingTest: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [duration, setDuration] = useState(30);
  const [passage, setPassage] = useState(getPassage);
  const [typed, setTyped] = useState('');
  const [state, setState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [errors, setErrors] = useState(0);
  const [finalWPM, setFinalWPM] = useState(0);
  const [finalAcc, setFinalAcc] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setPassage(getPassage());
    setTyped('');
    setState('idle');
    setTimeLeft(duration);
    setErrors(0);
    setFinalWPM(0);
    setFinalAcc(100);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [duration]);

  // Reset when duration changes
  useEffect(() => { setTimeLeft(duration); }, [duration]);

  const finish = useCallback((typedStr: string, startTs: number, errs: number) => {
    clearInterval(timerRef.current);
    const elapsed = Date.now() - startTs;
    const correct = typedStr.split('').filter((c, i) => c === passage[i]).length;
    const wpm = calcWPM(correct, elapsed);
    const acc = typedStr.length > 0 ? Math.round((correct / typedStr.length) * 100) : 0;
    setFinalWPM(wpm);
    setFinalAcc(acc);
    setState('done');
  }, [passage]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (state === 'idle') {
      const now = Date.now();
      setStartTime(now);
      setState('running');
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // finish called below with ref
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Count errors
    let errs = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== passage[i]) errs++;
    }
    setErrors(errs);
    setTyped(val);

    // Check if passage completed
    if (val.length >= passage.length) {
      finish(val, state === 'idle' ? Date.now() : startTime, errs);
    }
  }, [state, passage, startTime, finish]);

  // When timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && state === 'running') {
      finish(typed, startTime, errors);
    }
  }, [timeLeft, state, typed, startTime, errors, finish]);

  // Render passage with character coloring
  const renderPassage = () => {
    return passage.split('').map((char, i) => {
      let cls = 'text-muted-foreground/50';
      if (i < typed.length) {
        cls = typed[i] === char ? 'text-foreground' : 'bg-destructive/20 text-destructive rounded';
      } else if (i === typed.length) {
        cls = 'text-foreground border-b-2 border-primary animate-pulse';
      }
      return <span key={i} className={cls}>{char}</span>;
    });
  };

  const wpmColor = finalWPM >= 80 ? 'text-success' : finalWPM >= 50 ? 'text-info' : 'text-warning';
  const wpmMsg = finalWPM >= 80 ? t.excellent : finalWPM >= 50 ? t.great : finalWPM >= 30 ? t.good : t.keep;

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-black">{t.title}</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <button onClick={reset} className="px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold hover:bg-accent transition-colors">{t.restart}</button>
      </div>

      {/* Duration selector */}
      <div className="flex gap-2 mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground self-center mr-2">{t.duration}</p>
        {([15, 30, 60] as const).map(d => (
          <button
            key={d}
            onClick={() => { setDuration(d); reset(); }}
            className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${duration === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >
            {d === 15 ? t.dur15 : d === 30 ? t.dur30 : t.dur60}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: t.wpm, value: state === 'done' ? String(finalWPM) : state === 'running' ? String(calcWPM(typed.split('').filter((c, i) => c === passage[i]).length, Date.now() - startTime)) : '—' },
          { label: t.accuracy, value: state === 'done' ? `${finalAcc}%` : state === 'running' && typed.length > 0 ? `${Math.round((typed.split('').filter((c,i)=>c===passage[i]).length / typed.length)*100)}%` : '—' },
          { label: t.time, value: state === 'done' ? `${duration}s` : `${timeLeft}s` },
          { label: t.errors, value: String(errors) },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-2xl bg-muted/30 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-xl font-black tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Passage display */}
      {state !== 'done' && (
        <div
          className="p-5 rounded-2xl bg-muted/20 border border-border font-mono text-base leading-relaxed mb-4 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {renderPassage()}
        </div>
      )}

      {/* Hidden input */}
      {state !== 'done' && (
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={handleInput}
          className="opacity-0 absolute w-1 h-1"
          aria-label="Typing input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {/* Start prompt */}
      {state === 'idle' && (
        <button
          onClick={() => inputRef.current?.focus()}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-sm font-bold text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
        >
          {t.typingPrompt}
        </button>
      )}

      {/* Result */}
      {state === 'done' && (
        <div className="space-y-4">
          <div className="p-8 rounded-[32px] bg-muted/30 border-2 border-border text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.result}</p>
            <p className={`text-6xl font-black ${wpmColor}`}>{finalWPM}</p>
            <p className="text-sm font-bold text-muted-foreground">{t.wpm}</p>
            <p className="text-sm font-medium text-muted-foreground">{wpmMsg}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase text-muted-foreground">{t.accuracy}</p>
              <p className="text-2xl font-black">{finalAcc}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase text-muted-foreground">{t.chars}</p>
              <p className="text-2xl font-black">{typed.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase text-muted-foreground">{t.errors}</p>
              <p className="text-2xl font-black text-destructive">{errors}</p>
            </div>
          </div>
          <button onClick={reset} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors">
            {t.restart}
          </button>
        </div>
      )}
    </div>
  );
};

export default TypingTest;
