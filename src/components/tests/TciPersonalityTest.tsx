import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

interface Question {
  id: number;
  dimension: 'HA' | 'NS' | 'RD' | 'P' | 'SD' | 'C' | 'ST';
  reversed: boolean;
  text: Record<Locale, string>;
}

// 35 items (5 per dimension) — abridged TCI-R inspired set
const QUESTIONS: Question[] = [
  // Harm Avoidance (HA)
  { id: 1, dimension: 'HA', reversed: false, text: { ko: '새로운 상황이나 낯선 사람과 만날 때 불안하거나 긴장된다.', en: 'I feel anxious or tense when meeting new situations or unfamiliar people.', ja: '新しい状況や見知らぬ人に会うとき、不安または緊張を感じる。', fr: 'Je me sens anxieux(se) ou tendu(e) dans les situations nouvelles ou avec des inconnus.', es: 'Me siento ansioso/a o tenso/a en situaciones nuevas o con personas desconocidas.', zh: '在遇到新情况或陌生人时，我会感到焦虑或紧张。', } },
  { id: 2, dimension: 'HA', reversed: false, text: { ko: '걱정이 많아서 중요한 결정을 내리기 어렵다.', en: 'I worry so much that it is hard for me to make important decisions.', ja: '心配が多すぎて重要な決断を下すのが難しい。', fr: 'Je me fais tellement de souci que je du mal à prendre des décisions importantes.', es: 'Me preocupo tanto que me cuesta tomar decisiones importantes.', zh: '我太擔心了，很難做出重要決定。', } },
  { id: 3, dimension: 'HA', reversed: false, text: { ko: '위험한 상황을 미리 상상하고 최악의 경우를 생각하는 편이다.', en: 'I tend to imagine dangerous situations in advance and think of worst-case scenarios.', ja: '危険な状況を前もって想像し、最悪のケースを考えがちだ。', fr: "J'ai tendance à imaginer des situations dangereuses et à envisager le pire.", es: 'Tiendo a imaginar situaciones peligrosas de antemano y pensar en los peores escenarios.', zh: '我傾向於提前想像危險情況，考慮最壞的情況。', } },
  { id: 4, dimension: 'HA', reversed: true, text: { ko: '나는 대체로 자신감이 넘치고 긴장을 잘 하지 않는다.', en: 'I am generally confident and rarely feel nervous.', ja: '私は一般的に自信があり、緊張することはほとんどない。', fr: 'Je suis généralement confiant(e) et je me sens rarement nerveux(se).', es: 'En general soy seguro/a de mí mismo/a y rara vez me pongo nervioso/a.', zh: '我通常很自信，很少感到紧张。', } },
  { id: 5, dimension: 'HA', reversed: false, text: { ko: '비판이나 거절을 당했을 때 기분이 많이 상한다.', en: 'I get very upset when I am criticized or rejected.', ja: '批判や拒絶を受けると非常に気分が落ち込む。', fr: 'Je suis très affecté(e) lorsque je suis critiqué(e) ou rejeté(e).', es: 'Me afecta mucho cuando soy criticado/a o rechazado/a.', zh: '当受到批评或拒绝时，我会非常难过。', } },

  // Novelty Seeking (NS)
  { id: 6, dimension: 'NS', reversed: false, text: { ko: '새롭고 흥미로운 것을 찾아다니는 편이다.', en: 'I like to seek out new and exciting things.', ja: '新しくて刺激的なものを求めて行動する傾向がある。', fr: 'J\'aime rechercher des choses nouvelles et excitantes.', es: 'Me gusta buscar cosas nuevas y emocionantes.', zh: '我喜歡尋找新鮮刺激的事物。', } },
  { id: 7, dimension: 'NS', reversed: false, text: { ko: '충동적으로 행동하는 경우가 많다.', en: 'I often act impulsively without thinking things through.', ja: 'よく深く考えずに衝動的に行動してしまう。', fr: "J'agis souvent impulsivement sans réfléchir.", es: 'A menudo actúo impulsivamente sin pensar.', zh: '我经常不经思考地冲动行事。', } },
  { id: 8, dimension: 'NS', reversed: false, text: { ko: '규칙과 규범에 얽매이는 것을 싫어한다.', en: 'I dislike being bound by rules and conventions.', ja: 'ルールや規範に縛られることを嫌う。', fr: "Je n'aime pas être limité(e) par les règles et les conventions.", es: 'No me gusta estar limitado/a por reglas y convenciones.', zh: '我不喜欢受规则和惯例束缚。', } },
  { id: 9, dimension: 'NS', reversed: false, text: { ko: '일상적인 루틴보다 다양하고 변화 있는 일을 선호한다.', en: 'I prefer variety and change over routine.', ja: 'ルーティンより多様性と変化を好む。', fr: 'Je préfère la variété et le changement à la routine.', es: 'Prefiero la variedad y el cambio a la rutina.', zh: '我比起日常例行工作，更喜歡多樣性和變化。', } },
  { id: 10, dimension: 'NS', reversed: true, text: { ko: '나는 대체로 차분하고 충동적으로 행동하지 않는다.', en: 'I am generally calm and not impulsive in my actions.', ja: '私は一般的に穏やかで、行動において衝動的ではない。', fr: 'Je suis généralement calme et non impulsif(ve) dans mes actions.', es: 'En general soy tranquilo/a y no actúo impulsivamente.', zh: '我通常很平静，行动时不冲动。', } },

  // Reward Dependence (RD)
  { id: 11, dimension: 'RD', reversed: false, text: { ko: '타인의 감정에 민감하게 반응한다.', en: 'I am very sensitive to other people\'s feelings.', ja: '他者の感情に非常に敏感に反応する。', fr: 'Je suis très sensible aux sentiments des autres.', es: 'Soy muy sensible a los sentimientos de los demás.', zh: '我對他人的情感非常敏感。', } },
  { id: 12, dimension: 'RD', reversed: false, text: { ko: '사람들의 인정과 칭찬이 나에게 동기를 부여한다.', en: "Others' approval and praise motivates me significantly.", ja: '他者の承認と称賛が私に大きな動機付けをする。', fr: 'L\'approbation et les compliments des autres me motivent considérablement.', es: 'La aprobación y los elogios de los demás me motivan considerablemente.', zh: '他人的認可和讚美對我有很大的激勵作用。', } },
  { id: 13, dimension: 'RD', reversed: false, text: { ko: '감동적인 영화나 음악에 쉽게 눈물이 나거나 마음이 움직인다.', en: 'I am easily moved to tears or deep emotion by touching movies or music.', ja: '感動的な映画や音楽に簡単に涙が出たり、心が動かされる。', fr: 'Je suis facilement ému(e) aux larmes ou profondément touché(e) par des films ou de la musique.', es: 'Me emociono fácilmente hasta las lágrimas o profundamente con películas o música.', zh: '我容易被感动的电影或音乐感动落泪。', } },
  { id: 14, dimension: 'RD', reversed: false, text: { ko: '사람들과 따뜻한 관계를 유지하는 것이 중요하다.', en: 'Maintaining warm relationships with people is important to me.', ja: '人々と温かい関係を維持することが大切だ。', fr: 'Maintenir des relations chaleureuses avec les gens est important pour moi.', es: 'Mantener relaciones cálidas con las personas es importante para mí.', zh: '与人维持温暖的关系对我很重要。', } },
  { id: 15, dimension: 'RD', reversed: true, text: { ko: '나는 타인의 인정 여부에 크게 신경 쓰지 않는 편이다.', en: 'I don\'t care much whether others approve of me.', ja: '他者が自分を認めているかどうかをあまり気にしない。', fr: 'Je me soucie peu de l\'approbation des autres.', es: 'No me importa mucho si los demás me aprueban.', zh: '我不太在意別人是否認可我。', } },

  // Persistence (P)
  { id: 16, dimension: 'P', reversed: false, text: { ko: '목표를 달성할 때까지 포기하지 않는다.', en: "I don't give up until I have achieved my goals.", ja: '目標を達成するまであきらめない。', fr: 'Je ne renonce pas tant que je n\'ai pas atteint mes objectifs.', es: 'No me rindo hasta alcanzar mis objetivos.', zh: '在达成目标之前，我不会放弃。', } },
  { id: 17, dimension: 'P', reversed: false, text: { ko: '일이 잘 풀리지 않아도 계속 노력한다.', en: "Even when things don't go well, I keep trying.", ja: 'うまくいかなくても努力し続ける。', fr: "Même quand les choses ne se passent pas bien, je continue à essayer.", es: 'Incluso cuando las cosas no van bien, sigo intentándolo.', zh: '即使事情進展不順利，我也會繼續努力。', } },
  { id: 18, dimension: 'P', reversed: false, text: { ko: '한 번 시작한 일은 끝까지 마무리하는 편이다.', en: 'I tend to see tasks through to completion once I start them.', ja: '一度始めた仕事は最後まで仕上げる傾向がある。', fr: "J'ai tendance à mener les tâches jusqu'à leur terme une fois que je les ai commencées.", es: 'Tiendo a llevar las tareas hasta el final una vez que las comienzo.', zh: '一旦开始做一件事，我倾向于把它做完。', } },
  { id: 19, dimension: 'P', reversed: false, text: { ko: '작은 성과에도 만족하지 않고 더 높은 목표를 향해 나아간다.', en: 'I am not satisfied with small achievements and always aim higher.', ja: '小さな成果に満足せず、より高い目標に向かって進む。', fr: 'Je ne me satisfais pas de petites réalisations et je vise toujours plus haut.', es: 'No me satisfago con pequeños logros y siempre apunto más alto.', zh: '我不满足于小小的成就，总是朝着更高的目标努力。', } },
  { id: 20, dimension: 'P', reversed: true, text: { ko: '나는 장기 목표를 유지하는 데 어려움을 느낀다.', en: 'I have difficulty maintaining long-term goals.', ja: '長期目標を維持することが難しい。', fr: "J'ai du mal à maintenir des objectifs à long terme.", es: 'Me cuesta mantener objetivos a largo plazo.', zh: '我难以维持长期目标。', } },

  // Self-Directedness (SD)
  { id: 21, dimension: 'SD', reversed: false, text: { ko: '나의 삶에서 내가 무엇을 원하는지 명확히 알고 있다.', en: 'I have a clear sense of what I want in my life.', ja: '自分の人生で何を望んでいるかを明確に知っている。', fr: "J'ai une idée claire de ce que je veux dans ma vie.", es: 'Tengo claro lo que quiero en mi vida.', zh: '我清楚地知道自己在生活中想要什麼。', } },
  { id: 22, dimension: 'SD', reversed: false, text: { ko: '실수를 인정하고 그것을 배움의 기회로 삼는다.', en: 'I admit my mistakes and use them as opportunities to learn.', ja: '間違いを認め、それを学びの機会として活かす。', fr: "J'admets mes erreurs et les utilise comme des occasions d'apprendre.", es: 'Admito mis errores y los uso como oportunidades de aprendizaje.', zh: '我承认自己的错误，并把它们作为学习的机会。', } },
  { id: 23, dimension: 'SD', reversed: false, text: { ko: '내 삶의 방향을 스스로 결정하고 주도적으로 나아간다.', en: 'I take charge of my life and determine my own direction.', ja: '自分の人生の方向を自ら決め、主体的に進む。', fr: "Je prends en main ma vie et détermine moi-même ma direction.", es: 'Tomo las riendas de mi vida y determino mi propio rumbo.', zh: '我自主决定生活方向，主动前进。', } },
  { id: 24, dimension: 'SD', reversed: false, text: { ko: '나의 강점과 약점을 잘 파악하고 있다.', en: 'I have a good understanding of my strengths and weaknesses.', ja: '自分の長所と短所をよく把握している。', fr: "J'ai une bonne compréhension de mes forces et faiblesses.", es: 'Tengo un buen conocimiento de mis fortalezas y debilidades.', zh: '我很了解自己的优点和缺点。', } },
  { id: 25, dimension: 'SD', reversed: true, text: { ko: '나는 종종 무력감이나 자기 의심을 느낀다.', en: 'I often feel helpless or doubt myself.', ja: '無力感や自己不信を感じることがよくある。', fr: "Je me sens souvent impuissant(e) ou je doute de moi.", es: 'A menudo me siento impotente o dudo de mí mismo/a.', zh: '我經常感到無助或自我懷疑。', } },

  // Cooperativeness (C)
  { id: 26, dimension: 'C', reversed: false, text: { ko: '타인의 관점과 감정을 이해하려고 노력한다.', en: 'I try to understand others\' perspectives and feelings.', ja: '他者の視点や感情を理解しようとする。', fr: "J'essaie de comprendre les perspectives et les sentiments des autres.", es: 'Trato de entender las perspectivas y sentimientos de los demás.', zh: '我努力理解他人的观点和感受。', } },
  { id: 27, dimension: 'C', reversed: false, text: { ko: '다른 사람을 돕는 것이 개인적으로 의미 있다고 느낀다.', en: 'I find personal meaning in helping other people.', ja: '他者を助けることに個人的な意味を感じる。', fr: "Je trouve un sens personnel à aider les autres.", es: 'Encuentro significado personal en ayudar a otras personas.', zh: '我認為幫助他人對我個人有意義。', } },
  { id: 28, dimension: 'C', reversed: false, text: { ko: '집단의 이익을 위해 개인적인 이익을 양보할 수 있다.', en: 'I can set aside personal interests for the benefit of the group.', ja: '集団の利益のために個人的な利益を譲ることができる。', fr: "Je peux mettre de côté mes intérêts personnels au profit du groupe.", es: 'Puedo dejar de lado mis intereses personales en beneficio del grupo.', zh: '为了集体利益，我可以放弃个人利益。', } },
  { id: 29, dimension: 'C', reversed: false, text: { ko: '사람들을 공정하고 평등하게 대우해야 한다고 생각한다.', en: 'I believe in treating people fairly and equally.', ja: '人々を公平かつ平等に扱うべきだと思う。', fr: "Je crois qu'il faut traiter les gens équitablement et également.", es: 'Creo que hay que tratar a las personas de manera justa e igualitaria.', zh: '我认为应该公平公正地对待每个人。', } },
  { id: 30, dimension: 'C', reversed: true, text: { ko: '나는 종종 타인보다 나 자신을 먼저 생각한다.', en: 'I often think of myself before others.', ja: '他者より自分自身を先に考えることが多い。', fr: "Je pense souvent à moi-même avant les autres.", es: 'A menudo pienso en mí mismo/a antes que en los demás.', zh: '我常常先想到自己，而不是他人。', } },

  // Self-Transcendence (ST)
  { id: 31, dimension: 'ST', reversed: false, text: { ko: '때로는 자신이 더 큰 무언가의 일부라는 느낌을 받는다.', en: 'Sometimes I feel as though I am part of something greater than myself.', ja: '時に自分がより大きな何かの一部であるように感じる。', fr: "Parfois, je me sens faire partie de quelque chose de plus grand que moi.", es: 'A veces siento que soy parte de algo más grande que yo.', zh: '有时我感觉自己是比自身更大的东西的一部分。', } },
  { id: 32, dimension: 'ST', reversed: false, text: { ko: '아름다운 자연이나 예술 앞에서 경이감을 느낀다.', en: 'I feel a sense of wonder in the presence of beautiful nature or art.', ja: '美しい自然や芸術の前で驚嘆を感じる。', fr: "Je ressens un émerveillement face à la belle nature ou à l'art.", es: 'Siento asombro ante la hermosa naturaleza o el arte.', zh: '面對美麗的自然或藝術，我會感到驚嘆。', } },
  { id: 33, dimension: 'ST', reversed: false, text: { ko: '삶의 의미와 목적에 대해 자주 생각한다.', en: "I often think about life's meaning and purpose.", ja: '人生の意味と目的についてよく考える。', fr: "Je réfléchis souvent au sens et au but de la vie.", es: 'A menudo pienso en el significado y propósito de la vida.', zh: '我常常思考生命的意義和目的。', } },
  { id: 34, dimension: 'ST', reversed: false, text: { ko: '명상이나 기도 같은 영적인 활동에 관심이 있다.', en: 'I have an interest in spiritual practices like meditation or prayer.', ja: '瞑想や祈りなどの精神的な活動に興味がある。', fr: "Je m'intéresse aux pratiques spirituelles comme la méditation ou la prière.", es: 'Me interesan las prácticas espirituales como la meditación o la oración.', zh: '我对冥想或祈祷等灵性活动感兴趣。', } },
  { id: 35, dimension: 'ST', reversed: true, text: { ko: '나는 대체로 현실적이고 영적인 것에는 크게 관심이 없다.', en: 'I am generally realistic and have little interest in spiritual matters.', ja: '私は一般的に現実的で、精神的なことにはあまり興味がない。', fr: "Je suis généralement réaliste et peu intéressé(e) par les questions spirituelles.", es: 'En general soy realista y tengo poco interés en asuntos espirituales.', zh: '我通常很现实，对灵性事物没有太大兴趣。', } },
];

const OPTIONS = [1, 2, 3, 4, 5];

type DimensionKey = 'HA' | 'NS' | 'RD' | 'P' | 'SD' | 'C' | 'ST';

interface DimensionInfo {
  label: Record<Locale, string>;
  low: Record<Locale, string>;
  high: Record<Locale, string>;
  color: string;
  emoji: string;
}

const DIMENSIONS: Record<DimensionKey, DimensionInfo> = {
  HA: {
    label: { ko: '위험 회피', en: 'Harm Avoidance', ja: '危険回避', fr: 'Évitement du danger', es: 'Evitación del daño', zh: '避害性', },
    low: { ko: '대담하고 낙관적', en: 'Bold & Optimistic', ja: '大胆・楽観的', fr: 'Audacieux & optimiste', es: 'Audaz y optimista', zh: '大膽樂觀', },
    high: { ko: '신중하고 불안 경향', en: 'Cautious & Anxious', ja: '慎重・不安傾向', fr: 'Prudent & anxieux', es: 'Cauteloso y ansioso', zh: '謹慎焦慮傾向', },
    color: 'blue',
    emoji: '🛡️',
  },
  NS: {
    label: { ko: '자극 추구', en: 'Novelty Seeking', ja: '刺激追求', fr: 'Recherche de nouveauté', es: 'Búsqueda de novedad', zh: '新奇尋求', },
    low: { ko: '꼼꼼하고 체계적', en: 'Meticulous & Systematic', ja: '几帳面・体系的', fr: 'Méticuleux & systématique', es: 'Meticuloso y sistemático', zh: '细心有条理', },
    high: { ko: '탐험적이고 충동적', en: 'Exploratory & Impulsive', ja: '探索的・衝動的', fr: 'Explorateur & impulsif', es: 'Exploratorio e impulsivo', zh: '探索冲动型', },
    color: 'orange',
    emoji: '🚀',
  },
  RD: {
    label: { ko: '보상 의존성', en: 'Reward Dependence', ja: '報酬依存', fr: 'Dépendance à la récompense', es: 'Dependencia de recompensa', zh: '獎賞依賴', },
    low: { ko: '독립적이고 실용적', en: 'Independent & Practical', ja: '独立的・実用的', fr: 'Indépendant & pratique', es: 'Independiente y práctico', zh: '独立实际型', },
    high: { ko: '공감적이고 사교적', en: 'Empathetic & Sociable', ja: '共感的・社交的', fr: 'Empathique & sociable', es: 'Empático y sociable', zh: '共情社交型', },
    color: 'pink',
    emoji: '💖',
  },
  P: {
    label: { ko: '인내력', en: 'Persistence', ja: '忍耐力', fr: 'Persistance', es: 'Persistencia', zh: '坚持性', },
    low: { ko: '유연하고 적응적', en: 'Flexible & Adaptive', ja: '柔軟・適応的', fr: 'Flexible & adaptatif', es: 'Flexible y adaptativo', zh: '灵活适应型', },
    high: { ko: '끈기 있고 성취 지향', en: 'Tenacious & Achievement-Oriented', ja: '粘り強く・達成志向', fr: 'Tenace & orienté réussite', es: 'Tenaz y orientado al logro', zh: '坚韧成就导向', },
    color: 'green',
    emoji: '💪',
  },
  SD: {
    label: { ko: '자기 주도성', en: 'Self-Directedness', ja: '自己主導性', fr: "Autonomie personnelle", es: 'Autodirección', zh: '自我主導性', },
    low: { ko: '목적 의식 발달 중', en: 'Still Developing Purpose', ja: '目的意識を発展中', fr: 'Développement du but de vie en cours', es: 'Propósito aún en desarrollo', zh: '目标意识仍在发展中', },
    high: { ko: '자율적이고 책임감 있는', en: 'Autonomous & Responsible', ja: '自律的・責任感ある', fr: 'Autonome & responsable', es: 'Autónomo y responsable', zh: '自律負責型', },
    color: 'indigo',
    emoji: '🧭',
  },
  C: {
    label: { ko: '협동심', en: 'Cooperativeness', ja: '協調性', fr: 'Coopérativité', es: 'Cooperatividad', zh: '合作性', },
    low: { ko: '독립적이고 경쟁적', en: 'Independent & Competitive', ja: '独立的・競争的', fr: 'Indépendant & compétitif', es: 'Independiente y competitivo', zh: '独立竞争型', },
    high: { ko: '친사회적이고 공감적', en: 'Prosocial & Empathetic', ja: '向社会的・共感的', fr: 'Prosocial & empathique', es: 'Prosocial y empático', zh: '親社會共情型', },
    color: 'teal',
    emoji: '🤝',
  },
  ST: {
    label: { ko: '자기 초월', en: 'Self-Transcendence', ja: '自己超越', fr: 'Transcendance de soi', es: 'Autotrascendencia', zh: '自我超越', },
    low: { ko: '현실적이고 세속적', en: 'Realistic & Worldly', ja: '現実的・世俗的', fr: 'Réaliste & mondain', es: 'Realista y mundano', zh: '現實世俗型', },
    high: { ko: '영적이고 우주적 연결감', en: 'Spiritual & Cosmic Connection', ja: '精神的・宇宙的つながり', fr: 'Spirituel & connexion cosmique', es: 'Espiritual y conexión cósmica', zh: '灵性宇宙连结感', },
    color: 'violet',
    emoji: '✨',
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string; badge: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', bar: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', bar: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
};

const L: Record<Locale, {
  title: string; subtitle: string; start: string; prev: string; next: string; submit: string; restart: string;
  q: string; of: string; temperament: string; character: string;
  lowLabel: string; highLabel: string;
  yourProfile: string; disclaimer: string;
  optionLabels: [string, string, string, string, string];
}> = {
  ko: {
    title: 'TCI 기질 및 성격 검사', subtitle: '클로닌저의 7차원 성격 분석',
    start: '검사 시작', prev: '이전', next: '다음', submit: '결과 보기', restart: '다시 하기',
    q: '문항', of: '/',
    temperament: '기질', character: '성격',
    lowLabel: '낮음', highLabel: '높음',
    yourProfile: '나의 TCI 프로파일',
    disclaimer: '이 검사는 심리 교육 목적으로 제작된 약식 TCI-R입니다. 임상 진단을 대체하지 않습니다.',
    optionLabels: ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'],
  },
  en: {
    title: 'TCI Temperament & Character Test', subtitle: "Cloninger's 7-Dimension Personality Analysis",
    start: 'Start Test', prev: 'Previous', next: 'Next', submit: 'See Results', restart: 'Restart',
    q: 'Q', of: '/',
    temperament: 'Temperament', character: 'Character',
    lowLabel: 'Low', highLabel: 'High',
    yourProfile: 'My TCI Profile',
    disclaimer: 'This is an abridged TCI-R for educational purposes and does not replace clinical assessment.',
    optionLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
  },
  ja: {
    title: 'TCI気質・性格検査', subtitle: 'クロニンジャーの7次元性格分析',
    start: '検査開始', prev: '前へ', next: '次へ', submit: '結果を見る', restart: 'やり直す',
    q: '問', of: '/',
    temperament: '気質', character: '性格',
    lowLabel: '低い', highLabel: '高い',
    yourProfile: '私のTCIプロファイル',
    disclaimer: 'これは教育目的の簡略版TCI-Rであり、臨床診断の代わりにはなりません。',
    optionLabels: ['全くそうでない', 'そうでない', '普通', 'そうだ', '非常にそうだ'],
  },
  fr: {
    title: 'Test TCI Tempérament & Caractère', subtitle: "Analyse de personnalité en 7 dimensions de Cloninger",
    start: 'Commencer le test', prev: 'Précédent', next: 'Suivant', submit: 'Voir les résultats', restart: 'Recommencer',
    q: 'Q', of: '/',
    temperament: 'Tempérament', character: 'Caractère',
    lowLabel: 'Bas', highLabel: 'Haut',
    yourProfile: 'Mon profil TCI',
    disclaimer: "Ceci est un TCI-R abrégé à des fins éducatives et ne remplace pas une évaluation clinique.",
    optionLabels: ['Pas du tout', 'Non', 'Neutre', 'Oui', 'Tout à fait'],
  },
  es: {
    title: 'Test TCI Temperamento y Carácter', subtitle: "Análisis de personalidad en 7 dimensiones de Cloninger",
    start: 'Iniciar test', prev: 'Anterior', next: 'Siguiente', submit: 'Ver resultados', restart: 'Reiniciar',
    q: 'P', of: '/',
    temperament: 'Temperamento', character: 'Carácter',
    lowLabel: 'Bajo', highLabel: 'Alto',
    yourProfile: 'Mi perfil TCI',
    disclaimer: "Este es un TCI-R abreviado con fines educativos y no reemplaza una evaluación clínica.",
    optionLabels: ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutro', 'De acuerdo', 'Totalmente de acuerdo'],
  },
  zh: {
    title: 'TCI气质与性格测验', subtitle: 'Cloninger 7维度人格分析',
    start: '开始测验', prev: '上一题', next: '下一题', submit: '查看结果', restart: '重新测验',
    q: '题', of: '/',
    temperament: '气质', character: '性格',
    lowLabel: '低', highLabel: '高',
    yourProfile: '我的TCI人格档案',
    disclaimer: '本测验为教育目的的简短版TCI-R，不能替代临床评估。',
    optionLabels: ['完全不同意', '不同意', '普通', '同意', '非常同意'],
  },
};

const TEMPERAMENT_DIMS: DimensionKey[] = ['HA', 'NS', 'RD', 'P'];
const CHARACTER_DIMS: DimensionKey[] = ['SD', 'C', 'ST'];

function scoreForDim(dim: DimensionKey, answers: Record<number, number>): number {
  const qs = QUESTIONS.filter(q => q.dimension === dim);
  if (qs.length === 0) return 0;
  const total = qs.reduce((sum, q) => {
    const raw = answers[q.id] ?? 3;
    return sum + (q.reversed ? 6 - raw : raw);
  }, 0);
  return Math.round((total / (qs.length * 5)) * 100);
}

export default function TciPersonalityTest({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const q = QUESTIONS[current];
  const progress = Math.round(((current) / QUESTIONS.length) * 100);
  const answered = answers[q?.id] !== undefined;

  const scores = Object.fromEntries(
    (Object.keys(DIMENSIONS) as DimensionKey[]).map(d => [d, scoreForDim(d, answers)])
  ) as Record<DimensionKey, number>;

  function handleAnswer(val: number) {
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }

  function handleNext() {
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setDone(true);
    }
  }

  function handlePrev() {
    if (current > 0) setCurrent(c => c - 1);
  }

  function restart() {
    setStarted(false);
    setCurrent(0);
    setAnswers({});
    setDone(false);
  }

  const DimBar = ({ dimKey }: { dimKey: DimensionKey }) => {
    const info = DIMENSIONS[dimKey];
    const c = COLOR_MAP[info.color];
    const score = scores[dimKey];
    return (
      <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{info.emoji}</span>
            <span className={`font-semibold ${c.text}`}>{info.label[locale]}</span>
          </div>
          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{score}%</span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full mb-2">
          <div className={`absolute left-0 top-0 h-2 rounded-full transition-all ${c.bar}`} style={{ width: `${score}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{info.low[locale]}</span>
          <span>{info.high[locale]}</span>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {score >= 60 ? info.high[locale] : score <= 40 ? info.low[locale] : `${info.low[locale]} / ${info.high[locale]}`}
        </p>
      </div>
    );
  };

  if (!started) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-2">{t.temperament}</p>
              <div className="space-y-1">
                {TEMPERAMENT_DIMS.map(d => (
                  <div key={d} className="flex items-center gap-2 text-sm text-gray-700">
                    <span>{DIMENSIONS[d].emoji}</span>
                    <span>{DIMENSIONS[d].label[locale]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-600 mb-2">{t.character}</p>
              <div className="space-y-1">
                {CHARACTER_DIMS.map(d => (
                  <div key={d} className="flex items-center gap-2 text-sm text-gray-700">
                    <span>{DIMENSIONS[d].emoji}</span>
                    <span>{DIMENSIONS[d].label[locale]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>
        </div>
        <button onClick={() => setStarted(true)}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
          {t.start} ({QUESTIONS.length} {t.q})
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t.yourProfile}</h1>
          <p className="text-gray-500 mt-1">{t.title}</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-indigo-600 mb-3">{t.temperament}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPERAMENT_DIMS.map(d => <DimBar key={d} dimKey={d} />)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-violet-600 mb-3">{t.character}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHARACTER_DIMS.map(d => <DimBar key={d} dimKey={d} />)}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>

        <button onClick={restart}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
          {t.restart}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t.q} {current + 1} {t.of} {QUESTIONS.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 min-h-[160px]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            {DIMENSIONS[q.dimension].emoji} {DIMENSIONS[q.dimension].label[locale]}
          </span>
        </div>
        <p className="text-gray-800 font-medium leading-relaxed">{q.text[locale]}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-5 gap-2">
        {OPTIONS.map((val, idx) => {
          const selected = answers[q.id] === val;
          return (
            <button
              key={val}
              onClick={() => handleAnswer(val)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                selected
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              <span className="text-lg font-bold">{val}</span>
              <span className="text-[10px] leading-tight text-center hidden sm:block">
                {t.optionLabels[idx]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{t.optionLabels[0]}</span>
        <span>{t.optionLabels[4]}</span>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={current === 0}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-semibold rounded-xl transition-colors"
        >
          {t.prev}
        </button>
        <button
          onClick={handleNext}
          disabled={!answered}
          className="flex-2 flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {current === QUESTIONS.length - 1 ? t.submit : t.next}
        </button>
      </div>
    </div>
  );
}
