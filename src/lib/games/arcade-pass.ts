/**
 * @file arcade-pass.ts
 * @description Pillar 4: Meta-Progression & Retention (M4).
 * Generates deterministic daily missions across flagship arcade titles,
 * tracks player XP and unlocks studio rank tier titles (RECRUIT -> LEGEND).
 */

export type ArcadeRankTier =
  | "RECRUIT"
  | "CHALLENGER"
  | "VETERAN"
  | "ELITE"
  | "LEGEND";

export interface DailyMission {
  id: string;
  gameSlug: string;
  title: Record<string, string>;
  goal: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

export interface ArcadePassProgress {
  xp: number;
  completedMissionIds: string[];
  missions: DailyMission[];
  lastActiveDate: string;
  streakCount?: number;
  lastCheckInDate?: string;
  claimedStreakDays?: number[];
  equippedTitleId?: string;
}

export interface ArcadeTitle {
  id: string;
  badge: string;
  requiredXp: number;
  name: Record<string, string>;
  description: Record<string, string>;
}

export const ARCADE_TITLES: ArcadeTitle[] = [
  {
    id: "novice",
    badge: "🔰",
    requiredXp: 0,
    name: { ko: "초심자", en: "Novice", ja: "初心者", zh: "初学者", fr: "Novice", es: "Novato" },
    description: {
      ko: "아케이드의 세계에 첫 발을 내딛은 도전자",
      en: "First step into the arcade universe",
      ja: "アーケードの世界に足を踏み入れた挑戦者",
      zh: "迈入街机宇宙的新人",
      fr: "Premier pas dans l'univers arcade",
      es: "Primer paso en el universo arcade",
    },
  },
  {
    id: "puzzler",
    badge: "🧩",
    requiredXp: 100,
    name: { ko: "퍼즐 탐험가", en: "Puzzle Master", ja: "パズル達人", zh: "解谜大师", fr: "Maître du Puzzle", es: "Maestro del Puzle" },
    description: {
      ko: "스도쿠·워들과 같은 논리 퍼즐의 패턴을 꿰뚫어본 자",
      en: "A keen mind that deciphers daily logic puzzles",
      ja: "数独やワードルの論理パターンを見抜く者",
      zh: "洞悉每日逻辑谜题规律的智者",
      fr: "Un esprit vif qui déchiffre les puzzles quotidiens",
      es: "Una mente aguda que descifra puzles diarios",
    },
  },
  {
    id: "combomaster",
    badge: "🔥",
    requiredXp: 300,
    name: { ko: "콤보 장인", en: "Combo Master", ja: "コンボ職人", zh: "连击宗师", fr: "Maître du Combo", es: "Maestro del Combo" },
    description: {
      ko: "블록 버스트와 벽돌깨기에서 멈추지 않는 연쇄를 일으키는 자",
      en: "Unleashes endless chain reactions in arcade games",
      ja: "止まらない連鎖を引き起こす職人",
      zh: "在打砖块与消除中掀起连环风暴",
      fr: "Déclenche des réactions en chaîne sans fin",
      es: "Desata reacciones en cadena infinitas",
    },
  },
  {
    id: "strategist",
    badge: "♟️",
    requiredXp: 600,
    name: { ko: "신의 한 수", en: "Grand Strategist", ja: "神の一手", zh: "神之一手", fr: "Grand Stratège", es: "Gran Estratega" },
    description: {
      ko: "오목·체스·장기 판에서 한 수 앞선 승리를 이끄는 지략가",
      en: "Calculates every movement in board classics",
      ja: "五目並べやチェスで常に先を読む知略家",
      zh: "在棋盘上运筹帷幄的战术家",
      fr: "Calcule chaque mouvement dans les classiques",
      es: "Calcula cada movimiento en clásicos del tablero",
    },
  },
  {
    id: "survivor",
    badge: "🛡️",
    requiredXp: 1000,
    name: { ko: "불굴의 생존자", en: "Undying Survivor", ja: "不屈の生存者", zh: "不屈幸存者", fr: "Survivant Indomptable", es: "Superviviente Indomable" },
    description: {
      ko: "스웜 무리의 탄막 속에서도 끝까지 살아남는 전설",
      en: "Endures the bullet swarm until ultimate victory",
      ja: "弾幕の嵐の中でも生き残る伝説",
      zh: "在弹幕狂潮中浴火重生的传奇",
      fr: "Endure les vagues d'ennemis jusqu'à la victoire",
      es: "Soporta el enjambre de balas hasta la victoria",
    },
  },
  {
    id: "legend",
    badge: "👑",
    requiredXp: 2000,
    name: { ko: "아케이드 레전드", en: "Arcade Legend", ja: "アーケード伝説", zh: "街机传奇", fr: "Légende Arcade", es: "Leyenda Arcade" },
    description: {
      ko: "OIYO 아케이드 명예의 전당 정점에 오른 전설의 플레이어",
      en: "Reached the pinnacle of the OIYO Arcade Hall of Fame",
      ja: "OIYOアーケード殿堂の頂点に立った伝説",
      zh: "登顶OIYO街机名人堂顶峰的传说",
      fr: "Atteint le sommet du Hall of Fame Arcade",
      es: "Alcanzó la cúspide del Salón de la Fama Arcade",
    },
  },
];

export function getUnlockedTitles(xp: number): ArcadeTitle[] {
  return ARCADE_TITLES.filter((t) => xp >= t.requiredXp);
}

export function equipArcadeTitle(
  progress: ArcadePassProgress,
  titleId: string
): ArcadePassProgress {
  const title = ARCADE_TITLES.find((t) => t.id === titleId);
  if (!title || progress.xp < title.requiredXp) {
    return progress;
  }

  const updated: ArcadePassProgress = {
    ...progress,
    equippedTitleId: titleId,
  };

  saveArcadePassProgress(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("oiyo:title-changed", { detail: { titleId } })
    );
  }

  return updated;
}

export function getEquippedTitleData(
  progress: ArcadePassProgress | null,
  locale: string = "ko"
): { id: string; badge: string; name: string } {
  const titleId = progress?.equippedTitleId ?? "novice";
  const title = ARCADE_TITLES.find((t) => t.id === titleId) ?? ARCADE_TITLES[0];
  const name = title.name[locale] ?? title.name.en ?? title.name.ko;
  return {
    id: title.id,
    badge: title.badge,
    name,
  };
}

export interface DailyStreakReward {
  day: number;
  xp: number;
  isMilestone?: boolean;
}

export const STREAK_REWARDS: DailyStreakReward[] = [
  { day: 1, xp: 20 },
  { day: 2, xp: 30 },
  { day: 3, xp: 50, isMilestone: true },
  { day: 4, xp: 20 },
  { day: 5, xp: 30 },
  { day: 6, xp: 40 },
  { day: 7, xp: 100, isMilestone: true },
];

export function checkInDailyStreak(
  progress: ArcadePassProgress,
  today: string,
  previousDay: string
): {
  updatedProgress: ArcadePassProgress;
  bonusXp: number;
  currentStreak: number;
  alreadyCheckedIn: boolean;
} {
  const lastCheckIn = progress.lastCheckInDate;
  if (lastCheckIn === today) {
    return {
      updatedProgress: progress,
      bonusXp: 0,
      currentStreak: progress.streakCount ?? 1,
      alreadyCheckedIn: true,
    };
  }

  const isConsecutive = lastCheckIn === previousDay;
  const currentStreak = isConsecutive
    ? Math.min(7, ((progress.streakCount ?? 0) % 7) + 1)
    : 1;

  const claimedDays = isConsecutive && currentStreak > 1
    ? [...(progress.claimedStreakDays ?? []), currentStreak]
    : [currentStreak];

  const reward = STREAK_REWARDS.find((r) => r.day === currentStreak);
  const bonusXp = reward ? reward.xp : 20;

  const updatedProgress: ArcadePassProgress = {
    ...progress,
    xp: progress.xp + bonusXp,
    streakCount: currentStreak,
    lastCheckInDate: today,
    claimedStreakDays: claimedDays,
  };

  saveArcadePassProgress(updatedProgress);

  return {
    updatedProgress,
    bonusXp,
    currentStreak,
    alreadyCheckedIn: false,
  };
}

export const MISSION_CATALOG: Array<{
  id: string;
  gameSlug: string;
  title: Record<string, string>;
  goal: number;
  xpReward: number;
}> = [
  {
    id: "2048-reach-512",
    gameSlug: "game-2048",
    title: {
      ko: "2048에서 512 이상 타일 달성",
      en: "Reach 512+ tile in 2048",
      ja: "2048で512タイル以上を達成",
      zh: "在2048中达成512以上方块",
      fr: "Atteindre la tuile 512+ dans 2048",
      es: "Alcanza la ficha 512+ en 2048",
    },
    goal: 512,
    xpReward: 50,
  },
  {
    id: "snake-score-100",
    gameSlug: "snake-game",
    title: {
      ko: "스네이크에서 100점 이상 달성",
      en: "Score 100+ points in Snake Arcade",
      ja: "スネークで100点以上を獲得",
      zh: "在贪吃蛇中取得100分以上",
      fr: "Marquer 100+ points dans Snake",
      es: "Consigue 100+ puntos en Snake",
    },
    goal: 100,
    xpReward: 50,
  },
  {
    id: "cosmic-score-3000",
    gameSlug: "cosmic-merge",
    title: {
      ko: "코스믹 머지에서 3,000점 이상 달성",
      en: "Score 3,000+ points in Cosmic Merge",
      ja: "コズミックマージで3,000点以上を獲得",
      zh: "在宇宙合成中取得3,000分以上",
      fr: "Marquer 3 000+ points dans Cosmic Merge",
      es: "Consigue 3.000+ puntos en Cosmic Merge",
    },
    goal: 3000,
    xpReward: 50,
  },
  {
    id: "wordle-solve",
    gameSlug: "wordle",
    title: {
      ko: "워들 데일리 퍼즐 1회 클리어",
      en: "Solve 1 Wordle puzzle",
      ja: "ワードルパズルを1問クリア",
      zh: "解开1局Wordle谜题",
      fr: "Résoudre 1 puzzle Wordle",
      es: "Resuelve 1 puzzle de Wordle",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "sudoku-solve",
    gameSlug: "sudoku",
    title: {
      ko: "스도쿠 퍼즐 1회 클리어",
      en: "Solve 1 Sudoku board",
      ja: "数独盤面を1問クリア",
      zh: "完成1局数独对局",
      fr: "Résoudre 1 grille de Sudoku",
      es: "Resuelve 1 tablero de Sudoku",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "survivor-kills-50",
    gameSlug: "neon-survivor",
    title: {
      ko: "네온 서바이버에서 적 50기 격추",
      en: "Defeat 50 swarm enemies in Neon Survivor",
      ja: "ネオン・サバイバーで敵を50体撃破",
      zh: "在霓虹幸存者中击破50名敌人",
      fr: "Éliminer 50 ennemis dans Neon Survivor",
      es: "Derrota 50 enemigos en Neon Survivor",
    },
    goal: 50,
    xpReward: 50,
  },
  {
    id: "blockburst-score-500",
    gameSlug: "block-burst",
    title: {
      ko: "블록 버스트에서 500점 이상 달성",
      en: "Score 500+ points in Block Burst",
      ja: "ブロックバーストで500点以上を獲得",
      zh: "在方块消除中取得500分以上",
      fr: "Marquer 500+ points dans Block Burst",
      es: "Consigue 500+ puntos en Block Burst",
    },
    goal: 500,
    xpReward: 50,
  },
  {
    id: "brickbreaker-score-300",
    gameSlug: "brick-breaker",
    title: {
      ko: "벽돌깨기에서 300점 이상 달성",
      en: "Score 300+ points in Brick Breaker",
      ja: "ブロック崩しで300点以上を獲得",
      zh: "在打砖块中取得300分以上",
      fr: "Marquer 300+ points dans Brick Breaker",
      es: "Consigue 300+ puntos en Brick Breaker",
    },
    goal: 300,
    xpReward: 50,
  },
  {
    id: "watersort-solve",
    gameSlug: "water-sort",
    title: {
      ko: "워터 소트 퍼즐 1회 정제 완료",
      en: "Complete 1 Water Sort puzzle",
      ja: "ウォーターソートパズルを1問クリア",
      zh: "完成1局倒水排序",
      fr: "Compléter 1 puzzle Water Sort",
      es: "Completa 1 puzle de Water Sort",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "wordgroups-solve",
    gameSlug: "word-groups",
    title: {
      ko: "네 묶음 단어 퍼즐 1회 클리어",
      en: "Solve 1 Word Groups puzzle",
      ja: "四つのグループ単語パズルを1問クリア",
      zh: "完成1局四组词猜谜",
      fr: "Résoudre 1 puzzle de Quatre groupes",
      es: "Resuelve 1 puzle de Cuatro grupos",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "dominologic-solve",
    gameSlug: "domino-logic",
    title: {
      ko: "도미노 칸 맞추기 퍼즐 1회 완료",
      en: "Complete 1 Domino Logic puzzle",
      ja: "ドミノのマス推理パズルを1問クリア",
      zh: "完成1局多米诺填格",
      fr: "Compléter 1 puzzle de Cases de dominos",
      es: "Completa 1 puzle de Casillas de dominó",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "liaronephone-play",
    gameSlug: "liar-onephone",
    title: {
      ko: "라이어 한 폰 파티 게임 1회 플레이",
      en: "Play 1 round of One-Phone Liar",
      ja: "一台ライアーゲームを1回プレイ",
      zh: "游玩1局一机说谎者",
      fr: "Jouer 1 manche de Menteur un téléphone",
      es: "Juega 1 ronda de Mentiroso de un móvil",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "cardsurge-score",
    gameSlug: "card-surge",
    title: {
      ko: "카드 서지에서 단일 핸드로 500점 이상 획득",
      en: "Score 500+ points in a single hand in Card Surge",
      ja: "カードサージで1役500点以上を獲得",
      zh: "在卡牌狂涌中单手出牌取得500分以上",
      fr: "Marquer 500+ points en une main dans Card Surge",
      es: "Consigue 500+ puntos en una mano en Card Surge",
    },
    goal: 500,
    xpReward: 50,
  },
  {
    id: "cybertrack-lap",
    gameSlug: "cyber-track",
    title: {
      ko: "사이버 트랙 3D에서 트랙 1랩 완주하기",
      en: "Complete 1 full lap in CyberTrack 3D",
      ja: "サイバートラック 3Dでコースを1ラップ完走",
      zh: "在赛博赛道 3D中完成1圈赛道冲线",
      fr: "Terminer 1 tour complet dans CyberTrack 3D",
      es: "Completa 1 vuelta completa en CyberTrack 3D",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "hexasort-clear",
    gameSlug: "hexa-sort",
    title: {
      ko: "헥사 소트 3D에서 타일 스택 1회 이상 클리어",
      en: "Clear at least 1 tile stack in Hexa Sort 3D",
      ja: "ヘキサソート 3Dでタイル束を1回以上消去",
      zh: "在六角排序 3D中至少完成1次10连瓷砖消除",
      fr: "Éliminer au moins 1 pile de tuiles dans Hexa Sort 3D",
      es: "Elimina al menos 1 pila de fichas en Hexa Sort 3D",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "blockblast-combo",
    gameSlug: "block-blast",
    title: {
      ko: "블록 블래스트 인피니트에서 2연쇄 콤보 이상 달성",
      en: "Achieve a 2+ combo chain in Block Blast Infinite",
      ja: "ブロックブラスト インフィニティで2連鎖以上を達成",
      zh: "在方块爆破 无限中达成2连击以上Combo",
      fr: "Réussir un combo de 2+ dans Block Blast Infinite",
      es: "Consigue un combo de 2 o más en Block Blast Infinite",
    },
    goal: 2,
    xpReward: 50,
  },
  {
    id: "wordwaffle-solve",
    gameSlug: "word-waffle",
    title: {
      ko: "단어 와플에서 와플 격자 1회 풀기",
      en: "Solve 1 waffle grid in Word Waffle",
      ja: "ワードワッフルでワッフル盤面を1回完成",
      zh: "在文字华夫饼中解开1次华夫格子",
      fr: "Résoudre 1 grille dans Word Waffle",
      es: "Resuelve 1 cuadrícula en Word Waffle",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "slicemaster-score-500",
    gameSlug: "slice-master",
    title: {
      ko: "슬라이스 마스터에서 500점 이상 달성",
      en: "Score 500+ points in Slice Master",
      ja: "スライスマスターで500点以上を獲得",
      zh: "在切片大师中获得500分以上",
      fr: "Marquer 500+ points dans Slice Master",
      es: "Consigue 500+ puntos en Slice Master",
    },
    goal: 500,
    xpReward: 50,
  },
  {
    id: "minimetro-deliver-20",
    gameSlug: "mini-metro",
    title: {
      ko: "미니 메트로에서 승객 20명 수송 완료",
      en: "Transport 20 passengers in Mini Metro",
      ja: "ミニメトロで乗客20名を輸送",
      zh: "在迷你地铁中运送20名乘客",
      fr: "Transporter 20 passagers dans Mini Metro",
      es: "Transporta 20 pasajeros en Mini Metro",
    },
    goal: 20,
    xpReward: 50,
  },
  {
    id: "peglin-damage-200",
    gameSlug: "peglin-rogue",
    title: {
      ko: "페글린 로그에서 단일 턴 200 이상 대미지 달성",
      en: "Deal 200+ turn damage in Peglin Rogue",
      ja: "ペグリンローグで1ターン200以上のダメージを達成",
      zh: "在弹珠地牢中单回合打出200点以上伤害",
      fr: "Infliger 200+ dégâts en un tour dans Peglin Rogue",
      es: "Inflige 200+ de daño en un turno en Peglin Rogue",
    },
    goal: 200,
    xpReward: 50,
  },
  {
    id: "subwayrunner-distance-500",
    gameSlug: "subway-runner",
    title: {
      ko: "러너 빌더에서 500m 이상 질주 달성",
      en: "Sprint 500+ meters in Subway Mini-Parkour",
      ja: "ランナービルダーで500m以上の疾走を達成",
      zh: "在跑酷大师中奔跑达到500米以上",
      fr: "Courir 500+ mètres dans Subway Mini-Parkour",
      es: "Corre 500+ metros en Subway Mini-Parkour",
    },
    goal: 500,
    xpReward: 50,
  },
  {
    id: "shotgunchess-floor-2",
    gameSlug: "shotgun-chess",
    title: {
      ko: "샷건 체스에서 2층 이상 돌파 달성",
      en: "Reach Floor 2 or higher in Shotgun Chess",
      ja: "ショットガン チェスでフロア2以上へ到達",
      zh: "在散弹枪象棋中突破到达第2层以上",
      fr: "Atteindre l'étage 2 ou plus dans Shotgun Chess",
      es: "Alcanza el piso 2 o superior en Shotgun Chess",
    },
    goal: 2,
    xpReward: 50,
  },
  {
    id: "spelltower-words-5",
    gameSlug: "spell-tower",
    title: {
      ko: "스펠 타워에서 단어 5개 이상 완성 달성",
      en: "Form 5 or more words in SpellTower",
      ja: "スペルタワーで5単語以上の完成を達成",
      zh: "在拼字高塔中完成拼写5个以上单词",
      fr: "Former 5 mots ou plus dans SpellTower",
      es: "Forma 5 o más palabras en SpellTower",
    },
    goal: 5,
    xpReward: 50,
  },
  {
    id: "watersort-level-1",
    gameSlug: "water-sort-3d",
    title: {
      ko: "워터 소트에서 1개 레벨 이상 정렬 완료",
      en: "Complete 1 or more levels in Water Sort 3D",
      ja: "ウォーターソートで1レベル以上の整列を完了",
      zh: "在水排序3D中完成1关以上的色彩排序",
      fr: "Terminer 1 niveau ou plus dans Water Sort 3D",
      es: "Completa 1 nivel o más en Water Sort 3D",
    },
    goal: 1,
    xpReward: 50,
  },
  {
    id: "vampire-survive-60s",
    gameSlug: "vampire-survivor",
    title: {
      ko: "뱀파이어 서바이벌에서 60초 이상 생존하기",
      en: "Survive for 60 seconds or more in Vampire Survivor",
      ja: "ヴァンパイア・サバイバーで60秒以上生存する",
      zh: "在吸血鬼幸存者中生存达到60秒以上",
      fr: "Survivre pendant 60 secondes ou plus dans Vampire Survivor",
      es: "Sobrevive 60 segundos o más en Vampire Survivor",
    },
    goal: 60,
    xpReward: 50,
  },
  {
    id: "backpack-floor-2",
    gameSlug: "backpack-hero",
    title: {
      ko: "백팩 히어로에서 지하 2층 이상 도달하기",
      en: "Reach Floor 2 or deeper in Backpack Hero",
      ja: "バックパック・ヒーローで地下2階以上に到達する",
      zh: "在背包英雄中到达地下2层或更深处",
      fr: "Atteindre l'étage 2 ou plus dans Backpack Hero",
      es: "Alcanza el piso 2 o superior en Backpack Hero",
    },
    goal: 2,
    xpReward: 50,
  },
  {
    id: "baba-level-2",
    gameSlug: "baba-rule-shifter",
    title: {
      ko: "바바 룰 시프터에서 2개 레벨 이상 클리어하기",
      en: "Solve 2 or more levels in Baba Rule Shifter",
      ja: "ババ・ルールシフターで2レベル以上をクリアする",
      zh: "在芭芭变形记中通关2关以上谜题",
      fr: "Résoudre 2 niveaux ou plus dans Baba Rule Shifter",
      es: "Supera 2 o más niveles en Baba Rule Shifter",
    },
    goal: 2,
    xpReward: 50,
  },
  {
    id: "paper-flight-distance",
    gameSlug: "paper-flight-3d",
    title: {
      ko: "종이비행기 3D에서 300m 이상 활강 비행하기",
      en: "Glide 300m or farther in Paper Flight 3D",
      ja: "紙飛行機 3Dで300m以上を滑空飛行する",
      zh: "在纸飞机 3D 中滑翔飞行突破 300 米",
      fr: "Planez sur 300 m ou plus dans Paper Flight 3D",
      es: "Vuela 300 m o más en Paper Flight 3D",
    },
    goal: 300,
    xpReward: 50,
  },
  {
    id: "merge-mansion-quest-1",
    gameSlug: "merge-mansion",
    title: {
      ko: "머지 맨션에서 대저택 복원 의뢰 1건 이상 완료하기",
      en: "Complete 1 or more estate renovation quests in Merge Mansion",
      ja: "マージマンションで屋敷修復の依頼を1件以上達成する",
      zh: "在庄园合合乐中完成 1 项以上豪宅修缮委托",
      fr: "Terminez 1 mission de rénovation dans Merge Mansion",
      es: "Completa 1 misión de renovación en Merge Mansion",
    },
    goal: 1,
    xpReward: 50,
  },
];

export function calculateArcadeTier(xp: number): ArcadeRankTier {
  if (xp >= 1000) return "LEGEND";
  if (xp >= 600) return "ELITE";
  if (xp >= 300) return "VETERAN";
  if (xp >= 100) return "CHALLENGER";
  return "RECRUIT";
}

export interface ArcadeLevelInfo {
  level: number;
  rankTitle: ArcadeRankTier;
  currentLevelXp: number;
  nextLevelXp: number;
  percent: number;
}

export function calculateArcadeLevel(xp: number): ArcadeLevelInfo {
  const level = Math.min(20, Math.max(1, Math.floor(xp / 100) + 1));
  const currentLevelXp = xp % 100;
  const nextLevelXp = 100;
  const percent = level >= 20 ? 100 : Math.floor((currentLevelXp / nextLevelXp) * 100);
  const rankTitle = calculateArcadeTier(xp);
  return {
    level,
    rankTitle,
    currentLevelXp,
    nextLevelXp,
    percent,
  };
}

export function awardMatchPlayXp(
  progress: ArcadePassProgress,
  won: boolean
): { nextProgress: ArcadePassProgress; gainedXp: number; levelUp: boolean } {
  const gainedXp = won ? 25 : 10;
  const prevLevel = calculateArcadeLevel(progress.xp).level;
  const nextXp = progress.xp + gainedXp;
  const nextLevel = calculateArcadeLevel(nextXp).level;
  const nextProgress: ArcadePassProgress = {
    ...progress,
    xp: nextXp,
  };
  return {
    nextProgress,
    gainedXp,
    levelUp: nextLevel > prevLevel,
  };
}

/**
 * Deterministic PRNG seed from date string (YYYY-MM-DD)
 */
function dateSeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDailyMissions(dateKey: string): DailyMission[] {
  const seed = dateSeed(dateKey);
  const shuffled = [...MISSION_CATALOG].sort((a, b) => {
    const hashA = (dateSeed(a.id) ^ seed) >>> 0;
    const hashB = (dateSeed(b.id) ^ seed) >>> 0;
    return hashA - hashB;
  });

  return shuffled.slice(0, 3).map((item) => ({
    id: item.id,
    gameSlug: item.gameSlug,
    title: item.title,
    goal: item.goal,
    current: 0,
    xpReward: item.xpReward,
    completed: false,
  }));
}

export function reportMissionProgress(
  progress: ArcadePassProgress,
  gameSlug: string,
  progressValue: number
): ArcadePassProgress {
  let gainedXp = 0;
  const nextCompleted = [...progress.completedMissionIds];

  const nextMissions = progress.missions.map((m) => {
    if (m.gameSlug !== gameSlug || m.completed) return m;

    const nextCurrent = Math.max(m.current, progressValue);
    const isNowCompleted = nextCurrent >= m.goal;

    if (isNowCompleted && !m.completed) {
      gainedXp += m.xpReward;
      nextCompleted.push(m.id);
    }

    return {
      ...m,
      current: nextCurrent,
      completed: isNowCompleted,
    };
  });

  return {
    ...progress,
    xp: progress.xp + gainedXp,
    completedMissionIds: nextCompleted,
    missions: nextMissions,
  };
}

const STORAGE_KEY = "oiyo_arcade_pass_v1";

export function loadArcadePassProgress(dateKey: string): ArcadePassProgress {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      xp: 0,
      completedMissionIds: [],
      missions: generateDailyMissions(dateKey),
      lastActiveDate: dateKey,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: ArcadePassProgress = {
        xp: 0,
        completedMissionIds: [],
        missions: generateDailyMissions(dateKey),
        lastActiveDate: dateKey,
      };
      saveArcadePassProgress(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as ArcadePassProgress;
    if (parsed.lastActiveDate !== dateKey) {
      // New day roll
      const next: ArcadePassProgress = {
        xp: parsed.xp ?? 0,
        completedMissionIds: parsed.completedMissionIds ?? [],
        missions: generateDailyMissions(dateKey),
        lastActiveDate: dateKey,
        streakCount: parsed.streakCount ?? 0,
        lastCheckInDate: parsed.lastCheckInDate,
        claimedStreakDays: parsed.claimedStreakDays ?? [],
        equippedTitleId: parsed.equippedTitleId,
      };
      saveArcadePassProgress(next);
      return next;
    }
    return parsed;
  } catch {
    return {
      xp: 0,
      completedMissionIds: [],
      missions: generateDailyMissions(dateKey),
      lastActiveDate: dateKey,
    };
  }
}

export function saveArcadePassProgress(progress: ArcadePassProgress): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota
  }
}
