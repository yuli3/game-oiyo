import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FIELD_H, FIELD_W, LEVELS, LIFT, OVER, STAGE_COUNT, SWEET, TTAKJI_SLUG, newTtakji, powerOf, slam, starsFor, stepTtakji, tileAt, type SlamResult, type Tile, type TtakjiState } from "../../lib/games/ttakji-flip";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; flips: string; slams: string; start: string; win: string; lose: string; power: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; double: string; ice: string; r: Record<SlamResult, string>;
}> = {
  ko: {
    stage: "{0}단계", flips: "넘긴 딱지 {0}/{1}", slams: "남은 기회 {0}", start: "아래로 휙 쓸다가 딱지 모서리 위에서 손을 떼요", win: "딱지를 다 땄어요!", lose: "기회를 다 썼어요", power: "힘 {0}%",
    again: "다시 하기", next: "다음 단계", double: "두 번 접은 딱지", ice: "빙판 골목",
    r: { flip: "넘어갔다!", wobble: "들썩! 한 번 더", weak: "힘이 모자라요", miss: "빗나갔어요", over: "너무 세서 튕겼어요" },
    help: "상대 딱지가 바닥에 놓여 있어요. 화면을 아래로 휙 쓸고 손을 떼면, 손을 뗀 자리에 내 딱지가 그 속도만큼 세게 내리쳐져요. 상대 딱지 모서리 바로 안쪽을 치면 바람이 들어가 뒤집혀요. 한가운데를 치면 꿈쩍 않고, 너무 세게 치면 내 딱지가 튕겨 나가요. 오른쪽 막대의 초록 선은 넘기는 데 필요한 힘, 빨간 선은 튕기는 힘이에요. 뒤로 갈수록 딱지가 두꺼워지고 작아지며, 비스듬히 놓이거나 두 번 쳐야 하는 딱지, 빙판에서 미끄러지는 딱지가 나와요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", flips: "Flipped {0}/{1}", slams: "Slams left {0}", start: "Swipe down and let go over the tile's edge", win: "You won every ttakji!", lose: "Out of slams", power: "Power {0}%",
    again: "Play again", next: "Next stage", double: "Double-folded", ice: "Icy alley",
    r: { flip: "Flipped!", wobble: "It lifted! Once more", weak: "Not hard enough", miss: "Missed", over: "Too hard, it bounced" },
    help: "Your rival's ttakji lies on the ground. Swipe down and let go: your own folded tile slams down where your finger leaves the screen, as hard as you swiped. Hit just inside an edge of the rival tile and the gust flips it over. Hit the middle and nothing moves; slam too hard and your tile bounces away. On the bar at the right, the green line is the power needed to flip and the red line is where it bounces. Later tiles are thicker and smaller, sit at angles, need two hits, or slide on the ice.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", flips: "めくった {0}/{1}", slams: "残り {0}回", start: "下へさっとスワイプして、めんこの縁の上で指を離そう", win: "ぜんぶ勝ち取った！", lose: "回数切れ", power: "力 {0}%",
    again: "もう一度", next: "次の面", double: "二重折り", ice: "凍った路地",
    r: { flip: "めくれた!", wobble: "浮いた! もう一回", weak: "力が足りない", miss: "外れた", over: "強すぎて跳ねた" },
    help: "相手のタクチ(折り紙めんこ)が地面にあります。下へさっとスワイプして指を離すと、離した場所に自分のタクチがスワイプの速さで叩きつけられます。相手の縁のすぐ内側を叩くと風が入ってめくれます。真ん中では動かず、強すぎると自分のタクチが跳ねてしまいます。右のバーの緑の線はめくるのに必要な力、赤い線は跳ねる力です。後半はタクチが厚く小さくなり、斜めに置かれたり、二回叩く必要があったり、氷の上で滑ったりします。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", flips: "翻过 {0}/{1}", slams: "剩余 {0}次", start: "向下一划，在纸板边缘上方松手", win: "对手的纸板全赢来了！", lose: "机会用完了", power: "力量 {0}%",
    again: "再玩一次", next: "下一关", double: "双层折纸板", ice: "结冰小巷",
    r: { flip: "翻过来了!", wobble: "掀起来了! 再来一次", weak: "力气不够", miss: "没打中", over: "太用力，弹开了" },
    help: "对手的折纸板(ttakji)放在地上。在屏幕上快速向下划再松手，你的纸板就会以划动的速度砸在松手的位置。砸在对手纸板边缘内侧一点点，风就会把它掀翻。砸在正中间纹丝不动，太用力则你的纸板会弹开。右侧力量条上，绿线是翻面所需的力量，红线是会弹开的力量。越往后纸板越厚越小，还会斜放、需要砸两次，或在冰上滑动。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", flips: "Retournés {0}/{1}", slams: "Coups restants {0}", start: "Glissez vers le bas et lâchez au-dessus du bord", win: "Tous les ttakji sont à vous !", lose: "Plus de coups", power: "Force {0} %",
    again: "Rejouer", next: "Niveau suivant", double: "Double pliage", ice: "Ruelle verglacée",
    r: { flip: "Retourné !", wobble: "Il s'est soulevé ! Encore", weak: "Pas assez fort", miss: "Raté", over: "Trop fort, il a rebondi" },
    help: "Le ttakji (carré de papier plié) de votre rival est au sol. Glissez vers le bas puis lâchez : votre carré s'abat là où votre doigt quitte l'écran, aussi fort que votre geste. Frappez juste à l'intérieur d'un bord et le souffle le retourne. Au centre rien ne bouge ; trop fort, votre carré rebondit. Sur la barre de droite, la ligne verte est la force qu'il faut pour retourner, la rouge celle où ça rebondit. Plus loin, les carrés sont plus épais et plus petits, posés de biais, à frapper deux fois, ou glissent sur la glace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", flips: "Volteados {0}/{1}", slams: "Golpes {0}", start: "Desliza hacia abajo y suelta sobre el borde", win: "¡Ganaste todos los ttakji!", lose: "Sin golpes", power: "Fuerza {0}%",
    again: "Otra vez", next: "Siguiente nivel", double: "Doble pliegue", ice: "Callejón helado",
    r: { flip: "¡Volteado!", wobble: "¡Se levantó! Otra vez", weak: "Muy flojo", miss: "Fallaste", over: "Muy fuerte, rebotó" },
    help: "El ttakji (cuadro de papel doblado) de tu rival está en el suelo. Desliza hacia abajo y suelta: tu cuadro cae donde el dedo deja la pantalla, tan fuerte como deslizaste. Golpea justo dentro de un borde y la ráfaga lo voltea. En el centro no se mueve; demasiado fuerte y tu cuadro rebota. En la barra de la derecha, la línea verde es la fuerza para voltear y la roja donde rebota. Más adelante los cuadros son más gruesos y pequeños, están torcidos, piden dos golpes o resbalan en el hielo.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ttakji-flip:muted";
const TILE_COLORS = [
  { a: "#e03131", b: "#1971c2" },
  { a: "#f08c00", b: "#2f9e44" },
  { a: "#7048e8", b: "#fab005" },
  { a: "#0c8599", b: "#e64980" },
];

/** A folded ttakji, 12×12: two paper colours meeting on the diagonals, with a dark rim. */
function tileArt(a: string, b: string, back: boolean): PixelArt {
  const rows: string[] = [];
  for (let y = 0; y < 12; y++) {
    let r = "";
    for (let x = 0; x < 12; x++) {
      if (x === 0 || y === 0 || x === 11 || y === 11) r += "k";
      else if (back) r += (x > 2 && x < 9 && y > 2 && y < 9) ? (x === y || x + y === 11 ? "k" : "b") : "a";
      else if (x === y || x + y === 11) r += "k";
      else r += (x < y) === (x + y < 11) ? "a" : "b";
    }
    rows.push(r);
  }
  return { palette: { a, b, k: "#212529" }, rows };
}
const FRONT = TILE_COLORS.map((p) => tileArt(p.a, p.b, false));
const BACK = TILE_COLORS.map((p) => tileArt(p.b, p.a, true));
const MINE = tileArt("#ffd43b", "#495057", false);

const KID: PixelArt = {
  palette: { h: "#343a40", s: "#f1c27d", r: "#c92a2a", w: "#fff", c: "#1c7ed6", k: "#212529", y: "#fab005" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", ".sssss..", "rrrrrrrr", ".cccccc.", "ccyccycc", "cccccccc", ".cc..cc.", ".kk..kk."],
};
const SNOW: PixelArt = { palette: { w: "#ffffff", g: "#dee2e6" }, rows: [".ww.", "wwww", "gwwg"] };

interface Slam { x: number; y: number; t: number; result: SlamResult; dir: number }
interface Flip { tile: Tile; x: number; y: number; t: number }
interface Pop { x: number; y: number; text: string; t: number; color: string }

function drawTile(ctx: CanvasRenderingContext2D, art: PixelArt, x: number, y: number, size: number, angle: number, squash = 1): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.scale(size / 48, (size / 48) * squash);
  drawSprite(ctx, art, 0, 0, { scale: 4 });
  ctx.restore();
}

export default function TtakjiFlip({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ flips: 0, slams: LEVELS[0].slams, power: -1 });
  const [over, setOver] = useState<null | { won: boolean; stars: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<TtakjiState>(newTtakji(0));
  const drag = useRef<null | { id: number; pts: Array<{ x: number; y: number; t: number }> }>(null);
  const meter = useRef(0);
  const slams = useRef<Slam[]>([]);
  const flips = useRef<Flip[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const level = LEVELS[stage];

  useRunRecord(TTAKJI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newTtakji(st);
    drag.current = null;
    slams.current = [];
    flips.current = [];
    parts.current = [];
    pops.current = [];
    meter.current = 0;
    setOver(null);
    setTouched(false);
    setHud({ flips: 0, slams: LEVELS[st].slams, power: -1 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TTAKJI_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      stepTtakji(s, dt);
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      for (const sl of slams.current) sl.t += dt;
      slams.current = slams.current.filter((sl) => sl.t < 1.1);
      for (const f of flips.current) f.t += dt;
      flips.current = flips.current.filter((f) => f.t < 0.9);
      if (!drag.current) meter.current = Math.max(0, meter.current - dt * 1.5);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const ice = s.level.tiles.some((tl) => tl.slide > 0);
        // a winter alley: wall at the top, packed snow or ice on the ground
        ctx.fillStyle = "#cfd8e3";
        ctx.fillRect(0, 0, FIELD_W, 120);
        ctx.fillStyle = "#b5c0cd";
        for (let y = 12; y < 120; y += 18) for (let x = (y / 18) % 2 ? 0 : 20; x < FIELD_W; x += 40) ctx.fillRect(x, y, 38, 2);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(0, 112, FIELD_W, 8);
        ctx.fillStyle = ice ? "#d0ebff" : "#efe6d8";
        ctx.fillRect(0, 120, FIELD_W, FIELD_H - 120);
        ctx.fillStyle = ice ? "#a5d8ff" : "#e2d5c0";
        for (let k = 0; k < 26; k++) ctx.fillRect((k * 97) % FIELD_W, 140 + ((k * 61) % 400), ice ? 30 : 6, ice ? 2 : 4);
        for (let k = 0; k < 4; k++) drawSprite(ctx, SNOW, 20 + k * 100, 128 + (k % 2) * 6, { scale: 4 });
        // rival kid watching from the wall
        drawSprite(ctx, KID, 300, 80, { scale: 4 });
        // tiles already won stack up at the top left
        for (let k = 0; k < s.flips; k++) drawTile(ctx, BACK[s.level.tiles[k].color], 26 + k * 14, 76 - k * 3, 36, -0.2 + k * 0.1);

        // the current rival tile
        if (!s.won && s.index < s.level.tiles.length) {
          const tl = s.level.tiles[s.index];
          const p = tileAt(tl, s.time);
          const wob = slams.current.some((sl) => sl.result === "wobble" && sl.t < 0.35) ? Math.sin(t * 40) * 0.08 : 0;
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(Math.round(p.x - tl.size / 2 + 4), Math.round(p.y - tl.size / 2 + 6), tl.size, tl.size);
          drawTile(ctx, FRONT[tl.color], p.x, p.y, tl.size, tl.angle + wob);
          if (tl.hits > 1 && s.hitsLeft > 1) {
            ctx.fillStyle = "#212529";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("×2", p.x, p.y - tl.size / 2 - 8);
          }
          // early stages mark the sweet band just inside the near edge
          if (s.level.stage < 3) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(tl.angle);
            const h = tl.size / 2;
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fillRect(-h + 4, h - SWEET * tl.size - 5, tl.size - 8, 10);
            ctx.fillStyle = "#fab005";
            ctx.fillRect(-h + 6, h - SWEET * tl.size - 3, tl.size - 12, 6);
            ctx.restore();
          }
        }
        // tiles flipping over
        for (const f of flips.current) {
          const k = f.t / 0.9;
          const squash = Math.cos(k * Math.PI * 3);
          const art = squash >= 0 ? FRONT[f.tile.color] : BACK[f.tile.color];
          drawTile(ctx, art, f.x - k * 120, f.y - Math.sin(k * Math.PI) * 120 - k * 150, f.tile.size, f.tile.angle + k * 2, Math.max(0.08, Math.abs(squash)));
        }
        // my tile slamming down
        for (const sl of slams.current) {
          const drop = Math.min(1, sl.t / 0.1);
          const size = 50 * (1.8 - 0.8 * drop);
          let x = sl.x;
          let y = sl.y;
          if (sl.result === "over" && sl.t > 0.1) {
            const k = sl.t - 0.1;
            x += sl.dir * k * 260;
            y -= Math.sin(Math.min(1, k * 2) * Math.PI) * 80 - k * 40;
          }
          const alpha = sl.t > 0.7 ? Math.max(0, 1 - (sl.t - 0.7) / 0.4) : 1;
          ctx.save();
          ctx.globalAlpha = alpha;
          drawTile(ctx, MINE, x, y, size, sl.t * (sl.result === "over" ? 9 : 0));
          ctx.restore();
          if (sl.t >= 0.1 && sl.t < 0.4 && sl.result !== "miss") {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sl.x, sl.y, 20 + (sl.t - 0.1) * 160, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        drawParticles(ctx, parts.current);
        // power meter on the right: green = enough to flip at a perfect edge, red = bounce
        const mx = FIELD_W - 26;
        const top = 170;
        const bot = 520;
        const scaleP = (pw: number) => bot - Math.min(1.25, pw) / 1.25 * (bot - top);
        ctx.fillStyle = "rgba(33,37,41,0.25)";
        ctx.fillRect(mx, top, 14, bot - top);
        const pw = meter.current;
        ctx.fillStyle = pw > OVER ? "#e03131" : "#fab005";
        ctx.fillRect(mx, scaleP(pw), 14, bot - scaleP(pw));
        if (!s.won && s.index < s.level.tiles.length) {
          ctx.fillStyle = "#2f9e44";
          ctx.fillRect(mx - 4, Math.round(scaleP(s.level.tiles[s.index].weight / LIFT)) - 2, 22, 4);
        }
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(mx - 4, Math.round(scaleP(OVER)) - 2, 22, 4);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 14;
          const py = pp.y - (1.2 - pp.t) * 24;
          ctx.fillRect(pp.x - w / 2, py - 18, w, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, pp.x, py);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  /** Swipe speed over the last ~90 ms, counting only the downward part. */
  const speedOf = (pts: Array<{ x: number; y: number; t: number }>): number => {
    const end = pts[pts.length - 1];
    let k = pts.length - 1;
    while (k > 0 && end.t - pts[k - 1].t < 0.09) k--;
    const a = pts[Math.max(0, k - 1)];
    const dtv = Math.max(0.016, end.t - a.t);
    const dy = end.y - a.y;
    if (dy <= 0) return 0;
    return Math.hypot(end.x - a.x, dy) / dtv;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sRef.current.over) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    drag.current = { id: e.pointerId, pts: [{ ...p, t: performance.now() / 1000 }] };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toField(e);
    d.pts.push({ ...p, t: performance.now() / 1000 });
    if (d.pts.length > 40) d.pts.shift();
    meter.current = powerOf(speedOf(d.pts));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const p = toField(e);
    d.pts.push({ ...p, t: performance.now() / 1000 });
    const first = d.pts[0];
    if (p.y - first.y < 30) return; // only a downward swipe throws
    const power = powerOf(speedOf(d.pts));
    meter.current = power;
    const s = sRef.current;
    const tl = s.level.tiles[s.index];
    const at = tileAt(tl, s.time);
    const res = slam(s, p.x, p.y, power);
    if (!res) return;
    slams.current.push({ x: p.x, y: p.y, t: 0, result: res, dir: p.x < at.x ? -1 : 1 });
    const color = res === "flip" ? "#2f9e44" : res === "wobble" ? "#1c7ed6" : res === "over" ? "#c92a2a" : "#e8590c";
    pops.current.push({ x: Math.min(FIELD_W - 90, Math.max(90, p.x)), y: Math.max(200, p.y - 60), text: c.r[res], t: 1.2, color });
    if (res === "flip") {
      flips.current.push({ tile: tl, x: at.x, y: at.y, t: 0 });
      spawnBurst(parts.current, at.x, at.y, ["#ffffff", "#ffd43b", TILE_COLORS[tl.color].a], 24, 170, Math.floor(s.time * 1000));
      sfx("combo");
    } else if (res === "wobble") {
      spawnBurst(parts.current, at.x, at.y, ["#ffffff"], 10, 90, Math.floor(s.time * 1000));
      sfx("success");
    } else sfx(res === "over" ? "fail" : "tap");
    setHud({ flips: s.flips, slams: s.slamsLeft, power: Math.round(power * 100) });
    if (s.over) {
      setOver({ won: s.won, stars: starsFor(s) });
      if (s.won) {
        setCleared(markStageCleared(TTAKJI_SLUG, s.level.stage, STAGE_COUNT));
        sfx("win");
      } else sfx("lose");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="ttakji-flip"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.flips, hud.flips, level.tiles.length)}</Badge>
        <Badge variant="outline">{fill(c.slams, hud.slams)}</Badge>
        {hud.power >= 0 ? <Badge variant="outline">{fill(c.power, hud.power)}</Badge> : null}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>
      {level.tiles.some((tl) => tl.hits > 1) || level.tiles.some((tl) => tl.slide > 0) ? (
        <div className="flex flex-wrap gap-1.5">
          {level.tiles.some((tl) => tl.hits > 1) ? <Badge variant="outline">{c.double}</Badge> : null}
          {level.tiles.some((tl) => tl.slide > 0) ? <Badge variant="outline">{c.ice}</Badge> : null}
        </div>
      ) : null}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (drag.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-10 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
