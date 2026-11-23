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
import { BUREOM_SLUG, HEARTS, LEVELS, PEBBLE, STAGE_COUNT, bite, current, newBureom, release, starsFor, stepBureom, toss, type BiteResult, type BureomState } from "../../lib/games/bureom-crack";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; cracked: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; nuts: string[]; r: Record<BiteResult, string>;
}> = {
  ko: {
    stage: "{0}단계", cracked: "깬 부럼 {0}/{1}", start: "꾹 눌러 깨물고, 초록 칸에서 손을 떼요", win: "부럼을 다 깼어요! 올해 이가 튼튼!", lose: "부럼 깨기 실패", result: "딱 좋게 깬 부럼 {0}개",
    again: "다시 하기", next: "다음 단계", nuts: ["땅콩", "밤", "호두", "은행", "잣", "돌멩이"],
    r: { crack: "딱!", perfect: "딱 좋아!", soft: "아직 안 깨졌어요", crush: "으스러졌어요", ouch: "아야! 돌이에요", toss: "돌 치웠다!", waste: "아까운 부럼…" },
    help: "정월 대보름 아침, 한 해 이가 튼튼하고 부스럼이 나지 않길 빌며 딱딱한 견과를 이로 깨물어 깨요. 화면을 꾹 누르고 있으면 깨무는 힘이 올라가고, 세게 깨물수록 더 빨리 올라가요. 오른쪽 막대의 초록 칸에서 손을 떼면 껍데기가 딱 깨지고, 가운데 밝은 줄에 맞추면 '딱 좋아!'예요. 너무 일찍 떼면 아직 안 깨져서 다시 깨물면 되고, 너무 세게 깨물면 알맹이가 으스러져 하트가 줄어요. 땅콩·밤·호두·은행·잣은 깨지는 힘이 저마다 달라요. 8단계부터는 견과 사이에 돌멩이가 섞여 있으니 깨물지 말고 옆으로 휙 밀어 치우세요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", cracked: "Cracked {0}/{1}", start: "Hold to bite, let go in the green band", win: "All cracked! Strong teeth all year!", lose: "Nut cracking failed", result: "{0} perfect cracks",
    again: "Play again", next: "Next stage", nuts: ["Peanut", "Chestnut", "Walnut", "Ginkgo", "Pine nut", "Pebble"],
    r: { crack: "Crack!", perfect: "Perfect!", soft: "Not cracked yet", crush: "Crushed it", ouch: "Ouch! A pebble", toss: "Pebble gone!", waste: "Wasted nut…" },
    help: "On the morning of Daeboreum, the first full moon of the lunar year, Koreans crack hard nuts with their teeth, wishing for strong teeth and no boils all year. Press and hold to bite: the pressure rises, and the harder you bite the faster it climbs. Let go inside the green band on the bar at the right to crack the shell; hit the bright line in the middle for \"Perfect!\". Let go too early and the shell holds, so just bite again; bite too hard and the nut is crushed and you lose a heart. Peanuts, chestnuts, walnuts, ginkgo and pine nuts each crack at a different pressure. From stage 8 pebbles hide among the nuts: don't bite them, swipe them away to the side.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", cracked: "割った {0}/{1}", start: "長押しでかみ、緑の帯で指を離そう", win: "全部割れた！今年も歯が丈夫！", lose: "プロム割り失敗", result: "ぴったり割り {0}個",
    again: "もう一度", next: "次の面", nuts: ["ピーナッツ", "栗", "クルミ", "銀杏", "松の実", "小石"],
    r: { crack: "パキッ!", perfect: "ぴったり!", soft: "まだ割れない", crush: "粉々になった", ouch: "いたっ! 小石だ", toss: "小石をどけた!", waste: "もったいない…" },
    help: "テボルム(小正月)の朝、一年じゅう歯が丈夫でできものができないよう願って、硬い木の実を歯で割ります(プロム割り)。画面を長押しするとかむ力が上がり、強くかむほど速く上がります。右のバーの緑の帯で指を離すと殻がパキッと割れ、真ん中の明るい線ならぴったり。早く離しすぎるとまだ割れないので、もう一度かめばOK。強くかみすぎると中身が粉々になりハートが減ります。ピーナッツ・栗・クルミ・銀杏・松の実は割れる力がそれぞれ違います。8面からは木の実に小石がまざるので、かまずに横へさっとどけましょう。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", cracked: "咬开 {0}/{1}", start: "按住咬下去，在绿色区域松手", win: "全部咬开！一年牙齿都结实！", lose: "咬坚果失败", result: "刚刚好咬开 {0}颗",
    again: "再玩一次", next: "下一关", nuts: ["花生", "栗子", "核桃", "银杏", "松子", "小石子"],
    r: { crack: "咔!", perfect: "刚刚好!", soft: "还没咬开", crush: "咬碎了", ouch: "哎哟! 是石子", toss: "石子扔掉了!", waste: "可惜的坚果…" },
    help: "正月十五（大보름）早上，韩国人会用牙咬开坚硬的坚果（咬부럼），祈求一年牙齿结实、不长疖子。按住屏幕就会咬下去，咬合力不断上升，咬得越紧升得越快。在右侧力量条的绿色区域松手，壳就“咔”地裂开；对准中间的亮线就是“刚刚好!”。松得太早壳还没开，再咬一次就行；咬得太狠果仁会碎，扣一颗心。花生、栗子、核桃、银杏和松子裂开所需的力各不相同。第8关起坚果里会混着小石子，别咬，把它向旁边一划拨开。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", cracked: "Cassées {0}/{1}", start: "Maintenez pour mordre, lâchez dans le vert", win: "Tout est cassé ! Dents solides toute l'année !", lose: "Casse-noix raté", result: "{0} cassées parfaitement",
    again: "Rejouer", next: "Niveau suivant", nuts: ["Cacahuète", "Châtaigne", "Noix", "Ginkgo", "Pignon", "Caillou"],
    r: { crack: "Crac !", perfect: "Parfait !", soft: "Pas encore cassée", crush: "En miettes", ouch: "Aïe ! Un caillou", toss: "Caillou écarté !", waste: "Noix gâchée…" },
    help: "Le matin de Daeboreum, la première pleine lune de l'année lunaire, les Coréens cassent des noix dures avec les dents pour avoir des dents solides et pas de furoncles de l'année. Maintenez le doigt pour mordre : la pression monte, et plus vous mordez fort, plus elle monte vite. Lâchez dans la bande verte de la barre de droite pour casser la coque ; la ligne claire au milieu donne « Parfait ! ». Trop tôt, la coque tient : mordez encore ; trop fort, la noix est écrasée et vous perdez un cœur. Cacahuètes, châtaignes, noix, ginkgo et pignons cèdent chacun à une pression différente. Dès le niveau 8, des cailloux se cachent parmi les noix : ne les mordez pas, balayez-les sur le côté.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", cracked: "Partidos {0}/{1}", start: "Mantén para morder, suelta en la franja verde", win: "¡Todo partido! ¡Dientes fuertes todo el año!", lose: "No lograste partirlos", result: "{0} partidos perfectos",
    again: "Otra vez", next: "Siguiente nivel", nuts: ["Cacahuete", "Castaña", "Nuez", "Ginkgo", "Piñón", "Piedra"],
    r: { crack: "¡Crac!", perfect: "¡Perfecto!", soft: "Aún no se parte", crush: "Hecho migas", ouch: "¡Ay! Una piedra", toss: "¡Piedra fuera!", waste: "Fruto perdido…" },
    help: "La mañana de Daeboreum, la primera luna llena del año lunar, los coreanos parten frutos secos duros con los dientes para tener dientes fuertes y ningún forúnculo en todo el año. Mantén pulsado para morder: la presión sube, y cuanto más fuerte muerdes, más rápido sube. Suelta dentro de la franja verde de la barra de la derecha para partir la cáscara; la línea clara del centro da «¡Perfecto!». Si sueltas muy pronto la cáscara aguanta: vuelve a morder; si muerdes demasiado fuerte, el fruto se hace migas y pierdes un corazón. Cacahuetes, castañas, nueces, ginkgo y piñones ceden cada uno a una presión distinta. Desde el nivel 8 hay piedras escondidas entre los frutos: no las muerdas, apártalas deslizando hacia un lado.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bureom-crack:muted";
const W = 360;
const H = 520;
const NUT_Y = 250;

const NUTS: PixelArt[] = [
  { palette: { a: "#e9c58b", b: "#c9a063", d: "#8a6a3a" }, rows: [".aaa..", "abbaa.", "aaabaa", ".aaaab", "..abba", "..aaa.", ".abaa.", ".aaa.."] },
  { palette: { a: "#8b4a24", b: "#a85d2f", h: "#d08b55", d: "#e9c58b" }, rows: ["...a....", "..aaa...", ".abhaa..", "abhhbaa.", "abbbbbaa", "aabbbbba", ".dddddd.", "..dddd.."] },
  { palette: { a: "#b98a52", b: "#9a6c3a", d: "#6b4a26" }, rows: ["..aaaa..", ".abaaba.", "abaabaab", "aabbaaba", "abaabbaa", "baabaaba", ".abaaba.", "..aaaa.."] },
  { palette: { a: "#f1e3a8", b: "#d9c77a", d: "#a8944c" }, rows: ["..aa..", ".aaaa.", "aabaaa", "aaabaa", "aaaaab", ".aaab.", "..ab.."] },
  { palette: { a: "#f8f0dc", b: "#e0cfa8", d: "#b89f6f" }, rows: [".aa.", "aaab", "aabb", ".ab."] },
  { palette: { a: "#9aa0a6", b: "#7c838a", d: "#5c6268", h: "#c1c6cb" }, rows: ["..aaaa..", ".ahaaba.", "aahaaaab", "aaaabaab", "aabaaaab", "baaaaabd", ".bbaabd.", "..dddd.."] },
];
const NUT_SCALE = [7, 8, 8, 7, 9, 8];
const TEETH: PixelArt = {
  palette: { w: "#ffffff", g: "#dee2e6", p: "#f783ac", d: "#c2255c" },
  rows: ["dddddddddddddddd", "pppppppppppppppp", "wwgwwgwwgwwgwwgw", "wwgwwgwwgwwgwwgw", "wwgwwgwwgwwgwwgw", ".w..w..w..w..w.."],
};
const MOON: PixelArt = {
  palette: { y: "#fff3bf", w: "#fffbe6", g: "#ffe066" },
  rows: ["..yyyy..", ".ywwwyy.", "ywwwwgyy", "ywwgwwyy", "ywwwwwyy", "yywwwyyy", ".yyyyyy.", "..yyyy.."],
};

interface Pop { text: string; t: number; color: string }

export default function BureomCrack({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ cracked: 0, hearts: HEARTS });
  const [over, setOver] = useState<null | { won: boolean; stars: number; perfect: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<BureomState>(newBureom(0));
  const press = useRef<null | { id: number; x: number; y: number }>(null);
  const shake = useRef(0);
  const slide = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const level = LEVELS[stage];

  useRunRecord(BUREOM_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newBureom(st);
    press.current = null;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ cracked: 0, hearts: HEARTS });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BUREOM_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const judge = useCallback((r: BiteResult | null, kind: number) => {
    if (!r) return;
    const s = sRef.current;
    const color = r === "perfect" ? "#2f9e44" : r === "crack" || r === "toss" ? "#1c7ed6" : r === "soft" ? "#868e96" : "#c92a2a";
    pops.current.push({ text: copyRef.current.r[r], t: 1, color });
    if (r === "crack" || r === "perfect") {
      const cols = [["#e9c58b", "#8a6a3a"], ["#8b4a24", "#e9c58b"], ["#b98a52", "#6b4a26"], ["#f1e3a8", "#a8944c"], ["#f8f0dc", "#b89f6f"], ["#9aa0a6", "#5c6268"]][kind];
      spawnBurst(parts.current, W / 2, NUT_Y, [...cols, "#ffffff"], r === "perfect" ? 22 : 14, 150, s.index * 31);
      sfx(r === "perfect" ? "combo" : "success");
    } else if (r === "crush" || r === "ouch") {
      shake.current = 0.35;
      spawnBurst(parts.current, W / 2, NUT_Y, ["#868e96", "#ced4da"], 18, 110, s.index * 17);
      sfx("fail");
    } else if (r === "toss") {
      slide.current = 1;
      sfx("place");
    } else if (r === "waste") {
      slide.current = 1;
      sfx("fail");
    } else sfx("tap");
    setHud({ cracked: s.cracked, hearts: s.hearts });
    if (s.over) {
      setOver({ won: s.won, stars: starsFor(s), perfect: s.perfect });
      if (s.won) {
        setCleared(markStageCleared(BUREOM_SLUG, s.level.stage, STAGE_COUNT));
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
      const s = sRef.current;
      const n = current(s);
      const kindBefore = n?.kind ?? 0;
      const auto = stepBureom(s, dt);
      if (auto) judge(auto, kindBefore);
      stepParticles(parts.current, dt, 260);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      shake.current = Math.max(0, shake.current - dt);
      slide.current = Math.max(0, slide.current - dt * 3);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const sx = shake.current > 0 ? Math.sin(t * 80) * 4 : 0;
        // a full-moon morning room, a low table and the nut on a little dish
        ctx.fillStyle = "#e7f5ff";
        ctx.fillRect(0, 0, W, H);
        drawSprite(ctx, MOON, 300, 40, { scale: 4 });
        ctx.fillStyle = "#c0894a";
        ctx.fillRect(0, 330, W, H - 330);
        ctx.fillStyle = "#a9733c";
        for (let y = 344; y < H; y += 20) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = "#f8f9fa";
        ctx.beginPath();
        ctx.ellipse(W / 2 - 20 + sx + slide.current * 140, NUT_Y + 44, 70, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        const cur = current(s);
        const p = s.pressure;
        if (cur && !s.over) {
          drawSprite(ctx, NUTS[cur.kind], W / 2 - 20 + sx + slide.current * 140, NUT_Y + 10 + p * 6, { scale: NUT_SCALE[cur.kind] });
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#495057";
          ctx.fillText(copyRef.current.nuts[cur.kind], W / 2 - 20, NUT_Y + 76);
        }
        // the teeth close as you bite
        const gap = 120 - Math.min(1, p) * 64;
        drawSprite(ctx, TEETH, W / 2 - 20 + sx + slide.current * 140, NUT_Y - gap / 2 - 30, { scale: 8 });
        ctx.save();
        ctx.translate(W / 2 - 20 + sx + slide.current * 140, NUT_Y + gap / 2 + 52);
        ctx.scale(1, -1);
        drawSprite(ctx, TEETH, 0, 0, { scale: 8 });
        ctx.restore();
        // pressure gauge with the crack band of this nut
        const gx = W - 40;
        const gt = 110;
        const gb = 420;
        const gy = (v: number) => gb - v * (gb - gt);
        ctx.fillStyle = "#dee2e6";
        ctx.fillRect(gx, gt, 22, gb - gt);
        if (cur && cur.kind !== PEBBLE) {
          ctx.fillStyle = "#8ce99a";
          ctx.fillRect(gx, gy(cur.hi), 22, gy(cur.lo) - gy(cur.hi));
          const mid = (cur.lo + cur.hi) / 2;
          const half = ((cur.hi - cur.lo) / 2) * 0.4;
          ctx.fillStyle = "#2f9e44";
          ctx.fillRect(gx, gy(mid + half), 22, gy(mid - half) - gy(mid + half));
        }
        ctx.fillStyle = p > (cur?.hi ?? 1) ? "#e03131" : "#fab005";
        ctx.fillRect(gx + 6, gy(p), 10, gb - gy(p));
        ctx.fillStyle = "#212529";
        ctx.fillRect(gx - 4, Math.round(gy(p)) - 2, 30, 4);
        // upcoming nuts on the tray
        const queue = s.level.nuts.slice(s.index + 1, s.index + 7);
        queue.forEach((q, i) => drawSprite(ctx, NUTS[q.kind], 30 + i * 46, 470, { scale: 3 }));
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const w = ctx.measureText(pp.text).width + 16;
          const py = 96 - (1 - pp.t) * 20;
          ctx.fillRect(W / 2 - 20 - w / 2, py - 20, w, 28);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2 - 20, py);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [judge]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over || press.current) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    press.current = { id: e.pointerId, ...p };
    bite(s);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    const p = toField(e);
    // a sideways swipe pushes the nut off the dish instead of biting it
    if (Math.abs(p.x - pr.x) > 46 && Math.abs(p.x - pr.x) > Math.abs(p.y - pr.y) * 1.5) {
      press.current = null;
      const s = sRef.current;
      const kind = current(s)?.kind ?? 0;
      judge(toss(s), kind);
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    const s = sRef.current;
    const kind = current(s)?.kind ?? 0;
    judge(release(s), kind);
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
      data-game="bureom-crack"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.cracked, hud.cracked, level.need)}</Badge>
        <Badge variant="outline" aria-label={`${hud.hearts}/${HEARTS}`}>{"♥".repeat(hud.hearts)}{"♡".repeat(HEARTS - hud.hearts)}</Badge>
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
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-24 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.perfect)}</p>
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
