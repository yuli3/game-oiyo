// Cozy Peak Glider (#143) — Multi-elevation Hawk Peak island trail with Golden Feathers
// stamina, vertical rock climbing, thermal updraft rings, and directional gliding physics.
// WHY: Inspired by A Short Hike's joyful vertical exploration and feather stamina loop.

export type LandmarkType =
  | 'beach-camp'
  | 'feather-chest'
  | 'thermal-updraft'
  | 'cliff-wall'
  | 'lookout-camp'
  | 'hawk-summit';

export interface IslandNode {
  id: string;
  nameKo: string;
  nameEn: string;
  elevation: number; // 0 (Beach) .. 5 (Hawk Peak Summit)
  x: number;
  y: number;
  type: LandmarkType;
  featherCostToClimb: number;
  featherReward: number;
  shellsReward: number;
  connectedTo: string[];
  glideTargets: string[];
}

export interface CozyGliderState {
  status: 'exploring' | 'summit-reached';
  currentNodeId: string;
  elevation: number;
  maxFeathers: number;
  activeFeathers: number;
  shellsCollected: number;
  visitedNodeIds: string[];
  claimedChestIds: string[];
  stepsTaken: number;
  logKo: string;
  logEn: string;
}

export const ISLAND_TRAIL_NODES: IslandNode[] = [
  {
    id: 'beach-start',
    nameKo: '조개껍질 해변 캠프 (0m)',
    nameEn: 'Seashell Beach Camp (0m)',
    elevation: 0,
    x: 90,
    y: 300,
    type: 'beach-camp',
    featherCostToClimb: 0,
    featherReward: 0,
    shellsReward: 2,
    connectedTo: ['pine-trail', 'coastal-chest'],
    glideTargets: [],
  },
  {
    id: 'coastal-chest',
    nameKo: '등대 바위 보물상자 (100m)',
    nameEn: 'Lighthouse Rock Chest (100m)',
    elevation: 1,
    x: 210,
    y: 265,
    type: 'feather-chest',
    featherCostToClimb: 1,
    featherReward: 1,
    shellsReward: 5,
    connectedTo: ['beach-start', 'pine-trail', 'canyon-updraft'],
    glideTargets: ['beach-start'],
  },
  {
    id: 'pine-trail',
    nameKo: '솔방울 숲 오솔길 (150m)',
    nameEn: 'Pinecone Forest Trail (150m)',
    elevation: 1,
    x: 230,
    y: 195,
    type: 'lookout-camp',
    featherCostToClimb: 1,
    featherReward: 1,
    shellsReward: 3,
    connectedTo: ['beach-start', 'coastal-chest', 'granite-cliff', 'canyon-updraft'],
    glideTargets: ['beach-start'],
  },
  {
    id: 'canyon-updraft',
    nameKo: '협곡 상승기류 링 (250m)',
    nameEn: 'Canyon Thermal Updraft (250m)',
    elevation: 2,
    x: 370,
    y: 235,
    type: 'thermal-updraft',
    featherCostToClimb: 1,
    featherReward: 1,
    shellsReward: 4,
    connectedTo: ['coastal-chest', 'pine-trail', 'ridge-camp', 'amber-shrine'],
    glideTargets: ['coastal-chest', 'beach-start'],
  },
  {
    id: 'granite-cliff',
    nameKo: '화강암 절벽 암벽등반 (320m)',
    nameEn: 'Granite Cliff Wall (320m)',
    elevation: 3,
    x: 360,
    y: 135,
    type: 'cliff-wall',
    featherCostToClimb: 2,
    featherReward: 1,
    shellsReward: 6,
    connectedTo: ['pine-trail', 'ridge-camp'],
    glideTargets: ['pine-trail', 'canyon-updraft'],
  },
  {
    id: 'amber-shrine',
    nameKo: '단풍나무 황금깃털 성소 (300m)',
    nameEn: 'Autumn Feather Shrine (300m)',
    elevation: 3,
    x: 500,
    y: 255,
    type: 'feather-chest',
    featherCostToClimb: 1,
    featherReward: 2,
    shellsReward: 8,
    connectedTo: ['canyon-updraft', 'ridge-camp'],
    glideTargets: ['canyon-updraft', 'coastal-chest'],
  },
  {
    id: 'ridge-camp',
    nameKo: '만년설 능선 모닥불 (420m)',
    nameEn: 'Snowline Ridge Campfire (420m)',
    elevation: 4,
    x: 520,
    y: 140,
    type: 'lookout-camp',
    featherCostToClimb: 2,
    featherReward: 1,
    shellsReward: 5,
    connectedTo: ['canyon-updraft', 'granite-cliff', 'amber-shrine', 'hawk-peak'],
    glideTargets: ['amber-shrine', 'canyon-updraft', 'pine-trail'],
  },
  {
    id: 'hawk-peak',
    nameKo: '호크 피크 정상 전망대 (550m)',
    nameEn: 'Hawk Peak Summit (550m)',
    elevation: 5,
    x: 665,
    y: 68,
    type: 'hawk-summit',
    featherCostToClimb: 3,
    featherReward: 2,
    shellsReward: 20,
    connectedTo: ['ridge-camp'],
    glideTargets: ['ridge-camp', 'amber-shrine', 'canyon-updraft', 'beach-start'],
  },
];

export function getNodeById(id: string): IslandNode {
  return (
    ISLAND_TRAIL_NODES.find((n) => n.id === id) ?? ISLAND_TRAIL_NODES[0]
  );
}

export function createCozyGliderState(): CozyGliderState {
  return {
    status: 'exploring',
    currentNodeId: 'beach-start',
    elevation: 0,
    maxFeathers: 2,
    activeFeathers: 2,
    shellsCollected: 2,
    visitedNodeIds: ['beach-start'],
    claimedChestIds: [],
    stepsTaken: 0,
    logKo: '🪶 황금 깃털(2개)을 품고 해변 캠프에서 출발합니다! 보물상자와 성소를 들러 깃털을 모으며 호크 피크 정상(550m)에 오르세요.',
    logEn: '🪶 Starting at Seashell Beach with 2 Golden Feathers! Collect more feathers along the trail to climb Hawk Peak Summit (550m).',
  };
}

export function moveOrGlideToNode(
  state: CozyGliderState,
  targetNodeId: string
): CozyGliderState {
  const current = getNodeById(state.currentNodeId);
  const target = getNodeById(targetNodeId);
  if (current.id === target.id) return state;

  const isConnected = current.connectedTo.includes(target.id);
  const isGlideTarget = current.glideTargets.includes(target.id);
  if (!isConnected && !isGlideTarget) return state;

  const climbingUp = target.elevation > current.elevation;

  // Check Golden Feather stamina requirement when climbing higher elevation
  if (climbingUp && state.activeFeathers < target.featherCostToClimb) {
    return {
      ...state,
      logKo: `⚠️ [${target.nameKo}] 등반에는 황금 깃털 ${target.featherCostToClimb}개가 필요합니다! (현재 활성 깃털: ${state.activeFeathers}개 — 휴식하거나 성소에서 깃털을 먼저 모으세요)`,
      logEn: `⚠️ Climbing to [${target.nameEn}] requires ${target.featherCostToClimb} Golden Feathers! (Active: ${state.activeFeathers} — Rest at camp or collect more feathers first)`,
    };
  }

  const firstClaim = !state.claimedChestIds.includes(target.id);
  const gainedMaxFeathers = firstClaim ? target.featherReward : 0;
  const gainedShells = firstClaim ? target.shellsReward : 0;
  const nextMaxFeathers = state.maxFeathers + gainedMaxFeathers;

  let nextActiveFeathers = climbingUp
    ? state.activeFeathers - target.featherCostToClimb + gainedMaxFeathers
    : nextMaxFeathers; // Gliding downward or visiting a thermal updraft/camp refreshes stamina!

  if (
    target.type === 'lookout-camp' ||
    target.type === 'beach-camp' ||
    target.type === 'thermal-updraft'
  ) {
    nextActiveFeathers = nextMaxFeathers;
  }

  const nextStatus: CozyGliderState['status'] =
    target.id === 'hawk-peak' ? 'summit-reached' : state.status;

  const actionKo =
    target.elevation < current.elevation
      ? `🪂 활공 비행으로 [${target.nameKo}]에 착륙하여 황금 깃털이 모두 회복되었습니다!`
      : `🧗 [${target.nameKo}] 등반 완료!${
          gainedMaxFeathers > 0 ? ` (🪶 최대 황금 깃털 +${gainedMaxFeathers} 획득!)` : ''
        }`;

  const actionEn =
    target.elevation < current.elevation
      ? `🪂 Glided smoothly down to [${target.nameEn}] and recharged all Golden Feathers!`
      : `🧗 Climbed to [${target.nameEn}]!${
          gainedMaxFeathers > 0 ? ` (🪶 +${gainedMaxFeathers} Max Golden Feather!)` : ''
        }`;

  return {
    ...state,
    status: nextStatus,
    currentNodeId: target.id,
    elevation: target.elevation,
    maxFeathers: nextMaxFeathers,
    activeFeathers: Math.min(nextMaxFeathers, Math.max(0, nextActiveFeathers)),
    shellsCollected: state.shellsCollected + gainedShells,
    visitedNodeIds: state.visitedNodeIds.includes(target.id)
      ? state.visitedNodeIds
      : [...state.visitedNodeIds, target.id],
    claimedChestIds: firstClaim
      ? [...state.claimedChestIds, target.id]
      : state.claimedChestIds,
    stepsTaken: state.stepsTaken + 1,
    logKo:
      nextStatus === 'summit-reached'
        ? '🏆 호크 피크 정상(550m) 등정 성공! 상승기류를 타고 섬 전체로 자유 활공을 즐겨보세요!'
        : actionKo,
    logEn:
      nextStatus === 'summit-reached'
        ? '🏆 Reached Hawk Peak Summit (550m)! Soar on the thermal updrafts across the island!'
        : actionEn,
  };
}

export function restAtCampfire(state: CozyGliderState): CozyGliderState {
  return {
    ...state,
    activeFeathers: state.maxFeathers,
    logKo: `🔥 모닥불과 상승기류에서 날개를 말려 황금 깃털(${state.maxFeathers}개)을 100% 충전했습니다!`,
    logEn: `🔥 Warmed your wings by the campfire—recharged all ${state.maxFeathers} Golden Feathers!`,
  };
}

export function applyGoldenFeatherPackPreset(
  state: CozyGliderState
): CozyGliderState {
  return {
    ...state,
    maxFeathers: 6,
    activeFeathers: 6,
    currentNodeId: 'ridge-camp',
    elevation: 4,
    visitedNodeIds: [
      'beach-start',
      'coastal-chest',
      'pine-trail',
      'canyon-updraft',
      'amber-shrine',
      'ridge-camp',
    ],
    logKo: '⚡ 황금 깃털 6개 풀세트 장착 및 만년설 능선 캠프(420m) 이동 완료! 바로 호크 피크 정상을 클릭해 등정하세요!',
    logEn: '⚡ Equipped 6 Golden Feathers at Snowline Ridge Camp (420m)! Click Hawk Peak Summit to make the final ascent!',
  };
}
