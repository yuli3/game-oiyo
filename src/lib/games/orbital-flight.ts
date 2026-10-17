export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface OrbitalGate {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  passed: boolean;
  score: number;
}

export interface OrbitalDebris {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface OrbitalFlightState {
  ship: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    pitch: number;
    yaw: number;
    roll: number;
    speed: number;
  };
  altitude: number; // distance from central planet (0,0,0)
  minAltitude: number; // 25 (atmospheric reentry burn)
  maxAltitude: number; // 90 (deep space escape)
  hull: number; // 0 to 100
  shield: number; // 0 to 100
  energy: number; // 0 to 100 (for boost)
  score: number;
  gatesPassed: number;
  multiplier: number;
  gameOver: boolean;
  gameOverReason: "hull_depleted" | "atmospheric_burn" | "escaped_orbit" | null;
  paused: boolean;
  timeAlive: number;
  gates: OrbitalGate[];
  debris: OrbitalDebris[];
  planetRadius: number;
}

export function createInitialOrbitalState(): OrbitalFlightState {
  const initialAltitude = 50;
  const initialGates: OrbitalGate[] = [];
  const initialDebris: OrbitalDebris[] = [];

  // Generate orbital ring of gates
  const numGates = 12;
  for (let i = 0; i < numGates; i++) {
    const angle = (i / numGates) * Math.PI * 2;
    const r = initialAltitude + (Math.sin(i * 1.5) * 6);
    initialGates.push({
      id: `gate-${i}`,
      x: Math.cos(angle) * r,
      y: Math.sin(angle * 2) * 4,
      z: Math.sin(angle) * r,
      radius: 4.5,
      passed: false,
      score: 250,
    });
  }

  // Generate initial debris
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + 0.2;
    const r = initialAltitude + ((i % 5) - 2) * 5;
    initialDebris.push({
      id: `debris-${i}`,
      x: Math.cos(angle) * r,
      y: ((i % 7) - 3) * 3,
      z: Math.sin(angle) * r,
      radius: 1.8,
      vx: -Math.sin(angle) * 0.05,
      vy: 0.01 * (i % 3 - 1),
      vz: Math.cos(angle) * 0.05,
    });
  }

  return {
    ship: {
      x: initialAltitude,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0.45, // Tangential orbital velocity
      pitch: 0,
      yaw: 0,
      roll: 0,
      speed: 0.45,
    },
    altitude: initialAltitude,
    minAltitude: 22,
    maxAltitude: 85,
    hull: 100,
    shield: 100,
    energy: 100,
    score: 0,
    gatesPassed: 0,
    multiplier: 1,
    gameOver: false,
    gameOverReason: null,
    paused: false,
    timeAlive: 0,
    gates: initialGates,
    debris: initialDebris,
    planetRadius: 18,
  };
}

export function updateOrbitalFlight(
  state: OrbitalFlightState,
  inputs: {
    thrust: number; // -1 (brake) to +1 (accelerate)
    pitch: number; // -1 (down) to +1 (up)
    yaw: number; // -1 (left) to +1 (right)
    roll: number; // -1 to +1
    boost?: boolean;
  },
  dt: number = 0.016
): OrbitalFlightState {
  if (state.gameOver || state.paused) return state;

  const next = { ...state };
  const ship = { ...next.ship };

  // 1. Controls
  const turnSpeed = 1.8;
  ship.pitch += inputs.pitch * turnSpeed * dt;
  ship.yaw += inputs.yaw * turnSpeed * dt;
  ship.roll += inputs.roll * turnSpeed * dt;

  // Clamp pitch to avoid gimbal lock
  ship.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, ship.pitch));

  // Forward vector based on yaw and pitch
  const fx = Math.cos(ship.yaw) * Math.cos(ship.pitch);
  const fy = Math.sin(ship.pitch);
  const fz = Math.sin(ship.yaw) * Math.cos(ship.pitch);

  let thrustFactor = 0.8;
  if (inputs.boost && next.energy > 5) {
    thrustFactor = 1.6;
    next.energy = Math.max(0, next.energy - 25 * dt);
  } else {
    next.energy = Math.min(100, next.energy + 8 * dt);
  }

  // Apply thrust acceleration
  const accel = inputs.thrust * thrustFactor * dt;
  ship.vx += fx * accel;
  ship.vy += fy * accel;
  ship.vz += fz * accel;

  // 2. Gravitational attraction towards origin (planet at 0,0,0)
  const currentDist = Math.sqrt(ship.x * ship.x + ship.y * ship.y + ship.z * ship.z) || 1;
  const gravityConstant = 250;
  const gravMag = (gravityConstant / (currentDist * currentDist)) * dt;
  ship.vx -= (ship.x / currentDist) * gravMag;
  ship.vy -= (ship.y / currentDist) * gravMag;
  ship.vz -= (ship.z / currentDist) * gravMag;

  // 3. Move ship
  ship.x += ship.vx;
  ship.y += ship.vy;
  ship.z += ship.vz;

  const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy + ship.vz * ship.vz);
  ship.speed = currentSpeed;
  next.ship = ship;

  // Altitude update
  const newAltitude = Math.sqrt(ship.x * ship.x + ship.y * ship.y + ship.z * ship.z);
  next.altitude = newAltitude;

  // 4. Check boundaries
  if (newAltitude <= next.minAltitude) {
    next.gameOver = true;
    next.gameOverReason = "atmospheric_burn";
    next.hull = 0;
    return next;
  }
  if (newAltitude >= next.maxAltitude) {
    next.gameOver = true;
    next.gameOverReason = "escaped_orbit";
    return next;
  }

  // 5. Check Gates
  let newGatesPassed = next.gatesPassed;
  let newScore = next.score + Math.floor(currentSpeed * 10 * dt);
  let newMultiplier = next.multiplier;

  const updatedGates = next.gates.map((gate) => {
    if (gate.passed) return gate;
    const dx = ship.x - gate.x;
    const dy = ship.y - gate.y;
    const dz = ship.z - gate.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < gate.radius) {
      newGatesPassed += 1;
      newMultiplier = Math.min(5, newMultiplier + 0.5);
      newScore += Math.floor(gate.score * newMultiplier);
      next.shield = Math.min(100, next.shield + 20);
      return { ...gate, passed: true };
    }
    return gate;
  });

  // Re-spawn passed gates ahead
  const allPassed = updatedGates.every((g) => g.passed);
  if (allPassed) {
    for (let i = 0; i < updatedGates.length; i++) {
      const angle = (i / updatedGates.length) * Math.PI * 2;
      const r = next.altitude + (Math.sin(i * 2) * 8);
      updatedGates[i] = {
        id: `gate-loop-${Date.now()}-${i}`,
        x: Math.cos(angle) * r,
        y: Math.sin(angle * 3) * 5,
        z: Math.sin(angle) * r,
        radius: 4.5,
        passed: false,
        score: 300,
      };
    }
  }
  next.gates = updatedGates;
  next.gatesPassed = newGatesPassed;
  next.score = newScore;
  next.multiplier = newMultiplier;

  // 6. Move debris and check collisions
  let currentShield = next.shield;
  let currentHull = next.hull;

  const updatedDebris = next.debris.map((deb) => {
    const dx = ship.x - deb.x;
    const dy = ship.y - deb.y;
    const dz = ship.z - deb.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < deb.radius + 1.2) {
      // Collision with debris
      if (currentShield > 20) {
        currentShield = Math.max(0, currentShield - 30);
      } else {
        const damage = 35 - currentShield;
        currentShield = 0;
        currentHull = Math.max(0, currentHull - damage);
      }
      next.multiplier = 1; // Reset combo multiplier
      // Teleport debris ahead
      return {
        ...deb,
        x: deb.x + (Math.random() - 0.5) * 40,
        z: deb.z + (Math.random() - 0.5) * 40,
      };
    }

    return {
      ...deb,
      x: deb.x + deb.vx,
      y: deb.y + deb.vy,
      z: deb.z + deb.vz,
    };
  });

  next.debris = updatedDebris;
  next.shield = currentShield;
  next.hull = currentHull;

  if (next.hull <= 0) {
    next.gameOver = true;
    next.gameOverReason = "hull_depleted";
  }

  next.timeAlive += dt;
  return next;
}
