import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type CopingStyle =
  | "problem_focused"
  | "emotion_focused"
  | "meaning_making"
  | "social_support"
  | "avoidance";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: CopingStyle;
  }[];
}

const questions: Question[] = [
  {
    ko: "시험이나 중요한 발표를 앞두고 극도로 긴장할 때 당신은?",
    en: "When extremely nervous before an exam or important presentation, you:",
    ja: "試験や重要な発表を前に極度に緊張しているとき、あなたは？",
    options: [
      { ko: "구체적인 준비 계획을 세우고 실행한다", en: "Make a concrete preparation plan and execute it", ja: "具体的な準備計画を立てて実行する", type: "problem_focused" },
      { ko: "심호흡이나 음악을 들으며 마음을 가라앉힌다", en: "Calm down with deep breathing or music", ja: "深呼吸や音楽で気持ちを落ち着かせる", type: "emotion_focused" },
      { ko: "이것이 성장의 기회라고 의미를 부여한다", en: "Find meaning in it as an opportunity for growth", ja: "これを成長の機会として意味を見出す", type: "meaning_making" },
      { ko: "긴장된다고 친구에게 털어놓고 위로를 구한다", en: "Tell a friend I'm nervous and seek comfort", ja: "緊張していることを友人に打ち明け、慰めを求める", type: "social_support" },
      { ko: "다른 것에 집중하며 생각을 피한다", en: "Focus on something else and avoid thinking about it", ja: "他のことに集中して考えを避ける", type: "avoidance" },
    ],
  },
  {
    ko: "직장에서 대인관계 갈등이 생겼을 때 당신은?",
    en: "When there's an interpersonal conflict at work, you:",
    ja: "職場で対人関係の葛藤が生じたとき、あなたは？",
    options: [
      { ko: "문제의 원인을 파악하고 직접 대화해 해결한다", en: "Identify the cause and resolve through direct conversation", ja: "問題の原因を把握して直接対話で解決する", type: "problem_focused" },
      { ko: "혼자 산책이나 운동으로 감정을 해소한다", en: "Release emotions through a solo walk or exercise", ja: "一人で散歩や運動で感情を発散する", type: "emotion_focused" },
      { ko: "이 갈등이 더 나은 관계를 위한 기회라고 생각한다", en: "Think of this conflict as an opportunity for a better relationship", ja: "この葛藤をより良い関係への機会と考える", type: "meaning_making" },
      { ko: "신뢰하는 동료나 친구에게 상황을 이야기하고 조언을 구한다", en: "Tell a trusted colleague or friend and seek advice", ja: "信頼できる同僚や友人に状況を話してアドバイスを求める", type: "social_support" },
      { ko: "최대한 그 사람을 피하고 갈등을 무시한다", en: "Avoid that person as much as possible and ignore the conflict", ja: "できるだけその人を避け、葛藤を無視する", type: "avoidance" },
    ],
  },
  {
    ko: "건강 문제나 몸의 이상으로 걱정될 때 당신은?",
    en: "When worried about a health issue or physical symptom, you:",
    ja: "健康問題や体の異常で心配なとき、あなたは？",
    options: [
      { ko: "검색하고 의사를 예약하는 등 적극적으로 대처한다", en: "Research and book a doctor appointment — actively cope", ja: "調べたり医者の予約をするなど積極的に対処する", type: "problem_focused" },
      { ko: "명상이나 이완 기법으로 불안을 다스린다", en: "Manage anxiety with meditation or relaxation techniques", ja: "瞑想やリラクゼーション技法で不安をコントロールする", type: "emotion_focused" },
      { ko: "이 경험이 건강을 더 소중히 여기게 해준다고 생각한다", en: "Think this experience helps me value health more", ja: "この経験が健康をより大切にさせてくれると思う", type: "meaning_making" },
      { ko: "가족이나 친구에게 걱정된다고 말하고 공감을 받는다", en: "Tell family or friends I'm worried and receive empathy", ja: "家族や友人に心配していると言い、共感を得る", type: "social_support" },
      { ko: "생각하면 불안해지니까 일부러 신경 끄고 지낸다", en: "Purposely tune it out to avoid the anxiety of thinking about it", ja: "考えると不安になるので、わざと気にしないようにする", type: "avoidance" },
    ],
  },
  {
    ko: "중요한 관계가 끝나거나 실연을 경험했을 때 당신은?",
    en: "After an important relationship ends or experiencing heartbreak, you:",
    ja: "重要な関係が終わったり、失恋を経験したとき、あなたは？",
    options: [
      { ko: "무슨 일이 있었는지 분석하고 다음엔 어떻게 다르게 할지 생각한다", en: "Analyze what happened and think about what to do differently next time", ja: "何があったかを分析し、次はどう違うかを考える", type: "problem_focused" },
      { ko: "울거나 일기를 쓰며 감정을 충분히 표현한다", en: "Cry or journal to fully express my emotions", ja: "泣いたり日記を書いたりして感情を十分に表現する", type: "emotion_focused" },
      { ko: "이 이별이 나를 성장시키는 경험이라고 의미를 찾는다", en: "Find meaning — this breakup is an experience that's growing me", ja: "この別れは自分を成長させる経験だと意味を見出す", type: "meaning_making" },
      { ko: "친한 친구에게 연락해 함께 시간을 보낸다", en: "Reach out to close friends and spend time with them", ja: "親しい友人に連絡して一緒に時間を過ごす", type: "social_support" },
      { ko: "드라마, 게임, 쇼핑 등으로 생각을 잊으려 한다", en: "Try to forget by watching dramas, gaming, or shopping", ja: "ドラマ、ゲーム、ショッピングなどで考えを忘れようとする", type: "avoidance" },
    ],
  },
  {
    ko: "경제적 어려움이나 재정 위기가 왔을 때 당신은?",
    en: "When facing financial difficulty or a money crisis, you:",
    ja: "経済的困難や財政危機が来たとき、あなたは？",
    options: [
      { ko: "예산을 세우고 재정 계획을 구체적으로 만든다", en: "Create a budget and make a concrete financial plan", ja: "予算を立て、財務計画を具体的に作る", type: "problem_focused" },
      { ko: "음악을 듣거나 자연 속에서 스트레스를 풀고 다시 마음을 정비한다", en: "Relieve stress through music or nature, then regroup", ja: "音楽を聴いたり自然の中でストレスを発散し、気持ちを整え直す", type: "emotion_focused" },
      { ko: "이것이 돈에 대해 더 현명해질 수 있는 기회라고 생각한다", en: "Think of this as an opportunity to become wiser about money", ja: "これをお金についてより賢くなる機会と考える", type: "meaning_making" },
      { ko: "가족이나 믿을 수 있는 친구와 상황을 공유한다", en: "Share the situation with family or a trusted friend", ja: "家族や信頼できる友人と状況を共有する", type: "social_support" },
      { ko: "생각하면 답답해지니까 최대한 안 생각하려고 한다", en: "Try not to think about it because it just makes me feel stuck", ja: "考えると息詰まるので、できるだけ考えないようにする", type: "avoidance" },
    ],
  },
  {
    ko: "일상에서 쌓인 작은 스트레스들이 폭발할 것 같을 때 당신은?",
    en: "When small daily stresses feel like they're about to boil over, you:",
    ja: "日常で溜まった小さなストレスが爆発しそうなとき、あなたは？",
    options: [
      { ko: "스트레스 목록을 작성하고 해결할 수 있는 것부터 처리한다", en: "Write a stress list and tackle the solvable ones first", ja: "ストレスのリストを作り、解決できるものから対処する", type: "problem_focused" },
      { ko: "좋아하는 음식을 먹거나 목욕을 하며 기분을 전환한다", en: "Eat something I love or take a bath to shift my mood", ja: "好きな食べ物を食べたりお風呂に入って気分転換する", type: "emotion_focused" },
      { ko: "이 과부하가 나의 한계를 알고 조정할 신호라고 생각한다", en: "See this overload as a signal to know my limits and readjust", ja: "この過負荷は自分の限界を知り調整するサインだと考える", type: "meaning_making" },
      { ko: "가까운 사람에게 연락해 힘들다고 솔직히 말한다", en: "Contact someone close and honestly say I'm struggling", ja: "近くの人に連絡して辛いと率直に話す", type: "social_support" },
      { ko: "유튜브, 넷플릭스 등으로 아무 생각 없이 쉰다", en: "Rest mindlessly on YouTube, Netflix, etc.", ja: "YouTubeやNetflixなどで何も考えずに休む", type: "avoidance" },
    ],
  },
];

const results: Record<CopingStyle, {
  emoji: string;
  color: string;
  ko: { title: string; description: string; strength: string; watch: string; tip: string };
  en: { title: string; description: string; strength: string; watch: string; tip: string };
  ja: { title: string; description: string; strength: string; watch: string; tip: string };
}> = {
  problem_focused: {
    emoji: "🔧",
    color: "#3b82f6",
    ko: {
      title: "문제 중심 대처",
      description: "스트레스의 원인을 직접 해결하려는 방식입니다. 계획 수립, 정보 탐색, 직접적 행동을 통해 문제를 해결합니다. 통제 가능한 상황에서 가장 효과적인 대처 방식입니다.",
      strength: "실질적 문제 해결, 낮은 무력감, 자기 효능감 높음",
      watch: "통제 불가능한 상황에서 지속 시 번아웃 위험. 감정 처리를 잊을 수 있음",
      tip: "통제 가능한 것과 통제 불가능한 것을 구분하세요. 통제 불가능한 것에 대해서는 의미 찾기나 감정 대처를 함께 활용하세요.",
    },
    en: {
      title: "Problem-Focused Coping",
      description: "This approach directly addresses the source of stress through plan-making, information gathering, and direct action. It's most effective in controllable situations.",
      strength: "Practical problem resolution, lower helplessness, high self-efficacy",
      watch: "Burnout risk if continued in uncontrollable situations; may neglect emotional processing",
      tip: "Distinguish between what's controllable and what isn't. For uncontrollable things, combine with meaning-making or emotion-focused coping.",
    },
    ja: {
      title: "問題焦点型対処",
      description: "ストレスの原因を直接解決しようとする方法です。計画の策定、情報収集、直接的行動を通じて問題を解決します。コントロール可能な状況で最も効果的な対処法です。",
      strength: "実質的な問題解決、低い無力感、高い自己効力感",
      watch: "コントロール不可能な状況での継続はバーンアウトリスク。感情処理を忘れる可能性あり",
      tip: "コントロールできることとできないことを区別しましょう。コントロールできないことには、意味づけや感情的対処を組み合わせましょう。",
    },
  },
  emotion_focused: {
    emoji: "🌊",
    color: "#8b5cf6",
    ko: {
      title: "감정 중심 대처",
      description: "스트레스로 인한 감정을 조절하고 관리하는 방식입니다. 이완 기법, 감정 표현, 긍정적 재구성을 활용합니다. 통제하기 어려운 상황에서 특히 효과적입니다.",
      strength: "감정 조절 능력, 번아웃 방지, 회복력 향상",
      watch: "문제가 해결 가능할 때 감정 대처만으로는 충분하지 않을 수 있음",
      tip: "감정 대처는 에너지를 회복하는 데 탁월합니다. 회복 후에 문제 중심 대처를 더하면 더 효과적입니다.",
    },
    en: {
      title: "Emotion-Focused Coping",
      description: "This approach regulates and manages emotions caused by stress through relaxation techniques, emotional expression, and positive reframing. Especially effective when situations are hard to control.",
      strength: "Emotional regulation, burnout prevention, improved resilience",
      watch: "When a problem is solvable, emotion-focused coping alone may not be sufficient",
      tip: "Emotion-focused coping is excellent for restoring energy. Adding problem-focused coping after recovery is even more effective.",
    },
    ja: {
      title: "感情焦点型対処",
      description: "ストレスによる感情を調整・管理する方法です。リラクゼーション技法、感情表現、ポジティブな再構成を活用します。コントロールが難しい状況で特に効果的です。",
      strength: "感情調節能力、バーンアウト防止、回復力の向上",
      watch: "問題が解決可能なとき、感情的対処だけでは不十分な場合がある",
      tip: "感情的対処はエネルギーを回復するのに優れています。回復後に問題焦点型対処を加えるとさらに効果的です。",
    },
  },
  meaning_making: {
    emoji: "✨",
    color: "#10b981",
    ko: {
      title: "의미 창출 대처",
      description: "어려움에서 의미, 교훈, 성장의 기회를 찾는 방식입니다. 빅터 프랭클의 '의미 치료(Logotherapy)'와 맥락을 같이합니다. 외상 후 성장(Post-Traumatic Growth)과 깊이 연관되어 있습니다.",
      strength: "심리적 회복력, 장기적 웰빙, 삶의 의미감 유지",
      watch: "억지로 의미를 찾으려 하면 감정 억압이 될 수 있음. 충분히 감정을 느낀 후에 의미를 찾는 것이 건강함",
      tip: "고통을 즉각 의미로 변환하려 하지 마세요. 충분히 아프고, 충분히 슬픈 후에, 그때 의미를 찾아도 늦지 않습니다.",
    },
    en: {
      title: "Meaning-Making Coping",
      description: "This approach finds meaning, lessons, and growth opportunities in difficulties. It aligns with Viktor Frankl's logotherapy and is deeply associated with Post-Traumatic Growth.",
      strength: "Psychological resilience, long-term wellbeing, maintaining a sense of life meaning",
      watch: "Forcing meaning-making can suppress emotions. Finding meaning after fully feeling emotions is healthier",
      tip: "Don't try to immediately convert pain into meaning. After hurting and grieving sufficiently, finding meaning then is still not too late.",
    },
    ja: {
      title: "意味創出型対処",
      description: "困難の中に意味、教訓、成長の機会を見出す方法です。ヴィクトール・フランクルの「意味療法（ロゴセラピー）」と文脈を同じくし、外傷後成長（Post-Traumatic Growth）と深く関連しています。",
      strength: "心理的回復力、長期的な幸福感、人生の意味感の維持",
      watch: "無理に意味を見つけようとすると感情抑圧になり得る。十分に感情を感じた後に意味を探すのが健全",
      tip: "痛みをすぐに意味に変換しようとしないでください。十分に傷つき、十分に悲しんだ後、そのときに意味を探しても遅くはありません。",
    },
  },
  social_support: {
    emoji: "🤗",
    color: "#f59e0b",
    ko: {
      title: "사회적 지지 대처",
      description: "어려운 시기에 타인과 연결되고 지지를 구하는 방식입니다. 연구에 따르면 강한 사회적 연결은 스트레스의 신체적 영향을 완충하는 강력한 효과가 있습니다.",
      strength: "외로움 감소, 다양한 관점 획득, 감정 검증, 실용적 도움 얻기",
      watch: "타인 의존이 지나치면 자기 효능감이 낮아질 수 있음. 지지를 주는 사람들이 지치지 않도록 균형이 필요",
      tip: "지지를 받는 것만큼 주는 것도 중요합니다. 호혜적 관계를 구축하면 지지 네트워크가 지속됩니다.",
    },
    en: {
      title: "Social Support Coping",
      description: "This approach connects with others and seeks support during difficult times. Research shows strong social connection has a powerful buffering effect on the physical impacts of stress.",
      strength: "Reduces loneliness, gains diverse perspectives, emotional validation, practical help",
      watch: "Over-reliance on others may lower self-efficacy; balance needed to prevent supporter burnout",
      tip: "Giving support is as important as receiving it. Building reciprocal relationships keeps the support network sustainable.",
    },
    ja: {
      title: "社会的サポート型対処",
      description: "困難な時期に他者とつながり、サポートを求める方法です。研究によれば、強い社会的つながりはストレスの身体的影響を緩衝する強力な効果があります。",
      strength: "孤独感の減少、多様な視点の獲得、感情の検証、実用的な助けを得る",
      watch: "他者への過度な依存は自己効力感を低下させる可能性がある。支援者が疲弊しないようバランスが必要",
      tip: "サポートを受けることと同じくらい、与えることも重要です。互恵的な関係を構築するとサポートネットワークが持続します。",
    },
  },
  avoidance: {
    emoji: "🌀",
    color: "#6b7280",
    ko: {
      title: "회피적 대처",
      description: "스트레스 상황이나 감정을 일시적으로 피하거나 주의를 다른 곳으로 돌리는 방식입니다. 단기적으로 휴식을 제공하지만, 장기적으로는 문제를 해결하지 않고 오히려 키울 수 있습니다.",
      strength: "단기적 긴장 완화, 회복 시간 제공, 압도적 상황에서의 임시 보호",
      watch: "장기적 회피는 문제를 악화시킴. 불안과 우울감 증가, 결정 미루기 패턴 형성",
      tip: "회피는 완전히 나쁜 것이 아닙니다. '지금은 쉬고, 언제 다시 직면할 것인가'를 스스로 정하는 의식적 회피(Planned Avoidance)는 도움이 됩니다. 무의식적 회피가 문제입니다.",
    },
    en: {
      title: "Avoidance Coping",
      description: "This approach temporarily avoids or diverts attention from stressful situations or emotions. It provides short-term rest but may worsen problems long-term rather than resolving them.",
      strength: "Short-term tension relief, recovery time, temporary protection in overwhelming situations",
      watch: "Long-term avoidance worsens problems; increases anxiety and depression, forms procrastination patterns",
      tip: "Avoidance isn't completely bad. 'Planned avoidance' — consciously deciding 'I'll rest now and face this when' — is helpful. Unconscious avoidance is the problem.",
    },
    ja: {
      title: "回避型対処",
      description: "ストレス状況や感情を一時的に避けたり、注意を他に向ける方法です。短期的に休息を提供しますが、長期的には問題を解決せずむしろ悪化させる可能性があります。",
      strength: "短期的な緊張緩和、回復時間の提供、圧倒的な状況での一時的保護",
      watch: "長期的な回避は問題を悪化させる。不安やうつ感の増加、先延ばしパターンの形成",
      tip: "回避は完全に悪いものではありません。「今は休んで、いつ再び向き合うか」を自分で決める意識的回避（計画的回避）は役立ちます。無意識の回避が問題です。",
    },
  },
};

const t = {
  ko: {
    title: "스트레스 대처 방식 테스트",
    subtitle: "나는 어떻게 어려움에 대처하는가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 대처 스타일",
    strength: "강점",
    watch: "주의할 점",
    tip: "성장 팁",
    scoreLabel: "스타일별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Coping Style Test",
    subtitle: "How Do You Deal With Difficulties?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Coping Style",
    strength: "Strengths",
    watch: "Watch Out For",
    tip: "Growth Tip",
    scoreLabel: "Score by Style",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "ストレス対処スタイルテスト",
    subtitle: "あなたはどのように困難に対処しますか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたの対処スタイル",
    strength: "強み",
    watch: "注意点",
    tip: "成長のヒント",
    scoreLabel: "スタイル別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function CopingStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<CopingStyle, number>>({
    problem_focused: 0,
    emotion_focused: 0,
    meaning_making: 0,
    social_support: 0,
    avoidance: 0,
  });
  const [result, setResult] = useState<CopingStyle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cp = p.get("cp") as CopingStyle | null;
    if (cp && results[cp]) setResult(cp);
  }, []);

  function pick(type: CopingStyle) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const answeredCount = Object.values(next).reduce((a, b) => a + b, 0);
    if (answeredCount < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answeredCount), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as CopingStyle[]).reduce((a, b) =>
        next[a] >= next[b] ? a : b
      );
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("cp", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setScores({ problem_focused: 0, emotion_focused: 0, meaning_making: 0, social_support: 0, avoidance: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("cp");
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

  const typeLabels: Record<CopingStyle, string> = {
    problem_focused: locale === "ko" ? "문제 중심" : locale === "ja" ? "問題焦点" : "Problem",
    emotion_focused: locale === "ko" ? "감정 중심" : locale === "ja" ? "感情焦点" : "Emotion",
    meaning_making: locale === "ko" ? "의미 창출" : locale === "ja" ? "意味創出" : "Meaning",
    social_support: locale === "ko" ? "사회적 지지" : locale === "ja" ? "社会的支援" : "Social",
    avoidance: locale === "ko" ? "회피" : locale === "ja" ? "回避" : "Avoidance",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const chartData = (Object.keys(scores) as CopingStyle[]).map((k) => ({
      name: typeLabels[k],
      value: scores[k],
      fill: results[k].color,
      fillOpacity: k === result ? 1 : 0.4,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `${r.color}12`, border: `1px solid ${r.color}40` }}>
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-3 text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.strength}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.strength}</p>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600">⚠️ {tx.watch}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.watch}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${r.color}10` }}>
            <h3 className="font-semibold" style={{ color: r.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" domain={[0, questions.length]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={64} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            {tx.restart}
          </button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: r.color }}>
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
            className="h-full rounded-full bg-purple-400 transition-all duration-300"
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
