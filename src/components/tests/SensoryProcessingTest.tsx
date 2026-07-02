import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'
type SensLevel = 'high' | 'moderate' | 'low'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourLevel: string
  strengths: string
  selfCare: string
  scoreLabel: string
  outOf: string
  note: string
  levelLabels: Record<SensLevel, string>
  levelSubtitles: Record<SensLevel, string>
  levelDescriptions: Record<SensLevel, string>
  levelStrengths: Record<SensLevel, string[]>
  levelSelfCare: Record<SensLevel, string[]>
  hspInfo: string
}> = {
  ko: {
    title: '감각 예민도 테스트 (HSP)',
    subtitle: '나는 고감각인인가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '별로 아니다', '보통이다', '꽤 그렇다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 감각 예민도는',
    yourLevel: '나의 감각 예민도',
    strengths: '고감각인의 강점',
    selfCare: '자기 돌봄 팁',
    scoreLabel: '예민도 점수',
    outOf: '/ 75점',
    note: '이 테스트는 Elaine Aron 박사의 HSP(고감각인) 연구를 참고한 자기 탐색 도구입니다. 전문 진단을 대체하지 않습니다.',
    levelLabels: { high: '고감각인 (HSP)', moderate: '중간 감각인', low: '저감각인' },
    levelSubtitles: {
      high: '당신은 매우 예민하고 깊이 처리하는 사람입니다',
      moderate: '당신은 상황에 따라 유연하게 감각을 조절합니다',
      low: '당신은 자극에 쉽게 적응하는 강인한 감각을 가졌습니다',
    },
    levelDescriptions: {
      high: '전 세계 인구의 약 15~20%가 고감각인입니다. 당신은 감각 정보를 더 깊이 처리하고, 다른 사람의 감정에 강하게 공감하며, 미세한 변화를 잘 감지합니다. 이것은 선천적인 신경학적 특성으로, 약점이 아닌 고유한 강점입니다.',
      moderate: '당신은 감각 예민도가 중간 수준입니다. 상황에 따라 예민하게 반응하기도 하고, 자극에 익숙하게 대처하기도 합니다. 자신의 민감한 순간들을 인식하고 적절히 관리하는 것이 도움이 됩니다.',
      low: '당신은 자극에 잘 적응하고 강한 감각 내성을 가지고 있습니다. 시끄러운 환경이나 여러 자극 속에서도 잘 기능하며, 빠른 결정을 잘 내립니다. 단, 주변 사람들 중 고감각인이 있다면 그들의 필요를 이해하는 것이 중요합니다.',
    },
    levelStrengths: {
      high: ['깊은 공감 능력과 직관력', '예술과 자연에서 깊은 감동을 받음', '세부적인 것을 잘 알아챔', '깊이 생각하고 처리하는 능력', '타인의 감정을 잘 읽음', '창의성과 감수성'],
      moderate: ['상황 적응력', '공감과 현실감각의 균형', '다양한 환경에서 기능', '자기 조절 능력'],
      low: ['자극 내성과 강한 회복력', '역동적 환경에서 잘 기능', '빠른 결단력', '스트레스 상황에서 침착함'],
    },
    levelSelfCare: {
      high: ['정기적인 혼자만의 회복 시간 확보', '과도한 자극 환경 미리 파악하고 대비', '자연과의 연결로 에너지 회복', '명상이나 마음챙김 연습', '민감성을 비밀이 아닌 강점으로 인식', '경계 설정 연습'],
      moderate: ['자신의 민감한 순간 패턴 파악', '에너지 수준에 따른 자기 관리', '적절한 혼자 시간과 사회 활동 균형'],
      low: ['주변 고감각인들의 필요 이해하기', '감정 신호에 더 주의 기울이기', '속도를 늦추는 연습'],
    },
    hspInfo: 'HSP(Highly Sensitive Person)란?',
  },
  en: {
    title: 'Sensory Sensitivity Test (HSP)',
    subtitle: 'Am I a Highly Sensitive Person?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'A little', 'Moderately', 'Quite a bit', 'Extremely'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My sensory sensitivity level is',
    yourLevel: 'Your Sensory Sensitivity',
    strengths: 'HSP Strengths',
    selfCare: 'Self-Care Tips',
    scoreLabel: 'Sensitivity Score',
    outOf: '/ 75',
    note: 'This test is a self-exploration tool based on Dr. Elaine Aron\'s HSP research. It does not replace professional diagnosis.',
    levelLabels: { high: 'Highly Sensitive Person (HSP)', moderate: 'Moderate Sensitivity', low: 'Low Sensitivity' },
    levelSubtitles: {
      high: 'You are a deeply processing, highly sensitive person',
      moderate: 'You flexibly adjust sensitivity based on situation',
      low: 'You have robust sensory tolerance and adapt easily to stimulation',
    },
    levelDescriptions: {
      high: 'About 15–20% of the world\'s population are HSPs. You process sensory information more deeply, strongly empathize with others\' emotions, and detect subtle changes. This is an innate neurological trait — a unique strength, not a weakness.',
      moderate: 'Your sensory sensitivity is at a moderate level. You sometimes react sensitively and sometimes handle stimulation comfortably depending on the situation. Recognizing your sensitive moments and managing them is helpful.',
      low: 'You adapt well to stimulation and have strong sensory tolerance. You function well in noisy environments and with multiple stimuli, making quick decisions easily. Understanding the needs of highly sensitive people around you is important.',
    },
    levelStrengths: {
      high: ['Deep empathy and intuition', 'Deep moving by art and nature', 'Noticing fine details', 'Ability to think and process deeply', 'Reading others\' emotions well', 'Creativity and sensitivity'],
      moderate: ['Situational adaptability', 'Balance of empathy and practicality', 'Functioning in diverse environments', 'Self-regulation ability'],
      low: ['Sensory tolerance and resilience', 'Thriving in dynamic environments', 'Quick decision-making', 'Composure under stress'],
    },
    levelSelfCare: {
      high: ['Secure regular alone-time for recovery', 'Identify overstimulating environments in advance', 'Recharge in nature', 'Practice meditation or mindfulness', 'Recognize sensitivity as strength, not secret', 'Practice boundary-setting'],
      moderate: ['Identify your sensitive moment patterns', 'Self-manage according to energy levels', 'Balance alone time and social activity'],
      low: ['Understand the needs of HSPs around you', 'Pay more attention to emotional signals', 'Practice slowing down'],
    },
    hspInfo: 'What is HSP (Highly Sensitive Person)?',
  },
  ja: {
    title: '感覚敏感度テスト（HSP）',
    subtitle: '私は繊細な人（HSP）？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'あまりない', '普通', 'かなりそう', '非常にそう'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の感覚敏感度は',
    yourLevel: '私の感覚敏感度',
    strengths: 'HSPの強み',
    selfCare: 'セルフケアのヒント',
    scoreLabel: '敏感度スコア',
    outOf: '/ 75点',
    note: 'このテストはElaine Aron博士のHSP研究を参考にした自己探索ツールです。専門的な診断の代替ではありません。',
    levelLabels: { high: '高感度な人（HSP）', moderate: '中程度の感度', low: '低感度' },
    levelSubtitles: {
      high: 'あなたは深く処理する高感度な人です',
      moderate: 'あなたは状況に応じて柔軟に感覚を調整します',
      low: 'あなたは刺激に強い適応力を持っています',
    },
    levelDescriptions: {
      high: '世界人口の約15〜20%がHSPです。あなたは感覚情報をより深く処理し、他者の感情に強く共感し、微細な変化をよく感知します。これは先天的な神経学的特性であり、弱点ではなく独自の強みです。',
      moderate: 'あなたの感覚敏感度は中程度です。状況によって敏感に反応することもあれば、刺激に慣れて対処することもあります。自分の敏感な瞬間を認識して適切に管理することが役立ちます。',
      low: 'あなたは刺激によく適応し、強い感覚耐性を持っています。騒がしい環境や多くの刺激の中でもうまく機能し、素早い決断が得意です。周囲のHSPの人々のニーズを理解することが大切です。',
    },
    levelStrengths: {
      high: ['深い共感能力と直感力', '芸術や自然から深い感動を受ける', '細かいことをよく気づく', '深く考えて処理する能力', '他者の感情をよく読む', '創造性と感受性'],
      moderate: ['状況適応力', '共感と現実感覚のバランス', '多様な環境での機能', '自己調節能力'],
      low: ['刺激耐性と強い回復力', 'ダイナミックな環境でうまく機能', '素早い決断力', 'ストレス状況での落ち着き'],
    },
    levelSelfCare: {
      high: ['定期的な一人の回復時間を確保', '過度な刺激環境を事前に把握して備える', '自然との繋がりでエネルギーを回復', '瞑想やマインドフルネスの練習', '敏感性を秘密でなく強みとして認識', '境界設定の練習'],
      moderate: ['自分の敏感な瞬間のパターンを把握', 'エネルギーレベルに応じたセルフケア', '適切な一人の時間と社会活動のバランス'],
      low: ['周囲のHSPの人々のニーズを理解する', '感情のサインにもっと注意を払う', 'ペースを落とす練習'],
    },
    hspInfo: 'HSP（Highly Sensitive Person）とは？',
  },
}

interface Question {
  id: string
  text: Record<Locale, string>
}

const QUESTIONS: Question[] = [
  { id: 'q1', text: { ko: '다른 사람들의 기분 변화를 빠르게 알아챈다', en: 'I quickly notice changes in others\' moods', ja: '他者の気分の変化を素早く気づく' } },
  { id: 'q2', text: { ko: '한꺼번에 많은 일이 생기면 압도되는 느낌이 든다', en: 'I feel overwhelmed when many things happen at once', ja: '一度に多くのことが起きると圧倒される感じがする' } },
  { id: 'q3', text: { ko: '빛, 소리, 냄새, 촉감에 특히 민감하다', en: 'I\'m particularly sensitive to light, sound, smell, or touch', ja: '光、音、匂い、触感に特に敏感である' } },
  { id: 'q4', text: { ko: '예술, 음악, 자연에서 강한 감동을 받는다', en: 'I\'m deeply moved by art, music, or nature', ja: '芸術、音楽、自然から強い感動を受ける' } },
  { id: 'q5', text: { ko: '시끄럽고 혼잡한 장소는 쉽게 지치게 만든다', en: 'Loud and crowded places exhaust me quickly', ja: '騒がしくて混雑した場所はすぐに疲れさせる' } },
  { id: 'q6', text: { ko: '결정을 내릴 때 선택지가 많으면 압도된다', en: 'I feel overwhelmed when there are many choices', ja: '決断する時、選択肢が多いと圧倒される' } },
  { id: 'q7', text: { ko: '영화나 뉴스에서 폭력적인 장면을 보면 매우 힘들다', en: 'Violent scenes in movies or news deeply disturb me', ja: '映画やニュースの暴力的な場面を見るととても辛い' } },
  { id: 'q8', text: { ko: '다른 사람이 신체적으로 불편할 때 나도 불편함을 느낀다', en: 'I feel uncomfortable when others are physically uncomfortable', ja: '他者が身体的に不快な時、私も不快さを感じる' } },
  { id: 'q9', text: { ko: '짧은 시간에 많은 것을 해야 할 때 매우 불안하다', en: 'I get very anxious when I have to do a lot in a short time', ja: '短時間で多くのことをしなければならない時、非常に不安になる' } },
  { id: 'q10', text: { ko: '삶의 아름다움과 섬세함에 깊이 감동받는 편이다', en: 'I tend to be deeply touched by beauty and subtlety in life', ja: '人生の美しさと繊細さに深く感動する傾向がある' } },
  { id: 'q11', text: { ko: '남들이 눈치채지 못하는 작은 변화나 세부 사항을 잘 알아챈다', en: 'I notice small changes and details others miss', ja: '他の人が気づかない小さな変化や細部をよく気づく' } },
  { id: 'q12', text: { ko: '카페인이나 알코올에 민감하게 반응하는 편이다', en: 'I tend to react sensitively to caffeine or alcohol', ja: 'カフェインやアルコールに敏感に反応する傾向がある' } },
  { id: 'q13', text: { ko: '강한 냄새나 질감이 불편하게 느껴질 때가 많다', en: 'Strong smells or textures often feel uncomfortable to me', ja: '強い匂いや質感が不快に感じることが多い' } },
  { id: 'q14', text: { ko: '오랫동안 관찰한 후에야 낯선 상황에 참여한다', en: 'I observe for a long time before joining unfamiliar situations', ja: '長い間観察してから初めて慣れない状況に参加する' } },
  { id: 'q15', text: { ko: '배고프거나 피곤할 때 집중이나 기분에 큰 영향을 준다', en: 'Hunger or tiredness greatly affects my concentration and mood', ja: '空腹や疲れが集中力や気分に大きな影響を与える' } },
]

interface Props { locale?: string }

export default function SensoryProcessingTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: SensLevel; score: number } | null>(null)

  function pick(val: number) {
    // val is 0-4 (index), score is 1-5
    const score = val + 1
    const newAns = [...answers, score]
    if (current + 1 >= QUESTIONS.length) {
      const total = newAns.reduce((s, v) => s + v, 0)
      const level: SensLevel = total >= 50 ? 'high' : total >= 30 ? 'moderate' : 'low'
      setResult({ level, score: total })
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() {
    setAnswers([])
    setCurrent(0)
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const levelLabel = lb.levelLabels[result.level]
    const text = `${lb.shareMsg} — ${levelLabel} (${result.score}${lb.outOf})`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= QUESTIONS.length

  if (finished && result) {
    const levelColor = result.level === 'high' ? '#6366f1' : result.level === 'moderate' ? '#22c55e' : '#f97316'
    const pct = Math.round((result.score / 75) * 100)

    return (
      <div className="space-y-6" aria-live="polite">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
          <div
            className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
            style={{ backgroundColor: levelColor }}
          >
            {lb.levelLabels[result.level]}
          </div>
          <p className="font-medium text-muted-foreground">{lb.levelSubtitles[result.level]}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{lb.levelDescriptions[result.level]}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{lb.scoreLabel}</span>
            <span className="text-lg font-bold" style={{ color: levelColor }}>{result.score} {lb.outOf}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: levelColor }}
              role="progressbar"
              aria-valuenow={result.score}
              aria-valuemin={15}
              aria-valuemax={75}
              aria-label={lb.scoreLabel}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
          <ul className="space-y-1">
            {lb.levelStrengths[result.level].map(s => (
              <li key={s} className="text-sm text-muted-foreground flex gap-2">
                <span style={{ color: levelColor }}>→</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm" style={{ color: levelColor }}>{lb.selfCare}</h3>
          <ul className="space-y-1">
            {lb.levelSelfCare[result.level].map(tip => (
              <li key={tip} className="text-sm text-muted-foreground flex gap-2">
                <span>•</span>{tip}
              </li>
            ))}
          </ul>
        </div>

        {result.level === 'high' && (
          <div
            className="rounded-xl p-4 space-y-1"
            style={{ border: `1px solid ${levelColor}40`, background: `${levelColor}08` }}
          >
            <h3 className="font-semibold text-sm" style={{ color: levelColor }}>{lb.hspInfo}</h3>
            <p className="text-xs text-muted-foreground">
              {locale === 'ko' && 'HSP는 1996년 Elaine Aron 박사가 연구한 개념으로, 신경계가 환경 자극에 더 깊이 반응하는 선천적 특성입니다. 약 20%의 인구가 해당하며, 높은 공감력, 창의성, 직관력과 연결됩니다.'}
              {locale === 'en' && 'HSP is a concept researched by Dr. Elaine Aron in 1996. It\'s an innate trait where the nervous system processes environmental stimuli more deeply. About 20% of the population has this trait, linked to high empathy, creativity, and intuition.'}
              {locale === 'ja' && 'HSPは1996年にElaine Aron博士が研究した概念で、神経系が環境刺激により深く反応する先天的な特性です。人口の約20%が該当し、高い共感力、創造性、直感力と関連しています。'}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            {lb.restart}
          </button>
          <button
            onClick={share}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {lb.share}
          </button>
        </div>
      </div>
    )
  }

  const q = QUESTIONS[current]
  const progress = Math.round((current / QUESTIONS.length) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{lb.title}</h1>
        <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lb.questionOf(current + 1, QUESTIONS.length)}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-lg font-medium">{q.text[locale]}</p>
      </div>
      <div className="grid gap-2">
        {lb.scaleLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            aria-label={`${label} (${i + 1}점)`}
            className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
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
