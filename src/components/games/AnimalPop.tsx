import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { GameContainer } from "../ui/game/GamePrimitives";
import {
  createAnimalBoard,
  parseAnimal,
  serializeAnimal,
  swapAnimals,
  type AnimalBoard,
  type AnimalFall,
} from "../../lib/games/animal-pop";
const SAVE = "oiyo:animal-pop:v1",
  BEST = "oiyo-animal-pop-best";
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const COPY = {
  ko: {
    title: "애니멀 팝",
    sub: "포레스트 피버",
    start: "퍼즐 시작",
    time: "남은 시간",
    score: "점수",
    best: "최고",
    combo: "연쇄",
    fever: "피버 ×2",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    over: "숲의 축제가 끝났어요",
    again: "다시 하기",
    hint: "이웃한 동물을 바꿔 3마리 이상 연결하세요.",
    restored: "저장된 퍼즐을 이어서 불러왔어요",
  },
  en: {
    title: "Animal Pop",
    sub: "Forest Fever",
    start: "Start puzzle",
    time: "Time",
    score: "Score",
    best: "Best",
    combo: "Chain",
    fever: "FEVER ×2",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    over: "The forest festival is over",
    again: "Play again",
    hint: "Swap neighboring animals to connect three or more.",
    restored: "Your saved puzzle was restored",
  },
  ja: {
    title: "アニマルポップ",
    sub: "フォレストフィーバー",
    start: "パズル開始",
    time: "残り時間",
    score: "スコア",
    best: "ベスト",
    combo: "連鎖",
    fever: "フィーバー ×2",
    pause: "一時停止",
    resume: "続ける",
    sound: "サウンド",
    over: "森のお祭りが終わりました",
    again: "もう一度",
    hint: "隣り合う動物を入れ替えて3匹以上つなげます。",
    restored: "保存したパズルを復元しました",
  },
  zh: {
    title: "动物消消乐",
    sub: "森林狂热",
    start: "开始谜题",
    time: "时间",
    score: "分数",
    best: "最高",
    combo: "连锁",
    fever: "狂热 ×2",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    over: "森林庆典结束了",
    again: "再玩一次",
    hint: "交换相邻动物，连接三个或更多。",
    restored: "已恢复保存的谜题",
  },
  fr: {
    title: "Animal Pop",
    sub: "Fièvre forestière",
    start: "Commencer",
    time: "Temps",
    score: "Score",
    best: "Record",
    combo: "Chaîne",
    fever: "FIÈVRE ×2",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    over: "La fête de la forêt est terminée",
    again: "Rejouer",
    hint: "Échangez deux voisins pour en relier au moins trois.",
    restored: "Votre puzzle a été restauré",
  },
  es: {
    title: "Animal Pop",
    sub: "Fiebre del bosque",
    start: "Comenzar",
    time: "Tiempo",
    score: "Puntos",
    best: "Récord",
    combo: "Cadena",
    fever: "FIEBRE ×2",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    over: "Terminó la fiesta del bosque",
    again: "Jugar otra vez",
    hint: "Intercambia animales vecinos para conectar tres o más.",
    restored: "Se restauró tu puzle",
  },
} as const;
export default function AnimalPop({ locale = "ko" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [board, setBoard] = useState<AnimalBoard>(
      () => createAnimalBoard(1).board,
    ),
    [seed, setSeed] = useState(1),
    [phase, setPhase] = useState<"briefing" | "playing" | "paused" | "over">(
      "briefing",
    ),
    [selected, setSelected] = useState<number | null>(null),
    [score, setScore] = useState(0),
    [time, setTime] = useState(60),
    [best, setBest] = useState(0),
    [combo, setCombo] = useState(0),
    [sound, setSound] = useState(true),
    [restored, setRestored] = useState(false),
    [resolving, setResolving] = useState(false),
    [bursting, setBursting] = useState<number[]>([]),
    [falls, setFalls] = useState<AnimalFall[]>([]),
    [waveLabel, setWaveLabel] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const animationRun = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => () => { animationRun.current += 1; }, []);
  useEffect(() => {
    if (phase === "playing") return;
    animationRun.current += 1;
    setResolving(false);
    setBursting([]);
    setFalls([]);
    setWaveLabel(0);
  }, [phase]);
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
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.12);
    },
    [sound],
  );
  useEffect(() => {
    const b = Number(localStorage.getItem(BEST));
    if (Number.isFinite(b)) setBest(b);
    const s = parseAnimal(localStorage.getItem(SAVE));
    if (s) {
      setBoard(s.board);
      setSeed(s.seed);
      setScore(s.score);
      setTime(s.timeLeft);
      setRestored(true);
      setPhase("paused");
    }
  }, []);
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(
      () =>
        setTime((v) => {
          if (v <= 1) {
            setPhase("over");
            localStorage.removeItem(SAVE);
            tone(140);
            setBest((b) => {
              const n = Math.max(b, score);
              localStorage.setItem(BEST, String(n));
              return n;
            });
            return 0;
          }
          return v - 1;
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [phase, score, tone]);
  useEffect(() => {
    if (phase === "playing")
      localStorage.setItem(SAVE, serializeAnimal(seed, board, score, time));
  }, [phase, seed, board, score, time]);
  const start = () => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    const x = createAnimalBoard(a[0]);
    setSeed(x.seed);
    setBoard(x.board);
    setScore(0);
    setTime(60);
    setCombo(0);
    setSelected(null);
    setResolving(false);
    setBursting([]);
    setFalls([]);
    setWaveLabel(0);
    setRestored(false);
    animationRun.current += 1;
    setPhase("playing");
  };
  const pick = async (i: number) => {
    if (phase !== "playing" || resolving) return;
    if (selected === null) {
      setSelected(i);
      return;
    }
    const x = swapAnimals(board, selected, i, seed);
    setSelected(null);
    if (!x.valid) {
      tone(150);
      return;
    }
    const run = ++animationRun.current;
    setResolving(true);
    const burstMs = reducedMotion ? 55 : 210;
    const fallMs = reducedMotion ? 65 : 300;
    for (let wave = 0; wave < x.steps.length; wave++) {
      const step = x.steps[wave];
      if (run !== animationRun.current) return;
      setBoard(step.before);
      setWaveLabel(wave + 1);
      setBursting(step.matched);
      tone(Math.min(920, 430 + wave * 85));
      await wait(burstMs);
      if (run !== animationRun.current) return;
      setBursting([]);
      setFalls(step.falls);
      setBoard(step.collapsed);
      await wait(fallMs);
      setFalls([]);
      if (!reducedMotion && wave < x.steps.length - 1) await wait(90);
    }
    if (run !== animationRun.current) return;
    setBoard(x.board);
    setSeed(x.seed);
    setCombo(x.waves);
    setScore((v) => v + x.cleared * 10 * x.waves * (x.waves >= 5 ? 2 : 1));
    setWaveLabel(0);
    setResolving(false);
  };
  const fallAt = (row:number,column:number) => falls.find((fall) => fall.toRow === row && fall.column === column);
  if (phase === "briefing")
    return (
      <GameContainer title={t.title} subtitle={t.sub} onReset={start}>
        <div className="overflow-hidden rounded-3xl border">
          <img
            src="/games/animal-pop-social.png"
            alt=""
            className="h-64 w-full object-cover sm:h-80"
          />
          <div className="p-5 text-center">
            <p className="text-sm text-muted-foreground">{t.hint}</p>
            <button
              onClick={start}
              className="mt-4 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground"
            >
              {t.start}
            </button>
          </div>
        </div>
      </GameContainer>
    );
  return (
    <GameContainer title={t.title} subtitle={t.sub} onReset={start}>
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-3 gap-2">
          <Stat l={t.time} v={`${time}s`} />
          <Stat l={t.score} v={String(score)} />
          <Stat l={t.best} v={String(best)} />
        </div>
        {restored && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary"
          >
            {t.restored}
          </p>
        )}
        <div
          className="my-3 h-6 text-center text-sm font-black text-amber-600"
          aria-live="polite"
        >
          {waveLabel > 0 ? `${t.combo} ×${waveLabel}` : combo >= 5 ? t.fever : combo > 1 ? `${t.combo} ×${combo}` : ""}
        </div>
        <div
          className={`relative grid grid-cols-7 gap-1 overflow-hidden rounded-3xl border bg-[#edf1df] p-2 ${bursting.length ? "animal-board-hit" : ""}`}
          role="grid"
          aria-label={t.title}
        >
          {board.flatMap((row, r) =>
            row.map((animal, c) => {
              const i = r * 7 + c;
              const isBursting = bursting.includes(i);
              const fall = fallAt(r,c);
              const fallRows = fall ? Math.max(1, fall.toRow - fall.fromRow) : 0;
              return (
                <button
                  key={i}
                  role="gridcell"
                  aria-label={`${animal} ${r + 1},${c + 1}`}
                  aria-pressed={selected === i}
                  onClick={() => pick(i)}
                  disabled={phase !== "playing" || resolving}
                  style={fall ? ({ "--animal-fall": `${fallRows * 108}%`, animationDuration: reducedMotion ? "65ms" : `${Math.min(430,180+fallRows*34)}ms` } as CSSProperties) : undefined}
                  className={`animal-tile relative aspect-square min-h-10 rounded-xl bg-white text-xl shadow-sm focus-visible:ring-2 focus-visible:ring-primary ${selected === i ? "ring-2 ring-primary scale-105" : ""} ${isBursting ? "animal-burst z-10" : ""} ${fall ? "animal-fall" : ""}`}
                >
                  {animal}
                  {isBursting && <><span className="animal-ring" aria-hidden="true"/><span className="animal-spark animal-spark-a" aria-hidden="true">✦</span><span className="animal-spark animal-spark-b" aria-hidden="true">●</span><span className="animal-spark animal-spark-c" aria-hidden="true">✦</span></>}
                </button>
              );
            }),
          )}
          {phase === "paused" && (
            <button
              onClick={() => setPhase("playing")}
              className="absolute inset-2 rounded-2xl bg-white/95 text-xl font-black"
            >
              {t.resume}
            </button>
          )}
          {phase === "over" && (
            <div
              className="absolute inset-2 flex flex-col items-center justify-center rounded-2xl bg-white/95"
              role="status"
            >
              <h3 className="text-xl font-black">{t.over}</h3>
              <p className="mt-2 text-3xl font-black text-primary">{score}</p>
              <button
                onClick={start}
                className="mt-4 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground"
              >
                {t.again}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              !resolving && setPhase((p) => (p === "playing" ? "paused" : "playing"))
            }
            disabled={resolving}
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
        <style>{`
          @keyframes animalBurst { 0%{transform:scale(1);filter:brightness(1)} 42%{transform:scale(1.34,.76);filter:brightness(1.4) saturate(1.5)} 72%{transform:scale(.72,1.3);opacity:1} 100%{transform:scale(1.6);opacity:0;filter:brightness(1.8)} }
          @keyframes animalRing { from{transform:scale(.35);opacity:.95} to{transform:scale(1.75);opacity:0} }
          @keyframes animalFall { from{transform:translateY(calc(-1 * var(--animal-fall))) scale(.92);opacity:.2} 72%{transform:translateY(5%) scale(1.03);opacity:1} to{transform:translateY(0) scale(1);opacity:1} }
          @keyframes animalBoardHit { 0%,100%{transform:translateX(0)} 30%{transform:translateX(-2px) rotate(-.25deg)} 65%{transform:translateX(2px) rotate(.25deg)} }
          @keyframes animalSparkA { to{transform:translate(-20px,-18px) rotate(80deg);opacity:0} }
          @keyframes animalSparkB { to{transform:translate(21px,-9px) scale(.2);opacity:0} }
          @keyframes animalSparkC { to{transform:translate(7px,22px) rotate(-70deg);opacity:0} }
          .animal-burst{animation:animalBurst 210ms cubic-bezier(.2,.8,.3,1) both;box-shadow:0 0 18px rgba(251,191,36,.8)}
          .animal-ring{position:absolute;inset:-3px;border:3px solid #fbbf24;border-radius:999px;animation:animalRing 220ms ease-out both;pointer-events:none}
          .animal-spark{position:absolute;left:45%;top:42%;color:#f59e0b;font-size:10px;pointer-events:none;z-index:2}
          .animal-spark-a{animation:animalSparkA 240ms ease-out both}.animal-spark-b{animation:animalSparkB 230ms ease-out both}.animal-spark-c{animation:animalSparkC 250ms ease-out both}
          .animal-fall{animation-name:animalFall;animation-timing-function:cubic-bezier(.18,.72,.22,1.08);animation-fill-mode:both}
          .animal-board-hit{animation:animalBoardHit 150ms ease-out}
          @media(prefers-reduced-motion:reduce){.animal-burst{animation-duration:55ms;box-shadow:none}.animal-ring,.animal-spark{display:none}.animal-board-hit{animation:none}.animal-fall{animation-duration:65ms!important}}
        `}</style>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.hint}
        </p>
      </div>
    </GameContainer>
  );
}
function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-2xl border bg-card p-2 text-center">
      <div className="text-lg font-black">{v}</div>
      <div className="text-[10px] text-muted-foreground">{l}</div>
    </div>
  );
}
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
