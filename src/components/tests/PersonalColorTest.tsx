import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Season = "spring" | "summer" | "autumn" | "winter";

// ─── i18n UI strings ──────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  startBtn: string;
  nextBtn: string;
  prevBtn: string;
  resultBtn: string;
  retakeBtn: string;
  questionOf: (cur: number, total: number) => string;
  yourType: string;
  toneLabel: string;
  bestColorsLabel: string;
  avoidColorsLabel: string;
  makeupLabel: string;
  fashionLabel: string;
  celebsLabel: string;
  disclaimer: string;
}> = {
  ko: {
    title: "퍼스널 컬러 테스트",
    subtitle: "나에게 가장 잘 어울리는 색상 계절을 찾아보세요",
    startBtn: "테스트 시작",
    nextBtn: "다음",
    prevBtn: "이전",
    resultBtn: "결과 보기",
    retakeBtn: "다시 하기",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "나의 퍼스널 컬러",
    toneLabel: "톤 특징",
    bestColorsLabel: "잘 어울리는 색상",
    avoidColorsLabel: "피하면 좋은 색상",
    makeupLabel: "메이크업 추천",
    fashionLabel: "패션 스타일",
    celebsLabel: "같은 타입 셀럽",
    disclaimer: "퍼스널 컬러 진단은 전문 컨설턴트 방문 시 더 정확한 결과를 얻을 수 있습니다.",
  },
  en: {
    title: "Personal Color Test",
    subtitle: "Discover your most flattering color season",
    startBtn: "Start Test",
    nextBtn: "Next",
    prevBtn: "Back",
    resultBtn: "See Results",
    retakeBtn: "Retake",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "Your Personal Color",
    toneLabel: "Tone Characteristics",
    bestColorsLabel: "Best Colors",
    avoidColorsLabel: "Colors to Avoid",
    makeupLabel: "Makeup Tips",
    fashionLabel: "Fashion Style",
    celebsLabel: "Same Type Celebrities",
    disclaimer: "For the most accurate results, consult a professional personal color analyst.",
  },
  ja: {
    title: "パーソナルカラー診断",
    subtitle: "あなたに最も似合う色のシーズンを見つけましょう",
    startBtn: "診断を始める",
    nextBtn: "次へ",
    prevBtn: "前へ",
    resultBtn: "結果を見る",
    retakeBtn: "もう一度",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "あなたのパーソナルカラー",
    toneLabel: "トーンの特徴",
    bestColorsLabel: "似合う色",
    avoidColorsLabel: "避けたい色",
    makeupLabel: "メイクアップのヒント",
    fashionLabel: "ファッションスタイル",
    celebsLabel: "同じタイプの有名人",
    disclaimer: "より正確な診断はプロのカラーコンサルタントにご相談ください。",
  },
  fr: {
    title: "Test de Couleurs Personnelles",
    subtitle: "Découvrez la saison de couleurs qui vous va le mieux",
    startBtn: "Commencer le test",
    nextBtn: "Suivant",
    prevBtn: "Précédent",
    resultBtn: "Voir les résultats",
    retakeBtn: "Recommencer",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "Votre couleur personnelle",
    toneLabel: "Caractéristiques",
    bestColorsLabel: "Meilleures couleurs",
    avoidColorsLabel: "Couleurs à éviter",
    makeupLabel: "Conseils maquillage",
    fashionLabel: "Style vestimentaire",
    celebsLabel: "Célébrités du même type",
    disclaimer: "Pour des résultats précis, consultez un analyste professionnel.",
  },
  es: {
    title: "Test de Color Personal",
    subtitle: "Descubre tu temporada de color más favorecedora",
    startBtn: "Iniciar test",
    nextBtn: "Siguiente",
    prevBtn: "Anterior",
    resultBtn: "Ver resultados",
    retakeBtn: "Repetir",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "Tu color personal",
    toneLabel: "Características del tono",
    bestColorsLabel: "Mejores colores",
    avoidColorsLabel: "Colores a evitar",
    makeupLabel: "Consejos de maquillaje",
    fashionLabel: "Estilo de moda",
    celebsLabel: "Celebridades del mismo tipo",
    disclaimer: "Para resultados más precisos, consulta a un analista profesional.",
  },
  zh: {
    title: "个人色彩诊断",
    subtitle: "找出最适合你的色彩季节",
    startBtn: "开始测试",
    nextBtn: "下一题",
    prevBtn: "上一题",
    resultBtn: "查看结果",
    retakeBtn: "重新测试",
    questionOf: (c, t) => `${c} / ${t}`,
    yourType: "你的个人色彩",
    toneLabel: "色调特征",
    bestColorsLabel: "最适合的颜色",
    avoidColorsLabel: "建议避免的颜色",
    makeupLabel: "妆容建议",
    fashionLabel: "时尚风格",
    celebsLabel: "同类型名人",
    disclaimer: "如需更准确的诊断，请咨询专业色彩顾问。",
  },
};

// ─── Questions ────────────────────────────────────────────────────────────────

interface Option {
  text: Record<Locale, string>;
  scores: Partial<Record<Season, number>>;
}

interface Question {
  id: number;
  text: Record<Locale, string>;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: {
      ko: "자연 상태의 피부색(화장 전)은 어떤 느낌인가요?",
      en: "What is your natural skin tone (without makeup)?",
      ja: "素肌（メイク前）の肌色はどんな感じですか？",
      fr: "Quelle est votre teint naturel (sans maquillage) ?",
      es: "¿Cuál es tu tono de piel natural (sin maquillaje)?",
      zh: "你的自然肤色（未化妆时）是什么感觉？",
    },
    options: [
      {
        text: {
          ko: "밝고 맑은 복숭아빛·살구빛",
          en: "Bright, clear peachy or apricot tone",
          ja: "明るく透明感のあるピーチ・アプリコット系",
          fr: "Teint pêche ou abricot clair et lumineux",
          es: "Tono melocotón o albaricoque claro y luminoso",
          zh: "明亮清透的桃色或杏色",
        },
        scores: { spring: 3 },
      },
      {
        text: {
          ko: "밝고 핑크빛이 도는 흰 피부",
          en: "Bright, rosy-pink fair skin",
          ja: "明るくピンク味がかった白い肌",
          fr: "Teint clair, rose et lumineux",
          es: "Piel clara, rosada y luminosa",
          zh: "明亮帶粉紅色調的白皙肌膚",
        },
        scores: { summer: 3 },
      },
      {
        text: {
          ko: "따뜻한 황금빛·올리브빛",
          en: "Warm golden or olive tone",
          ja: "温かみのあるゴールド・オリーブ系",
          fr: "Teint doré ou olive chaud",
          es: "Tono dorado u oliva cálido",
          zh: "温暖的金黄色或橄榄色调",
        },
        scores: { autumn: 3 },
      },
      {
        text: {
          ko: "차갑고 선명한 흰 피부 또는 어두운 피부",
          en: "Cool, clear fair or deep/dark skin",
          ja: "クールで鮮明な白い肌、または暗い肌",
          fr: "Teint clair froid et net, ou foncé",
          es: "Piel clara fría y definida, o piel oscura",
          zh: "冷色調清晰的白皙或深色肌膚",
        },
        scores: { winter: 3 },
      },
    ],
  },
  {
    id: 2,
    text: {
      ko: "눈동자 색깔은 어떤가요?",
      en: "What color are your eyes?",
      ja: "瞳の色はどうですか？",
      fr: "De quelle couleur sont vos yeux ?",
      es: "¿De qué color son tus ojos?",
      zh: "你的眼睛是什么颜色？",
    },
    options: [
      {
        text: {
          ko: "밝은 갈색·황금빛 갈색",
          en: "Light brown or golden brown",
          ja: "明るいブラウン・ゴールドブラウン",
          fr: "Marron clair ou marron doré",
          es: "Marrón claro o marrón dorado",
          zh: "淺棕色或金棕色",
        },
        scores: { spring: 3, autumn: 1 },
      },
      {
        text: {
          ko: "부드러운 회갈색·그레이",
          en: "Soft grey-brown or grey",
          ja: "柔らかいグレーブラウン・グレー",
          fr: "Gris-brun doux ou gris",
          es: "Gris-marrón suave o gris",
          zh: "柔和的灰棕色或灰色",
        },
        scores: { summer: 3 },
      },
      {
        text: {
          ko: "짙은 갈색·올리브빛 갈색",
          en: "Deep brown or olive-brown",
          ja: "濃いブラウン・オリーブブラウン",
          fr: "Marron foncé ou marron olive",
          es: "Marrón oscuro o marrón oliva",
          zh: "深棕色或橄欖棕色",
        },
        scores: { autumn: 3 },
      },
      {
        text: {
          ko: "검은색·아주 짙은 다크 브라운",
          en: "Black or very dark brown",
          ja: "黒・非常に濃いダークブラウン",
          fr: "Noir ou marron très foncé",
          es: "Negro o marrón muy oscuro",
          zh: "黑色或非常深的深棕色",
        },
        scores: { winter: 3 },
      },
    ],
  },
  {
    id: 3,
    text: {
      ko: "햇빛을 받았을 때 머리카락 색은?",
      en: "What color does your hair appear in sunlight?",
      ja: "日光を受けたときの髪の色は？",
      fr: "De quelle couleur apparaissent vos cheveux au soleil ?",
      es: "¿Qué color tiene tu cabello bajo la luz del sol?",
      zh: "在阳光下你的头发是什么颜色？",
    },
    options: [
      {
        text: {
          ko: "밝은 갈색·금빛이 도는 갈색",
          en: "Light or golden-brown",
          ja: "明るいブラウン・金色がかったブラウン",
          fr: "Brun clair ou brun doré",
          es: "Marrón claro o marrón dorado",
          zh: "淺棕色或帶金色的棕色",
        },
        scores: { spring: 3 },
      },
      {
        text: {
          ko: "쿨톤 갈색·재빛 브라운·애쉬",
          en: "Ash brown, cool brown or grey-toned",
          ja: "クールブラウン・灰色がかったブラウン・アッシュ",
          fr: "Brun cendré, brun froid ou grisâtre",
          es: "Marrón ceniciento, marrón frío o grisáceo",
          zh: "冷色調棕色、灰棕色或灰褐色",
        },
        scores: { summer: 3 },
      },
      {
        text: {
          ko: "붉은빛·구리빛이 도는 따뜻한 갈색",
          en: "Warm brown with reddish or copper highlights",
          ja: "赤みがかった・銅色の温かみのあるブラウン",
          fr: "Brun chaud aux reflets roux ou cuivrés",
          es: "Marrón cálido con reflejos rojizos o cobrizo",
          zh: "帶紅色或銅色光澤的溫暖棕色",
        },
        scores: { autumn: 3 },
      },
      {
        text: {
          ko: "검은색·아주 짙은 다크 브라운",
          en: "Black or very dark brown",
          ja: "黒・非常に濃いダークブラウン",
          fr: "Noir ou brun très foncé",
          es: "Negro o marrón muy oscuro",
          zh: "黑色或非常深的深棕色",
        },
        scores: { winter: 3 },
      },
    ],
  },
  {
    id: 4,
    text: {
      ko: "화이트 옷과 아이보리/크림 옷 중 어느 것이 더 잘 어울리나요?",
      en: "Which looks better on you — pure white or ivory/cream?",
      ja: "ホワイトとアイボリー/クリームはどちらが似合いますか？",
      fr: "Lequel vous convient le mieux — blanc pur ou ivoire/crème ?",
      es: "¿Qué te queda mejor — blanco puro o marfil/crema?",
      zh: "純白色和象牙色/米色，哪個更適合你？",
    },
    options: [
      {
        text: {
          ko: "아이보리·크림이 더 자연스럽고 밝아 보임",
          en: "Ivory/cream looks more natural and bright",
          ja: "アイボリー・クリームの方が自然で明るく見える",
          fr: "L'ivoire/crème semble plus naturel et lumineux",
          es: "El marfil/crema se ve más natural y brillante",
          zh: "象牙色/米色看起來更自然明亮",
        },
        scores: { spring: 2, autumn: 1 },
      },
      {
        text: {
          ko: "잘 모르겠음 (둘 다 비슷)",
          en: "Not sure — both look similar",
          ja: "よくわからない（両方似ている）",
          fr: "Je ne sais pas — les deux se ressemblent",
          es: "No estoy seguro — ambos se ven similares",
          zh: "不確定，兩個差不多",
        },
        scores: { summer: 1, winter: 1 },
      },
      {
        text: {
          ko: "아이보리·베이지가 피부에 따뜻하게 녹아드는 느낌",
          en: "Ivory/beige blends warmly with my skin",
          ja: "アイボリー・ベージュが肌に温かく馴染む感じ",
          fr: "L'ivoire/beige se fond chaleureusement dans ma peau",
          es: "El marfil/beige se funde cálidamente con mi piel",
          zh: "象牙色/米色溫暖地融入我的膚色",
        },
        scores: { autumn: 2 },
      },
      {
        text: {
          ko: "순백색이 더 선명하고 세련되어 보임",
          en: "Pure white looks sharper and more sophisticated",
          ja: "純白の方がより鮮明でスタイリッシュに見える",
          fr: "Le blanc pur semble plus net et sophistiqué",
          es: "El blanco puro se ve más nítido y sofisticado",
          zh: "纯白色看起来更清晰时尚",
        },
        scores: { winter: 2, summer: 1 },
      },
    ],
  },
  {
    id: 5,
    text: {
      ko: "금색 액세서리와 은색 액세서리 중 어느 쪽이 더 잘 어울리나요?",
      en: "Which accessories suit you better — gold or silver?",
      ja: "ゴールドとシルバーのアクセサリー、どちらが似合いますか？",
      fr: "Quels accessoires vous vont mieux — or ou argent ?",
      es: "¿Qué accesorios te quedan mejor — oro o plata?",
      zh: "金色和銀色飾品，哪個更適合你？",
    },
    options: [
      {
        text: {
          ko: "금색이 확실히 더 잘 어울림",
          en: "Gold definitely suits me better",
          ja: "ゴールドの方が明らかに似合う",
          fr: "L'or me va clairement mieux",
          es: "El oro me queda claramente mejor",
          zh: "金色明显更适合我",
        },
        scores: { spring: 2, autumn: 2 },
      },
      {
        text: {
          ko: "은색·로즈골드가 더 자연스러움",
          en: "Silver or rose gold feels more natural",
          ja: "シルバー・ローズゴールドの方が自然に馴染む",
          fr: "L'argent ou l'or rose me semble plus naturel",
          es: "La plata o el oro rosa me parece más natural",
          zh: "银色或玫瑰金感觉更自然",
        },
        scores: { summer: 2, winter: 1 },
      },
      {
        text: {
          ko: "차가운 은색이 피부를 더 밝게 살려줌",
          en: "Cool silver brightens my complexion",
          ja: "クールなシルバーが肌をより明るく引き立てる",
          fr: "L'argent froid illumine mon teint",
          es: "La plata fría ilumina mi tez",
          zh: "冷色調的銀色讓肌膚更明亮",
        },
        scores: { winter: 2 },
      },
      {
        text: {
          ko: "따뜻한 로즈골드·앤틱 골드가 좋음",
          en: "Warm rose gold or antique gold suits me",
          ja: "温かみのあるローズゴールド・アンティークゴールドが好き",
          fr: "L'or rose chaud ou l'or antique me convient",
          es: "El oro rosa cálido o el oro antiguo me queda bien",
          zh: "溫暖的玫瑰金或古董金更適合我",
        },
        scores: { autumn: 2, spring: 1 },
      },
    ],
  },
  {
    id: 6,
    text: {
      ko: "피부에 혈색이 비쳐 보이나요?",
      en: "Is your skin's undertone visible (redness/warmth under skin)?",
      ja: "肌に赤みやぬくもりが透けて見えますか？",
      fr: "Le sous-ton de votre peau est-il visible (rouge/chaleur) ?",
      es: "¿Es visible el subtono de tu piel (rojez/calidez)?",
      zh: "你的膚色底調是否可見（紅潤/溫暖）？",
    },
    options: [
      {
        text: {
          ko: "복숭아·코랄빛이 은은하게 비침",
          en: "Subtle peachy or coral undertone",
          ja: "ピーチ・コーラルがほんのり透けて見える",
          fr: "Sous-ton pêche ou corail subtil",
          es: "Subtono melocotón o coral sutil",
          zh: "淡淡的桃色或珊瑚色底調",
        },
        scores: { spring: 3 },
      },
      {
        text: {
          ko: "핑크·라벤더빛이 돌아 창백해 보이기도 함",
          en: "Pink or lavender undertone, sometimes looking pale",
          ja: "ピンク・ラベンダー系で、青白く見えることも",
          fr: "Sous-ton rose ou lavande, parfois pâle",
          es: "Subtono rosa o lavanda, a veces luciendo pálido",
          zh: "带粉红或薰衣草色调，有时显得苍白",
        },
        scores: { summer: 3 },
      },
      {
        text: {
          ko: "따뜻한 황금빛·베이지 느낌이 강함",
          en: "Strong warm golden or beige undertone",
          ja: "温かみのあるゴールド・ベージュ系が強い",
          fr: "Fort sous-ton chaud doré ou beige",
          es: "Subtono cálido dorado o beige fuerte",
          zh: "明显的温暖金色或米色底调",
        },
        scores: { autumn: 3 },
      },
      {
        text: {
          ko: "차갑고 선명해 혈색이 잘 안 보임",
          en: "Cool and clear — undertone barely visible",
          ja: "クールで鮮明、血色がほとんど見えない",
          fr: "Froid et net — sous-ton à peine visible",
          es: "Frío y claro — subtono apenas visible",
          zh: "冷色調清晰，底調幾乎不可見",
        },
        scores: { winter: 3 },
      },
    ],
  },
  {
    id: 7,
    text: {
      ko: "선명한 원색 옷을 입었을 때 어떤 느낌인가요?",
      en: "How do you look in bright, vivid colors?",
      ja: "鮮やかな原色の服を着たときはどうですか？",
      fr: "Comment vous sentez-vous dans des couleurs vives ?",
      es: "¿Cómo te ves con colores vivos y brillantes?",
      zh: "穿上鲜艳的纯色服装时感觉如何？",
    },
    options: [
      {
        text: {
          ko: "선명하지만 따뜻한 코랄·피치·옐로우가 어울림",
          en: "Warm vivid colors like coral, peach, yellow suit me",
          ja: "鮮やかでも温かみのあるコーラル・ピーチ・イエローが似合う",
          fr: "Les couleurs vives chaudes comme corail, pêche, jaune me vont",
          es: "Los colores vivos cálidos como coral, melocotón, amarillo me quedan bien",
          zh: "珊瑚、桃色、黄色等温暖鲜艳色彩适合我",
        },
        scores: { spring: 2 },
      },
      {
        text: {
          ko: "부드럽고 흐린 파스텔이 더 잘 어울림",
          en: "Soft, muted pastels suit me better",
          ja: "柔らかくくすんだパステルカラーの方が似合う",
          fr: "Les pastels doux et estompés me conviennent mieux",
          es: "Los pasteles suaves y apagados me quedan mejor",
          zh: "柔和霧化的粉彩色調更適合我",
        },
        scores: { summer: 2 },
      },
      {
        text: {
          ko: "깊고 따뜻한 어스톤·머스터드·테라코타가 어울림",
          en: "Deep warm earth tones, mustard, terracotta suit me",
          ja: "深みのある温かいアースカラー・マスタード・テラコッタが似合う",
          fr: "Les tons terreux chauds profonds, moutarde, terracotta me conviennent",
          es: "Los tonos tierra cálidos profundos, mostaza, terracota me quedan bien",
          zh: "深沉温暖的大地色、芥末黄、砖红色适合我",
        },
        scores: { autumn: 2 },
      },
      {
        text: {
          ko: "차갑고 선명한 원색이나 블랙·화이트 대비가 강렬하게 잘 어울림",
          en: "Cool vivid colors or black-white contrast looks striking on me",
          ja: "クールで鮮明な原色、またはブラック・ホワイトのコントラストが強烈に似合う",
          fr: "Les couleurs vives froides ou le contraste noir-blanc me vont à merveille",
          es: "Los colores vivos fríos o el contraste negro-blanco me quedan muy bien",
          zh: "冷色调鲜艳颜色或黑白对比在我身上很有冲击力",
        },
        scores: { winter: 2 },
      },
    ],
  },
  {
    id: 8,
    text: {
      ko: "볼 부위 피부가 햇빛을 받으면 어떻게 되나요?",
      en: "How does your cheek skin react to sunlight?",
      ja: "頬の肌は日光にあたるとどうなりますか？",
      fr: "Comment votre peau réagit-elle au soleil sur les joues ?",
      es: "¿Cómo reacciona la piel de tus mejillas al sol?",
      zh: "你的脸颊肌肤在阳光下有何反应？",
    },
    options: [
      {
        text: {
          ko: "금방 핑크빛이 돌고 쉽게 탐, 잘 지워짐",
          en: "Turns pink quickly, tans easily, fades fast",
          ja: "すぐピンクになり、焼けやすく、すぐ消える",
          fr: "Rosit rapidement, bronze facilement, se décolore vite",
          es: "Se pone rosa rápido, se broncea fácilmente, se desvanece rápido",
          zh: "很快變粉紅，容易曬黑，很快消退",
        },
        scores: { spring: 2 },
      },
      {
        text: {
          ko: "잘 타지 않고 창백해지거나 붉어짐",
          en: "Rarely tans, tends to redden or stay pale",
          ja: "なかなか焼けず、赤くなるか青白いまま",
          fr: "Bronze rarement, rougit ou reste pâle",
          es: "Raramente se broncea, tiende a enrojecerse o permanecer pálida",
          zh: "不容易曬黑，傾向於發紅或保持蒼白",
        },
        scores: { summer: 2 },
      },
      {
        text: {
          ko: "따뜻한 골든 브라운으로 자연스럽게 잘 탐",
          en: "Tans naturally to a warm golden brown",
          ja: "温かみのあるゴールデンブラウンに自然に焼ける",
          fr: "Bronze naturellement en brun doré chaud",
          es: "Se broncea naturalmente a un marrón dorado cálido",
          zh: "自然曬成溫暖的金棕色",
        },
        scores: { autumn: 2 },
      },
      {
        text: {
          ko: "잘 타지 않거나, 타면 블루이쉬·그레이빛 도는 어두운 색으로 탐",
          en: "Rarely tans, or tans to a bluish/grey-dark tone",
          ja: "なかなか焼けないか、焼けても青みがかった暗い色になる",
          fr: "Bronze rarement, ou prend une teinte foncée bleutée/grise",
          es: "Raramente se broncea, o se pone oscuro con tonos azulados/grises",
          zh: "不容易曬黑，或曬黑後呈現偏藍或灰黑色調",
        },
        scores: { winter: 2 },
      },
    ],
  },
  {
    id: 9,
    text: {
      ko: "다음 중 내 피부를 가장 생기있어 보이게 하는 색은?",
      en: "Which color makes your skin look most alive and vibrant?",
      ja: "次のうち、肌を最も生き生きと見せる色は？",
      fr: "Quelle couleur donne le plus de vie à votre peau ?",
      es: "¿Qué color hace que tu piel luzca más viva?",
      zh: "哪种颜色让你的肌肤看起来最有活力？",
    },
    options: [
      {
        text: {
          ko: "밝은 코랄·살구·피치",
          en: "Bright coral, apricot, or peach",
          ja: "明るいコーラル・アプリコット・ピーチ",
          fr: "Corail vif, abricot ou pêche",
          es: "Coral brillante, albaricoque o melocotón",
          zh: "明亮的珊瑚色、杏色或桃色",
        },
        scores: { spring: 3 },
      },
      {
        text: {
          ko: "로즈·라일락·소프트 핑크",
          en: "Rose, lilac, or soft pink",
          ja: "ローズ・ライラック・ソフトピンク",
          fr: "Rose, lilas ou rose doux",
          es: "Rosa, lila o rosa suave",
          zh: "玫瑰色、丁香紫或柔和粉紅",
        },
        scores: { summer: 3 },
      },
      {
        text: {
          ko: "올리브·테라코타·머스터드·카멜",
          en: "Olive, terracotta, mustard, or camel",
          ja: "オリーブ・テラコッタ・マスタード・キャメル",
          fr: "Olive, terracotta, moutarde ou camel",
          es: "Oliva, terracota, mostaza o camello",
          zh: "橄榄绿、砖红、芥末黄或驼色",
        },
        scores: { autumn: 3 },
      },
      {
        text: {
          ko: "퓨어 화이트·레드·블랙·로열 블루·마젠타",
          en: "Pure white, red, black, royal blue, or magenta",
          ja: "ピュアホワイト・レッド・ブラック・ロイヤルブルー・マゼンタ",
          fr: "Blanc pur, rouge, noir, bleu royal ou magenta",
          es: "Blanco puro, rojo, negro, azul real o magenta",
          zh: "純白、紅色、黑色、皇家藍或洋紅",
        },
        scores: { winter: 3 },
      },
    ],
  },
  {
    id: 10,
    text: {
      ko: "전반적인 이미지·분위기는?",
      en: "What best describes your overall look and vibe?",
      ja: "全体的なイメージ・雰囲気は？",
      fr: "Quelle est l'ambiance générale de votre apparence ?",
      es: "¿Cuál describe mejor tu apariencia general?",
      zh: "你的整体形象和气质最像哪一种？",
    },
    options: [
      {
        text: {
          ko: "밝고 화사하고 귀여운 봄날 같은 느낌",
          en: "Bright, fresh, cute — like a spring day",
          ja: "明るく華やかでかわいい、春の日のような感じ",
          fr: "Lumineux, frais, mignon — comme un jour de printemps",
          es: "Brillante, fresco, lindo — como un día de primavera",
          zh: "明亮、清新、可愛，像春天一樣",
        },
        scores: { spring: 2 },
      },
      {
        text: {
          ko: "부드럽고 우아하고 시원한 여름 같은 느낌",
          en: "Soft, elegant, refreshing — like summer",
          ja: "柔らかくエレガントで涼やかな夏のような感じ",
          fr: "Doux, élégant, rafraîchissant — comme l'été",
          es: "Suave, elegante, refrescante — como el verano",
          zh: "柔和、优雅、清凉，像夏天一样",
        },
        scores: { summer: 2 },
      },
      {
        text: {
          ko: "성숙하고 깊이 있고 따뜻한 가을 같은 느낌",
          en: "Mature, rich, warm — like autumn",
          ja: "成熟していて深みがあり温かな秋のような感じ",
          fr: "Mature, riche, chaud — comme l'automne",
          es: "Maduro, profundo, cálido — como el otoño",
          zh: "成熟、深邃、溫暖，像秋天一樣",
        },
        scores: { autumn: 2 },
      },
      {
        text: {
          ko: "선명하고 강렬하고 세련된 겨울 같은 느낌",
          en: "Sharp, intense, sophisticated — like winter",
          ja: "鮮明で強烈でスタイリッシュな冬のような感じ",
          fr: "Net, intense, sophistiqué — comme l'hiver",
          es: "Nítido, intenso, sofisticado — como el invierno",
          zh: "清晰、強烈、精緻，像冬天一樣",
        },
        scores: { winter: 2 },
      },
    ],
  },
];

// ─── Season result data ───────────────────────────────────────────────────────

interface SeasonData {
  emoji: string;
  gradient: string;
  headerBg: string;
  badge: string;
  name: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  tone: Record<Locale, string>;
  bestColors: { name: Record<Locale, string>; hex: string }[];
  avoidColors: { name: Record<Locale, string>; hex: string }[];
  makeup: Record<Locale, string[]>;
  fashion: Record<Locale, string[]>;
  celebs: string[];
}

const SEASONS: Record<Season, SeasonData> = {
  spring: {
    emoji: "🌸",
    gradient: "from-rose-100 to-amber-50",
    headerBg: "bg-gradient-to-br from-rose-200 to-amber-100",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    name: { ko: "봄 웜톤", en: "Spring Warm", ja: "スプリング ウォーム", fr: "Printemps Chaud", es: "Primavera Cálida", zh: "春暖色", },
    subtitle: {
      ko: "밝고 화사한 웜톤 — 맑고 투명한 봄의 에너지",
      en: "Bright and vibrant warm tones — clear, fresh spring energy",
      ja: "明るく華やかなウォームトーン — 透き通った春のエネルギー",
      fr: "Tons chauds lumineux et vibrants — énergie printanière claire",
      es: "Tonos cálidos brillantes y vibrantes — energía de primavera clara",
      zh: "明亮活潑的暖色調——清透的春日能量",
    },
    tone: {
      ko: "황금빛이 섞인 밝고 투명한 웜톤. 피부에 노란 기운이 있으며 맑고 선명한 느낌입니다. 아이보리 피부에 핑크빛 볼이 특징입니다.",
      en: "Bright and clear warm tone with golden undertones. Skin has a yellowish tinge with a clear, vivid quality. Characterized by ivory skin with rosy cheeks.",
      ja: "ゴールドが混じった明るく透明感のあるウォームトーン。黄みがかった肌で、透き通った鮮やかな質感。アイボリーの肌にピンクの頬が特徴。",
      fr: "Ton chaud clair et lumineux aux reflets dorés. La peau a une teinte jaunâtre avec une qualité claire et vive. Teint ivoire avec des joues rosées.",
      es: "Tono cálido brillante y claro con matices dorados. La piel tiene un tinte amarillento con calidad clara y vívida. Caracterizada por piel marfil con mejillas sonrosadas.",
      zh: "带有金色底调的明亮清透暖色调。肌肤带有微黄光泽，清晰而生动。特点是象牙白肌肤配玫瑰色脸颊。",
    },
    bestColors: [
      { name: { ko: "코랄", en: "Coral", ja: "コーラル", fr: "Corail", es: "Coral", zh: "珊瑚色", }, hex: "#FF6B6B" },
      { name: { ko: "피치", en: "Peach", ja: "ピーチ", fr: "Pêche", es: "Melocotón", zh: "桃色", }, hex: "#FFBE7A" },
      { name: { ko: "골든 옐로우", en: "Golden Yellow", ja: "ゴールデンイエロー", fr: "Jaune doré", es: "Amarillo dorado", zh: "金黄色", }, hex: "#FFD700" },
      { name: { ko: "아이보리", en: "Ivory", ja: "アイボリー", fr: "Ivoire", es: "Marfil", zh: "象牙白", }, hex: "#FFFFF0" },
      { name: { ko: "민트 그린", en: "Mint Green", ja: "ミントグリーン", fr: "Vert menthe", es: "Verde menta", zh: "薄荷綠", }, hex: "#98D8C8" },
      { name: { ko: "카멜", en: "Camel", ja: "キャメル", fr: "Camel", es: "Camello", zh: "駝色", }, hex: "#C19A6B" },
    ],
    avoidColors: [
      { name: { ko: "블랙", en: "Black", ja: "ブラック", fr: "Noir", es: "Negro", zh: "黑色", }, hex: "#000000" },
      { name: { ko: "그레이", en: "Grey", ja: "グレー", fr: "Gris", es: "Gris", zh: "灰色", }, hex: "#808080" },
      { name: { ko: "차콜", en: "Charcoal", ja: "チャコール", fr: "Anthracite", es: "Carbón", zh: "炭灰色", }, hex: "#36454F" },
    ],
    makeup: {
      ko: ["립: 코랄, 피치, 살구 계열", "블러셔: 피치, 코랄", "아이섀도: 골든 브라운, 코퍼", "파운데이션: 아이보리, 웜베이지"],
      en: ["Lips: coral, peach, apricot", "Blush: peach, coral", "Eye shadow: golden brown, copper", "Foundation: ivory, warm beige"],
      ja: ["リップ: コーラル、ピーチ、アプリコット系", "チーク: ピーチ、コーラル", "アイシャドウ: ゴールデンブラウン、コッパー", "ファンデーション: アイボリー、ウォームベージュ"],
      fr: ["Lèvres : corail, pêche, abricot", "Blush : pêche, corail", "Fards à paupières : brun doré, cuivre", "Fond de teint : ivoire, beige chaud"],
      es: ["Labios: coral, melocotón, albaricoque", "Colorete: melocotón, coral", "Sombra de ojos: marrón dorado, cobre", "Base: marfil, beige cálido"],
      zh: ["唇色：珊瑚、桃色、杏色系", "腮紅：桃色、珊瑚色", "眼影：金棕色、銅色", "粉底：象牙色、暖米色"],
    },
    fashion: {
      ko: ["밝고 따뜻한 파스텔 계열", "코랄·피치·크림 계열 원피스", "골드 액세서리", "흰색보다 아이보리·크림 베이스"],
      en: ["Bright warm pastels", "Coral, peach, cream dresses", "Gold accessories", "Ivory/cream base rather than pure white"],
      ja: ["明るい温かみのあるパステル系", "コーラル・ピーチ・クリーム系のワンピース", "ゴールドアクセサリー", "白よりアイボリー・クリームベース"],
      fr: ["Pastels chauds et lumineux", "Robes corail, pêche ou crème", "Accessoires dorés", "Base ivoire/crème plutôt que blanc pur"],
      es: ["Pasteles cálidos y luminosos", "Vestidos coral, melocotón o crema", "Accesorios dorados", "Base marfil/crema en vez de blanco puro"],
      zh: ["明亮温暖的粉彩色系", "珊瑚、桃色、奶油色连衣裙", "金色配饰", "象牙白/奶油色基底优于纯白色"],
    },
    celebs: ["Audrey Hepburn (young)", "Taylor Swift", "Jessica Alba", "Anne Hathaway", "IU (아이유)", "Suzy (수지)"],
  },
  summer: {
    emoji: "🌊",
    gradient: "from-sky-100 to-purple-50",
    headerBg: "bg-gradient-to-br from-sky-200 to-purple-100",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    name: { ko: "여름 쿨톤", en: "Summer Cool", ja: "サマー クール", fr: "Été Frais", es: "Verano Fresco", zh: "夏冷色", },
    subtitle: {
      ko: "부드럽고 우아한 쿨톤 — 시원하고 로맨틱한 여름 분위기",
      en: "Soft and elegant cool tones — fresh, romantic summer vibes",
      ja: "柔らかくエレガントなクールトーン — 爽やかでロマンティックな夏の雰囲気",
      fr: "Tons froids doux et élégants — ambiance estivale fraîche et romantique",
      es: "Tonos fríos suaves y elegantes — ambiente veraniego fresco y romántico",
      zh: "柔和优雅的冷色调——清爽浪漫的夏日氛围",
    },
    tone: {
      ko: "핑크빛이 감도는 밝고 부드러운 쿨톤. 피부에 붉은 기운이 있으며 투명하고 섬세한 느낌입니다. 블루베이스 피부에 연보라빛 언더톤이 특징입니다.",
      en: "Bright and soft cool tone with pink undertones. Skin has a reddish tinge, appearing translucent and delicate. Characterized by blue-based skin with a lavender undertone.",
      ja: "ピンク味のある明るく柔らかいクールトーン。赤みがかった透明感のある肌が特徴。ブルーベースの肌にラベンダーのアンダートーンが特徴。",
      fr: "Ton froid clair et doux aux reflets roses. La peau a une teinte rougeâtre, translucide et délicate. Base bleue avec un sous-ton lavande.",
      es: "Tono frío claro y suave con matices rosados. La piel tiene un tinte rojizo, translúcido y delicado. Base azul con subtono lavanda.",
      zh: "带粉红色调的明亮柔和冷色。肌肤带微红光泽，透明而细腻。特点是蓝底肌肤带薰衣草底调。",
    },
    bestColors: [
      { name: { ko: "로즈핑크", en: "Rose Pink", ja: "ローズピンク", fr: "Rose vif", es: "Rosa vivo", zh: "玫瑰粉", }, hex: "#FF9EAA" },
      { name: { ko: "라벤더", en: "Lavender", ja: "ラベンダー", fr: "Lavande", es: "Lavanda", zh: "薰衣草紫", }, hex: "#B57BED" },
      { name: { ko: "파우더 블루", en: "Powder Blue", ja: "パウダーブルー", fr: "Bleu poudré", es: "Azul polvo", zh: "粉藍色", }, hex: "#B0E0E6" },
      { name: { ko: "소프트 화이트", en: "Soft White", ja: "ソフトホワイト", fr: "Blanc doux", es: "Blanco suave", zh: "柔白色", }, hex: "#F5F5F5" },
      { name: { ko: "플럼", en: "Plum", ja: "プラム", fr: "Prune", es: "Ciruela", zh: "梅子色", }, hex: "#8E4585" },
      { name: { ko: "아이시 블루", en: "Icy Blue", ja: "アイシーブルー", fr: "Bleu glacé", es: "Azul helado", zh: "冰藍色", }, hex: "#99C5C4" },
    ],
    avoidColors: [
      { name: { ko: "오렌지", en: "Orange", ja: "オレンジ", fr: "Orange", es: "Naranja", zh: "橙色", }, hex: "#FF6600" },
      { name: { ko: "머스터드", en: "Mustard", ja: "マスタード", fr: "Moutarde", es: "Mostaza", zh: "芥末黄", }, hex: "#FFDB58" },
      { name: { ko: "테라코타", en: "Terracotta", ja: "テラコッタ", fr: "Terracotta", es: "Terracota", zh: "磚紅色", }, hex: "#E2725B" },
    ],
    makeup: {
      ko: ["립: 로즈, 버건디, 소프트 핑크 계열", "블러셔: 로즈핑크, 쿨 핑크", "아이섀도: 라벤더, 그레이, 쿨톤 퍼플", "파운데이션: 핑크베이지, 쿨베이지"],
      en: ["Lips: rose, burgundy, soft pink", "Blush: rose pink, cool pink", "Eye shadow: lavender, grey, cool purple", "Foundation: pink beige, cool beige"],
      ja: ["リップ: ローズ、バーガンディ、ソフトピンク系", "チーク: ローズピンク、クールピンク", "アイシャドウ: ラベンダー、グレー、クールトーンパープル", "ファンデーション: ピンクベージュ、クールベージュ"],
      fr: ["Lèvres : rose, bordeaux, rose doux", "Blush : rose vif, rose froid", "Fards à paupières : lavande, gris, violet froid", "Fond de teint : beige rosé, beige froid"],
      es: ["Labios: rosa, burdeos, rosa suave", "Colorete: rosa vivo, rosa frío", "Sombra de ojos: lavanda, gris, morado frío", "Base: beige rosado, beige frío"],
      zh: ["唇色：玫瑰、酒紅、柔和粉紅系", "腮紅：玫瑰粉、冷粉紅", "眼影：薰衣草、灰色、冷色調紫", "粉底：粉米色、冷米色"],
    },
    fashion: {
      ko: ["파스텔 블루·라벤더·소프트 핑크", "우아한 드레이프 스타일", "실버·로즈골드 액세서리", "블루 베이스 계열 패턴"],
      en: ["Pastel blue, lavender, soft pink", "Elegant draping styles", "Silver or rose gold accessories", "Blue-based patterns"],
      ja: ["パステルブルー・ラベンダー・ソフトピンク", "エレガントなドレープスタイル", "シルバー・ローズゴールドアクセサリー", "ブルーベース系のパターン"],
      fr: ["Bleu pastel, lavande, rose doux", "Styles drapés élégants", "Accessoires argent ou or rose", "Motifs à base bleue"],
      es: ["Azul pastel, lavanda, rosa suave", "Estilos elegantes con drapeado", "Accesorios de plata o oro rosa", "Patrones de base azul"],
      zh: ["粉蓝色、薰衣草紫、柔和粉红", "优雅悬垂风格", "银色或玫瑰金配饰", "蓝底系图案"],
    },
    celebs: ["Grace Kelly", "Nicole Kidman", "Kate Blanchett", "Song Hye-kyo (송혜교)", "Kim Tae-hee (김태희)"],
  },
  autumn: {
    emoji: "🍂",
    gradient: "from-amber-100 to-orange-50",
    headerBg: "bg-gradient-to-br from-amber-200 to-orange-100",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    name: { ko: "가을 웜톤", en: "Autumn Warm", ja: "オータム ウォーム", fr: "Automne Chaud", es: "Otoño Cálido", zh: "秋暖色", },
    subtitle: {
      ko: "깊고 풍성한 웜톤 — 성숙하고 고급스러운 가을 무드",
      en: "Deep and rich warm tones — mature, luxurious autumn mood",
      ja: "深みのある豊かなウォームトーン — 成熟した高級感のある秋のムード",
      fr: "Tons chauds profonds et riches — ambiance automnale mature et luxueuse",
      es: "Tonos cálidos profundos y ricos — ambiente otoñal maduro y lujoso",
      zh: "深沉丰富的暖色调——成熟奢华的秋日氛围",
    },
    tone: {
      ko: "골든·올리브 빛이 깊이 배어 있는 웜톤. 피부에 황금빛이 짙게 있으며 성숙하고 고급스러운 느낌입니다. 어두운 갈색의 눈동자와 따뜻한 갈색 머리카락이 특징입니다.",
      en: "Deep warm tone rich with golden and olive undertones. Skin has a strong golden hue with a mature, sophisticated quality. Characterized by dark brown eyes and warm brown hair.",
      ja: "ゴールド・オリーブが深く溶け込んだウォームトーン。濃い黄金色の肌で成熟した高級感。濃い茶色の瞳と温かみのある茶色の髪が特徴。",
      fr: "Ton chaud profond aux reflets dorés et olive. La peau a une forte teinte dorée, mature et sophistiquée. Yeux brun foncé et cheveux châtains chauds.",
      es: "Tono cálido profundo rico en matices dorados y oliva. La piel tiene un fuerte matiz dorado con calidad madura y sofisticada. Ojos marrón oscuro y cabello marrón cálido.",
      zh: "深沉的暖色调，富含金色和橄榄色底调。肌肤带有浓郁金色光泽，成熟而精致。特点是深棕色眼睛和温暖棕色头发。",
    },
    bestColors: [
      { name: { ko: "테라코타", en: "Terracotta", ja: "テラコッタ", fr: "Terracotta", es: "Terracota", zh: "磚紅色", }, hex: "#CC5733" },
      { name: { ko: "머스터드", en: "Mustard", ja: "マスタード", fr: "Moutarde", es: "Mostaza", zh: "芥末黄", }, hex: "#FFBA00" },
      { name: { ko: "올리브 그린", en: "Olive Green", ja: "オリーブグリーン", fr: "Vert olive", es: "Verde oliva", zh: "橄欖綠", }, hex: "#708238" },
      { name: { ko: "번트 오렌지", en: "Burnt Orange", ja: "バーントオレンジ", fr: "Orange brûlé", es: "Naranja quemado", zh: "焦橙色", }, hex: "#CC5500" },
      { name: { ko: "카멜", en: "Camel", ja: "キャメル", fr: "Camel", es: "Camello", zh: "駝色", }, hex: "#C19A6B" },
      { name: { ko: "다크 브라운", en: "Dark Brown", ja: "ダークブラウン", fr: "Brun foncé", es: "Marrón oscuro", zh: "深棕色", }, hex: "#5C4033" },
    ],
    avoidColors: [
      { name: { ko: "블랙", en: "Black", ja: "ブラック", fr: "Noir", es: "Negro", zh: "黑色", }, hex: "#000000" },
      { name: { ko: "핑크", en: "Pink", ja: "ピンク", fr: "Rose", es: "Rosa", zh: "粉紅色", }, hex: "#FFC0CB" },
      { name: { ko: "아이시 컬러", en: "Icy Colors", ja: "アイシーカラー", fr: "Couleurs glacées", es: "Colores helados", zh: "冰色調", }, hex: "#D6EAF8" },
    ],
    makeup: {
      ko: ["립: 브릭 레드, 테라코타, 누드 브라운", "블러셔: 테라코타, 오렌지 브라운", "아이섀도: 골드, 코퍼, 올리브, 브라운", "파운데이션: 웜베이지, 골든베이지"],
      en: ["Lips: brick red, terracotta, nude brown", "Blush: terracotta, orange brown", "Eye shadow: gold, copper, olive, brown", "Foundation: warm beige, golden beige"],
      ja: ["リップ: ブリックレッド、テラコッタ、ヌードブラウン", "チーク: テラコッタ、オレンジブラウン", "アイシャドウ: ゴールド、コッパー、オリーブ、ブラウン", "ファンデーション: ウォームベージュ、ゴールデンベージュ"],
      fr: ["Lèvres : rouge brique, terracotta, nude brun", "Blush : terracotta, brun orangé", "Fards à paupières : or, cuivre, olive, brun", "Fond de teint : beige chaud, beige doré"],
      es: ["Labios: rojo ladrillo, terracota, nude marrón", "Colorete: terracota, marrón naranja", "Sombra de ojos: dorado, cobre, oliva, marrón", "Base: beige cálido, beige dorado"],
      zh: ["唇色：磚紅、磚紅色、裸棕系", "腮紅：磚紅、橙棕色", "眼影：金色、銅色、橄欖色、棕色", "粉底：暖米色、金米色"],
    },
    fashion: {
      ko: ["어스톤·올리브·머스터드 계열", "가죽·스웨이드 소재", "골드 앤틱 액세서리", "따뜻한 레이어드 스타일"],
      en: ["Earth tones, olive, mustard", "Leather and suede fabrics", "Gold antique accessories", "Warm layered styles"],
      ja: ["アースカラー・オリーブ・マスタード系", "レザー・スエード素材", "ゴールドアンティークアクセサリー", "温かみのあるレイヤードスタイル"],
      fr: ["Tons terreux, olive, moutarde", "Cuir et daim", "Accessoires or antique", "Styles superposés chaleureux"],
      es: ["Tonos tierra, oliva, mostaza", "Tejidos de cuero y ante", "Accesorios dorados antiguos", "Estilos capas cálidas"],
      zh: ["大地色、橄榄色、芥末黄系", "皮革、麂皮材质", "复古金色配饰", "温暖层叠穿搭风格"],
    },
    celebs: ["Beyoncé", "Jessica Alba", "Jennifer Lopez", "Ha Ji-won (하지원)", "Han Gain (한가인)"],
  },
  winter: {
    emoji: "❄️",
    gradient: "from-slate-100 to-indigo-50",
    headerBg: "bg-gradient-to-br from-slate-200 to-indigo-100",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    name: { ko: "겨울 쿨톤", en: "Winter Cool", ja: "ウィンター クール", fr: "Hiver Froid", es: "Invierno Frío", zh: "冬冷色", },
    subtitle: {
      ko: "선명하고 강렬한 쿨톤 — 세련되고 카리스마 있는 겨울 아우라",
      en: "Sharp and intense cool tones — sophisticated, charismatic winter aura",
      ja: "鮮明で強烈なクールトーン — スタイリッシュでカリスマ的な冬のオーラ",
      fr: "Tons froids nets et intenses — aura hivernale sophistiquée et charismatique",
      es: "Tonos fríos nítidos e intensos — aura invernal sofisticada y carismática",
      zh: "清晰強烈的冷色調——精緻有魅力的冬日氣場",
    },
    tone: {
      ko: "차갑고 선명한 블루 베이스 쿨톤. 피부가 밝고 투명하거나 어두운 편이며 대비가 강한 이미지입니다. 검은 눈동자와 짙은 머리카락이 특징입니다.",
      en: "Cold and clear blue-based cool tone. Skin is bright and clear or on the deeper side, creating a high-contrast image. Characterized by black eyes and dark hair.",
      ja: "冷たく鮮明なブルーベースのクールトーン。肌は明るく透明感があるか、濃い目で、コントラストが強い。黒い瞳と濃い髪が特徴。",
      fr: "Ton froid et net à base bleue. La peau est claire et lumineuse ou plus foncée, créant une image à fort contraste. Yeux noirs et cheveux foncés.",
      es: "Tono frío y claro de base azul. La piel es clara y luminosa o más oscura, creando una imagen de alto contraste. Ojos negros y cabello oscuro.",
      zh: "冷冽清晰的蓝底冷色调。肌肤明亮透明或偏深，形成强烈对比感。特点是黑色眼睛和深色头发。",
    },
    bestColors: [
      { name: { ko: "퓨어 화이트", en: "Pure White", ja: "ピュアホワイト", fr: "Blanc pur", es: "Blanco puro", zh: "純白", }, hex: "#FFFFFF" },
      { name: { ko: "블랙", en: "Black", ja: "ブラック", fr: "Noir", es: "Negro", zh: "黑色", }, hex: "#000000" },
      { name: { ko: "로열 블루", en: "Royal Blue", ja: "ロイヤルブルー", fr: "Bleu royal", es: "Azul real", zh: "皇家藍", }, hex: "#4169E1" },
      { name: { ko: "버건디", en: "Burgundy", ja: "バーガンディ", fr: "Bordeaux", es: "Burdeos", zh: "酒紅色", }, hex: "#800020" },
      { name: { ko: "에메랄드", en: "Emerald", ja: "エメラルド", fr: "Émeraude", es: "Esmeralda", zh: "翡翠綠", }, hex: "#50C878" },
      { name: { ko: "마젠타", en: "Magenta", ja: "マゼンタ", fr: "Magenta", es: "Magenta", zh: "洋紅色", }, hex: "#FF00FF" },
    ],
    avoidColors: [
      { name: { ko: "오렌지", en: "Orange", ja: "オレンジ", fr: "Orange", es: "Naranja", zh: "橙色", }, hex: "#FF6600" },
      { name: { ko: "베이지", en: "Beige", ja: "ベージュ", fr: "Beige", es: "Beige", zh: "米色", }, hex: "#F5F5DC" },
      { name: { ko: "카멜", en: "Camel", ja: "キャメル", fr: "Camel", es: "Camello", zh: "駝色", }, hex: "#C19A6B" },
    ],
    makeup: {
      ko: ["립: 레드, 버건디, 딥 체리, 베리계열", "블러셔: 쿨 핑크, 로즈", "아이섀도: 블랙, 그레이, 딥 네이비", "파운데이션: 쿨베이지, 핑크베이지"],
      en: ["Lips: red, burgundy, deep cherry, berry", "Blush: cool pink, rose", "Eye shadow: black, grey, deep navy", "Foundation: cool beige, pink beige"],
      ja: ["リップ: レッド、バーガンディ、ディープチェリー、ベリー系", "チーク: クールピンク、ローズ", "アイシャドウ: ブラック、グレー、ディープネイビー", "ファンデーション: クールベージュ、ピンクベージュ"],
      fr: ["Lèvres : rouge, bordeaux, cerise foncée, baies", "Blush : rose froid, rose", "Fards à paupières : noir, gris, bleu marine profond", "Fond de teint : beige froid, beige rosé"],
      es: ["Labios: rojo, burdeos, cereza oscura, baya", "Colorete: rosa frío, rosa", "Sombra de ojos: negro, gris, azul marino profundo", "Base: beige frío, beige rosado"],
      zh: ["唇色：紅色、酒紅、深樱桃、莓果系", "腮紅：冷粉紅、玫瑰色", "眼影：黑色、灰色、深藏青色", "粉底：冷米色、粉米色"],
    },
    fashion: {
      ko: ["블랙·화이트·그레이 모노크롬", "강렬한 원색 포인트", "실버 액세서리", "샤프하고 구조적인 실루엣"],
      en: ["Black, white, grey monochrome", "Bold vivid color accents", "Silver accessories", "Sharp, structural silhouettes"],
      ja: ["ブラック・ホワイト・グレーのモノクローム", "強烈な原色ポイント", "シルバーアクセサリー", "シャープで構造的なシルエット"],
      fr: ["Monochrome noir, blanc, gris", "Accents de couleurs vives intenses", "Accessoires argent", "Silhouettes nettes et structurées"],
      es: ["Monocromo negro, blanco, gris", "Acentos de colores vivos intensos", "Accesorios plateados", "Siluetas nítidas y estructuradas"],
      zh: ["黑白灰单色调", "强烈鲜艳色彩点缀", "银色配饰", "利落结构感轮廓"],
    },
    celebs: ["Angelina Jolie", "Lupita Nyong'o", "Kim Kardashian", "Jun Ji-hyun (전지현)", "Lee Young-ae (이영애)"],
  },
};

// ─── Scoring & result ─────────────────────────────────────────────────────────

function calcResult(answers: (number | null)[]): Season {
  const totals: Record<Season, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  answers.forEach((ansIdx, qIdx) => {
    if (ansIdx === null) return;
    const scores = QUESTIONS[qIdx].options[ansIdx].scores;
    (Object.keys(scores) as Season[]).forEach((s) => {
      totals[s] += scores[s] ?? 0;
    });
  });
  return (Object.keys(totals) as Season[]).reduce((best, s) =>
    totals[s] > totals[best] ? s : best
  ) as Season;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PersonalColorTest({ locale }: Props) {
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [result, setResult] = useState<Season | null>(null);
  const ui = UI[locale];
  const total = QUESTIONS.length;

  function selectAnswer(optIdx: number) {
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
  }

  function goNext() {
    if (current < total - 1) setCurrent(current + 1);
  }

  function goPrev() {
    if (current > 0) setCurrent(current - 1);
  }

  function showResult() {
    setResult(calcResult(answers));
    setPhase("result");
  }

  function retake() {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setCurrent(0);
    setResult(null);
    setPhase("intro");
  }

  const q = QUESTIONS[current];
  const progress = ((current + 1) / total) * 100;

  // ── Intro ──
  if (phase === "intro") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
          <p className="mt-1 text-gray-500 text-sm">{ui.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["spring","summer","autumn","winter"] as Season[]).map((s) => {
            const sd = SEASONS[s];
            return (
              <div key={s} className={`rounded-xl p-4 text-center ${sd.headerBg}`}>
                <div className="text-3xl mb-1">{sd.emoji}</div>
                <div className="text-sm font-bold text-gray-800">{sd.name[locale]}</div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setPhase("test")}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {ui.startBtn}
        </button>
      </div>
    );
  }

  // ── Test ──
  if (phase === "test") {
    const canNext = answers[current] !== null;
    const isLast = current === total - 1;
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">{ui.questionOf(current + 1, total)}</span>
          <span className="text-xs font-medium text-gray-400">{Math.round(progress)}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Question */}
        <p className="text-base font-semibold text-gray-800 leading-snug">{q.text[locale]}</p>
        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isAnswered = answers[current] === i;
            // Handle both string and string[] (defensive for ja edge case)
            const txt = Array.isArray(opt.text[locale]) ? (opt.text[locale] as unknown as string[])[0] : opt.text[locale];
            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  isAnswered
                    ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-medium"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                {txt as string}
              </button>
            );
          })}
        </div>
        {/* Navigation */}
        <div className="flex gap-2">
          {current > 0 && (
            <button
              onClick={goPrev}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              ← {ui.prevBtn}
            </button>
          )}
          {!isLast ? (
            <button
              onClick={goNext}
              disabled={!canNext}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {ui.nextBtn} →
            </button>
          ) : (
            <button
              onClick={showResult}
              disabled={!canNext}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {ui.resultBtn} ✨
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Result ──
  if (!result) return null;
  const sd = SEASONS[result];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl p-6 text-center ${sd.headerBg}`}>
        <div className="text-5xl mb-2">{sd.emoji}</div>
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-2 ${sd.badge}`}>
          {ui.yourType}
        </div>
        <h1 className="text-2xl font-black text-gray-900">{sd.name[locale]}</h1>
        <p className="text-sm text-gray-600 mt-1">{sd.subtitle[locale]}</p>
      </div>

      {/* Tone description */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{ui.toneLabel}</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{sd.tone[locale]}</p>
      </div>

      {/* Best colors */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.bestColorsLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {sd.bestColors.map((c) => (
            <div key={c.hex} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200">
              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
              <span className="text-xs text-gray-700">{c.name[locale]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avoid colors */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.avoidColorsLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {sd.avoidColors.map((c) => (
            <div key={c.hex} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 opacity-60">
              <div className="w-4 h-4 rounded-full border border-gray-300 relative overflow-hidden" style={{ backgroundColor: c.hex }}>
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✕</div>
              </div>
              <span className="text-xs text-gray-500 line-through">{c.name[locale]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Makeup & Fashion */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">💄 {ui.makeupLabel}</h2>
          <ul className="space-y-1">
            {sd.makeup[locale].map((m) => (
              <li key={m} className="text-xs text-gray-700">• {m}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">👗 {ui.fashionLabel}</h2>
          <ul className="space-y-1">
            {sd.fashion[locale].map((f) => (
              <li key={f} className="text-xs text-gray-700">• {f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Celebs */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.celebsLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {sd.celebs.map((c) => (
            <span key={c} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">{c}</span>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400">{ui.disclaimer}</p>

      {/* Retake */}
      <button
        onClick={retake}
        className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        ↺ {ui.retakeBtn}
      </button>
    </div>
  );
}
