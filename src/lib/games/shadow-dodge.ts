/**
 * @file shadow-dodge.ts
 * @description #157 Shadow Dodge — Bullet-Hell Grazing & Bullet-Time Survival Engine.
 * Powered by OIYO Web-Unity Engine (`createSeededRng`), autonomous seeker steering (`game-ai`),
 * continuous collision & grazing detection (`physics-tuning`), and deterministic Monte Carlo balance audit.
 */

import { createSeededRng } from "./engine-v2";

export type HazardKind = "orb" | "seeker" | "sweeper";

export interface HazardOrb {
  id: string;
  kind: HazardKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  grazed: boolean;
}

export interface GrazeSpark {
  id: string;
  x: number;
  y: number;
  ttl: number;
}

export interface ShadowPlayer {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  grazeRadius: number;
  speed: number;
  hp: number;
  maxHp: number;
  shadowEnergy: number; // 0..100
  dashCooldown: number;
  invulnerableTimer: number;
}

export interface ShadowDodgeState {
  status: "idle" | "playing" | "gameover";
  score: number;
  highScore: number;
  wave: number;
  survivalTime: number;
  combo: number;
  maxCombo: number;
  totalGrazes: number;
  pulsesTriggered: number;
  timeScale: number; // 1.0 normal, 0.35 bullet-time on graze
  bulletTimeTimer: number;
  spawnTimer: number;
  seed: number;
  player: ShadowPlayer;
  hazards: HazardOrb[];
  sparks: GrazeSpark[];
  lastEvent: "none" | "graze" | "hit" | "dash" | "pulse" | "wave" | "gameover";
}

export const ARENA_WIDTH = 600;
export const ARENA_HEIGHT = 400;
export const PLAYER_HIT_RADIUS = 9;
export const PLAYER_GRAZE_RADIUS = 34;
export const PLAYER_BASE_SPEED = 290;
export const DASH_COOLDOWN_SEC = 2.5;
export const DASH_INVULN_SEC = 0.4;

export function createInitialShadowDodgeState(highScore = 0, seed = 20261108): ShadowDodgeState {
  return {
    status: "idle",
    score: 0,
    highScore,
    wave: 1,
    survivalTime: 0,
    combo: 0,
    maxCombo: 0,
    totalGrazes: 0,
    pulsesTriggered: 0,
    timeScale: 1.0,
    bulletTimeTimer: 0,
    spawnTimer: 0.6,
    seed,
    player: {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      targetX: ARENA_WIDTH / 2,
      targetY: ARENA_HEIGHT / 2,
      radius: PLAYER_HIT_RADIUS,
      grazeRadius: PLAYER_GRAZE_RADIUS,
      speed: PLAYER_BASE_SPEED,
      hp: 3,
      maxHp: 3,
      shadowEnergy: 0,
      dashCooldown: 0,
      invulnerableTimer: 0,
    },
    hazards: [],
    sparks: [],
    lastEvent: "none",
  };
}

export function startShadowDodgeGame(state: ShadowDodgeState): ShadowDodgeState {
  const next = createInitialShadowDodgeState(state.highScore, state.seed + 1);
  return {
    ...next,
    status: "playing",
  };
}

export function setPlayerTarget(
  state: ShadowDodgeState,
  targetX: number,
  targetY: number
): ShadowDodgeState {
  if (state.status !== "playing") return state;
  const pad = state.player.radius + 6;
  const clampedX = Math.max(pad, Math.min(ARENA_WIDTH - pad, targetX));
  const clampedY = Math.max(pad, Math.min(ARENA_HEIGHT - pad, targetY));

  return {
    ...state,
    player: {
      ...state.player,
      targetX: clampedX,
      targetY: clampedY,
    },
  };
}

/**
 * Trigger Phase-Shift Dash: instant blink toward target + brief invulnerability
 */
export function triggerShadowDash(state: ShadowDodgeState): ShadowDodgeState {
  if (state.status !== "playing") return state;
  if (state.player.dashCooldown > 0) return state;

  const p = state.player;
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.hypot(dx, dy);
  const dashDist = Math.min(110, dist > 1 ? dist : 90);
  const angle = dist > 1 ? Math.atan2(dy, dx) : -Math.PI / 2;

  const pad = p.radius + 6;
  const nextX = Math.max(pad, Math.min(ARENA_WIDTH - pad, p.x + Math.cos(angle) * dashDist));
  const nextY = Math.max(pad, Math.min(ARENA_HEIGHT - pad, p.y + Math.sin(angle) * dashDist));

  return {
    ...state,
    player: {
      ...p,
      x: nextX,
      y: nextY,
      targetX: nextX,
      targetY: nextY,
      dashCooldown: DASH_COOLDOWN_SEC,
      invulnerableTimer: DASH_INVULN_SEC,
    },
    lastEvent: "dash",
  };
}

/**
 * Trigger Shadow Pulse: consumes 100 Shadow Energy to vaporize all active hazards into score
 */
export function triggerShadowPulse(state: ShadowDodgeState): ShadowDodgeState {
  if (state.status !== "playing") return state;
  if (state.player.shadowEnergy < 100) return state;

  const clearedCount = state.hazards.length;
  const pulseScore = clearedCount * 150 + 500;
  const nextScore = state.score + pulseScore;
  const nextCombo = state.combo + clearedCount;

  const newSparks: GrazeSpark[] = state.hazards.map((h) => ({
    id: `pulse-${h.id}`,
    x: h.x,
    y: h.y,
    ttl: 0.45,
  }));

  return {
    ...state,
    score: nextScore,
    highScore: Math.max(state.highScore, nextScore),
    combo: nextCombo,
    maxCombo: Math.max(state.maxCombo, nextCombo),
    pulsesTriggered: state.pulsesTriggered + 1,
    hazards: [],
    sparks: [...state.sparks, ...newSparks].slice(-30),
    player: {
      ...state.player,
      shadowEnergy: 0,
      invulnerableTimer: Math.max(state.player.invulnerableTimer, 0.5),
    },
    lastEvent: "pulse",
  };
}

/**
 * Spawn a wave pattern of hazards along arena perimeter
 */
export function spawnHazardPattern(
  state: ShadowDodgeState,
  rng: () => number
): HazardOrb[] {
  const w = state.wave;
  const count = Math.min(6, 2 + Math.floor(w / 2));
  const spawned: HazardOrb[] = [];

  for (let i = 0; i < count; i++) {
    const edge = Math.floor(rng() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = rng() * ARENA_WIDTH;
      y = -10;
    } else if (edge === 1) {
      x = ARENA_WIDTH + 10;
      y = rng() * ARENA_HEIGHT;
    } else if (edge === 2) {
      x = rng() * ARENA_WIDTH;
      y = ARENA_HEIGHT + 10;
    } else {
      x = -10;
      y = rng() * ARENA_HEIGHT;
    }

    const roll = rng();
    const kind: HazardKind =
      roll < 0.22 && w >= 2 ? "seeker" : roll < 0.48 && w >= 2 ? "sweeper" : "orb";

    const baseSpeed =
      kind === "sweeper"
        ? 210 + w * 12
        : kind === "seeker"
        ? 145 + w * 8
        : 155 + w * 10;

    // Aim toward player with slight spread
    const aimAngle =
      Math.atan2(state.player.y - y, state.player.x - x) + (rng() - 0.5) * 0.35;

    spawned.push({
      id: `hz-${state.survivalTime.toFixed(2)}-${i}-${Math.floor(rng() * 10000)}`,
      kind,
      x,
      y,
      vx: Math.cos(aimAngle) * baseSpeed,
      vy: Math.sin(aimAngle) * baseSpeed,
      speed: baseSpeed,
      radius: kind === "sweeper" ? 6 : kind === "seeker" ? 9 : 8,
      grazed: false,
    });
  }

  return spawned;
}

/**
 * Step simulation by dt seconds
 */
export function stepShadowDodge(state: ShadowDodgeState, dt: number): ShadowDodgeState {
  if (state.status !== "playing") return state;

  const clampedDt = Math.min(dt, 0.05);
  const rng = createSeededRng(state.seed + Math.floor(state.survivalTime * 1000));

  // Bullet-time scale management
  let bulletTimeTimer = Math.max(0, state.bulletTimeTimer - clampedDt);
  let timeScale = bulletTimeTimer > 0 ? 0.38 : 1.0;
  const worldDt = clampedDt * timeScale;

  const survivalTime = state.survivalTime + clampedDt;
  const nextWave = 1 + Math.floor(survivalTime / 12);
  let lastEvent: ShadowDodgeState["lastEvent"] =
    nextWave > state.wave ? "wave" : "none";

  // 1. Update Player movement (always responsive even during bullet-time)
  const p = { ...state.player };
  p.dashCooldown = Math.max(0, p.dashCooldown - clampedDt);
  p.invulnerableTimer = Math.max(0, p.invulnerableTimer - clampedDt);

  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.hypot(dx, dy);
  const maxStep = p.speed * clampedDt;
  if (dist > 0.5) {
    const moveRatio = Math.min(1, maxStep / dist);
    p.x += dx * moveRatio;
    p.y += dy * moveRatio;
  }

  // 2. Spawn new hazards
  let spawnTimer = state.spawnTimer - worldDt;
  let hazards = [...state.hazards];
  if (spawnTimer <= 0) {
    const interval = Math.max(0.42, 1.25 - nextWave * 0.08);
    spawnTimer = interval;
    hazards.push(...spawnHazardPattern(state, rng));
  }

  // 3. Update Hazards & Check Graze / Collision
  const nextHazards: HazardOrb[] = [];
  const nextSparks: GrazeSpark[] = state.sparks
    .map((s) => ({ ...s, ttl: s.ttl - clampedDt }))
    .filter((s) => s.ttl > 0);

  let score = state.score + Math.round(clampedDt * 25 * (1 + state.combo * 0.05));
  let combo = state.combo;
  let maxCombo = state.maxCombo;
  let totalGrazes = state.totalGrazes;

  for (const h of hazards) {
    let vx = h.vx;
    let vy = h.vy;

    // Seeker steering behavior (game-ai)
    if (h.kind === "seeker") {
      const desiredAngle = Math.atan2(p.y - h.y, p.x - h.x);
      const currentAngle = Math.atan2(vy, vx);
      let diff = desiredAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steerAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), 1.4 * worldDt);
      vx = Math.cos(steerAngle) * h.speed;
      vy = Math.sin(steerAngle) * h.speed;
    }

    const nx = h.x + vx * worldDt;
    const ny = h.y + vy * worldDt;

    // Despawn if far outside arena
    if (nx < -50 || nx > ARENA_WIDTH + 50 || ny < -50 || ny > ARENA_HEIGHT + 50) {
      continue;
    }

    const dToPlayer = Math.hypot(nx - p.x, ny - p.y);
    const hitThreshold = p.radius + h.radius;
    const grazeThreshold = p.grazeRadius + h.radius;

    // Direct Hit Check
    if (dToPlayer <= hitThreshold) {
      if (p.invulnerableTimer <= 0) {
        p.hp = Math.max(0, p.hp - 1);
        p.invulnerableTimer = 1.2; // Post-hit grace period
        combo = 0;
        lastEvent = p.hp === 0 ? "gameover" : "hit";
      }
      // Destroy the orb on impact
      continue;
    }

    // Grazing Check (Near-miss within grazeRadius!)
    let grazed = h.grazed;
    if (!grazed && dToPlayer <= grazeThreshold) {
      grazed = true;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      totalGrazes += 1;
      score += 120 + combo * 30;
      p.shadowEnergy = Math.min(100, p.shadowEnergy + 18);
      bulletTimeTimer = 0.35; // Trigger brief bullet-time slow-mo!
      timeScale = 0.38;
      if (lastEvent === "none") lastEvent = "graze";

      nextSparks.push({
        id: `sp-${h.id}`,
        x: (p.x + nx) / 2,
        y: (p.y + ny) / 2,
        ttl: 0.35,
      });
    }

    nextHazards.push({
      ...h,
      x: nx,
      y: ny,
      vx,
      vy,
      grazed,
    });
  }

  const status: ShadowDodgeState["status"] = p.hp <= 0 ? "gameover" : "playing";

  return {
    ...state,
    status,
    score,
    highScore: Math.max(state.highScore, score),
    wave: nextWave,
    survivalTime,
    combo,
    maxCombo,
    totalGrazes,
    timeScale,
    bulletTimeTimer,
    spawnTimer,
    player: p,
    hazards: nextHazards,
    sparks: nextSparks.slice(-25),
    lastEvent,
  };
}

export interface ShadowDodgeAuditReport {
  skillTier: "novice" | "adept" | "master";
  trials: number;
  avgSurvivalSec: number;
  avgScore: number;
  avgGrazes: number;
}

/**
 * Deterministic Monte Carlo Balance Audit using fixed LCG seed
 */
export function runShadowDodgeMonteCarloAudit(
  trials = 20,
  skillTier: "novice" | "adept" | "master" = "adept",
  seed = 1337
): ShadowDodgeAuditReport {
  const rng = createSeededRng(seed);
  let totalSurvival = 0;
  let totalScore = 0;
  let totalGrazes = 0;

  // Dodge accuracy & pulse usage by skill tier
  const dodgeEfficiency =
    skillTier === "master" ? 0.94 : skillTier === "adept" ? 0.72 : 0.38;

  for (let t = 0; t < trials; t++) {
    let state = startShadowDodgeGame(createInitialShadowDodgeState(0, seed + t * 97));
    const dt = 0.05;
    let steps = 0;
    const maxSteps = 900; // up to 45s simulated per trial

    while (state.status === "playing" && steps < maxSteps) {
      steps++;

      // AI agent decision every 4 steps
      if (steps % 4 === 0) {
        if (state.player.shadowEnergy >= 100 && skillTier !== "novice") {
          state = triggerShadowPulse(state);
        } else if (state.hazards.length > 0 && rng() < dodgeEfficiency) {
          // Find nearest threat and steer perpendicular to its velocity
          let nearest = state.hazards[0];
          let minDist = Infinity;
          for (const h of state.hazards) {
            const d = Math.hypot(h.x - state.player.x, h.y - state.player.y);
            if (d < minDist) {
              minDist = d;
              nearest = h;
            }
          }

          if (minDist < 120) {
            // Evade perpendicular to threat vector
            const perpAngle = Math.atan2(nearest.vy, nearest.vx) + Math.PI / 2;
            const evadeDist = skillTier === "master" ? 42 : 65; // Master stays closer to farm grazes!
            const tx = state.player.x + Math.cos(perpAngle) * evadeDist;
            const ty = state.player.y + Math.sin(perpAngle) * evadeDist;
            state = setPlayerTarget(state, tx, ty);

            if (minDist < 28 && state.player.dashCooldown <= 0 && skillTier === "master") {
              state = triggerShadowDash(state);
            }
          } else {
            // Return toward center to avoid cornering
            state = setPlayerTarget(
              state,
              ARENA_WIDTH / 2 + (rng() - 0.5) * 80,
              ARENA_HEIGHT / 2 + (rng() - 0.5) * 80
            );
          }
        } else {
          // Novice erratic movement
          state = setPlayerTarget(
            state,
            state.player.x + (rng() - 0.5) * 60,
            state.player.y + (rng() - 0.5) * 60
          );
        }
      }

      state = stepShadowDodge(state, dt);
    }

    totalSurvival += state.survivalTime;
    totalScore += state.score;
    totalGrazes += state.totalGrazes;
  }

  return {
    skillTier,
    trials,
    avgSurvivalSec: Number((totalSurvival / trials).toFixed(2)),
    avgScore: Math.round(totalScore / trials),
    avgGrazes: Number((totalGrazes / trials).toFixed(1)),
  };
}
