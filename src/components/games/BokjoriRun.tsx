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
import { BOKJORI_SLUG, GROUND_Y, RUNNER_SX, STAGE_COUNT, VIEW_H, VIEW_W, jump, levelFor, newRun, power, release, starsFor, startCharge, stepRun, yardEnd, yardStart, type Run, type RunEvents } from "../../lib/games/bokjori-run";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; left: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; yard: string; wrong: string; wall: string; roof: string; alley: string; bitten: string; jump: string; toss: string;
}> = {
  ko: {
    stage: "{0}단계", score: "배달 {0}/{1}", left: "복조리 {0}", start: "왼쪽 톡: 점프 · 오른쪽 꾹 눌렀다 떼기: 던지기", win: "복 배달 완료!", lose: "배달이 모자랐어요", result: "{0}집 배달 · 잘못 {1}",
    again: "다시 하기", next: "다음 단계", yard: "복 받으세요!", wrong: "불 꺼진 집이에요", wall: "담에 맞았어요", roof: "지붕에 걸렸어요", alley: "골목에 떨어졌어요", bitten: "멍! 하나 떨어뜨렸어요", jump: "점프", toss: "던지기",
    help: "섣달그믐 밤, 새해 복을 담으라고 집집마다 담 너머로 복조리를 던져 넣던 풍습이 있었어요. 골목을 달리며 화면 오른쪽을 꾹 누르면 힘이 모이고, 손을 떼면 복조리가 포물선을 그리며 날아가요. 오래 누를수록 멀리 날아요. 담을 넘어 마당에 떨어지면 배달 성공이에요. 등불이 켜진 집만 복조리를 기다리고, 불 꺼진 집에 던지면 점수가 깎여요. 담에 맞거나 마당을 넘겨 지붕에 걸리면 놓쳐요. 화면 왼쪽을 누르면 점프해 강아지를 넘어요. 부딪히면 넘어져 복조리를 하나 떨어뜨려요. 키보드는 ↑(점프), → 꾹 눌렀다 떼기(던지기).",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", score: "Delivered {0}/{1}", left: "Strainers {0}", start: "Tap left: jump · hold and release right: throw", win: "All the luck delivered!", lose: "Not enough deliveries", result: "{0} homes · {1} wrong",
    again: "Run again", next: "Next stage", yard: "Good luck to you!", wrong: "That house is dark", wall: "Hit the wall", roof: "Stuck on the roof", alley: "Dropped in the alley", bitten: "Woof! Dropped one", jump: "Jump", toss: "Throw",
    help: "On the last night of the lunar year, Koreans tossed bokjori, little rice strainers for scooping up the new year's luck, over the walls into each courtyard. Run down the alley and hold the right side of the screen to wind up, then let go: the strainer flies in an arc, and the longer you hold the further it goes. Over the wall and into the yard is a delivery. Only houses with a lit lantern are waiting for one; a strainer in a dark house counts against you. Hitting the wall or sailing over the yard onto the roof loses it. Tap the left side to jump the dogs; run into one and you stumble and drop a strainer. Keyboard: ↑ to jump, hold and release → to throw.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", score: "配達 {0}/{1}", left: "ポクチョリ {0}", start: "左タップ: ジャンプ · 右を長押しして離す: 投げる", win: "福の配達完了！", lose: "配達が足りません", result: "{0}軒配達 · 間違い {1}",
    again: "もう一度", next: "次の面", yard: "福をどうぞ！", wrong: "明かりの消えた家です", wall: "塀に当たった", roof: "屋根に引っかかった", alley: "路地に落ちた", bitten: "ワン！ひとつ落とした", jump: "ジャンプ", toss: "投げる",
    help: "旧暦の大みそかの夜、新年の福をすくい取るようにと、家々の塀越しに福のざる(ポクチョリ)を投げ入れる風習がありました。路地を走りながら画面の右を長押しすると力がたまり、離すとポクチョリが弧を描いて飛びます。長く押すほど遠くへ。塀を越えて庭に落ちれば配達成功。明かりのともった家だけが待っていて、明かりの消えた家に投げると減点です。塀に当たったり庭を越えて屋根に乗ったりすると失敗。画面の左を押すとジャンプして犬を飛び越えます。ぶつかると転んでポクチョリをひとつ落とします。キーボードは ↑(ジャンプ)、→ 長押しして離す(投げる)。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", score: "送达 {0}/{1}", left: "福笊篱 {0}", start: "点左边：跳 · 按住右边再松开：扔", win: "福气全送到啦！", lose: "送得不够", result: "送了 {0} 家 · 送错 {1}",
    again: "再跑一次", next: "下一关", yard: "新年有福！", wrong: "那家没亮灯", wall: "撞到墙了", roof: "挂在屋顶上了", alley: "掉在胡同里", bitten: "汪！掉了一个", jump: "跳", toss: "扔",
    help: "农历除夕夜，韩国有把福笊篱（복조리，捞福的小米筛）隔着院墙扔进各家院子的习俗，寓意捞起新年的福气。沿着胡同奔跑，按住屏幕右边蓄力，松手福笊篱就划着弧线飞出去，按得越久飞得越远。越过院墙落进院子就算送达。只有亮着灯笼的人家在等福笊篱，扔进没亮灯的人家会扣分。撞到墙或飞过院子挂到屋顶上就失败了。点屏幕左边跳过小狗，撞上会摔倒并掉一个福笊篱。键盘：↑ 跳，按住 → 再松开扔。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", score: "Livrés {0}/{1}", left: "Passoires {0}", start: "Touchez à gauche : sauter · maintenez puis lâchez à droite : lancer", win: "Toute la chance est livrée !", lose: "Pas assez de livraisons", result: "{0} maisons · {1} erreurs",
    again: "Recourir", next: "Niveau suivant", yard: "Bonne chance à vous !", wrong: "Cette maison est éteinte", wall: "Contre le mur", roof: "Coincé sur le toit", alley: "Tombé dans la ruelle", bitten: "Ouaf ! Une de perdue", jump: "Sauter", toss: "Lancer",
    help: "La dernière nuit de l'année lunaire, les Coréens lançaient des bokjori, petites passoires à riz pour « ramasser » la chance de l'année, par-dessus les murs dans chaque cour. Courez dans la ruelle et maintenez le côté droit de l'écran pour prendre de l'élan, puis lâchez : la passoire vole en arc, d'autant plus loin que vous avez maintenu longtemps. Par-dessus le mur et dans la cour, c'est livré. Seules les maisons à la lanterne allumée en attendent une ; une passoire chez une maison éteinte compte contre vous. Toucher le mur ou dépasser la cour jusqu'au toit la fait perdre. Touchez le côté gauche pour sauter les chiens ; en percuter un vous fait trébucher et perdre une passoire. Clavier : ↑ pour sauter, maintenir puis lâcher → pour lancer.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", score: "Entregados {0}/{1}", left: "Coladores {0}", start: "Toca a la izquierda: saltar · mantén y suelta a la derecha: lanzar", win: "¡Toda la suerte entregada!", lose: "Faltaron entregas", result: "{0} casas · {1} errores",
    again: "Correr otra vez", next: "Siguiente nivel", yard: "¡Buena suerte!", wrong: "Esa casa está apagada", wall: "Contra el muro", roof: "Atascado en el tejado", alley: "Cayó en el callejón", bitten: "¡Guau! Se te cayó uno", jump: "Saltar", toss: "Lanzar",
    help: "La última noche del año lunar, los coreanos lanzaban bokjori, pequeños coladores de arroz para «recoger» la suerte del año nuevo, por encima de los muros a cada patio. Corre por el callejón y mantén el lado derecho de la pantalla para cargar, luego suelta: el colador vuela en arco, y cuanto más mantienes, más lejos llega. Por encima del muro y dentro del patio es una entrega. Solo las casas con el farol encendido esperan uno; un colador en una casa apagada cuenta en tu contra. Si da en el muro o pasa el patio y cae en el tejado, se pierde. Toca el lado izquierdo para saltar a los perros; si chocas con uno, tropiezas y se te cae un colador. Teclado: ↑ para saltar, mantén y suelta → para lanzar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bokjori-run:muted";

const RUNNER: PixelArt = {
  palette: { k: "#212529", h: "#343a40", s: "#f1c27d", r: "#c92a2a", w: "#f8f9fa", y: "#e9c46a", b: "#5c3a21" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "yrrrrrr.", "yyrrrrrs", "yyrrrrr.", ".wwwwww.", ".bb..bb.", ".kk..kk."],
};
const RUNNER_B: PixelArt = { palette: RUNNER.palette, rows: [...RUNNER.rows.slice(0, 9), "..bbbb..", "..k..k.."] };
const DOG: PixelArt = {
  palette: { b: "#a0522d", d: "#6b3a1e", k: "#212529", w: "#f8f9fa", p: "#f783ac" },
  rows: ["d.........", "dd.....bb.", ".bbbbbbbkb", ".bbbbbbbbp", ".bwwbbbbb.", ".b.b..b.b.", ".d.d..d.d."],
};
const STRAINER: PixelArt = { palette: { y: "#e9c46a", d: "#b8893a", r: "#c92a2a" }, rows: ["..rr..", ".dyyd.", "dyyyyd", "dydyyd", ".dyyd.", "..dd.."] };
const LANTERN: PixelArt = { palette: { r: "#e03131", y: "#ffd43b", k: "#5c3a21" }, rows: ["..k..", ".rrr.", "ryyyr", "ryyyr", ".rrr.", "..k.."] };
const LANTERN_OFF: PixelArt = { palette: { r: "#495057", y: "#868e96", k: "#343a40" }, rows: LANTERN.rows };

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function BokjoriRun({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ got: 0, left: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number; got: number; wrong: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Run | null>(null);
  const started = useRef(false);
  const input = useRef<Array<"jump" | "charge" | "throw">>([]);
  const throwId = useRef<number | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(BOKJORI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    const r = newRun(levelFor(st));
    rRef.current = r;
    started.current = false;
    input.current = [];
    throwId.current = null;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ got: 0, left: r.left });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BOKJORI_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const handle = useCallback((r: Run, ev: RunEvents) => {
    const sx = (x: number) => RUNNER_SX + (x - r.x);
    const cp = copyRef.current;
    for (const s of ev.landed) {
      const good = s.result === "yard" && s.house >= 0 && r.level.houses[s.house].wants;
      const text = s.result === "yard" ? (good ? cp.yard : cp.wrong) : s.result === "wall" ? cp.wall : s.result === "roof" ? cp.roof : cp.alley;
      pops.current.push({ x: sx(s.x), y: GROUND_Y - s.y - 40, text, t: 1, color: good ? "#2f9e44" : "#e03131" });
      if (good) spawnBurst(parts.current, sx(s.x), GROUND_Y - s.y - 6, ["#ffd43b", "#e03131", "#ffffff"], 16, 120, Math.floor(r.time * 1000));
      sfx(good ? "success" : "fail");
    }
    if (ev.bitten) {
      pops.current.push({ x: RUNNER_SX + 30, y: GROUND_Y - 70, text: cp.bitten, t: 1, color: "#e8590c" });
      sfx("fail");
    }
    if (ev.landed.length || ev.bitten) setHud({ got: r.delivered.filter(Boolean).length, left: r.left });
    if (ev.finish) {
      setOver({ won: r.won, stars: starsFor(r), got: r.delivered.filter(Boolean).length, wrong: r.wrong });
      if (r.won) {
        setCleared(markStageCleared(BOKJORI_SLUG, r.level.stage, STAGE_COUNT));
        sfx("win");
      } else sfx("lose");
    }
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const r = rRef.current;
      if (r) {
        // inputs land once per frame, in order
        for (const e of input.current.splice(0)) {
          if (e === "jump") { if (jump(r)) sfx("tap"); }
          else if (e === "charge") startCharge(r);
          else if (release(r)) { sfx("place"); setHud({ got: r.delivered.filter(Boolean).length, left: r.left }); }
        }
        if (started.current && !r.over) handle(r, stepRun(r, dt));
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && r) {
        ctx.imageSmoothingEnabled = false;
        const l = r.level;
        const sx = (x: number) => Math.round(RUNNER_SX + (x - r.x));
        // New Year's Eve night sky, a big moon, the alley
        const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        g.addColorStop(0, "#0b1026");
        g.addColorStop(1, "#2f3c78");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#ffffff";
        for (let k = 0; k < 30; k++) ctx.fillRect((k * 97 + 13) % VIEW_W, (k * 53) % 220, 2, 2);
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(290, 70, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5c4a3a";
        ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
        ctx.fillStyle = "#e7f0f8";
        ctx.fillRect(0, GROUND_Y, VIEW_W, 4);
        ctx.fillStyle = "#4a3b2e";
        for (let x = -(r.x % 40); x < VIEW_W; x += 40) ctx.fillRect(Math.round(x), GROUND_Y + 14, 22, 3);
        // houses: front wall or gate-house, yard, hanok with its lantern
        for (const hs of l.houses) {
          const x0 = sx(hs.wall);
          const face = sx(yardEnd(hs));
          if (face < -80 || x0 > VIEW_W + 40) continue;
          // the house behind the yard
          ctx.fillStyle = "#e9dcc3";
          ctx.fillRect(face, GROUND_Y - hs.houseH, 70, hs.houseH);
          ctx.fillStyle = "#8a5a3b";
          for (let k = 0; k < 3; k++) ctx.fillRect(face + 6 + k * 22, GROUND_Y - hs.houseH + 18, 4, hs.houseH - 18);
          ctx.fillStyle = "#343a40";
          ctx.beginPath();
          ctx.moveTo(face - 10, GROUND_Y - hs.houseH + 4);
          ctx.lineTo(face + 35, GROUND_Y - hs.houseH - 22);
          ctx.lineTo(face + 80, GROUND_Y - hs.houseH + 4);
          ctx.fill();
          drawSprite(ctx, hs.wants ? LANTERN : LANTERN_OFF, face + 35, GROUND_Y - hs.houseH + 30, { scale: 3 });
          if (hs.wants) {
            ctx.fillStyle = "rgba(255,212,59,0.2)";
            ctx.beginPath();
            ctx.arc(face + 35, GROUND_Y - hs.houseH + 30, 24 + Math.sin(t * 4 + hs.wall) * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          // the yard (lit or dark) and the front wall
          ctx.fillStyle = hs.wants ? "#d8c9a3" : "#8f8670";
          ctx.fillRect(sx(yardStart(hs)), GROUND_Y - 4, face - sx(yardStart(hs)), 6);
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(x0, GROUND_Y - hs.wallH, sx(hs.wall + hs.front) - x0, hs.wallH);
          ctx.fillStyle = "#495057";
          ctx.fillRect(x0 - 3, GROUND_Y - hs.wallH - 6, sx(hs.wall + hs.front) - x0 + 6, 8);
          ctx.fillStyle = "#868e96";
          for (let y = GROUND_Y - hs.wallH + 10; y < GROUND_Y; y += 14) ctx.fillRect(x0, y, sx(hs.wall + hs.front) - x0, 2);
        }
        for (const d of l.dogs) {
          const x = sx(d);
          if (x < -30 || x > VIEW_W + 30) continue;
          drawSprite(ctx, DOG, x, GROUND_Y - 12 - (Math.floor(t * 6) % 2), { scale: 3 });
        }
        if (started.current && !r.over) {
          // flying strainers and the throw guide
          for (const s of r.flying) {
            if (s.done && s.result !== "roof" && s.result !== "yard" && s.result !== "wall") continue;
            drawSprite(ctx, STRAINER, sx(s.x), GROUND_Y - s.y - 6, { scale: 3, rotate: s.done ? 0 : r.time * s.spin });
          }
        } else for (const s of r.flying) if (s.result === "yard" || s.result === "roof") drawSprite(ctx, STRAINER, sx(s.x), GROUND_Y - s.y - 6, { scale: 3 });
        if (r.charging) {
          const p = power(r.charge);
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(RUNNER_SX - 30, GROUND_Y - 110, 8, 60);
          ctx.fillStyle = p >= 1 ? "#e03131" : "#ffd43b";
          ctx.fillRect(RUNNER_SX - 30, GROUND_Y - 50 - 60 * p, 8, 60 * p);
        }
        const bob = Math.floor(r.time * 8) % 2;
        drawSprite(ctx, bob ? RUNNER : RUNNER_B, RUNNER_SX, GROUND_Y - 17 - r.y, { scale: 3, rotate: r.stumble > 0 ? 0.6 : 0 });
        drawParticles(ctx, parts.current);
        // the two touch zones
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(0, VIEW_H - 64, VIEW_W / 2 - 2, 64);
        ctx.fillRect(VIEW_W / 2 + 2, VIEW_H - 64, VIEW_W / 2 - 2, 64);
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(`▲ ${copyRef.current.jump}`, VIEW_W / 4, VIEW_H - 26);
        ctx.fillText(`${copyRef.current.toss} ⤴`, (VIEW_W * 3) / 4, VIEW_H - 26);
        // progress
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(16, 16, VIEW_W - 32, 4);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(16, 16, Math.min(1, r.x / l.length) * (VIEW_W - 32), 4);
        for (const p of pops.current) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          const w = ctx.measureText(p.text).width + 12;
          const px = Math.max(w / 2 + 4, Math.min(VIEW_W - w / 2 - 4, p.x));
          ctx.fillRect(px - w / 2, p.y - (1 - p.t) * 20 - 17, w, 23);
          ctx.fillStyle = p.color === "#2f9e44" ? "#8ce99a" : "#ffa8a8";
          ctx.fillText(p.text, px, p.y - (1 - p.t) * 20);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handle, sfx]);

  const begin = useCallback(() => {
    if (!started.current) {
      started.current = true;
      setTouched(true);
    }
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowUp" || e.key === " ") { begin(); input.current.push("jump"); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "x" || e.key === "X") { begin(); input.current.push("charge"); e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "x" || e.key === "X") { input.current.push("throw"); e.preventDefault(); }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [begin]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (rRef.current?.over) return;
    begin();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) input.current.push("jump");
    else if (throwId.current === null) {
      throwId.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      input.current.push("charge");
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (throwId.current !== e.pointerId) return;
    throwId.current = null;
    input.current.push("throw");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const level = rRef.current?.level;
  const want = level ? level.houses.filter((h) => h.wants).length : 0;
  return (
    <div
      ref={containerRef}
      data-game="bokjori-run"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.score, hud.got, level?.need ?? 0)}</Badge>
        <Badge variant="outline">{fill(c.left, hud.left)}</Badge>
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, `${over.got}/${want}`, over.wrong)}</p>
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
