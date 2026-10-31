import {
  computeSailThrustEfficiency,
  generateVoronoiBiomeGrid2D,
  type BiomeKind,
  type VoronoiSeedPoint,
} from "./engine";

export interface IslandEntity {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  radius: number;
  biome: BiomeKind;
  hasRunestone: boolean;
  runestoneClaimed: boolean;
  woodSupply: number;
  ironSupply: number;
}

export interface SeaMonster {
  id: string;
  type: "kraken" | "serpent";
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  isAggro: boolean;
}

export interface HarpoonProjectile {
  id: string;
  worldX: number;
  worldY: number;
  velX: number;
  velY: number;
  rangeRemaining: number;
  damage: number;
}

export interface VikingLongshipState {
  // Ship transform
  shipX: number;
  shipY: number;
  speed: number;
  headingRad: number; // 0 to 2*PI, 0 = North (up)
  sailTrimRad: number; // Sail angle relative to ship center
  oarsEngaged: boolean;
  isAnchored: boolean;

  // Health and survival
  hullHp: number;
  maxHullHp: number;
  foodSupplies: number;
  crewCount: number;
  
  // Inventory
  wood: number;
  iron: number;
  runestonesFound: number;
  requiredRunestones: number;

  // Environment & Weather
  windAngleRad: number; // Direction wind is blowing towards
  windSpeed: number; // knots
  weatherTime: number;
  gameTimeSec: number;

  // World elements
  worldWidth: number;
  worldHeight: number;
  islands: IslandEntity[];
  monsters: SeaMonster[];
  projectiles: HarpoonProjectile[];

  // Gateways
  bifrostPortal: { worldX: number; worldY: number; isActive: boolean };

  // Status
  status: "sailing" | "anchored" | "victory" | "shipwrecked";
  activeLog: string;
}

const WORLD_PIXEL_SCALE = 60; // 1 grid unit = 60 world units
const GRID_COLS = 16;
const GRID_ROWS = 16;

export function createVikingLongshipWorld(): {
  islands: IslandEntity[];
  monsters: SeaMonster[];
  bifrost: { worldX: number; worldY: number; isActive: boolean };
} {
  // 1. Generate Voronoi Seeds for Archipelago
  const seeds: VoronoiSeedPoint[] = [
    { x: 3, y: 3, temperature: 0.2, moisture: 0.8 }, // Tundra/Boreal
    { x: 12, y: 4, temperature: 0.6, moisture: 0.7 }, // Woodland
    { x: 8, y: 12, temperature: 0.8, moisture: 0.2 }, // Savanna/Rocky
    { x: 14, y: 14, temperature: 0.3, moisture: 0.9 }, // Valhalla Fjords
    { x: 2, y: 13, temperature: 0.5, moisture: 0.5 }, // Mistlands
  ];

  const biomeGrid = generateVoronoiBiomeGrid2D(GRID_COLS, GRID_ROWS, seeds);

  const islands: IslandEntity[] = [];
  let islandCount = 0;

  // Pick deterministic island locations from seeds & dense biome spots
  const candidateSpots = [
    { gx: 3, gy: 3, name: "Kattegat Shore", rune: true },
    { gx: 12, gy: 4, name: "Ironcrag Isle", rune: true },
    { gx: 8, gy: 12, name: "Fjord of Runes", rune: true },
    { gx: 4, gy: 9, name: "Whispering Holm", rune: false },
    { gx: 11, gy: 11, name: "Gull Rock", rune: false },
    { gx: 7, gy: 4, name: "Raven Shoal", rune: false },
  ];

  for (const spot of candidateSpots) {
    islandCount++;
    const biome = biomeGrid[spot.gy]?.[spot.gx] ?? "forest";
    islands.push({
      id: `island-${islandCount}`,
      name: spot.name,
      gridX: spot.gx,
      gridY: spot.gy,
      worldX: spot.gx * WORLD_PIXEL_SCALE,
      worldY: spot.gy * WORLD_PIXEL_SCALE,
      radius: 40,
      biome,
      hasRunestone: spot.rune,
      runestoneClaimed: false,
      woodSupply: 40 + (islandCount * 10),
      ironSupply: spot.rune ? 25 : 10,
    });
  }

  // Sea Monsters guarding the straits
  const monsters: SeaMonster[] = [
    {
      id: "serpent-1",
      type: "serpent",
      worldX: 350,
      worldY: 250,
      hp: 60,
      maxHp: 60,
      attackTimer: 0,
      isAggro: false,
    },
    {
      id: "serpent-2",
      type: "serpent",
      worldX: 550,
      worldY: 650,
      hp: 75,
      maxHp: 75,
      attackTimer: 0,
      isAggro: false,
    },
    {
      id: "kraken-1",
      type: "kraken",
      worldX: 700,
      worldY: 350,
      hp: 120,
      maxHp: 120,
      attackTimer: 0,
      isAggro: false,
    },
  ];

  const bifrost = {
    worldX: 14 * WORLD_PIXEL_SCALE,
    worldY: 14 * WORLD_PIXEL_SCALE,
    isActive: false,
  };

  return { islands, monsters, bifrost };
}

export function initializeVikingLongship(): VikingLongshipState {
  const world = createVikingLongshipWorld();

  return {
    shipX: 100,
    shipY: 100,
    speed: 0,
    headingRad: Math.PI / 2, // Heading East
    sailTrimRad: 0, // Aligned with center
    oarsEngaged: false,
    isAnchored: false,

    hullHp: 100,
    maxHullHp: 100,
    foodSupplies: 80,
    crewCount: 8,

    wood: 15,
    iron: 5,
    runestonesFound: 0,
    requiredRunestones: 3,

    windAngleRad: Math.PI * 0.4, // Gentle southeasterly wind
    windSpeed: 14, // knots
    weatherTime: 0,
    gameTimeSec: 0,

    worldWidth: GRID_COLS * WORLD_PIXEL_SCALE,
    worldHeight: GRID_ROWS * WORLD_PIXEL_SCALE,
    islands: world.islands,
    monsters: world.monsters,
    projectiles: [],

    bifrostPortal: world.bifrost,
    status: "sailing",
    activeLog: "Longship set sail into the North Sea. Seek the 3 ancient Runestones!",
  };
}

export function stepVikingLongship(
  state: VikingLongshipState,
  dt: number,
  input: {
    rudder: -1 | 0 | 1; // Left, neutral, Right
    trimDelta: number;
    toggleOars?: boolean;
    fireHarpoon?: boolean;
    toggleAnchor?: boolean;
    interactIsland?: boolean;
    repairShip?: boolean;
  }
): VikingLongshipState {
  if (state.status === "victory" || state.status === "shipwrecked") {
    return state;
  }

  let nextState: VikingLongshipState = {
    ...state,
    gameTimeSec: state.gameTimeSec + dt,
    weatherTime: state.weatherTime + dt,
    projectiles: [...state.projectiles],
    monsters: state.monsters.map((m) => ({ ...m })),
    islands: state.islands.map((isl) => ({ ...isl })),
    bifrostPortal: { ...state.bifrostPortal },
  };

  // 1. Weather & Wind Dynamics
  if (nextState.weatherTime > 25) {
    // Wind slowly shifts every 25 seconds
    const windShift = (Math.sin(nextState.gameTimeSec * 0.1) * 0.5);
    nextState.windAngleRad = (nextState.windAngleRad + windShift + Math.PI * 2) % (Math.PI * 2);
    nextState.windSpeed = 10 + Math.floor(Math.abs(Math.sin(nextState.gameTimeSec * 0.05)) * 12);
    nextState.weatherTime = 0;
  }

  // 2. Input Handling: Anchor & Oars
  if (input.toggleAnchor) {
    nextState.isAnchored = !nextState.isAnchored;
    nextState.status = nextState.isAnchored ? "anchored" : "sailing";
    nextState.activeLog = nextState.isAnchored ? "Anchor dropped into seabed." : "Anchor weighed! Ship underway.";
  }

  if (input.toggleOars && !nextState.isAnchored) {
    nextState.oarsEngaged = !nextState.oarsEngaged;
  }

  // Rudder steering
  const turnRate = nextState.isAnchored ? 0 : 1.2 * dt;
  if (input.rudder === -1) {
    nextState.headingRad = (nextState.headingRad - turnRate + Math.PI * 2) % (Math.PI * 2);
  } else if (input.rudder === 1) {
    nextState.headingRad = (nextState.headingRad + turnRate) % (Math.PI * 2);
  }

  // Sail trim adjustment (clamped between -Math.PI/3 and Math.PI/3)
  nextState.sailTrimRad = Math.max(
    -Math.PI / 3,
    Math.min(Math.PI / 3, nextState.sailTrimRad + input.trimDelta * dt)
  );

  // 3. Aerodynamics & Sailing Physics
  if (!nextState.isAnchored) {
    const sailAero = computeSailThrustEfficiency(
      nextState.windAngleRad,
      nextState.headingRad,
      nextState.sailTrimRad
    );

    // Thrust calculation: wind speed * aero efficiency + oar power
    const oarThrust = nextState.oarsEngaged ? 2.5 : 0;
    const baseThrust = (nextState.windSpeed * 0.15) * sailAero.thrustMultiplier + oarThrust;
    
    // Smooth acceleration and drag
    const maxSpeed = 8.0;
    const targetSpeed = Math.min(maxSpeed, baseThrust);
    nextState.speed += (targetSpeed - nextState.speed) * 0.8 * dt;

    // Move Ship (0 = North: dx = sin(heading), dy = -cos(heading))
    nextState.shipX += Math.sin(nextState.headingRad) * nextState.speed * 20 * dt;
    nextState.shipY -= Math.cos(nextState.headingRad) * nextState.speed * 20 * dt;

    // World bounds clamping
    nextState.shipX = Math.max(20, Math.min(nextState.worldWidth - 20, nextState.shipX));
    nextState.shipY = Math.max(20, Math.min(nextState.worldHeight - 20, nextState.shipY));

    // Food consumption by rowing crew
    const foodBurnRate = (nextState.oarsEngaged ? 0.8 : 0.2) * (nextState.crewCount / 8);
    nextState.foodSupplies = Math.max(0, nextState.foodSupplies - foodBurnRate * dt);

    if (nextState.foodSupplies <= 0 && nextState.crewCount > 3 && Math.random() < 0.05 * dt) {
      nextState.crewCount -= 1;
      nextState.activeLog = "Starvation strikes! A brave Viking was lost to the cold.";
    }
  } else {
    // Rapid deceleration when anchored
    nextState.speed = Math.max(0, nextState.speed - 5.0 * dt);
  }

  // 4. Island Proximity & Interactions
  let nearIsland: IslandEntity | null = null;
  for (const isl of nextState.islands) {
    const dx = isl.worldX - nextState.shipX;
    const dy = isl.worldY - nextState.shipY;
    const dist = Math.hypot(dx, dy);
    if (dist < isl.radius + 25) {
      nearIsland = isl;
      break;
    }
  }

  if (nearIsland && input.interactIsland) {
    if (nearIsland.hasRunestone && !nearIsland.runestoneClaimed) {
      nearIsland.runestoneClaimed = true;
      nextState.runestonesFound += 1;
      nextState.activeLog = `Ancient Runestone activated on ${nearIsland.name}! (${nextState.runestonesFound}/${nextState.requiredRunestones})`;

      if (nextState.runestonesFound >= nextState.requiredRunestones) {
        nextState.bifrostPortal.isActive = true;
        nextState.activeLog = "The Bifrost Gateway to Valhalla has opened in the Southeastern Fjords!";
      }
    } else if (nearIsland.woodSupply > 0 || nearIsland.ironSupply > 0) {
      const woodGathered = Math.min(15, nearIsland.woodSupply);
      const ironGathered = Math.min(5, nearIsland.ironSupply);
      nearIsland.woodSupply -= woodGathered;
      nearIsland.ironSupply -= ironGathered;
      nextState.wood += woodGathered;
      nextState.iron += ironGathered;
      nextState.foodSupplies = Math.min(100, nextState.foodSupplies + 20);
      nextState.activeLog = `Foraged berries & mined timber (+${woodGathered}) and iron (+${ironGathered}) on ${nearIsland.name}.`;
    }
  }

  // Ship Repair on command
  if (input.repairShip && nextState.wood >= 10 && nextState.hullHp < nextState.maxHullHp) {
    nextState.wood -= 10;
    nextState.hullHp = Math.min(nextState.maxHullHp, nextState.hullHp + 30);
    nextState.activeLog = "Shipwrights repaired hull planks with timber (+30 Hull).";
  }

  // 5. Harpoon Projectiles & Combat
  if (input.fireHarpoon) {
    const pSpeed = 180;
    // Aim towards nearest aggro monster if in range, otherwise fire ahead
    const targetMonster = nextState.monsters.find(
      (m) => m.hp > 0 && Math.hypot(m.worldX - nextState.shipX, m.worldY - nextState.shipY) < 220
    );

    let pVelX: number;
    let pVelY: number;

    if (targetMonster) {
      const aimAngle = Math.atan2(targetMonster.worldY - nextState.shipY, targetMonster.worldX - nextState.shipX);
      pVelX = Math.cos(aimAngle) * pSpeed;
      pVelY = Math.sin(aimAngle) * pSpeed;
    } else {
      pVelX = Math.sin(nextState.headingRad) * pSpeed;
      pVelY = -Math.cos(nextState.headingRad) * pSpeed;
    }

    nextState.projectiles.push({
      id: `harpoon-${Date.now()}-${Math.random()}`,
      worldX: nextState.shipX,
      worldY: nextState.shipY,
      velX: pVelX,
      velY: pVelY,
      rangeRemaining: 250,
      damage: 40,
    });
    nextState.activeLog = "Iron harpoon hurled at the sea threat!";
  }

  // Step Projectiles
  const nextProjectiles: HarpoonProjectile[] = [];
  for (const proj of nextState.projectiles) {
    const stepDist = Math.hypot(proj.velX, proj.velY) * dt;
    proj.worldX += proj.velX * dt;
    proj.worldY += proj.velY * dt;
    proj.rangeRemaining -= stepDist;

    let hitMonster = false;
    for (const m of nextState.monsters) {
      if (m.hp <= 0) continue;
      const mDist = Math.hypot(m.worldX - proj.worldX, m.worldY - proj.worldY);
      if (mDist < 30) {
        m.hp -= proj.damage;
        m.isAggro = true;
        m.attackTimer = -1.5; // Stunned for 1.5s on harpoon hit
        // Knockback away from projectile velocity
        m.worldX += (proj.velX / 160) * 35;
        m.worldY += (proj.velY / 160) * 35;
        hitMonster = true;
        if (m.hp <= 0) {
          nextState.foodSupplies = Math.min(100, nextState.foodSupplies + 40);
          nextState.wood += 10;
          nextState.activeLog = `Felled the sea beast! Carved meat replenished food supplies and salvaged flotsam (+10 wood).`;
        }
        break;
      }
    }

    if (!hitMonster && proj.rangeRemaining > 0) {
      nextProjectiles.push(proj);
    }
  }
  nextState.projectiles = nextProjectiles;

  // 6. Monster AI & Attacks
  for (const m of nextState.monsters) {
    if (m.hp <= 0) continue;
    const distToShip = Math.hypot(m.worldX - nextState.shipX, m.worldY - nextState.shipY);
    
    // Aggro if close or damaged
    if (distToShip < 130) {
      m.isAggro = true;
    }

    if (m.isAggro) {
      // Monster chases ship
      const angle = Math.atan2(nextState.shipY - m.worldY, nextState.shipX - m.worldX);
      const mSpeed = m.type === "kraken" ? 22 : 30;
      m.worldX += Math.cos(angle) * mSpeed * dt;
      m.worldY += Math.sin(angle) * mSpeed * dt;

      // Attack if in contact
      if (distToShip < 35) {
        m.attackTimer += dt;
        if (m.attackTimer >= 2.0) {
          m.attackTimer = 0;
          const damage = m.type === "kraken" ? 18 : 10;
          nextState.hullHp -= damage;
          nextState.activeLog = `Monster struck the longship hull! (-${damage} HP)`;
        }
      }
    }
  }

  // 7. Check Victory & Shipwreck Conditions
  if (nextState.hullHp <= 0 || nextState.crewCount <= 0) {
    nextState.status = "shipwrecked";
    nextState.activeLog = "The longship was claimed by the cold depths of the sea. All hands lost.";
  } else if (nextState.bifrostPortal.isActive) {
    const distToPortal = Math.hypot(
      nextState.bifrostPortal.worldX - nextState.shipX,
      nextState.bifrostPortal.worldY - nextState.shipY
    );
    if (distToPortal < 50) {
      nextState.status = "victory";
      nextState.activeLog = "The Drakkar sailed into the Bifrost! Welcome to Valhalla, O Chieftain!";
    }
  }

  return nextState;
}

export function runVikingMonteCarloSimulation(trials = 50): {
  survivedTrials: number;
  averageRunestones: number;
  averageTimeSec: number;
} {
  let survived = 0;
  let totalRunes = 0;
  let totalTime = 0;

  for (let i = 0; i < trials; i++) {
    let sim = initializeVikingLongship();
    let simTime = 0;
    const dt = 0.5;

    while (sim.status === "sailing" && simTime < 180) {
      simTime += dt;

      // Simple AI pilot: steer towards nearest target (unclaimed rune or foraging)
      const targetRune = sim.islands.find((isl) => isl.hasRunestone && !isl.runestoneClaimed) ?? sim.islands[0];
      let rudder: -1 | 0 | 1 = 0;
      let interact = false;
      let fireHarpoon = false;

      if (targetRune) {
        const dx = targetRune.worldX - sim.shipX;
        const dy = targetRune.worldY - sim.shipY;
        const desiredHeading = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
        
        let diff = desiredHeading - sim.headingRad;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (diff > 0.1) rudder = 1;
        else if (diff < -0.1) rudder = -1;

        const dist = Math.hypot(dx, dy);
        if (dist < targetRune.radius + 30) {
          interact = true;
        }
      }

      // Check nearby aggressive monsters to defend
      const nearMonster = sim.monsters.find(
        (m) => m.hp > 0 && Math.hypot(m.worldX - sim.shipX, m.worldY - sim.shipY) < 180
      );
      if (nearMonster) {
        fireHarpoon = true;
      }

      // Engage oars if speed is stalled or in combat
      const needOars = (sim.speed < 1.5 && !sim.oarsEngaged) || (nearMonster !== undefined && !sim.oarsEngaged);

      sim = stepVikingLongship(sim, dt, {
        rudder,
        trimDelta: 0,
        toggleOars: needOars,
        fireHarpoon,
        interactIsland: interact,
        repairShip: sim.hullHp < 80 && sim.wood >= 10,
      });

      if (sim.status === "victory") break;
    }

    if (sim.status !== "shipwrecked") {
      survived++;
    }
    totalRunes += sim.runestonesFound;
    totalTime += simTime;
  }

  return {
    survivedTrials: survived,
    averageRunestones: Number((totalRunes / trials).toFixed(2)),
    averageTimeSec: Number((totalTime / trials).toFixed(1)),
  };
}
