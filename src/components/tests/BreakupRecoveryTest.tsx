import { useState, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type RecoveryType = "stormy" | "growth" | "solitary" | "transformer";

interface Option {
  text: Record<Locale, string>;
  type: RecoveryType;
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
      ko: "이별 후 가장 먼저 하고 싶은 것은?",
      en: "What's the first thing you want to do after a breakup?",
      ja: "別れた後、最初にしたいことは？",
      fr: "Que souhaitez-vous faire en premier après une rupture ?",
      es: "¿Qué es lo primero que quieres hacer después de una ruptura?",
      zh: "分手后你最想做的第一件事是什么？",
    },
    options: [
      { text: { ko: "실컷 울고 싶다", en: "Cry it all out", ja: "思いきり泣きたい", fr: "Pleurer à chaudes larmes", es: "Llorar todo lo que pueda", zh: "痛痛快快地哭一场", }, type: "stormy" },
      { text: { ko: "일기를 쓰며 정리하고 싶다", en: "Write in my journal to process it", ja: "日記を書いて整理したい", fr: "Écrire dans mon journal pour y voir clair", es: "Escribir en mi diario para procesarlo", zh: "写日记整理思绪", }, type: "growth" },
      { text: { ko: "혼자 있고 싶다", en: "Be alone for a while", ja: "一人でいたい", fr: "Rester seul(e) un moment", es: "Estar solo/a por un tiempo", zh: "想独处一段时间", }, type: "solitary" },
      { text: { ko: "여행을 떠나고 싶다", en: "Go on a trip", ja: "旅に出たい", fr: "Partir en voyage", es: "Irme de viaje", zh: "想去旅行", }, type: "transformer" },
    ],
  },
  {
    id: 2,
    text: {
      ko: "이별 후 가장 힘든 순간은?",
      en: "What's the hardest moment after a breakup?",
      ja: "別れた後、最もつらい瞬間は？",
      fr: "Quel est le moment le plus difficile après une rupture ?",
      es: "¿Cuál es el momento más difícil después de una ruptura?",
      zh: "分手后最难熬的时刻是？",
    },
    options: [
      { text: { ko: "분노와 슬픔이 교차할 때", en: "When anger and sadness alternate", ja: "怒りと悲しみが交差するとき", fr: "Quand la colère et la tristesse alternent", es: "Cuando la ira y la tristeza se alternan", zh: "愤怒和悲伤交替出现时", }, type: "stormy" },
      { text: { ko: "왜 이렇게 됐는지 이해하려 할 때", en: "When I try to understand why it happened", ja: "なぜこうなったか理解しようとするとき", fr: "Quand j'essaie de comprendre pourquoi ça s'est passé", es: "Cuando intento entender por qué pasó", zh: "试图理解为什么会这样时", }, type: "growth" },
      { text: { ko: "아무도 이해 못할 것 같은 외로움", en: "Loneliness that no one seems to understand", ja: "誰も理解できないような孤独感", fr: "La solitude que personne ne semble comprendre", es: "La soledad que nadie parece entender", zh: "无人理解的孤独感", }, type: "solitary" },
      { text: { ko: "일상이 텅 빈 느낌이 들 때", en: "When my daily routine feels empty", ja: "日常が空虚に感じるとき", fr: "Quand ma routine quotidienne semble vide", es: "Cuando mi rutina diaria parece vacía", zh: "日常生活感到空洞时", }, type: "transformer" },
    ],
  },
  {
    id: 3,
    text: {
      ko: "친구가 이별 소식을 듣고 연락했을 때 나는?",
      en: "When a friend contacts you after hearing about your breakup, you:",
      ja: "別れを聞いた友人から連絡が来たとき、あなたは？",
      fr: "Quand un ami vous contacte après votre rupture, vous :",
      es: "Cuando un amigo te contacta después de tu ruptura, tú:",
      zh: "当朋友听说你分手后联系你时，你会？",
    },
    options: [
      { text: { ko: "모든 걸 털어놓고 감정을 쏟아낸다", en: "Pour out all my feelings", ja: "すべてを打ち明けて感情を吐き出す", fr: "Tout déverser et exprimer mes émotions", es: "Desahogarme y expresar todos mis sentimientos", zh: "倾诉一切，宣泄情绪", }, type: "stormy" },
      { text: { ko: "무슨 일이 있었는지 차분하게 정리해서 말한다", en: "Calmly explain what happened", ja: "何があったか落ち着いて整理して話す", fr: "Expliquer calmement ce qui s'est passé", es: "Explicar tranquilamente lo que pasó", zh: "平静地梳理并讲述发生了什么", }, type: "growth" },
      { text: { ko: "\"괜찮아\"라고 하고 혼자 정리한다", en: "Say 'I'm fine' and process it alone", ja: "「大丈夫」と言って一人で整理する", fr: "Dire « ça va » et le traiter seul(e)", es: "Decir 'estoy bien' y procesarlo solo/a", zh: "说「我没事」然后独自消化", }, type: "solitary" },
      { text: { ko: "같이 뭔가 하자고 제안한다 (운동, 쇼핑 등)", en: "Suggest doing something together (gym, shopping, etc.)", ja: "一緒に何かしようと提案する（運動、ショッピングなど）", fr: "Proposer de faire quelque chose ensemble (sport, shopping…)", es: "Sugerir hacer algo juntos (gym, compras, etc.)", zh: "提议一起做些事（运动、购物等）", }, type: "transformer" },
    ],
  },
  {
    id: 4,
    text: {
      ko: "이별 후 나를 가장 잘 표현하는 것은?",
      en: "Which best describes you after a breakup?",
      ja: "別れた後、自分を最もよく表すものは？",
      fr: "Qu'est-ce qui vous décrit le mieux après une rupture ?",
      es: "¿Qué te describe mejor después de una ruptura?",
      zh: "分手后哪个最能形容你？",
    },
    options: [
      { text: { ko: "폭풍처럼 감정이 요동친다", en: "My emotions surge like a storm", ja: "嵐のように感情が揺れる", fr: "Mes émotions déferlent comme une tempête", es: "Mis emociones se agitan como una tormenta", zh: "情绪如暴风雨般汹涌", }, type: "stormy" },
      { text: { ko: "자신을 돌아보고 성찰한다", en: "I reflect and look inward", ja: "自分を振り返って内省する", fr: "Je réfléchis et me remets en question", es: "Reflexiono e introspecciono", zh: "反省自我，深刻内省", }, type: "growth" },
      { text: { ko: "혼자 조용히 시간을 보낸다", en: "I spend quiet time alone", ja: "一人で静かに時間を過ごす", fr: "Je passe du temps seul(e) et tranquille", es: "Paso tiempo tranquilo/a solo/a", zh: "独自安静地度过时光", }, type: "solitary" },
      { text: { ko: "새로운 취미나 활동을 찾는다", en: "I search for new hobbies or activities", ja: "新しい趣味や活動を探す", fr: "Je cherche de nouveaux loisirs ou activités", es: "Busco nuevos pasatiempos o actividades", zh: "寻找新的爱好或活动", }, type: "transformer" },
    ],
  },
  {
    id: 5,
    text: {
      ko: "전 연인의 SNS를 보게 됐을 때 나는?",
      en: "If you see your ex's social media, you:",
      ja: "元恋人のSNSを見てしまったとき、あなたは？",
      fr: "Si vous voyez les réseaux sociaux de votre ex, vous :",
      es: "Si ves las redes sociales de tu ex, tú:",
      zh: "当你看到前任的社交媒体时，你会？",
    },
    options: [
      { text: { ko: "마음이 뒤흔들려 한동안 힘들다", en: "Get shaken up and struggle for a while", ja: "心が揺れてしばらく辛くなる", fr: "Être bouleversé(e) et avoir du mal pendant un moment", es: "Me sacudo y me cuesta por un tiempo", zh: "内心动荡，难受很久", }, type: "stormy" },
      { text: { ko: "보지 않는 게 낫다고 생각하며 차단한다", en: "Think it's better not to see it and block them", ja: "見ない方がいいと考えてブロックする", fr: "Décider qu'il vaut mieux ne pas le voir et les bloquer", es: "Pensar que es mejor no verlo y bloquearlos", zh: "认为最好不看并屏蔽对方", }, type: "growth" },
      { text: { ko: "무감각하게 보고 그냥 덮는다", en: "Look at it numbly and close it", ja: "無感覚に見てそのまま閉じる", fr: "Le regarder sans émotion et fermer", es: "Mirarlo sin emoción y cerrarlo", zh: "麻木地看完然后关掉", }, type: "solitary" },
      { text: { ko: "나도 뭔가 올리고 싶어진다 (나의 근황 업데이트)", en: "Feel like posting something about myself too", ja: "自分も何か投稿したくなる（自分の近況更新）", fr: "Avoir envie de poster quelque chose sur moi aussi", es: "Querer publicar algo sobre mí también", zh: "想发一条自己的动态", }, type: "transformer" },
    ],
  },
  {
    id: 6,
    text: {
      ko: "이별 후 자신에게 가장 필요한 것은?",
      en: "What do you need most after a breakup?",
      ja: "別れた後、自分に最も必要なものは？",
      fr: "De quoi avez-vous le plus besoin après une rupture ?",
      es: "¿Qué necesitas más después de una ruptura?",
      zh: "分手后你最需要的是什么？",
    },
    options: [
      { text: { ko: "감정을 표현할 공간과 사람", en: "Space and people to express emotions", ja: "感情を表現できる場所と人", fr: "Un espace et des gens pour exprimer ses émotions", es: "Espacio y personas para expresar emociones", zh: "能表达情绪的空间和人", }, type: "stormy" },
      { text: { ko: "이별의 의미를 깨닫는 성찰 시간", en: "Time to reflect on the meaning of the breakup", ja: "別れの意味を悟る内省の時間", fr: "Du temps pour réfléchir au sens de la rupture", es: "Tiempo para reflexionar sobre el significado de la ruptura", zh: "领悟分手意义的反思时间", }, type: "growth" },
      { text: { ko: "아무 방해 없는 고요한 시간", en: "Quiet time without any interruptions", ja: "邪魔のない静かな時間", fr: "Du calme sans aucune interruption", es: "Tiempo tranquilo sin interrupciones", zh: "不受打扰的安静时光", }, type: "solitary" },
      { text: { ko: "새로운 도전과 자극", en: "New challenges and stimulation", ja: "新たな挑戦と刺激", fr: "De nouveaux défis et de la stimulation", es: "Nuevos desafíos y estimulación", zh: "新的挑战和刺激", }, type: "transformer" },
    ],
  },
  {
    id: 7,
    text: {
      ko: "이별 후 일주일이 지났을 때 나는?",
      en: "A week after the breakup, you are:",
      ja: "別れて一週間後、あなたは？",
      fr: "Une semaine après la rupture, vous êtes :",
      es: "Una semana después de la ruptura, tú eres:",
      zh: "分手一周后，你是？",
    },
    options: [
      { text: { ko: "아직도 격렬한 감정의 파도 속에 있다", en: "Still in waves of intense emotion", ja: "まだ激しい感情の波の中にいる", fr: "Encore dans des vagues d'émotions intenses", es: "Todavía en olas de emociones intensas", zh: "仍在激烈的情绪波涛中", }, type: "stormy" },
      { text: { ko: "관계에서 배운 점을 정리하고 있다", en: "Organizing what I learned from the relationship", ja: "関係から学んだことを整理している", fr: "En train d'organiser ce que j'ai appris de la relation", es: "Organizando lo que aprendí de la relación", zh: "整理从这段关系中学到的东西", }, type: "growth" },
      { text: { ko: "조용히 일상을 유지하고 있다", en: "Quietly maintaining my daily routine", ja: "静かに日常を維持している", fr: "En train de maintenir calmement ma routine quotidienne", es: "Manteniendo tranquilamente mi rutina diaria", zh: "安静地维持日常生活", }, type: "solitary" },
      { text: { ko: "이미 뭔가 새로운 걸 시작했다", en: "Already started something new", ja: "すでに何か新しいことを始めた", fr: "J'ai déjà commencé quelque chose de nouveau", es: "Ya empecé algo nuevo", zh: "已经开始了新的事情", }, type: "transformer" },
    ],
  },
  {
    id: 8,
    text: {
      ko: "이별에 대한 나의 기본 태도는?",
      en: "What's your basic attitude toward breakups?",
      ja: "別れに対する自分の基本的な姿勢は？",
      fr: "Quelle est votre attitude fondamentale face aux ruptures ?",
      es: "¿Cuál es tu actitud básica hacia las rupturas?",
      zh: "你对分手的基本态度是？",
    },
    options: [
      { text: { ko: "이별은 언제나 아프고 격렬한 경험이다", en: "Breakups are always painful and intense", ja: "別れはいつも痛くて激しい経験だ", fr: "Les ruptures sont toujours douloureuses et intenses", es: "Las rupturas siempre son dolorosas e intensas", zh: "分手永远是痛苦而激烈的体验", }, type: "stormy" },
      { text: { ko: "이별은 성장의 기회다", en: "Breakups are opportunities for growth", ja: "別れは成長の機会だ", fr: "Les ruptures sont des opportunités de croissance", es: "Las rupturas son oportunidades de crecimiento", zh: "分手是成长的机会", }, type: "growth" },
      { text: { ko: "이별 후엔 혼자 시간이 필요하다", en: "I need alone time after a breakup", ja: "別れた後は一人の時間が必要だ", fr: "J'ai besoin de temps seul(e) après une rupture", es: "Necesito tiempo solo/a después de una ruptura", zh: "分手后需要独处时间", }, type: "solitary" },
      { text: { ko: "이별은 새로운 시작의 신호다", en: "A breakup is a signal for a new beginning", ja: "別れは新しい始まりのサインだ", fr: "Une rupture est un signal pour un nouveau départ", es: "Una ruptura es una señal para un nuevo comienzo", zh: "分手是新开始的信号", }, type: "transformer" },
    ],
  },
  {
    id: 9,
    text: {
      ko: "이별 후 잠이 안 올 때 하는 것은?",
      en: "When you can't sleep after a breakup, you:",
      ja: "別れた後、眠れないときにすることは？",
      fr: "Quand vous n'arrivez pas à dormir après une rupture, vous :",
      es: "Cuando no puedes dormir después de una ruptura, tú:",
      zh: "分手后失眠时，你会？",
    },
    options: [
      { text: { ko: "음악을 크게 틀거나 감정적인 영화를 본다", en: "Blast music or watch emotional movies", ja: "音楽を大きくかけたり感情的な映画を見る", fr: "Mettre de la musique fort ou regarder des films émouvants", es: "Poner música a todo volumen o ver películas emotivas", zh: "大声放音乐或看感人的电影", }, type: "stormy" },
      { text: { ko: "생각을 정리하며 메모를 한다", en: "Organize my thoughts and take notes", ja: "考えを整理しながらメモをとる", fr: "Organiser mes pensées et prendre des notes", es: "Organizar mis pensamientos y tomar notas", zh: "整理思绪并做笔记", }, type: "growth" },
      { text: { ko: "그냥 조용히 천장을 바라본다", en: "Just stare at the ceiling quietly", ja: "ただ静かに天井を見つめる", fr: "Fixer le plafond tranquillement", es: "Solo mirar el techo en silencio", zh: "静静地盯着天花板", }, type: "solitary" },
      { text: { ko: "내일 할 계획이나 목표를 세운다", en: "Plan tomorrow's goals or activities", ja: "明日の計画や目標を立てる", fr: "Planifier les objectifs ou activités de demain", es: "Planificar las metas o actividades de mañana", zh: "制定明天的计划或目标", }, type: "transformer" },
    ],
  },
  {
    id: 10,
    text: {
      ko: "이별 후 한 달 뒤, 나는 어떤 상태이길 바라나요?",
      en: "A month after the breakup, what state do you hope to be in?",
      ja: "別れて一か月後、どんな状態でいたいですか？",
      fr: "Un mois après la rupture, dans quel état souhaitez-vous être ?",
      es: "Un mes después de la ruptura, ¿en qué estado esperas estar?",
      zh: "分手一个月后，你希望自己是什么状态？",
    },
    options: [
      { text: { ko: "감정이 정화되어 가벼워진 상태", en: "Emotionally purged and lighter", ja: "感情が浄化されて軽くなった状態", fr: "Émotionnellement purgé(e) et plus léger(ère)", es: "Emocionalmente purificado/a y más ligero/a", zh: "情绪得到净化，轻松自在", }, type: "stormy" },
      { text: { ko: "더 나은 나로 성장해있는 상태", en: "Grown into a better version of myself", ja: "より良い自分に成長している状態", fr: "Évolué(e) vers une meilleure version de moi-même", es: "Habiendo crecido hacia una mejor versión de mí", zh: "成长为更好的自己", }, type: "growth" },
      { text: { ko: "평온하고 안정된 내면의 상태", en: "At peace with a stable inner state", ja: "穏やかで安定した内面の状態", fr: "Serein(e) avec un état intérieur stable", es: "En paz con un estado interior estable", zh: "内心平静安定", }, type: "solitary" },
      { text: { ko: "새로운 삶의 방향이 잡힌 상태", en: "Having found a new direction in life", ja: "新しい人生の方向性が定まった状態", fr: "Avoir trouvé une nouvelle direction dans la vie", es: "Habiendo encontrado una nueva dirección en la vida", zh: "找到了人生新方向", }, type: "transformer" },
    ],
  },
  {
    id: 11,
    text: {
      ko: "힘들 때 나를 가장 위로해주는 것은?",
      en: "What comforts you most when you're struggling?",
      ja: "辛いとき、自分を最も慰めてくれるものは？",
      fr: "Qu'est-ce qui vous réconforte le plus dans les moments difficiles ?",
      es: "¿Qué te consuela más cuando estás pasándola mal?",
      zh: "在困难时期，最能安慰你的是什么？",
    },
    options: [
      { text: { ko: "공감해주고 함께 울어주는 친구", en: "A friend who empathizes and cries with you", ja: "共感して一緒に泣いてくれる友人", fr: "Un ami qui compatit et pleure avec vous", es: "Un amigo que empatiza y llora contigo", zh: "能感同身受、一起哭泣的朋友", }, type: "stormy" },
      { text: { ko: "통찰력 있는 조언을 해주는 사람", en: "Someone who gives insightful advice", ja: "洞察力のあるアドバイスをしてくれる人", fr: "Quelqu'un qui donne des conseils avisés", es: "Alguien que da consejos perspicaces", zh: "给你深刻建议的人", }, type: "growth" },
      { text: { ko: "조용히 곁에 있어주는 사람", en: "Someone who quietly stays by your side", ja: "静かにそばにいてくれる人", fr: "Quelqu'un qui reste tranquillement à vos côtés", es: "Alguien que se queda tranquilamente a tu lado", zh: "静静陪伴在你身边的人", }, type: "solitary" },
      { text: { ko: "새로운 경험을 함께 해주는 사람", en: "Someone who shares new experiences with you", ja: "新しい経験を一緒にしてくれる人", fr: "Quelqu'un qui partage de nouvelles expériences avec vous", es: "Alguien que comparte nuevas experiencias contigo", zh: "与你共享新体验的人", }, type: "transformer" },
    ],
  },
  {
    id: 12,
    text: {
      ko: "이별 후 나의 회복 키워드는?",
      en: "What's your recovery keyword after a breakup?",
      ja: "別れた後の自分の回復キーワードは？",
      fr: "Quel est votre mot-clé de rétablissement après une rupture ?",
      es: "¿Cuál es tu palabra clave de recuperación después de una ruptura?",
      zh: "分手后你的恢复关键词是什么？",
    },
    options: [
      { text: { ko: "감정 해소 & 빠른 회복", en: "Emotional release & fast recovery", ja: "感情解放 & 早期回復", fr: "Libération émotionnelle & rétablissement rapide", es: "Liberación emocional & recuperación rápida", zh: "情绪释放 & 快速恢复", }, type: "stormy" },
      { text: { ko: "성찰 & 자기 성장", en: "Reflection & self-growth", ja: "内省 & 自己成長", fr: "Réflexion & croissance personnelle", es: "Reflexión & crecimiento personal", zh: "反思 & 自我成长", }, type: "growth" },
      { text: { ko: "고독 & 내면 치유", en: "Solitude & inner healing", ja: "孤独 & 内なる癒し", fr: "Solitude & guérison intérieure", es: "Soledad & sanación interior", zh: "独处 & 内在疗愈", }, type: "solitary" },
      { text: { ko: "전환 & 새로운 시작", en: "Transformation & new beginnings", ja: "転換 & 新たな始まり", fr: "Transformation & nouveaux départs", es: "Transformación & nuevos comienzos", zh: "转变 & 新的开始", }, type: "transformer" },
    ],
  },
];

interface TypeResult {
  emoji: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  tips: Record<Locale, string[]>;
  bestMatch: Record<Locale, string>;
  caution: Record<Locale, string>;
}

const RESULTS: Record<RecoveryType, TypeResult> = {
  stormy: {
    emoji: "🌊",
    name: {
      ko: "격류형",
      en: "Stormy Type",
      ja: "激流タイプ",
      fr: "Type Tempête",
      es: "Tipo Tormenta",
      zh: "激流型",
    },
    description: {
      ko: "당신은 감정을 강렬하게 느끼고 표현하는 타입입니다. 이별 후 감정의 파도가 거세지만, 그만큼 감정을 충분히 처리하고 나면 빠르게 회복합니다. 감정을 억누르는 것보다 충분히 느끼고 표현하는 것이 당신의 치유 방식입니다. 주변 사람들의 공감과 지지가 큰 힘이 됩니다.",
      en: "You feel and express emotions intensely. After a breakup, the emotional waves are strong, but once you process them fully, you recover quickly. Rather than suppressing feelings, fully experiencing and expressing them is your path to healing. The empathy and support of those around you is a great source of strength.",
      ja: "あなたは感情を強く感じ、表現するタイプです。別れた後の感情の波は激しいですが、十分に処理すると回復も早いです。感情を抑えるよりも、十分に感じて表現することがあなたの癒し方です。周囲の人の共感とサポートが大きな力になります。",
      fr: "Vous ressentez et exprimez les émotions intensément. Après une rupture, les vagues émotionnelles sont fortes, mais une fois traitées, vous récupérez rapidement. Plutôt que de réprimer vos sentiments, les vivre et les exprimer pleinement est votre voie vers la guérison. L'empathie et le soutien de votre entourage sont une grande source de force.",
      es: "Sientes y expresas las emociones intensamente. Después de una ruptura, las olas emocionales son fuertes, pero una vez que las procesas completamente, te recuperas rápidamente. En lugar de suprimir los sentimientos, vivirlos y expresarlos plenamente es tu camino hacia la sanación. La empatía y el apoyo de quienes te rodean son una gran fuente de fuerza.",
      zh: "你是一个强烈感受和表达情绪的类型。分手后情绪波涛汹涌，但一旦充分处理，恢复也很快。与其压抑情绪，充分感受和表达才是你的治愈方式。身边人的共情和支持对你是巨大的力量。",
    },
    tips: {
      ko: ["감정 일기 쓰기 — 분노와 슬픔을 종이에 쏟아내세요", "믿을 수 있는 친구에게 마음껏 털어놓는 시간을 가지세요", "격렬한 운동으로 감정 에너지를 건강하게 발산해보세요"],
      en: ["Keep an emotion journal — pour out your anger and sadness on paper", "Make time to open up fully to a trusted friend", "Channel emotional energy healthily through vigorous exercise"],
      ja: ["感情日記をつける — 怒りと悲しみを紙に吐き出しましょう", "信頼できる友人に存分に打ち明ける時間を作りましょう", "激しい運動で感情エネルギーを健康的に発散させましょう"],
      fr: ["Tenez un journal émotionnel — évacuez votre colère et votre tristesse sur papier", "Prenez le temps de vous confier pleinement à un ami de confiance", "Canalisez l'énergie émotionnelle sainement grâce à l'exercice vigoureux"],
      es: ["Lleva un diario emocional — vierte tu ira y tristeza en papel", "Tómate tiempo para abrirte completamente con un amigo de confianza", "Canaliza la energía emocional saludablemente mediante ejercicio intenso"],
      zh: ["写情绪日记——把愤怒和悲伤倾泻在纸上", "找信任的朋友彻底倾诉", "通过激烈运动健康地释放情绪能量"],
    },
    bestMatch: {
      ko: "성장형 — 당신의 감정에 공감하면서도 방향을 잡아줄 수 있어요",
      en: "Growth Type — they empathize with your feelings and help you find direction",
      ja: "成長タイプ — あなたの感情に共感しながら方向性を示してくれます",
      fr: "Type Croissance — ils comprennent vos émotions tout en vous aidant à trouver votre voie",
      es: "Tipo Crecimiento — empatizan con tus sentimientos y te ayudan a encontrar dirección",
      zh: "成长型——能共情你的感受，同时帮你找到方向",
    },
    caution: {
      ko: "감정에 너무 오래 머물지 않도록 주의하세요. 충분히 느꼈다면 앞으로 나아가는 것도 용기입니다.",
      en: "Be careful not to stay in your emotions too long. Once you've felt enough, moving forward also takes courage.",
      ja: "感情に長居しすぎないよう注意しましょう。十分に感じたら、前に進むことも勇気です。",
      fr: "Veillez à ne pas vous attarder trop longtemps dans vos émotions. Une fois que vous avez assez ressenti, aller de l'avant demande aussi du courage.",
      es: "Ten cuidado de no quedarte demasiado tiempo en tus emociones. Una vez que hayas sentido suficiente, avanzar también requiere valentía.",
      zh: "注意不要在情绪中停留太久。感受够了之后，向前走也是一种勇气。",
    },
  },
  growth: {
    emoji: "🌱",
    name: {
      ko: "성장형",
      en: "Growth Type",
      ja: "成長タイプ",
      fr: "Type Croissance",
      es: "Tipo Crecimiento",
      zh: "成长型",
    },
    description: {
      ko: "당신은 이별을 발판으로 삼아 더 나은 자신을 만들어가는 타입입니다. 관계를 통해 배운 점을 소중히 여기고, 아픔 속에서도 의미를 찾는 능력이 뛰어납니다. 이별 후 자기 성찰과 내면 탐구를 통해 단단한 자아를 만들어갑니다. 다음 관계에서는 더욱 성숙한 모습을 보여줄 가능성이 높습니다.",
      en: "You are the type who uses breakups as a stepping stone to becoming a better version of yourself. You treasure what you learned from the relationship and have a remarkable ability to find meaning even in pain. Through self-reflection and inner exploration after a breakup, you build a stronger self. You are likely to show greater maturity in future relationships.",
      ja: "あなたは別れを踏み台にして、より良い自分を作っていくタイプです。関係から学んだことを大切にし、痛みの中でも意味を見つける能力に優れています。別れた後の自己省察と内面探求を通じて、たくましい自我を築いていきます。次の関係ではより成熟した姿を見せる可能性が高いです。",
      fr: "Vous êtes du type qui utilise les ruptures comme tremplin pour devenir une meilleure version de vous-même. Vous chérissez ce que vous avez appris de la relation et avez une remarquable capacité à trouver un sens même dans la douleur. Par la réflexion et l'exploration intérieure après une rupture, vous construisez un moi plus solide. Vous êtes susceptible de faire preuve d'une plus grande maturité dans vos futures relations.",
      es: "Eres del tipo que usa las rupturas como trampolín para convertirse en una mejor versión de ti mismo/a. Aprecias lo que aprendiste de la relación y tienes una notable capacidad para encontrar significado incluso en el dolor. A través de la autorreflexión y la exploración interior después de una ruptura, construyes un yo más fuerte. Es probable que muestres mayor madurez en futuras relaciones.",
      zh: "你是那种以分手为跳板、成就更好自己的类型。你珍视从关系中学到的东西，即使在痛苦中也有找到意义的卓越能力。通过分手后的自我反省和内心探索，你构建了更坚强的自我。在未来的关系中，你很可能展现出更成熟的一面。",
    },
    tips: {
      ko: ["관계에서 내가 배운 것들을 리스트로 정리해보세요", "심리 관련 책이나 팟캐스트로 자기 이해를 넓혀보세요", "상담이나 코칭을 통해 더 깊은 성찰을 해보세요"],
      en: ["List the things you learned from the relationship", "Broaden self-understanding through psychology books or podcasts", "Deepen your reflection through counseling or coaching"],
      ja: ["関係から学んだことをリストにまとめてみましょう", "心理関連の本やポッドキャストで自己理解を深めましょう", "カウンセリングやコーチングでより深い内省をしてみましょう"],
      fr: ["Listez ce que vous avez appris de la relation", "Élargissez la compréhension de soi via des livres ou podcasts de psychologie", "Approfondissez votre réflexion par le counseling ou le coaching"],
      es: ["Haz una lista de lo que aprendiste de la relación", "Amplía el autoconocimiento a través de libros o podcasts de psicología", "Profundiza tu reflexión mediante consejería o coaching"],
      zh: ["列出你从这段关系中学到的东西", "通过心理学书籍或播客拓展自我认知", "通过咨询或辅导进行更深刻的反思"],
    },
    bestMatch: {
      ko: "격류형 — 당신의 차분함이 격류형의 감정을 안정시켜줄 수 있어요",
      en: "Stormy Type — your calm can help stabilize their intense emotions",
      ja: "激流タイプ — あなたの落ち着きが激流タイプの感情を安定させてくれます",
      fr: "Type Tempête — votre calme peut aider à stabiliser leurs émotions intenses",
      es: "Tipo Tormenta — tu calma puede ayudar a estabilizar sus emociones intensas",
      zh: "激流型——你的平静能帮助稳定他们激烈的情绪",
    },
    caution: {
      ko: "지나치게 분석적이 되어 감정을 소홀히 하지 않도록 주의하세요. 가끔은 그냥 느끼는 것도 필요해요.",
      en: "Be careful not to become overly analytical and neglect your emotions. Sometimes just feeling is enough.",
      ja: "過度に分析的になって感情を疎かにしないよう注意しましょう。ときにはただ感じることも必要です。",
      fr: "Veillez à ne pas devenir trop analytique et à ne pas négliger vos émotions. Parfois, il suffit de ressentir.",
      es: "Ten cuidado de no volverte demasiado analítico/a y descuidar tus emociones. A veces solo sentir es suficiente.",
      zh: "注意不要过于理性分析而忽视情绪。有时候，单纯地感受就已经足够了。",
    },
  },
  solitary: {
    emoji: "🌙",
    name: {
      ko: "고독형",
      en: "Solitary Type",
      ja: "孤独タイプ",
      fr: "Type Solitaire",
      es: "Tipo Solitario",
      zh: "独处型",
    },
    description: {
      ko: "당신은 혼자만의 시간 속에서 조용히 자신을 치유하는 타입입니다. 외로움을 두려워하지 않고, 고독 속에서 자신만의 평화를 찾는 능력을 가지고 있습니다. 이별 후 조용히 일상을 유지하면서 내면의 안정을 되찾습니다. 다른 사람의 위로보다 혼자만의 공간이 더 회복에 도움이 될 수 있습니다.",
      en: "You are the type who heals quietly in solitude. You don't fear loneliness and have the ability to find your own peace within it. After a breakup, you quietly maintain your daily routine and restore inner stability. Your own personal space may help you recover more than others' comfort.",
      ja: "あなたは一人の時間の中で静かに自分を癒すタイプです。孤独を恐れず、孤独の中に自分だけの平和を見つける能力を持っています。別れた後は静かに日常を維持しながら内面の安定を取り戻します。他人の慰めよりも一人の空間の方が回復に役立つかもしれません。",
      fr: "Vous êtes du type qui guérit tranquillement dans la solitude. Vous ne craignez pas la solitude et avez la capacité d'y trouver votre propre paix. Après une rupture, vous maintenez calmement votre routine quotidienne et retrouvez la stabilité intérieure. Votre espace personnel peut vous aider à récupérer plus que le réconfort des autres.",
      es: "Eres del tipo que se cura tranquilamente en soledad. No temes la soledad y tienes la capacidad de encontrar tu propia paz en ella. Después de una ruptura, mantienes tranquilamente tu rutina diaria y restauras la estabilidad interior. Tu propio espacio personal puede ayudarte a recuperarte más que el consuelo de los demás.",
      zh: "你是那种在独处中静静疗愈自己的类型。你不畏惧孤独，能在寂静中找到属于自己的平和。分手后，你静静地维持日常生活，恢复内心的稳定。独处空间对你的恢复可能比他人的安慰更有帮助。",
    },
    tips: {
      ko: ["명상이나 마음챙김으로 내면의 평화를 키우세요", "자연 속 산책으로 마음을 가라앉혀보세요", "좋아하는 책이나 음악으로 혼자만의 힐링 루틴을 만들어보세요"],
      en: ["Cultivate inner peace through meditation or mindfulness", "Calm your mind with walks in nature", "Create a solo healing routine with books or music you love"],
      ja: ["瞑想やマインドフルネスで内なる平和を育てましょう", "自然の中の散歩で心を落ち着かせましょう", "好きな本や音楽で一人だけのヒーリングルーティンを作りましょう"],
      fr: ["Cultivez la paix intérieure grâce à la méditation ou à la pleine conscience", "Apaisez votre esprit avec des promenades dans la nature", "Créez une routine de guérison personnelle avec des livres ou de la musique que vous aimez"],
      es: ["Cultiva la paz interior mediante la meditación o la atención plena", "Calma tu mente con paseos por la naturaleza", "Crea una rutina de sanación personal con libros o música que ames"],
      zh: ["通过冥想或正念培养内心平静", "在大自然中散步让心平静下来", "用喜欢的书或音乐创建专属的疗愈日常"],
    },
    bestMatch: {
      ko: "전환형 — 조용히 당신 곁에 있으면서도 새로운 자극을 줄 수 있어요",
      en: "Transformer Type — they can quietly stay by your side while offering new stimulation",
      ja: "転換タイプ — 静かにあなたのそばにいながら新しい刺激を与えてくれます",
      fr: "Type Transformateur — ils peuvent rester tranquillement à vos côtés tout en offrant de nouvelles stimulations",
      es: "Tipo Transformador — pueden quedarse tranquilamente a tu lado mientras ofrecen nueva estimulación",
      zh: "转变型——能静静陪伴你，同时带来新的刺激",
    },
    caution: {
      ko: "고독 속으로 너무 깊이 들어가지 않도록 주의하세요. 가끔은 도움을 요청하는 것도 강함의 표시입니다.",
      en: "Be careful not to sink too deep into solitude. Asking for help sometimes is also a sign of strength.",
      ja: "孤独の中に深く入りすぎないよう注意しましょう。ときには助けを求めることも強さの表れです。",
      fr: "Veillez à ne pas vous enfoncer trop profondément dans la solitude. Demander de l'aide parfois est aussi un signe de force.",
      es: "Ten cuidado de no hundirte demasiado en la soledad. Pedir ayuda a veces también es una señal de fortaleza.",
      zh: "注意不要太深地沉入孤独中。偶尔寻求帮助也是一种力量的表现。",
    },
  },
  transformer: {
    emoji: "🦋",
    name: {
      ko: "전환형",
      en: "Transformer Type",
      ja: "転換タイプ",
      fr: "Type Transformateur",
      es: "Tipo Transformador",
      zh: "转变型",
    },
    description: {
      ko: "당신은 이별 후 새로운 활동과 경험으로 에너지를 전환하는 타입입니다. 변화를 두려워하지 않고 오히려 이별을 새로운 시작의 기회로 삼습니다. 행동을 통해 앞으로 나아가는 것이 당신에게 가장 효과적인 치유 방식입니다. 나비처럼 변화를 통해 더욱 아름다워지는 잠재력을 가지고 있습니다.",
      en: "You are the type who channels energy into new activities and experiences after a breakup. You aren't afraid of change; instead, you seize the breakup as an opportunity for a new beginning. Moving forward through action is the most effective healing method for you. You have the potential to grow more beautiful through change, like a butterfly.",
      ja: "あなたは別れた後、新しい活動や経験にエネルギーを転換するタイプです。変化を恐れず、むしろ別れを新しい始まりの機会として捉えます。行動を通じて前進することがあなたにとって最も効果的な癒し方です。蝶のように変化を通じてより美しくなる潜在力を持っています。",
      fr: "Vous êtes du type qui canalise l'énergie vers de nouvelles activités et expériences après une rupture. Vous ne craignez pas le changement ; au contraire, vous saisissez la rupture comme une opportunité pour un nouveau départ. Avancer par l'action est la méthode de guérison la plus efficace pour vous. Vous avez le potentiel de grandir et de vous épanouir grâce au changement, comme un papillon.",
      es: "Eres del tipo que canaliza la energía hacia nuevas actividades y experiencias después de una ruptura. No temes el cambio; al contrario, aprovechas la ruptura como una oportunidad para un nuevo comienzo. Avanzar a través de la acción es el método de sanación más efectivo para ti. Tienes el potencial de crecer y embellecerte a través del cambio, como una mariposa.",
      zh: "你是那种分手后将能量转化为新活动和体验的类型。你不惧怕变化，反而将分手视为新开始的机会。通过行动向前迈进是你最有效的疗愈方式。你像蝴蝶一样，拥有通过变化变得更美好的潜力。",
    },
    tips: {
      ko: ["오래 하고 싶었던 취미나 도전을 지금 시작해보세요", "여행이나 새로운 장소 방문으로 기분을 전환해보세요", "새로운 사람들과 교류할 수 있는 모임이나 커뮤니티에 참여해보세요"],
      en: ["Start that hobby or challenge you've wanted to try for a long time", "Change your mood with travel or visiting new places", "Join a group or community where you can interact with new people"],
      ja: ["ずっとやりたかった趣味や挑戦を今すぐ始めましょう", "旅行や新しい場所の訪問で気分転換をしましょう", "新しい人々と交流できるグループやコミュニティに参加しましょう"],
      fr: ["Commencez dès maintenant ce hobby ou défi que vous vouliez depuis longtemps", "Changez d'humeur en voyageant ou en visitant de nouveaux endroits", "Rejoignez un groupe ou une communauté où vous pouvez interagir avec de nouvelles personnes"],
      es: ["Empieza ahora ese pasatiempo o desafío que has querido intentar durante mucho tiempo", "Cambia tu estado de ánimo con viajes o visitando nuevos lugares", "Únete a un grupo o comunidad donde puedas interactuar con nuevas personas"],
      zh: ["现在就开始那个你一直想尝试的爱好或挑战", "通过旅行或拜访新地方转换心情", "加入可以结交新朋友的团体或社群"],
    },
    bestMatch: {
      ko: "고독형 — 당신의 활동적인 에너지가 고독형에게 새로운 자극이 될 수 있어요",
      en: "Solitary Type — your active energy can be a new stimulus for them",
      ja: "孤独タイプ — あなたの活動的なエネルギーが孤独タイプへの新たな刺激になります",
      fr: "Type Solitaire — votre énergie active peut être une nouvelle stimulation pour eux",
      es: "Tipo Solitario — tu energía activa puede ser un nuevo estímulo para ellos",
      zh: "独处型——你活跃的能量能为他们带来新的刺激",
    },
    caution: {
      ko: "너무 바쁘게 움직여서 감정을 회피하지 않도록 주의하세요. 잠시 멈추고 내면을 들여다보는 시간도 필요합니다.",
      en: "Be careful not to avoid emotions by staying too busy. You also need time to pause and look inward.",
      ja: "忙しく動きすぎて感情を回避しないよう注意しましょう。一時停止して内面を見つめる時間も必要です。",
      fr: "Veillez à ne pas éviter les émotions en vous maintenant trop occupé(e). Vous avez aussi besoin de temps pour faire une pause et regarder à l'intérieur.",
      es: "Ten cuidado de no evitar las emociones manteniéndote demasiado ocupado/a. También necesitas tiempo para detenerte y mirar hacia adentro.",
      zh: "注意不要因为太忙而回避情绪。你也需要暂停下来，审视内心的时间。",
    },
  },
};

const UI_LABELS: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    questionOf: (current: number, total: number) => string;
    resultTitle: string;
    restartBtn: string;
    tipsLabel: string;
    bestMatchLabel: string;
    cautionLabel: string;
    shareBtn: string;
  }
> = {
  ko: {
    title: "이별 회복 유형 테스트",
    subtitle: "나는 어떻게 이별을 극복하나요?",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "당신의 이별 회복 유형은",
    restartBtn: "다시 하기",
    tipsLabel: "회복 팁",
    bestMatchLabel: "잘 맞는 유형",
    cautionLabel: "주의할 점",
    shareBtn: "결과 공유",
  },
  en: {
    title: "Breakup Recovery Type Test",
    subtitle: "How do you overcome a breakup?",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "Your Breakup Recovery Type",
    restartBtn: "Restart",
    tipsLabel: "Recovery Tips",
    bestMatchLabel: "Best Match",
    cautionLabel: "Watch Out For",
    shareBtn: "Share Result",
  },
  ja: {
    title: "別れ回復タイプテスト",
    subtitle: "あなたはどうやって別れを乗り越えますか？",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "あなたの別れ回復タイプ",
    restartBtn: "もう一度",
    tipsLabel: "回復のヒント",
    bestMatchLabel: "相性の良いタイプ",
    cautionLabel: "注意点",
    shareBtn: "結果をシェア",
  },
  fr: {
    title: "Test de Type de Rétablissement après Rupture",
    subtitle: "Comment surmontez-vous une rupture ?",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "Votre Type de Rétablissement",
    restartBtn: "Recommencer",
    tipsLabel: "Conseils de Rétablissement",
    bestMatchLabel: "Meilleure Correspondance",
    cautionLabel: "Attention à",
    shareBtn: "Partager le Résultat",
  },
  es: {
    title: "Test de Tipo de Recuperación tras Ruptura",
    subtitle: "¿Cómo superas una ruptura?",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "Tu Tipo de Recuperación",
    restartBtn: "Reiniciar",
    tipsLabel: "Consejos de Recuperación",
    bestMatchLabel: "Mejor Coincidencia",
    cautionLabel: "Ten Cuidado Con",
    shareBtn: "Compartir Resultado",
  },
  zh: {
    title: "分手恢复类型测试",
    subtitle: "你如何走出分手？",
    questionOf: (c, t) => `${c} / ${t}`,
    resultTitle: "你的分手恢复类型",
    restartBtn: "重新测试",
    tipsLabel: "恢复建议",
    bestMatchLabel: "最佳匹配",
    cautionLabel: "需要注意",
    shareBtn: "分享结果",
  },
};

export default function BreakupRecoveryTest({ locale }: Props) {
  const t = UI_LABELS[locale] ?? UI_LABELS.en;
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState<Record<RecoveryType, number>>({
    stormy: 0, growth: 0, solitary: 0, transformer: 0,
  });
  const [done, setDone] = useState(false);
  const [resultType, setResultType] = useState<RecoveryType | null>(null);

  const handleAnswer = useCallback((type: RecoveryType) => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);

    if (current + 1 >= QUESTIONS.length) {
      // Calculate winner
      const winner = (Object.keys(newScores) as RecoveryType[]).reduce((a, b) =>
        newScores[a] >= newScores[b] ? a : b
      );
      setResultType(winner);
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
    }
  }, [scores, current]);

  const handleRestart = useCallback(() => {
    setCurrent(0);
    setScores({ stormy: 0, growth: 0, solitary: 0, transformer: 0 });
    setDone(false);
    setResultType(null);
  }, []);

  const q = QUESTIONS[current];
  const result = resultType ? RESULTS[resultType] : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t.title}
        </h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      {!done ? (
        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{t.questionOf(current + 1, QUESTIONS.length)}</span>
              <span>{Math.round(((current) / QUESTIONS.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
                style={{ width: `${(current / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-lg font-semibold text-gray-900 mb-5">
              {q.text[locale] ?? q.text.en}
            </p>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt.type)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-left text-gray-800 hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  {opt.text[locale] ?? opt.text.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        result && (
          <div className="space-y-4">
            {/* Result header */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-6 text-center">
              <p className="text-sm font-medium text-purple-500 uppercase tracking-wider mb-2">
                {t.resultTitle}
              </p>
              <div className="text-5xl mb-3">{result.emoji}</div>
              <h2 className="text-2xl font-bold text-gray-900">
                {result.name[locale] ?? result.name.en}
              </h2>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                {result.description[locale] ?? result.description.en}
              </p>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t.tipsLabel}
              </h3>
              <ul className="space-y-2">
                {(result.tips[locale] ?? result.tips.en).map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-purple-400 font-bold">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Best match + Caution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <h3 className="font-semibold text-green-700 mb-2 text-sm">
                  {t.bestMatchLabel}
                </h3>
                <p className="text-sm text-gray-700">
                  {result.bestMatch[locale] ?? result.bestMatch.en}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-700 mb-2 text-sm">
                  {t.cautionLabel}
                </h3>
                <p className="text-sm text-gray-700">
                  {result.caution[locale] ?? result.caution.en}
                </p>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="w-full rounded-xl border border-purple-300 py-3 text-sm font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
            >
              {t.restartBtn}
            </button>
          </div>
        )
      )}
    </div>
  );
}
