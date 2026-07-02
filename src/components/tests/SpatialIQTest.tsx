import { useState, useEffect } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  correct: string; wrong: string; correctIs: string
  score: string; outOf: string; next: string
  results: (s: number) => string
  instruction: string; progress: (c: number, t: number) => string
}> = {
  ko: { title: '공간지각 IQ 게임', subtitle: '패턴의 규칙을 찾아 빠진 조각을 맞혀보세요', start: '시작하기', restart: '다시 하기', correct: '정답! ✓', wrong: '오답 ✗', correctIs: '정답:', score: '점수', outOf: '/ 10', next: '다음', results: (s) => s >= 9 ? 'IQ 공간지각 최상급 🏆' : s >= 7 ? '공간지각력 우수 🌟' : s >= 5 ? '평균 이상 📊' : '계속 연습하면 늘어요 💪', instruction: '? 자리에 들어갈 도형을 고르세요', progress: (c, t) => `${c} / ${t}` },
  en: { title: 'Spatial IQ Game', subtitle: 'Find the pattern rule and choose the missing piece', start: 'Start', restart: 'Play Again', correct: 'Correct! ✓', wrong: 'Wrong ✗', correctIs: 'Answer:', score: 'Score', outOf: '/ 10', next: 'Next', results: (s) => s >= 9 ? 'Top Spatial IQ 🏆' : s >= 7 ? 'Excellent Spatial Skills 🌟' : s >= 5 ? 'Above Average 📊' : 'Keep practicing 💪', instruction: 'Choose the shape that belongs in the ? spot', progress: (c, t) => `${c} / ${t}` },
  ja: { title: '空間IQゲーム', subtitle: 'パターンのルールを見つけて欠けているピースを選んでください', start: '開始', restart: 'もう一度', correct: '正解！✓', wrong: '不正解 ✗', correctIs: '正解：', score: 'スコア', outOf: '/ 10', next: '次へ', results: (s) => s >= 9 ? '最高レベルの空間IQ 🏆' : s >= 7 ? '空間認識能力優秀 🌟' : s >= 5 ? '平均以上 📊' : '練習を続けましょう 💪', instruction: '?の場所に入る図形を選んでください', progress: (c, t) => `${c} / ${t}` },
  fr: { title: 'Jeu d\'IQ Spatial', subtitle: 'Trouvez la règle du motif et choisissez la pièce manquante', start: 'Commencer', restart: 'Rejouer', correct: 'Correct ! ✓', wrong: 'Faux ✗', correctIs: 'Réponse :', score: 'Score', outOf: '/ 10', next: 'Suivant', results: (s) => s >= 9 ? 'QI Spatial de premier ordre 🏆' : s >= 7 ? 'Excellentes compétences spatiales 🌟' : s >= 5 ? 'Au-dessus de la moyenne 📊' : 'Continuez à pratiquer 💪', instruction: 'Choisissez la forme qui appartient à la case ?', progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Juego de IQ Espacial', subtitle: 'Encuentra la regla del patrón y elige la pieza que falta', start: 'Comenzar', restart: 'Jugar de nuevo', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', correctIs: 'Respuesta:', score: 'Puntuación', outOf: '/ 10', next: 'Siguiente', results: (s) => s >= 9 ? 'IQ Espacial de primer nivel 🏆' : s >= 7 ? 'Excelentes habilidades espaciales 🌟' : s >= 5 ? 'Por encima del promedio 📊' : 'Sigue practicando 💪', instruction: 'Elige la forma que corresponde al lugar ?', progress: (c, t) => `${c} / ${t}` },
  zh: { title: '空间IQ游戏', subtitle: '找出图案规律并选择缺失的部分', start: '开始', restart: '再玩一次', correct: '正确！✓', wrong: '错误 ✗', correctIs: '答案：', score: '分数', outOf: '/ 10', next: '下一题', results: (s) => s >= 9 ? '顶级空间IQ 🏆' : s >= 7 ? '空间能力优秀 🌟' : s >= 5 ? '高于平均 📊' : '继续练习 💪', instruction: '选择应填入?位置的图形', progress: (c, t) => `${c} / ${t}` },
}

// Emoji-based pattern puzzles: 3x3 grid with bottom-right missing
interface Puzzle {
  grid: string[] // 9 items, last one is answer
  options: string[] // 4 choices including answer
  explanation: string
}

const PUZZLES: Puzzle[] = [
  { grid: ['🔴','🔴','🔴', '🔵','🔵','🔵', '🟡','🟡','?'], options: ['🟡','🔴','🔵','🟢'], explanation: 'Each row repeats the same emoji' },
  { grid: ['1️⃣','2️⃣','3️⃣', '4️⃣','5️⃣','6️⃣', '7️⃣','8️⃣','?'], options: ['9️⃣','0️⃣','🔟','8️⃣'], explanation: 'Sequential numbers 1-9' },
  { grid: ['⬜','⬛','⬜', '⬛','⬜','⬛', '⬜','⬛','?'], options: ['⬜','⬛','🔲','🔳'], explanation: 'Alternating black and white squares' },
  { grid: ['🌑','🌒','🌓', '🌔','🌕','🌖', '🌗','🌘','?'], options: ['🌑','🌒','🌓','🌘'], explanation: 'Moon phase sequence, returning to new moon' },
  { grid: ['🐱','🐱','🐶', '🐱','🐱','🐶', '🐱','🐱','?'], options: ['🐶','🐱','🐭','🐸'], explanation: 'Pattern of 2 cats then 1 dog repeats' },
  { grid: ['🔺','🔻','🔺', '🔻','🔺','🔻', '🔺','🔻','?'], options: ['🔺','🔻','🔷','🔸'], explanation: 'Alternating up-down triangles' },
  { grid: ['🌱','🌿','🌳', '🌱','🌿','🌳', '🌱','🌿','?'], options: ['🌳','🌱','🌿','🍀'], explanation: 'Repeating growth sequence: sprout, herb, tree' },
  { grid: ['⭐','⭐⭐','⭐⭐⭐', '⭐⭐','⭐⭐⭐','⭐', '⭐⭐⭐','⭐','?'], options: ['⭐⭐','⭐','⭐⭐⭐','⭐⭐⭐⭐'], explanation: 'Star counts rotate: 1,2,3→2,3,1→3,1,2' },
  { grid: ['🍎','🍊','🍋', '🍊','🍋','🍎', '🍋','🍎','?'], options: ['🍊','🍋','🍎','🍇'], explanation: 'Each row rotates the fruit order left by one' },
  { grid: ['🔥','💧','🌍', '💧','🌍','🔥', '🌍','🔥','?'], options: ['💧','🔥','🌍','💨'], explanation: 'Each row cycles through the three elements' },
  { grid: ['➕','➕','➖', '➕','➖','➖', '➖','➖','?'], options: ['➕','➖','✖️','➗'], explanation: 'Diagonal pattern: bottom-right follows decreasing ➕ rule' },
  { grid: ['🎯','🎯','⭕', '🎯','⭕','⭕', '⭕','⭕','?'], options: ['⭕','🎯','❌','🔵'], explanation: 'Upper-left triangle fills with target, rest with circle' },
  { grid: ['🅰️','🅱️','🅰️', '🅱️','🅰️','🅱️', '🅰️','🅱️','?'], options: ['🅰️','🅱️','🆎','🆑'], explanation: 'Checkerboard alternation of A and B' },
  { grid: ['🌞','🌝','🌚', '🌝','🌚','🌞', '🌚','🌞','?'], options: ['🌝','🌞','🌚','🌛'], explanation: 'Each row cycles sun, full moon, dark moon in rotation' },
  { grid: ['🟥','🟧','🟨', '🟩','🟦','🟪', '🟥','🟧','?'], options: ['🟨','🟩','🟦','🟪'], explanation: 'Rainbow order repeats: rows restart the spectrum' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a
}

function pickPuzzles(): Puzzle[] {
  return shuffle(PUZZLES).slice(0, 10).map(p => ({ ...p, options: shuffle(p.options) }))
}

interface Props { locale: Locale }

export default function SpatialIQTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [history, setHistory] = useState<boolean[]>([])

  useEffect(() => { setPuzzles(pickPuzzles()) }, [])

  const start = () => { setPuzzles(pickPuzzles()); setStarted(true); setCurrent(0); setSelected(null); setScore(0); setFinished(false); setHistory([]) }

  const pick = (opt: string) => {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === puzzles[current].grid[8]
    const newScore = correct ? score + 1 : score
    const newHistory = [...history, correct]
    setScore(newScore)
    setHistory(newHistory)
    if (current + 1 >= puzzles.length) setTimeout(() => setFinished(true), 700)
  }

  const next = () => { setCurrent(c => c + 1); setSelected(null) }

  if (!started || puzzles.length === 0) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">🧩</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto text-2xl">
          {'🔴🔵🟡🔵🟡🔴🟡🔴'.split('').concat(['?']).map((e, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-xl ${e === '?' ? 'bg-muted border-2 border-dashed border-primary text-primary font-bold text-sm' : 'bg-muted'}`}>{e}</div>
          ))}
        </div>
        <button onClick={start} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">{l.start}</button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="text-5xl">{score >= 9 ? '🏆' : score >= 7 ? '🌟' : score >= 5 ? '📊' : '💪'}</div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">{l.score}</p>
          <p className="text-4xl font-black">{score} <span className="text-base font-normal text-muted-foreground">{l.outOf}</span></p>
        </div>
        <p className="font-semibold text-lg">{l.results(score)}</p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${h ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i + 1}</span>)}
        </div>
        <button onClick={start} className="px-8 py-3 border rounded-full text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  const p = puzzles[current]
  const isCorrect = selected === p.grid[8]
  const gridItems = p.grid.slice(0, 8).concat(['?'])

  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{l.progress(current + 1, puzzles.length)}</span>
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / puzzles.length) * 100}%` }} />
        </div>
      </div>
      <p className="text-center text-sm font-semibold">{l.instruction}</p>
      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {gridItems.map((item, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center rounded-xl text-2xl border ${item === '?' ? 'bg-primary/10 border-primary border-dashed text-primary font-bold text-lg' : 'bg-muted/50 border-border'}`}>
            {item === '?' ? '?' : item}
          </div>
        ))}
      </div>
      {/* Options */}
      <div className="grid grid-cols-4 gap-2">
        {p.options.map(opt => {
          let cls = 'border rounded-xl py-3 text-2xl text-center transition-all'
          if (selected === null) cls += ' hover:bg-accent hover:border-primary cursor-pointer'
          else if (opt === p.grid[8]) cls += ' bg-green-50 border-green-400'
          else if (opt === selected) cls += ' bg-red-50 border-red-400 opacity-70'
          else cls += ' opacity-50'
          return <button key={opt} onClick={() => pick(opt)} className={cls}>{opt}</button>
        })}
      </div>
      {selected && (
        <div className={`rounded-xl p-3 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold mb-0.5 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? l.correct : `${l.wrong} ${l.correctIs} ${p.grid[8]}`}
          </p>
          <p className="text-muted-foreground text-xs">{p.explanation}</p>
        </div>
      )}
      {selected && current + 1 < puzzles.length && (
        <button onClick={next} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">{l.next} →</button>
      )}
    </div>
  )
}
