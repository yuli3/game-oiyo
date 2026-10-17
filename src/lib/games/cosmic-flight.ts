export interface ShipState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  pitch: number;
  roll: number;
  boost: number; // 0 to 100
  isBoosting: boolean;
}

export interface GateRing {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  passed: boolean;
}

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  rotSpeed: number;
}

export interface FlightCourse {
  rings: GateRing[];
  asteroids: Asteroid[];
  courseLength: number;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFlightCourse(seed = 12345, count = 25): FlightCourse {
  const rand = mulberry32(seed);
  const rings: GateRing[] = [];
  const asteroids: Asteroid[] = [];

  let curX = 0;
  let curY = 0;
  let curZ = -50;

  for (let i = 0; i < count; i++) {
    curX += (rand() - 0.5) * 16;
    curY += (rand() - 0.5) * 12;
    curZ -= 65 + rand() * 20;

    // Constrain curve
    curX = Math.max(-25, Math.min(25, curX));
    curY = Math.max(-15, Math.min(15, curY));

    rings.push({
      id: i,
      x: curX,
      y: curY,
      z: curZ,
      radius: 4.5,
      passed: false,
    });

    // Spawn 1-2 asteroids near but off-center
    const asteroidCount = 1 + Math.floor(rand() * 2);
    for (let a = 0; a < asteroidCount; a++) {
      const offsetX = (rand() - 0.5) * 28;
      const offsetY = (rand() - 0.5) * 20;
      if (Math.hypot(offsetX, offsetY) > 6.0) {
        asteroids.push({
          id: i * 10 + a,
          x: curX + offsetX,
          y: curY + offsetY,
          z: curZ + (rand() - 0.5) * 30,
          radius: 1.8 + rand() * 1.5,
          rotSpeed: (rand() - 0.5) * 2,
        });
      }
    }
  }

  return {
    rings,
    asteroids,
    courseLength: Math.abs(curZ),
  };
}

export function updateShipPhysics(
  ship: ShipState,
  input: { x: number; y: number; boost: boolean },
  dt: number = 1 / 60
): ShipState {
  const baseSpeed = 48;
  const boostSpeed = 82;
  const targetForwardSpeed = input.boost && ship.boost > 0 ? boostSpeed : baseSpeed;

  const currentBoost = input.boost
    ? Math.max(0, ship.boost - dt * 25)
    : Math.min(100, ship.boost + dt * 8);

  const targetVx = input.x * 24;
  const targetVy = input.y * 18;

  const vx = ship.vx + (targetVx - ship.vx) * Math.min(1, dt * 8);
  const vy = ship.vy + (targetVy - ship.vy) * Math.min(1, dt * 8);
  const vz = -targetForwardSpeed;

  const nextX = Math.max(-30, Math.min(30, ship.x + vx * dt));
  const nextY = Math.max(-20, Math.min(20, ship.y + vy * dt));
  const nextZ = ship.z + vz * dt;

  const pitch = -vy * 0.04;
  const roll = -vx * 0.06;

  return {
    x: nextX,
    y: nextY,
    z: nextZ,
    vx,
    vy,
    vz,
    pitch,
    roll,
    boost: currentBoost,
    isBoosting: input.boost && currentBoost > 0,
  };
}

export function checkRingPass(ship: ShipState, ring: GateRing): boolean {
  if (ring.passed) return false;
  // If ship crossed the ring's Z plane in the last step
  const zDiff = Math.abs(ship.z - ring.z);
  if (zDiff < 4.0) {
    const dist2D = Math.hypot(ship.x - ring.x, ship.y - ring.y);
    return dist2D <= ring.radius;
  }
  return false;
}

export function checkAsteroidCollision(ship: ShipState, asteroid: Asteroid): boolean {
  const dist3D = Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y, ship.z - asteroid.z);
  return dist3D <= asteroid.radius + 1.2;
}
