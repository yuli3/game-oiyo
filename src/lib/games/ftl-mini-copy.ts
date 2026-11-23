// Every word Star Skiff shows, per locale (2026-11-23). The engine keeps ids;
// ship, room, weapon, crew names and floating text come from here.

type Loc = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type RoomKey = "helm" | "cockpit" | "shields" | "weapons" | "engines" | "medbay" | "oxygen";

export interface SkiffCopy {
  playerShip: string;
  rooms: Record<RoomKey, string>;
  weapons: { burst: string; missile: string; basic: string; heavy: string };
  crew: { pilot: string; eng: string; gunner: string };
  enemies: readonly [string, string, string, string];
  lv: (name: string, level: number) => string;
  fx: {
    miss: string;
    absorbed: string;
    hull: (d: number) => string;
    destroyed: string;
    allClear: string;
    victory: (scrap: number, missiles: number) => string;
    jump: (sector: number) => string;
  };
  ui: {
    cruiserAlt: string;
    eva: (n: number) => string;
    scrap: (n: number) => string;
    missiles: (n: number) => string;
    sector: (n: number, max: number) => string;
    play: string;
    pause: string;
    speed: string;
    mute: string;
    unmute: string;
    restart: string;
    crewHint: string;
    weaponHint: string;
    trophyAlt: string;
    cleared: (max: number) => string;
    clearedBody: string;
    lost: string;
    lostBody: (sector: number) => string;
    recommission: string;
    reactor: string;
    free: (n: number) => string;
    less: (room: string) => string;
    more: (room: string) => string;
    arsenal: string;
    tapTarget: string;
    noTarget: string;
    crewTitle: string;
    tapMove: string;
    transit: string;
    warpDrive: string;
    warpJump: string;
  };
}

const EN: SkiffCopy = {
  playerShip: "USS Antigravity",
  rooms: { helm: "Piloting", cockpit: "Cockpit", shields: "Shields", weapons: "Weapons", engines: "Engines", medbay: "Medbay", oxygen: "Life Support" },
  weapons: { burst: "Burst Laser II", missile: "Artemis Missile", basic: "Basic Laser", heavy: "Heavy Laser I" },
  crew: { pilot: "Cmdr. Vance", eng: "Eng. Chen", gunner: "Gunner Jax" },
  enemies: ["Rust Scout", "Pirate Interceptor", "Auto-Assault Drone", "Hornet Fighter"],
  lv: (n, l) => `${n} Lv.${l}`,
  fx: {
    miss: "MISS!",
    absorbed: "Shield Absorbed",
    hull: (d) => `-${d} Hull`,
    destroyed: "SHIP DESTROYED",
    allClear: "ALL SECTORS CLEARED",
    victory: (s, m) => `Victory! +${s} Scrap, +${m} Missiles`,
    jump: (n) => `Warp Jump: Sector ${n}!`,
  },
  ui: {
    cruiserAlt: "Your skiff",
    eva: (n) => `Eva: ${n}%`,
    scrap: (n) => `${n} Scrap`,
    missiles: (n) => `${n} Missiles`,
    sector: (n, m) => `Sector ${n} / ${m}`,
    play: "Play",
    pause: "Pause",
    speed: "Speed",
    mute: "Mute",
    unmute: "Unmute",
    restart: "Restart",
    crewHint: "Tap one of your rooms to send this crew member",
    weaponHint: "Tap an enemy room to aim this weapon",
    trophyAlt: "Trophy",
    cleared: (m) => `ALL ${m} SECTORS CLEARED`,
    clearedBody: "You beat the last enemy ship and crossed every sector.",
    lost: "HULL BREACH - SHIP LOST",
    lostBody: (s) => `Your ship was torn apart by enemy fire in Sector ${s}.`,
    recommission: "Recommission starship",
    reactor: "Reactor systems",
    free: (n) => `⚡ ${n} free`,
    less: (r) => `Less power to ${r}`,
    more: (r) => `More power to ${r}`,
    arsenal: "Weapon arsenal",
    tapTarget: "Tap to aim",
    noTarget: "No target",
    crewTitle: "Crew",
    tapMove: "Tap to move",
    transit: "Moving",
    warpDrive: "Warp drive",
    warpJump: "Warp jump",
  },
};

const KO: SkiffCopy = {
  playerShip: "반중력호",
  rooms: { helm: "조종실", cockpit: "조종석", shields: "방어막", weapons: "무기실", engines: "엔진", medbay: "의무실", oxygen: "생명 유지" },
  weapons: { burst: "연사 레이저 II", missile: "아르테미스 미사일", basic: "기본 레이저", heavy: "중레이저 I" },
  crew: { pilot: "반스 함장", eng: "첸 기관사", gunner: "잭스 포수" },
  enemies: ["녹슨 정찰선", "해적 요격기", "자동 돌격 드론", "말벌 전투기"],
  lv: (n, l) => `${n} Lv.${l}`,
  fx: {
    miss: "빗나감!",
    absorbed: "방어막이 막음",
    hull: (d) => `선체 -${d}`,
    destroyed: "적함 격파",
    allClear: "모든 구역 돌파",
    victory: (s, m) => `승리! 고철 +${s}, 미사일 +${m}`,
    jump: (n) => `워프! ${n}구역`,
  },
  ui: {
    cruiserAlt: "내 우주선",
    eva: (n) => `회피 ${n}%`,
    scrap: (n) => `고철 ${n}`,
    missiles: (n) => `미사일 ${n}`,
    sector: (n, m) => `${n} / ${m}구역`,
    play: "계속",
    pause: "일시 정지",
    speed: "속도",
    mute: "소리 끄기",
    unmute: "소리 켜기",
    restart: "다시 시작",
    crewHint: "내 우주선 방을 눌러 승무원을 보내세요",
    weaponHint: "적 우주선 방을 눌러 조준하세요",
    trophyAlt: "트로피",
    cleared: (m) => `${m}개 구역 모두 돌파!`,
    clearedBody: "마지막 적함까지 물리치고 모든 구역을 건넜어요.",
    lost: "선체 붕괴, 우주선을 잃었습니다",
    lostBody: (s) => `${s}구역에서 적의 포화에 우주선이 부서졌어요.`,
    recommission: "우주선 다시 띄우기",
    reactor: "원자로 전력",
    free: (n) => `⚡ 남은 전력 ${n}`,
    less: (r) => `${r} 전력 줄이기`,
    more: (r) => `${r} 전력 늘리기`,
    arsenal: "무기",
    tapTarget: "눌러서 조준",
    noTarget: "조준 없음",
    crewTitle: "승무원",
    tapMove: "눌러서 이동",
    transit: "이동 중",
    warpDrive: "워프 엔진",
    warpJump: "워프 점프",
  },
};

const JA: SkiffCopy = {
  playerShip: "反重力号",
  rooms: { helm: "操縦室", cockpit: "コックピット", shields: "シールド", weapons: "武器室", engines: "エンジン", medbay: "医務室", oxygen: "生命維持" },
  weapons: { burst: "連射レーザーII", missile: "アルテミスミサイル", basic: "基本レーザー", heavy: "重レーザーI" },
  crew: { pilot: "ヴァンス艦長", eng: "チェン機関士", gunner: "ジャックス砲手" },
  enemies: ["錆びた偵察艇", "海賊迎撃機", "自動突撃ドローン", "ホーネット戦闘機"],
  lv: (n, l) => `${n} Lv.${l}`,
  fx: {
    miss: "ミス!",
    absorbed: "シールドが防いだ",
    hull: (d) => `船体 -${d}`,
    destroyed: "敵艦撃破",
    allClear: "全セクター突破",
    victory: (s, m) => `勝利! スクラップ+${s}、ミサイル+${m}`,
    jump: (n) => `ワープ!セクター${n}`,
  },
  ui: {
    cruiserAlt: "自分の船",
    eva: (n) => `回避 ${n}%`,
    scrap: (n) => `スクラップ ${n}`,
    missiles: (n) => `ミサイル ${n}`,
    sector: (n, m) => `セクター ${n} / ${m}`,
    play: "再開",
    pause: "一時停止",
    speed: "速度",
    mute: "音を消す",
    unmute: "音を出す",
    restart: "やり直す",
    crewHint: "自分の船の部屋を押して乗員を送る",
    weaponHint: "敵船の部屋を押して狙う",
    trophyAlt: "トロフィー",
    cleared: (m) => `全${m}セクター突破!`,
    clearedBody: "最後の敵艦を倒し、すべてのセクターを越えた。",
    lost: "船体崩壊、船を失った",
    lostBody: (s) => `セクター${s}で敵の砲火に船が砕けた。`,
    recommission: "船を再就役させる",
    reactor: "リアクター電力",
    free: (n) => `⚡ 残り ${n}`,
    less: (r) => `${r}の電力を減らす`,
    more: (r) => `${r}の電力を増やす`,
    arsenal: "武器",
    tapTarget: "押して照準",
    noTarget: "照準なし",
    crewTitle: "乗員",
    tapMove: "押して移動",
    transit: "移動中",
    warpDrive: "ワープドライブ",
    warpJump: "ワープジャンプ",
  },
};

const ZH: SkiffCopy = {
  playerShip: "反重力号",
  rooms: { helm: "驾驶室", cockpit: "驾驶舱", shields: "护盾", weapons: "武器舱", engines: "引擎", medbay: "医疗舱", oxygen: "生命维持" },
  weapons: { burst: "连发激光 II", missile: "阿尔忒弥斯导弹", basic: "基础激光", heavy: "重型激光 I" },
  crew: { pilot: "万斯舰长", eng: "陈工程师", gunner: "杰克斯炮手" },
  enemies: ["锈蚀侦察艇", "海盗拦截机", "自动突击无人机", "黄蜂战斗机"],
  lv: (n, l) => `${n} Lv.${l}`,
  fx: {
    miss: "未命中!",
    absorbed: "护盾抵挡",
    hull: (d) => `船体 -${d}`,
    destroyed: "敌舰被击毁",
    allClear: "全部星区通过",
    victory: (s, m) => `胜利!废料+${s},导弹+${m}`,
    jump: (n) => `跃迁!第${n}星区`,
  },
  ui: {
    cruiserAlt: "我的飞船",
    eva: (n) => `闪避 ${n}%`,
    scrap: (n) => `废料 ${n}`,
    missiles: (n) => `导弹 ${n}`,
    sector: (n, m) => `星区 ${n} / ${m}`,
    play: "继续",
    pause: "暂停",
    speed: "速度",
    mute: "静音",
    unmute: "开启声音",
    restart: "重新开始",
    crewHint: "点击己方舱室派遣船员",
    weaponHint: "点击敌方舱室进行瞄准",
    trophyAlt: "奖杯",
    cleared: (m) => `${m}个星区全部通过!`,
    clearedBody: "你击败了最后一艘敌舰,穿越了所有星区。",
    lost: "船体破裂,飞船损失",
    lostBody: (s) => `你的飞船在第${s}星区被敌方火力击碎。`,
    recommission: "重新启用飞船",
    reactor: "反应堆电力",
    free: (n) => `⚡ 剩余 ${n}`,
    less: (r) => `减少${r}电力`,
    more: (r) => `增加${r}电力`,
    arsenal: "武器",
    tapTarget: "点击瞄准",
    noTarget: "未瞄准",
    crewTitle: "船员",
    tapMove: "点击移动",
    transit: "移动中",
    warpDrive: "跃迁引擎",
    warpJump: "跃迁",
  },
};

const FR: SkiffCopy = {
  playerShip: "Antigravité",
  rooms: { helm: "Pilotage", cockpit: "Cockpit", shields: "Boucliers", weapons: "Armes", engines: "Moteurs", medbay: "Infirmerie", oxygen: "Survie" },
  weapons: { burst: "Laser rafale II", missile: "Missile Artémis", basic: "Laser de base", heavy: "Laser lourd I" },
  crew: { pilot: "Cdt Vance", eng: "Ing. Chen", gunner: "Artilleur Jax" },
  enemies: ["Éclaireur rouillé", "Intercepteur pirate", "Drone d'assaut", "Chasseur frelon"],
  lv: (n, l) => `${n} Niv.${l}`,
  fx: {
    miss: "RATÉ !",
    absorbed: "Bouclier encaisse",
    hull: (d) => `Coque -${d}`,
    destroyed: "VAISSEAU DÉTRUIT",
    allClear: "TOUS LES SECTEURS FRANCHIS",
    victory: (s, m) => `Victoire ! +${s} ferraille, +${m} missiles`,
    jump: (n) => `Saut : secteur ${n} !`,
  },
  ui: {
    cruiserAlt: "Votre vaisseau",
    eva: (n) => `Esquive ${n} %`,
    scrap: (n) => `${n} ferraille`,
    missiles: (n) => `${n} missiles`,
    sector: (n, m) => `Secteur ${n} / ${m}`,
    play: "Reprendre",
    pause: "Pause",
    speed: "Vitesse",
    mute: "Couper le son",
    unmute: "Activer le son",
    restart: "Recommencer",
    crewHint: "Touchez une de vos salles pour y envoyer ce membre",
    weaponHint: "Touchez une salle ennemie pour viser",
    trophyAlt: "Trophée",
    cleared: (m) => `${m} SECTEURS FRANCHIS`,
    clearedBody: "Vous avez battu le dernier vaisseau ennemi et traversé tous les secteurs.",
    lost: "BRÈCHE DANS LA COQUE - VAISSEAU PERDU",
    lostBody: (s) => `Votre vaisseau a été mis en pièces au secteur ${s}.`,
    recommission: "Relancer le vaisseau",
    reactor: "Énergie du réacteur",
    free: (n) => `⚡ ${n} libre`,
    less: (r) => `Moins d'énergie : ${r}`,
    more: (r) => `Plus d'énergie : ${r}`,
    arsenal: "Armement",
    tapTarget: "Touchez pour viser",
    noTarget: "Aucune cible",
    crewTitle: "Équipage",
    tapMove: "Touchez pour déplacer",
    transit: "En route",
    warpDrive: "Moteur de saut",
    warpJump: "Sauter",
  },
};

const ES: SkiffCopy = {
  playerShip: "Antigravedad",
  rooms: { helm: "Pilotaje", cockpit: "Cabina", shields: "Escudos", weapons: "Armas", engines: "Motores", medbay: "Enfermería", oxygen: "Soporte vital" },
  weapons: { burst: "Láser ráfaga II", missile: "Misil Artemisa", basic: "Láser básico", heavy: "Láser pesado I" },
  crew: { pilot: "Cmdte. Vance", eng: "Ing. Chen", gunner: "Artillero Jax" },
  enemies: ["Explorador oxidado", "Interceptor pirata", "Dron de asalto", "Caza avispón"],
  lv: (n, l) => `${n} Nv.${l}`,
  fx: {
    miss: "¡FALLO!",
    absorbed: "El escudo lo absorbe",
    hull: (d) => `Casco -${d}`,
    destroyed: "NAVE DESTRUIDA",
    allClear: "TODOS LOS SECTORES SUPERADOS",
    victory: (s, m) => `¡Victoria! +${s} chatarra, +${m} misiles`,
    jump: (n) => `¡Salto: sector ${n}!`,
  },
  ui: {
    cruiserAlt: "Tu nave",
    eva: (n) => `Evasión ${n} %`,
    scrap: (n) => `${n} chatarra`,
    missiles: (n) => `${n} misiles`,
    sector: (n, m) => `Sector ${n} / ${m}`,
    play: "Reanudar",
    pause: "Pausa",
    speed: "Velocidad",
    mute: "Silenciar",
    unmute: "Activar sonido",
    restart: "Reiniciar",
    crewHint: "Toca una de tus salas para enviar a este tripulante",
    weaponHint: "Toca una sala enemiga para apuntar",
    trophyAlt: "Trofeo",
    cleared: (m) => `¡${m} SECTORES SUPERADOS!`,
    clearedBody: "Venciste a la última nave enemiga y cruzaste todos los sectores.",
    lost: "BRECHA EN EL CASCO - NAVE PERDIDA",
    lostBody: (s) => `Tu nave quedó destrozada en el sector ${s}.`,
    recommission: "Volver a poner en servicio",
    reactor: "Energía del reactor",
    free: (n) => `⚡ ${n} libre`,
    less: (r) => `Menos energía a ${r}`,
    more: (r) => `Más energía a ${r}`,
    arsenal: "Armamento",
    tapTarget: "Toca para apuntar",
    noTarget: "Sin objetivo",
    crewTitle: "Tripulación",
    tapMove: "Toca para mover",
    transit: "En camino",
    warpDrive: "Motor de salto",
    warpJump: "Saltar",
  },
};

const ALL: Record<Loc, SkiffCopy> = { ko: KO, en: EN, ja: JA, zh: ZH, fr: FR, es: ES };

export function skiffCopy(locale: string | undefined): SkiffCopy {
  return ALL[(locale ?? "en") as Loc] ?? EN;
}
