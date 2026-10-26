/**
 * FTL Spaceship Mini - Tactical Starship Simulation Engine
 * Cross-section cutaway starship combat, reactor power routing,
 * crew room-to-room traversal & repairs, directional weapon targeting, and shield dynamics.
 */

export type SystemType = 'shields' | 'weapons' | 'engines' | 'medbay' | 'helm' | 'oxygen';

export interface ShipRoom {
  id: string;
  system: SystemType;
  name: string;
  level: number; // Max power capacity
  powered: number; // Currently allocated reactor power
  damage: number; // 0 = fully functional, >= level = completely broken
  fire: number; // 0..100 fire severity
  oxygen: number; // 0..100 room oxygen
  gridX: number; // Column in ship layout
  gridY: number; // Row in ship layout
  width: number;
  height: number;
}

export interface ShipWeapon {
  id: string;
  name: string;
  type: 'laser' | 'missile' | 'beam';
  powerCost: number;
  chargeTime: number; // seconds
  chargeProgress: number; // 0..1
  shots: number;
  damage: number;
  pierce: number; // shield layers bypassed
  fireChance: number;
  targetRoomId: string | null;
  powered: boolean;
}

export interface CrewMember {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  roomId: string;
  targetRoomId: string | null;
  moveProgress: number; // 0..1 walking between rooms
  moveSpeed: number; // rooms per second
  repairSkill: number;
  color: string;
}

export interface Projectile {
  id: string;
  weaponType: 'laser' | 'missile' | 'beam';
  sourceShip: 'player' | 'enemy';
  targetRoomId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0..1
  speed: number;
  damage: number;
  pierce: number;
  fireChance: number;
}

export interface FloatingFx {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  duration: number;
  maxDuration: number;
}

export interface Starship {
  isPlayer: boolean;
  name: string;
  hull: number;
  maxHull: number;
  shields: number; // active shield bubbles
  maxShields: number; // derived from shield room power
  shieldRecharge: number; // 0..1 to restore 1 bubble
  reactorPower: number; // available free power
  totalReactor: number; // total output
  evasion: number; // % chance to dodge
  ftlCharge: number; // 0..1
  rooms: ShipRoom[];
  weapons: ShipWeapon[];
  crew: CrewMember[];
}

export class FTLEngine {
  public player: Starship;
  public enemy: Starship;
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingFx[] = [];

  public scrap = 30;
  public missiles = 8;
  public sector = 1;
  public enemyKills = 0;

  public screenShake = 0;
  public isPaused = false;
  public gameSpeed = 1.0;
  public gameOver = false;
  public victory = false;

  constructor() {
    this.player = this.createPlayerShip();
    this.enemy = this.createEnemyShip(this.sector);
  }

  public createPlayerShip(): Starship {
    const rooms: ShipRoom[] = [
      { id: 'p_helm', system: 'helm', name: 'Piloting', level: 1, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 3, gridY: 1, width: 1, height: 1 },
      { id: 'p_shields', system: 'shields', name: 'Shields', level: 4, powered: 2, damage: 0, fire: 0, oxygen: 100, gridX: 1, gridY: 1, width: 1, height: 1 },
      { id: 'p_weapons', system: 'weapons', name: 'Weapons', level: 3, powered: 3, damage: 0, fire: 0, oxygen: 100, gridX: 1, gridY: 0, width: 1, height: 1 },
      { id: 'p_engines', system: 'engines', name: 'Engines', level: 2, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 0, gridY: 1, width: 1, height: 1 },
      { id: 'p_medbay', system: 'medbay', name: 'Medbay', level: 1, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 2, gridY: 0, width: 1, height: 1 },
      { id: 'p_oxygen', system: 'oxygen', name: 'Life Support', level: 1, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 2, gridY: 2, width: 1, height: 1 },
    ];

    const weapons: ShipWeapon[] = [
      {
        id: 'p_burst_laser',
        name: 'Burst Laser II',
        type: 'laser',
        powerCost: 2,
        chargeTime: 4.5,
        chargeProgress: 0,
        shots: 2,
        damage: 1,
        pierce: 0,
        fireChance: 0.1,
        targetRoomId: 'e_shields',
        powered: true,
      },
      {
        id: 'p_artemis',
        name: 'Artemis Missile',
        type: 'missile',
        powerCost: 1,
        chargeTime: 6.0,
        chargeProgress: 0,
        shots: 1,
        damage: 2,
        pierce: 9, // bypasses shields
        fireChance: 0.25,
        targetRoomId: 'e_weapons',
        powered: true,
      },
    ];

    const crew: CrewMember[] = [
      { id: 'c_pilot', name: 'Cmdr. Vance', hp: 100, maxHp: 100, roomId: 'p_helm', targetRoomId: null, moveProgress: 0, moveSpeed: 0.8, repairSkill: 1.0, color: '#38bdf8' },
      { id: 'c_eng', name: 'Eng. Chen', hp: 100, maxHp: 100, roomId: 'p_shields', targetRoomId: null, moveProgress: 0, moveSpeed: 0.8, repairSkill: 1.2, color: '#fbbf24' },
      { id: 'c_gunner', name: 'Gunner Jax', hp: 100, maxHp: 100, roomId: 'p_weapons', targetRoomId: null, moveProgress: 0, moveSpeed: 0.8, repairSkill: 0.9, color: '#f87171' },
    ];

    return {
      isPlayer: true,
      name: 'USS Antigravity',
      hull: 30,
      maxHull: 30,
      shields: 1,
      maxShields: 1,
      shieldRecharge: 0,
      reactorPower: 1, // 10 total - 9 allocated = 1 free
      totalReactor: 10,
      evasion: 15,
      ftlCharge: 0,
      rooms,
      weapons,
      crew,
    };
  }

  public createEnemyShip(sector: number): Starship {
    const scale = 1 + (sector - 1) * 0.3;
    const rooms: ShipRoom[] = [
      { id: 'e_helm', system: 'helm', name: 'Cockpit', level: 1, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 0, gridY: 1, width: 1, height: 1 },
      { id: 'e_shields', system: 'shields', name: 'Shields', level: Math.min(4, Math.floor(1 + sector * 0.5) * 2), powered: Math.min(4, Math.floor(1 + sector * 0.5) * 2), damage: 0, fire: 0, oxygen: 100, gridX: 2, gridY: 1, width: 1, height: 1 },
      { id: 'e_weapons', system: 'weapons', name: 'Weapons', level: 2, powered: 2, damage: 0, fire: 0, oxygen: 100, gridX: 2, gridY: 0, width: 1, height: 1 },
      { id: 'e_engines', system: 'engines', name: 'Engines', level: 1, powered: 1, damage: 0, fire: 0, oxygen: 100, gridX: 3, gridY: 1, width: 1, height: 1 },
    ];

    const weapons: ShipWeapon[] = [
      {
        id: 'e_laser',
        name: 'Basic Laser',
        type: 'laser',
        powerCost: 1,
        chargeTime: 5.0,
        chargeProgress: 0,
        shots: 1,
        damage: 1,
        pierce: 0,
        fireChance: 0.1,
        targetRoomId: 'p_shields',
        powered: true,
      },
    ];

    if (sector >= 2) {
      weapons.push({
        id: 'e_heavy_laser',
        name: 'Heavy Laser I',
        type: 'laser',
        powerCost: 1,
        chargeTime: 6.5,
        chargeProgress: 0,
        shots: 1,
        damage: 2,
        pierce: 0,
        fireChance: 0.2,
        targetRoomId: 'p_weapons',
        powered: true,
      });
    }

    const enemyNames = ['Rebel Scout', 'Pirate Interceptor', 'Auto-Assault Drone', 'Mantis Fighter'];
    const name = enemyNames[(sector - 1) % enemyNames.length];

    return {
      isPlayer: false,
      name: `${name} Lv.${sector}`,
      hull: Math.round(12 * scale),
      maxHull: Math.round(12 * scale),
      shields: Math.floor(Math.min(4, Math.floor(1 + sector * 0.5) * 2) / 2),
      maxShields: Math.floor(Math.min(4, Math.floor(1 + sector * 0.5) * 2) / 2),
      shieldRecharge: 0,
      reactorPower: 0,
      totalReactor: 6 + sector,
      evasion: 10 + sector * 2,
      ftlCharge: 0,
      rooms,
      weapons,
      crew: [],
    };
  }

  /**
   * Routes reactor power to a room's system.
   */
  public allocatePower(roomId: string, delta: number): boolean {
    const room = this.player.rooms.find(r => r.id === roomId);
    if (!room) return false;

    if (delta > 0) {
      if (this.player.reactorPower <= 0) return false;
      const effectiveMax = room.level - room.damage;
      if (room.powered >= effectiveMax) return false;

      room.powered += 1;
      this.player.reactorPower -= 1;
    } else if (delta < 0) {
      if (room.powered <= 0) return false;
      room.powered -= 1;
      this.player.reactorPower += 1;
    }

    this.recalculateShipStats(this.player);
    return true;
  }

  public recalculateShipStats(ship: Starship): void {
    // Shields: 2 power per shield bubble
    const shieldRoom = ship.rooms.find(r => r.system === 'shields');
    if (shieldRoom) {
      const activePower = Math.max(0, shieldRoom.powered - shieldRoom.damage);
      ship.maxShields = Math.floor(activePower / 2);
      ship.shields = Math.min(ship.shields, ship.maxShields);
    } else {
      ship.maxShields = 0;
      ship.shields = 0;
    }

    // Evasion: Engine power + manned helm
    const engineRoom = ship.rooms.find(r => r.system === 'engines');
    const helmRoom = ship.rooms.find(r => r.system === 'helm');
    const isHelmManned = ship.crew.some(c => c.roomId === helmRoom?.id && c.targetRoomId === null);

    let eva = 0;
    if (engineRoom) {
      const engPower = Math.max(0, engineRoom.powered - engineRoom.damage);
      eva = engPower * 5;
    }
    if (isHelmManned && helmRoom && helmRoom.damage === 0) {
      eva += 10;
    }
    ship.evasion = Math.min(60, eva);
  }

  public orderCrewMove(crewId: string, targetRoomId: string): boolean {
    const crew = this.player.crew.find(c => c.id === crewId);
    if (!crew) return false;
    if (crew.roomId === targetRoomId) return false;

    crew.targetRoomId = targetRoomId;
    crew.moveProgress = 0;
    this.recalculateShipStats(this.player);
    return true;
  }

  public targetWeapon(weaponId: string, targetRoomId: string): boolean {
    const weapon = this.player.weapons.find(w => w.id === weaponId);
    if (!weapon) return false;
    weapon.targetRoomId = targetRoomId;
    return true;
  }

  /**
   * Advances real-time tactical simulation by dt.
   */
  public update(dt: number): void {
    if (this.isPaused || this.gameOver) return;

    const effectiveDt = dt * this.gameSpeed;

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - effectiveDt * 10);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.duration -= effectiveDt;
      ft.y -= effectiveDt * 0.6;
      if (ft.duration <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Player & Enemy
    this.updateShip(this.player, this.enemy, effectiveDt);
    this.updateShip(this.enemy, this.player, effectiveDt);

    // Update Projectiles in transit
    this.updateProjectiles(effectiveDt);
  }

  private updateShip(ship: Starship, targetShip: Starship, dt: number): void {
    // 1. Shield Recharge
    if (ship.shields < ship.maxShields) {
      ship.shieldRecharge += dt * 0.45; // takes ~2.2s per shield bubble
      if (ship.shieldRecharge >= 1.0) {
        ship.shieldRecharge = 0;
        ship.shields++;
      }
    }

    // 2. FTL Jump Charge (Player only)
    if (ship.isPlayer && !this.victory) {
      const engineRoom = ship.rooms.find(r => r.system === 'engines');
      const helmRoom = ship.rooms.find(r => r.system === 'helm');
      const canCharge = engineRoom && engineRoom.powered > 0 && helmRoom && helmRoom.damage === 0;
      if (canCharge) {
        ship.ftlCharge = Math.min(1.0, ship.ftlCharge + dt * 0.05);
      }
    }

    // 3. Crew movements, repairs, fires, and healing
    for (const crew of ship.crew) {
      if (crew.targetRoomId) {
        crew.moveProgress += dt * crew.moveSpeed;
        if (crew.moveProgress >= 1.0) {
          crew.roomId = crew.targetRoomId;
          crew.targetRoomId = null;
          crew.moveProgress = 0;
          this.recalculateShipStats(ship);
        }
      } else {
        // Standing in current room
        const room = ship.rooms.find(r => r.id === crew.roomId);
        if (room) {
          // Fight fire first
          if (room.fire > 0) {
            room.fire = Math.max(0, room.fire - dt * 25);
          } else if (room.damage > 0) {
            // Repair system damage
            room.damage = Math.max(0, room.damage - dt * 0.35 * crew.repairSkill);
            this.recalculateShipStats(ship);
          }

          // Medbay healing
          if (room.system === 'medbay' && room.powered > 0 && room.damage === 0) {
            crew.hp = Math.min(crew.maxHp, crew.hp + dt * 20);
          }
        }
      }
    }

    // 4. Weapons charging & firing
    for (const weapon of ship.weapons) {
      if (!weapon.powered) continue;

      weapon.chargeProgress = Math.min(1.0, weapon.chargeProgress + dt / weapon.chargeTime);

      if (weapon.chargeProgress >= 1.0 && weapon.targetRoomId) {
        // Ready to fire!
        weapon.chargeProgress = 0;
        this.fireWeapon(ship, targetShip, weapon);
      }
    }
  }

  private fireWeapon(sourceShip: Starship, targetShip: Starship, weapon: ShipWeapon): void {
    if (weapon.type === 'missile') {
      if (sourceShip.isPlayer) {
        if (this.missiles <= 0) return;
        this.missiles--;
      }
    }

    const targetRoom = targetShip.rooms.find(r => r.id === weapon.targetRoomId);
    if (!targetRoom) return;

    // Launch shots
    for (let s = 0; s < weapon.shots; s++) {
      const startX = sourceShip.isPlayer ? 35 : 65;
      const startY = 50 + (s - (weapon.shots - 1) / 2) * 5;
      const targetX = targetShip.isPlayer ? 20 + targetRoom.gridX * 8 : 70 + targetRoom.gridX * 8;
      const targetY = 35 + targetRoom.gridY * 12;

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        weaponType: weapon.type,
        sourceShip: sourceShip.isPlayer ? 'player' : 'enemy',
        targetRoomId: targetRoom.id,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        targetX,
        targetY,
        progress: 0,
        speed: weapon.type === 'missile' ? 0.75 : 1.25,
        damage: weapon.damage,
        pierce: weapon.pierce,
        fireChance: weapon.fireChance,
      });
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += dt * p.speed;

      p.currentX = p.startX + (p.targetX - p.startX) * p.progress;
      p.currentY = p.startY + (p.targetY - p.startY) * p.progress;

      if (p.progress >= 1.0) {
        // Impact target ship!
        const targetShip = p.sourceShip === 'player' ? this.enemy : this.player;
        this.resolveProjectileHit(p, targetShip);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveProjectileHit(p: Projectile, ship: Starship): void {
    const targetRoom = ship.rooms.find(r => r.id === p.targetRoomId);
    if (!targetRoom) return;

    // Check evasion
    const isEvasion = Math.random() * 100 < ship.evasion;
    if (isEvasion) {
      this.addFloatingText('MISS!', p.targetX, p.targetY, '#94a3b8');
      return;
    }

    // Check shields
    if (ship.shields > 0 && p.pierce === 0) {
      ship.shields--;
      this.addFloatingText('Shield Absorbed', p.targetX, p.targetY, '#38bdf8');
      this.screenShake = 2;
      return;
    }

    // Impact Hull & Room System
    ship.hull = Math.max(0, ship.hull - p.damage);
    targetRoom.damage = Math.min(targetRoom.level, targetRoom.damage + 1);

    // Fire chance
    if (Math.random() < p.fireChance) {
      targetRoom.fire = Math.min(100, targetRoom.fire + 35);
    }

    this.addFloatingText(`-${p.damage} Hull`, p.targetX, p.targetY, '#ef4444');
    this.screenShake = p.damage > 1 ? 5 : 3;

    this.recalculateShipStats(ship);

    // Check destruction
    if (ship.hull <= 0) {
      if (ship.isPlayer) {
        this.gameOver = true;
        this.victory = false;
        this.addFloatingText('SHIP DESTROYED', p.targetX, p.targetY, '#ef4444');
      } else {
        this.onEnemyDefeated();
      }
    }
  }

  public onEnemyDefeated(): void {
    this.enemyKills++;
    const scrapEarned = Math.round(15 + this.sector * 8 + Math.random() * 10);
    const missilesEarned = Math.floor(Math.random() * 3) + 1;
    this.scrap += scrapEarned;
    this.missiles += missilesEarned;

    this.addFloatingText(`Victory! +${scrapEarned} Scrap, +${missilesEarned} Missiles`, 75, 45, '#fbbf24');

    // Spawn next enemy after delay
    setTimeout(() => {
      if (!this.gameOver) {
        this.sector++;
        this.enemy = this.createEnemyShip(this.sector);
      }
    }, 1800);
  }

  public jumpSector(): boolean {
    if (this.player.ftlCharge < 1.0) return false;
    this.player.ftlCharge = 0;
    this.sector++;
    this.enemy = this.createEnemyShip(this.sector);
    this.addFloatingText(`FTL Jump: Sector ${this.sector}!`, 50, 20, '#38bdf8');
    return true;
  }

  public repairHullAtShop(): boolean {
    if (this.scrap < 10 || this.player.hull >= this.player.maxHull) return false;
    this.scrap -= 10;
    this.player.hull = Math.min(this.player.maxHull, this.player.hull + 5);
    return true;
  }

  public buyMissilesAtShop(): boolean {
    if (this.scrap < 12) return false;
    this.scrap -= 12;
    this.missiles += 3;
    return true;
  }

  public addFloatingText(text: string, x: number, y: number, color: string): void {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      duration: 1.2,
      maxDuration: 1.2,
    });
  }
}
