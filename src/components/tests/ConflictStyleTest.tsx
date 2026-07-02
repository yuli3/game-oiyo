import { useState } from 'react'
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Style = 'compete' | 'collaborate' | 'compromise' | 'avoid' | 'accommodate'
type Scores = Record<Style, number>
type Locale = 'ko' | 'en' | 'ja'

interface Pair { a: { text: string; style: Style }; b: { text: string; style: Style } }
interface ResultData { title: string; subtitle: string; description: string; strengths: string[]; risks: string[]; tip: string; bestWith: string }

const COLORS: Record<Style, string> = {
  compete: '#ef4444', collaborate: '#22c55e', compromise: '#3b82f6',
  avoid: '#a855f7', accommodate: '#f59e0b',
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; pairOf: (c: number, t: number) => string; chooseOne: string
  restart: string; share: string; shareMsg: string; yourStyle: string
  strengths: string; risks: string; tip: string; bestWith: string; chartTitle: string
  types: Record<Style, string>
}> = {
  ko: {
    title: '갈등 해결 스타일 테스트', subtitle: '갈등 상황에서 나는 어떻게 반응하나요?',
    pairOf: (c, t) => `${c} / ${t}`, chooseOne: '더 자연스러운 반응을 선택해주세요',
    restart: '다시 하기', share: '결과 공유', shareMsg: '내 갈등 스타일은',
    yourStyle: '나의 갈등 해결 스타일', strengths: '강점', risks: '주의점', tip: '성장 조언', bestWith: '잘 맞는 상대',
    chartTitle: '갈등 스타일 분포',
    types: { compete: '경쟁형', collaborate: '협력형', compromise: '타협형', avoid: '회피형', accommodate: '양보형' },
  },
  en: {
    title: 'Conflict Resolution Style Test', subtitle: 'How do you respond in conflicts?',
    pairOf: (c, t) => `${c} / ${t}`, chooseOne: 'Choose the more natural response',
    restart: 'Retake', share: 'Share Result', shareMsg: 'My conflict style is',
    yourStyle: 'Your Conflict Style', strengths: 'Strengths', risks: 'Watch Out', tip: 'Growth Tip', bestWith: 'Best Match',
    chartTitle: 'Conflict Style Profile',
    types: { compete: 'Competing', collaborate: 'Collaborating', compromise: 'Compromising', avoid: 'Avoiding', accommodate: 'Accommodating' },
  },
  ja: {
    title: '葛藤解決スタイルテスト', subtitle: '葛藤の場面でどう反応しますか？',
    pairOf: (c, t) => `${c} / ${t}`, chooseOne: 'より自然な反応を選んでください',
    restart: 'もう一度', share: '結果を共有', shareMsg: '私の葛藤スタイルは',
    yourStyle: '葛藤解決スタイル', strengths: '強み', risks: '注意点', tip: '成長アドバイス', bestWith: '相性の良い相手',
    chartTitle: '葛藤スタイル分布',
    types: { compete: '競争型', collaborate: '協力型', compromise: '妥協型', avoid: '回避型', accommodate: '従順型' },
  },
}

const PAIRS: Record<Locale, Pair[]> = {
  ko: [
    { a: { text: '내 입장을 명확히 주장하고 관철시킨다', style: 'compete' }, b: { text: '갈등을 피하고 나중에 해결하려 한다', style: 'avoid' } },
    { a: { text: '모두가 만족하는 해결책을 찾을 때까지 논의한다', style: 'collaborate' }, b: { text: '상대방의 의견에 맞춰주며 관계를 지킨다', style: 'accommodate' } },
    { a: { text: '각자 양보해서 적당한 선에서 합의한다', style: 'compromise' }, b: { text: '내가 옳다고 생각하면 끝까지 주장한다', style: 'compete' } },
    { a: { text: '시간이 지나면 자연스럽게 해결될 거라 생각한다', style: 'avoid' }, b: { text: '상대와 깊이 대화하며 진짜 해결책을 찾는다', style: 'collaborate' } },
    { a: { text: '상대가 원하는 대로 해주는 게 더 편하다', style: 'accommodate' }, b: { text: '중간 지점을 찾아 서로 조금씩 양보한다', style: 'compromise' } },
    { a: { text: '갈등 상황을 직접 다루기보다 일단 자리를 피한다', style: 'avoid' }, b: { text: '이기는 것보다 최선의 결과를 찾는 게 중요하다', style: 'collaborate' } },
    { a: { text: '내가 지더라도 관계가 더 중요하다', style: 'accommodate' }, b: { text: '승패보다는 서로 반씩 양보하는 게 현실적이다', style: 'compromise' } },
    { a: { text: '논쟁보다 침묵이 낫다', style: 'avoid' }, b: { text: '분명하게 내 의견을 밝혀야 일이 해결된다', style: 'compete' } },
    { a: { text: '공동 이익을 위해 서로의 입장을 충분히 나눈다', style: 'collaborate' }, b: { text: '갈등은 내가 이겨야 상대도 존중한다', style: 'compete' } },
    { a: { text: '상대의 필요를 내 것보다 우선시한다', style: 'accommodate' }, b: { text: '50:50으로 나누는 것이 가장 공평하다', style: 'compromise' } },
  ],
  en: [
    { a: { text: 'I clearly assert my position and push for it', style: 'compete' }, b: { text: 'I avoid conflict and try to resolve it later', style: 'avoid' } },
    { a: { text: 'I discuss until everyone is satisfied', style: 'collaborate' }, b: { text: 'I go along with the other person to preserve the relationship', style: 'accommodate' } },
    { a: { text: 'We each give a little and meet in the middle', style: 'compromise' }, b: { text: 'I hold my ground if I believe I\'m right', style: 'compete' } },
    { a: { text: 'I think time will resolve it naturally', style: 'avoid' }, b: { text: 'I have a deep conversation to find a real solution', style: 'collaborate' } },
    { a: { text: 'It\'s easier to just give them what they want', style: 'accommodate' }, b: { text: 'Finding the middle ground where we both give a little', style: 'compromise' } },
    { a: { text: 'I prefer to step away rather than deal with conflict directly', style: 'avoid' }, b: { text: 'Finding the best outcome matters more than winning', style: 'collaborate' } },
    { a: { text: 'The relationship matters more than winning', style: 'accommodate' }, b: { text: 'Half and half is the most realistic approach', style: 'compromise' } },
    { a: { text: 'Silence is better than argument', style: 'avoid' }, b: { text: 'Making my opinion clear is how things get resolved', style: 'compete' } },
    { a: { text: 'We share our positions fully for the common good', style: 'collaborate' }, b: { text: 'Winning the conflict earns respect', style: 'compete' } },
    { a: { text: 'I prioritize the other person\'s needs over my own', style: 'accommodate' }, b: { text: '50/50 is the fairest way', style: 'compromise' } },
  ],
  ja: [
    { a: { text: '自分の立場を明確に主張して貫く', style: 'compete' }, b: { text: '葛藤を避けて後で解決しようとする', style: 'avoid' } },
    { a: { text: '全員が満足する解決策が見つかるまで話し合う', style: 'collaborate' }, b: { text: '相手の意見に合わせて関係を守る', style: 'accommodate' } },
    { a: { text: 'お互い少し譲って適当な線で合意する', style: 'compromise' }, b: { text: '自分が正しいと思えば最後まで主張する', style: 'compete' } },
    { a: { text: '時間が経てば自然に解決すると思う', style: 'avoid' }, b: { text: '深く対話して本当の解決策を見つける', style: 'collaborate' } },
    { a: { text: '相手の望む通りにする方が楽だ', style: 'accommodate' }, b: { text: '中間点を見つけてお互い少し譲る', style: 'compromise' } },
    { a: { text: '葛藤を直接扱うより一旦席を外す', style: 'avoid' }, b: { text: '勝つより最善の結果を見つけることが大切', style: 'collaborate' } },
    { a: { text: '負けても関係の方が大切', style: 'accommodate' }, b: { text: '勝ち負けより半々が現実的', style: 'compromise' } },
    { a: { text: '議論より沈黙の方がいい', style: 'avoid' }, b: { text: '明確に意見を言わないと解決しない', style: 'compete' } },
    { a: { text: '共同利益のためにお互いの立場を十分に共有する', style: 'collaborate' }, b: { text: '葛藤に勝てば相手も尊重してくれる', style: 'compete' } },
    { a: { text: '相手のニーズを自分より優先する', style: 'accommodate' }, b: { text: '50:50が最も公平', style: 'compromise' } },
  ],
}

const RESULTS: Record<Style, Record<Locale, ResultData>> = {
  compete: {
    ko: { title: '경쟁형', subtitle: '명확하고 단호하게 자신의 입장을 지킵니다', description: '갈등에서 자신의 목표와 입장을 관철시키는 것을 중시합니다. 빠른 결정이 필요하거나 명확한 원칙이 있는 상황에서 효과적입니다.', strengths: ['빠른 결정력', '명확한 주장', '위기 상황에서 리더십'], risks: ['관계 손상 위험', '상대방 감정 무시', '갈등 확대 가능성'], tip: '이기는 것만큼 상대를 이해하는 것도 중요합니다. 가끔 지는 것이 더 큰 승리일 수 있습니다.', bestWith: '협력형 — 서로의 관점에서 배울 수 있습니다' },
    en: { title: 'Competing', subtitle: 'You stand your ground clearly and decisively', description: 'You prioritize advancing your goals and position in conflicts. Effective in situations requiring quick decisions or where clear principles are at stake.', strengths: ['Quick decision-making', 'Clear assertion', 'Leadership in crises'], risks: ['Risk of relationship damage', 'Ignoring others\' emotions', 'Escalating conflict'], tip: 'Understanding the other person matters as much as winning. Sometimes losing is the bigger victory.', bestWith: 'Collaborating — you can learn from each other\'s perspectives' },
    ja: { title: '競争型', subtitle: '明確かつ断固として自分の立場を守ります', description: '葛藤において自分の目標と立場を貫くことを重視します。素早い決断が必要な時や明確な原則がある状況で効果的です。', strengths: ['素早い決断力', '明確な主張', '危機時のリーダーシップ'], risks: ['関係損傷リスク', '相手の感情を無視', '葛藤の拡大可能性'], tip: '勝つことと同じくらい、相手を理解することが大切です。時に負けることが大きな勝利になることもあります。', bestWith: '協力型 — お互いの視点から学べます' },
  },
  collaborate: {
    ko: { title: '협력형', subtitle: '모두에게 최선인 해결책을 찾아냅니다', description: '갈등을 통해 모두의 필요를 충족시키는 창의적 해결책을 찾습니다. 장기적 관계와 상호 이익을 중시합니다.', strengths: ['높은 신뢰 구축', '창의적 해결', '모두가 만족하는 결과'], risks: ['시간과 에너지 소모', '즉각 결정 어려움', '상대가 협력 의지 없을 때 좌절'], tip: '모든 갈등이 협력으로 해결되지는 않습니다. 상황에 따라 빠른 결정도 필요합니다.', bestWith: '누구와도 잘 맞지만 특히 경쟁형과 좋은 균형을 이룹니다' },
    en: { title: 'Collaborating', subtitle: 'You find the best solution for everyone', description: 'You seek creative solutions that meet everyone\'s needs through conflict. You value long-term relationships and mutual benefit.', strengths: ['High trust-building', 'Creative resolution', 'Outcomes everyone accepts'], risks: ['Time and energy consuming', 'Difficult for quick decisions', 'Frustrating when others won\'t collaborate'], tip: 'Not every conflict can be resolved through collaboration. Sometimes a quick decision is needed.', bestWith: 'Works with anyone, but especially balances well with Competing types' },
    ja: { title: '協力型', subtitle: '全員にとって最善の解決策を見つけます', description: '葛藤を通じて全員のニーズを満たす創造的な解決策を探します。長期的な関係と相互利益を重視します。', strengths: ['高い信頼構築', '創造的な解決', '全員が満足する結果'], risks: ['時間とエネルギーの消耗', '即座の決断が難しい', '相手が協力する気がない時に挫折'], tip: 'すべての葛藤が協力で解決されるわけではありません。状況によって素早い決断も必要です。', bestWith: '誰とでも合いますが、特に競争型と良いバランスを取れます' },
  },
  compromise: {
    ko: { title: '타협형', subtitle: '서로 조금씩 양보하여 실용적으로 해결합니다', description: '각자가 일정 부분을 양보하여 적당한 합의점을 찾습니다. 시간 압박이 있거나 두 입장이 대등할 때 효과적입니다.', strengths: ['실용적이고 신속한 해결', '공정성 추구', '균형 잡힌 접근'], risks: ['최적 해결책이 아닐 수 있음', '모두 일부 불만족', '협력 기회 놓침'], tip: '타협이 항상 최선은 아닙니다. 때로는 더 깊이 파고들어 모두가 만족하는 해결책을 찾아보세요.', bestWith: '대부분의 스타일과 잘 작동합니다' },
    en: { title: 'Compromising', subtitle: 'You find practical solutions through mutual give-and-take', description: 'You find an acceptable agreement where both parties give a little. Effective under time pressure or when both positions are equally valid.', strengths: ['Practical and quick resolution', 'Fairness-seeking', 'Balanced approach'], risks: ['May not be the optimal solution', 'Everyone partially unsatisfied', 'Missed opportunity to collaborate'], tip: 'Compromise isn\'t always the best path. Sometimes dig deeper to find a solution everyone truly accepts.', bestWith: 'Works well with most styles' },
    ja: { title: '妥協型', subtitle: 'お互い少し譲って実用的に解決します', description: 'それぞれが一定部分を譲歩して適切な合意点を見つけます。時間的プレッシャーがある時や両方の立場が対等な時に効果的です。', strengths: ['実用的で素早い解決', '公平性の追求', 'バランスのとれたアプローチ'], risks: ['最適解でない可能性', '全員が部分的に不満', '協力の機会を逃す'], tip: '妥協が常に最善ではありません。時にはもっと深く掘り下げて全員が満足する解決策を探しましょう。', bestWith: 'ほとんどのスタイルとうまく機能します' },
  },
  avoid: {
    ko: { title: '회피형', subtitle: '갈등 상황에서 한 발 물러서는 편입니다', description: '갈등을 직접 대면하기보다 물러서거나 시간이 해결해주기를 기다립니다. 중요하지 않은 갈등이나 감정이 격할 때는 유용하지만, 중요한 문제를 방치할 위험이 있습니다.', strengths: ['불필요한 갈등 방지', '감정 냉각 시간 확보', '자신을 보호'], risks: ['중요한 문제 해결 지연', '불만 축적', '상대에게 무관심으로 보일 수 있음'], tip: '작은 갈등은 피할 수 있지만, 반복되는 중요한 문제는 직면해야 합니다. 용기 있는 대화가 관계를 지킵니다.', bestWith: '협력형이나 타협형이 먼저 다가오면 더 잘 해결됩니다' },
    en: { title: 'Avoiding', subtitle: 'You tend to step back in conflict situations', description: 'Rather than facing conflict directly, you withdraw or wait for time to resolve it. Useful for minor conflicts or when emotions are high, but risks leaving important issues unaddressed.', strengths: ['Preventing unnecessary conflict', 'Allowing emotions to cool', 'Self-protection'], risks: ['Delaying resolution of important issues', 'Accumulating resentment', 'May appear indifferent to others'], tip: 'Small conflicts can be avoided, but repeated important issues must be faced. A courageous conversation protects relationships.', bestWith: 'Works better when a Collaborating or Compromising person initiates' },
    ja: { title: '回避型', subtitle: '葛藤の場面では一歩引く傾向があります', description: '葛藤を直接対面するより引いたり、時間が解決してくれるのを待ちます。重要でない葛藤や感情が高ぶっている時には有用ですが、重要な問題を放置するリスクがあります。', strengths: ['不必要な葛藤の防止', '感情冷却の時間確保', '自己保護'], risks: ['重要な問題の解決の遅れ', '不満の蓄積', '相手に無関心に見える可能性'], tip: '小さな葛藤は避けられますが、繰り返す重要な問題は向き合う必要があります。勇気ある会話が関係を守ります。', bestWith: '協力型や妥協型が先に近づいてくれるとうまく解決できます' },
  },
  accommodate: {
    ko: { title: '양보형', subtitle: '관계를 위해 자신의 필요를 뒤로 미룹니다', description: '갈등에서 상대방의 필요를 충족시키기 위해 자신의 입장을 양보합니다. 장기적 관계와 조화를 중시하지만, 자신의 필요가 무시될 위험이 있습니다.', strengths: ['강한 관계 유지', '갈등 완화', '팀워크 촉진'], risks: ['자신의 필요 방치', '분노와 억울함 누적', '존중받지 못함'], tip: '양보는 강점이지만, 자신의 필요와 감정을 무시하면 장기적으로 관계가 더 어려워집니다. 자신의 목소리도 소중합니다.', bestWith: '경쟁형이나 협력형과 좋은 균형을 이룹니다' },
    en: { title: 'Accommodating', subtitle: 'You prioritize the relationship over your own needs', description: 'You yield your position to meet the other person\'s needs in conflicts. You value long-term harmony but risk having your own needs neglected.', strengths: ['Maintaining strong relationships', 'Conflict de-escalation', 'Promoting teamwork'], risks: ['Neglecting own needs', 'Accumulating resentment', 'Not being respected'], tip: 'Accommodating is a strength, but ignoring your own needs and feelings makes relationships harder long-term. Your voice matters too.', bestWith: 'Balances well with Competing and Collaborating types' },
    ja: { title: '従順型', subtitle: '関係のために自分のニーズを後回しにします', description: '葛藤において相手のニーズを満たすために自分の立場を譲ります。長期的な調和を重視しますが、自分のニーズが無視されるリスクがあります。', strengths: ['強い関係の維持', '葛藤の緩和', 'チームワークの促進'], risks: ['自分のニーズの放置', '怒りや憤りの蓄積', '尊重されない'], tip: '従順さは強みですが、自分のニーズと感情を無視すると長期的に関係がより難しくなります。あなたの声も大切です。', bestWith: '競争型と協力型と良いバランスを取れます' },
  },
}

interface Props { locale?: string }

export default function ConflictStyleTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const pairs = PAIRS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Style[]>([])
  const [result, setResult] = useState<{ style: Style; scores: Scores } | null>(null)

  function calcResult(ans: Style[]): { style: Style; scores: Scores } {
    const scores: Scores = { compete: 0, collaborate: 0, compromise: 0, avoid: 0, accommodate: 0 }
    for (const a of ans) scores[a]++
    const style = (Object.keys(scores) as Style[]).reduce((a, b) => scores[a] >= scores[b] ? a : b)
    return { style, scores }
  }

  function pick(side: 'a' | 'b') {
    const chosen = side === 'a' ? pairs[current].a.style : pairs[current].b.style
    const newAns = [...answers, chosen]
    if (current + 1 >= pairs.length) setResult(calcResult(newAns))
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null) }

  function share() {
    if (!result) return
    const url = window.location.href
    if (navigator.share) navigator.share({ title: lb.title, text: `${lb.shareMsg} ${lb.types[result.style]}`, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= pairs.length

  if (!finished) {
    const pair = pairs[current]
    const progress = Math.round((current / pairs.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.pairOf(current + 1, pairs.length)}</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground font-medium">{lb.chooseOne}</p>
        <div className="grid gap-3">
          {(['a', 'b'] as const).map(side => (
            <button key={side} onClick={() => pick(side)}
              className="w-full rounded-xl border bg-card px-5 py-4 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors">
              {pair[side].text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.style][locale]
  const color = COLORS[result.style]
  const chartData = (Object.keys(result.scores) as Style[]).map(k => ({
    name: lb.types[k], value: result.scores[k], fill: COLORS[k],
  })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourStyle}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: color }}>{r.title}</div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">{lb.chartTitle}</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 20 }}>
            <XAxis type="number" domain={[0, pairs.length]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
          <ul className="space-y-1">{r.strengths.map(s => <li key={s} className="text-xs text-muted-foreground flex gap-1"><span className="text-green-500">+</span>{s}</li>)}</ul>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-amber-600">{lb.risks}</h3>
          <ul className="space-y-1">{r.risks.map(risk => <li key={risk} className="text-xs text-muted-foreground flex gap-1"><span className="text-amber-500">△</span>{risk}</li>)}</ul>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-1">
        <h3 className="font-semibold text-sm">{lb.bestWith}</h3>
        <p className="text-sm text-muted-foreground">{r.bestWith}</p>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.tip}</h3>
        <p className="text-sm">{r.tip}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={restart} className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">{lb.restart}</button>
        <button onClick={share} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">{lb.share}</button>
      </div>
    </div>
  )
}
