/**
 * 수박 드롭 3D (SuikaDrop) - 스토리 로어 & 통신 대사 시스템
 */

export type SuikaLoreSpeaker = "master_pomodor" | "fairy_berry" | "gourmet_ruru";

export type SuikaTrigger =
  | "game_start"
  | "merge_success"
  | "overfill_danger"
  | "watermelon_made"
  | "game_over";

export interface SuikaDialogue {
  speaker: SuikaLoreSpeaker;
  name: Record<string, string>;
  title: Record<string, string>;
  avatar: string;
  text: Record<string, string>;
}

export const SUIKA_DIALOGUES: Record<SuikaTrigger, SuikaDialogue[]> = {
  game_start: [
    {
      speaker: "master_pomodor",
      name: { ko: "포모도르 원장", en: "Master Pomodor", ja: "ポモドーロ園長", zh: "波莫多罗场长", es: "Maestro Pomodor", fr: "Maître Pomodor" },
      title: { ko: "햇살 과수원장", en: "Orchard Master", ja: "果樹園の主", zh: "阳光果园园长", es: "Director del huerto", fr: "Chef du verger" },
      avatar: "👨‍🌾",
      text: {
        ko: "어서 오게나! 우리 과수원의 과일들은 서로 부딪힐수록 더 달콤하고 커다랗게 진화하지. 거대 수박을 보여주게!",
        en: "Welcome! The fruits in our orchard grow sweeter and bigger as they bump. Show me a giant watermelon!",
        ja: "ようこそ！うちの果樹園の果物はぶつかるほど甘く巨大に進化するのじゃ。見事なスイカを見せてくれ！",
        zh: "欢迎光临！我们果园的水果越碰撞就越甜美硕大。让我见识一下传说中的巨型西瓜吧！",
        es: "¡Bienvenido! Cuanto más chocan nuestras frutas, más dulces y grandes se vuelven. ¡Muéstrame una sandía gigante!",
        fr: "Bienvenue ! Plus nos fruits s'entrechoquent, plus ils grossissent et s'adoucissent. Montrez-moi une pastèque géante !",
      },
    },
    {
      speaker: "fairy_berry",
      name: { ko: "딸기 요정 베리", en: "Berry Fairy", ja: "妖精ベリー", zh: "草莓精灵贝利", es: "Hada Berry", fr: "Fée Berry" },
      title: { ko: "과일 안내자", en: "Fruit Guide", ja: "フルーツガイド", zh: "水果引导者", es: "Guía frutal", fr: "Guide fruité" },
      avatar: "🍓",
      text: {
        ko: "작은 체리부터 차근차근 모아봐요! 벽면에 닿을 땐 살짝 튕기니까 각도를 잘 노려야 해요!",
        en: "Start with small cherries! They bounce slightly off walls, so aim your angles carefully!",
        ja: "小さなサクランボからコツコツ集めよう！壁に当たると少し弾むから角度を狙ってね！",
        zh: "从娇小的樱桃开始积累吧！碰到玻璃壁时会有轻微反弹，看准角度再投放哦！",
        es: "¡Empieza con cerezas pequeñas! Rebotan suavemente en las paredes, ¡así que apunta bien!",
        fr: "Commencez par de petites cerises ! Elles rebondissent sur les parois, visez juste !",
      },
    },
  ],
  merge_success: [
    {
      speaker: "fairy_berry",
      name: { ko: "딸기 요정 베리", en: "Berry Fairy", ja: "妖精ベリー", zh: "草莓精灵贝利", es: "Hada Berry", fr: "Fée Berry" },
      title: { ko: "과일 안내자", en: "Fruit Guide", ja: "フルーツガイド", zh: "水果引导者", es: "Guía frutal", fr: "Guide fruité" },
      avatar: "✨",
      text: {
        ko: "와아! 퐁- 소리와 함께 더 큰 과일로 진화했어요! 주변 시공간 파동이 느껴져요!",
        en: "Pop! It evolved into a bigger fruit! Feel the juicy shockwave pulse through the box!",
        ja: "わあ！ポンッと心地よい音と共に進化しました！弾ける波紋が最高に気持ちいいですね！",
        zh: "哇！伴随着噗的一声进化成了更大的水果！周围的水果都被弹开了！",
        es: "¡Pop! ¡Evolucionó a una fruta más grande! ¡Siente la onda de choque por la caja!",
        fr: "Pop ! Le fruit a grandi ! Ressentez l'onde de choc juteuse dans la boîte !",
      },
    },
    {
      speaker: "gourmet_ruru",
      name: { ko: "미식가 루루", en: "Gourmet Ruru", ja: "美食家ルル", zh: "美食家鲁鲁", es: "Catador Ruru", fr: "Critique Ruru" },
      title: { ko: "달콤 감별사", en: "Sweetness Judge", ja: "甘味鑑定士", zh: "甜度评测官", es: "Juez gastronómico", fr: "Juge du goût" },
      avatar: "🧐",
      text: {
        ko: "음! 당도가 훌륭하게 응축되었군. 이 기세라면 연쇄 콤보도 노려볼 만하겠어!",
        en: "Exquisite sweetness! Keep up this momentum and we might see a spectacular chain combo!",
        ja: "うむ！糖度が実に素晴らしく凝축されておる。この勢いなら連鎖コンボも狙えるぞ！",
        zh: "嗯！糖分浓缩得相当完美。照这个势头，接下来的连锁合体指日可待！",
        es: "¡Exquisito dulzor! Mantén el ritmo y podríamos ver un combo en cadena espectacular.",
        fr: "Quelle douceur raffinée ! Continuez sur cette lancée pour déclencher un beau combo !",
      },
    },
  ],
  overfill_danger: [
    {
      speaker: "fairy_berry",
      name: { ko: "딸기 요정 베리", en: "Berry Fairy", ja: "妖精ベリー", zh: "草莓精灵贝利", es: "Hada Berry", fr: "Fée Berry" },
      title: { ko: "과일 안내자", en: "Fruit Guide", ja: "フルーツガイド", zh: "水果引导者", es: "Guía frutal", fr: "Guide fruité" },
      avatar: "⚠️",
      text: {
        ko: "조심해요! 상자가 넘치기 직전이에요! 흔들기(Shake) 버튼으로 과일들을 정돈해보세요!",
        en: "Watch out! The box is almost overflowing! Hit the Shake button to settle the pile!",
        ja: "危ない！箱から溢れそうだよ！シェイク（Shake）ボタンでフルーツを揺らして整理してみて！",
        zh: "小心！箱子快要溢出来了！快点按摇晃（Shake）按钮重新整理空隙！",
        es: "¡Cuidado! ¡La caja está a punto de rebalsar! ¡Pulsa Sacudir (Shake) para acomodar la pila!",
        fr: "Attention ! La boîte déborde presque ! Utilisez le bouton Secouer pour tasser les fruits !",
      },
    },
  ],
  watermelon_made: [
    {
      speaker: "master_pomodor",
      name: { ko: "포모도르 원장", en: "Master Pomodor", ja: "ポモドーロ園長", zh: "波莫多罗场长", es: "Maestro Pomodor", fr: "Maître Pomodor" },
      title: { ko: "햇살 과수원장", en: "Orchard Master", ja: "果樹園の主", zh: "阳光果园园长", es: "Director del huerto", fr: "Chef du verger" },
      avatar: "🏆",
      text: {
        ko: "해냈군, 해냈어! 마침내 찬란한 거대 수박이 탄생했다네! 자네는 과수원의 보물이야!",
        en: "You did it! The magnificent giant watermelon is born! You are the pride of our orchard!",
        ja: "やったぞ、やりおった！ついに輝く巨大スイカの完成じゃ！君は我が果樹園の誇りだ！",
        zh: "太棒了，成功了！光彩夺目的巨型西瓜终于诞生了！你是我们果园最大的骄傲！",
        es: "¡Lo lograste! ¡Ha nacido la magnífica sandía gigante! ¡Eres el orgullo del huerto!",
        fr: "Vous avez réussi ! La pastèque géante suprême est là ! Vous êtes la fierté du verger !",
      },
    },
  ],
  game_over: [
    {
      speaker: "master_pomodor",
      name: { ko: "포모도르 원장", en: "Master Pomodor", ja: "ポモドーロ園長", zh: "波莫多罗场长", es: "Maestro Pomodor", fr: "Maître Pomodor" },
      title: { ko: "햇살 과수원장", en: "Orchard Master", ja: "果樹園の主", zh: "阳光果园园长", es: "Director del huerto", fr: "Chef du verger" },
      avatar: "🌱",
      text: {
        ko: "아쉽지만 멋진 수확이었네! 모은 과일 즙으로 과수원 설비를 강화하고 다시 도전해보게나!",
        en: "A noble harvest! Use the squeezed juice to upgrade the orchard and try again!",
        ja: "惜しかったが素晴らしい収穫じゃった！集めた果汁で設備を強化し、また挑んでくれ！",
        zh: "虽然遗憾但成果斐然！用榨出的果汁去升级果园设施，下次一定能更上一层楼！",
        es: "¡Una cosecha admirable! ¡Usa el jugo obtenido para mejorar las instalaciones e inténtalo de nuevo!",
        fr: "Une belle récolte malgré tout ! Utilisez le jus recueilli pour améliorer le verger et retentez !",
      },
    },
  ],
};

export function pickSuikaDialogue(trigger: SuikaTrigger): SuikaDialogue {
  const list = SUIKA_DIALOGUES[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
