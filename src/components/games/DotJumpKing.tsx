import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { frameScale } from "../../lib/games/time-contracts";
import {
  chargeJump,
  createJumpState,
  jumpHeight,
  JUMP_H,
  JUMP_W,
  parseJump,
  releaseJump,
  serializeJump,
  stepJump,
  visiblePlatforms,
  type JumpState,
} from "../../lib/games/dot-jumpking";
const BEST_KEY = "oiyo-dot-jumpking-best",
  SAVE_KEY = "oiyo:dot-jumpking:v1";
const COPY = {
  ko: {
    title: "점프 킹",
    sub: "정상을 향한 한 번의 도약",
    height: "높이",
    best: "최고",
    start: "등반 시작",
    over: "구름 아래로 추락했습니다",
    again: "다시 도전",
    hint: "화면을 누르거나 Space로 충전하고, 좌우 방향을 정한 뒤 놓아 점프하세요.",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    charge: "충전",
    result: "등반 기록",
    restored: "저장된 등반을 이어서 불러왔어요",
  },
  en: {
    title: "Dot Jump King",
    sub: "One decisive leap toward the summit",
    height: "Height",
    best: "Best",
    start: "Begin climb",
    over: "You fell below the clouds",
    again: "Try again",
    hint: "Hold the screen or Space to charge, aim left or right, then release to jump.",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    charge: "Charge",
    result: "Climb report",
    restored: "Your saved climb was restored",
  },
  ja: {
    title: "ドットジャンプキング",
    sub: "頂上を目指す一度の跳躍",
    height: "高さ",
    best: "ベスト",
    start: "登山開始",
    over: "雲の下へ落ちました",
    again: "再挑戦",
    hint: "画面またはSpaceを長押ししてチャージし、左右を決めて離すとジャンプします。",
    pause: "一時停止",
    resume: "続ける",
    sound: "サウンド",
    charge: "チャージ",
    result: "登山記録",
    restored: "保存した登山を復元しました",
  },
  zh: {
    title: "点点跳跳王",
    sub: "向山顶发起决定性一跃",
    height: "高度",
    best: "最高",
    start: "开始攀登",
    over: "你掉到了云层下方",
    again: "再次挑战",
    hint: "按住屏幕或空格蓄力，选择左右方向后松开跳跃。",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    charge: "蓄力",
    result: "攀登记录",
    restored: "已恢复保存的攀登",
  },
  fr: {
    title: "Dot Jump King",
    sub: "Un saut décisif vers le sommet",
    height: "Hauteur",
    best: "Record",
    start: "Commencer",
    over: "Vous êtes tombé sous les nuages",
    again: "Réessayer",
    hint: "Maintenez l’écran ou Espace, visez à gauche ou à droite puis relâchez.",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    charge: "Charge",
    result: "Bilan",
    restored: "Votre ascension a été restaurée",
  },
  es: {
    title: "Dot Jump King",
    sub: "Un salto decisivo hacia la cima",
    height: "Altura",
    best: "Récord",
    start: "Comenzar",
    over: "Caíste bajo las nubes",
    again: "Reintentar",
    hint: "Mantén la pantalla o Espacio, apunta a izquierda o derecha y suelta.",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    charge: "Carga",
    result: "Informe",
    restored: "Se restauró tu ascenso",
  },
} as const;
export default function DotJumpKing({ locale = "ko" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const canvas = useRef<HTMLCanvasElement>(null),
    state = useRef<JumpState>(createJumpState());
  const [phase, setPhase] = useState<
      "briefing" | "playing" | "paused" | "over"
    >("briefing"),
    [height, setHeight] = useState(0),
    [best, setBest] = useState(0),
    [charge, setCharge] = useState(0),
    [sound, setSound] = useState(true),
    [restored, setRestored] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const tone = useCallback(
    (f: number) => {
      if (!sound) return;
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      const a = new A(),
        o = a.createOscillator(),
        g = a.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.03, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.14);
    },
    [sound],
  );
  useEffect(() => {
    const b = Number(localStorage.getItem(BEST_KEY));
    if (Number.isFinite(b)) setBest(b);
    const saved = parseJump(localStorage.getItem(SAVE_KEY));
    if (saved) {
      state.current = saved;
      setHeight(jumpHeight(saved));
      setRestored(true);
      setPhase("paused");
    }
  }, []);
  const start = useCallback((seedOverride?: number) => {
    const seed = new Uint32Array(1);
    if (seedOverride !== undefined) seed[0] = seedOverride >>> 0;
    else crypto.getRandomValues(seed);
    state.current = createJumpState(seed[0]);
    setHeight(0);
    setCharge(0);
    setRestored(false);
    setPhase("playing");
  }, []);
  const aim = (clientX: number) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (rect)
      state.current = {
        ...state.current,
        aim: ((clientX - rect.left) / rect.width) * 400,
      };
  };
  const down = (clientX: number) => {
    if (phaseRef.current !== "playing") return;
    aim(clientX);
    state.current = chargeJump(state.current, 0.1, state.current.aim);
  };
  const up = () => {
    if (phaseRef.current !== "playing") return;
    const before = state.current;
    state.current = releaseJump(before);
    if (state.current !== before) tone(520);
  };
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phaseRef.current === "playing")
          state.current = chargeJump(state.current, 2, state.current.aim);
      }
      if (e.key === "ArrowLeft") state.current = { ...state.current, aim: 0 };
      if (e.key === "ArrowRight")
        state.current = { ...state.current, aim: 400 };
      if (e.key.toLowerCase() === "p")
        setPhase((p) =>
          p === "playing" ? "paused" : p === "paused" ? "playing" : p,
        );
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") up();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("pointerup", up);
    };
  }, [tone]);
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0,
      last: number | null = null,
      saveTick = 0;
    const loop = (now: number) => {
      const scale = frameScale(last, now);
      last = now;
      if (phaseRef.current === "playing") {
        if (state.current.charge > 0 && state.current.onGround)
          state.current = chargeJump(
            state.current,
            1.6 * scale,
            state.current.aim,
          );
        state.current = stepJump(state.current, scale);
        const h = jumpHeight(state.current);
        setHeight((v) => (v === h ? v : h));
        setCharge(Math.round(state.current.charge));
        if (now - saveTick > 1000) {
          saveTick = now;
          localStorage.setItem(SAVE_KEY, serializeJump(state.current));
        }
        if (state.current.status === "over") {
          setPhase("over");
          localStorage.removeItem(SAVE_KEY);
          tone(120);
          if (h > best) {
            setBest(h);
            localStorage.setItem(BEST_KEY, String(h));
          }
        }
      }
      draw(ctx, state.current);
      if (phaseRef.current === "playing") raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") setPhase("paused");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [best, tone, phase]);
  if (phase === "briefing")
    return (
      <GameContainer title={t.title} subtitle={t.sub} onReset={start}>
        <div className="overflow-hidden rounded-3xl border bg-card">
          <img
            src="/games/dot-jumpking-social.png"
            alt=""
            className="h-64 w-full object-cover sm:h-80"
          />
          <div className="p-5 text-center">
            <p className="text-sm text-muted-foreground">{t.hint}</p>
            <button
              onClick={() => start()}
              className="mt-5 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground"
            >
              {t.start}
            </button>
          </div>
        </div>
      </GameContainer>
    );
  return (
    <GameContainer title={t.title} subtitle={t.sub} onReset={start}>
      <div className="mx-auto max-w-[400px]">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label={t.height} value={`${height}m`} />
          <Stat label={t.best} value={`${best}m`} />
          <Stat label={t.charge} value={`${charge}%`} />
        </div>
        {restored && (
          <p
            role="status"
            className="mb-3 rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary"
          >
            {t.restored}
          </p>
        )}
        <div className="relative overflow-hidden rounded-3xl border bg-[#eef3df] touch-none">
          <canvas
            ref={canvas}
            width={JUMP_W}
            height={JUMP_H}
            tabIndex={0}
            className="block h-auto w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
            aria-label={t.title}
            onPointerDown={(e) => {
              e.preventDefault();
              down(e.clientX);
            }}
            onPointerMove={(e) => aim(e.clientX)}
          />
          {phase === "paused" && (
            <button
              onClick={() => setPhase("playing")}
              className="absolute inset-0 bg-white/90 text-xl font-black"
            >
              {t.resume}
            </button>
          )}
          {phase === "over" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-6 text-center"
              role="status"
            >
              <h3 className="text-xl font-black">{t.over}</h3>
              <p className="mt-2">
                {t.result}: {height}m
              </p>
              <button
                onClick={() => start()}
                className="mt-5 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground"
              >
                {t.again}
              </button>
              <button
                type="button"
                onClick={() => start(state.current.seed)}
                className="mt-2 min-h-11 rounded-full border px-6 text-sm font-bold"
              >
                {locale === "ko" ? "같은 탑" : locale === "ja" ? "同じ塔" : locale === "zh" ? "同一塔" : locale === "fr" ? "Même tour" : locale === "es" ? "Misma torre" : "Same tower"}
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              setPhase((p) => (p === "playing" ? "paused" : "playing"))
            }
            className="min-h-11 rounded-xl border bg-card font-bold"
          >
            {phase === "paused" ? t.resume : t.pause}
          </button>
          <button
            onClick={() => setSound((v) => !v)}
            className="min-h-11 rounded-xl border bg-card font-bold"
          >
            {t.sound} {sound ? "ON" : "OFF"}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.hint}
        </p>
      </div>
    </GameContainer>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-2 text-center">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
function draw(ctx: CanvasRenderingContext2D, s: JumpState) {
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#d9edc6");
  sky.addColorStop(1, "#fff7dc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 400, 600);
  const sy = (y: number) => y - s.camY;
  for (const p of visiblePlatforms(s)) {
    const y = sy(p.y);
    ctx.fillStyle = "#586b3a";
    ctx.fillRect(p.x, y, p.w, 12);
    ctx.fillStyle = "#9eb66d";
    ctx.fillRect(p.x, y, p.w, 4);
  }
  const y = sy(s.y);
  ctx.beginPath();
  ctx.arc(s.x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = s.charge ? "#e67f51" : "#708447";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (s.charge) {
    ctx.fillStyle = "#ead39b";
    ctx.fillRect(s.x - 25, y - 28, 50, 6);
    ctx.fillStyle = "#e67f51";
    ctx.fillRect(s.x - 25, y - 28, s.charge / 2, 6);
    ctx.strokeStyle = "#e67f51";
    ctx.beginPath();
    ctx.moveTo(s.x, y);
    ctx.lineTo(s.x + (s.aim - s.x) * 0.2, y - 45);
    ctx.stroke();
  }
}
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
