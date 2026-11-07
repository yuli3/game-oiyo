/**
 * 1010 블록 버스트 (BlockBurst) - 룬 로어 & 콤보 아나운서 HUD 시스템
 */

export type BlockBurstLoreSpeaker = "guardian_eldritch" | "caster_jack" | "mage_sera";

export type BlockBurstTrigger =
  | "game_start"
  | "line_cleared"
  | "combo_fever"
  | "grid_danger"
  | "game_over";

export interface BlockBurstDialogue {
  speaker: BlockBurstLoreSpeaker;
  name: Record<string, string>;
  title: Record<string, string>;
  avatar: string;
  text: Record<string, string>;
}

export const BLOCK_BURST_DIALOGUES: Record<BlockBurstTrigger, BlockBurstDialogue[]> = {
  game_start: [
    {
      speaker: "guardian_eldritch",
      name: { ko: "수호자 엘드리치", en: "Guardian Eldritch", ja: "守護者エルドリッチ", zh: "守护者埃尔德里奇", es: "Guardián Eldritch", fr: "Gardien Eldritch" },
      title: { ko: "고대 룬 성소지기", en: "Ancient Rune Keeper", ja: "古代ルーンの番人", zh: "古代符文守护者", es: "Guardián del santuario", fr: "Gardien des runes" },
      avatar: "🧙‍♂️",
      text: {
        ko: "고대 룬 격자에 온 것을 환영하네. 블록을 채워 가로·세로 라인을 완성하면 잠든 룬 에너지가 폭발할 걸세!",
        en: "Welcome to the ancient rune grid. Complete rows and columns to unleash sleeping celestial energy!",
        ja: "古代ルーンの格子へようこそ。ブロックを敷き詰め縦横のラインを揃えれば、眠れるエネルギーが爆発する！",
        zh: "欢迎来到远古符文方阵。填满横排或竖列即可唤醒沉睡的符文魔力大引爆！",
        es: "¡Bienvenido a la cuadrícula rúnica! Completa filas y columnas para desatar la energía cósmica.",
        fr: "Bienvenue sur la grille runique antique. Remplissez lignes et colonnes pour libérer l'énergie !",
      },
    },
    {
      speaker: "caster_jack",
      name: { ko: "캐스터 잭", en: "Caster Jack", ja: "実況ジャック", zh: "解说员杰克", es: "Comentarista Jack", fr: "Commentateur Jack" },
      title: { ko: "아케이드 중계관", en: "Arcade Announcer", ja: "アーケードアナウンサー", zh: "街机电竞赛事解说", es: "Locutor arcade", fr: "Animateur arcade" },
      avatar: "🎙️",
      text: {
        ko: "신사 숙녀 여러분! 두뇌와 손맛의 극한 블록 버스트가 시작됩니다! 연속 콤보를 만들어 폭발적인 점수를 노리세요!",
        en: "Ladies and gentlemen! The ultimate block burst challenge begins! Chain consecutive clears for insane scores!",
        ja: "レディース・アンド・ジェントルメン！頭脳と手応えの極限ブロックバースト開幕！連続コンボでハイスコアを狙え！",
        zh: "女士们先生们！智力与手感极致碰撞的方块大爆炸正式开幕！保持连击冲击疯狂高分！",
        es: "¡Damas y caballeros! ¡Empieza el desafío definitivo de bloques! ¡Encadena combos para puntuaciones increíbles!",
        fr: "Mesdames et messieurs ! Le défi ultime commence ! Enchaînez les lignes pour des scores explosifs !",
      },
    },
  ],
  line_cleared: [
    {
      speaker: "caster_jack",
      name: { ko: "캐스터 잭", en: "Caster Jack", ja: "実況ジャック", zh: "解说员杰克", es: "Comentarista Jack", fr: "Commentateur Jack" },
      title: { ko: "아케이드 중계관", en: "Arcade Announcer", ja: "アーケードアナウンサー", zh: "街机电竞赛事解说", es: "Locutor arcade", fr: "Animateur arcade" },
      avatar: "💥",
      text: {
        ko: "깨끗하게 지워냈습니다! 완벽한 라인 정렬로 격자 공간을 멋지게 확보했군요!",
        en: "Clean detonation! Brilliant line alignment clears the grid in style!",
        ja: "見事な爆破消去！完璧なライン揃えでスペースを鮮やかに確保しました！",
        zh: "漂亮利落的消除！完美的线条排列，干脆利落地腾出了宝贵空间！",
        es: "¡Limpia detonación! Una alineación impecable que despeja la cuadrícula con estilo.",
        fr: "Détonation nette ! Un alignement parfait qui libère la grille avec panache !",
      },
    },
    {
      speaker: "mage_sera",
      name: { ko: "룬 마법사 세라", en: "Mage Sera", ja: "魔導士セラ", zh: "符文法师塞拉", es: "Maga Sera", fr: "Mage Sera" },
      title: { ko: "비전 분석관", en: "Arcane Analyst", ja: "秘術アナリスト", zh: "奥术分析官", es: "Analista arcana", fr: "Analyste arcanique" },
      avatar: "🔮",
      text: {
        ko: "크리스탈 파편의 공명이 느껴져요! 다음 블록의 형태를 미리 보며 다중 라인을 노려보세요!",
        en: "I sense crystal resonance! Check the queue ahead and aim for a cross or multi-line clear!",
        ja: "クリスタル破片の共鳴を感じます！次の一手を先読みして十字や複数ラインを狙いましょう！",
        zh: "感受到了晶石碎片的共鸣！预先观察下一个方块，瞄准十字或多重同时消除吧！",
        es: "¡Siento la resonancia rúnica! Revisa la cola de piezas y apunta a una eliminación múltiple.",
        fr: "Je ressens la résonance des cristaux ! Anticipez la file pour viser un coup multiple !",
      },
    },
  ],
  combo_fever: [
    {
      speaker: "caster_jack",
      name: { ko: "캐스터 잭", en: "Caster Jack", ja: "実況ジャック", zh: "解说员杰克", es: "Comentarista Jack", fr: "Commentateur Jack" },
      title: { ko: "아케이드 중계관", en: "Arcade Announcer", ja: "アーケードアナウンサー", zh: "街机电竞赛事解说", es: "Locutor arcade", fr: "Animateur arcade" },
      avatar: "🔥",
      text: {
        ko: "피버 콤보 발동! 멈추지 않는 연쇄 폭파로 아레나 전체가 뜨겁게 달아오릅니다!",
        en: "COMBO FEVER! Unstoppable chain reactions are setting the entire arena on fire!",
        ja: "フィーバーコンボ発動！止まらない連鎖爆破でアリーナ全体が大熱狂しています！",
        zh: "连击狂热爆发！势不可挡的连续大爆炸彻底点燃了全场气氛！",
        es: "¡FIEBRE DE COMBOS! ¡Reacciones en cadena imparables están encendiendo la arena!",
        fr: "FIÈVRE DU COMBO ! Des réactions en chaîne incontrôlables enflamment l'arène !",
      },
    },
  ],
  grid_danger: [
    {
      speaker: "mage_sera",
      name: { ko: "룬 마법사 세라", en: "Mage Sera", ja: "魔導士セラ", zh: "符文法师塞拉", es: "Maga Sera", fr: "Mage Sera" },
      title: { ko: "비전 분석관", en: "Arcane Analyst", ja: "秘術アナリスト", zh: "奥术分析官", es: "Analista arcana", fr: "Analyste arcanique" },
      avatar: "⚠️",
      text: {
        ko: "경고! 격자 공간이 75% 이상 찼어요! 더 큰 블록이 들어올 공간을 즉시 만들어야 해요!",
        en: "Warning! The grid is over 75% full! Clear space immediately before larger shapes appear!",
        ja: "警告！格子の75%以上が埋まりました！大型ブロックが入る隙間を早急に確保してください！",
        zh: "危险警告！方阵空间已填满超过75%！请立刻消除，否则大尺寸方块将无法容纳！",
        es: "¡Alerta! ¡La cuadrícula está al 75%! Despeja espacio antes de que lleguen piezas grandes.",
        fr: "Attention ! La grille est remplie à plus de 75% ! Libérez de la place d'urgence !",
      },
    },
  ],
  game_over: [
    {
      speaker: "guardian_eldritch",
      name: { ko: "수호자 엘드리치", en: "Guardian Eldritch", ja: "守護者エルドリッチ", zh: "守护者埃尔德里奇", es: "Guardián Eldritch", fr: "Gardien Eldritch" },
      title: { ko: "고대 룬 성소지기", en: "Ancient Rune Keeper", ja: "古代ルーンの番人", zh: "古代符文守护者", es: "Guardián del santuario", fr: "Gardien des runes" },
      avatar: "🛡️",
      text: {
        ko: "공간이 다하였으나 훌륭한 두뇌 유희였네. 획득한 룬 크리스탈로 성소 능력을 강화하고 다시 맞서게나!",
        en: "The grid is exhausted, but what a noble mind game! Upgrade rune sanctuary powers and rise again!",
        ja: "空間は尽きたが実に見事な知恵比べであった。手に入れたルーンで聖所を強化し再び挑まれよ！",
        zh: "棋盘虽满但智谋绝伦。用收获的符文水晶强化圣所秘术，期待你卷土重来！",
        es: "Se agotó el espacio, ¡pero qué gran partida! Mejora el santuario rúnico y vuelve a intentarlo.",
        fr: "Plus de place sur la grille, mais quel bel esprit ! Améliorez le sanctuaire et revenez plus fort !",
      },
    },
  ],
};

export function pickBlockBurstDialogue(trigger: BlockBurstTrigger): BlockBurstDialogue {
  const list = BLOCK_BURST_DIALOGUES[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
