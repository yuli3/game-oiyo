import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type FlagLevel = 'normal' | 'some' | 'multiple' | 'strong'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question {
  id: string
  text: string
}

interface ResultData {
  badge: string
  title: string
  subtitle: string
  description: string
  guidance: string[]
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
  scoreLabel: string
  flagLabel: string
  outOf: string
  flagsOf: (n: number) => string
  guidanceLabel: string
  disclaimerLabel: string
  note: string
  disclaimer: string
}> = {
  ko: {
    title: '성인 ADHD 자가 스크리닝',
    subtitle: '나의 집중 패턴 확인하기',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다', '매우 자주 있다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 ADHD 스크리닝 결과',
    yourLevel: '스크리닝 결과',
    scoreLabel: '총 점수',
    flagLabel: '신호 항목',
    outOf: '/ 30점',
    flagsOf: (n) => `${n} / 6항목`,
    guidanceLabel: '다음 단계 안내',
    disclaimerLabel: '중요 안내',
    note: 'WHO ASRS Part A를 기반으로 한 참고용 도구입니다. 전문적 진단을 대체하지 않습니다.',
    disclaimer: '이 테스트는 진단 도구가 아닙니다. 결과는 전문가 상담 전 참고 자료로만 활용하세요.',
  },
  en: {
    title: 'Adult ADHD Self-Screening',
    subtitle: 'Check Your Focus Patterns',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My ADHD Screening Result',
    yourLevel: 'Screening Result',
    scoreLabel: 'Total Score',
    flagLabel: 'Flagged Items',
    outOf: '/ 30',
    flagsOf: (n) => `${n} / 6 items`,
    guidanceLabel: 'Next Steps',
    disclaimerLabel: 'Important Note',
    note: 'A reference tool based on WHO ASRS Part A. Does not replace professional diagnosis.',
    disclaimer: 'This is not a diagnostic tool. Use results only as a reference before professional consultation.',
  },
  ja: {
    title: '成人ADHD自己スクリーニング',
    subtitle: '集中パターンを確認',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある', '非常によくある'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のADHDスクリーニング結果',
    yourLevel: 'スクリーニング結果',
    scoreLabel: '合計スコア',
    flagLabel: 'フラグ項目',
    outOf: '/ 30点',
    flagsOf: (n) => `${n} / 6項目`,
    guidanceLabel: '次のステップ',
    disclaimerLabel: '重要なお知らせ',
    note: 'WHO ASRS Part Aに基づく参考ツールです。専門的診断の代替ではありません。',
    disclaimer: 'このテストは診断ツールではありません。結果は専門家への相談前の参考資料としてのみ使用してください。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '어려운 부분을 끝낸 뒤 프로젝트의 마무리 작업을 완수하는 데 어려움을 겪나요?' },
    { id: 'q2', text: '체계적인 정리가 필요한 일을 할 때 순서대로 정리하는 데 어려움을 느끼나요?' },
    { id: 'q3', text: '약속이나 해야 할 일을 잊어버리는 경우가 얼마나 자주 있나요?' },
    { id: 'q4', text: '많은 생각이 필요한 일을 해야 할 때 시작을 미루거나 피하나요?' },
    { id: 'q5', text: '오랫동안 앉아 있어야 할 때 손이나 발을 꼼지락거리거나 몸을 움직이나요?' },
    { id: 'q6', text: '마치 모터가 달린 것처럼 지나치게 활동적이거나 계속 무언가를 해야 할 것 같은 느낌이 드나요?' },
  ],
  en: [
    { id: 'q1', text: 'Do you have trouble wrapping up the final details of a project once the challenging parts have been done?' },
    { id: 'q2', text: 'Do you have difficulty getting things in order when you have to do a task that requires organization?' },
    { id: 'q3', text: 'How often do you have problems remembering appointments or obligations?' },
    { id: 'q4', text: 'Do you avoid or delay getting started when you have a task that requires a lot of thought?' },
    { id: 'q5', text: 'Do you fidget with or squirm your hands or feet when you have to sit down for a long time?' },
    { id: 'q6', text: 'Do you feel overly active or compelled to do things — as if driven by a motor?' },
  ],
  ja: [
    { id: 'q1', text: '難しい部分が終わった後、プロジェクトの仕上げ作業を完了させるのが難しいですか？' },
    { id: 'q2', text: '整理整頓が必要な作業をするとき、順序立てて整理するのが難しいですか？' },
    { id: 'q3', text: '約束やすべきことを忘れてしまうことはどのくらいありますか？' },
    { id: 'q4', text: '多くの考えが必要な作業をするとき、先延ばしにしたり避けたりしますか？' },
    { id: 'q5', text: '長時間座っていなければならないとき、手や足をもじもじさせたり、体を動かしたりしますか？' },
    { id: 'q6', text: 'エンジンで動いているかのように、過剰に活動的だったり、何かし続けなければならない感覚がありますか？' },
  ],
}

// ASRS Part A thresholds: q1-q4 flag at >=3 (Sometimes = index 2, 1-based score 3)
// q5-q6 flag at >=4 (Often = index 3, 1-based score 4)
// answers are stored as 1-based scores (1–5)
function countFlags(answers: number[]): number {
  let flags = 0
  answers.forEach((score, i) => {
    if (i < 4 && score >= 3) flags++
    if (i >= 4 && score >= 4) flags++
  })
  return flags
}

function calcLevel(flags: number, score: number): FlagLevel {
  if (flags >= 6 || score >= 26) return 'strong'
  if (flags >= 4 || score >= 20) return 'multiple'
  if (flags >= 2 || score >= 13) return 'some'
  return 'normal'
}

const RESULTS: Record<FlagLevel, Record<SupportedLang, ResultData>> = {
  normal: {
    ko: {
      badge: '💚',
      title: '일반적 범위',
      subtitle: '현재 ADHD 관련 특성이 두드러지지 않습니다',
      description: '응답 결과 ADHD 관련 특성이 일반적인 범위 안에 있습니다. 일상에서 집중과 조직화에 큰 어려움이 없는 편입니다.',
      guidance: [
        '현재 생활 패턴을 유지하세요',
        '필요 시 정기적인 자기 점검 습관을 들이면 좋습니다',
        '스트레스가 높을 때 집중력이 낮아지는 것은 자연스러운 현상입니다',
      ],
    },
    en: {
      badge: '💚',
      title: 'Normal Range',
      subtitle: 'No prominent ADHD-related characteristics at this time',
      description: 'Your responses suggest ADHD-related characteristics are within a typical range. You generally don\'t face significant difficulties with focus or organization.',
      guidance: [
        'Maintain your current lifestyle patterns',
        'Regular self-check habits can be helpful',
        'Reduced focus during high-stress periods is a natural response',
      ],
    },
    ja: {
      badge: '💚',
      title: '一般的な範囲',
      subtitle: '現在、ADHDに関連する特性は目立ちません',
      description: '回答結果から、ADHDに関連する特性は一般的な範囲内にあります。日常的に集中や整理整頓に大きな困難はないようです。',
      guidance: [
        '現在の生活パターンを維持してください',
        '定期的な自己チェックの習慣をつけるといいでしょう',
        'ストレスが高いときに集中力が下がるのは自然なことです',
      ],
    },
  },
  some: {
    ko: {
      badge: '💛',
      title: '일부 특성 관찰',
      subtitle: '일부 ADHD 관련 특성이 나타납니다',
      description: 'ADHD와 관련된 일부 특성이 관찰됩니다. 특정 상황에서 집중이나 조직화에 어려움을 느낄 수 있습니다. 이는 스트레스, 수면 부족, 또는 환경적 요인으로도 나타날 수 있습니다.',
      guidance: [
        '집중을 방해하는 환경 요인(소음, 알림 등)을 줄여보세요',
        '할 일을 작은 단위로 나눠서 관리해보세요',
        '수면과 규칙적인 생활 리듬을 점검해보세요',
        '증상이 지속되거나 일상생활에 영향을 주면 전문가 상담을 고려해보세요',
      ],
    },
    en: {
      badge: '💛',
      title: 'Some Characteristics',
      subtitle: 'Some ADHD-related characteristics observed',
      description: 'Some ADHD-related characteristics are present. You may experience difficulties with focus or organization in certain situations. These can also arise from stress, sleep deprivation, or environmental factors.',
      guidance: [
        'Reduce environmental distractions (noise, notifications)',
        'Break tasks into smaller, manageable units',
        'Review your sleep and daily rhythm',
        'If symptoms persist or affect daily life, consider consulting a professional',
      ],
    },
    ja: {
      badge: '💛',
      title: '一部の特性あり',
      subtitle: '一部のADHD関連の特性が見られます',
      description: 'ADHDに関連する一部の特性が見られます。特定の状況で集中や整理整頓に困難を感じることがあるかもしれません。ストレス、睡眠不足、環境要因によっても現れることがあります。',
      guidance: [
        '集中を妨げる環境要因（騒音、通知など）を減らしてみてください',
        'やることを小さな単位に分けて管理してみてください',
        '睡眠と規則的な生活リズムを見直してみてください',
        '症状が続いたり日常生活に影響するなら専門家への相談を検討してください',
      ],
    },
  },
  multiple: {
    ko: {
      badge: '🧡',
      title: '여러 항목 신호',
      subtitle: '여러 ADHD 관련 특성이 확인됩니다',
      description: '여러 ADHD 관련 특성이 관찰됩니다. 집중, 조직화, 충동 조절 등에서 반복적인 어려움을 경험하고 있을 수 있습니다. 전문가와의 상담이 도움이 될 수 있습니다.',
      guidance: [
        '정신건강의학과 또는 심리 전문가와의 상담을 권장합니다',
        '일상생활 관리 도구(플래너, 타이머, 알림)를 적극 활용해보세요',
        '혼자 해결하려 하지 말고 주변의 지지를 받는 것이 중요합니다',
        'ADHD는 치료와 전략으로 충분히 관리할 수 있습니다',
      ],
    },
    en: {
      badge: '🧡',
      title: 'Multiple Signals',
      subtitle: 'Several ADHD-related characteristics detected',
      description: 'Multiple ADHD-related characteristics are observed. You may be experiencing recurring difficulties with focus, organization, or impulse control. Professional consultation could be genuinely helpful.',
      guidance: [
        'A consultation with a psychiatrist or psychologist is recommended',
        'Use daily management tools (planner, timer, reminders) actively',
        'Seek support from those around you rather than handling everything alone',
        'ADHD is very manageable with the right treatment and strategies',
      ],
    },
    ja: {
      badge: '🧡',
      title: '複数のシグナル',
      subtitle: '複数のADHD関連の特性が確認されます',
      description: '複数のADHD関連の特性が見られます。集中、整理整頓、衝動制御などに繰り返し困難を経験している可能性があります。専門家への相談が助けになるでしょう。',
      guidance: [
        '精神科または心理専門家への相談をお勧めします',
        '日常生活管理ツール（プランナー、タイマー、リマインダー）を積極的に活用してください',
        '一人で解決しようとせず、周囲のサポートを受けることが大切です',
        'ADHDは適切な治療と戦略で十分に管理できます',
      ],
    },
  },
  strong: {
    ko: {
      badge: '❤️',
      title: '강한 신호',
      subtitle: 'ADHD 특성이 강하게 나타납니다',
      description: 'ADHD와 관련된 특성이 여러 영역에서 강하게 나타나고 있습니다. 이 결과는 진단이 아니지만, 전문가의 평가를 받아보시길 진심으로 권장합니다. ADHD는 발견하면 효과적으로 도움받을 수 있는 조건입니다.',
      guidance: [
        '정신건강의학과 전문의 방문을 강력히 권장합니다',
        'ADHD 진단과 치료는 삶의 질을 크게 향상시킬 수 있습니다',
        '이 결과를 진단으로 받아들이지 말고, 전문가와 함께 확인하세요',
        '당신은 혼자가 아닙니다. 많은 성인이 ADHD와 함께 충만한 삶을 살고 있습니다',
      ],
    },
    en: {
      badge: '❤️',
      title: 'Strong Signal',
      subtitle: 'ADHD characteristics appear strongly',
      description: 'Strong ADHD-related characteristics appear across multiple areas. This is not a diagnosis, but a professional evaluation is sincerely recommended. ADHD, once identified, is a condition with effective support options.',
      guidance: [
        'A visit to a psychiatrist is strongly recommended',
        'ADHD diagnosis and treatment can significantly improve quality of life',
        'Do not take this result as a diagnosis — confirm with a professional',
        'You are not alone. Many adults live fulfilling lives alongside ADHD',
      ],
    },
    ja: {
      badge: '❤️',
      title: '強いシグナル',
      subtitle: 'ADHDの特性が強く現れています',
      description: 'ADHDに関連する特性が複数の領域で強く現れています。これは診断ではありませんが、専門家による評価を心からお勧めします。ADHDは発見されれば、効果的なサポートが受けられる状態です。',
      guidance: [
        '精神科専門医への受診を強くお勧めします',
         'ADHD診断と治療により生活の質を大幅に向上させることができます',
        'この結果を診断と受け取らず、専門家とともに確認してください',
        'あなたは一人ではありません。多くの成人がADHDとともに充実した生活を送っています',
      ],
    },
  },
}

const LEVEL_COLORS: Record<FlagLevel, string> = {
  normal: '#22c55e',
  some: '#eab308',
  multiple: '#f97316',
  strong: '#ef4444',
}

interface Props { locale?: string }

export default function AdhdScreeningTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: FlagLevel; score: number; flags: number } | null>(null)

  function pick(val: number) {
    // val is 0-based index from scaleLabels, convert to 1-based score
    const score = val + 1
    const newAns = [...answers, score]
    if (current + 1 >= questions.length) {
      const total = newAns.reduce((s, v) => s + v, 0)
      const flags = countFlags(newAns)
      setResult({ level: calcLevel(flags, total), score: total, flags })
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
    const text = `${lb.shareMsg} — ${RESULTS[result.level][l].title}`
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
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
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
              aria-label={`${label} — ${i + 1}점`}
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

  const r = RESULTS[result.level][l]
  const levelColor = LEVEL_COLORS[result.level]
  const scorePct = Math.round((result.score / 30) * 100)
  const flagPct = Math.round((result.flags / 6) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: levelColor }}
        >
          <span>{r.badge}</span>
          <span>{r.title}</span>
        </div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{lb.scoreLabel}</span>
            <span className="text-lg font-bold" style={{ color: levelColor }}>
              {result.score} {lb.outOf}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${scorePct}%`, backgroundColor: levelColor }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{lb.flagLabel}</span>
            <span className="text-lg font-bold" style={{ color: levelColor }}>
              {lb.flagsOf(result.flags)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${flagPct}%`, backgroundColor: levelColor }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-emerald-600">{lb.guidanceLabel}</h3>
        <ul className="space-y-1">
          {r.guidance.map((g) => (
            <li key={g} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500 flex-none">→</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-amber-700">{lb.disclaimerLabel}</h3>
        <p className="text-sm text-amber-700">{lb.disclaimer}</p>
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
