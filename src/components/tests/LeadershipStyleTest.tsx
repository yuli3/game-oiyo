import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type LeaderType =
  | "transformational"
  | "servant"
  | "democratic"
  | "coaching"
  | "directive";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: LeaderType;
  }[];
}

const questions: Question[] = [
  {
    ko: "팀의 사기가 낮을 때 리더로서 당신은?",
    en: "As a leader, when team morale is low, you:",
    ja: "チームの士気が低いとき、リーダーとして？",
    options: [
      { ko: "팀의 더 큰 사명과 비전을 다시 상기시키며 열정을 불러일으킨다", en: "Reinspire by reminding the team of the bigger mission and vision", ja: "より大きな使命とビジョンを再確認させ、情熱を呼び起こす", type: "transformational" },
      { ko: "팀원 한 명 한 명의 어려움을 경청하고 내가 도울 수 있는 것을 찾는다", en: "Listen to each team member's struggles and find ways to help", ja: "一人ひとりの困難に耳を傾け、助けられることを探す", type: "servant" },
      { ko: "팀원들과 함께 문제를 논의하고 해결책을 협력해서 만든다", en: "Discuss the problem with the team and collaboratively build a solution", ja: "チームと問題を話し合い、協力して解決策を作る", type: "democratic" },
      { ko: "개인적으로 대화하며 각자의 목표와 성장 기회를 연결시킨다", en: "Have individual conversations linking personal goals with growth opportunities", ja: "個別に話し合い、個人の目標と成長機会を結びつける", type: "coaching" },
      { ko: "명확한 단기 목표를 제시하고 즉각적인 실행을 독려한다", en: "Set clear short-term goals and encourage immediate action", ja: "明確な短期目標を示し、即時の実行を促す", type: "directive" },
    ],
  },
  {
    ko: "중요한 결정을 내릴 때 당신의 접근 방식은?",
    en: "Your approach to making important decisions:",
    ja: "重要な決定を下すとき、あなたのアプローチは？",
    options: [
      { ko: "장기적 비전과 변화 방향에 맞는 선택을 우선시한다", en: "Prioritize choices aligned with long-term vision and transformation", ja: "長期的なビジョンと変化の方向に合った選択を優先する", type: "transformational" },
      { ko: "팀원들의 필요와 영향을 가장 먼저 고려한다", en: "Consider team members' needs and impact first", ja: "チームメンバーのニーズと影響を最初に考慮する", type: "servant" },
      { ko: "관련 팀원들의 의견을 수렴하고 함께 결정한다", en: "Gather input from relevant team members and decide together", ja: "関係するチームメンバーの意見を集め、一緒に決める", type: "democratic" },
      { ko: "팀원들이 각자의 판단으로 결정할 수 있도록 코칭한다", en: "Coach team members to make decisions with their own judgment", ja: "チームメンバーが自分の判断で決定できるようコーチングする", type: "coaching" },
      { ko: "빠른 결정을 내리고 실행 지침을 명확히 전달한다", en: "Make swift decisions and communicate clear execution guidelines", ja: "迅速に決定し、実行ガイドラインを明確に伝える", type: "directive" },
    ],
  },
  {
    ko: "팀원이 실수를 했을 때 당신은?",
    en: "When a team member makes a mistake, you:",
    ja: "チームメンバーがミスをしたとき、あなたは？",
    options: [
      { ko: "실수를 성장의 기회로 보고 팀 전체의 학습으로 연결한다", en: "See it as a growth opportunity and connect it to team-wide learning", ja: "ミスを成長の機会と見て、チーム全体の学びにつなげる", type: "transformational" },
      { ko: "어떤 상황인지 이해하고 그 사람이 회복할 수 있도록 지원한다", en: "Understand the situation and support them in recovering", ja: "状況を理解し、その人が立ち直れるよう支援する", type: "servant" },
      { ko: "팀과 함께 원인을 분석하고 재발 방지책을 논의한다", en: "Analyze the cause with the team and discuss prevention", ja: "チームと原因を分析し、再発防止策を話し合う", type: "democratic" },
      { ko: "왜 그런 결정을 했는지 묻고 다음엔 어떻게 다르게 할지 생각하게 한다", en: "Ask why they decided that and help them think about doing it differently next time", ja: "なぜそう決断したか聞き、次はどう違うかを考えさせる", type: "coaching" },
      { ko: "명확한 피드백과 개선 기준을 제시한다", en: "Provide clear feedback and improvement standards", ja: "明確なフィードバックと改善基準を示す", type: "directive" },
    ],
  },
  {
    ko: "새 프로젝트를 시작할 때 당신은?",
    en: "When starting a new project, you:",
    ja: "新しいプロジェクトを始めるとき、あなたは？",
    options: [
      { ko: "프로젝트가 조직의 큰 변화에 어떻게 기여하는지 설명하고 영감을 준다", en: "Inspire by explaining how the project contributes to bigger organizational change", ja: "プロジェクトが組織の大きな変化にどう貢献するかを説明し、インスピレーションを与える", type: "transformational" },
      { ko: "각 팀원의 강점과 선호에 맞게 역할을 배분한다", en: "Assign roles based on each member's strengths and preferences", ja: "各メンバーの強みと好みに合わせて役割を割り当てる", type: "servant" },
      { ko: "팀원들이 프로젝트 계획 수립에 적극적으로 참여하도록 한다", en: "Actively involve team members in project planning", ja: "チームメンバーがプロジェクト計画に積極的に参加できるようにする", type: "democratic" },
      { ko: "각 팀원이 개인적으로 이 프로젝트에서 무엇을 배울지 명확히 한다", en: "Clarify what each member will personally learn from this project", ja: "各メンバーがこのプロジェクトで個人的に何を学ぶかを明確にする", type: "coaching" },
      { ko: "목표, 마감일, 책임자를 명확히 설정하고 진행을 모니터링한다", en: "Clearly set goals, deadlines, and accountabilities and monitor progress", ja: "目標、締め切り、担当者を明確に設定し、進捗を監視する", type: "directive" },
    ],
  },
  {
    ko: "성과가 좋은 팀원에게 보상을 줄 때?",
    en: "When rewarding a high-performing team member:",
    ja: "成果の良いチームメンバーに報酬を与えるとき？",
    options: [
      { ko: "더 큰 도전과 의미 있는 임무를 맡긴다", en: "Assign them bigger challenges and more meaningful missions", ja: "より大きな挑戦と意味のある任務を与える", type: "transformational" },
      { ko: "그들의 기여가 팀에 얼마나 중요했는지 진심으로 표현한다", en: "Sincerely express how their contribution mattered to the team", ja: "彼らの貢献がチームにとってどれほど重要だったかを心から表現する", type: "servant" },
      { ko: "공개적으로 팀 앞에서 인정하고 그 공로를 함께 축하한다", en: "Recognize them publicly before the team and celebrate together", ja: "チームの前で公に認め、功績を一緒に祝う", type: "democratic" },
      { ko: "다음 성장 단계로 나아갈 수 있는 기회나 멘토링을 제공한다", en: "Provide opportunities or mentoring to advance to the next growth stage", ja: "次の成長段階に進む機会やメンタリングを提供する", type: "coaching" },
      { ko: "구체적인 성과 수치와 명확한 보상 기준을 공개한다", en: "Publicize specific performance metrics and clear reward criteria", ja: "具体的な成果数値と明確な報酬基準を公開する", type: "directive" },
    ],
  },
  {
    ko: "팀의 성과가 기대에 미치지 못할 때 당신의 반응은?",
    en: "When team performance falls short of expectations, you:",
    ja: "チームの成果が期待に届かないとき、あなたの反応は？",
    options: [
      { ko: "팀이 왜 존재하는지, 우리가 만들 변화를 다시 이야기하며 재점화한다", en: "Re-ignite by revisiting why the team exists and the change you're creating", ja: "チームがなぜ存在するか、作り出す変化を再び語りかけ、再点火する", type: "transformational" },
      { ko: "팀원들의 어려움과 장애물이 무엇인지 찾아 제거해준다", en: "Find and remove the obstacles and difficulties team members face", ja: "チームメンバーが直面する困難と障害を見つけて取り除く", type: "servant" },
      { ko: "팀과 솔직하게 현 상황을 공유하고 함께 개선 방안을 찾는다", en: "Honestly share the current situation with the team and find solutions together", ja: "チームと現状を率直に共有し、一緒に改善策を探す", type: "democratic" },
      { ko: "개인 면담을 통해 각자의 동기와 잠재력을 재발견하도록 돕는다", en: "Help each person rediscover their motivation and potential through individual meetings", ja: "個別面談を通じて各自の動機と潜在力を再発見できるよう助ける", type: "coaching" },
      { ko: "구체적인 KPI와 개선 계획을 수립하고 엄격하게 추적한다", en: "Establish specific KPIs and improvement plans and track them rigorously", ja: "具体的なKPIと改善計画を策定し、厳格に追跡する", type: "directive" },
    ],
  },
  {
    ko: "리더십에서 당신이 가장 중요하게 여기는 것은?",
    en: "What you value most in leadership:",
    ja: "リーダーシップで最も重視することは？",
    options: [
      { ko: "사람들에게 영감을 주고 불가능해 보이는 것을 가능하게 만드는 것", en: "Inspiring people and making what seems impossible possible", ja: "人々にインスピレーションを与え、不可能に見えることを可能にすること", type: "transformational" },
      { ko: "팀원들이 번성할 수 있도록 섬기고 장애물을 제거하는 것", en: "Serving team members and removing obstacles so they can thrive", ja: "チームメンバーが成長できるよう仕えて障害を取り除くこと", type: "servant" },
      { ko: "모든 구성원의 목소리가 들리고 반영되는 환경 만들기", en: "Creating an environment where all members' voices are heard and reflected", ja: "すべてのメンバーの声が聞かれ反映される環境の構築", type: "democratic" },
      { ko: "사람들이 자신의 잠재력을 최대한 발휘하도록 도움을 주는 것", en: "Helping people maximize their potential", ja: "人々が潜在力を最大限に発揮できるよう助けること", type: "coaching" },
      { ko: "목표를 달성하고 결과를 만드는 것", en: "Achieving goals and delivering results", ja: "目標を達成し結果を出すこと", type: "directive" },
    ],
  },
];

const results: Record<
  LeaderType,
  {
    emoji: string;
    color: string;
    famous: string;
    ko: { title: string; description: string; strength: string; challenge: string; tip: string };
    en: { title: string; description: string; strength: string; challenge: string; tip: string };
    ja: { title: string; description: string; strength: string; challenge: string; tip: string };
  }
> = {
  transformational: {
    emoji: "🚀",
    color: "#8b5cf6",
    famous: "Steve Jobs, Nelson Mandela",
    ko: {
      title: "변혁적 리더",
      description: "당신은 현상 유지에 만족하지 않고 사람들에게 영감을 주어 변화를 만드는 리더입니다. 비전을 제시하고 팀원들을 변화의 여정에 동참시킵니다. 사람들이 스스로 생각하지 못했던 가능성을 발견하게 합니다.",
      strength: "강력한 비전 제시, 팀 동기 극대화, 혁신 문화 조성, 영향력 있는 소통",
      challenge: "세부 실행에 약할 수 있음, 감정적 영향력에 의존할 수 있음, 팀원들이 지칠 수 있음",
      tip: "비전을 실행 가능한 단계로 세분화하는 파트너(분석적 COO 등)와 협력하면 최고의 성과를 냅니다.",
    },
    en: {
      title: "Transformational Leader",
      description: "You're a leader who inspires people to create change rather than being satisfied with the status quo. You present vision and bring team members along on the journey of transformation, helping them discover possibilities they hadn't imagined.",
      strength: "Powerful vision, maximizing team motivation, fostering innovation culture, impactful communication",
      challenge: "May be weak in detailed execution, may rely on emotional influence, team can burn out",
      tip: "Partnering with someone who can break vision into executable steps (like an analytical COO) produces the best outcomes.",
    },
    ja: {
      title: "変革型リーダー",
      description: "現状維持に満足せず、人々に変化を起こすよう鼓舞するリーダーです。ビジョンを示し、チームメンバーを変革の旅に参加させます。人々が自分では考えられなかった可能性を発見させます。",
      strength: "強力なビジョンの提示、チームモチベーションの最大化、革新文化の醸成、影響力あるコミュニケーション",
      challenge: "詳細な実行が弱い可能性、感情的影響力に依存する可能性、チームが燃え尽きる可能性",
      tip: "ビジョンを実行可能なステップに細分化できるパートナー（分析的COOなど）と協力すると最高の成果が出ます。",
    },
  },
  servant: {
    emoji: "🌱",
    color: "#10b981",
    famous: "Satya Nadella, Mother Teresa",
    ko: {
      title: "서번트 리더",
      description: "당신은 리더는 팀을 섬기는 사람이라는 철학을 가지고 있습니다. 팀원들의 성장과 복지를 최우선으로 두며, 장애물을 제거하고 각자가 최선을 다할 수 있는 환경을 만듭니다.",
      strength: "높은 팀 신뢰도, 강한 충성심 형성, 번아웃 예방, 지속 가능한 팀 문화",
      challenge: "단기 성과 압박 시 어려울 수 있음, 경계 설정이 힘들 수 있음, 팀에 지나치게 의존할 수 있음",
      tip: "섬기는 리더십과 기대치 명확화를 균형 잡으세요. 좋은 것을 해주면서도 성과 기준은 명확히 유지해야 합니다.",
    },
    en: {
      title: "Servant Leader",
      description: "You hold the philosophy that a leader is someone who serves the team. You prioritize team members' growth and wellbeing, removing obstacles and creating conditions for everyone to do their best.",
      strength: "High team trust, building strong loyalty, burnout prevention, sustainable team culture",
      challenge: "Difficult under short-term performance pressure, may struggle to set boundaries, may over-rely on the team",
      tip: "Balance servant leadership with clear expectations. Helping others while maintaining clear performance standards is essential.",
    },
    ja: {
      title: "サーバントリーダー",
      description: "リーダーはチームに仕える人だという哲学を持っています。チームメンバーの成長と福祉を最優先にし、障害を取り除き、誰もが最善を尽くせる環境を作ります。",
      strength: "高いチームの信頼、強い忠誠心の形成、燃え尽き防止、持続可能なチーム文化",
      challenge: "短期成果プレッシャー時に難しい可能性、境界設定が難しい可能性、チームに過度に依存する可能性",
      tip: "サーバントリーダーシップと期待の明確化のバランスをとりましょう。助けながらも成果基準は明確に維持することが大切です。",
    },
  },
  democratic: {
    emoji: "🗳️",
    color: "#3b82f6",
    famous: "Abraham Lincoln, Angela Merkel",
    ko: {
      title: "민주적 리더",
      description: "당신은 팀원들의 의견과 참여를 매우 중시합니다. 공동의 결정 과정을 통해 팀의 헌신을 이끌어내고, 다양한 관점을 통합하여 더 나은 결과를 만듭니다.",
      strength: "높은 팀 참여도, 창의적 해결책, 강한 팀 결속력, 책임감 공유",
      challenge: "결정 속도가 느릴 수 있음, 합의가 어려운 상황에서 혼란, 강한 방향성이 필요할 때 취약",
      tip: "컨설팅(의견 수렴)과 알림(일방 결정)을 구분하는 기준을 팀과 미리 공유하세요. 모든 결정을 민주적으로 할 필요는 없습니다.",
    },
    en: {
      title: "Democratic Leader",
      description: "You greatly value team members' input and participation. Through shared decision-making, you drive team commitment and integrate diverse perspectives to produce better outcomes.",
      strength: "High team engagement, creative solutions, strong team cohesion, shared accountability",
      challenge: "Slow decision-making, confusion when consensus is hard, vulnerable when strong direction is needed",
      tip: "Pre-share with the team the criteria distinguishing 'consulting' (gathering input) from 'informing' (unilateral decision). Not every decision needs to be democratic.",
    },
    ja: {
      title: "民主的リーダー",
      description: "チームメンバーの意見と参加を非常に重視します。共同の意思決定プロセスを通じてチームのコミットメントを引き出し、多様な視点を統合してより良い結果を生み出します。",
      strength: "高いチーム参加度、創造的な解決策、強いチームの結束力、責任感の共有",
      challenge: "意思決定が遅い可能性、合意が難しい状況での混乱、強い方向性が必要なとき脆弱",
      tip: "「相談」（意見収集）と「通知」（一方的決定）を区別する基準をチームと事前に共有しましょう。すべての決定を民主的にする必要はありません。",
    },
  },
  coaching: {
    emoji: "🎯",
    color: "#f59e0b",
    famous: "Bill Campbell, John Wooden",
    ko: {
      title: "코칭형 리더",
      description: "당신은 팀원들의 장기적 성장과 잠재력 발현에 집중합니다. 답을 주기보다 질문을 통해 팀원들이 스스로 답을 찾도록 돕습니다. 개인의 발전이 조직의 성과로 이어진다고 믿습니다.",
      strength: "팀원 역량 개발, 높은 자율성과 동기, 장기적 팀 성장, 강한 신뢰 관계",
      challenge: "단기 성과 달성이 급할 때 비효율, 코칭에 반응하지 않는 팀원에 어려움, 시간이 많이 필요",
      tip: "코칭이 적합하지 않은 상황(위기, 신입)을 인식하고 상황에 따라 지시적 스타일로 전환하는 유연성을 갖추세요.",
    },
    en: {
      title: "Coaching Leader",
      description: "You focus on team members' long-term growth and potential realization. Rather than giving answers, you help team members find answers through questions. You believe individual development leads to organizational performance.",
      strength: "Team competency development, high autonomy and motivation, long-term team growth, strong trust relationships",
      challenge: "Inefficient when short-term results are urgent, difficult with team members who don't respond to coaching, time-intensive",
      tip: "Recognize when coaching isn't appropriate (crisis, new hires) and develop flexibility to shift to a directive style as needed.",
    },
    ja: {
      title: "コーチング型リーダー",
      description: "チームメンバーの長期的成長と潜在力の発揮に集中します。答えを与えるのではなく、質問を通じてチームメンバーが自ら答えを見つけるよう助けます。個人の発展が組織の成果につながると信じています。",
      strength: "チームメンバーの能力開発、高い自律性とモチベーション、長期的なチーム成長、強い信頼関係",
      challenge: "短期成果が急がれるとき非効率、コーチングに反応しないメンバーへの対応困難、時間が多く必要",
      tip: "コーチングが適切でない状況（危機、新入り）を認識し、状況に応じて指示的スタイルに切り替える柔軟性を持ちましょう。",
    },
  },
  directive: {
    emoji: "⚡",
    color: "#ef4444",
    famous: "Steve Ballmer, Jack Welch",
    ko: {
      title: "지시적 리더",
      description: "당신은 명확한 목표, 기대치, 실행 방향을 제시하는 데 탁월합니다. 결과 중심적이며 빠른 의사결정과 실행력을 중시합니다. 위기 상황이나 방향이 필요한 팀에서 특히 효과적입니다.",
      strength: "빠른 결정과 실행, 명확한 기대치, 위기 대응력, 결과 달성",
      challenge: "팀원 창의성과 자율성 저해, 높은 의존도 형성, 장기적 팀 사기에 영향",
      tip: "팀원의 경험과 역량이 높아질수록 더 많은 자율성을 부여하는 '상황적 리더십'을 연습해보세요.",
    },
    en: {
      title: "Directive Leader",
      description: "You excel at providing clear goals, expectations, and execution direction. You're results-oriented and value quick decision-making and execution. Especially effective in crisis situations or with teams that need direction.",
      strength: "Fast decisions and execution, clear expectations, crisis response capability, results achievement",
      challenge: "Inhibits team creativity and autonomy, creates high dependency, affects long-term team morale",
      tip: "Practice 'situational leadership' — granting more autonomy as team members' experience and capability grow.",
    },
    ja: {
      title: "指示的リーダー",
      description: "明確な目標、期待値、実行方向を提示することに優れています。結果重視で、迅速な意思決定と実行力を重視します。危機的状況や方向性が必要なチームで特に効果的です。",
      strength: "迅速な決定と実行、明確な期待値、危機対応力、結果達成",
      challenge: "チームメンバーの創造性と自律性の阻害、高い依存度の形成、長期的なチーム士気への影響",
      tip: "チームメンバーの経験と能力が高まるほど、より多くの自律性を与える「状況対応型リーダーシップ」を練習しましょう。",
    },
  },
};

const t = {
  ko: {
    title: "리더십 스타일 테스트",
    subtitle: "나는 어떤 리더인가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 리더십 스타일",
    strength: "강점",
    challenge: "도전",
    tip: "리더십 팁",
    famousLabel: "유명한 사례",
    scoreLabel: "스타일별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Leadership Style Test",
    subtitle: "What Kind of Leader Are You?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Leadership Style",
    strength: "Strengths",
    challenge: "Challenges",
    tip: "Leadership Tip",
    famousLabel: "Famous Examples",
    scoreLabel: "Score by Style",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "リーダーシップスタイルテスト",
    subtitle: "あなたはどんなリーダーですか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたのリーダーシップスタイル",
    strength: "強み",
    challenge: "課題",
    tip: "リーダーシップのヒント",
    famousLabel: "有名な例",
    scoreLabel: "スタイル別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function LeadershipStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<LeaderType, number>>({
    transformational: 0,
    servant: 0,
    democratic: 0,
    coaching: 0,
    directive: 0,
  });
  const [result, setResult] = useState<LeaderType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ls = p.get("ls") as LeaderType | null;
    if (ls && results[ls]) setResult(ls);
  }, []);

  function pick(type: LeaderType) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const answeredCount = Object.values(next).reduce((a, b) => a + b, 0);

    if (answeredCount < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answeredCount), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as LeaderType[]).reduce((a, b) =>
        next[a] >= next[b] ? a : b
      );
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("ls", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setScores({ transformational: 0, servant: 0, democratic: 0, coaching: 0, directive: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("ls");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: tx.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const typeLabels: Record<LeaderType, string> = {
    transformational: locale === "ko" ? "변혁형" : locale === "ja" ? "変革型" : "Transform.",
    servant: locale === "ko" ? "서번트" : locale === "ja" ? "サーバント" : "Servant",
    democratic: locale === "ko" ? "민주형" : locale === "ja" ? "民主型" : "Democratic",
    coaching: locale === "ko" ? "코칭형" : locale === "ja" ? "コーチング" : "Coaching",
    directive: locale === "ko" ? "지시형" : locale === "ja" ? "指示型" : "Directive",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const radarData = (Object.keys(scores) as LeaderType[]).map((k) => ({
      subject: typeLabels[k],
      score: scores[k],
      fullMark: questions.length,
    }));

    return (
      <div className="space-y-6">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: `linear-gradient(135deg, ${r.color}18, ${r.color}08)`, border: `1px solid ${r.color}30` }}
        >
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-1 text-sm" style={{ color: r.color }}>{tx.famousLabel}: {r.famous}</p>
          <p className="mt-3 text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.strength}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.strength}</p>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600">⚠️ {tx.challenge}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.challenge}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${r.color}10` }}>
            <h3 className="font-semibold" style={{ color: r.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar
                dataKey="score"
                stroke={r.color}
                fill={r.color}
                fillOpacity={0.35}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {tx.restart}
          </button>
          <button
            onClick={share}
            className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition"
            style={{ backgroundColor: r.color }}
          >
            {copied ? tx.copied : tx.share}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{tx.title}</h1>
        <p className="mt-1 text-gray-500">{tx.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-300"
            style={{ width: `${(idx / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-purple-300 hover:bg-purple-50"
            >
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
