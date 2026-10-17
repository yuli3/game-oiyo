export type TileType = 'normal' | 'boost' | 'jump' | 'checkpoint' | 'finish';

export interface TrackTile {
  id: number;
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  type: TileType;
  hasStar?: boolean;
}

export interface MarbleState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  isGrounded: boolean;
  score: number;
  starsCollected: number;
  elapsedTime: number;
  status: 'ready' | 'playing' | 'cleared' | 'failed';
  currentCheckpoint: [number, number, number];
  stars: boolean[]; // whether star at index i is collected
}

export interface MarbleInput {
  steerX: number; // -1 (left) to 1 (right)
  throttleZ: number; // -1 (brake) to 1 (accelerate)
  jump?: boolean;
}

export const COURSE_TILES: TrackTile[] = [
  // Start zone
  { id: 0, position: [0, 0, 0], size: [8, 1, 10], type: 'normal' },
  { id: 1, position: [0, 0, 15], size: [6, 1, 16], type: 'normal', hasStar: true },
  // Boost pad into a ramp
  { id: 2, position: [0, 0, 26], size: [6, 1, 6], type: 'boost' },
  { id: 3, position: [0, 1, 35], size: [6, 1, 12], type: 'normal', hasStar: true },
  // Checkpoint 1
  { id: 4, position: [0, 2, 45], size: [8, 1, 8], type: 'checkpoint' },
  // Curve right
  { id: 5, position: [3, 2, 55], size: [6, 1, 12], type: 'normal', hasStar: true },
  { id: 6, position: [8, 2, 65], size: [6, 1, 12], type: 'normal' },
  // Jump pad over a gap
  { id: 7, position: [8, 2, 74], size: [6, 1, 6], type: 'jump', hasStar: true },
  // Landing zone after gap (starts at z=90)
  { id: 8, position: [8, 1, 95], size: [8, 1, 20], type: 'normal' },
  // Checkpoint 2
  { id: 9, position: [8, 1, 110], size: [8, 1, 10], type: 'checkpoint' },
  // Narrow bridge with stars
  { id: 10, position: [4, 1, 125], size: [4, 1, 16], type: 'normal', hasStar: true },
  { id: 11, position: [0, 1, 140], size: [4, 1, 14], type: 'boost' },
  // Final stretch to finish
  { id: 12, position: [0, 1, 155], size: [6, 1, 16], type: 'normal', hasStar: true },
  { id: 13, position: [0, 1, 170], size: [10, 1, 14], type: 'finish' },
];

const GRAVITY = -24;
const ACCEL_FORWARD = 22;
const ACCEL_STEER = 20;
const MAX_SPEED = 28;
const BOOST_IMPULSE = 36;
const JUMP_IMPULSE = 11;
const FRICTION = 0.94;
const AIR_DRAG = 0.985;
const MARBLE_RADIUS = 0.6;

export function createInitialMarbleState(): MarbleState {
  return {
    x: 0,
    y: 1.5,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    isGrounded: true,
    score: 0,
    starsCollected: 0,
    elapsedTime: 0,
    status: 'ready',
    currentCheckpoint: [0, 1.5, 0],
    stars: COURSE_TILES.map(() => false),
  };
}

export function updateMarblePhysics(
  state: MarbleState,
  input: MarbleInput,
  dt: number,
  tiles: TrackTile[] = COURSE_TILES
): MarbleState {
  if (state.status === 'cleared' || state.status === 'failed') {
    return state;
  }

  const safeDt = Math.min(dt, 0.05);
  let { x, y, z, vx, vy, vz, isGrounded, score, starsCollected, currentCheckpoint } = state;
  let status: MarbleState['status'] = state.status;
  const stars = [...state.stars];

  if (status === 'ready' && (input.throttleZ !== 0 || input.steerX !== 0 || input.jump)) {
    status = 'playing';
  }

  const elapsedTime = status === 'playing' ? state.elapsedTime + safeDt : state.elapsedTime;

  // Steering and acceleration
  if (isGrounded) {
    vx += input.steerX * ACCEL_STEER * safeDt;
    vz += input.throttleZ * ACCEL_FORWARD * safeDt;

    // Apply Ground Friction
    vx *= FRICTION;
    vz *= FRICTION;

    if (input.jump) {
      vy = JUMP_IMPULSE;
      isGrounded = false;
    }
  } else {
    // Air control (reduced)
    vx += input.steerX * (ACCEL_STEER * 0.4) * safeDt;
    vz += input.throttleZ * (ACCEL_FORWARD * 0.4) * safeDt;

    // Air drag & gravity
    vx *= AIR_DRAG;
    vz *= AIR_DRAG;
    vy += GRAVITY * safeDt;
  }

  // Cap top horizontal speed
  const horizSpeed = Math.hypot(vx, vz);
  if (horizSpeed > MAX_SPEED) {
    const scale = MAX_SPEED / horizSpeed;
    vx *= scale;
    vz *= scale;
  }

  // Move marble
  x += vx * safeDt;
  y += vy * safeDt;
  z += vz * safeDt;

  // Ground collision detection with tiles
  let foundGround = false;
  let groundY = -999;

  for (const tile of tiles) {
    const [tx, ty, tz] = tile.position;
    const [tw, th, td] = tile.size;

    const halfW = tw / 2 + MARBLE_RADIUS * 0.5;
    const halfD = td / 2 + MARBLE_RADIUS * 0.5;
    const topY = ty + th / 2;

    if (x >= tx - halfW && x <= tx + halfW && z >= tz - halfD && z <= tz + halfD) {
      // Check vertical intersection with top of tile
      if (y - MARBLE_RADIUS <= topY + 0.3 && y >= topY - 0.4 && vy <= 0.5) {
        foundGround = true;
        groundY = Math.max(groundY, topY + MARBLE_RADIUS);

        // Tile effects
        if (tile.type === 'boost') {
          vz = Math.max(vz, BOOST_IMPULSE);
          score += 15;
        } else if (tile.type === 'jump') {
          vy = JUMP_IMPULSE * 1.3;
          vz = Math.max(vz, 15);
          isGrounded = false;
        } else if (tile.type === 'checkpoint') {
          currentCheckpoint = [tx, topY + MARBLE_RADIUS + 0.5, tz];
        } else if (tile.type === 'finish') {
          status = 'cleared';
          score += Math.max(100, Math.floor(1000 - elapsedTime * 20));
        }

        // Star collection
        if (tile.hasStar && !stars[tile.id]) {
          stars[tile.id] = true;
          starsCollected += 1;
          score += 50;
        }
      }
    }
  }

  if (foundGround && vy <= 0) {
    y = groundY;
    vy = 0;
    isGrounded = true;
  } else if (!foundGround) {
    isGrounded = false;
  }

  // Fall off track check
  if (y < -15) {
    // Respawn at checkpoint with penalty
    x = currentCheckpoint[0];
    y = currentCheckpoint[1];
    z = currentCheckpoint[2];
    vx = 0;
    vy = 0;
    vz = 0;
    isGrounded = true;
    score = Math.max(0, score - 30);
  }

  return {
    x,
    y,
    z,
    vx,
    vy,
    vz,
    isGrounded,
    score,
    starsCollected,
    elapsedTime,
    status,
    currentCheckpoint,
    stars,
  };
}
