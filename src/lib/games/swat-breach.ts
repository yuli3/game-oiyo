/**
 * Tactical SWAT Breach (#135) — CQB Floorplan Waypoint Planning, Flashbang Stun & Raycast Breach Engine
 *
 * Inspired by Door Kickers & Rainbow Six Tactical Planning:
 * - 10x8 building floorplan (floor, wall, door_closed, door_open, cover)
 * - 2 SWAT Operators (Alpha Shield & Bravo Breacher) with customizable waypoint paths
 * - Flashbang deployment at target room coordinates to stun suspects in radius
 * - Bresenham / Raycast Line-of-Sight (LOS) combat & Hostage Rescue verification
 */

export type TileType = "floor" | "wall" | "door_closed" | "door_open" | "cover";

export interface GridPoint {
  x: number;
  y: number;
}

export interface OperatorState {
  id: "alpha" | "bravo";
  callsign: string;
  role: "shield" | "assault";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  angle: number; // radians
  waypoints: GridPoint[];
  flashbangTarget: GridPoint | null;
  flashbangThrown: boolean;
  fireCooldown: number;
}

export interface SuspectState {
  id: string;
  x: number;
  y: number;
  hp: number;
  angle: number;
  stunTimer: number;
  reactionTimer: number;
  neutralized: boolean;
}

export interface HostageState {
  id: string;
  x: number;
  y: number;
  rescued: boolean;
}

export interface SwatMissionSpec {
  id: string;
  missionNum: number;
  title: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  briefing: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  layout: string[]; // 8 rows of 10 chars: '#' wall, '.' floor, 'D' door_closed, 'C' cover
  operators: Array<{
    id: "alpha" | "bravo";
    callsign: string;
    role: "shield" | "assault";
    x: number;
    y: number;
    autoPath: GridPoint[];
    autoFlash: GridPoint;
  }>;
  suspects: Array<{ id: string; x: number; y: number }>;
  hostages: Array<{ id: string; x: number; y: number }>;
}

export interface SwatBreachState {
  missionIndex: number;
  gridW: number;
  gridH: number;
  tiles: TileType[][];
  phase: "planning" | "executing" | "victory" | "failed";
  selectedOpId: "alpha" | "bravo";
  toolMode: "waypoint" | "flashbang";
  operators: OperatorState[];
  suspects: SuspectState[];
  hostages: HostageState[];
  flashbangsRemaining: number;
  activeFlashBursts: Array<{ x: number; y: number; timer: number }>;
  tracerLines: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; timer: number }>;
  elapsedTime: number;
  score: number;
}

export const GRID_W = 10;
export const GRID_H = 8;

export const MISSIONS: SwatMissionSpec[] = [
  {
    id: "amber-sweep",
    missionNum: 1,
    title: {
      ko: "작전 1: 앰버 스위프 (은행 금고 구출)",
      en: "Op 1: Amber Sweep (Bank Vault Rescue)",
      ja: "作戦1：アンバースイープ（銀行金庫救出）",
      zh: "行动 1：琥珀清剿（银行金库营救）",
      fr: "Op 1 : Amber Sweep (Sauvetage Banque)",
      es: "Op 1: Amber Sweep (Rescate Bancario)",
    },
    briefing: {
      ko: "정문과 측면 문('D')을 돌파해 섬광탄으로 무장 용의자 3명을 제압하고 금고 안의 인질 1명을 구출하세요.",
      en: "Breach the main and side doors, stun the 3 armed suspects with flashbangs, and rescue the hostage in the vault.",
      ja: "正面と側面の扉('D')を突破し、閃光弾で武装容疑者3名を制圧して金庫内の人質1名を救出せよ。",
      zh: "突破正门与侧门，投掷闪光弹震慑 3 名武装歹徒，安全解救金库内的 1 名人质。",
      fr: "Enfoncez les portes, neutralisez les 3 suspects avec des grenades flash et sauvez l'otage dans le coffre.",
      es: "Derriba las puertas, aturde a los 3 sospechosos con granadas cegadoras y rescata al rehén de la bóveda.",
    },
    layout: [
      "##########",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "#..###D###",
      "#..D.....#",
      "#..#..C..#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 2,
        autoPath: [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 4, y: 2 },
          { x: 7, y: 2 },
        ],
        autoFlash: { x: 5, y: 2 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 5, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 2 },
      { id: "s2", x: 8, y: 2 },
      { id: "s3", x: 6, y: 5 },
    ],
    hostages: [{ id: "h1", x: 8, y: 6 }],
  },
  {
    id: "night-owl",
    missionNum: 2,
    title: {
      ko: "작전 2: 나이트 아울 (펜트하우스 동시 진입)",
      en: "Op 2: Night Owl (Penthouse Dual Breach)",
      ja: "作戦2：ナイトオウル（ペントハウス突入）",
      zh: "行动 2：夜枭突袭（顶层公寓双路破门）",
      fr: "Op 2 : Night Owl (Assaut Penthouse)",
      es: "Op 2: Night Owl (Asalto al Ático)",
    },
    briefing: {
      ko: "알파·브라보 대원을 상하 복도로 분담 진입시켜 용의자 4명을 소탕하고 인질 2명을 모두 확보하세요.",
      en: "Split Alpha and Bravo across the upper and lower corridors to neutralize 4 suspects and secure 2 hostages.",
      ja: "アルファとブラボーを上下の廊下に分けて突入させ、容疑者4名を制圧し人質2名を救出せよ。",
      zh: "指挥阿尔法与布拉沃分头突入上下走廊，肃清 4 名歹徒并成功营救 2 名人质。",
      fr: "Séparez Alpha et Bravo dans les couloirs haut et bas pour neutraliser 4 suspects et sauver 2 otages.",
      es: "Divide a Alpha y Bravo por los pasillos superior e inferior para neutralizar a 4 sospechosos y rescatar a 2 rehenes.",
    },
    layout: [
      "##########",
      "#..D..C..#",
      "#..#.....#",
      "#..###D###",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 1,
        autoPath: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 5, y: 2 },
          { x: 8, y: 1 },
        ],
        autoFlash: { x: 5, y: 1 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 5, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 1 },
      { id: "s2", x: 7, y: 2 },
      { id: "s3", x: 5, y: 6 },
      { id: "s4", x: 7, y: 5 },
    ],
    hostages: [
      { id: "h1", x: 8, y: 1 },
      { id: "h2", x: 8, y: 6 },
    ],
  },
  {
    id: "citadel-zero",
    missionNum: 3,
    title: {
      ko: "작전 3: 시타델 제로 (대사관 통제실 탈환)",
      en: "Op 3: Citadel Zero (Embassy Command)",
      ja: "作戦3：シタデル・ゼロ（大使館指令室奪還）",
      zh: "行动 3：零号堡垒（大使馆控制室夺还）",
      fr: "Op 3 : Citadel Zero (Ambassade)",
      es: "Op 3: Citadel Zero (Comando de Embajada)",
    },
    briefing: {
      ko: "다중 격실로 이루어진 대사관 통제실을 연속 돌파하여 용의자 5명을 제압하고 인질 2명을 구출하세요!",
      en: "Execute a multi-room tactical sweep through the embassy command center to neutralize 5 suspects and rescue 2 hostages!",
      ja: "複数の部屋に分かれた大使館指令室を連続突破し、武装容疑者5名を制圧して人質2名を救出せよ！",
      zh: "连续突入多层隔间的大使馆控制中心，制服 5 名武装分子并解救全部 2 名人质！",
      fr: "Menez un assaut coordonné à travers le centre de commandement pour neutraliser 5 suspects et sauver 2 otages !",
      es: "¡Ejecuta un barrido táctico por el centro de mando para neutralizar a 5 sospechosos y rescatar a 2 rehenes!",
    },
    layout: [
      "##########",
      "#..D.....#",
      "#..#..C..#",
      "#..###D###",
      "#..#.....#",
      "#..D..C..#",
      "#..#.....#",
      "##########",
    ],
    operators: [
      {
        id: "alpha",
        callsign: "ALPHA-1 (Shield)",
        role: "shield",
        x: 1,
        y: 1,
        autoPath: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 6, y: 1 },
          { x: 8, y: 2 },
        ],
        autoFlash: { x: 5, y: 1 },
      },
      {
        id: "bravo",
        callsign: "BRAVO-2 (Assault)",
        role: "assault",
        x: 1,
        y: 5,
        autoPath: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 6, y: 5 },
          { x: 8, y: 6 },
        ],
        autoFlash: { x: 5, y: 5 },
      },
    ],
    suspects: [
      { id: "s1", x: 5, y: 1 },
      { id: "s2", x: 7, y: 1 },
      { id: "s3", x: 6, y: 2 },
      { id: "s4", x: 5, y: 5 },
      { id: "s5", x: 7, y: 6 },
    ],
    hostages: [
      { id: "h1", x: 8, y: 2 },
      { id: "h2", x: 8, y: 6 },
    ],
  },
];

export function createSwatBreachState(missionIndex = 0): SwatBreachState {
  const safeIdx = Math.max(0, Math.min(MISSIONS.length - 1, missionIndex));
  const spec = MISSIONS[safeIdx];

  const tiles: TileType[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: TileType[] = [];
    const line = spec.layout[y] ?? "##########";
    for (let x = 0; x < GRID_W; x++) {
      const ch = line[x] ?? "#";
      if (ch === "#") row.push("wall");
      else if (ch === "D") row.push("door_closed");
      else if (ch === "C") row.push("cover");
      else row.push("floor");
    }
    tiles.push(row);
  }

  return {
    missionIndex: safeIdx,
    gridW: GRID_W,
    gridH: GRID_H,
    tiles,
    phase: "planning",
    selectedOpId: "alpha",
    toolMode: "waypoint",
    operators: spec.operators.map((op) => ({
      id: op.id,
      callsign: op.callsign,
      role: op.role,
      x: op.x,
      y: op.y,
      hp: op.role === "shield" ? 160 : 120,
      maxHp: op.role === "shield" ? 160 : 120,
      angle: 0,
      waypoints: [...op.autoPath],
      flashbangTarget: { ...op.autoFlash },
      flashbangThrown: false,
      fireCooldown: 0,
    })),
    suspects: spec.suspects.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      hp: 60,
      angle: Math.PI,
      stunTimer: 0,
      reactionTimer: 0.55,
      neutralized: false,
    })),
    hostages: spec.hostages.map((h) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      rescued: false,
    })),
    flashbangsRemaining: 2,
    activeFlashBursts: [],
    tracerLines: [],
    elapsedTime: 0,
    score: 0,
  };
}

export function addWaypointOrFlash(
  state: SwatBreachState,
  gx: number,
  gy: number
): boolean {
  if (state.phase !== "planning") return false;
  if (gx < 0 || gx >= state.gridW || gy < 0 || gy >= state.gridH) return false;
  if (state.tiles[gy][gx] === "wall") return false;

  const op = state.operators.find((o) => o.id === state.selectedOpId);
  if (!op) return false;

  if (state.toolMode === "flashbang") {
    op.flashbangTarget = { x: gx, y: gy };
    return true;
  }

  // Waypoint mode: append tile if different from last
  const last =
    op.waypoints.length > 0
      ? op.waypoints[op.waypoints.length - 1]
      : { x: Math.round(op.x), y: Math.round(op.y) };
  if (last.x === gx && last.y === gy) return false;
  op.waypoints.push({ x: gx, y: gy });
  return true;
}

export function clearOperatorWaypoints(
  state: SwatBreachState,
  opId?: "alpha" | "bravo"
): void {
  if (state.phase !== "planning") return;
  const targetId = opId ?? state.selectedOpId;
  const op = state.operators.find((o) => o.id === targetId);
  if (op) {
    op.waypoints = [];
  }
}

export function applyAutoTacticalPlan(state: SwatBreachState): void {
  if (state.phase !== "planning") return;
  const spec = MISSIONS[state.missionIndex];
  for (const opSpec of spec.operators) {
    const op = state.operators.find((o) => o.id === opSpec.id);
    if (op) {
      op.waypoints = opSpec.autoPath.map((pt) => ({ ...pt }));
      op.flashbangTarget = { ...opSpec.autoFlash };
    }
  }
}

export function startBreachExecution(state: SwatBreachState): void {
  if (state.phase === "planning") {
    state.phase = "executing";
  }
}

export function hasLineOfSight(
  state: SwatBreachState,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.round(x1 + (x2 - x1) * t);
    const ty = Math.round(y1 + (y2 - y1) * t);
    if (tx < 0 || tx >= state.gridW || ty < 0 || ty >= state.gridH) return false;
    const tile = state.tiles[ty][tx];
    if (tile === "wall" || tile === "door_closed") {
      return false;
    }
  }
  return true;
}

export function stepSwatBreach(
  state: SwatBreachState,
  dtSeconds: number
): { shotsFired: number; flashDetonated: boolean; doorBreached: boolean } {
  if (state.phase !== "executing") {
    return { shotsFired: 0, flashDetonated: false, doorBreached: false };
  }

  state.elapsedTime += dtSeconds;
  let shotsFired = 0;
  let flashDetonated = false;
  let doorBreached = false;

  // Decay visual bursts & tracers
  state.activeFlashBursts = state.activeFlashBursts
    .map((b) => ({ ...b, timer: b.timer - dtSeconds }))
    .filter((b) => b.timer > 0);
  state.tracerLines = state.tracerLines
    .map((t) => ({ ...t, timer: t.timer - dtSeconds }))
    .filter((t) => t.timer > 0);

  // Move operators along waypoints & breach doors
  for (const op of state.operators) {
    if (op.hp <= 0) continue;
    op.fireCooldown = Math.max(0, op.fireCooldown - dtSeconds);

    if (op.waypoints.length > 0) {
      const target = op.waypoints[0];
      const dx = target.x - op.x;
      const dy = target.y - op.y;
      const dist = Math.hypot(dx, dy);

      // Check adjacent closed doors and breach them!
      const tx = Math.round(target.x);
      const ty = Math.round(target.y);
      if (
        dist < 1.15 &&
        ty >= 0 &&
        ty < state.gridH &&
        tx >= 0 &&
        tx < state.gridW &&
        state.tiles[ty][tx] === "door_closed"
      ) {
        state.tiles[ty][tx] = "door_open";
        doorBreached = true;

        // Deploy queued flashbang on door breach!
        if (op.flashbangTarget && !op.flashbangThrown) {
          op.flashbangThrown = true;
          const fx = op.flashbangTarget.x;
          const fy = op.flashbangTarget.y;
          state.activeFlashBursts.push({ x: fx, y: fy, timer: 0.65 });
          flashDetonated = true;
          for (const sus of state.suspects) {
            if (!sus.neutralized && Math.hypot(sus.x - fx, sus.y - fy) <= 3.5) {
              sus.stunTimer = 4.5;
            }
          }
        }
      }

      const speed = 2.6;
      if (dist <= speed * dtSeconds) {
        op.x = target.x;
        op.y = target.y;
        op.waypoints.shift();
      } else {
        op.angle = Math.atan2(dy, dx);
        op.x += (dx / dist) * speed * dtSeconds;
        op.y += (dy / dist) * speed * dtSeconds;
      }
    }

    // Rescue nearby hostages
    for (const h of state.hostages) {
      if (!h.rescued && Math.hypot(h.x - op.x, h.y - op.y) <= 1.6) {
        h.rescued = true;
        state.score += 200;
      }
    }

    // Operator engages visible suspects
    if (op.fireCooldown <= 0) {
      for (const sus of state.suspects) {
        if (sus.neutralized) continue;
        if (hasLineOfSight(state, op.x, op.y, sus.x, sus.y)) {
          op.angle = Math.atan2(sus.y - op.y, sus.x - op.x);
          op.fireCooldown = 0.25;
          sus.hp -= 35;
          shotsFired++;
          state.tracerLines.push({
            x1: op.x,
            y1: op.y,
            x2: sus.x,
            y2: sus.y,
            color: "#38bdf8",
            timer: 0.14,
          });
          if (sus.hp <= 0) {
            sus.neutralized = true;
            state.score += 150;
          }
          break;
        }
      }
    }
  }

  // Update suspects
  for (const sus of state.suspects) {
    if (sus.neutralized) continue;
    if (sus.stunTimer > 0) {
      sus.stunTimer = Math.max(0, sus.stunTimer - dtSeconds);
      continue;
    }

    for (const op of state.operators) {
      if (op.hp <= 0) continue;
      if (hasLineOfSight(state, sus.x, sus.y, op.x, op.y)) {
        sus.angle = Math.atan2(op.y - sus.y, op.x - sus.x);
        sus.reactionTimer -= dtSeconds;
        if (sus.reactionTimer <= 0) {
          sus.reactionTimer = 0.65;
          const dmg = op.role === "shield" ? 8 : 16;
          op.hp = Math.max(0, op.hp - dmg);
          shotsFired++;
          state.tracerLines.push({
            x1: sus.x,
            y1: sus.y,
            x2: op.x,
            y2: op.y,
            color: "#ef4444",
            timer: 0.14,
          });
        }
        break;
      }
    }
  }

  // Check victory / failure conditions
  const allSuspectsDown = state.suspects.every((s) => s.neutralized);
  const allOpsDown = state.operators.every((o) => o.hp <= 0);

  if (allSuspectsDown) {
    // Auto-secure all remaining hostages once room is clear
    for (const h of state.hostages) {
      if (!h.rescued) {
        h.rescued = true;
        state.score += 200;
      }
    }
    state.phase = "victory";
  } else if (allOpsDown) {
    state.phase = "failed";
  }

  return { shotsFired, flashDetonated, doorBreached };
}
