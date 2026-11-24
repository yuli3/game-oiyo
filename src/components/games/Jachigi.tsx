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
import { BAT_X, CATCH_H, FIELD_H, FIELD_W, GROUND, JA, JACHIGI_SLUG, LEVELS, REACH_HI, REACH_LO, STAGE_COUNT, SWEET, SWINGS, newJachigi, starsFor, stepJachigi, tap, type Jachigi as JachigiState, type JachigiEvents, type Outcome } from "../../lib/games/jachigi";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; total: string; swing: string; wind: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; ja: string; out: Record<Outcome, string>; flick: string; swish: string;
}> = {
  ko: {
    stage: "{0}단계", total: "{0} / {1}자", swing: "{0}/{1}번째", wind: "바람", start: "톡! 새끼자를 띄우고, 한 번 더 톡! 쳐 내요", win: "목표 거리 넘었다!", lose: "조금 모자랐어요", result: "모두 {0}자",
    again: "다시 하기", next: "다음 단계", ja: "{0}자", flick: "톡!", swish: "헛스윙!",
    out: { none: "", whiff: "헛쳤어요", caught: "잡혔다! 0자", branch: "감나무에 걸렸어요", ditch: "도랑에 멈췄어요", ok: "딱!" },
    help: "겨울 들판에서 하던 자치기예요. 작은 구멍 위에 짧은 막대(새끼자)가 걸쳐 있어요. 화면을 한 번 톡 누르면 긴 막대(어미자)로 새끼자를 튕겨 올리고, 공중에서 빙글 돌 때 한 번 더 누르면 멀리 쳐 내요. 언제 치느냐가 중요해요. 올라가는 중에 낮게 치면 빠르고 납작하게 날아가고, 꼭대기 근처에서 높게 치면 높이 떠요. 초록 줄 높이에서 치면 가장 세게 맞아요. 상대편 아이들은 낮게 날아오는 막대를 잡아 버리니 머리 위로 넘기세요. 뒤 단계에는 바람, 감나무 가지, 얼어붙은 도랑이 나와요. 세 번 친 거리를 '자' 단위로 더해 목표를 넘으면 통과예요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", total: "{0} / {1} ja", swing: "Swing {0}/{1}", wind: "Wind", start: "Tap to flick the short stick up, tap again to whack it", win: "Past the mark!", lose: "Just short", result: "{0} ja in all",
    again: "Play again", next: "Next stage", ja: "{0} ja", flick: "Flick!", swish: "Swish!",
    out: { none: "", whiff: "Missed it", caught: "Caught! 0 ja", branch: "Stuck in the persimmon tree", ditch: "Stopped at the ditch", ok: "Whack!" },
    help: "Jachigi is a Korean stick game played on bare winter fields. A short stick lies across a little hole. Tap once to flick it up with the long stick, then tap again while it tumbles in the air to bat it away. When you hit it matters: hit it low on the way up for a fast, flat drive, or high near the top for a long lob. Hitting at the height of the green line gives the strongest whack. The other team's kids catch anything that flies low past them, so loft it over their heads. Later fields add wind, a persimmon branch and a frozen ditch. Add up three swings in ja (lengths of the long stick) to beat the mark. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", total: "{0} / {1}尺", swing: "{0}/{1}打目", wind: "風", start: "タップで小棒を跳ね上げ、もう一度タップで打とう", win: "目標を超えた！", lose: "あと少し", result: "合計 {0}尺",
    again: "もう一度", next: "次の面", ja: "{0}尺", flick: "ポン！", swish: "空振り！",
    out: { none: "", whiff: "打ちそこねた", caught: "捕られた！ 0尺", branch: "柿の木に引っかかった", ditch: "溝で止まった", ok: "カーン！" },
    help: "チャチギは冬の田畑で遊んだ韓国の棒打ち遊び。小さな穴の上に短い棒(子棒)が渡してあります。一度タップすると長い棒(親棒)で子棒を跳ね上げ、空中でくるくる回っているうちにもう一度タップすると遠くへ打ち飛ばします。いつ打つかが大事。上がる途中で低く打つと速く低い当たり、てっぺん近くで高く打つと高く上がります。緑の線の高さで打つと一番強く当たります。相手チームの子は低く飛んでくる棒をつかまえてしまうので、頭の上を越しましょう。後半は風、柿の木の枝、凍った溝が出てきます。3回打った距離を「尺」で合計して目標を超えればクリア。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", total: "{0} / {1}尺", swing: "第{0}/{1}击", wind: "风", start: "点一下挑起小棍，再点一下把它打出去", win: "超过目标了！", lose: "差一点点", result: "共 {0}尺",
    again: "再玩一次", next: "下一关", ja: "{0}尺", flick: "挑！", swish: "挥空！",
    out: { none: "", whiff: "没打着", caught: "被接住了！0尺", branch: "挂在柿子树上了", ditch: "停在冰沟里", ok: "啪！" },
    help: "打尺（자치기）是韩国冬天在空地上玩的棍子游戏。小坑上横放着一根短棍（小尺）。点一下用长棍（母尺）把小尺挑起来，趁它在空中打转时再点一下把它打远。什么时候打很关键：上升途中低处打，飞得又快又平；接近最高点时高处打，会高高飞起。在绿线的高度打最有力。对方的孩子会接住从他们身边低飞过的棍子，要从他们头顶打过去。后面的关卡会有风、柿子树枝和结冰的水沟。三次击打的距离以“尺”累加，超过目标就过关。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", total: "{0} / {1} ja", swing: "Coup {0}/{1}", wind: "Vent", start: "Touchez pour faire sauter le bâtonnet, touchez encore pour le frapper", win: "Objectif dépassé !", lose: "Juste un peu court", result: "{0} ja au total",
    again: "Rejouer", next: "Niveau suivant", ja: "{0} ja", flick: "Hop !", swish: "Raté !",
    out: { none: "", whiff: "Manqué", caught: "Attrapé ! 0 ja", branch: "Coincé dans le kaki", ditch: "Arrêté au fossé", ok: "Tac !" },
    help: "Le jachigi est un jeu de bâtons coréen joué dans les champs nus de l'hiver. Un petit bâton repose en travers d'un trou. Touchez une fois pour le faire sauter avec le grand bâton, puis encore pendant qu'il tournoie pour le frapper au loin. Le moment compte : frappé bas en montant, il part vite et à plat ; frappé haut près du sommet, il monte en chandelle. À la hauteur de la ligne verte, le coup est le plus fort. Les enfants de l'autre équipe attrapent tout ce qui passe bas près d'eux : passez par-dessus leur tête. Plus loin viennent le vent, une branche de kaki et un fossé gelé. Additionnez trois coups en ja (longueurs du grand bâton) pour dépasser l'objectif. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", total: "{0} / {1} ja", swing: "Golpe {0}/{1}", wind: "Viento", start: "Toca para levantar el palito y toca otra vez para batearlo", win: "¡Superaste la marca!", lose: "Faltó poquito", result: "{0} ja en total",
    again: "Otra vez", next: "Siguiente nivel", ja: "{0} ja", flick: "¡Arriba!", swish: "¡Al aire!",
    out: { none: "", whiff: "Fallaste", caught: "¡Atrapado! 0 ja", branch: "Atascado en el caqui", ditch: "Frenado en la zanja", ok: "¡Zas!" },
    help: "El jachigi es un juego coreano de palos que se jugaba en los campos pelados del invierno. Un palito corto descansa sobre un hoyo. Toca una vez para levantarlo con el palo largo y otra vez mientras gira en el aire para batearlo lejos. Importa cuándo golpeas: bajo al subir sale rápido y raso; alto cerca de la cima sale en globo. A la altura de la línea verde el golpe es más fuerte. Los niños del otro equipo atrapan lo que pasa bajo a su lado, así que mándalo por encima de sus cabezas. Más adelante hay viento, una rama de caqui y una zanja helada. Suma tres golpes en ja (largos del palo grande) para superar la marca. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:jachigi:muted";

const BATTER: PixelArt = {
  palette: { k: "#212529", h: "#495057", s: "#f1c27d", r: "#c92a2a", b: "#364fc7", w: "#f8f9fa" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", ".rrrrrr.", "srrrrrrs", ".rrrrrr.", ".bbbbbb.", ".bb..bb.", ".kk..kk."],
};
const FIELDER: PixelArt = {
  palette: { k: "#212529", h: "#2b8a3e", s: "#f1c27d", g: "#2f9e44", b: "#5c3a21" },
  rows: ["s......s", "s.hhhh.s", "shhhhhhs", ".hsssss.", ".skssks.", "..ssss..", ".gggggg.", "gggggggg", ".gggggg.", ".bb..bb.", ".kk..kk."],
};
const PERSIMMON: PixelArt = { palette: { o: "#f76707", d: "#d9480f", g: "#2b8a3e" }, rows: [".g.", "ooo", "odo", ".o."] };

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function Jachigi({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ total: 0, swing: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number; total: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<JachigiState>(newJachigi(0));
  const taps = useRef(0);
  const swingAnim = useRef(0);
  const cam = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const level = LEVELS[stage];

  useRunRecord(JACHIGI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newJachigi(st);
    taps.current = 0;
    cam.current = 0;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ total: 0, swing: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(JACHIGI_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const handle = useCallback((ev: JachigiEvents) => {
    const s = sRef.current;
    const sx = s.stick.x - cam.current;
    const sy = GROUND - s.stick.h;
    if (ev.flick) {
      pops.current.push({ x: BAT_X + 30, y: GROUND - 90, text: copyRef.current.flick, t: 0.6, color: "#1c7ed6" });
      sfx("tap");
    }
    if (ev.hit) {
      swingAnim.current = 0.25;
      spawnBurst(parts.current, sx, sy, ["#ffd43b", "#ffffff", "#c0894a"], 14, 140, Math.floor(s.time * 1000));
      sfx("combo");
    } else if (ev.whiff && s.phase === "up") {
      swingAnim.current = 0.25;
      pops.current.push({ x: BAT_X + 40, y: GROUND - 110, text: copyRef.current.swish, t: 0.6, color: "#868e96" });
    }
    if (ev.land) spawnBurst(parts.current, sx, GROUND, ["#ced4da", "#ffffff"], 6, 60, Math.floor(s.time * 1000) + 1);
    if (ev.done) {
      const ja = s.distances[s.distances.length - 1] ?? 0;
      const text = ev.done === "ok" ? `${copyRef.current.out.ok} ${fill(copyRef.current.ja, ja)}` : ev.done === "caught" || ev.done === "whiff" ? copyRef.current.out[ev.done] : `${copyRef.current.out[ev.done]} · ${fill(copyRef.current.ja, ja)}`;
      pops.current.push({ x: Math.min(FIELD_W - 90, Math.max(90, sx)), y: GROUND - 140, text, t: 1.3, color: ev.done === "caught" || ev.done === "whiff" ? "#c92a2a" : "#2f9e44" });
      sfx(ev.done === "caught" || ev.done === "whiff" ? "fail" : "success");
      setHud({ total: s.total, swing: s.distances.length });
      if (s.over) {
        setOver({ won: s.won, stars: starsFor(s), total: s.total });
        if (s.won) {
          setCleared(markStageCleared(JACHIGI_SLUG, s.level.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
    }
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      const l = s.level;
      // taps land once per frame
      for (; taps.current > 0; taps.current--) handle(tap(s));
      handle(stepJachigi(s, dt));
      swingAnim.current = Math.max(0, swingAnim.current - dt);
      // the camera follows the flying stick and slides back for the next swing
      const want = s.phase === "flight" || s.phase === "roll" || s.phase === "landed" ? Math.max(0, s.stick.x - 140) : 0;
      cam.current += (want - cam.current) * Math.min(1, dt * (s.phase === "rest" ? 6 : 4));
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cx = cam.current;
        const X = (x: number) => Math.round(x - cx);
        const Y = (h: number) => Math.round(GROUND - h);
        // winter sky, far hills (slow parallax), the bare field
        ctx.fillStyle = "#cfe2f3";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = "#e7f0f8";
        ctx.fillRect(0, 140, FIELD_W, 120);
        ctx.fillStyle = "#b5c7d6";
        for (let x = -((cx * 0.3) % 120); x < FIELD_W + 120; x += 120) {
          ctx.beginPath();
          ctx.moveTo(x - 80, GROUND - 120);
          ctx.lineTo(x, GROUND - 200);
          ctx.lineTo(x + 80, GROUND - 120);
          ctx.fill();
        }
        ctx.fillStyle = "#c9b48a";
        ctx.fillRect(0, GROUND, FIELD_W, FIELD_H - GROUND);
        ctx.fillStyle = "#a98f63";
        for (let x = -(cx % 24); x < FIELD_W; x += 24) for (let y = GROUND + 10; y < FIELD_H; y += 18) ctx.fillRect(Math.round(x + (y % 36 ? 0 : 12)), y, 3, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, GROUND - 2, FIELD_W, 3);
        // distance marks every 5 ja
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        for (let ja = 5; ja < 60; ja += 5) {
          const x = X(BAT_X + ja * JA);
          if (x < -20 || x > FIELD_W + 20) continue;
          ctx.fillStyle = "rgba(73,80,87,0.55)";
          ctx.fillRect(x - 1, GROUND, 2, 10);
          ctx.fillText(fill(copyRef.current.ja, ja), x, GROUND + 24);
        }
        // the frozen ditch
        if (l.ditch !== null) {
          ctx.fillStyle = "#74c0fc";
          ctx.fillRect(X(l.ditch) - 2, GROUND - 1, 18, 10);
          ctx.fillStyle = "#d0ebff";
          ctx.fillRect(X(l.ditch) + 2, GROUND + 1, 8, 2);
        }
        // the persimmon branch
        if (l.branch) {
          const b = l.branch;
          ctx.fillStyle = "#5c3a21";
          ctx.fillRect(X(b.x1), 0, 14, Y(b.h) + 18);
          ctx.fillRect(X(b.x0), Y(b.h + 18), X(b.x1) - X(b.x0) + 6, 8);
          for (let x = b.x0 + 12; x < b.x1; x += 34) drawSprite(ctx, PERSIMMON, X(x), Y(b.h + 6), { scale: 3 });
        }
        // fielders, arms up as the stick comes their way
        for (const fx of l.fielders) {
          const x = X(fx);
          if (x < -30 || x > FIELD_W + 30) continue;
          const jump = s.phase === "flight" && Math.abs(s.stick.x - fx) < 80 && s.stick.h < CATCH_H + 30 ? 6 : 0;
          drawSprite(ctx, FIELDER, x, GROUND - 17 - jump, { scale: 3 });
        }
        // the hole, the batter and the long stick
        ctx.fillStyle = "#5c4a32";
        ctx.fillRect(X(BAT_X + 2), GROUND - 1, 18, 5);
        drawSprite(ctx, BATTER, X(BAT_X - 18), GROUND - 17, { scale: 3 });
        const sw = swingAnim.current > 0 ? 1 - swingAnim.current / 0.25 : 0;
        const ang = s.phase === "rest" || s.phase === "landed" ? 0.2 : -1.2 + sw * 2.2;
        ctx.save();
        ctx.translate(X(BAT_X - 8), GROUND - 24);
        ctx.rotate(ang);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(0, -3, 58, 6);
        ctx.restore();
        // the reach band and its sweet line, next to the batter
        if (s.phase === "rest" || s.phase === "up") {
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(X(BAT_X + 30), Y(REACH_HI), 8, REACH_HI - REACH_LO);
          ctx.fillStyle = "#2f9e44";
          ctx.fillRect(X(BAT_X + 26), Y(SWEET) - 2, 16, 4);
        }
        // the short stick, spinning
        if (s.phase !== "landed" || s.lastOutcome !== "caught") {
          ctx.save();
          ctx.translate(X(s.stick.x), Y(s.stick.h + 3));
          ctx.rotate(s.phase === "rest" || s.phase === "roll" || s.phase === "landed" ? 0 : s.time * s.stick.spin);
          ctx.fillStyle = "#c0894a";
          ctx.fillRect(-9, -3, 18, 6);
          ctx.fillStyle = "#8a5a3b";
          ctx.fillRect(-9, -3, 3, 6);
          ctx.fillRect(6, -3, 3, 6);
          ctx.restore();
        }
        // wind sock
        if (l.wind) {
          const dir = Math.sign(l.wind);
          ctx.fillStyle = "#e03131";
          for (let k = 0; k < 4; k++) ctx.fillRect(FIELD_W - 70 + dir * k * 8, 40 + Math.round(Math.sin(t * 6 + k) * 2), 8, 8 - k);
          ctx.fillStyle = "#495057";
          ctx.fillRect(FIELD_W - 72 - (dir < 0 ? 0 : 0), 36, 3, 40);
        }
        drawParticles(ctx, parts.current);
        for (const p of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(p.text).width + 14;
          const py = p.y - (1.3 - p.t) * 14;
          ctx.fillRect(p.x - w / 2, py - 18, w, 25);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, py);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handle]);

  const hit = useCallback(() => {
    if (sRef.current.over) return;
    setTouched(true);
    taps.current++;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      e.preventDefault();
      hit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="jachigi"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.total, hud.total, level.goal)}</Badge>
        <Badge variant="outline">{fill(c.swing, Math.min(SWINGS, hud.swing + 1), SWINGS)}</Badge>
        {level.wind ? <Badge variant="outline">{level.wind < 0 ? `◀ ${c.wind}` : `${c.wind} ▶`}</Badge> : null}
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
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={hit}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-8 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.total)}</p>
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
