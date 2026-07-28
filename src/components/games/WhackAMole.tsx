import { useState, useRef, useEffect, useCallback } from "react";
import { resolveWhack } from "../../lib/games/react-state-transitions";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";

/* ────────────────────────────────────────────────────────────────────────────
 * Whack-a-Mole — a DOM-grid reflex game (no canvas). Moles pop from 9 holes; tap
 * a mole to score, tap a bomb and you lose points. 30-second round, the pace ramps
 * up. Self-contained (one component per game, 6 locales inline, PB via records.ts).
 * ────────────────────────────────────────────────────────────────────────── */

const GAME_KEY = "whack-a-mole";
const HOLES = 9;
const DURATION = 30;

type Phase = "menu" | "playing" | "over";
type Critter = "mole" | "bomb" | null;

type I18n = {
  title: string; subtitle: string; start: string; controls: string;
  score: string; best: string; time: string;
  gameOver: string; restart: string; newBest: string; sec: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "두더지 잡기", subtitle: "튀어나오는 두더지를 두드려라 (폭탄은 피하기!)", start: "게임 시작", controls: "구멍에서 튀어나오는 🐹 두더지를 빠르게 두드리세요. 💣 폭탄을 치면 점수가 깎입니다. 30초 동안 최고 점수에 도전!", score: "점수", best: "최고", time: "시간", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", sec: "초" },
  en: { title: "Whack-a-Mole", subtitle: "Bonk the moles that pop up (dodge the bombs!)", start: "Start", controls: "Tap the 🐹 moles that pop out of the holes as fast as you can. Hitting a 💣 bomb costs points. Chase your best score in 30 seconds!", score: "Score", best: "Best", time: "Time", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", sec: "s" },
  ja: { title: "モグラたたき", subtitle: "飛び出すモグラを叩け（爆弾は避けて！）", start: "ゲーム開始", controls: "穴から飛び出す🐹モグラを素早く叩きましょう。💣爆弾を叩くと減点。30秒でハイスコアに挑戦！", score: "スコア", best: "ベスト", time: "時間", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", sec: "秒" },
  fr: { title: "Tape-Taupe", subtitle: "Tapez les taupes qui sortent (évitez les bombes !)", start: "Commencer", controls: "Tapez les taupes 🐹 qui sortent des trous le plus vite possible. Toucher une bombe 💣 coûte des points. Battez votre record en 30 secondes !", score: "Score", best: "Record", time: "Temps", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", sec: "s" },
  es: { title: "Golpea al Topo", subtitle: "Golpea los topos que salen (¡esquiva las bombas!)", start: "Empezar", controls: "Golpea los topos 🐹 que salen de los agujeros lo más rápido posible. Golpear una bomba 💣 resta puntos. ¡Supera tu récord en 30 segundos!", score: "Puntos", best: "Récord", time: "Tiempo", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", sec: "s" },
  zh: { title: "打地鼠", subtitle: "敲打冒出的地鼠（躲开炸弹！）", start: "开始游戏", controls: "尽快敲打从洞里冒出的🐹地鼠。打到💣炸弹会扣分。在30秒内挑战最高分！", score: "得分", best: "最佳", time: "时间", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", sec: "秒" },
};

interface Props { locale: Locale }

const WhackAMole: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [cells, setCells] = useState<Critter[]>(Array(HOLES).fill(null));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hitIdx, setHitIdx] = useState<number | null>(null);

  const scoreRef = useRef(0);
  const popRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef(0);

  useEffect(() => { const b = getBest(GAME_KEY); setBest(b ? b.value : 0); }, []);

  const stop = useCallback(() => {
    if (popRef.current) clearInterval(popRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const end = useCallback(() => {
    stop();
    setCells(Array(HOLES).fill(null));
    const final = scoreRef.current;
    const prev = getBest(GAME_KEY);
    const beat = !prev || final > prev.value;
    const saved = recordBest(GAME_KEY, final, "score");
    setBest(saved.value);
    setIsNewBest(beat && final > 0);
    if (beat && final > 0 && !prefersReducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    setPhase("over");
  }, [prefersReducedMotion, stop]);

  const begin = useCallback(() => {
    scoreRef.current = 0;
    setScore(0); setTimeLeft(DURATION); setIsNewBest(false);
    setCells(Array(HOLES).fill(null));
    setPhase("playing");
    startRef.current = performance.now();

    const popTick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      // pace ramps: more critters up and faster as time passes
      setCells((prev) => {
        const next = [...prev];
        // clear ~half of currently shown
        for (let i = 0; i < HOLES; i++) if (next[i] && Math.random() < 0.5) next[i] = null;
        // spawn 1-2 new
        const spawns = 1 + (Math.random() < Math.min(0.7, 0.2 + elapsed / 40) ? 1 : 0);
        for (let s = 0; s < spawns; s++) {
          const empty = next.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
          if (empty.length === 0) break;
          const idx = empty[Math.floor(Math.random() * empty.length)];
          next[idx] = Math.random() < 0.18 ? "bomb" : "mole"; // ~18% bombs
        }
        return next;
      });
    };
    // interval speeds up over the round
    let cur = 780;
    const schedule = () => {
      popRef.current = setInterval(() => {
        popTick();
        const elapsed = (performance.now() - startRef.current) / 1000;
        const target = Math.max(430, 780 - elapsed * 12);
        if (Math.abs(target - cur) > 40) {
          cur = target;
          if (popRef.current) clearInterval(popRef.current);
          schedule();
        }
      }, cur);
    };
    schedule();

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, DURATION - (performance.now() - startRef.current) / 1000);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) end();
    }, 200);
  }, [end]);

  useEffect(() => () => stop(), [stop]);

  const whack = useCallback((i: number) => {
    if (phase !== "playing") return;
    const transition = resolveWhack(cells, i, scoreRef.current);
    if (!transition.hit) return;
    scoreRef.current = transition.score;
    setScore(transition.score);
    setCells(transition.cells);
    setHitIdx(i);
    setTimeout(() => setHitIdx((h) => (h === i ? null : h)), 120);
  }, [cells, phase]);

  return (
    <div className="not-prose my-10 mx-auto max-w-sm rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm select-none">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
      </div>

      {phase === "playing" && (
        <div className="mb-3 flex justify-between text-xs font-bold">
          <span>{t.time} <b className={timeLeft <= 5 ? "text-red-500" : "text-primary"}>{timeLeft}{t.sec}</b></span>
          <span className="text-green-500">🐹 {score}</span>
        </div>
      )}

      <div className="relative">
        <div className="grid grid-cols-3 gap-3">
          {cells.map((c, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); whack(i); }}
              disabled={phase !== "playing"}
              aria-label="hole"
              className={`flex aspect-square items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-amber-900/15 to-amber-950/25 text-4xl transition-transform ${hitIdx === i ? "scale-90" : ""} ${phase === "playing" ? "cursor-pointer active:scale-90" : ""}`}
            >
              <span className={`transition-all duration-100 ${c ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
                {c === "mole" ? "🐹" : c === "bomb" ? "💣" : ""}
              </span>
            </button>
          ))}
        </div>

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-card/85 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-500">{t.newBest}</div>}
                <div className="text-xl font-black text-primary">{t.gameOver}</div>
                <div className="text-sm text-muted-foreground">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🔨</div>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{t.controls}</p>
              </>
            )}
            <button onClick={begin} className="rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
              {phase === "over" ? t.restart : t.start}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhackAMole;
