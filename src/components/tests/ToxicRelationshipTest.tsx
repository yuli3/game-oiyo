import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type Level = 'healthy' | 'some_flags' | 'notable' | 'high_toxicity'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question { id: string; text: string }
interface LevelData {
  title: string; subtitle: string; description: string
  patterns: string[]; steps: string[]; encouragement: string
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  choiceLabels: [string, string, string, string]
  restart: string; share: string; shareMsg: string; yourLevel: string
  patterns: string; steps: string; encouragement: string
  scoreLabel: string; outOf: string; note: string; disclaimer: string
}> = {
  ko: {
    title: '관계 독성 패턴 테스트',
    subtitle: '내 관계는 건강한가요?',
    questionOf: (c, t) => `${c} / ${t}`,
    choiceLabels: ['전혀 그렇지 않다', '가끔 그렇다', '자주 그렇다', '항상 그렇다'],
    restart: '다시 하기', share: '결과 공유', shareMsg: '내 관계 패턴 테스트 결과는',
    yourLevel: '관계 패턴 결과', patterns: '발견된 패턴', steps: '다음 단계',
    encouragement: '당신에게', scoreLabel: '패턴 점수', outOf: '/ 45점',
    note: '이 테스트는 관계 패턴 인식을 돕기 위한 것입니다. 결과는 단순한 참고 자료입니다.',
    disclaimer: '어떤 결과가 나오든, 더 건강한 관계를 원하는 마음 자체가 중요합니다. 전문 상담은 언제나 좋은 선택입니다.',
  },
  en: {
    title: 'Relationship Pattern Test',
    subtitle: 'Is My Relationship Healthy?',
    questionOf: (c, t) => `${c} / ${t}`,
    choiceLabels: ['Not at all', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake', share: 'Share Result', shareMsg: 'My relationship pattern result is',
    yourLevel: 'Relationship Pattern Result', patterns: 'Patterns Found', steps: 'Next Steps',
    encouragement: 'For You', scoreLabel: 'Pattern Score', outOf: '/ 45',
    note: 'This test is designed to help you recognize relationship patterns. Results are for reference only.',
    disclaimer: 'Whatever your result, the desire for a healthier relationship is what matters most. Professional counseling is always a good choice.',
  },
  ja: {
    title: '関係の毒性パターンテスト',
    subtitle: '私の関係は健全ですか？',
    questionOf: (c, t) => `${c} / ${t}`,
    choiceLabels: ['全くそうでない', 'たまにそうだ', 'よくそうだ', 'いつもそうだ'],
    restart: 'もう一度', share: '結果を共有', shareMsg: '私の関係パターンの結果は',
    yourLevel: '関係パターンの結果', patterns: '発見されたパターン', steps: '次のステップ',
    encouragement: 'あなたへ', scoreLabel: 'パターンスコア', outOf: '/ 45点',
    note: 'このテストは関係パターンの認識を助けるためのものです。結果は参考程度としてください。',
    disclaimer: 'どんな結果であっても、より健全な関係を求める気持ち自体が大切です。専門カウンセリングはいつでも良い選択です。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1',  text: '상대방이 내 감정이나 의견을 무시하거나 묵살한다' },
    { id: 'q2',  text: '관계 안에서 내가 잘못했다는 느낌을 자주 받는다' },
    { id: 'q3',  text: '상대방이 나를 비판하거나 비하하는 말을 자주 한다' },
    { id: 'q4',  text: '내 친구나 가족과의 관계가 이 사람으로 인해 멀어졌다' },
    { id: 'q5',  text: '상대방의 기분이나 반응이 두렵거나 예측하기 어렵다' },
    { id: 'q6',  text: '내 결정이나 생활에 대해 과도한 통제를 받는다고 느낀다' },
    { id: 'q7',  text: '관계에서 내 필요나 바람은 항상 뒷전이 된다' },
    { id: 'q8',  text: '상대방과 갈등이 생기면 내가 먼저 사과하게 된다' },
    { id: 'q9',  text: '이 관계를 떠나고 싶지만 두렵거나 죄책감이 든다' },
    { id: 'q10', text: '상대방이 나의 성공이나 행복을 진심으로 기뻐하지 않는다' },
    { id: 'q11', text: '관계 안에서 나 자신을 표현하기 어렵다' },
    { id: 'q12', text: '이 관계가 나를 지치게 만든다' },
    { id: 'q13', text: '상대방의 행동이나 말로 인해 자존감이 낮아진다' },
    { id: 'q14', text: '상대방이 나를 가스라이팅한다는 느낌이 든다' },
    { id: 'q15', text: '이 관계에서 행복보다 걱정이나 불안을 더 자주 느낀다' },
  ],
  en: [
    { id: 'q1',  text: 'The other person dismisses or ignores my feelings or opinions' },
    { id: 'q2',  text: 'I often feel like I am in the wrong in this relationship' },
    { id: 'q3',  text: 'The other person frequently criticizes or belittles me' },
    { id: 'q4',  text: 'My relationships with friends or family have grown distant because of this person' },
    { id: 'q5',  text: 'I find the other person\'s mood or reactions frightening or unpredictable' },
    { id: 'q6',  text: 'I feel excessively controlled in my decisions or daily life' },
    { id: 'q7',  text: 'My needs and wishes are always put last in this relationship' },
    { id: 'q8',  text: 'When conflict arises, I end up being the one who apologizes first' },
    { id: 'q9',  text: 'I want to leave this relationship but feel afraid or guilty' },
    { id: 'q10', text: 'The other person does not genuinely celebrate my successes or happiness' },
    { id: 'q11', text: 'I find it difficult to express myself within this relationship' },
    { id: 'q12', text: 'This relationship leaves me feeling drained' },
    { id: 'q13', text: 'My self-esteem has lowered because of things this person says or does' },
    { id: 'q14', text: 'I sometimes feel like I am being gaslighted by this person' },
    { id: 'q15', text: 'In this relationship, I feel worry or anxiety more often than happiness' },
  ],
  ja: [
    { id: 'q1',  text: '相手が私の感情や意見を無視したり軽視したりする' },
    { id: 'q2',  text: 'この関係の中で、よく自分が悪いと感じる' },
    { id: 'q3',  text: '相手が頻繁に私を批判したり貶めたりする' },
    { id: 'q4',  text: 'この人のせいで友人や家族との関係が遠くなった' },
    { id: 'q5',  text: '相手の気分や反応が恐ろしく、予測しにくい' },
    { id: 'q6',  text: '私の決断や生活について過度にコントロールされている' },
    { id: 'q7',  text: 'この関係では私のニーズや望みはいつも後回しにされる' },
    { id: 'q8',  text: '対立が起きると、いつも私が先に謝ることになる' },
    { id: 'q9',  text: 'この関係を離れたいが、怖さや罪悪感がある' },
    { id: 'q10', text: '相手が私の成功や幸福を心から喜んでくれない' },
    { id: 'q11', text: 'この関係の中で自分を表現しにくい' },
    { id: 'q12', text: 'この関係が私を疲弊させる' },
    { id: 'q13', text: '相手の言動によって自己肯定感が下がった' },
    { id: 'q14', text: '相手にガスライティングされていると感じることがある' },
    { id: 'q15', text: 'この関係では幸せより心配や不安をより多く感じる' },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, LevelData>> = {
  healthy: {
    ko: {
      title: '건강한 관계', subtitle: '이 관계는 전반적으로 건강해 보입니다',
      description: '현재 관계에서 큰 독성 패턴이 발견되지 않았습니다. 서로를 존중하고 각자의 필요를 배려하는 균형 잡힌 관계 패턴을 보이고 있습니다.',
      patterns: ['상호 존중의 흔적', '건강한 경계 유지', '서로의 독립성 인정', '갈등을 건설적으로 해결'],
      steps: ['지금의 건강한 패턴을 의식적으로 유지하기', '소통과 경청을 꾸준히 연습하기', '서로의 성장을 지지하기'],
      encouragement: '당신은 건강한 관계를 만들어가고 있습니다. 관계도 꾸준한 돌봄이 필요합니다. 지금의 노력을 이어가세요.',
    },
    en: {
      title: 'Healthy Relationship', subtitle: 'This relationship appears generally healthy',
      description: 'No major toxic patterns were detected in your current relationship. You show a balanced pattern of mutual respect and consideration for each other\'s needs.',
      patterns: ['Signs of mutual respect', 'Healthy boundaries maintained', 'Each person\'s independence is acknowledged', 'Conflict handled constructively'],
      steps: ['Consciously maintain your healthy patterns', 'Keep practicing communication and listening', 'Support each other\'s growth'],
      encouragement: 'You are building a healthy relationship. Relationships still need ongoing care. Keep up the effort you are putting in.',
    },
    ja: {
      title: '健全な関係', subtitle: 'この関係は全体的に健全に見えます',
      description: '現在の関係に大きな毒性パターンは見つかりませんでした。お互いを尊重し、それぞれのニーズを配慮したバランスの取れた関係パターンを示しています。',
      patterns: ['相互尊重の跡', '健全な境界の維持', 'お互いの独立性を認める', '葛藤を建設的に解決'],
      steps: ['今の健全なパターンを意識的に維持する', 'コミュニケーションと傾聴を継続的に練習する', 'お互いの成長を支持する'],
      encouragement: 'あなたは健全な関係を築いています。関係にも継続的なケアが必要です。今の努力を続けてください。',
    },
  },
  some_flags: {
    ko: {
      title: '주의 신호 있음', subtitle: '일부 패턴에 주의가 필요합니다',
      description: '몇 가지 주의할 만한 패턴들이 발견되었습니다. 이 패턴들이 관계에 영향을 주고 있을 수 있습니다. 이 시점에서 대화나 경계 설정이 도움이 될 수 있습니다.',
      patterns: ['가끔 소통에 어려움', '경계가 흐릿한 경우가 있음', '일부 불균형한 역동', '감정 소진 경험'],
      steps: ['파트너와 솔직한 대화 시도', '자신의 필요와 경계 명확히 하기', '관계 상담을 고려해보기', '친한 사람과 이야기 나누기'],
      encouragement: '신호를 알아차리는 것이 첫 번째 용기입니다. 당신은 더 나은 관계를 받을 자격이 있습니다.',
    },
    en: {
      title: 'Some Red Flags', subtitle: 'Some patterns need attention',
      description: 'A few concerning patterns have been identified. These may be affecting your relationship. At this point, honest conversation or boundary-setting could be helpful.',
      patterns: ['Occasional communication difficulties', 'Boundaries can be blurry at times', 'Some imbalanced dynamics', 'Experiences of emotional depletion'],
      steps: ['Try having an honest conversation with your partner', 'Clarify your own needs and limits', 'Consider relationship counseling', 'Talk to someone you trust'],
      encouragement: 'Noticing the signals is the first act of courage. You deserve a better relationship.',
    },
    ja: {
      title: '注意サインあり', subtitle: '一部のパターンに注意が必要です',
      description: 'いくつかの気になるパターンが見つかりました。これらが関係に影響している可能性があります。この時点で、率直な対話や境界設定が助けになるかもしれません。',
      patterns: ['時々コミュニケーションの困難', '境界が曖昧になることがある', '一部アンバランスなダイナミクス', '感情消耗の経験'],
      steps: ['パートナーと率直な対話を試みる', '自分のニーズと限界を明確にする', '関係カウンセリングを検討する', '信頼できる人に話す'],
      encouragement: 'サインに気づくことが最初の勇気です。あなたはより良い関係を受け取る資格があります。',
    },
  },
  notable: {
    ko: {
      title: '패턴 주의', subtitle: '여러 독성 패턴이 관찰됩니다',
      description: '상당수의 독성 패턴이 발견되었습니다. 이 관계가 당신의 정서적 안녕에 영향을 미치고 있을 가능성이 높습니다. 이 패턴들은 변화 가능하지만, 적극적인 노력이 필요합니다.',
      patterns: ['반복적인 경계 침해', '감정적 소진이 지속됨', '자존감 저하 경험', '관계 내 불균형한 힘의 역동'],
      steps: ['전문 상담사와 상담 고려하기', '신뢰할 수 있는 지지 네트워크 찾기', '자신의 필요를 최우선으로 두기', '관계의 지속 여부를 차분히 평가하기'],
      encouragement: '이 결과는 당신이 나쁜 사람임을 의미하지 않습니다. 도움을 요청하는 것은 강함의 표시입니다.',
    },
    en: {
      title: 'Notable Patterns', subtitle: 'Several toxic patterns are observed',
      description: 'A significant number of toxic patterns have been found. This relationship is likely affecting your emotional wellbeing. These patterns can change, but active effort is needed.',
      patterns: ['Repeated boundary violations', 'Ongoing emotional exhaustion', 'Experiences of lowered self-esteem', 'Imbalanced power dynamics in the relationship'],
      steps: ['Consider speaking with a professional counselor', 'Seek a trustworthy support network', 'Put your own needs first', 'Calmly assess whether to continue this relationship'],
      encouragement: 'This result does not mean you are a bad person. Asking for help is a sign of strength.',
    },
    ja: {
      title: 'パターン注意', subtitle: '複数の毒性パターンが観察されます',
      description: 'かなりの数の毒性パターンが見つかりました。この関係があなたの感情的な幸福に影響している可能性が高いです。これらのパターンは変えられますが、積極的な努力が必要です。',
      patterns: ['繰り返す境界侵害', '感情的消耗が続いている', '自己肯定感低下の経験', '関係内の不均衡な力のダイナミクス'],
      steps: ['専門カウンセラーとの相談を検討する', '信頼できるサポートネットワークを探す', '自分のニーズを最優先にする', '関係を続けるかどうか冷静に評価する'],
      encouragement: 'この結果はあなたが悪い人だということではありません。助けを求めることは強さの表れです。',
    },
  },
  high_toxicity: {
    ko: {
      title: '독성 관계', subtitle: '지금 당신에게 가장 중요한 것은 당신 자신입니다',
      description: '높은 수준의 독성 패턴이 발견되었습니다. 이 관계는 당신의 정서적·심리적 건강에 심각한 영향을 미치고 있을 수 있습니다. 이 결과를 혼자 감당하지 마세요.',
      patterns: ['지속적인 정서적 피해', '심각한 경계 침해', '자기 가치감 손상', '관계 탈출이 어렵다는 느낌'],
      steps: ['안전한 전문가(상담사, 심리사)에게 연락하기', '신뢰할 수 있는 사람에게 현재 상황 알리기', '자신의 안전을 최우선으로 판단하기', '혼자서 해결하려 하지 않기'],
      encouragement: '당신은 이 상황에서 혼자가 아닙니다. 어떤 결과든, 당신은 존중받고 사랑받을 자격이 있습니다. 도움을 구하는 것은 용기 있는 행동입니다.',
    },
    en: {
      title: 'High Toxicity', subtitle: 'Right now, the most important thing is you',
      description: 'A high level of toxic patterns has been found. This relationship may be seriously affecting your emotional and psychological health. Do not carry this result alone.',
      patterns: ['Ongoing emotional harm', 'Serious boundary violations', 'Damaged sense of self-worth', 'A feeling of being unable to leave'],
      steps: ['Reach out to a safe professional (counselor, therapist)', 'Let someone you trust know your current situation', 'Prioritize your own safety above all', 'Do not try to handle this alone'],
      encouragement: 'You are not alone in this. Whatever your result, you deserve to be respected and loved. Seeking help is an act of courage.',
    },
    ja: {
      title: '毒性関係', subtitle: '今あなたにとって最も大切なのはあなた自身です',
      description: '高いレベルの毒性パターンが見つかりました。この関係はあなたの感情的・心理的健康に深刻な影響を与えている可能性があります。この結果を一人で抱えないでください。',
      patterns: ['継続的な感情的被害', '深刻な境界侵害', '自己価値感の損傷', '関係から抜け出せないという感覚'],
      steps: ['安全な専門家（カウンセラー、心理士）に連絡する', '信頼できる人に現在の状況を伝える', '自分の安全を最優先に判断する', '一人で解決しようとしない'],
      encouragement: 'あなたはこの状況で一人ではありません。どんな結果でも、あなたは尊重され愛される資格があります。助けを求めることは勇気ある行動です。',
    },
  },
}

function getLevel(score: number): Level {
  if (score <= 10) return 'healthy'
  if (score <= 22) return 'some_flags'
  if (score <= 35) return 'notable'
  return 'high_toxicity'
}

interface Props { locale?: string }

export default function ToxicRelationshipTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null)

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) {
      const total = newAns.reduce((s, v) => s + v, 0)
      setResult({ level: getLevel(total), score: total })
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null) }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result.level][locale].title}`
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
          {lb.choiceLabels.map((label, i) => (
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

  if (!result) return null
  const r = RESULTS[result.level][locale]
  const pct = Math.round((result.score / 45) * 100)
  const levelColors: Record<Level, string> = {
    healthy: '#22c55e', some_flags: '#f59e0b', notable: '#f97316', high_toxicity: '#ef4444',
  }
  const color = levelColors[result.level]

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
          <span className="text-lg font-bold" style={{ color }}>{result.score} {lb.outOf}</span>
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

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.patterns}</h3>
        <ul className="space-y-1">
          {r.patterns.map(p => (
            <li key={p} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span>•</span>{p}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.steps}</h3>
        <ul className="space-y-1">
          {r.steps.map(s => (
            <li key={s} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span style={{ color: '#22c55e' }}>→</span>{s}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.encouragement}</h3>
        <p className="text-sm" style={{ color: '#15803d' }}>"{r.encouragement}"</p>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
        <p className="text-xs" style={{ color: '#92400e' }}>{lb.disclaimer}</p>
      </div>

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
