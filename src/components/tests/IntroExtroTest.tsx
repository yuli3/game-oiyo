import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";
interface Props { locale?: string; }

type Spectrum = "deep_introvert" | "introvert" | "ambivert" | "extrovert" | "deep_extrovert";

interface Question { ko: string; en: string; ja: string; }

// Higher score = more extroverted
const questions: Question[] = [
  { ko: "사람들과 오래 어울리고 나면 에너지가 충전되는 느낌이 든다.", en: "After spending time with people, I feel energized.", ja: "人々と長く交流した後、エネルギーが充電される感じがする。" },
  { ko: "나는 파티나 모임에서 새로운 사람들을 만나는 것을 즐긴다.", en: "I enjoy meeting new people at parties or gatherings.", ja: "パーティーや集まりで新しい人々に会うことを楽しむ。" },
  { ko: "혼자 있는 시간보다 사람들과 함께하는 시간을 더 선호한다.", en: "I prefer spending time with others over being alone.", ja: "一人でいる時間より人々と一緒にいる時間を好む。" },
  { ko: "처음 보는 사람에게 먼저 말을 거는 편이다.", en: "I tend to initiate conversations with people I've just met.", ja: "初対面の人に自分から話しかける方だ。" },
  { ko: "나는 여러 사람 앞에서 발표하거나 이야기하는 것이 불편하지 않다.", en: "I don't feel uncomfortable speaking or presenting in front of a group.", ja: "大勢の前でプレゼンや話をすることに不快を感じない。" },
  { ko: "일이나 공부를 할 때 배경음악이나 약간의 소음이 있는 환경을 선호한다.", en: "For work or study, I prefer environments with background music or some noise.", ja: "仕事や勉強では、BGMや少し騒音がある環境を好む。" },
  { ko: "생각을 글로 적기보다는 말로 먼저 표현하는 것이 더 자연스럽다.", en: "It feels more natural to express thoughts verbally first rather than in writing.", ja: "考えを文字に書くより、まず言葉で表現する方が自然だ。" },
  { ko: "여러 활동과 사람들 속에 있을 때 삶이 더 활기차고 의미 있다고 느낀다.", en: "Life feels more vibrant and meaningful when surrounded by many activities and people.", ja: "多くの活動と人々に囲まれているとき、人生がより活気があり意味深いと感じる。" },
  { ko: "나는 빠른 결정을 내리고 나중에 수정하는 방식을 선호한다.", en: "I prefer making quick decisions and adjusting later.", ja: "素早く決断して後で修正する方を好む。" },
  { ko: "새로운 상황이나 변화가 불안하기보다 자극적으로 느껴진다.", en: "New situations and change feel stimulating rather than anxiety-inducing.", ja: "新しい状況や変化が不安より刺激的に感じられる。" },
  { ko: "나는 깊이 있는 1:1 대화보다 활발한 그룹 대화를 더 즐긴다.", en: "I enjoy lively group conversations more than deep one-on-one talks.", ja: "深い1対1の会話より、活発なグループ会話をより楽しむ。" },
  { ko: "행동하면서 배우는 것이 먼저 계획하고 분석하는 것보다 더 편하다.", en: "Learning by doing feels more comfortable than planning and analyzing first.", ja: "行動しながら学ぶことが、まず計画し分析することより快適だ。" },
];

function getSpectrum(score: number): Spectrum {
  if (score <= 12) return "deep_introvert";
  if (score <= 22) return "introvert";
  if (score <= 32) return "ambivert";
  if (score <= 42) return "extrovert";
  return "deep_extrovert";
}

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Rarely", "Neutral", "Often", "Very much so"],
  ja: ["全くない", "ほとんどない", "普通", "よくある", "とてもそうだ"],
};

interface SpectrumData {
  label: Record<SupportedLocale, string>;
  emoji: string;
  color: string;
  description: Record<SupportedLocale, string>;
  strengths: Record<SupportedLocale, string[]>;
  recharge: Record<SupportedLocale, string>;
  work: Record<SupportedLocale, string>;
  affirmation: Record<SupportedLocale, string>;
}

const spectrumData: Record<Spectrum, SpectrumData> = {
  deep_introvert: {
    label: { ko: "깊은 내향인", en: "Deep Introvert", ja: "深い内向型" },
    emoji: "🌿",
    color: "#6366f1",
    description: {
      ko: "당신은 깊은 내향인으로, 혼자만의 시간에서 에너지를 회복하고 내면의 풍요로운 세계를 가집니다. 소수와 깊은 관계를 선호하며, 생각하고 관찰하는 것을 사랑합니다. 내향성은 성격의 결함이 아니라, 다르게 충전하는 방식입니다.",
      en: "You are a deep introvert who recharges in solitude and has a rich inner world. You prefer deep relationships with a few people and love to think and observe. Introversion is not a personality flaw — it's simply a different way of recharging.",
      ja: "あなたは深い内向型で、一人の時間でエネルギーを回復し、豊かな内面の世界を持ちます。少数との深い関係を好み、考えたり観察したりすることを愛します。内向性は性格の欠点ではなく、異なる充電方法です。",
    },
    strengths: {
      ko: ["깊은 사고와 분석 능력", "집중력과 독립적 작업 능력", "신중하고 의미 있는 소통", "창의적 아이디어와 글쓰기 능력"],
      en: ["Deep thinking and analytical ability", "Focus and independent work capacity", "Thoughtful and meaningful communication", "Creative ideas and writing ability"],
      ja: ["深い思考と分析能力", "集中力と独立した作業能力", "思慮深く意味のあるコミュニケーション", "創造的なアイデアと文章力"],
    },
    recharge: {
      ko: "혼자만의 시간, 독서, 자연 속 산책, 창작 활동, 깊은 1:1 대화",
      en: "Alone time, reading, walks in nature, creative activities, deep one-on-one conversations",
      ja: "一人の時間、読書、自然の中の散歩、創作活動、深い1対1の会話",
    },
    work: {
      ko: "집중이 필요한 창작, 연구, 분석, 글쓰기, 전략 수립 역할에서 빛납니다.",
      en: "You shine in roles requiring deep focus: creative work, research, analysis, writing, or strategic planning.",
      ja: "集中が必要な創作、研究、分析、文章執筆、戦略立案の役割で輝きます。",
    },
    affirmation: {
      ko: "나의 조용함은 깊이의 다른 이름입니다.",
      en: "My quietness is another name for depth.",
      ja: "私の静けさは深さの別名です。",
    },
  },
  introvert: {
    label: { ko: "내향인", en: "Introvert", ja: "内向型" },
    emoji: "🌙",
    color: "#8b5cf6",
    description: {
      ko: "당신은 내향인으로, 주로 혼자 있거나 소수와 함께할 때 에너지를 충전합니다. 사회적 상황을 즐길 수 있지만, 사람들과 많은 시간을 보내면 지칩니다. 생각을 행동보다 먼저 하는 경향이 있으며, 신중하고 관찰력이 뛰어납니다.",
      en: "You're an introvert who primarily recharges alone or with a small group. You can enjoy social situations but feel drained after much time with people. You tend to think before acting and are thoughtful and observant.",
      ja: "あなたは内向型で、主に一人または少数と一緒にいるときエネルギーを充電します。社会的な状況を楽しめますが、多くの時間を人々と過ごすと疲れます。行動より先に考える傾向があり、思慮深く観察力があります。",
    },
    strengths: {
      ko: ["관찰력과 세심한 배려", "계획적이고 신중한 의사결정", "깊이 있는 전문성 개발", "진정성 있는 관계 형성"],
      en: ["Observational skills and careful consideration", "Planned and thoughtful decision-making", "Developing deep expertise", "Forming genuine relationships"],
      ja: ["観察力と細やかな配慮", "計画的で慎重な意思決定", "深い専門性の発展", "誠実な関係の形成"],
    },
    recharge: {
      ko: "조용한 환경, 혼자만의 취미, 친한 친구와의 소규모 모임",
      en: "Quiet environments, solo hobbies, small gatherings with close friends",
      ja: "静かな環境、一人の趣味、親しい友人との小規模な集まり",
    },
    work: {
      ko: "연구, 프로그래밍, 상담, 글쓰기, 전략 분석 등 깊이 있는 전문 역할에 강합니다.",
      en: "Strong in deep professional roles: research, programming, counseling, writing, strategic analysis.",
      ja: "研究、プログラミング、カウンセリング、執筆、戦略分析などの深い専門的役割に強いです。",
    },
    affirmation: {
      ko: "나는 깊이 있게 생각하고 진심으로 연결됩니다.",
      en: "I think deeply and connect genuinely.",
      ja: "私は深く考え、心から繋がります。",
    },
  },
  ambivert: {
    label: { ko: "양향인 (앰비버트)", en: "Ambivert", ja: "両向型（アンビバート）" },
    emoji: "☀️",
    color: "#10b981",
    description: {
      ko: "당신은 내향과 외향의 중간인 양향인입니다. 상황에 따라 사교적으로 활발하게 참여하기도 하고, 조용히 혼자 충전하기도 합니다. 이 유연성은 다양한 상황에 적응하게 해주는 큰 강점입니다. 실제로 대부분의 사람들이 스펙트럼의 중간 어딘가에 위치합니다.",
      en: "You're an ambivert — in between introvert and extrovert. Depending on the situation, you can be socially active or recharge quietly alone. This flexibility is a major strength that lets you adapt to diverse situations. Most people actually fall somewhere in the middle of the spectrum.",
      ja: "あなたは内向型と外向型の中間の両向型です。状況によって社交的に活発に参加したり、静かに一人で充電したりします。この柔軟性は様々な状況に適応させる大きな強みです。実際、ほとんどの人がスペクトルの中間のどこかに位置しています。",
    },
    strengths: {
      ko: ["다양한 상황에 대한 높은 적응력", "내향인과 외향인 모두와 잘 소통", "에너지 관리를 상황에 맞게 조절 가능", "폭넓은 관계와 깊은 우정 모두 가능"],
      en: ["High adaptability to diverse situations", "Communicating well with both introverts and extroverts", "Adjusting energy management to the situation", "Capable of both broad connections and deep friendships"],
      ja: ["様々な状況への高い適応力", "内向型と外向型の両方とうまくコミュニケーション", "状況に合わせてエネルギー管理を調整できる", "幅広い関係と深い友情の両方が可能"],
    },
    recharge: {
      ko: "상황에 따라 다름 — 사람들과의 활발한 활동 후 혼자만의 시간으로 균형을 맞춤",
      en: "Depends on the situation — balancing with alone time after energetic social activity",
      ja: "状況によって異なる — 活発な社交活動後に一人の時間でバランスを取る",
    },
    work: {
      ko: "팀워크와 독립 작업을 모두 즐길 수 있어 다양한 역할에서 유연하게 활약합니다.",
      en: "Able to enjoy both teamwork and independent work, you flexibly excel in diverse roles.",
      ja: "チームワークと独立した作業の両方を楽しめるため、様々な役割で柔軟に活躍します。",
    },
    affirmation: {
      ko: "나는 사람과 혼자 모두를 온전히 즐길 수 있습니다.",
      en: "I can fully enjoy both people and solitude.",
      ja: "私は人々と一人の両方を完全に楽しめます。",
    },
  },
  extrovert: {
    label: { ko: "외향인", en: "Extrovert", ja: "外向型" },
    emoji: "🌟",
    color: "#f59e0b",
    description: {
      ko: "당신은 외향인으로, 사람들과의 상호작용에서 에너지를 얻습니다. 새로운 사람을 만나고, 아이디어를 즉흥적으로 나누고, 활동적인 환경에서 빛납니다. 혼자 있는 시간이 길어지면 에너지가 낮아질 수 있습니다.",
      en: "You're an extrovert who gains energy from interactions with people. You shine when meeting new people, sharing ideas spontaneously, and in active environments. Extended alone time may lower your energy.",
      ja: "あなたは外向型で、人々との交流からエネルギーを得ます。新しい人に会ったり、アイデアを即興で共有したり、活発な環境で輝きます。一人でいる時間が長くなるとエネルギーが低下することがあります。",
    },
    strengths: {
      ko: ["자신감 있는 소통과 설득력", "협업과 팀 빌딩 능력", "빠른 관계 형성과 네트워킹", "에너지와 열정으로 주변에 동기 부여"],
      en: ["Confident communication and persuasiveness", "Collaboration and team-building ability", "Quick relationship-building and networking", "Motivating others with energy and enthusiasm"],
      ja: ["自信あるコミュニケーションと説得力", "協業とチームビルディング能力", "素早い関係構築とネットワーキング", "エネルギーと熱意で周囲に動機付け"],
    },
    recharge: {
      ko: "활발한 사교 활동, 팀 스포츠, 파티, 새로운 경험, 그룹 프로젝트",
      en: "Active social activities, team sports, parties, new experiences, group projects",
      ja: "活発な社交活動、チームスポーツ、パーティー、新しい経験、グループプロジェクト",
    },
    work: {
      ko: "영업, 마케팅, 교육, 이벤트 기획, 팀 리더십 등 사람 중심의 역할에서 빛납니다.",
      en: "You shine in people-centered roles: sales, marketing, teaching, event planning, team leadership.",
      ja: "営業、マーケティング、教育、イベント企画、チームリーダーシップなど人中心の役割で輝きます。",
    },
    affirmation: {
      ko: "나의 에너지는 주변 사람들에게 영감을 줍니다.",
      en: "My energy inspires those around me.",
      ja: "私のエネルギーは周りの人に刺激を与えます。",
    },
  },
  deep_extrovert: {
    label: { ko: "깊은 외향인", en: "Deep Extrovert", ja: "深い外向型" },
    emoji: "🔥",
    color: "#ef4444",
    description: {
      ko: "당신은 강한 외향인으로, 사람들 속에서 살아 숨쉽니다. 혼자 있는 시간은 불편하거나 에너지를 소모시킵니다. 활발하고 사교적이며, 새로운 자극과 경험을 끊임없이 추구합니다. 이 에너지는 큰 강점이지만, 내면의 목소리를 듣는 시간도 필요합니다.",
      en: "You're a strong extrovert who comes alive among people. Alone time feels uncomfortable or draining. You're vibrant and social, constantly seeking new stimulation and experiences. This energy is a great strength, but some time to listen to your inner voice is also needed.",
      ja: "あなたは強い外向型で、人々の中で生き生きとします。一人でいる時間は不快感やエネルギー消耗を感じます。活発で社交的で、新しい刺激と経験を絶えず追求します。このエネルギーは大きな強みですが、内なる声を聞く時間も必要です。",
    },
    strengths: {
      ko: ["탁월한 네트워킹과 관계 구축", "즉흥적인 창의성과 아이디어 생성", "팀의 활력과 사기를 높이는 능력", "변화와 도전을 두려워하지 않는 용기"],
      en: ["Excellent networking and relationship building", "Spontaneous creativity and idea generation", "Ability to boost team vitality and morale", "Courage to embrace change and challenge"],
      ja: ["卓越したネットワーキングと関係構築", "即興の創造性とアイデア生成", "チームの活力と士気を高める能力", "変化と挑戦を恐れない勇気"],
    },
    recharge: {
      ko: "사람들로 가득 찬 공간, 이벤트, 여행, 새로운 모험, 다양한 프로젝트",
      en: "Spaces full of people, events, travel, new adventures, diverse projects",
      ja: "人々で満たされた空間、イベント、旅行、新しい冒険、多様なプロジェクト",
    },
    work: {
      ko: "기업가, 홍보, 정치, 엔터테인먼트, 이벤트 산업 등 역동적인 환경에서 빛납니다.",
      en: "You shine in dynamic environments: entrepreneurship, PR, politics, entertainment, the events industry.",
      ja: "起業家、広報、政治、エンターテインメント、イベント産業などのダイナミックな環境で輝きます。",
    },
    affirmation: {
      ko: "나는 세상과 연결될 때 가장 빛납니다.",
      en: "I shine most brightly when connected to the world.",
      ja: "私は世界とつながるとき最も輝きます。",
    },
  },
};

const ui: Record<SupportedLocale, {
  title: string; subtitle: string; scale: string; progress: string;
  resultTitle: string; score: string; spectrum: string; strengths: string;
  recharge: string; work: string; affirmation: string;
  restart: string; share: string; copied: string; note: string;
}> = {
  ko: {
    title: "내향/외향 스펙트럼 테스트", subtitle: "나는 내향인인가요, 외향인인가요, 아니면 그 중간인가요?",
    scale: "이 문장이 나를 얼마나 잘 설명하나요?", progress: "질문",
    resultTitle: "나의 내향/외향 스펙트럼", score: "스펙트럼 점수", spectrum: "내향 ←→ 외향",
    strengths: "강점", recharge: "에너지 충전법", work: "나에게 맞는 업무 스타일",
    affirmation: "오늘의 확언", restart: "다시 테스트하기", share: "결과 공유",
    copied: "링크가 복사되었습니다!", note: "내향성-외향성은 스펙트럼이며, 어느 쪽도 우열이 없습니다. 이 테스트는 칼 융(Carl Jung)의 성격 이론에 기반합니다.",
  },
  en: {
    title: "Introvert/Extrovert Spectrum Test", subtitle: "Am I an introvert, extrovert, or somewhere in between?",
    scale: "How well does this statement describe you?", progress: "Question",
    resultTitle: "My Intro/Extrovert Spectrum", score: "Spectrum Score", spectrum: "Introvert ←→ Extrovert",
    strengths: "Strengths", recharge: "How You Recharge", work: "Work Style That Suits You",
    affirmation: "Today's Affirmation", restart: "Retake Test", share: "Share Result",
    copied: "Link copied!", note: "Introversion-extroversion is a spectrum, and neither end is superior. This test is based on Carl Jung's personality theory.",
  },
  ja: {
    title: "内向/外向スペクトラムテスト", subtitle: "内向型？外向型？それとも中間？",
    scale: "この文章はどれくらい自分をよく表していますか？", progress: "質問",
    resultTitle: "私の内向/外向スペクトラム", score: "スペクトラムスコア", spectrum: "内向 ←→ 外向",
    strengths: "強み", recharge: "エネルギーの充電法", work: "自分に合った仕事スタイル",
    affirmation: "今日のアファメーション", restart: "もう一度テストする", share: "結果を共有",
    copied: "リンクをコピーしました！", note: "内向性-外向性はスペクトラムであり、どちらが優れているわけではありません。このテストはカール・ユング(Carl Jung)の性格理論に基づいています。",
  },
};

export default function IntroExtroTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ spectrum: Spectrum; score: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ie = p.get("ie") as Spectrum | null;
    const is = p.get("is");
    if (ie && ie in spectrumData && is) setResult({ spectrum: ie, score: parseInt(is, 10) });
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const spectrum = getSpectrum(total);
      setAnswers(next);
      setResult({ spectrum, score: total });
      const url = new URL(window.location.href);
      url.searchParams.set("ie", spectrum);
      url.searchParams.set("is", String(total));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setAnswers([]); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("ie"); url.searchParams.delete("is");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: t.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (result) {
    const d = spectrumData[result.spectrum];
    const maxScore = questions.length * 4; // 48
    const pct = Math.round((result.score / maxScore) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="text-4xl">{d.emoji}</div>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold"
            style={{ backgroundColor: d.color }}>{d.label[locale]}</div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>내향 / Introvert</span>
            <span>외향 / Extrovert</span>
          </div>
          <div className="relative w-full h-4 rounded-full overflow-hidden bg-gradient-to-r from-indigo-200 via-emerald-200 to-red-200">
            <div className="absolute top-0 h-4 w-1 bg-gray-800 rounded-full transition-all"
              style={{ left: `calc(${pct}% - 2px)` }} />
          </div>
          <div className="text-center text-xs text-gray-400">{t.score}: {result.score} / {maxScore}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{d.description[locale]}</p>

          <div className="grid grid-cols-1 gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <h3 className="font-semibold text-green-800 text-sm mb-1">✓ {t.strengths}</h3>
              <ul className="space-y-1">
                {d.strengths[locale].map((s, i) => <li key={i} className="text-sm text-green-700">• {s}</li>)}
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="font-semibold text-blue-800 text-sm mb-1">⚡ {t.recharge}</h3>
              <p className="text-sm text-blue-700">{d.recharge[locale]}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <h3 className="font-semibold text-amber-800 text-sm mb-1">💼 {t.work}</h3>
              <p className="text-sm text-amber-700">{d.work[locale]}</p>
            </div>
          </div>

          <div className="text-center py-3 rounded-lg" style={{ backgroundColor: d.color + "18" }}>
            <p className="text-sm italic" style={{ color: d.color }}>"{d.affirmation[locale]}"</p>
            <p className="text-xs text-gray-400 mt-1">{t.affirmation}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.note}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={restart} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium text-sm">{t.restart}</button>
          <button onClick={share} className="px-5 py-2 text-white rounded-full font-medium text-sm" style={{ backgroundColor: d.color }}>{copied ? t.copied : t.share}</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{t.progress} {idx + 1} / {questions.length}</span>
        <div className="w-48 bg-gray-200 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <p className="text-base font-medium text-gray-800 leading-relaxed">{q[locale]}</p>
        <p className="text-xs text-gray-400">{t.scale}</p>
        <div className="space-y-2">
          {scaleLabels[locale].map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">{i}</div>
              <span className="text-sm text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
