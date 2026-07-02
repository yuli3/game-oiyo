import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";
interface Props { locale?: string; }

type ValueKey = "security" | "adventure" | "creativity" | "family" | "achievement" | "freedom" | "contribution" | "growth" | "spirituality" | "wealth";

// Forced-choice pairs — each answer adds 1 point to one value
interface Pair { a: ValueKey; b: ValueKey; question: Record<SupportedLocale, { a: string; b: string; prompt: string }> }

const pairs: Pair[] = [
  { a: "security", b: "adventure", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "안정적이고 예측 가능한 삶", b: "새로운 경험과 모험" }, en: { prompt: "Which matters more to me?", a: "A stable and predictable life", b: "New experiences and adventure" }, ja: { prompt: "私にとってより重要なのは？", a: "安定した予測可能な生活", b: "新しい経験と冒険" } } },
  { a: "family", b: "achievement", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "가족과 친밀한 관계", b: "목표 달성과 성공" }, en: { prompt: "Which matters more to me?", a: "Family and close relationships", b: "Achieving goals and success" }, ja: { prompt: "私にとってより重要なのは？", a: "家族と親密な関係", b: "目標達成と成功" } } },
  { a: "creativity", b: "wealth", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "창의적 표현과 예술적 삶", b: "재정적 풍요와 경제적 안정" }, en: { prompt: "Which matters more to me?", a: "Creative expression and artistic life", b: "Financial abundance and economic security" }, ja: { prompt: "私にとってより重要なのは？", a: "創造的表現と芸術的な生活", b: "経済的豊かさと財政的安定" } } },
  { a: "freedom", b: "security", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "나만의 규칙으로 사는 자유", b: "사회적 안전망과 보호" }, en: { prompt: "Which matters more to me?", a: "Freedom to live by my own rules", b: "Social safety nets and protection" }, ja: { prompt: "私にとってより重要なのは？", a: "自分だけのルールで生きる自由", b: "社会的セーフティネットと保護" } } },
  { a: "contribution", b: "achievement", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "사회와 타인에게 기여하는 삶", b: "개인적인 성과와 인정" }, en: { prompt: "Which matters more to me?", a: "A life of contributing to society and others", b: "Personal accomplishments and recognition" }, ja: { prompt: "私にとってより重要なのは？", a: "社会と他者に貢献する人生", b: "個人的な成果と認知" } } },
  { a: "growth", b: "family", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "지속적인 배움과 자기 성장", b: "사랑하는 사람들과의 시간" }, en: { prompt: "Which matters more to me?", a: "Continuous learning and self-growth", b: "Time with the people I love" }, ja: { prompt: "私にとってより重要なのは？", a: "継続的な学びと自己成長", b: "愛する人々との時間" } } },
  { a: "spirituality", b: "wealth", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "내면의 평화와 영적 성장", b: "물질적 풍요와 사회적 성공" }, en: { prompt: "Which matters more to me?", a: "Inner peace and spiritual growth", b: "Material abundance and social success" }, ja: { prompt: "私にとってより重要なのは？", a: "内なる平和と霊的成長", b: "物質的豊かさと社会的成功" } } },
  { a: "adventure", b: "family", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "예측 불가능한 모험과 자극", b: "안정적인 가족 관계와 소속감" }, en: { prompt: "Which matters more to me?", a: "Unpredictable adventure and stimulation", b: "Stable family bonds and belonging" }, ja: { prompt: "私にとってより重要なのは？", a: "予測不可能な冒険と刺激", b: "安定した家族関係と帰属感" } } },
  { a: "creativity", b: "contribution", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "나만의 독창적인 작품 창조", b: "더 많은 사람들에게 도움이 되는 일" }, en: { prompt: "Which matters more to me?", a: "Creating original work of my own", b: "Doing work that helps more people" }, ja: { prompt: "私にとってより重要なのは？", a: "自分だけのオリジナル作品の創造", b: "より多くの人々を助ける仕事" } } },
  { a: "freedom", b: "growth", question: { ko: { prompt: "나에게 더 중요한 것은?", a: "어디에도 얽매이지 않는 자유", b: "더 나은 내가 되어가는 성장" }, en: { prompt: "Which matters more to me?", a: "Freedom tied to nothing", b: "Growth into a better self" }, ja: { prompt: "私にとってより重要なのは？", a: "何にも縛られない自由", b: "より良い自分への成長" } } },
];

const valueInfo: Record<ValueKey, { name: Record<SupportedLocale, string>; emoji: string; color: string; description: Record<SupportedLocale, string>; live: Record<SupportedLocale, string> }> = {
  security: { name: { ko: "안정", en: "Security", ja: "安定" }, emoji: "🏠", color: "#6366f1", description: { ko: "당신에게 안정감과 예측 가능성은 삶의 근간입니다. 안전한 환경에서 더 깊이 성장하고 타인을 돌볼 수 있습니다.", en: "Security and predictability are the foundation of your life. In a safe environment, you can grow deeper and care for others.", ja: "安定感と予測可能性はあなたの人生の基盤です。安全な環境でより深く成長し、他者を思いやることができます。" }, live: { ko: "안정적인 루틴과 비상금, 신뢰할 수 있는 사람들 곁에 있는 것이 당신의 삶에 활력을 줍니다.", en: "Stable routines, emergency savings, and having trustworthy people around energize your life.", ja: "安定したルーティン、緊急資金、信頼できる人々の近くにいることがあなたの人生に活力を与えます。" } },
  adventure: { name: { ko: "모험", en: "Adventure", ja: "冒険" }, emoji: "🌍", color: "#ef4444", description: { ko: "새로운 경험과 예측 불가능한 자극이 당신을 살아있게 만듭니다. 틀에 박힌 일상보다 새로운 도전이 에너지를 줍니다.", en: "New experiences and unpredictable stimulation make you feel alive. New challenges energize you more than routine.", ja: "新しい経験と予測不可能な刺激があなたを生き生きとさせます。決まりきった日常より新しい挑戦がエネルギーを与えます。" }, live: { ko: "새로운 여행, 낯선 사람과의 대화, 처음 해보는 경험들이 당신을 충전시킵니다.", en: "New travel, conversations with strangers, and first-time experiences recharge you.", ja: "新しい旅、見知らぬ人との会話、初めての経験があなたを充電させます。" } },
  creativity: { name: { ko: "창의성", en: "Creativity", ja: "創造性" }, emoji: "🎨", color: "#ec4899", description: { ko: "당신은 새로운 것을 만들고 아이디어를 표현하는 과정에서 깊은 의미를 찾습니다. 창의적 출구 없이는 답답함을 느낄 수 있습니다.", en: "You find deep meaning in creating new things and expressing ideas. Without a creative outlet, you may feel stifled.", ja: "あなたは新しいものを作り、アイデアを表現する過程に深い意味を見出します。創造的な出口なしには息苦しさを感じることがあります。" }, live: { ko: "예술, 글쓰기, 디자인, 음악, 혁신적 아이디어를 실험할 수 있는 공간이 필요합니다.", en: "You need space to experiment with art, writing, design, music, or innovative ideas.", ja: "芸術、文章、デザイン、音楽、革新的なアイデアを実験できる空間が必要です。" } },
  family: { name: { ko: "가족/관계", en: "Family/Relationships", ja: "家族/関係" }, emoji: "💞", color: "#f59e0b", description: { ko: "당신에게 사랑하는 사람들과의 깊은 유대가 삶의 중심입니다. 관계의 질이 삶의 질을 결정합니다.", en: "For you, deep bonds with the people you love are the center of life. The quality of relationships determines the quality of life.", ja: "あなたにとって愛する人々との深い絆が人生の中心です。関係の質が人生の質を決定します。" }, live: { ko: "정기적인 가족 모임, 친한 친구들과의 깊은 대화, 서로를 돌보는 시간이 삶을 풍요롭게 합니다.", en: "Regular family gatherings, deep talks with close friends, and time caring for each other enrich your life.", ja: "定期的な家族の集まり、親しい友人との深い対話、互いを思いやる時間が人生を豊かにします。" } },
  achievement: { name: { ko: "성취", en: "Achievement", ja: "達成" }, emoji: "🏆", color: "#10b981", description: { ko: "목표를 달성하고 성과를 인정받는 것이 당신에게 강력한 동기입니다. 성장의 증거를 보고 싶어합니다.", en: "Achieving goals and receiving recognition for your results is a powerful motivator. You want to see evidence of growth.", ja: "目標を達成し成果を認められることが強力な動機です。成長の証拠を見たいと思っています。" }, live: { ko: "명확한 목표, 측정 가능한 진척도, 이정표마다의 작은 축하가 삶에 에너지를 줍니다.", en: "Clear goals, measurable progress, and small celebrations at each milestone energize your life.", ja: "明確な目標、測定可能な進捗、各マイルストーンでの小さなお祝いが人生にエネルギーを与えます。" } },
  freedom: { name: { ko: "자유", en: "Freedom", ja: "自由" }, emoji: "🦋", color: "#8b5cf6", description: { ko: "당신은 외부의 강제나 제약 없이 자신의 방식으로 살고 싶습니다. 자율성이 핵심 가치입니다.", en: "You want to live your own way without external coercion or constraints. Autonomy is your core value.", ja: "あなたは外部の強制や制約なく、自分のやり方で生きたいと思っています。自律性が核心的な価値です。" }, live: { ko: "스스로 결정하는 일, 유연한 일정, 억압적인 환경에서 벗어나는 것이 당신을 살아있게 합니다.", en: "Self-determined work, flexible schedules, and freedom from oppressive environments keep you alive.", ja: "自分で決める仕事、柔軟なスケジュール、抑圧的な環境からの解放があなたを生き生きとさせます。" } },
  contribution: { name: { ko: "사회 기여", en: "Contribution", ja: "社会貢献" }, emoji: "🌱", color: "#10b981", description: { ko: "당신은 세상을 더 나은 곳으로 만드는 것에서 의미를 찾습니다. 개인의 성공보다 더 큰 목적을 추구합니다.", en: "You find meaning in making the world a better place. You pursue a larger purpose beyond personal success.", ja: "あなたは世界をより良い場所にすることに意味を見出します。個人の成功より大きな目的を追求します。" }, live: { ko: "봉사, NGO, 교육, 의료, 환경보호 등 사람과 세상에 직접 영향을 미치는 일이 삶의 목적이 됩니다.", en: "Service, NGOs, education, healthcare, environmental protection — work that directly impacts people and the world becomes your life's purpose.", ja: "봉사、NGO、教育、医療、環境保護など人と世界に直接影響を与える仕事が人生の目的になります。" } },
  growth: { name: { ko: "성장", en: "Growth", ja: "成長" }, emoji: "📈", color: "#3b82f6", description: { ko: "당신은 어제보다 나은 오늘을 지향합니다. 배움, 발전, 자기 개선이 삶의 핵심 드라이버입니다.", en: "You strive to be better today than yesterday. Learning, development, and self-improvement are your life's core drivers.", ja: "あなたは昨日より良い今日を目指します。学び、発展、自己改善が人生の核心的な推進力です。" }, live: { ko: "책, 강의, 멘토십, 새로운 기술 습득 — 계속 배우는 환경이 당신에게 가장 좋은 환경입니다.", en: "Books, courses, mentorship, acquiring new skills — an environment of constant learning is best for you.", ja: "本、講座、メンターシップ、新しいスキルの習得 — 常に学べる環境があなたにとって最高の環境です。" } },
  spirituality: { name: { ko: "영성/내면", en: "Spirituality/Inner Life", ja: "霊性/内面" }, emoji: "🕊️", color: "#6366f1", description: { ko: "당신은 외부의 성취보다 내면의 평화와 더 깊은 의미를 추구합니다. 삶의 목적과 연결감이 중요합니다.", en: "You seek inner peace and deeper meaning over external achievements. Life's purpose and connection are important to you.", ja: "あなたは外部の成果より内なる平和とより深い意味を追求します。人生の目的とつながりが重要です。" }, live: { ko: "명상, 자연, 깊은 철학적 대화, 봉사, 예술적 체험이 당신을 충전시킵니다.", en: "Meditation, nature, deep philosophical conversations, service, and artistic experiences recharge you.", ja: "瞑想、自然、深い哲学的対話、봉사、芸術的な体験があなたを充電させます。" } },
  wealth: { name: { ko: "부/풍요", en: "Wealth/Abundance", ja: "富/豊かさ" }, emoji: "💎", color: "#f59e0b", description: { ko: "재정적 안정과 물질적 풍요는 당신에게 자유와 선택권을 의미합니다. 돈을 목적이 아닌 가능성의 도구로 봅니다.", en: "Financial stability and material abundance mean freedom and options to you. You see money not as an end but as a tool for possibility.", ja: "財政的安定と物質的豊かさはあなたにとって自由と選択肢を意味します。お金を目的ではなく可能性のツールとして見ています。" }, live: { ko: "재정 목표 설정, 투자, 가치 있는 경험에 지출하는 것이 삶의 만족도를 높입니다.", en: "Setting financial goals, investing, and spending on meaningful experiences raise your life satisfaction.", ja: "財政的目標設定、投資、価値ある経験への支出が人生の満足度を高めます。" } },
};

const ui: Record<SupportedLocale, { title: string; subtitle: string; progress: string; choose: string; resultTitle: string; top3: string; howToLive: string; affirmation: string; restart: string; share: string; copied: string; note: string }> = {
  ko: { title: "삶의 가치관 테스트", subtitle: "나에게 가장 중요한 것은 무엇인가요?", progress: "선택", choose: "어느 것이 더 중요한가요?", resultTitle: "나의 핵심 가치관", top3: "나의 상위 3가지 가치관", howToLive: "이 가치관에 맞게 사는 법", affirmation: "나의 가치관 선언", restart: "다시 테스트하기", share: "결과 공유", copied: "링크가 복사되었습니다!", note: "이 테스트는 가치관이 행동과 삶의 만족도에 미치는 영향을 연구한 긍정심리학 기반으로 합니다." },
  en: { title: "Life Values Test", subtitle: "What matters most to you in life?", progress: "Choice", choose: "Which is more important?", resultTitle: "My Core Values", top3: "My Top 3 Values", howToLive: "How to Live by These Values", affirmation: "My Values Declaration", restart: "Retake Test", share: "Share Result", copied: "Link copied!", note: "This test is based on positive psychology research on how values influence behavior and life satisfaction." },
  ja: { title: "人生の価値観テスト", subtitle: "あなたにとって最も重要なことは何ですか？", progress: "選択", choose: "どちらがより重要ですか？", resultTitle: "私の核心的価値観", top3: "私のトップ3価値観", howToLive: "この価値観に合わせて生きる方法", affirmation: "私の価値観宣言", restart: "もう一度テストする", share: "結果を共有", copied: "リンクをコピーしました！", note: "このテストは価値観が行動と人生の満足度に与える影響を研究したポジティブ心理学に基づいています。" },
};

export default function LifeValuesTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Partial<Record<ValueKey, number>>>({});
  const [result, setResult] = useState<ValueKey[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lv = p.get("lv");
    if (lv) setResult(lv.split(",") as ValueKey[]);
  }, []);

  function pick(chosen: ValueKey) {
    const next = { ...scores, [chosen]: (scores[chosen] ?? 0) + 1 };
    if (idx + 1 < pairs.length) {
      setScores(next);
      setTimeout(() => setIdx(idx + 1), 280);
    } else {
      const allKeys = Object.keys(valueInfo) as ValueKey[];
      const sorted = allKeys.sort((a, b) => (next[b] ?? 0) - (next[a] ?? 0));
      const top3 = sorted.slice(0, 3);
      setScores(next);
      setResult(top3);
      const url = new URL(window.location.href);
      url.searchParams.set("lv", top3.join(","));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setScores({}); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("lv");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: t.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (result) {
    const primary = result[0];
    const d = valueInfo[primary];
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="text-4xl">{d.emoji}</div>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold" style={{ backgroundColor: d.color }}>{d.name[locale]}</div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">{t.top3}</h2>
          <div className="flex flex-wrap gap-2">
            {result.map((key, i) => (
              <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium" style={{ backgroundColor: valueInfo[key].color }}>
                <span>{valueInfo[key].emoji}</span>
                <span>{i + 1}. {valueInfo[key].name[locale]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{d.description[locale]}</p>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 text-sm mb-1">🌱 {t.howToLive}</h3>
            <p className="text-sm text-blue-700">{d.live[locale]}</p>
          </div>
          {result.slice(1).map((key) => (
            <div key={key} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{valueInfo[key].emoji}</span>
                <span className="font-semibold text-sm text-gray-800">{valueInfo[key].name[locale]}</span>
              </div>
              <p className="text-sm text-gray-600">{valueInfo[key].description[locale]}</p>
            </div>
          ))}
          <div className="text-center py-3 rounded-lg" style={{ backgroundColor: d.color + "18" }}>
            <p className="text-sm font-medium" style={{ color: d.color }}>
              {result.map((k) => valueInfo[k].name[locale]).join(" · ")}
            </p>
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

  const pair = pairs[idx];
  const q = pair.question[locale];
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{t.progress} {idx + 1} / {pairs.length}</span>
        <div className="w-48 bg-gray-200 rounded-full h-1.5">
          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${((idx + 1) / pairs.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <p className="text-sm font-medium text-gray-500 text-center">{q.prompt}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={() => pick(pair.a)}
            className="p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left space-y-1">
            <div className="text-2xl">{valueInfo[pair.a].emoji}</div>
            <div className="font-semibold text-gray-800 text-sm">{valueInfo[pair.a].name[locale]}</div>
            <div className="text-xs text-gray-500">{q.a}</div>
          </button>
          <button onClick={() => pick(pair.b)}
            className="p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left space-y-1">
            <div className="text-2xl">{valueInfo[pair.b].emoji}</div>
            <div className="font-semibold text-gray-800 text-sm">{valueInfo[pair.b].name[locale]}</div>
            <div className="text-xs text-gray-500">{q.b}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
