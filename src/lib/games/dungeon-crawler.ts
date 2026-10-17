export type TileType = "floor" | "wall" | "door" | "chest" | "potion" | "exit";
export type EnemyType = "slime" | "goblin" | "skeleton";

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  attack: number;
  isDead: boolean;
}

export interface DungeonCrawlerState {
  gridSize: number;
  map: number[][]; // 0: floor, 1: wall, 2: door, 3: chest, 4: exit, 5: potion
  playerX: number;
  playerZ: number;
  playerFacing: 0 | 1 | 2 | 3; // 0: North (-z), 1: East (+x), 2: South (+z), 3: West (-x)
  hp: number;
  maxHp: number;
  attackPower: number;
  defense: number;
  keys: number;
  gold: number;
  potions: number;
  floor: number;
  kills: number;
  enemies: Enemy[];
  gameOver: boolean;
  floorCleared: boolean;
  message: string;
}

export const DIRECTIONS = [
  { dx: 0, dz: -1 }, // North
  { dx: 1, dz: 0 },  // East
  { dx: 0, dz: 1 },  // South
  { dx: -1, dz: 0 }, // West
];

export function createDungeonFloor(floor: number = 1): DungeonCrawlerState {
  const size = 14;
  const map: number[][] = [];

  // Initialize with walls
  for (let z = 0; z < size; z++) {
    map[z] = [];
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || z === 0 || z === size - 1) {
        map[z][x] = 1; // Perimeter wall
      } else {
        map[z][x] = 0; // Open floor
      }
    }
  }

  // Add internal labyrinth walls
  for (let z = 2; z < size - 2; z += 2) {
    for (let x = 2; x < size - 2; x += 2) {
      map[z][x] = 1;
      // Connect to a neighbor to make rooms & corridors
      const dir = Math.floor(Math.random() * 4);
      const d = DIRECTIONS[dir];
      map[z + d.dz][x + d.dx] = 1;
    }
  }

  // Player start position
  const playerX = 1;
  const playerZ = 1;
  map[playerZ][playerX] = 0;

  // Place exit stairs at the opposite quadrant
  const exitX = size - 2;
  const exitZ = size - 2;
  map[exitZ][exitX] = 4; // Exit

  // Place chests and potions
  map[1][size - 2] = 3; // Chest
  map[size - 2][1] = 5; // Potion
  map[Math.floor(size / 2)][Math.floor(size / 2)] = 3; // Center chest

  // Spawn enemies
  const enemies: Enemy[] = [
    {
      id: "enemy-1",
      type: "slime",
      x: 3,
      z: 3,
      hp: 30 + floor * 5,
      maxHp: 30 + floor * 5,
      attack: 8 + floor * 2,
      isDead: false,
    },
    {
      id: "enemy-2",
      type: "goblin",
      x: 7,
      z: 5,
      hp: 45 + floor * 8,
      maxHp: 45 + floor * 8,
      attack: 14 + floor * 3,
      isDead: false,
    },
    {
      id: "enemy-3",
      type: "skeleton",
      x: size - 3,
      z: size - 3,
      hp: 60 + floor * 10,
      maxHp: 60 + floor * 10,
      attack: 20 + floor * 4,
      isDead: false,
    },
  ];

  return {
    gridSize: size,
    map,
    playerX,
    playerZ,
    playerFacing: 2, // Facing South initially
    hp: 100,
    maxHp: 100,
    attackPower: 30,
    defense: 5,
    keys: 1,
    gold: 0,
    potions: 1,
    floor,
    kills: 0,
    enemies,
    gameOver: false,
    floorCleared: false,
    message: `지하 ${floor}층 탐험을 시작합니다. 출구 사다리를 찾으세요!`,
  };
}

export function moveDungeonPlayer(
  state: DungeonCrawlerState,
  dx: number,
  dz: number
): DungeonCrawlerState {
  if (state.gameOver || state.floorCleared) return state;

  const targetX = state.playerX + dx;
  const targetZ = state.playerZ + dz;

  // Determine facing
  let facing = state.playerFacing;
  if (dx === 1) facing = 1;
  else if (dx === -1) facing = 3;
  else if (dz === 1) facing = 2;
  else if (dz === -1) facing = 0;

  // Check boundary
  if (targetX < 0 || targetX >= state.gridSize || targetZ < 0 || targetZ >= state.gridSize) {
    return { ...state, playerFacing: facing };
  }

  // Check wall
  const tile = state.map[targetZ][targetX];
  if (tile === 1) {
    return { ...state, playerFacing: facing, message: "벽에 막혀 이동할 수 없습니다." };
  }

  // Check alive enemy on target tile -> Trigger Melee Attack!
  const targetEnemy = state.enemies.find((e) => !e.isDead && e.x === targetX && e.z === targetZ);
  if (targetEnemy) {
    const damageToEnemy = state.attackPower;
    const enemyRemainingHp = Math.max(0, targetEnemy.hp - damageToEnemy);
    const enemyKilled = enemyRemainingHp <= 0;

    let damageToPlayer = 0;
    if (!enemyKilled) {
      damageToPlayer = Math.max(1, targetEnemy.attack - state.defense);
    }

    const newPlayerHp = Math.max(0, state.hp - damageToPlayer);
    const gameOver = newPlayerHp <= 0;

    const updatedEnemies = state.enemies.map((e) =>
      e.id === targetEnemy.id
        ? { ...e, hp: enemyRemainingHp, isDead: enemyKilled }
        : e
    );

    let message = `${targetEnemy.type}에게 ${damageToEnemy} 피해를 입혔습니다!`;
    if (enemyKilled) {
      message += ` 처치 성공! (+50 골드)`;
    } else {
      message += ` 적의 반격으로 ${damageToPlayer} 피해를 입었습니다.`;
    }

    return {
      ...state,
      playerFacing: facing,
      hp: newPlayerHp,
      gold: state.gold + (enemyKilled ? 50 : 0),
      kills: state.kills + (enemyKilled ? 1 : 0),
      enemies: updatedEnemies,
      gameOver,
      message,
    };
  }

  // Handle items / interactive tiles
  const newMap = state.map.map((row) => [...row]);
  let hp = state.hp;
  let gold = state.gold;
  let potions = state.potions;
  let floorCleared = false;
  let msg = "발걸음을 옮겼습니다.";

  if (tile === 3) {
    // Chest
    gold += 100;
    newMap[targetZ][targetX] = 0;
    msg = "보물상자를 열어 100 골드를 획득했습니다!";
  } else if (tile === 5) {
    // Potion
    potions += 1;
    newMap[targetZ][targetX] = 0;
    msg = "체력 회복 물약을 획득했습니다!";
  } else if (tile === 4) {
    // Exit Ladder
    floorCleared = true;
    msg = `지하 ${state.floor}층 출구에 도달했습니다! 다음 층으로 내려갑니다.`;
  }

  return {
    ...state,
    map: newMap,
    playerX: targetX,
    playerZ: targetZ,
    playerFacing: facing,
    hp,
    gold,
    potions,
    floorCleared,
    message: msg,
  };
}

export function useDungeonPotion(state: DungeonCrawlerState): DungeonCrawlerState {
  if (state.gameOver || state.potions <= 0 || state.hp >= state.maxHp) return state;
  const healAmount = 45;
  const newHp = Math.min(state.maxHp, state.hp + healAmount);
  return {
    ...state,
    hp: newHp,
    potions: state.potions - 1,
    message: `물약을 마셔 체력 ${healAmount}을 회복했습니다. (현재 HP: ${newHp})`,
  };
}
