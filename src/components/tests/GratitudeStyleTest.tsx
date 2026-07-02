import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type DimKey = 'intensity' | 'frequency' | 'span' | 'density'
type Level = 'low' | 'developing' | 'appreciative' | 'deeply_grateful'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question { id: string; text: string; dim: DimKey }
interface LevelData {
  title: string; subtitle: string; description: string
  insights: string[]; practices: string[]; affirmation: string
}

const DIM_KEYS: DimKey[] = ['intensity', 'frequency', 'span', 'density']

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string; yourLevel: string
  insights: string; practices: string; affirmation: string
  scoreLabel: string; outOf: string; dimProfile: string
  note: string; dimNames: Record<DimKey, string>
}> = {
  ko: {
    title: '감사 성향 테스트',
    subtitle: '나는 얼마나 감사하며 사는가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 그렇지 않다', '별로 그렇지 않다', '보통이다', '대체로 그렇다', '매우 그렇다'],
    restart: '다시 하기', share: '결과 공유', shareMsg: '나의 감사 수준은',
    yourLevel: '나의 감사 성향', insights: '나의 감사 패턴', practices: '감사 실천법',
    affirmation: '오늘의 메시지', scoreLabel: '감사 점수', outOf: '/ 60점',
    dimProfile: '감사 차원 분석',
    note: '이 테스트는 GQ-6와 McCullough의 감사 연구를 기반으로 한 참고용 자가 진단입니다.',
    dimNames: { intensity: '강도', frequency: '빈도', span: '범위', density: '밀도' },
  },
  en: {
    title: 'Gratitude Style Test',
    subtitle: 'How Grateful Are You?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Rarely', 'Neutral', 'Mostly yes', 'Very much'],
    restart: 'Retake', share: 'Share Result', shareMsg: 'My gratitude level is',
    yourLevel: 'Your Gratitude Style', insights: 'My Gratitude Patterns', practices: 'Gratitude Practices',
    affirmation: "Today's Message", scoreLabel: 'Gratitude Score', outOf: '/ 60',
    dimProfile: 'Gratitude Dimension Profile',
    note: 'This test is based on the GQ-6 and McCullough\'s gratitude research. For reference only.',
    dimNames: { intensity: 'Intensity', frequency: 'Frequency', span: 'Span', density: 'Density' },
  },
  ja: {
    title: '感謝傾向テスト',
    subtitle: '私はどのくらい感謝して生きているか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くそうでない', 'あまりそうでない', '普通', '大体そうだ', 'とてもそうだ'],
    restart: 'もう一度', share: '結果を共有', shareMsg: '私の感謝レベルは',
    yourLevel: '私の感謝傾向', insights: '感謝パターン', practices: '感謝の実践法',
    affirmation: '今日のメッセージ', scoreLabel: '感謝スコア', outOf: '/ 60点',
    dimProfile: '感謝の次元分析',
    note: 'このテストはGQ-6とMcCulloughの感謝研究を参考にした自己診断です。',
    dimNames: { intensity: '強度', frequency: '頻度', span: '範囲', density: '密度' },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1',  dim: 'intensity',  text: '좋은 일이 생겼을 때 깊이 감사한 감정을 느낀다' },
    { id: 'q2',  dim: 'intensity',  text: '누군가 나를 도와줬을 때 그 고마움을 강하게 느낀다' },
    { id: 'q3',  dim: 'intensity',  text: '아름다운 풍경이나 음악을 접할 때 깊은 감동을 느낀다' },
    { id: 'q4',  dim: 'frequency',  text: '하루에도 여러 번 감사한 일을 발견한다' },
    { id: 'q5',  dim: 'frequency',  text: '작은 일에도 자연스럽게 감사함을 느낀다' },
    { id: 'q6',  dim: 'frequency',  text: '아침에 눈을 뜰 때 살아있다는 것에 감사함을 느낀다' },
    { id: 'q7',  dim: 'span',       text: '나의 삶에 기여한 많은 사람들에게 감사함을 느낀다' },
    { id: 'q8',  dim: 'span',       text: '자연, 사회, 우주와 같은 큰 것들에도 감사함을 느낀다' },
    { id: 'q9',  dim: 'span',       text: '힘든 경험도 결국 나를 성장시켰다는 감사함이 있다' },
    { id: 'q10', dim: 'density',    text: '한 가지 좋은 일에 많은 사람들이 기여했음을 인식한다' },
    { id: 'q11', dim: 'density',    text: '내가 지금 가진 것들은 많은 사람의 노력 덕분임을 안다' },
    { id: 'q12', dim: 'density',    text: '내 성공의 배경에는 보이지 않는 많은 도움이 있었다고 생각한다' },
  ],
  en: [
    { id: 'q1',  dim: 'intensity',  text: 'When something good happens, I feel deeply grateful' },
    { id: 'q2',  dim: 'intensity',  text: 'When someone helps me, I feel the gratitude intensely' },
    { id: 'q3',  dim: 'intensity',  text: 'I feel deeply moved by beautiful scenery or music' },
    { id: 'q4',  dim: 'frequency',  text: 'I find things to be grateful for multiple times throughout the day' },
    { id: 'q5',  dim: 'frequency',  text: 'I naturally feel grateful even for small things' },
    { id: 'q6',  dim: 'frequency',  text: 'When I wake up, I feel grateful just to be alive' },
    { id: 'q7',  dim: 'span',       text: 'I feel grateful toward the many people who have contributed to my life' },
    { id: 'q8',  dim: 'span',       text: 'I feel gratitude toward large things like nature, society, and the universe' },
    { id: 'q9',  dim: 'span',       text: 'I am grateful even for difficult experiences, as they helped me grow' },
    { id: 'q10', dim: 'density',    text: 'I recognize that many people contributed to a single good thing in my life' },
    { id: 'q11', dim: 'density',    text: 'I know that what I have now is thanks to many people\'s efforts' },
    { id: 'q12', dim: 'density',    text: 'I believe there was much invisible help behind my achievements' },
  ],
  ja: [
    { id: 'q1',  dim: 'intensity',  text: '良いことが起きたとき、深い感謝の気持ちを感じる' },
    { id: 'q2',  dim: 'intensity',  text: '誰かが助けてくれたとき、その感謝を強く感じる' },
    { id: 'q3',  dim: 'intensity',  text: '美しい景色や音楽に触れるとき、深く感動する' },
    { id: 'q4',  dim: 'frequency',  text: '一日に何度も感謝できることを見つける' },
    { id: 'q5',  dim: 'frequency',  text: '小さなことにも自然と感謝の気持ちが湧く' },
    { id: 'q6',  dim: 'frequency',  text: '朝目覚めるとき、生きていることに感謝を感じる' },
    { id: 'q7',  dim: 'span',       text: '自分の人生に貢献してくれた多くの人に感謝を感じる' },
    { id: 'q8',  dim: 'span',       text: '自然、社会、宇宙のような大きなものにも感謝を感じる' },
    { id: 'q9',  dim: 'span',       text: '辛い経験も最終的に自分を成長させてくれたことへの感謝がある' },
    { id: 'q10', dim: 'density',    text: '一つの良いことに多くの人が貢献していると認識する' },
    { id: 'q11', dim: 'density',    text: '今自分が持っているものは多くの人の努力のおかげだとわかる' },
    { id: 'q12', dim: 'density',    text: '自分の成功の背景には見えない多くのサポートがあったと思う' },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, LevelData>> = {
  low: {
    ko: {
      title: '감사 낮음', subtitle: '감사함을 느끼기 어려운 시기일 수 있습니다',
      description: '현재 감사함을 자주 경험하지 못하고 있습니다. 이것은 삶이 힘들거나 감사를 표현하는 습관이 아직 형성되지 않았기 때문일 수 있습니다. 감사는 훈련을 통해 키울 수 있는 능력입니다.',
      insights: ['현재 상황에 집중하기 어려울 수 있음', '부정적인 것에 주의가 더 쏠리는 경향', '감사 표현 습관이 아직 발달 중'],
      practices: ['매일 밤 3가지 감사한 일 적기', '누군가에게 감사 메시지 보내기', '현재 가진 것에 집중하는 5분 명상', '작은 즐거움 알아차리기 연습'],
      affirmation: '감사는 완벽한 삶에서 오는 것이 아닙니다. 지금 이 순간, 아주 작은 것에서부터 시작할 수 있습니다.',
    },
    en: {
      title: 'Low Gratitude', subtitle: 'This may be a time when gratitude feels difficult',
      description: 'You are not frequently experiencing gratitude at the moment. This may be because life is challenging or because the habit of expressing gratitude has not yet formed. Gratitude is an ability that can be developed through practice.',
      insights: ['May find it difficult to focus on the present', 'Tendency for attention to gravitate toward the negative', 'Gratitude habits still developing'],
      practices: ['Write down 3 things you are grateful for each night', 'Send a thank-you message to someone', '5-minute meditation focusing on what you have now', 'Practice noticing small pleasures'],
      affirmation: 'Gratitude does not come from a perfect life. It can start from the smallest things, right now in this moment.',
    },
    ja: {
      title: '感謝低め', subtitle: '今、感謝を感じにくい時期かもしれません',
      description: '現在、感謝をあまり経験していません。生活が辛かったり、感謝を表現する習慣がまだ形成されていないのかもしれません。感謝は練習によって育てられる能力です。',
      insights: ['現在に集中しにくい可能性がある', 'ネガティブなことに注意が向きやすい傾向', '感謝の習慣がまだ発達途中'],
      practices: ['毎晩3つの感謝することを書く', '誰かに感謝のメッセージを送る', '今持っているものに集中する5分間の瞑想', '小さな喜びに気づく練習'],
      affirmation: '感謝は完璧な人生から来るものではありません。今この瞬間、とても小さなことから始められます。',
    },
  },
  developing: {
    ko: {
      title: '성장 중', subtitle: '감사의 씨앗이 자라고 있습니다',
      description: '감사함을 느끼기 시작했지만, 아직 일관성이 부족할 수 있습니다. 가끔 감사함을 경험하지만 습관화되지 않은 상태입니다. 조금씩 실천하면 빠르게 성장할 수 있습니다.',
      insights: ['간헐적으로 감사함을 느낌', '의식적으로 노력할 때 감사 경험이 늘어남', '감사 실천의 효과를 경험하기 시작'],
      practices: ['감사 일지 꾸준히 쓰기', '식사 전 감사 순간 갖기', '나를 도운 사람들을 떠올리기', '자연 속에서 아름다움 발견하기'],
      affirmation: '변화는 이미 시작되었습니다. 작은 감사들이 쌓여 삶을 바꿉니다.',
    },
    en: {
      title: 'Developing', subtitle: 'Seeds of gratitude are growing',
      description: 'You have begun to experience gratitude, but consistency may still be lacking. You sometimes feel grateful but it has not yet become a habit. With small, consistent practice you can grow quickly.',
      insights: ['Gratitude felt intermittently', 'Gratitude increases with conscious effort', 'Beginning to experience the effects of gratitude practice'],
      practices: ['Keep a gratitude journal consistently', 'Have a moment of gratitude before meals', 'Recall people who have helped you', 'Find beauty in nature'],
      affirmation: 'Change has already begun. Small gratitudes accumulate and transform your life.',
    },
    ja: {
      title: '成長中', subtitle: '感謝の種が育っています',
      description: '感謝を感じ始めましたが、まだ一貫性が足りないかもしれません。時々感謝を経験しますが、習慣になっていない状態です。少しずつ実践すれば早く成長できます。',
      insights: ['断続的に感謝を感じる', '意識的に努力すると感謝体験が増える', '感謝実践の効果を経験し始めた'],
      practices: ['感謝日記を継続的につける', '食事前に感謝の時間を持つ', '助けてくれた人たちを思い浮かべる', '自然の中に美しさを見つける'],
      affirmation: '変化はすでに始まっています。小さな感謝が積み重なって人生を変えます。',
    },
  },
  appreciative: {
    ko: {
      title: '감사형', subtitle: '삶에서 감사함을 잘 발견합니다',
      description: '일상에서 감사함을 자연스럽게 경험하는 능력이 잘 발달되어 있습니다. 다양한 대상과 순간에서 감사함을 느끼고, 이 감사가 삶의 만족도와 관계의 질에 긍정적인 영향을 미치고 있습니다.',
      insights: ['감사 경험이 풍부하고 다양함', '긍정적인 감정 조절 능력이 높음', '관계에서 감사 표현이 자연스러움'],
      practices: ['감사를 더 구체적이고 깊게 표현하기', '감사를 다른 사람과 나누기', '어려운 상황에서도 감사 찾기 연습', '감사 명상 심화'],
      affirmation: '당신의 감사하는 마음은 당신과 주변을 동시에 풍요롭게 합니다. 이 능력을 소중히 여기세요.',
    },
    en: {
      title: 'Appreciative', subtitle: 'You notice gratitude well in life',
      description: 'Your ability to experience gratitude naturally in daily life is well developed. You feel grateful in a wide range of situations and toward many people, and this gratitude positively influences your life satisfaction and relationship quality.',
      insights: ['Rich and varied gratitude experiences', 'High positive emotion regulation ability', 'Expressing gratitude in relationships feels natural'],
      practices: ['Express gratitude more specifically and deeply', 'Share gratitude with others', 'Practice finding gratitude even in difficult situations', 'Deepen gratitude meditation'],
      affirmation: 'Your grateful heart enriches both you and those around you. Cherish this ability.',
    },
    ja: {
      title: '感謝型', subtitle: '人生の中で感謝をよく見出します',
      description: '日常で感謝を自然に経験する能力がよく発達しています。様々な対象や瞬間に感謝を感じ、この感謝が人生の満足度と関係の質に良い影響を与えています。',
      insights: ['感謝体験が豊かで多様', '肯定的な感情調整能力が高い', '関係の中で感謝表現が自然'],
      practices: ['感謝をより具体的に深く表現する', '感謝を他の人と分かち合う', '困難な状況でも感謝を見つける練習', '感謝の瞑想を深める'],
      affirmation: 'あなたの感謝する心はあなたと周囲を同時に豊かにします。この能力を大切にしてください。',
    },
  },
  deeply_grateful: {
    ko: {
      title: '깊은 감사형', subtitle: '감사함이 삶의 방식이 되었습니다',
      description: '감사는 단순한 감정이 아니라 삶을 보는 방식이 되었습니다. 큰 일과 작은 일, 보이는 것과 보이지 않는 것 모두에서 깊은 감사를 경험합니다. 이 감사는 당신의 회복탄력성과 관계에 큰 자산입니다.',
      insights: ['감사가 삶의 기본 태도로 자리잡음', '어려운 상황에서도 의미를 찾는 능력', '깊은 연결감과 풍요로움 경험', '감사가 자연스러운 습관화'],
      practices: ['감사를 더 넓게 나누고 표현하기', '어려운 이들에게 감사의 문화 전하기', '감사 실천을 더 깊은 영적 수련으로 확장', '감사 표현을 글이나 예술로 승화'],
      affirmation: '당신의 감사는 세상을 더 밝게 만듭니다. 이 선물을 소중히 가꾸고 나누어 주세요.',
    },
    en: {
      title: 'Deeply Grateful', subtitle: 'Gratitude has become your way of life',
      description: 'Gratitude has become not just an emotion but a way of seeing life. You experience deep thankfulness in both large and small things, visible and invisible. This gratitude is a tremendous asset for your resilience and relationships.',
      insights: ['Gratitude is an established baseline attitude', 'Ability to find meaning even in difficult situations', 'Deep sense of connection and abundance', 'Gratitude is a natural habit'],
      practices: ['Share and express gratitude more broadly', 'Bring a culture of gratitude to those in need', 'Extend gratitude practice into deeper spiritual work', 'Express gratitude through writing or art'],
      affirmation: 'Your gratitude makes the world brighter. Cherish this gift and share it generously.',
    },
    ja: {
      title: '深い感謝型', subtitle: '感謝が生き方になっています',
      description: '感謝は単なる感情ではなく、人生を見る方法になっています。大きなことも小さなことも、見えるものも見えないものも、すべてに深い感謝を経験します。この感謝はあなたの回復力と関係における大きな財産です。',
      insights: ['感謝が人生の基本的な姿勢として定着', '困難な状況でも意味を見出す能力', '深い繋がりと豊かさの経験', '感謝が自然な習慣'],
      practices: ['感謝をより広く分かち合い表現する', '困っている人に感謝の文化を伝える', '感謝の実践をより深い精神的な修練に拡張', '感謝を文章やアートで表現する'],
      affirmation: 'あなたの感謝は世界をより明るくします。この贈り物を大切にし、惜しみなく分かち合ってください。',
    },
  },
}

function getLevel(score: number): Level {
  if (score <= 20) return 'low'
  if (score <= 36) return 'developing'
  if (score <= 50) return 'appreciative'
  return 'deeply_grateful'
}

interface Props { locale?: string }

export default function GratitudeStyleTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [dimScores, setDimScores] = useState<Record<DimKey, number>>(
    () => ({ intensity: 0, frequency: 0, span: 0, density: 0 })
  )
  const [result, setResult] = useState<{ level: Level; total: number } | null>(null)

  function pick(val: number) {
    const q = questions[current]
    const scoreVal = val + 1
    const next = { ...dimScores, [q.dim]: dimScores[q.dim] + scoreVal }
    if (current + 1 >= questions.length) {
      const total = Object.values(next).reduce((s, v) => s + v, 0)
      setDimScores(next)
      setResult({ level: getLevel(total), total })
    } else {
      setDimScores(next)
      setCurrent(current + 1)
    }
  }

  function restart() {
    setDimScores({ intensity: 0, frequency: 0, span: 0, density: 0 })
    setCurrent(0)
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result.level][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = result !== null

  if (!finished) {
    const q = questions[current]
    const progress = Math.round((current / questions.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
          >
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--primary, #16a34a)' }} />
          </div>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: 'var(--card, #fff)' }}>
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={label}
              className="w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors flex items-center gap-3"
              style={{ backgroundColor: 'var(--card, #fff)' }}
            >
              <span
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-none"
                style={{ borderColor: 'var(--primary, #16a34a)', color: 'var(--primary, #16a34a)' }}
              >{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.note}</p>
      </div>
    )
  }

  const r = RESULTS[result.level][locale]
  const pct = Math.round((result.total / 60) * 100)
  const levelColors: Record<Level, string> = {
    low: '#94a3b8', developing: '#f59e0b', appreciative: '#22c55e', deeply_grateful: '#16a34a',
  }
  const color = levelColors[result.level]
  const maxPerDim = 15 // 3 questions * 5 max
  const dimColors: Record<DimKey, string> = {
    intensity: '#8b5cf6', frequency: '#3b82f6', span: '#22c55e', density: '#f59e0b',
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.yourLevel}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: color }}>
          {r.title}
        </div>
        <p className="font-bold" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{r.subtitle}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{r.description}</p>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color }}>{result.total} {lb.outOf}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
          className="h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.dimProfile}</h3>
        {DIM_KEYS.map(key => {
          const dp = Math.round((dimScores[key] / maxPerDim) * 100)
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{lb.dimNames[key]}</span>
                <span>{dimScores[key]}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={dp}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.dimNames[key]}
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dp}%`, backgroundColor: dimColors[key] }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.insights}</h3>
        <ul className="space-y-1">
          {r.insights.map(s => (
            <li key={s} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span>•</span>{s}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.practices}</h3>
        <ul className="space-y-1">
          {r.practices.map(p => (
            <li key={p} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span style={{ color: '#22c55e' }}>→</span>{p}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.affirmation}</h3>
        <p className="text-sm" style={{ color: '#15803d' }}>"{r.affirmation}"</p>
      </div>

      <p className="text-center text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-lg border px-4 py-2 text-sm font-bold transition-colors"
          style={{ backgroundColor: 'var(--card, #fff)' }}
        >{lb.restart}</button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#16a34a' }}
        >{lb.share}</button>
      </div>
    </div>
  )
}
