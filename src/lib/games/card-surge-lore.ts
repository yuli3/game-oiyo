/**
 * 카드 서지 (CardSurge) - 3인 카지노 페르소나 및 5대 심리전 무전 통신 로어 시스템
 */

export interface SurgeSpeaker {
  name: Record<string, string>;
  role: Record<string, string>;
  avatar: string;
}

export const SURGE_SPEAKERS: Record<string, SurgeSpeaker> = {
  ace: {
    name: { ko: "네온 딜러 에이스", en: "Dealer Ace", ja: "ディーラー・エース", zh: "霓虹荷官王牌", es: "Repartidor Ace", fr: "Croupier Ace" },
    role: { ko: "카지노 플로어 지배인", en: "Casino Floor Master", ja: "フロア統括マスター", zh: "赌场运营总监", es: "Director de sala", fr: "Directeur de table" },
    avatar: "♠️",
  },
  jack: {
    name: { ko: "암시장 브로커 잭", en: "Broker Jack", ja: "闇市場ブローカー・ジャック", zh: "黑市掮客杰克", es: "Corredor Jack", fr: "Courtier Jack" },
    role: { ko: "희귀 조커 및 바우처 밀수", en: "Rare Jokers Smuggler", ja: "限定ジョーカー密売", zh: "绝版小丑走私商", es: "Contrabandista de comodines", fr: "Trafiquant de jokers" },
    avatar: "🃏",
  },
  specter: {
    name: { ko: "네온 보스 스펙터", en: "Boss Specter", ja: "ネオンボス・スペクター", zh: "幻影头目幽灵", es: "Jefe Specter", fr: "Boss Specter" },
    role: { ko: "안테 블라인드 수호자", en: "Ante Blind Guardian", ja: "アンテブラインド守護神", zh: "底注盲注守门人", es: "Guardián de la ciega", fr: "Gardien des blindes" },
    avatar: "👑",
  },
};

export interface SurgeTransmission {
  speaker: SurgeSpeaker;
  text: Record<string, string>;
  tag: "deal" | "combo" | "boss" | "shop" | "warn";
}

export const SURGE_TRANSMISSIONS: Record<string, SurgeTransmission[]> = {
  blind_start: [
    {
      speaker: SURGE_SPEAKERS.ace,
      text: {
        ko: "새 라운드가 시작됐다. 덱을 섞고 패를 돌렸다. 이번 판돈을 넘길 수 있을까?",
        en: "New round dealt. The deck is live. Can your hand clear the required chips?",
        ja: "新たなラウンドが配られた。デッキは熱い。要求チップを叩き出せるか？",
        zh: "新一轮洗牌完毕。牌组已就绪。你手里的底牌能粉碎要求的筹码吗？",
        es: "Nueva ronda repartida. La baraja está viva. ¿Podrás superar las fichas exigidas?",
        fr: "Nouvelle manche distribuée. Le deck est prêt. Parviendrez-vous à réunir les jetons ?",
      },
      tag: "deal",
    },
  ],
  surge_mult: [
    {
      speaker: SURGE_SPEAKERS.ace,
      text: {
        ko: "엄청난 배율이다! 조커들이 연쇄 공명하며 칩 카운터가 폭주하고 있어!",
        en: "Incredible multiplier! The Jokers are surging in resonance, exploding the score!",
        ja: "凄まじい倍率だ！ジョーカー達の連鎖共鳴でチップカウンターが火を噴いている！",
        zh: "惊人的倍数！多张小丑正在连环共鸣，筹码计数器彻底失控爆发了！",
        es: "¡Multiplicador bestial! ¡Los comodines resuenan en cadena disparando el marcador!",
        fr: "Multiplicateur démentiel ! Les jokers s'emballent en chaîne et pulvérisent le score !",
      },
      tag: "combo",
    },
  ],
  boss_encounter: [
    {
      speaker: SURGE_SPEAKERS.specter,
      text: {
        ko: "내 테이블에 온 것을 환영한다. 네 천박한 트릭 따위는 내 특수 룰 앞에 무력화될 것이다.",
        en: "Welcome to my table. Your cheap card tricks will wither before my Boss Blind.",
        ja: "我がテーブルへようこそ。小細工など我がボスルールのもとに無に帰すのだ。",
        zh: "欢迎来到我的牌桌。在我的头目特殊规则面前，你那些小把戏全是不堪一击的废纸。",
        es: "Bienvenido a mi mesa. Tus trucos baratos no servirán ante mi ciega de jefe.",
        fr: "Bienvenue à ma table. Vos petits tours s'effondreront face aux règles de mon boss.",
      },
      tag: "boss",
    },
  ],
  shop_visit: [
    {
      speaker: SURGE_SPEAKERS.jack,
      text: {
        ko: "이봐 갬블러! 끝내주는 전설 조커와 영구 바우처가 입고됐어. 골드를 털어갈 준비가 됐나?",
        en: "Hey gambler! Fresh rare Jokers and permanent Vouchers just hit the counter. Got cash?",
        ja: "やあギャンブラー！極上のジョーカーと永続バウチャーが入荷したぞ。金はあるか？",
        zh: "嘿赌徒！顶级绝版小丑牌与永久兑换券刚到货。准备好你的金币大开杀戒了吗？",
        es: "¡Eh, jugador! Comodines raros y vales permanentes recién llegados. ¿Tienes fondos?",
        fr: "Hé parieur ! Des jokers rares et des coupons permanents viennent d'arriver. Des fonds ?",
      },
      tag: "shop",
    },
  ],
  game_over: [
    {
      speaker: SURGE_SPEAKERS.specter,
      text: {
        ko: "판돈이 다 떨어졌군. 하지만 암시장에서 바우처를 해금하면 다음엔 더 멀리 갈 수 있을 거다.",
        en: "Out of chips. But invest your Neon Chips in Black Market Vouchers for your next run.",
        ja: "チップが尽きたな。だがネオンチップで闇市場バウチャーを解放すれば次回は勝てる。",
        zh: "筹码耗尽了。但用你积攒的霓虹筹码在黑市解锁永久凭证，下次你将走得更远。",
        es: "Te has quedado sin fichas. Pero con los vales del mercado negro llegarás más lejos.",
        fr: "À court de jetons. Mais les coupons du marché noir vous mèneront bien plus loin la prochaine fois.",
      },
      tag: "warn",
    },
  ],
};
