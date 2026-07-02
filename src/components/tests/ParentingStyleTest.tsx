import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type ParentDim = 'authoritative' | 'authoritarian' | 'permissive' | 'uninvolved'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question {
  id: string
  text: string
  choices: [string, string, string, string]
  dims: [ParentDim, ParentDim, ParentDim, ParentDim]
}

interface DimResult {
  title: string
  description: string
  strengths: string[]
  risks: string[]
  tip: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  chooseOne: string
  restart: string
  share: string
  shareMsg: string
  yourStyle: string
  dominant: string
  dimensionsLabel: string
  strengthsLabel: string
  risksLabel: string
  tipLabel: string
  disclaimer: string
  dimNames: Record<ParentDim, string>
}> = {
  ko: {
    title: '양육 방식 테스트',
    subtitle: '나는 어떤 부모 유형인가요?',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: '가장 가까운 반응을 선택하세요',
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 양육 방식 테스트 결과',
    yourStyle: '나의 양육 스타일',
    dominant: '주된 양육 방식',
    dimensionsLabel: '양육 방식 점수',
    strengthsLabel: '강점',
    risksLabel: '주의할 점',
    tipLabel: '성장 팁',
    disclaimer: '이 테스트는 Baumrind의 양육 이론을 기반으로 합니다. 부모가 아니어도 자신이 양육받은 방식이나 미래의 양육 방식을 탐색하는 데 유용합니다.',
    dimNames: {
      authoritative: '권위있는 양육',
      authoritarian: '독재적 양육',
      permissive: '허용적 양육',
      uninvolved: '방임적 양육',
    },
  },
  en: {
    title: 'Parenting Style Test',
    subtitle: 'What Type of Parent Are You?',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: 'Choose the response that fits you best',
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My parenting style test result',
    yourStyle: 'Your Parenting Style',
    dominant: 'Dominant Parenting Style',
    dimensionsLabel: 'Parenting Style Scores',
    strengthsLabel: 'Strengths',
    risksLabel: 'Risks',
    tipLabel: 'Growth Tip',
    disclaimer: "This test is based on Baumrind's parenting theory. Even if you're not a parent, it's useful for exploring how you were raised or how you'd raise children.",
    dimNames: {
      authoritative: 'Authoritative',
      authoritarian: 'Authoritarian',
      permissive: 'Permissive',
      uninvolved: 'Uninvolved',
    },
  },
  ja: {
    title: '養育スタイルテスト',
    subtitle: '私はどんな親のタイプ？',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: '最も近い反応を選んでください',
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '養育スタイルテストの結果',
    yourStyle: '私の養育スタイル',
    dominant: '主な養育方式',
    dimensionsLabel: '養育スタイルスコア',
    strengthsLabel: '強み',
    risksLabel: '注意点',
    tipLabel: '成長のヒント',
    disclaimer: 'このテストはBaumrindの養育理論に基づきます。親でなくても、自分の育てられ方や将来の養育スタイルを探るのに役立ちます。',
    dimNames: {
      authoritative: '権威ある養育',
      authoritarian: '権威主義的養育',
      permissive: '許容的養育',
      uninvolved: '放任的養育',
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '아이가 규칙을 어겼을 때, 나는...',
      choices: [
        '이유를 물어보고 함께 결과에 대해 이야기한다',
        '즉시 결과에 대해 벌칙을 준다',
        '이번 한 번은 넘어가고 크게 신경 쓰지 않는다',
        '피곤해서 그냥 모른 척한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q2',
      text: '아이가 숙제를 하기 싫다고 할 때, 나는...',
      choices: [
        '왜 하기 싫은지 듣고 함께 해결책을 찾는다',
        '숙제는 반드시 해야 하며 변명은 없다고 말한다',
        '오늘은 쉬게 해주고 내일 하면 된다고 한다',
        '알아서 하겠지 하고 개입하지 않는다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q3',
      text: '아이가 또래 친구와 싸웠을 때, 나는...',
      choices: [
        '상황을 듣고 어떻게 해결할지 같이 생각한다',
        '먼저 사과하고 다시는 그러면 안 된다고 훈계한다',
        '애들끼리 있을 수 있는 일이라며 감싸준다',
        '아이들 일은 아이들끼리 해결해야 한다며 개입 안 한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q4',
      text: '아이가 원하는 장난감을 사달라고 조를 때, 나는...',
      choices: [
        '예산과 필요성을 설명하고 함께 결정한다',
        '안 된다고 단호하게 말하고 이유를 설명하지 않는다',
        '떼를 쓰면 결국 사준다',
        '귀찮아서 그냥 무시하거나 혼자 결정하게 둔다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q5',
      text: '아이가 학교에서 힘든 하루를 보냈다고 할 때, 나는...',
      choices: [
        '무슨 일이 있었는지 관심 있게 듣고 공감한다',
        '그래도 내일은 더 잘해야 한다고 다독인다',
        '기분이 나아지도록 원하는 것을 해주려 한다',
        '바쁘니까 나중에 얘기하자고 한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q6',
      text: '아이의 방 청소와 관련해서 나는...',
      choices: [
        '청소의 중요성을 설명하고 함께 정리 시간을 정한다',
        '정해진 시간 안에 반드시 치우도록 엄격하게 지킨다',
        '더러워도 아이가 불편하지 않으면 그냥 둔다',
        '내 방도 아니고 관심이 없다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q7',
      text: '아이가 새로운 취미를 갖고 싶다고 할 때, 나는...',
      choices: [
        '함께 취미를 알아보고 시도해볼 기회를 준다',
        '공부에 방해가 된다면 허락하지 않는다',
        '원하는 건 다 해주려 한다',
        '알아서 하고 싶은 걸 하면 된다고 한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q8',
      text: '아이가 집안일을 도와야 할 때, 나는...',
      choices: [
        '나이에 맞는 역할을 설명하고 함께 참여하도록 격려한다',
        '당연히 해야 하는 것이라며 지시한다',
        '무리하게 시키고 싶지 않아서 내가 다 한다',
        '특별히 신경 쓰지 않는다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q9',
      text: '아이가 성적이 나빴을 때, 나는...',
      choices: [
        '왜 어려웠는지 이해하고 개선 방향을 같이 찾는다',
        '더 열심히 안 했기 때문이라며 혼낸다',
        '괜찮아, 다음엔 잘 할 거야 라며 넘어간다',
        '어차피 결과는 아이의 문제라며 무관심하다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q10',
      text: '아이가 화가 나서 소리를 지를 때, 나는...',
      choices: [
        '진정시킨 후 감정을 표현하는 더 나은 방법을 가르친다',
        '즉시 행동을 멈추게 하고 규칙을 상기시킨다',
        '아이가 화가 난 게 이해되니 그냥 둔다',
        '내 일에 집중하며 그냥 지나친다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q11',
      text: '아이의 취침 시간에 대해 나는...',
      choices: [
        '왜 충분한 수면이 중요한지 설명하고 함께 시간을 정한다',
        '정해진 시간을 반드시 지켜야 하며 예외는 없다',
        '아이가 졸릴 때 자면 된다',
        '신경 쓰지 않는다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q12',
      text: '아이가 새 친구를 사귀었다고 할 때, 나는...',
      choices: [
        '친구에 대해 관심 있게 묻고 함께 이야기한다',
        '그 친구가 좋은 영향을 줄지 꼼꼼히 확인한다',
        '아이의 선택을 무조건 지지한다',
        '아이의 교우 관계에 별로 관심이 없다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q13',
      text: '아이가 학교 행사에 참여하고 싶지 않다고 할 때, 나는...',
      choices: [
        '이유를 듣고 참여의 가치를 설명한 뒤 결정을 존중한다',
        '반드시 참여해야 한다고 강요한다',
        '원하지 않으면 안 해도 된다고 한다',
        '아이가 알아서 결정하면 된다고 생각한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q14',
      text: '아이가 부모의 결정에 의문을 제기할 때, 나는...',
      choices: [
        '아이의 관점을 듣고 이유를 차분히 설명한다',
        '어른의 결정에 의문을 갖는 것은 무례하다고 생각한다',
        '아이의 말도 맞다며 결정을 바꾸기도 한다',
        '그냥 알아서 하라고 한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q15',
      text: '아이의 자존감을 높이기 위해 나는...',
      choices: [
        '노력과 성장을 구체적으로 칭찬하고 지지한다',
        '성취를 이뤄야만 칭찬받을 자격이 있다고 생각한다',
        '뭘 하든 최고라고 칭찬해준다',
        '자존감 형성은 아이 스스로 해야 한다고 생각한다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q16',
      text: '아이의 미래 진로에 대해 나는...',
      choices: [
        '아이의 흥미를 탐색하며 함께 가능성을 이야기한다',
        '안정적이고 전망 있는 직업을 권유한다',
        '아이가 하고 싶은 것은 다 지지한다',
        '아직 그런 것까지 신경 쓸 여유가 없다',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When a child breaks a rule, I would...',
      choices: [
        'Ask why and discuss the consequences together',
        'Immediately give a punishment for the behavior',
        "Let it slide this once and not make a big deal",
        'Be too tired and just ignore it',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q2',
      text: "When a child says they don't want to do homework, I would...",
      choices: [
        'Listen to why and find solutions together',
        'Say homework must be done and there are no excuses',
        'Let them rest today and say they can do it tomorrow',
        "Not get involved, figuring they'll handle it",
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q3',
      text: 'When a child has a fight with a friend, I would...',
      choices: [
        'Listen to the situation and think through a solution together',
        'Tell them to apologize first and not to do it again',
        'Defend the child, saying these things happen',
        'Not intervene, saying kids should sort things out themselves',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q4',
      text: 'When a child begs for a toy they want, I would...',
      choices: [
        'Explain the budget and necessity, and decide together',
        'Firmly say no without explaining why',
        'Eventually buy it if they throw a tantrum',
        'Ignore it or let them decide on their own',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q5',
      text: "When a child says they had a hard day at school, I would...",
      choices: [
        'Listen attentively to what happened and show empathy',
        'Tell them they need to do better tomorrow',
        'Try to cheer them up by giving them what they want',
        'Say I\'m busy and we can talk later',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q6',
      text: "Regarding a child's room cleaning, I would...",
      choices: [
        'Explain why it matters and set a cleaning schedule together',
        'Strictly require it to be done by a set time',
        "Leave it messy if the child doesn't mind",
        'Not care — it\'s not my room',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q7',
      text: 'When a child wants a new hobby, I would...',
      choices: [
        'Explore the hobby together and give them a chance to try',
        "Not allow it if it interferes with studying",
        'Give them whatever they want',
        'Tell them to do whatever they like on their own',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q8',
      text: 'When it comes to a child helping with chores, I would...',
      choices: [
        'Explain age-appropriate roles and encourage participation',
        'Tell them it is something they must do',
        'Do everything myself so they are not overloaded',
        'Not pay much attention to it',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q9',
      text: 'When a child gets a bad grade, I would...',
      choices: [
        'Understand where they struggled and find improvement strategies together',
        'Scold them for not working hard enough',
        "Say it's okay and they'll do better next time",
        'Be indifferent, thinking it is the child\'s problem anyway',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q10',
      text: 'When a child screams in anger, I would...',
      choices: [
        'Calm them down and teach a better way to express emotions',
        'Immediately stop the behavior and remind them of the rules',
        "Understand why they're upset and leave them be",
        'Focus on my own things and let it pass',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q11',
      text: "Regarding a child's bedtime, I would...",
      choices: [
        'Explain why sleep is important and set a time together',
        'Enforce the set bedtime with no exceptions',
        "Let them sleep when they're tired",
        'Not pay attention to it',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q12',
      text: 'When a child makes a new friend, I would...',
      choices: [
        'Ask about the friend with interest and chat about it',
        'Carefully check whether the friend is a good influence',
        "Unconditionally support the child's choice",
        "Not be very interested in the child's friendships",
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q13',
      text: "When a child doesn't want to join a school event, I would...",
      choices: [
        'Listen to why, explain the value, then respect their decision',
        'Insist they must participate',
        "Say they don't have to if they don't want to",
        'Think the child can decide for themselves',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q14',
      text: "When a child questions a parental decision, I would...",
      choices: [
        "Listen to the child's perspective and calmly explain my reasoning",
        'Think it is rude for a child to question an adult decision',
        'Agree they have a point and sometimes change the decision',
        'Tell them to just figure it out themselves',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q15',
      text: "To build a child's self-esteem, I would...",
      choices: [
        'Specifically praise their effort and growth, and support them',
        'Believe praise should be earned through achievement',
        'Tell them they are the best no matter what they do',
        'Think building self-esteem is something the child must do alone',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q16',
      text: "Regarding a child's future career, I would...",
      choices: [
        "Explore the child's interests and discuss possibilities together",
        'Recommend a stable and promising career path',
        'Support whatever they want to do',
        "Not have the bandwidth to think about that yet",
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: '子どもがルールを破ったとき、私は...',
      choices: [
        '理由を聞いて一緒に結果について話し合う',
        'すぐに罰を与える',
        '今回は見逃してあまり気にしない',
        '疲れているのでそのまま無視する',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q2',
      text: '子どもが宿題をしたくないと言ったとき、私は...',
      choices: [
        'なぜしたくないか聞いて一緒に解決策を探す',
        '宿題は必ずしなければならないと言う',
        '今日は休んで明日やればいいと言う',
        '自分でやるだろうと思って関与しない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q3',
      text: '子どもが友達とけんかしたとき、私は...',
      choices: [
        '状況を聞いて一緒に解決策を考える',
        'まず謝って二度とそうしてはいけないと諭す',
        '子どもたちの間でよくあることだと庇う',
        '子どもたちで解決すべきと介入しない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q4',
      text: '子どもがおもちゃを買ってほしいとせがむとき、私は...',
      choices: [
        '予算と必要性を説明して一緒に決める',
        'だめだとはっきり言って理由は説明しない',
        'ごねると結局買ってあげる',
        '面倒なので無視するか自分で決めさせる',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q5',
      text: '子どもが学校で辛い一日だったと言ったとき、私は...',
      choices: [
        '何があったか関心を持って聞いて共感する',
        '明日はもっとうまくやるべきだと励ます',
        '気分が良くなるよう欲しいものをあげようとする',
        '忙しいので後で話そうと言う',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q6',
      text: '子どもの部屋の掃除について、私は...',
      choices: [
        '掃除の重要性を説明して一緒に時間を決める',
        '決めた時間内に必ず片付けるよう厳しく守らせる',
        '汚くても子どもが気にしなければそのままにする',
        '私の部屋ではないので興味がない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q7',
      text: '子どもが新しい趣味を持ちたいと言ったとき、私は...',
      choices: [
        '一緒に趣味を調べて試す機会を与える',
        '勉強の妨げになるなら許可しない',
        '欲しいものは何でもやらせる',
        '自分でやりたいことをやればいいと言う',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q8',
      text: '子どもが家事を手伝う場面で、私は...',
      choices: [
        '年齢に合った役割を説明して参加を促す',
        '当然すべきことだと指示する',
        '無理させたくないので自分が全部やる',
        '特に気にしない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q9',
      text: '子どもの成績が悪かったとき、私は...',
      choices: [
        'どこが難しかったか理解して一緒に改善策を探す',
        'もっと頑張らなかったからだと叱る',
        '大丈夫、次はうまくいくよと言って済ます',
        'どうせ子どもの問題だと無関心でいる',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q10',
      text: '子どもが怒って叫んだとき、私は...',
      choices: [
        '落ち着かせてから感情をうまく表現する方法を教える',
        'すぐに行動を止めてルールを思い出させる',
        '怒るのも分かるのでそのままにしておく',
        '自分のことに集中してやり過ごす',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q11',
      text: '子どもの就寝時間について、私は...',
      choices: [
        '十分な睡眠の重要性を説明して一緒に時間を決める',
        '決めた時間を必ず守らせて例外はない',
        '眠くなったら寝ればいいと思う',
        '気にしない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q12',
      text: '子どもが新しい友達を作ったと言ったとき、私は...',
      choices: [
        '友達について興味を持って聞いて話し合う',
        'その友達が良い影響を与えるか確認する',
        '子どもの選択を無条件で支持する',
        '子どもの交友関係にあまり関心がない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q13',
      text: '子どもが学校行事に参加したくないと言ったとき、私は...',
      choices: [
        '理由を聞いて参加の価値を説明し、その後決定を尊重する',
        '必ず参加しなければならないと強制する',
        '嫌なら参加しなくていいと言う',
        '子どもが自分で決めればいいと思う',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q14',
      text: '子どもが親の決定に疑問を呈したとき、私は...',
      choices: [
        '子どもの観点を聞いて落ち着いて理由を説明する',
        '大人の決定に疑問を持つのは失礼だと思う',
        '子どもも一理あると認め、決定を変えることもある',
        '自分でやれと言う',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q15',
      text: '子どもの自尊心を高めるために、私は...',
      choices: [
        '努力と成長を具体的に称賛してサポートする',
        '成果を出したときだけ称賛に値すると思う',
        '何をしても最高だと褒める',
        '自尊心の形成は子ども自身がすべきと思う',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
    {
      id: 'q16',
      text: '子どもの将来のキャリアについて、私は...',
      choices: [
        '子どもの興味を探りながら一緒に可能性を話し合う',
        '安定していて将来性のある職業を勧める',
        'やりたいことは何でも支持する',
        'まだそこまで気にする余裕がない',
      ],
      dims: ['authoritative', 'authoritarian', 'permissive', 'uninvolved'],
    },
  ],
}

const DIM_RESULTS: Record<ParentDim, Record<SupportedLang, DimResult>> = {
  authoritative: {
    ko: {
      title: '권위있는 양육',
      description: '따뜻함과 명확한 경계를 동시에 제공하는 균형 잡힌 양육 스타일입니다. 아이의 의견을 존중하면서도 일관된 규칙을 유지합니다.',
      strengths: ['높은 공감과 의사소통', '아이의 자율성 존중', '명확한 규칙과 기대치'],
      risks: ['일관성을 유지하는 데 에너지가 많이 필요'],
      tip: '완벽한 균형을 추구하기보다, 꾸준한 연결과 신뢰를 쌓는 것이 핵심입니다.',
    },
    en: {
      title: 'Authoritative',
      description: 'A balanced parenting style that offers both warmth and clear limits. You respect the child\'s voice while maintaining consistent rules.',
      strengths: ['High empathy and communication', "Respect for the child's autonomy", 'Clear rules and expectations'],
      risks: ['Requires considerable energy to maintain consistency'],
      tip: 'Rather than seeking perfect balance, building steady connection and trust is the key.',
    },
    ja: {
      title: '権威ある養育',
      description: '温かさと明確な限界を同時に提供するバランスの取れた養育スタイルです。子どもの意見を尊重しながら一貫したルールを維持します。',
      strengths: ['高い共感とコミュニケーション', '子どもの自律性の尊重', '明確なルールと期待'],
      risks: ['一貫性を維持するのに多くのエネルギーが必要'],
      tip: '完璧なバランスを求めるより、継続的なつながりと信頼を築くことが核心です。',
    },
  },
  authoritarian: {
    ko: {
      title: '독재적 양육',
      description: '높은 기대와 엄격한 규칙을 강조하는 스타일입니다. 아이의 복종을 요구하며 따뜻함보다 훈육을 우선시합니다.',
      strengths: ['명확한 구조와 기대치', '일관성', '규율 습관 형성'],
      risks: ['아이의 자율성 부족', '비판에 민감한 성향 발달 가능성', '정서적 친밀감 부족'],
      tip: '규칙의 이유를 설명하고 아이의 감정에 공감하는 시간을 늘려보세요.',
    },
    en: {
      title: 'Authoritarian',
      description: 'A style that emphasizes high expectations and strict rules. It demands obedience and prioritizes discipline over warmth.',
      strengths: ['Clear structure and expectations', 'Consistency', 'Habit formation and discipline'],
      risks: ['Reduced child autonomy', 'Possible sensitivity to criticism', 'Limited emotional closeness'],
      tip: 'Try explaining the reasons behind rules and spending more time empathizing with your child\'s feelings.',
    },
    ja: {
      title: '権威主義的養育',
      description: '高い期待と厳格なルールを強調するスタイルです。服従を求め、温かさより規律を優先します。',
      strengths: ['明確な構造と期待値', '一貫性', '規律習慣の形成'],
      risks: ['子どもの自律性の不足', '批判に敏感な傾向の発達可能性', '情緒的親密感の不足'],
      tip: 'ルールの理由を説明し、子どもの感情に共感する時間を増やしてみましょう。',
    },
  },
  permissive: {
    ko: {
      title: '허용적 양육',
      description: '따뜻하고 반응적이지만 경계와 구조가 부족한 스타일입니다. 아이의 행복을 최우선으로 삼지만 때로는 지나치게 허용합니다.',
      strengths: ['높은 감정적 지지', '창의성 장려', '자유로운 표현 허용'],
      risks: ['일관성 부족', '경계와 책임감 부족', '아이가 규칙을 어려워할 수 있음'],
      tip: '따뜻함은 유지하면서도 몇 가지 일관된 규칙과 기대치를 명확히 해보세요.',
    },
    en: {
      title: 'Permissive',
      description: 'A warm and responsive style, but lacking in boundaries and structure. Child happiness is the top priority, but allowances can sometimes go too far.',
      strengths: ['High emotional support', 'Encourages creativity', 'Allows free expression'],
      risks: ['Lack of consistency', 'Insufficient boundaries and accountability', 'Children may struggle with rules'],
      tip: 'While maintaining warmth, try setting a few consistent rules and clear expectations.',
    },
    ja: {
      title: '許容的養育',
      description: '温かく反応的ですが、境界と構造が不足しているスタイルです。子どもの幸福を最優先にしますが、時に許し過ぎることがあります。',
      strengths: ['高い感情的サポート', '創造性の促進', '自由な表現の許容'],
      risks: ['一貫性の不足', '境界と責任感の不足', 'ルールに子どもが苦労する可能性'],
      tip: '温かさを保ちながらも、いくつかの一貫したルールと明確な期待値を設けてみましょう。',
    },
  },
  uninvolved: {
    ko: {
      title: '방임적 양육',
      description: '아이에게 최소한의 개입과 반응을 보이는 스타일입니다. 많은 자율성을 주지만 정서적 지지와 지도가 부족합니다.',
      strengths: ['아이의 독립성', '간섭 없는 자율'],
      risks: ['낮은 자존감', '정서적 지지 부족', '애착 및 규율 문제', '아이가 방치된다고 느낄 수 있음'],
      tip: '작은 것부터 시작하세요. 하루 15분 아이와 온전히 함께하는 시간이 큰 변화를 만들 수 있습니다.',
    },
    en: {
      title: 'Uninvolved',
      description: 'A style that provides minimal involvement and responsiveness toward the child. It gives a lot of autonomy but lacks emotional support and guidance.',
      strengths: ["Child's independence", 'Freedom without interference'],
      risks: ['Low self-esteem', 'Lack of emotional support', 'Attachment and discipline issues', 'Child may feel neglected'],
      tip: 'Start small. Just 15 minutes of fully present time with a child each day can create significant change.',
    },
    ja: {
      title: '放任的養育',
      description: '子どもへの介入と反応が最小限のスタイルです。多くの自律性を与えますが、感情的サポートと指導が不足しています。',
      strengths: ['子どもの独立性', '干渉のない自律'],
      risks: ['低い自尊心', '感情的サポートの不足', '愛着と規律の問題', '子どもが放置されていると感じる可能性'],
      tip: '小さなことから始めましょう。毎日15分子どもと完全に一緒にいる時間が大きな変化をもたらします。',
    },
  },
}

interface Props { locale?: string }

export default function ParentingStyleTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<ParentDim, number>>({
    authoritative: 0, authoritarian: 0, permissive: 0, uninvolved: 0,
  })
  const [done, setDone] = useState(false)

  function pick(choiceIdx: number) {
    const q = questions[current]
    const dim = q.dims[choiceIdx]
    const newScores = { ...scores, [dim]: scores[dim] + 1 }
    const nextIdx = current + 1
    if (nextIdx >= questions.length) {
      setScores(newScores)
      setDone(true)
    } else {
      setScores(newScores)
      setCurrent(nextIdx)
    }
  }

  function restart() {
    setScores({ authoritative: 0, authoritarian: 0, permissive: 0, uninvolved: 0 })
    setCurrent(0)
    setDone(false)
  }

  function dominantDim(): ParentDim {
    const dims: ParentDim[] = ['authoritative', 'authoritarian', 'permissive', 'uninvolved']
    return dims.reduce((a, b) => scores[a] >= scores[b] ? a : b)
  }

  function share() {
    const url = window.location.href
    const dom = dominantDim()
    const text = `${lb.shareMsg} — ${lb.dimNames[dom]}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const dimColors: Record<ParentDim, string> = {
    authoritative: '#22c55e',
    authoritarian: '#ef4444',
    permissive: '#3b82f6',
    uninvolved: '#9ca3af',
  }

  if (!done) {
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
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <p className="text-center text-sm text-muted-foreground font-medium">{lb.chooseOne}</p>
        <div className="grid gap-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={choice}
              className="w-full rounded-xl border bg-card px-5 py-4 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center text-xs font-bold text-primary flex-none mt-0.5">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{choice}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      </div>
    )
  }

  const dom = dominantDim()
  const domResult = DIM_RESULTS[dom][l]
  const dims: ParentDim[] = ['authoritative', 'authoritarian', 'permissive', 'uninvolved']
  const maxScore = 16

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.dominant}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: dimColors[dom] }}
        >
          {lb.dimNames[dom]}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{domResult.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">{lb.dimensionsLabel}</h3>
        {dims.map(d => {
          const pct = Math.round((scores[d] / maxScore) * 100)
          return (
            <div key={d} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{lb.dimNames[d]}</span>
                <span className="text-muted-foreground">{scores[d]}</span>
              </div>
              <div
                className="h-3 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.dimNames[d]}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: dimColors[d] }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.strengthsLabel}</h3>
        <ul className="space-y-1">
          {domResult.strengths.map(s => (
            <li key={s} className="text-sm text-muted-foreground flex gap-2"><span className="text-green-500">→</span>{s}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <h3 className="font-semibold text-sm text-amber-700">{lb.risksLabel}</h3>
        <ul className="space-y-1">
          {domResult.risks.map(r => (
            <li key={r} className="text-sm text-amber-700 flex gap-2"><span>•</span>{r}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.tipLabel}</h3>
        <p className="text-sm">"{domResult.tip}"</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
