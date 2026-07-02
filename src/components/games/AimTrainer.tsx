import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

type Phase = "intro" | "playing" | "result";

interface HitRecord {
  time: number;
}

interface Target {
  x: number;
  y: number;
  size: number;
  key: number;
}

const GAME_W = 500;
const GAME_H = 400;
const GAME_DURATION = 30;

function getTargetSize(elapsed: number): number {
  if (elapsed < 15) return 80;
  if (elapsed < 25) return 55;
  return 40;
}

function randomTarget(size: number): Target {
  const half = size / 2;
  const x = Math.random() * (GAME_W - size) + half;
  const y = Math.random() * (GAME_H - size) + half;
  return { x, y, size, key: Date.now() + Math.random() };
}

const i18n: Record<Locale, {
  title: string;
  desc: string;
  start: string;
  timeLeft: string;
  hits: string;
  misses: string;
  accuracy: string;
  avgReaction: string;
  grade: string;
  restart: string;
  result: string;
  ms: string;
  sec: string;
}> = {
  ko: {
    title: "에임 트레이너",
    desc: "30초 동안 나타나는 원을 최대한 빠르고 정확하게 클릭하세요. 시간이 지날수록 타깃이 작아집니다.",
    start: "게임 시작",
    timeLeft: "남은 시간",
    hits: "히트",
    misses: "미스",
    accuracy: "정확도",
    avgReaction: "평균 반응 속도",
    grade: "등급",
    restart: "다시 시작",
    result: "결과",
    ms: "ms",
    sec: "초",
  },
  en: {
    title: "Aim Trainer",
    desc: "Click the circles as fast and accurately as possible for 30 seconds. Targets shrink over time.",
    start: "Start Game",
    timeLeft: "Time Left",
    hits: "Hits",
    misses: "Misses",
    accuracy: "Accuracy",
    avgReaction: "Avg Reaction",
    grade: "Grade",
    restart: "Play Again",
    result: "Results",
    ms: "ms",
    sec: "s",
  },
  ja: {
    title: "エイムトレーナー",
    desc: "30秒間、できるだけ速く正確に円をクリックしてください。時間が経つにつれてターゲットが小さくなります。",
    start: "ゲーム開始",
    timeLeft: "残り時間",
    hits: "ヒット",
    misses: "ミス",
    accuracy: "精度",
    avgReaction: "平均反応時間",
    grade: "評価",
    restart: "もう一度",
    result: "結果",
    ms: "ms",
    sec: "秒",
  },
  fr: {
    title: "Entraîneur de Visée",
    desc: "Cliquez sur les cercles aussi vite et précisément que possible pendant 30 secondes. Les cibles rétrécissent avec le temps.",
    start: "Commencer",
    timeLeft: "Temps restant",
    hits: "Touches",
    misses: "Ratés",
    accuracy: "Précision",
    avgReaction: "Réaction moy.",
    grade: "Note",
    restart: "Rejouer",
    result: "Résultats",
    ms: "ms",
    sec: "s",
  },
  es: {
    title: "Entrenador de Puntería",
    desc: "Haz clic en los círculos tan rápido y preciso como puedas durante 30 segundos. Los objetivos se reducen con el tiempo.",
    start: "Iniciar",
    timeLeft: "Tiempo restante",
    hits: "Aciertos",
    misses: "Fallos",
    accuracy: "Precisión",
    avgReaction: "Reacción prom.",
    grade: "Grado",
    restart: "Reiniciar",
    result: "Resultados",
    ms: "ms",
    sec: "s",
  },
  zh: {
    title: "瞄准训练器",
    desc: "在30秒内尽可能快速准确地点击圆圈。随着时间推移，目标会变小。",
    start: "开始游戏",
    timeLeft: "剩余时间",
    hits: "命中",
    misses: "失误",
    accuracy: "准确率",
    avgReaction: "平均反应时间",
    grade: "等级",
    restart: "再玩一次",
    result: "结果",
    ms: "毫秒",
    sec: "秒",
  },
};

function getGrade(accuracy: number): string {
  if (accuracy >= 95) return "S";
  if (accuracy >= 80) return "A";
  if (accuracy >= 60) return "B";
  return "C";
}

const gradeColors: Record<string, string> = {
  S: "text-violet-500",
  A: "text-green-500",
  B: "text-yellow-500",
  C: "text-red-500",
};

interface Props {
  locale: Locale;
}

const AimTrainer: React.FC<Props> = ({ locale }) => {
  const t = i18n[locale] ?? i18n.en;

  const [phase, setPhase] = useState<Phase>("intro");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hitRecords, setHitRecords] = useState<HitRecord[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef<number>(undefined);
  const targetAppearedRef = useRef<number>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const spawnTarget = useCallback((currentElapsed: number) => {
    const size = getTargetSize(currentElapsed);
    setTarget(randomTarget(size));
    targetAppearedRef.current = performance.now();
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTarget(null);
    setPhase("result");
  }, []);

  const startGame = useCallback(() => {
    setHits(0);
    setMisses(0);
    setHitRecords([]);
    setElapsed(0);
    setTimeLeft(GAME_DURATION);
    startTimeRef.current = performance.now();
    spawnTarget(0);
    setPhase("playing");
  }, [spawnTarget]);

  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSec = (now - (startTimeRef.current ?? now)) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsedSec);
      setTimeLeft(Math.ceil(remaining));
      setElapsed(elapsedSec);

      if (remaining <= 0) {
        endGame();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, endGame]);

  const handleTargetClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (phase !== "playing") return;
      const reactionTime = performance.now() - (targetAppearedRef.current ?? performance.now());
      setHits((h) => h + 1);
      setHitRecords((prev) => [...prev, { time: reactionTime }]);
      const currentElapsed = (performance.now() - (startTimeRef.current ?? performance.now())) / 1000;
      spawnTarget(currentElapsed);
    },
    [phase, spawnTarget]
  );

  const handleAreaClick = useCallback(() => {
    if (phase !== "playing") return;
    setMisses((m) => m + 1);
  }, [phase]);

  const totalClicks = hits + misses;
  const accuracy = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 0;
  const avgReaction =
    hitRecords.length > 0
      ? Math.round(hitRecords.reduce((sum, r) => sum + r.time, 0) / hitRecords.length)
      : 0;
  const grade = getGrade(accuracy);

  return (
    <div className="not-prose my-12 p-6 bg-card text-card-foreground rounded-3xl border border-border shadow-sm max-w-xl mx-auto select-none">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          {t.title}
        </span>
        {phase === "playing" && (
          <div className="flex gap-4 text-xs">
            <span>
              {t.timeLeft}:{" "}
              <b className={timeLeft <= 5 ? "text-red-500" : "text-primary"}>
                {timeLeft}
                {t.sec}
              </b>
            </span>
            <span>
              {t.hits}: <b className="text-green-500">{hits}</b>
            </span>
            <span>
              {t.misses}: <b className="text-red-500">{misses}</b>
            </span>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🎯</span>
          </div>
          <p className="text-muted-foreground text-center leading-relaxed px-4 max-w-sm">
            {t.desc}
          </p>
          <button
            onClick={startGame}
            className="px-10 py-3 bg-violet-500 text-white rounded-full font-bold hover:bg-violet-600 transition-colors"
          >
            {t.start}
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div
          ref={gameAreaRef}
          onClick={handleAreaClick}
          className="relative bg-muted/40 rounded-2xl border border-border overflow-hidden cursor-crosshair"
          style={{ width: "100%", maxWidth: `${GAME_W}px`, height: `${GAME_H}px` }}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-muted/60">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
            />
          </div>

          {target && (
            <button
              key={target.key}
              onClick={handleTargetClick}
              className="absolute rounded-full bg-violet-500 hover:bg-violet-400 transition-colors shadow-lg focus:outline-none"
              style={{
                width: `${target.size}px`,
                height: `${target.size}px`,
                left: `${target.x - target.size / 2}px`,
                top: `${target.y - target.size / 2}px`,
              }}
              aria-label="target"
            />
          )}
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col items-center gap-5 py-8">
          <h3 className="text-xl font-black text-primary">{t.result}</h3>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-muted/40 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-green-500">{hits}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.hits}</div>
            </div>
            <div className="bg-muted/40 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-red-500">{misses}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.misses}</div>
            </div>
            <div className="bg-muted/40 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-primary">{accuracy}%</div>
              <div className="text-xs text-muted-foreground mt-1">{t.accuracy}</div>
            </div>
            <div className="bg-muted/40 rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-primary">
                {avgReaction}
                <span className="text-sm font-normal">{t.ms}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.avgReaction}</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`text-6xl font-black ${gradeColors[grade]}`}>{grade}</div>
            <div className="text-xs text-muted-foreground">{t.grade}</div>
          </div>
          <button
            onClick={startGame}
            className="px-10 py-3 bg-violet-500 text-white rounded-full font-bold hover:bg-violet-600 transition-colors"
          >
            {t.restart}
          </button>
        </div>
      )}
    </div>
  );
};

export default AimTrainer;
