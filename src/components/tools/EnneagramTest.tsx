import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props { locale?: Locale; }

type EnneaType = 1|2|3|4|5|6|7|8|9;
type Lang = "ko"|"en"|"ja";

// ─── 27 Questions (3 per type) ────────────────────────────────────────────────
interface Question { id: number; type: EnneaType; ko: string; en: string; ja: string; }

const QUESTIONS: Question[] = [
  // Type 1 — Reformer
  { id:1,  type:1, ko:"잘못된 것을 보면 고쳐야 한다는 강한 충동을 느낀다.", en:"I feel a strong urge to correct things when I see something wrong.", ja:"間違いを見ると直さなければならないという強い衝動を感じる。" },
  { id:2,  type:1, ko:"내 기준과 원칙에 어긋나는 행동을 하면 죄책감이 생긴다.", en:"I feel guilty when I act against my standards or principles.", ja:"自分の基準や原則に反する行動をすると罪悪感が生じる。" },
  { id:3,  type:1, ko:"일이 제대로 되지 않으면 직접 고치고 싶은 마음이 강하다.", en:"I strongly want to fix things myself when they're not done properly.", ja:"物事がきちんとできていないと自分で直したい気持ちが強い。" },
  // Type 2 — Helper
  { id:4,  type:2, ko:"주변 사람들이 나를 필요로 할 때 가장 뿌듯함을 느낀다.", en:"I feel most fulfilled when the people around me need me.", ja:"周りの人が私を必要としているとき、最も充実感を覚える。" },
  { id:5,  type:2, ko:"다른 사람의 감정을 읽고 그들이 필요한 것을 먼저 제공하는 편이다.", en:"I tend to read others' emotions and provide what they need before being asked.", ja:"他の人の感情を読み取り、求められる前にニーズを満たす傾向がある。" },
  { id:6,  type:2, ko:"타인을 돕는 것이 즐겁고, 도움받지 못하면 섭섭한 마음이 든다.", en:"I enjoy helping others and feel hurt when my help isn't appreciated.", ja:"他人を助けることが楽しく、助けが認められないと寂しく感じる。" },
  // Type 3 — Achiever
  { id:7,  type:3, ko:"목표를 달성하고 성과를 인정받는 것이 매우 중요하다.", en:"Achieving goals and having my accomplishments recognized is very important to me.", ja:"目標を達成し、成果を認められることがとても重要だ。" },
  { id:8,  type:3, ko:"효율적으로 일을 처리하고 성공적인 이미지를 유지하려고 노력한다.", en:"I strive to handle work efficiently and maintain a successful image.", ja:"効率的に仕事をこなし、成功したイメージを保つよう努力する。" },
  { id:9,  type:3, ko:"남들에게 능력 있고 성공한 사람으로 보이는 것이 중요하다.", en:"It's important to me to be seen as capable and successful by others.", ja:"他人に能力があり成功した人として見られることが重要だ。" },
  // Type 4 — Individualist
  { id:10, type:4, ko:"나는 다른 사람들과 근본적으로 다른 특별한 존재라는 느낌이 있다.", en:"I feel I am fundamentally different and special compared to others.", ja:"自分は他の人たちと根本的に異なる特別な存在だという感覚がある。" },
  { id:11, type:4, ko:"내 감정과 내면 세계를 깊이 탐구하고 표현하는 것이 중요하다.", en:"Deeply exploring and expressing my emotions and inner world is important to me.", ja:"自分の感情や内面の世界を深く探求し表現することが重要だ。" },
  { id:12, type:4, ko:"때로는 뭔가 중요한 것을 놓치고 있다는 허전함이나 그리움을 느낀다.", en:"I sometimes feel a sense of emptiness or longing, as if I'm missing something important.", ja:"時々、何か重要なものを見逃しているような空虚感や憧れを感じる。" },
  // Type 5 — Investigator
  { id:13, type:5, ko:"깊이 있는 지식과 이해를 추구하며 혼자 생각할 시간이 필요하다.", en:"I seek deep knowledge and understanding and need time alone to think.", ja:"深い知識と理解を追求し、一人で考える時間が必要だ。" },
  { id:14, type:5, ko:"감정보다 분석과 논리를 통해 세상을 이해하는 것을 선호한다.", en:"I prefer to understand the world through analysis and logic rather than emotion.", ja:"感情よりも分析と論理を通じて世界を理解することを好む。" },
  { id:15, type:5, ko:"에너지를 아끼고 혼자만의 공간과 시간을 지키는 것이 중요하다.", en:"Conserving energy and protecting my own space and time is important.", ja:"エネルギーを節約し、自分だけの空間と時間を守ることが重要だ。" },
  // Type 6 — Loyalist
  { id:16, type:6, ko:"미래에 일어날 수 있는 위험과 문제를 미리 생각하는 편이다.", en:"I tend to think ahead about potential dangers and problems that might occur.", ja:"将来起こり得る危険や問題をあらかじめ考える傾向がある。" },
  { id:17, type:6, ko:"믿을 수 있는 사람과 안정적인 환경이 가장 중요한 가치이다.", en:"Trustworthy people and a stable environment are my most important values.", ja:"信頼できる人と安定した環境が最も重要な価値だ。" },
  { id:18, type:6, ko:"권위나 규칙에 대해 의존하면서도 동시에 의심하는 양가적 감정이 있다.", en:"I have ambivalent feelings — relying on authority and rules while also questioning them.", ja:"権威やルールに依存しながら、同時に疑うという両価的な感情がある。" },
  // Type 7 — Enthusiast
  { id:19, type:7, ko:"새로운 경험과 가능성을 탐구하는 것이 삶의 원동력이다.", en:"Exploring new experiences and possibilities is the driving force of my life.", ja:"新しい経験と可能性を探求することが人生の原動力だ。" },
  { id:20, type:7, ko:"고통이나 부정적인 감정을 빨리 떨쳐내고 긍정적인 것에 집중하는 편이다.", en:"I tend to quickly shake off pain and negative emotions and focus on positive things.", ja:"痛みや否定的な感情を素早く振り払い、前向きなことに集中する傾向がある。" },
  { id:21, type:7, ko:"한 가지에 얽매이기보다 다양한 옵션을 열어두는 것을 선호한다.", en:"I prefer keeping multiple options open rather than being tied to one thing.", ja:"一つのことに縛られるより、さまざまな選択肢を開いておくことを好む。" },
  // Type 8 — Challenger
  { id:22, type:8, ko:"내 삶을 스스로 통제하고, 약자를 보호하며 불의에 맞서는 것이 중요하다.", en:"Controlling my own life, protecting the weak, and standing up to injustice is important.", ja:"自分の人生を自分でコントロールし、弱者を守り、不正に立ち向かうことが重要だ。" },
  { id:23, type:8, ko:"직접적이고 솔직하게 말하며 강한 존재감을 가지고 있다.", en:"I speak directly and honestly and have a strong presence.", ja:"直接的かつ率直に話し、強い存在感を持っている。" },
  { id:24, type:8, ko:"누군가에게 통제당하거나 약점을 드러내는 것을 극도로 싫어한다.", en:"I intensely dislike being controlled by someone or showing my vulnerabilities.", ja:"誰かにコントロールされたり、弱点をさらすことを極度に嫌う。" },
  // Type 9 — Peacemaker
  { id:25, type:9, ko:"갈등을 피하고 주변의 조화와 평화를 유지하는 것을 중요시한다.", en:"I value avoiding conflict and maintaining harmony and peace around me.", ja:"対立を避け、周囲の調和と平和を保つことを重要視する。" },
  { id:26, type:9, ko:"여러 관점을 자연스럽게 이해하며, 중재자 역할을 잘 한다.", en:"I naturally understand multiple perspectives and am good at mediating.", ja:"複数の視点を自然に理解し、仲裁者の役割を上手くこなす。" },
  { id:27, type:9, ko:"내 의견을 강하게 주장하기보다 상대방의 의견을 따르는 편이다.", en:"I tend to go along with others' opinions rather than strongly asserting my own.", ja:"自分の意見を強く主張するより、相手の意見に従う傾向がある。" },
];

// ─── Type Descriptions ────────────────────────────────────────────────────────
interface TypeInfo {
  name: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  coreDesire: Record<Lang, string>;
  coreFear: Record<Lang, string>;
  strengths: Record<Lang, string[]>;
  growth: Record<Lang, string>;
  emoji: string;
  color: string;
  wing: [EnneaType, EnneaType];
  integration: EnneaType;
  disintegration: EnneaType;
}

const TYPE_INFO: Record<EnneaType, TypeInfo> = {
  1: {
    emoji:"⚖️", color:"bg-amber-50 border-amber-300",
    wing:[9,2], integration:7, disintegration:4,
    name:{ ko:"완벽주의자 (개혁가)", en:"The Reformer", ja:"完璧主義者（改革家）" },
    subtitle:{ ko:"올바름을 추구하는 원칙주의자", en:"The principled, idealistic type", ja:"正しさを追求する原則主義者" },
    coreDesire:{ ko:"선하고 올바른 사람이 되는 것", en:"To be good and right", ja:"善くて正しい人になること" },
    coreFear:{ ko:"나쁘거나 부도덕한 사람이 되는 것", en:"Being bad, corrupt, or evil", ja:"悪い、不道徳な人になること" },
    strengths:{ ko:["강한 책임감과 성실함","높은 도덕적 기준","개선을 향한 끊임없는 노력"], en:["Strong sense of responsibility","High moral standards","Constant effort toward improvement"], ja:["強い責任感と誠実さ","高い道徳的基準","改善への絶え間ない努力"] },
    growth:{ ko:"완벽함보다 있는 그대로를 수용하는 여유를 기르세요.", en:"Cultivate acceptance of imperfection and ease up on yourself and others.", ja:"完璧さよりも、あるがままを受け入れる余裕を育てましょう。" },
  },
  2: {
    emoji:"🤗", color:"bg-rose-50 border-rose-300",
    wing:[1,3], integration:4, disintegration:8,
    name:{ ko:"조력자 (돕는 사람)", en:"The Helper", ja:"助力者（助ける人）" },
    subtitle:{ ko:"사랑과 배려로 세상을 채우는 사람", en:"The caring, interpersonal type", ja:"愛と思いやりで世界を満たす人" },
    coreDesire:{ ko:"사랑받고 소중한 존재가 되는 것", en:"To be loved and wanted", ja:"愛され、大切な存在になること" },
    coreFear:{ ko:"사랑받지 못하고 필요 없는 존재가 되는 것", en:"Being unwanted and unloved", ja:"愛されず、必要とされない存在になること" },
    strengths:{ ko:["깊은 공감 능력","타인의 필요를 직관적으로 파악","따뜻한 대인 관계"], en:["Deep empathy","Intuitively sensing others' needs","Warm interpersonal relationships"], ja:["深い共感能力","他人のニーズを直感的に把握","温かい対人関係"] },
    growth:{ ko:"자신의 필요와 욕구를 먼저 인정하고 스스로를 돌보세요.", en:"Acknowledge your own needs first and take care of yourself.", ja:"自分のニーズと欲求をまず認め、自分自身を大切にしましょう。" },
  },
  3: {
    emoji:"🏆", color:"bg-yellow-50 border-yellow-300",
    wing:[2,4], integration:6, disintegration:9,
    name:{ ko:"성취자 (동기부여가)", en:"The Achiever", ja:"成就者（動機付け役）" },
    subtitle:{ ko:"목표를 향해 끊임없이 나아가는 성공 지향형", en:"The adaptable, success-oriented type", ja:"目標に向かって絶え間なく進む成功志向型" },
    coreDesire:{ ko:"가치 있고 성공한 사람이 되는 것", en:"To be valuable and successful", ja:"価値のある成功した人になること" },
    coreFear:{ ko:"가치 없고 실패한 사람이 되는 것", en:"Being worthless and failing", ja:"価値がなく、失敗した人になること" },
    strengths:{ ko:["강한 목표 지향성","효율적인 실행력","영감을 주는 리더십"], en:["Strong goal orientation","Efficient execution","Inspirational leadership"], ja:["強い目標志向性","効率的な実行力","インスピレーションを与えるリーダーシップ"] },
    growth:{ ko:"성과가 아닌 자신의 본질적인 가치를 인정하는 연습을 하세요.", en:"Practice recognizing your intrinsic worth beyond achievements.", ja:"成果ではなく、自分の本質的な価値を認める練習をしましょう。" },
  },
  4: {
    emoji:"🎨", color:"bg-purple-50 border-purple-300",
    wing:[3,5], integration:1, disintegration:2,
    name:{ ko:"개인주의자 (낭만주의자)", en:"The Individualist", ja:"個人主義者（ロマンチスト）" },
    subtitle:{ ko:"깊은 감성과 독창성으로 자신을 표현하는 사람", en:"The sensitive, withdrawn type", ja:"深い感性と独自性で自己を表現する人" },
    coreDesire:{ ko:"자신의 정체성을 찾고 고유한 존재로 살아가는 것", en:"To find myself and create an identity", ja:"自分のアイデンティティを見つけ、独自の存在として生きること" },
    coreFear:{ ko:"정체성 없이 평범하고 의미 없는 존재가 되는 것", en:"Having no identity or significance", ja:"アイデンティティなく、平凡で無意味な存在になること" },
    strengths:{ ko:["깊은 감수성과 직관","독창적인 예술적 표현","진정성 있는 자기 탐구"], en:["Deep sensitivity and intuition","Original artistic expression","Authentic self-exploration"], ja:["深い感受性と直感","独創的な芸術的表現","真摯な自己探求"] },
    growth:{ ko:"지금 이 순간의 아름다움을 발견하고, 현재에 감사하는 연습을 하세요.", en:"Discover beauty in the present moment and practice gratitude for now.", ja:"今この瞬間の美しさを発見し、現在に感謝する練習をしましょう。" },
  },
  5: {
    emoji:"🔬", color:"bg-blue-50 border-blue-300",
    wing:[4,6], integration:8, disintegration:7,
    name:{ ko:"탐구자 (관찰자)", en:"The Investigator", ja:"探求者（観察者）" },
    subtitle:{ ko:"지식을 통해 세상을 이해하려는 사람", en:"The intense, cerebral type", ja:"知識を通じて世界を理解しようとする人" },
    coreDesire:{ ko:"유능하고 지식이 풍부한 사람이 되는 것", en:"To be competent and knowledgeable", ja:"有能で知識豊かな人になること" },
    coreFear:{ ko:"쓸모없고 무능한 사람이 되는 것", en:"Being useless, incompetent, helpless", ja:"役に立たず、無能な人になること" },
    strengths:{ ko:["깊은 분석력과 관찰력","독립적이고 체계적인 사고","전문성 추구"], en:["Deep analytical and observational skills","Independent systematic thinking","Pursuit of expertise"], ja:["深い分析力と観察力","独立した体系的な思考","専門性の追求"] },
    growth:{ ko:"생각에서 나와 몸으로 세상을 경험하고, 타인과 연결되는 용기를 내세요.", en:"Step out of your mind and experience the world physically; be courageous in connecting with others.", ja:"思考から抜け出し、体で世界を経験し、他者とつながる勇気を持ちましょう。" },
  },
  6: {
    emoji:"🛡️", color:"bg-green-50 border-green-300",
    wing:[5,7], integration:9, disintegration:3,
    name:{ ko:"충성가 (회의론자)", en:"The Loyalist", ja:"忠実な人（懐疑論者）" },
    subtitle:{ ko:"안전과 신뢰를 통해 헌신하는 사람", en:"The committed, security-oriented type", ja:"安全と信頼を通じて献身する人" },
    coreDesire:{ ko:"안전하고 지지받는 환경을 갖는 것", en:"To have security and support", ja:"安全で支えられる環境を持つこと" },
    coreFear:{ ko:"도움 없이 혼자 남겨지는 것", en:"Being without support and guidance", ja:"助けなしに一人残されること" },
    strengths:{ ko:["깊은 헌신과 충성심","문제 예측과 대비 능력","믿을 수 있는 신뢰성"], en:["Deep commitment and loyalty","Ability to anticipate and prepare for problems","Trustworthy reliability"], ja:["深い献身と忠誠心","問題の予測と備え能力","信頼できる誠実さ"] },
    growth:{ ko:"두려움 대신 내면의 용기를 믿고, 자신의 직관을 신뢰하는 연습을 하세요.", en:"Trust your inner courage instead of fear, and practice believing in your own intuition.", ja:"恐れの代わりに内なる勇気を信じ、自分の直感を信頼する練習をしましょう。" },
  },
  7: {
    emoji:"✨", color:"bg-orange-50 border-orange-300",
    wing:[6,8], integration:5, disintegration:1,
    name:{ ko:"낙천주의자 (열정가)", en:"The Enthusiast", ja:"楽観主義者（熱意家）" },
    subtitle:{ ko:"세상의 가능성을 탐험하는 자유로운 영혼", en:"The busy, fun-loving type", ja:"世界の可能性を探求する自由な魂" },
    coreDesire:{ ko:"행복하고 만족스러운 삶을 사는 것", en:"To be happy and satisfied", ja:"幸せで満足のいく人生を送ること" },
    coreFear:{ ko:"결핍과 고통, 제한에 갇히는 것", en:"Being deprived, in pain, or trapped by limitation", ja:"欠乏、苦痛、制限に閉じ込められること" },
    strengths:{ ko:["끝없는 낙관성과 열정","다양한 재능과 창의성","즉흥적인 문제 해결 능력"], en:["Endless optimism and enthusiasm","Diverse talents and creativity","Spontaneous problem-solving"], ja:["尽きない楽観性と熱意","多様な才能と創造性","即興的な問題解決能力"] },
    growth:{ ko:"고통과 어려움도 삶의 일부임을 받아들이고, 깊이와 의미를 추구해보세요.", en:"Accept that pain is part of life and seek depth and meaning.", ja:"痛みや困難も人生の一部であることを受け入れ、深みと意味を追求してみましょう。" },
  },
  8: {
    emoji:"🦁", color:"bg-red-50 border-red-300",
    wing:[7,9], integration:2, disintegration:5,
    name:{ ko:"도전자 (보호자)", en:"The Challenger", ja:"挑戦者（保護者）" },
    subtitle:{ ko:"힘과 결단력으로 세상을 이끄는 강한 사람", en:"The powerful, dominating type", ja:"力と決断力で世界を導く強い人" },
    coreDesire:{ ko:"자신의 삶을 통제하고 취약해지지 않는 것", en:"To be self-reliant and in control", ja:"自分の人生をコントロールし、脆弱にならないこと" },
    coreFear:{ ko:"다른 사람에게 통제당하고 취약해지는 것", en:"Being controlled by others and becoming vulnerable", ja:"他人にコントロールされ、脆弱になること" },
    strengths:{ ko:["강력한 리더십과 결단력","타인 보호 능력","불의에 맞서는 용기"], en:["Powerful leadership and decisiveness","Ability to protect others","Courage to stand up to injustice"], ja:["強力なリーダーシップと決断力","他者を守る能力","不正に立ち向かう勇気"] },
    growth:{ ko:"취약함도 강함의 일부임을 인정하고, 타인에게 마음을 열어보세요.", en:"Accept that vulnerability is part of strength and open your heart to others.", ja:"脆弱さも強さの一部であることを認め、他者に心を開いてみましょう。" },
  },
  9: {
    emoji:"☮️", color:"bg-teal-50 border-teal-300",
    wing:[8,1], integration:3, disintegration:6,
    name:{ ko:"평화주의자 (조정자)", en:"The Peacemaker", ja:"平和主義者（調停者）" },
    subtitle:{ ko:"조화와 평화를 통해 세상을 연결하는 사람", en:"The easygoing, self-effacing type", ja:"調和と平和を通じて世界をつなぐ人" },
    coreDesire:{ ko:"내면과 외면의 평화와 조화를 유지하는 것", en:"To maintain inner and outer peace", ja:"内外の平和と調和を維持すること" },
    coreFear:{ ko:"갈등과 단절로 평화를 잃는 것", en:"Loss of connection, fragmentation, conflict", ja:"対立と断絶で平和を失うこと" },
    strengths:{ ko:["뛰어난 중재 및 조율 능력","다양한 관점 수용","안정적인 존재감"], en:["Excellent mediation and coordination","Acceptance of diverse perspectives","Stable, calming presence"], ja:["優れた仲裁・調整能力","多様な視点の受容","安定した存在感"] },
    growth:{ ko:"자신의 의견과 욕구를 표현하는 것이 관계를 풍성하게 한다는 것을 기억하세요.", en:"Remember that expressing your own opinions and desires enriches relationships.", ja:"自分の意見や欲求を表現することが関係を豊かにすることを覚えておきましょう。" },
  },
};

// ─── i18n UI ──────────────────────────────────────────────────────────────────
const UI = {
  ko: {
    title:"에니어그램 성격 유형 테스트",
    subtitle:"27문항으로 나의 에니어그램 유형을 찾아보세요",
    instruction:"각 문항이 나와 얼마나 일치하는지 1~5점으로 평가하세요.",
    scale:["전혀 그렇지 않다","그렇지 않다","보통이다","그렇다","매우 그렇다"],
    progress:(c:number,t:number)=>`${c} / ${t} 문항`,
    resultTitle:"당신의 에니어그램 유형은",
    typeLabel:"유형",
    wingLabel:"날개",
    coreDesireLabel:"핵심 욕구",
    coreFearLabel:"핵심 두려움",
    strengthsLabel:"강점",
    growthLabel:"성장 포인트",
    integrationLabel:"통합 방향",
    disintegrationLabel:"분열 방향",
    retryBtn:"다시 테스트",
    nextBtn:"다음",
    prevBtn:"이전",
    submitBtn:"결과 보기",
  },
  en: {
    title:"Enneagram Personality Test",
    subtitle:"Discover your Enneagram type with 27 questions",
    instruction:"Rate how much each statement applies to you from 1 to 5.",
    scale:["Not at all","Slightly","Moderately","Mostly","Very much"],
    progress:(c:number,t:number)=>`${c} / ${t}`,
    resultTitle:"Your Enneagram Type Is",
    typeLabel:"Type",
    wingLabel:"Wing",
    coreDesireLabel:"Core Desire",
    coreFearLabel:"Core Fear",
    strengthsLabel:"Strengths",
    growthLabel:"Growth Point",
    integrationLabel:"Integration Direction",
    disintegrationLabel:"Disintegration Direction",
    retryBtn:"Retake Test",
    nextBtn:"Next",
    prevBtn:"Back",
    submitBtn:"See Results",
  },
  ja: {
    title:"エニアグラム性格タイプテスト",
    subtitle:"27問でエニアグラムタイプを見つけましょう",
    instruction:"各文章がどれほど自分に当てはまるか1〜5点で評価してください。",
    scale:["全くそうでない","そうでない","普通","そう思う","非常にそう思う"],
    progress:(c:number,t:number)=>`${c} / ${t} 問`,
    resultTitle:"あなたのエニアグラムタイプは",
    typeLabel:"タイプ",
    wingLabel:"ウィング",
    coreDesireLabel:"核心の欲求",
    coreFearLabel:"核心の恐れ",
    strengthsLabel:"強み",
    growthLabel:"成長ポイント",
    integrationLabel:"統合の方向",
    disintegrationLabel:"分裂の方向",
    retryBtn:"もう一度",
    nextBtn:"次へ",
    prevBtn:"前へ",
    submitBtn:"結果を見る",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function EnneagramTest({ locale = "ko" }: Props) {
  const lang: Lang = locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";
  const ui = UI[lang];

  const [answers, setAnswers] = useState<Record<number,number>>({});
  const [step, setStep] = useState(0); // 0=intro, 1-27=questions, 28=results
  const [result, setResult] = useState<EnneaType|null>(null);

  const total = QUESTIONS.length;
  const current = step - 1; // 0-indexed question

  function answer(score: number) {
    const q = QUESTIONS[current];
    setAnswers(prev => ({ ...prev, [q.id]: score }));
    if (step < total) setStep(s => s + 1);
    else calcResult({ ...answers, [q.id]: score });
  }

  function calcResult(ans: Record<number, number>) {
    const scores: Record<EnneaType, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    for (const q of QUESTIONS) {
      scores[q.type] += (ans[q.id] ?? 3);
    }
    const top = (Object.entries(scores) as [string, number][])
      .sort((a,b) => b[1]-a[1])[0];
    setResult(Number(top[0]) as EnneaType);
    setStep(total + 1);
  }

  function handleSubmit() {
    const ans = { ...answers };
    // Fill unanswered with 3
    for (const q of QUESTIONS) {
      if (!(q.id in ans)) ans[q.id] = 3;
    }
    calcResult(ans);
  }

  function reset() { setAnswers({}); setStep(0); setResult(null); }

  const progress = Math.round((Object.keys(answers).length / total) * 100);

  // Intro
  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto p-4 text-center">
        <div className="text-5xl mb-3">🔮</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{ui.title}</h2>
        <p className="text-gray-500 mb-4 text-sm">{ui.subtitle}</p>
        <p className="text-xs text-gray-400 mb-6">{ui.instruction}</p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <span className="font-bold text-purple-600 w-4">{n}점</span>
              <span>{ui.scale[n-1]}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(1)}
          className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          {ui.nextBtn} →
        </button>
      </div>
    );
  }

  // Results
  if (result && step > total) {
    const info = TYPE_INFO[result];
    const wingNums = info.wing;
    return (
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <div className={`rounded-2xl border-2 p-6 text-center ${info.color}`}>
          <div className="text-5xl mb-2">{info.emoji}</div>
          <p className="text-sm text-gray-500 mb-1">{ui.resultTitle}</p>
          <h2 className="text-2xl font-black text-gray-800">
            {ui.typeLabel} {result} — {info.name[lang]}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{info.subtitle[lang]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-pink-600 mb-1">💛 {ui.coreDesireLabel}</p>
            <p className="text-sm text-gray-700">{info.coreDesire[lang]}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">⚡ {ui.coreFearLabel}</p>
            <p className="text-sm text-gray-700">{info.coreFear[lang]}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-600 mb-2">✅ {ui.strengthsLabel}</p>
          {info.strengths[lang].map((s,i) => (
            <p key={i} className="text-sm text-gray-700 mb-1">• {s}</p>
          ))}
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-1">🌱 {ui.growthLabel}</p>
          <p className="text-sm text-indigo-800 italic">"{info.growth[lang]}"</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-purple-50 rounded-xl p-3">
            <p className="font-semibold text-purple-600 mb-1">{ui.wingLabel}</p>
            <p className="text-gray-700">{wingNums[0]}w{result} / {result}w{wingNums[1]}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="font-semibold text-green-600 mb-1">{ui.integrationLabel}</p>
            <p className="text-gray-700">→ {ui.typeLabel} {info.integration}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3">
            <p className="font-semibold text-orange-600 mb-1">{ui.disintegrationLabel}</p>
            <p className="text-gray-700">→ {ui.typeLabel} {info.disintegration}</p>
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          {ui.retryBtn}
        </button>
      </div>
    );
  }

  // Questions
  const q = QUESTIONS[current];
  const qText = lang === "ja" ? q.ja : lang === "en" ? q.en : q.ko;
  const answered = answers[q.id];

  return (
    <div className="max-w-xl mx-auto p-4">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{ui.progress(step, total)}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 min-h-[100px] flex items-center">
        <p className="text-base text-gray-800 leading-relaxed">{qText}</p>
      </div>

      {/* Scale buttons */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => answer(n)}
            className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all
              ${answered === n
                ? "bg-purple-600 border-purple-600 text-white scale-105 shadow-sm"
                : "bg-white border-gray-100 hover:border-purple-300 hover:bg-purple-50 text-gray-600"
              }`}
          >
            <span className="text-lg font-bold">{n}</span>
            <span className="text-[9px] mt-0.5 leading-tight text-center px-0.5 hidden sm:block">
              {ui.scale[n-1].split(" ")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Nav */}
      <div className="flex gap-2">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← {ui.prevBtn}
          </button>
        )}
        {step === total && (
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold hover:shadow-md transition-all"
          >
            {ui.submitBtn} →
          </button>
        )}
      </div>

      {/* Scale legend */}
      <div className="mt-3 flex justify-between text-[10px] text-gray-400 px-1">
        <span>1 = {ui.scale[0]}</span>
        <span>5 = {ui.scale[4]}</span>
      </div>
    </div>
  );
}
