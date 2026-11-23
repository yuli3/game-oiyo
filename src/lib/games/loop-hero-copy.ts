// Every word Loop Road shows, per locale (2026-11-23). The engine keeps ids;
// names, card text, loot names and floating text come from here.

export type LoopLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type CardId = "grove" | "cemetery" | "vampire_mansion" | "meadow" | "rock" | "oblivion";
type MonsterType = "slime" | "ratwolf" | "skeleton" | "vampire" | "lord";
type Slot = "weapon" | "shield" | "armor" | "ring";
type Rarity = "common" | "rare" | "epic";

export interface LoopCopy {
  title: string;
  cards: Record<CardId, { name: string; description: string }>;
  monsters: Record<MonsterType, string>;
  starterSword: string;
  adjectives: Record<Rarity, readonly string[]>;
  slotItems: Record<Slot, string>;
  slotLabels: Record<Slot, string>;
  lootName: (adj: string, item: string, level: number) => string;
  fx: {
    morning: (hp: number) => string;
    campfire: (hp: number) => string;
    peak: string;
    battle: string;
    crit: (dmg: number) => string;
    defeated: string;
    slain: (name: string) => string;
    found: (item: string) => string;
  };
  ui: {
    loop: string;
    day: (n: number) => string;
    combat: string;
    resume: string;
    pause: string;
    speed: (x: number) => string;
    mute: string;
    unmute: string;
    share: string;
    enterFull: string;
    exitFull: string;
    restart: string;
    summary: string;
    fallen: string;
    fallenBody: (loops: number, days: number) => string;
    newRun: string;
    shareRecord: string;
    placeOn: (card: string) => string;
    deck: (n: number) => string;
    tapTile: string;
    pickCard: string;
    noCards: string;
    equipment: string;
    atk: string;
    def: string;
    vamp: string;
    regen: string;
    bag: (n: number) => string;
    empty: string;
    equip: string;
    discard: string;
    lootHint: string;
    maxHp: string;
    vampStat: string;
    shareLine: (day: number, hp: number, max: number, atk: number | string, def: number) => string;
  };
}

const EN: LoopCopy = {
  title: "Loop Road",
  cards: {
    grove: { name: "Grove", description: "Spawns a Ratwolf every 2 days onto adjacent road." },
    cemetery: { name: "Cemetery", description: "Spawns a Skeleton every 3 days onto adjacent road." },
    vampire_mansion: { name: "Vampire Mansion", description: "Adds a Vampire to all battles within 1 tile." },
    meadow: { name: "Meadow", description: "Heals 2 HP each morning (+3 if Blooming adjacent to non-meadow)." },
    rock: { name: "Rock", description: "+1% base Max HP. 3x3 Rocks form a Mountain Peak (+120 HP)!" },
    oblivion: { name: "Oblivion", description: "Destroys any tile and clears monsters on it." },
  },
  monsters: { slime: "Slime", ratwolf: "Ratwolf", skeleton: "Skeleton", vampire: "Vampire", lord: "Lord Vampire" },
  starterSword: "Rusty Shortsword",
  adjectives: {
    common: ["Iron", "Sturdy", "Worn", "Bronze"],
    rare: ["Knightly", "Obsidian", "Silver", "Tempered"],
    epic: ["Celestial", "Vampiric", "Dragonforged", "Mythic"],
  },
  slotItems: { weapon: "Sword", shield: "Kite Shield", armor: "Platebody", ring: "Band" },
  slotLabels: { weapon: "Weapon", shield: "Shield", armor: "Armor", ring: "Ring" },
  lootName: (adj, item, level) => `${adj} ${item} Lv.${level}`,
  fx: {
    morning: (hp) => `+${hp} HP Morning`,
    campfire: (hp) => `Campfire Rest: +${hp} HP`,
    peak: "Mountain Peak Formed! (+120 HP)",
    battle: "BATTLE!",
    crit: (d) => `-${d} CRIT!`,
    defeated: "HERO DEFEATED",
    slain: (n) => `${n} Slain`,
    found: (i) => `Found ${i}!`,
  },
  ui: {
    loop: "Loop",
    day: (n) => `Day ${n}`,
    combat: "Combat",
    resume: "Resume game",
    pause: "Pause game",
    speed: (x) => `Game speed, now ${x}x`,
    mute: "Mute sound",
    unmute: "Unmute sound",
    share: "Share expedition",
    enterFull: "Enter fullscreen",
    exitFull: "Exit fullscreen",
    restart: "Restart expedition",
    summary: "Expedition summary",
    fallen: "HERO FALLEN",
    fallenBody: (l, d) => `The loop claimed another soul. You completed ${l} loops and survived ${d} days.`,
    newRun: "Start new expedition",
    shareRecord: "Share record",
    placeOn: (c) => `Tap a highlighted green tile to place ${c}`,
    deck: (n) => `Deck in hand (${n}/6)`,
    tapTile: "Tap a board tile to place",
    pickCard: "Pick a card to place",
    noCards: "No cards in hand. Defeat monsters to earn cards!",
    equipment: "Hero equipment",
    atk: "Attack",
    def: "Defense",
    vamp: "Vampirism",
    regen: "Regen",
    bag: (n) => `Bag (${n}/12)`,
    empty: "Empty",
    equip: "Equip",
    discard: "Discard",
    lootHint: "Loot dropped by monsters appears here.",
    maxHp: "Max HP",
    vampStat: "Vampirism",
    shareLine: (d, hp, m, a, f) => `Day ${d} • HP ${hp}/${m} • ATK ${a} • DEF ${f}`,
  },
};

const KO: LoopCopy = {
  title: "루프 로드",
  cards: {
    grove: { name: "숲", description: "2일마다 옆 길에 쥐늑대를 불러냅니다." },
    cemetery: { name: "묘지", description: "3일마다 옆 길에 해골을 불러냅니다." },
    vampire_mansion: { name: "흡혈귀 저택", description: "1칸 안의 모든 전투에 흡혈귀가 끼어듭니다." },
    meadow: { name: "초원", description: "매일 아침 HP 2 회복 (초원 아닌 칸 옆이면 꽃 피어 +3)." },
    rock: { name: "바위", description: "기본 최대 HP +1%. 바위 3×3이면 산봉우리 (+120 HP)!" },
    oblivion: { name: "망각", description: "아무 칸이나 지우고 그 위 몬스터도 없앱니다." },
  },
  monsters: { slime: "슬라임", ratwolf: "쥐늑대", skeleton: "해골", vampire: "흡혈귀", lord: "흡혈귀 군주" },
  starterSword: "녹슨 단검",
  adjectives: {
    common: ["무쇠", "튼튼한", "낡은", "청동"],
    rare: ["기사의", "흑요석", "은빛", "담금질한"],
    epic: ["천상의", "흡혈의", "용이 벼린", "신화의"],
  },
  slotItems: { weapon: "검", shield: "연 방패", armor: "판금 갑옷", ring: "반지" },
  slotLabels: { weapon: "무기", shield: "방패", armor: "갑옷", ring: "반지" },
  lootName: (adj, item, level) => `${adj} ${item} Lv.${level}`,
  fx: {
    morning: (hp) => `아침 +${hp} HP`,
    campfire: (hp) => `모닥불 휴식 +${hp} HP`,
    peak: "산봉우리 완성! (+120 HP)",
    battle: "전투!",
    crit: (d) => `-${d} 치명타!`,
    defeated: "영웅 쓰러짐",
    slain: (n) => `${n} 처치`,
    found: (i) => `${i} 획득!`,
  },
  ui: {
    loop: "루프",
    day: (n) => `${n}일째`,
    combat: "전투 중",
    resume: "다시 시작",
    pause: "일시 정지",
    speed: (x) => `게임 속도, 지금 ${x}배`,
    mute: "소리 끄기",
    unmute: "소리 켜기",
    share: "원정 공유",
    enterFull: "전체 화면",
    exitFull: "전체 화면 나가기",
    restart: "원정 다시 시작",
    summary: "원정 요약",
    fallen: "영웅이 쓰러졌습니다",
    fallenBody: (l, d) => `루프가 또 한 영혼을 삼켰습니다. 루프 ${l}바퀴, ${d}일을 버텼어요.`,
    newRun: "새 원정 시작",
    shareRecord: "기록 공유",
    placeOn: (c) => `초록으로 빛나는 칸을 눌러 ${c} 놓기`,
    deck: (n) => `손에 든 카드 (${n}/6)`,
    tapTile: "판의 칸을 눌러 놓으세요",
    pickCard: "놓을 카드를 고르세요",
    noCards: "카드가 없습니다. 몬스터를 쓰러뜨리면 카드를 얻어요!",
    equipment: "영웅 장비",
    atk: "공격력",
    def: "방어력",
    vamp: "흡혈",
    regen: "재생",
    bag: (n) => `가방 (${n}/12)`,
    empty: "비어 있음",
    equip: "장착",
    discard: "버리기",
    lootHint: "몬스터가 떨어뜨린 전리품이 여기 모입니다.",
    maxHp: "최대 HP",
    vampStat: "흡혈",
    shareLine: (d, hp, m, a, f) => `${d}일째 • HP ${hp}/${m} • 공격 ${a} • 방어 ${f}`,
  },
};

const JA: LoopCopy = {
  title: "ループロード",
  cards: {
    grove: { name: "林", description: "2日ごとに隣の道へネズミオオカミを呼ぶ。" },
    cemetery: { name: "墓地", description: "3日ごとに隣の道へガイコツを呼ぶ。" },
    vampire_mansion: { name: "吸血鬼の館", description: "1マス以内の戦闘すべてに吸血鬼が加わる。" },
    meadow: { name: "草原", description: "毎朝HPを2回復(草原以外の隣なら開花して+3)。" },
    rock: { name: "岩", description: "基本最大HP+1%。岩3×3で山頂に(+120 HP)!" },
    oblivion: { name: "忘却", description: "どのマスも消し、その上の魔物も消す。" },
  },
  monsters: { slime: "スライム", ratwolf: "ネズミオオカミ", skeleton: "ガイコツ", vampire: "吸血鬼", lord: "吸血鬼の王" },
  starterSword: "錆びた短剣",
  adjectives: {
    common: ["鉄の", "頑丈な", "古びた", "青銅の"],
    rare: ["騎士の", "黒曜石の", "銀の", "鍛えた"],
    epic: ["天上の", "吸血の", "竜鍛えの", "神話の"],
  },
  slotItems: { weapon: "剣", shield: "カイトシールド", armor: "板金鎧", ring: "指輪" },
  slotLabels: { weapon: "武器", shield: "盾", armor: "鎧", ring: "指輪" },
  lootName: (adj, item, level) => `${adj}${item} Lv.${level}`,
  fx: {
    morning: (hp) => `朝 +${hp} HP`,
    campfire: (hp) => `焚き火で休息 +${hp} HP`,
    peak: "山頂ができた!(+120 HP)",
    battle: "戦闘!",
    crit: (d) => `-${d} 会心!`,
    defeated: "英雄が倒れた",
    slain: (n) => `${n}を撃破`,
    found: (i) => `${i}を入手!`,
  },
  ui: {
    loop: "ループ",
    day: (n) => `${n}日目`,
    combat: "戦闘中",
    resume: "再開",
    pause: "一時停止",
    speed: (x) => `ゲーム速度、いま${x}倍`,
    mute: "音を消す",
    unmute: "音を出す",
    share: "遠征を共有",
    enterFull: "全画面",
    exitFull: "全画面を終了",
    restart: "遠征をやり直す",
    summary: "遠征のまとめ",
    fallen: "英雄が倒れた",
    fallenBody: (l, d) => `ループがまた一つ魂を奪った。${l}周、${d}日を生き抜いた。`,
    newRun: "新しい遠征",
    shareRecord: "記録を共有",
    placeOn: (c) => `緑に光るマスを押して${c}を置く`,
    deck: (n) => `手札 (${n}/6)`,
    tapTile: "盤のマスを押して置く",
    pickCard: "置くカードを選ぶ",
    noCards: "手札がない。魔物を倒すとカードが手に入る!",
    equipment: "英雄の装備",
    atk: "攻撃力",
    def: "防御力",
    vamp: "吸血",
    regen: "再生",
    bag: (n) => `バッグ (${n}/12)`,
    empty: "空き",
    equip: "装備",
    discard: "捨てる",
    lootHint: "魔物が落とした戦利品はここに入る。",
    maxHp: "最大HP",
    vampStat: "吸血",
    shareLine: (d, hp, m, a, f) => `${d}日目 • HP ${hp}/${m} • 攻撃 ${a} • 防御 ${f}`,
  },
};

const ZH: LoopCopy = {
  title: "循环之路",
  cards: {
    grove: { name: "树林", description: "每2天在相邻道路召出一只鼠狼。" },
    cemetery: { name: "墓地", description: "每3天在相邻道路召出一具骷髅。" },
    vampire_mansion: { name: "吸血鬼宅邸", description: "1格内的所有战斗都会加入一只吸血鬼。" },
    meadow: { name: "草地", description: "每天早上回复2点HP(挨着非草地时开花+3)。" },
    rock: { name: "岩石", description: "基础最大HP+1%。3×3岩石组成山峰(+120 HP)!" },
    oblivion: { name: "遗忘", description: "摧毁任意一格,并清除其上的怪物。" },
  },
  monsters: { slime: "史莱姆", ratwolf: "鼠狼", skeleton: "骷髅", vampire: "吸血鬼", lord: "吸血鬼领主" },
  starterSword: "生锈短剑",
  adjectives: {
    common: ["铁制", "坚固", "破旧", "青铜"],
    rare: ["骑士", "黑曜石", "白银", "淬火"],
    epic: ["天界", "嗜血", "龙铸", "神话"],
  },
  slotItems: { weapon: "剑", shield: "鸢盾", armor: "板甲", ring: "戒指" },
  slotLabels: { weapon: "武器", shield: "盾牌", armor: "护甲", ring: "戒指" },
  lootName: (adj, item, level) => `${adj}${item} Lv.${level}`,
  fx: {
    morning: (hp) => `清晨 +${hp} HP`,
    campfire: (hp) => `篝火休息 +${hp} HP`,
    peak: "山峰形成!(+120 HP)",
    battle: "战斗!",
    crit: (d) => `-${d} 暴击!`,
    defeated: "英雄倒下",
    slain: (n) => `击败${n}`,
    found: (i) => `获得${i}!`,
  },
  ui: {
    loop: "循环",
    day: (n) => `第${n}天`,
    combat: "战斗中",
    resume: "继续",
    pause: "暂停",
    speed: (x) => `游戏速度,当前${x}倍`,
    mute: "静音",
    unmute: "开启声音",
    share: "分享远征",
    enterFull: "全屏",
    exitFull: "退出全屏",
    restart: "重新远征",
    summary: "远征总结",
    fallen: "英雄倒下了",
    fallenBody: (l, d) => `循环又吞噬了一个灵魂。你完成了${l}圈,坚持了${d}天。`,
    newRun: "开始新的远征",
    shareRecord: "分享记录",
    placeOn: (c) => `点击发绿光的格子放置${c}`,
    deck: (n) => `手牌 (${n}/6)`,
    tapTile: "点击棋盘格子放置",
    pickCard: "选择要放置的卡牌",
    noCards: "没有手牌。击败怪物可获得卡牌!",
    equipment: "英雄装备",
    atk: "攻击力",
    def: "防御力",
    vamp: "吸血",
    regen: "再生",
    bag: (n) => `背包 (${n}/12)`,
    empty: "空",
    equip: "装备",
    discard: "丢弃",
    lootHint: "怪物掉落的战利品会出现在这里。",
    maxHp: "最大HP",
    vampStat: "吸血",
    shareLine: (d, hp, m, a, f) => `第${d}天 • HP ${hp}/${m} • 攻击 ${a} • 防御 ${f}`,
  },
};

const FR: LoopCopy = {
  title: "Route en boucle",
  cards: {
    grove: { name: "Bosquet", description: "Fait apparaître un rat-loup tous les 2 jours sur la route voisine." },
    cemetery: { name: "Cimetière", description: "Fait apparaître un squelette tous les 3 jours sur la route voisine." },
    vampire_mansion: { name: "Manoir vampire", description: "Ajoute un vampire à tous les combats à 1 case." },
    meadow: { name: "Prairie", description: "Soigne 2 PV chaque matin (+3 en fleur à côté d'une autre case)." },
    rock: { name: "Rocher", description: "+1 % de PV max. 3×3 rochers forment un pic (+120 PV) !" },
    oblivion: { name: "Oubli", description: "Détruit une case et les monstres dessus." },
  },
  monsters: { slime: "Slime", ratwolf: "Rat-loup", skeleton: "Squelette", vampire: "Vampire", lord: "Seigneur vampire" },
  starterSword: "Épée courte rouillée",
  adjectives: {
    common: ["en fer", "robuste", "usé", "en bronze"],
    rare: ["de chevalier", "d'obsidienne", "d'argent", "trempé"],
    epic: ["céleste", "vampirique", "forgé du dragon", "mythique"],
  },
  slotItems: { weapon: "Épée", shield: "Écu", armor: "Cuirasse", ring: "Anneau" },
  slotLabels: { weapon: "Arme", shield: "Bouclier", armor: "Armure", ring: "Anneau" },
  lootName: (adj, item, level) => `${item} ${adj} Niv.${level}`,
  fx: {
    morning: (hp) => `Matin +${hp} PV`,
    campfire: (hp) => `Repos au feu +${hp} PV`,
    peak: "Pic formé ! (+120 PV)",
    battle: "COMBAT !",
    crit: (d) => `-${d} CRITIQUE !`,
    defeated: "HÉROS VAINCU",
    slain: (n) => `${n} vaincu`,
    found: (i) => `${i} trouvé !`,
  },
  ui: {
    loop: "Boucle",
    day: (n) => `Jour ${n}`,
    combat: "Combat",
    resume: "Reprendre",
    pause: "Pause",
    speed: (x) => `Vitesse du jeu, actuellement ${x}x`,
    mute: "Couper le son",
    unmute: "Activer le son",
    share: "Partager l'expédition",
    enterFull: "Plein écran",
    exitFull: "Quitter le plein écran",
    restart: "Recommencer l'expédition",
    summary: "Bilan de l'expédition",
    fallen: "HÉROS TOMBÉ",
    fallenBody: (l, d) => `La boucle a pris une âme de plus. ${l} boucles bouclées, ${d} jours tenus.`,
    newRun: "Nouvelle expédition",
    shareRecord: "Partager le score",
    placeOn: (c) => `Touchez une case verte pour poser ${c}`,
    deck: (n) => `Cartes en main (${n}/6)`,
    tapTile: "Touchez une case du plateau",
    pickCard: "Choisissez une carte à poser",
    noCards: "Aucune carte. Battez des monstres pour en gagner !",
    equipment: "Équipement du héros",
    atk: "Attaque",
    def: "Défense",
    vamp: "Vampirisme",
    regen: "Régénération",
    bag: (n) => `Sac (${n}/12)`,
    empty: "Vide",
    equip: "Équiper",
    discard: "Jeter",
    lootHint: "Le butin des monstres arrive ici.",
    maxHp: "PV max",
    vampStat: "Vampirisme",
    shareLine: (d, hp, m, a, f) => `Jour ${d} • PV ${hp}/${m} • ATQ ${a} • DÉF ${f}`,
  },
};

const ES: LoopCopy = {
  title: "Camino en bucle",
  cards: {
    grove: { name: "Arboleda", description: "Cada 2 días invoca un ratalobo en el camino vecino." },
    cemetery: { name: "Cementerio", description: "Cada 3 días invoca un esqueleto en el camino vecino." },
    vampire_mansion: { name: "Mansión vampírica", description: "Añade un vampiro a todas las batallas a 1 casilla." },
    meadow: { name: "Pradera", description: "Cura 2 PV cada mañana (+3 si florece junto a otra casilla)." },
    rock: { name: "Roca", description: "+1 % de PV máx. 3×3 rocas forman una cumbre (+120 PV)!" },
    oblivion: { name: "Olvido", description: "Destruye una casilla y los monstruos que haya." },
  },
  monsters: { slime: "Limo", ratwolf: "Ratalobo", skeleton: "Esqueleto", vampire: "Vampiro", lord: "Señor vampiro" },
  starterSword: "Espada corta oxidada",
  adjectives: {
    common: ["de hierro", "robusta", "gastada", "de bronce"],
    rare: ["de caballero", "de obsidiana", "de plata", "templada"],
    epic: ["celestial", "vampírica", "forjada por dragón", "mítica"],
  },
  slotItems: { weapon: "Espada", shield: "Escudo cometa", armor: "Coraza", ring: "Anillo" },
  slotLabels: { weapon: "Arma", shield: "Escudo", armor: "Armadura", ring: "Anillo" },
  lootName: (adj, item, level) => `${item} ${adj} Nv.${level}`,
  fx: {
    morning: (hp) => `Mañana +${hp} PV`,
    campfire: (hp) => `Descanso en la hoguera +${hp} PV`,
    peak: "¡Cumbre formada! (+120 PV)",
    battle: "¡BATALLA!",
    crit: (d) => `-${d} ¡CRÍTICO!`,
    defeated: "HÉROE DERROTADO",
    slain: (n) => `${n} derrotado`,
    found: (i) => `¡${i} encontrado!`,
  },
  ui: {
    loop: "Bucle",
    day: (n) => `Día ${n}`,
    combat: "Combate",
    resume: "Reanudar",
    pause: "Pausa",
    speed: (x) => `Velocidad del juego, ahora ${x}x`,
    mute: "Silenciar",
    unmute: "Activar sonido",
    share: "Compartir expedición",
    enterFull: "Pantalla completa",
    exitFull: "Salir de pantalla completa",
    restart: "Reiniciar expedición",
    summary: "Resumen de la expedición",
    fallen: "HÉROE CAÍDO",
    fallenBody: (l, d) => `El bucle se llevó otra alma. Completaste ${l} vueltas y aguantaste ${d} días.`,
    newRun: "Nueva expedición",
    shareRecord: "Compartir récord",
    placeOn: (c) => `Toca una casilla verde para colocar ${c}`,
    deck: (n) => `Cartas en mano (${n}/6)`,
    tapTile: "Toca una casilla del tablero",
    pickCard: "Elige una carta para colocar",
    noCards: "Sin cartas. ¡Derrota monstruos para ganarlas!",
    equipment: "Equipo del héroe",
    atk: "Ataque",
    def: "Defensa",
    vamp: "Vampirismo",
    regen: "Regeneración",
    bag: (n) => `Bolsa (${n}/12)`,
    empty: "Vacío",
    equip: "Equipar",
    discard: "Tirar",
    lootHint: "El botín de los monstruos aparece aquí.",
    maxHp: "PV máx.",
    vampStat: "Vampirismo",
    shareLine: (d, hp, m, a, f) => `Día ${d} • PV ${hp}/${m} • ATQ ${a} • DEF ${f}`,
  },
};

export const LOOP_COPY: Record<LoopLocale, LoopCopy> = { ko: KO, en: EN, ja: JA, zh: ZH, fr: FR, es: ES };

export function loopCopy(locale: string | undefined): LoopCopy {
  return LOOP_COPY[(locale ?? "en") as LoopLocale] ?? EN;
}
