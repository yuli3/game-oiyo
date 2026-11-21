/**
 * Tactical SWAT Breach (#135) — CQB Floorplan Waypoint Planning, Flashbang Stun & Raycast Breach Engine
 *
 * Inspired by Door Kickers & Rainbow Six Tactical Planning:
 * - 10x8 building floorplan (floor, wall, door_closed, door_open, cover)
 * - 2 SWAT Operators (Alpha Shield & Bravo Breacher) with customizable waypoint paths
 * - Flashbang deployment at target room coordinates to stun suspects in radius
 * - Bresenham / Raycast Line-of-Sight (LOS) combat & Hostage Rescue verification
 */

export type TileType = "floor" | "wall" | "door_closed" | "door_open" | "cover";

export type SuspectType = "normal" | "shielded" | "bomber" | "sniper";

export interface GridPoint {
  x: number;
  y: number;
}

export interface OperatorState {
  id: "alpha" | "bravo";
  callsign: string;
  role: "shield" | "assault";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  angle: number; // radians
  waypoints: GridPoint[];
  flashbangTarget: GridPoint | null;
  flashbangThrown: boolean;
  fireCooldown: number;
}

export interface SuspectState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp?: number;
  angle: number;
  stunTimer: number;
  reactionTimer: number;
  neutralized: boolean;
  suspectType?: SuspectType;
  bombTimer?: number;
}

export interface HostageState {
  id: string;
  x: number;
  y: number;
  rescued: boolean;
}

export interface SwatMissionSpec {
  id: string;
  missionNum: number;
  title: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  briefing: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  layout: string[]; // 8 rows of 10 chars: '#' wall, '.' floor, 'D' door_closed, 'C' cover
  operators: Array<{
    id: "alpha" | "bravo";
    callsign: string;
    role: "shield" | "assault";
    x: number;
    y: number;
    autoPath: GridPoint[];
    autoFlash: GridPoint;
  }>;
  suspects: Array<{ id: string; x: number; y: number; type?: SuspectType }>;
  hostages: Array<{ id: string; x: number; y: number }>;
}

export interface SwatBreachState {
  missionIndex: number;
  gridW: number;
  gridH: number;
  tiles: TileType[][];
  phase: "planning" | "executing" | "victory" | "failed";
  selectedOpId: "alpha" | "bravo";
  toolMode: "waypoint" | "flashbang";
  operators: OperatorState[];
  suspects: SuspectState[];
  hostages: HostageState[];
  flashbangsRemaining: number;
  activeFlashBursts: Array<{ x: number; y: number; timer: number }>;
  activeShockwaves: Array<{ x: number; y: number; radius: number; maxRadius: number; timer: number }>;
  tracerLines: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; timer: number }>;
  elapsedTime: number;
  score: number;
  tokensEarned: number;
  activeCommsLogId?: string;
  metaModifiers?: {
    kevlarHp: number;
    fireCooldownReduction: number;
    reactionBonus: number;
    extraFlashbangs: number;
    speedMultiplier: number;
  };
}

export const GRID_W = 10;
export const GRID_H = 8;

export const MISSIONS: SwatMissionSpec[] = [
  {
    id: "amber-sweep",
    missionNum: 1,
    title: {
      ko: "작전 1: 앰버 스위프 (은행 금고 구출)",
      en: "Op 1: Amber Sweep (Bank Vault Rescue)",
      ja: "作戦1：アンバースイープ（銀行金庫救出）",
      zh: "行动 1：琥珀清剿（银行金库营救）",
      fr: "Op 1 : Amber Sweep (Sauvetage Banque)",
      es: "Op 1: Amber Sweep (Rescate Bancario)",
    },
    briefing: {
      ko: "정문과 측면 문('D')을 돌파해 섬광탄으로 무장 용의자 3명을 제압하고 금고 안의 인질 1명을 구출하세요.",
      en: "Breach the main and side doors, stun the 3 armed suspects with flashbangs, and rescue the hostage in the vault.",
      ja: "正面と側面の扉('D')を突破し、閃光弾で武装容疑者3名を制圧して金庫内の人質1名を救出せよ。",
      zh: "突破正门与侧门，投掷闪光弹震慑 3 名武装歹徒，安全解救金库内的 1 名人质。",
      fr: "Enfoncez les portes, neutralisez les 3 suspects avec des grenades flash et sauvez l'otage dans le coffre.",
      es: "Derriba las puertas, aturde a los 3 sospechosos con granadas cegadoras y rescata al rehén de la bóveda.",
    },
    layout: [
      "##########",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "#..###D###",
      "#..D.....#",
      "#..#..C..#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 2,
        autoPath: [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 4, y: 2 },
          { x: 7, y: 2 },
        ],
        autoFlash: { x: 5, y: 2 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 5, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 2 },
      { id: "s2", x: 8, y: 2 },
      { id: "s3", x: 6, y: 5 },
    ],
    hostages: [{ id: "h1", x: 8, y: 6 }],
  },
  {
    id: "night-owl",
    missionNum: 2,
    title: {
      ko: "작전 2: 나이트 아울 (펜트하우스 동시 진입)",
      en: "Op 2: Night Owl (Penthouse Dual Breach)",
      ja: "作戦2：ナイトオウル（ペントハウス突入）",
      zh: "行动 2：夜枭突袭（顶层公寓双路破门）",
      fr: "Op 2 : Night Owl (Assaut Penthouse)",
      es: "Op 2: Night Owl (Asalto al Ático)",
    },
    briefing: {
      ko: "알파·브라보 대원을 상하 복도로 분담 진입시켜 용의자 4명을 소탕하고 인질 2명을 모두 확보하세요.",
      en: "Split Alpha and Bravo across the upper and lower corridors to neutralize 4 suspects and secure 2 hostages.",
      ja: "アルファとブラボーを上下の廊下に分けて突入させ、容疑者4名を制圧し人質2名を救出せよ。",
      zh: "指挥阿尔法与布拉沃分头突入上下走廊，肃清 4 名歹徒并成功营救 2 名人质。",
      fr: "Séparez Alpha et Bravo dans les couloirs haut et bas pour neutraliser 4 suspects et sauver 2 otages.",
      es: "Divide a Alpha y Bravo por los pasillos superior e inferior para neutralizar a 4 sospechosos y rescatar a 2 rehenes.",
    },
    layout: [
      "##########",
      "#..D..C..#",
      "#..#.....#",
      "#..###D###",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 1,
        autoPath: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 5, y: 2 },
          { x: 8, y: 1 },
        ],
        autoFlash: { x: 5, y: 1 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 5, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 1 },
      { id: "s2", x: 7, y: 2 },
      { id: "s3", x: 5, y: 6 },
      { id: "s4", x: 7, y: 5 },
    ],
    hostages: [
      { id: "h1", x: 8, y: 1 },
      { id: "h2", x: 8, y: 6 },
    ],
  },
  {
    id: "citadel-zero",
    missionNum: 3,
    title: {
      ko: "작전 3: 시타델 제로 (대사관 통제실 탈환)",
      en: "Op 3: Citadel Zero (Embassy Command)",
      ja: "作戦3：シタデル・ゼロ（大使館指令室奪還）",
      zh: "行动 3：零号堡垒（大使馆控制室夺还）",
      fr: "Op 3 : Citadel Zero (Ambassade)",
      es: "Op 3: Citadel Zero (Comando de Embajada)",
    },
    briefing: {
      ko: "다중 격실로 이루어진 대사관 통제실을 연속 돌파하여 용의자 5명을 제압하고 인질 2명을 구출하세요!",
      en: "Execute a multi-room tactical sweep through the embassy command center to neutralize 5 suspects and rescue 2 hostages!",
      ja: "複数の部屋に分かれた大使館指令室を連続突破し、武装容疑者5名を制圧して人質2名を救出せよ！",
      zh: "连续突入多层隔间的大使馆控制中心，制服 5 名武装分子并解救全部 2 名人质！",
      fr: "Menez un assaut coordonné à travers le centre de commandement pour neutraliser 5 suspects et sauver 2 otages !",
      es: "¡Ejecuta un barrido táctico por el centro de mando para neutralizar a 5 sospechosos y rescatar a 2 rehenes!",
    },
    layout: [
      "##########",
      "#..D.....#",
      "#..#..C..#",
      "#..###D###",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 1,
        autoPath: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 6, y: 1 },
          { x: 8, y: 2 },
        ],
        autoFlash: { x: 5, y: 1 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 6, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 1 },
      { id: "s2", x: 7, y: 1 },
      { id: "s3", x: 6, y: 2 },
      { id: "s4", x: 5, y: 5 },
      { id: "s5", x: 7, y: 6 },
    ],
    hostages: [
      { id: "h1", x: 8, y: 2 },
      { id: "h2", x: 8, y: 6 },
    ],
  },
  // --- missions 4-10 (stage range 2026-11-21) ---
  {
    id: "harbor-ghost",
    missionNum: 4,
    title: {
      ko: "작전 4: 하버 고스트 (항만 창고 기습)",
      en: "Op 4: Harbor Ghost (Dockside Warehouse)",
      ja: "作戦4：ハーバーゴースト（港湾倉庫急襲）",
      zh: "行动 4：港口幽灵（码头仓库突袭）",
      fr: "Op 4 : Harbor Ghost (Entrepôt du port)",
      es: "Op 4: Harbor Ghost (Almacén del puerto)",
    },
    briefing: {
      ko: "컨테이너 사이에 숨은 용의자 4명을 제압하세요. 저격수가 창고 안쪽을 지키고 있으니 섬광탄을 먼저 던지세요.",
      en: "Take down 4 suspects hiding among the containers. A sniper watches the back of the warehouse, so throw the flashbang first.",
      ja: "コンテナの間に潜む容疑者4名を制圧せよ。倉庫の奥を狙撃手が見張っているので、先に閃光弾を投げよ。",
      zh: "制服藏在集装箱之间的 4 名歹徒。仓库深处有狙击手把守，先投闪光弹。",
      fr: "Neutralisez 4 suspects cachés entre les conteneurs. Un tireur surveille le fond de l'entrepôt : lancez d'abord la grenade flash.",
      es: "Neutraliza a 4 sospechosos ocultos entre los contenedores. Un francotirador vigila el fondo del almacén: lanza primero la cegadora.",
    },
    layout: [
      "##########",
      "#..#.....#",
      "#..D.C...#",
      "#..#...C.#",
      "#..##D####",
      "#..D.....#",
      "#..#.C...#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 1 }], autoFlash: { x: 6, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 6, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 6, y: 1, type: "normal" },
      { id: "s2", x: 8, y: 3, type: "sniper" },
      { id: "s3", x: 6, y: 5, type: "shielded" },
      { id: "s4", x: 8, y: 6, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 1 }],
  },
  {
    id: "iron-lantern",
    missionNum: 5,
    title: {
      ko: "작전 5: 아이언 랜턴 (지하철 역무실)",
      en: "Op 5: Iron Lantern (Subway Control Room)",
      ja: "作戦5：アイアンランタン（地下鉄駅務室）",
      zh: "行动 5：铁灯笼（地铁站务室）",
      fr: "Op 5 : Iron Lantern (Poste du métro)",
      es: "Op 5: Iron Lantern (Sala del metro)",
    },
    briefing: {
      ko: "역무실과 승강장 통로를 동시에 돌파해 용의자 5명을 제압하고 역무원 2명을 구출하세요. 폭탄범이 통로에 있으니 가까이 붙지 마세요.",
      en: "Breach the control room and the platform passage at once, take down 5 suspects, and rescue 2 station staff. A bomber is in the passage, so keep your distance.",
      ja: "駅務室とホーム通路を同時に突破し、容疑者5名を制圧して駅員2名を救出せよ。通路に爆弾犯がいるので近づきすぎるな。",
      zh: "同时突破站务室与站台通道，制服 5 名歹徒并救出 2 名站务员。通道里有炸弹犯，别靠太近。",
      fr: "Enfoncez en même temps le poste et le couloir du quai, neutralisez 5 suspects et sauvez 2 agents. Un poseur de bombe est dans le couloir : gardez vos distances.",
      es: "Entra a la vez en la sala y el pasillo del andén, neutraliza a 5 sospechosos y rescata a 2 empleados. Hay un terrorista con bomba en el pasillo: mantén la distancia.",
    },
    layout: [
      "##########",
      "#...#....#",
      "#...D..C.#",
      "#...#....#",
      "#.C.##D###",
      "#...D....#",
      "#...#.C..#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 1 }], autoFlash: { x: 6, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 6, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 6, y: 1, type: "shielded" },
      { id: "s2", x: 8, y: 2, type: "normal" },
      { id: "s3", x: 7, y: 3, type: "sniper" },
      { id: "s4", x: 7, y: 5, type: "bomber" },
      { id: "s5", x: 8, y: 6, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 3 }, { id: "h2", x: 8, y: 5 }],
  },
  {
    id: "glass-tide",
    missionNum: 6,
    title: {
      ko: "작전 6: 글래스 타이드 (수족관 관제실)",
      en: "Op 6: Glass Tide (Aquarium Control)",
      ja: "作戦6：グラスタイド（水族館管制室）",
      zh: "行动 6：玻璃潮汐（水族馆控制室）",
      fr: "Op 6 : Glass Tide (Aquarium)",
      es: "Op 6: Glass Tide (Control del acuario)",
    },
    briefing: {
      ko: "수조 벽으로 나뉜 세 구역을 차례로 돌파해야 합니다. 용의자 6명을 제압하고 관람객 2명을 구출하세요.",
      en: "Three sections split by tank walls must be cleared one after another. Take down 6 suspects and rescue 2 visitors.",
      ja: "水槽の壁で仕切られた3区画を順に突破せよ。容疑者6名を制圧し、来館者2名を救出せよ。",
      zh: "水族箱墙把场地分成三区，必须逐一突破。制服 6 名歹徒并救出 2 名游客。",
      fr: "Trois zones séparées par des aquariums doivent être prises l'une après l'autre. Neutralisez 6 suspects et sauvez 2 visiteurs.",
      es: "Hay que despejar una tras otra tres zonas separadas por los tanques. Neutraliza a 6 sospechosos y rescata a 2 visitantes.",
    },
    layout: [
      "##########",
      "#..#..#..#",
      "#..D..D..#",
      "#..#..#..#",
      "#C.#C.#.C#",
      "#..D..D..#",
      "#..#..#..#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 1 }], autoFlash: { x: 4, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 4, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 4, y: 1, type: "shielded" },
      { id: "s2", x: 5, y: 3, type: "normal" },
      { id: "s3", x: 8, y: 1, type: "sniper" },
      { id: "s4", x: 4, y: 6, type: "normal" },
      { id: "s5", x: 5, y: 5, type: "bomber" },
      { id: "s6", x: 8, y: 4, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 2 }, { id: "h2", x: 8, y: 6 }],
  },
  {
    id: "red-ledger",
    missionNum: 7,
    title: {
      ko: "작전 7: 레드 레저 (증권거래소 서버실)",
      en: "Op 7: Red Ledger (Exchange Server Room)",
      ja: "作戦7：レッドレジャー（証券取引所サーバー室）",
      zh: "行动 7：赤色账本（证券交易所机房）",
      fr: "Op 7 : Red Ledger (Salle des serveurs)",
      es: "Op 7: Red Ledger (Sala de servidores)",
    },
    briefing: {
      ko: "서버 랙 뒤에 저격수 2명이 자리 잡았습니다. 섬광탄으로 저격수를 묶고 용의자 6명을 모두 제압해 엔지니어 2명을 구출하세요.",
      en: "Two snipers have set up behind the server racks. Pin them with flashbangs, take down all 6 suspects, and rescue 2 engineers.",
      ja: "サーバーラックの裏に狙撃手2名が陣取った。閃光弾で狙撃手を封じ、容疑者6名を全員制圧してエンジニア2名を救出せよ。",
      zh: "两名狙击手躲在服务器机架后。用闪光弹压制狙击手，制服全部 6 名歹徒并救出 2 名工程师。",
      fr: "Deux tireurs se sont postés derrière les baies de serveurs. Bloquez-les avec les grenades flash, neutralisez les 6 suspects et sauvez 2 ingénieurs.",
      es: "Dos francotiradores se han apostado tras los racks. Bloquéalos con cegadoras, neutraliza a los 6 sospechosos y rescata a 2 ingenieros.",
    },
    layout: [
      "##########",
      "#..#.C...#",
      "#..D...C.#",
      "#..#.....#",
      "#..###D###",
      "#..D..C..#",
      "#..#.....#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 3 }], autoFlash: { x: 6, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 6, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 5, y: 2, type: "shielded" },
      { id: "s2", x: 8, y: 1, type: "sniper" },
      { id: "s3", x: 7, y: 3, type: "normal" },
      { id: "s4", x: 5, y: 6, type: "normal" },
      { id: "s5", x: 8, y: 5, type: "sniper" },
      { id: "s6", x: 7, y: 6, type: "bomber" },
    ],
    hostages: [{ id: "h1", x: 8, y: 2 }, { id: "h2", x: 8, y: 6 }],
  },
  {
    id: "silent-orbit",
    missionNum: 8,
    title: {
      ko: "작전 8: 사일런트 오빗 (방송국 송출실)",
      en: "Op 8: Silent Orbit (Broadcast Studio)",
      ja: "作戦8：サイレントオービット（放送局送出室）",
      zh: "行动 8：静默轨道（电视台播出室）",
      fr: "Op 8 : Silent Orbit (Studio de diffusion)",
      es: "Op 8: Silent Orbit (Estudio de emisión)",
    },
    briefing: {
      ko: "송출실이 점거되어 방송이 끊겼습니다. 방패 용의자 2명이 정면을 막고 있으니 측면으로 돌아 용의자 6명을 제압하고 직원 3명을 구출하세요.",
      en: "The studio is seized and the broadcast is down. Two shield suspects block the front, so flank them, take down 6 suspects, and rescue 3 staff.",
      ja: "送出室が占拠され放送が止まった。盾を持つ容疑者2名が正面を塞いでいるので側面に回り、容疑者6名を制圧して職員3名を救出せよ。",
      zh: "播出室被占领，节目中断。两名持盾歹徒挡住正面，从侧面包抄，制服 6 名歹徒并救出 3 名员工。",
      fr: "Le studio est occupé et la diffusion coupée. Deux suspects à bouclier bloquent l'avant : contournez-les, neutralisez 6 suspects et sauvez 3 employés.",
      es: "El estudio está tomado y la emisión cortada. Dos sospechosos con escudo bloquean el frente: flanquéalos, neutraliza a 6 sospechosos y rescata a 3 empleados.",
    },
    layout: [
      "##########",
      "#..D.....#",
      "#..#..C..#",
      "#..#.....#",
      "#..###D###",
      "#..#.....#",
      "#..D..C..#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 1, autoPath: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 3 }, { x: 8, y: 2 }], autoFlash: { x: 6, y: 1 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 6, autoPath: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 6, y: 6 } },
    ],
    suspects: [
      { id: "s1", x: 5, y: 2, type: "shielded" },
      { id: "s2", x: 8, y: 1, type: "normal" },
      { id: "s3", x: 7, y: 3, type: "sniper" },
      { id: "s4", x: 5, y: 5, type: "shielded" },
      { id: "s5", x: 8, y: 5, type: "bomber" },
      { id: "s6", x: 7, y: 6, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 3 }, { id: "h2", x: 8, y: 6 }, { id: "h3", x: 6, y: 3 }],
  },
  {
    id: "storm-gate",
    missionNum: 9,
    title: {
      ko: "작전 9: 스톰 게이트 (공항 관제탑)",
      en: "Op 9: Storm Gate (Airport Tower)",
      ja: "作戦9：ストームゲート（空港管制塔）",
      zh: "行动 9：风暴之门（机场塔台）",
      fr: "Op 9 : Storm Gate (Tour de contrôle)",
      es: "Op 9: Storm Gate (Torre del aeropuerto)",
    },
    briefing: {
      ko: "관제탑 상층부를 탈환하세요. 문 세 개를 연달아 돌파하며 용의자 7명을 제압하고 관제사 2명을 구출해야 합니다.",
      en: "Retake the top of the control tower. Breach three doors in a row, take down 7 suspects, and rescue 2 controllers.",
      ja: "管制塔の上層部を奪還せよ。扉3枚を続けて突破し、容疑者7名を制圧して管制官2名を救出せよ。",
      zh: "夺回塔台上层。连续突破三道门，制服 7 名歹徒并救出 2 名管制员。",
      fr: "Reprenez le sommet de la tour. Enfoncez trois portes d'affilée, neutralisez 7 suspects et sauvez 2 contrôleurs.",
      es: "Recupera la parte alta de la torre. Derriba tres puertas seguidas, neutraliza a 7 sospechosos y rescata a 2 controladores.",
    },
    layout: [
      "##########",
      "#..#..#..#",
      "#..D..D..#",
      "#..#.C#..#",
      "#..##D#C.#",
      "#..D..D..#",
      "#..#..#..#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 3 }], autoFlash: { x: 4, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 4, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 4, y: 1, type: "shielded" },
      { id: "s2", x: 5, y: 3, type: "normal" },
      { id: "s3", x: 8, y: 1, type: "sniper" },
      { id: "s4", x: 8, y: 3, type: "normal" },
      { id: "s5", x: 4, y: 6, type: "bomber" },
      { id: "s6", x: 8, y: 5, type: "sniper" },
      { id: "s7", x: 7, y: 6, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 2 }, { id: "h2", x: 8, y: 6 }],
  },
  {
    id: "final-crown",
    missionNum: 10,
    title: {
      ko: "작전 10: 파이널 크라운 (정부청사 지하 벙커)",
      en: "Op 10: Final Crown (Government Bunker)",
      ja: "作戦10：ファイナルクラウン（政府庁舎地下壕）",
      zh: "行动 10：最终王冠（政府地下掩体）",
      fr: "Op 10 : Final Crown (Bunker gouvernemental)",
      es: "Op 10: Final Crown (Búnker del gobierno)",
    },
    briefing: {
      ko: "마지막 작전입니다. 지하 벙커의 모든 격실을 돌파해 용의자 8명을 제압하고 인질 3명을 구출하세요. 저격수·폭탄범·방패병이 모두 있습니다.",
      en: "The final operation. Breach every room of the bunker, take down 8 suspects, and rescue 3 hostages. Snipers, bombers, and shield carriers are all inside.",
      ja: "最後の作戦だ。地下壕のすべての部屋を突破し、容疑者8名を制圧して人質3名を救出せよ。狙撃手・爆弾犯・盾持ちがすべている。",
      zh: "最后一战。突破掩体的每个隔间，制服 8 名歹徒并救出 3 名人质。狙击手、炸弹犯和持盾者都在里面。",
      fr: "Dernière opération. Enfoncez chaque salle du bunker, neutralisez 8 suspects et sauvez 3 otages. Tireurs, poseurs de bombe et porteurs de bouclier sont tous là.",
      es: "La operación final. Entra en cada sala del búnker, neutraliza a 8 sospechosos y rescata a 3 rehenes. Hay francotiradores, terroristas con bomba y escudos.",
    },
    layout: [
      "##########",
      "#..#..#..#",
      "#..D.CD..#",
      "#..#..#.C#",
      "#..##D####",
      "#..D..D..#",
      "#..#.C#..#",
      "##########",
    ],
    operators: [
      { id: "alpha", callsign: "ALPHA-1 (Shield)", role: "shield", x: 1, y: 2, autoPath: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 1 }], autoFlash: { x: 5, y: 2 } },
      { id: "bravo", callsign: "BRAVO-2 (Assault)", role: "assault", x: 1, y: 5, autoPath: [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 6 }], autoFlash: { x: 5, y: 5 } },
    ],
    suspects: [
      { id: "s1", x: 4, y: 1, type: "shielded" },
      { id: "s2", x: 5, y: 3, type: "sniper" },
      { id: "s3", x: 7, y: 1, type: "normal" },
      { id: "s4", x: 8, y: 3, type: "bomber" },
      { id: "s5", x: 4, y: 6, type: "shielded" },
      { id: "s6", x: 5, y: 5, type: "normal" },
      { id: "s7", x: 8, y: 5, type: "sniper" },
      { id: "s8", x: 7, y: 6, type: "normal" },
    ],
    hostages: [{ id: "h1", x: 8, y: 2 }, { id: "h2", x: 8, y: 6 }, { id: "h3", x: 7, y: 3 }],
  },
];

export function createSwatBreachState(
  missionIndex = 0,
  metaModifiers?: SwatBreachState["metaModifiers"]
): SwatBreachState {
  const safeIdx = Math.max(0, Math.min(MISSIONS.length - 1, missionIndex));
  const spec = MISSIONS[safeIdx];

  const tiles: TileType[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: TileType[] = [];
    const line = spec.layout[y] ?? "##########";
    for (let x = 0; x < GRID_W; x++) {
      const ch = line[x] ?? "#";
      if (ch === "#") row.push("wall");
      else if (ch === "D") row.push("door_closed");
      else if (ch === "C") row.push("cover");
      else row.push("floor");
    }
    tiles.push(row);
  }

  const extraHp = metaModifiers?.kevlarHp ?? 0;
  const extraFlashes = metaModifiers?.extraFlashbangs ?? 0;

  return {
    missionIndex: safeIdx,
    gridW: GRID_W,
    gridH: GRID_H,
    tiles,
    phase: "planning",
    selectedOpId: "alpha",
    toolMode: "waypoint",
    activeCommsLogId: "planning_brief",
    metaModifiers,
    tokensEarned: 0,
    operators: spec.operators.map((op) => {
      const baseHp = op.role === "shield" ? 160 : 120;
      const totalHp = baseHp + extraHp;
      return {
        id: op.id,
        callsign: op.callsign,
        role: op.role,
        x: op.x,
        y: op.y,
        hp: totalHp,
        maxHp: totalHp,
        angle: 0,
        waypoints: [...op.autoPath],
        flashbangTarget: { ...op.autoFlash },
        flashbangThrown: false,
        fireCooldown: 0,
      };
    }),
    suspects: spec.suspects.map((s, idx) => {
      // Assign elite mutations on some suspects
      let sType: SuspectType = s.type ?? "normal";
      if (!s.type) {
        if (idx === 0) sType = "shielded";
        else if (idx === 1 && spec.suspects.length > 2) sType = "bomber";
        else if (idx === 2 && spec.suspects.length > 3) sType = "sniper";
      }

      const hp = sType === "shielded" ? 90 : sType === "sniper" ? 45 : 60;
      return {
        id: s.id,
        x: s.x,
        y: s.y,
        hp,
        maxHp: hp,
        angle: Math.PI,
        stunTimer: 0,
        reactionTimer: sType === "sniper" ? 0.35 : 0.55,
        neutralized: false,
        suspectType: sType,
        bombTimer: sType === "bomber" ? 0 : undefined,
      };
    }),
    hostages: spec.hostages.map((h) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      rescued: false,
    })),
    flashbangsRemaining: 2 + extraFlashes,
    activeFlashBursts: [],
    activeShockwaves: [],
    tracerLines: [],
    elapsedTime: 0,
    score: 0,
  };
}

export function addWaypointOrFlash(
  state: SwatBreachState,
  gx: number,
  gy: number
): boolean {
  if (state.phase !== "planning") return false;
  if (gx < 0 || gx >= state.gridW || gy < 0 || gy >= state.gridH) return false;
  if (state.tiles[gy][gx] === "wall") return false;

  const op = state.operators.find((o) => o.id === state.selectedOpId);
  if (!op) return false;

  if (state.toolMode === "flashbang") {
    op.flashbangTarget = { x: gx, y: gy };
    return true;
  }

  // Waypoint mode: append tile if different from last
  const last =
    op.waypoints.length > 0
      ? op.waypoints[op.waypoints.length - 1]
      : { x: Math.round(op.x), y: Math.round(op.y) };
  if (last.x === gx && last.y === gy) return false;
  op.waypoints.push({ x: gx, y: gy });
  return true;
}

export function clearOperatorWaypoints(
  state: SwatBreachState,
  opId?: "alpha" | "bravo"
): void {
  if (state.phase !== "planning") return;
  const targetId = opId ?? state.selectedOpId;
  const op = state.operators.find((o) => o.id === targetId);
  if (op) {
    op.waypoints = [];
  }
}

export function applyAutoTacticalPlan(state: SwatBreachState): void {
  if (state.phase !== "planning") return;
  const spec = MISSIONS[state.missionIndex];
  for (const opSpec of spec.operators) {
    const op = state.operators.find((o) => o.id === opSpec.id);
    if (op) {
      op.waypoints = opSpec.autoPath.map((pt) => ({ ...pt }));
      op.flashbangTarget = { ...opSpec.autoFlash };
    }
  }
}

export function startBreachExecution(state: SwatBreachState): void {
  if (state.phase === "planning") {
    state.phase = "executing";
  }
}

export function hasLineOfSight(
  state: SwatBreachState,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.round(x1 + (x2 - x1) * t);
    const ty = Math.round(y1 + (y2 - y1) * t);
    if (tx < 0 || tx >= state.gridW || ty < 0 || ty >= state.gridH) return false;
    const tile = state.tiles[ty][tx];
    if (tile === "wall" || tile === "door_closed") {
      return false;
    }
  }
  return true;
}

export function stepSwatBreach(
  state: SwatBreachState,
  dtSeconds: number
): { shotsFired: number; flashDetonated: boolean; doorBreached: boolean } {
  if (state.phase !== "executing") {
    return { shotsFired: 0, flashDetonated: false, doorBreached: false };
  }

  state.elapsedTime += dtSeconds;
  let shotsFired = 0;
  let flashDetonated = false;
  let doorBreached = false;

  // Decay visual bursts & tracers & shockwaves
  state.activeFlashBursts = state.activeFlashBursts
    .map((b) => ({ ...b, timer: b.timer - dtSeconds }))
    .filter((b) => b.timer > 0);
  state.tracerLines = state.tracerLines
    .map((t) => ({ ...t, timer: t.timer - dtSeconds }))
    .filter((t) => t.timer > 0);
  state.activeShockwaves = state.activeShockwaves
    .map((s) => ({
      ...s,
      timer: s.timer - dtSeconds,
      radius: s.radius + (s.maxRadius / 0.6) * dtSeconds,
    }))
    .filter((s) => s.timer > 0);

  const speedMult = 1 + (state.metaModifiers?.speedMultiplier ?? 0);
  const cdReduction = state.metaModifiers?.fireCooldownReduction ?? 0;

  // Move operators along waypoints & breach doors
  for (const op of state.operators) {
    if (op.hp <= 0) continue;
    op.fireCooldown = Math.max(0, op.fireCooldown - dtSeconds);

    if (op.waypoints.length > 0) {
      const target = op.waypoints[0];
      const dx = target.x - op.x;
      const dy = target.y - op.y;
      const dist = Math.hypot(dx, dy);

      // Check adjacent closed doors and breach them!
      const tx = Math.round(target.x);
      const ty = Math.round(target.y);
      if (
        dist < 1.15 &&
        ty >= 0 &&
        ty < state.gridH &&
        tx >= 0 &&
        tx < state.gridW &&
        state.tiles[ty][tx] === "door_closed"
      ) {
        state.tiles[ty][tx] = "door_open";
        doorBreached = true;
        state.activeCommsLogId = "breach_go";
        state.activeShockwaves.push({
          x: tx,
          y: ty,
          radius: 0.2,
          maxRadius: 2.2,
          timer: 0.5,
        });

        // Deploy queued flashbang on door breach!
        if (op.flashbangTarget && !op.flashbangThrown) {
          op.flashbangThrown = true;
          const fx = op.flashbangTarget.x;
          const fy = op.flashbangTarget.y;
          state.activeFlashBursts.push({ x: fx, y: fy, timer: 0.65 });
          state.activeShockwaves.push({
            x: fx,
            y: fy,
            radius: 0.3,
            maxRadius: 3.5,
            timer: 0.75,
          });
          flashDetonated = true;
          for (const sus of state.suspects) {
            if (!sus.neutralized && Math.hypot(sus.x - fx, sus.y - fy) <= 3.5) {
              sus.stunTimer = 4.5;
            }
          }
        }
      }

      const speed = 2.6 * speedMult;
      if (dist <= speed * dtSeconds) {
        op.x = target.x;
        op.y = target.y;
        op.waypoints.shift();
      } else {
        op.angle = Math.atan2(dy, dx);
        op.x += (dx / dist) * speed * dtSeconds;
        op.y += (dy / dist) * speed * dtSeconds;
      }
    }

    // Rescue nearby hostages
    for (const h of state.hostages) {
      if (!h.rescued && Math.hypot(h.x - op.x, h.y - op.y) <= 1.6) {
        h.rescued = true;
        state.score += 200;
        state.tokensEarned += 5;
        state.activeCommsLogId = "hostage_secure";
      }
    }

    // Operator engages visible suspects
    if (op.fireCooldown <= 0) {
      for (const sus of state.suspects) {
        if (sus.neutralized) continue;
        if (hasLineOfSight(state, op.x, op.y, sus.x, sus.y)) {
          op.angle = Math.atan2(sus.y - op.y, sus.x - op.x);
          op.fireCooldown = Math.max(0.12, 0.25 * (1 - cdReduction));

          // Shielded suspect damage reduction from front
          let dmg = 35;
          if (sus.suspectType === "shielded" && sus.stunTimer <= 0) {
            const angleDiff = Math.abs(op.angle - sus.angle);
            // If facing each other (near 180 degrees diff)
            if (Math.abs(angleDiff - Math.PI) < 0.8) {
              dmg = Math.floor(dmg * 0.3); // 70% deflected by shield
            }
          }

          sus.hp -= dmg;
          shotsFired++;
          state.tracerLines.push({
            x1: op.x,
            y1: op.y,
            x2: sus.x,
            y2: sus.y,
            color: "#38bdf8",
            timer: 0.14,
          });

          if (sus.hp <= 0) {
            sus.neutralized = true;
            state.score += 150;
            state.tokensEarned += 2;
            state.activeCommsLogId = "suspect_spotted";

            // Bomber suicide explosion shockwave
            if (sus.suspectType === "bomber") {
              state.activeShockwaves.push({
                x: sus.x,
                y: sus.y,
                radius: 0.4,
                maxRadius: 2.8,
                timer: 0.6,
              });
              // Splash damage to nearby ops
              for (const o of state.operators) {
                if (Math.hypot(o.x - sus.x, o.y - sus.y) <= 2.0) {
                  o.hp = Math.max(0, o.hp - 25);
                }
              }
            }
          }
          break;
        }
      }
    }
  }

  // Update suspects
  for (const sus of state.suspects) {
    if (sus.neutralized) continue;
    if (sus.stunTimer > 0) {
      sus.stunTimer = Math.max(0, sus.stunTimer - dtSeconds);
      continue;
    }

    for (const op of state.operators) {
      if (op.hp <= 0) continue;
      if (hasLineOfSight(state, sus.x, sus.y, op.x, op.y)) {
        sus.angle = Math.atan2(op.y - sus.y, op.x - sus.x);
        sus.reactionTimer -= dtSeconds;
        if (sus.reactionTimer <= 0) {
          sus.reactionTimer = 0.65;
          const dmg = op.role === "shield" ? 8 : 16;
          op.hp = Math.max(0, op.hp - dmg);
          shotsFired++;
          state.tracerLines.push({
            x1: sus.x,
            y1: sus.y,
            x2: op.x,
            y2: op.y,
            color: "#ef4444",
            timer: 0.14,
          });
        }
        break;
      }
    }
  }

  // Check victory / failure conditions
  const allSuspectsDown = state.suspects.every((s) => s.neutralized);
  const allOpsDown = state.operators.every((o) => o.hp <= 0);

  if (allSuspectsDown) {
    // Auto-secure all remaining hostages once room is clear
    for (const h of state.hostages) {
      if (!h.rescued) {
        h.rescued = true;
        state.score += 200;
        state.tokensEarned += 5;
      }
    }
    state.tokensEarned += 15;
    state.activeCommsLogId = "all_clear";
    state.phase = "victory";
  } else if (allOpsDown) {
    state.phase = "failed";
  }

  return { shotsFired, flashDetonated, doorBreached };
}
