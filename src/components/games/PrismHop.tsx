import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { BALL, BAND, HEARTS, PRISM_SLUG, PRISM_STAGES, SEG, STAGE_COUNT, newHop, starsFor, step, tap, type Hop } from "../../lib/games/prism-hop";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; gates: string; start: string; win: string; lose: string; timeUp: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", gates: "관문 {0}/{1}", start: "화면을 눌러 구슬을 튀겨요!", win: "꼭대기에 닿았어요!", lose: "하트를 다 잃었어요", timeUp: "시간이 다 됐어요",
    again: "다시 하기", next: "다음 단계",
    help: "유리구슬이 빙글빙글 도는 색 고리와 옆으로 미끄러지는 색 막대 사이를 튀어 올라가요. 화면을 누를 때마다(키보드는 Space·↑) 구슬이 톡 튀어 오르고, 손을 떼면 떨어져요. 구슬은 자기와 같은 색으로만 지나갈 수 있어요. 다른 색에 닿으면 하트를 하나 잃고 잠깐 무적이 돼요. 관문 사이의 프리즘 별은 구슬을 받침대에 받아 주고, 하트 하나를 채우고, 다음 관문 색으로 구슬을 물들여요. 받침대에서 기다리다가 고리의 내 색이 아래로 내려올 때 출발하고, 고리 안에서는 톡톡 눌러 떠 있다가 내 색이 위에 올 때 빠져나가요. 시간 안에 꼭대기에 닿으면 통과, 한 번도 안 부딪히면 별 셋이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", gates: "Gates {0}/{1}", start: "Tap to make the bead hop!", win: "You reached the top!", lose: "Out of hearts", timeUp: "Time's up",
    again: "Try again", next: "Next stage",
    help: "A glass bead hops up between spinning colour rings and sliding colour bars. Each tap (Space or ↑ on a keyboard) gives it a hop; let go and it falls. The bead can pass only through its own colour; touch another and it loses a heart and is safe for a moment. The prism star between gates catches the bead on a ledge, mends a heart and tints it the colour of the next gate. Wait on the ledge until your colour comes round to the bottom of the ring, then go; inside the ring, tap gently to float until your colour reaches the top, then slip out. Reach the top in time to pass; touch nothing for three stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", gates: "ゲート {0}/{1}", start: "タップしてビーズをはずませよう！", win: "てっぺんに着いた！", lose: "ハートがなくなった", timeUp: "時間切れ",
    again: "もう一度", next: "次の面",
    help: "ガラスのビーズが、くるくる回る色の輪と横にすべる色のバーのあいだをはずんで上ります。タップするたびに（キーボードはSpace・↑）ビーズがぴょんと上がり、離すと落ちます。ビーズは自分と同じ色しか通れません。ほかの色にふれるとハートが1つ減り、少しのあいだ無敵になります。ゲートのあいだのプリズムの星はビーズを台で受け止め、ハートを1つ回復し、次のゲートの色に染めます。台で待って輪の自分の色が下に来たら出発し、輪の中ではトントンと押して浮かび、自分の色が上に来たら抜けましょう。時間内にてっぺんに着けばクリア、一度もぶつからなければ星3つです。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", gates: "关口 {0}/{1}", start: "点屏幕让珠子跳起来！", win: "到达顶端了！", lose: "红心用完了", timeUp: "时间到",
    again: "再来一次", next: "下一关",
    help: "玻璃珠在旋转的彩色圆环和左右滑动的彩色横条之间向上跳。每点一下（键盘为空格或↑）珠子就跳一下，不点就会落下。珠子只能穿过和自己同色的部分；碰到其他颜色会失去一颗心，并短暂无敌。关口之间的棱镜星会把珠子接到台子上，回复一颗心，并把珠子染成下一个关口的颜色。在台子上等到圆环上你的颜色转到下方再出发；在环里轻点保持悬浮，等你的颜色转到上方再穿出去。在时间内到达顶端即过关，一次都没碰到可得三星。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", gates: "Portes {0}/{1}", start: "Touchez pour faire sauter la perle !", win: "Vous êtes au sommet !", lose: "Plus de cœurs", timeUp: "Temps écoulé",
    again: "Réessayer", next: "Niveau suivant",
    help: "Une perle de verre saute entre des anneaux de couleur qui tournent et des barres de couleur qui glissent. Chaque touche (Espace ou ↑ au clavier) la fait sauter ; sans toucher, elle retombe. La perle ne passe que par sa propre couleur ; au contact d'une autre, elle perd un cœur et devient intouchable un instant. L'étoile prisme entre deux portes la recueille sur une corniche, rend un cœur et la teinte de la couleur de la porte suivante. Attendez sur la corniche que votre couleur arrive en bas de l'anneau, puis partez ; dans l'anneau, tapotez pour flotter jusqu'à ce que votre couleur soit en haut, puis sortez. Atteignez le sommet à temps pour réussir ; sans aucun contact, trois étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", gates: "Puertas {0}/{1}", start: "¡Toca para que salte la cuenta!", win: "¡Has llegado arriba!", lose: "Sin corazones", timeUp: "Se acabó el tiempo",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Una cuenta de cristal sube saltando entre anillos de colores que giran y barras de colores que se deslizan. Cada toque (Espacio o ↑ con teclado) le da un salto; si no tocas, cae. La cuenta solo pasa por su propio color; si toca otro, pierde un corazón y queda a salvo un momento. La estrella prisma entre puertas la recoge en una repisa, le devuelve un corazón y la tiñe del color de la siguiente puerta. Espera en la repisa a que tu color llegue abajo del anillo y entonces sube; dentro del anillo, toca suave para flotar hasta que tu color esté arriba y sal. Llega arriba a tiempo para superar el nivel; sin tocar nada, tres estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:prism-hop:muted";
const W = 360;
const H = 560;
const CX = 180;
const FOOT = 430; // where the camera keeps the bead on screen
const HUES = ["#f03e3e", "#fcc419", "#22b8cf", "#be4bdb"];

export default function PrismHop({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; hearts: number }>(null);
  const [touched, setTouched] = useState(false);
  const [passed, setPassed] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hopRef = useRef<Hop | null>(null);
  const taps = useRef(0);
  const started = useRef(false);
  const cam = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const st = PRISM_STAGES[stage];

  useRunRecord(PRISM_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    hopRef.current = newHop(PRISM_STAGES[s]);
    taps.current = 0;
    started.current = false;
    cam.current = 0;
    parts.current = [];
    setPassed(0);
    setHearts(HEARTS);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PRISM_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const h = hopRef.current;
      if (!h) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      if (taps.current > 0) {
        taps.current = 0;
        started.current = true;
        if (tap(h)) sfx("tap");
      }
      if (started.current && !h.over) {
        for (const ev of step(h, dt)) {
          const sy = FOOT - (h.y - cam.current);
          if (ev === "hit") {
            spawnBurst(parts.current, CX, sy, ["#fff", "#868e96"], 14, 120, 3);
            setHearts(h.hearts);
            sfx("fail");
          } else if (ev === "star") {
            spawnBurst(parts.current, CX, sy, HUES, 18, 140, 3);
            setPassed(h.next);
            setHearts(h.hearts);
            sfx("success");
          }
        }
        if (h.over) {
          started.current = false;
          setOver({ won: h.won, stars: starsFor(h), hearts: h.hearts });
          if (h.won) {
            setCleared(markStageCleared(PRISM_SLUG, h.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      // the camera follows the bead up, never back down past its ledge
      const want = Math.max(cam.current, h.stage.ledges[Math.min(h.next, h.stage.gates.length)] - 20, h.y - 260);
      cam.current += (want - cam.current) * Math.min(1, dt * 4);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1b1b2f";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2b2b45";
        for (let k = 0; k < 40; k++) {
          const sx = (k * 97) % W;
          const sy = ((k * 53 + Math.floor(cam.current * 0.3)) % H + H) % H;
          ctx.fillRect(sx, H - sy, 2, 2);
        }
        const Y = (y: number) => FOOT - (y - cam.current);
        const t = h.t;
        h.stage.gates.forEach((g, k) => {
          const gy = Y(g.y);
          if (gy < -140 || gy > H + 140) return;
          if (g.kind === 0) {
            const theta = g.phase + g.speed * t;
            for (let s = 0; s < 4; s++) {
              ctx.strokeStyle = HUES[s];
              ctx.lineWidth = BAND * 2;
              ctx.beginPath();
              ctx.arc(CX, gy, g.r, -(theta + (s + 1) * (Math.PI / 2)) + 0.03, -(theta + s * (Math.PI / 2)) - 0.03);
              ctx.stroke();
            }
          } else {
            const off = g.phase + g.speed * t;
            for (let x = -SEG; x < W + SEG; x += 2) {
              const s = Math.floor((((off + (x - CX)) % (SEG * 4)) + SEG * 4) % (SEG * 4) / SEG);
              ctx.fillStyle = HUES[s];
              ctx.fillRect(x, gy - BAND, 2, BAND * 2);
            }
          }
          // the prism star and ledge above this gate
          const ly = Y(h.stage.ledges[k + 1]);
          ctx.fillStyle = "#495057";
          ctx.fillRect(CX - 22, ly + BALL, 44, 4);
          if (h.next <= k) {
            for (let s = 0; s < 4; s++) {
              ctx.fillStyle = HUES[s];
              ctx.fillRect(CX - 8 + (s % 2) * 8, ly - 8 + Math.floor(s / 2) * 8, 8, 8);
            }
          }
        });
        ctx.lineWidth = 1;
        // the start ledge
        ctx.fillStyle = "#495057";
        ctx.fillRect(CX - 30, Y(0) + BALL, 60, 6);
        // the bead
        const by = Y(h.y);
        ctx.fillStyle = h.safe > 0 && Math.floor(now / 80) % 2 ? "#ffffff" : HUES[h.colour];
        ctx.fillRect(CX - BALL, by - BALL + 2, BALL * 2, BALL * 2 - 4);
        ctx.fillRect(CX - BALL + 2, by - BALL, BALL * 2 - 4, BALL * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(CX - 4, by - 5, 4, 4);
        // the clock
        ctx.fillStyle = "#f8f9fa";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${Math.max(0, Math.ceil(h.stage.limit - t))}s`, W - 12, 22);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = () => {
    if (hopRef.current?.over) return;
    setTouched(true);
    taps.current++;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "ArrowUp" && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat) return;
    onDown();
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="prism-hop"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.gates, passed, st.gates.length)}</Badge>
        <Badge variant="outline" aria-label={`${hearts}/${HEARTS}`}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <Heart key={i} className={i < hearts ? "size-3.5 fill-destructive text-destructive" : "size-3.5 text-muted-foreground"} />
          ))}
        </Badge>
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
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.hearts <= 0 ? c.lose : c.timeUp}</p>
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
