/**
 * Shotgun Chess (샷건 체스) - Pure Core Game Logic
 *
 * Tactical roguelike grid shooter inspired by Shotgun King.
 * Player is the solitary King armed with a shotgun against white pieces.
 */

export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
export type Color = "black" | "white";

export interface Position {
  r: number; // 0..7
  c: number; // 0..7
}

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: Color;
  hp: number;
  maxHp: number;
  r: number;
  c: number;
}

export interface ShotgunState {
  ammo: number;
  maxAmmo: number;
  range: number;
  knockback: number;
  pellets: number;
}

export interface UpgradeCard {
  id: string;
  name: { ko: string; en: string };
  desc: { ko: string; en: string };
  effect: "extra_ammo" | "long_range" | "heavy_knockback" | "max_hp" | "piercing";
}

export const UPGRADE_POOL: UpgradeCard[] = [
  {
    id: "extra_chamber",
    name: { ko: "확장 탄창", en: "Extra Chamber" },
    desc: { ko: "최대 탄약 +1 증가", en: "+1 Maximum Ammo capacity" },
    effect: "extra_ammo",
  },
  {
    id: "choke_barrel",
    name: { ko: "초크 총열", en: "Choke Barrel" },
    desc: { ko: "사정거리 +1 증가", en: "+1 Shotgun firing range" },
    effect: "long_range",
  },
  {
    id: "heavy_slugs",
    name: { ko: "중량 슬러그탄", en: "Heavy Slugs" },
    desc: { ko: "넉백 거리 +1 증가", en: "+1 Knockback distance on hit" },
    effect: "heavy_knockback",
  },
  {
    id: "royal_armor",
    name: { ko: "왕실 방탄복", en: "Royal Armor" },
    desc: { ko: "최대 체력 +2 증가 및 즉시 회복", en: "+2 Max HP and heal immediately" },
    effect: "max_hp",
  },
];

export interface HitRecord {
  pieceId: string;
  damage: number;
  killed: boolean;
  from: Position;
  to: Position;
}

export interface ShotgunChessGame {
  player: {
    r: number;
    c: number;
    hp: number;
    maxHp: number;
  };
  shotgun: ShotgunState;
  pieces: ChessPiece[];
  floor: number;
  turn: number;
  souls: number;
  status: "playing" | "wave_clear" | "game_over" | "victory";
  lastAction?: {
    type: "move" | "shoot" | "reload";
    direction?: { dr: number; dc: number };
    recoil?: Position;
    hits?: HitRecord[];
  };
  upgrades: string[];
}

export function isInsideBoard(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getInitialPieces(floor: number): ChessPiece[] {
  const pieces: ChessPiece[] = [];
  let nextId = 1;

  // White King
  pieces.push({
    id: `w_king_${nextId++}`,
    type: "king",
    color: "white",
    hp: 4 + floor,
    maxHp: 4 + floor,
    r: 0,
    c: 4,
  });

  // Pawns on rank 1
  const pawnCols = [1, 2, 3, 4, 5, 6];
  for (const c of pawnCols) {
    pieces.push({
      id: `w_pawn_${nextId++}`,
      type: "pawn",
      color: "white",
      hp: 1,
      maxHp: 1,
      r: 1,
      c,
    });
  }

  // Knights & Bishops
  pieces.push({
    id: `w_knight_${nextId++}`,
    type: "knight",
    color: "white",
    hp: 2,
    maxHp: 2,
    r: 0,
    c: 1,
  });
  pieces.push({
    id: `w_bishop_${nextId++}`,
    type: "bishop",
    color: "white",
    hp: 2,
    maxHp: 2,
    r: 0,
    c: 2,
  });

  if (floor >= 2) {
    pieces.push({
      id: `w_rook_${nextId++}`,
      type: "rook",
      color: "white",
      hp: 3,
      maxHp: 3,
      r: 0,
      c: 0,
    });
  }
  if (floor >= 3) {
    pieces.push({
      id: `w_queen_${nextId++}`,
      type: "queen",
      color: "white",
      hp: 4,
      maxHp: 4,
      r: 0,
      c: 3,
    });
  }

  return pieces;
}

export function initShotgunChess(floor = 1): ShotgunChessGame {
  return {
    player: {
      r: 7,
      c: 4,
      hp: 4,
      maxHp: 4,
    },
    shotgun: {
      ammo: 2,
      maxAmmo: 2,
      range: 4,
      knockback: 1,
      pellets: 3,
    },
    pieces: getInitialPieces(floor),
    floor,
    turn: 1,
    souls: 0,
    status: "playing",
    upgrades: [],
  };
}

export function getPieceAt(pieces: ChessPiece[], r: number, c: number): ChessPiece | undefined {
  return pieces.find((p) => p.r === r && p.c === c);
}

export function getValidKingMoves(state: ShotgunChessGame): Position[] {
  if (state.status !== "playing") return [];
  const moves: Position[] = [];
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [dr, dc] of dirs) {
    const nr = state.player.r + dr;
    const nc = state.player.c + dc;
    if (isInsideBoard(nr, nc)) {
      moves.push({ r: nr, c: nc });
    }
  }

  return moves;
}

/**
 * Move Player King to target tile.
 * Automatically captures piece if enemy is on target tile.
 * Recharges 1 ammo.
 * Triggers enemy AI phase.
 */
export function movePlayerKing(state: ShotgunChessGame, target: Position): ShotgunChessGame {
  if (state.status !== "playing") return state;
  const valid = getValidKingMoves(state).some((m) => m.r === target.r && m.c === target.c);
  if (!valid) return state;

  // Capture piece if on target
  let pieces = [...state.pieces];
  let soulsGained = 0;
  const targetPiece = getPieceAt(pieces, target.r, target.c);
  if (targetPiece) {
    pieces = pieces.filter((p) => p.id !== targetPiece.id);
    soulsGained += targetPiece.maxHp;
  }

  const newAmmo = Math.min(state.shotgun.maxAmmo, state.shotgun.ammo + 1);

  let nextState: ShotgunChessGame = {
    ...state,
    player: {
      ...state.player,
      r: target.r,
      c: target.c,
    },
    shotgun: {
      ...state.shotgun,
      ammo: newAmmo,
    },
    pieces,
    souls: state.souls + soulsGained,
    turn: state.turn + 1,
    lastAction: {
      type: "move",
      direction: { dr: target.r - state.player.r, dc: target.c - state.player.c },
    },
  };

  // Check if white king was captured by moving
  if (targetPiece?.type === "king") {
    nextState.status = nextState.floor >= 5 ? "victory" : "wave_clear";
    return nextState;
  }

  // Enemy Turn
  nextState = executeEnemyTurns(nextState);
  return nextState;
}

export const SHOOT_DIRECTIONS: { dr: number; dc: number; label: string }[] = [
  { dr: -1, dc: 0, label: "North" },
  { dr: -1, dc: 1, label: "North-East" },
  { dr: 0, dc: 1, label: "East" },
  { dr: 1, dc: 1, label: "South-East" },
  { dr: 1, dc: 0, label: "South" },
  { dr: 1, dc: -1, label: "South-West" },
  { dr: 0, dc: -1, label: "West" },
  { dr: -1, dc: -1, label: "North-West" },
];

/**
 * Fires the shotgun in the specified direction.
 * Raycasts pellets in a cone, damaging pieces.
 * Applies knockback to hit targets.
 * Applies recoil knockback to player king.
 */
export function shootShotgun(
  state: ShotgunChessGame,
  dr: number,
  dc: number
): ShotgunChessGame {
  if (state.status !== "playing") return state;
  if (state.shotgun.ammo <= 0) return state;

  const hits: HitRecord[] = [];
  let pieces = state.pieces.map((p) => ({ ...p }));
  let soulsGained = 0;

  // Determine cone tiles along (dr, dc)
  const blastTiles: { r: number; c: number; dist: number }[] = [];
  for (let dist = 1; dist <= state.shotgun.range; dist++) {
    const mainR = state.player.r + dr * dist;
    const mainC = state.player.c + dc * dist;
    if (isInsideBoard(mainR, mainC)) {
      blastTiles.push({ r: mainR, c: mainC, dist });
    }

    // Spread flank tiles at dist >= 2
    if (dist >= 2) {
      // Orthogonal wings
      const wing1R = mainR + (dc !== 0 ? 0 : 1);
      const wing1C = mainC + (dr !== 0 ? 0 : 1);
      const wing2R = mainR - (dc !== 0 ? 0 : 1);
      const wing2C = mainC - (dr !== 0 ? 0 : 1);
      if (isInsideBoard(wing1R, wing1C)) blastTiles.push({ r: wing1R, c: wing1C, dist });
      if (isInsideBoard(wing2R, wing2C)) blastTiles.push({ r: wing2R, c: wing2C, dist });
    }
  }

  // Damage calculation & knockback
  for (const tile of blastTiles) {
    const piece = pieces.find((p) => p.r === tile.r && p.c === tile.c);
    if (!piece) continue;

    // Damage decreases with distance: Point blank: 3, Mid: 2, Far: 1
    const dmg = Math.max(1, 4 - tile.dist);
    piece.hp -= dmg;

    // Knockback piece
    const kbDist = state.shotgun.knockback;
    let targetR = piece.r + dr * kbDist;
    let targetC = piece.c + dc * kbDist;
    if (!isInsideBoard(targetR, targetC)) {
      targetR = Math.max(0, Math.min(7, targetR));
      targetC = Math.max(0, Math.min(7, targetC));
    }

    const killed = piece.hp <= 0;
    if (killed) {
      soulsGained += piece.maxHp;
    } else {
      // If tile is not occupied by other piece, move there
      if (!pieces.some((p) => p.id !== piece.id && p.r === targetR && p.c === targetC)) {
        piece.r = targetR;
        piece.c = targetC;
      }
    }

    hits.push({
      pieceId: piece.id,
      damage: dmg,
      killed,
      from: { r: tile.r, c: tile.c },
      to: { r: piece.r, c: piece.c },
    });
  }

  // Remove killed pieces
  pieces = pieces.filter((p) => p.hp > 0);

  // Player Recoil: push opposite to blast (-dr, -dc)
  let recoilR = state.player.r - dr;
  let recoilC = state.player.c - dc;
  let finalPlayerR = state.player.r;
  let finalPlayerC = state.player.c;

  if (
    isInsideBoard(recoilR, recoilC) &&
    !pieces.some((p) => p.r === recoilR && p.c === recoilC)
  ) {
    finalPlayerR = recoilR;
    finalPlayerC = recoilC;
  }

  let nextState: ShotgunChessGame = {
    ...state,
    player: {
      ...state.player,
      r: finalPlayerR,
      c: finalPlayerC,
    },
    shotgun: {
      ...state.shotgun,
      ammo: state.shotgun.ammo - 1,
    },
    pieces,
    souls: state.souls + soulsGained,
    turn: state.turn + 1,
    lastAction: {
      type: "shoot",
      direction: { dr, dc },
      recoil: { r: finalPlayerR, c: finalPlayerC },
      hits,
    },
  };

  // Check if white king killed
  const whiteKing = pieces.find((p) => p.type === "king");
  if (!whiteKing) {
    nextState.status = nextState.floor >= 5 ? "victory" : "wave_clear";
    return nextState;
  }

  // Enemy Turn
  nextState = executeEnemyTurns(nextState);
  return nextState;
}

/**
 * Execute enemy chess pieces movements towards player king.
 */
export function executeEnemyTurns(state: ShotgunChessGame): ShotgunChessGame {
  let pieces = state.pieces.map((p) => ({ ...p }));
  let playerHp = state.player.hp;
  const targetR = state.player.r;
  const targetC = state.player.c;

  for (const piece of pieces) {
    if (playerHp <= 0) break;

    // Calculate move towards player king based on chess piece movement
    const move = computePieceMove(piece, targetR, targetC, pieces);
    if (!move) continue;

    if (move.r === targetR && move.c === targetC) {
      // Attack player!
      const damage = piece.type === "queen" ? 2 : 1;
      playerHp -= damage;
    } else {
      // Move piece to tile
      piece.r = move.r;
      piece.c = move.c;
    }
  }

  const isGameOver = playerHp <= 0;

  return {
    ...state,
    player: {
      ...state.player,
      hp: Math.max(0, playerHp),
    },
    pieces,
    status: isGameOver ? "game_over" : state.status,
  };
}

function computePieceMove(
  piece: ChessPiece,
  targetR: number,
  targetC: number,
  pieces: ChessPiece[]
): Position | null {
  const isOccupied = (r: number, c: number) =>
    pieces.some((p) => p.id !== piece.id && p.r === r && p.c === c);

  switch (piece.type) {
    case "pawn": {
      // Pawn advances forward (+1 r) towards player, or diagonal captures
      if (Math.abs(targetC - piece.c) === 1 && targetR === piece.r + 1) {
        return { r: targetR, c: targetC }; // Attack player
      }
      const forwardR = piece.r + 1;
      if (forwardR < 8 && !isOccupied(forwardR, piece.c)) {
        return { r: forwardR, c: piece.c };
      }
      return null;
    }
    case "knight": {
      const jumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2],  [1, 2],  [2, -1],  [2, 1],
      ];
      let bestMove: Position | null = null;
      let minDis = 999;
      for (const [dr, dc] of jumps) {
        const nr = piece.r + dr;
        const nc = piece.c + dc;
        if (!isInsideBoard(nr, nc)) continue;
        if (nr === targetR && nc === targetC) return { r: nr, c: nc }; // Direct strike
        if (isOccupied(nr, nc)) continue;

        const dist = Math.hypot(nr - targetR, nc - targetC);
        if (dist < minDis) {
          minDis = dist;
          bestMove = { r: nr, c: nc };
        }
      }
      return bestMove;
    }
    case "bishop":
    case "rook":
    case "queen":
    case "king": {
      // Step 1 tile in optimal direction towards target
      const dr = Math.sign(targetR - piece.r);
      const dc = Math.sign(targetC - piece.c);

      let stepDr = dr;
      let stepDc = dc;

      if (piece.type === "rook") {
        // Rook only moves orthogonal
        if (Math.abs(targetR - piece.r) > Math.abs(targetC - piece.c)) {
          stepDc = 0;
        } else {
          stepDr = 0;
        }
      } else if (piece.type === "bishop") {
        // Bishop only moves diagonal
        if (stepDr === 0) stepDr = 1;
        if (stepDc === 0) stepDc = 1;
      }

      const nr = piece.r + stepDr;
      const nc = piece.c + stepDc;
      if (isInsideBoard(nr, nc) && !isOccupied(nr, nc)) {
        return { r: nr, c: nc };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Apply selected upgrade card and advance to next floor.
 */
export function applyUpgrade(state: ShotgunChessGame, upgradeId: string): ShotgunChessGame {
  let shotgun = { ...state.shotgun };
  let player = { ...state.player };

  if (upgradeId === "extra_chamber") {
    shotgun.maxAmmo += 1;
    shotgun.ammo = shotgun.maxAmmo;
  } else if (upgradeId === "choke_barrel") {
    shotgun.range += 1;
  } else if (upgradeId === "heavy_slugs") {
    shotgun.knockback += 1;
  } else if (upgradeId === "royal_armor") {
    player.maxHp += 2;
    player.hp = player.maxHp;
  }

  const nextFloor = state.floor + 1;
  return {
    ...state,
    player: {
      ...player,
      r: 7,
      c: 4,
    },
    shotgun: {
      ...shotgun,
      ammo: shotgun.maxAmmo,
    },
    pieces: getInitialPieces(nextFloor),
    floor: nextFloor,
    status: "playing",
    upgrades: [...state.upgrades, upgradeId],
  };
}
