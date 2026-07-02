import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type SupportedLocale = "ko" | "en" | "ja";
interface Props { locale?: string; }

type AngerStyle = "explosive" | "suppressor" | "passive_aggressive" | "assertive" | "calm";

// Each question is a scenario with 5 choices mapped to styles
interface Scenario {
  ko: string; en: string; ja: string;
  choices: Record<SupportedLocale, string[]>;
  mapping: AngerStyle[]; // index 0-4 → style
}

const scenarios: Scenario[] = [
  {
    ko: "동료가 회의에서 나의 아이디어를 자기 것인 양 발표했습니다.",
    en: "A colleague presented my idea in a meeting as if it were their own.",
    ja: "同僚が会議で私のアイデアを自分のものとして発表しました。",
    choices: {
      ko: ["그 자리에서 큰 소리로 항의한다", "아무 말도 하지 않고 속으로 삭인다", "그 동료의 업무를 은근히 방해한다", "회의 후 조용히 그 동료에게 말한다", "일부러 신경 쓰지 않으려 한다"],
      en: ["Protest loudly on the spot", "Stay silent and bottle it up inside", "Subtly undermine that colleague's work later", "Quietly talk to the colleague after the meeting", "Intentionally try not to care"],
      ja: ["その場で大声で抗議する", "何も言わず内心で我慢する", "その同僚の仕事をこっそり妨害する", "会議後に静かにその同僚に話す", "わざと気にしないようにする"],
    },
    mapping: ["explosive", "suppressor", "passive_aggressive", "assertive", "calm"],
  },
  {
    ko: "가까운 친구가 약속을 또 어겼습니다. 이번이 세 번째입니다.",
    en: "A close friend broke their promise again. This is the third time.",
    ja: "親しい友人がまた約束を破りました。これで3回目です。",
    choices: {
      ko: ["그 자리에서 화를 내고 관계를 끊겠다고 말한다", "또 기다리며 아무 말도 하지 않는다", "약속을 지키지 않아도 될 상황을 만들어 복수한다", "진지하게 이것이 나에게 얼마나 상처가 됐는지 말한다", "이건 그 친구의 성격이라 받아들이고 넘어간다"],
      en: ["Get angry on the spot and say you're ending the friendship", "Wait again and say nothing", "Create situations where they also can't keep promises as payback", "Seriously tell them how much this has hurt you", "Accept it as their personality and move on"],
      ja: ["その場で怒り、関係を断つと言う", "また待って何も言わない", "相手も約束を守れない状況を作って復讐する", "真剣にこれが自分にどれほど傷ついたかを話す", "これはその友人の性格だと受け入れて乗り越える"],
    },
    mapping: ["explosive", "suppressor", "passive_aggressive", "assertive", "calm"],
  },
  {
    ko: "음식점에서 주문한 것과 다른 음식이 나왔습니다.",
    en: "A restaurant brought out food different from what you ordered.",
    ja: "レストランで注文したものと違う料理が出てきました。",
    choices: {
      ko: ["직원을 불러 큰 소리로 항의한다", "그냥 먹는다", "리뷰에 악평을 쓰지만 직접적으로는 말하지 않는다", "차분하게 직원에게 주문한 것과 다르다고 말한다", "실수는 있을 수 있다고 생각하며 그냥 먹는다"],
      en: ["Call the staff and protest loudly", "Just eat it", "Write a bad review but don't say anything directly", "Calmly tell the staff it's not what you ordered", "Think mistakes happen and just eat it"],
      ja: ["スタッフを呼んで大声で抗議する", "そのまま食べる", "レビューに悪評を書くが直接は言わない", "落ち着いてスタッフに注文と違うと伝える", "間違いはあり得ると思ってそのまま食べる"],
    },
    mapping: ["explosive", "suppressor", "passive_aggressive", "assertive", "calm"],
  },
  {
    ko: "가족이 나의 사생활이나 중요한 결정에 계속 간섭합니다.",
    en: "A family member keeps interfering with your privacy or important decisions.",
    ja: "家族が自分のプライバシーや重要な決断に干渉し続けています。",
    choices: {
      ko: ["폭발적으로 화를 내며 이제 그만하라고 소리친다", "참고 참다가 우울감이나 무기력함을 느낀다", "표면상 동의하지만 몰래 반대로 행동한다", "경계가 필요하다고 차분하게 대화를 요청한다", "명상이나 산책으로 감정을 스스로 해소한다"],
      en: ["Explode in anger and shout for them to stop", "Endure and endure until you feel depressed or helpless", "Outwardly agree but secretly do the opposite", "Calmly request a conversation about needing boundaries", "Release emotions yourself through meditation or walking"],
      ja: ["爆発的に怒り、もう止めろと叫ぶ", "我慢し続けてうつや無力感を感じる", "表面上同意するが秘かに反対のことをする", "冷静に境界線が必要だと対話を求める", "瞑想や散歩で感情を自分で解消する"],
    },
    mapping: ["explosive", "suppressor", "passive_aggressive", "assertive", "calm"],
  },
  {
    ko: "팀 프로젝트에서 내가 가장 많이 일하는데 공은 항상 팀장이 가져갑니다.",
    en: "In a team project, you do the most work but the team leader always gets the credit.",
    ja: "チームプロジェクトで最も多く働いているのに、いつもチームリーダーが手柄を持っていきます。",
    choices: {
      ko: ["공개적으로 불만을 쏟아내고 더 이상 일하지 않겠다고 한다", "억울하지만 혼자 삭히며 계속 일한다", "팀장이 알아채도록 일부러 실수를 늘린다", "팀장 또는 상사에게 기여도 인정을 요청한다", "이런 상황에서도 배울 게 있다고 생각하고 넘어간다"],
      en: ["Openly vent frustration and say you won't work anymore", "Feel wronged but suppress it and keep working", "Intentionally make more mistakes so the leader notices", "Ask the team leader or superior to recognize your contribution", "Think there's something to learn even in this situation and move on"],
      ja: ["公開的に不満をぶつけ、もう仕事しないと言う", "悔しいが一人で我慢して働き続ける", "チームリーダーが気づくようにわざとミスを増やす", "チームリーダーや上司に貢献度の認定を求める", "こんな状況でも学べることがあると思って乗り越える"],
    },
    mapping: ["explosive", "suppressor", "passive_aggressive", "assertive", "calm"],
  },
];

const styleInfo: Record<AngerStyle, {
  name: Record<SupportedLocale, string>; color: string; emoji: string;
  description: Record<SupportedLocale, string>;
  impact: Record<SupportedLocale, string>;
  growth: Record<SupportedLocale, string>;
  affirmation: Record<SupportedLocale, string>;
}> = {
  explosive: {
    name: { ko: "폭발형", en: "Explosive", ja: "爆発型" }, color: "#ef4444", emoji: "🌋",
    description: {
      ko: "당신은 분노를 즉각적이고 강하게 표출하는 경향이 있습니다. 감정을 억누르지 않는 솔직함은 강점이지만, 폭발적인 표현은 관계를 손상시키고 신뢰를 잃게 만들 수 있습니다. 분노 자체는 자연스러운 감정이지만, 표현 방식이 중요합니다.",
      en: "You tend to express anger immediately and intensely. Your honesty in not suppressing feelings is a strength, but explosive expression can damage relationships and erode trust. Anger itself is natural, but how you express it matters.",
      ja: "あなたは怒りを即座に強く表出する傾向があります。感情を抑えない正直さは強みですが、爆発的な表現は関係を損傷させ信頼を失わせることがあります。怒りそのものは自然な感情ですが、表現方法が重要です。",
    },
    impact: {
      ko: "주변 사람들이 위축될 수 있고, 장기적으로 신뢰와 관계 질이 낮아질 수 있습니다.",
      en: "People around you may feel intimidated, and trust and relationship quality can decline over time.",
      ja: "周りの人が萎縮することがあり、長期的に信頼と関係の質が低下することがあります。",
    },
    growth: {
      ko: "감정이 올라오면 '5초 규칙'을 써보세요: 반응하기 전 5초를 셉니다. 그리고 '나는 지금 화가 났다'는 것을 인식하되, 폭발하기 전에 자리를 피하거나 호흡을 먼저 하세요.",
      en: "Try the '5-second rule' when emotions rise: count 5 seconds before reacting. Recognize 'I am angry right now,' but step away or breathe before exploding.",
      ja: "感情が高まったとき「5秒ルール」を使ってみてください：反応する前に5秒数えます。「今怒っている」と認識しながら、爆発する前に場所を離れるか呼吸を先にしてください。",
    },
    affirmation: { ko: "나는 나의 분노를 인정하되, 그것이 나를 지배하게 두지 않습니다.", en: "I acknowledge my anger but don't let it control me.", ja: "私は怒りを認めますが、それに支配されることはありません。" },
  },
  suppressor: {
    name: { ko: "억압형", en: "Suppressor", ja: "抑圧型" }, color: "#6366f1", emoji: "🧊",
    description: {
      ko: "당신은 분노를 겉으로 드러내지 않고 내면에 쌓아두는 경향이 있습니다. 평화를 유지하려는 마음은 이해되지만, 감정을 계속 억압하면 신체화 증상(두통, 소화 장애)이나 우울감으로 이어질 수 있습니다. 표현하지 않은 분노는 사라지지 않고 쌓입니다.",
      en: "You tend to bottle up anger without showing it externally. Your desire to keep the peace is understandable, but continually suppressing emotions can lead to somatic symptoms (headaches, digestive issues) or depression. Unexpressed anger doesn't disappear — it accumulates.",
      ja: "あなたは怒りを外に表さず内側に溜め込む傾向があります。平和を保ちたい気持ちは理解できますが、感情を抑え続けると身体症状（頭痛、消化障害）やうつにつながることがあります。表現されない怒りは消えず蓄積されます。",
    },
    impact: {
      ko: "장기적으로 만성 스트레스, 번아웃, 원인 모를 우울감이 나타날 수 있습니다.",
      en: "Long-term chronic stress, burnout, or unexplained depression may emerge.",
      ja: "長期的に慢性ストレス、バーンアウト、原因不明のうつが現れることがあります。",
    },
    growth: {
      ko: "'분노 일기'를 써보세요. 말로 하기 어렵다면, 먼저 글로 표현하는 연습을 해보세요. '나는 ___할 때 화가 난다. 왜냐하면___이기 때문이다.' 형식으로 감정을 언어화해보세요.",
      en: "Try keeping an 'anger journal.' If verbal expression is hard, practice putting it in writing first. Use the format: 'I get angry when ___ because ___.'",
      ja: "「怒り日記」を書いてみてください。言葉で言うのが難しければ、まず文章で表現する練習をしてみてください。「私は___のとき怒る。なぜなら___だからだ」という形式で感情を言語化してみてください。",
    },
    affirmation: { ko: "나의 감정을 표현하는 것은 자기 존중입니다.", en: "Expressing my feelings is an act of self-respect.", ja: "感情を表現することは自己尊重です。" },
  },
  passive_aggressive: {
    name: { ko: "수동-공격형", en: "Passive-Aggressive", ja: "受動攻撃型" }, color: "#8b5cf6", emoji: "🌫️",
    description: {
      ko: "당신은 분노를 직접 표현하지 않지만, 간접적인 행동(비꼬기, 지연, 방해)으로 드러내는 경향이 있습니다. 갈등을 피하고 싶지만 감정도 표현하고 싶은 두 마음의 타협입니다. 그러나 이 방식은 상대방을 혼란스럽게 하고 문제를 해결하지 못합니다.",
      en: "You don't express anger directly but tend to show it through indirect behavior (sarcasm, delays, obstruction). It's a compromise between wanting to avoid conflict and wanting to express feelings. But this approach confuses others and doesn't solve problems.",
      ja: "怒りを直接表現しませんが、間接的な行動（嫌味、遅延、妨害）で表す傾向があります。葛藤を避けたいが感情も表現したいという二つの心の妥協です。しかしこの方法は相手を混乱させ、問題を解決しません。",
    },
    impact: {
      ko: "주변 사람들이 당신의 의도를 파악하기 어렵고, 신뢰 손상과 관계 악화로 이어질 수 있습니다.",
      en: "Others find it hard to understand your intentions, leading to eroded trust and deteriorating relationships.",
      ja: "周りの人があなたの意図を把握しにくく、信頼損傷と関係悪化につながることがあります。",
    },
    growth: {
      ko: "'나'를 주어로 하는 표현을 연습해보세요: '당신이 X했을 때, 나는 Y를 느꼈다'는 방식으로 직접적이지만 공격적이지 않게 감정을 전달할 수 있습니다.",
      en: "Practice 'I' statements: 'When you did X, I felt Y.' This lets you communicate feelings directly without being aggressive.",
      ja: "「私」を主語にした表現を練習してみてください：「あなたがXしたとき、私はYを感じた」という方法で、直接的でありながら攻撃的でなく感情を伝えることができます。",
    },
    affirmation: { ko: "나는 나의 감정을 직접적으로, 그리고 존중하는 방식으로 표현할 수 있습니다.", en: "I can express my feelings directly and respectfully.", ja: "私は自分の感情を直接的に、そして尊重する方法で表現できます。" },
  },
  assertive: {
    name: { ko: "주장형 (건강한 분노)", en: "Assertive (Healthy Anger)", ja: "主張型（健全な怒り）" }, color: "#10b981", emoji: "💬",
    description: {
      ko: "당신은 분노를 건강하게 표현하는 방식을 선택합니다. 감정을 억누르지도, 폭발시키지도 않으며, 차분하고 직접적으로 자신의 감정과 필요를 전달합니다. 이것은 심리학적으로 가장 건강한 분노 표현 방식입니다.",
      en: "You choose to express anger in a healthy way. You neither suppress nor explode, but calmly and directly communicate your feelings and needs. This is psychologically the healthiest way to express anger.",
      ja: "あなたは怒りを健全な方法で表現することを選びます。感情を抑えも爆発させもせず、落ち着いて直接的に自分の感情とニーズを伝えます。これは心理学的に最も健全な怒りの表現方法です。",
    },
    impact: {
      ko: "갈등을 해결하고 관계를 더 깊게 만들며, 자기 존중감과 상대방의 신뢰를 동시에 높입니다.",
      en: "Resolves conflicts, deepens relationships, and simultaneously raises self-respect and others' trust in you.",
      ja: "葛藤を解決し関係をより深め、自己尊重感と相手の信頼を同時に高めます。",
    },
    growth: {
      ko: "이미 건강한 방식을 사용하고 있습니다. 이 능력을 더 어려운 상황(권위적인 사람, 친밀한 관계)에서도 유지하는 연습을 해보세요.",
      en: "You're already using a healthy approach. Practice maintaining this ability in harder situations (authoritative people, intimate relationships).",
      ja: "すでに健全な方法を使っています。この能力をより困難な状況（権威的な人、親密な関係）でも維持する練習をしてみてください。",
    },
    affirmation: { ko: "나는 나의 감정을 존중하고, 타인도 존중하며 소통합니다.", en: "I communicate while respecting my emotions and those of others.", ja: "私は自分の感情を尊重し、他者も尊重してコミュニケーションします。" },
  },
  calm: {
    name: { ko: "초연형", en: "Calm/Detached", ja: "超然型" }, color: "#3b82f6", emoji: "🌊",
    description: {
      ko: "당신은 분노 상황에서 감정적으로 거의 흔들리지 않습니다. 뛰어난 자기조절 능력이거나, 때로는 감정을 느끼지 않으려는 회피일 수 있습니다. 진정한 평온인지, 감정을 차단하는 것인지 스스로 살펴볼 필요가 있습니다.",
      en: "In anger-inducing situations, you remain emotionally unshaken. This could be excellent self-regulation, or sometimes an avoidance of feeling emotions. It's worth checking whether this is genuine calm or emotional blocking.",
      ja: "怒りの状況で感情的にほとんど揺れません。優れた自己調節能力であるか、時に感情を感じないようにする回避かもしれません。真の平静なのか、感情を遮断しているのかを自分で確認する必要があります。",
    },
    impact: {
      ko: "안정적인 인상을 줄 수 있지만, 감정을 완전히 차단하면 공감 부족이나 관계의 피상성으로 이어질 수 있습니다.",
      en: "You may seem stable, but fully blocking emotions can lead to a lack of empathy or superficiality in relationships.",
      ja: "安定した印象を与えられますが、感情を完全に遮断すると共感の不足や関係の表面性につながることがあります。",
    },
    growth: {
      ko: "분노가 느껴지지 않는다면, 정말 괜찮은 건지 확인해보세요. 감정을 느끼는 것을 허용하는 것도 성장입니다. 신뢰하는 사람에게 최근의 불편했던 순간을 솔직하게 말해보세요.",
      en: "If you don't feel anger, check whether you're really okay. Allowing yourself to feel emotions is also growth. Try honestly telling a trusted person about a moment that was uncomfortable for you recently.",
      ja: "怒りが感じられないなら、本当に大丈夫かどうか確認してみてください。感情を感じることを許すことも成長です。信頼できる人に最近不快だった瞬間を正直に話してみてください。",
    },
    affirmation: { ko: "나는 감정을 느끼면서도 나의 중심을 잃지 않습니다.", en: "I feel my emotions while keeping my center.", ja: "私は感情を感じながらも中心を失いません。" },
  },
};

const ui: Record<SupportedLocale, { title: string; subtitle: string; progress: string; choose: string; resultTitle: string; allStyles: string; impact: string; growth: string; affirmation: string; restart: string; share: string; copied: string; note: string }> = {
  ko: { title: "분노 표현 스타일 테스트", subtitle: "나는 화가 날 때 어떻게 반응하나요?", progress: "상황", choose: "나와 가장 비슷한 반응은?", resultTitle: "나의 분노 표현 스타일", allStyles: "스타일별 점수", impact: "이 스타일의 영향", growth: "성장 방법", affirmation: "오늘의 확언", restart: "다시 테스트하기", share: "결과 공유", copied: "링크가 복사되었습니다!", note: "이 테스트는 분노 표현 유형에 관한 심리학 연구를 참고하며, 자기 이해를 위한 도구입니다." },
  en: { title: "Anger Style Test", subtitle: "How do you react when you're angry?", progress: "Scenario", choose: "Which response is most like you?", resultTitle: "My Anger Expression Style", allStyles: "Scores by Style", impact: "Impact of This Style", growth: "Ways to Grow", affirmation: "Today's Affirmation", restart: "Retake Test", share: "Share Result", copied: "Link copied!", note: "This test references psychological research on anger expression types and is a self-understanding tool." },
  ja: { title: "怒り表現スタイルテスト", subtitle: "怒ったとき、あなたはどう反応しますか？", progress: "状況", choose: "自分に最も近い反応は？", resultTitle: "私の怒り表現スタイル", allStyles: "スタイル別スコア", impact: "このスタイルの影響", growth: "成長方法", affirmation: "今日のアファメーション", restart: "もう一度テストする", share: "結果を共有", copied: "リンクをコピーしました！", note: "このテストは怒り表現タイプに関する心理学研究を参考にしており、自己理解のためのツールです。" },
};

export default function AngerStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<AngerStyle, number>>({ explosive: 0, suppressor: 0, passive_aggressive: 0, assertive: 0, calm: 0 });
  const [result, setResult] = useState<AngerStyle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const as_ = p.get("as") as AngerStyle | null;
    if (as_ && as_ in styleInfo) setResult(as_);
  }, []);

  function pick(choiceIdx: number) {
    const style = scenarios[idx].mapping[choiceIdx];
    const next = { ...scores, [style]: scores[style] + 1 };
    if (idx + 1 < scenarios.length) {
      setScores(next);
      setTimeout(() => setIdx(idx + 1), 280);
    } else {
      const dominant = (Object.keys(next) as AngerStyle[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setScores(next);
      setResult(dominant);
      const url = new URL(window.location.href);
      url.searchParams.set("as", dominant);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setScores({ explosive: 0, suppressor: 0, passive_aggressive: 0, assertive: 0, calm: 0 }); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("as");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: t.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (result) {
    const d = styleInfo[result];
    const chartData = (Object.keys(styleInfo) as AngerStyle[]).map((s) => ({
      name: styleInfo[s].name[locale].split(" ")[0],
      value: scores[s], color: styleInfo[s].color, fill: styleInfo[s].color,
    })).sort((a, b) => b.value - a.value);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="text-3xl">{d.emoji}</div>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold" style={{ backgroundColor: d.color }}>{d.name[locale]}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-2 text-sm">{t.allStyles}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{d.description[locale]}</p>
          <div className="bg-orange-50 rounded-lg p-3">
            <h3 className="font-semibold text-orange-800 text-sm mb-1">⚡ {t.impact}</h3>
            <p className="text-sm text-orange-700">{d.impact[locale]}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <h3 className="font-semibold text-blue-800 text-sm mb-1">🌱 {t.growth}</h3>
            <p className="text-sm text-blue-700">{d.growth[locale]}</p>
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

  const s = scenarios[idx];
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{t.progress} {idx + 1} / {scenarios.length}</span>
        <div className="w-48 bg-gray-200 rounded-full h-1.5">
          <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${((idx + 1) / scenarios.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-500">📍 {t.progress} {idx + 1}</p>
        <p className="text-base font-medium text-gray-800 leading-relaxed">{s[locale]}</p>
        <p className="text-xs text-gray-400">{t.choose}</p>
        <div className="space-y-2">
          {s.choices[locale].map((choice, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-red-300 hover:bg-red-50 transition-colors text-left">
              <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">{i + 1}</div>
              <span className="text-sm text-gray-700">{choice}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
