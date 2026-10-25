/**
 * chess-opening.ts
 *
 * Real-time Chess Opening Book detector.
 * Identifies standard openings from SAN / UCI move sequences
 * to coach and guide players during early board play.
 */

export interface ChessOpening {
  name: Record<string, string>;
  code: string; // ECO code (e.g. C60, B20)
  moves: string[]; // Standard SAN prefixes
  description: Record<string, string>;
}

export const CHESS_OPENINGS: ChessOpening[] = [
  {
    code: "C60",
    name: {
      ko: "루이 로페즈 (스패니시)",
      en: "Ruy Lopez (Spanish Game)",
      ja: "ルイ・ロペス",
      zh: "西班牙开局",
      fr: "Partie espagnole",
      es: "Apertura Ruy Lopez",
    },
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    description: {
      ko: "흑의 c6 나이트를 압박하여 e5 폰 지배력을 시험하는 클래식 명 오프닝",
      en: "Pressures the c6 knight to contest control over the central e5 pawn",
      ja: "c6ナイトに圧力をかけe5ポーンの支配を争う古典的名局",
      zh: "对c6骑士施压以争夺中心e5兵控制权的经典开局",
      fr: "Met la pression sur le cavalier c6 pour contester le pion e5",
      es: "Presiona al caballo de c6 para disputar el control del peón central e5",
    },
  },
  {
    code: "C50",
    name: {
      ko: "이탈리안 게임",
      en: "Italian Game",
      ja: "イタリアン・ゲーム",
      zh: "意大利开局",
      fr: "Partie italienne",
      es: "Apertura Italiana",
    },
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    description: {
      ko: "흑의 취약한 f7 지점을 겨냥하며 빠른 기물 전개를 꾀하는 공격적 오프닝",
      en: "Targets the vulnerable f7 square while developing pieces harmoniously",
      ja: "黒の脆弱なf7を狙いながら調和の取れた駒展開を目指す攻撃的開局",
      zh: "瞄准黑方脆弱的f7格，同时和谐展开子力的攻击性开局",
      fr: "Vise la case vulnérable f7 tout en développant harmonieusement les pièces",
      es: "Apunta a la casilla vulnerable f7 mientras desarrolla las piezas",
    },
  },
  {
    code: "B20",
    name: {
      ko: "시실리안 디펜스",
      en: "Sicilian Defense",
      ja: "シシリアン・ディフェンス",
      zh: "西西里防御",
      fr: "Défense sicilienne",
      es: "Defensa Siciliana",
    },
    moves: ["e4", "c5"],
    description: {
      ko: "중앙을 불균형하게 만들어 흑에게 주도적인 반격 찬스를 주는 최고 승률 디펜스",
      en: "Creates an asymmetrical center granting Black strong counterattacking chances",
      ja: "中央を非対称にし、黒に主導的な反撃の機会を与える最高峰の防御",
      zh: "打破中心对称，为黑方创造凌厉反击机会的高胜率防御",
      fr: "Crée un centre asymétrique offrant aux Noirs d'excellentes chances de contre-attaque",
      es: "Crea un centro asimétrico que otorga a las Negras fuertes opciones de contraataque",
    },
  },
  {
    code: "C00",
    name: {
      ko: "프렌치 디펜스",
      en: "French Defense",
      ja: "フレンチ・ディフェンス",
      zh: "法兰西防御",
      fr: "Défense française",
      es: "Defensa Francesa",
    },
    moves: ["e4", "e6"],
    description: {
      ko: "견고한 폰 사슬을 구축하고 백의 d4-e4 중앙을 반격하는 단단한 디펜스",
      en: "Builds a solid pawn chain to counterattack White's d4-e4 center",
      ja: "強固なポーンチェーンを構築し白の中央を反撃する堅実な防御",
      zh: "构建坚固的兵链，对白方的d4-e4中心实施反击的稳健防御",
      fr: "Construit une chaîne de pions solide pour contre-attaquer le centre blanc",
      es: "Construye una sólida cadena de peones para contraatacar el centro blanco",
    },
  },
  {
    code: "B10",
    name: {
      ko: "카로-칸 디펜스",
      en: "Caro-Kann Defense",
      ja: "カロ・カン・ディフェンス",
      zh: "卡罗-康防御",
      fr: "Défense Caro-Kann",
      es: "Defensa Caro-Kann",
    },
    moves: ["e4", "c6"],
    description: {
      ko: "c6로 d5 전진을 준비하며 밝은색 비숍의 전개로를 확보하는 견고한 방어",
      en: "Prepares d5 while keeping the light-squared bishop free to develop",
      ja: "c6でd5進出を準備し白マスビショップの展開路を確保する堅固な防御",
      zh: "以c6筹备d5突击，并为白格象保留活跃展开通道的坚韧防御",
      fr: "Prépare d5 tout en permettant au fou de cases blanches de se développer",
      es: "Prepara d5 mientras mantiene libre la diagonal del alfil de casillas claras",
    },
  },
  {
    code: "D06",
    name: {
      ko: "퀸즈 갬빗",
      en: "Queen's Gambit",
      ja: "クイーンズ・ギャンビット",
      zh: "后翼弃兵",
      fr: "Gambit dame",
      es: "Gambito de Dama",
    },
    moves: ["d4", "d5", "c4"],
    description: {
      ko: "측면 c폰을 희생하여 d5를 유인하고 완전한 중앙 지배를 노리는 대표 포석",
      en: "Offers a flank pawn to divert Black's d5 and establish complete central dominance",
      ja: "側面ポーンを犠牲にして相手のd5を誘い、完全な中央支配を狙う名手",
      zh: "通过弃置侧翼c兵引诱黑方d5兵，从而确立对中心的绝对统治",
      fr: "Offre un pion d'aile pour détourner le pion d5 noir et dominer le centre",
      es: "Ofrece un peón de flanco para desviar el d5 negro y dominar el centro",
    },
  },
  {
    code: "E60",
    name: {
      ko: "킹스 인디언 디펜스",
      en: "King's Indian Defense",
      ja: "キングズ・インディアン",
      zh: "古印度防御",
      fr: "Défense est-indienne",
      es: "Defensa India de Rey",
    },
    moves: ["d4", "Nf6", "c4", "g6"],
    description: {
      ko: "초반 피앙케토 비숍으로 킹사이드를 요새화하고 폰 브레이크를 노리는 현대적 전법",
      en: "Fianchettos the dark-squared bishop to create dynamic counterplay",
      ja: "黒マスビショップをフィアンケットし強力な反撃を狙う現代的戦法",
      zh: "将黑格象侧翼进驻实施堡垒化，伺机发起动态中心反击的现代名阵",
      fr: "Place le fou en fianchetto pour créer un contre-jeu dynamique",
      es: "Coloca el alfil en fianchetto para generar un contrajuego dinámico",
    },
  },
  {
    code: "A10",
    name: {
      ko: "잉글리시 오프닝",
      en: "English Opening",
      ja: "イングリッシュ・オープニング",
      zh: "英国式开局",
      fr: "Partie anglaise",
      es: "Apertura Inglesa",
    },
    moves: ["c4"],
    description: {
      ko: "측면 폰으로 d5 지점을 간접 통제하며 유연한 전개를 꾀하는 유연한 포석",
      en: "Controls the d5 square from the flank with flexible piece placement",
      ja: "側面ポーンでd5マスを間接支配し柔軟な展開を図る布石",
      zh: "以侧翼兵间接控制d5格，展开极富弹性子力配置的现代布局",
      fr: "Contrôle la case d5 depuis l'aile avec une grande souplesse de jeu",
      es: "Controla la casilla d5 desde el flanco con un despliegue muy flexible",
    },
  },
  {
    code: "B01",
    name: {
      ko: "스칸디나비안 디펜스",
      en: "Scandinavian Defense",
      ja: "スカンジナビアン",
      zh: "斯堪的纳维亚防御",
      fr: "Défense scandinave",
      es: "Defensa Escandinava",
    },
    moves: ["e4", "d5"],
    description: {
      ko: "백의 e4 폰을 즉각 1수로 정면 도전하여 중앙 긴장을 촉발하는 직접적 수순",
      en: "Immediately challenges White's e4 pawn on move 1",
      ja: "初手から白のe4ポーンに真っ向勝負を挑む直接的な手番",
      zh: "第1回合直接向白方e4兵发起正面冲击的直接型应对",
      fr: "Défie immédiatement le pion e4 des Blancs dès le premier coup",
      es: "Desafía de inmediato el peón blanco de e4 desde el primer movimiento",
    },
  },
];

/**
 * Detects matching chess opening based on SAN move sequence history.
 * Matches longest prefix first.
 */
export function identifyChessOpening(moveSanList: string[]): ChessOpening | null {
  if (!moveSanList || moveSanList.length === 0) return null;

  let bestMatch: ChessOpening | null = null;
  let maxMatchedMoves = 0;

  for (const opening of CHESS_OPENINGS) {
    if (opening.moves.length > moveSanList.length) continue;

    let isMatch = true;
    for (let i = 0; i < opening.moves.length; i++) {
      if (moveSanList[i] !== opening.moves[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch && opening.moves.length > maxMatchedMoves) {
      bestMatch = opening;
      maxMatchedMoves = opening.moves.length;
    }
  }

  return bestMatch;
}
