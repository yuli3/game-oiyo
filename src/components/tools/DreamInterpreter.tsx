import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DreamCategory =
  | "nature"
  | "body"
  | "animals"
  | "people"
  | "places"
  | "actions"
  | "objects"
  | "emotions";

interface DreamSymbol {
  id: string;
  emoji: string;
  name: Record<Locale, string>;
  meaning: Record<Locale, string>;
  positive: Record<Locale, string>;
  negative: Record<Locale, string>;
  advice: Record<Locale, string>;
  category: DreamCategory;
}

// ─── i18n UI ──────────────────────────────────────────────────────────────────

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    selectPrompt: string;
    interpretBtn: string;
    clearBtn: string;
    selectedLabel: string;
    meaningLabel: string;
    positiveLabel: string;
    negativeLabel: string;
    adviceLabel: string;
    noSelection: string;
    maxReached: string;
    categoryLabels: Record<DreamCategory, string>;
  }
> = {
  ko: {
    title: "꿈 해몽 인터프리터",
    subtitle: "꿈에 등장한 상징을 선택하면 의미를 해석해드립니다",
    selectPrompt: "꿈 키워드 선택 (최대 5개)",
    interpretBtn: "해몽 보기",
    clearBtn: "초기화",
    selectedLabel: "선택된 키워드",
    meaningLabel: "상징 의미",
    positiveLabel: "긍정적 해석",
    negativeLabel: "주의할 점",
    adviceLabel: "조언",
    noSelection: "하나 이상의 꿈 키워드를 선택해주세요",
    maxReached: "최대 5개까지 선택할 수 있습니다",
    categoryLabels: {
      nature: "자연",
      body: "신체",
      animals: "동물",
      people: "인물",
      places: "장소",
      actions: "행동",
      objects: "사물",
      emotions: "감정",
    },
  },
  en: {
    title: "Dream Interpreter",
    subtitle: "Select symbols from your dream to reveal their meanings",
    selectPrompt: "Pick dream keywords (up to 5)",
    interpretBtn: "Interpret",
    clearBtn: "Clear",
    selectedLabel: "Selected keywords",
    meaningLabel: "Symbol meaning",
    positiveLabel: "Positive interpretation",
    negativeLabel: "Watch out for",
    adviceLabel: "Advice",
    noSelection: "Please select at least one dream keyword",
    maxReached: "You can select up to 5 keywords",
    categoryLabels: {
      nature: "Nature",
      body: "Body",
      animals: "Animals",
      people: "People",
      places: "Places",
      actions: "Actions",
      objects: "Objects",
      emotions: "Emotions",
    },
  },
  ja: {
    title: "夢占いインタープリター",
    subtitle: "夢に登場したシンボルを選ぶと意味を解釈します",
    selectPrompt: "夢のキーワードを選択（最大5個）",
    interpretBtn: "夢占いを見る",
    clearBtn: "リセット",
    selectedLabel: "選択されたキーワード",
    meaningLabel: "シンボルの意味",
    positiveLabel: "ポジティブな解釈",
    negativeLabel: "注意すべき点",
    adviceLabel: "アドバイス",
    noSelection: "夢のキーワードを一つ以上選択してください",
    maxReached: "最大5個まで選択できます",
    categoryLabels: {
      nature: "自然",
      body: "身体",
      animals: "動物",
      people: "人物",
      places: "場所",
      actions: "行動",
      objects: "物",
      emotions: "感情",
    },
  },
  fr: {
    title: "Interpréteur de Rêves",
    subtitle: "Sélectionnez des symboles de votre rêve pour révéler leur signification",
    selectPrompt: "Choisissez des mots-clés (jusqu'à 5)",
    interpretBtn: "Interpréter",
    clearBtn: "Effacer",
    selectedLabel: "Mots-clés sélectionnés",
    meaningLabel: "Signification du symbole",
    positiveLabel: "Interprétation positive",
    negativeLabel: "À surveiller",
    adviceLabel: "Conseil",
    noSelection: "Veuillez sélectionner au moins un mot-clé",
    maxReached: "Vous pouvez sélectionner jusqu'à 5 mots-clés",
    categoryLabels: {
      nature: "Nature",
      body: "Corps",
      animals: "Animaux",
      people: "Personnes",
      places: "Lieux",
      actions: "Actions",
      objects: "Objets",
      emotions: "Émotions",
    },
  },
  es: {
    title: "Intérprete de Sueños",
    subtitle: "Selecciona símbolos de tu sueño para revelar sus significados",
    selectPrompt: "Elige palabras clave (hasta 5)",
    interpretBtn: "Interpretar",
    clearBtn: "Borrar",
    selectedLabel: "Palabras clave seleccionadas",
    meaningLabel: "Significado del símbolo",
    positiveLabel: "Interpretación positiva",
    negativeLabel: "Ten en cuenta",
    adviceLabel: "Consejo",
    noSelection: "Por favor selecciona al menos una palabra clave",
    maxReached: "Puedes seleccionar hasta 5 palabras clave",
    categoryLabels: {
      nature: "Naturaleza",
      body: "Cuerpo",
      animals: "Animales",
      people: "Personas",
      places: "Lugares",
      actions: "Acciones",
      objects: "Objetos",
      emotions: "Emociones",
    },
  },
  zh: {
    title: "梦境解析器",
    subtitle: "选择梦中出现的符号，揭示其隐藏含义",
    selectPrompt: "选择梦境关键词（最多5个）",
    interpretBtn: "解析梦境",
    clearBtn: "重置",
    selectedLabel: "已选关键词",
    meaningLabel: "符号含义",
    positiveLabel: "正面解读",
    negativeLabel: "需注意",
    adviceLabel: "建议",
    noSelection: "请至少选择一个梦境关键词",
    maxReached: "最多可选择5个关键词",
    categoryLabels: {
      nature: "自然",
      body: "身体",
      animals: "动物",
      people: "人物",
      places: "地点",
      actions: "行动",
      objects: "物品",
      emotions: "情感",
    },
  },
};

// ─── Dream Symbol Database ────────────────────────────────────────────────────

const SYMBOLS: DreamSymbol[] = [
  // ── Nature ──
  {
    id: "water",
    emoji: "💧",
    category: "nature",
    name: { ko: "물", en: "Water", ja: "水", fr: "Eau", es: "Agua", zh: "水", },
    meaning: {
      ko: "감정, 무의식, 변화의 흐름을 상징합니다.",
      en: "Symbolizes emotions, the unconscious, and the flow of change.",
      ja: "感情、無意識、変化の流れを象徴します。",
      fr: "Symbolise les émotions, l'inconscient et le flux du changement.",
      es: "Simboliza las emociones, el inconsciente y el flujo del cambio.",
      zh: "象征情感、潜意识与变化的流动。",
    },
    positive: {
      ko: "맑은 물은 정화, 새로운 시작, 내면의 평화를 의미합니다.",
      en: "Clear water means purification, new beginnings, and inner peace.",
      ja: "澄んだ水は浄化、新たな始まり、内なる平和を意味します。",
      fr: "L'eau claire signifie purification, nouveaux départs et paix intérieure.",
      es: "El agua clara significa purificación, nuevos comienzos y paz interior.",
      zh: "清澈的水意味着净化、新的开始和内心平静。",
    },
    negative: {
      ko: "탁하거나 범람하는 물은 압도당하는 감정이나 억압된 두려움을 나타낼 수 있습니다.",
      en: "Murky or flooding water may signal overwhelming emotions or suppressed fears.",
      ja: "濁ったり氾濫したりする水は、圧倒される感情や抑圧された恐怖を示すことがあります。",
      fr: "Une eau trouble ou inondante peut signaler des émotions écrasantes ou des peurs refoulées.",
      es: "El agua turbia o inundada puede señalar emociones abrumadoras o miedos reprimidos.",
      zh: "渾濁或氾濫的水可能暗示情感崩潰或被壓抑的恐懼。",
    },
    advice: {
      ko: "현재 억누르고 있는 감정이 있다면 솔직하게 표현해보세요.",
      en: "If you're suppressing emotions, try expressing them honestly.",
      ja: "感情を抑えているなら、正直に表現してみましょう。",
      fr: "Si vous réfrimez des émotions, essayez de les exprimer honnêtement.",
      es: "Si estás reprimiendo emociones, intenta expresarlas honestamente.",
      zh: "如果你正在压抑情感，试着诚实地表达它们。",
    },
  },
  {
    id: "fire",
    emoji: "🔥",
    category: "nature",
    name: { ko: "불", en: "Fire", ja: "火", fr: "Feu", es: "Fuego", zh: "火", },
    meaning: {
      ko: "열정, 변혁, 에너지, 파괴와 재생을 상징합니다.",
      en: "Symbolizes passion, transformation, energy, destruction and rebirth.",
      ja: "情熱、変容、エネルギー、破壊と再生を象徴します。",
      fr: "Symbolise la passion, la transformation, l'énergie, la destruction et la renaissance.",
      es: "Simboliza pasión, transformación, energía, destrucción y renacimiento.",
      zh: "象征热情、转化、能量、破坏与重生。",
    },
    positive: {
      ko: "활활 타오르는 불은 내면의 열정과 강력한 창조 에너지를 의미합니다.",
      en: "A blazing fire means inner passion and powerful creative energy.",
      ja: "燃え盛る火は内なる情熱と強力な創造エネルギーを意味します。",
      fr: "Un feu ardent signifie passion intérieure et puissante énergie créatrice.",
      es: "Un fuego ardiente significa pasión interior y poderosa energía creativa.",
      zh: "熊熊烈火象徵內在熱情和強大的創造能量。",
    },
    negative: {
      ko: "통제할 수 없는 불은 분노, 충동적 결정, 혹은 번아웃의 경고일 수 있습니다.",
      en: "Uncontrollable fire may warn of anger, impulsive decisions, or burnout.",
      ja: "制御できない火は怒り、衝動的な決断、燃え尽き症候群の警告かもしれません。",
      fr: "Un feu incontrôlable peut avertir de la colère, de décisions impulsives ou d'un burnout.",
      es: "El fuego incontrolable puede advertir de ira, decisiones impulsivas o agotamiento.",
      zh: "无法控制的火可能是愤怒、冲动决策或职业倦怠的警示。",
    },
    advice: {
      ko: "열정을 건강하게 발산할 창구를 만드세요. 분노는 억누르기보다 표현하세요.",
      en: "Create healthy outlets for your passion. Express anger rather than suppressing it.",
      ja: "情熱を健全に発散できる場を作りましょう。怒りは抑えるより表現しましょう。",
      fr: "Créez des exutoires sains pour votre passion. Exprimez la colère plutôt que de la réprimer.",
      es: "Crea salidas saludables para tu pasión. Expresa la ira en lugar de suprimirla.",
      zh: "為你的熱情創造健康的發洩管道。表達憤怒而非壓抑它。",
    },
  },
  {
    id: "sky",
    emoji: "☁️",
    category: "nature",
    name: { ko: "하늘", en: "Sky", ja: "空", fr: "Ciel", es: "Cielo", zh: "天空", },
    meaning: {
      ko: "자유, 무한한 가능성, 영적 세계, 높은 이상을 상징합니다.",
      en: "Symbolizes freedom, infinite possibility, the spiritual realm, and lofty ideals.",
      ja: "自由、無限の可能性、精神世界、高い理想を象徴します。",
      fr: "Symbolise la liberté, les possibilités infinies, le domaine spirituel et les idéaux élevés.",
      es: "Simboliza libertad, posibilidades infinitas, el reino espiritual e ideales elevados.",
      zh: "象征自由、无限可能性、精神世界与崇高理想。",
    },
    positive: {
      ko: "맑은 하늘은 명료한 사고, 낙관적 전망, 자유로운 표현을 의미합니다.",
      en: "Clear sky means clear thinking, optimistic outlook, and free expression.",
      ja: "晴れた空は明確な思考、楽観的な見通し、自由な表現を意味します。",
      fr: "Un ciel clair signifie pensée claire, perspective optimiste et expression libre.",
      es: "Un cielo despejado significa pensamiento claro, perspectiva optimista y expresión libre.",
      zh: "晴朗的天空意味著清晰的思維、樂觀的前景和自由表達。",
    },
    negative: {
      ko: "먹구름 낀 하늘은 불안, 앞길의 장애물, 억압감을 나타낼 수 있습니다.",
      en: "A stormy sky may indicate anxiety, obstacles ahead, or feelings of oppression.",
      ja: "暗雲に覆われた空は不安、前途の障害、抑圧感を示すことがあります。",
      fr: "Un ciel orageux peut indiquer de l'anxiété, des obstacles à venir ou un sentiment d'oppression.",
      es: "Un cielo tormentoso puede indicar ansiedad, obstáculos por delante o sentimientos de opresión.",
      zh: "烏雲密布的天空可能暗示焦慮、前路的障礙或壓迫感。",
    },
    advice: {
      ko: "시야를 넓히고 더 큰 그림을 보려는 노력을 기울여보세요.",
      en: "Try to broaden your perspective and see the bigger picture.",
      ja: "視野を広げ、大きな絵を見ようとする努力をしましょう。",
      fr: "Essayez d'élargir votre perspective et de voir la vue d'ensemble.",
      es: "Intenta ampliar tu perspectiva y ver el panorama más amplio.",
      zh: "尝试拓宽视野，着眼全局。",
    },
  },
  {
    id: "mountain",
    emoji: "⛰️",
    category: "nature",
    name: { ko: "산", en: "Mountain", ja: "山", fr: "Montagne", es: "Montaña", zh: "山", },
    meaning: {
      ko: "도전, 성취, 장애물, 안정성을 상징합니다.",
      en: "Symbolizes challenge, achievement, obstacles, and stability.",
      ja: "挑戦、達成、障害、安定を象徴します。",
      fr: "Symbolise le défi, l'accomplissement, les obstacles et la stabilité.",
      es: "Simboliza desafío, logro, obstáculos y estabilidad.",
      zh: "象征挑战、成就、障碍与稳定性。",
    },
    positive: {
      ko: "정상에 오르는 꿈은 목표 달성, 극복, 성장을 의미합니다.",
      en: "Reaching the summit means achieving goals, overcoming, and growth.",
      ja: "頂上に登る夢は目標達成、克服、成長を意味します。",
      fr: "Atteindre le sommet signifie atteindre les objectifs, surmonter et grandir.",
      es: "Alcanzar la cima significa lograr objetivos, superar y crecer.",
      zh: "登上山顶意味着实现目标、克服困难与成长。",
    },
    negative: {
      ko: "산을 오르지 못하거나 떨어지는 꿈은 과중한 부담이나 좌절감을 반영할 수 있습니다.",
      en: "Failing to climb or falling may reflect overwhelming burdens or frustration.",
      ja: "山を登れない、または落ちる夢は過重な負担や挫折感を反映することがあります。",
      fr: "Ne pas réussir à grimper ou tomber peut refléter un fardeau écrasant ou de la frustration.",
      es: "No poder escalar o caer puede reflejar cargas abrumadoras o frustración.",
      zh: "無法攀登或跌落可能反映沉重負擔或挫敗感。",
    },
    advice: {
      ko: "큰 목표를 작은 단계로 나눠 접근해보세요.",
      en: "Break big goals into smaller, manageable steps.",
      ja: "大きな目標を小さなステップに分けてアプローチしましょう。",
      fr: "Divisez les grands objectifs en petites étapes gérables.",
      es: "Divide los grandes objetivos en pasos pequeños y manejables.",
      zh: "将大目标分解为小步骤来逐步实现。",
    },
  },
  {
    id: "forest",
    emoji: "🌲",
    category: "nature",
    name: { ko: "숲", en: "Forest", ja: "森", fr: "Forêt", es: "Bosque", zh: "森林", },
    meaning: {
      ko: "무의식, 미지의 세계, 탐구, 내면의 복잡성을 상징합니다.",
      en: "Symbolizes the unconscious, the unknown, exploration, and inner complexity.",
      ja: "無意識、未知の世界、探求、内面の複雑さを象徴します。",
      fr: "Symbolise l'inconscient, l'inconnu, l'exploration et la complexité intérieure.",
      es: "Simboliza el inconsciente, lo desconocido, la exploración y la complejidad interior.",
      zh: "象征潜意识、未知世界、探索与内在的复杂性。",
    },
    positive: {
      ko: "밝은 숲은 자기 발견의 여정, 풍부한 내면, 자연과의 연결을 나타냅니다.",
      en: "A bright forest represents a journey of self-discovery, rich inner life, and connection to nature.",
      ja: "明るい森は自己発見の旅、豊かな内面、自然との繋がりを表します。",
      fr: "Une forêt lumineuse représente un voyage de découverte de soi, une vie intérieure riche.",
      es: "Un bosque luminoso representa un viaje de autodescubrimiento y rica vida interior.",
      zh: "明亮的森林代表自我探索之旅、丰富的内在生活与自然连结。",
    },
    negative: {
      ko: "어둡고 길을 잃은 숲은 혼란, 방향 상실, 고립감을 반영할 수 있습니다.",
      en: "A dark, lost forest may reflect confusion, loss of direction, or isolation.",
      ja: "暗く迷った森は混乱、方向感覚の喪失、孤立感を反映することがあります。",
      fr: "Une forêt sombre et perdue peut refléter la confusion, la perte de direction ou l'isolement.",
      es: "Un bosque oscuro y perdido puede reflejar confusión, pérdida de dirección o aislamiento.",
      zh: "黑暗迷失的森林可能反映混亂、失去方向感或孤立感。",
    },
    advice: {
      ko: "스스로를 탐구하는 시간을 가져보세요. 내면의 목소리에 귀 기울이세요.",
      en: "Take time to explore yourself. Listen to your inner voice.",
      ja: "自分を探求する時間を持ちましょう。内なる声に耳を傾けましょう。",
      fr: "Prenez le temps de vous explorer. Écoutez votre voix intérieure.",
      es: "Tómate tiempo para explorarte. Escucha tu voz interior.",
      zh: "花时间探索自我，倾听内心的声音。",
    },
  },

  // ── Body ──
  {
    id: "teeth",
    emoji: "🦷",
    category: "body",
    name: { ko: "이빨 / 치아", en: "Teeth", ja: "歯", fr: "Dents", es: "Dientes", zh: "牙齒", },
    meaning: {
      ko: "자신감, 소통 능력, 외모, 힘, 나이 들어가는 것에 대한 두려움을 상징합니다.",
      en: "Symbolizes confidence, communication ability, appearance, power, and fear of aging.",
      ja: "自信、コミュニケーション能力、外見、力、老いへの恐れを象徴します。",
      fr: "Symbolise la confiance, la capacité de communication, l'apparence, le pouvoir et la peur du vieillissement.",
      es: "Simboliza confianza, capacidad de comunicación, apariencia, poder y miedo al envejecimiento.",
      zh: "象征自信、沟通能力、外貌、力量与对衰老的恐惧。",
    },
    positive: {
      ko: "치아가 튼튼하고 깨끗한 꿈은 자신감과 표현력의 향상을 나타냅니다.",
      en: "Strong, clean teeth in dreams indicate growing confidence and expressiveness.",
      ja: "丈夫で清潔な歯の夢は自信と表現力の向上を示します。",
      fr: "Des dents fortes et propres indiquent une confiance et une expressivité croissantes.",
      es: "Dientes fuertes y limpios indican confianza y expresividad crecientes.",
      zh: "梦见牙齿坚固洁白代表自信心和表达能力提升。",
    },
    negative: {
      ko: "치아가 빠지거나 부러지는 꿈은 불안감, 자존감 하락, 통제력 상실의 신호일 수 있습니다.",
      en: "Teeth falling or breaking may signal anxiety, dropping self-esteem, or loss of control.",
      ja: "歯が抜けたり折れたりする夢は不安、自尊心の低下、コントロールの喪失のサインかもしれません。",
      fr: "Des dents qui tombent ou se cassent peuvent signaler de l'anxiété, une baisse d'estime de soi.",
      es: "Dientes que caen o se rompen pueden señalar ansiedad, baja autoestima o pérdida de control.",
      zh: "牙齒脫落或破碎可能是焦慮、自尊心下降或失控的信號。",
    },
    advice: {
      ko: "자기 자신을 돌보고 자존감을 높이는 활동에 집중해보세요.",
      en: "Focus on self-care activities that build your self-esteem.",
      ja: "自分を大切にし、自尊心を高める活動に集中しましょう。",
      fr: "Concentrez-vous sur des activités de soins personnels qui renforcent votre estime de soi.",
      es: "Concéntrate en actividades de autocuidado que fortalezcan tu autoestima.",
      zh: "专注于能提升自尊心的自我照顾活动。",
    },
  },
  {
    id: "falling",
    emoji: "🌀",
    category: "body",
    name: { ko: "추락 / 떨어짐", en: "Falling", ja: "落下", fr: "Chute", es: "Caída", zh: "墜落", },
    meaning: {
      ko: "통제력 상실, 불안감, 실패에 대한 두려움, 과중한 부담을 상징합니다.",
      en: "Symbolizes loss of control, anxiety, fear of failure, and overwhelming burdens.",
      ja: "コントロールの喪失、不安、失敗への恐れ、過重な負担を象徴します。",
      fr: "Symbolise la perte de contrôle, l'anxiété, la peur de l'échec et les fardeaux accablants.",
      es: "Simboliza pérdida de control, ansiedad, miedo al fracaso y cargas abrumadoras.",
      zh: "象征失控、焦虑、对失败的恐惧与沉重负担。",
    },
    positive: {
      ko: "추락하다가 날아오르는 꿈은 위기를 극복하고 자유로워지는 것을 의미합니다.",
      en: "Falling then flying means overcoming crisis and gaining freedom.",
      ja: "落下して飛び上がる夢は危機を克服し自由になることを意味します。",
      fr: "Tomber puis s'envoler signifie surmonter une crise et gagner en liberté.",
      es: "Caer y luego volar significa superar la crisis y ganar libertad.",
      zh: "墜落後飛翔意味著克服危機並獲得自由。",
    },
    negative: {
      ko: "반복적인 추락 꿈은 만성적인 불안이나 심리적 압박의 신호일 수 있습니다.",
      en: "Recurring falling dreams may signal chronic anxiety or psychological pressure.",
      ja: "繰り返す落下の夢は慢性的な不安や心理的プレッシャーのサインかもしれません。",
      fr: "Des rêves de chute récurrents peuvent signaler une anxiété chronique ou une pression psychologique.",
      es: "Los sueños recurrentes de caídas pueden señalar ansiedad crónica o presión psicológica.",
      zh: "反复出现的坠落梦可能是慢性焦虑或心理压力的信号。",
    },
    advice: {
      ko: "현재 감당하기 힘든 스트레스 요인이 있다면 도움을 요청하는 것을 두려워하지 마세요.",
      en: "If you're overwhelmed, don't be afraid to ask for help.",
      ja: "現在、対処しきれないストレス要因があれば、助けを求めることを恐れないでください。",
      fr: "Si vous êtes débordé, n'ayez pas peur de demander de l'aide.",
      es: "Si estás abrumado, no tengas miedo de pedir ayuda.",
      zh: "如果你不堪重負，不要害怕尋求幫助。",
    },
  },
  {
    id: "flying",
    emoji: "🦅",
    category: "body",
    name: { ko: "비행 / 날기", en: "Flying", ja: "飛ぶ", fr: "Voler", es: "Volar", zh: "飛翔", },
    meaning: {
      ko: "자유, 해방감, 성취욕, 제약으로부터의 탈출을 상징합니다.",
      en: "Symbolizes freedom, liberation, ambition, and escape from constraints.",
      ja: "自由、解放感、達成欲、制約からの脱出を象徴します。",
      fr: "Symbolise la liberté, la libération, l'ambition et l'évasion des contraintes.",
      es: "Simboliza libertad, liberación, ambición y escape de las restricciones.",
      zh: "象征自由、解放感、成就欲与从束缚中逃脱。",
    },
    positive: {
      ko: "자유롭게 나는 꿈은 자신감의 절정, 목표를 향한 강한 의지를 의미합니다.",
      en: "Flying freely means peak confidence and strong drive toward your goals.",
      ja: "自由に飛ぶ夢は自信の頂点、目標への強い意志を意味します。",
      fr: "Voler librement signifie une confiance maximale et une forte volonté vers vos objectifs.",
      es: "Volar libremente significa confianza máxima y fuerte determinación hacia tus metas.",
      zh: "自由飞翔意味着自信达到顶峰，对目标有强烈意志。",
    },
    negative: {
      ko: "너무 높이 날다가 추락할 것 같은 두려움은 과도한 야망이나 불안정함을 나타낼 수 있습니다.",
      en: "Fear of falling while flying too high may indicate excessive ambition or instability.",
      ja: "高く飛びすぎて落ちそうな恐怖は過度な野心や不安定さを示すことがあります。",
      fr: "La peur de tomber en volant trop haut peut indiquer une ambition excessive ou une instabilité.",
      es: "El miedo a caer mientras se vuela muy alto puede indicar ambición excesiva o inestabilidad.",
      zh: "飞太高而害怕坠落可能暗示过度野心或不稳定感。",
    },
    advice: {
      ko: "자신의 능력을 믿되, 현실적인 계획도 함께 세워보세요.",
      en: "Believe in your abilities, but also make realistic plans.",
      ja: "自分の能力を信じながら、現実的な計画も立てましょう。",
      fr: "Croyez en vos capacités, mais élaborez aussi des plans réalistes.",
      es: "Confía en tus capacidades, pero también haz planes realistas.",
      zh: "相信自己的能力，同时也要制定切实可行的计划。",
    },
  },

  // ── Animals ──
  {
    id: "snake",
    emoji: "🐍",
    category: "animals",
    name: { ko: "뱀", en: "Snake", ja: "蛇", fr: "Serpent", es: "Serpiente", zh: "蛇", },
    meaning: {
      ko: "변화, 치유, 지혜, 유혹, 숨겨진 두려움을 상징합니다.",
      en: "Symbolizes transformation, healing, wisdom, temptation, and hidden fears.",
      ja: "変容、癒し、知恵、誘惑、隠れた恐怖を象徴します。",
      fr: "Symbolise la transformation, la guérison, la sagesse, la tentation et les peurs cachées.",
      es: "Simboliza transformación, curación, sabiduría, tentación y miedos ocultos.",
      zh: "象征转化、治愈、智慧、诱惑与隐藏的恐惧。",
    },
    positive: {
      ko: "뱀이 허물을 벗는 꿈은 낡은 습관을 버리고 새롭게 거듭나는 것을 의미합니다.",
      en: "A snake shedding skin means letting go of old habits and being reborn.",
      ja: "蛇が脱皮する夢は古い習慣を捨て、新たに生まれ変わることを意味します。",
      fr: "Un serpent qui mue signifie abandonner les vieilles habitudes et renaître.",
      es: "Una serpiente mudando la piel significa dejar los viejos hábitos y renacer.",
      zh: "蛇蜕皮的梦意味着抛弃旧习惯、重获新生。",
    },
    negative: {
      ko: "공격적인 뱀은 주변에 신뢰하기 어려운 사람이 있거나 배신에 대한 두려움을 나타낼 수 있습니다.",
      en: "An aggressive snake may indicate untrustworthy people nearby or fear of betrayal.",
      ja: "攻撃的な蛇は周囲に信頼できない人がいるか、裏切りへの恐れを示すことがあります。",
      fr: "Un serpent agressif peut indiquer des personnes peu fiables ou la peur de la trahison.",
      es: "Una serpiente agresiva puede indicar personas poco confiables o miedo a la traición.",
      zh: "攻擊性的蛇可能暗示身邊有不可信任的人或對背叛的恐懼。",
    },
    advice: {
      ko: "주변 사람들과의 관계를 점검하고 건강하지 않은 관계는 정리해보세요.",
      en: "Review your relationships and let go of unhealthy ones.",
      ja: "周囲の人との関係を見直し、不健全な関係は整理しましょう。",
      fr: "Revoyez vos relations et mettez fin aux relations malsaines.",
      es: "Revisa tus relaciones y deja ir las poco saludables.",
      zh: "检视身边的关系，整理不健康的关系。",
    },
  },
  {
    id: "dog",
    emoji: "🐕",
    category: "animals",
    name: { ko: "개", en: "Dog", ja: "犬", fr: "Chien", es: "Perro", zh: "狗", },
    meaning: {
      ko: "충성심, 우정, 본능, 보호, 신뢰 관계를 상징합니다.",
      en: "Symbolizes loyalty, friendship, instinct, protection, and trust.",
      ja: "忠誠心、友情、本能、保護、信頼関係を象徴します。",
      fr: "Symbolise la loyauté, l'amitié, l'instinct, la protection et la confiance.",
      es: "Simboliza lealtad, amistad, instinto, protección y confianza.",
      zh: "象征忠诚、友谊、本能、保护与信任关系。",
    },
    positive: {
      ko: "친근한 개는 신뢰할 수 있는 친구나 지지자가 있음을 의미합니다.",
      en: "A friendly dog means you have trustworthy friends or supporters.",
      ja: "親しみやすい犬は信頼できる友人や支持者がいることを意味します。",
      fr: "Un chien amical signifie que vous avez des amis ou des partisans de confiance.",
      es: "Un perro amistoso significa que tienes amigos o seguidores de confianza.",
      zh: "友善的狗意味著你有可信賴的朋友或支持者。",
    },
    negative: {
      ko: "으르렁거리는 개는 관계에서의 갈등, 신뢰 문제, 경계 침범을 나타낼 수 있습니다.",
      en: "A snarling dog may indicate conflict in relationships, trust issues, or boundary violations.",
      ja: "唸る犬は関係での葛藤、信頼問題、境界線の侵害を示すことがあります。",
      fr: "Un chien qui grogne peut indiquer des conflits relationnels, des problèmes de confiance.",
      es: "Un perro gruñendo puede indicar conflictos en relaciones, problemas de confianza.",
      zh: "咆哮的狗可能暗示关系冲突、信任问题或边界侵犯。",
    },
    advice: {
      ko: "믿을 수 있는 사람들과의 관계를 소중히 여기고, 본능을 믿어보세요.",
      en: "Cherish relationships with trustworthy people and trust your instincts.",
      ja: "信頼できる人との関係を大切にし、本能を信じましょう。",
      fr: "Chérissez vos relations avec des personnes de confiance et faites confiance à vos instincts.",
      es: "Valora las relaciones con personas de confianza y confía en tus instintos.",
      zh: "珍惜与可信赖之人的关系，相信你的本能。",
    },
  },
  {
    id: "cat",
    emoji: "🐱",
    category: "animals",
    name: { ko: "고양이", en: "Cat", ja: "猫", fr: "Chat", es: "Gato", zh: "猫", },
    meaning: {
      ko: "독립심, 신비, 직관, 여성성, 숨겨진 본성을 상징합니다.",
      en: "Symbolizes independence, mystery, intuition, femininity, and hidden nature.",
      ja: "独立心、神秘、直感、女性性、隠された本性を象徴します。",
      fr: "Symbolise l'indépendance, le mystère, l'intuition, la féminité et la nature cachée.",
      es: "Simboliza independencia, misterio, intuición, feminidad y naturaleza oculta.",
      zh: "象征独立、神秘、直觉、女性气质与隐藏本性。",
    },
    positive: {
      ko: "온순한 고양이는 직관을 신뢰하고 독립심을 발휘해야 할 때임을 알립니다.",
      en: "A gentle cat signals it's time to trust your intuition and embrace independence.",
      ja: "おとなしい猫は直感を信頼し、独立心を発揮すべき時だと教えます。",
      fr: "Un chat doux signale qu'il est temps de faire confiance à votre intuition.",
      es: "Un gato gentil señala que es momento de confiar en tu intuición.",
      zh: "温顺的猫提示你要信任直觉并发挥独立性。",
    },
    negative: {
      ko: "공격적인 고양이는 배신, 기만, 혹은 자신의 어두운 면을 나타낼 수 있습니다.",
      en: "An aggressive cat may represent betrayal, deception, or your own shadow side.",
      ja: "攻撃的な猫は裏切り、欺瞞、または自分の暗い面を表すことがあります。",
      fr: "Un chat agressif peut représenter la trahison, la tromperie ou votre côté sombre.",
      es: "Un gato agresivo puede representar traición, engaño o tu lado oscuro.",
      zh: "攻击性的猫可能代表背叛、欺骗或自身的阴暗面。",
    },
    advice: {
      ko: "자신의 직관과 감각을 믿어보세요. 독립적인 결정을 내릴 용기를 가져보세요.",
      en: "Trust your intuition and senses. Have the courage to make independent decisions.",
      ja: "自分の直感と感覚を信じましょう。独立した決断を下す勇気を持ちましょう。",
      fr: "Faites confiance à votre intuition. Ayez le courage de prendre des décisions indépendantes.",
      es: "Confía en tu intuición. Ten el coraje de tomar decisiones independientes.",
      zh: "相信自己的直觉与感知，鼓起勇气做出独立决定。",
    },
  },
  {
    id: "bird",
    emoji: "🕊️",
    category: "animals",
    name: { ko: "새", en: "Bird", ja: "鳥", fr: "Oiseau", es: "Pájaro", zh: "鸟", },
    meaning: {
      ko: "자유, 영적 해방, 희망, 전달되는 메시지, 새로운 관점을 상징합니다.",
      en: "Symbolizes freedom, spiritual liberation, hope, messages being delivered, and new perspectives.",
      ja: "自由、精神的解放、希望、伝えられるメッセージ、新しい視点を象徴します。",
      fr: "Symbolise la liberté, la libération spirituelle, l'espoir et les nouvelles perspectives.",
      es: "Simboliza libertad, liberación espiritual, esperanza y nuevas perspectivas.",
      zh: "象征自由、精神解放、希望、传递的信息与新视角。",
    },
    positive: {
      ko: "하늘을 나는 새는 자유를 향한 열망, 좋은 소식이 올 것임을 의미합니다.",
      en: "Birds flying high mean a longing for freedom and good news coming.",
      ja: "空を飛ぶ鳥は自由への憧れ、良い知らせが来ることを意味します。",
      fr: "Des oiseaux qui volent haut signifient un désir de liberté et de bonnes nouvelles à venir.",
      es: "Pájaros volando alto significan anhelo de libertad y buenas noticias por venir.",
      zh: "在高空飞翔的鸟意味着对自由的渴望和好消息即将到来。",
    },
    negative: {
      ko: "갇힌 새나 죽은 새는 억압된 자유, 상실, 소통의 단절을 의미할 수 있습니다.",
      en: "A caged or dead bird may mean suppressed freedom, loss, or broken communication.",
      ja: "閉じ込められた鳥や死んだ鳥は抑圧された自由、喪失、コミュニケーションの断絶を意味するかもしれません。",
      fr: "Un oiseau en cage ou mort peut signifier liberté réprimée, perte ou communication brisée.",
      es: "Un pájaro enjaulado o muerto puede significar libertad suprimida, pérdida o comunicación rota.",
      zh: "被关笼中或死去的鸟可能意味着被压抑的自由、失去或沟通中断。",
    },
    advice: {
      ko: "일상에서 작은 자유를 찾아보세요. 새로운 관점으로 상황을 바라보는 연습을 해보세요.",
      en: "Find small freedoms in daily life. Practice seeing situations from new angles.",
      ja: "日常の中で小さな自由を見つけましょう。新しい視点で状況を見る練習をしましょう。",
      fr: "Trouvez de petites libertés dans la vie quotidienne. Pratiquez de nouveaux angles de vue.",
      es: "Encuentra pequeñas libertades en la vida diaria. Practica ver situaciones desde nuevos ángulos.",
      zh: "在日常生活中寻找小小的自由，练习从新角度看待事物。",
    },
  },

  // ── People ──
  {
    id: "deceased",
    emoji: "👻",
    category: "people",
    name: { ko: "고인 / 죽은 사람", en: "Deceased person", ja: "故人", fr: "Personne décédée", es: "Persona fallecida", zh: "故人", },
    meaning: {
      ko: "과거와의 연결, 해결되지 않은 슬픔, 지혜의 전달, 변화의 메시지를 상징합니다.",
      en: "Symbolizes connection to the past, unresolved grief, transmitted wisdom, and messages of change.",
      ja: "過去との繋がり、解決されていない悲しみ、知恵の伝達、変化のメッセージを象徴します。",
      fr: "Symbolise la connexion au passé, le deuil non résolu, la sagesse transmise et des messages de changement.",
      es: "Simboliza conexión con el pasado, duelo no resuelto, sabiduría transmitida y mensajes de cambio.",
      zh: "象征与过去的连结、未解决的悲伤、传递的智慧与变化的信息。",
    },
    positive: {
      ko: "고인이 밝게 웃거나 무언가를 전해주는 꿈은 보호받고 있다는 따뜻한 메시지입니다.",
      en: "A deceased person smiling or giving something is a warm message that you're protected.",
      ja: "故人が明るく笑ったり何かを伝えたりする夢は、守られているという温かいメッセージです。",
      fr: "Un défunt souriant ou donnant quelque chose est un message chaleureux que vous êtes protégé.",
      es: "Una persona fallecida sonriendo o dando algo es un mensaje cálido de que estás protegido.",
      zh: "故人微笑或傳遞東西是一個溫暖的信息，表示你被保護著。",
    },
    negative: {
      ko: "고인이 슬프거나 화난 모습은 아직 해결하지 못한 감정적 문제가 있음을 나타낼 수 있습니다.",
      en: "A sad or angry deceased person may indicate unresolved emotional issues.",
      ja: "故人が悲しそうだったり怒っていたりする姿は、まだ解決できていない感情的な問題があることを示すかもしれません。",
      fr: "Une personne décédée triste ou en colère peut indiquer des problèmes émotionnels non résolus.",
      es: "Una persona fallecida triste o enojada puede indicar problemas emocionales no resueltos.",
      zh: "故人悲伤或愤怒的样子可能表示还有未解决的情感问题。",
    },
    advice: {
      ko: "그리움이나 슬픔을 충분히 느끼고 표현해보세요. 과거와 화해하는 시간을 가져보세요.",
      en: "Allow yourself to fully feel and express longing or grief. Take time to make peace with the past.",
      ja: "思慕や悲しみを十分に感じ、表現しましょう。過去と和解する時間を持ちましょう。",
      fr: "Permettez-vous de ressentir et d'exprimer pleinement la nostalgie ou le deuil.",
      es: "Permítete sentir y expresar plenamente la añoranza o el duelo.",
      zh: "允许自己充分感受并表达思念或悲伤，花时间与过去和解。",
    },
  },
  {
    id: "stranger",
    emoji: "🧑",
    category: "people",
    name: { ko: "낯선 사람", en: "Stranger", ja: "見知らぬ人", fr: "Étranger", es: "Extraño", zh: "陌生人", },
    meaning: {
      ko: "자신의 알려지지 않은 측면, 새로운 기회, 숨겨진 가능성을 상징합니다.",
      en: "Symbolizes an unknown aspect of yourself, new opportunities, and hidden potential.",
      ja: "自分の未知の側面、新しいチャンス、隠れた可能性を象徴します。",
      fr: "Symbolise un aspect inconnu de vous-même, de nouvelles opportunités et un potentiel caché.",
      es: "Simboliza un aspecto desconocido de ti mismo, nuevas oportunidades y potencial oculto.",
      zh: "象征自身未知的一面、新机会与隐藏的潜能。",
    },
    positive: {
      ko: "친근하게 느껴지는 낯선 사람은 아직 발견하지 못한 자신의 능력이나 새로운 관계를 의미합니다.",
      en: "A friendly stranger represents undiscovered abilities or new relationships.",
      ja: "親しみやすい見知らぬ人は、まだ発見していない自分の能力や新しい関係を意味します。",
      fr: "Un étranger amical représente des capacités non découvertes ou de nouvelles relations.",
      es: "Un extraño amistoso representa habilidades no descubiertas o nuevas relaciones.",
      zh: "感觉亲切的陌生人代表尚未发现的自身能力或新的关系。",
    },
    negative: {
      ko: "위협적인 낯선 사람은 변화에 대한 두려움이나 내면의 갈등을 나타낼 수 있습니다.",
      en: "A threatening stranger may indicate fear of change or inner conflict.",
      ja: "脅威を感じる見知らぬ人は変化への恐れや内的葛藤を示すことがあります。",
      fr: "Un étranger menaçant peut indiquer une peur du changement ou un conflit intérieur.",
      es: "Un extraño amenazante puede indicar miedo al cambio o conflicto interior.",
      zh: "威脅性的陌生人可能暗示對變化的恐懼或內心衝突。",
    },
    advice: {
      ko: "새로운 사람이나 경험에 열린 마음을 가져보세요. 자신의 숨겨진 재능을 탐구해보세요.",
      en: "Keep an open mind to new people and experiences. Explore your hidden talents.",
      ja: "新しい人や経験に開かれた心を持ちましょう。隠れた才能を探求しましょう。",
      fr: "Gardez l'esprit ouvert aux nouvelles personnes et expériences. Explorez vos talents cachés.",
      es: "Mantén una mente abierta a nuevas personas y experiencias. Explora tus talentos ocultos.",
      zh: "对新的人和经历保持开放心态，探索你的隐藏才能。",
    },
  },

  // ── Places ──
  {
    id: "house",
    emoji: "🏠",
    category: "places",
    name: { ko: "집", en: "House", ja: "家", fr: "Maison", es: "Casa", zh: "房子", },
    meaning: {
      ko: "자신의 심리적 구조, 자아, 가족 관계, 안전감을 상징합니다.",
      en: "Symbolizes your psychological structure, the self, family relationships, and sense of safety.",
      ja: "自分の心理的構造、自我、家族関係、安全感を象徴します。",
      fr: "Symbolise votre structure psychologique, le moi, les relations familiales et le sentiment de sécurité.",
      es: "Simboliza tu estructura psicológica, el yo, las relaciones familiares y la sensación de seguridad.",
      zh: "象征你的心理结构、自我、家庭关系与安全感。",
    },
    positive: {
      ko: "밝고 넓은 집은 안정된 자아, 따뜻한 가족 관계, 심리적 안정을 의미합니다.",
      en: "A bright, spacious house means a stable self, warm family bonds, and psychological security.",
      ja: "明るく広い家は安定した自我、温かい家族関係、心理的安定を意味します。",
      fr: "Une maison lumineuse et spacieuse signifie un moi stable, des liens familiaux chaleureux.",
      es: "Una casa brillante y espaciosa significa un yo estable, lazos familiares cálidos.",
      zh: "明亮宽敞的房子意味着稳定的自我、温暖的家庭关系和心理安全感。",
    },
    negative: {
      ko: "무너지거나 낡은 집은 자아 정체성의 혼란, 가족 갈등, 심리적 불안을 나타낼 수 있습니다.",
      en: "A crumbling or run-down house may indicate identity confusion, family conflict, or psychological instability.",
      ja: "崩れた古い家は自我同一性の混乱、家族の葛藤、心理的不安を示すことがあります。",
      fr: "Une maison qui s'effondre peut indiquer une confusion identitaire, des conflits familiaux.",
      es: "Una casa que se derrumba puede indicar confusión de identidad, conflictos familiares.",
      zh: "倒塌或破舊的房子可能暗示自我認同混亂、家庭衝突或心理不安。",
    },
    advice: {
      ko: "자신의 내면 상태를 점검하고 필요한 경우 전문가의 도움을 받아보세요.",
      en: "Check in with your inner state and seek professional help if needed.",
      ja: "自分の内面の状態を確認し、必要であれば専門家の助けを求めましょう。",
      fr: "Faites le point sur votre état intérieur et demandez de l'aide professionnelle si nécessaire.",
      es: "Revisa tu estado interior y busca ayuda profesional si es necesario.",
      zh: "检视内心状态，必要时寻求专业帮助。",
    },
  },
  {
    id: "school",
    emoji: "🏫",
    category: "places",
    name: { ko: "학교", en: "School", ja: "学校", fr: "École", es: "Escuela", zh: "学校", },
    meaning: {
      ko: "학습, 성장, 사회적 관계, 과거의 경험이나 불안을 상징합니다.",
      en: "Symbolizes learning, growth, social relationships, and past experiences or anxieties.",
      ja: "学習、成長、社会的関係、過去の経験や不安を象徴します。",
      fr: "Symbolise l'apprentissage, la croissance, les relations sociales et les expériences ou anxiétés passées.",
      es: "Simboliza aprendizaje, crecimiento, relaciones sociales y experiencias o ansiedades pasadas.",
      zh: "象征学习、成长、社会关系与过去的经历或焦虑。",
    },
    positive: {
      ko: "즐거운 학교 꿈은 새로운 것을 배우고 싶은 욕구나 성장 중임을 나타냅니다.",
      en: "A happy school dream shows a desire to learn new things or signals you are growing.",
      ja: "楽しい学校の夢は新しいことを学びたい欲求や成長中であることを示します。",
      fr: "Un rêve scolaire agréable montre un désir d'apprendre ou signale que vous grandissez.",
      es: "Un sueño escolar feliz muestra deseo de aprender o señala que estás creciendo.",
      zh: "愉快的学校梦表示想学习新事物的渴望或正在成长。",
    },
    negative: {
      ko: "시험에 늦거나 실패하는 학교 꿈은 현실의 성과 압박이나 평가에 대한 불안을 반영합니다.",
      en: "Being late for or failing at school reflects real-life performance pressure or evaluation anxiety.",
      ja: "学校に遅刻したり失敗する夢は現実の成果プレッシャーや評価への不安を反映します。",
      fr: "Être en retard ou échouer à l'école reflète la pression des performances ou l'anxiété d'évaluation.",
      es: "Llegar tarde o fallar en la escuela refleja presión de rendimiento o ansiedad de evaluación.",
      zh: "上学迟到或考试失败的梦反映现实中的表现压力或对评估的焦虑。",
    },
    advice: {
      ko: "완벽주의를 내려놓고 배움 자체를 즐기는 시간을 가져보세요.",
      en: "Let go of perfectionism and take time to enjoy learning itself.",
      ja: "完璧主義を手放し、学ぶこと自体を楽しむ時間を持ちましょう。",
      fr: "Lâchez le perfectionnisme et prenez le temps d'apprécier l'apprentissage en lui-même.",
      es: "Suelta el perfeccionismo y tómate tiempo para disfrutar el aprendizaje en sí.",
      zh: "放下完美主义，花时间享受学习本身。",
    },
  },

  // ── Actions ──
  {
    id: "running",
    emoji: "🏃",
    category: "actions",
    name: { ko: "달리기 / 도망", en: "Running / Fleeing", ja: "走る / 逃げる", fr: "Courir / Fuir", es: "Correr / Huir", zh: "奔跑 / 逃跑", },
    meaning: {
      ko: "무언가를 향해 달리거나 피하고 싶은 욕구, 긴박함과 압박감을 상징합니다.",
      en: "Symbolizes urgency and pressure, or a desire to pursue or escape something.",
      ja: "何かに向かって走る、または避けたい欲求、緊迫感とプレッシャーを象徴します。",
      fr: "Symbolise l'urgence et la pression, ou un désir de poursuivre ou d'échapper à quelque chose.",
      es: "Simboliza urgencia y presión, o un deseo de perseguir o escapar de algo.",
      zh: "象征紧迫感与压力，或渴望追求或逃避某事。",
    },
    positive: {
      ko: "목표를 향해 달리는 꿈은 강한 동기부여와 목표에 대한 열정을 나타냅니다.",
      en: "Running toward a goal shows strong motivation and passion.",
      ja: "目標に向かって走る夢は強い動機づけと目標への情熱を示します。",
      fr: "Courir vers un objectif montre une forte motivation et de la passion.",
      es: "Correr hacia una meta muestra fuerte motivación y pasión.",
      zh: "向目标奔跑的梦表示强烈的动力和对目标的热情。",
    },
    negative: {
      ko: "무언가에게 쫓기는 꿈은 직면하지 않으려는 두려움이나 회피 패턴을 나타낼 수 있습니다.",
      en: "Being chased may indicate fears you're avoiding or patterns of avoidance.",
      ja: "何かに追われる夢は直面しようとしない恐れや回避パターンを示すことがあります。",
      fr: "Être poursuivi peut indiquer des peurs que vous évitez ou des schémas d'évitement.",
      es: "Ser perseguido puede indicar miedos que evitas o patrones de evitación.",
      zh: "被追趕的夢可能暗示你在迴避的恐懼或逃避模式。",
    },
    advice: {
      ko: "현재 회피하고 있는 문제가 있다면 작은 한 걸음부터 직면해보세요.",
      en: "If you're avoiding a problem, try facing it one small step at a time.",
      ja: "現在回避している問題があれば、小さな一歩から直面してみましょう。",
      fr: "Si vous évitez un problème, essayez de le confronter un petit pas à la fois.",
      es: "Si estás evitando un problema, intenta enfrentarlo un pequeño paso a la vez.",
      zh: "如果你在逃避某个问题，试着一小步一小步地面对它。",
    },
  },
  {
    id: "exam",
    emoji: "📝",
    category: "actions",
    name: { ko: "시험", en: "Exam", ja: "試験", fr: "Examen", es: "Examen", zh: "考试", },
    meaning: {
      ko: "자기 평가, 성과에 대한 불안, 중요한 시험대를 상징합니다.",
      en: "Symbolizes self-evaluation, performance anxiety, and an important test in life.",
      ja: "自己評価、成果への不安、重要な試練を象徴します。",
      fr: "Symbolise l'auto-évaluation, l'anxiété de performance et une épreuve importante.",
      es: "Simboliza autoevaluación, ansiedad de rendimiento y una prueba importante en la vida.",
      zh: "象征自我评估、对表现的焦虑与重要的人生考验。",
    },
    positive: {
      ko: "시험을 잘 보는 꿈은 자신에 대한 확신과 현실에서의 준비가 잘 되어 있음을 의미합니다.",
      en: "Doing well on an exam means confidence and being well-prepared in reality.",
      ja: "試験がうまくいく夢は自分への確信と現実での準備ができていることを意味します。",
      fr: "Bien réussir un examen signifie confiance en soi et bonne préparation dans la réalité.",
      es: "Hacerlo bien en un examen significa confianza y buena preparación en la realidad.",
      zh: "考试顺利意味着对自己有信心且在现实中准备充分。",
    },
    negative: {
      ko: "시험을 못 보거나 준비가 안 된 꿈은 평가받는 것에 대한 두려움이나 완벽주의를 반영합니다.",
      en: "Failing or being unprepared for an exam reflects fear of judgment or perfectionism.",
      ja: "試験がうまくいかない、準備できていない夢は評価への恐れや完璧主義を反映します。",
      fr: "Échouer ou être mal préparé reflète la peur du jugement ou le perfectionnisme.",
      es: "Fallar o estar mal preparado refleja miedo al juicio o perfeccionismo.",
      zh: "考试失败或没有准备的梦反映对评判的恐惧或完美主义。",
    },
    advice: {
      ko: "결과보다 과정에 집중하는 연습을 해보세요. 충분히 준비된 자신을 인정해주세요.",
      en: "Practice focusing on the process rather than results. Acknowledge how well-prepared you are.",
      ja: "結果よりも過程に集中する練習をしましょう。十分に準備できた自分を認めましょう。",
      fr: "Pratiquez la concentration sur le processus plutôt que les résultats.",
      es: "Practica enfocarte en el proceso más que en los resultados.",
      zh: "练习专注于过程而非结果，认可自己已充分准备。",
    },
  },

  // ── Objects ──
  {
    id: "money",
    emoji: "💰",
    category: "objects",
    name: { ko: "돈 / 재물", en: "Money", ja: "お金", fr: "Argent", es: "Dinero", zh: "金錢", },
    meaning: {
      ko: "힘, 가치, 자원, 안전감, 자아 가치를 상징합니다.",
      en: "Symbolizes power, value, resources, security, and self-worth.",
      ja: "力、価値、資源、安全感、自己価値を象徴します。",
      fr: "Symbolise le pouvoir, la valeur, les ressources, la sécurité et l'estime de soi.",
      es: "Simboliza poder, valor, recursos, seguridad y autoestima.",
      zh: "象征力量、价值、资源、安全感与自我价值。",
    },
    positive: {
      ko: "돈을 줍거나 많이 있는 꿈은 기회, 자원 획득, 자신감 상승을 의미합니다.",
      en: "Finding or having lots of money means opportunities, gaining resources, and rising confidence.",
      ja: "お金を拾うや多くある夢はチャンス、資源の獲得、自信の向上を意味します。",
      fr: "Trouver ou avoir beaucoup d'argent signifie opportunités, acquisition de ressources.",
      es: "Encontrar o tener mucho dinero significa oportunidades, adquisición de recursos.",
      zh: "捡到钱或拥有很多钱意味着机遇、获取资源和自信心提升。",
    },
    negative: {
      ko: "돈을 잃는 꿈은 안전감의 위협, 가치에 대한 의문, 재정적 불안을 나타낼 수 있습니다.",
      en: "Losing money may indicate threatened security, questioning your value, or financial anxiety.",
      ja: "お金を失う夢は安全感への脅威、価値への疑問、経済的不安を示すことがあります。",
      fr: "Perdre de l'argent peut indiquer une sécurité menacée ou une anxiété financière.",
      es: "Perder dinero puede indicar seguridad amenazada o ansiedad financiera.",
      zh: "失去金钱的梦可能暗示安全感受到威胁、质疑自身价值或财务焦虑。",
    },
    advice: {
      ko: "외적 성공보다 내면의 풍요로움에 집중해보세요. 지금 가진 것에 감사하는 시간을 가져보세요.",
      en: "Focus on inner richness over external success. Take time to be grateful for what you have.",
      ja: "外的成功より内面の豊かさに集中しましょう。今持っているものに感謝する時間を持ちましょう。",
      fr: "Concentrez-vous sur la richesse intérieure plutôt que le succès externe.",
      es: "Enfócate en la riqueza interior sobre el éxito externo.",
      zh: "专注于内在丰盛而非外在成就，花时间感恩你所拥有的。",
    },
  },
  {
    id: "door",
    emoji: "🚪",
    category: "objects",
    name: { ko: "문", en: "Door", ja: "ドア", fr: "Porte", es: "Puerta", zh: "門", },
    meaning: {
      ko: "새로운 기회, 변화, 선택, 전환점, 비밀을 상징합니다.",
      en: "Symbolizes new opportunities, change, choices, turning points, and secrets.",
      ja: "新しいチャンス、変化、選択、転換点、秘密を象徴します。",
      fr: "Symbolise de nouvelles opportunités, le changement, les choix, les tournants et les secrets.",
      es: "Simboliza nuevas oportunidades, cambio, elecciones, puntos de inflexión y secretos.",
      zh: "象征新机会、变化、选择、转折点与秘密。",
    },
    positive: {
      ko: "열린 문이나 문을 통과하는 꿈은 새로운 기회 수용, 변화를 향한 준비를 의미합니다.",
      en: "An open door or passing through one means embracing new opportunities and readiness for change.",
      ja: "開いたドアやドアを通り抜ける夢は新しいチャンスの受容、変化への準備を意味します。",
      fr: "Une porte ouverte signifie l'accueil de nouvelles opportunités et la préparation au changement.",
      es: "Una puerta abierta significa abrazar nuevas oportunidades y estar listo para el cambio.",
      zh: "开着的门或穿过门的梦意味着迎接新机遇、为变化做好准备。",
    },
    negative: {
      ko: "잠긴 문이나 열리지 않는 문은 막힌 기회, 소통의 어려움, 내면의 장벽을 나타낼 수 있습니다.",
      en: "A locked or unopening door may indicate blocked opportunities, communication difficulties, or inner barriers.",
      ja: "施錠されたドアや開かないドアは塞がれた機会、コミュニケーションの困難、内なる障壁を示すかもしれません。",
      fr: "Une porte fermée à clé peut indiquer des opportunités bloquées, des difficultés de communication.",
      es: "Una puerta cerrada con llave puede indicar oportunidades bloqueadas, dificultades de comunicación.",
      zh: "上锁或打不开的门可能暗示机会受阻、沟通困难或内心障碍。",
    },
    advice: {
      ko: "현재 망설이고 있는 결정이 있다면 한 걸음 내딛어보세요. 새로운 가능성에 열린 자세를 유지하세요.",
      en: "If you're hesitating on a decision, take one step forward. Stay open to new possibilities.",
      ja: "迷っている決断があれば、一歩踏み出してみましょう。新しい可能性に開かれた姿勢を保ちましょう。",
      fr: "Si vous hésitez sur une décision, faites un pas en avant. Restez ouvert aux nouvelles possibilités.",
      es: "Si estás dudando de una decisión, da un paso adelante. Mantente abierto a nuevas posibilidades.",
      zh: "如果你在某个决定上犹豫不决，迈出一步吧。保持对新可能性的开放态度。",
    },
  },

  // ── Emotions ──
  {
    id: "joy",
    emoji: "😊",
    category: "emotions",
    name: { ko: "기쁨 / 행복", en: "Joy / Happiness", ja: "喜び / 幸福", fr: "Joie / Bonheur", es: "Alegría / Felicidad", zh: "喜悅 / 幸福", },
    meaning: {
      ko: "충족감, 조화, 내면의 평화, 긍정적 에너지를 상징합니다.",
      en: "Symbolizes fulfillment, harmony, inner peace, and positive energy.",
      ja: "充足感、調和、内なる平和、ポジティブなエネルギーを象徴します。",
      fr: "Symbolise l'épanouissement, l'harmonie, la paix intérieure et l'énergie positive.",
      es: "Simboliza plenitud, armonía, paz interior y energía positiva.",
      zh: "象征充足感、和谐、内心平静与正面能量。",
    },
    positive: {
      ko: "꿈속에서 느낀 기쁨은 현실에서 이루고 싶은 것이 무엇인지 알려주는 나침반입니다.",
      en: "Joy felt in dreams is a compass showing what you truly want to achieve in reality.",
      ja: "夢の中で感じた喜びは、現実で成し遂げたいことを教える羅針盤です。",
      fr: "La joie ressentie en rêve est une boussole indiquant ce que vous voulez vraiment accomplir.",
      es: "La alegría sentida en sueños es una brújula que muestra lo que realmente quieres lograr.",
      zh: "夢中感受到的喜悅是指引你在現實中真正想實現之事的指南針。",
    },
    negative: {
      ko: "꿈에서만 행복하고 깨어나면 공허한 느낌은 현실에서 채워지지 않은 욕구가 있음을 나타냅니다.",
      en: "Feeling happy only in dreams and empty upon waking indicates unmet needs in reality.",
      ja: "夢の中だけ幸せで目覚めると空虚な感覚は現実で満たされていない欲求があることを示します。",
      fr: "Se sentir heureux seulement en rêve et vide au réveil indique des besoins non satisfaits.",
      es: "Sentirse feliz solo en sueños y vacío al despertar indica necesidades insatisfechas en la realidad.",
      zh: "只在夢中快樂，醒來卻感到空虛，表示現實中有未滿足的需求。",
    },
    advice: {
      ko: "꿈속에서 기쁨을 느꼈다면 그 감정을 현실에서도 재현할 방법을 찾아보세요.",
      en: "If you felt joy in dreams, find ways to recreate that feeling in reality.",
      ja: "夢の中で喜びを感じたなら、その感情を現実でも再現する方法を探してみましょう。",
      fr: "Si vous avez ressenti de la joie en rêve, trouvez des moyens de recréer ce sentiment dans la réalité.",
      es: "Si sentiste alegría en sueños, encuentra formas de recrear ese sentimiento en la realidad.",
      zh: "如果你在梦中感到喜悦，试着找到在现实中重现那种感觉的方法。",
    },
  },
  {
    id: "fear",
    emoji: "😨",
    category: "emotions",
    name: { ko: "공포 / 두려움", en: "Fear", ja: "恐怖 / 不安", fr: "Peur", es: "Miedo", zh: "恐懼", },
    meaning: {
      ko: "위협, 불확실성, 자신의 취약한 부분, 직면하지 못한 문제를 상징합니다.",
      en: "Symbolizes threats, uncertainty, your vulnerable side, and unconfronted problems.",
      ja: "脅威、不確実性、自分の脆弱な部分、直面できていない問題を象徴します。",
      fr: "Symbolise les menaces, l'incertitude, votre côté vulnérable et les problèmes non confrontés.",
      es: "Simboliza amenazas, incertidumbre, tu lado vulnerable y problemas no confrontados.",
      zh: "象征威胁、不确定性、自身脆弱的一面与未面对的问题。",
    },
    positive: {
      ko: "공포를 극복하는 꿈은 내면의 용기와 성장 가능성을 나타냅니다.",
      en: "Overcoming fear in a dream signals inner courage and potential for growth.",
      ja: "恐怖を克服する夢は内なる勇気と成長の可能性を示します。",
      fr: "Surmonter la peur dans un rêve signale le courage intérieur et le potentiel de croissance.",
      es: "Superar el miedo en un sueño señala coraje interior y potencial de crecimiento.",
      zh: "在梦中克服恐惧象征内在的勇气与成长潜力。",
    },
    negative: {
      ko: "반복되는 공포 꿈은 무의식이 처리하지 못한 트라우마나 강렬한 스트레스를 나타낼 수 있습니다.",
      en: "Recurring fear dreams may indicate unprocessed trauma or intense stress in the unconscious.",
      ja: "繰り返す恐怖の夢は無意識が処理できていないトラウマや強烈なストレスを示すことがあります。",
      fr: "Des rêves de peur récurrents peuvent indiquer un traumatisme non traité ou un stress intense.",
      es: "Los sueños de miedo recurrentes pueden indicar traumas no procesados o estrés intenso.",
      zh: "反复出现的恐惧梦可能暗示潜意识中未处理的创伤或强烈压力。",
    },
    advice: {
      ko: "반복되는 공포 꿈이 있다면 전문 상담을 고려해보세요. 두려움을 이름 붙여 인식하는 것이 극복의 첫 걸음입니다.",
      en: "If recurring fear dreams persist, consider professional counseling. Naming your fears is the first step to overcoming them.",
      ja: "繰り返す恐怖の夢があれば、専門カウンセリングを考えましょう。恐れに名前をつけることが克服への第一歩です。",
      fr: "Si des rêves de peur récurrents persistent, envisagez un conseil professionnel.",
      es: "Si persisten sueños de miedo recurrentes, considera el asesoramiento profesional.",
      zh: "如果反复出现恐惧梦，考虑寻求专业辅导。为恐惧命名是克服它的第一步。",
    },
  },
];

// ─── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<DreamCategory, { bg: string; border: string; text: string; badge: string }> = {
  nature:   { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-800",  badge: "bg-green-100 text-green-700" },
  body:     { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-800",   badge: "bg-blue-100 text-blue-700" },
  animals:  { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-800",  badge: "bg-amber-100 text-amber-700" },
  people:   { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-100 text-purple-700" },
  places:   { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-800",   badge: "bg-rose-100 text-rose-700" },
  actions:  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
  objects:  { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-700" },
  emotions: { bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-800",   badge: "bg-pink-100 text-pink-700" },
};

const CATEGORIES: DreamCategory[] = ["nature", "body", "animals", "people", "places", "actions", "objects", "emotions"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DreamInterpreter({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [selected, setSelected] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DreamCategory | "all">("all");
  const [flashMsg, setFlashMsg] = useState("");

  const MAX = 5;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((s) => s !== id));
      setShowResult(false);
    } else {
      if (selected.length >= MAX) {
        setFlashMsg(t.maxReached);
        setTimeout(() => setFlashMsg(""), 2000);
        return;
      }
      setSelected((prev) => [...prev, id]);
      setShowResult(false);
    }
  };

  const clear = () => {
    setSelected([]);
    setShowResult(false);
    setActiveCategory("all");
  };

  const filtered = activeCategory === "all"
    ? SYMBOLS
    : SYMBOLS.filter((s) => s.category === activeCategory);

  const selectedSymbols = SYMBOLS.filter((s) => selected.includes(s.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">🌙</div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      {/* Flash message */}
      {flashMsg && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg py-2 px-4">
          {flashMsg}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const c = CATEGORY_COLORS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                isActive
                  ? `${c.bg} ${c.border} ${c.text}`
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.categoryLabels[cat]}
            </button>
          );
        })}
      </div>

      {/* Symbol grid */}
      <div>
        <p className="text-xs text-gray-500 mb-3 text-center">{t.selectPrompt}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filtered.map((sym) => {
            const isSelected = selected.includes(sym.id);
            const c = CATEGORY_COLORS[sym.category];
            return (
              <button
                key={sym.id}
                onClick={() => toggle(sym.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? `${c.bg} ${c.border} ring-2 ring-offset-1 ring-current ${c.text}`
                    : "bg-white border-gray-100 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="text-2xl">{sym.emoji}</span>
                <span className="text-xs font-medium leading-tight">{sym.name[locale]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">{t.selectedLabel} ({selected.length}/{MAX})</p>
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map((sym) => {
              const c = CATEGORY_COLORS[sym.category];
              return (
                <span
                  key={sym.id}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${c.badge}`}
                >
                  {sym.emoji} {sym.name[locale]}
                  <button
                    onClick={() => toggle(sym.id)}
                    className="ml-1 opacity-60 hover:opacity-100 text-xs"
                    aria-label="remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => {
            if (selected.length === 0) {
              setFlashMsg(t.noSelection);
              setTimeout(() => setFlashMsg(""), 2000);
              return;
            }
            setShowResult(true);
          }}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
        >
          {t.interpretBtn}
        </button>
        {selected.length > 0 && (
          <button
            onClick={clear}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            {t.clearBtn}
          </button>
        )}
      </div>

      {/* Results */}
      {showResult && selectedSymbols.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="border-t border-gray-100 pt-4" />
          {selectedSymbols.map((sym) => {
            const c = CATEGORY_COLORS[sym.category];
            return (
              <div key={sym.id} className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-4`}>
                {/* Symbol header */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sym.emoji}</span>
                  <div>
                    <h2 className={`text-lg font-bold ${c.text}`}>{sym.name[locale]}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                      {t.categoryLabels[sym.category]}
                    </span>
                  </div>
                </div>

                {/* Meaning */}
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.text} opacity-70`}>
                    {t.meaningLabel}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{sym.meaning[locale]}</p>
                </div>

                {/* Positive / Negative */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white bg-opacity-60 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">✅ {t.positiveLabel}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{sym.positive[locale]}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-xl p-3">
                    <p className="text-xs font-semibold text-rose-500 mb-1">⚠️ {t.negativeLabel}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{sym.negative[locale]}</p>
                  </div>
                </div>

                {/* Advice */}
                <div className="bg-white bg-opacity-70 rounded-xl p-3 border border-white">
                  <p className={`text-xs font-semibold mb-1 ${c.text}`}>💡 {t.adviceLabel}</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{sym.advice[locale]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
