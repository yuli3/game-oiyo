import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

type MbtiType = 'INTJ'|'INTP'|'ENTJ'|'ENTP'|'INFJ'|'INFP'|'ENFJ'|'ENFP'|'ISTJ'|'ISFJ'|'ESTJ'|'ESFJ'|'ISTP'|'ISFP'|'ESTP'|'ESFP';

interface StressProfile {
  stressTriggers: Record<Locale, string[]>;
  stressSigns: Record<Locale, string[]>;
  reliefMethods: Record<Locale, string[]>;
  quote: Record<Locale, string>;
  color: string;
  badge: string;
}

const STRESS_PROFILES: Record<MbtiType, StressProfile> = {
  INTJ: {
    stressTriggers: {
      ko: ['비효율적인 절차', '목표 없는 반복 작업', '지나친 사교 강요', '통제력 상실'],
      en: ['Inefficient processes', 'Repetitive mindless tasks', 'Forced socializing', 'Loss of control'],
      ja: ['非効率な手続き', '目標のない繰り返し作業', '過度な交流の強要', '制御の喪失'],
      fr: ['Processus inefficaces', 'Tâches répétitives', 'Sociabilité forcée', 'Perte de contrôle'],
      es: ['Procesos ineficientes', 'Tareas repetitivas', 'Socialización forzada', 'Pérdida de control'],
      zh: ['低效流程', '无目标重复工作', '被迫社交', '失去控制'],
    },
    stressSigns: {
      ko: ['냉소적 발언 증가', '완벽주의 극단화', '타인 회피', '불면증'],
      en: ['Increased cynicism', 'Extreme perfectionism', 'Withdrawing from others', 'Insomnia'],
      ja: ['皮肉な発言の増加', '完璧主義の極端化', '他者の回避', '不眠'],
      fr: ['Cynisme accru', 'Perfectionnisme extrême', 'Retrait social', 'Insomnie'],
      es: ['Mayor cinismo', 'Perfeccionismo extremo', 'Aislamiento', 'Insomnio'],
      zh: ['增加諷刺言論', '極端完美主義', '迴避他人', '失眠'],
    },
    reliefMethods: {
      ko: ['혼자만의 전략 기획 시간', '복잡한 퍼즐이나 문제 풀기', '장기 목표 재정립', '독서나 연구'],
      en: ['Solo strategic planning time', 'Complex puzzles or problems', 'Resetting long-term goals', 'Reading or research'],
      ja: ['一人で戦略を練る時間', '複雑なパズルや問題解決', '長期目標の再設定', '読書や研究'],
      fr: ['Temps seul pour planifier', 'Puzzles complexes', 'Redéfinir les objectifs', 'Lecture ou recherche'],
      es: ['Tiempo de planificación solo', 'Puzzles complejos', 'Redefinir metas', 'Lectura o investigación'],
      zh: ['独自战略规划时间', '解复杂谜题', '重设长期目标', '阅读或研究'],
    },
    quote: {
      ko: '혼자 있는 시간이 당신을 재충전시킵니다. 계획을 세우고 목표를 다듬는 것이 최고의 스트레스 해소제입니다.',
      en: 'Solitude recharges you. Planning and refining goals is your ultimate stress relief.',
      ja: '一人の時間があなたを充電します。計画を立て、目標を磨くことが最高のストレス解消です。',
      fr: 'La solitude vous ressource. Planifier et affiner vos objectifs est votre meilleur remède au stress.',
      es: 'La soledad te recarga. Planificar y refinar metas es tu mejor alivio del estrés.',
      zh: '独处时间让你恢复能量。制定计划和完善目标是你最好的压力解法。',
    },
    color: 'indigo',
    badge: '🏰',
  },
  INTP: {
    stressTriggers: {
      ko: ['감정적 충돌', '마감 압박', '세부사항 집착', '관료적 규칙'],
      en: ['Emotional conflicts', 'Deadline pressure', 'Attention to trivial details', 'Bureaucratic rules'],
      ja: ['感情的な衝突', '締め切りプレッシャー', '細部へのこだわり', '官僚的ルール'],
      fr: ['Conflits émotionnels', 'Pression des délais', 'Détails insignifiants', 'Règles bureaucratiques'],
      es: ['Conflictos emocionales', 'Presión de plazos', 'Detalles triviales', 'Reglas burocráticas'],
      zh: ['情感冲突', '截止日期压力', '琐碎细节', '官僚规则'],
    },
    stressSigns: {
      ko: ['과도한 분석', '우유부단함', '냉담한 태도', '멍하게 앉아있기'],
      en: ['Over-analysis paralysis', 'Indecisiveness', 'Emotional detachment', 'Staring blankly'],
      ja: ['過剰な分析', '優柔不断', '感情的距離', 'ぼんやりする'],
      fr: ['Sur-analyse', 'Indécision', 'Détachement émotionnel', 'Regard vide'],
      es: ['Sobre-análisis', 'Indecisión', 'Desapego emocional', 'Mirada perdida'],
      zh: ['过度分析', '优柔寡断', '情感疏离', '发呆'],
    },
    reliefMethods: {
      ko: ['새로운 이론 탐구', '코딩이나 창작 활동', '혼자 산책', '유머로 상황 전환'],
      en: ['Exploring new theories', 'Coding or creative projects', 'Solo walks', 'Humor to reframe situations'],
      ja: ['新しい理論の探求', 'コーディングや創作', '一人での散歩', 'ユーモアで状況を転換'],
      fr: ['Explorer de nouvelles théories', 'Codage ou création', 'Promenades solitaires', 'Humour'],
      es: ['Explorar nuevas teorías', 'Programar o crear', 'Paseos solos', 'Humor'],
      zh: ['探索新理论', '编程或创作', '独自散步', '用幽默转换情境'],
    },
    quote: {
      ko: '관심 있는 주제에 깊이 파고들 때 당신은 스트레스를 잊습니다. 지적 탐구가 당신의 휴식입니다.',
      en: 'Deep diving into an interesting topic makes you forget stress. Intellectual exploration is your rest.',
      ja: '興味あるテーマに深く入り込むとストレスを忘れます。知的探求があなたの休息です。',
      fr: "S'immerger dans un sujet vous fait oublier le stress. L'exploration intellectuelle est votre repos.",
      es: 'Profundizar en un tema interesante te hace olvidar el estrés. La exploración intelectual es tu descanso.',
      zh: '深入研究有趣主题时，你会忘记压力。智识探索是你的休息。',
    },
    color: 'cyan',
    badge: '🔭',
  },
  ENTJ: {
    stressTriggers: {
      ko: ['무능한 팀원', '느린 의사결정', '목표 없는 회의', '권한 침해'],
      en: ['Incompetent teammates', 'Slow decision-making', 'Pointless meetings', 'Authority undermined'],
      ja: ['無能なチームメンバー', '遅い意思決定', '目的のない会議', '権威の侵害'],
      fr: ['Coéquipiers incompétents', 'Prise de décision lente', 'Réunions inutiles', 'Autorité bafouée'],
      es: ['Compañeros incompetentes', 'Decisiones lentas', 'Reuniones inútiles', 'Autoridad socavada'],
      zh: ['無能的團隊成員', '緩慢的決策', '無意義的會議', '權威被侵犯'],
    },
    stressSigns: {
      ko: ['독재적 태도', '폭발적 분노', '수면 감소', '지나친 업무 집중'],
      en: ['Dictatorial behavior', 'Explosive anger', 'Sleep reduction', 'Overworking'],
      ja: ['独裁的な態度', '爆発的な怒り', '睡眠減少', '過度な仕事集中'],
      fr: ['Comportement dictatorial', 'Colère explosive', 'Manque de sommeil', 'Surmenage'],
      es: ['Comportamiento dictatorial', 'Ira explosiva', 'Falta de sueño', 'Exceso de trabajo'],
      zh: ['独裁态度', '爆炸性愤怒', '睡眠减少', '过度工作'],
    },
    reliefMethods: {
      ko: ['운동과 신체 활동', '새로운 목표 설정', '전략 게임', '짧은 혼자만의 시간'],
      en: ['Physical exercise', 'Setting new goals', 'Strategy games', 'Brief solo time'],
      ja: ['運動や身体活動', '新しい目標設定', 'ストラテジーゲーム', '短い一人時間'],
      fr: ['Exercice physique', 'Fixer de nouveaux objectifs', 'Jeux de stratégie', 'Temps seul'],
      es: ['Ejercicio físico', 'Establecer nuevas metas', 'Juegos de estrategia', 'Tiempo solo'],
      zh: ['体育锻炼', '设定新目标', '策略游戏', '短暂独处时间'],
    },
    quote: {
      ko: '목표가 있을 때 당신은 빛납니다. 새로운 도전을 찾고 통제감을 회복하는 것이 핵심입니다.',
      en: 'You shine when you have goals. Finding new challenges and regaining control is key for you.',
      ja: '目標があるときあなたは輝きます。新しい挑戦を見つけ、コントロールを取り戻すことが鍵です。',
      fr: 'Vous brillez quand vous avez des objectifs. Trouver de nouveaux défis et reprendre le contrôle est essentiel.',
      es: 'Brillas cuando tienes metas. Encontrar nuevos desafíos y recuperar el control es clave para ti.',
      zh: '有目标时你才光彩夺目。寻找新挑战、恢复控制感是关键。',
    },
    color: 'orange',
    badge: '⚡',
  },
  ENTP: {
    stressTriggers: {
      ko: ['반복적인 루틴', '창의성 억압', '세부 행정 업무', '비판 없는 동의'],
      en: ['Repetitive routines', 'Suppressed creativity', 'Administrative details', 'Uncritical agreement'],
      ja: ['繰り返しのルーティン', '創造性の抑圧', '細かい管理業務', '批判なき同意'],
      fr: ['Routines répétitives', 'Créativité réprimée', 'Détails administratifs', 'Accord aveugle'],
      es: ['Rutinas repetitivas', 'Creatividad suprimida', 'Detalles administrativos', 'Acuerdo sin crítica'],
      zh: ['重复性日常', '创意受压制', '行政琐事', '无批判性同意'],
    },
    stressSigns: {
      ko: ['논쟁적 행동 증가', '시작만 하고 완성 못 함', '과도한 아이디어', '집중력 저하'],
      en: ['Increased arguing', 'Starting without finishing', 'Idea overload', 'Difficulty focusing'],
      ja: ['議論的行動の増加', '始めても完成しない', 'アイデア過多', '集中力低下'],
      fr: ['Comportement argumentatif', 'Projets inachevés', 'Surcharge d\'idées', 'Difficultés de concentration'],
      es: ['Mayor argumentación', 'Empezar sin terminar', 'Sobrecarga de ideas', 'Dificultad para concentrarse'],
      zh: ['增加争论行为', '有始无终', '想法过多', '注意力下降'],
    },
    reliefMethods: {
      ko: ['브레인스토밍 세션', '새로운 사람과 대화', '도전적인 토론', '여행이나 새로운 경험'],
      en: ['Brainstorming sessions', 'Talking to new people', 'Stimulating debates', 'Travel or new experiences'],
      ja: ['ブレインストーミング', '新しい人との会話', '刺激的な議論', '旅行や新しい体験'],
      fr: ['Sessions de brainstorming', 'Parler à de nouvelles personnes', 'Débats stimulants', 'Voyages'],
      es: ['Sesiones de brainstorming', 'Hablar con personas nuevas', 'Debates estimulantes', 'Viajes'],
      zh: ['脑力激荡', '与新朋友交谈', '刺激性辩论', '旅行或新体验'],
    },
    quote: {
      ko: '새로운 아이디어와 토론이 당신의 에너지원입니다. 지루함이 가장 큰 적임을 기억하세요.',
      en: 'New ideas and debate are your energy source. Remember that boredom is your biggest enemy.',
      ja: '新しいアイデアと議論があなたのエネルギー源です。退屈が最大の敵であることを覚えておいてください。',
      fr: 'Les nouvelles idées et les débats sont votre source d\'énergie. L\'ennui est votre pire ennemi.',
      es: 'Las nuevas ideas y los debates son tu fuente de energía. Recuerda que el aburrimiento es tu peor enemigo.',
      zh: '新想法和辩论是你的能量来源。记住无聊是你最大的敌人。',
    },
    color: 'yellow',
    badge: '💡',
  },
  INFJ: {
    stressTriggers: {
      ko: ['가치관 충돌', '표면적 관계', '과도한 업무량', '장기 비전 방해'],
      en: ['Value conflicts', 'Shallow relationships', 'Overwhelming workload', 'Long-term vision blocked'],
      ja: ['価値観の衝突', '表面的な関係', '過剰な業務量', '長期ビジョンの妨害'],
      fr: ['Conflits de valeurs', 'Relations superficielles', 'Surcharge de travail', 'Vision bloquée'],
      es: ['Conflictos de valores', 'Relaciones superficiales', 'Sobrecarga de trabajo', 'Visión bloqueada'],
      zh: ['价值观冲突', '表面关系', '工作过量', '长期愿景受阻'],
    },
    stressSigns: {
      ko: ['극단적 완벽주의', '감정 과부하', '육체적 피로', '비판에 과민 반응'],
      en: ['Extreme perfectionism', 'Emotional overwhelm', 'Physical exhaustion', 'Over-sensitivity to criticism'],
      ja: ['極端な完璧主義', '感情的過負荷', '身体的疲労', '批判への過敏反応'],
      fr: ['Perfectionnisme extrême', 'Surcharge émotionnelle', 'Épuisement physique', 'Hypersensibilité'],
      es: ['Perfeccionismo extremo', 'Sobrecarga emocional', 'Agotamiento físico', 'Hipersensibilidad'],
      zh: ['极端完美主义', '情感过载', '身体疲惫', '对批评过度敏感'],
    },
    reliefMethods: {
      ko: ['혼자만의 조용한 시간', '의미 있는 글쓰기', '자연 산책', '신뢰하는 사람과 깊은 대화'],
      en: ['Quiet alone time', 'Meaningful writing', 'Nature walks', 'Deep conversation with trusted friends'],
      ja: ['静かな一人の時間', '意味のある文章', '自然の散歩', '信頼できる人との深い会話'],
      fr: ['Temps seul et calme', 'Écriture significative', 'Promenades nature', 'Conversation profonde avec un ami'],
      es: ['Tiempo tranquilo solo', 'Escritura significativa', 'Paseos por la naturaleza', 'Conversación profunda'],
      zh: ['安静独处时间', '有意义的写作', '自然散步', '与可信赖者深谈'],
    },
    quote: {
      ko: '당신은 깊은 의미와 연결에서 힘을 얻습니다. 혼자만의 성찰 시간이 반드시 필요합니다.',
      en: 'You draw strength from deep meaning and connection. Solitary reflection time is essential for you.',
      ja: '深い意味とつながりから力を得ます。一人での内省の時間は必須です。',
      fr: 'Vous puisez votre force dans le sens profond et la connexion. Le temps de réflexion solitaire est essentiel.',
      es: 'Te fortaleces con el significado profundo y la conexión. El tiempo de reflexión solitaria es esencial.',
      zh: '你从深刻的意义和连结中汲取力量。独自反思的时间不可或缺。',
    },
    color: 'violet',
    badge: '🌊',
  },
  INFP: {
    stressTriggers: {
      ko: ['가치관 타협', '비판적 환경', '과도한 규칙', '감정 무시'],
      en: ['Value compromises', 'Critical environment', 'Too many rules', 'Emotions ignored'],
      ja: ['価値観の妥協', '批判的な環境', '過多なルール', '感情を無視される'],
      fr: ['Compromettre ses valeurs', 'Environnement critique', 'Trop de règles', 'Émotions ignorées'],
      es: ['Compromiso de valores', 'Ambiente crítico', 'Demasiadas reglas', 'Emociones ignoradas'],
      zh: ['妥协价值观', '批评性环境', '规则过多', '情感被忽视'],
    },
    stressSigns: {
      ko: ['감정 폭발 후 후회', '자기비판 증가', '현실 도피', '자기 고립'],
      en: ['Emotional outburst then regret', 'Increased self-criticism', 'Escapism', 'Self-isolation'],
      ja: ['感情爆発後の後悔', '自己批判の増加', '現実逃避', '自己孤立'],
      fr: ['Explosion émotionnelle puis regrets', 'Autocritique accrue', 'Évasion', 'Isolement'],
      es: ['Explosión emocional luego arrepentimiento', 'Mayor autocrítica', 'Escapismo', 'Aislamiento'],
      zh: ['情感爆發後後悔', '增加自我批評', '逃避現實', '自我孤立'],
    },
    reliefMethods: {
      ko: ['창작 활동 (글쓰기, 그림)', '자연 속 명상', '좋아하는 음악 감상', '감정 일기 쓰기'],
      en: ['Creative activities (writing, art)', 'Meditation in nature', 'Listening to favorite music', 'Emotion journaling'],
      ja: ['創作活動（文章、絵）', '自然の中での瞑想', '好きな音楽鑑賞', '感情日記'],
      fr: ['Activités créatives (écriture, dessin)', 'Méditation en nature', 'Musique préférée', 'Journal émotionnel'],
      es: ['Actividades creativas (escritura, arte)', 'Meditación en la naturaleza', 'Música favorita', 'Diario emocional'],
      zh: ['创作活动（写作、绘画）', '大自然冥想', '听最爱的音乐', '情感日记'],
    },
    quote: {
      ko: '창의적 표현이 당신의 치유제입니다. 자신의 감정을 예술로 승화시키는 것이 가장 효과적입니다.',
      en: 'Creative expression is your healing. Transforming emotions into art is your most effective relief.',
      ja: '創造的な表現があなたの癒しです。感情を芸術に昇華させることが最も効果的です。',
      fr: "L'expression créative est votre guérison. Transformer les émotions en art est le plus efficace.",
      es: 'La expresión creativa es tu sanación. Transformar emociones en arte es tu alivio más efectivo.',
      zh: '创意表达是你的疗愈方式。将情感升华为艺术是最有效的方法。',
    },
    color: 'pink',
    badge: '🌸',
  },
  ENFJ: {
    stressTriggers: {
      ko: ['관계 갈등', '인정받지 못함', '타인의 고통', '비전 좌절'],
      en: ['Relationship conflicts', 'Lack of appreciation', "Others' suffering", 'Vision frustrated'],
      ja: ['人間関係の葛藤', '認められない', '他者の苦しみ', 'ビジョンの挫折'],
      fr: ['Conflits relationnels', 'Manque de reconnaissance', 'Souffrance des autres', 'Vision frustrée'],
      es: ['Conflictos relacionales', 'Falta de aprecio', 'Sufrimiento ajeno', 'Visión frustrada'],
      zh: ['关系冲突', '得不到认可', '他人的痛苦', '愿景受挫'],
    },
    stressSigns: {
      ko: ['타인 욕구 우선화 심화', '자기 감정 억압', '과도한 책임감', '신체 증상'],
      en: ["Prioritizing others' needs excessively", 'Suppressing own emotions', 'Excessive responsibility', 'Physical symptoms'],
      ja: ['他者ニーズの過剰優先', '自己感情の抑圧', '過度な責任感', '身体症状'],
      fr: ['Sur-priorité aux autres', 'Répression émotionnelle', 'Responsabilité excessive', 'Symptômes physiques'],
      es: ['Priorizar a otros en exceso', 'Suprimir emociones propias', 'Responsabilidad excesiva', 'Síntomas físicos'],
      zh: ['过度优先他人需求', '压抑自身情感', '过度责任感', '身体症状'],
    },
    reliefMethods: {
      ko: ['신뢰하는 사람과 감정 나누기', '자기 자신을 위한 시간', '자원봉사나 의미 있는 활동', '요가나 명상'],
      en: ['Sharing emotions with trusted people', 'Time for yourself', 'Volunteering or meaningful activities', 'Yoga or meditation'],
      ja: ['信頼できる人との感情共有', '自分のための時間', 'ボランティアや意味ある活動', 'ヨガや瞑想'],
      fr: ['Partager émotions avec des proches', 'Temps pour soi', 'Bénévolat ou activités significatives', 'Yoga ou méditation'],
      es: ['Compartir emociones con personas de confianza', 'Tiempo para ti', 'Voluntariado', 'Yoga o meditación'],
      zh: ['与可信赖的人分享情感', '为自己留时间', '志愿服务或有意义的活动', '瑜伽或冥想'],
    },
    quote: {
      ko: '당신은 타인을 돌보다 자신을 잃기 쉽습니다. 자기 자신에게도 친절한 리더가 되세요.',
      en: 'You can lose yourself while caring for others. Be a kind leader to yourself too.',
      ja: '他者を気にかけるうちに自分を失いやすいです。自分自身にも優しいリーダーになってください。',
      fr: 'Vous pouvez vous perdre en prenant soin des autres. Soyez aussi un leader bienveillant envers vous-même.',
      es: 'Puedes perderte cuidando a otros. Sé también un líder amable contigo mismo.',
      zh: '在关心他人的过程中，你容易迷失自己。也要做自己善良的领袖。',
    },
    color: 'emerald',
    badge: '🌟',
  },
  ENFP: {
    stressTriggers: {
      ko: ['엄격한 루틴', '감정 억압', '의미 없는 업무', '열정 차단'],
      en: ['Rigid routines', 'Suppressed emotions', 'Meaningless tasks', 'Blocked passion'],
      ja: ['厳格なルーティン', '感情の抑圧', '意味のない業務', '情熱の遮断'],
      fr: ['Routines rigides', 'Émotions réprimées', 'Tâches sans sens', 'Passion bloquée'],
      es: ['Rutinas rígidas', 'Emociones reprimidas', 'Tareas sin sentido', 'Pasión bloqueada'],
      zh: ['嚴格的例行程序', '情感受壓制', '無意義的工作', '熱情被阻礙'],
    },
    stressSigns: {
      ko: ['과도한 흥분 후 탈진', '집중력 분산', '자기 의심 증가', '충동적 행동'],
      en: ['Over-excitement then burnout', 'Scattered focus', 'Increased self-doubt', 'Impulsive behavior'],
      ja: ['過度な興奮後の燃え尽き', '集中力の分散', '自己疑念の増加', '衝動的行動'],
      fr: ['Sur-excitation puis épuisement', 'Concentration dispersée', 'Doutes de soi accrus', 'Comportement impulsif'],
      es: ['Sobreexcitación y luego agotamiento', 'Concentración dispersa', 'Más dudas de sí mismo', 'Comportamiento impulsivo'],
      zh: ['过度兴奋后精疲力竭', '注意力分散', '自我怀疑增加', '冲动行为'],
    },
    reliefMethods: {
      ko: ['새로운 사람 만나기', '창의적인 프로젝트 시작', '자발적인 여행', '춤이나 운동'],
      en: ['Meeting new people', 'Starting creative projects', 'Spontaneous trips', 'Dancing or exercise'],
      ja: ['新しい人との出会い', 'クリエイティブなプロジェクト開始', '自発的な旅', 'ダンスや運動'],
      fr: ['Rencontrer de nouvelles personnes', 'Démarrer des projets créatifs', 'Voyages spontanés', 'Danse ou sport'],
      es: ['Conocer gente nueva', 'Iniciar proyectos creativos', 'Viajes espontáneos', 'Bailar o hacer ejercicio'],
      zh: ['结识新朋友', '开始创意项目', '随性旅行', '跳舞或运动'],
    },
    quote: {
      ko: '열정과 자유가 당신의 산소입니다. 영감을 주는 환경을 만드는 것이 최고의 스트레스 해소입니다.',
      en: 'Passion and freedom are your oxygen. Creating an inspiring environment is your best stress relief.',
      ja: '情熱と自由があなたの酸素です。インスピレーションを与える環境を作ることが最高のストレス解消です。',
      fr: 'La passion et la liberté sont votre oxygène. Créer un environnement inspirant est votre meilleur remède.',
      es: 'La pasión y la libertad son tu oxígeno. Crear un ambiente inspirador es tu mejor alivio del estrés.',
      zh: '热情和自由是你的氧气。创造充满灵感的环境是最好的压力解法。',
    },
    color: 'amber',
    badge: '🎈',
  },
  ISTJ: {
    stressTriggers: {
      ko: ['갑작스러운 변화', '불명확한 지침', '책임 방기', '규칙 위반'],
      en: ['Sudden changes', 'Unclear instructions', 'Irresponsibility', 'Rule violations'],
      ja: ['突然の変化', '不明確な指示', '無責任', '規則違反'],
      fr: ['Changements soudains', 'Instructions floues', 'Irresponsabilité', 'Violations des règles'],
      es: ['Cambios repentinos', 'Instrucciones poco claras', 'Irresponsabilidad', 'Violaciones de reglas'],
      zh: ['突然变化', '指示不明确', '不负责任', '违反规则'],
    },
    stressSigns: {
      ko: ['과도한 업무 몰입', '신체 긴장', '비판적 발언', '사회적 고립'],
      en: ['Overworking', 'Physical tension', 'Critical remarks', 'Social isolation'],
      ja: ['過剰な業務集中', '身体的緊張', '批判的発言', '社会的孤立'],
      fr: ['Surmenage', 'Tension physique', 'Remarques critiques', 'Isolement social'],
      es: ['Exceso de trabajo', 'Tensión física', 'Comentarios críticos', 'Aislamiento social'],
      zh: ['过度投入工作', '身体紧张', '批评性言论', '社会孤立'],
    },
    reliefMethods: {
      ko: ['익숙한 루틴 유지', '물리적 운동', '혼자만의 정리정돈', '신뢰하는 소수와 시간'],
      en: ['Maintaining familiar routines', 'Physical exercise', 'Organizing solo', 'Time with trusted few'],
      ja: ['慣れたルーティンの維持', '身体運動', '一人で整理整頓', '信頼できる少数との時間'],
      fr: ['Maintenir les routines familières', 'Exercice physique', 'Organisation solitaire', 'Temps avec quelques proches'],
      es: ['Mantener rutinas familiares', 'Ejercicio físico', 'Organización solo', 'Tiempo con pocos de confianza'],
      zh: ['维持熟悉的例行程序', '体育运动', '独自整理', '与少数信任者共度时光'],
    },
    quote: {
      ko: '구조와 질서가 당신에게 안정감을 줍니다. 익숙한 환경으로 돌아가는 것이 최고의 회복 방법입니다.',
      en: 'Structure and order give you stability. Returning to familiar environments is your best recovery.',
      ja: '構造と秩序があなたに安定をもたらします。慣れた環境に戻ることが最高の回復法です。',
      fr: "La structure et l'ordre vous procurent stabilité. Revenir à des environnements familiers est votre meilleure récupération.",
      es: 'La estructura y el orden te dan estabilidad. Volver a entornos familiares es tu mejor recuperación.',
      zh: '结构和秩序给你带来稳定感。回到熟悉的环境是最好的恢复方式。',
    },
    color: 'slate',
    badge: '🏛️',
  },
  ISFJ: {
    stressTriggers: { ko: ['갈등과 불화', '인정 부재', '과도한 업무', '변화'], en: ['Conflict and discord', 'Lack of recognition', 'Overwhelm', 'Change'], ja: ['葛藤と不和', '認識の欠如', '過負荷', '変化'], fr: ['Conflits', 'Manque de reconnaissance', 'Surcharge', 'Changements'], es: ['Conflictos', 'Falta de reconocimiento', 'Sobrecarga', 'Cambios'], zh: ['冲突和不和', '缺乏认可', '过多工作', '变化'], },
    stressSigns: { ko: ['자기 희생 심화', '신체적 피로', '내면의 분노', '과식'], en: ['Self-sacrifice intensifies', 'Physical fatigue', 'Inner resentment', 'Overeating'], ja: ['自己犠牲の深化', '身体的疲労', '内なる怒り', '過食'], fr: ['Sacrifice de soi intensifié', 'Fatigue physique', 'Ressentiment intérieur', 'Suralimentation'], es: ['Mayor sacrificio personal', 'Fatiga física', 'Resentimiento interno', 'Comer en exceso'], zh: ['自我牺牲加深', '身体疲劳', '内心愤恨', '暴饮暴食'], },
    reliefMethods: { ko: ['도움받기', '친한 친구와 대화', '좋아하는 요리', '취미 활동'], en: ['Accepting help', 'Talking to close friends', 'Cooking favorites', 'Hobbies'], ja: ['助けを受け入れる', '親しい友人との会話', '好きな料理', '趣味活動'], fr: ['Accepter de l\'aide', 'Parler à des amis proches', 'Cuisiner ses plats préférés', 'Loisirs'], es: ['Aceptar ayuda', 'Hablar con amigos cercanos', 'Cocinar favoritos', 'Pasatiempos'], zh: ['接受帮助', '与亲密朋友交谈', '做最爱的料理', '兴趣活动'], },
    quote: { ko: '당신은 항상 타인을 돌봅니다. 때로는 누군가에게 기댈 줄 알아야 당신도 회복됩니다.', en: 'You always care for others. Knowing when to lean on someone is essential for your recovery.', ja: 'いつも他者を気にかけています。誰かに頼ることを知ることが回復に必要です。', fr: 'Vous prenez toujours soin des autres. Savoir s\'appuyer sur quelqu\'un est essentiel pour vous.', es: 'Siempre cuidas a los demás. Saber apoyarte en alguien es esencial para tu recuperación.', zh: '你总是关心他人。懂得依靠他人是你恢复的关键。', },
    color: 'teal',
    badge: '🤝',
  },
  ESTJ: {
    stressTriggers: { ko: ['비효율', '책임 회피', '권위 도전', '모호함'], en: ['Inefficiency', 'Avoiding responsibility', 'Challenged authority', 'Ambiguity'], ja: ['非効率', '責任回避', '権威への挑戦', '曖昧さ'], fr: ['Inefficacité', 'Déresponsabilisation', 'Autorité remise en question', 'Ambiguïté'], es: ['Ineficiencia', 'Evasión de responsabilidad', 'Autoridad cuestionada', 'Ambigüedad'], zh: ['低效率', '逃避責任', '挑戰權威', '模糊性'], },
    stressSigns: { ko: ['지배적 행동', '규칙 집착', '유연성 상실', '신체적 긴장'], en: ['Controlling behavior', 'Rule obsession', 'Loss of flexibility', 'Physical tension'], ja: ['支配的行動', 'ルール執着', '柔軟性の喪失', '身体的緊張'], fr: ['Comportement contrôlant', 'Obsession des règles', 'Perte de flexibilité', 'Tension physique'], es: ['Comportamiento controlador', 'Obsesión por reglas', 'Pérdida de flexibilidad', 'Tensión física'], zh: ['控制行为', '规则执着', '失去灵活性', '身体紧张'], },
    reliefMethods: { ko: ['업무 목록 완성', '운동', '가족 시간', '성취감 있는 활동'], en: ['Completing task lists', 'Exercise', 'Family time', 'Activities with clear achievement'], ja: ['タスクリストの完成', '運動', '家族の時間', '達成感のある活動'], fr: ['Compléter des listes de tâches', 'Exercice', 'Temps en famille', 'Activités avec résultats clairs'], es: ['Completar listas de tareas', 'Ejercicio', 'Tiempo familiar', 'Actividades con logros claros'], zh: ['完成任务清单', '运动', '家庭时间', '有成就感的活动'], },
    quote: { ko: '성취와 질서가 당신의 안정제입니다. 작은 목표들을 달성해가며 통제감을 회복하세요.', en: 'Achievement and order are your stabilizers. Regain control by accomplishing small goals.', ja: '達成と秩序があなたの安定剤です。小さな目標を達成してコントロールを回復してください。', fr: "L'accomplissement et l'ordre sont vos stabilisateurs. Retrouvez le contrôle en atteignant de petits objectifs.", es: 'El logro y el orden son tus estabilizadores. Recupera el control logrando pequeñas metas.', zh: '成就和秩序是你的稳定剂。通过完成小目标来恢复控制感。', },
    color: 'blue',
    badge: '📋',
  },
  ESFJ: {
    stressTriggers: { ko: ['사회적 갈등', '거부감', '타인의 고통', '비조화'], en: ['Social conflict', 'Rejection', "Others' suffering", 'Disharmony'], ja: ['社会的葛藤', '拒絶', '他者の苦しみ', '不和'], fr: ['Conflits sociaux', 'Rejet', 'Souffrance des autres', 'Discorde'], es: ['Conflictos sociales', 'Rechazo', 'Sufrimiento ajeno', 'Discordia'], zh: ['社會衝突', '被拒絕', '他人痛苦', '不和諧'], },
    stressSigns: { ko: ['과잉 걱정', '타인 의견 집착', '험담', '신체 증상'], en: ['Over-worrying', 'Seeking others\' opinions obsessively', 'Gossip', 'Physical symptoms'], ja: ['過剰な心配', '他者の意見への執着', '噂話', '身体症状'], fr: ['Inquiétude excessive', 'Chercher obsessionnellement les avis', 'Commérages', 'Symptômes physiques'], es: ['Preocupación excesiva', 'Buscar opiniones obsesivamente', 'Chismes', 'Síntomas físicos'], zh: ['过度担忧', '执着于他人意见', '八卦', '身体症状'], },
    reliefMethods: { ko: ['친구들과 모임', '타인 돕기', '요리나 베이킹', '긍정적 환경 만들기'], en: ['Gathering with friends', 'Helping others', 'Cooking or baking', 'Creating positive environments'], ja: ['友人との集まり', '他者を助ける', '料理やベーキング', 'ポジティブな環境作り'], fr: ['Rassembler des amis', 'Aider les autres', 'Cuisine ou pâtisserie', 'Créer des environnements positifs'], es: ['Reunirse con amigos', 'Ayudar a otros', 'Cocinar o hornear', 'Crear entornos positivos'], zh: ['与朋友聚会', '帮助他人', '烹饪或烘焙', '创造积极环境'], },
    quote: { ko: '당신은 조화로운 관계에서 행복을 찾습니다. 서로 돌보는 커뮤니티가 당신의 치유제입니다.', en: 'You find happiness in harmonious relationships. A caring community is your healing.', ja: '調和のとれた関係に幸せを見つけます。お互いを気にかけるコミュニティがあなたの癒しです。', fr: 'Vous trouvez le bonheur dans des relations harmonieuses. Une communauté bienveillante est votre guérison.', es: 'Encuentras felicidad en relaciones armoniosas. Una comunidad afectuosa es tu sanación.', zh: '你在和谐关系中寻找幸福。相互关怀的社群是你的疗愈之道。', },
    color: 'rose',
    badge: '🌺',
  },
  ISTP: {
    stressTriggers: { ko: ['감정 표현 강요', '비논리적 결정', '지나친 통제', '약속 과부하'], en: ['Forced emotional expression', 'Illogical decisions', 'Over-control', 'Too many commitments'], ja: ['感情表現の強要', '非論理的決定', '過度な管理', '約束の過負荷'], fr: ['Expression émotionnelle forcée', 'Décisions illogiques', 'Sur-contrôle', 'Trop d\'engagements'], es: ['Expresión emocional forzada', 'Decisiones ilógicas', 'Control excesivo', 'Demasiados compromisos'], zh: ['被迫情感表达', '不合逻辑的决定', '过度控制', '过多承诺'], },
    stressSigns: { ko: ['충동적 행동', '냉담한 태도', '자기 고립', '위험 추구'], en: ['Impulsive behavior', 'Cold demeanor', 'Self-isolation', 'Risk-seeking'], ja: ['衝動的行動', '冷淡な態度', '自己孤立', 'リスク追求'], fr: ['Comportement impulsif', 'Attitude froide', 'Isolement', 'Recherche de risque'], es: ['Comportamiento impulsivo', 'Actitud fría', 'Aislamiento', 'Búsqueda de riesgo'], zh: ['冲动行为', '冷漠态度', '自我孤立', '寻求风险'], },
    reliefMethods: { ko: ['손으로 하는 활동', '혼자만의 스포츠', '기계 분해와 조립', '짧은 여행'], en: ['Hands-on activities', 'Solo sports', 'Taking things apart', 'Short trips'], ja: ['手作業', '一人スポーツ', '分解と組み立て', '短い旅行'], fr: ['Activités manuelles', 'Sports solitaires', 'Démonter des objets', 'Courts voyages'], es: ['Actividades manuales', 'Deportes solitarios', 'Desmontar cosas', 'Viajes cortos'], zh: ['动手活动', '独自运动', '拆卸和组装', '短途旅行'], },
    quote: { ko: '행동과 경험이 당신의 치유제입니다. 몸을 움직이고 무언가를 직접 만들어보세요.', en: 'Action and experience are your healing. Move your body and build something with your hands.', ja: '行動と体験があなたの癒しです。体を動かし、何かを手で作ってみましょう。', fr: "L'action et l'expérience sont votre guérison. Bougez et créez quelque chose de vos mains.", es: 'La acción y la experiencia son tu sanación. Mueve tu cuerpo y crea algo con tus manos.', zh: '行动和体验是你的疗愈方式。动起来，亲手创造一些东西。', },
    color: 'stone',
    badge: '🔧',
  },
  ISFP: {
    stressTriggers: { ko: ['비판과 갈등', '자유 제한', '가치관 침해', '강요된 리더십'], en: ['Criticism and conflict', 'Restricted freedom', 'Value violations', 'Forced leadership'], ja: ['批判と葛藤', '自由の制限', '価値観の侵害', '強要されたリーダーシップ'], fr: ['Critiques et conflits', 'Liberté restreinte', 'Violations des valeurs', 'Leadership forcé'], es: ['Críticas y conflictos', 'Libertad restringida', 'Violaciones de valores', 'Liderazgo forzado'], zh: ['批评和冲突', '自由受限', '价值观被侵犯', '被强迫领导'], },
    stressSigns: { ko: ['창의성 저하', '극단적 감수성', '충동적 결정', '자기 의심'], en: ['Decreased creativity', 'Extreme sensitivity', 'Impulsive decisions', 'Self-doubt'], ja: ['創造性の低下', '極端な感受性', '衝動的決定', '自己疑念'], fr: ['Créativité réduite', 'Sensibilité extrême', 'Décisions impulsives', 'Doutes de soi'], es: ['Creatividad reducida', 'Sensibilidad extrema', 'Decisiones impulsivas', 'Dudas sobre sí mismo'], zh: ['创造力下降', '极度敏感', '冲动决定', '自我怀疑'], },
    reliefMethods: { ko: ['예술 작업', '자연 속 시간', '음악 감상이나 연주', '동물과 함께하기'], en: ['Art work', 'Time in nature', 'Listening to or playing music', 'Being with animals'], ja: ['芸術作業', '自然の中での時間', '音楽鑑賞や演奏', '動物との時間'], fr: ['Travail artistique', 'Temps dans la nature', 'Écouter ou jouer de la musique', 'Être avec des animaux'], es: ['Trabajo artístico', 'Tiempo en la naturaleza', 'Escuchar o tocar música', 'Estar con animales'], zh: ['艺术创作', '在大自然中', '听音乐或演奏', '与动物相处'], },
    quote: { ko: '감각적 아름다움이 당신의 치유제입니다. 예술, 자연, 음악으로 스트레스를 녹이세요.', en: 'Sensory beauty is your healing. Melt away stress through art, nature, and music.', ja: '感覚的な美しさがあなたの癒しです。芸術、自然、音楽でストレスを溶かしてください。', fr: 'La beauté sensorielle est votre guérison. Dissolvez le stress par l\'art, la nature et la musique.', es: 'La belleza sensorial es tu sanación. Disuelve el estrés a través del arte, la naturaleza y la música.', zh: '感官之美是你的疗愈方式。透过艺术、自然和音乐消解压力。', },
    color: 'lime',
    badge: '🎨',
  },
  ESTP: {
    stressTriggers: { ko: ['제한된 행동', '긴 이론 강의', '통제받는 느낌', '단조로운 루틴'], en: ['Restricted action', 'Long theoretical lectures', 'Feeling controlled', 'Monotonous routines'], ja: ['行動の制限', '長い理論的講義', 'コントロールされる感覚', '単調なルーティン'], fr: ['Actions restreintes', 'Longues théories', 'Sentiment de contrôle', 'Routines monotones'], es: ['Acciones restringidas', 'Largas conferencias teóricas', 'Sentirse controlado', 'Rutinas monótonas'], zh: ['行动受限', '冗长的理论讲授', '被控制的感觉', '单调例行程序'], },
    stressSigns: { ko: ['과도한 위험 감수', '충동적 소비', '공격적 반응', '집중력 저하'], en: ['Excessive risk-taking', 'Impulsive spending', 'Aggressive responses', 'Difficulty focusing'], ja: ['過度なリスク追求', '衝動的な消費', '攻撃的反応', '集中力低下'], fr: ['Prise de risques excessive', 'Dépenses impulsives', 'Réponses agressives', 'Difficultés de concentration'], es: ['Toma de riesgos excesiva', 'Gastos impulsivos', 'Respuestas agresivas', 'Dificultad para concentrarse'], zh: ['过度冒险', '冲动消费', '攻击性反应', '注意力下降'], },
    reliefMethods: { ko: ['스포츠나 신체 활동', '새로운 경험 추구', '사람들과 어울리기', '즉흥적인 외출'], en: ['Sports or physical activity', 'Seeking new experiences', 'Socializing', 'Spontaneous outings'], ja: ['スポーツや身体活動', '新しい体験の追求', '人との交流', '即興の外出'], fr: ['Sports ou activité physique', 'Chercher de nouvelles expériences', 'Sociabilisation', 'Sorties spontanées'], es: ['Deportes o actividad física', 'Buscar nuevas experiencias', 'Socializar', 'Salidas espontáneas'], zh: ['体育运动', '寻求新体验', '社交', '随性外出'], },
    quote: { ko: '행동과 자유가 당신의 활력소입니다. 몸을 움직이고 새로운 것을 경험하면 스트레스가 사라집니다.', en: 'Action and freedom are your vitality. Moving and experiencing new things makes stress disappear.', ja: '行動と自由があなたの活力です。体を動かし、新しいことを体験するとストレスが消えます。', fr: "L'action et la liberté sont votre vitalité. Bouger et vivre de nouvelles expériences fait disparaître le stress.", es: 'La acción y la libertad son tu vitalidad. Moverte y experimentar cosas nuevas hace desaparecer el estrés.', zh: '行动和自由是你的活力。动起来、体验新事物，压力就会消失。', },
    color: 'red',
    badge: '⚡',
  },
  ESFP: {
    stressTriggers: { ko: ['사회적 거부', '고립', '비판', '미래 불확실성'], en: ['Social rejection', 'Isolation', 'Criticism', 'Future uncertainty'], ja: ['社会的拒絶', '孤立', '批判', '未来の不確実性'], fr: ['Rejet social', 'Isolement', 'Critiques', 'Incertitude future'], es: ['Rechazo social', 'Aislamiento', 'Críticas', 'Incertidumbre futura'], zh: ['社會排斥', '孤立', '批評', '未來不確定性'], },
    stressSigns: { ko: ['과도한 쾌락 추구', '감정 폭발', '충동적 결정', '책임 회피'], en: ['Excessive pleasure-seeking', 'Emotional outbursts', 'Impulsive decisions', 'Avoiding responsibility'], ja: ['過度な快楽追求', '感情爆発', '衝動的決定', '責任回避'], fr: ['Recherche excessive de plaisir', 'Explosions émotionnelles', 'Décisions impulsives', 'Évitement des responsabilités'], es: ['Búsqueda excesiva de placer', 'Explosiones emocionales', 'Decisiones impulsivas', 'Evitar responsabilidades'], zh: ['过度寻求快乐', '情感爆发', '冲动决定', '逃避责任'], },
    reliefMethods: { ko: ['파티나 모임', '춤이나 음악', '쇼핑', '재미있는 친구들과 시간'], en: ['Parties or gatherings', 'Dancing or music', 'Shopping', 'Fun time with friends'], ja: ['パーティーや集まり', 'ダンスや音楽', 'ショッピング', '楽しい友人との時間'], fr: ['Fêtes ou rassemblements', 'Danse ou musique', 'Shopping', 'Temps avec des amis amusants'], es: ['Fiestas o reuniones', 'Baile o música', 'Shopping', 'Tiempo divertido con amigos'], zh: ['聚会或派对', '跳舞或听音乐', '购物', '与有趣朋友共度时光'], },
    quote: { ko: '사람들과의 즐거운 연결이 당신의 에너지입니다. 활기찬 환경에서 스트레스는 금세 사라집니다.', en: 'Joyful connection with people is your energy. Stress disappears quickly in a vibrant environment.', ja: '人とのつながりがあなたのエネルギーです。活気ある環境でストレスはすぐ消えます。', fr: 'La connexion joyeuse avec les gens est votre énergie. Le stress disparaît vite dans un environnement animé.', es: 'La conexión alegre con las personas es tu energía. El estrés desaparece rápido en un ambiente vibrante.', zh: '与人的快乐连结是你的能量。在活跃的环境中压力很快消失。', },
    color: 'fuchsia',
    badge: '🎉',
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; bar: string }> = {
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-800',  bar: 'bg-indigo-500' },
  cyan:    { bg: 'bg-cyan-50',      border: 'border-cyan-200',      text: 'text-cyan-700',      badge: 'bg-cyan-100 text-cyan-800',          bar: 'bg-cyan-500' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-800',  bar: 'bg-orange-500' },
  yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-700',  badge: 'bg-yellow-100 text-yellow-800',  bar: 'bg-yellow-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-800',  bar: 'bg-violet-500' },
  pink:    { bg: 'bg-pink-50',      border: 'border-pink-200',      text: 'text-pink-700',      badge: 'bg-pink-100 text-pink-800',          bar: 'bg-pink-500' },
  emerald: { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-800',bar: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-50',    border: 'border-amber-200',    text: 'text-amber-700',    badge: 'bg-amber-100 text-amber-800',      bar: 'bg-amber-500' },
  slate:   { bg: 'bg-slate-50',    border: 'border-slate-200',    text: 'text-slate-700',    badge: 'bg-slate-100 text-slate-800',      bar: 'bg-slate-500' },
  teal:    { bg: 'bg-teal-50',      border: 'border-teal-200',      text: 'text-teal-700',      badge: 'bg-teal-100 text-teal-800',          bar: 'bg-teal-500' },
  blue:    { bg: 'bg-blue-50',      border: 'border-blue-200',      text: 'text-blue-700',      badge: 'bg-blue-100 text-blue-800',          bar: 'bg-blue-500' },
  rose:    { bg: 'bg-rose-50',      border: 'border-rose-200',      text: 'text-rose-700',      badge: 'bg-rose-100 text-rose-800',          bar: 'bg-rose-500' },
  stone:   { bg: 'bg-stone-50',    border: 'border-stone-200',    text: 'text-stone-700',    badge: 'bg-stone-100 text-stone-800',      bar: 'bg-stone-500' },
  lime:    { bg: 'bg-lime-50',      border: 'border-lime-200',      text: 'text-lime-700',      badge: 'bg-lime-100 text-lime-800',          bar: 'bg-lime-500' },
  red:     { bg: 'bg-red-50',        border: 'border-red-200',        text: 'text-red-700',        badge: 'bg-red-100 text-red-800',              bar: 'bg-red-500' },
  fuchsia: { bg: 'bg-fuchsia-50',border: 'border-fuchsia-200',text: 'text-fuchsia-700',badge: 'bg-fuchsia-100 text-fuchsia-800',bar: 'bg-fuchsia-500' },
};

const MBTI_TYPES: MbtiType[] = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

const UI: Record<Locale, {
  title: string; subtitle: string; selectPrompt: string; viewResult: string; reset: string;
  triggers: string; signs: string; relief: string; insight: string;
}> = {
  ko: { title: 'MBTI 스트레스 해소법', subtitle: 'MBTI-Based Stress Relief Guide', selectPrompt: 'MBTI 유형을 선택하세요', viewResult: '결과 보기', reset: '다시 선택', triggers: '스트레스 유발 요인', signs: '스트레스 신호', relief: '스트레스 해소법', insight: '핵심 인사이트' },
  en: { title: 'MBTI Stress Relief Guide', subtitle: 'Personalized Stress Relief by Personality', selectPrompt: 'Select your MBTI type', viewResult: 'View Result', reset: 'Reselect', triggers: 'Stress Triggers', signs: 'Stress Signs', relief: 'Relief Methods', insight: 'Key Insight' },
  ja: { title: 'MBTIストレス解消ガイド', subtitle: 'MBTIタイプ別ストレス解消', selectPrompt: 'MBTIタイプを選択してください', viewResult: '結果を見る', reset: '再選択', triggers: 'ストレス誘発要因', signs: 'ストレスサイン', relief: 'ストレス解消法', insight: '重要インサイト' },
  fr: { title: 'Guide Anti-Stress MBTI', subtitle: 'Soulagement du stress selon votre personnalité', selectPrompt: 'Sélectionnez votre type MBTI', viewResult: 'Voir le résultat', reset: 'Rechoisir', triggers: 'Déclencheurs de stress', signs: 'Signes de stress', relief: 'Méthodes de soulagement', insight: 'Insight clé' },
  es: { title: 'Guía Anti-Estrés MBTI', subtitle: 'Alivio del estrés según tu personalidad', selectPrompt: 'Selecciona tu tipo MBTI', viewResult: 'Ver resultado', reset: 'Reelegir', triggers: 'Desencadenantes de estrés', signs: 'Señales de estrés', relief: 'Métodos de alivio', insight: 'Insight clave' },
  zh: { title: 'MBTI压力解除指南', subtitle: '根据个性的压力解除方法', selectPrompt: '选择你的MBTI类型', viewResult: '查看结果', reset: '重新选择', triggers: '压力诱发因素', signs: '压力信号', relief: '压力解除方法', insight: '核心洞察' },
};

const MbtiStressTest: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = UI[locale] ?? UI.en;
  const [selected, setSelected] = useState<MbtiType | null>(null);
  const [showResult, setShowResult] = useState(false);

  if (showResult && selected) {
    const profile = STRESS_PROFILES[selected];
    const c = COLOR_MAP[profile.color] ?? COLOR_MAP.indigo;

    return (
      <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
        <div className={`flex items-center gap-4 mb-8 p-5 rounded-2xl border ${c.bg} ${c.border}`}>
          <span className="text-5xl">{profile.badge}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MBTI</p>
            <h2 className={`text-4xl font-black ${c.text}`}>{selected}</h2>
          </div>
        </div>

        {/* Insight */}
        <div className={`p-5 rounded-2xl border mb-6 ${c.bg} ${c.border}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.insight}</p>
          <p className="text-sm leading-relaxed">{profile.quote[locale]}</p>
        </div>

        {/* Three sections */}
        {[
          { label: t.triggers, items: profile.stressTriggers[locale], icon: '⚠️' },
          { label: t.signs, items: profile.stressSigns[locale], icon: '🔔' },
          { label: t.relief, items: profile.reliefMethods[locale], icon: '✨' },
        ].map(({ label, items, icon }) => (
          <div key={label} className="mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{icon} {label}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((item: string) => (
                <span key={item} className={`px-3 py-1 rounded-full text-xs font-bold ${c.badge}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => { setShowResult(false); setSelected(null); }}
          className="mt-6 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors"
        >
          {t.reset}
        </button>
      </div>
    );
  }

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      <p className="text-sm font-bold text-muted-foreground mb-4">{t.selectPrompt}</p>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {MBTI_TYPES.map(type => {
          const p = STRESS_PROFILES[type];
          const c = COLOR_MAP[p.color] ?? COLOR_MAP.indigo;
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`py-3 rounded-2xl text-sm font-black border-2 transition-all ${
                selected === type
                  ? `${c.bg} ${c.border} ${c.text} scale-105`
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {p.badge} {type}
            </button>
          );
        })}
      </div>

      <button
        disabled={!selected}
        onClick={() => setShowResult(true)}
        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t.viewResult}
      </button>
    </div>
  );
};

export default MbtiStressTest;
