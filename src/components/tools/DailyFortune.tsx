import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Seed-based RNG ───────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function dateSeed(birth: string, today: string): number {
  const b = birth.replace(/-/g, "");
  const t = today.replace(/-/g, "");
  return parseInt(b) * 1000 + parseInt(t.slice(4));
}

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    birthLabel: string;
    birthPlaceholder: string;
    submitBtn: string;
    resetBtn: string;
    overall: string;
    love: string;
    money: string;
    health: string;
    career: string;
    lucky: string;
    luckyNum: string;
    luckyColor: string;
    luckyDir: string;
    cacheNote: string;
    tomorrow: string;
  }
> = {
  ko: {
    title: "오늘의 운세",
    subtitle: "생년월일을 입력하면 오늘의 운세를 알려드립니다",
    birthLabel: "생년월일",
    birthPlaceholder: "생년월일을 선택하세요",
    submitBtn: "운세 보기",
    resetBtn: "내일 다시 보기",
    overall: "전체운",
    love: "애정운",
    money: "금전운",
    health: "건강운",
    career: "직업운",
    lucky: "오늘의 행운",
    luckyNum: "행운의 숫자",
    luckyColor: "행운의 색",
    luckyDir: "행운의 방향",
    cacheNote: "오늘 날짜 기준으로 저장된 운세입니다",
    tomorrow: "내일 다시 보기",
  },
  en: {
    title: "Daily Fortune",
    subtitle: "Enter your birth date to discover today's fortune",
    birthLabel: "Date of Birth",
    birthPlaceholder: "Select your birth date",
    submitBtn: "Read My Fortune",
    resetBtn: "Come Back Tomorrow",
    overall: "Overall",
    love: "Love",
    money: "Money",
    health: "Health",
    career: "Career",
    lucky: "Today's Lucky",
    luckyNum: "Lucky Number",
    luckyColor: "Lucky Color",
    luckyDir: "Lucky Direction",
    cacheNote: "Fortune saved for today",
    tomorrow: "Come Back Tomorrow",
  },
  ja: {
    title: "今日の運勢",
    subtitle: "生年月日を入力して今日の運勢を確認しましょう",
    birthLabel: "生年月日",
    birthPlaceholder: "生年月日を選択してください",
    submitBtn: "運勢を見る",
    resetBtn: "明日また見る",
    overall: "総合運",
    love: "恋愛運",
    money: "金運",
    health: "健康運",
    career: "仕事運",
    lucky: "今日のラッキー",
    luckyNum: "ラッキーナンバー",
    luckyColor: "ラッキーカラー",
    luckyDir: "ラッキー方位",
    cacheNote: "今日の日付で保存された運勢です",
    tomorrow: "明日また見る",
  },
  fr: {
    title: "Horoscope du Jour",
    subtitle: "Entrez votre date de naissance pour découvrir votre fortune du jour",
    birthLabel: "Date de Naissance",
    birthPlaceholder: "Sélectionnez votre date de naissance",
    submitBtn: "Voir ma Fortune",
    resetBtn: "Revenir Demain",
    overall: "Fortune Générale",
    love: "Amour",
    money: "Argent",
    health: "Santé",
    career: "Carrière",
    lucky: "Chance du Jour",
    luckyNum: "Numéro Chanceux",
    luckyColor: "Couleur Chanceuse",
    luckyDir: "Direction Chanceuse",
    cacheNote: "Fortune enregistrée pour aujourd'hui",
    tomorrow: "Revenir Demain",
  },
  es: {
    title: "Fortuna del Día",
    subtitle: "Ingresa tu fecha de nacimiento para descubrir tu fortuna de hoy",
    birthLabel: "Fecha de Nacimiento",
    birthPlaceholder: "Selecciona tu fecha de nacimiento",
    submitBtn: "Ver mi Fortuna",
    resetBtn: "Volver Mañana",
    overall: "Fortuna General",
    love: "Amor",
    money: "Dinero",
    health: "Salud",
    career: "Carrera",
    lucky: "Suerte del Día",
    luckyNum: "Número de Suerte",
    luckyColor: "Color de Suerte",
    luckyDir: "Dirección de Suerte",
    cacheNote: "Fortuna guardada para hoy",
    tomorrow: "Volver Mañana",
  },
  zh: {
    title: "今日运势",
    subtitle: "输入生日查看今天的运势",
    birthLabel: "出生日期",
    birthPlaceholder: "选择出生日期",
    submitBtn: "查看运势",
    resetBtn: "明天再来",
    overall: "综合运势",
    love: "爱情运",
    money: "财运",
    health: "健康运",
    career: "事业运",
    lucky: "今日幸运",
    luckyNum: "幸运数字",
    luckyColor: "幸运颜色",
    luckyDir: "幸运方位",
    cacheNote: "今天的运势已保存",
    tomorrow: "明天再来",
  },
};

// ─── Fortune Texts ────────────────────────────────────────────────────────────

const FORTUNE_TEXTS = {
  overall: {
    ko: {
      good: [
        "오늘은 모든 일이 순조롭게 흘러가는 길운입니다. 적극적으로 나서면 좋은 결과를 얻을 수 있어요.",
        "긍정적인 에너지가 넘치는 하루입니다. 오래 미뤄온 일을 시작하기에 최적의 날이에요.",
        "새로운 기회가 찾아오는 날입니다. 주변의 신호를 놓치지 마세요.",
      ],
      mid: [
        "평온한 하루가 될 것입니다. 서두르지 않고 차분히 진행하면 무난한 결과를 기대할 수 있어요.",
        "보통의 운세입니다. 큰 모험보다는 안정적인 선택이 좋은 하루예요.",
        "잔잔한 파도처럼 무난한 하루입니다. 주변 사람들과의 소통에 집중해 보세요.",
      ],
      bad: [
        "인내가 필요한 하루입니다. 무리한 계획보다는 기본에 충실하는 것이 좋아요.",
        "다소 힘든 기운이 감돌지만 이 또한 지나갈 것입니다. 마음을 차분히 하세요.",
        "도전보다는 수성에 집중하세요. 지금은 준비를 다지는 시간입니다.",
      ],
    },
    en: {
      good: [
        "Today brings wonderful energy and smooth progress. Take initiative and great results will follow.",
        "Positive vibes surround you all day. It's the perfect time to start something you've been putting off.",
        "New opportunities are knocking at your door. Stay alert and don't miss the signals around you.",
      ],
      mid: [
        "A calm and steady day awaits. Progress without rushing and expect reasonable outcomes.",
        "Average energy today. Stick to safe, stable choices rather than risky ventures.",
        "A quiet, uneventful day. Focus on meaningful conversations with those around you.",
      ],
      bad: [
        "Patience will be your greatest asset today. Stay grounded and avoid overextending yourself.",
        "Challenges may arise, but they will pass. Keep a steady mind and carry on.",
        "Focus on consolidation rather than expansion. Use today to prepare and strengthen your foundations.",
      ],
    },
    ja: {
      good: [
        "今日はすべてが順調に進む吉日です。積極的に行動すれば良い結果が得られます。",
        "ポジティブなエネルギーに満ちた一日です。先延ばしにしていたことを始める絶好の機会ですよ。",
        "新しいチャンスが訪れる日です。周囲のサインを見逃さないようにしましょう。",
      ],
      mid: [
        "穏やかな一日になるでしょう。焦らず落ち着いて進めれば無難な結果が期待できます。",
        "普通の運勢です。大きな冒険より安定した選択が吉の一日です。",
        "波風のない静かな一日です。周りの人とのコミュニケーションに集中してみましょう。",
      ],
      bad: [
        "忍耐が必要な一日です。無理な計画より基本に忠実であることが大切です。",
        "やや辛い気が漂いますが、これも過ぎ去ります。心を落ち着かせましょう。",
        "挑戦より守りに集中しましょう。今は準備を固める時間です。",
      ],
    },
    fr: {
      good: [
        "Aujourd'hui apporte une énergie merveilleuse. Prenez des initiatives et de bons résultats suivront.",
        "Des vibrations positives vous entourent toute la journée. C'est le moment idéal pour commencer quelque chose.",
        "De nouvelles opportunités frappent à votre porte. Restez alerte et ne manquez pas les signaux.",
      ],
      mid: [
        "Une journée calme et stable vous attend. Avancez sans vous précipiter.",
        "Énergie moyenne aujourd'hui. Optez pour des choix sûrs plutôt que des aventures risquées.",
        "Une journée tranquille. Concentrez-vous sur des conversations significatives.",
      ],
      bad: [
        "La patience sera votre meilleur atout aujourd'hui. Restez ancré et évitez de vous surpasser.",
        "Des défis peuvent surgir, mais ils passeront. Gardez l'esprit stable.",
        "Concentrez-vous sur la consolidation. Utilisez aujourd'hui pour préparer vos fondations.",
      ],
    },
    es: {
      good: [
        "Hoy trae una energía maravillosa y progreso fluido. Toma la iniciativa y llegarán grandes resultados.",
        "Vibraciones positivas te rodean todo el día. Es el momento perfecto para empezar algo que has estado postergando.",
        "Nuevas oportunidades llaman a tu puerta. Mantente alerta y no pierdas las señales.",
      ],
      mid: [
        "Te espera un día tranquilo y estable. Avanza sin prisa y espera resultados razonables.",
        "Energía promedio hoy. Elige opciones seguras en lugar de aventuras arriesgadas.",
        "Un día tranquilo y sin eventos. Enfócate en conversaciones significativas.",
      ],
      bad: [
        "La paciencia será tu mayor activo hoy. Mantente firme y evita sobreextenderte.",
        "Pueden surgir desafíos, pero pasarán. Mantén la mente estable.",
        "Enfócate en consolidar en lugar de expandir. Usa hoy para preparar tus cimientos.",
      ],
    },
    zh: {
      good: [
        "今天带来美好能量，事事顺遂。主动出击，好结果自然会来。",
        "正能量充满全天。是开始你一直推迟之事的最佳时机。",
        "新机遇正在敲门。保持警觉，不要错过周围的信号。",
      ],
      mid: [
        "平静稳定的一天等待着你。不要急躁，期待合理的结果。",
        "今天能量一般。选择安全稳定的选项而不是冒险。",
        "安静平淡的一天。专注于与周围人的有意义的交流。",
      ],
      bad: [
        "今天耐心将是你最大的财富。保持稳定，避免过度伸展。",
        "可能会出现挑战，但它们会过去。保持冷静心态。",
        "专注于巩固而非扩展。用今天来准备和加强你的基础。",
      ],
    },
  },
  love: {
    ko: {
      good: [
        "사랑하는 사람과 특별한 순간을 만들기에 최적의 날입니다. 마음을 솔직하게 표현해 보세요.",
        "새로운 인연을 만날 가능성이 높은 날입니다. 주변을 돌아보세요.",
        "연인과의 관계가 한층 더 깊어지는 날입니다. 진심 어린 대화를 나눠보세요.",
      ],
      mid: [
        "애정 관계는 안정적입니다. 큰 변화보다 일상적인 다정함이 빛을 발하는 날이에요.",
        "연인과 소소한 일상을 나누는 것만으로도 충분히 행복한 하루입니다.",
        "사랑 운은 보통입니다. 기대보다는 감사하는 마음으로 하루를 보내세요.",
      ],
      bad: [
        "오해나 다툼이 생길 수 있어요. 상대방의 말을 귀 기울여 들어보세요.",
        "감정 기복이 클 수 있는 날입니다. 충동적인 결정은 피하세요.",
        "사랑 운이 약한 날입니다. 혼자만의 시간을 갖고 내면을 돌아보세요.",
      ],
    },
    en: {
      good: [
        "A perfect day to create special moments with your loved one. Express your feelings openly.",
        "High chances of meeting someone new today. Look around you with an open heart.",
        "Your relationship deepens beautifully today. Share heartfelt conversations.",
      ],
      mid: [
        "Love life is stable. Simple daily affection shines more than grand gestures today.",
        "Sharing small everyday moments with your partner brings enough happiness today.",
        "Average love fortune. Approach the day with gratitude rather than expectation.",
      ],
      bad: [
        "Misunderstandings may arise. Listen carefully to what your partner is really saying.",
        "Emotional fluctuations are possible today. Avoid impulsive decisions.",
        "Weak love energy today. Take some alone time to reflect on your inner self.",
      ],
    },
    ja: {
      good: [
        "愛する人と特別な瞬間を作るのに最適な日です。素直に気持ちを伝えてみましょう。",
        "新しい出会いの可能性が高い日です。周りを見回してみてください。",
        "恋人との関係がより深まる日です。心からの会話を楽しみましょう。",
      ],
      mid: [
        "愛情関係は安定しています。大きな変化より日常の優しさが輝く一日です。",
        "恋人と日常の些細なことを共有するだけで十分幸せな一日です。",
        "恋愛運は普通です。期待より感謝の気持ちで過ごしてください。",
      ],
      bad: [
        "誤解や口論が生じるかもしれません。相手の言葉に耳を傾けてみましょう。",
        "感情の起伏が激しい日かもしれません。衝動的な決断は避けましょう。",
        "恋愛運が弱い日です。一人の時間を持ち、内面を見つめ直しましょう。",
      ],
    },
    fr: {
      good: [
        "Journée parfaite pour créer des moments spéciaux avec votre être cher. Exprimez vos sentiments.",
        "Grandes chances de rencontrer quelqu'un de nouveau. Regardez autour de vous avec un cœur ouvert.",
        "Votre relation s'approfondit magnifiquement. Partagez des conversations sincères.",
      ],
      mid: [
        "La vie amoureuse est stable. La tendresse quotidienne brille plus que les grands gestes.",
        "Partager de petits moments du quotidien avec votre partenaire apporte suffisamment de bonheur.",
        "Fortune amoureuse moyenne. Abordez la journée avec gratitude.",
      ],
      bad: [
        "Des malentendus peuvent surgir. Écoutez attentivement ce que dit vraiment votre partenaire.",
        "Des fluctuations émotionnelles sont possibles. Évitez les décisions impulsives.",
        "Faible énergie amoureuse. Prenez du temps seul pour réfléchir.",
      ],
    },
    es: {
      good: [
        "Un día perfecto para crear momentos especiales con tu ser querido. Expresa tus sentimientos abiertamente.",
        "Altas posibilidades de conocer a alguien nuevo hoy. Mira a tu alrededor con el corazón abierto.",
        "Tu relación se profundiza hoy. Comparte conversaciones sinceras.",
      ],
      mid: [
        "La vida amorosa es estable. El afecto diario simple brilla más que los grandes gestos hoy.",
        "Compartir pequeños momentos cotidianos con tu pareja trae suficiente felicidad hoy.",
        "Fortuna amorosa promedio. Aborda el día con gratitud.",
      ],
      bad: [
        "Pueden surgir malentendidos. Escucha atentamente lo que realmente dice tu pareja.",
        "Son posibles fluctuaciones emocionales hoy. Evita decisiones impulsivas.",
        "Débil energía amorosa hoy. Tómate un tiempo a solas para reflexionar.",
      ],
    },
    zh: {
      good: [
        "与爱人创造特别时刻的最佳日子。坦率地表达你的感情。",
        "今天遇到新人的机会很高。用开放的心环顾四周。",
        "你的关系今天深化得很美好。分享真心的对话。",
      ],
      mid: [
        "恋爱生活稳定。简单的日常爱意比大手笔今天更闪耀。",
        "与伴侣分享小小的日常时刻就带来足够的幸福。",
        "恋爱运一般。带着感恩而非期待度过这一天。",
      ],
      bad: [
        "可能会出现误解。仔细听听你的伴侣真正在说什么。",
        "今天可能有情绪波动。避免冲动决定。",
        "今天爱情能量弱。花些独处时间反思内心。",
      ],
    },
  },
  money: {
    ko: {
      good: [
        "재물운이 상승하는 날입니다. 투자나 새로운 수입원에 주목해 보세요.",
        "예상치 못한 수입이나 좋은 제안이 들어올 수 있는 날입니다.",
        "금전적으로 유리한 기회를 잡을 수 있는 날입니다. 적극적으로 행동하세요.",
      ],
      mid: [
        "금전 운은 평범합니다. 불필요한 지출을 줄이고 저축에 신경 써 보세요.",
        "수입과 지출이 균형을 이루는 날입니다. 안정적인 하루가 될 것입니다.",
        "큰 변화는 없는 날입니다. 계획한 대로 차근차근 진행하세요.",
      ],
      bad: [
        "과도한 지출을 조심하세요. 충동구매나 도박은 피하는 것이 좋습니다.",
        "금전적 손실의 위험이 있는 날입니다. 중요한 결정은 뒤로 미루세요.",
        "재물 운이 약한 날입니다. 큰 거래나 투자는 다음 기회로 미루세요.",
      ],
    },
    en: {
      good: [
        "Financial fortune is rising today. Pay attention to investment opportunities or new income sources.",
        "Unexpected income or a great offer may come your way today.",
        "You can seize financially advantageous opportunities today. Act proactively.",
      ],
      mid: [
        "Average financial fortune. Reduce unnecessary spending and focus on saving.",
        "Income and expenses are balanced today. A stable day lies ahead.",
        "No major changes today. Proceed steadily as planned.",
      ],
      bad: [
        "Be cautious of excessive spending. Avoid impulse buying or gambling.",
        "Risk of financial loss today. Postpone important financial decisions.",
        "Weak financial fortune today. Delay big transactions or investments.",
      ],
    },
    ja: {
      good: [
        "金運が上昇する日です。投資や新しい収入源に注目してみましょう。",
        "予期せぬ収入や良いオファーが来るかもしれない日です。",
        "金銭的に有利なチャンスを掴める日です。積極的に行動しましょう。",
      ],
      mid: [
        "金運は普通です。不要な出費を減らし、貯蓄に気を配りましょう。",
        "収入と支出のバランスが取れた日です。安定した一日になるでしょう。",
        "大きな変化はない日です。計画通り着実に進めましょう。",
      ],
      bad: [
        "過度な出費に注意しましょう。衝動買いや博打は避けた方が良いです。",
        "金銭的な損失のリスクがある日です。重要な決断は先延ばしにしましょう。",
        "財運が弱い日です。大きな取引や投資は次の機会に延ばしましょう。",
      ],
    },
    fr: {
      good: [
        "La fortune financière monte aujourd'hui. Faites attention aux opportunités d'investissement.",
        "Des revenus inattendus ou une excellente offre pourraient se présenter.",
        "Vous pouvez saisir des opportunités financièrement avantageuses. Agissez de manière proactive.",
      ],
      mid: [
        "Fortune financière moyenne. Réduisez les dépenses inutiles et concentrez-vous sur l'épargne.",
        "Revenus et dépenses sont équilibrés aujourd'hui. Une journée stable vous attend.",
        "Aucun changement majeur aujourd'hui. Avancez régulièrement comme prévu.",
      ],
      bad: [
        "Méfiez-vous des dépenses excessives. Évitez les achats impulsifs.",
        "Risque de perte financière aujourd'hui. Reportez les décisions financières importantes.",
        "Faible fortune financière. Différez les grandes transactions ou investissements.",
      ],
    },
    es: {
      good: [
        "La fortuna financiera está subiendo hoy. Presta atención a las oportunidades de inversión.",
        "Pueden llegarte ingresos inesperados o una excelente oferta hoy.",
        "Puedes aprovechar oportunidades financieramente ventajosas hoy. Actúa de manera proactiva.",
      ],
      mid: [
        "Fortuna financiera promedio. Reduce gastos innecesarios y enfócate en ahorrar.",
        "Ingresos y gastos están equilibrados hoy. Un día estable te espera.",
        "Sin cambios importantes hoy. Avanza constantemente como planeado.",
      ],
      bad: [
        "Ten cuidado con el gasto excesivo. Evita las compras impulsivas.",
        "Riesgo de pérdida financiera hoy. Pospón decisiones financieras importantes.",
        "Débil fortuna financiera hoy. Retrasa grandes transacciones o inversiones.",
      ],
    },
    zh: {
      good: [
        "今天财运上升。关注投资机会或新的收入来源。",
        "今天可能会有意外收入或好的提议到来。",
        "今天可以抓住财务上有利的机会。积极行动。",
      ],
      mid: [
        "财运一般。减少不必要的支出，专注于储蓄。",
        "今天收支平衡。稳定的一天等待着你。",
        "今天没有重大变化。按计划稳步进行。",
      ],
      bad: [
        "注意过度支出。避免冲动购买或赌博。",
        "今天有财务损失的风险。推迟重要的财务决定。",
        "今天财运弱。延迟大型交易或投资。",
      ],
    },
  },
  health: {
    ko: {
      good: [
        "건강 운이 좋은 날입니다. 운동이나 야외 활동을 즐겨보세요.",
        "몸과 마음 모두 활기찬 하루입니다. 새로운 건강 루틴을 시작해 보세요.",
        "체력이 충만한 날입니다. 오래 미뤄온 운동을 시작할 좋은 때예요.",
      ],
      mid: [
        "건강은 보통 수준입니다. 규칙적인 생활 습관을 유지하세요.",
        "특별한 문제는 없지만 충분한 휴식이 필요한 날입니다.",
        "무리하지 않는 선에서 활동적으로 생활하면 좋은 날입니다.",
      ],
      bad: [
        "과로를 피하고 충분한 휴식을 취하세요. 몸의 신호에 귀 기울이세요.",
        "소화기나 면역 계통에 주의가 필요한 날입니다. 음식을 조심하세요.",
        "건강 운이 낮은 날입니다. 무리한 활동보다 안정을 취하는 것이 좋아요.",
      ],
    },
    en: {
      good: [
        "Great health energy today. Enjoy exercise or outdoor activities.",
        "Both body and mind are vibrant today. Start a new healthy routine.",
        "Full of vitality today. A great time to begin that workout you've been putting off.",
      ],
      mid: [
        "Health is at an average level. Maintain your regular healthy habits.",
        "No special concerns but sufficient rest is needed today.",
        "Active living without overdoing it is ideal for today.",
      ],
      bad: [
        "Avoid overworking and get enough rest. Listen to your body's signals.",
        "Your digestive or immune system may need attention. Be careful with food.",
        "Low health energy today. Rest rather than push through strenuous activity.",
      ],
    },
    ja: {
      good: [
        "健康運が良い日です。運動や野外活動を楽しみましょう。",
        "心身ともに活気あふれる一日です。新しい健康ルーティンを始めてみましょう。",
        "体力が充実している日です。ずっと先延ばしにしてきた運動を始めるのに良い時期ですよ。",
      ],
      mid: [
        "健康は普通レベルです。規則正しい生活習慣を維持しましょう。",
        "特別な問題はありませんが、十分な休息が必要な日です。",
        "無理をしない程度にアクティブに生活すると良い日です。",
      ],
      bad: [
        "過労を避け、十分な休息を取りましょう。体のサインに耳を傾けましょう。",
        "消化器や免疫系に注意が必要な日です。食事に気をつけましょう。",
        "健康運が低い日です。激しい活動より安静にした方が良いですよ。",
      ],
    },
    fr: {
      good: [
        "Excellente énergie santé aujourd'hui. Profitez de l'exercice ou des activités en plein air.",
        "Corps et esprit sont vibrants aujourd'hui. Commencez une nouvelle routine saine.",
        "Plein de vitalité aujourd'hui. Le bon moment pour commencer cet entraînement que vous reportez.",
      ],
      mid: [
        "La santé est à un niveau moyen. Maintenez vos habitudes saines régulières.",
        "Pas de préoccupations particulières mais un repos suffisant est nécessaire.",
        "Une vie active sans en faire trop est idéale pour aujourd'hui.",
      ],
      bad: [
        "Évitez le surmenage et reposez-vous suffisamment. Écoutez les signaux de votre corps.",
        "Votre système digestif ou immunitaire peut nécessiter attention. Soyez prudent.",
        "Faible énergie santé aujourd'hui. Reposez-vous plutôt que de forcer.",
      ],
    },
    es: {
      good: [
        "Gran energía de salud hoy. Disfruta del ejercicio o actividades al aire libre.",
        "Cuerpo y mente están vibrantes hoy. Comienza una nueva rutina saludable.",
        "Lleno de vitalidad hoy. Un gran momento para comenzar ese ejercicio que has estado postergando.",
      ],
      mid: [
        "La salud está en un nivel promedio. Mantén tus hábitos saludables regulares.",
        "Sin preocupaciones especiales pero se necesita suficiente descanso hoy.",
        "Una vida activa sin exagerar es ideal para hoy.",
      ],
      bad: [
        "Evita trabajar demasiado y descansa lo suficiente. Escucha las señales de tu cuerpo.",
        "Tu sistema digestivo o inmunológico puede necesitar atención. Ten cuidado con la comida.",
        "Baja energía de salud hoy. Descansa en lugar de forzar actividades agotadoras.",
      ],
    },
    zh: {
      good: [
        "今天健康能量好。享受运动或户外活动。",
        "今天身心都充满活力。开始新的健康例行程序。",
        "今天充满活力。是开始你一直推迟锻炼的好时机。",
      ],
      mid: [
        "健康处于平均水平。保持你的常规健康习惯。",
        "没有特别的担忧，但今天需要充分休息。",
        "今天不过度活动的积极生活是理想的。",
      ],
      bad: [
        "避免过度工作，充分休息。倾听你身体的信号。",
        "你的消化或免疫系统可能需要关注。注意饮食。",
        "今天健康能量低。休息而不是强行进行剧烈活动。",
      ],
    },
  },
  career: {
    ko: {
      good: [
        "직업 운이 빛나는 날입니다. 중요한 프레젠테이션이나 회의가 있다면 자신 있게 임하세요.",
        "상사나 동료에게 좋은 인상을 남길 수 있는 날입니다. 적극적으로 의견을 제시해 보세요.",
        "새로운 프로젝트나 역할을 맡기에 최적의 날입니다. 도전을 두려워하지 마세요.",
      ],
      mid: [
        "직업 운은 보통입니다. 맡은 일에 성실하게 임하면 인정받을 수 있어요.",
        "큰 변화보다는 꾸준한 노력이 빛을 발하는 날입니다.",
        "팀워크가 중요한 날입니다. 동료와 협력하며 목표를 향해 나아가세요.",
      ],
      bad: [
        "직장 내 갈등이나 오해에 주의하세요. 신중한 언행이 필요한 날입니다.",
        "업무 실수가 생길 수 있는 날입니다. 중요한 작업은 꼼꼼히 확인하세요.",
        "직업 운이 약한 날입니다. 새로운 시도보다는 기존 업무에 집중하세요.",
      ],
    },
    en: {
      good: [
        "Career fortune shines today. If you have important presentations or meetings, approach them confidently.",
        "You can make a great impression on your boss or colleagues. Share your opinions actively.",
        "Ideal day to take on new projects or roles. Don't be afraid to embrace the challenge.",
      ],
      mid: [
        "Average career fortune. Being diligent in your duties will earn you recognition.",
        "Steady effort rather than big changes is what shines today.",
        "Teamwork is key today. Collaborate with colleagues toward your shared goals.",
      ],
      bad: [
        "Watch out for workplace conflicts or misunderstandings. Careful words and actions are needed.",
        "Work mistakes may occur today. Double-check important tasks carefully.",
        "Weak career fortune today. Focus on existing work rather than new ventures.",
      ],
    },
    ja: {
      good: [
        "仕事運が輝く日です。重要なプレゼンや会議があれば自信を持って臨みましょう。",
        "上司や同僚に良い印象を与えられる日です。積極的に意見を発信してみましょう。",
        "新しいプロジェクトや役割を引き受けるのに最適な日です。挑戦を恐れないでください。",
      ],
      mid: [
        "仕事運は普通です。任された仕事に誠実に取り組めば認めてもらえますよ。",
        "大きな変化より着実な努力が輝く日です。",
        "チームワークが重要な日です。同僚と協力して目標に向かって進みましょう。",
      ],
      bad: [
        "職場での対立や誤解に注意しましょう。慎重な言動が必要な日です。",
        "業務ミスが生じかねない日です。重要な作業は念入りに確認しましょう。",
        "仕事運が弱い日です。新しい試みより既存の業務に集中しましょう。",
      ],
    },
    fr: {
      good: [
        "La fortune professionnelle brille aujourd'hui. Si vous avez des présentations importantes, abordez-les avec confiance.",
        "Vous pouvez faire bonne impression sur votre patron ou collègues. Partagez vos opinions activement.",
        "Journée idéale pour prendre de nouveaux projets. N'ayez pas peur d'embrasser le défi.",
      ],
      mid: [
        "Fortune professionnelle moyenne. Être diligent dans vos tâches vous vaudra reconnaissance.",
        "Un effort régulier plutôt que de grands changements brille aujourd'hui.",
        "Le travail d'équipe est clé aujourd'hui. Collaborez avec vos collègues.",
      ],
      bad: [
        "Méfiez-vous des conflits ou malentendus au travail. Des mots et actions soigneux sont nécessaires.",
        "Des erreurs de travail peuvent survenir. Vérifiez soigneusement les tâches importantes.",
        "Faible fortune professionnelle. Concentrez-vous sur le travail existant.",
      ],
    },
    es: {
      good: [
        "La fortuna profesional brilla hoy. Si tienes presentaciones o reuniones importantes, enfócalas con confianza.",
        "Puedes causar una gran impresión en tu jefe o colegas. Comparte tus opiniones activamente.",
        "Día ideal para asumir nuevos proyectos o roles. No tengas miedo de abrazar el desafío.",
      ],
      mid: [
        "Fortuna profesional promedio. Ser diligente en tus deberes te ganará reconocimiento.",
        "El esfuerzo constante más que los grandes cambios brilla hoy.",
        "El trabajo en equipo es clave hoy. Colabora con colegas hacia metas compartidas.",
      ],
      bad: [
        "Ten cuidado con los conflictos o malentendidos en el trabajo. Se necesitan palabras y acciones cuidadosas.",
        "Pueden ocurrir errores de trabajo hoy. Revisa cuidadosamente las tareas importantes.",
        "Débil fortuna profesional hoy. Enfócate en el trabajo existente.",
      ],
    },
    zh: {
      good: [
        "今天事业运闪耀。如果有重要的演示或会议，自信地面对它们。",
        "今天你可以给老板或同事留下好印象。积极分享你的意见。",
        "承担新项目或角色的理想日子。不要害怕迎接挑战。",
      ],
      mid: [
        "事业运一般。尽职尽责将为你赢得认可。",
        "今天稳定的努力而非大变化更闪耀。",
        "今天团队合作是关键。与同事合作实现共同目标。",
      ],
      bad: [
        "注意工作中的冲突或误解。今天需要谨慎的言行。",
        "今天可能发生工作失误。仔细检查重要任务。",
        "今天事业运弱。专注于现有工作而不是新尝试。",
      ],
    },
  },
};

// ─── Lucky Data ───────────────────────────────────────────────────────────────

const LUCKY_COLORS: Record<Locale, string[]> = {
  ko: ["빨강", "주황", "노랑", "초록", "파랑", "보라", "흰색"],
  en: ["Red", "Orange", "Yellow", "Green", "Blue", "Purple", "White"],
  ja: ["赤", "オレンジ", "黄色", "緑", "青", "紫", "白"],
  fr: ["Rouge", "Orange", "Jaune", "Vert", "Bleu", "Violet", "Blanc"],
  es: ["Rojo", "Naranja", "Amarillo", "Verde", "Azul", "Morado", "Blanco"],
  zh: ["红色", "橙色", "黄色", "绿色", "蓝色", "紫色", "白色"],
};

const LUCKY_DIRECTIONS: Record<Locale, string[]> = {
  ko: ["북", "북동", "동", "남동", "남", "남서", "서", "북서"],
  en: ["North", "NE", "East", "SE", "South", "SW", "West", "NW"],
  ja: ["北", "北東", "東", "南東", "南", "南西", "西", "北西"],
  fr: ["Nord", "NE", "Est", "SE", "Sud", "SO", "Ouest", "NO"],
  es: ["Norte", "NE", "Este", "SE", "Sur", "SO", "Oeste", "NO"],
  zh: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface FortuneResult {
  overall: { score: number; text: string };
  love: { score: number; text: string };
  money: { score: number; text: string };
  health: { score: number; text: string };
  career: { score: number; text: string };
  luckyNumber: number;
  luckyColor: string;
  luckyDirection: string;
  date: string;
  birth: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickText(
  locale: Locale,
  category: keyof typeof FORTUNE_TEXTS,
  score: number,
  rand: () => number
): string {
  const tier = score >= 4 ? "good" : score >= 3 ? "mid" : "bad";
  const arr = FORTUNE_TEXTS[category][locale][tier];
  return arr[Math.floor(rand() * arr.length)];
}

function generateFortune(birth: string, locale: Locale): FortuneResult {
  const today = getToday();
  const seed = dateSeed(birth, today);
  const rand = seededRand(seed);

  const score = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  const overallScore = score(1, 5);
  const loveScore = score(1, 5);
  const moneyScore = score(1, 5);
  const healthScore = score(1, 5);
  const careerScore = score(1, 5);

  return {
    overall: { score: overallScore, text: pickText(locale, "overall", overallScore, rand) },
    love: { score: loveScore, text: pickText(locale, "love", loveScore, rand) },
    money: { score: moneyScore, text: pickText(locale, "money", moneyScore, rand) },
    health: { score: healthScore, text: pickText(locale, "health", healthScore, rand) },
    career: { score: careerScore, text: pickText(locale, "career", careerScore, rand) },
    luckyNumber: Math.floor(rand() * 9) + 1,
    luckyColor: LUCKY_COLORS[locale][Math.floor(rand() * 7)],
    luckyDirection: LUCKY_DIRECTIONS[locale][Math.floor(rand() * 8)],
    date: today,
    birth,
  };
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-lg ${i <= score ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── FortuneCard ──────────────────────────────────────────────────────────────

function FortuneCard({
  emoji,
  label,
  score,
  text,
}: {
  emoji: string;
  label: string;
  score: number;
  text: string;
}) {
  const color =
    score >= 4
      ? "from-yellow-50 to-amber-50 border-amber-200"
      : score >= 3
      ? "from-blue-50 to-indigo-50 border-blue-200"
      : "from-gray-50 to-slate-50 border-gray-200";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${color}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="font-semibold text-gray-800">{label}</span>
      </div>
      <StarRating score={score} />
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyFortune({ locale }: Props) {
  const ui = UI[locale] ?? UI.en;
  const [birth, setBirth] = useState("");
  const [result, setResult] = useState<FortuneResult | null>(null);
  const storageKey = useRef<string>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    const today = getToday();
    storageKey.current = `daily-fortune-${today}`;
    try {
      const raw = localStorage.getItem(storageKey.current);
      if (raw) {
        const parsed = JSON.parse(raw) as FortuneResult;
        if (parsed.date === today) {
          setResult(parsed);
          setBirth(parsed.birth);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!birth) return;
    const fortune = generateFortune(birth, locale);
    setResult(fortune);
    try {
      if (storageKey.current) {
        localStorage.setItem(storageKey.current, JSON.stringify(fortune));
      }
    } catch {
      // ignore
    }
  }, [birth, locale]);

  const handleReset = useCallback(() => {
    setResult(null);
    setBirth("");
    try {
      if (storageKey.current) {
        localStorage.removeItem(storageKey.current);
      }
    } catch {
      // ignore
    }
  }, []);

  const cards = result
    ? [
        { emoji: "⭐", label: ui.overall, ...result.overall },
        { emoji: "❤️", label: ui.love, ...result.love },
        { emoji: "💰", label: ui.money, ...result.money },
        { emoji: "🌿", label: ui.health, ...result.health },
        { emoji: "💼", label: ui.career, ...result.career },
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{ui.title}</h1>
        <p className="text-gray-500">{ui.subtitle}</p>
      </div>

      {!result ? (
        /* Input */
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {ui.birthLabel}
          </label>
          <input
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
            max={getToday()}
            className="mb-6 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={handleSubmit}
            disabled={!birth}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ui.submitBtn}
          </button>
        </div>
      ) : (
        /* Result */
        <div>
          {/* Date note */}
          <p className="mb-4 text-center text-xs text-gray-400">
            {result.date} · {ui.cacheNote}
          </p>

          {/* Fortune cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <FortuneCard key={c.label} emoji={c.emoji} label={c.label} score={c.score} text={c.text} />
            ))}
          </div>

          {/* Lucky info */}
          <div className="mb-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-5">
            <h3 className="mb-4 text-center font-bold text-purple-800">
              ✨ {ui.lucky}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="mb-1 text-xs text-purple-500">{ui.luckyNum}</p>
                <p className="text-2xl font-bold text-purple-700">
                  {result.luckyNumber}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-purple-500">{ui.luckyColor}</p>
                <p className="text-lg font-semibold text-purple-700">
                  {result.luckyColor}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-purple-500">{ui.luckyDir}</p>
                <p className="text-lg font-semibold text-purple-700">
                  {result.luckyDirection}
                </p>
              </div>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            🔄 {ui.tomorrow}
          </button>
        </div>
      )}
    </div>
  );
}
