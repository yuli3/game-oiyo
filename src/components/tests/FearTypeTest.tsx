import { useState } from 'react'

type FearType = 'rejection' | 'failure' | 'loss' | 'unknown' | 'judgment'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Option { type: FearType; text: string }
interface Question { id: string; text: string; options: Option[] }
interface ResultData {
  title: string
  subtitle: string
  coreDescription: string
  traits: string[]
  growth: string
  affirmation: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  traits: string
  growth: string
  affirmation: string
  distribution: string
  note: string
}> = {
  ko: {
    title: '두려움 유형 테스트',
    subtitle: '나를 가장 두렵게 하는 것은?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 핵심 두려움 유형은',
    yourType: '나의 두려움 유형',
    traits: '주요 특성',
    growth: '성장 포인트',
    affirmation: '당신에게',
    distribution: '두려움 분포',
    note: '이 결과는 자기 이해를 위한 참고 자료입니다. 두려움은 모두가 가지고 있으며, 이해함으로써 성장할 수 있습니다.',
  },
  en: {
    title: 'Fear Type Test',
    subtitle: 'What Scares You the Most?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My core fear type is',
    yourType: 'Your Fear Type',
    traits: 'Key Traits',
    growth: 'Growth Point',
    affirmation: 'For You',
    distribution: 'Fear Distribution',
    note: 'This result is for self-understanding. Everyone has fears — recognizing them is how we grow.',
  },
  ja: {
    title: '恐怖タイプテスト',
    subtitle: '何が最も怖いですか？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のコア恐怖タイプは',
    yourType: '恐怖タイプ',
    traits: '主な特性',
    growth: '成長ポイント',
    affirmation: 'あなたへ',
    distribution: '恐怖の分布',
    note: 'この結果は自己理解のための参考情報です。恐怖は誰もが持つもの — 理解することで成長できます。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1', text: '새로운 아이디어를 떠올렸을 때 가장 먼저 드는 생각은?',
      options: [
        { type: 'rejection', text: '사람들이 이상하게 볼 것 같다' },
        { type: 'failure', text: '잘못되면 어떡하지?' },
        { type: 'loss', text: '너무 많은 것을 포기해야 할 것 같다' },
        { type: 'unknown', text: '결과를 전혀 예측할 수 없어 불안하다' },
      ],
    },
    {
      id: 'q2', text: '친한 사람과 다퉜을 때 가장 두려운 것은?',
      options: [
        { type: 'rejection', text: '그 사람이 나를 떠날 것 같다' },
        { type: 'failure', text: '내가 잘못했다는 것을 인정해야 하는 것' },
        { type: 'loss', text: '관계 자체를 잃을 것 같다' },
        { type: 'judgment', text: '다른 사람들이 내 편이 아닐 것 같다' },
      ],
    },
    {
      id: 'q3', text: '발표나 시험을 앞두고 가장 걱정되는 것은?',
      options: [
        { type: 'rejection', text: '잘 못하면 무시당할 것 같다' },
        { type: 'failure', text: '실수해서 망칠 것 같다' },
        { type: 'unknown', text: '어떤 결과가 나올지 전혀 모르겠다' },
        { type: 'judgment', text: '사람들에게 부족하게 보일 것 같다' },
      ],
    },
    {
      id: 'q4', text: '직장이나 학교에서 의견을 말하기 어려운 이유는?',
      options: [
        { type: 'rejection', text: '튀어 보여서 소외될 것 같아서' },
        { type: 'failure', text: '틀렸을 때의 창피함이 두려워서' },
        { type: 'unknown', text: '어떤 반응이 올지 예측이 안 돼서' },
        { type: 'judgment', text: '비판받거나 조롱당할 것 같아서' },
      ],
    },
    {
      id: 'q5', text: '관계에서 가장 힘든 상황은?',
      options: [
        { type: 'rejection', text: '상대가 나를 멀리하거나 연락이 뜸해질 때' },
        { type: 'failure', text: '내가 실망시켰다는 걸 알았을 때' },
        { type: 'loss', text: '특별한 관계가 변하거나 끝날 것 같을 때' },
        { type: 'unknown', text: '관계의 방향이 불확실할 때' },
      ],
    },
    {
      id: 'q6', text: '결정을 내리기 어려운 가장 큰 이유는?',
      options: [
        { type: 'rejection', text: '선택 때문에 누군가를 잃을 것 같아서' },
        { type: 'failure', text: '잘못된 선택을 할까 봐' },
        { type: 'loss', text: '무언가를 포기해야 해서' },
        { type: 'judgment', text: '다른 사람들이 내 선택을 비웃을 것 같아서' },
      ],
    },
    {
      id: 'q7', text: 'SNS에 글을 올리기 꺼려지는 이유는?',
      options: [
        { type: 'rejection', text: '관심을 받지 못할 것 같아서' },
        { type: 'failure', text: '완벽하지 않은 것을 올리기 싫어서' },
        { type: 'loss', text: '프라이버시를 잃을 것 같아서' },
        { type: 'judgment', text: '비판적인 댓글이 달릴 것 같아서' },
      ],
    },
    {
      id: 'q8', text: '혼자 있을 때 자주 드는 두려운 생각은?',
      options: [
        { type: 'rejection', text: '결국 아무도 나를 진정으로 원하지 않는다' },
        { type: 'failure', text: '나는 충분히 잘 하고 있지 않다' },
        { type: 'loss', text: '소중한 것들이 사라질 것 같다' },
        { type: 'judgment', text: '사람들이 나의 진짜 모습을 알면 실망할 것이다' },
      ],
    },
    {
      id: 'q9', text: '새로운 환경(새 직장, 이사)이 어려운 이유는?',
      options: [
        { type: 'rejection', text: '아무도 나를 좋아하지 않을 것 같아서' },
        { type: 'failure', text: '적응을 잘 못 할 것 같아서' },
        { type: 'loss', text: '익숙한 것들을 잃는 것이 두려워서' },
        { type: 'unknown', text: '어떤 곳인지 전혀 알 수 없어서' },
      ],
    },
    {
      id: 'q10', text: '나의 비밀이나 약점이 알려질까 봐 두려운 이유는?',
      options: [
        { type: 'rejection', text: '그것 때문에 버림받을 것 같아서' },
        { type: 'failure', text: '나의 실패가 드러나는 것 같아서' },
        { type: 'judgment', text: '나를 다르게 볼 것 같아서' },
        { type: 'unknown', text: '어떤 반응이 올지 전혀 모르겠다' },
      ],
    },
    {
      id: 'q11', text: '성공에 가까워질수록 오히려 불안해지는 이유는?',
      options: [
        { type: 'rejection', text: '성공 후 더 높은 기대를 받을 것이 두렵다' },
        { type: 'failure', text: '성공해도 언젠가 무너질 것 같다' },
        { type: 'loss', text: '성공이 지금의 나를 바꿔버릴 것 같다' },
        { type: 'judgment', text: '질투나 비판을 받을 것 같다' },
      ],
    },
    {
      id: 'q12', text: '가장 감동적인 이야기 유형은?',
      options: [
        { type: 'rejection', text: '혼자였던 사람이 진정한 사랑을 찾는 이야기' },
        { type: 'failure', text: '실패를 딛고 성공을 이루는 이야기' },
        { type: 'loss', text: '잃었던 것을 되찾는 이야기' },
        { type: 'unknown', text: '불확실한 세계에서 답을 찾는 이야기' },
      ],
    },
    {
      id: 'q13', text: '누군가에게 부탁하기 어려운 이유는?',
      options: [
        { type: 'rejection', text: '거절당할 것 같아서' },
        { type: 'failure', text: '부탁 자체가 내 무능함을 드러내는 것 같아서' },
        { type: 'judgment', text: '약해 보일 것 같아서' },
        { type: 'unknown', text: '어떤 반응이 올지 예측이 안 돼서' },
      ],
    },
    {
      id: 'q14', text: '오래된 관계나 습관을 바꾸지 못하는 이유는?',
      options: [
        { type: 'rejection', text: '변화가 관계에서의 거절로 이어질 것 같아서' },
        { type: 'loss', text: '익숙한 것을 잃고 싶지 않아서' },
        { type: 'unknown', text: '변화 후 어떻게 될지 몰라서' },
        { type: 'failure', text: '변화를 시도했다가 실패할 것 같아서' },
      ],
    },
    {
      id: 'q15', text: '꿈을 추구하지 못하는 가장 큰 이유는?',
      options: [
        { type: 'rejection', text: '꿈을 말하면 비웃음 당할 것 같아서' },
        { type: 'failure', text: '실패가 너무 두려워서' },
        { type: 'loss', text: '안정적인 것을 포기해야 해서' },
        { type: 'unknown', text: '어떻게 될지 전혀 예측이 안 돼서' },
      ],
    },
    {
      id: 'q16', text: '감사함을 표현하거나 친밀함을 드러내기 어려운 이유는?',
      options: [
        { type: 'rejection', text: '감정을 보여줬다가 외면당할 것 같아서' },
        { type: 'failure', text: '어색하게 표현해서 망칠 것 같아서' },
        { type: 'judgment', text: '감정적인 사람으로 보일 것 같아서' },
        { type: 'unknown', text: '상대가 어떻게 반응할지 몰라서' },
      ],
    },
  ],
  en: [
    {
      id: 'q1', text: 'When you come up with a new idea, the first thought is...',
      options: [
        { type: 'rejection', text: 'People will think it\'s weird' },
        { type: 'failure', text: 'What if it goes wrong?' },
        { type: 'loss', text: 'I\'d have to give up too much' },
        { type: 'unknown', text: 'I can\'t predict the outcome at all' },
      ],
    },
    {
      id: 'q2', text: 'What scares you most after an argument with someone close?',
      options: [
        { type: 'rejection', text: 'They might leave me' },
        { type: 'failure', text: 'Having to admit I was wrong' },
        { type: 'loss', text: 'Losing the relationship itself' },
        { type: 'judgment', text: 'Others won\'t take my side' },
      ],
    },
    {
      id: 'q3', text: 'Before a presentation or exam, your biggest worry is...',
      options: [
        { type: 'rejection', text: 'Being dismissed if I do poorly' },
        { type: 'failure', text: 'Making a mistake and ruining it' },
        { type: 'unknown', text: 'I have no idea what the outcome will be' },
        { type: 'judgment', text: 'Looking inadequate to others' },
      ],
    },
    {
      id: 'q4', text: 'Why is it hard to voice your opinion at work or school?',
      options: [
        { type: 'rejection', text: 'Standing out might lead to being excluded' },
        { type: 'failure', text: 'The shame of being wrong is too great' },
        { type: 'unknown', text: 'I can\'t predict how people will react' },
        { type: 'judgment', text: 'I might be criticized or mocked' },
      ],
    },
    {
      id: 'q5', text: 'The hardest situation in a relationship is...',
      options: [
        { type: 'rejection', text: 'When someone starts pulling away from me' },
        { type: 'failure', text: 'When I realize I\'ve let someone down' },
        { type: 'loss', text: 'When a special relationship seems to be ending' },
        { type: 'unknown', text: 'When the direction of a relationship is unclear' },
      ],
    },
    {
      id: 'q6', text: 'The main reason it\'s hard to make decisions is...',
      options: [
        { type: 'rejection', text: 'My choice might cost me someone' },
        { type: 'failure', text: 'Fear of choosing wrong' },
        { type: 'loss', text: 'Something has to be given up' },
        { type: 'judgment', text: 'Others might laugh at my decision' },
      ],
    },
    {
      id: 'q7', text: 'Why do you hesitate to post on social media?',
      options: [
        { type: 'rejection', text: 'I might not get any attention' },
        { type: 'failure', text: 'I don\'t want to post anything imperfect' },
        { type: 'loss', text: 'I could lose my privacy' },
        { type: 'judgment', text: 'I might get critical comments' },
      ],
    },
    {
      id: 'q8', text: 'A fear that comes up often when you\'re alone...',
      options: [
        { type: 'rejection', text: 'Nobody truly wants me around' },
        { type: 'failure', text: 'I\'m not doing well enough' },
        { type: 'loss', text: 'The things I love will disappear' },
        { type: 'judgment', text: 'People would be disappointed if they saw the real me' },
      ],
    },
    {
      id: 'q9', text: 'Why is a new environment (new job, moving) difficult?',
      options: [
        { type: 'rejection', text: 'Nobody will like me there' },
        { type: 'failure', text: 'I might fail to adapt' },
        { type: 'loss', text: 'I\'m afraid of losing what\'s familiar' },
        { type: 'unknown', text: 'I have no idea what it\'s like' },
      ],
    },
    {
      id: 'q10', text: 'Why are you afraid of your secrets or weaknesses being exposed?',
      options: [
        { type: 'rejection', text: 'I might be abandoned because of them' },
        { type: 'failure', text: 'It feels like my failures would be on display' },
        { type: 'judgment', text: 'People would see me differently' },
        { type: 'unknown', text: 'I have no idea how people would react' },
      ],
    },
    {
      id: 'q11', text: 'Why does anxiety increase as you get closer to success?',
      options: [
        { type: 'rejection', text: 'Success brings even higher expectations I might not meet' },
        { type: 'failure', text: 'Even if I succeed, I\'ll eventually collapse' },
        { type: 'loss', text: 'Success might change who I am' },
        { type: 'judgment', text: 'I\'ll attract envy or criticism' },
      ],
    },
    {
      id: 'q12', text: 'What kind of story moves you most?',
      options: [
        { type: 'rejection', text: 'A lonely person finding true love' },
        { type: 'failure', text: 'Overcoming failure to achieve success' },
        { type: 'loss', text: 'Reclaiming what was once lost' },
        { type: 'unknown', text: 'Finding answers in an uncertain world' },
      ],
    },
    {
      id: 'q13', text: 'Why is it hard to ask someone for help?',
      options: [
        { type: 'rejection', text: 'They might say no' },
        { type: 'failure', text: 'Asking reveals my incompetence' },
        { type: 'judgment', text: 'I\'ll look weak' },
        { type: 'unknown', text: 'I can\'t predict their reaction' },
      ],
    },
    {
      id: 'q14', text: 'Why can\'t you change a long-standing relationship or habit?',
      options: [
        { type: 'rejection', text: 'Change might lead to being rejected in that relationship' },
        { type: 'loss', text: 'I don\'t want to lose what\'s familiar' },
        { type: 'unknown', text: 'I don\'t know what will happen after change' },
        { type: 'failure', text: 'I might attempt change and fail' },
      ],
    },
    {
      id: 'q15', text: 'The biggest reason you can\'t pursue your dreams...',
      options: [
        { type: 'rejection', text: 'People will laugh at me if I say my dream out loud' },
        { type: 'failure', text: 'I\'m too afraid of failure' },
        { type: 'loss', text: 'I\'d have to give up security' },
        { type: 'unknown', text: 'I have no idea how things will turn out' },
      ],
    },
    {
      id: 'q16', text: 'Why is it hard to express gratitude or closeness?',
      options: [
        { type: 'rejection', text: 'Showing emotion might lead to being ignored' },
        { type: 'failure', text: 'I might express it awkwardly and ruin the moment' },
        { type: 'judgment', text: 'I\'ll seem too emotional' },
        { type: 'unknown', text: 'I don\'t know how the other person will respond' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1', text: '新しいアイデアを思いついたとき、最初に浮かぶ考えは？',
      options: [
        { type: 'rejection', text: '変に思われそう' },
        { type: 'failure', text: 'うまくいかなかったらどうしよう' },
        { type: 'loss', text: '多くのものを犠牲にしなければならない' },
        { type: 'unknown', text: '結果が全く予測できなくて不安' },
      ],
    },
    {
      id: 'q2', text: '親しい人とけんかしたとき、最も怖いことは？',
      options: [
        { type: 'rejection', text: 'その人が去っていきそう' },
        { type: 'failure', text: '自分が間違っていたと認めなければならないこと' },
        { type: 'loss', text: '関係そのものを失いそう' },
        { type: 'judgment', text: '他の人が自分の味方でないと感じる' },
      ],
    },
    {
      id: 'q3', text: '発表や試験を前にして最も心配なことは？',
      options: [
        { type: 'rejection', text: 'うまくできなければ軽視されそう' },
        { type: 'failure', text: 'ミスして台無しにしそう' },
        { type: 'unknown', text: 'どんな結果になるか全くわからない' },
        { type: 'judgment', text: '人に不十分に見られそう' },
      ],
    },
    {
      id: 'q4', text: '職場や学校で意見を言いにくい理由は？',
      options: [
        { type: 'rejection', text: '目立って仲間外れにされそうだから' },
        { type: 'failure', text: '間違えたときの恥ずかしさが怖くて' },
        { type: 'unknown', text: 'どんな反応が来るか予測できなくて' },
        { type: 'judgment', text: '批判されたりバカにされそうだから' },
      ],
    },
    {
      id: 'q5', text: '関係で最も辛い状況は？',
      options: [
        { type: 'rejection', text: '相手が距離を置いたり連絡が減ったとき' },
        { type: 'failure', text: '相手を失望させたと気づいたとき' },
        { type: 'loss', text: '大切な関係が変わったり終わりそうなとき' },
        { type: 'unknown', text: '関係の行方が不確かなとき' },
      ],
    },
    {
      id: 'q6', text: '決断しにくい最大の理由は？',
      options: [
        { type: 'rejection', text: '選択によって誰かを失いそうだから' },
        { type: 'failure', text: '間違った選択をするかもしれないから' },
        { type: 'loss', text: '何かを諦めなければならないから' },
        { type: 'judgment', text: '他の人に選択をバカにされそうだから' },
      ],
    },
    {
      id: 'q7', text: 'SNSに投稿するのをためらう理由は？',
      options: [
        { type: 'rejection', text: '関心を持ってもらえなさそうだから' },
        { type: 'failure', text: '完璧でないものを載せたくないから' },
        { type: 'loss', text: 'プライバシーを失いそうだから' },
        { type: 'judgment', text: '批判的なコメントが来そうだから' },
      ],
    },
    {
      id: 'q8', text: '一人でいるときによく浮かぶ怖い考えは？',
      options: [
        { type: 'rejection', text: '誰も本当に自分を必要としていない' },
        { type: 'failure', text: '十分にうまくやれていない' },
        { type: 'loss', text: '大切なものが消えていきそう' },
        { type: 'judgment', text: '本当の自分を知ったら皆失望する' },
      ],
    },
    {
      id: 'q9', text: '新しい環境（新しい職場、引っ越し）が難しい理由は？',
      options: [
        { type: 'rejection', text: '誰にも好かれなさそうだから' },
        { type: 'failure', text: 'うまく適応できなさそうだから' },
        { type: 'loss', text: '慣れ親しんだものを失うのが怖いから' },
        { type: 'unknown', text: 'どんな場所か全くわからないから' },
      ],
    },
    {
      id: 'q10', text: '秘密や弱点が知られることを恐れる理由は？',
      options: [
        { type: 'rejection', text: 'それで見捨てられそうだから' },
        { type: 'failure', text: '自分の失敗が露わになる感じがするから' },
        { type: 'judgment', text: '自分を違う目で見られそうだから' },
        { type: 'unknown', text: 'どんな反応が来るか全くわからない' },
      ],
    },
    {
      id: 'q11', text: '成功に近づくほどかえって不安になる理由は？',
      options: [
        { type: 'rejection', text: '成功後により高い期待を持たれるのが怖い' },
        { type: 'failure', text: '成功してもいつか崩れそう' },
        { type: 'loss', text: '成功が今の自分を変えてしまいそう' },
        { type: 'judgment', text: '嫉妬や批判を受けそう' },
      ],
    },
    {
      id: 'q12', text: '最も感動する物語のタイプは？',
      options: [
        { type: 'rejection', text: '孤独だった人が本当の愛を見つける話' },
        { type: 'failure', text: '失敗を乗り越えて成功を掴む話' },
        { type: 'loss', text: '失ったものを取り戻す話' },
        { type: 'unknown', text: '不確かな世界の中で答えを探す話' },
      ],
    },
    {
      id: 'q13', text: '誰かにお願いしにくい理由は？',
      options: [
        { type: 'rejection', text: '断られそうだから' },
        { type: 'failure', text: 'お願い自体が自分の無能さを示す気がするから' },
        { type: 'judgment', text: '弱く見えそうだから' },
        { type: 'unknown', text: 'どんな反応が来るか予測できないから' },
      ],
    },
    {
      id: 'q14', text: '長年の関係や習慣を変えられない理由は？',
      options: [
        { type: 'rejection', text: '変化が関係での拒絶につながりそうだから' },
        { type: 'loss', text: '慣れ親しんだものを失いたくないから' },
        { type: 'unknown', text: '変化後どうなるかわからないから' },
        { type: 'failure', text: '変化を試みて失敗しそうだから' },
      ],
    },
    {
      id: 'q15', text: '夢を追いかけられない最大の理由は？',
      options: [
        { type: 'rejection', text: '夢を言ったら笑われそうだから' },
        { type: 'failure', text: '失敗がとても怖いから' },
        { type: 'loss', text: '安定したものを諦めなければならないから' },
        { type: 'unknown', text: 'どうなるか全く予測できないから' },
      ],
    },
    {
      id: 'q16', text: '感謝や親しみを表現しにくい理由は？',
      options: [
        { type: 'rejection', text: '感情を見せたら無視されそうだから' },
        { type: 'failure', text: '不自然に表現して台無しにしそうだから' },
        { type: 'judgment', text: '感情的な人に見えそうだから' },
        { type: 'unknown', text: '相手がどう反応するかわからないから' },
      ],
    },
  ],
}

const RESULTS: Record<FearType, Record<SupportedLang, ResultData>> = {
  rejection: {
    ko: {
      title: '💔 거절 공포형',
      subtitle: '사랑받지 못할까 두려운 당신',
      coreDescription: '핵심 두려움은 버림받음과 소속감의 상실입니다. 관계에서 깊은 연결을 원하지만, 거절에 대한 두려움이 오히려 진정한 연결을 방해하기도 합니다.',
      traits: ['관계에 깊이 투자함', '승인 욕구가 강함', '갈등을 회피하는 경향', '혼자 남겨지는 것에 민감'],
      growth: '자기 자신을 먼저 수용하는 연습이 필요합니다. 나를 사랑해주는 사람은 나의 실수에도 곁에 있습니다. 모든 사람의 승인을 받을 필요는 없습니다.',
      affirmation: '당신은 무언가를 해냈기 때문이 아니라, 존재 자체로 사랑받을 자격이 있습니다.',
    },
    en: {
      title: '💔 Fear of Rejection',
      subtitle: 'Afraid of not being loved',
      coreDescription: 'Your core fear is abandonment and losing a sense of belonging. You crave deep connection in relationships, but fear of rejection can paradoxically prevent authentic bonds.',
      traits: ['Deeply invested in relationships', 'Strong need for approval', 'Tendency to avoid conflict', 'Sensitive to being left behind'],
      growth: 'Practice self-acceptance first. The people who truly love you stay through your mistakes. You don\'t need everyone\'s approval to be worthy.',
      affirmation: 'You deserve love not because of what you achieve, but simply because you exist.',
    },
    ja: {
      title: '💔 拒絶恐怖型',
      subtitle: '愛されないことを恐れるあなた',
      coreDescription: 'コアの恐怖は見捨てられることと所属感の喪失です。関係で深いつながりを求めますが、拒絶への恐怖が逆に本物のつながりを妨げることもあります。',
      traits: ['関係に深く投資する', '承認欲求が強い', '葛藤を回避する傾向', '一人にされることに敏感'],
      growth: 'まず自己受容の練習が必要です。本当に愛してくれる人はあなたのミスがあっても傍にいます。全員の承認を得る必要はありません。',
      affirmation: 'あなたは何かを達成したからではなく、存在するだけで愛される価値があります。',
    },
  },
  failure: {
    ko: {
      title: '📉 실패 공포형',
      subtitle: '충분히 좋아야 한다는 압박',
      coreDescription: '핵심 두려움은 불충분함과 무능함입니다. 높은 기준을 갖고 끊임없이 노력하지만, 실수나 실패에 극도로 민감합니다.',
      traits: ['완벽주의적 성향', '높은 성취 기준 보유', '비판에 민감', '실수를 오래 곱씹는 경향'],
      growth: '실수를 학습의 과정으로 재정의하세요. 완벽하게 준비될 때까지 기다리면 시작 자체를 못 할 수 있습니다. 실패는 종착지가 아닌 과정입니다.',
      affirmation: '당신의 가치는 성과가 아닌 존재 자체에 있습니다. 충분히 좋은 것으로도 충분합니다.',
    },
    en: {
      title: '📉 Fear of Failure',
      subtitle: 'The pressure to always be good enough',
      coreDescription: 'Your core fear is inadequacy and incompetence. You hold high standards and strive constantly, but are extremely sensitive to mistakes and failure.',
      traits: ['Perfectionist tendencies', 'Very high achievement standards', 'Sensitive to criticism', 'Tendency to ruminate on mistakes'],
      growth: 'Redefine mistakes as part of the learning process. Waiting until you\'re perfectly ready may mean never starting. Failure is a waypoint, not a destination.',
      affirmation: 'Your worth exists in who you are, not what you produce. Good enough truly is enough.',
    },
    ja: {
      title: '📉 失敗恐怖型',
      subtitle: '十分でなければというプレッシャー',
      coreDescription: 'コアの恐怖は不十分さと無能さです。高い基準を持ち絶え間なく努力しますが、ミスや失敗に対して極度に敏感です。',
      traits: ['完璧主義の傾向', '高い達成基準', '批判に敏感', 'ミスをいつまでも引きずる傾向'],
      growth: 'ミスを学習過程として再定義しましょう。完璧な準備ができるまで待っていると、始めること自体ができなくなります。失敗は終着点ではなく過程です。',
      affirmation: 'あなたの価値は成果ではなく存在そのものにあります。十分によいことで十分です。',
    },
  },
  loss: {
    ko: {
      title: '🌊 상실 공포형',
      subtitle: '잃지 않으려 꽉 쥐는 당신',
      coreDescription: '핵심 두려움은 통제력과 소중한 것들의 상실입니다. 안전하다고 느끼는 것들을 보존하려는 강한 욕구가 있습니다.',
      traits: ['통제 욕구가 강함', '변화에 저항함', '소중한 것에 집착하는 경향', '이별과 끝맺음이 유독 힘듦'],
      growth: '손에 쥔 것을 놓을 때 더 많은 것이 들어옵니다. 모든 것을 통제할 수 없다는 사실을 받아들이는 것이 자유로 가는 길입니다.',
      affirmation: '잃는 것이 두려운 만큼 당신이 그것을 얼마나 소중히 여기는지를 보여줍니다. 그 마음은 아름다운 강점입니다.',
    },
    en: {
      title: '🌊 Fear of Loss',
      subtitle: 'Holding on tight so nothing slips away',
      coreDescription: 'Your core fear is losing control and losing what matters most to you. You have a strong drive to preserve what feels safe and familiar.',
      traits: ['Strong need for control', 'Resistance to change', 'Tendency to cling to what\'s dear', 'Goodbyes and endings are especially hard'],
      growth: 'When you open your hands and let go, more can enter. Accepting that you cannot control everything is the path to freedom.',
      affirmation: 'How much you fear loss reflects how deeply you love. That depth is a beautiful strength.',
    },
    ja: {
      title: '🌊 喪失恐怖型',
      subtitle: '失わないようにしっかり握るあなた',
      coreDescription: 'コアの恐怖はコントロールの喪失と大切なものを失うことです。安全だと感じるものを守ろうとする強い欲求があります。',
      traits: ['コントロール欲求が強い', '変化に抵抗する', '大切なものに執着する傾向', '別れや終わりが特につらい'],
      growth: '手を開いて手放すとき、より多くのものが入ってきます。すべてをコントロールできないという事実を受け入れることが自由への道です。',
      affirmation: '失うことを恐れるほど、あなたがそれをどれほど大切にしているかを示しています。その深さは美しい強さです。',
    },
  },
  unknown: {
    ko: {
      title: '🌑 불확실성 공포형',
      subtitle: '예측 불가능함이 가장 두려운 당신',
      coreDescription: '핵심 두려움은 미지와 변화입니다. 확실성을 강렬하게 원하며, 정보를 수집하고 결정을 분석하는 데 많은 에너지를 씁니다.',
      traits: ['계획적이고 철저한 준비', '정보 과다 수집 경향', '결정 지연 (분석 마비)', '예측 가능한 환경 선호'],
      growth: '확실성 없이도 한 발 내딛는 연습이 필요합니다. 모든 것을 알아야 시작할 수 있는 건 아닙니다. 불확실함 속에도 삶은 계속됩니다.',
      affirmation: '모르는 것이 두려운 만큼 당신은 신중하고 사려깊습니다. 그 신중함을 믿고 한 발 나아가도 괜찮습니다.',
    },
    en: {
      title: '🌑 Fear of the Unknown',
      subtitle: 'Uncertainty is your greatest fear',
      coreDescription: 'Your core fear is the unfamiliar and change. You crave certainty intensely, investing great energy in gathering information and analyzing every decision.',
      traits: ['Thorough planner', 'Tendency to over-research', 'Decision delay (analysis paralysis)', 'Strong preference for predictable environments'],
      growth: 'Practice taking one step forward even without certainty. You don\'t need to know everything before you begin. Life continues even inside uncertainty.',
      affirmation: 'Your fear of the unknown reflects how thoughtful and careful you are. Trust that carefulness and take the next step.',
    },
    ja: {
      title: '🌑 不確実性恐怖型',
      subtitle: '予測不可能なことが最も怖いあなた',
      coreDescription: 'コアの恐怖は未知と変化です。確実性を強く求め、情報収集や決断の分析に多くのエネルギーを使います。',
      traits: ['計画的で徹底的な準備', '情報過多収集の傾向', '決断の先延ばし（分析麻痺）', '予測可能な環境を強く好む'],
      growth: '確実性がなくても一歩踏み出す練習が必要です。すべてを知ってから始める必要はありません。不確実な中でも人生は続きます。',
      affirmation: '未知を恐れるほどあなたは慎重で思慮深い。その慎重さを信じて一歩進んでも大丈夫です。',
    },
  },
  judgment: {
    ko: {
      title: '👁️ 평가 공포형',
      subtitle: '남의 눈이 두려운 당신',
      coreDescription: '핵심 두려움은 비판·수치심·남의 판단입니다. 다른 사람들이 자신을 어떻게 볼지에 대한 의식이 강하며, 이로 인해 자기 표현이 억제될 수 있습니다.',
      traits: ['높은 사회적 인식', '자기검열 경향', '이미지 관리에 에너지 소비', '군중 앞에서 긴장'],
      growth: '당신을 가장 가혹하게 비판하는 사람은 당신 자신일 수 있습니다. 다른 사람들은 당신이 생각하는 것만큼 당신에게 집중하지 않습니다.',
      affirmation: '타인의 시선을 신경 쓰는 당신은 그만큼 섬세하고 공감 능력이 높은 사람입니다. 그 감수성이 당신의 강점입니다.',
    },
    en: {
      title: '👁️ Fear of Judgment',
      subtitle: 'Living under the weight of others\' eyes',
      coreDescription: 'Your core fear is criticism, shame, and the judgment of others. You have heightened awareness of how you appear to others, which can suppress authentic self-expression.',
      traits: ['High social awareness', 'Strong self-censorship tendency', 'Energy spent on managing image', 'Anxiety in crowds or spotlight'],
      growth: 'The harshest critic of you is probably you. Other people are not watching you as closely as you imagine.',
      affirmation: 'Your sensitivity to others\' perspectives makes you deeply empathetic. That sensitivity is a genuine gift.',
    },
    ja: {
      title: '👁️ 評価恐怖型',
      subtitle: '他人の目が怖いあなた',
      coreDescription: 'コアの恐怖は批判・羞恥心・他者の評価です。他人にどう見られるかへの意識が強く、それが真の自己表現を抑制することがあります。',
      traits: ['高い社会的意識', '強い自己検閲傾向', 'イメージ管理にエネルギーを使う', '人前での緊張'],
      growth: 'あなたを最も厳しく批判しているのは自分自身かもしれません。他の人はあなたが思うほどあなたに注目していません。',
      affirmation: '他者の視線を気にするあなたはそれだけ繊細で共感力が高い。その感受性があなたの強みです。',
    },
  },
}

const TYPE_COLORS: Record<FearType, string> = {
  rejection: '#f43f5e',
  failure: '#f59e0b',
  loss: '#06b6d4',
  unknown: '#6366f1',
  judgment: '#a855f7',
}

interface Props { locale?: string }

export default function FearTypeTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [counts, setCounts] = useState<Record<FearType, number>>({
    rejection: 0, failure: 0, loss: 0, unknown: 0, judgment: 0,
  })
  const [result, setResult] = useState<FearType | null>(null)

  function calcResult(c: Record<FearType, number>): FearType {
    const types: FearType[] = ['rejection', 'failure', 'loss', 'unknown', 'judgment']
    return types.reduce((best, t) => c[t] > c[best] ? t : best, 'failure' as FearType)
  }

  function pick(type: FearType) {
    const newCounts = { ...counts, [type]: counts[type] + 1 }
    setCounts(newCounts)
    if (current + 1 >= questions.length) setResult(calcResult(newCounts))
    setCurrent(current + 1)
  }

  function restart() {
    setCurrent(0)
    setCounts({ rejection: 0, failure: 0, loss: 0, unknown: 0, judgment: 0 })
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= questions.length
  const progress = Math.round((current / questions.length) * 100)

  if (!finished) {
    const q = questions[current]
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
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={opt.text}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-none text-white"
                style={{ backgroundColor: TYPE_COLORS[opt.type] }}
              >
                {i + 1}
              </span>
              {opt.text}
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
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const fearTypes: FearType[] = ['rejection', 'failure', 'loss', 'unknown', 'judgment']

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {r.title}
        </div>
        <p className="font-bold text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.coreDescription}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.distribution}</h3>
        {fearTypes.map(t => {
          const pct = total > 0 ? Math.round((counts[t] / total) * 100) : 0
          return (
            <div key={t} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: TYPE_COLORS[t] }}>
                  {RESULTS[t][locale].title}
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[t] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">
          {r.traits.map(t => (
            <li key={t} className="text-sm text-muted-foreground flex gap-2">
              <span style={{ color }}>•</span>{t}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.growth}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.growth}</p>
      </div>

      <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: color + '40', backgroundColor: color + '0d' }}>
        <h3 className="font-bold text-sm" style={{ color }}>{lb.affirmation}</h3>
        <p className="text-sm leading-relaxed" style={{ color }}>{r.affirmation}</p>
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
