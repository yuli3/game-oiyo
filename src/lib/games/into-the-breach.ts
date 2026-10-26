export type TerrainType = 'ground' | 'building' | 'water' | 'mountain';

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  buildingHealth?: number; // max 2
  maxBuildingHealth?: number;
  isSpawnPoint?: boolean;
  spawnTurnsLeft?: number; // if > 0, enemy will emerge
}

export type MechClass = 'combat' | 'cannon' | 'artillery';

export interface MechUnit {
  id: string;
  mechClass: MechClass;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveRange: number;
  hasMoved: boolean;
  hasAttacked: boolean;
  isDead: boolean;
}

export type VekType = 'firefly' | 'hornet' | 'beetle';

export interface VekEnemy {
  id: string;
  type: VekType;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  targetX?: number; // telegraphed target
  targetY?: number;
  attackDir?: { dx: number; dy: number };
  isDead: boolean;
}

export interface AttackPreview {
  targetX: number;
  targetY: number;
  damage: number;
  pushDir?: { dx: number; dy: number };
  secondaryEffects?: Array<{
    x: number;
    y: number;
    damage: number;
    pushDir?: { dx: number; dy: number };
  }>;
}

export interface IntoTheBreachState {
  gridWidth: number;
  gridHeight: number;
  grid: GridCell[][];
  mechs: MechUnit[];
  enemies: VekEnemy[];
  powerGrid: number;
  maxPowerGrid: number;
  turn: number;
  maxTurns: number;
  phase: 'player' | 'enemy' | 'victory' | 'defeat';
  selectedMechId: string | null;
  selectedAction: 'move' | 'attack' | null;
}

export class IntoTheBreachEngine {
  public state: IntoTheBreachState;

  constructor(customWidth = 8, customHeight = 8) {
    this.state = this.initGame(customWidth, customHeight);
  }

  public initGame(width = 8, height = 8): IntoTheBreachState {
    const grid: GridCell[][] = [];
    for (let y = 0; y < height; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          x,
          y,
          terrain: 'ground',
        });
      }
      grid.push(row);
    }

    // Place strategic mountains (chokepoints)
    grid[1][4].terrain = 'mountain';
    grid[2][4].terrain = 'mountain';
    grid[5][3].terrain = 'mountain';
    grid[6][3].terrain = 'mountain';

    // Place water tiles (hazard pits)
    grid[0][0].terrain = 'water';
    grid[0][1].terrain = 'water';
    grid[7][6].terrain = 'water';
    grid[7][7].terrain = 'water';

    // Place civilian power grid buildings (player defense objectives)
    const buildingCoords = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 2, y: 6 },
      { x: 3, y: 6 },
    ];

    for (const { x, y } of buildingCoords) {
      grid[y][x].terrain = 'building';
      grid[y][x].buildingHealth = 2;
      grid[y][x].maxBuildingHealth = 2;
    }

    // Initial Mech Squad
    const mechs: MechUnit[] = [
      {
        id: 'mech-combat',
        mechClass: 'combat',
        name: '타이탄 프라임',
        x: 2,
        y: 4,
        hp: 3,
        maxHp: 3,
        moveRange: 3,
        hasMoved: false,
        hasAttacked: false,
        isDead: false,
      },
      {
        id: 'mech-cannon',
        mechClass: 'cannon',
        name: '브루트 캐논',
        x: 4,
        y: 5,
        hp: 3,
        maxHp: 3,
        moveRange: 3,
        hasMoved: false,
        hasAttacked: false,
        isDead: false,
      },
      {
        id: 'mech-artillery',
        mechClass: 'artillery',
        name: '시즈 아틸러리',
        x: 3,
        y: 3,
        hp: 2,
        maxHp: 2,
        moveRange: 3,
        hasMoved: false,
        hasAttacked: false,
        isDead: false,
      },
    ];

    // Initial Vek Swarm
    const enemies: VekEnemy[] = [
      {
        id: 'vek-1',
        type: 'firefly',
        name: '파이어플라이',
        x: 1,
        y: 3,
        hp: 3,
        maxHp: 3,
        isDead: false,
      },
      {
        id: 'vek-2',
        type: 'hornet',
        name: '호넷',
        x: 5,
        y: 3,
        hp: 2,
        maxHp: 2,
        isDead: false,
      },
      {
        id: 'vek-3',
        type: 'beetle',
        name: '비틀',
        x: 4,
        y: 2,
        hp: 3,
        maxHp: 3,
        isDead: false,
      },
    ];

    const state: IntoTheBreachState = {
      gridWidth: width,
      gridHeight: height,
      grid,
      mechs,
      enemies,
      powerGrid: 6,
      maxPowerGrid: 7,
      turn: 1,
      maxTurns: 4,
      phase: 'player',
      selectedMechId: 'mech-combat',
      selectedAction: null,
    };

    // Calculate initial enemy telegraph intentions
    this.planEnemyIntents(state);

    return state;
  }

  public getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= this.state.gridWidth || y < 0 || y >= this.state.gridHeight) {
      return null;
    }
    return this.state.grid[y][x];
  }

  public getMechAt(x: number, y: number): MechUnit | null {
    return this.state.mechs.find((m) => !m.isDead && m.x === x && m.y === y) || null;
  }

  public getEnemyAt(x: number, y: number): VekEnemy | null {
    return this.state.enemies.find((e) => !e.isDead && e.x === x && e.y === y) || null;
  }

  public isOccupied(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return true;
    if (cell.terrain === 'mountain' || cell.terrain === 'building') return true;
    if (this.getMechAt(x, y) !== null) return true;
    if (this.getEnemyAt(x, y) !== null) return true;
    return false;
  }

  // Pathfinding / reachable movement tiles (Manhattan distance with obstacle checking)
  public getValidMoves(mech: MechUnit): Array<{ x: number; y: number }> {
    if (mech.hasMoved || mech.isDead) return [];
    const valid: Array<{ x: number; y: number }> = [];

    // Simple BFS up to moveRange
    const queue: Array<{ x: number; y: number; dist: number }> = [{ x: mech.x, y: mech.y, dist: 0 }];
    const visited = new Set<string>();
    visited.add(`${mech.x},${mech.y}`);

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.dist > 0) {
        valid.push({ x: current.x, y: current.y });
      }

      if (current.dist < mech.moveRange) {
        for (const dir of directions) {
          const nx = current.x + dir.dx;
          const ny = current.y + dir.dy;
          const key = `${nx},${ny}`;

          if (nx < 0 || nx >= this.state.gridWidth || ny < 0 || ny >= this.state.gridHeight) continue;
          if (visited.has(key)) continue;

          const cell = this.state.grid[ny][nx];
          // Cannot walk on water, mountain, building, or through occupied tiles
          if (cell.terrain === 'water' || cell.terrain === 'mountain' || cell.terrain === 'building') continue;
          if (this.getMechAt(nx, ny) || this.getEnemyAt(nx, ny)) continue;

          visited.add(key);
          queue.push({ x: nx, y: ny, dist: current.dist + 1 });
        }
      }
    }

    return valid;
  }

  public moveMech(mechId: string, targetX: number, targetY: number): boolean {
    const mech = this.state.mechs.find((m) => m.id === mechId);
    if (!mech || mech.hasMoved || mech.isDead) return false;

    const validMoves = this.getValidMoves(mech);
    const isValid = validMoves.some((pos) => pos.x === targetX && pos.y === targetY);
    if (!isValid) return false;

    mech.x = targetX;
    mech.y = targetY;
    mech.hasMoved = true;
    return true;
  }

  // Get valid target tiles for the mech's attack
  public getValidAttackTargets(mech: MechUnit): Array<{ x: number; y: number }> {
    if (mech.hasAttacked || mech.isDead) return [];
    const targets: Array<{ x: number; y: number }> = [];

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    if (mech.mechClass === 'combat') {
      // Adjacent 4 tiles
      for (const d of dirs) {
        const tx = mech.x + d.dx;
        const ty = mech.y + d.dy;
        if (tx >= 0 && tx < this.state.gridWidth && ty >= 0 && ty < this.state.gridHeight) {
          targets.push({ x: tx, y: ty });
        }
      }
    } else if (mech.mechClass === 'cannon') {
      // Straight lines until first obstacle or map boundary
      for (const d of dirs) {
        let curX = mech.x + d.dx;
        let curY = mech.y + d.dy;
        while (curX >= 0 && curX < this.state.gridWidth && curY >= 0 && curY < this.state.gridHeight) {
          targets.push({ x: curX, y: curY });
          // If hit obstacle, cannon stops here
          const cell = this.getCell(curX, curY);
          if (cell?.terrain === 'mountain' || cell?.terrain === 'building' || this.getMechAt(curX, curY) || this.getEnemyAt(curX, curY)) {
            break;
          }
          curX += d.dx;
          curY += d.dy;
        }
      }
    } else if (mech.mechClass === 'artillery') {
      // Lob projectile anywhere in straight line at least 2 tiles away
      for (const d of dirs) {
        for (let dist = 2; dist < 8; dist++) {
          const tx = mech.x + d.dx * dist;
          const ty = mech.y + d.dy * dist;
          if (tx >= 0 && tx < this.state.gridWidth && ty >= 0 && ty < this.state.gridHeight) {
            targets.push({ x: tx, y: ty });
          }
        }
      }
    }

    return targets;
  }

  // Execute mech attack with full knockback & collision damage resolution
  public executeAttack(mechId: string, targetX: number, targetY: number): boolean {
    const mech = this.state.mechs.find((m) => m.id === mechId);
    if (!mech || mech.hasAttacked || mech.isDead) return false;

    const validTargets = this.getValidAttackTargets(mech);
    if (!validTargets.some((t) => t.x === targetX && t.y === targetY)) return false;

    const dx = Math.sign(targetX - mech.x);
    const dy = Math.sign(targetY - mech.y);

    if (mech.mechClass === 'combat') {
      // Titan Prime: Punch for 2 dmg, knockback by 1 tile in direction of punch
      this.applyDamageAndPush(targetX, targetY, 2, { dx, dy });
    } else if (mech.mechClass === 'cannon') {
      // Brute Cannon: Shoot projectile for 1 dmg, push 1 tile back
      this.applyDamageAndPush(targetX, targetY, 1, { dx, dy });
    } else if (mech.mechClass === 'artillery') {
      // Siege Artillery: Lobs shell at target for 1 damage. Adjacent 4 tiles pushed away from center!
      this.applyDamageAndPush(targetX, targetY, 1);
      // Secondary shockwave knockback around impact
      this.applyDamageAndPush(targetX + 1, targetY, 0, { dx: 1, dy: 0 });
      this.applyDamageAndPush(targetX - 1, targetY, 0, { dx: -1, dy: 0 });
      this.applyDamageAndPush(targetX, targetY + 1, 0, { dx: 0, dy: 1 });
      this.applyDamageAndPush(targetX, targetY - 1, 0, { dx: 0, dy: -1 });
    }

    mech.hasAttacked = true;
    mech.hasMoved = true; // Attacking locks movement

    // Re-evaluate enemy attack targets since enemies may have been pushed!
    this.updateEnemyTelegraphLines();

    // Check if player has any moves/attacks left or can end turn
    return true;
  }

  // Apply damage and knockback physics
  public applyDamageAndPush(
    targetX: number,
    targetY: number,
    damage: number,
    pushDir?: { dx: number; dy: number }
  ): void {
    if (targetX < 0 || targetX >= this.state.gridWidth || targetY < 0 || targetY >= this.state.gridHeight) {
      return;
    }

    const cell = this.getCell(targetX, targetY);
    const mech = this.getMechAt(targetX, targetY);
    const enemy = this.getEnemyAt(targetX, targetY);

    // Apply primary damage
    if (enemy) {
      enemy.hp -= damage;
      if (enemy.hp <= 0) {
        enemy.isDead = true;
      }
    } else if (mech) {
      mech.hp -= damage;
      if (mech.hp <= 0) {
        mech.isDead = true;
      }
    } else if (cell?.terrain === 'building' && cell.buildingHealth !== undefined) {
      cell.buildingHealth = Math.max(0, cell.buildingHealth - damage);
      this.state.powerGrid = Math.max(0, this.state.powerGrid - damage);
      if (this.state.powerGrid <= 0) {
        this.state.phase = 'defeat';
      }
    }

    // Apply push/knockback
    if (pushDir && (pushDir.dx !== 0 || pushDir.dy !== 0)) {
      const unit = this.getEnemyAt(targetX, targetY) || this.getMechAt(targetX, targetY);
      if (unit && !unit.isDead) {
        const nextX = unit.x + pushDir.dx;
        const nextY = unit.y + pushDir.dy;

        // Check if pushed out of map boundaries or into impassable obstacle
        if (nextX < 0 || nextX >= this.state.gridWidth || nextY < 0 || nextY >= this.state.gridHeight) {
          // Hit border: takes 1 collision damage
          this.applyCollisionDamage(unit);
        } else {
          const destCell = this.getCell(nextX, nextY);
          const destMech = this.getMechAt(nextX, nextY);
          const destEnemy = this.getEnemyAt(nextX, nextY);

          if (destCell?.terrain === 'water') {
            // Instant kill in water!
            unit.x = nextX;
            unit.y = nextY;
            unit.hp = 0;
            unit.isDead = true;
          } else if (
            destCell?.terrain === 'mountain' ||
            destCell?.terrain === 'building' ||
            destMech ||
            destEnemy
          ) {
            // Collision: both colliding bodies take 1 damage!
            this.applyCollisionDamage(unit);
            if (destMech) this.applyCollisionDamage(destMech);
            if (destEnemy) this.applyCollisionDamage(destEnemy);
            if (destCell?.terrain === 'building' && destCell.buildingHealth) {
              destCell.buildingHealth = Math.max(0, destCell.buildingHealth - 1);
              this.state.powerGrid = Math.max(0, this.state.powerGrid - 1);
              if (this.state.powerGrid <= 0) this.state.phase = 'defeat';
            }
          } else {
            // Clean move into empty space
            unit.x = nextX;
            unit.y = nextY;
          }
        }
      }
    }
  }

  private applyCollisionDamage(unit: MechUnit | VekEnemy): void {
    unit.hp -= 1;
    if (unit.hp <= 0) {
      unit.isDead = true;
    }
  }

  // Calculate Vek attack intentions and targets
  public planEnemyIntents(state = this.state): void {
    for (const enemy of state.enemies) {
      if (enemy.isDead) continue;

      if (enemy.type === 'firefly') {
        // Shoots straight line in direction of nearest building or mech
        const target = this.findNearestPriorityTarget(enemy.x, enemy.y, state);
        if (target) {
          const dx = Math.sign(target.x - enemy.x);
          const dy = Math.sign(target.y - enemy.y);
          if (Math.abs(target.x - enemy.x) > Math.abs(target.y - enemy.y)) {
            enemy.attackDir = { dx, dy: 0 };
            enemy.targetX = enemy.x + dx;
            enemy.targetY = enemy.y;
          } else {
            enemy.attackDir = { dx: 0, dy };
            enemy.targetX = enemy.x;
            enemy.targetY = enemy.y + dy;
          }
        }
      } else if (enemy.type === 'hornet') {
        // Stabs adjacent tile with highest priority target
        const neighbors = [
          { x: enemy.x + 1, y: enemy.y },
          { x: enemy.x - 1, y: enemy.y },
          { x: enemy.x, y: enemy.y + 1 },
          { x: enemy.x, y: enemy.y - 1 },
        ];
        let bestTarget = neighbors[0];
        let maxVal = -1;
        for (const n of neighbors) {
          if (n.x >= 0 && n.x < state.gridWidth && n.y >= 0 && n.y < state.gridHeight) {
            const cell = state.grid[n.y][n.x];
            const hasMech = state.mechs.some((m) => !m.isDead && m.x === n.x && m.y === n.y);
            const val = hasMech ? 3 : cell.terrain === 'building' ? 2 : 0;
            if (val > maxVal) {
              maxVal = val;
              bestTarget = n;
            }
          }
        }
        enemy.targetX = bestTarget.x;
        enemy.targetY = bestTarget.y;
        enemy.attackDir = { dx: bestTarget.x - enemy.x, dy: bestTarget.y - enemy.y };
      } else if (enemy.type === 'beetle') {
        // Ram charge straight ahead until obstacle
        const target = this.findNearestPriorityTarget(enemy.x, enemy.y, state);
        if (target) {
          const dx = Math.sign(target.x - enemy.x);
          const dy = Math.sign(target.y - enemy.y);
          if (dx !== 0) {
            enemy.attackDir = { dx, dy: 0 };
            enemy.targetX = enemy.x + dx;
            enemy.targetY = enemy.y;
          } else {
            enemy.attackDir = { dx: 0, dy };
            enemy.targetX = enemy.x;
            enemy.targetY = enemy.y + dy;
          }
        }
      }
    }
  }

  // Update enemy targeting trajectory based on current position and attackDir
  public updateEnemyTelegraphLines(): void {
    for (const enemy of this.state.enemies) {
      if (enemy.isDead) continue;
      if (enemy.attackDir) {
        enemy.targetX = enemy.x + enemy.attackDir.dx;
        enemy.targetY = enemy.y + enemy.attackDir.dy;
      }
    }
  }

  private findNearestPriorityTarget(
    startX: number,
    startY: number,
    state: IntoTheBreachState
  ): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let minDist = 999;

    // Prioritize Mechs and Buildings
    for (const mech of state.mechs) {
      if (!mech.isDead) {
        const dist = Math.abs(mech.x - startX) + Math.abs(mech.y - startY);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: mech.x, y: mech.y };
        }
      }
    }

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        if (state.grid[y][x].terrain === 'building' && (state.grid[y][x].buildingHealth || 0) > 0) {
          const dist = Math.abs(x - startX) + Math.abs(y - startY);
          if (dist < minDist) {
            minDist = dist;
            nearest = { x, y };
          }
        }
      }
    }

    return nearest;
  }

  // End Player Turn: Execute Enemy Attacks, Spawn New Veks, Advance Turn
  public endTurn(): void {
    if (this.state.phase !== 'player') return;
    this.state.phase = 'enemy';

    // 1. Execute all living Vek attacks in order
    for (const enemy of this.state.enemies) {
      if (enemy.isDead) continue;

      if (enemy.targetX !== undefined && enemy.targetY !== undefined) {
        if (enemy.type === 'firefly') {
          // Firefly shoots projectile in line
          let curX = enemy.targetX;
          let curY = enemy.targetY;
          while (curX >= 0 && curX < this.state.gridWidth && curY >= 0 && curY < this.state.gridHeight) {
            const hit = this.getMechAt(curX, curY) || this.getCell(curX, curY)?.terrain === 'building';
            if (hit) {
              this.applyDamageAndPush(curX, curY, 1, enemy.attackDir);
              break;
            }
            curX += enemy.attackDir?.dx || 0;
            curY += enemy.attackDir?.dy || 0;
            if (enemy.attackDir?.dx === 0 && enemy.attackDir?.dy === 0) break;
          }
        } else if (enemy.type === 'hornet') {
          // Stabs target tile for 2 damage
          this.applyDamageAndPush(enemy.targetX, enemy.targetY, 2);
        } else if (enemy.type === 'beetle') {
          // Ram target for 2 damage and pushes it 1 tile back
          this.applyDamageAndPush(enemy.targetX, enemy.targetY, 2, enemy.attackDir);
        }
      }
    }

    // Check Defeat (Power Grid == 0 or all Mechs dead)
    const aliveMechs = this.state.mechs.filter((m) => !m.isDead);
    if (this.state.powerGrid <= 0 || aliveMechs.length === 0) {
      this.state.phase = 'defeat';
      return;
    }

    // Check Victory (Survive maxTurns)
    if (this.state.turn >= this.state.maxTurns) {
      this.state.phase = 'victory';
      return;
    }

    // Advance Turn
    this.state.turn += 1;

    // Reset Mech action states
    for (const mech of this.state.mechs) {
      if (!mech.isDead) {
        mech.hasMoved = false;
        mech.hasAttacked = false;
      }
    }

    // Spawn 1 new Vek if fewer than 4 enemies alive
    const aliveEnemies = this.state.enemies.filter((e) => !e.isDead);
    if (aliveEnemies.length < 4) {
      const openSpawns: Array<{ x: number; y: number }> = [];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < this.state.gridWidth; x++) {
          if (!this.isOccupied(x, y) && this.state.grid[y][x].terrain === 'ground') {
            openSpawns.push({ x, y });
          }
        }
      }

      if (openSpawns.length > 0) {
        const spawn = openSpawns[Math.floor(Math.random() * openSpawns.length)];
        const types: VekType[] = ['firefly', 'hornet', 'beetle'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const newEnemy: VekEnemy = {
          id: `vek-spawn-${Date.now()}-${Math.random()}`,
          type: chosenType,
          name: chosenType === 'firefly' ? '파이어플라이' : chosenType === 'hornet' ? '호넷' : '비틀',
          x: spawn.x,
          y: spawn.y,
          hp: chosenType === 'hornet' ? 2 : 3,
          maxHp: chosenType === 'hornet' ? 2 : 3,
          isDead: false,
        };
        this.state.enemies.push(newEnemy);
      }
    }

    // Plan next turn enemy intents
    this.planEnemyIntents();

    this.state.phase = 'player';
    this.state.selectedMechId = aliveMechs[0]?.id || null;
    this.state.selectedAction = null;
  }

  // Repair Mech (skip attack to heal 1 HP)
  public repairMech(mechId: string): boolean {
    const mech = this.state.mechs.find((m) => m.id === mechId);
    if (!mech || mech.hasAttacked || mech.isDead) return false;

    mech.hp = Math.min(mech.maxHp, mech.hp + 1);
    mech.hasAttacked = true;
    mech.hasMoved = true;
    return true;
  }
}
