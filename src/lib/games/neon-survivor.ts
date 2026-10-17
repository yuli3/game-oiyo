export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  exp: number;
  nextExp: number;
  facing: number;
  invulnTimer: number;
  magnetRadius: number;
}

export type EnemyKind = 'scout' | 'swarmer' | 'brute' | 'boss';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  color: string;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  radius: number;
  color: string;
  life: number;
}

export interface OrbitBlade {
  angle: number;
  radius: number;
  damage: number;
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export interface WeaponLevels {
  blaster: number;
  orbit: number;
  nova: number;
  speed: number;
  magnet: number;
  hull: number;
}

export interface UpgradeCard {
  id: keyof WeaponLevels;
  title: Record<string, string>;
  desc: Record<string, string>;
  icon: string;
}

export interface NeonSurvivorState {
  arenaWidth: number;
  arenaHeight: number;
  player: Player;
  weapons: WeaponLevels;
  blasterTimer: number;
  novaTimer: number;
  orbitAngle: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  floatingTexts: FloatingText[];
  score: number;
  kills: number;
  survivalTime: number;
  gameOver: boolean;
  levelUpPending: boolean;
  upgradeChoices: UpgradeCard[];
  spawnTimer: number;
  bossSpawned: boolean;
  nextEntityId: number;
}

export const ARENA_WIDTH = 1600;
export const ARENA_HEIGHT = 1200;

export function expThresholdForLevel(level: number): number {
  return Math.floor(40 * Math.pow(1.3, level - 1));
}

export const UPGRADE_CATALOG: UpgradeCard[] = [
  {
    id: 'blaster',
    title: {
      ko: '플라즈마 블래스터',
      en: 'Plasma Blaster',
      ja: 'プラズマブラスター',
      zh: '等离子爆能枪',
      fr: 'Blaster à plasma',
      es: 'Bláster de plasma',
    },
    desc: {
      ko: '가장 가까운 적을 조준 사격하는 고속 플라즈마 탄환을 강화합니다.',
      en: 'Fires high-speed plasma bolts at the nearest enemy with extra bullets.',
      ja: '最も近い敵を自動照準して攻撃するプラズマ弾を強化します。',
      zh: '增强自动瞄准最近敌人的高速等离子弹。',
      fr: 'Tire des projectiles plasma rapides sur l’ennemi le plus proche.',
      es: 'Dispara proyectiles de plasma veloces al enemigo más cercano.',
    },
    icon: '⚡',
  },
  {
    id: 'orbit',
    title: {
      ko: '궤도 에너지 쉴드',
      en: 'Orbital Energy Shield',
      ja: '軌道エネルギーシールド',
      zh: '轨道能量护盾',
      fr: 'Bouclier orbital',
      es: 'Escudo de energía orbital',
    },
    desc: {
      ko: '기체 주위를 고속 회전하며 근접하는 적을 연속으로 갈아냅니다.',
      en: 'Energy blades revolve around you, shredding nearby swarms.',
      ja: '機体の周囲を高速旋回し、接近する敵を刻みます。',
      zh: '在机体周围高速旋转，消灭靠近的敌人。',
      fr: 'Des lames d’énergie tournoient et déchiquètent les ennemis proches.',
      es: 'Cuchillas de energía giran a tu alrededor triturando enemigos.',
    },
    icon: '🛡️',
  },
  {
    id: 'nova',
    title: {
      ko: '노바 충격파',
      en: 'Nova Shockwave',
      ja: 'ノヴァ衝撃波',
      zh: '新星冲击波',
      fr: 'Onde de choc Nova',
      es: 'Onda de choque Nova',
    },
    desc: {
      ko: '주기적으로 360도 전방위에 파괴적인 네온 충격파를 방출합니다.',
      en: 'Periodically emits a massive 360-degree radial blast wave.',
      ja: '全方位360度に周期的な強力衝撃波を放ちます。',
      zh: '周期性向360度全方位释放高伤害冲击波。',
      fr: 'Émet périodiquement une violente onde de choc à 360 degrés.',
      es: 'Emite periódicamente una onda de choque radial de 360 grados.',
    },
    icon: '💥',
  },
  {
    id: 'speed',
    title: {
      ko: '워프 드라이브 가속',
      en: 'Warp Drive Speed',
      ja: 'ワープドライブ加速',
      zh: '曲速引擎加速',
      fr: 'Propulsion Warp',
      es: 'Impulsor Warp',
    },
    desc: {
      ko: '이동 속도가 18% 증가하여 적의 포위망을 손쉽게 돌파합니다.',
      en: 'Movement speed increases by 18% to outrun aggressive swarms.',
      ja: '移動速度が18%上昇し、包囲網を突破します。',
      zh: '移动速度提高18%，轻松突破重围。',
      fr: 'Augmente la vitesse de déplacement de 18 %.',
      es: 'Aumenta la velocidad de movimiento un 18%.',
    },
    icon: '🚀',
  },
  {
    id: 'magnet',
    title: {
      ko: '자기장 집속기',
      en: 'Magnetic Vacuum',
      ja: '磁気バキューム',
      zh: '磁力吸附器',
      fr: 'Aspirateur magnétique',
      es: 'Aspiradora magnética',
    },
    desc: {
      ko: '경험치 보석을 끌어당기는 흡수 반경이 45% 넓어집니다.',
      en: 'EXP gem collection radius expands by 45%.',
      ja: '経験値ジェムを引き寄せる範囲が45%広がります。',
      zh: '经验宝石吸收范围扩大45%。',
      fr: 'Rayon d’attraction des gemmes d’EXP augmenté de 45 %.',
      es: 'El radio de atracción de gemas de EXP aumenta un 45%.',
    },
    icon: '🧲',
  },
  {
    id: 'hull',
    title: {
      ko: '나노 장갑 수복',
      en: 'Nanotech Hull Armor',
      ja: 'ナノ装甲修復',
      zh: '纳米装甲修补',
      fr: 'Armure nanotechnologique',
      es: 'Blindaje nanotecnológico',
    },
    desc: {
      ko: '최대 체력이 +30 증가하고 손상된 기체를 즉시 50% 회복합니다.',
      en: 'Max HP increases by +30 and instantly repairs 50% HP.',
      ja: '最大HPが+30上昇し、即座にHPを50%回復します。',
      zh: '生命上限提高+30并立即恢复50%生命。',
      fr: 'Augmente les PV max de 30 et répare 50 % des PV immédiatement.',
      es: 'Aumenta los PV máximos en +30 y repara un 50% al instante.',
    },
    icon: '❤️',
  },
];

export function createInitialNeonSurvivorState(): NeonSurvivorState {
  return {
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
    player: {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      speed: 240,
      level: 1,
      exp: 0,
      nextExp: expThresholdForLevel(1),
      facing: 0,
      invulnTimer: 0,
      magnetRadius: 130,
    },
    weapons: {
      blaster: 1,
      orbit: 0,
      nova: 0,
      speed: 0,
      magnet: 0,
      hull: 0,
    },
    blasterTimer: 0,
    novaTimer: 0,
    orbitAngle: 0,
    enemies: [],
    projectiles: [],
    gems: [],
    floatingTexts: [],
    score: 0,
    kills: 0,
    survivalTime: 0,
    gameOver: false,
    levelUpPending: false,
    upgradeChoices: [],
    spawnTimer: 0,
    bossSpawned: false,
    nextEntityId: 1,
  };
}

export function pickRandomUpgrades(weapons: WeaponLevels): UpgradeCard[] {
  // Filter eligible cards (max level 5 for weapons, max 4 for utility)
  const eligible = UPGRADE_CATALOG.filter((card) => {
    const lvl = weapons[card.id];
    if (card.id === 'hull') return true; // repeatable heal/hp
    return lvl < 5;
  });

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function selectUpgrade(state: NeonSurvivorState, upgradeId: keyof WeaponLevels): NeonSurvivorState {
  if (!state.levelUpPending) return state;

  const nextWeapons = { ...state.weapons, [upgradeId]: state.weapons[upgradeId] + 1 };
  const nextPlayer = { ...state.player };

  if (upgradeId === 'speed') {
    nextPlayer.speed = 240 * (1 + nextWeapons.speed * 0.18);
  } else if (upgradeId === 'magnet') {
    nextPlayer.magnetRadius = 130 * (1 + nextWeapons.magnet * 0.45);
  } else if (upgradeId === 'hull') {
    nextPlayer.maxHp += 30;
    nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + nextPlayer.maxHp * 0.5);
  }

  // Check if player still has enough EXP for another level
  let currentLevel = nextPlayer.level;
  let currentExp = nextPlayer.exp;
  let nextExp = nextPlayer.nextExp;
  let hasMoreLevels = false;

  if (currentExp >= nextExp) {
    currentExp -= nextExp;
    currentLevel += 1;
    nextExp = expThresholdForLevel(currentLevel);
    hasMoreLevels = true;
  }

  nextPlayer.level = currentLevel;
  nextPlayer.exp = currentExp;
  nextPlayer.nextExp = nextExp;

  const nextChoices = hasMoreLevels ? pickRandomUpgrades(nextWeapons) : [];

  return {
    ...state,
    player: nextPlayer,
    weapons: nextWeapons,
    levelUpPending: hasMoreLevels,
    upgradeChoices: nextChoices,
  };
}

export function updateNeonSurvivor(
  state: NeonSurvivorState,
  dt: number,
  inputVector: { x: number; y: number }
): NeonSurvivorState {
  if (state.gameOver || state.levelUpPending) {
    return state;
  }

  const boundedDt = Math.min(dt, 0.05);
  let nextEntityId = state.nextEntityId;

  // 1. Move Player
  const player = { ...state.player };
  const inputMagnitude = Math.hypot(inputVector.x, inputVector.y);
  let nx = 0;
  let ny = 0;

  if (inputMagnitude > 0.05) {
    nx = inputVector.x / inputMagnitude;
    ny = inputVector.y / inputMagnitude;
    player.facing = Math.atan2(ny, nx);
    player.vx = nx * player.speed;
    player.vy = ny * player.speed;
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  player.x = Math.max(30, Math.min(state.arenaWidth - 30, player.x + player.vx * boundedDt));
  player.y = Math.max(30, Math.min(state.arenaHeight - 30, player.y + player.vy * boundedDt));
  player.invulnTimer = Math.max(0, player.invulnTimer - boundedDt);

  // 2. Weapon logic
  const projectiles = [...state.projectiles];
  let blasterTimer = state.blasterTimer + boundedDt;
  let novaTimer = state.novaTimer + boundedDt;
  const orbitAngle = (state.orbitAngle + boundedDt * 3.5) % (Math.PI * 2);
  const floatingTexts: FloatingText[] = [];

  // Blaster firing (Level 1+)
  const blasterLevel = state.weapons.blaster;
  const blasterCooldown = Math.max(0.18, 0.45 - blasterLevel * 0.05);

  if (blasterLevel > 0 && blasterTimer >= blasterCooldown && state.enemies.length > 0) {
    blasterTimer = 0;

    // Find nearest enemy
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    if (nearest) {
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      const bulletCount = Math.min(4, blasterLevel);
      const spread = 0.15;
      const baseDamage = 28 + blasterLevel * 8;
      const bulletSpeed = 650;

      for (let i = 0; i < bulletCount; i++) {
        const offset = (i - (bulletCount - 1) / 2) * spread;
        const bAngle = angle + offset;
        projectiles.push({
          id: nextEntityId++,
          x: player.x,
          y: player.y,
          vx: Math.cos(bAngle) * bulletSpeed,
          vy: Math.sin(bAngle) * bulletSpeed,
          damage: baseDamage,
          pierce: blasterLevel >= 3 ? 2 : 1,
          radius: 5,
          color: '#38bdf8',
          life: 1.2,
        });
      }
    }
  }

  // Nova shockwave (Level 1+)
  const novaLevel = state.weapons.nova;
  const novaCooldown = Math.max(2.0, 4.0 - novaLevel * 0.5);

  if (novaLevel > 0 && novaTimer >= novaCooldown) {
    novaTimer = 0;
    const novaRadius = 130 + novaLevel * 30;
    const novaDamage = 45 + novaLevel * 15;

    // Apply radial hit to all enemies in blast radius
    for (const e of state.enemies) {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= novaRadius + e.radius) {
        e.hp -= novaDamage;
        floatingTexts.push({
          id: nextEntityId++,
          text: `${Math.round(novaDamage)}`,
          x: e.x,
          y: e.y - 15,
          life: 0.6,
          color: '#f43f5e',
        });
      }
    }
  }

  // Orbit blades collision
  const orbitLevel = state.weapons.orbit;
  if (orbitLevel > 0) {
    const bladeCount = orbitLevel + 1;
    const orbitRadius = 75;
    const bladeDamage = 18 + orbitLevel * 8;

    for (let i = 0; i < bladeCount; i++) {
      const bAngle = orbitAngle + (i * Math.PI * 2) / bladeCount;
      const bx = player.x + Math.cos(bAngle) * orbitRadius;
      const by = player.y + Math.sin(bAngle) * orbitRadius;
      const bRad = 12;

      for (const e of state.enemies) {
        const dist = Math.hypot(e.x - bx, e.y - by);
        if (dist <= bRad + e.radius) {
          e.hp -= bladeDamage * boundedDt * 3.5;
        }
      }
    }
  }

  // 3. Update Projectiles
  const activeProjectiles: Projectile[] = [];
  for (const p of projectiles) {
    p.life -= boundedDt;
    p.x += p.vx * boundedDt;
    p.y += p.vy * boundedDt;

    let hitCount = 0;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= e.radius + p.radius) {
        e.hp -= p.damage;
        hitCount++;
        floatingTexts.push({
          id: nextEntityId++,
          text: `${Math.round(p.damage)}`,
          x: e.x + (Math.random() - 0.5) * 10,
          y: e.y - 10,
          life: 0.5,
          color: '#38bdf8',
        });
        if (hitCount >= p.pierce) break;
      }
    }

    if (p.life > 0 && hitCount < p.pierce && p.x >= 0 && p.x <= state.arenaWidth && p.y >= 0 && p.y <= state.arenaHeight) {
      activeProjectiles.push(p);
    }
  }

  // 4. Update Enemies & Check Kills / Drops
  const gems = [...state.gems];
  const survivingEnemies: Enemy[] = [];
  let kills = state.kills;
  let score = state.score;

  for (const e of state.enemies) {
    if (e.hp <= 0) {
      kills++;
      score += e.kind === 'boss' ? 500 : e.kind === 'brute' ? 60 : 20;
      gems.push({
        id: nextEntityId++,
        x: e.x,
        y: e.y,
        value: e.kind === 'boss' ? 120 : e.kind === 'brute' ? 30 : 10,
        color: e.kind === 'boss' ? '#fbbf24' : e.kind === 'brute' ? '#06b6d4' : '#10b981',
      });
      continue;
    }

    // Move enemy towards player
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed * boundedDt;
    e.y += Math.sin(angle) * e.speed * boundedDt;

    // Check collision with player
    const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
    if (distToPlayer <= e.radius + 16 && player.invulnTimer <= 0) {
      player.hp = Math.max(0, player.hp - e.damage);
      player.invulnTimer = 0.5;
      floatingTexts.push({
        id: nextEntityId++,
        text: `-${e.damage}`,
        x: player.x,
        y: player.y - 25,
        life: 0.6,
        color: '#ef4444',
      });
    }

    survivingEnemies.push(e);
  }

  // 5. Update Gems & Magnet
  const survivingGems: Gem[] = [];
  let expGained = 0;

  for (const g of gems) {
    const dist = Math.hypot(player.x - g.x, player.y - g.y);
    if (dist <= 20) {
      expGained += g.value;
      score += g.value;
    } else if (dist <= player.magnetRadius) {
      // Pull gem towards player
      const angle = Math.atan2(player.y - g.y, player.x - g.x);
      const pullSpeed = 420;
      g.x += Math.cos(angle) * pullSpeed * boundedDt;
      g.y += Math.sin(angle) * pullSpeed * boundedDt;
      survivingGems.push(g);
    } else {
      survivingGems.push(g);
    }
  }

  // Check Level Up
  player.exp += expGained;
  let levelUpPending = false;
  let upgradeChoices: UpgradeCard[] = [];

  if (player.exp >= player.nextExp) {
    player.exp -= player.nextExp;
    player.level += 1;
    player.nextExp = expThresholdForLevel(player.level);
    levelUpPending = true;
    upgradeChoices = pickRandomUpgrades(state.weapons);
  }

  // 6. Spawning Logic
  const survivalTime = state.survivalTime + boundedDt;
  let spawnTimer = state.spawnTimer + boundedDt;
  const spawnInterval = Math.max(0.4, 1.8 - survivalTime * 0.015);
  let bossSpawned = state.bossSpawned;

  if (spawnTimer >= spawnInterval && survivingEnemies.length < 120) {
    spawnTimer = 0;
    // Spawn off-screen around player
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDistance = 650;
    const sx = player.x + Math.cos(spawnAngle) * spawnDistance;
    const sy = player.y + Math.sin(spawnAngle) * spawnDistance;

    const rand = Math.random();
    let kind: EnemyKind = 'scout';
    let hp = 24 + survivalTime * 0.5;
    let speed = 110;
    let damage = 8;
    let radius = 12;
    let color = '#f43f5e';

    if (rand < 0.35) {
      kind = 'swarmer';
      hp = 14 + survivalTime * 0.3;
      speed = 150;
      damage = 5;
      radius = 8;
      color = '#c084fc';
    } else if (rand > 0.85 && survivalTime > 25) {
      kind = 'brute';
      hp = 90 + survivalTime * 1.5;
      speed = 65;
      damage = 18;
      radius = 20;
      color = '#38bdf8';
    }

    survivingEnemies.push({
      id: nextEntityId++,
      kind,
      x: sx,
      y: sy,
      hp,
      maxHp: hp,
      speed,
      damage,
      radius,
      color,
    });
  }

  // Boss Spawn at 60s
  if (survivalTime >= 60 && !bossSpawned) {
    bossSpawned = true;
    const sx = player.x + 500;
    const sy = player.y;
    survivingEnemies.push({
      id: nextEntityId++,
      kind: 'boss',
      x: sx,
      y: sy,
      hp: 1200,
      maxHp: 1200,
      speed: 45,
      damage: 28,
      radius: 36,
      color: '#eab308',
    });
  }

  // 7. Update Floating Texts
  const activeFloatingTexts: FloatingText[] = [];
  for (const t of [...state.floatingTexts, ...floatingTexts]) {
    t.life -= boundedDt;
    t.y -= 25 * boundedDt;
    if (t.life > 0) activeFloatingTexts.push(t);
  }

  const isGameOver = player.hp <= 0;

  return {
    ...state,
    player,
    weapons: state.weapons,
    blasterTimer,
    novaTimer,
    orbitAngle,
    enemies: survivingEnemies,
    projectiles: activeProjectiles,
    gems: survivingGems,
    floatingTexts: activeFloatingTexts,
    score,
    kills,
    survivalTime,
    gameOver: isGameOver,
    levelUpPending,
    upgradeChoices,
    spawnTimer,
    bossSpawned,
    nextEntityId,
  };
}
