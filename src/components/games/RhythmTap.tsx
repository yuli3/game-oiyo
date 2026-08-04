import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameDeltaSeconds } from "../../lib/games/time-contracts";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  GOOD_MS,
  beatToSeconds,
  comboAfterJudgement,
  generateChart,
  judgeOffset,
  levelFromRhythmRecord,
  noteProgress,
  rhythmDifficulty,
  rhythmRecordExtra,
  scoreForJudgement,
} from "../../lib/games/rhythm-beatmap";

/* ────────────────────────────────────────────────────────────────────────────
 * Rhythm Tap — a 4-lane falling-note rhythm game. Tap the lane (touch) or press
 * D / F / J / K on the beat; timing is judged Perfect / Good / Miss with a combo.
 *
 * The beat grid is the source of truth (`rhythm-beatmap.ts`): notes sit on beats
 * of a chart rather than appearing at random, so the patterns can be learned.
 * Positions are derived from the time left until a note arrives and judgement is
 * measured in milliseconds, so scroll speed never changes how strict the game is.
 * Audio is a synthesized click layered on top — the game is fully playable muted.
 * ────────────────────────────────────────────────────────────────────────── */

const W = 360;
const H = 520;
const GAME_KEY = "rhythm-tap";
const LANES = 4;
const LANE_W = W / LANES;
const HIT_Y = H - 70;
const MAX_MISS = 5;
const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_HUE = [265, 210, 330, 150];

type Phase = "menu" | "playing" | "over";

/* Synthesized feedback. No audio files, so the bundle cost is zero, and every
 * cue below is also shown on screen — muting the tab loses nothing but polish. */
let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  // Browsers start the context suspended until a user gesture resumes it.
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function playClick(bright: boolean) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = bright ? 880 : 520;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
}
/** `seconds` is when the note must be hit, measured from the start of the run. */
interface Note { lane: number; seconds: number; id: number }
interface GS {
  notes: Note[];
  score: number; combo: number; maxCombo: number; miss: number;
  /** Elapsed play time in seconds; the only clock the chart is read against. */
  songSeconds: number;
  approachSeconds: number;
  level: number;
  flash: number[]; // per-lane flash timer
  judge: string; judgeT: number;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; combo: string; miss: string;
  perfect: string; good: string; missed: string;
  gameOver: string; restart: string; newBest: string; sound: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "리듬 탭", subtitle: "노트가 라인에 닿을 때 탭하라", tapStart: "탭하여 시작", controls: "노트가 아래 판정선에 닿는 순간 해당 레인을 탭하세요(데스크탑: D·F·J·K). 5번 놓치면 끝납니다.", score: "점수", best: "최고", combo: "콤보", miss: "미스", perfect: "퍼펙트!", good: "굿", missed: "미스", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", sound: "소리" },
  en: { title: "Rhythm Tap", subtitle: "Tap the lane as notes hit the line", tapStart: "Tap to start", controls: "Tap a lane the moment its note reaches the hit line (desktop: D, F, J, K). Miss 5 times and it's over.", score: "Score", best: "Best", combo: "Combo", miss: "Miss", perfect: "Perfect!", good: "Good", missed: "Miss", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", sound: "Sound" },
  ja: { title: "リズムタップ", subtitle: "ノーツがラインに来たらタップ", tapStart: "タップで開始", controls: "ノーツが下の判定ラインに来た瞬間、そのレーンをタップ(PC: D・F・J・K)。5回ミスで終了です。", score: "スコア", best: "ベスト", combo: "コンボ", miss: "ミス", perfect: "パーフェクト！", good: "グッド", missed: "ミス", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", sound: "音" },
  fr: { title: "Rhythm Tap", subtitle: "Touchez la voie quand la note arrive", tapStart: "Touchez pour commencer", controls: "Touchez une voie au moment où sa note atteint la ligne (PC : D, F, J, K). 5 ratés et c'est fini.", score: "Score", best: "Record", combo: "Combo", miss: "Raté", perfect: "Parfait !", good: "Bien", missed: "Raté", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", sound: "Son" },
  es: { title: "Rhythm Tap", subtitle: "Toca el carril cuando la nota llegue", tapStart: "Toca para empezar", controls: "Toca un carril justo cuando su nota llega a la línea (PC: D, F, J, K). 5 fallos y se acaba.", score: "Puntos", best: "Récord", combo: "Combo", miss: "Fallo", perfect: "¡Perfecto!", good: "Bien", missed: "Fallo", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", sound: "Sonido" },
  zh: { title: "节奏点击", subtitle: "音符到线时点击对应轨道", tapStart: "点击开始", controls: "当音符到达下方判定线时点击对应轨道(桌面：D、F、J、K)。失误5次即结束。", score: "得分", best: "最佳", combo: "连击", miss: "失误", perfect: "完美！", good: "不错", missed: "失误", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", sound: "声音" },
};

interface Props { locale: Locale }

const RhythmTap: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [miss, setMiss] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const prefersReducedMotion = usePrefersReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const lastFrame = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  useEffect(() => { const b = getBest(GAME_KEY); setBest(b ? b.value : 0); }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    // Clearing the chart promotes the next run. `recordBest` only stores `extra`
    // on a new personal best, so in practice promotion needs a clear *and* a
    // better score — strict, but it never demotes and never skips a level.
    const gs = gsRef.current;
    const cleared = !!gs && gs.miss < MAX_MISS;
    const nextLevel = gs ? gs.level + (cleared ? 1 : 0) : 1;
    const saved = recordBest(GAME_KEY, finalScore, "score", rhythmRecordExtra(nextLevel, gs?.maxCombo ?? 0));
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0 && !prefersReducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    setPhase("over");
  }, [prefersReducedMotion]);

  const hitLane = useCallback((lane: number) => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    gs.flash[lane] = 8;
    // Nearest note in this lane, judged on time rather than on pixels so the
    // window means the same number of milliseconds at every scroll speed.
    let bestIdx = -1;
    let bestOffsetMs = Number.POSITIVE_INFINITY;
    for (let i = 0; i < gs.notes.length; i++) {
      const n = gs.notes[i];
      if (n.lane !== lane) continue;
      const offsetMs = (gs.songSeconds - n.seconds) * 1000;
      if (Math.abs(offsetMs) < Math.abs(bestOffsetMs)) { bestOffsetMs = offsetMs; bestIdx = i; }
    }
    if (bestIdx < 0 || Math.abs(bestOffsetMs) > GOOD_MS) return;

    const judgement = judgeOffset(bestOffsetMs);
    gs.notes.splice(bestIdx, 1);
    gs.score += scoreForJudgement(judgement, gs.combo);
    gs.judge = judgement === "perfect" ? t.perfect : t.good;
    gs.combo = comboAfterJudgement(gs.combo, judgement);
    gs.maxCombo = Math.max(gs.maxCombo, gs.combo);
    gs.judgeT = 22;
    if (!mutedRef.current) playClick(judgement === "perfect");
    setScore(gs.score); setCombo(gs.combo);
  }, [t.perfect, t.good]);

  const loop = useCallback((now?: number) => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const frameNow = now ?? performance.now();
    // Clamped delta, so a backgrounded tab resumes the song instead of skipping
    // a chunk of the chart and handing the player unavoidable misses.
    gs.songSeconds += frameDeltaSeconds(lastFrame.current, frameNow);
    lastFrame.current = frameNow;

    // Miss detection: a note is gone once the GOOD window has fully passed.
    const survivors: Note[] = [];
    let missed = false;
    for (const n of gs.notes) {
      if ((gs.songSeconds - n.seconds) * 1000 > GOOD_MS) { missed = true; gs.miss += 1; gs.combo = 0; }
      else survivors.push(n);
    }
    gs.notes = survivors;
    if (gs.notes.length === 0) { endGame(gs.score); return; }
    if (missed) { gs.judge = t.missed; gs.judgeT = 20; setMiss(gs.miss); setCombo(0); }

    // draw
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
    // lanes
    for (let l = 0; l < LANES; l++) {
      ctx.fillStyle = l % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(l * LANE_W, 0, LANE_W, H);
      if (gs.flash[l] > 0) {
        ctx.fillStyle = `hsla(${LANE_HUE[l]} 80% 60% / ${gs.flash[l] / 20})`;
        ctx.fillRect(l * LANE_W, 0, LANE_W, H);
        gs.flash[l] -= 1;
      }
    }
    // hit line
    ctx.fillStyle = "rgba(196,181,253,0.9)";
    ctx.fillRect(0, HIT_Y - 2, W, 4);
    for (let l = 0; l < LANES; l++) {
      ctx.strokeStyle = "rgba(196,181,253,0.5)"; ctx.lineWidth = 2;
      ctx.strokeRect(l * LANE_W + 8, HIT_Y - 14, LANE_W - 16, 28);
    }
    // Notes. Position is derived from the time left until the note is due, so
    // it is identical at 60Hz and 120Hz and never drifts from the judgement.
    for (const n of gs.notes) {
      const progress = noteProgress(n.seconds, gs.songSeconds, gs.approachSeconds);
      if (progress < 0) continue; // still in the lead-in, not on screen yet
      ctx.fillStyle = `hsl(${LANE_HUE[n.lane]} 70% 58%)`;
      const x = n.lane * LANE_W + 8;
      ctx.fillRect(x, HIT_Y * progress - 12, LANE_W - 16, 24);
    }
    // judge text
    if (gs.judgeT > 0) {
      ctx.globalAlpha = Math.min(1, gs.judgeT / 12);
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(gs.judge, W / 2, HIT_Y - 40);
      if (gs.combo > 1) { ctx.font = "bold 15px sans-serif"; ctx.fillText(`${gs.combo} ${t.combo}`, W / 2, HIT_Y - 66); }
      ctx.globalAlpha = 1; ctx.textAlign = "left"; gs.judgeT -= 1;
    }

    if (gs.miss >= MAX_MISS) { endGame(gs.score); return; }
    rafRef.current = requestAnimationFrame(loop);
  }, [endGame, t.missed, t.combo]);

  const begin = useCallback(() => {
    const level = levelFromRhythmRecord(getBest(GAME_KEY)?.extra);
    const { approachSeconds } = rhythmDifficulty(level);
    const chart = generateChart(level, Math.floor(Math.random() * 997));
    // Beats become absolute seconds once, so the loop never re-reads the chart.
    const leadIn = beatToSeconds(chart.leadInBeats, chart.bpm) + approachSeconds;
    const notes: Note[] = chart.notes.map((note, index) => ({
      lane: note.lane,
      seconds: leadIn + beatToSeconds(note.beat, chart.bpm),
      id: index,
    }));

    gsRef.current = {
      notes, score: 0, combo: 0, maxCombo: 0, miss: 0,
      songSeconds: 0, approachSeconds, level,
      flash: [0, 0, 0, 0], judge: "", judgeT: 0,
    };
    lastFrame.current = null;
    setScore(0); setCombo(0); setMiss(0); setIsNewBest(false);
    setPhase("playing");
    ensureAudio(); // resume the context while we still have the start gesture
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0 && phaseRef.current === "playing") { e.preventDefault(); hitLane(i); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hitLane]);

  const onTap = useCallback((clientX: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lane = Math.floor((((clientX - rect.left) / rect.width) * W) / LANE_W);
    if (lane >= 0 && lane < LANES) hitLane(lane);
  }, [hitLane]);

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          className="min-h-11 min-w-11 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
        >
          <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
          <span className="sr-only">{t.sound}</span>
        </button>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-label={t.title}
          className="w-full rounded-2xl border border-border touch-none bg-[#0b1020] [cursor:pointer]"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={(e) => { e.preventDefault(); if (phaseRef.current === "playing") onTap(e.clientX); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-3 text-[11px] font-bold text-white/90">
            <span>{t.combo} {combo}</span>
            <span className="text-red-300">{t.miss} {miss}/{MAX_MISS}</span>
          </div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm"
            onPointerDown={(e) => { e.preventDefault(); begin(); }}>
            {phase === "over" && (
              <div role="status" aria-live="polite">
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </div>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🎵</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <button className="rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RhythmTap;
