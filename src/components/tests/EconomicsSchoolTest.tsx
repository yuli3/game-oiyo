import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'
type School = 'keynesian' | 'classical' | 'behavioral' | 'austrian' | 'institutional'

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  yourSchool: string; traitLabel: string; keyThinkers: string
  policyLabel: string; note: string
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '경제학파 성향 테스트',
    subtitle: '나는 어떤 경제학파에 속할까? 12가지 질문으로 알아봐요',
    start: '시작하기', restart: '다시 하기',
    yourSchool: '나의 경제학파',
    traitLabel: '핵심 성향',
    keyThinkers: '대표 학자',
    policyLabel: '정책 입장',
    note: '이 테스트는 교육적 흥미를 위한 것입니다. 경제학파는 학문적으로 더 복잡합니다.',
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Economics School of Thought Test',
    subtitle: 'Which school of economics do you belong to? Find out with 12 questions',
    start: 'Start', restart: 'Retake',
    yourSchool: 'Your Economics School',
    traitLabel: 'Core Tendencies',
    keyThinkers: 'Key Thinkers',
    policyLabel: 'Policy Stance',
    note: 'This test is for educational interest. Schools of economics are more complex in academia.',
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: { title: '経済学派傾向テスト', subtitle: 'あなたはどの経済学派に属する？12の質問で分かる', start: '開始', restart: 'もう一度', yourSchool: 'あなたの経済学派', traitLabel: '核心的傾向', keyThinkers: '代表的学者', policyLabel: '政策的立場', note: 'このテストは教育的興味のためのものです。', progress: (c, t) => `${c} / ${t}` },
  fr: { title: 'Test d\'École de Pensée Économique', subtitle: 'À quelle école économique appartenez-vous ? 12 questions', start: 'Commencer', restart: 'Recommencer', yourSchool: 'Votre École Économique', traitLabel: 'Tendances fondamentales', keyThinkers: 'Penseurs clés', policyLabel: 'Position politique', note: 'Ce test est à des fins éducatives.', progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Test de Escuela de Pensamiento Económico', subtitle: '¿A qué escuela económica perteneces? 12 preguntas', start: 'Comenzar', restart: 'Repetir', yourSchool: 'Tu Escuela Económica', traitLabel: 'Tendencias fundamentales', keyThinkers: 'Pensadores clave', policyLabel: 'Postura política', note: 'Este test es para interés educativo.', progress: (c, t) => `${c} / ${t}` },
  zh: { title: '经济学派倾向测试', subtitle: '你属于哪个经济学派？12个问题来了解', start: '开始', restart: '重新测试', yourSchool: '你的经济学派', traitLabel: '核心倾向', keyThinkers: '代表学者', policyLabel: '政策立场', note: '此测试仅供教育兴趣。', progress: (c, t) => `${c} / ${t}` },
}

interface SchoolData {
  ko: { name: string; traits: string[]; thinkers: string[]; policy: string; desc: string; emoji: string }
  en: { name: string; traits: string[]; thinkers: string[]; policy: string; desc: string; emoji: string }
}

const SCHOOLS: Record<School, SchoolData> = {
  keynesian: {
    ko: { name: '케인스학파', traits: ['적극적 재정정책 지지', '정부 개입 필요', '총수요 관리', '경기 안정 중시'], thinkers: ['존 메이너드 케인스', '폴 새뮤얼슨', '폴 크루그먼'], policy: '경기 침체기 재정 지출 확대, 감세, 공공 투자 지지', desc: '정부가 경제를 조절해야 한다고 믿습니다. 시장 실패 시 적극적인 재정·통화 정책이 필요하다고 봅니다.', emoji: '🏛️' },
    en: { name: 'Keynesian', traits: ['Support for fiscal policy', 'Government intervention', 'Aggregate demand management', 'Economic stabilization'], thinkers: ['John Maynard Keynes', 'Paul Samuelson', 'Paul Krugman'], policy: 'Supports deficit spending in recessions, stimulus, public investment', desc: 'Believes government should actively manage the economy. Favors fiscal and monetary policy to counter market failures.', emoji: '🏛️' },
  },
  classical: {
    ko: { name: '신고전학파', traits: ['시장 효율성 신뢰', '합리적 경제인', '작은 정부 선호', '자유 시장 지지'], thinkers: ['애덤 스미스', '알프레드 마샬', '밀턴 프리드먼'], policy: '규제 완화, 자유 무역, 균형 재정 추구', desc: '시장이 스스로 균형을 찾는다고 믿습니다. 가격 메커니즘과 시장 효율성을 신뢰하며 정부 개입을 최소화해야 한다고 봅니다.', emoji: '⚖️' },
    en: { name: 'Neoclassical', traits: ['Market efficiency', 'Rational actors', 'Small government', 'Free markets'], thinkers: ['Adam Smith', 'Alfred Marshall', 'Milton Friedman'], policy: 'Deregulation, free trade, balanced budgets', desc: 'Believes markets naturally find equilibrium. Trusts price mechanisms and favors minimal government intervention.', emoji: '⚖️' },
  },
  behavioral: {
    ko: { name: '행동경제학파', traits: ['인간은 비합리적', '심리·편향 분석', '넛지 정책 지지', '선택 설계 중시'], thinkers: ['대니얼 카너먼', '리처드 탈러', '허버트 사이먼'], policy: '넛지·선택 설계로 더 나은 선택 유도, 소비자 보호', desc: '사람들이 항상 합리적으로 행동하지 않는다는 점에 주목합니다. 심리학과 경제학을 결합하여 실제 인간 행동을 분석합니다.', emoji: '🧠' },
    en: { name: 'Behavioral Economics', traits: ['Humans are irrational', 'Psychology & biases', 'Nudge policy', 'Choice architecture'], thinkers: ['Daniel Kahneman', 'Richard Thaler', 'Herbert Simon'], policy: 'Nudges, choice architecture, consumer protection', desc: 'Recognizes that people don\'t always act rationally. Combines psychology and economics to analyze real human behavior.', emoji: '🧠' },
  },
  austrian: {
    ko: { name: '오스트리아학파', traits: ['개인 자유 극대화', '중앙 계획 반대', '자발적 질서 신뢰', '기업가 정신 강조'], thinkers: ['루트비히 폰 미제스', '프리드리히 하이에크', '머리 로스버드'], policy: '최소 정부, 중앙은행 폐지 논의, 자유 시장 극단적 지지', desc: '개인의 자유와 자발적 협력을 가장 중요하게 봅니다. 정부 개입보다 시장의 자발적 질서가 더 효율적이라고 믿습니다.', emoji: '🦅' },
    en: { name: 'Austrian School', traits: ['Maximize individual liberty', 'Anti-central planning', 'Spontaneous order', 'Entrepreneurship'], thinkers: ['Ludwig von Mises', 'Friedrich Hayek', 'Murray Rothbard'], policy: 'Minimal government, debates on central banking, extreme free market advocacy', desc: 'Values individual freedom and voluntary cooperation above all. Believes spontaneous market order is more efficient than government planning.', emoji: '🦅' },
  },
  institutional: {
    ko: { name: '제도학파', traits: ['제도·규칙의 역할', '역사·사회적 맥락', '시장+제도 균형', '공공재 중시'], thinkers: ['소스타인 베블런', '존 케네스 갤브레이스', '더글러스 노스'], policy: '제도 개혁, 독점 규제, 복지 국가, 불평등 해소', desc: '경제는 시장만으로 작동하지 않으며 법, 제도, 문화가 중요하다고 봅니다. 역사적·사회적 맥락에서 경제 현상을 분석합니다.', emoji: '🏗️' },
    en: { name: 'Institutionalist', traits: ['Role of institutions', 'Historical context', 'Market + institutions', 'Public goods'], thinkers: ['Thorstein Veblen', 'John Kenneth Galbraith', 'Douglass North'], policy: 'Institutional reform, anti-monopoly, welfare state, inequality reduction', desc: 'Believes economies don\'t work on markets alone; laws, institutions, and culture matter. Analyzes economic phenomena in historical and social context.', emoji: '🏗️' },
  },
}

interface Question {
  id: string
  text: string
  options: { value: School; label: string }[]
}

const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    { id: 'q1', text: '경기 침체가 왔을 때 정부의 역할은?', options: [{ value: 'keynesian', label: '재정 지출을 늘리고 적극적으로 경기를 살려야 한다' }, { value: 'classical', label: '시장이 스스로 회복할 수 있도록 개입을 최소화해야 한다' }, { value: 'austrian', label: '정부 개입 자체가 문제를 악화시키므로 손을 떼야 한다' }, { value: 'institutional', label: '제도와 규제를 정비하여 구조적 문제를 해결해야 한다' }] },
    { id: 'q2', text: '사람들은 경제적 결정을 어떻게 내리나요?', options: [{ value: 'classical', label: '충분한 정보가 있으면 합리적으로 판단한다' }, { value: 'behavioral', label: '심리적 편향과 감정에 의해 자주 비합리적인 선택을 한다' }, { value: 'institutional', label: '제도와 사회적 규범이 선택을 크게 제약한다' }, { value: 'keynesian', label: '미래 불확실성으로 인해 소비·투자를 줄이기도 한다' }] },
    { id: 'q3', text: '소득 불평등 문제에 대한 해법은?', options: [{ value: 'keynesian', label: '누진세와 복지 지출 확대로 재분배해야 한다' }, { value: 'classical', label: '자유 시장과 성장이 장기적으로 불평등을 줄인다' }, { value: 'behavioral', label: '정책 설계(넛지)로 저소득층의 저축·투자를 유도해야 한다' }, { value: 'institutional', label: '교육·기회의 제도적 불평등을 해소해야 한다' }] },
    { id: 'q4', text: '중앙은행의 역할에 대해서는?', options: [{ value: 'keynesian', label: '통화 정책으로 경기를 조절하고 완전 고용을 유지해야 한다' }, { value: 'classical', label: '물가 안정과 예측 가능한 통화 공급 규칙이 중요하다' }, { value: 'austrian', label: '중앙은행이 경기 사이클을 왜곡시키는 원인이다' }, { value: 'behavioral', label: '사람들의 기대 심리를 관리하는 것이 핵심이다' }] },
    { id: 'q5', text: '자유 무역에 대한 입장은?', options: [{ value: 'classical', label: '비교 우위 원리에 따라 자유 무역이 모두에게 이익이다' }, { value: 'keynesian', label: '단기적으로 일자리 보호를 위한 일부 규제가 필요할 수 있다' }, { value: 'institutional', label: '강대국이 구조적으로 유리하므로 발전 단계에 맞는 보호가 필요하다' }, { value: 'austrian', label: '무역은 완전히 자유로워야 하며 관세는 모두에게 해롭다' }] },
    { id: 'q6', text: '환경 문제와 경제의 관계는?', options: [{ value: 'institutional', label: '시장이 실패하는 영역이므로 강력한 환경 규제가 필요하다' }, { value: 'behavioral', label: '탄소세와 같은 가격 신호+넛지로 행동을 변화시켜야 한다' }, { value: 'classical', label: '탄소세 등 가격 메커니즘으로 외부성을 내부화하면 된다' }, { value: 'austrian', label: '재산권을 명확히 하면 시장이 환경 문제도 해결할 수 있다' }] },
    { id: 'q7', text: '최저 임금 인상에 대한 의견은?', options: [{ value: 'keynesian', label: '총수요를 높여 경제에 긍정적 영향을 줄 수 있다' }, { value: 'classical', label: '고용을 줄여 오히려 저소득층을 해칠 수 있다' }, { value: 'behavioral', label: '효과는 상황에 따라 다르며 기업 행동 패턴 분석이 필요하다' }, { value: 'institutional', label: '노동 시장의 권력 불균형을 교정하는 데 필요하다' }] },
    { id: 'q8', text: '기업 독점에 대해서는?', options: [{ value: 'classical', label: '장기적으로 시장 진입이 독점을 해소할 것이다' }, { value: 'keynesian', label: '독점은 비효율과 불평등을 낳으므로 규제가 필요하다' }, { value: 'institutional', label: '독점은 제도적 특권에서 비롯되므로 규제 개혁이 필요하다' }, { value: 'austrian', label: '정부 규제 자체가 독점을 만드므로 규제를 줄여야 한다' }] },
    { id: 'q9', text: '경제 예측 모델에 대해서는?', options: [{ value: 'classical', label: '수학적 모델로 경제를 합리적으로 예측할 수 있다' }, { value: 'behavioral', label: '인간의 비합리성 때문에 기존 모델은 한계가 있다' }, { value: 'austrian', label: '경제는 너무 복잡해서 중앙집권적 예측 자체가 불가능하다' }, { value: 'institutional', label: '역사와 제도적 맥락 없이는 모델이 의미 없다' }] },
    { id: 'q10', text: '복지 국가에 대한 생각은?', options: [{ value: 'keynesian', label: '자동 안정화 장치로서 경기 변동을 완화하는 필수 제도다' }, { value: 'classical', label: '과도한 복지는 근로 의욕을 떨어뜨리고 재정 부담을 높인다' }, { value: 'institutional', label: '기회 불평등을 줄이고 사회 안전망을 제공하는 데 필요하다' }, { value: 'behavioral', label: '복지 프로그램 설계가 실제 행동 변화에 핵심이다' }] },
    { id: 'q11', text: '국가 부채에 대한 입장은?', options: [{ value: 'keynesian', label: '경기 침체기에는 부채를 늘려서라도 경기를 살려야 한다' }, { value: 'classical', label: '장기적으로 균형 재정을 유지해야 경제가 건전해진다' }, { value: 'austrian', label: '국가 부채는 미래 세대에게 세금 부담을 전가하는 행위다' }, { value: 'institutional', label: '부채의 용도와 구조가 부채 규모만큼 중요하다' }] },
    { id: 'q12', text: '기술 발전과 일자리 대체에 대해서는?', options: [{ value: 'classical', label: '장기적으로 새로운 산업과 일자리가 만들어져 균형을 찾는다' }, { value: 'keynesian', label: '단기적으로 실업이 발생하므로 재교육·복지 지원이 필요하다' }, { value: 'behavioral', label: '전환기에 사람들이 합리적 선택을 못 하므로 정책 설계가 필요하다' }, { value: 'institutional', label: '기술 발전의 혜택 분배를 위한 제도 개혁이 필요하다' }] },
  ],
  en: [
    { id: 'q1', text: 'When a recession hits, what should the government do?', options: [{ value: 'keynesian', label: 'Increase spending and actively stimulate the economy' }, { value: 'classical', label: 'Minimize intervention and let markets self-correct' }, { value: 'austrian', label: 'Government intervention itself worsens problems; step back' }, { value: 'institutional', label: 'Reform institutions and regulations to address structural issues' }] },
    { id: 'q2', text: 'How do people make economic decisions?', options: [{ value: 'classical', label: 'Rationally, given sufficient information' }, { value: 'behavioral', label: 'Often irrationally due to psychological biases and emotions' }, { value: 'institutional', label: 'Constrained greatly by institutions and social norms' }, { value: 'keynesian', label: 'They reduce consumption/investment due to future uncertainty' }] },
    { id: 'q3', text: 'How should income inequality be addressed?', options: [{ value: 'keynesian', label: 'Progressive taxes and expanded welfare spending for redistribution' }, { value: 'classical', label: 'Free markets and growth reduce inequality over time' }, { value: 'behavioral', label: 'Nudge policies to encourage savings and investment by low-income groups' }, { value: 'institutional', label: 'Address institutional inequalities in education and opportunity' }] },
    { id: 'q4', text: 'On the role of central banks?', options: [{ value: 'keynesian', label: 'Monetary policy should maintain employment and manage the economy' }, { value: 'classical', label: 'Price stability and predictable money supply rules are key' }, { value: 'austrian', label: 'Central banks are the cause of distorted economic cycles' }, { value: 'behavioral', label: 'Managing public expectations is the core function' }] },
    { id: 'q5', text: 'Your position on free trade?', options: [{ value: 'classical', label: 'Free trade benefits all through comparative advantage' }, { value: 'keynesian', label: 'Some regulation may be needed short-term to protect jobs' }, { value: 'institutional', label: 'Developed nations have structural advantages; protection is sometimes needed' }, { value: 'austrian', label: 'Trade should be completely free; tariffs harm everyone' }] },
    { id: 'q6', text: 'On the environment and the economy?', options: [{ value: 'institutional', label: 'Markets fail here; strong environmental regulations are needed' }, { value: 'behavioral', label: 'Carbon taxes + nudges should change behavior' }, { value: 'classical', label: 'Price signals like carbon taxes can internalize externalities' }, { value: 'austrian', label: 'Clear property rights allow markets to solve environmental issues' }] },
    { id: 'q7', text: 'On raising the minimum wage?', options: [{ value: 'keynesian', label: 'Boosts aggregate demand and can have a positive economic impact' }, { value: 'classical', label: 'Reduces employment and can hurt low-income workers' }, { value: 'behavioral', label: 'Effects vary; need to analyze actual business behavior patterns' }, { value: 'institutional', label: 'Necessary to correct power imbalances in the labor market' }] },
    { id: 'q8', text: 'On corporate monopolies?', options: [{ value: 'classical', label: 'Market entry will dissolve monopolies over time' }, { value: 'keynesian', label: 'Monopolies create inefficiency and inequality; regulation needed' }, { value: 'institutional', label: 'Monopolies stem from institutional privileges; regulatory reform needed' }, { value: 'austrian', label: 'Government regulation creates monopolies; reduce regulations' }] },
    { id: 'q9', text: 'On economic forecasting models?', options: [{ value: 'classical', label: 'Mathematical models can rationally predict economic behavior' }, { value: 'behavioral', label: 'Human irrationality limits conventional models' }, { value: 'austrian', label: 'Economies are too complex for centralized prediction' }, { value: 'institutional', label: 'Models without historical and institutional context are meaningless' }] },
    { id: 'q10', text: 'On the welfare state?', options: [{ value: 'keynesian', label: 'Essential as an automatic stabilizer reducing economic volatility' }, { value: 'classical', label: 'Excessive welfare reduces work incentives and strains budgets' }, { value: 'institutional', label: 'Needed to reduce inequality and provide social safety nets' }, { value: 'behavioral', label: 'The design of welfare programs is key to real behavior change' }] },
    { id: 'q11', text: 'On national debt?', options: [{ value: 'keynesian', label: 'During recessions, borrowing is justified to stimulate the economy' }, { value: 'classical', label: 'Long-term balanced budgets keep the economy healthy' }, { value: 'austrian', label: 'National debt transfers tax burdens to future generations' }, { value: 'institutional', label: 'The use and structure of debt matter as much as its size' }] },
    { id: 'q12', text: 'On technology replacing jobs?', options: [{ value: 'classical', label: 'New industries and jobs emerge over time, restoring balance' }, { value: 'keynesian', label: 'Short-term unemployment requires retraining and welfare support' }, { value: 'behavioral', label: 'People don\'t always make rational choices in transitions; policy design needed' }, { value: 'institutional', label: 'Institutional reform needed to distribute benefits of tech advances' }] },
  ],
  ja: [
    { id: 'q1', text: '景気後退が来たとき、政府の役割は？', options: [{ value: 'keynesian', label: '財政支出を増やし積極的に景気を回復させるべき' }, { value: 'classical', label: '市場が自己回復できるよう介入を最小限にすべき' }, { value: 'austrian', label: '政府介入自体が問題を悪化させるので手を引くべき' }, { value: 'institutional', label: '制度と規制を整備して構造的問題を解決すべき' }] },
    { id: 'q2', text: '人々はどのように経済的判断を下すか？', options: [{ value: 'classical', label: '十分な情報があれば合理的に判断する' }, { value: 'behavioral', label: '心理的バイアスと感情によってしばしば非合理的な選択をする' }, { value: 'institutional', label: '制度と社会規範が選択を大きく制約する' }, { value: 'keynesian', label: '将来の不確実性から消費・投資を減らすこともある' }] },
    { id: 'q3', text: '所得格差問題の解決策は？', options: [{ value: 'keynesian', label: '累進税と福祉支出拡大で再分配すべき' }, { value: 'classical', label: '自由市場と経済成長が長期的に格差を縮小する' }, { value: 'behavioral', label: 'ナッジ政策で低所得層の貯蓄・投資を促す' }, { value: 'institutional', label: '教育・機会の制度的不平等を解消すべき' }] },
    { id: 'q4', text: '中央銀行の役割については？', options: [{ value: 'keynesian', label: '金融政策で景気を調整し完全雇用を維持すべき' }, { value: 'classical', label: '物価安定と予測可能な貨幣供給ルールが重要' }, { value: 'austrian', label: '中央銀行が景気サイクルを歪める原因だ' }, { value: 'behavioral', label: '人々の期待心理を管理することが核心' }] },
    { id: 'q5', text: '自由貿易についての立場は？', options: [{ value: 'classical', label: '比較優位の原理から自由貿易はすべての人に利益をもたらす' }, { value: 'keynesian', label: '短期的には雇用保護のための規制が必要な場合もある' }, { value: 'institutional', label: '先進国が構造的に有利なので発展段階に応じた保護が必要' }, { value: 'austrian', label: '貿易は完全に自由であるべきで関税はすべてに有害' }] },
    { id: 'q6', text: '環境問題と経済の関係は？', options: [{ value: 'institutional', label: '市場が失敗する領域なので強力な環境規制が必要' }, { value: 'behavioral', label: '炭素税＋ナッジで行動変容を促すべき' }, { value: 'classical', label: '炭素税などで外部性を内部化すればいい' }, { value: 'austrian', label: '財産権を明確にすれば市場が環境問題も解決できる' }] },
    { id: 'q7', text: '最低賃金引き上げについては？', options: [{ value: 'keynesian', label: '総需要を高め経済にプラスの影響を与える可能性がある' }, { value: 'classical', label: '雇用を減らし低所得者層を逆に傷つけることがある' }, { value: 'behavioral', label: '効果は状況次第で企業の行動パターン分析が必要' }, { value: 'institutional', label: '労働市場の権力不均衡を是正するために必要' }] },
    { id: 'q8', text: '企業独占について？', options: [{ value: 'classical', label: '長期的に市場参入が独占を解消する' }, { value: 'keynesian', label: '独占は非効率と不平等を生むので規制が必要' }, { value: 'institutional', label: '独占は制度的特権から生じるので規制改革が必要' }, { value: 'austrian', label: '政府規制自体が独占を作るので規制を減らすべき' }] },
    { id: 'q9', text: '経済予測モデルについては？', options: [{ value: 'classical', label: '数学的モデルで経済を合理的に予測できる' }, { value: 'behavioral', label: '人間の非合理性のため既存モデルには限界がある' }, { value: 'austrian', label: '経済は複雑すぎて中央集権的な予測自体が不可能' }, { value: 'institutional', label: '歴史と制度的文脈なしにはモデルに意味がない' }] },
    { id: 'q10', text: '福祉国家について？', options: [{ value: 'keynesian', label: '自動安定化装置として景気変動を緩和する不可欠な制度' }, { value: 'classical', label: '過度な福祉は労働意欲を低下させ財政負担を高める' }, { value: 'institutional', label: '機会不平等を縮小し社会安全網を提供するために必要' }, { value: 'behavioral', label: '福祉プログラムの設計が実際の行動変化の鍵' }] },
    { id: 'q11', text: '国家債務についての立場は？', options: [{ value: 'keynesian', label: '不況期には借金をしてでも景気を刺激すべき' }, { value: 'classical', label: '長期的に均衡財政を維持してこそ経済は健全になる' }, { value: 'austrian', label: '国家債務は将来世代に税負担を転嫁する行為だ' }, { value: 'institutional', label: '債務の用途と構造が債務規模と同様に重要' }] },
    { id: 'q12', text: '技術進歩と雇用代替について？', options: [{ value: 'classical', label: '長期的に新産業と雇用が生まれ均衡を取り戻す' }, { value: 'keynesian', label: '短期的に失業が発生するため再教育・福祉支援が必要' }, { value: 'behavioral', label: '転換期に人々は合理的選択ができないので政策設計が必要' }, { value: 'institutional', label: '技術進歩の恩恵を分配するための制度改革が必要' }] },
  ],
  fr: [
    { id: 'q1', text: 'Lors d\'une récession, quel doit être le rôle du gouvernement ?', options: [{ value: 'keynesian', label: 'Augmenter les dépenses et stimuler l\'économie activement' }, { value: 'classical', label: 'Minimiser l\'intervention et laisser les marchés se corriger' }, { value: 'austrian', label: 'L\'intervention du gouvernement aggrave les problèmes ; se retirer' }, { value: 'institutional', label: 'Réformer les institutions pour résoudre les problèmes structurels' }] },
    { id: 'q2', text: 'Comment les gens prennent-ils des décisions économiques ?', options: [{ value: 'classical', label: 'Rationnellement si suffisamment informés' }, { value: 'behavioral', label: 'Souvent irrationnellement à cause de biais psychologiques' }, { value: 'institutional', label: 'Fortement contraints par les institutions et les normes sociales' }, { value: 'keynesian', label: 'Réduisent la consommation/investissement en raison de l\'incertitude' }] },
    { id: 'q3', text: 'Comment résoudre les inégalités de revenus ?', options: [{ value: 'keynesian', label: 'Impôts progressifs et dépenses sociales pour redistribuer' }, { value: 'classical', label: 'Les marchés libres et la croissance réduisent les inégalités à long terme' }, { value: 'behavioral', label: 'Politiques de nudge pour encourager l\'épargne des bas revenus' }, { value: 'institutional', label: 'Résoudre les inégalités institutionnelles dans l\'éducation et les opportunités' }] },
    { id: 'q4', text: 'Sur le rôle des banques centrales ?', options: [{ value: 'keynesian', label: 'La politique monétaire doit maintenir l\'emploi et gérer l\'économie' }, { value: 'classical', label: 'La stabilité des prix et des règles prévisibles de masse monétaire sont clés' }, { value: 'austrian', label: 'Les banques centrales causent la distorsion des cycles économiques' }, { value: 'behavioral', label: 'Gérer les attentes du public est la fonction principale' }] },
    { id: 'q5', text: 'Votre position sur le libre-échange ?', options: [{ value: 'classical', label: 'Le libre-échange profite à tous grâce à l\'avantage comparatif' }, { value: 'keynesian', label: 'Certaines protections à court terme peuvent être nécessaires' }, { value: 'institutional', label: 'Les nations développées ont des avantages structurels ; protection parfois nécessaire' }, { value: 'austrian', label: 'Le commerce doit être entièrement libre ; les tarifs nuisent à tous' }] },
    { id: 'q6', text: 'Sur l\'environnement et l\'économie ?', options: [{ value: 'institutional', label: 'Les marchés échouent ici ; de fortes réglementations environnementales sont nécessaires' }, { value: 'behavioral', label: 'Taxe carbone + nudges pour changer les comportements' }, { value: 'classical', label: 'Les signaux de prix comme les taxes carbone internalisent les externalités' }, { value: 'austrian', label: 'Des droits de propriété clairs permettent aux marchés de résoudre les problèmes environnementaux' }] },
    { id: 'q7', text: 'Sur la hausse du salaire minimum ?', options: [{ value: 'keynesian', label: 'Stimule la demande globale et peut avoir un impact positif' }, { value: 'classical', label: 'Réduit l\'emploi et peut nuire aux travailleurs à faibles revenus' }, { value: 'behavioral', label: 'Les effets varient ; il faut analyser les modèles de comportement des entreprises' }, { value: 'institutional', label: 'Nécessaire pour corriger les déséquilibres de pouvoir dans le marché du travail' }] },
    { id: 'q8', text: 'Sur les monopoles d\'entreprise ?', options: [{ value: 'classical', label: 'L\'entrée sur le marché dissoudra les monopoles à long terme' }, { value: 'keynesian', label: 'Les monopoles créent inefficacité et inégalité ; réglementation nécessaire' }, { value: 'institutional', label: 'Les monopoles proviennent de privilèges institutionnels ; réforme réglementaire nécessaire' }, { value: 'austrian', label: 'La réglementation gouvernementale crée des monopoles ; réduire les régulations' }] },
    { id: 'q9', text: 'Sur les modèles de prévision économique ?', options: [{ value: 'classical', label: 'Les modèles mathématiques peuvent prédire rationnellement le comportement économique' }, { value: 'behavioral', label: 'L\'irrationalité humaine limite les modèles conventionnels' }, { value: 'austrian', label: 'Les économies sont trop complexes pour des prédictions centralisées' }, { value: 'institutional', label: 'Les modèles sans contexte historique et institutionnel sont sans sens' }] },
    { id: 'q10', text: 'Sur l\'État providence ?', options: [{ value: 'keynesian', label: 'Essentiel comme stabilisateur automatique réduisant la volatilité économique' }, { value: 'classical', label: 'Une aide sociale excessive réduit les incitations au travail' }, { value: 'institutional', label: 'Nécessaire pour réduire les inégalités et fournir des filets de sécurité' }, { value: 'behavioral', label: 'La conception des programmes sociaux est clé pour un vrai changement comportemental' }] },
    { id: 'q11', text: 'Sur la dette nationale ?', options: [{ value: 'keynesian', label: 'En récession, l\'emprunt est justifié pour stimuler l\'économie' }, { value: 'classical', label: 'L\'équilibre budgétaire à long terme maintient une économie saine' }, { value: 'austrian', label: 'La dette nationale transfère les charges fiscales aux générations futures' }, { value: 'institutional', label: 'L\'utilisation et la structure de la dette sont aussi importantes que sa taille' }] },
    { id: 'q12', text: 'Sur la technologie remplaçant les emplois ?', options: [{ value: 'classical', label: 'De nouvelles industries et emplois émergent, restaurant l\'équilibre' }, { value: 'keynesian', label: 'Le chômage à court terme nécessite requalification et aide sociale' }, { value: 'behavioral', label: 'Les gens ne font pas toujours des choix rationnels en transition' }, { value: 'institutional', label: 'Réforme institutionnelle nécessaire pour distribuer les avantages technologiques' }] },
  ],
  es: [
    { id: 'q1', text: '¿Cuándo llega una recesión, qué debe hacer el gobierno?', options: [{ value: 'keynesian', label: 'Aumentar el gasto y estimular activamente la economía' }, { value: 'classical', label: 'Minimizar la intervención y dejar que los mercados se corrijan' }, { value: 'austrian', label: 'La intervención gubernamental empeora los problemas; retirarse' }, { value: 'institutional', label: 'Reformar instituciones para abordar problemas estructurales' }] },
    { id: 'q2', text: '¿Cómo toma la gente decisiones económicas?', options: [{ value: 'classical', label: 'Racionalmente, dada información suficiente' }, { value: 'behavioral', label: 'A menudo irracionalmente por sesgos psicológicos y emociones' }, { value: 'institutional', label: 'Fuertemente limitada por instituciones y normas sociales' }, { value: 'keynesian', label: 'Reducen consumo/inversión por incertidumbre futura' }] },
    { id: 'q3', text: '¿Cómo abordar la desigualdad de ingresos?', options: [{ value: 'keynesian', label: 'Impuestos progresivos y mayor gasto social para redistribuir' }, { value: 'classical', label: 'Mercados libres y crecimiento reducen la desigualdad a largo plazo' }, { value: 'behavioral', label: 'Políticas de nudge para fomentar el ahorro de grupos de bajos ingresos' }, { value: 'institutional', label: 'Abordar desigualdades institucionales en educación y oportunidades' }] },
    { id: 'q4', text: '¿Sobre el papel de los bancos centrales?', options: [{ value: 'keynesian', label: 'La política monetaria debe mantener el empleo y gestionar la economía' }, { value: 'classical', label: 'La estabilidad de precios y reglas predecibles de oferta monetaria son clave' }, { value: 'austrian', label: 'Los bancos centrales distorsionan los ciclos económicos' }, { value: 'behavioral', label: 'Gestionar las expectativas públicas es la función central' }] },
    { id: 'q5', text: '¿Tu posición sobre el libre comercio?', options: [{ value: 'classical', label: 'El libre comercio beneficia a todos mediante ventaja comparativa' }, { value: 'keynesian', label: 'Alguna protección a corto plazo puede ser necesaria para empleos' }, { value: 'institutional', label: 'Las naciones desarrolladas tienen ventajas estructurales; protección necesaria a veces' }, { value: 'austrian', label: 'El comercio debe ser completamente libre; los aranceles dañan a todos' }] },
    { id: 'q6', text: '¿Sobre el medio ambiente y la economía?', options: [{ value: 'institutional', label: 'Los mercados fallan aquí; se necesitan fuertes regulaciones ambientales' }, { value: 'behavioral', label: 'Impuestos al carbono + nudges para cambiar comportamientos' }, { value: 'classical', label: 'Señales de precio como impuestos al carbono internalizan externalidades' }, { value: 'austrian', label: 'Derechos de propiedad claros permiten a los mercados resolver problemas ambientales' }] },
    { id: 'q7', text: '¿Sobre aumentar el salario mínimo?', options: [{ value: 'keynesian', label: 'Impulsa la demanda agregada y puede tener impacto positivo' }, { value: 'classical', label: 'Reduce el empleo y puede perjudicar a trabajadores de bajos ingresos' }, { value: 'behavioral', label: 'Los efectos varían; hay que analizar los patrones de comportamiento empresarial' }, { value: 'institutional', label: 'Necesario para corregir desequilibrios de poder en el mercado laboral' }] },
    { id: 'q8', text: '¿Sobre los monopolios corporativos?', options: [{ value: 'classical', label: 'La entrada al mercado disolverá los monopolios a largo plazo' }, { value: 'keynesian', label: 'Los monopolios crean ineficiencia y desigualdad; regulación necesaria' }, { value: 'institutional', label: 'Los monopolios provienen de privilegios institucionales; reforma regulatoria necesaria' }, { value: 'austrian', label: 'La regulación gubernamental crea monopolios; reducir regulaciones' }] },
    { id: 'q9', text: '¿Sobre los modelos de previsión económica?', options: [{ value: 'classical', label: 'Los modelos matemáticos pueden predecir racionalmente el comportamiento económico' }, { value: 'behavioral', label: 'La irracionalidad humana limita los modelos convencionales' }, { value: 'austrian', label: 'Las economías son demasiado complejas para predicciones centralizadas' }, { value: 'institutional', label: 'Los modelos sin contexto histórico e institucional carecen de sentido' }] },
    { id: 'q10', text: '¿Sobre el estado de bienestar?', options: [{ value: 'keynesian', label: 'Esencial como estabilizador automático que reduce la volatilidad económica' }, { value: 'classical', label: 'El bienestar excesivo reduce los incentivos laborales' }, { value: 'institutional', label: 'Necesario para reducir la desigualdad y proporcionar redes de seguridad' }, { value: 'behavioral', label: 'El diseño de programas de bienestar es clave para cambios de comportamiento reales' }] },
    { id: 'q11', text: '¿Tu posición sobre la deuda nacional?', options: [{ value: 'keynesian', label: 'En recesión, el endeudamiento está justificado para estimular la economía' }, { value: 'classical', label: 'Los presupuestos equilibrados a largo plazo mantienen la economía sana' }, { value: 'austrian', label: 'La deuda nacional transfiere cargas fiscales a las generaciones futuras' }, { value: 'institutional', label: 'El uso y la estructura de la deuda son tan importantes como su tamaño' }] },
    { id: 'q12', text: '¿Sobre la tecnología reemplazando empleos?', options: [{ value: 'classical', label: 'Surgen nuevas industrias y empleos, restaurando el equilibrio' }, { value: 'keynesian', label: 'El desempleo a corto plazo requiere reentrenamiento y apoyo social' }, { value: 'behavioral', label: 'La gente no siempre hace elecciones racionales en transiciones' }, { value: 'institutional', label: 'Se necesita reforma institucional para distribuir los beneficios tecnológicos' }] },
  ],
  zh: [
    { id: 'q1', text: '经济衰退时，政府的角色是什么？', options: [{ value: 'keynesian', label: '增加支出并积极刺激经济' }, { value: 'classical', label: '最小化干预，让市场自我修正' }, { value: 'austrian', label: '政府干预本身会使问题恶化；退出' }, { value: 'institutional', label: '改革制度和法规以解决结构性问题' }] },
    { id: 'q2', text: '人们如何做出经济决策？', options: [{ value: 'classical', label: '在有足够信息的情况下理性判断' }, { value: 'behavioral', label: '因心理偏见和情绪而常常做出非理性选择' }, { value: 'institutional', label: '受制度和社会规范的大力约束' }, { value: 'keynesian', label: '因未来不确定性而减少消费和投资' }] },
    { id: 'q3', text: '如何解决收入不平等问题？', options: [{ value: 'keynesian', label: '累进税和扩大福利支出进行再分配' }, { value: 'classical', label: '自由市场和增长从长远看能缩小不平等' }, { value: 'behavioral', label: '通过推动政策鼓励低收入群体储蓄和投资' }, { value: 'institutional', label: '解决教育和机会方面的制度性不平等' }] },
    { id: 'q4', text: '关于中央银行的角色？', options: [{ value: 'keynesian', label: '货币政策应维持就业并管理经济' }, { value: 'classical', label: '价格稳定和可预测的货币供应规则是关键' }, { value: 'austrian', label: '中央银行是扭曲经济周期的原因' }, { value: 'behavioral', label: '管理公众预期是核心功能' }] },
    { id: 'q5', text: '你对自由贸易的立场？', options: [{ value: 'classical', label: '自由贸易通过比较优势让所有人受益' }, { value: 'keynesian', label: '短期内可能需要一些保护措施来保护就业' }, { value: 'institutional', label: '发达国家有结构性优势；有时需要保护' }, { value: 'austrian', label: '贸易应完全自由；关税对所有人有害' }] },
    { id: 'q6', text: '关于环境和经济的关系？', options: [{ value: 'institutional', label: '市场在这里失败；需要强有力的环境法规' }, { value: 'behavioral', label: '碳税+推动措施改变行为' }, { value: 'classical', label: '碳税等价格信号可以内部化外部性' }, { value: 'austrian', label: '清晰的产权让市场能解决环境问题' }] },
    { id: 'q7', text: '关于提高最低工资？', options: [{ value: 'keynesian', label: '促进总需求，可能有积极的经济影响' }, { value: 'classical', label: '减少就业，可能伤害低收入工人' }, { value: 'behavioral', label: '效果因情况而异；需要分析企业行为模式' }, { value: 'institutional', label: '有必要纠正劳动力市场的权力不平衡' }] },
    { id: 'q8', text: '关于企业垄断？', options: [{ value: 'classical', label: '市场进入从长远看将打破垄断' }, { value: 'keynesian', label: '垄断制造低效和不平等；需要监管' }, { value: 'institutional', label: '垄断源于制度性特权；需要监管改革' }, { value: 'austrian', label: '政府法规创造垄断；减少法规' }] },
    { id: 'q9', text: '关于经济预测模型？', options: [{ value: 'classical', label: '数学模型可以合理预测经济行为' }, { value: 'behavioral', label: '人类的非理性限制了传统模型' }, { value: 'austrian', label: '经济太复杂，无法进行集中预测' }, { value: 'institutional', label: '没有历史和制度背景的模型没有意义' }] },
    { id: 'q10', text: '关于福利国家？', options: [{ value: 'keynesian', label: '作为自动稳定器必不可少，减少经济波动' }, { value: 'classical', label: '过度福利降低劳动积极性，增加财政负担' }, { value: 'institutional', label: '有必要减少不平等，提供社会安全网' }, { value: 'behavioral', label: '福利计划的设计是真正行为改变的关键' }] },
    { id: 'q11', text: '你对国家债务的立场？', options: [{ value: 'keynesian', label: '在衰退期间，借贷是刺激经济的正当之举' }, { value: 'classical', label: '长期平衡预算使经济保持健康' }, { value: 'austrian', label: '国家债务将税收负担转移给未来世代' }, { value: 'institutional', label: '债务的用途和结构与规模一样重要' }] },
    { id: 'q12', text: '关于技术取代工作？', options: [{ value: 'classical', label: '长期内新产业和就业机会出现，恢复平衡' }, { value: 'keynesian', label: '短期失业需要再培训和社会支持' }, { value: 'behavioral', label: '过渡期人们并不总是做出理性选择；需要政策设计' }, { value: 'institutional', label: '需要制度改革来分配技术进步的好处' }] },
  ],
}

const SCHOOL_COLORS: Record<School, string> = {
  keynesian: 'bg-blue-50 border-blue-300 text-blue-800',
  classical: 'bg-amber-50 border-amber-300 text-amber-800',
  behavioral: 'bg-purple-50 border-purple-300 text-purple-800',
  austrian: 'bg-orange-50 border-orange-300 text-orange-800',
  institutional: 'bg-green-50 border-green-300 text-green-800',
}

interface Props { locale: Locale }

export default function EconomicsSchoolTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const questions = QUESTIONS[locale] ?? QUESTIONS.en
  const [current, setCurrent] = useState(-1)
  const [scores, setScores] = useState<Record<School, number>>({ keynesian: 0, classical: 0, behavioral: 0, austrian: 0, institutional: 0 })
  const [result, setResult] = useState<School | null>(null)

  const choose = (val: School) => {
    const next = { ...scores, [val]: scores[val] + 1 }
    setScores(next)
    if (current + 1 < questions.length) {
      setCurrent(current + 1)
    } else {
      const top = (Object.keys(next) as School[]).reduce((a, b) => next[a] >= next[b] ? a : b)
      setResult(top)
    }
  }

  const restart = () => { setCurrent(-1); setScores({ keynesian: 0, classical: 0, behavioral: 0, austrian: 0, institutional: 0 }); setResult(null) }

  const isKo = locale === 'ko'
  const schoolData = result ? (isKo ? SCHOOLS[result].ko : SCHOOLS[result].en) : null

  if (current === -1) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">📊</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md mx-auto text-sm">
          {(Object.keys(SCHOOLS) as School[]).map(k => {
            const s = isKo ? SCHOOLS[k].ko : SCHOOLS[k].en
            return <div key={k} className={`rounded-lg border px-3 py-1.5 text-center ${SCHOOL_COLORS[k]}`}>{s.emoji} {s.name}</div>
          })}
        </div>
        <button onClick={() => setCurrent(0)} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">{l.start}</button>
      </div>
    )
  }

  if (result && schoolData) {
    const s = isKo ? SCHOOLS[result].ko : SCHOOLS[result].en
    const sorted = (Object.keys(scores) as School[]).sort((a, b) => scores[b] - scores[a])
    return (
      <div className="space-y-5 py-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">{l.yourSchool}</p>
          <div className={`inline-block text-2xl font-black px-5 py-2 rounded-2xl border ${SCHOOL_COLORS[result]}`}>{s.emoji} {s.name}</div>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">{s.desc}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{l.traitLabel}</h3>
          <div className="flex flex-wrap gap-2">{s.traits.map(t => <span key={t} className="px-3 py-1 bg-secondary rounded-full text-sm">{t}</span>)}</div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{l.keyThinkers}</h3>
          <div className="flex flex-wrap gap-2">{s.thinkers.map(t => <span key={t} className="px-3 py-1 border rounded-full text-sm">{t}</span>)}</div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{l.policyLabel}</h3>
          <p className="text-sm text-muted-foreground">{s.policy}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{locale === 'ko' ? '성향 분포' : 'Tendency Distribution'}</h3>
          <div className="space-y-1.5">
            {sorted.map(k => {
              const sn = isKo ? SCHOOLS[k].ko : SCHOOLS[k].en
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-xs w-24 truncate">{sn.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(scores[k] / questions.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{scores[k]}</span>
                </div>
              )
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground border-t pt-3">{l.note}</p>
        <button onClick={restart} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <p className="text-base font-semibold py-3 text-center">{q.text}</p>
      <div className="space-y-3">
        {q.options.map(opt => (
          <button key={opt.value} onClick={() => choose(opt.value)}
            className="w-full text-left px-5 py-4 rounded-xl border hover:bg-accent hover:border-primary transition-all text-sm">
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
