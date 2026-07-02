import { useState, useEffect, useCallback, useRef } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'
type Phase = 'intro' | 'show' | 'recall' | 'result'

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  remember: string; nowPick: string; correct: string; wrong: string
  score: string; level: string; outOf: string
  results: (s: number, t: number) => string
  roundLabel: (r: number) => string
  showingFor: string
}> = {
  ko: { title: '색깔 기억력 테스트', subtitle: '잠깐 보여주는 색상을 기억하고 맞혀보세요', start: '시작하기', restart: '다시 하기', remember: '색상을 기억하세요!', nowPick: '방금 본 색상을 고르세요', correct: '정답! ✓', wrong: '오답 ✗', score: '점수', level: '레벨', outOf: '/', results: (s, t) => s === t ? '완벽한 기억력! 🧠' : s >= t * 0.8 ? '기억력 우수 🌟' : s >= t * 0.5 ? '보통 수준 👍' : '더 연습해봐요 💪', roundLabel: r => `${r}라운드`, showingFor: '초 후 사라집니다' },
  en: { title: 'Color Memory Test', subtitle: 'Remember the briefly shown colors and pick them', start: 'Start', restart: 'Play Again', remember: 'Remember the colors!', nowPick: 'Pick the color you just saw', correct: 'Correct! ✓', wrong: 'Wrong ✗', score: 'Score', level: 'Level', outOf: '/', results: (s, t) => s === t ? 'Perfect Memory! 🧠' : s >= t * 0.8 ? 'Excellent Memory 🌟' : s >= t * 0.5 ? 'Average Level 👍' : 'Keep practicing 💪', roundLabel: r => `Round ${r}`, showingFor: 'seconds left' },
  ja: { title: 'カラーメモリーテスト', subtitle: '一瞬見せた色を記憶して答えてください', start: '開始', restart: 'もう一度', remember: '色を覚えてください！', nowPick: '今見た色を選んでください', correct: '正解！ ✓', wrong: '不正解 ✗', score: 'スコア', level: 'レベル', outOf: '/', results: (s, t) => s === t ? '完璧な記憶力！🧠' : s >= t * 0.8 ? '記憶力優秀 🌟' : s >= t * 0.5 ? '普通レベル 👍' : 'もっと練習しましょう 💪', roundLabel: r => `ラウンド${r}`, showingFor: '秒後に消えます' },
  fr: { title: 'Test de Mémoire des Couleurs', subtitle: 'Mémorisez les couleurs affichées brièvement', start: 'Commencer', restart: 'Rejouer', remember: 'Mémorisez les couleurs !', nowPick: 'Sélectionnez la couleur que vous venez de voir', correct: 'Correct ! ✓', wrong: 'Faux ✗', score: 'Score', level: 'Niveau', outOf: '/', results: (s, t) => s === t ? 'Mémoire parfaite ! 🧠' : s >= t * 0.8 ? 'Excellente mémoire 🌟' : s >= t * 0.5 ? 'Niveau moyen 👍' : 'Continuez à pratiquer 💪', roundLabel: r => `Tour ${r}`, showingFor: 'secondes restantes' },
  es: { title: 'Prueba de Memoria de Colores', subtitle: 'Recuerda los colores mostrados brevemente y selecciónalos', start: 'Comenzar', restart: 'Jugar de nuevo', remember: '¡Recuerda los colores!', nowPick: 'Selecciona el color que acabas de ver', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', score: 'Puntuación', level: 'Nivel', outOf: '/', results: (s, t) => s === t ? '¡Memoria perfecta! 🧠' : s >= t * 0.8 ? 'Excelente memoria 🌟' : s >= t * 0.5 ? 'Nivel promedio 👍' : 'Sigue practicando 💪', roundLabel: r => `Ronda ${r}`, showingFor: 'segundos restantes' },
  zh: { title: '颜色记忆测试', subtitle: '记住短暂显示的颜色并选出正确答案', start: '开始', restart: '再玩一次', remember: '记住颜色！', nowPick: '选择您刚才看到的颜色', correct: '正确！✓', wrong: '错误 ✗', score: '分数', level: '关卡', outOf: '/', results: (s, t) => s === t ? '完美记忆！🧠' : s >= t * 0.8 ? '记忆力优秀 🌟' : s >= t * 0.5 ? '中等水平 👍' : '继续练习 💪', roundLabel: r => `第${r}轮`, showingFor: '秒后消失' },
}

const COLORS = [
  { name: '빨강/Red', hex: '#EF4444' }, { name: '파랑/Blue', hex: '#3B82F6' },
  { name: '초록/Green', hex: '#22C55E' }, { name: '노랑/Yellow', hex: '#EAB308' },
  { name: '보라/Purple', hex: '#A855F7' }, { name: '주황/Orange', hex: '#F97316' },
  { name: '분홍/Pink', hex: '#EC4899' }, { name: '하늘/Sky', hex: '#06B6D4' },
  { name: '갈색/Brown', hex: '#92400E' }, { name: '연두/Lime', hex: '#84CC16' },
  { name: '남색/Navy', hex: '#1E3A5F' }, { name: '자주/Magenta', hex: '#C026D3' },
]

interface Round { target: typeof COLORS[0]; options: typeof COLORS[0][] }

function makeRound(level: number): Round {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5)
  const target = shuffled[0]
  const count = Math.min(4 + Math.floor(level / 2), 8)
  const options = shuffled.slice(0, count).sort(() => Math.random() - 0.5)
  return { target, options }
}

const TOTAL_ROUNDS = 8

interface Props { locale: Locale }

export default function ColorMemoryTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState(0)
  const [rounds, setRounds] = useState<Round[]>([])
  const [score, setScore] = useState(0)
  const [showTime, setShowTime] = useState(3)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const initRounds = useCallback(() => {
    const rs: Round[] = []
    for (let i = 0; i < TOTAL_ROUNDS; i++) rs.push(makeRound(i))
    return rs
  }, [])

  const startGame = () => {
    const rs = initRounds()
    setRounds(rs)
    setRound(0)
    setScore(0)
    setFeedback(null)
    showColor(rs, 0)
  }

  const showColor = (rs: Round[], idx: number) => {
    const showDur = Math.max(1000, 3000 - idx * 200)
    setShowTime(Math.ceil(showDur / 1000))
    setPhase('show')

    let t = Math.ceil(showDur / 1000)
    timerRef.current = setInterval(() => {
      t -= 1
      setShowTime(t)
      if (t <= 0) {
        clearInterval(timerRef.current!)
        setPhase('recall')
      }
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const pick = (color: typeof COLORS[0]) => {
    if (phase !== 'recall') return
    const correct = color.hex === rounds[round].target.hex
    if (correct) setScore(s => s + 1)
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => {
      setFeedback(null)
      if (round + 1 >= TOTAL_ROUNDS) {
        setPhase('result')
      } else {
        const next = round + 1
        setRound(next)
        showColor(rounds, next)
      }
    }, 700)
  }

  if (phase === 'intro') {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">🎨</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <div className="flex gap-2 justify-center flex-wrap max-w-xs mx-auto">
          {COLORS.slice(0, 8).map(c => <div key={c.hex} className="w-8 h-8 rounded-lg" style={{ backgroundColor: c.hex }} />)}
        </div>
        <p className="text-sm text-muted-foreground">{TOTAL_ROUNDS}라운드 · 난이도 점진 상승</p>
        <button onClick={startGame} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">{l.start}</button>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="text-5xl">🧠</div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">{l.score}</p>
          <p className="text-4xl font-black">{score} <span className="text-base font-normal text-muted-foreground">{l.outOf} {TOTAL_ROUNDS}</span></p>
        </div>
        <p className="font-semibold text-lg">{l.results(score, TOTAL_ROUNDS)}</p>
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i < score ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i + 1}</div>
          ))}
        </div>
        <button onClick={startGame} className="px-8 py-3 border rounded-full text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  const currentRound = rounds[round]
  if (!currentRound) return null

  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{l.roundLabel(round + 1)} / {TOTAL_ROUNDS}</span>
        <span className="font-medium">{l.score}: {score}</span>
      </div>

      {phase === 'show' ? (
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold">{l.remember}</p>
          <div className="mx-auto w-40 h-40 rounded-2xl shadow-lg transition-all" style={{ backgroundColor: currentRound.target.hex }} />
          <p className="text-sm text-muted-foreground">{showTime} {l.showingFor}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm font-semibold">{l.nowPick}</p>
          {feedback && (
            <div className={`text-center text-sm font-bold py-2 rounded-xl ${feedback === 'correct' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {feedback === 'correct' ? l.correct : l.wrong}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {currentRound.options.map(c => (
              <button key={c.hex} onClick={() => pick(c)}
                className="h-16 rounded-xl shadow hover:scale-105 transition-transform border-2 border-transparent hover:border-primary"
                style={{ backgroundColor: c.hex }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
