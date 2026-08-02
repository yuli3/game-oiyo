import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { advanceWhack, createWhackGame, hitWhack, whackAnalysis, WHACK_DURATION_MS, type WhackCritter, type WhackState } from "../../lib/games/whack-a-mole";
import { clearWhackSave, loadWhackSave, storeWhackSave } from "../../lib/games/whack-a-mole-save";

const GAME_KEY = "whack-a-mole";
type Copy = {
  title: string; subtitle: string; start: string; controls: string; score: string; best: string; time: string; over: string; again: string; newBest: string; pause: string; resume: string; sound: string; restored: string; combo: string; hits: string; bombs: string; escaped: string; accuracy: string; next: string; share: string; hole: string; empty: string; mole: string; bomb: string;
};
const T: Record<Locale, Copy> = {
  ko: { title: "두더지 잡기", subtitle: "30초 반사 신경 챌린지", start: "게임 시작", controls: "두더지는 빠르게 치고 폭탄은 피하세요. 숫자 1–9와 방향키로도 조작할 수 있습니다.", score: "점수", best: "최고", time: "남은 시간", over: "라운드 종료", again: "다시 하기", newBest: "신기록!", pause: "일시정지", resume: "계속하기", sound: "소리", restored: "이전 라운드를 일시정지 상태로 복원했습니다", combo: "최대 콤보", hits: "명중", bombs: "폭탄", escaped: "놓침", accuracy: "정확도", next: "다음 목표", share: "결과 복사", hole: "구멍", empty: "비어 있음", mole: "두더지", bomb: "폭탄" },
  en: { title: "Whack-a-Mole", subtitle: "30-second reflex challenge", start: "Start", controls: "Hit moles fast and avoid bombs. You can also use keys 1–9 and the arrow keys.", score: "Score", best: "Best", time: "Time left", over: "Round complete", again: "Play again", newBest: "New best!", pause: "Pause", resume: "Resume", sound: "Sound", restored: "Previous round restored and paused", combo: "Max combo", hits: "Hits", bombs: "Bombs", escaped: "Escaped", accuracy: "Accuracy", next: "Next target", share: "Copy result", hole: "Hole", empty: "empty", mole: "mole", bomb: "bomb" },
  ja: { title: "モグラたたき", subtitle: "30秒反射神経チャレンジ", start: "ゲーム開始", controls: "モグラを素早く叩き、爆弾を避けよう。1〜9キーと矢印キーでも操作できます。", score: "スコア", best: "ベスト", time: "残り時間", over: "ラウンド終了", again: "もう一度", newBest: "新記録！", pause: "一時停止", resume: "再開", sound: "サウンド", restored: "前回のラウンドを一時停止で復元しました", combo: "最大コンボ", hits: "命中", bombs: "爆弾", escaped: "逃した数", accuracy: "正確度", next: "次の目標", share: "結果をコピー", hole: "穴", empty: "空", mole: "モグラ", bomb: "爆弾" },
  zh: { title: "打地鼠", subtitle: "30秒反应挑战", start: "开始游戏", controls: "快速敲打地鼠并避开炸弹。也可以使用数字1–9和方向键。", score: "得分", best: "最佳", time: "剩余时间", over: "回合结束", again: "再玩一次", newBest: "新纪录！", pause: "暂停", resume: "继续", sound: "声音", restored: "已恢复并暂停上一局", combo: "最高连击", hits: "命中", bombs: "炸弹", escaped: "逃脱", accuracy: "准确率", next: "下个目标", share: "复制结果", hole: "洞", empty: "空", mole: "地鼠", bomb: "炸弹" },
  fr: { title: "Tape-Taupe", subtitle: "Défi de réflexes de 30 secondes", start: "Commencer", controls: "Tapez vite les taupes et évitez les bombes. Utilisez aussi 1–9 et les flèches.", score: "Score", best: "Record", time: "Temps restant", over: "Manche terminée", again: "Rejouer", newBest: "Nouveau record !", pause: "Pause", resume: "Reprendre", sound: "Son", restored: "Manche précédente restaurée en pause", combo: "Combo max", hits: "Touches", bombs: "Bombes", escaped: "Échappées", accuracy: "Précision", next: "Prochain objectif", share: "Copier le résultat", hole: "Trou", empty: "vide", mole: "taupe", bomb: "bombe" },
  es: { title: "Golpea al Topo", subtitle: "Reto de reflejos de 30 segundos", start: "Empezar", controls: "Golpea rápido los topos y evita las bombas. También puedes usar 1–9 y las flechas.", score: "Puntos", best: "Récord", time: "Tiempo", over: "Ronda terminada", again: "Jugar de nuevo", newBest: "¡Nuevo récord!", pause: "Pausa", resume: "Continuar", sound: "Sonido", restored: "Ronda anterior restaurada y pausada", combo: "Combo máximo", hits: "Aciertos", bombs: "Bombas", escaped: "Escapados", accuracy: "Precisión", next: "Siguiente meta", share: "Copiar resultado", hole: "Agujero", empty: "vacío", mole: "topo", bomb: "bomba" },
};

const WhackAMole = ({ locale }: { locale: Locale }) => {
  const t = T[locale] ?? T.en;
  const reducedMotion = usePrefersReducedMotion();
  const [game, setGame] = useState<WhackState | null>(null);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [muted, setMuted] = useState(false);
  const [best, setBest] = useState(0);
  const [hitIndex, setHitIndex] = useState<number | null>(null);
  const resumedAt = useRef(0);
  const baseElapsed = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const endedSeed = useRef<number | null>(null);
  const savedElapsed = useRef(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const tone = useCallback((kind: "mole" | "bomb" | "end") => {
    if (muted || typeof AudioContext === "undefined") return;
    const context = audio.current ?? new AudioContext(); audio.current = context;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.frequency.value = kind === "mole" ? 520 : kind === "bomb" ? 120 : 660;
    oscillator.type = kind === "bomb" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.1);
  }, [muted]);

  const start = useCallback(() => {
    clearWhackSave();
    const seed = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
    setGame(createWhackGame(seed)); setPaused(false); setRestored(false); setHitIndex(null);
    baseElapsed.current = 0; resumedAt.current = performance.now(); endedSeed.current = null; savedElapsed.current = 0;
  }, []);

  useEffect(() => {
    setBest(getBest(GAME_KEY)?.value ?? 0);
    const saved = loadWhackSave();
    if (saved) { setGame(saved.state); setPaused(true); setRestored(true); baseElapsed.current = saved.state.elapsedMs; }
    return () => { void audio.current?.close(); };
  }, []);

  useEffect(() => {
    if (!game || paused || game.status !== "playing") return;
    const timer = window.setInterval(() => {
      const elapsed = baseElapsed.current + performance.now() - resumedAt.current;
      setGame(current => current ? advanceWhack(current, elapsed) : current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [game?.seed, paused, game?.status]);

  useEffect(() => {
    if (!game) return;
    if (game.status === "playing" && (paused || game.elapsedMs - savedElapsed.current >= 500)) { storeWhackSave(game); savedElapsed.current = game.elapsedMs; }
    if (game.status === "over" && endedSeed.current !== game.seed) {
      endedSeed.current = game.seed; clearWhackSave(); tone("end");
      const previous = getBest(GAME_KEY); const beat = !previous || game.score > previous.value;
      const saved = recordBest(GAME_KEY, game.score, "score"); setBest(saved.value);
      if (beat && game.score > 0 && !reducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    }
  }, [game, paused, reducedMotion, tone]);

  useEffect(() => {
    const visibility = () => {
      if (!document.hidden) return;
      setPaused(current => { if (!current && game?.status === "playing") { const elapsed = baseElapsed.current + performance.now() - resumedAt.current; setGame(value => value ? advanceWhack(value, elapsed) : value); } return true; });
    };
    document.addEventListener("visibilitychange", visibility); return () => document.removeEventListener("visibilitychange", visibility);
  }, [game?.status]);

  const togglePause = () => {
    if (!game || game.status !== "playing") return;
    if (!paused) {
      const elapsed = baseElapsed.current + performance.now() - resumedAt.current;
      const next = advanceWhack(game, elapsed); setGame(next); storeWhackSave(next); setPaused(true);
    } else { baseElapsed.current = game.elapsedMs; resumedAt.current = performance.now(); setPaused(false); setRestored(false); }
  };
  const hit = (index: number) => {
    if (!game || paused || game.status !== "playing" || !game.cells[index]) return;
    const target = game.cells[index] as Exclude<WhackCritter, null>; setGame(hitWhack(game, index)); tone(target); setHitIndex(index);
    window.setTimeout(() => setHitIndex(current => current === index ? null : current), 120);
  };
  const keyMove = (event: React.KeyboardEvent, index: number) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    if (event.key === "Home") { event.preventDefault(); buttons.current[0]?.focus(); return; }
    if (event.key === "End") { event.preventDefault(); buttons.current[8]?.focus(); return; }
    const offset = offsets[event.key]; if (!offset) return;
    event.preventDefault(); const row = Math.floor(index / 3), column = index % 3;
    const next = event.key === "ArrowLeft" || event.key === "ArrowRight" ? row * 3 + (column + offset + 3) % 3 : ((row + offset / 3 + 3) % 3) * 3 + column;
    buttons.current[next]?.focus();
  };
  useEffect(() => {
    const numberKeys = (event: KeyboardEvent) => { const index = Number(event.key) - 1; if (index >= 0 && index < 9) { event.preventDefault(); hit(index); } };
    window.addEventListener("keydown", numberKeys); return () => window.removeEventListener("keydown", numberKeys);
  }, [game, paused]);

  const analysis = game ? whackAnalysis(game) : null;
  const timeLeft = game ? Math.max(0, Math.ceil((WHACK_DURATION_MS - game.elapsedMs) / 1000)) : 30;
  const share = async () => { if (!game || !analysis) return; try { await navigator.clipboard.writeText(`OIYO Whack-a-Mole · ${game.score} · ${analysis.accuracy}% · combo ${analysis.maxCombo}`); } catch { /* best effort */ } };

  return (
    <div className="not-prose my-10 mx-auto max-w-sm select-none rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</h2><p className="text-[11px] text-muted-foreground">{t.subtitle}</p></div>
        <div className="text-right text-xs font-bold"><p>{t.score}: <b className="text-primary">{game?.score ?? 0}</b></p><p className="text-muted-foreground">{t.best}: {best}</p></div>
      </header>
      {game?.status === "playing" && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold"><span>{t.time} <b className={timeLeft <= 5 ? "text-red-600" : "text-primary"}>{timeLeft}s</b></span><span>{t.combo} ×{game.maxCombo}</span><div className="flex gap-2"><button type="button" onClick={togglePause} className="min-h-11 rounded-xl border px-3">{paused ? `▶ ${t.resume}` : `Ⅱ ${t.pause}`}</button><button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted} className="min-h-11 rounded-xl border px-3">{muted ? "🔇" : "🔊"} {t.sound}</button></div></div>}
      {(paused || restored) && game?.status === "playing" && <p role="status" className="mb-3 text-center text-xs font-bold text-muted-foreground">{restored ? t.restored : t.pause}</p>}
      <div className="relative">
        <div className="grid grid-cols-3 gap-2.5" role="grid" aria-label={t.title}>
          {(game?.cells ?? Array<WhackCritter>(9).fill(null)).map((cell, index) => <button key={index} ref={element => { buttons.current[index] = element; }} type="button" role="gridcell" onPointerDown={event => { event.preventDefault(); hit(index); }} onKeyDown={event => keyMove(event, index)} disabled={!game || paused || game.status !== "playing"} aria-label={`${t.hole} ${index + 1}: ${cell === "mole" ? t.mole : cell === "bomb" ? t.bomb : t.empty}`} className={`flex aspect-square min-h-20 items-center justify-center rounded-2xl border border-amber-950/20 bg-gradient-to-b from-amber-100 to-amber-200 text-4xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${!reducedMotion && hitIndex === index ? "scale-90" : ""}`}><span className={cell ? "opacity-100" : "opacity-0"}>{cell === "mole" ? "🐹" : cell === "bomb" ? "💣" : "·"}</span></button>)}
        </div>
        {(!game || game.status === "over") && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/90 px-5 text-center backdrop-blur-sm" role={game ? "status" : undefined} aria-live="polite">
          {!game ? <><div className="text-4xl">🔨</div><p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{t.controls}</p></> : <><p className="text-xs font-black uppercase tracking-widest text-primary">{game.score > 0 && game.score >= best ? t.newBest : t.over}</p><p className="text-2xl font-black">{game.score} {t.score}</p><div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>{t.hits} <b>{analysis?.hits}</b></span><span>{t.accuracy} <b>{analysis?.accuracy}%</b></span><span>{t.bombs} <b>{analysis?.bombs}</b></span><span>{t.combo} <b>×{analysis?.maxCombo}</b></span><span>{t.escaped} <b>{analysis?.escaped}</b></span><span>{t.next} <b>{Math.max(best + 1, game.score + 1)}</b></span></div></>}
          <div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={start} className="min-h-11 rounded-full bg-primary px-7 font-black text-primary-foreground">{game ? t.again : t.start}</button>{game && <button type="button" onClick={share} className="min-h-11 rounded-full border px-5 text-sm font-bold">{t.share}</button>}</div>
        </div>}
      </div>
      <p className="sr-only" aria-live="polite">{game ? `${t.score} ${game.score}, ${t.time} ${timeLeft}` : ""}</p>
    </div>
  );
};

export default WhackAMole;
