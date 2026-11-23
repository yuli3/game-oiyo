import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import {
  BOARD_Y, FIELD_H, FIELD_W, LEFT_X, LEVELS, NEOL_SLUG, RIGHT_X, STAGE_COUNT, birdX, newNeol, setSteer, starsFor, stepNeol, tap, timeToLand,
  type Neol, type NeolEvents,
} from "../../lib/games/neol-jump";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; charms: string; jumps: string; falls: string; start: string; win: string; lose: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; perfect: string; good: string; miss: string; fell: string; height: string; windL: string; windR: string;
}> = {
  ko: {
    stage: "{0}단계", charms: "복주머니 {0}/{1}", jumps: "남은 뛰기 {0}", falls: "넘어짐 {0}/{1}", start: "화면을 톡 눌러 뛰어올라요", win: "담장 너머까지 훨훨!", lose: "다리가 풀렸어요",
    again: "다시 하기", next: "다음 단계", perfect: "딱!", good: "좋아", miss: "늦었어", fell: "꽈당!", height: "{0}자", windL: "← 바람", windR: "바람 →",
    help: "널 양 끝에 나와 친구가 서 있어요. 한 사람이 내려앉는 순간 반대편이 튀어 오릅니다. 누가 널에 닿는 바로 그 순간 화면을 톡 누르면 힘이 실려 더 높이 뛰고, 늦거나 안 누르면 점점 낮아져요. 내 차례로 공중에 떠 있을 때 화면을 누른 채 좌우로 끌면 몸이 따라 움직여요. 하늘에 뜬 복주머니를 모두 모으면 통과이고, 내 쪽 널 끝을 벗어나 떨어지면 넘어져요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", charms: "Pouches {0}/{1}", jumps: "Jumps left {0}", falls: "Falls {0}/{1}", start: "Tap to jump", win: "Over the wall and beyond!", lose: "Your legs gave out",
    again: "Play again", next: "Next stage", perfect: "Perfect!", good: "Good", miss: "Late", fell: "Oof!", height: "{0} ft", windL: "← Wind", windR: "Wind →",
    help: "You and a friend stand on the two ends of a long board. When one lands, the other flies up. Tap right as someone lands to put your weight into it and the next jump goes higher; late or missing taps let it fade. While you are in the air, hold and drag sideways to steer. Collect every lucky pouch in the sky to clear the stage, and land back on your end of the board or you fall.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", charms: "福袋 {0}/{1}", jumps: "残りジャンプ {0}", falls: "転倒 {0}/{1}", start: "タップしてジャンプ", win: "塀の向こうまでひとっ飛び！", lose: "足がもつれた",
    again: "もう一度", next: "次の面", perfect: "ぴったり！", good: "いいね", miss: "遅い", fell: "ドテッ！", height: "{0}尺", windL: "← 風", windR: "風 →",
    help: "長い板の両端に自分と友だちが立っています。片方が着地すると反対側が跳ね上がります。誰かが板に着く瞬間にタップすると力が乗ってもっと高く跳び、遅れたり押さなかったりするとだんだん低くなります。自分が空中にいるとき、押したまま左右に引くと体が動きます。空の福袋をすべて集めればクリア、自分の側の板の端から外れて落ちると転びます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", charms: "福袋 {0}/{1}", jumps: "剩余跳跃 {0}", falls: "摔倒 {0}/{1}", start: "点一下起跳", win: "跳过院墙看风景！", lose: "腿软了",
    again: "再玩一次", next: "下一关", perfect: "完美！", good: "不错", miss: "晚了", fell: "哎哟！", height: "{0}尺", windL: "← 风", windR: "风 →",
    help: "长木板两端站着你和朋友。一个人落下时，另一个人就会弹起。在有人落到木板上的那一刻点一下屏幕，就能借上力跳得更高；点晚了或不点，就会越跳越低。轮到你在空中时，按住屏幕左右拖动就能移动身体。收集天上所有福袋即可过关，没落回自己这端的木板就会摔倒。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", charms: "Bourses {0}/{1}", jumps: "Sauts restants {0}", falls: "Chutes {0}/{1}", start: "Touchez pour sauter", win: "Par-dessus le mur !", lose: "Vos jambes ont lâché",
    again: "Rejouer", next: "Niveau suivant", perfect: "Parfait !", good: "Bien", miss: "En retard", fell: "Aïe !", height: "{0} pieds", windL: "← Vent", windR: "Vent →",
    help: "Vous et une amie êtes aux deux bouts d'une longue planche. Quand l'une atterrit, l'autre s'envole. Touchez l'écran pile au moment où quelqu'un atterrit pour y mettre votre poids : le saut suivant monte plus haut ; en retard ou sans toucher, il faiblit. En l'air, gardez le doigt et glissez de côté pour vous diriger. Ramassez toutes les bourses porte-bonheur pour réussir, et retombez sur votre bout de planche sinon c'est la chute.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", charms: "Bolsas {0}/{1}", jumps: "Saltos {0}", falls: "Caídas {0}/{1}", start: "Toca para saltar", win: "¡Por encima del muro!", lose: "Te fallaron las piernas",
    again: "Otra vez", next: "Siguiente nivel", perfect: "¡Perfecto!", good: "Bien", miss: "Tarde", fell: "¡Ay!", height: "{0} pies", windL: "← Viento", windR: "Viento →",
    help: "Tú y una amiga estáis en los dos extremos de una tabla larga. Cuando una cae, la otra sale volando. Toca justo cuando alguien aterriza para cargar tu peso y el siguiente salto sube más; si tocas tarde o no tocas, se va apagando. En el aire, mantén el dedo y arrástralo de lado para moverte. Recoge todas las bolsitas de la suerte para superar el nivel y vuelve a caer en tu extremo de la tabla o te caerás.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:neol-jump:muted";

const GIRL: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#e03131", y: "#ffd43b", w: "#ffffff", p: "#f783ac", g: "#2f9e44", b: "#a61e4d" },
  rows: ["...kkk...", "..kkkkk..", "..ksssk.k", "..sksks.k", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."],
};
const FRIEND: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#1c7ed6", y: "#f783ac", w: "#ffffff", b: "#1864ab" },
  rows: ["...kkk...", "..kkkkk..", "k.ksssk..", "k.sksks..", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."],
};
const POUCH: PixelArt = {
  palette: { r: "#e03131", d: "#a61e1e", y: "#ffd43b", k: "#5c3d2e" },
  rows: ["..y.y..", "...k...", ".rrrrr.", "rrryrrr", "rryyyrr", "rrryrrr", ".rdddr."],
};
const MAGPIE_A: PixelArt = { palette: { k: "#1b1f3b", w: "#ffffff", b: "#1c7ed6" }, rows: ["k.......", "kk...kk.", ".kkwkkkk", "..wwkkbb", "...k...."] };
const MAGPIE_B: PixelArt = { palette: { k: "#1b1f3b", w: "#ffffff", b: "#1c7ed6" }, rows: ["........", ".....kk.", "kkkwkkkk", ".kwwkkbb", "kk.k...."] };
const ROOF: PixelArt = {
  palette: { d: "#343a40", g: "#495057", w: "#f1f3f5", r: "#c92a2a", y: "#e9c46a" },
  rows: ["d..................d", "dd................dd", ".dddddddddddddddddd.", "..gggggggggggggggg..", "..wwwrwwwwwwwwrwww..", "..wwwrwyywwyywrwww..", "..wwwrwyywwyywrwww.."],
};

const SKY: BackdropSpec = { sky: ["#74c0fc", "#a5d8ff", "#e7f5ff"], ground: ["#f8f9fa", "#e9ecef"], groundShare: 0.12, hills: "#dee2e6", seed: 9 };
const WALL_H = 120; // the village wall seen behind the board

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function NeolJump({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ got: 0, jumps: 0, falls: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Neol>(newNeol(0));
  const drag = useRef<null | { id: number; x0: number; p0: number }>(null);
  const cam = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const level = LEVELS[stage];
  useRunRecord(NEOL_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const handle = useCallback((ev: NeolEvents) => {
    const s = sRef.current;
    if (ev.launched) {
      const q = ev.launched.q;
      const x = ev.launched.who === "player" ? LEFT_X : RIGHT_X;
      pops.current.push({ x, y: BOARD_Y + cam.current - 70, text: q === "perfect" ? c.perfect : q === "good" ? c.good : c.miss, t: 0.9, color: q === "perfect" ? "#f08c00" : q === "good" ? "#2f9e44" : "#868e96" });
      if (q === "perfect") spawnBurst(parts.current, x, BOARD_Y + cam.current - 10, ["#ffd43b", "#ffffff", "#f783ac"], 12, 100, Math.floor(s.time * 100));
      sfx(q === "perfect" ? "combo" : q === "good" ? "place" : "tap");
    }
    if (ev.charm) {
      spawnBurst(parts.current, s.px, BOARD_Y - s.h + cam.current, ["#ffd43b", "#e03131", "#ffffff"], 16, 120, Math.floor(s.time * 50));
      sfx("success");
    }
    if (ev.bird) sfx("fail");
    if (ev.fell) {
      pops.current.push({ x: s.px, y: BOARD_Y - 60, text: c.fell, t: 1.1, color: "#e03131" });
      sfx("fail");
    }
    if (ev.charm || ev.fell || ev.launched) setHud({ got: s.charms.filter((x) => x.got).length, jumps: s.jumps, falls: s.falls });
  }, [c.fell, c.good, c.miss, c.perfect, sfx]);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newNeol(st);
    drag.current = null;
    cam.current = 0;
    parts.current = [];
    pops.current = [];
    setTouched(false);
    setOver(null);
    setHud({ got: 0, jumps: 0, falls: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(NEOL_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = sRef.current;
      const l = s.level;
      if (!s.over) {
        const ev = stepNeol(s, dt);
        handle(ev);
        if (s.over) {
          setHud({ got: s.charms.filter((x) => x.got).length, jumps: s.jumps, falls: s.falls });
          setOver({ won: s.won, stars: s.won ? starsFor(s) : 0 });
          if (s.won) {
            setCleared(markStageCleared(NEOL_SLUG, l.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      // camera follows the player up, gently
      const ph = s.air === "player" ? s.h : 0;
      const want = Math.max(0, ph - 230);
      cam.current += (want - cam.current) * Math.min(1, dt * 6);
      const cy = cam.current;
      stepParticles(parts.current, dt, 160);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKY, 4);
        const Y = (h: number) => Math.round(BOARD_Y - h + cy);
        // village wall and the roofs beyond it (the view the jumpers want to see)
        const wallTop = Y(WALL_H);
        for (let k = 0; k < 4; k++) drawSprite(ctx, ROOF, 45 + k * 92, wallTop - 30 + (k % 2) * 8, { scale: 4 });
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(0, wallTop, FIELD_W, Y(0) - wallTop + 40);
        ctx.fillStyle = "#868e96";
        for (let y = wallTop + 8; y < Y(0) + 40; y += 16) for (let x = ((y / 16) % 2) * 14; x < FIELD_W; x += 28) ctx.fillRect(x, y, 24, 2);
        ctx.fillStyle = "#495057";
        ctx.fillRect(0, wallTop - 8, FIELD_W, 10);
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, Y(0) + 40, FIELD_W, FIELD_H);
        // height marks
        ctx.fillStyle = "rgba(33,37,41,0.35)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        for (let h = 100; h < 900; h += 100) {
          const y = Y(h);
          if (y < 0 || y > FIELD_H) continue;
          ctx.fillRect(0, y, 8, 2);
          ctx.fillText(fill(c.height, h / 20), 10, y + 4);
        }
        // charms
        for (const ch of s.charms) {
          if (ch.got) continue;
          const bob = Math.sin(now / 300 + ch.h) * 3;
          drawSprite(ctx, POUCH, ch.x, Y(ch.h) + bob, { scale: 4 });
        }
        // magpies
        for (const b of l.birds) {
          const bx = birdX(b, s.time);
          drawSprite(ctx, Math.floor(now / 160) % 2 ? MAGPIE_A : MAGPIE_B, bx, Y(b.h), { scale: 4, flipX: b.speed < 0 });
        }
        // the board on its straw bundle, tilted toward whoever is down
        const tilt = s.air === "friend" ? 1 : s.air === "player" ? -1 : 0;
        ctx.fillStyle = "#d4a373";
        ctx.fillRect(166, Y(0) + 4, 28, 16);
        ctx.fillStyle = "#a47148";
        ctx.fillRect(170, Y(0) + 8, 20, 2);
        for (let x = LEFT_X - 30; x <= RIGHT_X + 30; x += 4) {
          const t = (x - 180) / (RIGHT_X - LEFT_X + 60);
          const y = Y(0) + Math.round(t * tilt * -14);
          ctx.fillStyle = "#8a5a3b";
          ctx.fillRect(x, y, 4, 6);
        }
        // landing ring: shrinks onto the end that is about to be landed on
        if (s.air) {
          const t = timeToLand(s);
          if (t < 0.8) {
            const rx = s.air === "player" ? LEFT_X : RIGHT_X;
            const rr = 10 + t * 70;
            ctx.strokeStyle = t < 0.06 ? "#f08c00" : "rgba(240,140,0,0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(rx, Y(0) - 2, rr, Math.PI, 2 * Math.PI);
            ctx.stroke();
          }
        }
        // the two jumpers
        const crouch = (who: "player" | "friend") => (s.air === who ? 0 : 4);
        if (s.fallen > 0) {
          drawSprite(ctx, GIRL, s.px, Y(0) + 34, { scale: 4, rotate: Math.PI / 2 });
        } else {
          const ph2 = s.air === "player" ? s.h : 0;
          drawSprite(ctx, GIRL, s.air === "player" ? s.px : LEFT_X, Y(ph2) - 26 + crouch("player"), { scale: 4 });
        }
        const fh = s.air === "friend" ? s.h : 0;
        drawSprite(ctx, FRIEND, RIGHT_X, Y(fh) - 26 + crouch("friend"), { scale: 4 });
        // landing spot marker on your end
        ctx.fillStyle = "rgba(47,158,68,0.5)";
        ctx.fillRect(Math.round(LEFT_X - l.zone), Y(0) + 10, Math.round(l.zone * 2), 3);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, Math.max(40, Math.min(FIELD_W - 40, p.x)), p.y - (1 - p.t) * 20);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.height, handle, sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over) return;
    setTouched(true);
    const p = toField(e);
    handle(tap(s));
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x0: p.x, p0: s.air === "player" ? s.px : LEFT_X };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const s = sRef.current;
    const p = toField(e);
    if (s.air === "player") setSteer(s, d.p0 + (p.x - d.x0) * 1.3);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setSteer(sRef.current, null);
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
      data-game="neol-jump"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.charms, hud.got, level.charms.length)}</Badge>
        <Badge variant="outline">{fill(c.jumps, Math.max(0, level.jumps - hud.jumps))}</Badge>
        <Badge variant="outline">{fill(c.falls, hud.falls, level.falls)}</Badge>
        {level.wind ? <Badge variant="outline">{level.wind < 0 ? c.windL : c.windR}</Badge> : null}
        <div className="ml-auto flex gap-1">
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
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.charms, hud.got, level.charms.length)}</p>
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
