import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ProcrastinationType =
  | "perfectionist"
  | "avoider"
  | "overwhelmed"
  | "thrill_seeker"
  | "indecisive";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: ProcrastinationType;
  }[];
}

const questions: Question[] = [
  {
    ko: "마감이 다가올 때 당신은 주로?",
    en: "As a deadline approaches, you usually:",
    ja: "締め切りが近づいたとき、主に？",
    options: [
      { ko: "완벽하게 만들려다 계속 수정하느라 제출을 못 한다", en: "Can't submit because I keep revising to make it perfect", ja: "完璧にしようとして修正を繰り返し提出できない", type: "perfectionist" },
      { ko: "생각하기 싫어서 다른 일을 찾아 바쁘게 지낸다", en: "Stay busy with other things to avoid thinking about it", ja: "考えたくなくて他のことを探して忙しく過ごす", type: "avoider" },
      { ko: "할 일이 너무 많아 어디서 시작해야 할지 모른다", en: "Feel overwhelmed with too much to do and don't know where to start", ja: "やることが多すぎてどこから始めれば良いかわからない", type: "overwhelmed" },
      { ko: "마감 직전 압박감이 생겨야 비로소 집중된다", en: "Only focus when the last-minute pressure kicks in", ja: "締め切り直前のプレッシャーがかかってようやく集中できる", type: "thrill_seeker" },
      { ko: "어떤 방향으로 해야 할지 결정이 안 나 시작을 못 한다", en: "Can't start because I can't decide which direction to take", ja: "どの方向で進めるか決まらず始められない", type: "indecisive" },
    ],
  },
  {
    ko: "새 프로젝트를 맡았을 때 가장 흔하게 하는 것은?",
    en: "When assigned a new project, you most commonly:",
    ja: "新しいプロジェクトを担当したとき、最もよくやることは？",
    options: [
      { ko: "완벽한 계획을 세우느라 실제 시작이 늦어진다", en: "Start late because I'm crafting the perfect plan", ja: "完璧な計画を立てるのに時間をかけて実際の開始が遅れる", type: "perfectionist" },
      { ko: "생각만 해도 불안해서 의도적으로 잊어버리려 한다", en: "Feel anxious just thinking about it and intentionally try to forget it", ja: "考えるだけで不安になり、意図的に忘れようとする", type: "avoider" },
      { ko: "관련된 다른 작은 것들을 먼저 처리하느라 시간을 다 쓴다", en: "Spend all the time handling related small tasks first", ja: "関連する小さなことを先に処理するのに時間を全部使う", type: "overwhelmed" },
      { ko: "일단 나중에 하겠다고 미뤄두고, 막판에 몰아서 한다", en: "Put it off for later and rush through it at the last minute", ja: "とりあえず後でやると先延ばしにして、最後に一気にやる", type: "thrill_seeker" },
      { ko: "어떻게 접근해야 할지 고민하느라 리서치만 계속한다", en: "Keep researching without starting because I can't decide how to approach it", ja: "どうアプローチすべきか悩んでリサーチだけ続ける", type: "indecisive" },
    ],
  },
  {
    ko: "일을 미루는 자신을 발견했을 때 드는 감정은?",
    en: "When you notice yourself procrastinating, you feel:",
    ja: "先延ばしにしている自分に気づいたとき感じることは？",
    options: [
      { ko: "아직 충분히 준비가 안 됐다는 죄책감", en: "Guilt that I'm not sufficiently prepared yet", ja: "まだ十分に準備できていないという罪悪感", type: "perfectionist" },
      { ko: "이걸 생각하면 두렵거나 불편해서 빨리 다른 생각을 한다", en: "Fear or discomfort about it, so I quickly think of something else", ja: "これを考えると怖いか不快なので、すぐ別のことを考える", type: "avoider" },
      { ko: "압도감, 어디서부터 손을 대야 할지 모르는 막막함", en: "Overwhelm — not knowing where to even begin", ja: "圧倒感、どこから手をつければ良いかわからない途方もなさ", type: "overwhelmed" },
      { ko: "아직 시간 있으니까 괜찮다는 묘한 안도감", en: "Oddly reassured that there's still time", ja: "まだ時間があるから大丈夫だという不思議な安堵感", type: "thrill_seeker" },
      { ko: "최선의 방법을 아직 못 찾아서 시작하기 싫다는 답답함", en: "Frustration at not having found the best approach yet", ja: "まだ最善の方法が見つかっていないから始めたくないという焦燥感", type: "indecisive" },
    ],
  },
  {
    ko: "미뤄놓은 일이 생각날 때 가장 자주 하는 행동은?",
    en: "When you remember a task you've been putting off, you most often:",
    ja: "先延ばしにした仕事が思い浮かんだとき、最もよくとる行動は？",
    options: [
      { ko: "더 잘 할 준비가 되면 하겠다고 스스로에게 말한다", en: "Tell myself I'll do it when I'm better prepared", ja: "もっとうまくやる準備ができたらやると自分に言い聞かせる", type: "perfectionist" },
      { ko: "핸드폰이나 다른 것으로 주의를 돌려버린다", en: "Distract myself with my phone or something else", ja: "スマホや他のもので注意をそらす", type: "avoider" },
      { ko: "관련 없는 집안일이나 메일 정리를 먼저 해버린다", en: "Do unrelated chores or clean up emails first", ja: "関係のない家事やメール整理を先にしてしまう", type: "overwhelmed" },
      { ko: "아직 여유 있다고 생각하며 넘어간다", en: "Think there's still plenty of time and let it pass", ja: "まだ余裕があると思ってやり過ごす", type: "thrill_seeker" },
      { ko: "어떻게 할지 또 고민을 시작한다", en: "Start deliberating again about how to do it", ja: "どうすべきかまた考え始める", type: "indecisive" },
    ],
  },
  {
    ko: "마감을 지키지 못했을 때 가장 많이 하는 생각은?",
    en: "When you miss a deadline, your most common thought is:",
    ja: "締め切りを守れなかったとき、最もよくする考えは？",
    options: [
      { ko: "조금만 더 시간이 있었으면 완벽하게 할 수 있었는데", en: "If only I had a bit more time, I could have done it perfectly", ja: "もう少し時間があれば完璧にできたのに", type: "perfectionist" },
      { ko: "이 일을 생각하기 싫었던 이유가 이거구나", en: "This is why I didn't want to think about this task", ja: "この仕事を考えたくなかった理由はこれだな", type: "avoider" },
      { ko: "할 일이 너무 많았어, 처음부터 무리였어", en: "I had too much to do, it was unrealistic from the start", ja: "やることが多すぎたんだ、最初から無理だった", type: "overwhelmed" },
      { ko: "다음엔 마지막 날 더 일찍 시작해봐야지", en: "Next time I should start earlier on the last day", ja: "次は最終日をもう少し早く始めてみよう", type: "thrill_seeker" },
      { ko: "좀 더 생각해서 좋은 방법을 찾았다면 더 빨리 했을 텐데", en: "If I'd thought it through and found a better method, I would have done it faster", ja: "もっとよく考えて良い方法を見つけていれば、もっと早くできたのに", type: "indecisive" },
    ],
  },
  {
    ko: "당신이 미루기 시작하는 상황은 주로?",
    en: "You most often start procrastinating when:",
    ja: "先延ばしを始めるのは主にどんな状況ですか？",
    options: [
      { ko: "결과물이 좋지 않을 것 같은 예감이 들 때", en: "When I sense the result won't be good enough", ja: "結果がうまくいかない予感がするとき", type: "perfectionist" },
      { ko: "실패하거나 비판받는 것이 두려울 때", en: "When I'm afraid of failing or being criticized", ja: "失敗したり批判されるのが怖いとき", type: "avoider" },
      { ko: "관련된 할 일이 한꺼번에 쌓여있을 때", en: "When related tasks pile up all at once", ja: "関連するやることが一度にたまっているとき", type: "overwhelmed" },
      { ko: "긴장감과 스릴이 없어서 지루하게 느껴질 때", en: "When it feels boring with no tension or thrill", ja: "緊張感やスリルがなくて退屈に感じるとき", type: "thrill_seeker" },
      { ko: "여러 옵션 중 최선의 방법을 아직 못 찾았을 때", en: "When I haven't found the best method among several options yet", ja: "複数の選択肢の中で最善の方法がまだ見つかっていないとき", type: "indecisive" },
    ],
  },
  {
    ko: "미루기 없이 바로 시작할 수 있는 조건은?",
    en: "The condition under which you can start immediately without procrastinating:",
    ja: "先延ばしせずにすぐ始められる条件は？",
    options: [
      { ko: "충분한 시간과 완벽한 환경이 갖춰졌을 때", en: "When I have enough time and the perfect environment set up", ja: "十分な時間と完璧な環境が整ったとき", type: "perfectionist" },
      { ko: "안전하고 결과가 크게 중요하지 않을 때", en: "When it feels safe and the outcome isn't critically important", ja: "安全で結果がそれほど重要でないとき", type: "avoider" },
      { ko: "이 일만 하면 되는 상태, 다른 것에 신경 안 써도 될 때", en: "When this is the only thing I need to do and I don't have to worry about anything else", ja: "この仕事だけすればいい状態、他のことを気にしなくていいとき", type: "overwhelmed" },
      { ko: "마감이 코앞이거나 누군가가 보고 있을 때", en: "When the deadline is imminent or someone is watching", ja: "締め切りが目前か、誰かが見ているとき", type: "thrill_seeker" },
      { ko: "어떻게 해야 할지 명확한 지침이나 방법이 제시됐을 때", en: "When clear guidelines or methods are provided", ja: "どうすべきか明確な指針や方法が示されたとき", type: "indecisive" },
    ],
  },
];

const results: Record<
  ProcrastinationType,
  {
    emoji: string;
    color: string;
    ko: { title: string; description: string; strength: string; weakness: string; tip: string };
    en: { title: string; description: string; strength: string; weakness: string; tip: string };
    ja: { title: string; description: string; strength: string; weakness: string; tip: string };
  }
> = {
  perfectionist: {
    emoji: "🎯",
    color: "#8b5cf6",
    ko: {
      title: "완벽주의형",
      description: "당신의 미루기는 '잘 못할까봐'에서 시작됩니다. 완벽하지 않으면 시작하기 싫고, 시작해도 계속 수정하며 제출을 망설입니다. 높은 기준이 강점이지만, 완벽함을 추구하다 아무것도 완성 못 하는 역설에 빠지기 쉽습니다.",
      strength: "높은 품질 기준, 꼼꼼한 검토, 실수를 최소화하려는 의지",
      weakness: "시작 장벽 높음, 제출·완성 두려움, '좋은 것'을 '완벽한 것'의 적으로 봄",
      tip: "'80% 완성 규칙'을 적용하세요. 완벽하지 않아도 완성된 것이 0보다 낫습니다. 드래프트를 먼저 제출하고 나중에 수정하는 문화를 연습해보세요.",
    },
    en: {
      title: "Perfectionist Procrastinator",
      description: "Your procrastination starts with 'what if I don't do it well enough.' You hate starting unless it can be perfect, and even when you do, you keep revising and hesitate to submit. High standards are a strength, but you easily fall into the paradox of pursuing perfection and completing nothing.",
      strength: "High quality standards, thorough review, desire to minimize mistakes",
      weakness: "High barrier to starting, fear of submission/completion, treating 'good' as the enemy of 'perfect'",
      tip: "Apply the '80% complete' rule. A finished imperfect thing is better than zero. Practice a culture of submitting a draft first and revising later.",
    },
    ja: {
      title: "完璧主義型",
      description: "あなたの先延ばしは「うまくできないかも」から始まります。完璧でなければ始めたくなく、始めても修正を繰り返して提出をためらいます。高い基準が強みですが、完璧を追い求めて何も完成させられないというパラドックスに陥りやすいです。",
      strength: "高い品質基準、丁寧な見直し、ミスを最小化しようとする意志",
      weakness: "始めるハードルが高い、提出・完成への恐れ、「良いもの」を「完璧なもの」の敵と見なす",
      tip: "「80%完成ルール」を適用しましょう。不完全でも完成したものはゼロよりましです。まずドラフトを提出して後で修正する文化を練習してみましょう。",
    },
  },
  avoider: {
    emoji: "🙈",
    color: "#ef4444",
    ko: {
      title: "회피형",
      description: "당신은 실패, 비판, 실망에 대한 두려움 때문에 일을 미룹니다. 생각하면 불안해지므로 의도적으로 주의를 다른 곳으로 돌립니다. 실제 능력과 무관하게, 시도 자체를 피해 자존감을 지키려는 심리적 방어입니다.",
      strength: "감정 자기보호 능력, 스트레스에 민감한 자기인식",
      weakness: "문제 회피로 인한 악화, 비판에 대한 과도한 민감성, 역량 증명 기회 상실",
      tip: "미루기가 실은 자기보호임을 인식하세요. '실패해도 괜찮다'는 작은 경험들을 쌓고, 피드백을 개인에 대한 공격이 아닌 작업에 대한 정보로 분리하는 연습을 하세요.",
    },
    en: {
      title: "Fear-Based Avoider",
      description: "You procrastinate out of fear of failure, criticism, or disappointment. Thinking about the task makes you anxious, so you intentionally redirect attention elsewhere. It's a psychological defense to protect self-esteem by avoiding the attempt itself, regardless of actual ability.",
      strength: "Emotional self-protection capability, self-awareness of stress sensitivity",
      weakness: "Problems worsen through avoidance, oversensitivity to criticism, lost opportunities to demonstrate competence",
      tip: "Recognize that procrastination is actually self-protection. Build small experiences of 'it's okay to fail' and practice separating feedback as information about the work, not an attack on you.",
    },
    ja: {
      title: "回避型",
      description: "失敗、批判、失望への恐れから仕事を先延ばしにします。考えると不安になるので、意図的に注意を他に向けます。実際の能力とは関係なく、試みること自体を避けて自尊心を守ろうとする心理的防衛です。",
      strength: "感情的自己保護能力、ストレスへの敏感な自己認識",
      weakness: "回避による問題の悪化、批判への過度な敏感さ、能力証明の機会喪失",
      tip: "先延ばしが実は自己保護であることを認識しましょう。「失敗しても大丈夫」という小さな経験を積み、フィードバックを個人への攻撃ではなく作業への情報として切り離す練習をしましょう。",
    },
  },
  overwhelmed: {
    emoji: "🌊",
    color: "#f59e0b",
    ko: {
      title: "압도형",
      description: "당신의 미루기는 과부하에서 옵니다. 할 일이 많거나 복잡하면 어디서 시작해야 할지 몰라 멈춰버립니다. 시작 자체의 의욕이 없는 게 아니라, 전체를 한꺼번에 처리해야 한다는 압박이 마비를 일으킵니다.",
      strength: "큰 그림을 보는 능력, 세부사항을 놓치지 않으려는 책임감",
      weakness: "과부하 시 마비 현상, 우선순위 설정 어려움, 관련 없는 일을 먼저 처리하는 경향",
      tip: "작업을 물리적으로 분해하세요. '지금 당장 할 수 있는 한 가지'만 골라 5분만 해보세요. 포모도로 기법처럼 짧은 단위로 쪼개면 압도감이 줄어듭니다.",
    },
    en: {
      title: "Overwhelmed Procrastinator",
      description: "Your procrastination comes from overload. When there's too much to do or it's too complex, you freeze not knowing where to start. It's not a lack of motivation to begin — it's the pressure to handle everything at once that causes paralysis.",
      strength: "Ability to see the big picture, sense of responsibility not to miss details",
      weakness: "Paralysis under overload, difficulty setting priorities, tendency to handle irrelevant tasks first",
      tip: "Physically break down the task. Pick just 'one thing you can do right now' and try for 5 minutes. Chunking into small units like the Pomodoro technique reduces overwhelm.",
    },
    ja: {
      title: "圧倒型",
      description: "あなたの先延ばしは過負荷から来ます。やることが多かったり複雑だったりすると、どこから始めれば良いかわからずフリーズします。始める意欲がないわけではなく、すべてを一度に処理しなければならないというプレッシャーが麻痺を引き起こしています。",
      strength: "大きな絵を見る能力、細部を見逃さない責任感",
      weakness: "過負荷時の麻痺現象、優先順位設定の難しさ、関係のないことを先に処理する傾向",
      tip: "タスクを物理的に分解しましょう。「今すぐできる一つのこと」だけを選んで5分だけやってみましょう。ポモドーロテクニックのように短い単位に分割すると圧倒感が減ります。",
    },
  },
  thrill_seeker: {
    emoji: "⚡",
    color: "#10b981",
    ko: {
      title: "스릴 추구형",
      description: "당신에게 마감 직전의 압박감은 오히려 집중을 돕는 연료입니다. 긴장감이 없으면 지루함을 느끼고, 자극이 있어야 에너지가 올라옵니다. 단기 집중력이 강점이지만, 습관화되면 만성 스트레스와 번아웃의 위험이 있습니다.",
      strength: "마감 압박 하 강한 집중력, 유연한 시간 활용, 빠른 실행력",
      weakness: "만성 스트레스 위험, 품질 불안정, 지속적인 긴장감 의존",
      tip: "인위적 마감을 만들어보세요. 진짜 마감 3일 전을 '가짜 마감'으로 설정하고, 그 전까지 완성하는 연습을 하면 품질과 스릴 모두 잡을 수 있습니다.",
    },
    en: {
      title: "Thrill-Seeking Procrastinator",
      description: "For you, the pressure of an imminent deadline is fuel that helps you focus. Without tension you feel bored, and you need stimulation for your energy to rise. Short-term focus is a strength, but habitually this carries risks of chronic stress and burnout.",
      strength: "Strong focus under deadline pressure, flexible time use, fast execution",
      weakness: "Risk of chronic stress, unstable quality, dependence on constant tension",
      tip: "Create artificial deadlines. Set a 'fake deadline' 3 days before the real one, and practice finishing by then — you can capture both quality and thrill.",
    },
    ja: {
      title: "スリル追求型",
      description: "あなたにとって締め切り直前のプレッシャーは、集中を助ける燃料です。緊張感がないと退屈を感じ、刺激があってこそエネルギーが上がります。短期集中力が強みですが、習慣化すると慢性ストレスとバーンアウトのリスクがあります。",
      strength: "締め切りプレッシャー下での強い集中力、柔軟な時間活用、素早い実行力",
      weakness: "慢性ストレスのリスク、品質の不安定さ、常に緊張感への依存",
      tip: "人工的な締め切りを作りましょう。本当の締め切りの3日前を「偽の締め切り」に設定し、それまでに完成する練習をすれば、品質とスリルの両方を得られます。",
    },
  },
  indecisive: {
    emoji: "🔀",
    color: "#3b82f6",
    ko: {
      title: "결정 불능형",
      description: "당신은 '어떻게 할지'를 결정하지 못해 시작을 미룹니다. 최선의 방법을 찾으려는 욕구가 강해서 선택지 사이에서 멈춰버립니다. 신중함은 장점이지만, 완벽한 방법을 기다리다 아무것도 시작하지 못하는 분석 마비가 일어납니다.",
      strength: "신중하고 다양한 관점을 고려함, 위험 최소화 노력",
      weakness: "분석 마비, 과도한 리서치에 시간 소비, 방향 결정 후에도 번복 잦음",
      tip: "어떤 방법이든 일단 시작하면 더 나은 방법이 보입니다. '충분히 좋은 계획'으로 시작하고 진행하면서 수정하세요. 타이머를 5분으로 설정하고 아무 방법이나 써서 무조건 시작해보세요.",
    },
    en: {
      title: "Indecisive Procrastinator",
      description: "You delay starting because you can't decide 'how' to do it. A strong desire to find the best method leaves you frozen between options. Deliberateness is a strength, but waiting for the perfect method leads to analysis paralysis where nothing gets started.",
      strength: "Careful and considers multiple perspectives, effort to minimize risks",
      weakness: "Analysis paralysis, time spent on excessive research, frequent reversal even after deciding direction",
      tip: "Whatever method you start with, a better method will become visible once you begin. Start with a 'good enough plan' and revise as you go. Set a timer for 5 minutes and force yourself to start with any method.",
    },
    ja: {
      title: "決断困難型",
      description: "「どうやるか」を決められないために始めるのを先延ばしにします。最善の方法を見つけたいという欲求が強く、選択肢の間でフリーズしてしまいます。慎重さは長所ですが、完璧な方法を待ち続けて何も始められない分析麻痺が起きます。",
      strength: "慎重で多角的な視点を考慮、リスク最小化への努力",
      weakness: "分析麻痺、過度なリサーチへの時間消費、方向決定後も頻繁に覆す",
      tip: "どんな方法でも始めれば、より良い方法が見えてきます。「十分に良い計画」で始めて、進めながら修正しましょう。タイマーを5分に設定してどんな方法でも書いて絶対に始めてみましょう。",
    },
  },
};

const t = {
  ko: {
    title: "미루기 유형 테스트",
    subtitle: "나는 왜, 어떻게 미루는가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 미루기 유형",
    strength: "강점",
    weakness: "약점",
    tip: "극복 팁",
    scoreLabel: "유형별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Procrastination Type Test",
    subtitle: "Why and How Do You Procrastinate?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Procrastination Type",
    strength: "Strengths",
    weakness: "Weaknesses",
    tip: "Overcoming Tips",
    scoreLabel: "Score by Type",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "先延ばし類型テスト",
    subtitle: "なぜ、どのように先延ばしにするのか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたの先延ばし類型",
    strength: "強み",
    weakness: "弱点",
    tip: "克服のヒント",
    scoreLabel: "類型別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function ProcrastinationTypeTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<ProcrastinationType, number>>({
    perfectionist: 0,
    avoider: 0,
    overwhelmed: 0,
    thrill_seeker: 0,
    indecisive: 0,
  });
  const [result, setResult] = useState<ProcrastinationType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pt = p.get("pt") as ProcrastinationType | null;
    if (pt && results[pt]) setResult(pt);
  }, []);

  function pick(type: ProcrastinationType) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const answeredCount = Object.values(next).reduce((a, b) => a + b, 0);

    if (answeredCount < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answeredCount), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as ProcrastinationType[]).reduce((a, b) =>
        next[a] >= next[b] ? a : b
      );
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("pt", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setScores({ perfectionist: 0, avoider: 0, overwhelmed: 0, thrill_seeker: 0, indecisive: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("pt");
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

  const typeLabels: Record<ProcrastinationType, string> = {
    perfectionist: locale === "ko" ? "완벽주의형" : locale === "ja" ? "完璧主義型" : "Perfectionist",
    avoider: locale === "ko" ? "회피형" : locale === "ja" ? "回避型" : "Avoider",
    overwhelmed: locale === "ko" ? "압도형" : locale === "ja" ? "圧倒型" : "Overwhelmed",
    thrill_seeker: locale === "ko" ? "스릴형" : locale === "ja" ? "スリル型" : "Thrill-Seeker",
    indecisive: locale === "ko" ? "결정불능형" : locale === "ja" ? "決断困難型" : "Indecisive",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const chartData = (Object.keys(scores) as ProcrastinationType[]).map((k) => ({
      name: typeLabels[k],
      value: scores[k],
      fill: results[k].color,
      fillOpacity: k === result ? 1 : 0.4,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-orange-50 p-6 text-center">
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
            <h3 className="font-semibold text-orange-600">⚠️ {tx.weakness}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.weakness}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <h3 className="font-semibold text-purple-700">💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-purple-800">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" domain={[0, questions.length]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={72} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
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
            className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-medium text-white transition hover:bg-purple-700"
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
