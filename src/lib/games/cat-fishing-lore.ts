/**
 * 냥이 낚시 (CatFishing) - 냥이 선원 로어 & 통신 대사 HUD 시스템
 */

export type CatFishingSpeaker = "captain_navi" | "mate_miho" | "merchant_toro";

export type CatFishingTrigger =
  | "pond_start"
  | "paw_catch"
  | "fish_escape"
  | "frenzy_rush"
  | "pond_cleared";

export interface CatFishingDialogue {
  speaker: CatFishingSpeaker;
  name: Record<string, string>;
  title: Record<string, string>;
  avatar: string;
  text: Record<string, string>;
}

export const CAT_FISHING_DIALOGUES: Record<CatFishingTrigger, CatFishingDialogue[]> = {
  pond_start: [
    {
      speaker: "captain_navi",
      name: { ko: "선장 나비", en: "Captain Navi", ja: "ナヴィ船長", zh: "娜比船长", es: "Capitán Navi", fr: "Capitaine Navi" },
      title: { ko: "노련한 낚시묘", en: "Veteran Sea Cat", ja: "ベテラン釣り猫", zh: "资深海猫船长", es: "Gato marino veterano", fr: "Vieux loup de mer félin" },
      avatar: "🐱",
      text: {
        ko: "물결이 잔잔하군 냥! 헤엄치는 물고기를 살피고 번개 같은 냥펀치를 날려라 냥!",
        en: "Calm ripples in the pond, meow! Watch the fish swim and strike with swift paws!",
        ja: "波が穏やかだニャ！泳ぐ魚をよく見て電光石火のニャンパンチを繰り出すニャ！",
        zh: "池塘泛起微澜喵！看准鱼儿游动的身姿，使出闪电般的猫爪拍击喵！",
        es: "¡Ondas tranquilas en el estanque! ¡Observa a los peces y ataca con patas veloces!",
        fr: "De douces ondulations sur l'eau, miaou ! Guettez les poissons et frappez d'un coup de patte !",
      },
    },
    {
      speaker: "mate_miho",
      name: { ko: "단짝 미호", en: "Mate Miho", ja: "相棒ミホ", zh: "大副米霍", es: "Marinera Miho", fr: "Mousse Miho" },
      title: { ko: "조수 아기냥이", en: "First Mate Kitten", ja: "見習い子猫", zh: "见习小副官", es: "Gatita contramaestre", fr: "Chatonne second" },
      avatar: "🐾",
      text: {
        ko: "골골송 준비 완료 냥! 물고기가 방향을 바꿀 때가 바로 잡을 기회다 냥!",
        en: "Purring engine ready, meow! The moment a fish turns is your golden strike window!",
        ja: "ゴロゴロ音の準備完了ニャ！魚が向きを変えた瞬間が最大のチャンスだニャ！",
        zh: "呼噜声引擎已就绪喵！鱼儿转身变向的瞬间，就是一击必中的黄金破绽喵！",
        es: "¡Motor de ronroneos listo! ¡El giro del pez es tu momento para atraparlo!",
        fr: "Moteur à ronrons paré ! Quand le poisson tourne, c'est l'instant parfait pour frapper !",
      },
    },
  ],
  paw_catch: [
    {
      speaker: "captain_navi",
      name: { ko: "선장 나비", en: "Captain Navi", ja: "ナヴィ船長", zh: "娜比船长", es: "Capitán Navi", fr: "Capitaine Navi" },
      title: { ko: "노련한 낚시묘", en: "Veteran Sea Cat", ja: "ベテラン釣り猫", zh: "资深海猫船长", es: "Gato marino veterano", fr: "Vieux loup de mer félin" },
      avatar: "🐟",
      text: {
        ko: "나이스 캣치 냥! 싱싱한 물고기가 펄떡인다 냥! 오늘 밤 잔치는 생선 파티다 냥!",
        en: "Nice catch, meow! A fresh fish splashing in our paws! Fish feast tonight!",
        ja: "ナイスキャッチだニャ！ピチピチの新鮮な魚だニャ！今夜は魚パーティー決定ニャ！",
        zh: "抓得漂亮喵！鲜活多汁的大鱼在爪子里蹦跳喵！今晚全体开鱼肉派对喵！",
        es: "¡Buena captura! ¡Pescado fresco saltando en nuestras patas! ¡Fiesta esta noche!",
        fr: "Belle prise, miaou ! Un poisson bien frais qui frétille ! Banquet ce soir !",
      },
    },
    {
      speaker: "merchant_toro",
      name: { ko: "상인 토로", en: "Merchant Toro", ja: "商人トロ", zh: "商贾多罗", es: "Comerciante Toro", fr: "Marchand Toro" },
      title: { ko: "어시장 큰손", en: "Fish Market Mogul", ja: "魚市場の大物", zh: "鱼市大亨", es: "Magnate del mercado", fr: "Gros bonnet de la criée" },
      avatar: "💰",
      text: {
        ko: "오호! 때깔 좋은 생선이로군! 맛있는 츄르 코인으로 후하게 쳐주겠다 냥!",
        en: "Oho! That's a prime quality catch! I'll trade top Churu coins for this one, meow!",
        ja: "ほほう！色つや最高級の魚ニャ！美味しいチュールコインを弾んでやるニャ！",
        zh: "哎呀！品相极佳的上等肥美鲜鱼喵！本老板用最顶级的肉泥币高价收购喵！",
        es: "¡Vaya! ¡Una captura de primera! ¡Te daré buenas monedas de golosina por él!",
        fr: "Oh là là ! Une prise de premier choix ! Je vous en donne un bon prix en friandises !",
      },
    },
  ],
  fish_escape: [
    {
      speaker: "mate_miho",
      name: { ko: "단짝 미호", en: "Mate Miho", ja: "相棒ミホ", zh: "大副米霍", es: "Marinera Miho", fr: "Mousse Miho" },
      title: { ko: "조수 아기냥이", en: "First Mate Kitten", ja: "見習い子猫", zh: "见习小副官", es: "Gatita contramaestre", fr: "Chatonne second" },
      avatar: "💨",
      text: {
        ko: "앗! 요리조리 도망쳤다 냥! 다음 경로를 미리 예측하고 솜방망이를 뻗어라 냥!",
        en: "Whoa! Slippery one escaped, meow! Predict its trajectory and strike ahead!",
        ja: "ああっ！スイスイ逃げられたニャ！次のコースを先読みして手を伸ばすニャ！",
        zh: "哇呀！滑溜溜地溜走了喵！预判它逃跑的游动轨迹提前拦截伸爪喵！",
        es: "¡Se escapó por poco! ¡Anticipa su trayectoria y atrápalo en el siguiente giro!",
        fr: "Oups ! Il a filé entre les pattes ! Anticipez sa trajectoire pour le cueillir !",
      },
    },
  ],
  frenzy_rush: [
    {
      speaker: "captain_navi",
      name: { ko: "선장 나비", en: "Captain Navi", ja: "ナヴィ船長", zh: "娜比船长", es: "Capitán Navi", fr: "Capitaine Navi" },
      title: { ko: "노련한 낚시묘", en: "Veteran Sea Cat", ja: "ベテラン釣り猫", zh: "资深海猫船长", es: "Gato marino veterano", fr: "Vieux loup de mer félin" },
      avatar: "🔥",
      text: {
        ko: "광란의 냥펀치 피버 발동 냥! 발톱에 불이 붙을 정도로 쉴 새 없이 낚아채라 냥!",
        en: "PAW FRENZY FEVER, meow! Strike non-stop like a blur of lightning claws!",
        ja: "狂乱のニャンパンチフィーバー発動ニャ！爪から火が出る勢いで釣りまくれニャ！",
        zh: "狂热幻影猫爪狂热爆发喵！让利爪快如狂风暴雨般连续疯狂收割喵！",
        es: "¡FIEBRE DE ZARPAZOS! ¡Ataca sin parar a la velocidad del rayo!",
        fr: "FIÈVRE DU COUP DE PATTE ! Frappez sans répit comme l'éclair !",
      },
    },
  ],
  pond_cleared: [
    {
      speaker: "captain_navi",
      name: { ko: "선장 나비", en: "Captain Navi", ja: "ナヴィ船長", zh: "娜比船长", es: "Capitán Navi", fr: "Capitaine Navi" },
      title: { ko: "노련한 낚시묘", en: "Veteran Sea Cat", ja: "ベテラン釣り猫", zh: "资深海猫船长", es: "Gato marino veterano", fr: "Vieux loup de mer félin" },
      avatar: "👑",
      text: {
        ko: "모든 물고기 완벽 포획 완료 냥! 당신은 진정한 전설의 고양이 낚시 마스터다 냥!",
        en: "Every single fish captured, meow! You are the true Legendary Master Cat Angler!",
        ja: "すべての魚を完全捕獲したニャ！お前こそが真の伝説の猫釣り名人だニャ！",
        zh: "池塘游鱼全数圆满捕获喵！你就是当之无愧的传说级捕鱼大猫王喵！",
        es: "¡Todos los peces atrapados! ¡Eres el verdadero Maestro Pescador Felino!",
        fr: "Tous les poissons sont capturés ! Vous êtes un véritable Maître Pêcheur Félin !",
      },
    },
  ],
};

export function pickCatFishingDialogue(trigger: CatFishingTrigger): CatFishingDialogue {
  const list = CAT_FISHING_DIALOGUES[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
