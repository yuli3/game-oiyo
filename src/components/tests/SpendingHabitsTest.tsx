import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type SpendingType = 'planner' | 'impulsive' | 'experiential' | 'value'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Option {
  type: SpendingType
  text: string
}

interface Question {
  id: string
  text: string
  options: Option[]
}

interface ResultData {
  badge: string
  title: string
  label: string
  description: string
  strengths: string[]
  watchOut: string
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
  strengthsLabel: string
  watchOutLabel: string
  tipLabel: string
  note: string
}> = {
  ko: {
    title: '소비 습관 테스트',
    subtitle: '나는 어떤 소비 유형?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 소비 유형은',
    yourType: '나의 소비 유형',
    strengthsLabel: '강점',
    watchOutLabel: '주의할 점',
    tipLabel: '실천 팁',
    note: '이 테스트는 자기 이해를 돕기 위한 참고 도구입니다.',
  },
  en: {
    title: 'Spending Habits Test',
    subtitle: "What's Your Consumer Type?",
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My spending type is',
    yourType: 'Your Consumer Type',
    strengthsLabel: 'Strengths',
    watchOutLabel: 'Watch Out',
    tipLabel: 'Practical Tip',
    note: 'This test is a reference tool for self-understanding.',
  },
  ja: {
    title: '消費習慣テスト',
    subtitle: 'あなたの消費タイプは？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の消費タイプは',
    yourType: '私の消費タイプ',
    strengthsLabel: '強み',
    watchOutLabel: '注意点',
    tipLabel: '実践ヒント',
    note: 'このテストは自己理解のための参考ツールです。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '온라인 쇼핑을 할 때 나는...',
      options: [
        { type: 'planner', text: '미리 장바구니에 담아두고 며칠 뒤 다시 확인 후 구매한다' },
        { type: 'impulsive', text: '좋아 보이면 바로 구매한다' },
        { type: 'experiential', text: '물건보다 콘서트 티켓이나 여행 패키지를 검색한다' },
        { type: 'value', text: '리뷰를 꼼꼼히 읽고 가격 비교 후 구매한다' },
      ],
    },
    {
      id: 'q2',
      text: '급여가 들어오면 첫 번째로...',
      options: [
        { type: 'planner', text: '저축과 고정 지출을 먼저 빼고 나머지로 생활한다' },
        { type: 'impulsive', text: '갖고 싶었던 것을 바로 산다' },
        { type: 'experiential', text: '다음 여행이나 이벤트 자금을 따로 모아 둔다' },
        { type: 'value', text: '필요한 것 목록을 점검하고 우선순위를 정한다' },
      ],
    },
    {
      id: 'q3',
      text: '할인 세일을 만나면...',
      options: [
        { type: 'planner', text: '필요한 것만, 계획에 있는 것만 구매한다' },
        { type: 'impulsive', text: '필요 없어도 싸면 일단 산다' },
        { type: 'experiential', text: '체험 관련 할인(여행·공연)에만 반응한다' },
        { type: 'value', text: '평소 찜해두던 프리미엄 제품을 이 기회에 구매한다' },
      ],
    },
    {
      id: 'q4',
      text: '구매 후 후회한 경험이...',
      options: [
        { type: 'planner', text: '거의 없다. 꼼꼼히 계획하기 때문' },
        { type: 'impulsive', text: '자주 있다. 그래도 당시엔 기뻤다' },
        { type: 'experiential', text: '물건은 후회하지만 경험은 후회 없다' },
        { type: 'value', text: '드물다. 충분히 조사한 후 구매하기 때문' },
      ],
    },
    {
      id: 'q5',
      text: '친구와 쇼핑할 때 나는...',
      options: [
        { type: 'planner', text: '목록에 있는 것만 사고 친구를 기다린다' },
        { type: 'impulsive', text: '친구가 사면 나도 갑자기 사고 싶어진다' },
        { type: 'experiential', text: '쇼핑보다 근처 카페나 체험을 먼저 제안한다' },
        { type: 'value', text: '친구의 구매도 꼼꼼히 분석해 조언한다' },
      ],
    },
    {
      id: 'q6',
      text: '예산이 초과될 것 같으면...',
      options: [
        { type: 'planner', text: '다음 달로 미루거나 계획을 재조정한다' },
        { type: 'impulsive', text: '어쩔 수 없다, 카드로 결제한다' },
        { type: 'experiential', text: '물건 구매를 줄이고 경험 예산은 유지한다' },
        { type: 'value', text: '대안 제품을 찾아보며 비용을 맞춘다' },
      ],
    },
    {
      id: 'q7',
      text: '새 스마트폰 출시 소식을 들으면...',
      options: [
        { type: 'planner', text: '현재 폰이 고장나면 그때 고려한다' },
        { type: 'impulsive', text: '어떻게든 사고 싶어진다' },
        { type: 'experiential', text: '특별히 흥미롭지 않다' },
        { type: 'value', text: '스펙을 분석하고 현재 폰과 비교한다' },
      ],
    },
    {
      id: 'q8',
      text: '카페에서 주문할 때...',
      options: [
        { type: 'planner', text: '항상 마시는 메뉴를 주문한다 (예산 예측 가능)' },
        { type: 'impulsive', text: '새로운 메뉴나 기간 한정 메뉴를 주로 선택한다' },
        { type: 'experiential', text: '분위기 좋은 카페라면 조금 비싸도 괜찮다' },
        { type: 'value', text: '가성비를 따져 가장 만족도 높은 메뉴를 고른다' },
      ],
    },
    {
      id: 'q9',
      text: '여행 계획을 세울 때...',
      options: [
        { type: 'planner', text: '숙박·교통·식비를 모두 계산하고 예산을 정한다' },
        { type: 'impulsive', text: '떠나고 싶으면 일단 예약하고 본다' },
        { type: 'experiential', text: '여행이야말로 돈을 아끼지 않아도 되는 영역이다' },
        { type: 'value', text: '최고의 가성비 여행 코스를 오래 연구한다' },
      ],
    },
    {
      id: 'q10',
      text: '집에 물건이 많아지면...',
      options: [
        { type: 'planner', text: '주기적으로 정리하고 필요 없는 것은 처분한다' },
        { type: 'impulsive', text: '어쩔 수 없다, 좋아서 산 것들이다' },
        { type: 'experiential', text: '물건보다 경험을 소비하기 때문에 크게 해당 없다' },
        { type: 'value', text: '구매 전 신중했기 때문에 대부분 필요한 것들이다' },
      ],
    },
    {
      id: 'q11',
      text: '돈에 대한 나의 철학은...',
      options: [
        { type: 'planner', text: '안정이 최우선, 내일을 위해 오늘을 아낀다' },
        { type: 'impulsive', text: '살아있을 때 즐겨야 한다' },
        { type: 'experiential', text: '추억과 경험이 최고의 투자다' },
        { type: 'value', text: '적게 사되, 좋은 것을 산다' },
      ],
    },
    {
      id: 'q12',
      text: '예상치 못한 보너스가 생기면...',
      options: [
        { type: 'planner', text: '비상금이나 저축에 추가한다' },
        { type: 'impulsive', text: '평소 사고 싶었던 것을 산다' },
        { type: 'experiential', text: '특별한 여행이나 이벤트에 쓴다' },
        { type: 'value', text: '오래 고민하던 고가 품질 제품을 산다' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When I shop online, I...',
      options: [
        { type: 'planner', text: 'Add items to my cart and check again a few days later before buying' },
        { type: 'impulsive', text: 'Buy it right away if it looks good' },
        { type: 'experiential', text: 'Search for concert tickets or travel packages rather than things' },
        { type: 'value', text: 'Read reviews carefully and compare prices before buying' },
      ],
    },
    {
      id: 'q2',
      text: 'When my paycheck arrives, the first thing I do is...',
      options: [
        { type: 'planner', text: 'Set aside savings and fixed expenses first, then live on the rest' },
        { type: 'impulsive', text: 'Buy something I\'ve been wanting right away' },
        { type: 'experiential', text: 'Set aside funds for my next trip or event' },
        { type: 'value', text: 'Review my needs list and prioritize them' },
      ],
    },
    {
      id: 'q3',
      text: 'When I come across a sale, I...',
      options: [
        { type: 'planner', text: 'Only buy what I need and what\'s in my plan' },
        { type: 'impulsive', text: 'Buy it even if I don\'t need it — it\'s cheap' },
        { type: 'experiential', text: 'Only react to experience-related deals (travel, shows)' },
        { type: 'value', text: 'Buy the premium item I\'ve been eyeing at this opportunity' },
      ],
    },
    {
      id: 'q4',
      text: 'Post-purchase regret is something I...',
      options: [
        { type: 'planner', text: 'Almost never feel — I plan carefully' },
        { type: 'impulsive', text: 'Often feel — but I was happy in the moment' },
        { type: 'experiential', text: 'Feel about things, but never about experiences' },
        { type: 'value', text: 'Rarely feel — I research thoroughly before buying' },
      ],
    },
    {
      id: 'q5',
      text: 'When shopping with a friend, I...',
      options: [
        { type: 'planner', text: 'Only buy what\'s on my list and wait for them' },
        { type: 'impulsive', text: 'Suddenly want something when my friend buys it' },
        { type: 'experiential', text: 'Suggest a nearby café or activity over shopping' },
        { type: 'value', text: 'Analyze my friend\'s purchase and offer advice' },
      ],
    },
    {
      id: 'q6',
      text: 'When I feel like I\'m about to exceed my budget, I...',
      options: [
        { type: 'planner', text: 'Delay to next month or readjust my plan' },
        { type: 'impulsive', text: 'Can\'t help it — just charge it to the card' },
        { type: 'experiential', text: 'Cut back on things but keep my experience budget' },
        { type: 'value', text: 'Look for alternative products to fit the cost' },
      ],
    },
    {
      id: 'q7',
      text: 'When I hear about a new smartphone launch, I...',
      options: [
        { type: 'planner', text: 'Consider it only when my current phone breaks' },
        { type: 'impulsive', text: 'Find a way to get it no matter what' },
        { type: 'experiential', text: 'Feel no particular interest' },
        { type: 'value', text: 'Analyze the specs and compare with my current phone' },
      ],
    },
    {
      id: 'q8',
      text: 'When ordering at a café, I...',
      options: [
        { type: 'planner', text: 'Order my usual (budget predictable)' },
        { type: 'impulsive', text: 'Usually pick new or limited-time items' },
        { type: 'experiential', text: 'Don\'t mind paying more if the atmosphere is great' },
        { type: 'value', text: 'Evaluate value-for-money and pick the most satisfying option' },
      ],
    },
    {
      id: 'q9',
      text: 'When planning a trip, I...',
      options: [
        { type: 'planner', text: 'Calculate all costs (accommodation, transport, food) and set a budget' },
        { type: 'impulsive', text: 'Book first and figure it out later when I feel like going' },
        { type: 'experiential', text: 'Believe travel is the one area where I shouldn\'t hold back' },
        { type: 'value', text: 'Research the best value-for-money itinerary for a long time' },
      ],
    },
    {
      id: 'q10',
      text: 'When my home fills up with stuff, I...',
      options: [
        { type: 'planner', text: 'Regularly declutter and get rid of things I don\'t need' },
        { type: 'impulsive', text: 'Can\'t help it — these are all things I loved buying' },
        { type: 'experiential', text: 'It doesn\'t apply much — I spend on experiences, not things' },
        { type: 'value', text: 'Most things are necessary since I was careful before buying' },
      ],
    },
    {
      id: 'q11',
      text: 'My philosophy about money is...',
      options: [
        { type: 'planner', text: 'Stability first — save today for tomorrow' },
        { type: 'impulsive', text: 'Enjoy while you\'re alive' },
        { type: 'experiential', text: 'Memories and experiences are the best investment' },
        { type: 'value', text: 'Buy less, but buy better' },
      ],
    },
    {
      id: 'q12',
      text: 'When I receive an unexpected bonus, I...',
      options: [
        { type: 'planner', text: 'Add it to my emergency fund or savings' },
        { type: 'impulsive', text: 'Buy something I\'ve been wanting' },
        { type: 'experiential', text: 'Spend it on a special trip or event' },
        { type: 'value', text: 'Finally buy the high-quality item I\'ve been deliberating over' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: 'オンラインショッピングをするとき、私は...',
      options: [
        { type: 'planner', text: '事前にカートに入れておき、数日後に再確認してから購入する' },
        { type: 'impulsive', text: '良さそうならすぐ購入する' },
        { type: 'experiential', text: '物よりもコンサートチケットや旅行パッケージを探す' },
        { type: 'value', text: 'レビューをしっかり読み、価格比較してから購入する' },
      ],
    },
    {
      id: 'q2',
      text: '給料が入ったら最初に...',
      options: [
        { type: 'planner', text: '貯蓄と固定費を先に引いて、残りで生活する' },
        { type: 'impulsive', text: '欲しかったものをすぐに買う' },
        { type: 'experiential', text: '次の旅行やイベントの資金を別に貯めておく' },
        { type: 'value', text: '必要なものリストを確認して優先順位を決める' },
      ],
    },
    {
      id: 'q3',
      text: 'セールを見かけたとき、私は...',
      options: [
        { type: 'planner', text: '必要なもの、計画にあるものだけ買う' },
        { type: 'impulsive', text: '必要なくても安ければとりあえず買う' },
        { type: 'experiential', text: '体験関連の割引（旅行・公演）にのみ反応する' },
        { type: 'value', text: 'ずっと欲しかったプレミアム商品をこの機会に購入する' },
      ],
    },
    {
      id: 'q4',
      text: '購入後に後悔した経験が...',
      options: [
        { type: 'planner', text: 'ほとんどない。きちんと計画するから' },
        { type: 'impulsive', text: 'よくある。でもその時は嬉しかった' },
        { type: 'experiential', text: '物は後悔するが、体験は後悔しない' },
        { type: 'value', text: 'まれにある。十分に調査してから購入するから' },
      ],
    },
    {
      id: 'q5',
      text: '友達と買い物するとき、私は...',
      options: [
        { type: 'planner', text: 'リストにあるものだけ買って友達を待つ' },
        { type: 'impulsive', text: '友達が買うと自分も急に欲しくなる' },
        { type: 'experiential', text: 'ショッピングより近くのカフェや体験を先に提案する' },
        { type: 'value', text: '友達の購入もしっかり分析してアドバイスする' },
      ],
    },
    {
      id: 'q6',
      text: '予算オーバーしそうなとき、私は...',
      options: [
        { type: 'planner', text: '来月に延ばすか、計画を見直す' },
        { type: 'impulsive', text: '仕方ない、カードで払う' },
        { type: 'experiential', text: '物の購入は減らし、体験予算は維持する' },
        { type: 'value', text: '代替品を探してコストを合わせる' },
      ],
    },
    {
      id: 'q7',
      text: '新しいスマートフォン発売のニュースを聞いたとき、私は...',
      options: [
        { type: 'planner', text: '今のスマホが壊れたら検討する' },
        { type: 'impulsive', text: 'なんとしても買いたくなる' },
        { type: 'experiential', text: '特に興味を感じない' },
        { type: 'value', text: 'スペックを分析して今のスマホと比較する' },
      ],
    },
    {
      id: 'q8',
      text: 'カフェで注文するとき...',
      options: [
        { type: 'planner', text: 'いつも飲むメニューを注文する（予算が予測しやすい）' },
        { type: 'impulsive', text: '新しいメニューや期間限定品を主に選ぶ' },
        { type: 'experiential', text: '雰囲気の良いカフェなら少し高くても構わない' },
        { type: 'value', text: 'コスパを考えて最も満足度の高いメニューを選ぶ' },
      ],
    },
    {
      id: 'q9',
      text: '旅行計画を立てるとき...',
      options: [
        { type: 'planner', text: '宿泊・交通・食費を全部計算して予算を決める' },
        { type: 'impulsive', text: '行きたくなったらとりあえず予約する' },
        { type: 'experiential', text: '旅行こそお金を惜しまなくていい領域だと思う' },
        { type: 'value', text: '最高のコスパ旅行コースを長時間研究する' },
      ],
    },
    {
      id: 'q10',
      text: '家に物が増えてきたとき...',
      options: [
        { type: 'planner', text: '定期的に整理して不要なものは処分する' },
        { type: 'impulsive', text: '仕方ない、好きで買ったものだから' },
        { type: 'experiential', text: '物より体験に使うのでほとんど当てはまらない' },
        { type: 'value', text: '購入前に慎重だったので、ほとんど必要なものだ' },
      ],
    },
    {
      id: 'q11',
      text: 'お金に対する私の哲学は...',
      options: [
        { type: 'planner', text: '安定が最優先。明日のために今日節約する' },
        { type: 'impulsive', text: '生きているうちに楽しむべき' },
        { type: 'experiential', text: '思い出と体験が最高の投資だ' },
        { type: 'value', text: '少なく買うが、良いものを買う' },
      ],
    },
    {
      id: 'q12',
      text: '予想外のボーナスが入ったとき...',
      options: [
        { type: 'planner', text: '緊急資金や貯蓄に追加する' },
        { type: 'impulsive', text: 'ずっと欲しかったものを買う' },
        { type: 'experiential', text: '特別な旅行やイベントに使う' },
        { type: 'value', text: 'ずっと迷っていた高品質な商品を買う' },
      ],
    },
  ],
}

const RESULTS: Record<SpendingType, Record<SupportedLang, ResultData>> = {
  planner: {
    ko: {
      badge: '📋',
      title: '계획형',
      label: '철저한 재정 설계자',
      description: '체계적인 예산 관리로 재정 안정을 추구합니다. 목표를 세우고 그것을 이루는 데 탁월한 능력을 발휘합니다.',
      strengths: ['재정 안정성 높음', '목표 달성률 우수', '예산 초과 거의 없음'],
      watchOut: '지나친 절약으로 유연성이 부족해질 수 있습니다.',
      tip: '소소한 즉흥 소비도 삶의 활력이 됩니다. 월 예산의 5%는 "자유 소비"로 허용해보세요.',
    },
    en: {
      badge: '📋',
      title: 'The Planner',
      label: 'Thorough Financial Architect',
      description: 'You pursue financial stability through systematic budget management. You excel at setting goals and achieving them.',
      strengths: ['High financial stability', 'Excellent goal achievement', 'Rarely overspends'],
      watchOut: 'Excessive frugality can lead to a lack of flexibility.',
      tip: 'Small impulsive buys bring vitality. Consider allowing 5% of your monthly budget as "free spending."',
    },
    ja: {
      badge: '📋',
      title: '計画型',
      label: '徹底的な財務設計者',
      description: '体系的な予算管理で財務の安定を追求します。目標を立て、達成することに優れた能力を発揮します。',
      strengths: ['高い財務安定性', '優れた目標達成率', '予算オーバーがほとんどない'],
      watchOut: '過度な節約で柔軟性が失われることがあります。',
      tip: 'ちょっとした衝動買いも生活の活力になります。月予算の5%を「自由消費」として許可してみてください。',
    },
  },
  impulsive: {
    ko: {
      badge: '🛍️',
      title: '충동형',
      label: '현재 순간을 즐기는 자',
      description: '기분에 따라 소비하며 지금 이 순간을 즐깁니다. 삶의 즐거움을 놓치지 않는 유연한 소비자입니다.',
      strengths: ['삶의 즐거움 추구', '높은 소비 유연성', '기회를 놓치지 않는 민첩함'],
      watchOut: '예산 초과가 빈번하고 후회하는 구매가 많을 수 있습니다.',
      tip: '72시간 대기 규칙을 적용해보세요. 3일 뒤에도 원한다면 그때 구매하세요.',
    },
    en: {
      badge: '🛍️',
      title: 'The Impulsive',
      label: 'Moment Enjoyer',
      description: 'You spend based on how you feel and enjoy the present. You\'re a flexible spender who doesn\'t miss out on life\'s pleasures.',
      strengths: ['Pursues life\'s joys', 'High spending flexibility', 'Quick to seize opportunities'],
      watchOut: 'Frequent budget overruns and post-purchase regret can be common.',
      tip: 'Try the 72-hour rule. If you still want it after 3 days, then buy it.',
    },
    ja: {
      badge: '🛍️',
      title: '衝動型',
      label: '今この瞬間を楽しむ人',
      description: '気分に合わせて消費し、今この瞬間を楽しみます。生活の喜びを逃さない柔軟な消費者です。',
      strengths: ['生活の喜びを追求', '高い消費柔軟性', '機会を逃さない機敏さ'],
      watchOut: '予算オーバーが頻繁で、後悔する買い物が多くなりがちです。',
      tip: '72時間待ちルールを試してみてください。3日後でも欲しければそのとき購入しましょう。',
    },
  },
  experiential: {
    ko: {
      badge: '🎭',
      title: '경험형',
      label: '추억 수집가',
      description: '물건보다 경험에 가치를 두는 현명한 소비자입니다. 추억과 감동이 가장 소중한 자산이라 믿습니다.',
      strengths: ['풍부한 삶의 추억', '높은 삶의 만족도', '물질보다 가치 중심 소비'],
      watchOut: '경험에 대한 지출이 예상치 못하게 클 수 있습니다.',
      tip: '경험 예산을 미리 따로 설정하면 더 자유롭고 죄책감 없이 즐길 수 있습니다.',
    },
    en: {
      badge: '🎭',
      title: 'The Experiential',
      label: 'Memory Collector',
      description: 'You\'re a wise spender who values experiences over things. You believe memories and moments are your most precious assets.',
      strengths: ['Rich life memories', 'High life satisfaction', 'Value-driven over material spending'],
      watchOut: 'Experience spending can unexpectedly exceed expectations.',
      tip: 'Set a separate experience budget in advance so you can enjoy freely and guilt-free.',
    },
    ja: {
      badge: '🎭',
      title: '体験型',
      label: '思い出コレクター',
      description: 'モノより体験に価値を置く賢い消費者です。思い出と感動が最も大切な資産だと信じています。',
      strengths: ['豊かな人生の思い出', '高い生活満足度', 'モノより価値重視の消費'],
      watchOut: '体験への支出が予想外に大きくなることがあります。',
      tip: '体験予算を事前に別途設定すれば、より自由に罪悪感なく楽しめます。',
    },
  },
  value: {
    ko: {
      badge: '🔍',
      title: '가치형',
      label: '현명한 품질 추구자',
      description: '꼼꼼한 리서치로 최고의 가성비를 찾습니다. 구매할 때마다 후회 없는 선택을 위해 충분히 고민합니다.',
      strengths: ['후회 없는 구매', '장기적 만족도 높음', '가성비 최적화'],
      watchOut: '의사결정 과정이 너무 길어져 기회를 놓칠 수 있습니다.',
      tip: '소액 구매는 규칙을 완화해도 됩니다. "2만원 이하는 30분 이내 결정" 규칙을 만들어보세요.',
    },
    en: {
      badge: '🔍',
      title: 'The Value Seeker',
      label: 'Wise Quality Pursuer',
      description: 'You find the best value through careful research. You deliberate thoroughly to ensure no regrets with every purchase.',
      strengths: ['Regret-free purchases', 'High long-term satisfaction', 'Optimal value-for-money'],
      watchOut: 'The decision-making process can take so long that you miss opportunities.',
      tip: 'Relax the rules for small purchases. Try a rule: "Decide within 30 minutes for anything under $20."',
    },
    ja: {
      badge: '🔍',
      title: '価値型',
      label: '賢い品質追求者',
      description: 'きめ細かいリサーチで最高のコスパを見つけます。毎回の購入で後悔しない選択のために十分に考えます。',
      strengths: ['後悔しない購入', '高い長期的満足度', 'コスパ最適化'],
      watchOut: '意思決定プロセスが長くなりすぎて機会を逃すことがあります。',
      tip: '少額の購入はルールを緩めても大丈夫です。「2,000円以下は30分以内に決定」というルールを作ってみてください。',
    },
  },
}

const TYPE_COLORS: Record<SpendingType, string> = {
  planner: '#22c55e',
  impulsive: '#ef4444',
  experiential: '#8b5cf6',
  value: '#3b82f6',
}

function calcResult(answers: SpendingType[]): SpendingType {
  const counts: Record<SpendingType, number> = { planner: 0, impulsive: 0, experiential: 0, value: 0 }
  for (const a of answers) counts[a]++
  return (Object.keys(counts) as SpendingType[]).reduce((a, b) => counts[a] >= counts[b] ? a : b)
}

interface Props { locale?: string }

export default function SpendingHabitsTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<SpendingType[]>([])
  const [result, setResult] = useState<{ type: SpendingType; counts: Record<SpendingType, number> } | null>(null)

  function pick(type: SpendingType) {
    const newAns = [...answers, type]
    if (current + 1 >= questions.length) {
      const counts: Record<SpendingType, number> = { planner: 0, impulsive: 0, experiential: 0, value: 0 }
      for (const a of newAns) counts[a]++
      setResult({ type: calcResult(newAns), counts })
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
    const text = `${lb.shareMsg} — ${RESULTS[result.type][l].title}`
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
        <div className="rounded-xl border bg-card p-5">
          <p className="text-lg font-medium text-center">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors"
              aria-label={opt.text}
            >
              {opt.text}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null

  const r = RESULTS[result.type][l]
  const typeColor = TYPE_COLORS[result.type]
  const total = questions.length

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: typeColor }}
        >
          <span>{r.badge}</span>
          <span>{r.title}</span>
        </div>
        <p className="font-medium text-muted-foreground">{r.label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        {(Object.entries(result.counts) as [SpendingType, number][]).map(([type, count]) => {
          const pct = Math.round((count / total) * 100)
          const rd = RESULTS[type][l]
          return (
            <div key={type} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium flex items-center gap-1">
                  <span>{rd.badge}</span>
                  <span>{rd.title}</span>
                </span>
                <span className="text-xs text-muted-foreground">{count}/{total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-emerald-600">{lb.strengthsLabel}</h3>
        <ul className="space-y-1">
          {r.strengths.map((s) => (
            <li key={s} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500 flex-none">→</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-amber-700">{lb.watchOutLabel}</h3>
        <p className="text-sm text-amber-700">{r.watchOut}</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.tipLabel}</h3>
        <p className="text-sm text-muted-foreground">{r.tip}</p>
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
