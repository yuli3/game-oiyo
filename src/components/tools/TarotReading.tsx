import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type Spread = 1 | 3 | 5;

interface TarotCard {
  id: number;
  symbol: string;
  name: Record<Locale, string>;
  upright: Record<Locale, string>;
  reversed: Record<Locale, string>;
  keywords: Record<Locale, string>;
}

const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 0, symbol: '🌀',
    name: { ko: '광대 (The Fool)', en: 'The Fool', ja: '愚者', fr: 'Le Mat', es: 'El Loco', zh: '愚者', },
    keywords: { ko: '새 출발·순수·모험', en: 'New beginnings · Innocence · Adventure', ja: '新たな始まり・純粋・冒険', fr: 'Nouveau départ · Innocence · Aventure', es: 'Nuevo comienzo · Inocencia · Aventura', zh: '新开始·纯真·冒险', },
    upright: { ko: '새로운 시작, 자유로운 정신, 무한한 가능성이 열려있습니다. 두려움 없이 앞으로 나아가세요.', en: 'A new journey begins. Embrace freedom and infinite possibility — step forward without fear.', ja: '新しい旅の始まり。恐れなく前に進み、無限の可能性を受け入れましょう。', fr: 'Un nouveau voyage commence. Avancez sans crainte et embrassez les possibilités infinies.', es: 'Un nuevo viaje comienza. Avanza sin miedo y abraza las posibilidades infinitas.', zh: '新旅程开始，无所畏惧地前进，接受无限可能。', },
    reversed: { ko: '경솔함, 무모한 결정에 주의하세요. 충동적인 행동은 예상치 못한 결과를 가져올 수 있습니다.', en: 'Recklessness may lead you astray. Pause before acting on impulse.', ja: '無謀さに注意。衝動的な行動は予期せぬ結果を招くかもしれません。', fr: "L'imprudence peut vous égarer. Faites une pause avant d'agir impulsivement.", es: 'La imprudencia puede desviarte. Pausa antes de actuar impulsivamente.', zh: '鲁莽可能导致偏差，在冲动行事前请停下来思考。', },
  },
  {
    id: 1, symbol: '🪄',
    name: { ko: '마법사 (The Magician)', en: 'The Magician', ja: '魔術師', fr: 'Le Bateleur', es: 'El Mago', zh: '魔術師', },
    keywords: { ko: '의지·창조·기술·행동', en: 'Will · Creation · Skill · Action', ja: '意志・創造・技術・行動', fr: 'Volonté · Création · Compétence · Action', es: 'Voluntad · Creación · Habilidad · Acción', zh: '意志·创造·技能·行动', },
    upright: { ko: '당신에게는 목표를 이룰 모든 자원이 있습니다. 집중하고 능력을 발휘하세요.', en: 'You have all the resources to achieve your goals. Focus your will and act with skill.', ja: '目標を達成するためのすべてのリソースがあります。意志を集中させ、能力を発揮しましょう。', fr: 'Vous avez toutes les ressources pour atteindre vos objectifs. Concentrez votre volonté et agissez.', es: 'Tienes todos los recursos para lograr tus metas. Concentra tu voluntad y actúa con habilidad.', zh: '您拥有实现目标的所有资源，集中意志并施展能力。', },
    reversed: { ko: '재능을 낭비하거나 조종당하고 있을 수 있습니다. 자신의 능력에 의구심이 생길 때입니다.', en: 'Talent may be wasted or manipulated. Question whether you are using your abilities well.', ja: '才能が無駄にされているか、操られているかもしれません。能力を活かせているか問い直しましょう。', fr: 'Votre talent peut être gaspillé ou manipulé. Remettez en question votre utilisation de vos capacités.', es: 'El talento puede ser desperdiciado o manipulado. Cuestiona si estás usando bien tus habilidades.', zh: '才能可能被浪费或受操纵，质疑自己是否善用能力。', },
  },
  {
    id: 2, symbol: '🌙',
    name: { ko: '여교황 (The High Priestess)', en: 'The High Priestess', ja: '女教皇', fr: 'La Papesse', es: 'La Sacerdotisa', zh: '女祭司', },
    keywords: { ko: '직관·신비·내면의 지혜', en: 'Intuition · Mystery · Inner wisdom', ja: '直感・神秘・内なる知恵', fr: 'Intuition · Mystère · Sagesse intérieure', es: 'Intuición · Misterio · Sabiduría interior', zh: '直觉·神秘·内在智慧', },
    upright: { ko: '내면의 목소리에 귀를 기울이세요. 직관이 최고의 안내자입니다.', en: 'Listen to your inner voice. Intuition is your greatest guide right now.', ja: '内なる声に耳を傾けましょう。直感が最高の案内者です。', fr: 'Écoutez votre voix intérieure. L\'intuition est votre meilleur guide.', es: 'Escucha tu voz interior. La intuición es tu mejor guía ahora mismo.', zh: '倾听您的内心声音，直觉现在是您最好的向导。', },
    reversed: { ko: '비밀이 숨겨져 있거나 직관을 무시하고 있습니다. 내면과 다시 연결하세요.', en: 'Secrets are hidden or you are ignoring your intuition. Reconnect with your inner self.', ja: '秘密が隠れているか、直感を無視しています。内なる自己と再接続しましょう。', fr: 'Des secrets sont cachés ou vous ignorez votre intuition. Reconnectez-vous à votre moi intérieur.', es: 'Hay secretos ocultos o estás ignorando tu intuición. Reconéctate con tu yo interior.', zh: '有秘密被隐藏或您在忽视直觉，重新与内在自我连结。', },
  },
  {
    id: 3, symbol: '🌸',
    name: { ko: '여황제 (The Empress)', en: 'The Empress', ja: '女帝', fr: "L'Impératrice", es: 'La Emperatriz', zh: '皇后', },
    keywords: { ko: '풍요·창조·자연·모성', en: 'Abundance · Creativity · Nature · Nurturing', ja: '豊かさ・創造・自然・母性', fr: 'Abondance · Créativité · Nature · Soin', es: 'Abundancia · Creatividad · Naturaleza · Cuidado', zh: '豐盛·創造·自然·養育', },
    upright: { ko: '풍요와 창의성이 넘치는 시기입니다. 자신을 돌보고 창조적 에너지를 펼치세요.', en: 'A time of abundance and creativity. Nurture yourself and let your creative energy bloom.', ja: '豊かさと創造性に満ちた時期です。自分を大切にし、創造的なエネルギーを発揮しましょう。', fr: "Une période d'abondance et de créativité. Prenez soin de vous et laissez votre énergie créative s'épanouir.", es: 'Un tiempo de abundancia y creatividad. Cuídate y deja que tu energía creativa florezca.', zh: '丰盛与创造力的时期，照顾好自己，让创造能量绽放。', },
    reversed: { ko: '자기 돌봄 부족, 창의적 막힘. 자신의 필요를 먼저 채우세요.', en: 'Self-neglect or creative blocks. Prioritize your own needs first.', ja: '自己ケアの不足や創造的な詰まり。まず自分のニーズを満たしましょう。', fr: 'Manque de soins pour soi ou blocages créatifs. Priorisez vos propres besoins.', es: 'Descuido propio o bloqueos creativos. Prioriza tus propias necesidades primero.', zh: '忽視自我照顧或創意阻塞，先滿足自身需求。', },
  },
  {
    id: 4, symbol: '👑',
    name: { ko: '황제 (The Emperor)', en: 'The Emperor', ja: '皇帝', fr: "L'Empereur", es: 'El Emperador', zh: '皇帝', },
    keywords: { ko: '권위·구조·안정·통제', en: 'Authority · Structure · Stability · Control', ja: '権威・構造・安定・制御', fr: 'Autorité · Structure · Stabilité · Contrôle', es: 'Autoridad · Estructura · Estabilidad · Control', zh: '权威·结构·稳定·掌控', },
    upright: { ko: '강한 리더십과 구조가 필요한 시기입니다. 규율과 통제로 안정을 구축하세요.', en: 'Strong leadership and structure are called for. Build stability through discipline and control.', ja: '強いリーダーシップと構造が必要な時期です。規律と制御で安定を構築しましょう。', fr: 'Un fort leadership et une structure sont nécessaires. Construisez la stabilité par la discipline.', es: 'Se requiere un liderazgo fuerte y estructura. Construye estabilidad a través de la disciplina.', zh: '需要强大的领导力和结构，通过纪律和控制建立稳定。', },
    reversed: { ko: '독재적이거나 지나치게 경직되어 있습니다. 유연성을 되찾고 통제욕을 내려놓으세요.', en: 'You may be too controlling or rigid. Loosen your grip and regain flexibility.', ja: '独裁的すぎるか、硬直しすぎています。柔軟性を取り戻し、支配欲を手放しましょう。', fr: 'Vous êtes peut-être trop contrôlant ou rigide. Desserrez votre emprise et retrouvez la flexibilité.', es: 'Puedes ser demasiado controlador o rígido. Suelta el control y recupera la flexibilidad.', zh: '可能过于控制或僵化，放松控制欲，找回灵活性。', },
  },
  {
    id: 5, symbol: '⛪',
    name: { ko: '교황 (The Hierophant)', en: 'The Hierophant', ja: '法王', fr: 'Le Pape', es: 'El Hierofante', zh: '教皇', },
    keywords: { ko: '전통·믿음·교육·관습', en: 'Tradition · Faith · Education · Convention', ja: '伝統・信仰・教育・慣習', fr: 'Tradition · Foi · Éducation · Convention', es: 'Tradición · Fe · Educación · Convención', zh: '传统·信仰·教育·惯例', },
    upright: { ko: '전통적인 가치와 제도적 지혜를 따르는 것이 도움이 됩니다. 멘토를 찾으세요.', en: 'Following tradition and institutional wisdom is helpful. Seek a mentor or trusted guide.', ja: '伝統的な価値観と制度的知恵に従うことが助けになります。メンターを見つけましょう。', fr: 'Suivre la tradition et la sagesse institutionnelle est utile. Cherchez un mentor.', es: 'Seguir la tradición y la sabiduría institucional es útil. Busca un mentor o guía de confianza.', zh: '遵循传统和机构智慧会有所助益，寻找导师。', },
    reversed: { ko: '기존 관습에 의문을 품고 있습니다. 독립적으로 생각하고 새로운 길을 탐색하세요.', en: 'You are questioning conventions. Think independently and explore unconventional paths.', ja: '既存の慣習に疑問を持っています。独立して考え、新しい道を探りましょう。', fr: 'Vous remettez en question les conventions. Pensez de manière indépendante.', es: 'Cuestionas las convenciones. Piensa de manera independiente y explora nuevos caminos.', zh: '您在质疑惯例，独立思考并探索非传统的道路。', },
  },
  {
    id: 6, symbol: '💞',
    name: { ko: '연인들 (The Lovers)', en: 'The Lovers', ja: '恋人', fr: 'Les Amoureux', es: 'Los Enamorados', zh: '戀人', },
    keywords: { ko: '사랑·선택·조화·가치', en: 'Love · Choice · Harmony · Values', ja: '愛・選択・調和・価値観', fr: 'Amour · Choix · Harmonie · Valeurs', es: 'Amor · Elección · Armonía · Valores', zh: '爱·选择·和谐·价值观', },
    upright: { ko: '중요한 선택의 순간입니다. 자신의 가치관에 맞는 선택을 하세요. 관계의 조화가 깊어집니다.', en: 'A pivotal choice is before you. Choose in alignment with your values. Relationships deepen in harmony.', ja: '重要な選択の瞬間です。自分の価値観に合った選択をしましょう。関係の調和が深まります。', fr: "Un choix crucial se présente. Choisissez en accord avec vos valeurs. L'harmonie dans les relations s'approfondit.", es: 'Una elección crucial está ante ti. Elige en alineación con tus valores. Las relaciones se profundizan en armonía.', zh: '面临重要选择，按照您的价值观做选择，关系中的和谐加深。', },
    reversed: { ko: '관계의 불균형이나 잘못된 선택. 내면의 갈등과 가치 충돌에 주의하세요.', en: 'Imbalance in relationships or a wrong choice. Address inner conflict and conflicting values.', ja: '関係の不均衡や誤った選択。内なる葛藤や価値の衝突に注意しましょう。', fr: 'Déséquilibre dans les relations ou mauvais choix. Adressez les conflits intérieurs.', es: 'Desequilibrio en relaciones o una mala elección. Aborda los conflictos internos y de valores.', zh: '关系不平衡或错误选择，注意内心冲突和价值观冲突。', },
  },
  {
    id: 7, symbol: '🏆',
    name: { ko: '전차 (The Chariot)', en: 'The Chariot', ja: '戦車', fr: 'Le Chariot', es: 'El Carro', zh: '戰車', },
    keywords: { ko: '승리·의지·통제·추진력', en: 'Victory · Will · Control · Drive', ja: '勝利・意志・制御・推進力', fr: 'Victoire · Volonté · Contrôle · Élan', es: 'Victoria · Voluntad · Control · Impulso', zh: '勝利·意志·控制·推進力', },
    upright: { ko: '강한 의지로 장애물을 극복하세요. 승리가 가까이 있습니다. 집중력을 유지하세요.', en: 'Overcome obstacles with strong will. Victory is near — maintain focus and drive.', ja: '強い意志で障害を乗り越えましょう。勝利は近い。集中力を維持してください。', fr: 'Surmontez les obstacles avec une forte volonté. La victoire est proche — gardez le cap.', es: 'Supera los obstáculos con fuerte voluntad. La victoria está cerca — mantén el enfoque.', zh: '以強大意志克服障礙，勝利即將到來，保持專注力。', },
    reversed: { ko: '방향을 잃거나 통제력을 상실하고 있습니다. 목표를 재정비하고 에너지를 모으세요.', en: 'Loss of direction or control. Regroup, set your goals clearly, and gather your energy.', ja: '方向感覚や制御を失っています。目標を再設定し、エネルギーを集めましょう。', fr: 'Perte de direction ou de contrôle. Regroupez-vous et rassemblez vos énergies.', es: 'Pérdida de dirección o control. Reagrúpate, define tus metas y reúne tu energía.', zh: '失去方向感或控制力，重新整理目标并聚集能量。', },
  },
  {
    id: 8, symbol: '🦁',
    name: { ko: '힘 (Strength)', en: 'Strength', ja: '力', fr: 'La Force', es: 'La Fuerza', zh: '力量', },
    keywords: { ko: '용기·인내·내면의 힘·연민', en: 'Courage · Patience · Inner strength · Compassion', ja: '勇気・忍耐・内なる力・思いやり', fr: 'Courage · Patience · Force intérieure · Compassion', es: 'Coraje · Paciencia · Fuerza interior · Compasión', zh: '勇氣·耐心·內在力量·慈悲', },
    upright: { ko: '온화한 힘으로 두려움을 극복하세요. 내면의 용기와 연민이 진정한 강함입니다.', en: 'Overcome fear with gentle strength. Your inner courage and compassion are your true power.', ja: '穏やかな力で恐れを乗り越えましょう。内なる勇気と思いやりが真の強さです。', fr: 'Surmontez la peur avec une force douce. Votre courage intérieur est votre vraie puissance.', es: 'Supera el miedo con fuerza gentil. Tu coraje interior y compasión son tu verdadero poder.', zh: '以溫柔的力量克服恐懼，內在的勇氣和慈悲是真正的力量。', },
    reversed: { ko: '자신감 부족이나 두려움에 압도되고 있습니다. 내면의 강함을 다시 찾으세요.', en: 'Lack of confidence or being overwhelmed by fear. Rediscover your inner strength.', ja: '自信不足や恐れに圧倒されています。内なる強さを再発見しましょう。', fr: 'Manque de confiance ou dépassé par la peur. Redécouvrez votre force intérieure.', es: 'Falta de confianza o abrumado por el miedo. Redescubre tu fuerza interior.', zh: '缺乏自信或被恐懼壓倒，重新找回內在力量。', },
  },
  {
    id: 9, symbol: '🏮',
    name: { ko: '은둔자 (The Hermit)', en: 'The Hermit', ja: '隠者', fr: "L'Hermite", es: 'El Ermitaño', zh: '隱士', },
    keywords: { ko: '성찰·고독·내면 탐구·지혜', en: 'Reflection · Solitude · Inner search · Wisdom', ja: '内省・孤独・内面探求・知恵', fr: 'Réflexion · Solitude · Recherche intérieure · Sagesse', es: 'Reflexión · Soledad · Búsqueda interior · Sabiduría', zh: '反思·孤独·内在探索·智慧', },
    upright: { ko: '홀로 내면을 탐구할 시간입니다. 고독 속에서 지혜를 찾으세요.', en: 'Time for inner exploration alone. Seek wisdom in solitude and quiet reflection.', ja: 'ひとりで内面を探求する時間です。孤独の中に知恵を見つけましょう。', fr: "Il est temps d'explorer votre intérieur seul(e). Cherchez la sagesse dans la solitude.", es: 'Es tiempo de exploración interior solo. Busca sabiduría en la soledad y la reflexión tranquila.', zh: '独自探索内心的时刻，在孤独中寻求智慧。', },
    reversed: { ko: '고립이 지나치거나 외로움을 느끼고 있습니다. 세상과 다시 연결될 시간입니다.', en: 'Too much isolation or loneliness. It is time to reconnect with the world.', ja: '孤立が過ぎるか、孤独を感じています。世界と再びつながる時間です。', fr: 'Trop d\'isolement ou solitude. Il est temps de se reconnecter avec le monde.', es: 'Demasiado aislamiento o soledad. Es tiempo de reconectarte con el mundo.', zh: '过于孤立或感到孤独，是时候重新与世界连结了。', },
  },
  {
    id: 10, symbol: '☸️',
    name: { ko: '운명의 수레바퀴 (Wheel of Fortune)', en: 'Wheel of Fortune', ja: '運命の輪', fr: 'La Roue de Fortune', es: 'La Rueda de la Fortuna', zh: '命運之輪', },
    keywords: { ko: '변화·운명·순환·전환점', en: 'Change · Destiny · Cycles · Turning point', ja: '変化・運命・循環・転換点', fr: 'Changement · Destin · Cycles · Tournant', es: 'Cambio · Destino · Ciclos · Punto de inflexión', zh: '变化·命运·循环·转折点', },
    upright: { ko: '운명이 당신 편입니다. 변화의 흐름을 받아들이고 기회를 잡으세요.', en: 'Fortune turns in your favor. Embrace the flow of change and seize the opportunity.', ja: '運命があなたの味方です。変化の流れを受け入れ、チャンスをつかみましょう。', fr: 'La fortune tourne en votre faveur. Embrassez le flux du changement et saisissez l\'opportunité.', es: 'La fortuna gira a tu favor. Abraza el flujo del cambio y aprovecha la oportunidad.', zh: '命运对您有利，接受变化的流动并抓住机会。', },
    reversed: { ko: '불운과 저항. 변화에 저항하지 말고 흐름에 맡기세요.', en: 'Bad luck or resistance to change. Stop resisting and go with the flow.', ja: '不運や変化への抵抗。変化に抵抗せず、流れに任せましょう。', fr: 'Malchance ou résistance au changement. Cessez de résister et suivez le courant.', es: 'Mala suerte o resistencia al cambio. Deja de resistir y fluye con la corriente.', zh: '運氣不佳或抵制變化，停止抵抗，順其自然。', },
  },
  {
    id: 11, symbol: '⚖️',
    name: { ko: '정의 (Justice)', en: 'Justice', ja: '正義', fr: 'La Justice', es: 'La Justicia', zh: '正義', },
    keywords: { ko: '공정·진실·균형·법', en: 'Fairness · Truth · Balance · Law', ja: '公正・真実・均衡・法', fr: 'Équité · Vérité · Équilibre · Loi', es: 'Equidad · Verdad · Equilibrio · Ley', zh: '公正·真相·平衡·法律', },
    upright: { ko: '공정한 결과가 기다리고 있습니다. 진실을 직면하고 균형을 찾으세요.', en: 'A fair outcome awaits. Face the truth and find balance in your actions.', ja: '公正な結果が待っています。真実に向き合い、行動のバランスを取りましょう。', fr: 'Un résultat équitable vous attend. Faites face à la vérité et trouvez l\'équilibre.', es: 'Un resultado justo te espera. Enfrenta la verdad y encuentra equilibrio en tus acciones.', zh: '公正的结果在等待，面对真相并在行动中找到平衡。', },
    reversed: { ko: '불공정하거나 편파적인 판단. 자신의 행동을 되돌아보세요.', en: 'Unfair or biased judgment. Reflect honestly on your own actions.', ja: '不公正または偏った判断。自分の行動を振り返りましょう。', fr: 'Jugement injuste ou partial. Réfléchissez honnêtement à vos propres actions.', es: 'Juicio injusto o parcial. Reflexiona honestamente sobre tus propias acciones.', zh: '不公正或偏颇的判断，诚实地反思自己的行为。', },
  },
  {
    id: 12, symbol: '🙃',
    name: { ko: '매달린 사람 (The Hanged Man)', en: 'The Hanged Man', ja: '吊るされた男', fr: 'Le Pendu', es: 'El Colgado', zh: '倒吊人', },
    keywords: { ko: '정지·희생·새로운 시각·명상', en: 'Pause · Sacrifice · New perspective · Surrender', ja: '停止・犠牲・新しい視点・瞑想', fr: 'Pause · Sacrifice · Nouvelle perspective · Méditation', es: 'Pausa · Sacrificio · Nueva perspectiva · Meditación', zh: '暫停·犧牲·新視角·冥想', },
    upright: { ko: '잠시 멈추고 다른 관점에서 바라보세요. 내려놓음이 새로운 길을 열어줍니다.', en: 'Pause and look from a different angle. Letting go opens new paths forward.', ja: '一時停止して別の視点から見てください。手放すことで新しい道が開けます。', fr: 'Faites une pause et regardez sous un angle différent. Lâcher prise ouvre de nouvelles voies.', es: 'Detente y mira desde un ángulo diferente. Soltar abre nuevos caminos.', zh: '暂停并从不同角度看问题，放手会开启新的道路。', },
    reversed: { ko: '희생을 거부하거나 정체되어 있습니다. 새로운 시각을 막는 것이 무엇인지 찾으세요.', en: 'Refusing sacrifice or feeling stagnant. Find what blocks your new perspective.', ja: '犠牲を拒否するか、停滞しています。新しい視点を妨げているものを見つけましょう。', fr: 'Refus du sacrifice ou stagnation. Trouvez ce qui bloque votre nouvelle perspective.', es: 'Rechazo al sacrificio o estancamiento. Encuentra qué bloquea tu nueva perspectiva.', zh: '拒絕犧牲或感到停滯，找出什麼在阻礙您的新視角。', },
  },
  {
    id: 13, symbol: '💀',
    name: { ko: '죽음 (Death)', en: 'Death', ja: '死神', fr: 'La Mort', es: 'La Muerte', zh: '死神', },
    keywords: { ko: '변환·끝·새로운 시작·해방', en: 'Transformation · Ending · New beginning · Release', ja: '変容・終わり・新しい始まり・解放', fr: 'Transformation · Fin · Nouveau départ · Libération', es: 'Transformación · Final · Nuevo comienzo · Liberación', zh: '转化·结束·新的开始·解放', },
    upright: { ko: '두려워하지 마세요. 이 변화는 낡은 것의 끝이자 새로운 시작입니다.', en: "Do not fear this card. It signals the end of the old and the beginning of the new — a necessary transformation.", ja: '恐れないでください。古いものの終わりであり、新しい始まりです — 必要な変容。', fr: "Ne craignez pas cette carte. C'est la fin de l'ancien et le début du nouveau — une transformation nécessaire.", es: 'No temas esta carta. Señala el fin de lo viejo y el inicio de lo nuevo — una transformación necesaria.', zh: '不要恐惧，这代表旧事物的结束和新事物的开始，是必要的转化。', },
    reversed: { ko: '변화를 거부하고 있습니다. 낡은 것을 붙잡는 것이 성장을 막고 있습니다.', en: 'You are resisting change. Clinging to the old is blocking your growth.', ja: '変化を拒否しています。古いものにしがみつくことが成長を妨げています。', fr: 'Vous résistez au changement. S\'accrocher à l\'ancien bloque votre croissance.', es: 'Estás resistiendo el cambio. Aferrarte a lo viejo está bloqueando tu crecimiento.', zh: '您在抵制变化，抓住旧事物正在阻碍您的成长。', },
  },
  {
    id: 14, symbol: '🌈',
    name: { ko: '절제 (Temperance)', en: 'Temperance', ja: '節制', fr: 'La Tempérance', es: 'La Templanza', zh: '節制', },
    keywords: { ko: '균형·절제·조화·치유', en: 'Balance · Moderation · Harmony · Healing', ja: 'バランス・節制・調和・癒し', fr: 'Équilibre · Modération · Harmonie · Guérison', es: 'Equilibrio · Moderación · Armonía · Curación', zh: '平衡·節制·和諧·療癒', },
    upright: { ko: '균형과 조화가 깃드는 시기입니다. 인내와 절제로 치유가 일어나고 있습니다.', en: 'A time of balance and harmony. Patience and moderation bring healing.', ja: 'バランスと調和の時期です。忍耐と節制が癒しをもたらします。', fr: "Une période d'équilibre et d'harmonie. La patience et la modération apportent la guérison.", es: 'Un tiempo de equilibrio y armonía. La paciencia y la moderación traen curación.', zh: '平衡与和谐的时期，耐心和节制带来疗愈。', },
    reversed: { ko: '불균형과 과잉. 지나침을 줄이고 다시 조화를 찾으세요.', en: 'Imbalance and excess. Reduce what is too much and seek harmony again.', ja: '不均衡と過剰。過度を減らし、再び調和を求めましょう。', fr: 'Déséquilibre et excès. Réduisez ce qui est trop et cherchez à nouveau l\'harmonie.', es: 'Desequilibrio y exceso. Reduce lo que es demasiado y busca la armonía de nuevo.', zh: '不平衡和过度，减少过多的东西并重新寻求和谐。', },
  },
  {
    id: 15, symbol: '😈',
    name: { ko: '악마 (The Devil)', en: 'The Devil', ja: '悪魔', fr: 'Le Diable', es: 'El Diablo', zh: '惡魔', },
    keywords: { ko: '속박·욕망·물질주의·중독', en: 'Bondage · Desire · Materialism · Addiction', ja: '束縛・欲望・物質主義・依存', fr: 'Asservissement · Désir · Matérialisme · Dépendance', es: 'Esclavitud · Deseo · Materialismo · Adicción', zh: '束縛·慾望·物質主義·成癮', },
    upright: { ko: '무언가에 얽매여 있습니다. 어떤 속박이 당신을 제한하는지 인식하세요.', en: 'You are bound to something. Recognize what is limiting or enslaving you.', ja: '何かに縛られています。何があなたを制限しているかを認識してください。', fr: 'Vous êtes lié(e) à quelque chose. Reconnaissez ce qui vous limite.', es: 'Estás atado/a a algo. Reconoce qué te está limitando.', zh: '您被某事束縛，認識什麼在限制或奴役您。', },
    reversed: { ko: '속박에서 벗어나고 있습니다. 해방의 힘을 느끼고 자유를 향해 나아가세요.', en: 'Breaking free from bondage. Feel the power of liberation and move toward freedom.', ja: '束縛から抜け出しています。解放の力を感じ、自由へ向かいましょう。', fr: 'Vous vous libérez de vos entraves. Ressentez le pouvoir de la libération.', es: 'Te estás liberando de la esclavitud. Siente el poder de la liberación y avanza hacia la libertad.', zh: '正在從束縛中解脫，感受解放的力量，向自由前進。', },
  },
  {
    id: 16, symbol: '⚡',
    name: { ko: '탑 (The Tower)', en: 'The Tower', ja: '塔', fr: 'La Tour', es: 'La Torre', zh: '高塔', },
    keywords: { ko: '붕괴·변혁·계시·혼란', en: 'Collapse · Revolution · Revelation · Chaos', ja: '崩壊・変革・啓示・混乱', fr: 'Effondrement · Révolution · Révélation · Chaos', es: 'Colapso · Revolución · Revelación · Caos', zh: '崩潰·變革·啟示·混亂', },
    upright: { ko: '갑작스러운 변화가 찾아옵니다. 무너지는 것은 새로운 것을 위한 공간을 만듭니다.', en: 'Sudden upheaval is coming. What collapses makes space for something new.', ja: '突然の変化がやってきます。崩れるものは新しいものへの空間を作ります。', fr: 'Un bouleversement soudain arrive. Ce qui s\'effondre fait place à quelque chose de nouveau.', es: 'Un trastorno repentino se avecina. Lo que colapsa hace espacio para algo nuevo.', zh: '突然的剧变即将到来，崩塌的东西为新事物创造空间。', },
    reversed: { ko: '재난을 피했지만 변화는 필요합니다. 미루지 말고 불필요한 것을 스스로 허물어뜨리세요.', en: 'Disaster averted, but change is still needed. Deconstruct the unnecessary yourself before it crumbles.', ja: '災害は避けられましたが、変化は必要です。崩れる前に不要なものを自ら壊してください。', fr: 'Le désastre est évité mais le changement reste nécessaire. Déconstruisez vous-même l\'inutile.', es: 'El desastre fue evitado pero el cambio sigue siendo necesario. Deconstruye lo innecesario tú mismo.', zh: '災難已避免，但仍需要變化，在崩塌之前自己拆除不必要的東西。', },
  },
  {
    id: 17, symbol: '⭐',
    name: { ko: '별 (The Star)', en: 'The Star', ja: '星', fr: "L'Étoile", es: 'La Estrella', zh: '星星', },
    keywords: { ko: '희망·영감·치유·축복', en: 'Hope · Inspiration · Healing · Blessings', ja: '希望・インスピレーション・癒し・祝福', fr: 'Espoir · Inspiration · Guérison · Bénédictions', es: 'Esperanza · Inspiración · Curación · Bendiciones', zh: '希望·灵感·疗愈·祝福', },
    upright: { ko: '희망과 치유의 빛이 비추고 있습니다. 꿈을 믿고 앞으로 나아가세요.', en: 'The light of hope and healing shines on you. Believe in your dreams and move forward.', ja: '希望と癒しの光が照らしています。夢を信じて前に進みましょう。', fr: "La lumière de l'espoir et de la guérison brille sur vous. Croyez en vos rêves et avancez.", es: 'La luz de la esperanza y la curación brilla sobre ti. Cree en tus sueños y avanza.', zh: '希望与疗愈的光芒照耀着您，相信您的梦想并前进。', },
    reversed: { ko: '희망을 잃거나 영감이 고갈되었습니다. 작은 긍정에 집중하고 서서히 회복하세요.', en: 'Loss of hope or dried inspiration. Focus on small positives and recover gradually.', ja: '希望を失うか、インスピレーションが枯れています。小さなポジティブに集中し、徐々に回復しましょう。', fr: "Perte d'espoir ou inspiration tarie. Concentrez-vous sur les petites choses positives.", es: 'Pérdida de esperanza o inspiración agotada. Enfócate en pequeñas cosas positivas y recupérate gradualmente.', zh: '失去希望或灵感枯竭，专注于小的积极事物并逐渐恢复。', },
  },
  {
    id: 18, symbol: '🌑',
    name: { ko: '달 (The Moon)', en: 'The Moon', ja: '月', fr: 'La Lune', es: 'La Luna', zh: '月亮', },
    keywords: { ko: '환상·두려움·잠재의식·불확실', en: 'Illusion · Fear · Subconscious · Uncertainty', ja: '幻想・恐れ・潜在意識・不確かさ', fr: 'Illusion · Peur · Subconscient · Incertitude', es: 'Ilusión · Miedo · Subconsciente · Incertidumbre', zh: '幻觉·恐惧·潜意识·不确定', },
    upright: { ko: '잠재의식의 두려움과 환상이 현실을 흐리고 있습니다. 직관을 믿되 실제를 직시하세요.', en: 'Subconscious fears and illusions cloud reality. Trust intuition but face what is real.', ja: '潜在意識の恐れと幻想が現実を曇らせています。直感を信じながら現実を見据えましょう。', fr: "Les peurs du subconscient et les illusions brouillent la réalité. Faites confiance à votre intuition mais regardez en face ce qui est réel.", es: 'Los miedos subconscientes y las ilusiones nublan la realidad. Confía en tu intuición pero enfrenta lo real.', zh: '潜意识的恐惧和幻觉模糊了现实，相信直觉但面对真实。', },
    reversed: { ko: '혼란과 두려움이 걷히고 있습니다. 진실이 드러나고 명확성이 찾아오고 있습니다.', en: 'Confusion and fear are lifting. Truth emerges and clarity is coming.', ja: '混乱と恐れが晴れてきています。真実が明らかになり、明確さが訪れています。', fr: 'La confusion et la peur se dissipent. La vérité émerge et la clarté arrive.', es: 'La confusión y el miedo se disipan. La verdad emerge y la claridad llega.', zh: '混亂和恐懼正在消散，真相浮現，清晰正在到來。', },
  },
  {
    id: 19, symbol: '☀️',
    name: { ko: '태양 (The Sun)', en: 'The Sun', ja: '太陽', fr: 'Le Soleil', es: 'El Sol', zh: '太陽', },
    keywords: { ko: '기쁨·성공·활력·긍정', en: 'Joy · Success · Vitality · Positivity', ja: '喜び・成功・活力・ポジティブ', fr: 'Joie · Succès · Vitalité · Positivité', es: 'Alegría · Éxito · Vitalidad · Positividad', zh: '喜悅·成功·活力·正面', },
    upright: { ko: '최고의 카드 중 하나입니다. 기쁨, 성공, 활력이 넘칩니다. 빛나는 시기가 왔습니다.', en: 'One of the best cards. Joy, success, and vitality overflow. Your time to shine has come.', ja: '最高のカードの一つです。喜び、成功、活力が溢れます。輝く時がやってきました。', fr: "L'une des meilleures cartes. Joie, succès et vitalité débordent. Votre moment de briller est arrivé.", es: 'Una de las mejores cartas. Alegría, éxito y vitalidad desbordan. Tu momento de brillar ha llegado.', zh: '最好的牌之一，喜悦、成功和活力满溢，您发光的时刻到来了。', },
    reversed: { ko: '일시적인 어둠이나 낙관주의 과잉. 내면의 빛은 사라지지 않습니다.', en: 'Temporary darkness or excessive optimism. Your inner light has not disappeared.', ja: '一時的な暗さや過度な楽観主義。内なる光は消えていません。', fr: 'Obscurité temporaire ou optimisme excessif. Votre lumière intérieure ne s\'est pas éteinte.', es: 'Oscuridad temporal u optimismo excesivo. Tu luz interior no ha desaparecido.', zh: '暂时的黑暗或过度乐观，您的内在之光没有消失。', },
  },
  {
    id: 20, symbol: '📯',
    name: { ko: '심판 (Judgement)', en: 'Judgement', ja: '審判', fr: 'Le Jugement', es: 'El Juicio', zh: '審判', },
    keywords: { ko: '각성·부활·용서·변혁', en: 'Awakening · Rebirth · Forgiveness · Transformation', ja: '覚醒・再生・許し・変革', fr: 'Éveil · Résurrection · Pardon · Transformation', es: 'Despertar · Renacimiento · Perdón · Transformación', zh: '觉醒·重生·宽恕·转化', },
    upright: { ko: '새로운 각성의 순간입니다. 과거를 용서하고 더 높은 부름에 응답하세요.', en: 'A moment of awakening. Forgive the past and answer a higher calling.', ja: '新しい覚醒の瞬間です。過去を許し、より高い使命に応えましょう。', fr: "Un moment d'éveil. Pardonnez le passé et répondez à un appel plus élevé.", es: 'Un momento de despertar. Perdona el pasado y responde a un llamado más alto.', zh: '觉醒的时刻，原谅过去并回应更高的召唤。', },
    reversed: { ko: '자기 비판이나 과거에 매여 있습니다. 자신을 용서하고 앞으로 나아가세요.', en: 'Self-judgment or stuck in the past. Forgive yourself and move forward.', ja: '自己批判や過去に縛られています。自分を許し、前に進みましょう。', fr: 'Jugement de soi ou coincé(e) dans le passé. Pardonnez-vous et avancez.', es: 'Autojuicio o atascado en el pasado. Perdónate a ti mismo y avanza.', zh: '自我评判或困在过去，原谅自己并向前迈进。', },
  },
  {
    id: 21, symbol: '🌐',
    name: { ko: '세계 (The World)', en: 'The World', ja: '世界', fr: 'Le Monde', es: 'El Mundo', zh: '世界', },
    keywords: { ko: '완성·성취·통합·여행', en: 'Completion · Achievement · Integration · Journey', ja: '完成・達成・統合・旅', fr: 'Achèvement · Accomplissement · Intégration · Voyage', es: 'Completitud · Logro · Integración · Viaje', zh: '完成·成就·整合·旅程', },
    upright: { ko: '최고의 성취와 완성의 카드입니다. 하나의 사이클이 완성되고 새로운 장이 열립니다.', en: 'The card of ultimate achievement. A cycle completes and a new chapter begins.', ja: '最高の達成と完成のカードです。一つのサイクルが完成し、新しい章が始まります。', fr: "La carte du plus grand accomplissement. Un cycle se complète et un nouveau chapitre s'ouvre.", es: 'La carta del mayor logro. Un ciclo se completa y un nuevo capítulo comienza.', zh: '终极成就与完成之牌，一个循环结束，新的篇章开始。', },
    reversed: { ko: '거의 완성에 다가왔지만 마지막 단계가 남아 있습니다. 포기하지 마세요.', en: 'Near completion but the final step remains. Do not give up now.', ja: 'ほぼ完成に近づいていますが、最後のステップが残っています。諦めないでください。', fr: 'Presque achevé mais une dernière étape reste. Ne renoncez pas maintenant.', es: 'Casi completo pero el paso final queda. No te rindas ahora.', zh: '接近完成但最後一步仍在，現在不要放棄。', },
  },
];

const SPREAD_LABELS: Record<Spread, Record<Locale, string[]>> = {
  1: {
    ko: ['오늘의 메시지'],
    en: ["Today's Message"],
    ja: ['今日のメッセージ'],
    fr: ["Message du jour"],
    es: ["Mensaje de hoy"],
    zh: ['今日訊息'],
  },
  3: {
    ko: ['과거', '현재', '미래'],
    en: ['Past', 'Present', 'Future'],
    ja: ['過去', '現在', '未来'],
    fr: ['Passé', 'Présent', 'Futur'],
    es: ['Pasado', 'Presente', 'Futuro'],
    zh: ['过去', '现在', '未来'],
  },
  5: {
    ko: ['상황', '도전', '과거', '미래', '결과'],
    en: ['Situation', 'Challenge', 'Past', 'Future', 'Outcome'],
    ja: ['状況', '課題', '過去', '未来', '結果'],
    fr: ['Situation', 'Défi', 'Passé', 'Futur', 'Résultat'],
    es: ['Situación', 'Desafío', 'Pasado', 'Futuro', 'Resultado'],
    zh: ['当前情况', '挑战', '过去', '未来', '结果'],
  },
};

const L: Record<Locale, {
  title: string; subtitle: string;
  spreadLabel: string; drawBtn: string; redrawBtn: string;
  uprightLabel: string; reversedLabel: string;
  disclaimer: string;
  spreads: Record<Spread, string>;
}> = {
  ko: {
    title: '타로 카드 리딩', subtitle: '오늘의 메시지를 카드에서 읽어보세요',
    spreadLabel: '스프레드 선택',
    drawBtn: '카드 뽑기', redrawBtn: '다시 뽑기',
    uprightLabel: '정방향', reversedLabel: '역방향',
    disclaimer: '타로는 오락 및 자기 성찰 목적으로 제작되었으며 미래를 예측하지 않습니다.',
    spreads: { 1: '1장 — 오늘의 메시지', 3: '3장 — 과거·현재·미래', 5: '5장 — 켈틱 크로스' },
  },
  en: {
    title: 'Tarot Card Reading', subtitle: 'Draw cards and receive your message',
    spreadLabel: 'Choose Spread',
    drawBtn: 'Draw Cards', redrawBtn: 'Draw Again',
    uprightLabel: 'Upright', reversedLabel: 'Reversed',
    disclaimer: 'Tarot is for entertainment and self-reflection only, and does not predict the future.',
    spreads: { 1: '1 Card — Daily Message', 3: '3 Cards — Past · Present · Future', 5: '5 Cards — Celtic Cross' },
  },
  ja: {
    title: 'タロット占い', subtitle: 'カードから今日のメッセージを読み取りましょう',
    spreadLabel: 'スプレッドを選択',
    drawBtn: 'カードを引く', redrawBtn: '引き直す',
    uprightLabel: '正位置', reversedLabel: '逆位置',
    disclaimer: 'タロットはエンターテインメントと自己内省を目的としており、未来を予言するものではありません。',
    spreads: { 1: '1枚 — 今日のメッセージ', 3: '3枚 — 過去・現在・未来', 5: '5枚 — ケルト十字' },
  },
  fr: {
    title: 'Tirage de Tarot', subtitle: 'Tirez des cartes et recevez votre message',
    spreadLabel: 'Choisir le tirage',
    drawBtn: 'Tirer les cartes', redrawBtn: 'Retirer',
    uprightLabel: 'Droit', reversedLabel: 'Renversé',
    disclaimer: "Le tarot est uniquement pour le divertissement et la réflexion personnelle, et ne prédit pas l'avenir.",
    spreads: { 1: '1 Carte — Message du jour', 3: '3 Cartes — Passé · Présent · Futur', 5: '5 Cartes — Croix celtique' },
  },
  es: {
    title: 'Lectura de Tarot', subtitle: 'Saca cartas y recibe tu mensaje',
    spreadLabel: 'Elegir tirada',
    drawBtn: 'Sacar cartas', redrawBtn: 'Sacar de nuevo',
    uprightLabel: 'Derecha', reversedLabel: 'Invertida',
    disclaimer: 'El tarot es solo para entretenimiento y reflexión personal, y no predice el futuro.',
    spreads: { 1: '1 Carta — Mensaje del día', 3: '3 Cartas — Pasado · Presente · Futuro', 5: '5 Cartas — Cruz celta' },
  },
  zh: {
    title: '塔罗牌占卜', subtitle: '抽牌并接收您的信息',
    spreadLabel: '选择牌阵',
    drawBtn: '抽牌', redrawBtn: '重新抽牌',
    uprightLabel: '正位', reversedLabel: '逆位',
    disclaimer: '塔罗牌仅用于娱乐和自我反思，并不能预测未来。',
    spreads: { 1: '1张 — 今日信息', 3: '3张 — 过去·现在·未来', 5: '5张 — 凯尔特十字' },
  },
};

interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
  position: string;
}

function drawCards(count: number, positionLabels: string[]): DrawnCard[] {
  const shuffled = [...MAJOR_ARCANA].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((card, i) => ({
    card,
    reversed: Math.random() < 0.3,
    position: positionLabels[i] ?? '',
  }));
}

export default function TarotReading({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;
  const [spread, setSpread] = useState<Spread>(1);
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  function handleDraw() {
    const labels = SPREAD_LABELS[spread][locale];
    setDrawn(drawCards(spread, labels));
    setFlipped(new Set());
  }

  function flipCard(idx: number) {
    setFlipped(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }

  const spreadBtnClass = (s: Spread) =>
    `flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
      spread === s
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Spread selector */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">{t.spreadLabel}</p>
        <div className="flex gap-2 flex-wrap">
          {([1, 3, 5] as Spread[]).map(s => (
            <button key={s} onClick={() => { setSpread(s); setDrawn(null); }} className={spreadBtnClass(s)}>
              {t.spreads[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Draw button */}
      <button
        onClick={handleDraw}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
      >
        {drawn ? t.redrawBtn : t.drawBtn}
      </button>

      {/* Cards */}
      {drawn && (
        <div className={`grid gap-4 ${drawn.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : drawn.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {drawn.map((dc, i) => {
            const isFlipped = flipped.has(i);
            return (
              <div key={i} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-center text-indigo-600">{dc.position}</p>
                {/* Card face */}
                <button
                  onClick={() => flipCard(i)}
                  className={`w-full aspect-[2/3] rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${
                    isFlipped
                      ? 'bg-white border-indigo-300 shadow-md'
                      : 'bg-indigo-700 border-indigo-800 hover:bg-indigo-600'
                  }`}
                >
                  {isFlipped ? (
                    <div className={`flex flex-col items-center gap-1 p-3 ${dc.reversed ? 'rotate-180' : ''}`}>
                      <span className="text-3xl sm:text-4xl">{dc.card.symbol}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-800 text-center leading-tight">
                        {dc.card.name[locale]}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                        dc.reversed ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {dc.reversed ? t.reversedLabel : t.uprightLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl opacity-40">✦</span>
                  )}
                </button>
                {/* Interpretation */}
                {isFlipped && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-500">{dc.card.keywords[locale]}</p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {dc.reversed ? dc.card.reversed[locale] : dc.card.upright[locale]}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {drawn && flipped.size < drawn.length && (
        <p className="text-center text-sm text-gray-400">
          {locale === 'ko' ? '카드를 탭해서 뒤집으세요' :
           locale === 'ja' ? 'カードをタップして裏返しましょう' :
           locale === 'fr' ? 'Tapez sur une carte pour la retourner' :
           locale === 'es' ? 'Toca una carta para voltearla' :
           locale === 'zh' ? '点击牌面翻开卡牌' :
           'Tap a card to reveal it'}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>
    </div>
  );
}
