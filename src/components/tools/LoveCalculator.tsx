import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Mode = "name" | "mbti";

type MBTIType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

const MBTI_TYPES: MBTIType[] = [
  "INTJ","INTP","ENTJ","ENTP",
  "INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ",
  "ISTP","ISFP","ESTP","ESFP",
];

type MBTIGroup = "analyst" | "diplomat" | "sentinel" | "explorer";

const MBTI_GROUP: Record<MBTIType, MBTIGroup> = {
  INTJ: "analyst", INTP: "analyst", ENTJ: "analyst", ENTP: "analyst",
  INFJ: "diplomat", INFP: "diplomat", ENFJ: "diplomat", ENFP: "diplomat",
  ISTJ: "sentinel", ISFJ: "sentinel", ESTJ: "sentinel", ESFJ: "sentinel",
  ISTP: "explorer", ISFP: "explorer", ESTP: "explorer", ESFP: "explorer",
};

// Complementary pairs that score higher
const HIGH_COMPAT_PAIRS: [MBTIType, MBTIType][] = [
  ["INTJ", "ENFP"], ["INTP", "ENTJ"], ["INFJ", "ENTP"], ["INFP", "ENFJ"],
  ["ISTJ", "ESFP"], ["ISFJ", "ESTP"], ["ESTJ", "ISFP"], ["ESFJ", "ISTP"],
  ["ENTJ", "INTP"], ["ENFP", "INTJ"], ["ENTP", "INFJ"], ["ENFJ", "INFP"],
];

function getMBTIScore(a: MBTIType, b: MBTIType): number {
  const isHighPair = HIGH_COMPAT_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
  if (isHighPair) return 88 + Math.floor(Math.random() * 8); // 88-95
  if (MBTI_GROUP[a] === MBTI_GROUP[b]) return 70 + Math.floor(Math.random() * 16); // 70-85
  // Check partial compatibility: same I/E or same N/S
  const sharedDims = (
    (a[0] === b[0] ? 1 : 0) +
    (a[1] === b[1] ? 1 : 0) +
    (a[2] === b[2] ? 1 : 0) +
    (a[3] === b[3] ? 1 : 0)
  );
  return 40 + sharedDims * 10 + Math.floor(Math.random() * 10);
}

function calcLove(name1: string, name2: string): number {
  const combined = (name1 + name2).toUpperCase().replace(/[^A-Z가-힣]/g, "");
  const counts = "LOVES".split("").map(
    (c) => (combined.match(new RegExp(c, "g")) || []).length
  );
  let nums = [...counts];
  while (nums.length > 2) {
    const next: number[] = [];
    for (let i = 0; i < nums.length - 1; i++) {
      const sum = nums[i] + nums[i + 1];
      next.push(...(sum >= 10 ? [Math.floor(sum / 10), sum % 10] : [sum]));
    }
    nums = next;
  }
  return parseInt(nums.join(""));
}

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    modeNameTab: string;
    modeMbtiTab: string;
    name1Label: string;
    name2Label: string;
    name1Placeholder: string;
    name2Placeholder: string;
    calculateBtn: string;
    resetBtn: string;
    resultTitle: string;
    selectMbti1: string;
    selectMbti2: string;
    disclaimer: string;
    messages: [number, string, string][];
  }
> = {
  ko: {
    title: "러브 계산기",
    subtitle: "두 사람의 궁합을 계산해보세요 💑",
    modeNameTab: "이름 궁합",
    modeMbtiTab: "MBTI 궁합",
    name1Label: "첫 번째 이름",
    name2Label: "두 번째 이름",
    name1Placeholder: "이름 입력",
    name2Placeholder: "이름 입력",
    calculateBtn: "궁합 계산",
    resetBtn: "다시 하기",
    resultTitle: "궁합 점수",
    selectMbti1: "첫 번째 MBTI",
    selectMbti2: "두 번째 MBTI",
    disclaimer: "* 재미로 보는 계산기입니다",
    messages: [
      [90, "💍", "운명적인 만남! 소울메이트예요."],
      [70, "💕", "잘 어울리는 커플이에요!"],
      [50, "🌸", "가능성이 있어요. 노력해보세요!"],
      [30, "🤔", "노력이 필요한 관계예요."],
      [0,  "💔", "쉽지 않은 관계지만 불가능은 없어요."],
    ],
  },
  en: {
    title: "Love Calculator",
    subtitle: "Calculate the compatibility between two people 💑",
    modeNameTab: "Name Compatibility",
    modeMbtiTab: "MBTI Compatibility",
    name1Label: "First Name",
    name2Label: "Second Name",
    name1Placeholder: "Enter name",
    name2Placeholder: "Enter name",
    calculateBtn: "Calculate",
    resetBtn: "Reset",
    resultTitle: "Love Score",
    selectMbti1: "First MBTI",
    selectMbti2: "Second MBTI",
    disclaimer: "* For fun only — not scientifically accurate",
    messages: [
      [90, "💍", "Soulmates! A match made in heaven."],
      [70, "💕", "Great match! You two go well together."],
      [50, "🌸", "Worth a try! There's potential here."],
      [30, "🤔", "Needs work. But anything's possible!"],
      [0,  "💔", "Challenging, but love conquers all."],
    ],
  },
  ja: {
    title: "ラブ計算機",
    subtitle: "二人の相性を計算してみましょう 💑",
    modeNameTab: "名前の相性",
    modeMbtiTab: "MBTIの相性",
    name1Label: "1人目の名前",
    name2Label: "2人目の名前",
    name1Placeholder: "名前を入力",
    name2Placeholder: "名前を入力",
    calculateBtn: "計算する",
    resetBtn: "リセット",
    resultTitle: "相性スコア",
    selectMbti1: "1人目のMBTI",
    selectMbti2: "2人目のMBTI",
    disclaimer: "* 楽しみのための計算機です",
    messages: [
      [90, "💍", "運命の出会い！ソウルメイトです。"],
      [70, "💕", "素晴らしい相性！とてもお似合いです。"],
      [50, "🌸", "可能性あり！試してみる価値があります。"],
      [30, "🤔", "努力が必要ですが、不可能ではありません。"],
      [0,  "💔", "難しい関係ですが、愛はすべてを超えます。"],
    ],
  },
  fr: {
    title: "Calculateur d'Amour",
    subtitle: "Calculez la compatibilité entre deux personnes 💑",
    modeNameTab: "Compatibilité des Prénoms",
    modeMbtiTab: "Compatibilité MBTI",
    name1Label: "Premier Prénom",
    name2Label: "Deuxième Prénom",
    name1Placeholder: "Entrez un prénom",
    name2Placeholder: "Entrez un prénom",
    calculateBtn: "Calculer",
    resetBtn: "Réinitialiser",
    resultTitle: "Score d'Amour",
    selectMbti1: "Premier MBTI",
    selectMbti2: "Deuxième MBTI",
    disclaimer: "* Pour s'amuser uniquement — pas scientifique",
    messages: [
      [90, "💍", "Âmes sœurs ! Une rencontre du destin."],
      [70, "💕", "Excellente compatibilité ! Vous allez très bien ensemble."],
      [50, "🌸", "Ça vaut le coup ! Il y a du potentiel."],
      [30, "🤔", "Des efforts nécessaires, mais tout est possible !"],
      [0,  "💔", "Difficile, mais l'amour surmonte tout."],
    ],
  },
  es: {
    title: "Calculadora de Amor",
    subtitle: "Calcula la compatibilidad entre dos personas 💑",
    modeNameTab: "Compatibilidad de Nombres",
    modeMbtiTab: "Compatibilidad MBTI",
    name1Label: "Primer Nombre",
    name2Label: "Segundo Nombre",
    name1Placeholder: "Ingresa un nombre",
    name2Placeholder: "Ingresa un nombre",
    calculateBtn: "Calcular",
    resetBtn: "Reiniciar",
    resultTitle: "Puntuación de Amor",
    selectMbti1: "Primer MBTI",
    selectMbti2: "Segundo MBTI",
    disclaimer: "* Solo por diversión — no es científico",
    messages: [
      [90, "💍", "¡Almas gemelas! Una unión del destino."],
      [70, "💕", "¡Gran compatibilidad! Hacen muy buena pareja."],
      [50, "🌸", "¡Vale la pena intentarlo! Hay potencial."],
      [30, "🤔", "Requiere esfuerzo, ¡pero todo es posible!"],
      [0,  "💔", "Desafiante, pero el amor todo lo puede."],
    ],
  },
  zh: {
    title: "爱情计算器",
    subtitle: "计算两个人的契合度 💑",
    modeNameTab: "名字契合度",
    modeMbtiTab: "MBTI契合度",
    name1Label: "第一个名字",
    name2Label: "第二个名字",
    name1Placeholder: "输入名字",
    name2Placeholder: "输入名字",
    calculateBtn: "计算",
    resetBtn: "重置",
    resultTitle: "爱情分数",
    selectMbti1: "第一个MBTI",
    selectMbti2: "第二个MBTI",
    disclaimer: "* 仅供娱乐，非科学测算",
    messages: [
      [90, "💍", "天生一对！命中注定的灵魂伴侣。"],
      [70, "💕", "非常相配！你们很合得来。"],
      [50, "🌸", "值得尝试！有很大潜力。"],
      [30, "🤔", "需要努力，但一切皆有可能！"],
      [0,  "💔", "有挑战，但爱能克服一切。"],
    ],
  },
};

function getMessageEntry(
  messages: [number, string, string][],
  pct: number
): [string, string] {
  for (const [threshold, emoji, text] of messages) {
    if (pct >= threshold) return [emoji, text];
  }
  return ["💔", ""];
}

function getBarColor(pct: number): string {
  if (pct >= 90) return "from-pink-500 to-red-400";
  if (pct >= 70) return "from-pink-400 to-rose-300";
  if (pct >= 50) return "from-rose-300 to-orange-300";
  if (pct >= 30) return "from-orange-300 to-yellow-300";
  return "from-gray-300 to-gray-400";
}

export default function LoveCalculator({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [mode, setMode] = useState<Mode>("name");

  // Name mode
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");

  // MBTI mode
  const [mbti1, setMbti1] = useState<MBTIType | "">("");
  const [mbti2, setMbti2] = useState<MBTIType | "">("");

  const [result, setResult] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(undefined);

  const animateTo = useCallback((target: number) => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    let current = 0;
    const step = () => {
      current += Math.ceil((target - current) / 8) || 1;
      if (current >= target) {
        setDisplayed(target);
        return;
      }
      setDisplayed(current);
      rafRef.current = requestAnimationFrame(step);
    };
    step();
  }, []);

  useEffect(() => {
    if (result !== null) animateTo(result);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [result, animateTo]);

  const handleCalculate = useCallback(() => {
    if (mode === "name") {
      if (!name1.trim() || !name2.trim()) return;
      setResult(calcLove(name1, name2));
    } else {
      if (!mbti1 || !mbti2) return;
      setResult(getMBTIScore(mbti1, mbti2));
    }
  }, [mode, name1, name2, mbti1, mbti2]);

  const handleReset = useCallback(() => {
    setName1("");
    setName2("");
    setMbti1("");
    setMbti2("");
    setResult(null);
    setDisplayed(0);
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = result ?? 0;
  const [emoji, message] = result !== null ? getMessageEntry(t.messages, pct) : ["", ""];
  const barColor = getBarColor(pct);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t.title}
        </h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(["name", "mbti"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); setDisplayed(0); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-pink-500 text-white"
                : "bg-white text-gray-600 hover:bg-pink-50"
            }`}
          >
            {m === "name" ? t.modeNameTab : t.modeMbtiTab}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {mode === "name" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.name1Label}
              </label>
              <input
                type="text"
                value={name1}
                onChange={(e) => { setName1(e.target.value); setResult(null); }}
                placeholder={t.name1Placeholder}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div className="flex justify-center text-2xl">❤️</div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.name2Label}
              </label>
              <input
                type="text"
                value={name2}
                onChange={(e) => { setName2(e.target.value); setResult(null); }}
                placeholder={t.name2Placeholder}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.selectMbti1}
              </label>
              <select
                value={mbti1}
                onChange={(e) => { setMbti1(e.target.value as MBTIType); setResult(null); }}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">—</option>
                {MBTI_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-center text-2xl">❤️</div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.selectMbti2}
              </label>
              <select
                value={mbti2}
                onChange={(e) => { setMbti2(e.target.value as MBTIType); setResult(null); }}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">—</option>
                {MBTI_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={handleCalculate}
          disabled={
            mode === "name"
              ? !name1.trim() || !name2.trim()
              : !mbti1 || !mbti2
          }
          className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 font-semibold text-white shadow-md hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {t.calculateBtn}
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-6 text-center space-y-4">
          <p className="text-sm font-medium text-pink-500 uppercase tracking-wider">
            {t.resultTitle}
          </p>

          {/* Big number */}
          <div className="text-7xl font-extrabold text-pink-600">
            {displayed}
            <span className="text-4xl">%</span>
          </div>

          {/* Gradient bar */}
          <div className="relative h-4 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
              style={{ width: `${displayed}%` }}
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <div className="text-4xl">{emoji}</div>
            <p className="text-lg font-semibold text-gray-800">
              {message}
            </p>
          </div>

          <button
            onClick={handleReset}
            className="mt-2 rounded-lg border border-pink-300 px-6 py-2 text-sm font-medium text-pink-600 hover:bg-pink-50 transition-colors"
          >
            {t.resetBtn}
          </button>
          <p className="text-xs text-gray-400">{t.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
