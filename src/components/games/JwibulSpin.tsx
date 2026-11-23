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
import { EMBER_SPEED, FIELD_H, FIELD_W, JWIBUL_SLUG, LIGHT_SPEED, STAGE_COUNT, TUFT_R, lead, levelFor, newJwibul, starsFor, stepJwibul, type JwibulState } from "../../lib/games/jwibul-spin";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; lit: string; left: string; start: string; win: string; stack: string; cold: string; time: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; wind: string;
}> = {
  ko: {
    stage: "{0}단계", lit: "붙인 불 {0}/{1}", left: "{0}초", start: "손가락으로 작은 원을 빙빙 그려 깡통을 돌려요", win: "들판에 불이 다 붙었어요!", stack: "볏가리에 불이 옮겨붙었어요", cold: "불씨가 꺼졌어요", time: "달이 너무 높이 떴어요", result: "{0}초 만에 다 붙였어요",
    again: "다시 하기", next: "다음 단계", wind: "밤바람",
    help: "정월 대보름 밤, 논두렁에서 쥐불놀이를 해요. 화면에 손가락을 대고 작은 원을 빙빙 그리면 아이가 불씨 깡통을 줄에 매달아 돌려요. 손가락을 옮기면 아이가 그쪽으로 걸어가요. 빠르게 도는 깡통이 마른 풀 무더기를 스치면 불이 붙어요. 달이 하늘 꼭대기에 닿기 전에 풀 무더기에 모두 불을 붙이세요. 깡통이 볏가리에 닿으면 불이 옮겨붙어 실패이고, 너무 천천히 돌리면 불씨가 식어 꺼져요(위쪽 불씨 막대). 뒤로 갈수록 풀 무더기와 볏가리가 늘고, 21단계부터 밤바람이 깡통을 늦춰요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", lit: "Lit {0}/{1}", left: "{0}s", start: "Circle your finger to whirl the fire can", win: "The whole field is alight!", stack: "The fire caught a haystack", cold: "The embers went out", time: "The moon rose too high", result: "All lit in {0}s",
    again: "Play again", next: "Next stage", wind: "Night wind",
    help: "On the first full moon night, children whirl cans of embers over the winter paddies. Put a finger on the screen and draw small circles: the child spins the fire can on its string. Move your finger and the child walks that way. When the whirling can brushes a tuft of dry grass, the tuft catches fire. Light every tuft before the moon reaches the top of the sky. If the can touches a haystack, the fire spreads and the run ends; spin too slowly and the embers cool and die (the ember bar at the top). Later stages add more tufts and haystacks, and from stage 21 a night wind slows the can.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", lit: "火をつけた {0}/{1}", left: "{0}秒", start: "指で小さな円をくるくる描いて缶を回そう", win: "野原じゅうに火がついた！", stack: "わら山に火が燃え移った", cold: "火種が消えた", time: "月が高く昇りすぎた", result: "{0}秒で全部点火",
    again: "もう一度", next: "次の面", wind: "夜風",
    help: "小正月(テボルム)の夜、田んぼでチュィブルノリ(火の缶回し)。画面に指を置いて小さな円をくるくる描くと、子どもがひもにつけた火種の缶を回します。指を動かすと子どもがそちらへ歩きます。勢いよく回る缶が枯れ草の束をかすめると火がつきます。月が空のてっぺんに届く前に、すべての草の束に火をつけましょう。缶がわら山に触れると燃え移って失敗、ゆっくり回すと火種が冷えて消えます(上の火種バー)。後半は草の束とわら山が増え、21面からは夜風が缶を遅くします。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", lit: "点燃 {0}/{1}", left: "{0}秒", start: "用手指画小圈，把火罐转起来", win: "整片田野都点亮了！", stack: "火烧到草垛上了", cold: "火种熄灭了", time: "月亮升得太高了", result: "{0}秒全部点燃",
    again: "再玩一次", next: "下一关", wind: "夜风",
    help: "正月十五（大보름）的夜里，孩子们在冬天的稻田里抡火罐（쥐불놀이）。手指按在屏幕上画小圈，孩子就会用绳子把装着火种的罐子转起来；移动手指，孩子就往那边走。飞转的火罐擦过干草堆，干草就会点着。在月亮升到天顶之前点燃所有草堆。火罐碰到稻草垛，火就会蔓延，本局失败；转得太慢，火种会冷却熄灭（上方的火种条）。越往后草堆和稻草垛越多，第21关起夜风会让火罐变慢。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", lit: "Allumés {0}/{1}", left: "{0} s", start: "Tracez de petits cercles pour faire tournoyer la boîte", win: "Tout le champ flambe !", stack: "Le feu a pris à une meule", cold: "Les braises se sont éteintes", time: "La lune est montée trop haut", result: "Tout allumé en {0} s",
    again: "Rejouer", next: "Niveau suivant", wind: "Vent de nuit",
    help: "La nuit de la première pleine lune, les enfants font tournoyer des boîtes de braises au-dessus des rizières d'hiver. Posez un doigt et tracez de petits cercles : l'enfant fait tourner la boîte au bout de sa ficelle. Déplacez le doigt et l'enfant marche dans cette direction. Quand la boîte en rotation frôle une touffe d'herbe sèche, celle-ci s'enflamme. Allumez toutes les touffes avant que la lune n'atteigne le haut du ciel. Si la boîte touche une meule, le feu se propage et la partie s'arrête ; tournez trop lentement et les braises refroidissent et s'éteignent (barre des braises en haut). Plus loin, il y a plus de touffes et de meules, et dès le niveau 21 un vent de nuit ralentit la boîte.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", lit: "Encendidas {0}/{1}", left: "{0} s", start: "Dibuja círculos con el dedo para girar la lata", win: "¡Todo el campo está encendido!", stack: "El fuego alcanzó un pajar", cold: "Las brasas se apagaron", time: "La luna subió demasiado", result: "Todo encendido en {0} s",
    again: "Otra vez", next: "Siguiente nivel", wind: "Viento nocturno",
    help: "La noche de la primera luna llena, los niños hacen girar latas con brasas sobre los arrozales de invierno. Pon un dedo en la pantalla y dibuja círculos pequeños: el niño hace girar la lata de fuego en su cuerda. Mueve el dedo y el niño camina hacia allí. Cuando la lata girando roza un manojo de hierba seca, este prende. Enciende todos los manojos antes de que la luna llegue a lo alto del cielo. Si la lata toca un pajar, el fuego se extiende y termina la partida; si giras demasiado despacio, las brasas se enfrían y se apagan (barra de brasas arriba). Más adelante hay más manojos y pajares, y desde el nivel 21 un viento nocturno frena la lata.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:jwibul-spin:muted";
const KID: PixelArt = {
  palette: { h: "#212529", s: "#f1c27d", r: "#c92a2a", b: "#364fc7", k: "#1a1a1a", w: "#f8f9fa" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "rrrrrrrr", "rbbbbbbr", ".bbbbbb.", ".bb..bb.", ".kk..kk."],
};
const CAN: PixelArt = {
  palette: { g: "#adb5bd", d: "#495057", o: "#ff922b", y: "#ffd43b" },
  rows: [".yoy.", "doyod", "dgggd", "dgdgd", "dgggd", ".ddd."],
};
const TUFT: PixelArt = {
  palette: { y: "#d9b26f", b: "#a37a3f", d: "#6b4f2a" },
  rows: ["y..y.y..", ".y.yy.y.", "y.yyy.yy", ".yybyyb.", "byybbyyb", ".dddddd."],
};
const FLAME: PixelArt = {
  palette: { r: "#e8590c", o: "#ff922b", y: "#ffd43b", w: "#fff9db" },
  rows: ["...r....", "..ro..r.", ".rooro..", ".royyor.", "rooyyoor", "roywwyor", ".ryyyyr."],
};
const STACK: PixelArt = {
  palette: { y: "#e0b85a", b: "#b8893a", d: "#8a6526", k: "#5c4318" },
  rows: ["....dd....", "...dyyd...", "..dyybyd..", ".dyybyyyd.", ".dybyyybd.", "dyyybyyyyd", "dybyyyybyd", "dyyybyyyyd", "kddddddddk"],
};
const MOON: PixelArt = {
  palette: { y: "#fff3bf", w: "#fffbe6", g: "#ffe066" },
  rows: ["..yyyy..", ".ywwwyy.", "ywwwwgyy", "ywwgwwyy", "ywwwwwyy", "yywwwyyy", ".yyyyyy.", "..yyyy.."],
};

interface Spark { x: number; y: number; t: number }

export default function JwibulSpin({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ lit: 0, total: 3, left: 0, wind: false });
  const [over, setOver] = useState<null | { won: boolean; stars: number; cause: string; time: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<JwibulState | null>(null);
  const live = useRef(false);
  const trail = useRef<Spark[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useRunRecord(JWIBUL_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    const l = levelFor(st);
    sRef.current = newJwibul(l);
    live.current = false;
    trail.current = [];
    parts.current = [];
    setOver(null);
    setTouched(false);
    setHud({ lit: 0, total: l.tufts.length, left: l.timeLimit, wind: l.wind > 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(JWIBUL_SLUG, STAGE_COUNT);
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
    let hudAt = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      if (s && live.current && !s.over) {
        const ev = stepJwibul(s, dt);
        for (const e of ev) {
          if (e === "light") {
            const tf = s.tufts.filter((x) => x.lit).sort((a, b) => Math.hypot(a.x - s.can.x, a.y - s.can.y) - Math.hypot(b.x - s.can.x, b.y - s.can.y))[0];
            if (tf) spawnBurst(parts.current, tf.x, tf.y, ["#ffd43b", "#ff922b", "#e8590c"], 16, 120, Math.floor(s.time * 1000));
            sfx("success");
          }
        }
        if (s.over) {
          setOver({ won: s.won, stars: starsFor(s), cause: s.cause, time: Math.ceil(s.time) });
          if (s.won) {
            setCleared(markStageCleared(JWIBUL_SLUG, s.level.stage, STAGE_COUNT));
            sfx("win");
          } else {
            if (s.cause === "stack") spawnBurst(parts.current, s.can.x, s.can.y, ["#ff922b", "#e8590c", "#495057"], 30, 160, 7);
            sfx("lose");
          }
        }
        if (now - hudAt > 200 || s.over) {
          hudAt = now;
          setHud({ lit: s.tufts.filter((x) => x.lit).length, total: s.tufts.length, left: Math.max(0, Math.ceil(s.level.timeLimit - s.time)), wind: s.level.wind > 0 });
        }
      }
      stepParticles(parts.current, dt, -30);
      if (s) {
        if (s.speed > 60) trail.current.push({ x: s.can.x, y: s.can.y, t: 0 });
        for (const sp of trail.current) sp.t += dt;
        trail.current = trail.current.filter((sp) => sp.t < 0.35);
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && s) {
        ctx.imageSmoothingEnabled = false;
        // night sky with the rising moon as the clock, then the dark stubble paddies
        const sky = 110;
        ctx.fillStyle = "#0b1533";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = "#16244d";
        ctx.fillRect(0, 0, FIELD_W, sky);
        ctx.fillStyle = "#fff";
        for (let k = 0; k < 22; k++) if ((k * 7 + Math.floor(t * 2)) % 9) ctx.fillRect((k * 89) % FIELD_W, (k * 37) % (sky - 20), 2, 2);
        const frac = Math.min(1, s.time / s.level.timeLimit);
        drawSprite(ctx, MOON, 40 + frac * 280, sky - 18 - Math.sin(frac * Math.PI * 0.5) * 70, { scale: 4 });
        ctx.fillStyle = "#1f1a14";
        ctx.fillRect(0, sky, FIELD_W, FIELD_H - sky);
        ctx.fillStyle = "#2a231a";
        for (let y = sky + 12; y < FIELD_H; y += 22) for (let x = (y % 44) ? 6 : 18; x < FIELD_W; x += 24) ctx.fillRect(x, y, 3, 6);
        ctx.fillStyle = "#3b2f20";
        for (let x = 0; x < FIELD_W; x += 120) ctx.fillRect(x, sky, 4, FIELD_H - sky);
        // haystacks, tufts (lit ones burn), the trail of sparks, the child and the can
        for (const st of s.level.stacks) drawSprite(ctx, STACK, st.x, st.y, { scale: Math.max(3, Math.round(st.r / 4.5)) });
        for (const tf of s.tufts) {
          if (tf.lit) {
            ctx.fillStyle = "rgba(255,146,43,0.18)";
            ctx.beginPath();
            ctx.arc(tf.x, tf.y, TUFT_R + 10 + Math.sin(t * 9 + tf.x) * 3, 0, Math.PI * 2);
            ctx.fill();
            drawSprite(ctx, FLAME, tf.x, tf.y - 6 + Math.sin(t * 12 + tf.y) * 1.5, { scale: 4 });
          } else drawSprite(ctx, TUFT, tf.x, tf.y, { scale: 4 });
        }
        for (const sp of trail.current) {
          const a = 1 - sp.t / 0.35;
          ctx.fillStyle = s.speed >= LIGHT_SPEED ? `rgba(255,${160 + Math.round(a * 80)},60,${a})` : `rgba(255,120,60,${a * 0.6})`;
          ctx.fillRect(Math.round(sp.x) - 3, Math.round(sp.y) - 3, 6, 6);
        }
        ctx.strokeStyle = "rgba(222,226,230,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.pivot.x, s.pivot.y - 6);
        ctx.lineTo(s.can.x, s.can.y);
        ctx.stroke();
        drawSprite(ctx, KID, s.pivot.x, s.pivot.y, { scale: 3 });
        drawSprite(ctx, CAN, s.can.x, s.can.y, { scale: 3, alpha: 0.4 + s.heat * 0.6 });
        drawParticles(ctx, parts.current);
        // ember bar
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(12, sky - 14, 120, 8);
        ctx.fillStyle = s.speed >= EMBER_SPEED ? "#ff922b" : "#ced4da";
        ctx.fillRect(12, sky - 14, Math.round(120 * s.heat), 8);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (!s || s.over) return;
    setTouched(true);
    live.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    lead(s, p.x, p.y);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (!s || s.over || !s.finger) return;
    const p = toField(e);
    lead(s, p.x, p.y);
  };
  const onUp = () => {
    const s = sRef.current;
    if (s) lead(s, null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const cause = over ? (over.won ? c.win : over.cause === "stack" ? c.stack : over.cause === "cold" ? c.cold : c.time) : "";

  return (
    <div
      ref={containerRef}
      data-game="jwibul-spin"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.lit, hud.lit, hud.total)}</Badge>
        <Badge variant="outline">{fill(c.left, hud.left)}</Badge>
        {hud.wind ? <Badge variant="outline">{c.wind}</Badge> : null}
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{cause}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.time)}</p> : null}
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
