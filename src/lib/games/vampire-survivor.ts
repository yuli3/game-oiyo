import { SpatialHashGrid, type SpatialEntity } from './spatial-partition';

export interface EnemyEntity extends SpatialEntity {
  id: string;
  type: 'bat' | 'skeleton' | 'ghost' | 'golem';
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  radius: number;
}

export interface GemEntity extends SpatialEntity {
  id: string;
  value: number;
  color: 'blue' | 'green' | 'red';
  radius: number;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  radius: number;
  lifetime: number;
  type: 'missile' | 'knife' | 'lightning';
}

export type UpgradeId =
  | 'magic_missile'
  | 'garlic_aura'
  | 'holy_bible'
  | 'throwing_knife'
  | 'lightning_strike'
  | 'spinach'
  | 'wings'
  | 'armor'
  | 'magnet'
  | 'hollow_heart';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  category: 'weapon' | 'passive';
  description: string;
  maxLevel: number;
}

export const UPGRADE_CATALOG: Record<UpgradeId, UpgradeDef> = {
  magic_missile: {
    id: 'magic_missile',
    name: '매직 미사일 (Magic Wand)',
    icon: '🪄',
    category: 'weapon',
    description: '가장 가까운 적에게 마법 화살을 자동 연사합니다.',
    maxLevel: 5,
  },
  garlic_aura: {
    id: 'garlic_aura',
    name: '마늘 결계 (Garlic Aura)',
    icon: '🧄',
    category: 'weapon',
    description: '플레이어 주변에 상시 피해를 주는 마늘 보호막을 전개합니다.',
    maxLevel: 5,
  },
  holy_bible: {
    id: 'holy_bible',
    name: '성경책 오빗 (Holy Bible)',
    icon: '📖',
    category: 'weapon',
    description: '플레이어 주위를 고속 회전하며 접근하는 적을 넉백합니다.',
    maxLevel: 5,
  },
  throwing_knife: {
    id: 'throwing_knife',
    name: '비도 투척 (Throwing Knife)',
    icon: '🗡️',
    category: 'weapon',
    description: '바라보는 방향으로 적을 관통하는 비도를 발사합니다.',
    maxLevel: 5,
  },
  lightning_strike: {
    id: 'lightning_strike',
    name: '천둥 벼락 (Lightning Ring)',
    icon: '⚡',
    category: 'weapon',
    description: '무작위 적의 머리 위에 강력한 낙뢰를 내리꽂습니다.',
    maxLevel: 5,
  },
  spinach: {
    id: 'spinach',
    name: '시금치 (Spinach)',
    icon: '🥬',
    category: 'passive',
    description: '모든 무기의 기본 공격력이 15% 증가합니다.',
    maxLevel: 5,
  },
  wings: {
    id: 'wings',
    name: '날개 신발 (Wings)',
    icon: '🪽',
    category: 'passive',
    description: '플레이어 이동 속도가 12% 증가합니다.',
    maxLevel: 5,
  },
  armor: {
    id: 'armor',
    name: '강철 갑옷 (Armor)',
    icon: '🛡️',
    category: 'passive',
    description: '적에게 받는 모든 피해를 1씩 감소시킵니다.',
    maxLevel: 5,
  },
  magnet: {
    id: 'magnet',
    name: '인력 자석 (Attractorb)',
    icon: '🧲',
    category: 'passive',
    description: '경험치 보석을 끌어당기는 자석 흡수 범위가 30% 증가합니다.',
    maxLevel: 5,
  },
  hollow_heart: {
    id: 'hollow_heart',
    name: '검은 심장 (Hollow Heart)',
    icon: '🖤',
    category: 'passive',
    description: '최대 체력이 20 증가하고 체력을 20 회복합니다.',
    maxLevel: 5,
  },
};

export interface VampireSurvivorState {
  arenaWidth: number;
  arenaHeight: number;
  playerX: number;
  playerY: number;
  playerFacingAngle: number;
  playerHp: number;
  playerMaxHp: number;
  playerSpeed: number;
  playerLevel: number;
  playerXp: number;
  nextLevelXp: number;
  magnetRadius: number;
  invulnerabilityTimer: number;
  survivalTime: number;
  killCount: number;
  gameState: 'playing' | 'level_up' | 'game_over' | 'victory';
  upgrades: Record<UpgradeId, number>;
  offeredUpgrades: UpgradeId[];
}

export class VampireSurvivorEngine {
  private state: VampireSurvivorState;
  public enemies: EnemyEntity[] = [];
  public gems: GemEntity[] = [];
  public projectiles: ProjectileEntity[] = [];
  private enemyGrid: SpatialHashGrid<EnemyEntity>;
  private nextId: number = 1;
  private weaponCooldowns: Record<string, number> = {};
  private bibleAngle: number = 0;
  private spawnTimer: number = 0;

  constructor(arenaSize: number = 2000) {
    this.enemyGrid = new SpatialHashGrid<EnemyEntity>(80);
    this.state = {
      arenaWidth: arenaSize,
      arenaHeight: arenaSize,
      playerX: arenaSize / 2,
      playerY: arenaSize / 2,
      playerFacingAngle: 0,
      playerHp: 100,
      playerMaxHp: 100,
      playerSpeed: 140,
      playerLevel: 1,
      playerXp: 0,
      nextLevelXp: 40,
      magnetRadius: 90,
      invulnerabilityTimer: 0,
      survivalTime: 0,
      killCount: 0,
      gameState: 'playing',
      upgrades: {
        magic_missile: 1,
        garlic_aura: 0,
        holy_bible: 0,
        throwing_knife: 0,
        lightning_strike: 0,
        spinach: 0,
        wings: 0,
        armor: 0,
        magnet: 0,
        hollow_heart: 0,
      },
      offeredUpgrades: [],
    };
    this.weaponCooldowns = {
      magic_missile: 0,
      garlic_aura: 0,
      throwing_knife: 0,
      lightning_strike: 0,
    };
  }

  public getState(): Readonly<VampireSurvivorState> {
    return this.state;
  }

  public movePlayer(vx: number, vy: number, dt: number): void {
    if (this.state.gameState !== 'playing') return;

    const mag = Math.hypot(vx, vy);
    if (mag > 0.05) {
      const speedBonus = 1 + (this.state.upgrades.wings ?? 0) * 0.12;
      const speed = this.state.playerSpeed * speedBonus;
      const normVx = vx / mag;
      const normVy = vy / mag;
      this.state.playerX = Math.max(20, Math.min(this.state.arenaWidth - 20, this.state.playerX + normVx * speed * dt));
      this.state.playerY = Math.max(20, Math.min(this.state.arenaHeight - 20, this.state.playerY + normVy * speed * dt));
      this.state.playerFacingAngle = Math.atan2(normVy, normVx);
    }
  }

  public update(dt: number): void {
    if (this.state.gameState !== 'playing') return;

    this.state.survivalTime += dt;
    if (this.state.invulnerabilityTimer > 0) {
      this.state.invulnerabilityTimer = Math.max(0, this.state.invulnerabilityTimer - dt);
    }

    // 1. Spawning
    this.updateSpawning(dt);

    // 2. Enemy movement & spatial hash sync
    this.updateEnemies(dt);

    // 3. Weapon logic (queries up-to-date enemy spatial hash)
    this.updateWeapons(dt);

    // 4. Projectiles movement & collision
    this.updateProjectiles(dt);

    // 5. Gem attraction & collection
    this.updateGems(dt);
  }

  private updateSpawning(dt: number): void {
    this.spawnTimer += dt;
    const waveMinutes = this.state.survivalTime / 60;
    const spawnInterval = Math.max(0.15, 0.8 - waveMinutes * 0.12);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }
  }

  private spawnEnemyWave(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 320 + Math.random() * 80;
    const spawnX = Math.max(10, Math.min(this.state.arenaWidth - 10, this.state.playerX + Math.cos(angle) * dist));
    const spawnY = Math.max(10, Math.min(this.state.arenaHeight - 10, this.state.playerY + Math.sin(angle) * dist));

    const time = this.state.survivalTime;
    let type: EnemyEntity['type'] = 'bat';
    let hp = 15;
    let speed = 90;
    let damage = 6;
    let xp = 10;
    let radius = 10;

    const roll = Math.random();
    if (time > 120 && roll < 0.1) {
      type = 'golem';
      hp = 180;
      speed = 45;
      damage = 18;
      xp = 100;
      radius = 18;
    } else if (time > 60 && roll < 0.3) {
      type = 'ghost';
      hp = 45;
      speed = 70;
      damage = 10;
      xp = 30;
      radius = 12;
    } else if (time > 20 && roll < 0.5) {
      type = 'skeleton';
      hp = 30;
      speed = 80;
      damage = 8;
      xp = 20;
      radius = 11;
    }

    const enemy: EnemyEntity = {
      id: `e_${this.nextId++}`,
      type,
      x: spawnX,
      y: spawnY,
      hp,
      maxHp: hp,
      speed,
      damage,
      xpValue: xp,
      radius,
    };
    this.enemies.push(enemy);
    this.enemyGrid.insert(enemy);
  }

  private updateWeapons(dt: number): void {
    const dmgMult = 1 + (this.state.upgrades.spinach ?? 0) * 0.15;

    // Magic Wand
    const wandLvl = this.state.upgrades.magic_missile;
    if (wandLvl > 0) {
      this.weaponCooldowns.magic_missile = (this.weaponCooldowns.magic_missile ?? 0) - dt;
      if (this.weaponCooldowns.magic_missile <= 0) {
        this.weaponCooldowns.magic_missile = Math.max(0.4, 1.2 - wandLvl * 0.15);
        this.fireMagicWand(wandLvl, dmgMult);
      }
    }

    // Throwing Knife
    const knifeLvl = this.state.upgrades.throwing_knife;
    if (knifeLvl > 0) {
      this.weaponCooldowns.throwing_knife = (this.weaponCooldowns.throwing_knife ?? 0) - dt;
      if (this.weaponCooldowns.throwing_knife <= 0) {
        this.weaponCooldowns.throwing_knife = Math.max(0.3, 0.9 - knifeLvl * 0.1);
        this.fireKnives(knifeLvl, dmgMult);
      }
    }

    // Garlic Aura
    const garlicLvl = this.state.upgrades.garlic_aura;
    if (garlicLvl > 0) {
      this.weaponCooldowns.garlic_aura = (this.weaponCooldowns.garlic_aura ?? 0) - dt;
      if (this.weaponCooldowns.garlic_aura <= 0) {
        this.weaponCooldowns.garlic_aura = 0.5;
        this.applyGarlicDamage(garlicLvl, dmgMult);
      }
    }

    // Holy Bible (orbiting books)
    const bibleLvl = this.state.upgrades.holy_bible;
    if (bibleLvl > 0) {
      this.bibleAngle = (this.bibleAngle + dt * (2.5 + bibleLvl * 0.3)) % (Math.PI * 2);
      this.applyBibleDamage(bibleLvl, dmgMult);
    }

    // Lightning Strike
    const lightningLvl = this.state.upgrades.lightning_strike;
    if (lightningLvl > 0) {
      this.weaponCooldowns.lightning_strike = (this.weaponCooldowns.lightning_strike ?? 0) - dt;
      if (this.weaponCooldowns.lightning_strike <= 0) {
        this.weaponCooldowns.lightning_strike = Math.max(1.0, 2.5 - lightningLvl * 0.3);
        this.fireLightning(lightningLvl, dmgMult);
      }
    }
  }

  private fireMagicWand(level: number, dmgMult: number): void {
    if (this.enemies.length === 0) return;
    // Find nearest enemy
    const nearby = this.enemyGrid.queryRadius(this.state.playerX, this.state.playerY, 400);
    const target = nearby.length > 0 ? nearby[0] : this.enemies[0];
    if (!target) return;

    const count = 1 + Math.floor(level / 2);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.15;
      const angle = Math.atan2(target.y - this.state.playerY, target.x - this.state.playerX) + spread;
      const speed = 280;

      this.projectiles.push({
        id: `p_${this.nextId++}`,
        x: this.state.playerX,
        y: this.state.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: Math.round((14 + level * 5) * dmgMult),
        pierce: 1,
        radius: 6,
        lifetime: 2.0,
        type: 'missile',
      });
    }
  }

  private fireKnives(level: number, dmgMult: number): void {
    const count = 1 + level;
    const baseAngle = this.state.playerFacingAngle;
    const speed = 360;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.1;
      const angle = baseAngle + spread;
      this.projectiles.push({
        id: `p_${this.nextId++}`,
        x: this.state.playerX,
        y: this.state.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: Math.round((10 + level * 4) * dmgMult),
        pierce: 2 + Math.floor(level / 2),
        radius: 5,
        lifetime: 1.5,
        type: 'knife',
      });
    }
  }

  private applyGarlicDamage(level: number, dmgMult: number): void {
    const radius = 60 + level * 15;
    const dmg = Math.round((4 + level * 3) * dmgMult);
    const victims = this.enemyGrid.queryRadius(this.state.playerX, this.state.playerY, radius);

    for (const v of victims) {
      this.damageEnemy(v, dmg, 15);
    }
  }

  private applyBibleDamage(level: number, dmgMult: number): void {
    const bookCount = 1 + level;
    const orbitRadius = 75 + level * 8;
    const dmg = Math.round((8 + level * 4) * dmgMult);

    for (let i = 0; i < bookCount; i++) {
      const angle = this.bibleAngle + (i * Math.PI * 2) / bookCount;
      const bx = this.state.playerX + Math.cos(angle) * orbitRadius;
      const by = this.state.playerY + Math.sin(angle) * orbitRadius;

      const hitMobs = this.enemyGrid.queryRadius(bx, by, 18);
      for (const m of hitMobs) {
        this.damageEnemy(m, dmg, 25);
      }
    }
  }

  public getBibleBookPositions(): { x: number; y: number }[] {
    const level = this.state.upgrades.holy_bible;
    if (level <= 0) return [];

    const bookCount = 1 + level;
    const orbitRadius = 75 + level * 8;
    const positions: { x: number; y: number }[] = [];

    for (let i = 0; i < bookCount; i++) {
      const angle = this.bibleAngle + (i * Math.PI * 2) / bookCount;
      positions.push({
        x: this.state.playerX + Math.cos(angle) * orbitRadius,
        y: this.state.playerY + Math.sin(angle) * orbitRadius,
      });
    }
    return positions;
  }

  private fireLightning(level: number, dmgMult: number): void {
    if (this.enemies.length === 0) return;
    const count = Math.min(this.enemies.length, 1 + Math.floor(level / 2));
    const dmg = Math.round((30 + level * 15) * dmgMult);

    for (let i = 0; i < count; i++) {
      const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      if (target) {
        this.damageEnemy(target, dmg, 0);
        this.projectiles.push({
          id: `p_${this.nextId++}`,
          x: target.x,
          y: target.y,
          vx: 0,
          vy: 0,
          damage: 0,
          pierce: 0,
          radius: 20,
          lifetime: 0.25,
          type: 'lightning',
        });
      }
    }
  }

  public damageEnemy(enemy: EnemyEntity, damage: number, knockbackDist: number = 0): void {
    enemy.hp -= damage;

    if (knockbackDist > 0) {
      const dx = enemy.x - this.state.playerX;
      const dy = enemy.y - this.state.playerY;
      const len = Math.hypot(dx, dy) || 1;
      enemy.x = Math.max(10, Math.min(this.state.arenaWidth - 10, enemy.x + (dx / len) * knockbackDist));
      enemy.y = Math.max(10, Math.min(this.state.arenaHeight - 10, enemy.y + (dy / len) * knockbackDist));
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyEntity): void {
    const idx = this.enemies.findIndex((e) => e.id === enemy.id);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
      this.enemyGrid.remove(enemy.id);
      this.state.killCount++;

      // Drop gem
      let color: GemEntity['color'] = 'blue';
      if (enemy.xpValue >= 100) color = 'red';
      else if (enemy.xpValue >= 25) color = 'green';

      this.gems.push({
        id: `g_${this.nextId++}`,
        x: enemy.x,
        y: enemy.y,
        value: enemy.xpValue,
        color,
        radius: 6,
      });
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;

      if (p.lifetime <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.type !== 'lightning') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Collision with mobs
        const hitMobs = this.enemyGrid.queryRadius(p.x, p.y, p.radius + 12);
        for (const mob of hitMobs) {
          this.damageEnemy(mob, p.damage, 10);
          p.pierce--;
          if (p.pierce <= 0) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    this.enemyGrid.clear();

    const px = this.state.playerX;
    const py = this.state.playerY;
    const armor = this.state.upgrades.armor ?? 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Move toward player
      const vx = (dx / dist) * e.speed;
      const vy = (dy / dist) * e.speed;
      e.x += vx * dt;
      e.y += vy * dt;

      this.enemyGrid.insert(e);

      // Player collision damage
      if (dist < e.radius + 14 && this.state.invulnerabilityTimer <= 0) {
        const netDmg = Math.max(1, e.damage - armor);
        this.state.playerHp = Math.max(0, this.state.playerHp - netDmg);
        this.state.invulnerabilityTimer = 0.6;

        if (this.state.playerHp <= 0) {
          this.state.gameState = 'game_over';
          return;
        }
      }
    }
  }

  private updateGems(dt: number): void {
    const px = this.state.playerX;
    const py = this.state.playerY;
    const magnetMult = 1 + (this.state.upgrades.magnet ?? 0) * 0.3;
    const magnetRadius = this.state.magnetRadius * magnetMult;

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = px - g.x;
      const dy = py - g.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 18) {
        // Collect
        this.gems.splice(i, 1);
        this.addXp(g.value);
      } else if (dist < magnetRadius) {
        // Attract toward player
        const speed = 260 + (magnetRadius - dist) * 2;
        g.x += (dx / dist) * speed * dt;
        g.y += (dy / dist) * speed * dt;
      }
    }
  }

  public addXp(amount: number): void {
    this.state.playerXp += amount;
    if (this.state.playerXp >= this.state.nextLevelXp) {
      this.state.playerXp -= this.state.nextLevelXp;
      this.state.playerLevel++;
      this.state.nextLevelXp = Math.floor(this.state.playerLevel * 50 + 20);

      this.triggerLevelUp();
    }
  }

  private triggerLevelUp(): void {
    this.state.gameState = 'level_up';

    // Pick 3 random upgradable items
    const available = (Object.keys(UPGRADE_CATALOG) as UpgradeId[]).filter((id) => {
      const current = this.state.upgrades[id] ?? 0;
      return current < UPGRADE_CATALOG[id].maxLevel;
    });

    // Shuffle & take 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    this.state.offeredUpgrades = shuffled.slice(0, 3);
  }

  public chooseUpgrade(upgradeId: UpgradeId): void {
    if (this.state.gameState !== 'level_up') return;

    this.state.upgrades[upgradeId] = (this.state.upgrades[upgradeId] ?? 0) + 1;

    if (upgradeId === 'hollow_heart') {
      this.state.playerMaxHp += 20;
      this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 20);
    }

    this.state.offeredUpgrades = [];
    this.state.gameState = 'playing';
  }

  public restart(): void {
    const size = this.state.arenaWidth;
    this.enemyGrid.clear();
    this.enemies = [];
    this.gems = [];
    this.projectiles = [];
    this.nextId = 1;
    this.spawnTimer = 0;
    this.bibleAngle = 0;
    this.state = {
      arenaWidth: size,
      arenaHeight: size,
      playerX: size / 2,
      playerY: size / 2,
      playerFacingAngle: 0,
      playerHp: 100,
      playerMaxHp: 100,
      playerSpeed: 140,
      playerLevel: 1,
      playerXp: 0,
      nextLevelXp: 40,
      magnetRadius: 90,
      invulnerabilityTimer: 0,
      survivalTime: 0,
      killCount: 0,
      gameState: 'playing',
      upgrades: {
        magic_missile: 1,
        garlic_aura: 0,
        holy_bible: 0,
        throwing_knife: 0,
        lightning_strike: 0,
        spinach: 0,
        wings: 0,
        armor: 0,
        magnet: 0,
        hollow_heart: 0,
      },
      offeredUpgrades: [],
    };
  }
}
