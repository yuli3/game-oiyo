import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

type Dim = 'O' | 'C' | 'E' | 'A' | 'N'
type DimLevel = 'high' | 'medium' | 'low'

interface Question {
  id: string
  dim: Dim
  text: string
}

interface DimMeta {
  label: string
  color: string
}

const DIM_META: Record<Dim, Record<SupportedLang, DimMeta>> = {
  O: {
    ko: { label: '개방성', color: '#8b5cf6' },
    en: { label: 'Openness', color: '#8b5cf6' },
    ja: { label: '開放性', color: '#8b5cf6' },
  },
  C: {
    ko: { label: '성실성', color: '#3b82f6' },
    en: { label: 'Conscientiousness', color: '#3b82f6' },
    ja: { label: '誠実性', color: '#3b82f6' },
  },
  E: {
    ko: { label: '외향성', color: '#f59e0b' },
    en: { label: 'Extraversion', color: '#f59e0b' },
    ja: { label: '外向性', color: '#f59e0b' },
  },
  A: {
    ko: { label: '친화성', color: '#22c55e' },
    en: { label: 'Agreeableness', color: '#22c55e' },
    ja: { label: '協調性', color: '#22c55e' },
  },
  N: {
    ko: { label: '신경성', color: '#ef4444' },
    en: { label: 'Neuroticism', color: '#ef4444' },
    ja: { label: '神経症的傾向', color: '#ef4444' },
  },
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourProfile: string
  dominantTrait: string
  secondaryTrait: string
  traitProfile: string
  scoreLabel: string
  note: string
  high: string
  medium: string
  low: string
}> = {
  ko: {
    title: '빅파이브 성격 테스트 (OCEAN)',
    subtitle: '나의 다섯 가지 성격 차원을 측정해보세요',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '아닌 편이다', '보통이다', '그런 편이다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 OCEAN 성격 프로파일',
    yourProfile: '나의 성격 프로파일',
    dominantTrait: '주요 특성',
    secondaryTrait: '보조 특성',
    traitProfile: '차원별 분석',
    scoreLabel: '점수',
    note: '이 테스트는 학술적 빅파이브 모델을 기반으로 하며, 전문적 진단을 대체하지 않습니다.',
    high: '높음',
    medium: '보통',
    low: '낮음',
  },
  en: {
    title: 'Big Five Personality Test (OCEAN)',
    subtitle: 'Measure your five personality dimensions',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My OCEAN personality profile',
    yourProfile: 'Your Personality Profile',
    dominantTrait: 'Dominant Trait',
    secondaryTrait: 'Secondary Trait',
    traitProfile: 'Dimension Analysis',
    scoreLabel: 'Score',
    note: 'This test is based on the academic Big Five model and does not replace professional assessment.',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  ja: {
    title: 'ビッグファイブ性格テスト（OCEAN）',
    subtitle: '5つの性格次元を測定しましょう',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全く違う', 'どちらかといえば違う', 'どちらでもない', 'どちらかといえばそう', '非常にそう思う'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のOCEAN性格プロファイル',
    yourProfile: '私の性格プロファイル',
    dominantTrait: '主要特性',
    secondaryTrait: '副特性',
    traitProfile: '次元別分析',
    scoreLabel: 'スコア',
    note: 'このテストは学術的なビッグファイブモデルに基づいており、専門的な診断の代替ではありません。',
    high: '高い',
    medium: '普通',
    low: '低い',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', dim: 'O', text: '새로운 아이디어와 개념에 쉽게 흥미를 느낀다' },
    { id: 'q2', dim: 'O', text: '예술, 음악, 문학에 깊은 관심이 있다' },
    { id: 'q3', dim: 'O', text: '상상력이 풍부하고 창의적인 편이다' },
    { id: 'q4', dim: 'O', text: '다양한 문화나 철학적 사상을 탐구하는 것을 즐긴다' },
    { id: 'q5', dim: 'C', text: '맡은 일을 끝까지 완수한다' },
    { id: 'q6', dim: 'C', text: '계획을 세우고 그것을 따르는 것을 중요하게 생각한다' },
    { id: 'q7', dim: 'C', text: '물건을 항상 제자리에 두고 정리정돈을 잘 한다' },
    { id: 'q8', dim: 'C', text: '마감일이나 약속을 철저히 지킨다' },
    { id: 'q9', dim: 'E', text: '파티나 모임에서 자연스럽게 대화를 이끌어간다' },
    { id: 'q10', dim: 'E', text: '새로운 사람을 만나는 것이 즐겁고 에너지가 넘친다' },
    { id: 'q11', dim: 'E', text: '혼자 있는 것보다 사람들과 함께할 때 더 활기차다' },
    { id: 'q12', dim: 'E', text: '주변에 항상 사람이 많고 사교적인 생활을 즐긴다' },
    { id: 'q13', dim: 'A', text: '다른 사람의 감정을 쉽게 이해하고 공감한다' },
    { id: 'q14', dim: 'A', text: '갈등보다 화합을 선호하며 양보를 잘 한다' },
    { id: 'q15', dim: 'A', text: '타인을 기꺼이 돕고 협력하는 것을 즐긴다' },
    { id: 'q16', dim: 'A', text: '사람들을 기본적으로 신뢰하는 편이다' },
    { id: 'q17', dim: 'N', text: '사소한 일에도 쉽게 걱정하거나 불안해진다' },
    { id: 'q18', dim: 'N', text: '기분 변화가 심하고 감정 기복이 있는 편이다' },
    { id: 'q19', dim: 'N', text: '스트레스 상황에서 쉽게 압도당한다' },
    { id: 'q20', dim: 'N', text: '비판이나 실패에 오랫동안 영향을 받는다' },
  ],
  en: [
    { id: 'q1', dim: 'O', text: 'I am easily fascinated by new ideas and concepts' },
    { id: 'q2', dim: 'O', text: 'I have a deep interest in art, music, or literature' },
    { id: 'q3', dim: 'O', text: 'I am imaginative and creative' },
    { id: 'q4', dim: 'O', text: 'I enjoy exploring different cultures and philosophical ideas' },
    { id: 'q5', dim: 'C', text: 'I follow through on tasks assigned to me' },
    { id: 'q6', dim: 'C', text: 'I value making plans and sticking to them' },
    { id: 'q7', dim: 'C', text: 'I keep things in their place and stay organized' },
    { id: 'q8', dim: 'C', text: 'I strictly meet deadlines and keep commitments' },
    { id: 'q9', dim: 'E', text: 'I naturally take the lead in conversations at parties or gatherings' },
    { id: 'q10', dim: 'E', text: 'Meeting new people is enjoyable and energizing for me' },
    { id: 'q11', dim: 'E', text: 'I feel more energized around people than when alone' },
    { id: 'q12', dim: 'E', text: 'I enjoy having a busy social life with many people around' },
    { id: 'q13', dim: 'A', text: 'I easily understand and empathize with others\' feelings' },
    { id: 'q14', dim: 'A', text: 'I prefer harmony over conflict and readily compromise' },
    { id: 'q15', dim: 'A', text: 'I willingly help others and enjoy cooperating' },
    { id: 'q16', dim: 'A', text: 'I generally trust people by default' },
    { id: 'q17', dim: 'N', text: 'I easily worry or feel anxious about minor things' },
    { id: 'q18', dim: 'N', text: 'I have significant mood swings and emotional ups and downs' },
    { id: 'q19', dim: 'N', text: 'I feel overwhelmed easily in stressful situations' },
    { id: 'q20', dim: 'N', text: 'Criticism or failure affects me for a long time' },
  ],
  ja: [
    { id: 'q1', dim: 'O', text: '新しいアイデアや概念にすぐ興味を持つ' },
    { id: 'q2', dim: 'O', text: '芸術・音楽・文学に深い関心がある' },
    { id: 'q3', dim: 'O', text: '想像力が豊かでクリエイティブな方だ' },
    { id: 'q4', dim: 'O', text: '様々な文化や哲学的思想を探求することを楽しむ' },
    { id: 'q5', dim: 'C', text: '任された仕事を最後までやり遂げる' },
    { id: 'q6', dim: 'C', text: '計画を立ててそれに従うことを大切にする' },
    { id: 'q7', dim: 'C', text: '物を常に定位置に置き、整理整頓が得意だ' },
    { id: 'q8', dim: 'C', text: '締め切りや約束を厳守する' },
    { id: 'q9', dim: 'E', text: 'パーティや集まりで自然に会話をリードする' },
    { id: 'q10', dim: 'E', text: '新しい人に会うのが楽しくエネルギーが湧く' },
    { id: 'q11', dim: 'E', text: '一人でいるより人と一緒にいる方が活気づく' },
    { id: 'q12', dim: 'E', text: '常に周りに人がいて社交的な生活を楽しむ' },
    { id: 'q13', dim: 'A', text: '他の人の感情を簡単に理解して共感できる' },
    { id: 'q14', dim: 'A', text: '対立より調和を好み、譲ることが得意だ' },
    { id: 'q15', dim: 'A', text: '喜んで他者を助け、協力することを楽しむ' },
    { id: 'q16', dim: 'A', text: '基本的に人を信頼する方だ' },
    { id: 'q17', dim: 'N', text: '些細なことでも簡単に心配したり不安になる' },
    { id: 'q18', dim: 'N', text: '気分の浮き沈みが激しく感情の起伏がある' },
    { id: 'q19', dim: 'N', text: 'ストレスの多い状況で簡単に圧倒される' },
    { id: 'q20', dim: 'N', text: '批判や失敗に長時間影響を受ける' },
  ],
}

const DIM_DESCRIPTIONS: Record<Dim, Record<SupportedLang, Record<DimLevel, string>>> = {
  O: {
    ko: {
      high: '지적 호기심이 넘치고 창의적인 탐험가 — 새로운 아이디어와 경험을 끊임없이 추구합니다.',
      medium: '선택적 호기심을 가진 균형 잡힌 탐색자 — 익숙함과 새로움 사이에서 균형을 잡습니다.',
      low: '실용적이고 현실 지향적인 현실주의자 — 검증된 방법과 구체적인 사실을 선호합니다.',
    },
    en: {
      high: 'A creative explorer overflowing with intellectual curiosity — constantly seeking new ideas and experiences.',
      medium: 'A balanced seeker with selective curiosity — you balance the familiar with the novel.',
      low: 'A practical, grounded realist — you prefer proven methods and concrete facts.',
    },
    ja: {
      high: '知的好奇心に溢れたクリエイティブな探求者 — 新しいアイデアと経験を絶えず追い求めます。',
      medium: '選択的な好奇心を持つバランスの取れた探索者 — 馴染みあるものと新しいものの間でバランスを取ります。',
      low: '実用的で現実志向の現実主義者 — 実績のある方法と具体的な事実を好みます。',
    },
  },
  C: {
    ko: {
      high: '체계적이고 목표 지향적인 성취자 — 높은 자기 규율로 꾸준히 목표를 달성합니다.',
      medium: '유연한 계획가 — 구조와 자발성 사이에서 상황에 맞게 조절합니다.',
      low: '자유롭고 즉흥적인 탐험자 — 엄격한 계획보다 흐름에 따라 움직이는 것을 좋아합니다.',
    },
    en: {
      high: 'A systematic, goal-driven achiever — consistently reaching goals through strong self-discipline.',
      medium: 'A flexible planner — you adapt between structure and spontaneity based on the situation.',
      low: 'A free-spirited, improvisational explorer — you prefer going with the flow over rigid plans.',
    },
    ja: {
      high: '体系的で目標志向の達成者 — 高い自己規律で着実に目標を達成します。',
      medium: '柔軟なプランナー — 状況に応じて構造と即興の間で調整します。',
      low: '自由で即興的な探求者 — 厳格な計画より流れに従うことを好みます。',
    },
  },
  E: {
    ko: {
      high: '에너지 넘치고 사교적인 소통가 — 사람들과의 상호작용에서 활력을 얻습니다.',
      medium: '상황에 따라 유연한 양향적 인물 — 사교적이면서도 혼자만의 시간을 소중히 여깁니다.',
      low: '깊이 있는 사고를 즐기는 내향적 성찰가 — 소수와의 깊은 연결을 선호합니다.',
    },
    en: {
      high: 'An energetic, sociable communicator — you gain vitality from interactions with others.',
      medium: 'A flexible ambivert — sociable yet valuing your alone time equally.',
      low: 'A reflective introvert who enjoys deep thinking — you prefer meaningful connections with a few.',
    },
    ja: {
      high: 'エネルギッシュで社交的なコミュニケーター — 人との交流から活力を得ます。',
      medium: '状況に応じて柔軟な両向性の人物 — 社交的でありながら一人の時間も大切にします。',
      low: '深い思考を楽しむ内向的な内省家 — 少数との深いつながりを好みます。',
    },
  },
  A: {
    ko: {
      high: '공감 능력이 뛰어난 따뜻한 협력자 — 타인을 배려하고 조화를 중시합니다.',
      medium: '선택적 신뢰와 공감의 균형자 — 상황에 따라 협력과 자기주장을 조율합니다.',
      low: '독립적이고 직설적인 현실주의자 — 타인의 눈치보다 솔직한 의견을 우선시합니다.',
    },
    en: {
      high: 'A warm, empathetic collaborator — you care deeply for others and value harmony.',
      medium: 'A balanced cooperator with selective trust — you blend collaboration with assertiveness.',
      low: 'An independent, direct realist — you prioritize honest opinions over social approval.',
    },
    ja: {
      high: '共感能力に優れた温かい協力者 — 他者への思いやりと調和を大切にします。',
      medium: '選択的な信頼と共感のバランサー — 状況に応じて協力と主張を調整します。',
      low: '独立的で率直な現実主義者 — 他者の目よりも率直な意見を優先します。',
    },
  },
  N: {
    ko: {
      high: '감수성이 풍부하고 깊이 느끼는 사람 — 감정 경험이 풍부하지만 스트레스 관리가 중요합니다.',
      medium: '감정적으로 균형 잡힌 현실적인 사람 — 대부분의 상황에서 감정을 안정적으로 유지합니다.',
      low: '정서적으로 안정되고 회복력이 강한 사람 — 스트레스 상황에서도 침착함을 유지합니다.',
    },
    en: {
      high: 'A deeply feeling, emotionally rich person — your emotional range is vast, though stress management is key.',
      medium: 'An emotionally balanced, realistic person — you maintain stability in most situations.',
      low: 'An emotionally stable, resilient person — you stay calm even in stressful situations.',
    },
    ja: {
      high: '豊かな感受性で深く感じる人 — 感情体験が豊富ですが、ストレス管理が重要です。',
      medium: '感情的にバランスの取れた現実的な人 — ほとんどの状況で感情を安定して維持します。',
      low: '感情的に安定した回復力の強い人 — ストレスの多い状況でも落ち着きを保ちます。',
    },
  },
}

interface ScoreMap { O: number; C: number; E: number; A: number; N: number }

function calcDimLevel(pct: number): DimLevel {
  return pct >= 65 ? 'high' : pct >= 35 ? 'medium' : 'low'
}

function computeScores(answers: number[]): ScoreMap {
  const sums: ScoreMap = { O: 0, C: 0, E: 0, A: 0, N: 0 }
  const dims: Dim[] = ['O', 'O', 'O', 'O', 'C', 'C', 'C', 'C', 'E', 'E', 'E', 'E', 'A', 'A', 'A', 'A', 'N', 'N', 'N', 'N']
  answers.forEach((v, i) => { sums[dims[i]] += v })
  // Each dim: min=4 (four 1s), max=20 (four 5s). Normalize to 0–100.
  const scores: ScoreMap = { O: 0, C: 0, E: 0, A: 0, N: 0 }
  const dimKeys: Dim[] = ['O', 'C', 'E', 'A', 'N']
  dimKeys.forEach(d => {
    scores[d] = Math.round(((sums[d] - 4) / 16) * 100)
  })
  return scores
}

interface Props { locale?: string }

export default function BigFivePersonalityTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [scores, setScores] = useState<ScoreMap | null>(null)

  function pick(val: number) {
    const newAns = [...answers, val + 1]
    if (current + 1 >= questions.length) {
      setScores(computeScores(newAns))
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() {
    setAnswers([])
    setCurrent(0)
    setScores(null)
  }

  function share() {
    if (!scores) return
    const url = window.location.href
    const dimKeys: Dim[] = ['O', 'C', 'E', 'A', 'N']
    const dominant = dimKeys.reduce((a, b) => scores[a] >= scores[b] ? a : b)
    const text = `${lb.shareMsg} — ${DIM_META[dominant][locale].label} ${scores[dominant]}%`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= questions.length

  if (!finished) {
    const q = questions[current]
    const progress = Math.round((current / questions.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm text-muted-foreground">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={`${label} (${i + 1}점)`}
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!scores) return null

  const dimKeys: Dim[] = ['O', 'C', 'E', 'A', 'N']
  const sorted = [...dimKeys].sort((a, b) => scores[b] - scores[a])
  const dominant = sorted[0]
  const secondary = sorted[1]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourProfile}</p>
        <h1 className="text-2xl font-bold">{lb.title}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <p className="text-xs text-muted-foreground">{lb.dominantTrait}</p>
          <p className="font-bold text-lg" style={{ color: DIM_META[dominant][locale].color }}>
            {DIM_META[dominant][locale].label}
          </p>
          <p className="text-xs text-muted-foreground">{scores[dominant]}%</p>
        </div>
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <p className="text-xs text-muted-foreground">{lb.secondaryTrait}</p>
          <p className="font-bold text-lg" style={{ color: DIM_META[secondary][locale].color }}>
            {DIM_META[secondary][locale].label}
          </p>
          <p className="text-xs text-muted-foreground">{scores[secondary]}%</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="font-semibold text-sm">{lb.traitProfile}</h2>
        {dimKeys.map(d => {
          const pct = scores[d]
          const level = calcDimLevel(pct)
          const meta = DIM_META[d][locale]
          const levelLabel = lb[level]
          return (
            <div key={d} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-muted-foreground text-xs">{levelLabel} {pct}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${meta.label} ${pct}%`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {DIM_DESCRIPTIONS[d][locale][level]}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
