/**
 * Paper Flight 3D (종이비행기 3D) Simulation Engine
 *
 * Implements:
 * - Glider aerodynamic lift/drag/gravity physics with stall mechanics
 * - Banking turns & roll physics
 * - Thermal updrafts (상승기류) with vertical impulse
 * - Golden boost rings & collectible origami cranes
 * - Stamina & boost paper flap stunts
 * - 5-biome scenic corridor generation (Study Room -> Park -> Clouds -> Canyon -> Aurora)
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoostRing {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  passed: boolean;
}

export interface ThermalUpdraft {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  liftPower: number;
  active: boolean;
}

export interface OrigamiCrane {
  id: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export type BiomeType = 'study' | 'park' | 'clouds' | 'canyon' | 'aurora';

export interface FlightCourse {
  length: number;
  rings: BoostRing[];
  thermals: ThermalUpdraft[];
  cranes: OrigamiCrane[];
}

export interface PaperPlaneState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  pitch: number; // Nose up (>0) or Nose down (<0) in radians
  yaw: number;   // Left/Right heading
  roll: number;  // Banking tilt
  airspeed: number;
  stamina: number; // 0 - 100
  isBoosting: boolean;
  isStalled: boolean;
  inThermal: boolean;
}

export interface PaperFlightConfig {
  gravity: number;
  baseLift: number;
  baseDrag: number;
  minAirspeed: number;
  maxAirspeed: number;
  stallPitch: number;
  pitchSpeed: number;
  rollSpeed: number;
  turnSpeed: number;
}

export const DEFAULT_FLIGHT_CONFIG: PaperFlightConfig = {
  gravity: 6.8,
  baseLift: 0.30,
  baseDrag: 0.010,
  minAirspeed: 5.0,
  maxAirspeed: 48.0,
  stallPitch: 0.52, // ~30 degrees
  pitchSpeed: 1.8,
  rollSpeed: 2.8,
  turnSpeed: 1.4,
};

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFlightCourse(seed = 42, length = 3500): FlightCourse {
  const rand = mulberry32(seed);
  const rings: BoostRing[] = [];
  const thermals: ThermalUpdraft[] = [];
  const cranes: OrigamiCrane[] = [];

  let ringId = 1;
  let thermalId = 1;
  let craneId = 1;

  // Generate along Z corridor from -60 to -length
  for (let z = -80; z > -length; z -= 120 + rand() * 80) {
    const x = (rand() - 0.5) * 50;
    const y = 14 + rand() * 28;

    // Rings
    rings.push({
      id: ringId++,
      x,
      y,
      z,
      radius: 3.4,
      passed: false,
    });

    // Cranes along the path
    cranes.push({
      id: craneId++,
      x: x + (rand() - 0.5) * 12,
      y: y + (rand() - 0.5) * 8,
      z: z + 35,
      collected: false,
    });
  }

  // Generate thermals (updraft columns)
  for (let z = -140; z > -length; z -= 220 + rand() * 140) {
    const x = (rand() - 0.5) * 44;
    thermals.push({
      id: thermalId++,
      x,
      y: 0,
      z,
      radius: 6.5,
      height: 60,
      liftPower: 14.0,
      active: true,
    });
  }

  return { length, rings, thermals, cranes };
}

export function getBiomeForZ(z: number): BiomeType {
  const dist = Math.abs(z);
  if (dist < 600) return 'study';
  if (dist < 1400) return 'park';
  if (dist < 2300) return 'clouds';
  if (dist < 3200) return 'canyon';
  return 'aurora';
}

export class PaperFlightEngine {
  public plane: PaperPlaneState;
  public course: FlightCourse;
  public config: PaperFlightConfig;
  public status: 'ready' | 'flying' | 'landed' | 'cleared';
  public score: number;
  public ringsCount: number;
  public cranesCount: number;
  public flightTime: number;

  constructor(seed = 42, config: Partial<PaperFlightConfig> = {}) {
    this.config = { ...DEFAULT_FLIGHT_CONFIG, ...config };
    this.course = generateFlightCourse(seed);
    this.plane = this.createInitialPlane();
    this.status = 'ready';
    this.score = 0;
    this.ringsCount = 0;
    this.cranesCount = 0;
    this.flightTime = 0;
  }

  public createInitialPlane(): PaperPlaneState {
    return {
      x: 0,
      y: 20, // Launch altitude
      z: 0,
      vx: 0,
      vy: 0.5,
      vz: -16.0, // Forward initial glide speed
      pitch: -0.05, // Slight downward glide attitude
      yaw: 0,
      roll: 0,
      airspeed: 16.0,
      stamina: 100,
      isBoosting: false,
      isStalled: false,
      inThermal: false,
    };
  }

  public launch(): void {
    if (this.status === 'ready') {
      this.status = 'flying';
      this.plane.vz = -18.0;
      this.plane.airspeed = 18.0;
    }
  }

  /**
   * Physics update step
   * @param dt delta time in seconds
   * @param pitchInput [-1 (dive) to +1 (climb)]
   * @param rollInput [-1 (bank left) to +1 (bank right)]
   * @param boostInput boolean
   */
  public update(
    dt: number,
    pitchInput: number,
    rollInput: number,
    boostInput: boolean,
  ): void {
    if (this.status !== 'flying') return;

    const clampedDt = Math.min(dt, 0.05);
    this.flightTime += clampedDt;
    const p = this.plane;

    // 1. Controls & Attitude handling
    p.pitch += pitchInput * this.config.pitchSpeed * clampedDt;
    // Bound pitch to prevent inversion
    p.pitch = Math.max(-0.75, Math.min(0.65, p.pitch));

    p.roll += rollInput * this.config.rollSpeed * clampedDt;
    // Roll decay back to level flight when no input
    if (Math.abs(rollInput) < 0.05) {
      p.roll -= p.roll * 3.5 * clampedDt;
    }
    p.roll = Math.max(-1.1, Math.min(1.1, p.roll));

    // Yaw turns proportional to banking roll
    p.yaw -= p.roll * this.config.turnSpeed * clampedDt;

    // 2. Boost Flap mechanic
    p.isBoosting = false;
    if (boostInput && p.stamina > 10) {
      p.isBoosting = true;
      p.stamina = Math.max(0, p.stamina - 30 * clampedDt);
      // Boost gives forward & upward thrust impulse
      p.vz -= 9.0 * clampedDt;
      p.vy += 4.5 * clampedDt;
    } else {
      // Passive stamina regeneration
      p.stamina = Math.min(100, p.stamina + 8 * clampedDt);
    }

    // 3. Aerodynamic forces (Lift, Drag, Gravity)
    // Speed calculation
    const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
    p.airspeed = currentSpeed;

    // Stall detection: high pitch + low speed causes stall
    if (p.pitch > this.config.stallPitch || p.airspeed < this.config.minAirspeed) {
      p.isStalled = true;
      // Stall forces nose down and drops lift
      p.pitch -= 1.2 * clampedDt;
    } else if (p.airspeed > this.config.minAirspeed + 2.0 && p.pitch < this.config.stallPitch - 0.1) {
      p.isStalled = false;
    }

    // Lift force perpendicular to flight path
    // Normal glide pitch creates equilibrium lift
    const liftCoefficient = p.isStalled ? 0.05 : this.config.baseLift;
    // Pitching up converts forward speed into upward lift
    const pitchLift = Math.sin(p.pitch) * 1.5;
    const lift = liftCoefficient * currentSpeed * (1 + pitchLift);

    // Gravity force
    const gravity = this.config.gravity;

    // Induced Drag increases with pitch deflection and stall
    const dragCoeff = this.config.baseDrag * (1 + Math.abs(p.pitch) * 2.2 + (p.isStalled ? 3.0 : 0));
    const dragX = -p.vx * dragCoeff * currentSpeed;
    const dragY = -p.vy * dragCoeff * currentSpeed;
    const dragZ = -p.vz * dragCoeff * currentSpeed;

    // 4. Energy exchange:
    // Diving (pitch < 0) accelerates forward speed via gravity component
    const forwardDrive = -Math.sin(p.pitch) * 26.0;

    // Heading vector from yaw
    const forwardX = Math.sin(p.yaw);
    const forwardZ = -Math.cos(p.yaw);

    // Apply accelerations
    p.vy += (lift - gravity + dragY) * clampedDt;
    p.vx += (dragX + forwardX * forwardDrive - Math.sin(p.roll) * 4.0) * clampedDt;
    p.vz += (dragZ + forwardZ * forwardDrive) * clampedDt;

    // Enforce forward speed ceiling and ground plane
    const forwardSpeed = Math.abs(p.vz);
    if (forwardSpeed > this.config.maxAirspeed) {
      p.vz = -this.config.maxAirspeed;
    }

    // 5. Check Thermal Updrafts
    p.inThermal = false;
    for (const thermal of this.course.thermals) {
      if (!thermal.active) continue;
      const dx = p.x - thermal.x;
      const dz = p.z - thermal.z;
      const dist2 = dx * dx + dz * dz;
      if (dist2 < thermal.radius * thermal.radius && p.y >= 0 && p.y <= thermal.height) {
        p.inThermal = true;
        // Thermal lifts plane up!
        p.vy = Math.min(18.0, p.vy + thermal.liftPower * clampedDt);
        this.score += Math.floor(20 * clampedDt);
        break;
      }
    }

    // 6. Integrate Position
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.z += p.vz * clampedDt;

    // Score based on forward distance traveled
    const currentDist = Math.floor(Math.abs(p.z));
    this.score = Math.max(this.score, currentDist + this.ringsCount * 150 + this.cranesCount * 100);

    // 7. Check Boost Rings Collision
    for (const ring of this.course.rings) {
      if (ring.passed) continue;
      // If plane passed the ring plane along Z
      const dz = Math.abs(p.z - ring.z);
      if (dz < 3.5) {
        const dx = p.x - ring.x;
        const dy = p.y - ring.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        if (distToCenter <= ring.radius) {
          ring.passed = true;
          this.ringsCount++;
          this.score += 150;
          p.vz -= 8.0; // Speed burst!
          p.stamina = Math.min(100, p.stamina + 35);
        }
      }
    }

    // 8. Check Origami Cranes Collision
    for (const crane of this.course.cranes) {
      if (crane.collected) continue;
      const dx = p.x - crane.x;
      const dy = p.y - crane.y;
      const dz = p.z - crane.z;
      const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist3D < 3.2) {
        crane.collected = true;
        this.cranesCount++;
        this.score += 100;
        p.stamina = Math.min(100, p.stamina + 25);
      }
    }

    // 9. Ceiling & Ground check
    // Soft ceiling at y = 80
    if (p.y > 80) {
      p.y = 80;
      p.vy = Math.min(0, p.vy);
    }

    // Ground touchdown
    if (p.y <= 0) {
      p.y = 0;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      this.status = 'landed';
    }

    // Course finish
    if (Math.abs(p.z) >= this.course.length) {
      this.status = 'cleared';
    }
  }

  public reset(seed?: number): void {
    if (seed !== undefined) {
      this.course = generateFlightCourse(seed);
    } else {
      // Reset existing items
      this.course.rings.forEach((r) => (r.passed = false));
      this.course.cranes.forEach((c) => (c.collected = false));
    }
    this.plane = this.createInitialPlane();
    this.status = 'ready';
    this.score = 0;
    this.ringsCount = 0;
    this.cranesCount = 0;
    this.flightTime = 0;
  }
}
