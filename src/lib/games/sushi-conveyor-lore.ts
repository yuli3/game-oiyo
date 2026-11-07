import type { Locale } from '../i18n';

export interface SushiDialogue {
  id: string;
  sender: Record<Locale, string>;
  message: Record<Locale, string>;
  mood: 'happy' | 'fever' | 'warning' | 'vip';
}

export const SUSHI_DIALOGUES: SushiDialogue[] = [
  {
    id: 'welcome_ginza',
    sender: {
      ko: '스시 마스터 류',
      en: 'Sushi Master Ryu',
      ja: '寿司職人 リュウ',
      zh: '寿司大师 龙',
      fr: 'Maître Sushi Ryu',
      es: 'Maestro Sushi Ryu',
    },
    message: {
      ko: '긴자 본점에 오신 것을 환영합니다! 신선한 네타와 따뜻한 밥의 온도를 맞춰 레일에 올리세요.',
      en: 'Welcome to the Ginza flagship! Balance the warm rice and fresh fish on the conveyor belt.',
      ja: '銀座本店へようこそ！新鮮なネタと絶妙なシャリの温度でレーンを満たしましょう。',
      zh: '欢迎光临银座旗舰店！请将新鲜鱼生与温润醋饭完美搭配送上传送带。',
      fr: 'Bienvenue au fleuron de Ginza ! Équilibrez le riz chaud et le poisson frais sur le tapis.',
      es: '¡Bienvenidos a la sucursal de Ginza! Equilibra el arroz templado y el pescado fresco en la cinta.',
    },
    mood: 'happy',
  },
  {
    id: 'fever_kuroda',
    sender: {
      ko: '미식가 쿠로다 경',
      en: 'Gourmet Lord Kuroda',
      ja: '美食家 黒田卿',
      zh: '美食家 黑田爵士',
      fr: 'Seigneur Gourmet Kuroda',
      es: 'Gourmet Lord Kuroda',
    },
    message: {
      ko: '음! 이 참치의 지방 결과 와사비의 조화는... 진정한 황금빛 예술이군! 골든 피버다!',
      en: 'Mmm! The marbling of this tuna with the fresh wasabi... True culinary art! Golden Fever!',
      ja: 'うむ！このマグロの脂の乗りと山葵の調和…まさに黄金の芸術だ！ゴールデンフィーバー！',
      zh: '嗯！这金枪鱼的脂肪纹理与新鲜芥末的融合……堪称黄金般的艺术！狂热时刻！',
      fr: 'Mmm ! Le persillage de ce thon et le wasabi frais... Un art doré magistral ! Fièvre Dorée !',
      es: '¡Mmm! El veteado de este atún con wasabi fresco... ¡Auténtico arte dorado! ¡Fiebre Dorada!',
    },
    mood: 'fever',
  },
  {
    id: 'cat_miho',
    sender: {
      ko: '단골 냥이 미호',
      en: 'Regular Cat Miho',
      ja: '常連猫 ミホ',
      zh: '熟客猫咪 美穗',
      fr: 'Chat Fidèle Miho',
      es: 'Gata Fiel Miho',
    },
    message: {
      ko: '연어 연어 내 사랑 연어다 냥! 꼬리가 살랑살랑 기분이 최고다 냥!',
      en: 'Salmon salmon, delicious salmon nya! My tail is wagging with pure joy nya!',
      ja: 'サーモンサーモン大好物のサーモンだニャ！尻尾が止まらないニャ！',
      zh: '三文鱼三文鱼我最爱的三文鱼喵！摇起尾巴太幸福了喵！',
      fr: 'Du saumon, du saumon, mon saumon adoré nya ! Ma queue frétille de bonheur nya !',
      es: '¡Salmón salmón, mi salmón favorito miau! ¡Muevo la cola de pura felicidad miau!',
    },
    mood: 'happy',
  },
  {
    id: 'sumo_wrestler',
    sender: {
      ko: '요코즈나 다이호',
      en: 'Yokozuna Daiho',
      ja: '横綱 大鳳',
      zh: '横纲 大凤',
      fr: 'Yokozuna Daiho',
      es: 'Yokozuna Daiho',
    },
    message: {
      ko: '도스모이! 힘을 내려면 초밥 5접시는 거뜬히 비워야지! 빠른 속도로 레일을 돌려라!',
      en: 'Dosukoi! To stay in sumo form I need at least 5 plates! Keep the belt rolling fast!',
      ja: 'どすこい！稽古の後には寿司5皿はペロリだ！どんどんレーンを回してくれ！',
      zh: '嗨！训练之后必须痛快扫光5盘寿司！快快加速旋转传送带！',
      fr: 'Dosukoi ! Pour garder la forme de sumo, il me faut 5 assiettes ! Accélérez le tapis !',
      es: '¡Dosukoi! ¡Para mantener mi forma de sumo necesito 5 platos! ¡Haced rodar la cinta!',
    },
    mood: 'vip',
  },
  {
    id: 'inspector_alert',
    sender: {
      ko: '긴자 위생 감사관',
      en: 'Ginza Health Inspector',
      ja: '銀座衛生監査官',
      zh: '银座卫生检察官',
      fr: 'Inspecteur Sanitaire de Ginza',
      es: 'Inspector Sanitario de Ginza',
    },
    message: {
      ko: '불시 위생 점검입니다! 레일에 오래 머문 변색된 초밥은 즉시 폐기하십시오.',
      en: 'Surprise inspection! Stale discolored plates on the belt will be penalized immediately.',
      ja: '抜き打ち衛生監査です！レーン上で鮮度を失った寿司は直ちに廃棄してください。',
      zh: '突击卫生检查！传送带上变质变色的陈旧寿司将被立即处罚扣分。',
      fr: 'Contrôle sanitaire surprise ! Les assiettes défraîchies doivent être jetées immédiatement.',
      es: '¡Inspección sorpresa! Los platos pasados en la cinta serán penalizados de inmediato.',
    },
    mood: 'warning',
  },
];
