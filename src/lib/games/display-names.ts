import type { Locale } from "../i18n";

type LocalizedName = Record<Locale, string>;

const name = (ko: string, en: string, ja: string, zh: string, fr: string, es: string): LocalizedName =>
  ({ ko, en, ja, zh, fr, es });

/** Canonical labels for every game that currently writes to records.ts. */
export const GAME_DISPLAY_NAMES: Record<string, LocalizedName> = {
  chess: name("체스", "Chess", "チェス", "国际象棋", "Échecs", "Ajedrez"),
  checkers: name("체커", "Checkers", "チェッカー", "西洋跳棋", "Dames", "Damas"),
  connectfour: name("커넥트 포", "Connect Four", "コネクトフォー", "四子棋", "Puissance 4", "Cuatro en línea"),
  dominoes: name("도미노", "Dominoes", "ドミノ", "多米诺骨牌", "Dominos", "Dominó"),
  freecell: name("프리셀", "FreeCell", "フリーセル", "空当接龙", "FreeCell", "Carta blanca"),
  gomoku: name("오목", "Gomoku", "五目並べ", "五子棋", "Gomoku", "Gomoku"),
  janggi: name("장기", "Janggi", "チャンギ", "韩国象棋", "Janggi", "Janggi"),
  kingdomino: name("킹도미노", "Kingdomino", "キングドミノ", "王国多米诺", "Kingdomino", "Kingdomino"),
  mahjong: name("마작", "Mahjong", "麻雀", "麻将", "Mah-jong", "Mahjong"),
  reversi: name("리버시", "Reversi", "リバーシ", "黑白棋", "Reversi", "Reversi"),
  solitaire: name("솔리테어", "Solitaire", "ソリティア", "纸牌接龙", "Solitaire", "Solitario"),
  "texas-holdem": name("텍사스 홀덤", "Texas Hold'em", "テキサスホールデム", "德州扑克", "Texas Hold'em", "Texas Hold'em"),
  wordle: name("워들", "Wordle", "ワードル", "猜词游戏", "Wordle", "Wordle"),
  "korean-semantle": name("꼬맨틀", "Kkomantle", "꼬맨틀", "韩语语义猜词", "Kkomantle", "Kkomantle"),
  kurodoko: name("쿠로도코", "Kurodoko", "黒どこ", "黑格谜题", "Kurodoko", "Kurodoko"),
  "tents-and-trees": name("나무와 텐트", "Tents and Trees", "テントと木", "帐篷与树", "Tentes et arbres", "Tiendas y árboles"),
  "minesweeper-daily": name("데일리 지뢰찾기", "Daily Minesweeper", "デイリーマインスイーパー", "每日扫雷", "Démineur du jour", "Buscaminas diario"),
  minesweeper: name("지뢰찾기", "Minesweeper", "マインスイーパー", "扫雷", "Démineur", "Buscaminas"),
  sudoku: name("스도쿠", "Sudoku", "数独", "数独", "Sudoku", "Sudoku"),
  "game-2048": name("2048", "2048", "2048", "2048", "2048", "2048"),
  "snake-game": name("스네이크", "Snake", "スネーク", "贪吃蛇", "Serpent", "Serpiente"),
  plinko: name("플링코", "Plinko", "プリンコ", "弹珠盘", "Plinko", "Plinko"),
  "whack-a-mole": name("두더지 잡기", "Whack-a-Mole", "モグラたたき", "打地鼠", "Tape-taupe", "Golpea al topo"),
  "brick-breaker": name("벽돌 깨기", "Brick Breaker", "ブロック崩し", "打砖块", "Casse-briques", "Rompebloques"),
  "stack-tower": name("스택 타워", "Stack Tower", "スタックタワー", "堆叠塔", "Tour empilée", "Torre apilable"),
  "star-blaster": name("스타 블래스터", "Star Blaster", "スターブラスター", "星际射击", "Star Blaster", "Star Blaster"),
  "rhythm-tap": name("리듬 탭", "Rhythm Tap", "リズムタップ", "节奏点击", "Rythme tactile", "Toque rítmico"),
  "cave-dash": name("케이브 대시", "Cave Dash", "ケイブダッシュ", "洞穴冲刺", "Course des cavernes", "Carrera cavernícola"),
  "aim-trainer": name("에임 트레이너", "Aim Trainer", "エイムトレーナー", "瞄准训练", "Entraîneur de visée", "Entrenador de puntería"),
  "block-burst": name("블록 버스트", "Block Burst", "ブロックバースト", "方块爆裂", "Block Burst", "Block Burst"),
  "puzzle-15": name("15 퍼즐", "15 Puzzle", "15パズル", "十五数码", "Taquin", "Rompecabezas del 15"),
};

const DIFFICULTY: Record<string, LocalizedName> = {
  beginner: name("초급", "Beginner", "初級", "初级", "Débutant", "Principiante"),
  intermediate: name("중급", "Intermediate", "中級", "中级", "Intermédiaire", "Intermedio"),
  expert: name("고급", "Expert", "上級", "高级", "Expert", "Experto"),
  easy: name("쉬움", "Easy", "やさしい", "简单", "Facile", "Fácil"),
  normal: name("보통", "Normal", "普通", "普通", "Normal", "Normal"),
  hard: name("어려움", "Hard", "難しい", "困难", "Difficile", "Difícil"),
};

const AIM_MODE: Record<string, LocalizedName> = {
  gridshot: name("그리드샷", "Gridshot", "グリッドショット", "网格射击", "Gridshot", "Gridshot"),
  flick: name("플릭샷", "Flick", "フリック", "急甩", "Flick", "Flick"),
  tracking: name("트래킹", "Tracking", "トラッキング", "跟踪", "Tracking", "Tracking"),
  precision: name("정밀샷", "Precision", "精密", "精准", "Précision", "Precisión"),
};

export function gameDisplayName(id: string, locale: Locale): string {
  const exact = GAME_DISPLAY_NAMES[id];
  if (exact) return exact[locale];

  const mine = id.match(/^minesweeper-(beginner|intermediate|expert)$/);
  if (mine) return `${GAME_DISPLAY_NAMES.minesweeper[locale]} · ${DIFFICULTY[mine[1]][locale]}`;

  const puzzle = id.match(/^puzzle15-(3|4|5)$/);
  if (puzzle) return `${GAME_DISPLAY_NAMES["puzzle-15"][locale]} · ${puzzle[1]}×${puzzle[1]}`;

  const aim = id.match(/^aim-trainer:(gridshot|flick|tracking|precision):(easy|normal|hard|expert)$/);
  if (aim) return `${GAME_DISPLAY_NAMES["aim-trainer"][locale]} · ${AIM_MODE[aim[1]][locale]} · ${DIFFICULTY[aim[2]][locale]}`;

  // Unknown keys can come from older/user-edited localStorage. Preserve the
  // identifier rather than fabricating an English title in non-English UIs.
  return id;
}
