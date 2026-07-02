import { useState } from 'react'

type PersonalityType = 'creator' | 'performer' | 'lurker' | 'connector'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Option {
  label: string
  type: PersonalityType
}

interface Question {
  id: string
  text: string
  options: Option[]
}

interface ResultData {
  icon: string
  title: string
  subtitle: string
  description: string
  strengths: string[]
  tip: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  strengths: string
  tip: string
  note: string
}> = {
  ko: {
    title: 'SNS 성격 유형 테스트',
    subtitle: '나는 어떤 소셜 미디어 유형일까?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 SNS 유형은',
    yourType: '나의 SNS 유형',
    strengths: '강점',
    tip: '팁',
    note: '결과는 재미 목적이며 심리학적 진단이 아닙니다.',
  },
  en: {
    title: 'Social Media Personality Test',
    subtitle: "What's your SNS type?",
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My SNS personality type is',
    yourType: 'Your SNS Type',
    strengths: 'Strengths',
    tip: 'Tip',
    note: 'Results are for entertainment only and not a psychological diagnosis.',
  },
  ja: {
    title: 'SNS性格タイプテスト',
    subtitle: 'あなたのSNSタイプは？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のSNSタイプは',
    yourType: 'あなたのSNSタイプ',
    strengths: '強み',
    tip: 'ヒント',
    note: '結果はエンターテイメント目的であり、心理学的診断ではありません。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: 'SNS에서 주로 하는 행동은?',
      options: [
        { label: '나만의 사진·영상·글 등 오리지널 콘텐츠를 올린다', type: 'creator' },
        { label: '내 일상을 공유하고 반응을 살핀다', type: 'performer' },
        { label: '다른 사람 게시물을 조용히 구경한다', type: 'lurker' },
        { label: '유용한 정보를 골라 공유하거나 리포스트한다', type: 'connector' },
      ],
    },
    {
      id: 'q2',
      text: '팔로워 수에 대한 나의 태도는?',
      options: [
        { label: '숫자보다 콘텐츠 퀄리티가 중요하다', type: 'creator' },
        { label: '팔로워 증가가 동기부여가 된다', type: 'performer' },
        { label: '신경 쓰지 않는다. 팔로잉이 더 많을 수도 있다', type: 'lurker' },
        { label: '소수의 진짜 연결이 더 중요하다', type: 'connector' },
      ],
    },
    {
      id: 'q3',
      text: '친구가 SNS에 올린 내 사진이 마음에 안 들면?',
      options: [
        { label: '편집이나 필터가 내 스타일과 다르면 삭제 요청한다', type: 'creator' },
        { label: '댓글 반응이 좋으면 그냥 둔다', type: 'performer' },
        { label: '별로 신경 쓰지 않는다', type: 'lurker' },
        { label: '그 사람이 나쁜 의도가 아니면 그냥 둔다', type: 'connector' },
      ],
    },
    {
      id: 'q4',
      text: '새로운 SNS 플랫폼이 생기면?',
      options: [
        { label: '나의 창작물에 어울리는지 먼저 분석한다', type: 'creator' },
        { label: '팔로워 이동이 활발하면 합류한다', type: 'performer' },
        { label: '굳이 가입할 필요를 못 느낀다', type: 'lurker' },
        { label: '커뮤니티 형성 가능성을 살펴본다', type: 'connector' },
      ],
    },
    {
      id: 'q5',
      text: '업로드 전 가장 신경 쓰는 것은?',
      options: [
        { label: '구도, 편집, 전체적인 미감', type: 'creator' },
        { label: '좋아요를 많이 받을지 여부', type: 'performer' },
        { label: '거의 업로드를 하지 않는다', type: 'lurker' },
        { label: '이 콘텐츠가 다른 사람에게 도움이 되는가', type: 'connector' },
      ],
    },
    {
      id: 'q6',
      text: 'SNS에서 사회적 이슈를 접하면?',
      options: [
        { label: '나만의 시각으로 콘텐츠화한다', type: 'creator' },
        { label: '공감되면 재공유한다', type: 'performer' },
        { label: '혼자 읽고 생각한 뒤 넘긴다', type: 'lurker' },
        { label: '신뢰할 수 있는 정보인지 확인 후 확산한다', type: 'connector' },
      ],
    },
    {
      id: 'q7',
      text: 'SNS 사용 시간은?',
      options: [
        { label: '창작과 편집에 집중된 시간', type: 'creator' },
        { label: '올릴 때와 반응 확인할 때 집중적으로', type: 'performer' },
        { label: '무의식 중에 자주 스크롤한다', type: 'lurker' },
        { label: '댓글·메시지·커뮤니티 활동에 시간 쓴다', type: 'connector' },
      ],
    },
    {
      id: 'q8',
      text: 'DM이나 댓글을 받으면?',
      options: [
        { label: '창작에 대한 피드백이면 꼼꼼히 읽는다', type: 'creator' },
        { label: '반응이 많을수록 기분이 좋아진다', type: 'performer' },
        { label: '답장하는 게 부담스럽다', type: 'lurker' },
        { label: '관계 형성의 시작이라 생각해 적극 답한다', type: 'connector' },
      ],
    },
    {
      id: 'q9',
      text: '나에게 SNS란?',
      options: [
        { label: '나를 표현하는 캔버스', type: 'creator' },
        { label: '내 삶을 공유하는 무대', type: 'performer' },
        { label: '세상을 엿보는 창문', type: 'lurker' },
        { label: '사람들을 이어주는 다리', type: 'connector' },
      ],
    },
    {
      id: 'q10',
      text: '팔로우를 끊는 기준은?',
      options: [
        { label: '피드 미감이 깨지면', type: 'creator' },
        { label: '내 게시물에 전혀 반응하지 않으면', type: 'performer' },
        { label: '불쾌한 콘텐츠를 올리면', type: 'lurker' },
        { label: '잘못된 정보를 퍼뜨리면', type: 'connector' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'What do you mainly do on social media?',
      options: [
        { label: 'Post original content — photos, videos, writing', type: 'creator' },
        { label: 'Share my daily life and check reactions', type: 'performer' },
        { label: 'Quietly browse other people\'s posts', type: 'lurker' },
        { label: 'Curate and share useful information or repost', type: 'connector' },
      ],
    },
    {
      id: 'q2',
      text: "What's your attitude toward follower counts?",
      options: [
        { label: 'Content quality matters more than numbers', type: 'creator' },
        { label: 'Growing followers motivates me', type: 'performer' },
        { label: "I don't care — I might follow more than follow me", type: 'lurker' },
        { label: 'A few genuine connections matter more', type: 'connector' },
      ],
    },
    {
      id: 'q3',
      text: "A friend posts a photo of you that you don't like. What do you do?",
      options: [
        { label: "Ask them to delete it if the editing doesn't match my style", type: 'creator' },
        { label: 'Leave it if the comments are positive', type: 'performer' },
        { label: "I don't really care", type: 'lurker' },
        { label: 'Leave it if their intentions were good', type: 'connector' },
      ],
    },
    {
      id: 'q4',
      text: 'A new social media platform launches. What do you do?',
      options: [
        { label: 'Analyze whether it suits my creative work first', type: 'creator' },
        { label: 'Join if my followers are migrating there', type: 'performer' },
        { label: "I don't feel the need to join", type: 'lurker' },
        { label: 'Look into its community-building potential', type: 'connector' },
      ],
    },
    {
      id: 'q5',
      text: 'What do you care about most before posting?',
      options: [
        { label: 'Composition, editing, overall aesthetic', type: 'creator' },
        { label: 'Whether it will get a lot of likes', type: 'performer' },
        { label: 'I rarely post anything', type: 'lurker' },
        { label: 'Whether this will be helpful to others', type: 'connector' },
      ],
    },
    {
      id: 'q6',
      text: 'You encounter a social issue on social media. What do you do?',
      options: [
        { label: 'Turn it into content through my own perspective', type: 'creator' },
        { label: 'Reshare it if I relate to it', type: 'performer' },
        { label: 'Read it alone, think about it, then scroll on', type: 'lurker' },
        { label: 'Verify the information before spreading it', type: 'connector' },
      ],
    },
    {
      id: 'q7',
      text: 'How do you spend time on social media?',
      options: [
        { label: 'Focused time on creating and editing', type: 'creator' },
        { label: 'Intensely when posting and checking reactions', type: 'performer' },
        { label: 'Unconsciously scrolling often', type: 'lurker' },
        { label: 'Time on comments, messages, and community activity', type: 'connector' },
      ],
    },
    {
      id: 'q8',
      text: 'You receive a DM or comment. What do you do?',
      options: [
        { label: 'Read carefully if it\'s feedback about my creative work', type: 'creator' },
        { label: 'The more reactions, the better I feel', type: 'performer' },
        { label: 'Replying feels like a burden', type: 'lurker' },
        { label: 'Reply actively — it\'s the start of a connection', type: 'connector' },
      ],
    },
    {
      id: 'q9',
      text: 'Social media to me is...',
      options: [
        { label: 'A canvas for self-expression', type: 'creator' },
        { label: 'A stage to share my life', type: 'performer' },
        { label: 'A window to peek at the world', type: 'lurker' },
        { label: 'A bridge connecting people', type: 'connector' },
      ],
    },
    {
      id: 'q10',
      text: "What's your reason to unfollow someone?",
      options: [
        { label: 'They ruin the aesthetic of my feed', type: 'creator' },
        { label: "They never react to my posts", type: 'performer' },
        { label: 'They post unpleasant content', type: 'lurker' },
        { label: 'They spread misinformation', type: 'connector' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: 'SNSで主にすることは？',
      options: [
        { label: '写真・動画・文章などオリジナルコンテンツを投稿する', type: 'creator' },
        { label: '日常をシェアして反応を確認する', type: 'performer' },
        { label: '他の人の投稿を静かに見る', type: 'lurker' },
        { label: '役立つ情報を選んでシェアやリポストする', type: 'connector' },
      ],
    },
    {
      id: 'q2',
      text: 'フォロワー数についての考えは？',
      options: [
        { label: '数よりコンテンツの質が大切', type: 'creator' },
        { label: 'フォロワーが増えることがモチベーションになる', type: 'performer' },
        { label: '気にしない。フォローの方が多いかも', type: 'lurker' },
        { label: '少数の本物のつながりの方が大切', type: 'connector' },
      ],
    },
    {
      id: 'q3',
      text: '友達がSNSに気に入らない自分の写真を投稿したら？',
      options: [
        { label: '編集やフィルターが自分のスタイルと違えば削除を頼む', type: 'creator' },
        { label: 'コメントの反応が良ければそのままにする', type: 'performer' },
        { label: 'あまり気にしない', type: 'lurker' },
        { label: '悪意がなければそのままにする', type: 'connector' },
      ],
    },
    {
      id: 'q4',
      text: '新しいSNSプラットフォームができたら？',
      options: [
        { label: '自分のクリエイティブに合っているか先に分析する', type: 'creator' },
        { label: 'フォロワーの移行が活発なら参加する', type: 'performer' },
        { label: '特に登録する必要を感じない', type: 'lurker' },
        { label: 'コミュニティ形成の可能性を調べる', type: 'connector' },
      ],
    },
    {
      id: 'q5',
      text: '投稿前に最も気にすることは？',
      options: [
        { label: '構図・編集・全体的な美感', type: 'creator' },
        { label: 'いいねがたくさんもらえるかどうか', type: 'performer' },
        { label: 'ほとんど投稿しない', type: 'lurker' },
        { label: 'このコンテンツが他の人の役に立つか', type: 'connector' },
      ],
    },
    {
      id: 'q6',
      text: 'SNSで社会問題を見かけたら？',
      options: [
        { label: '自分の視点でコンテンツにする', type: 'creator' },
        { label: '共感したら再シェアする', type: 'performer' },
        { label: '一人で読んで考えてからスクロールする', type: 'lurker' },
        { label: '信頼できる情報か確認してから広める', type: 'connector' },
      ],
    },
    {
      id: 'q7',
      text: 'SNSに使う時間は？',
      options: [
        { label: 'クリエイティブ制作と編集に集中した時間', type: 'creator' },
        { label: '投稿時と反応確認時に集中的に使う', type: 'performer' },
        { label: '無意識によくスクロールしている', type: 'lurker' },
        { label: 'コメント・メッセージ・コミュニティ活動に使う', type: 'connector' },
      ],
    },
    {
      id: 'q8',
      text: 'DMやコメントをもらったら？',
      options: [
        { label: 'クリエイティブへのフィードバックなら丁寧に読む', type: 'creator' },
        { label: '反応が多いほど嬉しい', type: 'performer' },
        { label: '返信するのが負担に感じる', type: 'lurker' },
        { label: 'つながりの始まりと思って積極的に返信する', type: 'connector' },
      ],
    },
    {
      id: 'q9',
      text: '自分にとってSNSとは？',
      options: [
        { label: '自己表現のキャンバス', type: 'creator' },
        { label: '自分の生活を共有するステージ', type: 'performer' },
        { label: '世界を覗く窓', type: 'lurker' },
        { label: '人々をつなぐ橋', type: 'connector' },
      ],
    },
    {
      id: 'q10',
      text: 'フォローを外す基準は？',
      options: [
        { label: 'フィードの美感が崩れるとき', type: 'creator' },
        { label: '自分の投稿に全く反応しないとき', type: 'performer' },
        { label: '不快なコンテンツを投稿するとき', type: 'lurker' },
        { label: '誤った情報を広めるとき', type: 'connector' },
      ],
    },
  ],
}

const RESULTS: Record<PersonalityType, Record<SupportedLang, ResultData>> = {
  creator: {
    ko: {
      icon: '🎨',
      title: '창작자',
      subtitle: '디지털 아티스트',
      description: 'SNS를 자기 표현의 캔버스로 활용합니다. 콘텐츠의 퀄리티와 미감을 최우선으로 생각하며, 팔로워 수보다 작품 자체에 집중합니다.',
      strengths: ['독창적 시각', '미적 감각', '창의적 표현'],
      tip: '알고리즘보다 자신만의 스타일을 지키세요.',
    },
    en: {
      icon: '🎨',
      title: 'Creator',
      subtitle: 'Digital Artist',
      description: 'You use social media as a canvas for self-expression. Content quality and aesthetics come first — you focus on the work itself, not follower counts.',
      strengths: ['Original perspective', 'Aesthetic sense', 'Creative expression'],
      tip: 'Stay true to your style over the algorithm.',
    },
    ja: {
      icon: '🎨',
      title: 'クリエイター',
      subtitle: 'デジタルアーティスト',
      description: 'SNSを自己表現のキャンバスとして活用します。コンテンツの質と美感を最優先に考え、フォロワー数より作品そのものに集中します。',
      strengths: ['独創的な視点', '美的センス', 'クリエイティブな表現'],
      tip: 'アルゴリズムより自分のスタイルを守りましょう。',
    },
  },
  performer: {
    ko: {
      icon: '✨',
      title: '퍼포머',
      subtitle: '소셜 스타',
      description: '반응과 연결에서 에너지를 얻습니다. 자신의 일상을 솔직하게 공유하며 팔로워와 활발하게 소통하는 것을 즐깁니다.',
      strengths: ['높은 참여율', '트렌드 감각', '솔직한 공유'],
      tip: '좋아요 수보다 진정성 있는 연결에 집중해보세요.',
    },
    en: {
      icon: '✨',
      title: 'Performer',
      subtitle: 'Social Star',
      description: 'You gain energy from reactions and connections. You enjoy sharing your life honestly and engaging actively with your followers.',
      strengths: ['High engagement rate', 'Trend awareness', 'Authentic sharing'],
      tip: 'Focus on genuine connections over like counts.',
    },
    ja: {
      icon: '✨',
      title: 'パフォーマー',
      subtitle: 'ソーシャルスター',
      description: '反応とつながりからエネルギーを得ます。自分の日常を正直にシェアし、フォロワーと活発に交流することを楽しみます。',
      strengths: ['高いエンゲージメント率', 'トレンド感覚', '素直なシェア'],
      tip: 'いいね数より本物のつながりに集中しましょう。',
    },
  },
  lurker: {
    ko: {
      icon: '👁️',
      title: '관찰자',
      subtitle: '조용한 목격자',
      description: '소음보다 관찰을 선호하는 내성적 사용자입니다. 소비는 적극적으로 하지만 노출은 최소화합니다.',
      strengths: ['비판적 사고', '선택적 소비', '디지털 피로 없음'],
      tip: '가끔 댓글 하나로도 의미 있는 연결이 시작됩니다.',
    },
    en: {
      icon: '👁️',
      title: 'Lurker',
      subtitle: 'The Silent Observer',
      description: 'You prefer observation over noise — an introverted user who consumes actively but minimizes exposure.',
      strengths: ['Critical thinking', 'Selective consumption', 'No digital fatigue'],
      tip: 'Even a single comment can spark a meaningful connection.',
    },
    ja: {
      icon: '👁️',
      title: '観察者',
      subtitle: '静かな目撃者',
      description: 'ノイズより観察を好む内向的なユーザーです。積極的に消費しますが、発信は最小限にします。',
      strengths: ['批判的思考', '選択的消費', 'デジタル疲労なし'],
      tip: 'たった一つのコメントでも意味のあるつながりが始まります。',
    },
  },
  connector: {
    ko: {
      icon: '🔗',
      title: '연결자',
      subtitle: '커뮤니티 허브',
      description: '양질의 정보와 사람을 이어주는 큐레이터입니다. 커뮤니티의 신뢰를 쌓고 의미 있는 네트워크를 구축합니다.',
      strengths: ['신뢰성', '공동체 의식', '정보 필터링 능력'],
      tip: '나만의 콘텐츠 창작도 시도해보세요.',
    },
    en: {
      icon: '🔗',
      title: 'Connector',
      subtitle: 'Community Hub',
      description: "You're a curator who bridges quality information and people. You build trust within communities and create meaningful networks.",
      strengths: ['Trustworthiness', 'Community mindset', 'Information filtering'],
      tip: 'Try creating some original content of your own too.',
    },
    ja: {
      icon: '🔗',
      title: 'コネクター',
      subtitle: 'コミュニティハブ',
      description: '質の高い情報と人々をつなぐキュレーターです。コミュニティの信頼を築き、意味のあるネットワークを作ります。',
      strengths: ['信頼性', 'コミュニティ意識', '情報フィルタリング能力'],
      tip: '自分だけのオリジナルコンテンツ作成にも挑戦してみましょう。',
    },
  },
}

function calcResult(answers: PersonalityType[]): PersonalityType {
  const counts: Record<PersonalityType, number> = { creator: 0, performer: 0, lurker: 0, connector: 0 }
  for (const a of answers) counts[a]++
  return (Object.entries(counts) as [PersonalityType, number][]).reduce(
    (best, [type, count]) => (count > counts[best] ? type : best),
    'creator' as PersonalityType,
  )
}

const TYPE_COLORS: Record<PersonalityType, string> = {
  creator: '#8b5cf6',
  performer: '#f59e0b',
  lurker: '#64748b',
  connector: '#22c55e',
}

interface Props { locale?: string }

export default function SocialMediaPersonalityTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<PersonalityType[]>([])
  const [result, setResult] = useState<PersonalityType | null>(null)

  function pick(type: PersonalityType) {
    const newAnswers = [...answers, type]
    if (current + 1 >= questions.length) setResult(calcResult(newAnswers))
    setAnswers(newAnswers)
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
    const text = `${lb.shareMsg} — ${RESULTS[result][locale].icon} ${RESULTS[result][locale].title}`
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
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">
                {String.fromCharCode(65 + i)}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null

  const r = RESULTS[result][locale]
  const color = TYPE_COLORS[result]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div className="text-5xl">{r.icon}</div>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {r.title}
        </div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.strengths}</h3>
        <div className="flex flex-wrap gap-2">
          {r.strengths.map((s) => (
            <span
              key={s}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.tip}</h3>
        <p className="text-sm text-muted-foreground">{r.tip}</p>
      </div>
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
