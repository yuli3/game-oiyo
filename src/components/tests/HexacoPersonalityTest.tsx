import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type DimKey = 'H' | 'E' | 'X' | 'A' | 'C' | 'O';

interface Question {
  id: number;
  dim: DimKey;
  rev: boolean;
  text: Record<Locale, string>;
}

// 60 items — 10 per dimension, abridged HEXACO-PI-R inspired
const QUESTIONS: Question[] = [
  // H — Honesty-Humility
  { id: 1, dim: 'H', rev: false, text: { ko: '나는 규칙을 어겨서라도 이득을 취하는 것을 거부한다.', en: "I would never cheat on a rule to gain a personal advantage.", ja: 'ルールを破ってまで利益を得ようとはしない。', fr: "Je refuserais de tricher pour obtenir un avantage personnel.", es: "Nunca haría trampa para obtener ventaja personal.", zh: '即使可以得到好处，我也拒绝违反规则。', } },
  { id: 2, dim: 'H', rev: true, text: { ko: '나는 원하는 것을 얻기 위해 남을 아첨으로 조종하곤 한다.', en: "I sometimes flatter people to get what I want.", ja: '欲しいものを得るために人をおだてることがある。', fr: "Il m'arrive de flatter les gens pour obtenir ce que je veux.", es: "A veces halago a la gente para conseguir lo que quiero.", zh: '我有时会用奉承来操纵他人以达到目的。', } },
  { id: 3, dim: 'H', rev: false, text: { ko: '부유해지거나 유명해지는 것은 나에게 중요하지 않다.', en: "Being rich or famous is not particularly important to me.", ja: '裕福になることや有名になることは私にとって重要ではない。', fr: "Être riche ou célèbre n'est pas particulièrement important pour moi.", es: "Ser rico o famoso no es particularmente importante para mí.", zh: '成为富人或名人对我来说并不特别重要。', } },
  { id: 4, dim: 'H', rev: false, text: { ko: '나는 비윤리적인 행동이 비록 합법적이라도 하지 않는다.', en: "I would not engage in unethical actions, even if they were legal.", ja: '合法であっても非倫理的な行動はしない。', fr: "Je ne ferais pas d'actes contraires à l'éthique, même s'ils étaient légaux.", es: "No realizaría acciones poco éticas, aunque fueran legales.", zh: '即使是合法的，我也不會做不道德的行為。', } },
  { id: 5, dim: 'H', rev: true, text: { ko: '나는 특별한 대우나 특권을 받을 자격이 있다고 생각한다.', en: "I think I deserve special treatment or privileges.", ja: '自分には特別な扱いや特権を受ける資格があると思う。', fr: "Je pense que je mérite un traitement spécial ou des privilèges.", es: "Creo que merezco un trato especial o privilegios.", zh: '我认为自己有资格获得特殊待遇或特权。', } },
  { id: 6, dim: 'H', rev: false, text: { ko: '나는 내 소유가 아닌 것을 탐내지 않는다.', en: "I don't covet things that don't belong to me.", ja: '自分のものでないものを羨まない。', fr: "Je ne convoite pas ce qui ne m'appartient pas.", es: "No codicio lo que no me pertenece.", zh: '我不贪求不属于我的东西。', } },
  { id: 7, dim: 'H', rev: true, text: { ko: '나는 내 지위를 높이기 위해 사람들에게 잘 보이려 한다.', en: "I try to look good in front of others to boost my status.", ja: '自分の地位を高めるために他者に良く見られようとする。', fr: "J'essaie de paraître bien devant les autres pour hausser mon statut.", es: "Trato de quedar bien ante los demás para elevar mi estatus.", zh: '我努力在他人面前表現良好，以提升自己的地位。', } },
  { id: 8, dim: 'H', rev: false, text: { ko: '사회적 명성보다 진실성이 더 중요하다고 믿는다.', en: "I believe integrity is more important than social status.", ja: '社会的名声より誠実さの方が重要だと信じている。', fr: "Je crois que l'intégrité est plus importante que le statut social.", es: "Creo que la integridad es más importante que el estatus social.", zh: '我相信誠信比社會地位更重要。', } },
  { id: 9, dim: 'H', rev: true, text: { ko: '나는 원한다면 사람들을 교묘하게 조종할 수 있다.', en: "I could manipulate people cleverly if I wanted to.", ja: '望めば人を巧みに操ることができる。', fr: "Je pourrais manipuler habilement les gens si je le voulais.", es: "Si quisiera, podría manipular a la gente con astucia.", zh: '如果我願意，我可以巧妙地操控他人。', } },
  { id: 10, dim: 'H', rev: false, text: { ko: '나는 다른 사람을 이용해서 성공하고 싶지 않다.', en: "I don't want to succeed by exploiting others.", ja: '他者を利用して成功したくない。', fr: "Je ne veux pas réussir en exploitant les autres.", es: "No quiero tener éxito explotando a los demás.", zh: '我不想通过剥削他人来取得成功。', } },

  // E — Emotionality
  { id: 11, dim: 'E', rev: false, text: { ko: '나는 두렵거나 걱정되는 일이 많다.', en: "I often worry or feel fearful about many things.", ja: '多くのことを恐れたり心配したりする。', fr: "Je m'inquiète souvent ou j'ai peur de beaucoup de choses.", es: "A menudo me preocupo o temo muchas cosas.", zh: '我常常對許多事情感到恐懼或擔憂。', } },
  { id: 12, dim: 'E', rev: false, text: { ko: '슬픈 영화나 이야기에 쉽게 눈물이 난다.', en: "I easily tear up at sad movies or stories.", ja: '悲しい映画や話で簡単に涙が出る。', fr: "Je pleure facilement lors de films ou d'histoires tristes.", es: "Se me llenan fácilmente los ojos de lágrimas con películas o historias tristes.", zh: '看悲伤的电影或故事时，我很容易流泪。', } },
  { id: 13, dim: 'E', rev: false, text: { ko: '친밀한 사람과의 관계가 끊어질까 봐 걱정한다.', en: "I worry about losing close relationships.", ja: '親密な関係が壊れることを心配する。', fr: "Je me préoccupe de perdre des relations proches.", es: "Me preocupa perder relaciones cercanas.", zh: '我担心会失去亲密的关系。', } },
  { id: 14, dim: 'E', rev: true, text: { ko: '나는 스트레스가 심한 상황에서도 잘 동요하지 않는다.', en: "I stay calm even in very stressful situations.", ja: '非常にストレスの多い状況でも動じない。', fr: "Je reste calme même dans des situations très stressantes.", es: "Me mantengo tranquilo/a incluso en situaciones muy estresantes.", zh: '即使在非常有壓力的情況下，我也能保持冷靜。', } },
  { id: 15, dim: 'E', rev: false, text: { ko: '나는 타인이 처한 어려움에 깊이 공감한다.', en: "I feel deeply empathetic toward others' difficulties.", ja: '他者の困難に深く共感する。', fr: "Je ressens une profonde empathie pour les difficultés des autres.", es: "Siento una profunda empatía hacia las dificultades de los demás.", zh: '我對他人的困難感到深切的同情。', } },
  { id: 16, dim: 'E', rev: false, text: { ko: '감정이 쉽게 상처받는 편이다.', en: "My feelings get hurt easily.", ja: '感情が傷つきやすい。', fr: "Je suis facilement blessé(e) émotionnellement.", es: "Me hieren los sentimientos fácilmente.", zh: '我的感情容易受傷。', } },
  { id: 17, dim: 'E', rev: true, text: { ko: '나는 위기 상황에서도 감정적으로 안정되어 있다.', en: "I remain emotionally stable in crisis situations.", ja: '危機的状況でも感情的に安定している。', fr: "Je reste émotionnellement stable dans les situations de crise.", es: "Me mantengo emocionalmente estable en situaciones de crisis.", zh: '在危機情況下，我的情緒仍然穩定。', } },
  { id: 18, dim: 'E', rev: false, text: { ko: '다른 사람의 감정 변화를 잘 눈치챈다.', en: "I notice changes in other people's emotions quickly.", ja: "他者の感情の変化にすぐ気づく。", fr: "Je remarque rapidement les changements d'humeur des autres.", es: "Noto rápidamente los cambios en las emociones de los demás.", zh: '我能很快注意到他人情緒的變化。', } },
  { id: 19, dim: 'E', rev: false, text: { ko: '미래에 대한 불안이 자주 나를 압도한다.', en: "Anxiety about the future often overwhelms me.", ja: '将来への不安がしばしば私を圧倒する。', fr: "L'anxiété face à l'avenir m'envahit souvent.", es: "La ansiedad sobre el futuro me abruma con frecuencia.", zh: '對未來的焦慮常常讓我不知所措。', } },
  { id: 20, dim: 'E', rev: false, text: { ko: '나는 두려움이나 불안 없이 어려운 감정을 표현하기 어렵다.', en: "I have difficulty expressing difficult emotions without fear or anxiety.", ja: '恐れや不安なく難しい感情を表現するのが難しい。', fr: "J'ai du mal à exprimer des émotions difficiles sans peur ni anxiété.", es: "Me cuesta expresar emociones difíciles sin miedo ni ansiedad.", zh: '我很難不帶恐懼或焦慮地表達困難的情緒。', } },

  // X — eXtraversion
  { id: 21, dim: 'X', rev: false, text: { ko: '나는 파티나 모임에서 대화를 주도하는 편이다.', en: "I tend to lead conversations at parties or gatherings.", ja: 'パーティーや集まりで会話をリードする傾向がある。', fr: "J'ai tendance à mener les conversations lors de fêtes ou de réunions.", es: "Tiendo a liderar las conversaciones en fiestas o reuniones.", zh: '在聚會或派對上，我傾向於主導對話。', } },
  { id: 22, dim: 'X', rev: true, text: { ko: '나는 여러 사람과 함께 있는 것보다 혼자 있는 것을 선호한다.', en: "I prefer being alone to being with a group of people.", ja: '多くの人といるよりも一人でいることを好む。', fr: "Je préfère être seul(e) plutôt qu'en groupe.", es: "Prefiero estar solo/a a estar con un grupo de personas.", zh: '我比较喜欢独处，而不是与一群人在一起。', } },
  { id: 23, dim: 'X', rev: false, text: { ko: '나는 새로운 사람들을 만나는 것이 즐겁다.', en: "I enjoy meeting new people.", ja: '新しい人たちに会うのが楽しい。', fr: "J'aime rencontrer de nouvelles personnes.", es: "Disfruto conocer a nuevas personas.", zh: '我喜欢结识新朋友。', } },
  { id: 24, dim: 'X', rev: false, text: { ko: '나는 활력이 넘치고 주변에 긍정적인 에너지를 전달한다.', en: "I am energetic and spread positive energy to those around me.", ja: '活力があり、周囲にポジティブなエネルギーを伝える。', fr: "Je suis dynamique et transmets une énergie positive aux personnes autour de moi.", es: "Soy enérgico/a y transmito energía positiva a quienes me rodean.", zh: '我充满活力，并向周围的人传递正能量。', } },
  { id: 25, dim: 'X', rev: true, text: { ko: '나는 사교적인 상황에서 종종 불편함을 느낀다.', en: "I often feel uncomfortable in social situations.", ja: '社交的な状況でしばしば不快感を感じる。', fr: "Je me sens souvent mal à l'aise dans les situations sociales.", es: "A menudo me siento incómodo/a en situaciones sociales.", zh: '我在社交場合常常感到不舒適。', } },
  { id: 26, dim: 'X', rev: false, text: { ko: '나는 다양한 사람들과 쉽게 어울린다.', en: "I get along easily with a wide variety of people.", ja: '様々な人々と容易に溶け込める。', fr: "Je m'entends facilement avec une grande variété de personnes.", es: "Me llevo bien fácilmente con una gran variedad de personas.", zh: '我能轻易地与各种各样的人相处。', } },
  { id: 27, dim: 'X', rev: false, text: { ko: '나는 대화하는 것을 즐기고 말이 많은 편이다.', en: "I enjoy talking and am quite talkative.", ja: '話すのが好きで、かなりおしゃべりな方だ。', fr: "J'aime parler et je suis assez bavard(e).", es: "Me gusta hablar y soy bastante hablador/a.", zh: '我喜歡交談，是個話多的人。', } },
  { id: 28, dim: 'X', rev: true, text: { ko: '나는 혼자 하는 활동을 그룹 활동보다 더 즐긴다.', en: "I enjoy solitary activities more than group ones.", ja: '一人での活動の方がグループ活動より楽しい。', fr: "Je préfère les activités solitaires aux activités de groupe.", es: "Disfruto más las actividades solitarias que las grupales.", zh: '我比群体活动更享受独自活动。', } },
  { id: 29, dim: 'X', rev: false, text: { ko: '나는 주목받는 상황을 즐긴다.', en: "I enjoy being the center of attention.", ja: '注目される状況を楽しむ。', fr: "J'apprécie d'être le centre de l'attention.", es: "Disfruto siendo el centro de atención.", zh: '我喜欢成为关注的焦点。', } },
  { id: 30, dim: 'X', rev: false, text: { ko: '나는 사람들과 함께할 때 기운이 솟는다.', en: "Being around people gives me energy.", ja: '人々と一緒にいると活力が湧く。', fr: "La présence des autres me donne de l'énergie.", es: "Estar rodeado/a de personas me da energía.", zh: '与人相处让我充满活力。', } },

  // A — Agreeableness (vs Anger)
  { id: 31, dim: 'A', rev: false, text: { ko: '나는 화가 나도 침착하게 반응하는 편이다.', en: "Even when I'm angry, I tend to react calmly.", ja: '怒っていても、冷静に反応する傾向がある。', fr: "Même en colère, j'ai tendance à réagir calmement.", es: "Incluso cuando estoy enojado/a, tiendo a reaccionar con calma.", zh: '即使生气，我也倾向于冷静地反应。', } },
  { id: 32, dim: 'A', rev: true, text: { ko: '나는 비판을 받으면 즉각적으로 반격하고 싶어진다.', en: "When criticized, I immediately want to fight back.", ja: '批判されると、すぐに反撃したくなる。', fr: "Quand je suis critiqué(e), je veux immédiatement riposter.", es: "Cuando me critican, quiero contraatacar inmediatamente.", zh: '当受到批评时，我会立即想要反击。', } },
  { id: 33, dim: 'A', rev: false, text: { ko: '나는 사람들과 협력하는 것을 편하게 생각한다.', en: "I find it easy and comfortable to cooperate with others.", ja: '他者と協力することを心地よく感じる。', fr: "Je trouve facile et agréable de coopérer avec les autres.", es: "Me resulta fácil y cómodo cooperar con los demás.", zh: '我觉得与他人合作既容易又舒适。', } },
  { id: 34, dim: 'A', rev: true, text: { ko: '나는 불공평하다고 느끼면 강하게 항의한다.', en: "If I feel treated unfairly, I protest strongly.", ja: '不公平に感じると強く抗議する。', fr: "Si je me sens traité(e) injustement, je proteste vivement.", es: "Si me siento tratado/a injustamente, protesto enérgicamente.", zh: '如果感觉受到不公平对待，我会强烈抗议。', } },
  { id: 35, dim: 'A', rev: false, text: { ko: '나는 갈등을 피하고 평화롭게 해결하려 한다.', en: "I try to avoid conflict and resolve things peacefully.", ja: '衝突を避け、平和的に解決しようとする。', fr: "J'essaie d'éviter les conflits et de résoudre les choses pacifiquement.", es: "Trato de evitar conflictos y resolver las cosas de manera pacífica.", zh: '我试图避免冲突，和平地解决问题。', } },
  { id: 36, dim: 'A', rev: true, text: { ko: '나는 나를 화나게 한 사람을 용서하기 어렵다.', en: "I find it hard to forgive someone who has angered me.", ja: '自分を怒らせた人を許すのが難しい。', fr: "J'ai du mal à pardonner à quelqu'un qui m'a mis(e) en colère.", es: "Me resulta difícil perdonar a alguien que me ha enojado.", zh: '我很難原諒激怒我的人。', } },
  { id: 37, dim: 'A', rev: false, text: { ko: '나는 타협과 조율을 통해 문제를 해결하는 것을 좋아한다.', en: "I like resolving problems through compromise and coordination.", ja: '妥協と調整を通じて問題を解決するのが好きだ。', fr: "J'aime résoudre les problèmes par le compromis et la coordination.", es: "Me gusta resolver problemas mediante el compromiso y la coordinación.", zh: '我喜欢通过妥协和协调来解决问题。', } },
  { id: 38, dim: 'A', rev: true, text: { ko: '때로는 자신의 권리를 위해 싸우는 것이 필요하다고 생각한다.', en: "I think it is sometimes necessary to fight for one's rights.", ja: '時には自分の権利のために戦うことが必要だと思う。', fr: "Je pense qu'il est parfois nécessaire de se battre pour ses droits.", es: "Creo que a veces es necesario luchar por los propios derechos.", zh: '我认为有时需要为自己的权利而抗争。', } },
  { id: 39, dim: 'A', rev: false, text: { ko: '나는 다른 사람의 입장에서 생각하려고 노력한다.', en: "I try to think from another person's point of view.", ja: "他者の立場から考えようとする。", fr: "J'essaie de me mettre à la place des autres.", es: "Trato de pensar desde el punto de vista de otra persona.", zh: '我努力从他人的角度思考问题。', } },
  { id: 40, dim: 'A', rev: false, text: { ko: '나는 쉽게 화를 내지 않고 참을성이 있다.', en: "I am patient and don't get angry easily.", ja: '忍耐強く、簡単には怒らない。', fr: "Je suis patient(e) et ne me mets pas facilement en colère.", es: "Soy paciente y no me enojo fácilmente.", zh: '我有耐心，不容易生氣。', } },

  // C — Conscientiousness
  { id: 41, dim: 'C', rev: false, text: { ko: '나는 계획을 세우고 그것을 따르는 것을 좋아한다.', en: "I like to make plans and follow them.", ja: '計画を立て、それに従うのが好きだ。', fr: "J'aime faire des plans et les suivre.", es: "Me gusta hacer planes y seguirlos.", zh: '我喜欢制定计划并遵循它们。', } },
  { id: 42, dim: 'C', rev: true, text: { ko: '나는 중요한 일도 마지막 순간까지 미루는 경향이 있다.', en: "I tend to procrastinate on important tasks until the last moment.", ja: '重要な仕事でも最後の瞬間まで先延ばしにする傾向がある。', fr: "J'ai tendance à procrastiner sur des tâches importantes jusqu'au dernier moment.", es: "Tiendo a posponer tareas importantes hasta el último momento.", zh: '我傾向於把重要的工作推遲到最後一刻。', } },
  { id: 43, dim: 'C', rev: false, text: { ko: '나는 꼼꼼하고 세밀하게 일을 처리한다.', en: "I am thorough and detail-oriented in my work.", ja: '仕事を丁寧かつ細部まで注意して処理する。', fr: "Je suis minutieux(se) et attentif(ve) aux détails dans mon travail.", es: "Soy meticuloso/a y orientado/a al detalle en mi trabajo.", zh: '我做事细心、注重细节。', } },
  { id: 44, dim: 'C', rev: false, text: { ko: '한 번 맡은 일은 끝까지 완수한다.', en: "I complete tasks I have taken on until the end.", ja: '一度引き受けた仕事は最後まで完遂する。', fr: "Je mène à bien les tâches que j'ai acceptées jusqu'au bout.", es: "Completo las tareas que he asumido hasta el final.", zh: '我會把負責的工作完成到底。', } },
  { id: 45, dim: 'C', rev: true, text: { ko: '나는 쉽게 산만해지거나 집중을 유지하기 어렵다.', en: "I am easily distracted and find it hard to stay focused.", ja: '簡単に気が散り、集中を保つのが難しい。', fr: "Je me laisse facilement distraire et j'ai du mal à rester concentré(e).", es: "Me distraigo fácilmente y me cuesta mantener la concentración.", zh: '我容易分心，難以保持專注。', } },
  { id: 46, dim: 'C', rev: false, text: { ko: '나는 시간 약속과 규칙을 잘 지킨다.', en: "I keep appointments and follow rules well.", ja: '時間の約束やルールをきちんと守る。', fr: "Je respecte bien les rendez-vous et les règles.", es: "Cumplo bien con las citas y respeto las reglas.", zh: '我能遵守时间约定和规则。', } },
  { id: 47, dim: 'C', rev: false, text: { ko: '나는 깔끔하고 정돈된 환경을 선호한다.', en: "I prefer clean and organized environments.", ja: '清潔で整然とした環境を好む。', fr: "Je préfère des environnements propres et organisés.", es: "Prefiero ambientes limpios y organizados.", zh: '我喜歡整潔有序的環境。', } },
  { id: 48, dim: 'C', rev: true, text: { ko: '나는 장기 목표보다 즉각적인 즐거움을 더 추구한다.', en: "I tend to pursue immediate pleasure over long-term goals.", ja: '長期目標より即座の楽しみを追求しがちだ。', fr: "J'ai tendance à rechercher le plaisir immédiat plutôt que les objectifs à long terme.", es: "Tiendo a buscar el placer inmediato sobre los objetivos a largo plazo.", zh: '我倾向于追求即时享乐而非长期目标。', } },
  { id: 49, dim: 'C', rev: false, text: { ko: '나는 어떤 일이든 충분히 준비하고 시작한다.', en: "I prepare thoroughly before starting any task.", ja: 'どんな仕事でも十分に準備してから始める。', fr: "Je me prépare soigneusement avant de commencer n'importe quelle tâche.", es: "Me preparo bien antes de comenzar cualquier tarea.", zh: '无论做什么事，我都会充分准备后再开始。', } },
  { id: 50, dim: 'C', rev: false, text: { ko: '나는 실수를 최소화하기 위해 노력한다.', en: "I try hard to minimize mistakes.", ja: 'ミスを最小限にするよう努力する。', fr: "Je m'efforce de minimiser les erreurs.", es: "Me esfuerzo por minimizar los errores.", zh: '我努力將錯誤降到最低。', } },

  // O — Openness to Experience
  { id: 51, dim: 'O', rev: false, text: { ko: '나는 예술, 음악, 문학에 깊은 관심이 있다.', en: "I have a deep interest in art, music, and literature.", ja: '芸術、音楽、文学に深い関心がある。', fr: "J'ai un profond intérêt pour l'art, la musique et la littérature.", es: "Tengo un profundo interés en el arte, la música y la literatura.", zh: '我对艺术、音乐和文学有深厚的兴趣。', } },
  { id: 52, dim: 'O', rev: false, text: { ko: '나는 새롭고 독창적인 아이디어를 생각해내는 것을 즐긴다.', en: "I enjoy coming up with new and original ideas.", ja: '新しい独創的なアイデアを思いつくことを楽しむ。', fr: "J'aime trouver des idées nouvelles et originales.", es: "Disfruto generando ideas nuevas y originales.", zh: '我喜欢想出新颖独特的想法。', } },
  { id: 53, dim: 'O', rev: false, text: { ko: '나는 상상력이 풍부하고 자주 공상에 빠진다.', en: "I have a vivid imagination and often daydream.", ja: '豊かな想像力があり、よく空想する。', fr: "J'ai une imagination vive et je rêvasse souvent.", es: "Tengo una imaginación vívida y a menudo fantaseo.", zh: '我有豐富的想像力，常常做白日夢。', } },
  { id: 54, dim: 'O', rev: true, text: { ko: '나는 새로운 아이디어보다 검증된 전통 방식을 선호한다.', en: "I prefer proven traditional methods over new ideas.", ja: '新しいアイデアよりも実証された従来の方法を好む。', fr: "Je préfère les méthodes traditionnelles éprouvées aux nouvelles idées.", es: "Prefiero los métodos tradicionales comprobados a las nuevas ideas.", zh: '我更喜欢经过验证的传统方式而非新想法。', } },
  { id: 55, dim: 'O', rev: false, text: { ko: '나는 철학적이거나 심오한 질문에 대해 생각하는 것을 즐긴다.', en: "I enjoy thinking about deep philosophical or abstract questions.", ja: '哲学的または深い抽象的な質問について考えることを楽しむ。', fr: "J'aime réfléchir à des questions philosophiques ou abstraites.", es: "Disfruto pensando en preguntas filosóficas o abstractas profundas.", zh: '我喜欢思考深刻的哲学或抽象问题。', } },
  { id: 56, dim: 'O', rev: false, text: { ko: '나는 다양한 문화와 관점을 이해하려고 노력한다.', en: "I try to understand different cultures and perspectives.", ja: '様々な文化や観点を理解しようとする。', fr: "J'essaie de comprendre différentes cultures et perspectives.", es: "Trato de entender diferentes culturas y perspectivas.", zh: '我试图了解不同的文化和观点。', } },
  { id: 57, dim: 'O', rev: true, text: { ko: '나는 예술적이거나 창의적인 활동에 별로 흥미가 없다.', en: "I have little interest in artistic or creative activities.", ja: '芸術的または創造的な活動にほとんど興味がない。', fr: "Je m'intéresse peu aux activités artistiques ou créatives.", es: "Tengo poco interés en actividades artísticas o creativas.", zh: '我对艺术或创意活动兴趣不大。', } },
  { id: 58, dim: 'O', rev: false, text: { ko: '나는 지식을 탐구하고 배우는 것에 큰 즐거움을 느낀다.', en: "I find great pleasure in exploring knowledge and learning.", ja: '知識を探求し学ぶことに大きな喜びを感じる。', fr: "Je trouve beaucoup de plaisir à explorer la connaissance et à apprendre.", es: "Encuentro gran placer en explorar el conocimiento y aprender.", zh: '我在探索知识和学习中感到很大的快乐。', } },
  { id: 59, dim: 'O', rev: false, text: { ko: '나는 다양한 취미와 관심사를 가지고 있다.', en: "I have a wide range of hobbies and interests.", ja: '様々な趣味と関心事を持っている。', fr: "J'ai un large éventail de loisirs et d'intérêts.", es: "Tengo una amplia variedad de pasatiempos e intereses.", zh: '我有各種各樣的愛好和興趣。', } },
  { id: 60, dim: 'O', rev: false, text: { ko: '나는 일상적인 것에서 아름다움을 발견하는 편이다.', en: "I tend to find beauty in everyday things.", ja: '日常的なものに美しさを見出す傾向がある。', fr: "J'ai tendance à trouver la beauté dans les choses ordinaires.", es: "Tiendo a encontrar belleza en las cosas cotidianas.", zh: '我傾向於在日常事物中發現美麗。', } },
];

const DIM_INFO: Record<DimKey, {
  label: Record<Locale, string>;
  low: Record<Locale, string>;
  high: Record<Locale, string>;
  color: string;
  emoji: string;
  desc: Record<Locale, string>;
}> = {
  H: {
    label: { ko: '정직·겸손', en: 'Honesty-Humility', ja: '誠実・謙虚', fr: 'Honnêteté-Humilité', es: 'Honestidad-Humildad', zh: '誠實謙遜', },
    low: { ko: '자기 중심적·기만적 경향', en: 'Self-centered / Deceitful tendency', ja: '自己中心的・欺瞞的傾向', fr: 'Tendance égocentrique / trompeuse', es: 'Tendencia egocéntrica / engañosa', zh: '以自我為中心/欺騙傾向', },
    high: { ko: '도덕적·겸손·공정한', en: 'Moral, Humble & Fair', ja: '道徳的・謙虚・公正', fr: 'Moral, humble & équitable', es: 'Moral, humilde y justo', zh: '道德、謙遜、公正', },
    color: 'amber',
    emoji: '🌿',
    desc: { ko: '도덕적 진실성, 겸손, 공평성에 대한 태도', en: 'Attitude toward moral integrity, humility, and fairness', ja: '道徳的誠実さ、謙虚さ、公平性への態度', fr: "Attitude envers l'intégrité morale, l'humilité et l'équité", es: 'Actitud hacia la integridad moral, la humildad y la equidad', zh: '對道德誠信、謙遜和公平的態度', },
  },
  E: {
    label: { ko: '정서성', en: 'Emotionality', ja: '情緒性', fr: 'Émotivité', es: 'Emocionalidad', zh: '情緒性', },
    low: { ko: '감정적으로 강인·독립적', en: 'Emotionally tough & independent', ja: '感情的に強靭・独立的', fr: 'Émotionnellement fort(e) & indépendant(e)', es: 'Emocionalmente fuerte e independiente', zh: '情感强韧、独立', },
    high: { ko: '감정적으로 민감·공감적', en: 'Emotionally sensitive & empathetic', ja: '感情的に敏感・共感的', fr: 'Émotionnellement sensible & empathique', es: 'Emocionalmente sensible y empático', zh: '情感敏感、共情', },
    color: 'rose',
    emoji: '💗',
    desc: { ko: '감정 민감도, 불안, 타인에 대한 공감 경향', en: 'Emotional sensitivity, anxiety, and empathy toward others', ja: '感情感受性、不安、他者への共感傾向', fr: 'Sensibilité émotionnelle, anxiété et empathie envers autrui', es: 'Sensibilidad emocional, ansiedad y empatía hacia los demás', zh: '情感敏感度、焦慮和對他人的同理心', },
  },
  X: {
    label: { ko: '외향성', en: 'eXtraversion', ja: '外向性', fr: 'Extraversion', es: 'Extraversión', zh: '外向性', },
    low: { ko: '내성적·독립적', en: 'Introverted & independent', ja: '内向的・独立的', fr: 'Introverti(e) & indépendant(e)', es: 'Introvertido/a e independiente', zh: '内向独立', },
    high: { ko: '외향적·사교적·활동적', en: 'Outgoing, sociable & active', ja: '外向的・社交的・活動的', fr: 'Extraverti(e), sociable & actif(ve)', es: 'Extrovertido/a, sociable y activo/a', zh: '外向社交活躍', },
    color: 'yellow',
    emoji: '🌟',
    desc: { ko: '사회적 자신감, 활력, 사교성 수준', en: 'Social confidence, energy level, and sociability', ja: '社会的自信、活力、社交性のレベル', fr: 'Confiance sociale, niveau d\'énergie et sociabilité', es: 'Confianza social, nivel de energía y sociabilidad', zh: '社交自信、活力水平和社交能力', },
  },
  A: {
    label: { ko: '원만성', en: 'Agreeableness', ja: '協調性', fr: 'Agréabilité', es: 'Amabilidad', zh: '宜人性', },
    low: { ko: '비판적·경쟁적·직접적', en: 'Critical, competitive & direct', ja: '批判的・競争的・直接的', fr: 'Critique, compétitif(ve) & direct(e)', es: 'Crítico/a, competitivo/a y directo/a', zh: '批判競爭直接型', },
    high: { ko: '인내심 있고 너그럽고 평화적', en: 'Patient, tolerant & peaceful', ja: '忍耐強く・寛大・平和的', fr: 'Patient(e), tolérant(e) & pacifique', es: 'Paciente, tolerante y pacífico/a', zh: '耐心寬容和平型', },
    color: 'teal',
    emoji: '🕊️',
    desc: { ko: '분노 조절, 관용, 갈등 회피 경향', en: 'Anger management, tolerance, and conflict avoidance', ja: '怒りの管理、寛容さ、紛争回避傾向', fr: 'Gestion de la colère, tolérance et évitement des conflits', es: 'Control de ira, tolerancia y evitación de conflictos', zh: '憤怒管理、寬容和避免衝突的傾向', },
  },
  C: {
    label: { ko: '성실성', en: 'Conscientiousness', ja: '誠実性', fr: 'Conscience', es: 'Escrupulosidad', zh: '盡責性', },
    low: { ko: '즉흥적·유연·쉽게 산만해짐', en: 'Spontaneous, flexible & easily distracted', ja: '即興的・柔軟・気が散りやすい', fr: 'Spontané(e), flexible & facilement distrait(e)', es: 'Espontáneo/a, flexible y fácilmente distraído/a', zh: '即兴灵活易分心', },
    high: { ko: '자기 훈련·조직적·꼼꼼한', en: 'Self-disciplined, organized & thorough', ja: '自己管理・組織的・几帳面', fr: 'Discipliné(e), organisé(e) & minutieux(se)', es: 'Autodisciplinado/a, organizado/a y minucioso/a', zh: '自律有条理细心', },
    color: 'indigo',
    emoji: '📋',
    desc: { ko: '자기 규율, 조직화, 목표 지향성', en: 'Self-discipline, organization, and goal-orientation', ja: '自己規律、組織化、目標志向性', fr: 'Autodiscipline, organisation et orientation vers les objectifs', es: 'Autodisciplina, organización y orientación a objetivos', zh: '自律、组织能力和目标导向', },
  },
  O: {
    label: { ko: '경험 개방성', en: 'Openness to Experience', ja: '経験への開放性', fr: 'Ouverture à l\'expérience', es: 'Apertura a la experiencia', zh: '开放性', },
    low: { ko: '실용적·전통 중심·구체적', en: 'Practical, conventional & concrete', ja: '実用的・伝統的・具体的', fr: 'Pratique, conventionnel(le) & concret(e)', es: 'Práctico/a, convencional y concreto/a', zh: '务实传统具体型', },
    high: { ko: '창의적·지적 호기심·상상력', en: 'Creative, intellectually curious & imaginative', ja: '創造的・知的好奇心・想像力', fr: 'Créatif(ve), curieux(se) intellectuellement & imaginatif(ve)', es: 'Creativo/a, curioso/a intelectualmente e imaginativo/a', zh: '創意智識好奇想像力豐富', },
    color: 'purple',
    emoji: '🎨',
    desc: { ko: '지적 호기심, 상상력, 미적 감수성', en: 'Intellectual curiosity, imagination, and aesthetic sensitivity', ja: '知的好奇心、想像力、美的感受性', fr: 'Curiosité intellectuelle, imagination et sensibilité esthétique', es: 'Curiosidad intelectual, imaginación y sensibilidad estética', zh: '智識好奇心、想像力和審美敏感度', },
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string; badge: string }> = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
};

const L: Record<Locale, {
  title: string; subtitle: string;
  start: string; prev: string; next: string; submit: string; restart: string;
  q: string; of: string;
  yourProfile: string; disclaimer: string;
  lowLabel: string; highLabel: string;
  optionLabels: [string, string, string, string, string];
}> = {
  ko: {
    title: 'HEXACO 성격 검사', subtitle: '정직성부터 개방성까지 6차원 성격 분석',
    start: '검사 시작', prev: '이전', next: '다음', submit: '결과 보기', restart: '다시 하기',
    q: '문항', of: '/',
    yourProfile: '나의 HEXACO 프로파일',
    disclaimer: '이 검사는 HEXACO-PI-R을 참고한 교육용 간략 버전입니다. 임상 진단을 대체하지 않습니다.',
    lowLabel: '낮음', highLabel: '높음',
    optionLabels: ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'],
  },
  en: {
    title: 'HEXACO Personality Test', subtitle: '6-Dimension Personality Analysis',
    start: 'Start Test', prev: 'Previous', next: 'Next', submit: 'See Results', restart: 'Restart',
    q: 'Q', of: '/',
    yourProfile: 'My HEXACO Profile',
    disclaimer: 'This is an abridged HEXACO-PI-R for educational purposes and does not replace clinical assessment.',
    lowLabel: 'Low', highLabel: 'High',
    optionLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
  },
  ja: {
    title: 'HEXACO性格検査', subtitle: '6次元性格分析',
    start: '検査開始', prev: '前へ', next: '次へ', submit: '結果を見る', restart: 'やり直す',
    q: '問', of: '/',
    yourProfile: '私のHEXACOプロファイル',
    disclaimer: 'これは教育目的のHEXACO-PI-R簡略版であり、臨床診断の代わりにはなりません。',
    lowLabel: '低い', highLabel: '高い',
    optionLabels: ['全くそうでない', 'そうでない', '普通', 'そうだ', '非常にそうだ'],
  },
  fr: {
    title: 'Test de Personnalité HEXACO', subtitle: "Analyse de personnalité en 6 dimensions",
    start: 'Commencer', prev: 'Précédent', next: 'Suivant', submit: 'Voir les résultats', restart: 'Recommencer',
    q: 'Q', of: '/',
    yourProfile: 'Mon profil HEXACO',
    disclaimer: "Ceci est un HEXACO-PI-R abrégé à des fins éducatives et ne remplace pas une évaluation clinique.",
    lowLabel: 'Bas', highLabel: 'Haut',
    optionLabels: ['Pas du tout', 'Non', 'Neutre', 'Oui', 'Tout à fait'],
  },
  es: {
    title: 'Test de Personalidad HEXACO', subtitle: "Análisis de personalidad en 6 dimensiones",
    start: 'Iniciar test', prev: 'Anterior', next: 'Siguiente', submit: 'Ver resultados', restart: 'Reiniciar',
    q: 'P', of: '/',
    yourProfile: 'Mi perfil HEXACO',
    disclaimer: "Este es un HEXACO-PI-R abreviado con fines educativos y no reemplaza una evaluación clínica.",
    lowLabel: 'Bajo', highLabel: 'Alto',
    optionLabels: ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutro', 'De acuerdo', 'Totalmente de acuerdo'],
  },
  zh: {
    title: 'HEXACO人格测验', subtitle: '6维度人格分析',
    start: '开始测验', prev: '上一题', next: '下一题', submit: '查看结果', restart: '重新测验',
    q: '题', of: '/',
    yourProfile: '我的HEXACO人格档案',
    disclaimer: '本测验为教育目的的简短版HEXACO-PI-R，不能替代临床评估。',
    lowLabel: '低', highLabel: '高',
    optionLabels: ['完全不同意', '不同意', '普通', '同意', '非常同意'],
  },
};

const DIM_ORDER: DimKey[] = ['H', 'E', 'X', 'A', 'C', 'O'];

function scoreForDim(dim: DimKey, answers: Record<number, number>): number {
  const qs = QUESTIONS.filter(q => q.dim === dim);
  if (qs.length === 0) return 0;
  const total = qs.reduce((sum, q) => {
    const raw = answers[q.id] ?? 3;
    return sum + (q.rev ? 6 - raw : raw);
  }, 0);
  return Math.round((total / (qs.length * 5)) * 100);
}

export default function HexacoPersonalityTest({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const q = QUESTIONS[current];
  const progress = Math.round((current / QUESTIONS.length) * 100);
  const answered = answers[q?.id] !== undefined;

  const scores = Object.fromEntries(
    DIM_ORDER.map(d => [d, scoreForDim(d, answers)])
  ) as Record<DimKey, number>;

  function handleAnswer(val: number) {
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }

  function handleNext() {
    if (current < QUESTIONS.length - 1) setCurrent(c => c + 1);
    else setDone(true);
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

  const DimCard = ({ dimKey }: { dimKey: DimKey }) => {
    const info = DIM_INFO[dimKey];
    const c = COLOR_MAP[info.color];
    const score = scores[dimKey];
    return (
      <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{info.emoji}</span>
            <span className={`font-semibold ${c.text}`}>{info.label[locale]}</span>
          </div>
          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{score}%</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{info.desc[locale]}</p>
        <div className="relative h-2 bg-gray-200 rounded-full mb-2">
          <div className={`absolute left-0 top-0 h-2 rounded-full transition-all ${c.bar}`} style={{ width: `${score}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{info.low[locale]}</span>
          <span>{info.high[locale]}</span>
        </div>
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
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-left">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIM_ORDER.map(d => {
              const info = DIM_INFO[d];
              const c = COLOR_MAP[info.color];
              return (
                <div key={d} className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                  <p className="text-lg mb-1">{info.emoji}</p>
                  <p className={`text-xs font-semibold ${c.text}`}>{info.label[locale]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{info.desc[locale]}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">{t.disclaimer}</p>
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
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t.yourProfile}</h1>
          <p className="text-gray-500 mt-1">{t.title}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DIM_ORDER.map(d => <DimCard key={d} dimKey={d} />)}
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
            {DIM_INFO[q.dim].emoji} {DIM_INFO[q.dim].label[locale]}
          </span>
        </div>
        <p className="text-gray-800 font-medium leading-relaxed">{q.text[locale]}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((val, idx) => {
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
