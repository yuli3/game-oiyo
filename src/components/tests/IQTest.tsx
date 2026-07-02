import { useState, useEffect, useRef } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "number" | "pattern" | "logic" | "spatial" | "verbal";

interface Question {
  id: number;
  type: QuestionType;
  prompt: Record<Locale, string>;
  visual?: string; // emoji/text visual clue shown above prompt
  options: string[];         // always 4 options; language-neutral when numbers/symbols
  optionLabels?: Record<Locale, string[]>; // override option text per locale (verbal questions)
  answer: number;            // 0-indexed correct option
  explanation: Record<Locale, string>;
  points: number;            // base points for correct answer
}

// ─── i18n UI ──────────────────────────────────────────────────────────────────

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    startBtn: string;
    nextBtn: string;
    prevBtn: string;
    submitBtn: string;
    retakeBtn: string;
    questionOf: (cur: number, total: number) => string;
    timeLeft: string;
    yourScore: string;
    estimatedIQ: string;
    band: string;
    percentile: string;
    correct: string;
    incorrect: string;
    explanation: string;
    reviewBtn: string;
    disclaimer: string;
    typeLabels: Record<QuestionType, string>;
    bands: Record<string, { label: string; description: string }>;
  }
> = {
  ko: {
    title: "IQ 추정 테스트",
    subtitle: "15문항 패턴·논리·공간·수열 문제로 지적 능력을 추정합니다",
    startBtn: "테스트 시작",
    nextBtn: "다음",
    prevBtn: "이전",
    submitBtn: "결과 보기",
    retakeBtn: "다시 하기",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "남은 시간",
    yourScore: "획득 점수",
    estimatedIQ: "추정 IQ",
    band: "지능 범주",
    percentile: "상위",
    correct: "정답",
    incorrect: "오답",
    explanation: "해설",
    reviewBtn: "문제 리뷰",
    disclaimer: "이 결과는 재미를 위한 추정치입니다. 정확한 IQ 측정은 공인된 전문가 검사를 이용해주세요.",
    typeLabels: { number: "수열", pattern: "패턴", logic: "논리", spatial: "공간", verbal: "언어" },
    bands: {
      "130+": { label: "최우수 (130+)", description: "상위 2% — 매우 뛰어난 지적 능력" },
      "120": { label: "우수 (120~129)", description: "상위 10% — 뛰어난 지적 능력" },
      "110": { label: "평균 이상 (110~119)", description: "상위 25% — 평균보다 높은 지적 능력" },
      "100": { label: "평균 (90~109)", description: "상위 50% — 평균적인 지적 능력" },
      "90": { label: "평균 이하 (80~89)", description: "하위 25% — 평균보다 낮은 편" },
      "low": { label: "개선 필요 (~79)", description: "연습과 노력으로 향상 가능" },
    },
  },
  en: {
    title: "IQ Estimation Test",
    subtitle: "15 pattern, logic, spatial & sequence questions to estimate your cognitive ability",
    startBtn: "Start Test",
    nextBtn: "Next",
    prevBtn: "Back",
    submitBtn: "See Results",
    retakeBtn: "Retake",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "Time left",
    yourScore: "Your score",
    estimatedIQ: "Estimated IQ",
    band: "Intelligence band",
    percentile: "Top",
    correct: "Correct",
    incorrect: "Incorrect",
    explanation: "Explanation",
    reviewBtn: "Review questions",
    disclaimer: "This result is an entertainment estimate only. For an accurate IQ score, consult a certified professional.",
    typeLabels: { number: "Sequence", pattern: "Pattern", logic: "Logic", spatial: "Spatial", verbal: "Verbal" },
    bands: {
      "130+": { label: "Very Superior (130+)", description: "Top 2% — Exceptionally high cognitive ability" },
      "120": { label: "Superior (120–129)", description: "Top 10% — Highly developed cognitive ability" },
      "110": { label: "High Average (110–119)", description: "Top 25% — Above-average cognitive ability" },
      "100": { label: "Average (90–109)", description: "Top 50% — Typical cognitive ability" },
      "90": { label: "Low Average (80–89)", description: "Bottom 25% — Slightly below average" },
      "low": { label: "Below Average (~79)", description: "Can be improved with practice and effort" },
    },
  },
  ja: {
    title: "IQ推定テスト",
    subtitle: "15問のパターン・論理・空間・数列問題で認知能力を推定します",
    startBtn: "テスト開始",
    nextBtn: "次へ",
    prevBtn: "前へ",
    submitBtn: "結果を見る",
    retakeBtn: "もう一度",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "残り時間",
    yourScore: "獲得スコア",
    estimatedIQ: "推定IQ",
    band: "知能カテゴリ",
    percentile: "上位",
    correct: "正解",
    incorrect: "不正解",
    explanation: "解説",
    reviewBtn: "問題レビュー",
    disclaimer: "この結果はエンターテインメント目的の推定値です。正確なIQ測定には認定専門家のテストをご利用ください。",
    typeLabels: { number: "数列", pattern: "パターン", logic: "論理", spatial: "空間", verbal: "言語" },
    bands: {
      "130+": { label: "非常に優秀 (130+)", description: "上位2% — 非常に高い認知能力" },
      "120": { label: "優秀 (120~129)", description: "上位10% — 高度に発達した認知能力" },
      "110": { label: "平均以上 (110~119)", description: "上位25% — 平均より高い認知能力" },
      "100": { label: "平均 (90~109)", description: "上位50% — 典型的な認知能力" },
      "90": { label: "平均以下 (80~89)", description: "下位25% — やや平均を下回る" },
      "low": { label: "要改善 (~79)", description: "練習と努力で向上可能" },
    },
  },
  fr: {
    title: "Test d'Estimation du QI",
    subtitle: "15 questions de motifs, logique, espace et séquences pour estimer vos capacités cognitives",
    startBtn: "Démarrer",
    nextBtn: "Suivant",
    prevBtn: "Précédent",
    submitBtn: "Voir les résultats",
    retakeBtn: "Recommencer",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "Temps restant",
    yourScore: "Votre score",
    estimatedIQ: "QI estimé",
    band: "Catégorie d'intelligence",
    percentile: "Top",
    correct: "Correct",
    incorrect: "Incorrect",
    explanation: "Explication",
    reviewBtn: "Réviser les questions",
    disclaimer: "Ce résultat est une estimation à titre de divertissement uniquement. Pour un QI précis, consultez un professionnel certifié.",
    typeLabels: { number: "Séquence", pattern: "Motif", logic: "Logique", spatial: "Spatial", verbal: "Verbal" },
    bands: {
      "130+": { label: "Très supérieur (130+)", description: "Top 2% — Capacités cognitives exceptionnelles" },
      "120": { label: "Supérieur (120–129)", description: "Top 10% — Capacités cognitives très développées" },
      "110": { label: "Haute moyenne (110–119)", description: "Top 25% — Capacités au-dessus de la moyenne" },
      "100": { label: "Moyenne (90–109)", description: "Top 50% — Capacités cognitives typiques" },
      "90": { label: "Basse moyenne (80–89)", description: "Bas 25% — Légèrement en dessous de la moyenne" },
      "low": { label: "En dessous (~79)", description: "Peut être amélioré avec de la pratique" },
    },
  },
  es: {
    title: "Test de Estimación de CI",
    subtitle: "15 preguntas de patrones, lógica, espacio y secuencias para estimar tu capacidad cognitiva",
    startBtn: "Comenzar",
    nextBtn: "Siguiente",
    prevBtn: "Anterior",
    submitBtn: "Ver resultados",
    retakeBtn: "Repetir",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "Tiempo restante",
    yourScore: "Tu puntuación",
    estimatedIQ: "CI estimado",
    band: "Banda de inteligencia",
    percentile: "Top",
    correct: "Correcto",
    incorrect: "Incorrecto",
    explanation: "Explicación",
    reviewBtn: "Revisar preguntas",
    disclaimer: "Este resultado es una estimación de entretenimiento únicamente. Para un CI preciso consulta un profesional certificado.",
    typeLabels: { number: "Secuencia", pattern: "Patrón", logic: "Lógica", spatial: "Espacial", verbal: "Verbal" },
    bands: {
      "130+": { label: "Muy superior (130+)", description: "Top 2% — Capacidad cognitiva excepcionalmente alta" },
      "120": { label: "Superior (120–129)", description: "Top 10% — Capacidad cognitiva muy desarrollada" },
      "110": { label: "Promedio alto (110–119)", description: "Top 25% — Capacidad por encima del promedio" },
      "100": { label: "Promedio (90–109)", description: "Top 50% — Capacidad cognitiva típica" },
      "90": { label: "Promedio bajo (80–89)", description: "Bajo 25% — Ligeramente por debajo del promedio" },
      "low": { label: "Por debajo (~79)", description: "Se puede mejorar con práctica y esfuerzo" },
    },
  },
  zh: {
    title: "IQ推测测验",
    subtitle: "15道图形规律、逻辑推理、空间思维和数列题目，推估认知能力",
    startBtn: "开始测验",
    nextBtn: "下一题",
    prevBtn: "上一题",
    submitBtn: "查看结果",
    retakeBtn: "重新测验",
    questionOf: (c, t) => `${c} / ${t}`,
    timeLeft: "剩余时间",
    yourScore: "获得分数",
    estimatedIQ: "推估IQ",
    band: "智力等级",
    percentile: "前",
    correct: "正确",
    incorrect: "错误",
    explanation: "解析",
    reviewBtn: "题目回顾",
    disclaimer: "此结果仅供娱乐参考。精确的IQ测量请咨询认证专业人士。",
    typeLabels: { number: "数列", pattern: "规律", logic: "逻辑", spatial: "空间", verbal: "语言" },
    bands: {
      "130+": { label: "极优秀 (130+)", description: "前2% — 认知能力极高" },
      "120": { label: "优秀 (120~129)", description: "前10% — 高度发展的认知能力" },
      "110": { label: "中上 (110~119)", description: "前25% — 高于平均的认知能力" },
      "100": { label: "平均 (90~109)", description: "前50% — 一般的认知能力" },
      "90": { label: "中下 (80~89)", description: "后25% — 略低于平均" },
      "low": { label: "需要加强 (~79)", description: "可通过练习和努力提升" },
    },
  },
};

// ─── Questions ────────────────────────────────────────────────────────────────
// Options are language-neutral where possible (numbers/symbols).
// optionLabels overrides per-locale for verbal questions.

const QUESTIONS: Question[] = [
  // 1 – number sequence
  {
    id: 1,
    type: "number",
    visual: "2 · 4 · 8 · 16 · ?",
    prompt: {
      ko: "다음 수열에서 빠진 숫자는?",
      en: "What number comes next in the sequence?",
      ja: "数列の次の数字は？",
      fr: "Quel nombre vient ensuite ?",
      es: "¿Qué número sigue en la secuencia?",
      zh: "数列中下一个数字是？",
    },
    options: ["24", "30", "32", "36"],
    answer: 2,
    explanation: {
      ko: "각 숫자를 2배하면 다음 숫자가 됩니다 (×2 패턴). 16 × 2 = 32.",
      en: "Each number doubles the previous one (×2 pattern). 16 × 2 = 32.",
      ja: "各数字は前の数字の2倍です（×2パターン）。16 × 2 = 32。",
      fr: "Chaque nombre double le précédent (×2). 16 × 2 = 32.",
      es: "Cada número duplica el anterior (×2). 16 × 2 = 32.",
      zh: "每个数字是前一个的2倍（×2规律）。16 × 2 = 32。",
    },
    points: 6,
  },
  // 2 – number sequence (Fibonacci-like)
  {
    id: 2,
    type: "number",
    visual: "1 · 1 · 2 · 3 · 5 · 8 · ?",
    prompt: {
      ko: "다음 수열에서 빠진 숫자는?",
      en: "What number comes next?",
      ja: "次の数字は？",
      fr: "Quel est le prochain nombre ?",
      es: "¿Cuál es el siguiente número?",
      zh: "下一个数字是？",
    },
    options: ["11", "12", "13", "15"],
    answer: 2,
    explanation: {
      ko: "피보나치 수열: 각 수는 앞 두 수의 합입니다. 5 + 8 = 13.",
      en: "Fibonacci sequence: each number is the sum of the two before it. 5 + 8 = 13.",
      ja: "フィボナッチ数列：各数字は前の2つの和です。5 + 8 = 13。",
      fr: "Suite de Fibonacci : chaque nombre est la somme des deux précédents. 5 + 8 = 13.",
      es: "Sucesión de Fibonacci: cada número es la suma de los dos anteriores. 5 + 8 = 13.",
      zh: "斐波那契数列：每个数是前两个数之和。5 + 8 = 13。",
    },
    points: 7,
  },
  // 3 – number sequence (arithmetic)
  {
    id: 3,
    type: "number",
    visual: "3 · 7 · 11 · 15 · ?",
    prompt: {
      ko: "다음 수열에서 빠진 숫자는?",
      en: "What number comes next?",
      ja: "次の数字は？",
      fr: "Quel est le prochain nombre ?",
      es: "¿Cuál es el siguiente número?",
      zh: "下一个数字是？",
    },
    options: ["17", "18", "19", "20"],
    answer: 2,
    explanation: {
      ko: "+4씩 증가하는 등차수열입니다. 15 + 4 = 19.",
      en: "Arithmetic sequence with +4 each step. 15 + 4 = 19.",
      ja: "各ステップ+4の等差数列です。15 + 4 = 19。",
      fr: "Suite arithmétique de +4 à chaque étape. 15 + 4 = 19.",
      es: "Sucesión aritmética de +4 en cada paso. 15 + 4 = 19.",
      zh: "每步+4的等差数列。15 + 4 = 19。",
    },
    points: 5,
  },
  // 4 – logic (odd one out, shape category)
  {
    id: 4,
    type: "pattern",
    visual: "🔺 🔷 🔶 🟡 🔻",
    prompt: {
      ko: "다음 중 나머지와 다른 것은?",
      en: "Which one is different from the rest?",
      ja: "次のうち他と異なるものは？",
      fr: "Lequel est différent des autres ?",
      es: "¿Cuál es diferente de los demás?",
      zh: "哪一个与其他不同？",
    },
    options: ["🔺", "🔷", "🔶", "🟡"],
    answer: 1,
    explanation: {
      ko: "🔷만 사각형(다이아몬드)이고 나머지는 삼각형 또는 원 계열입니다.",
      en: "🔷 is a quadrilateral (diamond); the rest are triangles or circles.",
      ja: "🔷だけが四角形（ダイヤモンド）で、残りは三角形または円です。",
      fr: "🔷 est un quadrilatère (losange); les autres sont des triangles ou des cercles.",
      es: "🔷 es un cuadrilátero (diamante); los demás son triángulos o círculos.",
      zh: "🔷是四邊形（菱形），其餘都是三角形或圓形。",
    },
    points: 6,
  },
  // 5 – logic syllogism
  {
    id: 5,
    type: "logic",
    prompt: {
      ko: "모든 새는 날 수 있다. 펭귄은 새다. → 결론은?",
      en: "All birds can fly. A penguin is a bird. → What follows?",
      ja: "全ての鳥は飛べる。ペンギンは鳥だ。→ 結論は？",
      fr: "Tous les oiseaux peuvent voler. Un pingouin est un oiseau. → Quelle conclusion ?",
      es: "Todos los pájaros pueden volar. Un pingüino es un pájaro. → ¿Qué se concluye?",
      zh: "所有鸟都能飞。企鹅是鸟。→ 结论是？",
    },
    optionLabels: {
      ko: ["펭귄은 날 수 있다 (전제에 따른 논리적 결론)", "펭귄은 날 수 없다", "일부 새는 날 수 없다", "새는 동물이다"],
      en: ["Penguins can fly (logical conclusion from premises)", "Penguins cannot fly", "Some birds cannot fly", "Birds are animals"],
      ja: ["ペンギンは飛べる（前提からの論理的結論）", "ペンギンは飛べない", "一部の鳥は飛べない", "鳥は動物だ"],
      fr: ["Les pingouins peuvent voler (conclusion logique des prémisses)", "Les pingouins ne peuvent pas voler", "Certains oiseaux ne peuvent pas voler", "Les oiseaux sont des animaux"],
      es: ["Los pingüinos pueden volar (conclusión lógica de las premisas)", "Los pingüinos no pueden volar", "Algunos pájaros no pueden volar", "Los pájaros son animales"],
      zh: ["企鹅能飞（根据前提的逻辑结论）", "企鹅不能飞", "部分鸟不能飞", "鸟是动物"],
    },
    options: ["A", "B", "C", "D"],
    answer: 0,
    explanation: {
      ko: "전제가 참이라면 삼단논법에서 결론은 논리적으로 '펭귄은 날 수 있다'입니다. 실제로는 거짓이지만, 논리 문제는 전제의 진위가 아닌 추론의 유효성을 묻습니다.",
      en: "If the premises are true, the syllogism logically concludes 'penguins can fly'. It's factually wrong, but logic tests validity of reasoning, not real-world truth.",
      ja: "前提が真であれば、三段論法の論理的結論は「ペンギンは飛べる」です。実際には偽ですが、論理問題は推論の妥当性を問います。",
      fr: "Si les prémisses sont vraies, le syllogisme conclut logiquement 'les pingouins peuvent voler'. C'est factuellement faux, mais la logique teste la validité du raisonnement.",
      es: "Si las premisas son verdaderas, el silogismo concluye lógicamente 'los pingüinos pueden volar'. Es factualmente incorrecto, pero la lógica prueba la validez del razonamiento.",
      zh: "如果前提为真，三段论的逻辑结论是「企鹅能飞」。实际上是错的，但逻辑题考验推理的有效性而非现实真相。",
    },
    points: 8,
  },
  // 6 – logic (missing number in grid)
  {
    id: 6,
    type: "pattern",
    visual: "3  6  9\n4  8  12\n5  10  ?",
    prompt: {
      ko: "표에서 ?에 들어갈 숫자는?",
      en: "What number replaces ? in the grid?",
      ja: "グリッドの?に入る数字は？",
      fr: "Quel nombre remplace ? dans la grille ?",
      es: "¿Qué número reemplaza ? en la cuadrícula?",
      zh: "方格中?应填入的数字是？",
    },
    options: ["13", "14", "15", "16"],
    answer: 2,
    explanation: {
      ko: "각 행은 '×1, ×2, ×3' 패턴입니다. 5 × 3 = 15.",
      en: "Each row follows ×1, ×2, ×3. So 5 × 3 = 15.",
      ja: "各行は×1、×2、×3のパターンです。5 × 3 = 15。",
      fr: "Chaque ligne suit ×1, ×2, ×3. Donc 5 × 3 = 15.",
      es: "Cada fila sigue ×1, ×2, ×3. Entonces 5 × 3 = 15.",
      zh: "每行遵循×1、×2、×3规律。5 × 3 = 15。",
    },
    points: 8,
  },
  // 7 – spatial (mirror)
  {
    id: 7,
    type: "spatial",
    visual: "◀️ 🔲 🔲\n🔲 ▶️ 🔲\n🔲 🔲 ▲",
    prompt: {
      ko: "위 그림을 좌우로 뒤집으면 어느 쪽 모서리에 ▲가 오는가?",
      en: "If the figure above is mirrored left-right, where does the ▲ end up?",
      ja: "上の図を左右反転すると▲はどの角に来るか？",
      fr: "Si la figure est retournée gauche-droite, où se retrouve ▲ ?",
      es: "Si la figura se voltea izquierda-derecha, ¿dónde queda ▲?",
      zh: "将上图左右翻转后，▲在哪个角？",
    },
    optionLabels: {
      ko: ["왼쪽 위", "오른쪽 위", "왼쪽 아래", "오른쪽 아래"],
      en: ["Top-left", "Top-right", "Bottom-left", "Bottom-right"],
      ja: ["左上", "右上", "左下", "右下"],
      fr: ["En haut à gauche", "En haut à droite", "En bas à gauche", "En bas à droite"],
      es: ["Arriba izquierda", "Arriba derecha", "Abajo izquierda", "Abajo derecha"],
      zh: ["左上", "右上", "左下", "右下"],
    },
    options: ["A", "B", "C", "D"],
    answer: 2,
    explanation: {
      ko: "▲는 원래 오른쪽 아래에 있습니다. 좌우 반전하면 왼쪽 아래로 이동합니다.",
      en: "▲ is originally bottom-right. Mirroring left-right moves it to bottom-left.",
      ja: "▲はもともと右下にあります。左右反転すると左下に移動します。",
      fr: "▲ est originalement en bas à droite. Le retournement gauche-droite le déplace en bas à gauche.",
      es: "▲ está originalmente abajo a la derecha. El volteo izquierda-derecha lo mueve abajo a la izquierda.",
      zh: "▲原本在右下。左右翻轉後移至左下。",
    },
    points: 7,
  },
  // 8 – logic (analogy)
  {
    id: 8,
    type: "logic",
    visual: "🌕 → 🌑  /  ☀️ → ?",
    prompt: {
      ko: "관계를 완성하세요: 달(밝음) → 달(어둠) / 해(낮) → ?",
      en: "Complete the analogy: Moon (bright) → Moon (dark) / Sun (day) → ?",
      ja: "アナロジーを完成させてください：月（明）→ 月（暗）/ 太陽（昼）→ ?",
      fr: "Complétez l'analogie : Lune (claire) → Lune (sombre) / Soleil (jour) → ?",
      es: "Completa la analogía: Luna (brillante) → Luna (oscura) / Sol (día) → ?",
      zh: "完成類比：月亮（亮）→ 月亮（暗）/ 太陽（白天）→ ?",
    },
    options: ["🌙", "⭐", "🌃", "🌑"],
    answer: 0,
    explanation: {
      ko: "🌕(보름달) → 🌑(어두운 달)은 '빛→어둠' 변환입니다. ☀️(낮)의 반대는 🌙(밤/달빛)입니다.",
      en: "🌕 (full moon) → 🌑 (dark moon) = bright → dark. ☀️ (day) → 🌙 (night/moonlight).",
      ja: "🌕（満月）→ 🌑（暗い月）は「明→暗」変換です。☀️（昼）の反対は🌙（夜/月光）です。",
      fr: "🌕 → 🌑 = clair → sombre. L'opposé de ☀️ (jour) est 🌙 (nuit/clair de lune).",
      es: "🌕 → 🌑 = brillante → oscuro. El opuesto de ☀️ (día) es 🌙 (noche/luz de luna).",
      zh: "🌕→🌑是「亮→暗」转换。☀️（白天）的对应是🌙（夜晚/月光）。",
    },
    points: 7,
  },
  // 9 – number sequence (squares)
  {
    id: 9,
    type: "number",
    visual: "1 · 4 · 9 · 16 · 25 · ?",
    prompt: {
      ko: "다음 수열에서 빠진 숫자는?",
      en: "What number comes next?",
      ja: "次の数字は？",
      fr: "Quel est le prochain nombre ?",
      es: "¿Cuál es el siguiente número?",
      zh: "下一个数字是？",
    },
    options: ["30", "35", "36", "49"],
    answer: 2,
    explanation: {
      ko: "제곱수 수열: 1², 2², 3², 4², 5², 6². 6² = 36.",
      en: "Perfect squares: 1², 2², 3², 4², 5², 6². So 6² = 36.",
      ja: "完全平方数：1², 2², 3², 4², 5², 6². 6² = 36。",
      fr: "Carrés parfaits : 1², 2², 3², 4², 5², 6². Donc 6² = 36.",
      es: "Cuadrados perfectos: 1², 2², 3², 4², 5², 6². Entonces 6² = 36.",
      zh: "完全平方数：1²、2²、3²、4²、5²、6²。6² = 36。",
    },
    points: 7,
  },
  // 10 – logic (deduction)
  {
    id: 10,
    type: "logic",
    prompt: {
      ko: "A > B, B > C 이면?",
      en: "If A > B and B > C, then?",
      ja: "A > B、B > C ならば？",
      fr: "Si A > B et B > C, alors ?",
      es: "Si A > B y B > C, entonces ?",
      zh: "若A > B且B > C，則？",
    },
    optionLabels: {
      ko: ["A > C", "A = C", "C > A", "결론 불가"],
      en: ["A > C", "A = C", "C > A", "Cannot conclude"],
      ja: ["A > C", "A = C", "C > A", "結論できない"],
      fr: ["A > C", "A = C", "C > A", "Impossible de conclure"],
      es: ["A > C", "A = C", "C > A", "No se puede concluir"],
      zh: ["A > C", "A = C", "C > A", "无法得出结论"],
    },
    options: ["A", "B", "C", "D"],
    answer: 0,
    explanation: {
      ko: "이행성: A > B이고 B > C이면 A > C입니다.",
      en: "Transitivity: if A > B and B > C, then A > C.",
      ja: "推移性：A > B かつ B > C ならば A > C です。",
      fr: "Transitivité : si A > B et B > C, alors A > C.",
      es: "Transitividad: si A > B y B > C, entonces A > C.",
      zh: "傳遞性：若A > B且B > C，則A > C。",
    },
    points: 6,
  },
  // 11 – pattern (next in series)
  {
    id: 11,
    type: "pattern",
    visual: "🔴 🔵 🔴 🔵 🔴 ?",
    prompt: {
      ko: "다음에 올 도형은?",
      en: "What comes next?",
      ja: "次に来る図形は？",
      fr: "Qu'est-ce qui vient ensuite ?",
      es: "¿Qué viene a continuación?",
      zh: "下一個是？",
    },
    options: ["🔴", "🔵", "🟡", "🟢"],
    answer: 1,
    explanation: {
      ko: "🔴🔵가 반복되는 패턴입니다. 🔴 다음은 🔵.",
      en: "Alternating pattern 🔴🔵. After 🔴 comes 🔵.",
      ja: "🔴🔵が繰り返すパターンです。🔴の次は🔵。",
      fr: "Alternance 🔴🔵. Après 🔴 vient 🔵.",
      es: "Patrón alternante 🔴🔵. Después de 🔴 viene 🔵.",
      zh: "🔴🔵交替出現。🔴後是🔵。",
    },
    points: 4,
  },
  // 12 – spatial rotation
  {
    id: 12,
    type: "spatial",
    visual: "↑ → ↓ ←  (90° clockwise rotation each step)",
    prompt: {
      ko: "↑ → ↓ ← 패턴에서 ← 다음에 올 방향은? (매번 시계 방향 90° 회전)",
      en: "In the pattern ↑ → ↓ ← (each step rotates 90° clockwise), what comes after ←?",
      ja: "↑ → ↓ ←（各ステップ時計回りに90°回転）のパターンで、←の次は？",
      fr: "Dans le motif ↑ → ↓ ← (rotation de 90° dans le sens des aiguilles), que vient après ← ?",
      es: "En el patrón ↑ → ↓ ← (rotación 90° en sentido horario), ¿qué viene después de ← ?",
      zh: "在↑→↓←模式中（每步顺时针旋转90°），←后是？",
    },
    options: ["↑", "→", "↓", "←"],
    answer: 0,
    explanation: {
      ko: "시계 방향 90° 회전: ↑→→→↓→←→↑. ← 다음은 다시 ↑입니다.",
      en: "Clockwise 90°: ↑→→→↓→←→↑. After ← comes ↑ again.",
      ja: "時計回り90°：↑→→→↓→←→↑。←の次は再び↑です。",
      fr: "Sens horaire 90° : ↑→→→↓→←→↑. Après ← revient ↑.",
      es: "Horario 90°: ↑→→→↓→←→↑. Después de ← vuelve ↑.",
      zh: "顺时针90°：↑→→→↓→←→↑。←后再次是↑。",
    },
    points: 7,
  },
  // 13 – number (missing in equation)
  {
    id: 13,
    type: "number",
    visual: "? × 7 = 84",
    prompt: {
      ko: "?에 들어갈 숫자는?",
      en: "What number fills the ?",
      ja: "?に入る数字は？",
      fr: "Quel nombre remplace ? ?",
      es: "¿Qué número va en el ?",
      zh: "?应填入的数字是？",
    },
    options: ["10", "11", "12", "13"],
    answer: 2,
    explanation: {
      ko: "84 ÷ 7 = 12.",
      en: "84 ÷ 7 = 12.",
      ja: "84 ÷ 7 = 12。",
      fr: "84 ÷ 7 = 12.",
      es: "84 ÷ 7 = 12.",
      zh: "84 ÷ 7 = 12。",
    },
    points: 5,
  },
  // 14 – verbal/logic (odd one out)
  {
    id: 14,
    type: "verbal",
    prompt: {
      ko: "다음 중 나머지와 다른 범주의 단어는?",
      en: "Which word belongs to a different category?",
      ja: "次のうち他と異なるカテゴリの単語は？",
      fr: "Quel mot appartient à une catégorie différente ?",
      es: "¿Qué palabra pertenece a una categoría diferente?",
      zh: "哪個詞屬於不同類別？",
    },
    optionLabels: {
      ko: ["사과", "바나나", "당근", "포도"],
      en: ["Apple", "Banana", "Carrot", "Grape"],
      ja: ["リンゴ", "バナナ", "ニンジン", "ブドウ"],
      fr: ["Pomme", "Banane", "Carotte", "Raisin"],
      es: ["Manzana", "Plátano", "Zanahoria", "Uva"],
      zh: ["苹果", "香蕉", "胡萝卜", "葡萄"],
    },
    options: ["A", "B", "C", "D"],
    answer: 2,
    explanation: {
      ko: "사과·바나나·포도는 과일이고, 당근은 채소입니다.",
      en: "Apple, banana, and grape are fruits; carrot is a vegetable.",
      ja: "リンゴ・バナナ・ブドウは果物、ニンジンは野菜です。",
      fr: "Pomme, banane et raisin sont des fruits; la carotte est un légume.",
      es: "Manzana, plátano y uva son frutas; la zanahoria es una verdura.",
      zh: "苹果、香蕉、葡萄是水果；胡萝卜是蔬菜。",
    },
    points: 5,
  },
  // 15 – logic (probability intuition)
  {
    id: 15,
    type: "logic",
    visual: "🎲 + 🎲",
    prompt: {
      ko: "두 개의 공정한 주사위를 던질 때 합이 7이 될 확률이 가장 높은가, 아닌가?",
      en: "When rolling two fair dice, is the sum of 7 the most probable outcome?",
      ja: "公正な2つのサイコロを振るとき、合計7が最も確率が高い結果か？",
      fr: "En lançant deux dés équitables, la somme de 7 est-elle le résultat le plus probable ?",
      es: "Al lanzar dos dados justos, ¿es la suma de 7 el resultado más probable?",
      zh: "掷两颗公平骰子时，总和为7是最可能的结果吗？",
    },
    optionLabels: {
      ko: ["예 — 7을 만드는 조합이 6가지로 가장 많음", "아니오 — 6이나 8이 더 확률이 높음", "아니오 — 모든 합의 확률은 같음", "아니오 — 12가 가장 확률이 높음"],
      en: ["Yes — 7 has 6 combinations, more than any other sum", "No — 6 or 8 are more probable", "No — all sums are equally likely", "No — 12 is most probable"],
      ja: ["はい — 7は6通りの組み合わせで最も多い", "いいえ — 6か8の方が確率が高い", "いいえ — 全ての合計の確率は等しい", "いいえ — 12が最も確率が高い"],
      fr: ["Oui — 7 a 6 combinaisons, plus que tout autre somme", "Non — 6 ou 8 sont plus probables", "Non — toutes les sommes sont également probables", "Non — 12 est le plus probable"],
      es: ["Sí — el 7 tiene 6 combinaciones, más que cualquier otra suma", "No — el 6 u 8 son más probables", "No — todas las sumas son igualmente probables", "No — el 12 es el más probable"],
      zh: ["是的 — 7有6种组合，多于任何其他总和", "否 — 6或8更可能", "否 — 所有总和的概率相同", "否 — 12最可能"],
    },
    options: ["A", "B", "C", "D"],
    answer: 0,
    explanation: {
      ko: "7을 만드는 조합: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6가지. 어떤 합보다 많아 확률이 가장 높습니다.",
      en: "Combinations summing to 7: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6. More than any other sum, so 7 is most probable.",
      ja: "7を作る組み合わせ：(1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6通り。どの合計より多く、最も確率が高いです。",
      fr: "Combinaisons totalisant 7 : (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6. Plus que toute autre somme.",
      es: "Combinaciones que suman 7: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6. Más que cualquier otra suma.",
      zh: "总和为7的组合：(1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6种。多于任何其他总和，所以7最可能。",
    },
    points: 8,
  },
];

const TOTAL_POINTS = QUESTIONS.reduce((s, q) => s + q.points, 0);
const TIME_PER_QUESTION = 30; // seconds
const TOTAL_TIME = QUESTIONS.length * TIME_PER_QUESTION;

// ─── Score → IQ mapping ───────────────────────────────────────────────────────

function scoreToIQ(score: number): number {
  const ratio = score / TOTAL_POINTS;
  if (ratio >= 0.93) return 135;
  if (ratio >= 0.85) return 125;
  if (ratio >= 0.73) return 118;
  if (ratio >= 0.60) return 108;
  if (ratio >= 0.45) return 96;
  if (ratio >= 0.30) return 86;
  return 76;
}

function getBandKey(iq: number): string {
  if (iq >= 130) return "130+";
  if (iq >= 120) return "120";
  if (iq >= 110) return "110";
  if (iq >= 90)  return "100";
  if (iq >= 80)  return "90";
  return "low";
}

function getPercentile(iq: number): string {
  if (iq >= 130) return "2%";
  if (iq >= 120) return "10%";
  if (iq >= 110) return "25%";
  if (iq >= 100) return "50%";
  if (iq >= 90)  return "75%";
  return "90%";
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "intro" | "test" | "result" | "review";

export default function IQTest({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Timer
  useEffect(() => {
    if (phase !== "test") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishTest(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const finishTest = (ans: (number | null)[]) => {
    clearInterval(timerRef.current);
    const total = QUESTIONS.reduce((acc, q, i) => {
      return acc + (ans[i] === q.answer ? q.points : 0);
    }, 0);
    setScore(total);
    setPhase("result");
  };

  const select = (optIndex: number) => {
    const next = [...answers];
    next[currentIndex] = optIndex;
    setAnswers(next);
  };

  const next = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishTest(answers);
    }
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setPhase("intro");
    setCurrentIndex(0);
    setAnswers(Array(QUESTIONS.length).fill(null));
    setTimeLeft(TOTAL_TIME);
    setScore(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">🧩</div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 text-sm">{t.subtitle}</p>
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
          <div className="bg-indigo-50 rounded-xl p-3 text-indigo-700 font-medium">
            📋 {QUESTIONS.length} Questions
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-purple-700 font-medium">
            ⏱ {Math.floor(TOTAL_TIME / 60)} min
          </div>
          {(["number", "pattern", "logic", "spatial", "verbal"] as QuestionType[]).map((type) => (
            <div key={type} className="bg-gray-50 rounded-xl p-2 text-gray-600 text-xs">
              {t.typeLabels[type]}
            </div>
          ))}
        </div>
        <button
          onClick={() => setPhase("test")}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t.startBtn}
        </button>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">{t.disclaimer}</p>
      </div>
    );
  }

  // ── Test ───────────────────────────────────────────────────────────────────
  if (phase === "test") {
    const q = QUESTIONS[currentIndex];
    const selected = answers[currentIndex];
    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
    const optLabels = q.optionLabels?.[locale] ?? q.options;
    const isLast = currentIndex === QUESTIONS.length - 1;
    const timeRatio = timeLeft / TOTAL_TIME;
    const timerColor = timeRatio > 0.5 ? "text-green-600" : timeRatio > 0.25 ? "text-amber-500" : "text-red-500";

    return (
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            {t.questionOf(currentIndex + 1, QUESTIONS.length)}
          </span>
          <span className={`text-sm font-bold ${timerColor}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Type badge */}
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
            {t.typeLabels[q.type]}
          </span>

          {/* Visual */}
          {q.visual && (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-lg font-mono whitespace-pre-line text-gray-800 leading-relaxed">
              {q.visual}
            </div>
          )}

          {/* Prompt */}
          <p className="text-base font-medium text-gray-800">{q.prompt[locale]}</p>

          {/* Options */}
          <div className="space-y-2">
            {optLabels.map((label, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => select(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-100 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2 font-bold text-gray-400">{String.fromCharCode(65 + i)}.</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm disabled:opacity-30"
          >
            {t.prevBtn}
          </button>
          <button
            onClick={next}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors text-sm ${
              selected !== null
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={selected === null}
          >
            {isLast ? t.submitBtn : t.nextBtn}
          </button>
        </div>

        {/* Answered dots */}
        <div className="flex flex-wrap gap-1 justify-center">
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                i === currentIndex
                  ? "bg-indigo-600 text-white"
                  : answers[i] !== null
                  ? "bg-indigo-200 text-indigo-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const iq = scoreToIQ(score);
    const bandKey = getBandKey(iq);
    const band = t.bands[bandKey];
    const pct = getPercentile(iq);
    const correctCount = QUESTIONS.filter((q, i) => answers[i] === q.answer).length;

    const iqColor =
      iq >= 130 ? "text-violet-600" :
      iq >= 120 ? "text-indigo-600" :
      iq >= 110 ? "text-blue-600" :
      iq >= 90  ? "text-green-600" :
      iq >= 80  ? "text-amber-600" :
      "text-red-500";

    const bgGrad =
      iq >= 130 ? "from-violet-50 to-purple-50 border-violet-200" :
      iq >= 120 ? "from-indigo-50 to-blue-50 border-indigo-200" :
      iq >= 110 ? "from-blue-50 to-cyan-50 border-blue-200" :
      iq >= 90  ? "from-green-50 to-emerald-50 border-green-200" :
      iq >= 80  ? "from-amber-50 to-yellow-50 border-amber-200" :
      "from-red-50 to-rose-50 border-red-200";

    return (
      <div className="space-y-5">
        {/* IQ Card */}
        <div className={`rounded-2xl border-2 bg-gradient-to-br ${bgGrad} p-6 text-center space-y-2`}>
          <div className="text-4xl">🧠</div>
          <p className="text-sm text-gray-500 font-medium">{t.estimatedIQ}</p>
          <p className={`text-6xl font-black ${iqColor}`}>{iq}</p>
          <p className="text-sm font-semibold text-gray-700">{band.label}</p>
          <p className="text-xs text-gray-500">{band.description}</p>
          <div className="flex justify-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-xs text-gray-400">{t.yourScore}</p>
              <p className="text-xl font-bold text-gray-700">{score} / {TOTAL_POINTS}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">{t.percentile}</p>
              <p className="text-xl font-bold text-gray-700">{pct}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">{t.correct}</p>
              <p className="text-xl font-bold text-gray-700">{correctCount} / {QUESTIONS.length}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t.retakeBtn}
          </button>
          <button
            onClick={() => setPhase("review")}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {t.reviewBtn}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">{t.disclaimer}</p>
      </div>
    );
  }

  // ── Review ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t.reviewBtn}</h2>
        <button
          onClick={() => setPhase("result")}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← {t.yourScore}
        </button>
      </div>
      {QUESTIONS.map((q, i) => {
        const userAns = answers[i];
        const isCorrect = userAns === q.answer;
        const optLabels = q.optionLabels?.[locale] ?? q.options;
        return (
          <div
            key={q.id}
            className={`rounded-2xl border-2 p-4 space-y-3 ${
              isCorrect ? "border-green-200 bg-green-50" : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-sm font-bold ${isCorrect ? "text-green-600" : "text-rose-500"}`}>
                {isCorrect ? "✅" : "❌"} Q{i + 1}
              </span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 border">
                {t.typeLabels[q.type]} · {q.points}pt
              </span>
            </div>
            {q.visual && (
              <div className="bg-white rounded-lg p-2 text-center text-sm font-mono whitespace-pre-line text-gray-700">
                {q.visual}
              </div>
            )}
            <p className="text-sm font-medium text-gray-800">{q.prompt[locale]}</p>
            <div className="space-y-1">
              {optLabels.map((label, oi) => {
                const isUser = userAns === oi;
                const isAnsw = q.answer === oi;
                return (
                  <div
                    key={oi}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                      isAnsw
                        ? "border-green-400 bg-green-100 text-green-800"
                        : isUser
                        ? "border-rose-400 bg-rose-100 text-rose-700"
                        : "border-transparent bg-white text-gray-500"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {label}
                    {isAnsw && " ✓"}
                    {isUser && !isAnsw && " ✗"}
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
              💡 {t.explanation}: {q.explanation[locale]}
            </div>
          </div>
        );
      })}
      <button
        onClick={reset}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
      >
        {t.retakeBtn}
      </button>
    </div>
  );
}
