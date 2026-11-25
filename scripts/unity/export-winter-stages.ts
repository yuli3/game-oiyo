/**
 * Writes the 30 stages of the winter Unity builds (wave 6 and new-games batches 10 to 15) as C# tables, straight from the web
 * rules in src/lib/games/*.ts, so the Unity and React versions play the very same stages.
 *
 *   npx tsx scripts/unity/export-winter-stages.ts
 *
 * Output: prototypes/<slug>-unity/Assets/<Game>/Runtime/<Game>Stages.cs (generated, do not edit).
 * Run again whenever a stage builder in src/lib/games changes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as jwibul from "../../src/lib/games/jwibul-spin";
import * as snowball from "../../src/lib/games/snowball-fight";
import * as sled from "../../src/lib/games/snow-sled";
import * as neol from "../../src/lib/games/neol-jump";
import * as tuho from "../../src/lib/games/tuho-toss";
import * as sledge from "../../src/lib/games/ice-sledge";
import * as roll from "../../src/lib/games/snow-roll";
import * as jachigi from "../../src/lib/games/jachigi";
import * as ski from "../../src/lib/games/ski-jump";
import * as bokjori from "../../src/lib/games/bokjori-run";
import * as pipe from "../../src/lib/games/snow-halfpipe";
import * as skate from "../../src/lib/games/speed-skate";
import * as yeot from "../../src/lib/games/yeot-stretch";
import * as bia from "../../src/lib/games/biathlon";
import * as climb from "../../src/lib/games/ice-climb";
import * as bob from "../../src/lib/games/bobsleigh";
import * as tug from "../../src/lib/games/tug-of-war";
import * as bridge from "../../src/lib/games/bridge-walk";
import * as saeal from "../../src/lib/games/saealsim-roll";
import * as heat from "../../src/lib/games/sell-the-heat";
import * as aval from "../../src/lib/games/avalanche-rescue";
import * as ogok from "../../src/lib/games/ogokbap-sort";
import * as chest from "../../src/lib/games/chestnut-roast";
import * as icicle from "../../src/lib/games/icicle-knock";
import * as iceroad from "../../src/lib/games/ice-road";
import * as mandu from "../../src/lib/games/mandu-pleat";
import * as kimjang from "../../src/lib/games/kimjang-salt";
import * as hwangtae from "../../src/lib/games/hwangtae-dry";
import * as yongal from "../../src/lib/games/yongal-scoop";
import * as mung from "../../src/lib/games/mungpungji-seal";
import * as charye from "../../src/lib/games/charye-table";
import * as yeontan from "../../src/lib/games/yeontan-relay";
import * as daljip from "../../src/lib/games/daljip-fire";
import * as scarf from "../../src/lib/games/scarf-knit";
import * as ipchun from "../../src/lib/games/ipchun-brush";
import * as crane from "../../src/lib/games/crane-count";
import * as rink from "../../src/lib/games/rink-resurface";
import * as ticket from "../../src/lib/games/holiday-ticket";
import * as manor from "../../src/lib/games/draft-manor";
import * as dispatch from "../../src/lib/games/dispatch-desk";
import * as parry from "../../src/lib/games/parry-duel";
import * as commute from "../../src/lib/games/odd-commute";
import * as sofa from "../../src/lib/games/sofa-carry";
import * as village from "../../src/lib/games/palm-village";
import * as plant from "../../src/lib/games/window-plant";
import * as boom from "../../src/lib/games/number-boom";
import * as crownGame from "../../src/lib/games/crown-regions";
import * as screwGame from "../../src/lib/games/screw-jam";
import * as parkGame from "../../src/lib/games/parking-out";
import * as shopGame from "../../src/lib/games/night-checkout";
import * as toyGame from "../../src/lib/games/toy-box-brawl";
import * as guardGame from "../../src/lib/games/summon-guard";
import * as catsGame from "../../src/lib/games/rooftop-cats";
import * as holeGame from "../../src/lib/games/gulp-hole";
import * as cakeGame from "../../src/lib/games/cake-thief";
import * as blanketGame from "../../src/lib/games/blanket-battle";
import * as duckGame from "../../src/lib/games/duck-parade";
import * as cableGame from "../../src/lib/games/cable-knot";
import * as rollerGame from "../../src/lib/games/roller-claim";
import * as lockGame from "../../src/lib/games/formula-lock";
import * as lanesGame from "../../src/lib/games/veggie-lanes";
import * as bounceGame from "../../src/lib/games/bounce-down";
import * as trayGame from "../../src/lib/games/trio-tray";
import * as corkGame from "../../src/lib/games/cork-spin";
import * as gondolaGame from "../../src/lib/games/gondola-queue";
import * as chopGame from "../../src/lib/games/beaver-chop";
import * as prismGame from "../../src/lib/games/prism-hop";
import * as floodGame from "../../src/lib/games/paint-flood";
import * as hoopGame from "../../src/lib/games/hoop-flick";
import * as summitGame from "../../src/lib/games/summit-cards";
import * as slideGame from "../../src/lib/games/coin-slide";
import * as windowsGame from "../../src/lib/games/sleepy-windows";
import * as juiceGame from "../../src/lib/games/juice-swipe";
import * as dartGame from "../../src/lib/games/dart-drift";
import * as pipGame from "../../src/lib/games/pip-merge";
import * as vacuumGame from "../../src/lib/games/vacuum-dash";
import * as poolGame from "../../src/lib/games/pocket-shot";
import * as jellyGame from "../../src/lib/games/jelly-gates";
import * as upsideGame from "../../src/lib/games/upside-dash";
import * as pinGame from "../../src/lib/games/pin-roll";
import * as pipesGame from "../../src/lib/games/garden-pipes";
import * as volleyGame from "../../src/lib/games/gumball-volley";
import * as boingGame from "../../src/lib/games/boing-up";
import * as snackGame from "../../src/lib/games/snack-swing";
import * as sunMoonGame from "../../src/lib/games/sun-moon";
import * as cartonGame from "../../src/lib/games/carton-flip";
import * as shelfGame from "../../src/lib/games/bakery-shelf";
import * as chalkGame from "../../src/lib/games/chalk-roll";
import * as bobaGame from "../../src/lib/games/boba-pins";

const ROOT = join(import.meta.dirname, "..", "..");
const n = (v: number) => {
  const s = Number(v.toFixed(4)).toString();
  return (s.includes(".") || s.includes("e") ? s : s + ".0").replace("e", "E") + "f";
};
const arr = (xs: number[]) => `new float[] { ${xs.map(n).join(", ")} }`;
const iarr = (xs: number[]) => `new int[] { ${xs.join(", ")} }`;

function write(slug: string, game: string, body: string): void {
  const path = join(ROOT, "prototypes", `${slug}-unity`, "Assets", game, "Runtime", `${game}Stages.cs`);
  const src = `// Generated by scripts/unity/export-winter-stages.ts from src/lib/games/${slug}.ts. Do not edit.\n// The same 30 stages as the web game.\npublic static partial class ${game}Stages\n{\n${body}}\n`;
  writeFileSync(path, src);
  console.log("wrote", path);
}

// Jwibul Spin: tufts (x,y pairs), stacks (x,y,r triples), start, wind, time limit, par
{
  const rows: string[] = [];
  for (let i = 0; i < jwibul.STAGE_COUNT; i++) {
    const l = jwibul.levelFor(i);
    rows.push(`        new Level { tufts = ${arr(l.tufts.flatMap((t) => [t.x, t.y]))}, stacks = ${arr(l.stacks.flatMap((s) => [s.x, s.y, s.r]))}, sx = ${n(l.start.x)}, sy = ${n(l.start.y)}, wind = ${n(l.wind)}, timeLimit = ${n(l.timeLimit)}, par = ${n(l.par)} },`);
  }
  write("jwibul-spin", "JwibulSpin", `    public struct Level { public float[] tufts, stacks; public float sx, sy, wind, timeLimit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Snowball Fight (solo stages): ground per 6px column, the snow blocks as (col,row) runs, kids
{
  const rows: string[] = [];
  for (let i = 0; i < snowball.STAGE_COUNT; i++) {
    const f = snowball.newField(i, 1);
    const sp = snowball.STAGES[i];
    const snow: number[] = [];
    for (let c = 0; c < f.cols; c++) {
      let r = 0;
      while (r < f.rows) {
        if (f.snow[r * f.cols + c]) {
          const r0 = r;
          while (r < f.rows && f.snow[r * f.cols + c]) r++;
          snow.push(c, r0, r - r0);
        } else r++;
      }
    }
    const en = f.enemies.flatMap((e) => [e.x, e.feet, e.hp, e.upTime, e.downTime, e.timer, e.aim]);
    rows.push(`        new Level { wind = ${n(f.wind)}, hearts = ${sp.hearts}, playerFeet = ${n(f.players[0].feet)}, ground = ${iarr(f.ground)}, snow = ${iarr(snow)}, enemies = ${arr(en)} },`);
  }
  write("snowball-fight", "SnowballFight", `    public struct Level { public float wind, playerFeet; public int hearts; public int[] ground, snow; public float[] enemies; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Snow Sled: gates (x,y,half), objects (kind,x,y,w,h), length, par, night, top speed
{
  const kinds = ["tree", "snowman", "pouch", "ice", "ramp"];
  const rows: string[] = [];
  for (const c of sled.COURSES) {
    rows.push(`        new Level { length = ${n(c.length)}, par = ${n(c.par)}, night = ${c.night}, vmax = ${n(c.vmax)}, gates = ${arr(c.gates.flatMap((g) => [g.x, g.y, g.half]))}, objs = ${arr(c.objs.flatMap((o) => [kinds.indexOf(o.kind), o.x, o.y, o.w, o.h]))} },`);
  }
  write("snow-sled", "SnowSled", `    public struct Level { public float length, par, vmax; public bool night; public float[] gates, objs; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Neol Jump: charms (x,h), jumps, landing zone, wind, birds (h,x0,speed), falls
{
  const rows: string[] = [];
  for (const l of neol.LEVELS) {
    rows.push(`        new Level { charms = ${arr(l.charms.flatMap((c) => [c.x, c.h]))}, jumps = ${l.jumps}, zone = ${n(l.zone)}, wind = ${n(l.wind)}, birds = ${arr(l.birds.flatMap((b) => [b.h, b.x0, b.speed]))}, falls = ${l.falls} },`);
  }
  write("neol-jump", "NeolJump", `    public struct Level { public float[] charms, birds; public int jumps, falls; public float zone, wind; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Tuho Toss
{
  const rect = (r: tuho.Rect | null) => (r ? arr([r.x, r.y, r.w, r.h]) : "null");
  const rows: string[] = [];
  for (const l of tuho.LEVELS) {
    rows.push(`        new Level { potX = ${n(l.potX)}, mouthY = ${n(l.mouthY)}, mouthW = ${n(l.mouthW)}, ears = ${l.ears}, arrows = ${l.arrows}, need = ${l.need}, wind = ${n(l.wind)}, screen = ${rect(l.screen)}, beam = ${rect(l.beam)}, slide = ${n(l.slide)}, slideSpeed = ${n(l.slideSpeed)} },`);
  }
  write("tuho-toss", "TuhoToss", `    public struct Level { public float potX, mouthY, mouthW, wind, slide, slideSpeed; public bool ears; public int arrows, need; public float[] screen, beam; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ice Sledge: the stream's shape, hazards (kind,x,d,r), rivals' finishing times, par
{
  const kinds = ["slush", "hole", "straw"];
  const rows: string[] = [];
  for (const l of sledge.LEVELS) {
    rows.push(`        new Level { length = ${n(l.length)}, amp = ${n(l.amp)}, wave = ${n(l.wave)}, phase = ${n(l.phase)}, half = ${n(l.half)}, weave = ${n(l.weave)}, par = ${n(l.par)}, rivals = ${arr(l.rivals)}, hazards = ${arr(l.hazards.flatMap((h) => [kinds.indexOf(h.kind), h.x, h.d, h.r]))} },`);
  }
  write("ice-sledge", "IceSledge", `    public struct Level { public float length, amp, wave, phase, half, weave, par; public float[] rivals, hazards; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Snowball Roll: snow depth per cell as two hex digits (0..255), rocks (x,y,r), fences (x,y,w,h), mud (x,y,r),
// start, spot, body size, head (start x, y, min, max; empty when none), time limit, par
{
  const rows: string[] = [];
  for (let i = 0; i < roll.STAGE_COUNT; i++) {
    const l = roll.levelFor(i);
    const snow = l.snow.map((d) => Math.round(Math.max(0, Math.min(1, d)) * 255).toString(16).padStart(2, "0")).join("");
    const head = l.head ? [l.head.start.x, l.head.start.y, l.head.min, l.head.max] : [];
    rows.push(`        new Level { snow = "${snow}", rocks = ${arr(l.rocks.flatMap((k) => [k.x, k.y, k.r]))}, fences = ${arr(l.fences.flatMap((f) => [f.x, f.y, f.w, f.h]))}, mud = ${arr(l.mud.flatMap((m) => [m.x, m.y, m.r]))}, sx = ${n(l.start.x)}, sy = ${n(l.start.y)}, spotX = ${n(l.spot.x)}, spotY = ${n(l.spot.y)}, body = ${n(l.body)}, head = ${arr(head)}, timeLimit = ${n(l.timeLimit)}, par = ${n(l.par)} },`);
  }
  write("snow-roll", "SnowRoll", `    public struct Level { public string snow; public float[] rocks, fences, mud, head; public float sx, sy, spotX, spotY, body, timeLimit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Jachigi: the mark, fielders, wind, branch (x0,x1,h; empty when none), ditch (-1 when none), the steady hit time
{
  const rows: string[] = [];
  for (const l of jachigi.LEVELS) {
    const br = l.branch ? [l.branch.x0, l.branch.x1, l.branch.h] : [];
    rows.push(`        new Level { goal = ${n(l.goal)}, fielders = ${arr(l.fielders)}, wind = ${n(l.wind)}, branch = ${arr(br)}, ditch = ${n(l.ditch ?? -1)}, bestT = ${n(l.bestT)} },`);
  }
  write("jachigi", "Jachigi", `    public struct Level { public float goal, wind, ditch, bestT; public float[] fielders, branch; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ski Jump: K-point, in-run length, in-run speed, wind, gusts (deg/s per half second), mark, par
{
  const rows = ski.HILLS.map((h) => `        new Level { k = ${n(h.k)}, inrun = ${n(h.inrun)}, gateSpeed = ${n(h.gateSpeed)}, wind = ${n(h.wind)}, gusts = ${arr(h.gusts)}, goal = ${n(h.goal)}, par = ${n(h.par)} },`);
  write("ski-jump", "SkiJump", `    public struct Level { public float k, inrun, gateSpeed, wind, goal, par; public float[] gusts; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Bokjori Run: run speed, houses (wall x, front depth, wall height, yard, house height, wants 0/1), dogs, length, strainers, need
{
  const rows: string[] = [];
  for (let i = 0; i < bokjori.STAGE_COUNT; i++) {
    const l = bokjori.levelFor(i);
    rows.push(`        new Level { speed = ${n(l.speed)}, houses = ${arr(l.houses.flatMap((h) => [h.wall, h.front, h.wallH, h.yard, h.houseH, h.wants ? 1 : 0]))}, dogs = ${arr(l.dogs)}, length = ${n(l.length)}, strainers = ${l.strainers}, need = ${l.need} },`);
  }
  write("bokjori-run", "BokjoriRun", `    public struct Level { public float speed, length; public float[] houses, dogs; public int strainers, need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Snow Halfpipe: half-width, wall depth, friction, pump, airs per run, mark
{
  const rows = pipe.PIPES.map((p) => `        new Level { half = ${n(p.half)}, depth = ${n(p.depth)}, friction = ${n(p.friction)}, pump = ${n(p.pump)}, hits = ${p.hits}, goal = ${n(p.goal)}, par = ${n(p.par)} },`);
  write("snow-halfpipe", "SnowHalfpipe", `    public struct Level { public float half, depth, friction, pump, goal, par; public int hits; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Speed Skate: race length (m), stroke cadence and window (s), rival time, perfect time
{
  const rows = skate.RACES.map((r) => `        new Level { length = ${n(r.length)}, cadence = ${n(r.cadence)}, window = ${n(r.window)}, goal = ${n(r.goal)}, par = ${n(r.par)} },`);
  write("speed-skate", "SpeedSkate", `    public struct Level { public float length, cadence, window, goal, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Yeot Stretch: snap rate of warm taffy (1/s), cooling time (s), folds to make, a perfect puller's folds
{
  const rows = yeot.YEOT_STAGES.map((st) => `        new Level { rate = ${n(st.rate)}, cool = ${n(st.cool)}, need = ${st.need}, par = ${st.par} },`);
  write("yeot-stretch", "YeotStretch", `    public struct Level { public float rate, cool; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Biathlon: ski legs, leg length (m), target radius (px), rival time, perfect time, tremor seed
{
  const rows = bia.BIATHLON_STAGES.map((st) => `        new Level { legs = ${st.legs}, leg = ${n(st.leg)}, radius = ${n(st.radius)}, goal = ${n(st.goal)}, par = ${n(st.par)}, seed = ${st.seed}u },`);
  write("biathlon", "Biathlon", `    public struct Level { public int legs; public float leg, radius, goal, par; public uint seed; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ice Climb: meter rise time (s), band narrowing, the ice on each step (0 thin, 1 firm, 2 hard), time limit
{
  const rows = climb.CLIMB_STAGES.map((st) => `        new Level { rise = ${n(st.rise)}, narrow = ${n(st.narrow)}, wall = ${iarr(st.wall)}, limit = ${n(st.limit)}, par = ${n(st.par)} },`);
  write("ice-climb", "IceClimb", `    public struct Level { public float rise, narrow, limit, par; public int[] wall; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Bobsleigh: length (m), bends (centre m, half-length m, tightness), flip margin, rival time
{
  const rows = bob.BOB_TRACKS.map((t) => `        new Level { length = ${n(t.length)}, bends = ${arr(t.bends.flatMap((b) => [b.at, b.half, b.k * 900]))}, flip = ${n(t.flip)}, goal = ${n(t.goal)}, par = ${n(t.par)} },`);
  write("bobsleigh", "Bobsleigh", `    // bends: (centre, half-length, peak line at 30 m/s) triples; tightness = peak / 900\n    public struct Level { public float length, flip, goal, par; public float[] bends; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Tug of War: their slack and heave forces, heaves (start s, length s), time limit
{
  const rows = tug.TUG_STAGES.map((st) => {
    const waves = st.waves.filter((w) => w.start < st.limit + 2);
    return `        new Level { slackF = ${n(st.slackF)}, heaveF = ${n(st.heaveF)}, waves = ${arr(waves.flatMap((w) => [w.start, w.heave]))}, limit = ${n(st.limit)}, par = ${n(st.par)} },`;
  });
  write("tug-of-war", "TugOfWar", `    public struct Level { public float slackF, heaveF, limit, par; public float[] waves; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Bridge Walk: length (m), tip rates on planks and ice, gusts (start s, length s, push), icy stretches (from m, to m)
{
  const rows = bridge.BRIDGE_STAGES.map((st) => `        new Level { length = ${n(st.length)}, gravity = ${n(st.gravity)}, iceGravity = ${n(st.iceGravity)}, gusts = ${arr(st.gusts.flatMap((g) => [g.at, g.len, g.push]))}, ice = ${arr(st.ice.flatMap((i) => [i.from, i.to]))} },`);
  write("bridge-walk", "BridgeWalk", `    public struct Level { public float length, gravity, iceGravity; public float[] gusts, ice; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Saealsim Roll: the pace band (turns per second), balls to roll, time limit
{
  const rows = saeal.SAEALSIM_STAGES.map((st) => `        new Level { lo = ${n(st.lo)}, hi = ${n(st.hi)}, need = ${st.need}, limit = ${n(st.limit)}, par = ${n(st.par)} },`);
  write("saealsim-roll", "SaealsimRoll", `    public struct Level { public float lo, hi, limit, par; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Sell the Heat: turns (window, start s, real 0/1, hand-up s, call s), morning length, mark
{
  const rows = heat.HEAT_STAGES.map((st) => `        new Level { turns = ${arr(st.turns.flatMap((t) => [t.win, t.at, t.real ? 1 : 0, t.tell, t.call]))}, length = ${n(st.length)}, need = ${st.need} },`);
  write("sell-the-heat", "SellTheHeat", `    // turns: (window, start, real, hand-up after, call after) quintuples\n    public struct Level { public float length; public float[] turns; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Avalanche Rescue: field (m), start, burials (x, y, depth), arrow wobble, air time, wobble seed
{
  const rows = aval.RESCUE_STAGES.map((st) => `        new Level { w = ${n(st.w)}, h = ${n(st.h)}, startX = ${n(st.start.x)}, startY = ${n(st.start.y)}, buried = ${arr(st.buried.flatMap((b) => [b.x, b.y, b.depth]))}, noise = ${n(st.noise)}, limit = ${n(st.limit)}, seed = ${st.seed}u },`);
  write("avalanche-rescue", "AvalancheRescue", `    public struct Level { public float w, h, startX, startY, noise, limit; public float[] buried; public uint seed; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ogokbap Sort: bowl order (grain kind per bowl), grains (kind, x, pour time, speed), mark
{
  const rows = ogok.OGOK_STAGES.map((st) => `        new Level { order = ${iarr(st.order)}, grains = ${arr(st.grains.flatMap((g) => [g.kind, g.x, g.at, g.speed]))}, need = ${st.need} },`);
  write("ogokbap-sort", "OgokbapSort", `    public struct Level { public int[] order; public float[] grains; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Chestnut Roast: roasting speed, top of the golden window, arrivals (time, rim angle), mark
{
  const rows = chest.CHESTNUT_STAGES.map((st) => `        new Level { cook = ${n(st.cook)}, goldHi = ${n(st.goldHi)}, arrivals = ${arr(st.arrivals.flatMap((a) => [a.at, a.angle]))}, need = ${st.need} },`);
  write("chestnut-roast", "ChestnutRoast", `    public struct Level { public float cook, goldHi; public float[] arrivals; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Icicle Knock: growth per lane, regrow wait, walkers (start time, entry x, signed speed), length, mark, par
{
  const rows = icicle.ICICLE_STAGES.map((st) => `        new Level { grow = ${arr(st.grow)}, regrow = ${n(st.regrow)}, walkers = ${arr(st.walkers.flatMap((w) => [w.at, w.from, w.speed]))}, length = ${n(st.length)}, need = ${st.need}, par = ${st.par} },`);
  write("icicle-knock", "IcicleKnock", `    public struct Level { public float[] grow, walkers; public float regrow, length; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ice Road: stretches (from, to, wave speed, band half-width), ridges (at, speed limit), length, time limit, par
{
  const rows = iceroad.ICE_ROAD_STAGES.map((st) => `        new Level { stretches = ${arr(st.stretches.flatMap((s) => [s.from, s.to, s.wave, s.width]))}, ridges = ${arr(st.ridges.flatMap((r) => [r.at, r.limit]))}, length = ${n(st.length)}, timeLimit = ${n(st.timeLimit)}, par = ${n(st.par)} },`);
  write("ice-road", "IceRoad", `    public struct Level { public float[] stretches, ridges; public float length, timeLimit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Mandu Pleat: dumplings (fill rate, band low, band high, pleats, pinch speed, gap tolerance), mark
{
  const rows = mandu.MANDU_STAGES.map((st) => `        new Level { dumplings = ${arr(st.dumplings.flatMap((d) => [d.fillRate, d.lo, d.hi, d.pleats, d.speed, d.tol]))}, need = ${st.need} },`);
  write("mandu-pleat", "ManduPleat", `    public struct Level { public float[] dumplings; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Kimjang Salt: salt rate, cabbages (per-patch targets, band share, seconds), mark, par
{
  const rows = kimjang.KIMJANG_STAGES.map((st) => `        new Level { rate = ${n(st.rate)}, targets = ${arr(st.cabbages.flatMap((c) => c.target))}, tol = ${n(st.cabbages[0].tol)}, time = ${n(st.cabbages[0].time)}, cabbages = ${st.cabbages.length}, need = ${st.need}, par = ${st.par} },`);
  write("kimjang-salt", "KimjangSalt", `    public struct Level { public float rate, tol, time; public float[] targets; public int cabbages, need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Hwangtae Dry: days, per-day mean and swing, rack exposures, count, par (hours)
{
  const rows = hwangtae.HWANGTAE_STAGES.map((st) => `        new Level { days = ${st.days}, mean = ${arr(st.mean)}, amp = ${arr(st.amp)}, exposure = ${arr(st.racks.map((r) => r.exposure))}, need = ${st.need}, par = ${st.par} },`);
  write("hwangtae-dry", "HwangtaeDry", `    public struct Level { public int days, need, par; public float[] mean, amp, exposure; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Yongal Scoop: swing, fall, moon, ripple, time, mark, par
{
  const rows = yongal.YONGAL_STAGES.map((st) => `        new Level { swingAmp = ${n(st.swingAmp)}, swingPeriod = ${n(st.swingPeriod)}, fall = ${n(st.fall)}, moonR = ${n(st.moonR)}, moonAmp = ${n(st.moonAmp)}, moonPeriod = ${n(st.moonPeriod)}, ripple = ${n(st.ripple)}, time = ${n(st.time)}, need = ${st.need}, par = ${st.par} },`);
  write("yongal-scoop", "YongalScoop", `    public struct Level { public float swingAmp, swingPeriod, fall, moonR, moonAmp, moonPeriod, ripple, time; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Mungpungji Seal: drafts (cell, strength, opening time), frost spread, shades, paper, warmth drain, par
{
  const rows = mung.MUNG_STAGES.map((st) => `        new Level { drafts = ${arr(st.drafts.flatMap((d) => [d.cell, d.strength, d.at]))}, spread = ${n(st.spread)}, shades = ${st.shades}, paper = ${st.paper}, drain = ${n(st.drain)}, par = ${st.par} },`);
  write("mungpungji-seal", "MungpungjiSeal", `    public struct Level { public float[] drafts; public float spread, drain; public int shades, paper, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Charye Table: dishes (kind index per id), the house's rules (index), places per row, incense, par
{
  const kinds = ["rice", "soup", "meat", "fish", "po", "namul", "hye", "jujube", "chestnut", "pear", "persimmon", "apple", "hangwa"];
  const rules = ["banseo", "eodong", "dudong", "jwapo", "joyul", "hongdong"];
  const rows = charye.CHARYE_STAGES.map((st) => `        new Level { dishes = ${iarr(st.dishes.map((d) => kinds.indexOf(d.kind)))}, rules = ${iarr(st.rules.map((r) => rules.indexOf(r)))}, cols = ${iarr(st.cols)}, time = ${n(st.time)}, par = ${st.par} },`);
  write("charye-table", "CharyeTable", `    public struct Level { public int[] dishes, rules, cols; public float time; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Yeontan Relay: volunteers (grip, rest, hold seconds), unloading times, truck time, mark, par
{
  const rows = yeontan.YEONTAN_STAGES.map((st) => `        new Level { line = ${arr(st.line.flatMap((v) => [v.turn, v.reset, v.hold]))}, arrivals = ${arr(st.arrivals)}, time = ${n(st.time)}, need = ${st.need}, par = ${st.par} },`);
  write("yeontan-relay", "YeontanRelay", `    public struct Level { public float[] line, arrivals; public float time; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Daljip Fire: cells (0 air, 1 pine, 2 damp) and each cell's pine time, wind, straw, moonrise, par
{
  const kinds = { air: 0, pine: 1, damp: 2 } as const;
  const rows = daljip.DALJIP_STAGES.map((st) => `        new Level { cells = ${iarr(st.cells.map((k) => kinds[k]))}, pine = ${arr(st.pine)}, wind = ${n(st.wind)}, straws = ${st.straws}, moonrise = ${n(st.moonrise)}, par = ${n(st.par)} },`);
  write("daljip-fire", "DaljipFire", `    public struct Level { public int[] cells; public float[] pine; public float wind, moonrise, par; public int straws; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Scarf Knit: chart rows (flattened, row width), needle speed, mark
{
  const rows = scarf.SCARF_STAGES.map((st) => `        new Level { chart = ${iarr(st.rows.flat())}, width = ${st.rows[0].length}, speed = ${n(st.speed)}, need = ${st.need} },`);
  write("scarf-knit", "ScarfKnit", `    public struct Level { public int[] chart; public int width, need; public float speed; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Ipchun Brush: strokes (index into the eight), line tolerance, width tolerance, mark
{
  const rows = ipchun.IPCHUN_STAGES.map((st) => `        new Level { strokes = ${iarr(st.strokes.map((k) => ipchun.STROKES.indexOf(k)))}, tol = ${n(st.tol)}, wTol = ${n(st.wTol)}, mark = ${n(st.mark)} },`);
  write("ipchun-brush", "IpchunBrush", `    public struct Level { public int[] strokes; public float tol, wTol, mark; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Crane Count: each flock's birds (offsets, red-crowned or not, wing phase), seconds on screen, height, direction; tolerance, mark
{
  const flock = (f: crane.Flock) =>
    `new Flock { dx = ${arr(f.birds.map((b) => b.dx))}, dy = ${arr(f.birds.map((b) => b.dy))}, phase = ${arr(f.birds.map((b) => b.phase))}, red = ${iarr(f.birds.map((b) => (b.red ? 1 : 0)))}, time = ${n(f.time)}, y = ${n(f.y)}, dir = ${f.dir} }`;
  const rows = crane.CRANE_STAGES.map((st) => `        new Level { flocks = new Flock[] { ${st.flocks.map(flock).join(", ")} }, tolerance = ${n(st.tolerance)}, need = ${st.need} },`);
  write("crane-count", "CraneCount", `    public struct Flock { public float[] dx, dy, phase; public int[] red; public float time, y; public int dir; }\n    public struct Level { public Flock[] flocks; public float tolerance; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Rink Resurface: machine speed and turn rate, blade width, gouged cells, clock, share to smooth, par
{
  const rows = rink.RINK_STAGES.map((st) => `        new Level { speed = ${n(st.speed)}, turn = ${n(st.turn)}, blade = ${n(st.blade)}, gouges = ${iarr(st.gouges)}, time = ${n(st.time)}, need = ${n(st.need)}, par = ${n(st.par)} },`);
  write("rink-resurface", "RinkResurface", `    public struct Level { public float speed, turn, blade, time, need, par; public int[] gouges; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Holiday Ticket: rows, when each seat goes to another buyer (0 sold already, 1e9 never), the parties in order, clock, par
{
  const rows = ticket.TICKET_STAGES.map((st) => `        new Level { rows = ${st.rows}, soldAt = ${arr(st.soldAt.map((t) => (Number.isFinite(t) ? t : 1e9)))}, parties = ${iarr(st.parties)}, time = ${n(st.time)}, par = ${n(st.par)} },`);
  write("holiday-ticket", "HolidayTicket", `    public struct Level { public int rows; public float[] soldAt; public int[] parties; public float time, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Draft Manor: grid, steps, keys, par, and the deck (doors ahead/left/right as bits 1/2/4, effect 0 none 1 pantry 2 key, gain)
{
  const eff = { none: 0, pantry: 1, key: 2 } as const;
  const rows = manor.MANOR_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, steps = ${st.steps}, keys = ${st.keys}, par = ${st.par}, exits = ${iarr(st.deck.map((c) => (c.f ? 1 : 0) | (c.l ? 2 : 0) | (c.r ? 4 : 0)))}, effect = ${iarr(st.deck.map((c) => eff[c.effect]))}, gain = ${iarr(st.deck.map((c) => c.gain))} },`);
  write("draft-manor", "DraftManor", `    public struct Level { public int cols, rows, steps, keys, par; public int[] exits, effect, gain; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Dispatch Desk: crew skills (power, care, speed; flattened), calls (time, x, y, kind 0 fire 1 rescue 2 chase, level, wait), shift, mark, par
{
  const kinds = { fire: 0, rescue: 1, chase: 2 } as const;
  const rows = dispatch.DISPATCH_STAGES.map((st) => `        new Level { skills = ${iarr(st.crew.flatMap((c) => c.skills))}, at = ${arr(st.calls.map((c) => c.at))}, x = ${arr(st.calls.map((c) => c.x))}, y = ${arr(st.calls.map((c) => c.y))}, kind = ${iarr(st.calls.map((c) => kinds[c.kind]))}, level = ${iarr(st.calls.map((c) => c.level))}, wait = ${arr(st.calls.map((c) => c.wait))}, shift = ${n(st.shift)}, need = ${st.need}, par = ${st.par} },`);
  write("dispatch-desk", "DispatchDesk", `    public struct Level { public int[] skills, kind, level; public float[] at, x, y, wait; public float shift; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Parry Duel: the rival's three combos (swing raise time, wind-up, damage, feint; with combo lengths), health, windows, par
{
  const rows = parry.PARRY_STAGES.map((r) => {
    const all = r.combos.flat();
    return `        new Level { lengths = ${iarr(r.combos.map((c) => c.length))}, at = ${arr(all.map((s) => s.at))}, windup = ${arr(all.map((s) => s.windup))}, damage = ${iarr(all.map((s) => s.damage))}, feint = ${iarr(all.map((s) => (s.feint ? 1 : 0)))}, hp = ${r.hp}, perfect = ${n(r.perfect)}, good = ${n(r.good)}, par = ${r.par} },`;
  });
  write("parry-duel", "ParryDuel", `    public struct Level { public int[] lengths, damage, feint; public float[] at, windup; public int hp, par; public float perfect, good; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Odd Commute: the car's things (kind index, x, y, w, h, colour, look) and every car in order
// (−1 ordinary, else the thing, the change index, dx, scale, colour)
{
  const rows = commute.COMMUTE_STAGES.map((st) => {
    const cars = st.cars;
    return `        new Level { kind = ${iarr(st.car.map((t) => commute.KINDS.indexOf(t.kind)))}, x = ${arr(st.car.map((t) => t.x))}, y = ${arr(st.car.map((t) => t.y))}, w = ${arr(st.car.map((t) => t.w))}, h = ${arr(st.car.map((t) => t.h))}, colour = ${iarr(st.car.map((t) => t.colour))}, look = ${iarr(st.car.map((t) => t.look))}, thing = ${iarr(cars.map((a) => (a ? a.thing : -1)))}, change = ${iarr(cars.map((a) => (a ? commute.CHANGES.indexOf(a.change) : -1)))}, dx = ${arr(cars.map((a) => (a ? a.dx : 0)))}, scale = ${arr(cars.map((a) => (a ? a.scale : 1)))}, newColour = ${iarr(cars.map((a) => (a ? a.colour : 0)))}, need = ${st.need} },`;
  });
  write("odd-commute", "OddCommute", `    public struct Level { public int[] kind, colour, look, thing, change, newColour; public float[] x, y, w, h, dx, scale; public int need; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Sofa Carry: the hall's centre line, hall width, landing size, sofa length and thickness, clock, par
{
  const rows = sofa.SOFA_STAGES.map((st) => `        new Level { px = ${arr(st.path.map((p) => p.x))}, py = ${arr(st.path.map((p) => p.y))}, hall = ${n(st.hall)}, landing = ${n(st.landing)}, length = ${n(st.length)}, thick = ${n(st.thick)}, time = ${n(st.time)}, par = ${n(st.par)} },`);
  write("sofa-carry", "SofaCarry", `    public struct Level { public float[] px, py; public float hall, landing, length, thick, time, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Palm Village: the island (0 land, 1 water, 2 rock), the pieces in order (house, tree, well, field, lantern), star marks
{
  const g = { land: 0, water: 1, rock: 2 } as const;
  const rows = village.VILLAGE_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, ground = ${iarr(st.ground.map((x) => g[x]))}, pieces = ${iarr(st.pieces.map((p) => village.PIECES.indexOf(p)))}, good = ${st.good}, great = ${st.great} },`);
  write("palm-village", "PalmVillage", `    public struct Level { public int cols, rows, good, great; public int[] ground, pieces; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Window Plant: the day, drying, cloudy spells (from, to; flattened), when bugs land, the height to reach, par
{
  const rows = plant.PLANT_STAGES.map((st) => `        new Level { day = ${n(st.day)}, dry = ${n(st.dry)}, clouds = ${arr(st.clouds.flat())}, bugs = ${arr(st.bugs)}, target = ${n(st.target)}, par = ${n(st.par)} },`);
  write("window-plant", "WindowPlant", `    public struct Level { public float day, dry, target, par; public float[] clouds, bugs; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Number Boom: the chain (base, step, cost, growth per machine), start coins, target, par. Big numbers are doubles.
{
  const d = (v: number) => `${v.toPrecision(10).replace("e+", "E+")}d`;
  const darr = (xs: number[]) => `new double[] { ${xs.map(d).join(", ")} }`;
  const rows = boom.BOOM_STAGES.map((st) => `        new Level { b = ${darr(st.machines.map((m) => m.base))}, s = ${darr(st.machines.map((m) => m.step))}, c = ${darr(st.machines.map((m) => m.cost))}, g = ${darr(st.machines.map((m) => m.growth))}, start = ${d(st.start)}, target = ${d(st.target)}, par = ${st.par} },`);
  write("number-boom", "NumberBoom", `    public struct Level { public double[] b, s, c, g; public double start, target; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Crown Regions: board size, land per square, the answer (crowned column per row), par
{
  const rows = crownGame.CROWN_STAGES.map((st) => `        new Level { n = ${st.n}, region = ${iarr(st.region)}, answer = ${iarr(st.answer)}, par = ${st.par} },`);
  write("crown-regions", "CrownRegions", `    public struct Level { public int n, par; public int[] region, answer; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Screw Jam: plates (x, y, w, h, layer), screws (x, y, plate, colour), box colours in order, tray size, best tray, an answer
{
  const rows = screwGame.SCREW_STAGES.map((st) => {
    const plates = st.plates.flatMap((p) => [p.x, p.y, p.w, p.h, p.layer]);
    const screws = st.screws.flatMap((x) => [x.x, x.y, x.plate, x.colour]);
    const answer = screwGame.solve({ ...st, tray: st.best }) ?? [];
    return `        new Level { plates = ${arr(plates)}, screws = ${arr(screws)}, boxes = ${iarr(st.boxes)}, tray = ${st.tray}, best = ${st.best}, answer = ${iarr(answer)} },`;
  });
  write("screw-jam", "ScrewJam", `    public struct Level { public float[] plates, screws; public int[] boxes, answer; public int tray, best; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Parking Out: lot size, cars (x, y, dir, len, colour), pillar squares, par
{
  const rows = parkGame.PARKING_STAGES.map((st) => `        new Level { w = ${st.w}, h = ${st.h}, cars = ${iarr(st.cars.flatMap((c) => [c.x, c.y, c.dir, c.len, c.colour]))}, pillars = ${iarr(st.pillars)}, par = ${st.par} },`);
  write("parking-out", "ParkingOut", `    public struct Level { public int w, h, par; public int[] cars, pillars; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Night Checkout: per customer arrival, patience, cash paid (0 card) and item count; items (price, kind, 1+1) flattened
{
  const rows = shopGame.CHECKOUT_STAGES.map((st) => {
    const cs = st.customers;
    const items = cs.flatMap((c) => c.items.flatMap((it) => [it.price, it.kind, it.twoForOne ? 1 : 0]));
    return `        new Level { at = ${arr(cs.map((c) => c.at))}, patience = ${arr(cs.map((c) => c.patience))}, paid = ${iarr(cs.map((c) => c.paid))}, count = ${iarr(cs.map((c) => c.items.length))}, items = ${iarr(items)}, showChange = ${st.showChange}, par = ${st.par} },`;
  });
  write("night-checkout", "NightCheckout", `    public struct Level { public float[] at, patience; public int[] paid, count, items; public bool showChange; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Toy Box Brawl: shelf (kind index), coins, enemy (kind, atk, hp), the most toys a line keeps, and one line that does it
{
  const kinds = toyGame.KINDS;
  const rows = toyGame.TOY_STAGES.map((st) => {
    let bestLine: number[] = [];
    for (const l of toyGame.lines(st)) {
      const r = toyGame.battle(l.map((k) => toyGame.toy(k)), st.enemy);
      if (r.won && r.left === st.best) {
        // the bot buys from the shelf in this order: offer indices, front first
        const used = new Set<number>();
        bestLine = l.map((k) => {
          const i = st.shop.findIndex((s, j) => s === k && !used.has(j));
          used.add(i);
          return i;
        });
        break;
      }
    }
    return `        new Level { shop = ${iarr(st.shop.map((k) => kinds.indexOf(k)))}, coins = ${st.coins}, enemy = ${iarr(st.enemy.flatMap((e) => [kinds.indexOf(e.kind), e.atk, e.hp]))}, best = ${st.best}, answer = ${iarr(bestLine)} },`;
  });
  write("toy-box-brawl", "ToyBoxBrawl", `    public struct Level { public int[] shop, enemy, answer; public int coins, best; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Summon Guard: waves, monsters per wave, first-wave hp and growth, speed, boss hp, coins, luck seed, peak par
{
  const rows = guardGame.GUARD_STAGES.map((st) => `        new Level { waves = ${st.waves}, perWave = ${st.perWave}, hp = ${st.hp}, growth = ${n(st.growth)}, speed = ${n(st.speed)}, bossHp = ${st.bossHp}, coins = ${st.coins}, seed = ${st.seed}u, peakPar = ${st.peakPar} },`);
  write("summon-guard", "SummonGuard", `    public struct Level { public int waves, perWave, hp, bossHp, coins, peakPar; public float growth, speed; public uint seed; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Rooftop Cats: time of day, sky, props (kind, x, y, w, h + colour), cats (x, y, peek, host, scale + colour), clock, par
{
  const kinds = ["building", "roof", "window", "chimney", "plant", "tank", "cloth", "ac", "line"];
  const sarr = (xs: string[]) => `new string[] { ${xs.map((x) => `"${x}"`).join(", ")} }`;
  const rows = catsGame.CATS_STAGES.map((st) => {
    const props = st.props.flatMap((p) => [kinds.indexOf(p.kind), p.x, p.y, p.w, p.h]);
    const cats = st.cats.flatMap((c) => [c.x, c.y, c.peek ? 1 : 0, c.host, c.scale]);
    return `        new Level { time = ${["day", "dusk", "night"].indexOf(st.time)}, sky = "${st.sky}", props = ${arr(props)}, propColours = ${sarr(st.props.map((p) => p.colour))}, cats = ${arr(cats)}, catColours = ${sarr(st.cats.map((c) => c.colour))}, limit = ${st.limit}, par = ${st.par} },`;
  });
  write("rooftop-cats", "RooftopCats", `    public struct Level { public int time, limit, par; public string sky; public float[] props, cats; public string[] propColours, catColours; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Gulp Hole: park things (kind, x, y), the meter, the clock, par
{
  const rows = holeGame.HOLE_STAGES.map((st) => `        new Level { things = ${iarr(st.things.flatMap((t) => [t.kind, t.x, t.y]))}, goal = ${st.goal}, limit = ${st.limit}, par = ${st.par} },`);
  write("gulp-hole", "GulpHole", `    public struct Level { public int[] things; public int goal, limit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Cake Thief: size, the answer, par, and the words in every language (order: ko, en, ja, zh, fr, es):
// grid labels (suspects, rooms, items), the clue sentences and the cream clue
{
  const LANGS = ["ko", "en", "ja", "zh", "fr", "es"] as const;
  const esc = (x: string) => x.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const sarr = (xs: string[]) => `new string[] { ${xs.map((x) => `"${esc(x)}"`).join(", ")} }`;
  const rows = cakeGame.CAKE_STAGES.map((st) => {
    const labels = LANGS.map((l) => sarr([...st.suspects.map((i) => cakeGame.label(l, "suspects", i)), ...st.rooms.map((i) => cakeGame.label(l, "rooms", i)), ...st.items.map((i) => cakeGame.label(l, "items", i))]));
    const clues = LANGS.map((l) => sarr(st.clues.map((c) => cakeGame.clueText(st, c, l))));
    const cream = sarr(LANGS.map((l) => cakeGame.creamText(st, l)));
    return `        new Level { n = ${st.n}, room = ${iarr(st.room)}, thief = ${st.thief}, par = ${st.par}, labels = new string[][] { ${labels.join(", ")} }, clues = new string[][] { ${clues.join(", ")} }, cream = ${cream} },`;
  });
  write("cake-thief", "CakeThief", `    public struct Level { public int n, thief, par; public int[] room; public string[][] labels, clues; public string[] cream; }\n    public static readonly string[] Langs = { "ko", "en", "ja", "zh", "fr", "es" };\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Blanket Battle: blanket quirks (plain, sunny, ants, small), both decks in draw order, the rival's care and luck
{
  const rows = blanketGame.BLANKET_STAGES.map((st) => `        new Level { lanes = ${iarr(st.lanes.map((l) => blanketGame.LANE_KINDS.indexOf(l)))}, deck = ${iarr(st.deck)}, rivalDeck = ${iarr(st.rivalDeck)}, rivalSkill = ${n(st.rivalSkill)}, rivalSeed = ${st.rivalSeed}u },`);
  write("blanket-battle", "BlanketBattle", `    public struct Level { public int[] lanes, deck, rivalDeck; public float rivalSkill; public uint rivalSeed; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Duck Parade: rows (kind 0 gates: left op, left n, right op, right n; kind 1 fox: lane, bite%), the stream's need, best
{
  const ops = ["+", "-", "x", "/"];
  const rows = duckGame.DUCK_STAGES.map((st) => {
    const flat = st.rows.flatMap((r) => (r.kind === "gates" ? [0, ops.indexOf(r.gates[0].op), r.gates[0].n, ops.indexOf(r.gates[1].op), r.gates[1].n] : [1, r.lane, r.bite, 0, 0]));
    return `        new Level { rows = ${iarr(flat)}, need = ${st.need}, best = ${st.best} },`;
  });
  write("duck-parade", "DuckParade", `    public struct Level { public int[] rows; public int need, best; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Cable Knot: sockets (x, y), plug count, cables (a, b), the start, the move limit, par
{
  const rows = cableGame.CABLE_STAGES.map((st) => `        new Level { sockets = ${iarr(st.sockets.flatMap((p) => [p.x, p.y]))}, plugs = ${st.plugs}, edges = ${iarr(st.edges.flat())}, start = ${iarr(st.start)}, limit = ${st.limit}, par = ${st.par} },`);
  write("cable-knot", "CableKnot", `    public struct Level { public int[] sockets, edges, start; public int plugs, limit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Roller Claim: home cell, balls (x, y, dx, dy), ball speed, goal share, the clock, par
{
  const rows = rollerGame.ROLLER_STAGES.map((st) => `        new Level { start = ${iarr(st.start)}, balls = ${iarr(st.balls.flatMap((b) => [b.x, b.y, b.dx, b.dy]))}, ballStep = ${n(st.ballStep)}, goal = ${n(st.goal)}, limit = ${st.limit}, par = ${st.par} },`);
  write("roller-claim", "RollerClaim", `    public struct Level { public int[] start, balls; public float ballStep, goal; public int limit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Formula Lock: the answer, its length, par, and the careful solver's guesses (for the automated play check)
{
  const rows: string[] = [];
  for (let i = 0; i < lockGame.STAGE_COUNT; i++) {
    const st = lockGame.LOCK_STAGES[i];
    const plan = lockGame.pilot(st, { seed: 1 }).guesses;
    rows.push(`        new Level { answer = ${JSON.stringify(st.answer)}, length = ${st.length}, par = ${st.par}, plan = new string[] { ${plan.map((g) => JSON.stringify(g)).join(", ")} } },`);
  }
  write("formula-lock", "FormulaLock", `    public struct Level { public string answer; public int length, par; public string[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Veggie Lanes: pests as (time, row, kind) triples, their toughness, and the plants not yet on offer
{
  const rows: string[] = [];
  for (let i = 0; i < lanesGame.STAGE_COUNT; i++) {
    const st = lanesGame.LANE_STAGES[i];
    rows.push(`        new Level { spawns = ${arr(st.spawns.flatMap((s) => [s.t, s.row, s.kind]))}, hpScale = ${n(st.hpScale)}, locked = ${iarr(st.locked)} },`);
  }
  write("veggie-lanes", "VeggieLanes", `    public struct Level { public float[] spawns; public float hpScale; public int[] locked; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Bounce Down: floors as (gap, width, sour count, sour slices...) runs, the clock, par
{
  const rows = bounceGame.BOUNCE_STAGES.map((st) => `        new Level { floors = ${iarr(st.floors.flatMap((f) => [f.gap, f.width, f.sour.length, ...f.sour]))}, count = ${st.floors.length}, limit = ${st.limit}, par = ${st.par} },`);
  write("bounce-down", "BounceDown", `    public struct Level { public int[] floors; public int count, limit, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Trio Tray: tiles as (x, y, z, kind) quads on a half-tile grid, the blanket size, par
{
  const rows: string[] = [];
  for (let i = 0; i < trayGame.STAGE_COUNT; i++) {
    const st = trayGame.TRAY_STAGES[i];
    // the careful player's picks, for the automated play check
    const plan: number[] = [];
    {
      const p = trayGame.newPicnic(st);
      const rng = (() => { let a = (1 * 7307 + 53) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      while (!p.over) { const i = trayGame.nextPick(p, rng, 0); plan.push(i); trayGame.pick(p, i); }
      if (!p.won) throw new Error("trio-tray plan does not win");
    }
    rows.push(`        new Level { tiles = ${iarr(st.tiles.flatMap((t) => [t.x, t.y, t.z, t.kind]))}, cols = ${st.cols}, rows = ${st.rows}, par = ${st.par}, plan = ${iarr(plan)} },`);
  }
  write("trio-tray", "TrioTray", `    public struct Level { public int[] tiles; public int cols, rows, par; public int[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Cork Spin: pins to push in, pins already in (board angles), the spin, the clock, par
{
  const rows = corkGame.CORK_STAGES.map((st) => `        new Level { pins = ${st.pins}, fixedPins = ${arr(st.fixed)}, speed = ${n(st.speed)}, wobble = ${n(st.wobble)}, wobbleRate = ${n(st.wobbleRate)}, reverse = ${n(st.reverse)}, par = ${st.par}, limit = ${st.limit} },`);
  write("cork-spin", "CorkSpin", `    public struct Level { public int pins; public float[] fixedPins; public float speed, wobble, wobbleRate, reverse; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Gondola Queue: the crowd (row-major, 6 wide: colour, -1 empty, -2 rock), gondola colours, par
{
  const rows = gondolaGame.GONDOLA_STAGES.map((st) => {
    // the careful player's taps, for the automated play check
    const plan: number[] = [];
    const s = gondolaGame.newStation(st);
    const rng = (() => { let a = (1 * 6733 + 59) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    while (!s.over) { const i = gondolaGame.nextTap(s, rng, 0); plan.push(i); gondolaGame.tap(s, i); }
    if (!s.won || gondolaGame.starsFor(s) < 3) throw new Error("gondola-queue plan does not win");
    return `        new Level { rows = ${st.rows}, grid = ${iarr(st.grid)}, gondolas = ${iarr(st.gondolas)}, par = ${st.par}, plan = ${iarr(plan)} },`;
  });
  write("gondola-queue", "GondolaQueue", `    public struct Level { public int rows; public int[] grid, gondolas; public int par; public int[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Beaver Chop: branches from the bottom log up (-1 left, 0 none, 1 right), logs to chop, the clock's drain
{
  const rows = chopGame.CHOP_STAGES.map((st) => `        new Level { branches = ${iarr(st.branches)}, target = ${st.target}, drain = ${n(st.drain)}, ramp = ${n(st.ramp)} },`);
  write("beaver-chop", "BeaverChop", `    public struct Level { public int[] branches; public int target; public float drain, ramp; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Prism Hop: gates as (kind, y, r, phase, speed, colour) sixes, ledge heights, the clock
{
  const rows: string[] = [];
  for (let i = 0; i < prismGame.STAGE_COUNT; i++) {
    const st = prismGame.PRISM_STAGES[i];
    rows.push(`        new Level { gates = ${arr(st.gates.flatMap((g) => [g.kind, g.y, g.r, g.phase, g.speed, g.colour]))}, ledges = ${arr(st.ledges)}, limit = ${n(st.limit)} },`);
  }
  write("prism-hop", "PrismHop", `    public struct Level { public float[] gates, ledges; public float limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Paint Flood: the canvas, its size and colours, the stroke limit, par, and a careful painter's strokes for the play check
{
  const rows: string[] = [];
  for (let i = 0; i < floodGame.STAGE_COUNT; i++) {
    const st = floodGame.FLOOD_STAGES[i];
    const c = floodGame.newCanvas(st);
    const plan: number[] = [];
    while (!c.over) { const k = floodGame.nextColour(c, 2); plan.push(k); floodGame.paint(c, k); }
    if (!c.won || floodGame.starsFor(c) < 3) throw new Error("paint-flood plan does not win");
    rows.push(`        new Level { cells = ${iarr(st.cells)}, size = ${st.size}, colours = ${st.colours}, limit = ${st.limit}, par = ${st.par}, plan = ${iarr(plan)} },`);
  }
  write("paint-flood", "PaintFlood", `    public struct Level { public int[] cells; public int size, colours, limit, par; public int[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Hoop Flick: ball spots as (x, y) pairs, the hoop and its slide, points needed, par
{
  const rows = hoopGame.HOOP_STAGES.map((st) => `        new Level { shots = ${arr(st.shots.flatMap((s) => [s.x, s.y]))}, hx = ${n(st.hx)}, hy = ${n(st.hy)}, amp = ${n(st.amp)}, rate = ${n(st.rate)}, need = ${st.need}, par = ${st.par} },`);
  write("hoop-flick", "HoopFlick", `    public struct Level { public float[] shots; public float hx, hy, amp, rate; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Summit Cards: the 28 peak cards, the stock (drawn from the end), the first camp card, face-down deals, par, and a
// careful climber's moves (a slot, or -1 to turn the stock) for the play check
{
  const rows: string[] = [];
  for (let i = 0; i < summitGame.STAGE_COUNT; i++) {
    const st = summitGame.SUMMIT_STAGES[i];
    const cl = summitGame.newClimb(st);
    const rng = (() => { let a = (1 * 4507 + 79) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const plan: number[] = [];
    while (!cl.over) { const m = summitGame.nextMove(cl, 3, rng, 0); plan.push(m); if (m >= 0) summitGame.play(cl, m); else summitGame.draw(cl); }
    if (!cl.won || summitGame.starsFor(cl) < 3) throw new Error("summit-cards plan does not win");
    rows.push(`        new Level { peaks = ${iarr(st.peaks)}, stock = ${iarr(st.stock)}, camp = ${st.camp}, faceDown = ${st.faceDown}, par = ${st.par}, plan = ${iarr(plan)} },`);
  }
  write("summit-cards", "SummitCards", `    public struct Level { public int[] peaks, stock; public int camp; public bool faceDown; public int par; public int[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Coin Slide: tokens, sugar-pot posts as (x, y) pairs, points needed, par
{
  const rows = slideGame.SLIDE_STAGES.map((st) => `        new Level { tokens = ${st.tokens}, posts = ${arr(st.posts.flatMap((p) => [p.x, p.y]))}, need = ${st.need}, par = ${st.par} },`);
  write("coin-slide", "CoinSlide", `    public struct Level { public int tokens; public float[] posts; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Sleepy Windows: the block size, which windows are lit (1/0), par, the tap limit, and the fewest taps for the play check
{
  const rows = windowsGame.WINDOWS_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, lit = ${iarr(st.lit.map(Number))}, par = ${st.par}, limit = ${st.limit}, plan = ${iarr(windowsGame.plan(st.lit, st.cols, st.rows))} },`);
  write("sleepy-windows", "SleepyWindows", `    public struct Level { public int cols, rows; public int[] lit; public int par, limit; public int[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Juice Swipe: tosses as (time, x, vx, vy, bee 1/0, fruit kind) sixes, fruit needed, par
{
  const rows = juiceGame.JUICE_STAGES.map((st) => `        new Level { tosses = ${arr(st.tosses.flatMap((k) => [k.t, k.x, k.vx, k.vy, k.bee ? 1 : 0, k.kind]))}, need = ${st.need}, par = ${st.par} },`);
  write("juice-swipe", "JuiceSwipe", `    public struct Level { public float[] tosses; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Dart Drift: darts, the sway (half-widths, speeds, phases, centre), points needed, par
{
  const rows = dartGame.DART_STAGES.map((st) => `        new Level { darts = ${st.darts}, amp = ${arr(st.amp)}, rate = ${arr(st.rate)}, phase = ${arr(st.phase)}, centre = ${arr(st.centre)}, need = ${st.need}, par = ${st.par} },`);
  write("dart-drift", "DartDrift", `    public struct Level { public int darts; public float[] amp, rate, phase, centre; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Pip Merge: stone squares, the dice in order, the goal and par
{
  const rows = pipGame.PIP_STAGES.map((st) => `        new Level { rocks = ${iarr(st.rocks)}, dice = ${iarr(st.dice)}, need = ${st.need}, par = ${st.par} },`);
  write("pip-merge", "PipMerge", `    public struct Level { public int[] rocks, dice; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Vacuum Dash: the room (1 floor / 0 furniture), the start, the plan (0 up, 1 right, 2 down, 3 left), par and the move limit
{
  const rows = vacuumGame.VACUUM_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, floor = ${iarr(st.floor.map(Number))}, start = ${st.start}, plan = ${iarr(st.plan)}, par = ${st.par}, limit = ${st.limit} },`);
  write("vacuum-dash", "VacuumDash", `    public struct Level { public int cols, rows; public int[] floor; public int start; public int[] plan; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Pocket Shot: the numbered balls (x, y pairs), the white ball's spot, the shots allowed and par
{
  const rows = poolGame.POOL_STAGES.map((st) => `        new Level { balls = ${arr(st.balls.flat())}, cue = ${arr(st.cue)}, shots = ${st.shots}, par = ${st.par} },`);
  write("pocket-shot", "PocketShot", `    public struct Level { public float[] balls, cue; public int shots, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Jelly Gates: the tray, blocks as (x, y, w, h, colour), gates as (side, from, length, colour), the answer as
// (block, direction, distance; -1 = out), par and the move limit
{
  const rows = jellyGame.JELLY_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, blocks = ${iarr(st.blocks.flatMap((b) => [b.x, b.y, b.w, b.h, b.color]))}, gates = ${iarr(st.gates.flatMap((g) => [g.side, g.from, g.len, g.color]))}, plan = ${iarr(st.plan.flatMap((m) => [m.b, m.d, m.dist]))}, par = ${st.par}, limit = ${st.limit} },`);
  write("jelly-gates", "JellyGates", `    public struct Level { public int cols, rows; public int[] blocks, gates, plan; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Upside Dash: speed, length, hazards as (x, width, lane), batteries as (x, y), the planned flips, par
{
  const rows = upsideGame.UPSIDE_STAGES.map((st) => `        new Level { speed = ${n(st.speed)}, length = ${n(st.length)}, hazards = ${arr(st.hazards.flatMap((h) => [h.x, h.w, h.lane]))}, batteries = ${arr(st.batteries.flatMap((b) => [b.x, b.y]))}, flips = ${arr(st.flips)}, par = ${st.par} },`);
  write("upside-dash", "UpsideDash", `    public struct Level { public float speed, length; public float[] hazards, batteries, flips; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Pin Roll: frames, rubber posts as (x, y) pairs, points needed, par
{
  const rows = pinGame.PIN_STAGES.map((st) => `        new Level { frames = ${st.frames}, posts = ${arr(st.posts.flat())}, need = ${st.need}, par = ${st.par} },`);
  write("pin-roll", "PinRoll", `    public struct Level { public int frames; public float[] posts; public int need, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Garden Pipes: the garden, the tap's tile, each tile's openings in the answer (up 1, right 2, down 4, left 8),
// the quarter turns each starts away from it, par and the turn limit
{
  const rows = pipesGame.PIPES_STAGES.map((st) => `        new Level { cols = ${st.cols}, rows = ${st.rows}, source = ${st.source}, solved = ${iarr(st.solved)}, start = ${iarr(st.start)}, par = ${st.par}, limit = ${st.limit} },`);
  write("garden-pipes", "GardenPipes", `    public struct Level { public int cols, rows, source; public int[] solved, start; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Gumball Volley: the rows to come, 7 cells each (0 empty, -1 a + bubble, else a block's number), rows on the board at
// the start, gumballs to start with, par
{
  const rows = volleyGame.VOLLEY_STAGES.map((st) => `        new Level { cells = ${iarr(st.rows.flat())}, start = ${st.start}, balls = ${st.balls}, par = ${st.par} },`);
  write("gumball-volley", "GumballVolley", `    public struct Level { public int[] cells; public int start, balls, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Boing Up: leaves as (x, height, kind, sway, sway speed), berries as (x, height), the planned climb, the top, par
{
  const rows = boingGame.BOING_STAGES.map((st) => `        new Level { leaves = ${arr(st.leaves.flatMap((l) => [l.x, l.h, l.kind, l.amp, l.rate]))}, berries = ${arr(st.berries.flatMap((b) => [b.x, b.h]))}, path = ${iarr(st.path)}, top = ${n(st.top)}, par = ${st.par} },`);
  write("boing-up", "BoingUp", `    public struct Level { public float[] leaves, berries; public int[] path; public float top; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Snack Swing: the cookie's start, ropes as (peg x, peg y, length), the mouth, sparkles and thorns as (x, y), and the
// planned snips as (time, rope)
{
  const rows = snackGame.SNACK_STAGES.map((st) => `        new Level { start = ${arr(st.start)}, ropes = ${arr(st.ropes.flatMap((r) => [r.ax, r.ay, r.len]))}, mouth = ${arr(st.mouth)}, sparkles = ${arr(st.sparkles.flat())}, thorns = ${arr(st.thorns.flat())}, plan = ${arr(st.plan.flatMap((p) => [p.t, p.rope]))} },`);
  write("snack-swing", "SnackSwing", `    public struct Level { public float[] start, ropes, mouth, sparkles, thorns, plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Sun & Moon: the grid size, the answer (1 sun, 2 moon), the squares shown, clues as (square, 0 right / 1 below,
// 1 same / 0 different), the answer's taps in order, par and the tap limit
{
  const rows = sunMoonGame.SUNMOON_STAGES.map((st) => `        new Level { n = ${st.n}, answer = ${iarr(st.answer)}, given = ${iarr(st.given)}, clues = ${iarr(st.clues.flatMap((c) => [c.a, c.dir, c.same ? 1 : 0]))}, plan = ${iarr(sunMoonGame.planTaps(st))}, par = ${st.par}, limit = ${st.limit} },`);
  write("sun-moon", "SunMoon", `    public struct Level { public int n; public int[] answer, given, clues, plan; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Carton Flip: shelves as (left, right, top), the spin (radians per second) and a flick strength that lands on each
{
  const rows = cartonGame.CARTON_STAGES.map((st) => `        new Level { shelves = ${arr(st.shelves.flatMap((s) => [s.x0, s.x1, s.y]))}, spin = ${n(st.spin)}, plan = ${arr(st.plan)} },`);
  write("carton-flip", "CartonFlip", `    public struct Level { public float[] shelves; public float spin; public float[] plan; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Bakery Shelf: per shelf how many rows it has (the front, then the trays behind), every row's three spots (−1 empty),
// the planned moves as (from shelf, from spot, to shelf, to spot), par and the move limit
{
  const rows = shelfGame.SHELF_STAGES.map((st) => `        new Level { rows = ${iarr(st.shelves.map((s) => s.length))}, items = ${iarr(st.shelves.flat(2))}, plan = ${iarr(st.plan.flat())}, par = ${st.par}, limit = ${st.limit} },`);
  write("bakery-shelf", "BakeryShelf", `    public struct Level { public int[] rows, items, plan; public int par, limit; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Chalk Roll: the marble, the pail (x, rim y, width, depth), ledges as (x0, y0, x1, y1), thumbtacks as (x, y), the
// chalk there is, the planned line's corners and its length
{
  const rows = chalkGame.CHALK_STAGES.map((st) => `        new Level { ball = ${arr(st.ball)}, pail = ${arr([st.pail.x, st.pail.y, st.pail.w, st.pail.h])}, walls = ${arr(st.walls.flat())}, tacks = ${arr(st.tacks.flat())}, ink = ${n(st.ink)}, plan = ${arr(st.plan.flat())}, par = ${n(st.par)} },`);
  write("chalk-roll", "ChalkRoll", `    public struct Level { public float[] ball, pail, walls, tacks, plan; public float ink, par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}

// Boba Pins: the 18 × 28 grid row by row (0 empty, 1 wall, 2 pin, 3 white, 4 brown, 5 chili), how many cells each pin
// has and those cells, the pins to pull and par
{
  const rows = bobaGame.BOBA_STAGES.map((st) => `        new Level { grid = ${iarr(st.grid)}, pinLen = ${iarr(st.pins.map((p) => p.length))}, pinCells = ${iarr(st.pins.flat())}, plan = ${iarr(st.plan)}, par = ${st.par} },`);
  write("boba-pins", "BobaPins", `    public struct Level { public int[] grid, pinLen, pinCells, plan; public int par; }\n    public static readonly Level[] All =\n    {\n${rows.join("\n")}\n    };\n`);
}
