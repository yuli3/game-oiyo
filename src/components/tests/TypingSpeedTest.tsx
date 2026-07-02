import { useState, useEffect, useRef, useCallback } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string; stop: string
  wpm: string; cpm: string; accuracy: string; time: string; errors: string
  result: string; typeHere: string; waiting: string; finished: string
  level: (wpm: number) => string
}> = {
  ko: {
    title: '타이핑 속도 테스트', subtitle: '1분간 얼마나 빠르고 정확하게 타이핑할 수 있나요?',
    start: '시작하기', restart: '다시 하기', stop: '중단',
    wpm: 'WPM (분당 단어)', cpm: 'CPM (분당 글자)', accuracy: '정확도', time: '남은 시간', errors: '오류',
    result: '결과', typeHere: '아래 텍스트를 입력하세요', waiting: '시작을 누르면 타이머가 시작됩니다',
    finished: '완료!',
    level: (wpm) => wpm >= 80 ? '타이핑 고수 ⚡' : wpm >= 50 ? '중급자 👍' : wpm >= 30 ? '초보자 📝' : '연습이 필요해요 💪',
  },
  en: {
    title: 'Typing Speed Test', subtitle: 'How fast and accurately can you type in 1 minute?',
    start: 'Start', restart: 'Retry', stop: 'Stop',
    wpm: 'WPM', cpm: 'CPM', accuracy: 'Accuracy', time: 'Time left', errors: 'Errors',
    result: 'Result', typeHere: 'Type the text below', waiting: 'Press Start to begin the timer',
    finished: 'Done!',
    level: (wpm) => wpm >= 80 ? 'Typing Pro ⚡' : wpm >= 50 ? 'Intermediate 👍' : wpm >= 30 ? 'Beginner 📝' : 'Keep practicing 💪',
  },
  ja: {
    title: 'タイピング速度テスト', subtitle: '1分間でどれだけ速く正確にタイピングできますか？',
    start: '開始', restart: 'もう一度', stop: '中断',
    wpm: 'WPM（1分あたりの単語数）', cpm: 'CPM（1分あたりの文字数）', accuracy: '精度', time: '残り時間', errors: 'エラー',
    result: '結果', typeHere: '下のテキストを入力してください', waiting: 'スタートを押すとタイマーが始まります',
    finished: '完了！',
    level: (wpm) => wpm >= 80 ? 'タイピングプロ ⚡' : wpm >= 50 ? '中級者 👍' : wpm >= 30 ? '初心者 📝' : '練習が必要です 💪',
  },
  fr: { title: 'Test de Vitesse de Frappe', subtitle: 'Combien pouvez-vous taper en 1 minute ?', start: 'Commencer', restart: 'Recommencer', stop: 'Arrêter', wpm: 'MPM', cpm: 'CPM', accuracy: 'Précision', time: 'Temps restant', errors: 'Erreurs', result: 'Résultat', typeHere: 'Tapez le texte ci-dessous', waiting: 'Appuyez sur Démarrer pour commencer', finished: 'Terminé !', level: (wpm) => wpm >= 80 ? 'Pro de la frappe ⚡' : wpm >= 50 ? 'Intermédiaire 👍' : wpm >= 30 ? 'Débutant 📝' : 'Continuez à pratiquer 💪' },
  es: { title: 'Prueba de Velocidad de Mecanografía', subtitle: '¿Qué tan rápido y preciso puedes escribir en 1 minuto?', start: 'Comenzar', restart: 'Reintentar', stop: 'Detener', wpm: 'PPM', cpm: 'CPM', accuracy: 'Precisión', time: 'Tiempo restante', errors: 'Errores', result: 'Resultado', typeHere: 'Escribe el texto a continuación', waiting: 'Presiona Inicio para empezar', finished: '¡Terminado!', level: (wpm) => wpm >= 80 ? 'Pro mecanógrafo ⚡' : wpm >= 50 ? 'Intermedio 👍' : wpm >= 30 ? 'Principiante 📝' : 'Sigue practicando 💪' },
  zh: { title: '打字速度测试', subtitle: '您在1分钟内能打多快多准确？', start: '开始', restart: '重新测试', stop: '停止', wpm: '每分钟单词数', cpm: '每分钟字符数', accuracy: '准确率', time: '剩余时间', errors: '错误', result: '结果', typeHere: '在下方输入文字', waiting: '按开始启动计时器', finished: '完成！', level: (wpm) => wpm >= 80 ? '打字高手 ⚡' : wpm >= 50 ? '中级 👍' : wpm >= 30 ? '初学者 📝' : '需要练习 💪' },
}

const TEXTS: Record<Locale, string[]> = {
  ko: [
    '빠른 갈색 여우가 게으른 개를 뛰어 넘었습니다. 타이핑 연습을 꾸준히 하면 속도와 정확도가 향상됩니다.',
    '인생에서 가장 중요한 것은 끊임없이 배우고 성장하는 것입니다. 오늘도 한 걸음 더 나아가 봅시다.',
    '디지털 시대에서 타이핑 속도는 업무 효율성과 직결됩니다. 매일 조금씩 연습하면 큰 차이가 생깁니다.',
  ],
  en: [
    'The quick brown fox jumps over the lazy dog. Practice typing every day to improve your speed and accuracy significantly.',
    'Technology has transformed the way we communicate and work. Typing fast and accurately is a valuable skill in the modern world.',
    'Consistency is the key to improvement. Set aside fifteen minutes each day for typing practice and watch your speed grow.',
  ],
  ja: [
    '素早い茶色のキツネが怠惰な犬を飛び越えた。毎日タイピング練習をすれば速度と正確性が向上します。',
    'デジタル時代において、タイピング速度は業務効率と直結しています。毎日少しずつ練習することで大きな差が生まれます。',
    '継続は力なり。1日15分のタイピング練習を習慣にすれば、速度は確実に向上します。',
  ],
  fr: [
    'Le rapide renard brun saute par-dessus le chien paresseux. Pratiquez la frappe tous les jours pour améliorer votre vitesse et votre précision.',
    'Dans l\'ère numérique, taper vite et avec précision est une compétence précieuse pour la productivité professionnelle.',
    'La constance est la clé du progrès. Consacrez quinze minutes chaque jour à la pratique de la frappe pour voir votre vitesse augmenter.',
  ],
  es: [
    'El veloz zorro marrón salta sobre el perro perezoso. Practica mecanografía todos los días para mejorar tu velocidad y precisión.',
    'En la era digital, escribir rápido y con precisión es una habilidad valiosa para la productividad profesional.',
    'La constancia es la clave del progreso. Dedica quince minutos cada día a practicar mecanografía y verás crecer tu velocidad.',
  ],
  zh: [
    '快速的棕色狐狸跳过懒惰的狗。每天练习打字可以显著提高您的速度和准确性。',
    '在数字时代，快速准确地打字是提高工作效率的宝贵技能。每天花一点时间练习，就能看到显著进步。',
    '坚持是进步的关键。每天花十五分钟练习打字，您会看到速度明显提升。',
  ],
}

const DURATION = 60

interface Props { locale: Locale }

export default function TypingSpeedTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const texts = TEXTS[locale] ?? TEXTS.en

  const [targetText] = useState(() => texts[Math.floor(Math.random() * texts.length)])
  const [typed, setTyped] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [errors, setErrors] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    setStatus('running')
    setTyped('')
    setErrors(0)
    setTimeLeft(DURATION)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { setStatus('done'); clearInterval(intervalRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [status])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status !== 'running') return
    const val = e.target.value
    setTyped(val)
    // Count errors
    let errs = 0
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== targetText[i]) errs++
    }
    setErrors(errs)
  }

  const elapsed = DURATION - timeLeft
  const correctChars = typed.split('').filter((c, i) => c === targetText[i]).length
  const wpm = elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60)) : 0
  const cpm = elapsed > 0 ? Math.round(correctChars / (elapsed / 60)) : 0
  const accuracy = typed.length > 0 ? Math.round(((typed.length - errors) / typed.length) * 100) : 100

  // Render colored text
  const renderTarget = () => {
    return targetText.split('').map((char, i) => {
      let cls = 'text-muted-foreground'
      if (i < typed.length) {
        cls = typed[i] === char ? 'text-green-600' : 'text-red-500 bg-red-100'
      } else if (i === typed.length) {
        cls = 'text-foreground border-b-2 border-primary'
      }
      return <span key={i} className={cls}>{char}</span>
    })
  }

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <div className="text-3xl">⌨️</div>
        <h1 className="text-xl font-bold">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        {[
          { label: l.wpm, val: wpm, unit: '' },
          { label: l.accuracy, val: accuracy, unit: '%' },
          { label: l.time, val: timeLeft, unit: 's' },
          { label: l.errors, val: errors, unit: '' },
        ].map(({ label, val, unit }) => (
          <div key={label} className="rounded-xl border p-2.5">
            <p className="text-lg font-black">{val}<span className="text-xs font-normal">{unit}</span></p>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Timer bar */}
      {status === 'running' && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / DURATION) * 100}%` }} />
        </div>
      )}

      {/* Text display */}
      <div className="rounded-xl border bg-muted/30 p-4 font-mono text-sm leading-relaxed min-h-[80px]">
        {renderTarget()}
      </div>

      {/* Input area */}
      {status === 'running' ? (
        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleInput}
          className="w-full border rounded-xl p-4 font-mono text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={l.typeHere}
        />
      ) : status === 'idle' ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">{l.waiting}</p>
          <button onClick={start} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">{l.start}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">{l.finished}</p>
            <p className="text-3xl font-black text-primary">{wpm} <span className="text-base font-normal">WPM</span></p>
            <p className="text-sm text-muted-foreground mt-1">{l.level(wpm)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl border p-3"><p className="text-lg font-bold">{cpm}</p><p className="text-xs text-muted-foreground">{l.cpm}</p></div>
            <div className="rounded-xl border p-3"><p className="text-lg font-bold">{accuracy}%</p><p className="text-xs text-muted-foreground">{l.accuracy}</p></div>
            <div className="rounded-xl border p-3"><p className="text-lg font-bold">{errors}</p><p className="text-xs text-muted-foreground">{l.errors}</p></div>
          </div>
          <button onClick={start} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
        </div>
      )}
    </div>
  )
}
