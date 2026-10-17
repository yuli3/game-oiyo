import { lazy, Suspense, useState, useEffect } from 'react';
import { Rocket, Trophy, RefreshCw, Volume2, VolumeX, Flame, Zap, Play, AlertCircle } from 'lucide-react';
import type { Locale } from '../../lib/i18n';
import { getBest, recordBest } from '../../lib/games/records';
import { hasWebGL } from '../../lib/games/webgl';
import { generateFlightCourse, type FlightCourse } from '../../lib/games/cosmic-flight';

const CosmicFlightScene = lazy(() => import('./CosmicFlightScene'));

const GAME_KEY = 'cosmic-flight-3d';

interface Copy {
  title: string;
  subtitle: string;
  start: string;
  retry: string;
  cleared: string;
  crashed: string;
  rings: string;
  combo: string;
  score: string;
  best: string;
  speed: string;
  boost: string;
  unavailable: string;
  controlsHint: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: '우주선을 조종하여 소행성을 회피하고, 연속 링을 통과하며 최고 속도 타임어택에 도전하세요!',
    start: '비행 개시',
    retry: '다시 비행',
    cleared: '🏆 코스 완주 성공!',
    crashed: '💥 소행성과 충돌했습니다!',
    rings: '통과 링',
    combo: '최대 콤보',
    score: '최종 점수',
    best: '최고 점수',
    speed: '시속',
    boost: '부스터',
    unavailable: '이 브라우저에서는 WebGL 3D 그래픽을 사용할 수 없습니다.',
    controlsHint: '방향키 / WASD / 화면 드래그로 기체 조종 · 스페이스바로 초고속 부스트 가속',
  },
  en: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: 'Pilot a high-speed starship, weave through asteroid belts, thread glowing cosmic rings, and set record times!',
    start: 'Launch Starship',
    retry: 'Fly Again',
    cleared: '🏆 Course Cleared!',
    crashed: '💥 Crashed into Asteroid!',
    rings: 'Rings Passed',
    combo: 'Max Combo',
    score: 'Final Score',
    best: 'Best Score',
    speed: 'Speed',
    boost: 'Boost',
    unavailable: 'WebGL 3D graphics is not available in this browser.',
    controlsHint: 'Arrow keys / WASD / drag to steer · Spacebar for hyper boost acceleration',
  },
  ja: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: '宇宙船を操縦して小惑星帯をすり抜け、連続リングを通過してハイスピードレコードに挑もう！',
    start: '飛行開始',
    retry: '再挑戦',
    cleared: '🏆 コース完走！',
    crashed: '💥 小惑星に衝突しました！',
    rings: '通過リング',
    combo: '最大コンボ',
    score: 'スコア',
    best: '最高スコア',
    speed: '速度',
    boost: 'ブースト',
    unavailable: 'お使いのブラウザではWebGL 3Dをご利用いただけません。',
    controlsHint: '矢印キー / WASD / ドラッグで操縦 · スペースキーでブースト加速',
  },
  zh: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: '驾驶超光速飞船穿梭于小行星带之间，连续穿过能量光环，挑战极限速度纪录！',
    start: '启动飞船',
    retry: '再次飞行',
    cleared: '🏆 顺利通关航线！',
    crashed: '💥 撞上小行星！',
    rings: '穿过光环',
    combo: '最高连击',
    score: '最终得分',
    best: '最高纪录',
    speed: '速度',
    boost: '加速',
    unavailable: '当前浏览器不支持WebGL 3D图形。',
    controlsHint: '方向键 / WASD / 屏幕拖动操纵机体 · 空格键启动超光速助推',
  },
  fr: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: 'Pilotez un vaisseau spatial, slalomez entre les astéroïdes et traversez les anneaux cosmiques !',
    start: 'Décoller',
    retry: 'Recommencer',
    cleared: '🏆 Parcours terminé !',
    crashed: '💥 Collision avec un astéroïde !',
    rings: 'Anneaux',
    combo: 'Combo max',
    score: 'Score',
    best: 'Meilleur score',
    speed: 'Vitesse',
    boost: 'Boost',
    unavailable: 'WebGL 3D n’est pas disponible sur ce navigateur.',
    controlsHint: 'Flèches / ZQSD / glisser pour piloter · Espace pour le boost turbo',
  },
  es: {
    title: 'Cosmic Ring Rider 3D',
    subtitle: '¡Pilota una nave espacial, esquiva asteroides y atraviesa los anillos cósmicos a toda velocidad!',
    start: 'Despegar',
    retry: 'Volar de nuevo',
    cleared: '🏆 ¡Circuito completado!',
    crashed: '💥 ¡Chocaste con un asteroïde!',
    rings: 'Anillos',
    combo: 'Combo máx',
    score: 'Puntuación',
    best: 'Récord',
    speed: 'Velocidad',
    boost: 'Turbo',
    unavailable: 'WebGL 3D no está disponible en este navegador.',
    controlsHint: 'Flechas / WASD / arrastrar para pilotar · Espacio para hiperimpulso',
  },
};

export default function CosmicFlight({ locale = 'ko' }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.ko;
  const [course, setCourse] = useState<FlightCourse>(() => generateFlightCourse(Date.now(), 20));
  const [status, setStatus] = useState<'idle' | 'playing' | 'cleared' | 'crashed'>('idle');
  const [passedRings, setPassedRings] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setWebglSupported(hasWebGL());
    const saved = getBest(GAME_KEY);
    if (saved) setBestScore(saved.value);
  }, []);

  const startNewFlight = () => {
    setCourse(generateFlightCourse(Date.now(), 22));
    setPassedRings(0);
    setMaxCombo(0);
    setFinalScore(0);
    setStatus('playing');
  };

  const handlePassRing = (_ringIndex: number, combo: number) => {
    setPassedRings((p) => p + 1);
    setMaxCombo((c) => Math.max(c, combo));
  };

  const handleCrash = () => {
    setStatus('crashed');
  };

  const handleFinish = (score: number) => {
    setFinalScore(score);
    setStatus('cleared');
    if (score > bestScore) {
      setBestScore(score);
      recordBest(GAME_KEY, score, 'score');
    }
  };

  if (!webglSupported) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <p className="font-medium">{t.unavailable}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Rocket className="h-7 w-7 text-primary animate-pulse" />
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-1.5 text-warning font-mono text-sm">
            <Trophy className="h-4 w-4" />
            <span>{t.best}: {bestScore}</span>
          </div>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="rounded-xl border border-border bg-secondary p-2 text-secondary-foreground transition hover:bg-accent"
            aria-label="Toggle Audio"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Flight Stats HUD bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3">
        <div className="flex items-center gap-6 font-mono text-sm">
          <div className="flex items-center gap-1.5 text-warning">
            <Zap className="h-4 w-4" />
            <span>{t.rings}: {passedRings} / {course.rings.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-info">
            <Flame className="h-4 w-4" />
            <span>{t.combo}: x{maxCombo}</span>
          </div>
        </div>

        {status === 'playing' && (
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-chart-1 animate-ping"></span>
            ACTIVE MISSION
          </div>
        )}
      </div>

      {/* 3D Scene Viewport */}
      <div className="relative">
        <Suspense
          fallback={
            <div className="flex h-135 w-full items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          {status !== 'idle' ? (
            <CosmicFlightScene
              course={course}
              status={status === 'playing' ? 'playing' : status === 'cleared' ? 'cleared' : 'crashed'}
              onPassRing={handlePassRing}
              onCrash={handleCrash}
              onFinish={handleFinish}
              audioEnabled={audioEnabled}
            />
          ) : (
            <div className="relative flex h-135 w-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
              <div className="relative mb-6">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-secondary">
                  <Rocket className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t.title}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.controlsHint}</p>
              <button
                onClick={startNewFlight}
                className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
              >
                <Play className="h-5 w-5 fill-current" />
                {t.start}
              </button>
            </div>
          )}
        </Suspense>

        {/* Modal Overlay on Clear or Crash */}
        {(status === 'cleared' || status === 'crashed') && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl p-6">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {status === 'cleared' ? t.cleared : t.crashed}
              </h3>
              <div className="my-4 space-y-1.5 font-mono text-sm">
                <div className="text-muted-foreground">
                  {t.rings}: <span className="text-warning font-bold">{passedRings} / {course.rings.length}</span>
                </div>
                <div className="text-muted-foreground">
                  {t.combo}: <span className="text-info font-bold">x{maxCombo}</span>
                </div>
                {status === 'cleared' && (
                  <div className="text-warning text-lg font-bold mt-2">
                    {t.score}: {finalScore}
                  </div>
                )}
              </div>
              <button
                onClick={startNewFlight}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
