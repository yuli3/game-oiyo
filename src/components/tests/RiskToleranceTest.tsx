import { useState } from 'react'

type RiskLevel = 'conservative' | 'moderate' | 'balanced' | 'adventurous'
type Subscale = 'financial' | 'life'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question {
  id: string
  text: string
  subscale: Subscale
  reverse: boolean
}

interface ResultData {
  icon: string
  title: string
  subtitle: string
  description: string
  investmentAdvice: string[]
  lifeAdvice: string[]
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourLevel: string
  financialScore: string
  lifeScore: string
  overallScore: string
  investmentAdvice: string
  lifeAdvice: string
  note: string
}> = {
  ko: {
    title: '위험 선호도 테스트',
    subtitle: '나는 안정형인가 모험형인가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 위험 선호도는',
    yourLevel: '나의 위험 선호도',
    financialScore: '금융 리스크 성향',
    lifeScore: '인생 리스크 성향',
    overallScore: '종합 위험 선호도',
    investmentAdvice: '금융 조언',
    lifeAdvice: '인생 조언',
    note: '이 테스트는 참고용입니다. 실제 투자 결정 전 전문가 상담을 받으세요.',
  },
  en: {
    title: 'Risk Tolerance Test',
    subtitle: 'Are You Conservative or Adventurous?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My risk tolerance is',
    yourLevel: 'Your Risk Profile',
    financialScore: 'Financial Risk',
    lifeScore: 'Life Risk',
    overallScore: 'Overall Risk Tolerance',
    investmentAdvice: 'Financial Advice',
    lifeAdvice: 'Life Advice',
    note: 'For reference only. Consult a financial professional before making investment decisions.',
  },
  ja: {
    title: 'リスク許容度テスト',
    subtitle: '安定志向？それとも冒険志向？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くそう思わない', 'そう思わない', '普通', 'そう思う', '非常にそう思う'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のリスク許容度は',
    yourLevel: 'リスクプロファイル',
    financialScore: '金融リスク傾向',
    lifeScore: 'ライフリスク傾向',
    overallScore: '総合リスク許容度',
    investmentAdvice: '金融アドバイス',
    lifeAdvice: 'ライフアドバイス',
    note: '参考用テストです。実際の投資判断の前に専門家にご相談ください。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'f1', text: '투자에서 원금 손실 가능성이 있어도 높은 수익을 기대하며 투자한다', subscale: 'financial', reverse: false },
    { id: 'f2', text: '주가가 20% 하락해도 장기 투자 관점에서 유지한다', subscale: 'financial', reverse: false },
    { id: 'f3', text: '비상금을 전부 투자에 활용해도 크게 불안하지 않다', subscale: 'financial', reverse: false },
    { id: 'f4', text: '투자보다 안정적인 예·적금을 선호한다', subscale: 'financial', reverse: true },
    { id: 'f5', text: '새로운 금융 상품(ETF, 가상화폐 등)에 적극적으로 투자한다', subscale: 'financial', reverse: false },
    { id: 'f6', text: '손실이 발생하면 밤잠을 못 잘 정도로 불안하다', subscale: 'financial', reverse: true },
    { id: 'f7', text: '레버리지(빌린 돈 투자)를 활용하는 것이 두렵지 않다', subscale: 'financial', reverse: false },
    { id: 'l1', text: '계획에 없던 여행이나 새로운 경험에 즉흥적으로 뛰어든다', subscale: 'life', reverse: false },
    { id: 'l2', text: '안정적인 직장보다 가능성 있는 스타트업을 선택할 수 있다', subscale: 'life', reverse: false },
    { id: 'l3', text: '새로운 사람을 만나는 것이 설레고 두렵지 않다', subscale: 'life', reverse: false },
    { id: 'l4', text: '변화보다 안정적이고 예측 가능한 생활을 선호한다', subscale: 'life', reverse: true },
    { id: 'l5', text: '모르는 음식이나 낯선 경험을 기꺼이 시도한다', subscale: 'life', reverse: false },
    { id: 'l6', text: '큰 결정(이민, 이직, 창업)을 앞두고 흥분감을 느낀다', subscale: 'life', reverse: false },
    { id: 'l7', text: '실패가 두려워 도전을 꺼리는 편이다', subscale: 'life', reverse: true },
  ],
  en: [
    { id: 'f1', text: 'I invest for high returns even when there\'s a risk of losing principal', subscale: 'financial', reverse: false },
    { id: 'f2', text: 'If stocks drop 20%, I hold for the long term rather than selling', subscale: 'financial', reverse: false },
    { id: 'f3', text: 'Using all my emergency fund for investments wouldn\'t bother me much', subscale: 'financial', reverse: false },
    { id: 'f4', text: 'I prefer safe savings accounts over investment products', subscale: 'financial', reverse: true },
    { id: 'f5', text: 'I actively invest in new financial products like ETFs or crypto', subscale: 'financial', reverse: false },
    { id: 'f6', text: 'A financial loss keeps me up at night with anxiety', subscale: 'financial', reverse: true },
    { id: 'f7', text: 'Using leverage (investing with borrowed money) doesn\'t scare me', subscale: 'financial', reverse: false },
    { id: 'l1', text: 'I spontaneously jump into unplanned trips or new experiences', subscale: 'life', reverse: false },
    { id: 'l2', text: 'I could choose a promising startup over a stable company', subscale: 'life', reverse: false },
    { id: 'l3', text: 'Meeting new people excites me and doesn\'t feel intimidating', subscale: 'life', reverse: false },
    { id: 'l4', text: 'I prefer stable, predictable life over constant change', subscale: 'life', reverse: true },
    { id: 'l5', text: 'I willingly try unfamiliar food or unusual experiences', subscale: 'life', reverse: false },
    { id: 'l6', text: 'Big life decisions (emigrating, career change, starting a business) excite me', subscale: 'life', reverse: false },
    { id: 'l7', text: 'Fear of failure often stops me from taking on challenges', subscale: 'life', reverse: true },
  ],
  ja: [
    { id: 'f1', text: '元本割れリスクがあっても高いリターンを期待して投資する', subscale: 'financial', reverse: false },
    { id: 'f2', text: '株価が20%下落しても長期投資の観点から保有し続ける', subscale: 'financial', reverse: false },
    { id: 'f3', text: '緊急資金を全て投資に使っても大きな不安は感じない', subscale: 'financial', reverse: false },
    { id: 'f4', text: '投資より安定した預金・積立を好む', subscale: 'financial', reverse: true },
    { id: 'f5', text: 'ETFや仮想通貨など新しい金融商品に積極的に投資する', subscale: 'financial', reverse: false },
    { id: 'f6', text: '損失が出ると眠れないほど不安になる', subscale: 'financial', reverse: true },
    { id: 'f7', text: 'レバレッジ（借金投資）を活用することが怖くない', subscale: 'financial', reverse: false },
    { id: 'l1', text: '計画外の旅行や新しい経験に即興で飛び込む', subscale: 'life', reverse: false },
    { id: 'l2', text: '安定した大企業よりも可能性のあるスタートアップを選べる', subscale: 'life', reverse: false },
    { id: 'l3', text: '新しい人に会うことが楽しみで怖くない', subscale: 'life', reverse: false },
    { id: 'l4', text: '変化よりも安定して予測可能な生活を好む', subscale: 'life', reverse: true },
    { id: 'l5', text: '知らない食べ物や珍しい体験を喜んで試す', subscale: 'life', reverse: false },
    { id: 'l6', text: '移住・転職・起業などの大きな決断を前にワクワクする', subscale: 'life', reverse: false },
    { id: 'l7', text: '失敗が怖くて挑戦を避けがちだ', subscale: 'life', reverse: true },
  ],
}

const RESULTS: Record<RiskLevel, Record<SupportedLang, ResultData>> = {
  conservative: {
    ko: {
      icon: '🛡️',
      title: '안정형',
      subtitle: '안정과 확실성을 최우선으로 합니다',
      description: '손실에 대한 민감도가 높고 예측 가능성을 중시합니다. 안전한 선택을 선호하며 큰 변화를 불편하게 느낍니다. 이는 단점이 아니라 당신의 성향입니다.',
      investmentAdvice: ['예금·국채 등 안전 자산 위주', '분산 투자로 변동성 최소화', '비상금 3–6개월치 먼저 확보', 'ETF 등 저위험 상품으로 시작'],
      lifeAdvice: ['안정적인 환경에서 최고 성과 발휘', '작은 변화부터 단계적으로 시도', '자신의 안정 선호를 강점으로 인식하기'],
    },
    en: {
      icon: '🛡️',
      title: 'Conservative',
      subtitle: 'Stability and certainty come first',
      description: 'You are highly sensitive to loss and value predictability above all. You prefer safe choices and feel uncomfortable with major changes. This is a natural trait, not a weakness.',
      investmentAdvice: ['Focus on safe assets: savings, government bonds', 'Diversify broadly to minimize volatility', 'Build a 3–6 month emergency fund first', 'Start with low-risk products like broad ETFs'],
      lifeAdvice: ['You perform best in stable, structured environments', 'Introduce change gradually and incrementally', 'Recognize your stability preference as a genuine strength'],
    },
    ja: {
      icon: '🛡️',
      title: '安定型',
      subtitle: '安定と確実性を最優先にします',
      description: '損失への感受性が高く、予測可能性を重視します。安全な選択を好み、大きな変化を不快に感じます。これは欠点ではなく、あなたの傾向です。',
      investmentAdvice: ['預金・国債などの安全資産中心', '分散投資でボラティリティを最小化', '緊急資金3–6ヶ月分を先に確保', '低リスク商品（インデックスETF等）から始める'],
      lifeAdvice: ['安定した環境で最高のパフォーマンスを発揮', '小さな変化から段階的に試す', '安定志向を強みとして認識する'],
    },
  },
  moderate: {
    ko: {
      icon: '⚖️',
      title: '보수적 균형형',
      subtitle: '안정을 선호하지만 적당한 위험은 감수합니다',
      description: '기본적으로 안정을 추구하지만 합리적인 위험을 선별적으로 수용합니다. 충분한 정보와 준비가 있을 때 도전을 고려합니다.',
      investmentAdvice: ['안전 자산 60–70%, 성장 자산 30–40% 배분', '정기 적립식 투자로 평균 매입 단가 낮추기', '포트폴리오 분기별 리밸런싱', '단기 트레이딩보다 장기 투자 선호'],
      lifeAdvice: ['리스크 분석 후 행동하는 균형 잡힌 접근', '준비된 도전은 두려움 없이 시도 가능', '지나친 안전 추구가 기회 손실로 이어질 수 있음'],
    },
    en: {
      icon: '⚖️',
      title: 'Moderate',
      subtitle: 'Stability-leaning, but open to measured risk',
      description: 'You fundamentally prefer stability but selectively accept reasonable risks. You consider challenges when you have sufficient information and preparation.',
      investmentAdvice: ['Allocate 60–70% safe assets, 30–40% growth assets', 'Use dollar-cost averaging to reduce entry risk', 'Rebalance your portfolio quarterly', 'Prefer long-term investing over short-term trading'],
      lifeAdvice: ['Balanced approach: analyze risk before acting', 'Prepared challenges can be taken without excessive fear', 'Watch for over-caution causing missed opportunities'],
    },
    ja: {
      icon: '⚖️',
      title: '保守的バランス型',
      subtitle: '安定志向だが適度なリスクは受け入れる',
      description: '基本的に安定を求めつつ、合理的なリスクを選択的に受け入れます。十分な情報と準備があるときに挑戦を検討します。',
      investmentAdvice: ['安全資産60–70%、成長資産30–40%の配分', '積立投資で平均取得単価を下げる', 'ポートフォリオを四半期ごとにリバランス', '短期トレードより長期投資を優先'],
      lifeAdvice: ['リスク分析後に行動するバランスの取れたアプローチ', '準備された挑戦は恐れずに取り組める', '過度な安全志向が機会損失につながることも'],
    },
  },
  balanced: {
    ko: {
      icon: '🌊',
      title: '균형형',
      subtitle: '위험과 안정 사이에서 균형을 잘 유지합니다',
      description: '위험과 보상의 트레이드오프를 합리적으로 평가합니다. 상황에 따라 공격적으로도, 방어적으로도 유연하게 접근할 수 있습니다.',
      investmentAdvice: ['성장 자산과 안전 자산의 균형 있는 배분', '섹터 분산과 지역 분산 동시 추구', '시장 변동성을 기회로 활용', '연령에 맞는 포트폴리오 주기적 조정'],
      lifeAdvice: ['다양한 상황에서 유연한 판단', '위험 수용 능력이 강점으로 작용', '충동적 결정 전 잠깐 멈추는 습관 권장'],
    },
    en: {
      icon: '🌊',
      title: 'Balanced',
      subtitle: 'You maintain a healthy risk-reward equilibrium',
      description: 'You rationally evaluate risk-reward trade-offs. You can be aggressive or defensive depending on the situation — a genuinely valuable adaptability.',
      investmentAdvice: ['Balanced allocation between growth and safe assets', 'Pursue both sector and geographic diversification', 'Use market volatility as a buying opportunity', 'Periodically adjust portfolio allocation to match life stage'],
      lifeAdvice: ['Flexible judgment across a wide variety of situations', 'Your risk tolerance is a real competitive advantage', 'Build a habit of pausing briefly before impulsive decisions'],
    },
    ja: {
      icon: '🌊',
      title: 'バランス型',
      subtitle: 'リスクと安定のバランスをうまく保っています',
      description: 'リスクとリターンのトレードオフを合理的に評価します。状況に応じて攻撃的にも守備的にも柔軟に対応できます。',
      investmentAdvice: ['成長資産と安全資産のバランスある配分', 'セクター分散と地域分散を同時に追求', '市場の変動をチャンスとして活用', 'ライフステージに合わせて定期的にポートフォリオを調整'],
      lifeAdvice: ['様々な状況での柔軟な判断', 'リスク許容度が競争優位として機能', '衝動的な決断の前に少し立ち止まる習慣を'],
    },
  },
  adventurous: {
    ko: {
      icon: '🚀',
      title: '모험형',
      subtitle: '높은 위험에도 기꺼이 도전합니다',
      description: '높은 위험을 감수하고 큰 보상을 추구합니다. 변화와 불확실성이 흥미롭게 느껴집니다. 이 성향은 큰 성공의 원동력이지만, 과도한 위험에 주의가 필요합니다.',
      investmentAdvice: ['성장 자산 중심 포트폴리오 구성 가능', '그러나 전체 자산의 최소 20–30%는 안전 자산으로', '레버리지 사용 시 손실 한도 엄격히 설정', '감정적 투자 결정 경계 — 흥분 상태의 판단은 위험'],
      lifeAdvice: ['높은 에너지와 도전 정신은 큰 강점', '장기 계획과 리스크 관리 병행 필수', '주변 사람들에 미치는 위험도 고려하기'],
    },
    en: {
      icon: '🚀',
      title: 'Adventurous',
      subtitle: 'You embrace high risk for high reward',
      description: 'You tolerate high risk and pursue large rewards. Change and uncertainty feel interesting rather than threatening. This trait can drive great success, but requires disciplined risk management.',
      investmentAdvice: ['Growth-heavy portfolio is viable for you', 'But keep at least 20–30% in safe assets as a floor', 'Set strict loss limits before using leverage', 'Guard against emotional decisions when excited — that\'s when errors happen'],
      lifeAdvice: ['High energy and boldness are genuine strengths', 'Pair your risk appetite with long-term planning and controls', 'Consider the impact of your risks on people around you'],
    },
    ja: {
      icon: '🚀',
      title: '冒険型',
      subtitle: '高いリスクも厭わず挑戦します',
      description: '高いリスクを受け入れ、大きなリターンを追求します。変化と不確実性を面白く感じます。この性質は大きな成功の原動力ですが、過度なリスクには注意が必要です。',
      investmentAdvice: ['成長資産中心のポートフォリオが選択肢に', 'ただし総資産の最低20–30%は安全資産として確保', 'レバレッジ使用時は損失上限を厳格に設定', '興奮状態での感情的投資判断は危険'],
      lifeAdvice: ['高いエネルギーと挑戦精神は大きな強み', 'リスク志向と長期計画・管理の両立が必須', '自分のリスクが周囲の人々に与える影響も考慮'],
    },
  },
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  conservative: '#22c55e',
  moderate: '#84cc16',
  balanced: '#f59e0b',
  adventurous: '#ef4444',
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= 2.0) return 'conservative'
  if (score <= 3.0) return 'moderate'
  if (score <= 4.0) return 'balanced'
  return 'adventurous'
}

interface Props { locale?: string }

export default function RiskToleranceTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{
    overall: RiskLevel
    financialScore: number
    lifeScore: number
    overallScore: number
  } | null>(null)

  function calcResult(ans: number[]): typeof result {
    let fSum = 0
    let lSum = 0
    let fCount = 0
    let lCount = 0

    questions.forEach((q, i) => {
      const raw = ans[i] + 1 // convert 0-4 to 1-5
      const val = q.reverse ? 6 - raw : raw
      if (q.subscale === 'financial') { fSum += val; fCount++ }
      else { lSum += val; lCount++ }
    })

    const financialScore = fCount > 0 ? fSum / fCount : 3
    const lifeScore = lCount > 0 ? lSum / lCount : 3
    const overallScore = (financialScore + lifeScore) / 2

    return {
      overall: scoreToLevel(overallScore),
      financialScore: Math.round(financialScore * 10) / 10,
      lifeScore: Math.round(lifeScore * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
    }
  }

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) setResult(calcResult(newAns))
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null) }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result.overall][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= questions.length
  const progress = Math.round((current / questions.length) * 100)

  if (!finished) {
    const q = questions[current]
    const isFinancial = q.subscale === 'financial'
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
            className="h-2 rounded-full bg-muted overflow-hidden"
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex justify-center">
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${isFinancial ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
            {isFinancial ? (locale === 'ko' ? '금융 리스크' : locale === 'ja' ? '金融リスク' : 'Financial Risk') : (locale === 'ko' ? '인생 리스크' : locale === 'ja' ? 'ライフリスク' : 'Life Risk')}
          </span>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={label}
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">
                {i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.overall][locale]
  const color = LEVEL_COLORS[result.overall]
  const maxScore = 5

  const bars: { label: string; score: number; color: string }[] = [
    { label: lb.financialScore, score: result.financialScore, color: '#22c55e' },
    { label: lb.lifeScore, score: result.lifeScore, color: '#06b6d4' },
    { label: lb.overallScore, score: result.overallScore, color },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {r.icon} {r.title}
        </div>
        <p className="font-bold text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-4">
        {bars.map(bar => {
          const pct = Math.round((bar.score / maxScore) * 100)
          return (
            <div key={bar.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold">{bar.label}</span>
                <span className="text-muted-foreground">{bar.score} / 5</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={bar.label}
                className="h-3 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.investmentAdvice}</h3>
        <ul className="space-y-1">
          {r.investmentAdvice.map(a => (
            <li key={a} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500">→</span>{a}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-sky-600">{lb.lifeAdvice}</h3>
        <ul className="space-y-1">
          {r.lifeAdvice.map(a => (
            <li key={a} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-sky-500">→</span>{a}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
