import { createSeededRng, computeAdaptiveFmodMix, type AdaptiveAudioMix } from "./engine-v2";
import { SdfLightField2D } from "./engine-v3-render";
import { evaluatePostProcessVolume } from "./engine-v5";

export type FrostBuildingType =
  | "empty"
  | "bunkhouse"
  | "coal-thumper"
  | "sawmill"
  | "infirmary"
  | "beacon";

export type FrostLawId = "soup-rations" | "extended-shift" | "overdrive-couplings";

export interface FrostSlot {
  id: string;
  ring: 1 | 2 | 3 | 4;
  sector: number; // 0..7 radial angle index
  building: FrostBuildingType;
  workers: number;
  heatedTempC: number;
  frozen: boolean;
}

export interface FrostLaw {
  id: FrostLawId;
  enacted: boolean;
  hopeDelta: number;
  discontentDelta: number;
}

export interface FrostpunkRingState {
  seed: number;
  status: "playing" | "won" | "lost";
  day: number;
  maxDays: number;
  hour: number; // 0..23
  ambientTempC: number; // -20 down to -70
  coal: number;
  wood: number;
  steel: number;
  citizens: number;
  sickCitizens: number;
  hope: number; // 0..100
  discontent: number; // 0..100
  generatorOn: boolean;
  generatorLevel: 1 | 2 | 3 | 4;
  overdriveActive: boolean;
  generatorStress: number; // 0..100 (100 = explosion loss)
  selectedSlotId: string | null;
  slots: FrostSlot[];
  laws: Record<FrostLawId, FrostLaw>;
  score: number;
  lastEvent: string;
  fmodMix: AdaptiveAudioMix;
  postProcess: {
    vignette: number;
    chromaticAberration: number;
    bloomIntensity: number;
  };
}

export const BUILDING_COSTS: Record<
  Exclude<FrostBuildingType, "empty">,
  { wood: number; steel: number; maxWorkers: number; insulationC: number }
> = {
  bunkhouse: { wood: 15, steel: 5, maxWorkers: 0, insulationC: 15 },
  "coal-thumper": { wood: 20, steel: 10, maxWorkers: 10, insulationC: 10 },
  sawmill: { wood: 15, steel: 5, maxWorkers: 10, insulationC: 10 },
  infirmary: { wood: 25, steel: 15, maxWorkers: 5, insulationC: 20 },
  beacon: { wood: 30, steel: 25, maxWorkers: 5, insulationC: 15 },
};

const WEATHER_BY_DAY: Record<number, number> = {
  1: -20,
  2: -30,
  3: -40,
  4: -50,
  5: -60,
  6: -70, // The Great Whiteout
};

export function computeSlotTemperatureC(
  ambientTempC: number,
  ring: 1 | 2 | 3 | 4,
  generatorOn: boolean,
  generatorLevel: 1 | 2 | 3 | 4,
  overdriveActive: boolean,
  building: FrostBuildingType
): number {
  let heatBonus = 0;
  if (generatorOn) {
    // Ring 1 always heated; higher generator levels extend strong heat outward
    const reachFactor = Math.max(0, generatorLevel + 1 - ring);
    heatBonus += reachFactor * 14 + (ring <= generatorLevel ? 12 : 0);
    if (overdriveActive) {
      heatBonus += 15;
    }
  }
  const insulation =
    building === "empty" ? 0 : BUILDING_COSTS[building].insulationC;
  return ambientTempC + heatBonus + insulation;
}

export function createInitialFrostpunkRingState(seed = 20261027): FrostpunkRingState {
  const rng = createSeededRng(seed);
  const slots: FrostSlot[] = [];

  const initialBuildings: Array<{ ring: 1 | 2 | 3 | 4; sector: number; building: FrostBuildingType; workers: number }> = [
    { ring: 1, sector: 0, building: "bunkhouse", workers: 0 },
    { ring: 1, sector: 2, building: "bunkhouse", workers: 0 },
    { ring: 1, sector: 4, building: "infirmary", workers: 5 },
    { ring: 2, sector: 1, building: "coal-thumper", workers: 10 },
    { ring: 2, sector: 5, building: "sawmill", workers: 10 },
  ];

  for (const ring of [1, 2, 3, 4] as const) {
    const sectorsInRing = ring === 1 ? 6 : 8;
    for (let sector = 0; sector < sectorsInRing; sector += 1) {
      const preset = initialBuildings.find(
        (b) => b.ring === ring && b.sector === sector
      );
      const building: FrostBuildingType = preset ? preset.building : "empty";
      const workers = preset ? preset.workers : 0;
      const heatedTempC = computeSlotTemperatureC(-20, ring, true, 1, false, building);
      slots.push({
        id: `r${ring}-s${sector}`,
        ring,
        sector,
        building,
        workers,
        heatedTempC,
        frozen: heatedTempC < -25,
      });
    }
  }

  // Touch rng once for deterministic variation
  void rng();

  return {
    seed,
    status: "playing",
    day: 1,
    maxDays: 6,
    hour: 8,
    ambientTempC: -20,
    coal: 180,
    wood: 75,
    steel: 45,
    citizens: 65,
    sickCitizens: 4,
    hope: 68,
    discontent: 18,
    generatorOn: true,
    generatorLevel: 1,
    overdriveActive: false,
    generatorStress: 0,
    selectedSlotId: "r1-s6",
    slots: recalculateAllSlots(slots, -20, true, 1, false),
    laws: {
      "soup-rations": {
        id: "soup-rations",
        enacted: false,
        hopeDelta: -4,
        discontentDelta: 8,
      },
      "extended-shift": {
        id: "extended-shift",
        enacted: false,
        hopeDelta: -5,
        discontentDelta: 12,
      },
      "overdrive-couplings": {
        id: "overdrive-couplings",
        enacted: false,
        hopeDelta: 8,
        discontentDelta: -5,
      },
    },
    score: 0,
    lastEvent: "generator-ignited",
    fmodMix: computeAdaptiveFmodMix(0.15, 0.68),
    postProcess: {
      vignette: 0.25,
      chromaticAberration: 0.05,
      bloomIntensity: 0.35,
    },
  };
}

function recalculateAllSlots(
  slots: FrostSlot[],
  ambientTempC: number,
  generatorOn: boolean,
  generatorLevel: 1 | 2 | 3 | 4,
  overdriveActive: boolean
): FrostSlot[] {
  return slots.map((slot) => {
    const heatedTempC = computeSlotTemperatureC(
      ambientTempC,
      slot.ring,
      generatorOn,
      generatorLevel,
      overdriveActive,
      slot.building
    );
    return {
      ...slot,
      heatedTempC,
      frozen: heatedTempC < -25,
    };
  });
}

export function constructFrostBuilding(
  state: FrostpunkRingState,
  slotId: string,
  building: Exclude<FrostBuildingType, "empty">
): FrostpunkRingState {
  if (state.status !== "playing") return state;
  const target = state.slots.find((s) => s.id === slotId);
  if (!target || target.building !== "empty") return state;

  const cost = BUILDING_COSTS[building];
  if (state.wood < cost.wood || state.steel < cost.steel) return state;

  const nextSlots = state.slots.map((s) =>
    s.id === slotId
      ? {
          ...s,
          building,
          workers: cost.maxWorkers,
        }
      : s
  );

  const updatedSlots = recalculateAllSlots(
    nextSlots,
    state.ambientTempC,
    state.generatorOn,
    state.generatorLevel,
    state.overdriveActive
  );

  return {
    ...state,
    wood: state.wood - cost.wood,
    steel: state.steel - cost.steel,
    hope: Math.min(100, state.hope + (building === "infirmary" || building === "beacon" ? 4 : 2)),
    slots: updatedSlots,
    score: state.score + 120,
    lastEvent: `built-${building}`,
  };
}

export function upgradeSteamGenerator(state: FrostpunkRingState): FrostpunkRingState {
  if (state.status !== "playing" || state.generatorLevel >= 4) return state;
  const woodCost = state.generatorLevel * 30;
  const steelCost = state.generatorLevel * 20;
  if (state.wood < woodCost || state.steel < steelCost) return state;

  const nextLevel = (state.generatorLevel + 1) as 1 | 2 | 3 | 4;
  return {
    ...state,
    wood: state.wood - woodCost,
    steel: state.steel - steelCost,
    generatorLevel: nextLevel,
    hope: Math.min(100, state.hope + 6),
    slots: recalculateAllSlots(
      state.slots,
      state.ambientTempC,
      state.generatorOn,
      nextLevel,
      state.overdriveActive
    ),
    score: state.score + 250,
    lastEvent: `generator-lv${nextLevel}`,
  };
}

export function toggleGeneratorOverdrive(state: FrostpunkRingState): FrostpunkRingState {
  if (state.status !== "playing") return state;
  const nextOverdrive = !state.overdriveActive;
  return {
    ...state,
    overdriveActive: nextOverdrive,
    slots: recalculateAllSlots(
      state.slots,
      state.ambientTempC,
      state.generatorOn,
      state.generatorLevel,
      nextOverdrive
    ),
    lastEvent: nextOverdrive ? "overdrive-engaged" : "overdrive-disengaged",
  };
}

export function enactFrostLaw(
  state: FrostpunkRingState,
  lawId: FrostLawId
): FrostpunkRingState {
  if (state.status !== "playing") return state;
  const law = state.laws[lawId];
  if (!law || law.enacted) return state;

  return {
    ...state,
    hope: Math.max(0, Math.min(100, state.hope + law.hopeDelta)),
    discontent: Math.max(0, Math.min(100, state.discontent + law.discontentDelta)),
    laws: {
      ...state.laws,
      [lawId]: { ...law, enacted: true },
    },
    score: state.score + 150,
    lastEvent: `law-${lawId}`,
  };
}

export function stepFrostpunkHour(
  state: FrostpunkRingState,
  hoursToAdvance = 4
): FrostpunkRingState {
  if (state.status !== "playing") return state;

  let day = state.day;
  let hour = state.hour + hoursToAdvance;
  while (hour >= 24) {
    hour -= 24;
    day += 1;
  }

  const ambientTempC = WEATHER_BY_DAY[Math.min(6, day)] ?? -70;
  const shiftMult = state.laws["extended-shift"].enacted ? 1.35 : 1.0;

  let coalIncome = 0;
  let woodIncome = 0;
  let steelIncome = 0;
  let healCapacity = 0;
  let frozenBunkhouses = 0;

  for (const slot of state.slots) {
    if (slot.building === "coal-thumper") {
      coalIncome += Math.round(9 * hoursToAdvance * shiftMult);
    } else if (slot.building === "sawmill") {
      woodIncome += Math.round(4 * hoursToAdvance * shiftMult);
      steelIncome += Math.round(2 * hoursToAdvance * shiftMult);
    } else if (slot.building === "infirmary") {
      healCapacity += 2;
    } else if (slot.building === "beacon") {
      coalIncome += Math.round(3 * hoursToAdvance);
      steelIncome += Math.round(2 * hoursToAdvance);
    } else if (slot.building === "bunkhouse" && slot.frozen) {
      frozenBunkhouses += 1;
    }
  }

  const coalBurnPerHour = state.generatorOn
    ? state.generatorLevel * 7 + (state.overdriveActive ? 5 : 0)
    : 0;
  const totalCoalBurn = coalBurnPerHour * hoursToAdvance;

  let nextCoal = state.coal + coalIncome - totalCoalBurn;
  let generatorOn = state.generatorOn;
  if (nextCoal <= 0) {
    nextCoal = 0;
    generatorOn = false;
  } else if (!generatorOn && nextCoal >= 30) {
    generatorOn = true;
  }

  const safetyUpgrade = state.laws["overdrive-couplings"].enacted;
  let generatorStress = state.generatorStress;
  if (generatorOn && state.overdriveActive) {
    generatorStress += hoursToAdvance * (safetyUpgrade ? 3.5 : 6.5);
  } else {
    generatorStress = Math.max(0, generatorStress - hoursToAdvance * 4);
  }

  const updatedSlots = recalculateAllSlots(
    state.slots,
    ambientTempC,
    generatorOn,
    state.generatorLevel,
    state.overdriveActive && generatorOn
  );

  const newSick = Math.max(
    0,
    state.sickCitizens + frozenBunkhouses * 2 + (generatorOn ? 0 : 4) - healCapacity
  );
  const soupSave = state.laws["soup-rations"].enacted ? 2 : 0;

  const nextHope = Math.max(
    0,
    Math.min(
      100,
      state.hope +
        (generatorOn ? 1 : -8) +
        soupSave -
        frozenBunkhouses * 2
    )
  );
  const nextDiscontent = Math.max(
    0,
    Math.min(
      100,
      state.discontent +
        (generatorOn ? -1 : 9) +
        frozenBunkhouses * 3 -
        (healCapacity > 0 ? 1 : 0)
    )
  );

  // Compute v5.0 Post-Process Volume & SDF Light Field check
  const sdf = new SdfLightField2D(8, 8);
  sdf.rebuildFromObstacleMask(() => false);
  const centerGlow = sdf.evaluateMultiLightColor(4, 4, [
    {
      x: 4,
      y: 4,
      radius: generatorOn ? state.generatorLevel + 2 : 0.5,
      r: 1.0,
      g: 0.6,
      b: 0.2,
      intensity: generatorOn ? 1.2 : 0.1,
      penumbraHardness: 6,
    },
  ]);

  const coldSeverity = Math.min(1, Math.abs(ambientTempC) / 70);
  // Generator stress reads as "trauma" so overdrive visibly shakes the lens.
  const pp = evaluatePostProcessVolume({
    damageTrauma: generatorStress / 100,
    temperatureCelsius: ambientTempC,
    isTimeFrozen: false,
  });

  let status: FrostpunkRingState["status"] = "playing";
  let lastEvent = "shift-completed";

  if (generatorStress >= 100) {
    status = "lost";
    lastEvent = "generator-exploded";
  } else if (nextHope <= 0 || nextDiscontent >= 100) {
    status = "lost";
    lastEvent = "captain-banished";
  } else if (day > state.maxDays) {
    status = "won";
    lastEvent = "whiteout-survived";
  }

  return {
    ...state,
    status,
    day: Math.min(state.maxDays, day),
    hour,
    ambientTempC,
    coal: nextCoal,
    wood: state.wood + woodIncome,
    steel: state.steel + steelIncome,
    sickCitizens: newSick,
    hope: nextHope,
    discontent: nextDiscontent,
    generatorOn,
    generatorStress: Math.min(100, Math.round(generatorStress)),
    slots: updatedSlots,
    score: state.score + hoursToAdvance * 35 + (status === "won" ? 1500 : 0),
    lastEvent,
    fmodMix: computeAdaptiveFmodMix(
      Math.max(coldSeverity, generatorStress / 100),
      nextHope / 100
    ),
    postProcess: {
      vignette: pp.frostVignetteAlpha,
      chromaticAberration: pp.chromaticAberrationPx,
      bloomIntensity: Number(
        (pp.radialBloomIntensity + (centerGlow.luma > 0.3 ? 0.3 : 0)).toFixed(2)
      ),
    },
  };
}
